# CHECK-O4O-MARKET-TRIAL-COMMERCE-WIRING-DISABLE-WITH-DATA-PRESERVATION-V1

> **유형**: Implementation CHECK — 유통참여형 펀딩(Market Trial) 커머스 배선 **P0 신규 차단** + 기존 데이터 보존.
> **WO**: `WO-O4O-MARKET-TRIAL-COMMERCE-WIRING-DISABLE-WITH-DATA-PRESERVATION-V1`
> **선행**: `O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1`(경계) · `IR-...-COMMERCE-WIRING-RESIDUAL-AUDIT-V1`(잔존) · `IR-...-COMMERCE-DATA-PRESENCE-CHECK-V1`(Case B 실측).
> **성격**: 코드 수정(신규 mutation 차단). **DB migration 0 / 운영 데이터 변경 0 / schema drop 0.**
> **작성일**: 2026-06-19
> **결과**: **PASS (조건부 — 런타임/브라우저 검증은 배포 후)**. api-server + web-neture typecheck PASS, 기존 1건 데이터 보존 실측 확인.

---

## 0. 요약

유통참여형 펀딩의 **신규 커머스 mutation 을 backend + frontend 양쪽에서 차단**했다. 핵심 데이터 게이트는 **backend 409 차단**이며, frontend 는 api 클라이언트 계층에서 즉시 정책 에러를 throw 한다. **기존 정산·결제 1건 및 모든 기존 데이터는 건드리지 않았다**(read-only 재실측으로 보존 확인).

---

## 1. 변경 파일 목록 (path-specific)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | `updateParticipantSettlementStatus` / `updateParticipantPaymentStatus` / `convertToProduct` 진입부 409 차단 가드 |
| `apps/api-server/src/controllers/market-trial/marketTrialController.ts` | `saveSettlementChoice` 진입부 409 차단 가드 |
| `apps/api-server/src/extensions/trial-fulfillment/trialFulfillment.controller.ts` | `createOrder` / `syncStatus` 진입부 409 차단 가드 |
| `apps/api-server/src/extensions/trial-shipping/trialShipping.controller.ts` | `setAddress` 진입부 409 차단 가드 |
| `services/web-neture/src/api/trial.ts` | `marketTrialCommerceDisabled()` helper + 6개 mutation 함수(정산선택/제품전환/정산상태/결제상태/매장진열/배송지) 즉시 throw |

> 기존 로직은 모두 **unreachable 로 보존**(추후 정의 재확인 시 참조). DB/route 구조·DTO·schema **무변경**.

---

## 2. 차단/제거한 backend route·handler

| 기능 | 핸들러 | 코드 | 상태 |
|------|--------|------|------|
| 제품 전환 | `convertToProduct` | `MARKET_TRIAL_PRODUCT_CONVERSION_DISABLED` (409) | 신규 차단 |
| 정산 상태 변경 | `updateParticipantSettlementStatus` | `MARKET_TRIAL_SETTLEMENT_DISABLED` (409) | 신규 차단 |
| 정산 선택 저장 | `saveSettlementChoice` | `MARKET_TRIAL_SETTLEMENT_DISABLED` (409) | 신규 차단 |
| 결제 상태 변경 | `updateParticipantPaymentStatus` | `MARKET_TRIAL_PAYMENT_DISABLED` (409) | 신규 차단 |
| 풀필먼트 주문 생성 | `createOrder` | `MARKET_TRIAL_FULFILLMENT_DISABLED` (409) | 신규 차단 |
| 풀필먼트 상태 동기화 | `syncStatus` | `MARKET_TRIAL_FULFILLMENT_DISABLED` (409) | 신규 차단 |
| 배송지 수집 | `setAddress` | `MARKET_TRIAL_SHIPPING_DISABLED` (409) | 신규 차단 |
| 매장 진열 전환(OPL) | `createListingFromParticipant` | `MARKET_TRIAL_CONVERSION_DISABLED` (409) | **선행 WO 로 이미 차단**(변경 없음) |
| checkout 역연결 | `tryConnectOrderToTrial` | no-op `return` | **선행 WO 로 이미 차단**(변경 없음) |

---

## 3. 차단한 frontend action

api 클라이언트(`trial.ts`) 계층에서 즉시 throw → 호출하는 버튼/액션이 **동작하지 않음**(WO §13.2 "사라지거나 동작하지 않는다" 충족). 페이지 JSX 는 미수정(narrowing/타입 안전 + P1 문구 정리는 후속).

| 액션 | 클라이언트 함수 | 소비 화면 |
|------|----------------|-----------|
| 제품 전환 | `convertTrialToProduct` | operator `MarketTrialApprovalDetailPage`(상품 전환 모달) |
| 매장 진열(활용 상품 연결) | `createListingFromTrialParticipant` | operator 상세 |
| 정산 상태 변경 | `updateParticipantSettlementStatus` | operator 상세 |
| 결제(입금 확인) 상태 변경 | `updateParticipantPaymentStatus` | operator 상세 |
| 정산 선택(제품/현금) | `saveSettlementChoice` | participant `MyParticipationsPage` 드로어 |
| 배송지 제출 | `submitShippingAddress` | (현재 활성 호출처 없음 — 선제 차단) |

