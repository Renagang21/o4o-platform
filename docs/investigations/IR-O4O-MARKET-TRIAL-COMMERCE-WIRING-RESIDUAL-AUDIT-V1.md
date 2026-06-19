# IR-O4O-MARKET-TRIAL-COMMERCE-WIRING-RESIDUAL-AUDIT-V1

> **유형**: Investigation (read-only) — 유통참여형 펀딩(Market Trial)의 제품화·주문·정산·배송 연결 잔존 배선 전수 조사.
> **성격**: 코드/DB/migration/API/UI **무변경**. 조사·문서화만.
> **기준 문서**: `docs/architecture/O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1.md` (content-only 경계 확정).
> **목적**: 후속 제거/비활성 WO(P0~P3)의 정확한 범위 산정을 위한 근거 확보.
> **작성일**: 2026-06-19

---

## 0. 핵심 결론 (요약)

1. **입력 측(제품 기반 생성)은 잔존이 거의 없다.** WO 가 "잘못된 전제"로 지목한 *"기존 제품을 선택해서 펀딩 생성 / 상품 상세 drawer 진입 / ProductMaster·SPO 기반 생성"* 흐름은 **현재 코드에 사실상 없다**: `market_trials.productId` 는 nullable soft FK(생성 시 필수 아님), `ProductDetailDrawer.tsx` 에 펀딩 진입점 **없음**, 생성 DTO 에 productId 가 있으나 optional.
2. **출력 측(전환·커머스 퍼널)이 진짜 잔존 배선이다.** 펀딩 참여 → 제품 전환 → OPL 매장 진열 → 첫 주문 추적 → 정산 ledger → 결제 → 풀필먼트/배송이 **operator/supplier UI + backend + DB 까지 완전 배선**되어 있다.
3. **일부는 이미 차단됨.** `createListingFromParticipant`(OPL 생성, 409 차단)·`tryConnectOrderToTrial`(checkout 역연결, no-op) 2건은 `WO-O4O-MARKET-TRIAL-CONVERSION-DISABLE-V1` 로 비활성. **단 코드·라우트·DB 컬럼은 잔존** → 완전 제거 후보.
4. **여전히 ACTIVE**: 제품 전환(`convertToProduct`), 정산 state machine, 오프라인 결제 ledger, 풀필먼트 주문 생성·동기화, 배송지 수집, 전환/정산/결제 KPI·퍼널.
5. **Store 서비스(KPA/GP/KCos)는 깨끗.** 이전 `WO-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1` cleanup 이 검증됨. GP 사업안내 **텍스트 언급만** 잔존(C, 저위험).
6. **DB**: 6 테이블 중 5 테이블에 커머스/정산/결제/배송/전환 필드 **약 45개**가 content-only 원칙과 충돌. `market_trial_forums` 만 충돌 0.
7. ⚠️ **정산·결제 ledger 는 별도 WO(OFFLINE-PAYMENT-LEDGER / PAYMENT-READINESS)로 구축된 운영 서브시스템**이다. content-only 전환은 이 전체를 폐기하므로, **운영 데이터 존재 여부 확인(SQL)** 후 P0 차단·제거 순서를 정해야 한다.

---

## 1. 핵심 질문에 대한 답 (WO §4)

