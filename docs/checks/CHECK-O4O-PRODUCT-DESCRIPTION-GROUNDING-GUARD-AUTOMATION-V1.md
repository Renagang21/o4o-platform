# CHECK-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-AUTOMATION-V1

> **작업명:** 설명서 grounding 가드 자동화 (수작업 체크리스트 → 재현 가능한 검사 도구)
> **유형:** 도구 구현 — **DB write 0 · ProductMaster 0 · canonical 0 · 설명서 신규 작성 0 · 41,261 전수 실행 0**
> **결과: PASS** — §23 기준 전항 충족. 과거 실제 오류 10/10 검출, 정정된 25건 BLOCKED 0.
> **작성일:** 2026-07-16

---

## 0. 결론

수작업 [`GROUNDING-GUARD-CHECKLIST`](../guides/content-authoring/GROUNDING-GUARD-CHECKLIST.md)(CR-002·003·004·007)를 순수 함수 엔진 + CLI 로 자동화했다. jest **29/29**, 과거 실제 오류 픽스처 **10/10 BLOCKED**, 정정된 25건 **BLOCKED 0 / REVIEW 25**.

**가장 중요한 결과 — 자동 가드가 사람이 못 잡은 실제 위반 4건을 찾았다.** 25건은 수작업 §A 가드 + 전수 소급검사(V2)를 모두 통과해 "실제 위반 0" 으로 선언된 산출물이었다.

---

## 1. 구현 범위

| 산출물 | 위치 |
|---|---|
| 입력/결과 타입 | `apps/api-server/src/modules/content-guard/product-description-guard.types.ts` |
| 단위 정규화 | `…/product-description-guard.units.ts` |
| 규칙 A~H | `…/product-description-guard.rules.ts` |
| 엔진(phase·집계·exit code) | `…/product-description-guard.ts` |
| 테스트 29건 | `…/__tests__/product-description-guard.test.ts` |
| 회귀 픽스처(과거 실제 오류 10 + 정상 2) | `…/__tests__/fixtures/known-errors.ts` |
| CLI | `apps/api-server/src/scripts/product-description-guard-cli.ts` |
| pnpm script | `apps/api-server/package.json` → `guard:product-description` |
| 25건 입력·결과 | `docs/checks/data/product-description-guard/` |

**배치 근거**: 기존 선례(순수 guard + `__tests__` + `src/scripts` CLI + `npx tsx`)를 따랐다. 단 **`neture/drug-import/` 아래가 아니라 `modules/content-guard/`** 로 뒀다 — 이 가드는 **전 제품군 공통**(CR)이고 HFF/drug-import 전용이 아니다.

### ⚠️ 기존 모듈과 중복 아님 (상보)

| | `drug-import/health-functional-food-description-guards.ts` (기존) | `content-guard/product-description-guard.ts` (본건) |
|---|---|---|
| 대상 | HFF 전용 · AI 생성 파이프라인(seed → JSON draft) | **전 제품군** · **시맨틱 HTML ko/en 초안** |
| 규칙 | sourceFidelityGuard(토큰 겹침) / medicineLikeWordingGuard / draftQualityGuard | 기준량 환산(A) / 최상급(B) / 부재≠허용(C) / 근거없는 주장(D) / 제품명 유도(E) / 연령(F) / 제형(G) / ko·en 대조(H) |

서로 재구현하지 않는다. 기존 guard 의 sourceFidelityGuard 는 본건이 다루지 않는다.

## 2. 수작업 가드와의 대응표

