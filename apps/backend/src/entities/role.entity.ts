import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum Permission {
  // User management
  USERS_READ = 'users.read',
  USERS_WRITE = 'users.write',
  USERS_DELETE = 'users.delete',
  
  // Role management
  ROLES_READ = 'roles.read',
  ROLES_WRITE = 'roles.write',
  ROLES_DELETE = 'roles.delete',
  
  // Project management
  PROJECTS_READ = 'projects.read',
  PROJECTS_WRITE = 'projects.write',
  PROJECTS_DELETE = 'projects.delete',
  
  // Document management
  DOCUMENTS_READ = 'documents.read',
  DOCUMENTS_WRITE = 'documents.write',
  DOCUMENTS_DELETE = 'documents.delete',
  
  // Calendar and events
  CALENDAR_READ = 'calendar.read',
  CALENDAR_WRITE = 'calendar.write',
  CALENDAR_DELETE = 'calendar.delete',
  
  // ACCU management
  ACCU_APPLICATIONS_READ = 'accu_applications.read',
  ACCU_APPLICATIONS_WRITE = 'accu_applications.write',
  ACCU_APPLICATIONS_DELETE = 'accu_applications.delete',
  ACCU_INVENTORY_READ = 'accu_inventory.read',
  ACCU_INVENTORY_WRITE = 'accu_inventory.write',
  ACCU_INVENTORY_DELETE = 'accu_inventory.delete',
  
  // Audit management
  AUDITS_READ = 'audits.read',
  AUDITS_WRITE = 'audits.write',
  AUDITS_DELETE = 'audits.delete',
  
  // Communication
  COMMUNICATIONS_READ = 'communications.read',
  COMMUNICATIONS_WRITE = 'communications.write',
  COMMUNICATIONS_DELETE = 'communications.delete',
  
  // Notifications
  NOTIFICATIONS_READ = 'notifications.read',
  NOTIFICATIONS_WRITE = 'notifications.write',
  NOTIFICATIONS_DELETE = 'notifications.delete',
  
  // System administration
  SETTINGS_READ = 'settings.read',
  SETTINGS_WRITE = 'settings.write',
  SYSTEM_ADMIN = 'system.admin',
  
  // Reports and analytics
  REPORTS_READ = 'reports.read',
  REPORTS_WRITE = 'reports.write',
  
  // File management
  FILES_READ = 'files.read',
  FILES_WRITE = 'files.write',
  FILES_DELETE = 'files.delete',
}

@Entity('roles')
@Index(['name'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: Permission,
    array: true,
    default: [],
  })
  permissions: Permission[];

  @Column({ default: false })
  isSystemRole: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  grantPermission(permission: Permission): void {
    if (!this.hasPermission(permission)) {
      this.permissions.push(permission);
    }
  }

  revokePermission(permission: Permission): void {
    this.permissions = this.permissions.filter(p => p !== permission);
  }
}