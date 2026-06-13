import { Controller, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { SseEvent } from '../common/interfaces/sse-event.interface';

@ApiTags('SSE')
@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('jobs')
  @ApiOperation({ summary: 'Subscribe to real-time job updates' })
  sseJobs(): Observable<SseEvent> {
    return this.sseService.getJobStream();
  }

  @Sse('metrics')
  @ApiOperation({ summary: 'Subscribe to real-time system metrics' })
  sseMetrics(): Observable<SseEvent> {
    return this.sseService.getMetricsStream();
  }

  @Sse('workers')
  @ApiOperation({ summary: 'Subscribe to real-time worker pool updates' })
  sseWorkers(): Observable<SseEvent> {
    return this.sseService.getWorkerStream();
  }
}
