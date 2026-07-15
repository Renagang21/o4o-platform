# OTC-DESCRIPTION-DESIGN-GUIDE — 일반의약품 설명서 화면 디자인 지침

상태: **Draft V0.8** (2026-07-16) · 대상: **일반의약품(OTC) 전용** · 진입: [DOCUMENT-INDEX](common/DOCUMENT-INDEX.md)
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

이 분리와 금지 사항(`<style>` · 인라인 `style` · 임의 class)은 **[클래스 계약 §5](content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md)** 소관이다 (CR-020). OTC 예외는 없다.

---

## 2. 구조 표시 방식

> **클래스 어휘 = 전 제품군 공통 계약 (CR-020).**
> 어휘 전체·금지 사항·이름 변경 영향 범위는 **[STORE-DESCRIPTION-CLASS-CONTRACT](content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md)** 에 있다. **여기서 반복하지 않는다.**
> OTC 전용 어휘는 없다 — 다른 제품군과 **같은 계약**을 쓴다.

OTC 에서 유의할 점만:

- 핵심 항목은 `sd-core > sd-item` 에 둔다 — **반응형 다단 대상**이라 긴 성분명이 넘칠 수 있다 (§7).
- 섹션 제목은 `<h2>` (별도 class 없음).

> ✅ **주의사항은 `sd-warn` 을 쓴다 (2026-07-16 신설).** 금기·경고·주의사항 전용 어휘이며 `sd-who`("이런 분께")를 재사용하지 않는다 — [클래스 계약 §2-1](content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md).
> 렌더러가 **삼각 마커 + 좌측 굵은 선 + 박스 배경**으로 구분하고(색 의존 금지), 640px 이상에서도 **1열을 유지**한다(금기가 두 열로 쪼개지면 오독).
> ✅ **공개 중인 1,372건(ko 686 + en 686) 소급 완료 (2026-07-16)** — `sd-who` 잔여 0. 전건이 `sd-warn` 이다 (§8-A).

---

## 3. 화면 목록 (동일 콘텐츠 재사용 대상)

같은 설명서 1건이 아래 화면에 그대로 재사용된다.

**설명서(SPD)를 렌더하는 화면 — 이 문서의 적용 대상**

| # | 화면 | 경로 | 렌더러 적용 | 현재 노출 |
|---|---|---|---|---|
| A | Neture 상품 QR 랜딩 (모바일) | `/p/:publicKey` | ✅ `variant="store-description"` | **686 master** (전량 `active`/`ok`) |
| B | KPA 약사용 모달 (PC) | 모달 (라우트 없음) | ✅ `variant="store-description"` | 0 (OTC listing 0건) |
| C | KPA 태블릿 키오스크 (매장) | `/tablet/*` | ✅ `variant="store-description"` **(설명서일 때만 — 아래 주)** | 0 (OTC listing 0건) |
| E | 운영자 설명서 검수 (admin) | `/admin/o4o-product-db/supplier-store-descriptions` | ✅ `variant="store-description"` | 공급자 `SUPPLIER_STORE` |

> **C 는 슬롯이 섞인다.** 같은 자리에 설명서(`sd-*`)와 평문 설명(e약은요 19,177건 등)이 모두 들어온다.
> `store-description` variant 는 래퍼에 배경·패딩·폰트를 걸므로 **평문에 주면 그 화면이 회귀**한다.
> → C 는 `hasStoreDescriptionMarkup(html)`(= `class="sd-card"` 보유)로 **설명서일 때만** variant 를 준다.
> 슬롯이 고정된 A·B·E 는 지금처럼 variant 를 직접 준다. 판별축은 `source_type` 이 아니라 **마크업**이다 —
> `o4o_product_description` 카드에도 e약은요(평문)가 오기 때문이다 (§8-B).

**설명서를 렌더하지 않는 화면 — 이 문서의 대상 아님**

