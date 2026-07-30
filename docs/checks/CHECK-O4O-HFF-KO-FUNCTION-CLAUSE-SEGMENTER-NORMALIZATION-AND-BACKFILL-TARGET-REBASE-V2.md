# CHECK — WO-O4O-HFF-KO-FUNCTION-CLAUSE-SEGMENTER-NORMALIZATION-AND-BACKFILL-TARGET-REBASE-V2

> HFF `MAIN_FNCTN` 기능성 절 분절 정규화 + 전량 41,261건 재분석 → 후속 canonical backfill 대상 재확정.
> **이번 WO 는 분석·검증 전용이다. DB write 0 / canonical INSERT·UPDATE·DELETE 0 / 생산 parser 반영 0.**

| 항목 | 값 |
|------|-----|
| 판정 | **PASS** |
| 기준 commit | `749152cfc` (선행 `8e154e3f3` 포함) |
| 모집단 | 41,261 (CREATED 25,074 / SKIPPED_EXISTING 15,839 / HOLD_FOR_AGENT_9 348) |
| DB 접근 | read-only 전용 (`SET default_transaction_read_only = on`, 전 세션 해제 없음) |
| 생산 driver | `hff-ko-agent-01-individual.mjs` **무변경** |
| 제안 patch | 파일로만 산출. 적용 0 |

---

## 1. 결론 요약

| 구분 | 수량 | 산출물 |
|------|-----:|--------|
| 안전 backfill 대상 (CREATED) | **5,269** | `hff-ko-function-backfill-created-safe-targets-v2.json` |
| 안전 backfill 대상 (SKIPPED_EXISTING, 별도 집합) | **2,451** | `hff-ko-function-backfill-skipped-existing-safe-targets-v2.json` |
| 사람 검토 대상 | **3,652** (CREATED 2,808 / SKIPPED_EXISTING 844) | `hff-ko-function-backfill-human-review-targets-v2.json` |
| 무변경 | **29,889** (순수 무변경 29,537 + Agent 9 HOLD 348 + 비렌더 HOLD 4) | `hff-ko-function-backfill-no-change-targets-v2.json` |
| 합계 | 5,269 + 2,451 + 3,652 + 29,889 = **41,261** | — |

§22 준수: CREATED 대상과 SKIPPED_EXISTING 대상은 **서로 다른 manifest** 로 분리했고 혼합하지 않았다.
§17 준수: Agent 9 HOLD 348 은 분석만 수행하고 backfill 대상에서 제외했다(무변경 manifest 에 `HOLD_FOR_AGENT_9_EXCLUDED_FROM_BACKFILL` 사유로 기록).

---

## 2. 원문 형식 인벤토리 (전량 41,261)

| 패턴 | 수량 |
|------|-----:|
| UNLABELED_ONLY | 23,492 |
| LABELED_ONLY | 17,513 |
| MIXED_LABELED_AND_UNLABELED | 218 |
| EMPTY | 29 |
| UNCLASSIFIED | 9 |

주요 형식 특성: 원문 마커 `①~⑳` 22,132 · 다줄 26,649 · 중간점 8,710 · `(1)` 계열 4,582 · 글머리기호 2,736 · 인정번호 라벨 1,033 · **영문 병기 1,968** · 영문 단독 라인 214 · **40자 초과 라벨 137** · **균종 약어 47** · 한글 순서 마커 14 · 불완전 대괄호 99.

라벨 길이 실측(`hff-ko-function-label-length-audit-v2.json`): 총 71,704 occurrence / 고유 1,036 / median 4 / p99 26 / **max 68** / 40자 초과 139 · 60자 초과 11 · 80자 초과 0.
→ **기존 `{1,40}` 상한을 임의 숫자로 바꾸지 않았다(§8).** 대괄호 여닫힘 균형 + 구조 조건(절 시작 위치 / 직후 마커 / 원료명 형태 + 같은 줄 본문)으로 라벨을 인식한다.

