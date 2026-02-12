# WO-S2S-ARCH-CONSOLIDATION-REVIEW-V1

> **작성일**: 2026-02-12
> **성격**: 구조 조사 보고서 (코드 수정 없음)
> **결론**: A. S2S 구조는 이미 안정

---

## 0. 구조 개요

S2S는 3개 독립 시스템이 공존:

| 시스템 | 패키지/모듈 | 엔티티 수 | 스키마 |
|--------|-----------|---------|--------|
| Dropshipping Core | `packages/dropshipping-core/` | 11 | `dropshipping_*` |
| Cosmetics Extension | `packages/cosmetics-*-extension/` | 9 | `cosmetics_*` |
| Neture Module | `apps/api-server/src/modules/neture/` | 11 | `neture_*` |
| Signage Seller Extension | `apps/api-server/src/routes/signage/extensions/seller/` | 4 | `signage_seller.*` |

총 엔티티: ~35개

---

## 평가 요약

| 축 | 등급 | 요약 |
|----|------|------|
| A. 엔티티 계층 | 안정 | 3시스템 독립, Cross-FK 제로 |
| B. 승인 흐름 | 안정 | 6개 State Machine 일관, 감사 로그 완비 |
| C. Role/Guard | 잠재 위험 | Seller 개념 혼재, DS 독자 권한 시스템 |
| D. Product Policy | 안정 | 독립 정책, 상호 간섭 없음 |
| E. Payment 경계 | 잠재 위험 | Neture 독자 주문 (E-commerce Core 외부) |
| F. Signage 연결 | 안정 | 완전 분리, Clone 패턴 |

---

## A. 엔티티 계층 - 안정

핵심 데이터 흐름:

```
[Dropshipping Core]
ProductMaster -> SupplierProductOffer -> SellerListing -> OrderRelay -> CommissionTransaction

[Neture Module]
NetureSupplier -> NetureSupplierProduct -> NetureSupplierRequest (audit: RequestEvent)
NeturePartnerRecruitment -> NeturePartnerApplication -> NeturePartnerDashboardItem
```

- FK 관계 명확, 방향 일관
- Cross-system FK 없음
- Soft reference (varchar ID) 패턴으로 서비스 간 느슨한 연결
- CASCADE 정책 적절 (부모->자식 방향만)

---

## B. 승인 흐름 - 안정

| 흐름 | 상태 수 | 중복 방지 | 감사 로그 | 소유권 검증 |
|------|---------|---------|---------|----------|
| Pricing Approval | 3 | O | metadata | 역할 기반 |
| Neture Supplier Request | 3 | O (supplier+seller+product) | Event 엔티티 | 소유권+Admin override |
| Partnership Request | 3 | X | timestamp | - |
| Partner Application | 3 | O (recruitment+partner) | timestamp | 소유권 |
| Catalog Item (DS) | 5 | O (external_product_ref) | OfferLog | 상태 규칙 |
| Seller Offer (DS) | 5 | O (seller+catalogItem) | OfferLog | Catalog 승인 게이트 |

---

## C. Role/Guard - 잠재 위험

현재 문제 아님. 확장 시 주의:

- Neture에 `seller` 역할 없음 (Supplier + Partner만)
- 프론트엔드: `seller` -> `user`로 매핑
- Dropshipping 독자 `ROLE_PERMISSIONS` (Platform RBAC와 별도)

조치: Seller 개념 통합 논의는 서비스 통합 시점에서 판단

---

## D. Product Policy - 안정

- Cosmetics: `PricePolicy` 엔티티 (scope 기반)
- Neture: `ProductPurpose` enum (CATALOG/APPLICATION/ACTIVE_SALES)
- Dropshipping: `SupplierCatalogItem` 상태 기계

각 시스템 자체 정책 구조. 상호 간섭 없음.

---

## E. Payment 경계 - 잠재 위험

현재 문제 아님. 확장 시 주의:

- Neture: `neture_orders` 독자 테이블 + Toss Payments
- E-commerce Core `checkoutService.createOrder()` 미사용
- Neture가 실거래 플랫폼으로 확장될 때 통합 판단 필요

---

## F. Signage 연결 - 안정

- Neture Supplier와 Signage Seller Extension 완전 분리
- FK 제로, 스키마 분리
- Clone 패턴 (Global -> Store 복제, 강제 아님)
- Media 전략 선언(v1)과 일치

---

## 결론

S2S 구조는 이미 안정.

- Core 재설계 불필요
- 즉시 수정 불필요
- 잠재 위험 항목은 확장 시점에서 판단
