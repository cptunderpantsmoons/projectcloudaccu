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
import { ProjectsService } from './projects.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../entities/role.entity';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  ProjectCreateDto,
  ProjectUpdateDto,
  ProjectQueryDto,
  ProjectResponseDto,
  ProjectsPaginatedResponseDto,
  ProjectTemplateCreateDto,
  ProjectTemplateUpdateDto,
  ProjectTemplateDto,
  ProjectTemplatesPaginatedResponseDto,
  ProjectStatusUpdateDto,
  CollaboratorAddDto,
  CollaboratorDto,
  ProjectCollaboratorsResponseDto,
  ProjectAnalyticsDto,
} from './dto';
import { ProjectStatus, ProjectType } from '../../entities/project.entity';

@ApiTags('projects')
@Controller('projects')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: ProjectCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid project data' })
  @ApiResponse({ status: 404, description: 'Owner user not found' })
  async create(@Body() createProjectDto: ProjectCreateDto, @Request() req) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_READ)
  @ApiOperation({ summary: 'Get all projects with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: ProjectsPaginatedResponseDto,
  })
  async findAll(@Query() query: ProjectQueryDto) {
    return this.projectsService.findAll(query);
  }

  @Get('stats')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.PROJECTS_READ)
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({
    status: 200,
    description: 'Project statistics retrieved successfully',
    type: Object,
  })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Tenant ID for filtering' })
  async getProjectStats(@Query('tenantId') tenantId?: string) {
    return this.projectsService.getProjectStats(tenantId);
  }

  @Get('templates')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_READ)
  @ApiOperation({ summary: 'Get project templates' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: ProjectTemplatesPaginatedResponseDto,
  })
  @ApiQuery({ name: 'type', required: false, enum: ProjectType, description: 'Filter by project type' })
  @ApiQuery({ name: 'tags', required: false, type: [String], description: 'Filter by tags' })
  async getTemplates(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: ProjectType,
    @Query('tags') tags?: string[],
  ) {
    return this.projectsService.getTemplates({
      page,
      limit,
      type,
      tags: tags ? [tags].flat() : undefined,
    });
  }

  @Post('templates')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Create a new project template' })
  @ApiBody({ type: ProjectTemplateCreateDto })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: ProjectTemplateDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid template data' })
  async createTemplate(@Body() createTemplateDto: ProjectTemplateCreateDto) {
    return this.projectsService.createTemplate(createTemplateDto);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_READ)
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiBody({ type: ProjectUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: ProjectUpdateDto,
  ) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Update project status with workflow validation' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiBody({ type: ProjectStatusUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Project status updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: ProjectStatusUpdateDto,
  ) {
    return this.projectsService.updateStatus(id, statusDto);
  }

  @Get(':id/status')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_READ)
  @ApiOperation({ summary: 'Get project status information' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'active', 'on_hold', 'completed', 'cancelled'] },
        canActivate: { type: 'boolean' },
        canComplete: { type: 'boolean' },
        canCancel: { type: 'boolean' },
        allowedTransitions: {
          type: 'array',
          items: { type: 'string', enum: ['draft', 'active', 'on_hold', 'completed', 'cancelled'] },
        },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        isOverdue: { type: 'boolean' },
        daysUntilDeadline: { type: 'number' },
      },
    },
  })
  async getStatus(@Param('id', ParseUUIDPipe) id: string) {
    const project = await this.projectsService.findOne(id);
    const now = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const daysUntilDeadline = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = endDate ? now > endDate : false;

    const allowedTransitions = {
      [ProjectStatus.DRAFT]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.COMPLETED]: [],
      [ProjectStatus.CANCELLED]: [],
    }[project.status];

    return {
      id: project.id,
      status: project.status,
      canActivate: project.status === ProjectStatus.DRAFT,
      canComplete: project.status === ProjectStatus.ACTIVE || project.status === ProjectStatus.ON_HOLD,
      canCancel: project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED,
      allowedTransitions,
      progress: project.status === ProjectStatus.COMPLETED ? 100 : project.status === ProjectStatus.DRAFT ? 0 : 25,
      isOverdue,
      daysUntilDeadline,
    };
  }

  @Get(':id/analytics')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_READ)
  @ApiOperation({ summary: 'Get project analytics and metrics' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project analytics retrieved successfully',
    type: ProjectAnalyticsDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getAnalytics(id);
  }

  @Get(':id/documents')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_READ, Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get project documents' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project documents retrieved successfully',
    type: [Object],
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getProjectDocuments(id);
  }

  @Get(':id/collaborators')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_READ)
  @ApiOperation({ summary: 'Get project collaborators' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project collaborators retrieved successfully',
    type: ProjectCollaboratorsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getCollaborators(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getCollaborators(id);
  }

  @Post(':id/collaborators')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Add collaborator to project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiBody({ type: CollaboratorAddDto })
  @ApiResponse({
    status: 201,
    description: 'Collaborator added successfully',
    type: ProjectCollaboratorsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project or user not found' })
  @ApiResponse({ status: 409, description: 'User is already a collaborator' })
  async addCollaborator(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addCollaboratorDto: CollaboratorAddDto,
  ) {
    return this.projectsService.addCollaborator(id, addCollaboratorDto);
  }

  @Delete(':id/collaborators/:userId')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Remove collaborator from project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({
    status: 200,
    description: 'Collaborator removed successfully',
    type: ProjectCollaboratorsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async removeCollaborator(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projectsService.removeCollaborator(id, userId);
  }

  @Put('templates/:id')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Update project template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiBody({ type: ProjectTemplateUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: ProjectTemplateDto,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: ProjectTemplateUpdateDto,
  ) {
    return this.projectsService.updateTemplate(id, updateTemplateDto);
  }

  @Delete('templates/:id')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.PROJECTS_DELETE)
  @ApiOperation({ summary: 'Delete project template (soft delete)' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string) {
    await this.projectsService.deleteTemplate(id);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.PROJECTS_DELETE)
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.projectsService.remove(id);
  }

  // Convenience endpoints for common operations

  @Patch(':id/activate')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Activate project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project activated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Project cannot be activated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async activateProject(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.updateStatus(id, {
      status: ProjectStatus.ACTIVE,
      reason: 'Manual activation',
    });
  }

  @Patch(':id/complete')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Complete project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project completed successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Project cannot be completed' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async completeProject(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.updateStatus(id, {
      status: ProjectStatus.COMPLETED,
      reason: 'Manual completion',
    });
  }

  @Patch(':id/hold')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Put project on hold' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project put on hold successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Project cannot be put on hold' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async holdProject(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.updateStatus(id, {
      status: ProjectStatus.ON_HOLD,
      reason: 'Manual hold',
    });
  }

  @Patch(':id/resume')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Resume project from hold' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project resumed successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Project cannot be resumed' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async resumeProject(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.updateStatus(id, {
      status: ProjectStatus.ACTIVE,
      reason: 'Resumed from hold',
    });
  }
}