import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserStatus } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { CreateUserRequest } from '@accu/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user) {
      return null;
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: User): Promise<AuthResult> {
    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(role => role.name),
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.refreshTokenExpiry', '7d'),
    });

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as Omit<User, 'password'>,
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenExpiry(),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Get default role or assign user role
    let roles: Role[] = [];
    if (registerDto.roles && registerDto.roles.length > 0) {
      roles = await this.roleRepository.findBy({
        name: In(registerDto.roles),
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
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      roles,
      tenantId: registerDto.tenantId,
    });

    const savedUser = await this.userRepository.save(user);

    return this.login(savedUser);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResult> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
      
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['roles'],
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Don't allow updating sensitive fields through this method
    const { password, email, roles, ...safeUpdateData } = updateData;

    Object.assign(user, safeUpdateData);
    return this.userRepository.save(user);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });
  }

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

  async deactivateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.INACTIVE;
    return this.userRepository.save(user);
  }

  async activateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }

  private getAccessTokenExpiry(): number {
    const expiry = this.configService.get('jwt.accessTokenExpiry', '15m');
    // Convert to milliseconds
    const value = parseInt(expiry.replace('m', '')) || 15;
    return value * 60 * 1000;
  }

  async validateUserPermissions(userId: string, requiredPermissions: string[]): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return false;
    }

    // Check if user has any of the required permissions
    return user.roles.some(role =>
      requiredPermissions.some(permission => role.permissions.includes(permission as any))
    );
  }
}