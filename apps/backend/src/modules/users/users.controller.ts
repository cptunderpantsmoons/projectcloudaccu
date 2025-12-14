import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../entities/role.entity';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
  UsersPaginatedResponseDto,
  ChangeUserPasswordDto,
  ToggleUserStatusDto,
} from './dto';
import { UserStatus } from '../../entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Get()
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: UsersPaginatedResponseDto,
  })
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    type: Object,
  })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Tenant ID for filtering' })
  async getUserStats(@Query('tenantId') tenantId?: string) {
    return this.usersService.getUserStats(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'manager')
  @Permissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOne(id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, updateUserDto);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Toggle user status' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: ToggleUserStatusDto })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() toggleStatusDto: ToggleUserStatusDto,
  ) {
    const user = await this.usersService.toggleStatus(id, toggleStatusDto.status);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch(':id/activate')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Activate user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User activated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.activateUser(id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch(':id/deactivate')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivateUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.deactivateUser(id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_DELETE)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }

  @Patch(':id/password')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: ChangeUserPasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangeUserPasswordDto,
  ) {
    await this.usersService.changePassword(id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Post(':id/roles')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roleName: {
          type: 'string',
          description: 'Role name',
          example: 'manager',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Role assigned successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { roleName: string },
  ) {
    const user = await this.usersService.assignRole(id, body.roleName);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Delete(':id/roles/:roleName')
  @Roles('admin', 'super_admin')
  @Permissions(Permission.USERS_WRITE)
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'roleName', description: 'Role name' })
  @ApiResponse({
    status: 200,
    description: 'Role removed successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async revokeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleName') roleName: string,
  ) {
    const user = await this.usersService.revokeRole(id, roleName);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Get('me/profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const { password, ...userWithoutPassword } = req.user;
    return userWithoutPassword;
  }

  @Put('me/profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateUserDto) {
    // Remove sensitive fields that users shouldn't be able to update themselves
    const { email, roles, status, ...safeUpdateData } = updateProfileDto;
    
    const user = await this.usersService.update(req.user.id, safeUpdateData);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch('me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Change own password' })
  @ApiBody({ type: ChangeUserPasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changeOwnPassword(
    @Request() req,
    @Body() changePasswordDto: ChangeUserPasswordDto,
  ) {
    await this.usersService.changePassword(req.user.id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }
}