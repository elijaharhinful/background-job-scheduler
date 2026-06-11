import { Global, Module } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';

@Global()
@Module({
  providers: [SseService],
  controllers: [SseController],
  exports: [SseService],
})
export class SseModule {}
