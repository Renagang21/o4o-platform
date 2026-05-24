/**
 * Store QR Staff Controller — Store QR Hub Import (운영자 템플릿 → 매장 사본 변환)
 *
 * WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1 (2026-05-24)
 *
 * 매장 경영자가 운영자 발행 QR 템플릿 (operator_qr_templates) 을 가져가 자기 매장
 * 소유 QR-code (store_qr_codes) 로 변환·생성한다.
 *
 * 본 controller 는 **변환 흐름 전용** — 매장 owner CRUD 는 기존 store-qr-landing.controller
 * (/pharmacy/qr/*) 가 모두 cover.
 *
 * Staff (인증 + 매장 owner 확인):
 *   POST /stores/:slug/qr/staff/import { sourceId }
 *
 * 변환 흐름:
 *   1. operator_qr_templates 원본 조회
 *      WHERE id = sourceId
 *        AND service_key = serviceKey
 *        AND author_role = 'operator'
 *        AND status = 'published'
 *   2. landing 변환 (IR 1차 범위):
 *      template.target_type='url'     → store_qr_codes.landing_type='link',  landing_target_id=target_url
 *      template.target_type='content' → store_qr_codes.landing_type='page',  landing_target_id=target_content_ref
 *      (content kind blog/cms/pop 모두 'page' 로 매핑 — landing_target_id 만 ref 값)
 *   3. slug 발급:
 *      base = title slugify
 *      충돌 (global unique) 시 → ${base}-${Date.now().toString(36)} fallback
 *   4. store_qr_codes INSERT:
 *      organization_id = pharmacy.id (매장 owner 의 org)
 *      title / description (접두어 "[운영자 자료 가져옴] ")
 *      type / landing_type / landing_target_id = 변환 결과
 *      is_active = true
 *
 * Drift Guard:
 *   - 원본은 author_role='operator' AND status='published' 만 통과
 *   - 사본은 organization_id NOT NULL + FK 강제 (기존 store_qr_codes 구조 그대로)
 *   - store_qr_codes 구조 / scan tracking / /qr/public/:slug global URL 영향 0
 *
 * 본 WO 범위 외:
 *   - 매장 직접 QR 작성 (POST /pharmacy/qr — 기존 store-qr-landing.controller 보존)
 *   - 매장 사본 관리 화면 (기존 StoreQRPage 에서 자동 표시)
 *   - 통합 scan analytics
 *   - 설문 / 태블릿 / 공급자 직접 QR
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../../modules/store-core/entities/organization-store.entity.js';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { OperatorQrTemplate } from '../entities/operator-qr-template.entity.js';
import type {
  OperatorQrTemplateAuthorRole,
  OperatorQrTemplateStatus,
} from '../entities/operator-qr-template.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { StoreSlugService } from '@o4o/platform-core/store-identity';

const DEFAULT_SERVICE_KEY = 'kpa';

/**
 * Generate URL-friendly slug from title.
 * Keeps Korean characters stripped (store_qr_codes.slug 는 ASCII 안전 우선).
 * 길이 60 제한 — store_qr_codes.slug varchar(200) 안에서 fallback suffix 여유 확보.
 */
