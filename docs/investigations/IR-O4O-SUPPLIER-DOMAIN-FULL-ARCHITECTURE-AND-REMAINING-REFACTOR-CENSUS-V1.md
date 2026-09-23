# IR-O4O-SUPPLIER-DOMAIN-FULL-ARCHITECTURE-AND-REMAINING-REFACTOR-CENSUS-V1

> **성격:** INVESTIGATION ONLY — 구현 0 · DB write 0 · migration 0 · 배포 0 · 기존 CHECK 수정 0
> **기준 `origin/main`:** `7d17a1533` (`HEAD == origin/main` · reset/rebase 0 · 타 세션 dirty/untracked 불가침)
> **조사일:** 2026-09-23
> **범위:** Supplier 라는 업무 주체 전체 — A Identity/Business · B Products/Distribution · C Orders/Fulfillment/Inventory/Settlement · D Content · E Business Programs · F Dashboard/Notification/Backend
> **선행 CLOSED(재개 금지):** [`…AI-FIRST-CUTOVER…`](../checks/CHECK-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1.md) · [`…OFFER-FIRST-REALIGNMENT…`](../checks/CHECK-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1.md) · [`…PROMOTION-ADAPTER…`](../checks/CHECK-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md)
> **결론 한 줄:** 제품축은 닫혔다. **남은 가장 큰 구조 문제는 Orders → Fulfillment → Settlement 축이며, 공급자의 주문 처리·정산 파이프라인 전체가 프로덕션에 0건인 `neture_orders` 를 정본으로 읽고 있어 실데이터(`checkout_orders` 23건) 위에서 동작하지 않는다.**

---

# 1. 기준 · 방법

```bash
git fetch origin; git rev-parse HEAD → 7d17a1533 == origin/main
```

- 코드 census: `apps/api-server/src/modules/neture/**`(controller 51 · service 54 · entity 28) · `services/web-neture/src/pages/supplier/**`(29 화면) · `App.tsx` supplier route 39 · store-ai · checkout/cart · market-trial · cosmetics event-offer.
- 프로덕션 read-only SELECT (Cloud SQL Auth Proxy · `o4o_api_v2` · write 0). §8.
- 판정은 "화면이 열린다 / 200 / 테스트 PASS" 가 아니라 **정본 소유·write 경로·실데이터 존재**로 한다.

---

# 2. Supplier 전체 Architecture Map (현재 실제 구조)

```text
User (users) ──1:1?── NetureSupplier (neture_suppliers) ──bridge── Organization (organizations)
   │  service_memberships(neture)          │ user_id: 3건 전부 NULL ⚠        │ organization_id: 3/3 존재
   │  role_assignments                     │ status: ACTIVE 2 / PENDING 1
   ▼
Supplier Workspace (web-neture /supplier/**)
   │
   ├─ B. Products ─ SupplierProductOffer(21) ─┬─ offer_service_approvals(20 · approved only)
   │     (ProductMaster read-only · CLOSED)   ├─ offer_service_prices(1)
   │                                          ├─ service_keys[](20) · is_public(전부 false) · distribution_type(SERVICE 20/PRIVATE 1)
   │                                          └─→ organization_product_listings(44) → Store 노출
   │
   ├─ C. Orders ── ❌ 단절 ──────────────────────────────────────────────
   │     실데이터: checkout_orders 23건(전부 supplierId · created 3 / cancelled 20 · paid 0)
   │     공급자 처리 경로: supplier-order.service · shipment.service · neture-settlement.service
   │                      → 전부 neture_orders / neture_shipments 를 읽는다 → 실데이터 0건
   │     유일한 교차 지점: SupplierUnifiedOrderService (READ ONLY 병합 · 상태전이 없음)
   │
   ├─ D. Content ─ neture_supplier_library_items(0) ─┬─ handoff → cms_contents(authorRole='supplier', pending)
   │                                                 └─ Store Hub adapter (read)
   │     별도 원장: shared_product_descriptions(306,610) · screen-set · signage
   │
   ├─ E. Business Programs (서로 다른 모듈에 산재)
   │     Seller Recruitment → modules/neture (0건)
   │     Market Trial       → controllers/market-trial (market_trials 1 · participants 0)
   │     Event Offer        → routes/cosmetics (checkout_orders metadata.serviceKey='*-event-offer' 8건)
   │
   └─ F. Dashboard(/supplier/dashboard) · Notification(canonical notificationService 재사용)
```

