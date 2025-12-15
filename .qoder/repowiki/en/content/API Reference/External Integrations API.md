# External Integrations API

<cite>
**Referenced Files in This Document**   
- [external-integration.controller.ts](file://apps/backend/src/modules/external/external-integration.controller.ts)
- [external-integration.service.ts](file://apps/backend/src/modules/external/external-integration.service.ts)
- [integration-health.interface.ts](file://apps/backend/src/modules/external/interfaces/integration-health.interface.ts)
- [cer.controller.ts](file://apps/backend/src/modules/cer/cer.controller.ts)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts)
- [cer-application.dto.ts](file://apps/backend/src/modules/cer/dto/cer-application.dto.ts)
- [cer-client.interface.ts](file://apps/backend/src/modules/cer/interfaces/cer-client.interface.ts)
- [email.service.ts](file://apps/backend/src/modules/email/email.service.ts)
- [file-storage.service.ts](file://apps/backend/src/modules/file-storage/file-storage.service.ts)
- [configuration.ts](file://apps/backend/src/config/configuration.ts)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Health Check Endpoints](#health-check-endpoints)
3. [CER API Integration](#cer-api-integration)
4. [Authentication and Authorization](#authentication-and-authorization)
5. [Request/Response Schemas](#requestresponse-schemas)
6. [Error Handling](#error-handling)
7. [Retry Mechanisms and Circuit Breaker Patterns](#retry-mechanisms-and-circuit-breaker-patterns)
8. [Data Transformation](#data-transformation)
9. [Common Integration Issues](#common-integration-issues)
10. [Configuration](#configuration)

## Introduction
This document provides comprehensive API documentation for external integration endpoints in the ACCU Platform. It covers health check routes, Clean Energy Regulator (CER) API integration, and connectivity with third-party systems. The documentation details HTTP methods, URL patterns, authentication mechanisms, request/response schemas, and error handling strategies for external service failures. It also explains the CER application submission process, status polling, response parsing, retry mechanisms, and circuit breaker patterns implemented in the external integration services.

**Section sources**
- [external-integration.controller.ts](file://apps/backend/src/modules/external/external-integration.controller.ts)
- [cer.controller.ts](file://apps/backend/src/modules/cer/cer.controller.ts)

## Health Check Endpoints

The health check endpoint provides status information about external integrations including CER API, email service, and file storage.

### Health Check Route
```mermaid
flowchart TD
A[GET /integrations/health] --> B{Authentication}
B --> C{Admin Role}
C --> D[Check CER Health]
D --> E[Check Email Health]
E --> F[Check Storage Health]
F --> G[Aggregate Status]
G --> H[Return Health Response]
```

**Diagram sources**
- [external-integration.controller.ts](file://apps/backend/src/modules/external/external-integration.controller.ts)
- [external-integration.service.ts](file://apps/backend/src/modules/external/external-integration.service.ts)

**Section sources**
- [external-integration.controller.ts](file://apps/backend/src/modules/external/external-integration.controller.ts#L12-L16)
- [external-integration.service.ts](file://apps/backend/src/modules/external/external-integration.service.ts#L19-L34)

## CER API Integration

The CER API integration handles submission of ACCU applications to the Clean Energy Regulator and status polling of submitted applications.

### CER Application Submission
```mermaid
sequenceDiagram
participant Client as "Client Application"
participant Controller as "CerController"
participant Service as "CerService"
participant CER as "CER API"
Client->>Controller : POST /integrations/cer/submit
Controller->>Service : submitApplication(dto)
Service->>Service : Validate API Key
alt API Key Present
Service->>CER : POST /applications/submit
CER-->>Service : 200 OK + Reference ID
Service-->>Controller : Submission Response
else No API Key
Service-->>Controller : Mock Response
end
Controller-->>Client : Submission Result
```

**Diagram sources**
- [cer.controller.ts](file://apps/backend/src/modules/cer/cer.controller.ts#L13-L17)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L22-L56)

### CER Status Polling
```mermaid
sequenceDiagram
participant Client as "Client Application"
participant Controller as "CerController"
participant Service as "CerService"
participant CER as "CER API"
Client->>Controller : GET /integrations/cer/status/{referenceId}
Controller->>Service : checkStatus(referenceId)
Service->>Service : Validate API Key
alt API Key Present
Service->>CER : GET /applications/{referenceId}/status
CER-->>Service : Status Response
Service-->>Controller : Status Data
else No API Key
Service-->>Controller : Mock Status
end
Controller-->>Client : Application Status
```

**Diagram sources**
- [cer.controller.ts](file://apps/backend/src/modules/cer/cer.controller.ts#L19-L23)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L69-L90)

**Section sources**
- [cer.controller.ts](file://apps/backend/src/modules/cer/cer.controller.ts#L13-L23)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L22-L90)

## Authentication and Authorization

External integration endpoints require JWT-based authentication and role-based authorization.

### Authentication Flow
```mermaid
flowchart TD
A[Client Request] --> B{Has Authorization Header}
B --> |No| C[401 Unauthorized]
B --> |Yes| D[Validate JWT Token]
D --> |Invalid| C
D --> |Valid| E[Extract User Data]
E --> F{Has Required Role}
F --> |No| G[403 Forbidden]
F --> |Yes| H[Process Request]
```

The system uses JWT authentication with role-based access control. The `JwtAuthGuard` validates the JWT token, and the `RolesGuard` ensures the user has the required permissions.

**Section sources**
- [external-integration.controller.ts](file://apps/backend/src/modules/external/external-integration.controller.ts#L8)
- [cer.controller.ts](file://apps/backend/src/modules/cer/cer.controller.ts#L9)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L14-L40)

## Request/Response Schemas

### CER Application Submission Schema
```mermaid
classDiagram
class SubmitCerApplicationDto {
+string projectId
+string methodologyId
+number accuUnits
+Record<string, any> applicationData
+string? serReference
}
```

**Diagram sources**
- [cer-application.dto.ts](file://apps/backend/src/modules/cer/dto/cer-application.dto.ts#L3-L22)

### CER Application Status Response Schema
```mermaid
classDiagram
class CerApplicationStatusResponseDto {
+string applicationId
+string externalReferenceId
+CerApplicationStatus status
+string lastUpdated
+any? details
}
class CerApplicationStatus {
+SUBMITTED
+PENDING
+APPROVED
+REJECTED
+MORE_INFO_REQUIRED
}
```

**Diagram sources**
- [cer-application.dto.ts](file://apps/backend/src/modules/cer/dto/cer-application.dto.ts#L24-L47)

### Integration Health Response Schema
```mermaid
classDiagram
class IntegrationHealth {
+string service
+'UP'|'DOWN'|'DEGRADED' status
+number? latency
+string lastCheck
+string? message
+any? details
}
class IntegrationStatusResponse {
+'UP'|'DOWN'|'DEGRADED' overallStatus
+IntegrationHealth[] services
+string timestamp
}
```

**Diagram sources**
- [integration-health.interface.ts](file://apps/backend/src/modules/external/interfaces/integration-health.interface.ts#L1-L14)

**Section sources**
- [cer-application.dto.ts](file://apps/backend/src/modules/cer/dto/cer-application.dto.ts#L3-L47)
- [integration-health.interface.ts](file://apps/backend/src/modules/external/interfaces/integration-health.interface.ts#L1-L14)

## Error Handling

The system implements comprehensive error handling for external service failures.

### External Service Error Handling
```mermaid
flowchart TD
A[External Service Call] --> B{Success}
B --> |Yes| C[Return Data]
B --> |No| D[Log Error]
D --> E[Check Error Type]
E --> |HTTP Error| F[Throw Bad Gateway]
E --> |Network Error| G[Throw Service Unavailable]
E --> |Timeout| H[Throw Gateway Timeout]
F --> I[Return 502]
G --> I[Return 503]
H --> I[Return 504]
```

When external service calls fail, the system catches exceptions and throws appropriate HTTP exceptions with 5xx status codes. The `CerService` specifically handles CER API errors by throwing `HttpException` with `BAD_GATEWAY` status.

**Section sources**
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L57-L63)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L92-L97)

## Retry Mechanisms and Circuit Breaker Patterns

The external integration service implements health checking with fallback mechanisms, though explicit retry and circuit breaker patterns are not implemented in the current code.

### Integration Health Check Pattern
```mermaid
flowchart TD
A[Get Integration Status] --> B[Check CER Health]
B --> C[Check Email Health]
C --> D[Check Storage Health]
D --> E[Aggregate Results]
E --> F{All Services UP}
F --> |Yes| G[Return UP]
F --> |No| H{Any Service DOWN}
H --> |Yes| I[Return DOWN]
H --> |No| J[Return DEGRADED]
```

The system checks the health of external services by validating configuration presence and attempting connectivity checks. For CER API, it verifies the API key is configured. For email, it checks SMTP configuration. For storage, it attempts to retrieve storage quota.

**Section sources**
- [external-integration.service.ts](file://apps/backend/src/modules/external/external-integration.service.ts#L19-L34)
- [external-integration.service.ts](file://apps/backend/src/modules/external/external-integration.service.ts#L37-L131)

## Data Transformation

The system handles data transformation between internal formats and external CER API formats.

### CER Data Transformation Flow
```mermaid
flowchart LR
A[Internal ACCU Application] --> B[SubmitCerApplicationDto]
B --> C[JSON Serialization]
C --> D[CER API Request]
D --> E[CER API Response]
E --> F[JSON Deserialization]
F --> G[CerApplicationStatusResponseDto]
G --> H[Internal Status Processing]
```

The `CerService` transforms internal application data into the format expected by the CER API and parses the response into internal DTOs. In development environments without a configured API key, mock responses are generated.

**Section sources**
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L22-L56)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L104-L112)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L117-L128)

## Common Integration Issues

### Rate Limiting by External APIs
The system does not currently implement client-side rate limiting for external API calls. Rate limiting configuration exists in the system but is not applied to external integrations.

### Authentication Token Expiration
The CER integration uses API key authentication rather than OAuth tokens, so token expiration is not an issue. However, if the CER API were to implement token-based authentication, the system would need to handle token refresh logic.

### Data Format Incompatibilities
The system handles data format incompatibilities through the DTO transformation layer. The `SubmitCerApplicationDto` and `CerApplicationStatusResponseDto` classes validate incoming and outgoing data to ensure compatibility with the expected formats.

**Section sources**
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L27-L29)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L71-L73)
- [cer-application.dto.ts](file://apps/backend/src/modules/cer/dto/cer-application.dto.ts#L3-L47)

## Configuration

External integrations are configured through environment variables and the configuration service.

### CER API Configuration
The CER API integration is configured with the following parameters:
- `CER_API_BASE_URL`: Base URL for the CER API
- `CER_API_KEY`: API key for authentication
- `CER_API_TIMEOUT`: Request timeout in milliseconds

These values are loaded via the `ConfigService` and used to configure the CER API client.

### Email Service Configuration
The email service is configured with SMTP settings:
- `EMAIL_HOST`: SMTP server host
- `EMAIL_PORT`: SMTP server port
- `EMAIL_USER`: SMTP username
- `EMAIL_PASSWORD`: SMTP password
- `EMAIL_FROM`: Default sender email address

### File Storage Configuration
File storage is configured with provider-specific settings:
- `FILE_STORAGE_PROVIDER`: Storage provider (local, s3, minio)
- `FILE_STORAGE_BUCKET`: Bucket name
- `FILE_STORAGE_ENDPOINT`: Provider endpoint
- `FILE_STORAGE_ACCESS_KEY_ID`: Access key
- `FILE_STORAGE_SECRET_ACCESS_KEY`: Secret key
- `FILE_STORAGE_REGION`: Region

**Section sources**
- [configuration.ts](file://apps/backend/src/config/configuration.ts#L51-L56)
- [email.service.ts](file://apps/backend/src/modules/email/email.service.ts#L21-L26)
- [file-storage.service.ts](file://apps/backend/src/modules/file-storage/file-storage.service.ts#L38-L58)
- [cer.service.ts](file://apps/backend/src/modules/cer/cer.service.ts#L12-L16)