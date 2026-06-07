# IR-O4O-OPERATOR-ORDER-SETTLEMENT-SURFACE-AUDIT-V1

> **유형:** Read-only Investigation Report (조사 전용)
> **상태:** 조사 완료 — 코드/UI/route/menu/API/DB 무수정
> **작성:** 2026-06-07
> **선행:** [IR-O4O-OPERATOR-UX-CROSSSERVICE-RECHECK-V1](IR-O4O-OPERATOR-UX-CROSSSERVICE-RECHECK-V1.md) P0
> **목적:** O4O 운영자 영역의 주문/정산 mock·TODO·하드코딩 sample·죽은 action surface를 조사하고, 실서비스에서 노출되면 안 되는 가짜 데이터/미구현 흐름을 정리할 후속 WO 범위를 확정

---

## 1. 조사 개요

선행 RECHECK IR에서 주문/정산 계열에 mock/TODO live surface가 잔존(분류 E)함이 드러나, 본 IR로 정밀 감사한다. 핵심 질문은 **"운영자가 실서비스에서 가짜 주문/정산 데이터를 보거나, 작동하는 것처럼 보이지만 동작하지 않는 버튼을 누르게 되는 화면이 어디인가"** 이며, 각 surface의 **프론트 데이터 출처 / action 연결 / backend API 실재 / 메뉴 노출**을 교차 확인해 분류(A~G)했다.

**핵심 결론(요약):**
- **가장 위험한 surface는 K-Cosmetics `OrdersPage`** — 실제 매장명·금액이 박힌 **하드코딩 가짜 주문 5건**을 운영자 메뉴(`/operator/orders`)에 정상 기능처럼 노출한다. backend operator 주문 API는 부재. → **E + F, 즉시 차단 필요.**
- **GlycoPharm `OrdersPage`** — 실 API client를 호출하지만 backend가 **legacy stub(빈 배열 + "migration in progress" notice)** 이라 항상 0건을 보여주고, bulk/row action(확인/배송/취소/송장)은 전부 `// TODO` no-op. 가짜 데이터는 아니나(빈 화면) **죽은 버튼 + 미구현을 정상 기능처럼 노출**. → **E + F.**
- **Neture operator 주문** — 실 API(`/neture/operator/orders`, `neture_orders` 조회) view-only. 가짜 데이터 없음, action 없음. → **A(정상).** 정산은 admin 전용·실 API.
- 정산/인보이스는 GlycoPharm·K-Cosmetics·Neture 모두 **operator 메뉴에서는 거의 정리됨**(admin 전용 또는 부재). 잔존 mock은 GlycoPharm `SettlementsPage`(admin 전용, 100% mock) 1건.

> 📌 **선행 IR 정정:** RECHECK IR는 GlycoPharm `SettlementsPage`를 operator-노출 E로 분류했으나, 실제로는 `WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-CLEANUP-V1`로 **`/admin/*` (admin 전용)** 이며 operator 메뉴에 없다. operator-노출 위험은 **`OrdersPage`** 다.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `2a09cd6bc` (선행 IR commit) |
| `git status --short` | (clean) |
| origin/main ahead/behind | `0 / 0` (push 완료 후 동기화) |
| 다른 세션 WIP | 없음 |
| 조사 기준 commit | **`2a09cd6bc`** |

> 본 조사 중 어떤 파일도 수정/삭제하지 않았다. 본 IR 문서 1개만 신규 생성.

---

## 3. 조사 대상 서비스 / 파일

| 서비스 | 주문 화면 | 정산/인보이스 화면 |
|--------|-----------|---------------------|
| GlycoPharm | `pages/operator/OrdersPage.tsx` | `SettlementsPage`/`InvoicesPage`/`BillingPreviewPage`/`ReportsPage`/`AiBillingPage` |
| K-Cosmetics | `pages/operator/OrdersPage.tsx` | (operator 부재) / store `StoreRevenueSummaryPage`(참고용, operator 아님) |
| Neture | `pages/operator/OrdersManagementPage.tsx` | `pages/admin/AdminSettlementsPage`·`AdminPartnerSettlementsPage`(admin 전용) |
| KPA-Society | (operator 주문/정산 surface 없음) | — |

