# CHECK-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1 — `sd-hero` 긴 영문 잘림 수정

WO: `WO-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1` · 일자: 2026-07-15 · 상태: 완료
근거: [CHECK-...-PILOT-VALIDATION-V1 §5-D](CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1.md) (결함 실증) · 계약: [STORE-DESCRIPTION-CLASS-CONTRACT V1.1](../guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md) (CR-020)

> **코드 수정 1건.** DB 변경 **0** · 마이그레이션 **0** · 콘텐츠 변경 **0** · 제품군별 CSS **0**.

---

## 1. 결론

> **수정 완료.** `sd-hero h1` 의 긴 영문 단어가 **594px → 301px(= 컨테이너 폭)** 로 줄바꿈되어 **잘림이 사라졌다.**
> **27/27 PASS** — 반응형 1·2·3열, 640 경계, 한국어, KPA 모달·Neture 랜딩 **전부 무회귀**. typecheck·build 통과.
> 새 CR **미신설** — CR-020(계약) 범위 내로 설명 가능(§5).

---

## 2. 문제 (파일럿 실증)

```text
.store-desc-content { overflow-wrap: normal }   ← 긴 단어를 쪼개지 않음
+ .sd-card { overflow: hidden }                 ← 넘친 부분을 잘라냄
→ sd-hero h1 (375px): scrollWidth 594 vs clientWidth 301
→ 가로 스크롤 0 → 사용자는 글자가 잘린 사실조차 인지 못 함
```

증거: [수정 전 스크린샷](../guides/products/drug/pilot-en-design/evidence/P-3-long-english-word-clipped-375px.png) — `Hydroxypropylmethylcellulosephthalate` 가 `Hydroxypropylmethyl` 에서 잘려 사라짐.

**영향 범위**: 영문·중문 등 **모든 외국어 설명서**. 성분명·URL·SKU 등 공백 없는 긴 문자열 전반. 한국어는 CJK 특성상 기본 줄바꿈되어 미영향.

---

## 3. 수정 (최소 변경 1곳)

`packages/content-editor/src/components/ContentRenderer.tsx` — `.store-desc-content` **스코프 루트 1곳**:

```css
overflow-wrap:anywhere; word-break:normal;
```

| 결정 | 이유 |
|---|---|
| **`anywhere`** (≠ `break-word`) | `anywhere` 는 **min-content 기여도까지 낮춘다** → `sd-core` 등 grid/flex 트랙이 긴 단어 때문에 넘치는 것도 함께 막는다. `break-word` 는 트랙 넘침을 못 막는다 |
| **`word-break:normal` 명시** | `break-all`(일반 단어 임의 분절) 방지 = **한국어·정상 영문 줄바꿈 무변경** 보장 |
| **스코프 루트 1곳** | `overflow-wrap` 은 상속 → h1·chips·badge·item·table 전부 커버. 선택자 나열 불필요 |
| **`sd-card{overflow:hidden}` 유지** | 카드 radius 클리핑에 필요. 줄바꿈이 보장되면 넘칠 일이 없어 **건드릴 이유 없음** |
| **제품군별 CSS 0** | 계약(CR-020) 위반. 공통 렌더러만 수정 |

---

## 4. 검증 (Playwright 실측)

렌더러 소스에서 `storeDescriptionCss` 를 **추출**해 실제 렌더 — CSS 하드코딩·재작성 없음 → 측정값 = 프로덕션 동작.

### 4-1. 핵심 지표

| 지표 | 수정 전 | 수정 후 |
|---|---|---|
| `sd-hero h1` (375px) scrollWidth vs clientWidth | **594 > 301** (잘림) | **301 = 301** ✅ |
| 계산값 `overflow-wrap` / `word-break` | normal / normal | **anywhere / normal** |
| 가로 스크롤 | 0 (잘려서 스크롤조차 없음) | 0 (넘치지 않음) |

증거: [수정 후 스크린샷](../guides/products/drug/pilot-en-design/evidence/P-3-FIXED-long-english-word-wraps-375px.png) — 긴 단어가 **온전히 2줄로 표시**.

### 4-2. 요구 화면 × 콘텐츠 3종 = **27/27 PASS** (잘림 0 · 가로 스크롤 0)

