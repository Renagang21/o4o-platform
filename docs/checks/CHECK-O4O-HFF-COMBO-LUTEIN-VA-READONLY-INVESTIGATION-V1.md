# CHECK-O4O-HFF-COMBO-LUTEIN-VA-READONLY-INVESTIGATION-V1 — 루테인+비타민A 복합형 read-only 조사 + dry-run 설계 (에이전트 가)

WO: PART B 복합형 3번째 조합(루테인+비타민A) · 일자: 2026-07-18 · 상태: **조사 완료 · dry-run 설계 완료 · apply 승인 대기**
채널: **Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, SELECT only.** DB write **0**.

---

## 0. 결론

> **루테인+비타민A exact-spec eligible = 33 (promoted 13 + NEW 20). NEW 20 → G-MULTI 생성 PASS 7(초안 완비·apply-ready) + 자동HOLD 13(`G-MULTI-AMOUNT-SOURCE` 표시량 grounding 미확보). BLOCKED 0. → 신규 apply 대상 = 7건, 예상 write 28. 실제 apply는 별도 승인 필요.**

---

## 1. 12항목 조사

| # | 항목 | 값 |
|---|---|---|
| 1 | eligible candidate | **33** (루테인-mention 1,735 → exact-spec mention 232 → ELIGIBLE 33) |
| 2 | 이미 promoted | **13** |
| 3 | 신규 promotable | **20 → G-MULTI PASS 7** (apply-ready) · 자동HOLD 13 |
| 4 | 성분·함량 조합 | 루테인+비타민A(2원료). NEW 20 = 18 함량조합 · PASS 7 개별 함량 |
| 5 | 제형·경로 | PASS 7 = powder 3 · softgel 4 — **전부 경구** (액상 0) |
| 6 | grounding | NEW 20 중 **13 = G-MULTI-AMOUNT-SOURCE 미확보(HOLD)** · **7 = 완비(PASS)**. select-level grounding HOLD 10 |
| 7 | 안전지문 그룹 수 | NEW 20 안전지문 15 distinct |
| 8 | HOLD·REVIEW·BLOCKED | select: HOLD_MULTI 189 + grounding 10 / generate: 자동HOLD 13(G-MULTI-AMOUNT-SOURCE) · **REVIEW 0 · BLOCKED 0** · PASS 7 |
| 9 | 기존 canonical·candidate 중복 | promoted 13(기적재) · 신규 7 미promoted → dup 0 |
| 10 | 예상 master/candidate/ko/en write | **7 / 7 / 7 / 7 = 28** |
| 11 | rollback 대상(예정) | apply 시 생성 master 7 + candidate link 7 + SPD 14. 후보 statementNo 7 = 20040017106412·20040020003157·20040020028638·20040017106393·20040017006477·20120019007268·20040017015253 |
| 12 | 재실행 결정론 | ✅ `select --source file` 고정 JSONL·generate 결정적(ELIGIBLE 33·PASS 7 동일) |

---

## 2. dry-run 설계 (compose-level PASS)

- `hff-combo-generate --pool <20new> --prefix lu-va`: **작성 7 (PASS 7 · REVIEW 0 · BLOCKED 0) · 자동HOLD 13(G-MULTI-AMOUNT-SOURCE)**.
- 초안: ko 7/7 · en 7/7 · `<table>` 0. **en 관찰**: 제품명("눈이락")·제조사 등 고유명 + 성상·보관 문구 한글 잔존 — **기존 combo composer 표준 동작**(Guard PASS, 기적재 조합과 동일 패턴). 별도 이슈로 기록(본 조합 apply 판단에 차단 아님).
- 복합제 원칙 준수: 함량 다르면 분리(개별 함량조합) · grounding 없으면 제외(13 HOLD) · 조합 혼합 금지 · 제품명 추정 0.

---

## 3. sparse 조합 tooling

- `select --source db`가 루테인(sparse)에서 timeout → `BASE_STANDARD ILIKE '%루테인%'` 1,735행 full source 추출 → 로컬 JSONL → `select --source file`(41k 스캔 회피, canonical 분류 동일).

---

## 4. 다음 (apply 승인 시)

- 대상 = PASS 7 (statementNo §11). apply 계약 = combo apply(단일 조합·단일 TX·이중 게이트·트랜잭션 내 사후검증 masters/candidate/ko/en=7·canonicalDup 0·불일치 자동 ROLLBACK·rollback manifest·재실행 no-op·독립 검증). tag = 조합 전용(`batch:single-nutrient-combo-lu-va` 계열).
- 자동HOLD 13은 표시량 grounding 확보 후 재검토(후속). promoted 13·HOLD_MULTI 189는 본 조합 대상 아님.