| # | 질문 | 답 | 근거 |
|---|------|----|------|
| 1 | 참여자를 제품/상품/매장 진열로 전환하는 코드가 있는가? | **있음(일부 차단)**. `createListingFromParticipant`(차단), `convertToProduct`(ACTIVE) | `marketTrialOperatorController.ts:1100`(409), `:1462` |
| 2 | ProductMaster / SupplierProductOffer 연결 코드가 있는가? | **있음**. `convertToProduct` 가 `supplier_product_offers + product_masters` 조회 후 `convertedProductId` 기록. 생성 측 productId 는 optional | `marketTrialOperatorController.ts:1462,1494-1527` / entity `productId` |
| 3 | OPL 을 생성·갱신하는 코드가 있는가? | **있음(차단)**. `createListingFromParticipant` 가 OPL INSERT(`source_type='market_trial'`) — 현재 409 | `marketTrialOperatorController.ts:1193-1220`(unreachable) |
| 4 | 주문/checkout 에서 market trial 역연결 코드가 있는가? | **있음(차단)**. `tryConnectOrderToTrial` — checkout 후 first_order 승격, 현재 no-op | `checkout.service.ts:191-194`(call), `:544-629`(impl, return@549) |
| 5 | 결제/정산/ledger/오프라인 정산 연결 코드가 있는가? | **있음(ACTIVE)**. 정산 state machine + 오프라인 결제 lifecycle | `marketTrialOperatorController.ts:789-873`(settlement), `:876-1022`(payment), `marketTrialController.ts:656`(choice) |
| 6 | 배송/발송/fulfillment/trial-shipping 코드가 있는가? | **있음(ACTIVE)**. 주문 생성·동기화·배송지 수집 | `trialFulfillment.controller.ts:169,266`, `trialShipping.controller.ts:61` |
| 7 | 운영자/공급자 UI 에 매장 진열·첫 주문·전환·정산·발송 KPI 가 있는가? | **있음**. operator 상세 풀배선 + supplier "매장 진열" KPI | `MarketTrialApprovalDetailPage.tsx`, `SupplierDashboardPage.tsx:145` |
| 8 | 제품 선택/상품 상세 drawer 에서 펀딩 진입 UI 가 있는가? | **없음**. `ProductDetailDrawer.tsx` 에 펀딩 진입점 grep 0 | (Neture FE 조사) |
| 9 | API 계약이 product/offer/listing/order/payment/settlement/shipment id 를 요구·저장하는가? | **일부**. productId(optional)·convertedProductId·listingId·orderId·orderNumber 저장. orderId/orderNumber 는 fulfillment 한정 | entity/DTO `trial.ts` |
| 10 | market_trials/participants 의 content-only 충돌 필드는? | **약 45개** (§5.3) | entity/migration |

---

## 2. 조사 범위 · 키워드

- **Backend**: `apps/api-server/src/controllers/market-trial/*`, `routes/market-trial*`, `jobs/market-trial-lifecycle.job.ts`, `extensions/trial-{fulfillment,shipping,forum-monitor}`, `services/checkout.service.ts`, `modules/store-core/entities/organization-product-listing.entity.ts`, `database/migrations/*MarketTrial*`, `packages/market-trial/src/{entities,dto,types}`.
- **Frontend**: `services/web-neture/src/{pages/market-trial,pages/operator,pages/supplier,api/trial.ts}`; `services/web-{kpa-society,glycopharm,k-cosmetics}`; `packages/{store-ui-core,store-products-ui,shared-space-ui}`.
- **키워드**: marketTrial, market_trial, MarketTrial, createListingFromParticipant, tryConnectOrderToTrial, convertedProductId, customerConversionStatus, settlementStatus, paymentStatus, source_type='market_trial', trial-shipping, trial-fulfillment, 매장 진열, 첫 주문, 전환, 정산, 발송.

---

## 3. 알려진 의심 지점 — 확정 결과 (WO §7)

| 항목 | 파일:line | 현재 호출 | 호출자 | DB 영향(WRITE) | 운영 UI 노출 | 충돌 | 권장 |
|------|-----------|:---:|------|------|:---:|:---:|------|
| `createListingFromParticipant` | `marketTrialOperatorController.ts:1100` | **차단(409)** | operator route | OPL INSERT(`source_type='market_trial'`) — unreachable | 버튼 disabled | YES | **A 제거**(차단 코드+라우트+버튼) |
| `tryConnectOrderToTrial` | `checkout.service.ts:191-194` / `:544-629` | **차단(no-op@549)** | `createOrder()` fire-and-forget | participant→first_order — unreachable | 없음 | YES | **A 제거**(call+impl) |
| `convertToProduct` | `marketTrialOperatorController.ts:1462` | **ACTIVE** | operator route | `market_trials.convertedProductId/Name/Note` WRITE | 상품검색·전환 모달 | YES | **B→A**(차단 후 제거) |
| 오프라인 정산 ledger | `marketTrialOperatorController.ts:789-873` + `marketTrialController.ts:656` | **ACTIVE** | operator/participant route | `settlementStatus/Choice/Amount...` WRITE | 정산 상태 UI·KPI | YES | **B 비활성**(운영데이터 확인) |
| 결제 lifecycle | `marketTrialOperatorController.ts:876-1022` | **ACTIVE** | operator route | `paymentStatus/paidAmount/paidAt...` WRITE | 입금 관리 테이블 | YES | **B 비활성**(운영데이터 확인) |
| trial-fulfillment | `trialFulfillment.controller.ts:169`(createOrder), `:266`(syncStatus) | **ACTIVE** | operator route | `MarketTrialFulfillment`(orderId/status) WRITE, NetureService.createOrder | (배송 백엔드) | YES | **A 제거**(주문 생성=커머스) |
| trial-shipping | `trialShipping.controller.ts:61`(setAddress) | **ACTIVE** | owner/operator route | `market_trial_shipping_addresses` WRITE | 배송지 수집 | YES | **A 제거** |
| operator/supplier "매장 진열" KPI | `getFunnel`(`:448`), `getTrialKpi`(`:476` listingCount), `SupplierDashboardPage.tsx:145` | **ACTIVE** | operator/supplier | READ only | KPI 카드 | YES(표현) | **C 정정**(또는 제거) |
| SPO→OPL conversion usage | OPL writer 유일점 = `createListingFromParticipant`(차단). 나머지 read | — | — | — | — | — | A 와 함께 처리 |

