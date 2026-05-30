# IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1

> **상태**: Read-only 조사 IR. 코드/migration/DB/seed/route/메뉴/권한 변경 없음. 커밋·푸시 사용자 확인 후.
> **선행 작업**:
> - `IR-O4O-GLYCOPHARM-STORE-PAGE-INTERNAL-API-AUTH-AND-COCKPIT-AUDIT-V1` (직접 모티브 — GlycoPharm `cockpit/today-actions` 500 원인 1차 식별)
> - `5bef8f4c4` 약국 경영자 4-tier 정합 백필 (B/C 후속)
> - `46f13a866` 공통 StoreOwnerGuard + 3 서비스 정렬
> - `cef1dadcc` GlycoPharm /store 라벨 KPA canonical 정렬
> **작성일**: 2026-05-31
> **범위**: `ecommerce_orders` 테이블 부재의 cross-service 영향 분석. KPA-Society / GlycoPharm / K-Cosmetics + Platform Admin + Neture (informational).

---

## 1. 전체 판정

**판정: NEEDS WORK (CRITICAL severity 영역 존재)**

### `ecommerce_orders` 테이블 문제는 cross-service 구조 문제인가?

**YES — 명백한 cross-service 구조 문제.** 단일 GlycoPharm 영역의 cockpit 버그가 아니다. 백엔드 코드 베이스에 **두 개의 주문 테이블 모델이 혼재**하는 상태:

- **Legacy 가정 (`ecommerce_orders`)**: 백엔드 7개 파일이 raw SQL 로 직접 참조 — GlycoPharm + K-Cosmetics + Platform Admin 광역.
- **Canonical 실제 (`checkout_orders`)**: 2026-04-14 migration 으로 production 에 생성된 실제 주문 시스템. KPA / Neture / Event Offer 서비스는 이미 이 테이블 사용.

ALTER/INDEX 마이그레이션은 이미 2026-02 시점에 작성됐으나, `ecommerce_orders` 테이블이 부재함을 인지하고 **NO-OP 로 처리**된 채로 방치 ([20260212000002](apps/api-server/src/database/migrations/20260212000002-AddStoreAttributionToEcommerceOrders.ts), [20260224500000](apps/api-server/src/database/migrations/20260224500000-AddEcommerceOrdersServiceKeyIndex.ts)).

CLAUDE.md "Critical Lessons" §"Production Missing Tables" 의 메모(`checkout_orders: NOT in production`)는 본 IR 시점 기준 **outdated** — 2026-04-14 `20260414100000-CreateCheckoutTables.ts` 이후 production 에 존재.

### 즉시 WO 진행 가능 여부

**조건부 YES — 정책 판정 우선 권장.**

- **즉시 가능한 WO 영역**: 프론트엔드 UI safe-fallback + 백엔드 try/catch 방어. GlycoPharm cockpit 의 500 노출 즉시 차단 가능.
- **정책 판정 후 진행 영역**: 백엔드 코드의 `ecommerce_orders` 참조를 `checkout_orders` 로 정렬하거나, 별도 `ecommerce_orders` 테이블을 신규 생성하는 구조 결정. **현재 어떤 주문 흐름이 "공식" 인지 명시 SSOT 가 부재**한 점이 결정 블로커.

---

## 2. 핵심 결론

| 질문 | 결론 |
|---|---|
| GlycoPharm 단독 문제인가? | **NO.** GlycoPharm 5 endpoints + K-Cosmetics 2 endpoints + Platform Admin 3 endpoints 광역 영향. |
| KPA / K-Cosmetics 에도 영향 줄 수 있는 공통 구조 문제인가? | **YES.** K-Cosmetics 의 `cosmetics-store-summary.service.ts`, `cosmetics-order.controller.ts`, `action-definitions.ts` 가 동일 raw SQL 패턴. KPA 는 우연히 영향권 외 (`checkout_orders` 사용). |
| DB / migration 누락인가? | **YES.** `ecommerce_orders` 테이블 자체에 대한 CREATE TABLE migration / `@Entity` 모두 부재. ALTER/INDEX 마이그레이션이 NO-OP 로 자기-검증된 상태. |
| API 방어 부족인가? | **YES (서비스별 비대칭).** GlycoPharm cockpit endpoints 는 방어 없음 (즉시 500). K-Cosmetics `/operator/dashboard` 는 일부 `.catch()` 가 safe default 반환 (silent 0). |
| 화면 노출 정책 문제인가? | **YES (방어 + 정책 동시).** "주문/매출" 카드는 사용자에게 노출되고 있으나 실제 데이터 흐름이 미완 — 노출 자체가 잘못된 신호. |

