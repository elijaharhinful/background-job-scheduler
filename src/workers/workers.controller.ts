import { Body, Controller, Get, HttpCode, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { WorkerPoolService } from './worker-pool.service';
import { WorkersDocs } from './docs/workers.docs';
import { WorkerStateDto } from './dto/worker-state.dto';
import { UpdateWorkerCountDto } from './dto/update-worker-count.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { SystemMessages } from '../common/constants/system.messages';

@ApiTags('Workers')
@Controller('workers')
export class WorkersController {
  constructor(private readonly workerPool: WorkerPoolService) {}

  @Get()
  @WorkersDocs.GET_WORKERS
  @ResponseMessage(SystemMessages.WORKERS_FETCHED)
  getWorkers(): WorkerStateDto[] {
    return this.workerPool.getWorkerStates();
  }

  @Put('count')
  @HttpCode(200)
  @WorkersDocs.UPDATE_COUNT
  @ResponseMessage(SystemMessages.WORKER_COUNT_UPDATED)
  updateWorkerCount(@Body() dto: UpdateWorkerCountDto): { count: number } {
    this.workerPool.setWorkerCount(dto.count);
    return { count: this.workerPool.getWorkerCount() };
  }
}
