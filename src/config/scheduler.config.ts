import { registerAs } from '@nestjs/config';

export const schedulerConfig = registerAs('scheduler', () => ({
  starvationCheckIntervalMs: parseInt(
    process.env['STARVATION_CHECK_INTERVAL_MS'] ?? '30000',
    10,
  ),
  agingIntervalMin: parseFloat(process.env['AGING_INTERVAL_MIN'] ?? '5'),
  agingBoostPerInterval: parseFloat(
    process.env['AGING_BOOST_PER_INTERVAL'] ?? '0.5',
  ),
  scheduleTickerIntervalMs: parseInt(
    process.env['SCHEDULE_TICKER_INTERVAL_MS'] ?? '1000',
    10,
  ),
  dlqAlertThreshold: parseInt(
    process.env['DLQ_ALERT_THRESHOLD'] ?? '10',
    10,
  ),
  resendApiKey: process.env['RESEND_API_KEY'] ?? '',
  resendFrom: process.env['RESEND_FROM'] ?? '',
  resendAlertTo: process.env['RESEND_ALERT_TO'] ?? '',
  mockEmailFailureRate: parseFloat(
    process.env['MOCK_EMAIL_FAILURE_RATE'] ?? '0.1',
  ),
}));