| # | 화면 | 경로 | 데이터 |
|---|---|---|---|
| D | KPA 다국어 공개 랜딩 | `/multilingual-products/:publicKey` | **SPD 아님** — `store_multilingual_product_content_*` (운영자 RichTextEditor 저작 → HUB → 매장 복사). `sd-*` 를 생성하지 않으며 `source_type` enum 이 SPD 를 배제한다. |

> **D 를 "설명서 렌더 경로"로 분류하면 안 된다.** OTC 설명서가 D 에 도달할 경로는 코드상 없다 —
> 근거: [CHECK-...-8B-RENDER-PATH-AUDIT-V1](../checks/CHECK-O4O-OTC-DESIGN-8B-RENDER-PATH-AUDIT-V1.md) §5.

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

### 4.3 화면별 (**실측 확정** — 2026-07-15)

컨테이너 폭 = 뷰포트 − 래퍼 여백 28px (호스트 페이지 여백은 별도).

| 화면 | 뷰포트 | 컨테이너 | 단 | 카드 폭 | h1 | 본문 |
|---|---|---|---|---|---|---|
| 모바일 | 375 | **347** | **1열** | 347 | 32px | 15.5px |
| 태블릿 세로 | 768 | **740** | **2열** | 740 | 44px | 17px |
| 태블릿 가로 | 1024 | **996** | **3열** | **860 상한** | 44px | 17px |
| PC | 1280 | **1252** | **3열** | **860 상한** | 44px | 17px |

> **검증됨**: 파일럿 시안 5건 × 4폭 = **20 측정 전건 일치**, 가로 스크롤 0 — [CHECK-...-PILOT-VALIDATION-V1](../checks/CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1.md) · [측정 원본](products/drug/pilot-en-design/evidence/measurements-v1.json).
> **태블릿 가로와 PC 는 결과가 같다** — 카드가 860 에서 멈추고 중앙 정렬되므로.

**슬롯 폭이 분기를 결정한다 (실측)**

| 실제 화면 | 슬롯 | 컨테이너 | 단 |
|---|---:|---:|---|
| **B 모달** (`maxWidth:640`, `padding:18`) | 604 | **576** | **1열 — PC인데 폰 레이아웃** |
| **A 랜딩** (`max-w-2xl` = 672) | 672 | **644** | 2열 |
| 경계 실측 | 667 → 639 | | **1열** |
| 경계 실측 | 669 → 641 | | **2열** |

> ⚠️ **A 랜딩은 640 경계에서 4px 여유뿐이다.** 호스트 여백이 조금만 늘면 2열 → 1열로 붕괴한다. 랜딩 여백 변경 시 이 표를 다시 확인할 것.

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

> ✅ **해결됨 (2026-07-15).** 렌더러가 `overflow-wrap:anywhere; word-break:normal` 로 긴 문자열을 **자동 줄바꿈**한다 — 계약이 보장하는 안전망이다([클래스 계약 §3-1](content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md)).
> 수정 전: `sd-hero h1` **scrollWidth 594 vs clientWidth 301** → 가로 스크롤 0으로 **잘려 사라짐**([증거](products/drug/pilot-en-design/evidence/P-3-long-english-word-clipped-375px.png)).
> 수정 후: **594 → 301 = clientWidth**, 잘림 0 · 27/27 PASS([증거](products/drug/pilot-en-design/evidence/P-3-FIXED-long-english-word-wraps-375px.png) · [CHECK](../checks/CHECK-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1.md)).

**저자 대응 (권장 — 안전망과 별개)**: 줄바꿈은 보장되지만, 제목·태그·알약에 **긴 단일 단어를 넣지 않는 편이 읽기 좋다**. 긴 성분명은 본문(`p`)에 둔다. 번역 GUIDE T-07(재표현 허용) 범위에서 짧게 쓰되, **정보를 줄이지는 않는다**(T-03).

---

## 8. 미해결 항목 (문서로 해결 못 함 — 코드 WO 필요)

이 WO는 문서 작업이므로 아래는 **기록만** 한다. 각각 별도 WO 대상이다.

