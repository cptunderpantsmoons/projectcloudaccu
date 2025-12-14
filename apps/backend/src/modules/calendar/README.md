# Calendar/Deadline Management System

## Overview

This module provides a comprehensive Calendar and Deadline management system for the ACCU Platform. It includes event scheduling, deadline tracking, conflict detection, reminders, and integration with ACCU applications, projects, and audits.

## Features

### Core Functionality
- **Event CRUD Operations**: Create, read, update, and delete calendar events
- **Event Engine**: Advanced scheduling and automation capabilities
- **Deadline Management**: Comprehensive deadline tracking and completion workflows
- **Recurring Events**: Support for recurring events with RFC 5545 RRULE format
- **Conflict Detection**: Intelligent scheduling conflict detection and resolution
- **Reminder System**: Multi-channel notification system with customizable intervals
- **Calendar Views**: Monthly, weekly, and daily calendar views
- **Analytics**: Comprehensive calendar statistics and reporting

### Integration Features
- **ACCU Applications**: Automatic deadline creation for ACCU application processes
- **Projects**: Project milestone tracking and deadline management
- **Audits**: Audit scheduling, planning, and reporting deadline automation
- **Notifications**: Integration with the notification system for alerts and reminders
- **Multi-tenancy**: Support for tenant-based data separation

## Architecture

### Entities
- **CalendarEvent**: Main entity for all calendar events with support for different event types
- **Notification**: Notification entity for managing reminders and alerts
- **User**: User entity for event assignments and notifications
- **Project**: Project entity for project-related event associations

### Services
- **CalendarService**: Core service handling all calendar operations
- **NotificationsService**: Notification management for reminders and alerts

### Controllers
- **CalendarController**: REST API endpoints for calendar operations

## API Endpoints

### Event Management
```
POST   /calendar/events                    - Create new calendar event
GET    /calendar/events                    - List events (with pagination, filtering)
GET    /calendar/events/dashboard          - Get calendar dashboard data
GET    /calendar/events/upcoming           - Get upcoming events
GET    /calendar/events/overdue            - Get overdue deadlines
GET    /calendar/events/:id                - Get event details
PUT    /calendar/events/:id                - Update event
DELETE /calendar/events/:id                - Delete event
POST   /calendar/events/:id/reminders      - Set custom reminders
POST   /calendar/conflicts                 - Check for event conflicts
```

### Deadline Management
```
GET    /calendar/deadlines                 - Get all deadlines
GET    /calendar/deadlines/:id             - Get specific deadline details
POST   /calendar/deadlines/:id/complete    - Mark deadline as complete
```

### Calendar Views
```
GET    /calendar/calendar/:year/:month     - Get monthly calendar view
GET    /calendar/calendar/:year/:month/:day - Get daily calendar view
```

### Analytics
```
GET    /calendar/stats                     - Get calendar statistics
```

### Integration Endpoints
```
POST   /calendar/accu/:applicationId/deadlines        - Create ACCU application deadlines
POST   /calendar/projects/:projectId/milestones       - Create project milestones
POST   /calendar/audits/:auditId/events               - Create audit events
```

## Event Types

The system supports the following event types:
- **DEADLINE**: Important deadlines and due dates
- **MEETING**: Scheduled meetings and appointments
- **AUDIT**: Audit-related events and activities
- **REVIEW**: Review and assessment events
- **SUBMISSION**: Submission deadlines and processes
- **REMINDER**: Reminder events and notifications
- **CUSTOM**: Custom user-defined events

## Priority Levels

Events can be assigned priority levels:
- **LOW**: Low priority events
- **MEDIUM**: Medium priority events (default)
- **HIGH**: High priority events
- **CRITICAL**: Critical priority events requiring immediate attention

## Key Features

### 1. Event Engine
- **Automated Scheduling**: Automatic event creation based on business rules
- **Conflict Detection**: Intelligent detection of scheduling conflicts
- **Recurring Events**: Support for complex recurring patterns
- **Template System**: Event templates for common activities

### 2. Deadline Tracking
- **Deadline Creation**: Create deadlines with automatic tracking setup
- **Overdue Detection**: Automatic detection of overdue deadlines
- **Completion Tracking**: Track deadline completion with timestamps
- **Escalation Workflows**: Automated escalation for critical deadlines

### 3. Notification System
- **Multi-channel Notifications**: Support for in-app, email, and SMS notifications
- **Customizable Reminders**: Configurable reminder intervals
- **Event-specific Notifications**: Targeted notifications based on event type and priority
- **Deadline Alerts**: Special alerts for upcoming and overdue deadlines

