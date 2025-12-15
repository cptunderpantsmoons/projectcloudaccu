# Calendar & Deadline Tracking

<cite>
**Referenced Files in This Document**   
- [calendar-event.entity.ts](file://apps/backend/src/entities/calendar-event.entity.ts)
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts)
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts)
- [calendar-event.dto.ts](file://apps/backend/src/modules/calendar/dto/calendar-event.dto.ts)
- [calendar-workflows.ts](file://apps/backend/src/modules/temporal/workflows/calendar/calendar-workflows.ts)
- [calendar-activities.ts](file://apps/backend/src/modules/temporal/activities/calendar-activities.ts)
- [accu-applications.service.ts](file://apps/backend/src/modules/accu/accu-applications.service.ts)
- [page.tsx](file://apps/frontend/src/app/calendar/page.tsx)
- [api-client.ts](file://apps/frontend/src/lib/api-client.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Data Model](#data-model)
3. [Event Creation and Management](#event-creation-and-management)
4. [Deadline and Milestone Tracking](#deadline-and-milestone-tracking)
5. [Recurring Events and Automated Alerts](#recurring-events-and-automated-alerts)
6. [Integration with ACCU Applications](#integration-with-accu-applications)
7. [Integration with Projects](#integration-with-projects)
8. [API Usage](#api-usage)
9. [Common Issues and Debugging](#common-issues-and-debugging)
10. [Performance Considerations](#performance-considerations)

## Introduction
The Calendar & Deadline Tracking module provides a comprehensive system for managing events, deadlines, and milestones within the ProjectCloudACCU platform. This module enables users to create, track, and manage various types of calendar events including deadlines, meetings, audits, and submissions. The system integrates with other modules such as ACCU applications and projects, providing automated reminders and deadline tracking through Temporal workflows. The module supports recurring events, conflict detection, and comprehensive analytics for calendar management.

## Data Model
The Calendar & Deadline Tracking module is centered around the CalendarEvent entity, which represents all types of calendar entries including deadlines, meetings, and other scheduled events. The data model includes relationships with Users and Projects, allowing for assignment and contextual organization of events.

```mermaid
classDiagram
class CalendarEvent {
+string id
+string title
+string description
+EventType type
+Priority priority
+Date startDate
+Date endDate
+boolean isAllDay
+string recurrenceRule
+Record<string, any> metadata
+number[] reminders
+string tenantId
+Project project
+User createdBy
+User assignee
+Date createdAt
+Date updatedAt
+isDeadline() boolean
+isMeeting() boolean
+isAudit() boolean
+isSubmission() boolean
+isCritical() boolean
+isHighPriority() boolean
+isRecurring() boolean
+getDurationInHours() number
}
class User {
+string id
+string firstName
+string lastName
+string email
+Role role
+string tenantId
+Date createdAt
+Date updatedAt
}
class Project {
+string id
+string name
+string description
+string status
+string tenantId
+Date createdAt
+Date updatedAt
}
class EventType {
+DEADLINE
+MEETING
+AUDIT
+REVIEW
+SUBMISSION
+REMINDER
+CUSTOM
}
class Priority {
+LOW
+MEDIUM
+HIGH
+CRITICAL
}
CalendarEvent --> User : "createdBy"
CalendarEvent --> User : "assignee"
CalendarEvent --> Project : "project"
CalendarEvent --> EventType : "type"
CalendarEvent --> Priority : "priority"
```

**Diagram sources**
- [calendar-event.entity.ts](file://apps/backend/src/entities/calendar-event.entity.ts#L1-L137)

**Section sources**
- [calendar-event.entity.ts](file://apps/backend/src/entities/calendar-event.entity.ts#L1-L137)

## Event Creation and Management
The Calendar & Deadline Tracking module provides comprehensive functionality for creating and managing calendar events. Users can create various types of events including deadlines, meetings, audits, reviews, submissions, reminders, and custom events. Each event can be assigned a priority level (low, medium, high, or critical) and can be associated with a specific project and assigned user.

Event creation includes validation of user and project existence, conflict detection for scheduling overlaps, and automatic setup of reminders and deadline tracking. The system supports both one-time and recurring events, with recurrence rules following the RFC 5545 RRULE format. Events can be filtered, searched, and paginated based on various criteria including type, priority, date range, and project association.

The module also provides calendar views for monthly, weekly, and daily perspectives, allowing users to visualize their schedule and upcoming events. Conflict detection is performed when creating or updating events to prevent scheduling overlaps, particularly for events assigned to the same user.

```mermaid
sequenceDiagram
participant User as "User"
participant Frontend as "Frontend Application"
participant Backend as "Backend API"
participant Database as "Database"
User->>Frontend : Create new calendar event
Frontend->>Backend : POST /calendar/events with event data
Backend->>Backend : Validate user and project existence
Backend->>Backend : Check for scheduling conflicts
Backend->>Database : Save event to calendar_events table
Database-->>Backend : Return saved event
Backend->>Backend : Schedule reminders based on event settings
Backend->>Backend : Set up deadline tracking for deadlines
Backend-->>Frontend : Return created event
Frontend-->>User : Display success message and event details
```

**Diagram sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L41-L92)
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L45-L65)

**Section sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L41-L92)
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L45-L65)

## Deadline and Milestone Tracking
The module provides specialized functionality for tracking deadlines and milestones, with dedicated methods for managing deadline-specific operations. Deadlines can be retrieved, marked as completed, and monitored for overdue status. The system automatically tracks the number of days remaining until a deadline and identifies whether a deadline is overdue.

For deadline management, the system provides methods to retrieve all deadlines, upcoming deadlines, and overdue deadlines. When a deadline is marked as completed, the system updates the event metadata and sends a completion notification to the relevant users. The module also provides analytics on deadline status, including counts of overdue and completed deadlines.

Milestone tracking is integrated with project management, allowing project milestones to be created as calendar events with appropriate deadlines and reminders. The system supports tracking of milestone progress and provides notifications for approaching milestone deadlines.

```mermaid
flowchart TD
A[Create Deadline] --> B[Set Priority and Due Date]
B --> C{Is High/Critical Priority?}
C --> |Yes| D[Set Up Enhanced Tracking]
C --> |No| E[Standard Tracking]
D --> F[Configure Multiple Reminders]
E --> G[Configure Standard Reminders]
F --> H[Monitor for Completion]
G --> H
H --> I{Deadline Approaching?}
I --> |Yes| J[Send Reminder Notifications]
I --> |No| K{Deadline Passed?}
K --> |Yes| L{Completed?}
L --> |Yes| M[Mark as Completed]
L --> |No| N[Mark as Overdue]
M --> O[Send Completion Notification]
N --> P[Send Overdue Alert]
P --> Q[Initiate Escalation Process]
```

**Diagram sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L366-L457)
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L271-L326)

**Section sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L366-L457)
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L271-L326)

## Recurring Events and Automated Alerts
The Calendar & Deadline Tracking module implements automated alerts and reminders through Temporal workflows, providing reliable and scalable event processing. The Temporal workflow system manages deadline tracking, reminder scheduling, escalation processes, and external calendar synchronization.

The CalendarWorkflow handles various types of calendar-related processes including deadline management, reminder scheduling, escalation, external synchronization, and recurring events. The workflow maintains state for each calendar entity and processes signals for creating deadlines, scheduling reminders, adding escalation rules, and generating reports.

Reminders are scheduled based on the event's priority level, with different reminder patterns for critical, high, medium, and low priority events. Critical deadlines receive multiple reminders through various channels (email, SMS, push, in-app) at different intervals before the due date. The system also implements escalation rules that trigger notifications to higher-level stakeholders when deadlines become overdue.

```mermaid
sequenceDiagram
participant User as "User"
participant Frontend as "Frontend"
participant Backend as "Backend"
participant Temporal as "Temporal Workflow"
participant Activities as "Activities"
User->>Frontend : Create event with reminders
Frontend->>Backend : API Request
Backend->>Temporal : Start CalendarWorkflow
Temporal->>Temporal : Initialize workflow state
Temporal->>Temporal : Set up signal handlers
Temporal->>Temporal : Enter monitoring loop
Temporal->>Temporal : Check for upcoming reminders
Temporal->>Activities : scheduleReminder activity
Activities->>Activities : Send email/SMS/push notification
Activities-->>Temporal : Confirmation
Temporal->>Temporal : Update reminder status
Temporal->>Temporal : Check for overdue deadlines
Temporal->>Activities : escalateOverdueDeadline activity
Activities->>Activities : Notify managers and executives
Activities-->>Temporal : Confirmation
Temporal-->>Backend : Workflow status updates
Backend-->>Frontend : Status updates
Frontend-->>User : Display notifications
```

**Diagram sources**
- [calendar-workflows.ts](file://apps/backend/src/modules/temporal/workflows/calendar/calendar-workflows.ts#L173-L227)
- [calendar-activities.ts](file://apps/backend/src/modules/temporal/activities/calendar-activities.ts#L1-L23)

**Section sources**
- [calendar-workflows.ts](file://apps/backend/src/modules/temporal/workflows/calendar/calendar-workflows.ts#L173-L227)
- [calendar-activities.ts](file://apps/backend/src/modules/temporal/activities/calendar-activities.ts#L1-L23)

## Integration with ACCU Applications
The Calendar & Deadline Tracking module integrates with ACCU applications to automatically create and manage deadlines related to the ACCU application process. When an ACCU application is created or updated, the system can automatically generate relevant calendar events to track key milestones and submission deadlines.

The integration creates multiple deadline events for each ACCU application, including the main submission deadline and supporting documents deadline. The main submission deadline is set as a high-priority event with reminders scheduled at 7, 3, and 1 day before the due date. The supporting documents deadline is created one week before the main submission deadline and is set as a medium-priority event with reminders at 3 and 1 day before.

This integration ensures that all ACCU application deadlines are properly tracked in the calendar system, with automated reminders to prevent missed submissions. The events are linked to the specific ACCU application and project, providing context and traceability.

```mermaid
sequenceDiagram
participant User as "User"
participant ACCU as "ACCU Module"
participant Calendar as "Calendar Module"
participant Database as "Database"
User->>ACCU : Create ACCU application
ACCU->>ACCU : Validate application data
ACCU->>Database : Save ACCU application
Database-->>ACCU : Confirmation
ACCU->>Calendar : createACCUApplicationDeadlines()
Calendar->>Calendar : Create main submission deadline
Calendar->>Calendar : Set high priority with reminders
Calendar->>Calendar : Create supporting documents deadline
Calendar->>Calendar : Set medium priority with reminders
Calendar->>Database : Save deadline events
Database-->>Calendar : Event IDs
Calendar-->>ACCU : Deadline events
ACCU-->>User : Application created with deadlines
```

**Diagram sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L677-L714)
- [accu-applications.service.ts](file://apps/backend/src/modules/accu/accu-applications.service.ts#L380-L423)

**Section sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L677-L714)
- [accu-applications.service.ts](file://apps/backend/src/modules/accu/accu-applications.service.ts#L380-L423)

## Integration with Projects
The module provides integration with the project management system to create milestone deadlines and track project progress. Project milestones can be created as calendar events with specific due dates, priorities, and reminder schedules. This integration ensures that key project milestones are visible in the calendar and properly tracked with automated reminders.

When creating project milestones, the system generates calendar events for each milestone with appropriate priority levels and reminder configurations. Critical milestones receive more frequent reminders and have escalation rules configured to notify project managers and executives if deadlines are at risk of being missed.

The integration also supports audit-related events, creating a series of calendar events for the audit process including planning deadlines, execution periods, and report submission deadlines. This ensures comprehensive tracking of the audit lifecycle with appropriate notifications and reminders.

```mermaid
flowchart TD
A[Project Creation] --> B[Define Milestones]
B --> C{Create Milestone Deadlines?}
C --> |Yes| D[Call createProjectMilestones]
D --> E[Create Calendar Events for Each Milestone]
E --> F[Set Priority Based on Milestone Importance]
F --> G[Configure Reminders]
G --> H[Link Events to Project]
H --> I[Save to Database]
I --> J[Schedule Reminders via Temporal]
J --> K[Monitor Milestone Progress]
K --> L{Milestone Approaching?}
L --> |Yes| M[Send Reminder Notifications]
L --> |No| N{Milestone Due Date Passed?}
N --> |Yes| O{Completed?}
O --> |Yes| P[Mark as Completed]
O --> |No| Q[Mark as Overdue]
P --> R[Update Project Status]
Q --> R
```

**Diagram sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L718-L741)
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L472-L517)

**Section sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L718-L741)
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L472-L517)

## API Usage
The Calendar & Deadline Tracking module provides a comprehensive REST API for managing calendar events and retrieving calendar data. The API supports CRUD operations for events, specialized endpoints for deadlines and reminders, and various query parameters for filtering and pagination.

To fetch a user's calendar events, clients can use the GET /calendar/events endpoint with optional query parameters for filtering by type, priority, date range, project, and other criteria. The response includes pagination information and can be sorted by various fields.

For managing event subscriptions, the API provides endpoints to create, update, and delete calendar events, as well as specialized endpoints for marking deadlines as complete and managing reminders. The API uses standard HTTP status codes and follows REST conventions for resource management.

```mermaid
flowchart TD
A[Client Application] --> B[GET /calendar/events]
B --> C{Add Query Parameters?}
C --> |Yes| D[Add search, type, priority, date filters]
C --> |No| E[Retrieve All Events]
D --> F[Send Request]
E --> F
F --> G[Backend Processes Request]
G --> H[Apply Filters and Pagination]
H --> I[Query Database]
I --> J[Return Events with Metadata]
J --> K[Client Displays Calendar]
K --> L[User Creates New Event]
L --> M[POST /calendar/events]
M --> N[Backend Validates Data]
N --> O[Check for Conflicts]
O --> P[Save to Database]
P --> Q[Scheduled Reminders]
Q --> R[Return Created Event]
R --> K
K --> S[User Marks Deadline Complete]
S --> T[POST /calendar/deadlines/:id/complete]
T --> U[Backend Updates Status]
U --> V[Send Completion Notification]
V --> W[Return Updated Event]
W --> K
```

**Diagram sources**
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L45-L231)
- [page.tsx](file://apps/frontend/src/app/calendar/page.tsx#L65-L84)
- [api-client.ts](file://apps/frontend/src/lib/api-client.ts#L168-L191)

**Section sources**
- [calendar.controller.ts](file://apps/backend/src/modules/calendar/calendar.controller.ts#L45-L231)
- [page.tsx](file://apps/frontend/src/app/calendar/page.tsx#L65-L84)
- [api-client.ts](file://apps/frontend/src/lib/api-client.ts#L168-L191)

## Common Issues and Debugging
The Calendar & Deadline Tracking module may encounter several common issues that require specific debugging strategies. One frequent issue is timezone mismatches, where events appear at incorrect times due to differences between the user's local timezone and the server's timezone. This can be resolved by ensuring all datetime values are stored in UTC and properly converted to the user's local timezone in the frontend.

Another common issue is missed reminders, which can occur due to workflow processing delays or notification service failures. To debug this issue, check the Temporal workflow logs for any errors in the reminder scheduling process and verify that the notification service is operational. The system maintains a history of workflow events that can be queried to trace the execution of reminder workflows.

Scheduling conflicts can also occur when multiple users attempt to schedule events simultaneously. The system includes conflict detection that identifies overlapping events for the same assignee, but in high-concurrency scenarios, additional locking mechanisms may be required. Monitoring the conflict detection logs can help identify patterns of frequent conflicts that may indicate the need for process improvements.

For performance issues with calendar synchronization, particularly with large numbers of concurrent users, the system provides analytics endpoints that can be used to monitor load and identify bottlenecks. Implementing caching strategies for frequently accessed calendar views and optimizing database queries can help improve performance.

```mermaid
flowchart TD
A[Issue Reported] --> B{Type of Issue?}
B --> |Timezone Mismatch| C[Check UTC Conversion]
C --> D[Verify Frontend Timezone Handling]
D --> E[Test with Different Timezones]
E --> F[Implement Fixes]
B --> |Missed Reminders| G[Check Temporal Workflow Status]
G --> H[Review Workflow Logs]
H --> I[Verify Notification Service]
I --> J[Test Reminder Scheduling]
J --> K[Implement Retry Logic]
B --> |Scheduling Conflicts| L[Analyze Conflict Detection]
L --> M[Review Overlapping Events]
M --> N[Test Concurrent Scheduling]
N --> O[Implement Optimistic Locking]
B --> |Performance Issues| P[Monitor System Metrics]
P --> Q[Analyze Database Queries]
Q --> R[Test with Load Simulation]
R --> S[Implement Caching]
S --> T[Optimize Queries]
```

**Diagram sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L271-L316)
- [calendar-workflows.ts](file://apps/backend/src/modules/temporal/workflows/calendar/calendar-workflows.ts#L625-L686)
- [page.tsx](file://apps/frontend/src/app/calendar/page.tsx#L592-L607)

**Section sources**
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L271-L316)
- [calendar-workflows.ts](file://apps/backend/src/modules/temporal/workflows/calendar/calendar-workflows.ts#L625-L686)
- [page.tsx](file://apps/frontend/src/app/calendar/page.tsx#L592-L607)

## Performance Considerations
The Calendar & Deadline Tracking module is designed to handle large numbers of concurrent users and events efficiently. The system uses database indexing on key fields such as event type, priority, project ID, and start date to optimize query performance. Pagination is implemented for all list endpoints to prevent excessive data transfer and memory usage.

For calendar synchronization with large datasets, the system implements efficient querying with appropriate filters and limits. The Temporal workflow system provides scalable processing of reminders and automated alerts, with the ability to distribute workflow execution across multiple workers.

To optimize performance with large numbers of concurrent users, consider implementing caching strategies for frequently accessed calendar views, particularly for dashboard data and monthly views. The system's analytics endpoints can be used to monitor performance metrics and identify potential bottlenecks.

Database query optimization is critical for maintaining performance, particularly for complex queries involving multiple joins and filters. The use of query builders with proper indexing ensures that calendar data can be retrieved efficiently even with large datasets. For very large installations, consider implementing database sharding or read replicas to distribute the load.

```mermaid
graph TD
A[Performance Considerations] --> B[Database Indexing]
A --> C[Pagination]
A --> D[Caching Strategies]
A --> E[Query Optimization]
A --> F[Temporal Workflow Scaling]
A --> G[Load Monitoring]
B --> H[Indexes on type, priority, projectId, startDate]
C --> I[Limit results with page/limit parameters]
D --> J[Cache dashboard and calendar views]
E --> K[Optimize JOINs and WHERE clauses]
F --> L[Scale Temporal workers based on load]
G --> M[Monitor response times and error rates]
H --> N[Improved Query Performance]
I --> O[Reduced Memory Usage]
J --> P[Faster Response Times]
K --> Q[Efficient Data Retrieval]
L --> R[Scalable Alert Processing]
M --> S[Proactive Issue Detection]
```

**Diagram sources**
- [calendar-event.entity.ts](file://apps/backend/src/entities/calendar-event.entity.ts#L30-L34)
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L99-L181)
- [calendar-workflows.ts](file://apps/backend/src/modules/temporal/workflows/calendar/calendar-workflows.ts#L625-L686)

**Section sources**
- [calendar-event.entity.ts](file://apps/backend/src/entities/calendar-event.entity.ts#L30-L34)
- [calendar.service.ts](file://apps/backend/src/modules/calendar/calendar.service.ts#L99-L181)
- [calendar-workflows.ts](file://apps/backend/src/modules/temporal/workflows/calendar/calendar-workflows.ts#L625-L686)