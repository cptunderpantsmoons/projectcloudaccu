import { Module } from '@nestjs/common';
import { AccuApplicationWorkflows } from './accu-application-workflows';

@Module({
  providers: [AccuApplicationWorkflows],
  exports: [AccuApplicationWorkflows],
})
export class AccuApplicationWorkflowsModule {}