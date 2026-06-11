import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { MetricsService } from './metrics.service';
import { MetricsDocs } from './docs/metrics.docs';
import { MetricsResponseDto } from './dto/metrics-response.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { SystemMessages } from '../common/constants/system.messages';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @MetricsDocs.GET_METRICS
  @ResponseMessage(SystemMessages.METRICS_FETCHED)
  async getMetrics(): Promise<MetricsResponseDto> {
    return this.metricsService.getMetrics();
  }
}