> **참고**: 선행 `IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1` §7 의 DB 실측(production)은 미완(gcloud TCP 차단). 정산·결제 ledger 제거 전 동일 SQL 로 운영 데이터 존재 여부 확인 필요(§8).

---

## 4. Store 서비스(KPA/GP/KCos) 잔존 — CLEAN 확인

| 서비스 | 결과 |
|--------|------|
| **KPA** | route/sidebar/menu 모두 0건 — clean |
| **GlycoPharm** | store-facing 0건. `pages/business/*`(BusinessProducts/Preparation/Hub/Forum/BloodCare) 에 "유통참여형 펀딩 기반 제품 개발" **텍스트 언급만**(C, 저위험, "실행은 Neture" 귀속) |
| **K-Cosmetics** | 0건 — clean |
| **store-ui-core** | `StoreSidebar.tsx` market-trial 아이콘 매핑 없음, `storeMenuConfig.ts` 는 정리 완료 주석만 |
| **shared-space-ui** | `O4OHelpSection.tsx:48-51` cross-service 카탈로그에서 Market Trial 제거 완료. neture guide copy 는 Neture 전용으로 격리 |

→ **이전 `WO-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1` cleanup 검증됨.** Store 측 신규 제거 작업 불필요(GP 텍스트 표현 정리만 선택적 C).

---

## 5. 결과 표 (분류 A/B/C/D)

> **분류 기준**: **A** 즉시 제거(content-only 정면 충돌, 유지 이유 없음) · **B** 비활성화 우선(운영 영향/범위 큼, flag·guard·차단 후 제거) · **C** 표현/이름 정정(실거래 아님, 용어 충돌) · **D** 유지(충돌 없음).

### 5.1 Backend

| 분류 | 영역 | 파일:line | 함수 | 잔존 내용 | 충돌 이유 | 권장 조치 | 우선순위 |
|:--:|------|-----------|------|-----------|-----------|-----------|:--:|
| A | Fulfillment | `trialFulfillment.controller.ts:169` | createOrder | NetureService.createOrder 로 실주문 생성 | 펀딩은 주문/발송 비연결 | 라우트·핸들러 제거 | P0 |
| A | Fulfillment | `trialFulfillment.controller.ts:266` | syncStatus | 주문상태→fulfillment 동기화(shipped/delivered) | 발송 추적 비연결 | 제거 | P0 |
| A | Shipping | `trialShipping.controller.ts:61` | setAddress | 배송지 수집(market_trial_shipping_addresses) | 발송 비연결 | 라우트·핸들러 제거 | P0 |
| B→A | Conversion | `marketTrialOperatorController.ts:1462` | convertToProduct | SPO/ProductMaster 조회→convertedProductId 기록 | 제품화 전환 비연결 | 차단(409)→제거 | P0 |
| A | Conversion | `marketTrialOperatorController.ts:1100` | createListingFromParticipant | OPL INSERT(이미 409) — unreachable 코드 잔존 | 매장 진열 전환 비연결 | 차단코드·라우트 완전 제거 | P0 |
| A | Checkout | `checkout.service.ts:191-194,544-629` | tryConnectOrderToTrial | 주문 역연결 first_order 승격(이미 no-op) | 주문 비연결 | call+impl 제거 | P0 |
| B | Settlement | `marketTrialOperatorController.ts:789-873` | updateParticipantSettlementStatus | 정산 state machine(offline_settled) WRITE | 정산 비연결 | 비활성(운영데이터 확인)→제거 | P0 |
| B | Settlement | `marketTrialController.ts:656` | saveSettlementChoice | 참여자 제품/현금 선택 WRITE | 정산 비연결 | 비활성→제거 | P0 |
| B | Payment | `marketTrialOperatorController.ts:876-1022` | updateParticipantPaymentStatus | 결제 lifecycle(paid/refunded) WRITE | 결제 비연결 | 비활성(운영데이터 확인)→제거 | P0 |
| C | KPI | `marketTrialOperatorController.ts:448` | getFunnel | 전환 퍼널 집계 + OPL listingCount(read) | 전환·진열 KPI | 제거 또는 content KPI 로 정정 | P1 |
| C | KPI | `marketTrialOperatorController.ts:200,476` | getTrialKpi | listingCount/결제완료율 등(read) | 커머스 KPI | 정산/결제/진열 지표 제거 | P1 |
| C | Reward | `marketTrialOperatorController.ts:738` | updateParticipantRewardStatus | rewardStatus pending↔fulfilled | 이행(발송) 상태 | 정정/제거 검토 | P1 |
| D | Participant | `marketTrialOperatorController.ts:523,1307` | listParticipants/exportCSV | 참여자 목록·CSV(read) | 목록 자체는 유지 가능 | 커머스 컬럼만 제거, 목록 유지 | P2 |
| D | Core | `marketTrialController.ts` create/get/join, `jobs/market-trial-lifecycle.job.ts` | 생성/조회/참여/lifecycle | 콘텐츠·참여 본질 | 유지 | 유지 | - |
| D | Forum | `extensions/trial-forum-monitor` | 포럼 동기화 | 콘텐츠 연계 | 유지 | 유지 | - |

