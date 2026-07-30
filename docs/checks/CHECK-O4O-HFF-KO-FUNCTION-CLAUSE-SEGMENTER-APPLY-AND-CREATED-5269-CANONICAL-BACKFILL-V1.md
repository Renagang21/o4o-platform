# CHECK-O4O-HFF-KO-FUNCTION-CLAUSE-SEGMENTER-APPLY-AND-CREATED-5269-CANONICAL-BACKFILL-V1

> WO: **WO-O4O-HFF-KO-FUNCTION-CLAUSE-SEGMENTER-APPLY-AND-CREATED-5269-CANONICAL-BACKFILL-V1**
> 기준 commit: `292f238d1` · 실행일: 2026-07-30 · 환경: 프로덕션 `o4o-platform-db` / `o4o_platform`
> 판정: **APPLIED · PASS** (Apply 게이트 21/21 · 독립검증 구조 10/10 · 내용 10/10 · 전체 corpus 사후 감사 PASS)

---

## 1. 목표와 범위

| 항목 | 내용 |
|------|------|
| Stage A | V2 전수 감사에서 검증된 **기능성 절 segmenter 수정안을 생산 코드에 최소 반영** |
| Stage B | **CREATED 계열 안전 대상 5,269건**의 기존 `STORE/ko canonical` 만 제한 backfill |
| 이번 WO 제외 | `SKIPPED_EXISTING` 안전 2,451건 · 사람 검토 3,652건 · Agent 9 HOLD 348건 · 영문 설명서 전량 |
| DB write | `shared_product_descriptions.content` + `updated_at` — **5,269 row UPDATE only** (INSERT 0 / DELETE 0) |

모집단 41,261 = CREATED 25,074 / SKIPPED_EXISTING 15,839 / HOLD_FOR_AGENT_9 348.
HFF `STORE/ko` canonical 40,913 · 전체 `STORE/ko` canonical 63,321 (Apply 전후 불변).

---

## 2. 생산 코드 반영 (Stage A)

### 2-1. 변경 파일

| 파일 | 성격 | 변경 |
|------|------|------|
| [hff-ko-agent-01-individual.mjs](../../apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs) | 생산 driver | **4 hunk · +7 / −2** |
| [hff-ko-function-clause-segmenter-v2.mjs](../../apps/api-server/src/scripts/hff-ko-function-clause-segmenter-v2.mjs) | 신규 모듈 | V2 분절 규칙 (`createSegmenter({norm, flat})`) |

### 2-2. diff 요약 (§24)

1. `import { createSegmenter } from './hff-ko-function-clause-segmenter-v2.mjs'`
2. `const { extractFunctionsV2 } = createSegmenter({ norm, flat })` — **정규화 계약(`norm`/`flat`)은 기존 정의를 주입**해 이중 정의하지 않는다
3. `composeKo()` 호출부 `extractFunctions(fnRaw)` → `extractFunctionsV2(fnRaw)`
4. `hasFuncHeader` 가드 — 라벨이 하나도 없는 원문은 기존 평면 `sd-why` 경로 유지 (무라벨 원문에 빈 `sd-tag` 생성 금지)

- 공용 renderer·CSS·`MARKER_LEAD` 공용 정비·무관한 리팩터링 **없음**
- `node --check` 두 파일 모두 통과. 설명서 작업이므로 전체 build 는 §5에 따라 실행하지 않음
- 동일 세션의 타 트랙 WIP(`service-catalog.ts` · `roles.ts` · `security-core/types.ts` · `otc-v4-nr26-*` · `pharmacy-hub-scope.middleware.ts`)은 **조회만 하고 수정·삭제·stash·commit 하지 않음**

### 2-3. 분석 코드 ≡ 생산 코드 등가성

| 증거 | 값 |
|------|-----|
| fixture 23건 재검증 | **23/23 PASS** · `artifactMismatch 0` · 10 zero-check 전부 0 |
| 반영 코드 렌더 vs V2 제안 해시 | 대상 5,269 **불일치 0** · SKIPPED 안전 2,451 **불일치 0** |
| 실제 변경 집합 vs V2 예측 집합 | 11,372 == 11,372 · `changedNotInV2 0` · `v2ChangedButUnchanged 0` |

---

## 3. Apply 전 전수 회귀 (§13·§14)

`hff-ko-function-created-5269-full-regression-v1.json` — 모집단 41,261 전량 BEFORE/AFTER 렌더 비교.

| 분류 | 건수 |
|------|-----:|
| `TARGET_CHANGED` | **5,269** |
| `NON_TARGET_UNCHANGED` | 29,889 |
| `NON_TARGET_CHANGED` | **0** |
| `HUMAN_REVIEW_UNCHANGED` (DB write 0) | 3,652 |
| `SKIPPED_EXISTING_SAFE_DB_UNCHANGED` (렌더는 변하나 이번 WO write 0) | 2,451 |
| `RENDER_FAILURE` | **0** |
| 합계 | 41,261 |

