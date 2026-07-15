# CHECK-O4O-MDTOHTML-BLOCKQUOTE-SAFETY-GUARD-V1 — `mdToHtml` 인용 블록 안전망

WO: `WO-O4O-MDTOHTML-BLOCKQUOTE-SAFETY-GUARD-V1` · 일자: 2026-07-16 · 상태: 완료
선행: [RENDER-SOURCE-STRUCTURED-FIELDS](CHECK-O4O-OTC-CANONICAL-RENDER-SOURCE-STRUCTURED-FIELDS-V1.md) · [TRANSLATOR-NOTE-DERIVATION](CHECK-O4O-OTC-TRANSLATOR-NOTE-DERIVATION-V1.md) · 규칙: **CR-021**

> DB 변경 **0** · 초안 수정 **0** · translatorNote 구조 변경 **0** · canonical 승격 **0** · 번역 저장 **0** · 렌더러 재설계 **0**.

---

## 1. 결론

> **인용 블록 처리 정책 = 렌더 제외**로 확정하고, `mdToHtml` **사본 2개를 공용 변환기 1개로 통합**했다.
> 95건 전수: 인용 블록 **33개 제외**(DB 실측과 일치) · 주석 누출 **0** · `&gt;` 잔존 **0** · **본문 손실 0**.
> 1차 경로(`buildDrugOtcConsumerHtml`) 출력은 95건 **바이트 단위 완전 동일 — 회귀 0**. 테스트 **32/32**.

> ⚠️ **조사에서 선행 WO 의 누락을 발견했다.** `mdToHtml` 은 **1개가 아니라 2개**였고, 두 번째(`vitc1000`)는 **여전히 `bodyMarkdown` 을 렌더**하고 있었다(§2). 선행 WO 의 "렌더 소스 고정"은 **1/2 만 적용된 상태**였다 — 본 WO 로 그 경로도 안전망 아래로 들어왔다.

---

## 2. 조사 — `mdToHtml` 사용처 전수

| # | 위치 | 상태(작업 전) | 인용 처리 |
|---|---|---|---|
| 1 | `scripts/drug-otc-nutrition-combo-canonical-promotion.ts:100` | 선행 WO 로 **미사용**(구조화 필드 전환) | 없음 |
| 2 | **`scripts/drug-otc-nutrition-combo-vitc1000-persist-promote.ts:34`** | **사용 중** — `mdToHtml(bodyMarkdown)` (`:127`) | 없음 |

- **두 사본은 로직 동일**(포맷만 상이, 자체 주석에 "promotion 스크립트와 동일 변환"). **중복이 누락의 원인**이었다.
- 그 외 md→HTML 변환기 **없음**.
- ② 대상 draft = `비타민 C 1000mg 정제`(`6f143bbc…`). **이 초안은 주석 미보유** → 실제 누출은 없었다. **경로만 열려 있었다.**

### 2-1. 인용 처리 정책 결정 (문맥 확인 후)

| 확인 | 결과 |
|---|---|
| OTC 초안 95건에서 `>` 용도 | **100% 내부 편집 주석** (선두 33 / 중간 0) |
| 소비자용 인용문 용례 | **0건** |
| 주석 제거 시 정보 손실 | **없음** — 원문은 `bodyMarkdown` 보존, 번역자는 `translatorNote` 수신(CR-021) |

→ **렌더 제외**로 확정. blockquote 별도 렌더는 **필요 사례가 없어** 만들지 않았다.
→ 소비자 인용문을 쓰는 초안 형식이 생기면 **정책 재검토**(문서에 명시). **문맥 확인 없는 일괄 삭제가 아니다.**

---

## 3. 변경

### 3-1. 신규 — `modules/neture/drug-import/draft-markdown-to-html.ts`

```ts
draftMarkdownToHtml(md) → { html, droppedQuoteBlocks }
```

- 인용(`>`) 연속 블록을 **한 덩어리로 소비하고 출력하지 않는다**. `droppedQuoteBlocks` 로 계측(>0 = 주석이 소비자 경로로 들어올 뻔했다는 신호).
- 제목·표·`**볼드**`·문단·escape 는 **기존 로직 그대로**.
- 헤더에 **1차 원칙이 우선**임을 명시: *"OTC bodyMarkdown 은 소비자 렌더 소스로 쓰지 않는다. 본 함수는 2차 안전망이다."*

### 3-2. 사본 제거 — 통합

| 파일 | 변경 |
|---|---|
| `canonical-promotion.ts` | 미사용 `mdToHtml` **삭제**. 표시 문구도 실제와 일치시킴(`html (bodyMarkdown→mdToHtml)` → `html (구조화 필드→sd-*)`) |
| `vitc1000-persist-promote.ts` | 자체 `mdToHtml` **삭제** → 공용 `draftMarkdownToHtml` 사용 + `droppedQuoteBlocks>0` 시 로그 |

**저장소 내 `mdToHtml` 잔존 0.** 변환기는 이제 **1개**다 → 같은 누락이 반복될 수 없다.

