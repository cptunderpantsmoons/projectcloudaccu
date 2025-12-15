import { Module } from '@nestjs/common';
import { CalendarWorkflows } from './calendar-workflows';

@Module({
  providers: [CalendarWorkflows],
  exports: [CalendarWorkflows],
})
export class CalendarWorkflowsModule {}