**Backend (apps/api-server):**
- `routes/glycopharm/controllers/operator.controller.ts` (recent-orders stub), `pharmacy.controller.ts`, `invoice.controller.ts`
- `routes/cosmetics/controllers/cosmetics-order.controller.ts` (store-scope orders), `operator-dashboard.controller.ts`
- `modules/neture/controllers/operator-dashboard.controller.ts` (`/operator/orders` 실 구현), `supplier-order.controller.ts`, `admin-settlement.controller.ts`

**프론트 API client:** GlycoPharm `src/api/glycopharm.ts`·`@/lib/apiClient`, K-Cos `src/lib/apiClient`·`src/api/storeOrders.ts`, Neture `src/lib/apiClient`·`src/lib/api/admin.ts`

---

## 4. GlycoPharm 주문/정산 surface 현황

| 화면 | 데이터 출처 | action | 메뉴 노출 | backend | 판정 |
|------|-------------|--------|-----------|---------|:---:|
| **OrdersPage** (`/operator/orders`) | 실 client `glycopharmApi.getOperatorOrders()` → `GET /glycopharm/operator/recent-orders` **= legacy stub(빈 배열 + notice)** | bulk 확인/배송/취소 = `// TODO: wire up order status API` no-op (line 355/363/371). row 확인/배송/송장/취소 = onClick 없음(line 468~471). selectable=true(연결됐으나 동작 없음) | ✅ operator 메뉴(`orders` 그룹, line 57) | order status API **부재** | **E + F** |
| **AiBilling** (`/operator/ai-billing`) | 실 API `/api/ai/admin/billing` (생성/확정/지급/조정/CSV 전부 wired) | 전부 실 연결 | ✅ operator 메뉴(`analytics`, line 92) | 존재 | **A** |
| **운영 분석** (`/operator/analytics`) | (본 IR 범위 밖, 별도 점검) | — | ✅ operator 메뉴(line 93) | — | (미확인) |
| SettlementsPage (`/admin/settlements`) | **`sampleSettlements` 하드코딩 + 통계 하드코딩**, API 0 | 헤더/행 버튼 전부 no-op | ❌ admin 전용(operator 메뉴 제거됨) | 부재 | **E**(admin) |
| InvoicesPage (`/admin/invoices`) | 실 API `/glycopharm/invoices*` (create/confirm/send/received/dispatch-log) | 전부 wired | ❌ admin 전용 | 존재(admin scope) | **A**(admin) |
| BillingPreview (`/admin/billing-preview`) | 실 API `/glycopharm/billing/preview/consultation` | preview-only(의도) | ❌ admin 전용 | 존재 | **A**(admin) |
| ReportsPage (`/admin/reports`) | 실 API `/glycopharm/reports/consultation` | functional | ❌ admin 전용 | 존재 | **A**(admin) |

**핵심:** operator-노출 위험은 **OrdersPage 단독**. backend stub이라 데이터는 빈 화면(가짜 아님)이지만, **죽은 action 버튼 + "준비중" 표시 없는 정상 기능 외관**이 문제. 정산 계열 mock(SettlementsPage)은 admin 전용으로 격리되어 operator-노출 위험은 없으나 mock 자체는 잔존.

**증거:** `operator.controller.ts:80-92` — `router.get('/recent-orders', ...)` 가 `orders: []` + `_notice: 'Order system migration in progress. Orders will be available via E-commerce Core.'` 반환. 헤더 주석 line 10 `recent-orders — Legacy stub (E-commerce Core 미통합)`. `pharmacy.controller.ts:183` 도 동일 notice.

---

## 5. K-Cosmetics 주문/정산 surface 현황

| 화면 | 데이터 출처 | action | 메뉴 노출 | backend | 판정 |
|------|-------------|--------|-----------|---------|:---:|
| **OrdersPage** (`/operator/orders`) | **100% 하드코딩 mock 배열**(line 22~28): `'뷰티랩 강남점' ₩1,250,000 배송중` 등 실제처럼 보이는 가짜 주문 5건. `api` import 자체가 없음 | DataTable에 action/rowClick/selectable 전부 없음. 필터 버튼은 in-memory mock만 필터 | ✅ operator 메뉴(`orders`, line 43) + 대시보드 링크(line 26) | operator 주문 API **부재**(`/cosmetics/orders`는 store-scope 전용) | **E + F (최고 위험)** |
| 정산/인보이스/빌링 | — | — | — | — | **부재** (line 621 `Deprecated routes removed (inventory, settlements, analytics, marketing)`) |
| (참고) store `StoreRevenueSummaryPage` | `/cosmetics/orders` 기반 참고용 매출 요약 | — | store 영역(operator 아님) | — | **G/D** (주석에 "실제 정산/인보이스 아님, IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1에서 설계 예정" 명시) |