---

## 4. 검증 결과

### 4.1 타입체크 (PASS)

| 대상 | 결과 |
|------|------|
| `apps/api-server` `tsc --noEmit` | **PASS** (exit 0, trial 관련 error 0) |
| `services/web-neture` `tsc --noEmit` | **PASS** (error 0) |

> 1차 시도 시 페이지 핸들러에 early-return 삽입 → unreachable 코드에서 `id: string|undefined` narrowing 손실로 TS2345 발생. **api 클라이언트 계층 throw 방식으로 전환**(파라미터가 typed string)하여 해소. 페이지 핸들러 수정은 원복.

### 4.2 기존 데이터 보존 (read-only 재실측, PASS)

작업 후 production SELECT 재실행 결과(선행 실측과 동일 — **데이터 무변경 입증**):

| 항목 | 결과 |
|------|------|
| `market_trials` | trials=1, converted=0 |
| `customerConversionStatus` | none=1 |
| `settlementStatus` | choice_pending=1 (보존) |
| `paymentStatus` | paid=1 (보존) |
| `market_trial_fulfillments` | 0 |
| `market_trial_shipping_addresses` | 0 |
| OPL `source_type='market_trial'` | 0 |

→ 기존 정산·결제 1건 **삭제/수정 없음**. 신규 커머스 데이터 0.

### 4.3 런타임/브라우저 smoke (배포 후 수행 예정)

본 변경은 미배포 상태(main push → CI 배포). 배포 후 권장 검증:
- operator 상세에서 상품전환/정산/결제 액션 클릭 → 정책 메시지 노출 + mutation 미발생(409).
- `GET` 조회·참여 목록·콘텐츠 상세는 정상.
- 위 §4.2 SQL 재실행 시 수치 동일 유지.

---

## 5. WO 범위 외 / GAP 기록

- **`updateParticipantConversionStatus`(customerConversionStatus: none→interested→…→first_order)** 는 WO §6.1 backend 차단 목록·§8.1 frontend 제거 목록 **어디에도 없어 P0 범위 외**로 두었다(미차단). 이는 주문/결제 데이터를 만들지 않는 **참여자 상태 라벨**이나, content-only 관점에서는 전환 퍼널 용어이므로 **후속(P1/별도) 검토 대상**으로 기록한다. 현재 운영 데이터는 `none=1`(미사용).
- `searchProductsForConversion`(상품 검색, read-only)은 차단하지 않음(전환 자체가 차단되어 무해). P2 계약 정리에서 함께 제거 가능.

---

## 6. 하지 않은 것 (범위 준수)

```
운영 데이터 삭제/수정 — 없음
DB migration — 없음
schema drop (*_fulfillments / *_shipping_addresses) — 없음 (P3)
DTO/API 계약 대규모 정리 — 없음 (P2)
참여 신청·콘텐츠 작성·게시 승인·참여자 목록 — 유지
KPA/GP/KCos store 연결 작업 — 없음 (이미 clean)
page JSX/문구 정정 — 없음 (P1)
package/lock/Dockerfile — 무변경
```

---

## 7. 완료 기준 점검 (WO §18)

```
신규 제품 전환 불가 — ✅ (backend 409 + client throw)
신규 OPL 전환 불가 — ✅ (선행 차단 유지 + client throw)
checkout 역연결 제거 — ✅ (선행 no-op 유지)
신규 정산 상태 변경 불가 — ✅
신규 결제 상태 변경 불가 — ✅
신규 풀필먼트 주문 생성 불가 — ✅
신규 배송지 저장 불가 — ✅
기존 정산·결제 1건 미삭제/미수정 — ✅ (재실측)
DB migration 없음 — ✅
참여 신청/현황/콘텐츠 조회 유지 — ✅ (해당 핸들러 무변경)
CHECK 문서 작성 — ✅ (본 문서)
```

---

## 8. 후속

- **P1** `WO-O4O-MARKET-TRIAL-UI-COMMERCE-LABEL-CLEANUP-V1` — 매장 진열/첫 주문/상품 전환/정산/결제/발송 문구·KPI(supplier "매장 진열" 등) content-only 정정. **+ conversion-status 액션 처리 결정**(§5).
- **P2** `WO-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1` — DTO/API 계약(productId/convertedProductId/listingId/settlement*/payment*/ShippingAddress/Fulfillment) 정리.
- **P3** `WO-O4O-MARKET-TRIAL-SCHEMA-CLEANUP-V1` — `*_fulfillments`/`*_shipping_addresses`(row 0) drop + participants 커머스 컬럼 정리. **단 기존 정산·결제 1건 처리 정책 확정 후**.

---

*Date: 2026-06-19 · 구현 CHECK · backend 409 차단 7 handler + frontend client throw 6 fn · DB/데이터 무변경 · typecheck PASS · 기존 1건 보존 실측 확인 · 런타임 검증은 배포 후.*
