import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * StoreContentBlock Type
 */
export enum StoreContentBlockType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  QUESTION = 'question',
  CHOICE = 'choice',
}

/**
 * StoreContentBlock Entity
 *
 * StoreContent의 콘텐츠 블록
 * TemplateBlock에서 복사되며, 매장에서 독립적으로 수정 가능
 */
@Entity('store_content_blocks')
@Index(['storeContentId', 'position'])
export class StoreContentBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  storeContentId!: string;

  @Column({ type: 'enum', enum: StoreContentBlockType })
  blockType!: StoreContentBlockType;

  @Column({ type: 'jsonb', default: {} })
  content!: Record<string, any>;

  @Column({ type: 'integer', default: 0 })
  position!: number;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
