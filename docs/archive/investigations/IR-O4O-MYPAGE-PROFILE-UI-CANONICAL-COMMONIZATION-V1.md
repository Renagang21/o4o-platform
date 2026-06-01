# IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1

> **Status:** Investigation Report (조사 전용) — 구현 금지
> **Date:** 2026-05-28
> **Scope:** KPA-Society / GlycoPharm / K-Cosmetics / Neture 4개 서비스의 MyPage·Profile UI-UX 공통화 방향 수립
> **Constitution:** CLAUDE.md (§13-A APP 표준화, §11 Operator Dashboard 표준 등)

---

## 1. Executive Summary

### 1-1. 핵심 질문에 대한 답

> 사용자가 프로필/마이페이지에 들어갔을 때, KPA-Society / GlycoPharm / K-Cosmetics가 같은 서비스 계열처럼 보이는가?

**부분적으로 그렇다.** 4개 서비스 모두 `@o4o/account-ui` 의 `MyPageLayout` · `ProfileCard` · `ProfileInfoField` · `QuickActionsSection` · `SettingsSection` · `PasswordChangeModal` · `MyPageNavigation` 을 공통으로 재사용하고 있어 **시각적 shell 은 이미 정렬되어 있다**. 다만 다음 영역에서 의도된/비의도된 drift 존재:

- **Route 구성**: KPA 10개 / Glyco·K-Cos 6개 / Neture 4개 (+ Account dashboards 별도)
- **Hub card 구성**: 5개 vs 5개 vs 5개 vs 4개 — 카드 종류가 서비스별로 다름
- **Forum/Request 통합 여부**: KPA 만 `/mypage/my-forums`, `/mypage/my-requests` 통합 — Glyco/K-Cos 는 `/forum/*` 로 분리
- **Profile field 깊이**: KPA 가 가장 풍부 (2-tab + business info), Glyco 다음, K-Cos 얕음, Neture 가장 얕음 (name 만)
- **Role badge 표시 방식**: 4개 서비스 모두 다른 패턴

> Neture도 최소한 같은 UI 톤으로 보이는가?

**예 — 이미 같은 shell 사용.** Neture 의 `/mypage/*` 는 `@o4o/account-ui` 의 동일 컴포넌트를 사용. 다만 supplier/partner 의 functional content (`/account/supplier/*`, `/account/partner/*`) 는 별도 sidebar layout (SupplierAccountLayout / PartnerAccountLayout) 을 갖고 있으며 이는 의도된 분리이다.

### 1-2. 권고 결론

- **공통 shell 은 이미 존재 — 추가 추출 불필요.** `@o4o/account-ui` 가 이미 canonical baseline 역할을 수행 중.
- **남은 정렬 작업은 "어떤 카드/route 를 어떤 서비스가 노출할지" 정책 결정** 영역이다.
- **즉시 작업 가능한 항목 3개** (낮은 risk, 명확한 drift):
  1. K-Cos `MyPageNavigation` 에 LMS 탭 노출 (현재 hidden)
  2. Glyco/K-Cos 의 `/mypage/my-requests` 통합 entry — 신청 내역 SSOT 정렬
  3. Role badge 표시 방식 canonical 화 (4개 서비스 → 1개 컴포넌트)

---

## 2. 서비스별 MyPage/Profile 현재 구조

### 2-1. KPA-Society (Reference — 가장 완성도 높음)

**Layout:** [services/web-kpa-society/src/layouts/MyPageLayout.tsx](../../services/web-kpa-society/src/layouts/MyPageLayout.tsx) (local wrapper) → 내부에서 `@o4o/account-ui` 의 `MyPageNavigation` 호출

**Hub:** `MyDashboardPage` (단일 consolidated dashboard) — profile summary + activity feed + appreciation activity + quick actions

