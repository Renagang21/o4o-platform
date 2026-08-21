# CHECK-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1

- **WO**: [`WO-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1`](../work-orders/WO-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1.md)
- **실행일**: 2026-08-21
- **판정**: **PASS — MISSING_REQUIRED 0 / 코드 변경 0건**
- **선행 기준**: [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) · [`CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1 §A-5`](CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md) · [`CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1`](CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1.md)

> WO 본문 뒤 「부기 — 실행 시점 측정값」은 지시가 아니다. 본 CHECK 의 모든 수치·판정은 §5 대로 현재 main 코드와 프로덕션에서 직접 재확인한 결과다.

---

## 1. 현재 main 모집단

기준 커밋: `origin/main` = `46216e841`, PharmacyHub 관련 최종 커밋 = `ee8ba929f` (2026-08-21 12:55 KST).

census §A-5 는 10건이었으나 **현재 main 실측은 8건**이다. `SupplierShell.tsx`(H7)·`components/supplier/SupplierHeader.tsx`(H9) 는 `769f562d5`
(WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1) 에서 **파일 자체가 제거**되었다 — 현재 `services/web-pharmacy-hub/src/components/supplier/` 디렉터리는 존재하지 않는다.

| # | 파일 | LOC | 활성 | 비고 |
|---|---|---|---|---|
| H1 | `components/PharmacyHubGlobalHeader.tsx` | 161 | active | 공통 `GlobalHeader`(@o4o/ui) bridge |
| H2 | `components/Footer.tsx` | 67 | active | `PublicLegalFooterInfo` 사용 |
| H3 | `layouts/PublicLayout.tsx` | 32 | active | 헤더+Outlet+푸터 |
| H4 | `layouts/StoreOwnerShell.tsx` | 96 | active | `MyStoreShell`(@o4o/store-ui-core) |
| H5 | `layouts/OperatorLayoutWrapper.tsx` | 83 | active | `OperatorAreaShell` |
| H6 | `layouts/AdminLayoutWrapper.tsx` | 63 | active | `OperatorAreaShell` |
| H8 | `components/operator/OperatorHeader.tsx` | 81 | active | operator/admin 셸 상단바 |
| H10 | MobileBottomNav | 0 파일 | 부재 | §12 판정 대상 (아래 13절) |
| — | `config/navigation.ts` | 127 | active | `PH_PUBLIC_NAV` / `PH_CONTEXTUAL_NAV` / `PH_FOOTER_SECTIONS` |

---

## 2. Header/Footer/Shell 별 실제 소비 route

| 셸 | 소비 route | 헤더 | 푸터 |
|---|---|---|---|
| `PublicLayout` | `/`, `/login`, `/join`, `/join/status`, `/account`, `/terms`, `/privacy`, `/service-guide`, `/guide/*`, `/community`, `/community/search`, `/forum/*`, `/education/*`, `*`(NotFound) | `PharmacyHubGlobalHeader` | `Footer` |
| `StoreOwnerShell` | `/store-hub`, `/store-owner/*`(cart·products·orders·content·payment 포함) | `StoreTopBar`(store-ui-core) | 없음 |
| `OperatorLayoutWrapper` | `/operator/*` | `OperatorHeader` | 없음 |
| `AdminLayoutWrapper` | `/admin` | `OperatorHeader` | 없음 |
| 셸 없음 | `/qr/:slug` | — | — |

`PublicLayout` 주석의 계약("각 역할 업무 셸이 자체 상단바를 갖는다. 여기 헤더를 얹으면 이중 헤더가 된다")을 코드에서 확인했고, 프로덕션 smoke 에서도 `/store-owner`·`/operator`·`/admin` 의 `<header>` 가 정확히 1개임을 확인했다.

---

## 3. Capability census (미판정 0)

### Header capability (16)

