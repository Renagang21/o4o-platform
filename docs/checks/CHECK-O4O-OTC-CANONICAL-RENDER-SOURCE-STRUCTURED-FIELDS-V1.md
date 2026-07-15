# CHECK-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1 — 승격 렌더 소스 구조화 필드 고정

WO: `WO-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1` · 일자: 2026-07-15 · 상태: 완료
선행: [CHECK-...-TRANSLATOR-NOTE-SEPARATION-V1](CHECK-O4O-OTC-TRANSLATOR-NOTE-SEPARATION-V1.md) (잠재 누출 §3-2) · 규칙: **CR-021**(주석 분리) · **CR-020**(sd-* 계약) · **DR-019**(투여경로)

> **코드 수정.** DB migration **0** · DB write **0** · 기존 데이터 일괄 수정 **0** · 초안 수정 **0** · 주석 삭제 **0**.
> translatorNote 기능 · `mdToHtml` 보강은 **이번 범위 밖**(후속 WO).

---

## 1. 결론

> **승격 렌더 소스가 구조화 필드로 고정됐다.** `bodyMarkdown` 은 더 이상 소비자 본문 경로에 들어오지 않는다.
> 주석 보유 초안 4건 포함 **5/5 검증 통과** — 주석 고유 어절 누출 **0**, `&gt;` **0**, `<table>` **0**, 숫자·단위 **전량 유지**.
> 단위 테스트 **8/8** 로 회귀를 잠갔다.

---

## 2. 조사 — 승격 경로

| 경로 | 렌더 여부 | 조치 |
|---|---|---|
| `drug-otc-nutrition-combo-canonical-promotion.ts:196` | **유일한 렌더 지점** — `mdToHtml(bodyMarkdown)` | **교체** |
| `drug-otc-description-promotion-dryrun.ts` | 커버리지 집계 전용(변환 없음, write 0) | 변경 없음 |
| 그 외 | md→HTML 변환기 없음 | — |

---

## 3. 변경

### 3-1. 신규 — `modules/neture/drug-import/drug-otc-description-consumer-html.ts`

구조화 필드 → **`sd-*` 시맨틱 HTML** 빌더. **입력 인터페이스에 `bodyMarkdown` 이 없다** — 타입 수준에서 읽을 수 없다.

| 필드 | → | `sd-*` |
|---|---|---|
| `summaryTable.분류` · `작용` | → | `sd-badges > sd-badge` |
| `summaryTable.선택 포인트` | → | `sd-hero h1 > small` |
| `summaryTable.성분` | → | `sd-meta` |
| **`efficacy`** | → | `sd-intro` |
| **`summaryTable`** (전체) | → | **`sd-core > sd-item`** (`<table>` 미사용 — 디자인 GUIDE §8-E) |
| **`usage`** | → | `sd-intake` (제목 = **`usageLabel`**) |
| **`caution`** | → | `sd-who > li` |
| `ingredientSelection` | → | `sd-foot` |

- **필수 4필드**(`efficacy`·`usage`·`caution`·`summaryTable`) 중 하나라도 비면 `html=''` + `missing[]` 반환 → **승격 보류**.
- `usageLabel` 을 제목으로 사용 — **제형명으로 투여경로를 추정하지 않는다**(DR-019). 부재 시 중립 표기.
- 전 출력 escape(`&`·`<`·`>`·`"`).

### 3-2. 승격 스크립트

```diff
- const contentHtml = mdToHtml(String((d.content_json as any)?.bodyMarkdown ?? d.content_html ?? ''));
+ const built = buildDrugOtcConsumerHtml(cj as never, { title: d.title });
+ if (built.missing.length) { /* INCOMPLETE_FIELDS → eligible:false, 승격 보류 */ continue; }
+ const contentHtml = built.html;
```

- `GroupPlan.eligible` 신설 → write 필터를 `hasMasterIds` → **`eligible`** 로 변경. 불완전 그룹이 INSERT·OTC 방어검증에 **들어가지 않는다**.
- `mdToHtml` 은 **삭제하지 않고 미사용**으로 남기고 위험 사유를 주석에 명시(보강은 후속 WO 범위).

> **주석 삭제·문자열 정리로 해결하지 않았다.** `bodyMarkdown` 은 그대로 보존되고, 소비자 경로에서 **참조되지 않을 뿐**이다.

---

## 4. 검증

### 4-1. 실제 초안 5건 (P1~P5, read-only)

| # | 주석 보유 | **주석 고유 어절 누출** | `&gt;` | `<table>` | 숫자·단위 유지 | usage 제목 | 결과 |
|---|---|---|---|---|---|---|---|
| P1 트리메부틴 200mg | Y | **0** | 0 | 0 | OK | 복용 안내 | ✅ |
| P2 니자티딘 75mg | N | 0 | 0 | 0 | OK | 복용 안내 | ✅ |
| **P3 나프록센나트륨 275mg** | Y | **0** | 0 | 0 | OK | 복용 안내 | ✅ |
| **P4 클로트리마졸 질정** | Y | **0** | 0 | 0 | OK | **사용 안내** | ✅ |
| P5 데소게스트렐 0.075mg | Y | **0** | 0 | 0 | OK | 복용 안내 | ✅ |

