/**
 * Tourism Entities Index
 *
 * Phase 5-C: Tourism 서비스 최초 구현
 *
 * ## Core Entities
 * - TourismDestination: 관광지/테마 정보
 * - TourismPackage: 관광 패키지
 * - TourismPackageItem: 패키지 구성 아이템 (Dropshipping 참조)
 *
 * ## 중요: 주문 엔티티 없음 (E-commerce Core 위임)
 *
 * Tourism은 O4O 표준 매장 패턴을 따릅니다:
 * - 콘텐츠/패키지 관리만 담당
 * - 주문/결제는 E-commerce Core 통해 처리
 * - OrderType: TOURISM
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @see docs/_platform/E-COMMERCE-ORDER-CONTRACT.md
 *
 * @since Phase 5-C (2026-01-11)
 */

export * from './tourism-destination.entity.js';
export * from './tourism-package.entity.js';
export * from './tourism-package-item.entity.js';

// ⚠️ tourism_orders Entity 없음 - E-commerce Core 사용
// 모든 주문은 checkout_orders (orderType: TOURISM) 에 저장됨
