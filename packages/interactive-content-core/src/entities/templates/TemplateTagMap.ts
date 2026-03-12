import {
  Entity,
  PrimaryColumn,
  Index,
} from 'typeorm';

/**
 * TemplateTagMap Entity
 *
 * Template ↔ Tag 다대다 매핑
 */
@Entity('lms_template_tag_map')
@Index(['templateId', 'tagId'], { unique: true })
export class TemplateTagMap {
  @PrimaryColumn({ type: 'uuid' })
  templateId!: string;

  @PrimaryColumn({ type: 'uuid' })
  tagId!: string;
}
