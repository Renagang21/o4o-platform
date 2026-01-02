/**
 * Cosmetics Module Index
 *
 * Phase 7-A-1: Cosmetics API Implementation
 *
 * ============================================================================
 * 📦 DOMAIN STATUS: CORE CATALOG (H1-0)
 * ============================================================================
 *
 * Cosmetics 도메인은 화장품 상품/브랜드/가격의 **단일 Source of Truth**입니다.
 *
 * ## 책임 범위 (Core Responsibility)
 * ✅ 상품 (Products) - 화장품 상품 정보
 * ✅ 브랜드 (Brands) - 브랜드 정보
 * ✅ 라인 (Lines) - 제품 라인 정보
 * ✅ 가격 정책 (Price Policies) - 가격/할인 정책
 * ✅ 감사 로그 (Audit Logs) - 변경 이력
 *
 * ## 책임 외 영역 (NOT Responsible For)
 * ❌ 여행자 신청 UX - K-Shopping 또는 향후 채널이 담당
 * ❌ 가이드 판매 로직 - 외부 Sub-Domain이 담당
 * ❌ 세금 환급 흐름 - 외부 Sub-Domain이 담당
 * ❌ 채널별 주문 방식 - 향후 H1-1에서 설계
 *
 * ## 공유 가능 데이터 (Shareable with Sub-Domains)
 * - cosmetics_products (상품)
 * - cosmetics_brands (브랜드)
 * - cosmetics_lines (라인)
 * - cosmetics_price_policies (가격)
 *
 * ## Sub-Domain 연결 원칙
 * - K-Shopping, 향후 Travel Channel 등은 이 데이터를 **참조**할 수 있음
 * - 직접 FK 설정 금지 (UUID 참조만 허용)
 * - Cosmetics 스키마 변경이 Sub-Domain에 영향 주지 않아야 함
 *
 * @see docs/plan/active/H0-k-cosmetics-investigation-report.md
 * @core H1-0 (2025-01-02)
 */

// Entities
export * from './entities/index.js';

// DTOs
export * from './dto/index.js';

// Repositories
export * from './repositories/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Routes
export { createCosmeticsRoutes, default } from './cosmetics.routes.js';
