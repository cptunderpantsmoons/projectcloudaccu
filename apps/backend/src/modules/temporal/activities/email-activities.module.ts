import { Module } from '@nestjs/common';
import { EmailActivities } from './email-activities';

@Module({
  providers: [EmailActivities],
  exports: [EmailActivities],
})
export class EmailActivitiesModule {}