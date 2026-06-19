# CHECK-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1

> **유형**: Implementation CHECK — 유통참여형 펀딩(Market Trial) **DTO/API 계약 정리 + 죽은 UI 물리 제거(P2)**.
> **WO**: `WO-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1`
> **선행**: `O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1` · P0(`...-COMMERCE-WIRING-DISABLE-WITH-DATA-PRESERVATION-V1`) · P1(`...-UI-COMMERCE-LABEL-CLEANUP-V1`).
> **범위 결정(사용자 2026-06-19)**: **안전 부분 제거 + 문서화** — 독립 커머스 블록·callerless client 함수는 물리 제거, 깊게 얽힌 부분(operator ParticipantSection 18-prop, supplier/participant 게이트)은 플래그 유지 + 사유 문서화(WO §17 허용).
> **성격**: frontend 전용. **backend/DB migration/운영 데이터 변경 0.**
> **작성일**: 2026-06-19
> **결과**: **PASS (조건부 — 런타임/브라우저 검증은 배포 후)**. web-neture typecheck PASS, 데이터 보존 재실측 동일.

---

## 0. 요약

P1에서 플래그로 숨긴 죽은 코드 중 **독립적이고 안전하게 제거 가능한 부분을 물리 제거**했다(operator main 컴포넌트의 제품 전환 모달/섹션 + 종속 컴포넌트·핸들러·state·import, trial.ts의 callerless client 함수 3개). 깊게 얽힌 부분(operator `ParticipantSection` 18-prop 하위컴포넌트 내부, supplier/participant 게이트 섹션)은 **빌드 회귀 위험을 피해 플래그 유지 + 사유 문서화**했다(WO §17 명시 허용). backend/DB 무변경, 기존 데이터 보존.

**규모**: operator 페이지 **−333줄**, trial.ts **−39줄**(net), 총 약 −372줄.

---

## 1. 변경 파일 (path-specific, 2)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | 제품 전환 모달·ProductConversionSection·ProductSearchTable·PRODUCT_SEARCH_COLUMNS·커머스 핸들러 4·커머스 state 8·orphan import 6 **물리 제거** |
| `services/web-neture/src/api/trial.ts` | `convertTrialToProduct`·`searchProductsForConversion`·`submitShippingAddress` **물리 제거**(호출처 0) |

> **다른 세션 WIP 미접촉**: 본 커밋은 위 2개 파일 + CHECK 문서만 포함.

---

## 2. 물리 제거 (operator main 컴포넌트)

| 항목 | 내용 |
|------|------|
| 제품 전환 모달 | `showConvertModal` 모달 JSX 블록 전체 |
| ProductConversionSection | 컴포넌트 정의 + 호출 블록 |
| ProductSearchTable | 컴포넌트 정의 + `PRODUCT_SEARCH_COLUMNS` 배열 |
| 핸들러 4 | `handleProductSearch` · `handleSearchKeywordChange` · `openConvertModal` · `handleConvert` |
| state 8 | `showConvertModal` · `convertNote` · `convertLoading` · `productSearchKeyword` · `productSearchResults` · `productSearchLoading` · `selectedProductKey` · `searchDebounceRef` |
| import 6 | `useRef` · `convertTrialToProduct` · `searchProductsForConversion` · `ProductSearchItem`(type) · `BaseTable` · `O4OColumn`(type) |

## 3. 물리 제거 (trial.ts client 함수)

| 함수 | 호출처 | 비고 |
|------|:---:|------|
| `convertTrialToProduct` | 0 (operator 핸들러 제거됨) | 제거 |
| `searchProductsForConversion` | 0 (operator 핸들러 제거됨) | 제거 |
| `submitShippingAddress` | 0 (활성 호출처 없음) | 제거 |

> **유지(아직 호출처 있음)**: `createListingFromTrialParticipant` · `updateParticipantConversionStatus` · `updateParticipantSettlementStatus` · `updateParticipantPaymentStatus` · `saveSettlementChoice` — operator `ParticipantSection`/participant 드로어의 게이트된(비노출) 핸들러가 여전히 참조. 이들은 즉시 throw(P0/P1) 상태 유지. 게이트 제거 시 함께 제거 예정.

---

## 4. 유지 + 사유 문서화 (§17 허용)

| 대상 | 상태 | 사유 |
|------|------|------|
| operator `ParticipantSection` 내부(매장 랜딩 단계 컬럼·활용 상품 연결 컬럼·오프라인 입금 섹션·정산 섹션·KPI 요약·안내문) + `SHOW_MARKET_TRIAL_COMMERCE_UI` | 플래그 비노출 유지 | 18-prop 하위컴포넌트 재배선 = 빌드 회귀 위험 큼. 사용자 선택(안전 부분 제거) |
| `SupplierTrialDetailPage` 게이트 섹션(이행/매장 진열/거래선 전환/상품 전환) + 플래그 | 비노출 유지 | 동일 — 게이트로 비노출, 물리 제거는 후속 |
| `MyParticipationsPage` 정산 선택 게이트 + passive 정산 표시 + 플래그 | 비노출/표시 유지 | 페이지 본질이 정산 표시 → redesign 필요, P3 데이터 정리와 함께 |
| trial.ts 잔존 client 함수(위 §3 유지 목록) + `marketTrialCommerceDisabled` helper | throw 유지 | 게이트 핸들러가 참조 |
| backend 409 차단 가드(P0/P1 8개 핸들러) | 유지 | WO §6.2 — route 삭제 대신 guard 유지 권장 |

