import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from '../../entities/file-upload.entity';
import { IStorageProvider, FileUploadResult } from './storage-provider.interface';
import * as path from 'path';

export interface FileValidationOptions {
  allowedMimeTypes?: string[];
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
}

export interface StorageQuota {
  used: number;
  limit: number;
  available: number;
}

@Injectable()
export class FileStorageService {
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly storageQuota: number;

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: IStorageProvider,
  ) {
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
    this.allowedMimeTypes = [
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
      'application/x-rar-compressed',
    ];
    this.storageQuota = parseInt(process.env.STORAGE_QUOTA || '1073741824'); // 1GB default
  }

  /**
   * Upload a file
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadedById?: string,
    options?: FileValidationOptions,
  ): Promise<FileUploadResult> {
    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > (options?.maxFileSize || this.maxFileSize)) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.formatFileSize(options?.maxFileSize || this.maxFileSize)}`,
      );
    }

    // Validate file type
    if (options?.allowedMimeTypes || options?.allowedExtensions) {
      this.validateFileType(file, options);
    } else {
      this.validateFileType(file, {
        allowedMimeTypes: this.allowedMimeTypes,
      });
    }

    try {
      // Determine upload path
      const uploadPath = uploadedById || 'public';
      
      // Upload using provider
      const result = await this.storageProvider.upload(file, uploadPath);

      // Create file record
      const fileUpload = this.fileUploadRepository.create({
        originalName: file.originalname,
        filename: result.filename,
        path: result.path,
        mimeType: file.mimetype,
        size: result.size,
        checksum: result.checksum,
        uploadedById,
      });

      const savedFile = await this.fileUploadRepository.save(fileUpload);

      return {
        ...result,
        url: await this.storageProvider.getUrl(savedFile.path),
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Get file by ID
   */
  async getFile(id: string): Promise<FileUpload> {
    const file = await this.fileUploadRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Get file stream
   */
  async getFileStream(id: string): Promise<any> {
    const file = await this.getFile(id);
    return this.storageProvider.getStream(file.path);
  }

  /**
   * Get file buffer
   */
  async getFileBuffer(id: string): Promise<Buffer> {
    const stream = await this.getFileStream(id);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Delete file
   */
  async deleteFile(id: string): Promise<void> {
    const file = await this.getFile(id);

    try {
      // Delete from storage provider
      await this.storageProvider.delete(file.path);

      // Delete from database
      await this.fileUploadRepository.remove(file);
    } catch (error) {
      console.error('Delete error:', error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Get file URL
   */
  async getFileUrl(id: string): Promise<string> {
    const file = await this.getFile(id);
    return this.storageProvider.getUrl(file.path);
  }

  /**
   * Check storage quota
   */
  async getStorageQuota(userId?: string): Promise<StorageQuota> {
    const queryBuilder = this.fileUploadRepository.createQueryBuilder('file');
    
    if (userId) {
      queryBuilder.where('file.uploadedById = :userId', { userId });
    }

    const totalSize = await queryBuilder
      .select('SUM(file.size)', 'total')
      .getRawOne();

    const used = parseInt(totalSize?.total || '0');
    const available = Math.max(0, this.storageQuota - used);

    return {
      used,
      limit: this.storageQuota,
      available,
    };
  }

  /**
   * Validate file type
   */
  private validateFileType(file: Express.Multer.File, options: FileValidationOptions): void {
    // Check MIME type
    if (options.allowedMimeTypes) {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
        );
      }
    }

    // Check file extension
    if (options.allowedExtensions) {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (!options.allowedExtensions.includes(fileExtension)) {
        throw new BadRequestException(
          `File extension ${fileExtension} is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`,
        );
      }
    }
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
