import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UsersPaginatedResponseDto,
  ChangeUserPasswordDto,
} from './dto';

export interface UsersListOptions extends UserQueryDto {
  tenantId?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Get roles
    let roles: Role[] = [];
    if (createUserDto.roles && createUserDto.roles.length > 0) {
      roles = await this.roleRepository.findBy({
        name: createUserDto.roles,
      });
    } else {
      const userRole = await this.roleRepository.findOne({
        where: { name: 'user' },
      });
      if (userRole) {
        roles = [userRole];
      }
    }

    // Create user
    const user = this.userRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      status: createUserDto.status || UserStatus.ACTIVE,
      phoneNumber: createUserDto.phoneNumber,
      avatar: createUserDto.avatar,
      tenantId: createUserDto.tenantId,
      metadata: createUserDto.metadata,
      roles,
    });

    return this.userRepository.save(user);
  }

  /**
   * Get all users with pagination and filtering
   */
  async findAll(options: UsersListOptions): Promise<UsersPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      role,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      tenantId,
    } = options;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (role) {
      queryBuilder.andWhere('role.name = :role', { role });
    }

    if (tenantId) {
      queryBuilder.andWhere('user.tenantId = :tenantId', { tenantId });
    }

    // Apply sorting
    const allowedSortFields = [
      'firstName',
      'lastName',
      'email',
      'status',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
    ];

    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const users = await queryBuilder.getMany();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: users.map(this.formatUserResponse),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Get user by ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is already taken by another user
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Handle role updates
    if (updateUserDto.roles) {
      const roles = await this.roleRepository.findBy({
        name: updateUserDto.roles,
      });
      user.roles = roles;
    }

    // Update user fields
    Object.assign(user, {
      ...updateUserDto,
      roles: updateUserDto.roles ? user.roles : user.roles, // Preserve roles if not updated
    });

    return this.userRepository.save(user);
  }

  /**
   * Delete user (soft delete)
   */
  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by setting status to inactive
    await this.userRepository.update(id, {
      status: UserStatus.INACTIVE,
    });
  }

  /**
   * Change user password
   */
  async changePassword(id: string, changePasswordDto: ChangeUserPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    await this.userRepository.update(id, {
      password: hashedPassword,
    });
  }

  /**
   * Toggle user status
   */
  async toggleStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = status;
    return this.userRepository.save(user);
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleName: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if user already has this role
    if (user.roles.some(r => r.name === roleName)) {
      throw new BadRequestException('User already has this role');
    }

    user.roles.push(role);
    return this.userRepository.save(user);
  }

  /**
   * Remove role from user
   */
  async revokeRole(userId: string, roleName: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.roles = user.roles.filter(role => role.name !== roleName);
    return this.userRepository.save(user);
  }

  /**
   * Activate user
   */
  async activateUser(id: string): Promise<User> {
    return this.toggleStatus(id, UserStatus.ACTIVE);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: string): Promise<User> {
    return this.toggleStatus(id, UserStatus.INACTIVE);
  }

  /**
   * Get user statistics
   */
  async getUserStats(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    pending: number;
  }> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (tenantId) {
      queryBuilder.where('user.tenantId = :tenantId', { tenantId });
    }

    const total = await queryBuilder.getCount();
    const active = await queryBuilder
      .clone()
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .getCount();
    const inactive = await queryBuilder
      .clone()
      .andWhere('user.status = :status', { status: UserStatus.INACTIVE })
      .getCount();
    const suspended = await queryBuilder
      .clone()
      .andWhere('user.status = :status', { status: UserStatus.SUSPENDED })
      .getCount();
    const pending = await queryBuilder
      .clone()
      .andWhere('user.status = :status', { status: UserStatus.PENDING })
      .getCount();

    return {
      total,
      active,
      inactive,
      suspended,
      pending,
    };
  }

  /**
   * Format user response (exclude password)
   */
  private formatUserResponse(user: User): any {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}