import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccuApplication } from '../../entities/accu-application.entity';
import { Project } from '../../entities/project.entity';
import { Document } from '../../entities/document.entity';
import { CalendarEvent } from '../../entities/calendar-event.entity';
import { User } from '../../entities/user.entity';
import { Notification } from '../../entities/notification.entity';
import { AccuApplicationsService } from './accu-applications.service';
import { AccuApplicationsController } from './accu-applications.controller';
import { AccuNotificationService } from './accu-notification.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccuApplication,
      Project,
      Document,
      CalendarEvent,
      User,
      Notification,
    ]),
    AuthModule,
  ],
  providers: [AccuApplicationsService, AccuNotificationService],
  controllers: [AccuApplicationsController],
  exports: [AccuApplicationsService, AccuNotificationService],
})
export class AccuModule {}
