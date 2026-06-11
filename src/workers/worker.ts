import { DataSource, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { JobHeapService } from '../scheduler/heap/job-heap.service';
import { TimingWheelSchedulerService } from '../scheduler/timing-wheel/timing-wheel-scheduler.service';
import { HandlerRegistry } from '../handlers/handler.registry';
import { Job } from '../jobs/entities/job.entity';
import { JobLog } from '../jobs/entities/job-log.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { SystemMessages } from '../common/constants/system.messages';
import { SseService } from '../sse/sse.service';
import { RecurrenceIntervalMs } from '../common/enums/recurrence-interval.enum';

export class Worker {
  private isRunning = false;
  private currentJobId: string | null = null;
  private loopTimer: NodeJS.Timeout | null = null;

  constructor(
    public readonly id: string,
    private readonly dataSource: DataSource,
    private readonly heapService: JobHeapService,
    private readonly timingWheelService: TimingWheelSchedulerService,
    private readonly handlerRegistry: HandlerRegistry,
    private readonly logger: StructuredLoggerService,
    private readonly sseService: SseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.info({
      event: SystemMessages.LOG_WORKER_STARTED,
      workerId: this.id,
    });
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.logger.info({
      event: SystemMessages.LOG_WORKER_STOPPED,
      workerId: this.id,
    });
  }

  getStatus(): { id: string; status: string; currentJobId: string | null } {
    return {
      id: this.id,
      status: this.isRunning
        ? this.currentJobId
          ? 'processing'
          : 'idle'
        : 'stopped',
      currentJobId: this.currentJobId,
    };
  }

  private loop(): void {
    if (!this.isRunning) return;

    this.processNextJob()
      .then((processed) => {
        if (!this.isRunning) return;
        // If we processed a job, check for next immediately. Else wait.
        const delay = processed ? 0 : 1000;
        this.loopTimer = setTimeout(() => this.loop(), delay);
      })
      .catch((err) => {
        this.logger.error(`Worker ${this.id} loop error`, err.stack);
        if (this.isRunning) {
          this.loopTimer = setTimeout(() => this.loop(), 5000);
        }
      });
  }

  private async processNextJob(): Promise<boolean> {
    const minItem = this.heapService.peek();
    if (!minItem) {
      // Nothing in heap
      return false;
    }

    // Attempt to acquire lock on this job
    const acquired = await this.acquireJob(minItem.id);
    if (!acquired) {
      // Failed to acquire (maybe another worker got it, or it was cancelled)
      this.heapService.remove(minItem.id);
      return true; // Return true to loop immediately and try next
    }

    return true; // Job processed
  }

  private async acquireJob(jobId: string): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // SELECT FOR UPDATE SKIP LOCKED
      const job = await queryRunner.manager
        .createQueryBuilder(Job, 'job')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('job.id = :id', { id: jobId })
        .andWhere('job.status = :status', { status: JobStatus.PENDING })
        .getOne();

      if (!job) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      // We got the lock. Remove from heap.
      this.heapService.remove(job.id);
      this.currentJobId = job.id;

      // Update status to processing
      job.status = JobStatus.PROCESSING;
      job.startedAt = new Date();

      await queryRunner.manager.save(Job, job);
      await queryRunner.manager.save(JobLog, {
        jobId: job.id,
        event: SystemMessages.LOG_JOB_STARTED,
        message: `Worker ${this.id} started processing job`,
      });

      await queryRunner.commitTransaction();

      // Broadcast update before processing
      this.sseService.broadcastJobUpdate(job);

      // Now process it outside the row lock
      await this.executeJob(job);

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Worker ${this.id} failed to acquire job`, (error as Error).stack);
      return false;
    } finally {
      this.currentJobId = null;
      await queryRunner.release();
    }
  }

  private async executeJob(job: Job): Promise<void> {
    const handler = this.handlerRegistry.getHandler(job.type);

    if (!handler) {
      await this.handleJobFailure(
        job,
        new Error(SystemMessages.JOB_INVALID_HANDLER),
      );
      return;
    }

    try {
      const result = await handler.handle(job.payload);

      if (result.success) {
        await this.handleJobSuccess(job, result.output);
      } else {
        await this.handleJobFailure(
          job,
          new Error(result.error ?? 'Unknown handler error'),
          result.errorStack,
        );
      }
    } catch (error) {
      await this.handleJobFailure(job, error as Error, (error as Error).stack);
    }
  }

  private async handleJobSuccess(
    job: Job,
    output?: Record<string, unknown>,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Re-fetch job
      const currentJob = await queryRunner.manager.findOne(Job, {
        where: { id: job.id },
      });

      if (!currentJob) {
        throw new Error('Job not found during success handling');
      }

      currentJob.status = JobStatus.COMPLETED;
      currentJob.completedAt = new Date();

      await queryRunner.manager.save(Job, currentJob);
      await queryRunner.manager.save(JobLog, {
        jobId: job.id,
        event: SystemMessages.LOG_JOB_COMPLETED,
        message: 'Job completed successfully',
        metadata: output,
      });

      await this.handleRecurrence(currentJob, queryRunner.manager);

      await queryRunner.commitTransaction();

      this.logger.info({
        event: SystemMessages.LOG_JOB_COMPLETED,
        jobId: job.id,
        workerId: this.id,
      });

      this.sseService.broadcastJobUpdate(currentJob);

      // Trigger dependency resolution
      this.eventEmitter.emit('job.completed', currentJob.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to handle job success', (error as Error).stack);
    } finally {
      await queryRunner.release();
    }
  }

  private async handleJobFailure(
    job: Job,
    error: Error,
    errorStack?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const currentJob = await queryRunner.manager.findOne(Job, {
        where: { id: job.id },
      });

      if (!currentJob) {
        throw new Error('Job not found during failure handling');
      }

      currentJob.retryCount += 1;
      currentJob.errorMessage = error.message;

      if (currentJob.retryCount <= currentJob.maxRetries) {
        // Retry logic
        currentJob.status = JobStatus.PENDING;
        // Exponential backoff
        const delayMs = Math.pow(2, currentJob.retryCount) * 1000;
        currentJob.nextRunAt = new Date(Date.now() + delayMs);
        currentJob.scheduledAt = currentJob.nextRunAt;
        currentJob.startedAt = null;

        await queryRunner.manager.save(Job, currentJob);
        await queryRunner.manager.save(JobLog, {
          jobId: job.id,
          event: SystemMessages.LOG_JOB_RETRY,
          message: `Job failed, scheduling retry ${currentJob.retryCount}/${currentJob.maxRetries}`,
          metadata: { error: error.message, delayMs },
        });

        await queryRunner.commitTransaction();

        this.logger.structuredWarn({
          event: SystemMessages.LOG_JOB_RETRY,
          jobId: job.id,
          retryCount: currentJob.retryCount,
        });

        this.sseService.broadcastJobUpdate(currentJob);

        // Put back in scheduler (wheel or heap depending on delay)
        this.timingWheelService.scheduleJob({
          id: currentJob.id,
          priority: currentJob.priority,
          effectivePriority: currentJob.effectivePriority,
          scheduledAt: currentJob.scheduledAt,
          createdAt: currentJob.createdAt,
          recurrenceInterval: currentJob.recurrenceInterval,
        });
      } else {
        // Max retries exceeded -> FAILED -> DLQ
        currentJob.status = JobStatus.FAILED;
        currentJob.completedAt = new Date();

        await queryRunner.manager.save(Job, currentJob);
        await queryRunner.manager.save(JobLog, {
          jobId: job.id,
          event: SystemMessages.LOG_JOB_FAILED,
          message: 'Job failed permanently, moving to DLQ',
          metadata: { error: error.message },
        });

        await queryRunner.commitTransaction();

        this.logger.error({
          event: SystemMessages.LOG_JOB_FAILED,
          jobId: job.id,
          workerId: this.id,
          error: error.message,
        } as any);

        this.sseService.broadcastJobUpdate(currentJob);

        // Emit failure event to trigger DLQ insertion
        this.eventEmitter.emit('job.failed', {
          job: currentJob,
          error: error.message,
          errorStack: errorStack ?? error.stack,
        });
      }
    } catch (dbError) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to handle job failure', (dbError as Error).stack);
    } finally {
      await queryRunner.release();
    }
  }

  private async handleRecurrence(job: Job, manager: EntityManager): Promise<void> {
    if (!job.recurrenceInterval) return;

    // Create a NEW job row for the recurrence (do not reuse the ID)
    const intervalMs = RecurrenceIntervalMs[job.recurrenceInterval];
    if (!intervalMs) return;

    const nextRunAt = new Date(Date.now() + intervalMs);

    const newJob = manager.create(Job, {
      type: job.type,
      payload: job.payload, // clone payload
      priority: job.priority,
      effectivePriority: job.priority,
      maxRetries: job.maxRetries,
      scheduledAt: nextRunAt,
      recurrenceInterval: job.recurrenceInterval,
      payloadHash: job.payloadHash,
    });

    const savedJob = await manager.save(Job, newJob);

    await manager.save(JobLog, {
      jobId: savedJob.id,
      event: SystemMessages.LOG_JOB_CREATED,
      message: 'Recurring job scheduled automatically',
    });

    // Schedule the new job
    this.timingWheelService.scheduleJob({
      id: savedJob.id,
      priority: savedJob.priority,
      effectivePriority: savedJob.effectivePriority,
      scheduledAt: savedJob.scheduledAt,
      createdAt: savedJob.createdAt,
      recurrenceInterval: savedJob.recurrenceInterval,
    });

    // Broadcast new job
    this.sseService.broadcastJobUpdate(savedJob);
  }
}
