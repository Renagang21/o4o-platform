# IR-O4O-NETURE-SUPPLIER-ACCOUNT-ROUTE-TREE-CANONICALIZATION-GATE-V1

> **성격:** B 버킷(라우트트리 정합) 구현 전 게이트. read-only 조사 — route·component·menu·redirect·DB·배포 변경 0.
> **작성일:** 2026-07-27
> **선행 SSOT:** [`IR-O4O-NETURE-SUPPLIER-FULL-WORKFLOW-AND-DASHBOARD-CLOSEOUT-AUDIT-V1`](IR-O4O-NETURE-SUPPLIER-FULL-WORKFLOW-AND-DASHBOARD-CLOSEOUT-AUDIT-V1.md) · [`CHECK-O4O-NETURE-SUPPLIER-OFFER-AND-ORDER-NAVIGATION-DEAD-END-CLOSE-V1`](../checks/CHECK-O4O-NETURE-SUPPLIER-OFFER-AND-ORDER-NAVIGATION-DEAD-END-CLOSE-V1.md) · [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)
> **최종 readiness:** **READY_FOR_CANONICALIZATION** — 삭제 없이 redirect 우선. 단 **주문 처리목록만 "이관 후 redirect"(R2)**, 나머지 5개는 순수 처리(R1). BLOCKED 아님.

---

## 1. 한 줄 결론

`/account/supplier/*`는 외부 진입점이 없는 6-route 고립 섬이며, 그중 **4개(dashboard·orders/:id·inventory·settlements)는 즉시 redirect(R1)**, **2개(orders·products)는 기능 이관 후 redirect(R2)** 로 정리 가능하다. **핵심 판정: 주문 처리 write 목록(`updateOrderStatus`)은 canonical `/supplier/*`에 존재하지 않으므로 단순 double-mount+redirect로 끝낼 수 없고, 처리목록 컴포넌트를 `/supplier/*`로 이관 + 백엔드 `fulfillmentUrl` lockstep 수정이 필요하다.**

---

## 2. 두 route tree 전체 인벤토리

### 2.1 `/account/supplier/*` (중복·고립 후보) — 정확히 6 routes

래퍼: `<SupplierRoute><SupplierAccountLayout/></SupplierRoute>` (App.tsx:854-857)

| # | route | component | 파일 |
|---|-------|-----------|------|
| 1 | `/account/supplier` | `SupplierAccountDashboardPage` | pages/account/SupplierAccountDashboardPage.tsx |
| 2 | `/account/supplier/products` | `SupplierProductsListPage` | pages/account/SupplierProductsListPage.tsx |
| 3 | `/account/supplier/orders` | `SupplierOrdersListPage` | pages/account/SupplierOrdersListPage.tsx |
| 4 | `/account/supplier/orders/:id` | `SupplierOrderDetailPage` | pages/account/SupplierOrderDetailPage.tsx |
| 5 | `/account/supplier/inventory` | `SupplierInventoryPage` | pages/account/SupplierInventoryPage.tsx |
| 6 | `/account/supplier/settlements` | `SupplierSettlementsPage` | pages/account/SupplierSettlementsPage.tsx |

### 2.2 `/supplier/*` (canonical 후보) — 상위집합 (30+ routes)

래퍼: `<SupplierRoute><SupplierSpaceLayout/></SupplierRoute>` (App.tsx:794-847). 6개 대응 route 외에 products/library·import·new·register·bulk, supply-offers, recruitments, library, partner-commissions, csv-import, b2b-content, store-descriptions, tablet-screen-sets, event-offers, market-trial(×4), signage, forum(×5) 등을 고유 보유.

**핵심: `/supplier/*` 트리는 orders/:id·inventory·settlements를 `pages/account/*` 파일을 그대로 재사용(import)하여 double-mount 한다.** (App.tsx import L237-239 공유)

### 2.3 route 대응표 + double-mount 판정

