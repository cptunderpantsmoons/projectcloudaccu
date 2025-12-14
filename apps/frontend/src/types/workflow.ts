// Workflow Types for Frontend

export interface WorkflowState {
  workflowId: string;
  type: 'accu_application' | 'project' | 'document' | 'calendar';
  status: 'running' | 'completed' | 'failed' | 'terminated' | 'cancelled';
  currentStep: string;
  progress: number;
  startTime: Date;
  closeTime?: Date;
  history: WorkflowHistoryEntry[];
  metadata: Record<string, any>;
}

export interface WorkflowHistoryEntry {
  timestamp: Date;
  action: string;
  status: string;
  performedBy: string;
  notes?: string;
  details?: Record<string, any>;
}

// ACCU Application Workflow Types
export interface AccuApplicationWorkflowState extends WorkflowState {
  type: 'accu_application';
  currentStatus: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'issued';
  submissionDate?: Date;
  reviewStartDate?: Date;
  approvalDate?: Date;
  issuedDate?: Date;
  deadlineDate?: Date;
  reviewerId?: string;
  approverId?: string;
  rejectionReason?: string;
}

// Project Workflow Types
export interface ProjectWorkflowState extends WorkflowState {
  type: 'project';
  currentStatus: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  currentPhase: 'initiation' | 'planning' | 'execution' | 'monitoring' | 'closure';
  milestones: ProjectMilestone[];
  methodology: {
    id: string;
    name: string;
    version: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedDate?: Date;
  };
  progressMetrics: {
    completionPercentage: number;
    tasksCompleted: number;
    tasksTotal: number;
    documentsReviewed: number;
    auditsCompleted: number;
  };
}

export interface ProjectMilestone {
  id: string;
  name: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dependencies: string[];
}

// Document Workflow Types
export interface DocumentWorkflowState extends WorkflowState {
  type: 'document';
  currentStatus: 'draft' | 'review' | 'approved' | 'rejected' | 'archived' | 'published';
  version: number;
  securityScan: {
    status: 'pending' | 'in_progress' | 'passed' | 'failed';
    scanDate?: Date;
    vulnerabilities?: string[];
    scanReport?: string;
  };
  reviewProcess: {
    assignedReviewerId?: string;
    reviewStartDate?: Date;
    reviewDueDate?: Date;
    reviewNotes?: string;
    revisionRequired: boolean;
    revisionNotes?: string;
  };
  approvalProcess: {
    assignedApproverId?: string;
    approvalStartDate?: Date;
    approvalDueDate?: Date;
    approvalNotes?: string;
    approvedBy?: string;
    approvedDate?: Date;
  };
  accessControl: {
    permissions: string[];
    restrictedUsers: string[];
    classificationLevel: 'public' | 'internal' | 'confidential' | 'restricted';
    expiryDate?: Date;
  };
}

// Calendar Workflow Types
export interface CalendarWorkflowState extends WorkflowState {
  type: 'calendar';
  deadlines: CalendarDeadline[];
  externalIntegrations: {
    calendarProviders: Array<{
      provider: 'google' | 'outlook' | 'apple';
      calendarId: string;
      syncEnabled: boolean;
      lastSyncDate?: Date;
      syncErrors: string[];
    }>;
  };
  reports: WorkflowReport[];
}

export interface CalendarDeadline {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedToId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'escalated';
  reminderSchedule: Array<{
    type: 'email' | 'sms' | 'push' | 'in_app';
    timing: number;
    sent: boolean;
    sentDate?: Date;
  }>;
  escalationRules: Array<{
    level: number;
    triggerHours: number;
    targetRole: string;
    targetUserId?: string;
    escalated: boolean;
    escalationDate?: Date;
  }>;
}

export interface WorkflowReport {
  id: string;
  type: 'deadline_summary' | 'overdue_items' | 'team_workload' | 'compliance_report';
  generatedDate: Date;
  generatedBy: string;
  filePath: string;
  parameters: Record<string, any>;
}

// Workflow Metrics
export interface WorkflowMetrics {
  totalWorkflows: number;
  runningWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  terminatedWorkflows: number;
  averageExecutionTime: number;
  workflowTypes: Record<string, number>;
  statusDistribution: Record<string, number>;
}

// Workflow Actions
export interface WorkflowAction {
  name: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface WorkflowActionContext {
  workflowId: string;
  currentState: WorkflowState;
  userId: string;
  userRole: string;
  permissions: string[];
}

// Workflow Configuration
export interface WorkflowConfiguration {
  autoStart: boolean;
  timeoutSettings: {
    reviewTimeoutDays: number;
    approvalTimeoutDays: number;
    issueTimeoutDays: number;
  };
  escalationSettings: {
    enabled: boolean;
    levels: Array<{
      level: number;
      triggerHours: number;
      targetRole: string;
    }>;
  };
  notificationSettings: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    inAppEnabled: boolean;
    reminderSchedule: Record<string, Array<{type: string, timing: number}>>;
  };
}

// Workflow Templates
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: 'accu_application' | 'project' | 'document' | 'calendar';
  steps: WorkflowStep[];
  configuration: WorkflowConfiguration;
  isActive: boolean;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  order: number;
  timeout?: number;
  autoTransition?: boolean;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }>;
  actions?: WorkflowAction[];
}

// Real-time Workflow Updates
export interface WorkflowUpdate {
  workflowId: string;
  type: 'status_change' | 'step_completed' | 'action_performed' | 'error_occurred' | 'timeout_reached';
  timestamp: Date;
  data: Record<string, any>;
  userId?: string;
  userName?: string;
}

// Workflow Analytics
export interface WorkflowAnalytics {
  totalExecutions: number;
  successRate: number;
  averageCompletionTime: number;
  bottlenecks: Array<{
    step: string;
    averageTime: number;
    failureRate: number;
  }>;
  trends: Array<{
    date: Date;
    executions: number;
    successes: number;
    failures: number;
  }>;
}