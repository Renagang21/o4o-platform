# CHECK — Cross-Service Mobile Bottom Nav 공통화 V1

- **WO**: [`WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1`](../work-orders/WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1.md)
- **작업일**: 2026-08-21
- **상태**: COMPLETED
- **판정**: **CORE_ONLY** (렌더 shell 100% 공통 · 메뉴 구성/route/active 판정/알림 라우팅 SSOT 는 서비스 잔존 — 아래 §12 근거)

---

## 1. 실제 대상 파일

| 서비스 | 파일 | 비고 |
|---|---|---|
| KPA-Society | `services/web-kpa-society/src/components/MobileBottomNav.tsx` | 소비 shell 5 (App/Layout/Admin/Instructor/KpaOperator) |
| GlycoPharm | `services/web-glycopharm/src/components/MobileBottomNav.tsx` | 소비 shell 1 |
| K-Cosmetics | `services/web-k-cosmetics/src/components/MobileBottomNav.tsx` | 소비 shell 1 |
| Neture | `services/web-neture/src/components/NetureBottomNav.tsx` | 소비 shell 6 (Main/Neture/Admin/Operator/Partner/SupplierSpace) · **primary 탭바 아님 = 인증 사용자 전용 utility nav** |

라우터·shell·헤더·사이드바·푸터는 **미변경**. 4개 파일 외 서비스 소스 변경 0건.

---

## 2. 공통 Core 위치와 선택 근거 (§11.1)

**위치**: `packages/account-ui/src/mobile-nav/` (신규 패키지 만들지 않음)

근거:

1. 4개 서비스 모두 이미 `@o4o/account-ui` 를 dependency 로 선언하고 있다.
2. 4개 서비스 Dockerfile 이 이미 `pnpm --filter @o4o/account-ui build` 를 수행한다.
3. 4개 서비스 tailwind config 가 이미 `packages/account-ui/src/**` 를 스캔한다 → 클래스 purge 사고 없음.
4. 이 nav 들이 이미 소비 중인 `useNotifications` · `NotificationSheet` · `NotificationTabBadge` · `resolveNotificationTarget` 의 소유 패키지가 account-ui 다.
5. **신규 패키지 회피** — `services/web-kpa-society/Dockerfile` 은 선별 COPY 방식이라 신규 패키지 추가 시 COPY 2줄 누락으로 빌드가 깨진다. 기존 패키지에 넣어 이 함정을 원천 제거했다.

`@o4o/shared-space-ui` 는 위 4·5번 근거가 없어 탈락.

### Core 구성 (6 파일 · 445 raw / 305 code LOC)

| 파일 | 역할 |
|---|---|
| `mobileBottomNavStyles.ts` | 스타일 토큰(nav base class · safe-area · tab · label · badge) |
| `MobileBottomNavShell.tsx` | `<nav>` 배치 + `MobileBottomNavSpacer` + `MobileBottomNavBackdrop` |
| `MobileBottomNavTab.tsx` | 탭 1개 마크업(Link/button 분기 · icon strokeWidth · emphasis · badge) |
| `MobileBottomNav.tsx` | items 배열 API (WO §6 권고형) |
| `MobileBottomNavProfileSheet.tsx` | KPA/Neture 프로필 bottom sheet 골격 |
| `useMobileBottomNavSheet.ts` | 시트 개폐 3-state + ESC 닫기 + body scroll lock + route 변경 시 닫기 |

`packages/account-ui/src/index.ts` 에 export 블록 추가.

**§7.2 준수**: Core 안에 `serviceKey` 분기 0건, route 문자열 0건. Core 는 어떤 서비스인지 모른다.

---

## 3. 서비스별 wrapper 방식