| # | 항목 | 영향 |
|---|---|---|
| ~~**A**~~ | ~~주의사항·금기 전용 class 부재~~ | ✅ **완전 해결 (2026-07-16)** — 계약·코드(`sd-warn` 신설 + 렌더러/빌더, `WO-O4O-SD-WARNING-CLASS-CONTRACT-AND-BUILDER-V1`) **+ 공개 중인 1,372건(ko 686 + en 686) 소급 적용**(`sd-who` 잔여 0, 클래스 외 콘텐츠 변경 0, `WO-O4O-OTC-SD-WARN-BACKFILL-1372-V1`) |
| ~~**B**~~ | ~~C 키오스크 variant 미지정 / D 렌더러 미사용~~ | ✅ **해결 (2026-07-16)** — **C**: 태블릿 설명서 슬롯 2곳(상품 상세 `description` · content_list 카드 상세)에 variant 적용 + 인라인 15px 제거. 섞이는 슬롯이라 `hasStoreDescriptionMarkup` 로 설명서일 때만 적용 → e약은요 회귀 0 (48측정 PASS). **D**: **오분류였음** — SPD 를 읽지 않는 별개 파이프라인이라 대상에서 제외(§3). 조사 = `WO-O4O-OTC-DESIGN-8B-RENDER-PATH-AUDIT-V1` / 수정 = `WO-O4O-TABLET-CONTENT-RENDERER-VARIANT-FIX-V1` |
| **C** | **언어 전환 UI 4중 중복** | 화면마다 조작이 다름 (§5) |
| ~~**D**~~ | ~~줄바꿈 규칙 부재 + `overflow:hidden`~~ | ✅ **해결 (2026-07-15)** — `overflow-wrap:anywhere` 적용. `WO-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1` |
| **E** | **표(`<table>`) 소비 측 가로 스크롤 없음** | `.tableWrapper{overflow-x:auto}` 가 `.content-editor .ProseMirror` **편집기에만** 스코프됨(`tableKit.ts:45`). 소비 측은 `table-layout:fixed; width:100%` + 카드 `overflow:hidden` → 넓은 표가 **찌그러지고 잘림**. `sd-*` 표 class 도 없음 |

> **E 관련 저자 지침 (잠정)**: 표는 `sd-*` 계약에 없다. **설명서에 `<table>` 을 쓰지 않는다.** 표로 표현하고 싶은 내용은 `sd-core > sd-item` 또는 `sd-why` 목록으로 표현한다 — 이쪽이 이미 반응형이다.

---

## 9. 다른 언어로의 확장

이 문서는 **언어 중립**이다. 디자인 구조는 ko·en·zh 공통이며 언어별 분기를 두지 않는다.
언어 추가 시 이 문서는 그대로 쓰고, 해당 언어의 길이 특성만 §7 에 1줄 추가한다.

---

## 10. 테스트 결과를 어디에 반영하나

> **새 규칙이 아니다.** 경로의 SSOT = [DOCUMENT-ARCHITECTURE §3](common/DOCUMENT-ARCHITECTURE.md)(단일 위치 · 공통 우선 · CHECK는 규칙을 설명하지 않는다) + [§6](common/DOCUMENT-ARCHITECTURE.md)(새 규칙 → CHECK가 아니라 Guide 수정 + Registry 등재). 아래는 그 원칙을 **이 문서군에 매핑**한 것이다.

[TEST-LOG](OTC-DESCRIPTION-DESIGN-TEST-LOG.md)는 **실행 결과(CHECK 역할)** 문서다. 규칙은 TEST-LOG에 살지 않는다.