| 콘텐츠 | 375 | **639** | **641** | 768 | 1024 | 1280 | **200% 확대** | KPA 모달 | Neture 랜딩 |
|---|---|---|---|---|---|---|---|---|---|
| 긴영문(스트레스) | 1열 | 1열 | 2열 | 2열 | 3열 | 3열 | 1열 | 1열 | 2열 |
| 일반영문(정상) | 1열 | 1열 | 2열 | 2열 | 3열 | 3열 | 1열 | 1열 | 2열 |
| 한국어 | 1열 | 1열 | 2열 | 2열 | 3열 | 3열 | 1열 | 1열 | 2열 |

### 4-3. 검증 항목 대조

| 항목 | 결과 |
|---|---|
| 긴 영문 제목 잘림 없음 | ✅ 594 → 301 |
| 가로 스크롤 없음 | ✅ 27/27 `docOverflow=0` |
| 일반 영문 제목 정상 | ✅ |
| 한국어 제목 정상 | ✅ (`word-break:normal`) |
| 기존 1열·2열·3열 반응형 유지 | ✅ 27/27 동일 |
| 640 경계 유지 | ✅ **639=1열 / 641=2열** 불변 |
| KPA 모달 (604 → 576) | ✅ 1열 불변 |
| Neture 랜딩 (672 → 644) | ✅ 2열 불변 |
| 파일럿 시안 5건 재측정 | ✅ **20/20 수정 전과 동일** |

### 4-4. 완료 기준

| 기준 | 결과 |
|---|---|
| 긴 영문 제목 결함 수정 | ✅ |
| Playwright 실측 · 스크린샷 | ✅ 27 측정 + 수정 전/후 스크린샷 2장 |
| typecheck | ✅ `tsc --noEmit` **exit 0** |
| build | ✅ tsup **Build success** (ESM 168.88 KB + DTS) |
| DB 변경 | ✅ **0** |

---

## 5. 문서 반영 — **새 CR 미신설**

| 문서 | 변경 |
|---|---|
| [STORE-DESCRIPTION-CLASS-CONTRACT](../guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md) **V1 → V1.1** | §3-1 **긴 문자열 줄바꿈 보장** 신설 (렌더러 책임 명문화) |
| [OTC-DESCRIPTION-DESIGN-GUIDE](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md) **V0.4 → V0.5** | §7 경고 → **해결 기록**, §8-D **해소** 표기 |
| [OTC-DESCRIPTION-DESIGN-TEST-LOG](../guides/OTC-DESCRIPTION-DESIGN-TEST-LOG.md) **V0.2 → V0.3** | **D-6** 기록, P-3 가설 = 수정 완료 |

**새 CR 을 만들지 않은 이유**: 이 변경은 **새 규칙이 아니라 기존 계약(CR-020)이 이미 지고 있던 책임**("반응형·디자인은 렌더러가 담당, 저자는 구조만")의 **구현 보강**이다. 계약 어휘·구조·금지 사항은 그대로다. 따라서 CR-020 SSOT 문서에 보장 항목만 추가했다 — [DOCUMENT-ARCHITECTURE §3](../guides/common/DOCUMENT-ARCHITECTURE.md) 단일 위치 · 중복 신설 금지.

버전·이력은 3개 문서 모두 **같은 커밋에서 갱신**했다 (**OR-005**).

---

## 6. 남은 것 (이번 범위 밖)

| # | 항목 |
|---|---|
| **§8-A** | 주의사항·금기 전용 class 부재 — 파일럿 P5(주의사항 237자)에서 실증. 어휘 확장이라 별도 렌더러 WO |
| **§8-B** | 태블릿 키오스크 variant 미지정 / 다국어 랜딩 렌더러 미사용 |
| **§8-C** | 언어 전환 UI 4중 중복 |
| **§8-E** | 표 소비 측 가로 스크롤 — 파일럿에서 미발생(`summaryTable`→`sd-core` 매핑으로 회피) |
| — | **실기기 검증** (iOS Safari 등). 본 검증은 Chromium 계산값 측정 |
| — | **CR-021 번역자용 주석 분리 구조** — 다음 단계 |
