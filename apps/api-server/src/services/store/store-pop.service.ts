/**
 * Store POP Service — 매장 POP 사본(store_pops, author_role='store') CRUD 공통 로직
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (공통 service 추출)
 * 원본: routes/o4o-store/controllers/pop.controller.ts
 *       (WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1 / WO-O4O-POP-SAVE-AS-CONTENT-V1)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 추출하는가 — store-qr.service.ts / store-library.service.ts 와 동일한 이유다.
 *   공통 controller 는 매장을 **slug 로** 찾고 소유를 `created_by_user_id` (KPA 는 role 축)로
 *   확인한다. Pharmacy-Hub 매장은 프로비저닝이 만든 조직이라 created_by 가 경영자와 일치한다는
 *   보장이 없고, PH 는 enrollment 기준 resolvePharmacyHubStoreOrganization() 으로 조직을 정한다.
 *   **조직 결정만 서비스 경계별로 하고(공통 가드·slug 해석 무변경), 검증·SQL 계약은 공유한다.**
 *
 * 계약
 *   - 인증·조직 결정을 하지 않는다. organizationId(=store_id) 는 호출자가 해석해서 넘긴다.
 *   - 대상은 **항상 author_role='store' 사본**이다. 운영자 원본(author_role='operator')은
 *     이 service 의 조회·수정·삭제 경로에 절대 걸리지 않는다 (import 의 source 로만 읽는다).
 *   - 경계는 (store_id, service_key) 복합이다 — 매장 간·서비스 간 사본 접근을 함께 막는다.
 *   - 검증 실패는 예외가 아니라 결과 객체로 돌려준다 (라우트가 상태코드를 그대로 매핑).
 *   - 응답 envelope 은 만들지 않는다 — 공통 라우트는 nested({error:{code,message}}),
 *     Pharmacy-Hub 는 flat({error,code}) 로 서로 다르기 때문이다.
 *
 * 원본·사본 독립성 (작업요청서 §자산 소유·복사 원칙)
 *   import 는 **값 복사**다. 새 id · 매장 store_id · status='draft' 로 INSERT 하며,
 *   원본을 참조하는 FK 를 만들지 않는다. 이후 원본 수정·삭제는 사본에 영향이 없고,
 *   사본 수정도 원본에 영향이 없다. 출처는 excerpt 접두어로만 표시한다(schema 무변경).
 */

import type { DataSource } from 'typeorm';
import { StorePop } from '../../routes/o4o-store/entities/store-pop.entity.js';
import type {
  StorePopStatus,
  StorePopAuthorRole,
} from '../../routes/o4o-store/entities/store-pop.entity.js';

const STORE_ROLE = 'store' as StorePopAuthorRole;
const OPERATOR_ROLE = 'operator' as StorePopAuthorRole;

export const POP_STATUSES = ['draft', 'published', 'archived'] as const;

/** 가져온 사본의 출처 표시 접두어 (schema 변경 없는 MVP — 별도 origin 컬럼 도입 시 이관) */
export const POP_ORIGIN_PREFIX = '[운영자 자료 가져옴] ';

export interface PopFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type PopResult<T> = { ok: true; data: T } | PopFailure;

const NOT_FOUND: PopFailure = {
  ok: false,
  status: 404,
  code: 'POST_NOT_FOUND',
  message: 'Store POP copy not found',
};

function invalid(message: string): PopFailure {
  return { ok: false, status: 400, code: 'VALIDATION_ERROR', message };
}

/**
 * 제목 → 매장 내 slug.
 * store_pops 의 unique 는 **(store_id, slug)** 이라 매장 안에서만 충돌을 피하면 된다.
 * 한글을 남기는 것은 기존 계약 그대로다(공통 controller 와 동일 알고리즘).
 */
async function buildStoreScopedSlug(
  dataSource: DataSource,
  storeId: string,
  base: string,
): Promise<string> {
  const repo = dataSource.getRepository(StorePop);
  const baseSlug =
    base
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || `pop-${Date.now().toString(36)}`;
  const existing = await repo.findOne({ where: { storeId, slug: baseSlug } });
  return existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
}

