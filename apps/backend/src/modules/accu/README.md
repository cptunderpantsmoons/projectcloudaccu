# ACCU Applications Module

The ACCU (Australian Carbon Credit Units) Applications module provides a comprehensive workflow for managing carbon credit unit applications, from creation through approval and issuance.

## Overview

This module implements the complete ACCU application lifecycle with:

- **Application Creation & Management**: Full CRUD operations for ACCU applications
- **Workflow Management**: Status transitions from Draft → Submitted → Under Review → Approved/Rejected → Issued
- **Business Logic**: Validation rules, requirements checking, and compliance validation
- **Integration**: Seamless integration with Projects, Documents, and Notifications
- **Analytics & Reporting**: Comprehensive analytics and dashboard functionality
- **Notification System**: Automated notifications for status changes, deadlines, and important events

## Architecture

### Core Components

1. **AccuApplicationsService**: Main business logic service
2. **AccuApplicationsController**: REST API endpoints
3. **AccuNotificationService**: Notification management
4. **DTOs**: Data validation and transformation objects

### Entity Relationships

```
ACCU Application
├── Project (Many-to-One)
├── Documents (Many-to-One via Project)
├── Calendar Events (Many-to-One via Project)
└── Status History (stored in metadata)
```

## API Endpoints

### Core CRUD Operations

#### Create Application
```http
POST /accu/applications
Content-Type: application/json
Authorization: Bearer {token}

{
  "projectId": "uuid",
  "accuUnits": 1000,
  "methodologyId": "methodology-123",
  "applicationData": {
    "description": "Project description",
    "location": {
      "address": "123 Test St",
      "coordinates": { "lat": -33.8688, "lng": 151.2093 },
      "jurisdiction": "NSW"
    },
    "baseline": {
      "period": {
        "start": "2024-01-01",
        "end": "2024-12-31"
      },
      "methodology": "ISO 14064-2",
      "data": {}
    },
    "activities": ["Activity 1", "Activity 2"]
  },
  "serReference": "SER-2024-001",
  "tenantId": "uuid"
}
```

#### List Applications
```http
GET /accu/applications?page=1&limit=10&status=draft&projectId=uuid&search=carbon
Authorization: Bearer {token}
```

#### Get Application Details
```http
GET /accu/applications/{id}
Authorization: Bearer {token}
```

#### Update Application
```http
PUT /accu/applications/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "accuUnits": 1500,
  "applicationData": {
    "description": "Updated description"
  }
}
```

### Workflow Operations

#### Submit Application
```http
POST /accu/applications/{id}/submit
Content-Type: application/json
Authorization: Bearer {token}

{
  "submissionNotes": "Ready for review",
  "contactPerson": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+61 2 1234 5678",
    "position": "Project Manager"
  },
  "deadline": "2024-06-01"
}
```

#### Approve/Reject Application
```http
POST /accu/applications/{id}/approve
Content-Type: application/json
Authorization: Bearer {token}

{
  "approved": true,
  "approvedUnits": 1000,
  "reason": "Meets all requirements",
  "reviewerComments": "Excellent application",
  "nextSteps": "Proceed to issuance"
}
```

#### Update Status
```http
PATCH /accu/applications/{id}/status
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "under_review",
  "reason": "Moved to review queue",
  "notes": "Assigned to senior reviewer"
}
```

### Convenience Endpoints

#### Activate/Submit Application
```http
PATCH /accu/applications/{id}/activate
Authorization: Bearer {token}
```

#### Mark Under Review
```http
PATCH /accu/applications/{id}/under-review
Authorization: Bearer {token}
```

#### Final Approval
```http
PATCH /accu/applications/{id}/final-approve
Content-Type: application/json
Authorization: Bearer {token}

{
  "approvedUnits": 1000,
  "reviewerComments": "Approved for full amount",
  "nextSteps": "Ready for issuance"
}
```

#### Issue ACCU Units
```http
PATCH /accu/applications/{id}/issue
Authorization: Bearer {token}
```

### Analytics & Reporting

#### Get Application Analytics
```http
GET /accu/applications/{id}/analytics
Authorization: Bearer {token}
```

Response:
```json
{
  "id": "uuid",
  "projectName": "Carbon Reduction Project",
  "status": "submitted",
  "progress": 65,
  "daysUntilNextDeadline": 14,
  "isOverdue": false,
  "documentCompletion": 75,
  "requiredDocumentsCount": 8,
  "submittedDocumentsCount": 6,
  "applicationAgeInDays": 21,
  "estimatedDaysRemaining": 45
}
```

#### Get Dashboard
```http
GET /accu/applications/dashboard?tenantId=uuid
Authorization: Bearer {token}
```

Response:
```json
{
  "totalApplications": 25,
  "applicationsByStatus": {
    "draft": 5,
    "submitted": 8,
    "under_review": 7,
    "approved": 3,
    "rejected": 1,
    "issued": 1
  },
  "averageProcessingTime": 42.5,
  "successRate": 75.0,
  "pendingApplications": 15,
  "overdueApplications": 2,
  "recentApplications": [...],
  "upcomingDeadlines": [...]
}
```

#### Get Statistics
```http
GET /accu/applications/stats?tenantId=uuid
Authorization: Bearer {token}
```

### Document Management

#### Get Application Documents
```http
GET /accu/applications/{id}/documents
Authorization: Bearer {token}
```

#### Add Document to Application
```http
POST /accu/applications/{id}/documents
Content-Type: application/json
Authorization: Bearer {token}

{
  "documentId": "uuid",
  "category": "methodology",
  "role": "baseline_report",
  "requirementLevel": "required"
}
```

### Deadlines & History

#### Get Application Deadlines
```http
GET /accu/applications/{id}/deadlines
Authorization: Bearer {token}
```

