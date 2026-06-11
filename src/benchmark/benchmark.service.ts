import { Injectable } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class BenchmarkService {
  constructor(private readonly jobsService: JobsService) {}

  async seedJobs(count: number): Promise<{ message: string }> {
    // Generate jobs in batches so we don't overwhelm memory
    const batchSize = 100;
    let created = 0;

    // Use asynchronous loops instead of Promise.all for massive bursts to not lock up event loop entirely
    for (let i = 0; i < count; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, count - i);
      const promises: Promise<any>[] = [];

      for (let j = 0; j < currentBatchSize; j++) {
        const priority = Math.floor(Math.random() * 5) + 1; // 1 to 5
        const isScheduled = Math.random() > 0.8; // 20% scheduled
        const scheduledAt = isScheduled
          ? new Date(Date.now() + Math.random() * 60000) // within next min
          : undefined;

        promises.push(
          this.jobsService.create({
            type: 'send_email',
            priority,
            scheduledAt,
            payload: {
              to: `benchmark-${Date.now()}-${Math.random()}@example.com`,
              subject: 'Benchmark Job',
              body: '<p>Test</p>',
            },
          }),
        );
      }

      await Promise.all(promises);
      created += currentBatchSize;
    }

    return { message: `Successfully seeded ${created} jobs` };
  }
}
