# CHECK-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1 (P3-2b)

> **유형**: Implementation CHECK — 유통참여형 펀딩(Market Trial) **전환 컬럼 DROP + 잔존 게이트 코드 물리 제거(P3-2b)**.
> **WO**: `WO-O4O-MARKET-TRIAL-CONVERSION-COLUMNS-DROP-V1`
> **선행**: IR `...CORE-CONVERSION-COLUMNS-CLEANUP-AUDIT-V1` · P3-2a `...CONVERSION-READ-WIRING-CLEANUP-V1`.
> **성격**: **DB migration(DROP COLUMN) 포함** + entity field 제거 + 잔존 게이트 UI/type/client 물리 제거. productId·settlement·payment 보존.
> **작성일**: 2026-06-19
> **결과**: **PASS (조건부 — 마이그레이션은 CI 배포 시 실행, 런타임/브라우저 검증은 배포 후)**. api-server(+@o4o/market-trial 빌드) + web-neture typecheck PASS. 사전 실측 전 컬럼 0/null/none.

---

## 0. 요약

전환 7컬럼(`convertedProductId/Name`, `conversionNote`, `listingId`, `customerConversionStatus/At/Note`)을 **DB schema·entity·DTO·type·게이트 UI·client 함수에서 완전 제거**했다. 제품 전환/매장 진열/고객 전환 = content-only 비대상. **`productId`(content 소재 참조)와 settlement·payment 전 컬럼·기존 1건은 보존**.

P3-2a에서 이월했던 게이트 UI·타입·client·disabled 핸들러가 이번에 entity/컬럼 drop과 정합되게 한 번에 제거되어, `SHOW_MARKET_TRIAL_COMMERCE_UI` 의 전환 관련 의존이 사라졌다(operator 페이지 플래그는 settlement/payment 게이트로 잔존).

---

## 1. 사전 실측 (마이그레이션 전, read-only PASS)
| 항목 | 값 |
|------|---:|
| market_trials: convertedProductId / Name / conversionNote | 0 / 0 / 0 |
| market_trials: productId (보존) | null(0) |
| participants: listingId / customerConversionAt / customerConversionNote | 0 / 0 / 0 |
| participants: customerConversionStatus ≠ none | 0 (none=1) |
| OPL source_type='market_trial' | 0 |
| 보존: settlementStatus=choice_pending / paymentStatus=paid | 1 / 1 |

→ 7개 drop 대상 전부 데이터 없음 확정.

## 2. Migration
- `apps/api-server/src/database/migrations/20261116000000-DropMarketTrialConversionColumns.ts`
  - up: `ALTER TABLE market_trials DROP COLUMN IF EXISTS convertedProductId/convertedProductName/conversionNote`; `ALTER TABLE market_trial_participants DROP COLUMN IF EXISTS listingId/customerConversionStatus/customerConversionAt/customerConversionNote`
  - down: 7컬럼 nullable 복원(customerConversionStatus default 'none'). 데이터 복원 없음.
  - **CI(main 배포) 자동 실행.** productId·settlement·payment 미변경.

## 3. Backend 코드
| 파일 | 변경 |
|------|------|
| `packages/market-trial/src/entities/MarketTrial.entity.ts` | convertedProductId/Name/conversionNote field 제거 (productId 유지) |
| `packages/market-trial/src/entities/MarketTrialParticipant.entity.ts` | listingId/customerConversionStatus/At/Note field 제거 (settlement·payment 유지) |
| `apps/api-server/.../marketTrialOperatorController.ts` | 409-disabled 핸들러 3개(`convertToProduct`/`createListingFromParticipant`/`updateParticipantConversionStatus`) + 전환 상수(VALID_CUSTOMER_CONVERSION_STATUSES/CustomerConversionStatus/CONVERSION_ELIGIBLE_STATUSES) 제거 |
| `apps/api-server/src/routes/market-trial-operator.routes.ts` | `/convert`·`/:participantId/listing`·`/:participantId/conversion` route 제거 |

> @o4o/market-trial 패키지 재빌드(entity 변경 → dist 동기) 후 api-server typecheck PASS.