#### Get Status History
```http
GET /accu/applications/{id}/history
Authorization: Bearer {token}
```

#### Get Status Information
```http
GET /accu/applications/{id}/status-info
Authorization: Bearer {token}
```

## Status Workflow

The ACCU application follows a strict status transition workflow:

```
Draft → Submitted → Under Review → Approved → Issued
                ↓
              Rejected (Terminal)
```

### Status Descriptions

- **Draft**: Application is being created and can be modified
- **Submitted**: Application submitted for review, no longer editable
- **Under Review**: Application is being reviewed by the team
- **Approved**: Application approved, awaiting issuance
- **Issued**: ACCU units have been issued (Terminal)
- **Rejected**: Application rejected (Terminal)

### Valid Transitions

| From Status | To Status | Conditions |
|------------|-----------|------------|
| Draft | Submitted | All required fields complete |
| Draft | Rejected | Manual rejection |
| Submitted | Under Review | Assigned to reviewer |
| Submitted | Rejected | Rejected before review |
| Under Review | Approved | Meets all criteria |
| Under Review | Rejected | Does not meet criteria |
| Approved | Issued | ACCU units issued |

## Business Logic

### Validation Rules

1. **Application Creation**
   - Project must exist and be active
   - No existing draft applications for the project
   - ACCU units must be positive
   - Methodology must be valid and active
   - Required application data must be provided

2. **Submission Requirements**
   - Application must be in Draft status
   - Minimum ACCU units (1)
   - Description is required
   - Valid methodology
   - Document requirements checked (warning if missing)

3. **Approval Requirements**
   - Application must be Submitted or Under Review
   - All required documents present
   - Business rule validation

### Document Management

- Applications are linked to documents through the associated project
- Required documents are determined by methodology
- Document completion affects application progress
- Missing document notifications are sent automatically

### Deadline Management

- Submission deadlines are tracked via calendar events
- Automatic reminders at 30, 14, 7, 3, and 1 day intervals
- Overdue applications are flagged in analytics

## Notification System

The module includes a comprehensive notification system that sends:

### Status Change Notifications
- Application creation (Draft)
- Submission confirmation
- Under review notification
- Approval/rejection notifications
- Issuance confirmation

### Deadline Reminders
- Automated reminders based on submission deadlines
- Escalation notifications for overdue items

### Document Requirements
- Missing document notifications
- Document upload confirmations

### System Notifications
- Admin notifications for approvals/rejections
- System-wide announcements

## Integration Points

### Project Integration
- Applications are linked to projects
- Project status affects application eligibility
- Document sharing through project association

### Document Integration
- Required document validation
- Document metadata enhancement with application context
- Audit trail for document changes

### Calendar Integration
- Automatic deadline event creation
- Deadline reminder scheduling
- Calendar event updates for status changes

### Notification Integration
- Comprehensive notification pipeline
- Multi-channel delivery (in-app, email)
- Notification history and tracking

## Security & Permissions

### Required Permissions

| Operation | Required Permission |
|-----------|-------------------|
| Read Applications | `accu_applications.read` |
| Create Applications | `accu_applications.write` |
| Update Applications | `accu_applications.write` |
| Delete Applications | `accu_applications.delete` |
| Approve/Reject | `accu_applications.write` |

### Role-Based Access

- **Users**: Can create and manage their own applications
- **Managers**: Can approve applications and manage team applications
- **Admins**: Full access including statistics and admin functions

### Data Isolation
- Multi-tenant support through `tenantId`
- User-based access control
- Project-based data filtering

## Analytics & Metrics

### Application Metrics
- Total applications by status
- Processing time analytics
- Success rate tracking
- Document completion rates
- Deadline compliance

### Performance Indicators
- Average processing time
- Application completion rate
- Document requirement compliance
- Deadline adherence

### Dashboard Widgets
- Status distribution charts
- Recent activity feed
- Upcoming deadlines
- Performance trends

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid status transition from draft to approved",
  "error": "Bad Request"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "ACCU application not found",
  "error": "Not Found"
}
```

#### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "A draft ACCU application already exists for this project",
  "error": "Conflict"
}
```

### Validation Errors
- Detailed field-level validation
- Business rule violation messages
- Methodology requirement validation
- Document requirement checking

## Testing

The module includes comprehensive unit tests covering:

- Service layer business logic
- Status transition validation
- Notification system integration
- Document requirement validation
- Analytics calculations
- Error handling scenarios

### Running Tests
```bash
npm test -- accu-applications.test.ts
```

## Configuration

### Environment Variables
- `RATE_LIMIT_TTL`: Rate limiting time window
- `RATE_LIMIT_MAX`: Maximum requests per time window
- `ACCU_MAX_UNITS`: Maximum ACCU units per application
- `ACCU_REVIEW_PERIOD`: Default review period in days

### Business Rules Configuration
- Methodology requirements
- Document requirements per methodology
- Processing time estimates
- Notification templates

## Future Enhancements

### Planned Features
1. **Bulk Operations**: Batch processing of multiple applications
2. **Advanced Analytics**: Machine learning for processing time prediction
3. **Integration APIs**: External CER system integration
4. **Mobile Support**: Mobile-optimized interfaces
5. **Workflow Automation**: Automated status transitions based on rules
6. **Audit Trail**: Enhanced audit logging for compliance
7. **Reporting**: Advanced reporting and export capabilities
8. **Templates**: Application templates for common use cases

### Extension Points
- Custom validation rules
- External system integrations
- Custom notification channels
- Additional workflow states
- Custom analytics metrics

## Support

For technical support or questions about the ACCU Applications module:

1. Check the API documentation
2. Review the business logic rules
3. Consult the integration guides
4. Contact the development team

---

*This module is part of the ACCU Platform and follows the established patterns and standards of the system.*