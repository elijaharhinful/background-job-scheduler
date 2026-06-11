import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeadLetter } from './entities/dead-letter.entity';
import { DlqService } from './dlq.service';
import { DlqController } from './dlq.controller';
import { Job } from '../jobs/entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeadLetter, Job])],
  controllers: [DlqController],
  providers: [DlqService],
  exports: [DlqService],
})
export class DlqModule {}
