# CHECK-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1

> WO: **WO-O4O-HFF-KO-FUNCTION-CLAUSE-HUMAN-REVIEW-QUEUE-BUILD-V1**
> 기준 커밋: `55c99593f`
> 판정: **PASS** — 사람 검토 큐 **3,858건** 확정 · DB write 0 · canonical 변경 0 · 검토 판정 실행 0

---

## 1. 목적

HFF ko 기능성 절 backfill 2트랙에서 **자동 보정 대상에서 제외된 사람 검토 대상**을 통합·중복 제거하고,
제품별 검토가 가능한 **단일 큐**를 만든다. 이번 WO는 조사·통합·정리 전용이며 설명서 생성·수정·판정은 수행하지 않는다.

---

## 2. 기준선 (§2)

| 항목 | 수 |
|---|---:|
| HFF 전체 후보 | 41,261 |
| HFF STORE/ko canonical | 40,913 |
| Agent 9 HOLD (D) | 348 |
| CREATED 안전 backfill (완료) | 5,269 |
| SKIPPED_EXISTING 안전 적용 (완료) | 13 |
| **A** V2 사람 검토 | 3,652 |
| **B** SKIPPED 후속 사람 검토 | 206 (HUMAN_REVIEW 138 + UNSUPPORTED_STRUCTURE 68) |
| **C** SOURCE_LINE_BREAK_FRAGMENTED | 2 |

---

## 3. 집합 대조 결과 (§7~§11)

```
|A| = 3,652   |B| = 206   |C| = 2   |D(Agent9 HOLD)| = 348

A∩B = 0    A∩C = 2    B∩C = 0
A∩D = 0    B∩D = 0    C∩D = 0

FINAL_FUNCTION_REVIEW_QUEUE = A ∪ B ∪ C = 3,858
```

- **206건은 3,652건에 포함되지 않는 별도 모집단**이다(A∩B = 0). 2,451 트랙의 모집단이 V2 사람 검토 집합과 애초에 분리되어 구성되었기 때문이며, 단순 합산이 아니라 실측 대조로 확인했다.
- **FRAGMENTED 2건은 A 의 부분집합**(A∩C = 2)이므로 별도 행을 추가하지 않고 **사유 태그만 병합**했다(§9).
- **Agent 9 HOLD 348 과의 교집합은 0**이다. HOLD 대상은 canonical 이 존재하지 않아(canonicalExists=false) 기능성 절 검토 모집단에 들어오지 않는다. HOLD 상태는 변경하지 않았고 파일 sha256 동일함을 검증했다.
- Agent 9 HOLD 는 큐 수에 합산하지 않는다(§11).

산출: [`hff-ko-function-human-review-source-set-audit-v1.json`](../../apps/api-server/src/scripts/data/hff-ko-function-human-review-source-set-audit-v1.json) · [`hff-ko-function-human-review-overlap-audit-v1.json`](../../apps/api-server/src/scripts/data/hff-ko-function-human-review-overlap-audit-v1.json)

---

## 4. 검토 사유 표준화 (§13)

원본 사유를 **덮어쓰지 않고** `originalReviewReasons` / `standardizedReviewReasons` / `sourceClassifications` 를 모두 보존했다.
총괄 마커(`HUMAN_REVIEW_REQUIRED`)만 있는 A 트랙 행은 `proposedSegments` 신호에서 실질 사유를 파생시켰다.

| 표준 사유 | 건수 |
|---|---:|
| SOURCE_CLAUSE_SEGMENTATION_UNCERTAIN | 3,043 |
| FORM_FUNCTION_BOUNDARY_UNCLEAR | 1,260 |
| INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR | 973 |
| ENGLISH_ONLY_FUNCTION | 252 |
| ENGLISH_PARALLEL_AMBIGUOUS | 242 |
| FUNCTION_CONTAINER_NOT_IDENTIFIABLE | 101 |
| UNSUPPORTED_RENDERER_STRUCTURE | 68 |
| MALFORMED_BRACKET | 45 |
| COMPOSITE_GROUP_BOUNDARY_UNCLEAR | 26 |
| OTHER_REVIEW_REQUIRED | 14 |
| MULTI_INGREDIENT_FLAT_STRUCTURE | 9 |
| CANONICAL_STRUCTURE_UNSAFE_TO_PATCH | 9 |
| OFFICIAL_GROUP_RESTART_AMBIGUOUS | 4 |
| SOURCE_LINE_BREAK_FRAGMENTED | 2 |

- 표준 어휘 밖 사유 **0건** (`unmappedOriginalReasons: []`).
- 매핑표 전문: [`hff-ko-function-human-review-reason-normalization-v1.json`](../../apps/api-server/src/scripts/data/hff-ko-function-human-review-reason-normalization-v1.json)

