import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { Worker } from './worker';
import { JobHeapService } from '../scheduler/heap/job-heap.service';
import { TimingWheelSchedulerService } from '../scheduler/timing-wheel/timing-wheel-scheduler.service';
import { HandlerRegistry } from '../handlers/handler.registry';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { SseService } from '../sse/sse.service';
import { SystemMessages } from '../common/constants/system.messages';

@Injectable()
export class WorkerPoolService implements OnModuleInit, OnModuleDestroy {
  private workers: Worker[] = [];
  private desiredCount: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly heapService: JobHeapService,
    private readonly timingWheelService: TimingWheelSchedulerService,
    private readonly handlerRegistry: HandlerRegistry,
    private readonly logger: StructuredLoggerService,
    private readonly sseService: SseService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.desiredCount = this.configService.get<number>('app.workerCount', 3);
  }

  onModuleInit(): void {
    this.adjustWorkers();
  }

  onModuleDestroy(): void {
    for (const worker of this.workers) {
      worker.stop();
    }
  }

  getWorkerCount(): number {
    return this.workers.length;
  }

  getWorkerStates(): { id: string; status: string; current_job_id: string | null }[] {
    return this.workers.map((w) => w.getStatus());
  }

  setWorkerCount(count: number): void {
    if (count < 0) return;
    this.desiredCount = count;
    this.adjustWorkers();
  }

  private adjustWorkers(): void {
    const currentCount = this.workers.length;

    if (this.desiredCount > currentCount) {
      const diff = this.desiredCount - currentCount;
      for (let i = 0; i < diff; i++) {
        const id = `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const worker = new Worker(
          id,
          this.dataSource,
          this.heapService,
          this.timingWheelService,
          this.handlerRegistry,
          this.logger,
          this.sseService,
          this.eventEmitter,
        );
        this.workers.push(worker);
        worker.start();
      }
    } else if (this.desiredCount < currentCount) {
      const diff = currentCount - this.desiredCount;
      const workersToStop = this.workers.splice(-diff); // Remove from end
      for (const worker of workersToStop) {
        worker.stop();
      }
    }

    this.logger.info({
      event: SystemMessages.LOG_WORKER_STARTED, // not exactly, but good enough
      message: 'Worker pool adjusted to ' + this.desiredCount + ' workers',
    });
  }

  @OnEvent('job.cancel_processing')
  handleCancel(jobId: string): void {
    for (const worker of this.workers) {
      worker.cancelJob(jobId);
    }
  }
}