**핵심:** **본 IR에서 가장 위험한 단일 surface.** 운영자가 `/operator/orders`에서 **실제 매장명·금액이 박힌 가짜 주문**을 보고 실데이터로 오인할 수 있다(필터·통계 카드까지 mock 기반). backend operator 주문 API 부재이므로 실연결도 불가. "준비중" 표시 없음.

**증거:** `OrdersPage.tsx:22-28` 하드코딩 배열, line 6 주석 `* mock data, ...`. `App.tsx:618` 라우트 wired, `operatorMenuGroups.ts:43` 메뉴 노출. `App.tsx:621` 정산/분석 라우트 제거 주석.

---

## 6. Neture 주문/정산 surface 현황

| 화면 | 데이터 출처 | action | 메뉴 노출 | backend | 판정 |
|------|-------------|--------|-----------|---------|:---:|
| **OrdersManagementPage** (`/operator/orders`) | **실 API** `api.get('/neture/operator/orders')` → `operator-dashboard.controller.ts:328` `neture.neture_orders` 조회 (페이지네이션/상태/검색 실동작) | **view-only**(action·selectable 없음 — 의도) | ✅ operator 메뉴(`orders`, line 69) | **존재**(실 구현, `.catch(()=>[])` migration 방어) | **A** |
| AdminSettlements (`/admin/settlements`) | 실 API `/neture/admin/settlements*`(calculate/approve/pay/cancel) | 전부 wired | ❌ admin 전용(`adminOnly:true`) | 존재 | **A**(admin) |
| AdminPartnerSettlements (`/admin/partner-settlements`) | 실 API `/neture/admin/partner-settlements*` | wired | ❌ admin 전용 | 존재 | **A**(admin) |
| operator 정산/인보이스/payout | — | — | ❌ 부재(의도 — 정산 상세는 admin, operator는 대시보드 요약만) | — | **D**(설계상 분리) |

**핵심:** Neture operator 주문은 **실 API view-only로 정상(A)**, 가짜 데이터·죽은 버튼 없음. 정산은 admin 전용 실 API로 올바르게 격리. supplier/partner 주문·정산은 별도 공간(`/supplier/*`)으로 operator 혼입 없음(경계 정책 준수). 

> ⚠️ 단, `neture_orders` 마이그레이션이 prod에 존재하지 않을 수 있어(코드에 `.catch` 방어 + 주석 "neture_orders migration 미존재 방어") 현재 운영 DB에서는 **빈 목록**일 수 있음. 가짜 데이터는 아니므로 위험은 낮으나, 마이그레이션 적용 상태는 별도 확인 권장(본 IR 범위 밖).

> 📌 **backend agent 정정:** 1차 backend 조사는 Neture `/operator/orders`를 "부재"로 보고했으나, 실제로는 `operator-dashboard.controller.ts:11,328`에 실 구현이 존재한다(전용 orders 컨트롤러가 아닌 dashboard 컨트롤러에 위치하여 누락됐던 것). 본 IR은 실재로 확정.

---

## 7. KPA 주문/정산 surface 현황

KPA-Society operator 영역에는 **주문/정산/인보이스/payout 화면이 없다**(약사회 SaaS 도메인 특성 — 커뮤니티/분회/콘텐츠 중심). 이벤트 오퍼·상품 신청 승인은 있으나 주문/정산 surface는 아님. → 본 IR 대상 외, 위험 없음.

---

## 8. menu / route 정합

| 서비스 | path | route wired | 메뉴 노출 | 실 기능 여부 |
|--------|------|:---:|:---:|------|
| GlycoPharm | `/operator/orders` | ✅ | ✅ | ❌ stub(빈) + TODO action |
| GlycoPharm | `/operator/ai-billing` | ✅ | ✅ | ✅ 실 |
| GlycoPharm | `/admin/settlements` | ✅ | admin only | ❌ mock |
| GlycoPharm | `/admin/invoices`·`/admin/billing-preview`·`/admin/reports` | ✅ | admin only | ✅ 실 |
| K-Cosmetics | `/operator/orders` | ✅ | ✅ | ❌ **mock(가짜 데이터)** |
| Neture | `/operator/orders` | ✅ | ✅ | ✅ 실(view-only) |
| Neture | `/admin/settlements`·`/admin/partner-settlements` | ✅ | admin only | ✅ 실 |

