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
  updateProjectStatus, 
  createCalendarEvent, 
  logWorkflowEvent, 
  createWorkflowHistoryEntry,
  validateBusinessRules 
} = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: '2 minutes',
});

const { 
  sendEmail, 
  sendPushNotification, 
  createInAppNotification 
} = proxyActivities<NotificationActivities>({
  startToCloseTimeout: '1 minute',
});

const { 
  sendProjectDeadlineReminder 
} = proxyActivities<EmailActivities>({
  startToCloseTimeout: '2 minutes',
});

const { 
  createDeadline, 
  createRecurringDeadline 
} = proxyActivities<CalendarActivities>({
  startToCloseTimeout: '1 minute',
});

// Workflow state
export interface ProjectWorkflowState {
  projectId: string;
  currentStatus: string;
  currentPhase: string;
  milestones: Array<{
    id: string;
    name: string;
    dueDate: Date;
    completedDate?: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue';
    dependencies: string[];
  }>;
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
  deadlines: Array<{
    id: string;
    type: string;
    dueDate: Date;
    status: 'pending' | 'completed' | 'overdue';
    escalated: boolean;
  }>;
  history: Array<{
    timestamp: Date;
    status: string;
    action: string;
    performedBy: string;
    details: Record<string, any>;
  }>;
}

// Define signals
export const startProject = defineSignal<[string]>('startProject');
export const pauseProject = defineSignal<[string]>('pauseProject');
export const resumeProject = defineSignal<[string]>('resumeProject');
export const completeProject = defineSignal<[string, string?]>('completeProject');
export const cancelProject = defineSignal<[string, string]>('cancelProject');
export const addMilestone = defineSignal<[string, string, Date]>('addMilestone');
export const completeMilestone = defineSignal<[string]>('completeMilestone');
export const approveMethodology = defineSignal<[string, string]>('approveMethodology');
export const rejectMethodology = defineSignal<[string, string, string]>('rejectMethodology');
export const updateProgress = defineSignal<[number]>('updateProgress');

// Define queries
export const getProjectState = defineQuery<ProjectWorkflowState>('getProjectState');
export const getCurrentStatus = defineQuery<string>('getCurrentStatus');
export const getMilestones = defineQuery<ProjectWorkflowState['milestones']>('getMilestones');
export const getMethodologyStatus = defineQuery<ProjectWorkflowState['methodology']>('getMethodologyStatus');
export const getProgress = defineQuery<ProjectWorkflowState['progressMetrics']>('getProgress');

// Constants
const ProjectStatuses = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

const ProjectPhases = {
  INITIATION: 'initiation',
  PLANNING: 'planning',
  EXECUTION: 'execution',
  MONITORING: 'monitoring',
  CLOSURE: 'closure',
} as const;

const MILESTONE_REMINDER_DAYS = 3;
const PROGRESS_CHECK_INTERVAL_HOURS = 24;
const PHASE_COMPLETION_TIMEOUT_DAYS = 30;

