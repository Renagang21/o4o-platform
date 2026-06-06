# IR-O4O-NETURE-DISTRIBUTION-FUNDING-FUNCTIONAL-COMPLETENESS-AUDIT-V1

> **성격**: read-only 기능 완성도 조사 (코드/API/DB/migration 변경 없음)
> **작성일**: 2026-06-06 · **HEAD**: f87f833ef · **branch**: main
> **외부 표기**: 유통참여형 펀딩 / **내부 코드명**: Market Trial · market-trial · MarketTrial* (본 IR에서 미변경)
> **선행**: `CHECK-O4O-FRONTEND-MARKET-TRIAL-LABEL-TO-DISTRIBUTION-FUNDING-V1`, `CHECK-O4O-NETURE-DISTRIBUTION-FUNDING-GUIDE-CARD-DETAIL-PAGES-V1`
> **사업 명제**: 공급자가 개발/유통 준비 단계에서 **매장 경영자(또는 매장 랜딩 가능 사업자)** 의 소액 참여를 받아, 개발 완료 후 **제품으로 정산**하여 **초기 매장 랜딩**을 확보. 투자형 아님, 개발비 전체 조달 아님.

---

## 1. 결론 요약

현재 구현은 **"크라우드펀딩식 모집 + 참여 + 운영자 수기 정산·이행 스켈레톤"** 수준이다. 사업 명제의 **데이터/엔드포인트 골격은 end-to-end로 존재**(공급자 제안 → 운영자 승인 → 참여 → 정산 선택 → 배송/이행 → listing autolink)하나, 다음 5축이 미완이라 **"제품 정산 → 매장 랜딩 추적 유통참여형 펀딩" 수준에는 미달**한다.

1. **참여 대상 제한 부재** — join 은 로그인만 검사, `eligibleRoles` 미적용, 참여자에 `storeId/organizationId` 없음. (FAIL)
2. **실제 참여금 결제 미연결** — 참여 시 `contributionAmount: 0` 하드코딩, PG/checkout 없음, 결제는 운영자 수기. (PARTIAL→FAIL)
3. **도매가 이하 제품정산 기준 부재** — wholesale/cost 필드 전무, `trialUnitPrice` 만. (FAIL)
4. **매장 단위 랜딩 식별 약함** — listing autolink 는 있으나 참여자↔매장(store/org) 연결 부재로 "어느 매장에 들어갔는가"를 직접 식별 못함. (PARTIAL)
5. **운영자 사전심사 깊이 부족** — 승인은 binary, 승인 화면에 펀딩 경제구조(목표금액/단가/리워드) 미표시, 검토 사유 영속 없음. (PARTIAL)

추가로 **보안 결함(최우선)**: `trial-shipping`·`trial-fulfillment` 라우터가 **무인증**으로 마운트 → 배송지(PII) 조회/수정 및 주문 생성이 `participationId` 만으로 가능(Boundary §7 위반).

명칭은 외부 렌더링 기준 깨끗(Market Trial/마켓 트라이얼/유통 참여형(공백) = 0)하나, **bare 영어 "Trial"** 이 공급자/운영자/참여 화면에 다수 노출(작은 결함).

**한 줄 판정**: 모집·참여·승인까지는 동작하나, 제품 정산의 **재무 실행 / 참여 대상 / 매장 랜딩 식별 / 승인 사전심사** 가 약하다. 코드부터 고치기 전, 본 IR로 갭을 확정하고 우선순위별 후속 WO로 분리한다.

---

## 2. 현재 기능 맵

