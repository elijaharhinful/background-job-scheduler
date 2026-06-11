import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MinHeap } from './min-heap';
import { JobHeapItem } from '../../common/interfaces/job-heap-item.interface';
import { Job } from '../../jobs/entities/job.entity';
import { JobStatus } from '../../common/enums/job-status.enum';
import { StructuredLoggerService } from '../../logging/structured-logger.service';
import { SystemMessages } from '../../common/constants/system.messages';

@Injectable()
export class JobHeapService implements OnModuleInit {
  private readonly heap = new MinHeap();
  private starvationTimer: NodeJS.Timeout;
  private readonly starvationIntervalMs: number;
  private readonly agingIntervalMin: number;
  private readonly agingBoost: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {
    this.starvationIntervalMs = this.configService.get<number>(
      'scheduler.starvationCheckIntervalMs',
      30000,
    );
    this.agingIntervalMin = this.configService.get<number>(
      'scheduler.agingIntervalMin',
      5,
    );
    this.agingBoost = this.configService.get<number>(
      'scheduler.agingBoostPerInterval',
      0.5,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.hydrate();
    this.startStarvationPrevention();
  }

  async hydrate(): Promise<void> {
    this.logger.info({
      event: SystemMessages.LOG_HEAP_HYDRATED,
      message: 'Hydrating in-memory heap from database',
    });

    this.heap.clear();

    const pendingJobs = await this.jobRepo.find({
      where: { status: JobStatus.PENDING },
    });

    for (const job of pendingJobs) {
      // Don't add to heap if it has dependencies
      const hasDeps = await this.jobRepo.query(
        'SELECT 1 FROM job_dependencies WHERE "jobId" = $1 LIMIT 1',
        [job.id],
      );
      if (hasDeps.length > 0) continue;

      if (!job.scheduledAt || job.scheduledAt.getTime() <= Date.now()) {
        this.insert({
          id: job.id,
          priority: job.priority,
          effectivePriority: job.effectivePriority,
          scheduledAt: job.scheduledAt,
          createdAt: job.createdAt,
          recurrenceInterval: job.recurrenceInterval,
        });
      }
    }

    this.logger.info({
      event: SystemMessages.LOG_HEAP_HYDRATED,
      count: this.heap.size,
    });
  }

  insert(item: JobHeapItem): void {
    this.heap.insert(item);
  }

  extractMin(): JobHeapItem | null {
    return this.heap.extractMin();
  }

  peek(): JobHeapItem | null {
    return this.heap.peek();
  }

  remove(id: string): void {
    this.heap.remove(id);
  }

  update(id: string, updates: Partial<JobHeapItem>): void {
    this.heap.update(id, updates);
  }

  getSize(): number {
    return this.heap.size;
  }

  private startStarvationPrevention(): void {
    this.starvationTimer = setInterval(() => {
      this.preventStarvation();
    }, this.starvationIntervalMs);
  }

  private preventStarvation(): void {
    const now = new Date().getTime();
    let updatedCount = 0;

    const items = this.heap.items;

    for (const item of items) {
      // Don't boost scheduled jobs that haven't matured yet
      if (item.scheduledAt && item.scheduledAt.getTime() > now) continue;

      const ageInMinutes = (now - item.createdAt.getTime()) / 60000;
      const intervalsPassed = Math.floor(ageInMinutes / this.agingIntervalMin);

      if (intervalsPassed > 0) {
        // Higher boost means lower effectivePriority (which means more important)
        const newEffectivePriority = Math.max(
          1.0, // Hard limit, can't be more important than priority 1
          item.priority - intervalsPassed * this.agingBoost,
        );

        if (newEffectivePriority !== item.effectivePriority) {
          this.heap.update(item.id, { effectivePriority: newEffectivePriority });
          
          // Also update DB asynchronously (fire and forget)
          this.jobRepo.update(item.id, {
            effectivePriority: newEffectivePriority,
          }).catch(err => {
            this.logger.error('Failed to sync effectivePriority to DB', err.stack);
          });
          
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      this.logger.info({
        event: SystemMessages.LOG_STARVATION_TICK,
        boostedJobs: updatedCount,
      });
    }
  }
}
