import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CERService } from '../../src/modules/cer/cer.service';
import { CERController } from '../../src/modules/cer/cer.controller';
import { AccuApplication } from '../../src/entities/accu-application.entity';
import { createMockAccuApplication } from '../setup/unit-setup';

describe('CERService', () => {
  let service: CERService;
  let httpService: any;
  let accuApplicationRepository: jest.Mocked<Repository<AccuApplication>>;

  const mockAccuApplication = createMockAccuApplication();

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    };

    const mockAccuApplicationRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CERService,
        {
          provide: 'HTTP_SERVICE',
          useValue: httpService,
        },
        {
          provide: getRepositoryToken(AccuApplication),
          useValue: mockAccuApplicationRepository,
        },
      ],
    }).compile();

    service = module.get<CERService>(CERService);
    accuApplicationRepository = module.get(getRepositoryToken(AccuApplication));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitApplication', () => {
    it('should submit ACCU application to CER API successfully', async () => {
      const applicationId = 'accu-app-123';
      const cerApiResponse = {
        status: 'success',
        reference: 'CER-2024-001',
        trackingId: 'track-123',
        submittedAt: new Date().toISOString(),
      };

      httpService.post.mockResolvedValue({ data: cerApiResponse });
      accuApplicationRepository.findOne.mockResolvedValue(mockAccuApplication);
      accuApplicationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.submitApplication(applicationId);

      expect(result).toEqual(cerApiResponse);
      expect(httpService.post).toHaveBeenCalled();
      expect(accuApplicationRepository.update).toHaveBeenCalledWith(
        applicationId,
        expect.objectContaining({
          serReference: cerApiResponse.reference,
        })
      );
    });

    it('should throw HttpException if application not found', async () => {
      const applicationId = 'non-existent-app';
      
      accuApplicationRepository.findOne.mockResolvedValue(null);

      await expect(service.submitApplication(applicationId)).rejects.toThrow(HttpException);
    });

    it('should handle CER API error responses', async () => {
      const applicationId = 'accu-app-123';
      const cerApiError = {
        status: 'error',
        message: 'Invalid application data',
        errors: ['Missing required field: location'],
      };

      httpService.post.mockRejectedValue({
        response: { data: cerApiError },
      });

      accuApplicationRepository.findOne.mockResolvedValue(mockAccuApplication);

      await expect(service.submitApplication(applicationId)).rejects.toThrow(HttpException);
    });

    it('should transform ACCU application data for CER API', async () => {
      const applicationId = 'accu-app-123';
      const accuAppWithData = {
        ...mockAccuApplication,
        applicationData: {
          description: 'Test application',
          location: {
            address: '123 Test St',
            coordinates: { lat: -33.8688, lng: 151.2093 },
            jurisdiction: 'NSW',
          },
          projectDetails: {
            type: 'renewable_energy',
            capacity: '100MW',
            technology: 'solar',
          },
        },
      };

      const expectedCerData = {
        applicationType: 'accu',
        description: 'Test application',
        location: {
          address: '123 Test St',
          coordinates: { lat: -33.8688, lng: 151.2093 },
          jurisdiction: 'NSW',
        },
        projectDetails: {
          type: 'renewable_energy',
          capacity: '100MW',
          technology: 'solar',
        },
        units: 1000,
        methodology: 'methodology-123',
      };

      httpService.post.mockResolvedValue({ data: { status: 'success', reference: 'CER-2024-001' } });
      accuApplicationRepository.findOne.mockResolvedValue(accuAppWithData);
      accuApplicationRepository.update.mockResolvedValue({ affected: 1 });

      await service.submitApplication(applicationId);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expectedCerData,
        expect.any(Object)
      );
    });
  });

  describe('checkApplicationStatus', () => {
    it('should check application status from CER API', async () => {
      const serReference = 'CER-2024-001';
      const cerStatusResponse = {
        status: 'approved',
        reference: serReference,
        submittedAt: '2024-01-15T10:00:00Z',
        reviewedAt: '2024-01-20T14:30:00Z',
        approvedAt: '2024-01-25T09:15:00Z',
        issues: [],
        nextSteps: 'Proceed with issuance',
      };

      httpService.get.mockResolvedValue({ data: cerStatusResponse });

      const result = await service.checkApplicationStatus(serReference);

      expect(result).toEqual(cerStatusResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining(`/applications/${serReference}/status`),
        expect.any(Object)
      );
    });

    it('should handle status check for non-existent reference', async () => {
      const serReference = 'CER-999-999';
      const cerError = {
        status: 'error',
        message: 'Application not found',
      };

      httpService.get.mockRejectedValue({
        response: { data: cerError, status: 404 },
      });

      await expect(service.checkApplicationStatus(serReference)).rejects.toThrow(HttpException);
    });

    it('should update ACCU application status based on CER response', async () => {
      const serReference = 'CER-2024-001';
      const cerStatusResponse = {
        status: 'approved',
        reference: serReference,
      };

      const applicationWithSerRef = {
        ...mockAccuApplication,
        serReference,
      };

      httpService.get.mockResolvedValue({ data: cerStatusResponse });
      accuApplicationRepository.findOne.mockResolvedValue(applicationWithSerRef);
      accuApplicationRepository.update.mockResolvedValue({ affected: 1 });

      await service.checkApplicationStatus(serReference);

      expect(accuApplicationRepository.update).toHaveBeenCalledWith(
        applicationWithSerRef.id,
        expect.objectContaining({
          status: 'approved',
        })
      );
    });
  });

  describe('withdrawApplication', () => {
    it('should withdraw application from CER', async () => {
      const serReference = 'CER-2024-001';
      const withdrawalResponse = {
        status: 'withdrawn',
        reference: serReference,
        withdrawnAt: new Date().toISOString(),
        reason: 'Client request',
      };

      httpService.delete.mockResolvedValue({ data: withdrawalResponse });

      const result = await service.withdrawApplication(serReference, 'Client request');

      expect(result).toEqual(withdrawalResponse);
      expect(httpService.delete).toHaveBeenCalledWith(
        expect.stringContaining(`/applications/${serReference}`),
        expect.objectContaining({
          data: { reason: 'Client request' },
        })
      );
    });

    it('should update ACCU application status when withdrawn', async () => {
      const serReference = 'CER-2024-001';
      const withdrawalResponse = {
        status: 'withdrawn',
        reference: serReference,
      };

      const applicationWithSerRef = {
        ...mockAccuApplication,
        serReference,
      };

      httpService.delete.mockResolvedValue({ data: withdrawalResponse });
      accuApplicationRepository.findOne.mockResolvedValue(applicationWithSerRef);
      accuApplicationRepository.update.mockResolvedValue({ affected: 1 });

      await service.withdrawApplication(serReference, 'Client request');

      expect(accuApplicationRepository.update).toHaveBeenCalledWith(
        applicationWithSerRef.id,
        expect.objectContaining({
          status: 'withdrawn',
        })
      );
    });
  });

  describe('getAvailableMethodologies', () => {
    it('should fetch available methodologies from CER', async () => {
      const methodologiesResponse = {
        status: 'success',
        methodologies: [
          {
            id: 'methodology-123',
            name: 'Solar PV Methodology',
            version: '1.0',
            description: 'Methodology for solar PV projects',
            validFrom: '2024-01-01',
            validTo: '2025-12-31',
            requirements: ['Project size >= 100kW', 'Grid connection required'],
          },
          {
            id: 'methodology-456',
            name: 'Wind Energy Methodology',
            version: '2.1',
            description: 'Methodology for wind energy projects',
            validFrom: '2024-01-01',
            validTo: '2026-12-31',
            requirements: ['Project size >= 5MW', 'Feasibility study required'],
          },
        ],
      };

      httpService.get.mockResolvedValue({ data: methodologiesResponse });

      const result = await service.getAvailableMethodologies();

      expect(result).toEqual(methodologiesResponse.methodologies);
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/methodologies'),
        expect.any(Object)
      );
    });

    it('should handle error when fetching methodologies', async () => {
      httpService.get.mockRejectedValue(new Error('Network error'));

      await expect(service.getAvailableMethodologies()).rejects.toThrow(HttpException);
    });
  });

  describe('validateApplicationData', () => {
    it('should validate application data against CER requirements', async () => {
      const applicationData = {
        description: 'Test application',
        location: {
          address: '123 Test St',
          coordinates: { lat: -33.8688, lng: 151.2093 },
          jurisdiction: 'NSW',
        },
        projectDetails: {
          type: 'renewable_energy',
          capacity: '100MW',
          technology: 'solar',
        },
      };

      const validationResponse = {
        status: 'valid',
        errors: [],
        warnings: [
          'Consider adding more detailed project description',
        ],
      };

      httpService.post.mockResolvedValue({ data: validationResponse });

      const result = await service.validateApplicationData(applicationData);

      expect(result).toEqual(validationResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/validate'),
        applicationData,
        expect.any(Object)
      );
    });

    it('should handle validation errors', async () => {
      const applicationData = {
        description: '',
        location: {
          address: '',
          coordinates: null,
        },
      };

      const validationResponse = {
        status: 'invalid',
        errors: [
          'Description is required',
          'Address is required',
          'Coordinates are required',
        ],
        warnings: [],
      };

      httpService.post.mockResolvedValue({ data: validationResponse });

      const result = await service.validateApplicationData(applicationData);

      expect(result.status).toBe('invalid');
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('estimateACCUUnits', () => {
    it('should estimate ACCU units based on project parameters', async () => {
      const projectParameters = {
        capacity: '100MW',
        technology: 'solar',
        capacityFactor: 0.25,
        operationalLife: 25,
        location: {
          jurisdiction: 'NSW',
          gridRegion: 'NEM',
        },
      };

      const estimationResponse = {
        status: 'success',
        estimatedUnits: 125000,
        methodology: 'solar-pv-methodology',
        confidence: 0.85,
        factors: {
          capacity: 100000,
          capacityFactor: 0.25,
          operationalLife: 25,
          jurisdictionMultiplier: 1.0,
        },
      };

      httpService.post.mockResolvedValue({ data: estimationResponse });

      const result = await service.estimateACCUUnits(projectParameters);

      expect(result).toEqual(estimationResponse);
      expect(result.estimatedUnits).toBe(125000);
    });

    it('should handle estimation errors gracefully', async () => {
      const projectParameters = {
        capacity: 'invalid',
        technology: 'unknown',
      };

      const errorResponse = {
        status: 'error',
        message: 'Invalid project parameters',
        errors: ['Invalid capacity value', 'Unknown technology'],
      };

      httpService.post.mockRejectedValue({
        response: { data: errorResponse },
      });

      await expect(service.estimateACCUUnits(projectParameters)).rejects.toThrow(HttpException);
    });
  });

  describe('getCERApiHealth', () => {
    it('should check CER API health status', async () => {
      const healthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
        uptime: 86400,
        services: {
          database: 'healthy',
          authentication: 'healthy',
          validation: 'healthy',
        },
      };

      httpService.get.mockResolvedValue({ data: healthResponse });

      const result = await service.getCERApiHealth();

      expect(result).toEqual(healthResponse);
      expect(result.status).toBe('healthy');
    });

    it('should handle CER API unavailability', async () => {
      httpService.get.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.getCERApiHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBeDefined();
    });
  });
});

describe('CERController', () => {
  let controller: CERController;
  let service: jest.Mocked<CERService>;

  beforeEach(async () => {
    const mockService = {
      submitApplication: jest.fn(),
      checkApplicationStatus: jest.fn(),
      withdrawApplication: jest.fn(),
      getAvailableMethodologies: jest.fn(),
      validateApplicationData: jest.fn(),
      estimateACCUUnits: jest.fn(),
      getCERApiHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CERController],
      providers: [
        {
          provide: CERService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CERController>(CERController);
    service = module.get<CERService>(CERService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitApplication', () => {
    it('should submit ACCU application', async () => {
      const applicationId = 'accu-app-123';
      const submitDto = {
        forceResubmit: false,
        notes: 'Initial submission',
      };

      const mockResponse = {
        status: 'success',
        reference: 'CER-2024-001',
        trackingId: 'track-123',
      };

      service.submitApplication.mockResolvedValue(mockResponse);

      const result = await controller.submitApplication(applicationId, submitDto);

      expect(service.submitApplication).toHaveBeenCalledWith(applicationId, submitDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkStatus', () => {
    it('should check application status', async () => {
      const serReference = 'CER-2024-001';

      const mockStatus = {
        status: 'approved',
        reference: serReference,
        submittedAt: '2024-01-15T10:00:00Z',
        approvedAt: '2024-01-25T09:15:00Z',
      };

      service.checkApplicationStatus.mockResolvedValue(mockStatus);

      const result = await controller.checkStatus(serReference);

      expect(service.checkApplicationStatus).toHaveBeenCalledWith(serReference);
      expect(result).toEqual(mockStatus);
    });
  });

  describe('withdrawApplication', () => {
    it('should withdraw application', async () => {
      const serReference = 'CER-2024-001';
      const withdrawDto = {
        reason: 'Client request',
        notes: 'Project cancelled',
      };

      const mockResponse = {
        status: 'withdrawn',
        reference: serReference,
        withdrawnAt: new Date().toISOString(),
      };

      service.withdrawApplication.mockResolvedValue(mockResponse);

      const result = await controller.withdrawApplication(serReference, withdrawDto);

      expect(service.withdrawApplication).toHaveBeenCalledWith(serReference, withdrawDto.reason, withdrawDto.notes);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMethodologies', () => {
    it('should return available methodologies', async () => {
      const methodologies = [
        {
          id: 'methodology-123',
          name: 'Solar PV Methodology',
          version: '1.0',
        },
      ];

      service.getAvailableMethodologies.mockResolvedValue(methodologies);

      const result = await controller.getMethodologies();

      expect(service.getAvailableMethodologies).toHaveBeenCalled();
      expect(result).toEqual(methodologies);
    });
  });

  describe('validateData', () => {
    it('should validate application data', async () => {
      const validationDto = {
        applicationData: {
          description: 'Test application',
          location: {
            address: '123 Test St',
            coordinates: { lat: -33.8688, lng: 151.2093 },
          },
        },
      };

      const validationResult = {
        status: 'valid',
        errors: [],
        warnings: [],
      };

      service.validateApplicationData.mockResolvedValue(validationResult);

      const result = await controller.validateData(validationDto);

      expect(service.validateApplicationData).toHaveBeenCalledWith(validationDto.applicationData);
      expect(result).toEqual(validationResult);
    });
  });

  describe('estimateUnits', () => {
    it('should estimate ACCU units', async () => {
      const estimateDto = {
        capacity: '100MW',
        technology: 'solar',
        capacityFactor: 0.25,
        operationalLife: 25,
      };

      const estimationResult = {
        estimatedUnits: 125000,
        confidence: 0.85,
      };

      service.estimateACCUUnits.mockResolvedValue(estimationResult);

      const result = await controller.estimateUnits(estimateDto);

      expect(service.estimateACCUUnits).toHaveBeenCalledWith(estimateDto);
      expect(result).toEqual(estimationResult);
    });
  });

  describe('healthCheck', () => {
    it('should return CER API health status', async () => {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.1.0',
      };

      service.getCERApiHealth.mockResolvedValue(healthStatus);

      const result = await controller.healthCheck();

      expect(service.getCERApiHealth).toHaveBeenCalled();
      expect(result).toEqual(healthStatus);
    });
  });
});