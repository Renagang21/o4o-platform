# IR-O4O-GLOBAL-ICON-USAGE-AUDIT-V1

> **조사 전용 (read-only).** 코드/문구/아이콘 수정 없음. 본 문서는 O4O 전체 서비스의 사용자-facing UI 아이콘 사용 현황을 조사하고, 후속 표준화(IR→기준 문서→단계적 적용)의 판단 근거를 제공한다.

- **작성일**: 2026-06-04
- **작업 유형**: Investigation (IR) — 아이콘 교체·공통화는 본 작업 범위 밖
- **조사 범위**: `services/web-kpa-society`, `services/web-glycopharm`, `services/web-k-cosmetics`, `services/web-neture`, `packages/ui`, `packages/account-ui`, `packages/shared-space-ui`, `packages/operator-core-ui`, `packages/operator-ux-core`, `packages/store-ui-core`, `packages/store-asset-policy-core`
- **후속 예정**: `O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1` (기준 문서) → 1차 적용(KPA 약국 운영 허브) → CHECK 문서

---

## 1. 전체 판정

O4O는 **아이콘 시스템이 단일 표준 없이 3계열로 혼재**되어 있다.

| 계열 | 사용처 | 표준화 상태 |
|------|--------|------------|
| **emoji 문자열** (`'🛒'`, `'🖥️'`, `'💊'` …) | Store Hub 카드, Operator/Admin Quick Actions, 사이드바 일부, LMS lesson type, 역할 선택, 랜딩 카드 | ❌ 페이지별 하드코딩 (사실상 무표준) |
| **lucide-react** | Global Header 메뉴, Operator 사이드바(STANDARD_GROUPS), Store 사이드바, Admin 비즈니스 블록, 대부분의 액션 버튼 | △ 부분 표준 (operator만 중앙화) |
| **custom SVG** (`ForumIcon`, `ContentIcon` …) | Home AppEntrySection, 커뮤니티 서비스 카드 | ✅ `shared-space-ui/HomeAppIcons` 중앙화 |

**핵심 문제는 "emoji ↔ lucide 혼재"** 다. 같은 화면 안에서 일부 요소는 emoji, 일부는 lucide로 그려져 시각적 일관성이 깨진다. 사용자가 지적한 **KPA 약국 운영 허브**가 대표 사례이며, 동일 구조가 GlycoPharm/K-Cosmetics의 Store Hub·Admin·Channels 화면에 그대로 복제되어 있다.

**중요 — 이미 존재하는 표준화 레버리지 2곳:**
- `packages/ui/src/operator-shell/constants.ts` → `STANDARD_GROUPS` (operator 메뉴 13개 lucide 아이콘 중앙 정의, 4서비스 공유). **emoji 표준화도 이 패턴을 따르면 된다.**
- `packages/shared-space-ui/src/HomeAppIcons.tsx` → 커스텀 SVG 아이콘 중앙 정의.

즉 표준화는 **새 구조를 만드는 것이 아니라 기존 중앙화 패턴(STANDARD_GROUPS)을 emoji 영역으로 확장**하는 작업에 가깝다.

---

## 2. 서비스별 아이콘 사용 현황

### 2.1 KPA-Society (`services/web-kpa-society`) — 1차 적용 후보

| 표면 | 방식 | 위치 |
|------|------|------|
| 약국 운영 허브 (`/store-hub`) 카드 | emoji 하드코딩 (`🛒🖥️📄🛍️🏪`) | `pages/pharmacy/StoreHubPage.tsx:42,49,56,63,83` |
| 허브 사이드바 (7개 메뉴) | emoji 유니코드 escape (`\u{1F3E0}` 등) | `components/pharmacy/PharmacyHubLayout.tsx:29-40` |
| Home Utility 섹션 | emoji (`📊🔔📜📝`) | `components/home/UtilitySection.tsx:52-64` |
| Home 대시보드 카드 | emoji (`💬📢💊🛒🎓🔬🤝🔔`) | `pages/dashboard/dashboard-cards.tsx:49-195` |
| Global Header 브랜드/크레딧 | emoji (`💊`, `⭐`) | `components/KpaGlobalHeader.tsx:129,154` |
| Global Header 사용자 메뉴 | **lucide** (`GraduationCap, Store, Shield, LayoutDashboard`) | `components/KpaGlobalHeader.tsx:16-21,177-199` |
| Home AppEntry 섹션 | **custom SVG** (`ForumIcon, ContentIcon …`) + lucide(`Store, Network, Users`) | `pages/CommunityHomePage.tsx:30-35,272-284` |
| Work 페이지(근무약사) | emoji (`📋📚🖥️💬🔔`) | `pages/work/WorkPage.tsx:90-248` |
| LMS lesson type | emoji 매핑 (`article:'📄', assignment:'📝'`) | `pages/courses/CourseIntroPage.tsx:25-27`, `pages/lms/LmsLessonPage.tsx:26-29` |