function generateSlug(title: string): string {
  const stripped = title
    .toLowerCase()
    .trim()
    .replace(/[가-힣]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return stripped || `qr-${Date.now().toString(36)}`;
}

export function createStoreQrStaffController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
  serviceKey: string = DEFAULT_SERVICE_KEY,
): Router {
  const router = Router();
  const orgRepo = dataSource.getRepository(OrganizationStore);
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const templateRepo = dataSource.getRepository(OperatorQrTemplate);
  const slugService = new StoreSlugService(dataSource);

  // Helper: resolve organization by slug — pop.controller.ts / blog.controller.ts mirror
  async function resolvePharmacy(slug: string): Promise<OrganizationStore | null> {
    const record = await slugService.findBySlug(slug);
    if (!record || !record.isActive) return null;
    return orgRepo.findOne({ where: { id: record.storeId, isActive: true } });
  }

  // Helper: verify store ownership — pop.controller.ts / blog.controller.ts mirror
  function verifyOwner(pharmacy: OrganizationStore, userId: string): boolean {
    return pharmacy.created_by_user_id === userId;
  }

  // ============================================================================
  // STAFF — 운영자 QR 템플릿 가져오기 (변환 INSERT)
  // POST /stores/:slug/qr/staff/import
  // body: { sourceId: string }
  //
  // 변환 규칙 (작업 3 — IR 1차 범위):
  //   targetType='url'     → landingType='link', landingTargetId=targetUrl
  //   targetType='content' → landingType='page', landingTargetId=targetContentRef
  //                          (kind blog/cms/pop 모두 'page' 매핑)
  // ============================================================================
  router.post('/:slug/qr/staff/import', requireAuth, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const authReq = req as unknown as AuthRequest;
      const userId = authReq.user?.id || authReq.authUser?.id;
      const { sourceId } = req.body ?? {};

      if (typeof sourceId !== 'string' || sourceId.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'sourceId is required' },
        });
        return;
      }

      const pharmacy = await resolvePharmacy(slug);
      if (!pharmacy) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_NOT_FOUND', message: 'Store not found' },
        });
        return;
      }
      if (!userId || !verifyOwner(pharmacy, userId)) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not the store owner' },
        });
        return;
      }

      // 1. 소스 템플릿 조회 — operator + published + 같은 서비스만 허용
      const source = await templateRepo.findOne({
        where: {
          id: sourceId,
          serviceKey,
          authorRole: 'operator' as OperatorQrTemplateAuthorRole,
          status: 'published' as OperatorQrTemplateStatus,
        },
      });
      if (!source) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SOURCE_NOT_FOUND',
            message: 'Operator-published HUB QR template not found for this service',
          },
        });
        return;
      }

      // 2. landing 변환 (작업 3)
      let landingType: string;
      let landingTargetId: string | null;
      if (source.targetType === 'url') {
        if (!source.targetUrl) {
          res.status(500).json({
            success: false,
            error: {
              code: 'SOURCE_INCONSISTENT',
              message: 'Template targetType=url but targetUrl is missing (DB CHECK violation?)',
            },
          });
          return;
        }
        landingType = 'link';
        landingTargetId = source.targetUrl;
      } else {
        // targetType === 'content'
        if (!source.targetContentRef) {
          res.status(500).json({
            success: false,
            error: {
              code: 'SOURCE_INCONSISTENT',
              message: 'Template targetType=content but targetContentRef is missing',
            },
          });
          return;
        }
        landingType = 'page';
        landingTargetId = source.targetContentRef;
      }

      // 3. slug 발급 + 충돌 fallback (global unique)
      const baseSlug = generateSlug(source.title);
      let finalSlug = baseSlug;
      const existingBase = await qrRepo.findOne({ where: { slug: baseSlug } });
      if (existingBase) {
        finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
      }

      // 4. 사본 생성 — store_qr_codes INSERT
      //    출처 표시: description 접두어 (Blog/POP 패턴 동일)
      const ORIGIN_PREFIX = '[운영자 자료 가져옴] ';
      const sourceDescription = (source.description ?? '').trim();
      const copiedDescription = sourceDescription
        ? `${ORIGIN_PREFIX}${sourceDescription}`
        : ORIGIN_PREFIX.trim();

      const copy = qrRepo.create({
        organizationId: pharmacy.id,
        type: landingType, // store-qr-landing.controller 의 fallback 패턴 (type ?? landingType)
        title: source.title,
        description: copiedDescription,
        libraryItemId: null,
        landingType,
        landingTargetId,
        slug: finalSlug,
        isActive: true,
      });

      const saved = await qrRepo.save(copy);
      res.status(201).json({
        success: true,
        data: {
          ...saved,
          // 응답 메타 — frontend 가 "운영자 자료에서 가져옴" 토스트 활용
          importSource: {
            sourceId: source.id,
            sourceTitle: source.title,
            sourceServiceKey: source.serviceKey,
            sourceAuthorRole: source.authorRole,
            sourceTargetType: source.targetType,
            importedAt: new Date().toISOString(),
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message },
      });
    }
  });

  return router;
}
