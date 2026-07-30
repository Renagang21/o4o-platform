# CHECK-O4O-HFF-KO-FUNCTION-HUMAN-REVIEW-PILOT-FRAGMENTED-AND-MALFORMED-47-V1

건강기능식품 한국어 기능성 절 **사람 검토 파일럿 47건** (`SOURCE_LINE_BREAK_FRAGMENTED` 2 + `MALFORMED_BRACKET` 45)

- 근거 WO: `WO-O4O-HFF-KO-FUNCTION-HUMAN-REVIEW-PILOT-FRAGMENTED-AND-MALFORMED-47-V1`
- 기준 커밋: `d8cfb419b` (HEAD 의 조상 — 확인)
- 착수 HEAD: `735aeffbe` (= `origin/main`)
- 판정: **PASS** — SAFE 6건 적용 · 공식 기능성 11절 복원 · 41건 차단/무변경

---

## 1. 실행 전 환경 확인

| 항목 | 결과 |
|---|---|
| `ide_selection` 자동 첨부 | **없음** |
| 작업트리 시작 상태 | `M package.json` (**타 세션 소유 — 미접촉**) |
| 공용 driver·parser·registry·composer·renderer·CSS 수정 | **없음** (생산 segmenter `hff-ko-function-clause-segmenter-v2.mjs` 무변경) |
| 원본 큐 파일 수정 | **없음** (`hff-ko-function-human-review-queue-v1.jsonl` read-only) |
| DB read-only 적용 | 감사·dry-run·독립검증 전 세션에 `SET default_transaction_read_only = on` |

## 2. 대상 고정 (Phase A)

| 항목 | 값 |
|---|---|
| 사람 검토 큐 총계 | **3,858** |
| 파일럿 대상 | **47** |
| `SOURCE_LINE_BREAK_FRAGMENTED` | **2** |
| `MALFORMED_BRACKET` | **45** |
| 두 사유 동시 보유(중복 계상 위험) | **0** |
| candidateId / canonicalId / statementNo 중복 | **0 / 0 / 0** |
| Agent 9 HOLD 교집합 | **0** |
| bucket 구성 | CREATED 34 · SKIPPED_EXISTING 13 |
| renderer 구성 | DRIVER 35 · COMPOSITE 12 |

## 3. 현재 DB 상태 (Phase A-2)

| 상태 | 건수 |
|---|---|
| `CURRENT_UNCHANGED` | **47** |
| `CURRENT_CHANGED_REVIEW_STILL_REQUIRED` | 0 |
| `ALREADY_RESOLVED` | 0 |
| `CANDIDATE_OR_LINK_DRIFT` | 0 |

candidate 결손 0 · canonical 결손 0 · ProductMaster 링크 drift 0 · permit mismatch 0 · hash mismatch **0**.

## 4. 손상 유형 분류 (Phase B)

