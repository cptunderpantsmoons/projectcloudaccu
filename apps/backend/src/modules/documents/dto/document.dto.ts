import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentCategory } from '../../../entities/document.entity';
import { UserRole } from '@accu/shared';

// File upload DTO
export class DocumentUploadDto {
  @ApiProperty({
    description: 'Document file',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: 'Document name/title',
    example: 'Quarterly Audit Report',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Document description',
    required: false,
    example: 'Detailed analysis of Q4 compliance requirements',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Document category',
    enum: DocumentCategory,
    example: DocumentCategory.AUDIT_REPORT,
  })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;

  @ApiProperty({
    description: 'Document tags',
    required: false,
    example: ['audit', 'compliance', 'Q4'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Associated project ID',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Document metadata',
    required: false,
    example: { department: 'Compliance', confidentiality: 'internal' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Document status',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}

// Document update DTO
export class DocumentUpdateDto {
  @ApiProperty({
    description: 'Document name/title',
    required: false,
    example: 'Updated Quarterly Audit Report',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Document description',
    required: false,
    example: 'Updated detailed analysis with new compliance requirements',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Document category',
    enum: DocumentCategory,
    required: false,
  })
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @ApiProperty({
    description: 'Document tags',
    required: false,
    example: ['audit', 'compliance', 'Q4', 'updated'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Associated project ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Document metadata',
    required: false,
    example: { department: 'Compliance', confidentiality: 'internal', version: '1.2' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Document status',
    enum: DocumentStatus,
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}

// Document query DTO for filtering/search
export class DocumentQueryDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: 'Search term for name or description',
    required: false,
    example: 'audit report',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filter by document status',
    enum: DocumentStatus,
    required: false,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiProperty({
    description: 'Filter by document category',
    enum: DocumentCategory,
    required: false,
  })
  @IsEnum(DocumentCategory)
  @IsOptional()
  category?: DocumentCategory;

  @ApiProperty({
    description: 'Filter by project ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({
    description: 'Filter by uploaded by user ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  uploadedById?: string;

  @ApiProperty({
    description: 'Filter by tags',
    required: false,
    example: ['audit', 'compliance'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Filter by tenant ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({
    description: 'Sort field',
    required: false,
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// Version upload DTO
export class DocumentVersionUploadDto {
  @ApiProperty({
    description: 'New version file',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: 'Version notes/description',
    required: false,
    example: 'Updated compliance section with new regulations',
  })
  @IsString()
  @IsOptional()
  versionNotes?: string;

  @ApiProperty({
    description: 'Version metadata',
    required: false,
    example: { changes: 'Updated compliance requirements', reviewedBy: 'John Doe' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

// Document response DTO
export class DocumentResponseDto {
  @ApiProperty({
    description: 'Document ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Document name/title',
    example: 'Quarterly Audit Report',
  })
  name: string;

  @ApiProperty({
    description: 'Document description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Document category',
    enum: DocumentCategory,
  })
  category: DocumentCategory;

  @ApiProperty({
    description: 'Document status',
    enum: DocumentStatus,
  })
  status: DocumentStatus;

  @ApiProperty({
    description: 'Document version',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'File information',
    type: 'object',
    properties: {
      fileName: { type: 'string' },
      originalFileName: { type: 'string' },
      fileUrl: { type: 'string' },
      fileSize: { type: 'number' },
      mimeType: { type: 'string' },
      checksum: { type: 'string' },
    },
  })
  file: {
    fileName: string;
    originalFileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    checksum?: string;
  };

  @ApiProperty({
    description: 'Document tags',
    required: false,
  })
  tags?: string[];

  @ApiProperty({
    description: 'Document metadata',
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Associated project information',
    required: false,
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
    },
  })
  project?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'User who uploaded the document',
    type: 'object',
    properties: {
      id: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string' },
    },
  })
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Tenant ID',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({
    description: 'Document creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'File size formatted for display',
    example: '2.5 MB',
  })
  formattedFileSize: string;

  @ApiProperty({
    description: 'File extension',
    example: 'pdf',
  })
  fileExtension: string;
}

// Documents paginated response DTO
export class DocumentsPaginatedResponseDto {
  @ApiProperty({
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  data: DocumentResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
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

// Document version DTO
export class DocumentVersionDto {
  @ApiProperty({
    description: 'Version ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Version number',
    example: 1,
  })
  version: number;

  @ApiProperty({
    description: 'Version notes',
    required: false,
  })
  versionNotes?: string;

  @ApiProperty({
    description: 'Version metadata',
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'File information',
    type: 'object',
    properties: {
      fileName: { type: 'string' },
      originalFileName: { type: 'string' },
      fileUrl: { type: 'string' },
      fileSize: { type: 'number' },
      mimeType: { type: 'string' },
    },
  })
  file: {
    fileName: string;
    originalFileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  };

  @ApiProperty({
    description: 'User who created this version',
    type: 'object',
    properties: {
      id: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string' },
    },
  })
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Version creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'File size formatted for display',
    example: '2.5 MB',
  })
  formattedFileSize: string;
}

// Document audit log DTO
export class DocumentAuditDto {
  @ApiProperty({
    description: 'Audit log ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Action performed',
    example: 'document_downloaded',
  })
  action: string;

  @ApiProperty({
    description: 'User who performed the action',
    type: 'object',
    properties: {
      id: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string' },
    },
  })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Action timestamp',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Additional audit metadata',
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'IP address of the user',
    required: false,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'User agent',
    required: false,
  })
  userAgent?: string;
}

// Bulk operations DTO
export class BulkDocumentOperationDto {
  @ApiProperty({
    description: 'Document IDs to operate on',
    example: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
    isArray: true,
  })
  @IsArray()
  @IsUUID(4, { each: true })
  documentIds: string[];

  @ApiProperty({
    description: 'Operation to perform',
    enum: ['update_status', 'update_category', 'add_tags', 'remove_tags', 'delete'],
    example: 'update_status',
  })
  @IsString()
  operation: 'update_status' | 'update_category' | 'add_tags' | 'remove_tags' | 'delete';

  @ApiProperty({
    description: 'Operation parameters',
    required: false,
    example: { status: DocumentStatus.ARCHIVED },
  })
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}