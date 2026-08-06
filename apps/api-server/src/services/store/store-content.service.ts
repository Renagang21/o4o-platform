/**
 * Store Content Service — "매장 콘텐츠"(kpa_store_contents) 목록 + direct 콘텐츠 CRUD 공통 로직
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1 (B안 — service 함수 추출)
 * 원본: routes/o4o-store/controllers/store-content.controller.ts
 *       (WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1 / WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1 외)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `kpa_store_contents` 는 **legacy physical table name** 이고 논리 개념은 service-neutral
 * Store Production Material 이다 (CLAUDE.md §5 / O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1).
 * 따라서 KPA 전용 테이블이 아니며, Pharmacy-Hub 도 같은 원장을 organization_id 로 격리해 쓴다.
 *
 * 왜 추출하는가
 *   공통 controller 는 조직을 isStoreOwner(dataSource, userId, 'kpa') + KpaMember fallback 으로
 *   구한다 — KPA 하드와이어라 Pharmacy-Hub 가 그대로 마운트할 수 없다.
 *   조직 결정만 서비스 경계별로 하고, 검증·SQL 계약은 공유한다.
 *
 * 계약
 *   - 인증·조직 결정·소유 확인을 하지 않는다. organizationId 는 호출자가 해석해서 넘긴다.
 *   - id 형식(UUID) 검증도 호출자 책임이다 (원본 라우트의 응답 순서를 보존하기 위해).
 *   - 소유 경계는 organization_id 단일 축이다 (Boundary Policy §7 Store Ops).
 *   - 검증 실패는 예외가 아니라 결과 객체로 돌려준다.
 *   - 응답 envelope 은 만들지 않는다.
 */

import type { DataSource } from 'typeorm';
import { KpaStoreContent } from '../../routes/kpa/entities/kpa-store-content.entity.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ContentFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type ContentResult<T> = { ok: true; data: T } | ContentFailure;

const NOT_FOUND: ContentFailure = {
  ok: false,
  status: 404,
  code: 'NOT_FOUND',
  message: 'Direct content not found',
};

// WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1:
//   태그 정규화 — 문자열 배열만 허용, trim, 빈 문자열 제거, 중복 제거, 길이/개수 제한.
const TAG_MAX_COUNT = 20;
const TAG_MAX_LEN = 30;

export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => v.slice(0, TAG_MAX_LEN)),
    ),
  ).slice(0, TAG_MAX_COUNT);
}

// ───────────────────────────────────────────────────────────────────────────
// WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-LINK-V1
//   콘텐츠 ↔ 매장 취급제품 연결(kpa_store_content_product_links) 처리.
//   - productRef 미전송 → 기존 link 유지 (tags 와 동일 정책)
//   - productRef: null  → 기존 product_description link 제거
//   - productRef: { sourceType, sourceId } → 검증 후 link 교체(1개 유지)
// ───────────────────────────────────────────────────────────────────────────
export const LINK_TYPE = 'product_description';

type ParsedProductRef =
  | { kind: 'absent' }
  | { kind: 'clear' }
  | { kind: 'set'; sourceType: 'listing' | 'local'; sourceId: string }
  | { kind: 'invalid'; message: string };

function parseProductRef(raw: unknown): ParsedProductRef {
  if (raw === undefined) return { kind: 'absent' };
  if (raw === null) return { kind: 'clear' };
  if (typeof raw !== 'object') return { kind: 'invalid', message: 'productRef는 객체여야 합니다.' };
  const ref = raw as { sourceType?: unknown; sourceId?: unknown };
  if (ref.sourceType !== 'listing' && ref.sourceType !== 'local') {
    return { kind: 'invalid', message: "productRef.sourceType은 'listing' 또는 'local' 이어야 합니다." };
  }
  if (typeof ref.sourceId !== 'string' || !UUID_RE.test(ref.sourceId)) {
    return { kind: 'invalid', message: 'productRef.sourceId는 유효한 UUID 여야 합니다.' };
  }
  return { kind: 'set', sourceType: ref.sourceType, sourceId: ref.sourceId };
}

/**
 * 제품이 해당 매장(organization)에 속하는지 검증하고 listing 의 master_id 를 반환.
 * 미존재/타 매장이면 ok=false.
 */
