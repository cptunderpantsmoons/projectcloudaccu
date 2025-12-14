import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Document } from './document.entity';
import { CalendarEvent } from './calendar-event.entity';
import { AccuApplication } from './accu-application.entity';
import { AccuInventoryItem } from './accu-inventory-item.entity';
import { Audit } from './audit.entity';
import { Communication } from './communication.entity';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectType {
  METHODOLOGY = 'methodology',
  AUDIT = 'audit',
  COMPLIANCE = 'compliance',
  RESEARCH = 'research',
}

@Entity('projects')
@Index(['status', 'type'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectType,
  })
  type: ProjectType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  methodology: {
    id: string;
    name: string;
    version: string;
    url: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  tenantId: string;

  // Owner (many projects can belong to one owner)
  @ManyToOne(() => User, (user) => user.ownedProjects)
  owner: User;

  @Column()
  ownerId: string;

  // Relations
  @OneToMany(() => Document, (document) => document.project)
  documents: Document[];

  @OneToMany(() => CalendarEvent, (event) => event.project)
  calendarEvents: CalendarEvent[];

  @OneToMany(() => AccuApplication, (accuApp) => accuApp.project)
  accuApplications: AccuApplication[];

  @OneToMany(() => AccuInventoryItem, (inventory) => inventory.project)
  accuInventory: AccuInventoryItem[];

  @OneToMany(() => Audit, (audit) => audit.project)
  audits: Audit[];

  @OneToMany(() => Communication, (communication) => communication.project)
  communications: Communication[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === ProjectStatus.ACTIVE;
  }

  isCompleted(): boolean {
    return this.status === ProjectStatus.COMPLETED;
  }

  isOnHold(): boolean {
    return this.status === ProjectStatus.ON_HOLD;
  }

  isDraft(): boolean {
    return this.status === ProjectStatus.DRAFT;
  }

  getDurationInDays(): number {
    const start = new Date(this.startDate);
    const end = this.endDate ? new Date(this.endDate) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  isMethodology(): boolean {
    return this.type === ProjectType.METHODOLOGY;
  }

  isAudit(): boolean {
    return this.type === ProjectType.AUDIT;
  }

  isCompliance(): boolean {
    return this.type === ProjectType.COMPLIANCE;
  }
}