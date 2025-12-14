import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsPhoneNumber,
  IsObject,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserStatus } from '../../../entities/user.entity';
import { UserRole } from '@accu/shared';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({
    description: 'User roles',
    enum: UserRole,
    isArray: true,
    required: false,
    example: ['user'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: UserRole[];

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    description: 'Phone number',
    required: false,
    example: '+61 400 123 456',
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Avatar URL',
    required: false,
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'Tenant ID (for multi-tenant support)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({
    description: 'Additional user metadata',
    required: false,
    example: { department: 'IT', title: 'Developer' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'User first name',
    required: false,
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    required: false,
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiProperty({
    description: 'User email address',
    required: false,
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    description: 'Phone number',
    required: false,
    example: '+61 400 123 456',
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Avatar URL',
    required: false,
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'Tenant ID (for multi-tenant support)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({
    description: 'Additional user metadata',
    required: false,
    example: { department: 'IT', title: 'Developer' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'User roles',
    enum: UserRole,
    isArray: true,
    required: false,
    example: ['user', 'manager'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: UserRole[];
}

export class ChangeUserPasswordDto {
  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'newSecurePassword456!',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UserQueryDto {
  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: 'Search term for name or email',
    required: false,
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by user status',
    enum: UserStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    description: 'Filter by role name',
    required: false,
    example: 'user',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    description: 'Sort field',
    required: false,
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
  })
  status: UserStatus;

  @ApiProperty({
    description: 'Phone number',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Avatar URL',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    description: 'Tenant ID',
    required: false,
  })
  tenantId?: string;

  @ApiProperty({
    description: 'Additional user metadata',
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'User roles',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  roles: {
    id: string;
    name: string;
    description?: string;
  }[];

  @ApiProperty({
    description: 'Last login timestamp',
    required: false,
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'User creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Full name (computed property)',
    example: 'John Doe',
  })
  fullName: string;
}

export class UsersPaginatedResponseDto {
  @ApiProperty({
    description: 'List of users',
    type: [UserResponseDto],
  })
  data: UserResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
    properties: {
      page: { type: 'number' },
      limit: { type: 'number' },
      total: { type: 'number' },
      totalPages: { type: 'number' },
      hasNext: { type: 'boolean' },
      hasPrev: { type: 'boolean' },
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ToggleUserStatusDto {
  @ApiProperty({
    description: 'New user status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus)
  status: UserStatus;
}