> **관찰**: 생성(`createTrial`)·참여(`joinTrial`)·조회·lifecycle 은 content-only 와 충돌하지 않는다(D). 충돌은 전적으로 **참여 이후 커머스 퍼널**(전환/정산/결제/발송)에 있다.

### 5.2 Frontend (Neture)

| 분류 | 영역 | 파일:line | 컴포넌트/라벨 | 잔존 내용 | 권장 | 우선 |
|:--:|------|-----------|------|-----------|------|:--:|
| A | Operator | `MarketTrialApprovalDetailPage.tsx:205-328` | 전환/정산/결제/상품전환 액션 | createListing·convertToProduct·settlement·payment 호출 | 액션 UI 제거(백엔드 제거와 동반) | P0/P1 |
| C | Operator | `MarketTrialApprovalDetailPage.tsx:1077-1090` | "활용 상품 연결" | 이미 disabled(차단 안내) | 버튼 자체 제거 | P1 |
| A | Participant | `MyParticipationsPage.tsx:127-256,400-457` | 정산 선택·계산·KPI | settlement state machine UI | 제거 | P1 |
| A | Supplier | `SupplierDashboardPage.tsx:145` | "매장 진열" KPI(storeListings) | 진열 카운트 노출 | 제거/정정 | P1 |
| C | Supplier | `SupplierTrialDetailPage.tsx:80-85,387-400` | "취급 시작/첫 주문" 단계, 이행 현황 | 전환 단계·이행률 표시(read) | 표현 정정/제거 | P1 |
| C | Participant | `MarketTrialDetailPage.tsx:365` | 오프라인 정산 안내 문구 | "참여금 확인·제품 정산을 운영자가 안내" | content-only 문구로 정정 | P1 |
| D | Participant | `MarketTrialHubPage.tsx`, `MarketTrialDetailPage.tsx:94`(join) | 허브·상세·참여 신청 | 콘텐츠·참여 | 유지 | - |
| D | Drawer | `ProductDetailDrawer.tsx` | (펀딩 진입점) | **없음** | 조치 불요 | - |

### 5.3 DB / Entity / DTO (충돌 필드 인벤토리)

> 마이그레이션: `20260222700000-CreateMarketTrialTables`(6테이블) · `20260415200000`(convertedProduct*) · `20260415220000`(customerConversion*) · `20260415230000`(listingId) · `20260416500000`(settlement*) · `20260506010000`(payment*) · `20260419400000`(visibleServiceKeys DROP — 이미 Neture 내부화).

