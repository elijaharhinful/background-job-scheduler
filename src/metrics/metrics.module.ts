import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { Job } from '../jobs/entities/job.entity';
import { DeadLetter } from '../dlq/entities/dead-letter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, DeadLetter])],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
