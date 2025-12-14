import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../../src/modules/file-storage/file-storage.service';
import { LocalStorageProvider } from '../../src/modules/file-storage/providers/local-storage.provider';
import { S3StorageProvider } from '../../src/modules/file-storage/providers/s3-storage.provider';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let configService: jest.Mocked<ConfigService>;
  let localProvider: jest.Mocked<LocalStorageProvider>;
  let s3Provider: jest.Mocked<S3StorageProvider>;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    localProvider = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getFileUrl: jest.fn(),
      getSignedUrl: jest.fn(),
      listFiles: jest.fn(),
      fileExists: jest.fn(),
    };

    s3Provider = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getFileUrl: jest.fn(),
      getSignedUrl: jest.fn(),
      listFiles: jest.fn(),
      fileExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: 'LOCAL_STORAGE_PROVIDER',
          useValue: localProvider,
        },
        {
          provide: 'S3_STORAGE_PROVIDER',
          useValue: s3Provider,
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file using local storage provider', async () => {
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const uploadResult = {
        id: 'file-123',
        originalName: 'test.pdf',
        filename: 'test-123.pdf',
        path: '/uploads/test-123.pdf',
        url: 'http://localhost:3000/files/test-123.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        checksum: 'abc123',
      };

      configService.get.mockReturnValue('local');
      localProvider.uploadFile.mockResolvedValue(uploadResult);

      const result = await service.uploadFile(file, 'documents');

      expect(result).toEqual(uploadResult);
      expect(localProvider.uploadFile).toHaveBeenCalledWith(file, 'documents');
    });

    it('should upload file using S3 storage provider', async () => {
      const file = {
        originalname: 'document.docx',
        buffer: Buffer.from('test content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048,
      } as Express.Multer.File;

      const uploadResult = {
        id: 's3-file-456',
        originalName: 'document.docx',
        filename: 'document-456.docx',
        path: 'documents/document-456.docx',
        url: 'https://bucket.s3.amazonaws.com/documents/document-456.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048,
        checksum: 'def456',
      };

      configService.get.mockReturnValue('s3');
      s3Provider.uploadFile.mockResolvedValue(uploadResult);

      const result = await service.uploadFile(file, 'documents');

      expect(result).toEqual(uploadResult);
      expect(s3Provider.uploadFile).toHaveBeenCalledWith(file, 'documents');
    });

    it('should handle upload errors gracefully', async () => {
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      configService.get.mockReturnValue('local');
      localProvider.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile(file, 'documents')).rejects.toThrow('Upload failed');
    });

    it('should validate file size before upload', async () => {
      const largeFile = {
        originalname: 'large.pdf',
        buffer: Buffer.alloc(100 * 1024 * 1024), // 100MB
        mimetype: 'application/pdf',
        size: 100 * 1024 * 1024,
      } as Express.Multer.File;

      configService.get.mockReturnValue('local');
      configService.getOrThrow.mockReturnValue('50MB');

      await expect(service.uploadFile(largeFile, 'documents')).rejects.toThrow();
    });

    it('should validate file type before upload', async () => {
      const executableFile = {
        originalname: 'malware.exe',
        buffer: Buffer.from('executable content'),
        mimetype: 'application/x-msdownload',
        size: 1024,
      } as Express.Multer.File;

      configService.get.mockReturnValue('local');
      configService.getOrThrow.mockReturnValue('pdf,doc,docx,txt,png,jpg');

      await expect(service.uploadFile(executableFile, 'documents')).rejects.toThrow();
    });

    it('should calculate file checksum during upload', async () => {
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const uploadResult = {
        id: 'file-123',
        originalName: 'test.pdf',
        filename: 'test-123.pdf',
        path: '/uploads/test-123.pdf',
        url: 'http://localhost:3000/files/test-123.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        checksum: 'sha256:abc123def456',
      };

      configService.get.mockReturnValue('local');
      localProvider.uploadFile.mockResolvedValue(uploadResult);

      const result = await service.uploadFile(file, 'documents');

      expect(result.checksum).toBeDefined();
      expect(result.checksum).toMatch(/^sha256:/);
    });
  });

  describe('deleteFile', () => {
    it('should delete file using local storage provider', async () => {
      const fileId = 'file-123';

      configService.get.mockReturnValue('local');
      localProvider.deleteFile.mockResolvedValue(true);

      const result = await service.deleteFile(fileId);

      expect(result).toBe(true);
      expect(localProvider.deleteFile).toHaveBeenCalledWith(fileId);
    });

    it('should delete file using S3 storage provider', async () => {
      const fileId = 's3-file-456';

      configService.get.mockReturnValue('s3');
      s3Provider.deleteFile.mockResolvedValue(true);

      const result = await service.deleteFile(fileId);

      expect(result).toBe(true);
      expect(s3Provider.deleteFile).toHaveBeenCalledWith(fileId);
    });

    it('should handle deletion errors gracefully', async () => {
      const fileId = 'non-existent-file';

      configService.get.mockReturnValue('local');
      localProvider.deleteFile.mockResolvedValue(false);

      const result = await service.deleteFile(fileId);

      expect(result).toBe(false);
    });
  });

  describe('getFileUrl', () => {
    it('should get file URL from local storage', async () => {
      const fileId = 'file-123';
      const expectedUrl = 'http://localhost:3000/files/test-123.pdf';

      configService.get.mockReturnValue('local');
      localProvider.getFileUrl.mockResolvedValue(expectedUrl);

      const result = await service.getFileUrl(fileId);

      expect(result).toBe(expectedUrl);
      expect(localProvider.getFileUrl).toHaveBeenCalledWith(fileId);
    });

    it('should get file URL from S3 storage', async () => {
      const fileId = 's3-file-456';
      const expectedUrl = 'https://bucket.s3.amazonaws.com/documents/test-123.pdf';

      configService.get.mockReturnValue('s3');
      s3Provider.getFileUrl.mockResolvedValue(expectedUrl);

      const result = await service.getFileUrl(fileId);

      expect(result).toBe(expectedUrl);
      expect(s3Provider.getFileUrl).toHaveBeenCalledWith(fileId);
    });
  });

  describe('getSignedUrl', () => {
    it('should get signed URL for secure file access', async () => {
      const fileId = 'file-123';
      const expiresIn = 3600; // 1 hour
      const signedUrl = 'https://bucket.s3.amazonaws.com/documents/test-123.pdf?signature=abc123&expires=1234567890';

      configService.get.mockReturnValue('s3');
      s3Provider.getSignedUrl.mockResolvedValue(signedUrl);

      const result = await service.getSignedUrl(fileId, expiresIn);

      expect(result).toBe(signedUrl);
      expect(s3Provider.getSignedUrl).toHaveBeenCalledWith(fileId, expiresIn);
    });

    it('should handle signed URL generation errors', async () => {
      const fileId = 'file-123';
      const expiresIn = 3600;

      configService.get.mockReturnValue('s3');
      s3Provider.getSignedUrl.mockRejectedValue(new Error('Signature generation failed'));

      await expect(service.getSignedUrl(fileId, expiresIn)).rejects.toThrow('Signature generation failed');
    });
  });

  describe('listFiles', () => {
    it('should list files in a directory', async () => {
      const prefix = 'documents';
      const files = [
        {
          id: 'file-1',
          name: 'document1.pdf',
          size: 1024,
          lastModified: new Date(),
          url: 'http://localhost:3000/files/document1.pdf',
        },
        {
          id: 'file-2',
          name: 'document2.docx',
          size: 2048,
          lastModified: new Date(),
          url: 'http://localhost:3000/files/document2.docx',
        },
      ];

      configService.get.mockReturnValue('local');
      localProvider.listFiles.mockResolvedValue(files);

      const result = await service.listFiles(prefix);

      expect(result).toEqual(files);
      expect(localProvider.listFiles).toHaveBeenCalledWith(prefix);
    });

    it('should filter files by extension', async () => {
      const prefix = 'documents';
      const extension = '.pdf';
      const pdfFiles = [
        {
          id: 'file-1',
          name: 'document1.pdf',
          size: 1024,
          lastModified: new Date(),
          url: 'http://localhost:3000/files/document1.pdf',
        },
      ];

      configService.get.mockReturnValue('local');
      localProvider.listFiles.mockResolvedValue(pdfFiles);

      const result = await service.listFiles(prefix, extension);

      expect(result).toEqual(pdfFiles);
      expect(localProvider.listFiles).toHaveBeenCalledWith(prefix, extension);
    });
  });

  describe('fileExists', () => {
    it('should check if file exists in local storage', async () => {
      const fileId = 'file-123';

      configService.get.mockReturnValue('local');
      localProvider.fileExists.mockResolvedValue(true);

      const result = await service.fileExists(fileId);

      expect(result).toBe(true);
      expect(localProvider.fileExists).toHaveBeenCalledWith(fileId);
    });

    it('should check if file exists in S3 storage', async () => {
      const fileId = 's3-file-456';

      configService.get.mockReturnValue('s3');
      s3Provider.fileExists.mockResolvedValue(true);

      const result = await service.fileExists(fileId);

      expect(result).toBe(true);
      expect(s3Provider.fileExists).toHaveBeenCalledWith(fileId);
    });
  });

  describe('copyFile', () => {
    it('should copy file within the same storage provider', async () => {
      const sourceFileId = 'file-123';
      const destinationPath = 'backup/documents/';
      const newFileId = 'file-copy-456';

      const copyResult = {
        id: newFileId,
        sourceFileId,
        destinationPath,
        url: 'http://localhost:3000/files/backup/documents/file-copy-456.pdf',
      };

      configService.get.mockReturnValue('local');
      localProvider.uploadFile.mockResolvedValue(copyResult);

      const result = await service.copyFile(sourceFileId, destinationPath);

      expect(result).toEqual(copyResult);
      expect(localProvider.uploadFile).toHaveBeenCalled();
    });

    it('should handle copy operation errors', async () => {
      const sourceFileId = 'non-existent-file';
      const destinationPath = 'backup/';

      configService.get.mockReturnValue('local');
      localProvider.fileExists.mockResolvedValue(false);

      const result = await service.copyFile(sourceFileId, destinationPath);

      expect(result).toBeNull();
    });
  });

  describe('moveFile', () => {
    it('should move file to new location', async () => {
      const sourceFileId = 'file-123';
      const destinationPath = 'archive/';
      const newFileId = 'file-moved-456';

      const moveResult = {
        id: newFileId,
        sourceFileId,
        destinationPath,
        url: 'http://localhost:3000/files/archive/file-moved-456.pdf',
      };

      configService.get.mockReturnValue('local');
      localProvider.uploadFile.mockResolvedValue(moveResult);
      localProvider.deleteFile.mockResolvedValue(true);

      const result = await service.moveFile(sourceFileId, destinationPath);

      expect(result).toEqual(moveResult);
      expect(localProvider.uploadFile).toHaveBeenCalled();
      expect(localProvider.deleteFile).toHaveBeenCalledWith(sourceFileId);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const stats = {
        totalFiles: 150,
        totalSize: 1024 * 1024 * 500, // 500MB
        averageFileSize: 1024 * 1024 * 3.33, // ~3.33MB
        storageProvider: 'local',
        lastBackup: new Date(),
      };

      configService.get.mockReturnValue('local');
      localProvider.listFiles.mockResolvedValue([]);
      localProvider.getFileUrl.mockResolvedValue('http://localhost:3000/files/');

      const result = await service.getStorageStats();

      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('totalSize');
      expect(result).toHaveProperty('storageProvider');
    });
  });

  describe('cleanupOrphanedFiles', () => {
    it('should clean up orphaned files', async () => {
      const orphanedFileIds = ['file-1', 'file-2', 'file-3'];

      configService.get.mockReturnValue('local');
      localProvider.deleteFile.mockResolvedValue(true);

      const result = await service.cleanupOrphanedFiles(orphanedFileIds);

      expect(result.deletedCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(localProvider.deleteFile).toHaveBeenCalledTimes(3);
    });

    it('should handle partial cleanup failures', async () => {
      const orphanedFileIds = ['file-1', 'file-2', 'file-3'];

      configService.get.mockReturnValue('local');
      localProvider.deleteFile
        .mockResolvedValueOnce(true) // Success
        .mockResolvedValueOnce(false) // Failure
        .mockResolvedValueOnce(true); // Success

      const result = await service.cleanupOrphanedFiles(orphanedFileIds);

      expect(result.deletedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.failedFiles).toEqual(['file-2']);
    });
  });
});

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    provider = new LocalStorageProvider(configService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file to local storage', async () => {
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const result = await provider.uploadFile(file, 'documents');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('originalName');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('mimeType');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('checksum');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from local storage', async () => {
      const fileId = 'test-file-123';

      const result = await provider.deleteFile(fileId);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getFileUrl', () => {
    it('should generate file URL for local storage', async () => {
      const fileId = 'test-file-123';

      const result = await provider.getFileUrl(fileId);

      expect(result).toBe('http://localhost:3000/files/test-file-123.pdf');
    });
  });
});

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    provider = new S3StorageProvider(configService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file to S3', async () => {
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const result = await provider.uploadFile(file, 'documents');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('originalName');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('mimeType');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('checksum');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL for S3 object', async () => {
      const fileId = 's3-file-123';
      const expiresIn = 3600;

      const result = await provider.getSignedUrl(fileId, expiresIn);

      expect(result).toContain('amazonaws.com');
      expect(result).toContain('Signature=');
      expect(result).toContain('Expires=');
    });
  });
});