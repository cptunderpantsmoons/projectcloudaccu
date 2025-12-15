import { Module } from '@nestjs/common';
import { NotificationActivities } from './notification-activities';

@Module({
  providers: [NotificationActivities],
  exports: [NotificationActivities],
})
export class NotificationActivitiesModule {}