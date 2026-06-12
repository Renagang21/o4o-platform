# IR-O4O-DISTRIBUTION-FUNDING-VS-MARKET-TRIAL-DEFINITION-V1

> **유형**: Investigation (read-only) — 유통참여형 펀딩과 Market Trial 의 관계 확정 + canonical 정의 제안.
> **성격**: 코드/DB/migration/UI **무변경**. 조사 문서만.
> **결론**: **판정 A+C** — 유통참여형 펀딩 = Market Trial 의 **외부(사업)명**, 내부 코드/엔티티/route 명 = `market_trial`.
> 단 **참여 = 주문이 아니라 신청/약정(사전 모집)** 이며, 성공 후 운영자가 **SupplierProductOffer → OrganizationProductListing 전환** 시에만 O4O 주문 가능 상품이 된다.
> 결제는 일반 online checkout(o4o_payments)이 아니라 **오프라인 정산 ledger**. Store 서비스(KPA/GP/KCos)는 **Neture 리다이렉트**(자체 구현 없음).
> **작성일**: 2026-06-11

---

> ## ⚠️ Supersede Note — 2026-06-12
>
> 본 IR 의 **기능 정의** 중 다음은 **유지**한다:
> - 유통참여형 펀딩 = Market Trial 의 외부(사업)명, 내부 코드/엔티티/route 명 = `market_trial`.
> - 참여 = 주문이 아니라 **사전 참여/약정**(크라우드펀딩형 사전 모집, 주문 전 단계).
> - 결제 = online checkout(o4o_payments)이 아니라 **오프라인 정산 ledger**.
> - Market Trial 은 별도 `market_trial` 도메인. `distribution_type` 에 `FUNDING` 값 없음.
>
> 다만 본 IR 작성 당시의 다음 **Store 연결 기준은 폐기**한다(이후 정책 정정):
> - "Store 서비스(KPA/GlycoPharm/K-Cosmetics)는 Neture 리다이렉트 유지"
> - "매장 허브 카드 / 내 매장 참여 이력·펀딩 상태 표시"
> - "전환 후 OrganizationProductListing 이 Store 서비스의 O4O 주문 가능 상품으로 합류"
> - Store 서비스에서 유통참여형 펀딩을 관련 기능처럼 취급
>
> **최신 확정 기준** (아래 후속 문서를 따른다):
> `IR-O4O-MARKET-TRIAL-NETURE-ONLY-BOUNDARY-CORRECTION-V1` · `WO-O4O-MARKET-TRIAL-STORE-REDIRECT-AND-CARD-REMOVAL-V1` · `WO-O4O-MARKET-TRIAL-KPA-MEMBERSHIP-GATE-REMOVAL-V1` · `IR-O4O-MARKET-TRIAL-BACKEND-NETURE-BOUNDARY-V1` · `IR-O4O-MARKET-TRIAL-SPO-OPL-CONVERSION-USAGE-AUDIT-V1` · `WO-O4O-MARKET-TRIAL-CONVERSION-DISABLE-V1` · `CHECK-O4O-MARKET-TRIAL-CONVERTED-LISTING-DATA-AUDIT-V1`
>
> **최신 정책:**
> - 유통참여형 펀딩은 **Neture 전용** 기능이다.
> - KPA/GlycoPharm/K-Cosmetics 의 운영자·매장 허브·내 매장·O4O 주문 가능 상품·참여 이력과 **연결하지 않는다.**
> - Store frontend 연결 흔적(route/card/banner/menu/redirect)은 **제거**되었다.
> - Market Trial → SPO → OPL **신규 전환은 비활성화**되었고, checkout 의 trial 역연결(first_order 승격)도 중단되었다.
> - production DB 실측 결과 `source_type='market_trial'` OPL 은 **0 건**으로, 기존 데이터 cleanup 은 **불필요**하다.

---

## 1. 목적
다음 개념의 관계를 코드 근거로 확정하고 canonical 정의를 제안한다: 유통참여형 펀딩 / Market Trial / 판매자 모집(SupplierProductOffer) / 공급 승인(ProductApproval) / O4O 주문 가능 상품(OrganizationProductListing) / 이벤트형(EventOffer).

## 2. 배경
선행 IR 에서 상품 모델이 안정화됨: StoreLocalProduct(주문 불가) / OrganizationProductListing(반복 주문) / ProductApproval(승인 전) / EventOffer·store_cart_items[event_offer](이벤트 주문) / checkout_orders(원장). 판매자 모집·공급 승인 흐름(SPO→ProductApproval→OPL→주문 가능)도 확정. **남은 불확정 = 유통참여형 펀딩** → 본 IR.

