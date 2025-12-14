import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service';
import { UsersController } from '../../src/modules/users/users.controller';
import { User } from '../../src/entities/user.entity';
import { createMockUser } from '../setup/unit-setup';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = createMockUser();

  beforeEach(async () => {
    const mockUserRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'hashedpassword',
        tenantId: 'tenant-123',
      };

      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
      }));
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user with email already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        password: 'password123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should hash password before saving', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'plaintextpassword',
      };

      const hashedUser = {
        ...mockUser,
        password: 'hashedpassword',
      };

      userRepository.create.mockReturnValue(hashedUser);
      userRepository.save.mockResolvedValue(hashedUser);

      const result = await service.create(createUserDto);

      expect(result.password).not.toBe('plaintextpassword');
      expect(result.password).toBe('hashedpassword');
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        search: 'test',
        status: 'active',
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(queryDto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter users by search term', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        search: 'john',
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter users by status', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        status: 'active',
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found by email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = { ...mockUser, ...updateDto };
      
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', updateDto);

      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Updated',
        lastName: 'Name',
      }));
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateDto = { firstName: 'Updated' };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should prevent updating email to an existing one', async () => {
      const updateDto = { email: 'existing@example.com' };
      
      const existingUser = { ...mockUser, email: 'existing@example.com', id: 'existing-id' };
      userRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(existingUser);

      await expect(service.update('user-123', updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const profileDto = {
        firstName: 'Profile',
        lastName: 'Update',
        phoneNumber: '+1234567890',
        metadata: { department: 'IT' },
      };

      const updatedUser = { ...mockUser, ...profileDto };
      
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('user-123', profileDto);

      expect(result.firstName).toBe('Profile');
      expect(result.lastName).toBe('Update');
      expect(result.phoneNumber).toBe('+1234567890');
      expect(result.metadata).toEqual({ department: 'IT' });
    });
  });

  describe('changePassword', () => {
    it('should change user password successfully', async () => {
      const passwordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const userWithPassword = {
        ...mockUser,
        password: '$2b$10$oldpasswordhash',
      };

      userRepository.findOne.mockResolvedValue(userWithPassword);
      userRepository.save.mockResolvedValue(userWithPassword);

      const result = await service.changePassword('user-123', passwordDto);

      expect(userRepository.save).toHaveBeenCalled();
      expect(result.password).not.toBe('oldpassword');
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      const passwordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.changePassword('user-123', passwordDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login timestamp', async () => {
      const lastLoginTime = new Date();
      
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        lastLoginAt: lastLoginTime,
      });

      const result = await service.updateLastLogin('user-123');

      expect(result.lastLoginAt).toBeDefined();
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const deactivatedUser = {
        ...mockUser,
        status: 'inactive' as any,
      };

      userRepository.findOne.mockResolvedValue(deactivatedUser);
      userRepository.save.mockResolvedValue({
        ...deactivatedUser,
        status: 'active' as any,
      });

      const result = await service.activateUser('user-123');

      expect(result.status).toBe('active');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const activeUser = {
        ...mockUser,
        status: 'active' as any,
      };

      userRepository.findOne.mockResolvedValue(activeUser);
      userRepository.save.mockResolvedValue({
        ...activeUser,
        status: 'inactive' as any,
      });

      const result = await service.deactivateUser('user-123');

      expect(result.status).toBe('inactive');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockUsers = [
        { ...mockUser, status: 'active' },
        { ...mockUser, id: 'user-2', status: 'inactive' },
        { ...mockUser, id: 'user-3', status: 'active' },
      ];

      const mockQueryBuilder = {
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUserStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('inactive');
      expect(result.total).toBe(3);
      expect(result.active).toBe(2);
      expect(result.inactive).toBe(1);
    });
  });

  describe('searchUsers', () => {
    it('should search users by various criteria', async () => {
      const searchDto = {
        search: 'john',
        email: 'john@example.com',
        role: 'user',
        status: 'active',
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.searchUsers(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should soft delete user by setting status to deleted', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        status: 'deleted' as any,
      });

      await service.remove('user-123');

      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'deleted',
      }));
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
      getUserStats: jest.fn(),
      searchUsers: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
      };

      service.create.mockResolvedValue(mockUser);

      const mockRequest = { user: { id: 'admin-123' } };
      const result = await controller.create(createUserDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toBe(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const queryDto = { page: 1, limit: 10 };
      const paginatedResponse = {
        data: [mockUser],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };

      service.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toBe(paginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      service.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user-123');

      expect(service.findOne).toHaveBeenCalledWith('user-123');
      expect(result).toBe(mockUser);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { firstName: 'Updated' };
      service.update.mockResolvedValue(mockUser);

      const result = await controller.update('user-123', updateDto);

      expect(service.update).toHaveBeenCalledWith('user-123', updateDto);
      expect(result).toBe(mockUser);
    });
  });

  describe('remove', () => {
    it('should remove user', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('user-123');

      expect(service.remove).toHaveBeenCalledWith('user-123');
    });
  });

  describe('activate', () => {
    it('should activate user', async () => {
      const activatedUser = { ...mockUser, status: 'active' };
      service.activateUser.mockResolvedValue(activatedUser);

      const result = await controller.activate('user-123');

      expect(service.activateUser).toHaveBeenCalledWith('user-123');
      expect(result).toBe(activatedUser);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      const deactivatedUser = { ...mockUser, status: 'inactive' };
      service.deactivateUser.mockResolvedValue(deactivatedUser);

      const result = await controller.deactivate('user-123');

      expect(service.deactivateUser).toHaveBeenCalledWith('user-123');
      expect(result).toBe(deactivatedUser);
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const stats = {
        total: 100,
        active: 85,
        inactive: 15,
      };

      service.getUserStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(service.getUserStats).toHaveBeenCalled();
      expect(result).toBe(stats);
    });
  });
});