import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { IStorageProvider, FileUploadResult } from '../storage-provider.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  private readonly logger = new Logger(S3StorageProvider.name);

  constructor(
    private readonly bucket: string,
    private readonly region: string,
    private readonly endpoint?: string,
    private readonly accessKeyId?: string,
    private readonly secretAccessKey?: string,
  ) {
    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId || '',
        secretAccessKey: this.secretAccessKey || '',
      },
      forcePathStyle: true, // Needed for MinIO
    });
  }

  async upload(file: Express.Multer.File, uploadPath: string): Promise<FileUploadResult> {
    const fileExtension = path.extname(file.originalname);
    const filename = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const key = `${uploadPath}/${filename}`;

    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      const checksum = crypto
        .createHash('sha256')
        .update(file.buffer)
        .digest('hex');

      return {
        filename,
        path: key, // In S3, path is the key
        url: await this.getUrl(key),
        size: file.size,
        checksum,
      };
    } catch (error) {
      this.logger.error(`S3 Upload failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to upload file to storage');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
    } catch (error) {
      this.logger.error(`S3 Delete failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete file from storage');
    }
  }

  async getStream(key: string): Promise<Readable> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return response.Body as Readable;
    } catch (error) {
      throw new Error(`Failed to get stream: ${error.message}`);
    }
  }

  async getUrl(key: string): Promise<string> {
    // Generate signed URL for 1 hour
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }
}
