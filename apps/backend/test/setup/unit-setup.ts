/**
 * Unit Test Setup Configuration
 * This file is executed before each unit test
 */

import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USER = 'postgres';
process.env.DATABASE_PASSWORD = 'password';
process.env.DATABASE_NAME = 'accu_platform_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Global test configuration
global.console = {
  ...console,
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock external services that might be called during tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  }));
});

// Mock Temporal client for unit tests
jest.mock('temporalio/client', () => ({
  Connection: {
    connect: jest.fn().mockResolvedValue({
      workflowService: {
        startWorkflow: jest.fn(),
        describeWorkflow: jest.fn(),
        queryWorkflow: jest.fn(),
        signalWorkflow: jest.fn(),
      },
    }),
  },
}));

// Mock file storage services
jest.mock('../src/modules/file-storage/file-storage.service', () => ({
  FileStorageService: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  })),
}));

// Mock email service
jest.mock('../src/modules/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn(),
    sendBulkEmail: jest.fn(),
  })),
}));

// Mock CER API service
jest.mock('../src/modules/cer/cer.service', () => ({
  CERService: jest.fn().mockImplementation(() => ({
    submitApplication: jest.fn(),
    checkStatus: jest.fn(),
  })),
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Extend Jest matchers
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Date`,
        pass: false,
      };
    }
  },
  
  toHaveValidId(received) {
    const pass = typeof received === 'string' && received.length > 0 && received.length <= 36;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ID`,
        pass: false,
      };
    }
  },
});

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  status: 'active' as any,
  roles: [],
  password: 'hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
  tenantId: 'test-tenant-id',
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test project description',
  status: 'draft' as any,
  type: 'methodology' as any,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ownerId: 'test-user-id',
  methodology: {
    id: 'methodology-123',
    name: 'Test Methodology',
    version: '1.0',
  },
  metadata: {},
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  tenantId: 'test-tenant-id',
  ...overrides,
});

export const createMockAccuApplication = (overrides = {}) => ({
  id: 'test-accu-app-id',
  status: 'draft' as any,
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
  projectId: 'test-project-id',
  submissionDate: null,
  approvalDate: null,
  issuedDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tenantId: 'test-tenant-id',
  ...overrides,
});

export const createMockDocument = (overrides = {}) => ({
  id: 'test-document-id',
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
  uploadedById: 'test-user-id',
  projectId: 'test-project-id',
  tenantId: 'test-tenant-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCalendarEvent = (overrides = {}) => ({
  id: 'test-event-id',
  title: 'Test Event',
  description: 'Test calendar event',
  type: 'meeting' as any,
  priority: 'medium' as any,
  startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() + 26 * 60 * 60 * 1000),
  isAllDay: false,
  reminders: [1, 7],
  createdById: 'test-user-id',
  projectId: 'test-project-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  tenantId: 'test-tenant-id',
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: 'test-notification-id',
  type: 'info' as any,
  title: 'Test Notification',
  message: 'Test notification message',
  userId: 'test-user-id',
  tenantId: 'test-tenant-id',
  projectId: 'test-project-id',
  isRead: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});