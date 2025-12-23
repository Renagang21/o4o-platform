import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';
import type { AuthProvider } from '../../../types/account-linking.js';
import { LinkingStatus } from '../../../types/account-linking.js';

@Entity('linking_sessions')
@Index(['userId', 'status'])
@Index(['verificationToken'], { unique: true })
export class LinkingSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user!: User;

  @Column({
    type: 'enum',
    enum: ['email', 'google', 'kakao', 'naver']
  })
  provider!: AuthProvider;

  @Column({
    type: 'enum',
    enum: LinkingStatus,
    default: LinkingStatus.PENDING
  })
  status!: LinkingStatus;

  @Column({ type: 'varchar', nullable: true })
  verificationToken?: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
