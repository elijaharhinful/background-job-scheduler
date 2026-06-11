import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const BenchmarkDocs = {
  RUN: applyDecorators(
    ApiOperation({ summary: 'Seed the system with mock jobs for benchmarking' }),
    ApiResponse({
      status: 201,
      description: 'Benchmark jobs successfully submitted',
    }),
  ),
};