**판정:** dead route(404)는 없음 — 모든 노출 메뉴는 route·컴포넌트가 연결됨. 그러나 **GlycoPharm·K-Cosmetics의 `/operator/orders`는 "route는 있으나 실 기능 없음"** — RECHECK IR 분류상 위험 surface(E). "메뉴는 있으나 mock/TODO 화면" = K-Cos Orders(mock), GP Orders(stub+TODO).

---

## 9. mock / TODO / sample / no-op surface 목록

| # | 서비스 | 파일:위치 | 유형 | 내용 |
|---|--------|-----------|------|------|
| 1 | K-Cosmetics | `OrdersPage.tsx:22-28` | **하드코딩 mock 데이터** | 가짜 주문 5건(실 매장명/금액), API import 없음 |
| 2 | K-Cosmetics | `OrdersPage.tsx:103-124` | 하드코딩 통계 | mock 배열 기반 stats 카드 |
| 3 | GlycoPharm | `OrdersPage.tsx:355,363,371` | **TODO no-op** | bulk 확인/배송/취소 `// TODO: wire up order status API` |
| 4 | GlycoPharm | `OrdersPage.tsx:468-471` | no-op | row action 버튼에 onClick 없음 |
| 5 | GlycoPharm | `api-server operator.controller.ts:80-92` | **backend stub** | recent-orders 빈 배열 + migration notice |
| 6 | GlycoPharm | `SettlementsPage.tsx:46-114` | **하드코딩 mock** | sampleSettlements + 통계, 헤더/행 버튼 no-op (단 admin 전용) |

> Neture·KPA에는 주문/정산 mock/TODO/no-op surface 없음.

---

## 10. 실제 API / client 연결 여부

| 서비스 | operator 주문 list | 주문 상태변경(확인/배송/취소) | operator 정산 |
|--------|:---:|:---:|:---:|
| GlycoPharm | client 있음 → **backend stub(빈)** | **부재** (UI는 TODO) | 부재(operator) / invoices·billing은 admin 실 |
| K-Cosmetics | **client 없음** (mock) / operator API 부재 | 부재 | 부재 |
| Neture | **실 연결** (view-only) | 부재(operator는 요약만, 상태변경은 supplier scope) | admin 실 (operator 부재 — 설계상) |

---

## 11. backend / API contract 차이

- **GlycoPharm:** `/glycopharm/operator/recent-orders` = legacy stub. 주문 상태변경 operator 엔드포인트 부재. 주문은 E-commerce Core(`checkoutService.createOrder`, OrderType=RETAIL+serviceKey)로 생성되나 **operator 조회/상태변경 계약 미통합**. invoices는 존재하나 operator scope 아님.
- **K-Cosmetics:** operator 주문 엔드포인트 자체가 부재. `/cosmetics/orders`는 store-owner scope 전용(`cosmetics-order.controller.ts`). operator dashboard는 KPI만 반환하며 `orderMetricsReady` 플래그로 backend 부재를 신호.
- **Neture:** operator 주문 엔드포인트 **존재**(`operator-dashboard.controller.ts:328`, `neture_orders` 조회, view-only). 정산은 admin scope 존재. 상태변경은 supplier scope.

**판정:** GlycoPharm·K-Cosmetics 주문은 **UI를 실 기능으로 노출하기 전에 backend 계약 정리/구현이 선행(F)** 되어야 한다. Neture는 계약 정합(A).

---

## 12. 위험도 분류

분류 키: **A** 실 API·운영 가능 / **B** UI 편차만(실 API 연결) / **C** API 있으나 wrapper 정리 / **D** 도메인 차이 유지 / **E** mock/TODO live surface 위험 / **F** backend contract 부재(UI 정리 전 backend 선행) / **G** 별도 채팅방.

