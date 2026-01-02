/**
 * K-Shopping Entities
 *
 * 🔒 FROZEN (H1-0): 이 엔티티들은 동결 상태입니다.
 *
 * ## 유지 대상 엔티티 (고정)
 * - KShoppingApplication: 여행자 서비스 참여 신청
 * - KShoppingParticipant: 승인된 참여자 정보
 *
 * ## 확장 금지 사항
 * - 신규 엔티티 추가 ❌
 * - 기존 엔티티에 Cosmetics FK 추가 ❌
 * - ServiceType/ParticipantType 확장 ❌
 *
 * ## 허용되는 참조 방식
 * - cosmetics_products.id → UUID 문자열 참조만 허용
 * - cosmetics_brands.id → UUID 문자열 참조만 허용
 * - FK 제약 설정 금지 (도메인 간 결합 방지)
 *
 * @frozen H1-0 (2025-01-02)
 */

export * from './kshopping-application.entity.js';
export * from './kshopping-participant.entity.js';
