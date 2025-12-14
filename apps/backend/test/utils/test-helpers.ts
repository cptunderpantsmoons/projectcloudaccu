/**
 * Comprehensive Test Utilities and Helpers
 * Provides common utilities for all test types
 */

import { Repository } from 'typeorm';
import { User } from '../../src/entities/user.entity';
import { Project } from '../../src/entities/project.entity';
import { AccuApplication } from '../../src/entities/accu-application.entity';
import { Document } from '../../src/entities/document.entity';
import { CalendarEvent } from '../../src/entities/calendar-event.entity';
import { Notification } from '../../src/entities/notification.entity';

// Test Data Generators
export class TestDataGenerator {
  static generateId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateEmail(): string {
    return `test${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
  }

  static generatePhoneNumber(): string {
    return `+61${Math.floor(Math.random() * 900000000) + 100000000}`;
  }

  static generateDate(daysFromNow: number = 0): Date {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  }

  static generateCoordinates(): { lat: number; lng: number } {
    return {
      lat: -33.8688 + (Math.random() - 0.5) * 2,
      lng: 151.2093 + (Math.random() - 0.5) * 2,
    };
  }

  static generateUrl(): string {
    return `https://example.com/${TestDataGenerator.generateId('resource')}`;
  }

  static generateFileName(extension: string = 'pdf'): string {
    return `${TestDataGenerator.generateId('file')}.${extension}`;
  }

  static generateTags(count: number = 3): string[] {
    const availableTags = ['test', 'methodology', 'audit', 'compliance', 'solar', 'wind', 'renewable', 'carbon', 'emissions'];
    return Array.from({ length: count }, () => 
      availableTags[Math.floor(Math.random() * availableTags.length)]
    );
  }
}

// Mock File Generator
export class MockFileGenerator {
  static createTextFile(content: string = 'Mock file content', filename: string = 'test.txt'): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'text/plain',
      size: Buffer.byteLength(content),
      buffer: Buffer.from(content),
      destination: '',
      filename: '',
      path: '',
      stream: null,
    };
  }

  static createPdfFile(content: string = 'Mock PDF content', filename: string = 'test.pdf'): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: Buffer.byteLength(content),
      buffer: Buffer.from(content),
      destination: '',
      filename: '',
      path: '',
      stream: null,
    };
  }

  static createImageFile(content: Buffer = Buffer.from('mock image data'), filename: string = 'test.png'): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: 'image/png',
      size: content.length,
      buffer: content,
      destination: '',
      filename: '',
      path: '',
      stream: null,
    };
  }

  static createLargeFile(sizeInMB: number = 10): Express.Multer.File {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    return {
      fieldname: 'file',
      originalname: `large-file-${sizeInMB}mb.txt`,
      encoding: '7bit',
      mimetype: 'text/plain',
      size: sizeInBytes,
      buffer: Buffer.alloc(sizeInBytes),
      destination: '',
      filename: '',
      path: '',
      stream: null,
    };
  }

  static createMaliciousFile(): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: 'malicious.exe',
      encoding: '7bit',
      mimetype: 'application/x-msdownload',
      size: 1024,
      buffer: Buffer.from('malicious executable content'),
      destination: '',
      filename: '',
      path: '',
      stream: null,
    };
  }
}

// Database Test Helpers
export class DatabaseTestHelper {
  static async cleanTable(repository: Repository<any>): Promise<void> {
    await repository.query(`TRUNCATE TABLE ${repository.metadata.tableName} CASCADE`);
  }

  static async cleanAllTables(repositories: Repository<any>[]): Promise<void> {
    for (const repository of repositories) {
      await this.cleanTable(repository);
    }
  }

