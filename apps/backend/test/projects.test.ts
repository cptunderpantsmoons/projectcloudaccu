import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { Project, ProjectStatus, ProjectType } from '../src/entities/project.entity';
import { User } from '../src/entities/user.entity';
import { Document } from '../src/entities/document.entity';
import { CalendarEvent } from '../src/entities/calendar-event.entity';
import {
  ProjectCreateDto,
  ProjectUpdateDto,
  ProjectQueryDto,
  ProjectStatusUpdateDto,
  ProjectTemplateCreateDto,
  CollaboratorAddDto,
  MethodologyDto,
} from '../src/modules/projects/dto';

// Mock data
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashedpassword',
  status: 'active' as any,
  roles: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  tenantId: 'tenant-123',
  phoneNumber: null,
  avatar: null,
  metadata: null,
  lastLoginAt: null,
};

const mockProject: Project = {
  id: 'project-123',
  name: 'Test Project',
  description: 'Test project description',
  status: ProjectStatus.DRAFT,
  type: ProjectType.AUDIT,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  methodology: {
    id: 'methodology-123',
    name: 'ISO 14064-2',
    version: '2.0',
    url: 'https://example.com',
    requirements: {
      verificationRequired: true,
      scope: 'Organization',
    },
  },
  metadata: { key: 'value' },
  ownerId: 'user-123',
  owner: mockUser,
  tenantId: 'tenant-123',
  tags: ['test', 'audit'],
  documents: [],
  calendarEvents: [],
  accuApplications: [],
  accuInventory: [],
  audits: [],
  communications: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  // Helper methods
  isActive() { return this.status === ProjectStatus.ACTIVE; },
  isCompleted() { return this.status === ProjectStatus.COMPLETED; },
  isOnHold() { return this.status === ProjectStatus.ON_HOLD; },
  isDraft() { return this.status === ProjectStatus.DRAFT; },
  getDurationInDays() { 
    const start = new Date(this.startDate);
    const end = this.endDate ? new Date(this.endDate) : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  },
  isMethodology() { return this.type === ProjectType.METHODOLOGY; },
  isAudit() { return this.type === ProjectType.AUDIT; },
  isCompliance() { return this.type === ProjectType.COMPLIANCE; },
};