---

## 5. 우선순위 · 권장 조치 (§14·§15)

| 우선순위 | 건수 |
|---|---:|
| P1 | 2,252 |
| P2 | 149 |
| P3 | 1,457 |

| recommendedAction | 건수 |
|---|---:|
| REVIEW_SOURCE_BOUNDARY | 2,250 |
| REVIEW_OFFICIAL_FUNCTION_COMPLETENESS | 1,251 |
| REVIEW_ENGLISH_POLICY | 206 |
| REVIEW_RENDERER_STRUCTURE | 101 |
| REVIEW_COMPOSITE_GROUPING | 39 |
| REVIEW_CANONICAL_PATCH_LOCATION | 9 |
| REVIEW_ORIGINAL_LINE_BREAK | 2 |
| CROSS_CHECK_AGENT9_HOLD | 0 |

권장 조치는 **사람이 확인해야 할 지점**만 지시하며 자동 수정 지시는 포함하지 않는다.

정렬: `priority ASC → productionBucket(CREATED→SKIPPED_EXISTING→HOLD_FOR_AGENT_9→OTHER) → statementNo ASC → candidateId ASC`

---

## 6. 현재 DB 재확인 (§16·§17)

read-only 세션(`SET default_transaction_read_only = on`, `SHOW transaction_read_only = on` 확인)으로 3,858건 전량의
candidate · ProductMaster · canonical 현재 상태를 재확인했다. `mfds_permit_number = ANY($1)` 단일 조회 후 JS `Map` 대조(행별 상관 서브쿼리 없음).

| currentState | 건수 |
|---|---:|
| READY_FOR_REVIEW | 3,858 |
| STALE_CANONICAL_CHANGED | 0 |
| CANDIDATE_MISSING | 0 |
| PRODUCT_MASTER_LINK_CHANGED | 0 |
| CANONICAL_MISSING | 0 |
| ALREADY_RESOLVED | 0 |

- stale·resolved 분리 파일은 **0건이지만 빈 파일로 명시 생성**했다(§24).
- renderer family: DRIVER 2,814 / COMPOSITE 1,044. 2,451 family audit 이 SSOT 인 후보는 그 값을 사용했고, 나머지는 h2 시그널 집합으로 실측했다(단일 클래스 문자열 의존 금지).
- anomaly **0건** (빈 배열 명시 생성).

산출: [`hff-ko-function-human-review-current-db-audit-v1.json`](../../apps/api-server/src/scripts/data/hff-ko-function-human-review-current-db-audit-v1.json)

---

## 7. 큐 (§18~§20)

[`hff-ko-function-human-review-queue-v1.jsonl`](../../apps/api-server/src/scripts/data/hff-ko-function-human-review-queue-v1.jsonl) — 3,858행, 전량 `reviewStatus: "PENDING"`.

| 구분 | 값 |
|---|---:|
| 행 수 | 3,858 |
| candidateId 중복 | 0 |
| statementNo 중복 | 0 |
| queueIndex 1..3858 연속 | PASS |
| 정렬 위반 | 0 |
| 필수 필드 누락 | 0 |
| productionBucket | CREATED 2,808 / SKIPPED_EXISTING 1,050 |
| sourceSets | V2_HUMAN_REVIEW 3,652 / SKIPPED_HUMAN_REVIEW 138 / SKIPPED_UNSUPPORTED_STRUCTURE 68 / SOURCE_LINE_BREAK_FRAGMENTED 2 |
| 대표 분류 | V2_HUMAN_REVIEW 3,650 / SKIPPED HUMAN_REVIEW_REQUIRED 138 / UNSUPPORTED_STRUCTURE 68 / FRAGMENTED 2 |

---

## 8. 표본·전체 감사 (§21·§22)

- 표본 **80건** (P1 30 · P2 30 · P3 20 — Agent 9 교집합 0 이므로 부족분 10 을 P1 로 보충). 결정적 균등 간격 추출.
- 표본 항목별 10개 점검 전부 PASS, 실패 표본 0.
- 큐 전체 감사 21개 점검 전부 PASS (`QUEUE_SIZE_EQUALS_UNION`, `CANDIDATE_ID_UNIQUE`, `QUEUE_INDEX_CONTIGUOUS_FROM_1`, `REQUIRED_FIELDS_PRESENT`, `ALL_REVIEW_STATUS_PENDING`, `STANDARDIZED_REASONS_IN_VOCABULARY`, `RECOMMENDED_ACTION_IN_VOCABULARY`, `CURRENT_STATE_IN_VOCABULARY`, `SOURCE_SETS_IN_VOCABULARY`, `ORIGINAL_REASONS_PRESERVED`, `SORT_ORDER_VALID`, `P1/P2/P3_REASON_CONSISTENT`, `AGENT9_NO_DUPLICATE_QUEUE_ROW`, `AGENT9_METADATA_PRESENT`, `DB_AUDIT_COVERS_ALL`, `NO_AUTO_RESOLUTION_APPLIED` 등).

