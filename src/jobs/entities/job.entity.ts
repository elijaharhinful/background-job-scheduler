import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobStatus } from '../../common/enums/job-status.enum';
import { JobPriority } from '../../common/enums/job-priority.enum';
import { RecurrenceInterval } from '../../common/enums/recurrence-interval.enum';
import { JobLog } from './job-log.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'smallint', default: JobPriority.MEDIUM })
  priority: number;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({ type: 'smallint', default: 0 })
  retryCount: number;

  @Column({ type: 'smallint', default: 3 })
  maxRetries: number;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  @Column({
    type: 'enum',
    enum: RecurrenceInterval,
    nullable: true,
  })
  recurrenceInterval: RecurrenceInterval | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'float8', default: 2 })
  effectivePriority: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  payloadHash: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => JobLog, (log) => log.job, { cascade: true })
  logs: JobLog[];
}