export async function resolveProductForLink(
  dataSource: DataSource,
  organizationId: string,
  sourceType: 'listing' | 'local',
  sourceId: string,
): Promise<{ ok: true; masterId: string | null } | { ok: false }> {
  if (sourceType === 'listing') {
    const rows = await dataSource.query(
      `SELECT master_id FROM organization_product_listings WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [sourceId, organizationId],
    );
    if (!rows.length) return { ok: false };
    return { ok: true, masterId: rows[0].master_id ?? null };
  }
  const rows = await dataSource.query(
    `SELECT id FROM store_local_products WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [sourceId, organizationId],
  );
  if (!rows.length) return { ok: false };
  return { ok: true, masterId: null };
}

async function clearProductLink(
  dataSource: DataSource,
  organizationId: string,
  contentId: string,
): Promise<void> {
  await dataSource.query(
    `DELETE FROM kpa_store_content_product_links
     WHERE organization_id = $1 AND content_id = $2 AND link_type = $3`,
    [organizationId, contentId, LINK_TYPE],
  );
}

export type ProductRefPlan =
  | { action: 'noop' }
  | { action: 'clear' }
  | { action: 'set'; sourceType: 'listing' | 'local'; sourceId: string; masterId: string | null };

/**
 * productRef 형식 검증 + 제품 org 스코프 검증을 콘텐츠 저장 *이전* 에 수행한다
 * (잘못된 productRef 로 콘텐츠가 먼저 저장되는 orphan 방지).
 */
export async function prepareProductRef(
  dataSource: DataSource,
  organizationId: string,
  raw: unknown,
): Promise<{ ok: true; plan: ProductRefPlan; error?: undefined } | { ok: false; error: string; plan?: undefined }> {
  const parsed = parseProductRef(raw);
  if (parsed.kind === 'absent') return { ok: true, plan: { action: 'noop' } };
  if (parsed.kind === 'invalid') return { ok: false, error: parsed.message };
  if (parsed.kind === 'clear') return { ok: true, plan: { action: 'clear' } };
  const resolved = await resolveProductForLink(dataSource, organizationId, parsed.sourceType, parsed.sourceId);
  if (!resolved.ok) return { ok: false, error: '연결할 제품을 현재 매장에서 찾을 수 없습니다.' };
  return {
    ok: true,
    plan: { action: 'set', sourceType: parsed.sourceType, sourceId: parsed.sourceId, masterId: resolved.masterId },
  };
}

export async function applyProductRefPlan(
  dataSource: DataSource,
  organizationId: string,
  contentId: string,
  plan: ProductRefPlan,
): Promise<void> {
  if (plan.action === 'noop') return;
  if (plan.action === 'clear') {
    await clearProductLink(dataSource, organizationId, contentId);
    return;
  }
  // V1: 콘텐츠당 product_description link 1개 유지 → 기존 제거 후 삽입.
  await clearProductLink(dataSource, organizationId, contentId);
  await dataSource.query(
    `INSERT INTO kpa_store_content_product_links
       (organization_id, content_id, product_source_type, product_source_id, master_id, link_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (organization_id, content_id, product_source_type, product_source_id, link_type) DO NOTHING`,
    [organizationId, contentId, plan.sourceType, plan.sourceId, plan.masterId, LINK_TYPE],
  );
}

// ───────────────────────────────────────────────────────────────────────────
// 목록 / direct CRUD
// ───────────────────────────────────────────────────────────────────────────

export interface StoreContentListItem {
  id: string;
  sourceType: string;
  snapshotId: string | null;
  title: string;
  updatedAt: Date;
}

/** GET — 내 매장 전체 콘텐츠 목록 (snapshot_edit + direct) */
export async function listStoreContents(
  dataSource: DataSource,
  organizationId: string,
): Promise<StoreContentListItem[]> {
  const repo = dataSource.getRepository(KpaStoreContent);
  const contents = await repo.find({
    where: { organization_id: organizationId },
    order: { updated_at: 'DESC' },
  });

  return contents.map((c) => ({
    id: c.id,
    sourceType: c.source_type,
    snapshotId: c.snapshot_id,
    title: c.title,
    updatedAt: c.updated_at,
  }));
}

export interface DirectContentView {
  id: string;
  sourceType: string;
  organizationId?: string;
  title: string;
  contentJson: unknown;
  tags: string[];
  updatedAt: Date;
  updatedBy: string | null;
}

function toDirectView(c: KpaStoreContent, includeOrg = false): DirectContentView {
  return {
    id: c.id,
    sourceType: c.source_type,
    ...(includeOrg ? { organizationId: c.organization_id } : {}),
    title: c.title,
    contentJson: c.content_json,
    tags: c.tags ?? [],
    updatedAt: c.updated_at,
    updatedBy: c.updated_by,
  };
}

/**
 * POST — direct 콘텐츠 신규 생성 (source_type='direct', snapshot_id=null).
 * AI 생성 결과, 직접 작성, 붙여넣기 등 모든 비-스냅샷 경로에서 사용.
 */
export async function createDirectContent(
  dataSource: DataSource,
  organizationId: string,
  userId: string,
  body: { title?: unknown; contentJson?: unknown; tags?: unknown; productRef?: unknown },
): Promise<ContentResult<DirectContentView>> {
  const { title, contentJson, tags, productRef } = body ?? {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'title은 필수입니다.' };
  }

  const prepared = await prepareProductRef(dataSource, organizationId, productRef);
  if (!prepared.ok) {
    return { ok: false, status: 400, code: 'INVALID_PRODUCT_REF', message: prepared.error };
  }

  const repo = dataSource.getRepository(KpaStoreContent);
  const content = repo.create({
    snapshot_id: null,
    source_type: 'direct',
    organization_id: organizationId,
    title: title.trim(),
    content_json: (contentJson ?? {}) as Record<string, unknown>,
    tags: normalizeTags(tags),
    updated_by: userId,
  });
  const saved = await repo.save(content);

  await applyProductRefPlan(dataSource, organizationId, saved.id, prepared.plan);

  return { ok: true, data: toDirectView(saved, true) };
}

