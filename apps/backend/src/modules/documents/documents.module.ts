import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentSecurityService } from './document-security.service';
import { Document } from '../../entities/document.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, User, Project]),
    FileStorageModule,
    AuthModule,
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
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

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
      },
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentSecurityService],
  exports: [DocumentsService, DocumentSecurityService],
})
export class DocumentsModule {}
