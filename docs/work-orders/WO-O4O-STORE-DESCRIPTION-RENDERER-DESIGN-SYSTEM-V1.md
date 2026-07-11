# WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1

> 매장용 상품 설명서(`shared_product_descriptions` STORE/B2B)의 **반응형 디자인을 렌더러가 담당**하도록 하는 디자인 시스템. 콘텐츠는 `<style>` 없는 시맨틱 HTML 만 저장한다.
> **상태**: 구현 완료(1차) · **날짜**: 2026-07-11

---

## 1. 배경 (왜 필요한가)

- 매장용 설명서를 **자기완결 `<style>` fragment**(제품마다 `.xx-desc{...}` 스코프 CSS 내장)로 저장하려 했으나, write-path sanitizer(`sanitize-description-html.util.ts`, DOMPurify **기본 정책**)가 **`<style>`을 태그째 제거**한다(로컬·프로덕션 저장 실측 확인). 프론트 `content-editor` sanitize + `ContentRenderer`(sanitizeRichHtml)도 동일하게 제거.
- 과거 photo 배치 설명서에 `<style>`이 남은 건 sanitize-on-write(`c3b790851`, WO-...-SANITIZE-ON-WRITE-V2) **배포 이전** 저장이라 grandfathered 된 것. 재저장 시 벗겨진다.
- 즉 플랫폼 콘텐츠 파이프라인은 **"시맨틱 HTML + 렌더러 CSS"** 모델. 이에 맞춰 설명서 디자인을 렌더러로 이관한다. (대안: sanitizer를 느슨하게 해 `<style>` 허용 — 보안(@import 등)·프론트 불일치·플랫폼 방향 역행으로 기각.)

## 2. 설계

- 공용 렌더러 `packages/content-editor/src/components/ContentRenderer.tsx` 에 **`variant="store-description"`** 추가.
  - 래퍼 class `.store-desc-content`, `container-type:inline-size`.
  - `storeDescriptionCss` 를 `document.head` 에 1회 주입(브라우저 실제 `<style>` → `@container` 정상 동작; jsdom 파싱 이슈는 write 시점에만 존재).
  - 모든 규칙 `.store-desc-content` 하위 스코프(호스트 페이지 오염 없음).
  - 반응형: 폰 1열 / `@container (min-width:640px)` 2열 / `(min-width:900px)` 3열. 라이트·다크 토큰(prefers-color-scheme + `:root[data-theme]`).
- **콘텐츠 계약 = 시맨틱 `sd-*` 클래스** (임의 class·`<style>` 금지):
  `sd-card > (sd-hero[h1>small, sd-badges>sd-badge(.is-solid), sd-meta] + sd-body[sd-intro, h2, sd-why/sd-who(ul>li), sd-core>sd-item(sd-tag,h3,p), sd-intake(small), sd-chips(ul>li), sd-spec, sd-cta(sd-cta-k,p), sd-foot])`.
- 콘텐츠는 sanitizer 무손실 통과(시맨틱 태그+class 100% 보존, 로컬 검증). **보안 util 변경 없음.**

## 3. 소비 표면 (전환)

api-server SSR 없음 — 전부 React. 전환:

| 표면 | 파일 | 변경 |
|------|------|------|
| KPA 매장용 설명서 모달 | `services/web-kpa-society/.../StoreDescriptionViewModal.tsx` | raw `dangerouslySetInnerHTML` → `ContentRenderer variant="store-description"` (sanitize 확보 + 디자인) |
| Neture QR 모바일 랜딩 | `services/web-neture/src/pages/ProductLandingPage.tsx` | raw → variant(카드 중첩·헤더 중복 방지 위해 설명 카드 크롬 제거하고 직접 렌더) |

**후속 전환(혼재 슬롯 구분 필요)**: 태블릿 키오스크 `packages/tablet-kiosk-core/src/TabletKioskPage.tsx`(POP·코너·설명서 공용 슬롯 — 설명서 슬롯만 선별 적용), KPA 다국어 공개 랜딩 `MultilingualProductPublicLandingPage.tsx`, QR 페이지 콘텐츠 `QrLandingPage.tsx`(현재 `variant="guide"`).

## 4. 검증

- content-editor typecheck/build PASS. web-kpa-society·web-neture `tsc --noEmit` PASS.
- 변엔장(master `38a9d3e4-56be-4967-aa7b-0cb2d2e6baff`) 시맨틱 저장 → SQL 검증: STORE·B2B × ko·en **canonical = 시맨틱(sd-card) 행**, 구 무스타일 행은 candidate 강등, `<style>` 없음.
- 반응형 프리뷰(폰/태블릿) 렌더 확인.

## 5. 저자화 가이드

`docs/guides/products/health-functional-food/AGENT-KICKOFF.md §5` + 예제 `examples/byeonenjang.semantic.html`. **콘텐츠에 `<style>` 금지, sd-* 구조만.**
