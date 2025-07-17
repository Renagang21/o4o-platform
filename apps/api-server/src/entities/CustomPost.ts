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
import { CustomPostType } from './CustomPostType';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PRIVATE = 'private',
  TRASH = 'trash'
}

@Entity('custom_posts')
@Index(['postTypeSlug', 'status'])
@Index(['slug'])
export class CustomPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 50 })
  postTypeSlug!: string;

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
  };

  @Column({ type: 'uuid', nullable: true })
  authorId?: string;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @ManyToOne(() => CustomPostType, cpt => cpt.posts)
  @JoinColumn({ name: 'postTypeSlug', referencedColumnName: 'slug' })
  postType!: CustomPostType;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
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
