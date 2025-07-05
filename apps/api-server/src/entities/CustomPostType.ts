import { 
  Entity, 
  PrimaryColumn, 
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
    equals: any;
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
  @PrimaryColumn({ type: 'varchar', length: 50 })
  slug!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  singularName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, default: '📄' })
  icon!: string;

  // Field groups stored as JSON
  @Column({ type: 'json' })
  fieldGroups!: FieldGroup[];

  // CPT settings
  @Column({ type: 'json', default: {} })
  settings!: {
    public: boolean;
    hasArchive: boolean;
    supports: string[]; // ['title', 'content', 'thumbnail']
    menuIcon?: string;
    menuPosition?: number;
    capabilities?: string[];
  };

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @OneToMany(() => CustomPost, post => post.postType)
  posts!: CustomPost[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
