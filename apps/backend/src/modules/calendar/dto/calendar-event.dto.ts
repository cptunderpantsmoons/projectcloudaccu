import { IsString, IsEnum, IsOptional, IsDate, IsBoolean, IsArray, IsNumber, ValidateNested, IsUUID, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, Priority } from '../../../entities/calendar-event.entity';

export class CalendarEventCreateDto {
  @ApiProperty({ description: 'Event title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: EventType, description: 'Event type' })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ enum: Priority, description: 'Event priority' })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ description: 'Event start date', type: 'string', format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiPropertyOptional({ description: 'Event end date', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Is all day event' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean = false;

  @ApiPropertyOptional({ description: 'Recurrence rule (RFC 5545 RRULE format)' })
  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Reminder days before event', type: [Number], example: [1, 7, 30] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  reminders?: number[] = [1, 7, 30];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenancy' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class CalendarEventUpdateDto {
  @ApiPropertyOptional({ description: 'Event title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: EventType, description: 'Event type' })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ enum: Priority, description: 'Event priority' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Event start date', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Event end date', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Is all day event' })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: 'Recurrence rule (RFC 5545 RRULE format)' })
  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: 'Project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Reminder days before event', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  reminders?: number[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CalendarEventQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Sort field', default: 'startDate' })
  @IsOptional()
  @IsString()
  sort?: string = 'startDate';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Search term for title/description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EventType, description: 'Filter by event type' })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ enum: Priority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by assignee ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Filter by creator ID' })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({ description: 'Start date filter', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDateFrom?: Date;

  @ApiPropertyOptional({ description: 'End date filter', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDateTo?: Date;

  @ApiPropertyOptional({ description: 'Include overdue events only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  overdue?: boolean;

  @ApiPropertyOptional({ description: 'Include upcoming events only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  upcoming?: boolean;

  @ApiPropertyOptional({ description: 'Include recurring events only' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  recurring?: boolean;

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenancy' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class DeadlineDto {
  @ApiProperty({ description: 'Deadline event ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Deadline title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Due date', type: 'string', format: 'date-time' })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiProperty({ enum: Priority, description: 'Deadline priority' })
  @IsEnum(Priority)
  priority: Priority;

  @ApiPropertyOptional({ description: 'Associated project' })
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Assigned user' })
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({ description: 'Days remaining' })
  @IsNumber()
  daysRemaining: number;

  @ApiProperty({ description: 'Is overdue' })
  @IsBoolean()
  isOverdue: boolean;

  @ApiProperty({ description: 'Is completed' })
  @IsBoolean()
  isCompleted: boolean;

  @ApiPropertyOptional({ description: 'Completion date', type: 'string', format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ReminderDto {
  @ApiProperty({ description: 'Event ID' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ description: 'Days before event to send reminder', example: 1 })
  @IsNumber()
  daysBefore: number;

  @ApiPropertyOptional({ description: 'Custom reminder message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Notification channels', enum: ['in_app', 'email', 'sms'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[] = ['in_app', 'email'];
}

export class CalendarViewDto {
  @ApiProperty({ description: 'Year for calendar view' })
  @IsNumber()
  @Type(() => Number)
  year: number;

  @ApiProperty({ description: 'Month for calendar view (1-12)' })
  @IsNumber()
  @Type(() => Number)
  month: number;

  @ApiPropertyOptional({ description: 'Day for daily view (1-31)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  day?: number;

  @ApiPropertyOptional({ description: 'View type', enum: ['monthly', 'weekly', 'daily'] })
  @IsOptional()
  @IsString()
  viewType?: 'monthly' | 'weekly' | 'daily' = 'monthly';

  @ApiPropertyOptional({ description: 'Filter by event types', enum: EventType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(EventType, { each: true })
  eventTypes?: EventType[];

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenancy' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class EventConflictDto {
  @ApiProperty({ description: 'Conflicting event ID' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ description: 'Conflict type' })
  @IsString()
  conflictType: string;

  @ApiProperty({ description: 'Conflict description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Conflicting event data' })
  @ValidateNested()
  @Type(() => CalendarEventCreateDto)
  conflictingEvent: CalendarEventCreateDto;
}

export class EventTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: EventType, description: 'Event type' })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ enum: Priority, description: 'Default priority' })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ description: 'Default duration in hours' })
  @IsNumber()
  defaultDuration: number;

  @ApiPropertyOptional({ description: 'Default reminder settings' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  defaultReminders?: number[];

  @ApiPropertyOptional({ description: 'Template metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}