> **중복 구현 주의**: `components/home/CommunityServiceSection.tsx:39-67` 가 `shared-space-ui` 의 아이콘을 import 하지 않고 동일 SVG를 로컬 재구현하고 있다.

### 2.2 GlycoPharm (`services/web-glycopharm`)

| 표면 | 방식 | 위치 |
|------|------|------|
| Store Hub 카드 | emoji (`🛒🖥️📄🛍️🏥`) | `pages/hub/StoreHubPage.tsx:42-83` |
| Admin Quick Actions | emoji (`👤🏥💰📄🛡️⚙️`) | `pages/admin/GlycoPharmAdminDashboard.tsx:122-127` |
| Admin 비즈니스 블록 | **lucide** (`DollarSign, FileBarChart, ShieldCheck, Building2`) | `pages/admin/GlycoPharmAdminDashboard.tsx:29-39,136-150` |
| 역할 상수 매핑 | emoji (`💊📦🛡️`) | `lib/role-constants.ts:44-46` |
| Operator 대시보드 | emoji (`💬🏥`) | `pages/operator/GlycoPharmOperatorDashboard.tsx:45,57` |
| Store Channels 채널 타입 | emoji (`🌐📱🖥️📺`) | `pages/store/StoreChannelsPage.tsx:676-679` |
| Store Main Quick Actions | **lucide** (`Package, ShoppingCart, Tv, QrCode, Megaphone`) | `pages/store-management/StoreMainPage.tsx:19-40` |
| Header / Mobile Nav | **lucide** | `components/GlycoGlobalHeader.tsx:16`, `components/MobileBottomNav.tsx:14` |
| LMS lesson type | emoji (`📄🎬❓📝`) | `pages/education/LmsLessonPage.tsx:34-37` |

### 2.3 K-Cosmetics (`services/web-k-cosmetics`)

GlycoPharm과 **구조적으로 거의 동일** (Store Hub / Admin / Channels / LMS 패턴 복제). 서비스 정체성에 따른 일부 emoji만 다름.

| 표면 | 방식 | 위치 | GlycoPharm 대비 |
|------|------|------|----------------|
| Store Hub 카드 | emoji (`🛒🖥️📄📋💄`) | `pages/hub/KCosmeticsHubPage.tsx:42-83` | 이벤트 `📋`(vs `🛍️`), CTA `💄`(vs `🏥`) |
| Admin Quick Actions | emoji (`👤🏪🛡️⚙️`) | `pages/admin/KCosmeticsAdminDashboard.tsx:108-111` | 매장 `🏪`(vs `🏥`) |
| Admin 비즈니스 블록 | **lucide** (`Store, Users, ShieldCheck`) | `pages/admin/KCosmeticsAdminDashboard.tsx:22-27,120-127` | 동일 패턴 |
| Store Channels 채널 타입 | emoji (`🌐📱🖥️📺`) | `pages/store/StoreChannelsPage.tsx:676-679` | **완전 동일** |
| LMS lesson type | emoji (`📄🎬❓📝`) | `pages/lms/LmsLessonPage.tsx:38-41` | **완전 동일** |
| Home 정적 데이터 / Market Trial | emoji (`📦`, `<span>🧪</span>`) | `config/homeStaticData.ts:78`, `pages/HomePage.tsx:241` | — |
| 역할 선택(회원가입) | emoji (`🛍️🏪`) | `pages/auth/RegisterPage.tsx:18,24` | — |

### 2.4 Neture (`services/web-neture`)

| 표면 | 방식 | 위치 |
|------|------|------|
| Home AppEntry / 역할 카드 | **lucide**(`Layers, TrendingUp, Users`) + **custom SVG**(`ForumIcon …`) | `pages/CommunityPage.tsx:147-201` |
| Home CTA | emoji (`<span>🧪</span>`) | `pages/CommunityPage.tsx:209` |
| 회원가입 역할 선택 | emoji (`🏪🏭🤝`) | `components/.../RegisterModal.tsx:37-56` |
| Partner 랜딩 활동 예시 | emoji **+** lucide 동시 정의 (`{emoji:'⭐', icon:Star}`) | `pages/PartnerLandingPage.tsx:74-78,248` |
| Supplier 랜딩 카테고리 | emoji (`💊🩺🧴🏠`) | `pages/SupplierLandingPage.tsx:70-75,209` |
| Operator 도메인 라벨 (서비스 override) | emoji (`📦💳💬⚙️`) | `config/operatorMenuGroups.ts:240-245` |

---

## 3. emoji 사용 위치 (집계)