```
[공급자] SupplierTrialCreatePage → POST /api/market-trial (DRAFT)
   └ submit → SUBMITTED
[운영자] MarketTrialApprovalDetailPage → PATCH /:id/approve (RECRUITING) | /reject (CLOSED, reason 미영속)
[참여자] MarketTrialDetailPage → POST /:id/join (contributionAmount=0, reward 선택)  ← 자격 게이트 없음
[cron 5분] RECRUITING & fundingEndAt 경과 → 목표달성? DEVELOPMENT : CLOSED  (단일 자동 전이)
[운영자 수기] DEVELOPMENT → OUTCOME_CONFIRMING → FULFILLED → CLOSED
[참여자] MyParticipationsPage → settlementChoice (product/cash)
[운영자] 참여자 테이블: rewardStatus, customerConversion(none→…→adopted→first_order),
         settlementStatus(pending→…→offline_settled), paymentStatus(수기), listing 생성(매장 랜딩)
[확장] /api/trial-shipping/:participationId (주소)  · /api/trial-fulfillment/:pid/* (주문/이행)  ← 무인증
```

서비스 분담(문서 baseline 부합): 실행은 **Neture 단일**, KPA/GlycoPharm/K-Cosmetics 는 redirect 게이트.

---

## 3. 엔티티/DB 구조 분석 (`packages/market-trial`)

### 3.1 표현 가능 vs 부재 (핵심)
| 개념 | 판정 | 근거 |
|---|---|---|
| 펀딩 목표 금액 | ✅ 표현가능 | `MarketTrial.targetAmount` decimal(12,2) `entity:113` |
| 목표 매장/참여자 수(금액과 별개) | ⚠️ 부분 | `maxParticipants`(상한) + `currentParticipants` `entity:181/187` — "목표"가 아니라 "정원 상한" |
| **1인당 참여 한도** | ❌ 부재 | per-participant min/max 없음. `trialUnitPrice`(단가)뿐. join은 `contributionAmount>0` 미검증(애초 0) |
| 제품 정산 조건 | ⚠️ 부분 | `outcomeSnapshot.expectedType='product'|'cash'` + 참여자 `settlementChoice/Status/Amount/ProductQty/Remainder`. product-only **강제 아님**(cash 허용), 최종 정산 `offline_settled`(수기) |
| **도매가 이하 정산 기준** | ❌ 부재 | wholesale/cost/supply-price 컬럼 전무. `trialUnitPrice` 는 참여자 지불가, 도매 비교 개념 없음 |
| **매장 랜딩 기록(어느 매장)** | ❌ 부재(프록시만) | 참여자에 `storeId/organizationId` 없음. 프록시: `listingId`(listing 생성됨), `customerConversionStatus='first_order'` |
| 참여 자격=store_owner/business | ⚠️ 부분 | `eligibleRoles` default `["seller"]` + `ParticipantType.STORE_OWNER` 존재하나 **미강제**, store/org FK 없음 |
| 피드백 수집 | ⚠️ 부분 | 포럼 매핑 + `MarketTrialDecision`(continue/stop). 구조화 피드백/평점/사유 필드 없음(decision 에 reason 없음) |
| 후속 주문 연계 | ⚠️ 부분 | `customerConversionStatus='first_order'` 수동 라벨 + `listingId`. **실제 Order FK 없음** |
| 운영자 결정 사유 | ⚠️ 부분 | trial: `closeReason`(머신 문자열)·`conversionNote`·`statusHistory.reason`. **승인/반려 사람-사유 엔티티 없음**, reject reason 은 알림용으로만 전달·미영속 |