| 수작업 체크리스트 | 자동 규칙 | 상태 |
|---|---|---|
| §A 기준량·함량 + A-추가(연결 근거) | `PRE-A-BASIS-001` · `A-UNIT-BASIS-001` · `A-CALC-MISMATCH-002` · `A-CALC-DECLARED-MISMATCH-001` | 자동 |
| §B 최상급·비교급 | `B-SUPERLATIVE-001` / `B-SUPERLATIVE-CONTEXT-002`(소비자 상황) / `B-SPEC-MINMAX-003`(규격) | 자동 |
| §C 부재≠허용 | `C-ABSENCE-AS-PERMISSION-001` / `-NUMERIC-003` / `-SOFT-004` / `-CONTRAST-005` | 자동 |
| §D 표현 차단 | `D-CLAIM-UNGROUNDED-001` / `-GROUNDED-002` / `-CONTEXT-003` | 자동 |
| 제품명 유도(20-B/C) | `E-NAME-DERIVED-001` / `-GROUNDED-002` | 자동 |
| §C-2 연령-추가 | `PRE-F-AGE-001` · `F-AGE-BOUNDARY-001` · `F-KIDS-NAME-001` | 자동 |
| 제형 일반화(20-B/D) | `G-FORM-GENERALIZATION-001` · `G-CHEWABLE-002` | 자동 |
| ko/en 대조 + §16 강화 | `H-COUNT-MISMATCH-001` · `-WEIGHT-002` · `-FUNCTION-ESCALATION-003` · `-SUPPORTS-004` · `-MAKER-005` · `-GUARANTEE-SPEC-006` | 자동 |
| §E 기록표 | `GuardFinding` 구조화 출력(markdown/json) | 자동 |
| 최종 문맥 판정 | **사람** (REVIEW_REQUIRED) | 유지 |

## 3. 입력 스키마 (§7)

`GuardProductInput` — candidateId / productName / manufacturer / statementNo / source{mainFunction, baseStandard, intake, caution, dosageForm} / grounding{declaredAmount, serving, calculationAllowed, ageBandsRaw} / drafts{ko, en}.

**핵심 설계**: `serving.unitWeight` 는 **원문에 없으면 `null`**. 가드는 `calculationAllowed` 선언을 **신뢰하지 않고 독립 재계산**하여 불일치 시 `A-CALC-DECLARED-MISMATCH-001` 로 BLOCKED 한다(작성자의 자기선언을 검사하지 못하는 문제 방지).

## 4. 기준량 계산 가드 (§8)

```text
A-1 환산 허용 = 표시 기준량 + 1단위 중량 + 1회 단위 수 + 1일 횟수 **4값 전부 원문 확인**
    하나라도 없으면 → per serving/stick/capsule/daily total 전부 생성 금지
A-3 기준량이 1회분인지 1일분인지 자동 판정 후 계산값 대조
```
검증된 계산 (테스트):
```text
김치생유산균  100억/900mg · 1캅셀 450mg × 2회 → basisEquals=daily · 1일 100억 · 1캡슐 50억
비바 비피도   10억/5,000mg · 5캡슐×500mg × 2회 → 1일 5,000mg=기준량 · 1일 10억 · 1캡슐 1억
```

## 5. 과거 오류 회귀 결과 (§21·§23) — **10/10 검출**

| # | 픽스처(과거 실제 오류) | 검출 규칙 |
|---|---|---|
| ① | 락토핏 1포=4g 가정 + **1일 200억** | `A-UNIT-BASIS-001` + `A-CALC-DECLARED-MISMATCH-001` |
| ② | 프로바 1포=2,000mg 가정 | `A-UNIT-BASIS-001` |
| ③ | 디노키즈 1포=2g 가정 + `4세 이상 9세 미만` | `A-UNIT-BASIS-001` + `F-AGE-BOUNDARY-001`(ko·en) |
| ④ | "이 그룹에서 가장 낮은 균수 구간" | `B-SUPERLATIVE-001` |
| ⑤ | "냉장 조건이 표시되어 있지 않습니다" | `C-ABSENCE-AS-PERMISSION-001` |
| ⑥ | 키즈 명칭 + 연령별 없음 + 어린이 적합 | `F-KIDS-NAME-001` |
| ⑦ | W이너밸런스 → 여성 균형 | `E-NAME-DERIVED-001` |
| ⑧ | 원문 "충분한 물과 함께" 인데 "물 없이" | `G-FORM-GENERALIZATION-001` |
| ⑨ | ko 100억 ↔ en 1 billion | `H-COUNT-MISMATCH-001` |
| ⑩ | en improves/boosts | `H-FUNCTION-ESCALATION-003` |

