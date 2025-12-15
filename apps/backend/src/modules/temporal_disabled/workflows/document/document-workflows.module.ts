import { Module } from '@nestjs/common';
import { DocumentWorkflows } from './document-workflows';

@Module({
  providers: [DocumentWorkflows],
  exports: [DocumentWorkflows],
})
export class DocumentWorkflowsModule {}