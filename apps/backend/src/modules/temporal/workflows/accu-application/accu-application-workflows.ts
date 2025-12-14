import { 
  proxyActivities, 
  defineSignal, 
  setHandler, 
  sleep, 
  condition,
  defineQuery,
  ChildWorkflow,
  ParentClosePolicy 
} from '@temporalio/workflow';

import type { 
  DatabaseActivities,
  NotificationActivities,
  EmailActivities 
} from '../../activities/database-activities';
import type { CalendarActivities } from '../../activities/calendar-activities';

// Define activity interfaces
const { 
  updateAccuApplicationStatus, 
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
  sendAccuApplicationStatusUpdate 
} = proxyActivities<EmailActivities>({
  startToCloseTimeout: '2 minutes',
});

const { 
  createDeadline 
} = proxyActivities<CalendarActivities>({
  startToCloseTimeout: '1 minute',
});

// Workflow state
export interface AccuApplicationWorkflowState {
  applicationId: string;
  currentStatus: string;
  submissionDate?: Date;
  reviewStartDate?: Date;
  approvalDate?: Date;
  issuedDate?: Date;
  deadlineDate?: Date;
  reviewerId?: string;
  approverId?: string;
  rejectionReason?: string;
  metadata: Record<string, any>;
  history: Array<{
    timestamp: Date;
    status: string;
    action: string;
    performedBy: string;
    notes?: string;
  }>;
}

// Define signals
export const submitApplication = defineSignal('submitApplication');
export const assignReviewer = defineSignal<[string]>('assignReviewer');
export const approveApplication = defineSignal<[string, string?]>('approveApplication');
export const rejectApplication = defineSignal<[string, string]>('rejectApplication');
export const issueCertificate = defineSignal<[string]>('issueCertificate');
export const updateMetadata = defineSignal<[Record<string, any>]>('updateMetadata');

// Define queries
export const getWorkflowState = defineQuery<AccuApplicationWorkflowState>('getWorkflowState');
export const getCurrentStatus = defineQuery<string>('getCurrentStatus');
export const getHistory = defineQuery<AccuApplicationWorkflowState['history']>('getHistory');

// Constants
const ACCUStatuses = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ISSUED: 'issued',
} as const;

const REVIEW_TIMEOUT_DAYS = 14;
const APPROVAL_TIMEOUT_DAYS = 7;
const ISSUE_TIMEOUT_DAYS = 3;