### 3.2 엔티티 요약
- **MarketTrial** (31필드): 펀딩 코어(targetAmount/currentAmount/fundingStart·EndAt/trialPeriodDays/rewardRate/rewardOptions/maxParticipants), 제안 리치(oneLiner/videoUrl/salesScenarioContent/outcomeSnapshot), 전환(convertedProductId/Name/conversionNote), 라이프사이클(status/lastTransitionAt/autoClosedAt/closeReason/statusHistory). **serviceKey 컬럼 없음**(boundary=supplierId; visibleServiceKeys 는 migration 으로 별도 존재, discovery 용).
- **MarketTrialParticipant** (28필드): `participantId`(seller/partner uuid, **store/org FK 아님**)·participantType, contributionAmount, reward/settlement 블록(settlementChoice/Status/Amount/ProductQty/Remainder/creditProcessStatus), customerConversion 블록, listingId, **payment 블록**(paymentStatus/Method/Provider/Reference/paidAmount/paidAt/confirmedAt).
- **MarketTrialDecision**: 참여자 continue/stop 만(운영자 승인 아님), reason 없음.
- **상태 enum**: TrialStatus(draft/submitted/recruiting/development/outcome_confirming/fulfilled/closed), PaymentStatus(unpaid/pending/paid/failed/canceled/refunded), ParticipantType(store_owner/partner/seller).
- **확장 엔티티**: `MarketTrialShippingAddress`(participationId unique + 주소/수령인/연락처), `MarketTrialFulfillment`(participationId unique, status pending→address_collected→order_created→shipped→delivered→fulfilled, orderId/orderNumber/statusHistory).
- **Dead enum**: `TrialStatus.APPROVED`(단일승인 전환 후 도달 불가) — dead-code audit 권고대로 잔존.

### 3.3 마이그레이션 진화 축
crowdfunding 코어(02-22) → conversion/listing(04-15) → customerConversion 퍼널(04-15) → 제안 리치 oneLiner/video/scenario(04-19) → 라이프사이클 자동화(05-06) → **payment 필드(05-06, "결제 준비"이나 미실행)**. ServiceApproval(2차승인) 03-20 생성 → 04-17 폐기.

---

## 4. API 구조 분석 (`apps/api-server`)