## 6. 정정된 25건 재검사 (§21) — **BLOCKED 0**

```text
제품 25 · PASS 0 · REVIEW_REQUIRED 25 · BLOCKED 0   (exit 1)
```

### ⭐ 자동 가드가 사람이 못 잡은 **실제 위반 4건**을 찾았다

25건은 수작업 §A 가드 + **전수 소급검사(V2)** 를 통과해 "실제 위반 0" 으로 선언됐던 산출물이다.

| 제품 | 검출 | 왜 사람이 놓쳤나 |
|---|---|---|
| **a1 하루하루 장편한** | `A-UNIT-BASIS-001` — BASE `100억/400mg` + SRV `1회 1캡슐`(**캡슐 중량 미표시**)인데 "캡슐 1개(400mg)당 100억" + "1일 섭취 100억" | **락토핏과 동일 함정을 20-A 에서 재발.** 수작업 §A 가 "400mg = 캡슐 중량"이라고 **가정한 채 통과**시켰고, 소급검사도 같은 가정을 공유해 못 잡음 |
| **듀오락(5건)** | `D-CLAIM-UNGROUNDED-001` — "맛·향 부담이 없고" / "매일 부담 없이" | 소급검사 sweep 정규식에서 **`부담` 을 누락** |
| **d2 돌피니** | `G-FORM-GENERALIZATION-001` — "물 없이 씹어서" | 원문은 `씹어서` 뿐. **씹어서 ≠ 물 없이** — 사람이 자연스럽게 연결 |
| **락토핏 en** | `D-CLAIM-UNGROUNDED-001` — sd-tag `Easy to take` | ko 는 중립 라벨(`섭취 편의`) → **ko/en 비대칭**을 사람이 못 봄 |

→ 4건 전부 정정(ko/en) 후 BLOCKED 0. **자동 가드는 사람 검사의 대체가 아니라, 사람이 구조적으로 못 보는 것(자기 가정·정규식 누락·언어 간 비대칭)을 잡는다.**

## 7. 오탐·미탐 분석 (§23)

**오탐 → BLOCKED 아님, REVIEW_REQUIRED 로 분리** (튜닝 전 BLOCKED 25 → 후 0):

| 오탐 | 원인 | 조치 |
|---|---|---|
| `at least 10 billion CFU` | `least` 가 최상급으로 매칭 | `B-SPEC-MINMAX-003`(REVIEW)로 분리 |
| `to a minimum` | 규격어 | 〃 |
| `guarantees at least N CFU` | 표시량 규격 보장 | `H-GUARANTEE-SPEC-006`(REVIEW) |
| `단순한` → `순한` | 부분 문자열 | `(?<![가-힣])순한` |
| `9세 이상`(원문에 존재) | **원문 대조 공백 정규화 버그**(한쪽만 제거) | 양쪽 정규화 |
| `straight from the directions` | 물 문맥 아님 | 섭취 문맥 한정 |
| `no need to time it around eating` | 원문 "식전·식후 어느때나" 번역 | `C-ABSENCE-SOFT-004`(REVIEW) |
| `씹어서` → "삼키는 방식이 아닙니다" | 긍정 원문 파생 부정형 | `C-ABSENCE-CONTRAST-005`(REVIEW) |
| "가장 막막한 건" / "계산이 필요 없습니다" | 소비자 상황 / 수치 서술 | `B-…-CONTEXT-002` / `C-…-NUMERIC-003`(REVIEW) |

**REVIEW 25건 분포**: `B-SPEC-MINMAX-003` 51 · `H-MAKER-MISSING-005` 25 · `PRE-F-AGE-001` 23 · `PRE-A-BASIS-001` 17 · `H-GUARANTEE-SPEC-006` 8 등. 전부 사람이 해제 가능한 유형이며 **BLOCKED 0**.

