# CHECK-O4O-MARKET-TRIAL-UI-COMMERCE-LABEL-CLEANUP-V1

> **유형**: Implementation CHECK — 유통참여형 펀딩(Market Trial) **UI·문구 커머스 흔적 정리(P1)**.
> **WO**: `WO-O4O-MARKET-TRIAL-UI-COMMERCE-LABEL-CLEANUP-V1`
> **선행**: `O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1` · `IR-...-RESIDUAL-AUDIT-V1` · `IR-...-DATA-PRESENCE-CHECK-V1` · `WO-...-COMMERCE-WIRING-DISABLE-WITH-DATA-PRESERVATION-V1`(P0).
> **성격**: 화면 문구/액션 정리 + conversion-status 차단. **DB migration 0 / 운영 데이터 변경 0 / schema drop 0.**
> **작성일**: 2026-06-19
> **결과**: **PASS (조건부 — 런타임/브라우저 검증은 배포 후)**. api-server + web-neture typecheck PASS, 기존 데이터 보존 재실측 동일.

---

## 0. 요약

P0(신규 mutation 차단) 위에, 화면에서 **커머스 퍼널 UI(제품 전환 / 매장 진열 / 매장 랜딩 단계 / 정산 / 결제(오프라인 입금) / 발송)를 비노출**하고 텍스트를 content-only 로 정정했다. 추가로 GAP 였던 **`updateParticipantConversionStatus`(매장 도입/첫 주문 전환)를 backend + api client 에서 차단**했다. 기존 데이터(정산·결제 1건)는 건드리지 않았다.

UI 비노출은 **모듈/컴포넌트 단위 플래그 `SHOW_MARKET_TRIAL_COMMERCE_UI = false`** 로 게이트했다. 이 방식은 핸들러·import·타입이 (게이트된) JSX 안에서 계속 참조되어 **orphaned-symbol 빌드 깨짐 없이** UI 만 숨기며, P2/P3 정리 시 한 곳에서 되살리거나 제거할 수 있다. (WO §7.1 "제거하거나 숨긴다" 허용.)

---