| capability | 판정 | 근거 |
|---|---|---|
| 서비스 logo/name | ADOPTED | GlobalHeader brand / StoreTopBar / OperatorHeader 모두 `BRAND` 사용 |
| home navigation | ADOPTED | brand→`/`, StoreOwnerShell `홈`, OperatorHeader `홈` |
| desktop navigation | ADOPTED | `PH_PUBLIC_NAV` 4항 + `PH_CONTEXTUAL_NAV` 3항 / Store·Operator 사이드바 |
| mobile navigation | ADOPTED | 공개=햄버거 drawer, 매장=`#store-work-drawer`, 운영자=`운영자 메뉴 열기` — 3개 셸 모두 390px 에서 동작 확인 |
| hamburger/drawer | ADOPTED | 위와 동일 (desktop 에서는 비노출 확인) |
| 사용자 표시 | ADOPTED | 공개 헤더 사용자명 표시, 매장 배지, 운영자 헤더 사용자명 표시 |
| profile 진입 | ADOPTED | 사용자 메뉴 `내 프로필=>/account`, 매장 사이드바 `설정 > 내 계정` |
| logout | ADOPTED | 사용자 메뉴 / `StoreSidebar` / `OperatorHeader` 각각 존재 |
| role 표시 | ADOPTED | `약국 경영자` · `서비스 운영자` · `서비스 관리자` 배지 |
| 권한별 action | ADOPTED | `filterContextualNav` — 비로그인 헤더에 `매장 허브`·`내 약국` 미노출 확인 |
| authenticated/public 분기 | ADOPTED | 비로그인=로그인/회원가입, 로그인=사용자 메뉴 |
| sticky/fixed 처리 | ADOPTED | 세 헤더 모두 sticky |
| content offset | ADOPTED | 모든 probe 에서 `horizontalOverflow=false`, 헤더-본문 겹침 없음 |
| notification | ADOPTED | desktop=`NotificationBell`(utilitySlot) 노출 확인, mobile=`/account` 전용 벨 노출 확인 |
| cart | ADOPTED | `/store-owner/cart` 정상 + 사이드바·StoreHub·상품/주문 화면에서 진입 |
| service switch | NOT_APPLICABLE | PharmacyHub 는 단일 서비스이고 supplier 축이 없다(baseline 원칙 5) — 전환 대상 자체가 없다 |

### Footer capability (11)

| capability | 판정 | 근거 |
|---|---|---|
| 회사/서비스 정보 | ADOPTED | `BRAND.name` + 태그라인 + `pharmacyhub.co.kr` |
| canonical legal info | ADOPTED | `PublicLegalFooterInfo` + `createFooterLegalLoader` (`lib/footerLegal.ts`) |
| terms | ADOPTED | `/terms` 존재·렌더 확인 |
| privacy | ADOPTED | `/privacy` 존재·렌더 확인 |
| copyright | ADOPTED | `© 2026 Pharmacy-Hub. All rights reserved.` — 연도 stale 아님 |
| public footer | ADOPTED | `PublicLayout` 전 공개 route |
| mobile 표현 | ADOPTED | 390×844 에서 푸터 정상 노출·가로 overflow 없음 |
| contact/support | NOT_APPLICABLE | `/contact` route 가 존재하지 않는다(코드 검색 0건). 넣으면 즉시 데드링크 → **누락이 의도된 계약**이다 |
| authenticated shell footer | NOT_APPLICABLE | 아래 6절 참조 |
| store/storehub footer | NOT_APPLICABLE | 아래 6절 참조 |
| operator footer | NOT_APPLICABLE | 아래 6절 참조 |

---

## 4. ADOPTED

Header 15 / Footer 7 = **22건**. 위 표 참조. 모두 **이번 WO 이전에 이미 공통 Core 를 채택**하고 있었으며, 실브라우저에서 동작을 확인했다.

## 5. MISSING_REQUIRED

**0건.**

§17 에 따라 MISSING_REQUIRED 가 0 이므로 코드 변경을 억지로 만들지 않았다. 본 WO 의 산출물은 조사·검증·CHECK 다.

## 6. NOT_APPLICABLE

