/**
 * BranchOfficer Entity — 분회 임원 · 위원회 · TF 명부
 * WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1
 * 설계 근거: IR-O4O-KPA-BRANCH-ORGANIZATION-AND-MEETING-MINIMAL-MODEL-V1
 *
 * **조직도 엔진이 아니다.** 임기와 표시순서만 구조화하고, 그 밖의 조직 서술
 * (인사말·연혁·조직 소개문)은 게시글이 맡는다.
 *
 * 직책은 RBAC 역할이 아니다 — `20270305000000-SeedKpaBranchServiceAndRoles` 가 이미
 * "조직 직책(회장·부회장·위원장 등)은 RBAC 역할로 만들지 않는다"고 정했다.
 * 이 테이블은 `role_assignments` 를 읽지도 쓰지도 않는다.
 *
 * `organization_members` 를 재사용하지 않는 이유 (IR §2-1 실측):
 *   - `metadata.position` 은 22행 중 **채워진 행 0**, `kpa_organizations` 참조 **0**.
 *   - `role` 은 admin/manager/member/moderator 로 **접근권한**이지 직책이 아니다.
 *   - `organization-core` 는 Frozen Core (CLAUDE.md §3) 로 구조 변경이 금지돼 있다.
 *
 * 경계 (CLAUDE.md §7 Guard Rule 1):
 *   Primary Boundary = organizationId. 모든 조회·수정에 함께 건다.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * active 현직 · ended 임기 종료.
 *
 * **DB 파생 컬럼으로 만들지 않았다** (W6 연수교육의 generated column 과 다른 점):
 * 현직 판정은 `term_end` 와 **오늘 날짜**의 비교인데 `now()` 는 IMMUTABLE 이 아니라
 * generated column·CHECK 어디에도 쓸 수 없다. 그래서 상태를 저장하고,
 * 조회에서 날짜 조건을 함께 걸어 "저장은 active 인데 임기는 지난" 행을 걸러낸다.
 */
export type BranchOfficerStatus = 'active' | 'ended';

/** public 전체 공개 · members_only 회원 전용 */
export type BranchOfficerVisibility = 'public' | 'members_only';

export const OFFICER_STATUSES: readonly BranchOfficerStatus[] = ['active', 'ended'];
export const OFFICER_VISIBILITIES: readonly BranchOfficerVisibility[] = ['public', 'members_only'];

@Entity('branch_officers')
@Index('IDX_branch_officers_org_order', ['organization_id', 'display_order'])
export class BranchOfficer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** kpa_organizations.id (소속 분회) */
  @Column({ type: 'uuid' })
  organization_id: string;

  /**
   * 회원 계정 연결 — **선택**이다.
   * 고문·자문 등 외부 인사는 회원 계정이 없으므로 null 이며 `name` 만 갖는다.
   * 연결된 임원은 W7 회원 콘솔에서 현재 직책을 읽기 전용으로 표시한다.
   */
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  /**
   * 성명. **user_id 연결 여부와 무관하게 항상 저장한다.**
   * 회원 이름이 나중에 바뀌어도 임기 당시의 명부는 그때 이름으로 남아야 한다.
   */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** 직책 (회장 · 부회장 · 이사 · 감사 · 위원장 …). 코드가 아니라 분회가 쓰는 말 그대로다 */
  @Column({ type: 'varchar', length: 100 })
  position: string;

  /** 소속 묶음 (윤리위원회 · 학술TF …). 임원 본진은 null */
  @Column({ type: 'varchar', length: 100, nullable: true })
  group_name: string | null;

  @Column({ type: 'date' })
  term_start: string;

  /** 임기 종료일. 재임 중이면 null (CHK — ended 는 반드시 값이 있다) */
  @Column({ type: 'date', nullable: true })
  term_end: string | null;

  /** 명부 표시순서. 작을수록 위 (회장 → 부회장 → 이사) */
  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: BranchOfficerStatus;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  visibility: BranchOfficerVisibility;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
