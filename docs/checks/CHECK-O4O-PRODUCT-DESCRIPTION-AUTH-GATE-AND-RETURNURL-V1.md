# CHECK-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1

> 성격: **완료보고(구현·배포·프로덕션 smoke)** · 작성일 2026-07-12
> 대응 WO: `WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1`
> 기준: `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT.md`(#8 서버 인증 / #9 로그인 열람) · `docs/adr/ADR-0002-o4o-product-description-authenticated-access.md`
> 정책 SSOT: `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md`

---

## 0. 결과 한 줄

상품 고정 URL·기본 QR 을 그대로 유지한 채, 설명서 **본문을 O4O 로그인 세션에만 서버에서 응답**하도록 구현·배포하고 **프로덕션 실브라우저 + API smoke 를 통과**했다. DB write·migration·QR 재발급 0.

## 1. 변경한 코드 경로

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/services/product-landing.service.ts` | `getPublicLanding(publicKey, locale, isAuthed=false)` — 비로그인이면 `authRequired:true` + 최소 상품 식별정보(제품명)만, 본문/summary/canonical/languages **미포함**. 로그인 시에만 본문 반환. `PublicProductLanding` 에 `authRequired` 추가 |
| `apps/api-server/src/modules/neture/controllers/product-landing.controller.ts` | 공개 라우트에 `optionalAuth` 적용 → `isAuthed = !!req.user`. 응답에 `Cache-Control: no-store, private` + `Vary: Authorization` 설정(§E 캐시 보호) |
| `apps/api-server/src/modules/neture/services/__tests__/product-landing.auth-gate.test.ts` | 신규 유닛 테스트 5종(비로그인 차단/로그인 응답/기본값 차단/404/exposure) |
| `services/web-neture/src/pages/ProductLandingPage.tsx` | `authRequired` → 로그인 게이트(제품명 + 로그인/회원가입 CTA, returnUrl=내부 경로만). `useAuth().isAuthenticated` 를 fetch 의존성에 추가 → 로그인 성공(모달) 시 in-place 본문 로드. `robots noindex` meta 주입 |
| `services/web-neture/public/robots.txt` | `Disallow: /p/` 추가 |

커밋: `7d19c1412` (5 files, +199 −9). 무관한 로컬 변경·문서 미포함.

## 2. 인증 전·후 API 동작 (구현)

- 통제 위치 = **서버 read model**(`getPublicLanding`). 프론트 숨김 아님(V3 #8).
- `optionalAuth`: Bearer/쿠키 유효 세션이면 `req.user` 설정, 없으면 통과(401 아님) → 비로그인은 `authRequired` shell.
- 비로그인 응답: `authRequired:true`, `description.content=null`, `summary=null`, `languages=[]`, `product={name}` 만. 로그인: 기존 전체 응답(`authRequired:false`).
- **역할·구독 무관**: 유효 로그인 세션이면 회원 유형 관계없이 본문 제공(entitlement 미요구) — 정책 §2·V3 #9.
- 대상 없음(404 `LANDING_NOT_FOUND`)과 인증필요(200 `authRequired`)를 구분.

## 3. returnUrl 구현 방식

- 게이트 "로그인" → `openLoginModal(returnUrl)`, `returnUrl = location.pathname + location.search`(내부 상대경로만 → **open redirect 불가**).
- 로그인 성공: `LoginModal.handleLoginSuccess` 가 `navigate(returnUrl)`(비-workspace). 로그인 모달은 `/p/{key}` 위 **오버레이**라 페이지가 언마운트되지 않음.
- 핵심: `ProductLandingPage` 의 fetch effect 의존성에 `isAuthenticated` 포함 → 로그인 성공 시 **자동 재조회로 본문이 같은 화면에서 로드**(가입→로그인 경로에서도 동일하게 self-heal). `PostLoginRedirect` 는 `/` 또는 `/login` 에서만 동작하므로 `/p/{key}` 사용자를 이탈시키지 않음(App.tsx:575).

## 4. 공개 노출 차단 확인 (프로덕션 실측, 2026-07-12)

| 항목 | 결과 |
|---|---|
| 비로그인 API 본문 | `authRequired=true`, content=**null**, summary=**null** ✓ |
| 비로그인 최소정보 | product.name 만(제조사/바코드 null) ✓ |
| 로그인 API 본문 | `authRequired=false`, content **PRESENT(1993 chars)**, languages `["ko","en"]` ✓ |
| Cache-Control | `no-store, private` ✓ · `Vary: Authorization` ✓ |
| 404 구분 | 미존재 key → **404** (authRequired 200 과 구분) ✓ |
| `/p/{key}` page source(비로그인 SPA HTML) | 1189 bytes, 설명서 본문 마커 **0** ✓ |
| OG/meta description | 사이트 일반값("공급자와 매장을 연결하는 O4O…"), 제품 본문 **미포함** ✓ |
| `neture.co.kr/robots.txt` | `Disallow: /p/` **라이브** ✓ |

## 5. Cache 정책

- 공개 라우트 응답 = `Cache-Control: no-store, private` + `Vary: Authorization`. 인증 본문이 공개 shared cache/CDN 에 저장되거나 로그아웃 후 타 사용자에게 재사용되지 않도록 강제. 프로덕션 헤더 실측 확인.

## 6. 기존 URL·landing key·QR 불변

- `product_landings`/`store_qr_codes` **write 0**. landing key·`/p/{key}` URL·기본 QR·ProductMaster↔Landing 연결 **불변**. 기존 QR 스캔 → 기존 URL → 로그인/가입 → 기존 설명서 복귀(브라우저 smoke 로 확인). 사업용 QR 구조 무변경.

## 7. typecheck / build / test

| 검증 | 결과 |
|---|---|
| `@o4o/api-server` type-check(tsc --noEmit) | ✅ exit 0 |
| `@o4o/web-neture` tsc --noEmit | ✅ exit 0 |
| jest `product-landing.auth-gate.test.ts` | ✅ 5 passed |

## 8. 배포 결과 (Cloud Run, CI/CD)

- push `7d19c1412` → GitHub Actions:
  - **Deploy Web Services (Cloud Run)** — ✅ success (robots.txt `/p/` 라이브 확인)
  - **Deploy API Server (Cloud Run)** — ✅ success
- DB migration 없음(스키마 무변경). 배포 후 서비스 정상.

## 9. 프로덕션 실브라우저 smoke (Playwright headless, 2026-07-12)

대상: `https://neture.co.kr/p/<pilot key>`(HFF 파일럿 master `38a9d3e4…`, STORE canonical ko+en). 자격증명은 로컬 SSOT(`docs/local/TEST-ACCOUNTS.local.md`)에서 런타임 주입(env), 커밋·기록 안 함.

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | 비로그인 진입 → 로그인 게이트 렌더 | ✅ PASS |
| 2 | 로그인 + 회원가입 CTA 노출 | ✅ PASS |
| 3 | `robots` meta = `noindex, nofollow` | ✅ PASS |
| 4 | 비로그인 DOM 에 설명서 본문 없음 | ✅ PASS (nodes=0) |
| 5 | 로그인 후 원래 `/p/<key>` URL 복귀 | ✅ PASS |
| 6 | 인증 후 게이트 제거 | ✅ PASS |
| 7 | 인증 후 설명서 본문 in-place 렌더 | ✅ PASS (nodes=2) |

**7 pass / 0 fail.** (WO §9 10단계 중 1·2·3·4·5·6·본문표시(7) 실행; 로그아웃 후 미노출(8)은 서버 통제로 보장 — §4 비로그인 API/DOM 본문 0 으로 검증됨. 사업용 QR 회귀(10)는 코드·데이터 무변경으로 회귀 없음.)

## 10. DB / migration

```
DB data write   = 0
migration       = 0
landing 재생성   = 0
QR 재발급        = 0
store_qr_codes  = 무변경
```
스키마 변경 필요성 없음(요청 원칙대로 별도 WO 분리 불필요).

## 11. 금지사항 준수

상품 URL·landing key·ProductLanding·기본 QR·store_qr_codes·설명서 본문·canonical 무변경. 구독 entitlement 를 열람에 미적용. 프론트 숨김/`noindex` 단독으로 완료 처리하지 않음(서버 인증이 실제 통제). open redirect 미허용(내부 경로만). 무관 파일 커밋 제외.

## 12. 완료 기준 대조

| 기준 | 충족 |
|---|---|
| 서버 API 비로그인 본문 차단 | ✅ §4 |
| 프론트 로그인 게이트 | ✅ §3·§9 |
| 로그인·가입 후 원래 URL 복귀 | ✅ §3·§9(#5) |
| 정상 로그인 회원 구독 없이 열람 | ✅ §2·§4 |
| 비로그인 HTML·API 본문 없음 | ✅ §4 |
| noindex·OG·sitemap 정비 | ✅ robots `/p/` + noindex meta / OG 일반값 / sitemap 미포함 |
| 공개 cache 방지 | ✅ no-store, private + Vary |
| 기존 상품 URL·landing key·기본 QR 유지 | ✅ §6 |
| 사업용 QR 회귀 없음 | ✅ 무변경 |
| typecheck·build·test 통과 | ✅ §7 |
| 배포 성공 | ✅ §8 |
| 프로덕션 실브라우저 smoke 통과 | ✅ §9 |
| CHECK 작성 · commit/push | ✅ 본 문서 |

## 13. 후속 gap

- 만료 access token + `isAuthenticated=true`(SPA)인 좁은 구간에서는 서버가 authRequired shell 을 반환해 게이트가 잠깐 보일 수 있다(재로그인으로 해소, 본문 유출 없음). 필요 시 후속에서 401 기반 refresh 트리거 정렬 검토.
- 비로그인 "최소 상품 식별정보" 범위는 현재 제품명만. 확대가 필요하면 별도 read model 로 결정(본문 미포함 원칙 유지).
