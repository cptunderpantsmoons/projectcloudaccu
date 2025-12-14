import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';

import { DocumentsService } from './documents.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../entities/role.entity';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  DocumentUploadDto,
  DocumentUpdateDto,
  DocumentQueryDto,
  DocumentResponseDto,
  DocumentsPaginatedResponseDto,
  DocumentVersionUploadDto,
  DocumentVersionDto,
  DocumentAuditDto,
  BulkDocumentOperationDto,
} from './dto/document.dto';
import { DocumentStatus, DocumentCategory } from '../../entities/document.entity';

@ApiTags('documents')
@Controller('documents')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document upload data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file',
        },
        name: {
          type: 'string',
          description: 'Document name/title',
          example: 'Quarterly Audit Report',
        },
        description: {
          type: 'string',
          description: 'Document description',
          example: 'Detailed analysis of Q4 compliance requirements',
        },
        category: {
          type: 'string',
          enum: Object.values(DocumentCategory),
          example: DocumentCategory.AUDIT_REPORT,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['audit', 'compliance', 'Q4'],
        },
        projectId: {
          type: 'string',
          format: 'uuid',
          description: 'Associated project ID',
        },
        metadata: {
          type: 'object',
          description: 'Document metadata',
        },
        status: {
          type: 'string',
          enum: Object.values(DocumentStatus),
          example: DocumentStatus.DRAFT,
        },
      },
      required: ['file', 'category'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or data' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 415, description: 'Unsupported file type' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: DocumentUploadDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.uploadDocument(
      { ...uploadDto, file },
      req.user.id,
    );
  }

  @Get()
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get all documents with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: DocumentsPaginatedResponseDto,
  })
  async findAll(@Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(query);
  }

  @Get('search/tags')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Search documents by tags' })
  @ApiQuery({ name: 'tags', description: 'Tags to search for', isArray: true })
  @ApiResponse({
    status: 200,
    description: 'Documents found',
    type: [Object],
  })
  async searchByTags(@Query('tags') tags: string[]) {
    if (!tags || tags.length === 0) {
      throw new BadRequestException('At least one tag is required');
    }
    return this.documentsService.searchByTags(tags);
  }

  @Get('stats')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get document statistics' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Tenant ID for filtering' })
  @ApiResponse({
    status: 200,
    description: 'Document statistics retrieved successfully',
    type: Object,
  })
  async getDocumentStats(@Query('tenantId') tenantId?: string) {
    return this.documentsService.getDocumentStats(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiParam({ name: 'id', description: 'Document ID', type: 'string' })
  @ApiBody({ type: DocumentUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: DocumentUpdateDto,
  ) {
    return this.documentsService.update(id, updateDto);
  }

  @Post(':id/versions')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'Upload new version of document' })
  @ApiParam({ name: 'id', description: 'Document ID', type: 'string' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Version upload data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'New version file',
        },
        versionNotes: {
          type: 'string',
          description: 'Version notes/description',
        },
        metadata: {
          type: 'object',
          description: 'Version metadata',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document version uploaded successfully',
    type: DocumentVersionDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() versionDto: DocumentVersionUploadDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.uploadVersion(
      id,
      { ...versionDto, file },
      req.user.id,
    );
  }

  @Get(':id/versions')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get document versions' })
  @ApiParam({ name: 'id', description: 'Document ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Document versions retrieved successfully',
    type: [DocumentVersionDto],
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getVersions(id);
  }

  @Get(':id/download')
  @Roles('admin', 'super_admin', 'manager', 'user')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Download document' })
  @ApiParam({ name: 'id', description: 'Document ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Document downloaded successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename, mimeType } = await this.documentsService.download(id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.DOCUMENTS_DELETE)
  @ApiOperation({ summary: 'Delete document (soft delete)' })
  @ApiParam({ name: 'id', description: 'Document ID', type: 'string' })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.documentsService.remove(id);
  }

  @Get(':id/audit')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.DOCUMENTS_READ)
  @ApiOperation({ summary: 'Get document audit trail' })
  @ApiParam({ name: 'id', description: 'Document ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Document audit trail retrieved successfully',
    type: [DocumentAuditDto],
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getAuditTrail(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getAuditTrail(id);
  }

  @Post('bulk')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'Bulk operations on documents' })
  @ApiBody({ type: BulkDocumentOperationDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number' },
        failed: { type: 'number' },
      },
    },
  })
  async bulkOperation(@Body() operationDto: BulkDocumentOperationDto) {
    return this.documentsService.bulkOperation(operationDto);
  }
}