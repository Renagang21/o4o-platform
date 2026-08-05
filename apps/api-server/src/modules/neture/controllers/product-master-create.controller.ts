/**
 * ProductMaster Create Controller — 관리자 수동 상품 등록 (admin)
 *
 * WO-O4O-ADMIN-PRODUCT-MASTER-MANUAL-REGISTRATION-UI-V1
 *
 * mount: /api/v1/admin/o4o-product-db/masters
 *   POST /   — 신규 ProductMaster 등록 (바코드 선택 — 없으면 O4O 자체 내부코드 자동 생성)
 *
 * 등록은 netureService.resolveOrCreateMaster(barcode|null, manualData) 경유 — barcode-optional
 * (WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1). 이름+제조사 dedup 내장.
 * 확장 필드(규격/원산지/태그/카테고리/브랜드)는 updateProductMaster로 이어서 반영.
 * 권한: 상품 DB 콘솔과 동일 ADMIN 롤셋(note/audit-log 컨트롤러와 동일).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { NetureService } from '../neture.service.js';
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

/** 문자열 정규화 — 빈 값이면 undefined */
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export function createProductMasterCreateController(_dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  // POST / — 신규 상품 등록 (barcode 선택)
  router.post('/', async (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as Record<string, unknown>;
      const name = str(b.name);
      if (!name) {
        res.status(400).json({ success: false, error: '상품명을 입력하세요', code: 'NAME_REQUIRED' });
        return;
      }

      const result = await netureService.resolveOrCreateMaster(str(b.barcode) ?? null, {
        name,
        manufacturerName: str(b.manufacturerName),
        regulatoryType: str(b.regulatoryType),
        regulatoryName: str(b.regulatoryName),
        mfdsPermitNumber: str(b.mfdsPermitNumber) ?? null,
        drugCategory: str(b.drugCategory) ?? null,
      });

      if (!result.success || !result.data) {
        const code = result.error || 'MASTER_CREATE_FAILED';
        res.status(400).json({ success: false, error: code, code });
        return;
      }

      // 확장 필드 반영 (제공된 항목만) — immutable 필드는 서비스가 차단
      const ext: Record<string, unknown> = {};
      const specification = str(b.specification);
      const originCountry = str(b.originCountry);
      const categoryId = str(b.categoryId);
      const brandId = str(b.brandId);
      if (specification !== undefined) ext.specification = specification;
      if (originCountry !== undefined) ext.originCountry = originCountry;
      if (categoryId !== undefined) ext.categoryId = categoryId;
      if (brandId !== undefined) ext.brandId = brandId;
      if (Array.isArray(b.tags)) {
        const tags = (b.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean);
        if (tags.length) ext.tags = tags;
      }

      let master = result.data;
      if (Object.keys(ext).length > 0) {
        const updated = await netureService.updateProductMaster(master.id, ext);
        if (updated?.success && updated.data) master = updated.data;
      }

      res.status(201).json({ success: true, data: master });
    } catch (err) {
      logger.error('[product-master-create] create failed:', err);
      res.status(500).json({ success: false, error: '상품 등록에 실패했습니다', code: 'MASTER_CREATE_FAILED' });
    }
  });

  return router;
}
