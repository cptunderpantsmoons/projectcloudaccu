import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccuApplicationsService } from '../src/modules/accu/accu-applications.service';
import { AccuApplication, ACCUStatus } from '../src/entities/accu-application.entity';
import { Project, ProjectStatus, ProjectType } from '../src/entities/project.entity';
import { Document } from '../src/entities/document.entity';
import { CalendarEvent } from '../src/entities/calendar-event.entity';
import { User } from '../src/entities/user.entity';
import { Notification } from '../src/entities/notification.entity';
import { AccuNotificationService } from '../src/modules/accu/accu-notification.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

describe('AccuApplicationsService', () => {
  let service: AccuApplicationsService;
  let notificationService: AccuNotificationService;
  let repository: Repository<AccuApplication>;
  let projectRepository: Repository<Project>;
  let documentRepository: Repository<Document>;
  let userRepository: Repository<User>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    status: 'active',
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject: Project = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test project description',
    status: ProjectStatus.ACTIVE,
    type: ProjectType.METHODOLOGY,
    startDate: new Date(),
    ownerId: 'user-1',
    owner: mockUser,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: () => true,
    isCompleted: () => false,
    isOnHold: () => false,
    isDraft: () => false,
    getDurationInDays: () => 30,
    isMethodology: () => true,
    isAudit: () => false,
    isCompliance: () => false,
  };

  const mockApplication: AccuApplication = {
    id: 'app-1',
    status: ACCUStatus.DRAFT,
    submissionDate: null,
    approvalDate: null,
    issuedDate: null,
    accuUnits: 1000,
    methodologyId: 'methodology-123',
    serReference: null,
    applicationData: {
      description: 'Test application',
      location: {
        address: '123 Test St',
        coordinates: { lat: 0, lng: 0 },
        jurisdiction: 'NSW',
      },
    },
    projectId: 'project-1',
    project: mockProject,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDraft: () => true,
    isSubmitted: () => false,
    isApproved: () => false,
    isIssued: () => false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccuApplicationsService,
        AccuNotificationService,
        {
          provide: getRepositoryToken(AccuApplication),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            getCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Document),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CalendarEvent),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccuApplicationsService>(AccuApplicationsService);
    notificationService = module.get<AccuNotificationService>(AccuNotificationService);
    repository = module.get<Repository<AccuApplication>>(getRepositoryToken(AccuApplication));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create a new ACCU application', async () => {
      const createDto = {
        projectId: 'project-1',
        accuUnits: 1000,
        methodologyId: 'methodology-123',
        applicationData: {
          description: 'Test application',
        },
        tenantId: 'tenant-1',
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockApplication);
      jest.spyOn(repository, 'save').mockResolvedValue(mockApplication);

      const result = await service.create(createDto as any, 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockApplication.id);
      expect(result.status).toBe(ACCUStatus.DRAFT);
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'project-1',
        accuUnits: 1000,
        methodologyId: 'methodology-123',
        status: ACCUStatus.DRAFT,
      }));
    });

    it('should throw NotFoundException if project not found', async () => {
      const createDto = {
        projectId: 'invalid-project',
        accuUnits: 1000,
        methodologyId: 'methodology-123',
        applicationData: { description: 'Test' },
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createDto as any, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if draft application already exists', async () => {
      const createDto = {
        projectId: 'project-1',
        accuUnits: 1000,
        methodologyId: 'methodology-123',
        applicationData: { description: 'Test' },
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);

      await expect(service.create(createDto as any, 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('should update application status with valid transition', async () => {
      const statusDto = {
        status: ACCUStatus.SUBMITTED,
        reason: 'Ready for review',
        notes: 'All requirements met',
      };

      const submittedApplication = { ...mockApplication, status: ACCUStatus.SUBMITTED };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);
      jest.spyOn(repository, 'save').mockResolvedValue(submittedApplication);

      const result = await service.updateStatus('app-1', statusDto as any);

      expect(result.status).toBe(ACCUStatus.SUBMITTED);
      expect(result.submissionDate).toBeDefined();
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const statusDto = {
        status: ACCUStatus.APPROVED, // Cannot go directly from DRAFT to APPROVED
        reason: 'Test',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);

      await expect(service.updateStatus('app-1', statusDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if application not found', async () => {
      const statusDto = {
        status: ACCUStatus.SUBMITTED,
        reason: 'Test',
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.updateStatus('app-1', statusDto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('submit', () => {
    it('should submit a draft application', async () => {
      const submissionDto = {
        submissionNotes: 'Ready for review',
        contactPerson: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          position: 'Project Manager',
        },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const submittedApplication = { ...mockApplication, status: ACCUStatus.SUBMITTED };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);
      jest.spyOn(repository, 'save').mockResolvedValue(submittedApplication);
      
      // Mock document validation
      jest.spyOn(documentRepository, 'find').mockResolvedValue([]);

      const result = await service.submit('app-1', submissionDto as any);

      expect(result.status).toBe(ACCUStatus.SUBMITTED);
      expect(result.submissionDate).toBeDefined();
    });

    it('should throw BadRequestException if application is not in draft status', async () => {
      const submittedApplication = { ...mockApplication, status: ACCUStatus.SUBMITTED };
      const submissionDto = { submissionNotes: 'Test' };

      jest.spyOn(repository, 'findOne').mockResolvedValue(submittedApplication);

      await expect(service.submit('app-1', submissionDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve a submitted application', async () => {
      const submittedApplication = { ...mockApplication, status: ACCUStatus.SUBMITTED };
      const approvalDto = {
        approved: true,
        approvedUnits: 1000,
        reason: 'Meets all requirements',
        reviewerComments: 'Excellent application',
        nextSteps: 'Proceed to issuance',
      };

      const approvedApplication = { ...submittedApplication, status: ACCUStatus.APPROVED };

      jest.spyOn(repository, 'findOne').mockResolvedValue(submittedApplication);
      jest.spyOn(repository, 'save').mockResolvedValue(approvedApplication);

      const result = await service.approve('app-1', approvalDto as any);

      expect(result.status).toBe(ACCUStatus.APPROVED);
      expect(result.approvalDate).toBeDefined();
    });

    it('should reject a submitted application', async () => {
      const submittedApplication = { ...mockApplication, status: ACCUStatus.SUBMITTED };
      const approvalDto = {
        approved: false,
        reason: 'Insufficient documentation',
        reviewerComments: 'Please provide more details',
      };

      const rejectedApplication = { ...submittedApplication, status: ACCUStatus.REJECTED };

      jest.spyOn(repository, 'findOne').mockResolvedValue(submittedApplication);
      jest.spyOn(repository, 'save').mockResolvedValue(rejectedApplication);

      const result = await service.approve('app-1', approvalDto as any);

      expect(result.status).toBe(ACCUStatus.REJECTED);
      expect(result.approvalDate).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated applications', async () => {
      const applications = [mockApplication];
      const queryDto = {
        page: 1,
        limit: 10,
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue(applications),
      } as any);

      const result = await service.findAll(queryDto as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
    });

    it('should filter applications by status', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        status: ACCUStatus.DRAFT,
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockApplication]),
      } as any);

      await service.findAll(queryDto as any);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return application by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);

      const result = await service.findOne('app-1');

      expect(result.id).toBe(mockApplication.id);
      expect(result.status).toBe(mockApplication.status);
    });

    it('should throw NotFoundException if application not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('app-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAnalytics', () => {
    it('should return application analytics', async () => {
      const documents = [
        { id: 'doc-1', name: 'Test Document' } as Document,
      ];

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);
      jest.spyOn(documentRepository, 'find').mockResolvedValue(documents);
      jest.spyOn(service as any, 'getRequiredDocumentsCount').mockReturnValue(3);
      jest.spyOn(service as any, 'calculateApplicationProgress').mockReturnValue(65);
      jest.spyOn(service as any, 'getNextDeadline').mockResolvedValue(null);
      jest.spyOn(service as any, 'isApplicationOverdue').mockReturnValue(false);
      jest.spyOn(service as any, 'getDaysUntilDate').mockReturnValue(15);
      jest.spyOn(service as any, 'getEstimatedProcessingTime').mockReturnValue(30);

      const result = await service.getAnalytics('app-1');

      expect(result.id).toBe(mockApplication.id);
      expect(result.progress).toBe(65);
      expect(result.documentCompletion).toBeCloseTo(33.33, 2);
      expect(result.requiredDocumentsCount).toBe(3);
      expect(result.submittedDocumentsCount).toBe(1);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const applications = [mockApplication];

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(applications),
      } as any);

      const result = await service.getDashboard('tenant-1');

      expect(result.totalApplications).toBe(1);
      expect(result.applicationsByStatus).toBeDefined();
      expect(result.pendingApplications).toBe(0);
      expect(result.overdueApplications).toBe(0);
    });
  });

  describe('remove', () => {
    it('should soft delete a draft application', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);
      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 1 });

      await service.remove('app-1');

      expect(repository.update).toHaveBeenCalledWith('app-1', expect.objectContaining({
        status: ACCUStatus.REJECTED,
      }));
    });

    it('should throw BadRequestException if trying to delete non-draft application', async () => {
      const submittedApplication = { ...mockApplication, status: ACCUStatus.SUBMITTED };
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(submittedApplication);

      await expect(service.remove('app-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('status transitions validation', () => {
    it('should validate correct status transitions', () => {
      const serviceInstance = service as any;
      
      expect(() => serviceInstance.validateStatusTransition(ACCUStatus.DRAFT, ACCUStatus.SUBMITTED)).not.toThrow();
      expect(() => serviceInstance.validateStatusTransition(ACCUStatus.SUBMITTED, ACCUStatus.UNDER_REVIEW)).not.toThrow();
      expect(() => serviceInstance.validateStatusTransition(ACCUStatus.UNDER_REVIEW, ACCUStatus.APPROVED)).not.toThrow();
      expect(() => serviceInstance.validateStatusTransition(ACCUStatus.APPROVED, ACCUStatus.ISSUED)).not.toThrow();
    });

    it('should throw BadRequestException for invalid transitions', () => {
      const serviceInstance = service as any;
      
      expect(() => serviceInstance.validateStatusTransition(ACCUStatus.DRAFT, ACCUStatus.APPROVED)).toThrow(BadRequestException);
      expect(() => serviceInstance.validateStatusTransition(ACCUStatus.DRAFT, ACCUStatus.UNDER_REVIEW)).toThrow(BadRequestException);
      expect(() => serviceInstance.validateStatusTransition(ACCUStatus.REJECTED, ACCUStatus.SUBMITTED)).toThrow(BadRequestException);
    });
  });

  describe('ACCUNotificationService', () => {
    it('should create status change notification', async () => {
      const notificationData = {
        type: 'success' as const,
        title: 'Application Submitted',
        message: 'Your application has been submitted',
        userId: 'user-1',
        tenantId: 'tenant-1',
        projectId: 'project-1',
        accuApplicationId: 'app-1',
      };

      jest.spyOn(notificationService as any, 'createNotification').mockResolvedValue({} as Notification);

      await notificationService.notifyStatusChange(
        mockApplication,
        ACCUStatus.DRAFT,
        ACCUStatus.SUBMITTED,
        'Ready for review',
        'All requirements met'
      );

      expect(notificationService as any, 'createNotification').toHaveBeenCalled();
    });

    it('should send deadline reminders', async () => {
      jest.spyOn(notificationService as any, 'createNotification').mockResolvedValue({} as Notification);

      await notificationService.sendDeadlineReminders(mockApplication, 7);

      expect(notificationService as any, 'createNotification').toHaveBeenCalled();
    });
  });
});