## 3. 용어 기준 (조사로 확정)
- **유통참여형 펀딩** = 공급자가 상품을 제안하고 매장들이 **사전 참여(약정)** 로 유통 가능성을 확인하는 크라우드펀딩형 사전 모집. **주문 전 단계.**
- **Market Trial** = 위 기능의 **내부 코드/엔티티/route 명** (`market_trials`, `/market-trial`).

---

## 4. 조사 범위
backend `apps/api-server/src/{controllers/market-trial, jobs, database/migrations, extensions/trial-*}`; frontend `services/web-neture/src/pages/market-trial`, `services/web-{glycopharm,k-cosmetics}` redirect; guide copy `packages/shared-space-ui/src/guide/copy/neture.ts`. (코드 근거 file:line 기반, read-only.)

---

## 5. Phase 1 — route/API/entity 매핑

| 영역 | 기능 | route/파일 | entity/table |
|------|------|-----------|--------------|
| Backend 도메인 | Market Trial 생성·참여·전환 | `controllers/market-trial/marketTrialController.ts`, `marketTrialOperatorController.ts` | `market_trials` 외 6테이블 |
| Backend 스키마 | 테이블 생성 | `database/migrations/20260222700000-CreateMarketTrialTables.ts` | `market_trials`, `market_trial_participants`, `market_trial_forums`, `market_trial_decisions`, `market_trial_shipping_addresses`, `market_trial_fulfillments` |
| Backend 확장 | 펀딩 부가 | `extensions/trial-fulfillment`(MarketTrialFulfillment), `trial-shipping`(MarketTrialShippingAddress), `trial-forum-monitor` | — |
| Backend 라우트 | 공개/운영자 | `routes/market-trial.routes.ts`, `routes/market-trial-operator.routes.ts` | — |
| Backend 잡 | 상태 lifecycle | `jobs/market-trial-lifecycle.job.ts` | — |
| Neture FE 매장/참여 | 허브·상세·내 참여 | `pages/market-trial/{MarketTrialHubPage,MarketTrialDetailPage,MyParticipationsPage}` (`/market-trial`, `/market-trial/:id`) | — |
| Neture FE 운영자 | 승인·전환 | `pages/operator/{MarketTrialApprovalsPage,MarketTrialApprovalDetailPage}` | — |
| Neture Guide | 사업/기능 안내 | `GuideBusinessMarketTrialPage`(`/guide/business/market-trial`), `GuideFeatureMarketTrialPage`(`/guide/features/market-trial`) — **외부명 "유통참여형 펀딩"** | — |
| GP/KCos FE | 리다이렉트 | `components/common/MarketTrialNetureRedirect.tsx` (`/store/market-trial` → `https://neture.co.kr/market-trial`) | 없음(자체 구현 X) |

> **중요 구분**: `supplier_product_offers.distribution_type` enum = **`PUBLIC` / `PRIVATE` / `SERVICE`** (migration `20260301100000-ProductMasterCoreReset.ts:80`). **`FUNDING` 값은 없다.** 즉 유통참여형 펀딩은 distribution_type 의 한 값이 아니라 **별도 market_trial 도메인**이며, 전환 시 그 결과물이 SPO(=PUBLIC/PRIVATE/SERVICE 중 하나)가 된다. (선행 IR 의 "distributionType='FUNDING' catalog" 전제는 코드와 불일치 — FUNDING 은 distribution_type 가 아님.)

---

## 6. Phase 2 — Market Trial 현재 정의

| 항목 | 확인 결과 | 근거 |
|------|-----------|------|
| 생성 주체 | 공급자(작성) → 운영자 승인/모집 | operatorController 승인·전환 흐름 |
| 상태값(TrialStatus) | `draft`(기본) → `recruiting`(참여 가능) → `fulfilled`/`closed`(종결). approved→recruiting 마이그레이션 존재 | controller:37 `JOINABLE_STATUSES=[RECRUITING]`, `CLOSED_STATUSES=[FULFILLED,CLOSED]`; migration `20260417400000-MigrateApprovedTrialToRecruiting`, `CreateMarketTrialTables:33` default 'draft' |
| 목표/기간 | 목표 참여 매장 수(max participants), 기간, 달성률(crowdfunding) | controller:603 "maximum participants", :797/840 `WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1` 달성률 |
| 부가 필드 | rewardRate, salesScenario, oneLiner, videoUrl, lifecycle, visibleServiceKeys | alter 마이그레이션들 |
| 참여 데이터 | **`market_trial_participants`** (매장 참여=신청/약정) | controller:593 "not accepting participants", :625 "Already participated", :631 `participantRepo.create/save` |
| 참여 = 주문? | **아니오.** 참여는 `MarketTrialParticipant` 1건 생성. checkout_orders/store_cart_items 생성 **없음** | controller participate 핸들러(주문/장바구니 호출 0) |
| 결제 | **오프라인 정산 ledger** (online checkout 아님): `choice_completed → offline_review → offline_settled(locked)` | operatorController:53-62 transition map; `WO-O4O-NETURE-DISTRIBUTION-FUNDING-OFFLINE-PAYMENT-LEDGER-V1`(:1375), payment-readiness WO |
| 실물 흐름 | 참여자 배송지(`market_trial_shipping_addresses`) + `market_trial_fulfillments` (체험/샘플 배송) | CreateMarketTrialTables:101,120; trial-shipping/trial-fulfillment 확장 |
| 주문 가능 상품 전환 | **운영자 수동 전환**: `trial.convertedProductId`(= **supplier_product_offers.id**) → OrganizationProductListing 생성 | operatorController:1094 주석 "전제: convertedProductId 존재(supplier_product_offers.id)", :1106-1212 (offerId·masterId·organizationId·listingPrice 로 listing INSERT) |

