import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, WorkflowExecutionStatus } from '@temporalio/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccuApplication } from '../entities/accu-application.entity';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { Notification } from '../entities/notification.entity';

export interface WorkflowMetrics {
  totalWorkflows: number;
  runningWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  terminatedWorkflows: number;
  averageExecutionTime: number;
  workflowTypes: Record<string, number>;
  statusDistribution: Record<string, number>;
}

export interface FailedWorkflowRecovery {
  workflowId: string;
  workflowType: string;
  failureReason: string;
  failureTime: Date;
  retryCount: number;
  lastRetryTime?: Date;
  recoveryAction: 'retry' | 'terminate' | 'escalate' | 'manual_intervention';
  recoveryStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
}

@Injectable()
export class WorkflowMonitoringService {
  private readonly logger = new Logger(WorkflowMonitoringService.name);
  private temporalClient: Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(AccuApplication)
    private accuApplicationRepository: Repository<AccuApplication>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {
    this.initializeTemporalClient();
  }

  private initializeTemporalClient() {
    this.temporalClient = new Client({
      address: this.configService.get('temporal.address'),
      namespace: this.configService.get('temporal.namespace'),
    });
  }

  // Get workflow metrics
  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    try {
      const workflows = await this.temporalClient.workflow.list();
      
      const metrics: WorkflowMetrics = {
        totalWorkflows: workflows.length,
        runningWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        terminatedWorkflows: 0,
        averageExecutionTime: 0,
        workflowTypes: {},
        statusDistribution: {},
      };

      let totalExecutionTime = 0;
      let completedCount = 0;

      for (const workflow of workflows) {
        // Count by status
        const status = this.mapWorkflowStatus(workflow.status);
        metrics.statusDistribution[status] = (metrics.statusDistribution[status] || 0) + 1;

        // Count by type
        const workflowType = workflow.type?.name || 'unknown';
        metrics.workflowTypes[workflowType] = (metrics.workflowTypes[workflowType] || 0) + 1;

        // Count specific statuses
        switch (workflow.status) {
          case WorkflowExecutionStatus.RUNNING:
            metrics.runningWorkflows++;
            break;
          case WorkflowExecutionStatus.COMPLETED:
            metrics.completedWorkflows++;
            if (workflow.startTime && workflow.closeTime) {
              const executionTime = workflow.closeTime.getTime() - workflow.startTime.getTime();
              totalExecutionTime += executionTime;
              completedCount++;
            }
            break;
          case WorkflowExecutionStatus.FAILED:
            metrics.failedWorkflows++;
            break;
          case WorkflowExecutionStatus.TERMINATED:
            metrics.terminatedWorkflows++;
            break;
        }
      }

      metrics.averageExecutionTime = completedCount > 0 ? totalExecutionTime / completedCount : 0;

      return metrics;

    } catch (error) {
      this.logger.error(`Failed to get workflow metrics: ${error.message}`);
      throw error;
    }
  }

  // Get failed workflows for recovery
  async getFailedWorkflows(): Promise<FailedWorkflowRecovery[]> {
    try {
      const failedWorkflows: FailedWorkflowRecovery[] = [];
      const workflows = await this.temporalClient.workflow.list('WorkflowType="*" and Status="FAILED"');

      for (const workflow of workflows) {
        const recovery: FailedWorkflowRecovery = {
          workflowId: workflow.workflowId,
          workflowType: workflow.type?.name || 'unknown',
          failureReason: 'Unknown failure reason', // This would come from workflow history
          failureTime: workflow.closeTime || new Date(),
          retryCount: 0,
          recoveryAction: this.determineRecoveryAction(workflow),
          recoveryStatus: 'pending',
        };

        failedWorkflows.push(recovery);
      }

      return failedWorkflows;

    } catch (error) {
      this.logger.error(`Failed to get failed workflows: ${error.message}`);
      return [];
    }
  }

  // Retry failed workflow
  async retryFailedWorkflow(workflowId: string, reason?: string): Promise<boolean> {
    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);
      
      // Terminate the failed workflow first
      await handle.terminate(`Retry initiated: ${reason || 'Manual retry'}`);
      
      // Restart the workflow with the same ID
      const workflowType = await this.extractWorkflowType(workflowId);
      if (workflowType) {
        await this.restartWorkflow(workflowType, workflowId, reason);
        this.logger.log(`Successfully restarted workflow: ${workflowId}`);
        return true;
      }

      return false;

    } catch (error) {
      this.logger.error(`Failed to retry workflow ${workflowId}: ${error.message}`);
      return false;
    }
  }

  // Escalate failed workflow
  async escalateFailedWorkflow(workflowId: string, escalationLevel: string, reason?: string): Promise<boolean> {
    try {
      const workflow = await this.getWorkflowStatus(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create escalation notification
      const escalationNotification = this.notificationRepository.create({
        userId: await this.getEscalationRecipient(escalationLevel),
        title: 'Workflow Escalation Required',
        message: `Workflow ${workflowId} has failed and requires escalation. Reason: ${reason || 'System escalation'}`,
        type: 'workflow_escalation',
        metadata: {
          workflowId,
          workflowType: workflow.type,
          escalationLevel,
          originalFailure: workflow.failureReason,
        },
        read: false,
      });

      await this.notificationRepository.save(escalationNotification);

      // Send email to escalation recipient
      await this.sendEscalationEmail(workflowId, escalationLevel, reason);

      this.logger.log(`Escalated workflow ${workflowId} to level ${escalationLevel}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to escalate workflow ${workflowId}: ${error.message}`);
      return false;
    }
  }

  // Manual workflow intervention
  async performManualIntervention(workflowId: string, action: string, parameters: Record<string, any>, performedBy: string): Promise<boolean> {
    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);

      switch (action) {
        case 'signal':
          if (parameters.signalName && parameters.signalData) {
            await handle.signal(parameters.signalName, parameters.signalData);
          }
          break;
          
        case 'terminate':
          await handle.terminate(parameters.reason || 'Manual intervention termination');
          break;
          
        case 'query':
          if (parameters.queryName) {
            const result = await handle.query(parameters.queryName, ...(parameters.queryArgs || []));
            return { result };
          }
          break;
          
        default:
          throw new Error(`Unknown intervention action: ${action}`);
      }

      // Log the intervention
      await this.logManualIntervention(workflowId, action, parameters, performedBy);

      this.logger.log(`Performed manual intervention on workflow ${workflowId}: ${action}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to perform manual intervention on workflow ${workflowId}: ${error.message}`);
      return false;
    }
  }

  // Get workflow audit trail
  async getWorkflowAuditTrail(workflowId: string): Promise<any[]> {
    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);
      const history = await handle.fetchHistory();

      return history.events.map(event => ({
        timestamp: event.timestamp,
        eventType: event.eventType,
        eventId: event.eventId,
        attributes: this.sanitizeEventAttributes(event.attributes),
      }));

    } catch (error) {
      this.logger.error(`Failed to get audit trail for workflow ${workflowId}: ${error.message}`);
      return [];
    }
  }

  // Scheduled monitoring tasks
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorWorkflowHealth() {
    this.logger.log('Running workflow health monitoring');

    try {
      const metrics = await this.getWorkflowMetrics();
      
      // Check for concerning metrics
      if (metrics.failedWorkflows > metrics.totalWorkflows * 0.1) { // More than 10% failed
        await this.alertHighFailureRate(metrics);
      }

      if (metrics.runningWorkflows > 100) { // High number of running workflows
        await this.alertHighWorkflowLoad(metrics);
      }

      // Check for stuck workflows
      await this.checkForStuckWorkflows();

    } catch (error) {
      this.logger.error(`Workflow health monitoring failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkFailedWorkflows() {
    this.logger.log('Checking for failed workflows requiring attention');

    try {
      const failedWorkflows = await this.getFailedWorkflows();
      
      for (const failedWorkflow of failedWorkflows) {
        if (failedWorkflow.recoveryStatus === 'pending') {
          // Auto-retry certain types of failures
          if (this.shouldAutoRetry(failedWorkflow)) {
            const success = await this.retryFailedWorkflow(failedWorkflow.workflowId, 'Auto-retry due to transient failure');
            if (success) {
              failedWorkflow.recoveryStatus = 'completed';
            }
          } else {
            // Escalate to manual intervention
            await this.escalateFailedWorkflow(failedWorkflow.workflowId, 'manager', 'Requires manual intervention');
            failedWorkflow.recoveryStatus = 'in_progress';
          }
        }
      }

    } catch (error) {
      this.logger.error(`Failed workflow check failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyWorkflowReport() {
    this.logger.log('Generating daily workflow report');

    try {
      const metrics = await this.getWorkflowMetrics();
      const report = {
        date: new Date(),
        metrics,
        summary: this.generateReportSummary(metrics),
        recommendations: this.generateRecommendations(metrics),
      };

      // Send report to administrators
      await this.sendDailyReport(report);

    } catch (error) {
      this.logger.error(`Failed to generate daily workflow report: ${error.message}`);
    }
  }

  // Helper methods
  private mapWorkflowStatus(status: WorkflowExecutionStatus): string {
    switch (status) {
      case WorkflowExecutionStatus.RUNNING:
        return 'running';
      case WorkflowExecutionStatus.COMPLETED:
        return 'completed';
      case WorkflowExecutionStatus.FAILED:
        return 'failed';
      case WorkflowExecutionStatus.TERMINATED:
        return 'terminated';
      case WorkflowExecutionStatus.CANCELED:
        return 'canceled';
      default:
        return 'unknown';
    }
  }

  private determineRecoveryAction(workflow: any): 'retry' | 'terminate' | 'escalate' | 'manual_intervention' {
    const workflowType = workflow.type?.name || '';
    
    // Auto-retry for transient failures in certain workflow types
    if (workflowType.includes('document') || workflowType.includes('notification')) {
      return 'retry';
    }
    
    // Escalate critical workflows
    if (workflowType.includes('accu_application') || workflowType.includes('project')) {
      return 'escalate';
    }
    
    return 'manual_intervention';
  }

  private shouldAutoRetry(failedWorkflow: FailedWorkflowRecovery): boolean {
    // Only auto-retry if it hasn't been retried too many times
    if (failedWorkflow.retryCount >= 3) {
      return false;
    }
    
    // Auto-retry certain workflow types
    return ['DocumentWorkflow', 'NotificationWorkflow'].includes(failedWorkflow.workflowType);
  }

  private async extractWorkflowType(workflowId: string): Promise<string | null> {
    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);
      const description = await handle.describe();
      return description.type?.name || null;
    } catch (error) {
      return null;
    }
  }

  private async restartWorkflow(workflowType: string, workflowId: string, reason?: string): Promise<void> {
    // This would restart the workflow based on its type
    // Implementation would depend on how workflows are created
    this.logger.log(`Restarting workflow ${workflowId} of type ${workflowType}`);
  }

  private async getWorkflowStatus(workflowId: string): Promise<any> {
    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);
      const description = await handle.describe();
      return {
        workflowId,
        type: description.type?.name,
        status: description.status,
        failureReason: description.failureReason,
      };
    } catch (error) {
      return null;
    }
  }

  private async getEscalationRecipient(escalationLevel: string): Promise<string> {
    // This would lookup the appropriate user based on escalation level
    switch (escalationLevel) {
      case 'team_lead':
        return 'team.lead@accu.com';
      case 'manager':
        return 'manager@accu.com';
      case 'senior_manager':
        return 'senior.manager@accu.com';
      default:
        return 'admin@accu.com';
    }
  }

  private async sendEscalationEmail(workflowId: string, escalationLevel: string, reason?: string): Promise<void> {
    // Implementation would send email via the email service
    this.logger.log(`Sending escalation email for workflow ${workflowId} to level ${escalationLevel}`);
  }

  private sanitizeEventAttributes(attributes: any): any {
    // Remove sensitive information from event attributes
    if (attributes && typeof attributes === 'object') {
      const sanitized = { ...attributes };
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      return sanitized;
    }
    return attributes;
  }

  private async logManualIntervention(workflowId: string, action: string, parameters: Record<string, any>, performedBy: string): Promise<void> {
    // Log manual intervention to database or audit system
    this.logger.log(`Manual intervention on ${workflowId}: ${action} by ${performedBy}`);
  }

  private async checkForStuckWorkflows(): Promise<void> {
    // Check for workflows that have been running for too long
    const workflows = await this.temporalClient.workflow.list('Status="RUNNING"');
    const stuckThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const workflow of workflows) {
      if (workflow.startTime && (Date.now() - workflow.startTime.getTime()) > stuckThreshold) {
        await this.handleStuckWorkflow(workflow);
      }
    }
  }

  private async handleStuckWorkflow(workflow: any): Promise<void> {
    // Handle workflows that have been running too long
    this.logger.warn(`Found stuck workflow: ${workflow.workflowId}`);
    
    // Could send alert, auto-terminate, or escalate
    await this.alertStuckWorkflow(workflow);
  }

  private async alertHighFailureRate(metrics: WorkflowMetrics): Promise<void> {
    // Send alert about high failure rate
    this.logger.error(`High workflow failure rate detected: ${metrics.failedWorkflows}/${metrics.totalWorkflows}`);
  }

  private async alertHighWorkflowLoad(metrics: WorkflowMetrics): Promise<void> {
    // Send alert about high workflow load
    this.logger.warn(`High workflow load detected: ${metrics.runningWorkflows} running workflows`);
  }

  private async alertStuckWorkflow(workflow: any): Promise<void> {
    // Send alert about stuck workflow
    this.logger.warn(`Stuck workflow detected: ${workflow.workflowId}`);
  }

  private generateReportSummary(metrics: WorkflowMetrics): string {
    return `Daily workflow report: ${metrics.totalWorkflows} total, ${metrics.runningWorkflows} running, ${metrics.completedWorkflows} completed, ${metrics.failedWorkflows} failed`;
  }

  private generateRecommendations(metrics: WorkflowMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.failedWorkflows > metrics.totalWorkflows * 0.05) {
      recommendations.push('Investigate high failure rate in workflows');
    }
    
    if (metrics.averageExecutionTime > 60 * 60 * 1000) { // 1 hour
      recommendations.push('Consider optimizing long-running workflows');
    }
    
    return recommendations;
  }

  private async sendDailyReport(report: any): Promise<void> {
    // Send daily report to administrators
    this.logger.log('Sending daily workflow report');
  }
}