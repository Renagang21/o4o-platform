import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ViewType {
  PAGE = 'page',
  SECTION = 'section',
  COMPONENT = 'component',
  LAYOUT = 'layout'
}

export enum ViewStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

// ViewRenderer-compatible schema
export interface ViewSchema {
  version: string; // e.g., '2.0'
  type: ViewType;

  // Component tree
  components: Array<{
    id: string;
    type: string; // e.g., 'Hero', 'ProductGrid', 'Testimonials'
    props: Record<string, any>;
    children?: Array<any>; // Nested components
    slots?: Record<string, Array<any>>; // Named slots
  }>;

  // Data bindings
  bindings?: Array<{
    source: 'cpt' | 'api' | 'store' | 'static';
    target: string; // Component prop path
    query?: Record<string, any>;
  }>;

  // Styles
  styles?: {
    theme?: string; // Theme name
    customCSS?: string;
    variables?: Record<string, string>; // CSS variables
  };

  // SEO
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

@Entity('cms_views')
@Index(['slug'], { unique: true })
@Index(['type'])
@Index(['status'])
export class View {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string; // e.g., 'blog-list', 'product-detail'

  @Column({ type: 'varchar', length: 255 })
  name: string; // e.g., 'Blog List View'

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ViewType })
  type: ViewType;

  @Column({ type: 'enum', enum: ViewStatus, default: ViewStatus.DRAFT })
  status: ViewStatus;

  @Column({ type: 'jsonb' })
  schema: ViewSchema; // ViewRenderer-compatible JSON

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'posttypeslug' })
  postTypeSlug?: string; // Associated CPT (e.g., 'blog')

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[]; // Searchable tags

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;

  // Helper Methods
  isActive(): boolean {
    return this.status === ViewStatus.ACTIVE;
  }

  isCompatibleWithViewRenderer(): boolean {
    return this.schema.version === '2.0' && this.schema.components.length > 0;
  }

  getComponentById(componentId: string): any {
    const findInTree = (components: any[]): any => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findInTree(comp.children);
          if (found) return found;
        }
        if (comp.slots) {
          for (const slotKey in comp.slots) {
            const found = findInTree(comp.slots[slotKey]);
            if (found) return found;
          }
        }
      }
      return null;
    };

    return findInTree(this.schema.components);
  }
}