| # | surface | 분류 |
|---|---------|------|
| 1 | **K-Cosmetics `OrdersPage`** (가짜 주문 노출) | **E + F** |
| 2 | **GlycoPharm `OrdersPage`** (stub 빈 + TODO action) | **E + F** |
| 3 | GlycoPharm `SettlementsPage` (mock, admin 전용) | **E** (operator-노출 아님 → 우선순위 낮음) |
| 4 | Neture operator 주문 (실 view-only) | **A** |
| 5 | GlycoPharm AI 정산 (`/operator/ai-billing`) | **A** |
| 6 | GlycoPharm invoices/billing/reports (admin, 실) | **A** |
| 7 | Neture admin 정산 | **A** |
| 8 | Neture operator 정산 부재(설계상 admin 분리) | **D** |
| 9 | K-Cosmetics 정산/인보이스 부재 | **D**(미설계) / 향후 F |
| 10 | K-Cos store `StoreRevenueSummaryPage`(참고용) | **G** |
| 11 | 주문 상태변경 operator API(GP/K-Cos) | **F** |

---

## 13. 즉시 정리 가능한 화면 (프론트 단독, backend 무관)

1. **K-Cosmetics `OrdersPage`** — 하드코딩 가짜 주문(line 22~28)·mock 통계 제거. 즉시: (a) operator 메뉴에서 `orders` 항목 숨김, 또는 (b) 화면을 명시적 "준비중(empty state)"로 전환. **가짜 데이터 노출 제거가 최우선.**
2. **GlycoPharm `OrdersPage`** — 죽은 action(bulk TODO + row no-op 버튼)을 숨기거나 비활성+"준비중" 표기. 데이터는 이미 빈 화면(stub)이므로 액션 외관만 정리하면 오인 위험 제거.
3. (선택) **GlycoPharm `SettlementsPage`** — admin 전용이나 mock 잔존. admin도 가짜 정산을 보지 않도록 "준비중" 전환 또는 InvoicesPage로 흡수 검토.

---

## 14. 준비중 처리 또는 메뉴 숨김이 필요한 화면

| 화면 | 권장 처리 | 근거 |
|------|-----------|------|
| K-Cos `/operator/orders` | **메뉴 숨김 또는 준비중 empty-state** | backend operator 주문 API 부재(F), 현재 가짜 데이터(E) |
| GP `/operator/orders` | **action 숨김 + 준비중 표기** (메뉴 유지 가능 — 빈 목록은 안전) | stub 빈 데이터는 안전하나 action 미구현(E), status API 부재(F) |
| GP `/admin/settlements` | 준비중 또는 InvoicesPage 흡수 | mock(E), admin 전용 |

> CLAUDE.md "route 없는 메뉴 노출 금지 / route 있는 실기능 메뉴 숨김 금지" 원칙: 위 화면들은 route는 있으나 **실기능이 아니므로** 숨김/준비중이 원칙 위반이 아니라 정합이다.

---

## 15. 실제 API 연결 WO가 필요한 화면 (backend 선행)

1. **GlycoPharm operator 주문** — `GET /glycopharm/operator/orders`(E-commerce Core 조회) + `PATCH .../orders/:id/status`(확인/배송/취소) 구현 후 OrdersPage 실연결.
2. **K-Cosmetics operator 주문** — `GET /cosmetics/operator/orders` + 상태변경 구현 후 OrdersPage 실연결(현 store-scope `/cosmetics/orders` 재사용 여부는 boundary 검토 — `storeId` vs operator scope).
3. **(향후) K-Cosmetics 정산/인보이스** — `IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1`(이미 참조됨) 설계 완료 후.

> 주문 상태변경은 §4 E-commerce Core 계약(OrderType 불변, `checkoutService.createOrder`) 및 Boundary Policy(Commerce=`storeId`)와 정합해야 하므로, operator scope에서 store 주문을 조회·변경하는 권한 경계 설계가 선행되어야 한다.

---

## 16. 후속 WO 후보

- **WO 후보 1 (즉시, 프론트 단독):** `WO-O4O-OPERATOR-ORDER-MOCK-SURFACE-GUARD-V1` — K-Cos OrdersPage 가짜 데이터 제거(메뉴 숨김 or 준비중), GP OrdersPage 죽은 action 숨김 + 준비중. 가장 위험한 노출 즉시 차단.
- **WO 후보 2 (backend 선행):** `WO-O4O-OPERATOR-ORDER-API-CONTRACT-V1` — GP/K-Cos operator 주문 조회·상태변경 엔드포인트 설계·구현(E-commerce Core·Boundary 정합). 완료 후 OrdersPage 실연결.
- **WO 후보 3 (정리):** GP `SettlementsPage` mock 제거 또는 InvoicesPage 흡수.
- **별도 IR:** K-Cos 정산/인보이스 데이터 모델(`IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1`) 진행 여부 확인.
- **확인 항목:** Neture `neture_orders` prod 마이그레이션 적용 상태(빈 목록 원인 점검).

