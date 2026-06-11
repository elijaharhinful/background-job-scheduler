import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JobHeapService } from './heap/job-heap.service';
import { TimingWheelSchedulerService } from './timing-wheel/timing-wheel-scheduler.service';
import { DagService } from './dag/dag.service';
import { SchedulerService } from './scheduler.service';
import { JobDependency } from './dag/entities/job-dependency.entity';
import { Job } from '../jobs/entities/job.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([JobDependency, Job])],
  providers: [
    JobHeapService,
    TimingWheelSchedulerService,
    DagService,
    SchedulerService,
  ],
  exports: [JobHeapService, TimingWheelSchedulerService, DagService],
})
export class SchedulerModule {}
