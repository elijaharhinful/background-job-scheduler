import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TimingWheel } from './timing-wheel';
import { JobHeapService } from '../heap/job-heap.service';
import { Job } from '../../jobs/entities/job.entity';
import { JobStatus } from '../../common/enums/job-status.enum';
import { StructuredLoggerService } from '../../logging/structured-logger.service';
import { SystemMessages } from '../../common/constants/system.messages';

@Injectable()
export class TimingWheelSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  // Level 1: Seconds (0-59)
  private readonly secondsWheel = new TimingWheel(60);
  // Level 2: Minutes (0-59)
  private readonly minutesWheel = new TimingWheel(60);

  private tickTimer: NodeJS.Timeout;
  private readonly tickIntervalMs: number;
  private tickCount: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobHeapService: JobHeapService,
    private readonly logger: StructuredLoggerService,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {
    this.tickIntervalMs = this.configService.get<number>(
      'scheduler.scheduleTickerIntervalMs',
      1000,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.hydrateScheduledJobs();
    this.startTicker();
  }

  onModuleDestroy(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
    }
  }

  async hydrateScheduledJobs(): Promise<void> {
    const scheduledJobs = await this.jobRepo.find({
      where: { status: JobStatus.PENDING },
    });

    const now = new Date();

    for (const job of scheduledJobs) {
      if (!job.scheduledAt) continue;

      // Don't add to wheel if it has unresolved dependencies
      const hasDeps: unknown[] = await this.jobRepo.query(
        'SELECT 1 FROM job_dependencies WHERE "jobId" = $1 LIMIT 1',
        [job.id],
      );
      if (hasDeps.length > 0) continue;

      const delayMs = job.scheduledAt.getTime() - now.getTime();
      if (delayMs > 0) {
        this.scheduleJob({
          id: job.id,
          priority: job.priority,
          effectivePriority: job.effectivePriority,
          scheduledAt: job.scheduledAt,
          createdAt: job.createdAt,
          recurrenceInterval: job.recurrenceInterval,
        });
      }
    }
  }

  scheduleJob(
    item: import('../../common/interfaces/job-heap-item.interface').JobHeapItem,
  ): void {
    if (!item.scheduledAt) return;

    const delayMs = item.scheduledAt.getTime() - new Date().getTime();
    if (delayMs <= 0) {
      // Ready now, put directly in heap
      this.jobHeapService.insert(item);
      return;
    }

    const delaySeconds = Math.floor(delayMs / 1000);

    const secondsIntoCurrentMinute = this.tickCount % 60;
    const remainingSecondsInMinute = 60 - secondsIntoCurrentMinute;

    if (delaySeconds < remainingSecondsInMinute) {
      this.secondsWheel.insert(item, delaySeconds);
    } else {
      const delayMinutes = Math.ceil((delaySeconds - remainingSecondsInMinute) / 60) + 1;
      this.minutesWheel.insert(item, delayMinutes);
    }
  }

  cancelScheduledJob(id: string): void {
    this.secondsWheel.remove(id);
    this.minutesWheel.remove(id);
  }

  private startTicker(): void {
    this.tickTimer = setInterval(() => {
      this.tickCount++;

      // Every 60 seconds, transfer mature minute jobs to the seconds wheel
      if (this.tickCount % 60 === 0) {
        const matureMinuteJobs = this.minutesWheel.tick();
        for (const job of matureMinuteJobs) {
          // These jobs are due in the next 60 seconds
          const delayMs = job.scheduledAt!.getTime() - new Date().getTime();
          const delaySeconds = Math.max(0, Math.floor(delayMs / 1000));
          this.secondsWheel.insert(job, delaySeconds);
        }
      }

      // Every 1 second, tick the seconds wheel and move mature jobs to heap
      const matureSecondJobs = this.secondsWheel.tick();
      let promotedCount = 0;

      for (const job of matureSecondJobs) {
        // They are ready to run now
        this.jobHeapService.insert(job);
        promotedCount++;
      }

      if (promotedCount > 0) {
        this.logger.info({
          event: SystemMessages.LOG_SCHEDULE_TICK,
          promotedJobs: promotedCount,
        });
      }
    }, this.tickIntervalMs);
  }
}
