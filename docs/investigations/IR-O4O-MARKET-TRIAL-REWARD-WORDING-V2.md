# IR-O4O-MARKET-TRIAL-REWARD-WORDING-V2

> 유통참여형 펀딩(Market Trial) **보상 산문(A2)** 용어 정리 사전 조사
> Status: Investigation (read-only) · Date: 2026-06-21 · Scope: market-trial domain only

---

## 0. 요약 (TL;DR)

- A2 "정산" 산문은 **7개 화면**에 분포한다(참여자 / 공급자 / 운영자 각각).
- **코드에 이미 "제품 보상 / 현금 보상 / 보상 방식" 어휘가 존재**한다
  (`MarketTrialHubPage` REWARD 라벨, `MarketTrialDetailPage` `REWARD_LABELS`, `MarketTrialDetailPage`의 "보상 방식" InfoItem).
- 따라서 A2 정리는 **새 용어 도입이 아니라**, 남은 "정산" 산문을 **기존 "보상" 어휘에 정렬**하는 작업이다.
- 모든 발견 항목은 **JSX 텍스트 / 주석 / 사용자 메시지**이며, 내부 `settlement*` enum·field·route·함수명과 **물리적으로 분리**되어 있다 → 내부 식별자를 건드리지 않고 산문만 정리 가능.
- "정산"을 **A1 정리값인 '펀딩 처리'로 치환하면 안 된다.** 보상 문맥의 대표어는 **'보상'**이다.
- 후속은 **화면별 copy review**가 필요하다(기계적 sweep 금지). 일부는 문맥 의존(B), 일부는 **'정산 아님' 경계 문장으로 의도적 유지(C)**.

---

## 1. 작업명 / 배경

- 작업명: **IR-O4O-MARKET-TRIAL-REWARD-WORDING-V2**
- 선행: `IR-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-AUDIT-V1` 에서 "정산" 표현을 A1(운영 상태/CSV 라벨) / A2(보상 개념 산문) 두 부류로 분리.
  - **A1** — 상태 라벨(정산상태/정산선택/정산 완료/정산 대기) → `WO-O4O-MARKET-TRIAL-PROCESSING-TERMINOLOGY-CLEANUP-V1` 로 **'펀딩 처리' 계열 정리 완료** (enum 키/필드명은 유지).
  - **A2** — 보상 개념 산문(제품 정산 / 정산 예시 / 정산 기준 가격 / 정산 선택권 / 제품 정산 구조 / 현금·제품 보상 설명) → **본 IR 대상, 미정리.**
- 본 IR은 read-only 조사다. 코드/문구/DB/API/UI/운영 데이터 변경 없음.

---

## 2. 조사 범위 (검색 범위)

### 2.1 In-scope (market-trial 도메인)

| 영역 | 경로 |
|---|---|
| 참여자 | `services/web-neture/src/pages/market-trial/MarketTrialHubPage.tsx` |
| 참여자 | `services/web-neture/src/pages/market-trial/MarketTrialDetailPage.tsx` |
| 참여자 | `services/web-neture/src/pages/market-trial/MyParticipationsPage.tsx` |
| 공급자 | `services/web-neture/src/pages/supplier/SupplierTrialCreatePage.tsx` |
| 공급자 | `services/web-neture/src/pages/supplier/SupplierTrialDetailPage.tsx` |
| 공급자 | `services/web-neture/src/pages/supplier/SupplierTrialListPage.tsx` |
| 운영자 | `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` |
| API client | `services/web-neture/src/api/trial.ts` |
| Backend | `apps/api-server/src/controllers/market-trial/*` |
| Package | `packages/market-trial/src/*` |

### 2.2 Out-of-scope (정식 정산 기능 — 미접촉)

아래는 **partner/supplier 실제 정산(회계) 기능**으로, "정산"이 정당한 도메인이며 본 IR/후속 WO에서 **건드리지 않는다.**

