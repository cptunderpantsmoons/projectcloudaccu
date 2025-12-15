import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from './file-storage.service';
import { FileUpload } from '../../entities/file-upload.entity';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { IStorageProvider } from './storage-provider.interface';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([FileUpload]),
  ],
  providers: [
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (configService: ConfigService): IStorageProvider => {
        const provider = configService.get<string>('fileStorage.provider') || 'local';
        const environment = configService.get<string>('environment') || 'development';

        if (environment === 'production' && provider === 'local') {
          throw new Error('Local storage provider is not allowed in production. Set FILE_STORAGE_PROVIDER to s3 or minio.');
        }

        if (provider === 's3' || provider === 'minio') {
          const bucket = configService.get<string>('fileStorage.bucket');
          const accessKeyId = configService.get<string>('fileStorage.accessKeyId');
          const secretAccessKey = configService.get<string>('fileStorage.secretAccessKey');

          if (!bucket || !accessKeyId || !secretAccessKey) {
            throw new Error('Storage credentials are missing. Set FILE_STORAGE_BUCKET, FILE_STORAGE_ACCESS_KEY_ID, and FILE_STORAGE_SECRET_ACCESS_KEY.');
          }

          return new S3StorageProvider(
            bucket,
            configService.get<string>('fileStorage.region'),
            configService.get<string>('fileStorage.endpoint'),
            accessKeyId,
            secretAccessKey,
          );
        }
        
        return new LocalStorageProvider(
          configService.get<string>('fileStorage.uploadDir') || './uploads',
          configService.get<string>('fileStorage.baseUrl') || 'http://localhost:4000/files'
        );
      },
      inject: [ConfigService],
    },
    FileStorageService,
  ],
  exports: [FileStorageService],
})
export class FileStorageModule {}
