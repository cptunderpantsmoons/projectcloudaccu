import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';
import { AuditFinding } from './audit-finding.entity';

export enum AuditStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('audits')
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.PLANNED,
  })
  status: AuditStatus;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column()
  scope: string;

  @Column()
  methodology: string;

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => Project, (project) => project.audits)
  project: Project;

  @Column()
  projectId: string;

  @ManyToOne(() => User, (user) => user.leadAudits)
  leadAuditor: User;

  @Column()
  leadAuditorId: string;

  @OneToMany(() => AuditFinding, (finding) => finding.audit, { cascade: true })
  findings: AuditFinding[];

  @ManyToMany(() => User, (user) => user.auditTeamMemberships)
  auditTeam: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}