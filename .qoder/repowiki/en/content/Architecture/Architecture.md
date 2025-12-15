# Architecture

<cite>
**Referenced Files in This Document**   
- [app.module.ts](file://apps/backend/src/app.module.ts)
- [main.ts](file://apps/backend/src/main.ts)
- [ACCU_Platform_Architecture_Diagram.md](file://ACCU_Platform_Architecture_Diagram.md)
- [README.md](file://README.md)
- [docker-compose.yml](file://docker-compose.yml)
- [temporal.module.ts](file://apps/backend/src/modules/temporal/temporal.module.ts)
- [auth.module.ts](file://apps/backend/src/modules/auth/auth.module.ts)
- [accu.module.ts](file://apps/backend/src/modules/accu/accu.module.ts)
- [configuration.ts](file://apps/backend/src/config/configuration.ts)
- [database.config.ts](file://apps/backend/src/config/database.config.ts)
- [backend-deployment.yaml](file://k8s/backend-deployment.yaml)
- [frontend-deployment.yaml](file://k8s/frontend-deployment.yaml)
- [prometheus.yml](file://monitoring/prometheus/prometheus.yml)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
The ACCU Platform is a comprehensive system designed for managing Australian Carbon Credit Units (ACCU), providing end-to-end solutions for project management, compliance tracking, and carbon credit operations. This document outlines the high-level architecture, design patterns, system boundaries, and technical decisions that define the platform's structure and functionality. The architecture follows a modular monolith pattern with feature-based modules, enabling maintainability while supporting scalability requirements. Key architectural elements include an event-driven workflow engine using Temporal, centralized authentication via JWT tokens, and a robust API Gateway pattern for request handling and security enforcement.

## Project Structure
The ACCU Platform follows a well-organized directory structure that separates concerns and facilitates development workflows. The project is divided into applications, shared packages, configuration, and infrastructure components.

```mermaid
graph TB
subgraph "Root"
Apps[apps/]
Packages[packages/]
Config[config/]
K8s[k8s/]
Monitoring[monitoring/]
Scripts[scripts/]
Security[security/]
RootFiles["ACCU_Platform_Architecture_Diagram.md<br/>README.md<br/>docker-compose.yml"]
end
subgraph "Applications"
Backend[backend/]
Frontend[frontend/]
end
subgraph "Packages"
Shared[shared/]
end
Apps --> Backend
Apps --> Frontend
Packages --> Shared
Backend --> Src[src/]
Backend --> Test[test/]
Backend --> Dockerfile
Backend --> package.json
Frontend --> Src[src/]
Frontend --> Dockerfile
Frontend --> package.json
Src --> Common[common/]
Src --> Config[config/]
Src --> Entities[entities/]
Src --> Modules[modules/]
Src --> AppModule[app.module.ts]
Src --> Main[main.ts]
```

**Diagram sources**
- [ACCU_Platform_Architecture_Diagram.md](file://ACCU_Platform_Architecture_Diagram.md)
- [README.md](file://README.md)

**Section sources**
- [README.md](file://README.md)

## Core Components
The ACCU Platform consists of several core components that work together to deliver its functionality. The backend is built using NestJS, providing a structured approach to building server-side applications with TypeScript. The frontend uses Next.js 14 with React 18, enabling server-side rendering and optimized performance. The platform integrates with PostgreSQL for persistent data storage, Redis for caching and session management, and S3-compatible object storage for file management. Authentication is handled through JWT tokens with refresh token rotation, while authorization follows a role-based access control (RBAC) model. The Temporal workflow engine enables complex business processes to be orchestrated reliably, supporting long-running transactions and event-driven architectures.

**Section sources**
- [README.md](file://README.md)
- [app.module.ts](file://apps/backend/src/app.module.ts)
- [main.ts](file://apps/backend/src/main.ts)

## Architecture Overview
The ACCU Platform follows a layered architecture with clear separation of concerns between different system components. The architecture diagram illustrates the various layers and their interactions.

```mermaid
graph TB
subgraph "Frontend Layer"
UI[React/Next.js UI]
RBAC[RBAC Frontend Components]
DASH[Dashboard & Analytics]
FORMS[Dynamic Forms]
end
subgraph "API Gateway Layer"
GATEWAY[API Gateway<br/>Rate Limiting & Auth]
AUTH[JWT Authentication]
RBAC_API[Authorization Service]
end
subgraph "Core Services Layer"
subgraph "Business Logic"
DOCS[Document Service]
CAL[Calendar Service]
AUDIT[Audit Service]
COMM[Communication Service]
ACCU_APP[ACCU Application Service]
ACCU_INV[ACCU Inventory Service]
MON[Monitoring Service]
NOTIF[Notification Service]
PROJ[Project Service]
end
subgraph "Workflow Engine"
TEMPORAL[Temporal Workflow Engine]
JOBS[Job Scheduler]
EVENTS[Event Engine]
end
subgraph "Data Services"
FILE[File Storage Service]
EMAIL[Email Service]
SEARCH[Search Service]
end
end
subgraph "Data Layer"
DB[(PostgreSQL<br/>System of Record)]
CACHE[(Redis<br/>Cache & Queues)]
STORAGE[(S3-Compatible<br/>Object Storage)]
end
subgraph "External Integrations"
CER_API[CER API]
EMAIL_SYS[Email Systems]
SENSOR[IoT Sensors]
MARKET[Market Data APIs]
CALENDAR[Calendar Systems]
end
subgraph "Infrastructure"
RAILWAY[Railway Deployment]
MONITOR[Monitoring & Logging]
BACKUP[Backup & Recovery]
SCALE[Auto-scaling]
end
%% Frontend to Gateway
UI --> GATEWAY
RBAC --> GATEWAY
DASH --> GATEWAY
FORMS --> GATEWAY
%% Gateway to Services
GATEWAY --> AUTH
GATEWAY --> RBAC_API
GATEWAY --> DOCS
GATEWAY --> CAL
GATEWAY --> AUDIT
GATEWAY --> COMM
GATEWAY --> ACCU_APP
GATEWAY --> ACCU_INV
GATEWAY --> MON
GATEWAY --> NOTIF
GATEWAY --> PROJ
%% Service to Workflow
DOCS --> TEMPORAL
CAL --> TEMPORAL
AUDIT --> TEMPORAL
COMM --> TEMPORAL
ACCU_APP --> TEMPORAL
ACCU_INV --> TEMPORAL
MON --> TEMPORAL
NOTIF --> TEMPORAL
PROJ --> TEMPORAL
TEMPORAL --> JOBS
TEMPORAL --> EVENTS
%% Services to Data
DOCS --> DB
DOCS --> STORAGE
CAL --> DB
AUDIT --> DB
COMM --> DB
COMM --> EMAIL_SYS
ACCU_APP --> DB
ACCU_INV --> DB
MON --> DB
MON --> SENSOR
NOTIF --> CACHE
PROJ --> DB
%% File and Email Services
FILE --> STORAGE
EMAIL --> EMAIL_SYS
SEARCH --> DB
%% External Integrations
COMM --> CER_API
MON --> SENSOR
ACCU_INV --> MARKET
CAL --> CALENDAR
%% Infrastructure
GATEWAY --> RAILWAY
DB --> RAILWAY
STORAGE --> RAILWAY
CACHE --> RAILWAY
TEMPORAL --> MONITOR
JOBS --> MONITOR
EVENTS --> MONITOR
DB --> BACKUP
STORAGE --> BACKUP
RAILWAY --> SCALE
```

**Diagram sources**
- [ACCU_Platform_Architecture_Diagram.md](file://ACCU_Platform_Architecture_Diagram.md#L6-L139)

## Detailed Component Analysis

### Backend Application Structure
The backend application is structured as a modular monolith with feature-based modules, each encapsulating specific business capabilities. This design allows for maintainability while avoiding the complexity of microservices.

```mermaid
graph TD
AppModule[AppModule] --> AuthModule[AuthModule]
AppModule --> UsersModule[UsersModule]
AppModule --> ProjectsModule[ProjectsModule]
AppModule --> DocumentsModule[DocumentsModule]
AppModule --> CalendarModule[CalendarModule]
AppModule --> AccuModule[AccuModule]
AppModule --> AuditsModule[AuditsModule]
AppModule --> CommunicationsModule[CommunicationsModule]
AppModule --> NotificationsModule[NotificationsModule]
AppModule --> FileStorageModule[FileStorageModule]
AppModule --> EmailModule[EmailModule]
AppModule --> CerModule[CerModule]
AppModule --> ExternalModule[ExternalModule]
AppModule --> SearchModule[SearchModule]
AppModule --> ConfigModule[ConfigModule]
AppModule --> TypeOrmModule[TypeOrmModule]
AppModule --> ThrottlerModule[ThrottlerModule]
AppModule --> MulterModule[MulterModule]
```

**Diagram sources**
- [app.module.ts](file://apps/backend/src/app.module.ts#L25-L75)

**Section sources**
- [app.module.ts](file://apps/backend/src/app.module.ts#L1-L75)

### Temporal Workflow Integration
The platform utilizes Temporal as its workflow engine, enabling reliable execution of long-running business processes. The Temporal module integrates with various business services to orchestrate complex operations.

```mermaid
graph TD
TemporalModule[TemporalModule] --> AccuWorkflows[AccuApplicationWorkflowsModule]
TemporalModule --> ProjectWorkflows[ProjectWorkflowsModule]
TemporalModule --> DocumentWorkflows[DocumentWorkflowsModule]
TemporalModule --> CalendarWorkflows[CalendarWorkflowsModule]
TemporalModule --> NotificationActivities[NotificationActivitiesModule]
TemporalModule --> DatabaseActivities[DatabaseActivitiesModule]
TemporalModule --> EmailActivities[EmailActivitiesModule]
TemporalModule --> CalendarActivities[CalendarActivitiesModule]
TemporalModule --> TemporalService[TemporalService]
TemporalModule --> TemporalClient[TemporalClient]
TemporalModule --> TemporalWorker[TemporalWorker]
```

**Diagram sources**
- [temporal.module.ts](file://apps/backend/src/modules/temporal/temporal.module.ts#L19-L43)

**Section sources**
- [temporal.module.ts](file://apps/backend/src/modules/temporal/temporal.module.ts#L1-L43)

### Authentication and Authorization
The platform implements a robust authentication and authorization system using JWT tokens and Passport strategies. The AuthModule provides centralized authentication services that are consumed by other modules.

```mermaid
graph TD
AuthModule[AuthModule] --> PassportModule[PassportModule]
AuthModule --> JwtModule[JwtModule]
AuthModule --> ConfigModule[ConfigModule]
AuthModule --> TypeOrmModule[TypeOrmModule]
AuthModule --> AuthController[AuthController]
AuthModule --> AuthService[AuthService]
AuthModule --> LocalStrategy[LocalStrategy]
AuthModule --> JwtStrategy[JwtStrategy]
AuthModule --> JwtRefreshStrategy[JwtRefreshStrategy]
TypeOrmModule --> User[User Entity]
TypeOrmModule --> Role[Role Entity]
```

**Diagram sources**
- [auth.module.ts](file://apps/backend/src/modules/auth/auth.module.ts#L17-L44)

**Section sources**
- [auth.module.ts](file://apps/backend/src/modules/auth/auth.module.ts#L1-L44)

### Data Flow Architecture
The platform follows a consistent data flow pattern from user interaction through to data persistence and external integrations.

```mermaid
sequenceDiagram
participant User
participant UI as React UI
participant Gateway as API Gateway
participant Auth as Auth Service
participant Service as Business Service
participant Temporal as Temporal Engine
participant DB as PostgreSQL
participant Storage as File Storage
participant External as External API
User->>UI : Initiates Action
UI->>Gateway : API Request
Gateway->>Auth : Validate Token
Auth-->>Gateway : Token Valid
Gateway->>Service : Forward Request
alt Requires Workflow
Service->>Temporal : Start Workflow
Temporal->>Temporal : Execute Steps
Temporal->>DB : Store Results
Temporal->>Storage : Store Files
Temporal->>External : Call External API
Temporal-->>Service : Workflow Complete
end
Service->>DB : CRUD Operations
Service->>Storage : File Operations
Service-->>Gateway : Response
Gateway-->>UI : API Response
UI-->>User : Update UI
```

**Diagram sources**
- [ACCU_Platform_Architecture_Diagram.md](file://ACCU_Platform_Architecture_Diagram.md#L144-L176)

## Dependency Analysis
The platform's dependency structure reveals a well-organized architecture with clear separation of concerns and minimal circular dependencies.

```mermaid
graph TD
subgraph "Foundation"
AUTH[Authentication]
RBAC[Authorization]
STORAGE[File Storage]
DB[(Database)]
end
subgraph "Core Modules"
DOCS[Document Management]
CAL[Calendar & Deadlines]
AUDIT[Audit Coordination]
COMM[Communication]
ACCU_APP[ACCU Applications]
ACCU_INV[ACCU Inventory]
MON[Monitoring]
NOTIF[Notifications]
PROJ[Projects]
end
subgraph "Workflow Engine"
TEMP[Temporal]
JOBS[Job Scheduler]
EVENTS[Event Engine]
end
AUTH --> DOCS
AUTH --> CAL
AUTH --> AUDIT
AUTH --> COMM
AUTH --> ACCU_APP
AUTH --> ACCU_INV
AUTH --> MON
AUTH --> NOTIF
AUTH --> PROJ
RBAC --> DOCS
RBAC --> CAL
RBAC --> AUDIT
RBAC --> COMM
RBAC --> ACCU_APP
RBAC --> ACCU_INV
RBAC --> MON
RBAC --> NOTIF
RBAC --> PROJ
STORAGE --> DOCS
STORAGE --> MON
STORAGE --> PROJ
DB --> DOCS
DB --> CAL
DB --> AUDIT
DB --> COMM
DB --> ACCU_APP
DB --> ACCU_INV
DB --> MON
DB --> NOTIF
DB --> PROJ
DOCS --> TEMP
CAL --> TEMP
AUDIT --> TEMP
COMM --> TEMP
ACCU_APP --> TEMP
ACCU_INV --> TEMP
MON --> TEMP
NOTIF --> TEMP
PROJ --> TEMP
TEMP --> JOBS
TEMP --> EVENTS
```

**Diagram sources**
- [ACCU_Platform_Architecture_Diagram.md](file://ACCU_Platform_Architecture_Diagram.md#L237-L309)

**Section sources**
- [app.module.ts](file://apps/backend/src/app.module.ts#L25-L75)
- [temporal.module.ts](file://apps/backend/src/modules/temporal/temporal.module.ts#L19-L43)

## Performance Considerations
The ACCU Platform is designed with performance and scalability in mind. The architecture supports horizontal scaling of application instances, with load balancing distributing traffic across multiple backend instances. Caching is implemented using Redis for frequently accessed data, reducing database load and improving response times. The database layer uses PostgreSQL with master-replica configuration for read scaling and high availability. Rate limiting is enforced at the API gateway level to prevent abuse and ensure fair usage of resources. The platform also implements connection pooling and efficient query patterns to optimize database performance.

```mermaid
graph TB
subgraph "Production Environment"
subgraph "Load Balancer"
LB[Load Balancer]
end
subgraph "Application Tier"
APP1[App Instance 1]
APP2[App Instance 2]
APP3[App Instance N]
end
subgraph "Cache Tier"
REDIS[Redis Cluster]
end
subgraph "Database Tier"
PG_MASTER[(PostgreSQL Master)]
PG_SLAVE[(PostgreSQL Replica)]
end
subgraph "Storage Tier"
S3[Object Storage]
BACKUP[Backup Storage]
end
subgraph "Monitoring"
LOGS[Centralized Logging]
METRICS[Metrics Collection]
ALERTS[Alert Management]
end
end
LB --> APP1
LB --> APP2
LB --> APP3
APP1 --> REDIS
APP2 --> REDIS
APP3 --> REDIS
APP1 --> PG_MASTER
APP2 --> PG_MASTER
APP3 --> PG_MASTER
APP1 --> S3
APP2 --> S3
APP3 --> S3
PG_MASTER --> PG_SLAVE
PG_MASTER --> BACKUP
APP1 --> LOGS
APP2 --> LOGS
APP3 --> LOGS
LOGS --> METRICS
METRICS --> ALERTS
```

**Diagram sources**
- [ACCU_Platform_Architecture_Diagram.md](file://ACCU_Platform_Architecture_Diagram.md#L314-L372)
- [k8s/backend-deployment.yaml](file://k8s/backend-deployment.yaml#L10-L15)
- [k8s/frontend-deployment.yaml](file://k8s/frontend-deployment.yaml#L10-L15)

## Troubleshooting Guide
The platform includes comprehensive monitoring and logging capabilities to support troubleshooting and incident response. The monitoring stack consists of Prometheus for metrics collection, Grafana for visualization, and ELK (Elasticsearch, Logstash, Kibana) for log aggregation and analysis. Health checks are implemented at multiple levels, including liveness and readiness probes for Kubernetes deployments. The platform also includes structured logging with appropriate log levels and contextual information to facilitate debugging. Alerting rules are configured to notify operations teams of potential issues before they impact users.

**Section sources**
- [docker-compose.yml](file://docker-compose.yml#L129-L201)
- [monitoring/prometheus/prometheus.yml](file://monitoring/prometheus/prometheus.yml#L1-L153)
- [k8s/backend-deployment.yaml](file://k8s/backend-deployment.yaml#L120-L135)
- [k8s/frontend-deployment.yaml](file://k8s/frontend-deployment.yaml#L75-L90)

## Conclusion
The ACCU Platform architecture represents a well-balanced approach to building a complex carbon credit management system. By adopting a modular monolith design with feature-based modules, the platform achieves maintainability without the operational complexity of microservices. The integration of Temporal as a workflow engine enables reliable execution of long-running business processes, while the API Gateway pattern with centralized authentication ensures consistent security enforcement. The platform's deployment topology supports scalability and high availability, with comprehensive monitoring and logging capabilities for operational excellence. The technology stack, combining NestJS, Next.js, PostgreSQL, Redis, and Kubernetes, provides a robust foundation for current requirements and future growth.