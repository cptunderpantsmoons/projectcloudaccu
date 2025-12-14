import { Module } from '@nestjs/common';
import { DatabaseActivities } from './database-activities';

@Module({
  providers: [DatabaseActivities],
  exports: [DatabaseActivities],
})
export class DatabaseActivitiesModule {}