---

# 3. Ownership Matrix

| Resource | SSOT | Supplier write | Operator write | Admin write | Store write |
|---|---|:--:|:--:|:--:|:--:|
| Supplier identity(계정 연결) | `neture_suppliers.user_id` | ✕ | ✕ | ○(승인/정지) | ✕ |
| Supplier status | `neture_suppliers.status` | ✕ | ○ | ○ | ✕ |
| Business profile — 사업자번호·주소 | **`organizations`** | △(프로필 폼 경유) | ✕ | ○ | ✕ |
| Business profile — 사업자유형·개업일 | **`users.businessInfo` JSONB** | △ | ✕ | ○ | ✕ |
| Business profile — 대표자·담당자·업태·세금계산서·정산·배송정책 | **`neture_suppliers`** | ○ | ✕ | ○ | ✕ |
| 공급 예정 품목군 | `neture_supplier_regulated_categories`(7) | ○(신청) | ○(검토) | ○ | ✕ |
| ProductMaster | `product_masters` | **✕(CLOSED)** | ✕ | ○(super_admin) | ✕ |
| SupplierProductOffer | `supplier_product_offers` | ○ | ✕ | ○ | ✕ |
| Service approval | `offer_service_approvals` | ✕(신청만) | ○ | ○ | ✕ |
| Store listing | `organization_product_listings` | ✕ | ○ | ○ | ○ |
| **Order (실데이터)** | **`checkout_orders`** | **✕ (처리 경로 없음)** | ○ | ○ | ○(생성) |
| Order (공급자 코드가 가정하는 원장) | `neture_orders`(0건) | ○ | ○ | ○ | ✕ |
| Shipment | `neture_shipments`(0건) | ○ | ✕ | ○ | ✕ |
| Inventory | `supplier_product_offers.stock_quantity` | ○ | ✕ | ○ | ✕ |
| Settlement | `neture_settlements`(0) ← `neture_orders` | ✕(조회만) | ✕ | ○ | ✕ |
| Supplier Library | `neture_supplier_library_items`(0) | ○ | ✕ | ○ | ✕ |
| Handoff 사본 | `cms_contents` | ✕(생성만) | ○ | ○ | ✕ |
| SPD | `shared_product_descriptions`(306,610) | ○(초안) | ○(검수) | ○ | ✕ |
| Screen Set / Signage | 각 독립 원장 | ○ | ○ | ○ | ○ |
| Recruitment | `seller_recruitments`(0) | ○ | ○(노출) | ○ | ✕(지원) |
| Market Trial | `market_trials`(1) | ○ | ○(decision) | ○ | ✕(참여) |
| Event Offer | cosmetics 모듈 + `checkout_orders` | ○ | ○ | ○ | ○(주문) |

△ = 폼은 공급자가 쓰지만 물리 저장 위치가 공급자 소유 테이블이 아님.

---

# 4. CLOSED — 다시 리팩토링 대상으로 올리지 않을 것

| 항목 | 근거 |
|---|---|
| Supplier → ProductMaster 기준정보 write = 0 | Offer-First CHECK §2 · source-contract spec |
| Supplier HTTP → ProductMaster 직접 create = 0 | `csv-import.service.ts` 파일 삭제 · `POST /supplier/products` 404 |
| Supplier 표면 내부 LLM = 0 | AI 태그·ai-insight 제거 · grep 0 |
| Product 관리 Offer-First(Drawer 4섹션) | 2,079→1,342줄 · `product-detail/` 분해 |
| B2B 별도화면 · Supply Offers 허브 · legacy CSV runtime | 파일 삭제 + redirect |
| ProductImage ownership(자기 `supplier_upload` 만 · canonical primary 409) | Offer-First CHECK §6 |
| store-ai Supplier **write** deny(`render_read` 불변) | `SUPPLIER_WRITE_FORBIDDEN` |
| Candidate → Promotion Core → Master 승격 | Promotion Adapter CHECK |

**이 계약을 침범하는 발견은 §5 에 없다**(침범 0건 확인).