**MyPage 구성:**
| Route | Component | 기능 |
|---|---|---|
| `/mypage` | MyDashboardPage | Hub + activity + appreciation |
| `/mypage/profile` | MyProfilePage | 2-tab (basic/role) + business info + password 인라인 |
| `/mypage/settings` | MySettingsPage | 알림 + 로그아웃 + 탈퇴 |
| `/mypage/certificates` | MyCertificatesPage | LMS 수료증 |
| `/mypage/enrollments` | MyEnrollmentsPage | LMS 수강 목록 |
| `/mypage/credits` | MyCreditsPage | LMS 크레딧 |
| `/mypage/my-forums` | MyForumDashboardPage | **포럼 운영자 관리 (통합)** |
| `/mypage/my-forums/:forumId/members` | ForumMemberManagementPage | 포럼 회원 관리 |
| `/mypage/my-requests` | MyRequestsPage | **신청 inbox (통합)** — forum/course/instructor/membership 4종 |
| `/mypage/qualifications` | MyQualificationsPage | LMS 강사 자격 |

**특징:**
- Profile edit 가 가장 정교 — 2-tab + business info (10 canonical fields for pharmacy_owner)
- `MyRequestsPage` 가 **통합 inbox** 역할 — Glyco/K-Cos 에는 부재
- Appreciation Phase 1 UI 적용됨 (`MyDashboardPage` lines 47-277)

### 2-2. GlycoPharm

**Layout:** `@o4o/account-ui/MyPageLayout` 직접 사용 (로컬 wrapper 없음)

**Hub:** [services/web-glycopharm/src/pages/mypage/MyPageHub.tsx](../../services/web-glycopharm/src/pages/mypage/MyPageHub.tsx) — gradient header + role/status badge + 2-col + 1-col cards

**MyPage 구성:**
| Route | Component |
|---|---|
| `/mypage` | MyPageHub |
| `/mypage/profile` | MyProfilePage (lastName/firstName/nickname/phone) |
| `/mypage/settings` | MySettingsPage |
| `/mypage/enrollments` | MyEnrollmentsPage |
| `/mypage/certificates` | MyCertificatesPage |
| `/mypage/credits` | MyCreditsPage |

**특징:**
- LMS 3종은 KPA 와 동일 구조 (canonical 정렬됨)
- **Forum/Request 가 MyPage 외부** — `/forum/my-requests`, `/forum/my-dashboard`, `/apply/my-applications` 모두 별도 route
- Role badge: `user.memberships.find(serviceKey='glycopharm').role` 기반 (membership-first)
- 약사/약국 경영자 store entry 는 **GlycoGlobalHeader 의 contextual nav** 에만 존재 — MyPage 카드로 노출되지 않음
- **당뇨인/Care/GlucoseView 잔재**: MyPage 영역 0건 (`api/public.ts` mock, `FeatureIntroPage.tsx` 등 외부 파일에는 잔존)

### 2-3. K-Cosmetics

**Layout:** `@o4o/account-ui/MyPageLayout` 직접 사용

**Hub:** [services/web-k-cosmetics/src/pages/mypage/MyPageHub.tsx](../../services/web-k-cosmetics/src/pages/mypage/MyPageHub.tsx) — WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1 의 **3-split** (Hub / Profile / Settings)

**MyPage 구성:**
| Route | Component |
|---|---|
| `/mypage` | MyPageHub |
| `/mypage/profile` | MyProfilePage (name/nickname/phone) |
| `/mypage/settings` | MySettingsPage |
| `/mypage/enrollments` | MyEnrollmentsPage |
| `/mypage/certificates` | MyCertificatesPage |
| `/mypage/credits` | MyCreditsPage |

**특징:**
- **MyPageNavigation 탭에 LMS routes 미노출** — `DEFAULT_ITEMS` 3개만 (mypage/profile/settings). LMS pages 는 Hub card 로만 진입.
- Role label: `ROLE_LABELS[user.roles[0]]` (primary role only)
- seller/consumer → `RoleNotAvailablePage` (Neture 로 라우트)
- Store owner entry: MyPage 노출 없음 — Header dashboard link 만

### 2-4. Neture

**Layout:** `@o4o/account-ui/MyPageLayout` (MyPage) + 별도 `SupplierAccountLayout` / `PartnerAccountLayout` (Account dashboards)

**MyPage 구성:**
| Route | Component |
|---|---|
| `/mypage` | MyPageHub |
| `/mypage/profile` | MyProfilePage (**name only**) |
| `/mypage/settings` | MySettingsPage |
| `/mypage/business-profile` | MyBusinessProfilePage (supplier only — SupplierProfilePage wrapper) |

