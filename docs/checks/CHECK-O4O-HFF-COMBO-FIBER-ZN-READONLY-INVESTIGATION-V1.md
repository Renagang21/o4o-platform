# CHECK-O4O-HFF-COMBO-FIBER-ZN-READONLY-INVESTIGATION-V1 — 식이섬유+아연 복합형 read-only 조사 (에이전트 가)

WO: PART B 복합형 4번째 조합(식이섬유+아연) · 일자: 2026-07-18 · 상태: **완료 (read-only — 신규 apply 대상 0)**
채널: Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only. DB write **0**.

## 0. 결론

> **식이섬유+아연 exact-spec mention 188이나 ELIGIBLE = 0 (HOLD_MULTI 89 + HOLD_GROUNDING 96 + 벌크 2 + 정체 1). 식이섬유 원료의 표시량 grounding 난이도(난소화성말토덱스트린 등 변동 표시량)로 순수 2-조합이 전부 held → 신규 apply 대상 0. write 0. no-op.**

## 1. 12항목 (요지)

| # | 항목 | 값 |
|---|---|---|
| 1 | eligible candidate | **0** (아연 mention 11,393 → exact-spec mention 188 → ELIGIBLE 0) |
| 2 | promoted | N/A |
| 3 | 신규 promotable | **0** |
| 8 | HOLD·REVIEW·BLOCKED | HOLD_MULTI 89 · **HOLD_GROUNDING 96** · 벌크 2 · 정체 1 · BLOCKED 0 |
| 10 | 예상 write | **0** |
| 12 | 재실행 결정론 | ✅ `select --source file` 결정적 |

## 2. 판정

- **신규 0 → 완결.** 식이섬유는 표시량 grounding 확보가 어려워(원료 변동) 현재 순수 2-조합 eligible 0. grounding 방법 개선 후 재검토 대상(후속).
- tooling: 아연 anchor 11,393행 추출(219s) → `select --source file`. (아연 common → 대용량)

## 3. 다음
- 자율 규칙에 따라 다음 조합(오메가3+비타민E)으로 이동.
