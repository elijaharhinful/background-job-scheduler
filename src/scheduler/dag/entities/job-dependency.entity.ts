import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Job } from '../../../jobs/entities/job.entity';

@Entity('job_dependencies')
@Unique(['jobId', 'dependsOnJobId'])
export class JobDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  job: Job;

  @Column({ type: 'uuid' })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  dependsOnJob: Job;

  @Column({ type: 'uuid' })
  dependsOnJobId: string;
}
