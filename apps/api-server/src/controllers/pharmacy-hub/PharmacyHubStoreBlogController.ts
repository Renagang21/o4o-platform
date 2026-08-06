/**
 * Pharmacy-Hub Store Owner Blog Controller — "블로그"
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/blog              목록
 *   POST   /api/v1/pharmacy-hub/store-owner/blog              생성 (draft)
 *   GET    /api/v1/pharmacy-hub/store-owner/blog/:id          단건
 *   PUT    /api/v1/pharmacy-hub/store-owner/blog/:id          수정
 *   PATCH  /api/v1/pharmacy-hub/store-owner/blog/:id/publish  발행
 *   PATCH  /api/v1/pharmacy-hub/store-owner/blog/:id/archive  보관
 *   DELETE /api/v1/pharmacy-hub/store-owner/blog/:id          삭제
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 원장은 공유 테이블 `store_blog_posts` 다. 새 테이블을 만들지 않는다.
 * 소유 경계는 (store_id, service_key) 이고, store_id 에는 organizations.id 가 들어간다
 * (실측 정합 — FK 없음). 그래서 Pharmacy-Hub 는 slug 경유 없이 조직으로 바로 키를 잡는다.
 *
 * 왜 공통 라우트를 그대로 마운트하지 않는가
 *   공통 blog.controller 의 staff 경로는 매장을 URL slug 로 찾고, 소유 확인이
 *   KPA=role_assignments / 그 외=created_by_user_id 로 갈린다. Pharmacy-Hub 매장은
 *   enrollment 기준으로 결정되어야 하므로(W5/W7 계약) 조직만 여기서 다시 정한다.
 *
 * 공개 URL 범위
 *   본 WO V1 은 **저작·관리**까지다. Pharmacy-Hub 공개 블로그 페이지 라우트는 아직 없고,
 *   작업요청서가 "공개 URL 부재만으로는 WO 를 중지하지 않는다" 고 명시했으므로
 *   발행 상태(status='published')만 기록하고 공개 렌더링은 만들지 않는다.
 *   (데이터 seam 은 이미 존재 — platform_store_slugs 에 pharmacy-hub row 있음.)
 *
 * 조직 계약 (PharmacyHubLocalProductController 와 동일)
 *   0개 / 2개 이상 : GET 목록 200 안내 / 그 외 409
 *   1개            : 해당 조직으로만 조회·수정
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { resolvePharmacyHubStoreOrganization, type StoreOrgResolution } from './store-organization.resolver.js';
import {
  listStoreBlogPosts,
  getStoreBlogPost,
  createStoreBlogPost,
  updateStoreBlogPost,
  publishStoreBlogPost,
  archiveStoreBlogPost,
  deleteStoreBlogPost,
  type BlogResult,
  type BlogFailure,
} from '../../services/store/store-blog.service.js';

const SERVICE_KEY = 'pharmacy-hub';

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
      error: '매장이 연결되어 있지 않아 블로그를 관리할 수 없습니다.',
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
function sendFailure(res: Response, result: BlogResult<unknown>): void {
  const failure = result as BlogFailure;
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

/** body 로 매장을 지목할 수 없다 — 조용히 무시하지 않고 명시적으로 거부한다. */
function rejectsStoreFields(req: Request, res: Response): boolean {
  const body = req.body;
  if (!body || typeof body !== 'object') return false;
  if ('organizationId' in body || 'storeId' in body || 'serviceKey' in body) {
    res.status(400).json({
      success: false,
      error: '매장과 서비스는 서버가 결정합니다. organizationId·storeId·serviceKey 는 보낼 수 없습니다.',
      code: 'FIELD_NOT_ACCEPTED',
    });
    return true;
  }
  return false;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** store_blog_posts.id 는 uuid — 비-uuid 캐스팅 500 을 막는다. */
function rejectsMalformedId(req: Request, res: Response): boolean {
  if (UUID_RE.test(String(req.params.id ?? ''))) return false;
  res.status(404).json({ success: false, error: 'Blog post not found', code: 'POST_NOT_FOUND' });
  return true;
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  logger.error(`[PharmacyHubStoreBlog] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

export class PharmacyHubStoreBlogController {
  /** GET /store-owner/blog — query: page, limit, status */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({
          success: true,
          data: { storeConnection, posts: [], total: 0, page: 1, limit: 20, totalPages: 0 },
        });
      }

      const data = await listStoreBlogPosts(AppDataSource, resolution.organizationId, SERVICE_KEY, {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
      });
      return res.json({ success: true, data: { storeConnection, ...data } });
    } catch (error) {
      return fail(res, userId, 'list', error, '블로그 목록을 불러오지 못했습니다.', 'BLOG_LOAD_FAILED');
    }
  }

  /** GET /store-owner/blog/:id */
  static async detail(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await getStoreBlogPost(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'detail', error, '블로그 글을 불러오지 못했습니다.', 'BLOG_POST_LOAD_FAILED');
    }
  }

  /** POST /store-owner/blog — draft 생성 */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsStoreFields(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await createStoreBlogPost(
        AppDataSource,
        resolution.organizationId,
        SERVICE_KEY,
        userId,
        req.body ?? {},
      );
      if (!result.ok) return sendFailure(res, result);
      return res.status(201).json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'create', error, '블로그 글을 저장하지 못했습니다.', 'BLOG_CREATE_FAILED');
    }
  }

  /** PUT /store-owner/blog/:id */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsStoreFields(req, res)) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await updateStoreBlogPost(
        AppDataSource,
        resolution.organizationId,
        req.params.id,
        req.body ?? {},
      );
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'update', error, '블로그 글을 수정하지 못했습니다.', 'BLOG_UPDATE_FAILED');
    }
  }

  /** PATCH /store-owner/blog/:id/publish */
  static async publish(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await publishStoreBlogPost(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'publish', error, '블로그 글을 발행하지 못했습니다.', 'BLOG_PUBLISH_FAILED');
    }
  }

  /** PATCH /store-owner/blog/:id/archive */
  static async archive(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await archiveStoreBlogPost(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'archive', error, '블로그 글을 보관하지 못했습니다.', 'BLOG_ARCHIVE_FAILED');
    }
  }

  /** DELETE /store-owner/blog/:id */
  static async remove(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await deleteStoreBlogPost(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'remove', error, '블로그 글을 삭제하지 못했습니다.', 'BLOG_DELETE_FAILED');
    }
  }
}
