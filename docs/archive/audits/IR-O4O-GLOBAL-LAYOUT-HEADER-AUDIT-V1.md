# IR-O4O-GLOBAL-LAYOUT-HEADER-AUDIT-V1 — 결과 보고

> **조사 일자**: 2026-04-17
> **조사 범위**: kpa-society, glycopharm, neture, k-cosmetics
> **목적**: Layout / Header / Navigation 구조 전수 조사
> **원칙**: 코드 수정 없음. 구조 파악 및 문제 정의만 수행.

---

## 1. 전체 요약

### 1.1 서비스별 요약 표

| 서비스 | Layout 수 | Header 수 | 스타일링 방식 | 특징 | 문제 여부 |
|--------|-----------|-----------|---------------|------|-----------|
| **kpa-society** | 7 | 6 | inline style 중심 | 가장 복잡. Demo/Store/Operator/Admin/Intranet/Hub/Main 분리 | TYPE A, B, C, D |
| **glycopharm** | 6 | 2 (자체) + 공유 | Tailwind CSS 중심 | MainLayout + DashboardLayout(role 파라미터) + StoreLayout + Kiosk/Tablet + OperatorShell | TYPE A, B, D |
| **neture** | 9 | 별도 Header 없음 (Layout 내장) | Tailwind CSS 중심 | Layout 수 최다. 역할별 완전 분리 (Supplier/Partner/Account 등) | TYPE A, C |
| **k-cosmetics** | 4 | 1 (자체) + 공유 | inline style 중심 | 가장 단순. MainLayout + PartnerLayout + DashboardLayout + OperatorShell | TYPE A |

### 1.2 공유 컴포넌트 현황

| 패키지 | 컴포넌트 | 사용 서비스 | 역할 |
|--------|----------|-------------|------|
| `@o4o/ui` | **OperatorShell** | kpa, glycopharm, neture, k-cosmetics | Operator 대시보드 공통 Shell (사이드바+헤더) |
| `@o4o/store-ui-core` | **StoreDashboardLayout** | kpa, glycopharm, k-cosmetics | Store Owner 대시보드 공통 Shell |
| `@o4o/store-ui-core` | **StoreTopBar**, **StoreSidebar** | kpa, glycopharm, k-cosmetics | Store Shell 내부 컴포넌트 |

---

## 2. 서비스별 분석

### 2.1 KPA Society

#### Layout 목록

| # | Layout | 파일 경로 | 사용 영역 |
|---|--------|-----------|-----------|
| 1 | **Layout** (Main) | `components/Layout.tsx` | `/`, `/forum/*`, `/lms/*`, `/mypage/*` 등 대부분 공개 페이지 |
| 2 | **DemoLayout** | `components/DemoLayout.tsx` | `/demo/*` (지부/분회 데모, 삭제 예정) |
| 3 | **AdminLayout** | `components/admin/AdminLayout.tsx` | `/admin/*`, `/demo/admin/*` |
| 4 | **IntranetLayout** | `components/intranet/IntranetLayout.tsx` | `/intranet/*`, `/demo/intranet/*` |
| 5 | **KpaOperatorLayoutWrapper** | `components/kpa-operator/KpaOperatorLayoutWrapper.tsx` | `/operator/*` (OperatorShell 래핑) |
| 6 | **StoreDashboardLayout** (공유) | `@o4o/store-ui-core` | `/store/*` (약국 매장 관리) |
| 7 | **PharmacyHubLayout** | `components/pharmacy/PharmacyHubLayout.tsx` | `/hub/*` (약국 HUB 사이드바) |

#### Header 목록