내용 zero-check 13항목 **전부 0** — `OFFICIAL_KO_CLAUSE_DELETED` / `FABRICATED_CLAUSE` / `OFFICIAL_REPETITION_DEDUPED` / `ENGLISH_ONLY_CLAUSE_ADDED` / `NON_FUNCTIONAL_LINE_ADDED` / `CLAUSE_ORDER_CONTAMINATION` / `CROSS_PRODUCT_CONTAMINATION` / `PRODUCT_NAME_DRIFT` / `SRV_USE_DRIFT` / `INTAKE_HINT_DRIFT` / `FOOTER_DRIFT` / `CLASS_STRUCTURE_DRIFT` / `RENDER_FAILURE`.
`HOLD` 352 → 352 · `statusFlip 0`.

### 3-1. 검출기 자체 검증 이력 (거짓 양성 제거)

초기 회귀에서 나온 대량 양성은 전부 **검출기 결함**으로 규명하고 계약을 정밀화했다.

| 초기 값 | 원인 | 조치 |
|---------|------|------|
| `OFFICIAL_KO_CLAUSE_DELETED` 4,277 → 102 → **0** | ① corpus 전역 검사(§14는 대상 한정) ② 선두 마커 미제거 문자열 동등비교 ③ 누락 텍스트가 실제로는 제형(`*오메가 연질캡슐`)·인정번호(`(제 2018-8호)`) | 대상 한정 + `keyOf` 정규화 + segmenter 자체 분류(`EXPLAINED_KIND`) 참조 |
| `OFFICIAL_REPETITION_DEDUPED` 397 → 1,902 → **0** | flatText 부분문자열 계수 (긴 절의 부분문자열이 중복으로 계수) | `FUNCTION_KO` 분절 다중도 vs 렌더 항목 다중도 비교로 전환 |
| `CLAUSE_ORDER_CONTAMINATION` 7,607 → **0** | 반복 텍스트에 대해 `indexOf` 를 0에서 재시작 | cursor 전진 + 원문 유일 등장 절만 위반 판정 |
| 헤더 커버리지 미계수 | 실제 markup 은 `<span class="sd-tag">` (검출기는 `<div>` 가정) | 두 스크립트 모두 교정 후 재실행 |

---

## 4. 표본 품질 검증 (§15)

`hff-ko-function-created-5269-quality-samples-v1.json` — 정렬된 candidateId 기준 결정적 6범주 × 10건 = **60건 전부 PASS**.

| 범주 | 건수 |
|------|-----:|
| `LONG_LABEL` (헤더 20자 이상) | 10 |
| `SPECIES_ABBREV` (`L. plantarum` 류) | 10 |
| `MIXED` (라벨+무라벨 혼재) | 10 |
| `MARKER` | 10 |
| `ENGLISH_PARALLEL` | 10 |
| `FORM_INGREDIENT_BOUNDARY` | 10 |

10 zero-check 전부 0 (`LABEL_RENDERED_AS_CLAUSE` · `SPECIES_ABBREV_MISSPLIT` · `PROPOSED_HASH_MISMATCH` 포함).

수리 의미 실측 예 — `[L. curvatus HY7601와 L. plantarum KY1032…]` 제품은 이전에 탈락했던 **"체지방 감소에 도움을 줄 수 있음"** 을 회복했고, 병기 영문 `May help to reduce body fat` 은 국문 canonical 에서 제외되었으며 종 약어는 오분절되지 않았다.

---

## 5. 실브라우저 렌더 감사 (§16)

`hff-ko-function-created-5269-render-audit-v1.json` — 42 표본 × **430 / 820 / 1280** chromium.

- CSS 는 [ContentRenderer.tsx](../../packages/content-editor/src/components/ContentRenderer.tsx) `storeDescriptionCss` **원문 추출**(수정 없음), wrapper `<div class="store-desc-content">`
- computed style 증명: `sd-card max-width 860px` · `border-radius 20px` · `sd-badge border-radius 999px` · `sd-hero padding` 430px=`28px 22px 24px` / 820·1280px=`40px 34px 32px` (`@container (min-width:640px)` 전환)
- zero-check 9항목 전부 0 — 가로 overflow · 빈 항목/빈 태그 · raw 태그 누출 · 기능성 섹션 누락 · 렌더 오류

---

## 6. Apply 게이트 (§19) — 21/21 `APPLY_ALLOWED`