```
services/web-neture/src/pages/partner/PartnerSettlementBatchPage.tsx
services/web-neture/src/pages/partner/SettlementsPage.tsx
services/web-neture/src/pages/admin/AdminSettlementsPage.tsx
services/web-neture/src/pages/admin/AdminPartnerSettlementsPage.tsx
services/web-neture/src/pages/account/SupplierSettlementsPage.tsx
(+ supplier 주문/대시보드 등 비-trial 정산 표현)
```

### 2.3 검색 키워드

```
제품 정산 · 현금 정산 · 수익 정산 · 정산 예시 · 정산 기준 · 정산 기준 가격
정산 선택권 · 정산 제품 · 정산 조건 · 정산 구조 · 정산 계산 · 총 정산
정산받 · 정산 방식 · 정산 상태 · settlement · reward · compensation · 보상
```

---

## 3. A2 표현 전수 목록 (화면별 발견 위치)

> 분류: **A** 즉시 변경 가능 / **B** 문맥 확인 후 변경 / **C** 유지(경계·내부) / **D** 별도 설계 필요
> (행번호는 조사 시점 기준 — 후속 WO 시 재확인 필요)

### 3.1 참여자 — MarketTrialHubPage.tsx

| 라인 | 현재 표현 | 문맥 | 분류 | 권장 |
|---|---|---|---|---|
| L44–45 | `product:'제품 보상'`, `cash:'현금 보상'` | REWARD 라벨 | — (이미 정렬됨) | 유지(참조 선례) |
| L95 | "모집부터 **정산**까지 이 공간에서 확인할 수 있습니다." | 허브 소개 산문 | B | "모집부터 **보상**까지" |
| L104 | step label "결과/**정산**" + "...제품 또는 현금 보상을 선택하여 **정산받습니다**." | 진행 단계 설명 | B | "결과/**보상**" + "...보상을 **받습니다**" |
| L184 | "참여 후 진행 상황과 **정산**은 \"내 참여 내역\"에서 추적됩니다." | 안내 산문 | B | "진행 상황과 **보상**은" |

### 3.2 참여자 — MarketTrialDetailPage.tsx

| 라인 | 현재 표현 | 문맥 | 분류 | 권장 |
|---|---|---|---|---|
| L38–39 | `product:'제품 보상'`, `cash:'현금 보상'` (`REWARD_LABELS`) | 라벨 | — (이미 정렬됨) | 유지(참조 선례) |
| L288 / L380 / L459 | "**보상 방식**" / "보상 방식을 선택해 주세요" | 보상 선택 UI | — (이미 정렬됨) | 유지(참조 선례) |
| L329 | "**정산 예시**: 단가 …원 참여 시 → 총 …원 환원" | 보상 미리보기 | A | "**보상 예시**"(또는 "참여 보상 예시") |
| L364 | "…거래 조건, 발송, **정산**은 공급자가 별도 안내…O4O 화면에서는 결제·**정산**·배송을 진행하지 않습니다." | **O4O가 정산을 하지 않음**을 명시하는 경계 문장 | **C** | **유지** (정식 정산 부재 경계) |
| L367 | "…프로그램 조건에 따라 **제품 정산**과 초기 참여 혜택을 받습니다." | 금융투자 아님 고지 | A | "**제품 보상**" |

### 3.3 참여자 — MyParticipationsPage.tsx

