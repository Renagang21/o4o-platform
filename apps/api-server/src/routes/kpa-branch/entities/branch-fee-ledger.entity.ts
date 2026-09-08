/**
 * BranchFeeLedger Entity — 회원별 연도 회비 원장 (부과 · 납부)
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * 단순 원장이다. 만들지 않는 것 (WO 원칙):
 *   - 전국/지부/분회 회비 배분 구조
 *   - PG 결제 · 송금 · 정산
 *   - 분할납부 스케줄 · 독촉 · 이자
 * 납부 사실을 운영자가 기록할 뿐이며 돈이 이 시스템을 통과하지 않는다.
 *
 * 스냅샷 원칙:
 *   `fee_category` 는 **부과 시점의 회비구분**이다. 회원의 원장(`kpa_members.fee_category`)이
 *   나중에 바뀌어도 이미 부과된 연도의 근거는 바뀌지 않는다. 신상신고(annual_reports)가
 *   제출 당시 template_id 를 보존하는 것과 같은 사고다.
 *
 * 경계 (CLAUDE.md §7 Guard Rule 1):
 *   Primary Boundary = organizationId. user_id 단독 조회를 금지한다.
 *   UNIQUE(organization_id, user_id, year) 는 "한 분회에서 한 해에 한 행"이며 경계가 아니다.
 *   전출 회원의 과거 회비는 그 분회에 남는다 — 다른 분회로 따라가지 않는다.
 *
 * 상태 4종. status 는 금액에서 파생되며 DB CHECK 가 정합을 강제한다:
 *   unpaid   부과됨 · 납부 0
 *   partial  일부 납부 (0 < paid < assessed)
 *   paid     완납 (paid >= assessed)
 *   exempt   면제 — 운영자의 판정이며 금액에서 파생되지 않는 유일한 상태
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { KpaFeeCategory } from '../../kpa/entities/kpa-member.entity.js';

export type BranchFeeStatus = 'unpaid' | 'partial' | 'paid' | 'exempt';

/** 운영자가 직접 지정할 수 있는 상태. 나머지는 금액에서 파생된다 */
export const OPERATOR_SETTABLE_FEE_STATUSES: readonly BranchFeeStatus[] = ['exempt'];

@Entity('branch_fee_ledgers')
@Index('IDX_branch_fee_ledgers_org_year', ['organization_id', 'year'])
export class BranchFeeLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** kpa_organizations.id (부과 당시 분회). 전출해도 이 값은 바뀌지 않는다 */
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'int' })
  year: number;

  /** 부과 시점의 회비구분 스냅샷. 원장에 구분이 없던 회원은 null (수기 부과) */
  @Column({ type: 'varchar', length: 50, nullable: true })
  fee_category: KpaFeeCategory | null;

  /** 부과액(원) */
  @Column({ type: 'int', default: 0 })
  assessed_amount: number;

  /** 누적 납부액(원). 납부 이력 테이블을 두지 않는다 — 합계만 기록한다 */
  @Column({ type: 'int', default: 0 })
  paid_amount: number;

  /** 최종 납부일. paid_amount > 0 일 때만 값이 있다 (CHK_branch_fee_ledgers_paid_at) */
  @Column({ type: 'timestamptz', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'unpaid' })
  status: BranchFeeStatus;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  /** 마지막으로 이 행을 바꾼 운영자. 회원 본인이 아니다 */
  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