### 4.1 엔드포인트(요지)
- **공개/참여** `/api/market-trial`: `/gateway`(KPA·약국 멤버십 advisory 게이트), `GET /`·`/:id`(목록/상세), `POST /`(create — **공급자 role 가드 없음**), `PATCH /:id`·`/submit`(owner), `GET /my`·`/my-participations`·`/:id/participation`·`/:id/results`, **`POST /:id/join`**(참여), `GET /:id/my-settlement`, `POST /:id/settlement-choice`. **참여자 취소 엔드포인트 없음**.
- **운영자** `/api/v1/neture/operator/market-trial` (`requireAuth`+`requireNetureScope('neture:operator')` 전체 적용): list/kpi/detail/funnel/participants(+export), 참여자 reward/conversion/settlement/**payment(수기)** 상태 변경, **`POST /:id/participants/:pid/listing`(매장 랜딩 autolink)**, status 전이, `/approve`·`/reject`, `/convert`.
- **확장(무인증)** `/api/trial-shipping/:participationId`(주소 set/get), `/api/trial-fulfillment/*`(init/get/create-order/sync-status/complete/stats).

### 4.2 핵심 결함(코드 검증 완료)
- **참여금 미결제**: `joinTrial` `marketTrialController.ts:612` → `contributionAmount: 0`. checkout/order 미생성, `checkoutService.createOrder()` 미사용. payment 는 운영자 수기(`updateParticipantPaymentStatus`)뿐, PG/환불 워크플로 명시적 보류.
- **자격 미강제**: `join` 가드(`:565-582`)는 JOINABLE 상태·정원·rewardOptions 만 검사, **`eligibleRoles` 미검사**(응답 `:790`에 포함만). `createTrial` 공급자-role 가드 없음.
- **보안(최우선)**: `register-routes.ts:379/385` 에서 shipping/fulfillment 라우터를 **인증 미들웨어 없이** 마운트, 라우터 내부에도 인증 0 → 배송지(PII) 조회/수정·주문생성이 `participationId` 만으로 가능. **Boundary Policy §7(UUID 단독 조회 금지 / 스코프 가드) 위반.**
- **라이프사이클 job**: 5분 interval, 단일 자동 전이(RECRUITING 만료 → 목표달성 DEVELOPMENT / 미달 CLOSED). 이후 전이는 운영자 수기. FAILED 상태 없음.
- **알림**: 대부분 in-app 존재(approved/rejected/joined/recruitingResult/outcomeConfirming/fulfilled/conversion). **`onSubmitted` 정의됐으나 호출처 없음**, 결제 알림 미발화, email/SMS 없음.

---

## 5. Neture 프론트 구조 분석 (`services/web-neture`)

- **공급자 제안 폼**(SupplierTrialCreatePage, 14필드): 제목/한줄제안/영상/설명/판매시나리오(RichText)/결과약속(제품·현금 radio)/결과설명/**목표금액**/**제품단가**/**리워드%**/**최대 참여 매장 수**/모집 시작·종료일/Trial 기간. 정산 미리보기(단가×(1+리워드%)) read-only. **부재**: 목표 매장 수(정원 상한과 구분), per-store limit, 도매가 기준, 정산 제품 구성, 투자형 아님 고지.
- **참여 상세/조인**(MarketTrialDetailPage): 펀딩 구조·정산 예시 표시(투명성 양호). **자격 게이트 없음** — `handleJoin` 은 `isAuthenticated` 만 검사(`:85-90`), 버튼 노출 `!hasJoined && isRecruiting && !isFull`(`:374`), `eligibleRoles` 미사용 → **누구나 참여 가능**. 투자형 아님 고지 없음.
- **내 참여 내역**(MyParticipationsPage): 정산 계산 grid + 제품/현금 선택 UI(choice_pending). 하단은 정산 절차 안내(투자형 아님 고지 아님).
- **운영자**(MarketTrialApprovalDetailPage): 승인=binary, 반려=free-text reason(미영속). **승인 화면에 펀딩 경제구조(목표금액/단가/리워드) 미표시** → 정산·대상 적합성을 승인 단계에서 못 봄. 단 승인 후 운영(정산/결제/전환/퍼널/CSV)은 풍부.
- **api/trial.ts** `CreateTrialPayload`: title/oneLiner/videoUrl/description/salesScenarioContent/outcomeSnapshot/maxParticipants/fundingStart·EndAt/trialPeriodDays/targetAmount/trialUnitPrice/rewardRate. **목표 매장수·per-store limit·도매가 기준·정산 제품구성·eligibleRoles(공급자 설정) 없음.**
- **명칭**: 렌더링 Market Trial/마켓 트라이얼/유통 참여형(공백) = 0(주석만). 단 **bare "Trial"** 영어가 다수 렌더링 노출(예: "Trial 기간(일)", "Trial 생성하기", "내 Trial 목록", "Trial 관리", "Trial 보기 →").

---

## 6. 시나리오 1 판정 — 공급자가 제안한다 → **PARTIAL**
목표금액/정원/리워드/단가/판매시나리오 입력 가능. 그러나 목표 매장 수(별도)·1인당 한도·제품 정산 기준(도매가)·정산 제품 구성 입력 불가. WO 기준 "목표 금액만 있고 목표 매장 수가 없으면 PARTIAL", "제품 정산 조건 없으면 PARTIAL/FAIL" → **PARTIAL**(개발비 전체조달 강제는 아니므로 FAIL 아님).

## 7. 시나리오 2 판정 — 운영자가 검토한다 → **PARTIAL (승인 게이트는 FAIL 경향)**
승인 대기 목록·상세 진입·라이프사이클/정산/결제 운영은 가능. 그러나 **승인 게이트가 펀딩 경제구조·제품 정산 기준·참여 대상 적합성을 표시/검토하지 못함**(binary approve + 미영속 reject reason). WO 기준 "단순 승인/반려만이면 PARTIAL, 정산 조건·대상 적합성을 볼 수 없으면 FAIL" → 사전심사는 FAIL 경향, 사후 운영 풍부 → 종합 **PARTIAL**.

