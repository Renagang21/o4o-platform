# CHECK-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1

WO: `WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1`
실행일: 2026-07-31 · 브랜치 `main` · 착수 HEAD `2413eae30` · 기준 commit `2cf6cd38a` (조상 관계 확인됨)
판정: **PASS** — Track A 26건 canonical 갱신 완료 · Track B INSERT 0 · 독립검증 PASS

> 건강기능식품·의약품·의료기기 등 설명서의 조사, 작성, 번역, 디자인, 검증, 저장, canonical 생산 범위를 축소하거나 제한하지 않는다.
> 공식 질환명·증상명·기능성·전문용어도 근거가 있는 경우 그대로 보존한다.

---

## 1. 모집단 재구성 (§5 번역 제외 게이트)

과거 보고 수치를 그대로 쓰지 않고 v3 큐·Agent 9 manifest·현재 DB 로 재구성했다.

| 항목 | 수 |
|------|---:|
| v3 최종 검토 큐 전체 | 1,037 |
| 번역 대상 제외 (EN) | 824 (`NO_OFFICIAL_EN_GROUNDING` 819 · `PARTIAL_EN_GROUNDING` 5) |
| **Track A — KO 비번역 잔여** | **213** |
| **Track B — Agent 9 HOLD** | **348** |
| 비번역 모집단 합계 | **561** |

게이트 결과: `language='en'` 혼입 0 · canonicalId 중복 0 · Track A ↔ Track B 공유 master 0 · DB 미존재/링크 오류 0.
EN 짝 없는 KO 25,415 및 EN 기능성 HOLD 824 는 **이번 WO 에서 일절 건드리지 않았다** (§17 에서 불변 확인).

산출: `hff-ko-nontranslation-population-v1.json`

---

## 2. Track A — KO 잔여 213 재판정 (§6~§9)

### 2-1. 원인 확정

큐의 HOLD 사유(`AMBIGUOUS_*`, `SOURCE_REPAIR_REQUIRED`)를 그대로 믿지 않고 현재 DB 로 전건 재현했다.
지배적 원인은 **판독 불가능한 모호성이 아니라 파서가 처리하지 못한 라벨 형태**였다.

- 동결된 segmenter V2 는 `[원료]` 대괄호 구간만 region header 로 승격한다.
- 실제 공식 원문에는 `원료 : 절` (콜론 뒤 공백 없음) · 라벨 단독 행 · 대괄호 손상(`[X[`, `[X][`, `X]`) 형태가 존재한다.
- 이 경우 원료 귀속이 소실돼 `MISSING_CLAUSE_WITHOUT_INGREDIENT_LABEL` / `INSERT_CLAUSE_CARRIES_INLINE_LABEL` 로 떨어졌다.

신규 파서 `hff-ko-official-label-parser.mjs` 를 추가했다 (segmenter V2 는 **미변경 · 동결 유지**).

| 기능 | 계약 |
|------|------|
| `repairBrackets` | `[`·`]` 문자만 편집. 본문 바이트 동일(`bodyOnly` 검사) · 규칙 미적용 또는 미완전 복구 시 **실패 처리** |
| `normalizeColonLabels` | 행 머리의 라벨부에만 공백 1칸 삽입. 기능성 절 바이트 불변 |
| `stripMarker` | `①` `(1)` `2)` `-` 등 열거 마커 제거 (라벨·절 양쪽) |
| `splitEnumeratedClause` | 모든 조각이 8자 이상 + 기능성 술어로 끝날 때만 쉼표 분할 |
| `parseOfficialGroups` | 대괄호 경로는 `blocks`(header↔items) 로 귀속. 콜론·단독행 경로만 순차 walk |

### 2-2. 재판정 결과 (213건)

| finalStatus | 수 |
|-------------|---:|
| `RESOLVED_UPDATED` | **26** |
| `RESOLVED_NO_CHANGE` (이미 해결됨) | 12 |
| `HOLD_AMBIGUOUS_FUNCTION_BOUNDARY` | 67 |
| `HOLD_UNSUPPORTED_RENDERER_STRUCTURE` | 53 |
| `HOLD_AMBIGUOUS_INGREDIENT_OWNERSHIP` | 49 |
| `HOLD_CANONICAL_STRUCTURE_UNSAFE` | 4 |
| `HOLD_SOURCE_REPAIR_REQUIRED` | 2 |
| 합계 | 213 |

- renderer family: COMPOSITE 191 / DRIVER 22 · **family 판정 근거 불일치 0** (§7 우선순위: 감사 산출물 → h2 signal → lane 메타 → DOM)
- 라벨 형태: `BRACKET` 18 · `REPAIRED_BRACKET` 7 · `COLON` 1
- 삽입 절 2 + 신설 카드 절 114 = **복원·생성한 기능성 절 116** · 신설 카드 49 · byte delta +5,406

