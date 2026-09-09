/**
 * BranchEventService — 분회 행사 · 참가 응답
 * WO-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1
 *
 * 이 파일이 행사의 **쓰기 경계**다. 서버에서만 결정하는 것:
 *
 *   1) 어느 분회인가 — 호출자(resolveBranch + requireBranchScope)가 확정한 organizationId.
 *      body 의 organizationId / userId 는 읽지 않는다 (§7 Guard Rule 1·4).
 *   2) 누가 응답 주체인가 — 언제나 로그인한 본인이다. 대리 응답 경로가 없다.
 *   3) 지금 응답을 받을 수 있는가 — 게시 여부 · rsvp_enabled · 마감시각을 서버가 판정한다.
 *      화면의 버튼 비활성화는 안내일 뿐 근거가 아니다.
 *
 * **RSVP 테이블에는 organization_id 가 없다.** 분회는 `branch_events` 가 갖는다.
 * 그래서 이 파일의 모든 RSVP 쿼리는 `branch_events` 를 `(id, organization_id)` 로
 * 조인해 좁힌다 — `WHERE event_id = $1` 단독 조회가 한 곳도 없어야 한다.
 *
 * 하지 않는 것 (WO §10): 결제 · 좌석 · QR 출결 · LMS · 화상회의 · SMS ·
 * 신청서 폼 · 행사 종류별 분기 · 별도 calendar.
 */
import { AppDataSource } from '../../database/connection.js';
import {
  EVENT_STATUSES,
  EVENT_VISIBILITIES,
} from '../../routes/kpa-branch/entities/branch-event.entity.js';
import type {
  BranchEventStatus,
  BranchEventVisibility,
} from '../../routes/kpa-branch/entities/branch-event.entity.js';
import { RSVP_STATUSES } from '../../routes/kpa-branch/entities/branch-event-rsvp.entity.js';
import type { BranchEventRsvpStatus } from '../../routes/kpa-branch/entities/branch-event-rsvp.entity.js';

export type EventFailureCode =
  | 'EVENT_NOT_FOUND'
  | 'EVENT_VALUE_INVALID'
  | 'RSVP_NOT_OPEN'
  | 'RSVP_CLOSED';

