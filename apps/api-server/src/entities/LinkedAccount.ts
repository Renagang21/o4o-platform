import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { User } from './User.js';
import type { AuthProvider } from '../types/account-linking.js';

/**
 * linked_accounts — Identity V3 L2 (Google Auth Identity) 물리 저장소.
 *
 * WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1: entity 를 운영 schema(2026-09-15 baseline) 와 일치시켰다.
 *   - userId uuid · provider varchar(50) (enum 아님 · legacy 값 호환) · email nullable · createdAt 존재
 *   - 잘못된 @Unique(userId, provider, providerId) / @Index(email) 제거 (운영에 없음)
 *   - DB 계약(migration 1789648511051): FK userId→users ON DELETE CASCADE ·
 *     UNIQUE (provider, providerId) WHERE providerId IS NOT NULL · UNIQUE (userId) WHERE provider='google'
 * Target(V3 §3): provider='google' · providerId=Google sub. email/displayName/profileImage/providerData/
 *   isPrimary/isVerified 스냅샷 컬럼은 새 Google row 에 기록하지 않는다 (물리 삭제는 Phase 5).
 */
@Entity('linked_accounts')
@Index('IDX_linked_accounts_user', ['userId'])
@Index('IDX_linked_accounts_provider', ['provider', 'providerId'])
export class LinkedAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User', 'linkedAccounts', { onDelete: 'CASCADE' })
  user!: User;

  /** 'google' 이 Target. 'email' | 'kakao' | 'naver' 는 legacy 값(운영 0행) — enum 으로 축소하지 않는다. */
  @Column({ type: 'varchar', length: 50 })
  provider!: AuthProvider;

  /** Google `sub`. Google row 는 runtime 에서 NOT NULL 을 보장한다 (DDL 은 legacy 호환으로 nullable). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  providerId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImage?: string;

  @Column({ type: 'boolean', default: false, nullable: true })
  isVerified?: boolean;

  @Column({ type: 'boolean', default: false, nullable: true })
  isPrimary?: boolean;

  @Column({ type: 'json', nullable: true })
  providerData?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  linkedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