| 라인 | 현재 표현 | 문맥 | 분류 | 권장 |
|---|---|---|---|---|
| L8–10 | 헤더 주석 "정산 완료 / 정산 상태 / 정산 계산" | 코드 주석 | C(주석) | 선택적 정렬 |
| L107 | 주석 "정산 선택(제품/현금)" | 코드 주석 | C(주석) | 선택적 정렬 |
| L203 | "**정산 계산**" | 드로어 섹션 제목(렌더) | A | "**보상 계산**" |
| L209 | `['총 정산 기준 금액', …]` | 금액 행 라벨(렌더) | B | "총 **보상 기준 금액**" |
| L259 | "**정산 방식**을 선택해 주세요" | 선택 헤딩(렌더) | A | "**보상 방식**을 선택해 주세요" |
| L337 | "최종 **정산** 및 공급 관련 마감은 운영자/공급자 절차로 진행됩니다." | 마감 안내 | B | "최종 **보상 처리** 및 공급 관련 마감" |
| L426 | "참여 내역, 예상 **정산** 정보, 선택 현황을 확인합니다." | 페이지 설명 | A | "예상 **보상** 정보" |
| L430 | 주석 "오프라인 입금/정산 안내" | 코드 주석 | C(주석) | 선택적 정렬 |
| L441 | "참여금 입금 확인과 **제품 정산** 상태는 …오프라인으로 확인한 뒤 반영합니다." | 오프라인 안내 | B | "**제품 보상** 상태" |
| L542 | "총 **정산** {totalSettlementAmount}" | 카드 금액(렌더) | B | "총 **보상**" / "총 보상 기준 금액" |

### 3.4 공급자 — SupplierTrialCreatePage.tsx

| 라인 | 현재 표현 | 문맥 | 분류 | 권장 |
|---|---|---|---|---|
| L70 | 주석 "정산 계산 미리보기" | 코드 주석 | C(주석) | 선택적 정렬 |
| L179 | "…**제품 정산**을 통한 초기 매장 랜딩이 목적입니다." | 작성 가이드 | A | "**제품 보상**" |
| L182 | "…**정산 선택권**·**제품 정산 조건**·포럼 운영 방식 확인…" | 승인 기준 안내 | B | "**보상 방식 선택**·**제품 보상 조건**" |
| L281 | "제품 구성(제품명·수량·**정산 기준 가격**·배송 시점)" | 입력 가이드 | B | "**보상 기준 단가**" |
| L282 | "**제품 정산 기준** — 소비자가가 아니라 도매 공급가격 또는 그 이하" | 단가 기준 | B | "**제품 보상 기준**" |
| L283 | "포럼 운영 방식 — 제품 개발 진행·**정산 조건**·송금 기한 안내" | 가이드 | B | "**보상 조건**" |
| L349 | "**제품 정산**(제품 제공)을 중심으로…**정산 제품명**·예상 수량·**정산 기준 가격**…" | placeholder 가이드 | B | "**제품 보상** / **보상 제품명** / **보상 기준 단가**" |
| L357 | "…**제품 정산**은 소비자가가 아니라 도매 공급가격 또는 그 이하 기준…" | 설계 가이드 | B | "**제품 보상**" |
| L387 | "1인당 권장 참여금액(**정산 기준금액**)." | 필드 도움말 | B | "**보상 기준 금액**" |
| L407 | "리워드는 **제품 정산 구성**(수량·잔액) 계산의 참고값입니다." | 필드 도움말 | B | "**보상 제품 구성**" |
| L413 | "**정산 계산 미리보기** (단가 1개 기준)" | 미리보기 제목(렌더) | A | "**보상 계산 미리보기**" |
| L441 | "포럼·**제품 정산 대상**으로 관리할 참여자(매장) 수의 상한…" | 필드 도움말 | B | "**제품 보상 대상**" |

### 3.5 공급자 — SupplierTrialDetailPage.tsx

| 라인 | 현재 표현 | 문맥 | 분류 | 권장 |
|---|---|---|---|---|
| L193 | "실제 **정산 제품 구성**·결과 약속은 상세 설명…을 따릅니다." | 안내 산문 | B | "**보상 제품 구성**" |
| L339 | "**정산 예시**: 단가 …원 참여 시 → 총 …원 환원" | 보상 미리보기 | A | "**보상 예시**" |
| L347 | "…제품 개발 진행·**정산 조건**·송금 기한…**제품 정산 기준**·**정산 제품 구성**·매장 활용 방식…" | 운영 안내 산문 | B | "**보상 조건** / **제품 보상 기준** / **보상 제품 구성**" |

### 3.6 공급자 — SupplierTrialListPage.tsx