| 업무 | `/supplier/*` (line) | `/account/supplier/*` (line) | component 관계 | 판정 |
|------|---------------------|------------------------------|---------------|------|
| dashboard | `/supplier/dashboard` (799) | `/account/supplier` (859) | **다른 파일** (supplier/ vs account/) | CANONICAL_SUPERSET |
| products | `/supplier/products` (800) | `/account/supplier/products` (860) | **다른 파일** (supplier/ vs account/) | CANONICAL_SUPERSET (구형 고유=표시전용) |
| orders | `/supplier/orders` (812) | `/account/supplier/orders` (861) | **다른 파일 · 역할 상보** (읽기허브 vs 처리목록) | COMPLEMENTARY |
| orders/:id | `/supplier/orders/:id` (813) | `/account/supplier/orders/:id` (862) | **동일 파일 double-mount** | IDENTICAL |
| inventory | `/supplier/inventory` (814) | `/account/supplier/inventory` (863) | **동일 파일 double-mount** | IDENTICAL |
| settlements | `/supplier/settlements` (815) | `/account/supplier/settlements` (864) | **동일 파일 double-mount** | IDENTICAL |

`/workspace/supplier/*` (App.tsx:1160-1167) 는 전부 `/supplier/*`(또는 /mypage)로 redirect — `/account/supplier/*`로 가는 레거시 redirect 0. (단 L1164 `/workspace/supplier/requests → /supplier/requests` 는 대상 route 부재=dangling, 별도 minor.)

---

## 3. 주문 route 상세 비교 (핵심)

### 3.1 `/supplier/orders` → SupplierOrdersPage = **읽기 운영 허브 (mutation 0)**

- API: `getOrdersSummary()` (`GET /neture/supplier/orders/summary`) + `getUnifiedOrders({page,limit,source})` (`GET /neture/supplier/orders/unified`). **mutation API import 0.**
- `updateOrderStatus`/`NEXT_STATUS`/ship/fulfill 핸들러 **전무**. `ORDER_STATUS_LABEL`은 표시 전용.
- 행 액션 = 조건부 링크(쓰기 아님): `o.canFulfill && o.fulfillmentUrl ? <Link to={o.fulfillmentUrl}>주문 처리</Link> : <span>읽기 전용</span>`.
- 명시적으로 처리를 타 트리로 bounce: `<Link to="/account/supplier/orders">주문 처리 · 배송 workspace 열기</Link>` (§선행 WO에서 수정한 CTA).
- 헤더: "이곳에서는 현황을 한눈에 확인… 주문 처리는 각 서비스에서 수행". 에러=summaryError/unifiedError 분리+재시도(계약 양호).

### 3.2 `/account/supplier/orders` → SupplierOrdersListPage = **실제 처리목록 (write)**

