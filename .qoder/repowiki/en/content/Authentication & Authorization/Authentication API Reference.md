# Authentication API Reference

<cite>
**Referenced Files in This Document**   
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts)
- [auth.module.ts](file://apps/backend/src/modules/auth/auth.module.ts)
- [configuration.ts](file://apps/backend/src/config/configuration.ts)
- [main.ts](file://apps/backend/src/main.ts)
- [http-exception.filter.ts](file://apps/backend/src/common/filters/http-exception.filter.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Request/Response Schemas](#requestresponse-schemas)
4. [Authentication Requirements](#authentication-requirements)
5. [Error Responses](#error-responses)
6. [Client Workflow Examples](#client-workflow-examples)
7. [Rate Limiting](#rate-limiting)
8. [Security Headers](#security-headers)
9. [Swagger Documentation](#swagger-documentation)

## Introduction
The ACCU Platform provides a comprehensive authentication system with RESTful API endpoints for user management and secure access control. This documentation details the authentication endpoints, including login, registration, token refresh, profile management, and password changes. The system implements JWT-based authentication with access and refresh tokens, role-based access control, and comprehensive security measures.

The authentication API follows REST principles and uses standard HTTP status codes for responses. All endpoints are prefixed with `/api/auth` and return consistent JSON responses with a standardized structure that includes success status, data, and timestamp information.

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts)
- [main.ts](file://apps/backend/src/main.ts)

## Authentication Endpoints

### POST /auth/login
Authenticates a user with email and password credentials and returns JWT tokens for subsequent authenticated requests.

**Request**
- Method: POST
- URL: `/api/auth/login`
- Content-Type: application/json

**Request Body Schema**: `LoginDto`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**
- Status: 200 OK
- Content-Type: application/json
- Body: `AuthResponseDto`

**Authentication Required**: No (Public endpoint)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L31-L43)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L5-L20)

### POST /auth/register
Registers a new user account with the provided information.

**Request**
- Method: POST
- URL: `/api/auth/register`
- Content-Type: application/json

**Request Body Schema**: `RegisterDto`
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "roles": ["user"],
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**
- Status: 201 Created
- Content-Type: application/json
- Body: `AuthResponseDto`

**Authentication Required**: No (Public endpoint)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L45-L55)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L22-L74)

### POST /auth/refresh
Refreshes an expired access token using a valid refresh token.

**Request**
- Method: POST
- URL: `/api/auth/refresh`
- Content-Type: application/json

**Request Body Schema**: `RefreshTokenDto`
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**
- Status: 200 OK
- Content-Type: application/json
- Body: `AuthResponseDto`

**Authentication Required**: No (Uses refresh token in request body)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L57-L68)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L76-L83)

### GET /auth/profile
Retrieves the current authenticated user's profile information.

**Request**
- Method: GET
- URL: `/api/auth/profile`
- Headers: `Authorization: Bearer <access_token>`

**Response**
- Status: 200 OK
- Content-Type: application/json
- Body: User profile object (excluding password)

**Authentication Required**: Yes (JWT Bearer token)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L70-L83)

### POST /auth/change-password
Changes the current authenticated user's password.

**Request**
- Method: POST
- URL: `/api/auth/change-password`
- Headers: `Authorization: Bearer <access_token>`
- Content-Type: application/json

**Request Body Schema**: `ChangePasswordDto`
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456!"
}
```

**Response**
- Status: 200 OK
- Content-Type: application/json
- Body: Success message

**Authentication Required**: Yes (JWT Bearer token)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L85-L102)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L85-L101)

### PUT /auth/profile
Updates the current authenticated user's profile information.

**Request**
- Method: PUT
- URL: `/api/auth/profile`
- Headers: `Authorization: Bearer <access_token>`
- Content-Type: application/json

**Request Body Schema**: `UpdateProfileDto`
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+61 400 123 456",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response**
- Status: 200 OK
- Content-Type: application/json
- Body: Updated user profile (excluding password)

**Authentication Required**: Yes (JWT Bearer token)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L104-L117)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L103-L141)

### POST /auth/logout
Logs out the current authenticated user.

**Request**
- Method: POST
- URL: `/api/auth/logout`
- Headers: `Authorization: Bearer <access_token>`

**Response**
- Status: 200 OK
- Content-Type: application/json
- Body: Success message

**Authentication Required**: Yes (JWT Bearer token)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L119-L129)

### GET /auth/validate
Validates the current authentication token and returns user information.

**Request**
- Method: GET
- URL: `/api/auth/validate`
- Headers: `Authorization: Bearer <access_token>`

**Response**
- Status: 200 OK
- Content-Type: application/json
- Body: Validation result with user information

**Authentication Required**: Yes (JWT Bearer token)

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts#L131-L152)

## Request/Response Schemas

### LoginDto
Request schema for user login.

**Properties**
- `email`: User email address (required, valid email format)
- `password`: User password (required, minimum 6 characters)

**Example**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Section sources**
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L5-L20)

### RegisterDto
Request schema for user registration.

**Properties**
- `email`: User email address (required, valid email format)
- `firstName`: User first name (required, minimum 1 character)
- `lastName`: User last name (required, minimum 1 character)
- `password`: User password (required, minimum 8 characters)
- `roles`: Array of role names (optional)
- `tenantId`: Tenant identifier for multi-tenant support (optional)

**Example**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!",
  "roles": ["user"],
  "tenantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Section sources**
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L22-L74)

### RefreshTokenDto
Request schema for token refresh.

**Properties**
- `refreshToken`: Valid refresh token (required)

**Example**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Section sources**
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L76-L83)

### ChangePasswordDto
Request schema for password change.

**Properties**
- `currentPassword`: Current password (required, minimum 6 characters)
- `newPassword`: New password (required, minimum 8 characters)

**Example**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456!"
}
```

**Section sources**
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L85-L101)

### UpdateProfileDto
Request schema for profile update.

**Properties**
- `firstName`: User first name (optional, minimum 1 character)
- `lastName`: User last name (optional, minimum 1 character)
- `phoneNumber`: Phone number (optional)
- `avatar`: Avatar URL (optional)

**Example**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+61 400 123 456",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Section sources**
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L103-L141)