> 모든 유지 항목은 **사용자에게 보이지 않고(P1 게이트) 신규 데이터도 만들 수 없음(P0/P1 409)**. 물리 제거·DTO 필드 축소·schema drop 은 P3(+데이터 1건 처리 확정)로 이월.

---

## 5. 검증

### 5.1 Typecheck (PASS)
| 대상 | 결과 |
|------|------|
| `services/web-neture` `tsc --noEmit` | **PASS** (orphan import 6개 제거 후 error 0) |
| `apps/api-server` | 무변경 (P2 backend 편집 없음) |

### 5.2 호출처 grep (제거 확정)
```
convertTrialToProduct        → trial.ts 외 0
searchProductsForConversion  → trial.ts 외 0
submitShippingAddress        → 0
ProductSearchItem/BaseTable/O4OColumn/useRef (operator) → 0 (tsc TS6133/6196 로 확인 후 제거)
```

### 5.3 데이터 보존 (read-only 재실측, PASS)
| 항목 | 결과 |
|------|------|
| trials / converted | 1 / 0 |
| customerConversionStatus | none=1 |
| settlementStatus | choice_pending=1 |
| paymentStatus | paid=1 |
| fulfillments / shipping / OPL(market_trial) | 0 / 0 / 0 |

→ P1 이후와 동일. P2 는 **DB write 0**(frontend 전용).

### 5.4 런타임/브라우저 smoke (배포 후)
미배포(main push → CI). 배포 후: operator 상세에 제품 전환/정산/결제/매장 랜딩 UI 미노출, 콘텐츠·참여자 목록·승인/반려·CSV·상태전환·포럼 정상, console error 0.

---

## 6. 하지 않은 것
```
backend route 삭제 — 없음 (409 guard 유지, WO §6.2)
DTO entity 필드 삭제 / API response shape 축소 — 보류 (P2 범위 내 저위험분만, 대규모는 P3)
DB migration / schema drop — 없음
운영 데이터 삭제/수정 — 없음 (정산·결제 1건 보존)
operator ParticipantSection / supplier / participant 게이트 물리 제거 — 보류(문서화)
participant 기능 / 콘텐츠 / 게시 승인 / 참여자 목록 — 유지
다른 세션 WIP — 미커밋
package/lock/Dockerfile — 무변경
```

---

## 7. 완료 기준 점검 (WO §17)
```
차단된 커머스 client mutation 함수 호출처 제거 — ✅ (operator 핸들러 제거 → convert/search/shipping client 제거)
SHOW_MARKET_TRIAL_COMMERCE_UI 제거 또는 잔존 사유 기록 — ✅ (operator/supplier/participant 잔존 + 사유 §4)
operator/supplier/participant 죽은 커머스 UI 물리 제거 — △ (operator main 컴포넌트 제거 / 하위컴포넌트·supplier·participant 게이트는 §4 사유로 유지)
API/DTO 커머스 필드 사용 축소 — △ (client 함수 3 제거; 대규모 response 축소는 P3)
reward/fulfillment 컬럼 처리 방향 결정 — ✅ (게이트 유지, P3 재검토로 기록)
기존 정산·결제 1건 미삭제/미수정 — ✅ (재실측)
DB migration 없음 — ✅
참여 신청/현황/콘텐츠 조회 유지 — ✅
typecheck 통과 — ✅
CHECK 문서 작성 — ✅
```

---

## 8. 후속 (P3)
`WO-O4O-MARKET-TRIAL-SCHEMA-CLEANUP-V1` — **기존 정산·결제 1건 처리 정책(A 감사 보존 / B 승인 후 삭제 / C 아카이브) 확정 후**:
- `market_trial_fulfillments` · `market_trial_shipping_addresses`(row 0) drop
- `market_trial_participants` 정산·결제·전환 컬럼 + `market_trials` 제품 전환 컬럼 정리
- OPL `source_type='market_trial'` 정리
- 잔존 게이트 UI·client 함수·DTO 필드 동반 물리 제거(스키마와 정합)

---

*Date: 2026-06-19 · 구현 CHECK(P2) · operator main 컴포넌트 + trial.ts callerless 함수 물리 제거(−372줄), 얽힌 부분 게이트 유지+문서화 · backend/DB 무변경 · typecheck PASS · 기존 1건 보존 재실측 · 런타임 검증은 배포 후.*
