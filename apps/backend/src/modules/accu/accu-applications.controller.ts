import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AccuApplicationsService } from './accu-applications.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../entities/role.entity';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  ACCUApplicationCreateDto,
  ACCUApplicationUpdateDto,
  ACCUApplicationQueryDto,
  ACCUApplicationResponseDto,
  ACCUApplicationsPaginatedResponseDto,
  ACCUApplicationStatusDto,
  ACCUApplicationSubmissionDto,
  ACCUApplicationApprovalDto,
  ACCUApplicationHistoryDto,
  ACCUApplicationDocumentDto,
  ACCUApplicationDeadlineDto,
  ACCUApplicationAnalyticsDto,
  ACCUApplicationDashboardDto,
  ACCUApplicationStatsDto,
} from './dto';
import { ACCUStatus } from '../../entities/accu-application.entity';

@ApiTags('accu-applications')
@Controller('accu/applications')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AccuApplicationsController {
  constructor(private readonly accuApplicationsService: AccuApplicationsService) {}

  @Post()
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Create a new ACCU application' })
  @ApiBody({ type: ACCUApplicationCreateDto })
  @ApiResponse({
    status: 201,
    description: 'ACCU application created successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid application data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Draft application already exists for this project' })
  async create(@Body() createApplicationDto: ACCUApplicationCreateDto, @Request() req) {
    return this.accuApplicationsService.create(createApplicationDto, req.user.id);
  }

  @Get()
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get all ACCU applications with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'ACCU applications retrieved successfully',
    type: ACCUApplicationsPaginatedResponseDto,
  })
  async findAll(@Query() query: ACCUApplicationQueryDto) {
    return this.accuApplicationsService.findAll(query);
  }

  @Get('dashboard')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get ACCU applications dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: ACCUApplicationDashboardDto,
  })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Tenant ID for filtering' })
  async getDashboard(@Query('tenantId') tenantId?: string) {
    return this.accuApplicationsService.getDashboard(tenantId);
  }

  @Get('stats')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get ACCU application statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: ACCUApplicationStatsDto,
  })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Tenant ID for filtering' })
  async getStats(@Query('tenantId') tenantId?: string) {
    return this.accuApplicationsService.getStats(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get ACCU application by ID' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application retrieved successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Update ACCU application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: ACCUApplicationUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Application updated successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid update data or application not in draft status' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateApplicationDto: ACCUApplicationUpdateDto,
  ) {
    return this.accuApplicationsService.update(id, updateApplicationDto);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Update ACCU application status' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: ACCUApplicationStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Application status updated successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: ACCUApplicationStatusDto,
  ) {
    return this.accuApplicationsService.updateStatus(id, statusDto);
  }

  @Post(':id/submit')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Submit ACCU application for review' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: ACCUApplicationSubmissionDto })
  @ApiResponse({
    status: 200,
    description: 'Application submitted successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Application cannot be submitted' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() submissionDto: ACCUApplicationSubmissionDto,
  ) {
    return this.accuApplicationsService.submit(id, submissionDto);
  }

  @Post(':id/approve')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Approve or reject ACCU application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: ACCUApplicationApprovalDto })
  @ApiResponse({
    status: 200,
    description: 'Application decision processed successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Application cannot be approved/rejected' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approvalDto: ACCUApplicationApprovalDto,
  ) {
    return this.accuApplicationsService.approve(id, approvalDto);
  }

  @Post(':id/reject')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Reject ACCU application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Rejection reason' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Application rejected successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Application cannot be rejected' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rejectionDto: { reason: string; notes?: string },
  ) {
    return this.accuApplicationsService.approve(id, {
      approved: false,
      reason: rejectionDto.reason,
      reviewerComments: rejectionDto.notes,
    });
  }

  @Get(':id/history')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get application status history' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Status history retrieved successfully',
    type: [ACCUApplicationHistoryDto],
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.getStatusHistory(id);
  }

  @Get(':id/documents')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ, Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get application documents' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application documents retrieved successfully',
    type: [Object],
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.getApplicationDocuments(id);
  }

  @Post(':id/documents')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE, Permission.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'Add document to ACCU application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: ACCUApplicationDocumentDto })
  @ApiResponse({
    status: 201,
    description: 'Document added to application successfully',
  })
  @ApiResponse({ status: 404, description: 'Application or document not found' })
  @HttpCode(HttpStatus.CREATED)
  async addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() documentDto: ACCUApplicationDocumentDto,
  ) {
    await this.accuApplicationsService.addDocument(id, documentDto);
    return { message: 'Document added to application successfully' };
  }

  @Get(':id/deadlines')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get application deadlines' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application deadlines retrieved successfully',
    type: [ACCUApplicationDeadlineDto],
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getDeadlines(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.getApplicationDeadlines(id);
  }

  @Get(':id/analytics')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get application analytics' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application analytics retrieved successfully',
    type: ACCUApplicationAnalyticsDto,
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.getAnalytics(id);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.ACCU_APPLICATIONS_DELETE)
  @ApiOperation({ summary: 'Delete ACCU application (soft delete)' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 204, description: 'Application deleted successfully' })
  @ApiResponse({ status: 400, description: 'Only draft applications can be deleted' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.accuApplicationsService.remove(id);
  }

  // Convenience endpoints for common workflow operations

  @Patch(':id/activate')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Activate/Submit ACCU application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application submitted successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Application cannot be submitted' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async activateApplication(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.submit(id, {
      submissionNotes: 'Application activated via API',
    });
  }

  @Patch(':id/under-review')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Mark application as under review' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application marked as under review',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async markUnderReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.updateStatus(id, {
      status: ACCUStatus.UNDER_REVIEW,
      reason: 'Application moved to review queue',
      notes: 'Manual status update to under review',
    });
  }

  @Patch(':id/final-approve')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Final approval of ACCU application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        approvedUnits: { type: 'number', description: 'Approved ACCU units' },
        reviewerComments: { type: 'string', description: 'Reviewer comments' },
        nextSteps: { type: 'string', description: 'Next steps' },
      },
      required: ['approvedUnits'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Application approved successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Application cannot be approved' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async finalApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approvalDto: { approvedUnits: number; reviewerComments?: string; nextSteps?: string },
  ) {
    return this.accuApplicationsService.approve(id, {
      approved: true,
      approvedUnits: approvalDto.approvedUnits,
      reviewerComments: approvalDto.reviewerComments,
      nextSteps: approvalDto.nextSteps,
    });
  }

  @Patch(':id/issue')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.ACCU_APPLICATIONS_WRITE)
  @ApiOperation({ summary: 'Issue ACCU units for approved application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'ACCU units issued successfully',
    type: ACCUApplicationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Only approved applications can be issued' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async issueAccuUnits(@Param('id', ParseUUIDPipe) id: string) {
    return this.accuApplicationsService.updateStatus(id, {
      status: ACCUStatus.ISSUED,
      reason: 'ACCU units issued',
      notes: 'Application completed and ACCU units issued',
    });
  }

  @Get(':id/status-info')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.ACCU_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get application status information and allowed transitions' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Status information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'issued'] },
        canSubmit: { type: 'boolean' },
        canApprove: { type: 'boolean' },
        canReject: { type: 'boolean' },
        canIssue: { type: 'boolean' },
        canEdit: { type: 'boolean' },
        canDelete: { type: 'boolean' },
        allowedTransitions: {
          type: 'array',
          items: { type: 'string', enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'issued'] },
        },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        isOverdue: { type: 'boolean' },
        daysInCurrentStatus: { type: 'number' },
      },
    },
  })
  async getStatusInfo(@Param('id', ParseUUIDPipe) id: string) {
    const application = await this.accuApplicationsService.findOne(id);
    
    const allowedTransitions = {
      [ACCUStatus.DRAFT]: [ACCUStatus.SUBMITTED, ACCUStatus.REJECTED],
      [ACCUStatus.SUBMITTED]: [ACCUStatus.UNDER_REVIEW, ACCUStatus.REJECTED],
      [ACCUStatus.UNDER_REVIEW]: [ACCUStatus.APPROVED, ACCUStatus.REJECTED],
      [ACCUStatus.APPROVED]: [ACCUStatus.ISSUED],
      [ACCUStatus.REJECTED]: [],
      [ACCUStatus.ISSUED]: [],
    }[application.status];

    const canSubmit = application.status === ACCUStatus.DRAFT;
    const canApprove = application.status === ACCUStatus.SUBMITTED || application.status === ACCUStatus.UNDER_REVIEW;
    const canReject = application.status === ACCUStatus.SUBMITTED || application.status === ACCUStatus.UNDER_REVIEW;
    const canIssue = application.status === ACCUStatus.APPROVED;
    const canEdit = application.status === ACCUStatus.DRAFT;
    const canDelete = application.status === ACCUStatus.DRAFT;

    // Calculate days in current status
    const statusDate = application.status === ACCUStatus.DRAFT ? application.createdAt :
                      application.status === ACCUStatus.SUBMITTED ? application.submissionDate :
                      application.status === ACCUStatus.UNDER_REVIEW ? application.submissionDate :
                      application.status === ACCUStatus.APPROVED ? application.approvalDate :
                      application.status === ACCUStatus.ISSUED ? application.issuedDate :
                      application.updatedAt;

    const daysInCurrentStatus = statusDate ? Math.floor((Date.now() - new Date(statusDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      id: application.id,
      status: application.status,
      canSubmit,
      canApprove,
      canReject,
      canIssue,
      canEdit,
      canDelete,
      allowedTransitions,
      progress: application.isIssued() ? 100 : application.isApproved() ? 90 : application.isSubmitted() ? 50 : 10,
      isOverdue: false, // Would be calculated based on deadlines
      daysInCurrentStatus,
    };
  }
}