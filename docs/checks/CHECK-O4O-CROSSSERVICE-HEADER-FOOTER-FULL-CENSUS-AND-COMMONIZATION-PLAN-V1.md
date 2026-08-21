# CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1

> **WO**: `docs/work-orders/WO-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md`
> **성격**: 조사 · 분류 · 공통화 계획 수립 (구현 아님 — WO §1 / §13 / §15)
> **작성일**: 2026-08-21
> **기준**: 코드 실측. WO 부기(측정 스냅샷)와 다르면 **코드가 정답**이다.
> **상태**: ACTIVE

---

## 0. 요약

| 항목 | 값 |
|---|---|
| 모집단 | **82** 항목 (5서비스 70 + 공통 패키지 12 상당, 아래 A) |
| UNCLASSIFIED | **0** |
| 가장 큰 실중복 | **GROUP-H1 MobileBottomNav** — 4파일 / 1,030 LOC / 제거가능 약 700 LOC |
| 법정문서 최대 위험 | **KPA `PlatformFooter`** — 이용약관·개인정보처리방침이 `href="#"` (활성 4 route) |
| 권고 구조 | **WO §9 A/B/C 신설 아님 — "현 구조 유지 + 잔여 흡수"** |

Header 축은 이미 **공통화가 대부분 끝나 있다**. `@o4o/ui` `GlobalHeader` 는 저장소 전역 **56 파일**에서 참조되며 5개 서비스의 공개/운영자/관리자/매장/공급자/파트너 셸이 모두 이를 소비한다. Footer 축은 **법정정보 계약(`PublicLegalFooterInfo` / `StoreFacingFooter`)만 공통이고 껍데기(레이아웃)는 서비스별 사본**이다. 따라서 본 CHECK 의 결론은 "새 공통 컴포넌트 계층 신설"이 아니라 **잔여 이탈 지점 흡수**다.

---

## A. 모집단 (WO §5)

`services/web-{kpa-society,k-cosmetics,glycopharm,pharmacy-hub,neture}` 및 이들이 소비하는 `packages/**` 의 Header · Footer · Layout · Shell · Nav 자산 전수.

범례 — 분류: FC=FULLY_COMMON, CO=CORE_ONLY, VD=VIEW_DUPLICATED, SS=SERVICE_SPECIFIC, NI=NOT_IMPLEMENTED, OOS=OUT_OF_SCOPE

### A-1. 공통 패키지 (12 항목 in-scope + 10 OOS = 22)

| # | 파일 | 활성 | route 배선 | 소비 | 분류 |
|---|---|---|---|---|---|
| P1 | `packages/ui/src/layout/GlobalHeader.tsx` | active | 5서비스 전 영역 | 56 파일 참조 | FC |
| P2 | `packages/ui` `GlobalHeaderMenuItem` / `filterContextualNav` | active | 동일 | 5/5 | FC |
| P3 | `packages/ui/src/layout/AGHeader.tsx` (241) | **dead** | 없음 | `AGAppLayout` 내부만 | OOS |
| P4 | `packages/ui/src/layout/AGAppLayout.tsx` (143) | **dead** | 없음 | 0 | OOS |
| P5 | `packages/ui/src/layout/AGStorefrontLayout.tsx` | active | `apps/admin-dashboard` | 5서비스 0 | OOS |
| P6 | `packages/ui/src/layout/AGPageHeader.tsx` | active | `apps/admin-dashboard` | 5서비스 0 | OOS |
| P7 | `packages/shared-space-ui/src/legal/PublicLegalFooterInfo.tsx` (122) | active | 5/5 서비스 footer | 5/5 | FC |
| P8 | `packages/shared-space-ui/src/legal/StoreFacingFooter.tsx` (74) | active | KPA/KCos/Glyco `App.tsx` | 3/5 | FC |
| P9 | `packages/shared-space-ui` `BlogPublicHeader` | active | 매장 블로그 공개 | 3 | FC |
| P10 | `packages/shared-space-ui` `ForumPostHeader` | active | 포럼 본문 | 5 | OOS (본문 요소) |
| P11 | `packages/store-ui-core` `StoreHubShell` | active | `/store-hub` | KPA/KCos/Glyco | FC |
| P12 | `packages/store-ui-core` `MyStoreShell` | active | 매장 경영 | KPA/KCos/Glyco/PH | FC |
| P13 | `packages/store-ui-core` `StoreDashboardLayout` | active | `MyStoreShell` 내부 | 4 | FC |
| P14 | `packages/store-ui-core` `StoreTopBar` | active | 위 내부 | 4 | FC |
| P15 | `packages/store-ui-core` `StoreHomeShell` | active | 본문 | — | OOS |
| P16 | `packages/store-ui-core` `StorePageShell` | active | 본문 | — | OOS |
| P17 | `packages/operator-ux-core` `OperatorAreaShell` | active | `/operator` | **5/5** | FC |
| P18 | `packages/operator-ux-core` `OperatorDashboardLayout` | active | 대시보드 블록 | — | OOS |
| P19 | `packages/account-ui` `MyPageShell` | active | `/mypage` | KPA/PH | FC |
| P20 | `packages/account-ui` `MyPageLayout` (alias 재export) | active | 동일 | — | FC |
| P21 | `packages/account-ui` `AccountPageLayout` | **dead** | 없음 | 0 | OOS |
| P22 | `packages/operator-core/src/layout/OperatorLayout.tsx` | **dead** | 없음 | 0 (`@o4o/operator-core` 소비 0) | OOS |

