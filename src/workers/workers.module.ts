import { Global, Module } from '@nestjs/common';
import { WorkerPoolService } from './worker-pool.service';
import { WorkersController } from './workers.controller';

@Global()
@Module({
  controllers: [WorkersController],
  providers: [WorkerPoolService],
  exports: [WorkerPoolService],
})
export class WorkersModule {}
