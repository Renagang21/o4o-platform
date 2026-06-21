# O4O 유통참여형 펀딩 오프라인 입금 확인일·감사 정책 V1

> WO: `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1`
> 성격: **정책 고정 문서** (구현 전 경계). 코드/DB/API/UI 변경 없음.
> 적용 도메인: Neture content-only 유통참여형 펀딩 오프라인 입금 확인(`market_trial_participants` payment 필드).
> 선행: 오프라인 입금 확인 재활성화(`CHECK-...-OFFLINE-PAYMENT-REACTIVATION-V1`), settlement/payment 보존 정책(`CHECK-...-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1`).

---

## 0. 한 줄 요약

`paidAt` 은 **최초 입금 확인일**(안정값)로 고정한다. 재확인·메모 수정 시 `paidAt` 을 덮어쓰지 않으며, 운영자가 다시 확인한 시각은 `confirmedAt`(마지막 확인일)과 감사 로그로 남긴다. settlement mutation 은 계속 비활성, DB migration·운영 데이터 변경 없음.

---

## 1. 필드 의미 (canonical)

`market_trial_participants` 의 payment 필드 (엔티티: `packages/market-trial/src/entities/MarketTrialParticipant.entity.ts`).

| 필드 | 타입 | Canonical 의미 |
|------|------|------|
| `paymentStatus` | varchar(20) default 'unpaid' | 현재 입금 처리 상태 (`unpaid`/`pending`/`paid`/`failed`/`canceled`/`refunded`) |
| `paidAt` | timestamp null | **최초 입금 확인일** (= 송금/입금이 확인된 최초 시점). 한 번 설정되면 보존 |
| `confirmedAt` | timestamp null | **마지막 운영자 확인 시각** (재확인·금액/메모 수정 시 갱신) |
| `updatedAt` | @UpdateDateColumn | row 마지막 수정 시각 (TypeORM 자동, 의미 부여 안 함) |
| `createdAt` | @CreateDateColumn | 참여 row 생성 시각 |
| `paidAmount` | decimal null | 확인된 입금 금액 |
| `paymentMethod` | varchar(50) null | 'manual_transfer' 등 (free-form) |
| `paymentProvider` | varchar(50) null | 'internal' 등 (free-form) |
| `paymentReference` | varchar(255) null | 송금 참고값(은행 입금번호 등) — **원문 로그/문서 금지** |
| `paymentNote` | text null | 운영자 메모 / 취소·환불 사유 |

> 엔티티 주석도 동일 방향: `paidAt` = "the payment was made (transfer date)", `confirmedAt` = "operator confirmed the payment". 본 정책은 이 의도를 운영 규칙으로 고정한다.

---

## 2. 핵심 원칙

```
paidAt      = 최초 입금 확인일   (set-once, 이후 보존)
confirmedAt = 마지막 확인 시각   (확인/수정마다 갱신 가능)
updatedAt   = row 수정 시각      (자동)
paymentStatus = 현재 상태        (전환은 감사 대상)
```

- `paidAt` 을 "마지막 수정일"처럼 덮어쓰지 않는다.
- 현재 상태는 `paymentStatus` 로 판단하고, **과거 이력은 `paidAt` + 감사 로그**로 판단한다.
- 한때 입금 확인이 있었던 사실(`paidAt` 존재)은 상태가 unpaid/refunded 로 바뀌어도 이력으로 보존한다.

---

## 3. 상태 전환별 처리표 (canonical)

| 전환 | paymentStatus | paidAt | confirmedAt | paidAmount/Reference/Note | 감사 |
|------|------|------|------|------|:----:|
| **unpaid → paid** (최초 확인) | paid | **now (기존 없을 때만)** | now | 저장 | ✅ |
| **paid → paid** (재확인/메모·금액 수정) | paid 유지 | **보존** | **now 갱신** | 수정 가능 | ✅ |
| **paid → unpaid** (확인 취소/되돌리기) | unpaid | **보존** | now 갱신 | 보존 (paidAmount/Reference 유지), Note=취소 사유 | ✅ |
| **paid → refunded** (환불) | refunded | **보존** | now 갱신 | 보존, Note=환불 사유 | ✅ |
| **refunded/unpaid → paid** (재확인) | paid | **기존 있으면 보존, 없으면 now** | now | 수정 가능 | ✅ |

핵심 규칙:
1. `paidAt` 은 **COALESCE-보존**: `paidAt = COALESCE(기존 paidAt, now)` — 최초 paid 시에만 설정.
2. `confirmedAt` 은 운영자 확인 행위마다 **now 로 갱신** (set-once 아님).
3. `paid → unpaid` 시 `paidAt`/`paidAmount`/`paymentReference` 는 **보존**(이력 손실 방지). null 초기화는 비권장.
4. 환불일(refundedAt) 등 신규 컬럼은 V1에서 만들지 않는다. 필요 시 후속 migration WO.

