# OTC-DESCRIPTION-DESIGN-GUIDE — 일반의약품 설명서 화면 디자인 지침

상태: **Draft V0.1** (2026-07-15) · 대상: **일반의약품(OTC) 전용** · 진입: [DOCUMENT-INDEX](common/DOCUMENT-INDEX.md)
번역 기준: [OTC-EN-TRANSLATION-GUIDE](OTC-EN-TRANSLATION-GUIDE.md) · 테스트 기록: [OTC-DESCRIPTION-DESIGN-TEST-LOG](OTC-DESCRIPTION-DESIGN-TEST-LOG.md)

> 이 문서는 **새 디자인 시스템을 만들지 않는다.** 이미 구현된 공용 렌더러를 그대로 쓴다.
> 테스트에서 발견된 문제는 TEST-LOG에 기록하고, 반복되는 것만 이 문서에 반영한다.

---

## 0. 한 줄 기준

```text
설명서 디자인은 이미 존재한다.
한국어·영문 모두 ContentRenderer variant="store-description" 를 그대로 쓴다.
저자와 이 문서는 새 CSS·새 픽셀값·새 class 를 만들지 않는다.
```

**SSOT = 코드**: `packages/content-editor/src/components/ContentRenderer.tsx:137-225`
(설계 근거: [WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1](../work-orders/WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1.md))

아래 §4 수치는 **그 코드를 옮겨 적은 것**이다. 값이 다르면 **코드가 맞다.**

---

## 1. 콘텐츠와 디자인의 분리

| 담당 | 내용 |
|---|---|
| **콘텐츠(저자)** | 시맨틱 HTML — `sd-*` class 구조만. 문구와 구조에 집중. |
| **디자인(렌더러)** | 폰트·색·여백·**반응형**·라이트/다크. 저자는 손대지 않는다. |

**금지**: `<style>` 태그 · 인라인 `style` · 임의 class.
`<style>`은 write-path sanitizer(`apps/api-server/src/modules/neture/utils/sanitize-description-html.util.ts`)가 **태그째 제거**하므로 넣어도 저장되지 않는다. 시맨틱 태그와 class 는 무손실 보존된다.

**class 어휘 = 디자인 시스템과의 계약**이다. 어휘 밖 class 는 스타일이 붙지 않는다. 확장이 필요하면 이 문서를 고치지 말고 **렌더러 WO**를 낸다 (§8).

---

## 2. 구조 표시 방식

기존 `sd-*` 어휘를 그대로 쓴다 (전체 목록: [HFF AGENT-KICKOFF §5](products/health-functional-food/AGENT-KICKOFF.md)).

| 요소 | class | 비고 |
|---|---|---|
| 최상위 | `sd-card` | 루트. 카테고리 테마는 `sd-theme-*` |
| 제목부 | `sd-hero` (`h1 > small`, `sd-badges > sd-badge`, `sd-meta`) | |
| 본문 | `sd-body` | |
| 도입 | `sd-intro` | |
| 섹션 제목 | `<h2>` | 가운데 정렬 + 밑줄 자동 |
| 목록 | `sd-why` / `sd-who` (`ul > li`) | 불릿 자동 |
| 핵심 항목 | `sd-core > sd-item` (`sd-tag`, `h3`, `p`) | **반응형 다단 대상** |
| 사용법 | `sd-intake` (`small`) | |
| 태그 | `sd-chips` (`ul > li`) | |
| 규격 | `sd-spec` | |
| 상담 유도 | `sd-cta` (`sd-cta-k`, `p`) | |
| 하단 | `sd-foot` | |

> ⚠️ **주의사항 전용 class 는 없다.** 현재 어휘에 경고·금기 강조 표시가 없다 — 일반의약품에는 **금기·주의사항이 필수**인데(번역 GUIDE T-03) 시각적으로 구분할 수단이 없다. **미해결 항목** (§8-A). 임의 class 를 만들지 말 것.

---

## 3. 화면 목록 (동일 콘텐츠 재사용 대상)

같은 설명서 1건이 아래 화면에 그대로 재사용된다.

| # | 화면 | 경로 | 렌더러 적용 |
|---|---|---|---|
| A | Neture 상품 QR 랜딩 (모바일) | `/p/:publicKey` | ✅ `variant="store-description"` |
| B | KPA 약사용 모달 (PC) | 모달 (라우트 없음) | ✅ `variant="store-description"` |
| C | KPA 태블릿 키오스크 (매장) | `/tablet/:slug` | ❌ **variant 미지정 → 무스타일** |
| D | KPA 다국어 공개 랜딩 | `/multilingual-products/:publicKey` | ❌ **ContentRenderer 미사용** |

> ⚠️ **"QR 화면과 태블릿 화면에서 동일 콘텐츠 재사용"은 아직 절반만 달성**이다. C·D는 A·B와 다르게 보인다 — 렌더러 WO §3 "후속 전환"에 미완으로 기재돼 있다. 이 문서는 **A·B 기준**으로 쓰고, C·D는 전환 후 동일 적용된다 (§8-B).

