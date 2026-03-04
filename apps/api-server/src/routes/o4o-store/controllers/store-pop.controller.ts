/**
 * Store POP Controller
 *
 * WO-O4O-QR-POP-AUTO-GENERATOR-V1
 *
 * Library 콘텐츠 + QR 코드를 조합하여 POP PDF 자동 생성.
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   POST /pharmacy/pop/generate — POP PDF 생성
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource, In } from 'typeorm';
import { StoreLibraryItem } from '../../platform/entities/store-library-item.entity.js';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import { generatePopPdf } from '../../../services/pop-generator.service.js';
import type { PopGenerateInput } from '../../../services/pop-generator.service.js';

type AuthMiddleware = RequestHandler;

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'o4o.kr';

export function createStorePopController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const libraryRepo = dataSource.getRepository(StoreLibraryItem);
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── POST /pharmacy/pop/generate — POP PDF 생성 ──────────────
  router.post(
    '/pharmacy/pop/generate',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { libraryItemIds, qrId, layout } = req.body;

      // Validation
      if (!Array.isArray(libraryItemIds) || libraryItemIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'libraryItemIds array is required' },
        });
        return;
      }
      if (libraryItemIds.length > 8) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maximum 8 items per POP' },
        });
        return;
      }
      const validLayout = layout === 'A5' ? 'A5' : 'A4';

      // Library items 조회 (organizationId boundary)
      const libraryItems = await libraryRepo.find({
        where: {
          id: In(libraryItemIds),
          organizationId,
          isActive: true,
        },
      });

      if (libraryItems.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'ITEMS_NOT_FOUND', message: 'No matching library items found' },
        });
        return;
      }

      // QR 코드 조회 (선택사항)
      let qrUrl: string | null = null;
      if (qrId) {
        const qr = await qrRepo.findOne({ where: { id: qrId, organizationId } });
        if (qr) {
          qrUrl = `https://${PUBLIC_DOMAIN}/qr/${qr.slug}`;
        }
      }

      // PopGenerateInput 배열 구성
      const popItems: PopGenerateInput[] = libraryItems.map((item) => ({
        title: item.title,
        description: item.description || null,
        imageUrl: item.fileUrl || null,
        qrUrl,
        qrLabel: qrUrl ? 'QR 스캔' : null,
        layout: validLayout as 'A4' | 'A5',
      }));

      const pdfBuffer = await generatePopPdf(popItems);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="pop-print.pdf"');
      res.send(pdfBuffer);
    }),
  );

  return router;
}
