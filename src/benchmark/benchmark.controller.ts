import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BenchmarkService, BenchmarkResult } from './benchmark.service';
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
  @ResponseMessage('Benchmark run successfully')
  runBenchmark(@Body() dto: RunBenchmarkDto): BenchmarkResult {
    return this.benchmarkService.runBenchmark(dto.count);
  }

  @Get('results')
  @ResponseMessage('Latest benchmark results fetched')
  getResults(): BenchmarkResult {
    return this.benchmarkService.getLatestResults();
  }
}
