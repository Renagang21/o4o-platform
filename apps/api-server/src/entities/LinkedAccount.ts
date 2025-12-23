import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn, 
  Index,
  Unique
} from 'typeorm';
import type { User } from './User.js';
import type { AuthProvider } from '../types/account-linking.js';

@Entity('linked_accounts')
@Unique(['userId', 'provider', 'providerId'])
@Index(['userId'])
@Index(['provider', 'providerId'])
@Index(['email'])
export class LinkedAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @ManyToOne('User', 'linkedAccounts', { onDelete: 'CASCADE' })
  user!: User;

  @Column({
    type: 'enum',
    enum: ['email', 'google', 'kakao', 'naver']
  })
  provider!: AuthProvider;

  @Column({ type: 'varchar', nullable: true })
  providerId?: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  displayName?: string;

  @Column({ type: 'varchar', nullable: true })
  profileImage?: string;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'json', nullable: true })
  providerData?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  linkedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}