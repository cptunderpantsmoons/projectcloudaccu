import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Audit } from './audit.entity';
import { User } from './user.entity';

export enum AuditFindingType {
  OBSERVATION = 'observation',
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
  CLOSED = 'closed',
}

@Entity('audit_findings')
export class AuditFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: AuditFindingType,
  })
  type: AuditFindingType;

  @Column({
    type: 'enum',
    enum: AuditFindingType,
    default: AuditFindingType.MINOR,
  })
  status: AuditFindingType;

  @Column({ nullable: true })
  evidence: string;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @ManyToOne(() => Audit, (audit) => audit.findings, { onDelete: 'CASCADE' })
  audit: Audit;

  @Column()
  auditId: string;

  @ManyToOne(() => User, { nullable: true })
  assignedTo: User;

  @Column({ nullable: true })
  assignedToId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}