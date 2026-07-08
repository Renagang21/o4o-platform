# WO-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1

## 1. 작업명

WO-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1

---

## 2. 배경

[`IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1`](../investigations/IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1.md) §8 결과, O4O 콘텐츠 플랫폼의 가장 큰 구조적 문제는 **편집기와 소비 화면(Renderer)의 출력이 일치하지 않는다**는 점이다.

**코드로 확정된 근본 원인** — `ContentRenderer` 의 variant가 **CSS와 sanitize 정책을 동시에** 좌우하며, 그 sanitize가 비대칭이다:
- `variant="guide"` → `sanitizeRichHtml` (iframe **허용**, youtube/vimeo 호스트 allowlist)
- 기본 / `variant="product-detail"` → `sanitizeHtml` (iframe **제거**)

대표 증상:
- **YouTube iframe 제거** — LMS 강의·상품상세·공지·자료실(기본 variant 사용처)에서 편집기의 YouTube가 통째로 사라짐
- **Table CSS 미적용** — 렌더러 어디에도 표 CSS 없음
- **표면별 서로 다른 sanitize 정책**
- **독립 Renderer 사용** — signage-player·glycopharm `CourseDetailPage`·main-site forum

이는 **"O4O 콘텐츠는 어디에서 보더라도 동일하게 보인다"** 는 플랫폼 원칙(IR §1)을 위반한다.

---

## 3. 목적

편집기와 모든 소비 화면의 렌더링 결과를 **동일하게** 만든다.

> **최종 원칙: "한 번 작성하면 어디에서 보더라도 동일하게 렌더된다."**

---

## 4. 대상

**공통** — `ContentRenderer`, `sanitizeRichHtml`, `sanitizeHtml`, variant

**소비 화면** — POP / QR / 사이니지 / 태블릿 / 상품설명 / 공지 / 자료실 / 강의 / 블로그 / 포럼

---

## 5. 구현 원칙

### 5.1 ContentRenderer = 유일한 표준 Renderer

서비스별 Renderer를 만들지 않는다. 신규 Renderer 증가 금지.

### 5.2 편집기 ↔ ContentRenderer 동일 출력

동일한 HTML을 동일하게 출력한다.

### 5.3 sanitize 정책 단일화 (핵심 해결책)

**sanitize는 표면·variant마다 달라지지 않는다.** `ContentRenderer` 는 **모든 variant에서 `sanitizeRichHtml` 를 사용**하여 iframe(youtube/vimeo 호스트 allowlist) 정책을 일관 적용한다.

> **variant의 책임을 재정의한다:** variant는 **CSS/레이아웃만** 좌우한다(예: product-detail 폭 720px, guide rich CSS). **sanitize 정책은 variant와 분리**되어 항상 동일(`sanitizeRichHtml`)하다. 이 한 가지 변경이 LMS/상품상세/공지/자료실의 YouTube 드롭을 **한 번에** 해소한다.

### 5.4 iframe 보안 원칙 유지 (WO-3와 동일)

임의 iframe 허용 금지. **YouTube/Vimeo 허용 호스트 allowlist만 유지**. sanitize 단일화가 이 불변식을 깨지 않는다(`sanitizeRichHtml` 이 이미 호스트 allowlist 구현).

### 5.5 Table CSS를 ContentRenderer에도 적용

편집기와 동일한 표 CSS를 `ContentRenderer` 에 주입한다(`IMAGE_DISPLAY_STYLES` 가 이미 편집기·렌더러 양쪽에 주입되는 것과 동일 패턴). **WO-2에서 정의하는 표 CSS 상수를 공유**한다.

### 5.6 공유 CSS 주입 통일

`ContentRenderer` 의 CSS 주입(현재 `IMAGE_DISPLAY_STYLES`)에 **YouTube iframe CSS·Table CSS를 함께 포함**하여, 모든 variant가 이미지·YouTube·표를 동일하게 표시한다.

---

## 6. 이탈 Renderer 조사

