/**
 * Public Service Legal Controller (no auth)
 *
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *
 * 비로그인 공개 화면(푸터/약관 페이지)에서 읽는 read-only API.
 * Mount: /api/v1/public/services
 *
 *   GET /:serviceKey/legal-profile          — 활성 법정정보 (없으면 data:null, placeholder 금지)
 *   GET /:serviceKey/footer-legal           — 푸터용 법정정보 (legal-profile 동일 데이터)
 *   GET /:serviceKey/policies/:documentType — 최신 published 정책 문서 (없으면 404)
 *   GET /:serviceKey/policies/:documentType/scheduled[?slug=] — 관리자가 시행일을 정해 둔 다음 버전의 메타(본문 없음 · 없으면 data:null)
 *
 * 정책:
 *   - is_active 법정정보 / published 정책 문서만 반환.
 *   - 값 없는 필드는 null (준비중/미정 등 placeholder 생성 금지).
 *   - 내부/audit 필드(updated_by 등) 미노출.
 *   - scheduled 는 공고 화면이 시행 예정일을 하드코딩하지 않도록 관리자 입력(effective_date)을 읽는다.
 *     본문 · 작성자 · 변경 사유 등은 내보내지 않는다(버전 · 시행일 · 제목 · 표식만).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { IsNull, Not, type DataSource } from 'typeorm';
import { ServiceLegalProfile } from './entities/ServiceLegalProfile.entity.js';
import { ServicePolicyDocument } from './entities/ServicePolicyDocument.entity.js';
import { toPublicLegalProfile, toPublicPolicyDocument } from './service-legal.mapper.js';
import { isSupportedLegalServiceKey } from './service-legal-scope.js';
import { getService } from '../../config/service-catalog.js';
import logger from '../../utils/logger.js';
import { getEnrollmentPolicies } from '../policy-acceptance/service-enrollment-policy.service.js';
import { PolicyAcceptanceError } from '../policy-acceptance/policy-acceptance.service.js';

export function createPublicServiceLegalController(dataSource: DataSource, supportedScope: (key: string) => boolean = isSupportedLegalServiceKey): Router {
  const router = Router();
  const profileRepo = dataSource.getRepository(ServiceLegalProfile);
  const policyRepo = dataSource.getRepository(ServicePolicyDocument);

  function guardServiceKey(req: Request, res: Response, allowCatalogPolicy = false): string | null {
    const { serviceKey } = req.params;
    if (!serviceKey || (!supportedScope(serviceKey) && !(allowCatalogPolicy && getService(serviceKey)))) {
      res.status(404).json({
        success: false,
        error: { code: 'UNKNOWN_SERVICE', message: '지원하지 않는 서비스입니다.' },
      });
      return null;
    }
    return serviceKey;
  }

  // ── GET /:serviceKey/legal-profile ──
  async function handleLegalProfile(req: Request, res: Response) {
    const serviceKey = guardServiceKey(req, res);
    if (!serviceKey) return;
    try {
      const profile = await profileRepo.findOne({ where: { service_key: serviceKey, is_active: true } });
      // 미설정/비활성 → placeholder 없이 null. 푸터는 값이 없으면 렌더하지 않는다.
      res.json({ success: true, data: profile ? toPublicLegalProfile(profile) : null });
    } catch (error) {
      logger.error('[ServiceLegal Public] legal-profile error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '법정정보 조회 실패' } });
    }
  }

  router.get('/:serviceKey/legal-profile', handleLegalProfile);
  router.get('/:serviceKey/footer-legal', handleLegalProfile);

  router.get('/:serviceKey/enrollment-policies', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!guardServiceKey(req, res)) return;
    try {
      const documents = await getEnrollmentPolicies(dataSource, req.params.serviceKey);
      res.json({ success: true, data: documents.map(doc => ({ policyDocumentId: doc.id, serviceKey: doc.service_key,
        documentType: doc.document_type, version: Number(doc.version), title: doc.title, content: doc.content })) });
    } catch (error) {
      if (error instanceof PolicyAcceptanceError) return res.status(error.httpStatus).json({ success: false, error: { code: error.code, message: error.message } });
      res.status(503).json({ success: false, error: { code: 'POLICY_UNAVAILABLE', message: '정책 문서를 불러올 수 없습니다.' } });
    }
  });

  // ── GET /:serviceKey/policies/:documentType/scheduled (다음 버전 시행 예정 메타) ──
  //   공고 페이지가 시행 예정일을 코드에 고정하지 않고, 관리자가 초안에 입력한 시행일을 읽는다.
  //   draft 이고 시행일이 있고 현재 published 보다 버전이 높은 문서만. 본문은 내보내지 않는다.
  router.get('/:serviceKey/policies/:documentType/scheduled', async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res, true);
    if (!serviceKey) return;
    const { documentType } = req.params;
    const slug = typeof req.query.slug === 'string' && req.query.slug.trim() ? req.query.slug.trim() : undefined;
    try {
      const draft = await policyRepo.findOne({
        where: { service_key: serviceKey, document_type: documentType, status: 'draft', effective_date: Not(IsNull()), ...(slug ? { slug } : {}) },
        order: { version: 'DESC', effective_date: 'ASC' },
      });
      const published = draft
        ? await policyRepo.findOne({
          where: { service_key: serviceKey, document_type: documentType, status: 'published', ...(slug ? { slug } : {}) },
          order: { version: 'DESC' },
        })
        : null;
      const upcoming = draft && (!published || Number(draft.version) > Number(published.version)) ? draft : null;
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        data: upcoming
          ? { serviceKey, documentType, version: upcoming.version, title: upcoming.title, slug: upcoming.slug, effectiveDate: upcoming.effective_date }
          : null,
      });
    } catch (error) {
      logger.error('[ServiceLegal Public] scheduled policy error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '정책 문서 조회 실패' } });
    }
  });

  // ── GET /:serviceKey/policies/:documentType (최신 published) ──
  router.get('/:serviceKey/policies/:documentType', async (req: Request, res: Response) => {
    // Read only already-published documents for canonical services; management scopes are unchanged.
    const serviceKey = guardServiceKey(req, res, true);
    if (!serviceKey) return;
    const { documentType } = req.params;
    try {
      const doc = await policyRepo.findOne({
        where: { service_key: serviceKey, document_type: documentType, status: 'published' },
        order: { published_at: 'DESC', version: 'DESC' },
      });
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '게시된 문서가 없습니다.' },
        });
      }
      res.json({ success: true, data: toPublicPolicyDocument(doc) });
    } catch (error) {
      logger.error('[ServiceLegal Public] policy error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '정책 문서 조회 실패' } });
    }
  });

  return router;
}
