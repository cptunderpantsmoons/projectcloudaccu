import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification, NotificationType, NotificationChannel } from '../../../entities/notification.entity';

export interface CreateNotificationDto {
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  userId?: string;
  projectId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(notificationData: CreateNotificationDto): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create(notificationData);
      const savedNotification = await this.notificationRepository.save(notification);
      
      this.logger.log(`Created notification: ${savedNotification.id} - ${savedNotification.title}`);
      return savedNotification;
    } catch (error) {
      this.logger.error(`Error creating notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getNotificationsByUser(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      return await this.notificationRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting notifications for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({ where: { id: notificationId } });
      if (!notification) {
        throw new Error(`Notification with ID ${notificationId} not found`);
      }

      notification.markAsRead();
      return await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      this.logger.log(`Marked all notifications as read for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error marking all notifications as read for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelNotificationsByMetadata(key: string, value: string): Promise<void> {
    try {
      await this.notificationRepository.update(
        { metadata: { [key]: value } as any },
        { expiresAt: new Date() }
      );
      this.logger.log(`Cancelled notifications with metadata ${key}: ${value}`);
    } catch (error) {
      this.logger.error(`Error cancelling notifications: ${error.message}`, error.stack);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationRepository.count({
        where: { userId, isRead: false },
      });
    } catch (error) {
      this.logger.error(`Error getting unread count for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await this.notificationRepository.delete(notificationId);
      this.logger.log(`Deleted notification: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error deleting notification ${notificationId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = new Date();
      await this.notificationRepository.delete({
        expiresAt: LessThan(now),
      });
      this.logger.log('Cleaned up expired notifications');
    } catch (error) {
      this.logger.error(`Error cleaning up expired notifications: ${error.message}`, error.stack);
    }
  }
}