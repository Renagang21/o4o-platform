import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export interface AppManifest {
  // Basic info
  displayName?: string;
  icon?: string;
  category?: string;

  // Capabilities
  provides?: {
    apis?: Array<{
      path: string;
      method: string;
      description?: string;
    }>;
    shortcodes?: Array<{
      name: string;
      description?: string;
      parameters?: Record<string, any>;
    }>;
    blocks?: Array<{
      name: string;
      title?: string;
    }>;
  };

  // Dependencies
  dependencies?: {
    apps?: string[];
    services?: string[];
    minVersion?: string;
  };

  // Permissions
  permissions?: {
    scopes: string[];
    requiredRole?: string;
  };

  // Settings schema
  settingsSchema?: Record<string, any>;

  // Resources
  resources?: {
    scriptUrl?: string;
    styleUrl?: string;
    assetsUrl?: string;
  };
}

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100, unique: true })
  @Index()
  slug!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50 })
  @Index()
  provider!: string; // 'google', 'openai', 'naver', etc.

  @Column({ length: 50 })
  category!: string; // 'text-generation', 'image-generation', 'translation', etc.

  @Column({
    type: 'enum',
    enum: ['integration', 'block', 'shortcode', 'widget', 'workflow'],
    default: 'integration'
  })
  type!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 50, nullable: true })
  icon?: string;

  @Column({ length: 20, default: '1.0.0' })
  version!: string;

  @Column({ type: 'jsonb', nullable: true })
  manifest?: AppManifest;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'deprecated'],
    default: 'active'
  })
  @Index()
  status!: 'active' | 'inactive' | 'deprecated';

  @Column({ default: false })
  isSystem!: boolean; // System apps cannot be deleted

  @Column({ length: 255, nullable: true })
  author?: string;

  @Column({ length: 255, nullable: true })
  repositoryUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
