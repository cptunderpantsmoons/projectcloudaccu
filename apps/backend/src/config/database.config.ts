import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
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

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const sslEnabled = this.configService.get<boolean>('database.ssl');

    const baseConfig: Partial<TypeOrmModuleOptions> = {
      type: 'postgres',
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
      migrations: [join(__dirname, '../database/migrations/*.{ts,js}')],
      migrationsRun: this.configService.get<boolean>('database.runMigrations'),
      synchronize: this.configService.get<boolean>('database.synchronize'),
      logging: this.configService.get<boolean>('database.logging'),
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
      extra: {
        connectionLimit: 10,
      },
    };

    const url = this.configService.get<string>('database.url');
    if (url) {
      return {
        ...baseConfig,
        url,
      } as TypeOrmModuleOptions;
    }

    return {
      ...baseConfig,
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.database'),
    } as TypeOrmModuleOptions;
  }
}
