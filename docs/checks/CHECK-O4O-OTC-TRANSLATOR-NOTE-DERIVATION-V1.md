# CHECK-O4O-OTC-TRANSLATOR-NOTE-DERIVATION-V1 — translatorNote 파생 제공

WO: `WO-O4O-OTC-TRANSLATOR-NOTE-DERIVATION-V1` · 일자: 2026-07-16 · 상태: 완료
설계: [CHECK-...-TRANSLATOR-NOTE-SEPARATION-V1](CHECK-O4O-OTC-TRANSLATOR-NOTE-SEPARATION-V1.md) §4-2·§4-3 · 선행: [CHECK-...-RENDER-SOURCE-STRUCTURED-FIELDS-V1](CHECK-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1.md)
규칙: **CR-021**(주석 분리) · **DR-019**(투여경로)

> **파생만 한다.** DB write **0** · migration **0** · `bodyMarkdown` 변경 **0** · canonical 승격 **0** · 영문 저장 **0** · UI 구현 **0** · `mdToHtml` 수정 **0**.

---

## 1. 결론

> **translatorNote 파생이 실제 95건에서 정확히 동작한다.** 추출 **33** / null **62** — DB 실측(선두 인용 33)과 **완전 일치**, **오탐 0 · 미검출 0**.
> 소비자 HTML 주석 누출 **0**, 인용 표기(`>`) 잔존 **0**, `bodyMarkdown` 변경 **0**.
> 단위 테스트 **20/20**(신규 12 + 기존 8).

---

## 2. 구현

### 2-1. 신규 — `modules/neture/drug-import/drug-otc-translation-input.ts`

| 함수 | 역할 |
|---|---|
| `deriveTranslatorNote(bodyMarkdown)` | 선두 연속 인용 블록 → `translatorNote`. 인용 표기·여분 공백 정리. 없으면 `null` |
| `buildDrugOtcTranslationInput(content, opts)` | `{ consumerSource, translatorNote, meta }` 로 **분리 제공** |

**파생 규칙**

```text
선두 연속 '>' 블록      → translatorNote (표기 제거, 내용 문자열은 불변)
선두에 인용 없음        → translatorNote = null   (내용 기반 추정 안 함 = 오탐 0)
본문 중간 인용          → 자동 추출 안 함 + midBodyQuoteNeedsReview = true (검토 대상)
```

**번역 입력 구조** (WO 요구 형태 그대로)

```jsonc
{
  "consumerSource": { "efficacy", "usage", "usageLabel", "caution", "summaryTable" },  // ← 번역 대상
  "translatorNote": "같은 성분 550mg 정은 전문의약품이다(§6)…",                        // ← 참고 전용
  "meta": { "title", "groupKey", "midBodyQuoteNeedsReview" }
}
```

- `consumerSource` 에 `bodyMarkdown` **없음** — 번역 대상에 주석이 섞일 경로가 없다.
- `translatorNote` 는 `consumerSource` 에 **병합하지 않는다** — 내용을 영문 본문에 옮기면 T-04(원문에 없는 정보 추가) 위반.
- 소비자 HTML 은 **기존 구조화 필드 빌더 그대로**(선행 WO) — 이번 변경으로 건드리지 않았다.

---

## 3. 검증 — 실제 초안 **95건 전수** (read-only)

| 항목 | 결과 | 기대 |
|---|---:|---|
| `translatorNote` 추출 | **33** | DB 실측 선두 인용 **33** ✅ |
| `null`(주석 없음) | **62** | 95 − 33 ✅ |
| **오탐**(주석 없는데 추출) | **0** | ✅ |
| **미검출**(주석 있는데 null) | **0** | ✅ |
| 본문 중간 인용(검토 대상) | **0** | 조사 결과와 일치 ✅ |
| 인용 표기(`>`) 잔존 | **0** | ✅ |
| **소비자 HTML 주석 누출** | **0** | ✅ |
| **`bodyMarkdown` 변경** | **0** | ✅ |
| `consumerSource` 오염 | **0** | ✅ |

### 3-1. P3·P4 — 안전 참고정보 확인

| # | `translatorNote` (번역자에게 전달) | `consumerSource` (번역 대상) |
|---|---|---|
| **P3** 나프록센나트륨 275mg | `같은 성분 550mg 정은 전문의약품이다(§6). 이 설명서는 275mg OTC 그룹에 한정한다.` | `usage`: `처음 2정(550mg)…6~8시간…1,350mg` **수치 유지** · 주석 문구 **0** |
| **P4** 클로트리마졸 질정 | `이름은 '정'이지만 **질 내 삽입 질정**이다(내복 금지). §3.6에 따라 "사용 안내"로 표기하며 수동 큐레이션 대상.` | `usageLabel`: **`사용 안내`**(DR-019 경로 신호) · `usage`: `질 내 깊숙이 삽입` · 주석 문구 **0** |

> **두 사례 모두 "제외하되 열람" 이 성립한다** — 오역을 막을 근거는 번역자에게 가고, 소비자 본문에는 없다.

