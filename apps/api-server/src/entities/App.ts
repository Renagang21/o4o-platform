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
  appId?: string;
  name?: string;
  displayName?: string;
  version?: string;
  icon?: string;
  category?: string;

  // App type (for Core/Extension pattern)
  type?: 'core' | 'extension' | 'standalone';

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

  // Dependencies (supports both formats)
  // - Legacy format: { apps?: string[], services?: string[], minVersion?: string }
  // - New format: { "app-id": "version-range" }
  dependencies?: {
    apps?: string[];
    services?: string[];
    minVersion?: string;
    minVersions?: Record<string, string>;
  } | Record<string, string>;

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

  // Additional manifest properties for Core/Extension pattern
  [key: string]: any;
}

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  provider!: string; // 'google', 'openai', 'naver', etc.

  @Column({ type: 'varchar', length: 50 })
  category!: string; // 'text-generation', 'image-generation', 'translation', etc.

  @Column({
    type: 'enum',
    enum: ['integration', 'block', 'shortcode', 'widget', 'workflow'],
    default: 'integration'
  })
  type!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
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

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean; // System apps cannot be deleted

  @Column({ type: 'varchar', length: 255, nullable: true })
  author?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  repositoryUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
