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
import { App } from './App';

@Entity('app_instances')
export class AppInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  @Index()
  appId!: string;

  @ManyToOne(() => App, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appId' })
  app!: App;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  businessId?: string | null; // NULL = global/system-wide

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  })
  status!: 'active' | 'inactive' | 'suspended';

  @Column({ type: 'jsonb', nullable: true })
  config?: Record<string, any>; // App-specific configuration (e.g., API keys)

  @Column({ type: 'integer', default: 0 })
  usageCount!: number;

  @CreateDateColumn()
  installedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