균종 약어(`hff-ko-function-species-abbreviation-audit-v2.json`): 실제 약어는 `L.` `B.` `R.` `P.` 4종. `대문자 1글자 + .` 을 무조건 보호하지 않고 **뒤따르는 소문자 종명(3자 이상) 문맥**을 함께 요구한다(§10).

---

## 3. 8개 작업 항목 처리

| # | 항목 | 처리 |
|---|------|------|
| ① | 긴 `[원료명]` 라벨 오인 | 길이 상한 미변경. 여닫힘 균형 span + 3개 구조 조건. 중첩 대괄호는 최외곽 1 span. **68자 라벨까지 LABEL/HIGH 인식** |
| ② | `L.`/`B.`/`S.` period 오분절 | 소문자 종명 문맥 조건부 sentinel 보호. 표제부 판정에서도 약어 period 를 문장 종결로 보지 않음 |
| ③ | `(1)`/`①`/`가.`/글머리/복합 구분자 | `①~⑳` `⑴~⑽` `(1)` `(가)` `가.` `1)` 인식. **`·` 는 단독 절 구분자로 쓰지 않음** (원료명·복합명 내부 문자와 구분 불가 — §11). 조건·단서 대괄호(`[1) (2) (다)의 제조방법에 한함]`)는 마스킹해 절 내부에 보존 |
| ④ | 영문 병기 정책 | A) ko + `(영문)` → ko 만 저장, 영문은 `ENGLISH_PARALLEL` 메타데이터(1,715건, `hff-ko-function-english-parallel-metadata-v2.json`). B) 영문 단독 → 자동 번역·삭제 0, `ENGLISH_ONLY_REVIEW` 로 사람 검토(252건). C) 라벨 내부 영문은 병기로 분류하지 않음 |
| ⑤ | 제품형태·원료명·인정번호 라인 | `FORM_OR_INGREDIENT` / `NOTICE_OR_METADATA` 로 분리. 대괄호 없는 `원료명 : 절` 표제는 콜론 구조 + 표제부 서술어 부재 + 본문 서술어 존재로 판정 |
| ⑥ | 감사 비교기 인공물 | 선행 `]` `.` · 마커 · 언어 표기 파편(`(국문) (`)을 비교키에서 제거. **비교 정규화와 렌더 정규화를 분리** — 원문 출력에서 문장부호를 삭제하지 않는다(§14) |
| ⑦ | 전량 41,261 before/after 회귀 | 완료. §21 게이트 12종 전량 0 |
| ⑧ | backfill 대상·사람 검토 대상 재확정 | 완료(위 §1 표) |

---

## 4. fixture — 23/23 PASS

`hff-ko-function-clause-segmenter-fixtures-v2.json` (원문 `mainFunctionSource` 와 기대값 `expect` 포함 — 후속 WO 가 임시 스크립트 없이 재실행 가능).

10종 zero-check 전량 0: `OFFICIAL_KO_CLAUSE_DELETED` `FABRICATED_CLAUSE` `LABEL_RENDERED_AS_CLAUSE` `SPECIES_ABBREV_MISSPLIT` `ENGLISH_IN_KO_STORE_ITEMS` `NON_FUNCTION_AREA_CHANGED` `CROSS_PRODUCT_CONTAMINATION` `OFFICIAL_REPETITION_DEDUPED` `RENDER_FAILURE` `UNRESOLVED_AUTO_SAVED`.

핵심 fixture: F04 68자 라벨 · F21 `과채유래유산균(L.plantarum CJLP133)(제2013-11호) : (국문) …` 표제 분리 · F22 여는 대괄호 유실 라벨(`비타민C] …`) 복원 · F23 원문 절단 절(`③혈소판 응집 억제를 통한 혈액흐름에`)은 **삭제하지 않고 저장 + 자동 대상 제외**(§12).

---

## 5. 전량 회귀 (`hff-ko-function-clause-full-regression-v2.json`)

