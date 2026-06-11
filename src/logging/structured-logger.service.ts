import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as fs from 'fs';

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }

    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(
              ({ timestamp, level, message, ...meta }) =>
                `${String(timestamp)} [${level}] ${String(message)} ${
                  Object.keys(meta).length ? JSON.stringify(meta) : ''
                }`,
            ),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
        new winston.transports.File({
          filename: 'logs/errors.log',
          level: 'error',
        }),
      ],
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  info(meta: Record<string, unknown>): void {
    this.logger.info(
      typeof meta['event'] === 'string' ? meta['event'] : 'event',
      meta,
    );
  }

  structuredError(meta: Record<string, unknown>): void {
    this.logger.error(
      typeof meta['event'] === 'string' ? meta['event'] : 'error',
      meta,
    );
  }

  structuredWarn(meta: Record<string, unknown>): void {
    this.logger.warn(
      typeof meta['event'] === 'string' ? meta['event'] : 'warn',
      meta,
    );
  }
}
