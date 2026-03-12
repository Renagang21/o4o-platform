import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * TemplateBlock Type
 */
export enum TemplateBlockType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  QUESTION = 'question',
  CHOICE = 'choice',
}

/**
 * TemplateBlock Entity
 *
 * 템플릿 콘텐츠 구조
 * 각 TemplateVersion은 여러 TemplateBlock을 가진다.
 * ContentBundle과 선택적으로 연결 가능.
 */
@Entity('lms_template_blocks')
@Index(['templateVersionId', 'position'])
@Index(['bundleId'])
export class TemplateBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  templateVersionId!: string;

  @Column({ type: 'enum', enum: TemplateBlockType })
  blockType!: TemplateBlockType;

  @Column({ type: 'jsonb', default: {} })
  content!: Record<string, any>;

  @Column({ type: 'integer', default: 0 })
  position!: number;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  // ContentBundle 연결 (optional)
  @Column({ type: 'uuid', nullable: true })
  bundleId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