### A-2. KPA-Society (18)

| # | 파일 | LOC | 활성 | route | desktop/mobile · auth · role | 분류 |
|---|---|---|---|---|---|---|
| K1 | `components/KpaGlobalHeader.tsx` | 168 | active | 전 영역 | both · 인증무관 · 역할별 contextual | CO |
| K2 | `components/KpaUserMenu.tsx` | 109 | active | K1 내부 | desktop · 인증 필요 | CO |
| K3 | `components/Layout.tsx` | — | active | 공개 | both | FC |
| K4 | `components/Footer.tsx` | 151 | active | 공개 | both | CO |
| K5 | `components/platform/PlatformHeader.tsx` | — | **active** | `/services/*`·`/join/pharmacy` (4) | 자체 `<a>` · GlobalHeader 미사용 | **VD** |
| K6 | `components/platform/PlatformFooter.tsx` | 109 | **active** | 동일 4 route | 법정링크 `href="#"` | **VD** |
| K7 | `components/platform/InfoPageLayout.tsx` | — | active | 동일 4 route | K5+K6 조합 | VD |
| K8 | `components/admin/AdminLayout.tsx` | — | active | `/admin/*` | admin | FC |
| K9 | `components/instructor/InstructorLayout.tsx` | — | active | `/instructor/*` | instructor | CO |
| K10 | `components/kpa-operator/KpaOperatorLayoutWrapper.tsx` | 48 | active | `/operator/*` | operator · `OperatorAreaShell` | FC |
| K11 | `components/kpa-operator/KpaOperatorDashboardLayout.tsx` | 46 | active | 대시보드 본문 | — | OOS |
| K12 | `components/pharmacy/PharmacyHubLayout.tsx` | — | active | `/pharmacy/*` | store_owner | FC |
| K13 | `layouts/MyPageLayout.tsx` | — | active | `/mypage/*` | `MyPageShell` | FC |
| K14 | `components/MobileBottomNav.tsx` | 303 | active | `/mobile/*` | mobile only | **VD** |
| K15 | `components/common/PageHeader.tsx` | — | active | ~25 소비처 | 본문 상단 | VD |
| K16 | `components/events/EventsHeader.tsx` | 77 | active | `/events/*` | 행사 전용 배너 | SS |
| K17 | `components/store/StoreUserDropdown.tsx` | 183 | **dead** | 없음 (코드 소비 0) | — | VD(dead) |
| K18 | `App.tsx` `KpaStoreLayoutWrapper` (inline) | — | active | `/store/*` | `MyStoreShell` | FC |

### A-3. K-Cosmetics (8)

| # | 파일 | LOC | 활성 | route | 분류 |
|---|---|---|---|---|---|
| C1 | `components/KCosGlobalHeader.tsx` | 168 | active | 전 영역 | CO |
| C2 | `components/common/Footer.tsx` | 225 | active | 공개 | CO |
| C3 | `components/layouts/MainLayout.tsx` | — | active | 공개 | FC |
| C4 | `components/layouts/DashboardLayout.tsx` | — | active | 대시보드 | CO |
| C5 | `components/layouts/KCosmeticsHubLayout.tsx` | — | active | `/hub/*` | FC |
| C6 | `components/layouts/OperatorLayoutWrapper.tsx` | 41 | active | `/operator/*` | FC |
| C7 | `components/MobileBottomNav.tsx` | 254 | active | `/mobile/*` | **VD** |
| C8 | `App.tsx` StoreLayoutWrapper (inline) | — | active | `/store/*` | FC |

