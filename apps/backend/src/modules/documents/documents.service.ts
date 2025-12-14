import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Document, DocumentStatus, DocumentCategory } from '../../entities/document.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { FileStorageService } from '../file-storage/file-storage.service';
import { DocumentSecurityService } from './document-security.service';
import {
  DocumentUploadDto,
  DocumentUpdateDto,
  DocumentQueryDto,
  DocumentVersionUploadDto,
  DocumentResponseDto,
  DocumentsPaginatedResponseDto,
  DocumentVersionDto,
  DocumentAuditDto,
  BulkDocumentOperationDto,
} from './dto/document.dto';

export interface DocumentsListOptions extends DocumentQueryDto {
  tenantId?: string;
  uploadedById?: string;
}

export interface DocumentUploadResult {
  document: DocumentResponseDto;
  fileUploadResult: any;
}

export interface DocumentVersion {
  id: string;
  version: number;
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  versionNotes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly fileStorageService: FileStorageService,
    private readonly securityService: DocumentSecurityService,
  ) {}

  /**
   * Upload a new document
   */
  async uploadDocument(
    uploadDto: DocumentUploadDto & { file: Express.Multer.File },
    uploadedById: string,
  ): Promise<DocumentUploadResult> {
    const user = await this.userRepository.findOne({
      where: { id: uploadedById },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate project if provided
    let project: Project | null = null;
    if (uploadDto.projectId) {
      project = await this.projectRepository.findOne({
        where: { id: uploadDto.projectId },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    try {
      // Perform security scan on uploaded file
      const securityScan = await this.securityService.scanFile(uploadDto.file);
      if (!securityScan.isSafe) {
        throw new BadRequestException(`Security scan failed: ${securityScan.threats.join(', ')}`);
      }

      // Extract and validate content
      const contentValidation = await this.securityService.extractAndValidateContent(uploadDto.file);
      if (!contentValidation.isValid) {
        throw new BadRequestException(`Content validation failed: ${contentValidation.errors.join(', ')}`);
      }

      // Calculate file hashes for integrity
      const fileHashes = this.securityService.calculateFileHash(uploadDto.file.buffer);
      
      // Upload file using file storage service
      const fileUploadResult = await this.fileStorageService.uploadFile(
        uploadDto.file,
        uploadedById,
        {
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'text/csv',
            'application/json',
            'application/xml',
            'application/zip',
          ],
          maxFileSize: 50 * 1024 * 1024, // 50MB
        },
      );

      // Create enhanced metadata with security information
      const enhancedMetadata = {
        ...uploadDto.metadata,
        security: {
          scanResults: securityScan,
          contentValidation,
          fileHashes,
          scannedAt: new Date().toISOString(),
        },
        extractedText: contentValidation.extractedText ? {
          preview: contentValidation.extractedText.substring(0, 1000),
          wordCount: contentValidation.extractedText.split(/\s+/).length,
          hasContent: contentValidation.extractedText.length > 0,
        } : null,
      };

      // Create document record
      const document = this.documentRepository.create({
        name: uploadDto.name || uploadDto.file.originalname,
        description: uploadDto.description,
        category: uploadDto.category,
        status: uploadDto.status || DocumentStatus.DRAFT,
        version: 1,
        fileName: fileUploadResult.filename,
        originalFileName: fileUploadResult.originalName,
        filePath: fileUploadResult.path,
        fileUrl: fileUploadResult.url,
        mimeType: fileUploadResult.mimeType,
        fileSize: fileUploadResult.size,
        checksum: fileUploadResult.checksum,
        metadata: enhancedMetadata,
        tags: uploadDto.tags || [],
        uploadedById,
        uploadedBy: user,
        projectId: uploadDto.projectId,
        project,
        tenantId: user.tenantId,
      });

      const savedDocument = await this.documentRepository.save(document);

      return {
        document: this.formatDocumentResponse(savedDocument),
        fileUploadResult,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload document');
    }
  }

  /**
   * Get all documents with pagination and filtering
   */
  async findAll(options: DocumentsListOptions): Promise<DocumentsPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category,
      projectId,
      uploadedById,
      tags,
      tenantId,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.uploadedBy', 'user')
      .leftJoinAndSelect('document.project', 'project');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(document.name ILIKE :search OR document.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('document.status = :status', { status });
    }

    if (category) {
      queryBuilder.andWhere('document.category = :category', { category });
    }

    if (projectId) {
      queryBuilder.andWhere('document.projectId = :projectId', { projectId });
    }

    if (uploadedById) {
      queryBuilder.andWhere('document.uploadedById = :uploadedById', { uploadedById });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('document.tags && :tags', { tags });
    }

    if (tenantId) {
      queryBuilder.andWhere('document.tenantId = :tenantId', { tenantId });
    }

    // Apply sorting
    const allowedSortFields = [
      'name',
      'category',
      'status',
      'version',
      'fileSize',
      'createdAt',
      'updatedAt',
    ];

    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`document.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const documents = await queryBuilder.getMany();

    return {
      data: documents.map(this.formatDocumentResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get document by ID
   */
  async findOne(id: string): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['uploadedBy', 'project'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.formatDocumentResponse(document);
  }

  /**
   * Update document metadata
   */
  async update(id: string, updateDto: DocumentUpdateDto): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['uploadedBy', 'project'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate project if provided
    if (updateDto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: updateDto.projectId },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      document.project = project;
    }

    // Update document fields
    Object.assign(document, updateDto);

    const updatedDocument = await this.documentRepository.save(document);
    return this.formatDocumentResponse(updatedDocument);
  }

  /**
   * Upload new version of document
   */
  async uploadVersion(
    id: string,
    versionDto: DocumentVersionUploadDto & { file: Express.Multer.File },
    uploadedById: string,
  ): Promise<DocumentVersionDto> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: uploadedById },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Upload new file version
      const fileUploadResult = await this.fileStorageService.uploadFile(
        versionDto.file,
        uploadedById,
        {
          allowedMimeTypes: [document.mimeType], // Maintain same file type
          maxFileSize: 50 * 1024 * 1024, // 50MB
        },
      );

      // Update document with new version
      const newVersion = document.version + 1;
      document.version = newVersion;
      document.fileName = fileUploadResult.filename;
      document.originalFileName = fileUploadResult.originalName;
      document.filePath = fileUploadResult.path;
      document.fileUrl = fileUploadResult.url;
      document.mimeType = fileUploadResult.mimeType;
      document.fileSize = fileUploadResult.size;
      document.checksum = fileUploadResult.checksum;

      // Update metadata with version info
      const versionMetadata = {
        ...document.metadata,
        lastVersionUpdate: new Date(),
        lastVersionUpdatedBy: uploadedById,
        versionNotes: versionDto.versionNotes,
        versionMetadata: versionDto.metadata,
      };
      document.metadata = versionMetadata;

      await this.documentRepository.save(document);

      return {
        id: document.id,
        version: newVersion,
        versionNotes: versionDto.versionNotes,
        metadata: versionDto.metadata,
        file: {
          fileName: fileUploadResult.filename,
          originalFileName: fileUploadResult.originalName,
          fileUrl: fileUploadResult.url,
          fileSize: fileUploadResult.size,
          mimeType: fileUploadResult.mimeType,
        },
        createdBy: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        createdAt: new Date(),
        formattedFileSize: this.formatFileSize(fileUploadResult.size),
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload document version');
    }
  }

  /**
   * Get document versions
   */
  async getVersions(id: string): Promise<DocumentVersionDto[]> {
    // For now, we'll return the current version as the only version
    // In a real implementation, you'd have a separate document_versions table
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return [{
      id: document.id,
      version: document.version,
      file: {
        fileName: document.fileName,
        originalFileName: document.originalFileName,
        fileUrl: document.fileUrl,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      },
      createdBy: {
        id: document.uploadedBy.id,
        firstName: document.uploadedBy.firstName,
        lastName: document.uploadedBy.lastName,
        email: document.uploadedBy.email,
      },
      createdAt: document.createdAt,
      formattedFileSize: document.formatFileSize(),
    }];
  }

  /**
   * Download document
   */
  async download(id: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get file buffer from storage service
    const file = await this.fileStorageService.getFileBuffer(
      document.filePath.split('/').pop(),
    );

    return {
      buffer: file,
      filename: document.originalFileName,
      mimeType: document.mimeType,
    };
  }

  /**
   * Delete document (soft delete by changing status)
   */
  async remove(id: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Soft delete by changing status to archived
    await this.documentRepository.update(id, {
      status: DocumentStatus.ARCHIVED,
    });
  }

  /**
   * Get document audit trail
   */
  async getAuditTrail(id: string): Promise<DocumentAuditDto[]> {
    // This is a simplified implementation
    // In a real app, you'd have a separate audit_log table
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return [{
      id: `audit-${document.id}`,
      action: 'document_created',
      user: {
        id: document.uploadedBy.id,
        firstName: document.uploadedBy.firstName,
        lastName: document.uploadedBy.lastName,
        email: document.uploadedBy.email,
      },
      timestamp: document.createdAt,
      metadata: {
        documentName: document.name,
        category: document.category,
        version: document.version,
      },
    }];
  }

  /**
   * Bulk operations on documents
   */
  async bulkOperation(operationDto: BulkDocumentOperationDto): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const documentId of operationDto.documentIds) {
      try {
        const document = await this.documentRepository.findOne({
          where: { id: documentId },
        });

        if (!document) {
          failed++;
          continue;
        }

        switch (operationDto.operation) {
          case 'update_status':
            await this.documentRepository.update(documentId, {
              status: operationDto.parameters.status,
            });
            break;
          case 'update_category':
            await this.documentRepository.update(documentId, {
              category: operationDto.parameters.category,
            });
            break;
          case 'add_tags':
            const newTags = [...new Set([...(document.tags || []), ...operationDto.parameters.tags])];
            await this.documentRepository.update(documentId, { tags: newTags });
            break;
          case 'remove_tags':
            const filteredTags = (document.tags || []).filter(
              tag => !operationDto.parameters.tags.includes(tag),
            );
            await this.documentRepository.update(documentId, { tags: filteredTags });
            break;
          case 'delete':
            await this.documentRepository.update(documentId, {
              status: DocumentStatus.ARCHIVED,
            });
            break;
        }
        updated++;
      } catch (error) {
        failed++;
      }
    }

    return { updated, failed };
  }

  /**
   * Search documents by tags
   */
  async searchByTags(tags: string[]): Promise<DocumentResponseDto[]> {
    const documents = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.uploadedBy', 'user')
      .leftJoinAndSelect('document.project', 'project')
      .where('document.tags && :tags', { tags })
      .orderBy('document.updatedAt', 'DESC')
      .getMany();

    return documents.map(this.formatDocumentResponse);
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(tenantId?: string): Promise<{
    total: number;
    byStatus: Record<DocumentStatus, number>;
    byCategory: Record<DocumentCategory, number>;
    totalSize: number;
    averageFileSize: number;
  }> {
    const queryBuilder = this.documentRepository.createQueryBuilder('document');

    if (tenantId) {
      queryBuilder.where('document.tenantId = :tenantId', { tenantId });
    }

    const documents = await queryBuilder.getMany();

    const total = documents.length;
    const byStatus = documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<DocumentStatus, number>);

    const byCategory = documents.reduce((acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    }, {} as Record<DocumentCategory, number>);

    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
    const averageFileSize = total > 0 ? totalSize / total : 0;

    return {
      total,
      byStatus,
      byCategory,
      totalSize,
      averageFileSize,
    };
  }

  /**
   * Format document response
   */
  private formatDocumentResponse(document: Document): DocumentResponseDto {
    return {
      id: document.id,
      name: document.name,
      description: document.description,
      category: document.category,
      status: document.status,
      version: document.version,
      file: {
        fileName: document.fileName,
        originalFileName: document.originalFileName,
        fileUrl: document.fileUrl,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        checksum: document.checksum,
      },
      tags: document.tags,
      metadata: document.metadata,
      project: document.project ? {
        id: document.project.id,
        name: document.project.name,
      } : undefined,
      uploadedBy: {
        id: document.uploadedBy.id,
        firstName: document.uploadedBy.firstName,
        lastName: document.uploadedBy.lastName,
        email: document.uploadedBy.email,
      },
      tenantId: document.tenantId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      formattedFileSize: document.formatFileSize(),
      fileExtension: document.getFileExtension(),
    };
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}