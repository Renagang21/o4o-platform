/**
 * Pharmacy-Hub Store Owner POP Controller — 매장 POP
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 B)
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/pop              목록 (status 필터)
 *   GET    /api/v1/pharmacy-hub/store-owner/pop/hub          운영자 HUB 원본 목록 (가져오기 대상)
 *   POST   /api/v1/pharmacy-hub/store-owner/pop              매장 직접 작성
 *   POST   /api/v1/pharmacy-hub/store-owner/pop/import       운영자 HUB POP 가져오기(독립 사본)
 *   GET    /api/v1/pharmacy-hub/store-owner/pop/:id          단건 (미리보기·수정용)
 *   PUT    /api/v1/pharmacy-hub/store-owner/pop/:id          수정
 *   PATCH  /api/v1/pharmacy-hub/store-owner/pop/:id/publish  발행
 *   PATCH  /api/v1/pharmacy-hub/store-owner/pop/:id/archive  보관
 *   DELETE /api/v1/pharmacy-hub/store-owner/pop/:id          삭제
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 컨트롤러가 하는 일은 **조직 결정 + 상태코드 매핑**뿐이다.
 * 저장·검증 계약은 공통 services/store/store-pop.service.ts 를 호출한다
 * (KPA·GlycoPharm·K-Cosmetics 가 쓰는 것과 같은 함수 — 로직 복제 0).
 *
 * 왜 공통 라우트(/stores/:slug/pop/staff)를 그대로 마운트하지 않는가
 *   공통 라우트는 매장을 **URL slug** 로 찾고 소유를 `created_by_user_id`(KPA 는 role 축)로
 *   확인한다. Pharmacy-Hub 매장은 프로비저닝이 만든 조직이라 created_by 가 경영자와 일치한다는
 *   보장이 없고, 매장 식별을 클라이언트가 URL 로 지목하게 두지도 않는다.
 *   여기서는 인증 사용자 + PH active enrollment 로만 조직을 정한다.
 *
 * 억지 HUB 구조를 만들지 않는다 (작업요청서 지시)
 *   Pharmacy-Hub 에는 아직 운영자 POP 원본이 없다(운영자 콘솔이 회원 승인까지만 구현).
 *   그래서 **PH 전용 운영자 HUB 를 새로 만들지 않고**, 기존 구조가 이미 허용하는
 *   매장 직접 작성(POST — WO-O4O-POP-SAVE-AS-CONTENT-V1)을 주 경로로 둔다.
 *   `/pop/hub` 는 같은 계약을 그대로 노출할 뿐이며, 운영자 원본이 생기기 전까지는
 *   정상적으로 **빈 목록**을 돌려준다 (없는 것을 있는 것처럼 보이게 하지 않는다).
 *
 * 조직 계약 (다른 Pharmacy-Hub 매장 컨트롤러와 동일)
 *   0개      : GET 200 안내 / write 409 STORE_NOT_CONNECTED
 *   2개 이상 : GET 200 안내 / write 409 AMBIGUOUS_STORE_CONNECTION
 *   1개      : 해당 조직으로만 조회·수정
 *   클라이언트 organizationId 는 신뢰하지 않는다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  resolvePharmacyHubStoreOrganization,
  type StoreOrgResolution,
} from './store-organization.resolver.js';
import {
  listStorePops,
  findStorePop,
  createStorePop,
  importStorePop,
  updateStorePop,
  setStorePopStatus,
  deleteStorePop,
  type PopResult,
  type PopFailure,
} from '../../services/store/store-pop.service.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      error: '매장이 연결되어 있지 않아 POP 을 관리할 수 없습니다.',
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

/**
 * 공통 service 실패 결과를 상태코드로 매핑한다 (Pharmacy-Hub 는 flat envelope).
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
 * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
 */
function sendFailure(res: Response, result: PopResult<unknown>): void {
  const failure = result as PopFailure;
  res.status(failure.status).json({
    success: false,
    error: failure.message,
    code: failure.code,
  });
}

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

/** body 로 조직·매장을 지목할 수 없다 — 조용히 무시하지 않고 명시적으로 거부한다. */
function rejectsForeignKeys(req: Request, res: Response): boolean {
  const body = req.body;
  if (!body || typeof body !== 'object') return false;
  for (const key of ['organizationId', 'storeId', 'serviceKey', 'authorRole']) {
    if (key in body) {
      res.status(400).json({
        success: false,
        error: `매장·작성자 정보는 서버가 결정합니다. ${key} 는 보낼 수 없습니다.`,
        code: 'FIELD_NOT_ACCEPTED',
      });
      return true;
    }
  }
  return false;
}

