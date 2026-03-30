/**
 * ContentTemplate Entity
 *
 * WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1
 *
 * 사용자가 저장한 HTML 콘텐츠 템플릿.
 * RichTextEditor에서 불러오기/저장하기로 재사용.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'content_templates' })
@Index(['createdByUserId'])
@Index(['serviceKey', 'isActive'])
@Index(['category', 'isActive'])
export class ContentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100, default: 'general' })
  category!: string;

  @Column({ type: 'text' })
  contentHtml!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serviceKey!: string | null;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @Column({ type: 'varchar', length: 100 })
  createdByUserName!: string;

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
