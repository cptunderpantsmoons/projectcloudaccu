import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { Notification } from '../../src/entities/notification.entity';
import { User } from '../../src/entities/user.entity';
import { createMockNotification, createMockUser } from '../setup/unit-setup';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockNotification = createMockNotification();
  const mockUser = createMockUser();

  beforeEach(async () => {
    const mockNotificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(Notification));
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationDto = {
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
        userId: 'user-123',
        tenantId: 'tenant-123',
        projectId: 'project-456',
        metadata: { priority: 'high' },
      };

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.createNotification(notificationDto);

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: notificationDto.type,
        title: notificationDto.title,
        message: notificationDto.message,
        userId: notificationDto.userId,
        tenantId: notificationDto.tenantId,
        projectId: notificationDto.projectId,
      }));
      expect(result).toEqual(mockNotification);
    });

    it('should create notification without optional fields', async () => {
      const notificationDto = {
        type: 'success',
        title: 'Simple Notification',
        message: 'Simple message',
        userId: 'user-123',
        tenantId: 'tenant-123',
      };

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.createNotification(notificationDto);

      expect(result).toBeDefined();
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: notificationDto.type,
        title: notificationDto.title,
        message: notificationDto.message,
        userId: notificationDto.userId,
        tenantId: notificationDto.tenantId,
      }));
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        userId: 'user-123',
        isRead: false,
      };

      const notifications = [mockNotification, { ...mockNotification, id: 'notif-2' }];
      
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(notifications),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll(queryDto);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter notifications by user', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        userId: 'user-123',
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.userId = :userId', { userId: 'user-123' });
    });

    it('should filter notifications by read status', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        isRead: true,
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.isRead = :isRead', { isRead: true });
    });

    it('should filter notifications by type', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        type: 'error',
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.type = :type', { type: 'error' });
    });
  });

  describe('findOne', () => {
    it('should return notification by id', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.findOne('notification-123');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-123' },
      });
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException if notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const unreadNotification = { ...mockNotification, isRead: false };
      const updatedNotification = { ...unreadNotification, isRead: true };

      notificationRepository.findOne.mockResolvedValue(unreadNotification);
      notificationRepository.save.mockResolvedValue(updatedNotification);

      const result = await service.markAsRead('notification-123');

      expect(result.isRead).toBe(true);
      expect(notificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        isRead: true,
      }));
    });

    it('should handle already read notifications', async () => {
      const readNotification = { ...mockNotification, isRead: true };

      notificationRepository.findOne.mockResolvedValue(readNotification);
      notificationRepository.save.mockResolvedValue(readNotification);

      const result = await service.markAsRead('notification-123');

      expect(result.isRead).toBe(true);
      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread', async () => {
      const readNotification = { ...mockNotification, isRead: true };
      const updatedNotification = { ...readNotification, isRead: false };

      notificationRepository.findOne.mockResolvedValue(readNotification);
      notificationRepository.save.mockResolvedValue(updatedNotification);

      const result = await service.markAsUnread('notification-123');

      expect(result.isRead).toBe(false);
      expect(notificationRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        isRead: false,
      }));
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const userId = 'user-123';
      const unreadNotifications = [
        { ...mockNotification, isRead: false },
        { ...mockNotification, id: 'notif-2', isRead: false },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(unreadNotifications),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      notificationRepository.save.mockResolvedValue({ affected: 2 });

      const result = await service.markAllAsRead(userId);

      expect(result.affectedCount).toBe(2);
      expect(notificationRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle case with no unread notifications', async () => {
      const userId = 'user-123';
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.markAllAsRead(userId);

      expect(result.affectedCount).toBe(0);
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const userId = 'user-123';

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.userId = :userId', { userId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.isRead = :isRead', { isRead: false });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      notificationRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteNotification('notification-123');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-123' },
      });
      expect(notificationRepository.delete).toHaveBeenCalledWith('notification-123');
    });

    it('should throw NotFoundException if notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteNotification('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMultipleNotifications', () => {
    it('should delete multiple notifications', async () => {
      const notificationIds = ['notif-1', 'notif-2', 'notif-3'];

      notificationRepository.delete.mockResolvedValue({ affected: 3 });

      const result = await service.deleteMultipleNotifications(notificationIds);

      expect(result.deletedCount).toBe(3);
      expect(notificationRepository.delete).toHaveBeenCalledWith({
        id: notificationIds,
      });
    });

    it('should handle partial deletion failures', async () => {
      const notificationIds = ['notif-1', 'notif-2', 'notif-3'];

      notificationRepository.delete.mockResolvedValue({ affected: 2 });

      const result = await service.deleteMultipleNotifications(notificationIds);

      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toEqual(['notif-3']);
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics for user', async () => {
      const userId = 'user-123';

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
      };

      // Mock different counts
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // unread
        .mockResolvedValueOnce(2)  // error
        .mockResolvedValueOnce(1)  // warning
        .mockResolvedValueOnce(4)  // info
        .mockResolvedValueOnce(3); // success

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getNotificationStats(userId);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('unread');
      expect(result).toHaveProperty('byType');
      expect(result.total).toBe(10);
      expect(result.unread).toBe(3);
      expect(result.byType.error).toBe(2);
      expect(result.byType.warning).toBe(1);
      expect(result.byType.info).toBe(4);
      expect(result.byType.success).toBe(3);
    });
  });

  describe('createBulkNotifications', () => {
    it('should create multiple notifications at once', async () => {
      const notifications = [
        {
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          userId: 'user-123',
          tenantId: 'tenant-123',
        },
        {
          type: 'success',
          title: 'Notification 2',
          message: 'Message 2',
          userId: 'user-456',
          tenantId: 'tenant-123',
        },
      ];

      const createdNotifications = [
        { ...mockNotification, id: 'notif-1' },
        { ...mockNotification, id: 'notif-2' },
      ];

      notificationRepository.create.mockReturnValueOnce(createdNotifications[0]);
      notificationRepository.create.mockReturnValueOnce(createdNotifications[1]);
      notificationRepository.save.mockResolvedValueOnce(createdNotifications[0]);
      notificationRepository.save.mockResolvedValueOnce(createdNotifications[1]);

      const result = await service.createBulkNotifications(notifications);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1');
      expect(result[1].id).toBe('notif-2');
      expect(notificationRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk creation', async () => {
      const notifications = [
        {
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          userId: 'user-123',
          tenantId: 'tenant-123',
        },
        {
          type: 'success',
          title: 'Notification 2',
          message: 'Message 2',
          userId: 'user-456',
          tenantId: 'tenant-123',
        },
      ];

      const createdNotifications = [
        { ...mockNotification, id: 'notif-1' },
        null, // Simulate failure for second notification
      ];

      notificationRepository.create.mockReturnValueOnce(createdNotifications[0]);
      notificationRepository.create.mockReturnValueOnce(createdNotifications[1]);
      notificationRepository.save.mockResolvedValueOnce(createdNotifications[0]);
      notificationRepository.save.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.createBulkNotifications(notifications);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.successful[0].id).toBe('notif-1');
      expect(result.failed[0].index).toBe(1);
    });
  });

  describe('sendSystemNotification', () => {
    it('should send system notification to all users in tenant', async () => {
      const tenantId = 'tenant-123';
      const systemNotification = {
        type: 'warning',
        title: 'System Maintenance',
        message: 'System will be down for maintenance',
        metadata: { scheduledFor: '2024-01-15T02:00:00Z' },
      };

      const users = [
        { ...mockUser, id: 'user-1' },
        { ...mockUser, id: 'user-2', email: 'user2@example.com' },
      ];

      userRepository.find.mockResolvedValue(users);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.sendSystemNotification(tenantId, systemNotification);

      expect(result.totalSent).toBe(2);
      expect(notificationRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle case with no users in tenant', async () => {
      const tenantId = 'tenant-empty';
      const systemNotification = {
        type: 'info',
        title: 'Test',
        message: 'Test message',
      };

      userRepository.find.mockResolvedValue([]);

      const result = await service.sendSystemNotification(tenantId, systemNotification);

      expect(result.totalSent).toBe(0);
      expect(notificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('pruneOldNotifications', () => {
    it('should prune notifications older than specified days', async () => {
      const daysOld = 30;
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      notificationRepository.delete.mockResolvedValue({ affected: 5 });

      const result = await service.pruneOldNotifications(daysOld);

      expect(result.deletedCount).toBe(5);
      expect(notificationRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.objectContaining({
            _type: 'lessThan',
            _value: cutoffDate,
          }),
        })
      );
    });
  });

  describe('getRecentNotifications', () => {
    it('should return recent notifications for user', async () => {
      const userId = 'user-123';
      const limit = 5;

      const recentNotifications = [
        { ...mockNotification, createdAt: new Date(Date.now() - 1000) },
        { ...mockNotification, id: 'notif-2', createdAt: new Date(Date.now() - 2000) },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(recentNotifications),
      };

      notificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRecentNotifications(userId, limit);

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('notification.createdAt', 'DESC');
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(limit);
    });
  });
});