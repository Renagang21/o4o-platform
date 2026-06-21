# CHECK — 유통참여형 펀딩 오프라인 입금 변경 구조화 감사 로그 V1

> WO: `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-AUDIT-LOG-V1`
> 유형: 소형 구현 (payment 변경 구조화 감사). 정책 [`O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1`](../architecture/O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1.md) §5 구현.

---

## 1. 구현 요약

- 기존 **`@o4o/action-log-core` `ActionLogService`** + `action_logs` 테이블 재사용 → **DB migration 없음**.
- `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` `updateParticipantPaymentStatus`:
  - 변경 전 값 SELECT 확장(`paymentStatus`/`paidAmount`/`paymentReference`/`paymentNote`).
  - UPDATE 후 `logSuccess('neture', actor, 'neture.operator.market_trial_payment_change', { meta })`.
  - **meta**: `trialId`, `participantId`, `beforeStatus`/`afterStatus`, `beforeAmount`/`afterAmount`, `referenceChanged`/`noteChanged`(boolean).
  - `paymentReference`/`paymentNote` **원문 미기록**(변경 여부 boolean 만).
  - 감사 insert 실패는 본 흐름을 막지 않음(`catch → logger.warn`).
- settlement mutation(409) / API response shape / DB / UI 무변경.

action_key: `neture.operator.market_trial_payment_change` (기존 `neture.operator.*` 패턴 정렬).

---

## 2. 1차 라이브 검증과 발견된 버그 (운영 품질 기록)

1차 라이브 검증(운영 DB `action_logs` read-only 조회)에서:
- **PASS**: action_logs row 생성, `status=success`, `source=manual`, `has_actor=true`, 원문 미기록(`paymentReference`/`paymentNote` 키 부재), `beforeStatus`/`beforeAmount`/`referenceChanged`/`noteChanged`/`participantId`/`trialId` 정상.
- **버그**: `afterStatus`/`afterAmount` 가 비어 있음(meta 키 자체 부재). 원인은 `UPDATE … RETURNING` 결과 `row.paymentStatus`/`row.paidAmount`(camelCase) 직접 의존 — 해당 컨텍스트에서 `undefined` 로 들어가 JSON 직렬화 시 키가 누락됨.

후속 commit **`45611d716`** 에서 수정:
- `afterStatus` = 검증된 **`newStatus`** 변수 사용.
- `afterAmount` = 요청에 `paidAmount` 가 있으면 그 값, 없으면 **기존 금액(보존값)**.
- 부정확하던 `logger.info` 의 `row.paymentStatus` 도 `newStatus` 로 정정.

---

## 3. 2차 검증 (재배포 후) — PASS

배포: Deploy API Server (commit `45611d716`) **success**. operator 라이브에서 입금 상태 변경 round-trip(미결제로 되돌리기 → 재확인) 수행 후 `action_logs` 재조회.

| 확인 | 결과 |
|------|:----:|
| payment-status PATCH | **200 × 2** |
| 신규 action_logs row 생성(`neture.operator.market_trial_payment_change`) | ✅ |
| **meta.afterStatus 채워짐** (paid / unpaid) | ✅ |
| **meta.afterAmount 채워짐** | ✅ |
| beforeStatus / beforeAmount 유지 | ✅ |
| referenceChanged / noteChanged (boolean) | ✅ |
| **paymentReference / paymentNote 원문 부재** (meta 키셋에 없음) | ✅ |
| has_actor (user_id 기록) | ✅ |
| SMOKE 데이터 paid 상태 복원 | ✅ (round-trip 종료 상태 = paid) |

> meta 키셋: `trialId, participantId, beforeStatus, afterStatus, beforeAmount, afterAmount, referenceChanged, noteChanged` (8키). `paymentReference`/`paymentNote` 키 없음 — 마스킹 정책 준수.
> 본 CHECK 에는 PII / paymentReference / paymentNote 원문을 기재하지 않는다.

---

## 4. 변경 여부 / 경계

| 항목 | 결과 |
|------|------|
| `@o4o/api-server` `tsc --noEmit` | **PASS** |
| DB migration | **없음** (기존 `action_logs` 재사용) |
| settlement mutation | **계속 비활성(409)** |
| API response shape / UI | **무변경** |
| 변경 범위 | 1 file (controller). 무관 `pnpm-lock.yaml`·다른 세션 untracked 파일 **미접촉** |

---

## 5. 완료 기준 대조

| 조건 | 결과 |
|------|:----:|
| payment 변경 구조화 감사(전후 상태/금액) | ✅ |
| paymentReference 변경 여부 기록(원문 마스킹) | ✅ |
| paymentNote 변경 여부 기록(원문 미기록) | ✅ |
| actor 기록 | ✅ |
| DB migration 없음 | ✅ |
| settlement mutation 비활성 유지 | ✅ |
| typecheck PASS | ✅ |
| 라이브 검증 PASS (2차) | ✅ |
| CHECK 문서 | ✅ (본 문서) |

---

## 6. 후속 (선택)

- 감사 조회 UI(운영자 화면에서 payment 변경 이력 열람) — 필요 시 별도 WO. 현재는 `action_logs` 직접 조회 / Cloud Logging 으로 확인.
- before/after 금액 외 paidAt/confirmedAt 변경 캡처가 필요하면 meta 확장(별건).

---

*Date: 2026-06-21 · action_logs 재사용 구조화 감사(전후 상태/금액·변경여부, reference/note 원문 미기록) · 1차 검증서 afterStatus 빈 버그 발견→45611d716 수정→2차 검증 PASS · DB migration 없음 · settlement 비활성 유지 · PII·reference 원문 미기재.*
