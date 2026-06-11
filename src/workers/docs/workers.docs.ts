import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemMessages } from '../../common/constants/system.messages';
import { WorkerStateDto } from '../dto/worker-state.dto';

export const WorkersDocs = {
  GET_WORKERS: applyDecorators(
    ApiOperation({ summary: 'Get state of all active workers' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.WORKERS_FETCHED,
      type: [WorkerStateDto],
    }),
  ),

  UPDATE_COUNT: applyDecorators(
    ApiOperation({ summary: 'Update the number of active workers' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.WORKER_COUNT_UPDATED,
    }),
    ApiResponse({
      status: 422,
      description: SystemMessages.VALIDATION_ERROR,
    }),
  ),
};
