import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  Index 
} from 'typeorm';
import { User } from './User';
import { AuthProvider } from '../types/account-linking';

@Entity('account_activities')
@Index(['userId', 'created_at'])
@Index(['action', 'provider'])
export class AccountActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', lazy: true })
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

  @Column()
  ipAddress!: string;

  @Column()
  userAgent!: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}