---

# 5. REMAINING — 최신 main 기준 실제 잔여

과거 문서 TODO 복사 아님. 각 항목 `Drift 분류` 포함.

## R1. 공급자 주문 처리·정산 파이프라인이 실데이터 원장과 단절 — `DUPLICATE_SSOT` + `BOUNDARY_VIOLATION` **[최상위]**

| 사실 | 근거 |
|---|---|
| 실제 공급자 주문 데이터는 `checkout_orders` 에만 있다 | 23건 전부 `"supplierId"` NOT NULL · `neture_orders` **0건** |
| 공급자 처리 경로는 `neture_orders` 전용 | `supplier-order.service.ts`(39·77·87·177행 `FROM neture_orders`) · `PATCH /orders/:id/status` · `POST /orders/:orderId/shipment` |
| 배송 원장도 별도 | `shipment.service.ts` → `neture_shipments`(0건) |
| 정산도 `neture_orders` 전용 | `neture-settlement.service.ts` 128·166·221·380행 `JOIN/FROM neture_orders` · `neture_settlements` 0 · `neture_settlement_orders` 0 |
| 유일한 교차 지점은 **읽기 전용** | `SupplierUnifiedOrderService` 헤더: "병합/동기화/상태변경 없음" · `canFulfill`/`readOnlyReason` 필드로 "처리 불가" 를 표현 |
| 서비스 경계는 이미 SSOT 화 | `constants/fulfillment-service-scope.ts` — `neture_orders.service_key` / `checkout_orders.metadata->>'serviceKey'` 두 축을 한 파일에서 관리. 주석에 **"아직 bridge 되지 않은 paid checkout_order"** 명시 |

**귀결:** 공급자는 주문을 **볼 수는 있으나 처리·배송·정산할 수 없다**. 현재 데이터에서 `paid` 주문이 0건(created 3 / cancelled 20)이라 사고로 드러나지 않았을 뿐, 첫 실결제가 발생하면 즉시 dead-end다. `checkout_orders → neture_orders` bridge 가 설계에 존재하나 **구현이 없다.**

## R2. Business Profile 이 3개 원장에 분산 — `DUPLICATE_SSOT`

| 필드군 | 물리 위치 | 근거 |
|---|---|---|
| 사업자번호 · 사업장주소 | `organizations` | `NetureSupplier.entity.ts:85-89` — "intentionally dropped from neture_suppliers by WO-…-DEPRECATION-V1(20260327000300) · now live in organizations · read via `getOrgDataBatch()`" |
| 사업자유형 · 개업일 | `users.businessInfo` JSONB | `supplier-management.controller.ts:293` — "저장 위치: users.businessInfo JSONB — neture_suppliers 컬럼 부재로 인한 결정" |
| 대표자 · 담당자 · 업태 · 세금계산서 · 정산계좌 · 배송정책 | `neture_suppliers` | entity 91~130행 |

하나의 프로필 저장 폼(`PATCH /supplier/profile`)이 **세 테이블에 나눠 쓴다**. 읽기는 `getOrgDataBatch()` 조인 + JSONB 경로. `users.businessInfo` 는 `json`(≠`jsonb`) 이라는 알려진 함정도 있다.

## R3. Supplier ↔ User 연결이 프로덕션에서 끊겨 있다 — `BOUNDARY_VIOLATION`(데이터)

`neture_suppliers` 3건 **전부 `user_id IS NULL`**, 반면 `organization_id` 는 3/3 존재. `users` 는 **1건**. `requireActiveSupplier` 는 `WHERE user_id = $1` 이므로 **현재 어떤 계정도 공급자 업무공간에 진입할 수 없다**(모든 공급자 API 403 `NO_SUPPLIER`). Google Identity 전환·users reset 의 부수 결과로 보이며, 코드 결함이 아니라 **데이터 연결 결손**이다. → 모든 인증 smoke 가 PENDING 인 근본 원인.

## R4. 승인 상태머신이 status 한 종류만 존재 — `NO_ISSUE`(확인 결과)