산출: [`hff-ko-function-human-review-quality-samples-v1.json`](../../apps/api-server/src/scripts/data/hff-ko-function-human-review-quality-samples-v1.json)

---

## 9. DB write 0 증명 (§23)

| 지표 | BEFORE | AFTER |
|---|---:|---:|
| HFF STORE/ko canonical | 40,913 | 40,913 |
| STORE/ko canonical 전체 | 63,321 | 63,321 |
| corpus md5 | `ebc73eaf078d0bf35eeb33973d4b6b34` | 동일 |
| max(updated_at) | 2026-07-29T21:33:09.753Z | 동일 |
| product_candidates 전체 | 394,495 | 394,495 |

`diff: []` · `writes: {insert:0, update:0, delete:0}` · 8개 점검 전부 PASS.
Agent 9 HOLD 큐 파일 sha256 도 실행 전후 동일함을 검증했다.

산출: [`hff-ko-function-human-review-db-unchanged-v1.json`](../../apps/api-server/src/scripts/data/hff-ko-function-human-review-db-unchanged-v1.json)

---

## 10. 금지 사항 준수 (§1·§4·§26)

| 금지 항목 | 결과 |
|---|---|
| DB INSERT/UPDATE/DELETE | 0 (read-only 세션 강제) |
| canonical 생성·수정·삭제 | 0 |
| 생산 parser·driver·segmenter 수정 | 0 |
| 설명서 생성·수정 | 0 |
| 사람 검토 판정 실행 | 0 (전량 PENDING) |
| Agent 9 HOLD 상태 변경 | 0 (파일 해시 동일) |
| 영문 기능성 자동 번역 | 0 |
| 공식 기능성 삭제·재작성 | 0 (원문 그대로 복사) |
| 기존 queue·manifest 원본 수정 | 0 |
| 공용 renderer·CSS 수정 | 0 |
| `git add .` / 경로 없는 commit / force push / pnpm-lock 수정 | 없음 |

작업 시작 시 워크트리에 타 세션 WIP(`otc-v4-nr26-post-verification-all.ga.json`, `pnpm-lock.yaml`)가 있었으나
산출물 경로가 겹치지 않으므로 **수정·삭제·stash 없이 그대로 두고** 경로 지정 커밋만 수행했다(§5·§26).

---

## 11. 산출물

**스크립트**
- [`hff-ko-function-human-review-source-set-audit.mjs`](../../apps/api-server/src/scripts/hff-ko-function-human-review-source-set-audit.mjs) — Phase A·B
- [`hff-ko-function-human-review-queue-build.mjs`](../../apps/api-server/src/scripts/hff-ko-function-human-review-queue-build.mjs) — Phase C·D·E
- [`hff-ko-function-human-review-quality-samples.mjs`](../../apps/api-server/src/scripts/hff-ko-function-human-review-quality-samples.mjs) — Phase F

**데이터** (`apps/api-server/src/scripts/data/`)
`hff-ko-function-human-review-source-set-audit-v1.json` · `-overlap-audit-v1.json` · `-reason-normalization-v1.json` · `-current-db-audit-v1.json` · `-queue-v1.jsonl` · `-queue-summary-v1.json` · `-stale-resolved-v1.jsonl` (빈 파일) · `-anomalies-v1.json` (빈 배열) · `-quality-samples-v1.json` · `-db-unchanged-v1.json`

---

## 12. 후속 권고

1. **샤드 권고: 8샤드** (샤드당 약 482건). 우선순위 혼재를 피하려면 P1 2,252 를 5샤드, P3 1,457 을 3샤드로 나누고 P2 149 는 P1 샤드 말미에 붙이는 편이 검토 리듬이 일정하다.
2. 다음 WO 권고: **P1 중 `SOURCE_LINE_BREAK_FRAGMENTED` 2건 + `MALFORMED_BRACKET` 45건 = 47건**을 첫 파일럿으로 처리한다. 원문 줄바꿈·괄호 파손은 판정 기준이 명확해 사람 검토 규칙을 조기에 고정할 수 있고, 결과가 나머지 P1 2,205건(경계 불명확)의 판정 지침이 된다.
3. `UNSUPPORTED_RENDERER_STRUCTURE` 68건은 canonical 구조 자체가 기능성 컨테이너를 갖지 않으므로, 사람 검토가 아니라 **renderer 계약 확장 WO** 로 분리하는 편이 맞다.