**별도 dashboard space (의도된 분리):**
- `/account/supplier/*` — Dashboard / Products / Orders / Inventory / Settlements
- `/account/partner/*` — Dashboard / Contents / Links / Stores

**특징:**
- Profile field 가장 얕음 (name 만)
- Supplier business profile 은 별도 page 로 분리 — section A(사업자등록) / B(담당자) / C(공개연락처+visibility) / D(B2B 조건)
- Role badge: **primary + secondary** dual badge (supplier 만 추가 "공급자" 뱃지)
- Partner dashboard 는 **mock 데이터 사용 중** — 실 API 미연결

---

## 3. Route Matrix

| Route | KPA | Glyco | K-Cos | Neture |
|---|:---:|:---:|:---:|:---:|
| `/mypage` (Hub) | ✅ | ✅ | ✅ | ✅ |
| `/mypage/profile` | ✅ | ✅ | ✅ | ✅ |
| `/mypage/settings` | ✅ | ✅ | ✅ | ✅ |
| `/mypage/password` | (inline in profile) | (modal in settings) | (modal in settings) | (modal in settings) |
| `/mypage/requests` | ✅ `/my-requests` | ❌ (외부 `/forum/my-requests`, `/apply/my-applications`) | ❌ | ❌ |
| `/mypage/enrollments` | ✅ | ✅ | ✅ | ❌ (LMS 없음) |
| `/mypage/certificates` | ✅ | ✅ | ✅ | ❌ |
| `/mypage/credits` | ✅ | ✅ | ✅ | ❌ |
| `/mypage/my-forums` | ✅ | ❌ (외부 `/forum/my-dashboard`) | ❌ (외부 `/forum/my-dashboard`) | ❌ |
| `/mypage/qualifications` | ✅ | ❌ | ❌ | ❌ |
| `/mypage/business-profile` | (inline business info) | ❌ | ❌ | ✅ (supplier only) |
| `/mypage/store` (내 매장) | ❌ | ❌ (header nav only) | ❌ (header nav only) | ❌ (별도 `/account/supplier`) |

**Drift hot spots:**
- **신청 inbox 통합** — KPA 만 통합. Glyco/K-Cos 는 forum/apply 가 분리되어 사용자가 어디서 자기 신청 상태를 확인할지 불명확
- **포럼 운영자 dashboard** — KPA 는 MyPage 진입 / Glyco/K-Cos 는 `/forum/my-dashboard` 외부 진입

---

## 4. UI Component Matrix

| Component | Source | KPA | Glyco | K-Cos | Neture |
|---|---|:---:|:---:|:---:|:---:|
| `MyPageLayout` | `@o4o/account-ui` | ✅ (local wrapper 경유) | ✅ | ✅ | ✅ |
| `MyPageNavigation` | `@o4o/account-ui` | ✅ (custom items) | ✅ (DEFAULT) | ✅ (DEFAULT — LMS 숨김) | ✅ (DEFAULT) |
| `ProfileCard` | `@o4o/account-ui` | (사용 가능, 미사용) | ✅ | (간단 카드 inline) | ✅ |
| `ProfileInfoField` | `@o4o/account-ui` | ❌ (inline) | ✅ | ❌ (inline) | ✅ |
| `QuickActionsSection` | `@o4o/account-ui` | ✅ (5 items inline) | ✅ (logout only) | ✅ (dashboard + logout) | ✅ |
| `SettingsSection` | `@o4o/account-ui` | ❌ (local custom) | ✅ (3 sections) | ✅ (2 sections) | ✅ |
| `PasswordChangeModal` | `@o4o/account-ui` | ❌ (inline accordion) | ✅ | ✅ | ✅ |
| `PageHeader` | local `common/` | ✅ | ❌ | ❌ | ❌ |
| `LoadingSpinner` | local `common/` | ✅ | ❌ (inline "불러오는 중...") | ❌ (inline) | ❌ (inline) |
| `EmptyState` | local `common/` | ✅ | ❌ (inline) | ❌ (inline) | ❌ (inline) |
| `RoleBadge` | (없음) | inline span | inline span | inline span | inline span (dual) |

