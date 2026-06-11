import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobDependenciesTable1749600000004 implements MigrationInterface {
  name = 'CreateJobDependenciesTable1749600000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "job_dependencies" (
        "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
        "jobId"            UUID NOT NULL,
        "dependsOnJobId"   UUID NOT NULL,
        CONSTRAINT "PK_job_dependencies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_dep" UNIQUE ("jobId", "dependsOnJobId"),
        CONSTRAINT "FK_dep_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dep_parent" FOREIGN KEY ("dependsOnJobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_job_dep_job" ON "job_dependencies" ("jobId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_job_dep_job"`);
    await queryRunner.query(`DROP TABLE "job_dependencies"`);
  }
}
