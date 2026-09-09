/**
 * BranchOfficerService — 분회 임원 · 위원회 · TF 명부
 * WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1
 * 설계 근거: IR-O4O-KPA-BRANCH-ORGANIZATION-AND-MEETING-MINIMAL-MODEL-V1
 *
 * 서버에서만 결정하는 것:
 *   1) 어느 분회인가 — 호출자(resolveBranch)가 확정한 organizationId. body 를 읽지 않는다.
 *   2) 지금 현직인가 — `status='active'` **그리고** 임기가 지나지 않았을 것.
 *      상태만 믿지 않는 이유는 DB 가 날짜 비교를 강제할 수 없기 때문이다(`now()` 비-IMMUTABLE).
 *   3) 누구에게 보이는가 — 공개 경로는 `visibility='public'` 만.
 *
 * 하지 않는 것:
 *   - `role_assignments` 를 읽거나 쓰지 않는다. **직책은 RBAC 이 아니다.**
 *   - `organization_members` 를 재사용하지 않는다 (IR §2-1 — 축이 다르고 Frozen Core 다).
 *   - 연락처를 다루지 않는다. 컬럼 자체가 없다.
 *   - 임기 종료 시 행을 지우지 않는다. 재임은 **새 행**이다 (append-only — §임기 참조).
 */
import { AppDataSource } from '../../database/connection.js';
import {
  OFFICER_STATUSES,
  OFFICER_VISIBILITIES,
} from '../../routes/kpa-branch/entities/branch-officer.entity.js';
import type {
  BranchOfficerStatus,
  BranchOfficerVisibility,
} from '../../routes/kpa-branch/entities/branch-officer.entity.js';

export type OfficerFailureCode = 'OFFICER_NOT_FOUND' | 'OFFICER_VALUE_INVALID' | 'MEMBER_NOT_IN_BRANCH';

