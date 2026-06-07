# IR-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DESIGN-V1

> Investigation — 유통참여형 펀딩(MarketTrial)이 공급자 상품을 어떤 단위로 참조해야 하는가
> 작성일: 2026-06-07 · 성격: **read-only 설계 조사** (코드/DB/API/UI 변경 없음)
> 선행: WORKSPACE-PREFILL-V1(context 배너), BINDING-V2(이벤트 바인딩 완료·펀딩 IR 분리)
> 외부 표기: 유통참여형 펀딩 / 내부 코드명: Market Trial (미변경)

---

## 1. 요약 판정

> **권장: 후보 A — 이미 존재하는 `MarketTrial.productId`(→ ProductMaster) 컬럼을 soft reference 로 재사용. migration 불필요.**

핵심 발견:
- `MarketTrial` 엔티티에 **이미 nullable `productId` 컬럼이 존재**(ProductMaster 참조, indexed, `@deprecated` 주석). 즉 ProductMaster 참조 저장에 **DB migration 이 필요 없다.**
- 단, 현재 생성 경로(controller → service → DTO → frontend payload)가 `productId` 를 **전혀 받지 않는다**(캠페인형). 그래서 PREFILL-V1 의 context 배너는 표시만 되고 저장 바인딩이 없다.
- 따라서 바인딩은 **additive 한 wiring 작업**(controller/service/dto/payload/page 가 `productId` 를 통과시키도록)이며, **신규 컬럼·migration·enum 변경이 없다.**
- 펀딩은 **공급자 캠페인** 단위라, 이벤트 오퍼처럼 SPO(offer)·OPL 에 묶는 것은 과결합. 상품 정체성 기준인 **ProductMaster(=목록의 `masterId`)** 참조가 가장 적합.

---

## 2. 현재 MarketTrial 백엔드 구조

파일: `packages/market-trial/src/entities/MarketTrial.entity.ts`

| 필드 | 의미 |
|---|---|
| `supplierId` (uuid, indexed) | 펀딩 생성 공급자 (boundary) |
| **`productId` (uuid, nullable, indexed)** | **상품 참조 — "dropshipping_product_masters.id"(= ProductMaster). `@deprecated`(FK 의존 제거 정책) 이나 컬럼은 존재** |
| `outcomeSnapshot` (jsonb) | 결과 약속 `{expectedType: product\|cash, description, quantity, note}` — productId FK 의존 대체용 |
| `title/oneLiner/videoUrl/description/salesScenarioContent` | 제안서 텍스트 |
| `trialUnitPrice/targetAmount/currentAmount` (decimal) | **펀딩 자체 가격/목표/누적** (공급자 원가와 독립) |
| `fundingStartAt/EndAt/trialPeriodDays` | 기간 |
| `status` (TrialStatus: draft→submitted→recruiting→development→outcome_confirming→fulfilled/closed) | 라이프사이클 |
| `eligibleRoles`(default `["seller"]`)/`rewardOptions`/`rewardRate`/`maxParticipants`/`currentParticipants` | 참여/보상 조건 |
| `convertedProductId/convertedProductName/conversionNote` | **Trial→Product 전환 후** 결과 ProductMaster (별개 개념) |
| `lastTransitionAt/autoClosedAt/closeReason/statusHistory` | 전이 추적 |

- **serviceKey 컬럼 없음** (migration `20260419400000-ResetMarketTrialDataAndRemoveServiceKeys` 로 제거). 별도 `visibleServiceKeys`(discovery용, migration `20260222800000`) 존재.
- 관련 엔티티: `MarketTrialParticipant`(participantId=seller/partner uuid, **store/org FK 아님**), `MarketTrialDecision`, `MarketTrialForum`. 확장: trial-shipping / trial-fulfillment(participationId 기준).
- migration history: crowdfunding 코어 → visibleServiceKeys(02-22) → ServiceApproval 생성(03-20)/폐기(04-17) → **serviceKeys 제거 + 데이터 리셋(04-19)**. `productId` 제거 migration 은 없음 → **컬럼 잔존**.

> 결론: MarketTrial 은 **캠페인형**이며 `productId` 는 "있지만 사용 안 하는" soft 참조 슬롯이다.

---

## 3. 현재 MarketTrial frontend 생성 흐름

