import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * TemplateCategory Entity
 *
 * 템플릿 카테고리 정의
 */
@Entity('lms_template_categories')
@Index(['slug'], { unique: true })
export class TemplateCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
