export const SystemMessages = {
  // ── Jobs ──────────────────────────────────────────────────────────
  JOB_CREATED: 'Job created successfully',
  JOB_FETCHED: 'Job retrieved successfully',
  JOBS_FETCHED: 'Jobs retrieved successfully',
  JOB_CANCELLED: 'Job cancelled successfully',
  JOB_NOT_FOUND: 'Job not found',
  JOB_ALREADY_CANCELLED: 'Job is already cancelled',
  JOB_ALREADY_PROCESSING: 'Job is currently processing and cannot be modified',
  JOB_DUPLICATE:
    'A job with identical type and payload already exists in the queue',
  JOB_INVALID_HANDLER: 'No registered handler found for the specified job type',
  JOB_DEP_NOT_FOUND: 'One or more dependency job IDs do not exist',
  JOB_DEP_CYCLE: 'Adding this dependency would create a circular dependency',
  JOB_WORKFLOW_FETCHED: 'Job workflow retrieved successfully',
  JOB_TYPES_FETCHED: 'Registered job types retrieved successfully',

  // ── DLQ ───────────────────────────────────────────────────────────
  DLQ_FETCHED: 'Dead-letter queue entries retrieved successfully',
  DLQ_ENTRY_FETCHED: 'Dead-letter entry retrieved successfully',
  DLQ_ENTRY_NOT_FOUND: 'Dead-letter entry not found',
  DLQ_RETRY_QUEUED: 'Job has been re-queued for retry',
  DLQ_ENTRY_DELETED: 'Dead-letter entry removed successfully',
  DLQ_THRESHOLD_EXCEEDED: 'DLQ threshold exceeded — alert dispatched',

  // ── Metrics ───────────────────────────────────────────────────────
  METRICS_FETCHED: 'System metrics retrieved successfully',

  // ── Benchmark ─────────────────────────────────────────────────────
  BENCHMARK_STARTED: 'Benchmark run initiated',
  BENCHMARK_FETCHED: 'Benchmark results retrieved successfully',
  BENCHMARK_NOT_RUN: 'No benchmark results available — run a benchmark first',

  // ── Workers ───────────────────────────────────────────────────────
  WORKERS_FETCHED: 'Worker states retrieved successfully',
  WORKER_COUNT_UPDATED: 'Worker count updated successfully',

  // ── Generic ───────────────────────────────────────────────────────
  INTERNAL_ERROR: 'An unexpected error occurred',
  VALIDATION_ERROR: 'Request validation failed',
  CONFLICT_ERROR: 'Resource conflict detected',

  // ── Log event names (structured logger — not returned to client) ──
  LOG_JOB_CREATED: 'job_created',
  LOG_JOB_STARTED: 'job_started',
  LOG_JOB_RETRY: 'job_retry',
  LOG_JOB_FAILED: 'job_failed',
  LOG_JOB_CANCELLED: 'job_cancelled',
  LOG_JOB_COMPLETED: 'job_completed',
  LOG_JOB_DEP_WAITING: 'job_waiting_on_dependencies',
  LOG_DLQ_INSERTED: 'dlq_entry_inserted',
  LOG_DLQ_THRESHOLD: 'dlq_threshold_exceeded',
  LOG_DLQ_ALERT_SENT: 'dlq_alert_sent',
  LOG_WORKER_IDLE: 'worker_idle',
  LOG_WORKER_STARTED: 'worker_started',
  LOG_WORKER_STOPPED: 'worker_stopped',
  LOG_STARVATION_TICK: 'starvation_tick',
  LOG_SCHEDULE_TICK: 'schedule_tick',
  LOG_HEAP_HYDRATED: 'heap_hydrated',
} as const;

export type SystemMessageKey = keyof typeof SystemMessages;
