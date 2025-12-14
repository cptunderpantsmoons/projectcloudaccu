import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { DocumentSecurityService } from '../src/modules/documents/document-security.service';
import { FileStorageService } from '../src/modules/file-storage/file-storage.service';
import { Document } from '../src/entities/document.entity';
import { User } from '../src/entities/user.entity';
import { Project } from '../src/entities/project.entity';
import { FileUpload } from '../src/entities/file-upload.entity';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository: Repository<Document>;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let fileStorageService: FileStorageService;
  let securityService: DocumentSecurityService;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
    roles: [],
    tenantId: 'tenant-123',
  };

  const mockProject = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Test Project',
    status: 'active',
    ownerId: mockUser.id,
  };

  const mockDocument = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Test Document',
    description: 'Test Description',
    category: 'methodology',
    status: 'draft',
    version: 1,
    fileName: 'test.pdf',
    originalFileName: 'test.pdf',
    filePath: '/uploads/test.pdf',
    fileUrl: 'http://localhost:3000/files/test.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    checksum: 'checksum123',
    metadata: {},
    tags: ['test'],
    uploadedById: mockUser.id,
    projectId: mockProject.id,
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        DocumentSecurityService,
        FileStorageService,
        {
          provide: getRepositoryToken(Document),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Project),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FileUpload),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    securityService = module.get<DocumentSecurityService>(DocumentSecurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      // Mock file upload result
      const mockFileUploadResult = {
        id: 'file-123',
        originalName: 'test.pdf',
        filename: 'test-123.pdf',
        path: '/uploads/test-123.pdf',
        url: 'http://localhost:3000/files/test-123.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        checksum: 'checksum123',
      };

      // Mock the repositories
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject as Project);
      jest.spyOn(securityService, 'scanFile').mockResolvedValue({
        isSafe: true,
        threats: [],
        warnings: [],
        metadata: {
          hasExecutableCode: false,
          hasMacros: false,
          hasEmbeddedFiles: false,
          fileType: 'application/pdf',
          suspiciousPatterns: [],
        },
      });
      jest.spyOn(securityService, 'extractAndValidateContent').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          mimeType: 'application/pdf',
          fileExtension: '.pdf',
          isPasswordProtected: false,
          hasMetadata: false,
        },
      });
      jest.spyOn(securityService, 'calculateFileHash').mockReturnValue({
        md5: 'md5hash',
        sha1: 'sha1hash',
        sha256: 'sha256hash',
      });
      jest.spyOn(fileStorageService, 'uploadFile').mockResolvedValue(mockFileUploadResult);
      jest.spyOn(documentRepository, 'create').mockReturnValue(mockDocument as Document);
      jest.spyOn(documentRepository, 'save').mockResolvedValue(mockDocument as Document);

      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content'),
      } as Express.Multer.File;

      const uploadDto = {
        name: 'Test Document',
        description: 'Test Description',
        category: 'methodology',
        tags: ['test'],
        projectId: mockProject.id,
      };

      const result = await service.uploadDocument(
        { ...uploadDto, file: mockFile },
        mockUser.id,
      );

      expect(result).toBeDefined();
      expect(result.document.name).toBe('Test Document');
      expect(result.fileUploadResult).toBe(mockFileUploadResult);
    });

    it('should throw error if security scan fails', async () => {
      const mockFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('malicious content'),
      } as Express.Multer.File;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(securityService, 'scanFile').mockResolvedValue({
        isSafe: false,
        threats: ['Malicious content detected'],
        warnings: [],
        metadata: {
          hasExecutableCode: true,
          hasMacros: false,
          hasEmbeddedFiles: false,
          fileType: 'application/pdf',
          suspiciousPatterns: ['executable code'],
        },
      });

      const uploadDto = {
        name: 'Malicious Document',
        category: 'methodology',
      };

      await expect(
        service.uploadDocument({ ...uploadDto, file: mockFile }, mockUser.id),
      ).rejects.toThrow('Security scan failed: Malicious content detected');
    });
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      const mockDocuments = [mockDocument, { ...mockDocument, id: 'doc-2' }];
      
      jest.spyOn(documentRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(mockDocuments as Document[]),
      } as any);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('security service', () => {
    it('should perform security scan', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content'),
      } as Express.Multer.File;

      const result = await securityService.scanFile(mockFile);

      expect(result).toBeDefined();
      expect(result.isSafe).toBeDefined();
      expect(result.threats).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should calculate file hash', () => {
      const buffer = Buffer.from('test content');
      const hash = securityService.calculateFileHash(buffer);

      expect(hash).toBeDefined();
      expect(hash.md5).toBeDefined();
      expect(hash.sha1).toBeDefined();
      expect(hash.sha256).toBeDefined();
    });
  });
});