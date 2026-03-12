import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * StoreContent Status
 *
 * 매장 콘텐츠 상태
 */
export enum StoreContentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

/**
 * StoreContent Entity
 *
 * Template을 매장에 복사하여 사용하는 콘텐츠
 *
 * 흐름: Template → Store Copy → StoreContent → 매장 수정
 * - Template 원본은 수정하지 않음
 * - TemplateVersion 기반 복사
 * - 매장에서 텍스트/이미지/문구 자유 수정
 */
@Entity('store_contents')
@Index(['storeId', 'status'])
@Index(['templateId'])
@Index(['storeId', 'templateId'])
@Index(['slug'], { unique: true })
export class StoreContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  templateId!: string;

  @Column({ type: 'uuid' })
  templateVersionId!: string;

  @Column({ type: 'uuid' })
  storeId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: StoreContentStatus,
    default: StoreContentStatus.DRAFT,
  })
  status!: StoreContentStatus;

  // WO-O4O-STORE-CONTENT-USAGE
  @Column({ type: 'varchar', length: 200, nullable: true, unique: true })
  slug?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  shareImage?: string;

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  activate(): void {
    this.status = StoreContentStatus.ACTIVE;
  }

  archive(): void {
    this.status = StoreContentStatus.ARCHIVED;
  }

  isEditable(): boolean {
    return this.status !== StoreContentStatus.ARCHIVED;
  }
}