const mockDocument: Document = {
  id: 'doc-123',
  name: 'Test Document',
  description: 'Test document description',
  category: 'methodology' as any,
  status: 'draft' as any,
  version: 1,
  fileName: 'test.pdf',
  originalFileName: 'test.pdf',
  filePath: '/uploads/test.pdf',
  fileUrl: 'https://example.com/test.pdf',
  mimeType: 'application/pdf',
  fileSize: 1024,
  checksum: 'abc123',
  tags: [],
  metadata: {},
  uploadedById: 'user-123',
  uploadedBy: mockUser,
  projectId: 'project-123',
  project: mockProject,
  tenantId: 'tenant-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  getFileExtension() { return 'pdf'; },
  formatFileSize() { return '1.0 KB'; },
};

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let calendarEventRepository: jest.Mocked<Repository<CalendarEvent>>;

  beforeEach(async () => {
    const mockProjectRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockDocumentRepository = {
      find: jest.fn(),
    };

    const mockCalendarEventRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: getRepositoryToken(CalendarEvent),
          useValue: mockCalendarEventRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectRepository = module.get(getRepositoryToken(Project));
    userRepository = module.get(getRepositoryToken(User));
    documentRepository = module.get(getRepositoryToken(Document));
    calendarEventRepository = module.get(getRepositoryToken(CalendarEvent));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const createDto: ProjectCreateDto = {
        name: 'New Project',
        description: 'Project description',
        type: ProjectType.AUDIT,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        methodology: {
          id: 'methodology-123',
          name: 'ISO 14064-2',
          version: '2.0',
        },
        tags: ['test'],
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);

      const result = await service.create(createDto, 'user-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-123' } });
      expect(projectRepository.create).toHaveBeenCalled();
      expect(projectRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Project');
    });

    it('should throw NotFoundException when owner not found', async () => {
      const createDto: ProjectCreateDto = {
        name: 'New Project',
        type: ProjectType.AUDIT,
        startDate: '2024-01-01',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(NotFoundException);
    });

    it('should apply template when templateId provided', async () => {
      const createDto: ProjectCreateDto = {
        name: 'New Project',
        type: ProjectType.AUDIT,
        startDate: '2024-01-01',
        templateId: 'template-iso14064',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);

      await service.create(createDto, 'user-123');

      expect(projectRepository.create).toHaveBeenCalled();
      const createCall = projectRepository.create.mock.calls[0][0];
      expect(createCall.metadata.templateSettings).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const queryDto: ProjectQueryDto = {
        page: 1,
        limit: 10,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockProject]),
      };

      projectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(queryDto);

      expect(projectRepository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const queryDto: ProjectQueryDto = {
        search: 'test',
        status: ProjectStatus.ACTIVE,
        type: ProjectType.AUDIT,
        tags: ['test'],
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      projectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4); // search, status, type, tags
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne('project-123');

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        relations: ['owner'],
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('project-123');
    });

    it('should throw NotFoundException when project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      const updateDto: ProjectUpdateDto = {
        name: 'Updated Project',
        description: 'Updated description',
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);

      const result = await service.update('project-123', updateDto);

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        relations: ['owner'],
      });
      expect(projectRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when project not found', async () => {
      const updateDto: ProjectUpdateDto = { name: 'Updated Project' };
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.update.mockResolvedValue({ affected: 1 });

      await service.remove('project-123');

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-123' },
      });
      expect(projectRepository.update).toHaveBeenCalledWith('project-123', {
        status: ProjectStatus.CANCELLED,
      });
    });
  });

  describe('updateStatus', () => {
    it('should update project status successfully', async () => {
      const statusDto: ProjectStatusUpdateDto = {
        status: ProjectStatus.ACTIVE,
        reason: 'Manual activation',
      };

      const activeProject = { ...mockProject, status: ProjectStatus.DRAFT };
      projectRepository.findOne.mockResolvedValue(activeProject);
      projectRepository.save.mockResolvedValue(activeProject);

      const result = await service.updateStatus('project-123', statusDto);

      expect(projectRepository.findOne).toHaveBeenCalled();
      expect(projectRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(ProjectStatus.ACTIVE);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const statusDto: ProjectStatusUpdateDto = {
        status: ProjectStatus.DRAFT, // Can't go back to draft from completed
        reason: 'Test',
      };

      const completedProject = { ...mockProject, status: ProjectStatus.COMPLETED };
      projectRepository.findOne.mockResolvedValue(completedProject);

      await expect(service.updateStatus('project-123', statusDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Templates', () => {
    it('should return templates', async () => {
      const result = await service.getTemplates();

      expect(result.data).toHaveLength(3); // Default templates
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('name');
      expect(result.data[0]).toHaveProperty('type');
    });

    it('should create template', async () => {
      const createDto: ProjectTemplateCreateDto = {
        name: 'Custom Template',
        description: 'Custom template description',
        type: ProjectType.AUDIT,
        methodology: {
          id: 'methodology-123',
          name: 'ISO 14064-2',
          version: '2.0',
        },
      };

      const result = await service.createTemplate(createDto);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Custom Template');
      expect(result.type).toBe(ProjectType.AUDIT);
    });

    it('should update template', async () => {
      const updateDto = {
        name: 'Updated Template',
        description: 'Updated description',
      };

      const result = await service.updateTemplate('template-iso14064', updateDto);

      expect(result.name).toBe('Updated Template');
    });

    it('should delete template', async () => {
      await service.deleteTemplate('template-iso14064');

      const templates = await service.getTemplates();
      const deletedTemplate = templates.data.find(t => t.id === 'template-iso14064');
      expect(deletedTemplate.isActive).toBe(false);
    });
  });

  describe('Collaborators', () => {
    it('should add collaborator', async () => {
      const addDto: CollaboratorAddDto = {
        collaborator: {
          userId: 'user-456',
          role: 'contributor',
          canEdit: true,
        },
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.addCollaborator('project-123', addDto);

      expect(result.total).toBe(1);
      expect(result.data[0].userId).toBe('user-456');
    });

    it('should remove collaborator', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.removeCollaborator('project-123', 'user-456');

      expect(result.total).toBe(0);
    });

    it('should get collaborators', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.getCollaborators('project-123');

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  describe('Analytics', () => {
    it('should get project analytics', async () => {
      const projectWithRelations = {
        ...mockProject,
        documents: [mockDocument],
        calendarEvents: [],
        owner: mockUser,
      };

      projectRepository.findOne.mockResolvedValue(projectWithRelations);

      const result = await service.getAnalytics('project-123');

      expect(result.id).toBe('project-123');
      expect(result.documentsCount).toBe(1);
      expect(result.collaboratorsCount).toBe(0);
      expect(result.progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics', () => {
    it('should get project statistics', async () => {
      const mockProjects = [
        { ...mockProject, status: ProjectStatus.ACTIVE, type: ProjectType.AUDIT },
        { ...mockProject, status: ProjectStatus.COMPLETED, type: ProjectType.COMPLIANCE },
        { ...mockProject, status: ProjectStatus.ON_HOLD, type: ProjectType.RESEARCH },
      ];

      const mockQueryBuilder = {
        getMany: jest.fn().mockResolvedValue(mockProjects),
      };

      projectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getProjectStats();

      expect(result.total).toBe(3);
      expect(result.active).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.byStatus).toHaveProperty(ProjectStatus.ACTIVE);
      expect(result.byType).toHaveProperty(ProjectType.AUDIT);
    });
  });

  describe('Documents', () => {
    it('should get project documents', async () => {
      documentRepository.find.mockResolvedValue([mockDocument]);
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.getProjectDocuments('project-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Document');
    });
  });

  describe('Methodology Validation', () => {
    it('should validate audit methodology requirements', async () => {
      const invalidMethodology: MethodologyDto = {
        id: 'methodology-123',
        name: 'Invalid Methodology',
        version: '1.0',
        // Missing verificationRequired for audit
      };

      const createDto: ProjectCreateDto = {
        name: 'Invalid Project',
        type: ProjectType.AUDIT,
        startDate: '2024-01-01',
        methodology: invalidMethodology,
      };

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should validate compliance methodology requirements', async () => {
      const invalidMethodology: MethodologyDto = {
        id: 'methodology-123',
        name: 'Invalid Compliance',
        version: '1.0',
        // Missing reportingFrequency for compliance
      };

      const createDto: ProjectCreateDto = {
        name: 'Invalid Project',
        type: ProjectType.COMPLIANCE,
        startDate: '2024-01-01',
        methodology: invalidMethodology,
      };

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(BadRequestException);
    });
  });
});

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<ProjectsService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      updateStatus: jest.fn(),
      getTemplates: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getCollaborators: jest.fn(),
      addCollaborator: jest.fn(),
      removeCollaborator: jest.fn(),
      getAnalytics: jest.fn(),
      getProjectStats: jest.fn(),
      getProjectDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const createDto: ProjectCreateDto = {
        name: 'New Project',
        type: ProjectType.AUDIT,
        startDate: '2024-01-01',
      };

      service.create.mockResolvedValue(mockProject);

      const mockRequest = { user: { id: 'user-123' } };

      const result = await controller.create(createDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createDto, 'user-123');
      expect(result).toBe(mockProject);
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const queryDto: ProjectQueryDto = { page: 1, limit: 10 };
      const paginatedResponse = {
        data: [mockProject],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };

      service.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toBe(paginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      service.findOne.mockResolvedValue(mockProject);

      const result = await controller.findOne('project-123');

      expect(service.findOne).toHaveBeenCalledWith('project-123');
      expect(result).toBe(mockProject);
    });
  });

  describe('update', () => {
    it('should update project', async () => {
      const updateDto: ProjectUpdateDto = { name: 'Updated Project' };
      service.update.mockResolvedValue(mockProject);

      const result = await controller.update('project-123', updateDto);

      expect(service.update).toHaveBeenCalledWith('project-123', updateDto);
      expect(result).toBe(mockProject);
    });
  });

  describe('remove', () => {
    it('should remove project', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('project-123');

      expect(service.remove).toHaveBeenCalledWith('project-123');
    });
  });

  describe('updateStatus', () => {
    it('should update project status', async () => {
      const statusDto: ProjectStatusUpdateDto = {
        status: ProjectStatus.ACTIVE,
        reason: 'Manual activation',
      };

      service.updateStatus.mockResolvedValue(mockProject);

      const result = await controller.updateStatus('project-123', statusDto);

      expect(service.updateStatus).toHaveBeenCalledWith('project-123', statusDto);
      expect(result).toBe(mockProject);
    });
  });

  describe('Templates', () => {
    it('should get templates', async () => {
      const templatesResponse = {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      };

      service.getTemplates.mockResolvedValue(templatesResponse);

      const result = await controller.getTemplates();

      expect(service.getTemplates).toHaveBeenCalledWith({});
      expect(result).toBe(templatesResponse);
    });

    it('should create template', async () => {
      const createDto: ProjectTemplateCreateDto = {
        name: 'Custom Template',
        type: ProjectType.AUDIT,
        methodology: {
          id: 'methodology-123',
          name: 'ISO 14064-2',
          version: '2.0',
        },
      };

      const mockTemplate = { ...createDto, id: 'template-123', isActive: true };
      service.createTemplate.mockResolvedValue(mockTemplate);

      const result = await controller.createTemplate(createDto);

      expect(service.createTemplate).toHaveBeenCalledWith(createDto);
      expect(result).toBe(mockTemplate);
    });
  });

  describe('Collaborators', () => {
    it('should get collaborators', async () => {
      const collaboratorsResponse = { data: [], total: 0 };
      service.getCollaborators.mockResolvedValue(collaboratorsResponse);

      const result = await controller.getCollaborators('project-123');

      expect(service.getCollaborators).toHaveBeenCalledWith('project-123');
      expect(result).toBe(collaboratorsResponse);
    });

    it('should add collaborator', async () => {
      const addDto: CollaboratorAddDto = {
        collaborator: {
          userId: 'user-456',
          role: 'contributor',
        },
      };

      const collaboratorsResponse = { data: [addDto.collaborator], total: 1 };
      service.addCollaborator.mockResolvedValue(collaboratorsResponse);

      const result = await controller.addCollaborator('project-123', addDto);

      expect(service.addCollaborator).toHaveBeenCalledWith('project-123', addDto);
      expect(result).toBe(collaboratorsResponse);
    });

    it('should remove collaborator', async () => {
      const collaboratorsResponse = { data: [], total: 0 };
      service.removeCollaborator.mockResolvedValue(collaboratorsResponse);

      const result = await controller.removeCollaborator('project-123', 'user-456');

      expect(service.removeCollaborator).toHaveBeenCalledWith('project-123', 'user-456');
      expect(result).toBe(collaboratorsResponse);
    });
  });

  describe('Analytics', () => {
    it('should get analytics', async () => {
      const mockAnalytics = {
        id: 'project-123',
        name: 'Test Project',
        status: ProjectStatus.ACTIVE,
        type: ProjectType.AUDIT,
        duration: 365,
        progress: 50,
        documentsCount: 1,
        collaboratorsCount: 0,
        milestonesCount: 0,
        completedMilestonesCount: 0,
        daysUntilDeadline: 30,
        isOverdue: false,
        owner: {
          id: 'user-123',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAnalytics('project-123');

      expect(service.getAnalytics).toHaveBeenCalledWith('project-123');
      expect(result).toBe(mockAnalytics);
    });
  });

  describe('Convenience endpoints', () => {
    it('should activate project', async () => {
      service.updateStatus.mockResolvedValue(mockProject);

      await controller.activateProject('project-123');

      expect(service.updateStatus).toHaveBeenCalledWith('project-123', {
        status: ProjectStatus.ACTIVE,
        reason: 'Manual activation',
      });
    });

    it('should complete project', async () => {
      service.updateStatus.mockResolvedValue(mockProject);

      await controller.completeProject('project-123');

      expect(service.updateStatus).toHaveBeenCalledWith('project-123', {
        status: ProjectStatus.COMPLETED,
        reason: 'Manual completion',
      });
    });

    it('should put project on hold', async () => {
      service.updateStatus.mockResolvedValue(mockProject);

      await controller.holdProject('project-123');

      expect(service.updateStatus).toHaveBeenCalledWith('project-123', {
        status: ProjectStatus.ON_HOLD,
        reason: 'Manual hold',
      });
    });

    it('should resume project', async () => {
      service.updateStatus.mockResolvedValue(mockProject);

      await controller.resumeProject('project-123');

      expect(service.updateStatus).toHaveBeenCalledWith('project-123', {
        status: ProjectStatus.ACTIVE,
        reason: 'Resumed from hold',
      });
    });
  });
});