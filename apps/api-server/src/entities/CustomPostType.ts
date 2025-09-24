import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  OneToMany 
} from 'typeorm';
import { CustomPost } from './CustomPost';

export interface FieldSchema {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'image' | 'url' | 'email' | 'relation';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[]; // for select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  showIf?: {
    field: string;
    equals: string | number | boolean;
  };
  relationType?: string; // for relation type
}

export interface FieldGroup {
  id: string;
  name: string;
  description?: string;
  fields: FieldSchema[];
  order: number;
}

@Entity('custom_post_types')
export class CustomPostType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, default: 'file' })
  icon!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  // WordPress-like settings
  @Column({ type: 'boolean', default: true, name: 'public' })
  public!: boolean;

  @Column({ type: 'boolean', default: true, name: 'has_archive' })
  hasArchive!: boolean;

  @Column({ type: 'boolean', default: true, name: 'show_in_menu' })
  showInMenu!: boolean;

  @Column({ type: 'json', default: '["title", "editor"]' })
  supports!: string[];

  @Column({ type: 'json', default: '[]' })
  taxonomies!: string[];

  @Column({ type: 'json', nullable: true })
  labels?: any;

  @Column({ type: 'int', nullable: true, name: 'menu_position' })
  menuPosition?: number;

  @Column({ type: 'varchar', length: 50, default: 'post', name: 'capability_type' })
  capabilityType!: string;

  @Column({ type: 'json', nullable: true })
  rewrite?: any;

  // Relations
  @OneToMany('CustomPost', 'postType')
  posts!: CustomPost[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
