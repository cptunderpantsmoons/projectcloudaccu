import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client, WorkflowExecutionStatus } from '@temporalio/client';
import { AccuApplication } from '../entities/accu-application.entity';
import { Project } from '../entities/project.entity';
import { Document } from '../entities/document.entity';
import { CalendarEvent } from '../entities/calendar-event.entity';

@Injectable()
export class WorkflowOrchestratorService {
  private readonly logger = new Logger(WorkflowOrchestratorService.name);
  private temporalClient: Client;

  constructor(
    private configService: ConfigService,
    @InjectRepository(AccuApplication)
    private accuApplicationRepository: Repository<AccuApplication>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(CalendarEvent)
    private calendarEventRepository: Repository<CalendarEvent>,
  ) {
    this.initializeTemporalClient();
  }

  private initializeTemporalClient() {
    this.temporalClient = new Client({
      address: this.configService.get('temporal.address'),
      namespace: this.configService.get('temporal.namespace'),
    });
  }

  // ACCU Application Workflow Triggers
  async triggerAccuApplicationWorkflow(applicationId: string, triggerType: 'create' | 'submit' | 'approve' | 'reject' | 'issue'): Promise<string> {
    try {
      const application = await this.accuApplicationRepository.findOne({
        where: { id: applicationId },
        relations: ['project'],
      });

      if (!application) {
        throw new Error(`ACCU Application ${applicationId} not found`);
      }

      const workflowId = `accu-application-${applicationId}`;
      const handle = this.temporalClient.workflow.getHandle(workflowId);

      switch (triggerType) {
        case 'create':
          return await this.createAccuApplicationWorkflow(application);
        case 'submit':
          await handle.signal('submitApplication');
          break;
        case 'approve':
          await handle.signal('approveApplication', 'system-approver', 'Auto-approved by system');
          break;
        case 'reject':
          await handle.signal('rejectApplication', 'system-approver', 'Auto-rejected by system');
          break;
        case 'issue':
          await handle.signal('issueCertificate', 'system-issuer');
          break;
      }

      this.logger.log(`Triggered ${triggerType} workflow for ACCU Application ${applicationId}`);
      return workflowId;

    } catch (error) {
      this.logger.error(`Failed to trigger ACCU Application workflow: ${error.message}`);
      throw error;
    }
  }

  private async createAccuApplicationWorkflow(application: AccuApplication): Promise<string> {
    const workflowId = `accu-application-${application.id}`;

    const handle = await this.temporalClient.workflow.start('AccuApplicationWorkflow', {
      taskQueue: this.configService.get('temporal.taskQueue'),
      workflowId,
      args: [{
        applicationId: application.id,
        initialStatus: application.status,
        submitterId: application.project?.ownerId || 'system',
        projectId: application.projectId,
        accuUnits: application.accuUnits,
        methodologyId: application.methodologyId,
        applicationData: application.applicationData,
      }],
    });

    this.logger.log(`Created ACCU Application workflow: ${workflowId}`);
    return workflowId;
  }

