import { JobPriority } from '../enums/job-priority.enum';
import { RecurrenceInterval } from '../enums/recurrence-interval.enum';

export interface JobHeapItem {
  id: string;
  priority: JobPriority;
  effectivePriority: number;
  scheduledAt: Date | null;
  createdAt: Date;
  recurrenceInterval: RecurrenceInterval | null;
}