`offer_service_approvals.approval_status` 는 프로덕션 전량 `approved`(k-cosmetics 1 · kpa-society 1 · pharmacy-hub 18). pending/rejected 경로는 코드에 있으나 데이터 0. Supplier status(`ACTIVE`/`PENDING`) 와 service_membership status(`active`)는 **의미가 다르다**(전자=공급 자격, 후자=서비스 가입). 중복 아님.

## R5. Distribution 축 3중 — `DUPLICATE_SSOT`(경미)

`is_public`(전부 false) · `distribution_type`(SERVICE 20 / PRIVATE 1) · `service_keys[]`(20건 설정) · `offer_service_approvals`(20) 가 공존. `is_public` 은 현재 **어떤 행도 true 가 아니어서** 사실상 사문화됐고, 실제 유통 판정은 `service_keys` + 승인이 한다. `distribution_type` 은 `is_public` 과 의미가 겹친다(`PUBLIC`/`SERVICE`/`PRIVATE`).

## R6. Business Program 3종이 서로 다른 모듈에 산재 — `WRONG_WORKSPACE`

| 프로그램 | 코드 위치 | 원장 | 프로덕션 |
|---|---|---|---|
| Seller Recruitment | `modules/neture/**`(controller+service+entity) | `seller_recruitments` / `_applications` | **0 / 0** |
| Market Trial | `controllers/market-trial/**`(neture 밖) + `extensions/trial-forum-monitor` | `market_trials` 외 4테이블 | 1 / participants 0 / decisions 0 |
| Event Offer | `routes/cosmetics/controllers/event-offer.controller.ts` | 전용 원장 없음 → `checkout_orders.metadata.serviceKey='*-event-offer'` | 8건(k-cosmetics 4 · glycopharm 4) |

세 개가 **다른 사업 프로그램인 것은 맞다**(목적·참가자·산출물이 다름). 문제는 전부 Supplier 메뉴에 나란히 있으면서 소유 모듈·원장 모델이 제각각이고, Event Offer 만 **전용 원장 없이 주문 metadata 에 얹혀 있다**는 점이다.

## R7. Supplier Content handoff 에 중복 방지 없음 — `API_DUPLICATION`(잠재)

`supplier-library-handoff.service.ts` 는 `cms_contents`(authorRole='supplier', status='pending') + `kpa_approval_requests` 를 INSERT 한다. 파일 내 `duplicate`/`already`/`EXISTS` 검사 **0건** — 같은 item+serviceKey 를 두 번 handoff 하면 사본이 2개 생긴다. 현재 `neture_supplier_library_items` 0건이라 실사고는 없다.

## R8. `SupplierProductOffer` 가 6가지 책임을 겸함 — `MIXED_RESPONSIBILITY`(설계 관찰)

공급 선언 · 가격(기본/서비스별/스팟) · 재고(`stock_quantity`/`reserved_quantity`) · 유통범위 · 승인상태 · 콘텐츠(B2C/B2B 설명). 재고는 별도 inventory 테이블 없이 **offer 컬럼이 SSOT**(중복 원장은 없음 — 이 점은 건전). 분할은 현재 21행 규모에서 이득이 없다 → **KEEP**, 단 R1 해결 시 재고 예약(`reserved_quantity`)이 어느 주문 원장과 연동되는지는 반드시 정해야 한다.

## R9. Legacy schema census

| 대상 | 판정 |
|---|---|
| `supplier_csv_import_batches` / `_rows` (0건) | `RUNTIME_RETIRED_SCHEMA_RETAINED` — runtime 코드 삭제 완료. DROP 은 별도 migration WO(급하지 않음) |
| `foreign_visitor_partners` 외 2 (0건) | `LEGACY_SCHEMA_ONLY` — Supplier 축과 무관(외국인 방문객 파트너) · Supplier 미완성 근거 아님 |
| `neture_orders` / `neture_shipments` (0건) | **`RUNTIME_ACTIVE`** — 코드가 현재 이것을 정본으로 읽는다. 0건이라고 DROP 후보 아님(R1 의 대상) |
| `market_trial_forum_sync_failures` | 운영 extension · KEEP |
| `neture_contact_messages`(5) | KEEP |
| `spot_price_policies`(0) | `RUNTIME_ACTIVE` · 사용 0 — 정책 판단 필요(§10) |

## R10. Backend 책임 판정

