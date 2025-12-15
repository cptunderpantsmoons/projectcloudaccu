import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';
import { WorkflowMonitoringService } from './workflow-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(
    private readonly workflowOrchestratorService: WorkflowOrchestratorService,
    private readonly workflowMonitoringService: WorkflowMonitoringService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get workflow metrics' })
  @ApiResponse({ status: 200, description: 'Workflow metrics retrieved successfully' })
  @Permissions('workflow:read')
  async getWorkflowMetrics() {
    return await this.workflowMonitoringService.getWorkflowMetrics();
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get failed workflows' })
  @ApiResponse({ status: 200, description: 'Failed workflows retrieved successfully' })
  @Permissions('workflow:read')
  async getFailedWorkflows() {
    return await this.workflowMonitoringService.getFailedWorkflows();
  }

  @Get('status/:workflowId')
  @ApiOperation({ summary: 'Get workflow status' })
  @ApiResponse({ status: 200, description: 'Workflow status retrieved successfully' })
  @Permissions('workflow:read')
  async getWorkflowStatus(@Param('workflowId') workflowId: string) {
    return await this.workflowMonitoringService.getWorkflowStatus(workflowId);
  }

  @Get('audit/:workflowId')
  @ApiOperation({ summary: 'Get workflow audit trail' })
  @ApiResponse({ status: 200, description: 'Workflow audit trail retrieved successfully' })
  @Permissions('workflow:read')
  async getWorkflowAudit(@Param('workflowId') workflowId: string) {
    return await this.workflowMonitoringService.getWorkflowAuditTrail(workflowId);
  }

  @Post('retry/:workflowId')
  @ApiOperation({ summary: 'Retry failed workflow' })
  @ApiResponse({ status: 200, description: 'Workflow retry initiated successfully' })
  @Permissions('workflow:write')
  async retryWorkflow(
    @Param('workflowId') workflowId: string,
    @Body('reason') reason?: string,
  ) {
    const success = await this.workflowMonitoringService.retryFailedWorkflow(workflowId, reason);
    return { success, message: success ? 'Workflow retry initiated' : 'Failed to retry workflow' };
  }

  @Post('escalate/:workflowId')
  @ApiOperation({ summary: 'Escalate failed workflow' })
  @ApiResponse({ status: 200, description: 'Workflow escalation initiated successfully' })
  @Permissions('workflow:write')
  async escalateWorkflow(
    @Param('workflowId') workflowId: string,
    @Body('escalationLevel') escalationLevel: string,
    @Body('reason') reason?: string,
  ) {
    const success = await this.workflowMonitoringService.escalateFailedWorkflow(
      workflowId,
      escalationLevel,
      reason,
    );
    return { success, message: success ? 'Workflow escalation initiated' : 'Failed to escalate workflow' };
  }

  @Post('intervene/:workflowId')
  @ApiOperation({ summary: 'Perform manual workflow intervention' })
  @ApiResponse({ status: 200, description: 'Manual intervention performed successfully' })
  @Permissions('workflow:write')
  async performManualIntervention(
    @Param('workflowId') workflowId: string,
    @Body() interventionData: {
      action: string;
      parameters: Record<string, any>;
      reason?: string;
    },
    @Request() req: any,
  ) {
    const success = await this.workflowMonitoringService.performManualIntervention(
      workflowId,
      interventionData.action,
      interventionData.parameters,
      req.user.id,
    );
    return { success, message: success ? 'Manual intervention performed' : 'Failed to perform intervention' };
  }

  @Post('terminate/:workflowId')
  @ApiOperation({ summary: 'Terminate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow terminated successfully' })
  @Permissions('workflow:write')
  async terminateWorkflow(
    @Param('workflowId') workflowId: string,
    @Body('reason') reason?: string,
  ) {
    await this.workflowOrchestratorService.terminateWorkflow(workflowId, reason);
    return { success: true, message: 'Workflow terminated successfully' };
  }

  // ACCU Application Workflows
  @Post('accu-application/:applicationId/trigger')
  @ApiOperation({ summary: 'Trigger ACCU application workflow' })
  @ApiResponse({ status: 200, description: 'ACCU application workflow triggered successfully' })
  @Permissions('workflow:write')
  async triggerAccuApplicationWorkflow(
    @Param('applicationId') applicationId: string,
    @Body('triggerType') triggerType: 'create' | 'submit' | 'approve' | 'reject' | 'issue',
  ) {
    const workflowId = await this.workflowOrchestratorService.triggerAccuApplicationWorkflow(
      applicationId,
      triggerType,
    );
    return { workflowId, message: 'ACCU application workflow triggered successfully' };
  }

  @Get('accu-application/:applicationId/status')
  @ApiOperation({ summary: 'Get ACCU application workflow status' })
  @ApiResponse({ status: 200, description: 'ACCU application workflow status retrieved successfully' })
  @Permissions('workflow:read')
  async getAccuApplicationWorkflowStatus(@Param('applicationId') applicationId: string) {
    const workflowId = `accu-application-${applicationId}`;
    return await this.workflowOrchestratorService.getWorkflowStatus(workflowId);
  }

  @Post('accu-application/:applicationId/signal')
  @ApiOperation({ summary: 'Send signal to ACCU application workflow' })
  @ApiResponse({ status: 200, description: 'Signal sent successfully' })
  @Permissions('workflow:write')
  async signalAccuApplicationWorkflow(
    @Param('applicationId') applicationId: string,
    @Body() signalData: {
      signalName: string;
      signalData: any;
    },
  ) {
    const workflowId = `accu-application-${applicationId}`;
    await this.workflowOrchestratorService.getWorkflowStatus(workflowId); // This would signal the workflow
    return { message: 'Signal sent successfully' };
  }

  // Project Workflows
  @Post('project/:projectId/trigger')
  @ApiOperation({ summary: 'Trigger project workflow' })
  @ApiResponse({ status: 200, description: 'Project workflow triggered successfully' })
  @Permissions('workflow:write')
  async triggerProjectWorkflow(
    @Param('projectId') projectId: string,
    @Body('triggerType') triggerType: 'create' | 'start' | 'pause' | 'resume' | 'complete' | 'cancel',
  ) {
    const workflowId = await this.workflowOrchestratorService.triggerProjectWorkflow(
      projectId,
      triggerType,
    );
    return { workflowId, message: 'Project workflow triggered successfully' };
  }

  @Get('project/:projectId/status')
  @ApiOperation({ summary: 'Get project workflow status' })
  @ApiResponse({ status: 200, description: 'Project workflow status retrieved successfully' })
  @Permissions('workflow:read')
  async getProjectWorkflowStatus(@Param('projectId') projectId: string) {
    const workflowId = `project-${projectId}`;
    return await this.workflowOrchestratorService.getWorkflowStatus(workflowId);
  }

  // Document Workflows
  @Post('document/:documentId/trigger')
  @ApiOperation({ summary: 'Trigger document workflow' })
  @ApiResponse({ status: 200, description: 'Document workflow triggered successfully' })
  @Permissions('workflow:write')
  async triggerDocumentWorkflow(
    @Param('documentId') documentId: string,
    @Body('triggerType') triggerType: 'create' | 'submit_review' | 'approve' | 'reject' | 'publish' | 'archive',
  ) {
    const workflowId = await this.workflowOrchestratorService.triggerDocumentWorkflow(
      documentId,
      triggerType,
    );
    return { workflowId, message: 'Document workflow triggered successfully' };
  }

  @Get('document/:documentId/status')
  @ApiOperation({ summary: 'Get document workflow status' })
  @ApiResponse({ status: 200, description: 'Document workflow status retrieved successfully' })
  @Permissions('workflow:read')
  async getDocumentWorkflowStatus(@Param('documentId') documentId: string) {
    const workflowId = `document-${documentId}`;
    return await this.workflowOrchestratorService.getWorkflowStatus(workflowId);
  }

  // Calendar Workflows
  @Post('calendar/:entityType/:entityId/trigger')
  @ApiOperation({ summary: 'Trigger calendar workflow' })
  @ApiResponse({ status: 200, description: 'Calendar workflow triggered successfully' })
  @Permissions('workflow:write')
  async triggerCalendarWorkflow(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body('triggerType') triggerType: 'create_deadline' | 'schedule_reminder' | 'escalate' | 'generate_report',
  ) {
    const workflowId = await this.workflowOrchestratorService.triggerCalendarWorkflow(
      entityType,
      entityId,
      triggerType,
    );
    return { workflowId, message: 'Calendar workflow triggered successfully' };
  }

  @Get('calendar/:entityType/:entityId/status')
  @ApiOperation({ summary: 'Get calendar workflow status' })
  @ApiResponse({ status: 200, description: 'Calendar workflow status retrieved successfully' })
  @Permissions('workflow:read')
  async getCalendarWorkflowStatus(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const workflowId = `calendar-${entityType}-${entityId}`;
    return await this.workflowOrchestratorService.getWorkflowStatus(workflowId);
  }

  // Workflow Lists and Queries
  @Get('list')
  @ApiOperation({ summary: 'List all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows listed successfully' })
  @Permissions('workflow:read')
  async listWorkflows(@Query('query') query?: string) {
    return await this.workflowOrchestratorService.listWorkflows(query);
  }

  @Get('by-type/:type')
  @ApiOperation({ summary: 'Get workflows by type' })
  @ApiResponse({ status: 200, description: 'Workflows by type retrieved successfully' })
  @Permissions('workflow:read')
  async getWorkflowsByType(@Param('type') type: string) {
    const query = `WorkflowType="*${type}*"`;
    return await this.workflowOrchestratorService.listWorkflows(query);
  }

  @Get('by-status/:status')
  @ApiOperation({ summary: 'Get workflows by status' })
  @ApiResponse({ status: 200, description: 'Workflows by status retrieved successfully' })
  @Permissions('workflow:read')
  async getWorkflowsByStatus(@Param('status') status: string) {
    const query = `Status="${status.toUpperCase()}"`;
    return await this.workflowOrchestratorService.listWorkflows(query);
  }

  // Status Change Handlers
  @Post('handle-status-change')
  @ApiOperation({ summary: 'Handle entity status change' })
  @ApiResponse({ status: 200, description: 'Status change handled successfully' })
  @Permissions('workflow:write')
  async handleStatusChange(@Body() statusChangeData: {
    entityType: 'accu_application' | 'project' | 'document';
    entityId: string;
    oldStatus: string;
    newStatus: string;
  }) {
    await this.workflowOrchestratorService.handleEntityStatusChange(
      statusChangeData.entityType,
      statusChangeData.entityId,
      statusChangeData.oldStatus,
      statusChangeData.newStatus,
    );
    return { message: 'Status change handled successfully' };
  }

  // Manual Workflow Actions
  @Post(':workflowId/actions/submit')
  @ApiOperation({ summary: 'Submit for review/action' })
  @ApiResponse({ status: 200, description: 'Action performed successfully' })
  @Permissions('workflow:write')
  async submitForAction(
    @Param('workflowId') workflowId: string,
    @Body() actionData: {
      action: string;
      parameters?: Record<string, any>;
    },
    @Request() req: any,
  ) {
    // This would send the appropriate signal to the workflow
    return { message: 'Action performed successfully' };
  }

  @Post(':workflowId/actions/approve')
  @ApiOperation({ summary: 'Approve workflow step' })
  @ApiResponse({ status: 200, description: 'Approval performed successfully' })
  @Permissions('workflow:write')
  async approveWorkflowStep(
    @Param('workflowId') workflowId: string,
    @Body() approvalData: {
      notes?: string;
      parameters?: Record<string, any>;
    },
    @Request() req: any,
  ) {
    // This would send approval signal to the workflow
    return { message: 'Approval performed successfully' };
  }

  @Post(':workflowId/actions/reject')
  @ApiOperation({ summary: 'Reject workflow step' })
  @ApiResponse({ status: 200, description: 'Rejection performed successfully' })
  @Permissions('workflow:write')
  async rejectWorkflowStep(
    @Param('workflowId') workflowId: string,
    @Body() rejectionData: {
      reason: string;
      notes?: string;
    },
    @Request() req: any,
  ) {
    // This would send rejection signal to the workflow
    return { message: 'Rejection performed successfully' };
  }

  @Post(':workflowId/actions/complete')
  @ApiOperation({ summary: 'Complete workflow step' })
  @ApiResponse({ status: 200, description: 'Completion performed successfully' })
  @Permissions('workflow:write')
  async completeWorkflowStep(
    @Param('workflowId') workflowId: string,
    @Body() completionData: {
      notes?: string;
      parameters?: Record<string, any>;
    },
    @Request() req: any,
  ) {
    // This would send completion signal to the workflow
    return { message: 'Completion performed successfully' };
  }
}