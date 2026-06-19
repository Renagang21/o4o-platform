# CHECK-O4O-MARKET-TRIAL-PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP-V1 (P3-1)

> **유형**: Implementation CHECK — 유통참여형 펀딩(Market Trial) **주문/발송 축(fulfillment·shipping) 스키마 제거(P3-1)**.
> **WO**: `WO-O4O-MARKET-TRIAL-PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP-V1` (사용자 결정: **단계 1만 먼저**).
> **선행**: 경계 V1 · P0(WIRING-DISABLE) · P1(UI-LABEL) · P2(CONTRACT-CLEANUP).
> **성격**: **DB migration 포함**(row 0 테이블 2개 drop). settlement/payment 컬럼·데이터·기존 1건 **미변경**. core 컬럼(productId/convertedProduct*/listingId/customerConversion*) **미변경**(P3-2로 분리).
> **작성일**: 2026-06-19
> **결과**: **PASS (조건부 — 마이그레이션은 CI 배포 시 실행, 런타임/브라우저 검증은 배포 후)**. api-server + web-neture typecheck PASS, 사전/사후 실측 일치.

---

## 0. 요약

content-only 정책에 따라 **row 0으로 확인된 주문/발송 축(`market_trial_fulfillments`, `market_trial_shipping_addresses`)만** 안전하게 제거했다. 테이블 drop 마이그레이션 + entity/controller/route + checkout 역연결 + frontend 타입까지 정합되게 정리. **정산·결제 축과 기존 1건, core 전환 컬럼은 일절 건드리지 않았다.**

### 동시 세션 충돌 처리 경과
- 본 작업 중 다른 세션의 "Read-Only Hub / build-contamination" 리팩터가 trial 확장 파일을 **사고로 삭제→복원**(`ada03af5c revert: restore ... swept`)했고, 그 과정에서 main 이 일시적으로 dangling import 로 깨졌었다. → **커밋 보류** 후 다른 세션 완료(main=`83a89c680`, 빌드 정상) 확인.
- 확장 복원은 **사고 복구**였지 정책이 아니므로, 안정화된 main 위에서 P3-1(의도적 제거)을 **재적용**. path-specific 커밋으로 다른 세션 커밋물과 분리.

---

## 1. 변경 내역

### Migration (신규)
- `apps/api-server/src/database/migrations/20261115000000-DropMarketTrialFulfillmentAndShipping.ts`
  - up: `DROP TABLE IF EXISTS market_trial_fulfillments / market_trial_shipping_addresses`
  - down: 두 테이블 구조 복원(데이터 복원 없음 — 원본 row 0)

### Entity / Controller / Route 제거 (파일 삭제)
- `extensions/trial-fulfillment/` 전체 (entity·controller·routes·store·index)
- `extensions/trial-shipping/` 전체 (entity·controller·routes·store·index)

### 등록 해제
- `bootstrap/register-routes.ts` — trial-shipping/fulfillment import 6 + 등록 블록 2 제거
- `database/connection.ts` — `MarketTrialShippingAddress`/`MarketTrialFulfillment` entity import 2 + DataSource entities 배열 2 제거

### checkout 역연결 제거
- `services/checkout.service.ts` — `tryConnectOrderToTrial` 호출 + 구현(first_order 승격 hook) 제거

### Frontend 타입/클라이언트 제거
- `services/web-neture/src/api/trial.ts` — `ShippingAddress`/`Fulfillment` 타입 + `getShippingAddress`/`getFulfillment` 제거 (submitShippingAddress 는 P2 에서 제거됨)

---

## 2. 보존 (절대 미변경)
```
settlement* 컬럼 (settlementChoice/Status/Amount/ProductQty/Remainder/Note) — 유지
payment* 컬럼 (paymentStatus/Method/Provider/Reference/paidAmount/paidAt/confirmedAt/paymentNote) — 유지
기존 정산·결제 1건 (settlementStatus=choice_pending, paymentStatus=paid) — 미수정/미삭제
core 전환 컬럼 (market_trials.productId/convertedProduct*, participants.listingId/customerConversion*) — 미변경 (P3-2)
OPL source_type/source_id 컬럼 — 미변경 (다른 source_type 공유, market_trial row=0)
참여 신청 / 콘텐츠 / 게시 승인 / 참여자 목록 / lifecycle — 유지
```

