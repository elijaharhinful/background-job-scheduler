import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeadLetterQueueTable1749600000003
  implements MigrationInterface
{
  name = 'CreateDeadLetterQueueTable1749600000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "dead_letter_queue" (
        "id"              UUID      NOT NULL DEFAULT gen_random_uuid(),
        "jobId"           UUID      NOT NULL,
        "finalError"      TEXT      NOT NULL,
        "errorStack"      TEXT,
        "payloadSnapshot" JSONB     NOT NULL,
        "retryCount"      SMALLINT  NOT NULL,
        "jobType"         VARCHAR(100) NOT NULL,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "retriedAt"       TIMESTAMPTZ,
        CONSTRAINT "PK_dead_letter_queue" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dlq_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_dlq_job" ON "dead_letter_queue" ("jobId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_dlq_job"`);
    await queryRunner.query(`DROP TABLE "dead_letter_queue"`);
  }
}
