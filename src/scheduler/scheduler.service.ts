import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { JobHeapService } from './heap/job-heap.service';
import { TimingWheelSchedulerService } from './timing-wheel/timing-wheel-scheduler.service';
import { DagService } from './dag/dag.service';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly jobHeapService: JobHeapService,
    private readonly timingWheelService: TimingWheelSchedulerService,
    private readonly dagService: DagService,
  ) {}

  @OnEvent('job.cancel')
  handleJobCancel(jobId: string): void {
    // Attempt to remove from heap
    this.jobHeapService.remove(jobId);
    // Attempt to remove from timing wheel
    this.timingWheelService.cancelScheduledJob(jobId);
  }
}