**미탐 확인**: 과거 실제 오류 10건 전건 검출(§5). 추가로 자동 가드가 **사람 미탐 4건**을 검출(§6).

## 8. 제한사항 (§12)

```text
1. REVIEW 25건 = 전 제품이 REVIEW — PASS 0. 오탐 억제보다 미탐 최소화를 우선한 결과(WO §6.3).
   운영 시 REVIEW 볼륨이 부담이면 B-SPEC-MINMAX / H-MAKER-MISSING 을 INFO 로 낮추는 튜닝 필요.
2. 입력 grounding 은 **수작업 구조화**다. 원문 → declaredAmount/serving 파서는 이 WO 범위 밖
   (BASE_STANDARD 표기가 최소 5형태). 파서 자동화 전까지 입력 작성이 병목.
3. 규칙은 정규식 기반이라 문맥 이해가 없다. 판정은 여전히 사람이 한다.
4. 카테고리는 hff 만 실측. drug/의료기기/의약외품은 규칙 재사용 가능하나 미검증.
5. 자동 수정 없음(WO §20) — 검출 → 보고만.
```

## 9. 다음 검증 배치 조건 (§26)

```text
자동 가드 PASS(본 CHECK)
→ 기존 25건 자동 재검사 ✅ BLOCKED 0
→ 추가 20~50건 유산균 검증 배치      ← 다음
→ 자동 가드 전수 적용 + 사람 표본검수
→ 신규 실패 유형 0 확인
→ 100건 제한 대량작업
```

## 10. 무변경 확인

```text
DB write 0 · ProductMaster 0 · candidate 저장 0 · canonical 0
QR·Landing 0 · 후보 상태 0 · 41,261 전수 실행 0 · 설명서 신규 작성 0
기존 설명서 변경 = 자동 가드가 검출한 실제 위반 4건 정정만(§6)
무관 파일 커밋 0 (병렬 세션 파일 미포함, git add . 미사용)
```

## 11. 커밋

```text
e41c78157  wip(content-guard): 엔진 + 규칙 + 테스트 + CLI
d22b9326e  fix(hff): 자동 가드가 찾아낸 실제 위반 4건 정정 + 오탐 튜닝
0c6da6b87  feat(content-guard): guard:product-description CLI 등록
```
push: `main` 반영 완료. husky 가 package.json 재생성 시 스크립트 줄을 지우는 알려진 gotcha 는 **HEAD 검증으로 확인**(잔존 1건).

## 12. 실행

```bash
pnpm --filter @o4o/api-server guard:product-description -- \
  --input docs/checks/data/product-description-guard/hff-probiotics-25.json \
  --output /tmp/result.json --phase all
# exit 0 PASS / 1 REVIEW_REQUIRED / 2 BLOCKED / 3 실행 오류
```

## 13. 열린 항목

- ~~`CHECK-O4O-HFF-DESCRIPTION-GROUP-PILOT-PROBIOTICS-20-V1.md` 부재~~ → **해소(2026-07-16)**. 본 WO 가 찾아낸 사람 미탐 4건까지 반영해 작성 완료. 파일럿 최종 판정 = **CONDITIONAL PASS**(자동 가드 없는 대량 제작 불허). → [CHECK-O4O-HFF-DESCRIPTION-GROUP-PILOT-PROBIOTICS-20-V1](CHECK-O4O-HFF-DESCRIPTION-GROUP-PILOT-PROBIOTICS-20-V1.md)
- **REVIEW 사유 튜닝** — 25건에서 REVIEW 검출 130건 중 **정보성·형식성이 116건(89%)**. 사유별 건수는 파일럿 CHECK §5 에 기록됨. `B-SPEC-MINMAX-003`(51) · `H-MAKER-MISSING-005`(25) 처리와 `PRE-*` 표시 계층 분리가 다음 WO 대상. **성급한 INFO 하향 금지** — 기록 후 튜닝.
