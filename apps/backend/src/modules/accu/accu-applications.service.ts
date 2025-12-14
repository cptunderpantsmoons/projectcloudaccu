import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AccuApplication, ACCUStatus } from '../../entities/accu-application.entity';
import { Project } from '../../entities/project.entity';
import { Document } from '../../entities/document.entity';
import { User } from '../../entities/user.entity';
import { CalendarEvent } from '../../entities/calendar-event.entity';
import { AccuNotificationService } from './accu-notification.service';
import {
  ACCUApplicationCreateDto,
  ACCUApplicationUpdateDto,
  ACCUApplicationQueryDto,
  ACCUApplicationStatusDto,
  ACCUApplicationSubmissionDto,
  ACCUApplicationApprovalDto,
  ACCUApplicationResponseDto,
  ACCUApplicationsPaginatedResponseDto,
  ACCUApplicationAnalyticsDto,
  ACCUApplicationDashboardDto,
  ACCUApplicationStatsDto,
  ACCUApplicationHistoryDto,
  ACCUApplicationDocumentDto,
  ACCUApplicationDeadlineDto,
} from './dto';

export interface ACCUApplicationsListOptions extends ACCUApplicationQueryDto {
  tenantId?: string;
}

export interface ACCUApplicationStats {
  total: number;
  byStatus: Record<ACCUStatus, number>;
  byMethodology: Record<string, number>;
  averageAccuUnits: number;
  totalAccuUnits: number;
  averageProcessingTime: number;
  successRate: number;
  pending: number;
  overdue: number;
}

@Injectable()
export class AccuApplicationsService {
  constructor(
    @InjectRepository(AccuApplication)
    private readonly accuApplicationRepository: Repository<AccuApplication>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepository: Repository<CalendarEvent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: AccuNotificationService,
  ) {}

