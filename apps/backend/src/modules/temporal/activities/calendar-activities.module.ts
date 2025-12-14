import { Module } from '@nestjs/common';
import { CalendarActivities } from './calendar-activities';

@Module({
  providers: [CalendarActivities],
  exports: [CalendarActivities],
})
export class CalendarActivitiesModule {}