총계 41,261 / 버킷 합계 일치 / `HOLD->HOLD 352` · `CREATE->CREATE 40,909` / HOLD 분석 348.

| 변경 분류 | 수량 |
|-----------|-----:|
| UNCHANGED | 29,537 |
| SAFE_SEGMENTATION_REPAIR | 6,704 |
| HUMAN_REVIEW_REQUIRED | 3,652 |
| SAFE_ENGLISH_PARALLEL_EXCLUSION | 830 |
| NON_FUNCTIONAL_ONLY_CHANGE | 117 |
| SAFE_FUNCTION_RESTORE | 69 |
| NON_RENDER_HOLD_* (기능성/섭취 원문 부재) | 352 |
| 변경 제품 총계 | **11,372** (`hff-ko-function-clause-changed-products-v2.jsonl`) |

### §21 게이트 — 12종 전량 0

`RENDER_FAILURE 0` · `UNEXPECTED_CHANGE 0` · `NON_FUNC_AREA_BYTE_CHANGED 0` · `SRV_USE_DRIFT 0` · `INTAKE_HINT_DRIFT 0` · `FOOTER_DRIFT 0` · `PRODUCT_NAME_DRIFT 0` · `CLASS_STRUCTURE_DRIFT 0` · `CROSS_PRODUCT_CONTAMINATION 0` · `FABRICATED_KO_CLAUSE 0` · `OFFICIAL_KO_CLAUSE_DELETED 0` · `OFFICIAL_REPETITION_DEDUPED 0`.

### 설명된 진단 1종 (게이트 아님)

`SOURCE_LINE_BREAK_FRAGMENTED 2` — 원문이 단어 중간에서 개행된 제품(`…감소에 도` + `움을 줌`)에서 동일 문구 복본 1건이 두 조각으로 남는 경우. **원문 전량이 segments 에 보존되고**, 해당 제품은 사람 검토로 분류된다. 자동 dedupe 가 아니며, 단어 중간 결합 heuristic 은 의도적으로 도입하지 않았다(원문 훼손 위험). 대상: `201000190041434 뼈앤칼마디`, `201000190041442 The K2칼마디채움`.

---

## 6. 수동 표본 60건 (§24) — PASS

`hff-ko-function-clause-quality-samples-v2.json` · 원자료 `hff-ko-function-clause-manual-sample-review-v2.jsonl`.
6 범주 × 10건: 긴 라벨 / 균종 약어 / 혼합형 / `(1)`·①·가. 마커 / 영문 병기 / 제품형태·원료명 경계. 자동 검사 실패 0.

**검토 중 실제 결함 2건 발견 → 수정 후 fixture 고정:**
1. `200400150831397` — 원문에서 여는 대괄호가 유실된 선행 라벨(`비타민C]`)이 기능성 절 안에 잔존 → LABEL 복원 규칙(F22).
2. `2004001503939` — 원문 자체가 조사로 절단된 절이 HIGH 로 자동 대상에 포함 → LOW 강등(텍스트 보존, 자동 차단, 사람 검토 유도)(F23).

원문 오타(`탄후화물`, `체네 에너지`)·원문 중복·공식 등급 표기(`(생리활성기능 2등급)`, `(기타II 등급)`)는 임의 교정·삭제하지 않고 그대로 보존했다.

---

## 7. 렌더 검증 34건 × 3폭 (§25) — PASS · violations 0

`hff-ko-function-clause-render-audit-v2.json`. CSS 는 `packages/content-editor/src/components/ContentRenderer.tsx` 의 `storeDescriptionCss` **원문 추출(수정 없음)**, wrapper `<div class="store-desc-content">`.

| 속성 | 430 | 820 | 1280 |
|------|-----|-----|------|
| `.sd-card` max-width | 860px | 860px | 860px |
| `.sd-card` border-radius | 20px | 20px | 20px |
| `.sd-hero` padding | 28px 22px 24px | 40px 34px 32px | 40px 34px 32px |
| `.sd-badge` border-radius | 999px | 999px | 999px |

