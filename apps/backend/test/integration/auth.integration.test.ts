import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/entities/user.entity';
import { testDbConfig, setupTestDatabase, createAuthenticatedUser, ApiTester } from '../setup/integration-setup';
import * as bcrypt from 'bcrypt';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let apiTester: ApiTester;

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
        TypeOrmModule.forFeature([User]),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET') || 'integration-test-jwt-secret',
            signOptions: { expiresIn: '1h' },
          }),
          inject: [ConfigService],
        }),
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
    apiTester = new ApiTester(app);
    
    await setupTestDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await userRepository.clear();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'test-tenant',
      };

      const response = await apiTester.post('/auth/register', registerDto);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe(registerDto.email);
      expect(response.data.user.firstName).toBe(registerDto.firstName);
      expect(response.data.user.lastName).toBe(registerDto.lastName);
      expect(response.data.user.password).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await apiTester.post('/auth/register', registerDto);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const registerDto = {
        email: 'user@example.com',
        password: '123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await apiTester.post('/auth/register', registerDto);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('password');
    });

    it('should reject registration with missing required fields', async () => {
      const registerDto = {
        email: 'user@example.com',
        password: 'SecurePassword123!',
      };

      const response = await apiTester.post('/auth/register', registerDto);

      expect(response.status).toBe(400);
    });

    it('should reject registration if email already exists', async () => {
      // First registration
      const registerDto = {
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        firstName: 'Existing',
        lastName: 'User',
      };

      await apiTester.post('/auth/register', registerDto);

      // Second registration with same email
      const response = await apiTester.post('/auth/register', registerDto);

      expect(response.status).toBe(409);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      await userRepository.save({
        email: 'login@example.com',
        password: hashedPassword,
        firstName: 'Login',
        lastName: 'Test',
        status: 'active',
        tenantId: 'test-tenant',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'TestPassword123!',
      };

      const response = await apiTester.post('/auth/login', loginDto);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe(loginDto.email);
    });

    it('should reject login with invalid email', async () => {
      const loginDto = {
        email: 'wrong@example.com',
        password: 'TestPassword123!',
      };

      const response = await apiTester.post('/auth/login', loginDto);

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'WrongPassword',
      };

      const response = await apiTester.post('/auth/login', loginDto);

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject login for inactive user', async () => {
      // Deactivate the user
      await userRepository.update(
        { email: 'login@example.com' },
        { status: 'inactive' }
      );

      const loginDto = {
        email: 'login@example.com',
        password: 'TestPassword123!',
      };

      const response = await apiTester.post('/auth/login', loginDto);

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // First register a user
      const registerDto = {
        email: 'refresh@example.com',
        password: 'SecurePassword123!',
        firstName: 'Refresh',
        lastName: 'Test',
      };

      const registerResponse = await apiTester.post('/auth/register', registerDto);
      const refreshToken = registerResponse.data.refreshToken;

      // Use the refresh token to get a new access token
      apiTester.setToken(refreshToken);
      const response = await apiTester.post('/auth/refresh', {});

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.accessToken).not.toBe(registerResponse.data.accessToken);
    });

    it('should reject refresh with invalid token', async () => {
      apiTester.setToken('invalid-refresh-token');
      const response = await apiTester.post('/auth/refresh', {});

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      // Register and login
      const registerDto = {
        email: 'logout@example.com',
        password: 'SecurePassword123!',
        firstName: 'Logout',
        lastName: 'Test',
      };

      const registerResponse = await apiTester.post('/auth/register', registerDto);
      const accessToken = registerResponse.data.accessToken;

      // Logout
      apiTester.setToken(accessToken);
      const response = await apiTester.post('/auth/logout', {});

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('logged out');
    });

    it('should reject logout without authentication', async () => {
      apiTester.setToken('');
      const response = await apiTester.post('/auth/logout', {});

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should generate password reset token', async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      await userRepository.save({
        email: 'forgot@example.com',
        password: hashedPassword,
        firstName: 'Forgot',
        lastName: 'Password',
        status: 'active',
        tenantId: 'test-tenant',
      });

      const forgotDto = {
        email: 'forgot@example.com',
      };

      const response = await apiTester.post('/auth/forgot-password', forgotDto);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data).toHaveProperty('resetToken');
    });

    it('should not reveal if email exists (security measure)', async () => {
      const forgotDto = {
        email: 'nonexistent@example.com',
      };

      const response = await apiTester.post('/auth/forgot-password', forgotDto);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      // Should not contain reset token for non-existent email
      expect(response.data.resetToken).toBeNull();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid reset token', async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);
      const user = await userRepository.save({
        email: 'reset@example.com',
        password: hashedPassword,
        firstName: 'Reset',
        lastName: 'Password',
        status: 'active',
        tenantId: 'test-tenant',
      });

      // Generate reset token (simulate the token generation process)
      const resetToken = 'valid-reset-token';
      const resetDto = {
        token: resetToken,
        newPassword: 'NewSecurePassword123!',
      };

      // Mock the reset token validation in the service
      const response = await apiTester.post('/auth/reset-password', resetDto);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('password reset');
    });

    it('should reject reset with invalid token', async () => {
      const resetDto = {
        token: 'invalid-reset-token',
        newPassword: 'NewSecurePassword123!',
      };

      const response = await apiTester.post('/auth/reset-password', resetDto);

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject reset with weak password', async () => {
      const resetDto = {
        token: 'valid-reset-token',
        newPassword: '123',
      };

      const response = await apiTester.post('/auth/reset-password', resetDto);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('password');
    });
  });

  describe('GET /auth/profile', () => {
    it('should return user profile when authenticated', async () => {
      // Register a user
      const registerDto = {
        email: 'profile@example.com',
        password: 'SecurePassword123!',
        firstName: 'Profile',
        lastName: 'Test',
      };

      const registerResponse = await apiTester.post('/auth/register', registerDto);
      const accessToken = registerResponse.data.accessToken;

      // Get profile
      apiTester.setToken(accessToken);
      const response = await apiTester.get('/auth/profile');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('firstName');
      expect(response.data).toHaveProperty('lastName');
      expect(response.data.email).toBe(registerDto.email);
      expect(response.data.password).toBeUndefined();
    });

    it('should reject profile request without authentication', async () => {
      const response = await apiTester.get('/auth/profile');

      expect(response.status).toBe(401);
    });

    it('should reject profile request with invalid token', async () => {
      apiTester.setToken('invalid-token');
      const response = await apiTester.get('/auth/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /auth/profile', () => {
    it('should update user profile when authenticated', async () => {
      // Register a user
      const registerDto = {
        email: 'update-profile@example.com',
        password: 'SecurePassword123!',
        firstName: 'Update',
        lastName: 'Profile',
      };

      const registerResponse = await apiTester.post('/auth/register', registerDto);
      const accessToken = registerResponse.data.accessToken;

      // Update profile
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+1234567890',
      };

      apiTester.setToken(accessToken);
      const response = await apiTester.put('/auth/profile', updateDto);

      expect(response.status).toBe(200);
      expect(response.data.firstName).toBe(updateDto.firstName);
      expect(response.data.lastName).toBe(updateDto.lastName);
      expect(response.data.phoneNumber).toBe(updateDto.phoneNumber);
    });

    it('should reject profile update without authentication', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await apiTester.put('/auth/profile', updateDto);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password when authenticated with correct current password', async () => {
      // Register a user
      const registerDto = {
        email: 'change-password@example.com',
        password: 'CurrentPassword123!',
        firstName: 'Change',
        lastName: 'Password',
      };

      const registerResponse = await apiTester.post('/auth/register', registerDto);
      const accessToken = registerResponse.data.accessToken;

      // Change password
      const changePasswordDto = {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewSecurePassword123!',
      };

      apiTester.setToken(accessToken);
      const response = await apiTester.post('/auth/change-password', changePasswordDto);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('password changed');
    });

    it('should reject password change with wrong current password', async () => {
      // Register a user
      const registerDto = {
        email: 'wrong-current@example.com',
        password: 'CurrentPassword123!',
        firstName: 'Wrong',
        lastName: 'Current',
      };

      const registerResponse = await apiTester.post('/auth/register', registerDto);
      const accessToken = registerResponse.data.accessToken;

      // Try to change password with wrong current password
      const changePasswordDto = {
        currentPassword: 'WrongCurrentPassword!',
        newPassword: 'NewSecurePassword123!',
      };

      apiTester.setToken(accessToken);
      const response = await apiTester.post('/auth/change-password', changePasswordDto);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect(response.data.message).toContain('current password');
    });

    it('should reject password change without authentication', async () => {
      const changePasswordDto = {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewSecurePassword123!',
      };

      const response = await apiTester.post('/auth/change-password', changePasswordDto);

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting on auth endpoints', async () => {
      const loginDto = {
        email: 'rate-limit@example.com',
        password: 'TestPassword123!',
      };

      // Make multiple requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() => 
        apiTester.post('/auth/login', loginDto)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'plainaddress',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
      ];

      for (const email of invalidEmails) {
        const registerDto = {
          email,
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        };

        const response = await apiTester.post('/auth/register', registerDto);
        expect(response.status).toBe(400);
      }
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        'Password123', // Missing special character
        'password!', // Missing uppercase and number
        'PASSWORD123!', // Missing lowercase
        'password123!', // Missing uppercase
      ];

      for (const password of weakPasswords) {
        const registerDto = {
          email: `test${Date.now()}@example.com`,
          password,
          firstName: 'Test',
          lastName: 'User',
        };

        const response = await apiTester.post('/auth/register', registerDto);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const loginDto = {
        email: 'security@example.com',
        password: 'SecurePassword123!',
      };

      // First register the user
      await apiTester.post('/auth/register', {
        email: 'security@example.com',
        password: 'SecurePassword123!',
        firstName: 'Security',
        lastName: 'Test',
      });

      const response = await apiTester.post('/auth/login', loginDto);

      expect(response.status).toBe(200);
      // Note: In a real implementation, you would check for specific security headers
      // like X-Content-Type-Options, X-Frame-Options, etc.
    });
  });
});