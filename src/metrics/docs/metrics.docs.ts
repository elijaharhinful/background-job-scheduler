import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemMessages } from '../../common/constants/system.messages';
import { MetricsResponseDto } from '../dto/metrics-response.dto';

export const MetricsDocs = {
  GET_METRICS: applyDecorators(
    ApiOperation({ summary: 'Get current system metrics' }),
    ApiResponse({
      status: 200,
      description: SystemMessages.METRICS_FETCHED,
      type: MetricsResponseDto,
    }),
  ),
};
