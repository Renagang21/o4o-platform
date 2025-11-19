import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import type { User } from './User.js';

@Entity('password_reset_tokens')
@Index(['token'], { unique: true })
@Index(['userId', 'createdAt'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}