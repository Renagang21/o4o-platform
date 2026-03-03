/**
 * Store QR Print Controller
 *
 * WO-O4O-QR-PRINT-MODULE-V1
 *
 * 매장 운영자용 QR 인쇄 PDF 엔드포인트.
 *
 * GET /store/qr/product/:offerId/print  — 상품 QR PDF
 * GET /store/qr/event/:eventId/print    — 이벤트 QR PDF
 * POST /store/qr/batch/print            — 다건 QR PDF (최대 24개)
 *
 * 인증: requireAuth + store owner 체크
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import { generateQrPrintPdf } from '../../../services/qr-print.service.js';
import type { QrPrintItem } from '../../../services/qr-print.service.js';

type AuthMiddleware = RequestHandler;

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'o4o.kr';

async function getStoreSlug(dataSource: DataSource, organizationId: string): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT slug FROM platform_store_slugs
     WHERE store_id = $1 AND is_active = true
     ORDER BY created_at DESC LIMIT 1`,
    [organizationId],
  );
  return rows[0]?.slug || null;
}

export function createStoreQrController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /store/qr/product/:offerId/print — 상품 QR PDF ────────
  router.get(
    '/store/qr/product/:offerId/print',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { offerId } = req.params;

      // Verify listing exists for this org
      const listings = await dataSource.query(
        `SELECT opl.id, pm.marketing_name AS name
         FROM organization_product_listings opl
         JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         JOIN product_masters pm ON pm.id = spo.master_id
         WHERE opl.offer_id = $1 AND opl.organization_id = $2
         LIMIT 1`,
        [offerId, organizationId],
      );

      if (listings.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'LISTING_NOT_FOUND', message: 'Product listing not found for this store' },
        });
        return;
      }

      const slug = await getStoreSlug(dataSource, organizationId);
      if (!slug) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_SLUG_NOT_FOUND', message: 'Store slug not configured' },
        });
        return;
      }

      const productName = listings[0].name || 'Product';
      const url = `https://${PUBLIC_DOMAIN}/store/${slug}/products/${offerId}`;

      const pdfBuffer = await generateQrPrintPdf([
        { url, title: productName },
      ]);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="qr-product-${offerId.slice(0, 8)}.pdf"`);
      res.send(pdfBuffer);
    }),
  );

  // ─── GET /store/qr/event/:eventId/print — 이벤트 QR PDF ────────
  router.get(
    '/store/qr/event/:eventId/print',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { eventId } = req.params;

      // Verify event exists for this org
      const events = await dataSource.query(
        `SELECT id, title FROM store_events
         WHERE id = $1 AND organization_id = $2
         LIMIT 1`,
        [eventId, organizationId],
      );

      if (events.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: 'Event not found for this store' },
        });
        return;
      }

      const slug = await getStoreSlug(dataSource, organizationId);
      if (!slug) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_SLUG_NOT_FOUND', message: 'Store slug not configured' },
        });
        return;
      }

      const eventTitle = events[0].title || 'Event';
      const url = `https://${PUBLIC_DOMAIN}/store/${slug}/events/${eventId}`;

      const pdfBuffer = await generateQrPrintPdf([
        { url, title: eventTitle },
      ]);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="qr-event-${eventId.slice(0, 8)}.pdf"`);
      res.send(pdfBuffer);
    }),
  );

  // ─── POST /store/qr/batch/print — 다건 QR PDF (최대 24개) ──────
  router.post(
    '/store/qr/batch/print',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'items array is required' },
        });
        return;
      }

      if (items.length > 24) {
        res.status(400).json({
          success: false,
          error: { code: 'LIMIT_EXCEEDED', message: 'Maximum 24 items per batch' },
        });
        return;
      }

      const slug = await getStoreSlug(dataSource, organizationId);
      if (!slug) {
        res.status(404).json({
          success: false,
          error: { code: 'STORE_SLUG_NOT_FOUND', message: 'Store slug not configured' },
        });
        return;
      }

      const printItems: QrPrintItem[] = [];

      for (const item of items) {
        const { type, id: itemId, title } = item;
        let url: string;

        if (type === 'product') {
          url = `https://${PUBLIC_DOMAIN}/store/${slug}/products/${itemId}`;
        } else if (type === 'event') {
          url = `https://${PUBLIC_DOMAIN}/store/${slug}/events/${itemId}`;
        } else {
          continue;
        }

        printItems.push({
          url,
          title: title || itemId,
          subtitle: item.subtitle,
          price: item.price,
        });
      }

      if (printItems.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_VALID_ITEMS', message: 'No valid items to print' },
        });
        return;
      }

      const pdfBuffer = await generateQrPrintPdf(printItems);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="qr-batch-${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    }),
  );

  return router;
}