## 4. Frontend 코드
| 파일 | 변경 |
|------|------|
| `services/web-neture/src/api/trial.ts` | Trial/OperatorTrial/TrialParticipant/TrialResultsSummary 의 7필드 + CustomerConversionStatus 타입 + TrialFunnel/getTrialFunnel + ConvertTrialPayload.conversionNote + getOperatorTrialParticipants 의 customerConversionStatus 필터 + client 함수 `updateParticipantConversionStatus`/`createListingFromTrialParticipant` 제거 |
| `.../operator/MarketTrialApprovalDetailPage.tsx` | 전환/매장진열 import·handler(handleConversionStatusChange/handleCreateListing)·state·ParticipantSection props/destructure/types·KPI 카운터(매장 도입/활용 상품 연결)·게이트 컬럼(th/td)·CONVERSION_STATUS_* 상수·conv_* 필터 제거 |
| `.../supplier/SupplierTrialDetailPage.tsx` | 매장 진열/거래선 전환/상품 전환 게이트 섹션 + getConversionStatus/CONVERSION_STAGES/conversionStatus 제거 (이행 현황 게이트 유지) |

## 5. 보존 (미변경 확인)
```
market_trials.productId — 유지 (content 소재 참조)
settlement*/payment* 컬럼·데이터·기존 1건 — 유지
참여 신청/콘텐츠/게시 승인/참여자 목록/lifecycle — 유지
operator SHOW_MARKET_TRIAL_COMMERCE_UI 플래그 — 잔존(settlement/payment·이행 게이트 용도) — §8
```

## 6. 검증
### 6.1 Typecheck (PASS)
- `@o4o/market-trial` build PASS · `apps/api-server` tsc PASS · `services/web-neture` tsc PASS.
### 6.2 Grep (active code 0)
7개 전환 필드명 → api-server(migration 제외) 0, web-neture 0. (`listingId` 잔존은 product-candidate/cosmetics/event-offer 등 별개 도메인 — market trial 무관.)
### 6.3 데이터 (DB write 0, 마이그레이션은 CI)
본 작업은 코드 + migration 파일. 커밋 시점 DB 무변경. 컬럼 drop 은 배포 시 CI 실행. 사전 실측으로 안전 확인.
### 6.4 런타임/브라우저 (배포 후)
- api-server 기동 정상(entity↔DB 정합: 컬럼 drop + entity field 제거 동시 배포).
- operator/supplier 상세·참여자 목록·CSV·콘텐츠·승인 정상, 전환/매장진열/첫주문 UI 없음, console error 0.
- 사후 실측: 기존 trial 1 / participant 1 / productId / settlement choice_pending 1 / payment paid 1 유지.

## 7. 하지 않은 것
```
productId drop — 없음
settlement/payment 컬럼 drop / 데이터 수정 — 없음
운영 row 삭제/수정 — 없음
다른 세션 staged 파일(OfferServicePrice/pricing 등) — 미접촉(path-specific commit)
package/lock/Dockerfile — 무변경
```

## 8. 완료 기준 점검 (WO §18)
```
7컬럼 DB schema 제거(migration) — ✅
7컬럼 entity/type 제거 — ✅
전환/매장진열/첫주문 잔존 UI 제거 — ✅
conversion client 함수 제거 — ✅ (updateParticipantConversionStatus/createListingFromTrialParticipant)
productId 유지 — ✅
settlement/payment 유지 — ✅
운영 데이터 삭제/수정 없음 — ✅
참여 신청/현황/콘텐츠 조회 유지 — ✅
typecheck 통과 — ✅
CHECK 문서 작성 — ✅
SHOW 플래그: operator 잔존(settlement/payment·이행 게이트) — 사유 기록(§5)
```

## 9. 후속
- **P3-2c** `WO-O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1` — productId = content 소재 참조 legacy 유지 정책 문서화.
- **P3-3** `WO-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1` — settlement/payment = 오프라인 입금·펀딩 정산 운영 기록 보존 정책.

---

*Date: 2026-06-19 · 구현 CHECK(P3-2b) · 7 전환컬럼 DROP migration + entity/type/UI/client 물리 제거 · productId·settlement·payment 보존 · 사전 실측 전부 0/null/none · @o4o/market-trial+api-server+web-neture typecheck PASS · 마이그레이션 CI 실행 · 다른 세션 staged 파일 미접촉.*
