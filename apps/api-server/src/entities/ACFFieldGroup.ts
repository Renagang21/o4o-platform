import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany
} from 'typeorm';
import { ACFField } from './ACFField.js';

export enum LocationType {
  POST_TYPE = 'post_type',
  PAGE_TEMPLATE = 'page_template',
  POST_CATEGORY = 'post_category',
  POST_TAXONOMY = 'post_taxonomy',
  POST_FORMAT = 'post_format',
  POST_STATUS = 'post_status',
  USER_FORM = 'user_form',
  USER_ROLE = 'user_role',
  OPTIONS_PAGE = 'options_page',
  MENU_ITEM = 'menu_item',
  COMMENT = 'comment',
  WIDGET = 'widget',
  BLOCK = 'block'
}

export enum LocationOperator {
  EQUALS = '==',
  NOT_EQUALS = '!=',
  CONTAINS = 'contains',
  NOT_CONTAINS = '!contains'
}

export interface LocationRule {
  param: LocationType;
  operator: LocationOperator;
  value: string;
}

export interface LocationGroup {
  rules: LocationRule[];
}

export enum PositionType {
  NORMAL = 'normal',
  SIDE = 'side',
  ACF_AFTER_TITLE = 'acf_after_title'
}

export enum StyleType {
  DEFAULT = 'default',
  SEAMLESS = 'seamless'
}

export enum LabelPlacement {
  TOP = 'top',
  LEFT = 'left'
}

@Entity('acf_field_groups')
@Index(['key'], { unique: true })
@Index(['isActive'])
@Index(['menuOrder'])
export class ACFFieldGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key!: string; // field_group_key format

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Location rules for where this field group appears
  @Column({ type: 'json' })
  location!: LocationGroup[]; // Array of location groups (OR between groups, AND within group)

  // Display settings
  @Column({ 
    type: 'enum', 
    enum: PositionType,
    default: PositionType.NORMAL
  })
  position!: PositionType;

  @Column({ 
    type: 'enum', 
    enum: StyleType,
    default: StyleType.DEFAULT
  })
  style!: StyleType;

  @Column({ 
    type: 'enum', 
    enum: LabelPlacement,
    default: LabelPlacement.TOP
  })
  labelPlacement!: LabelPlacement;

  @Column({ type: 'simple-array', nullable: true })
  hideOnScreen?: string[]; // Elements to hide: ['permalink', 'the_content', 'excerpt', etc.]

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  menuOrder!: number;

  // Instructions settings
  @Column({ type: 'boolean', default: false })
  instructionPlacement!: boolean; // false = label, true = field

  // Note: OneToMany relationship with ACFField removed to prevent circular dependency
  // Use ACFFieldRepository.find({ where: { fieldGroupId: fieldGroup.id } }) to get fields

  // WordPress compatibility
  @Column({ type: 'varchar', length: 255, nullable: true })
  wpPostType?: string; // For specific post type associations

  @Column({ type: 'json', nullable: true })
  wpMeta?: Record<string, any>; // Additional WordPress metadata

  // Versioning
  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'json', nullable: true })
  changelog?: Array<{
    version: number;
    date: Date;
    changes: string;
    userId?: string;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @OneToMany('ACFField', 'fieldGroup')
  fields!: ACFField[];

  // Helper methods
  generateKey(): string {
    if (!this.key) {
      // Generate a unique key based on title
      const base = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      this.key = `group_${base}_${Date.now()}`;
    }
    return this.key;
  }

  matchesLocation(context: {
    postType?: string;
    pageTemplate?: string;
    postCategory?: string;
    userRole?: string;
    block?: string;
  }): boolean {
    // Check if any location group matches (OR logic between groups)
    return this.location.some(group => {
      // All rules in a group must match (AND logic within group)
      return group.rules.every(rule => {
        switch (rule.param) {
          case LocationType.POST_TYPE:
            if (rule.operator === LocationOperator.EQUALS) {
              return context.postType === rule.value;
            } else if (rule.operator === LocationOperator.NOT_EQUALS) {
              return context.postType !== rule.value;
            }
            break;
          
          case LocationType.PAGE_TEMPLATE:
            if (rule.operator === LocationOperator.EQUALS) {
              return context.pageTemplate === rule.value;
            } else if (rule.operator === LocationOperator.NOT_EQUALS) {
              return context.pageTemplate !== rule.value;
            }
            break;
          
          case LocationType.USER_ROLE:
            if (rule.operator === LocationOperator.EQUALS) {
              return context.userRole === rule.value;
            } else if (rule.operator === LocationOperator.NOT_EQUALS) {
              return context.userRole !== rule.value;
            }
            break;
          
          case LocationType.BLOCK:
            if (rule.operator === LocationOperator.EQUALS) {
              return context.block === rule.value;
            } else if (rule.operator === LocationOperator.NOT_EQUALS) {
              return context.block !== rule.value;
            }
            break;
          
          // Add more location type checks as needed
        }
        return false;
      });
    });
  }

  clone(): Partial<ACFFieldGroup> {
    const cloned: Partial<ACFFieldGroup> = {
      title: `${this.title} (Copy)`,
      description: this.description,
      location: JSON.parse(JSON.stringify(this.location)),
      position: this.position,
      style: this.style,
      labelPlacement: this.labelPlacement,
      hideOnScreen: this.hideOnScreen ? [...this.hideOnScreen] : undefined,
      isActive: false, // Start as inactive
      menuOrder: this.menuOrder,
      instructionPlacement: this.instructionPlacement,
      wpPostType: this.wpPostType,
      wpMeta: this.wpMeta ? { ...this.wpMeta } : undefined
    };
    
    return cloned;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      key: this.key,
      description: this.description,
      location: this.location,
      position: this.position,
      style: this.style,
      labelPlacement: this.labelPlacement,
      hideOnScreen: this.hideOnScreen,
      isActive: this.isActive,
      menuOrder: this.menuOrder,
      instructionPlacement: this.instructionPlacement,
      fields: this.fields?.map(field => field.toJSON()),
      wpPostType: this.wpPostType,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}