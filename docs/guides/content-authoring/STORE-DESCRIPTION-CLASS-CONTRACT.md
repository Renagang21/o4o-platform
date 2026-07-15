# STORE-DESCRIPTION-CLASS-CONTRACT — 매장용 설명서 `sd-*` 클래스 계약 (전 제품군 공통)

상태: Active · **V1.1** (2026-07-15) · 규칙 ID: **CR-020** · 진입: [DOCUMENT-INDEX](../common/DOCUMENT-INDEX.md)
승격 근거: [CHECK-O4O-SD-CLASS-COMMON-CONTRACT-UNIFY-V1](../../checks/CHECK-O4O-SD-CLASS-COMMON-CONTRACT-UNIFY-V1.md)

> **새 디자인 규칙이 아니다.** 이미 운영 중인 계약의 **SSOT 위치를 바로잡은 문서**다.
> 이전에는 HFF AGENT-KICKOFF §5 에만 기술돼 있었으나, 계약 자체는 **제품군 중립**이다 (근거 = 위 CHECK).

---

## 1. 계약의 정의 (SSOT는 코드)

매장용 상품 설명서(`shared_product_descriptions` STORE/B2B)의 콘텐츠는 **`<style>` 없는 시맨틱 HTML** 로 저장하고, 디자인·반응형·테마는 **공용 렌더러**가 입힌다.

| 구분 | SSOT |
|---|---|
| **클래스 CSS 정의 (원본)** | `packages/content-editor/src/components/ContentRenderer.tsx:137-225` — 저장소 내 **유일한 정의 지점** |
| **적용 컴포넌트** | `ContentRenderer variant="store-description"` (래퍼 class `.store-desc-content`) |
| **설계 근거** | [WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1](../../work-orders/WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1.md) |

**수치(px·breakpoint)는 이 문서에 적지 않는다.** 코드가 SSOT이며, 값이 다르면 코드가 맞다.

---

## 2. 클래스 어휘

계약은 **아래 어휘가 전부**다. 어휘 밖 class 는 스타일이 붙지 않는다.

```text
sd-card                                    최상위 (테마: sd-theme-*)
├─ sd-hero      h1 > small · sd-badges > sd-badge(.is-solid) · sd-meta
└─ sd-body      sd-intro · <h2> · sd-why / sd-who (ul>li)
                sd-core > sd-item (sd-tag, h3, p)
                sd-intake (small) · sd-chips (ul>li) · sd-spec
                sd-cta (sd-cta-k, p) · sd-foot
```

| 클래스 | 역할 |
|---|---|
| `sd-card` | 콘텐츠 루트. 카드 크롬(테두리·그림자·최대 폭) |
| `sd-hero` | 제목부 — `h1`(+`small` 부제), 배지, 메타 |
| `sd-badges` / `sd-badge` | 배지 묶음 / 개별 배지 (`.is-solid` = 강조) |
| `sd-meta` | 제목 아래 보조 정보 |
| `sd-body` | 본문 컨테이너 |
| `sd-intro` | 도입 문단 |
| `<h2>` | 섹션 제목 (별도 class 없음 — 태그로 인식) |
| `sd-why` / `sd-who` | 목록 (`ul > li`). 불릿 자동 |
| `sd-core` > `sd-item` | 핵심 항목 카드 (`sd-tag`, `h3`, `p`) — **반응형 다단 대상** |
| `sd-intake` | 사용·섭취 안내 (`small` = 보조) |
| `sd-chips` | 태그 알약 (`ul > li`) |
| `sd-spec` | 규격·구성 |
| `sd-cta` | 상담 유도 (`sd-cta-k` = 키커, `p`) |
| `sd-foot` | 하단 문구 |
| `sd-theme-*` | 카테고리 accent 교체 (§4) |

> `sd-scan` 은 렌더러에만 존재하며 저자가 쓰는 어휘가 아니다.
> `--sd-*` 로 시작하는 이름은 class 가 아니라 **CSS 변수**(토큰)다. 콘텐츠에서 쓰지 않는다.

---

## 3. 반응형 원칙

**반응형은 저자의 일이 아니다.** 구조만 맞추면 렌더러가 처리한다.

- 분기는 **뷰포트(`@media`)가 아니라 컨테이너(`@container`)** 기준이다 — 콘텐츠가 **놓인 슬롯 폭**으로 반응한다.
- 따라서 **모바일·태블릿·PC 공통 사용**이며 화면별 콘텐츠 분기를 두지 않는다. 같은 HTML 1벌이 모든 화면에 쓰인다.
- 좁은 모달·패널에 넣으면 PC에서도 좁은 레이아웃이 나온다. **버그가 아니라 계약의 결과**다.
- 다단이 되는 것은 `sd-core` 다. 그 외는 단일 열이다.

구체적 분기점·수치는 코드(§1)와 소비 측 지침(예: [OTC 디자인 GUIDE §4](../OTC-DESCRIPTION-DESIGN-GUIDE.md))에서 다룬다. **여기서 중복하지 않는다.**

**알려진 현상 — `sd-core` 다단 구간의 빈 칸**: `sd-item` 수가 열 수로 나눠떨어지지 않으면 마지막 칸이 빈다(예: 항목 2개 + 3열).

> ⚠️ **빈 칸을 채우려고 근거 없는 항목을 만들지 않는다 (CR-004 grounding).** 레이아웃은 콘텐츠를 창작할 이유가 되지 못한다. 대응 여부는 제품군 Guide 가 결정한다.