- 진입: `/supplier/market-trial/new` → `SupplierTrialCreatePage`.
- 4섹션 제안서 폼 → `createTrial(payload)` (`services/web-neture/src/api/trial.ts`).
- PREFILL-V1: 상단 `SelectedSupplierProductBanner kind="funding"` 가 `?supplierProductId/&masterId/name/...` 를 **표시만** (저장 미연결).
- 제출 payload 에 상품 참조 필드 없음 → 선택 상품과 저장 데이터가 끊김.

---

## 4. 현재 CreateTrialPayload 구조

`services/web-neture/src/api/trial.ts` `CreateTrialPayload`:
`title, oneLiner?, videoUrl?, description?, salesScenarioContent?, outcomeSnapshot?, maxParticipants?, fundingStartAt, fundingEndAt, trialPeriodDays, targetAmount?, trialUnitPrice?, rewardRate?`

→ **상품 참조(productId/masterId/offerId) 없음.**

서버측도 동일:
- `marketTrialController.createTrial` 의 `req.body` 구조분해에 **productId 없음** (`apps/api-server/.../marketTrialController.ts:143-147`).
- `MarketTrialService.createTrial(dto)` 의 `CreateTrialDto` + `repo.create` 에 **productId 없음** (`packages/market-trial/src/services/MarketTrialService.ts`).

→ 컬럼은 있으나 **생성 4계층(payload→controller→dto→entity create) 전부 productId 를 흘리지 않음**. 바인딩 = 이 통로만 열면 됨(migration 무관).

---

## 5. supplier product / ProductMaster / SPO / OPL 관계

- 공급자 제품 목록(`getSupplierProductsPaginated`)은 `supplier_product_offers(spo)` + `product_masters(pm)` join. **행 `id` = SPO(offer) id, `masterId` = pm.id(ProductMaster)**, `drugCategory`(F1, DRUGCATEGORY-EXPOSURE-V1) 포함.
- OFFER-MODE 의 `buildOfferActionUrl` 은 `supplierProductId=row.id`(= SPO id), `masterId=row.masterId`(= ProductMaster id) 를 query 로 전달.
- 계층: ProductMaster(SSOT) ◄ SupplierProductOffer(공급자 공급 단위) ; OrganizationProductListing(매장/서비스 진열, master+offer) ; StoreProductProfile(매장 표시).
- 즉 펀딩에 넘길 수 있는 식별자는 **masterId(ProductMaster)** 와 **supplierProductId(SPO)** 두 가지.

---

## 6. 이벤트 오퍼 바인딩 구조와 비교

| 항목 | 이벤트 오퍼 | 유통참여형 펀딩 |
|---|---|---|
| 참조 단위 | **SPO(offer)** — `ProposableOffer.id`(offer)/`masterId` 로 자동 선택 (BINDING-V2) | 캠페인 — 현재 미참조 |
| 대상 | **서비스별 제안**(kpa-society/glycopharm/k-cosmetics), 운영자 승인 | 공급자 주도 캠페인, 참여자(seller) 모집 |
| 가격 | eventPrice ≤ 일반 공급가 검증, **원본 가격 불변** | trialUnitPrice/targetAmount(캠페인 자체값), **원본 미참조** |
| 주문 연결 | OPL/주문과 연계(서비스 노출) | 참여/정산(별도), 주문 직접 아님 |

> 참고할 점: "원본 가격 불변" 원칙. **가져오면 안 되는 점**: SPO+서비스+OPL 결합(이벤트 고유). 펀딩은 서비스/매장에 묶이기 전 단계의 캠페인이라 **ProductMaster 단위가 적합**(SPO/OPL 결합 회피).

---

## 7. 상품 참조 후보 A~E 비교

| 후보 | 저장 | migration | 적합성 요지 |
|---|---|---|---|
| **A. ProductMaster (`productId` 재사용)** | 기존 nullable `productId` | **불필요** | 상품 정체성 기준·캠페인과 정합·목록 masterId 직결·최소 변경 ✅ |
| B. SupplierProduct 단위 | 신규 `supplier_product_id` | 필요 | 공급자 업무모델 적합하나 "supplierProduct" 독립 저장단위 불명확(목록 id=SPO offer). 신규 컬럼 |
| C. SPO(offer) | 신규 `supplier_product_offer_id` | 필요 | 이벤트와 유사하나 SPO 는 distribution/service/OPL 결합 → 캠페인 과결합. 신규 컬럼 |
| D. OPL | 신규 `organization_product_listing_id` | 필요 | org/매장 scope → 공급자 캠페인엔 과도하게 좁음 |
| E. 참조 없음(snapshot 텍스트) | 현행 유지 | 불필요 | 워크플로 단절(선택↔저장 끊김). 비권장 |

