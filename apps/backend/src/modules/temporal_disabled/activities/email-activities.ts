import { proxyActivities } from '@temporalio/workflow';

export interface EmailActivities {
  sendEmail(to: string, subject: string, body: string, templateId?: string, templateData?: Record<string, any>): Promise<void>;
  sendBulkEmail(recipients: string[], subject: string, body: string, templateId?: string, templateData?: Record<string, any>): Promise<void>;
  sendAccuApplicationStatusUpdate(email: string, applicationId: string, oldStatus: string, newStatus: string): Promise<void>;
  sendProjectDeadlineReminder(email: string, projectId: string, projectName: string, deadlineDate: Date): Promise<void>;
  sendDocumentApprovalRequest(approverEmail: string, documentId: string, documentName: string, requesterName: string): Promise<void>;
  sendWorkflowAlert(recipients: string[], workflowType: string, workflowId: string, alertType: string, message: string): Promise<void>;
}

export const { 
  sendEmail, 
  sendBulkEmail, 
  sendAccuApplicationStatusUpdate, 
  sendProjectDeadlineReminder, 
  sendDocumentApprovalRequest, 
  sendWorkflowAlert 
} = proxyActivities<EmailActivities>({
  startToCloseTimeout: '2 minutes',
});