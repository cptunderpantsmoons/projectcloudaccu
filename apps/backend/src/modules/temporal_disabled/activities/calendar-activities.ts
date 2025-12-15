import { proxyActivities } from '@temporalio/workflow';

export interface CalendarActivities {
  createDeadline(projectId: string, title: string, description: string, dueDate: Date, priority: string, assignedToId?: string): Promise<string>;
  scheduleReminder(eventId: string, reminderType: string, reminderTime: Date, message: string): Promise<void>;
  updateDeadlineStatus(eventId: string, status: string, completedBy?: string): Promise<void>;
  syncExternalCalendar(userId: string, calendarProvider: string, calendarId: string): Promise<void>;
  createRecurringDeadline(projectId: string, title: string, description: string, recurringPattern: any, assignedToId?: string): Promise<string>;
  escalateOverdueDeadline(eventId: string, escalationLevel: number): Promise<void>;
  generateDeadlineReport(projectId: string, reportType: string, dateRange: any): Promise<string>;
}

export const { 
  createDeadline, 
  scheduleReminder, 
  updateDeadlineStatus, 
  syncExternalCalendar, 
  createRecurringDeadline, 
  escalateOverdueDeadline, 
  generateDeadlineReport 
} = proxyActivities<CalendarActivities>({
  startToCloseTimeout: '1 minute',
});