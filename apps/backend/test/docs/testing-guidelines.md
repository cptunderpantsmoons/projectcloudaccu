# ACCU Platform Testing Guidelines

## Overview

This document provides comprehensive guidelines for writing, running, and maintaining tests for the ACCU Platform. The testing framework follows industry best practices and ensures high code quality, reliability, and maintainability.

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Test Types](#test-types)
3. [Test Organization](#test-organization)
4. [Writing Unit Tests](#writing-unit-tests)
5. [Writing Integration Tests](#writing-integration-tests)
6. [Writing E2E Tests](#writing-e2e-tests)
7. [Performance Testing](#performance-testing)
8. [Test Coverage](#test-coverage)
9. [Running Tests](#running-tests)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Testing Architecture

### Testing Pyramid

The ACCU Platform follows the testing pyramid approach:

```
        /\
       /  \
      /E2E \    ← End-to-End Tests (Few)
     /------\
    /Integration\ ← Integration Tests (Some)
   /------------\
  /Unit Tests  \ ← Unit Tests (Many)
 /--------------\
```

- **Unit Tests (70%)**: Fast, isolated, test individual components
- **Integration Tests (20%)**: Test interactions between components
- **E2E Tests (10%)**: Test complete user workflows

### Test Environments

1. **Unit Tests**: Isolated, no external dependencies
2. **Integration Tests**: Real database, mocked external services
3. **E2E Tests**: Full application stack, real services

## Test Types

### Unit Tests
- **Purpose**: Test individual functions, methods, and components in isolation
- **Speed**: Very fast (< 100ms per test)
- **Dependencies**: Mocked
- **Coverage Target**: 80%+

### Integration Tests
- **Purpose**: Test component interactions and API endpoints
- **Speed**: Moderate (100ms - 2s per test)
- **Dependencies**: Real database, mocked external services
- **Coverage Target**: 70%+

### End-to-End Tests
- **Purpose**: Test complete user workflows
- **Speed**: Slow (1s - 30s per test)
- **Dependencies**: Real everything
- **Coverage Target**: Critical paths only

### Performance Tests
- **Purpose**: Ensure system performance under load
- **Speed**: Variable
- **Dependencies**: Load testing tools
- **Targets**: Response times, throughput, resource usage

## Test Organization

### Directory Structure

```
apps/backend/test/
├── setup/                 # Test setup and configuration
│   ├── unit-setup.ts
│   ├── integration-setup.ts
│   ├── e2e-setup.ts
│   └── integration-env.ts
├── utils/                 # Test utilities and helpers
│   └── test-helpers.ts
├── coverage/              # Coverage analysis tools
│   └── coverage-report.ts
├── performance/           # Performance and load tests
│   └── load-testing.test.ts
├── integration/           # Integration tests
│   ├── auth.integration.test.ts
│   └── projects.integration.test.ts
├── e2e/                   # End-to-end tests
│   └── accu-application-lifecycle.e2e.test.ts
├── users/                 # Module-specific tests
│   └── users.unit.test.ts
├── auth/
├── cer/
├── email/
├── file-storage/
├── notifications/
└── docs/                  # Testing documentation
    └── testing-guidelines.md
```

### Test File Naming Convention

- **Unit Tests**: `{module}.unit.test.ts`
- **Integration Tests**: `{module}.integration.test.ts`
- **E2E Tests**: `{workflow}.e2e.test.ts`
- **Performance Tests**: `{type}.test.ts`

## Writing Unit Tests

### Basic Structure

```typescript
describe('ModuleName', () => {
  let service: ModuleService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleService,
        {
          provide: getRepositoryToken(Entity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ModuleService>(ModuleService);
    repository = module.get(getRepositoryToken(Entity));
  });

  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test input';
      const expectedOutput = 'expected output';
      jest.spyOn(repository, 'method').mockResolvedValue(expectedOutput);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBe(expectedOutput);
      expect(repository.method).toHaveBeenCalledWith(input);
    });

    it('should handle error case', async () => {
      // Test error handling
      jest.spyOn(repository, 'method').mockRejectedValue(new Error('Database error'));

      await expect(service.methodName('invalid')).rejects.toThrow('Database error');
    });
  });
});
```

### Best Practices for Unit Tests

1. **Follow AAA Pattern**:
   - **Arrange**: Set up test data and mocks
   - **Act**: Execute the method being tested
   - **Assert**: Verify the results

2. **Use Descriptive Test Names**:
   ```typescript
   // Good
   it('should return user by id when user exists', async () => {
   
   // Bad
   it('should return user', async () => {
   ```

3. **Test One Thing Per Test**:
   ```typescript
   // Good
   it('should create user with valid data', async () => {
   
   // Bad - testing multiple things
   it('should create and authenticate user', async () => {
   ```

4. **Use Appropriate Matchers**:
   ```typescript
   // Use specific matchers
   expect(result).toHaveProperty('id');
   expect(result.name).toBe('expected name');
   
   // Avoid generic matchers when possible
   expect(result).toMatchObject(expectedObject);
   ```

5. **Mock External Dependencies**:
   ```typescript
   // Mock database calls
   jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
   
   // Mock external services
   jest.mock('../../src/modules/external/service', () => ({
     ExternalService: jest.fn().mockImplementation(() => ({
       call: jest.fn().mockResolvedValue({ data: 'mocked' }),
     })),
   }));
   ```

## Writing Integration Tests

### API Integration Test Structure

```typescript
describe('Module Integration Tests', () => {
  let app: INestApplication;
  let apiTester: ApiTester;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot(testDbConfig),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    apiTester = new ApiTester(app);
    await setupTestDatabase(app);
  });

  describe('POST /api/endpoint', () => {
    it('should create resource successfully', async () => {
      // Arrange
      const createDto = { name: 'Test Resource' };

      // Act
      const response = await apiTester.post('/api/endpoint', createDto);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.name).toBe(createDto.name);
    });

    it('should validate input data', async () => {
      const invalidDto = { name: '' };

      const response = await apiTester.post('/api/endpoint', invalidDto);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });
  });
});
```

### Best Practices for Integration Tests

1. **Set Up Real Dependencies**:
   ```typescript
   const testDbConfig = {
     type: 'postgres',
     host: process.env.TEST_DB_HOST,
     database: 'accu_platform_test',
     synchronize: true, // Only for tests
   };
   ```

2. **Clean Database Between Tests**:
   ```typescript
   beforeEach(async () => {
     await userRepository.clear();
     await projectRepository.clear();
   });
   ```

3. **Test HTTP Status Codes**:
   ```typescript
   expect(response.status).toBe(201); // Created
   expect(response.status).toBe(400); // Bad Request
   expect(response.status).toBe(401); // Unauthorized
   ```

4. **Test Authentication**:
   ```typescript
   // Without authentication
   const response = await apiTester.post('/protected-endpoint', data);
   expect(response.status).toBe(401);

   // With authentication
   apiTester.setToken(validToken);
   const response = await apiTester.post('/protected-endpoint', data);
   expect(response.status).toBe(201);
   ```

## Writing E2E Tests

### E2E Test Structure

```typescript
describe('User Workflow E2E Tests', () => {
  let e2eTester: E2EWorkflowTester;

  beforeAll(async () => {
    app = E2ETestHelper.getApp();
    e2eTester = E2ETestHelper.getE2ETester();
  });

  it('should complete user registration workflow', async () => {
    // Step 1: Register user
    const userData = {
      email: 'e2e-test@example.com',
      password: 'SecurePassword123!',
      firstName: 'E2E',
      lastName: 'Test',
    };

    const registerResponse = await e2eTester.createTestUser(userData);
    expect(registerResponse.id).toHaveValidId();

    // Step 2: Login
    const authData = await e2eTester.authenticate(userData.email, userData.password);
    expect(authData.accessToken).toBeDefined();

    // Step 3: Create resource
    e2eTester.setApiToken(authData.accessToken);
    const projectResponse = await e2eTester.createTestProject({
      name: 'E2E Test Project',
    });
    expect(projectResponse.id).toHaveValidId();

    // Step 4: Verify workflow completion
    const projects = await E2ETestHelper.makeRequest('GET', '/projects');
    expect(projects.data.data).toHaveLength(1);
  });
});
```

### Best Practices for E2E Tests

1. **Test Real User Scenarios**:
   - Focus on user journeys and business value
   - Test complete workflows from start to finish

2. **Use Realistic Data**:
   ```typescript
   const realisticProject = {
     name: 'Solar Farm Development Project',
     description: 'Large-scale solar farm development in regional NSW',
     type: 'methodology',
     // ... realistic data
   };
   ```

3. **Handle Asynchronous Operations**:
   ```typescript
   // Wait for background processes
   await new Promise(resolve => setTimeout(resolve, 2000));
   
   // Or poll for status
   let attempts = 0;
   while (attempts < 10) {
     const status = await checkStatus();
     if (status === 'completed') break;
     await new Promise(resolve => setTimeout(resolve, 1000));
     attempts++;
   }
   ```

4. **Clean Up Test Data**:
   ```typescript
   afterEach(async () => {
     await cleanupTestData();
   });
   ```

## Performance Testing

### Load Testing Example

```typescript
describe('Performance Tests', () => {
  it('should handle concurrent requests', async () => {
    const concurrentUsers = 10;
    const requestsPerUser = 20;

    const loadTestConfig = PerformanceTestHelper.createLoadTestConfig(
      concurrentUsers,
      requestsPerUser
    );

    const result = await PerformanceTestHelper.runLoadTest(async () => {
      const response = await E2ETestHelper.makeRequest('GET', '/projects');
      return response.status;
    }, loadTestConfig);

    expect(result.successfulRequests / result.totalRequests).toBeGreaterThan(0.95);
  });
});
```

### Performance Targets

- **API Response Time**: < 500ms for 95% of requests
- **Database Queries**: < 100ms for simple queries
- **File Uploads**: < 2s for files < 10MB
- **Concurrent Users**: Support 100+ concurrent users
- **Throughput**: 1000+ requests per minute

## Test Coverage

### Coverage Targets

| Metric | Target | Minimum |
|--------|--------|---------|
| Statements | 80% | 70% |
| Branches | 70% | 60% |
| Functions | 80% | 70% |
| Lines | 80% | 70% |

### Coverage Commands

```bash
# Run tests with coverage
npm run test:cov

# Generate coverage report
npm run test:coverage:report

# Check coverage thresholds
npm run test:coverage:check
```

### Coverage Analysis

The coverage analyzer provides:
- Overall coverage metrics
- Module-by-module breakdown
- Quality gate evaluation
- Historical trends
- HTML and Markdown reports

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- users/users.unit.test.ts

# Run tests in watch mode
npm run test:unit:watch

# Run tests with coverage
npm run test:unit:cov
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- auth.integration.test.ts

# Run with database
npm run test:integration:db
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- accu-application-lifecycle.e2e.test.ts

# Run with full stack
npm run test:e2e:full
```

### Performance Tests

```bash
# Run performance tests
npm run test:performance

# Run load tests
npm run test:load

# Run stress tests
npm run test:stress
```

### All Tests

```bash
# Run all tests
npm test

# Run tests in CI mode
npm run test:ci

# Run tests with coverage for CI
npm run test:ci:cov
```

## Best Practices

### Test Data Management

1. **Use Factories**:
   ```typescript
   const user = TestDataFactory.createUser({
     email: 'test@example.com',
     role: 'admin',
   });
   ```

2. **Clean Data**:
   ```typescript
   afterEach(async () => {
     await DatabaseTestHelper.cleanTable(userRepository);
   });
   ```

3. **Avoid Hard-coded Data**:
   ```typescript
   // Good
   const user = TestDataFactory.createUser();
   
   // Avoid
   const user = { id: '123', email: 'test@example.com' };
   ```

### Mocking Strategy

1. **Mock External Services**:
   ```typescript
   jest.mock('../../src/modules/email/email.service');
   ```

2. **Mock Database Queries**:
   ```typescript
   jest.spyOn(repository, 'findOne').mockResolvedValue(mockData);
   ```

3. **Use Real Implementation When Possible**:
   - Test business logic with real implementations
   - Mock only external dependencies

### Error Testing

1. **Test Happy Path and Edge Cases**:
   ```typescript
   it('should handle valid input', async () => {
     // Test normal case
   });

   it('should handle invalid input', async () => {
     // Test validation errors
   });

   it('should handle missing required fields', async () => {
     // Test missing data
   });

   it('should handle external service errors', async () => {
     // Test error scenarios
   });
   ```

2. **Test Error Messages**:
   ```typescript
   await expect(service.createUser(invalidData))
     .rejects.toThrow('Email is required');
   ```

### Test Isolation

1. **Each Test Independent**:
   ```typescript
   beforeEach(() => {
     // Fresh setup for each test
     jest.clearAllMocks();
   });
   ```

2. **No Test Order Dependency**:
   ```typescript
   // Tests should pass in any order
   describe('Independent Tests', () => {
     it('test 1', () => { /* ... */ });
     it('test 2', () => { /* ... */ });
   });
   ```

### Performance Considerations

1. **Parallel Test Execution**:
   ```typescript
   // Configure Jest for parallel execution
   "maxWorkers": "50%"
   ```

2. **Database Optimization**:
   ```typescript
   // Use in-memory databases when possible
   // Optimize queries in tests
   ```

3. **Resource Cleanup**:
   ```typescript
   afterAll(async () => {
     await app.close();
     await cleanupTestResources();
   });
   ```

## Troubleshooting

### Common Issues

1. **Test Timeouts**:
   ```typescript
   // Increase timeout for slow tests
   it('should handle slow operation', async () => {
     // Test implementation
   }, 10000); // 10 seconds
   ```

2. **Database Connection Issues**:
   ```typescript
   // Ensure database is running
   beforeAll(async () => {
     await waitForDatabase();
   });
   ```

3. **Memory Leaks in Tests**:
   ```typescript
   // Clean up resources
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

4. **Flaky Tests**:
   ```typescript
   // Add retries for flaky operations
   await retry(async () => {
     return await operation();
   }, { retries: 3 });
   ```

### Debugging Tests

1. **Enable Debug Logging**:
   ```typescript
   // Add debug output
   console.log('Debug info:', debugData);
   ```

2. **Use Jest Debug Mode**:
   ```bash
   npm run test:debug
   ```

3. **Inspect Variables**:
   ```typescript
   it('should debug variable', () => {
     console.log('Variable value:', variable);
     expect(variable).toBeDefined();
   });
   ```

### CI/CD Integration

1. **Set Up Test Scripts**:
   ```json
   {
     "scripts": {
       "test:ci": "jest --ci --coverage --watchAll=false",
       "test:coverage:check": "jest --coverage --coverageThreshold='{\"global\":{\"branches\":70,\"functions\":70,\"lines\":70,\"statements\":70}}'"
     }
   }
   ```

2. **Quality Gates**:
   - Minimum coverage thresholds
   - All tests must pass
   - Performance benchmarks

3. **Test Reports**:
   - Generate coverage reports
   - Upload test results
   - Archive test artifacts

## Conclusion

This testing framework provides a comprehensive approach to ensuring code quality and reliability. Following these guidelines will help maintain high test coverage, fast execution times, and reliable test results.

For questions or improvements to these guidelines, please refer to the project documentation or contact the development team.