  static async createTestUser(
    repository: Repository<User>,
    overrides: Partial<User> = {}
  ): Promise<User> {
    const user = repository.create({
      id: TestDataGenerator.generateId('user'),
      email: TestDataGenerator.generateEmail(),
      firstName: 'Test',
      lastName: 'User',
      status: 'active' as any,
      roles: [],
      password: '$2b$10$examplehash',
      tenantId: 'test-tenant',
      phoneNumber: TestDataGenerator.generatePhoneNumber(),
      avatar: null,
      metadata: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    return await repository.save(user);
  }

  static async createTestProject(
    repository: Repository<Project>,
    ownerId: string,
    overrides: Partial<Project> = {}
  ): Promise<Project> {
    const project = repository.create({
      id: TestDataGenerator.generateId('project'),
      name: 'Test Project',
      description: 'Test project description',
      status: 'draft' as any,
      type: 'methodology' as any,
      startDate: new Date(),
      endDate: TestDataGenerator.generateDate(30),
      methodology: {
        id: 'methodology-123',
        name: 'Test Methodology',
        version: '1.0',
        url: TestDataGenerator.generateUrl(),
        requirements: {},
      },
      metadata: {},
      ownerId,
      tenantId: 'test-tenant',
      tags: TestDataGenerator.generateTags(),
      documents: [],
      calendarEvents: [],
      accuApplications: [],
      accuInventory: [],
      audits: [],
      communications: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    return await repository.save(project);
  }

  static async createTestAccuApplication(
    repository: Repository<AccuApplication>,
    projectId: string,
    overrides: Partial<AccuApplication> = {}
  ): Promise<AccuApplication> {
    const application = repository.create({
      id: TestDataGenerator.generateId('accu-app'),
      status: 'draft' as any,
      accuUnits: 1000,
      methodologyId: 'methodology-123',
      serReference: null,
      applicationData: {
        description: 'Test ACCU application',
        location: {
          address: '123 Test St',
          coordinates: TestDataGenerator.generateCoordinates(),
          jurisdiction: 'NSW',
        },
      },
      projectId,
      submissionDate: null,
      approvalDate: null,
      issuedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'test-tenant',
      ...overrides,
    });

    return await repository.save(application);
  }

  static async createTestDocument(
    repository: Repository<Document>,
    uploadedById: string,
    projectId: string,
    overrides: Partial<Document> = {}
  ): Promise<Document> {
    const document = repository.create({
      id: TestDataGenerator.generateId('document'),
      name: 'Test Document',
      description: 'Test document description',
      category: 'methodology' as any,
      status: 'draft' as any,
      version: 1,
      fileName: TestDataGenerator.generateFileName(),
      originalFileName: TestDataGenerator.generateFileName(),
      filePath: `/uploads/${TestDataGenerator.generateFileName()}`,
      fileUrl: `http://localhost:3000/files/${TestDataGenerator.generateFileName()}`,
      mimeType: 'application/pdf',
      fileSize: 1024,
      checksum: 'abc123',
      tags: TestDataGenerator.generateTags(),
      metadata: {},
      uploadedById,
      projectId,
      tenantId: 'test-tenant',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    return await repository.save(document);
  }

  static async createTestCalendarEvent(
    repository: Repository<CalendarEvent>,
    createdById: string,
    projectId: string,
    overrides: Partial<CalendarEvent> = {}
  ): Promise<CalendarEvent> {
    const event = repository.create({
      id: TestDataGenerator.generateId('event'),
      title: 'Test Event',
      description: 'Test calendar event',
      type: 'meeting' as any,
      priority: 'medium' as any,
      startDate: TestDataGenerator.generateDate(7),
      endDate: TestDataGenerator.generateDate(7),
      isAllDay: false,
      reminders: [1, 7],
      createdById,
      projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'test-tenant',
      ...overrides,
    });

    return await repository.save(event);
  }

  static async createTestNotification(
    repository: Repository<Notification>,
    userId: string,
    overrides: Partial<Notification> = {}
  ): Promise<Notification> {
    const notification = repository.create({
      id: TestDataGenerator.generateId('notification'),
      type: 'info' as any,
      title: 'Test Notification',
      message: 'Test notification message',
      userId,
      tenantId: 'test-tenant',
      projectId: null,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    return await repository.save(notification);
  }
}

// Authentication Test Helpers
export class AuthTestHelper {
  static generateValidJWTPayload(userId: string, email: string): any {
    return {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      type: 'access',
    };
  }

  static generateExpiredJWTPayload(userId: string, email: string): any {
    return {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      type: 'access',
    };
  }

  static generateInvalidJWTPayload(): any {
    return {
      sub: 'invalid-user',
      email: 'invalid@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      type: 'access',
    };
  }

  static createAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static createMultipartAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
}

// API Test Helpers
export class ApiTestHelper {
  static createPaginationQuery(page: number = 1, limit: number = 10): Record<string, string> {
    return {
      page: page.toString(),
      limit: limit.toString(),
    };
  }

  static createDateRangeQuery(startDate: Date, endDate: Date): Record<string, string> {
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  static createSortQuery(field: string, direction: 'ASC' | 'DESC' = 'DESC'): Record<string, string> {
    return {
      sortBy: field,
      sortOrder: direction,
    };
  }

  static createSearchQuery(query: string): Record<string, string> {
    return { search: query };
  }

  static createFilterQuery(filters: Record<string, any>): Record<string, string> {
    const query: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query[key] = value.toString();
      }
    });
    return query;
  }

  static buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  static async makeRequest(
    method: string,
    url: string,
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; data: any; headers: any }> {
    const fetchOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`http://localhost:3000${url}`, fetchOptions);
      const responseData = await response.json();
      
      return {
        status: response.status,
        data: responseData,
        headers: response.headers,
      };
    } catch (error) {
      return {
        status: 500,
        data: { error: error.message },
        headers: {},
      };
    }
  }
}

// Validation Test Helpers
export class ValidationTestHelper {
  static createInvalidEmailTestCases(): Array<{ email: string; description: string }> {
    return [
      { email: 'plainaddress', description: 'No @ symbol' },
      { email: '@domain.com', description: 'Missing local part' },
      { email: 'user@', description: 'Missing domain' },
      { email: 'user@domain', description: 'Missing TLD' },
      { email: 'user..double.dot@domain.com', description: 'Double dots in local part' },
      { email: '.user@domain.com', description: 'Starting with dot' },
      { email: 'user.@domain.com', description: 'Ending with dot' },
      { email: 'user@domain..com', description: 'Double dots in domain' },
      { email: 'user@-domain.com', description: 'Starting with dash in domain' },
      { email: 'user@domain-.com', description: 'Ending with dash in domain' },
    ];
  }

  static createInvalidPasswordTestCases(): Array<{ password: string; description: string }> {
    return [
      { password: '123', description: 'Too short' },
      { password: 'password', description: 'No uppercase or numbers' },
      { password: 'Password', description: 'No numbers or special characters' },
      { password: 'Password123', description: 'No special characters' },
      { password: 'password123!', description: 'No uppercase' },
      { password: 'PASSWORD123!', description: 'No lowercase' },
    ];
  }

  static createValidTestCases(): {
    emails: string[];
    passwords: string[];
    phoneNumbers: string[];
  } {
    return {
      emails: [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@example.org',
        'user@subdomain.example.com',
      ],
      passwords: [
        'Password123!',
        'SecureP@ssw0rd',
        'MyStr0ng#Pass',
        'C0mpl3x!Pass',
      ],
      phoneNumbers: [
        '+61400123456',
        '+1-555-123-4567',
        '0400 123 456',
        '+44 20 7946 0958',
      ],
    };
  }
}

// Performance Test Helpers
export class PerformanceTestHelper {
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; executionTime: number; averageTime: number }> {
    const startTime = Date.now();
    let result: T;

    for (let i = 0; i < iterations; i++) {
      result = await fn();
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;

    return {
      result: result!,
      executionTime: totalTime,
      averageTime,
    };
  }

  static createLoadTestConfig(
    concurrentUsers: number,
    requestsPerUser: number,
    rampUpTime: number = 1000
  ): {
    concurrentUsers: number;
    requestsPerUser: number;
    rampUpTime: number;
    totalRequests: number;
  } {
    return {
      concurrentUsers,
      requestsPerUser,
      rampUpTime,
      totalRequests: concurrentUsers * requestsPerUser,
    };
  }

  static async runLoadTest(
    testFn: () => Promise<any>,
    config: ReturnType<typeof PerformanceTestHelper.createLoadTestConfig>
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    throughput: number;
    errors: string[];
  }> {
    const results = await Promise.allSettled(
      Array.from({ length: config.totalRequests }, (_, i) => 
        new Promise(async (resolve, reject) => {
          try {
            const result = await testFn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
      )
    );

    const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
    const failedRequests = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason.message || 'Unknown error');

    return {
      totalRequests: config.totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: 0, // Would need to measure individual response times
      throughput: 0, // Requests per second
      errors,
    };
  }
}

// File System Test Helpers
export class FileSystemTestHelper {
  static createTestDirectory(path: string): void {
    const fs = require('fs');
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  static cleanupTestDirectory(path: string): void {
    const fs = require('fs');
    if (fs.existsSync(path)) {
      fs.rmSync(path, { recursive: true, force: true });
    }
  }

  static createTestFile(path: string, content: string = 'test content'): void {
    const fs = require('fs');
    fs.writeFileSync(path, content);
  }

  static async createLargeTestFile(path: string, sizeInMB: number = 10): Promise<void> {
    const fs = require('fs');
    const stream = fs.createWriteStream(path);
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = sizeInMB;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = Buffer.alloc(chunkSize, 'a');
      stream.write(chunk);
    }
    
    return new Promise((resolve, reject) => {
      stream.end(() => resolve());
      stream.on('error', reject);
    });
  }
}

// Network Test Helpers
export class NetworkTestHelper {
  static async simulateSlowNetwork(
    fn: () => Promise<any>,
    delay: number = 1000
  ): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, delay));
    return fn();
  }

  static async simulateNetworkError(fn: () => Promise<any>): Promise<any> {
    // Simulate network error by throwing after a delay
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Network error simulated');
  }

  static createMockResponse(status: number, data: any): { status: number; data: any } {
    return { status, data };
  }
}

// Memory and Resource Test Helpers
export class ResourceTestHelper {
  static async measureMemoryUsage(): Promise<NodeJS.MemoryUsage> {
    return process.memoryUsage();
  }

  static async measureCpuUsage(): Promise<{ user: number; system: number }> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage();
    
    return {
      user: endUsage.user - startUsage.user,
      system: endUsage.system - startUsage.system,
    };
  }

  static async createMemoryPressure(
    sizeInMB: number = 100
  ): Promise<Buffer> {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    return Buffer.alloc(sizeInBytes, 'x');
  }
}

// Test Report Helpers
export class TestReportHelper {
  static createTestSummary(
    totalTests: number,
    passedTests: number,
    failedTests: number,
    skippedTests: number = 0
  ): {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  } {
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      successRate: ((passedTests / totalTests) * 100).toFixed(2) + '%',
    };
  }

  static createPerformanceReport(
    responseTimes: number[],
    throughput: number,
    errorRate: number
  ): {
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
  } {
    const sorted = responseTimes.sort((a, b) => a - b);
    
    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: sorted[0],
      maxResponseTime: sorted[sorted.length - 1],
      p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)],
      p99ResponseTime: sorted[Math.floor(sorted.length * 0.99)],
      throughput,
      errorRate,
    };
  }

  static generateCoverageReport(
    coverage: any
  ): {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
    overall: number;
  } {
    return {
      statements: coverage.statements.pct,
      branches: coverage.branches.pct,
      functions: coverage.functions.pct,
      lines: coverage.lines.pct,
      overall: ((coverage.statements.pct + coverage.branches.pct + coverage.functions.pct + coverage.lines.pct) / 4),
    };
  }
}

