# IR-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-AUDIT-V1

> **유형:** Read-only Investigation Report
> **작성일:** 2026-06-20
> **선행:** `WO-O4O-MARKET-TRIAL-PARTICIPATION-REPORT-CLEANUP-V1` (CLOSED/PASS)
> **결론(요약):** 유통참여형 펀딩의 사용자-facing "정산" 표현은 **두 부류**로 나뉜다 — **(A1) 운영 상태/CSV 라벨**(`settlementStatus` 표시값·CSV 헤더 `정산선택`/`정산상태`·"정산 완료" 등 — 기계적 rename 안전)와 **(A2) 보상 개념 산문**("제품 정산" = 제품/현금 보상 정산, "정산 예시", "정산 기준 가격" 등 — 별도 워딩 결정 필요). **내부 field/enum/DB/API(`settlementStatus` 등)는 유지(B).** 다수의 "정산"은 **market-trial과 무관한 정식 정산 기능**(파트너/공급자 정산 — 범위 밖). → 후속 WO는 **A1만 mechanical sweep**으로 한정 권고, **A2는 워딩 결정 후 별도 sub-scope**.

---

## 1. 조사 범위 / 방식

- 정적 코드 분석(read-only). 코드/DB/API/UI/운영데이터 무변경.
- 키워드: `정산` / `settlement` / `settlementStatus|Choice|Amount|Note` / `offline_settled|choice_pending` / CSV header / label map.
- 대상: `apps/api-server/src/controllers/market-trial/*`, `services/web-neture/src/pages/{operator,supplier,market-trial}/*`, `services/web-neture/src/api/trial.ts`, `packages/market-trial/*`.

---

## 2. ⚠️ 범위 분리 — market-trial "정산" vs 정식 정산 기능 (범위 밖)

레포 전반의 "정산" 다수는 **유통참여형 펀딩과 무관한 실제 정산(settlement) 기능**이다. **후속 WO에서 절대 건드리면 안 된다:**

| 영역 | 파일(예) | 성격 |
|------|---------|------|
| 공급자 정산 | `pages/account/SupplierSettlementsPage.tsx`, `SupplierAccountDashboardPage.tsx` | 실제 매출/수수료 정산 |
| 파트너 커미션 정산 | `pages/admin/AdminPartnerSettlementsPage.tsx`, `lib/api/admin.ts` | 실제 커미션 정산 |
| 운영 메뉴 | `config/operatorMenuGroups.ts`(`commerce_settlement` 등), `components/layouts/SupplierOpsLayout.tsx` | 정산 관리 메뉴 |
| store/seo | `lib/api/store.ts`(`calculated:'정산완료'`), `config/seoRegistry.ts` | 커머스 정산 |

→ 본 IR·후속 WO의 대상은 **`market-trial` 도메인 파일에 한정**한다.

---

## 3. 핵심 발견 — "정산"의 두 부류 (A1 / A2)

### A1. 운영 상태 / CSV 라벨 (mechanical rename 안전)

`settlementStatus` enum의 **표시값**과 CSV 헤더. 값/enum/필드는 그대로 두고 **표시 문구만** 교체 가능.