### AuthResponseDto
Response schema for authentication operations.

**Properties**
- `user`: User information object
  - `id`: User identifier
  - `email`: User email
  - `firstName`: User first name
  - `lastName`: User last name
  - `status`: User status
  - `roles`: Array of role objects with id, name, and optional description
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token
- `expiresIn`: Token expiry in milliseconds

**Example**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "active",
    "roles": [
      {
        "id": "1",
        "name": "user",
        "description": "Standard user role"
      }
    ]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900000
}
```

**Section sources**
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts#L152-L190)

## Authentication Requirements
The authentication system implements different security requirements for various endpoints:

**Public Endpoints** (No authentication required):
- POST /auth/login
- POST /auth/register
- POST /auth/refresh

**Protected Endpoints** (JWT Bearer token required):
- GET /auth/profile
- POST /auth/change-password
- PUT /auth/profile
- POST /auth/logout
- GET /auth/validate

The protected endpoints use JWT authentication via the `AuthGuard('jwt')` guard, which validates the Bearer token in the `Authorization` header. The token must be properly signed with the server's secret key and not expired.

The system implements a two-token approach:
- **Access Token**: Short-lived token (15 minutes by default) used for API requests
- **Refresh Token**: Long-lived token (7 days by default) used to obtain new access tokens without requiring user credentials

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts)
- [jwt.strategy.ts](file://apps/backend/src/modules/auth/strategies/jwt.strategy.ts)
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts)

## Error Responses
The authentication API returns standardized error responses with appropriate HTTP status codes and descriptive error codes.

### 401 Unauthorized
Returned when authentication fails or token is invalid.

**Status Code**: 401
**Error Code**: UNAUTHORIZED
**Common Scenarios**:
- Invalid credentials in login
- Expired or invalid JWT token
- Invalid refresh token

**Example Response**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "path": "/api/auth/login",
    "method": "POST"
  }
}
```

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts)
- [http-exception.filter.ts](file://apps/backend/src/common/filters/http-exception.filter.ts)

### 409 Conflict
Returned when a resource conflict occurs.

**Status Code**: 409
**Error Code**: CONFLICT
**Common Scenarios**:
- Attempting to register with an email that already exists

**Example Response**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "path": "/api/auth/register",
    "method": "POST"
  }
}
```

**Section sources**
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L104-L106)
- [http-exception.filter.ts](file://apps/backend/src/common/filters/http-exception.filter.ts)

### 400 Bad Request
Returned when request validation fails.

**Status Code**: 400
**Error Code**: BAD_REQUEST
**Common Scenarios**:
- Invalid current password in change-password operation
- Missing required fields
- Invalid data formats

**Example Response**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Current password is incorrect",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "path": "/api/auth/change-password",
    "method": "POST"
  }
}
```