`ContentRenderer` 를 쓰지 않는 화면을 조사하고 처리 방침을 정한다.

| 표면 | 현 상태 | 방침 |
|---|---|---|
| **signage-player** | 자체 `ContentRenderer`(별도 패키지, html 타입 sandboxed iframe, rich_text만 sanitizeHtml) | 재생 모델이 특수(sandbox)하므로 **공통 렌더러 강제 통합은 신중**. 최소한 **동일 렌더링 계약**(YouTube 허용·이미지 CSS) 만족하도록 정렬. 완전 통합은 별도 판단 |
| **glycopharm `CourseDetailPage`** | raw `sanitizeHtml` 직접 호출 → 이미지 CSS·YouTube 둘 다 누락 | **`ContentRenderer` 로 이관** (단순 마이그레이션) |
| **main-site forum** | 자체 로컬 `ContentRenderer`(블록 배열 전용, @o4o와 무관) | 블록 렌더 모델 차이 확인 후 계약 정렬 또는 범위 외 명시 |

---

## 7. 통합 원칙

가능하면 공통 `ContentRenderer` 로 통합한다. 불가능하면(signage-player 등) **동일 렌더링 계약**(sanitize 정책·이미지/YouTube/표 CSS)을 만족하도록 수정한다.

---

## 8. 검증

동일 HTML(제목·이미지·YouTube·표·링크 포함)을 다음에서 비교하여 **모두 동일 출력**을 확인한다.

RichTextEditor → ContentRenderer → POP / QR / 사이니지 / 태블릿 / 상품설명 / 공지 / 자료실 / 강의 / 블로그 / 포럼

---

## 9. 완료 기준

- **YouTube 동일 출력** (기본/product-detail variant에서도 표시)
- **Image 동일 출력** (기존 유지)
- **Table 동일 출력** (WO-2 CSS 공유)
- **Video 동일 출력** (WO-3 연계)
- **sanitize 단일 정책** (모든 variant `sanitizeRichHtml`, iframe 호스트 allowlist 유지)
- 서비스별 Renderer 제거 또는 동일 렌더링 계약 만족
- 기존 기능 회귀 없음
- typecheck 통과 / build 통과
- CHECK 작성 / commit·push 완료

---

## 10. 산출물

CHECK — `CHECK-O4O-CONTENT-RENDERER-PLATFORM-CONSISTENCY-V1.md`

---

## 11. 작업 원칙

- RichTextEditor 변경 최소화 · ContentRenderer 중심
- 서비스별 Renderer 증가 금지 · sanitize 정책 단일화
- **WO-1·WO-2·WO-3와 충돌 금지**
- iframe 보안 불변식(호스트 allowlist) 유지
- 최소 범위(additive)

---

## 12. 시퀀싱 (중요)

- **본 WO는 WO-3(Video)의 실질 선행 조건이다.** WO-3가 편집기에 동영상 노드를 넣어도, 소비 표면이 `sanitizeHtml` 로 iframe/`<video>` 를 제거하면 사용자에겐 보이지 않는다. **§5.3 sanitize 단일화가 WO-3보다 먼저 또는 함께** 반영되어야 동영상이 실제로 표시된다.
- **§5.5 표 CSS는 WO-2에 의존**(표 CSS 상수 공유). WO-2 이후 또는 상수만 선정의하고 병행.
- 권장 순서: WO-1 → WO-2 → **WO-4(본 WO, 최소한 §5.3 sanitize 단일화)** → WO-3. 또는 WO-3와 본 WO를 하나의 릴리스로 묶어 동영상 가시성을 함께 확보.

---

## 목표

O4O 콘텐츠 플랫폼의 모든 콘텐츠는 **"한 번 작성하면 어디에서 보더라도 동일하게 렌더된다."** 이를 콘텐츠 플랫폼의 최종 원칙으로 확정한다.

---

*Status: 확정 (핸드오프 대기). WO-3의 선행 조건. 실행은 별도 지시로 착수.*