### A-4. GlycoPharm (12)

| # | 파일 | LOC | 활성 | route | 분류 |
|---|---|---|---|---|---|
| G1 | `components/GlycoGlobalHeader.tsx` | 168 | active | 전 영역 | CO |
| G2 | `components/common/Footer.tsx` | 133 | active | 공개 | CO |
| G3 | `components/common/PageHeader.tsx` | — | active | 본문 | VD |
| G4 | `components/layouts/MainLayout.tsx` | — | active | 공개 | FC |
| G5 | `components/layouts/DashboardLayout.tsx` | — | active | 대시보드 | CO |
| G6 | `components/layouts/GlycoPharmHubLayout.tsx` | — | active | `/hub/*` | FC |
| G7 | `components/layouts/OperatorLayoutWrapper.tsx` | 41 | active | `/operator/*` | FC |
| G8 | `components/layouts/StoreLayout.tsx` | — | active | `store/:pharmacyId` (App.tsx:959) | **SS** (매장 사업자 법정정보) |
| G9 | `components/layouts/TabletLayout.tsx` | — | active | `store/:id/tablet` (975) | OOS (기기 UI) |
| G10 | `components/layouts/KioskLayout.tsx` | — | active | `store/:id/kiosk` (967) | OOS (기기 UI) |
| G11 | `components/MobileBottomNav.tsx` | 256 | active | `/mobile/*` | **VD** |
| G12 | `App.tsx` StoreLayoutWrapper (inline) | — | active | `/store/*` | FC |

### A-5. Pharmacy-Hub (10)

| # | 파일 | LOC | 활성 | route | 분류 |
|---|---|---|---|---|---|
| H1 | `components/PharmacyHubGlobalHeader.tsx` | 168 | active | 공개 | CO |
| H2 | `components/Footer.tsx` | 67 | active | 공개 | CO |
| H3 | `layouts/PublicLayout.tsx` | 32 | active | 공개 | FC |
| H4 | `layouts/StoreOwnerShell.tsx` | 96 | active | `/store-owner/*` | **NI** (`MyStoreShell` 에 header/footer slot 미주입) |
| H5 | `layouts/OperatorLayoutWrapper.tsx` | 83 | active | `/operator/*` | FC (셸) |
| H6 | `layouts/AdminLayoutWrapper.tsx` | 63 | active | `/admin/*` | FC (셸) |
| H7 | `layouts/SupplierShell.tsx` | 89 | active | `/supplier/*` | **NI** (공통 Supplier Shell 부재) |
| H8 | `components/operator/OperatorHeader.tsx` | 81 | active | `/operator`·`/admin` | **NI** (GlobalHeader 미채택 — 알림·프로필 드롭다운·contextual nav 없음) |
| H9 | `components/supplier/SupplierHeader.tsx` | 62 | active | `/supplier/*` | **NI** (동일) |
| H10 | MobileBottomNav 부재 | — | — | — | **NI** |

### A-6. Neture (12)

| # | 파일 | LOC | 활성 | route | 분류 |
|---|---|---|---|---|---|
| N1 | `components/NetureGlobalHeader.tsx` | 119 | active | 전 영역 | CO |
| N2 | `components/NetureUserMenu.tsx` | 98 | active | N1 내부 | CO |
| N3 | `components/layouts/MainLayout.tsx` (inline footer, `PublicLegalFooterInfo` 有) | — | active | 공개 | **VD** |
| N4 | `components/layouts/NetureLayout.tsx` (inline footer, 거의 동일) | — | active | 공개 | **VD** |
| N5 | `components/layouts/SupplierSpaceLayout.tsx` (inline footer:365) | 385 | active | `/supplier/*` (App.tsx:844) | **VD** |
| N6 | `components/layouts/SupplierOpsLayout.tsx` (inline footer:211) | 234 | active | (1035) | **VD** |
| N7 | `components/layouts/PartnerSpaceLayout.tsx` (inline footer:231) | 248 | active | `/partner/*` (951) | **VD** |
| N8 | `components/layouts/PartnerAccountLayout.tsx` | 124 | active | `/account/partner/*` (940) | FC (footer 없음) |
| N9 | `components/layouts/AdminVaultLayout.tsx` | 124 | active | (1022) 설계보호구역 | **SS** |
| N10 | `components/layouts/AdminLayoutWrapper.tsx` | 43 | active | `/admin/*` | FC |
| N11 | `components/NetureBottomNav.tsx` | 217 | active | mobile | **VD** |
| N12 | `pages/admin/platform/PlatformSectionLayout.tsx` | 59 | active | 본문 | OOS |