---

## 17. Current Structure vs O4O Philosophy Conflict Check

| 점검 항목 | 결과 |
|-----------|------|
| 운영자가 가짜 데이터/죽은 버튼을 보게 되는 구조가 O4O 운영 신뢰성과 충돌하는가 | **YES (2건).** K-Cos OrdersPage(가짜 주문)·GP OrdersPage(죽은 action)가 운영자에게 "작동하는 기능"으로 보임 → 신뢰성 충돌. 즉시 차단 대상. |
| 주문/정산 화면이 실제 업무 흐름과 맞는가 | **부분.** Neture·GP admin invoices/billing·GP AI정산은 실 흐름(A). GP/K-Cos operator 주문은 backend 미통합으로 실 흐름 부재(E/F). |
| mock/TODO 상태라면 공개 운영자 메뉴에서 숨기거나 준비중으로 표시해야 하는가 | **YES.** §14 — K-Cos Orders는 숨김/준비중, GP Orders는 action 숨김+준비중 필요. route 있으나 실기능 아닌 surface 숨김은 CLAUDE.md 원칙에 정합. |
| UI 공통화보다 backend contract 정리가 먼저 필요한가 | **YES (주문 한정).** GP/K-Cos operator 주문은 backend 계약(F)이 선행되어야 UI 실연결 가능. UI 공통화(DataTable 이행 등)는 그 다음. |
| Store Hub / My Store / Supplier 영역을 운영자 공통화에 섞지 않았는가 | **YES, 잘 분리됨.** Neture supplier 주문·정산은 `/supplier/*` 별도, K-Cos 매출 요약은 store 영역(참고용, "실 정산 아님" 명시). operator 주문 surface에 혼입 없음. |

**결론:** operator 주문/정산 영역의 위험은 **K-Cosmetics(가짜 데이터)·GlycoPharm(죽은 action) `OrdersPage` 2건에 집중**되며, 정산/인보이스는 admin 전용 격리 또는 실 API로 대체로 안전하다(잔존 mock은 GP admin SettlementsPage 1건). **즉시 조치는 프론트 단독으로 가능**(가짜 노출 차단), **실 기능화는 backend 주문 계약(F) 선행**이 필요하다. 이는 "운영자가 실데이터를 신뢰하고 판단·조작한다"는 O4O 운영 신뢰성 원칙과 직접 충돌하는 surface를 먼저 닫는다는 점에서 P0로 타당하다.

---

## 최종 보고 요약

- **수정 파일:** 없음 (read-only 준수). 본 IR 1개 문서만 신규 생성.
- **생성 IR 경로:** `docs/investigations/IR-O4O-OPERATOR-ORDER-SETTLEMENT-SURFACE-AUDIT-V1.md`
- **조사 기준 commit:** `2a09cd6bc`
- **git status:** clean (조사 전후 변경 없음, IR 미커밋)
- **서비스별 주문/정산 현황:** K-Cos Orders=가짜 mock(E+F) · GP Orders=stub빈+TODO action(E+F) · Neture Orders=실 view-only(A) · 정산은 admin 전용/부재로 대체로 안전(GP admin Settlements만 mock 잔존).
- **mock/TODO/no-op 목록:** §9 (6건) — K-Cos mock 데이터·통계, GP TODO action·no-op 버튼·backend stub, GP admin Settlements mock.
- **실 API 연결 여부:** §10 — GP/K-Cos operator 주문 API 부재(F), Neture 실 연결(A).
- **즉시 WO 가능:** §13 — K-Cos 가짜 주문 차단, GP 죽은 action 정리(프론트 단독).
- **backend/API 선행 IR 필요:** GP/K-Cos operator 주문 조회·상태변경 계약(F), K-Cos 정산 데이터 모델.
- **메뉴 숨김/준비중 후보:** §14 — K-Cos `/operator/orders`, GP `/operator/orders` action, GP admin Settlements.
- **우선순위:** (1) 가짜/죽은 surface 즉시 차단(WO1, 프론트 단독) → (2) operator 주문 backend 계약(WO2) → (3) mock 정리·정산 데이터 모델 IR.
