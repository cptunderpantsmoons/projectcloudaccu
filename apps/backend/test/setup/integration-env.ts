/**
 * Integration Test Environment Setup
 * This file is executed once before all integration tests
 */

import { execSync } from 'child_process';

// Database setup for integration tests
export async function setupTestEnvironment() {
  console.log('Setting up integration test environment...');
  
  // Set environment variables
  process.env.NODE_ENV = 'integration';
  process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
  process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5432';
  process.env.DATABASE_USER = process.env.DATABASE_USER || 'postgres';
  process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'password';
  process.env.DATABASE_NAME = 'accu_platform_integration_test';
  process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  process.env.CER_API_URL = 'http://localhost:8080';
  process.env.EMAIL_SERVICE_URL = 'http://localhost:8081';
  process.env.FILE_STORAGE_TYPE = 'local';
  process.env.UPLOAD_PATH = './uploads/test';
  
  // Create test upload directory
  try {
    execSync('mkdir -p ./uploads/test', { stdio: 'ignore' });
  } catch (error) {
    // Directory might already exist
  }
  
  console.log('Test environment setup complete');
}

export async function teardownTestEnvironment() {
  console.log('Tearing down integration test environment...');
  
  // Clean up test upload directory
  try {
    execSync('rm -rf ./uploads/test', { stdio: 'ignore' });
  } catch (error) {
    // Directory might not exist or might have permission issues
  }
  
  console.log('Test environment teardown complete');
}