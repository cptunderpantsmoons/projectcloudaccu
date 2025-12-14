/**
 * E2E Test Setup Configuration
 * This file is executed before each E2E test
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { Project } from '../src/entities/project.entity';
import { AccuApplication } from '../src/entities/accu-application.entity';
import { Document } from '../src/entities/document.entity';
import { CalendarEvent } from '../src/entities/calendar-event.entity';
import { Notification } from '../src/entities/notification.entity';
import { AuditLog } from '../src/entities/audit-log.entity';
import { 
  setupE2EEnvironment, 
  teardownE2EEnvironment, 
  E2ETestDataManager,
  E2EWorkflowTester 
} from './e2e-env';

// Global E2E test variables
let app: INestApplication;
let e2eTester: E2EWorkflowTester;

// Before all E2E tests
beforeAll(async () => {
  console.log('Initializing E2E test suite...');
  
  // Setup E2E environment
  await setupE2EEnvironment();
  
  // Create testing module with full application
  const moduleFixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({
          // Override configuration for E2E tests
          database: {
            type: 'postgres',
            host: process.env.DATABASE_HOST || 'localhost',
            port: parseInt(process.env.DATABASE_PORT || '5432'),
            username: process.env.DATABASE_USER || 'postgres',
            password: process.env.DATABASE_PASSWORD || 'password',
            database: process.env.DATABASE_NAME || 'accu_platform_e2e_test',
            synchronize: true,
            logging: false,
          },
          jwt: {
            secret: process.env.JWT_SECRET || 'e2e-test-jwt-secret-key',
            signOptions: { expiresIn: '24h' },
          },
          temporal: {
            address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
            namespace: 'default',
            taskQueue: 'accu-workflows',
          },
          fileStorage: {
            type: 'local',
            uploadPath: process.env.UPLOAD_PATH || './uploads/e2e',
          },
          cer: {
            apiUrl: process.env.CER_API_URL || 'http://localhost:8080',
            timeout: 30000,
          },
          email: {
            serviceUrl: process.env.EMAIL_SERVICE_URL || 'http://localhost:8081',
            from: 'test@accu-platform.com',
          },
        })],
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'password',
        database: process.env.DATABASE_NAME || 'accu_platform_e2e_test',
        entities: [
          User,
          Project,
          AccuApplication,
          Document,
          CalendarEvent,
          Notification,
          AuditLog,
        ],
        synchronize: true,
        logging: false,
      }),
      AppModule,
    ],
  }).compile();
  
  app = moduleFixture.createNestApplication();
  
  // Configure app for E2E testing
  app.useGlobalPipes(
    new (require('@nestjs/common')).ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Enable CORS for E2E tests
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  await app.init();
  
  // Initialize E2E tester
  e2eTester = new E2EWorkflowTester('http://localhost:3000');
  
  console.log('E2E test suite initialized');
});

// After all E2E tests
afterAll(async () => {
  console.log('Cleaning up E2E test suite...');
  
  if (app) {
    await app.close();
  }
  
  await teardownE2EEnvironment();
  
  // Clear test data manager
  E2ETestDataManager.getInstance().clear();
  
  console.log('E2E test suite cleanup complete');
});

// Before each E2E test
beforeEach(async () => {
  console.log('Setting up individual E2E test...');
  
  // Clear test data
  E2ETestDataManager.getInstance().clear();
  
  // Reset any global state
  jest.clearAllMocks();
});

// After each E2E test
afterEach(async () => {
  console.log('Cleaning up individual E2E test...');
  
  // Additional cleanup if needed
});

// E2E Test Helpers
export { app, e2eTester };

export class E2ETestHelper {
  static getApp(): INestApplication {
    return app;
  }
  
  static getE2ETester(): E2EWorkflowTester {
    return e2eTester;
  }
  
  static async getAuthenticatedUser() {
    const user = E2ETestDataManager.getInstance().get('currentUser');
    if (!user) {
      throw new Error('No authenticated user found. Create user first.');
    }
    return user;
  }
  
  static async getAuthenticatedToken(): Promise<string> {
    const tester = E2ETestDataManager.getInstance().get('authToken');
    if (!tester) {
      throw new Error('No authenticated token found. Authenticate first.');
    }
    return tester;
  }
  
  static async createTestData(type: string, data: any = {}) {
    switch (type) {
      case 'user':
        return await e2eTester.createTestUser(data);
      case 'project':
        return await e2eTester.createTestProject(data);
      default:
        throw new Error(`Unknown test data type: ${type}`);
    }
  }
  
  static async authenticate(email: string, password: string) {
    const authData = await e2eTester.authenticate(email, password);
    E2ETestDataManager.getInstance().set('authToken', authData.accessToken);
    return authData;
  }
  
  static async makeRequest(method: string, path: string, data?: any) {
    const token = await this.getAuthenticatedToken();
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    
    const config: any = {
      method,
      headers,
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`http://localhost:3000${path}`, config);
    const responseData = await response.json();
    
    return {
      status: response.status,
      data: responseData,
      headers: response.headers,
    };
  }
  
  static async get(path: string) {
    return this.makeRequest('GET', path);
  }
  
  static async post(path: string, data: any) {
    return this.makeRequest('POST', path, data);
  }
  
  static async put(path: string, data: any) {
    return this.makeRequest('PUT', path, data);
  }
  
  static async delete(path: string) {
    return this.makeRequest('DELETE', path);
  }
  
  static async uploadFile(path: string, fieldName: string, file: any, additionalData?: any) {
    const token = await this.getAuthenticatedToken();
    const formData = new FormData();
    
    formData.append(fieldName, new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }
    
    const response = await fetch(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    const responseData = await response.json();
    
    return {
      status: response.status,
      data: responseData,
      headers: response.headers,
    };
  }
}

// Custom matchers for E2E tests
expect.extend({
  toBeSuccessfulE2EResponse(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 'status' in received &&
                 typeof received.status === 'number' &&
                 received.status >= 200 &&
                 received.status < 300;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a successful response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a successful response (2xx status)`,
        pass: false,
      };
    }
  },
  
  toHaveE2EValidationError(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 'status' in received &&
                 received.status === 400 &&
                 'data' in received &&
                 received.data &&
                 typeof received.data === 'object';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a validation error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a validation error response (400 status)`,
        pass: false,
      };
    }
  },
  
  toBeE2EUnauthorized(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 'status' in received &&
                 received.status === 401;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be an unauthorized response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be an unauthorized response (401 status)`,
        pass: false,
      };
    }
  },
  
  toBeE2ENotFound(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 'status' in received &&
                 received.status === 404;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a not found response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a not found response (404 status)`,
        pass: false,
      };
    }
  },
});