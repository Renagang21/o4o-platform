import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * TemplateTag Entity
 *
 * 템플릿 태그 정의
 */
@Entity('lms_template_tags')
@Index(['slug'], { unique: true })
export class TemplateTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
