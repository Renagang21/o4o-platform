import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

/**
 * Widget Area Entity
 * Represents a widget area/sidebar location where widgets can be placed
 */
@Entity('widget_areas')
export class WidgetArea {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  location?: string; // e.g., 'header', 'footer', 'sidebar', 'content'

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  // Meta data for additional configuration (stored as JSON)
  @Column({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;

  @CreateDateColumn({ name: 'createdAt' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updated_at!: Date;
}
