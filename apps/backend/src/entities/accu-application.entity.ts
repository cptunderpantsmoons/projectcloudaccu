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

export enum ACCUStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ISSUED = 'issued',
}

@Entity('accu_applications')
@Index(['status'])
@Index(['projectId'])
export class AccuApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ACCUStatus,
    default: ACCUStatus.DRAFT,
  })
  status: ACCUStatus;

  @Column({ type: 'timestamp', nullable: true })
  submissionDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvalDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  issuedDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  accuUnits: number;

  @Column()
  methodologyId: string;

  @Column({ nullable: true })
  serReference: string;

  @Column({ type: 'jsonb' })
  applicationData: Record<string, any>;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => Project, (project) => project.accuApplications)
  project: Project;

  @Column()
  projectId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  isDraft(): boolean {
    return this.status === ACCUStatus.DRAFT;
  }

  isSubmitted(): boolean {
    return this.status === ACCUStatus.SUBMITTED;
  }

  isApproved(): boolean {
    return this.status === ACCUStatus.APPROVED;
  }

  isIssued(): boolean {
    return this.status === ACCUStatus.ISSUED;
  }
}