function rejectsMalformedId(req: Request, res: Response): boolean {
  if (UUID_RE.test(String(req.params.id ?? ''))) return false;
  res.status(404).json({ success: false, error: 'POP 을 찾을 수 없습니다.', code: 'POST_NOT_FOUND' });
  return true;
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  logger.error(`[PharmacyHubStorePop] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

export class PharmacyHubStorePopController {
  /** GET /store-owner/pop — query: page, limit, status */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({
          success: true,
          data: { storeConnection, items: [], total: 0, page: 1, limit: 20, totalPages: 0 },
        });
      }

      const data = await listStorePops(AppDataSource, resolution.organizationId, SERVICE_KEY, {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
      });
      return res.json({ success: true, data: { storeConnection, ...data } });
    } catch (error) {
      return fail(res, userId, 'list', error, 'POP 목록을 불러오지 못했습니다.', 'POP_LOAD_FAILED');
    }
  }

  /**
   * GET /store-owner/pop/hub — 가져올 수 있는 운영자 HUB 원본 목록.
   *
   * `author_role='operator' AND status='published' AND service_key='pharmacy-hub'` 만 본다.
   * Pharmacy-Hub 에 아직 운영자 POP 원본이 없으므로 현재는 빈 목록이 정상이다 —
   * 이 상태를 감추려고 다른 서비스(KPA 등)의 원본을 끌어오지 않는다.
   */
  static async hubSources(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, items: [] } });
      }

      const items = await AppDataSource.query(
        `SELECT id, title, excerpt, published_at AS "publishedAt"
           FROM store_pops
          WHERE service_key = $1 AND author_role = 'operator' AND status = 'published'
          ORDER BY published_at DESC NULLS LAST
          LIMIT 100`,
        [SERVICE_KEY],
      );
      return res.json({ success: true, data: { storeConnection, items } });
    } catch (error) {
      return fail(res, userId, 'hubSources', error, '운영자 자료를 불러오지 못했습니다.', 'POP_HUB_FAILED');
    }
  }

  /** GET /store-owner/pop/:id — 단건 (미리보기·수정 폼용) */
  static async detail(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, pop: null } });
      }

      const result = await findStorePop(
        AppDataSource,
        resolution.organizationId,
        SERVICE_KEY,
        req.params.id,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: { storeConnection, pop: result.data } });
    } catch (error) {
      return fail(res, userId, 'detail', error, 'POP 을 불러오지 못했습니다.', 'POP_DETAIL_FAILED');
    }
  }

  /** POST /store-owner/pop — 매장 직접 작성 (status='draft') */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsForeignKeys(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await createStorePop(
        AppDataSource,
        resolution.organizationId,
        SERVICE_KEY,
        req.body,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'create', error, 'POP 을 만들지 못했습니다.', 'POP_CREATE_FAILED');
    }
  }

  /**
   * POST /store-owner/pop/import — 운영자 HUB 원본 → 매장 **독립 사본**.
   * 새 id · 매장 store_id · status='draft' 로 값 복사하며 원본 FK 를 만들지 않는다.
   * 이후 원본 수정·삭제는 사본에 영향이 없고, 사본 수정도 원본에 영향이 없다.
   */
  static async importFromHub(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsForeignKeys(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await importStorePop(
        AppDataSource,
        resolution.organizationId,
        SERVICE_KEY,
        req.body?.sourceId,
      );
      if (!result.ok) return sendFailure(res, result);
      return res
        .status(201)
        .json({ success: true, data: { ...result.data.pop, importSource: result.data.importSource } });
    } catch (error) {
      return fail(res, userId, 'import', error, '운영자 자료를 가져오지 못했습니다.', 'POP_IMPORT_FAILED');
    }
  }

  /** PUT /store-owner/pop/:id — 제목·본문·요약 수정 */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsForeignKeys(req, res)) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await updateStorePop(
        AppDataSource,
        resolution.organizationId,
        SERVICE_KEY,
        req.params.id,
        req.body,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'update', error, 'POP 을 수정하지 못했습니다.', 'POP_UPDATE_FAILED');
    }
  }

  /** PATCH /store-owner/pop/:id/publish — 발행 (최초 발행 시각만 기록) */
  static async publish(req: Request, res: Response): Promise<any> {
    return PharmacyHubStorePopController.transition(req, res, 'published', 'POP 을 발행하지 못했습니다.');
  }

  /** PATCH /store-owner/pop/:id/archive — 보관 (매장 목록에서 내림, 삭제 아님) */
  static async archive(req: Request, res: Response): Promise<any> {
    return PharmacyHubStorePopController.transition(req, res, 'archived', 'POP 을 보관하지 못했습니다.');
  }

  private static async transition(
    req: Request,
    res: Response,
    status: 'published' | 'archived',
    failMessage: string,
  ): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await setStorePopStatus(
        AppDataSource,
        resolution.organizationId,
        SERVICE_KEY,
        req.params.id,
        status,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, `transition:${status}`, error, failMessage, 'POP_STATUS_FAILED');
    }
  }

  /** DELETE /store-owner/pop/:id — 삭제 (store_pops 에는 soft delete 컬럼이 없다) */
  static async remove(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await deleteStorePop(
        AppDataSource,
        resolution.organizationId,
        SERVICE_KEY,
        req.params.id,
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'remove', error, 'POP 을 삭제하지 못했습니다.', 'POP_DELETE_FAILED');
    }
  }
}
