import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { IJobHandler } from '../../common/interfaces/job-handler.interface';
import { HandlerResult } from '../../common/interfaces/handler-result.interface';
import { EmailPayload } from '../../common/interfaces/email-payload.interface';
import { StructuredLoggerService } from '../../logging/structured-logger.service';

@Injectable()
export class EmailHandler implements IJobHandler {
  readonly type = 'send_email';
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly mockFailureRate: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
  ) {
    const apiKey = this.configService.get<string>('scheduler.resendApiKey', '');
    this.resend = new Resend(apiKey || 're_mock_key');
    this.fromEmail = this.configService.get<string>(
      'scheduler.resendFrom',
      'noreply@example.com',
    );
    this.mockFailureRate = this.configService.get<number>(
      'scheduler.mockEmailFailureRate',
      0.1,
    );
  }

  async handle(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HandlerResult> {
    const { to, subject, body } = payload as unknown as EmailPayload;

    if (signal?.aborted) {
      return { success: false, error: 'Cancelled' };
    }

    if (!to || !subject || !body) {
      return {
        success: false,
        error: 'Missing required email fields (to, subject, body)',
      };
    }

    // Simulate random failures for testing retry/DLQ mechanics
    if (Math.random() < this.mockFailureRate) {
      return {
        success: false,
        error: 'Simulated random email delivery failure',
      };
    }

    try {
      // In a real app with a valid API key, this would send an email.
      // If the key is 're_mock_key', it will likely fail with 401, so we mock success if key is mock
      if (
        this.configService.get<string>('scheduler.resendApiKey', '') ===
        're_mock_key'
      ) {
        this.logger.info({
          event: 'mock_email_sent',
          to,
          subject,
        });

        // Simulating long running task to allow cancellation
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 2000);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Cancelled'));
            });
          }
        });

        return {
          success: true,
          output: {
            mockDeliveryId: `mock-${Date.now()}`,
            deliveredTo: to,
          },
        };
      }

      const data = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html: body,
      });

      if (data.error) {
        return {
          success: false,
          error: data.error.message,
        };
      }

      return {
        success: true,
        output: {
          deliveryId: data.data?.id,
          deliveredTo: to,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        errorStack: (error as Error).stack,
      };
    }
  }
}
