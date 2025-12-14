import { 
  proxyActivities, 
  defineSignal, 
  setHandler, 
  sleep, 
  condition,
  defineQuery,
  ChildWorkflow 
} from '@temporalio/workflow';

import type { 
  DatabaseActivities,
  NotificationActivities,
  EmailActivities 
} from '../../activities/database-activities';
import type { CalendarActivities } from '../../activities/calendar-activities';

// Define activity interfaces
const { 
  updateCalendarEvent, 
  logWorkflowEvent, 
  createWorkflowHistoryEntry,
  updateUserRole 
} = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: '2 minutes',
});

const { 
  sendEmail, 
  sendSMS, 
  sendPushNotification, 
  createInAppNotification,
  scheduleReminder 
} = proxyActivities<NotificationActivities>({
  startToCloseTimeout: '1 minute',
});

const { 
  sendProjectDeadlineReminder,
  sendWorkflowAlert 
} = proxyActivities<EmailActivities>({
  startToCloseTimeout: '2 minutes',
});

const { 
  createDeadline, 
  scheduleReminder: scheduleCalendarReminder, 
  updateDeadlineStatus, 
  syncExternalCalendar,
  createRecurringDeadline,
  escalateOverdueDeadline,
  generateDeadlineReport 
} = proxyActivities<CalendarActivities>({
  startToCloseTimeout: '1 minute',
});

// Workflow state
export interface CalendarWorkflowState {
  workflowId: string;
  type: 'deadline_management' | 'reminder_scheduling' | 'escalation' | 'external_sync' | 'recurring';
  entityType: string; // 'project', 'accu_application', 'document'
  entityId: string;
  currentStatus: 'active' | 'paused' | 'completed' | 'cancelled';
  deadlines: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedToId?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'escalated';
    reminderSchedule: Array<{
      type: 'email' | 'sms' | 'push' | 'in_app';
      timing: number; // hours before due date
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
  }>;
  externalIntegrations: {
    calendarProviders: Array<{
      provider: 'google' | 'outlook' | 'apple';
      calendarId: string;
      syncEnabled: boolean;
      lastSyncDate?: Date;
      syncErrors: string[];
    }>;
  };
  reports: Array<{
    id: string;
    type: 'deadline_summary' | 'overdue_items' | 'team_workload' | 'compliance_report';
    generatedDate: Date;
    generatedBy: string;
    filePath: string;
    parameters: Record<string, any>;
  }>;
  history: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    details: Record<string, any>;
  }>;
}

// Define signals
export const createDeadlineWorkflow = defineSignal<[string, string, Date, string, string?]>('createDeadlineWorkflow');
export const scheduleReminders = defineSignal<[string, Array<{type: string, timing: number}>, string]>('scheduleReminders');
export const addEscalationRule = defineSignal<[number, number, string, string?]>('addEscalationRule');
export const syncExternalCalendars = defineSignal<[Array<{provider: string, calendarId: string}>, string]>('syncExternalCalendars');
export const generateReport = defineSignal<[string, string, Record<string, any>, string]>('generateReport');
export const completeDeadline = defineSignal<[string, string]>('completeDeadline');
export const snoozeDeadline = defineSignal<[string, number, string]>('snoozeDeadline');
export const pauseWorkflow = defineSignal<[string]>('pauseWorkflow');
export const resumeWorkflow = defineSignal<[string]>('resumeWorkflow');
export const cancelWorkflow = defineSignal<[string, string]>('cancelWorkflow');

// Define queries
export const getCalendarWorkflowState = defineQuery<CalendarWorkflowState>('getCalendarWorkflowState');
export const getDeadlines = defineQuery<CalendarWorkflowState['deadlines']>('getDeadlines');
export const getOverdueDeadlines = defineQuery<CalendarWorkflowState['deadlines']>('getOverdueDeadlines');
export const getUpcomingDeadlines = defineQuery<CalendarWorkflowState['deadlines']>('getUpcomingDeadlines');
export const getExternalCalendarStatus = defineQuery<CalendarWorkflowState['externalIntegrations']>('getExternalCalendarStatus');

// Constants
const REMINDER_SCHEDULE = {
  CRITICAL: [
    { type: 'email', timing: 168 }, // 1 week before
    { type: 'email', timing: 72 },  // 3 days before
    { type: 'email', timing: 24 },  // 1 day before
    { type: 'sms', timing: 4 },     // 4 hours before
    { type: 'push', timing: 1 },    // 1 hour before
  ],
  HIGH: [
    { type: 'email', timing: 72 },  // 3 days before
    { type: 'email', timing: 24 },  // 1 day before
    { type: 'push', timing: 2 },    // 2 hours before
  ],
  MEDIUM: [
    { type: 'email', timing: 24 },  // 1 day before
    { type: 'in_app', timing: 4 },  // 4 hours before
  ],
  LOW: [
    { type: 'email', timing: 8 },   // 8 hours before
    { type: 'in_app', timing: 2 },  // 2 hours before
  ],
};

