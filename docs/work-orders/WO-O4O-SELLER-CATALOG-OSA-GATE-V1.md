# WO-O4O-SELLER-CATALOG-OSA-GATE-V1 — 판매자 공급 catalog 의 OSA 승인 미적용 조사·정합

> **상태**: DRAFT · **등록일**: 2026-10-16 · **우선순위**: 중간 (계약 불일치 · 운영 노출 범위 조사 필요)
> **발견 경로**: PR #659 Codex P2 · [`CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1`](../checks/CHECK-O4O-SUPPLIER-REGISTRATION-PUBLICATION-SEPARATION-V1.md) §7-1

## 1. INITIAL_PURPOSE

판매자 공급 catalog(`GET /api/v1/neture/seller/available-supply-products`)가
[`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) §4 공급 가능 판정
(공급자 범위 `is_public`·`service_keys`·`allowed_seller_ids` + 서비스 운영자 `offer_service_approvals` 승인)과 맞는지 확정하고, 어긋나면 정합한다.

## 2. 현재 동작 (main 기준 코드 확인)

`apps/api-server/src/modules/neture/services/seller.service.ts` `getAvailableSupplyProducts(sellerId)`:

```sql
WHERE spo.is_active = true AND spo.approval_status = 'APPROVED' AND s.status = 'ACTIVE'
  AND (spo.distribution_type IN ('PUBLIC', 'SERVICE')
    OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids)))
```

- `offer_service_approvals` 를 조회하지 않는다. 등록 승인·활성인 `SERVICE` offer 는 서비스 운영자 승인이 없어도 모든 판매자 catalog 에 나타난다.
- PR #659 의 legacy PUBLIC 회귀는 이 동작을 기대값으로 고정하지 않도록 정리했다(runtime 미변경).

## 3. 소비처

- `apps/api-server/src/modules/neture/controllers/seller.controller.ts` — `GET /available-supply-products` (`requireAuth`).
- `services/web-neture/src/pages/store/StoreOrdersPage.tsx` · `StoreOrderDetailPage.tsx` — 재주문 시 이 목록으로 상품을 매칭해 B2B Store Cart 에 담는다.

## 4. 조사 항목

1. 이 catalog 가 "공급 가능" 판정인지, 판매자 신청(`product_approvals` service/private) 전 단계의 탐색 view 인지 사업 의도를 확정한다. 응답 `supplyStatus` 기본값이 `available` 이므로 현재 UI 는 공급 가능으로 읽힌다.
2. 재주문 → Store Cart 담기 → checkout 경로가 OSA 를 별도로 검증하는지 확인한다. 별도 gate 가 없다면 OSA 미승인 SERVICE offer 가 B2B 주문까지 갈 수 있는지 실제 DB 로 재현한다.
3. 식별자 축: controller 가 `sellerId = req.user.id`(사용자 id)를 넘기지만 query 는 `allowed_seller_ids`·`product_approvals.organization_id` 와 비교한다. 두 축이 같은 id 체계인지 확인한다(다르면 PRIVATE 지정 매장·신청 상태가 매칭되지 않는다).
4. 운영 영향(read-only): `SERVICE` + `approval_status='APPROVED'` + 활성인데 해당 service 의 OSA 승인 행이 없는 offer 수. 데이터·로그는 요약·마스킹해 기록한다.

## 5. DONE_CRITERIA

- [ ] §4-1 사업 의도 확정(필요 시 사용자 결정). 탐색 view 로 유지하면 계약 문서에 근거를 남기고, 공급 가능 판정이면 OSA 조건을 추가한다.
- [ ] OSA 조건을 추가하는 경우: 판매자 매장의 서비스 축으로 `offer_service_approvals.approval_status='approved'` 를 요구한다. PUBLIC·PRIVATE 판정은 §4 계약대로 유지한다.
- [ ] 실제 PostgreSQL 회귀: OSA 승인 전 미노출 → 승인 후 노출 → 철회 후 미노출, PUBLIC·PRIVATE 회귀 유지, 재주문 매칭 영향 확인.
- [ ] §4-2·§4-3 결과에 따른 추가 결함은 범위·위험이 독립적이면 별도 WO 로 분리한다.
- [ ] 관련 API·Neture 웹 회귀·tsc·lint PASS, CHECK 작성.

## 6. OUT_OF_SCOPE

- 공급자 등록·게시 분리(#652) 계약 변경.
- Neture 약국 흐름의 이용 판정(§4 말미 `DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1` SSOT 대상) 변경.
- 운영 데이터 수정.

## 7. 실행 경계

API contract·권한 판정 변경이 포함될 수 있으므로 CLAUDE.md 중지 조건에 따라 사업 의도 확정 전에는 구현하지 않는다.
개발 담당은 전용 worktree/branch 에서 조사·수정·검증·push 후 인계하고, PR 통합·배포는 지정된 통합 담당이 수행한다.