- **emoji 총량**: 서비스 `.tsx` 305건/100파일(이상, 페이지네이션 한계), 패키지 `.tsx` 202건/53파일.
- **사용자-facing 핵심 표면 패턴** (4서비스 공통):
  1. **Store Hub 진입 카드** — 모든 서비스가 emoji (`🛒🖥️📄` + 서비스별 CTA)
  2. **Operator/Admin Quick Actions** — emoji
  3. **LMS lesson type 매핑** — emoji (3서비스 동일)
  4. **Store Channels 채널 타입** — emoji (Glyco·KCos 완전 동일)
  5. **회원가입 역할 선택 / 랜딩 카테고리** — emoji
- **패키지 레벨 emoji 기본값(consumer가 안 넘기면 노출)**:
  - `shared-space-ui/AppreciationPanel.tsx:192,301-403` (`🎁👥` 하드코딩 기본값)
  - `shared-space-ui/ContentHighlightSection.tsx:64,182` (`📄`)
  - `shared-space-ui/StoreHubTemplate.tsx:174` (`storeCtaBlock.icon ?? '🏪'` — prop 기반, fallback emoji)
  - `ui/components/EmptyState.tsx:60` (`icon = '📭'`)
  - `ui/store-blocks/*.block.tsx` (`🖥️📦`)
  - `operator-core-ui/.../OperatorResourcesConsolePage.tsx:65-67` (`📄🔗⬇`)
  - `operator-ux-core/sidebar/operatorDomainIA.ts` (도메인 라벨 emoji 기본값 — Neture가 override)

---

## 4. lucide-react 사용 위치

- **총량**: 서비스 200+파일, 패키지 63파일. 사실상 액션/네비게이션의 기본 아이콘 라이브러리.
- **중앙 정의(표준 레버리지)**:
  - `packages/ui/src/operator-shell/constants.ts` → `STANDARD_GROUPS` (13개 operator 그룹 아이콘: `Home, Users, FileCheck, Package, Store, ShoppingCart, FileText, Archive, BookOpen, Monitor, MessageSquare, BarChart3, Settings`). `operator-ux-core/sidebar/DomainIASidebar.tsx`가 소비 → 4서비스 일관 적용.
- **서비스/패키지 로컬 하드코딩 매핑**:
  - `packages/store-ui-core/src/components/StoreSidebar.tsx:12-47` → `MENU_ICONS` / `SECTION_ICONS` (lucide). store-ui-core 내부에 있으나 export되지 않아 재사용 제한.
  - 각 Global Header(`KpaGlobalHeader`, `GlycoGlobalHeader`, `KCosGlobalHeader`)가 개별적으로 lucide 메뉴 아이콘 정의 — 거의 동일 세트 반복.

---

## 5. 불일치 / 혼재(Mix) 아이콘 위치

같은 화면에 emoji와 lucide(또는 SVG)가 공존하는 지점 — **표준화 1순위**:

| 화면 | 혼재 내용 | 위치 |
|------|-----------|------|
| KPA Home (CommunityHomePage) | AppEntry는 SVG/lucide, CTA는 `🧪` emoji | `pages/CommunityHomePage.tsx:289-302` |
| KPA Global Header | 브랜드 `💊`·크레딧 `⭐` emoji vs 사용자 메뉴 lucide | `components/KpaGlobalHeader.tsx:129,154 ↔ 177-199` |
| KPA 약국 허브 | 사이드바·카드는 emoji, 헤더는 lucide (**사용자 지적 지점**) | `PharmacyHubLayout.tsx:28-41` ↔ `KpaGlobalHeader` |
| GlycoPharm/KCos Admin | Quick Actions emoji vs 비즈니스 블록 lucide (동일 대시보드) | `GlycoPharmAdminDashboard.tsx:122-127 ↔ 136-150` |
| GlycoPharm/KCos Store Channels | 채널 타입 emoji vs 액션 버튼 lucide (동일 페이지) | `StoreChannelsPage.tsx:676-679 ↔ 795+` |
| Neture Home | 역할 카드 lucide/SVG vs CTA `🧪` emoji | `CommunityPage.tsx:147-209` |
| Neture Partner 랜딩 | `{emoji, icon}` 동시 정의(emoji만 렌더, lucide import는 미사용) | `PartnerLandingPage.tsx:74-78` |

**서비스 간 동일 개념 ↔ 다른 emoji** (의미 불일치):
- 이벤트/캠페인: Glyco `🛍️` vs KCos `📋`
- 매장 표현: Glyco `🏥` vs KCos `🏪` (Admin)
- emoji 렌더 방식: 문자열 `icon:'📦'` vs JSX `icon:<span>🧪</span>` 혼용

---

## 6. 공통화 가능 영역 (icon mapping 후보)