| 라인 | 현재 표현 | 문맥 | 분류 | 권장 |
|---|---|---|---|---|
| L83 | "…목표 매장 수와 **제품 정산 구조**를 먼저 설계해 보세요." | 빈 상태 안내 | B | "**제품 보상 구조**"(또는 "보상 제품 구성") |

### 3.7 운영자 — MarketTrialApprovalDetailPage.tsx

| 라인 | 현재 표현 | 문맥 | 분류 | 권장 |
|---|---|---|---|---|
| L37 / L43 / L1098 | 주석("정산"/"settlement") | 코드 주석 | C(주석) | 선택적 정렬 |
| L407 | "…투자형 오해 방지·송금 흐름·**정산 선택권**·포럼 운영 가능성·제품 제공 위험을 확인하는 최소 운영 심사…" | 심사 안내 | B | "**보상 방식 선택**" |
| L412 | "참여자의 제품/수익 **정산 선택권**과 충돌하지 않는가 (**제품 정산** 선택자만 매장 랜딩 추적)" | 체크리스트 | B | "**보상 방식 선택** / **제품 보상** 선택자" |
| L413 | "**제품 정산 조건**·**정산 제품 구성**·기준 가격이 설명되어 있는가" | 체크리스트 | B | "**제품 보상 조건**·**보상 제품 구성**" |
| L452 | "투자형 오해·송금 흐름·**정산 조건**·포럼 운영 기준 중…" | 반려 사유 안내 | B | "**보상 조건**" |
| L840 | "입금 확인 완료자는 **정산 방식**(제품/수익)을 선택합니다. **제품 정산**을 선택한 참여자만…수익·현금성 **정산** 선택자는…" | 운영 안내 산문 | B | "**보상 방식** / **제품 보상** / 현금성 **보상**" |
| L928 | "…오프라인 입금 확인과 **제품 정산 상태**를 관리합니다." | 운영 안내 | B | "**제품 보상 상태**" |
| L1099–L1113 | "**정산 상태 관리**" / "총 **정산 금액**" / "**정산 상태**" (테이블) | `SHOW_MARKET_TRIAL_COMMERCE_UI=false` 로 **현재 비노출** | C(은닉) | 노출 재개 시 "보상" 정렬 |

### 3.8 경계 / 내부 — api/trial.ts · marketTrialController.ts

| 위치 | 현재 표현 | 분류 | 처리 |
|---|---|---|---|
| `api/trial.ts` L13/L315/L321 | 주석("정산") | C(주석) | 선택적 |
| `api/trial.ts` L326, L491 | `marketTrialCommerceDisabled('유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다.')` | **C** | **유지** (정식 정산 부재 경계) |
| `marketTrialController.ts` L644 | message "유통참여형 펀딩은 O4O 정산 기능을 제공하지 않습니다." | **C** | **유지** |
| `marketTrialController.ts` L671/L679 | "정산이 완료된 참여…변경 불가" / "아직 정산 선택이 가능한 시점이 아닙니다." | C(비활성 경로) | 유지(현재 mutation 차단됨) |
| `marketTrialController.ts` 전반 | `settlementStatus / settlementChoice / settlementAmount / settlementNote / totalSettlementAmount / settlementProductQty / settlementRemainder / settlementPreview / calcSettlementForParticipant / saveSettlementChoice`, route `/my-settlement` · `/settlement-choice`, enum `SettlementStatus`(pending/choice_pending/choice_completed/offline_review/offline_settled) | **C(내부)** | **유지(rename 금지)** |

---

## 4. 문맥 분류 요약

