import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DeploymentStatus {
  PENDING = 'pending',
  PROVISIONING = 'provisioning',
  INSTALLING = 'installing',
  BUILDING = 'building',
  CONFIGURING = 'configuring',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('deployment_instances')
export class DeploymentInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  domain: string;

  @Column('simple-array')
  apps: string[];

  @Column({
    type: 'enum',
    enum: DeploymentStatus,
    default: DeploymentStatus.PENDING,
  })
  status: DeploymentStatus;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  instanceId: string;

  @Column({ nullable: true })
  region: string;

  @Column({ nullable: true })
  instanceType: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  logs: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
