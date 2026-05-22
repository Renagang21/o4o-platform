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

  /**
   * WO-O4O-PASSWORD-RESET-SERVICE-ISOLATION-V1:
   * 토큰을 발급한 서비스 키. 재설정 실행 시 요청 serviceKey와 일치 여부를 검증한다.
   * null은 serviceKey 없이 발급된 기존 토큰(fallback 허용).
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'service_key' })
  serviceKey: string | null;

  @CreateDateColumn()
  createdAt: Date;
}