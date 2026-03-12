import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * TemplateVersion Status
 */
export enum TemplateVersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * TemplateVersion Entity
 *
 * 템플릿 버전 관리
 * 각 Template은 여러 TemplateVersion을 가질 수 있다.
 */
@Entity('lms_template_versions')
@Index(['templateId', 'versionNumber'])
@Index(['templateId', 'status'])
export class TemplateVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  templateId!: string;

  @Column({ type: 'integer', default: 1 })
  versionNumber!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TemplateVersionStatus,
    default: TemplateVersionStatus.DRAFT,
  })
  status!: TemplateVersionStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Helper Methods

  /**
   * Publish this version
   */
  publish(): void {
    this.status = TemplateVersionStatus.PUBLISHED;
  }

  /**
   * Archive this version
   */
  archive(): void {
    this.status = TemplateVersionStatus.ARCHIVED;
  }
}
