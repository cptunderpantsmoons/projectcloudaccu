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
        const provider = configService.get<string>('fileStorage.provider', 'local');
        
        if (provider === 's3' || provider === 'minio') {
          return new S3StorageProvider(
            configService.get<string>('fileStorage.bucket'),
            configService.get<string>('fileStorage.region'),
            configService.get<string>('fileStorage.endpoint'),
            configService.get<string>('fileStorage.accessKeyId'),
            configService.get<string>('fileStorage.secretAccessKey'),
          );
        }
        
        return new LocalStorageProvider(
          process.env.FILE_UPLOAD_DIR || './uploads',
          process.env.FILE_BASE_URL || 'http://localhost:4000/files'
        );
      },
      inject: [ConfigService],
    },
    FileStorageService,
  ],
  exports: [FileStorageService],
})
export class FileStorageModule {}
