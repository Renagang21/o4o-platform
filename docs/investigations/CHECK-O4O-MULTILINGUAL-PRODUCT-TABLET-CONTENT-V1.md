# CHECK — WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1

> KPA 매장 응대용 **태블릿 표시 모드**. 기존 public landing 데이터(publicKey + resolve API)를 그대로 재사용,
> 렌더링 모드만 분리. **backend 무변경 · 새 저장소/새 public API 0 · 새 route 0**(query `mode=tablet`).

**대상:** KPA only. local/listing 연결 콘텐츠 공통(같은 publicKey).

---

## 1. 핵심 — 기존 자산 재사용

| 재사용 | 위치 |
|--------|------|
| public resolve API | `GET /api/v1/kpa/public/multilingual-product-contents/:publicKey?locale=` (무변경) |
| public landing 컴포넌트 | `MultilingualProductPublicLandingPage.tsx` (mode 분기 추가) |
| 렌더러 | `PageBody`(html/image_sequence/blocks·json) + `sanitizeRichHtml` 재사용 |
| publicKey 발급 | `ensureMlcPublicKey`(idempotent, published 승격, archived 비노출) — 정책 그대로 |

## 2. 변경 (frontend only, 2 파일)

### `pages/public/MultilingualProductPublicLandingPage.tsx`
- `isTablet = searchParams.get('mode')==='tablet'` — 같은 route `/multilingual-products/:publicKey`.
- `switchLocale` 가 `mode=tablet` 보존(누락 시 모바일로 떨어지는 버그 방지).
- `PageBody` 에 `large` prop 추가(prose-lg / 큰 텍스트) — **모바일 기본값 불변**.
- `CtaButtons`(page.buttons {label,url}) 추가 — 태블릿 본문 하단 큰 터치 버튼.
- 태블릿 레이아웃 분기: 큰 헤더+제목, 언어 버튼 min-h-44px, 본문 max-w-4xl·prose-lg, 요약 큰 글씨, CTA, footer "매장 직원에게 문의해 주세요." fallback 안내("선택한 언어의 콘텐츠가 없어 대체 언어로 표시 중입니다.").
- **모바일 return 은 그대로**(태블릿은 앞단 early-return 분기) — 회귀 0.

### `components/MultilingualPublicActions.tsx`
- 버튼 추가: 고객용 보기 / **태블릿 보기** / URL 복사 / QR 보기.
- `handleTablet`: ensureMlcPublicKey → `window.open(url + '?mode=tablet')`(기존 쿼리 안전 처리 `withTabletMode`).

## 3. UI 기준 충족
- 언어 버튼 ≥44px, CTA ≥56px, 본문 max-w 확대·prose-lg, 가로/세로 대응(반응형 px). 
- 라벨: ko 한국어 / en English / zh 中文 / ja 日本語 / vi Tiếng Việt / th ภาษาไทย / id Bahasa.
- 미지원 format → "지원하지 않는 콘텐츠 형식입니다. 매장 직원에게 문의해 주세요."

## 4. 검증

### 4.1 정적
- `web-kpa-society` `npx tsc --noEmit` — **error 0**.
- backend 무변경 → api-server typecheck 불요.

### 4.2 기능 smoke (배포 후 — 2026-06-23, [PILOT] 데이터, kpa-society.co.kr)
배포: Deploy Web (Cloud Run) `0d978a08d` success. setup: 운영자 [PILOT] ko/en 발행 → store-owner [PILOT] 상품+가져오기.

| # | 항목 | 결과 |
|---|------|------|
| 1 | 편집 모달 "태블릿 보기" 버튼 노출 | ✅ 고객용 보기 / **태블릿 보기** / URL 복사 / QR 보기 |
| 2 | 태블릿 보기 → `?mode=tablet` 새 탭 | ✅ `/multilingual-products/eeb93e7b…?mode=tablet` |
| 3 | 태블릿 레이아웃 렌더 | ✅ 헤더 내 큰 언어버튼 + 카드형 본문 + 이중언어 footer "매장 직원에게 문의…/Please ask our staff" (스샷) |
| 4 | 언어 전환 시 mode=tablet 유지 | ✅ 한국어 클릭 → `?locale=ko&mode=tablet`, 본문 "[PILOT] 한국어 상품 안내" |
| 5 | 태블릿 fallback (zh 미작성) | ✅ "선택한 언어의 콘텐츠가 없어 대체 언어로 표시 중입니다." + English 본문 |
| 6 | 모바일 모드 회귀 (mode 없음) | ✅ 언어버튼 본문에·단일행 footer (태블릿과 구분, 불변) |
| 7 | QR 보기 / URL 복사 회귀 | ✅ QR SVG + canonical URL(mode 없음) 정상 |
| 8 | console error / 4xx·5xx | ✅ 0 / 0 (store-owner·landing 양 탭, resolve en/ko/zh 전부 200) |

정리: store 그룹·운영자 그룹 archived, 상품 비활성화 (물리삭제 없음).

**최종 판정: CLOSED / PASS**

## 5. 무변경/안전
- backend·route·저장소·public API 무변경. `connection.ts`/store-entitlement·payment WIP/`mobile-app`/`pnpm-lock` 미접촉. 명시 pathspec.
- 단일 commit(code+CHECK) — web deploy HEAD 변경감지.

## 6. 후속
KPA 파일럿 외국인 응대 흐름 완성(가져오기→연결→배지→QR/URL→태블릿). 다음 = `WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-CROSS-SERVICE-ADOPTION-V1`(GP/KCos).

---

*Date: 2026-06-21 · frontend 2파일 · 태블릿 모드(같은 publicKey/resolve 재사용, mode=tablet) · backend/route/API 무변경 · 모바일 landing 불변 · web-kpa typecheck 0 · KPA only.*