export class BranchOfficerError extends Error {
  constructor(
    readonly code: OfficerFailureCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const NAME_MAX = 100;
const POSITION_MAX = 100;
const GROUP_MAX = 100;

export interface OfficerItem {
  id: string;
  userId: string | null;
  name: string;
  position: string;
  groupName: string | null;
  termStart: string;
  termEnd: string | null;
  displayOrder: number;
  status: BranchOfficerStatus;
  visibility: BranchOfficerVisibility;
  /** 오늘 기준 현직인가 — 상태와 임기를 함께 본 서버 판정값 */
  current: boolean;
  /** 연결된 회원의 현재 계정 정보 (연결이 없으면 null). 명부의 `name` 을 대체하지 않는다 */
  linkedMember: { name: string | null; email: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}

export class BranchOfficerService {
  // ── 입력 검증 ─────────────────────────────────────────────────────────────

  private static text(v: unknown, max: number, label: string, required: boolean): string | null {
    if (v === undefined || v === null) {
      if (required) throw new BranchOfficerError('OFFICER_VALUE_INVALID', `${label}을(를) 입력해 주세요.`, 422);
      return null;
    }
    const s = String(v).trim();
    if (!s) {
      if (required) throw new BranchOfficerError('OFFICER_VALUE_INVALID', `${label}을(를) 입력해 주세요.`, 422);
      return null;
    }
    if (s.length > max) {
      throw new BranchOfficerError('OFFICER_VALUE_INVALID', `${label}은(는) ${max}자를 넘을 수 없습니다.`, 422);
    }
    return s;
  }

  /** `YYYY-MM-DD` 만 받는다. date 컬럼이므로 시각을 섞지 않는다 */
  private static day(v: unknown, label: string, required: boolean): string | null {
    if (v === undefined || v === null || v === '') {
      if (required) throw new BranchOfficerError('OFFICER_VALUE_INVALID', `${label}을(를) 입력해 주세요.`, 422);
      return null;
    }
    const s = String(v).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(new Date(s).getTime())) {
      throw new BranchOfficerError('OFFICER_VALUE_INVALID', `${label}은(는) YYYY-MM-DD 형식이어야 합니다.`, 422);
    }
    return s;
  }

  /**
   * `date` 컬럼 정규화 — **pg 는 date 를 JS `Date` 객체로 돌려준다.**
   *
   * 이것을 그대로 `String()` 하면 `"Wed Dec 31 2027 …"` 이 되어
   *   (a) 날짜 비교가 요일 이름 사전순 비교로 바뀌고
   *   (b) 응답에 `2028-01-01T00:00:00.000Z` 같은 시각이 섞인다.
   * 읽는 경계에서 한 번만 `YYYY-MM-DD` 로 되돌린다 (W6 numeric→Number 와 같은 처리).
   */
  private static toDay(v: unknown): string | null {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
    }
    const s = String(v);
    // 'YYYY-MM-DD' 이거나 ISO 문자열이면 앞 10자가 날짜다
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
  }

  private static today(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private static serialize(r: Record<string, any>): OfficerItem {
    const today = this.today();
    return {
      id: r.id,
      userId: r.user_id ?? null,
      name: r.name,
      position: r.position,
      groupName: r.group_name ?? null,
      termStart: this.toDay(r.term_start)!,
      termEnd: this.toDay(r.term_end),
      displayOrder: Number(r.display_order ?? 0),
      status: r.status,
      visibility: r.visibility,
      // 상태와 임기를 함께 본다 — 저장은 active 인데 종료일이 지난 행을 현직으로 내지 않는다
      current: r.status === 'active' && (!r.term_end || this.toDay(r.term_end)! >= today),
      linkedMember: r.user_id ? { name: r.linked_name ?? null, email: r.linked_email ?? null } : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * 목록·상세 공통 SELECT.
   * `users` 는 LEFT JOIN 이다 — 외부 인사(user_id=null)가 목록에서 빠지면 안 된다.
   */
  private static readonly SELECT = `
    SELECT o.*, u.name AS linked_name, u.email AS linked_email
      FROM branch_officers o
      LEFT JOIN users u ON u.id = o.user_id`;

  /** 명부 정렬 — 표시순서 → 임기 시작 → 성명. 같은 순서값이 흩어지지 않게 3단계로 고정한다 */
  private static readonly ORDER = `ORDER BY o.display_order ASC, o.term_start DESC, o.name ASC`;

  // ── 조회 ──────────────────────────────────────────────────────────────────

  /** 운영자 명부 — 종료된 임기까지 전부. `status` 로 좁힐 수 있다 */
  static async listForOperator(params: {
    organizationId: string;
    status?: BranchOfficerStatus;
  }): Promise<OfficerItem[]> {
    const args: unknown[] = [params.organizationId];
    let where = 'o.organization_id = $1';
    if (params.status) {
      args.push(params.status);
      where += ` AND o.status = $${args.length}`;
    }
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT} WHERE ${where} ${this.ORDER}`,
      args,
    );
    return rows.map((r) => this.serialize(r));
  }

  /**
   * 공개 명부 — `visibility='public'` **이고 현직**만.
   * 날짜 조건을 SQL 에 함께 건다: 상태만 믿으면 종료일이 지난 임원이 홈페이지에 남는다.
   */
  static async listPublic(params: { organizationId: string }): Promise<OfficerItem[]> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT}
        WHERE o.organization_id = $1
          AND o.visibility = 'public'
          AND o.status = 'active'
          AND (o.term_end IS NULL OR o.term_end >= CURRENT_DATE)
        ${this.ORDER}`,
      [params.organizationId],
    );
    return rows.map((r) => this.serialize(r));
  }

  /** 회원 명부 — public + members_only, 현직만 */
  static async listForMember(params: { organizationId: string }): Promise<OfficerItem[]> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT}
        WHERE o.organization_id = $1
          AND o.status = 'active'
          AND (o.term_end IS NULL OR o.term_end >= CURRENT_DATE)
        ${this.ORDER}`,
      [params.organizationId],
    );
    return rows.map((r) => this.serialize(r));
  }

  private static async loadOne(organizationId: string, officerId: string): Promise<OfficerItem> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT} WHERE o.id = $2 AND o.organization_id = $1 LIMIT 1`,
      [organizationId, officerId],
    );
    if (!rows[0]) {
      throw new BranchOfficerError('OFFICER_NOT_FOUND', '임원 정보를 찾을 수 없습니다.', 404);
    }
    return this.serialize(rows[0]);
  }

  // ── 쓰기 ──────────────────────────────────────────────────────────────────

  /**
   * `user_id` 를 붙일 때는 **그 회원이 이 분회 소속인지 확인한다.**
   * 확인하지 않으면 다른 분회 회원을 우리 분회 임원으로 등록할 수 있다.
   */
  private static async assertBranchMember(organizationId: string, userId: string): Promise<void> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT 1 FROM branch_memberships
        WHERE user_id = $1 AND organization_id = $2 AND status = 'active' LIMIT 1`,
      [userId, organizationId],
    );
    if (!rows[0]) {
      throw new BranchOfficerError(
        'MEMBER_NOT_IN_BRANCH',
        '이 분회의 재적 회원만 계정을 연결할 수 있습니다.',
        422,
      );
    }
  }

  private static normalize(p: Record<string, unknown>, base?: Record<string, any>) {
    const name = p.name === undefined && base ? base.name : this.text(p.name, NAME_MAX, '성명', true)!;
    const position =
      p.position === undefined && base ? base.position : this.text(p.position, POSITION_MAX, '직책', true)!;
    const groupName =
      p.groupName === undefined && base ? base.group_name : this.text(p.groupName, GROUP_MAX, '소속', false);
    // 기존 행에서 읽은 값은 Date 객체이므로 반드시 toDay 로 정규화한다 (§toDay)
    const termStart =
      p.termStart === undefined && base
        ? this.toDay(base.term_start)!
        : this.day(p.termStart, '임기 시작일', true)!;
    const termEnd =
      p.termEnd === undefined && base
        ? this.toDay(base.term_end)
        : this.day(p.termEnd, '임기 종료일', false);

    if (termEnd && termEnd < termStart) {
      throw new BranchOfficerError('OFFICER_VALUE_INVALID', '임기 종료일이 시작일보다 빠를 수 없습니다.', 422);
    }

    let displayOrder = p.displayOrder === undefined && base ? Number(base.display_order) : 0;
    if (p.displayOrder !== undefined) {
      const n = Number(p.displayOrder);
      if (!Number.isInteger(n) || n < 0 || n > 9999) {
        throw new BranchOfficerError('OFFICER_VALUE_INVALID', '표시순서는 0~9999 사이 정수여야 합니다.', 422);
      }
      displayOrder = n;
    }

    let visibility: BranchOfficerVisibility =
      p.visibility === undefined && base ? base.visibility : 'public';
    if (p.visibility !== undefined) {
      const v = String(p.visibility);
      if (!OFFICER_VISIBILITIES.includes(v as BranchOfficerVisibility)) {
        throw new BranchOfficerError('OFFICER_VALUE_INVALID', '공개 범위가 올바르지 않습니다.', 422);
      }
      visibility = v as BranchOfficerVisibility;
    }

    let status: BranchOfficerStatus = p.status === undefined && base ? base.status : 'active';
    if (p.status !== undefined) {
      const v = String(p.status);
      if (!OFFICER_STATUSES.includes(v as BranchOfficerStatus)) {
        throw new BranchOfficerError('OFFICER_VALUE_INVALID', '상태가 올바르지 않습니다.', 422);
      }
      status = v as BranchOfficerStatus;
    }

    // 임기 종료로 표시하려면 종료일이 있어야 한다 (DB CHECK 와 같은 규칙). 없으면 오늘로 마감한다.
    const resolvedTermEnd = status === 'ended' ? (termEnd ?? this.today()) : termEnd;

    return { name, position, groupName, termStart, termEnd: resolvedTermEnd, displayOrder, visibility, status };
  }

  static async create(params: {
    organizationId: string;
    input: Record<string, unknown>;
  }): Promise<OfficerItem> {
    const p = params.input ?? {};
    let userId: string | null = null;
    if (p.userId !== undefined && p.userId !== null && String(p.userId).trim() !== '') {
      userId = String(p.userId).trim();
      await this.assertBranchMember(params.organizationId, userId);
    }
    const v = this.normalize(p);

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `INSERT INTO branch_officers
         (organization_id, user_id, name, position, group_name,
          term_start, term_end, display_order, status, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        params.organizationId, userId, v.name, v.position, v.groupName,
        v.termStart, v.termEnd, v.displayOrder, v.status, v.visibility,
      ],
    );
    return this.loadOne(params.organizationId, rows[0].id);
  }

  /**
   * 수정 — 임기 종료·표시순서·공개범위도 이 경로로 한다.
   * 상태 전용 endpoint 를 따로 만들지 않는다 (상태도 임원 정보의 한 속성이다).
   *
   * **재임은 수정이 아니라 새 행이다.** 이 메서드로 종료된 임기를 되살리지 않는다 —
   * 그렇게 하면 "언제부터 언제까지 누가 회장이었나" 를 답할 수 없게 된다.
   */
  static async update(params: {
    organizationId: string;
    officerId: string;
    input: Record<string, unknown>;
  }): Promise<OfficerItem> {
    const cur: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT * FROM branch_officers WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [params.officerId, params.organizationId],
    );
    if (!cur[0]) throw new BranchOfficerError('OFFICER_NOT_FOUND', '임원 정보를 찾을 수 없습니다.', 404);

    const p = params.input ?? {};
    let userId: string | null = cur[0].user_id ?? null;
    if (p.userId !== undefined) {
      const raw = p.userId === null ? '' : String(p.userId).trim();
      if (raw) {
        await this.assertBranchMember(params.organizationId, raw);
        userId = raw;
      } else {
        userId = null;
      }
    }

    const v = this.normalize(p, cur[0]);
    await AppDataSource.query(
      `UPDATE branch_officers
          SET user_id = $1, name = $2, position = $3, group_name = $4,
              term_start = $5, term_end = $6, display_order = $7,
              status = $8, visibility = $9, updated_at = now()
        WHERE id = $10 AND organization_id = $11`,
      [
        userId, v.name, v.position, v.groupName, v.termStart, v.termEnd,
        v.displayOrder, v.status, v.visibility,
        params.officerId, params.organizationId,
      ],
    );
    return this.loadOne(params.organizationId, params.officerId);
  }

  /**
   * 표시순서 일괄 변경. 명부 정렬은 한 화면에서 여러 행을 함께 옮기므로
   * 행마다 PATCH 를 보내면 중간 상태가 화면에 남는다. 한 트랜잭션으로 끝낸다.
   */
  static async reorder(params: {
    organizationId: string;
    items: unknown;
  }): Promise<OfficerItem[]> {
    const raw = Array.isArray(params.items) ? params.items : null;
    if (!raw || raw.length === 0) {
      throw new BranchOfficerError('OFFICER_VALUE_INVALID', '정렬 목록이 올바르지 않습니다.', 422);
    }
    const seen = new Set<string>();
    const pairs = raw.map((it) => {
      const rec = (it ?? {}) as Record<string, unknown>;
      const id = String(rec.id ?? '').trim();
      const n = Number(rec.displayOrder);
      if (!id || seen.has(id)) {
        throw new BranchOfficerError('OFFICER_VALUE_INVALID', '정렬 목록에 잘못된 항목이 있습니다.', 422);
      }
      if (!Number.isInteger(n) || n < 0 || n > 9999) {
        throw new BranchOfficerError('OFFICER_VALUE_INVALID', '표시순서는 0~9999 사이 정수여야 합니다.', 422);
      }
      seen.add(id);
      return { id, displayOrder: n };
    });

    await AppDataSource.transaction(async (manager) => {
      for (const p of pairs) {
        // organization_id 를 함께 걸어 다른 분회 행이 섞여 들어와도 바뀌지 않게 한다
        await manager.query(
          `UPDATE branch_officers SET display_order = $1, updated_at = now()
            WHERE id = $2 AND organization_id = $3`,
          [p.displayOrder, p.id, params.organizationId],
        );
      }
    });

    return this.listForOperator({ organizationId: params.organizationId });
  }

  /**
   * W7 회원 콘솔 연동 — 여러 회원의 현재 직책을 **한 번에** 읽는다.
   *
   * 회원 목록이 회원 수만큼 이 함수를 부르면 N+1 이 된다. 그래서 userId 배열을 받아
   * 쿼리 1회로 끝내고, 호출부는 Map 으로 붙인다 (W7 §2 성능 계약).
   */
  static async currentPositionsByUsers(params: {
    organizationId: string;
    userIds: string[];
  }): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (!params.userIds.length) return out;

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT user_id, position, group_name
         FROM branch_officers
        WHERE organization_id = $1
          AND user_id = ANY($2::uuid[])
          AND status = 'active'
          AND (term_end IS NULL OR term_end >= CURRENT_DATE)
        ORDER BY display_order ASC`,
      [params.organizationId, params.userIds],
    );
    for (const r of rows) {
      const label = r.group_name ? `${r.group_name} ${r.position}` : r.position;
      const cur = out.get(r.user_id) ?? [];
      cur.push(label);
      out.set(r.user_id, cur);
    }
    return out;
  }
}