### 3-2. 누출 판정 시 오탐 2건 — 추적해 기각

| 표기 | 실제 출처 | 판정 |
|---|---|---|
| `550mg` · `혈전색전증` · `상호작용` | `usage` · `caution` · `summaryTable` | 오탐 — 주석과 본문이 어휘를 공유하는 것은 정상 |
| **`내복 금지`** (P4) | **`summaryTable.주의 대상` = "내복 금지, 생리 중 사용 금지, 임부 상담"** | 오탐 — 구조화 필드의 원래 내용 |

**정확한 판정식** = 주석 어절 중 **구조화 필드에 없는 것(주석 고유)** 만 검사. 이 기준으로 95건 전수 **누출 0**.

### 3-3. 단위 테스트 — **20/20 PASS**

`__tests__/drug-otc-translation-input.test.ts` (신규 **12**) + `drug-otc-description-consumer-html.test.ts` (기존 **8**)

| 잠근 것 |
|---|
| 선두 인용 추출 · 인용 표기 제거 |
| 인용 없음 → `null` (`''`·`null`·`undefined` 포함) — 오탐 방지 |
| 여러 줄 연속 인용 → 한 주석 |
| 본문 중간 인용 → 추출 안 함 + 검토 플래그 |
| `bodyMarkdown` 불변 |
| `consumerSource` 에 주석 미포함 |
| P3 — 번역자가 `550mg=전문의약품` 근거 수신 + 본문 수치 유지 |
| P4 — 번역자가 `내복 금지` 근거 수신 + `usageLabel='사용 안내'` |
| 주석 미보유 초안 정상 처리 |
| **주석 고유 어절이 소비자 HTML 에 0** (P3·P4) |

---

## 4. typecheck / build

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` — **내 파일** | ✅ **0 오류** |
| `tsc --noEmit` — 저장소 전체 | **12** (선행 WO 이후 변동 없음 — 전부 기존 스크립트 간 전역 스코프 충돌, 내 변경 무관) |
| vitest | ✅ **20/20** |
| `tsc -p tsconfig.build.json` | ⚠️ **1 오류 — 내 변경 무관** (§5) |

---

## 5. 기존 build 장애 — 원인 별도 기록 (WO 요구)

```text
src/modules/content-guard/__tests__/fixtures/known-errors.ts(8,40):
  error TS2307: Cannot find module '../product-description-guard.types.js'
```

| 항목 | 내용 |
|---|---|
| **원인** | 타 세션 커밋 **`e41c78157` (`wip(content-guard)`)**. `__tests__/fixtures/` 에서 `../product-description-guard.types.js` 로 import — 실제 위치상 **`../../`** 여야 한다 |
| **내 변경과의 관계** | **무관.** 본 WO 이전(선행 WO 시점)부터 재현되며, 내 변경을 stash 해도 동일 실패 |
| **왜 안 고쳤나** | 해당 모듈을 **다른 세션이 작업 중**(WIP 커밋). 남의 진행 중 작업을 건드리면 충돌 위험 |
| **build 에 포함된 이유** | `tsconfig.build.json` 의 exclude 가 `**/*.test.ts` · `src/__tests__/**` 뿐 → `src/modules/*/__tests__/fixtures/*.ts` 는 **제외되지 않는다** |
| **해소 주체** | content-guard 세션. 또는 별도 WO 로 build exclude 정비 |

> 정직한 상태: **typecheck·unit test 통과 / build 는 타 세션 WIP 로 차단(선행 결함)**.

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| translatorNote 파생 함수와 테스트 | ✅ §2-1 · §3-3 (12건 신규) |
| 번역 입력 구조에 분리 제공 가능 | ✅ `buildDrugOtcTranslationInput` — WO 요구 형태 그대로 |
| 주석 보유 33건 추출 성공 | ✅ **33/33** |
| 주석 미보유 오탐 0 | ✅ **62/62 null** |
| P3·P4 안전 참고정보 확인 | ✅ §3-1 |
| 소비자 HTML 에 translatorNote 문구 0 | ✅ 95건 전수 |
| 내용이 번역문에 자동 추가되지 않음 | ✅ `consumerSource` 와 분리 — 병합 경로 없음 |
| 기존 `bodyMarkdown` 변경 0 | ✅ |
| typecheck 결과 기록 | ✅ §4 |
| 기존 build 장애 원인 별도 기록 | ✅ §5 |
| DB write · migration · 승격 · 영문 저장 · UI · `mdToHtml` | ✅ **전부 0** |

---

## 7. 후속

| 순서 | 항목 | 비고 |
|:---:|---|---|
| 3 | `mdToHtml` 인용 블록 안전망 | 누출 경로는 선행 WO 로 이미 차단 — 잔존 위험은 **미사용 함수의 재사용** 뿐 |
| — | 번역 입력 **소비 지점**(UI·배치) | 본 WO 는 함수까지. 실제 번역 워크플로 연결은 별도 |
| — | 한국어 canonical 승격 → 영문 저장 | PILOT-VALIDATION §5-G 선결 ①③ 남음 |
