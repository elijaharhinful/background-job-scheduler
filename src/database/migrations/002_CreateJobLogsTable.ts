import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobLogsTable1749600000002 implements MigrationInterface {
  name = 'CreateJobLogsTable1749600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_logs" (
        "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
        "jobId"     UUID        NOT NULL,
        "event"     VARCHAR(50) NOT NULL,
        "message"   TEXT        NOT NULL,
        "metadata"  JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_logs_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_job_logs_job" ON "job_logs" ("jobId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_job_logs_job"`);
    await queryRunner.query(`DROP TABLE "job_logs"`);
  }
}