> **범위 밖으로 확인한 항목** (5서비스 아님): `services/web-account/src/components/AccountLayout.tsx`, `services/web-kpa-branch/src/layouts/BranchLayout.tsx`, `services/mobile-app/app/**/_layout.tsx`, `apps/admin-dashboard/**`, `apps/forum-web/src/components/Header.tsx`, `apps/main-site/src/components/common/PageHeader.tsx`.

---

## B. 분류 총계 (WO §6)

| 분류 | 수 | 비중 |
|---|---:|---:|
| FULLY_COMMON | **31** | 37.8% |
| CORE_ONLY | **14** | 17.1% |
| VIEW_DUPLICATED | **15** | 18.3% |
| SERVICE_SPECIFIC | **3** | 3.7% |
| NOT_IMPLEMENTED | **5** | 6.1% |
| OUT_OF_SCOPE | **14** | 17.1% |
| **UNCLASSIFIED** | **0** | — |
| 합계 | **82** | 100% |

서비스별:

| 서비스 | FC | CO | VD | SS | NI | OOS | 계 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 공통 패키지 | 12 | 0 | 0 | 0 | 0 | 10 | 22 |
| KPA | 6 | 4 | 6 | 1 | 0 | 1 | 18 |
| K-Cosmetics | 4 | 3 | 1 | 0 | 0 | 0 | 8 |
| GlycoPharm | 4 | 3 | 2 | 1 | 0 | 2 | 12 |
| Pharmacy-Hub | 3 | 2 | 0 | 0 | 5 | 0 | 10 |
| Neture | 2 | 2 | 6 | 1 | 0 | 1 | 12 |

### B-1. 오탐 방지 판정 기록 (WO §6 단서)

- **5개 `*GlobalHeader.tsx` 는 VIEW_DUPLICATED 가 아니다.** 파일명·줄수(168×4)가 같아 중복처럼 보이나 **내용 diff 로 판정**한 결과 전부 공통 `GlobalHeader` 위의 thin bridge 다. `PharmacyHubGlobalHeader.tsx` 헤더 주석이 이를 명시한다("공통 GlobalHeader(@o4o/ui) 를 그대로 쓰고 **서비스 차이만** 주입한다"). KPA↔KCos diff 는 크레딧 배지·역할 메뉴 항목·대시보드 route 해석 등 **실제 role/config 차이**다 → **CORE_ONLY**.
- **Neture 는 footer NOT_IMPLEMENTED 가 아니다.** 파일이 0건일 뿐 `MainLayout.tsx` / `NetureLayout.tsx` 가 인라인 footer 로 `PublicLegalFooterInfo serviceKey="neture"` 를 소비한다. 문제는 부재가 아니라 **인라인 사본 5~6개** 다 → **VIEW_DUPLICATED**.
- **색상·로고·문구 차이는 SERVICE_SPECIFIC 사유로 쓰지 않았다.** MobileBottomNav 4종의 실차이는 색(`#db2777`/`#059669`)·라벨(매장 경영/약국 경영)·경로뿐이므로 VIEW_DUPLICATED 로 판정했다.
- SERVICE_SPECIFIC 3건은 **주체 자체가 다르다**: G8(플랫폼이 아닌 **매장 사업자** 법정정보), K16(행사 기간 배너), N9(설계보호 금고 영역 전용 다크 셸).

---

## C. 중복 그룹 (WO §11)

