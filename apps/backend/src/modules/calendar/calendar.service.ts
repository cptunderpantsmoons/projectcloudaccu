import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual, Not, LessThan } from 'typeorm';
import { CalendarEvent, EventType, Priority } from '../../entities/calendar-event.entity';
import { NotificationType, NotificationChannel } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CalendarEventCreateDto, CalendarEventUpdateDto, CalendarEventQueryDto, DeadlineDto, ReminderDto } from './dto/calendar-event.dto';

export interface EventConflict {
  eventId: string;
  conflictType: string;
  description: string;
  conflictingEvent: CalendarEvent;
}

export interface CalendarStats {
  totalEvents: number;
  upcomingEvents: number;
  overdueDeadlines: number;
  completedDeadlines: number;
  eventsByType: Record<EventType, number>;
  eventsByPriority: Record<Priority, number>;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private notificationsService: NotificationsService,
  ) {}

  // CRUD Operations
  async createEvent(createDto: CalendarEventCreateDto, createdById: string): Promise<CalendarEvent> {
    try {
      // Validate user exists
      const creator = await this.userRepository.findOne({ where: { id: createdById } });
      if (!creator) {
        throw new BadRequestException('Creator user not found');
      }

      // Validate project exists if provided
      if (createDto.projectId) {
        const project = await this.projectRepository.findOne({ where: { id: createDto.projectId } });
        if (!project) {
          throw new BadRequestException('Project not found');
        }
      }

      // Validate assignee exists if provided
      if (createDto.assigneeId) {
        const assignee = await this.userRepository.findOne({ where: { id: createDto.assigneeId } });
        if (!assignee) {
          throw new BadRequestException('Assignee not found');
        }
      }

      // Check for scheduling conflicts
      const conflicts = await this.detectConflicts(createDto);
      if (conflicts.length > 0) {
        this.logger.warn(`Scheduling conflicts detected for event creation: ${conflicts.length} conflicts`);
        // For now, we allow creation but could implement strict conflict checking
      }

      // Create the event
      const event = this.calendarEventRepository.create({
        ...createDto,
        createdById,
        createdBy: creator,
      });

      const savedEvent = await this.calendarEventRepository.save(event);

      // Set up reminders
      if (savedEvent.reminders && savedEvent.reminders.length > 0) {
        await this.scheduleReminders(savedEvent);
      }

      // If it's a deadline, set up deadline tracking
      if (savedEvent.type === EventType.DEADLINE) {
        await this.setupDeadlineTracking(savedEvent);
      }

      this.logger.log(`Created calendar event: ${savedEvent.id} - ${savedEvent.title}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Error creating calendar event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getEvents(query: CalendarEventQueryDto): Promise<{ events: CalendarEvent[]; total: number; pagination: any }> {
    try {
      const queryBuilder = this.calendarEventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.project', 'project')
        .leftJoinAndSelect('event.assignee', 'assignee')
        .leftJoinAndSelect('event.createdBy', 'createdBy');

      // Apply filters
      if (query.search) {
        queryBuilder.andWhere(
          '(event.title ILIKE :search OR event.description ILIKE :search)',
          { search: `%${query.search}%` }
        );
      }

      if (query.type) {
        queryBuilder.andWhere('event.type = :type', { type: query.type });
      }

      if (query.priority) {
        queryBuilder.andWhere('event.priority = :priority', { priority: query.priority });
      }

      if (query.projectId) {
        queryBuilder.andWhere('event.projectId = :projectId', { projectId: query.projectId });
      }

      if (query.assigneeId) {
        queryBuilder.andWhere('event.assigneeId = :assigneeId', { assigneeId: query.assigneeId });
      }

      if (query.createdById) {
        queryBuilder.andWhere('event.createdById = :createdById', { createdById: query.createdById });
      }

      if (query.startDateFrom) {
        queryBuilder.andWhere('event.startDate >= :startDateFrom', { startDateFrom: query.startDateFrom });
      }

      if (query.startDateTo) {
        queryBuilder.andWhere('event.startDate <= :startDateTo', { startDateTo: query.startDateTo });
      }

      if (query.overdue) {
        const now = new Date();
        queryBuilder.andWhere('event.type = :type AND event.startDate < :now', { 
          type: EventType.DEADLINE, 
          now 
        });
      }

      if (query.upcoming) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30); // Next 30 days
        queryBuilder.andWhere('event.startDate >= :now AND event.startDate <= :futureDate', { 
          now, 
          futureDate 
        });
      }

      if (query.recurring) {
        queryBuilder.andWhere('event.recurrenceRule IS NOT NULL');
      }

      if (query.tenantId) {
        queryBuilder.andWhere('event.tenantId = :tenantId', { tenantId: query.tenantId });
      }

      // Apply sorting
      const sortField = query.sort || 'startDate';
      const sortOrder = query.order === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`event.${sortField}`, sortOrder);

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 50;
      const skip = (page - 1) * limit;

      queryBuilder.skip(skip).take(limit);

      const [events, total] = await queryBuilder.getManyAndCount();

      return {
        events,
        total,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting events: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getEventById(id: string): Promise<CalendarEvent> {
    try {
      const event = await this.calendarEventRepository.findOne({
        where: { id },
        relations: ['project', 'assignee', 'createdBy'],
      });

      if (!event) {
        throw new NotFoundException(`Calendar event with ID ${id} not found`);
      }

      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting event by ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateEvent(id: string, updateDto: CalendarEventUpdateDto, updatedById: string): Promise<CalendarEvent> {
    try {
      const event = await this.getEventById(id);

      // Update fields
      Object.assign(event, updateDto);

      // Check for conflicts if time/date changed
      if (updateDto.startDate || updateDto.endDate) {
        const conflicts = await this.detectConflicts(updateDto as CalendarEventCreateDto, id);
        if (conflicts.length > 0) {
          this.logger.warn(`Scheduling conflicts detected for event update: ${conflicts.length} conflicts`);
        }
      }

      const updatedEvent = await this.calendarEventRepository.save(event);

      // Update reminders if changed
      if (updateDto.reminders) {
        await this.updateReminders(updatedEvent);
      }

      this.logger.log(`Updated calendar event: ${updatedEvent.id}`);
      return updatedEvent;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating event ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      const event = await this.getEventById(id);
      
      // Cancel any scheduled reminders
      await this.cancelReminders(event);
      
      await this.calendarEventRepository.remove(event);
      this.logger.log(`Deleted calendar event: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting event ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Event Engine Features
  async detectConflicts(eventData: CalendarEventCreateDto, excludeEventId?: string): Promise<EventConflict[]> {
    try {
      const conflicts: EventConflict[] = [];

      // Get overlapping events
      const queryBuilder = this.calendarEventRepository.createQueryBuilder('event');

      if (excludeEventId) {
        queryBuilder.where('event.id != :excludeId', { excludeId: excludeEventId });
      }

      // Time overlap conditions
      if (eventData.startDate && eventData.endDate) {
        queryBuilder.andWhere(
          '(event.startDate <= :endDate AND event.endDate >= :startDate)',
          { startDate: eventData.startDate, endDate: eventData.endDate }
        );
      } else if (eventData.startDate) {
        // For all-day events or single point events
        queryBuilder.andWhere(
          '(event.startDate <= :startDate AND (event.endDate >= :startDate OR event.endDate IS NULL))',
          { startDate: eventData.startDate }
        );
      }

      // Same assignee conflicts
      if (eventData.assigneeId) {
        queryBuilder.andWhere('event.assigneeId = :assigneeId', { assigneeId: eventData.assigneeId });
      }

      const conflictingEvents = await queryBuilder.getMany();

      for (const conflictingEvent of conflictingEvents) {
        conflicts.push({
          eventId: conflictingEvent.id,
          conflictType: 'time_overlap',
          description: `Event conflicts with "${conflictingEvent.title}"`,
          conflictingEvent,
        });
      }

      return conflicts;
    } catch (error) {
      this.logger.error(`Error detecting conflicts: ${error.message}`, error.stack);
      return [];
    }
  }

  async scheduleReminders(event: CalendarEvent): Promise<void> {
    try {
      if (!event.reminders || event.reminders.length === 0) return;

      for (const daysBefore of event.reminders) {
        const reminderDate = new Date(event.startDate);
        reminderDate.setDate(reminderDate.getDate() - daysBefore);

        if (reminderDate > new Date()) {
          // Schedule reminder notification
          await this.notificationsService.createNotification({
            type: NotificationType.REMINDER,
            channel: NotificationChannel.IN_APP,
            title: `Reminder: ${event.title}`,
            message: `Event "${event.title}" is scheduled for ${event.startDate.toLocaleDateString()}`,
            userId: event.assigneeId || event.createdById,
            metadata: {
              eventId: event.id,
              reminderDate: reminderDate.toISOString(),
              daysBefore,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error scheduling reminders for event ${event.id}: ${error.message}`, error.stack);
    }
  }

  async updateReminders(event: CalendarEvent): Promise<void> {
    // Cancel existing reminders
    await this.cancelReminders(event);
    
    // Schedule new reminders
    await this.scheduleReminders(event);
  }

  async cancelReminders(event: CalendarEvent): Promise<void> {
    try {
      // Cancel scheduled notifications for this event
      await this.notificationsService.cancelNotificationsByMetadata('eventId', event.id);
    } catch (error) {
      this.logger.error(`Error canceling reminders for event ${event.id}: ${error.message}`, error.stack);
    }
  }

  // Deadline Management
  async getDeadlines(query: CalendarEventQueryDto = {}): Promise<DeadlineDto[]> {
    try {
      const deadlinesQuery: CalendarEventQueryDto = {
        ...query,
        type: EventType.DEADLINE,
      };

      const { events } = await this.getEvents(deadlinesQuery);
      
      return events.map(event => this.mapToDeadlineDto(event));
    } catch (error) {
      this.logger.error(`Error getting deadlines: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOverdueDeadlines(): Promise<DeadlineDto[]> {
    try {
      const now = new Date();
      const overdueEvents = await this.calendarEventRepository.find({
        where: {
          type: EventType.DEADLINE,
          startDate: LessThan(now),
        },
        relations: ['project', 'assignee'],
      });

      return overdueEvents.map(event => this.mapToDeadlineDto(event));
    } catch (error) {
      this.logger.error(`Error getting overdue deadlines: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUpcomingDeadlines(days: number = 30): Promise<DeadlineDto[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const upcomingEvents = await this.calendarEventRepository.find({
        where: {
          type: EventType.DEADLINE,
          startDate: Between(now, futureDate),
        },
        relations: ['project', 'assignee'],
        order: { startDate: 'ASC' },
      });

      return upcomingEvents.map(event => this.mapToDeadlineDto(event));
    } catch (error) {
      this.logger.error(`Error getting upcoming deadlines: ${error.message}`, error.stack);
      throw error;
    }
  }

  async completeDeadline(id: string): Promise<CalendarEvent> {
    try {
      const deadline = await this.getEventById(id);
      
      if (deadline.type !== EventType.DEADLINE) {
        throw new BadRequestException('Event is not a deadline');
      }

      // Mark as completed by setting metadata
      deadline.metadata = {
        ...deadline.metadata,
        completedAt: new Date().toISOString(),
        completed: true,
      };

      const completedDeadline = await this.calendarEventRepository.save(deadline);

      // Send completion notification
      await this.notificationsService.createNotification({
        type: NotificationType.SUCCESS,
        channel: NotificationChannel.IN_APP,
        title: 'Deadline Completed',
        message: `Deadline "${deadline.title}" has been marked as completed`,
        userId: deadline.assigneeId || deadline.createdById,
        metadata: { eventId: deadline.id },
      });

      return completedDeadline;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error completing deadline ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async setupDeadlineTracking(deadline: CalendarEvent): Promise<void> {
    try {
      // Set up automated tracking for critical deadlines
      if (deadline.priority === Priority.CRITICAL || deadline.priority === Priority.HIGH) {
        await this.notificationsService.createNotification({
          type: NotificationType.WARNING,
          channel: NotificationChannel.IN_APP,
          title: 'New High Priority Deadline',
          message: `New ${deadline.priority.toLowerCase()} deadline: "${deadline.title}"`,
          userId: deadline.assigneeId || deadline.createdById,
          metadata: {
            eventId: deadline.id,
            deadlineDate: deadline.startDate.toISOString(),
            priority: deadline.priority,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error setting up deadline tracking for ${deadline.id}: ${error.message}`, error.stack);
    }
  }

  // Calendar Views
  async getCalendarView(year: number, month: number, day?: number, tenantId?: string): Promise<any> {
    try {
      const startDate = day 
        ? new Date(year, month - 1, day)
        : new Date(year, month - 1, 1);
      
      const endDate = day
        ? new Date(year, month - 1, day, 23, 59, 59)
        : new Date(year, month, 0, 23, 59, 59);

      const queryBuilder = this.calendarEventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.project', 'project')
        .leftJoinAndSelect('event.assignee', 'assignee')
        .where('event.startDate BETWEEN :startDate AND :endDate', { startDate, endDate });

      if (tenantId) {
        queryBuilder.andWhere('event.tenantId = :tenantId', { tenantId });
      }

      const events = await queryBuilder.getMany();

      if (day) {
        // Daily view
        return {
          date: startDate,
          events: events.map(event => ({
            id: event.id,
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            type: event.type,
            priority: event.priority,
            isAllDay: event.isAllDay,
          })),
        };
      } else {
        // Monthly view - group by day
        const daysInMonth = new Date(year, month, 0).getDate();
        const calendarData = [];

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
          const dayStart = new Date(year, month - 1, dayNum);
          const dayEnd = new Date(year, month - 1, dayNum, 23, 59, 59);
          
          const dayEvents = events.filter(event => 
            event.startDate >= dayStart && event.startDate <= dayEnd
          );

          calendarData.push({
            day: dayNum,
            date: dayStart,
            events: dayEvents.map(event => ({
              id: event.id,
              title: event.title,
              type: event.type,
              priority: event.priority,
              isAllDay: event.isAllDay,
            })),
          });
        }

        return {
          year,
          month,
          days: calendarData,
        };
      }
    } catch (error) {
      this.logger.error(`Error getting calendar view: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Analytics and Statistics
  async getCalendarStats(tenantId?: string): Promise<CalendarStats> {
    try {
      const queryBuilder = this.calendarEventRepository.createQueryBuilder('event');
      
      if (tenantId) {
        queryBuilder.where('event.tenantId = :tenantId', { tenantId });
      }

      const [totalEvents, eventsByType, eventsByPriority] = await Promise.all([
        queryBuilder.getCount(),
        this.getEventsByType(tenantId),
        this.getEventsByPriority(tenantId),
      ]);

      const now = new Date();
      const upcomingEvents = await queryBuilder
        .andWhere('event.startDate >= :now', { now })
        .getCount();

      const overdueDeadlines = await this.calendarEventRepository.count({
        where: {
          type: EventType.DEADLINE,
          startDate: LessThan(now),
        },
      });

      const completedDeadlines = await this.calendarEventRepository.count({
        where: {
          type: EventType.DEADLINE,
          metadata: { completed: true } as any,
        },
      });

      return {
        totalEvents,
        upcomingEvents,
        overdueDeadlines,
        completedDeadlines,
        eventsByType,
        eventsByPriority,
      };
    } catch (error) {
      this.logger.error(`Error getting calendar stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getEventsByType(tenantId?: string): Promise<Record<EventType, number>> {
    const queryBuilder = this.calendarEventRepository.createQueryBuilder('event');
    
    if (tenantId) {
      queryBuilder.where('event.tenantId = :tenantId', { tenantId });
    }

    const results = await queryBuilder
      .select('event.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.type')
      .getRawMany();

    const eventsByType = {} as Record<EventType, number>;
    Object.values(EventType).forEach(type => {
      eventsByType[type] = 0;
    });

    results.forEach(result => {
      eventsByType[result.type as EventType] = parseInt(result.count);
    });

    return eventsByType;
  }

  private async getEventsByPriority(tenantId?: string): Promise<Record<Priority, number>> {
    const queryBuilder = this.calendarEventRepository.createQueryBuilder('event');
    
    if (tenantId) {
      queryBuilder.where('event.tenantId = :tenantId', { tenantId });
    }

    const results = await queryBuilder
      .select('event.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.priority')
      .getRawMany();

    const eventsByPriority = {} as Record<Priority, number>;
    Object.values(Priority).forEach(priority => {
      eventsByPriority[priority] = 0;
    });

    results.forEach(result => {
      eventsByPriority[result.priority as Priority] = parseInt(result.count);
    });

    return eventsByPriority;
  }

  private mapToDeadlineDto(event: CalendarEvent): DeadlineDto {
    const now = new Date();
    const dueDate = event.startDate;
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = dueDate < now;
    const isCompleted = event.metadata?.completed === true;
    const completedAt = event.metadata?.completedAt ? new Date(event.metadata.completedAt) : undefined;

    return {
      id: event.id,
      title: event.title,
      dueDate,
      priority: event.priority,
      projectId: event.projectId,
      assigneeId: event.assigneeId,
      daysRemaining: Math.max(0, daysRemaining),
      isOverdue,
      isCompleted,
      completedAt,
      metadata: event.metadata,
    };
  }

  // Integration with ACCU Applications
  async createACCUApplicationDeadlines(applicationId: string, dueDate: Date, projectId: string, createdById: string): Promise<CalendarEvent[]> {
    try {
      const deadlineEvents: CalendarEvent[] = [];

      // Main submission deadline
      const mainDeadline = await this.createEvent({
        title: 'ACCU Application Submission',
        description: `Submit ACCU application ${applicationId}`,
        type: EventType.DEADLINE,
        priority: Priority.HIGH,
        startDate: dueDate,
        projectId,
        reminders: [7, 3, 1], // 7 days, 3 days, 1 day before
      }, createdById);

      deadlineEvents.push(mainDeadline);

      // Supporting documents deadline (1 week before)
      const docsDeadlineDate = new Date(dueDate);
      docsDeadlineDate.setDate(docsDeadlineDate.getDate() - 7);

      const docsDeadline = await this.createEvent({
        title: 'ACCU Supporting Documents Due',
        description: `Complete supporting documents for ACCU application ${applicationId}`,
        type: EventType.DEADLINE,
        priority: Priority.MEDIUM,
        startDate: docsDeadlineDate,
        projectId,
        reminders: [3, 1],
      }, createdById);

      deadlineEvents.push(docsDeadline);

      return deadlineEvents;
    } catch (error) {
      this.logger.error(`Error creating ACCU application deadlines: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Integration with Projects
  async createProjectMilestones(projectId: string, milestones: Array<{ name: string; dueDate: Date; priority: Priority }>, createdById: string): Promise<CalendarEvent[]> {
    try {
      const milestoneEvents: CalendarEvent[] = [];

      for (const milestone of milestones) {
        const event = await this.createEvent({
          title: `Project Milestone: ${milestone.name}`,
          description: `Project milestone deadline for ${milestone.name}`,
          type: EventType.DEADLINE,
          priority: milestone.priority,
          startDate: milestone.dueDate,
          projectId,
          reminders: milestone.priority === Priority.CRITICAL ? [14, 7, 3, 1] : [7, 3, 1],
        }, createdById);

        milestoneEvents.push(event);
      }

      return milestoneEvents;
    } catch (error) {
      this.logger.error(`Error creating project milestones: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Integration with Audits
  async createAuditEvents(auditId: string, auditData: { title: string; startDate: Date; endDate: Date; leadAuditorId: string }, createdById: string): Promise<CalendarEvent[]> {
    try {
      const auditEvents: CalendarEvent[] = [];

      // Audit planning deadline (1 week before start)
      const planningDate = new Date(auditData.startDate);
      planningDate.setDate(planningDate.getDate() - 7);

      const planningEvent = await this.createEvent({
        title: `Audit Planning: ${auditData.title}`,
        description: `Complete audit planning for ${auditData.title}`,
        type: EventType.AUDIT,
        priority: Priority.HIGH,
        startDate: planningDate,
        assigneeId: auditData.leadAuditorId,
        reminders: [3, 1],
      }, createdById);

      auditEvents.push(planningEvent);

      // Audit execution period
      const auditEvent = await this.createEvent({
        title: `Audit Execution: ${auditData.title}`,
        description: `Execute audit: ${auditData.title}`,
        type: EventType.AUDIT,
        priority: Priority.CRITICAL,
        startDate: auditData.startDate,
        endDate: auditData.endDate,
        assigneeId: auditData.leadAuditorId,
        isAllDay: true,
        reminders: [1],
      }, createdById);

      auditEvents.push(auditEvent);

      // Audit report deadline (1 week after end)
      const reportDate = new Date(auditData.endDate);
      reportDate.setDate(reportDate.getDate() + 7);

      const reportEvent = await this.createEvent({
        title: `Audit Report Due: ${auditData.title}`,
        description: `Submit audit report for ${auditData.title}`,
        type: EventType.DEADLINE,
        priority: Priority.CRITICAL,
        startDate: reportDate,
        assigneeId: auditData.leadAuditorId,
        reminders: [7, 3, 1],
      }, createdById);

      auditEvents.push(reportEvent);

      return auditEvents;
    } catch (error) {
      this.logger.error(`Error creating audit events: ${error.message}`, error.stack);
      throw error;
    }
  }
}