**관찰:**
- **`@o4o/account-ui` 가 사실상 SSOT** — 4개 서비스 모두 이 패키지를 채택. 추가 추출 불필요.
- **KPA 만 local custom `LoadingSpinner` / `EmptyState`** — 다른 서비스는 inline JSX. 통일 가치 있음.
- **`PasswordChangeModal` 표준화 안 됨** — KPA 는 inline accordion, 나머지는 modal. Modal 패턴이 더 정리된 흐름.
- **`RoleBadge` 컴포넌트 부재** — 4개 서비스 모두 inline span 으로 다르게 렌더.

---

## 5. Profile Field Matrix

| Field | KPA | Glyco | K-Cos | Neture |
|---|:---:|:---:|:---:|:---:|
| name (lastName/firstName) | ✅ (2-field) | ✅ (2-field) | ✅ (single) | ✅ (single) |
| nickname | ✅ | ✅ | ✅ | ❌ |
| email (read-only) | ✅ | ✅ | ✅ | ✅ |
| phone | ✅ | ✅ | ✅ | ❌ |
| role badge (read-only) | ✅ ACTIVITY_TYPE_LABELS | ✅ pharmacist/store_owner | ✅ ROLE_LABELS[roles[0]] | ✅ dual badge |
| activity_type | ✅ (role tab) | ❌ | ❌ | ❌ |
| university / workplace | ✅ (role tab) | ❌ | ❌ | ❌ |
| business info — pharmacy_owner cache | ✅ (10 canonical fields) | (별도 `/store/identity`) | (별도 `/store`) | (별도 `/mypage/business-profile`) |
| supplier business registration | ❌ | ❌ | ❌ | ✅ |
| organizations list | ✅ (org.name + role pill) | ❌ | ❌ | ❌ |
| store owner capability status | ✅ (card section) | ❌ | ❌ | ❌ |

**관찰:**
- KPA Profile 이 압도적으로 풍부 — 2-tab 구조 + business info inline + organizations + capability status
- Glyco/K-Cos 는 basic 4-field (name/nickname/email/phone) 에 그침
- Neture 는 basic name 만 + 별도 supplier business profile page
- **drift signal**: Glyco 가 pharmacy owner 의 business info 를 `/store/identity` 로 분리. KPA 는 MyPage 내부 inline. 어느 쪽이 canonical 인지 정책 결정 필요.

---

## 6. MyPage Hub Card Matrix

| Card / Section | KPA | Glyco | K-Cos | Neture |
|---|:---:|:---:|:---:|:---:|
| Profile summary header | ✅ avatar + name + email + badges | ✅ gradient + role/status | ✅ avatar + name + role | ✅ avatar + name + role + dual badge |
| 프로필 편집 진입 | (별도 nav 탭) | ✅ card | ✅ card | ✅ icon button |
| 설정 진입 | (별도 nav 탭) | ✅ card | ✅ card | ✅ icon button |
| 내 강의 / 수강 | ✅ count card | ✅ card | ✅ card | ❌ |
| 수료증 | ✅ count card | ✅ card | ✅ card | ❌ |
| 크레딧 / 포인트 | ✅ (별도 route 연결) | ✅ card | ✅ card | ❌ |
| 작성 글 / my-forums | ✅ count card | ❌ | ❌ | ❌ |
| 포럼 진입 | (header) | (header) | (header) | ✅ icon button |
| 이벤트 / 신청 | ✅ link | ❌ | ❌ | ❌ |
| Appreciation activity | ✅ section (받은/보낸) | ✅ section | ✅ section | ❌ |
| Dashboard quick link | (별도 nav) | ❌ | ✅ getKCosmeticsDashboardRoute | ✅ getNetureDashboardRoute |
| Logout button | ✅ | ✅ | ✅ | ✅ |
| 비즈니스 프로필 (supplier) | (inline in profile) | ❌ | ❌ | ✅ (supplier only) |

**관찰:**
- KPA + Glyco + K-Cos 셋 다 LMS 3종 (강의/수료증/크레딧) Hub card 보유 — 가장 정렬된 axis
- KPA 만 "작성 글" + "이벤트" 카드 — 사용자 활동 visibility 차원에서 가치 있음
- Appreciation activity: KPA/Glyco/K-Cos 3개 정렬, Neture 미적용 — Neture 도 Phase 2 에서 적용 가능
- Neture 의 "비즈니스 프로필" 은 supplier-only — 다른 서비스는 동등 개념 부재 (Glyco 의 약국 경영자 정보가 가장 가까움)

