import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { User } from './User'

export interface FieldOption {
  label: string
  value: string
}

export interface ValidationRules {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  custom?: string
}

export interface ConditionalLogic {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
}

export interface LocationRule {
  param: string // post_type, post_template, post_category, etc.
  operator: '==' | '!=' | 'contains'
  value: string
}

@Entity('custom_field_groups')
export class FieldGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 255 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string

  @OneToMany(() => CustomField, field => field.group, { cascade: true })
  fields!: CustomField[]

  @Column({ type: 'json' })
  location!: LocationRule[] // Where this field group appears

  @Column({ type: 'json', nullable: true })
  rules!: LocationRule // Additional conditional rules

  @Column({ type: 'json', nullable: true })
  options!: {
    position?: 'high' | 'core' | 'normal' | 'side'
    style?: 'default' | 'seamless'
    labelPlacement?: 'top' | 'left'
    instructionPlacement?: 'label' | 'field'
    hideOnScreen?: string[]
    description?: string
  }

  @Column({ default: true })
  active!: boolean

  @Column({ default: 0 })
  order!: number

  @Column({ 
    type: 'enum', 
    enum: ['normal', 'high', 'side'],
    default: 'normal'
  })
  placement!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

@Entity('custom_fields')
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ length: 255 })
  name!: string

  @Column({ length: 255 })
  label!: string

  @Column({ 
    type: 'enum',
    enum: [
      'text', 'textarea', 'number', 'email', 'url', 'password',
      'select', 'checkbox', 'radio', 'toggle',
      'date', 'datetime_local', 'time',
      'image', 'file', 'gallery',
      'wysiwyg', 'code',
      'color', 'range',
      'repeater', 'group',
      'taxonomy', 'post_object', 'page_link', 'user'
    ]
  })
  type!: string

  @Column({ type: 'text', nullable: true })
  description!: string

  @Column({ default: false })
  required!: boolean

  @Column({ type: 'text', nullable: true })
  defaultValue!: string

  @Column({ type: 'text', nullable: true })
  placeholder!: string

  @Column({ type: 'json', nullable: true })
  validation!: ValidationRules

  @Column({ type: 'json', nullable: true })
  conditionalLogic!: ConditionalLogic[]

  @Column({ type: 'json', nullable: true })
  options!: FieldOption[] // For select, radio, checkbox

  @Column({ type: 'int', nullable: true })
  min!: number

  @Column({ type: 'int', nullable: true })
  max!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  step!: number

  @Column({ type: 'int', nullable: true })
  maxLength!: number

  @Column({ type: 'int', nullable: true })
  minLength!: number

  @Column({ type: 'text', nullable: true })
  pattern!: string

  @Column({ default: false })
  multiple!: boolean

  @Column({ default: 0 })
  order!: number

  @Column({ type: 'uuid' })
  groupId!: string

  @ManyToOne(() => FieldGroup, group => group.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group!: FieldGroup

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}

@Entity('custom_field_values')
export class CustomFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  fieldId!: string

  @ManyToOne(() => CustomField, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldId' })
  field!: CustomField

  @Column({ type: 'uuid' })
  entityId!: string // ID of the page, post, user, etc.

  @Column({ length: 50 })
  entityType!: string // 'page', 'post', 'user', 'term', etc.

  @Column({ type: 'json' })
  value!: any

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}