---

## 7. Phase 3 — 유통참여형 펀딩 vs Market Trial 관계 판정

| 관점 | Market Trial | 유통참여형 펀딩 | 판정 |
|------|--------------|----------------|------|
| 코드/엔티티/route | `market_trials`, `/market-trial` | (동일) | 같은 대상 |
| 화면 외부명 | 일부 "마켓 트라이얼" 잔존 가능 | Neture guide·사업 안내에서 **"유통참여형 펀딩"** | 외부=펀딩 |
| 공급자 안내 | — | "유통참여형 펀딩 제안/작성" | 외부=펀딩 |
| 매장/운영자 | — | "유통참여형 펀딩 참여/검토 운영" | 외부=펀딩 |
| GP/KCos | redirect 컴포넌트 제목 **"유통참여형 펀딩은 Neture에서 운영됩니다"** | (동일) | 외부=펀딩 |

→ **판정 = A (유통참여형 펀딩 = Market Trial 의 외부명)**, 운영 정책은 **C** (내부 코드명 `market_trial` 유지 + 외부명 "유통참여형 펀딩" 으로 정렬). guide copy(`neture.ts`)가 이미 "유통참여형 펀딩" 외부명을 일관 사용 → 정렬은 진행 중. **D/E 아님**(구조 명확, 사용 위험 아님). 잔여 "마켓 트라이얼/Market Trial" 사용자-facing 표기는 외부명 정렬 소형 WO 대상.

---

## 8. Phase 4 — 기존 상품 유형과의 차이

| 유형 | 공급자 등록 | 매장 행동 | 승인 | 주문 가능 시점 | 결제 | 최종 원장/전환 |
|------|:---:|------|:---:|------|------|------|
| B2B 일반 공급(SPO/OPL) | SPO | 발주 | 운영자(ProductApproval) | 승인·활성 후 상시 | online checkout(o4o_payments) | checkout_orders |
| 이벤트형(EventOffer) | SPO+offer | 장바구니·주문 | (오퍼 승인) | 오퍼 진행 중 | online checkout | checkout_orders |
| **유통참여형 펀딩(Market Trial)** | 펀딩 제안(market_trial) | **참여=신청/약정** | 운영자(모집/검토) | **즉시 주문 아님** — 성공·전환 후 | **오프라인 ledger 정산** | **market_trial_participants → (전환) SPO → OrganizationProductListing** |
| 판매자 모집(recruitment) | — | 신청 | 운영자/공급자 | 승인 후 OPL | — | OrganizationProductListing |

→ **핵심 차이**: 펀딩은 **주문 전 "사전 참여/수요 확인" 단계**다. 일반/이벤트는 즉시 주문·online 결제, 펀딩은 참여(약정)+오프라인 정산 후 운영자 전환으로 OPL 이 되어야 주문 가능.

---

## 9. Phase 5 — 매장 허브/내 매장 반영 기준 (제안)

### 매장 허브
- 표시: **"유통참여형 펀딩" 카드/섹션**, 상태 = `모집 중(recruiting)` / `종료(fulfilled·closed)`. 목표 참여 매장 수·달성률·기간 노출.
- 액션 = **"참여하기"**(주문 아님). 참여는 약정/관심 표시 + (필요 시) 배송지.
- **Store 서비스(KPA/GP/KCos)는 Neture 리다이렉트 유지**(자체 참여 구현 금지 — `MarketTrialNetureRedirect`). 매장 허브 카드는 "Neture에서 운영" 안내·링크로.

### 내 매장
- 참여 직후: **"참여 이력 / 펀딩 참여 상태"**(주문 내역 아님). 결제는 오프라인 정산 상태(`choice_completed/offline_review/offline_settled`)로 표시.
- 전환 후: 운영자가 `convertedProductId(SPO)→OPL` 전환하면 그때 **"O4O 주문 가능 상품"** 으로 내 매장 상품에 합류(반복 주문). 전환 전에는 주문 가능 상품군 **미포함**.

