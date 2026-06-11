import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';

import { JobDependency } from './entities/job-dependency.entity';
import { Job } from '../../jobs/entities/job.entity';
import { JobStatus } from '../../common/enums/job-status.enum';
import { SystemMessages } from '../../common/constants/system.messages';

@Injectable()
export class DagService {
  constructor(
    @InjectRepository(JobDependency)
    private readonly dependencyRepo: Repository<JobDependency>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('job.completed')
  async handleJobCompleted(jobId: string): Promise<void> {
    const dependents = await this.getDependents(jobId);
    for (const depId of dependents) {
      const isReady = await this.isJobReady(depId);
      if (isReady) {
        this.eventEmitter.emit('job.ready', depId);
      }
    }
  }

  async addDependencies(
    jobId: string,
    dependsOnIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(JobDependency)
      : this.dependencyRepo;
    const jobRepo = manager ? manager.getRepository(Job) : this.jobRepo;

    // Check if all parent jobs exist
    const parents = await jobRepo.findByIds(dependsOnIds);
    if (parents.length !== dependsOnIds.length) {
      throw new NotFoundException(SystemMessages.JOB_DEP_NOT_FOUND);
    }

    // Check for cycles (simple depth-limited BFS/DFS)
    for (const parentId of dependsOnIds) {
      if (await this.wouldCreateCycle(jobId, parentId, repo)) {
        throw new ConflictException(SystemMessages.JOB_DEP_CYCLE);
      }
    }

    const deps = dependsOnIds.map((parentId) =>
      repo.create({
        jobId,
        dependsOnJobId: parentId,
      }),
    );

    await repo.save(deps);
  }

  async isJobReady(jobId: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(JobDependency)
      : this.dependencyRepo;

    const dependencies = await repo.find({
      where: { jobId },
      relations: ['dependsOnJob'],
    });

    if (dependencies.length === 0) return true;

    // Ready if all dependencies are COMPLETED
    return dependencies.every(
      (dep) => dep.dependsOnJob.status === JobStatus.COMPLETED,
    );
  }

  async getDependents(
    jobId: string,
    manager?: EntityManager,
  ): Promise<string[]> {
    const repo = manager
      ? manager.getRepository(JobDependency)
      : this.dependencyRepo;

    const deps = await repo.find({
      where: { dependsOnJobId: jobId },
    });

    return deps.map((d) => d.jobId);
  }

  async getWorkflowGraph(jobId: string): Promise<any> {
    // Collect all nodes reachable from this job (both up and down)
    const nodes = new Map<string, Job>();
    const edges: { source: string; target: string }[] = [];

    const queue = [jobId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const job = await this.jobRepo.findOne({ where: { id: currentId } });
      if (job) nodes.set(currentId, job);

      // Get parents
      const deps = await this.dependencyRepo.find({
        where: { jobId: currentId },
      });
      for (const d of deps) {
        edges.push({ source: d.dependsOnJobId, target: currentId });
        queue.push(d.dependsOnJobId);
      }

      // Get children
      const children = await this.dependencyRepo.find({
        where: { dependsOnJobId: currentId },
      });
      for (const c of children) {
        edges.push({ source: currentId, target: c.jobId });
        queue.push(c.jobId);
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(
        new Set(edges.map((e) => JSON.stringify(e))),
      ).map((e) => JSON.parse(e)),
    };
  }

  private async wouldCreateCycle(
    jobId: string,
    targetParentId: string,
    repo: Repository<JobDependency>,
  ): Promise<boolean> {
    // If job A wants to depend on job B, we must ensure B doesn't already depend on A
    if (jobId === targetParentId) return true;

    const queue = [targetParentId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === jobId) return true; // Cycle detected
      if (visited.has(current)) continue;
      visited.add(current);

      const deps = await repo.find({
        where: { jobId: current },
      });

      for (const d of deps) {
        queue.push(d.dependsOnJobId);
      }
    }

    return false;
  }
}
