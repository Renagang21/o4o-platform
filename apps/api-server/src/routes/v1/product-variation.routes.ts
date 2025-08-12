import { Router } from 'express';
import { ProductVariationController } from '../../controllers/productVariationController';
import { authenticateToken } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router: Router = Router();
const controller = new ProductVariationController();

// 상품 속성 관리
router.post('/products/:productId/attributes', 
  authenticateToken,
  requireRole(['admin', 'vendor']),
  controller.addProductAttribute
);

// 상품 변형 생성
router.post('/products/:productId/variations',
  authenticateToken,
  requireRole(['admin', 'vendor']),
  controller.createProductVariation
);

// 변형 자동 생성
router.post('/products/:productId/variations/generate',
  authenticateToken,
  requireRole(['admin', 'vendor']),
  controller.generateVariations
);

// 상품 변형 목록 조회
router.get('/products/:productId/variations',
  controller.getProductVariations
);

// 변형 재고 업데이트
router.patch('/variations/:variationId/stock',
  authenticateToken,
  requireRole(['admin', 'vendor']),
  controller.updateVariationStock
);

// 변형 가격 일괄 업데이트
router.patch('/products/:productId/variations/prices',
  authenticateToken,
  requireRole(['admin', 'vendor']),
  controller.bulkUpdateVariationPrices
);

export default router;