const ESCALATION_RULES = {
  CRITICAL: [
    { level: 1, triggerHours: 2, targetRole: 'team_lead' },
    { level: 2, triggerHours: 4, targetRole: 'project_manager' },
    { level: 3, triggerHours: 8, targetRole: 'department_head' },
  ],
  HIGH: [
    { level: 1, triggerHours: 8, targetRole: 'team_lead' },
    { level: 2, triggerHours: 24, targetRole: 'project_manager' },
  ],
  MEDIUM: [
    { level: 1, triggerHours: 24, targetRole: 'team_lead' },
  ],
  LOW: [
    { level: 1, triggerHours: 48, targetRole: 'team_lead' },
  ],
};

export async function CalendarWorkflow(input: {
  workflowId: string;
  type: 'deadline_management' | 'reminder_scheduling' | 'escalation' | 'external_sync' | 'recurring';
  entityType: string;
  entityId: string;
  ownerId: string;
  initialDeadlines?: Array<{
    title: string;
    description: string;
    dueDate: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedToId?: string;
  }>;
}): Promise<void> {
  
  // Initialize workflow state
  let state: CalendarWorkflowState = {
    workflowId: input.workflowId,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    currentStatus: 'active',
    deadlines: input.initialDeadlines?.map(deadline => ({
      id: `deadline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: deadline.title,
      description: deadline.description,
      dueDate: deadline.dueDate,
      priority: deadline.priority,
      assignedToId: deadline.assignedToId,
      status: 'pending',
      reminderSchedule: REMINDER_SCHEDULE[deadline.priority]?.map(reminder => ({
        ...reminder,
        sent: false,
      })) || [],
      escalationRules: ESCALATION_RULES[deadline.priority]?.map(rule => ({
        ...rule,
        escalated: false,
      })) || [],
    })) || [],
    externalIntegrations: {
      calendarProviders: [],
    },
    reports: [],
    history: [{
      timestamp: new Date(),
      action: 'workflow_started',
      performedBy: input.ownerId,
      details: {
        workflowId: input.workflowId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    }],
  };

  // Set up signal handlers
  setHandler(createDeadlineWorkflow, async (
    creatorId: string,
    title: string,
    dueDate: Date,
    priority: string,
    assignedToId?: string
  ) => {
    const deadlineId = `deadline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newDeadline = {
      id: deadlineId,
      title,
      description: '',
      dueDate,
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      assignedToId,
      status: 'pending' as const,
      reminderSchedule: REMINDER_SCHEDULE[priority]?.map(reminder => ({
        ...reminder,
        sent: false,
      })) || [],
      escalationRules: ESCALATION_RULES[priority]?.map(rule => ({
        ...rule,
        escalated: false,
      })) || [],
    };
    
    state.deadlines.push(newDeadline);
    
    // Create deadline in calendar system
    const calendarEventId = await createDeadline(
      input.entityId,
      title,
      `Deadline for ${input.entityType} ${input.entityId}`,
      dueDate,
      priority,
      assignedToId
    );
    
    await createWorkflowHistoryEntry(input.workflowId, 'deadline_created', 'success', {
      deadlineId,
      calendarEventId,
      title,
      dueDate,
      priority,
      assignedToId,
      createdBy: creatorId,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'deadline_created',
      performedBy: creatorId,
      details: {
        deadlineId,
        title,
        dueDate,
        priority,
        assignedToId,
      },
    });
    
    // Start monitoring this deadline
    await monitorDeadline(newDeadline);
  });

  setHandler(scheduleReminders, async (
    deadlineId: string,
    reminderSchedule: Array<{type: string, timing: number}>,
    schedulerId: string
  ) => {
    const deadline = state.deadlines.find(d => d.id === deadlineId);
    if (!deadline) {
      throw new Error(`Deadline ${deadlineId} not found`);
    }
    
    deadline.reminderSchedule = reminderSchedule.map(reminder => ({
      ...reminder,
      sent: false,
    }));
    
    await createWorkflowHistoryEntry(input.workflowId, 'reminders_scheduled', 'success', {
      deadlineId,
      reminderSchedule,
      scheduledBy: schedulerId,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'reminders_scheduled',
      performedBy: schedulerId,
      details: {
        deadlineId,
        reminderSchedule,
      },
    });
  });

  setHandler(addEscalationRule, async (
    level: number,
    triggerHours: number,
    targetRole: string,
    targetUserId?: string
  ) => {
    // Add escalation rule to all active deadlines
    for (const deadline of state.deadlines) {
      if (deadline.status === 'pending' || deadline.status === 'overdue') {
        deadline.escalationRules.push({
          level,
          triggerHours,
          targetRole,
          targetUserId,
          escalated: false,
        });
      }
    }
    
    await createWorkflowHistoryEntry(input.workflowId, 'escalation_rules_added', 'success', {
      level,
      triggerHours,
      targetRole,
      targetUserId,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'escalation_rules_added',
      performedBy: 'system',
      details: {
        level,
        triggerHours,
        targetRole,
        targetUserId,
      },
    });
  });

  setHandler(syncExternalCalendars, async (
    calendarConfigs: Array<{provider: string, calendarId: string}>,
    syncInitiatorId: string
  ) => {
    // Update external calendar configurations
    for (const config of calendarConfigs) {
      const existingConfig = state.externalIntegrations.calendarProviders.find(
        cp => cp.provider === config.provider && cp.calendarId === config.calendarId
      );
      
      if (existingConfig) {
        existingConfig.syncEnabled = true;
      } else {
        state.externalIntegrations.calendarProviders.push({
          provider: config.provider as 'google' | 'outlook' | 'apple',
          calendarId: config.calendarId,
          syncEnabled: true,
          syncErrors: [],
        });
      }
      
      // Perform sync
      try {
        await syncExternalCalendar(
          input.entityId,
          config.provider,
          config.calendarId
        );
        
        const providerConfig = state.externalIntegrations.calendarProviders.find(
          cp => cp.provider === config.provider && cp.calendarId === config.calendarId
        );
        if (providerConfig) {
          providerConfig.lastSyncDate = new Date();
          providerConfig.syncErrors = [];
        }
        
      } catch (error) {
        const providerConfig = state.externalIntegrations.calendarProviders.find(
          cp => cp.provider === config.provider && cp.calendarId === config.calendarId
        );
        if (providerConfig) {
          providerConfig.syncErrors.push(error.message);
        }
        
        await logWorkflowEvent(input.workflowId, 'external_sync_error', {
          provider: config.provider,
          calendarId: config.calendarId,
          error: error.message,
        });
      }
    }
    
    await createWorkflowHistoryEntry(input.workflowId, 'external_calendars_synced', 'success', {
      calendarConfigs,
      syncedBy: syncInitiatorId,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'external_calendars_synced',
      performedBy: syncInitiatorId,
      details: {
        calendarConfigs,
      },
    });
  });

  setHandler(generateReport, async (
    reportType: string,
    dateRange: Record<string, any>,
    parameters: Record<string, any>,
    generatorId: string
  ) => {
    try {
      const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const reportPath = await generateDeadlineReport(
        input.entityId,
        reportType,
        dateRange
      );
      
      const report = {
        id: reportId,
        type: reportType as 'deadline_summary' | 'overdue_items' | 'team_workload' | 'compliance_report',
        generatedDate: new Date(),
        generatedBy: generatorId,
        filePath: reportPath,
        parameters,
      };
      
      state.reports.push(report);
      
      await createWorkflowHistoryEntry(input.workflowId, 'report_generated', 'success', {
        reportId,
        reportType,
        generatedBy: generatorId,
        filePath: reportPath,
      });
      
      state.history.push({
        timestamp: new Date(),
        action: 'report_generated',
        performedBy: generatorId,
        details: {
          reportId,
          reportType,
          filePath: reportPath,
        },
      });
      
    } catch (error) {
      await logWorkflowEvent(input.workflowId, 'report_generation_error', {
        reportType,
        error: error.message,
        generatedBy: generatorId,
      });
      throw error;
    }
  });

  setHandler(completeDeadline, async (deadlineId: string, completedBy: string) => {
    const deadline = state.deadlines.find(d => d.id === deadlineId);
    if (!deadline) {
      throw new Error(`Deadline ${deadlineId} not found`);
    }
    
    deadline.status = 'completed';
    
    await updateDeadlineStatus(deadlineId, 'completed', completedBy);
    
    await createWorkflowHistoryEntry(input.workflowId, 'deadline_completed', 'success', {
      deadlineId,
      completedBy,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'deadline_completed',
      performedBy: completedBy,
      details: {
        deadlineId,
        title: deadline.title,
      },
    });
    
    // Send completion notification
    if (deadline.assignedToId) {
      await createInAppNotification(
        deadline.assignedToId,
        'Deadline Completed',
        `You have successfully completed: ${deadline.title}`,
        'deadline_completed',
        { deadlineId, entityType: input.entityType, entityId: input.entityId }
      );
    }
  });

  setHandler(snoozeDeadline, async (deadlineId: string, snoozeHours: number, snoozerId: string) => {
    const deadline = state.deadlines.find(d => d.id === deadlineId);
    if (!deadline) {
      throw new Error(`Deadline ${deadlineId} not found`);
    }
    
    const snoozeDate = new Date();
    snoozeDate.setHours(snoozeDate.getHours() + snoozeHours);
    deadline.dueDate = snoozeDate;
    
    // Update reminder schedule
    deadline.reminderSchedule.forEach(reminder => {
      reminder.sent = false; // Reset reminders
    });
    
    await updateCalendarEvent(deadlineId, {
      dueDate: snoozeDate,
      snoozed: true,
      snoozedBy: snoozerId,
      snoozedUntil: snoozeDate,
    });
    
    await createWorkflowHistoryEntry(input.workflowId, 'deadline_snoozed', 'success', {
      deadlineId,
      snoozeHours,
      snoozedBy: snoozerId,
      newDueDate: snoozeDate,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'deadline_snoozed',
      performedBy: snoozerId,
      details: {
        deadlineId,
        snoozeHours,
        newDueDate: snoozeDate,
      },
    });
  });

  setHandler(pauseWorkflow, async (pauserId: string) => {
    state.currentStatus = 'paused';
    
    await createWorkflowHistoryEntry(input.workflowId, 'workflow_paused', 'success', {
      pausedBy: pauserId,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'workflow_paused',
      performedBy: pauserId,
      details: {},
    });
  });

  setHandler(resumeWorkflow, async (resumerId: string) => {
    state.currentStatus = 'active';
    
    await createWorkflowHistoryEntry(input.workflowId, 'workflow_resumed', 'success', {
      resumedBy: resumerId,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'workflow_resumed',
      performedBy: resumerId,
      details: {},
    });
  });

  setHandler(cancelWorkflow, async (cancelerId: string, reason: string) => {
    state.currentStatus = 'cancelled';
    
    await createWorkflowHistoryEntry(input.workflowId, 'workflow_cancelled', 'success', {
      cancelledBy: cancelerId,
      reason: reason,
    });
    
    state.history.push({
      timestamp: new Date(),
      action: 'workflow_cancelled',
      performedBy: cancelerId,
      details: { reason: reason },
    });
  });

  // Query handlers
  setHandler(getCalendarWorkflowState, () => state);
  setHandler(getDeadlines, () => state.deadlines);
  setHandler(getOverdueDeadlines, () => state.deadlines.filter(d => d.status === 'overdue'));
  setHandler(getUpcomingDeadlines, () => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return state.deadlines.filter(d => d.dueDate > now && d.dueDate <= nextWeek && d.status === 'pending');
  });
  setHandler(getExternalCalendarStatus, () => state.externalIntegrations);

  // Main workflow logic
  try {
    // Monitor deadlines and send reminders
    while (state.currentStatus === 'active') {
      await sleep(30 * 60 * 1000); // Check every 30 minutes
      
      const now = new Date();
      
      for (const deadline of state.deadlines) {
        if (deadline.status === 'completed' || deadline.status === 'cancelled') {
          continue;
        }
        
        // Check if deadline is overdue
        if (deadline.dueDate < now && deadline.status !== 'overdue') {
          deadline.status = 'overdue';
          
          await createWorkflowHistoryEntry(input.workflowId, 'deadline_overdue', 'warning', {
            deadlineId: deadline.id,
            overdueBy: Math.floor((now.getTime() - deadline.dueDate.getTime()) / (1000 * 60 * 60)),
          });
          
          // Send overdue notification
          if (deadline.assignedToId) {
            await sendEmail(
              deadline.assignedToId,
              `OVERDUE: ${deadline.title}`,
              `The deadline "${deadline.title}" is now overdue by ${Math.floor((now.getTime() - deadline.dueDate.getTime()) / (1000 * 60 * 60))} hours.`,
              'deadline_overdue_template',
              { deadlineId: deadline.id, entityType: input.entityType, entityId: input.entityId }
            );
            
            await createInAppNotification(
              deadline.assignedToId,
              'Deadline Overdue',
              `Deadline "${deadline.title}" is overdue`,
              'deadline_overdue',
              { deadlineId: deadline.id, overdueHours: Math.floor((now.getTime() - deadline.dueDate.getTime()) / (1000 * 60 * 60)) }
            );
          }
          
          // Start escalation process
          await startEscalation(deadline);
        }
        
        // Check and send reminders
        await checkAndSendReminders(deadline, now);
      }
      
      // Sync external calendars if configured
      if (state.externalIntegrations.calendarProviders.length > 0) {
        await syncExternalCalendarsIfNeeded();
      }
    }
    
  } catch (error) {
    await logWorkflowEvent(input.workflowId, 'calendar_workflow_error', {
      error: error.message,
      currentState: state.currentStatus,
    });
    throw error;
  }

  // Helper functions
  async function monitorDeadline(deadline: CalendarWorkflowState['deadlines'][0]) {
    // This function can be called to set up specific monitoring for a deadline
    // For now, the main loop handles all monitoring
  }

  async function checkAndSendReminders(deadline: CalendarWorkflowState['deadlines'][0], now: Date) {
    for (const reminder of deadline.reminderSchedule) {
      if (reminder.sent) continue;
      
      const reminderTime = new Date(deadline.dueDate);
      reminderTime.setHours(reminderTime.getHours() - reminder.timing);
      
      if (now >= reminderTime) {
        // Send reminder
        if (deadline.assignedToId) {
          switch (reminder.type) {
            case 'email':
              await sendEmail(
                deadline.assignedToId,
                `Reminder: ${deadline.title}`,
                `This is a reminder that "${deadline.title}" is due in ${reminder.timing} hours.`,
                'deadline_reminder_template',
                { deadlineId: deadline.id, hoursUntilDue: reminder.timing }
              );
              break;
              
            case 'sms':
              await sendSMS(
                deadline.assignedToId, // This should be phone number
                `Reminder: "${deadline.title}" due in ${reminder.timing} hours.`
              );
              break;
              
            case 'push':
              await sendPushNotification(
                deadline.assignedToId,
                'Deadline Reminder',
                `"${deadline.title}" is due in ${reminder.timing} hours`,
                { deadlineId: deadline.id, entityType: input.entityType, entityId: input.entityId }
              );
              break;
              
            case 'in_app':
              await createInAppNotification(
                deadline.assignedToId,
                'Deadline Reminder',
                `"${deadline.title}" is due in ${reminder.timing} hours`,
                'deadline_reminder',
                { deadlineId: deadline.id, hoursUntilDue: reminder.timing }
              );
              break;
          }
        }
        
        reminder.sent = true;
        reminder.sentDate = new Date();
        
        await createWorkflowHistoryEntry(input.workflowId, 'reminder_sent', 'success', {
          deadlineId: deadline.id,
          reminderType: reminder.type,
          reminderTiming: reminder.timing,
        });
      }
    }
  }

  async function startEscalation(deadline: CalendarWorkflowState['deadlines'][0]) {
    for (const escalation of deadline.escalationRules) {
      if (escalation.escalated) continue;
      
      const escalationTime = new Date(deadline.dueDate);
      escalationTime.setHours(escalationTime.getHours() + escalation.triggerHours);
      
      if (new Date() >= escalationTime) {
        // Trigger escalation
        await escalateOverdueDeadline(deadline.id, escalation.level);
        
        escalation.escalated = true;
        escalation.escalationDate = new Date();
        
        // Update user role/permissions if needed
        if (escalation.targetUserId) {
          await updateUserRole(escalation.targetUserId, escalation.targetRole);
        }
        
        await createWorkflowHistoryEntry(input.workflowId, 'escalation_triggered', 'warning', {
          deadlineId: deadline.id,
          escalationLevel: escalation.level,
          targetRole: escalation.targetRole,
          targetUserId: escalation.targetUserId,
        });
      }
    }
  }

  async function syncExternalCalendarsIfNeeded() {
    const now = new Date();
    
    for (const provider of state.externalIntegrations.calendarProviders) {
      if (!provider.syncEnabled) continue;
      
      // Check if sync is needed (every 4 hours)
      if (provider.lastSyncDate && 
          (now.getTime() - provider.lastSyncDate.getTime()) < (4 * 60 * 60 * 1000)) {
        continue;
      }
      
      try {
        await syncExternalCalendar(input.entityId, provider.provider, provider.calendarId);
        provider.lastSyncDate = now;
        provider.syncErrors = [];
        
        await createWorkflowHistoryEntry(input.workflowId, 'external_sync_completed', 'success', {
          provider: provider.provider,
          calendarId: provider.calendarId,
        });
        
      } catch (error) {
        provider.syncErrors.push(error.message);
        
        await logWorkflowEvent(input.workflowId, 'external_sync_failed', {
          provider: provider.provider,
          calendarId: provider.calendarId,
          error: error.message,
        });
      }
    }
  }
}