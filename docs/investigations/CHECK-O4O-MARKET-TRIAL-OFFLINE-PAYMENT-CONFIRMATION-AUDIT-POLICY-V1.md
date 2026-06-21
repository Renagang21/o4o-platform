# CHECK — 유통참여형 펀딩 오프라인 입금 확인일·감사 정책 V1

> WO: `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1`
> 유형: 정책 조사·고정 (read-only 정적 분석). 코드/DB/API/UI 변경 없음.
> 산출: 정책 문서 [`O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1`](../architecture/O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1.md) + 본 CHECK.

---

## 1. 조사 대상 / 방식

read-only 정적 분석:
- `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` — `updateParticipantPaymentStatus`
- `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` — 인라인 입금 확인 폼(`submitConfirm`/`submitRefund`) + offline 테이블
- `services/web-neture/src/api/trial.ts` — `updateParticipantPaymentStatus` client
- `packages/market-trial/src/entities/MarketTrialParticipant.entity.ts` — payment 필드

> 운영 데이터 조회/변경 없음. paymentReference 등 PII 원문 미열람·미기재.

---

## 2. 현재 구현 동작 (실측)

### 2.1 엔티티 필드 의도 (주석)
- `paidAt`: *"Timestamp the payment was made (PG approval time, or transfer date for manual_transfer)."* → 송금/입금 시점(안정값) 의도.
- `confirmedAt`: *"Timestamp the operator/system confirmed the payment as valid."* → 운영자 확인 시각.

### 2.2 백엔드 `updateParticipantPaymentStatus`
동적 SET 빌드. paidAt/confirmedAt 분기:
```
if (paidAt !== undefined)            → pushSet('paidAt', paidAt)             # 전달값으로 덮어씀
else if (newStatus === PAID)         → "paidAt" = COALESCE("paidAt", now)    # 보존
if (confirmedAt !== undefined)       → pushSet('confirmedAt', confirmedAt)
else if (newStatus === PAID)         → "confirmedAt" = COALESCE("confirmedAt", now)  # set-once 보존
```
- 즉 **`paidAt` 은 caller 가 값을 주면 덮어쓰고**, 안 주면 COALESCE 보존.
- `confirmedAt` 은 caller 가 안 주면 `COALESCE(confirmedAt, now)` → **최초 1회만 설정, 이후 보존**.
- 감사: `logger.info('[MarketTrialPayment] trial=… participant=… → paymentStatus=… actor=…')` — **application 로그 1줄**(actor + 새 상태). 전후 값·금액·reference 변경 기록 없음, 구조화 audit 테이블 없음.

### 2.3 프론트 `submitConfirm` (입금 확인 인라인 폼)
전송 필드: `paymentMethod='manual_transfer'`, `paymentProvider='internal'`, `paymentReference`, `paidAmount`, **`paidAt = new Date().toISOString()`(항상)**, `paymentNote`. → `confirmedAt` 은 미전송.

→ 결과: 입금 확인을 누를 때마다 **`paidAt` 이 today 로 덮어써짐**(백엔드의 COALESCE 보존 분기는 `paidAt` 이 전달되므로 우회됨). `confirmedAt` 은 최초 1회만 설정·이후 보존.

### 2.4 프론트 `submitRefund` / 미결제로 되돌리기
- 환불: `paymentStatus='refunded'` + `paymentNote` 만 전송 → `paidAt`/`paidAmount`/`confirmedAt`/`paymentReference` **보존**, paymentStatus·note 변경. (confirmedAt 미갱신)
- 미결제로 되돌리기: `paymentStatus='unpaid'` 만 전송(extra 없음) → `paidAt`/`paidAmount`/`confirmedAt`/`reference` **보존**, paymentStatus 만 unpaid.

### 2.5 UI 표시
operator offline 입금 섹션 테이블 컬럼: 이름 / 입금 상태 / 방법 / 금액 / **입금일(`paidAt`)** / **확인일(`confirmedAt`)** / 메모 / 액션. → 2개 날짜 컬럼이 이미 존재.

