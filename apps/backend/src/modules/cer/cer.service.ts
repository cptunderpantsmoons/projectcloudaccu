import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmitCerApplicationDto, CerApplicationStatusResponseDto, CerApplicationStatus } from './dto/cer-application.dto';
import { CerApiClientConfig, CerSubmissionResponse } from './interfaces/cer-client.interface';

@Injectable()
export class CerService {
  private readonly logger = new Logger(CerService.name);
  private readonly config: CerApiClientConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      baseUrl: this.configService.get<string>('cer.baseUrl'),
      apiKey: this.configService.get<string>('cer.apiKey'),
      timeout: this.configService.get<number>('cer.timeout', 30000),
    };
  }

  /**
   * Submit ACCU Application to CER
   */
  async submitApplication(submission: SubmitCerApplicationDto): Promise<CerSubmissionResponse> {
    try {
      this.logger.log(`Submitting application for project ${submission.projectId} to CER`);
      
      // Mock API call since we don't have a real endpoint
      if (!this.config.apiKey) {
        this.logger.warn('CER API Key not configured. Using mock response.');
        return this.mockSubmission(submission);
      }

      const response = await fetch(`${this.config.baseUrl}/applications/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        throw new HttpException(
          `CER API Error: ${response.statusText}`, 
          response.status
        );
      }

      const data = await response.json();
      return {
        success: true,
        referenceId: data.referenceId,
        timestamp: new Date().toISOString(),
        status: CerApplicationStatus.SUBMITTED,
      };

    } catch (error) {
      this.logger.error(`Failed to submit application to CER: ${error.message}`, error.stack);
      throw new HttpException(
        'External CER Service Unavailable', 
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  /**
   * Check Application Status
   */
  async checkStatus(referenceId: string): Promise<CerApplicationStatusResponseDto> {
    try {
      if (!this.config.apiKey) {
        return this.mockStatusCheck(referenceId);
      }

      const response = await fetch(`${this.config.baseUrl}/applications/${referenceId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new HttpException(
          `CER API Error: ${response.statusText}`, 
          response.status
        );
      }

      return await response.json();

    } catch (error) {
      this.logger.error(`Failed to check status for ${referenceId}: ${error.message}`);
      throw new HttpException(
        'Failed to retrieve status from CER', 
        HttpStatus.BAD_GATEWAY
      );
    }
  }

  /**
   * Mock Submission for Development
   */
  private mockSubmission(submission: SubmitCerApplicationDto): CerSubmissionResponse {
    return {
      success: true,
      referenceId: `CER-MOCK-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: CerApplicationStatus.SUBMITTED,
      message: 'Mock submission successful',
    };
  }

  /**
   * Mock Status Check
   */
  private mockStatusCheck(referenceId: string): CerApplicationStatusResponseDto {
    return {
      applicationId: 'mock-app-id',
      externalReferenceId: referenceId,
      status: CerApplicationStatus.PENDING,
      lastUpdated: new Date().toISOString(),
      details: {
        stage: 'Initial Review',
        estimatedCompletion: '30 days',
      },
    };
  }
}