- API: `getOrders({page,limit,status})` (`GET /neture/supplier/orders`) + **mutation** `updateOrderStatus(orderId, nextStatus)` (`PATCH /neture/supplier/orders/:id/status`).
- 상태머신 보유: `NEXT_STATUS = {created:'preparing', paid:'preparing', preparing:'shipped', shipped:'delivered'}` + 행별 액션 버튼 `handleStatusChange`.
- 컬럼: 주문번호(link)/매장명/지역/연락처/금액/제품수/주문일/상태/**관리(액션)**. 상태 select 필터(서버) + 검색. 페이지네이션(meta.totalPages).
- 상세 링크 = **account 트리 하드코딩**: `<Link to={\`/account/supplier/orders/${order.id}\`}>` (L189, L362).

### 3.3 orders/:id → SupplierOrderDetailPage = **동일 파일 double-mount · pathname-aware · 안전**

- 두 트리(`/supplier/orders/:id` + `/account/supplier/orders/:id`)에 동일 파일 마운트. 실 write 표면(getOrderById/getShipment + updateOrderStatus/createShipment/updateShipmentStatus).
- back path를 pathname으로 계산:
  ```js
  const backPath = location.pathname.startsWith('/supplier/') ? '/supplier/orders' : '/account/supplier/orders';
  ```
- 하드코딩 상대 navigate 0. 404/loadError/shipmentState 계약 견고. **양 트리에서 안전.**

### 3.4 주문 canonical 판정

**`/supplier/orders`(읽기허브)와 `/account/supplier/orders`(처리목록)는 중복이 아니라 상보(COMPLEMENTARY) 관계다.** 처리 write 목록은 오직 account 트리에만 존재한다. 따라서:
- **단순 redirect 불가** — `/supplier/orders`는 이미 별개 역할(허브)이 점유.
- **필요 조치(R2):** SupplierOrdersListPage(처리목록)를 `/supplier/*` 하위(예: `/supplier/orders/manage`)로 이관 + 내부 `/account/supplier/orders/:id` 링크 repoint + 허브 CTA repoint + **백엔드 fulfillmentUrl lockstep**(§8) → 이후 `/account/supplier/orders → /supplier/orders/manage` redirect.

---

## 4. 상품·재고·정산 비교

### 4.1 products — CANONICAL_SUPERSET

- `/supplier/products` SupplierProductsPage(~1676줄, 엑셀형): `getProductsPaginated`(다중필터) + `getApprovalCounts` + mutation `bulkDelete`/`updateProduct`(EditableDataTable 인라인 공급가·소비자가·**재고**·노출) + 이미지 업로드/AI 태그/승인탭/완성도/오퍼액션/모집모달. **완전 상위.**
- `/account/supplier/products` SupplierProductsListPage(~680줄, 구형): `getProducts()`(비페이지네이션) + `updateProduct`(isActive 토글·공급가 인라인). **고유=표시 전용만**: `getHubStatus(product, supplierStatus)`가 `supplierProfileApi.getProfile()` status로 `supplier_inactive`("공급자 미활성") HUB 노출상태 배지 + "HUB 노출 N개" 카운터 산출. 고유 **write 없음**.
- → canonical이 기능 상위. 구형 고유(HUB 노출상태 배지·카운터)는 표시 전용이므로 canonical에 소폭 port 후 redirect(R2-lite), 또는 의도적 drop 시 R1.

### 4.2 inventory / settlements — IDENTICAL (동일 파일 double-mount)

- inventory: `SupplierInventoryPage` 양 트리 마운트. 트리 무관 write 보유(`updateInventory` PATCH). KPI+인라인 편집+추적 토글.
- settlements: `SupplierSettlementsPage` 양 트리 마운트. 읽기전용(getSettlements/getSettlementKpi/getSettlementDetail).
- 두 파일 모두 유일 분기 = back path pathname 판정(`startsWith('/supplier/') ? '/supplier/dashboard' : '/account/supplier'`). 그 외 동작 동일. **양 트리 안전.**

---

## 5. 내부 진입점 전수 결과

`/account/supplier/*` 는 **자기완결 섬**. 분류:

| 참조 | 위치 | 분류 |
|------|------|------|
| route 정의 6줄 | App.tsx:859-864 | CURRENT_INTERNAL (변경 대상) |
| 사이드바(3/6만 노출) | SupplierAccountLayout.tsx:18-22 (Dashboard/Products/Orders만·inventory·settlements 미노출) | CURRENT_INTERNAL(섬 내부) |
| 대시보드 타일·링크 | SupplierAccountDashboardPage.tsx (L119-122,161,189,232,304,419) | CURRENT_INTERNAL(섬 내부) |
| 목록 상세링크 | SupplierOrdersListPage.tsx:189,362 | CURRENT_INTERNAL(섬 내부) |
| self-adapting back path | SupplierSettlementsPage:83 / OrderDetail:116 / Inventory:39 | CURRENT_INTERNAL(pathname 분기) |
| **허브 CTA(섬 진입)** | SupplierOrdersPage.tsx:180 `to="/account/supplier/orders"` | **CURRENT_INTERNAL — canonical 공간→섬 유일 실링크(선행 WO에서 신설)** |
| 백엔드 fulfillmentUrl 렌더 | SupplierOrdersPage.tsx:487-488 `<Link to={o.fulfillmentUrl}>` (타입 lib/api/supplier.ts:553) | CURRENT_INTERNAL(백엔드 생성값 소비) |
| 랜딩 role 맵 | config/dashboard.ts:45-46 → 항상 `/supplier/dashboard` | 섬으로 안 보냄 확인 |

→ 외부(로그인/redirect/role) 진입은 전부 `/supplier/dashboard`. 섬으로의 실 유입은 **허브 CTA(180) + 백엔드 fulfillmentUrl(487)** 2곳뿐.

---

## 6. 알림·외부 URL 참조

- **백엔드 전체(apps/api-server)에서 `/account/supplier` 생성 = 정확히 1곳**: `supplier-unified-order.service.ts:138` `fulfillmentUrl = \`/account/supplier/orders/${o.id}\``. **알림/이메일 아님** — unified-orders API read-model 필드(같은 파일 L39 타입, checkout 경로는 L203 null).
- **알림/이메일/SMS/push 중 `/account/supplier` 사용 = 0.** 타 neture 알림 targetUrl은 `/supplier/products`(offer-service-approval.service.ts:628)·`/supplier/*` 모집(partner-contract.service.ts:907-909)·`/admin/*`(store-product-request-notify) 로 향함.
- EXTERNAL_POSSIBLE = 북마크뿐. must-handle = `/account/supplier/orders/:id`(백엔드 fulfillmentUrl) + `/account/supplier/orders`(허브 CTA).

---

## 7. 프로덕션 실사용 게이트 (Cloud Run request logs · read-only · 최근 30일)

neture-web Cloud Run 로그가 요청 경로를 캡처(SPA 직접진입/새로고침/북마크만 계상 — 클라이언트 내부 nav 미포함).

| route | 30일 요청 수 |
|-------|:---:|
| `/account/supplier/products` | 11 |
| `/account/supplier/settlements` | 1 |
| `/account/supplier/orders` | 1 |
| (참고) `/supplier/orders` | 7 |

→ **PRODUCTION_USAGE = LOW_BUT_NONZERO.** 섬 직접진입이 소량 존재(주로 products) → **삭제(R4) 부적합, redirect로 북마크 보존 필수.** 개인정보/주문 상세 미출력.

---

## 8. Guard·Layout 차이

- 양 트리 **동일 guard** `SupplierRoute`(RoleGuard.tsx:188-198): `allowedRoles=SUPPLIER_ROLES`(`neture:supplier`/`supplier`/`partner`/`seller`), `requireMembership='neture'`, **fail-CLOSED**(미인증→/login, role 실패→/).
- 양 layout **동일 재검** `SUPPLIER_ACCESS_ROLES`(`neture:supplier`/`supplier`/`neture:admin`/`platform:super_admin`) — 불일치 시 inline 403 **render(navigate 아님)**. (SpaceLayout:273-284 / AccountLayout:45-56 동일 코드.)
- **역할 비대칭 0**: 한 트리 접근 가능한 사용자는 다른 트리도 동일하게 접근(또는 동일하게 차단). `/account`가 더 넓거나 좁은 권한 없음.
- **redirect loop 0**: layout 거부=render, guard 거부=`/`·`/login`(양 트리 밖). 역방향 cross-tree redirect 부재 → cycle 불가. (양측에 상호 Navigate를 동시에 걸 때만 loop 발생 — 구현 시 단방향만.)
- **상대 navigate 파손 0**: 두 layout 모두 절대경로 링크만. 단 사이드바는 각자 트리에 하드코딩 → 이관 페이지는 사이드바 항목 재배치 필요(기계적 파손은 아님).
- `SupplierActivationGate`: `/supplier/*` 일부 페이지에만 래핑(account 트리엔 0), **fail-OPEN**(서버 requireActiveSupplier 위임). 접근 role 판정에 영향 없음.

---

## 9. route별 R1~R4 판정

| route | 판정 | 근거 | 조치 |
|-------|------|------|------|
| `/account/supplier` (dashboard) | **R1** | canonical SupplierDashboardPage 완전 상위(Promise.allSettled 실패격리·재시도, 링크 전부 /supplier/*). account는 에러계약 약함·고유기능 0 | `→ /supplier/dashboard` Navigate replace |
| `/account/supplier/orders/:id` | **R1** | 이미 double-mount·pathname-aware·`/supplier/orders/:id` 동작 | `→ /supplier/orders/:id` (단 §8 백엔드 fulfillmentUrl lockstep) |
| `/account/supplier/inventory` | **R1** | 동일 파일 double-mount·pathname-aware·`/supplier/inventory` 동작 | `→ /supplier/inventory` |
| `/account/supplier/settlements` | **R1** | 동일 파일 double-mount·pathname-aware·`/supplier/settlements` 동작 | `→ /supplier/settlements` |
| `/account/supplier/products` | **R2(lite)** | canonical 기능 상위·구형 고유=HUB 노출상태 배지(표시전용) | HUB 배지 canonical port(또는 의도적 drop) 후 `→ /supplier/products` |
| `/account/supplier/orders` | **R2** | 처리목록(write)이 canonical에 부재·허브와 상보·백엔드 fulfillmentUrl lockstep 필요 | SupplierOrdersListPage `/supplier/orders/manage`로 이관 + 링크/CTA/백엔드 repoint 후 `→ /supplier/orders/manage` |

**R3(당분간 유지)=0, R4(즉시 삭제)=0.** (섬 직접진입 소량 존재 → 삭제 대신 redirect.)

---

## 10. canonical 목표 구조

```text
/supplier/dashboard          (기존)
/supplier/products           (기존 canonical)
/supplier/orders             (읽기 운영 허브 · 유지)
/supplier/orders/manage      (신규 — SupplierOrdersListPage 처리목록 이관 대상)
/supplier/orders/:id         (기존 double-mount)
/supplier/inventory          (기존 double-mount)
/supplier/settlements        (기존 double-mount)

# 은퇴(redirect replace)
/account/supplier            → /supplier/dashboard
/account/supplier/products   → /supplier/products
/account/supplier/orders     → /supplier/orders/manage
/account/supplier/orders/:id → /supplier/orders/:id
/account/supplier/inventory  → /supplier/inventory
/account/supplier/settlements→ /supplier/settlements
```

원칙: 삭제보다 redirect / canonical=`/supplier/*` / 기능 손실 없는 최소 통합. 이번 IR에서는 구현하지 않는다.

---

## 11. 기능 이관 필요 목록 (R2)

1. **주문 처리목록 이관**: `SupplierOrdersListPage` → `/supplier/orders/manage`(신규 route). 내부 상세링크 `/account/supplier/orders/:id`(L189,362) → `/supplier/orders/:id` repoint. 허브 CTA SupplierOrdersPage.tsx:180 `/account/supplier/orders` → `/supplier/orders/manage` repoint.
2. **백엔드 fulfillmentUrl lockstep**: `supplier-unified-order.service.ts:138` `/account/supplier/orders/${id}` → `/supplier/orders/${id}` (또는 redirect가 :id 커버). 프론트-only 변경으로는 못 잡는 서버 생성값이므로 필수.
3. **products HUB 배지 port**: SupplierProductsListPage의 `getHubStatus`(supplier_inactive)·"HUB 노출 N개" 표시를 canonical SupplierProductsPage에 소폭 이식(또는 의도적 drop 결정).

---

## 12. redirect 보존 목록 (R1 — 기능 이관 불필요)

`/account/supplier`(→dashboard) · `/account/supplier/orders/:id`(→/supplier/orders/:id) · `/account/supplier/inventory` · `/account/supplier/settlements`. 모두 canonical 대응 route가 이미 동작 → `<Navigate replace>` 만으로 안전(북마크 보존).

---

## 13. Shared Module Protocol 영향

- role constants(`SUPPLIER_ROLES`/`SUPPLIER_ACCESS_ROLES`)는 **web-neture 로컬**(services/web-neture/src/lib/role-constants.ts) — 수정해도 타 서비스 ripple 0. (이번/후속 모두 role constants 미수정.)
- 공유 import는 `hasAnyRole`(`@o4o/auth-utils`)뿐 — 미변경.
- 후속 구현은 **`services/web-neture` 내부 + 백엔드 fulfillmentUrl 1줄(apps/api-server)** 로 완결 가능. account-ui/공통 route helper/notification routing 공통모듈 무접촉 → **SMP 광범위 게이트 불발동**(단 백엔드 1줄은 web-neture-neture 계약 범위).

---

## 14. 후속 구현 WO 범위

§13(중지) 조건 미해당 → BLOCKED 아님:
- account 고유 mutation(updateOrderStatus) 계약 명확(PATCH /neture/supplier/orders/:id/status·문서화).
- 프로덕션 알림 account URL 대량 사용 없음(백엔드 1 read-model 필드).
- 공통 component의 pathname 강결합 없음(double-mount는 pathname-aware 깔끔 계약).
- 권한 차이 없음(양 트리 동일).
- 다른 세션의 route 파일 수정 없음(preflight: otc/hff 파일만 modified).

권장 분할(§16 — 주문 이관이 백엔드 접촉이라 분리):

1. **WO-O4O-NETURE-SUPPLIER-ORDER-ROUTE-CANONICALIZATION-V1** — 처리목록 `/supplier/orders/manage` 이관 + 내부 상세링크 repoint + 허브 CTA repoint + 백엔드 fulfillmentUrl lockstep. (R2·백엔드 접촉·먼저 수행)
2. **WO-O4O-NETURE-SUPPLIER-ACCOUNT-ROUTE-LEGACY-REDIRECT-V1** — products HUB 배지 port(또는 drop) + 6개 `/account/supplier/*` Navigate replace redirect. (프론트-only·주문 이관 후 수행)

(작은 route별 과분할 지양. 주문 이관 규모가 작다고 판단되면 단일 WO-...-ACCOUNT-ROUTE-TREE-CANONICALIZATION-V1로 병합 가능하나, 백엔드 lockstep 존재로 2분할 권장.)

---

## 15. 변경 없음 선언

```
route 추가/삭제 0 · redirect 추가 0 · component 이동 0 · menu 변경 0 · CTA 수정 0
role constants 수정 0 · notification routing 수정 0 · DB write 0 · migration 0 · 배포 0
```

read-only 조사만 수행. 프로덕션 로그 조회는 read-only(SELECT 성격), 개인정보/주문 상세 미출력.

---

## 부록. 부수 발견(범위 밖 · 후속 후보, 본 IR 수정 안 함)

- **bulkDelete 경로 버그**: `lib/api/supplier.ts:732` `api.delete('\neture\supplier\products\bulk', …)` — 백슬래시 문자열 리터럴로 정상 엔드포인트(`/neture/supplier/products/bulk`) 아님. bulk delete 실행 시 load-bearing. 별도 버그 WO 후보.
- **dangling redirect**: App.tsx:1164 `/workspace/supplier/requests → /supplier/requests`(대상 route 부재). minor.
- **SupplierAccountLayout 사이드바 3/6 노출**: inventory·settlements는 사이드바 미노출(대시보드 카드/직접 URL로만 도달) — 섬 은퇴 시 무영향.

---

*결과: READY_FOR_CANONICALIZATION · R1 4개(dashboard·orders/:id·inventory·settlements)=순수 redirect · R2 2개(orders 처리목록 이관+백엔드 lockstep·products HUB 배지 port) · R3/R4 0 · 알림 account URL 0 · guard 동일·loop 0 · SMP 로컬 · 후속 2 WO · 코드/DB/배포 변경 0*