카드 넘침 0 · 루트 가로 스크롤 0 · 빈 `.sd-why li` 0 · raw 태그 노출 0 · 구조 결손 0. `sd-hero` padding 차이는 `@container (min-width:640px)` 규칙에 따른 정상 전환이다. **제안 출력만 렌더했고 DB 콘텐츠는 변경하지 않았다.**

---

## 8. V1 대조 (§19·§20)

`hff-ko-function-clause-human-review-analysis-v2.json` → `v1Reconciliation`.

| V1 기준선 | V1 | V2 |
|-----------|---:|---:|
| 누락 제품 | 118 | 해당 118 중 116 이 V2 변경 대상 |
| 변경 가능(CREATED) | 227 | 227 **전량** V2 에서도 변경 대상 (누락 0) |
| 혼합형 복원 대상 | 98 | — |
| SKIPPED_EXISTING 변경 | 54 | 3,295 (별도 집합) |
| 모집단 | 281 | 41,261 |
| 사람 검토 | 124 | 3,652 |

- V1 은 혼합형 무라벨 블록 누락 **1개 원인 · 모집단 281건**만 다뤘고, V2 는 8개 원인을 **전량 41,261건**에 적용했다. 변경 제품이 227 → 11,372 로 늘어나는 것은 정상이다(§30 — 중단 사유 아님).
- V1 118 중 V2 무변경 2건(`200400170211365 니아르 포스콜린 에스케어`, `2019001634047 블랙진생 콜레스테롤케어`)은 **현재 BEFORE 렌더에 원문 공식 기능성 절이 이미 전부 포함**되어 복원할 절이 없다. V1 비교기의 선행 `]`·`.` 인공물(작업 항목 ⑥)로 인한 과대 검출이며 공식 절 삭제가 아니다(`OFFICIAL_KO_CLAUSE_DELETED 0`).
- **V2 수치를 V1 수치에 맞추지 않았다(§20).**

---

## 9. 사람 검토 대상 분석 (3,652)

| 사유 | 수량 |
|------|-----:|
| UNRESOLVED_SEGMENT_PRESENT | 2,729 |
| ENGLISH_ONLY_CLAUSE | 252 |
| LABEL_ISSUE:UNCLOSED_BRACKET | 33 |
| LABEL_ISSUE:ORPHAN_CLOSE_BRACKET | 10 |
| LABEL_ISSUE:ENGLISH_CLAIM_IN_BRACKET | 2 |
| SOURCE_LINE_BREAK_FRAGMENTED | 2 |

권고 조치: `MANUAL_SEGMENT_CONFIRMATION` 2,729 / `MANUAL_CLASSIFICATION_CONFIRMATION` 923. 전량 `status = PENDING_REVIEW`.
**불확실한 절은 삭제하지 않고 전부 사람 검토로 보냈다(§12).**

---

## 10. 제안 patch (§27) — 적용하지 않음

`apps/api-server/src/scripts/data/hff-ko-function-clause-segmenter-normalization-v2-proposed.patch`

구성 2파일:
1. **신규** `apps/api-server/src/scripts/hff-ko-function-clause-segmenter-v2.mjs` — 검증된 V2 분절 규칙. `createSegmenter({ norm, flat })` 의존성 주입형(순환 import 없음, 정규화 계약 이중 정의 없음).
2. **수정** `apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs` — import 1줄 · 팩토리 1줄 · `extractFunctions` → `extractFunctionsV2` 호출 1줄 · 라벨 없는 제품의 평면 `sd-why` 경로 유지 조건 1개. **그 외 렌더·저장·트랜잭션 로직은 손대지 않는다.**

### 적용 방법

