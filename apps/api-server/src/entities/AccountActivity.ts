import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';

@Entity('account_activities')
@Index(['userId', 'createdAt'])
export class AccountActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne('User', { onDelete: 'CASCADE', lazy: true })
  user!: Promise<User>;

  // DB column is 'action', Entity property is 'type'
  @Column({ name: 'action', type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  // DB column is 'details', not 'metadata'
  @Column({ type: 'json', nullable: true })
  details?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
