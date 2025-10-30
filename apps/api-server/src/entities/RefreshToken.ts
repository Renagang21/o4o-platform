import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { User } from './User.js';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  deviceId?: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress?: string;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'varchar', nullable: true })
  revokedReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Check if token is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Check if token is valid (not expired and not revoked)
  isValid(): boolean {
    return !this.isExpired() && !this.revoked;
  }
}