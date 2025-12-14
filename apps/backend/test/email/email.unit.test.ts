import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../src/modules/email/email.service';
import { EmailController } from '../../src/modules/email/email.controller';
import { createMockUser } from '../setup/unit-setup';

describe('EmailService', () => {
  let service: EmailService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
      request: jest.fn(),
    };

    configService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailDto = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        template: 'welcome',
        variables: {
          name: 'John Doe',
          verificationUrl: 'https://example.com/verify',
        },
      };

      const emailApiResponse = {
        status: 'sent',
        messageId: 'msg-123',
        timestamp: new Date().toISOString(),
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: emailApiResponse });

      const result = await service.sendEmail(emailDto);

      expect(result).toEqual(emailApiResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.email-service.com/send',
        expect.objectContaining({
          to: emailDto.to,
          subject: emailDto.subject,
          template: emailDto.template,
          variables: emailDto.variables,
        }),
        expect.any(Object)
      );
    });

    it('should send email with HTML content', async () => {
      const emailDto = {
        to: 'recipient@example.com',
        subject: 'Custom HTML Email',
        html: '<h1>Welcome</h1><p>This is a custom HTML email.</p>',
        text: 'Welcome - This is a custom email.',
        from: 'noreply@accu-platform.com',
      };

      const emailApiResponse = {
        status: 'sent',
        messageId: 'msg-456',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: emailApiResponse });

      const result = await service.sendEmail(emailDto);

      expect(result).toEqual(emailApiResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.email-service.com/send',
        expect.objectContaining({
          to: emailDto.to,
          subject: emailDto.subject,
          html: emailDto.html,
          text: emailDto.text,
          from: emailDto.from,
        }),
        expect.any(Object)
      );
    });

    it('should handle email service errors', async () => {
      const emailDto = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        template: 'welcome',
      };

      const errorResponse = {
        status: 'error',
        message: 'Invalid email address',
        code: 'INVALID_EMAIL',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockRejectedValue({
        response: { data: errorResponse },
        message: 'Email service error',
      });

      await expect(service.sendEmail(emailDto)).rejects.toThrow();
    });

    it('should use default sender if not specified', async () => {
      const emailDto = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        template: 'welcome',
      };

      const emailApiResponse = {
        status: 'sent',
        messageId: 'msg-789',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      configService.getOrThrow.mockReturnValue('noreply@accu-platform.com');
      httpService.post.mockResolvedValue({ data: emailApiResponse });

      const result = await service.sendEmail(emailDto);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          from: 'noreply@accu-platform.com',
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk emails successfully', async () => {
      const bulkEmailDto = {
        recipients: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
        subject: 'Bulk Test Email',
        template: 'notification',
        variables: {
          message: 'This is a bulk email',
        },
      };

      const bulkResponse = {
        status: 'sent',
        totalSent: 2,
        failed: 0,
        messageIds: ['msg-1', 'msg-2'],
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: bulkResponse });

      const result = await service.sendBulkEmail(bulkEmailDto);

      expect(result).toEqual(bulkResponse);
      expect(result.totalSent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in bulk sending', async () => {
      const bulkEmailDto = {
        recipients: [
          { email: 'valid@example.com', name: 'Valid User' },
          { email: 'invalid', name: 'Invalid User' },
        ],
        subject: 'Bulk Test Email',
        template: 'notification',
      };

      const bulkResponse = {
        status: 'partial',
        totalSent: 1,
        failed: 1,
        errors: [
          { email: 'invalid', error: 'Invalid email format' },
        ],
        messageIds: ['msg-1'],
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: bulkResponse });

      const result = await service.sendBulkEmail(bulkEmailDto);

      expect(result.status).toBe('partial');
      expect(result.totalSent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with verification link', async () => {
      const user = createMockUser();
      const verificationToken = 'verification-token-123';

      const welcomeResponse = {
        status: 'sent',
        messageId: 'welcome-msg',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: welcomeResponse });

      const result = await service.sendWelcomeEmail(user, verificationToken);

      expect(result).toEqual(welcomeResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: user.email,
          subject: 'Welcome to ACCU Platform',
          template: 'welcome',
          variables: {
            name: `${user.firstName} ${user.lastName}`,
            verificationUrl: expect.stringContaining(verificationToken),
            platformName: 'ACCU Platform',
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      const user = createMockUser();
      const resetToken = 'reset-token-456';

      const resetResponse = {
        status: 'sent',
        messageId: 'reset-msg',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: resetResponse });

      const result = await service.sendPasswordResetEmail(user, resetToken);

      expect(result).toEqual(resetResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: user.email,
          subject: 'Password Reset Request',
          template: 'password-reset',
          variables: {
            name: `${user.firstName} ${user.lastName}`,
            resetUrl: expect.stringContaining(resetToken),
            expiryTime: '1 hour',
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send notification email', async () => {
      const user = createMockUser();
      const notification = {
        title: 'Project Update',
        message: 'Your project has been updated',
        type: 'info',
        actionUrl: 'https://app.example.com/projects/123',
      };

      const notificationResponse = {
        status: 'sent',
        messageId: 'notification-msg',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: notificationResponse });

      const result = await service.sendNotificationEmail(user, notification);

      expect(result).toEqual(notificationResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: user.email,
          subject: 'Project Update',
          template: 'notification',
          variables: {
            name: `${user.firstName} ${user.lastName}`,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.actionUrl,
            type: notification.type,
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendACCuStatusUpdateEmail', () => {
    it('should send ACCU application status update email', async () => {
      const user = createMockUser();
      const accuApp = {
        id: 'accu-app-123',
        status: 'submitted',
        accuUnits: 1000,
        projectName: 'Solar Farm Project',
      };

      const statusUpdateResponse = {
        status: 'sent',
        messageId: 'status-update-msg',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: statusUpdateResponse });

      const result = await service.sendACCuStatusUpdateEmail(user, accuApp, 'submitted', 'approved');

      expect(result).toEqual(statusUpdateResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: user.email,
          subject: 'ACCU Application Status Update',
          template: 'accu-status-update',
          variables: {
            name: `${user.firstName} ${user.lastName}`,
            projectName: accuApp.projectName,
            oldStatus: 'approved',
            newStatus: 'submitted',
            accuUnits: accuApp.accuUnits,
            applicationId: accuApp.id,
            statusUrl: expect.stringContaining(accuApp.id),
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendDeadlineReminderEmail', () => {
    it('should send deadline reminder email', async () => {
      const user = createMockUser();
      const deadline = {
        title: 'ACCU Application Due',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        projectName: 'Solar Farm Project',
        type: 'accu_application',
      };

      const reminderResponse = {
        status: 'sent',
        messageId: 'deadline-reminder-msg',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: reminderResponse });

      const result = await service.sendDeadlineReminderEmail(user, deadline);

      expect(result).toEqual(reminderResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: user.email,
          subject: 'Deadline Reminder: ACCU Application Due',
          template: 'deadline-reminder',
          variables: {
            name: `${user.firstName} ${user.lastName}`,
            deadlineTitle: deadline.title,
            dueDate: expect.any(Date),
            daysUntilDeadline: 7,
            projectName: deadline.projectName,
            type: deadline.type,
            actionUrl: expect.stringContaining('/deadlines'),
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('sendCalendarInviteEmail', () => {
    it('should send calendar invitation email', async () => {
      const user = createMockUser();
      const invite = {
        title: 'Project Review Meeting',
        description: 'Quarterly project review',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 26 * 60 * 60 * 1000), // Tomorrow + 2 hours
        location: 'Conference Room A',
        organizer: 'Project Manager',
        attendees: ['user1@example.com', 'user2@example.com'],
      };

      const inviteResponse = {
        status: 'sent',
        messageId: 'calendar-invite-msg',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: inviteResponse });

      const result = await service.sendCalendarInviteEmail(user, invite);

      expect(result).toEqual(inviteResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          to: user.email,
          subject: 'Meeting Invitation: Project Review Meeting',
          template: 'calendar-invite',
          variables: {
            name: `${user.firstName} ${user.lastName}`,
            eventTitle: invite.title,
            description: invite.description,
            startDate: expect.any(Date),
            endDate: expect.any(Date),
            location: invite.location,
            organizer: invite.organizer,
            attendees: invite.attendees,
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('getEmailTemplates', () => {
    it('should fetch available email templates', async () => {
      const templatesResponse = {
        status: 'success',
        templates: [
          {
            id: 'welcome',
            name: 'Welcome Email',
            description: 'Welcome new users',
            subject: 'Welcome to {{platformName}}',
          },
          {
            id: 'password-reset',
            name: 'Password Reset',
            description: 'Password reset instructions',
            subject: 'Reset your {{platformName}} password',
          },
        ],
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.get.mockResolvedValue({ data: templatesResponse });

      const result = await service.getEmailTemplates();

      expect(result).toEqual(templatesResponse.templates);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.email-service.com/templates',
        expect.any(Object)
      );
    });
  });

  describe('getEmailStats', () => {
    it('should fetch email statistics', async () => {
      const statsResponse = {
        status: 'success',
        stats: {
          totalSent: 1500,
          delivered: 1450,
          bounced: 30,
          opened: 800,
          clicked: 200,
          unsubscribed: 10,
        },
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.get.mockResolvedValue({ data: statsResponse });

      const result = await service.getEmailStats();

      expect(result).toEqual(statsResponse.stats);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.email-service.com/stats',
        expect.any(Object)
      );
    });
  });

  describe('validateEmailAddress', () => {
    it('should validate email address format', async () => {
      const email = 'user@example.com';
      const validationResponse = {
        status: 'valid',
        email,
        format: 'valid',
        domain: 'example.com',
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: validationResponse });

      const result = await service.validateEmailAddress(email);

      expect(result).toEqual(validationResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.email-service.com/validate',
        { email },
        expect.any(Object)
      );
    });

    it('should handle invalid email addresses', async () => {
      const email = 'invalid-email';
      const validationResponse = {
        status: 'invalid',
        email,
        errors: ['Invalid email format'],
      };

      configService.get.mockReturnValue('https://api.email-service.com');
      httpService.post.mockResolvedValue({ data: validationResponse });

      const result = await service.validateEmailAddress(email);

      expect(result.status).toBe('invalid');
      expect(result.errors).toContain('Invalid email format');
    });
  });
});

describe('EmailController', () => {
  let controller: EmailController;
  let service: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const mockService = {
      sendEmail: jest.fn(),
      sendBulkEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendNotificationEmail: jest.fn(),
      sendACCuStatusUpdateEmail: jest.fn(),
      sendDeadlineReminderEmail: jest.fn(),
      sendCalendarInviteEmail: jest.fn(),
      getEmailTemplates: jest.fn(),
      getEmailStats: jest.fn(),
      validateEmailAddress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
    service = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send a single email', async () => {
      const emailDto = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        template: 'welcome',
      };

      const mockResponse = {
        status: 'sent',
        messageId: 'msg-123',
      };

      service.sendEmail.mockResolvedValue(mockResponse);

      const result = await controller.sendEmail(emailDto);

      expect(service.sendEmail).toHaveBeenCalledWith(emailDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk emails', async () => {
      const bulkEmailDto = {
        recipients: [
          { email: 'user1@example.com', name: 'User 1' },
        ],
        subject: 'Bulk Email',
        template: 'notification',
      };

      const mockResponse = {
        status: 'sent',
        totalSent: 1,
        failed: 0,
      };

      service.sendBulkEmail.mockResolvedValue(mockResponse);

      const result = await controller.sendBulkEmail(bulkEmailDto);

      expect(service.sendBulkEmail).toHaveBeenCalledWith(bulkEmailDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTemplates', () => {
    it('should return email templates', async () => {
      const templates = [
        { id: 'welcome', name: 'Welcome Email' },
      ];

      service.getEmailTemplates.mockResolvedValue(templates);

      const result = await controller.getTemplates();

      expect(service.getEmailTemplates).toHaveBeenCalled();
      expect(result).toEqual(templates);
    });
  });

  describe('getStats', () => {
    it('should return email statistics', async () => {
      const stats = {
        totalSent: 1000,
        delivered: 950,
        bounced: 50,
      };

      service.getEmailStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(service.getEmailStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('validateEmail', () => {
    it('should validate email address', async () => {
      const emailDto = {
        email: 'user@example.com',
      };

      const validationResult = {
        status: 'valid',
        email: 'user@example.com',
        format: 'valid',
      };

      service.validateEmailAddress.mockResolvedValue(validationResult);

      const result = await controller.validateEmail(emailDto);

      expect(service.validateEmailAddress).toHaveBeenCalledWith(emailDto.email);
      expect(result).toEqual(validationResult);
    });
  });
});