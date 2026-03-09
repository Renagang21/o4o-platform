import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { generateProductPopPdf } from '../services/product-pop-pdf.service.js';
import type { PopPdfLayout, PopPdfInput } from '../services/product-pop-pdf.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

/**
 * Product POP PDF Controller — WO-O4O-POP-PDF-GENERATOR-V1
 *
 * GET /:productId/pop/:layout  — A4/A5/A6 POP PDF 다운로드
 *
 * Query params:
 *   ?copies=N  — 인쇄 매수 (default: layout에 따라 1/2/4)
 *   ?qrUrl=    — QR에 인코딩할 URL (선택)
 */

const VALID_LAYOUTS: PopPdfLayout[] = ['A4', 'A5', 'A6'];

export function createProductPopPdfRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/:productId/pop/:layout', authenticate, async (req, res) => {
    try {
      const { productId, layout: rawLayout } = req.params;
      const layout = rawLayout.toUpperCase() as PopPdfLayout;

      if (!VALID_LAYOUTS.includes(layout)) {
        res.status(400).json({
          success: false,
          error: `Invalid layout. Valid: ${VALID_LAYOUTS.join(', ')}`,
        });
        return;
      }

      // 1. Product Master 조회
      const productRows = await dataSource.query(
        `SELECT
           pm.id,
           pm.marketing_name AS "marketingName",
           pm.regulatory_name AS "regulatoryName"
         FROM product_masters pm
         WHERE pm.id = $1`,
        [productId],
      );

      if (productRows.length === 0) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      const product = productRows[0];
      const title = product.marketingName || product.regulatoryName;

      // 2. AI Content 조회 (pop_short, pop_long)
      let popShort: string | null = null;
      let popLong: string | null = null;

      try {
        const aiRows = await dataSource.query(
          `SELECT content_type, content
           FROM product_ai_contents
           WHERE product_id = $1
             AND content_type IN ('pop_short', 'pop_long')`,
          [productId],
        );
        for (const row of aiRows) {
          if (row.content_type === 'pop_short') popShort = row.content;
          if (row.content_type === 'pop_long') popLong = row.content;
        }
      } catch {
        // product_ai_contents table may not exist yet — graceful skip
      }

      // 3. Primary image 조회
      let imageUrl: string | null = null;
      try {
        const imgRows = await dataSource.query(
          `SELECT image_url
           FROM product_images
           WHERE master_id = $1 AND is_primary = true
           LIMIT 1`,
          [productId],
        );
        if (imgRows.length > 0) imageUrl = imgRows[0].image_url;
      } catch {
        // product_images table may not exist yet
      }

      // 4. QR URL (query param 또는 미포함)
      const qrUrl = typeof req.query.qrUrl === 'string' ? req.query.qrUrl : null;

      // 5. Copies
      const defaultCopies: Record<PopPdfLayout, number> = { A4: 1, A5: 2, A6: 4 };
      const copiesParam = parseInt(req.query.copies as string, 10);
      const copies = copiesParam > 0 ? Math.min(copiesParam, 20) : defaultCopies[layout];

      // 6. PDF 생성
      const input: PopPdfInput = {
        title,
        shortText: popShort,
        longText: popLong,
        imageUrl,
        qrUrl,
      };

      const pdfBuffer = await generateProductPopPdf(input, layout, copies);

      const filename = `pop-${layout.toLowerCase()}-${productId.slice(0, 8)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('[ProductPopPdf] generate error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate POP PDF' });
    }
  });

  return router;
}
