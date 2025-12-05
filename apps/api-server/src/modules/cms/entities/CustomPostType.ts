import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CPTStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

export interface CPTSchema {
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'file' | 'relation';
    required: boolean;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }>;
}

@Entity('cms_post_types')
@Index(['slug'], { unique: true })
@Index(['status'])
export class CustomPostType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string; // e.g., 'blog', 'portfolio', 'testimonial'

  @Column({ type: 'varchar', length: 255 })
  name: string; // e.g., 'Blog Posts'

  @Column({ type: 'varchar', length: 50 })
  icon: string; // e.g., 'article', 'camera', 'star'

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', name: 'schema' })
  schema: CPTSchema; // Field definitions

  @Column({ type: 'enum', enum: CPTStatus, default: CPTStatus.DRAFT, name: 'status' })
  status: CPTStatus;

  @Column({ type: 'boolean', default: true, name: 'ispublic' })
  isPublic: boolean; // Can be used in public pages

  @Column({ type: 'boolean', default: false, name: 'ishierarchical' })
  isHierarchical: boolean; // Supports parent/child posts

  @Column({ type: 'simple-array', nullable: true, name: 'supportedfeatures' })
  supportedFeatures?: string[]; // ['comments', 'revisions', 'featured_image']

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;

  // Helper Methods
  isActive(): boolean {
    return this.status === CPTStatus.ACTIVE;
  }

  validateField(fieldName: string, value: any): boolean {
    const field = this.schema.fields.find(f => f.name === fieldName);
    if (!field) return false;

    if (field.required && (value === null || value === undefined)) return false;

    // Add more validation logic
    return true;
  }
}
