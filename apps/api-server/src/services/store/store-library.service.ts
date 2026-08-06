/**
 * Store Library Service — "자료함"(store_execution_assets) CRUD 공통 로직
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1 (B안 — service 함수 추출)
 * 원본: routes/o4o-store/controllers/store-library.controller.ts
 *       (WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1 외)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 추출하는가 — store-local-products.service.ts 와 동일한 이유다.
 *   공통 controller 는 createRequireStoreOwner(=resolveStoreAccess) 로 조직을 주입받는다.
 *   Pharmacy-Hub 는 enrollment 기준 resolvePharmacyHubStoreOrganization() 으로 조직을 정한다.
 *   조직 결정만 서비스 경계별로 하고(공통 가드 무변경), 검증·SQL 계약은 공유한다.
 *
 * 계약
 *   - 인증·조직 결정을 하지 않는다. organizationId 는 호출자가 해석해서 넘긴다.
 *   - 소유 경계는 organization_id 단일 축이다 (Boundary Policy §7 Store Ops).
 *   - 삭제는 **비활성화(soft delete)** 다. 물리 삭제 경로를 새로 만들지 않는다.
 *   - 검증 실패는 예외가 아니라 결과 객체로 돌려준다 (라우트가 상태코드를 그대로 매핑).
 *   - 응답 envelope 은 만들지 않는다 — 공통 라우트는 nested({error:{code,message}}),
 *     Pharmacy-Hub 는 flat({error,code}) 로 서로 다르기 때문이다.
 */

import type { DataSource } from 'typeorm';
import { StoreExecutionAsset } from '../../routes/platform/entities/store-execution-asset.entity.js';

export const VALID_ASSET_TYPES = ['file', 'content', 'external-link'] as const;
export type LibraryAssetType = (typeof VALID_ASSET_TYPES)[number];

/** 검증·부존재 실패. 라우트가 상태코드로 그대로 매핑한다. */
export interface LibraryFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
  /** QR 참조 건수 등 부가 정보 (원본 응답 필드 보존용) */
  details?: Record<string, unknown>;
}

export type LibraryResult<T> = { ok: true; data: T } | LibraryFailure;

const NOT_FOUND: LibraryFailure = {
  ok: false,
  status: 404,
  code: 'LIBRARY_ITEM_NOT_FOUND',
  message: 'Library item not found',
};

function invalid(message: string): LibraryFailure {
  return { ok: false, status: 400, code: 'VALIDATION_ERROR', message };
}

export interface ListLibraryParams {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
  category?: unknown;
}

export interface ListLibraryResult {
  items: StoreExecutionAsset[];
  page: number;
  limit: number;
  total: number;
}

/** GET — 자료 목록 (활성 항목만, 페이지네이션 + 검색) */
export async function listLibraryAssets(
  dataSource: DataSource,
  organizationId: string,
  params: ListLibraryParams,
): Promise<ListLibraryResult> {
  const repo = dataSource.getRepository(StoreExecutionAsset);

  const page = Math.max(1, parseInt(params.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit as string) || 20));
  const search = ((params.search as string) || '').trim();
  const category = ((params.category as string) || '').trim();

  const qb = repo
    .createQueryBuilder('item')
    .where('item.organizationId = :organizationId', { organizationId })
    .andWhere('item.isActive = :isActive', { isActive: true });

  if (category && category !== 'all') {
    qb.andWhere('item.category = :category', { category });
  }

  if (search) {
    qb.andWhere(
      '(item.title ILIKE :search OR item.description ILIKE :search OR item.category ILIKE :search)',
      { search: `%${search}%` },
    );
  }

  qb.orderBy('item.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  const [items, total] = await qb.getManyAndCount();
  return { items, page, limit, total };
}

/**
 * POST — 자료 생성.
 *
 * asset_type 별 검증
 *   file          → fileUrl 계열만 저장
 *   content       → htmlContent 필수
 *   external-link → url 필수
 */
