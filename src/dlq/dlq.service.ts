import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';

import { DeadLetter } from './entities/dead-letter.entity';
import { DlqQueryDto } from './dto/dlq-query.dto';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { SystemMessages } from '../common/constants/system.messages';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { JobHeapService } from '../scheduler/heap/job-heap.service';
import { SseService } from '../sse/sse.service';

@Injectable()
export class DlqService {
  private readonly alertThreshold: number;

  constructor(
    @InjectRepository(DeadLetter)
    private readonly dlqRepo: Repository<DeadLetter>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
    private readonly heapService: JobHeapService,
    private readonly sseService: SseService,
  ) {
    this.alertThreshold = this.configService.get<number>(
      'scheduler.dlqAlertThreshold',
      10,
    );
  }

  @OnEvent('job.failed')
  async handleJobFailed(payload: {
    job: Job;
    error: string;
    errorStack?: string;
  }): Promise<void> {
    const { job, error, errorStack } = payload;

    const dlqEntry = this.dlqRepo.create({
      jobId: job.id,
      finalError: error,
      errorStack,
      payloadSnapshot: job.payload,
      retryCount: job.retryCount,
      jobType: job.type,
    });

    await this.dlqRepo.save(dlqEntry);

    this.logger.info({
      event: SystemMessages.LOG_DLQ_INSERTED,
      jobId: job.id,
    });

    await this.checkThresholdAndAlert();
  }

  async findAll(query: DlqQueryDto): Promise<PaginatedResult<DeadLetter>> {
    const qb = this.dlqRepo.createQueryBuilder('dlq');

    if (query.jobType) {
      qb.andWhere('dlq.jobType = :jobType', { jobType: query.jobType });
    }

    if (query.sort) {
      const [field, order] = query.sort.split(':');
      if (field && (order === 'asc' || order === 'desc')) {
        qb.orderBy(`dlq.${field}`, order.toUpperCase() as 'ASC' | 'DESC');
      } else {
        qb.orderBy('dlq.createdAt', 'DESC');
      }
    } else {
      qb.orderBy('dlq.createdAt', 'DESC');
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

  async findOne(id: string): Promise<DeadLetter> {
    const entry = await this.dlqRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(SystemMessages.DLQ_ENTRY_NOT_FOUND);
    }
    return entry;
  }

  async retry(id: string): Promise<void> {
    const entry = await this.findOne(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Recreate job or update existing
      let job = await queryRunner.manager.findOne(Job, {
        where: { id: entry.jobId },
      });

      if (job) {
        job.status = JobStatus.PENDING;
        job.retryCount = 0; // Reset retries
        job.errorMessage = null;
        job.scheduledAt = null;
        job.startedAt = null;
        job.completedAt = null;
        job.nextRunAt = null;
        await queryRunner.manager.save(Job, job);
      } else {
        // Job was deleted, recreate it
        const newJob = queryRunner.manager.create(Job, {
          id: entry.jobId,
          type: entry.jobType,
          payload: entry.payloadSnapshot,
          priority: 2,
          effectivePriority: 2,
          status: JobStatus.PENDING,
          retryCount: 0,
        });
        job = await queryRunner.manager.save(Job, newJob);
      }

      // Mark DLQ entry as retried
      entry.retriedAt = new Date();
      await queryRunner.manager.save(DeadLetter, entry);

      await queryRunner.commitTransaction();

      // Put back in queue
      this.heapService.insert({
        id: job.id,
        priority: job.priority,
        effectivePriority: job.effectivePriority,
        scheduledAt: job.scheduledAt,
        createdAt: job.createdAt,
        recurrenceInterval: job.recurrenceInterval,
      });

      this.sseService.broadcastJobUpdate(job);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.dlqRepo.remove(entry);
  }

  private async checkThresholdAndAlert(): Promise<void> {
    const count = await this.dlqRepo.count({
      where: { retriedAt: IsNull() },
    });

    if (count >= this.alertThreshold) {
      this.logger.structuredWarn({
        event: SystemMessages.LOG_DLQ_THRESHOLD,
        message: SystemMessages.DLQ_THRESHOLD_EXCEEDED,
        count,
        threshold: this.alertThreshold,
      });

      // Dispatch alert
      // Using event emitter to avoid circular deps if email handler needs jobs service
      // Or we can just log it, we also need to send an alert.
      // Let's create an internal alert job.
      
      const emailHandlerPayload = {
        to: this.configService.get<string>('scheduler.resendAlertTo', ''),
        subject: 'DLQ Alert: Threshold Exceeded',
        body: 'The Dead Letter Queue has exceeded the threshold of ' + this.alertThreshold + ' items. Current count is ' + count + '.',
      };

      if (emailHandlerPayload.to) {
        const job = this.jobRepo.create({
          type: 'send_email',
          payload: emailHandlerPayload as unknown as Record<string, unknown>,
          priority: 1, // High priority
          effectivePriority: 1,
        });
        const saved = await this.jobRepo.save(job);
        
        this.heapService.insert({
          id: saved.id,
          priority: saved.priority,
          effectivePriority: saved.effectivePriority,
          scheduledAt: saved.scheduledAt,
          createdAt: saved.createdAt,
          recurrenceInterval: saved.recurrenceInterval,
        });
        
        this.logger.info({
          event: SystemMessages.LOG_DLQ_ALERT_SENT,
        });
      }
    }
  }
}
