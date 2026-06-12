import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  status_code: number;
  timestamp: string;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) ??
      'Success';

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Bypass transform for SSE endpoints to prevent breaking the EventSource format
    if (request.url.includes('/sse')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return next.handle() as any;
    }

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        message,
        data,
        status_code: response.statusCode,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
