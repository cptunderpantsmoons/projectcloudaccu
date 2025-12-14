import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';

import { configuration } from './config/configuration';
import { DatabaseConfig } from './config/database.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AccuModule } from './modules/accu/accu.module';
import { AuditsModule } from './modules/audits/audits.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { EmailModule } from './modules/email/email.module';
import { CerModule } from './modules/cer/cer.module';
import { ExternalModule } from './modules/external/external.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('RATE_LIMIT_TTL', 60000),
          limit: configService.get('RATE_LIMIT_MAX', 100),
        },
      ],
      inject: [ConfigService],
    }),

    // File upload
    MulterModule.register({
      dest: './uploads',
    }),

    // Core modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    DocumentsModule,
    CalendarModule,
    AccuModule,
    AuditsModule,
    CommunicationsModule,
    NotificationsModule,
    FileStorageModule,
    EmailModule,
    CerModule,
    ExternalModule,
    SearchModule,
  ],
})
export class AppModule {}