import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { schedulerConfig } from './config/scheduler.config';

import { LoggingModule } from './logging/logging.module';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { WorkersModule } from './workers/workers.module';
import { HandlersModule } from './handlers/handlers.module';
import { DlqModule } from './dlq/dlq.module';
import { SseModule } from './sse/sse.module';
import { MetricsModule } from './metrics/metrics.module';
import { BenchmarkModule } from './benchmark/benchmark.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, schedulerConfig],
      envFilePath: ['.env'],
    }),
    EventEmitterModule.forRoot(),
    LoggingModule,
    DatabaseModule,
    JobsModule,
    SchedulerModule,
    WorkersModule,
    HandlersModule,
    DlqModule,
    SseModule,
    MetricsModule,
    BenchmarkModule,
  ],
})
export class AppModule {}
