// Application Constants
export const APP_NAME = 'ACCU Platform';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Australian Carbon Credit Units platform';

// API Constants
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Authentication Constants
export const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// File Upload Constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Image Upload Constants
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// Notification Constants
export const NOTIFICATION_RETENTION_DAYS = 365;
export const REMINDER_DAYS_BEFORE = [1, 3, 7, 14, 30]; // Days before deadline

// ACCU Constants
export const ACCU_VINTAGE_YEARS = [
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];

export const ACCU_TYPES = [
  'Methodology 1.1 - Solar hot water systems',
  'Methodology 2.1 - Solar photovoltaic systems',
  'Methodology 3.1 - Wind energy generation',
  'Methodology 4.1 - Landfill gas capture',
  'Methodology 5.1 - Energy efficiency',
  'Methodology 6.1 - Forest regeneration',
  'Methodology 7.1 - Soil carbon',
  'Methodology 8.1 - Livestock methane reduction',
  'Methodology 9.1 - Transport efficiency',
  'Methodology 10.1 - Industrial efficiency',
];

// CER (Clean Energy Regulator) Constants
export const CER_API_BASE_URL = 'https://api.cleanenergyregulator.gov.au';
export const CER_MOCK_API = true; // Set to false when real CER API is available

// Project Statuses
export const PROJECT_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  AUDITOR: 'auditor',
  VIEWER: 'viewer',
  GUEST: 'guest',
} as const;

// Document Categories
export const DOCUMENT_CATEGORIES = {
  METHODOLOGY: 'methodology',
  AUDIT_REPORT: 'audit_report',
  COMPLIANCE_DOCUMENT: 'compliance_document',
  EVIDENCE: 'evidence',
  CORRESPONDENCE: 'correspondence',
  OTHER: 'other',
} as const;

// Event Types
export const EVENT_TYPES = {
  DEADLINE: 'deadline',
  MEETING: 'meeting',
  AUDIT: 'audit',
  REVIEW: 'review',
  SUBMISSION: 'submission',
  REMINDER: 'reminder',
  CUSTOM: 'custom',
} as const;

// Communication Types
export const COMMUNICATION_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  MEETING: 'meeting',
  LETTER: 'letter',
  CER_NOTICE: 'cer_notice',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
  REMINDER: 'reminder',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// Audit Finding Types
export const AUDIT_FINDING_TYPES = {
  OBSERVATION: 'observation',
  MINOR: 'minor',
  MAJOR: 'major',
  CRITICAL: 'critical',
  CLOSED: 'closed',
} as const;

// ACCU Application Statuses
export const ACCU_APPLICATION_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ISSUED: 'issued',
} as const;

// ACCU Inventory Statuses
export const ACCU_INVENTORY_STATUSES = {
  HELD: 'held',
  TRADED: 'traded',
  RETIRED: 'retired',
  RESERVED: 'reserved',
} as const;

// Redis Keys
export const REDIS_KEYS = {
  USER_SESSION: 'user:session:',
  REFRESH_TOKEN: 'auth:refresh:',
  RATE_LIMIT: 'rate:limit:',
  EMAIL_VERIFICATION: 'email:verify:',
  PASSWORD_RESET: 'password:reset:',
  CACHE_PREFIX: 'cache:',
} as const;

// Database Table Names
export const TABLES = {
  USERS: 'users',
  ROLES: 'roles',
  USER_ROLES: 'user_roles',
  PROJECTS: 'projects',
  DOCUMENTS: 'documents',
  CALENDAR_EVENTS: 'calendar_events',
  ACCU_APPLICATIONS: 'accu_applications',
  ACCU_INVENTORY: 'accu_inventory',
  AUDITS: 'audits',
  AUDIT_FINDINGS: 'audit_findings',
  COMMUNICATIONS: 'communications',
  NOTIFICATIONS: 'notifications',
  FILE_UPLOADS: 'file_uploads',
  AUDIT_LOGS: 'audit_logs',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

// Feature Flags (for gradual rollout)
export const FEATURE_FLAGS = {
  ENABLE_WORKFLOW_ENGINE: false,
  ENABLE_REAL_TIME_NOTIFICATIONS: true,
  ENABLE_CER_API_INTEGRATION: false,
  ENABLE_ANALYTICS: false,
  ENABLE_MOBILE_APP: false,
  ENABLE_ADVANCED_SEARCH: false,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_EXPORT_FEATURES: true,
} as const;

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

// Cache Settings
export const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 2 * 60 * 60, // 2 hours
  VERY_LONG: 24 * 60 * 60, // 24 hours
} as const;