| # | Header | 파일 경로 | 사용 위치 | 스타일 |
|---|--------|-----------|-----------|--------|
| 1 | **Header** (Main) | `components/Header.tsx` | Layout 내부 | 흰색 배경, 역할 기반 메뉴 필터링 |
| 2 | **DemoHeader** | `components/DemoHeader.tsx` | DemoLayout 내부 | 어두운 배경(#1e293b), 데모 전용 메뉴 |
| 3 | **AdminHeader** | `components/admin/AdminHeader.tsx` | AdminLayout 내 각 페이지에서 직접 사용 | 페���지 제목 표시 (navigation 아님) |
| 4 | **IntranetHeader** | `components/intranet/IntranetHeader.tsx` | IntranetLayout 내 각 페이지에서 직접 사용 | 조직 브레드크럼 + 페이지 제목 |
| 5 | **KpaOperatorLayoutWrapper 내장 헤더** | `components/kpa-operator/KpaOperatorLayoutWrapper.tsx` (renderHeader) | OperatorShell에 주입 | 💊 약사회 + "운영" 뱃지 |
| 6 | **PlatformHeader** | `components/platform/PlatformHeader.tsx` | 사용되지 않음 (레거시) | "O4O Platform" 로고 |

#### Navigation 구조

- **Main Header 메뉴**: 상수 배열 `menuItems` 하드코딩 (6개: 홈/포럼/강의/약국HUB/내약국/운영대시보드)
- **역할 기반 필터링**: `isAdmin`, `isOperator`, `isStoreOwner`, `isPharmacyRelated`로 조건�� 노출
- **공개/역할 메뉴 시각 분리**: 구분선(`navSeparatorLine`)으로 분리
- **DemoHeader 메뉴**: 별도 상수 `demoMenuItems` 하드코딩 (4개, 드롭다운 포함)
- **Operator 메뉴**: `config/operatorMenuGroups.ts`에서 정의 → OperatorShell에 전달
- **Store 메뉴**: `@o4o/store-ui-core`의 `KPA_SOCIETY_STORE_CONFIG` + `resolveStoreMenu`
- **Hub 메뉴**: `PharmacyHubLayout` 내 `HUB_MENU_ITEMS` 상수

#### 구조 다이어그램

```
kpa-society

App (BrowserRouter)
 ├── Layout (Main)                          ← 대부분 공개 페이지
 │   ├── Header (역할 기반 메뉴)
 │   ├── Page
 │   └── Footer
 │
 ├── DemoLayout                             ← /demo/* (삭제 예정)
 │   ├── DemoBanner
 │   ├── DemoHeader (어두운 테마)
 │   ├── Page
 │   └── Footer
 │
 ├── AdminLayout                            ← /admin/*
 │   ├── AdminSidebar (고정 좌측)
 │   └── Page (AdminHeader 포함)
 │
 ├── IntranetLayout                         ← /intranet/*
 │   ├── IntranetSidebar (고정 좌측)
 │   └── Page (IntranetHeader 포함)
 │
 ├── KpaOperatorLayoutWrapper               ← /operator/*
 │   └── OperatorShell (@o4o/ui)
 │       ├── 커스텀 Header (renderHeader)
 │       ├── Sidebar (11-Capability)
 │       └── Page
 │
 ├── StoreDashboardLayout (@o4o/store-ui-core) ← /store/*
 │   ├── StoreTopBar (navItems 포함)
 │   ├── StoreSidebar
 │   └── Page
 │
 ├── PharmacyHubLayout                      ← /hub/*
 │   ├── Sidebar (HUB 메뉴)
 │   └── Page
 │
 └── Standalone Pages (no layout)
     ├── TabletStorePage (/tablet/:slug)
     ├── StorefrontHomePage (/store/:slug)
     └── CheckoutPage 등
```

---

### 2.2 GlycoPharm

#### Layout 목록

| # | Layout | 파일 경로 | 사용 영역 |
|---|--------|-----------|-----------|
| 1 | **MainLayout** | `components/layouts/MainLayout.tsx` | `/community`, `/forum/*`, `/education/*`, `/hub/*`, `/mypage/*` 등 공개 |
| 2 | **DashboardLayout** | `components/layouts/DashboardLayout.tsx` | `/admin/*` (role="admin"), `/service/*` (role="consumer") |
| 3 | **OperatorLayoutWrapper** | `components/layouts/OperatorLayoutWrapper.tsx` | `/operator/*` (OperatorShell 래핑) |
| 4 | **StoreLayout** | `components/layouts/StoreLayout.tsx` | `/store/:pharmacyId/*` (소비자 스토어) |
| 5 | **StoreDashboardLayout** (공유) | `@o4o/store-ui-core` | `/store/hub`, `/store/products` 등 (약국 관리) |
| 6 | **KioskLayout** | `components/layouts/KioskLayout.tsx` | `/store/:pharmacyId/kiosk/*` |
| 7 | **TabletLayout** | `components/layouts/TabletLayout.tsx` | `/store/:pharmacyId/tablet/*` |
| 8 | **GlycoPharmHubLayout** | `components/layouts/GlycoPharmHubLayout.tsx` | `/hub/*` (사이드바 레이아웃) |

#### Header 목록

| # | Header | 파일 경로 | 사용 위치 | 스타일 |
|---|--------|-----------|-----------|--------|
| 1 | **Header** (Main) | `components/common/Header.tsx` | MainLayout 내부 | Tailwind, gradient 로고, NavLink 사용 |
| 2 | **DashboardLayout 내장 헤더** | `components/layouts/DashboardLayout.tsx` (2중 헤더) | DashboardLayout 내부 | 상단 네비게이션 + 대시보드 서브 헤더(검색+알림+유저) |
| 3 | **OperatorShell 기본 헤더** | `@o4o/ui` OperatorShell 기본 | OperatorLayoutWrapper | 서비스명 + Operator 뱃지 |

#### Navigation 구조

- **Main Header**: `publicMenuItems` (3개: 홈/포럼/강의) + `pharmacyMenuItems` (2개: 약국HUB/내약국) 하드코딩
- **DashboardLayout**: `roleConfig` 객체에서 role별 `menuGroups` / `menuItems` 정의
- **Operator**: `config/operatorMenuGroups.ts` → OperatorShell
- **Store**: `@o4o/store-ui-core`의 `GLYCOPHARM_STORE_CONFIG`

#### 구조 다이어그램

```
glycopharm

App (BrowserRouter)
 ├── MainLayout                             ← 공개 페이지 전체
 │   ├── Header (역할 기반 메뉴)
 │   ├── Page
 │   └── Footer
 │
 ├── DashboardLayout(role="admin")          ← /admin/*
 │   ├── Global Header (네비게이션)
 │   ├── Sidebar (role 기반 menuGroups)
 │   ├── Dashboard SubHeader (검색+알림)
 │   └── Page
 │
 ├── OperatorLayoutWrapper                  ← /operator/*
 │   └── OperatorShell (@o4o/ui)
 │       ├── 기본 Header
 │       ├── Sidebar (11-Capability)
 │       └── Page
 │
 ├── StoreDashboardLayout (@o4o/store-ui-core) ← /store/hub, /store/products 등
 │   ├── StoreTopBar
 │   ├── StoreSidebar
 │   └── Page
 │
 ├── StoreLayout                            ← /store/:pharmacyId/* (소비자)
 │   └── Page
 │
 ├── KioskLayout                            ← /store/:pharmacyId/kiosk/*
 │   └── Page
 │
 ├── TabletLayout                           ← /store/:pharmacyId/tablet/*
 │   └── Page
 │
 └── GlycoPharmHubLayout                    ← /hub/*
     ├── Sidebar (HUB)
     └── Page
```

---

### 2.3 Neture

#### Layout 목록

| # | Layout | 파일 경로 | 사용 영역 |
|---|--------|-----------|-----------|
| 1 | **NetureLayout** | `components/layouts/NetureLayout.tsx` | `/`, `/community/*`, `/mypage/*`, `/market-trial/*` 등 |
| 2 | **MainLayout** | `components/layouts/MainLayout.tsx` | `/o4o/*`, `/store/*`, `/forum/*`, `/seller/*` 등 |
| 3 | **SupplierSpaceLayout** | `components/layouts/SupplierSpaceLayout.tsx` | `/supplier/*` |
| 4 | **SupplierAccountLayout** | `components/layouts/SupplierAccountLayout.tsx` | `/account/supplier/*` |
| 5 | **PartnerSpaceLayout** | `components/layouts/PartnerSpaceLayout.tsx` | `/partner/*` |
| 6 | **PartnerAccountLayout** | `components/layouts/PartnerAccountLayout.tsx` | `/account/partner/*` |
| 7 | **SupplierOpsLayout** | `components/layouts/SupplierOpsLayout.tsx` | `/workspace/*` |
| 8 | **AdminLayoutWrapper** | `components/layouts/AdminLayoutWrapper.tsx` | `/admin/*` (OperatorShell 래핑) |
| 9 | **OperatorLayoutWrapper** | `components/layouts/OperatorLayoutWrapper.tsx` | `/operator/*` (OperatorShell 래핑) |
| 10 | **AdminVaultLayout** | `components/layouts/AdminVaultLayout.tsx` | `/admin-vault/*` |

#### Header 현황

- **별도 Header 컴포넌트 없음** — 모든 Header가 Layout 내부에 inline 정의
- NetureLayout: "Neture" 로고 + Home/Community/Supplier/Partner/Contact/About 메뉴
- MainLayout: "o4o" 로고 + 홈/플랫폼소개/Vault 메뉴
- 각 Space Layout: 내부에 자체 Header/Sidebar 내장

#### Navigation 구조

- **NetureLayout**: Layout 내 하드코딩 (6개: Home/Community/Supplier/Partner/Contact/About)
- **MainLayout**: Layout 내 하드코딩 (3개: 홈/플랫폼소개/Vault)
- **Operator/Admin**: `config/operatorMenuGroups.ts` → OperatorShell
- **Supplier/Partner**: 각 Space Layout 내부 자체 정의

#### 구조 다이어그램

```
neture

App (BrowserRouter)
 ├── NetureLayout                           ← / 홈, /community, /mypage 등
 │   ├── Header (inline: Neture 브랜드)
 │   ├── Page
 │   └── Footer
 │
 ├── MainLayout                             ← /o4o/*, /store/*, /forum/*
 │   ├── Header (inline: o4o 브랜드)
 │   ├── Page
 │   └── Footer
 │
 ├── SupplierSpaceLayout                    ← /supplier/*
 │   ├── Header+Sidebar (자체)
 │   └── Page
 │
 ├── SupplierAccountLayout                  ← /account/supplier/*
 │   ├── Header+Sidebar (자체)
 │   └── Page
 │
 ├── PartnerSpaceLayout                     ← /partner/*
 │   ├── Header+Sidebar (자체)
 │   └── Page
 │
 ├── PartnerAccountLayout                   ← /account/partner/*
 │   ├── Header+Sidebar (자체)
 │   └── Page
 │
 ├── SupplierOpsLayout                      ← /workspace/*
 │   ├── Header+Sidebar (자체)
 │   └── Page
 │
 ├── AdminLayoutWrapper                     ← /admin/*
 │   └── OperatorShell (@o4o/ui, 전체 메뉴)
 │
 ├── OperatorLayoutWrapper                  ← /operator/*
 │   └── OperatorShell (@o4o/ui, adminOnly 제외)
 │
 └── AdminVaultLayout                       ← /admin-vault/*
     ├── Sidebar (자체)
     └── Page
```

---

### 2.4 K-Cosmetics

#### Layout 목록

| # | Layout | 파일 경로 | 사용 영역 |
|---|--------|-----------|-----------|
| 1 | **MainLayout** | `components/layouts/MainLayout.tsx` | `/`, `/community`, `/forum/*`, `/mypage/*`, `/hub` 등 공개 |
| 2 | **PartnerLayout** | `components/layouts/PartnerLayout.tsx` | `/partner/*` |
| 3 | **DashboardLayout** | `components/layouts/DashboardLayout.tsx` | `/admin/*` (role="admin") |
| 4 | **OperatorLayoutWrapper** | `components/layouts/OperatorLayoutWrapper.tsx` | `/operator/*` (OperatorShell 래핑) |
| 5 | **StoreDashboardLayout** (공유) | `@o4o/store-ui-core` | `/store/*` (매장 관리) |

#### Header 목록

| # | Header | 파일 경로 | 사용 위치 | 스타일 |
|---|--------|-----------|-----------|--------|
| 1 | **Header** | `components/common/Header.tsx` | MainLayout 내부 | inline style, 핑크(#e91e63) 테마 |
| 2 | **OperatorShell 기본 헤더** | `@o4o/ui` OperatorShell 기본 | OperatorLayoutWrapper | 서비스명 + Operator 뱃지 |

#### Navigation 구조

- **Main Header**: 하드코딩 (4개: 홈/허브/커뮤니티/매장관리[조건부])
- **Operator**: `config/operatorMenuGroups.ts` → OperatorShell
- **Store**: `@o4o/store-ui-core`의 `COSMETICS_STORE_CONFIG`

#### 구조 다이어그램

```
k-cosmetics

App (BrowserRouter)
 ├── MainLayout                             ← 공개 페이지 전체
 │   ├── Header (핑크 테마)
 │   ├── Page
 │   └── Footer
 │
 ├── PartnerLayout                          ← /partner/*
 │   ├── Header+Sidebar (자체)
 │   └── Page
 │
 ├── DashboardLayout(role="admin")          ← /admin/*
 │   ├── Header+Sidebar (자체)
 │   └── Page
 │
 ├── OperatorLayoutWrapper                  ← /operator/*
 │   └── OperatorShell (@o4o/ui)
 │       ├── 기본 Header
 │       ├── Sidebar (11-Capability)
 │       └── Page
 │
 └── StoreDashboardLayout (@o4o/store-ui-core) ← /store/*
     ├── StoreTopBar
     ├── StoreSidebar
     └── Page
```

---

## 3. Header/Navigation 구조 비교

### 3.1 Header 사용 매핑 표

| 서비스 | URL | Layout | Header | 비고 |
|--------|-----|--------|--------|------|
| **kpa** | `/` | Layout | Header | 역할 기반 메뉴 필터링, 공개/역할 분리 |
| **kpa** | `/forum/*` | Layout | Header | 동일 |
| **kpa** | `/demo/*` | DemoLayout | DemoHeader | 어두운 배경, 삭제 예정 |
| **kpa** | `/admin/*` | AdminLayout | (AdminSidebar) | Header 없음, 사이드바만 |
| **kpa** | `/operator/*` | KpaOperatorLayoutWrapper | 커스텀 renderHeader | OperatorShell + 커스텀 헤더 |
| **kpa** | `/store/*` | StoreDashboardLayout | StoreTopBar | 공유 패키지 |
| **kpa** | `/hub/*` | Layout > PharmacyHubLayout | Header (Main) | Main Header + Hub Sidebar |
| **kpa** | `/intranet/*` | IntranetLayout | (IntranetSidebar) | Header 없음, 사이드바만 |
| **glyco** | `/community` | MainLayout | Header | Tailwind, NavLink 사용 |
| **glyco** | `/forum/*` | MainLayout | Header | 동일 |
| **glyco** | `/admin/*` | DashboardLayout | 자체 이중 헤더 | 상단 nav + 서브 헤더(검색/알림) |
| **glyco** | `/operator/*` | OperatorLayoutWrapper | OperatorShell 기본 | 공유 패키지 |
| **glyco** | `/store/*` (관리) | StoreDashboardLayout | StoreTopBar | 공유 패키지 |
| **glyco** | `/store/:id` (소비자) | StoreLayout | (없음) | 별도 소비자 레이아웃 |
| **neture** | `/` | NetureLayout | 내장 Header | "Neture" 브랜드 |
| **neture** | `/o4o/*` | MainLayout | 내장 Header | "o4o" 브랜드 (별도!) |
| **neture** | `/supplier/*` | SupplierSpaceLayout | 자체 | 독립 |
| **neture** | `/partner/*` | PartnerSpaceLayout | 자체 | 독립 |
| **neture** | `/operator/*` | OperatorLayoutWrapper | OperatorShell 기본 | 공유 패키지 |
| **neture** | `/admin/*` | AdminLayoutWrapper | OperatorShell 전체 | 공유 패키지 |
| **kcos** | `/` | MainLayout | Header | 핑크 테마 |
| **kcos** | `/community` | MainLayout | Header | 동일 |
| **kcos** | `/partner/*` | PartnerLayout | 자체 | 독립 |
| **kcos** | `/operator/*` | OperatorLayoutWrapper | OperatorShell 기본 | 공유 패키지 |
| **kcos** | `/store/*` | StoreDashboardLayout | StoreTopBar | 공유 패키지 |

### 3.2 메뉴 구성 비교

| 항목 | kpa-society | glycopharm | neture | k-cosmetics |
|------|------------|------------|--------|-------------|
| **공개 메뉴** | 홈/포럼/강의 | 홈/포럼/강의 | Home/Community/Supplier/Partner/Contact/About | 홈/허브/커뮤니티 |
| **조건부 메뉴** | 약국HUB/내약국/운영대시보드 | 약국HUB/내약국 | 없음 (역할별 별도 Layout) | 매장관리 |
| **메뉴 정의 위치** | Header.tsx 상수 | Header.tsx 상수 | NetureLayout.tsx 내장 | Header.tsx 내장 |
| **메뉴 관리 방식** | 하드코딩 + 역할 필터 | 하드코딩 + 역할 필터 | 하드코딩 | 하드코딩 |
| **공유 메뉴 시스템** | 없음 | 없음 | 없음 | 없음 |

---

## 4. 문제 유형 분류

### TYPE A: Header 완전 분리 (서비스별 독립)

**해당: 전체 4개 서비스**

- 모든 서비스가 자체 Header 컴포넌트를 보유
- kpa: `Header.tsx` (inline style, 70px 높이, `💊` 아이콘)
- glycopharm: `Header.tsx` (Tailwind, 64px 높이, gradient 아이콘)
- neture: Layout 내장 (Tailwind, 64px 높이, 텍스트 로고)
- k-cosmetics: `Header.tsx` (inline style, 64px 높이, `💄` 아이콘)
- **공통 Header 컴포넌트가 존재하지 않음**

### TYPE B: Role별 Header 분리 (operator/store)

**해당: kpa-society (심각), glycopharm (부분)**

- kpa는 Main/Demo/Admin/Intranet/Operator/Store/Hub 총 **7개 Layout**에 **6개 Header 계열** 보유
- glycopharm의 DashboardLayout은 자체 이중 헤더 (글로벌 nav + 대시보드 서브헤더)
- Operator는 공유 OperatorShell 사용하지만, kpa는 `renderHeader`로 커스텀 오버라이드

### TYPE C: Layout 중복

**해당: kpa-society, neture**

- kpa: `Layout` + `DemoLayout`은 구조 동일 (Header+main+Footer), Header만 다름
- kpa: `AdminLayout` + `IntranetLayout`은 구조 동일 (Sidebar+main), Sidebar만 다름
- neture: `NetureLayout` + `MainLayout`은 구조 동일하나 브랜드(Neture vs o4o)가 다름
- neture: `SupplierSpaceLayout` + `PartnerSpaceLayout` + `SupplierOpsLayout`은 유사 구조

### TYPE D: Navigation 하드코딩 분산

**해당: 전체 4개 서비스**

- 모든 서비스의 메뉴가 각 Header/Layout 파일��� 상수로 하드코딩
- kpa: `menuItems`(Header.tsx), `demoMenuItems`(DemoHeader.tsx), `KPA_STORE_NAV_ITEMS`(App.tsx), `HUB_MENU_ITEMS`(PharmacyHubLayout.tsx) — 4곳 분산
- glycopharm: `publicMenuItems`+`pharmacyMenuItems`(Header.tsx), DashboardLayout 내 `roleConfig` — 2곳
- neture: NetureLayout 내 nav, MainLayout 내 nav — 2곳
- k-cosmetics: Header.tsx 내 nav — 1곳
- **중앙화된 메뉴 설정 시스템 부재**

### TYPE E: 공통 컴포넌트 존재하지만 미사용

- `@o4o/ui`의 **OperatorShell**은 4개 서비스 모두 사용 중 (양호)
- `@o4o/store-ui-core`의 **StoreDashboardLayout**은 3개 서비스 사용 중 (양호)
- **PlatformHeader** (kpa 내부): 존재하지만 사용되지 않음 (레거시)

---

## 5. 핵심 문제 정리

### 5.1 공통 Header 존재 여부

**존재하지 않음.**

- Operator Shell (`@o4o/ui`) → 공유 O (Operator 영역 한정)
- Store Shell (`@o4o/store-ui-core`) → 공유 O (Store Owner 영역 한정)
- **Main/Public Header → 공유 X** (4개 서비스 모두 독립 구현)
- **Admin Header → 공유 X** (kpa/glycopharm 각각 자체 구현)

### 5.2 Layout 통합 가능성

| 영역 | 통합 가능성 | 근거 |
|------|:-----------:|------|
| **Operator Layout** | **이미 통합됨** | OperatorShell 사용 (단, kpa는 renderHeader 오버라이드) |
| **Store Layout** | **이미 통합됨** | StoreDashboardLayout 사용 |
| **Main/Public Layout** | **통합 가능** | 4개 서비스 모두 `Header + main + Footer` 동일 구조. Header만 다름 |
| **Admin Layout** | **통합 가능** | kpa의 AdminLayout과 glycopharm의 DashboardLayout(admin)은 유사 구조 |
| **특수 Layout** (Demo/Intranet/Supplier/Partner) | **통합 어려움** | 도메인 특화 구조, 서비스 간 공유 불가 |

### 5.3 표준화 시 예상 충돌 지점

1. **스타일링 방식 불일치**: kpa/k-cosmetics는 inline style, glycopharm/neture는 Tailwind CSS — 공통 컴포넌트 구축 시 어느 방식을 채택할지 결정 필요
2. **브랜드 아이덴���티**: 각 서비스의 로고/컬러/아이콘이 다름 (kpa: 💊/blue, glycopharm: Activity/green, neture: text/green, k-cosmetics: 💄/pink) — 공통 Header는 서비스별 props로 주입해야 함
3. **메뉴 구조 차이**: kpa는 역할 기반 동적 필터링, neture는 역할별 완전 Layout 분리 — 메뉴 시스템 통합 시 두 가지 접근 방식 조정 필요
4. **kpa의 renderHeader 커스텀**: Operator 영역에서 kpa만 OperatorShell의 기본 헤더를 오버라이드하여 사용 — 통합 시 이 패턴의 지속 여부 결정 필요
5. **ServiceSwitcher 위치**: kpa/glycopharm/neture/k-cosmetics 모두 Header 우측에 ServiceSwitcher를 배치하나, 위치/스타일이 각각 다름

---

## 6. 부록: 파일 인벤토리

### Layout 파일 전체 목록

| 서비스 | 파일 경로 |
|--------|-----------|
| kpa | `services/web-kpa-society/src/components/Layout.tsx` |
| kpa | `services/web-kpa-society/src/components/DemoLayout.tsx` |
| kpa | `services/web-kpa-society/src/components/admin/AdminLayout.tsx` |
| kpa | `services/web-kpa-society/src/components/intranet/IntranetLayout.tsx` |
| kpa | `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` |
| kpa | `services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx` |
| kpa | `services/web-kpa-society/src/components/platform/InfoPageLayout.tsx` |
| glyco | `services/web-glycopharm/src/components/layouts/MainLayout.tsx` |
| glyco | `services/web-glycopharm/src/components/layouts/DashboardLayout.tsx` |
| glyco | `services/web-glycopharm/src/components/layouts/OperatorLayoutWrapper.tsx` |
| glyco | `services/web-glycopharm/src/components/layouts/StoreLayout.tsx` |
| glyco | `services/web-glycopharm/src/components/layouts/KioskLayout.tsx` |
| glyco | `services/web-glycopharm/src/components/layouts/TabletLayout.tsx` |
| glyco | `services/web-glycopharm/src/components/layouts/GlycoPharmHubLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/NetureLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/MainLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/SupplierAccountLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/PartnerSpaceLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/PartnerAccountLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/SupplierOpsLayout.tsx` |
| neture | `services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx` |
| neture | `services/web-neture/src/components/layouts/AdminLayoutWrapper.tsx` |
| neture | `services/web-neture/src/components/layouts/AdminVaultLayout.tsx` |
| kcos | `services/web-k-cosmetics/src/components/layouts/MainLayout.tsx` |
| kcos | `services/web-k-cosmetics/src/components/layouts/PartnerLayout.tsx` |
| kcos | `services/web-k-cosmetics/src/components/layouts/DashboardLayout.tsx` |
| kcos | `services/web-k-cosmetics/src/components/layouts/OperatorLayoutWrapper.tsx` |

### Header 파일 전체 목록

| 서비스 | 파일 경로 |
|--------|-----------|
| kpa | `services/web-kpa-society/src/components/Header.tsx` |
| kpa | `services/web-kpa-society/src/components/DemoHeader.tsx` |
| kpa | `services/web-kpa-society/src/components/admin/AdminHeader.tsx` |
| kpa | `services/web-kpa-society/src/components/intranet/IntranetHeader.tsx` |
| kpa | `services/web-kpa-society/src/components/platform/PlatformHeader.tsx` (미사용) |
| glyco | `services/web-glycopharm/src/components/common/Header.tsx` |
| glyco | `services/web-glycopharm/src/components/common/PageHeader.tsx` |
| kcos | `services/web-k-cosmetics/src/components/common/Header.tsx` |

### 공유 패키지

| 패키지 | 컴포넌트 | 파일 경로 |
|--------|----------|-----------|
| `@o4o/ui` | OperatorShell | `packages/ui/src/operator-shell/OperatorShell.tsx` |
| `@o4o/store-ui-core` | StoreDashboardLayout | `packages/store-ui-core/src/layout/StoreDashboardLayout.tsx` |
| `@o4o/store-ui-core` | StoreTopBar | `packages/store-ui-core/src/components/StoreTopBar.tsx` |
| `@o4o/store-ui-core` | StoreSidebar | `packages/store-ui-core/src/components/StoreSidebar.tsx` |

---

*이 보고서는 다음 단계인 **WO-O4O-GLOBAL-HEADER-STANDARD-V1** (표준 정의) 및 **WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1** (구현)의 기반 자료로 사용됩니다.*
