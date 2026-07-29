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

/**
 * WO-O4O-KPA-OPERATOR-AUDIT-LOG-ENTITY-ACTION-TYPE-CONTRACT-ALIGNMENT-V1
 *
 * 아래 union 은 코드 emitter + 프로덕션 실측(census)으로 확정한 "알려진 값(known values)" 문서화 타입이다.
 * 실제 컬럼은 varchar(50) 이고 emitter 는 계속 확장될 수 있으므로, DB/entity 컬럼은 `string`(open)로 두어
 * 새 action/target 추가 시 타입 변경 없이 기록 가능하다(기능 확장성 차단 금지). 읽기 측(프론트)은 매핑에 없는
 * 값을 raw 로 fallback 표시한다. DB enum migration 없음.
 *
 * target_type — 프로덕션 실측: member(165) · content(49) · kpa_content(44) · application(3, legacy).
 */
export type KpaAuditTargetType =
  | 'member'
  | 'content'
  | 'kpa_content'
  | 'application'; // legacy (retired application review flow)

/**
 * action_type — 코드 emitter 전수 + 프로덕션 실측.
 * kpa.routes writeAuditLog / member.controller / pharmacy-{info,store-config,products}.controller 에서 emit.
 * CONTENT_BATCH_PUBLISHED · RESOURCE_STATUS_CHANGED 는 live emitter 이나 아직 실행 이력 0.
 */
export type KpaAuditActionType =
  // member
  | 'MEMBER_STATUS_CHANGED'
  | 'MEMBER_ROLE_CHANGED'
  | 'MEMBER_INFO_UPDATED'
  // content / course / resource
  | 'CONTENT_CREATED'
  | 'CONTENT_UPDATED'
  | 'CONTENT_DELETED'
  | 'CONTENT_HARD_DELETED'
  | 'CONTENT_BATCH_PUBLISHED'
  | 'CONTENT_BATCH_ARCHIVED'
  | 'CONTENT_BATCH_HARD_DELETED'
  | 'COURSE_HARD_DELETED'
  | 'RESOURCE_STATUS_CHANGED'
  | 'RESOURCE_DELETED'
  // store / pharmacy
  | 'STOREFRONT_CONFIG_UPDATED'
  | 'PHARMACY_INFO_UPDATED'
  // legacy (retired flow)
  | 'APPLICATION_REVIEWED';

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

  // 컬럼은 open string (varchar). 알려진 값은 KpaAuditActionType/KpaAuditTargetType 참조.
  @Column({ type: 'varchar', length: 50 })
  action_type: string;

  @Column({ type: 'varchar', length: 50 })
  target_type: string;

  @Column({ type: 'uuid' })
  target_id: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
