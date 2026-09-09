/**
 * StoreQrPlacement Entity
 *
 * WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §3
 *
 * QR 이 **실제 매장에서 사용되는 위치/매체** 이력(SSOT).
 *
 *   Target    = 찍으면 무엇이 나오는가   → store_qr_codes.landing_type / content_source
 *   Placement = 어디에서 사용하는가      → 이 테이블
 *
 * 1 QR : N Placement (이력 포함). `store_qr_codes.primary_placement` 는 목록용 캐시일 뿐이다.
 * FK 없음 — QR 계열 기존 관행대로 `qr_code_id` 는 논리 참조이며 테넌트 경계는
 * `organization_id` 복합 조건으로 강제한다 (CLAUDE.md §7 Guard Rule 1·3).
 *
 * `placement` 는 **개방형 문자열**이다. DB CHECK/enum 을 두지 않는다 —
 * 실제 사용 분포를 관측한 뒤 정규화한다(DESIGN §7-2). TS 쪽에서도 union 으로 좁히지 않는다.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** 배치 상태. QR 의 is_active 와 **다른 축**이다 (DESIGN §14). */
export type StoreQrPlacementStatus = 'active' | 'ended';

@Entity({ name: 'store_qr_placements' })
@Index('IDX_store_qr_placements_org_qr', ['organizationId', 'qrCodeId'])
@Index('IDX_store_qr_placements_qr_interval', ['qrCodeId', 'startedAt', 'endedAt'])
export class StoreQrPlacement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'qr_code_id', type: 'uuid' })
  qrCodeId!: string;

  /** 사용처 코드. 개방형 — 신규 값이 와도 저장된다. */
  @Column({ type: 'varchar', length: 40 })
  placement!: string;

  /** 매장 자유 표기(예: "혈당관리 매대"). */
  @Column({ type: 'varchar', length: 200, nullable: true })
  label?: string | null;

  /** 코너/구역 참조(선택). 태블릿 배치면 tabletId 등. 벤더 종속 필드를 추가하지 않는다. */
  @Column({ name: 'corner_ref', type: 'varchar', length: 200, nullable: true })
  cornerRef?: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: StoreQrPlacementStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  /** NULL = 아직 그 자리에 있다. 종료 시각을 넣으면 과거 스캔 귀속 구간이 닫힌다. */
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