  /**
   * Create a new ACCU application
   */
  async create(createDto: ACCUApplicationCreateDto, createdById: string): Promise<ACCUApplicationResponseDto> {
    // Validate project exists
    const project = await this.projectRepository.findOne({
      where: { id: createDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate project is active or can have ACCU applications
    if (project.status === 'completed' || project.status === 'cancelled') {
      throw new BadRequestException('Cannot create ACCU application for completed or cancelled project');
    }

    // Check for existing applications for the same project
    const existingApplication = await this.accuApplicationRepository.findOne({
      where: {
        projectId: createDto.projectId,
        status: ACCUStatus.DRAFT,
      },
    });

    if (existingApplication) {
      throw new ConflictException('A draft ACCU application already exists for this project');
    }

    // Get current user for validation
    const currentUser = await this.userRepository.findOne({
      where: { id: createdById },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // Validate ACCU application requirements based on methodology
    await this.validateApplicationRequirements(createDto);

    // Create application
    const application = this.accuApplicationRepository.create({
      projectId: createDto.projectId,
      project,
      status: ACCUStatus.DRAFT,
      accuUnits: createDto.accuUnits,
      methodologyId: createDto.methodologyId,
      serReference: createDto.serReference,
      applicationData: createDto.applicationData,
      tenantId: createDto.tenantId || project.tenantId,
      metadata: {
        createdBy: createdById,
        createdByName: `${currentUser.firstName} ${currentUser.lastName}`,
        requirements: await this.getMethodologyRequirements(createDto.methodologyId),
      },
    });

    const savedApplication = await this.accuApplicationRepository.save(application);

    // Create initial status history
    await this.createStatusHistory(savedApplication.id, null, ACCUStatus.DRAFT, 'Application created', 'Initial draft created');

    return this.formatApplicationResponse(savedApplication);
  }

  /**
   * Get all ACCU applications with pagination and filtering
   */
  async findAll(options: ACCUApplicationsListOptions): Promise<ACCUApplicationsPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      projectId,
      methodologyId,
      tenantId,
      submissionDateFrom,
      submissionDateTo,
      approvalDateFrom,
      approvalDateTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.accuApplicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.project', 'project');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(application.applicationData->>\'description\' ILIKE :search OR project.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('application.status = :status', { status });
    }

    if (projectId) {
      queryBuilder.andWhere('application.projectId = :projectId', { projectId });
    }

    if (methodologyId) {
      queryBuilder.andWhere('application.methodologyId = :methodologyId', { methodologyId });
    }

    if (tenantId) {
      queryBuilder.andWhere('application.tenantId = :tenantId', { tenantId });
    }

    if (submissionDateFrom) {
      queryBuilder.andWhere('application.submissionDate >= :submissionDateFrom', { submissionDateFrom });
    }

    if (submissionDateTo) {
      queryBuilder.andWhere('application.submissionDate <= :submissionDateTo', { submissionDateTo });
    }

    if (approvalDateFrom) {
      queryBuilder.andWhere('application.approvalDate >= :approvalDateFrom', { approvalDateFrom });
    }

    if (approvalDateTo) {
      queryBuilder.andWhere('application.approvalDate <= :approvalDateTo', { approvalDateTo });
    }

    // Apply sorting
    const allowedSortFields = [
      'status',
      'accuUnits',
      'methodologyId',
      'submissionDate',
      'approvalDate',
      'issuedDate',
      'createdAt',
      'updatedAt',
    ];

    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`application.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const applications = await queryBuilder.getMany();

    return {
      data: applications.map(this.formatApplicationResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get ACCU application by ID
   */
  async findOne(id: string): Promise<ACCUApplicationResponseDto> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    const formattedApplication = this.formatApplicationResponse(application);

    // Add status history if available
    const statusHistory = await this.getStatusHistory(id);
    if (statusHistory.length > 0) {
      formattedApplication.statusHistory = statusHistory;
    }

    return formattedApplication;
  }

  /**
   * Update ACCU application
   */
  async update(id: string, updateDto: ACCUApplicationUpdateDto): Promise<ACCUApplicationResponseDto> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    // Only allow updates for draft applications
    if (application.status !== ACCUStatus.DRAFT) {
      throw new BadRequestException('Only draft applications can be updated');
    }

    // Validate ACCU units if being updated
    if (updateDto.accuUnits !== undefined && updateDto.accuUnits < 0) {
      throw new BadRequestException('ACCU units must be non-negative');
    }

    // Validate methodology if being updated
    if (updateDto.methodologyId) {
      await this.validateApplicationRequirements({
        ...updateDto,
        projectId: application.projectId,
      } as any);
    }

    // Update application fields
    Object.assign(application, {
      ...updateDto,
      updatedAt: new Date(),
    });

    const updatedApplication = await this.accuApplicationRepository.save(application);
    return this.formatApplicationResponse(updatedApplication);
  }

  /**
   * Update application status
   */
  async updateStatus(id: string, statusDto: ACCUApplicationStatusDto): Promise<ACCUApplicationResponseDto> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    // Validate status transition
    this.validateStatusTransition(application.status, statusDto.status);

    // Additional business logic for specific transitions
    if (statusDto.status === ACCUStatus.SUBMITTED) {
      await this.validateSubmissionRequirements(application);
    }

    if (statusDto.status === ACCUStatus.APPROVED) {
      await this.validateApprovalRequirements(application);
    }

    // Update application with status change
    const oldStatus = application.status;
    application.status = statusDto.status;
    
    // Set relevant dates based on status
    if (statusDto.status === ACCUStatus.SUBMITTED && !application.submissionDate) {
      application.submissionDate = new Date();
    } else if (statusDto.status === ACCUStatus.APPROVED && !application.approvalDate) {
      application.approvalDate = new Date();
    } else if (statusDto.status === ACCUStatus.ISSUED && !application.issuedDate) {
      application.issuedDate = new Date();
    }

    // Add status change to metadata
    const updatedMetadata = {
      ...application.metadata,
      statusHistory: [
        ...(application.metadata?.statusHistory || []),
        {
          from: oldStatus,
          to: statusDto.status,
          reason: statusDto.reason,
          notes: statusDto.notes,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    application.metadata = updatedMetadata;

    const updatedApplication = await this.accuApplicationRepository.save(application);

    // Create status history record
    await this.createStatusHistory(id, oldStatus, statusDto.status, statusDto.reason, statusDto.notes);

    // Send notification for status change
    await this.notificationService.notifyStatusChange(
      updatedApplication,
      oldStatus,
      statusDto.status,
      statusDto.reason,
      statusDto.notes,
    );

    // Send specific notifications for key milestones
    if (statusDto.status === ACCUStatus.ISSUED) {
      await this.notificationService.notifyIssuance(updatedApplication);
    }

    return this.formatApplicationResponse(updatedApplication);
  }

  /**
   * Submit ACCU application
   */
  async submit(id: string, submissionDto: ACCUApplicationSubmissionDto): Promise<ACCUApplicationResponseDto> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    if (application.status !== ACCUStatus.DRAFT) {
      throw new BadRequestException('Only draft applications can be submitted');
    }

    // Validate submission requirements
    await this.validateSubmissionRequirements(application);

    // Update application for submission
    application.status = ACCUStatus.SUBMITTED;
    application.submissionDate = new Date();

    const updatedMetadata = {
      ...application.metadata,
      submissionNotes: submissionDto.submissionNotes,
      contactPerson: submissionDto.contactPerson,
      submissionDeadline: submissionDto.deadline,
    };
    application.metadata = updatedMetadata;

    const updatedApplication = await this.accuApplicationRepository.save(application);

    // Create status history
    await this.createStatusHistory(id, ACCUStatus.DRAFT, ACCUStatus.SUBMITTED, 'Application submitted', submissionDto.submissionNotes);

    // Create calendar event for deadline if provided
    if (submissionDto.deadline) {
      await this.createSubmissionDeadlineEvent(application, submissionDto.deadline);
    }

    // Send submission confirmation notification
    await this.notificationService.confirmSubmission(updatedApplication, submissionDto.submissionNotes);

    return this.formatApplicationResponse(updatedApplication);
  }

  /**
   * Approve/reject ACCU application
   */
  async approve(id: string, approvalDto: ACCUApplicationApprovalDto): Promise<ACCUApplicationResponseDto> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    if (application.status !== ACCUStatus.SUBMITTED && application.status !== ACCUStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only submitted applications can be approved/rejected');
    }

    const newStatus = approvalDto.approved ? ACCUStatus.APPROVED : ACCUStatus.REJECTED;
    
    // Update application
    application.status = newStatus;
    application.approvalDate = new Date();

    // Update ACCU units if approved with different amount
    if (approvalDto.approved && approvalDto.approvedUnits && approvalDto.approvedUnits !== application.accuUnits) {
      application.accuUnits = approvalDto.approvedUnits;
    }

    const updatedMetadata = {
      ...application.metadata,
      approvalReason: approvalDto.reason,
      reviewerComments: approvalDto.reviewerComments,
      nextSteps: approvalDto.nextSteps,
      approvedUnits: approvalDto.approvedUnits,
    };
    application.metadata = updatedMetadata;

    const updatedApplication = await this.accuApplicationRepository.save(application);

    // Create status history
    await this.createStatusHistory(
      id, 
      application.status, 
      newStatus, 
      approvalDto.approved ? 'Application approved' : 'Application rejected', 
      approvalDto.reason
    );

    // Send notification for approval/rejection
    if (approvalDto.approved) {
      await this.notificationService.notifyApproval(
        updatedApplication,
        approvalDto.approvedUnits,
        approvalDto.reviewerComments,
      );
    } else {
      await this.notificationService.notifyRejection(
        updatedApplication,
        approvalDto.reason,
        approvalDto.reviewerComments,
      );
    }

    return this.formatApplicationResponse(updatedApplication);
  }

  /**
   * Get application status history
   */
  async getStatusHistory(id: string): Promise<ACCUApplicationHistoryDto[]> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    const statusHistory = application.metadata?.statusHistory || [];
    
    return statusHistory.map((entry: any, index: number) => ({
      id: `history-${id}-${index}`,
      fromStatus: entry.from,
      toStatus: entry.to,
      reason: entry.reason || '',
      notes: entry.notes || '',
      changedBy: {
        id: 'system',
        firstName: 'System',
        lastName: '',
        email: 'system@accu-platform.com',
      },
      changedAt: new Date(entry.timestamp),
    }));
  }

  /**
   * Get application documents
   */
  async getApplicationDocuments(id: string): Promise<Document[]> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    return this.documentRepository.find({
      where: { projectId: application.projectId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Add document to application
   */
  async addDocument(id: string, documentDto: ACCUApplicationDocumentDto): Promise<void> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    // Validate document exists
    const document = await this.documentRepository.findOne({
      where: { id: documentDto.documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Update document metadata to link to application
    const updatedMetadata = {
      ...document.metadata,
      accuApplicationId: id,
      accuApplicationRole: documentDto.role,
      accuRequirementLevel: documentDto.requirementLevel,
    };
    
    await this.documentRepository.update(documentDto.documentId, { metadata: updatedMetadata });
  }

  /**
   * Get application deadlines
   */
  async getApplicationDeadlines(id: string): Promise<ACCUApplicationDeadlineDto[]> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    const calendarEvents = await this.calendarEventRepository.find({
      where: { projectId: application.projectId },
      relations: ['assignedTo'],
      order: { startDate: 'ASC' },
    });

    return calendarEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      dueDate: event.startDate,
      priority: event.priority,
      isCompleted: false, // This would need to be tracked separately
      assignedTo: event.assignedTo ? {
        id: event.assignedTo.id,
        firstName: event.assignedTo.firstName,
        lastName: event.assignedTo.lastName,
        email: event.assignedTo.email,
      } : undefined,
    }));
  }

  /**
   * Get application analytics
   */
  async getAnalytics(id: string): Promise<ACCUApplicationAnalyticsDto> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    // Get document completion statistics
    const documents = await this.documentRepository.find({
      where: { projectId: application.projectId },
    });

    const requiredDocumentsCount = this.getRequiredDocumentsCount(application.methodologyId);
    const submittedDocumentsCount = documents.length;

    // Calculate progress based on status and document completion
    const progress = this.calculateApplicationProgress(application, submittedDocumentsCount, requiredDocumentsCount);

    // Get next deadline
    const nextDeadline = await this.getNextDeadline(application.projectId);

    return {
      id: application.id,
      projectName: application.project.name,
      status: application.status,
      progress,
      daysUntilNextDeadline: nextDeadline ? this.getDaysUntilDate(nextDeadline) : 0,
      isOverdue: this.isApplicationOverdue(application),
      documentCompletion: requiredDocumentsCount > 0 ? (submittedDocumentsCount / requiredDocumentsCount) * 100 : 0,
      requiredDocumentsCount,
      submittedDocumentsCount,
      applicationAgeInDays: this.getDaysUntilDate(application.createdAt),
      estimatedDaysRemaining: this.getEstimatedProcessingTime(application),
    };
  }

  /**
   * Get application dashboard
   */
  async getDashboard(tenantId?: string): Promise<ACCUApplicationDashboardDto> {
    const queryBuilder = this.accuApplicationRepository.createQueryBuilder('application');

    if (tenantId) {
      queryBuilder.where('application.tenantId = :tenantId', { tenantId });
    }

    const applications = await queryBuilder.getMany();

    // Calculate statistics
    const totalApplications = applications.length;
    const applicationsByStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<ACCUStatus, number>);

    const pendingApplications = applications.filter(app => 
      app.status === ACCUStatus.SUBMITTED || app.status === ACCUStatus.UNDER_REVIEW
    ).length;

    const overdueApplications = applications.filter(app => this.isApplicationOverdue(app)).length;

    // Calculate average processing time
    const completedApplications = applications.filter(app => app.status === ACCUStatus.APPROVED);
    const averageProcessingTime = completedApplications.length > 0 
      ? completedApplications.reduce((sum, app) => {
          if (app.submissionDate && app.approvalDate) {
            return sum + this.getDaysUntilDate(app.submissionDate, app.approvalDate);
          }
          return sum;
        }, 0) / completedApplications.length
      : 0;

    // Calculate success rate
    const totalReviewed = applications.filter(app => 
      app.status === ACCUStatus.APPROVED || app.status === ACCUStatus.REJECTED
    ).length;
    const successRate = totalReviewed > 0 ? (applicationsByStatus[ACCUStatus.APPROVED] || 0) / totalReviewed * 100 : 0;

    // Get recent applications
    const recentApplications = applications
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(app => ({
        id: app.id,
        projectName: 'Project', // Would need to fetch project data
        status: app.status,
        progress: 50, // Simplified
        daysUntilNextDeadline: 0,
        isOverdue: this.isApplicationOverdue(app),
        documentCompletion: 75,
        requiredDocumentsCount: 10,
        submittedDocumentsCount: 7,
        applicationAgeInDays: this.getDaysUntilDate(app.createdAt),
        estimatedDaysRemaining: 30,
      }));

    // Get upcoming deadlines (simplified)
    const upcomingDeadlines: ACCUApplicationDeadlineDto[] = [];

    return {
      totalApplications,
      applicationsByStatus,
      averageProcessingTime,
      successRate,
      pendingApplications,
      overdueApplications,
      recentApplications,
      upcomingDeadlines,
    };
  }

  /**
   * Get application statistics
   */
  async getStats(tenantId?: string): Promise<ACCUApplicationStats> {
    const queryBuilder = this.accuApplicationRepository.createQueryBuilder('application');

    if (tenantId) {
      queryBuilder.where('application.tenantId = :tenantId', { tenantId });
    }

    const applications = await queryBuilder.getMany();

    const total = applications.length;
    const byStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<ACCUStatus, number>);

    const byMethodology = applications.reduce((acc, app) => {
      acc[app.methodologyId] = (acc[app.methodologyId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageAccuUnits = total > 0 
      ? applications.reduce((sum, app) => sum + app.accuUnits, 0) / total 
      : 0;

    const totalAccuUnits = applications.reduce((sum, app) => sum + app.accuUnits, 0);

    const completedApplications = applications.filter(app => app.status === ACCUStatus.APPROVED);
    const averageProcessingTime = completedApplications.length > 0 
      ? completedApplications.reduce((sum, app) => {
          if (app.submissionDate && app.approvalDate) {
            return sum + this.getDaysUntilDate(app.submissionDate, app.approvalDate);
          }
          return sum;
        }, 0) / completedApplications.length
      : 0;

    const totalReviewed = applications.filter(app => 
      app.status === ACCUStatus.APPROVED || app.status === ACCUStatus.REJECTED
    ).length;
    const successRate = totalReviewed > 0 ? (byStatus[ACCUStatus.APPROVED] || 0) / totalReviewed * 100 : 0;

    const pending = applications.filter(app => 
      app.status === ACCUStatus.SUBMITTED || app.status === ACCUStatus.UNDER_REVIEW
    ).length;

    const overdue = applications.filter(app => this.isApplicationOverdue(app)).length;

    return {
      total,
      byStatus,
      byMethodology,
      averageAccuUnits,
      totalAccuUnits,
      averageProcessingTime,
      successRate,
      pending,
      overdue,
    };
  }

  /**
   * Delete ACCU application (soft delete)
   */
  async remove(id: string): Promise<void> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('ACCU application not found');
    }

    // Only allow deletion of draft applications
    if (application.status !== ACCUStatus.DRAFT) {
      throw new BadRequestException('Only draft applications can be deleted');
    }

    // Soft delete by changing status to rejected (as deleted state)
    await this.accuApplicationRepository.update(id, {
      status: ACCUStatus.REJECTED,
      metadata: {
        ...application.metadata,
        deletedAt: new Date().toISOString(),
        deletionReason: 'Application deleted by user',
      },
    });
  }

  /**
   * Private helper methods
   */

  private async validateApplicationRequirements(createDto: ACCUApplicationCreateDto | ACCUApplicationUpdateDto): Promise<void> {
    // Validate methodology exists and is active
    const requirements = await this.getMethodologyRequirements(createDto.methodologyId);
    
    if (!requirements) {
      throw new BadRequestException('Invalid or inactive methodology');
    }

    // Validate ACCU units are within allowed range
    if (createDto.accuUnits && (createDto.accuUnits < 1 || createDto.accuUnits > requirements.maxAccuUnits)) {
      throw new BadRequestException(`ACCU units must be between 1 and ${requirements.maxAccuUnits}`);
    }

    // Validate application data contains required fields
    if (!createDto.applicationData) {
      throw new BadRequestException('Application data is required');
    }
  }

  private validateStatusTransition(from: ACCUStatus, to: ACCUStatus): void {
    const validTransitions = {
      [ACCUStatus.DRAFT]: [ACCUStatus.SUBMITTED, ACCUStatus.REJECTED],
      [ACCUStatus.SUBMITTED]: [ACCUStatus.UNDER_REVIEW, ACCUStatus.REJECTED],
      [ACCUStatus.UNDER_REVIEW]: [ACCUStatus.APPROVED, ACCUStatus.REJECTED],
      [ACCUStatus.APPROVED]: [ACCUStatus.ISSUED],
      [ACCUStatus.REJECTED]: [], // Terminal state
      [ACCUStatus.ISSUED]: [], // Terminal state
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new BadRequestException(`Invalid status transition from ${from} to ${to}`);
    }
  }

  private async validateSubmissionRequirements(application: AccuApplication): Promise<void> {
    // Check minimum ACCU units
    if (application.accuUnits < 1) {
      throw new BadRequestException('Application must have at least 1 ACCU unit to be submitted');
    }

    // Check required application data
    if (!application.applicationData.description) {
      throw new BadRequestException('Application description is required for submission');
    }

    // Check methodology requirements
    const requirements = await this.getMethodologyRequirements(application.methodologyId);
    if (!requirements) {
      throw new BadRequestException('Invalid methodology for submission');
    }

    // Check required documents
    const requiredDocumentsCount = this.getRequiredDocumentsCount(application.methodologyId);
    const documents = await this.documentRepository.find({
      where: { projectId: application.projectId },
    });

    if (documents.length < requiredDocumentsCount) {
      // Get missing documents list (this would be more sophisticated in real implementation)
      const missingDocuments = [`Required document ${documents.length + 1}`, `Required document ${documents.length + 2}`];
      
      // Send notification about missing documents
      await this.notificationService.notifyMissingDocuments(
        application,
        missingDocuments,
        requiredDocumentsCount,
      );

      // Don't throw error - allow submission with warning
      // In real implementation, this might be configurable per methodology
    }
  }

  private async validateApprovalRequirements(application: AccuApplication): Promise<void> {
    // Ensure application has been submitted
    if (!application.submissionDate) {
      throw new BadRequestException('Application must be submitted before approval');
    }

    // Check all required documents are present
    const documents = await this.documentRepository.find({
      where: { projectId: application.projectId },
    });

    const requiredDocumentsCount = this.getRequiredDocumentsCount(application.methodologyId);
    if (documents.length < requiredDocumentsCount) {
      throw new BadRequestException(`All required documents must be submitted before approval. Required: ${requiredDocumentsCount}, Submitted: ${documents.length}`);
    }
  }

  private async createStatusHistory(
    applicationId: string, 
    fromStatus: ACCUStatus | null, 
    toStatus: ACCUStatus, 
    reason: string, 
    notes: string
  ): Promise<void> {
    const application = await this.accuApplicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) return;

    const historyEntry = {
      from: fromStatus,
      to: toStatus,
      reason,
      notes,
      timestamp: new Date().toISOString(),
    };

    const updatedMetadata = {
      ...application.metadata,
      statusHistory: [
        ...(application.metadata?.statusHistory || []),
        historyEntry,
      ],
    };

    await this.accuApplicationRepository.update(applicationId, { metadata: updatedMetadata });
  }

  private async getMethodologyRequirements(methodologyId: string): Promise<any> {
    // Mock implementation - in real app, this would fetch from methodology repository
    const methodologies: Record<string, any> = {
      'methodology-123': {
        name: 'Carbon Reduction Methodology',
        version: '1.0',
        maxAccuUnits: 100000,
        requiredDocuments: ['baseline_report', 'methodology_plan', 'monitoring_report'],
        reviewPeriod: 90, // days
      },
    };

    return methodologies[methodologyId] || null;
  }

  private async createSubmissionDeadlineEvent(application: AccuApplication, deadline: Date): Promise<void> {
    const deadlineEvent = this.calendarEventRepository.create({
      title: `ACCU Application Review Deadline - ${application.project.name}`,
      description: `Review deadline for ACCU application ${application.id}`,
      type: 'deadline',
      priority: 'high',
      startDate: deadline,
      endDate: deadline,
      isAllDay: true,
      projectId: application.projectId,
    });

    await this.calendarEventRepository.save(deadlineEvent);
  }

  private async getNextDeadline(projectId: string): Promise<Date | null> {
    const nextEvent = await this.calendarEventRepository.findOne({
      where: { 
        projectId,
        startDate: new Date(),
      },
      order: { startDate: 'ASC' },
    });

    return nextEvent?.startDate || null;
  }

  private getRequiredDocumentsCount(methodologyId: string): number {
    // Mock implementation
    const requirements: Record<string, number> = {
      'methodology-123': 5,
    };
    return requirements[methodologyId] || 3;
  }

  private calculateApplicationProgress(
    application: AccuApplication, 
    submittedDocuments: number, 
    requiredDocuments: number
  ): number {
    let progress = 0;

    // Base progress by status
    switch (application.status) {
      case ACCUStatus.DRAFT:
        progress = 10;
        break;
      case ACCUStatus.SUBMITTED:
        progress = 40;
        break;
      case ACCUStatus.UNDER_REVIEW:
        progress = 70;
        break;
      case ACCUStatus.APPROVED:
        progress = 90;
        break;
      case ACCUStatus.ISSUED:
        progress = 100;
        break;
      case ACCUStatus.REJECTED:
        progress = 0;
        break;
    }

    // Add document completion progress
    if (requiredDocuments > 0) {
      const documentProgress = (submittedDocuments / requiredDocuments) * 20;
      progress += documentProgress;
    }

    return Math.min(100, Math.max(0, progress));
  }

  private isApplicationOverdue(application: AccuApplication): boolean {
    // Mock implementation - would check against submission deadlines
    if (application.status === ACCUStatus.SUBMITTED) {
      const daysSinceSubmission = this.getDaysUntilDate(application.submissionDate);
      return daysSinceSubmission > 90; // 90 day review period
    }
    return false;
  }

  private getDaysUntilDate(date: Date, endDate?: Date): number {
    const start = new Date(date);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getEstimatedProcessingTime(application: AccuApplication): number {
    // Mock implementation - would use historical data
    const processingTimes: Record<ACCUStatus, number> = {
      [ACCUStatus.DRAFT]: 30,
      [ACCUStatus.SUBMITTED]: 60,
      [ACCUStatus.UNDER_REVIEW]: 30,
      [ACCUStatus.APPROVED]: 0,
      [ACCUStatus.REJECTED]: 0,
      [ACCUStatus.ISSUED]: 0,
    };

    return processingTimes[application.status] || 30;
  }

  private formatApplicationResponse(application: AccuApplication): ACCUApplicationResponseDto {
    return {
      id: application.id,
      status: application.status,
      submissionDate: application.submissionDate,
      approvalDate: application.approvalDate,
      issuedDate: application.issuedDate,
      accuUnits: application.accuUnits,
      methodologyId: application.methodologyId,
      serReference: application.serReference,
      applicationData: application.applicationData,
      metadata: application.metadata,
      project: {
        id: application.project.id,
        name: application.project.name,
        type: application.project.type,
        status: application.project.status,
      },
      tenantId: application.tenantId,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      isDraft: application.isDraft(),
      isSubmitted: application.isSubmitted(),
      isApproved: application.isApproved(),
      isIssued: application.isIssued(),
      ageInDays: this.getDaysUntilDate(application.createdAt),
    };
  }
}