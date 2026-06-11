import { Global, Module } from '@nestjs/common';
import { HandlerRegistry } from './handler.registry';
import { EmailHandler } from './email/email.handler';

@Global()
@Module({
  providers: [HandlerRegistry, EmailHandler],
  exports: [HandlerRegistry],
})
export class HandlersModule {}
