import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailTemplate {
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('email.from', 'noreply@accu-platform.com');
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('email.host');
    const port = this.configService.get<number>('email.port');
    const user = this.configService.get<string>('email.user');
    const pass = this.configService.get<string>('email.password');
    const secure = this.configService.get<boolean>('email.secure', false);

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`Email service initialized with host: ${host}`);
    } else {
      this.logger.warn('Email configuration missing. Email service will run in mock mode.');
      // Create a mock transporter for development/testing
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  async sendEmail(to: string, subject: string, html: string, attachments?: any[]): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
        attachments,
      });

      this.logger.log(`Email sent to ${to}: ${info.messageId || 'mock-id'}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(name);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
    const template = this.getPasswordResetTemplate(resetLink);
    return this.sendEmail(to, template.subject, template.html);
  }

  async sendStatusUpdateEmail(to: string, applicationId: string, status: string, notes?: string): Promise<boolean> {
    const template = this.getStatusUpdateTemplate(applicationId, status, notes);
    return this.sendEmail(to, template.subject, template.html);
  }

  // Templates
  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: 'Welcome to ACCU Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome, ${name}!</h2>
          <p>Thank you for joining the ACCU Platform. We're excited to have you on board.</p>
          <p>You can now log in to manage your carbon credit projects and applications.</p>
          <br>
          <p>Best regards,</p>
          <p>The ACCU Platform Team</p>
        </div>
      `,
    };
  }

  private getPasswordResetTemplate(link: string): EmailTemplate {
    return {
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the link below to proceed:</p>
          <p><a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };
  }

  private getStatusUpdateTemplate(appId: string, status: string, notes?: string): EmailTemplate {
    return {
      subject: `Update on ACCU Application ${appId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Application Status Update</h2>
          <p>Your application <strong>${appId}</strong> has moved to status: <strong>${status}</strong>.</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          <p>Log in to the platform for full details.</p>
        </div>
      `,
    };
  }
}