| 서비스 | 줄 수 | 판정 |
|---|---|---|
| `NetureService` | 574 | `THIN_FACADE` — 위임 위주 · KEEP |
| `SupplierService` | 1,626 | `CANONICAL_DOMAIN_SERVICE`(identity/profile/status/notification) |
| `OfferService` | 2,392 | `MIXED_RESPONSIBILITY` — 단 R8 과 같은 이유로 지금 분할 이득 없음 · KEEP |
| `SupplierUnifiedOrderService` | — | **과도기 bridge** (영구 canonical read model 아님). R1 해결 시 재평가 대상 |
| `supplier-order.service`(223) · `shipment.service` · `neture-settlement.service`(486) | — | `RUNTIME_ACTIVE` · 단 전부 R1 의 잘못된 원장 위 |

Guard 는 `requireLinkedSupplier`(read) / `requireActiveSupplier`(write) 로 **일관**된다 — 조회 route 는 전부 linked, 상태변경은 전부 active. `NO_ISSUE`.

---

# 6. End-to-end Flow 판정

| Flow | 상태 |
|---|---|
| 1 가입→승인→ACTIVE→Workspace | **차단** — `user_id` NULL(R3). 코드 경로는 완성 |
| 2 기존 제품→Offer→서비스 공급→승인→Store 노출 | **정상** — offer 21 · 승인 20 · listing 44 |
| 3 신규 제품→Candidate→Promotion→Offer | **정상**(코드) · 실사용 0(공급자 Candidate 0건) |
| 4 Store 주문→공급자 처리→배송→정산 | **❌ 단절** — R1. 주문은 `checkout_orders` 에, 처리·배송·정산은 `neture_orders` 에 |
| 5 Content→Store Hub→Store copy | 코드 정상 · 실사용 0(library 0건) |
| 6 Content→Operator→검토→서비스 공간 | 코드 정상 · **중복 방지 없음**(R7) |
| 7 Recruitment / Event Offer / Market Trial | 각각 동작 · 모듈 산재(R6) · Event Offer 만 전용 원장 없음 |

---

# 7. 가장 큰 구조 문제 (Q1)

> **Supplier 의 "돈과 물건이 움직이는 축"(주문→배송→정산)이 실데이터 원장과 분리돼 있다.**

제품축은 `ProductMaster ↔ SupplierProductOffer` 로 정본이 하나가 됐지만, 주문축은 `checkout_orders`(실데이터 23건·유일한 생성 경로)와 `neture_orders`(공급자 처리·배송·정산 코드가 읽는 원장·0건)로 **둘이고, 둘을 잇는 bridge 가 없다.** 그 위에 Settlement 가 `neture_orders` 를 조인하므로 정산도 영구히 비어 있다. 현재 무사한 이유는 단지 **paid 주문이 0건**이기 때문이다.

---

# 8. 프로덕션 read-only 핵심 수치 (2026-09-23)

```text
A  neture_suppliers 3 (ACTIVE 2 / PENDING 1) · user_id 0/3 ⚠ · organization_id 3/3
   users 1 · organizations 25 · organization_members 3 · role_assignments 11
   service_memberships 5(전부 active · 서비스별 1) · regulated_categories 7
B  supplier_product_offers 22(alive 21) · offer_service_approvals 20(전량 approved:
     pharmacy-hub 18 · k-cosmetics 1 · kpa-society 1) · offer_service_prices 1
   is_public true 0 · distribution_type SERVICE 20/PRIVATE 1 · service_keys 설정 20
   organization_product_listings 44 · spot_price_policies 0
C  checkout_orders 23 (supplierId 23/23 · created+pending 3 · cancelled+pending 20 · paid 0)
     serviceKey: kpa-groupbuy 6 · pharmacy-hub 6 · k-cosmetics-event-offer 4 ·
                 glycopharm-event-offer 4 · neture 2 · null 1
   neture_orders 0 · neture_shipments 0 · neture_settlements 0 · neture_settlement_orders 0
D  neture_supplier_library_items 0 · shared_product_descriptions 306,610
E  seller_recruitments 0 · applications 0 · market_trials 1 · participants 0 · decisions 0
F  supplier_csv_import_batches 0 · foreign_visitor_partners 0 · neture_contact_messages 5
```

