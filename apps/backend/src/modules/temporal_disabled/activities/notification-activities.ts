import { proxyActivities } from '@temporalio/workflow';

export interface NotificationActivities {
  sendEmail(recipient: string, subject: string, body: string, templateId?: string): Promise<void>;
  sendSMS(phoneNumber: string, message: string): Promise<void>;
  sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void>;
  createInAppNotification(userId: string, title: string, message: string, type: string, metadata?: Record<string, any>): Promise<void>;
  scheduleReminder(userId: string, title: string, message: string, scheduledTime: Date, reminderType: string): Promise<void>;
}

export const { 
  sendEmail, 
  sendSMS, 
  sendPushNotification, 
  createInAppNotification, 
  scheduleReminder 
} = proxyActivities<NotificationActivities>({
  startToCloseTimeout: '1 minute',
});