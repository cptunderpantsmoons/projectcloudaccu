import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { join } from 'path';

import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { CalendarEvent } from '../entities/calendar-event.entity';
import { AccuApplication } from '../entities/accu-application.entity';
import { AccuInventoryItem } from '../entities/accu-inventory-item.entity';
import { Audit } from '../entities/audit.entity';
import { AuditFinding } from '../entities/audit-finding.entity';
import { Communication } from '../entities/communication.entity';
import { Notification } from '../entities/notification.entity';
import { FileUpload } from '../entities/file-upload.entity';
import { AuditLog } from '../entities/audit-log.entity';

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sslEnabled = process.env.DATABASE_SSL === 'true';

const baseOptions = {
  type: 'postgres' as const,
  entities: [
    User,
    Role,
    Project,
    Document,
    CalendarEvent,
    AccuApplication,
    AccuInventoryItem,
    Audit,
    AuditFinding,
    Communication,
    Notification,
    FileUpload,
    AuditLog,
  ],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  migrationsTableName: 'migrations',
  migrationsRun: process.env.DATABASE_MIGRATIONS_RUN !== 'false',
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' || process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV !== 'production',
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = process.env.DATABASE_URL
  ? new DataSource({
      ...baseOptions,
      url: process.env.DATABASE_URL,
    })
  : new DataSource({
      ...baseOptions,
      host: process.env.DATABASE_HOST,
      port: toNumber(process.env.DATABASE_PORT, 5432),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

export default AppDataSource;