`hff-ko-function-created-5269-apply-gate-v1.json`. 최종 교집합 8조건 통과 = **5,269 · 제외 0**.
게이트 6번은 최초 20/21 로 실패했다 — §12 분류 합계가 38,810 ≠ 41,261 이었고, 원인은 `SKIPPED_EXISTING` 안전 2,451건이 어느 범주에도 속하지 않았기 때문이다. **렌더는 변하지만 이번 WO 의 DB write 대상이 아님**을 명시한 범주 `SKIPPED_EXISTING_SAFE_DB_UNCHANGED` 를 추가해 합계 41,261 을 회복하고 21/21 로 통과했다.

보호 집합 지문 고정: SKIPPED 안전 2,451 / 사람 검토 3,652 / HOLD 348 / CREATED 비대상 19,805 / 전체 HFF canonical 40,913.

---

## 7. Apply (§20·§21)

`hff-ko-function-created-5269-apply-results-v1.json` — `HFF_BACKFILL_APPLY_CONFIRM=YES`, 게이트 `APPLY_ALLOWED` 확인 후 **단일 트랜잭션**.

```sql
UPDATE shared_product_descriptions
   SET content = $1, updated_at = now()
 WHERE id = $2 AND master_id = $3
   AND description_type = 'STORE' AND status = 'canonical'
   AND coalesce(language,'ko') = 'ko' AND deleted_at IS NULL
   AND content = $4          -- oldContent 일치 조건 (동시 변경 방어)
```

| 항목 | 값 |
|------|-----|
| mode | **COMMITTED** |
| expected / actual UPDATE | 5,269 / **5,269** (row 당 rowCount 1) |
| INSERT / DELETE | 0 / 0 |
| `STORE/ko` canonical 총수 | 63,321 → **63,321** |
| HFF canonical | 40,913 → **40,913** |
| candidate 상태 분포 | `approved_new_master` 40,913 · `pending` 348 (불변) |
| Agent 9 HOLD 큐 | 348 → **348** |
| 보호 집합 3종 지문 | 전부 불변 |
| 트랜잭션 내 사후 해시 확인 | 5,269 전량 `newContentHash` 일치 |

rollback manifest 는 Apply **전에** 생성했다 — `hff-ko-function-created-5269-rollback-manifest-v1.json` (5,269건 · `oldContent`/`newContent`/양측 해시/`oldUpdatedAt` 전량 보존 · 35,189,769 B). 롤백은 이 파일의 `oldContent` 로 동일 WHERE 조건 역UPDATE 하면 된다.

---

## 8. Apply 후 독립검증 (§22)

`hff-ko-function-created-5269-independent-verification-v1.json` — **별개 read-only 세션**(`SET default_transaction_read_only = on`, `SHOW transaction_read_only = on` 확인), Apply 스크립트의 트랜잭션 내 결과를 재사용하지 않고 재도출.

### 8-1. 구조 10항목 — 10/10

1. 대상 canonical 5,269 전량 조회 ✅
2. 저장 content = `newContentHash` 5,269/5,269 ✅
3. 이전 content 잔존 **0** ✅
4. `updated_at` 전량 갱신 5,269 ✅
5. `status`/`description_type`/`language`/`source_type`/`source_ref_id`/`master_id`/`deleted_at` 불변 5,269 ✅
6. SKIPPED_EXISTING 안전 2,451 지문 불변 ✅
7. 사람 검토 3,652 지문 불변 ✅
8. CREATED 비대상 19,805 지문 불변 ✅
9. canonical 총수 63,321 / HFF 40,913 불변 ✅
10. Agent 9 HOLD 348 `pending` 유지 · 해당 canonical 0 ✅

### 8-2. 내용 10항목 — 전부 0

| 검사 | 값 |
|------|---:|
| 공식 국문 기능성 절 탈락 | 0 |
| 원문 밖 문장 날조 | 0 |
| 국문 canonical 내 영문 단독 항목 | 0 |
| 기능성 외 영역 변경 | 0 |
| 빈 항목·빈 태그 | 0 |
| raw 태그 누출 | 0 |
| script/style/inline handler | 0 |
| footer 누락 | 0 |
| 전문가 문의 안내 누락 | 0 |
| 계약 어휘 밖 class (`sd-core`/`sd-item`/`sd-tag`/`sd-why` 외) | 0 |

---

## 9. 전체 corpus 사후 감사 (§23)

`hff-ko-function-created-5269-post-corpus-audit-v1.json` — HFF `STORE/ko` canonical **40,913 전수** read-only 재검사. 판정 **PASS**.

corpus 에는 renderer family 2종이 공존한다.

| family | 건수 | 성격 |
|--------|-----:|------|
| `DRIVER` (`<h2>주요 기능성</h2>`) | 25,415 | Agent 1 개별 생산 driver 출력 — 이번 WO 의 사정권 |
| `COMPOSITE` (원료별/성분별 기능성 h2) | 15,498 | 선행 3-lane HFF 생산 출력 — 이번 WO write 대상 아님 |