0건을 DELETE 근거로 쓰지 않았다 — R9 판정은 전부 **코드 소비처 기준**이다.

---

# 9. 다음 큰 구현 WO 권고 — **1개**

## 권고: `Supplier Order → Fulfillment → Settlement Canonicalization`

우선순위 기준 §22 의 1·3위(SSOT 경계 위반 · 중복 금전 원장)에 동시에 해당하고, 유일하게 **실사용자 dead-end 로 이어지는** 항목이다.

WO 가 답해야 할 것(구현 전 정책 결정 포함):

1. **canonical 주문 원장 확정** — (a) `checkout_orders` 단일 정본 + `neture_orders` 은퇴 (b) `checkout_orders`=주문/결제 정본 · `neture_orders`=fulfillment 원장 + **bridge 구현** 중 택일. 현재 코드 주석은 (b) 를 가정하나 bridge 가 없다.
2. 선택한 모델로 `supplier-order.service` · `shipment.service` · `neture-settlement.service` 의 읽기/상태전이 대상 정렬.
3. `SupplierUnifiedOrderService` 의 운명 — bridge 완성 후 read model 로 축소할지, 제거할지.
4. `reserved_quantity` 예약이 어느 원장의 어느 상태전이에 묶이는지(R8).
5. Settlement 가 참조할 주문 ID 정본 1개 확정.
6. B2B 수금 모델(온라인 결제 / 후불·인보이스) 은 **사업 결정** — 코드가 임의로 정하지 않도록 WO 에서 사용자 승인 항목으로 분리.

**다음 순위(이번에는 제안하지 않음):** R2 Business Profile 3원장 통합 · R6 Business Program 모듈 정렬. 둘 다 실사용 데이터가 0~소량이라 R1 뒤로 미루는 것이 맞다.

---

# 10. 정책 결정 / STOP 필요 항목

| # | 항목 | 왜 사용자 판단인가 |
|---|---|---|
| P1 | 주문 정본 모델 (a)/(b) | 데이터 모델 + 사업 운영 방식 결정. 코드가 정할 수 없다 |
| P2 | B2B 수금 모델(선결제/후불/인보이스/오프라인) | 결제·정산·법률 경계 |
| P3 | `neture_suppliers.user_id` 3건 NULL 복구 | 운영 DB write(UPDATE) — 승인 필요. 이것 없이는 어떤 공급자 smoke 도 불가 |
| P4 | Business Profile 3원장 통합 방향 | `organizations` 로 모을지, `neture_suppliers` 로 되돌릴지 = 조직 모델 결정 |
| P5 | `spot_price_policies`(0건) · `is_public`(전부 false) 존치 여부 | 사업 기능 유지/폐기 판단 |
| P6 | `supplier_csv_import_*` 물리 DROP 시점 | migration + 대량 삭제 정책 |

---

# 11. Drift 분류 요약

```text
BOUNDARY_VIOLATION     R1(주문 처리 경로) · R3(데이터 연결 결손)
DUPLICATE_SSOT         R1(주문 원장 2개) · R2(프로필 3원장) · R5(유통 축 3중)
DUPLICATE_STATE_MACHINE  없음 — 확인 결과 Supplier/membership/approval 은 의미가 다름(R4)
LEGACY_RUNTIME         없음 — CSV·P3·내부 AI 는 CLOSED 에서 제거 완료
LEGACY_SCHEMA_ONLY     R9 (csv_import · foreign_visitor_partner*)
WRONG_OWNER            없음
WRONG_WORKSPACE        R6 (Business Program 3종 모듈 산재)
UI_DUPLICATION         없음 — Offer-First 에서 해소
API_DUPLICATION        R7 (handoff 중복 방지 부재)
NAMING_DRIFT           seller/supplier/store — Legacy Partner 은퇴 후 `seller_recruitments` 명칭만 잔존(기능은 Supplier→Store 모집 · 실해 없음)
NO_ISSUE               R4 · guard 체계 · inventory SSOT · R8(현 규모)
```

---

# 12. 문서 정합 · Git

`발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`(§9)

- 기존 CHECK·WO 수정 0 · 코드 수정 0 · DB write 0 · migration 0 · 배포 0.
- 이 문서만 path-specific commit.
