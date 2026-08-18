/**
 * Store POP Controller — Store POP Channel (매장 store_pops 사본 관리)
 *
 * WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1 (2026-05-24)
 *
 * 매장 경영자가 자기 매장 POP 사본 (author_role='store') 을 조회·수정·삭제하고,
 * 운영자가 발행한 HUB POP 을 자기 매장 사본으로 가져오는 staff API.
 *
 * blog.controller.ts staff CRUD + import 패턴 1:1 mirror — store_blog_posts 와
 * store_pops 가 동일 schema 형태이기 때문.
 *
 * Staff (인증 + 매장 owner 확인):
 *   GET    /stores/:slug/pop/staff           — 매장 store_pops 사본 목록 (author_role='store')
 *   POST   /stores/:slug/pop/staff           — 매장 직접 POP 작성 (WO-O4O-POP-SAVE-AS-CONTENT-V1)
 *   POST   /stores/:slug/pop/staff/import    — 운영자 HUB POP 가져오기 (author_role='store' INSERT)
 *   PUT    /stores/:slug/pop/staff/:id       — 사본 수정
 *   DELETE /stores/:slug/pop/staff/:id       — 사본 삭제
 *
 * 기존 createStorePopController (PDF 생성, /pharmacy/pop/generate) 는 별도 controller —
 * 본 controller 는 store_pops 사본 row 관리 전용.
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1:
 *   저장·검증 계약을 services/store/store-pop.service.ts 로 추출했다. 이 controller 는
 *   **slug → 매장 해석 + 소유 확인 + 응답 매핑**만 담당한다 (조직 해석 방식 무변경).
 *   Pharmacy-Hub 는 같은 service 함수를 쓰되 조직만 PH enrollment 기준으로 해석한다.
 *
 * Drift Guard (service 안에서 강제):
 *   - import endpoint 는 author_role='operator' AND status='published' 원본만 통과
 *   - 사본 author_role='store' AND storeId NOT NULL 강제 (DB CHECK 제약 + service)
 *   - (storeId, serviceKey) 복합 게이트로 매장 간·서비스 간 사본 접근 차단
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
// WO-O4O-KPA-APPROVED-STORE-OWNER-AUTO-AUTHORIZATION-FIX-V1
import { kpaStoreOwnerOwnsStore } from '../utils/kpa-store-owner.util.js';
import type { AuthRequest } from '../../../types/auth.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import {
  listStorePops,
  createStorePop,
  importStorePop,
  updateStorePop,
  deleteStorePop,
  type PopResult,
  type PopFailure,
} from '../../../services/store/store-pop.service.js';

const DEFAULT_SERVICE_KEY = 'kpa';

export function createStorePopStaffController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string = DEFAULT_SERVICE_KEY,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const slugService = new StoreSlugService(dataSource);

  // Helper: resolve organization by slug (active stores only) — blog.controller.ts mirror
  async function resolvePharmacy(slug: string): Promise<OrganizationStore | null> {
    const record = await slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    // WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1 §6:
    //   공개 조회는 slug 만 맞는다고 끝내지 않고 **service 귀속까지 일치**해야 한다.
    //   이 컨트롤러는 서비스별 mount(`/api/v1/{service}/stores/:slug/...`)이고
    //   `serviceKey` 는 slug 축(kpa / glycopharm / cosmetics)과 같은 값이 주입된다.
    //   slug row 의 service_key 가 다르면 이 서비스의 공개 매장이 아니다
    //   (다서비스 enrollment 조직이 다른 서비스 slug 로 열리던 결함).
    if (record.serviceKey !== serviceKey) return null;
    return orgRepo.findOne({ where: { id: record.storeId, isActive: true } });
  }

  // Helper: verify store ownership — blog.controller.ts mirror
  // WO-O4O-KPA-APPROVED-STORE-OWNER-AUTO-AUTHORIZATION-FIX-V1:
  // KPA 승인 매장 경영자(role_assignments.kpa:store_owner, RBAC SSOT) 기준. created_by 아님.
  // 교차 매장 차단은 kpaStoreOwnerOwnsStore 내부(resolved org === store.id). GP/Cosmetics 는 created_by 유지.
  async function verifyOwner(pharmacy: OrganizationStore, userId: string): Promise<boolean> {
    if (serviceKey === 'kpa') {
      return kpaStoreOwnerOwnsStore(dataSource, userId, pharmacy.id);
    }
    return pharmacy.created_by_user_id === userId;
  }

  /**
   * 공통 service 실패 결과 → 이 라우트의 envelope(nested error).
   *
   * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
   * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
   */
  function sendPopFailure(res: Response, result: PopResult<unknown>): void {
    const failure = result as PopFailure;
    res.status(failure.status).json({
      success: false,
      error: { code: failure.code, message: failure.message },
    });
  }

  /**
   * slug → 매장 해석 + 소유 확인을 한 번에 처리한다.
   * 통과하면 store_id 를, 실패하면 응답을 이미 보낸 상태로 null 을 돌려준다.
   */
  async function resolveOwnedStoreId(req: Request, res: Response): Promise<string | null> {
    const { slug } = req.params;
    const authReq = req as unknown as AuthRequest;
    const userId = authReq.user?.id || authReq.authUser?.id;

    const pharmacy = await resolvePharmacy(slug);
    if (!pharmacy) {
      res.status(404).json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found' } });
      return null;
    }
    if (!userId || !(await verifyOwner(pharmacy, userId))) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '이 매장의 경영자만 접근할 수 있습니다.' },
      });
      return null;
    }
    return pharmacy.id;
  }

  // ============================================================================
  // STAFF — 매장 store_pops 사본 목록 (author_role='store' 한정)
  // GET /stores/:slug/pop/staff
  // ============================================================================
  router.get('/:slug/pop/staff', requireAuth, async (req: Request, res: Response) => {
    try {
      const storeId = await resolveOwnedStoreId(req, res);
      if (!storeId) return;

      const { items, page, limit, total, totalPages } = await listStorePops(
        dataSource,
        storeId,
        serviceKey,
        { page: req.query.page, limit: req.query.limit, status: req.query.status },
      );
      // 기존 계약: data = 배열, 페이지 정보는 meta 로 분리한다.
      res.json({ success: true, data: items, meta: { page, limit, total, totalPages } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 매장 직접 POP 콘텐츠 저장 (author_role='store' INSERT)
  // POST /stores/:slug/pop/staff        (WO-O4O-POP-SAVE-AS-CONTENT-V1)
  // ============================================================================
  router.post('/:slug/pop/staff', requireAuth, async (req: Request, res: Response) => {
    try {
      const storeId = await resolveOwnedStoreId(req, res);
      if (!storeId) return;

      const result = await createStorePop(dataSource, storeId, serviceKey, req.body);
      if (!result.ok) {
        sendPopFailure(res, result);
        return;
      }
      res.status(201).json({ success: true, data: result.data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 운영자 HUB POP 가져오기 (Operator 원본 → 매장 독립 사본)
  // POST /stores/:slug/pop/staff/import   body: { sourceId }
  //
  // 값 복사다 — 새 id · 매장 store_id · status='draft'. 원본 FK 를 만들지 않으므로
  // 이후 원본 수정·삭제가 사본에 영향을 주지 않는다. 출처는 excerpt 접두어로만 표시.
  // ============================================================================
  router.post('/:slug/pop/staff/import', requireAuth, async (req: Request, res: Response) => {
    try {
      const storeId = await resolveOwnedStoreId(req, res);
      if (!storeId) return;

      const result = await importStorePop(dataSource, storeId, serviceKey, req.body?.sourceId);
      if (!result.ok) {
        sendPopFailure(res, result);
        return;
      }
      // 기존 계약: 사본 필드 + importSource 메타를 같은 객체로 평탄화해 내려준다.
      res.status(201).json({
        success: true,
        data: { ...result.data.pop, importSource: result.data.importSource },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 사본 수정
  // PUT /stores/:slug/pop/staff/:id
  //
  // 강제 보호: author_role / serviceKey / storeId 는 body 로 변경 불가.
  // 본 endpoint 는 author_role='store' 사본만 대상 — operator 원본은 조회되지 않는다.
  // ============================================================================
  router.put('/:slug/pop/staff/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const storeId = await resolveOwnedStoreId(req, res);
      if (!storeId) return;

      const result = await updateStorePop(dataSource, storeId, serviceKey, req.params.id, req.body);
      if (!result.ok) {
        sendPopFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // ============================================================================
  // STAFF — 사본 삭제
  // DELETE /stores/:slug/pop/staff/:id
  // ============================================================================
  router.delete('/:slug/pop/staff/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const storeId = await resolveOwnedStoreId(req, res);
      if (!storeId) return;

      const result = await deleteStorePop(dataSource, storeId, serviceKey, req.params.id);
      if (!result.ok) {
        sendPopFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });


  return router;
}