## 8. 시나리오 3 판정 — 매장 경영자가 참여한다 → **PARTIAL (대상검증·고지 FAIL)**
정산 조건은 명확히 표시(PASS 측면). 그러나 **참여 대상 검증 전무(누구나 참여)** + **투자형 아님 고지 부재**. WO 기준 "대상 검증 없이 누구나 참여 가능하면 정책 검토 필요" → **PARTIAL**(정산 명확하므로 FAIL은 회피).

## 9. 제품 정산/배송/이행 시나리오 판정 (시나리오 4) → **PARTIAL**
모집종료→자동전이 + 정산 상태머신 + shipping(주소) + fulfillment(상태머신+Neture order) 존재. 그러나 (1) 참여금 0원 → 정산 기준금액이 수기 의존, (2) **무인증 라우터**, (3) supplier dispatch 액션·운영자 스코프 fulfillment 뷰 없음. WO 기준 "배송/이행 있으나 매장 랜딩 기록 약하면 PARTIAL" → **PARTIAL**.

## 10. 매장 랜딩 기록 가능성 판정 → **PARTIAL**
`createListingFromParticipant` → `organization_product_listings`(source_type='market_trial') autolink + `participant.listingId` 역기록 + funnel/results 집계 = 랜딩 신호 존재. 그러나 **참여자에 store/org 식별자 부재**로 "어느 매장에 실제로 들어갔는가"를 직접 식별 못하고, `convertedProductId`+수동 `adopted` 선행 필요. 핵심 KPI("몇 개 매장 랜딩")는 listing 카운트로 근사 가능하나 매장 단위 추적은 약함 → **PARTIAL**.

## 11. 명칭/가이드 정합성 확인 → **PASS (bare "Trial"만 PARTIAL)**
- cross-service(KPA/Glyco/KCos/shared-space-ui) CTA·리다이렉트: 전부 "유통참여형 펀딩"(붙여쓰기), 링크 `https://neture.co.kr/market-trial` 등 정상, dead link 0.
- Neture 프론트 렌더링: Market Trial/마켓 트라이얼/유통 참여형(공백) = 0.
- 가이드(`/guide/features/market-trial`): 선행 WO로 8섹션+카드목차 PASS(라이브 검증 완료).
- **단**: bare 영어 "Trial" 이 공급자/운영자/참여 화면에 다수 노출 → 외부 표기 표준상 정리 대상(작은 결함).

---

## 12. PASS / PARTIAL / FAIL 매트릭스 (WO §4)

| 영역 | 질문 | 판정 | 근거 요약 |
|---|---|:---:|---|
| 공개 안내 | 목적 이해 가능 | **PASS** | 가이드 8섹션 + 상세 펀딩구조/정산예시 |
| 공급자 제안 | 매장 랜딩 목적 설계 | **PARTIAL** | 목표금액/정원/리워드 OK / 목표 매장수·per-store limit·도매가·정산 제품구성 부재 |
| 참여 대상 | store_owner/business 제한·식별 | **FAIL** | join=isAuthenticated만, eligibleRoles 미적용, store/org FK 없음 |
| 참여 금액 | 1인당 한도/수량 제한 | **FAIL** | per-participant limit 필드 없음, join contributionAmount=0 |
| 목표 설계 | 목표 금액·참여/매장 수 구분 | **PARTIAL** | targetAmount + maxParticipants(상한)뿐, 별도 목표 매장수 없음 |
| 제품 정산 | 제품 정산 조건 구조화 | **PARTIAL** | settlement 블록 존재, product-only 미강제, 최종 offline 수기 |
| 정산 가격 기준 | 도매가 이하 표시/입력/검토 | **FAIL** | wholesale/cost 필드 전무 |
| 결제/참여 기록 | 참여금/상태/취소·환불 | **FAIL** | join 0원, PG/checkout 없음, 참여자 취소 엔드포인트 없음, 환불 워크플로 없음 |
| 배송/이행 | 정산 후 배송/이행 추적 | **PARTIAL** | shipping+fulfillment 상태머신 존재(단 무인증, supplier dispatch·운영자 뷰 없음) |
| 매장 랜딩 | 어느 매장 들어갔는지 기록 | **PARTIAL** | listing autolink + listingId, 단 매장 식별 약함 |
| 피드백 | 매장 반응/개선 수집 | **PARTIAL** | 포럼+continue/stop, 구조화 피드백/사유 없음 |
| 후속 주문 | 정식유통/추가주문/Event Offer | **FAIL** | first_order 수동 라벨만, Order FK·Event Offer 연계 전무 |
| 운영자 검토 | 투자형 오해·정산 조건 검토 | **PARTIAL** | binary 승인, 승인 화면에 경제구조 미표시, 사유 미영속 |
| 알림 | 공급자·참여자·운영자 상태 알림 | **PARTIAL** | in-app 다수 존재, onSubmitted 미호출·결제알림 미발화, email/SMS 없음 |
| 명칭 | 외부 Market Trial 미노출 | **PARTIAL** | Market Trial/마켓트라이얼/공백표기 0(PASS), 단 bare "Trial" 영어 노출 |
| **(추가) 보안** | shipping/fulfillment 권한 보호 | **FAIL** | 무인증 라우터, PII·주문생성 노출, Boundary §7 위반 |

