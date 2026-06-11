import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { createHash } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Job } from './entities/job.entity';
import { JobLog } from './entities/job-log.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobStatus } from '../common/enums/job-status.enum';
import { SystemMessages } from '../common/constants/system.messages';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { JobHeapService } from '../scheduler/heap/job-heap.service';
import { DagService } from '../scheduler/dag/dag.service';
import { SseService } from '../sse/sse.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobLog)
    private readonly jobLogRepo: Repository<JobLog>,
    private readonly dataSource: DataSource,
    private readonly jobHeapService: JobHeapService,
    private readonly dagService: DagService,
    private readonly sseService: SseService,
    private readonly logger: StructuredLoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateJobDto): Promise<Job> {
    const payloadHash = this.generatePayloadHash(dto.type, dto.payload);

    // Check for duplicates
    const existing = await this.jobRepo.findOne({
      where: {
        payloadHash,
        status: JobStatus.PENDING,
      },
    });

    if (existing) {
      throw new ConflictException(SystemMessages.JOB_DUPLICATE);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const job = this.jobRepo.create({
        type: dto.type,
        payload: dto.payload,
        priority: dto.priority,
        effectivePriority: dto.priority,
        maxRetries: dto.max_retries,
        scheduledAt: dto.scheduled_at ?? null,
        recurrenceInterval: dto.recurrence_interval ?? null,
        payloadHash,
      });

      const savedJob = await queryRunner.manager.save(Job, job);

      // Create initial log
      await queryRunner.manager.save(JobLog, {
        jobId: savedJob.id,
        event: SystemMessages.LOG_JOB_CREATED,
        message: 'Job submitted to queue',
      });

      // Handle dependencies if any
      if (dto.depends_on && dto.depends_on.length > 0) {
        await this.dagService.addDependencies(
          savedJob.id,
          dto.depends_on,
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();

      // Only add to heap if no unresolved dependencies
      let hasDependencies = false;
      if (dto.depends_on && dto.depends_on.length > 0) {
        hasDependencies = !(await this.dagService.isJobReady(savedJob.id));
      }

      if (!hasDependencies) {
        this.jobHeapService.insert({
          id: savedJob.id,
          priority: savedJob.priority,
          effectivePriority: savedJob.effectivePriority,
          scheduledAt: savedJob.scheduledAt,
          createdAt: savedJob.createdAt,
          recurrenceInterval: savedJob.recurrenceInterval,
        });
      } else {
        this.logger.info({
          event: SystemMessages.LOG_JOB_DEP_WAITING,
          jobId: savedJob.id,
        });
      }

      this.sseService.broadcastJobUpdate(savedJob);

      return savedJob;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: JobQueryDto): Promise<PaginatedResult<Job>> {
    const qb = this.jobRepo.createQueryBuilder('job');

    if (query.status) {
      qb.andWhere('job.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('job.type = :type', { type: query.type });
    }

    if (query.sort) {
      const [field, order] = query.sort.split(':');
      if (field && (order === 'asc' || order === 'desc')) {
        qb.orderBy(`job.${field}`, order.toUpperCase() as 'ASC' | 'DESC');
      } else {
        qb.orderBy('job.createdAt', 'DESC');
      }
    } else {
      qb.orderBy('job.createdAt', 'DESC');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['logs'],
    });

    if (!job) {
      throw new NotFoundException(SystemMessages.JOB_NOT_FOUND);
    }

    // Sort logs by createdAt desc manually if needed, but entity handles it
    job.logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return job;
  }

  async update(id: string, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);

    if (job.status !== JobStatus.PENDING) {
      throw new ConflictException(SystemMessages.JOB_ALREADY_PROCESSING);
    }

    if (dto.priority !== undefined) {
      job.priority = dto.priority;
      job.effectivePriority = dto.priority;
    }

    if (dto.max_retries !== undefined) job.maxRetries = dto.max_retries;
    if (dto.scheduled_at !== undefined) job.scheduledAt = dto.scheduled_at;
    if (dto.recurrence_interval !== undefined)
      job.recurrenceInterval = dto.recurrence_interval;

    const savedJob = await this.jobRepo.save(job);

    // Update in heap
    this.jobHeapService.update(savedJob.id, {
      priority: savedJob.priority,
      effectivePriority: savedJob.effectivePriority,
      scheduledAt: savedJob.scheduledAt,
      recurrenceInterval: savedJob.recurrenceInterval,
    });

    this.sseService.broadcastJobUpdate(savedJob);

    return savedJob;
  }

  async cancel(id: string): Promise<void> {
    const job = await this.findOne(id);

    if (job.status === JobStatus.CANCELLED) {
      throw new ConflictException(SystemMessages.JOB_ALREADY_CANCELLED);
    }

    if (job.status === JobStatus.PROCESSING) {
      throw new ConflictException(SystemMessages.JOB_ALREADY_PROCESSING);
    }

    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(Job, job);
      await queryRunner.manager.save(JobLog, {
        jobId: job.id,
        event: SystemMessages.LOG_JOB_CANCELLED,
        message: 'Job cancelled by user',
      });

      await queryRunner.commitTransaction();

      // Remove from heap
      this.jobHeapService.remove(job.id);

      // Handle dependent jobs (cancel them too)
      const dependents = await this.dagService.getDependents(job.id);
      for (const depId of dependents) {
        // Simple cancellation for dependents, maybe queue an event
        this.eventEmitter.emit('job.cancel', depId);
      }

      this.sseService.broadcastJobUpdate(job);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getWorkflow(id: string): Promise<any> {
    // verify job exists
    await this.findOne(id);
    return this.dagService.getWorkflowGraph(id);
  }

  async getTypes(): Promise<string[]> {
    const result = await this.jobRepo
      .createQueryBuilder('job')
      .select('job.type')
      .distinct(true)
      .getRawMany();
    
    return result.map((r) => r.job_type);
  }

  private generatePayloadHash(
    type: string,
    payload: Record<string, unknown>,
  ): string {
    const data = JSON.stringify({ type, payload });
    return createHash('sha256').update(data).digest('hex');
  }
}
