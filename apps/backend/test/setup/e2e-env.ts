/**
 * E2E Test Environment Setup
 * This file is executed once before all E2E tests
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test services that need to be running for E2E tests
export const E2E_TEST_SERVICES = {
  DATABASE: {
    host: 'localhost',
    port: 5432,
    name: 'accu_platform_e2e_test',
    user: 'postgres',
    password: 'password',
  },
  REDIS: {
    host: 'localhost',
    port: 6379,
  },
  TEMPORAL: {
    address: 'localhost:7233',
    namespace: 'default',
  },
};

export async function setupE2EEnvironment() {
  console.log('Setting up E2E test environment...');
  
  // Set E2E environment variables
  process.env.NODE_ENV = 'e2e';
  process.env.DATABASE_HOST = E2E_TEST_SERVICES.DATABASE.host;
  process.env.DATABASE_PORT = E2E_TEST_SERVICES.DATABASE.port.toString();
  process.env.DATABASE_NAME = E2E_TEST_SERVICES.DATABASE.name;
  process.env.DATABASE_USER = E2E_TEST_SERVICES.DATABASE.user;
  process.env.DATABASE_PASSWORD = E2E_TEST_SERVICES.DATABASE.password;
  process.env.REDIS_HOST = E2E_TEST_SERVICES.REDIS.host;
  process.env.REDIS_PORT = E2E_TEST_SERVICES.REDIS.port.toString();
  process.env.JWT_SECRET = 'e2e-test-jwt-secret-key';
  process.env.CER_API_URL = 'http://localhost:8080';
  process.env.EMAIL_SERVICE_URL = 'http://localhost:8081';
  process.env.FILE_STORAGE_TYPE = 'local';
  process.env.UPLOAD_PATH = './uploads/e2e';
  
  // Create E2E test directories
  const testDirs = [
    './uploads/e2e',
    './temp/e2e',
    './logs/e2e',
  ];
  
  for (const dir of testDirs) {
    try {
      execSync(`mkdir -p ${dir}`, { stdio: 'ignore' });
    } catch (error) {
      console.warn(`Could not create directory ${dir}: ${error}`);
    }
  }
  
  // Wait for services to be ready
  await waitForServices();
  
  console.log('E2E test environment setup complete');
}

export async function teardownE2EEnvironment() {
  console.log('Tearing down E2E test environment...');
  
  // Clean up test directories
  const testDirs = [
    './uploads/e2e',
    './temp/e2e',
    './logs/e2e',
  ];
  
  for (const dir of testDirs) {
    try {
      if (fs.existsSync(dir)) {
        execSync(`rm -rf ${dir}`, { stdio: 'ignore' });
      }
    } catch (error) {
      console.warn(`Could not clean up directory ${dir}: ${error}`);
    }
  }
  
  console.log('E2E test environment teardown complete');
}

async function waitForServices() {
  console.log('Waiting for services to be ready...');
  
  const services = [
    { name: 'Database', check: () => checkPostgres() },
    { name: 'Redis', check: () => checkRedis() },
    { name: 'Temporal', check: () => checkTemporal() },
  ];
  
  for (const service of services) {
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        await service.check();
        console.log(`${service.name} is ready`);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn(`${service.name} check failed after ${maxAttempts} attempts`);
          throw new Error(`${service.name} is not ready`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

async function checkPostgres(): Promise<void> {
  const { Client } = require('pg');
  const client = new Client({
    host: E2E_TEST_SERVICES.DATABASE.host,
    port: E2E_TEST_SERVICES.DATABASE.port,
    database: E2E_TEST_SERVICES.DATABASE.name,
    user: E2E_TEST_SERVICES.DATABASE.user,
    password: E2E_TEST_SERVICES.DATABASE.password,
  });
  
  try {
    await client.connect();
    await client.query('SELECT 1');
  } finally {
    await client.end();
  }
}

async function checkRedis(): Promise<void> {
  const Redis = require('ioredis');
  const client = new Redis({
    host: E2E_TEST_SERVICES.REDIS.host,
    port: E2E_TEST_SERVICES.REDIS.port,
  });
  
  try {
    await client.ping();
  } finally {
    client.disconnect();
  }
}

async function checkTemporal(): Promise<void> {
  const { Connection } = require('@temporalio/client');
  
  try {
    const connection = await Connection.connect({
      address: E2E_TEST_SERVICES.TEMPORAL.address,
    });
    
    // Simple health check - try to describe a non-existent workflow
    // This will fail but indicates the server is responding
    await connection.workflowService.getSystemInfo();
    connection.close();
  } catch (error) {
    // Ignore errors, just check if service is responding
  }
}

// E2E Test Data Management
export class E2ETestDataManager {
  private static instance: E2ETestDataManager;
  private testData: Map<string, any> = new Map();
  
  static getInstance(): E2ETestDataManager {
    if (!E2ETestDataManager.instance) {
      E2ETestDataManager.instance = new E2ETestDataManager();
    }
    return E2ETestDataManager.instance;
  }
  
  set(key: string, value: any) {
    this.testData.set(key, value);
  }
  
  get(key: string): any {
    return this.testData.get(key);
  }
  
  has(key: string): boolean {
    return this.testData.has(key);
  }
  
  delete(key: string) {
    this.testData.delete(key);
  }
  
  clear() {
    this.testData.clear();
  }
  
  getAll() {
    return Object.fromEntries(this.testData);
  }
}

// E2E Workflow Test Helper
export class E2EWorkflowTester {
  constructor(
    private baseUrl: string = 'http://localhost:3000',
    private apiToken?: string
  ) {}
  
  setApiToken(token: string) {
    this.apiToken = token;
  }
  
  private getHeaders() {
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiToken) {
      headers.Authorization = `Bearer ${this.apiToken}`;
    }
    
    return headers;
  }
  
  async createTestUser(userData: any = {}) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        email: `e2e-test-${Date.now()}@example.com`,
        firstName: 'E2E',
        lastName: 'TestUser',
        password: 'TestPassword123!',
        ...userData,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create test user: ${response.statusText}`);
    }
    
    const user = await response.json();
    E2ETestDataManager.getInstance().set('currentUser', user);
    
    return user;
  }
  
  async createTestProject(projectData: any = {}) {
    if (!this.apiToken) {
      throw new Error('API token required to create project');
    }
    
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: `E2E Test Project ${Date.now()}`,
        description: 'E2E test project description',
        type: 'methodology',
        startDate: new Date().toISOString(),
        ...projectData,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create test project: ${response.statusText}`);
    }
    
    const project = await response.json();
    E2ETestDataManager.getInstance().set('currentProject', project);
    
    return project;
  }
  
  async authenticate(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }
    
    const authData = await response.json();
    this.apiToken = authData.accessToken;
    
    return authData;
  }
}
