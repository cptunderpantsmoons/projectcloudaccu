/**
 * Integration Test Setup Configuration
 * This file is executed before each integration test
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Project } from '../src/entities/project.entity';
import { AccuApplication } from '../src/entities/accu-application.entity';
import { Document } from '../src/entities/document.entity';
import { CalendarEvent } from '../src/entities/calendar-event.entity';
import { Notification } from '../src/entities/notification.entity';
import { AuditLog } from '../src/entities/audit-log.entity';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USER = 'postgres';
process.env.DATABASE_PASSWORD = 'password';
process.env.DATABASE_NAME = 'accu_platform_integration_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.CER_API_URL = 'http://localhost:8080';
process.env.EMAIL_SERVICE_URL = 'http://localhost:8081';

// Global test configuration
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Test database configuration
export const testDbConfig = {
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'accu_platform_integration_test',
  entities: [
    User,
    Project,
    AccuApplication,
    Document,
    CalendarEvent,
    Notification,
    AuditLog,
  ],
  synchronize: true, // Use migrations in production
  logging: false,
  retryAttempts: 3,
  retryDelay: 3000,
};

// Database setup utilities
export async function setupTestDatabase(app: INestApplication) {
  const dataSource = app.get('DataSource');
  
  // Clean all tables before tests
  const entities = [
    Notification,
    CalendarEvent,
    Document,
    AccuApplication,
    Project,
    AuditLog,
    User,
  ];
  
  for (const entity of entities) {
    const repository = app.get<Repository<any>>(getRepositoryToken(entity));
    await repository.query('TRUNCATE TABLE ' + entity.tableName + ' CASCADE');
  }
}

// Test data factory
export class TestDataFactory {
  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: 'test-user-' + Date.now(),
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      status: 'active' as any,
      roles: [],
      password: '$2b$10$examplehash',
      tenantId: 'test-tenant',
      phoneNumber: null,
      avatar: null,
      metadata: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createProject(overrides: Partial<Project> = {}): Project {
    return {
      id: 'test-project-' + Date.now(),
      name: 'Test Project',
      description: 'Test project description',
      status: 'draft' as any,
      type: 'methodology' as any,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      methodology: {
        id: 'methodology-123',
        name: 'Test Methodology',
        version: '1.0',
        url: 'https://example.com',
        requirements: {},
      },
      metadata: {},
      ownerId: 'test-user',
      tenantId: 'test-tenant',
      tags: ['test'],
      documents: [],
      calendarEvents: [],
      accuApplications: [],
      accuInventory: [],
      audits: [],
      communications: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      // Helper methods
      isActive() { return this.status === 'active'; },
      isCompleted() { return this.status === 'completed'; },
      isOnHold() { return this.status === 'on_hold'; },
      isDraft() { return this.status === 'draft'; },
      getDurationInDays() { 
        const start = new Date(this.startDate);
        const end = this.endDate ? new Date(this.endDate) : new Date();
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      },
      isMethodology() { return this.type === 'methodology'; },
      isAudit() { return this.type === 'audit'; },
      isCompliance() { return this.type === 'compliance'; },
      ...overrides,
    };
  }

  static createAccuApplication(overrides: Partial<AccuApplication> = {}): AccuApplication {
    return {
      id: 'test-accu-app-' + Date.now(),
      status: 'draft' as any,
      accuUnits: 1000,
      methodologyId: 'methodology-123',
      serReference: null,
      applicationData: {
        description: 'Test ACCU application',
        location: {
          address: '123 Test St',
          coordinates: { lat: 0, lng: 0 },
          jurisdiction: 'NSW',
        },
      },
      projectId: 'test-project',
      submissionDate: null,
      approvalDate: null,
      issuedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'test-tenant',
      // Helper methods
      isDraft() { return this.status === 'draft'; },
      isSubmitted() { return this.status === 'submitted'; },
      isApproved() { return this.status === 'approved'; },
      isIssued() { return this.status === 'issued'; },
      ...overrides,
    };
  }

  static createDocument(overrides: Partial<Document> = {}): Document {
    return {
      id: 'test-document-' + Date.now(),
      name: 'Test Document',
      description: 'Test document description',
      category: 'methodology' as any,
      status: 'draft' as any,
      version: 1,
      fileName: 'test.pdf',
      originalFileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      fileUrl: 'http://localhost:3000/files/test.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      checksum: 'abc123',
      tags: ['test'],
      metadata: {},
      uploadedById: 'test-user',
      projectId: 'test-project',
      tenantId: 'test-tenant',
      createdAt: new Date(),
      updatedAt: new Date(),
      // Helper methods
      getFileExtension() { return 'pdf'; },
      formatFileSize() { return '1.0 KB'; },
      ...overrides,
    };
  }

  static createCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
    return {
      id: 'test-event-' + Date.now(),
      title: 'Test Event',
      description: 'Test calendar event',
      type: 'meeting' as any,
      priority: 'medium' as any,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 26 * 60 * 60 * 1000),
      isAllDay: false,
      reminders: [1, 7],
      createdById: 'test-user',
      projectId: 'test-project',
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'test-tenant',
      ...overrides,
    };
  }

  static createNotification(overrides: Partial<Notification> = {}): Notification {
    return {
      id: 'test-notification-' + Date.now(),
      type: 'info' as any,
      title: 'Test Notification',
      message: 'Test notification message',
      userId: 'test-user',
      tenantId: 'test-tenant',
      projectId: 'test-project',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}

// Authentication utilities for integration tests
export async function createAuthenticatedUser(app: INestApplication, user: Partial<User> = {}): Promise<{ user: User; token: string }> {
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  
  const testUser = TestDataFactory.createUser(user);
  const savedUser = await userRepository.save(testUser);
  
  // In a real app, you would authenticate and get a JWT token
  // For integration tests, we'll use a simple mock token
  const token = `mock-jwt-token-${savedUser.id}`;
  
  return { user: savedUser, token };
}

// API testing helper
export class ApiTester {
  constructor(private app: INestApplication, private token?: string) {}

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async get(path: string) {
    return request(this.app.getHttpServer())
      .get(path)
      .set(this.getHeaders());
  }

  async post(path: string, data: any) {
    return request(this.app.getHttpServer())
      .post(path)
      .set(this.getHeaders())
      .send(data);
  }

  async put(path: string, data: any) {
    return request(this.app.getHttpServer())
      .put(path)
      .set(this.getHeaders())
      .send(data);
  }

  async delete(path: string) {
    return request(this.app.getHttpServer())
      .delete(path)
      .set(this.getHeaders());
  }

  async upload(path: string, fieldName: string, file: any) {
    return request(this.app.getHttpServer())
      .post(path)
      .set(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      .attach(fieldName, file.buffer, file.originalname);
  }
}

// Clean up after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Extend expect for integration tests
expect.extend({
  toBeValidApiResponse(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 'statusCode' in received &&
                 typeof received.statusCode === 'number';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid API response`,
        pass: false,
      };
    }
  },
  
  toBePaginatedResponse(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 'data' in received &&
                 'meta' in received &&
                 Array.isArray(received.data) &&
                 typeof received.meta === 'object';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a paginated response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a paginated response`,
        pass: false,
      };
    }
  },
});