// ────────────────────────────────────────────────────────────────────────────
// 목록
// ────────────────────────────────────────────────────────────────────────────

export interface ListPopParams {
  page?: unknown;
  limit?: unknown;
  status?: unknown;
}

export interface ListPopResult {
  items: StorePop[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** GET — 매장 POP 사본 목록 (author_role='store' 한정). */
export async function listStorePops(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  params: ListPopParams,
): Promise<ListPopResult> {
  const repo = dataSource.getRepository(StorePop);

  const page = Math.max(1, parseInt(params.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit as string) || 20));
  const statusFilter = params.status as string | undefined;

  const where: Record<string, unknown> = { storeId, serviceKey, authorRole: STORE_ROLE };
  if (statusFilter && (POP_STATUSES as readonly string[]).includes(statusFilter)) {
    where.status = statusFilter as StorePopStatus;
  }

  const [items, total] = await repo.findAndCount({
    where: where as any,
    order: { updatedAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** GET — 단건 조회 (author_role='store' 사본만). */
export async function findStorePop(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  id: string,
): Promise<PopResult<StorePop>> {
  const repo = dataSource.getRepository(StorePop);
  const post = await repo.findOne({
    where: { id, storeId, serviceKey, authorRole: STORE_ROLE },
  });
  if (!post) return NOT_FOUND;
  return { ok: true, data: post };
}

// ────────────────────────────────────────────────────────────────────────────
// 생성 · 가져오기
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST — 매장 직접 POP 작성 (WO-O4O-POP-SAVE-AS-CONTENT-V1).
 * status='draft' 로 시작하며 author_role='store' + storeId NOT NULL 을 강제한다
 * (DB CHECK 제약과 동일 방향 — body 로 뒤집을 수 없다).
 */
export async function createStorePop(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  body: any,
): Promise<PopResult<StorePop>> {
  const repo = dataSource.getRepository(StorePop);
  const { title, content, excerpt } = (body ?? {}) as {
    title?: string;
    content?: string;
    excerpt?: string;
  };

  if (typeof title !== 'string' || title.trim().length === 0) {
    return invalid('title is required');
  }

  const created = repo.create({
    storeId,
    serviceKey,
    authorRole: STORE_ROLE,
    title: title.trim(),
    slug: await buildStoreScopedSlug(dataSource, storeId, title),
    excerpt: (excerpt ?? '').trim() || undefined,
    content: content ?? '',
    status: 'draft' as StorePopStatus,
  });
  const saved = await repo.save(created);
  return { ok: true, data: saved };
}

export interface ImportPopResult {
  pop: StorePop;
  importSource: {
    sourceId: string;
    sourceTitle: string;
    sourceServiceKey: string;
    sourceAuthorRole: string;
    importedAt: string;
  };
}

/**
 * POST — 운영자 HUB POP 가져오기 (Operator 원본 → 매장 **독립 사본**).
 *
 * 원본은 `author_role='operator' AND status='published' AND service_key=serviceKey` 만 통과한다.
 * 사본은 새 id · 매장 store_id · status='draft' 로 **값 복사**하며 원본 FK 를 만들지 않는다.
 */
export async function importStorePop(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  sourceIdRaw: unknown,
): Promise<PopResult<ImportPopResult>> {
  const repo = dataSource.getRepository(StorePop);

  const sourceId = typeof sourceIdRaw === 'string' ? sourceIdRaw.trim() : '';
  if (!sourceId) return invalid('sourceId is required');

  const source = await repo.findOne({
    where: {
      id: sourceId,
      serviceKey,
      authorRole: OPERATOR_ROLE,
      status: 'published' as StorePopStatus,
    },
  });
  if (!source) {
    return {
      ok: false,
      status: 404,
      code: 'SOURCE_NOT_FOUND',
      message: 'Operator-published HUB POP not found for this service',
    };
  }

  // 매장 내 (store_id, slug) unique 정합 — 원본 slug 를 그대로 쓰되 충돌 시 suffix.
  const existingBase = await repo.findOne({ where: { storeId, slug: source.slug } });
  const finalSlug = existingBase ? `${source.slug}-${Date.now().toString(36)}` : source.slug;

  const sourceExcerpt = (source.excerpt ?? '').trim();
  const copy = repo.create({
    storeId,
    serviceKey,
    authorRole: STORE_ROLE,
    title: source.title,
    slug: finalSlug,
    excerpt: sourceExcerpt ? `${POP_ORIGIN_PREFIX}${sourceExcerpt}` : POP_ORIGIN_PREFIX.trim(),
    content: source.content,
    status: 'draft' as StorePopStatus,
  });

  const saved = await repo.save(copy);
  return {
    ok: true,
    data: {
      pop: saved,
      importSource: {
        sourceId: source.id,
        sourceTitle: source.title,
        sourceServiceKey: source.serviceKey,
        sourceAuthorRole: source.authorRole,
        importedAt: new Date().toISOString(),
      },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 수정 · 상태 전이 · 삭제
// ────────────────────────────────────────────────────────────────────────────

/**
 * PUT — 사본 수정.
 * author_role / serviceKey / storeId 는 body 로 바꿀 수 없다 (강제 보호).
 * slug 변경 시 매장 내 unique 를 확인한다.
 */
export async function updateStorePop(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  id: string,
  body: any,
): Promise<PopResult<StorePop>> {
  const repo = dataSource.getRepository(StorePop);
  const post = await repo.findOne({
    where: { id, storeId, serviceKey, authorRole: STORE_ROLE },
  });
  if (!post) return NOT_FOUND;

  const { title, content, excerpt, slug: postSlug } = body ?? {};

  if (typeof postSlug === 'string' && postSlug.trim().length > 0 && postSlug.trim() !== post.slug) {
    const newSlug = postSlug.trim();
    const existing = await repo.findOne({ where: { storeId, slug: newSlug } });
    if (existing) {
      return {
        ok: false,
        status: 409,
        code: 'SLUG_CONFLICT',
        message: 'A POP with this slug already exists in this store',
      };
    }
    post.slug = newSlug;
  }

  if (typeof title === 'string') post.title = title;
  if (typeof content === 'string') post.content = content;
  if (excerpt !== undefined) post.excerpt = typeof excerpt === 'string' ? excerpt : undefined;

  const saved = await repo.save(post);
  return { ok: true, data: saved };
}

/**
 * PATCH — 상태 전이 (draft ↔ published ↔ archived).
 *
 * publishedAt 은 **처음 발행할 때만** 찍는다 — 보관 후 재발행이 최초 발행일을 덮어쓰면
 * "언제부터 매장에 걸려 있었는가" 기록이 사라진다.
 * store_blog_posts 의 publish/archive 계약과 같은 방향이다.
 */
export async function setStorePopStatus(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  id: string,
  status: StorePopStatus,
): Promise<PopResult<StorePop>> {
  if (!(POP_STATUSES as readonly string[]).includes(status)) {
    return invalid(`status must be one of: ${POP_STATUSES.join(', ')}`);
  }

  const repo = dataSource.getRepository(StorePop);
  const post = await repo.findOne({
    where: { id, storeId, serviceKey, authorRole: STORE_ROLE },
  });
  if (!post) return NOT_FOUND;

  post.status = status;
  if (status === 'published' && !post.publishedAt) {
    post.publishedAt = new Date();
  }

  const saved = await repo.save(post);
  return { ok: true, data: saved };
}

/** DELETE — 사본 삭제 (store_pops 에는 soft delete 컬럼이 없다 — 기존 계약 그대로 물리 삭제). */
export async function deleteStorePop(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  id: string,
): Promise<PopResult<{ id: string; deleted: true }>> {
  const repo = dataSource.getRepository(StorePop);
  const post = await repo.findOne({
    where: { id, storeId, serviceKey, authorRole: STORE_ROLE },
  });
  if (!post) return NOT_FOUND;

  await repo.remove(post);
  return { ok: true, data: { id, deleted: true } };
}