`HOLD_UNSUPPORTED_RENDERER_STRUCTURE` 53건은 현재 canonical 이 라벨 없는 평면 목록(`sd-why`) family 다.
원료 라벨 구조(`sd-func`)로 바꾸는 것은 **문서에 새 class 를 도입하는 구조 재작성**이라 삽입 전용 계약 밖이므로 HOLD 로 남겼다.

### 2-3. 작업 중 잡은 실제 결함 2건

| 결함 | 증상 | 조치 |
|------|------|------|
| **원료 간 정보 혼입** | 대괄호 복구 성공 후에도 그룹이 1개로 뭉쳐, 올리브잎 혈압 조절 절이 바나바잎에 귀속 (`c981688c`) | segmenter 가 대괄호 LABEL 을 **앞쪽에 일괄 push** 하므로 순차 walk 가 무효. `blocks` 기반 귀속으로 전환 |
| **기능성 중복 삽입** | canonical 에 이미 6개 절이 있는데 열거 마커(`2)…`) 때문에 coverage 미탐지 → 중복 생성 직전 (`817f88a7`) | `stripMarker` 를 라벨·절 양쪽에 적용하고 포함 검사보다 앞에 배치. 해당 건은 `RESOLVED_NO_CHANGE` 로 정정 |

두 결함 모두 **apply 전** 에 잡혔다. 적용 전 계획 26건은 전량 사람이 확인했다 (§13 ≤100 전량 검토).

산출: `hff-ko-review-residual-decisions-v1.json` · `hff-ko-nontranslation-safe-targets-v1.json` · `hff-ko-nontranslation-rollback-v1.json`

---

## 3. Track B — Agent 9 HOLD 348 재판정 (§10~§12)

과거 HOLD 사유를 유지하지 않고 현재 DB·공식 필드로 전건 재측정했다.

| finalStatus | 수 |
|-------------|---:|
| `HOLD_NO_INTAKE_DATA` | 314 |
| `HOLD_NO_FUNCTIONAL_DATA` | 29 |
| `HOLD_PRODUCTMASTER_UNCLEAR` | 5 |
| `CANONICAL_CREATED` | **0** |
| `RESOLVED_EXISTING` | 0 |

공식 필드 커버리지: `MAIN_FNCTN` 319 · `SRV_USE` 34 · `INTAKE_HINT1` 340 · `BASE_STANDARD` 348.

- **`productMasterLinked` 0** — 348건 전부 `matched_product_master_id` 가 비어 있다.
  §11 은 CANONICAL_CREATED 전제로 "ProductMaster 단일 확정"을 요구하고 §15 는 Track B 허용 write 를
  신규 `STORE / ko / canonical` 행으로 한정하므로, ProductMaster 생성·후보 승격은 이번 WO 의 허용 범위 밖이다.
  따라서 생성 0 은 정상 결과이며 전량 FINAL_HOLD 다.
- **`originalReasonResolvedByNewData` 5** — 원래 `HINT_UNDER_EXTRACTION` 이던 5건은 `INTAKE_HINT1` 이 채워져
  기존 사유가 더는 성립하지 않는다. `INTAKE_HINT1` 공백만으로 HOLD 하지 않는다는 §11 에 따라 사유를 재산출했고,
  ProductMaster 미연결로 `HOLD_PRODUCTMASTER_UNCLEAR` 가 됐다.
- `contractReadyIfMasterLinked` 5 — master 만 연결되면 §12 계약(기능성+섭취방법)을 충족한다.

### 공백 판정 주의 (재발 방지)

Postgres `btrim()` 기본값은 **공백만** 제거한다. 원천 `MAIN_FNCTN` 에 `"\r\n"` 만 든 행이 21건 있어
`btrim(x)=''` 로 세면 기능성 없음이 과소 계상된다. JS `trim()` 과 동일해지려면 `btrim(x, E' \t\r\n')` 를 써야 한다.
(과거 "전체 HFF 후보 중 MAIN_FNCTN 공백 8건" 관측과 "348 중 29건" 이 어긋나 보였던 원인이 이것이다.)

산출: `hff-agent9-hold-reconciliation-v1.json`

---

## 4. 렌더 검증 (§14) — PASS

Track A SAFE 26건을 before/after 로 전량 렌더했다. 래퍼 `<div class="store-desc-content">` · 폭 430 / 820 / 1280.

