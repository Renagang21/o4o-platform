# CHECK — WO-O4O-CROSSSERVICE-HEADER-MENU-FOOTER-UI-COMPLETION-V1

- **작업일**: 2026-08-14
- **범위**: 공식 4서비스(KPA-Society · K-Cosmetics · Neture · PharmacyHub) 헤더·메뉴·푸터 공통화 상태 조사 + PharmacyHub 공개 화면 완성
- **결과**: PASS (PharmacyHub 공개 셸 적용 완료 · 데드링크 0 · 잘못된 "준비 중" 0 · JS 예외 0)

---

## 1. 4서비스 조사 결과

| 서비스 | 공통 GlobalHeader | 메뉴 SSOT (`config/navigation.ts`) | 푸터 | footer-legal 로더 |
|---|---|---|---|---|
| KPA-Society | ✅ `KpaGlobalHeader` | ✅ | ✅ | ✅ |
| K-Cosmetics | ✅ `KCosGlobalHeader` | ✅ | ✅ | ✅ |
| Neture | ✅ (`MainLayout`) | ✅ | ✅ | ✅ |
| PharmacyHub | ❌ → **✅ 신규** | ❌ → **✅ 신규** | ❌ → **✅ 신규** | ❌ → **✅ 신규** |

- 4서비스 중 PharmacyHub 만 공개 화면에 헤더·메뉴·푸터가 전혀 없었다.
- KPA / K-Cosmetics / Neture 의 기존 구조는 **무변경**(정상 동작 확인 후 보존).

## 2. 변경 (PharmacyHub 만)

신규
- `src/config/navigation.ts` — 메뉴 SSOT (public nav · contextual nav · footer sections)
- `src/components/PharmacyHubGlobalHeader.tsx` — `@o4o/ui` `GlobalHeader` thin bridge
- `src/components/Footer.tsx` — 실제 존재하는 경로만 링크 + `PublicLegalFooterInfo`
- `src/lib/footerLegal.ts` — `createFooterLegalLoader` 바인딩
- `src/layouts/PublicLayout.tsx` — pathless layout route (헤더+푸터 셸)

수정
- `src/App.tsx` — `/`, `/login`, `/join`, `/join/status`, `/forum*`, catch-all 을 `PublicLayout` 으로 감쌈. **URL 무변경**
- `src/pages/HomePage.tsx` — 중복 브랜드 블록 → 히어로. `<header>` → `<section>` (banner landmark 1개)
- `src/pages/RoleEntryPage.tsx` — "후속 WO 예정 기능" 안내 박스 제거 (`plannedFeatures` 는 호출 계약 유지용 deprecated)
- `src/lib/api/pharmacyHubOrders.ts` — `errorMessage()` 가 `error: { code, message }` 객체 body 를 문자열로 환원. 이전에는 객체가 React child 로 렌더돼 `/store-owner/account` 403 시 화이트 스크린

**공통 Core 패키지 · package.json · URL · 권한 · API 계약 무변경.**

## 3. 공통 Core 미변경 근거 (데드링크 회피 방식)

`packages/ui/src/layout/GlobalHeader.tsx` 의 회원가입 버튼은 `<Link to="/register">` 로 경로가 하드코딩돼 있어
`onRegister` 콜백보다 Link 이동이 우선한다. PharmacyHub 에는 `/register` 라우트가 없다(가입 경로는 `/join`).
공통 Core 변경은 본 WO 중지 조건이므로 **`onRegister` 를 주입하지 않고**, 비로그인 시에만 public nav 에
`가입 신청 → /join` 을 넣는 방식으로 해결했다. (별도 WO 후보로 보고)

## 4. 메뉴 노출 조건 = 실제 통과 조건

| 항목 | 조건 | 근거 |
|---|---|---|
| 매장 허브 `/store-hub` | store_owner 또는 operator/admin | `StoreOwnerGuard('pharmacy-hub')` 통과 조건과 동일 |
| 내 약국 `/store-owner` | store_owner 본인만 | `/pharmacy-hub/store-owner/*` API 가 본인 매장 레코드 기준 → operator 는 403 |
| 공급자 `/supplier` | `satisfiesRole(supplier)` | `config/service.ts` `ROLE_SCOPE_MAPPING` |
| 운영자 `/operator` | `satisfiesRole(operator)` (admin 포함) | 동일 |
| 내 계정 `/store-owner/account` | store_owner 본인만 | 상동 |

## 5. 브라우저 검증 (Playwright · 실제 로그인)

`http://localhost:5174` (API = 프로덕션 `api.neture.co.kr`). 각 라우트를 **직접 URL 진입**으로 확인 → deep link · 새로고침 동시 검증.

| 계정 | 역할 | 결과 |
|---|---|---|
| `renagang21@gmail.com` | `pharmacy-hub:store_owner` | 로그인 OK · contextual nav `['/', '/forum', '/store-hub', '/store-owner']` |
| `sohae2100@gmail.com` | `pharmacy-hub:operator` | 로그인 OK · contextual nav `['/', '/forum', '/store-hub', '/operator']` |

| 구분 | 라우트 | headerCount | footer | "준비 중" | 화이트 스크린 |
|---|---|:---:|:---:|:---:|:---:|
| 비로그인 | `/` `/login` `/join` `/join/status` `/forum` `/forum/posts` 없는 경로 | 1 | O | 0 | 0 |
| 로그인 공개 | 위 5개 | 1 | O | 0 | 0 |
| 역할 셸 | `/store-hub` `/store-owner` `/store-owner/account` `/supplier` `/supplier/products` `/operator` `/operator/memberships` | 1 | X (의도) | 0 | 0 |
| 모바일 390×844 | `/` `/forum` `/join` | 1 | O | 0 | 0 |

- 비로그인 헤더 링크 = `['/', '/forum', '/join']` — **데드링크 0** (`/register` 없음)
- 역할 셸은 자체 상단바를 쓰므로 `PublicLayout` 미적용 → 헤더 중복 0, 푸터 없음이 정상
- `/qr/:slug` 공개 랜딩은 기존 계약 그대로 미적용

### 남은 네트워크 응답 (모두 계약상 정상)
- `404 /api/v1/public/services/pharmacy-hub/footer-legal` — 법적 정보 미등록 상태. `PublicLegalFooterInfo` 계약상 아무것도 렌더하지 않는다 (하드코딩 금지 원칙 준수)
- `403` — 해당 역할이 없는 라우트에 **직접 URL 로 진입**한 검증 프로브. 메뉴에는 노출되지 않으므로 사용자 동선상 발생하지 않는다

### 콘솔 JS 예외
- 두 계정 모두 **비네트워크 JS 예외 0건**

## 6. typecheck / build

- `pnpm --filter pharmacy-hub-web type-check` — PASS
- `pnpm --filter pharmacy-hub-web build` — PASS (built in 12.11s)

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
(제안: `packages/ui` `GlobalHeader` 의 `/register` 하드코딩을 `registerHref` prop 으로 승격 — 공통 Core 변경이라 본 WO 범위 밖)