---

## 3. 핵심 발견 (Gap)

| 필드 | 현재 | 정책 목표 |
|------|------|------|
| `paidAt` | **매 입금 확인 시 today 로 덮어씀** (프론트가 항상 전송) | 최초 입금 확인일 보존 |
| `confirmedAt` | **최초 1회만 설정**, 이후 보존 | 마지막 확인 시각으로 갱신 |
| 감사 | application 로그 1줄(actor+새 상태) | 구조화 감사(전후 상태/금액, reference 마스킹) |

> **의미 역전**: 현재 `paidAt`=마지막 확인(덮어씀), `confirmedAt`=최초 확인(보존) — 정책 목표(paidAt=최초, confirmedAt=마지막)와 반대. 라이브 스모크(REACTIVATION WO)에서 관측된 "재확인 시 paidAt 이 today 로 갱신" 이 본 gap 의 증상.

보존되는 부분(정책과 이미 합치): paid→unpaid / paid→refunded 시 `paidAt`/`paidAmount`/`reference` 보존.

---

## 4. 정책 결정 (고정)

정책 문서 §2~§3 표 참조. 요약:
- `paidAt` = 최초 입금 확인일 (set-once, COALESCE 보존).
- `confirmedAt` = 마지막 운영자 확인 시각 (확인/수정마다 갱신).
- `updatedAt` = row 수정 시각(자동, 의미 부여 안 함).
- paid→unpaid/refunded 시 `paidAt`/`paidAmount`/`reference` 보존, paidAt null 초기화 비권장.
- 감사 필요 범위: paymentStatus/paidAmount/paymentReference/paymentNote 변경, paidAt 최초 설정, confirmedAt 갱신. reference 원문 비기록.
- settlement mutation 계속 비활성(409 유지).

---

## 5. 변경 여부

| 항목 | 결과 |
|------|------|
| 코드 | **무변경** (정적 분석만) |
| DB / migration | **무변경** |
| API contract | **무변경** |
| UI | **무변경** |
| 운영 데이터 | **무조회/무변경** (PII·reference 원문 미열람) |
| settlement mutation | **계속 비활성(409)** |
| 산출 | 정책 문서 1 + CHECK 1 (docs only) |

---

## 6. 후속 구현 WO 제안

| WO | 범위 |
|----|------|
| `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-PAIDAT-PRESERVE-V1` | 프론트 `submitConfirm` 의 `paidAt` 전송 제거(또는 백엔드 `paidAt` 항상 COALESCE 보존) + `confirmedAt` 매 확인 갱신 + UI 라벨(최초/마지막) 정합 + tsc + 라이브 스모크 |
| `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-AUDIT-LOG-V1` | payment 변경 구조화 감사(전후 상태/금액, reference 마스킹). 규모 크면 별도 |

권장 순서: paidAt 보존(선행) → 감사 로그(후행).

---

## 7. 완료 기준 대조 (WO §14/§16)

| 조건 | 결과 |
|------|:----:|
| 현재 paidAt 갱신 동작 조사 | ✅ (§2.2/§2.3) |
| paidAt = 최초 입금 확인일 정의 | ✅ |
| confirmedAt/updatedAt 역할 정의 | ✅ |
| 상태 전환별 보존/갱신 정책 | ✅ (정책 §3) |
| reference/note 수정 정책 | ✅ |
| 감사 로그 필요 범위 정의 | ✅ (정책 §5) |
| settlement mutation 비활성 유지 | ✅ |
| DB/API/UI 무변경(또는 문서성 최소) | ✅ (docs only) |
| 후속 구현 WO 제안 | ✅ (§6) |
| CHECK 문서 작성 | ✅ (본 문서) |

---

*Date: 2026-06-21 · 오프라인 입금 확인일·감사 정책 read-only 조사·고정 · paidAt=최초/confirmedAt=마지막 결정 · 코드/DB/API/UI 무변경 · PII·reference 원문 미기재 · 다른 세션 WIP 미접촉.*