| # | 위치 | 파일:line | 현재 표현 | 노출 | 권장 변경 |
|---|------|----------|----------|------|----------|
| 1 | CSV 헤더 | `marketTrialOperatorController.ts:1153` | **`정산선택`** | operator CSV | `펀딩 처리 방식` (또는 `보상 선택`) |
| 2 | CSV 헤더 | `marketTrialOperatorController.ts:1153` | **`정산상태`** | operator CSV | `펀딩 처리 상태` |
| 3 | CSV 상태 라벨 | `marketTrialOperatorController.ts:1148` | `offline_settled:` **`정산 완료`** | operator CSV | `펀딩 처리 완료` |
| 4 | FE 상태 label map | `MarketTrialApprovalDetailPage.tsx:656,660` | `pending:` **`정산 대기`** / `offline_settled:` **`정산 완료`** | operator | `처리 대기` / `펀딩 처리 완료` |
| 5 | FE 전이 버튼 | `MarketTrialApprovalDetailPage.tsx:675` | **`정산 완료 처리`** | operator | `펀딩 처리 완료` |
| 6 | FE 에러 메시지 | `MarketTrialApprovalDetailPage.tsx:195` | **`정산 상태 변경에 실패했습니다`** | operator | `펀딩 처리 상태 변경 실패` (단, 해당 endpoint는 현재 409 disabled — 사실상 dead) |
| 7 | FE 요약 라인 | `MarketTrialApprovalDetailPage.tsx:833` | **`제품 정산 완료 {n}명`** | operator | `펀딩 처리 완료 {n}명` |
| 8 | 참여자 label map | `market-trial/MyParticipationsPage.tsx:32,36` | `pending:` **`정산 대기`** / `offline_settled:` **`정산 완료`** | participant | `처리 대기` / `펀딩 처리 완료` |
| 9 | 참여자 KPI/문구 | `MyParticipationsPage.tsx:8,9` | **`정산 완료`**(KPI), **`정산 상태`** | participant | `처리 완료` / `처리 상태` |
| 10 | BE 메시지 | `marketTrialOperatorController.ts:1055` | `참여자 N명 **정산 선택 대기**로 전환` | operator | `참여 처리 대기로 전환` |
| 11 | BE 메시지(dead) | `marketTrialOperatorController.ts:831`, `marketTrialController.ts:671,679` | `정산 상태가 …`, `정산이 완료된 참여 …` | (disabled 경로) | 표시 시 처리 표현으로 — 단 현재 미도달 |

### A2. 보상 개념 산문 (워딩 결정 필요 — blanket sweep 금지)

"정산"이 **참여자 보상(제품/현금) 정산** 개념을 설명하는 산문. `펀딩 처리`로 단순 치환하면 의미가 어긋난다("제품 정산" = 제품으로 보상). **별도 워딩 결정**(예: `제품 보상`/`참여 보상`/`보상 정산`) 후 적용 권고.

| 위치 | 파일:line | 현재 표현(발췌) | 노출 |
|------|----------|----------------|------|
| operator 심사 안내 | `MarketTrialApprovalDetailPage.tsx:407,412,413,452` | `정산 선택권`, `제품 정산 조건·정산 제품 구성` | operator |
| 참여자 계산 | `MyParticipationsPage.tsx:202,208` | `정산 계산`, `총 정산 기준 금액` | participant |
| 참여자 상세 | `market-trial/MarketTrialDetailPage.tsx:329,364,367` | `정산 예시`, `결제·정산·배송을 진행하지 않습니다`, `제품 정산과 초기 참여 혜택` | participant |
| 참여자 허브 | `MarketTrialHubPage.tsx:95,104,184` | `모집부터 정산까지`, `결과/정산`, `정산받습니다` | participant |
| supplier 상세/생성/목록 | `SupplierTrialDetailPage.tsx:193,339,347`, `SupplierTrialCreatePage.tsx:179,281,282,283,349,357`, `SupplierTrialListPage.tsx:83` | `제품 정산 기준`, `정산 예시`, `정산 제품 구성`, `정산 조건`, `제품 정산 구조` | supplier |

> A2 주의: 이 문구들은 "도매가 기준 제품 보상" 경제 구조를 설명한다. `정산→펀딩 처리` 일괄 치환 시 "펀딩 처리 예시", "펀딩 처리 기준 가격" 등 어색/오역 발생. **반드시 용어 확정 후** 처리.

---

## 4. B. 내부 field name / enum (유지)

후속 WO에서 **rename 금지**. label만 바꾼다.

| 항목 | 위치 |
|------|------|
| DB 컬럼 / API 응답 / TS 필드 | `settlementStatus`, `settlementChoice`, `settlementAmount`, `settlementProductQty`, `settlementRemainder`, `settlementNote` (`marketTrialOperatorController.ts:542-577`, `MarketTrialParticipant.entity`) |
| enum 값 | `pending` / `choice_pending` / `choice_completed` / `offline_review` / `offline_settled` |
| 상수/식별자명 | `SETTLEMENT_STATUS_LABELS`, `SETTLEMENT_STATUS_COLORS`, `OPERATOR_SETTLEMENT_NEXT`, `SETTLEMENT_VISIBLE_STATUSES`, `totalSettlementAmount`(API 필드) |
| 쿼리/필터 | `?settlementStatus=`, `p."settlementStatus"` 등 |

→ 표시 label map의 **value**만 교체, **key/const명/필드명**은 보존.

---

## 5. C. 문서 / 빌드 산출물 / 주석 (허용 잔존)

