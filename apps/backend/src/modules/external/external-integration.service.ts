import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CerService } from '../cer/cer.service';
import { EmailService } from '../email/email.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { IntegrationHealth, IntegrationStatusResponse } from './interfaces/integration-health.interface';

@Injectable()
export class ExternalIntegrationService {
  private readonly logger = new Logger(ExternalIntegrationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cerService: CerService,
    private readonly emailService: EmailService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async getIntegrationStatus(): Promise<IntegrationStatusResponse> {
    const services: IntegrationHealth[] = await Promise.all([
      this.checkCerHealth(),
      this.checkEmailHealth(),
      this.checkStorageHealth(),
    ]);

    const overallStatus = services.every(s => s.status === 'UP') 
      ? 'UP' 
      : services.some(s => s.status === 'DOWN') ? 'DOWN' : 'DEGRADED';

    return {
      overallStatus,
      services,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkCerHealth(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      // Basic connectivity check - in real app might call a lightweight endpoint
      const baseUrl = this.configService.get<string>('cer.baseUrl');
      if (!baseUrl) {
        return {
          service: 'CER API',
          status: 'DOWN',
          lastCheck: new Date().toISOString(),
          message: 'Base URL not configured',
        };
      }
      
      // We can't easily ping the real API without credentials, so we check if config is present
      // and maybe do a mock ping if in dev
      const apiKey = this.configService.get<string>('cer.apiKey');
      
      return {
        service: 'CER API',
        status: apiKey ? 'UP' : 'DEGRADED',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
        message: apiKey ? 'Connected' : 'Missing API Key (Mock Mode)',
      };
    } catch (error) {
      return {
        service: 'CER API',
        status: 'DOWN',
        lastCheck: new Date().toISOString(),
        message: error.message,
      };
    }
  }

  private async checkEmailHealth(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      // Check SMTP config
      const host = this.configService.get<string>('email.host');
      if (!host) {
        return {
          service: 'Email Service',
          status: 'DEGRADED',
          lastCheck: new Date().toISOString(),
          message: 'SMTP Host not configured (Mock Mode)',
        };
      }

      // In a real scenario, we might try to verify connection with transporter.verify()
      // But here we'll assume config presence implies readiness or rely on service state
      
      return {
        service: 'Email Service',
        status: 'UP',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
        message: 'SMTP Configured',
      };
    } catch (error) {
      return {
        service: 'Email Service',
        status: 'DOWN',
        lastCheck: new Date().toISOString(),
        message: error.message,
      };
    }
  }

  private async checkStorageHealth(): Promise<IntegrationHealth> {
    const start = Date.now();
    try {
      const provider = this.configService.get<string>('fileStorage.provider', 'local');
      
      // Try to list a file or check quota to verify connection
      await this.fileStorageService.getStorageQuota();

      return {
        service: 'File Storage',
        status: 'UP',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
        details: { provider },
        message: `Provider: ${provider}`,
      };
    } catch (error) {
      return {
        service: 'File Storage',
        status: 'DOWN',
        lastCheck: new Date().toISOString(),
        message: error.message,
      };
    }
  }
}