| 테이블 / 엔티티 | 충돌 필드 (대표) | 수 | 분류 |
|------|------|:--:|:--:|
| `market_trials` / MarketTrial.entity | `productId`, `convertedProductId`, `convertedProductName`, `conversionNote`, `trialUnitPrice`, `targetAmount`, `currentAmount`, `rewardRate`, `notificationSentAt`, `autoClosedAt`, `closeReason`, `currentParticipants` | ~12 | B→A (컬럼 정리 = P3 migration) |
| `market_trial_participants` / Participant.entity | `contributionAmount`, `rewardStatus`, `listingId`, `customerConversionStatus/At/Note`, `settlementChoice/Status/Amount/ProductQty/Remainder/Note`, `creditProcessStatus`, `paymentStatus/Method/Provider/Reference`, `paidAmount/paidAt/confirmedAt/paymentNote` | ~21 | B→A (P3) |
| `market_trial_decisions` / Decision.entity | `decision`(continue/stop), `selectedSellerIds` | 2 | 검토(전환 의존 시 제거) |
| `market_trial_fulfillments` / Fulfillment.entity | `status`, `orderId`, `orderNumber`, `statusHistory` (테이블 전체) | 4 | A (테이블 drop 후보) |
| `market_trial_shipping_addresses` / ShippingAddress.entity | `recipientName`, `phone`, `postalCode`, `address`, `addressDetail`, `deliveryNote` (테이블 전체) | 6 | A (테이블 drop 후보) |
| `market_trial_forums` / Forum.entity | (충돌 없음 — 포럼 매핑) | 0 | D 유지 |
| OPL `organization-product-listing.entity.ts:111-119` | `source_type='market_trial'`, `source_id` | — | A 와 동반(market_trial source 제거) |
| DTO `packages/market-trial/src/dto`, `web-neture/src/api/trial.ts` | `productId`, `convertedProductId`, `listingId`, settlement*/payment* 전체, `ShippingAddress`, `Fulfillment` | 다수 | B→A (P3 계약 정리) |

> **합계 ~45개 충돌 필드.** `market_trial_forums` 만 무충돌. content-only 전환은 `*_fulfillments`·`*_shipping_addresses` 두 테이블 drop + participant/trial 의 정산·결제·전환 컬럼 정리를 함의(P3, migration·운영데이터 확인 필요).

---

## 6. 위험도 평가

| 영역 | 위험 | 비고 |
|------|------|------|
| 제품 전환(convertToProduct)·OPL·checkout 역연결 | **중** | OPL/checkout 은 이미 차단 상태(unreachable). convertToProduct 만 ACTIVE — 차단은 저위험 |
| 정산 ledger / 결제 lifecycle | **상** | 운영 데이터 존재 가능. `WO-...-OFFLINE-PAYMENT-LEDGER` / `PAYMENT-READINESS` 로 구축된 서브시스템. **DB 실측 선행 필수** |
| 풀필먼트/배송 | **중** | NetureService 실주문 생성 — 운영 사용 시 데이터 존재 가능. 실측 권장 |
| DB 컬럼/테이블 정리 | **상** | migration. 데이터 백업·하위호환 확인 필요. 마지막 단계 |
| Store 서비스 | **하** | 이미 clean. GP 텍스트만(선택) |
| operator/supplier KPI 표현 | **하** | read-only, 표현 정정 |

---

## 7. 후속 WO 제안 (순서)

```
WO 1 (P0) — 위험 배선 차단/제거 [WO-O4O-MARKET-TRIAL-COMMERCE-WIRING-DISABLE-V1]
  - convertToProduct 차단(409) 후 라우트/핸들러 제거
  - createListingFromParticipant 차단 코드·라우트·OPL writer 완전 제거
  - tryConnectOrderToTrial call+impl 제거 (checkout.service.ts)
  - trial-fulfillment(createOrder/syncStatus) · trial-shipping(setAddress) 라우트·핸들러 제거
  - 정산(settlement)·결제(payment) 엔드포인트 비활성 (★ DB 실측 선행 — 운영 데이터 있으면 보존·아카이브 분리)

WO 2 (P1) — UI/문구 정정 [WO-O4O-MARKET-TRIAL-UI-COMMERCE-LABEL-CLEANUP-V1]
  - operator 상세 전환/정산/결제/상품전환 액션 UI 제거
  - supplier "매장 진열" KPI / SupplierTrialDetail 전환단계·이행률 제거·정정
  - MyParticipations 정산 UI 제거, 참여자 안내 문구 content-only 로 정정
  - "매장 진열 / 첫 주문 / 상품 전환 / 정산 / 발송" 용어 제거
  - (선택) GP business 페이지 텍스트 표현 정리

WO 3 (P2) — DTO/API 계약 정리 [WO-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1]
  - trial.ts / dto: productId·convertedProductId·listingId·settlement*·payment*·ShippingAddress·Fulfillment 제거
  - 참여자 목록은 유지하되 커머스 컬럼 응답에서 제거
  - 하위호환·기존 데이터 영향 확인

WO 4 (P3) — 데이터 모델 정리 [WO-O4O-MARKET-TRIAL-SCHEMA-CLEANUP-V1] (migration, 마지막)
  - market_trial_fulfillments / market_trial_shipping_addresses drop
  - participants: 정산·결제·전환·listingId 컬럼 정리
  - market_trials: convertedProduct*·가격·전환 이벤트 컬럼 정리 (productId 는 optional 유지/제거 결정)
  - OPL source_type='market_trial' 데이터 처리(선행 IR: production 0건 — 재실측)
```