| 후보 | 근거 | 권장 위치 |
|------|------|----------|
| **Store Hub 진입 카드 아이콘 세트** | 4서비스 동일 구조(`🛒🖥️📄` + 서비스별 CTA), 이미 `StoreHubTemplate` prop으로 주입 중 | `shared-space-ui` 또는 `store-ui-core` 표준 매핑 |
| **LMS lesson type 아이콘** | 3서비스 `📄🎬❓📝` 동일 하드코딩 | `lms` 공통(APP-LMS Baseline 정합) |
| **Store Channels 채널 타입** | Glyco·KCos 완전 동일 (`🌐📱🖥️📺`) | `store-ui-core` 공통 상수 |
| **Operator/Admin Quick Action 아이콘** | 역할/설정 아이콘(`🛡️⚙️👤`) 서비스 간 동일 | `operator-ux-core` (STANDARD_GROUPS 패턴 확장) |
| **Global Header 메뉴 아이콘** | 3 Header가 거의 동일 lucide 세트 반복 | 공통 헤더 아이콘 상수 |
| **shared-space-ui emoji 기본값** | AppreciationPanel/EmptyState 등 emoji 하드코딩 | 토큰화 또는 lucide/SVG 치환 |

---

## 7. 웹 · 모바일 차이

- 모바일 전용 네비게이션(`MobileBottomNav`, `MobileStorePage`)은 **lucide 기반**(`Home, Building2, Bell, User`)으로, emoji 혼재가 상대적으로 적다.
- 즉 **모바일은 이미 lucide에 가깝고, 데스크톱 허브/카드 표면에 emoji가 집중**되어 있다. 표준화 시 "lucide 단일화" 방향이 모바일 현황과도 정합적이다.
- React Native(`services/mobile-app`)는 별도 아이콘 체계 가능성 — 본 IR 범위에서 상세 조사하지 않음(후속 확인 필요).

---

## 8. 1차 정비 대상 제안 (우선순위)

| 순위 | 대상 | 이유 |
|:---:|------|------|
| **1** | **KPA 약국 운영 허브** (`StoreHubPage.tsx`, `PharmacyHubLayout.tsx`) | 사용자가 직접 지적 / emoji·lucide 혼재 명확 / O4O 매장 실행 UI 기준 화면 |
| 2 | GlycoPharm 내 약국 (Store Hub/Channels) | KPA와 동일 구조 → 기준 이식 용이 |
| 3 | K-Cosmetics 내 매장 | Glyco와 거의 동일 |
| 4 | Neture Home / 역할 카드 | CTA emoji 1곳 등 소규모 |
| 보조 | `shared-space-ui` emoji 기본값, Global Header 아이콘 | 공통 레이어 — 기준 문서 확정 후 |

---

## 9. 이번 작업에서 제외한 항목

- 실제 아이콘 교체 / 코드 수정 / 문구 수정 — **전부 본 IR 범위 밖**
- 공통 컴포넌트(`shared-space-ui`, `store-ui-core` 등) 수정
- 디자인 토큰·색상 톤 기준 확정 (기준 문서 단계에서)
- React Native(`services/mobile-app`) 상세 아이콘 체계 조사
- 비-UI emoji(로그 메시지, 콘솔 출력, 더미 데이터 내부값) — 사용자-facing 아님

---

## 10. 후속 작업 제안

1. **기준 문서 작성** — `O4O-GLOBAL-ICON-SYSTEM-STANDARD-V1.md`
   - lucide-react 단일 표준 채택 여부 / emoji 허용 범위(없음 권장)
   - 기능별 표준 아이콘 매핑 (Store Hub / Channels / LMS / Operator)
   - 서비스 정체성 아이콘(약국 `🏥` vs 화장품 `💄` 등)의 처리 방식 — lucide 대체 or 의도적 예외
   - 중앙 레지스트리 위치 결정 (`STANDARD_GROUPS` 패턴 확장)
2. **1차 적용 WO** — `WO-...-KPA-STORE-HUB-ICON-ALIGNMENT-V1` (약국 운영 허브만)
3. **CHECK 문서** — 1차 결과 고정 → 2~4차 확장

**판단 포인트(기준 문서 단계에서 결정 필요):**
- (a) lucide 전면 단일화 vs (b) emoji를 의미 토큰으로 중앙화 후 점진 치환
- 공통화를 패키지에서 할지(컴포넌트가 아이콘 소유) vs 서비스 wrapper에서 할지(prop 주입 유지)
  → 현재 `StoreHubTemplate`/`STANDARD_GROUPS` 사례를 보면 **"패키지에 표준 세트 정의 + 서비스는 키만 선택"** 방향이 기존 구조와 가장 정합적.

---

*조사 방식: read-only grep/glob/read 기반 병렬 코드 조사. 코드 변경 없음.*
