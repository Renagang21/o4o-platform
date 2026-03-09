import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { ProductAiTaggingService } from '../services/product-ai-tagging.service.js';
import type { ProductTagInput } from '../services/product-ai-tagging.service.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

/**
 * Product AI Tag Controller — WO-O4O-PRODUCT-AI-TAGGING-V1
 *
 * GET    /:productId/ai-tags              — 상품 AI/수동 태그 조회
 * POST   /:productId/ai-tags/regenerate   — AI 태그 재생성 (fire-and-forget)
 * POST   /:productId/ai-tags/manual       — 수동 태그 추가
 * DELETE /:productId/ai-tags/:tagId       — 태그 삭제
 */
export function createProductAiTagRouter(dataSource: DataSource): Router {
  const router = Router();
  const taggingService = new ProductAiTaggingService(dataSource);

  // GET /:productId/ai-tags — 태그 조회
  router.get('/:productId/ai-tags', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const result = await taggingService.getTagsByProduct(productId);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[ProductAiTag] tag retrieval error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve product AI tags' });
    }
  });

  // POST /:productId/ai-tags/regenerate — AI 태그 재생성
  router.post('/:productId/ai-tags/regenerate', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;

      // ProductMaster 조회
      const product = await loadProductTagInput(dataSource, productId);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // Fire-and-forget: AI 태그 생성 → 완료 후 AI 콘텐츠 생성 트리거
      taggingService.generateTags(product).then(() => {
        // WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1: 태그 생성 완료 → AI 콘텐츠 생성
        import('../services/product-ai-content.service.js').then(({ ProductAiContentService }) => {
          const contentService = new ProductAiContentService(dataSource);
          return loadProductContentInput(dataSource, productId).then((contentInput) => {
            if (contentInput) contentService.generateAllContents(contentInput).catch(() => {});
          });
        }).catch(() => {});
      }).catch(() => {});

      res.json({ success: true, message: 'Tag generation started' });
    } catch (error) {
      console.error('[ProductAiTag] regenerate error:', error);
      res.status(500).json({ success: false, error: 'Failed to start tag generation' });
    }
  });

  // POST /:productId/ai-tags/manual — 수동 태그 추가
  router.post('/:productId/ai-tags/manual', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const { tag } = req.body;

      if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Tag is required' });
        return;
      }

      const saved = await taggingService.addManualTag(productId, tag.trim());
      res.json({ success: true, data: saved });
    } catch (error) {
      console.error('[ProductAiTag] manual tag error:', error);
      res.status(500).json({ success: false, error: 'Failed to add manual tag' });
    }
  });

  // DELETE /:productId/ai-tags/:tagId — 태그 삭제
  router.delete('/:productId/ai-tags/:tagId', authenticate, async (req, res) => {
    try {
      const { productId, tagId } = req.params;
      await taggingService.deleteTag(tagId, productId);
      res.json({ success: true, message: 'Tag deleted' });
    } catch (error) {
      console.error('[ProductAiTag] delete error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete tag' });
    }
  });

  return router;
}

/**
 * ProductMaster + Category + Brand 정보를 태그 생성용으로 조회.
 */
async function loadProductTagInput(
  dataSource: DataSource,
  productId: string,
): Promise<ProductTagInput | null> {
  try {
    const rows = await dataSource.query(
      `SELECT
         pm.id,
         pm.regulatory_name AS "regulatoryName",
         pm.marketing_name AS "marketingName",
         pm.specification,
         pm.manufacturer_name AS "manufacturerName",
         pc.name AS "categoryName",
         b.name AS "brandName"
       FROM product_masters pm
       LEFT JOIN product_categories pc ON pc.id = pm.category_id
       LEFT JOIN brands b ON b.id = pm.brand_id
       WHERE pm.id = $1`,
      [productId],
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: r.id,
      regulatoryName: r.regulatoryName,
      marketingName: r.marketingName,
      specification: r.specification,
      categoryName: r.categoryName,
      brandName: r.brandName,
      manufacturerName: r.manufacturerName,
    };
  } catch {
    return null;
  }
}

/**
 * ProductMaster + Tags + OCR 정보를 콘텐츠 생성용으로 조회.
 * WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 */
async function loadProductContentInput(
  dataSource: DataSource,
  productId: string,
): Promise<{ id: string; regulatoryName: string; marketingName: string; specification?: string | null; categoryName?: string | null; brandName?: string | null; manufacturerName: string; tags?: string[]; ocrText?: string | null } | null> {
  try {
    const rows = await dataSource.query(
      `SELECT
         pm.id,
         pm.regulatory_name AS "regulatoryName",
         pm.marketing_name AS "marketingName",
         pm.specification,
         pm.manufacturer_name AS "manufacturerName",
         pm.tags,
         pc.name AS "categoryName",
         b.name AS "brandName"
       FROM product_masters pm
       LEFT JOIN product_categories pc ON pc.id = pm.category_id
       LEFT JOIN brands b ON b.id = pm.brand_id
       WHERE pm.id = $1`,
      [productId],
    );
    if (rows.length === 0) return null;
    const r = rows[0];

    let ocrText: string | null = null;
    try {
      const ocrRows = await dataSource.query(
        `SELECT ocr_text FROM product_ocr_texts WHERE product_id = $1 ORDER BY created_at ASC`,
        [productId],
      );
      const combined = ocrRows
        .filter((o: any) => o.ocr_text && o.ocr_text.trim().length > 0)
        .map((o: any) => o.ocr_text.trim())
        .join('\n');
      if (combined.length > 0) ocrText = combined;
    } catch {
      // OCR table may not exist yet
    }

    return {
      id: r.id,
      regulatoryName: r.regulatoryName,
      marketingName: r.marketingName,
      specification: r.specification,
      categoryName: r.categoryName,
      brandName: r.brandName,
      manufacturerName: r.manufacturerName,
      tags: Array.isArray(r.tags) ? r.tags : [],
      ocrText,
    };
  } catch {
    return null;
  }
}
