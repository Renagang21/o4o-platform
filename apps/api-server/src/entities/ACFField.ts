import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { ACFFieldGroup } from './ACFFieldGroup.js';

export enum ACFFieldType {
  // Basic
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  EMAIL = 'email',
  URL = 'url',
  PASSWORD = 'password',
  
  // Content
  WYSIWYG = 'wysiwyg',
  OEMBED = 'oembed',
  IMAGE = 'image',
  FILE = 'file',
  GALLERY = 'gallery',
  
  // Choice
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  TRUE_FALSE = 'true_false',
  BUTTON_GROUP = 'button_group',
  
  // Relational
  POST_OBJECT = 'post_object',
  PAGE_LINK = 'page_link',
  RELATIONSHIP = 'relationship',
  TAXONOMY = 'taxonomy',
  USER = 'user',
  
  // jQuery
  COLOR_PICKER = 'color_picker',
  DATE_PICKER = 'date_picker',
  DATE_TIME_PICKER = 'date_time_picker',
  TIME_PICKER = 'time_picker',
  GOOGLE_MAP = 'google_map',
  
  // Layout
  TAB = 'tab',
  GROUP = 'group',
  REPEATER = 'repeater',
  FLEXIBLE_CONTENT = 'flexible_content',
  CLONE = 'clone',
  MESSAGE = 'message',
  ACCORDION = 'accordion'
}

export enum ConditionalOperator {
  EQUALS = '==',
  NOT_EQUALS = '!=',
  CONTAINS = 'contains',
  NOT_CONTAINS = '!contains',
  EMPTY = 'empty',
  NOT_EMPTY = '!empty',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  PATTERN_MATCH = 'pattern'
}

export interface ConditionalRule {
  field: string; // Field key to check
  operator: ConditionalOperator;
  value: any;
}

export interface ConditionalLogic {
  enabled: boolean;
  rules: ConditionalRule[][];  // Array of AND groups (OR between groups)
}

export interface FieldChoices {
  [key: string]: string; // value: label
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  email?: boolean;
  url?: boolean;
  unique?: boolean;
}

export interface FieldAppearance {
  wrapper?: {
    width?: string;
    class?: string;
    id?: string;
  };
  class?: string;
  id?: string;
  readonly?: boolean;
  disabled?: boolean;
}

