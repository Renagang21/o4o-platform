/**
 * Tourism Module Index
 *
 * Phase 5-C: Tourism 서비스 최초 구현
 *
 * ## O4O 표준 매장 패턴
 *
 * Tourism은 "두 번째 표준 매장"으로서 이후 모든 매장형 서비스의
 * 참조 구현(reference implementation) 역할을 합니다.
 *
 * ## 핵심 원칙
 *
 * 1. **콘텐츠 중심**
 *    - 관광지, 패키지 정보 관리
 *    - Dropshipping 상품 참조 (소유 아님)
 *
 * 2. **주문 위임**
 *    - Tourism 자체 주문 테이블 없음
 *    - E-commerce Core로 위임
 *    - OrderType: TOURISM
 *
 * 3. **Dropshipping 연계**
 *    - 상품을 소유하지 않음
 *    - dropshipping_product_masters 참조만
 *    - 가격/재고/출고 책임은 Dropshipping/Core
 *
 * ## 금지 사항
 *
 * - ❌ tourism_orders 테이블 생성
 * - ❌ Tourism 결제 API
 * - ❌ checkoutService 미사용 주문 생성
 * - ❌ orderType 누락
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see CLAUDE.md §19 - Tourism Domain Rules (Phase 5-C 추가)
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
 *
 * @since Phase 5-C (2026-01-11)
 */

// Routes
export { createTourismRoutes } from './tourism.routes.js';

// Entities
export * from './entities/index.js';

// Controllers
export { createTourismOrderController } from './controllers/tourism-order.controller.js';
