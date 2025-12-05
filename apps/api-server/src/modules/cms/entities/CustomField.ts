import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { CustomPostType } from './CustomPostType.js';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  EMAIL = 'email',
  URL = 'url',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE = 'file',
  IMAGE = 'image',
  WYSIWYG = 'wysiwyg',
  RELATION = 'relation', // Link to other CPT posts
  REPEATER = 'repeater',
  GROUP = 'group'
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  allowedTypes?: string[]; // For file/image fields
  maxFileSize?: number; // In bytes
}

export interface FieldConditional {
  field: string; // Field name to check
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

@Entity('custom_fields')
@Index(['postTypeId'])
@Index(['key'], { unique: true })
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  postTypeId: string;

  @ManyToOne('CustomPostType', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postTypeId' })
  postType: CustomPostType;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string; // e.g., 'blog_author', 'portfolio_client'

  @Column({ type: 'varchar', length: 255 })
  label: string; // e.g., 'Author Name', 'Client'

  @Column({ type: 'enum', enum: FieldType })
  type: FieldType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  placeholder?: string;

  @Column({ type: 'text', nullable: true })
  defaultValue?: string;

  @Column({ type: 'jsonb', nullable: true })
  validation?: FieldValidation;

  @Column({ type: 'jsonb', nullable: true })
  options?: Record<string, any>; // For select, radio, etc.

  @Column({ type: 'jsonb', nullable: true })
  conditional?: FieldConditional[]; // Show field only if conditions met

  @Column({ type: 'integer', default: 0 })
  order: number; // Display order in form

  @Column({ type: 'varchar', length: 50, nullable: true })
  group?: string; // Group fields together (e.g., 'Contact Info')

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper Methods
  validate(value: any): { valid: boolean; error?: string } {
    if (this.validation?.required && !value) {
      return { valid: false, error: `${this.label} is required` };
    }

    if (this.type === FieldType.EMAIL && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Invalid email format' };
      }
    }

    // Add more validation logic
    return { valid: true };
  }

  checkConditional(fieldValues: Record<string, any>): boolean {
    if (!this.conditional || this.conditional.length === 0) return true;

    return this.conditional.every(cond => {
      const fieldValue = fieldValues[cond.field];

      switch (cond.operator) {
        case 'equals':
          return fieldValue === cond.value;
        case 'not_equals':
          return fieldValue !== cond.value;
        case 'contains':
          return String(fieldValue).includes(cond.value);
        case 'greater_than':
          return Number(fieldValue) > Number(cond.value);
        case 'less_than':
          return Number(fieldValue) < Number(cond.value);
        default:
          return true;
      }
    });
  }
}