---

## 8. 권장 설계안 — 후보 A

1. **`MarketTrial.productId` 를 soft reference 로 재사용**(FK 의존 아님 — outcomeSnapshot 가 결과 약속 유지). 컬럼 존재 → migration 0.
2. 프론트는 PREFILL 의 **`masterId`(ProductMaster id)** 를 `createTrial` payload 의 `productId` 로 전달.
3. **원본 상품 정보·가격 미변경/미복제**: 펀딩은 자기 `trialUnitPrice/targetAmount` 만 사용(원본 공급가와 무관). 표시는 기존 banner/조회로 충분.
4. **가격 snapshot 불필요**: 펀딩 가격은 원본을 참조·복제하지 않으므로 시점 snapshot 무의미. (필요 시 후속에서 `productId` 로 조회.)
5. `@deprecated` 주석은 "FK 강결합 금지" 취지 → soft 참조 사용과 모순 아님. 구현 WO 에서 주석을 "soft reference(optional)" 로 정정 권장.
6. DRUG 게이트 영향 없음: 펀딩 진입 자체가 목록 OFFER-MODE 에서 DRUG 차단(검토 중심)이므로 의약품은 애초 productId 전달 경로에 오지 않음.

---

## 9. 필요한 변경 범위 (후속 구현 WO 기준)

| 계층 | 변경 | migration |
|---|---|---|
| frontend `CreateTrialPayload` | `productId?: string` 추가 | — |
| frontend `SupplierTrialCreatePage` 제출 | query `masterId` → payload.productId | — |
| controller `createTrial` | `req.body.productId` 수용 → service 전달 | — |
| service `MarketTrialService.createTrial` + `CreateTrialDto` | `productId?` 수용 → `repo.create({ productId })` | — |
| entity | 변경 없음(컬럼 존재) — 주석만 정정 권장 | **없음** |
| (선택) update/detail 응답 | productId 노출 | — |

> 총 ~4파일 additive, **migration/enum/신규컬럼 0**. 이벤트/주문/정산/OPL/SPO 구조 무변경.

---

## 10. 기존 데이터 호환 전략

- `productId` nullable → 기존 trial row 는 NULL 유지(영향 없음).
- 신규 생성분만 productId 채움. 조회/목록은 productId 미존재해도 기존대로 동작.
- prod 데이터는 disposable(pre-service) — backfill 불필요.

---

## 11. 이번 IR에서 구현하지 않는 것

- MarketTrial entity/migration/payload/UI 변경 없음 (read-only)
- 이벤트 오퍼/SPO/OPL/ProductMaster 구조 변경 없음
- bulk/배송/주문·정산/OTC gate 없음
- 다른 세션 WIP 파일 미접촉

---

## 12. 후속 WO 제안

- **(권장) `WO-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1`** — 후보 A 구현: `MarketTrial.productId`(ProductMaster, 기존 컬럼) 에 목록 `masterId` 바인딩. payload/controller/service/dto additive wiring, **migration 없음**. PREFILL 배너 → 실제 저장 참조로 승격. (`@deprecated` 주석 정정 포함.)
- (불채택) SPO-REFERENCE / DATA-MODEL-REDESIGN — 본 IR 기준 불필요(과결합/과설계).

---

## 완료 기준 점검

1. ✅ MarketTrial 구조 실제 파일 기준 조사 (§2, `productId` 존재 확인)
2. ✅ CreateTrialPayload 에 참조 필드 없음 + 4계층 누락 확인 (§4)
3. ✅ ProductMaster/SupplierProduct/SPO/OPL 참조 후보 비교 (§5,§7)
4. ✅ 이벤트 오퍼 바인딩과 차이 정리 (§6)
5. ✅ 권장 설계안(A) 제시 (§8)
6. ✅ migration/API/frontend 변경 범위 (§9 — migration 0)
7. ✅ 미구현 범위 분리 (§11)
8. ✅ 후속 WO명 제안 (§12)
9. ✅ 코드 변경 없이 문서만
10. ✅ 다른 세션 파일 미접촉

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 조사 완료 — 권장 = 후보 A(기존 productId 재사용, migration 0). 후속: SUPPLIER-PRODUCT-REFERENCE-V1.
