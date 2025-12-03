import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SiteStatus {
  PENDING = 'pending',
  SCAFFOLDING = 'scaffolding',
  DEPLOYING = 'deploying',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('sites')
export class Site {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  domain: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  template: string; // 'default', 'ecommerce', 'forum', etc.

  @Column('simple-array')
  apps: string[]; // List of installed apps

  @Column({
    type: 'enum',
    enum: SiteStatus,
    default: SiteStatus.PENDING,
  })
  status: SiteStatus;

  @Column({ type: 'jsonb', nullable: true })
  config: {
    theme?: any;
    layout?: any;
    navigation?: any;
    pages?: any;
    variables?: Record<string, string>;
  };

  @Column({ type: 'text', nullable: true })
  deploymentId: string; // Link to DeploymentInstance

  @Column({ type: 'text', nullable: true })
  logs: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
