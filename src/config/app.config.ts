import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  workerCount: parseInt(process.env['WORKER_COUNT'] ?? '3', 10),
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:5173').split(
    ',',
  ),
}));