### Root cause 한 줄

> 2026-02 시점에 `ecommerce_orders` 가 있다고 가정하고 작성된 백엔드 코드 클러스터 (cocktail/summary/network-aggregation) 가 2026-04 의 `checkout_orders` 도입 시점에도 마이그레이션되지 않은 채 남아 있고, NO-OP 마이그레이션 2개가 이 사실을 sandbox 처리하기만 한 상태.

---

## 3. 서비스별 영향 분석

### 3-1. KPA-Society

| 항목 | 상태 |
|---|---|
| `/store` 화면이 `ecommerce_orders` 의존 endpoint 호출하는가? | **NO** (직접 의존 0건) |
| 주문/매출 관련 endpoint 사용처 | `/api/v1/checkout/store-orders`, `/api/v1/checkout/store-orders/kpi`, etc. — **`checkout_orders` 단일 SSOT 사용** |
| Event Offer 서비스 | [event-offer.service.ts:309-325](apps/api-server/src/routes/kpa/services/event-offer.service.ts#L309-L325) — `checkout_orders` 사용 |
| 영향도 | **NONE** ✅ |
| 비고 | KPA 가 이미 canonical `checkout_orders` 만 사용하는 점이 후속 정렬의 reference 됨. |

### 3-2. GlycoPharm (CRITICAL — 가장 심각)

| 항목 | 상태 |
|---|---|
| `/store` 화면이 `ecommerce_orders` 의존 endpoint 호출하는가? | **YES** — `StoreOverviewPage` 의 `useStoreHub` 훅이 `getKpiSummary` / `getTodayActions` 등을 통해 호출 |
| 직접 영향 받는 cockpit endpoints (4개) | `GET /api/v1/glycopharm/pharmacy/cockpit/today-actions` (직전 IR 의 500 재현 endpoint) / `cockpit/store-kpi` / `cockpit/store-insights` / `POST /api/v1/glycopharm/checkout` (sales_limit FOR UPDATE) |
| Adapter | [glycopharm-store-data.adapter.ts:37-156](apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts#L37-L156) — `getOrderStats / getChannelBreakdown / getTopProducts / getRecentOrders / getTotalOrderCount / getRevenueBetween` 6 method 가 모두 `ecommerce_orders` (+ `ecommerce_order_items`) raw SQL 사용 |
| Payment hook | [GlycopharmPaymentEventHandler.ts:226-231](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts#L226-L231) — `validateSalesLimit` 가 `ecommerce_order_items JOIN ecommerce_orders` 사용 |
| 백엔드 try/catch | **부재** — 직전 IR 인용 stderr (Cloud Run 2026-05-30) 가 generic `INTERNAL_ERROR` 만 노출 |
| 프론트 방어 | `useStoreHub` 가 `Promise.allSettled` 사용 — 카드 단위 silent degradation (실패한 카드는 0/null 으로 렌더). 전체 페이지 break 는 아님. |
| 영향도 | **CRITICAL** — `/store` 진입은 가능하나 핵심 카드 (오늘의 액션 / 매출 / KPI / 인사이트) 가 무음 0 / 무한 로딩 / Network tab 500. 사용자에게 "0 주문 / 0 매출" 으로 보여 **거짓 정보 노출**. |

### 3-3. K-Cosmetics (HIGH — silent data corruption)

| 항목 | 상태 |
|---|---|
| `/store` 화면이 `ecommerce_orders` 의존 endpoint 호출하는가? | **부분 YES** — 직접 호출은 적으나 `/operator/dashboard` (Operator 화면) 가 동일 테이블 의존 |
| 영향 받는 endpoints (2개) | `GET /api/v1/cosmetics/operator/dashboard`, `POST /api/v1/cosmetics/orders` |
| Service | [cosmetics-store-summary.service.ts:50-256](apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts#L50-L256) — 8 method (`getOrderStats / getChannelBreakdown / ... / getAdminSummary`) 가 모두 `ecommerce_orders` raw SQL |
| Action queue | [action-definitions.ts:21-23](apps/api-server/src/routes/cosmetics/action-definitions.ts#L21-L23) — `SELECT COUNT(*) FROM ecommerce_orders` raw SQL |
| 백엔드 try/catch | **부분 방어** — operator-dashboard.controller line 50 `.catch()` 가 `{ totalStores:0, activeOrders:0, monthlyRevenue:0, recentOrders:[] }` safe default 반환. action-definitions 는 방어 없음. |
| 프론트 방어 | `StoreCockpitPage` 의 `loadStores()` 가 `Promise.all` 사용 — **한 endpoint 실패 시 페이지 전체 fail** (방어 약함). |
| `/store` cockpit 직접 호출 (StoreCockpitPage) | `getMyStores / getStoreSummary / getStoreListings / getStorePlaylists / getStoreInsights` 등 — **`/cosmetics/stores/*` namespace 사용**. 본 namespace 의 백엔드 구현은 본 IR 범위 밖 (직접 확인 불가) 이나 cosmetics-store-summary.service 와 동일 의존 가능성 있음. |
| 영향도 | **HIGH** — 데이터가 "0" 으로 표시되어 사용자에게 noisy 가 아닌 silent 거짓 신호. UI 자체는 렌더. 운영자 관점에서 "주문 없음 / 매출 없음" 으로 오해할 수 있는 가장 위험한 패턴. |

### 3-4. Neture (informational)

| 항목 | 상태 |
|---|---|
| `ecommerce_orders` 의존 endpoint | **없음** — Neture B2B 공급자 흐름은 `checkout_orders` 사용 |
| 영향도 | **NONE** |
| 비고 | Neture 가 이미 정렬된 canonical 사용. KPA 와 동일 reference. |

### 3-5. Platform Admin (HIGH — 운영 가시성 손실)

| 항목 | 상태 |
|---|---|
| 영향 받는 endpoints (3개) | `/api/admin/store-network/summary`, `/api/admin/store-network/top-stores`, `/api/admin/physical-stores/:id/summary` |
| Service | [store-network.service.ts](apps/api-server/src/routes/platform/store-network.service.ts) — `getCosmeticsServiceStats / getGlycopharmServiceStats / getCosmeticsTopStores / getGlycopharmTopStores / getServiceOrdersBetween / getPeriodStats` 5 method 가 모두 `ecommerce_orders` raw SQL (**serviceKey 필터 없음 — bulk aggregation**) |
| [physical-store.service.ts:192-272](apps/api-server/src/routes/platform/physical-store.service.ts#L192-L272) | 동일 의존, `physical_store_links` JOIN |
| 백엔드 try/catch | 부재 |
| 영향도 | **HIGH** — 플랫폼 운영자 cross-service KPI 대시보드 비가용. 사용자 화면 아닌 admin tooling. 운영 의사결정 layer 위험. |

---

## 4. 프론트엔드 호출 경로 정리

| 서비스 | 화면/컴포넌트 | 호출 hook/client | endpoint | 실패 시 UI 영향 |
|---|---|---|---|---|
| GlycoPharm | [StoreOverviewPage.tsx](services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx) | `useStoreHub` | `/store-hub/kpi-summary`, `/glycopharm/pharmacy/cockpit/today-actions`, `/store-hub/ai/summary` 등 (`Promise.allSettled`) | 카드 단위 silent 0 / null. 페이지 자체는 렌더. console error 만 발생. |
| GlycoPharm | [StoreMainPage.tsx](services/web-glycopharm/src/pages/store-management/StoreMainPage.tsx) (Copilot Dashboard) | `pharmacyApi` | 동일 cockpit endpoints | 동일 |
| K-Cosmetics | [StoreCockpitPage.tsx](services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx) | `storeApi (Promise.all)` | `/cosmetics/stores/me`, `/cosmetics/stores/{id}/summary`, `/cosmetics/stores/{id}/listings`, `/cosmetics/stores/{id}/playlists`, `/cosmetics/stores/{id}/insights` | **한 endpoint 실패 시 전체 페이지 에러 토스트 + 로딩 영속** (가장 취약). |
| KPA-Society | [StoreHomePage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx) | `storeAnalytics`, `pharmacyProducts`, `storeHub` | `/checkout/store-orders/*` (`checkout_orders` 기반) — 본 IR 무관 | 개별 `.catch(() => null)` 패턴, 안전 degradation. |
| K-Cosmetics | Operator 화면 (별도 dashboard) | `operatorApi` | `/cosmetics/operator/dashboard` (`.catch()` 방어 있음) | safe default 으로 0 metrics 노출 (silent 거짓 정보) |

---

## 5. 백엔드 API 및 테이블 참조 정리

### 5-1. raw SQL 로 `ecommerce_orders` 참조하는 7 파일

| # | 파일 | 서비스 | method 수 | 위험도 |
|---|---|---|---|---|
| 1 | [glycopharm-store-data.adapter.ts](apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts) | GlycoPharm | 6 | CRITICAL |
| 2 | [cosmetics-store-summary.service.ts](apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts) | K-Cosmetics | 8 | HIGH |
| 3 | [GlycopharmPaymentEventHandler.ts](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts) | GlycoPharm | 1 (validateSalesLimit) | HIGH (체크아웃 트랜잭션 내) |
| 4 | [store-network.service.ts](apps/api-server/src/routes/platform/store-network.service.ts) | Platform Admin | 5+ | HIGH |
| 5 | [physical-store.service.ts](apps/api-server/src/routes/platform/physical-store.service.ts) | Platform Admin | 2+ | MEDIUM |
| 6 | [action-definitions.ts](apps/api-server/src/routes/cosmetics/action-definitions.ts) | K-Cosmetics | 1 (action queue COUNT) | MEDIUM |
| 7 | [checkout.controller.ts](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts) | GlycoPharm | 1 (FOR UPDATE) | HIGH (체크아웃 차단) |

### 5-2. controller → adapter/service → 테이블

| Controller (route) | 호출 service | 의존 table | 가드 | 방어 |
|---|---|---|---|---|
| `cockpit.controller.ts /today-actions` ([:188-263](apps/api-server/src/routes/glycopharm/controllers/cockpit.controller.ts#L188-L263)) | `GlycopharmStoreDataAdapter.getOrderStats` | `ecommerce_orders` | `requireAuth` | ❌ 없음 → 500 |
| `cockpit.controller.ts /store-kpi` | `StoreSummaryEngine → adapter` | `ecommerce_orders` | `requireAuth` | ❌ |
| `cockpit.controller.ts /store-insights` | `StoreInsightsEngine → adapter` | `ecommerce_orders` | `requireAuth` | ❌ |
| `glycopharm checkout.controller.ts POST /checkout` | EcommerceOrder repo + FOR UPDATE on ecommerce_orders | `ecommerce_orders` | `requireAuth` | ✅ transaction rollback |
| `cosmetics operator-dashboard.controller.ts /dashboard` ([:40-134](apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts#L40-L134)) | `CosmeticsStoreSummaryService.getAdminSummary` | `ecommerce_orders` | `requireCosmeticsScope` | ✅ `.catch()` safe default |
| `cosmetics-order.controller.ts POST /orders` | EcommerceOrder 생성 | `ecommerce_orders` | `requireAuth` | ❓ 미확인 |
| `cosmetics action-definitions.ts` action queue | raw `SELECT COUNT` | `ecommerce_orders` | (operator 권한) | ❌ |
| `platform store-network.routes /summary` | `StoreNetworkService.getServiceOrdersBetween` etc | `ecommerce_orders` | `requireAdmin` | ❌ |
| `platform physical-store.routes /:id/summary` | `PhysicalStoreService.getListPaginated` | `ecommerce_orders` ∩ `physical_store_links` | `requireAdmin` | ❌ |

### 5-3. Entity / Repository

- **`@Entity('ecommerce_orders')` 정의 부재** — 코드 베이스 전체 grep 결과 0건.
- 일부 import 가 `@o4o/ecommerce-core` 의 `EcommerceOrder` 타입을 가져옴 (TypeScript 타입 / repository injection 용도). 실제 schema 정의는 외부 의존 패키지에 있음. production DB 의 실제 schema 와 동기화 보장 없음.
- 대조: `CheckoutOrder` ([entities/checkout/CheckoutOrder.entity.ts:54](apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts#L54)) 는 in-repo entity + migration 양쪽 정합.

---

## 6. DB / migration 정합성

### 6-1. 존재하는 주문 관련 테이블 (production 확실)

| 테이블 | Entity | 생성 migration | 상태 |
|---|---|---|---|
| `checkout_orders` | ✅ [CheckoutOrder](apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts#L54) | ✅ `20260414100000-CreateCheckoutTables.ts` | **EXISTS** |
| `checkout_payments` | ✅ CheckoutPayment | ✅ 동일 migration | **EXISTS** |
| `checkout_order_logs` | ✅ OrderLog | ✅ 동일 migration | **EXISTS** |

### 6-2. 존재하지 않지만 코드에서 참조하는 테이블 (production 부재)

| 테이블 | Entity | CREATE TABLE migration | 코드 참조 | 상태 |
|---|---|---|---|---|
| **`ecommerce_orders`** | ❌ | ❌ | raw SQL 7 파일 | **DOES NOT EXIST** |
| **`ecommerce_order_items`** | ❌ | ❌ | JOIN 사용 (adapter, payment hook) | **DOES NOT EXIST** |
| **`ecommerce_payments`** | ❌ | ❌ | NO-OP migration 1건만 언급 | **DOES NOT EXIST** |

### 6-3. NO-OP 마이그레이션 (자기-검증)

[20260212000002-AddStoreAttributionToEcommerceOrders.ts](apps/api-server/src/database/migrations/20260212000002-AddStoreAttributionToEcommerceOrders.ts) — `"ecommerce_orders table does not exist. Platform uses checkout_orders instead."` 주석 + 본문 NO-OP.

[20260224500000-AddEcommerceOrdersServiceKeyIndex.ts](apps/api-server/src/database/migrations/20260224500000-AddEcommerceOrdersServiceKeyIndex.ts) — 동일 패턴.

→ migration 시스템은 사실을 인지하고 있으나, **백엔드 raw SQL 클러스터는 정렬되지 않음**. 정합화 의도/추적 부재.

### 6-4. AppDataSource 설정

[connection.ts:593, 1069](apps/api-server/src/database/connection.ts#L593): `synchronize: false`, `migrationsRun: false` (모든 환경). → **entity 만 있고 migration 없는 테이블은 production 에 절대 생성되지 않음.** 본 IR 의 ground truth 와 일치.

### 6-5. 테이블명 불일치

`ecommerce_orders` ↔ `checkout_orders` — 동일 책임 (사용자 주문 / 매장 주문 / 결제 연결) 의 두 다른 표현. 컬럼명·FK·status enum 호환성은 본 IR 의 즉시 범위 밖, 별도 schema diff IR 후보.

---

## 7. 위험도 분류

### 7-1. 차단 이슈 (즉시 후속 작업 권장)

1. **GlycoPharm `/store` cockpit 의 silent 거짓 정보 노출.** "오늘의 주문 0" / "매출 0" / "KPI 0" 가 사용자에게 그대로 표시됨. 사용자 자신의 매장이 실제로 운영 중이라면, 이 화면이 거짓 정보를 정상 상태로 위장. **운영 의사결정 위험**.
2. **K-Cosmetics operator dashboard 의 동일 silent 0.** `.catch()` 가 safe default 를 반환 → 본질적으로 동일 거짓 신호.
3. **Platform Admin network/physical-store 대시보드 비가용.** 플랫폼 운영자의 cross-service 가시성 단절.

### 7-2. 운영 중 오류 가능 이슈

4. **GlycoPharm POST /checkout** 의 `FOR UPDATE` 가 `ecommerce_orders` 에 — 트랜잭션이 항상 실패. 그러나 transaction rollback 이 정상 작동하므로 사용자에게 "주문 실패" 정도로 표면화. 실제로 GlycoPharm 에서 결제가 일어나고 있다면 광역 영향.
5. **GlycoPharm payment confirmed hook** 의 `validateSalesLimit` — 동일 이유로 실패. 결제 흐름이 살아있다면 차단.
6. **K-Cosmetics POST /orders** 동일 — 미검증 (가능성 있음).

### 7-3. 후순위 정비 이슈

7. **NO-OP 마이그레이션 2건** 가 코드 베이스에 영구 잔존. 신규 개발자에게 혼란.
8. **백엔드 raw SQL → entity / repository 정렬** — 7 파일의 코드 패턴 일관성.
9. **CLAUDE.md "Critical Lessons" 의 `checkout_orders: NOT in production` 메모 outdated** — 본 IR 가 검증한 ground truth (2026-04-14 created) 와 충돌.

### 7-4. 단순 노출/문구 이슈

10. (해당 없음. 이번 영역은 표시 문구가 아니라 데이터 흐름 문제.)

---

## 8. 권장 후속 작업

### 8-1. 통합 권장 — 단일 WO 가능한 영역 (UI 안전 + 백엔드 방어)

#### **권장 우선순위 1 — 즉시 진행 가능**

**`WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1`**

**목표**: `ecommerce_orders` 부재로 인한 silent 거짓 정보 / 500 노출을 차단. 사용자에게 "준비중" 신호 명시.

**범위 (단일 PR 권장)**:
1. **백엔드 — `ecommerce_orders` 참조 7 파일에 SAVEPOINT 또는 try/catch wrap.** PG error 42P01 감지 시 `{ data: null, code: "FEATURE_NOT_READY" }` 형식의 safe response 반환. 500 노출 차단.
2. **백엔드 — cockpit endpoints + operator-dashboard + network 대시보드 응답에 `featureStatus: 'not_ready' | 'partial' | 'ready'` 메타 필드 부착.**
3. **프론트 — 주문/매출 카드가 `featureStatus !== 'ready'` 인 경우 "주문 데이터 준비 중" 안내 + 0 값 미표시.** 거짓 0 대신 진행 상태 명시.
4. **CLAUDE.md "Critical Lessons" 메모 (`checkout_orders: NOT in production`) 정정.**

**제외 (분리)**:
- 테이블 생성 / 백엔드 코드 → `checkout_orders` 정렬: 별도 정책 결정 + WO.
- 데이터 마이그레이션: 사용자 데이터 부재 가정 검증 필요.

#### **권장 우선순위 2 — 정책 판정 후 진행 (구조 정렬)**

**`WO-O4O-ECOMMERCE-ORDERS-TO-CHECKOUT-ORDERS-MIGRATION-V1`** (가칭)

**전제 정책 판정**: O4O 의 canonical 주문 테이블이 `checkout_orders` 임을 명시. KPA / Neture 가 이미 이 모델을 사용 중.

**범위 (2-3 PR 분할)**:
1. PR-1: 7 파일의 raw SQL 의 `ecommerce_orders` → `checkout_orders` 로 치환. 컬럼명/relation 차이 정렬 (`store_id` ↔ `sellerOrganizationId`, `metadata->>'serviceKey'` ↔ `metadata->>'serviceKey'`, `status != 'cancelled'` ↔ status enum 정합 등). 사전 schema diff IR 필요.
2. PR-2: `GlycopharmStoreDataAdapter` / `CosmeticsStoreSummaryService` 의 raw SQL 클러스터 → `@o4o/ecommerce-core` 의 entity / repository 패턴으로 통합. KPA 의 패턴 mirror.
3. PR-3: NO-OP migration 2건 cleanup. ecommerce_orders 잔재 제거.

**전제 IR 필요**: `IR-O4O-ECOMMERCE-ORDERS-VS-CHECKOUT-ORDERS-SCHEMA-DIFF-V1` — 두 테이블의 컬럼·status enum·관계 차이 정밀 비교.

### 8-2. 분리해야 할 별도 IR

- **`IR-O4O-ECOMMERCE-ORDERS-VS-CHECKOUT-ORDERS-SCHEMA-DIFF-V1`** (전제 IR) — 8-1 권장 2 의 전제. 컬럼·status·관계 비교.
- **`IR-O4O-COSMETICS-STORE-API-CROSSCHECK-V1`** (보강 조사) — K-Cosmetics `/cosmetics/stores/*` namespace 의 백엔드 구현 검증. 본 IR 의 K-Cosmetics 영향이 부분 미확인 (5-1 에서 `/cosmetics/stores/*` 의 backend 미검증).

### 8-3. UI 방어 vs DB 작업 분리 판단 근거

| 작업 | 즉시 가능 여부 | 분리 사유 |
|---|---|---|
| UI safe fallback + 백엔드 try/catch | ✅ 즉시 | 단일 PR / 위험도 낮음 / 사용자 영향 즉시 차단 |
| `ecommerce_orders` → `checkout_orders` 코드 정렬 | ⚠️ 정책 판정 후 | schema diff 검증 필요 / 결제 흐름 영향 / data 영향 |
| CREATE TABLE `ecommerce_orders` migration 추가 | ❌ 권장 안 함 | `checkout_orders` 와 중복. 두 테이블 병존은 새로운 SSOT drift 유발. |

---

## 9. Current Structure vs O4O Philosophy Conflict Check

`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` 와 `docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` 의 핵심 원칙 4 개에 대해 점검:

### 9-1. "매장 실행 중심" (PHILOSOPHY §3.3)

⚠️ **부분 충돌.** 매장 실행의 핵심 도메인 (주문 / 매출 / 인사이트) 이 백엔드 코드 절반과 production DB 사이 단절. 매장 경영자가 자기 매장의 거래 흐름을 정확히 볼 수 없는 상태.

### 9-2. "Store 기준 capability" (PHILOSOPHY §5)

⚠️ **충돌.** 주문 capability 가 "준비 완료" 처럼 노출되나 실제로는 미완 (`ecommerce_orders` 부재). capability flag 가 화면·메뉴·API 일관성을 갖춰야 한다는 원칙 위반.

### 9-3. "HUB / 내 매장 분리" (HUB CONTENT PUBLISHING STANDARD)

✅ 충돌 없음. 본 IR 의 결함은 HUB-내 매장 경계와 무관.

### 9-4. "공통화 + 운영 흐름 정합" (3-ROLE-FLOW §2)

❌ **명백한 충돌.** 백엔드 코드 베이스에 **동일 도메인 (주문)** 에 대해 **두 SSOT (`ecommerce_orders` / `checkout_orders`)** 가 service-by-service 로 분기. 가장 명백한 drift.

### 9-5. "사용자에게 오류 보이지 않기" (philosophy implicit)

❌ **충돌.** GlycoPharm cockpit `today-actions` 가 production 에서 500 노출. K-Cosmetics 가 silent 거짓 0 노출. 둘 다 "준비중" 표기 / 비활성 처리가 더 적절.

### 9-6. 최소 수정으로 철학과 정렬하는 방향

- **단기 (1 WO)**: 8-1 의 safe-fallback WO. 사용자에게 거짓 정보 / 500 노출 즉시 차단. capability flag 로 미완 영역 표기. → 원칙 9-5 / 9-2 정렬.
- **중기 (1 IR + 1-3 WO)**: 8-2 의 schema diff IR + 8-1 권장 2 의 구조 정렬 WO. → 원칙 9-1 / 9-4 정렬.
- **불권장**: `CREATE TABLE ecommerce_orders` 마이그레이션 추가 (새 SSOT drift 유발).

### 9-7. 충돌 요약

| 원칙 | 충돌 여부 | 비고 |
|---|---|---|
| 매장 실행 중심 | ⚠️ 부분 충돌 | 주문 흐름 단절 |
| Store 기준 capability | ⚠️ 충돌 | 미완 capability 가 완료처럼 노출 |
| HUB / 내 매장 분리 | ✅ 없음 | |
| 공통화 + 운영 흐름 정합 | ❌ 명백한 충돌 | 두 SSOT (ecommerce_orders / checkout_orders) 병존 |
| 사용자에게 오류 보이지 않기 | ❌ 충돌 | 500 / silent 0 노출 |

---

## 부록 A. 조사 시점 main HEAD 기준

```
cef1dadcc fix(glycopharm): align my-store dashboard labels with KPA canonical
3abfdfe7b refactor(operator): WO-O4O-SHARED-PACKAGES-GLUCOSEVIEW-RESIDUE-CLEANUP-V1
46f13a866 feat(store-ui-core): canonical StoreOwnerGuard + 3 service alignment
14240d0ad refactor(operator): shared package CARE type contract cleanup
c94ed8e49 refactor(glycopharm): Care type/intro/guard 잔재 정리
```

## 부록 B. 핵심 파일 위치 인덱스

### 백엔드 — `ecommerce_orders` 참조 7 파일

| # | 파일 |
|---|---|
| 1 | [apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts](apps/api-server/src/routes/glycopharm/services/glycopharm-store-data.adapter.ts) |
| 2 | [apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts](apps/api-server/src/routes/cosmetics/services/cosmetics-store-summary.service.ts) |
| 3 | [apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts) |
| 4 | [apps/api-server/src/routes/platform/store-network.service.ts](apps/api-server/src/routes/platform/store-network.service.ts) |
| 5 | [apps/api-server/src/routes/platform/physical-store.service.ts](apps/api-server/src/routes/platform/physical-store.service.ts) |
| 6 | [apps/api-server/src/routes/cosmetics/action-definitions.ts](apps/api-server/src/routes/cosmetics/action-definitions.ts) |
| 7 | [apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts) |

### 백엔드 — controller / NO-OP migration

| 항목 | 파일 |
|---|---|
| GlycoPharm cockpit controller (5 endpoint) | [apps/api-server/src/routes/glycopharm/controllers/cockpit.controller.ts](apps/api-server/src/routes/glycopharm/controllers/cockpit.controller.ts) |
| K-Cosmetics operator dashboard controller | [apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts](apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts) |
| NO-OP migration #1 | [apps/api-server/src/database/migrations/20260212000002-AddStoreAttributionToEcommerceOrders.ts](apps/api-server/src/database/migrations/20260212000002-AddStoreAttributionToEcommerceOrders.ts) |
| NO-OP migration #2 | [apps/api-server/src/database/migrations/20260224500000-AddEcommerceOrdersServiceKeyIndex.ts](apps/api-server/src/database/migrations/20260224500000-AddEcommerceOrdersServiceKeyIndex.ts) |
| Canonical checkout_orders migration | [apps/api-server/src/database/migrations/20260414100000-CreateCheckoutTables.ts](apps/api-server/src/database/migrations/20260414100000-CreateCheckoutTables.ts) |
| Canonical CheckoutOrder entity | [apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts](apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts) |
| AppDataSource (synchronize/migrationsRun config) | [apps/api-server/src/database/connection.ts](apps/api-server/src/database/connection.ts) |

### 프론트엔드 — `/store` cockpit 화면

| 서비스 | 화면 |
|---|---|
| GlycoPharm | [services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx](services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx) + [hooks/useStoreHub.ts](services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts) |
| K-Cosmetics | [services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx](services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx) + [services/storeApi.ts](services/web-k-cosmetics/src/services/storeApi.ts) |
| KPA | [services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx) (영향 없음, reference) |

---

*IR 종료. 본 IR 은 read-only. 코드/migration/DB/seed/route/메뉴/권한 변경 없음. 다음 단계는 §8-1 의 safe-fallback WO 또는 §8-2 의 schema diff IR 중 사용자 정책 판정 후 진행.*
