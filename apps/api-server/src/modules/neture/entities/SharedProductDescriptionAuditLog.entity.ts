/**
 * SharedProductDescriptionAuditLog Entity — 공용 상품설명 canonical 변경 감사 로그
 *
 * WO-O4O-OPERATOR-SUPPLIER-STORE-DESCRIPTION-CANONICAL-REPLACE-AUDIT-LOG-V1
 *
 * 목적: 운영자가 기존 STORE canonical 을 숨기고 새 설명서로 **교체**한 이력을 남긴다.
 *   누가/언제/어떤 상품·언어·설명서 타입에서/기존 canonical 무엇을/새 canonical 무엇으로 교체했는가.
 *
 * 범위(V1):
 *   - event_type='canonical_replaced' 만 기록한다.
 *   - 일반 승인(기존 canonical 없음) / 수정 요청 / 만료 삭제 / hidden / draft / needs_review 는 기록 대상 아님.
 *   - 교체 트랜잭션(기존 canonical→hidden + 대상→canonical)과 같은 트랜잭션에서 insert 된다.
 *
 * FK 정책(감사 로그가 기존 데이터 삭제/정리 job 을 막지 않도록 약하게):
 *   - previous_description_id / new_description_id → shared_product_descriptions(id) ON DELETE SET NULL
 *   - performed_by → users(id) ON DELETE SET NULL
 *   - master_id → product_masters(id) ON DELETE CASCADE (SPD 자신의 master FK 와 동일 정책)
 *   FK 는 migration 에서 강제. 엔티티는 plain uuid 컬럼만 둔다(기존 SPD 컨벤션과 동일).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** 감사 이벤트 유형 (application-level union, varchar). V1 = canonical_replaced 만 사용. */
export type SharedProductDescriptionAuditEventType = 'canonical_replaced';

@Entity('shared_product_description_audit_logs')
@Index('idx_spd_audit_master_type_lang_at', ['masterId', 'descriptionType', 'language', 'performedAt'])
@Index('idx_spd_audit_previous', ['previousDescriptionId'])
@Index('idx_spd_audit_new', ['newDescriptionId'])
export class SharedProductDescriptionAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 이벤트 유형 — V1 은 'canonical_replaced'. */
  @Column({ name: 'event_type', type: 'varchar', length: 40 })
  eventType: SharedProductDescriptionAuditEventType;

  /** 설명서 유형 (STORE/B2B/B2C/SUPPLIER_STORE). 교체는 STORE 범위. */
  @Column({ name: 'description_type', type: 'varchar', length: 32 })
  descriptionType: string;

  /** 대상 ProductMaster. */
  @Column({ name: 'master_id', type: 'uuid' })
  masterId: string;

  /** 언어 코드 (COALESCE 'ko'). canonical 유일성 축의 일부. */
  @Column({ name: 'language', type: 'varchar', length: 16 })
  language: string;

  /** 교체로 hidden 강등된 기존 canonical 설명서 id. */
  @Column({ name: 'previous_description_id', type: 'uuid', nullable: true })
  previousDescriptionId: string | null;

  /** 새로 canonical 로 승격된 설명서 id. */
  @Column({ name: 'new_description_id', type: 'uuid', nullable: true })
  newDescriptionId: string | null;

  /** 이전 설명서의 교체 직전 상태 (canonical). */
  @Column({ name: 'previous_status', type: 'varchar', length: 32, nullable: true })
  previousStatus: string | null;

  /** 새 설명서의 교체 후 상태 (canonical). */
  @Column({ name: 'new_status', type: 'varchar', length: 32, nullable: true })
  newStatus: string | null;

  /** 교체를 수행한 운영자 user id. */
  @Column({ name: 'performed_by', type: 'uuid', nullable: true })
  performedBy: string | null;

  @Column({ name: 'performed_at', type: 'timestamp', default: () => 'NOW()' })
  performedAt: Date;

  /** 부가 컨텍스트 (replaceExisting/previousDemotedTo/source/supplier 등). */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