---

## 3. 검증

### 3.1 사전 실측 (마이그레이션 전, read-only)
| 항목 | 값 |
|------|----|
| market_trial_fulfillments | **0** |
| market_trial_shipping_addresses | **0** |
| market_trials.productId / convertedProductId / convertedProductName / conversionNote | 모두 NULL |
| participants.listingId / customerConversion* | NULL / none |
| settlementStatus / paymentStatus | choice_pending=1 / paid=1 (보존 대상) |

→ drop 대상 두 테이블 **데이터 없음** 확정. 배송지 개인정보 저장 이력 없음.

### 3.2 타입체크 (PASS)
| 대상 | 결과 |
|------|------|
| `apps/api-server` `tsc --noEmit` | **PASS** (entity/import 제거 후 dangling 0, error 0) |
| `services/web-neture` `tsc --noEmit` | **PASS** (error 0) |

### 3.3 사후 실측 (커밋 직전, read-only — DB 무변경 확인)
```
fulfillments=0  shipping=0
trials=1  settle_choice_pending=1  pay_paid=1
```
→ 본 작업은 코드/스키마 파일만 변경(아직 DB 미실행). 마이그레이션은 **CI 배포 시 자동 실행**.

### 3.4 마이그레이션/런타임 (배포 후)
- CI(main 배포)가 마이그레이션 실행 → 두 빈 테이블 drop. entity 제거와 정합(잔존 entity가 drop된 테이블을 가리키지 않음).
- 배포 후 권장: api-server 기동 정상(✅ trial 확장 등록 로그 사라짐), `/api/trial-shipping`·`/api/trial-fulfillment` 404, market trial 참여/조회/콘텐츠 정상, checkout 일반 주문 정상.

---

## 4. 하지 않은 것
```
settlement/payment 컬럼 drop — 없음
core 전환 컬럼(productId/convertedProduct*/listingId/customerConversion*) drop — 없음 (P3-2)
OPL source_type/source_id 컬럼 변경 — 없음
운영 데이터 삭제/수정 — 없음 (1건 보존)
다른 세션 커밋물 / 미커밋 파일 접촉 — 없음 (path-specific)
package/lock/Dockerfile — 무변경
```

---

## 5. 완료 기준 점검 (WO §17, P3-1 범위)
```
fulfillment 주문 생성 스키마/route 제거 — ✅ (테이블 drop + 디렉터리 삭제)
shipping 배송지 수집 스키마/route 제거 — ✅
checkout 역연결 제거 — ✅
settlement/payment 컬럼 유지 — ✅
펀딩 참여 금액·입금·오프라인 정산 기록 유지 — ✅
기존 정산·결제 1건 미삭제/미수정 — ✅ (사후 실측)
core 컬럼 미변경 (P3-2 분리) — ✅
참여 신청/현황/콘텐츠 조회 유지 — ✅
typecheck 통과 — ✅
CHECK 문서 작성 — ✅
```

---

## 6. 후속
- **P3-2** `WO-...-CORE-COLUMN-CLEANUP` — `productId` / `convertedProduct*` / `listingId` / `customerConversion*` core 컬럼 처리 판단. core entity + operator/getFunnel/KPI 타입에 깊게 얽혀 cascade 큼 → 별도 신중 WO. (productId 는 content 소개 display 용일 수 있어 drop vs legacy 유지 판단 포함.)
- **P3-3** offline settlement/payment 운영 정책 문서화(삭제 대상 아님 — 상당 기간 운영).

---

*Date: 2026-06-19 · 구현 CHECK(P3-1) · row 0 fulfillment/shipping 축 제거(migration + entity/controller/route + checkout 역연결 + frontend 타입) · settlement/payment·1건·core 컬럼 보존 · typecheck PASS · 사전/사후 실측 일치 · 마이그레이션은 CI 배포 시 실행 · 동시 세션 안정화 후 재적용·path-specific.*