| 그룹 | 파일 수 | 총 LOC | 서비스 | 실차이 | 제거가능 LOC(추정) |
|---|---:|---:|---|---|---:|
| **GROUP-H1 MobileBottomNav** | 4 | **1,030** | KPA 303 / KCos 254 / Glyco 256 / Neture 217 | 색상·라벨·active path·탭 수 | **~700** |
| GROUP-F1 Neture inline footer | 5 | ~120 | Neture N3~N7 | 법정정보 유무, 링크 세트 | ~80 |
| GROUP-F2 서비스 공개 Footer | 4 | 576 | KPA 151 / KCos 225 / Glyco 133 / PH 67 | 섹션 구성·SNS·법정정보 소스 | ~250 |
| GROUP-H2 OperatorLayoutWrapper | 3 | 123 | KCos 41 / Glyco 41 / PH 83 | 헤더 주입·`isAdminOrAbove` scope 문자열 | ~40 (가치 낮음) |
| GROUP-H3 PageHeader | 2 | — | KPA / Glyco | inline style ↔ Tailwind, breadcrumb ↔ icon+actions | 소 |
| GROUP-H4 KPA Platform 셸 | 3 | ~250 | KPA K5~K7 | 공통 셸 미채택 drift | ~200 |

**GROUP-H1 근거**: KCos↔Glyco `diff` 는 문서 주석 WO id, 라벨 텍스트, active 판정 헬퍼 이름/경로, 색상값만 달랐다. KCos↔KPA 215줄, KCos↔Neture 239줄 차이이며 Neture 는 홈/알림/내정보 2~3탭 유틸 변형(`useNotifications` + `NotificationSheet` 재사용)이다.

---

## D. 서비스별 고유 차이와 사유 (WO §7)

| 항목 | 차이 유형 | 사유 |
|---|---|---|
| 5개 `*GlobalHeader` bridge | CONFIG_DIFFERENCE + ROLE_DIFFERENCE | 서비스별 nav config, 역할 라벨, 대시보드 route 해석. **config 로 남겨야 함** — 공통 컴포넌트에 넣으면 서비스 어휘가 core 로 역류 |
| KPA 크레딧 잔액 배지 | FEATURE_DIFFERENCE | KPA 전용 기능 → extension slot 대상 |
| `OperatorAreaShell` header slot | STRUCTURAL_DIFFERENCE(의도됨) | 브랜드·알림 차이를 slot 으로 흡수. 현 설계가 정답 |
| PH `OperatorHeader`/`SupplierHeader` | FEATURE_DIFFERENCE | 다른 4서비스 대비 알림·프로필 드롭다운 없음 → 기능 격차(NI) |
| PH `SupplierShell` | STRUCTURAL_DIFFERENCE | 공통 Supplier Shell 이 **존재하지 않음**. 파일 주석이 `OperatorAreaShell`/`StoreDashboardLayout` 재사용 불가 사유를 이미 기록(운영자 capability 어휘 결합, `StoreSidebar` 하드코딩, F3 Store Layer 경계) |
| Glyco `StoreLayout` footer | STRUCTURAL_DIFFERENCE | **법정 주체가 매장 사업자**(사업자번호·통신판매번호·약사명)라 플랫폼 legal profile 로 대체 불가 → SERVICE_SPECIFIC 정당 |
| Neture `AdminVaultLayout` | FEATURE_DIFFERENCE | 접근제한 금고 영역 전용 셸 |
| MobileBottomNav 4종 | STYLE_DIFFERENCE + CONFIG_DIFFERENCE | 색·라벨·경로뿐 → SERVICE_SPECIFIC 사유 아님 |

---

## E. Footer 법정문서 계약 (WO §8)

공통 계약은 이미 존재한다 — `PublicLegalFooterInfo`(serviceKey 로 `service_legal_profiles` 조회, 값 없으면 아무것도 렌더하지 않음) + `StoreFacingFooter`(약관/개인정보/문의 링크 + 법정정보 + copyright).

| 서비스 | 이용약관 | 개인정보 | 문의 | route 실재 | 법정정보 소스 | 404 위험 |
|---|---|---|---|---|---|---|
| KPA | `/policy` | `/privacy` | `/contact` | App.tsx 925·926·920 ✅ (`/terms` 없음, footer 도 `/policy` 사용) | `PublicLegalFooterInfo serviceKey="kpa-society"` | 없음 |
| K-Cosmetics | `/terms` | `/privacy` | `/contact` | 447·448·445 ✅ | `serviceKey="k-cosmetics"` | 없음 |
| GlycoPharm | `/terms` | `/privacy` | `/contact` | 674·675·672 ✅ | `serviceKey="glycopharm"` | 없음 |
| Pharmacy-Hub | `/terms` | `/privacy` | — | 211·212 ✅ (`/contact` route 없어 **의도적으로 메뉴 제외**) | `serviceKey={SERVICE_KEY}` | 없음 |
| Neture | `/terms` | `/privacy` | `/contact` | 752·753·747 ✅ | `serviceKey="neture"` | 없음 |