| 지표 | 값 |
|---|---|
| 대괄호 균형 정상 | 4 (FRAGMENTED 2 + 감사 false positive 2) |
| 대괄호 불균형 | 43 |
| 닫는 대괄호 누락 | 33 |
| 여는 대괄호 누락 | 10 |
| 중첩/여분 대괄호 | 24 |
| 대괄호가 줄바꿈으로 분리 | 24 |
| 기능성 블록 자체 결손 | **1** (#35) |
| 원문 대괄호 파편이 렌더에 노출 | **17** |
| 원문 기능성 절이 렌더에서 누락된 제품 | **22** (총 56절) |

### 4-1. 검증기 자체 결함 2건 교정 (기록)

분류 도중 **본 감사 스크립트의 오탐 2건**을 발견하여 교정했다. 교정 전 결과로 판정하면 잘못된 결론에 도달한다.

| 결함 | 증상 | 교정 |
|---|---|---|
| COMPOSITE 중첩 `<li>` 흡수 | `<li><b>라벨</b><ul class="sd-why"><li>…` 구조에서 단순 `<li>…</li>` 정규식이 라벨·마크업을 항목 텍스트로 흡수 → 허위 not-grounded 8건 | 최말단 `<li>` 만 추출 + 내부 태그 제거 → 2건으로 감소(실제 잔여) |
| 공백 유지 grounding | 원문 `…감소에 도\n움을 줌` 을 렌더러가 올바르게 `도움을 줌` 으로 결합한 것을 부분문자열 불일치로 오판 | grounding 판정을 **공백 제거(dense) 키**로 변경 |
| 리터럴 대괄호 과대탐지 | `/\[[A-Za-z]/` 가 정상 원료명 `[EPA 및 DHA…` `[NAG(엔에이지…` 를 영문 리터럴로 오판 → **실제 손실 사례 4건이 잘못 차단** | 영문 기능성 문장·고시번호·마침표 종결 괄호로 한정 |

## 5. 판정 규칙과 결과 (Phase C)

47건 **전량 개별 판정**(표본 축소 없음).

| 최종 판정 | 건수 |
|---|---|
| `SAFE_CANONICAL_PATCH` | **6** |
| `RESOLVED_NO_CHANGE` | **3** |
| `BLOCKED_SOURCE_DATA` | **5** |
| `BLOCKED_AMBIGUOUS_BOUNDARY` | **22** |
| `BLOCKED_RENDERER_STRUCTURE` | **11** |
| `FAILED_SYSTEM` | **0** |
| 합계 | **47** |

복구 유형: `RENDER_ONLY_REPAIR` 6 · `NO_REPAIR_REQUIRED` 3 · `SOURCE_REPAIR` 5 · `BLOCKED` 33.

차단 사유별:

| 사유 | 건수 |
|---|---|
| `NO_SIBLING_GROUP_TEMPLATE` | 10 |
| `BROKEN_LABEL_UNPARSEABLE:NO_MARKER` | 9 |
| `UNMATCHED_CLOSING_BRACKET` | 7 |
| `RAW_BRACKET_FRAGMENT_RENDERED…` | 5 |
| `NO_IDENTIFIABLE_BROKEN_LABEL_LINE` | 4 |
| `BROKEN_LABEL_UNPARSEABLE:LABEL_HAS_BRACKET` | 2 |
| `FUNCTION_BLOCK_ABSENT_NO_TEMPLATE` | 1 |

### 5-1. FRAGMENTED 2건 — 현재 canonical 이 이미 완전

| # | 제품 | 원문 파편 | 판정 |
|---|---|---|---|
| 44 | 뼈앤칼마디 | `…감소에 도` + `움을 줌` | `RESOLVED_NO_CHANGE` |
| 45 | The K2칼마디채움 | 동일 | `RESOLVED_NO_CHANGE` |

두 건 모두 원문의 **어절 중간 줄바꿈**(고정 컬럼 折り返し)이며, COMPOSITE 렌더러가 이미 `골다공증발생 위험 감소에 도움을 줌` 을 완전한 형태로 보유한다. 기능성 누락 0 → 수정 불필요.

### 5-2. SAFE 6건 상세 (전량 육안 검토)

공통 유형: 원문 라인이 `[<라벨><①><기능성>` 인데 **닫는 대괄호만 없어** parser 가 해당 라인을 **전량 탈락**시킴. 라벨/기능성 분리점은 첫 열거 마커로 유일 확정.

| # | 제품 | 탈락된 원료 | 복원 기능성 | 그룹 |
|---|---|---|---|---|
| 6 | 식물성 알티지오메가3 80 | `EPA 및 DHA 함유유지` | 혈중 중성지질 개선 · 혈행개선 · 건조한 눈 개선 (**3절**) | 2→3 |
| 7 | 한국가간보(佳肝寶) | `밀크씨슬(카르두스 마리아누스)추출물)` | 간 건강 (1절) | 1→2 |
| 15 | 더쎄라 빼라 | `비타민B2` | 체내 에너지 생성 (1절) | 7→8 |
| 18 | 관절혁명 | `엠에스엠(MSM…)` + `NAG(엔에이지…)` | 관절 및 연골건강 ×2 (**2절**) | 1→3 |
| 19 | 더신나게_다시관절 | 동일 | 동일 (2절) | 1→3 |
| 20 | 관절건강엔 정통관절 | 동일 | 동일 (2절) | 1→3 |

**심각도 소견**: #6 은 오메가3 제품인데 EPA/DHA 기능성 3절 전부가 매장 설명서에 **미노출** 상태였고, #18·19·20 은 관절 제품인데 관절·연골 기능성이 **미노출** 상태였다. 즉 제품의 핵심 기능성이 약사에게 보이지 않았다.

**#7 라벨 이상 공개**: 원문 라벨이 `[밀크씨슬(카르두스 마리아누스)추출물)` 로 **닫는 괄호가 하나 남는 원문 손상**을 포함한다. 기능성 절 경계(`①`)는 유일 확정이고 렌더 문자 전부가 원문 유래이므로 SAFE 로 유지하되, **임의 정규화하지 않고 원문 그대로** 렌더했다(규칙집 `X2` 로 고정).

### 5-3. Fixture

| 항목 | 결과 |
|---|---|
| 패턴 fixture | 11 |
| 불변식 fixture | 3 |
| 합계 / PASS | **14 / 14** → **PASS** |

작성 중 **fixture 기대값 2건이 잘못 지정**되어 있었고, 검토 결과 규칙 동작이 옳았다. ① 중첩 대괄호는 차단이 맞으나 사유가 부정확했다 → 닫힌 라벨 내부 중첩 `[` 를 명시 탐지하도록 정밀화. ② 고시번호가 **닫힌** 라벨 내부 괄호에 있는 것은 결함이 아니므로 SAFE 가 옳다 → 기대값 교정 + `[제2019-24호` 형태(대괄호가 고시번호로 시작)를 차단하는 fixture 추가.

## 6. Dry-run

| 상태 | 건수 |
|---|---|
| SAFE_APPLY | 6 |
| NO_CHANGE | 3 |
| BLOCKED_SOURCE | 5 |
| BLOCKED_AMBIGUOUS | 22 |
| BLOCKED_STRUCTURE | 11 |
| FAILED_SYSTEM | **0** |
| 합계 | **47** |
| DB write | **0** |

## 7. 패치 계약과 사후검증

패치 연산은 **`INSERT_MISSING_GROUP` 만** 허용했다(블록 재구성 금지).

- 기존 `sd-item` 그룹은 **substring 그대로 재사용**(재생성 금지)
- 삽입 그룹은 동일 문서 형제 마크업 형태로 생성 → renderer family·class 집합 보존
- **원문 라인 순서**로 재배치(EPA/DHA 가 원문 1번이므로 첫 그룹으로 복원)
- 그룹 ≥2 면 driver 계약대로 `sd-core` 로 감쌈

6건 전량 사후검증 통과: 기능성 블록 **외부 byte 동일** · 기존 그룹 전량 보존 · 삽입 그룹 존재 · 미정의 class 0 · 태그 균형 · 빈 카드 0 · 길이 증가 · 블록 외 텍스트 동일 · 필수 섹션 보존.

> 검증기 결함 1건 추가 교정: `outsideTextSame` 이 **늘어난 newContent 를 구 offset 으로 슬라이스**해 6건 전부 허위 FAIL 이었다. before/after 를 각 문서 기준으로 분리하도록 수정.

## 8. 렌더 검증 (`.store-desc-content` 래퍼 필수)

**래퍼 적용 computed-style 증명:**

| 속성 | 래퍼 **없이** | 래퍼 **적용** |
|---|---|---|
| `.sd-card` max-width | `none` | **`860px`** |
| `.sd-card` border-radius | `0px` | **`20px`** |
| `.sd-hero` padding | `0px` | **`40px 34px 32px`** |
| `.sd-badge` border-radius | `0px` | **`999px`** |

→ `cssActuallyApplied: true`. 래퍼 없이는 스타일이 하나도 적용되지 않음을 실측 확인.

| 항목 | 결과 |
|---|---|
| 대상 | 6건 × 430 / 820 / 1280 |
| 페이지 가로 overflow · 요소 overflow · 클리핑 · ellipsis 잘림 | **전부 0** |
| raw bracket 파편 노출 | **0** |
| 빈 제목 · 빈 항목 · `sd-warn` 신규 · 미정의 class | **전부 0** |
| footer · 필수 4섹션 | 전건 존재 |
| 삽입 기능성 가시성 | **11 / 11** |
| 판정 | **PASS (6/6)** |

## 9. Apply (LIVE · 제한 UPDATE)

이중 게이트(`--apply` + `HFF_FN_PILOT_APPLY_CONFIRM=YES`). **단일 트랜잭션**.

UPDATE WHERE 에 `id` · `master_id` · `description_type='STORE'` · `status='canonical'` · `language='ko'` · `deleted_at IS NULL` · **`content = oldContent`**(낙관적 잠금)를 모두 포함했다.

| 항목 | 값 |
|---|---|
| expected UPDATE | **6** |
| actual UPDATE | **6** |
| rollback 발생 | **없음** |
| INSERT / DELETE | **0 / 0** |
| SPD 총수 BEFORE/AFTER | 119,974 → **119,974** (불변) |
| STORE/ko canonical BEFORE/AFTER | 63,321 → **63,321** (불변) |
| `o4o_hff_generated` BEFORE/AFTER | 56,473 → **56,473** (불변) |

트랜잭션 내 사후검증(새 hash 일치 · canonical 유일성 · 총수 불변) 통과 후 COMMIT.

## 10. 독립검증 (별도 read-only 세션)

| 검사 | 결과 |
|---|---|
| 대상 new hash 일치 | **6 / 6** |
| old hash 잔존 | **0** |
| SPD 속성 drift | **0** |
| candidate·ProductMaster drift | **0** |
| 삽입 기능성 가시 / 기대 | **11 / 11** |
| 삽입 문장 원문 verbatim 위반 | **0** |
| 기능성 블록 **외부** drift | **0** |
| 비적용 41건 hash drift | **0** |
| 파일럿 master 범위 canonicalDup | **0** |
| 판정 | **PASS** |

## 11. 전체 corpus 보호 감사

| 검사 | 결과 |
|---|---|
| HFF 후보 중 STORE/ko canonical 보유 | **40,913** = 직전 트랙 확정치 **불변** ✅ |
| Agent 9 HOLD 큐 348건 | **348건 전부 canonical 미보유 유지** — 불변 ✅ |
| SPD 총수 · STORE/ko 총수 · HFF generated 총수 | 전부 불변 |
| canonicalDup | **0** |
| 파일럿 밖 write | **0** |
| 판정 | **PASS** |

## 12. 공식 기능성 반복 · 글머리 기호

이번 WO 는 반복 문장과 글머리 기호를 **수정하지 않는다**. 판정 기준은 `원문 등장 횟수 ≥ 렌더 횟수` 이며 위반(설명되지 않는 중복) **0**. `sd-why` 평면 목록에는 dedupe 미적용(규칙집 `X1`).

## 13. Queue delta (원본 큐 미수정)

`hff-ko-function-review-pilot-47-queue-delta-v1.jsonl` — **47행**.

| `proposedReviewStatus` | 건수 |
|---|---|
| `RESOLVED_UPDATED` | **6** |
| `RESOLVED_NO_CHANGE` | **3** |
| `BLOCKED_SOURCE_DATA` | **5** |
| `BLOCKED_STRUCTURE` | **33** |
| 합계 | **47** |

원본 큐 상태는 갱신하지 않았다. 후속 큐 반영 WO 가 delta 를 적용한다.

## 14. 규칙집 (후속 P1 적용 기준)

일반화 가능 규칙 **2**, 사람 검토 필수 규칙 **4**, 원천 정비 규칙 **1**, renderer 구조 규칙 **2**, **일반화 금지 규칙 4**.

**일반화 가능:**
- `R1-SAFE-UNCLOSED-LABEL-UNIQUE-MARKER` — 닫는 대괄호만 누락 + 열거 마커로 경계 유일 + 해당 라인 기능성 전량 누락 → 형제 마크업 verbatim 복제 삽입. (파일럿 6/6 적용, 11절 복원)
- `R2-NOCHANGE-LINE-BREAK-ARTIFACT` — 어절 중간 줄바꿈이지만 렌더가 이미 완전 → 무변경. **grounding 은 dense 키로 판정해야 함.**

**일반화 금지(중요):**
- `X1` — `sd-why` 평면 목록에 dedupe 금지(원료별 공식 기능성 삭제 위험)
- `X2` — 라벨의 원문 유래 불균형 괄호를 임의 정규화 금지(삭제도 원문 변경)
- `X3` — 원문에 닫는 대괄호 임의 삽입 금지(렌더 복구는 원문 무수정으로)
- `X4` — `[EPA…` `[NAG…` 같은 라틴 원료명을 영문 리터럴로 오판 금지

**P1 잔여 외삽**: P1 2,252 − 파일럿 47 = **2,205**. 파일럿 비율(6/47) 단순 외삽 시 자동규칙 적용 가능 **약 281건**, 사람 검토 유지 **약 1,924건**. 단 파일럿은 두 사유 편중 표본이므로 이 수치는 **참고값**이며, P1 잔여의 실제 사유 구성(`INGREDIENT_FUNCTION_BOUNDARY_UNCLEAR` 등)에 따라 크게 달라진다 — 후속 WO 에서 사유별 재표본이 필요하다.

## 15. 후속 처리 우선순위 제안

1. **`#35 프로바이오틱스우먼`** — 기능성 섹션 자체가 canonical 에 없어 공식 기능성 3절이 전량 미노출. 단건이지만 영향이 가장 크다.
2. `UNMATCHED_CLOSING_BRACKET` 7건 — `#4 내추럴 어드밴스드 다이어트` 처럼 공식 기능성이 누락됐으나 라벨 시작점 불확정. 사람이 경계만 확정하면 R1 과 동일 방식으로 복구 가능.
3. `NO_SIBLING_GROUP_TEMPLATE` 10건 — 기능성 블록 재구성 WO 필요.
4. 원천 정비 5건(`RAW_BRACKET_FRAGMENT_RENDERED`).

## 16. Git 안전 절차

- 착수 HEAD = `735aeffbe` = `origin/main`. 기준 커밋 `d8cfb419b` 조상 확인.
- 타 세션 소유 `M package.json` 및 미추적 `otc-*` 계열 **일절 미접촉**.
- `git add .` / 경로 없는 commit 미사용 — **경로 지정 stage + 경로 지정 commit**.
- `pnpm-lock.yaml` 미수정 / 공용 driver·parser·renderer·CSS 미수정 / force push 미사용.
- 이번 WO 전용 스크립트는 HFF 전용 신규 파일로 작성(생산 parser 무변경).

## 17. 함정 기록 (인계)

1. **grounding 은 dense(공백 제거) 키로** — 원문 어절 중간 줄바꿈을 렌더러가 정상 결합한 경우 공백 유지 비교는 전건 허위 위반이 된다.
2. **COMPOSITE 는 `<li>` 가 중첩된다** — 단순 `<li>…</li>` 정규식은 라벨·마크업을 항목으로 흡수한다. 최말단 `<li>` 만 취할 것.
3. **리터럴 대괄호 판정에 `\[[A-Za-z]` 금지** — `EPA` `NAG` `MSM` 등 정상 원료명을 오판해 실제 손실 사례를 놓친다.
4. **패치 사후검증에서 구 offset 재사용 금지** — 내용이 늘어나면 구 offset 슬라이스는 무의미하다.
5. **삽입 시 원문 라인 순서 복원** — 단순 append 하면 원문 1번 원료가 마지막에 배치된다.
6. **그룹 ≥2 는 `sd-core` 래핑** — driver 의 `blocksToCards` 계약과 일치시켜야 디자인이 동일해진다.
7. 렌더 검증은 `.store-desc-content` 래퍼 + computed-style 대조 필수.

---

*작성: 2026-07-30*
