export enum RecurrenceInterval {
  EVERY_1_MINUTE = 'every_1_minute',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_1_HOUR = 'every_1_hour',
}

export const RecurrenceIntervalMs: Record<RecurrenceInterval, number> = {
  [RecurrenceInterval.EVERY_1_MINUTE]: 60_000,
  [RecurrenceInterval.EVERY_5_MINUTES]: 300_000,
  [RecurrenceInterval.EVERY_1_HOUR]: 3_600_000,
};
