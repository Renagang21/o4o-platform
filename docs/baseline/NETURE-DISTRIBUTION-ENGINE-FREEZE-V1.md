# Neture Distribution Engine v1 — Freeze Declaration

> **Status:** Frozen (Beta-Operational)
> **Freeze Date:** 2026-02-27
> **Version:** v1.0

---

## 1. 선언 목적

Neture Distribution Engine v1은 다음 범위를 포함하는 구조로 확정한다.

* Supplier 승인 구조
* Product 승인 구조 (`product_approvals` 테이블)
* Distribution Tier 3단계 체계 (PUBLIC / SERVICE / PRIVATE)
* Tier별 확산 정책
* SERVICE 상태 머신
* Checkout Guard 3계층 검증
* Supplier/Product 비활성 캐스케이드 정책
* Tier별 KPI 분해 구조

이 구조를 기준선(Baseline)으로 동결한다.

---

## 2. Distribution Security Tier 확정

### Tier 1 — PUBLIC

* 자동 확산 (상품 승인 시 모든 활성 조직에 listing 생성)
* listing 기본값 `is_active = false`
* 운영자가 가격/채널 설정 후 수동 활성화
* Checkout: 채널 가드만 적용
* Supplier INACTIVE 시 자동 비활성

### Tier 2 — SERVICE

* 판매자 신청 → 관리자 승인
* 상태 머신 적용:
  * `PENDING`
  * `APPROVED`
  * `REJECTED`
  * `REVOKED`
* 승인 철회 가능
* 재신청 UPDATE 방식
* Supplier/Product 비활성 시 자동 REVOKED 캐스케이드
* Checkout: SERVICE + PRIVATE 검증 적용

### Tier 3 — PRIVATE

* `allowedSellerIds` 기반 접근 제어
* 승인 필수
* Checkout 3중 가드 적용

---

## 3. 상태 머신 확정 (SERVICE)

```text
PENDING → APPROVED → REVOKED → 재신청 → PENDING
PENDING → REJECTED → 재신청 → PENDING
Supplier INACTIVE / Product REJECTED
  → APPROVED → REVOKED
```

자동 복구 없음.
재사용은 반드시 재신청을 통해 진행.

---

## 4. Listing 정책 확정

* Listing은 전달 객체
* 노출은 5중 가시성 게이트 통과 시만 가능
* 승인과 listing 생성은 원자적 (SERVICE/PRIVATE)
* PUBLIC은 자동 확산 시 bulk insert
* 재승인 시 listing 자동 활성화 금지
* Supplier INACTIVE 시 모든 Tier listing 비활성화

---

## 5. Checkout Guard 확정

| Layer | 이름 | 설명 |
|-------|------|------|
| Layer 1 | 계약 가드 | 기본 계약 유효성 검증 |
| Layer 2 | 채널 승인 가드 | 채널 승인 상태 + 활성화 검증 |
| Layer 3 | 유통 정책 가드 | PRIVATE + SERVICE Tier 승인 상태 검증 |

REVOKED/REJECTED는 자동 차단.

---

## 6. 읽기 경로 병행 구조

Hub KPI 및 Catalog 쿼리는 v1/v2 병행 JOIN을 사용한다:

```sql
-- v1 경로 (product_id IS NULL): glycopharm_products
LEFT JOIN glycopharm_products gp ON gp.id::text = opl.external_product_id AND opl.product_id IS NULL

-- v2 경로 (product_id IS NOT NULL): neture_supplier_products
LEFT JOIN neture_supplier_products nsp ON nsp.id = opl.product_id
LEFT JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
```

Visibility 판정:
* v1: `gp.status = 'active'`
* v2: `nsp.is_active = true AND ns.status = 'ACTIVE'`

---

## 7. 변경 통제 규칙

다음 항목은 Core 정책 영역으로 분류한다:

| 항목 | 변경 조건 |
|------|----------|
| `distribution_type` ENUM 변경 | WO + 구조 검토 필수 |
| `product_approval_status` ENUM 변경 | WO + 구조 검토 필수 |
| Tier 자동 확산 정책 변경 | WO + 구조 검토 필수 |
| Checkout Guard 조건 변경 | WO + 구조 검토 필수 |
| Listing 자동 활성화 정책 변경 | WO + 구조 검토 필수 |
| Supplier/Product 캐스케이드 정책 변경 | WO + 구조 검토 필수 |

버그 수정, 성능 개선, 문서, 테스트는 허용.

---

## 8. 관련 테이블

| 테이블 | 역할 |
|--------|------|
| `neture_supplier_products` | 상품 원본 (distributionType: PUBLIC/SERVICE/PRIVATE) |
| `neture_suppliers` | 공급자 (status: ACTIVE/INACTIVE) |
| `product_approvals` | v2 승인 레코드 (type: service/private, status: pending/approved/rejected/revoked) |
| `organization_product_listings` | 조직별 상품 진열 (product_id FK for v2) |
| `organization_product_channels` | 채널별 상품 매핑 |
| `organization_channels` | 채널 승인 상태 |

---

## 9. 관련 코드 모듈

| 모듈 | 위치 |
|------|------|
| ProductApprovalV2Service | `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts` |
| ProductApproval Entity | `apps/api-server/src/entities/ProductApproval.ts` |
| Internal Test Routes | `apps/api-server/src/modules/product-policy-v2/product-policy-v2.internal.routes.ts` |
| Hub KPI (v2 parallel) | `apps/api-server/src/routes/kpa/controllers/store-hub.controller.ts` |
| Catalog (v2 parallel) | `apps/api-server/src/routes/kpa/controllers/pharmacy-products.controller.ts` |

---

## 10. 버전 표기

```
Neture Distribution Engine v1
Status: Frozen (Beta-Operational)
Freeze Date: 2026-02-27
```

---

*Updated: 2026-02-27*
