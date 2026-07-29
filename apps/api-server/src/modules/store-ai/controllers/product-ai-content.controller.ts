import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { ProductAiContentService } from '../services/product-ai-content.service.js';
import type { ProductContentInput } from '../services/product-ai-content.service.js';
import type { ProductAiContentType } from '../entities/product-ai-content.entity.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import {
  resolveGlobalProductResourceAccess,
  productMasterExists,
} from '../utils/product-access.utils.js';

/**
 * Product AI Content Controller — IR-O4O-AI-CONTENT-ENGINE-IMPLEMENTATION-V1
 *
 * POST /:productId/ai-contents/generate          — 전체 content_type AI 콘텐츠 일괄 생성
 * POST /:productId/ai-contents/generate/:type     — 특정 content_type AI 콘텐츠 생성
 * PUT  /:productId/ai-contents/:type              — AI 콘텐츠 수동 저장 (upsert) — WO-O4O-AI-CONTENT-AUTO-CHANNEL-SAVE-V1
 * GET  /:productId/ai-contents                    — 상품 AI 콘텐츠 전체 조회
 * GET  /:productId/ai-contents/:type              — 특정 content_type 조회
 * DELETE /:productId/ai-contents/:contentId       — AI 콘텐츠 삭제
 *
 * WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1:
 *   :productId 는 product_masters.id **전용**이며, product_ai_contents 는 organization 소유가
 *   아닌 **전역(플랫폼 소유) 자원**이다.
 *
 *   접근 판정 = resolveGlobalProductResourceAccess (actor·관계 기준, service 기준 아님)
 *     write : platform:super_admin | 자기 offer master 보유 ACTIVE 공급자
 *     read  : 위 + active OPL(organization_id + master_id) 보유 매장
 *     매장 사용자의 쓰기는 금지한다 ({service}:operator/admin 도 역할만으로 허용되지 않는다).
 *
 *   §8.1 ID 계약: 신규 전역 행을 만드는 쓰기 경로는 master 미존재 시 404 PRODUCT_MASTER_NOT_FOUND.
 */

const VALID_CONTENT_TYPES: ProductAiContentType[] = [
  'product_description',
  'pop_short',
  'pop_long',
  'qr_description',
  'signage_text',
];

