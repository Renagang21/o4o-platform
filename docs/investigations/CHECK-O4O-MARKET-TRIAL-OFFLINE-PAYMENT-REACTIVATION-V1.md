# CHECK — 유통참여형 펀딩 오프라인 입금 확인 재활성화 V1

> WO: `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-REACTIVATION-V1`
> 유형: 운영 개선 (입금 확인 UI 정비) — content-only 운영 모델 정합.
> 선행: [`CHECK-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1`](CHECK-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1.md) (P3-3) §20·§51 — "오프라인 입금 확인 UI 정비" 를 다음 운영 개선 단계로 명시.
> 후행: [`CHECK-O4O-MARKET-TRIAL-CONTENT-ONLY-POST-DEPLOY-VALIDATION-V1`](CHECK-O4O-MARKET-TRIAL-CONTENT-ONLY-POST-DEPLOY-VALIDATION-V1.md) (content-only 전환 종료 검증) 이후.

---

## 1. 배경 / 문제 확정 (조사)

content-only 전환 후 검증 과정에서, 오프라인 입금 확인 기능이 운영 모델과 어긋난 상태로 확인됨.

| 계층 | payment (입금) | settlement (정산) |
|------|------|------|
| 프론트 UI | `SHOW_MARKET_TRIAL_COMMERCE_UI = false` 게이트 안 → **미노출** | 동일 게이트 → 미노출 |
| api client (`trial.ts`) | `marketTrialCommerceDisabled()` throw → **차단** | throw → 차단 |
| 백엔드 (`marketTrialOperatorController.ts`) | `updateParticipantPaymentStatus` → **409 `MARKET_TRIAL_PAYMENT_DISABLED`** | `updateParticipantSettlementStatus` → 409 |
| 데이터 | read-only 보존 (paid 1) | 보존 (choice_pending 1) |

**문제:** content-only 운영 모델(`O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1`, 공급자/참여자 화면 문구 "송금은 Neture 운영자가 수령·입금 확인 완료자 명단 공유")은 **운영자의 오프라인 입금 확인을 전제**하는데, 입금 확인 기능이 커머스 퍼널과 같은 플래그·정책에 묶여 UI·api·백엔드 3계층 모두 비활성화되어 있었음. 운영자가 시스템에서 입금을 확인·기록할 방법이 없는 상태(읽기 표시만 가능).

또한 활성화되어 있던 시절의 입금 확인 입력이 `window.prompt()` 3연속이라 실수·오입력에 취약(UX 정비 대상).

> 결정(사용자 승인): **입금(payment)만 재활성화**. 정산(settlement)·매장 진열·고객 전환은 content-only boundary 로 **계속 비활성(409 유지)**.

---

## 2. 최소 수정 (3 files)

### 2.1 백엔드 — `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts`
- `updateParticipantPaymentStatus`: 선두 `409 MARKET_TRIAL_PAYMENT_DISABLED` 반환 블록 + `eslint-disable no-unreachable` 제거 → 기존 로직 reachable화.
- 기존 로직 그대로 보존: parameterized query, `marketTrialId` 스코프, PAID 시 `paidAt`/`confirmedAt` auto-stamp, 감사 로그(`[MarketTrialPayment] … actor=…`).
- **`updateParticipantSettlementStatus` 의 409 는 손대지 않음** (settlement 계속 차단).
- route 가드 변동 없음: `requireAuth` + `requireNetureScope('neture:operator')` (기존).

### 2.2 api client — `services/web-neture/src/api/trial.ts`
- `updateParticipantPaymentStatus`: `marketTrialCommerceDisabled(...)` throw 제거 → patch 호출 reachable화.
- `marketTrialCommerceDisabled` 는 settlement 함수(2곳)에서 계속 사용 → 미사용 경고 없음.

### 2.3 프론트 — `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx`
- 신규 플래그 `SHOW_OFFLINE_PAYMENT_UI = true` 추가 (커머스 퍼널 플래그와 **분리**). 오프라인 입금 섹션 게이트를 `SHOW_MARKET_TRIAL_COMMERCE_UI` → `SHOW_OFFLINE_PAYMENT_UI` 로 변경.
- 정산 섹션 / 매장 랜딩 요약 칩 등은 `SHOW_MARKET_TRIAL_COMMERCE_UI`(=false) 유지 → 계속 비노출.
- **`window.prompt()` 3연속 제거 → 인라인 확인 폼**:
  - 입금 확인: 금액(number, `0 이상 숫자` 검증 — 위반 시 빨간 테두리·경고·확인 버튼 disabled) / 송금 참조 / 운영자 메모 / [입금 확인][취소].
  - 환불: 환불 사유 입력 / [환불 처리][취소].
  - "미결제로 되돌리기"(실수 정정)는 입력 불필요 → 직접 호출 유지.
  - row 별 토글, key 있는 `<Fragment>` 로 폼 row 확장 (`Fragment` import 추가).

---

## 3. 검증

| 항목 | 결과 |
|------|------|
| `@o4o/web-neture` `tsc --noEmit` | **PASS** (exit 0) |
| `@o4o/api-server` `tsc --noEmit` | **PASS** (exit 0, error 0) |
| 변경 범위 | 3 files (controller / api client / operator page). 다른 세션 untracked `apps/api-server/scripts/reset-product-test-data.sql` **미접촉** |
| settlement 409 / 매장 진열·전환 UI | **불변** (계속 비활성) |
| 라이브 브라우저 스모크 | **배포 후 후속** (operator `/operator/market-trial/:id` 입금 섹션 노출·인라인 폼·검증·취소 비-mutating 확인) |

---

## 4. content-only 정합

- 본 변경은 **커머스 결제(PG)가 아니라 오프라인 입금 확인 운영 기록**의 재활성화 (P3-3 정책 §15·§19 와 무충돌).
- O4O order/payment/settlement/shipment 도메인·ProductMaster/SPO·productId 와 **비연결** (기존 로직이 그러하며 본 변경은 연결을 추가하지 않음).
- 정산(settlement)·매장 진열·고객 전환·전환 퍼널은 **계속 차단**.

---

## 5. 남은 후속 과제

- 라이브 배포 후 operator 브라우저 스모크 (입금 섹션 렌더·인라인 폼 검증).
- P3-3 §51 잔여: 펀딩 처리 상태 용어 정리 · 운영자 메모/감사 로그 정책 · 공급자 별도 안내 문구 · 참여 금액·수량 리포트.

---

*Date: 2026-06-20 · 입금(payment) 재활성화 + 입금 확인 UI 인라인 폼 정비 · settlement 불변 · tsc PASS · 다른 세션 WIP 미접촉.*
