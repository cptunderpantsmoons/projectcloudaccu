import { proxyActivities } from '@temporalio/workflow';

export interface DatabaseActivities {
  updateAccuApplicationStatus(id: string, status: string, metadata?: Record<string, any>): Promise<void>;
  updateProjectStatus(id: string, status: string, metadata?: Record<string, any>): Promise<void>;
  updateDocumentStatus(id: string, status: string, metadata?: Record<string, any>): Promise<void>;
  createCalendarEvent(projectId: string, title: string, description: string, dueDate: Date, eventType: string): Promise<string>;
  updateCalendarEvent(id: string, updates: Record<string, any>): Promise<void>;
  logWorkflowEvent(workflowId: string, eventType: string, details: Record<string, any>): Promise<void>;
  createWorkflowHistoryEntry(workflowId: string, step: string, status: string, data?: Record<string, any>): Promise<void>;
  updateUserRole(userId: string, roleId: string, permissions?: string[]): Promise<void>;
  validateBusinessRules(entityType: string, entityId: string, rules: string[]): Promise<boolean>;
}

export const { 
  updateAccuApplicationStatus, 
  updateProjectStatus, 
  updateDocumentStatus, 
  createCalendarEvent, 
  updateCalendarEvent, 
  logWorkflowEvent, 
  createWorkflowHistoryEntry, 
  updateUserRole, 
  validateBusinessRules 
} = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: '2 minutes',
});