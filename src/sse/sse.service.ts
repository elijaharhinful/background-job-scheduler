import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { SseEvent } from '../common/interfaces/sse-event.interface';
import { Job } from '../jobs/entities/job.entity';

@Injectable()
export class SseService {
  private readonly jobSubject = new Subject<SseEvent>();
  private readonly metricsSubject = new Subject<SseEvent>();

  getJobStream(): Observable<SseEvent> {
    return this.jobSubject.asObservable();
  }

  getMetricsStream(): Observable<SseEvent> {
    return this.metricsSubject.asObservable();
  }

  broadcastJobUpdate(job: Job): void {
    // We broadcast the bare minimum needed for UI real-time updates
    this.jobSubject.next({
      data: {
        id: job.id,
        status: job.status,
        type: job.type,
        priority: job.priority,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        scheduledAt: job.scheduledAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        nextRunAt: job.nextRunAt,
      },
      event: 'job_update',
    });
  }

  broadcastMetrics(metrics: any): void {
    this.metricsSubject.next({
      data: metrics,
      event: 'metrics_update',
    });
  }
}
