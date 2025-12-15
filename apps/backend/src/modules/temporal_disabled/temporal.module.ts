import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TemporalService } from './temporal.service';
import { TemporalClient } from './temporal.client';
import { TemporalWorker } from './temporal.worker';

// Workflow Modules
import { AccuApplicationWorkflowsModule } from './workflows/accu-application/accu-application-workflows.module';
import { ProjectWorkflowsModule } from './workflows/project/project-workflows.module';
import { DocumentWorkflowsModule } from './workflows/document/document-workflows.module';
import { CalendarWorkflowsModule } from './workflows/calendar/calendar-workflows.module';

// Activity Modules
import { NotificationActivitiesModule } from './activities/notification-activities.module';
import { DatabaseActivitiesModule } from './activities/database-activities.module';
import { EmailActivitiesModule } from './activities/email-activities.module';
import { CalendarActivitiesModule } from './activities/calendar-activities.module';

@Module({
  imports: [
    ConfigModule,
    AccuApplicationWorkflowsModule,
    ProjectWorkflowsModule,
    DocumentWorkflowsModule,
    CalendarWorkflowsModule,
    NotificationActivitiesModule,
    DatabaseActivitiesModule,
    EmailActivitiesModule,
    CalendarActivitiesModule,
  ],
  providers: [
    TemporalService,
    TemporalClient,
    TemporalWorker,
  ],
  exports: [
    TemporalService,
    TemporalClient,
    'TEMPORAL_CLIENT',
    'TEMPORAL_WORKER',
  ],
})
export class TemporalModule {}