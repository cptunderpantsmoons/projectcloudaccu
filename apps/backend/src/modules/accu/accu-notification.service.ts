import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { AccuApplication, ACCUStatus } from '../../entities/accu-application.entity';
import { User } from '../../entities/user.entity';

export interface NotificationData {
  type: 'info' | 'warning' | 'error' | 'success' | 'reminder';
  title: string;
  message: string;
  userId?: string;
  tenantId?: string;
  projectId?: string;
  accuApplicationId?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

@Injectable()
export class AccuNotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Send notification for ACCU application status changes
   */
  async notifyStatusChange(
    application: AccuApplication,
    oldStatus: ACCUStatus | null,
    newStatus: ACCUStatus,
    reason?: string,
    notes?: string,
  ): Promise<void> {
    const notificationData = this.getStatusChangeNotificationData(application, oldStatus, newStatus, reason, notes);
    
    // Notify application owner
    if (application.project?.ownerId) {
      await this.createNotification({
        ...notificationData,
        userId: application.project.ownerId,
        accuApplicationId: application.id,
        projectId: application.projectId,
        tenantId: application.tenantId,
      });
    }

    // Notify project collaborators (if we had such functionality)
    // This would require a collaboration system to be implemented
    
    // Send system-wide notifications for certain status changes
    if (newStatus === ACCUStatus.APPROVED || newStatus === ACCUStatus.REJECTED) {
      await this.notifyAdmins(application, newStatus, reason);
    }
  }