> **순서 원칙**: 운영 데이터에 영향을 줄 수 있는 **P0 차단을 최우선**으로 하되, 정산·결제·풀필먼트는 **DB 실측(운영 데이터 존재 여부) 후** 제거 vs 아카이브를 결정한다. 코드 제거(P0~P2)와 schema drop(P3)을 분리해 회귀·롤백 안전성을 확보한다.

---

## 8. 운영 데이터 실측 (P0 선행, read-only SQL)

정산·결제·풀필먼트 제거 전, 실데이터 유무를 확인한다(Cloud Console SQL editor 또는 operator KPI). **SELECT 전용, 데이터 무변경.**

```sql
-- 전환/정산/결제/배송 데이터 존재 여부
SELECT COUNT(*) FILTER (WHERE "convertedProductId" IS NOT NULL) AS converted,
       COUNT(*) AS total_trials FROM market_trials;
SELECT COALESCE("customerConversionStatus",'none') s, COUNT(*) FROM market_trial_participants GROUP BY 1 ORDER BY 2 DESC;
SELECT "settlementStatus", COUNT(*) FROM market_trial_participants GROUP BY 1 ORDER BY 2 DESC;
SELECT "paymentStatus", COUNT(*) FROM market_trial_participants GROUP BY 1 ORDER BY 2 DESC;
SELECT COUNT(*) FROM market_trial_fulfillments;
SELECT COUNT(*) FROM market_trial_shipping_addresses;
SELECT COUNT(*) FROM organization_product_listings WHERE source_type='market_trial';
```

해석: 모두 0 → P0~P3 저위험 일괄. 정산/결제/풀필먼트에 row 존재 → 해당 데이터 아카이브·보존 정책을 WO 1/4 에 반영.

---

## 9. 검증 기준 (WO §12 충족)

```
제품화 연결 흔적 — 확인됨(convertToProduct ACTIVE / createListing 차단). §1·§3·§5.1
주문/checkout 연결 — 확인됨(tryConnectOrderToTrial 차단, fulfillment createOrder ACTIVE). §3·§5.1
정산/ledger 연결 — 확인됨(settlement state machine + payment lifecycle ACTIVE). §3·§5.1
배송/fulfillment 연결 — 확인됨(trial-fulfillment/shipping ACTIVE). §3·§5.1
운영자/공급자 UI 전환·진열·주문·정산·발송 문구 — 조사됨. §5.2
DB/entity/DTO product/order/payment/settlement/shipment 필드 — 조사됨(~45). §5.3
각 흔적별 A/B/C/D 분류 — 완료. §3·§5
후속 WO 순서 — 제안됨(P0~P3). §7
코드/DB/API/UI 무변경, 문서만 — 충족.
```

---

## 10. 결론

- **잔존 배선의 본질은 "제품 기반 생성"이 아니라 "참여 이후 커머스 퍼널"**(전환·진열·주문·정산·결제·발송)이다. WO 가 우려한 입력 측(drawer/제품 선택 생성)은 코드에 거의 없으므로, 제거 작업은 **출력 측 퍼널 차단·제거**에 집중하면 된다.
- 일부(OPL 생성·checkout 역연결)는 이미 차단됨 → **차단 코드·라우트·DB 컬럼의 완전 제거**가 남은 일.
- 정산·결제 ledger·풀필먼트는 **운영 서브시스템**이므로 **DB 실측 선행** 후 P0 차단 → 코드 제거(P1~P2) → schema drop(P3) 순으로 안전하게 분리한다.
- Store 서비스는 clean. 곧바로 삭제하지 말고, 본 결과표를 기준으로 **P0 차단 WO 부터** 별도 진행한다.

---

*Date: 2026-06-19 · read-only IR · 코드/DB/API/UI 무변경 · 결론: 잔존=참여 이후 커머스 퍼널(전환/정산/결제/발송), 입력측 제품기반 생성은 거의 없음. 후속 P0(차단)→P1/P2(코드제거)→P3(schema), 정산·결제·풀필먼트는 DB 실측 선행.*
