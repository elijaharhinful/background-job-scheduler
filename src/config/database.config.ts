import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USER'] ?? 'scheduler',
  password: process.env['DB_PASS'] ?? 'scheduler',
  name: process.env['DB_NAME'] ?? 'scheduler_db',
}));
