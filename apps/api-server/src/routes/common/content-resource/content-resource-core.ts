/**
 * Community Content / Resource Backend Core
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1
 * 선행 감사: IR-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CANONICALIZATION-AUDIT-V1 (판정 B)
 *
 * 회원 콘텐츠·자료실 backend 의 공통 handler 로직. 서비스마다 물리 테이블
 * (현재 `kpa_contents`)이 다르므로 테이블은 config 로 주입한다.
 *
 * 본 Core 는 그 공통 로직만 갖고, 서비스 정책은 일절 알지 않는다.
 * 서비스는 {@link ContentResourceConfig} 를 주입한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 서비스 경계 안전 규칙 (WO §4)
 *
 *   현재 서비스 격리는 **물리 테이블 분리 그 자체**가 담당한다. 3원장 어디에도
 *   service_key / organization_id 컬럼이 없다. 따라서:
 *
 *   1. `tableName` 에 **기본값을 두지 않는다.** 서비스가 반드시 명시 주입한다.
 *   2. 주입값은 {@link assertSafeTableName} 로 검증한다 — 화이트리스트 형태의
 *      식별자 패턴만 통과시키고, 위반 시 **모듈 로드 시점에 throw** (fail-fast).
 *   3. `tableName` 은 절대 req.query / req.body / req.params 에서 오지 않는다.
 *      본 파일은 요청 객체에서 테이블명을 읽는 경로를 갖지 않는다.
 *   4. cross-service fallback 없음 — config 하나가 테이블 하나에 고정된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * API 계약 보존 (WO §9)
 *
 *   route / method / params / response DTO / status code / error code /
 *   pagination shape / authorization semantics 전부 기존과 동일하다.
 *   서비스별로 달랐던 부분(select 컬럼, 필터, 응답 후처리, audit)은 config 로 재현한다.
 */

import { Request, Response } from 'express';
import { DataSource, type EntityManager } from 'typeorm';

export type AuthMiddleware = (...args: any[]) => any;

