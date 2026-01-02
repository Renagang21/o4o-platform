/**
 * K-Shopping Module
 *
 * K-Shopping (여행자 서비스) 참여 신청 및 운영 API
 *
 * ============================================================================
 * 🔒 DOMAIN STATUS: FROZEN (H1-0)
 * ============================================================================
 *
 * 본 도메인은 Cosmetics Core 도메인으로의 향후 통합을 위해 **동결 상태**입니다.
 *
 * ## 동결 범위 (Frozen Scope)
 * - 신규 기능 추가 ❌
 * - 서비스 타입(ServiceType) 확장 ❌
 * - 참여자 유형(ParticipantType) 확장 ❌
 * - 화면/UX 전제 코드 ❌
 *
 * ## 유지 대상 (Maintained Entities)
 * 1. KShoppingApplication - 참여 신청
 * 2. KShoppingParticipant - 승인된 참여자
 * 3. enabledServices - 승인된 서비스 목록
 *
 * ## 도메인 관계 (Domain Relationship)
 * - K-Shopping은 Cosmetics의 **Sub-Domain**입니다.
 * - Cosmetics Core (상품/브랜드/가격)를 "사용"하지만 "소유"하지 않습니다.
 * - Cosmetics 테이블과 직접 FK를 맺지 않습니다 (UUID 참조만 허용).
 *
 * ## 통합 시점 조건 (Integration Prerequisites)
 * - H1-1: 주문/결제 모델 설계 완료
 * - H1-2: 채널 타입(Local/Travel) 분기 설계 완료
 * - 위 조건이 충족되면 cosmetics_participants로 이전 가능
 *
 * @see docs/plan/active/H0-traveler-shopping-investigation-report.md
 * @see docs/plan/active/H0-k-cosmetics-investigation-report.md
 * @frozen H1-0 (2025-01-02)
 */

export * from './kshopping.routes.js';
export * from './entities/index.js';
export * from './controllers/index.js';