@Entity('acf_fields')
@Index(['fieldGroupId', 'order'])
@Index(['key'], { unique: true })
@Index(['name'])
@Index(['type'])
export class ACFField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  fieldGroupId!: string;

  @ManyToOne('ACFFieldGroup', { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'fieldGroupId' })
  fieldGroup!: Promise<ACFFieldGroup>;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string; // Field name for data storage

  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string; // field_key format

  @Column({ 
    type: 'enum', 
    enum: ACFFieldType
  })
  type!: ACFFieldType;

  @Column({ type: 'text', nullable: true })
  instructions?: string;

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ type: 'text', nullable: true })
  defaultValue?: string;

  @Column({ type: 'text', nullable: true })
  placeholder?: string;

  @Column({ type: 'text', nullable: true })
  prependText?: string;

  @Column({ type: 'text', nullable: true })
  appendText?: string;

  // For choice fields
  @Column({ type: 'json', nullable: true })
  choices?: FieldChoices;

  @Column({ type: 'boolean', default: false })
  allowNull?: boolean;

  @Column({ type: 'boolean', default: false })
  multiple?: boolean;

  @Column({ type: 'boolean', default: false })
  allowCustom?: boolean; // Allow custom values in select

  @Column({ type: 'varchar', length: 50, nullable: true })
  layout?: string; // 'vertical', 'horizontal', 'block'

  // For number fields
  @Column({ type: 'int', nullable: true })
  min?: number;

  @Column({ type: 'int', nullable: true })
  max?: number;

  @Column({ type: 'float', nullable: true })
  step?: number;

  // For text/textarea fields
  @Column({ type: 'int', nullable: true })
  minLength?: number;

  @Column({ type: 'int', nullable: true })
  maxLength?: number;

  @Column({ type: 'int', nullable: true })
  rows?: number; // For textarea

  @Column({ type: 'boolean', default: false })
  newLines?: boolean; // For textarea: convert newlines to <br>

  // For image/file fields
  @Column({ type: 'varchar', length: 50, nullable: true })
  returnFormat?: string; // 'array', 'url', 'id'

  @Column({ type: 'varchar', length: 50, nullable: true })
  previewSize?: string; // 'thumbnail', 'medium', 'large', 'full'

  @Column({ type: 'varchar', length: 50, nullable: true })
  library?: string; // 'all', 'uploadedTo'

  @Column({ type: 'int', nullable: true })
  minWidth?: number;

  @Column({ type: 'int', nullable: true })
  minHeight?: number;

  @Column({ type: 'int', nullable: true })
  maxWidth?: number;

  @Column({ type: 'int', nullable: true })
  maxHeight?: number;

  @Column({ type: 'int', nullable: true })
  minSize?: number; // In MB

  @Column({ type: 'int', nullable: true })
  maxSize?: number; // In MB

  @Column({ type: 'simple-array', nullable: true })
  mimeTypes?: string[]; // Allowed MIME types

  // For WYSIWYG editor
  @Column({ type: 'boolean', default: true })
  tabs?: boolean; // Show tabs in editor

  @Column({ type: 'varchar', length: 50, default: 'all' })
  toolbar?: string; // 'full', 'basic', 'custom'

  @Column({ type: 'boolean', default: false })
  mediaUpload?: boolean;

  // For date/time fields
  @Column({ type: 'varchar', length: 50, nullable: true })
  displayFormat?: string; // PHP date format

  @Column({ type: 'varchar', length: 50, nullable: true })
  returnDateFormat?: string; // PHP date format for return value

  @Column({ type: 'int', nullable: true })
  firstDay?: number; // 0 = Sunday, 1 = Monday

  // For relationship fields
  @Column({ type: 'simple-array', nullable: true })
  postTypes?: string[]; // Filter by post types

  @Column({ type: 'simple-array', nullable: true })
  taxonomies?: string[]; // Filter by taxonomies

  @Column({ type: 'json', nullable: true })
  filters?: string[]; // 'search', 'post_type', 'taxonomy'

  @Column({ type: 'int', nullable: true })
  minPosts?: number;

  @Column({ type: 'int', nullable: true })
  maxPosts?: number;

  // For repeater/flexible content
  @Column({ type: 'json', nullable: true })
  subFields?: any[]; // Nested fields for repeater/group/flexible

  @Column({ type: 'varchar', length: 50, nullable: true })
  buttonLabel?: string; // "Add Row" button text

  @Column({ type: 'int', nullable: true })
  minRows?: number;

  @Column({ type: 'int', nullable: true })
  maxRows?: number;

  @Column({ type: 'varchar', length: 50, default: 'table' })
  repeaterLayout?: string; // 'table', 'block', 'row'

  // For flexible content
  @Column({ type: 'json', nullable: true })
  layouts?: any[]; // Layout definitions for flexible content

  // For clone field
  @Column({ type: 'simple-array', nullable: true })
  cloneFields?: string[]; // Field keys to clone

  @Column({ type: 'varchar', length: 50, default: 'seamless' })
  cloneDisplay?: string; // 'seamless', 'group'

  @Column({ type: 'boolean', default: false })
  prefixLabel?: boolean;

  @Column({ type: 'boolean', default: false })
  prefixName?: boolean;

  // Conditional logic
  @Column({ type: 'json', nullable: true })
  conditionalLogic?: ConditionalLogic;

  // Validation rules
  @Column({ type: 'json', nullable: true })
  validation?: FieldValidation;

  // Appearance settings
  @Column({ type: 'json', nullable: true })
  appearance?: FieldAppearance;

  // Field order
  @Column({ type: 'int', default: 0 })
  order!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  generateKey(): string {
    if (!this.key) {
      // Generate a unique key based on name
      const base = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      this.key = `field_${base}_${Date.now()}`;
    }
    return this.key;
  }

  validateValue(value: any): boolean {
    if (!this.validation) return true;

    if (this.validation.required && !value) {
      return false;
    }

    if (this.type === ACFFieldType.NUMBER) {
      const num = Number(value);
      if (this.validation.min !== undefined && num < this.validation.min) return false;
      if (this.validation.max !== undefined && num > this.validation.max) return false;
    }

    if (this.type === ACFFieldType.TEXT || this.type === ACFFieldType.TEXTAREA) {
      const str = String(value);
      if (this.validation.minLength && str.length < this.validation.minLength) return false;
      if (this.validation.maxLength && str.length > this.validation.maxLength) return false;
      if (this.validation.pattern && !new RegExp(this.validation.pattern).test(str)) return false;
    }

    if (this.type === ACFFieldType.EMAIL && this.validation.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) return false;
    }

    if (this.type === ACFFieldType.URL && this.validation.url) {
      try {
        new URL(String(value));
      } catch {
        return false;
      }
    }

    return true;
  }

  checkConditionalLogic(fieldValues: Record<string, any>): boolean {
    if (!this.conditionalLogic || !this.conditionalLogic.enabled) {
      return true; // Always show if no conditional logic
    }

    // OR logic between rule groups
    return this.conditionalLogic.rules.some(ruleGroup => {
      // AND logic within each group
      return ruleGroup.every(rule => {
        const fieldValue = fieldValues[rule.field];
        
        switch (rule.operator) {
          case ConditionalOperator.EQUALS:
            return fieldValue == rule.value;
          case ConditionalOperator.NOT_EQUALS:
            return fieldValue != rule.value;
          case ConditionalOperator.CONTAINS:
            return String(fieldValue).includes(String(rule.value));
          case ConditionalOperator.NOT_CONTAINS:
            return !String(fieldValue).includes(String(rule.value));
          case ConditionalOperator.EMPTY:
            return !fieldValue || fieldValue === '' || fieldValue.length === 0;
          case ConditionalOperator.NOT_EMPTY:
            return fieldValue && fieldValue !== '' && fieldValue.length !== 0;
          case ConditionalOperator.GREATER_THAN:
            return Number(fieldValue) > Number(rule.value);
          case ConditionalOperator.LESS_THAN:
            return Number(fieldValue) < Number(rule.value);
          case ConditionalOperator.PATTERN_MATCH:
            return new RegExp(String(rule.value)).test(String(fieldValue));
          default:
            return false;
        }
      });
    });
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      name: this.name,
      key: this.key,
      type: this.type,
      instructions: this.instructions,
      required: this.required,
      defaultValue: this.defaultValue,
      placeholder: this.placeholder,
      choices: this.choices,
      conditionalLogic: this.conditionalLogic,
      validation: this.validation,
      appearance: this.appearance,
      order: this.order,
      // Include type-specific fields
      ...(this.type === ACFFieldType.NUMBER && {
        min: this.min,
        max: this.max,
        step: this.step
      }),
      ...(this.type === ACFFieldType.TEXT && {
        minLength: this.minLength,
        maxLength: this.maxLength
      }),
      ...(this.type === ACFFieldType.REPEATER && {
        subFields: this.subFields,
        minRows: this.minRows,
        maxRows: this.maxRows,
        buttonLabel: this.buttonLabel
      })
    };
  }
}