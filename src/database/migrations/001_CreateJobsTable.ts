import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobsTable1749600000001 implements MigrationInterface {
  name = 'CreateJobsTable1749600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "job_status_enum" AS ENUM (
        'pending', 'processing', 'completed', 'failed', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "recurrence_interval_enum" AS ENUM (
        'every_1_minute', 'every_5_minutes', 'every_1_hour'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
        "type"                 VARCHAR(100) NOT NULL,
        "payload"              JSONB        NOT NULL,
        "priority"             SMALLINT     NOT NULL DEFAULT 2,
        "status"               "job_status_enum" NOT NULL DEFAULT 'pending',
        "retryCount"           SMALLINT     NOT NULL DEFAULT 0,
        "maxRetries"           SMALLINT     NOT NULL DEFAULT 3,
        "scheduledAt"          TIMESTAMPTZ,
        "startedAt"            TIMESTAMPTZ,
        "completedAt"          TIMESTAMPTZ,
        "nextRunAt"            TIMESTAMPTZ,
        "recurrenceInterval"   "recurrence_interval_enum",
        "errorMessage"         TEXT,
        "effectivePriority"    FLOAT8       NOT NULL DEFAULT 2,
        "payloadHash"          VARCHAR(64),
        "createdAt"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_jobs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_jobs_worker_poll" ON "jobs" ("status", "effectivePriority", "scheduledAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_jobs_scheduled" ON "jobs" ("status", "scheduledAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_jobs_type" ON "jobs" ("type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_jobs_type"`);
    await queryRunner.query(`DROP INDEX "idx_jobs_scheduled"`);
    await queryRunner.query(`DROP INDEX "idx_jobs_worker_poll"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TYPE "recurrence_interval_enum"`);
    await queryRunner.query(`DROP TYPE "job_status_enum"`);
  }
}