**누출 판정 방법**: 주석 어절 중 **구조화 필드에 없는 것**(=주석 고유)만 검사. 초기 검사는 `550mg`·`혈전색전증` 등을 누출로 오탐했으나, 추적 결과 **전부 `usage`·`caution`·`summaryTable` 출처**였다 — 주석과 본문이 어휘를 공유하는 것은 정상이다.

### 4-2. P3·P4 재검증 (핵심 사례)

| # | 주석 | 결과 |
|---|---|---|
| **P3** | `> 같은 성분 550mg 정은 전문의약품이다(§6)…` | HTML 에 `전문의약품이다`·`한정한다`·`§6` **0회**. 동시에 용법의 `2정(550mg)`·`1정(275mg)`·`6~8시간` **전량 유지** |
| **P4** | `> 이름은 '정'이지만 질 내 삽입 질정(내복 금지)…` | 주석 문구 **0회**. `usageLabel='사용 안내'` → **`<h2>사용 안내</h2>`** 로 경로 보존(DR-019). 본문 `질 내 깊숙이 삽입` 유지 |

### 4-3. 대조 — 주석 없는 초안과 동일 결과

`bodyMarkdown` 을 빈 문자열로 바꿔도 **출력 HTML 이 완전히 동일**(단위 테스트 `withNote === withoutNote`) → **bodyMarkdown 이 본문에 기여하지 않음이 증명됨**.

### 4-4. 단위 테스트 — **8/8 PASS**

`modules/neture/services/__tests__/drug-otc-description-consumer-html.test.ts`

| 테스트 | 잠그는 것 |
|---|---|
| 내부 주석 미포함 | CR-021 회귀 |
| bodyMarkdown 미참조(withNote === withoutNote) | 렌더 소스 고정 |
| 구조화 4필드 누락 없음 | 정보 보존 |
| `sd-core` 변환 · `<table>` 0 | §8-E |
| `sd-card` · `<style>`·인라인 style 0 | CR-020 |
| `usageLabel` 반영 | DR-019 |
| 불완전 → `html=''` + missing | 승격 보류 게이트 |
| HTML escape | XSS |

### 4-5. 타 제품군 영향 → **없음**

| 확인 | 결과 |
|---|---|
| `buildDrugOtcConsumerHtml` 사용처 | **OTC 승격 스크립트 1곳뿐** |
| HFF·일반식품·의료기기 경로가 변경 파일 참조 | **0** |
| 렌더러(`ContentRenderer`)·sanitizer | **변경 0** |
| 이미 승격된 SPD 1,915행 | **변경 0** (재실행 시 `NOT EXISTS(canonical)` 로 no-op) |

### 4-6. typecheck / build

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` — **내 파일** | ✅ **0 오류** |
| `tsc --noEmit` — 저장소 전체 | 19 → **12** (내 변경이 **7개 감소** — import 추가로 스크립트가 module 이 되며 전역 스코프 충돌 해소) |
| vitest | ✅ **8/8** |
| `tsc -p tsconfig.build.json` | ⚠️ **1 오류 — 내 변경 무관** (§6) |

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| OTC 승격 렌더 소스가 구조화 필드로 고정 | ✅ §3 |
| `bodyMarkdown` 소비자 노출 경로 차단 | ✅ §4-3 (타입·동작 양쪽) |
| DB migration | ✅ **0** |
| 기존 데이터 일괄 수정 | ✅ **0** |
| 주석 보유 초안에서 소비자 HTML 주석 문구 0 | ✅ 4/4 |
| P3·P4 재검증 | ✅ §4-2 |
| 구조화 4필드 누락 없음 · 숫자·단위·연령 유지 | ✅ 5/5 |
| 주석 없는 설명서와 비교 | ✅ §4-3 |
| HFF 등 타 제품군 영향 없음 | ✅ §4-5 |

---

## 6. 미해결 — **build 는 통과하지 못했다 (내 변경 무관)**

```text
src/modules/content-guard/__tests__/fixtures/known-errors.ts(8,40):
  error TS2307: Cannot find module '../product-description-guard.types.js'
```

- 출처: **타 세션 커밋 `e41c78157` (`wip(content-guard)`)**. import 경로가 `../` 인데 실제 위치상 `../../` 여야 한다.
- **내 변경을 stash 해도 동일하게 실패** → HEAD 기준 선행 결함이다. 내 파일은 build 오류 **0**.
- 해당 모듈을 다른 세션이 작업 중이라 **건드리지 않았다**. 그쪽 세션이 정리할 사안이다.

> 정직한 상태: **typecheck·unit test 통과 / build 는 타 세션 WIP 로 차단**.

---

## 7. 후속

| 순서 | WO | 비고 |
|:---:|---|---|
| 2 | `translatorNote` 파생 제공 | 번역 입력 구조(SEPARATION §4-3) |
| 3 | `mdToHtml` 인용 블록 안전망 | 본 WO 로 누출 경로는 이미 차단됨 → 우선순위 낮음 |
| — | 한국어 canonical 승격 → 영문 저장 | PILOT-VALIDATION §5-G 선결 ①③ 남음 |
