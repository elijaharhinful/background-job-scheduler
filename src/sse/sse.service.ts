import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { SseEvent } from '../common/interfaces/sse-event.interface';
import { Job } from '../jobs/entities/job.entity';

@Injectable()
export class SseService {
  private readonly jobSubject = new Subject<SseEvent>();
  private readonly metricsSubject = new Subject<SseEvent>();
  private readonly workerSubject = new Subject<SseEvent>();

  getJobStream(): Observable<SseEvent> {
    return this.jobSubject.asObservable();
  }

  getMetricsStream(): Observable<SseEvent> {
    return this.metricsSubject.asObservable();
  }

  getWorkerStream(): Observable<SseEvent> {
    return this.workerSubject.asObservable();
  }

  broadcastJobUpdate(job: Job): void {
    // We broadcast the bare minimum needed for UI real-time updates
    this.jobSubject.next({
      data: {
        id: job.id,
        status: job.status,
        type: job.type,
        priority: job.priority,
        retry_count: job.retryCount,
        max_retries: job.maxRetries,
        scheduled_at: job.scheduledAt,
        started_at: job.startedAt,
        completed_at: job.completedAt,
        next_run_at: job.nextRunAt,
      },
      type: 'job_update',
    });
  }

  broadcastMetrics(metrics: any): void {
    this.metricsSubject.next({
      data: metrics,
      type: 'metrics_update',
    });
  }

  broadcastWorkerUpdate(workerData: { count: number; workers: any[] }): void {
    this.workerSubject.next({
      data: workerData,
      type: 'worker_pool_update',
    });
  }
}