| 서비스 | 잔존 내용 |
|---|---|
| KPA | `ACTIVE_COLOR=#2563eb` · `BADGE_STYLE={top:-6,fontWeight:600}` · `isPharmacyActive`(slug whitelist 정규식 원문 유지) · `isCommunityActive`(4조건) · 서비스 로컬 `notificationRouting` · 게스트 2탭(커뮤니티+로그인 emphasis) · 프로필 시트(KpaUserMenuItems + 역할 라벨) |
| GlycoPharm | `ACTIVE_COLOR=#059669` · `Z_INDEX_CLASS='z-50'` · `isPharmacyActive`(`/^\d/` 제외) · `isCommunityActive`(5조건, `/content` 포함) · 공통 `resolveNotificationTarget` · 내정보=`/mypage` Link |
| K-Cosmetics | `ACTIVE_COLOR=#db2777` · `Z_INDEX_CLASS='z-50'` · `isStoreActive`(`/mobile/store`) · 라벨 `매장 경영` · 나머지 GP 와 동형 |
| Neture | `ACTIVE_COLOR=#059669` · `BADGE_STYLE={top:-6,fontWeight:600}` · **비인증 시 `null`**(hook 뒤에서 분기) · `MobileBottomNavSpacer` · 3탭(홈/알림/내정보) · 로컬 `resolveNetureNotificationTarget` |

---

## 4. LOC 및 제거된 중복 (§14)

| 구분 | Before | After | 차이 |
|---|---:|---:|---:|
| 서비스 4파일 (raw) | 1,030 | 629 | **−401** |
| 서비스 4파일 (주석/공백 제외) | 817 | 462 | **−355** |
| Core 6파일 (raw / code) | — | 445 / 305 | 신규 |
| 합계 (code only) | 817 | 767 | −50 |

**제거된 중복(핵심 지표)**

- 스타일 토큰 블록 **4벌 → 1벌**
- ESC 닫기 / body scroll lock / route 변경 시 닫기 effect **4벌 → 1벌**
- 탭 마크업(Link·button·icon·label·badge) **15벌 → 1벌**
- 프로필 bottom sheet 마크업 **2벌 → 1벌**

합계 LOC 가 크게 줄지 않은 이유: 서비스 파일의 WO 이력 주석을 보존했고, Core 에 계약 주석을 새로 넣었다. 실제 중복 렌더 코드는 위 4항목만큼 제거되었다.

---

## 5. active 판정 보존 결과 (§8)

- 서비스별 predicate(`isPharmacyActive` / `isStoreActive` / `isCommunityActive`)는 **원문 그대로 서비스 파일에 잔존**. Core 로 옮기지 않았다 — 옮기면 공통 계층이 업무 route 를 알게 된다.
- KPA 의 `/store/:slug` whitelist 정규식, GP·KCos 의 `/^\d/` 소비자 경로 제외, community predicate 의 `/content` 포함 여부 차이 모두 **정규화하지 않고 그대로 유지**.
- 브라우저 검증(§7)에서 route 별 active 색 전환을 실측 확인.

---

## 6. 4개 서비스 typecheck / build (있는 그대로)

사전: 워크트리에 `node_modules` 부재 → `pnpm install --frozen-lockfile` (6m25s) 수행.

| 단계 | 결과 |
|---|---|
| `pnpm run build:packages` | **PASS** (18 packages) |
| `pnpm --filter @o4o/account-ui build` | **PASS** |
| web-kpa-society `pnpm run build` (`tsc` 포함) | **PASS** (4,326 modules, 37.12s) |
| web-glycopharm `pnpm run build` | **PASS** (4,078 modules, 1m18s) |
| web-k-cosmetics `pnpm run build` | **PASS** (4,032 modules, 33.41s) |
| web-neture `pnpm run build` | **PASS** (4,100 modules, 56.77s) |

> 참고: 단독 `tsc --noEmit` 을 `build:packages` 이전에 돌리면 미빌드 sibling 패키지 때문에 기존 `TS2307/TS7006` 이 대량 출력된다(이번 변경과 무관). 저장소 표준 순서(`build:packages` → 서비스 `build`)로 수행했다.

---

## 7. 모바일 browser smoke (viewport 390 × 844)

**환경 메모**: MCP Playwright(persistent Chrome profile `C:\Users\home\.playwright-o4o-profile`)는 프로필 잠금으로 기동 실패(`exitCode=0`, "이미 다른 세션에서 열려 있습니다"). 대안으로 저장소에 설치된 Playwright chromium 을 headless·모바일 emulation(390×844, isMobile, hasTouch)으로 직접 구동해 실측했다.
**CORS 제약**: API(`api.neture.co.kr`)가 `http://localhost:3000` origin 만 허용 → 4개 dev 서버를 **포트 3000 에서 순차 기동**해 검증했다.

