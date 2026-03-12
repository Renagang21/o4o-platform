import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Template Type
 *
 * 콘텐츠 템플릿 유형
 */
export enum TemplateType {
  LECTURE = 'lecture',
  QUIZ = 'quiz',
  SURVEY = 'survey',
}

/**
 * Template Visibility
 *
 * 템플릿 공개 범위
 */
export enum TemplateVisibility {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

/**
 * Template Status
 *
 * 템플릿 상태
 */
export enum TemplateStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * Template Entity
 *
 * 콘텐츠 템플릿 정의
 *
 * 사용 사례:
 * - 강의 템플릿 (lecture)
 * - 퀴즈 템플릿 (quiz)
 * - 설문 템플릿 (survey)
 */
@Entity('lms_templates')
@Index(['type', 'status'])
@Index(['authorUserId'])
@Index(['organizationId', 'visibility'])
@Index(['serviceKey', 'status'])
@Index(['status', 'createdAt'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: TemplateType })
  type!: TemplateType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail?: string;

  @Column({ type: 'uuid', nullable: true })
  authorUserId?: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serviceKey?: string;

  @Column({
    type: 'enum',
    enum: TemplateVisibility,
    default: TemplateVisibility.PRIVATE,
  })
  visibility!: TemplateVisibility;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  status!: TemplateStatus;

  @Column({ type: 'uuid', nullable: true })
  currentVersionId?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Publish the template
   */
  publish(): void {
    this.status = TemplateStatus.PUBLISHED;
  }

  /**
   * Archive the template
   */
  archive(): void {
    this.status = TemplateStatus.ARCHIVED;
  }

  /**
   * Check if template is editable (draft only)
   */
  isEditable(): boolean {
    return this.status === TemplateStatus.DRAFT;
  }
}
