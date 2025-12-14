import { z } from 'zod';

// Base Types
export const UUID = z.string().uuid();
export type UUID = z.infer<typeof UUID>;

export const Email = z.string().email();
export type Email = z.infer<typeof Email>;

export const Password = z.string().min(8);
export type Password = z.infer<typeof Password>;

export const DateTime = z.string().datetime();
export type DateTime = z.infer<typeof DateTime>;

// User & Authentication Types
export const UserStatus = z.enum(['active', 'inactive', 'suspended', 'pending']);
export type UserStatus = z.infer<typeof UserStatus>;

export const UserRole = z.enum([
  'super_admin',
  'admin',
  'manager',
  'user',
  'auditor',
  'viewer',
  'guest'
]);
export type UserRole = z.infer<typeof UserRole>;

export const User = z.object({
  id: UUID,
  email: Email,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  status: UserStatus,
  roles: z.array(UserRole),
  lastLoginAt: DateTime.optional(),
  createdAt: DateTime,
  updatedAt: DateTime,
  tenantId: UUID.optional(),
});
export type User = z.infer<typeof User>;

export const CreateUserRequest = z.object({
  email: Email,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: Password,
  roles: z.array(UserRole).default(['user']),
  tenantId: UUID.optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequest>;

export const LoginRequest = z.object({
  email: Email,
  password: Password,
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof AuthTokens>;

// Permission & RBAC Types
export const Permission = z.enum([
  'users.read',
  'users.write',
  'users.delete',
  'roles.read',
  'roles.write',
  'documents.read',
  'documents.write',
  'documents.delete',
  'projects.read',
  'projects.write',
  'projects.delete',
  'audits.read',
  'audits.write',
  'audits.delete',
  'accu_applications.read',
  'accu_applications.write',
  'accu_inventory.read',
  'accu_inventory.write',
  'reports.read',
  'reports.write',
  'notifications.read',
  'notifications.write',
  'settings.read',
  'settings.write',
]);
export type Permission = z.infer<typeof Permission>;

export const Role = z.object({
  id: UUID,
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(Permission),
  isSystemRole: z.boolean().default(false),
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type Role = z.infer<typeof Role>;

// Project Types
export const ProjectStatus = z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const ProjectType = z.enum(['methodology', 'audit', 'compliance', 'research']);
export type ProjectType = z.infer<typeof ProjectType>;

export const Project = z.object({
  id: UUID,
  name: z.string(),
  description: z.string().optional(),
  status: ProjectStatus,
  type: ProjectType,
  startDate: DateTime,
  endDate: DateTime.optional(),
  ownerId: UUID,
  tenantId: UUID.optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type Project = z.infer<typeof Project>;

// Document Types
export const DocumentStatus = z.enum(['draft', 'review', 'approved', 'rejected', 'archived']);
export type DocumentStatus = z.infer<typeof DocumentStatus>;

export const DocumentCategory = z.enum([
  'methodology',
  'audit_report',
  'compliance_document',
  'evidence',
  'correspondence',
  'other'
]);
export type DocumentCategory = z.infer<typeof DocumentCategory>;

export const Document = z.object({
  id: UUID,
  name: z.string(),
  description: z.string().optional(),
  category: DocumentCategory,
  status: DocumentStatus,
  version: z.number(),
  fileUrl: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  projectId: UUID.optional(),
  uploadedById: UUID,
  metadata: z.record(z.any()).optional(),
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type Document = z.infer<typeof Document>;

// Calendar & Deadline Types
export const EventType = z.enum([
  'deadline',
  'meeting',
  'audit',
  'review',
  'submission',
  'reminder',
  'custom'
]);
export type EventType = z.infer<typeof EventType>;

export const Priority = z.enum(['low', 'medium', 'high', 'critical']);
export type Priority = z.infer<typeof Priority>;

export const CalendarEvent = z.object({
  id: UUID,
  title: z.string(),
  description: z.string().optional(),
  type: EventType,
  priority: Priority,
  startDate: DateTime,
  endDate: DateTime,
  isAllDay: z.boolean().default(false),
  recurrenceRule: z.string().optional(), // RFC 5545 RRULE
  projectId: UUID.optional(),
  assignedToId: z.array(UUID),
  reminders: z.array(z.number()).default([1, 7, 30]), // Days before
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type CalendarEvent = z.infer<typeof CalendarEvent>;

// ACCU Types
export const ACCUStatus = z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'issued']);
export type ACCUStatus = z.infer<typeof ACCUStatus>;

export const ACCUApplication = z.object({
  id: UUID,
  projectId: UUID,
  status: ACCUStatus,
  submissionDate: DateTime.optional(),
  approvalDate: DateTime.optional(),
  issuedDate: DateTime.optional(),
  accuUnits: z.number(),
  methodologyId: z.string(),
  serReference: z.string().optional(), // SER Reference number
  applicationData: z.record(z.any()),
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type ACCUApplication = z.infer<typeof ACCUApplication>;

export const ACCUInventoryItem = z.object({
  id: UUID,
  projectId: UUID,
  accuType: z.string(),
  quantity: z.number(),
  availableQuantity: z.number(),
  vintage: z.number(),
  status: z.enum(['held', 'traded', 'retired', 'reserved']),
  certificateUrl: z.string().optional(),
  acquisitionDate: DateTime,
  acquisitionCost: z.number().optional(),
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type ACCUInventoryItem = z.infer<typeof ACCUInventoryItem>;

// Audit Types
export const AuditStatus = z.enum(['planned', 'in_progress', 'completed', 'cancelled']);
export type AuditStatus = z.infer<typeof AuditStatus>;

export const AuditFinding = z.enum(['observation', 'minor', 'major', 'critical', 'closed']);
export type AuditFinding = z.infer<typeof AuditFinding>;

export const Audit = z.object({
  id: UUID,
  projectId: UUID,
  title: z.string(),
  description: z.string().optional(),
  status: AuditStatus,
  startDate: DateTime,
  endDate: DateTime.optional(),
  leadAuditorId: UUID,
  auditTeam: z.array(UUID),
  scope: z.string(),
  methodology: z.string(),
  findings: z.array(z.object({
    id: UUID,
    type: AuditFinding,
    title: z.string(),
    description: z.string(),
    status: AuditFinding,
    assignedToId: UUID.optional(),
    dueDate: DateTime.optional(),
    evidence: z.array(UUID), // Document IDs
    createdAt: DateTime,
    updatedAt: DateTime,
  })),
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type Audit = z.infer<typeof Audit>;

// Communication Types
export const CommunicationType = z.enum(['email', 'phone', 'meeting', 'letter', 'cer_notice']);
export type CommunicationType = z.infer<typeof CommunicationType>;

export const CommunicationStatus = z.enum(['received', 'read', 'replied', 'action_required', 'archived']);
export type CommunicationStatus = z.infer<typeof CommunicationStatus>;

export const Communication = z.object({
  id: UUID,
  type: CommunicationType,
  status: CommunicationStatus,
  subject: z.string(),
  content: z.string(),
  fromAddress: z.string(),
  toAddresses: z.array(z.string()),
  ccAddresses: z.array(z.string()).default([]),
  bccAddresses: z.array(z.string()).default([]),
  receivedAt: DateTime,
  projectId: UUID.optional(),
  relatedDocuments: z.array(UUID).default([]),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileSize: z.number(),
  })).default([]),
  metadata: z.record(z.any()).optional(),
  createdAt: DateTime,
  updatedAt: DateTime,
});
export type Communication = z.infer<typeof Communication>;

// Notification Types
export const NotificationType = z.enum(['info', 'warning', 'error', 'success', 'reminder']);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotificationChannel = z.enum(['in_app', 'email', 'sms', 'webhook']);
export type NotificationChannel = z.infer<typeof NotificationChannel>;

export const Notification = z.object({
  id: UUID,
  type: NotificationType,
  channel: NotificationChannel,
  title: z.string(),
  message: z.string(),
  userId: UUID.optional(),
  tenantId: UUID.optional(),
  projectId: UUID.optional(),
  isRead: z.boolean().default(false),
  readAt: DateTime.optional(),
  metadata: z.record(z.any()).optional(),
  expiresAt: DateTime.optional(),
  createdAt: DateTime,
});
export type Notification = z.infer<typeof Notification>;

// API Response Types
export const ApiResponse<T> = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }).optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }).optional(),
});
export type ApiResponse<T> = z.infer<typeof ApiResponse<T>>;

// Query & Filter Types
export const QueryOptions = z.object({
  page: z.number().default(1),
  limit: z.number().default(50),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  filters: z.record(z.any()).optional(),
});
export type QueryOptions = z.infer<typeof QueryOptions>;

// Export all schemas
export const schemas = {
  UUID,
  Email,
  Password,
  DateTime,
  User,
  CreateUserRequest,
  LoginRequest,
  AuthTokens,
  Role,
  Permission,
  Project,
  Document,
  CalendarEvent,
  ACCUApplication,
  ACCUInventoryItem,
  Audit,
  Communication,
  Notification,
  ApiResponse,
  QueryOptions,
};