---

## 7. Neture UI-only Alignment 가능 범위

### 7-1. 이미 정렬됨 (변경 불필요)

| 영역 | 상태 |
|---|---|
| `MyPageLayout` shell | ✅ 동일 (`@o4o/account-ui`) |
| `MyPageNavigation` 3-탭 | ✅ 동일 |
| Profile/Settings page 구조 | ✅ 동일 |
| `PasswordChangeModal` | ✅ 동일 |
| `QuickActionsSection` | ✅ 동일 |
| Role badge 위치 (Profile header) | ✅ 동일 |

### 7-2. UI 만 정렬 가능 (functional content 유지)

| 영역 | 현재 | 제안 |
|---|---|---|
| `MyPageHub` 카드 grid 패턴 | 4 icon button | 다른 서비스 동일한 2-col card grid 로 통일 가능 (icon + label) |
| Profile summary 영역 톤 | 기본 | KPA 의 gradient header + status badge 패턴 통일 가능 |
| Appreciation activity | 미적용 | Phase 2 적용 가능 (선택) |
| Empty/Loading/Error 패턴 | inline | 공통 component 추출 시 동시 채택 가능 |

### 7-3. 의도된 차이 — 유지

| 영역 | 사유 |
|---|---|
| `/account/supplier/*`, `/account/partner/*` 별도 dashboard space | Supplier/Partner 의 operational scope 가 MyPage 와 분리 — 의도된 분리 |
| Supplier business profile (4 section) | Neture-only domain (B2B 조건, public visibility toggle) |
| Profile field 단순함 (name only) | Neture 는 business 등 별도 page 로 분리하는 정책 |
| Dual role badge (primary + supplier 추가) | Multi-role 표시 명확화 — Neture-specific 합리적 패턴 |

**결론:** Neture 도 이미 같은 shell 사용. UI tone 정렬을 위해 추가 작업 필요한 영역은 **MyPageHub 카드 grid 통일** + **Appreciation Phase 2** 정도이며 둘 다 선택 사항.

---

## 8. Root Cause 분류

각 drift 를 9개 카테고리로 분류:

| Drift 항목 | 분류 | 해결 비용 |
|---|---|---|
| K-Cos `MyPageNavigation` 가 LMS 탭 숨김 | C. route/menu 정렬 | 낮음 (config 1개) |
| Glyco/K-Cos `/mypage/my-requests` 부재 | C. route/menu 정렬 + H. backend 보강 | 중간 |
| Glyco `/forum/my-dashboard` 외부 진입 | F. 서비스별 유지 가능 (또는 통합 결정) | 낮음~중간 |
| KPA 의 `MyRequestsPage` 통합 inbox 패턴 | E. 공통 component 추출 가치 | 중간 (3 서비스 적용 시) |
| Role badge 4개 서비스 inline 다른 패턴 | E. 공통 component 추출 (`RoleBadge`) | 낮음 |
| KPA local `LoadingSpinner` / `EmptyState` vs 타 서비스 inline | E. 공통 component 추출 → `@o4o/account-ui` 이동 | 낮음 |
| Profile field 깊이 차이 (KPA 풍부 vs Neture name only) | I. 정책 결정 필요 (each service 가 어디까지 보일지) | 정책 의존 |
| Glyco store owner business info 가 `/store/identity` | I. 정책 결정 — MyPage 내 inline vs 별도 page canonical 결정 | 정책 의존 |
| KPA `PasswordChangeModal` 미사용 (inline accordion) | B. UI layout 정렬 | 낮음 |
| Glyco/K-Cos Appreciation Hub 카드 + KPA 통합 | A. 이미 정렬됨 | — |
| Neture Appreciation 미적용 | F. 서비스별 유지 가능 (또는 Phase 2) | 선택 |
| Glyco `당뇨인/Care/GlucoseView` MyPage 잔재 | A. 이미 정렬됨 (MyPage 외부 mock 만 잔존) | — |
| K-Cos seller/consumer 라벨 fallback 없음 | D. profile field 정책 | 낮음 |
| Neture Partner dashboard mock data | H. backend 보강 필요 | 중간 |
| Neture `/mypage/business-profile` supplier only | F. 서비스별 유지 | — |