export const VALID_USAGE_TYPES = ['READ', 'LINK', 'DOWNLOAD', 'COPY'] as const;
export const VALID_STATUSES = ['draft', 'published', 'private'] as const;
export const VALID_REUSABLE_POLICIES = ['restricted', 'platform'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 안전 장치
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 동적 SQL 식별자 안전 (WO §4-B).
 *
 * 테이블명은 서비스 config 에서만 오지만, 오타·리팩터링 실수로 위험한 문자열이 들어오면
 * 라우터가 만들어지는 시점에 즉시 실패해야 한다. 런타임 첫 요청까지 미루지 않는다.
 */
export function assertSafeTableName(tableName: unknown): string {
  if (typeof tableName !== 'string' || tableName.length === 0) {
    throw new Error(
      '[content-resource-core] tableName 은 필수다. 서비스 config 가 명시적으로 주입해야 한다 ' +
        '(기본값 금지 — 물리 테이블 분리가 서비스 경계이기 때문이다).',
    );
  }
  if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
    throw new Error(
      `[content-resource-core] 안전하지 않은 tableName: ${JSON.stringify(tableName)}. ` +
        'snake_case 식별자만 허용한다.',
    );
  }
  return tableName;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

/** 목록 응답 1행 후처리 (KPA ContentMeta enrichment 등). 미지정이면 원본 그대로. */
export type RowMapper = (row: any) => any;

/** 감사 로그 훅 (KPA `writeAuditLog`). 미지정이면 호출하지 않는다. */
export type AuditHook = (
  user: any,
  action: string,
  entityType: string,
  entityId: string,
  meta?: Record<string, unknown>,
) => void | Promise<void>;

/**
 * 목록 status 조건 결정.
 *
 * 기본 규칙(3서비스 공통):
 *   my=true + 로그인 → 본인 것만
 *   비로그인          → published 만
 *   status 미지정     → published OR 본인
 *
 * KPA 는 여기에 `status=all` 운영자 분기가 추가된다
 * (운영자/관리자면 status 조건 자체를 걸지 않는 전체 관리 목록).
 * Core 가 이 분기를 일반화하거나 삭제하지 않도록 **훅으로만** 노출한다.
 */
export interface ListStatusContext {
  userId?: string;
  statusFilter?: string;
  my?: string;
  user: any;
}

/**
 * 목록 가시성 절 (WHERE 의 소유/공개 조건).
 *
 *   'owner-only'       내 것만       (my=true + 로그인)
 *   'published-only'   공개만        (비로그인)
 *   'published-or-own' 공개 + 내 것
 *   'none'             조건 없음     (KPA 운영자 status=all 전체 관리 목록)
 */
export type ListVisibility = 'owner-only' | 'published-only' | 'published-or-own' | 'none';

/**
 * 가시성 절과 `status=<값>` 필터는 **독립**이다.
 *
 * 기존 구현이 그렇게 동작한다 — 예: `my=true&status=draft` 는 `created_by=me AND status='draft'`
 * 두 조건을 모두 건다. 하나로 합치면 계약이 바뀐다.
 *
 * `applyExplicitStatus=false` 는 KPA 의 `status=all` 처럼 status 값이 필터가 아니라
 * 모드 지시자인 경우에만 쓴다.
 */
export interface ListVisibilityDecision {
  visibility: ListVisibility;
  applyExplicitStatus: boolean;
}

export interface ContentResourceConfig {
  /** 물리 테이블명. **기본값 없음 — 반드시 주입** (WO §4-A) */
  tableName: string;
  /** console.error 접두어 (예: 'KPA') */
  logPrefix: string;
  /** operator/admin 판정에 쓰는 role 목록 (예: ['kpa:operator', ...]) */
  operatorRoles: string[];
  /** 목록 SELECT 컬럼 — 서비스별 응답 필드가 달라 그대로 보존한다 */
  listColumns: string;
  /** 운영자 목록 SELECT 컬럼 */
  operatorListColumns: string;
  /**
   * 회원 목록에서 지원하는 추가 필터. 서비스별 컬럼 유무가 달라 config 로 받는다.
   * 없던 필터를 추가하면 그동안 무시되던 query param 이 갑자기 필터로 동작한다 —
   * 계약 변경이므로 기존 handler 가 실제로 읽던 것만 적는다.
   */
  listFilters: Array<{ /** req.query 키 */ param: string; /** 컬럼명 */ column: string }>;
  /** 운영자 목록 추가 필터. 회원 목록과 다를 수 있어 별도로 받는다(KPA 가 그렇다). */
  operatorListFilters: Array<{ param: string; column: string }>;
  /**
   * 목록 가시성 결정 훅.
   * 미지정이면 {@link defaultListVisibility} (KCos 기존 동작)를 쓴다.
   * KPA 만 `status=all` 운영자 분기를 위해 주입한다.
   */
  resolveListVisibility?: (ctx: ListStatusContext) => ListVisibilityDecision;
  /** 목록 행 후처리 (KPA ContentMeta) */
  mapListRow?: RowMapper;
  /** 감사 로그 훅 (KPA) */
  audit?: AuditHook;
  /** Required audit in the same transaction as the mutation. Legacy hook is skipped when supplied. */
  atomicAudit?: (manager: EntityManager, user: any, action: string, entityType: string, entityId: string, meta?: Record<string, unknown>) => Promise<void>;
  /** 감사 로그 entityType (예: 'kpa_content') */
  auditEntityType?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 공통 유틸
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 기본 가시성 규칙.
 *
 *   my=true + 로그인 → 내 것만
 *   비로그인          → 공개만
 *   status 지정       → 그 status
 *   그 외             → 공개 + 내 것
 */
export function defaultListVisibility(ctx: ListStatusContext): ListVisibilityDecision {
  const applyExplicitStatus = Boolean(ctx.statusFilter);
  if (ctx.my === 'true' && ctx.userId) return { visibility: 'owner-only', applyExplicitStatus };
  if (!ctx.userId) return { visibility: 'published-only', applyExplicitStatus };
  // 로그인 + status 미지정 → 공개 + 내 것. status 지정 시엔 가시성 절 없이 그 status 만 본다.
  if (!ctx.statusFilter) return { visibility: 'published-or-own', applyExplicitStatus };
  return { visibility: 'none', applyExplicitStatus };
}

export function deriveUsageType(reqUsageType: string | undefined, sourceType: string): string {
  if (reqUsageType && (VALID_USAGE_TYPES as readonly string[]).includes(reqUsageType)) return reqUsageType;
  if (sourceType === 'external') return 'LINK';
  if (sourceType === 'upload') return 'DOWNLOAD';
  return 'READ';
}

export function sanitizeContentTags(t: unknown): string[] {
  if (!Array.isArray(t)) return [];
  return [
    ...new Set<string>(
      t
        .map((v: any) => String(v).trim().replace(/^#/, ''))
        .filter(Boolean)
        .filter((v: string) => v.length <= 30),
    ),
  ];
}

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

function internalError(res: Response, prefix: string, where: string, err: unknown, message: string): void {
  console.error(`[${prefix}] ${where} error:`, err);
  fail(res, 500, 'INTERNAL_ERROR', message);
}

/** 페이지네이션 파싱 — 3서비스 동일 (limit 상한 100) */
function parsePaging(query: any): { pageNum: number; limitNum: number; offset: number } {
  const pageNum = Math.max(1, Number(query.page ?? '1'));
  const limitNum = Math.min(100, Math.max(1, Number(query.limit ?? '20')));
  return { pageNum, limitNum, offset: (pageNum - 1) * limitNum };
}

// ─────────────────────────────────────────────────────────────────────────────
// 회원-facing handler (G1 list · G2 detail · G5 delete · G6 view)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentResourceCore {
  isOperatorOrAdmin(user: any): boolean;
  list(req: Request, res: Response): Promise<void>;
  detail(req: Request, res: Response): Promise<void>;
  remove(req: Request, res: Response): Promise<void>;
  incrementView(req: Request, res: Response): Promise<void>;
  operatorList(req: Request, res: Response): Promise<void>;
  operatorUpdateStatus(req: Request, res: Response): Promise<void>;
  operatorRemove(req: Request, res: Response): Promise<void>;
}

export function createContentResourceCore(
  dataSource: DataSource,
  config: ContentResourceConfig,
): ContentResourceCore {
  // fail-fast: 라우터 생성 시점에 검증한다 (WO §4-A/B)
  const table = assertSafeTableName(config.tableName);
  const prefix = config.logPrefix;
  const auditEntity = config.auditEntityType ?? 'content';

  const isOperatorOrAdmin = (user: any): boolean =>
    Array.isArray(user?.roles) && user.roles.some((r: string) => config.operatorRoles.includes(r));

  const runAudit = async (
    user: any,
    action: string,
    entityId: string,
    meta?: Record<string, unknown>,
  ): Promise<void> => {
    if (!config.audit) return;
    await config.audit(user, action, auditEntity, entityId, meta);
  };

  async function mutate<T>(fn: (exec: Pick<EntityManager, 'query'>) => Promise<{ value: T; user: any; action: string; id: string; meta: Record<string, unknown> }>): Promise<T> {
    if (config.atomicAudit) return dataSource.transaction(async manager => {
      const result = await fn(manager);
      await config.atomicAudit!(manager, result.user, result.action, auditEntity, result.id, result.meta);
      return result.value;
    });
    const result = await fn(dataSource);
    await runAudit(result.user, result.action, result.id, result.meta);
    return result.value;
  }

  async function list(req: Request, res: Response): Promise<void> {
    try {
      const { search, category, tag, my, sort = 'latest', status: statusFilter } = req.query as any;
      const { pageNum, limitNum, offset } = parsePaging(req.query);
      const user = (req as any).user;
      const userId = user?.id;

      const conditions: string[] = [`c.is_deleted = false`];
      const params: any[] = [];
      let idx = 1;

      const ctx: ListStatusContext = { userId, statusFilter, my, user };
      const decision = (config.resolveListVisibility ?? defaultListVisibility)(ctx);

      switch (decision.visibility) {
        case 'owner-only':
          conditions.push(`c.created_by = $${idx++}`);
          params.push(userId);
          break;
        case 'published-only':
          conditions.push(`c.status = 'published'`);
          break;
        case 'published-or-own':
          conditions.push(`(c.status = 'published' OR c.created_by = $${idx++})`);
          params.push(userId);
          break;
        case 'none':
          break;
      }

      // 가시성 절과 독립 — 기존 구현과 동일하게 둘 다 걸릴 수 있다.
      if (statusFilter && decision.applyExplicitStatus) {
        conditions.push(`c.status = $${idx++}`);
        params.push(statusFilter);
      }

      for (const f of config.listFilters) {
        const value = (req.query as any)[f.param];
        if (value) {
          conditions.push(`c.${f.column} = $${idx++}`);
          params.push(value);
        }
      }

      if (category) {
        conditions.push(`c.category = $${idx++}`);
        params.push(category);
      }
      if (tag) {
        conditions.push(`c.tags @> $${idx++}::jsonb`);
        params.push(JSON.stringify([tag]));
      }
      if (search) {
        conditions.push(
          `(c.title ILIKE $${idx} OR c.summary ILIKE $${idx} OR c.body ILIKE $${idx} OR c.author_name ILIKE $${idx} OR c.tags::text ILIKE $${idx})`,
        );
        params.push(`%${search}%`);
        idx++;
      }

      let orderBy = 'c.created_at DESC';
      if (sort === 'popular') orderBy = 'c.like_count DESC, c.created_at DESC';
      else if (sort === 'views') orderBy = 'c.view_count DESC, c.created_at DESC';

      const where = `WHERE ${conditions.join(' AND ')}`;
      const [[{ total }], rows] = await Promise.all([
        dataSource.query(`SELECT COUNT(*)::int AS total FROM ${table} c ${where}`, params),
        dataSource.query(
          `SELECT ${config.listColumns}
           FROM ${table} c ${where}
           ORDER BY ${orderBy}
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limitNum, offset],
        ),
      ]);

      res.json({
        success: true,
        data: {
          items: config.mapListRow ? rows.map(config.mapListRow) : rows,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      internalError(res, prefix, 'GET /contents', err, '목록 조회 중 오류가 발생했습니다');
    }
  }

  async function detail(req: Request, res: Response): Promise<void> {
    try {
      const [content] = await dataSource.query(
        `SELECT * FROM ${table} WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id],
      );
      if (!content) {
        fail(res, 404, 'NOT_FOUND', '콘텐츠를 찾을 수 없습니다');
        return;
      }
      res.json({ success: true, data: content });
    } catch (err) {
      internalError(res, prefix, 'GET /contents/:id', err, '상세 조회 중 오류가 발생했습니다');
    }
  }

  async function remove(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const [existing] = await dataSource.query(
        `SELECT id, title, created_by FROM ${table} WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id],
      );
      if (!existing) {
        fail(res, 404, 'NOT_FOUND', '콘텐츠를 찾을 수 없습니다');
        return;
      }
      if (existing.created_by !== user?.id && !isOperatorOrAdmin(user)) {
        fail(res, 403, 'FORBIDDEN', '삭제 권한이 없습니다');
        return;
      }
      await mutate(async exec => {
        await exec.query(`UPDATE ${table} SET is_deleted = true, updated_at = NOW() WHERE id = $1`, [existing.id]);
        return { value: true, user: user, action: 'CONTENT_DELETED', id: existing.id, meta: { title: existing.title } };
      });
      res.json({ success: true, data: { deleted: true, id: existing.id } });
    } catch (err) {
      internalError(res, prefix, 'DELETE /contents/:id', err, '삭제 중 오류가 발생했습니다');
    }
  }

  async function incrementView(req: Request, res: Response): Promise<void> {
    try {
      await dataSource.query(
        `UPDATE ${table} SET view_count = view_count + 1 WHERE id = $1 AND is_deleted = false`,
        [req.params.id],
      );
      res.json({ success: true });
    } catch (err) {
      internalError(res, prefix, 'POST /contents/:id/view', err, '조회수 갱신 중 오류가 발생했습니다');
    }
  }

  // ── 운영자 자료 관리 (G11 · G13 · G14) ────────────────────────────────────

  async function operatorList(req: Request, res: Response): Promise<void> {
    try {
      const { search } = req.query as any;
      const { pageNum, limitNum, offset } = parsePaging(req.query);

      const conditions: string[] = [`c.is_deleted = false`, `c.sub_type = 'resource'`];
      const params: any[] = [];
      let idx = 1;

      for (const f of config.operatorListFilters) {
        const value = (req.query as any)[f.param];
        if (value) {
          conditions.push(`c.${f.column} = $${idx++}`);
          params.push(value);
        }
      }
      const statusFilter = (req.query as any).status;
      if (statusFilter) {
        conditions.push(`c.status = $${idx++}`);
        params.push(statusFilter);
      }
      if (search) {
        conditions.push(`(c.title ILIKE $${idx} OR c.summary ILIKE $${idx} OR c.tags::text ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }

      const where = `WHERE ${conditions.join(' AND ')}`;
      const [[{ total }], rows] = await Promise.all([
        dataSource.query(`SELECT COUNT(*)::int AS total FROM ${table} c ${where}`, params),
        dataSource.query(
          `SELECT ${config.operatorListColumns}
           FROM ${table} c ${where}
           ORDER BY c.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limitNum, offset],
        ),
      ]);

      res.json({
        success: true,
        data: { items: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      internalError(res, prefix, 'GET /operator/resources', err, '목록 조회 중 오류가 발생했습니다');
    }
  }

  async function operatorUpdateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status: newStatus } = req.body;
      if (!newStatus || !(VALID_STATUSES as readonly string[]).includes(newStatus)) {
        fail(res, 400, 'VALIDATION_ERROR', `status는 ${VALID_STATUSES.join(', ')} 중 하나여야 합니다`);
        return;
      }

      const [existing] = await dataSource.query(
        `SELECT id, title, status FROM ${table} WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id],
      );
      if (!existing) {
        fail(res, 404, 'NOT_FOUND', '자료를 찾을 수 없습니다');
        return;
      }

      const updated = await mutate(async exec => {
        const current = config.atomicAudit ? (await exec.query(`SELECT id,title,status FROM ${table} WHERE id=$1 AND is_deleted=false FOR UPDATE`, [existing.id]))[0] : existing;
        if (!current) throw new Error('Resource changed');
        const result = await exec.query(`UPDATE ${table} SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *`, [newStatus, existing.id]);
        const rows = Array.isArray(result[0]) ? result[0] : result;
        return { value: rows[0], user: (req as any).user, action: 'RESOURCE_STATUS_CHANGED', id: existing.id, meta: { title: current.title, from: current.status, to: newStatus } };
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      internalError(res, prefix, 'PATCH /operator/resources/:id/status', err, '상태 변경 중 오류가 발생했습니다');
    }
  }

  async function operatorRemove(req: Request, res: Response): Promise<void> {
    try {
      const [existing] = await dataSource.query(
        `SELECT id, title FROM ${table} WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id],
      );
      if (!existing) {
        fail(res, 404, 'NOT_FOUND', '자료를 찾을 수 없습니다');
        return;
      }
      await mutate(async exec => {
        await exec.query(`UPDATE ${table} SET is_deleted = true, updated_at = NOW() WHERE id = $1`, [existing.id]);
        return { value: true, user: (req as any).user, action: 'RESOURCE_DELETED', id: existing.id, meta: { title: existing.title } };
      });
      res.json({ success: true, data: { deleted: true, id: existing.id } });
    } catch (err) {
      internalError(res, prefix, 'DELETE /operator/resources/:id', err, '삭제 중 오류가 발생했습니다');
    }
  }

  return { isOperatorOrAdmin, list, detail, remove, incrementView, operatorList, operatorUpdateStatus, operatorRemove };
}
