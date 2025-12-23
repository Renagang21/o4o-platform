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
import { CustomPostType } from './CustomPostType.js';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'publish',
  PRIVATE = 'private',
  TRASH = 'trash'
}

@Entity('custom_posts')
@Index(['cptSlug', 'status'])
@Index(['slug'])
export class CustomPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 50, name: 'cpt_slug' })
  cptSlug!: string;

  @Column({ type: 'varchar', length: 50, name: 'posttypeslug', nullable: true })
  postTypeSlug?: string;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT
  })
  status!: PostStatus;

  // All custom field data stored as JSON
  @Column({ type: 'json', default: {} })
  fields!: Record<string, string | number | boolean | Date | null | string[] | Record<string, unknown>>;

  // Optional content for rich text
  @Column({ type: 'text', nullable: true })
  content?: string;

  // SEO and meta
  @Column({ type: 'json', nullable: true })
  meta?: {
    seoTitle?: string;
    seoDescription?: string;
    featured?: boolean;
    thumbnail?: string;
    tags?: string[];
    zones?: Record<string, { blocks?: unknown[] }>;
    themeCustomizations?: Record<string, unknown>;
    [key: string]: unknown;
  };

  @Column({ type: 'uuid', nullable: true, name: 'authorid' })
  authorId?: string;

  @Column({ type: 'int', default: 0, name: 'viewcount' })
  viewCount!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'publishedat' })
  publishedAt?: Date;

  @ManyToOne('CustomPostType', 'posts')
  @JoinColumn({ name: 'posttypeslug', referencedColumnName: 'slug' })
  postType!: CustomPostType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper method to get field value with type safety
  getField<T = string | number | boolean | Date | null | string[] | Record<string, unknown>>(fieldName: string): T | undefined {
    return this.fields[fieldName] as T;
  }

  // Helper method to set field value
  setField(fieldName: string, value: string | number | boolean | Date | null | string[] | Record<string, unknown>): void {
    this.fields = { ...this.fields, [fieldName]: value };
  }

  // Generate slug from title
  generateSlug(): string {
    return this.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
