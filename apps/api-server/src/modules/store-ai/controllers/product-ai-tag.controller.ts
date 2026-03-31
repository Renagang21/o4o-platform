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

  // POST /:productId/ai-tags/suggest — AI 태그 추천 (non-destructive, WO-NETURE-SUPPLIER-TAG-AI-B2C-ALIGNMENT-V1)
  // WO-NETURE-AI-TAG-EDITING-OVERRIDE-INPUT-V1: optional override payload 지원
  router.post('/:productId/ai-tags/suggest', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;

      const product = await loadProductTagInput(dataSource, productId);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // WO-NETURE-AI-TAG-EDITING-OVERRIDE-INPUT-V1: override 병합 (편집 중 값 우선)
      const overrides = req.body?.overrides;
      if (overrides && typeof overrides === 'object') {
        const stripHtml = (v: unknown) =>
          typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim() || null : null;

        if (overrides.consumerShortDescription !== undefined)
          product.consumerShortDescription = stripHtml(overrides.consumerShortDescription);
        if (overrides.consumerDetailDescription !== undefined)
          product.consumerDetailDescription = stripHtml(overrides.consumerDetailDescription);
        if (overrides.businessShortDescription !== undefined)
          product.businessShortDescription = stripHtml(overrides.businessShortDescription);
        if (overrides.businessDetailDescription !== undefined)
          product.businessDetailDescription = stripHtml(overrides.businessDetailDescription);
      }

      // WO-NETURE-B2C-B2B-TAG-RECOMMENDATION-STRATEGY-V1: purpose 분기
      const purpose = req.body?.purpose === 'b2b' ? 'b2b' as const : 'b2c' as const;
      const suggestions = await taggingService.suggestTags(product, purpose);
      res.json({ success: true, data: { suggestions } });
    } catch (error) {
      console.error('[ProductAiTag] suggest error:', error);
      res.status(500).json({ success: false, error: 'Failed to suggest tags' });
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

  // POST /:productId/ai-tags/manual/batch — V2: 수동 태그 일괄 추가
  router.post('/:productId/ai-tags/manual/batch', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const { tags } = req.body;

      if (!Array.isArray(tags) || tags.length === 0) {
        res.status(400).json({ success: false, error: 'Tags array is required' });
        return;
      }

      const trimmed = tags
        .filter((t: unknown) => typeof t === 'string' && (t as string).trim().length > 0)
        .map((t: string) => t.trim())
        .slice(0, 20);

      if (trimmed.length === 0) {
        res.status(400).json({ success: false, error: 'No valid tags provided' });
        return;
      }

      const saved = await taggingService.addManualTagsBatch(productId, trimmed);
      res.json({ success: true, data: { added: saved.length, tags: saved } });
    } catch (error) {
      console.error('[ProductAiTag] batch manual tag error:', error);
      res.status(500).json({ success: false, error: 'Failed to add batch tags' });
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
 * ProductMaster + Category + Brand + B2C description + existing tags 정보를 태그 생성용으로 조회.
 * WO-NETURE-SUPPLIER-TAG-AI-B2C-ALIGNMENT-V1: B2C 소비자 설명 추가
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
         pm.regulatory_type AS "regulatoryType",
         pm.tags AS "existingTags",
         pc.name AS "categoryName",
         b.name AS "brandName",
         spo.consumer_detail_description AS "consumerDetailDescription",
         spo.consumer_short_description AS "consumerShortDescription",
         spo.business_detail_description AS "businessDetailDescription",
         spo.business_short_description AS "businessShortDescription"
       FROM product_masters pm
       LEFT JOIN product_categories pc ON pc.id = pm.category_id
       LEFT JOIN brands b ON b.id = pm.brand_id
       LEFT JOIN supplier_product_offers spo ON spo.master_id = pm.id
       WHERE pm.id = $1
       LIMIT 1`,
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
      regulatoryType: r.regulatoryType || null,
      consumerDetailDescription: r.consumerDetailDescription
        ? r.consumerDetailDescription.replace(/<[^>]*>/g, '').trim()
        : null,
      consumerShortDescription: r.consumerShortDescription
        ? r.consumerShortDescription.replace(/<[^>]*>/g, '').trim()
        : null,
      businessDetailDescription: r.businessDetailDescription
        ? r.businessDetailDescription.replace(/<[^>]*>/g, '').trim()
        : null,
      businessShortDescription: r.businessShortDescription
        ? r.businessShortDescription.replace(/<[^>]*>/g, '').trim()
        : null,
      existingTags: Array.isArray(r.existingTags) ? r.existingTags : [],
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