| 분류 | 개수(대략) | 성격 |
|---|---|---|
| A 즉시 변경 | 6 | "정산 예시 / 정산 계산 / 정산 방식 / 제품 정산"의 단순·명확 표현 |
| B 문맥 확인 후 변경 | 20+ | "정산 기준 가격(→단가 vs 금액)", "정산 조건/선택권/제품 구성/상태" 등 문장 다듬기 필요 |
| C 유지 | 다수 | (1) "O4O는 정산을 하지 않는다" 경계 문장, (2) 내부 settlement field/enum/route, (3) 코드 주석, (4) 비노출 UI |
| D 별도 설계 | 0(이번 범위에서 신규 없음) | 금액 계산·환불/취소 시 보상 처리 규칙은 후속 정책 영역(문구 정리와 분리) |

---

## 5. 권장 대표 용어 (결론)

**핵심: A2의 대표어는 '보상'이며, 코드에 이미 존재하는 '제품 보상 / 현금 보상 / 보상 방식' 어휘에 정렬한다.**

| 문맥 | 권장 용어 | 근거 |
|---|---|---|
| 제품으로 받는 보상 | **제품 보상** | `REWARD_LABELS.product='제품 보상'` 선례 |
| 현금으로 받는 보상 | **현금 보상** | `REWARD_LABELS.cash='현금 보상'` 선례 |
| 보상 방식 선택 | **보상 방식 (선택)** | "보상 방식" InfoItem 선례 |
| 보상 금액(총액) | **보상 기준 금액** | "정산 기준금액/총 정산 기준 금액" 대체 |
| 보상 단가(단가 기준) | **보상 기준 단가** | "정산 기준 가격"이 도매 공급가 단가 맥락일 때 |
| 보상 미리보기/예시 | **보상 예시 / 보상 계산** | "정산 예시 / 정산 계산" 대체 |
| 보상 제품 구성 | **보상 제품 구성** | "정산 제품 구성 / 제품 정산 구조" 대체 |
| 보상 조건 | **(제품) 보상 조건** | "정산 조건 / 제품 정산 조건" 대체 |
| 포괄/집계(참여자-facing) | **참여 보상** (보조어) | 제품/현금을 아우를 때만, 제품 문맥엔 "제품 보상" 병기 |

### 피해야 할 표현

```
펀딩 처리 예시 / 펀딩 처리 기준 가격 / 펀딩 처리 제품 구성   ← A1 상태어를 보상 산문에 오용
보상 정산 / 상품 정산 / 판매 정산                          ← "정산" 잔존, O4O 정식 정산과 혼동
```

> 단, **"O4O는 결제·정산·배송을 진행하지 않습니다" / "O4O 정산 기능을 제공하지 않습니다"** 류(분류 C)는 **'정산'을 그대로 유지**한다 — 여기서 '정산'은 보상이 아니라 *정식 회계 정산의 부재*를 가리키는 경계 표현이기 때문이다.

---

## 6. 조사 질문 답변

1. **A2가 어느 화면에?** — 참여자(Hub/Detail/MyParticipations), 공급자(Create/Detail/List), 운영자(ApprovalDetail). api/trial.ts·controller는 대부분 내부/경계(C).
2. **분류?** — §3 표 참조. A 6 / B 20+ / C 다수 / D 0.
3. **참여자·공급자·운영자 통일 가능?** — **가능.** 공통 어휘(제품 보상·현금 보상·보상 방식·보상 기준 금액/단가·보상 예시·보상 제품 구성·보상 조건)로 정렬. 일부는 이미 적용됨.
4. **제품 보상 vs 참여 보상?** — **코드 선례가 '제품 보상'**이므로 제품 문맥=제품 보상, 현금 문맥=현금 보상. '참여 보상'은 포괄/집계 보조어로만 사용.
5. **"정산 기준 가격"→"보상 기준 금액" 의미 유지?** — **부분.** 총액 맥락=보상 기준 금액, 단가(도매 공급가) 맥락=**보상 기준 단가**로 구분해야 의미 보존(예: Create L281/L282/L349).
6. **"정산 선택권"→"보상 방식 선택" 유지?** — **예.** "보상 방식" 선례와 일치.
7. **내부 field/enum 안 바꾸고 산문만 정리 가능?** — **예.** 모든 A/B 항목은 JSX 텍스트·주석·메시지이며 `settlement*` 식별자와 분리됨.
8. **기계 sweep vs 화면별 copy review?** — **화면별 copy review 필요.** 다수가 B(단가/금액 구분, 문장 재구성)이고 C(경계 문장·내부 식별자)는 보존해야 하므로 단순 치환은 위험.