**가장 시급한 분류:**
- **C (route/menu 정렬)**: 즉시 작업 가능, 사용자 가시적 효과 큼
- **E (공통 component 추출)**: 장기 안정성 — RoleBadge / LoadingSpinner / EmptyState 3개가 `@o4o/account-ui` 로 이동하면 4개 서비스 동시 정렬
- **I (정책 결정)**: profile 깊이, store info 위치는 사용자/Operator 정책 결정 필요

---

## 9. 추천 공통화 옵션

### Option A — KPA MyPageLayout 을 기준으로 3개 서비스에 맞춤
- **이미 달성됨** (`@o4o/account-ui` 가 KPA + Glyco + K-Cos + Neture 공통 사용)
- 남은 작업: KPA 의 local PageHeader / LoadingSpinner / EmptyState 를 `@o4o/account-ui` 로 이동

### Option B — shared MyPageShell / ProfileShell 공통 컴포넌트 추출 ⭐ **권장**
- 이미 `@o4o/account-ui` 가 그 역할 수행 중. **확장**으로 충분:
  - `RoleBadge` 신규 추가 (4 서비스 inline → 1 컴포넌트)
  - `MyPageStatusCard` (Empty/Loading/Error 공통) 신규 추가
  - `MyRequestsInbox` 추출 (KPA 의 통합 inbox → Glyco/K-Cos 채택 가능)
- 장기 안정성 + 점진적 적용 가능

### Option C — 우선 UI 만 local mirror 로 맞춤
- 비추천. `@o4o/account-ui` 가 이미 SSOT 역할이므로 local mirror 는 drift 누적.

### 권장 — **Option B (점진적 `@o4o/account-ui` 확장)**

사유:
- 인프라가 이미 갖춰져 있음 — fresh extraction 비용 없음
- 각 컴포넌트가 독립적이라 1개씩 PR 단위로 적용 가능
- 4개 서비스 동시 정렬 효과

---

## 10. 즉시 WO 후보

우선순위순으로 5개 후보:

### WO-1: **WO-O4O-MYPAGE-NAVIGATION-LMS-VISIBILITY-V1**
- **목표**: K-Cos 의 `MyPageNavigation` 에 LMS 탭 (수강/수료증/크레딧) 노출
- **범위**: K-Cos 의 navItems 정의 1곳 — config 변경
- **risk**: 매우 낮음
- **사용자 가시 효과**: 큼 (현재 사용자가 LMS 페이지 진입 후 탭으로 이동 못함)

### WO-2: **WO-O4O-MYPAGE-ROLE-BADGE-COMPONENT-EXTRACTION-V1**
- **목표**: `@o4o/account-ui` 에 `RoleBadge` 컴포넌트 추출. 4 서비스 inline 제거
- **범위**: `packages/account-ui/src/components/RoleBadge.tsx` 신설 + 4 서비스 hub/profile/header 의 inline 제거
- **risk**: 낮음 (visual regression 만 주의)
- **canonical 효과**: 4 서비스 색상/크기/dual-badge 패턴 통일

### WO-3: **WO-O4O-MYPAGE-EMPTY-LOADING-COMPONENT-EXTRACTION-V1**
- **목표**: KPA local `LoadingSpinner` / `EmptyState` 를 `@o4o/account-ui` 로 이동
- **범위**: 컴포넌트 2개 추출 + 4 서비스 inline 제거
- **risk**: 낮음
- **부수 효과**: 모든 MyPage 페이지의 empty/loading/error UX 통일

### WO-4: **WO-O4O-MYPAGE-MY-REQUESTS-INBOX-CROSSSERVICE-V1**
- **목표**: KPA 의 `MyRequestsPage` (통합 inbox 패턴) 을 Glyco/K-Cos 에도 적용
- **범위**: 백엔드 통합 API 확인 + 3 서비스 `/mypage/my-requests` route 추가
- **risk**: 중간 (backend 확장 필요 가능성)
- **사용자 가치**: 큼 — 신청 상태 SSOT