| 검사 | 값 |
|------|---:|
| `sd-card` wrapper 누락 | 0 |
| 공식 기능성 문구 부재 | **0** |
| DRIVER family 섭취량 섹션 누락 | 0 |
| DRIVER family 기준·규격 섹션 누락 | 0 |
| DRIVER family 전문가 문의 안내 누락 | 0 |
| footer 누락 | 0 |
| 빈 `li` / 빈 `sd-tag` | 0 / 0 |
| raw 태그 누출 · script/style | 0 / 0 |
| 빈 `h1` · 과소 본문(60자 미만) | 0 / 0 |
| master 당 canonical 중복 | 0 |
| type/language 오류 | 0 |

**관찰(실패 아님)** — `funcClaimWithoutSectionLabel 826`. COMPOSITE family 의 프로바이오틱스 단일원료 등 826건은 기능성 전용 `h2` 라벨 없이 `sd-intro`·배지에 공식 기능성 문구를 담는 **선행 lane 의 renderer 설계**다. 전량 공식 기능성 문구를 보유하고 있고(`missingFuncClaim 0`), 이번 Apply 대상과의 교집합은 **0**(`unlabeledTouchedByThisApply 0`)이므로 이번 WO 가 만든 상태가 아니다. §23 계약대로 공식 반복 문장과 `○ ● ◦ ※` 잔존도 실패로 계산하지 않았다.

또한 잔존 관찰로, 일부 항목은 공식 원문의 선두 표기 `(국문)` 을 유지한다 (예: "(국문) 면역기능 증진에 도움을 줄 수 있음"). 공식 원문 표기이며 §25 중지 조건이 아니다 — 공용 `MARKER_LEAD` 정비는 이번 WO 금지 범위이므로 손대지 않았다.

---

## 10. 산출물

`apps/api-server/src/scripts/data/` 하위 8종:

| 파일 | 내용 |
|------|------|
| [hff-ko-function-created-5269-fixture-reverify-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-fixture-reverify-v1.json) | fixture 23/23 · artifactMismatch 0 |
| [hff-ko-function-created-5269-preapply-verification-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-preapply-verification-v1.json) | 대상 실측 검증 + 보호 집합 지문 고정 |
| [hff-ko-function-created-5269-full-regression-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-full-regression-v1.json) | 41,261 전수 회귀 + 등가성 |
| [hff-ko-function-created-5269-quality-samples-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-quality-samples-v1.json) | 6범주 × 10 표본 60/60 |
| [hff-ko-function-created-5269-render-audit-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-render-audit-v1.json) | 42 표본 × 3폭 실브라우저 |
| [hff-ko-function-created-5269-rollback-manifest-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-rollback-manifest-v1.json) | 5,269 rollback manifest (Apply 전 생성) |
| [hff-ko-function-created-5269-apply-gate-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-apply-gate-v1.json) | Apply 게이트 21/21 |
| [hff-ko-function-created-5269-apply-results-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-apply-results-v1.json) | Apply 결과 COMMITTED |
| [hff-ko-function-created-5269-independent-verification-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-independent-verification-v1.json) | 독립검증 구조 10 + 내용 10 |
| [hff-ko-function-created-5269-post-corpus-audit-v1.json](../../apps/api-server/src/scripts/data/hff-ko-function-created-5269-post-corpus-audit-v1.json) | 전체 corpus 40,913 사후 감사 |

분석·dry-run·검증용 임시 스크립트(`tmp-hff-*`)는 계약대로 전량 삭제했다.

---

## 11. 자격증명·안전 계약 준수 (§6)

- DB 접속은 `cloud-sql-proxy` 전용 포트 5463 경유. 타 세션 포트 5495 는 건드리지 않음
- 비밀번호는 실행 시점에 `gcloud run services describe` 로 인메모리 추출 후 사용, 즉시 공백화 — **코드 / CHECK / JSON / manifest / 로그 / Git diff / 명령 인자 어디에도 남기지 않음**
- 분석·dry-run·독립검증 세션은 전부 `SET default_transaction_read_only = on`. write 는 Apply 전용 트랜잭션에서만 발생

---

## 12. 후속 (이번 WO 범위 밖)

| # | 항목 | 규모 |
|---|------|-----:|
| 1 | `SKIPPED_EXISTING` 안전 대상 backfill (렌더 개선 반영 대기) | 2,451 |
| 2 | 사람 검토 대상 판정 후 처리 | 3,652 |
| 3 | Agent 9 HOLD 처리 | 348 |
| 4 | 영문 canonical 의 기능성 절 (grounding 없으면 HOLD 유지) | 15,498 |
| 5 | COMPOSITE family renderer 의 기능성 섹션 라벨 정비 여부 판단 | 826 |
| 6 | 공용 `MARKER_LEAD` / `(국문)` 선두 표기 정비 (별도 WO 필요) | — |