  // Project Workflow Triggers
  async triggerProjectWorkflow(projectId: string, triggerType: 'create' | 'start' | 'pause' | 'resume' | 'complete' | 'cancel'): Promise<string> {
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const workflowId = `project-${projectId}`;
      const handle = this.temporalClient.workflow.getHandle(workflowId);

      switch (triggerType) {
        case 'create':
          return await this.createProjectWorkflow(project);
        case 'start':
          await handle.signal('startProject', project.ownerId);
          break;
        case 'pause':
          await handle.signal('pauseProject', 'system');
          break;
        case 'resume':
          await handle.signal('resumeProject', 'system');
          break;
        case 'complete':
          await handle.signal('completeProject', project.ownerId, 'Manually completed');
          break;
        case 'cancel':
          await handle.signal('cancelProject', 'system', 'System cancellation');
          break;
      }

      this.logger.log(`Triggered ${triggerType} workflow for Project ${projectId}`);
      return workflowId;

    } catch (error) {
      this.logger.error(`Failed to trigger Project workflow: ${error.message}`);
      throw error;
    }
  }

  private async createProjectWorkflow(project: Project): Promise<string> {
    const workflowId = `project-${project.id}`;

    const handle = await this.temporalClient.workflow.start('ProjectWorkflow', {
      taskQueue: this.configService.get('temporal.taskQueue'),
      workflowId,
      args: [{
        projectId: project.id,
        name: project.name,
        description: project.description,
        type: project.type,
        startDate: project.startDate,
        endDate: project.endDate,
        ownerId: project.ownerId,
        methodologyId: project.methodology?.id,
      }],
    });

    this.logger.log(`Created Project workflow: ${workflowId}`);
    return workflowId;
  }

  // Document Workflow Triggers
  async triggerDocumentWorkflow(documentId: string, triggerType: 'create' | 'submit_review' | 'approve' | 'reject' | 'publish' | 'archive'): Promise<string> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        relations: ['uploadedBy'],
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      const workflowId = `document-${documentId}`;
      const handle = this.temporalClient.workflow.getHandle(workflowId);

      switch (triggerType) {
        case 'create':
          return await this.createDocumentWorkflow(document);
        case 'submit_review':
          await handle.signal('submitForReview', document.uploadedById);
          break;
        case 'approve':
          await handle.signal('approveDocument', 'system-approver', 'Auto-approved by system');
          break;
        case 'reject':
          await handle.signal('rejectDocument', 'system-reviewer', 'Auto-rejected by system');
          break;
        case 'publish':
          await handle.signal('publishDocument', 'system-publisher');
          break;
        case 'archive':
          await handle.signal('archiveDocument', 'system-archiver', 'Auto-archived by system');
          break;
      }

      this.logger.log(`Triggered ${triggerType} workflow for Document ${documentId}`);
      return workflowId;

    } catch (error) {
      this.logger.error(`Failed to trigger Document workflow: ${error.message}`);
      throw error;
    }
  }

  private async createDocumentWorkflow(document: Document): Promise<string> {
    const workflowId = `document-${document.id}`;

    const handle = await this.temporalClient.workflow.start('DocumentWorkflow', {
      taskQueue: this.configService.get('temporal.taskQueue'),
      workflowId,
      args: [{
        documentId: document.id,
        name: document.name,
        description: document.description,
        category: document.category,
        filePath: document.filePath,
        fileName: document.originalFileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        uploadedById: document.uploadedById,
        projectId: document.projectId,
        tags: document.tags,
        classificationLevel: document.metadata?.classificationLevel || 'internal',
      }],
    });

    this.logger.log(`Created Document workflow: ${workflowId}`);
    return workflowId;
  }

  // Calendar Workflow Triggers
  async triggerCalendarWorkflow(entityType: string, entityId: string, triggerType: 'create_deadline' | 'schedule_reminder' | 'escalate' | 'generate_report'): Promise<string> {
    try {
      const workflowId = `calendar-${entityType}-${entityId}`;

      switch (triggerType) {
        case 'create_deadline':
          return await this.createCalendarWorkflow(entityType, entityId);
        case 'schedule_reminder':
          const handle = this.temporalClient.workflow.getHandle(workflowId);
          // Default reminder schedule
          await handle.signal('scheduleReminders', workflowId, [
            { type: 'email', timing: 24 },
            { type: 'push', timing: 1 },
          ], 'system');
          break;
        case 'escalate':
          await this.handleEscalation(workflowId, entityType, entityId);
          break;
        case 'generate_report':
          await this.generateWorkflowReport(workflowId, entityType, entityId);
          break;
      }

      this.logger.log(`Triggered ${triggerType} workflow for ${entityType} ${entityId}`);
      return workflowId;

    } catch (error) {
      this.logger.error(`Failed to trigger Calendar workflow: ${error.message}`);
      throw error;
    }
  }

  private async createCalendarWorkflow(entityType: string, entityId: string): Promise<string> {
    const workflowId = `calendar-${entityType}-${entityId}`;

    const handle = await this.temporalClient.workflow.start('CalendarWorkflow', {
      taskQueue: this.configService.get('temporal.taskQueue'),
      workflowId,
      args: [{
        workflowId,
        type: 'deadline_management',
        entityType,
        entityId,
        ownerId: 'system',
      }],
    });

    this.logger.log(`Created Calendar workflow: ${workflowId}`);
    return workflowId;
  }

  // Event-driven Workflow Triggers
  async handleEntityStatusChange(entityType: 'accu_application' | 'project' | 'document', entityId: string, oldStatus: string, newStatus: string): Promise<void> {
    this.logger.log(`Handling status change for ${entityType} ${entityId}: ${oldStatus} -> ${newStatus}`);

    try {
      switch (entityType) {
        case 'accu_application':
          if (newStatus === 'submitted') {
            await this.triggerAccuApplicationWorkflow(entityId, 'submit');
          } else if (newStatus === 'approved') {
            await this.triggerAccuApplicationWorkflow(entityId, 'approve');
          } else if (newStatus === 'rejected') {
            await this.triggerAccuApplicationWorkflow(entityId, 'reject');
          }
          break;

        case 'project':
          if (newStatus === 'active') {
            await this.triggerProjectWorkflow(entityId, 'start');
          } else if (newStatus === 'on_hold') {
            await this.triggerProjectWorkflow(entityId, 'pause');
          } else if (newStatus === 'completed') {
            await this.triggerProjectWorkflow(entityId, 'complete');
          }
          break;

        case 'document':
          if (newStatus === 'review') {
            await this.triggerDocumentWorkflow(entityId, 'submit_review');
          } else if (newStatus === 'approved') {
            await this.triggerDocumentWorkflow(entityId, 'approve');
          }
          break;
      }

      // Trigger calendar workflow for deadline management
      await this.triggerCalendarWorkflow(entityType, entityId, 'create_deadline');

    } catch (error) {
      this.logger.error(`Failed to handle status change: ${error.message}`);
    }
  }

  // Scheduled Workflow Triggers
  async handleScheduledWorkflows(): Promise<void> {
    this.logger.log('Running scheduled workflow checks');

    try {
      // Check for overdue ACCU applications
      const overdueApplications = await this.accuApplicationRepository
        .createQueryBuilder('accu')
        .where('accu.status = :status', { status: 'under_review' })
        .andWhere('accu.updatedAt < :overdueDate', {
          overdueDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days
        })
        .getMany();

      for (const application of overdueApplications) {
        await this.triggerAccuApplicationWorkflow(application.id, 'approve');
      }

      // Check for overdue projects
      const overdueProjects = await this.projectRepository
        .createQueryBuilder('project')
        .where('project.status = :status', { status: 'active' })
        .andWhere('project.endDate < :overdueDate', {
          overdueDate: new Date(),
        })
        .getMany();

      for (const project of overdueProjects) {
        await this.triggerProjectWorkflow(project.id, 'complete');
      }

      // Check for pending document reviews
      const pendingReviews = await this.documentRepository
        .createQueryBuilder('doc')
        .where('doc.status = :status', { status: 'review' })
        .andWhere('doc.updatedAt < :overdueDate', {
          overdueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days
        })
        .getMany();

      for (const document of pendingReviews) {
        await this.triggerDocumentWorkflow(document.id, 'approve');
      }

    } catch (error) {
      this.logger.error(`Failed to handle scheduled workflows: ${error.message}`);
    }
  }

  // Helper methods
  private async handleEscalation(workflowId: string, entityType: string, entityId: string): Promise<void> {
    const handle = this.temporalClient.workflow.getHandle(workflowId);
    await handle.signal('addEscalationRule', 1, 2, 'team_lead');
  }

  private async generateWorkflowReport(workflowId: string, entityType: string, entityId: string): Promise<void> {
    const handle = this.temporalClient.workflow.getHandle(workflowId);
    const dateRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
    };
    
    await handle.signal('generateReport', 'deadline_summary', dateRange, {}, 'system');
  }

  // Query workflow status
  async getWorkflowStatus(workflowId: string): Promise<any> {
    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);
      const description = await handle.describe();
      
      return {
        workflowId,
        status: description.status,
        type: description.type,
        startTime: description.startTime,
        closeTime: description.closeTime,
        historyLength: description.historyLength,
      };
    } catch (error) {
      this.logger.error(`Failed to get workflow status for ${workflowId}: ${error.message}`);
      return null;
    }
  }

  // List all workflows
  async listWorkflows(query?: string): Promise<any[]> {
    try {
      const workflows = await this.temporalClient.workflow.list(query || '');
      return workflows.map(w => ({
        workflowId: w.workflowId,
        status: w.status,
        type: w.type,
        startTime: w.startTime,
        closeTime: w.closeTime,
      }));
    } catch (error) {
      this.logger.error(`Failed to list workflows: ${error.message}`);
      return [];
    }
  }

  // Terminate workflow
  async terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
    try {
      const handle = this.temporalClient.workflow.getHandle(workflowId);
      await handle.terminate(reason || 'Manual termination by system');
      this.logger.log(`Terminated workflow: ${workflowId}`);
    } catch (error) {
      this.logger.error(`Failed to terminate workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }
}