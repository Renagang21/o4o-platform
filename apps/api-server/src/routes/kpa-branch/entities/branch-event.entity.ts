/**
 * BranchEvent Entity — 분회 행사 (총회 · 세미나 · 교육 · 친목 등 generic)
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * **행사 종류별 시스템을 만들지 않는다.** 총회도 친목행사도 같은 한 테이블이며,
 * 종류를 구분하는 컬럼조차 두지 않았다 — 분류가 필요하다는 근거가 아직 없고,
 * 필요해지면 그때 varchar 하나를 더하면 된다. 지금 넣으면 화면마다 분기가 생긴다.
 *
 * 제목과 시작시각만 있으면 행사를 만들 수 있다 (WO 원칙).
 *
 * 재사용 조사 (WO §1, 프로덕션 실측 2026-09-09):
 *   - `lms_events`  = `courseId` 필수(강좌 결합) · RSVP 는 currentAttendees 카운터뿐 · 0행.
 *     강좌 없는 총회를 담을 수 없다.
 *   - `partner_events` = 파트너 커미션 조건이고 **테이블이 프로덕션에 없다**(엔티티만 존재).
 *   - `o4o_event_logs` · `*_qr_scan_events` = 텔레메트리·감사 로그.
 *   - RSVP(회원별 참가 응답) 개념은 저장소 전체에 없다.
 *   → 재사용 가능한 구조가 없어 신규 모델이 중복이 아니다.
 *
 * 경계 (CLAUDE.md §7 Guard Rule 1):
 *   Primary Boundary = organizationId. 모든 조회·수정에 함께 건다.
 *   행사 id 를 알아도 다른 분회 행사에는 닿을 수 없다.
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * draft   작성 중 — 회원에게 보이지 않는다
 * published 게시됨 — 회원이 보고 참가 응답할 수 있다
 * cancelled 취소됨 — 목록에는 남되 참가 응답을 받지 않는다 (삭제하지 않는다)
 */
export type BranchEventStatus = 'draft' | 'published' | 'cancelled';

/**
 * 공개 범위 2단계.
 *
 * 기본이 `members_only` 인 이유: 기존 공지(`branch_posts`)는 공개범위 개념이 없고
 * published 면 비로그인도 보는 구조인데, 행사는 총회 안건·참석 명단처럼 대외 공개가
 * 기본이면 곤란한 내용이 섞인다. 대외 안내가 필요하면 운영자가 명시적으로 `public` 을 고른다.
 */
export type BranchEventVisibility = 'public' | 'members_only';

export const EVENT_STATUSES: readonly BranchEventStatus[] = ['draft', 'published', 'cancelled'];
export const EVENT_VISIBILITIES: readonly BranchEventVisibility[] = ['public', 'members_only'];

@Entity('branch_events')
@Index('IDX_branch_events_org_starts', ['organization_id', 'starts_at'])
export class BranchEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** kpa_organizations.id (주최 분회) */
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * 행사 일시. **분회 캘린더가 나중에 재사용할 canonical 축**이다 (WO §7).
   * 이번 WO 에서 별도 calendar 시스템은 만들지 않는다.
   */
  @Column({ type: 'timestamptz' })
  starts_at: Date;

  /** 종료 시각. 없으면 시점 행사다. 있으면 starts_at 이후여야 한다 (CHECK) */
  @Column({ type: 'timestamptz', nullable: true })
  ends_at: Date | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string | null;

  /** 외부 안내·신청 링크 (예: 지부 공지, 지도). 이 시스템이 대신 처리하지 않는다 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  external_url: string | null;

  /** 참가 응답을 받는가. false 면 안내 전용 행사다 */
  @Column({ type: 'boolean', default: false })
  rsvp_enabled: boolean;

  /** 응답 마감. `rsvp_enabled=true` 일 때만 값을 가질 수 있다 (CHECK) */
  @Column({ type: 'timestamptz', nullable: true })
  rsvp_deadline: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'members_only' })
  visibility: BranchEventVisibility;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: BranchEventStatus;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