| 항목 | 결과 |
|------|------|
| PASS / FAIL | **26 / 0** |
| 기능성 절 손실 | 0 |
| 원료 라벨 손실 | 0 |
| 추가된 (라벨→절) 쌍 | 116 = 계획 116 |
| 원문 밖 기능성 추가 | 0 (전량 `MAIN_FNCTN` verbatim 포함 확인) |
| 원료 간 혼입 | 0 |
| overflow · clipping · 빈 h2/ul/li/section | 0 |
| h2 순서 변화 · 폭 간 결과 불일치 | 0 |
| 전문가 안내 누락 | 0 |

computed style: `.sd-card max-width` none → **860px** · `.sd-card border-radius` 0 → **20px** ·
`.sd-hero padding` 적용(430: `28px 22px 24px`, 820/1280: `40px 34px 32px`) · `.sd-badge border-radius` 0 → 적용.

**판정 기준 정정 1건**: 초기 실행에서 2건이 FAIL 로 나왔으나 둘 다 감사 로직의 오탐이었다.

- `9763985b` — `rawBracket` 검출. 해당 대괄호는 **before 에도 동일하게 존재**하는 `섭취 시 참고사항`(공식 `INTAKE_HINT1`) 원문이며 §9 상 수정 금지 대상이다. 레이아웃 검사를 before 대비 **악화 여부**로 바꿨다.
- `0551b32e` — `ingredientMixing` 2. 기존 카드 삽입(`INSERT_CLAUSE`) 대상 라벨을 허용 목록에 넣지 않은 누락. §9 의 두 허용 연산(신설·삽입) 라벨을 모두 허용하도록 수정.

산출: `hff-ko-nontranslation-render-audit-v1.json`

---

## 5. Apply (§15)

이중 게이트: `--apply` + `HFF_KO_NONTRANSLATION_APPLY_CONFIRM=YES`.
사전 게이트 11개(렌더 PASS · canonicalId/statementNo 유일 · afterHash 일치 · 변경 실재 · 삽입 전용 · Track B INSERT 0) 통과.

행별 계약:

```sql
UPDATE shared_product_descriptions
   SET content = $1, updated_at = now()
 WHERE id = $2 AND master_id = $3
   AND source_type='o4o_hff_generated' AND description_type='STORE'
   AND status='canonical' AND deleted_at IS NULL AND coalesce(language,'ko')='ko'
   AND encode(sha256(convert_to(content,'UTF8')),'hex') = $4
RETURNING id
```

| 항목 | expected | actual |
|------|---:|---:|
| Track A UPDATE | 26 | **26** |
| Track A FINAL_HOLD | 0 | 0 |
| Track B INSERT | 0 | **0** |

`rowCount = 1` 전건 충족 · 트랜잭션 내 sha256 전량 재검증 통과 · **rollback 없음**.

산출: `hff-ko-nontranslation-apply-results-v1.json`

---

## 6. 독립 검증 (§17) — PASS

apply 스크립트 보고를 신뢰하지 않고 별도 read-only 세션에서 현재 DB 만으로 재측정했다.
기준선은 직전 WO 독립검증(`hff-wo-independent-verification-v1.json`)의 확정 수치다.

| 검사 | expected | actual | 결과 |
|------|---:|---:|:---:|
| HFF canonical 전체 row 불변 | 56,411 | 56,411 | PASS |
| HFF KO canonical 불변 | 40,913 | 40,913 | PASS |
| HFF EN canonical 불변 | 15,498 | 15,498 | PASS |
| EN 짝 없는 KO 모집단 불변 | 25,415 | 25,415 | PASS |
| 기존 canonical UPDATE 수 | 26 | 26 | PASS |
| 신규 KO canonical 수 | 0 | 0 | PASS |
| Track B canonical 생성 | 0 | 0 | PASS |
| Agent 9 사유별 결과 일치 | 348 | 348 | PASS |
| manifest 밖 write | 0 | 0 | PASS |
| EN canonical 변경 | 0 | 0 | PASS |
| canonical 중복(master×type×language) | 0 | 0 | PASS |
| 비기능성 drift | 0 | 0 | PASS |
| 공식 기능성 절 삭제 | 0 | 0 | PASS |
| 최종 큐 중복키 | 0 | 0 | PASS |
| 최종 큐 KO 행 DB 존재 | 175 | 175 | PASS |
| 최종 큐 Agent 9 행 canonical 부재 | 348 | 348 | PASS |

비기능성 drift 증명: 현재 content 가 `afterHash` 와 일치하고, 첫 삽입 지점 앞·마지막 삽입 지점 뒤가 원본과 **바이트 동일**함을 확인했다 (단일 삽입 25건은 전체가 삽입만으로 설명됨).

`shared_product_descriptions` 전체 row 는 기준선 대비 +22 이나, 기준선 시각 이후 생성된 행 중 `source_type='o4o_hff_generated'` 는 **0** 이다. 증분은 전부 타 세션의 비-HFF 작업이며 이번 WO 의 write 창 안에도 없다.

