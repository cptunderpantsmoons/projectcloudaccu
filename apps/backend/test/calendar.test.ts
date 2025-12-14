import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from '../src/modules/calendar/calendar.service';
import { CalendarController } from '../src/modules/calendar/calendar.controller';
import { CalendarEvent, EventType, Priority } from '../src/entities/calendar-event.entity';
import { User } from '../src/entities/user.entity';
import { Project } from '../src/entities/project.entity';
import { Notification } from '../src/entities/notification.entity';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let notificationsService: NotificationsService;

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
    roles: ['user'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject: Partial<Project> = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    type: 'methodology',
    startDate: new Date(),
    ownerId: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCalendarEvent: Partial<CalendarEvent> = {
    id: 'test-event-id',
    title: 'Test Event',
    description: 'A test calendar event',
    type: EventType.MEETING,
    priority: Priority.MEDIUM,
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDate: new Date(Date.now() + 26 * 60 * 60 * 1000), // Tomorrow + 2 hours
    isAllDay: false,
    reminders: [1, 7],
    createdById: mockUser.id,
    projectId: mockProject.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
    cancelNotificationsByMetadata: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forFeature([CalendarEvent, User, Project, Notification]),
      ],
      controllers: [CalendarController],
      providers: [
        CalendarService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  describe('createEvent', () => {
    it('should create a calendar event successfully', async () => {
      const createDto = {
        title: 'New Meeting',
        description: 'Team meeting',
        type: EventType.MEETING,
        priority: Priority.HIGH,
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 50 * 60 * 60 * 1000),
        isAllDay: false,
        reminders: [1, 3, 7],
        projectId: mockProject.id,
        assigneeId: mockUser.id,
      };

      // Mock repository methods
      jest.spyOn(service, 'createEvent').mockResolvedValue({
        ...mockCalendarEvent,
        ...createDto,
      } as CalendarEvent);

      const result = await service.createEvent(createDto, mockUser.id);

      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(result.type).toBe(createDto.type);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const invalidDto = {
        title: '', // Invalid: empty title
        type: 'invalid-type' as EventType,
        priority: Priority.MEDIUM,
        startDate: new Date(),
      };

      try {
        await service.createEvent(invalidDto as any, mockUser.id);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getEvents', () => {
    it('should retrieve events with filtering', async () => {
      const query = {
        page: 1,
        limit: 10,
        type: EventType.MEETING,
        priority: Priority.HIGH,
      };

      const mockResult = {
        events: [mockCalendarEvent],
        total: 1,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      jest.spyOn(service, 'getEvents').mockResolvedValue(mockResult);

      const result = await service.getEvents(query);

      expect(result).toBeDefined();
      expect(result.events).toHaveLength(1);
      expect(result.pagination).toBeDefined();
    });
  });

  describe('deadline management', () => {
    it('should create deadlines correctly', async () => {
      const deadlineDto = {
        title: 'Project Deadline',
        description: 'Critical project deadline',
        type: EventType.DEADLINE,
        priority: Priority.CRITICAL,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        reminders: [1, 3, 7, 14],
        projectId: mockProject.id,
        assigneeId: mockUser.id,
      };

      jest.spyOn(service, 'createEvent').mockResolvedValue({
        ...mockCalendarEvent,
        ...deadlineDto,
      } as CalendarEvent);

      const result = await service.createEvent(deadlineDto, mockUser.id);

      expect(result).toBeDefined();
      expect(result.type).toBe(EventType.DEADLINE);
      expect(result.priority).toBe(Priority.CRITICAL);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('should detect overdue deadlines', async () => {
      const overdueDeadline = {
        ...mockCalendarEvent,
        type: EventType.DEADLINE,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      const isOverdue = overdueDeadline.startDate < new Date();
      expect(isOverdue).toBe(true);
    });
  });

  describe('event conflict detection', () => {
    it('should detect scheduling conflicts', async () => {
      const event1 = {
        title: 'Meeting 1',
        startDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        endDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        assigneeId: mockUser.id,
      };

      const conflictingEvent = {
        title: 'Meeting 2',
        startDate: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now (overlaps)
        endDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
        assigneeId: mockUser.id,
      };

      // Mock conflict detection
      jest.spyOn(service, 'detectConflicts').mockResolvedValue([
        {
          eventId: 'existing-event-id',
          conflictType: 'time_overlap',
          description: 'Event conflicts with existing event',
          conflictingEvent: mockCalendarEvent as CalendarEvent,
        },
      ]);

      const conflicts = await service.detectConflicts(conflictingEvent as any);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('time_overlap');
    });
  });

  describe('calendar analytics', () => {
    it('should provide calendar statistics', async () => {
      const mockStats = {
        totalEvents: 25,
        upcomingEvents: 8,
        overdueDeadlines: 3,
        completedDeadlines: 12,
        eventsByType: {
          [EventType.DEADLINE]: 10,
          [EventType.MEETING]: 8,
          [EventType.AUDIT]: 4,
          [EventType.REVIEW]: 2,
          [EventType.SUBMISSION]: 1,
          [EventType.REMINDER]: 0,
          [EventType.CUSTOM]: 0,
        },
        eventsByPriority: {
          [Priority.LOW]: 5,
          [Priority.MEDIUM]: 12,
          [Priority.HIGH]: 6,
          [Priority.CRITICAL]: 2,
        },
      };

      jest.spyOn(service, 'getCalendarStats').mockResolvedValue(mockStats);

      const stats = await service.getCalendarStats();

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBe(25);
      expect(stats.upcomingEvents).toBe(8);
      expect(stats.eventsByType[EventType.DEADLINE]).toBe(10);
      expect(stats.eventsByPriority[Priority.CRITICAL]).toBe(2);
    });
  });

  describe('integration with ACCU applications', () => {
    it('should create ACCU application deadlines', async () => {
      const applicationId = 'accu-app-123';
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const projectId = mockProject.id;
      const createdById = mockUser.id;

      jest.spyOn(service, 'createACCUApplicationDeadlines').mockResolvedValue([
        {
          ...mockCalendarEvent,
          title: 'ACCU Application Submission',
          type: EventType.DEADLINE,
          priority: Priority.HIGH,
          startDate: dueDate,
        } as CalendarEvent,
        {
          ...mockCalendarEvent,
          title: 'ACCU Supporting Documents Due',
          type: EventType.DEADLINE,
          priority: Priority.MEDIUM,
          startDate: new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
        } as CalendarEvent,
      ]);

      const events = await service.createACCUApplicationDeadlines(
        applicationId,
        dueDate,
        projectId,
        createdById,
      );

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('ACCU Application Submission');
      expect(events[1].title).toBe('ACCU Supporting Documents Due');
    });
  });
});

describe('CalendarController', () => {
  let controller: CalendarController;

  const mockCalendarService = {
    createEvent: jest.fn(),
    getEvents: jest.fn(),
    getEventById: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    getDeadlines: jest.fn(),
    completeDeadline: jest.fn(),
    getCalendarView: jest.fn(),
    getCalendarStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        {
          provide: CalendarService,
          useValue: mockCalendarService,
        },
      ],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
  });

  describe('POST /calendar/events', () => {
    it('should create a new event', async () => {
      const createDto = {
        title: 'New Meeting',
        description: 'Team meeting',
        type: EventType.MEETING,
        priority: Priority.MEDIUM,
        startDate: new Date(),
      };

      mockCalendarService.createEvent.mockResolvedValue({ id: 'new-event-id', ...createDto });

      const result = await controller.createEvent(createDto, 'test-user-id');

      expect(result).toBeDefined();
      expect(mockCalendarService.createEvent).toHaveBeenCalledWith(createDto, 'test-user-id');
    });
  });

  describe('GET /calendar/events', () => {
    it('should get events with pagination', async () => {
      const mockResult = {
        events: [],
        total: 0,
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      };

      mockCalendarService.getEvents.mockResolvedValue(mockResult);

      const result = await controller.getEvents({ page: 1, limit: 50 });

      expect(result).toBeDefined();
      expect(mockCalendarService.getEvents).toHaveBeenCalled();
    });
  });

  describe('GET /calendar/events/overdue', () => {
    it('should get overdue events', async () => {
      const mockOverdueEvents = [
        {
          id: 'overdue-1',
          title: 'Overdue Deadline',
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          isOverdue: true,
        },
      ];

      mockCalendarService.getOverdueDeadlines.mockResolvedValue(mockOverdueEvents);

      const result = await controller.getOverdueEvents();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].isOverdue).toBe(true);
    });
  });

  describe('GET /calendar/calendar/:year/:month', () => {
    it('should get monthly calendar view', async () => {
      const mockViewData = {
        year: 2024,
        month: 12,
        days: [
          { day: 1, events: [] },
          { day: 2, events: [] },
        ],
      };

      mockCalendarService.getCalendarView.mockResolvedValue(mockViewData);

      const result = await controller.getMonthlyView(2024, 12);

      expect(result).toBeDefined();
      expect(result.year).toBe(2024);
      expect(result.month).toBe(12);
    });
  });
});