export function createProductAiContentRouter(dataSource: DataSource): Router {
  const router = Router();
  const contentService = new ProductAiContentService(dataSource);

  // POST /:productId/ai-contents/generate — 전체 콘텐츠 일괄 생성 (fire-and-forget)
  router.post('/:productId/ai-contents/generate', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.id as string;

      const { allowed } = await resolveGlobalProductResourceAccess(
        dataSource,
        productId,
        userId,
        'write',
      );
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Product access denied', code: 'PRODUCT_ACCESS_DENIED' });
        return;
      }

      const product = await loadProductContentInput(dataSource, productId);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // Fire-and-forget
      contentService.generateAllContents(product).catch(() => {});

      res.json({ success: true, message: 'Content generation started for all types' });
    } catch (error) {
      console.error('[ProductAiContent] generate all error:', error);
      res.status(500).json({ success: false, error: 'Failed to start content generation' });
    }
  });

  // POST /:productId/ai-contents/generate/:type — 특정 타입 콘텐츠 생성
  router.post('/:productId/ai-contents/generate/:type', authenticate, async (req, res) => {
    try {
      const { productId, type } = req.params;
      const userId = req.user?.id as string;

      if (!VALID_CONTENT_TYPES.includes(type as ProductAiContentType)) {
        res.status(400).json({
          success: false,
          error: `Invalid content type. Valid types: ${VALID_CONTENT_TYPES.join(', ')}`,
        });
        return;
      }

      const { allowed } = await resolveGlobalProductResourceAccess(
        dataSource,
        productId,
        userId,
        'write',
      );
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Product access denied', code: 'PRODUCT_ACCESS_DENIED' });
        return;
      }

      const product = await loadProductContentInput(dataSource, productId);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // Fire-and-forget
      contentService.generateContent(product, type as ProductAiContentType).catch(() => {});

      res.json({ success: true, message: `Content generation started for type: ${type}` });
    } catch (error) {
      console.error('[ProductAiContent] generate type error:', error);
      res.status(500).json({ success: false, error: 'Failed to start content generation' });
    }
  });

  // PUT /:productId/ai-contents/:type — 수동 저장 (upsert) — WO-O4O-AI-CONTENT-AUTO-CHANNEL-SAVE-V1
  router.put('/:productId/ai-contents/:type', authenticate, async (req, res) => {
    try {
      const { productId, type } = req.params;
      const userId = req.user?.id as string;

      if (!VALID_CONTENT_TYPES.includes(type as ProductAiContentType)) {
        res.status(400).json({
          success: false,
          error: `Invalid content type. Valid types: ${VALID_CONTENT_TYPES.join(', ')}`,
        });
        return;
      }

      const { allowed } = await resolveGlobalProductResourceAccess(
        dataSource,
        productId,
        userId,
        'write',
      );
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Product access denied', code: 'PRODUCT_ACCESS_DENIED' });
        return;
      }

      // WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1 §8.1:
      // productId 는 ProductMaster ID 전용. local product ID / 임의 UUID 로 전역 고아 행을 만들지 않는다.
      if (!(await productMasterExists(dataSource, productId))) {
        res.status(404).json({
          success: false,
          error: 'Product master not found',
          code: 'PRODUCT_MASTER_NOT_FOUND',
        });
        return;
      }

      const { content, model } = req.body as { content?: string; model?: string };
      if (!content || typeof content !== 'string') {
        res.status(400).json({ success: false, error: 'content is required' });
        return;
      }

      const saved = await contentService.saveContent(productId, type as ProductAiContentType, content, model);
      res.json({ success: true, data: saved });
    } catch (error) {
      console.error('[ProductAiContent] save error:', error);
      res.status(500).json({ success: false, error: 'Failed to save AI content' });
    }
  });

  // GET /:productId/ai-contents — 전체 조회
  router.get('/:productId/ai-contents', authenticate, async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.id as string;

      const { allowed } = await resolveGlobalProductResourceAccess(
        dataSource,
        productId,
        userId,
        'manage_read',
      );
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Product access denied', code: 'PRODUCT_ACCESS_DENIED' });
        return;
      }

      const contents = await contentService.getContentsByProduct(productId);
      res.json({ success: true, data: contents });
    } catch (error) {
      console.error('[ProductAiContent] get all error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve AI contents' });
    }
  });

  // GET /:productId/ai-contents/:type — 특정 타입 조회
  router.get('/:productId/ai-contents/:type', authenticate, async (req, res) => {
    try {
      const { productId, type } = req.params;
      const userId = req.user?.id as string;

      if (!VALID_CONTENT_TYPES.includes(type as ProductAiContentType)) {
        res.status(400).json({
          success: false,
          error: `Invalid content type. Valid types: ${VALID_CONTENT_TYPES.join(', ')}`,
        });
        return;
      }

      const { allowed } = await resolveGlobalProductResourceAccess(
        dataSource,
        productId,
        userId,
        'manage_read',
      );
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Product access denied', code: 'PRODUCT_ACCESS_DENIED' });
        return;
      }

      const content = await contentService.getContent(productId, type as ProductAiContentType);
      if (!content) {
        res.status(404).json({ success: false, error: 'Content not found' });
        return;
      }
      res.json({ success: true, data: content });
    } catch (error) {
      console.error('[ProductAiContent] get type error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve AI content' });
    }
  });

  // DELETE /:productId/ai-contents/:contentId — 삭제
  router.delete('/:productId/ai-contents/:contentId', authenticate, async (req, res) => {
    try {
      const { productId, contentId } = req.params;
      const userId = req.user?.id as string;

      const { allowed } = await resolveGlobalProductResourceAccess(
        dataSource,
        productId,
        userId,
        'write',
      );
      if (!allowed) {
        res.status(403).json({ success: false, error: 'Product access denied', code: 'PRODUCT_ACCESS_DENIED' });
        return;
      }

      await contentService.deleteContent(contentId, productId);
      res.json({ success: true, message: 'Content deleted' });
    } catch (error) {
      console.error('[ProductAiContent] delete error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete AI content' });
    }
  });

  return router;
}

/**
 * ProductMaster + Category + Brand + Tags 정보를 콘텐츠 생성용으로 조회.
 */
async function loadProductContentInput(
  dataSource: DataSource,
  productId: string,
): Promise<ProductContentInput | null> {
  try {
    const rows = await dataSource.query(
      `SELECT
         pm.id,
         pm.regulatory_name AS "regulatoryName",
         pm.name AS "marketingName",
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

    // OCR 텍스트 조회 (있으면 포함)
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
      // OCR table may not exist yet — graceful skip
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