## 1. 변경 파일 (path-specific, 7)

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../marketTrialOperatorController.ts` | `updateParticipantConversionStatus` 진입부 409 차단(`MARKET_TRIAL_CONVERSION_STATUS_DISABLED`) |
| `services/web-neture/src/api/trial.ts` | `updateParticipantConversionStatus` client 즉시 throw(정책 메시지) |
| `.../pages/operator/MarketTrialApprovalDetailPage.tsx` | 모듈 플래그 + 커머스 섹션 게이트(아래 §3) |
| `.../pages/supplier/SupplierDashboardPage.tsx` | "매장 진열" KPI 카드 제거 + 펀딩 CTA 문구 content-only 정정 |
| `.../pages/supplier/SupplierTrialDetailPage.tsx` | 플래그 + 이행/매장 진열/거래선 전환/상품 전환 섹션 게이트 |
| `.../pages/market-trial/MyParticipationsPage.tsx` | 플래그 + 정산 선택(제품/현금) 버튼 게이트 |
| `.../pages/market-trial/MarketTrialDetailPage.tsx` | "오프라인 운영 안내" → content-only "참여 안내" 문구 정정 |

> **다른 세션 WIP 미접촉**: `ProductForm.tsx` · `lib/api/supplier.ts` · `ProductDetailDrawer.tsx` 는 워킹트리에 있었으나 본 WO 와 무관하여 **커밋에서 제외**.

---

## 2. Backend — conversion-status 차단

| 기능 | 핸들러 | 코드 | 상태 |
|------|--------|------|------|
| 매장 도입/첫 주문 전환 상태 변경 | `updateParticipantConversionStatus` | `MARKET_TRIAL_CONVERSION_STATUS_DISABLED` (409) | 신규 차단 |

→ P0 GAP(§5 of P0 CHECK) 해소. 기존 `customerConversionStatus` 데이터(none=1)는 미변경.

---

## 3. Frontend — 비노출/정정 항목

### operator `MarketTrialApprovalDetailPage` (플래그 게이트)
- 매장 랜딩 파이프라인 KPI 요약(입금 확인/제품 정산/매장 도입/활용 상품 연결 카운트)
- 정산/매장 랜딩 안내 문구
- 참여자 테이블 **"매장 랜딩 단계" 컬럼(전환 dropdown)** + "활용 상품 연결" 컬럼
- **오프라인 입금 관리 섹션**(결제 lifecycle 테이블·액션)
- **정산 상태 관리 섹션**
- **제품 전환 모달** + **Product Conversion Section**
- 전환 퍼널 필터 칩(관심 확인/취급 검토/매장 도입/첫 주문) **제거**

### supplier
- `SupplierDashboardPage`: "매장 진열" KPI **제거**, 펀딩 CTA 문구 content-only 정정
- `SupplierTrialDetailPage`: 이행 현황 / 활용 상품 연결 현황 / 매장 랜딩(거래선 전환) 현황 / 상품 전환 상태 섹션 게이트

### participant
- `MyParticipationsPage`: **정산 선택(제품 수령/금액 환급) 버튼** 게이트
- `MarketTrialDetailPage`: 오프라인 정산 안내 문구 → content-only 정정

---

## 4. 검증

### 4.1 타입체크 (PASS)
| 대상 | 결과 |
|------|------|
| `apps/api-server` `tsc --noEmit` | **PASS** (trial 관련 error 0) |
| `services/web-neture` `tsc --noEmit` | **PASS** (error 0) |

> 플래그 게이트(`{SHOW_MARKET_TRIAL_COMMERCE_UI && (...)}`)는 내부 심볼을 타입체크 대상으로 유지하므로 `noUnusedLocals`/`noUnusedParameters` 위반 없음. (P0 의 unreachable narrowing 이슈 회피.)

### 4.2 기존 데이터 보존 (read-only 재실측, PASS)
| 항목 | 결과 |
|------|------|
| trials / converted | 1 / 0 |
| customerConversionStatus | none=1 |
| settlementStatus | choice_pending=1 (보존) |
| paymentStatus | paid=1 (보존) |
| fulfillments / shipping / OPL(market_trial) | 0 / 0 / 0 |

→ 선행 실측과 동일. 본 변경은 **DB write 0**.

### 4.3 런타임/브라우저 smoke (배포 후 수행 예정)
미배포(main push → CI). 배포 후 권장: operator 상세에서 전환/정산/결제/매장 랜딩 UI 미노출, supplier 매장 진열/첫 주문/이행률 미노출, participant 정산 선택 미노출, 콘텐츠·참여 현황 조회 정상, console error 0, §4.2 SQL 동일.

---

## 5. 범위/잔여 (정직한 기록)

- **수동 표시(read-only) 잔존**: `MyParticipationsPage` 드로어의 정산 계산 grid·정산 상태 badge는 **read-only 표시**로 남겨둠(actionable 한 정산 선택 버튼만 게이트). participant 측 결제/배송지 **입력 UI 는 원래 없음**. → 표시까지의 완전 제거는 P2(계약) / P3(스키마)에서 데이터와 함께 정리.
- **참여자 테이블의 "보상/이행(reward fulfillment)" 컬럼·토글**은 `updateParticipantRewardStatus`(WO P0/P1 차단 목록 외) 기반이라 이번 범위에서 유지. content-only 관점 재검토는 후속.
- UI 는 **삭제가 아니라 플래그 비노출**(WO 허용). 죽은 JSX 의 물리적 제거 + DTO/스키마 정리는 P2/P3.

---

## 6. 하지 않은 것
```
운영 데이터 삭제/수정 — 없음
DB migration / schema drop — 없음
DTO/API 계약 대규모 정리 — 없음 (P2)
참여 신청·콘텐츠 작성·게시 승인·참여자 목록 — 유지
KPA/GP/KCos store 작업 — 없음
다른 세션 WIP(ProductForm/supplier.ts/ProductDetailDrawer) — 미접촉/미커밋
package/lock/Dockerfile — 무변경
```

---

## 7. 완료 기준 점검 (WO §17)
```
operator 커머스 액션/문구 제거·정정 — ✅ (플래그 게이트 + 필터칩 제거)
supplier 매장 진열/첫 주문/상품 전환/이행률 KPI 제거·정정 — ✅
participant 정산/결제/배송 UI 제거·정정 — ✅ (정산 선택 게이트 + 문구 정정; passive 표시는 §5)
updateParticipantConversionStatus 신규 변경 차단 — ✅ (backend 409 + client throw)
기존 정산·결제 1건 미삭제/미수정 — ✅ (재실측)
DB migration 없음 — ✅
참여 신청/현황/콘텐츠 조회 유지 — ✅
typecheck 통과 — ✅
CHECK 문서 작성 — ✅
```

---

## 8. 후속
- **P2** `WO-O4O-MARKET-TRIAL-CONTRACT-CLEANUP-V1` — DTO/API 계약(productId/convertedProductId/listingId/settlement*/payment*/ShippingAddress/Fulfillment/customerConversionStatus) 정리 + 게이트된 죽은 UI/클라이언트 함수 물리 제거.
- **P3** `WO-O4O-MARKET-TRIAL-SCHEMA-CLEANUP-V1` — `*_fulfillments`/`*_shipping_addresses`(row 0) drop + participants 커머스 컬럼 정리. **단 기존 정산·결제 1건 처리 정책 확정 후.**

---

*Date: 2026-06-19 · 구현 CHECK(P1) · conversion-status 409 차단 + UI 플래그 비노출/문구 정정 · DB/데이터 무변경 · typecheck PASS · 기존 1건 보존 재실측 · 런타임 검증은 배포 후 · 다른 세션 WIP 미커밋.*
