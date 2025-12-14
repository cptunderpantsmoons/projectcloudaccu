import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ACCUStatus } from '../../../entities/accu-application.entity';

export class ACCUApplicationDataDto {
  @ApiPropertyOptional({ description: 'Project description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Project location details' })
  @IsObject()
  @IsOptional()
  location?: {
    address: string;
    coordinates: { lat: number; lng: number };
    jurisdiction: string;
  };

  @ApiPropertyOptional({ description: 'Baseline emissions data' })
  @IsObject()
  @IsOptional()
  baseline?: {
    period: { start: Date; end: Date };
    methodology: string;
    data: Record<string, any>;
  };

  @ApiPropertyOptional({ description: 'Project activities' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  activities?: string[];

  @ApiPropertyOptional({ description: 'Additional project details' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ACCUApplicationCreateDto {
  @ApiProperty({ description: 'Project ID that this application belongs to', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Number of ACCU units', example: 1000 })
  @IsNumber()
  @Min(0)
  accuUnits: number;

  @ApiProperty({ description: 'Methodology ID', example: 'methodology-123' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  methodologyId: string;

  @ApiPropertyOptional({ description: 'SER reference number' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  serReference?: string;

  @ApiProperty({ description: 'Application data', type: ACCUApplicationDataDto })
  @ValidateNested()
  @Type(() => ACCUApplicationDataDto)
  applicationData: ACCUApplicationDataDto;

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenancy' })
  @IsUUID()
  @IsOptional()
  tenantId?: string;
}

export class ACCUApplicationUpdateDto {
  @ApiPropertyOptional({ description: 'Number of ACCU units' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  accuUnits?: number;

  @ApiPropertyOptional({ description: 'Methodology ID' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  methodologyId?: string;

  @ApiPropertyOptional({ description: 'SER reference number' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  serReference?: string;

  @ApiPropertyOptional({ description: 'Application data', type: ACCUApplicationDataDto })
  @ValidateNested()
  @Type(() => ACCUApplicationDataDto)
  @IsOptional()
  applicationData?: ACCUApplicationDataDto;

  @ApiPropertyOptional({ description: 'Application metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ACCUApplicationStatusDto {
  @ApiProperty({ enum: ACCUStatus, description: 'New application status' })
  @IsEnum(ACCUStatus)
  status: ACCUStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes for status change' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}

export class ACCUApplicationSubmissionDto {
  @ApiPropertyOptional({ description: 'Submission notes' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  submissionNotes?: string;

  @ApiPropertyOptional({ description: 'Contact person for submission' })
  @IsObject()
  @IsOptional()
  contactPerson?: {
    name: string;
    email: string;
    phone: string;
    position: string;
  };

  @ApiPropertyOptional({ description: 'Submission deadline' })
  @IsDateString()
  @IsOptional()
  deadline?: Date;
}

export class ACCUApplicationApprovalDto {
  @ApiProperty({ description: 'Approval decision' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Approval/rejection reason' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Approved ACCU units (if approved)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  approvedUnits?: number;

  @ApiPropertyOptional({ description: 'Reviewer comments' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  reviewerComments?: string;

  @ApiPropertyOptional({ description: 'Next steps or requirements' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  nextSteps?: string;
}

export class ACCUApplicationQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term for project name/description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ACCUStatus, description: 'Filter by status' })
  @IsEnum(ACCUStatus)
  @IsOptional()
  status?: ACCUStatus;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by methodology ID' })
  @IsString()
  @IsOptional()
  methodologyId?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Submission date from', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  submissionDateFrom?: Date;

  @ApiPropertyOptional({ description: 'Submission date to', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  submissionDateTo?: Date;

  @ApiPropertyOptional({ description: 'Approval date from', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  approvalDateFrom?: Date;

  @ApiPropertyOptional({ description: 'Approval date to', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  approvalDateTo?: Date;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ACCUApplicationHistoryDto {
  @ApiProperty({ description: 'History entry ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Previous status' })
  @IsEnum(ACCUStatus)
  fromStatus: ACCUStatus;

  @ApiProperty({ description: 'New status' })
  @IsEnum(ACCUStatus)
  toStatus: ACCUStatus;

  @ApiProperty({ description: 'Reason for change' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Additional notes' })
  @IsString()
  notes: string;

  @ApiProperty({ description: 'User who made the change' })
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({ description: 'When the change occurred' })
  @IsDateString()
  changedAt: Date;
}

export class ACCUApplicationDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsUUID()
  documentId: string;

  @ApiPropertyOptional({ description: 'Document category for ACCU application' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Document role in application' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Document requirement level' })
  @IsString()
  @IsOptional()
  requirementLevel?: 'required' | 'optional' | 'conditional';
}

export class ACCUApplicationDeadlineDto {
  @ApiProperty({ description: 'Deadline ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Deadline title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Deadline description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Due date' })
  @IsDateString()
  dueDate: Date;

  @ApiProperty({ description: 'Priority level' })
  @IsString()
  priority: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Is completed' })
  @IsBoolean()
  isCompleted: boolean;

  @ApiProperty({ description: 'Assigned to user' })
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class ACCUApplicationAnalyticsDto {
  @ApiProperty({ description: 'Application ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Project name' })
  @IsString()
  projectName: string;

  @ApiProperty({ description: 'Current status' })
  @IsEnum(ACCUStatus)
  status: ACCUStatus;

  @ApiProperty({ description: 'Application progress percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: 'Days until next deadline' })
  @IsNumber()
  daysUntilNextDeadline: number;

  @ApiProperty({ description: 'Is overdue' })
  @IsBoolean()
  isOverdue: boolean;

  @ApiProperty({ description: 'Document completion percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  documentCompletion: number;

  @ApiProperty({ description: 'Required documents count' })
  @IsNumber()
  requiredDocumentsCount: number;

  @ApiProperty({ description: 'Submitted documents count' })
  @IsNumber()
  submittedDocumentsCount: number;

  @ApiProperty({ description: 'Application age in days' })
  @IsNumber()
  applicationAgeInDays: number;

  @ApiProperty({ description: 'Estimated processing time remaining' })
  @IsNumber()
  estimatedDaysRemaining: number;
}

export class ACCUApplicationDashboardDto {
  @ApiProperty({ description: 'Total applications count' })
  @IsNumber()
  totalApplications: number;

  @ApiProperty({ description: 'Applications by status' })
  @IsObject()
  applicationsByStatus: Record<ACCUStatus, number>;

  @ApiProperty({ description: 'Average processing time in days' })
  @IsNumber()
  averageProcessingTime: number;

  @ApiProperty({ description: 'Success rate percentage' })
  @IsNumber()
  successRate: number;

  @ApiProperty({ description: 'Pending applications count' })
  @IsNumber()
  pendingApplications: number;

  @ApiProperty({ description: 'Overdue applications count' })
  @IsNumber()
  overdueApplications: number;

  @ApiProperty({ description: 'Recent applications', type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  recentApplications: ACCUApplicationAnalyticsDto[];

  @ApiProperty({ description: 'Upcoming deadlines', type: [ACCUApplicationDeadlineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  upcomingDeadlines: ACCUApplicationDeadlineDto[];
}

export class ACCUApplicationResponseDto {
  @ApiProperty({ description: 'Application ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ enum: ACCUStatus, description: 'Application status' })
  @IsEnum(ACCUStatus)
  status: ACCUStatus;

  @ApiPropertyOptional({ description: 'Submission date' })
  @IsDateString()
  submissionDate?: Date;

  @ApiPropertyOptional({ description: 'Approval date' })
  @IsDateString()
  approvalDate?: Date;

  @ApiPropertyOptional({ description: 'Issued date' })
  @IsDateString()
  issuedDate?: Date;

  @ApiProperty({ description: 'Number of ACCU units' })
  @IsNumber()
  accuUnits: number;

  @ApiProperty({ description: 'Methodology ID' })
  @IsString()
  methodologyId: string;

  @ApiPropertyOptional({ description: 'SER reference number' })
  @IsString()
  serReference?: string;

  @ApiProperty({ description: 'Application data', type: ACCUApplicationDataDto })
  @IsObject()
  applicationData: ACCUApplicationDataDto;

  @ApiPropertyOptional({ description: 'Application metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Project information' })
  project: {
    id: string;
    name: string;
    type: string;
    status: string;
  };

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenancy' })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({ description: 'Created date' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  @IsDateString()
  updatedAt: Date;

  // Computed fields
  @ApiProperty({ description: 'Is application in draft status' })
  @IsBoolean()
  isDraft: boolean;

  @ApiProperty({ description: 'Is application submitted' })
  @IsBoolean()
  isSubmitted: boolean;

  @ApiProperty({ description: 'Is application approved' })
  @IsBoolean()
  isApproved: boolean;

  @ApiProperty({ description: 'Is application issued' })
  @IsBoolean()
  isIssued: boolean;

  @ApiProperty({ description: 'Application age in days' })
  @IsNumber()
  ageInDays: number;

  @ApiPropertyOptional({ description: 'Status history' })
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  statusHistory?: ACCUApplicationHistoryDto[];
}

export class ACCUApplicationsPaginatedResponseDto {
  @ApiProperty({ description: 'Array of ACCU applications', type: [ACCUApplicationResponseDto] })
  data: ACCUApplicationResponseDto[];

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

export class ACCUApplicationStatsDto {
  @ApiProperty({ description: 'Total applications count' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Applications by status' })
  @IsObject()
  byStatus: Record<ACCUStatus, number>;

  @ApiProperty({ description: 'Applications by methodology' })
  @IsObject()
  byMethodology: Record<string, number>;

  @ApiProperty({ description: 'Average ACCU units per application' })
  @IsNumber()
  averageAccuUnits: number;

  @ApiProperty({ description: 'Total ACCU units across all applications' })
  @IsNumber()
  totalAccuUnits: number;

  @ApiProperty({ description: 'Average processing time in days' })
  @IsNumber()
  averageProcessingTime: number;

  @ApiProperty({ description: 'Success rate percentage' })
  @IsNumber()
  successRate: number;

  @ApiProperty({ description: 'Pending applications count' })
  @IsNumber()
  pending: number;

  @ApiProperty({ description: 'Overdue applications count' })
  @IsNumber()
  overdue: number;
}

// Export all DTOs for easy importing
export const ACCUApplicationDtos = {
  ACCUApplicationDataDto,
  ACCUApplicationCreateDto,
  ACCUApplicationUpdateDto,
  ACCUApplicationStatusDto,
  ACCUApplicationSubmissionDto,
  ACCUApplicationApprovalDto,
  ACCUApplicationQueryDto,
  ACCUApplicationHistoryDto,
  ACCUApplicationDocumentDto,
  ACCUApplicationDeadlineDto,
  ACCUApplicationAnalyticsDto,
  ACCUApplicationDashboardDto,
  ACCUApplicationResponseDto,
  ACCUApplicationsPaginatedResponseDto,
  ACCUApplicationStatsDto,
};