import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SystemMessages } from '../../common/constants/system.messages';
import { DlqEntryResponseDto } from '../dto/dlq-entry-response.dto';

export const DlqDocs = {
  FIND_ALL: applyDecorators(
    ApiOperation({
      summary: 'Get paginated list of dead-letter queue entries',
    }),
    ApiResponse({
      status: 200,
      description: SystemMessages.DLQ_FETCHED,
    }),
  ),

  FIND_ONE: applyDecorators(
    ApiOperation({ summary: 'Get a single dead-letter entry by ID' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.DLQ_ENTRY_FETCHED,
      type: DlqEntryResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: SystemMessages.DLQ_ENTRY_NOT_FOUND,
    }),
  ),

  RETRY: applyDecorators(
    ApiOperation({ summary: 'Re-queue a dead-letter entry for retry' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.DLQ_RETRY_QUEUED,
    }),
    ApiResponse({
      status: 404,
      description: SystemMessages.DLQ_ENTRY_NOT_FOUND,
    }),
  ),

  DELETE: applyDecorators(
    ApiOperation({ summary: 'Delete a dead-letter entry' }),
    ApiParam({ name: 'id', format: 'uuid' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.DLQ_ENTRY_DELETED,
    }),
    ApiResponse({
      status: 404,
      description: SystemMessages.DLQ_ENTRY_NOT_FOUND,
    }),
  ),
};
