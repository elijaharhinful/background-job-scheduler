import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';

@Entity('dead_letter_queue')
export class DeadLetter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  job: Job;

  @Column({ type: 'uuid' })
  jobId: string;

  @Column({ type: 'text' })
  finalError: string;

  @Column({ type: 'text', nullable: true })
  errorStack: string | null;

  @Column({ type: 'jsonb' })
  payloadSnapshot: Record<string, unknown>;

  @Column({ type: 'smallint' })
  retryCount: number;

  @Column({ type: 'varchar', length: 100 })
  jobType: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  retriedAt: Date | null;
}