**Section sources**
- [auth.service.ts](file://apps/backend/src/modules/auth/auth.service.ts#L214-L216)
- [http-exception.filter.ts](file://apps/backend/src/common/filters/http-exception.filter.ts)

### 429 Rate Limit Exceeded
Returned when rate limiting is triggered.

**Status Code**: 429
**Error Code**: RATE_LIMIT_EXCEEDED
**Common Scenarios**:
- Too many authentication attempts from the same IP address
- Excessive API requests within the rate limit window

**Example Response**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "timestamp": "2023-12-07T10:30:00.000Z",
    "path": "/api/auth/login",
    "method": "POST"
  }
}
```

**Section sources**
- [http-exception.filter.ts](file://apps/backend/src/common/filters/http-exception.filter.ts)
- [configuration.ts](file://apps/backend/src/config/configuration.ts)

## Client Workflow Examples

### Login Workflow
```bash
curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Expected Response**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "status": "active",
      "roles": [
        {
          "id": "1",
          "name": "user",
          "description": "Standard user role"
        }
      ]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900000
  },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

### Registration Workflow
```bash
curl -X POST "http://localhost:4000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "password": "SecurePassword123!"
  }'
```

### Token Refresh Workflow
```bash
curl -X POST "http://localhost:4000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Profile Update Workflow
```bash
curl -X PUT "http://localhost:4000/api/auth/profile" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+61 400 123 456"
  }'
```

### Password Change Workflow
```bash
curl -X POST "http://localhost:4000/api/auth/change-password" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldPassword123",
    "newPassword": "newSecurePassword456!"
  }'
```

**Section sources**
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts)

## Rate Limiting
The authentication endpoints implement rate limiting to prevent brute force attacks and abuse.

**Rate Limit Configuration**
- Window: 1 minute (60,000 ms)
- Maximum requests: 100 per window
- Applies to: All authentication endpoints

The rate limiting is configured in the application settings and applies globally to authentication endpoints. Exceeding the rate limit returns a 429 status code with the `RATE_LIMIT_EXCEEDED` error code.

**Configuration Source**
```typescript
rateLimit: {
  ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // 100 requests per minute
}
```

**Section sources**
- [configuration.ts](file://apps/backend/src/config/configuration.ts#L58-L62)
- [http-exception.filter.ts](file://apps/backend/src/common/filters/http-exception.filter.ts)

## Security Headers
The ACCU Platform implements multiple security headers to protect against common web vulnerabilities.

**Implemented Security Headers**
- **Helmet**: Provides comprehensive security header protection
- **CORS**: Configured with specific origin and credential settings
- **Compression**: Reduces response size and mitigates compression-based attacks

**CORS Configuration**
- Allowed origins: Frontend URL and localhost:3000
- Credentials: Enabled
- Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Allowed headers: Content-Type, Authorization

**Security Implementation**
```typescript
app.use(helmet());
app.use(compression());
app.enableCors({
  origin: [
    configService.get('FRONTEND_URL', 'http://localhost:3000'),
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Section sources**
- [main.ts](file://apps/backend/src/main.ts#L18-L32)

## Swagger Documentation
The authentication API is documented using Swagger/OpenAPI annotations for automatic documentation generation.

**Swagger Configuration**
- Documentation endpoint: `/api/docs`
- Title: "ACCU Platform API"
- Description: "Australian Carbon Credit Units Platform API Documentation"
- Version: "1.0"
- Tags: 'auth' for authentication endpoints

**Authentication Documentation**
- Bearer authentication scheme configured with name 'JWT-auth'
- Persistent authorization enabled in Swagger UI

**Controller Annotations**
- `@ApiTags('auth')`: Groups endpoints under the auth tag
- `@ApiOperation()`: Provides summary for each endpoint
- `@ApiResponse()`: Documents response status codes and schemas
- `@ApiBearerAuth('JWT-auth')`: Specifies Bearer token requirement
- `@ApiProperty()`: Documents DTO properties with examples

**Example Controller Annotation**
```typescript
@Post('login')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'User login' })
@ApiResponse({
  status: 200,
  description: 'Login successful',
  type: AuthResponseDto,
})
@ApiResponse({ status: 401, description: 'Invalid credentials' })
async login(@Body() loginDto: LoginDto) {
  // implementation
}
```

**Section sources**
- [main.ts](file://apps/backend/src/main.ts#L57-L90)
- [auth.controller.ts](file://apps/backend/src/modules/auth/auth.controller.ts)
- [dto/index.ts](file://apps/backend/src/modules/auth/dto/index.ts)