| 문제의 범위 | 반영 위치 |
|---|---|
| 그 설명서 1건만의 문제 | **TEST-LOG에만** |
| 다른 OTC 설명서에도 반복될 디자인 기준 | **본 GUIDE** |
| 의약품 전반에 걸치는 규칙 | **[DR Registry](products/drug/DRUG-RULE-REGISTRY.md)** + 해당 Guide |
| 제품군에 걸쳐 성립하는 규칙 | **[CR Registry](common/CONTENT-RULE-REGISTRY.md)** + 해당 공통 Guide |
| 코드를 고쳐야 하는 것 | 문서가 아니라 **WO** (§8) |

- **중복 신설 금지**: 기존 CR/DR 로 설명되면 새 규칙을 만들지 않고 **그 규칙을 보완**한다 (예: 색 의존 금지는 CR-005 소비자 오해 방지의 디자인 적용).
- **반영 시 버전·이력을 같은 커밋에서 갱신**한다 (§11) — **OR-005**.
- 테스트 시 **사용한 GUIDE 버전을 TEST-LOG에 기록**한다 (OR-005).

---

## 11. 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| V0.1 | 2026-07-15 | 초안 작성 (`WO-O4O-OTC-DESCRIPTION-DESIGN-GUIDE-DOCS-V1`). 신규 디자인 정의 없음 — 기존 `ContentRenderer variant="store-description"` 실측값 정리 + 미해결 5건(§8) 기록. 화면 실측 검증 전. |
| V0.2 | 2026-07-15 | §10 테스트 결과 반영 경로 추가. 규칙 신설 아님 — DOCUMENT-ARCHITECTURE §3·§6 매핑 + OR-005(버전·이력 갱신) 연결. |
| V0.3 | 2026-07-15 | `sd-*` 클래스 계약이 공통 축으로 승격됨에 따라 §1·§2 의 계약 복사본을 **참조로 교체**(SSOT = [STORE-DESCRIPTION-CLASS-CONTRACT](content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md), CR-020). 디자인 규칙 변경 없음 (`WO-O4O-SD-CLASS-COMMON-CONTRACT-UNIFY-V1`). |
| V0.4 | 2026-07-15 | 파일럿 P1~P5 실측 반영 — §4.3 **계산값 → 실측 확정**(20/20 일치) · 슬롯별 분기표(B 모달 576=1열 / A 랜딩 644=2열, 경계 639↔641) · §7 줄바꿈 결함 실측 확정(h1 594>301, 잘림). 디자인 규칙 변경 없음 — 추정의 확정 (`WO-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1`). |
| V0.5 | 2026-07-15 | **§8-D 해소** — 렌더러에 `overflow-wrap:anywhere; word-break:normal` 적용으로 긴 영문 단어 잘림 수정(h1 594→301, 27/27 PASS, 반응형·한국어 무회귀). §7 경고 → 해결 기록으로 교체 (`WO-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1`). |
| V0.6 | 2026-07-16 | §2 주의사항 = **`sd-warn`**(신설) 반영 · §8-A **계약·코드 해소**(기존 686 소급은 별도 WO). 근거 = `CHECK-O4O-SD-WARNING-CLASS-CONTRACT-AND-BUILDER-V1`. |
| V0.7 | 2026-07-16 | §2·§8-A **소급 완료 반영** — 공개 중인 1,372건(ko 686 + en 686) `sd-who`→`sd-warn` 적용, 잔여 0. §8-A **완전 해결**. 규칙 변경 없음(상태 갱신). 근거 = `CHECK-O4O-OTC-SD-WARN-BACKFILL-1372-V1`. |
| V0.8 | 2026-07-16 | **§3 화면 표 구조 정정** — SPD 렌더 화면(A·B·C·E)과 비렌더 화면(D)을 분리. **D 는 SPD 미사용 → 대상 제외**(오분류 정정), **E 운영자 검수 화면 추가**(누락), **C variant 적용**(섞이는 슬롯 = 마크업 판별) + 화면별 현재 노출 병기. **§8-B 해결**. 근거 = `CHECK-O4O-OTC-DESIGN-8B-RENDER-PATH-AUDIT-V1` · `CHECK-O4O-TABLET-CONTENT-RENDERER-VARIANT-FIX-V1`. |
