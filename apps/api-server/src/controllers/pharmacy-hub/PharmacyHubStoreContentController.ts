/**
 * Pharmacy-Hub Store Owner Content Controller — "매장 콘텐츠"
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/content        목록 (snapshot_edit + direct)
 *   POST   /api/v1/pharmacy-hub/store-owner/content        direct 콘텐츠 등록
 *   GET    /api/v1/pharmacy-hub/store-owner/content/:id    direct 콘텐츠 단건
 *   PUT    /api/v1/pharmacy-hub/store-owner/content/:id    direct 콘텐츠 수정
 *   DELETE /api/v1/pharmacy-hub/store-owner/content/:id    direct 콘텐츠 삭제
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 원장은 `kpa_store_contents` 다 — 이름은 legacy physical table name 이고 논리 개념은
 * service-neutral **Store Production Material** 이다 (CLAUDE.md §5). 새 테이블을 만들지 않는다.
 * 격리 축은 organization_id 단일 축이다 (Boundary Policy §7 Store Ops).
 *
 * 이 컨트롤러가 하는 일은 **조직 결정 + 상태코드 매핑**뿐이다.
 * 검증·SQL 계약은 공통 services/store/store-content.service.ts 를 호출한다 (로직 복제 0).
 *
 * 왜 공통 라우트를 그대로 마운트하지 않는가
 *   공통 store-content.controller 는 조직을 isStoreOwner(dataSource, userId, 'kpa') +
 *   KpaMember fallback 으로 구한다 — KPA 하드와이어라 Pharmacy-Hub 에서는 항상 실패한다.
 *
 * 조직 계약 (PharmacyHubLocalProductController 와 동일)
 *   0개      : GET 200 안내 / write 409 STORE_NOT_CONNECTED
 *   2개 이상 : GET 200 안내 / write 409 AMBIGUOUS_STORE_CONNECTION
 *   1개      : 해당 조직으로만 조회·수정
 *
 * V1 범위: 목록 + direct 콘텐츠 CRUD.
 *   snapshot_edit(운영자 자료 사본 편집)·번역·b2c 설명 가져오기는 KPA 전용 흐름에 묶여 있어
 *   본 WO 범위 밖이다 (QR·POP·태블릿·사이니지와 함께 변경 금지 항목).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { resolvePharmacyHubStoreOrganization, type StoreOrgResolution } from './store-organization.resolver.js';
import {
  listStoreContents,
  createDirectContent,
  getDirectContent,
  updateDirectContent,
  deleteDirectContent,
  type ContentResult,
  type ContentFailure,
} from '../../services/store/store-content.service.js';

function storeConnectionView(resolution: StoreOrgResolution) {
  return {
    status: resolution.status,
    candidateCount: resolution.candidateCount,
    errorCode: resolution.status === 'ambiguous' ? resolution.errorCode : null,
  };
}

function sendWriteBlocked(res: Response, resolution: StoreOrgResolution): void {
  if (resolution.status === 'not_connected') {
    res.status(409).json({
      success: false,
      error: '매장이 연결되어 있지 않아 매장 콘텐츠를 관리할 수 없습니다.',
      code: 'STORE_NOT_CONNECTED',
    });
    return;
  }
  res.status(409).json({
    success: false,
    error: '연결된 매장이 여러 개입니다. 운영자에게 문의해 주세요.',
    code: 'AMBIGUOUS_STORE_CONNECTION',
  });
}

/** strictNullChecks 가 꺼져 있어 `!result.ok` 로 union 이 좁혀지지 않는다 — 실패 분기에서만 호출한다. */
function sendFailure(res: Response, result: ContentResult<unknown>): void {
  const failure = result as ContentFailure;
  res.status(failure.status).json({ success: false, error: failure.message, code: failure.code });
}

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

/** body 로 조직을 지목할 수 없다 — 조용히 무시하지 않고 명시적으로 거부한다. */
function rejectsOrganizationId(req: Request, res: Response): boolean {
  if (req.body && typeof req.body === 'object' && 'organizationId' in req.body) {
    res.status(400).json({
      success: false,
      error: '매장은 서버가 결정합니다. organizationId 는 보낼 수 없습니다.',
      code: 'FIELD_NOT_ACCEPTED',
    });
    return true;
  }
  return false;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** kpa_store_contents.id 는 uuid — 비-uuid 캐스팅 500 을 막는다. */
function rejectsMalformedId(req: Request, res: Response): boolean {
  if (UUID_RE.test(String(req.params.id ?? ''))) return false;
  res.status(400).json({ success: false, error: 'Invalid content ID', code: 'INVALID_ID' });
  return true;
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  logger.error(`[PharmacyHubStoreContent] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

export class PharmacyHubStoreContentController {
  /** GET /store-owner/content */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, items: [], total: 0 } });
      }

      const items = await listStoreContents(AppDataSource, resolution.organizationId);
      return res.json({ success: true, data: { storeConnection, items, total: items.length } });
    } catch (error) {
      return fail(res, userId, 'list', error, '매장 콘텐츠를 불러오지 못했습니다.', 'STORE_CONTENTS_LOAD_FAILED');
    }
  }

  /** GET /store-owner/content/:id — direct 콘텐츠 단건 */
  static async detail(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await getDirectContent(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'detail', error, '매장 콘텐츠를 불러오지 못했습니다.', 'STORE_CONTENT_LOAD_FAILED');
    }
  }

  /** POST /store-owner/content — direct 콘텐츠 등록 */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await createDirectContent(
        AppDataSource,
        resolution.organizationId,
        userId,
        req.body,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'create', error, '매장 콘텐츠를 저장하지 못했습니다.', 'STORE_CONTENT_CREATE_FAILED');
    }
  }

  /** PUT /store-owner/content/:id */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await updateDirectContent(
        AppDataSource,
        resolution.organizationId,
        userId,
        req.params.id,
        req.body,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'update', error, '매장 콘텐츠를 수정하지 못했습니다.', 'STORE_CONTENT_UPDATE_FAILED');
    }
  }

  /** DELETE /store-owner/content/:id */
  static async remove(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await deleteDirectContent(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'remove', error, '매장 콘텐츠를 삭제하지 못했습니다.', 'STORE_CONTENT_DELETE_FAILED');
    }
  }
}
