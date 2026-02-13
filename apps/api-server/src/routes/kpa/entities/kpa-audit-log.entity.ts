/**
 * KpaAuditLog Entity - 운영자 감사 로그
 * WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1
 *
 * Table: kpa_operator_audit_logs
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type KpaAuditTargetType = 'member' | 'application' | 'content';

export type KpaAuditActionType =
  | 'MEMBER_STATUS_CHANGED'
  | 'MEMBER_ROLE_CHANGED'
  | 'APPLICATION_REVIEWED'
  | 'CONTENT_CREATED'
  | 'CONTENT_UPDATED'
  | 'CONTENT_DELETED';

@Entity('kpa_operator_audit_logs')
@Index('IDX_kpa_audit_operator_id', ['operator_id'])
@Index('IDX_kpa_audit_target_type', ['target_type'])
@Index('IDX_kpa_audit_created_at', ['created_at'])
export class KpaAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  operator_id: string;

  @Column({ type: 'varchar', length: 50 })
  operator_role: string;

  @Column({ type: 'varchar', length: 50 })
  action_type: KpaAuditActionType;

  @Column({ type: 'varchar', length: 50 })
  target_type: KpaAuditTargetType;

  @Column({ type: 'uuid' })
  target_id: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