### 주문 전환 (확정 기준)
`market_trial.convertedProductId = supplier_product_offers.id` → 운영자 전환 핸들러가 **OrganizationProductListing 생성** → 이후 일반 OPL 주문 경로(checkout_orders). **EventOffer/checkout 직접 생성 아님.**

---

## 10. Phase 6 — canonical 정의 (제안)

```
외부 서비스명 : 유통참여형 펀딩
내부 코드명   : Market Trial (market_trials, /market-trial)
주체          : 공급자(제안) · 운영자(모집·검토·전환) · 매장(참여)
정의          : 공급자가 상품을 제안하고 매장이 사전 참여(약정)로 유통 가능성을 확인하는 크라우드펀딩형 사전 모집.
                주문이 아니라 "주문 전 참여/수요 확인" 단계다.
상태 흐름      : draft → recruiting(참여 가능) → fulfilled / closed
                (참여 결제 ledger: choice_completed → offline_review → offline_settled[locked])
매장 행동      : 참여(신청·약정) — 즉시 주문 아님. (실물 체험은 shipping/fulfillment 로 별도 처리)
결제           : 오프라인 정산 ledger (운영자). online checkout(o4o_payments) 아님.
주문 전환 조건  : 성공 후 운영자가 convertedProductId(= SupplierProductOffer.id) → OrganizationProductListing 생성.
                전환 후에만 O4O 기본 주문 가능 상품.
관계          : 기본 O4O 주문 가능(OPL) = 펀딩의 "전환 결과물". 이벤트형(EventOffer) = 별개 즉시주문.
                공급 승인(SPO→ProductApproval→OPL) = 일반 경로; 펀딩은 그 앞단의 사전 모집.
                distribution_type(PUBLIC/PRIVATE/SERVICE)은 SPO 속성 — 펀딩은 distribution_type 값이 아님.
```

---

## 11. Phase 7 — 후속 작업 분리

**소형 WO**
- `WO-O4O-MARKET-TRIAL-EXTERNAL-NAME-ALIGNMENT-V1` — 사용자-facing 잔여 "마켓 트라이얼/Market Trial" 표기를 "유통참여형 펀딩" 외부명으로 정렬(내부 코드명 유지).
- 매장 허브 펀딩 카드 상태 라벨(모집 중/종료) · 참여 상태 라벨 정리.

**추가 IR**
- `IR-O4O-MARKET-TRIAL-PARTICIPATION-TO-ORDER-CONVERSION-V1` — 참여→오프라인 정산→SPO→OPL 전환 자동/수동 책임·정산 모델 정밀화.
- 목표 수량/목표 매장 수 충족 기준 · 공급자 승인 vs 운영자 승인 책임 분리.

**장기 리팩터**
- market_trial ↔ SPO/OPL 전환 자동화 정책, 참여 결제 online/offline 통합 여부, 내 매장 "참여 이력↔주문 가능 상품" 표시 공통화.

---

## 12. 내 매장 공통화 반영 기준
유통참여형 펀딩은 **주문 가능 상품군에 직접 포함하지 않는다**(참여=사전 모집). 내 매장 공통 표시 축: ① 참여 이력/펀딩 상태(주문 아님) ② 전환 후 OPL = O4O 주문 가능 상품(반복 주문)으로 합류. Store 서비스는 Neture 실행 위임(redirect) 유지.

## 13. 결론
- **유통참여형 펀딩 = Market Trial 의 외부명**(판정 A), 정책상 **외부명 "유통참여형 펀딩" / 내부명 `market_trial`**(C)로 정렬 — guide copy 가 이미 그렇게 운용 중.
- **참여 ≠ 주문.** 참여는 `market_trial_participants` 약정이며 결제는 **오프라인 정산 ledger**. **성공 후 운영자가 `convertedProductId(SPO) → OrganizationProductListing` 전환** 해야 비로소 O4O 주문 가능 상품(checkout_orders 경로).
- distribution_type(PUBLIC/PRIVATE/SERVICE)에 **FUNDING 값은 없다** — 펀딩은 distribution_type 가 아니라 별도 market_trial 도메인.
- **현 단계 안전 운용 기준**: 유통참여형 펀딩을 "즉시 주문 가능 상품"으로 노출하지 말고 **참여/모집/수요 확인 단계**로 노출. Store 서비스는 Neture 리다이렉트 유지.

---

*Date: 2026-06-11 · read-only IR · 코드 무변경 · 판정: A+C (외부명 유통참여형 펀딩 / 내부명 Market Trial; 참여=사전 모집, 전환=SPO→OPL).*
