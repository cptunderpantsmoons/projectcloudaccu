import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IStorageProvider, FileUploadResult } from '../storage-provider.interface';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(uploadDir: string, baseUrl: string) {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
  }

  async upload(file: Express.Multer.File, uploadPath: string): Promise<FileUploadResult> {
    const fullDir = path.join(this.uploadDir, uploadPath);
    await fs.mkdir(fullDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const filename = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const fullPath = path.join(fullDir, filename);

    await fs.writeFile(fullPath, file.buffer);

    const checksum = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      path: fullPath,
      url: `${this.baseUrl}/${uploadPath}/${filename}`,
      size: file.size,
      checksum,
    };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new InternalServerErrorException('Failed to delete file');
      }
    }
  }

  async getStream(filePath: string): Promise<Readable> {
    if (!fsSync.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fsSync.createReadStream(filePath);
  }

  async getUrl(filePath: string): Promise<string> {
    // For local storage, we might return the same URL constructed during upload
    // But this method might be used to get signed URLs in S3.
    // Here we just return the static URL derived from path relative to upload dir.
    const relativePath = path.relative(this.uploadDir, filePath);
    return `${this.baseUrl}/${relativePath}`;
  }
}
