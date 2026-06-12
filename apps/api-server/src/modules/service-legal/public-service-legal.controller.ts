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
 *
 * 정책:
 *   - is_active 법정정보 / published 정책 문서만 반환.
 *   - 값 없는 필드는 null (준비중/미정 등 placeholder 생성 금지).
 *   - 내부/audit 필드(updated_by 등) 미노출.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { ServiceLegalProfile } from './entities/ServiceLegalProfile.entity.js';
import { ServicePolicyDocument } from './entities/ServicePolicyDocument.entity.js';
import { toPublicLegalProfile, toPublicPolicyDocument } from './service-legal.mapper.js';
import { isSupportedLegalServiceKey } from './service-legal-scope.js';
import logger from '../../utils/logger.js';

export function createPublicServiceLegalController(dataSource: DataSource): Router {
  const router = Router();
  const profileRepo = dataSource.getRepository(ServiceLegalProfile);
  const policyRepo = dataSource.getRepository(ServicePolicyDocument);

  function guardServiceKey(req: Request, res: Response): string | null {
    const { serviceKey } = req.params;
    if (!serviceKey || !isSupportedLegalServiceKey(serviceKey)) {
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

  // ── GET /:serviceKey/policies/:documentType (최신 published) ──
  router.get('/:serviceKey/policies/:documentType', async (req: Request, res: Response) => {
    const serviceKey = guardServiceKey(req, res);
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
