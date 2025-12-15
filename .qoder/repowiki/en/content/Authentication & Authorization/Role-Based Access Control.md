# Role-Based Access Control

<cite>
**Referenced Files in This Document**
- [roles.decorator.ts](file://apps/backend/src/common/decorators/roles.decorator.ts)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts)
- [permissions.decorator.ts](file://apps/backend/src/common/decorators/permissions.decorator.ts)
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts)
- [role.entity.ts](file://apps/backend/src/entities/role.entity.ts)
- [user.entity.ts](file://apps/backend/src/entities/user.entity.ts)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts)
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts)
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts)
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts)
- [app.module.ts](file://apps/backend/src/app.module.ts)
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
This section documents the Role-Based Access Control (RBAC) implementation in the ACCU Platform. It explains how roles and permissions are modeled, how the @Roles() decorator and RolesGuard enforce role-based restrictions, and how the Reflector service reads route metadata to validate user roles stored in the JWT payload. It also covers the data flow from user login to route protection, and details role assignment and revocation via AuthService methods. Finally, it addresses common issues such as role synchronization after permission changes and performance considerations for role lookups.

## Project Structure
RBAC spans several layers:
- Decorators define role and permission metadata on routes.
- Guards enforce access checks using NestJS’s Reflector.
- Entities model roles and users with many-to-many relationships.
- Auth service manages JWT payloads, role assignment/revocation, and permission validation.
- Strategies attach the authenticated user (with roles) to the request object.

```mermaid
graph TB
subgraph "Decorators"
RD["roles.decorator.ts"]
PD["permissions.decorator.ts"]
end
subgraph "Guards"
RG["roles.guard.ts"]
PG["permissions.guard.ts"]
end
subgraph "Entities"
UE["user.entity.ts"]
RE["role.entity.ts"]
end
subgraph "Auth Layer"
AS["auth.service.ts"]
JS["jwt.strategy.ts"]
AC["auth.controller.ts"]
end
subgraph "Controllers"
UC["users.controller.ts"]
end
RD --> RG
PD --> PG
RG --> UE
PG --> AS
AS --> JS
JS --> AC
UE --> AS
RE --> AS
UC --> RG
UC --> PG
```

**Diagram sources**
- [roles.decorator.ts](file://apps/backend/src/common/decorators/roles.decorator.ts#L1-L4)
- [permissions.decorator.ts](file://apps/backend/src/common/decorators/permissions.decorator.ts#L1-L6)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L1-L41)
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts#L1-L47)
- [user.entity.ts](file://apps/backend/src/entities/user.entity.ts#L1-L124)
- [role.entity.ts](file://apps/backend/src/entities/role.entity.ts#L1-L133)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L1-L315)
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts#L1-L29)
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L1-L152)
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts#L1-L315)

**Section sources**
- [app.module.ts](file://apps/backend/src/app.module.ts#L1-L75)

## Core Components
- Roles decorator and guard:
  - @Roles(...) stores role names on route handlers.
  - RolesGuard reads the required roles via Reflector and compares them against the user’s roles extracted from the request.
- Permissions decorator and guard:
  - @Permissions(...) stores permission enums on route handlers.
  - PermissionsGuard reads required permissions and delegates validation to AuthService, which checks if the user’s roles include any of the required permissions.
- Entities:
  - Role defines role name, permissions array, and system role flag.
  - User has many-to-many roles with eager loading to support fast role checks.
- Auth service:
  - Builds JWT payloads containing roles.
  - Provides assignRole and revokeRole for role management.
  - Validates user permissions by checking role permission arrays.
- JWT strategy:
  - Verifies tokens and loads the user with roles into request.user.

**Section sources**
- [roles.decorator.ts](file://apps/backend/src/common/decorators/roles.decorator.ts#L1-L4)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L1-L41)
- [permissions.decorator.ts](file://apps/backend/src/common/decorators/permissions.decorator.ts#L1-L6)
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts#L1-L47)
- [role.entity.ts](file://apps/backend/src/entities/role.entity.ts#L1-L133)
- [user.entity.ts](file://apps/backend/src/entities/user.entity.ts#L1-L124)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L1-L315)
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts#L1-L29)

## Architecture Overview
The RBAC enforcement pipeline:
1. User authenticates and receives a JWT with roles embedded in the payload.
2. JWT strategy verifies the token and attaches the user (including roles) to the request.
3. Route handlers declare required roles or permissions via decorators.
4. Guards read the metadata and validate access against the user’s roles or permissions.

```mermaid
sequenceDiagram
participant Client as "Client"
participant AuthCtrl as "AuthController"
participant AuthSvc as "AuthService"
participant JwtStrat as "JwtStrategy"
participant Guard as "RolesGuard/PermissionsGuard"
participant Ctrl as "Controller"
Client->>AuthCtrl : "POST /auth/login"
AuthCtrl->>AuthSvc : "validateUser(email, password)"
AuthSvc-->>AuthCtrl : "User with roles"
AuthCtrl->>AuthSvc : "login(user)"
AuthSvc-->>AuthCtrl : "AuthResult {accessToken}"
AuthCtrl-->>Client : "AuthResult"
Client->>Ctrl : "Protected request with Bearer token"
JwtStrat->>AuthSvc : "validateUserById(sub)"
AuthSvc-->>JwtStrat : "User with roles"
JwtStrat-->>Ctrl : "request.user populated"
Ctrl->>Guard : "Route handler decorated with @Roles/@Permissions"
Guard-->>Ctrl : "Access granted or forbidden"
```

**Diagram sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L1-L152)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L1-L315)
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts#L1-L29)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L1-L41)
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts#L1-L47)
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts#L1-L315)

## Detailed Component Analysis

### Roles Decorator and RolesGuard
- Roles decorator:
  - Exposes a constant key and a factory that stores role names on the route handler metadata.
- RolesGuard:
  - Uses Reflector to retrieve required roles from the handler/class.
  - If no roles are required, access is granted.
  - Extracts user from request and ensures authentication.
  - Compares required roles against the user’s roles (role names).
  - Throws a forbidden error if the user lacks any required role.

```mermaid
flowchart TD
Start(["Request enters RolesGuard"]) --> ReadMeta["Reflector reads required roles"]
ReadMeta --> HasRequired{"Any required roles?"}
HasRequired --> |No| Allow["Allow access"]
HasRequired --> |Yes| GetUser["Extract user from request"]
GetUser --> HasUser{"User present?"}
HasUser --> |No| ThrowAuth["Throw forbidden (not authenticated)"]
HasUser --> |Yes| BuildUserRoles["Build user roles list"]
BuildUserRoles --> CheckRole{"Is any required role present?"}
CheckRole --> |No| ThrowPerm["Throw forbidden (insufficient role)"]
CheckRole --> |Yes| Allow
```

**Diagram sources**
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L1-L41)
- [roles.decorator.ts](file://apps/backend/src/common/decorators/roles.decorator.ts#L1-L4)

**Section sources**
- [roles.decorator.ts](file://apps/backend/src/common/decorators/roles.decorator.ts#L1-L4)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L1-L41)

### Permissions Decorator and PermissionsGuard
- Permissions decorator:
  - Stores permission enums on the route handler metadata.
- PermissionsGuard:
  - Reads required permissions via Reflector.
  - If none required, access is granted.
  - Extracts user from request and ensures authentication.
  - Delegates permission validation to AuthService.validateUserPermissions.
  - Throws a forbidden error if the user lacks required permissions.

```mermaid
sequenceDiagram
participant Guard as "PermissionsGuard"
participant Reflect as "Reflector"
participant Auth as "AuthService"
participant Req as "Request"
Guard->>Reflect : "getAllAndOverride(permissions)"
Reflect-->>Guard : "requiredPermissions"
alt No permissions required
Guard-->>Req : "Allow"
else Permissions required
Guard->>Req : "Extract user"
Guard->>Auth : "validateUserPermissions(user.id, requiredPermissions)"
Auth-->>Guard : "boolean"
alt Allowed
Guard-->>Req : "Allow"
else Denied
Guard-->>Req : "Forbidden"
end
end
```

**Diagram sources**
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts#L1-L47)
- [permissions.decorator.ts](file://apps/backend/src/common/decorators/permissions.decorator.ts#L1-L6)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L300-L315)

**Section sources**
- [permissions.decorator.ts](file://apps/backend/src/common/decorators/permissions.decorator.ts#L1-L6)
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts#L1-L47)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L300-L315)

### Role Model and User Model
- Role entity:
  - Unique name, optional description, array of permission enums, system role flag, and metadata.
  - Bidirectional many-to-many with User.
  - Helper methods to check permissions and grant/revoke.
- User entity:
  - Many-to-many roles with eager loading to minimize lookups during authorization.
  - Helper methods to check role and permission presence.

```mermaid
classDiagram
class Role {
+string id
+string name
+string description
+Permission[] permissions
+boolean isSystemRole
+Record~string,any~ metadata
+User[] users
+hasPermission(permission) boolean
+hasAnyPermission(permissions) boolean
+hasAllPermissions(permissions) boolean
+grantPermission(permission) void
+revokePermission(permission) void
}
class User {
+string id
+string email
+string firstName
+string lastName
+UserStatus status
+Role[] roles
+fullName() string
+hasRole(name) boolean
+hasPermission(permission) boolean
+isActive() boolean
}
Role "many" -- "many" User : "user_roles"
```

**Diagram sources**
- [role.entity.ts](file://apps/backend/src/entities/role.entity.ts#L1-L133)
- [user.entity.ts](file://apps/backend/src/entities/user.entity.ts#L1-L124)

**Section sources**
- [role.entity.ts](file://apps/backend/src/entities/role.entity.ts#L1-L133)
- [user.entity.ts](file://apps/backend/src/entities/user.entity.ts#L1-L124)

### Auth Service: JWT Payload, Role Assignment, and Permission Validation
- JWT payload construction:
  - The login method builds a payload containing user id, email, roles, and tenant id.
  - Roles are serialized as role names from the user’s roles collection.
- Role assignment and revocation:
  - assignRole(userId, roleName) adds a role to a user if not already assigned.
  - revokeRole(userId, roleName) removes a role from a user.
- Permission validation:
  - validateUserPermissions(userId, requiredPermissions) checks if any role of the user includes any of the required permissions.

```mermaid
flowchart TD
A["AuthService.login(user)"] --> B["Build payload with roles[]"]
B --> C["Sign access token"]
C --> D["Return AuthResult"]
E["assignRole(userId, roleName)"] --> F["Load user with roles"]
F --> G{"Role exists?"}
G --> |No| H["Throw not found"]
G --> |Yes| I{"Already has role?"}
I --> |Yes| J["Throw bad request"]
I --> |No| K["Push role and save user"]
L["revokeRole(userId, roleName)"] --> M["Load user with roles"]
M --> N["Filter out role and save user"]
O["validateUserPermissions(userId, perms)"] --> P["Load user with roles"]
P --> Q{"Active?"}
Q --> |No| R["Return false"]
Q --> |Yes| S{"Any role has any required permission?"}
S --> |Yes| T["Return true"]
S --> |No| U["Return false"]
```

**Diagram sources**
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L69-L96)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L226-L265)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L300-L315)

**Section sources**
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L69-L96)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L226-L265)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L300-L315)

### JWT Strategy and Request Population
- JwtStrategy:
  - Verifies JWT and loads the user by id from the payload.
  - Attaches the hydrated user (with roles) to request.user.
- Auth controller:
  - Demonstrates that request.user contains roles after authentication.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Strategy as "JwtStrategy"
participant Service as "AuthService"
participant Controller as "AuthController"
Client->>Strategy : "Bearer token"
Strategy->>Service : "validateUserById(sub)"
Service-->>Strategy : "User with roles"
Strategy-->>Controller : "request.user = User"
Controller-->>Client : "Profile with roles"
```

**Diagram sources**
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts#L1-L29)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L161-L171)
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L131-L151)

**Section sources**
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts#L1-L29)
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L131-L151)

### Example Usage: Controllers Using @Roles and @Permissions
- UsersController applies both RolesGuard and PermissionsGuard globally and decorates endpoints with @Roles and @Permissions to restrict sensitive operations.
- Examples include creating users, toggling statuses, assigning or revoking roles, and deleting users.

Concrete examples from the codebase:
- Create user endpoint guarded by @Roles('admin', 'super_admin') and @Permissions(Permission.USERS_WRITE).
- Toggle user status endpoint guarded by @Roles('admin', 'super_admin') and @Permissions(Permission.USERS_WRITE).
- Assign role to user endpoint guarded by @Roles('admin', 'super_admin') and @Permissions(Permission.USERS_WRITE).
- Revoke role from user endpoint guarded by @Roles('admin', 'super_admin') and @Permissions(Permission.USERS_WRITE).
- Delete user endpoint guarded by @Roles('admin', 'super_admin') and @Permissions(Permission.USERS_DELETE).

These demonstrate how roles and permissions combine to protect sensitive operations.

**Section sources**
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts#L45-L247)
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts#L249-L268)

## Dependency Analysis
- Decorators depend on NestJS SetMetadata to annotate handlers.
- Guards depend on Reflector to read metadata and on AuthService for permission checks.
- Entities define the data model for roles and users.
- Auth service depends on repositories and JWT service.
- JWT strategy depends on AuthService to hydrate the user.

```mermaid
graph LR
RD["roles.decorator.ts"] --> RG["roles.guard.ts"]
PD["permissions.decorator.ts"] --> PG["permissions.guard.ts"]
RG --> UE["user.entity.ts"]
PG --> AS["auth.service.ts"]
AS --> RE["role.entity.ts"]
JS["jwt.strategy.ts"] --> AS
AC["auth.controller.ts"] --> JS
UC["users.controller.ts"] --> RG
UC --> PG
```

**Diagram sources**
- [roles.decorator.ts](file://apps/backend/src/common/decorators/roles.decorator.ts#L1-L4)
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L1-L41)
- [permissions.decorator.ts](file://apps/backend/src/common/decorators/permissions.decorator.ts#L1-L6)
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts#L1-L47)
- [user.entity.ts](file://apps/backend/src/entities/user.entity.ts#L1-L124)
- [role.entity.ts](file://apps/backend/src/entities/role.entity.ts#L1-L133)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L1-L315)
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts#L1-L29)
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L1-L152)
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts#L1-L315)

**Section sources**
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts#L45-L247)
- [users.controller.ts](file://apps/backend/src/modules/users/users.controller.ts#L249-L268)

## Performance Considerations
- Eager loading of roles:
  - User roles are loaded eagerly to avoid N+1 queries and reduce authorization overhead.
- Role lookup complexity:
  - RolesGuard performs a simple set membership check against user roles.
  - PermissionsGuard performs a nested check across user roles’ permissions.
- Token payload size:
  - Roles are included in the JWT payload; keep role lists concise to minimize token size.
- Guard ordering:
  - Applying both RolesGuard and PermissionsGuard ensures early exits for unauthenticated requests and reduces unnecessary permission checks.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- User not authenticated:
  - Guards throw a forbidden error when request.user is missing. Ensure JWT strategy is configured and AuthGuard is applied before guards.
- Insufficient role permissions:
  - RolesGuard throws a forbidden error if the user lacks any required role. Verify the user’s roles and the route’s @Roles declaration.
- Insufficient permissions:
  - PermissionsGuard throws a forbidden error if the user lacks required permissions. Confirm the user’s roles include the required permissions and that the permission enums match the Role definitions.
- Role synchronization after permission changes:
  - After updating a role’s permissions or reassigning roles, ensure the user logs in again so the JWT payload reflects the latest roles. Alternatively, invalidate and regenerate tokens for affected users.
- Active user requirement:
  - AuthService.validateUserPermissions returns false for inactive users. Activate users before expecting access.

**Section sources**
- [roles.guard.ts](file://apps/backend/src/common/guards/roles.guard.ts#L24-L40)
- [permissions.guard.ts](file://apps/backend/src/common/guards/permissions.guard.ts#L29-L46)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L300-L315)

## Conclusion
The ACCU Platform implements a robust RBAC system using NestJS decorators and guards. RolesGuard enforces role-based access by comparing required roles against the user’s roles from the JWT payload, while PermissionsGuard validates permission-based access by delegating to AuthService. The design leverages eager role loading, clear separation of concerns, and explicit guard ordering to provide secure and efficient access control across controllers.