export async function ProjectWorkflow(input: {
  projectId: string;
  name: string;
  description: string;
  type: string;
  startDate: Date;
  endDate?: Date;
  ownerId: string;
  methodologyId?: string;
  milestones?: Array<{
    name: string;
    dueDate: Date;
    dependencies?: string[];
  }>;
}): Promise<void> {
  
  // Initialize workflow state
  let state: ProjectWorkflowState = {
    projectId: input.projectId,
    currentStatus: ProjectStatuses.DRAFT,
    currentPhase: ProjectPhases.INITIATION,
    milestones: input.milestones?.map((m, index) => ({
      id: `milestone-${index + 1}`,
      name: m.name,
      dueDate: m.dueDate,
      status: 'pending',
      dependencies: m.dependencies || [],
    })) || [],
    methodology: {
      id: input.methodologyId || '',
      name: '',
      version: '',
      status: 'pending',
    },
    progressMetrics: {
      completionPercentage: 0,
      tasksCompleted: 0,
      tasksTotal: 10, // Default, can be updated
      documentsReviewed: 0,
      auditsCompleted: 0,
    },
    deadlines: [],
    history: [{
      timestamp: new Date(),
      status: ProjectStatuses.DRAFT,
      action: 'workflow_started',
      performedBy: input.ownerId,
      details: { projectName: input.name },
    }],
  };

  // Set up signal handlers
  setHandler(startProject, async (initiatorId: string) => {
    if (state.currentStatus !== ProjectStatuses.DRAFT) {
      throw new Error('Project can only be started from draft status');
    }
    
    state.currentStatus = ProjectStatuses.ACTIVE;
    
    // Update project status in database
    await updateProjectStatus(input.projectId, ProjectStatuses.ACTIVE, {
      startDate: new Date(),
      startedBy: initiatorId,
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'started', 'success', {
      initiatorId: initiatorId,
      startDate: new Date(),
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ProjectStatuses.ACTIVE,
      action: 'project_started',
      performedBy: initiatorId,
      details: {},
    });
    
    // Create initial deadlines for milestones
    for (const milestone of state.milestones) {
      const deadlineId = await createDeadline(
        input.projectId,
        `Milestone: ${milestone.name}`,
        `Complete milestone: ${milestone.name}`,
        milestone.dueDate,
        'medium',
        input.ownerId
      );
      
      state.deadlines.push({
        id: deadlineId,
        type: 'milestone',
        dueDate: milestone.dueDate,
        status: 'pending',
        escalated: false,
      });
    }
    
    // Start recurring progress check
    await startProgressMonitoring();
  });

  setHandler(pauseProject, async (pauserId: string) => {
    if (state.currentStatus !== ProjectStatuses.ACTIVE) {
      throw new Error('Project can only be paused when active');
    }
    
    state.currentStatus = ProjectStatuses.ON_HOLD;
    
    await updateProjectStatus(input.projectId, ProjectStatuses.ON_HOLD, {
      pausedBy: pauserId,
      pausedDate: new Date(),
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'paused', 'success', {
      pauserId: pauserId,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ProjectStatuses.ON_HOLD,
      action: 'project_paused',
      performedBy: pauserId,
      details: {},
    });
  });

  setHandler(resumeProject, async (resumerId: string) => {
    if (state.currentStatus !== ProjectStatuses.ON_HOLD) {
      throw new Error('Project can only be resumed when on hold');
    }
    
    state.currentStatus = ProjectStatuses.ACTIVE;
    
    await updateProjectStatus(input.projectId, ProjectStatuses.ACTIVE, {
      resumedBy: resumerId,
      resumedDate: new Date(),
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'resumed', 'success', {
      resumerId: resumerId,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ProjectStatuses.ACTIVE,
      action: 'project_resumed',
      performedBy: resumerId,
      details: {},
    });
  });

  setHandler(completeProject, async (completerId: string, notes?: string) => {
    if (state.currentStatus !== ProjectStatuses.ACTIVE) {
      throw new Error('Project can only be completed when active');
    }
    
    // Validate project completion criteria
      const allMilestonesComplete = state.milestones.every(m => m.status === 'completed');
      const hasMinimumProgress = state.progressMetrics.completionPercentage >= 100;
      
      if (!allMilestonesComplete || !hasMinimumProgress) {
        throw new Error('Project cannot be completed: milestones or progress requirements not met');
      }
    
    state.currentStatus = ProjectStatuses.COMPLETED;
    state.currentPhase = ProjectPhases.CLOSURE;
    
    await updateProjectStatus(input.projectId, ProjectStatuses.COMPLETED, {
      completedBy: completerId,
      completedDate: new Date(),
      completionNotes: notes,
      finalProgress: state.progressMetrics.completionPercentage,
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'completed', 'success', {
      completerId: completerId,
      notes: notes,
      finalProgress: state.progressMetrics.completionPercentage,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ProjectStatuses.COMPLETED,
      action: 'project_completed',
      performedBy: completerId,
      details: { notes: notes },
    });
  });

  setHandler(cancelProject, async (cancelerId: string, reason: string) => {
    if (state.currentStatus === ProjectStatuses.COMPLETED || state.currentStatus === ProjectStatuses.CANCELLED) {
      throw new Error('Completed or cancelled projects cannot be cancelled');
    }
    
    state.currentStatus = ProjectStatuses.CANCELLED;
    
    await updateProjectStatus(input.projectId, ProjectStatuses.CANCELLED, {
      cancelledBy: cancelerId,
      cancelledDate: new Date(),
      cancellationReason: reason,
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'cancelled', 'success', {
      cancelerId: cancelerId,
      reason: reason,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ProjectStatuses.CANCELLED,
      action: 'project_cancelled',
      performedBy: cancelerId,
      details: { reason: reason },
    });
  });

  setHandler(addMilestone, async (adderId: string, milestoneName: string, dueDate: Date) => {
    const newMilestoneId = `milestone-${state.milestones.length + 1}`;
    
    state.milestones.push({
      id: newMilestoneId,
      name: milestoneName,
      dueDate: dueDate,
      status: 'pending',
      dependencies: [],
    });
    
    // Create deadline for new milestone
    const deadlineId = await createDeadline(
      input.projectId,
      `Milestone: ${milestoneName}`,
      `Complete milestone: ${milestoneName}`,
      dueDate,
      'medium',
      input.ownerId
    );
    
    state.deadlines.push({
      id: deadlineId,
      type: 'milestone',
      dueDate: dueDate,
      status: 'pending',
      escalated: false,
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'milestone_added', 'success', {
      milestoneId: newMilestoneId,
      name: milestoneName,
      dueDate: dueDate,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'milestone_added',
      performedBy: adderId,
      details: { milestoneName, dueDate },
    });
  });

  setHandler(completeMilestone, async (milestoneId: string) => {
    const milestone = state.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }
    
    // Check dependencies
    const uncompletedDependencies = milestone.dependencies.filter(depId => {
      const dep = state.milestones.find(m => m.id === depId);
      return !dep || dep.status !== 'completed';
    });
    
    if (uncompletedDependencies.length > 0) {
      throw new Error(`Cannot complete milestone: dependencies not completed: ${uncompletedDependencies.join(', ')}`);
    }
    
    milestone.status = 'completed';
    milestone.completedDate = new Date();
    
    // Update progress
    state.progressMetrics.tasksCompleted += 1;
    state.progressMetrics.completionPercentage = Math.round(
      (state.progressMetrics.tasksCompleted / state.progressMetrics.tasksTotal) * 100
    );
    
    await createWorkflowHistoryEntry(input.projectId, 'milestone_completed', 'success', {
      milestoneId: milestoneId,
      name: milestone.name,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'milestone_completed',
      performedBy: 'system',
      details: { milestoneId, milestoneName: milestone.name },
    });
    
    // Check if all milestones are completed
    if (state.milestones.every(m => m.status === 'completed')) {
      // Auto-transition to closure phase
      await transitionToClosurePhase();
    }
  });

  setHandler(approveMethodology, async (approverId: string, methodologyVersion: string) => {
    if (!state.methodology.id) {
      throw new Error('No methodology assigned to project');
    }
    
    state.methodology.status = 'approved';
    state.methodology.approvedBy = approverId;
    state.methodology.approvedDate = new Date();
    state.methodology.version = methodologyVersion;
    
    await updateProjectStatus(input.projectId, state.currentStatus, {
      methodologyStatus: 'approved',
      methodologyApprovedBy: approverId,
      methodologyApprovedDate: new Date(),
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'methodology_approved', 'success', {
      approverId: approverId,
      version: methodologyVersion,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'methodology_approved',
      performedBy: approverId,
      details: { version: methodologyVersion },
    });
  });

  setHandler(rejectMethodology, async (rejectorId: string, version: string, reason: string) => {
    if (!state.methodology.id) {
      throw new Error('No methodology assigned to project');
    }
    
    state.methodology.status = 'rejected';
    
    await updateProjectStatus(input.projectId, state.currentStatus, {
      methodologyStatus: 'rejected',
      methodologyRejectedBy: rejectorId,
      methodologyRejectedDate: new Date(),
      methodologyRejectionReason: reason,
    });
    
    await createWorkflowHistoryEntry(input.projectId, 'methodology_rejected', 'success', {
      rejectorId: rejectorId,
      version: version,
      reason: reason,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'methodology_rejected',
      performedBy: rejectorId,
      details: { version, reason },
    });
  });

  setHandler(updateProgress, async (newProgress: number) => {
    if (newProgress < 0 || newProgress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
    
    state.progressMetrics.completionPercentage = newProgress;
    state.progressMetrics.tasksCompleted = Math.round((newProgress / 100) * state.progressMetrics.tasksTotal);
    
    await createWorkflowHistoryEntry(input.projectId, 'progress_updated', 'success', {
      oldProgress: state.progressMetrics.completionPercentage,
      newProgress: newProgress,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'progress_updated',
      performedBy: 'system',
      details: { newProgress },
    });
  });

  // Query handlers
  setHandler(getProjectState, () => state);
  setHandler(getCurrentStatus, () => state.currentStatus);
  setHandler(getMilestones, () => state.milestones);
  setHandler(getMethodologyStatus, () => state.methodology);
  setHandler(getProgress, () => state.progressMetrics);

  // Helper functions
  async function startProgressMonitoring() {
    while (state.currentStatus === ProjectStatuses.ACTIVE) {
      // Wait for progress check interval
      await sleep(PROGRESS_CHECK_INTERVAL_HOURS * 60 * 60 * 1000);
      
      // Check for overdue milestones
      const now = new Date();
      const overdueMilestones = state.milestones.filter(m => 
        m.status !== 'completed' && m.dueDate < now
      );
      
      for (const milestone of overdueMilestones) {
        milestone.status = 'overdue';
        
        // Send reminder to project owner
        await sendProjectDeadlineReminder(
          input.ownerId, // This should be the email
          input.projectId,
          input.name,
          milestone.dueDate
        );
        
        // Create in-app notification
        await createInAppNotification(
          input.ownerId,
          'Milestone Overdue',
          `Milestone "${milestone.name}" is overdue for project "${input.name}"`,
          'deadline_overdue',
          { projectId: input.projectId, milestoneId: milestone.id }
        );
      }
      
      // Auto-pause project if no progress for extended period
      const lastProgressUpdate = state.history
        .filter(h => h.action === 'progress_updated')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (lastProgressUpdate) {
        const daysSinceProgress = (now.getTime() - lastProgressUpdate.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceProgress > 30) {
          // Auto-pause after 30 days of no progress
          state.currentStatus = ProjectStatuses.ON_HOLD;
          await updateProjectStatus(input.projectId, ProjectStatuses.ON_HOLD, {
            autoPaused: true,
            autoPauseReason: 'No progress for 30 days',
          });
          
          await createWorkflowHistoryEntry(input.projectId, 'auto_paused', 'success', {
            reason: 'No progress for 30 days',
          });
          break;
        }
      }
    }
  }

  async function transitionToClosurePhase() {
    state.currentPhase = ProjectPhases.CLOSURE;
    
    // Create final deliverables checklist
    const closureTasks = [
      'Final documentation review',
      'Stakeholder approval',
      'Knowledge transfer',
      'Archive project materials',
      'Team demobilization',
    ];
    
    for (let i = 0; i < closureTasks.length; i++) {
      const taskDate = new Date();
      taskDate.setDate(taskDate.getDate() + (i + 1) * 2); // 2 days between tasks
      
      await createDeadline(
        input.projectId,
        `Closure Task: ${closureTasks[i]}`,
        `Complete closure task: ${closureTasks[i]}`,
        taskDate,
        'low',
        input.ownerId
      );
    }
  }

  // Main workflow logic
  try {
    // Monitor project lifecycle
    while (state.currentStatus === ProjectStatuses.ACTIVE || state.currentStatus === ProjectStatuses.ON_HOLD) {
      await sleep(60 * 60 * 1000); // Check every hour
      
      // Check for phase transitions
      if (state.currentPhase === ProjectPhases.INITIATION) {
        // Transition to planning after initial setup
        const initiationDays = (new Date().getTime() - state.history[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
        if (initiationDays >= 7) { // 7 days for initiation
          state.currentPhase = ProjectPhases.PLANNING;
        }
      } else if (state.currentPhase === ProjectPhases.PLANNING) {
        // Check if planning is complete
        const planningComplete = state.methodology.status === 'approved' && 
                                state.milestones.length > 0;
        if (planningComplete) {
          state.currentPhase = ProjectPhases.EXECUTION;
        }
      }
      
      // Check for automatic project completion
      if (state.currentPhase === ProjectPhases.EXECUTION && 
          state.milestones.every(m => m.status === 'completed') &&
          state.progressMetrics.completionPercentage >= 100) {
        // Auto-complete project
        state.currentStatus = ProjectStatuses.COMPLETED;
        state.currentPhase = ProjectPhases.CLOSURE;
        
        await updateProjectStatus(input.projectId, ProjectStatuses.COMPLETED, {
          autoCompleted: true,
          autoCompletionReason: 'All milestones completed and 100% progress achieved',
        });
        
        await createWorkflowHistoryEntry(input.projectId, 'auto_completed', 'success', {
          reason: 'All milestones completed and 100% progress achieved',
        });
        
        break;
      }
    }
    
  } catch (error) {
    await logWorkflowEvent(input.projectId, 'project_workflow_error', {
      error: error.message,
      currentState: state.currentStatus,
      currentPhase: state.currentPhase,
    });
    throw error;
  }
}