/**
 * BranchEducationCreditLedger Entity — 회원별 연도 연수교육 평점 원장
 * WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1
 *
 * **LMS 가 아니다.** 강좌·수강신청·출결·증빙은 이 테이블의 범위가 아니며
 * 대한약사회 연수교육 시스템을 복제하지도 않는다. 분회가 확인해 기록하는
 * "회원 × 연도 × 인정평점" 한 줄이 전부다.
 *
 * 평점 발생내역(`branch_education_credit_entries`)을 만들지 않았다 (WO §1 판단):
 *   운영자 업무(§3)와 회원 화면(§4)이 요구하는 값은 의무평점·인정평점·상태뿐이고,
 *   건별 내역은 대한약사회 시스템이 갖는다. 분회가 그 사본을 관리하기 시작하면
 *   원본과 어긋나는 두 번째 원장이 생긴다. 회비 원장에 납부 이력 테이블을 두지
 *   않은 것과 같은 판단이다.
 *
 * 경계 (CLAUDE.md §7 Guard Rule 1):
 *   Primary Boundary = organizationId. user_id 단독 조회를 금지한다.
 *   UNIQUE(organization_id, user_id, year) 는 "한 분회에서 한 해에 한 행"이며 경계가 아니다.
 *   전출해도 과거 연도 기록은 그 분회에 남는다.
 *
 * 상태 3종 — **DB 가 계산한다** (generated column):
 *   incomplete  인정평점 < 의무평점
 *   complete    인정평점 >= 의무평점
 *   exempt      면제 또는 유예 (운영자 판정)
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type EducationCreditStatus = 'incomplete' | 'complete' | 'exempt';

/**
 * 면제와 유예는 다른 사실이다 (신상신고 양식의 '연수교육 면제·유예 확인서' 참조).
 * 상태를 4종으로 늘리는 대신 status='exempt' 아래에서 종류를 구분한다 —
 * WO §2 가 정한 상태 3종 최소를 지키면서 업무상 구분을 잃지 않는다.
 */
export type EducationExemptionType = 'exempt' | 'deferred';

export const EXEMPTION_TYPES: readonly EducationExemptionType[] = ['exempt', 'deferred'];

@Entity('branch_education_credit_ledgers')
@Index('IDX_branch_edu_credits_org_year', ['organization_id', 'year'])
export class BranchEducationCreditLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** kpa_organizations.id (기록 당시 분회) */
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'int' })
  year: number;

  /**
   * 의무평점 / 인정평점.
   *
   * `numeric(4,1)` 이다 — 0.5 평점 단위가 실재하므로 int 로 자르지 않는다.
   * **pg 드라이버가 numeric 을 문자열로 돌려주므로 읽는 쪽에서 Number() 로 바꾼다.**
   */
  @Column({ type: 'numeric', precision: 4, scale: 1, default: 0 })
  required_credits: string | number;

  @Column({ type: 'numeric', precision: 4, scale: 1, default: 0 })
  completed_credits: string | number;

  /** 면제·유예. null 이면 이수 의무가 있다 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  exemption_type: EducationExemptionType | null;

  /**
   * **DB generated column** — 애플리케이션이 쓰지 않는다.
   *
   * 회비 원장은 status 를 저장하고 CHECK 로 정합을 강제했지만, 여기서는 아예
   * 계산식만 둔다. 저장하지 않으면 어긋날 수 없다 (WO §2 "계산 가능하면 중복 저장하지 않는다").
   */
  @Column({ type: 'varchar', length: 20, insert: false, update: false })
  status: EducationCreditStatus;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  /** 마지막으로 이 행을 바꾼 운영자. 대상 회원이 아니다 */
  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
