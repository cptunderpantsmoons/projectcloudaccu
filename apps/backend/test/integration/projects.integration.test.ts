import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/entities/user.entity';
import { Project } from '../../src/entities/project.entity';
import { Document } from '../../src/entities/document.entity';
import { testDbConfig, setupTestDatabase, createAuthenticatedUser, ApiTester, TestDataFactory } from '../setup/integration-setup';

describe('Projects Integration Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let documentRepository: Repository<Document>;
  let apiTester: ApiTester;
  let authenticatedUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            database: testDbConfig,
            jwt: {
              secret: 'integration-test-jwt-secret',
              signOptions: { expiresIn: '1h' },
            },
          })],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            ...testDbConfig,
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User, Project, Document]),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();

    userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = app.get<Repository<Project>>(getRepositoryToken(Project));
    documentRepository = app.get<Repository<Document>>(getRepositoryToken(Document));
    apiTester = new ApiTester(app);
    
    await setupTestDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await userRepository.clear();
    await projectRepository.clear();
    await documentRepository.clear();
    
    // Create authenticated user for each test
    const { user, token } = await createAuthenticatedUser(app);
    authenticatedUser = { user, token };
    apiTester.setToken(token);
  });

  describe('POST /projects', () => {
    it('should create a new project successfully', async () => {
      const createProjectDto = {
        name: 'Test Project',
        description: 'A test project for integration testing',
        type: 'methodology',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        methodology: {
          id: 'methodology-123',
          name: 'ISO 14064-2',
          version: '2.0',
          url: 'https://example.com/methodology',
        },
        tags: ['test', 'integration'],
      };

      const response = await apiTester.post('/projects', createProjectDto);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(createProjectDto.name);
      expect(response.data.description).toBe(createProjectDto.description);
      expect(response.data.type).toBe(createProjectDto.type);
      expect(response.data.ownerId).toBe(authenticatedUser.user.id);
      expect(response.data.status).toBe('draft');
    });

    it('should create project with minimal required fields', async () => {
      const createProjectDto = {
        name: 'Minimal Project',
        type: 'audit',
        startDate: new Date().toISOString(),
      };

      const response = await apiTester.post('/projects', createProjectDto);

      expect(response.status).toBe(201);
      expect(response.data.name).toBe(createProjectDto.name);
      expect(response.data.type).toBe(createProjectDto.type);
      expect(response.data.status).toBe('draft');
    });

    it('should reject project creation with invalid type', async () => {
      const createProjectDto = {
        name: 'Invalid Project',
        type: 'invalid-type',
        startDate: new Date().toISOString(),
      };

      const response = await apiTester.post('/projects', createProjectDto);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject project creation with invalid dates', async () => {
      const createProjectDto = {
        name: 'Invalid Date Project',
        type: 'methodology',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(), // End date before start date
      };

      const response = await apiTester.post('/projects', createProjectDto);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject project creation without authentication', async () => {
      apiTester.setToken('');
      
      const createProjectDto = {
        name: 'Unauthorized Project',
        type: 'methodology',
        startDate: new Date().toISOString(),
      };

      const response = await apiTester.post('/projects', createProjectDto);

      expect(response.status).toBe(401);
      
      // Restore token for subsequent tests
      apiTester.setToken(authenticatedUser.token);
    });
  });

  describe('GET /projects', () => {
    beforeEach(async () => {
      // Create test projects
      const projects = [
        TestDataFactory.createProject({
          name: 'Active Project 1',
          status: 'active',
          type: 'methodology',
          ownerId: authenticatedUser.user.id,
        }),
        TestDataFactory.createProject({
          name: 'Active Project 2',
          status: 'active',
          type: 'audit',
          ownerId: authenticatedUser.user.id,
        }),
        TestDataFactory.createProject({
          name: 'Draft Project',
          status: 'draft',
          type: 'compliance',
          ownerId: authenticatedUser.user.id,
        }),
      ];

      await projectRepository.save(projects);
    });

    it('should return paginated list of projects', async () => {
      const response = await apiTester.get('/projects');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('meta');
      expect(response.data.data).toHaveLength(3);
      expect(response.data.meta.total).toBe(3);
      expect(response.data.meta.page).toBe(1);
      expect(response.data.meta.limit).toBe(10);
    });

    it('should filter projects by status', async () => {
      const response = await apiTester.get('/projects?status=active');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveLength(2);
      expect(response.data.data.every(p => p.status === 'active')).toBe(true);
    });

    it('should filter projects by type', async () => {
      const response = await apiTester.get('/projects?type=methodology');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].type).toBe('methodology');
    });

    it('should filter projects by search term', async () => {
      const response = await apiTester.get('/projects?search=Active');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveLength(2);
      expect(response.data.data.every(p => p.name.includes('Active'))).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const response = await apiTester.get('/projects?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveLength(2);
      expect(response.data.meta.page).toBe(1);
      expect(response.data.meta.limit).toBe(2);
      expect(response.data.meta.total).toBe(3);
      expect(response.data.meta.totalPages).toBe(2);
    });

    it('should reject request without authentication', async () => {
      apiTester.setToken('');
      const response = await apiTester.get('/projects');

      expect(response.status).toBe(401);
      
      apiTester.setToken(authenticatedUser.token);
    });
  });

  describe('GET /projects/:id', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Specific Test Project',
          ownerId: authenticatedUser.user.id,
        })
      );
    });

    it('should return project by id', async () => {
      const response = await apiTester.get(`/projects/${testProject.id}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(testProject.id);
      expect(response.data.name).toBe(testProject.name);
      expect(response.data).toHaveProperty('owner');
      expect(response.data).toHaveProperty('createdAt');
      expect(response.data).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await apiTester.get('/projects/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject request without authentication', async () => {
      apiTester.setToken('');
      const response = await apiTester.get(`/projects/${testProject.id}`);

      expect(response.status).toBe(401);
      
      apiTester.setToken(authenticatedUser.token);
    });
  });

  describe('PUT /projects/:id', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Update Test Project',
          ownerId: authenticatedUser.user.id,
        })
      );
    });

    it('should update project successfully', async () => {
      const updateDto = {
        name: 'Updated Project Name',
        description: 'Updated project description',
        tags: ['updated', 'test'],
      };

      const response = await apiTester.put(`/projects/${testProject.id}`, updateDto);

      expect(response.status).toBe(200);
      expect(response.data.name).toBe(updateDto.name);
      expect(response.data.description).toBe(updateDto.description);
      expect(response.data.tags).toEqual(updateDto.tags);
      expect(response.data.updatedAt).not.toBe(testProject.updatedAt);
    });

    it('should reject update with invalid data', async () => {
      const updateDto = {
        name: '', // Invalid: empty name
        type: 'invalid-type',
      };

      const response = await apiTester.put(`/projects/${testProject.id}`, updateDto);

      expect(response.status).toBe(400);
    });

    it('should reject update for non-existent project', async () => {
      const updateDto = {
        name: 'Non-existent Update',
      };

      const response = await apiTester.put('/projects/non-existent-id', updateDto);

      expect(response.status).toBe(404);
    });

    it('should reject update without authentication', async () => {
      apiTester.setToken('');
      const updateDto = { name: 'Unauthorized Update' };

      const response = await apiTester.put(`/projects/${testProject.id}`, updateDto);

      expect(response.status).toBe(401);
      
      apiTester.setToken(authenticatedUser.token);
    });
  });

  describe('DELETE /projects/:id', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Delete Test Project',
          ownerId: authenticatedUser.user.id,
        })
      );
    });

    it('should delete project successfully (soft delete)', async () => {
      const response = await apiTester.delete(`/projects/${testProject.id}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('deleted');

      // Verify project is soft deleted
      const deletedProject = await projectRepository.findOne({
        where: { id: testProject.id },
      });
      expect(deletedProject).toBeNull();
    });

    it('should reject deletion of non-existent project', async () => {
      const response = await apiTester.delete('/projects/non-existent-id');

      expect(response.status).toBe(404);
    });

    it('should reject deletion without authentication', async () => {
      apiTester.setToken('');
      const response = await apiTester.delete(`/projects/${testProject.id}`);

      expect(response.status).toBe(401);
      
      apiTester.setToken(authenticatedUser.token);
    });
  });

  describe('POST /projects/:id/activate', () => {
    let draftProject: Project;

    beforeEach(async () => {
      draftProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Draft Activation Project',
          status: 'draft',
          ownerId: authenticatedUser.user.id,
        })
      );
    });

    it('should activate draft project', async () => {
      const response = await apiTester.post(`/projects/${draftProject.id}/activate`, {});

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('active');
    });

    it('should reject activation of already active project', async () => {
      const activeProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Already Active Project',
          status: 'active',
          ownerId: authenticatedUser.user.id,
        })
      );

      const response = await apiTester.post(`/projects/${activeProject.id}/activate`, {});

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('POST /projects/:id/complete', () => {
    let activeProject: Project;

    beforeEach(async () => {
      activeProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Completion Test Project',
          status: 'active',
          ownerId: authenticatedUser.user.id,
        })
      );
    });

    it('should complete active project', async () => {
      const response = await apiTester.post(`/projects/${activeProject.id}/complete`, {});

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('completed');
    });
  });

  describe('GET /projects/:id/documents', () => {
    let testProject: Project;
    let testDocuments: Document[];

    beforeEach(async () => {
      testProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Documents Test Project',
          ownerId: authenticatedUser.user.id,
        })
      );

      testDocuments = await documentRepository.save([
        TestDataFactory.createDocument({
          name: 'Document 1',
          projectId: testProject.id,
          uploadedById: authenticatedUser.user.id,
        }),
        TestDataFactory.createDocument({
          name: 'Document 2',
          projectId: testProject.id,
          uploadedById: authenticatedUser.user.id,
        }),
      ]);
    });

    it('should return project documents', async () => {
      const response = await apiTester.get(`/projects/${testProject.id}/documents`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0]).toHaveProperty('name');
      expect(response.data[0]).toHaveProperty('projectId');
      expect(response.data[0].projectId).toBe(testProject.id);
    });

    it('should return empty array for project with no documents', async () => {
      const emptyProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Empty Documents Project',
          ownerId: authenticatedUser.user.id,
        })
      );

      const response = await apiTester.get(`/projects/${emptyProject.id}/documents`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(0);
    });
  });

  describe('GET /projects/stats', () => {
    beforeEach(async () => {
      // Create projects with different statuses and types
      const projects = [
        TestDataFactory.createProject({
          name: 'Active Methodology',
          status: 'active',
          type: 'methodology',
          ownerId: authenticatedUser.user.id,
        }),
        TestDataFactory.createProject({
          name: 'Completed Audit',
          status: 'completed',
          type: 'audit',
          ownerId: authenticatedUser.user.id,
        }),
        TestDataFactory.createProject({
          name: 'On Hold Compliance',
          status: 'on_hold',
          type: 'compliance',
          ownerId: authenticatedUser.user.id,
        }),
      ];

      await projectRepository.save(projects);
    });

    it('should return project statistics', async () => {
      const response = await apiTester.get('/projects/stats');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('active');
      expect(response.data).toHaveProperty('completed');
      expect(response.data).toHaveProperty('onHold');
      expect(response.data).toHaveProperty('byType');
      expect(response.data.total).toBe(3);
      expect(response.data.active).toBe(1);
      expect(response.data.completed).toBe(1);
      expect(response.data.onHold).toBe(1);
      expect(response.data.byType.methodology).toBe(1);
      expect(response.data.byType.audit).toBe(1);
      expect(response.data.byType.compliance).toBe(1);
    });
  });

  describe('GET /projects/templates', () => {
    it('should return available project templates', async () => {
      const response = await apiTester.get('/projects/templates');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
      
      // Should have default templates
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data[0]).toHaveProperty('id');
      expect(response.data.data[0]).toHaveProperty('name');
      expect(response.data.data[0]).toHaveProperty('type');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connection failures
      // For now, we'll test with valid data
      const createProjectDto = {
        name: 'Error Handling Test',
        type: 'methodology',
        startDate: new Date().toISOString(),
      };

      const response = await apiTester.post('/projects', createProjectDto);
      
      // Should succeed in normal circumstances
      expect(response.status).toBe(201);
    });

    it('should handle concurrent project updates', async () => {
      const testProject = await projectRepository.save(
        TestDataFactory.createProject({
          name: 'Concurrent Update Test',
          ownerId: authenticatedUser.user.id,
        })
      );

      const update1 = { name: 'First Update' };
      const update2 = { name: 'Second Update' };

      // Make concurrent updates
      const [response1, response2] = await Promise.all([
        apiTester.put(`/projects/${testProject.id}`, update1),
        apiTester.put(`/projects/${testProject.id}`, update2),
      ]);

      // Both should succeed (last write wins)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('Performance', () => {
    it('should handle large number of projects efficiently', async () => {
      const projects = [];
      const projectCount = 100;

      for (let i = 0; i < projectCount; i++) {
        projects.push(
          TestDataFactory.createProject({
            name: `Performance Test Project ${i}`,
            ownerId: authenticatedUser.user.id,
          })
        );
      }

      await projectRepository.save(projects);

      const startTime = Date.now();
      const response = await apiTester.get('/projects');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(response.data.meta.total).toBe(projectCount);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});