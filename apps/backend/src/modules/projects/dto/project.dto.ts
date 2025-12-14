import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsObject,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, ProjectType } from '../../../entities/project.entity';

export class MethodologyDto {
  @ApiProperty({ description: 'Methodology ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Methodology name', example: 'ISO 14064-2' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Methodology version', example: '2.0' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version: string;

  @ApiProperty({ description: 'Methodology URL', example: 'https://example.com/methodology' })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Methodology requirements', type: 'object' })
  @IsObject()
  @IsOptional()
  requirements?: Record<string, any>;
}

export class ProjectTemplateDto {
  @ApiProperty({ description: 'Template ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Template name', example: 'Standard Carbon Audit' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Template description', example: 'Standard template for carbon footprint audits' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProjectType, description: 'Project type this template is for' })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiProperty({ description: 'Template methodology', type: MethodologyDto })
  @ValidateNested()
  @Type(() => MethodologyDto)
  methodology: MethodologyDto;

  @ApiPropertyOptional({ description: 'Default project settings', type: 'object' })
  @IsObject()
  @IsOptional()
  defaultSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Required fields', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredFields?: string[];

  @ApiPropertyOptional({ description: 'Optional fields', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  optionalFields?: string[];

  @ApiPropertyOptional({ description: 'Is template active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Template version', example: '1.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'Template tags', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class CollaboratorDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'User role in project', example: 'contributor' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  role: string;

  @ApiPropertyOptional({ description: 'Permissions', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Can edit project', default: false })
  @IsBoolean()
  @IsOptional()
  canEdit?: boolean;

  @ApiPropertyOptional({ description: 'Can delete project', default: false })
  @IsBoolean()
  @IsOptional()
  canDelete?: boolean;

  @ApiPropertyOptional({ description: 'Can manage collaborators', default: false })
  @IsBoolean()
  @IsOptional()
  canManageCollaborators?: boolean;
}

export class ProjectCreateDto {
  @ApiProperty({ description: 'Project name', example: 'Carbon Footprint Assessment 2024' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Project description', example: 'Comprehensive carbon footprint assessment for company operations' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProjectType, description: 'Project type' })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiProperty({ description: 'Project start date', example: '2024-01-01' })
  @IsDateString()
  startDate: Date;

  @ApiPropertyOptional({ description: 'Project end date', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Project methodology', type: MethodologyDto })
  @ValidateNested()
  @Type(() => MethodologyDto)
  @IsOptional()
  methodology?: MethodologyDto;

  @ApiPropertyOptional({ description: 'Project metadata', type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template ID to use for project creation' })
  @IsString()
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Owner ID (defaults to current user)' })
  @IsString()
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenancy' })
  @IsString()
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Project tags', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class ProjectUpdateDto {
  @ApiPropertyOptional({ description: 'Project name', example: 'Updated Carbon Footprint Assessment' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Project description', example: 'Updated project description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectType, description: 'Project type' })
  @IsEnum(ProjectType)
  @IsOptional()
  type?: ProjectType;

  @ApiPropertyOptional({ description: 'Project start date', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Project end date', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Project methodology', type: MethodologyDto })
  @ValidateNested()
  @Type(() => MethodologyDto)
  @IsOptional()
  methodology?: MethodologyDto;

  @ApiPropertyOptional({ description: 'Project metadata', type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Project tags', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class ProjectStatusUpdateDto {
  @ApiProperty({ enum: ProjectStatus, description: 'New project status' })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Status change notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ProjectQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search term for name/description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filter by status' })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: ProjectType, description: 'Filter by type' })
  @IsEnum(ProjectType)
  @IsOptional()
  type?: ProjectType;

  @ApiPropertyOptional({ description: 'Filter by owner ID' })
  @IsString()
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsString()
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Start date from', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDateFrom?: Date;

  @ApiPropertyOptional({ description: 'Start date to', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  startDateTo?: Date;

  @ApiPropertyOptional({ description: 'End date from', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  endDateFrom?: Date;

  @ApiPropertyOptional({ description: 'End date to', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDateTo?: Date;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ProjectTemplateCreateDto {
  @ApiProperty({ description: 'Template name', example: 'Custom Carbon Audit Template' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProjectType, description: 'Project type this template is for' })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiProperty({ description: 'Template methodology', type: MethodologyDto })
  @ValidateNested()
  @Type(() => MethodologyDto)
  methodology: MethodologyDto;

  @ApiPropertyOptional({ description: 'Default project settings', type: 'object' })
  @IsObject()
  @IsOptional()
  defaultSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Required fields', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredFields?: string[];

  @ApiPropertyOptional({ description: 'Optional fields', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  optionalFields?: string[];

  @ApiPropertyOptional({ description: 'Template version', example: '1.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'Template tags', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class ProjectTemplateUpdateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectType, description: 'Project type this template is for' })
  @IsEnum(ProjectType)
  @IsOptional()
  type?: ProjectType;

  @ApiPropertyOptional({ description: 'Template methodology', type: MethodologyDto })
  @ValidateNested()
  @Type(() => MethodologyDto)
  @IsOptional()
  methodology?: MethodologyDto;

  @ApiPropertyOptional({ description: 'Default project settings', type: 'object' })
  @IsObject()
  @IsOptional()
  defaultSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Required fields', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredFields?: string[];

  @ApiPropertyOptional({ description: 'Optional fields', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  optionalFields?: string[];

  @ApiPropertyOptional({ description: 'Is template active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Template version', example: '1.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'Template tags', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class CollaboratorAddDto {
  @ApiProperty({ description: 'Collaborator information', type: CollaboratorDto })
  @ValidateNested()
  @Type(() => CollaboratorDto)
  collaborator: CollaboratorDto;
}

export class ProjectAnalyticsDto {
  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Project status' })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiProperty({ description: 'Project type' })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiProperty({ description: 'Project duration in days' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Project progress percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: 'Number of documents' })
  @IsNumber()
  documentsCount: number;

  @ApiProperty({ description: 'Number of collaborators' })
  @IsNumber()
  collaboratorsCount: number;

  @ApiProperty({ description: 'Number of milestones' })
  @IsNumber()
  milestonesCount: number;

  @ApiProperty({ description: 'Number of completed milestones' })
  @IsNumber()
  completedMilestonesCount: number;

  @ApiProperty({ description: 'Days until deadline' })
  @IsNumber()
  daysUntilDeadline: number;

  @ApiProperty({ description: 'Is overdue', default: false })
  @IsBoolean()
  isOverdue: boolean;

  @ApiProperty({ description: 'Owner information' })
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({ description: 'Created date' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  @IsDateString()
  updatedAt: Date;
}

export class ProjectResponseDto {
  @ApiProperty({ description: 'Project ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProjectStatus, description: 'Project status' })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiProperty({ enum: ProjectType, description: 'Project type' })
  @IsEnum(ProjectType)
  type: ProjectType;

  @ApiProperty({ description: 'Project start date' })
  @IsDateString()
  startDate: Date;

  @ApiPropertyOptional({ description: 'Project end date' })
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Project methodology', type: MethodologyDto })
  @ValidateNested()
  @Type(() => MethodologyDto)
  @IsOptional()
  methodology?: MethodologyDto;

  @ApiPropertyOptional({ description: 'Project metadata', type: 'object' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Owner information' })
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenancy' })
  @IsString()
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Project tags', type: 'array', items: { type: 'string' } })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ description: 'Created date' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  @IsDateString()
  updatedAt: Date;

  // Computed fields
  @ApiProperty({ description: 'Project duration in days' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Is project active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Is project completed' })
  @IsBoolean()
  isCompleted: boolean;

  @ApiProperty({ description: 'Is project on hold' })
  @IsBoolean()
  isOnHold: boolean;

  @ApiProperty({ description: 'Is project in draft' })
  @IsBoolean()
  isDraft: boolean;
}

export class ProjectsPaginatedResponseDto {
  @ApiProperty({ description: 'Array of projects', type: [ProjectResponseDto] })
  data: ProjectResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
      hasNext: { type: 'boolean' },
      hasPrev: { type: 'boolean' },
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ProjectTemplatesPaginatedResponseDto {
  @ApiProperty({ description: 'Array of project templates', type: [ProjectTemplateDto] })
  data: ProjectTemplateDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
      hasNext: { type: 'boolean' },
      hasPrev: { type: 'boolean' },
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ProjectCollaboratorsResponseDto {
  @ApiProperty({ description: 'Array of collaborators', type: [CollaboratorDto] })
  data: CollaboratorDto[];

  @ApiProperty({ description: 'Total number of collaborators' })
  @IsNumber()
  total: number;
}

// Export all DTOs for easy importing
export const ProjectDtos = {
  MethodologyDto,
  ProjectTemplateDto,
  CollaboratorDto,
  ProjectCreateDto,
  ProjectUpdateDto,
  ProjectStatusUpdateDto,
  ProjectQueryDto,
  ProjectTemplateCreateDto,
  ProjectTemplateUpdateDto,
  CollaboratorAddDto,
  ProjectAnalyticsDto,
  ProjectResponseDto,
  ProjectsPaginatedResponseDto,
  ProjectTemplatesPaginatedResponseDto,
  ProjectCollaboratorsResponseDto,
};