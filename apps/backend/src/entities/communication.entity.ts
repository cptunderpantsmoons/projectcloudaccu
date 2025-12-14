import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

export enum CommunicationType {
  EMAIL = 'email',
  PHONE = 'phone',
  MEETING = 'meeting',
  LETTER = 'letter',
  CER_NOTICE = 'cer_notice',
}

export enum CommunicationStatus {
  RECEIVED = 'received',
  READ = 'read',
  REPLIED = 'replied',
  ACTION_REQUIRED = 'action_required',
  ARCHIVED = 'archived',
}

@Entity('communications')
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CommunicationType,
  })
  type: CommunicationType;

  @Column({
    type: 'enum',
    enum: CommunicationStatus,
    default: CommunicationStatus.RECEIVED,
  })
  status: CommunicationStatus;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  fromAddress: string;

  @Column('text', { array: true })
  toAddresses: string[];

  @Column('text', { array: true, default: [] })
  ccAddresses: string[];

  @Column('text', { array: true, default: [] })
  bccAddresses: string[];

  @Column({ type: 'timestamp' })
  receivedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => Project, (project) => project.communications, { nullable: true })
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @ManyToOne(() => User, (user) => user.communications)
  createdBy: User;

  @Column()
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}