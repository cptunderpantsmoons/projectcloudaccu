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
import { Project, ProjectStatus, ProjectType } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { Document } from '../../entities/document.entity';
import { CalendarEvent } from '../../entities/calendar-event.entity';
import {
  ProjectCreateDto,
  ProjectUpdateDto,
  ProjectQueryDto,
  ProjectResponseDto,
  ProjectsPaginatedResponseDto,
  ProjectTemplateCreateDto,
  ProjectTemplateUpdateDto,
  ProjectTemplateDto,
  ProjectTemplatesPaginatedResponseDto,
  ProjectStatusUpdateDto,
  CollaboratorAddDto,
  CollaboratorDto,
  ProjectCollaboratorsResponseDto,
  ProjectAnalyticsDto,
  MethodologyDto,
} from './dto';

// In-memory templates storage (in production, this would be in a database)
const PROJECT_TEMPLATES: ProjectTemplateDto[] = [
  {
    id: 'template-iso14064',
    name: 'ISO 14064-2 Carbon Audit',
    description: 'Standard template for ISO 14064-2 carbon footprint audits',
    type: ProjectType.AUDIT,
    methodology: {
      id: 'methodology-iso14064-2',
      name: 'ISO 14064-2',
      version: '2.0',
      url: 'https://www.iso.org/standard/54262.html',
      requirements: {
        scope: 'Organization or project level',
        reportingPeriod: 'Annual',
        verificationRequired: true,
        ghgCategories: ['Scope 1', 'Scope 2', 'Scope 3'],
      },
    },
    defaultSettings: {
      autoCalculateEmissions: true,
      requireEvidenceForEachCategory: true,
      allowScope3Estimates: true,
    },
    requiredFields: ['name', 'description', 'type', 'startDate', 'methodology'],
    optionalFields: ['endDate', 'metadata'],
    isActive: true,
    version: '1.0',
    tags: ['carbon', 'iso14064', 'audit', 'ghg'],
  },
  {
    id: 'template-compliance',
    name: 'Regulatory Compliance Project',
    description: 'Template for regulatory compliance monitoring and reporting',
    type: ProjectType.COMPLIANCE,
    methodology: {
      id: 'methodology-regulatory',
      name: 'Regulatory Framework',
      version: '1.0',
      requirements: {
        reportingFrequency: 'Quarterly',
        auditRequired: true,
        documentationLevel: 'High',
      },
    },
    defaultSettings: {
      requireAllDocuments: true,
      automatedReminders: true,
      multiStageApproval: true,
    },
    requiredFields: ['name', 'description', 'type', 'startDate', 'methodology'],
    optionalFields: ['endDate', 'metadata'],
    isActive: true,
    version: '1.0',
    tags: ['compliance', 'regulatory', 'reporting'],
  },
  {
    id: 'template-research',
    name: 'Research & Development Project',
    description: 'Template for research and development initiatives',
    type: ProjectType.RESEARCH,
    methodology: {
      id: 'methodology-research',
      name: 'Research Framework',
      version: '1.0',
      requirements: {
        methodology: 'Agile',
        documentationLevel: 'Medium',
        reviewFrequency: 'Bi-weekly',
      },
    },
    defaultSettings: {
      allowFlexibleTimeline: true,
      requireRegularUpdates: true,
      supportMultiplePhases: true,
    },
    requiredFields: ['name', 'description', 'type', 'startDate'],
    optionalFields: ['endDate', 'methodology', 'metadata'],
    isActive: true,
    version: '1.0',
    tags: ['research', 'development', 'innovation'],
  },
];

// In-memory project collaborators storage
const PROJECT_COLLABORATORS: Map<string, CollaboratorDto[]> = new Map();

