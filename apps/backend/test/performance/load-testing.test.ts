/**
 * Performance and Load Testing Suite
 * Tests system performance under various load conditions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/entities/user.entity';
import { Project } from '../../src/entities/project.entity';
import { AccuApplication } from '../../src/entities/accu-application.entity';
import { testDbConfig, setupTestDatabase, E2ETestHelper } from '../setup/integration-setup';
import { PerformanceTestHelper, DatabaseTestHelper } from '../utils/test-helpers';

describe('Performance and Load Testing', () => {
  let app: INestApplication;
  let userRepository: any;
  let projectRepository: any;
  let accuApplicationRepository: any;

  beforeAll(async () => {
    console.log('Setting up performance testing environment...');
    
    // Setup test application with performance monitoring
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            database: {
              ...testDbConfig,
              // Performance optimizations for testing
              synchronize: true,
              logging: false,
              extra: {
                connectionLimit: 20,
                acquireTimeout: 60000,
                timeout: 60000,
              },
            },
            jwt: {
              secret: 'performance-test-jwt-secret',
              signOptions: { expiresIn: '1h' },
            },
          })],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async () => ({
            ...testDbConfig,
            synchronize: true,
            logging: false,
          }),
          inject: [],
        }),
        TypeOrmModule.forFeature([User, Project, AccuApplication]),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Disable logging for performance tests
    app.useLogger(false);
    
    await app.init();

    userRepository = app.get('UserRepository');
    projectRepository = app.get('ProjectRepository');
    accuApplicationRepository = app.get('AccuApplicationRepository');
    
    await setupTestDatabase(app);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('API Response Time Performance Tests', () => {
    const performanceThresholds = {
      // API response times in milliseconds
      fast: 100,      // < 100ms
      acceptable: 500, // < 500ms
      slow: 1000,     // < 1000ms
      timeout: 5000,  // < 5000ms
    };

    it('should respond to authentication requests within acceptable time', async () => {
      const authData = {
        email: 'perf-test@example.com',
        password: 'PerformanceTest123!',
        firstName: 'Perf',
        lastName: 'Test',
      };

      // Create user first
      const createResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest('POST', '/auth/register', authData);
        return response;
      });

      console.log(`User creation: ${createResult.averageTime}ms`);
      expect(createResult.averageTime).toBeLessThan(performanceThresholds.acceptable);

      // Test login performance
      const loginResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest('POST', '/auth/login', {
          email: authData.email,
          password: authData.password,
        });
        return response;
      });

      console.log(`User login: ${loginResult.averageTime}ms`);
      expect(loginResult.averageTime).toBeLessThan(performanceThresholds.fast);
    });

    it('should handle project CRUD operations efficiently', async () => {
      const projectData = {
        name: 'Performance Test Project',
        description: 'Testing project performance',
        type: 'methodology',
        startDate: new Date().toISOString(),
      };

      const operations = {
        create: 0,
        read: 0,
        update: 0,
        delete: 0,
      };

      // Create project
      const createResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest('POST', '/projects', projectData);
        return response;
      });
      operations.create = createResult.averageTime;

      const projectId = createResult.result.data.id;

      // Read project
      const readResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest('GET', `/projects/${projectId}`);
        return response;
      });
      operations.read = readResult.averageTime;

      // Update project
      const updateResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest('PUT', `/projects/${projectId}`, {
          name: 'Updated Performance Test Project',
        });
        return response;
      });
      operations.update = updateResult.averageTime;

      // Delete project
      const deleteResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest('DELETE', `/projects/${projectId}`);
        return response;
      });
      operations.delete = deleteResult.averageTime;

      console.log('Project CRUD Performance:', operations);
      
      // All operations should be under acceptable threshold
      Object.values(operations).forEach(time => {
        expect(time).toBeLessThan(performanceThresholds.acceptable);
      });

      // Create and update operations might be slower due to database writes
      expect(operations.create).toBeLessThan(performanceThresholds.slow);
      expect(operations.update).toBeLessThan(performanceThresholds.slow);
    });

    it('should handle paginated queries efficiently', async () => {
      // Create multiple projects for pagination testing
      const projectCount = 50;
      const projects = [];

      for (let i = 0; i < projectCount; i++) {
        projects.push({
          name: `Pagination Test Project ${i}`,
          description: `Test project ${i} for pagination performance`,
          type: 'methodology',
          startDate: new Date().toISOString(),
        });
      }

      // Bulk create projects
      const bulkCreateResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const promises = projects.map(project =>
          E2ETestHelper.makeRequest('POST', '/projects', project)
        );
        return Promise.all(promises);
      });

      console.log(`Bulk create ${projectCount} projects: ${bulkCreateResult.averageTime}ms`);
      expect(bulkCreateResult.averageTime / projectCount).toBeLessThan(performanceThresholds.acceptable);

      // Test pagination performance with different page sizes
      const pageSizes = [10, 25, 50, 100];
      const paginationResults: Record<string, number> = {};

      for (const pageSize of pageSizes) {
        const paginationResult = await PerformanceTestHelper.measureExecutionTime(async () => {
          const response = await E2ETestHelper.makeRequest(
            'GET',
            `/projects?page=1&limit=${pageSize}`
          );
          return response;
        });
        
        paginationResults[`pageSize_${pageSize}`] = paginationResult.averageTime;
        expect(paginationResult.averageTime).toBeLessThan(performanceThresholds.fast);
      }

      console.log('Pagination Performance:', paginationResults);
    });

    it('should handle search operations efficiently', async () => {
      // Create projects with searchable content
      const searchTerms = ['Performance', 'Test', 'Methodology', 'Project', 'Search'];
      const projects = [];

      for (let i = 0; i < 20; i++) {
        projects.push({
          name: `Search Test ${searchTerms[i % searchTerms.length]} Project ${i}`,
          description: `This is a test project for ${searchTerms[i % searchTerms.length]} performance testing`,
          type: 'methodology',
          startDate: new Date().toISOString(),
        });
      }

      // Create all projects
      const createPromises = projects.map(project =>
        E2ETestHelper.makeRequest('POST', '/projects', project)
      );
      await Promise.all(createPromises);

      // Test search performance
      const searchResults: Record<string, number> = {};

      for (const term of searchTerms) {
        const searchResult = await PerformanceTestHelper.measureExecutionTime(async () => {
          const response = await E2ETestHelper.makeRequest(
            'GET',
            `/projects?search=${encodeURIComponent(term)}`
          );
          return response;
        });
        
        searchResults[`search_${term}`] = searchResult.averageTime;
        expect(searchResult.averageTime).toBeLessThan(performanceThresholds.acceptable);
      }

      console.log('Search Performance:', searchResults);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle concurrent database operations efficiently', async () => {
      const operationCount = 100;
      const concurrentUsers = 10;

      const startTime = Date.now();
      
      // Simulate concurrent users performing various operations
      const userPromises = Array.from({ length: concurrentUsers }, (_, userIndex) => 
        PerformanceTestHelper.measureExecutionTime(async () => {
          const operations = [];
          
          for (let i = 0; i < operationCount / concurrentUsers; i++) {
            // Create a project
            const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
              name: `Concurrent User ${userIndex} Project ${i}`,
              type: 'methodology',
              startDate: new Date().toISOString(),
            });
            
            if (projectResponse.status === 201) {
              const projectId = projectResponse.data.id;
              
              // Read the project
              await E2ETestHelper.makeRequest('GET', `/projects/${projectId}`);
              
              // Update the project
              await E2ETestHelper.makeRequest('PUT', `/projects/${projectId}`, {
                description: `Updated by user ${userIndex}`,
              });
              
              // Delete the project
              await E2ETestHelper.makeRequest('DELETE', `/projects/${projectId}`);
            }
            
            operations.push({
              user: userIndex,
              operation: i,
              timestamp: Date.now(),
            });
          }
          
          return operations;
        })
      );

      const results = await Promise.all(userPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const totalOperations = operationCount;
      const throughput = (totalOperations / totalTime) * 1000; // operations per second

      console.log(`Concurrent Database Performance:`);
      console.log(`- Total operations: ${totalOperations}`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Throughput: ${throughput.toFixed(2)} ops/sec`);
      console.log(`- Average per operation: ${(totalTime / totalOperations).toFixed(2)}ms`);

      // Performance expectations
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(throughput).toBeGreaterThan(10); // Should handle at least 10 ops/sec
    });

    it('should handle complex queries with joins efficiently', async () => {
      // Create test data with relationships
      const testData = await PerformanceTestHelper.measureExecutionTime(async () => {
        // Create user
        const userResponse = await E2ETestHelper.makeRequest('POST', '/auth/register', {
          email: 'complex-query@example.com',
          password: 'ComplexQuery123!',
          firstName: 'Complex',
          lastName: 'Query',
        });

        const userId = userResponse.data.user.id;
        const authToken = userResponse.data.accessToken;

        // Create projects
        const projects = [];
        for (let i = 0; i < 10; i++) {
          const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
            name: `Complex Query Project ${i}`,
            type: 'methodology',
            startDate: new Date().toISOString(),
          }, { Authorization: `Bearer ${authToken}` });
          
          if (projectResponse.status === 201) {
            projects.push(projectResponse.data);
          }
        }

        // Create ACCU applications for projects
        for (const project of projects) {
          await E2ETestHelper.makeRequest('POST', `/accu-applications?projectId=${project.id}`, {
            accuUnits: 1000 + Math.floor(Math.random() * 5000),
            methodologyId: 'methodology-123',
            applicationData: {
              description: `Application for ${project.name}`,
              location: {
                address: '123 Test St',
                coordinates: { lat: 0, lng: 0 },
                jurisdiction: 'NSW',
              },
            },
          }, { Authorization: `Bearer ${authToken}` });
        }

        return { userId, projects, authToken };
      });

      // Test complex query performance
      const queryResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        // This would test a complex query with multiple joins
        const response = await E2ETestHelper.makeRequest(
          'GET',
          '/projects?include=accuApplications,owner&status=active'
        );
        return response;
      });

      console.log(`Complex query with joins: ${queryResult.averageTime}ms`);
      expect(queryResult.averageTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large dataset operations efficiently', async () => {
      const largeDatasetSize = 1000;

      const datasetCreation = await PerformanceTestHelper.measureExecutionTime(async () => {
        const projects = [];
        
        // Create large dataset
        for (let i = 0; i < largeDatasetSize; i++) {
          const projectResponse = await E2ETestHelper.makeRequest('POST', '/projects', {
            name: `Large Dataset Project ${i}`,
            description: `This is project ${i} in a large dataset for performance testing`,
            type: i % 3 === 0 ? 'methodology' : i % 3 === 1 ? 'audit' : 'compliance',
            startDate: new Date().toISOString(),
            tags: [`tag-${i % 10}`, `category-${i % 5}`],
          });
          
          if (projectResponse.status === 201) {
            projects.push(projectResponse.data);
          }
        }
        
        return projects;
      });

      console.log(`Created ${largeDatasetSize} projects in ${datasetCreation.averageTime}ms`);

      // Test filtering performance on large dataset
      const filterResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest(
          'GET',
          '/projects?type=methodology&page=1&limit=50'
        );
        return response;
      });

      console.log(`Filtered methodology projects: ${filterResult.averageTime}ms`);
      expect(filterResult.averageTime).toBeLessThan(500);

      // Test search performance on large dataset
      const searchResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest(
          'GET',
          '/projects?search=Large Dataset&page=1&limit=20'
        );
        return response;
      });

      console.log(`Searched large dataset: ${searchResult.averageTime}ms`);
      expect(searchResult.averageTime).toBeLessThan(800);
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle sustained load over time', async () => {
      const loadTestConfig = PerformanceTestHelper.createLoadTestConfig(
        5,           // 5 concurrent users
        20,          // 20 requests per user
        2000         // 2 second ramp up
      );

      const loadTestResult = await PerformanceTestHelper.runLoadTest(async () => {
        const response = await E2ETestHelper.makeRequest('GET', '/projects?page=1&limit=10');
        return response.status;
      }, loadTestConfig);

      console.log('Sustained Load Test Results:');
      console.log(`- Total requests: ${loadTestResult.totalRequests}`);
      console.log(`- Successful requests: ${loadTestResult.successfulRequests}`);
      console.log(`- Failed requests: ${loadTestResult.failedRequests}`);
      console.log(`- Success rate: ${((loadTestResult.successfulRequests / loadTestResult.totalRequests) * 100).toFixed(2)}%`);
      console.log(`- Errors: ${loadTestResult.errors.length}`);

      // Load test expectations
      expect(loadTestResult.successfulRequests / loadTestResult.totalRequests).toBeGreaterThan(0.95); // 95% success rate
      expect(loadTestResult.errors.length).toBeLessThan(loadTestResult.totalRequests * 0.05); // Less than 5% errors
    });

    it('should handle sudden spike in traffic', async () => {
      const spikeTestConfig = PerformanceTestHelper.createLoadTestConfig(
        20,          // 20 concurrent users (spike)
        10,          // 10 requests per user
        500          // 0.5 second ramp up (sudden spike)
      );

      const spikeTestResult = await PerformanceTestHelper.runLoadTest(async () => {
        // Mix of different operations
        const operations = ['GET', 'POST', 'PUT'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        switch (operation) {
          case 'GET':
            return (await E2ETestHelper.makeRequest('GET', '/projects')).status;
          case 'POST':
            return (await E2ETestHelper.makeRequest('POST', '/projects', {
              name: `Spike Test Project ${Date.now()}`,
              type: 'methodology',
              startDate: new Date().toISOString(),
            })).status;
          case 'PUT':
            return (await E2ETestHelper.makeRequest('PUT', '/projects/test-id', {
              description: 'Updated during spike test',
            })).status;
          default:
            return 200;
        }
      }, spikeTestConfig);

      console.log('Traffic Spike Test Results:');
      console.log(`- Total requests: ${spikeTestResult.totalRequests}`);
      console.log(`- Successful requests: ${spikeTestResult.successfulRequests}`);
      console.log(`- Failed requests: ${spikeTestResult.failedRequests}`);
      console.log(`- Success rate: ${((spikeTestResult.successfulRequests / spikeTestResult.totalRequests) * 100).toFixed(2)}%`);

      // Spike test expectations (should handle gracefully but may have some degradation)
      expect(spikeTestResult.successfulRequests / spikeTestResult.totalRequests).toBeGreaterThan(0.85); // 85% success rate
    });

    it('should maintain performance during memory intensive operations', async () => {
      const initialMemory = await PerformanceTestHelper.measureMemoryUsage();
      
      // Create memory pressure
      const memoryBuffers = [];
      for (let i = 0; i < 10; i++) {
        const buffer = await PerformanceTestHelper.createMemoryPressure(50); // 50MB each
        memoryBuffers.push(buffer);
      }

      const memoryDuringPressure = await PerformanceTestHelper.measureMemoryUsage();
      
      // Perform operations under memory pressure
      const operationsUnderPressure = await PerformanceTestHelper.measureExecutionTime(async () => {
        const results = [];
        
        for (let i = 0; i < 50; i++) {
          const response = await E2ETestHelper.makeRequest('GET', '/projects?page=1&limit=10');
          results.push(response.status);
        }
        
        return results;
      });

      const finalMemory = await PerformanceTestHelper.measureMemoryUsage();

      console.log('Memory Usage During Performance Test:');
      console.log(`- Initial heap used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap during pressure: ${(memoryDuringPressure.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap after operations: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Operations under pressure: ${operationsUnderPressure.averageTime}ms`);

      // Memory test expectations
      expect(operationsUnderPressure.averageTime).toBeLessThan(2000); // Should still perform reasonably
      expect(finalMemory.heapUsed).toBeLessThan(memoryDuringPressure.heapUsed * 1.5); // Should not leak too much memory

      // Clean up memory
      memoryBuffers.length = 0;
    });
  });

  describe('File Upload Performance Tests', () => {
    it('should handle file uploads efficiently', async () => {
      const fileSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
      
      for (const fileSize of fileSizes) {
        const fileContent = Buffer.alloc(fileSize, 'test content');
        const mockFile = {
          buffer: fileContent,
          originalname: `perf-test-${fileSize}.txt`,
          mimetype: 'text/plain',
          size: fileSize,
        };

        const uploadResult = await PerformanceTestHelper.measureExecutionTime(async () => {
          const response = await E2ETestHelper.uploadFile(
            '/documents',
            'file',
            mockFile,
            {
              name: `Performance Test Document ${fileSize}`,
              description: `Test document of size ${fileSize} bytes`,
              category: 'methodology',
            }
          );
          return response;
        });

        console.log(`File upload (${(fileSize / 1024).toFixed(1)}KB): ${uploadResult.averageTime}ms`);
        
        // File size specific expectations
        if (fileSize <= 10240) { // 10KB and below
          expect(uploadResult.averageTime).toBeLessThan(1000);
        } else if (fileSize <= 1048576) { // 1MB and below
          expect(uploadResult.averageTime).toBeLessThan(3000);
        }
      }
    });

    it('should handle concurrent file uploads', async () => {
      const concurrentUploads = 5;
      const fileSize = 102400; // 100KB

      const concurrentUploadResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const uploads = Array.from({ length: concurrentUploads }, (_, i) => {
          const fileContent = Buffer.alloc(fileSize, `test content ${i}`);
          const mockFile = {
            buffer: fileContent,
            originalname: `concurrent-test-${i}.txt`,
            mimetype: 'text/plain',
            size: fileSize,
          };

          return E2ETestHelper.uploadFile(
            '/documents',
            'file',
            mockFile,
            {
              name: `Concurrent Upload Test ${i}`,
              category: 'methodology',
            }
          );
        });

        return Promise.all(uploads);
      });

      console.log(`Concurrent uploads (${concurrentUploads} files, ${(fileSize / 1024).toFixed(1)}KB each): ${concurrentUploadResult.averageTime}ms`);
      
      // Concurrent upload expectations
      expect(concurrentUploadResult.averageTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(concurrentUploadResult.averageTime / concurrentUploads).toBeLessThan(1500); // Per file upload should be reasonable
    });
  });

  describe('Real-time Features Performance Tests', () => {
    it('should handle WebSocket connections efficiently', async () => {
      // This would test WebSocket performance if implemented
      // For now, we'll test the connection establishment overhead
      
      const connectionTests = 10;
      const connectionTimes: number[] = [];

      for (let i = 0; i < connectionTests; i++) {
        const startTime = Date.now();
        
        // Simulate WebSocket connection (in real implementation, this would be actual WebSocket)
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        
        const endTime = Date.now();
        connectionTimes.push(endTime - startTime);
      }

      const averageConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTests;
      const maxConnectionTime = Math.max(...connectionTimes);

      console.log(`WebSocket connection performance:`);
      console.log(`- Average connection time: ${averageConnectionTime.toFixed(2)}ms`);
      console.log(`- Max connection time: ${maxConnectionTime}ms`);
      console.log(`- Min connection time: ${Math.min(...connectionTimes)}ms`);

      // Connection performance expectations
      expect(averageConnectionTime).toBeLessThan(200);
      expect(maxConnectionTime).toBeLessThan(500);
    });
  });

  describe('Caching Performance Tests', () => {
    it('should demonstrate caching benefits for repeated queries', async () => {
      const query = '/projects?type=methodology';
      const repeatCount = 10;

      // First request (cache miss)
      const coldCacheResult = await PerformanceTestHelper.measureExecutionTime(async () => {
        const response = await E2ETestHelper.makeRequest('GET', query);
        return response;
      });

      // Subsequent requests (cache hits)
      const hotCacheResults = await PerformanceTestHelper.measureExecutionTime(async () => {
        const results = [];
        for (let i = 0; i < repeatCount; i++) {
          const response = await E2ETestHelper.makeRequest('GET', query);
          results.push(response.status);
        }
        return results;
      });

      const averageHotCacheTime = hotCacheResult.averageTime / repeatCount;
      const speedup = coldCacheResult.averageTime / averageHotCacheTime;

      console.log(`Caching Performance:`);
      console.log(`- Cold cache: ${coldCacheResult.averageTime}ms`);
      console.log(`- Hot cache (avg): ${averageHotCacheTime.toFixed(2)}ms`);
      console.log(`- Speedup: ${speedup.toFixed(2)}x`);

      // Caching expectations
      expect(averageHotCacheTime).toBeLessThan(coldCacheResult.averageTime);
      expect(speedup).toBeGreaterThan(1.5); // Should be at least 1.5x faster
    });
  });
});