---

## 4. 현재 구현과의 차이 (Gap)

> 상세 측정: `CHECK-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1.md`

| 항목 | 현재 동작 | 정책 목표 | 조치 |
|------|------|------|------|
| `paidAt` (재확인 시) | 프론트가 `paidAt: now` 항상 전송 → 백엔드가 **덮어씀**(today) | 최초값 보존 | 후속 WO |
| `confirmedAt` | `COALESCE(confirmedAt, now)` → **최초 1회만**, 이후 보존 | 매 확인 갱신 | 후속 WO |
| 감사 | `logger.info('[MarketTrialPayment] … actor=…')` 앱 로그만, 전후값 없음 | 구조화 감사(전후 상태/금액) | 후속 WO |

> 즉 현재는 `paidAt`/`confirmedAt` 의미가 **사실상 역전**(paidAt=마지막, confirmedAt=최초)되어 있다. 정책은 이를 바로잡는 기준이며, 코드 수정은 본 WO 가 아니라 후속 구현 WO 에서 수행한다.

구현 방향 (후속 WO 가이드, 본 WO 에서 미구현):
- 프론트 `submitConfirm` 이 `paidAt` 을 전송하지 않거나, 백엔드가 `paidAt` 을 항상 `COALESCE("paidAt", now)` 로 보존.
- `confirmedAt` 은 PAID 전환·재확인 시 `now` 로 명시 갱신(COALESCE 제거).

---

## 5. 감사 로그 필요 범위

다음 변경은 감사 대상이다.

```
paymentStatus 변경
paidAmount 변경
paymentReference 변경
paymentNote 변경
paidAt 최초 설정 순간
confirmedAt 갱신
```

감사 로그 최소 항목:

```
trialId, participantId, actor(operator) id, 변경 시각,
변경 전/후 paymentStatus, 변경 전/후 paidAmount,
paymentReference 변경 여부, paymentNote 변경 여부, 사유/메모
```

- `paymentReference` **원문은 감사 로그·CHECK·application 로그에 남기지 않는다** (마스킹 또는 변경여부 boolean 만).
- V1 정책은 **범위만 고정**. 실제 구조화 audit 구현은 후속 WO.

---

## 6. UI 표시 기준

운영자 offline 입금 섹션은 이미 **입금일(`paidAt`) / 확인일(`confirmedAt`)** 2개 컬럼을 가진다.

| 표시 | 매핑 | 라벨 기준 |
|------|------|------|
| 최초 입금 확인일 | `paidAt` | "입금일" 또는 "최초 입금 확인일" |
| 마지막 확인일 | `confirmedAt` | "확인일" 또는 "마지막 확인일" |

주의:
- `paidAt` 을 "마지막 입금 확인일"처럼 표시하지 않는다.
- `confirmedAt` 이 없으면 "마지막 확인일"을 억지로 채우지 않는다(`-`).
- UI 라벨/동작 변경은 후속 구현 WO 에서 paidAt 보존 구현과 함께 수행(본 WO 미변경).

---

## 7. API 정책

오프라인 입금 확인 API(`PATCH /api/v1/neture/operator/market-trial/:id/participants/:participantId/payment-status`)는 다음을 따른다.

```
paidAt 은 최초 paid 시에만 설정, 이미 있으면 덮어쓰지 않는다.
confirmedAt 은 운영자 확인 시마다 갱신할 수 있다.
paymentStatus 변경은 허용하되 감사 대상이다.
paymentReference / paymentNote 수정은 허용하되 감사 대상이다.
```

불변 경계(본 정책에서 되살리지 않음):

```
settlementStatus mutation 재활성화 금지 (계속 409)
상품 전환 / 매장 진열 / 주문 / 배송 복원 금지
```

---

## 8. V1 에서 하지 않을 것

```
DB migration / paidAt 데이터 일괄 수정 / 운영 데이터 변경·삭제
paymentReference 원문 로그
settlement mutation 재활성화
주문·배송·상품 전환 복원
대규모 UI 개편
코드 동작 변경 (정책 문서 + CHECK 만)
```

---

## 9. 후속 구현 WO 후보

| WO | 목표 |
|----|------|
| `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-PAIDAT-PRESERVE-V1` | `paidAt` 최초 확인일 보존 + `confirmedAt` 마지막 확인일 갱신 + UI 라벨 정합 |
| `WO-O4O-MARKET-TRIAL-OFFLINE-PAYMENT-AUDIT-LOG-V1` | payment 변경 구조화 감사(전후 상태/금액, reference 마스킹) |

> 두 WO 는 본 정책이 닫힌 뒤 분리 진행. paidAt 보존이 선행, 감사 로그가 후행 권장.

---

*Version: V1 · Date: 2026-06-21 · Status: Policy fixed (pre-implementation) · 코드/DB/API/UI 무변경.*
