import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { LocalStrategy } from '../../src/modules/auth/strategies/local.strategy';
import { JwtStrategy } from '../../src/modules/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../../src/modules/auth/strategies/jwt-refresh.strategy';
import { User } from '../../src/entities/user.entity';
import { createMockUser } from '../setup/unit-setup';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userRepository: any;
  let refreshTokenRepository: any;

  const mockUser = createMockUser();

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    refreshTokenRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        JwtRefreshStrategy,
        {
          provide: 'USER_REPOSITORY',
          useValue: userRepository,
        },
        {
          provide: 'REFRESH_TOKEN_REPOSITORY',
          useValue: refreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should validate user credentials successfully', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userWithPassword = { ...mockUser, password: hashedPassword };

      userRepository.findOne.mockResolvedValue(userWithPassword);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateUser('invalid@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      userRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(
        service.validateUser('inactive@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const userWithPassword = { ...mockUser, password: hashedPassword };

      userRepository.findOne.mockResolvedValue(userWithPassword);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should generate access and refresh tokens for valid user', async () => {
      const userWithPassword = { ...mockUser, password: await bcrypt.hash('password123', 10) };

      userRepository.findOne.mockResolvedValue(userWithPassword);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.password).toBeUndefined();
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should update last login timestamp', async () => {
      const userWithPassword = { ...mockUser, password: await bcrypt.hash('password123', 10) };

      userRepository.findOne.mockResolvedValue(userWithPassword);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      refreshTokenRepository.save.mockResolvedValue({});

      await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue({
        ...registerDto,
        password: await bcrypt.hash(registerDto.password, 10),
        id: 'new-user-id',
      });
      userRepository.save.mockResolvedValue({
        ...registerDto,
        password: await bcrypt.hash(registerDto.password, 10),
        id: 'new-user-id',
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.password).toBeUndefined();
    });

    it('should throw BadRequestException if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should validate password strength', async () => {
      const weakPasswordDto = {
        email: 'new@example.com',
        password: '123',
        firstName: 'New',
        lastName: 'User',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.register(weakPasswordDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const decodedToken = { sub: 'user-123', type: 'refresh' };

      jwtService.verify.mockReturnValue(decodedToken);
      jwtService.sign.mockReturnValue('new-access-token');
      refreshTokenRepository.findOne.mockResolvedValue({
        token: refreshToken,
        userId: 'user-123',
      });

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      jwtService.verify.mockThrow(new Error('Invalid token'));

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      const refreshToken = 'non-existent-refresh-token';
      const decodedToken = { sub: 'user-123', type: 'refresh' };

      jwtService.verify.mockReturnValue(decodedToken);
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout user by removing refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token';

      refreshTokenRepository.delete.mockResolvedValue({ affected: 1 });

      await service.logout(userId, refreshToken);

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        userId,
        token: refreshToken,
      });
    });

    it('should logout user from all devices', async () => {
      const userId = 'user-123';

      refreshTokenRepository.delete.mockResolvedValue({ affected: 5 });

      await service.logout(userId);

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({ userId });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-123';
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const userWithPassword = {
        ...mockUser,
        id: userId,
        password: await bcrypt.hash('oldpassword', 10),
      };

      userRepository.findOne.mockResolvedValue(userWithPassword);
      userRepository.save.mockResolvedValue({
        ...userWithPassword,
        password: await bcrypt.hash('newpassword123', 10),
      });

      const result = await service.changePassword(userId, changePasswordDto);

      expect(result).toBe(true);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for wrong current password', async () => {
      const userId = 'user-123';
      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      const userWithPassword = {
        ...mockUser,
        id: userId,
        password: await bcrypt.hash('correctpassword', 10),
      };

      userRepository.findOne.mockResolvedValue(userWithPassword);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should generate password reset token', async () => {
      const email = 'test@example.com';

      userRepository.findOne.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('password-reset-token');

      const result = await service.forgotPassword(email);

      expect(result).toHaveProperty('resetToken');
      expect(result).toHaveProperty('expiresAt');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should not throw error if user not found (security measure)', async () => {
      const email = 'nonexistent@example.com';

      userRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(email);

      expect(result.resetToken).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid reset token', async () => {
      const resetToken = 'valid-reset-token';
      const newPassword = 'newpassword123';

      const decodedToken = { sub: 'user-123', type: 'reset', exp: Math.floor(Date.now() / 1000) + 3600 };

      jwtService.verify.mockReturnValue(decodedToken);
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash(newPassword, 10),
      });

      const result = await service.resetPassword(resetToken, newPassword);

      expect(result).toBe(true);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for expired reset token', async () => {
      const resetToken = 'expired-reset-token';
      const newPassword = 'newpassword123';

      const decodedToken = { sub: 'user-123', type: 'reset', exp: Math.floor(Date.now() / 1000) - 3600 };

      jwtService.verify.mockReturnValue(decodedToken);

      await expect(service.resetPassword(resetToken, newPassword)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid verification token', async () => {
      const verificationToken = 'valid-verification-token';

      const decodedToken = { sub: 'user-123', type: 'verify', exp: Math.floor(Date.now() / 1000) + 3600 };

      jwtService.verify.mockReturnValue(decodedToken);
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      const result = await service.verifyEmail(verificationToken);

      expect(result).toBe(true);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without sensitive data', async () => {
      const userId = 'user-123';

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserProfile(userId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result.password).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'non-existent-user';

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserProfile(userId)).rejects.toThrow();
    });
  });
});

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate user and return user object', async () => {
      const mockValidatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      authService.validateUser.mockResolvedValue(mockValidatedUser);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toEqual(mockValidatedUser);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      authService.validateUser.mockRejectedValue(new UnauthorizedException());

      await expect(
        strategy.validate('invalid@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate JWT payload and return user payload', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234567890,
      };

      jwtService.verify.mockReturnValue(payload);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });
  });
});

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should validate refresh JWT payload and return user payload', async () => {
      const payload = {
        sub: 'user-123',
        type: 'refresh',
        iat: 1234567890,
        exp: 1234567890,
      };

      jwtService.verify.mockReturnValue(payload);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        type: 'refresh',
      });
    });
  });
});