```bash
git apply --check apps/api-server/src/scripts/data/hff-ko-function-clause-segmenter-normalization-v2-proposed.patch
git apply       apps/api-server/src/scripts/data/hff-ko-function-clause-segmenter-normalization-v2-proposed.patch
```

`git apply --check` **exit 0 확인 완료**(본 WO 에서 실제 적용은 하지 않음).

### fixture 실행 방법

적용 WO 에서는 `hff-ko-function-clause-segmenter-fixtures-v2.json` 의 각 원소(`mainFunctionSource` + `expect`)를 신규 모듈의 `createSegmenter({norm, flat}).analyzeFunctions()` 에 대해 재실행하고, 23건 전량 PASS + 10종 zero-check 0 을 재확인한다. 기대값 필드는 `pattern` `items` `labels` `form` `english` `review` `auto` `labelIssue` `mustEqual` `mustContain` 이다.

### 등가성 검증

제안 모듈 vs 본 WO 에서 검증된 분석용 segmenter — fixture 23 + 수동 표본 60 + 안전 대상 1,000 + 사람 검토 1,000 = **2,083 케이스에서 mismatch 0 (EQUIVALENT)**. 비교 항목: pattern / storeItems / englishParallel / labelIssues / unresolvedCount / segments / blocks / autoEligible / adapter 반환 형태.

### 범위 밖(patch 미포함)

공용 renderer·CSS / `MARKER_LEAD` 공용 정비 / 기능성 문장 의미 재작성 / 동일 기능성 자동 dedupe / 영문 자동 번역 / `SRV_USE`·`INTAKE_HINT1`·제품명·footer·디자인 구조 / 무관한 리팩터링.

---

## 11. DB write 0 증빙 (§29)

`hff-ko-function-clause-db-invariance-v2.json` — 동일 측정 7종을 BEFORE/AFTER 두 시점에 수집.

| 측정 | 값 |
|------|-----|
| `transaction_read_only` | **on** (전 세션, 해제 없음) |
| m1 전체 STORE/ko canonical | 63,321 |
| m2 HFF canonical 보유 | 40,913 |
| m3 HFF canonical content 집합 해시 | `fe156c6c164b26382c959794c963b55b` |
| m4 candidate 수 / 상태 | 41,261 / `approved_new_master 40,913` + `pending 348` |
| m5 ProductMaster 연결 | 40,913 (distinct 40,913) |
| m6 Agent 9 큐 | 348행 / 348 고유 candidateId / priority [1,2,3] / `agent9Status` 전량 PENDING / 파일 sha256 `10e2c11c…` |
| m7 최종 updated_at 최대값 | canonical `2026-07-29T04:59:37.830Z` · candidate 동일 |

**결과: `BEFORE == AFTER`, `DB diff = []`, `INSERT 0 / UPDATE 0 / DELETE 0`.**
m7 이 본 WO 착수 이전 시각으로 고정되어 있는 것이 write 부재의 직접 증거다.
§23 Agent 9 큐 불변식(행 수 348 / candidateId 집합 / priority / holdReason / 전량 PENDING) 유지 — 본 분석에서 공식 기능성·섭취방법이 발견된 경우에도 **HOLD 를 자동 해제하지 않았다.**

---

## 12. 산출물 (§28) — `apps/api-server/src/scripts/data/`