// Custom Jest Matchers
expect.extend({
  toBeValidId(received: string) {
    const pass = typeof received === 'string' && 
                 received.length > 0 && 
                 /^[a-z0-9-]+$/.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ID (lowercase letters, numbers, and hyphens only)`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email address`,
        pass: false,
      };
    }
  },

  toBeValidPhoneNumber(received: string) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const pass = phoneRegex.test(received.replace(/[\s()-]/g, ''));
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid phone number`,
        pass: false,
      };
    }
  },

  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveRequiredKeys(received: object, requiredKeys: string[]) {
    const keys = Object.keys(received);
    const missingKeys = requiredKeys.filter(key => !keys.includes(key));
    const pass = missingKeys.length === 0;
    
    if (pass) {
      return {
        message: () => `expected object not to have all required keys: ${missingKeys.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to have all required keys: ${missingKeys.join(', ')}`,
        pass: false,
      };
    }
  },

  toBeSuccessfulResponse(received: { status: number; data: any }) {
    const pass = received && 
                 typeof received === 'object' && 
                 'status' in received &&
                 typeof received.status === 'number' &&
                 received.status >= 200 &&
                 received.status < 300 &&
                 'data' in received;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a successful response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a successful response (2xx status with data)`,
        pass: false,
      };
    }
  },

  toBeClientErrorResponse(received: { status: number; data: any }) {
    const pass = received && 
                 typeof received === 'object' && 
                 'status' in received &&
                 typeof received.status === 'number' &&
                 received.status >= 400 &&
                 received.status < 500;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a client error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a client error response (4xx status)`,
        pass: false,
      };
    }
  },

  toBeServerErrorResponse(received: { status: number; data: any }) {
    const pass = received && 
                 typeof received === 'object' && 
                 'status' in received &&
                 typeof received.status === 'number' &&
                 received.status >= 500 &&
                 received.status < 600;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a server error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a server error response (5xx status)`,
        pass: false,
      };
    }
  },

  toBePaginatedResponse(received: { data: any[]; meta: any }) {
    const pass = received && 
                 typeof received === 'object' && 
                 'data' in received &&
                 Array.isArray(received.data) &&
                 'meta' in received &&
                 typeof received.meta === 'object' &&
                 'total' in received.meta &&
                 'page' in received.meta &&
                 'limit' in received.meta;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a paginated response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a paginated response (data array with meta object containing total, page, limit)`,
        pass: false,
      };
    }
  },
});

// Export all helpers
export {
  TestDataGenerator,
  MockFileGenerator,
  DatabaseTestHelper,
  AuthTestHelper,
  ApiTestHelper,
  ValidationTestHelper,
  PerformanceTestHelper,
  FileSystemTestHelper,
  NetworkTestHelper,
  ResourceTestHelper,
  TestReportHelper,
};