import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

import { Role } from './role.entity';
import { Project } from './project.entity';
import { Document } from './document.entity';
import { Audit } from './audit.entity';
import { Communication } from './communication.entity';
import { Notification } from './notification.entity';
import { AuditLog } from './audit-log.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  // Relations
  @OneToMany(() => Project, (project) => project.owner)
  ownedProjects: Project[];

  @OneToMany(() => Document, (document) => document.uploadedBy)
  uploadedDocuments: Document[];

  @OneToMany(() => Audit, (audit) => audit.leadAuditor)
  leadAudits: Audit[];

  @OneToMany(() => Audit, (audit) => audit.auditTeam, { nullable: true })
  auditTeamMemberships: Audit[];

  @OneToMany(() => Communication, (communication) => communication.createdBy)
  communications: Communication[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  hasRole(roleName: string): boolean {
    return this.roles.some(role => role.name === roleName);
  }

  hasPermission(permission: string): boolean {
    return this.roles.some(role => 
      role.permissions.includes(permission as any)
    );
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }
}