산출: `hff-ko-nontranslation-independent-verification-v1.json`

---

## 7. 최종 비번역 HOLD 큐 (§16)

`hff-ko-nontranslation-final-hold-v1.jsonl` — **523행** (KO 검토 잔여 175 + Agent 9 348).
Agent 9 행은 canonicalId 가 없어 `candidateId + statementNo` 를 기본키로 쓴다. 중복키 0 · canonicalId 중복 0 · **EN 관련 행 0**.

| holdReason | 수 | 다음 조치 |
|------------|---:|-----------|
| `NO_INTAKE_DATA` | 314 | 공식 `SRV_USE` 갱신 후 재판정. 외부 일반 정보로 보완하지 않는다 |
| `AMBIGUOUS_FUNCTION_BOUNDARY` | 67 | 사람이 기능성 절 경계 확정 |
| `UNSUPPORTED_RENDERER_STRUCTURE` | 53 | 평면(`sd-why`) → 라벨 구조 전환은 별도 renderer 구조 WO |
| `AMBIGUOUS_INGREDIENT_OWNERSHIP` | 49 | 사람이 원료 귀속 확정 |
| `NO_FUNCTIONAL_DATA` | 29 | 공식 `MAIN_FNCTN` 갱신 후 재판정 |
| `PRODUCTMASTER_UNCLEAR` | 5 | 후보 매칭·승격 선행 (5건 모두 기능성·섭취방법 확보 완료) |
| `CANONICAL_STRUCTURE_UNSAFE` | 4 | canonical 기능성 섹션 구조 재설계 WO |
| `SOURCE_REPAIR_REQUIRED` | 2 | 원천 ETL 단계 손상 복구 (자동 보정 불가) |

산출: `hff-ko-nontranslation-final-hold-v1.jsonl` · `hff-ko-nontranslation-final-hold-summary-v1.json`

---

## 8. 번역 채팅방으로 넘길 대상 (이번 WO 미변경 확인)

| 대상 | 수 | 현재 상태 |
|------|---:|-----------|
| EN 기능성 HOLD | 824 | 미변경 (EN canonical 15,498 불변 · EN 행 write 0) |
| EN 짝 없는 KO | 25,415 | 미변경 |
| 기타 KO→EN 번역·영문 디자인 | — | 착수하지 않음 |

KO→EN 번역 0 · EN 문구 생성 0.

---

## 9. 산출물

| 파일 | 내용 |
|------|------|
| [hff-ko-nontranslation-population-v1.json](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-population-v1.json) | 비번역 모집단 재구성 |
| [hff-ko-review-residual-decisions-v1.json](../../apps/api-server/src/scripts/data/hff-ko-review-residual-decisions-v1.json) | Track A 213건 재판정 |
| [hff-agent9-hold-reconciliation-v1.json](../../apps/api-server/src/scripts/data/hff-agent9-hold-reconciliation-v1.json) | Track B 348건 재판정 |
| [hff-ko-nontranslation-safe-targets-v1.json](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-safe-targets-v1.json) | SAFE 26건 패치 계획 |
| [hff-ko-nontranslation-rollback-v1.json](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-rollback-v1.json) | 복원 manifest |
| [hff-ko-nontranslation-render-audit-v1.json](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-render-audit-v1.json) | 렌더 감사 |
| [hff-ko-nontranslation-apply-results-v1.json](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-apply-results-v1.json) | 적용 결과 |
| [hff-ko-nontranslation-independent-verification-v1.json](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-independent-verification-v1.json) | 독립 검증 |
| [hff-ko-nontranslation-final-hold-v1.jsonl](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-final-hold-v1.jsonl) | 최종 비번역 HOLD 큐 523행 |
| [hff-ko-nontranslation-final-hold-summary-v1.json](../../apps/api-server/src/scripts/data/hff-ko-nontranslation-final-hold-summary-v1.json) | 큐 요약 |

스크립트: `hff-ko-official-label-parser.mjs` · `hff-ko-nontranslation-population.mjs` · `hff-ko-nontranslation-build.mjs` ·
`hff-agent9-hold-reconciliation.mjs` · `hff-ko-nontranslation-render-audit.mjs` · `hff-ko-nontranslation-apply.mjs` ·
`hff-ko-nontranslation-final-hold.mjs` · `hff-ko-nontranslation-independent-verification.mjs`

임시 조사·디버그 스크립트는 종료 전 삭제했다. 원본 큐·이전 manifest·기존 CHECK 는 수정하지 않았다.
동결 자산(`hff-ko-function-clause-segmenter-v2.mjs` · `hff-ko-function-family-preserving-patch.mjs`)은 **읽기만** 했다.