### WO-5: **WO-O4O-MYPAGE-HUB-CARD-CANONICAL-ALIGNMENT-V1**
- **목표**: Hub card 5종 (프로필/설정/강의/수료증/크레딧) 4 서비스 visually identical
- **범위**: card 컴포넌트 + icon + label canonical 정렬. Neture 에 LMS 카드 미적용 (의도된 차이 유지)
- **risk**: 낮음
- **부수 효과**: 시각적 통일감 큰 폭 향상

### (선택) WO-6: **WO-O4O-NETURE-MYPAGE-APPRECIATION-PHASE2-V1**
- **목표**: Neture 에 Appreciation activity section 적용 (선택)
- **risk**: 낮음
- **권장도**: 선택 (Neture 의 supplier/partner 사용자 culture 에 따라 결정)

---

## 11. 우선순위 제안

> 사용자가 제안한 정렬 순서: **MyPage layout → Profile card → Quick action card**

### Phase 1 — 즉시 (1주 내 가능, low-risk)
1. **WO-1** K-Cos LMS 탭 노출 — config 변경 1곳
2. **WO-2** `RoleBadge` 추출 — 4 서비스 동시 정렬

### Phase 2 — 단기 (2~3주, 중간 risk)
3. **WO-3** `LoadingSpinner` / `EmptyState` 추출
4. **WO-5** Hub card visual alignment

### Phase 3 — 중기 (정책 결정 필요)
5. **WO-4** `MyRequestsInbox` cross-service 적용 — backend 확장 + 정책 결정 (Glyco/K-Cos 의 forum/apply 통합 여부)
6. **Profile field depth 정책 결정** — Glyco 의 store identity 가 MyPage inline 인지 별도 page 인지 canonical 결정
7. (선택) **WO-6** Neture Appreciation Phase 2

### Phase 4 — 장기 (확장 영역)
- Neture Partner dashboard 실 API 연결
- `MyPageNavigation` 의 dynamic items policy 통일 (currently 일부 hardcoded DEFAULT_ITEMS)

---

## 부록 A — 핵심 SSOT 위치

- **공통 UI shell**: [packages/account-ui/src/components/](../../packages/account-ui/src/components/)
- **KPA reference**: [services/web-kpa-society/src/pages/mypage/](../../services/web-kpa-society/src/pages/mypage/)
- **Role label SSOT**: 각 서비스별 `config/dashboard.ts` (ROLE_LABELS / `*_DASHBOARD_MAP`)
- **MyPageLayout**: [packages/account-ui/src/components/MyPageLayout.tsx](../../packages/account-ui/src/components/MyPageLayout.tsx)
- **MyPageNavigation**: [packages/account-ui/src/components/MyPageNavigation.tsx](../../packages/account-ui/src/components/MyPageNavigation.tsx)

## 부록 B — 관련 최근 commits

- `032d36880` WO-O4O-APPRECIATION-CULTURE-UI-PHASE1-V1 (KPA/Glyco/K-Cos appreciation)
- `4fcb60cd9` WO-O4O-KPA-MYPAGE-FORUM-MOBILE-POLISH-V1
- `9529ac4cd` WO-O4O-MYPAGE-FORM-MOBILE-V1
- `adbdd1b69` WO-O4O-KPA-MYPAGE-RESPONSIVE-LAYOUT-CANONICALIZATION-V1
- `5d2e69c1a` WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1
- `27efcbe87` WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1
- `c8eb520e2` WO-O4O-KPA-ACTIVITY-TYPE-SSOT-ROLE-CANONICAL-ALIGN-V1
- (K-Cos) WO-O4O-KCOSMETICS-MYPAGE-SPLIT-V1 — 3-split 구조
- (K-Cos) WO-O4O-KCOS-LMS-MYPAGE-CANONICAL-ALIGNMENT-V1

---

## Scope Guard 확인

이 IR 은:
- ✅ 조사 전용
- ✅ 구현 없음
- ✅ Backend 수정 없음
- ✅ DB migration 없음
- ✅ route/menu 수정 없음
- ✅ KPA/Glyco/K-Cos/Neture 코드 수정 없음

다음 단계 시작 전 사용자 승인 필요.
