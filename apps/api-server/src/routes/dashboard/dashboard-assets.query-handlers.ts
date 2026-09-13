/**
 * Dashboard Assets — 보존된 signal 핸들러 2개
 *
 * WO-O4O-CMS-LEGACY-MEDIA-ASSET-TO-MEDIA-V2-CANONICALIZATION-FINAL-CLOSURE-V1 (중지 조건 해소 단계):
 *   cms_media 기반 "내 자료함" 축(list · copied-source-ids · kpi · copy · edit · publish · archive · delete)은
 *   제거됐다. cms_media 테이블은 운영에 존재한 적이 없어(생성 주체 = 호출되지 않는 cms-core lifecycle)
 *   조회는 `does not exist` 를 삼켜 빈 목록을, 쓰기는 500 을 냈다. 미디어 정본은
 *   media_assets + media_entity_links · /api/v1/platform/media-library* 이며 이 축을 그리로 치환하지 않는다.
 *
 *   남긴 것은 product_approvals 기반 행동 신호 2개뿐이다. 경로(/api/v1/dashboard/assets/*-signal)는
 *   배포된 web-neture 번들이 호출하므로 바꾸지 않는다.
 */

import { Response } from 'express';
import type { DataSource } from 'typeorm';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

/**
 * GET /api/v1/dashboard/assets/supplier-signal
 *
 * 판매자 행동 신호: 승인된 공급자 파트너십 존재 여부
 */
export function createGetSupplierSignalHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.json({ success: true, hasApprovedSupplier: false });
        return;
      }

      let hasApprovedSupplier = false;
      try {
        const rows = await dataSource.query(
          `SELECT EXISTS(
            SELECT 1 FROM product_approvals
            WHERE organization_id = $1
              AND approval_type = 'private'
              AND approval_status = 'approved'
            LIMIT 1
          ) AS "exists"`,
          [user.id],
        );
        hasApprovedSupplier = rows[0]?.exists === true;
      } catch {
        // Table may not exist — silent fallback
      }

      res.json({ success: true, hasApprovedSupplier });
    } catch {
      res.json({ success: true, hasApprovedSupplier: false });
    }
  };
}

/**
 * GET /api/v1/dashboard/assets/seller-signal
 *
 * 공급자 행동 신호: 승인된 판매자 파트너십 존재 여부
 */
export function createGetSellerSignalHandler(dataSource: DataSource) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.json({ success: true, hasApprovedSeller: false });
        return;
      }

      let hasApprovedSeller = false;
      try {
        const rows = await dataSource.query(
          `SELECT EXISTS(
            SELECT 1 FROM product_approvals pa
            JOIN supplier_product_offers spo ON spo.id = pa.offer_id
            WHERE spo.supplier_id = $1
              AND pa.approval_type = 'private'
              AND pa.approval_status = 'approved'
            LIMIT 1
          ) AS "exists"`,
          [user.id],
        );
        hasApprovedSeller = rows[0]?.exists === true;
      } catch {
        // Table may not exist — silent fallback
      }

      res.json({ success: true, hasApprovedSeller });
    } catch {
      res.json({ success: true, hasApprovedSeller: false });
    }
  };
}
