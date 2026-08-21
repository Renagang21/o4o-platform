# CHECK — WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1

> **일자**: 2026-08-21 · **판정**: **COMPLETED**
> **정본 문서**: [`docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md)
> **핵심 판정문**: `PharmacyHub = KPA류 공통 매장경영 구조 − 공급 승인/매장지원 operator capability`

---

## 1. 기존 모델에서 잘못됐던 부분

| # | 잘못된 것 | 실제 계약 |
|---|---|---|
| 1 | Pharmacy-Hub 에 `pharmacy-hub:supplier` membership 역할을 두었다 | 공급자는 Neture 원장(`neture:supplier`)의 신분이다. 서비스마다 공급자 신분을 복제하면 원장이 갈라진다. |
| 2 | 공급자 상품 제공 설정 · 주문 처리 화면을 Pharmacy-Hub 안에 두었다 | 공급자 업무 화면은 Neture 에만 있어야 한다 (원칙 3). |
| 3 | 가입(`/join`)이 supplier 역할을 self-signup 으로 받았다 | Pharmacy-Hub 가입 역할은 약국 경영자 하나다. |
| 4 | supplier 전용 shell/menu/header/nav/홈 카드가 있었다 | Pharmacy-Hub 에 공급자 UI 표면이 존재해서는 안 된다. |
| 5 | 공급자 API 가드를 `requirePharmacyHubScope('pharmacy-hub:supplier')` 로 걸었다 | 공급자 판정 SSOT 는 Neture 공급자 원장 ACTIVE(`createRequireActiveSupplier`)다. |

**중요 — 잘못되지 않았던 것**: 매장 HUB 노출 게이트는 **처음부터 승인 무관**이었다
(`PHARMACY_HUB_OFFER_EXPOSURE_GATE_SQL` = `$1 = ANY(spo.service_keys)` + 공급자 ACTIVE + master ACTIVE).
따라서 이번 작업은 노출 재설계가 아니라 **잘못 놓인 쓰기 경로의 이동(MOVE)** 이며,
공통 offer 계약은 깨지 않았다.

---

## 2. Census — `pharmacy-hub:supplier` 전수 판정

| 대상 | 판정 | 처리 |
|---|:---:|---|
| `types/roles.ts` `PharmacyHubRole` union · `ROLE_REGISTRY` 항목 | REMOVE | 제거 |
| `middleware/pharmacy-hub-scope.middleware.ts` `allowedRoles` · `scopeRoleMapping` | REMOVE | 제거 (3역할) |
| `PharmacyHubJoinController` `ALLOWED_ROLE_TYPES` · supplier 라벨/검증 | REMOVE | `['store_owner']` 단일 |
| `PharmacyHubSupplierProductController` | MOVE-TO-NETURE | 삭제 → 신규 컨트롤러로 통합 |
| `PharmacyHubSupplierOrderController` | MOVE-TO-NETURE | 삭제 → 신규 컨트롤러로 통합 |
| `routes/pharmacy-hub/pharmacy-hub.routes.ts` `/supplier/*` 6 route + `/supplier/ping` + entryPoint | REMOVE | 제거 + 재추가 금지 주석 |
| `web-pharmacy-hub` SupplierShell · supplierMenu · supplier/ProductsPage · SupplierHeader | REMOVE | 삭제 |
| `web-pharmacy-hub` App.tsx `/supplier` route block | REMOVE | 제거 |
| `config/service.ts` `ROLES.supplier` · ROLE_LABELS · ROLE_SCOPE_MAPPING | REMOVE | 제거 |
| `config/navigation.ts` supplier nav item | REMOVE | 제거 |
| `PharmacyHubGlobalHeader` supplier 메뉴 | REMOVE | 제거 |
| `JoinPage` 역할 선택 단계 · companyName/contactName | REMOVE | 역할 선택 제거, 약국명 단일 축 |
| `JoinStatusPage` / `HomePage` / `MyProfilePage` / operator 화면 supplier 표기 | REMOVE | 제거 |
| `PharmacyHubStoreProductController` (`pharmacyHubUnitPrice` 포함) | **KEEP** | 매장(약국 경영자) 화면 계약 — 공급자 축 아님 |
| `PharmacyHubMembershipConsoleController` 승인/반려 | **KEEP** | 회원 승인 ≠ 공급 승인 |
| `PharmacyHubOperatorFulfillmentController` | **KEEP** | 결제 bridge 복구 = 서비스 자체 운영 |
| migration `20270216000000-SeedPharmacyHubServiceAndRoles.ts` · `roles` seed row | **KEEP** | 불변 이력. 편집·삭제 금지 |
| `supplier_product_offers` / `offer_service_prices` | **KEEP · COMMON** | 공통 공급 원장 — 복제 금지 |

---

## 3. 운영 데이터 실측 (프로덕션, read-only SELECT)

| 항목 | 값 |
|---|---|
| `service_memberships` 중 `pharmacy-hub:supplier` | **0건** |
| `role_assignments` 중 `pharmacy-hub:supplier` (active) | **0건** |
| `roles` 테이블 seed row | 1건 (보존) |
| 이번 WO 의 DB write | **0건** (UPDATE/DELETE/DROP 없음) |

→ 중지 조건 "기존 supplier 운영 데이터 손실 위험" **해소**. 데이터 삭제 0건.

**범위 외 관측(별도 WO 제안)**: 프로덕션에 `pharmacy-hub:member` active role_assignment 1건이
존재하나 `PharmacyHubRole` union 에 없는 값이다. 이번 WO 범위가 아니므로 손대지 않았다.

---

## 4. 이동 결과 — Neture 공급 흐름

| 계층 | 산출물 |
|---|---|
| 상수 SSOT | `modules/neture/constants/supplier-optin-services.ts` (`SUPPLIER_OPTIN_SERVICE_KEYS = ['pharmacy-hub']`) |
| 컨트롤러 | `modules/neture/controllers/supplier-service-delivery.controller.ts` (products 2 + orders 4) |
| 마운트 | `/neture/supplier/services/*` — `/supplier` 광역 마운트보다 **먼저** 건다 |
| 가드 | `requireAuth` + serviceKey allowlist + `createRequireActiveSupplier` |
| Frontend API | `web-neture/src/lib/api/supplierServiceDelivery.ts` |
| Frontend 화면 | `web-neture/src/pages/supplier/SupplierServiceDeliveryPage.tsx` → `/supplier/services/:serviceKey` |
| 진입점 | SupplierSpaceLayout 사이드바 `Pharmacy-Hub 제공` + `SupplierSupplyOffersPage` 카드 |

SQL · 상태 전이(`paid→preparing→shipped`) · 에러 코드(`ENABLED_REQUIRED` · `INVALID_UNIT_PRICE` ·
`OFFER_NOT_FOUND` 404 · `NOT_OWNED` 403 · `INVALID_STATUS_TRANSITION` 409 · `ORDER_NOT_FOUND` 404)는
**옮기면서 바꾸지 않았다.** 바뀐 것은 고정 `SERVICE_KEY` → 검증된 path param,
공급자 측 응답 필드명(`deliveredToPharmacyHub`→`delivered`, `pharmacyHubUnitPrice`→`serviceUnitPrice`),
응답에 `serviceKey`/`serviceLabel` 추가뿐이다.

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `apps/api-server` `tsc --noEmit` | PASS (기존 `@o4o/action-log-core` TS2307 잡음 외 0건 — 본 작업 무관) |
| `pharmacy-hub-scope-guard.spec.ts` + `PharmacyHubStoreProvisioningService.reuse-guard.test.ts` | **2 suites / 38 tests PASS** |
| supplier 역할 재유입 잠금 테스트 2건 신설 | PASS (allowedRoles/mapping 부재 + 모든 scope 403) |
| `services/web-pharmacy-hub` `tsc --noEmit` | PASS |
| `services/web-neture` `tsc --noEmit` | PASS |
| 잔여 `pharmacy-hub:supplier` 참조 | 의도적 3곳만 (재유입 잠금 테스트 상수 · migration 이력 · 신규 컨트롤러 설명 주석) |
| 타 서비스 영향 | 없음 — 승인 축(`APPROVAL_ELIGIBLE_SERVICE_KEYS`) 및 공통 offer 계약 미변경 |

---

## 6. 문서 정합

- 신설: `docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md` (핵심 판정문 §1)
- 갱신: `CLAUDE.md` 상세 규칙 문서 목록 · `docs/rbac/RBAC-ROLE-CATALOG-V1.md` (역할표 · supplier 부재 명시)
- 미편집(의도): `docs/work-orders/**` 5건 — 기록물이므로 baseline §8 정정표로 대체 (CLAUDE.md §16-1)

---

*Status: COMPLETED*
