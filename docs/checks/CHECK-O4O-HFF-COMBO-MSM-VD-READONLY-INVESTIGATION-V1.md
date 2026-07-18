# CHECK-O4O-HFF-COMBO-MSM-VD-READONLY-INVESTIGATION-V1 — MSM+비타민D 복합형 read-only 조사 (에이전트 가)

WO: PART B 복합형 2번째 조합(MSM+비타민D) · 일자: 2026-07-18 · 상태: **완료 (read-only — 신규 apply 대상 0)**
채널: **Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only.** DB write **0**.
분류: `hff-combo-select.ts --combo "MSM,비타민D"` (canonical eligibility).

---

## 0. 결론

> **MSM+비타민D exact-spec eligible = 31. 31 전부 이미 적재(candidate matched 31/31). 신규 apply 대상 = 0. 예상 write 0. dry-run = no-op.**

---

## 1. 조사 방법 (sparse 조합 tooling 노트)

- `select --source db`(41k JSONB `BASE_STANDARD` ILIKE 스캔)는 **MSM 같은 sparse 조합에서 statement timeout**(120s/배치, id-pagination 재스캔). vd-ca(dense)는 정상.
- **우회**: `BASE_STANDARD ILIKE '%MSM%'` 후보 **771행만 full source 추출 → 로컬 JSONL → `select --source file`** (41k 스캔 회피, canonical 분류 그대로). 결정적(고정 입력).
- 이후 sparse 조합도 동일 우회 사용.

---

## 2. 12항목 조사 결과

| # | 항목 | 값 |
|---|---|---|
| 1 | eligible candidate | **31** (MSM-mention 771 → base-mention(MSM&비타민D) 236 → exact-spec mention 89 → ELIGIBLE 31) |
| 2 | 이미 promoted | **31** (candidate matched 31/31) |
| 3 | 신규 promotable | **0** |
| 4 | 성분·함량 조합 | MSM + 비타민D (2원료). 함량 이질(제품별) — 전건 기적재로 개별 canonical |
| 5 | 제형·경로 | 정제/제피정 위주, **전부 경구**(액상 0) |
| 6 | grounding | HOLD_GROUNDING 2(귀속 실패) · eligible 31은 grounding 완비 → 적재 |
| 7 | 안전지문 그룹 수 | (전건 기적재, 개별 canonical) |
| 8 | HOLD·REVIEW·BLOCKED | exact-spec mention 89 → ELIGIBLE 31 / HOLD_MULTI 56 / HOLD_GROUNDING 2 · BLOCKED 0 |
| 9 | 기존 canonical·candidate 중복 | **31/31 matched** → 신규 dedup 0 |
| 10 | 예상 master/candidate/ko/en write | **0 / 0 / 0 / 0** |
| 11 | rollback 대상 ID | 없음 |
| 12 | 재실행 결정론 | ✅ `select --source file` 고정 JSONL → 결정적(ELIGIBLE 31 동일) |

---

## 3. 판정

- **신규 대상 0 → 완결.** apply 불필요. 자율 규칙에 따라 다음 조합(루테인+비타민A)으로 이동.
- HOLD_MULTI 56은 MSM+비타민D+제3원료(망간·비타민C·아연·N-아세틸글루코사민 등) 다원료 → 본 2-조합 대상 아님(별도 조합/MX 트랙).

---

## 4. 산출물

- 본 CHECK 문서. pool/hold/JSONL은 세션 scratchpad(session-local, 미커밋). 기존 combo 스크립트 미수정 실행만.