| 항목 | 위치 |
|------|------|
| 빌드 산출물 | `packages/market-trial/dist/**/*.d.ts`, `*.js`(주석 내 "정산 선택/상태") — 소스 재빌드로 갱신, 직접 수정 금지 |
| 엔티티/코드 주석 | `marketTrial*Controller.ts`, `MarketTrialApprovalDetailPage.tsx:37,43,558,559,568` 등 내부 설명 주석 |
| API JSDoc | `api/trial.ts:13,315,321,482`(`정산/결제/배송 mutation 미제공` 설명) |
| IR/CHECK/정책 문서 | 과거 작업 이력 — 유지 |

> disabled 안내문 `유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다`(`marketTrialController.ts:644`, `OperatorController.ts:756`, `api/trial.ts:326,491`)는 **의도적으로 "정산 아님"을 명시**하는 문구 → 유지 권장(또는 "O4O 정산/판매 정산 기능 아님"으로 강조). 분류 C.

---

## 6. D. 별도 WO 필요 (표시 변경 초과)

| 사유 | 비고 |
|------|------|
| `settlement*` field/enum rename | API contract·DB 변경 동반 → 본 용어정리 범위 밖. 현 단계 불필요(§4 유지) |
| 보상 개념 용어 확정(A2) | "제품 정산 → ?" 워딩 결정. 정책 문서(오프라인 결제/보상 정책)와 정합 필요 |

---

## 7. CSV 헤더 — WO 가정 정정

선행 WO 초안은 CSV 헤더에 `정산선택/정산상태/정산금액/정산메모` 4종을 가정했으나, **실제 14컬럼 헤더에는 `정산선택`·`정산상태` 2종만 존재**(`marketTrialOperatorController.ts:1153`):

```
참여자명, 참여자유형, 보상방식, 보상상태, 참여금, 입금상태, 입금확인금액,
입금확인일, 입금참조, [정산선택], [정산상태], 참여일, 유통참여형 펀딩 제목, 상태
```

`정산금액`/`정산메모`는 CSV 헤더에 **부재**(내부 필드 `settlementAmount`/`settlementNote`는 §4 유지). → 후속 WO CSV 변경 대상 = **2종**.

---

## 8. 후속 WO 범위 권고

```text
WO-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-CLEANUP-V1 (A1 한정 권고)
- CSV 헤더 2종: 정산선택 → 펀딩 처리 방식 / 정산상태 → 펀딩 처리 상태
- CSV 상태 라벨: '정산 완료' → '펀딩 처리 완료'
- operator/participant 상태 label map value: '정산 대기/완료' → '처리 대기' / '펀딩 처리 완료'
- operator 전이 버튼/요약/에러 문구 (A1 #5~#7,#10)
- 내부 settlement* field/enum/const명 유지, DB/API contract 무변경
- market-trial 도메인 파일에 한정(정식 정산 기능 미접촉)

A2(보상 개념 산문)는 위 WO에 포함하지 말 것 → 용어 확정 후 별도:
WO-O4O-MARKET-TRIAL-REWARD-WORDING-V2 (예: 제품 정산 → 제품 보상)
```

---

## 9. 최종 판단

```text
사용자-facing "정산" 변경 대상(A1, 즉시) = CSV 헤더 2종(정산선택/정산상태) + 상태 label value(정산 대기/완료)
  + operator/participant 상태 문구(전이 버튼/요약/KPI/cascade 메시지). market-trial 도메인 한정.
워딩 결정 필요(A2, 별도) = "제품 정산/정산 예시/정산 기준 가격/정산 선택권" 등 보상 개념 산문.
내부 유지(B) = settlementStatus/Choice/Amount/ProductQty/Remainder/Note · enum 값 · 상수/필드/쿼리명.
문서·이력·빌드산출물·disabled 안내(C) = 유지.
별도 WO(D) = field/enum rename(불필요), 보상 용어 확정.
후속 WO는 A1 사용자-facing label/CSV 헤더 변경으로 한정하며, DB/API contract·field rename은 하지 않는다.
범위 밖 = 공급자/파트너 정식 정산 기능 전부.
```

---

## 10. 하지 않은 것

코드/DB/API/UI/CSV/문구/운영데이터 변경 없음. 본 IR 문서 1개만 산출.

---

*Generated as read-only investigation. Implementation requires separate WO approval per CLAUDE.md.*
