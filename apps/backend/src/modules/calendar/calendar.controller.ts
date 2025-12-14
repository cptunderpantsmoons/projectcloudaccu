import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CalendarEventCreateDto,
  CalendarEventUpdateDto,
  CalendarEventQueryDto,
  ReminderDto,
  CalendarViewDto,
} from './dto/calendar-event.dto';
import { CalendarEvent } from '../../../entities/calendar-event.entity';

@ApiTags('Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('calendar')
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(private readonly calendarService: CalendarService) {}

  // Event CRUD Operations
  @Post('events')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Create a new calendar event' })
  @ApiBody({ type: CalendarEventCreateDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event created successfully',
    type: CalendarEvent,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async createEvent(
    @Body() createDto: CalendarEventCreateDto,
    @Query('userId') userId: string,
  ): Promise<CalendarEvent> {
    this.logger.log(`Creating calendar event: ${createDto.title}`);
    return this.calendarService.createEvent(createDto, userId);
  }

  @Get('events')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get calendar events with filtering and pagination' })
  @ApiQuery({ type: CalendarEventQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Events retrieved successfully',
  })
  async getEvents(@Query() query: CalendarEventQueryDto) {
    this.logger.log(`Getting calendar events with filters: ${JSON.stringify(query)}`);
    return this.calendarService.getEvents(query);
  }

  @Get('events/dashboard')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get calendar dashboard data' })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(@Query('tenantId') tenantId?: string) {
    this.logger.log(`Getting calendar dashboard for tenant: ${tenantId || 'none'}`);
    const stats = await this.calendarService.getCalendarStats(tenantId);
    
    // Get recent and upcoming events
    const upcomingQuery: CalendarEventQueryDto = {
      upcoming: true,
      limit: 10,
      page: 1,
      tenantId,
    };
    
    const overdueQuery: CalendarEventQueryDto = {
      overdue: true,
      limit: 10,
      page: 1,
      tenantId,
    };

    const [upcomingEvents, overdueEvents] = await Promise.all([
      this.calendarService.getEvents(upcomingQuery),
      this.calendarService.getEvents(overdueQuery),
    ]);

    return {
      stats,
      upcomingEvents: upcomingEvents.events,
      overdueEvents: overdueEvents.events,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('events/upcoming')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look ahead (default: 30)' })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upcoming events retrieved successfully',
  })
  async getUpcomingEvents(
    @Query('days') days?: number,
    @Query('tenantId') tenantId?: string,
  ) {
    this.logger.log(`Getting upcoming events for next ${days || 30} days`);
    const upcomingDeadlines = await this.calendarService.getUpcomingDeadlines(days || 30);
    
    // Also get upcoming non-deadline events
    const query: CalendarEventQueryDto = {
      upcoming: true,
      limit: 50,
      page: 1,
      tenantId,
    };
    
    const { events } = await this.calendarService.getEvents(query);
    
    return {
      deadlines: upcomingDeadlines,
      events: events.filter(e => e.type !== 'deadline'),
      period: days || 30,
    };
  }

  @Get('events/overdue')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get overdue deadlines' })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overdue events retrieved successfully',
  })
  async getOverdueEvents(@Query('tenantId') tenantId?: string) {
    this.logger.log('Getting overdue events');
    const overdueDeadlines = await this.calendarService.getOverdueDeadlines();
    
    // Filter by tenant if provided
    if (tenantId) {
      return overdueDeadlines.filter(deadline => 
        !deadline.metadata?.tenantId || deadline.metadata.tenantId === tenantId
      );
    }
    
    return overdueDeadlines;
  }

  @Get('events/:id')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get calendar event by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event retrieved successfully',
    type: CalendarEvent,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async getEventById(@Param('id') id: string): Promise<CalendarEvent> {
    this.logger.log(`Getting calendar event: ${id}`);
    return this.calendarService.getEventById(id);
  }

  @Put('events/:id')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Update calendar event' })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @ApiBody({ type: CalendarEventUpdateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event updated successfully',
    type: CalendarEvent,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateDto: CalendarEventUpdateDto,
    @Query('userId') userId: string,
  ): Promise<CalendarEvent> {
    this.logger.log(`Updating calendar event: ${id}`);
    return this.calendarService.updateEvent(id, updateDto, userId);
  }

  @Delete('events/:id')
  @Permissions('calendar.events.delete')
  @ApiOperation({ summary: 'Delete calendar event' })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Event deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async deleteEvent(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting calendar event: ${id}`);
    return this.calendarService.deleteEvent(id);
  }

  // Reminder Management
  @Post('events/:id/reminders')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Set custom reminders for an event' })
  @ApiParam({ name: 'id', type: String, description: 'Event ID' })
  @ApiBody({ type: ReminderDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reminders set successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async setCustomReminders(
    @Param('id') eventId: string,
    @Body() reminderDto: ReminderDto,
  ) {
    this.logger.log(`Setting custom reminders for event: ${eventId}`);
    
    // Get the event
    const event = await this.calendarService.getEventById(eventId);
    
    // Update reminders
    const updatedEvent = await this.calendarService.updateEvent(
      eventId,
      { reminders: [reminderDto.daysBefore] },
      event.createdById,
    );

    return {
      message: 'Custom reminders set successfully',
      event: updatedEvent,
      reminder: reminderDto,
    };
  }

  // Deadline Management
  @Get('deadlines')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get all deadlines' })
  @ApiQuery({ type: CalendarEventQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deadlines retrieved successfully',
  })
  async getDeadlines(@Query() query: CalendarEventQueryDto) {
    this.logger.log('Getting all deadlines');
    return this.calendarService.getDeadlines(query);
  }

  @Get('deadlines/:id')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get specific deadline details' })
  @ApiParam({ name: 'id', type: String, description: 'Deadline ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deadline retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deadline not found',
  })
  async getDeadlineById(@Param('id') id: string) {
    this.logger.log(`Getting deadline: ${id}`);
    const deadline = await this.calendarService.getEventById(id);
    
    if (deadline.type !== 'deadline') {
      throw new Error('Event is not a deadline');
    }
    
    return deadline;
  }

  @Post('deadlines/:id/complete')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Mark deadline as complete' })
  @ApiParam({ name: 'id', type: String, description: 'Deadline ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deadline marked as complete',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deadline not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Event is not a deadline',
  })
  async completeDeadline(@Param('id') id: string): Promise<CalendarEvent> {
    this.logger.log(`Marking deadline as complete: ${id}`);
    return this.calendarService.completeDeadline(id);
  }

  // Calendar Views
  @Get('calendar/:year/:month')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get monthly calendar view' })
  @ApiParam({ name: 'year', type: Number, description: 'Year (e.g., 2024)' })
  @ApiParam({ name: 'month', type: Number, description: 'Month (1-12)' })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiQuery({ name: 'eventTypes', required: false, type: [String], description: 'Filter by event types' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monthly calendar view retrieved successfully',
  })
  async getMonthlyView(
    @Param('year') year: number,
    @Param('month') month: number,
    @Query('tenantId') tenantId?: string,
    @Query('eventTypes') eventTypes?: string[],
  ) {
    this.logger.log(`Getting monthly calendar view: ${year}/${month}`);
    
    const viewData = await this.calendarService.getCalendarView(
      year,
      month,
      undefined,
      tenantId,
    );

    // Filter by event types if provided
    if (eventTypes && eventTypes.length > 0) {
      viewData.days = viewData.days.map((day: any) => ({
        ...day,
        events: day.events.filter((event: any) => eventTypes.includes(event.type)),
      }));
    }

    return {
      ...viewData,
      filters: {
        eventTypes: eventTypes || [],
        tenantId,
      },
    };
  }

  @Get('calendar/:year/:month/:day')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get daily calendar view' })
  @ApiParam({ name: 'year', type: Number, description: 'Year (e.g., 2024)' })
  @ApiParam({ name: 'month', type: Number, description: 'Month (1-12)' })
  @ApiParam({ name: 'day', type: Number, description: 'Day (1-31)' })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Daily calendar view retrieved successfully',
  })
  async getDailyView(
    @Param('year') year: number,
    @Param('month') month: number,
    @Param('day') day: number,
    @Query('tenantId') tenantId?: string,
  ) {
    this.logger.log(`Getting daily calendar view: ${year}/${month}/${day}`);
    
    return this.calendarService.getCalendarView(
      year,
      month,
      day,
      tenantId,
    );
  }

  // Analytics and Statistics
  @Get('stats')
  @Permissions('calendar.events.read')
  @ApiOperation({ summary: 'Get calendar statistics and analytics' })
  @ApiQuery({ name: 'tenantId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calendar statistics retrieved successfully',
  })
  async getStats(@Query('tenantId') tenantId?: string) {
    this.logger.log('Getting calendar statistics');
    return this.calendarService.getCalendarStats(tenantId);
  }

  // Conflict Detection
  @Post('conflicts')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Check for event conflicts' })
  @ApiBody({ type: CalendarEventCreateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conflict check completed',
  })
  async checkConflicts(@Body() eventData: CalendarEventCreateDto) {
    this.logger.log('Checking for event conflicts');
    const conflicts = await this.calendarService.detectConflicts(eventData);
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      timestamp: new Date().toISOString(),
    };
  }

  // Integration Endpoints
  @Post('accu/:applicationId/deadlines')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Create ACCU application deadlines' })
  @ApiParam({ name: 'applicationId', type: String, description: 'ACCU Application ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dueDate: { type: 'string', format: 'date-time' },
        projectId: { type: 'string' },
        createdById: { type: 'string' },
      },
      required: ['dueDate', 'projectId', 'createdById'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'ACCU deadlines created successfully',
  })
  async createACCUApplicationDeadlines(
    @Param('applicationId') applicationId: string,
    @Body() body: { dueDate: Date; projectId: string; createdById: string },
  ) {
    this.logger.log(`Creating ACCU application deadlines for: ${applicationId}`);
    const events = await this.calendarService.createACCUApplicationDeadlines(
      applicationId,
      body.dueDate,
      body.projectId,
      body.createdById,
    );

    return {
      message: 'ACCU application deadlines created successfully',
      events,
      applicationId,
    };
  }

  @Post('projects/:projectId/milestones')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Create project milestone deadlines' })
  @ApiParam({ name: 'projectId', type: String, description: 'Project ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              dueDate: { type: 'string', format: 'date-time' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            },
            required: ['name', 'dueDate', 'priority'],
          },
        },
        createdById: { type: 'string' },
      },
      required: ['milestones', 'createdById'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project milestone deadlines created successfully',
  })
  async createProjectMilestones(
    @Param('projectId') projectId: string,
    @Body() body: { milestones: Array<{ name: string; dueDate: Date; priority: string }>; createdById: string },
  ) {
    this.logger.log(`Creating project milestone deadlines for project: ${projectId}`);
    const events = await this.calendarService.createProjectMilestones(
      projectId,
      body.milestones,
      body.createdById,
    );

    return {
      message: 'Project milestone deadlines created successfully',
      events,
      projectId,
    };
  }

  @Post('audits/:auditId/events')
  @Permissions('calendar.events.write')
  @ApiOperation({ summary: 'Create audit-related events' })
  @ApiParam({ name: 'auditId', type: String, description: 'Audit ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        leadAuditorId: { type: 'string' },
        createdById: { type: 'string' },
      },
      required: ['title', 'startDate', 'endDate', 'leadAuditorId', 'createdById'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Audit events created successfully',
  })
  async createAuditEvents(
    @Param('auditId') auditId: string,
    @Body() body: {
      title: string;
      startDate: Date;
      endDate: Date;
      leadAuditorId: string;
      createdById: string;
    },
  ) {
    this.logger.log(`Creating audit events for audit: ${auditId}`);
    const events = await this.calendarService.createAuditEvents(
      auditId,
      body,
      body.createdById,
    );

    return {
      message: 'Audit events created successfully',
      events,
      auditId,
    };
  }
}