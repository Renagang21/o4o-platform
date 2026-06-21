# CHECK — 유통참여형 펀딩 오프라인 입금 확인일 보존 구현 V1

> WO: `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-PAIDAT-PRESERVE-V1`
> 유형: 소형 구현 (paidAt 보존 / confirmedAt 갱신). 정책 [`O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1`](../architecture/O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1.md) 구현.

---

## 1. 변경 파일 (2)

### 1.1 `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts`
`updateParticipantPaymentStatus`:
- **paidAt = 최초 입금 확인일**: caller 가 `paidAt` 을 보내도 기존 값을 덮어쓰지 않는다. `newStatus === PAID` 일 때만 `"paidAt" = COALESCE("paidAt", 요청값|now)` 로 set-once. `newStatus !== PAID`(unpaid/refunded) 면 paidAt 미변경(보존). → 기존의 `if (paidAt !== undefined) pushSet('paidAt', …)` 덮어쓰기 분기 제거.
- **confirmedAt = 마지막 확인 시각**: 입금 상태 변경/수정마다 `"confirmedAt" = now`(요청값 있으면 우선) 로 무조건 갱신. → 기존의 `COALESCE(confirmedAt, now)`(set-once) 제거.

### 1.2 `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx`
- `submitConfirm`: `paidAt: new Date().toISOString()` **전송 제거** (매 확인마다 today 로 덮어쓰던 원인). backend 가 최초 1회만 설정·이후 보존.
- offline 입금 테이블 컬럼 라벨: **입금일 → 최초 확인일** (`paidAt`), **확인일 → 마지막 확인일** (`confirmedAt`).

> settlement mutation(409) / API response shape / DB / migration 무변경.

---

## 2. 검증

| 항목 | 결과 |
|------|------|
| `@o4o/api-server` `tsc --noEmit` | **PASS** (exit 0) |
| `@o4o/web-neture` `tsc --noEmit` | **PASS** (exit 0) |
| 배포 (commit `06ba7acc2`) | Deploy API Server / Deploy Web Services **both success** |
| settlement mutation | **계속 비활성(409)** |
| DB / migration / 운영 데이터 | **무변경** |
| 변경 범위 | 2 file. 무관 `pnpm-lock.yaml` 미스테이징 · 다른 세션 WIP 미접촉 |

### 2.1 정적 검증
- frontend `submitConfirm` 이 `paidAt` 을 전송하지 않는다. ✅
- backend 가 PAID 전환 시 `COALESCE("paidAt", …)` 로 기존 paidAt 보존, 그 외 상태에선 paidAt 미변경. ✅
- backend 가 매 변경 시 `confirmedAt = now` 갱신. ✅

### 2.2 라이브 스모크 (operator, neture.co.kr, SMOKE trial — disposable)

> 운영 데이터 변경은 SMOKE(disposable) 참여자 1건에 한정. PII / paymentReference 원문 미기록.

기준값(스모크 전): 최초 확인일(paidAt) = D-1일자, 마지막 확인일(confirmedAt) = 과거 일자, 입금 상태 = 입금 확인 완료, 금액 보존.

| 단계 / 확인 | 결과 |
|------|:----:|
| **paid → unpaid** (미결제로 되돌리기): paidAt **유지**, 금액 **보존**, confirmedAt **오늘로 갱신** | ✅ |
| **unpaid → paid** (재확인): **최초 확인일(paidAt) 기존 날짜 그대로 유지**(과거처럼 today 로 점프하지 않음) | ✅ (핵심) |
| 재확인 시 **마지막 확인일(confirmedAt) 재확인 시각(오늘)으로 갱신** | ✅ |
| UI 에서 "최초 확인일"·"마지막 확인일" **구분 표시** | ✅ |
| payment-status PATCH | **200 × 2** |
| console error / pageerror | **0** |
| network ≥ 400 | **0** (비로그인 `auth/me` 류 없음 — operator 로그인 상태) |
| SMOKE 데이터 복원 | 입금 상태 = **입금 확인 완료(paid) 복원**. paidAt 불변, confirmedAt 은 최신 확인 시각 반영(정책상 정상) |

> 참고: 본 정책상 `paid → unpaid` 에서 `paidAt`/`paidAmount`/`paymentReference` 는 **보존**(null 초기화 아님). "unpaid 면 paidAt 이 null" 은 기대값이 아니며, 현재 상태는 `paymentStatus`, 과거 확인 이력은 `paidAt` 으로 판단한다.

---

## 3. 완료 기준 대조 (WO §14)

| 조건 | 결과 |
|------|:----:|
| paidAt 최초 입금 확인일 보존 | ✅ |
| 재확인/메모 수정 시 paidAt 미덮어씀 | ✅ (라이브 확인) |
| confirmedAt 마지막 확인 시각 갱신 | ✅ |
| frontend paidAt now 미전송 | ✅ |
| UI 라벨 최초/마지막 확인일 정합 | ✅ |
| settlement mutation 비활성 유지 | ✅ |
| DB migration 없음 | ✅ |
| 운영 데이터 삭제 없음 | ✅ (SMOKE 토글 후 paid 복원) |
| typecheck PASS | ✅ (web+api) |
| 라이브 스모크 PASS | ✅ |
| CHECK 문서 | ✅ (본 문서) |

---

## 4. 후속 WO

- `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-AUDIT-LOG-V1` — payment 변경 구조화 감사(전후 상태/금액, paymentReference 마스킹, actor 기록). 정책 문서 §5 범위.

---

*Date: 2026-06-21 · paidAt=최초 보존 / confirmedAt=마지막 갱신 구현 · frontend paidAt 전송 제거 · UI 라벨 정합 · settlement 비활성 유지 · DB/운영데이터 무변경 · tsc PASS · 라이브 스모크 PASS · PII·reference 원문 미기록.*
