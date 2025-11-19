import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  Index 
} from 'typeorm';
import type { User } from './User.js';
import { AuthProvider } from '../types/account-linking.js';

@Entity('account_activities')
@Index(['userId', 'createdAt'])
@Index(['action', 'provider'])
export class AccountActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE', lazy: true })
  user!: Promise<User>;

  @Column({
    type: 'enum',
    enum: ['linked', 'unlinked', 'merged', 'login', 'failed_link']
  })
  action!: 'linked' | 'unlinked' | 'merged' | 'login' | 'failed_link';

  @Column({
    type: 'enum',
    enum: ['email', 'google', 'kakao', 'naver']
  })
  provider!: AuthProvider;

  @Column({ type: 'varchar' })
  ipAddress!: string;

  @Column({ type: 'varchar' })
  userAgent!: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}