집계: PASS 1 · PARTIAL 8 · FAIL 6(보안 포함). 사업 명제 충족도 = **부분 충족(스켈레톤)**.

---

## 13. 기능 갭 목록 (우선순위)

| # | 갭 | 심각도 | 영향 |
|---|---|:---:|---|
| G1 | shipping/fulfillment **무인증** 라우터 | 🔴 최상(보안) | 배송지 PII 노출 + 주문생성 가능, Boundary 위반 |
| G2 | **투자형 아님 고지** 전 펀딩 화면 부재 | 🔴 높음(컴플) | 금융투자 오해 리스크 |
| G3 | **참여 대상 제한 부재**(eligibleRoles 미적용, store/org 식별 없음) | 🔴 높음 | 프로그램 목적과 불일치(누구나 참여) |
| G4 | **실제 참여금 결제 미연결**(join 0원, PG/checkout 없음) | 🔴 높음 | "소액 참여" 재무 미실현, 정산 기준금액 수기 의존 |
| G5 | 공급자 제안 설계 필드 부족(목표 매장수·per-store limit·도매가 기준·정산 제품 구성) | 🟡 중 | 펀딩 구조 설계 불충분 |
| G6 | 매장 랜딩 **매장 식별** 약함(참여자 store/org FK 없음) | 🟡 중 | 핵심 KPI "몇 개 매장 랜딩" 정밀 추적 불가 |
| G7 | 운영자 **승인 사전심사 깊이**(경제구조 미표시·체크리스트·사유 영속 없음) | 🟡 중 | 투자형/정산조건/대상 적합성 사전검토 불가 |
| G8 | 후속 주문/Event Offer 연계 부재(Order FK 없음) | 🟡 중 | 정식 유통 전환 추적 불가 |
| G9 | bare "Trial" 영어 렌더링 노출 | 🟢 낮 | 외부 표기 표준 미세 위반 |
| G10 | onSubmitted 미호출·결제 알림 미발화 | 🟢 낮 | 공급자/참여자 상태 인지 누락 |
| G11 | dead enum `TrialStatus.APPROVED`·ServiceApproval legacy(403) 잔존 | 🟢 낮 | 정리 대상(별도 cleanup) |

---

## 14. 필요한 후속 WO 목록

