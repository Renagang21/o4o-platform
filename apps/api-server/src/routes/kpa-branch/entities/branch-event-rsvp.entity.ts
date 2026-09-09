/**
 * BranchEventRsvp Entity — 회원의 행사 참가 응답
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * 회원 1명이 행사 1개에 갖는 응답은 하나다 (UNIQUE). 응답을 바꾸면 새 행이 아니라
 * 기존 행을 갱신한다 — "참가 → 불참" 은 사실의 정정이지 이력이 아니다.
 * 응답 이력 테이블을 만들지 않았다 (W5 납부이력 · W6 평점내역과 같은 판단).
 *
 * `maybe` 를 만들지 않았다 (WO §2): 분회가 준비 인원을 세는 데 "미정"은
 * 참가로도 불참으로도 셀 수 없어 명단을 흐린다. 필요해지면 그때 더한다.
 *
 * **경계 주의 — 이 테이블에는 organization_id 가 없다.**
 * 분회는 `branch_events.organization_id` 가 갖는다. 따라서 이 테이블을 읽고 쓰는
 * 모든 쿼리는 반드시 `branch_events` 를 `(id, organization_id)` 로 조인해 좁힌다.
 * `WHERE event_id = $1` 단독 조회는 금지다 (CLAUDE.md §7 Guard Rule 1).
 * 컬럼을 비정규화해 중복 보관하지 않는 이유는 두 값이 어긋날 여지를 만들지 않기 위해서다.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type BranchEventRsvpStatus = 'attending' | 'not_attending';

export const RSVP_STATUSES: readonly BranchEventRsvpStatus[] = ['attending', 'not_attending'];

@Entity('branch_event_rsvps')
@Index('IDX_branch_event_rsvps_event', ['event_id'])
export class BranchEventRsvp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** branch_events.id */
  @Column({ type: 'uuid' })
  event_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  status: BranchEventRsvpStatus;

  /** 회원이 남기는 짧은 메모 (예: "1시간 늦게 참석"). 운영자 메모가 아니다 */
  @Column({ type: 'text', nullable: true })
  memo: string | null;

  /** 마지막으로 응답한 시각. 응답을 바꾸면 갱신된다 */
  @Column({ type: 'timestamptz' })
  responded_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
