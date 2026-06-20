# CHECK-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-CLEANUP-V1

> **유형:** Implementation Check Report
> **작성일:** 2026-06-20
> **WO:** `WO-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-CLEANUP-V1`
> **선행 IR:** `IR-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-AUDIT-V1`
> **결과:** ✅ A1(운영 상태/CSV 라벨) 사용자-facing "정산" → "펀딩 처리"/"처리" 정리 완료. A2 보상 산문·내부 field/enum·정식 정산 기능 미접촉. DB/API/migration 무변경. typecheck PASS(web-neture + api-server). 화면/CSV smoke = 배포 후.

---

## 1. 변경 파일 목록 (3)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | CSV 헤더 2종 + CSV 상태 라벨(offline_settled) + cascade 메시지 |
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | 상태 label map·전이 버튼·에러 메시지·요약 라인 |
| `services/web-neture/src/pages/market-trial/MyParticipationsPage.tsx` | 상태 label map·상태 라벨·KPI 카드·안내 문구·페이지 설명 |

**DB/migration/enum/API contract 변경 없음. 정식 정산 기능 미접촉.**

---

## 2. 변경한 A1 표현 목록

### Backend — `marketTrialOperatorController.ts`
| line | 전 | 후 |
|---|----|----|
| 1153 (CSV 헤더) | `정산선택` | **`펀딩 처리 방식`** |
| 1153 (CSV 헤더) | `정산상태` | **`펀딩 처리 상태`** |
| 1148 (CSV 상태 라벨) | `offline_settled: 정산 완료` | **`펀딩 처리 완료`** |
| 1055 (cascade 메시지) | `참여자 N명 정산 선택 대기로 전환` | **`참여자 N명 선택 대기로 전환`** (choice_pending 라벨 `선택 대기`와 정합) |

### Operator FE — `MarketTrialApprovalDetailPage.tsx`
| line | 전 | 후 |
|---|----|----|
| 656 (`SETTLEMENT_STATUS_LABELS.pending`) | `정산 대기` | **`처리 대기`** |
| 660 (`.offline_settled`) | `정산 완료` | **`펀딩 처리 완료`** |
| 675 (`OPERATOR_SETTLEMENT_NEXT` label) | `정산 완료 처리` | **`펀딩 처리 완료`** |
| 195 (에러 메시지) | `정산 상태 변경에 실패했습니다` | **`펀딩 처리 상태 변경에 실패했습니다`** |
| 833 (요약 라인) | `제품 정산 완료 {n}명` | **`펀딩 처리 완료 {n}명`** |

### Participant FE — `MyParticipationsPage.tsx`
| line | 전 | 후 |
|---|----|----|
| 32 (`SETTLEMENT_STATUS_LABEL.pending`) | `정산 대기` | **`처리 대기`** |
| 36 (`.offline_settled`) | `정산 완료` | **`펀딩 처리 완료`** |
| 233 (상태 라벨) | `정산 상태` | **`처리 상태`** |
| 448 (페이지 설명) | `…정산 현황과…` | **`…처리 현황과…`** |
| 452 (안내 step) | `정산 완료 건은…` | **`펀딩 처리 완료 건은…`** |
| 461 (KPI 카드) | `정산 완료` | **`펀딩 처리 완료`** |

> 표기 표준화: `offline_settled` 표시값은 operator·participant·CSV 전부 **`펀딩 처리 완료`** 로 통일. `pending` 표시값은 **`처리 대기`**.

---

## 3. CSV 헤더 변경 전/후

```
전: …, 입금참조, [정산선택],     [정산상태],     참여일, …
후: …, 입금참조, [펀딩 처리 방식], [펀딩 처리 상태], 참여일, …
```
14컬럼 구조·순서 유지, 헤더명 2종만 변경. `정산금액/정산메모`는 CSV 헤더에 부재(IR §7) → 신규 생성 없음. (CSV row 원문·PII·입금참조 미기재)

---

## 4. A2 보류 항목 (보상 개념 산문 — 미변경)

`정산→펀딩 처리` 단순 치환 시 의미 깨짐 → 별도 워딩 결정 후 처리(`WO-O4O-MARKET-TRIAL-REWARD-WORDING-V2` 후보). 이번 WO 미접촉:

| 위치 | 표현(발췌) |
|------|-----------|
| `MarketTrialApprovalDetailPage.tsx:407,412,413,452` | 정산 선택권, 제품 정산 조건·정산 제품 구성 |
| `MyParticipationsPage.tsx:203,209,259,337,426,440,541` | 정산 계산, 총 정산 기준 금액, 정산 방식, 최종 정산, 예상 정산 정보, 제품 정산 상태, 총 정산 |
| `market-trial/MarketTrialDetailPage.tsx`, `MarketTrialHubPage.tsx` | 정산 예시, 모집부터 정산까지, 결과/정산, 정산받습니다 |
| `supplier/SupplierTrial{Detail,Create,List}Page.tsx` | 제품 정산 기준/구조/구성, 정산 예시, 정산 조건 (A1 상태 라벨 부재) |