### 4. Calendar Views
- **Monthly View**: Month-long calendar with daily event breakdown
- **Daily View**: Detailed view of events for a specific day
- **Filtering**: Filter events by type, priority, project, assignee
- **Search**: Search events by title and description

### 5. Analytics and Reporting
- **Statistics Dashboard**: Comprehensive calendar statistics
- **Event Distribution**: Analysis of events by type and priority
- **Deadline Analytics**: Deadline completion rates and trends
- **Resource Utilization**: Analysis of meeting and event distribution

## Integration Points

### ACCU Applications
- Automatic deadline creation for application submission processes
- Supporting document deadline management
- Compliance deadline tracking

### Projects
- Project milestone deadline creation
- Project phase deadline management
- Integration with project status updates

### Audits
- Audit planning deadline automation
- Audit execution scheduling
- Audit report submission deadlines

### Notifications
- Real-time notification delivery
- Scheduled reminder notifications
- Escalation notifications for overdue items

## Security and Permissions

The system implements role-based access control with the following permissions:
- `calendar.events.read`: Read calendar events
- `calendar.events.write`: Create and update calendar events
- `calendar.events.delete`: Delete calendar events
- `calendar.deadlines.read`: Read deadline information
- `calendar.deadlines.write`: Create and update deadlines
- `calendar.deadlines.delete`: Delete deadlines

## Data Models

### CalendarEvent Entity
```typescript
{
  id: string;
  title: string;
  description?: string;
  type: EventType;
  priority: Priority;
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
  recurrenceRule?: string; // RFC 5545 RRULE
  reminders: number[]; // Days before event
  metadata?: Record<string, any>;
  projectId?: string;
  assigneeId?: string;
  createdById: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### DeadlineDto
```typescript
{
  id: string;
  title: string;
  dueDate: Date;
  priority: Priority;
  projectId?: string;
  assigneeId?: string;
  daysRemaining: number;
  isOverdue: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  metadata?: Record<string, any>;
}
```

## Usage Examples

### Creating a Deadline
```typescript
const deadline = await calendarService.createEvent({
  title: 'Project Submission Deadline',
  description: 'Final project submission due',
  type: EventType.DEADLINE,
  priority: Priority.HIGH,
  startDate: new Date('2024-12-31'),
  reminders: [30, 14, 7, 3, 1], // 30, 14, 7, 3, and 1 day before
  projectId: 'project-123',
  assigneeId: 'user-456'
}, 'creator-user-id');
```

### Getting Upcoming Events
```typescript
const upcomingEvents = await calendarService.getUpcomingDeadlines(30); // Next 30 days
```

### Creating ACCU Application Deadlines
```typescript
const deadlines = await calendarService.createACCUApplicationDeadlines(
  'accu-app-123',
  new Date('2024-12-31'), // Submission due date
  'project-123',
  'user-456'
);
```

### Monthly Calendar View
```typescript
const monthlyView = await calendarService.getCalendarView(2024, 12);
```

## Error Handling

The system includes comprehensive error handling for:
- **Validation Errors**: Input validation with detailed error messages
- **Not Found Errors**: Graceful handling of missing events or resources
- **Conflict Errors**: Scheduling conflict detection and reporting
- **Permission Errors**: Proper authorization error handling
- **Database Errors**: Robust database error handling and logging

## Performance Considerations

- **Pagination**: All list endpoints support pagination for better performance
- **Indexing**: Proper database indexing on frequently queried fields
- **Caching**: Strategic caching of calendar views and statistics
- **Lazy Loading**: Efficient loading of related entities
- **Query Optimization**: Optimized database queries with proper joins

## Testing

The implementation includes comprehensive unit tests covering:
- Event CRUD operations
- Deadline management functionality
- Conflict detection algorithms
- Integration with external services
- Error handling scenarios
- Performance testing

## Deployment

The Calendar module is integrated into the main ACCU Platform application:
- Registered in the main AppModule
- Proper dependency injection configuration
- Database migrations for entity schema
- Swagger documentation for API endpoints
- Logging and monitoring integration

## Future Enhancements

Potential future enhancements include:
- **Calendar Synchronization**: Integration with external calendar systems (Google, Outlook)
- **Advanced Recurrence**: More sophisticated recurring event patterns
- **Team Calendars**: Shared team and department calendars
- **Mobile Notifications**: Push notifications for mobile applications
- **Calendar Sharing**: Event and calendar sharing capabilities
- **Advanced Analytics**: More detailed calendar analytics and reporting
- **Integration Expansion**: Additional third-party integrations