/** GET — direct 콘텐츠 상세 */
export async function getDirectContent(
  dataSource: DataSource,
  organizationId: string,
  id: string,
): Promise<ContentResult<DirectContentView>> {
  const repo = dataSource.getRepository(KpaStoreContent);
  const content = await repo.findOne({
    where: { id, organization_id: organizationId, source_type: 'direct' },
  });
  if (!content) return NOT_FOUND;
  return { ok: true, data: toDirectView(content) };
}

/** PUT — direct 콘텐츠 수정 */
export async function updateDirectContent(
  dataSource: DataSource,
  organizationId: string,
  userId: string,
  id: string,
  body: { title?: unknown; contentJson?: unknown; tags?: unknown; productRef?: unknown },
): Promise<ContentResult<DirectContentView>> {
  const { title, contentJson, tags, productRef } = body ?? {};

  const repo = dataSource.getRepository(KpaStoreContent);
  const content = await repo.findOne({
    where: { id, organization_id: organizationId, source_type: 'direct' },
  });
  if (!content) return NOT_FOUND;

  const prepared = await prepareProductRef(dataSource, organizationId, productRef);
  if (!prepared.ok) {
    return { ok: false, status: 400, code: 'INVALID_PRODUCT_REF', message: prepared.error };
  }

  if (title !== undefined) content.title = String(title).trim() || content.title;
  if (contentJson !== undefined) content.content_json = contentJson as Record<string, unknown>;
  // tags 미전송 시 기존 값 보존, 전송 시 sanitize 후 교체.
  if (tags !== undefined) content.tags = normalizeTags(tags);
  content.updated_by = userId;

  const saved = await repo.save(content);

  // productRef 미전송 → 기존 link 유지 / null → 제거 / 객체 → 교체.
  await applyProductRefPlan(dataSource, organizationId, saved.id, prepared.plan);

  return { ok: true, data: toDirectView(saved) };
}

/** DELETE — direct 콘텐츠 삭제 (물리 삭제, 원본 동작 유지) */
export async function deleteDirectContent(
  dataSource: DataSource,
  organizationId: string,
  id: string,
): Promise<ContentResult<{ deleted: true; id: string }>> {
  const repo = dataSource.getRepository(KpaStoreContent);
  const content = await repo.findOne({
    where: { id, organization_id: organizationId, source_type: 'direct' },
  });
  if (!content) return NOT_FOUND;

  await repo.remove(content);
  return { ok: true, data: { deleted: true, id } };
}