export async function createLibraryAsset(
  dataSource: DataSource,
  organizationId: string,
  body: any,
): Promise<LibraryResult<StoreExecutionAsset>> {
  const repo = dataSource.getRepository(StoreExecutionAsset);

  const {
    title,
    description,
    fileUrl,
    fileName,
    fileSize,
    mimeType,
    category,
    assetType: rawAssetType,
    url,
    htmlContent,
    sourceType,
  } = body ?? {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return invalid('title is required');
  }

  const assetType = rawAssetType || 'file';
  if (!VALID_ASSET_TYPES.includes(assetType)) {
    return invalid(`asset_type must be one of: ${VALID_ASSET_TYPES.join(', ')}`);
  }

  if (assetType === 'content') {
    if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.trim().length === 0) {
      return invalid('htmlContent is required for content type');
    }
  }

  if (assetType === 'external-link') {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return invalid('url is required for external-link type');
    }
  }

  const item = repo.create({
    organizationId,
    title: title.trim(),
    description: description || null,
    fileUrl: assetType === 'file' ? fileUrl || null : null,
    fileName: assetType === 'file' ? fileName || null : null,
    fileSize: assetType === 'file' && typeof fileSize === 'number' ? fileSize : null,
    mimeType: assetType === 'file' ? mimeType || null : null,
    category: category || null,
    assetType,
    url: assetType === 'external-link' ? url || null : null,
    htmlContent: assetType === 'content' ? htmlContent || null : null,
    sourceType: sourceType || 'uploaded',
    isActive: true,
  });

  const saved = await repo.save(item);
  return { ok: true, data: saved };
}

/** PUT — 자료 수정. asset_type 은 변경하지 않는다(원본 동작 유지). */
export async function updateLibraryAsset(
  dataSource: DataSource,
  organizationId: string,
  id: string,
  body: any,
): Promise<LibraryResult<StoreExecutionAsset>> {
  const repo = dataSource.getRepository(StoreExecutionAsset);

  const item = await repo.findOne({ where: { id, organizationId } });
  if (!item) return NOT_FOUND;

  const {
    title,
    description,
    fileUrl,
    fileName,
    fileSize,
    mimeType,
    category,
    isActive,
    url,
    htmlContent,
  } = body ?? {};

  if (title !== undefined) item.title = String(title).trim();
  if (description !== undefined) item.description = description;
  if (category !== undefined) item.category = category;
  if (typeof isActive === 'boolean') item.isActive = isActive;

  const currentType = item.assetType || 'file';

  if (currentType === 'file') {
    if (fileUrl !== undefined) item.fileUrl = fileUrl;
    if (fileName !== undefined) item.fileName = fileName;
    if (fileSize !== undefined) item.fileSize = typeof fileSize === 'number' ? fileSize : null;
    if (mimeType !== undefined) item.mimeType = mimeType;
  } else if (currentType === 'content') {
    if (htmlContent !== undefined) item.htmlContent = htmlContent;
  } else if (currentType === 'external-link') {
    if (url !== undefined) item.url = url;
  }

  const saved = await repo.save(item);
  return { ok: true, data: saved };
}

/**
 * DELETE — soft delete (is_active=false).
 *
 * QR 코드가 참조 중인 항목은 삭제할 수 없다 (409 QR_REFERENCE_EXISTS).
 */
export async function deactivateLibraryAsset(
  dataSource: DataSource,
  organizationId: string,
  id: string,
): Promise<LibraryResult<{ id: string; deactivated: true }>> {
  const repo = dataSource.getRepository(StoreExecutionAsset);

  const item = await repo.findOne({ where: { id, organizationId } });
  if (!item) return NOT_FOUND;

  const qrRefResult = await dataSource.query(
    `SELECT COUNT(*)::int AS cnt FROM store_qr_codes WHERE library_item_id = $1 AND is_active = true`,
    [id],
  );
  const qrCount = qrRefResult?.[0]?.cnt || 0;

  if (qrCount > 0) {
    return {
      ok: false,
      status: 409,
      code: 'QR_REFERENCE_EXISTS',
      message: `이 자료를 참조하는 QR 코드가 ${qrCount}개 있어 삭제할 수 없습니다. QR 코드를 먼저 삭제해주세요.`,
      details: { qrCount },
    };
  }

  item.isActive = false;
  await repo.save(item);

  return { ok: true, data: { id, deactivated: true } };
}
