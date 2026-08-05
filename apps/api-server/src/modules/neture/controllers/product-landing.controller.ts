/**
 * ProductLanding Controllers — 제품 Landing(대표 QR 진입점)
 *
 * WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1 / Phase 2
 *
 * public : GET  /api/v1/public/product-landings/:publicKey   — 로그인 게이트 read model
 *          (WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1 / Baseline V3-AMENDMENT · ADR-0002)
 *          고정 URL·기본 QR 은 유지하되 설명서 본문은 O4O 로그인 세션에만 응답. 비로그인은 authRequired shell.
 * admin  : POST /api/v1/admin/o4o-product-db/product-landings — { masterId } idempotent 단건 발급
 *          GET  /api/v1/admin/o4o-product-db/product-landings/by-master/:masterId — 발급 상태 조회
 *
 * 원칙: 대량 발급 아님(단건 idempotent). ProductMaster 무변경. QR 이미지 비저장.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole, optionalAuth } from '../../../middleware/auth.middleware.js';
import type { AuthRequest } from '../../../middleware/auth.middleware.js';
import { ProductLandingService } from '../services/product-landing.service.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

/**
 * 상품 Landing read (로그인 게이트). `optionalAuth` 로 세션이 있으면 req.user 설정, 없어도 통과.
 * 설명서 본문은 서버에서 로그인 세션(req.user)에만 응답한다(Baseline V3-AMENDMENT #8·#9 / ADR-0002).
 * 인증 응답은 개인화되므로 공개 캐시에 저장하지 않는다(§E cache 보호).
 */
export function createPublicProductLandingController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductLandingService(dataSource);

  router.get('/:publicKey', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      // WO-...-PRODUCT-QR-LANGUAGE-SELECTOR-REUSE-AND-ADAPT-V1: locale 별 본문(고객 언어 전환)
      const locale = typeof req.query.locale === 'string' ? req.query.locale.slice(0, 16) : undefined;
      const isAuthed = !!req.user; // optionalAuth 가 유효 세션에만 설정
      // 인증 여부와 무관하게 공개 shared cache 저장 금지(로그아웃 후 타 사용자 재사용 방지).
      res.setHeader('Cache-Control', 'no-store, private');
      res.setHeader('Vary', 'Authorization');
      const data = await service.getPublicLanding(req.params.publicKey, locale, isAuthed);
      if (!data) {
        res.status(404).json({ success: false, error: '존재하지 않는 제품 랜딩입니다', code: 'LANDING_NOT_FOUND' });
        return;
      }
      res.json({ success: true, data });
    } catch (err) {
      logger.error('[product-landing:public] failed:', err);
      res.status(500).json({ success: false, error: '제품 랜딩 조회에 실패했습니다', code: 'LANDING_PUBLIC_FAILED' });
    }
  });

  return router;
}

/** admin — 단건 idempotent 발급 + 발급 상태 조회. */
export function createAdminProductLandingController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductLandingService(dataSource);

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  router.get('/by-master/:masterId', async (req: Request, res: Response) => {
    try {
      const landing = await service.getByMaster(req.params.masterId);
      res.json({ success: true, data: landing });
    } catch (err) {
      logger.error('[product-landing:admin] by-master failed:', err);
      res.status(500).json({ success: false, error: '랜딩 조회에 실패했습니다', code: 'LANDING_BY_MASTER_FAILED' });
    }
  });

  // 제품 QR(SVG) + 공개 URL. Landing 없으면 idempotent 발급. QR 이미지 비저장(동적 생성).
  router.get('/by-master/:masterId/qr', async (req: Request, res: Response) => {
    try {
      const size = Math.min(Math.max(parseInt(String(req.query.size ?? '320'), 10) || 320, 96), 1024);
      const data = await service.getLandingQr(req.params.masterId, size);
      res.json({ success: true, data });
    } catch (err: any) {
      if (String(err?.message) === 'MASTER_NOT_FOUND') {
        res.status(404).json({ success: false, error: '존재하지 않는 기본상품입니다', code: 'MASTER_NOT_FOUND' });
        return;
      }
      logger.error('[product-landing:admin] qr failed:', err);
      res.status(500).json({ success: false, error: 'QR 생성에 실패했습니다', code: 'LANDING_QR_FAILED' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const masterId = (req.body?.masterId ?? '').trim();
      if (!masterId) {
        res.status(400).json({ success: false, error: 'masterId 가 필요합니다', code: 'MASTER_ID_REQUIRED' });
        return;
      }
      const { landing, created } = await service.mintForMaster(masterId, 'admin');
      res.json({ success: true, data: { landing, created } });
    } catch (err: any) {
      if (String(err?.message) === 'MASTER_NOT_FOUND') {
        res.status(404).json({ success: false, error: '존재하지 않는 기본상품입니다', code: 'MASTER_NOT_FOUND' });
        return;
      }
      logger.error('[product-landing:admin] mint failed:', err);
      res.status(500).json({ success: false, error: '랜딩 발급에 실패했습니다', code: 'LANDING_MINT_FAILED' });
    }
  });

  return router;
}