---

## 4. 검증

### 4-1. 실제 초안 95건 전수 (read-only)

| 항목 | 결과 |
|---|---|
| 제외한 인용 블록 | **33** (DB 실측 선두 인용 33과 일치) |
| **주석 누출** (주석 고유 어절 기준) | **0** |
| `&gt;` 잔존 | **0** |
| **본문 손실** (주석 제외 후 효능 문구 유지) | **0** |

### 4-2. P3·P4

| # | 결과 |
|---|---|
| **P3** | `전문의약품이다`·`한정한다`·`§6` **0회**. 표·`<strong>효능·효과</strong>`·`나프록센나트륨 275mg`·`골관절염` **유지** |
| **P4** | `내복 금지`·`큐레이션` **0회**. 본문 `칸디다성 질염에 사용합니다` **유지** |

### 4-3. 기존 렌더 결과 회귀 — **0**

- **`buildDrugOtcConsumerHtml` 95건 출력이 변경 전/후 완전 동일**(`diff` 무차이, 146,261자). 1차 경로 무영향 확인.
- 제목 레벨·표(thead/tbody)·`<br>` 문단·`**볼드**`·HTML escape 회귀 없음(단위 테스트).

### 4-4. 단위 테스트 — **32/32 PASS**

| 파일 | 수 |
|---|---:|
| `draft-markdown-to-html.test.ts` (**신규**) | 12 |
| `drug-otc-description-consumer-html.test.ts` | 8 |
| `drug-otc-translation-input.test.ts` | 12 |

신규 12건이 잠그는 것: P3·P4 주석 미노출 · `&gt;` 0 · 다중 인용 1블록 · **중간 인용 제외** · 인용 없으면 무변경 · 제목/표/문단/볼드/escape 회귀 · 빈 입력.

### 4-5. typecheck / build

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` — **내 파일** | ✅ **0 오류** |
| `tsc --noEmit` — 저장소 전체 | **12 → 7** (사본 제거로 스크립트 간 전역 스코프 충돌 **5건 추가 해소**) |
| vitest — 내 3개 스위트 | ✅ **32/32** |
| `tsc -p tsconfig.build.json` | ⚠️ **1 오류 — 내 변경 무관** (§6) |

> 참고: `services/__tests__` 의 **다른 4개 스위트는 `describe is not defined` 로 실패**하나 **HEAD 에서도 동일 실패**하는 선행 문제다(vitest import 누락, globals 미설정). 내 변경 무관.

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| `mdToHtml` 인용 처리 정책 확정 | ✅ **렌더 제외** (§2-1, 문맥 확인 후) |
| 내부 주석 노출 방지 | ✅ 95건 전수 누출 0 |
| 기존 렌더 결과 회귀 없음 | ✅ 1차 경로 바이트 동일 · 변환 동작 테스트 |
| 사용처 전수 확인 | ✅ **2곳 발견**(선행 WO 누락 포함) |
| 단위 테스트 추가 | ✅ 12건 |
| typecheck / build 기록 | ✅ §4-5 · §6 |
| DB · 초안 · translatorNote · 승격 · 번역 저장 · 렌더러 재설계 | ✅ **전부 0** |

---

## 6. build 장애 — 타 세션 문제와 분리 기록 (WO 요구)

```text
src/modules/content-guard/__tests__/fixtures/known-errors.ts(8,40):
  error TS2307: Cannot find module '../product-description-guard.types.js'
```

| 항목 | 내용 |
|---|---|
| **원인** | 타 세션 커밋 **`e41c78157` (`wip(content-guard)`)** — import 경로가 `../` 인데 실제로는 `../../` 여야 한다 |
| **내 변경과의 관계** | **무관.** 본 WO 이전부터 재현, stash 후에도 동일 |
| **왜 안 고쳤나** | 해당 모듈을 **다른 세션이 작업 중** |
| **구조적 원인** | `tsconfig.build.json` exclude 가 `**/*.test.ts`·`src/__tests__/**` 뿐 → `src/modules/*/__tests__/fixtures/*.ts` 미제외 |
| **해소 주체** | content-guard 세션 / 또는 build exclude 정비 WO |

**내 작업 상태: typecheck·unit test 통과 / build 는 타 세션 WIP 로 차단(선행 결함).**

---

## 7. 남은 것

| 항목 | 비고 |
|---|---|
| **`vitc1000` 스크립트의 1차 원칙 미적용** | 현재 `bodyMarkdown` 을 렌더한다(안전망으로 주석 누출은 차단됨). 원칙대로면 **구조화 필드**로 전환해야 한다. 대상 초안이 주석 미보유라 위험은 낮으나 **일관성 부채** → 후속 WO 후보 |
| 주석 관련 선결사항 | **종료** (분리 설계 → 렌더 소스 고정 → translatorNote 파생 → 안전망) |
| 다음 | **DR-019 투여경로 데이터 보강** |
