import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { Job } from '../jobs/entities/job.entity';
import { DeadLetter } from '../dlq/entities/dead-letter.entity';
import { WorkerPoolService } from '../workers/worker-pool.service';
import { JobHeapService } from '../scheduler/heap/job-heap.service';
import { MetricsResponseDto } from './dto/metrics-response.dto';
import { JobStatus } from '../common/enums/job-status.enum';
import { SseService } from '../sse/sse.service';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly startTime = Date.now();
  private broadcastTimer: NodeJS.Timeout;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(DeadLetter)
    private readonly dlqRepo: Repository<DeadLetter>,
    private readonly workerPool: WorkerPoolService,
    private readonly heapService: JobHeapService,
    private readonly sseService: SseService,
  ) {}

  onModuleInit(): void {
    // Broadcast metrics every 5 seconds
    this.broadcastTimer = setInterval(async () => {
      try {
        const metrics = await this.getMetrics();
        this.sseService.broadcastMetrics(metrics);
      } catch (err) {
        // Ignore errors during interval broadcast
      }
    }, 5000);
  }

  onModuleDestroy(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
    }
  }

  async getMetrics(): Promise<MetricsResponseDto> {
    const total = await this.jobRepo.count();
    const pending = await this.jobRepo.count({
      where: { status: JobStatus.PENDING },
    });
    const processing = await this.jobRepo.count({
      where: { status: JobStatus.PROCESSING },
    });
    const completed = await this.jobRepo.count({
      where: { status: JobStatus.COMPLETED },
    });
    const failed = await this.jobRepo.count({
      where: { status: JobStatus.FAILED },
    });
    const cancelled = await this.jobRepo.count({
      where: { status: JobStatus.CANCELLED },
    });

    const dlqCount = await this.dlqRepo.count({
      where: { retriedAt: IsNull() },
    });

    return {
      jobs: {
        total,
        pending,
        processing,
        completed,
        failed,
        cancelled,
      },
      dlqCount,
      activeWorkers: this.workerPool.getWorkerCount(),
      heapSize: this.heapService.getSize(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