  /**
   * Send deadline reminders
   */
  async sendDeadlineReminders(application: AccuApplication, daysUntilDeadline: number): Promise<void> {
    if (daysUntilDeadline <= 0) return;

    // Send reminders at 30, 14, 7, 3, and 1 day intervals
    const reminderDays = [30, 14, 7, 3, 1];
    if (!reminderDays.includes(daysUntilDeadline)) return;

    const urgencyLevel = daysUntilDeadline <= 7 ? 'error' : daysUntilDeadline <= 14 ? 'warning' : 'info';
    
    await this.createNotification({
      type: urgencyLevel,
      title: `ACCU Application Deadline Reminder`,
      message: `Your ACCU application "${application.project?.name || 'Unknown Project'}" has ${daysUntilDeadline} day(s) remaining until the review deadline.`,
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        daysUntilDeadline,
        urgencyLevel,
        applicationId: application.id,
      },
    });
  }

  /**
   * Send document requirement notifications
   */
  async notifyMissingDocuments(
    application: AccuApplication,
    missingDocuments: string[],
    requiredDocumentsCount: number,
  ): Promise<void> {
    await this.createNotification({
      type: 'warning',
      title: 'Missing Required Documents',
      message: `Your ACCU application is missing ${missingDocuments.length} required document(s) out of ${requiredDocumentsCount}. Please upload the missing documents to proceed with the review.`,
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        missingDocuments,
        requiredDocumentsCount,
        submittedDocumentsCount: requiredDocumentsCount - missingDocuments.length,
      },
    });
  }

  /**
   * Send submission confirmations
   */
  async confirmSubmission(application: AccuApplication, submissionNotes?: string): Promise<void> {
    await this.createNotification({
      type: 'success',
      title: 'ACCU Application Submitted',
      message: `Your ACCU application "${application.project?.name || 'Unknown Project'}" has been successfully submitted for review.`,
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        submissionDate: application.submissionDate,
        accuUnits: application.accuUnits,
        methodologyId: application.methodologyId,
        submissionNotes,
      },
    });
  }

  /**
   * Send approval notifications
   */
  async notifyApproval(
    application: AccuApplication,
    approvedUnits?: number,
    reviewerComments?: string,
  ): Promise<void> {
    const message = approvedUnits && approvedUnits !== application.accuUnits
      ? `Your ACCU application has been approved for ${approvedUnits} units (originally requested ${application.accuUnits} units).`
      : `Your ACCU application has been approved for ${application.accuUnits} units.`;

    await this.createNotification({
      type: 'success',
      title: 'ACCU Application Approved',
      message,
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        approvedUnits: approvedUnits || application.accuUnits,
        originallyRequestedUnits: application.accuUnits,
        reviewerComments,
        approvalDate: application.approvalDate,
      },
    });

    // Notify about next steps
    await this.createNotification({
      type: 'info',
      title: 'Next Steps for ACCU Application',
      message: 'Your application has been approved. The next step is to await the issuance of ACCU units.',
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        nextStep: 'await_issuance',
        estimatedIssuanceTime: '30 days', // This would be configurable
      },
    });
  }

  /**
   * Send rejection notifications
   */
  async notifyRejection(
    application: AccuApplication,
    reason?: string,
    reviewerComments?: string,
  ): Promise<void> {
    await this.createNotification({
      type: 'error',
      title: 'ACCU Application Rejected',
      message: `Your ACCU application has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        rejectionReason: reason,
        reviewerComments,
        rejectionDate: new Date(),
      },
    });

    // Provide guidance for resubmission
    await this.createNotification({
      type: 'info',
      title: 'Resubmission Guidance',
      message: 'You may resubmit a revised ACCU application after addressing the rejection reasons. Please review the feedback and contact support if needed.',
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        canResubmit: true,
        resubmissionGuidelines: 'Contact support for resubmission process',
      },
    });
  }

  /**
   * Send issuance notifications
   */
  async notifyIssuance(application: AccuApplication): Promise<void> {
    await this.createNotification({
      type: 'success',
      title: 'ACCU Units Issued',
      message: `Congratulations! ${application.accuUnits} ACCU units have been issued for your application "${application.project?.name || 'Unknown Project'}".`,
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        issuedUnits: application.accuUnits,
        issuanceDate: application.issuedDate,
        serReference: application.serReference,
      },
    });

    // Send certificate information
    await this.createNotification({
      type: 'info',
      title: 'ACCU Certificate Information',
      message: 'Your ACCU units have been issued. Certificate details will be available in your account within 24-48 hours.',
      userId: application.project?.ownerId,
      accuApplicationId: application.id,
      projectId: application.projectId,
      tenantId: application.tenantId,
      metadata: {
        certificateAvailableIn: '24-48 hours',
        serReference: application.serReference,
      },
    });
  }

  /**
   * Create notification record
   */
  private async createNotification(data: NotificationData): Promise<Notification> {
    const notification = this.notificationRepository.create({
      type: data.type,
      title: data.title,
      message: data.message,
      userId: data.userId,
      tenantId: data.tenantId,
      projectId: data.projectId,
      metadata: {
        ...data.metadata,
        accuApplicationId: data.accuApplicationId,
        createdBy: 'accu-system',
        timestamp: new Date().toISOString(),
      },
      expiresAt: data.expiresAt,
    });

    return await this.notificationRepository.save(notification);
  }

  /**
   * Get notification data for status changes
   */
  private getStatusChangeNotificationData(
    application: AccuApplication,
    oldStatus: ACCUStatus | null,
    newStatus: ACCUStatus,
    reason?: string,
    notes?: string,
  ): Omit<NotificationData, 'userId' | 'tenantId' | 'projectId' | 'accuApplicationId'> {
    const statusMessages = {
      [ACCUStatus.DRAFT]: {
        title: 'ACCU Application Created',
        message: 'A new ACCU application has been created and is in draft status.',
        type: 'info' as const,
      },
      [ACCUStatus.SUBMITTED]: {
        title: 'ACCU Application Submitted',
        message: 'Your ACCU application has been submitted for review.',
        type: 'success' as const,
      },
      [ACCUStatus.UNDER_REVIEW]: {
        title: 'ACCU Application Under Review',
        message: 'Your ACCU application is now under review by our team.',
        type: 'info' as const,
      },
      [ACCUStatus.APPROVED]: {
        title: 'ACCU Application Approved',
        message: 'Your ACCU application has been approved!',
        type: 'success' as const,
      },
      [ACCUStatus.REJECTED]: {
        title: 'ACCU Application Rejected',
        message: 'Your ACCU application has been rejected.',
        type: 'error' as const,
      },
      [ACCUStatus.ISSUED]: {
        title: 'ACCU Units Issued',
        message: 'Your ACCU units have been issued successfully.',
        type: 'success' as const,
      },
    };

    const baseMessage = statusMessages[newStatus];
    let fullMessage = baseMessage.message;

    if (reason) {
      fullMessage += ` Reason: ${reason}`;
    }

    if (notes) {
      fullMessage += ` Notes: ${notes}`;
    }

    return {
      type: baseMessage.type,
      title: baseMessage.title,
      message: fullMessage,
      metadata: {
        oldStatus,
        newStatus,
        reason,
        notes,
        statusChangeTimestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Notify administrators about important status changes
   */
  private async notifyAdmins(application: AccuApplication, newStatus: ACCUStatus, reason?: string): Promise<void> {
    // This would require a way to get admin users
    // For now, we'll create a system notification
    await this.createNotification({
      type: 'info',
      title: 'ACCU Application Status Update',
      message: `ACCU Application ${application.id} status changed to ${newStatus}`,
      tenantId: application.tenantId,
      metadata: {
        applicationId: application.id,
        newStatus,
        reason,
        isAdminNotification: true,
      },
    });
  }
}