import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum DocumentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum DocumentCategory {
  METHODOLOGY = 'methodology',
  AUDIT_REPORT = 'audit_report',
  COMPLIANCE_DOCUMENT = 'compliance_document',
  EVIDENCE = 'evidence',
  CORRESPONDENCE = 'correspondence',
  OTHER = 'other',
}

@Entity('documents')
@Index(['category', 'status'])
@Index(['projectId'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
  })
  category: DocumentCategory;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status: DocumentStatus;

  @Column({ default: 1 })
  version: number;

  @Column()
  fileName: string;

  @Column()
  originalFileName: string;

  @Column()
  filePath: string;

  @Column()
  fileUrl: string;

  @Column()
  mimeType: string;

  @Column()
  fileSize: number;

  @Column({ nullable: true })
  checksum: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  tenantId: string;

  // Relations
  @ManyToOne(() => User, (user) => user.uploadedDocuments)
  uploadedBy: User;

  @Column()
  uploadedById: string;

  @ManyToOne(() => Project, (project) => project.documents, { nullable: true })
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isDraft(): boolean {
    return this.status === DocumentStatus.DRAFT;
  }

  isInReview(): boolean {
    return this.status === DocumentStatus.REVIEW;
  }

  isApproved(): boolean {
    return this.status === DocumentStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === DocumentStatus.REJECTED;
  }

  isArchived(): boolean {
    return this.status === DocumentStatus.ARCHIVED;
  }

  isMethodologyDocument(): boolean {
    return this.category === DocumentCategory.METHODOLOGY;
  }

  isAuditDocument(): boolean {
    return this.category === DocumentCategory.AUDIT_REPORT;
  }

  isComplianceDocument(): boolean {
    return this.category === DocumentCategory.COMPLIANCE_DOCUMENT;
  }

  getFileExtension(): string {
    return this.originalFileName.split('.').pop()?.toLowerCase() || '';
  }

  formatFileSize(): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}