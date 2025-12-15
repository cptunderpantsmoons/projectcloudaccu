import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent } from '../../entities/calendar-event.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarEvent,
      User,
      Project,
    ]),
    NotificationsModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}