→ **5서비스 공개 footer 의 법정 링크 404 위험은 0.** PH `config/navigation.ts` 의 `PH_FOOTER_SECTIONS` 는 "실제 route 가 있는 경로만" 을 주석으로 명문화해 데드링크 0 규율을 지키고 있다.

### E-1. 실제 위험 — 공통 계약 **우회** 지점

| 위험 | 위치 | 내용 | 등급 |
|---|---|---|---|
| **R1** | `services/web-kpa-society/src/components/platform/PlatformFooter.tsx` | 이용약관(29)·개인정보처리방침(30)·문의하기(31) 포함 **전 링크가 `href="#"`**. `PublicLegalFooterInfo` **미사용**. `InfoPageLayout` 을 통해 `/services/pharmacy`·`/services/forum`·`/services/lms`·`/join/pharmacy` **4개 활성 route** 에 렌더됨. 같은 셸의 `PlatformHeader` 도 `KpaGlobalHeader` 를 우회한 수작업 `<a>` 헤더 | **최고** |
| **R2** | Neture `SupplierSpaceLayout:365` / `SupplierOpsLayout:211` / `PartnerSpaceLayout:231` | 인라인 footer 에 `© 2026 Neture` + Contact/포럼 링크만. **법정정보·약관·개인정보 링크 전무** — 사업 상대(공급자·파트너) 화면인데 공통 legal 계약 우회 | 높음 |
| **R3** | PH `StoreOwnerShell` | `MyStoreShell` 에 `header`/`footer` prop 을 주지 않음(KPA/KCos/Glyco 는 둘 다 주입) → 매장 경영 화면에 서비스 footer·법정정보 없음 | 중 |
| **R4** | Glyco `StoreLayout` footer | `© 2025 GlycoPharm` 연도 하드코딩(stale). 약관/개인정보 링크 없음. 단, 법정 주체는 매장 사업자로 별개 | 중 |
| **R5** | Neture `MainLayout`/`NetureLayout` | `© 2026` 하드코딩. `StoreFacingFooter` 미채택 | 낮음 |

> serviceKey 하드코딩은 **문제 없음** — 전부 각 서비스의 고정 상수이며 PH 는 `SERVICE_KEY` config 를 사용한다. terms/privacy URL 하드코딩도 route 와 일치한다. 우회는 위 R1·R2 두 곳이 본질이다.

---

## F. 목표 구조 (WO §9)

### F-1. 현재 구조 실측

| 계층 | 공통 자산 | 채택 |
|---|---|---|
| 공개 헤더 | `GlobalHeader` + 서비스 bridge | **5/5** |
| 운영자 셸 | `OperatorAreaShell` + `DomainIASidebar` | **5/5** |
| 매장 경영 셸 | `MyStoreShell` / `StoreDashboardLayout` / `StoreTopBar` | 4/5 (Neture 매장 없음) |
| 매장 HUB 셸 | `StoreHubShell` | 3 |
| 마이페이지 셸 | `MyPageShell` | KPA/PH (별도 트랙 종료됨) |
| 법정 footer | `PublicLegalFooterInfo` / `StoreFacingFooter` | 5/5 · 3/5 |
| 하단 탭 | — | **공통 없음(4 사본)** |
| 공급자 셸 | — | **공통 없음** |

즉 WO §9 의 A(단일 컴포넌트)·B(Core+Extension)·C(계열별 Shell) 중 **B+C 혼합이 이미 구현된 상태**다. `GlobalHeader`(Core) + bridge(Extension) 는 B 이고, `OperatorAreaShell`/`MyStoreShell`/`StoreHubShell` 은 C 다.

### F-2. 권고: **신규 구조 도입하지 않음 — 현 구조 유지 + 잔여 흡수**

WO §9 의 결정 기준은 "**코드 복잡도가 커지면 공통화하지 않는 방향을 우선한다**" 이다. 위 실측에 따르면:

- A(완전 단일 Component)는 **불가**. 5서비스의 role/capability 어휘가 다르고, 단일 컴포넌트는 서비스 분기를 core 로 끌어들여 §13 공통 구조 원칙을 위반한다.
- B(Core+Extension) **신설은 불필요**. 이미 그 형태다. 재설계는 56 파일 소비처를 흔드는 순변경으로 복잡도만 증가한다.
- C(계열별 Shell) **신설도 불필요**. 이미 영역별 Shell 이 존재한다.

따라서 목표 구조는 **"기존 4 계층(GlobalHeader / OperatorAreaShell / Store*Shell / legal footer 계약) 을 정본으로 고정하고, 이를 우회 중인 잔여 지점만 흡수"** 다. 신규 공통 자산은 **하단 탭 1건**만 정당화된다(GROUP-H1, ~700 LOC 절감).

---

## G. 구현 WO 순서 (WO §12)

| 순서 | WO(안) | 범위 | 근거 |
|---|---|---|---|
| **W1** | KPA Platform 셸 정합 + 법정링크 복구 | K5·K6·K7 — `href="#"` 6건을 실 route 로, `PublicLegalFooterInfo` 주입, 가능하면 `KpaGlobalHeader`/공통 Footer 로 교체 | R1(법정 최고 위험) + GROUP-H4 |
| **W2** | Neture footer 계약 편입 | N3~N7 인라인 footer 를 서비스 Footer 컴포넌트 1개로 추출, 공급자/파트너 셸에 법정정보·약관 링크 주입, `© {year}` 동적화 | R2 + GROUP-F1 |
| **W3** | 공통 MobileBottomNav 도입 | `packages/ui`(또는 shared-space-ui) 에 config 주도 BottomNav 신설 → 4 사본 교체, PH 신규 채택 | GROUP-H1 — 단일 최대 절감 |
| **W4** | PH Header/Footer 기능 격차 해소 | H8·H9 를 `GlobalHeader` 기반으로 전환(알림·프로필), H4 에 header/footer slot 주입 | R3 + NI 4건 |
| **W5** | 공개 Footer 구성 정렬(선택) | GROUP-F2 — 섹션 스키마를 config 로 통일. **컴포넌트 통합은 하지 않음**(복잡도 대비 이득 낮음) | 낮은 우선순위 |

> 공급자 셸(H7) 공통화는 **본 계획에 넣지 않는다**. 소비 서비스가 Neture·PH 2곳뿐이고 두 곳의 메뉴·권한 축이 다르며, PH `SupplierShell` 주석이 이미 재사용 불가 사유를 근거와 함께 기록해 두었다. §9 기준상 "공통화하지 않는 방향" 이 정답이다.
>
> **W1~W5 어느 것도 본 WO 범위가 아니다.** 본 CHECK 는 계획 문서이며 코드 변경은 없다.

---

## H. 조사 중 발견(수정하지 않음 — WO §13)

| 항목 | 내용 |
|---|---|
| dead 컴포넌트 5건 | K17 `StoreUserDropdown`(183, 코드 소비 0 — 참조는 문서 6건뿐), P3 `AGHeader`, P4 `AGAppLayout`, P21 `AccountPageLayout`, P22 `operator-core/OperatorLayout` |
| `@o4o/operator-core` | 서비스 소비 0인데 dependency 잔존(MEMORY 기록과 일치) |
| stale 연도 | Glyco `StoreLayout` `© 2025`, Neture `© 2026` 하드코딩 |
| 문서 drift | `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md` 의 문제 진술이 현재 코드보다 오래되었고 Pharmacy-Hub 가 누락됨 |

**위 전부 삭제·수정하지 않았다.** 기록만 한다.

---

## I. 미확인 사항 (은폐 금지)

- 약 59개 레이아웃 파일 중 일부(`AdminVaultLayout` 본문 전체, `PartnerAccountLayout`, `PlatformSectionLayout`, `web-account`/`web-kpa-branch` 레이아웃)는 **전문 정독이 아니라 `<header>`/`<footer>`/`GlobalHeader` 대상 grep 으로 판정**했다. 분류는 유효하나 세부 스타일 차이는 미측정이다.
- 제거가능 LOC 는 **정적 diff 기반 추정치**이며 실측 리팩터 결과가 아니다.
- 브라우저 렌더 검증은 수행하지 않았다(본 WO 는 정적 조사 범위).
