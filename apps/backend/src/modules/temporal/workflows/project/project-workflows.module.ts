import { Module } from '@nestjs/common';
import { ProjectWorkflows } from './project-workflows';

@Module({
  providers: [ProjectWorkflows],
  exports: [ProjectWorkflows],
})
export class ProjectWorkflowsModule {}