| 항목 | 이유 |
|---|---|
| footer `contact/support` | `/contact` route 부재 → 링크 추가 시 데드링크. 누락이 의도된 계약 |
| header `service switch` | 단일 서비스 · supplier 축 없음(baseline 원칙 5, drift 금지 #2) |
| authenticated shell footer (store / store-hub / operator / admin) | `StoreFacingFooter` 도입은 [`CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1`](CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1.md) 에서 GlycoPharm·K-Cosmetics·KPA 3서비스 대상이었고 PharmacyHub 는 그 WO 범위에 없었다. 법정정보는 공개 화면 푸터로 도달 가능하며, 업무 셸에 푸터가 없다는 사실만으로 결함이 아니다. §8.1 대칭 맞추기 금지에 따라 이번 WO 에서 임의 주입하지 않았다 |
| MobileBottomNav 부재 (census H10) | 13절 참조 — 부재가 의도된 계약 |
| SupplierShell / SupplierHeader (census H7·H9) | 파일이 존재하지 않는다(`769f562d5` 제거). NOT_IMPLEMENTED 가 아니라 **해당 없음** |

## 7. SERVICE_SPECIFIC

| 항목 | 내용 |
|---|---|
| `OperatorHeader.tsx` (81 LOC) | operator/admin 셸 전용 최소 상단바(브랜드·영역 배지·홈·사용자·로그아웃). 알림 벨·프로필 드롭다운이 없다. 공개 `GlobalHeader` 를 얹으면 §8.3 이 금지한 신규 헤더 프레임워크 또는 이중 헤더가 된다. 서비스 고유 구현으로 유지 |
| `PH_PUBLIC_NAV` / `PH_CONTEXTUAL_NAV` / `PH_FOOTER_SECTIONS` | 라벨·route 가 PharmacyHub 고유(`/terms`·`/privacy`). KPA(`/policy`)·Neture(`/terms`) 와 다르며 **복사하지 않았다** |
| `MyProfilePage` 모바일 전용 알림 벨 | 모바일 하단 nav 가 없는 PharmacyHub 에서 `/account` 를 canonical 모바일 알림 진입점으로 삼는 기존 계약. 코드 주석에 명문화되어 있고 실브라우저에서 노출 확인 |

## 8. DEAD_OR_UNUSED

| 항목 | 내용 |
|---|---|
| `PH_PUBLIC_NAV` 의 `children` (커뮤니티 / 이용 안내 하위 항목) | 공통 `GlobalHeader` 는 desktop nav 에서도 mobile drawer 에서도 **최상위 항목만 렌더**하고 `children` 을 렌더하지 않는다. 4개 서비스 중 `children` 을 채운 것은 PharmacyHub 뿐이라 해당 config 는 현재 화면에 나타나지 않는다. 다만 하위 route 는 모두 화면 내부 링크로 도달 가능하다(CommunityHomePage 카드 → 포럼·교육·검색·내 글·가이드, ForumHubPage → `/forum/request`·`/forum/my-dashboard`) → **데드엔드 0**. §7·§18 에 따라 삭제하지 않았다. 해소하려면 공통 GlobalHeader 에 드롭다운 abstraction 이 필요해 §8.3·§27 에 걸린다 → 별도 WO 후보 |

## 9. 구현한 gap

**없음.** MISSING_REQUIRED 0 (§17).

## 10. 구현하지 않은 기능과 이유

| 미구현 | 이유 |
|---|---|
| 업무 셸(store/operator/admin) 푸터 | 6절 참조. 다른 서비스와의 대칭만을 근거로 주입하는 것은 §8.1 위반 |
| operator/admin 헤더 알림 벨 | 알림 canonical 진입점은 공개 헤더(desktop)와 `/account`(mobile). 운영자 셸에 벨을 추가하면 알림 라우팅 계약을 셸마다 중복시킨다 |
| 헤더 장바구니 단축 아이콘 | §11 — 장바구니 진입점이 이미 사이드바·StoreHub·상품/주문/결제 화면에 존재. 추가는 중복 |
| `/contact` 푸터 링크 | route 부재 → 데드링크 |
| MobileBottomNav | 13절 판정 결과 NOT_APPLICABLE |
| GlobalHeader 드롭다운(children 렌더) | 공통 Core 신규 abstraction — §8.3·§27 중단 기준 |

## 11. canonical Core/config 재사용 내역

신규 Header/Footer/Navigation/config/role 프레임워크를 **하나도 만들지 않았다**(§8.3). 현재 재사용 중인 Core:

- `GlobalHeader` (`@o4o/ui`) — 4-slot 계약 (brand / publicNav / contextualNav / utilitySlot / userMenuItems)
- `NotificationBell`·`useNotifications`·`resolveNotificationTarget`·`getUserDisplayName` (`@o4o/account-ui`)
- `PublicLegalFooterInfo` + `createFooterLegalLoader` (법정정보 공통 계약)
- `MyStoreShell` → `StoreDashboardLayout` / `StoreTopBar` / `StoreSidebar` (`@o4o/store-ui-core`) + `PHARMACY_HUB_STORE_CONFIG`
- `OperatorAreaShell` + `DomainIASidebar` (`@o4o/operator-ux-core`)
- `StoreOwnerGuard` + `MembershipGate` 2단 게이팅

## 12. legal contract 결과

- `Footer.tsx` → `<PublicLegalFooterInfo serviceKey="pharmacy-hub" loadProfile={loadFooterLegal} />` — canonical 계약 사용. 인라인 하드코딩 법정정보 0건.
- `/terms`·`/privacy` 는 route 존재, 200 응답, 셸·푸터 정상.
- 프로덕션 현재 데이터에서 두 화면 본문은 "현재 공개된 문서가 없습니다" 이고 콘솔에 문서 조회 404 가 1건 찍힌다. 이는 **콘텐츠(정책 문서) 미게시** 상태이지 헤더/푸터 계약 결함이 아니다. `/admin` 대시보드에서도 `법정정보 필수 항목 0/6 · 게시중 정책 문서 0` 으로 동일하게 표시된다. 본 WO 범위 밖(§18 콘텐츠) → 19절에 기록.

## 13. mobile navigation 판정

**NOT_APPLICABLE — 부재가 의도된 계약이다** (§23 에 따라 명시).

근거:

1. `PublicLayout` 주석 계약: 업무 셸은 자체 상단바를 갖고 공개 헤더를 얹지 않는다(이중 헤더 금지). 하단 nav 를 추가하면 매장 사이드바 drawer 와 진입점이 이중화된다.
2. 모바일 3개 셸 모두 이미 자체 내비게이션이 동작한다 — 공개 햄버거 drawer(홈/커뮤니티/교육/이용 안내), 매장 `#store-work-drawer`(width 256, 전체 업무 메뉴 + 로그아웃), 운영자 `운영자 메뉴 열기`.
3. 모바일 알림 진입점은 `MyProfilePage` 의 `/account` 전용 벨로 이미 해결되어 있고 그 주석이 "PharmacyHub 에는 모바일 하단 nav 가 없다"를 명문화하고 있다.
4. 도입하려면 `@o4o/account-ui` `MobileBottomNav` 소비처를 새로 만들고 role 별 탭 정책을 정해야 한다 → §8.1 대칭 맞추기 · §8.3 신규 abstraction 에 걸린다.

## 14. typecheck / build

| 항목 | 결과 |
|---|---|
| 코드 변경 | 0건 (문서만) |
| `pnpm --filter pharmacy-hub-web build` (1차) | **FAIL** — `TS2307 Cannot find module '@o4o/ui' / '@o4o/account-ui' / '@o4o/content-editor' / '@o4o/auth-utils'` 외 다수. 원인은 본 worktree 에 workspace 패키지 `dist` 가 없어서였다(`packages/ui/dist` 부재). 코드 결함 아님 |
| `pnpm run build:packages` | PASS (exit 0) |
| `pnpm --filter pharmacy-hub-web build` (재실행) | PASS (`tsc -b && vite build`) |

> 패키지 이름 주의: 필터 키는 `pharmacy-hub-web` 이다. `@o4o/web-pharmacy-hub` 로 필터하면 "No projects matched the filters" 와 함께 **exit 0 (거짓 통과)** 가 난다.

## 15. desktop / mobile browser 결과

Playwright 실브라우저, 대상 `https://pharmacyhub.co.kr` (프로덕션).

### Desktop 1440×900 — 공개

| route | status | 헤더 | 푸터 | `href="#"` | 콘솔 error |
|---|---|---|---|---|---|
| `/` | 200 | 표시(홈/커뮤니티/교육/이용 안내 + 로그인/회원가입) | 표시(12 링크) | 0 | 0 |
| `/terms` | 200 | 표시 | 표시 | 0 | 1 (정책 문서 404 — 12절) |
| `/privacy` | 200 | 표시 | 표시 | 0 | 1 (동일) |
| `/service-guide` | 200 | 표시 | 표시 | 0 | 0 |
| `/community` | 200 | 표시 | 표시 | 0 | 0 |

푸터 링크 12개 전량이 실제 route 로 해석된다: `/`, `/community`, `/forum`, `/education`, `/service-guide`, `/guide/intro`, `/guide/features`, `/join`, `/join/status`, `/terms`, `/privacy`. **데드링크 0 · `href="#"` 0 · 가로 overflow 0.**

### Desktop 1440×900 — 매장 경영자 (로그인)

| route | status | 결과 |
|---|---|---|
| `/` | 200 | 헤더에 `매장 허브`·`내 약국` contextual nav 추가 노출, 알림 벨 노출 |
| `/store-hub` | 200 | StoreTopBar + 사이드바, header 1개, 푸터 없음 |
| `/store-owner` | 200 | 동일 |
| `/store-owner/products` | 200 | 사이드바 `공급 상품 / 장바구니 / 주문 내역` 노출 |
| `/store-owner/cart` | 200 | 장바구니 화면 정상 |
| `/account` | 200 | 공개 셸 + 알림 벨 2개(desktop 1 · mobile 1, 뷰포트별 1개만 visible) |

사용자 메뉴 열기 → `내 약국=>/store-owner`, `내 프로필=>/account`, `가입 상태=>/join/status`, `로그아웃` 확인. 전 route 콘솔 error 0.

### Mobile 390×844

| 항목 | 결과 |
|---|---|
| 공개 `/` | 헤더 축약 + `메뉴 열기` 노출, 푸터 정상 |
| 공개 drawer | `홈=>/`, `커뮤니티=>/community`, `교육=>/education`, `이용 안내=>/service-guide` (하위 children 미렌더 — 8절) |
| `/terms` | 정상 (정책 문서 404 는 12절) |
| `/store-owner` | header 1개(`약국 경영자`), 사이드바 drawer 열림 x=0 width=256, 전체 업무 메뉴 + 로그아웃 |
| `/account` | 모바일 전용 알림 벨 visible=true, desktop 벨 visible=false |
| `/operator` | `운영자 메뉴 열기` 노출, 메뉴 전체 접근 |
| 가로 overflow | 전 route 0 |

### Operator / Admin (desktop)

| route | status | 결과 |
|---|---|---|
| `/operator` | 200 | `Pharmacy-Hub 서비스 운영자 / 홈 / 사용자명 / 로그아웃` + 사이드바(가입·회원 운영, 커뮤니티 운영, 공통 운영), 콘솔 error 0 |
| `/admin` | 200 | `Pharmacy-Hub 서비스 관리자` + `법정정보·약관 설정`, 콘솔 error 0 |

## 16. production 검증 여부

**프로덕션 검증 완료 (preview 아님).**

- Cloud Run `pharmacy-hub-web` latestReady = `pharmacy-hub-web-00129-jfw`, ready 시각 `2026-08-21T04:27:25Z`.
- PharmacyHub·공통 패키지 관련 최종 커밋 `4e883b970` (`2026-08-21T04:24:26Z`) 보다 나중에 배포된 리비전이므로, 위 smoke 는 현재 main 코드의 프로덕션 결과다.
- 검증 계정은 [`docs/local/TEST-ACCOUNTS.local.md`](../local/TEST-ACCOUNTS.local.md) (SSOT) 를 사용했고 본 문서에 자격증명을 기록하지 않는다.

## 17. census 최종 분류 갱신

`CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1 §A-5` 대비:

| # | 기존 | 갱신 | 사유 |
|---|---|---|---|
| H1 | CO | **CO** (ADOPTED) | 공통 GlobalHeader bridge — 변경 없음 |
| H2 | CO | **CO** (ADOPTED) | 공통 법정정보 계약 — 변경 없음 |
| H3 | FC | **FC** (ADOPTED) | 변경 없음 |
| H4 | **NI** | **SERVICE_SPECIFIC / ADOPTED** | `MyStoreShell` 자체가 공통 Core 이고 header/footer slot 미주입은 `hideTopBar` 계약상 **의도된 기본값**(slot 주입 시 공통 StoreTopBar 가 사라진다). 필요 기능 누락 0 → NI 아님 |
| H5 | FC | **FC** (ADOPTED) | 변경 없음 |
| H6 | FC | **FC** (ADOPTED) | 변경 없음 |
| H7 | **NI** | **NOT_APPLICABLE** | 파일 제거됨(`769f562d5`). supplier 역할 없음 |
| H8 | **NI** | **SERVICE_SPECIFIC** | 업무 셸 전용 최소 상단바. GlobalHeader 채택은 이중 헤더/신규 abstraction |
| H9 | **NI** | **NOT_APPLICABLE** | 파일 제거됨(`769f562d5`) |
| H10 | **NI** | **NOT_APPLICABLE** | 13절 — 부재가 의도된 계약 |

갱신 후 PharmacyHub 집계: **FULLY_COMMON 3 / CORE_ONLY 2 / VIEW_DUPLICATED 0 / SERVICE_SPECIFIC 2 / NOT_IMPLEMENTED 0 / NOT_APPLICABLE 3 / UNCLASSIFIED 0.**

목표 달성: 실질적 VIEW_DUPLICATED 0 · 필요한 NOT_IMPLEMENTED 0 · UNCLASSIFIED 0.

> 본 CHECK 는 census 문서 본문을 수정하지 않았다(기록물 불가침, CLAUDE.md §16-1). 갱신 분류는 본 문서가 정본이다.

## 18. 미확인 항목

| 항목 | 상태 | 사유 |
|---|---|---|
| `/store-owner/payment/*` 화면 | 미확인 | 실결제 흐름 진입이 필요해 smoke 대상에서 제외 |
| `/store-owner` 매장 조직 연결 상태의 셸 | 미확인 | 테스트 계정이 `매장 정보 미연결` 상태라 조직 연결 후의 헤더/사이드바 변화는 확인하지 못함 |
| `/qr/:slug` | 미확인 | 셸 없음(헤더/푸터 대상 아님) + 유효 slug 필요 |
| `/operator/*` 하위 개별 화면 | 미확인 | 셸 헤더 검증 목적상 `/operator` 대표 1건으로 갈음 |

## 19. 범위 밖 발견 (수정하지 않음 · 별도 WO 후보)

1. **공통 `GlobalHeader` 가 nav `children` 을 렌더하지 않는다** — `packages/ui/src/layout/GlobalHeader.tsx` 는 desktop nav·mobile drawer 모두 최상위 항목만 렌더한다. `children` 을 채운 서비스는 PharmacyHub 뿐이라 현재 사용자 영향은 없고 데드엔드도 없다. 해소하려면 공통 헤더에 드롭다운 abstraction 이 필요 → 4서비스 영향 검토가 선행되어야 한다(CLAUDE.md §1 Shared Module Change Rule).
2. **PharmacyHub 법정정보·정책 문서 미게시** — 프로덕션에서 `/terms`·`/privacy` 본문이 비어 있고 `/admin` 이 `법정정보 필수 항목 0/6` 을 보고한다. 콘텐츠 운영 이슈이며 헤더/푸터 계약 결함이 아니다.
3. **census §A-5 stale** — H7·H9 가 이미 제거된 파일을 NI 로 기록하고 있다. census 는 기록물이라 본 WO 에서 수정하지 않았다(CLAUDE.md §16-1).
4. **`pharmacy-hub-web` 필터 키 혼동 위험** — `@o4o/web-pharmacy-hub` 필터는 아무것도 매칭하지 않고 exit 0 을 반환해 거짓 통과를 만든다. CI/검증 스크립트에 동일 패턴이 있는지 별도 점검 후보.

---

## 완료 판정

- MISSING_REQUIRED **0** → §17 에 따라 코드 변경 없음. §28 정상 완료.
- 미판정 **0**. 데드링크 **0**. `href="#"` **0**. 타 서비스 route/라벨 복사 **0**. 신규 abstraction **0**.
- 본 완료는 §29 대로 **PharmacyHub Header/Footer capability gap closure 완료** 만을 의미한다.
