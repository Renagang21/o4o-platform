import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, Tree, TreeParent, TreeChildren } from 'typeorm';
import type { User } from './User.js';

export interface TaxonomySettings {
  hierarchical?: boolean;
  public?: boolean;
  showUI?: boolean;
  showInMenu?: boolean;
  showInNavMenus?: boolean;
  showTagcloud?: boolean;
  showInQuickEdit?: boolean;
  showAdminColumn?: boolean;
  description?: string;
  queryVar?: boolean;
  rewrite?: {
    slug?: string;
    withFront?: boolean;
    hierarchical?: boolean;
  };
  capabilities?: {
    manageTerm?: string;
    editTerm?: string;
    deleteTerm?: string;
    assignTerm?: string;
  };
  metaBoxCallback?: string;
  metaBoxSanitizeCallback?: string;
  updateCountCallback?: string;
}

@Entity('taxonomies')
export class Taxonomy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, length: 32 })
  name!: string; // taxonomy key (e.g., 'category', 'post_tag', 'product_cat')

  @Column({ type: 'varchar', length: 255 })
  label!: string; // Human readable name

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column('simple-array', { nullable: true })
  objectTypes!: string[]; // Post types this taxonomy is associated with

  @Column({ type: 'jsonb', nullable: true })
  labels!: {
    name?: string;
    singularName?: string;
    menuName?: string;
    allItems?: string;
    editItem?: string;
    viewItem?: string;
    updateItem?: string;
    addNewItem?: string;
    newItemName?: string;
    parentItem?: string;
    parentItemColon?: string;
    searchItems?: string;
    popularItems?: string;
    separateItemsWithCommas?: string;
    addOrRemoveItems?: string;
    chooseFromMostUsed?: string;
    notFound?: string;
    noTerms?: string;
    itemsListNavigation?: string;
    itemsList?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  settings!: TaxonomySettings;

  @Column({ type: 'boolean', default: true })
  hierarchical!: boolean; // Categories are hierarchical, tags are not

  @Column({ type: 'boolean', default: true })
  public!: boolean;

  @Column({ type: 'boolean', default: true })
  showUI!: boolean;

  @Column({ type: 'boolean', default: true })
  showInMenu!: boolean;

  @Column({ type: 'boolean', default: true })
  showInNavMenus!: boolean;

  @Column({ type: 'boolean', default: true })
  showTagcloud!: boolean;

  @Column({ type: 'boolean', default: true })
  showInQuickEdit!: boolean;

  @Column({ type: 'boolean', default: false })
  showAdminColumn!: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar' })
  createdBy!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'createdBy' })
  creator!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany('Term', 'taxonomy')
  terms!: Term[];
}

@Entity('terms')
@Tree('materialized-path')
export class Term {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'integer', default: 0 })
  count!: number; // Number of posts using this term

  @Column({ type: 'uuid' })
  taxonomyId!: string;

  @ManyToOne('Taxonomy', 'terms', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taxonomyId' })
  taxonomy!: Taxonomy;

  @TreeParent()
  parent!: Term;

  @TreeChildren()
  children!: Term[];

  @Column({ type: 'jsonb', nullable: true })
  meta!: Record<string, any>; // Term metadata

  @Column({ type: 'integer', default: 0 })
  termOrder!: number; // For custom ordering

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Computed properties
  get level(): number {
    return this.parent ? 1 : 0; // Can be computed from materialized path
  }

  get fullPath(): string {
    return this.parent ? `${this.parent.fullPath}/${this.slug}` : this.slug;
  }
}

@Entity('term_relationships')
export class TermRelationship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  objectId!: string; // ID of post, page, custom post, etc.

  @Column({ type: 'varchar', length: 50 })
  objectType!: string; // 'post', 'page', 'product', etc.

  @Column({ type: 'uuid' })
  termId!: string;

  @ManyToOne('Term', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'termId' })
  term!: Term;

  @Column({ type: 'integer', default: 0 })
  termOrder!: number; // Order of terms for this object

  @CreateDateColumn()
  createdAt!: Date;
}