---

## 5. Dead / disabled 메시지 보류 (사용자 미도달)

content-only 전환으로 **409 disabled** 경로의 상태 메시지 — 현재 미도달이라 사용자-facing 아님. 표기만 잔존(향후 재활성화 시 후속):

| 위치 | 표현 | 상태 |
|------|------|------|
| `marketTrialOperatorController.ts:831` | `정산 상태가 "…"로 변경되었습니다` | 핸들러 상단 409(`:756`)로 미도달 |
| `marketTrialController.ts:671,679` | `정산이 완료된 참여…`, `아직 정산 선택이…` | 핸들러 상단 409(`:644`)로 미도달 |

> disabled 안내 `유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다`(`:756`,`:644`, `api/trial.ts:326,491`)는 **의도적 "정산 아님" 명시** → 유지(IR §5, 분류 C).

---

## 6. 내부 settlement* 유지 항목 (B)

`settlementStatus`/`settlementChoice`/`settlementAmount`/`settlementProductQty`/`settlementRemainder`/`settlementNote`, enum 값(`pending`/`choice_pending`/`choice_completed`/`offline_review`/`offline_settled`), 상수명(`SETTLEMENT_STATUS_LABELS`/`_COLORS`/`OPERATOR_SETTLEMENT_NEXT`/`SETTLEMENT_VISIBLE_STATUSES`), API 필드(`totalSettlementAmount`), 쿼리(`p."settlementStatus"`, `?settlementStatus=`) — **전부 보존**. 표시 label의 **value만** 교체.

---

## 7. 검증 결과

### 7.1 Grep (market-trial 도메인)
변경 3파일의 잔존 "정산"은 전부 **주석(C) / disabled·dead 메시지(§5) / A2 산문(§4)** 으로 분류됨. **reachable A1 상태 라벨 잔존 0건.**

### 7.2 Typecheck — PASS
- `web-neture` `tsc --noEmit`: error 0 (변경 2파일 포함).
- `api-server` `tsc --noEmit -p tsconfig.build.json`: 변경 무관. 유일 에러 `marketTrialController.ts(105,9)` 는 **pre-existing**(productId/CreateTrialDto, 본 WO 미접촉 라인).

### 7.3 화면/CSV smoke — 배포 후
```text
[CSV]  operator export → 헤더 '펀딩 처리 방식'/'펀딩 처리 상태' (정산선택/정산상태 부재)
[operator] 상세 진입 → 상태 배지 '처리 대기'/'펀딩 처리 완료', 전이 버튼 '펀딩 처리 완료',
           요약 '펀딩 처리 완료 {n}명' / console 0 / network 500 0
[participant] 내 참여 → KPI '펀딩 처리 완료', 상태 라벨 '처리 상태' / '정산' 표현 없음 / console 0
```
> CSV row 원문·PII·paymentReference 미기재.

---

## 8. 범위 준수 / 미수행

| 항목 | 결과 |
|------|------|
| DB migration / enum rename / API contract | **없음** |
| settlement* field/column 삭제·rename | **없음** |
| 운영 데이터 수정/삭제 | **없음** |
| settlement mutation 재활성화 / 전환·진열·주문·배송 복원 | **없음** |
| A2 보상 산문 일괄 치환 | **미수행**(§4 보류) |
| 정식 정산 기능(공급자/파트너) | **미접촉** |
| 다른 세션 WIP | 미접촉 |

---

## 9. 완료 기준 대비

| 기준 | 상태 |
|------|:----:|
| A1 사용자-facing 정산 표현 → 펀딩 처리 정리 | ✅ |
| CSV 헤더 정산선택/정산상태 → 펀딩 처리 방식/상태 | ✅ |
| 상태 라벨 정산 대기/완료 → 처리 대기/펀딩 처리 완료 | ✅ |
| 내부 settlement* 유지 | ✅ |
| A2 미접촉 + 보류 사유 기록 | ✅ (§4) |
| 정식 정산 기능 미접촉 | ✅ |
| DB migration / API contract 없음 | ✅ |
| typecheck 통과 | ✅ |
| 화면/CSV smoke | ⏳ 배포 후(§7.3) |
| CHECK 문서 | ✅ |
| path-specific commit/push | ⏳ 직후 |

---

## 10. 후속 후보

- `WO-O4O-MARKET-TRIAL-REWARD-WORDING-V2` — A2 보상 산문 용어 확정(예: 제품 정산 → 제품 보상) 후 sweep. 정책 문서(오프라인 결제/보상) 정합 필요.

---

*A1 한정 용어 정리. 표시 label/CSV 헤더만 '정산'→'펀딩 처리'/'처리'. 내부 enum/field/API·정식 정산 기능·A2 보상 산문 불변.*
