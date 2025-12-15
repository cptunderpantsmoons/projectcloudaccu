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

// Define activity interfaces
const { 
  updateDocumentStatus, 
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
  sendDocumentApprovalRequest 
} = proxyActivities<EmailActivities>({
  startToCloseTimeout: '2 minutes',
});

// Workflow state
export interface DocumentWorkflowState {
  documentId: string;
  currentStatus: string;
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
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    details: Record<string, any>;
    ipAddress?: string;
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
export const submitForReview = defineSignal<[string, string?]>('submitForReview');
export const assignReviewer = defineSignal<[string, Date?]>('assignReviewer');
export const startReview = defineSignal<[string]>('startReview');
export const submitRevision = defineSignal<[string, string]>('submitRevision');
export const approveDocument = defineSignal<[string, string?]>('approveDocument');
export const rejectDocument = defineSignal<[string, string]>('rejectDocument');
export const requestRevision = defineSignal<[string, string]>('requestRevision');
export const publishDocument = defineSignal<[string]>('publishDocument');
export const archiveDocument = defineSignal<[string, string]>('archiveDocument');
export const updateAccessControl = defineSignal<[string[], string[], string]>('updateAccessControl');

// Define queries
export const getDocumentState = defineQuery<DocumentWorkflowState>('getDocumentState');
export const getCurrentStatus = defineQuery<string>('getCurrentStatus');
export const getReviewStatus = defineQuery<DocumentWorkflowState['reviewProcess']>('getReviewStatus');
export const getApprovalStatus = defineQuery<DocumentWorkflowState['approvalProcess']>('getApprovalStatus');
export const getSecurityScanStatus = defineQuery<DocumentWorkflowState['securityScan']>('getSecurityScanStatus');

// Constants
const DocumentStatuses = {
  DRAFT: 'draft',
  REVIEW: 'review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
  PUBLISHED: 'published',
} as const;

const REVIEW_TIMEOUT_HOURS = 48;
const APPROVAL_TIMEOUT_HOURS = 24;
const SECURITY_SCAN_TIMEOUT_MINUTES = 30;

// Security scanning activities (mock implementation)
const { performSecurityScan } = proxyActivities<{
  performSecurityScan(documentId: string, filePath: string): Promise<{
    status: 'passed' | 'failed';
    vulnerabilities: string[];
    scanReport: string;
  }>;
}>({
  startToCloseTimeout: '5 minutes',
});

export async function DocumentWorkflow(input: {
  documentId: string;
  name: string;
  description?: string;
  category: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedById: string;
  projectId?: string;
  tags?: string[];
  classificationLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
}): Promise<void> {
  
  // Initialize workflow state
  let state: DocumentWorkflowState = {
    documentId: input.documentId,
    currentStatus: DocumentStatuses.DRAFT,
    version: 1,
    securityScan: {
      status: 'pending',
    },
    reviewProcess: {
      revisionRequired: false,
    },
    approvalProcess: {},
    accessControl: {
      permissions: ['read', 'write'],
      restrictedUsers: [],
      classificationLevel: input.classificationLevel || 'internal',
    },
    auditTrail: [],
    history: [{
      timestamp: new Date(),
      status: DocumentStatuses.DRAFT,
      action: 'document_uploaded',
      performedBy: input.uploadedById,
      details: {
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      },
    }],
  };

  // Set up signal handlers
  setHandler(submitForReview, async (submitterId: string, notes?: string) => {
    if (state.currentStatus !== DocumentStatuses.DRAFT) {
      throw new Error('Document can only be submitted for review from draft status');
    }
    
    // Perform security scan first
    state.securityScan.status = 'in_progress';
    
    try {
      const scanResult = await performSecurityScan(input.documentId, input.filePath);
      state.securityScan.status = scanResult.status;
      state.securityScan.scanDate = new Date();
      state.securityScan.vulnerabilities = scanResult.vulnerabilities;
      state.securityScan.scanReport = scanResult.scanReport;
      
      if (scanResult.status === 'failed') {
        throw new Error(`Security scan failed: ${scanResult.vulnerabilities.join(', ')}`);
      }
      
    } catch (error) {
      state.securityScan.status = 'failed';
      await logWorkflowEvent(input.documentId, 'security_scan_failed', {
        error: error.message,
      });
      throw error;
    }
    
    state.currentStatus = DocumentStatuses.REVIEW;
    
    await updateDocumentStatus(input.documentId, DocumentStatuses.REVIEW, {
      version: state.version,
      securityScanStatus: state.securityScan.status,
      securityScanDate: state.securityScan.scanDate,
      submittedForReview: true,
      submittedBy: submitterId,
      submissionNotes: notes,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'submitted_for_review', 'success', {
      submitterId: submitterId,
      notes: notes,
      securityScanPassed: state.securityScan.status === 'passed',
    });
    
    state.history.push({
      timestamp: new Date(),
      status: DocumentStatuses.REVIEW,
      action: 'submitted_for_review',
      performedBy: submitterId,
      details: { notes: notes },
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'submit_for_review',
      performedBy: submitterId,
      details: { notes: notes },
    });
  });

  setHandler(assignReviewer, async (reviewerId: string, reviewDueDate?: Date) => {
    if (state.currentStatus !== DocumentStatuses.REVIEW) {
      throw new Error('Reviewer can only be assigned to documents under review');
    }
    
    state.reviewProcess.assignedReviewerId = reviewerId;
    state.reviewProcess.reviewDueDate = reviewDueDate || new Date(Date.now() + REVIEW_TIMEOUT_HOURS * 60 * 60 * 1000);
    
    await updateDocumentStatus(input.documentId, state.currentStatus, {
      reviewerId: reviewerId,
      reviewDueDate: state.reviewProcess.reviewDueDate,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'reviewer_assigned', 'success', {
      reviewerId: reviewerId,
      dueDate: state.reviewProcess.reviewDueDate,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'reviewer_assigned',
      performedBy: 'system',
      details: { reviewerId, reviewDueDate: state.reviewProcess.reviewDueDate },
    });
    
    // Send notification to reviewer
    await sendDocumentApprovalRequest(
      reviewerId, // This should be email
      input.documentId,
      input.name,
      input.uploadedById
    );
    
    await createInAppNotification(
      reviewerId,
      'Document Review Assigned',
      `You have been assigned to review document "${input.name}"`,
      'document_review',
      { documentId: input.documentId }
    );
  });

  setHandler(startReview, async (reviewerId: string) => {
    if (state.reviewProcess.assignedReviewerId !== reviewerId) {
      throw new Error('Only the assigned reviewer can start the review');
    }
    
    if (state.currentStatus !== DocumentStatuses.REVIEW) {
      throw new Error('Document must be under review to start review process');
    }
    
    state.reviewProcess.reviewStartDate = new Date();
    
    await updateDocumentStatus(input.documentId, state.currentStatus, {
      reviewStartDate: state.reviewProcess.reviewStartDate,
      reviewInProgress: true,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'review_started', 'success', {
      reviewerId: reviewerId,
      startDate: state.reviewProcess.reviewStartDate,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'review_started',
      performedBy: reviewerId,
      details: {},
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'review_started',
      performedBy: reviewerId,
      details: {},
    });
  });

  setHandler(submitRevision, async (revisorId: string, revisionNotes: string) => {
    if (state.reviewProcess.assignedReviewerId !== revisorId) {
      throw new Error('Only the assigned reviewer can submit revisions');
    }
    
    if (state.currentStatus !== DocumentStatuses.REVIEW) {
      throw new Error('Document must be under review to submit revisions');
    }
    
    state.version += 1;
    state.reviewProcess.revisionNotes = revisionNotes;
    state.reviewProcess.revisionRequired = false;
    
    await updateDocumentStatus(input.documentId, state.currentStatus, {
      version: state.version,
      revisionNotes: revisionNotes,
      revisionSubmitted: true,
      revisionSubmittedBy: revisorId,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'revision_submitted', 'success', {
      revisorId: revisorId,
      notes: revisionNotes,
      newVersion: state.version,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'revision_submitted',
      performedBy: revisorId,
      details: { revisionNotes, newVersion: state.version },
 // Add audit trail    });
    
    entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'revision_submitted',
      performedBy: revisorId,
      details: { revisionNotes, version: state.version },
    });
  });

  setHandler(approveDocument, async (approverId: string, notes?: string) => {
    if (state.currentStatus !== DocumentStatuses.REVIEW) {
      throw new Error('Document can only be approved from review status');
    }
    
    // Validate business rules for approval
    const isValid = await validateBusinessRules('document', input.documentId, [
      'review_completed',
      'security_scan_passed',
      'content_validation_passed',
    ]);
    
    if (!isValid) {
      throw new Error('Business rule validation failed for approval');
    }
    
    state.currentStatus = DocumentStatuses.APPROVED;
    state.approvalProcess.approvedBy = approverId;
    state.approvalProcess.approvedDate = new Date();
    state.approvalProcess.approvalNotes = notes;
    
    await updateDocumentStatus(input.documentId, DocumentStatuses.APPROVED, {
      approvedBy: approverId,
      approvedDate: state.approvalProcess.approvedDate,
      approvalNotes: notes,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'document_approved', 'success', {
      approverId: approverId,
      notes: notes,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: DocumentStatuses.APPROVED,
      action: 'document_approved',
      performedBy: approverId,
      details: { notes: notes },
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'approve',
      performedBy: approverId,
      details: { notes: notes },
    });
  });

  setHandler(rejectDocument, async (rejectorId: string, reason: string) => {
    if (state.currentStatus !== DocumentStatuses.REVIEW) {
      throw new Error('Document can only be rejected from review status');
    }
    
    state.currentStatus = DocumentStatuses.REJECTED;
    
    await updateDocumentStatus(input.documentId, DocumentStatuses.REJECTED, {
      rejectedBy: rejectorId,
      rejectedDate: new Date(),
      rejectionReason: reason,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'document_rejected', 'success', {
      rejectorId: rejectorId,
      reason: reason,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: DocumentStatuses.REJECTED,
      action: 'document_rejected',
      performedBy: rejectorId,
      details: { reason: reason },
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'reject',
      performedBy: rejectorId,
      details: { reason: reason },
    });
    
    // Notify document owner
    await sendEmail(
      input.uploadedById, // This should be email
      `Document "${input.name}" Rejected`,
      `Your document has been rejected. Reason: ${reason}`
    );
  });

  setHandler(requestRevision, async (reviewerId: string, revisionNotes: string) => {
    if (state.reviewProcess.assignedReviewerId !== reviewerId) {
      throw new Error('Only the assigned reviewer can request revisions');
    }
    
    if (state.currentStatus !== DocumentStatuses.REVIEW) {
      throw new Error('Document must be under review to request revisions');
    }
    
    state.reviewProcess.revisionRequired = true;
    state.reviewProcess.revisionNotes = revisionNotes;
    
    await updateDocumentStatus(input.documentId, state.currentStatus, {
      revisionRequired: true,
      revisionNotes: revisionNotes,
      revisionRequestedBy: reviewerId,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'revision_requested', 'success', {
      reviewerId: reviewerId,
      notes: revisionNotes,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'revision_requested',
      performedBy: reviewerId,
      details: { revisionNotes },
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'request_revision',
      performedBy: reviewerId,
      details: { revisionNotes },
    });
    
    // Notify document owner about revision request
    await sendEmail(
      input.uploadedById,
      `Revision Required for "${input.name}"`,
      `Please review and address the following revision notes: ${revisionNotes}`
    );
  });

  setHandler(publishDocument, async (publisherId: string) => {
    if (state.currentStatus !== DocumentStatuses.APPROVED) {
      throw new Error('Only approved documents can be published');
    }
    
    // Validate publication requirements
    const canPublish = await validateBusinessRules('document', input.documentId, [
      'all_required_approvals_obtained',
      'publication_ready',
    ]);
    
    if (!canPublish) {
      throw new Error('Document does not meet publication requirements');
    }
    
    state.currentStatus = DocumentStatuses.PUBLISHED;
    
    await updateDocumentStatus(input.documentId, DocumentStatuses.PUBLISHED, {
      publishedBy: publisherId,
      publishedDate: new Date(),
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'document_published', 'success', {
      publisherId: publisherId,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: DocumentStatuses.PUBLISHED,
      action: 'document_published',
      performedBy: publisherId,
      details: {},
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'publish',
      performedBy: publisherId,
      details: {},
    });
    
    // Notify stakeholders about publication
    await sendPushNotification(
      input.uploadedById,
      'Document Published',
      `Document "${input.name}" has been published`,
      { documentId: input.documentId }
    );
  });

  setHandler(archiveDocument, async (archiverId: string, reason: string) => {
    if (state.currentStatus === DocumentStatuses.ARCHIVED) {
      throw new Error('Document is already archived');
    }
    
    state.currentStatus = DocumentStatuses.ARCHIVED;
    
    await updateDocumentStatus(input.documentId, DocumentStatuses.ARCHIVED, {
      archivedBy: archiverId,
      archivedDate: new Date(),
      archiveReason: reason,
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'document_archived', 'success', {
      archiverId: archiverId,
      reason: reason,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: DocumentStatuses.ARCHIVED,
      action: 'document_archived',
      performedBy: archiverId,
      details: { reason: reason },
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'archive',
      performedBy: archiverId,
      details: { reason: reason },
    });
  });

  setHandler(updateAccessControl, async (permissions: string[], restrictedUsers: string[], classifierId: string) => {
    state.accessControl.permissions = permissions;
    state.accessControl.restrictedUsers = restrictedUsers;
    
    await updateDocumentStatus(input.documentId, state.currentStatus, {
      accessPermissions: permissions,
      restrictedUsers: restrictedUsers,
      accessUpdatedBy: classifierId,
      accessUpdatedDate: new Date(),
    });
    
    await createWorkflowHistoryEntry(input.documentId, 'access_control_updated', 'success', {
      permissions: permissions,
      restrictedUsers: restrictedUsers,
      updatedBy: classifierId,
    });
    
    state.history.push({
      timestamp: new Date(),
      status: state.currentStatus,
      action: 'access_control_updated',
      performedBy: classifierId,
      details: { permissions, restrictedUsers },
    });
    
    // Add audit trail entry
    state.auditTrail.push({
      timestamp: new Date(),
      action: 'update_access_control',
      performedBy: classifierId,
      details: { permissions, restrictedUsers },
    });
  });

  // Query handlers
  setHandler(getDocumentState, () => state);
  setHandler(getCurrentStatus, () => state.currentStatus);
  setHandler(getReviewStatus, () => state.reviewProcess);
  setHandler(getApprovalStatus, () => state.approvalProcess);
  setHandler(getSecurityScanStatus, () => state.securityScan);

  // Main workflow logic with timeout handling
  try {
    // Monitor for timeouts and auto-escalation
    while (state.currentStatus === DocumentStatuses.REVIEW) {
      await sleep(60 * 60 * 1000); // Check every hour
      
      const now = new Date();
      
      // Check review timeout
      if (state.reviewProcess.reviewDueDate && now > state.reviewProcess.reviewDueDate) {
        // Auto-escalate review timeout
        await logWorkflowEvent(input.documentId, 'review_timeout', {
          reviewerId: state.reviewProcess.assignedReviewerId,
          dueDate: state.reviewProcess.reviewDueDate,
          escalationLevel: 'manager',
        });
        
        // Send escalation notification
        await sendEmail(
          'manager@accu.com', // Manager email
          `Document Review Timeout: ${input.name}`,
          `Document review is overdue. Please escalate to ensure timely completion.`
        );
      }
      
      // Check approval timeout
      if (state.approvalProcess.approvalDueDate && now > state.approvalProcess.approvalDueDate) {
        // Auto-escalate approval timeout
        await logWorkflowEvent(input.documentId, 'approval_timeout', {
          approverId: state.approvalProcess.assignedApproverId,
          dueDate: state.approvalProcess.approvalDueDate,
          escalationLevel: 'senior_manager',
        });
        
        // Send escalation notification
        await sendEmail(
          'senior.manager@accu.com',
          `Document Approval Timeout: ${input.name}`,
          `Document approval is overdue. Please escalate for immediate attention.`
        );
      }
    }
    
  } catch (error) {
    await logWorkflowEvent(input.documentId, 'document_workflow_error', {
      error: error.message,
      currentState: state.currentStatus,
    });
    throw error;
  }
}