| 파일 | 내용 |
|------|------|
| `hff-ko-function-clause-source-inventory-v2.json` | 전량 원문 형식 인벤토리 |
| `hff-ko-function-label-length-audit-v2.json` | 라벨 길이 분포 · 40자 초과 목록 |
| `hff-ko-function-species-abbreviation-audit-v2.json` | 균종 약어 실측 |
| `hff-ko-function-clause-segmenter-fixtures-v2.json` | fixture 23건 (원문 + 기대값 + 결과) |
| `hff-ko-function-clause-full-regression-v2.json` | 전량 회귀 + §21 게이트 |
| `hff-ko-function-clause-changed-products-v2.jsonl` | 변경 제품 11,372 상세 |
| `hff-ko-function-clause-human-review-analysis-v2.json` | 사람 검토 분석 + V1 대조 |
| `hff-ko-function-backfill-created-safe-targets-v2.json` | 안전 대상 (CREATED) 5,269 |
| `hff-ko-function-backfill-skipped-existing-safe-targets-v2.json` | 안전 대상 (SKIPPED_EXISTING) 2,451 |
| `hff-ko-function-backfill-human-review-targets-v2.json` | 사람 검토 3,652 |
| `hff-ko-function-backfill-no-change-targets-v2.json` | 무변경 29,889 |
| `hff-ko-function-clause-quality-samples-v2.json` | 수동 표본 60건 검토 |
| `hff-ko-function-clause-render-audit-v2.json` | 렌더 34 × 3폭 |
| `hff-ko-function-clause-segmenter-normalization-v2-proposed.patch` | 제안 patch (미적용) |
| `hff-ko-function-clause-db-invariance-v2.json` | DB write 0 증빙 |
| `hff-ko-function-english-parallel-metadata-v2.json` | 영문 병기 메타데이터 1,715 |
| `hff-ko-function-clause-manual-sample-review-v2.jsonl` | 표본 60건 원자료 |

분석용 임시 스크립트(`tmp-hff-v2-*.mjs`)와 렌더 임시 HTML 은 검증 완료 후 삭제했다. 규칙 전문은 제안 patch 안에 보존되어 있다.

---

## 13. PASS 기준 대조 (§31)

| 기준 | 결과 |
|------|------|
| DB write 0 | ✅ |
| 전체 41,261 분석 완료 | ✅ |
| fixture 전부 PASS | ✅ 23/23 |
| 공식 한국어 기능성 누락 검출 가능 | ✅ SAFE_FUNCTION_RESTORE 69 + SAFE_SEGMENTATION_REPAIR 6,704 |
| 긴 라벨 오인 해결 | ✅ (max 68자까지 LABEL) |
| 균종 약어 오분절 해결 | ✅ `SPECIES_ABBREV_MISSPLIT 0` |
| 영문 병기 정책 적용 | ✅ 병기 1,715 분리 · 자동 번역·삭제 0 |
| 비기능성 라인 분리 | ✅ FORM_OR_INGREDIENT / NOTICE_OR_METADATA |
| 감사 인공물 제거 | ✅ 비교키 정규화(렌더 정규화와 분리) |
| UNEXPECTED_CHANGE 0 / RENDER_FAILURE 0 | ✅ |
| 기능성 외 drift 0 | ✅ 6종 게이트 0 |
| 안전 backfill 대상 확정 | ✅ 5,269 + 2,451 |
| 사람 검토 대상 분리 | ✅ 3,652 |
| CREATED · SKIPPED_EXISTING 분리 | ✅ 별도 manifest |
| 제안 patch 작성 | ✅ (미적용, `--check` 통과) |
| Agent 9 큐 348 불변 | ✅ |

---

## 14. 후속 작업 (본 WO 범위 밖)

1. 안전 backfill 대상 5,269(CREATED) 적용 WO — 이중 게이트 + dry-run + rollback 계약 필요.
2. SKIPPED_EXISTING 2,451 은 기존 canonical 교체 정책 판단이 선행돼야 한다(§22 — 이번 WO 에서 수정하지 않음).
3. 사람 검토 3,652 처리 트랙 — `UNRESOLVED_SEGMENT_PRESENT` 2,729 가 최대 축.
4. 제안 patch 생산 반영 WO — fixture 재실행 + 등가성 재확인 후.
5. Agent 9 HOLD 348 은 기존 트랙 유지(본 WO 가 상태를 변경하지 않음).

---

*WO*: WO-O4O-HFF-KO-FUNCTION-CLAUSE-SEGMENTER-NORMALIZATION-AND-BACKFILL-TARGET-REBASE-V2
*작성*: 2026-07-30