| 검사 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|---|:--:|:--:|:--:|:--:|
| 비로그인 nav | 2탭(커뮤니티/로그인) | 2탭 | 2탭 | **렌더 없음(정상 — utility nav)** |
| 로그인 nav 항목 수·라벨 | 4 (커뮤니티/약국 경영/알림/내정보) | 4 (…) | 4 (커뮤니티/**매장 경영**/알림/내정보) | 3 (홈/알림/내정보) |
| 브랜드 active 색 | `rgb(37,99,235)` | `rgb(5,150,105)` | `rgb(219,39,119)` | `rgb(5,150,105)` |
| z-index | 40 | 50 | 50 | 40 |
| 고정 위치·높이 | top 793 / h 51 (innerH 844) | 동일 | 동일 | 동일 |
| 탭 클릭 라우팅 | `/mobile/pharmacy` OK | OK | `/mobile/store` OK | — |
| 중첩 route active | OK | OK | OK | OK |
| 알림 시트 + 배지 | OK | OK (배지 1) | OK | OK (배지 5) |
| body scroll lock → ESC 복원 | `hidden` → `''` | 동일 | 동일 | 동일 |
| 프로필 시트 | OK (`내 정보 메뉴`) | 해당 없음(Link) | 해당 없음(Link) | OK |
| flow spacer | 해당 없음 | 해당 없음 | 해당 없음 | OK (렌더 확인) |
| 데스크톱 1280px 비표시 | OK (0개) | OK | OK | OK |
| console error | 0 | 0 | 0 | 0 |
| 4xx/5xx | 0 | 2 (아래 참고) | 0 | 0 |

- GlycoPharm 의 404 2건은 `/privacy` 진입 시 `GET /api/v1/public/services/glycopharm/policies/privacy` — 하단 nav 와 무관한 **기존 결함**(WO §13 범위 밖, 보고만 함).
- Neture·GP 는 계정 역할에 따라 `/` 가 각각 `/supplier/dashboard`, `/admin` 으로 리다이렉트되어 홈 탭이 비활성으로 관측되는데, 이는 **기존 라우팅 동작**이며 active 로직 정상(게스트 `/` 에서 홈/커뮤니티 탭 active 확인).

검증 계정: `docs/local/TEST-ACCOUNTS.local.md` (KPA `sohae2100@…`, GP/KCos/Neture `renagang21@…`).

---

## 8. 회귀 위험 및 미조치 항목

- **소비 shell**: KPA 5 · Neture 6 곳에서 각각 렌더되지만 컴포넌트 export 시그니처(props 없음)를 바꾸지 않아 shell 측 변경 0건.
- 알림 라우팅 SSOT 이 KPA·Neture(서비스 로컬) / GP·KCos(공통 account-ui) 로 갈린 상태는 **WO 범위 밖** → 통합하지 않고 주입만 했다.
- Neture 를 나머지 3개와 같은 primary 탭바 형태로 맞추지 않았다(WO §12).

---

## 9. 범위 밖 발견 (보고만)

1. GlycoPharm `/privacy` 정책 API 404 (위 §7).
2. 알림 라우팅 헬퍼 SSOT 2원화(서비스 로컬 vs `@o4o/account-ui`).
3. 서비스 간 z-index(40/50)·배지 오프셋(−4/−6) 드리프트 — 이번에는 **의도적으로 보존**(디자인 재설계 금지 §9/§10). 통일 필요 시 별도 WO.

---

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.

---

## 11. Git

- commit message: `refactor(ui): commonize mobile bottom navigation`
- 대상 경로만 path-specific stage (`git add .` 미사용).

---

## 12. 판정 근거 — 왜 `CORE_ONLY` 인가 (§19)

렌더 계층(nav 배치 · 탭 마크업 · 스타일 토큰 · backdrop · spacer · 프로필 시트 · 시트 개폐)은 **4개 서비스 전부 공통화 완료**. 반면 메뉴 구성(2·3·4탭), 이동 route, active predicate, 알림 라우팅 SSOT, 프로필 메뉴 SSOT, 인증/게스트 분기 정책은 서비스마다 실제로 다르며, 이를 Core 로 끌어오려면 `serviceKey` 분기 또는 전체 nav config 프레임워크가 필요해 §7.1·§7.2 를 위반한다. 따라서 **정직한 부분 공통화**로 종료한다.