export async function AccuApplicationWorkflow(input: {
  applicationId: string;
  initialStatus?: string;
  submitterId: string;
  projectId: string;
  accuUnits: number;
  methodologyId: string;
  applicationData: Record<string, any>;
}): Promise<void> {
  
  // Initialize workflow state
  let state: AccuApplicationWorkflowState = {
    applicationId: input.applicationId,
    currentStatus: input.initialStatus || ACCUStatuses.DRAFT,
    metadata: input.applicationData,
    history: [{
      timestamp: new Date(),
      status: ACCUStatuses.DRAFT,
      action: 'workflow_started',
      performedBy: input.submitterId,
    }],
  };

  // Set up signal handlers
  setHandler(submitApplication, async () => {
    if (state.currentStatus !== ACCUStatuses.DRAFT) {
      throw new Error('Application can only be submitted from draft status');
    }
    
    state.currentStatus = ACCUStatuses.SUBMITTED;
    state.submissionDate = new Date();
    
    // Create deadline for review
    const reviewDeadline = new Date();
    reviewDeadline.setDate(reviewDeadline.getDate() + REVIEW_TIMEOUT_DAYS);
    
    state.deadlineDate = reviewDeadline;
    
    await updateAccuApplicationStatus(input.applicationId, ACCUStatuses.SUBMITTED, {
      submissionDate: state.submissionDate,
      deadlineDate: state.deadlineDate,
    });
    
    await createWorkflowHistoryEntry(input.applicationId, 'submitted', 'success', {
      submittedBy: input.submitterId,
      deadlineDate: state.deadlineDate,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ACCUStatuses.SUBMITTED,
      action: 'application_submitted',
      performedBy: input.submitterId,
    });
    
    // Create review deadline calendar event
    await createDeadline(
      input.projectId,
      'ACCU Application Review Deadline',
      `Review deadline for ACCU application ${input.applicationId}`,
      reviewDeadline,
      'high'
    );
  });

  setHandler(assignReviewer, async (reviewerId: string) => {
    if (state.currentStatus !== ACCUStatuses.SUBMITTED) {
      throw new Error('Reviewer can only be assigned to submitted applications');
    }
    
    state.currentStatus = ACCUStatuses.UNDER_REVIEW;
    state.reviewerId = reviewerId;
    state.reviewStartDate = new Date();
    
    await updateAccuApplicationStatus(input.applicationId, ACCUStatuses.UNDER_REVIEW, {
      reviewerId: reviewerId,
      reviewStartDate: state.reviewStartDate,
    });
    
    await createWorkflowHistoryEntry(input.applicationId, 'under_review', 'success', {
      reviewerId: reviewerId,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ACCUStatuses.UNDER_REVIEW,
      action: 'reviewer_assigned',
      performedBy: 'system',
      notes: `Reviewer assigned: ${reviewerId}`,
    });
  });

  setHandler(approveApplication, async (approverId: string, notes?: string) => {
    if (state.currentStatus !== ACCUStatuses.UNDER_REVIEW) {
      throw new Error('Application can only be approved from under review status');
    }
    
    // Validate business rules before approval
    const isValid = await validateBusinessRules('accu_application', input.applicationId, [
      'all_required_documents_submitted',
      'methodology_validated',
      'units_available',
    ]);
    
    if (!isValid) {
      throw new Error('Business rule validation failed for approval');
    }
    
    state.currentStatus = ACCUStatuses.APPROVED;
    state.approverId = approverId;
    state.approvalDate = new Date();
    
    // Set issue deadline
    const issueDeadline = new Date();
    issueDeadline.setDate(issueDeadline.getDate() + ISSUE_TIMEOUT_DAYS);
    state.deadlineDate = issueDeadline;
    
    await updateAccuApplicationStatus(input.applicationId, ACCUStatuses.APPROVED, {
      approverId: approverId,
      approvalDate: state.approvalDate,
      deadlineDate: state.deadlineDate,
      notes: notes,
    });
    
    await createWorkflowHistoryEntry(input.applicationId, 'approved', 'success', {
      approverId: approverId,
      notes: notes,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ACCUStatuses.APPROVED,
      action: 'application_approved',
      performedBy: approverId,
      notes: notes,
    });
  });

  setHandler(rejectApplication, async (approverId: string, reason: string) => {
    if (state.currentStatus !== ACCUStatuses.UNDER_REVIEW) {
      throw new Error('Application can only be rejected from under review status');
    }
    
    state.currentStatus = ACCUStatuses.REJECTED;
    state.approverId = approverId;
    state.rejectionReason = reason;
    
    await updateAccuApplicationStatus(input.applicationId, ACCUStatuses.REJECTED, {
      approverId: approverId,
      rejectionReason: reason,
    });
    
    await createWorkflowHistoryEntry(input.applicationId, 'rejected', 'success', {
      approverId: approverId,
      reason: reason,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ACCUStatuses.REJECTED,
      action: 'application_rejected',
      performedBy: approverId,
      notes: reason,
    });
  });

  setHandler(issueCertificate, async (issuerId: string) => {
    if (state.currentStatus !== ACCUStatuses.APPROVED) {
      throw new Error('Certificate can only be issued for approved applications');
    }
    
    state.currentStatus = ACCUStatuses.ISSUED;
    state.issuedDate = new Date();
    
    await updateAccuApplicationStatus(input.applicationId, ACCUStatuses.ISSUED, {
      issuerId: issuerId,
      issuedDate: state.issuedDate,
    });
    
    await createWorkflowHistoryEntry(input.applicationId, 'issued', 'success', {
      issuerId: issuerId,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: ACCUStatuses.ISSUED,
      action: 'certificate_issued',
      performedBy: issuerId,
    });
  });

  setHandler(updateMetadata, async (metadata: Record<string, any>) => {
    state.metadata = { ...state.metadata, ...metadata };
    
    await updateAccuApplicationStatus(input.applicationId, state.currentStatus, {
      metadata: state.metadata,
    });
    
    await createWorkflowHistoryEntry(input.applicationId, 'metadata_updated', 'success', {
      updatedFields: Object.keys(metadata),
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'metadata_updated',
      performedBy: 'system',
      notes: `Updated fields: ${Object.keys(metadata).join(', ')}`,
    });
  });

  // Query handlers
  setHandler(getWorkflowState, () => state);
  setHandler(getCurrentStatus, () => state.currentStatus);
  setHandler(getHistory, () => state.history);

  // Main workflow logic with timeout handling
  try {
    // Wait for submission
    if (state.currentStatus === ACCUStatuses.DRAFT) {
      await condition(() => state.currentStatus !== ACCUStatuses.DRAFT, '30 days');
    }
    
    // Handle submitted state - wait for reviewer assignment
    if (state.currentStatus === ACCUStatuses.SUBMITTED) {
      // Set up timeout for reviewer assignment
      const reviewAssignmentTimeout = sleep(REVIEW_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);
      
      await condition(
        () => state.currentStatus !== ACCUStatuses.SUBMITTED || 
             (state.reviewStartDate && new Date().getTime() - state.reviewStartDate.getTime() > REVIEW_TIMEOUT_DAYS * 24 * 60 * 60 * 1000),
        '30 days'
      );
      
      // Auto-assign reviewer if timeout reached
      if (state.currentStatus === ACCUStatuses.SUBMITTED) {
        // Auto-assign logic would go here (e.g., round-robin or based on workload)
        // For now, just log the timeout
        await logWorkflowEvent(input.applicationId, 'review_timeout', {
          timeoutDays: REVIEW_TIMEOUT_DAYS,
          action: 'manual_intervention_required',
        });
      }
    }
    
    // Handle under review state - wait for approval/rejection
    if (state.currentStatus === ACCUStatuses.UNDER_REVIEW) {
      await condition(() => 
        state.currentStatus === ACCUStatuses.APPROVED || 
        state.currentStatus === ACCUStatuses.REJECTED,
        '30 days'
      );
      
      // If still under review after timeout, escalate
      if (state.currentStatus === ACCUStatuses.UNDER_REVIEW) {
        await logWorkflowEvent(input.applicationId, 'approval_timeout', {
          timeoutDays: APPROVAL_TIMEOUT_DAYS,
          action: 'escalation_required',
        });
      }
    }
    
    // Handle approved state - wait for issuance
    if (state.currentStatus === ACCUStatuses.APPROVED) {
      await condition(() => state.currentStatus === ACCUStatuses.ISSUED, '14 days');
      
      // Auto-issue if timeout reached
      if (state.currentStatus === ACCUStatuses.APPROVED) {
        state.currentStatus = ACCUStatuses.ISSUED;
        state.issuedDate = new Date();
        
        await updateAccuApplicationStatus(input.applicationId, ACCUStatuses.ISSUED, {
          issuedDate: state.issuedDate,
          autoIssued: true,
        });
        
        await createWorkflowHistoryEntry(input.applicationId, 'auto_issued', 'success', {
          reason: 'timeout',
        });
      }
    }
    
  } catch (error) {
    await logWorkflowEvent(input.applicationId, 'workflow_error', {
      error: error.message,
      currentState: state.currentStatus,
    });
    throw error;
  }
}