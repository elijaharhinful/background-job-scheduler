import { Injectable, OnModuleInit } from '@nestjs/common';
import { IJobHandler } from '../common/interfaces/job-handler.interface';
import { EmailHandler } from './email/email.handler';

@Injectable()
export class HandlerRegistry implements OnModuleInit {
  private readonly handlers: Map<string, IJobHandler> = new Map();

  constructor(private readonly emailHandler: EmailHandler) {}

  onModuleInit(): void {
    this.register(this.emailHandler);
  }

  register(handler: IJobHandler): void {
    this.handlers.set(handler.type, handler);
  }

  getHandler(type: string): IJobHandler | undefined {
    return this.handlers.get(type);
  }
}
