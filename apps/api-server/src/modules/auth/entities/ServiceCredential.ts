/**
 * @core O4O_PLATFORM_CORE — Credential (Identity V2 L2 Layer)
 * Core Entity: ServiceCredential
 * Do not modify without CORE_CHANGE approval.
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 *   F10 §5-A.2 / F11 §10.4 — Identity V2 명시적 예외 승인 절차 대상
 *
 * ServiceCredential Entity (Identity V2 — Service-scoped Credential)
 * Adoption: DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1 (2026-05-23)
 * WO: WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-RESET-V1
 *
 * V2 의 L2 Credential Layer. (user_id, service_key) 범위에서 password_hash 를 보관한다.
 * users.password (V1 단일 컬럼) 와 동시 존재하며, Phase 1 단계에서는 dual-read fallback 으로 함께 운영된다.
 *
 * ESM Rule (CLAUDE.md §2): relation 사용 시 string-based reference 필수.
 * 본 entity 는 ESM 충돌 위험 최소화를 위해 ManyToOne relation 생략 — userId FK 컬럼만 유지.
 * users 테이블 ON DELETE CASCADE 는 migration 레벨에서 강제.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('service_credentials')
@Unique('uq_service_credentials_user_service', ['userId', 'serviceKey'])
@Index('idx_service_credentials_user', ['userId'])
export class ServiceCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 100, name: 'service_key' })
  serviceKey!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string; // bcrypt

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
