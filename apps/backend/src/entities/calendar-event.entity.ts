import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum EventType {
  DEADLINE = 'deadline',
  MEETING = 'meeting',
  AUDIT = 'audit',
  REVIEW = 'review',
  SUBMISSION = 'submission',
  REMINDER = 'reminder',
  CUSTOM = 'custom',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('calendar_events')
@Index(['type', 'priority'])
@Index(['projectId'])
@Index(['startDate'])
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  type: EventType;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ default: false })
  isAllDay: boolean;

  @Column({ nullable: true })
  recurrenceRule: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', default: [1, 7, 30] })
  reminders: number[];

  @Column({ nullable: true })
  tenantId: string;

  // Relations
  @ManyToOne(() => Project, (project) => project.calendarEvents, { nullable: true })
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  @Column()
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  assignee: User;

  @Column({ nullable: true })
  assigneeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isDeadline(): boolean {
    return this.type === EventType.DEADLINE;
  }

  isMeeting(): boolean {
    return this.type === EventType.MEETING;
  }

  isAudit(): boolean {
    return this.type === EventType.AUDIT;
  }

  isSubmission(): boolean {
    return this.type === EventType.SUBMISSION;
  }

  isCritical(): boolean {
    return this.priority === Priority.CRITICAL;
  }

  isHighPriority(): boolean {
    return this.priority === Priority.HIGH;
  }

  isRecurring(): boolean {
    return !!this.recurrenceRule;
  }

  getDurationInHours(): number {
    if (!this.endDate) return 0;
    const duration = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(duration / (1000 * 60 * 60));
  }
}