### 3-1. 긴 문자열 줄바꿈 (렌더러가 보장)

공백 없는 긴 문자열(영문 성분명·URL·SKU)은 **렌더러가 자동으로 줄바꿈**한다 — 저자가 CSS로 대응하지 않는다.

```css
.store-desc-content { overflow-wrap:anywhere; word-break:normal; }   /* ContentRenderer.tsx */
```

| 보장 | 내용 |
|---|---|
| 긴 단어 | 넘치기 직전에 **줄바꿈** — 잘리지 않는다 |
| 일반 단어·한국어 | **무변경** (`word-break:normal` 이라 임의 분절 없음) |
| `sd-core` 트랙 | `anywhere` 는 min-content 기여도를 낮춰 **그리드 트랙도 넘치지 않는다** |

> 배경: 이전에는 `overflow-wrap:normal` + `sd-card{overflow:hidden}` 조합으로 **긴 단어가 가로 스크롤 없이 잘려 사라졌다**(사용자가 결함을 인지조차 못 함). 2026-07-15 수정 — 실측·근거 = [CHECK-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1](../../checks/CHECK-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1.md).
>
> **저자 지침 변화 없음**: 제목·태그에 긴 단일 단어를 넣지 않는 편이 여전히 읽기 좋다. 이 보장은 **안전망**이지 권장이 아니다.

---

## 4. 테마

`sd-card` 에 `sd-theme-*` 를 부여하면 accent 토큰만 교체된다. 미부여 = 기본(블루).

| 값 | accent |
|---|---|
| `sd-theme-red` | 홍/골드 |
| `sd-theme-green` | 녹색 |
| (미지정) | 블루 |

**어느 제품군·카테고리에 어떤 테마를 쓰는지는 제품군 Guide 소관**이다 (예: HFF 홍삼=red, 유산균=green). 이 문서는 **메커니즘만** 정의한다.

---

## 5. 금지 (CR-020)

| # | 금지 | 이유 |
|---|---|---|
| 1 | **`<style>` 태그** | write-path sanitizer(`sanitize-description-html.util.ts`, DOMPurify)가 **태그째 제거**한다. 넣어도 저장되지 않는다(실측 확인). |
| 2 | **인라인 `style` 속성** | 렌더러 디자인 시스템 우회 |
| 3 | **어휘 밖 임의 class** | 스타일이 붙지 않음. 계약 위반 |
| 4 | **제품군별 재정의** | 같은 class 를 제품군마다 다르게 쓰면 계약이 깨진다 |

시맨틱 태그와 class 는 sanitizer 를 **무손실 통과**한다(실측 확인).

---

## 6. 제품군별 예외

**원칙: 예외를 두지 않는다.** 계약은 전 제품군 동일하다.

예외가 꼭 필요하면:

1. 제품군 Guide 에 **예외만** 기술하고 계약 본문을 복사하지 않는다.
2. 이 문서에 **예외 목록 1줄**을 추가해 역참조를 남긴다.
3. 클래스 어휘 자체의 변경·추가는 문서가 아니라 **렌더러 WO** 로 한다.

**현재 등록된 예외: 없음.**

---

## 7. 클래스 이름 변경 시 영향 범위

어휘는 **콘텐츠 ↔ 렌더러 계약**이므로, 이름을 바꾸면 **이미 저장된 콘텐츠가 조용히 무스타일로 깨진다**(에러 없음).

변경 시 확인해야 할 범위:

| 범위 | 대상 |
|---|---|
| **정의** | `ContentRenderer.tsx` (§1) |
| **저장된 콘텐츠** | `shared_product_descriptions` 의 STORE/B2B 행 — **DB 마이그레이션 대상**. 전 제품군·전 언어 |
| **소비 화면** | 렌더러를 쓰는 모든 표면 (KPA 설명서 모달 / Neture 상품 랜딩 / 이후 전환될 태블릿·다국어 랜딩) |
| **문서** | 본 문서 · 제품군 Guide · 예제 HTML |

> 이름 변경은 **문서 작업이 아니라 WO**다. 하위호환(구 class 병행 유지) 없이 바꾸지 않는다.

---

## 8. 이 계약을 쓰는 곳

| 축 | 문서 |
|---|---|
| 의약품(OTC) | [OTC-DESCRIPTION-DESIGN-GUIDE](../OTC-DESCRIPTION-DESIGN-GUIDE.md) |
| 건강기능식품 | [HFF AGENT-KICKOFF §5](../products/health-functional-food/AGENT-KICKOFF.md) |

새 제품군은 이 문서를 **참조만** 하고 어휘를 복사하지 않는다 (CR-020 · [DOCUMENT-ARCHITECTURE §3](../common/DOCUMENT-ARCHITECTURE.md) 단일 위치).

---

## 9. 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| V1 | 2026-07-15 | HFF AGENT-KICKOFF §5 에만 있던 계약을 **공통 축으로 승격**. 규칙 신설 없음 — 기술 내용은 기존 계약 그대로, 위치만 이동 (`WO-O4O-SD-CLASS-COMMON-CONTRACT-UNIFY-V1`). CR-020 등재. |
| V1.1 | 2026-07-15 | §3-1 **긴 문자열 줄바꿈 보장** 추가 — 렌더러가 `overflow-wrap:anywhere; word-break:normal` 로 처리. 계약 어휘·구조 변경 없음(렌더러 동작 명문화). 새 CR 미신설 — CR-020 범위 내 (`WO-O4O-SD-HERO-LONG-TEXT-OVERFLOW-FIX-V1`). |