export class BranchEventError extends Error {
  constructor(
    readonly code: EventFailureCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const TITLE_MAX = 300;
const LOCATION_MAX = 300;
const URL_MAX = 500;
const MEMO_MAX = 300;

export interface EventListItem {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  externalUrl: string | null;
  rsvpEnabled: boolean;
  rsvpDeadline: Date | null;
  visibility: BranchEventVisibility;
  status: BranchEventStatus;
  /** 지금 이 행사가 응답을 받는가 — 화면이 다시 계산하지 않도록 서버가 낸다 */
  rsvpOpen: boolean;
  counts: { attending: number; notAttending: number };
  /** 요청한 회원 본인의 응답. 운영자 목록에서는 null */
  myRsvp: { status: BranchEventRsvpStatus; memo: string | null; respondedAt: Date } | null;
  createdAt: Date;
}

export interface EventRsvpRow {
  userId: string;
  name: string | null;
  email: string | null;
  status: BranchEventRsvpStatus;
  memo: string | null;
  respondedAt: Date;
}

export class BranchEventService {
  // ── 입력 검증 ─────────────────────────────────────────────────────────────

  private static text(v: unknown, max: number, label: string, required = false): string | null {
    if (v === undefined || v === null) {
      if (required) throw new BranchEventError('EVENT_VALUE_INVALID', `${label}을(를) 입력해 주세요.`, 422);
      return null;
    }
    const s = String(v).trim();
    if (!s) {
      if (required) throw new BranchEventError('EVENT_VALUE_INVALID', `${label}을(를) 입력해 주세요.`, 422);
      return null;
    }
    if (s.length > max) {
      throw new BranchEventError('EVENT_VALUE_INVALID', `${label}은(는) ${max}자를 넘을 수 없습니다.`, 422);
    }
    return s;
  }

  private static date(v: unknown, label: string, required = false): Date | null {
    if (v === undefined || v === null || v === '') {
      if (required) throw new BranchEventError('EVENT_VALUE_INVALID', `${label}을(를) 입력해 주세요.`, 422);
      return null;
    }
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) {
      throw new BranchEventError('EVENT_VALUE_INVALID', `${label}이(가) 올바르지 않습니다.`, 422);
    }
    return d;
  }

  /**
   * 지금 응답을 받는가. **목록·상세·쓰기가 같은 판정을 쓰도록** 한 함수에 둔다 —
   * 화면이 따로 계산하면 "버튼은 열려 있는데 저장은 409" 가 생긴다.
   */
  static isRsvpOpen(
    r: { status?: unknown; rsvp_enabled?: unknown; rsvp_deadline?: unknown },
    now = new Date(),
  ): boolean {
    if (r.status !== 'published') return false;
    if (r.rsvp_enabled !== true) return false;
    if (r.rsvp_deadline && new Date(r.rsvp_deadline as string | Date).getTime() < now.getTime()) {
      return false;
    }
    return true;
  }

  private static serialize(r: Record<string, any>): EventListItem {
    return {
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      startsAt: r.starts_at,
      endsAt: r.ends_at ?? null,
      location: r.location ?? null,
      externalUrl: r.external_url ?? null,
      rsvpEnabled: r.rsvp_enabled === true,
      rsvpDeadline: r.rsvp_deadline ?? null,
      visibility: r.visibility,
      status: r.status,
      rsvpOpen: this.isRsvpOpen(r),
      counts: {
        attending: Number(r.attending_count ?? 0),
        notAttending: Number(r.not_attending_count ?? 0),
      },
      myRsvp: r.my_status
        ? { status: r.my_status, memo: r.my_memo ?? null, respondedAt: r.my_responded_at }
        : null,
      createdAt: r.created_at,
    };
  }

  /**
   * 목록·상세 공통 SELECT.
   * `$2` = 본인 응답을 붙일 userId (없으면 null 을 넘긴다 — 운영자 목록).
   * 집계는 서브쿼리 2개로 끝낸다 — 행사 수만큼 추가 쿼리를 만들지 않는다.
   */
  private static readonly SELECT = `
    SELECT e.*,
           (SELECT count(*) FROM branch_event_rsvps r
             WHERE r.event_id = e.id AND r.status = 'attending')     AS attending_count,
           (SELECT count(*) FROM branch_event_rsvps r
             WHERE r.event_id = e.id AND r.status = 'not_attending') AS not_attending_count,
           mine.status       AS my_status,
           mine.memo         AS my_memo,
           mine.responded_at AS my_responded_at
      FROM branch_events e
      LEFT JOIN branch_event_rsvps mine
             ON mine.event_id = e.id AND mine.user_id = $2::uuid`;

  // ── 조회 ──────────────────────────────────────────────────────────────────

  /**
   * 운영자 목록 — draft·cancelled 포함.
   * 언제나 `organization_id` 로 먼저 좁힌다 (§7 Guard Rule 1·3).
   */
  static async listForOperator(params: {
    organizationId: string;
    status?: BranchEventStatus;
  }): Promise<EventListItem[]> {
    const args: unknown[] = [params.organizationId, null];
    let where = 'e.organization_id = $1';
    if (params.status) {
      args.push(params.status);
      where += ` AND e.status = $${args.length}`;
    }
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT} WHERE ${where} ORDER BY e.starts_at DESC`,
      args,
    );
    return rows.map((r) => this.serialize(r));
  }

  /** 회원 목록 — 게시된 행사만. 취소된 행사도 보여준다(취소 사실을 알아야 한다) */
  static async listForMember(params: {
    organizationId: string;
    userId: string;
  }): Promise<EventListItem[]> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT}
        WHERE e.organization_id = $1 AND e.status IN ('published', 'cancelled')
        ORDER BY e.starts_at DESC`,
      [params.organizationId, params.userId],
    );
    return rows.map((r) => this.serialize(r));
  }

  /** 공개 목록 — 로그인 없이 보는 경로. `public` 이고 게시된 것만 */
  static async listPublic(params: { organizationId: string }): Promise<EventListItem[]> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT}
        WHERE e.organization_id = $1 AND e.status = 'published' AND e.visibility = 'public'
        ORDER BY e.starts_at DESC`,
      [params.organizationId, null],
    );
    return rows.map((r) => this.serialize(r));
  }

  /**
   * 단건. 조회 조건은 항상 `(id, organization_id)` 복합이다 — UUID 단독 조회 금지.
   * `audience` 가 회원이면 draft 는 보이지 않는다 (WO §9-2).
   */
  static async detail(params: {
    organizationId: string;
    eventId: string;
    userId?: string;
    audience: 'operator' | 'member' | 'public';
  }): Promise<EventListItem> {
    const visible =
      params.audience === 'operator'
        ? ''
        : params.audience === 'member'
          ? ` AND e.status IN ('published', 'cancelled')`
          : ` AND e.status = 'published' AND e.visibility = 'public'`;

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT} WHERE e.id = $3 AND e.organization_id = $1${visible} LIMIT 1`,
      [params.organizationId, params.userId ?? null, params.eventId],
    );
    const r = rows[0];
    if (!r) {
      // 다른 분회 행사·미게시 행사 모두 여기로 떨어진다 — 존재 여부를 알려주지 않는다
      throw new BranchEventError('EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.', 404);
    }
    return this.serialize(r);
  }

  // ── 운영자 쓰기 ───────────────────────────────────────────────────────────

  /** 입력값 정규화 — 생성·수정이 같은 규칙을 쓰게 한다 */
  private static normalize(p: Record<string, unknown>, base?: Record<string, any>) {
    const title =
      p.title === undefined && base ? base.title : this.text(p.title, TITLE_MAX, '행사명', true)!;
    const startsAt =
      p.startsAt === undefined && base ? new Date(base.starts_at) : this.date(p.startsAt, '시작 일시', true)!;
    const endsAt =
      p.endsAt === undefined && base ? (base.ends_at ? new Date(base.ends_at) : null) : this.date(p.endsAt, '종료 일시');

    if (endsAt && endsAt.getTime() < startsAt.getTime()) {
      throw new BranchEventError('EVENT_VALUE_INVALID', '종료 일시가 시작 일시보다 빠를 수 없습니다.', 422);
    }

    const description =
      p.description === undefined && base ? base.description : this.text(p.description, 20000, '안내');
    const location = p.location === undefined && base ? base.location : this.text(p.location, LOCATION_MAX, '장소');
    const externalUrl =
      p.externalUrl === undefined && base ? base.external_url : this.text(p.externalUrl, URL_MAX, '외부 링크');

    const rsvpEnabled =
      p.rsvpEnabled === undefined && base ? base.rsvp_enabled === true : p.rsvpEnabled === true;
    let rsvpDeadline =
      p.rsvpDeadline === undefined && base
        ? base.rsvp_deadline
          ? new Date(base.rsvp_deadline)
          : null
        : this.date(p.rsvpDeadline, '참가신청 마감');
    // 참가신청을 받지 않으면 마감일은 의미가 없다 (DB CHECK 와 같은 규칙)
    if (!rsvpEnabled) rsvpDeadline = null;

    let visibility: BranchEventVisibility =
      p.visibility === undefined && base ? base.visibility : 'members_only';
    if (p.visibility !== undefined) {
      const v = String(p.visibility);
      if (!EVENT_VISIBILITIES.includes(v as BranchEventVisibility)) {
        throw new BranchEventError('EVENT_VALUE_INVALID', '공개 범위가 올바르지 않습니다.', 422);
      }
      visibility = v as BranchEventVisibility;
    }

    let status: BranchEventStatus = p.status === undefined && base ? base.status : 'draft';
    if (p.status !== undefined) {
      const v = String(p.status);
      if (!EVENT_STATUSES.includes(v as BranchEventStatus)) {
        throw new BranchEventError('EVENT_VALUE_INVALID', '행사 상태가 올바르지 않습니다.', 422);
      }
      status = v as BranchEventStatus;
    }

    return { title, description, startsAt, endsAt, location, externalUrl, rsvpEnabled, rsvpDeadline, visibility, status };
  }

  static async create(params: {
    organizationId: string;
    actorUserId: string;
    input: Record<string, unknown>;
  }): Promise<EventListItem> {
    const v = this.normalize(params.input ?? {});
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `INSERT INTO branch_events
         (organization_id, title, description, starts_at, ends_at, location, external_url,
          rsvp_enabled, rsvp_deadline, visibility, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        params.organizationId, v.title, v.description, v.startsAt, v.endsAt, v.location, v.externalUrl,
        v.rsvpEnabled, v.rsvpDeadline, v.visibility, v.status, params.actorUserId,
      ],
    );
    return this.detail({
      organizationId: params.organizationId,
      eventId: rows[0].id,
      audience: 'operator',
    });
  }

  static async update(params: {
    organizationId: string;
    eventId: string;
    input: Record<string, unknown>;
  }): Promise<EventListItem> {
    const cur: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT * FROM branch_events WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [params.eventId, params.organizationId],
    );
    if (!cur[0]) throw new BranchEventError('EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.', 404);

    const v = this.normalize(params.input ?? {}, cur[0]);
    await AppDataSource.query(
      `UPDATE branch_events
          SET title = $1, description = $2, starts_at = $3, ends_at = $4, location = $5,
              external_url = $6, rsvp_enabled = $7, rsvp_deadline = $8, visibility = $9,
              status = $10, updated_at = now()
        WHERE id = $11 AND organization_id = $12`,
      [
        v.title, v.description, v.startsAt, v.endsAt, v.location, v.externalUrl,
        v.rsvpEnabled, v.rsvpDeadline, v.visibility, v.status,
        params.eventId, params.organizationId,
      ],
    );
    return this.detail({
      organizationId: params.organizationId,
      eventId: params.eventId,
      audience: 'operator',
    });
  }

  /**
   * 참가 명단 (운영자).
   * **`branch_events` 를 `(id, organization_id)` 로 조인해 좁힌다** — 다른 분회 행사의
   * 명단을 eventId 만으로 열 수 없다.
   */
  static async listRsvps(params: { organizationId: string; eventId: string }): Promise<EventRsvpRow[]> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT r.user_id, r.status, r.memo, r.responded_at,
              u.name AS user_name, u.email AS user_email
         FROM branch_event_rsvps r
         JOIN branch_events e ON e.id = r.event_id
         JOIN users u ON u.id = r.user_id
        WHERE e.id = $1 AND e.organization_id = $2
        ORDER BY r.status ASC, u.name ASC NULLS LAST`,
      [params.eventId, params.organizationId],
    );
    return rows.map((r) => ({
      userId: r.user_id,
      name: r.user_name ?? null,
      email: r.user_email ?? null,
      status: r.status,
      memo: r.memo ?? null,
      respondedAt: r.responded_at,
    }));
  }

  // ── 회원 응답 ─────────────────────────────────────────────────────────────

  /**
   * 참가 / 불참 응답. 기존 응답이 있으면 **갱신**한다 (UNIQUE(event_id,user_id)).
   *
   * 응답 가능 여부는 서버가 판정한다 — 게시 안 됨 · 취소됨 · 신청 미사용 · 마감 경과.
   * 대상 행사를 `(id, organization_id)` 로 먼저 좁히므로 다른 분회 행사에 응답할 수 없다.
   */
  static async respond(params: {
    organizationId: string;
    eventId: string;
    userId: string;
    status: unknown;
    memo?: unknown;
  }): Promise<EventListItem> {
    const status = String(params.status ?? '');
    if (!RSVP_STATUSES.includes(status as BranchEventRsvpStatus)) {
      throw new BranchEventError('EVENT_VALUE_INVALID', '참가 여부는 참가 또는 불참이어야 합니다.', 422);
    }
    const memo = this.text(params.memo, MEMO_MAX, '메모');

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT id, status, rsvp_enabled, rsvp_deadline
         FROM branch_events WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [params.eventId, params.organizationId],
    );
    const ev = rows[0];
    if (!ev || ev.status === 'draft') {
      // 미게시 행사는 회원에게 존재하지 않는 것과 같다
      throw new BranchEventError('EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.', 404);
    }
    if (ev.status === 'cancelled') {
      throw new BranchEventError('RSVP_NOT_OPEN', '취소된 행사입니다.', 409);
    }
    if (!ev.rsvp_enabled) {
      throw new BranchEventError('RSVP_NOT_OPEN', '참가신청을 받지 않는 행사입니다.', 409);
    }
    if (ev.rsvp_deadline && new Date(ev.rsvp_deadline).getTime() < Date.now()) {
      throw new BranchEventError('RSVP_CLOSED', '참가신청이 마감되었습니다.', 409);
    }

    await AppDataSource.query(
      `INSERT INTO branch_event_rsvps (event_id, user_id, status, memo, responded_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = EXCLUDED.status, memo = EXCLUDED.memo,
                     responded_at = now(), updated_at = now()`,
      [params.eventId, params.userId, status, memo],
    );

    return this.detail({
      organizationId: params.organizationId,
      eventId: params.eventId,
      userId: params.userId,
      audience: 'member',
    });
  }
}