| WO(제안) | 범위 | DB/API |
|---|---|---|
| **WO-…-SHIPPING-FULFILLMENT-AUTH-HOTFIX-V1** (G1) | 무인증 라우터에 `requireAuth`+참여자/운영자 스코프 + Boundary 가드(participationId 단독 조회 금지) | API only |
| **WO-…-PARTICIPATION-UX-CLARITY-V1** (G2,G9) | 투자형 아님 고지 + 정산 조건 표시 보강 + 참여 대상 안내 + bare "Trial" 문구 정리 | 무변경 |
| **WO-…-PARTICIPANT-ELIGIBILITY-GATE-V1** (G3) | eligibleRoles 적용 + join 권한/멤버십 검증 + 프론트 버튼 노출조건 + 비대상 안내 | API(가드), DB 무변경 가능 |
| **WO-…-SUPPLIER-DESIGN-FIELDS-V1** (G5) | 목표 매장 수, 1인당 한도, 정산 제품 구성, 도매가 기준 — MarketTrial 최소 확장 | DB/API 확장 |
| **WO-…-PRODUCT-SETTLEMENT-PAYMENT-V1** (G4) | 참여금 결제 연결(checkoutService 경유), 정산 record, refund/cancel 상태 | DB/API |
| **WO-…-STORE-LANDING-TRACKING-V1** (G6) | 참여자 store/org 연결, 랜딩 상태/완료일, 운영자·공급자 KPI 카드 | DB/API |
| **WO-…-OPERATOR-REVIEW-CHECKLIST-V1** (G7) | 승인 화면에 펀딩 경제구조 표시 + 투자형/정산/대상/표시광고 체크리스트 + 승인 근거 영속 | DB(사유)/API |
| (정리) **WO-…-CLEANUP-V1** (G11) | APPROVED dead enum, ServiceApproval legacy route 제거 | DB migration |

---

## 15. 우선순위 (WO §11)

1. **G1 보안 핫픽스** — 운영 노출 PII/주문생성 위험, 최우선.
2. **G2 고지 + G9 문구**(UX-CLARITY) — DB/API 무변경, 사용자 오해 방지 우선.
3. **G3 참여 대상 제한**(ELIGIBILITY-GATE) — 프로그램 정체성.
4. **G5 공급자 설계 필드**(DESIGN-FIELDS).
5. **G4 결제/정산**(PAYMENT) — 결제·DB 변경, 별도 분리.
6. **G6 매장 랜딩 추적**(STORE-LANDING).
7. **G7 운영자 심사**(REVIEW-CHECKLIST).
8. (병행/낮음) G8, G10, G11 정리.

원칙: 기존 기능·내부 Market Trial 코드명 유지, 외부 표기 유통참여형 펀딩 유지, 결제/DB 변경은 IR 후 별도 WO로.

---

## 16. 변경 금지 범위

- 본 IR 은 **read-only** — 코드/API/DB/migration 무변경.
- 내부 Market Trial 코드명/라우트/API/DB 식별자 변경 금지(후속 WO도 동일).
- 다른 세션 untracked 파일(`vite.config.*`, 보류 IR, smoke 스크린샷) 미접촉.
- 산출물 = 본 문서 1건.

---

## 17. 검증 로그

- HEAD f87f833ef, branch main, working tree = untracked 아티팩트만(코드 무변경).
- 병렬 read-only 조사 4건(core 패키지 / api-server+확장+migration / neture 프론트 / cross-service+문서) + 직접 코드 검증 3건:
  - `marketTrialController.ts:612` `contributionAmount: 0`(참여금 미결제) 확인.
  - `marketTrialController.ts:565-582`/`:790` join 가드에 eligibleRoles 미검사 확인.
  - `register-routes.ts:379/385` + 확장 디렉터리 인증 미들웨어 0 → shipping/fulfillment 무인증 확인.
- 명칭: cross-service·Neture 렌더링에서 Market Trial/마켓 트라이얼/유통 참여형(공백) 0, bare "Trial" 노출 다수 확인.
- 문서 baseline 3건과 코드 정합: 대체로 일치(실행 Neture 단일, redirect 게이트). APPROVED dead enum·ServiceApproval legacy 잔존은 dead-code audit 권고와 일치.

---

*상태: 조사 완료 / 후속은 우선순위별 별도 WO (G1 보안 핫픽스 최우선)*
