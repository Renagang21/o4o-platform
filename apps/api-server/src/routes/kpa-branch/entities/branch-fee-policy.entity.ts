/**
 * BranchFeePolicy Entity — 분회의 연도별 회비 정책 (회비구분 → 부과액)
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * "얼마를 부과하는가"만 정한다. 배분(전국/지부/분회)·정산·결제는 이 테이블의 범위가 아니다
 * (WO 원칙: 회비는 단순 원장이다).
 *
 * 연도별로 행을 새로 만든다. 2026 정책을 고쳐서 2027 을 만들지 않는다 —
 * 과거 연도의 부과 근거가 사라지면 이미 부과된 원장을 설명할 수 없다.
 *
 * 경계 (CLAUDE.md §7):
 *   Store Ops 성격 → Primary Boundary = organizationId.
 *   UNIQUE(organization_id, year, fee_category) 가 분회별 정책 독립을 보장한다.
 *
 * fee_category 는 `kpa_members.fee_category` 와 **같은 코드계**다 (KpaFeeCategory).
 * 분회 전용 코드를 새로 만들지 않는다 (WO 원칙: 기존 fee_category 재사용).
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { KpaFeeCategory } from '../../kpa/entities/kpa-member.entity.js';

@Entity('branch_fee_policies')
@Index('IDX_branch_fee_policies_org_year', ['organization_id', 'year'])
export class BranchFeePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** kpa_organizations.id (분회) */
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'int' })
  year: number;

  /** `kpa_members.fee_category` 와 동일한 코드 (A1_pharmacy_owner …) */
  @Column({ type: 'varchar', length: 50 })
  fee_category: KpaFeeCategory;

  /** 연 부과액(원). 0 은 "정책상 0원 부과" 이며 면제와 다르다 — 면제는 원장의 status='exempt' 다 */
  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
