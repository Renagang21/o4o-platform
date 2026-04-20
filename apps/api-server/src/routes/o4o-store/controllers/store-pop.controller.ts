/**
 * Store POP Controller
 *
 * WO-O4O-QR-POP-AUTO-GENERATOR-V1
 * WO-STORE-POP-DIRECT-SOURCE-V1
 *
 * Library 콘텐츠 + QR 코드를 조합하여 POP PDF 자동 생성.
 * 공급자 공개 자료(supplierItemIds)를 StoreLibraryItem 복사 없이 직접 참조 지원.
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   POST /pharmacy/pop/generate       — POP PDF 생성
 *   GET  /pharmacy/pop/source/supplier-items — 공급자 공개 자료 조회
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource, In } from 'typeorm';
import { StoreLibraryItem } from '../../platform/entities/store-library-item.entity.js';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { NetureSupplierLibraryItem } from '../../../modules/neture/entities/NetureSupplierLibraryItem.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import { generatePopPdf } from '../../../services/pop-generator.service.js';
import type { PopGenerateInput } from '../../../services/pop-generator.service.js';

type AuthMiddleware = RequestHandler;

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'o4o.kr';

// 이미지로 사용 가능한 MIME 타입
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml', 'image/bmp',
]);

export function createStorePopController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const libraryRepo = dataSource.getRepository(StoreLibraryItem);
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const supplierLibraryRepo = dataSource.getRepository(NetureSupplierLibraryItem);
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /pharmacy/pop/source/supplier-items — 공급자 공개 자료 목록 ──
  router.get(
    '/pharmacy/pop/source/supplier-items',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (_req: Request, res: Response) => {
      const items = await supplierLibraryRepo.find({
        where: { isPublic: true },
        order: { createdAt: 'DESC' },
        take: 100,
      });

      res.json({
        success: true,
        data: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          fileUrl: item.fileUrl,
          mimeType: item.mimeType,
          category: item.category,
          supplierId: item.supplierId,
        })),
      });
    }),
  );

  // ─── POST /pharmacy/pop/generate — POP PDF 생성 ──────────────
  router.post(
    '/pharmacy/pop/generate',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { libraryItemIds, supplierItemIds, qrId, layout } = req.body;

      const hasLibraryItems = Array.isArray(libraryItemIds) && libraryItemIds.length > 0;
      const hasSupplierItems = Array.isArray(supplierItemIds) && supplierItemIds.length > 0;

      // 최소 1개 소스 필요
      if (!hasLibraryItems && !hasSupplierItems) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'libraryItemIds 또는 supplierItemIds 중 하나 이상 필요합니다.',
          },
        });
        return;
      }

      // 총 아이템 수 제한
      const totalCount = (libraryItemIds?.length ?? 0) + (supplierItemIds?.length ?? 0);
      if (totalCount > 8) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'POP 아이템은 최대 8개입니다.' },
        });
        return;
      }

      const validLayout = layout === 'A5' ? 'A5' : 'A4';
      const popItems: PopGenerateInput[] = [];

      // ── 매장 Library items 조회 (organizationId boundary) ────
      if (hasLibraryItems) {
        const libraryItems = await libraryRepo.find({
          where: { id: In(libraryItemIds), organizationId, isActive: true },
        });
        for (const item of libraryItems) {
          popItems.push({
            title: item.title,
            description: item.description || null,
            imageUrl: item.fileUrl || null,
            qrUrl: null,
            qrLabel: null,
            layout: validLayout as 'A4' | 'A5',
          });
        }
      }

      // ── 공급자 공개 자료 직접 참조 (is_public = true만 허용) ─
      if (hasSupplierItems) {
        const supplierItems = await supplierLibraryRepo.find({
          where: { id: In(supplierItemIds), isPublic: true },
        });
        for (const item of supplierItems) {
          // 이미지 MIME 타입만 imageUrl로 사용, 비이미지는 null (제목+설명만 표시)
          const imageUrl = IMAGE_MIME_TYPES.has(item.mimeType) ? item.fileUrl : null;
          popItems.push({
            title: item.title,
            description: item.description || null,
            imageUrl,
            qrUrl: null,
            qrLabel: null,
            layout: validLayout as 'A4' | 'A5',
          });
        }
      }

      if (popItems.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'ITEMS_NOT_FOUND', message: '유효한 자료를 찾을 수 없습니다.' },
        });
        return;
      }

      // QR 코드 조회 (선택사항) — 모든 아이템에 동일 QR 적용
      let qrUrl: string | null = null;
      if (qrId) {
        const qr = await qrRepo.findOne({ where: { id: qrId, organizationId } });
        if (qr) {
          qrUrl = `https://${PUBLIC_DOMAIN}/qr/${qr.slug}`;
        }
      }
      if (qrUrl) {
        for (const item of popItems) {
          item.qrUrl = qrUrl;
          item.qrLabel = 'QR 스캔';
        }
      }

      const pdfBuffer = await generatePopPdf(popItems);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="pop-print.pdf"');
      res.send(pdfBuffer);
    }),
  );

  return router;
}
