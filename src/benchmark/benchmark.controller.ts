import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BenchmarkService } from './benchmark.service';
import { RunBenchmarkDto } from './dto/run-benchmark.dto';
import { BenchmarkDocs } from './docs/benchmark.docs';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@ApiTags('Benchmark')
@Controller('benchmark')
export class BenchmarkController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Post()
  @HttpCode(201)
  @BenchmarkDocs.RUN
  @ResponseMessage('Benchmark jobs submitted')
  async runBenchmark(
    @Body() dto: RunBenchmarkDto,
  ): Promise<{ message: string }> {
    return this.benchmarkService.seedJobs(dto.count);
  }
}
