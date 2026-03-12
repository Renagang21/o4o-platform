import {
  Entity,
  PrimaryColumn,
  Index,
} from 'typeorm';

/**
 * TemplateCategoryMap Entity
 *
 * Template ↔ Category 다대다 매핑
 */
@Entity('lms_template_category_map')
@Index(['templateId', 'categoryId'], { unique: true })
export class TemplateCategoryMap {
  @PrimaryColumn({ type: 'uuid' })
  templateId!: string;

  @PrimaryColumn({ type: 'uuid' })
  categoryId!: string;
}