export interface ProjectsListOptions extends ProjectQueryDto {
  tenantId?: string;
  ownerId?: string;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  byType: Record<ProjectType, number>;
  active: number;
  completed: number;
  overdue: number;
  averageDuration: number;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepository: Repository<CalendarEvent>,
  ) {}

  /**
   * Create a new project
   */
  async create(createDto: ProjectCreateDto, createdById: string): Promise<ProjectResponseDto> {
    // Validate owner if provided
    let owner: User | null = null;
    if (createDto.ownerId) {
      owner = await this.userRepository.findOne({
        where: { id: createDto.ownerId },
      });
      if (!owner) {
        throw new NotFoundException('Owner user not found');
      }
    } else {
      // Use current user as owner
      owner = await this.userRepository.findOne({
        where: { id: createdById },
      });
      if (!owner) {
        throw new NotFoundException('Current user not found');
      }
    }

    // Validate template if provided
    if (createDto.templateId) {
      const template = PROJECT_TEMPLATES.find(t => t.id === createDto.templateId);
      if (!template) {
        throw new NotFoundException('Template not found');
      }
      
      // Apply template methodology if not explicitly provided
      if (!createDto.methodology && template.methodology) {
        createDto.methodology = template.methodology;
      }
      
      // Apply template default settings
      if (template.defaultSettings) {
        createDto.metadata = {
          ...createDto.metadata,
          templateSettings: template.defaultSettings,
        };
      }
    }

    // Validate methodology requirements
    if (createDto.methodology) {
      this.validateMethodology(createDto.methodology, createDto.type);
    }

    // Create project
    const project = this.projectRepository.create({
      name: createDto.name,
      description: createDto.description,
      type: createDto.type,
      status: ProjectStatus.DRAFT,
      startDate: new Date(createDto.startDate),
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      methodology: createDto.methodology,
      metadata: createDto.metadata,
      ownerId: owner.id,
      owner,
      tenantId: createDto.tenantId || owner.tenantId,
      tags: createDto.tags,
    });

    const savedProject = await this.projectRepository.save(project);
    return this.formatProjectResponse(savedProject);
  }

  /**
   * Get all projects with pagination and filtering
   */
  async findAll(options: ProjectsListOptions): Promise<ProjectsPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      ownerId,
      tenantId,
      tags,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(project.name ILIKE :search OR project.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('project.type = :type', { type });
    }

    if (ownerId) {
      queryBuilder.andWhere('project.ownerId = :ownerId', { ownerId });
    }

    if (tenantId) {
      queryBuilder.andWhere('project.tenantId = :tenantId', { tenantId });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('project.tags && :tags', { tags });
    }

    if (startDateFrom) {
      queryBuilder.andWhere('project.startDate >= :startDateFrom', { startDateFrom });
    }

    if (startDateTo) {
      queryBuilder.andWhere('project.startDate <= :startDateTo', { startDateTo });
    }

    if (endDateFrom) {
      queryBuilder.andWhere('project.endDate >= :endDateFrom', { endDateFrom });
    }

    if (endDateTo) {
      queryBuilder.andWhere('project.endDate <= :endDateTo', { endDateTo });
    }

    // Apply sorting
    const allowedSortFields = [
      'name',
      'status',
      'type',
      'startDate',
      'endDate',
      'createdAt',
      'updatedAt',
    ];

    if (allowedSortFields.includes(sortBy)) {
      queryBuilder.orderBy(`project.${sortBy}`, sortOrder as 'ASC' | 'DESC');
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const projects = await queryBuilder.getMany();

    return {
      data: projects.map(this.formatProjectResponse),
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
   * Get project by ID
   */
  async findOne(id: string): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.formatProjectResponse(project);
  }

  /**
   * Update project
   */
  async update(id: string, updateDto: ProjectUpdateDto): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate methodology if provided
    if (updateDto.methodology) {
      this.validateMethodology(updateDto.methodology, updateDto.type || project.type);
    }

    // Update project fields
    Object.assign(project, {
      ...updateDto,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : project.startDate,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : project.endDate,
    });

    const updatedProject = await this.projectRepository.save(project);
    return this.formatProjectResponse(updatedProject);
  }

  /**
   * Delete project (soft delete by changing status)
   */
  async remove(id: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Soft delete by setting status to cancelled
    await this.projectRepository.update(id, {
      status: ProjectStatus.CANCELLED,
    });
  }

  /**
   * Update project status with workflow validation
   */
  async updateStatus(id: string, statusDto: ProjectStatusUpdateDto): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate status transition
    this.validateStatusTransition(project.status, statusDto.status);

    // Additional business logic for specific transitions
    if (statusDto.status === ProjectStatus.ACTIVE && project.status === ProjectStatus.DRAFT) {
      // Validate required fields before activation
      this.validateProjectForActivation(project);
    }

    if (statusDto.status === ProjectStatus.COMPLETED) {
      // Check if project can be completed
      await this.validateProjectForCompletion(project);
    }

    // Update status and add metadata about the change
    const updatedMetadata = {
      ...project.metadata,
      statusHistory: [
        ...(project.metadata?.statusHistory || []),
        {
          from: project.status,
          to: statusDto.status,
          reason: statusDto.reason,
          notes: statusDto.notes,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    Object.assign(project, {
      status: statusDto.status,
      metadata: updatedMetadata,
    });

    const updatedProject = await this.projectRepository.save(project);
    return this.formatProjectResponse(updatedProject);
  }

  /**
   * Get project templates
   */
  async getTemplates(options: { page?: number; limit?: number; type?: ProjectType; tags?: string[] } = {}): Promise<ProjectTemplatesPaginatedResponseDto> {
    const { page = 1, limit = 10, type, tags } = options;

    let templates = [...PROJECT_TEMPLATES];

    // Filter by type
    if (type) {
      templates = templates.filter(t => t.type === type);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      templates = templates.filter(t => t.tags?.some(tag => tags.includes(tag)));
    }

    // Filter active templates only
    templates = templates.filter(t => t.isActive);

    const total = templates.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTemplates = templates.slice(startIndex, endIndex);

    return {
      data: paginatedTemplates,
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
   * Create project template
   */
  async createTemplate(createDto: ProjectTemplateCreateDto): Promise<ProjectTemplateDto> {
    // Validate methodology
    this.validateMethodology(createDto.methodology, createDto.type);

    const template: ProjectTemplateDto = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...createDto,
      isActive: true,
      version: createDto.version || '1.0',
    };

    PROJECT_TEMPLATES.push(template);
    return template;
  }

  /**
   * Update project template
   */
  async updateTemplate(id: string, updateDto: ProjectTemplateUpdateDto): Promise<ProjectTemplateDto> {
    const templateIndex = PROJECT_TEMPLATES.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      throw new NotFoundException('Template not found');
    }

    const template = PROJECT_TEMPLATES[templateIndex];

    // Validate methodology if provided
    if (updateDto.methodology) {
      this.validateMethodology(updateDto.methodology, updateDto.type || template.type);
    }

    const updatedTemplate = {
      ...template,
      ...updateDto,
    };

    PROJECT_TEMPLATES[templateIndex] = updatedTemplate;
    return updatedTemplate;
  }

  /**
   * Delete project template
   */
  async deleteTemplate(id: string): Promise<void> {
    const templateIndex = PROJECT_TEMPLATES.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      throw new NotFoundException('Template not found');
    }

    // Soft delete by setting isActive to false
    PROJECT_TEMPLATES[templateIndex].isActive = false;
  }

  /**
   * Get project collaborators
   */
  async getCollaborators(projectId: string): Promise<ProjectCollaboratorsResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const collaborators = PROJECT_COLLABORATORS.get(projectId) || [];
    
    return {
      data: collaborators,
      total: collaborators.length,
    };
  }

  /**
   * Add project collaborator
   */
  async addCollaborator(projectId: string, addDto: CollaboratorAddDto): Promise<ProjectCollaboratorsResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: addDto.collaborator.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const collaborators = PROJECT_COLLABORATORS.get(projectId) || [];
    
    // Check if user is already a collaborator
    if (collaborators.some(c => c.userId === addDto.collaborator.userId)) {
      throw new ConflictException('User is already a collaborator on this project');
    }

    collaborators.push(addDto.collaborator);
    PROJECT_COLLABORATORS.set(projectId, collaborators);

    return {
      data: collaborators,
      total: collaborators.length,
    };
  }

  /**
   * Remove project collaborator
   */
  async removeCollaborator(projectId: string, userId: string): Promise<ProjectCollaboratorsResponseDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const collaborators = PROJECT_COLLABORATORS.get(projectId) || [];
    const updatedCollaborators = collaborators.filter(c => c.userId !== userId);
    
    PROJECT_COLLABORATORS.set(projectId, updatedCollaborators);

    return {
      data: updatedCollaborators,
      total: updatedCollaborators.length,
    };
  }

  /**
   * Get project analytics
   */
  async getAnalytics(projectId: string): Promise<ProjectAnalyticsDto> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['owner', 'documents', 'calendarEvents'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const collaborators = PROJECT_COLLABORATORS.get(projectId) || [];
    const now = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const daysUntilDeadline = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      type: project.type,
      duration: project.getDurationInDays(),
      progress: this.calculateProjectProgress(project),
      documentsCount: project.documents?.length || 0,
      collaboratorsCount: collaborators.length,
      milestonesCount: project.calendarEvents?.filter(e => e.type === 'deadline').length || 0,
      completedMilestonesCount: 0, // Would be calculated based on actual milestone completion
      daysUntilDeadline: daysUntilDeadline || 0,
      isOverdue: endDate ? now > endDate : false,
      owner: {
        id: project.owner.id,
        firstName: project.owner.firstName,
        lastName: project.owner.lastName,
        email: project.owner.email,
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /**
   * Get project statistics
   */
  async getProjectStats(tenantId?: string): Promise<ProjectStats> {
    const queryBuilder = this.projectRepository.createQueryBuilder('project');

    if (tenantId) {
      queryBuilder.where('project.tenantId = :tenantId', { tenantId });
    }

    const projects = await queryBuilder.getMany();

    const total = projects.length;
    const byStatus = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<ProjectStatus, number>);

    const byType = projects.reduce((acc, project) => {
      acc[project.type] = (acc[project.type] || 0) + 1;
      return acc;
    }, {} as Record<ProjectType, number>);

    const active = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
    const completed = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
    const overdue = projects.filter(p => {
      if (!p.endDate || p.status === ProjectStatus.COMPLETED) return false;
      return new Date() > new Date(p.endDate);
    }).length;

    const averageDuration = projects
      .filter(p => p.endDate)
      .reduce((sum, p) => sum + p.getDurationInDays(), 0) / (projects.filter(p => p.endDate).length || 1);

    return {
      total,
      byStatus,
      byType,
      active,
      completed,
      overdue,
      averageDuration,
    };
  }

  /**
   * Get project documents
   */
  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.documentRepository.find({
      where: { projectId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Validate methodology requirements
   */
  private validateMethodology(methodology: MethodologyDto, projectType: ProjectType): void {
    if (!methodology.id || !methodology.name || !methodology.version) {
      throw new BadRequestException('Methodology must have id, name, and version');
    }

    // Type-specific validation
    if (projectType === ProjectType.AUDIT) {
      if (!methodology.requirements?.verificationRequired) {
        throw new BadRequestException('Audit projects require verification in methodology');
      }
    }

    if (projectType === ProjectType.COMPLIANCE) {
      if (!methodology.requirements?.reportingFrequency) {
        throw new BadRequestException('Compliance projects require reporting frequency in methodology');
      }
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(from: ProjectStatus, to: ProjectStatus): void {
    const validTransitions = {
      [ProjectStatus.DRAFT]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
      [ProjectStatus.COMPLETED]: [], // Terminal state
      [ProjectStatus.CANCELLED]: [], // Terminal state
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new BadRequestException(`Invalid status transition from ${from} to ${to}`);
    }
  }

  /**
   * Validate project can be activated
   */
  private validateProjectForActivation(project: Project): void {
    if (!project.name || !project.type || !project.startDate) {
      throw new BadRequestException('Project must have name, type, and start date before activation');
    }

    if (project.type === ProjectType.AUDIT && !project.methodology) {
      throw new BadRequestException('Audit projects must have methodology defined');
    }
  }

  /**
   * Validate project can be completed
   */
  private async validateProjectForCompletion(project: Project): Promise<void> {
    // Check if all required documents are present
    const documents = await this.documentRepository.find({
      where: { projectId: project.id },
    });

    if (project.type === ProjectType.AUDIT && documents.length === 0) {
      throw new BadRequestException('Audit projects must have at least one document before completion');
    }

    // Check if project has end date when completing
    if (!project.endDate) {
      throw new BadRequestException('Project must have an end date before completion');
    }
  }

  /**
   * Calculate project progress (simplified implementation)
   */
  private calculateProjectProgress(project: Project): number {
    const now = new Date();
    const start = new Date(project.startDate);
    const end = project.endDate ? new Date(project.endDate) : null;

    if (project.status === ProjectStatus.COMPLETED) {
      return 100;
    }

    if (project.status === ProjectStatus.CANCELLED) {
      return 0;
    }

    if (!end) {
      // If no end date, estimate based on status
      switch (project.status) {
        case ProjectStatus.DRAFT:
          return 0;
        case ProjectStatus.ACTIVE:
          return 25;
        case ProjectStatus.ON_HOLD:
          return 50;
        default:
          return 0;
      }
    }

    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

    return Math.round(progress);
  }

  /**
   * Format project response
   */
  private formatProjectResponse(project: Project): ProjectResponseDto {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      type: project.type,
      startDate: project.startDate,
      endDate: project.endDate,
      methodology: project.methodology,
      metadata: project.metadata,
      owner: {
        id: project.owner.id,
        firstName: project.owner.firstName,
        lastName: project.owner.lastName,
        email: project.owner.email,
      },
      tenantId: project.tenantId,
      tags: project.tags,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      duration: project.getDurationInDays(),
      isActive: project.isActive(),
      isCompleted: project.isCompleted(),
      isOnHold: project.isOnHold(),
      isDraft: project.isDraft(),
    };
  }
}