---

## 4. 반응형 기준 (필수 — 선택 아님)

### 4.1 핵심: 뷰포트가 아니라 **컨테이너** 기준

설명서는 `@media`(화면 폭)가 아니라 **`@container`(콘텐츠가 놓인 폭)** 로 반응한다 (`ContentRenderer.tsx:143` `container-type:inline-size`).

**모달·키오스크 패널처럼 좁은 슬롯에 넣으면 PC에서도 폰 레이아웃이 나온다.** 이는 버그가 아니라 의도된 동작이다.

**분기점은 2개뿐:**

| 컨테이너 폭 | `sd-core` 단 구성 | 근거 |
|---|---|---|
| `< 640px` | **1열** | `ContentRenderer.tsx:190` |
| `≥ 640px` | **2열** | `:214` |
| `≥ 900px` | **3열** | `:224` |

> 640 은 Tailwind `sm` 과 일치한다(전 서비스 tailwind config 에 `screens` 재정의 없음 = v3 기본값). 900 은 이 렌더러 고유값이다.
> 사이드바·페이지 크롬의 뷰포트 기준(`lg` = 1024)은 별도 표준이며 설명서 본문에는 적용되지 않는다 → [O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1](../baseline/O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1.md).

### 4.2 고정값

| 항목 | 값 | 근거 |
|---|---|---|
| 카드 최대 폭 | **860px** (`margin:0 auto` 중앙) | `:172` |
| 래퍼 좌우 여백 | **14px** (상 24 / 하 50) | `:145` |
| 본문 좌우 여백 | **22px** → ≥640: **40px** | `:181`, `:211` |
| 히어로 여백 | `28px 22px 24px` → ≥640: `40px 34px 32px` | `:174`, `:206` |
| 도입문 최대 폭 | ≥640 에서 **68ch** | `:212` |
| 상담문 최대 폭 | ≥640 에서 **62ch** | `:222` |

### 4.3 화면별 (계산값 — **테스트로 검증 필요**)

컨테이너 폭 ≈ 뷰포트 − 래퍼 여백 28px (호스트 페이지 여백은 별도).

| 화면 | 뷰포트 | 컨테이너 | 단 | 카드 폭 | h1 | 본문 |
|---|---|---|---|---|---|---|
| 모바일 | 375 | ~347 | **1열** | 347 | 32px | 15.5px |
| 태블릿 세로 | 768 | ~740 | **2열** | 740 | 44px | 17px |
| 태블릿 가로 | 1024 | ~996 | **3열** | **860 상한** | 44px | 17px |
| PC | 1280+ | ~1252 | **3열** | **860 상한** | 44px | 17px |

> **태블릿 가로와 PC 는 결과가 같다** — 카드가 860 에서 멈추고 중앙 정렬되므로. 그 이상 넓혀도 변화 없다.
> ⚠️ 위는 계산값이다. 실제 호스트 페이지 여백이 더해지면 분기점이 달라진다. 특히 **경계 근접 화면 2건은 반드시 실측**:
> - **B 모달** (`maxWidth:640`, `padding:18`) → 컨테이너 ~576 → **PC인데 1열**로 추정.
> - **A 랜딩** (`max-w-2xl` = 672) → 컨테이너 ~644 → 640 경계에서 **4px 차이로 2열**. 여백이 조금만 늘면 1열로 떨어진다.

### 4.4 타이포그래피 (`< 640` → `≥ 640`)

| 요소 | 폰 | ≥640 |
|---|---|---|
| `sd-hero h1` | 32px | **44px** |
| `h1 small` | 15px | 17px |
| `sd-body h2` | 18px | 21px |
| `sd-intro` | 15.5px / 1.75 | 17px / 1.8 |
| `sd-item h3` / `p` | 18 / 15px | 19 / 15.5px |
| `sd-foot` | 12px | — |

폰트: Pretendard → Apple SD Gothic Neo → Malgun Gothic → **Inter** → system-ui (`:144`). 한글·영문 동일 스택이며 영문은 Inter 로 떨어진다.

---

## 5. 언어 전환 UI

> ⚠️ **현재 표준이 없다.** 4개 화면이 **각자 구현**했고 `LOCALE_LABELS` 가 4곳에 중복돼 있다.

| 화면 | 형태 | 위치 |
|---|---|---|
| A | `[🇰🇷 한국어][🌐 Other Languages]` → 모바일 바텀시트 | 본문 상단 |
| B | 작은 알약 탭 | 모달 헤더 |
| C | `[기본]` + 로케일 버튼 (터치 44px) | 상단 |
| D | 알약(모바일) / `min-h-44px` 큰 탭(태블릿) | 상단 |

**OTC 기준 (잠정)**:

- 위치는 **본문 위**, 콘텐츠 카드 **바깥**. 카드 안에 넣지 않는다(인쇄·QR 캡처 시 섞임).
- 언어가 1개뿐이면 **표시하지 않는다** (A·D 기존 동작).
- 터치 대상 **최소 44×44px** — C·D 가 이미 이 값을 쓴다. 이것을 기준으로 삼는다.
- 공통 컴포넌트 추출은 **이 문서 범위 밖** — 4중 중복이라 별도 WO 필요 (§8-C).

---

## 6. 접근성·가독성

렌더러가 제공하는 것 (저자 작업 불필요):

- **라이트/다크 자동** — `prefers-color-scheme` + `:root[data-theme]` 양쪽 (`:147-161`).
- `box-sizing:border-box` 전역 (`:171`), `-webkit-font-smoothing:antialiased` (`:145`).
- 본문 행간 1.64~1.8 — 장문 가독 확보.

저자가 지킬 것:

- **의미 전달을 색에만 의존하지 않는다** (다크 모드·색각 이상 대비). 금기·주의는 문장으로 명시한다.
- 제목 계층을 건너뛰지 않는다 (`h1` → `h2` → `h3`).
- 화면 확대(브라우저 200%)는 컨테이너 폭을 줄이는 효과 → 자동으로 좁은 레이아웃으로 떨어진다. 별도 대응 불필요하나 **검증 항목**이다.

---

## 7. 영문 길이 증가 대응

영문은 한국어보다 **길어진다**. 이 시스템에서 위험한 지점:

| 지점 | 위험 |
|---|---|
| `sd-hero h1` (≥640 에서 44px) | 긴 영문 제목이 2~3줄. `text-wrap:balance` 는 균형만 맞출 뿐 **줄이지 않는다** |
| `sd-item` (2~3열 그리드 트랙) | 트랙 폭 고정 → 긴 성분명이 넘침 |
| `sd-chips` / `sd-badge` (알약) | 긴 단어가 알약을 뚫음 |

> ⚠️ **줄바꿈 규칙이 없다** — `.store-desc-content` 스코프에 `word-break` / `overflow-wrap` / `hyphens` 선언이 **하나도 없다**. 긴 영문 단어(성분명·URL·SKU)는 기본값 `overflow-wrap:normal` 로 **넘치고**, `sd-card` 의 `overflow:hidden`(`:172`) 때문에 **스크롤이 아니라 잘린다**. → **미해결** (§8-D).

**저자 대응 (지금 할 수 있는 것)**: 제목·태그·알약에 **긴 단일 단어를 넣지 않는다**. 긴 성분명은 본문(`p`)에 둔다. 번역 GUIDE T-07(재표현 허용) 범위에서 짧게 쓰되, **정보를 줄이지는 않는다**(T-03).

---

## 8. 미해결 항목 (문서로 해결 못 함 — 코드 WO 필요)

이 WO는 문서 작업이므로 아래는 **기록만** 한다. 각각 별도 WO 대상이다.

| # | 항목 | 영향 |
|---|---|---|
| **A** | **주의사항·금기 전용 class 부재** | OTC 필수 정보를 시각적으로 강조할 수단 없음 (§2) |
| **B** | **C 키오스크 variant 미지정 / D 렌더러 미사용** | 같은 설명서가 화면마다 다르게 보임 (§3) |
| **C** | **언어 전환 UI 4중 중복** | 화면마다 조작이 다름 (§5) |
| **D** | **줄바꿈 규칙 부재 + `overflow:hidden`** | 긴 영문 단어가 잘림 (§7) |
| **E** | **표(`<table>`) 소비 측 가로 스크롤 없음** | `.tableWrapper{overflow-x:auto}` 가 `.content-editor .ProseMirror` **편집기에만** 스코프됨(`tableKit.ts:45`). 소비 측은 `table-layout:fixed; width:100%` + 카드 `overflow:hidden` → 넓은 표가 **찌그러지고 잘림**. `sd-*` 표 class 도 없음 |

> **E 관련 저자 지침 (잠정)**: 표는 `sd-*` 계약에 없다. **설명서에 `<table>` 을 쓰지 않는다.** 표로 표현하고 싶은 내용은 `sd-core > sd-item` 또는 `sd-why` 목록으로 표현한다 — 이쪽이 이미 반응형이다.

---

## 9. 다른 언어로의 확장

이 문서는 **언어 중립**이다. 디자인 구조는 ko·en·zh 공통이며 언어별 분기를 두지 않는다.
언어 추가 시 이 문서는 그대로 쓰고, 해당 언어의 길이 특성만 §7 에 1줄 추가한다.

---

## 10. 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| V0.1 | 2026-07-15 | 초안 작성 (`WO-O4O-OTC-DESCRIPTION-DESIGN-GUIDE-DOCS-V1`). 신규 디자인 정의 없음 — 기존 `ContentRenderer variant="store-description"` 실측값 정리 + 미해결 5건(§8) 기록. 화면 실측 검증 전. |