---

## 7. 변경 보류 항목 (이번/후속 WO에서 하지 않음)

```
- 내부 settlement field / enum / route / 함수명 rename (SettlementStatus, settlementStatus,
  settlementChoice, settlementAmount, totalSettlementAmount, calcSettlementForParticipant,
  saveSettlementChoice, /my-settlement, /settlement-choice 등)
- "O4O는 결제·정산·배송을 진행하지 않습니다" / "O4O 정산 기능을 제공하지 않습니다" 경계 문장
- DB / API contract / migration / enum 값 변경
- A1 처리 상태 용어('펀딩 처리') 재수정
- 정식 정산 기능(partner/admin/supplier Settlement* 화면) 일체
- 보상 금액 계산식·환불/취소 보상 처리 규칙(정책 영역, 문구 정리와 분리 — 분류 D)
```

---

## 8. 정식 정산 기능 미접촉 / 내부 field 유지 확인

- **정식 정산 기능 미접촉**: §2.2 의 partner/admin/supplier `*Settlement*` 화면은 본 조사 대상이 아니며, 후속 WO 범위에서 명시적으로 제외한다. 이들의 "정산"은 정당한 도메인 용어다.
- **내부 settlement field 유지**: `apps/api-server/src/controllers/market-trial/marketTrialController.ts` 의 `SettlementStatus` enum 및 `settlement*` 필드·route·함수는 **사용자-facing 산문과 분리된 내부 식별자**로, 본 IR 및 후속 WO에서 **rename 대상이 아니다.** 산문 정리는 이 식별자에 영향을 주지 않는다.

---

## 9. 후속 WO 후보

- **WO-O4O-MARKET-TRIAL-REWARD-WORDING-CLEANUP-V2**
- 방식: **화면별 copy review** (기계적 sweep 금지)
- 예상 범위(분류 A 우선 → B 화면별 검토):

```
제품 정산        → 제품 보상
현금 정산/현금성 정산 → 현금 보상
정산 예시        → 보상 예시 (필요 시 '참여 보상 예시')
정산 계산        → 보상 계산
정산 방식        → 보상 방식
정산 기준 가격    → 보상 기준 단가(단가 맥락) / 보상 기준 금액(총액 맥락)
정산 기준금액/총 정산 기준 금액 → 보상 기준 금액
정산 선택권      → 보상 방식 선택
정산 제품 구성/제품 정산 구조 → 보상 제품 구성
(제품) 정산 조건  → (제품) 보상 조건
제품 정산 상태    → 제품 보상 상태
정산받습니다      → 보상을 받습니다
```

후속 WO에서도 §7 보류 항목은 **변경하지 않는다.**

---

## 10. 작업 규칙 준수 기록

- 사전 `git status --short` 확인: `pnpm-lock.yaml` 만 M (직전 `pnpm install` 부산물 — 본 IR과 무관, 커밋하지 않음).
- 본 IR은 **문서 1개만 path-specific 커밋**, 코드/DB/API/UI/package/lockfile/Dockerfile 변경 없음.

---

## 11. 완료 기준 체크

- [x] A2 보상 산문 전수 조사 (§3, 7개 화면 + 경계/내부)
- [x] 제품 보상 / 참여 보상 / 현금 보상 / 보상 처리 후보 비교 (§5, §6-4)
- [x] 화면별 권장 변경안 정리 (§3 표)
- [x] 내부 settlement field 유지 명시 (§7, §8)
- [x] 정식 정산 기능 범위 밖 명시 (§2.2, §8)
- [x] 후속 cleanup WO 범위 제안 (§9)
- [x] 코드/DB/API/UI 변경 없이 문서만 작성 (§10)
