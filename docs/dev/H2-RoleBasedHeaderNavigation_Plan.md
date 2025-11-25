# H2: 역할 기반 헤더/메뉴 리팩토링 플랜

**작성일**: 2025-11-25
**Phase**: H2-1 조사 및 플랜 수립
**상태**: ✅ 조사 완료, 플랜 확정
**이전 Phase**: H1-Full Header Investigation (O1 Template Part priority 수정 대기)

---

## 1. 목표 및 범위

### 1.1 Phase 목표

**H2-1: 조사 및 플랜 수립** (현재 완료)
- 역할 기반 헤더/메뉴 설계표 문서 조사
- 현재 main-site 헤더/네비게이션 구현 구조 파악
- 설계 vs 구현 갭 분석
- 리팩토링 플랜 문서 작성

**H2-2: 역할 기반 헤더/메뉴 리팩토링 구현** (다음 Phase)
- AccountModule 역할 표시 개선
- RoleSwitcher 통합 및 UX 개선
- Template Part Navigation과 Role 메뉴 통합
- 역할별 메뉴 항목 표시 로직 구현

**H2-3: 역할별 대시보드 진입 개선** (후속 Phase)
- HubLayout과 Template Part Layout 통합
- 역할별 Dashboard 카드 렌더링 개선
- 분석 이벤트 통합

### 1.2 범위

**포함:**
- `apps/main-site` 헤더/네비게이션 컴포넌트 리팩토링
- AccountModule 역할 표시 개선
- RoleSwitcher UI/UX 개선
- Template Part Navigation과 Role 메뉴 통합
- 역할별 메뉴 항목 필터링 로직

**제외 (다른 Phase에서 처리):**
- O1: Template Part "Main Header" priority 수정 (별도 Phase)
- Admin Dashboard 헤더/메뉴 (H2는 main-site 전용)
- API 서버 역할 권한 검증 로직 (이미 구현됨)
- Settlement, App Market, Dropshipping 로직 수정

---

## 2. 설계 문서 조사 결과

### 2.1 발견한 설계 문서

#### 문서 1: `docs/development/specialized/role-based-navigation.md` (M3)
**주요 내용:**
- 역할 기반 네비게이션 시스템 기술 문서
- 지원 역할: `customer`, `seller`, `supplier`, `affiliate`
- 역할별 설정 레지스트리: `menus.ts`, `banners.ts`, `dashboards.ts`
- HubLayout 컴포넌트: 역할 인지 레이아웃
- RoleGuard 컴포넌트: 접근 제어
- 분석 이벤트: `role_switched`, `role_menu_loaded`, `role_banner_shown`, etc.

#### 문서 2: `docs/guides/roles/role-personalization.md`
**주요 내용:**
- 관리자용 역할 기반 개인화 시스템 매뉴얼
- 개인화 슬롯: Top Notice, Main Feed, Side Suggestions, Bottom Banners
- Signal 수집: 행동 신호, 상태 신호, 디바이스 신호
- 우선순위 규칙: 긴급 작업 (+10~+30), 온보딩 (+30), 클릭 학습 (+5), 에러 가이드 (+15)

#### 문서 3: `docs/guides/roles/menu-role-application.md`
**주요 내용:**
- 사용자용 메뉴에 역할 적용 매뉴얼
- Target Audience 옵션: Everyone, Logged Out Only, Specific Roles
- 지원 역할: customer, seller, supplier, affiliate, super_admin, admin, editor
- Display Mode: Show/Hide
- 메뉴 항목 및 서브메뉴에 역할 적용 방법

#### 문서 4: `docs/dev/H1-Full-Header-Investigation.md`
**주요 내용:**
- 헤더 전면 조사 리포트
- 헤더 렌더링 플로우: App.tsx → Layout → TemplatePartRenderer → AccountModule
- AuthContext로 전역 인증 상태 관리
- AccountModule 조건부 렌더링 (guest vs authenticated) 완벽
- **Production 이슈**: "Main Header" (priority 0) vs "Shop Header" (priority 100) 충돌
- **해결 방안**: Main Header priority를 101로 업데이트 (O1 Phase)

### 2.2 역할별 메뉴 매트릭스 (설계 사양)

| 역할 | Header Visible Items | Account Dropdown | Dashboard Entry | RoleSwitcher |
|------|---------------------|------------------|-----------------|--------------|
| **Guest (비로그인)** | 홈, 쇼핑, 소개 | "로그인", "회원가입" | - | 숨김 |
| **Customer** | 홈, 쇼핑, 주문내역, 위시리스트 | 내 계정, 주문 내역, 위시리스트, 알림, 설정, 고객지원, 로그아웃 | - | 복수 역할 시 표시 |
| **Seller** | 대시보드, 상품관리, 주문관리, 매출분석 | 내 계정, Seller 대시보드, 설정, 로그아웃 | `/seller` | 복수 역할 시 표시 |
| **Supplier** | 대시보드, 재고관리, 주문관리, 파트너관리 | 내 계정, Supplier 대시보드, 설정, 로그아웃 | `/supplier` | 복수 역할 시 표시 |
| **Affiliate** | 대시보드, 캠페인관리, 수익분석, 클릭통계 | 내 계정, Affiliate 대시보드, 설정, 로그아웃 | `/affiliate` | 복수 역할 시 표시 |
| **Partner** | 대시보드, 링크관리, 정산내역, 수익분석 | 내 계정, Partner 대시보드, 설정, 로그아웃 | `/dashboard/partner` | 복수 역할 시 표시 |
| **Admin** | (관리자 전용 인터페이스) | Admin 대시보드 (별도 앱) | `https://admin.neture.co.kr` | N/A |

**참고:**
- M3 문서에는 `customer`, `seller`, `supplier`, `affiliate` 4개 역할만 명시
- 실제 코드에는 `partner` 역할도 구현되어 있음 (Navbar.tsx, RoleSwitcher.tsx)
- `admin` 역할은 별도 Admin Dashboard 앱 사용

---

## 3. 현재 구현 상태 조사 결과

### 3.1 Template Part System (헤더 렌더링)

**렌더링 플로우:**
```
App.tsx
  └─ Layout.tsx
       └─ TemplatePartRenderer (area="header")
            ├─ useTemplateParts() - DB에서 Template Parts 조회
            ├─ ResponsiveHeader - 모바일 지원
            ├─ StickyHeader - Sticky 기능
            └─ Block 렌더링 (blockComponents 매핑)
                 ├─ SiteLogo (core/site-logo)
                 ├─ Navigation (core/navigation)
                 ├─ AccountModule (o4o/account-menu)
                 ├─ CartModule (o4o/cart-icon)
                 ├─ RoleSwitcher (o4o/role-switcher)
                 └─ ... (기타 블록)
```

**파일:** `/home/dev/o4o-platform/apps/main-site/src/components/layout/Layout.tsx:1-150`
**파일:** `/home/dev/o4o-platform/apps/main-site/src/components/TemplatePartRenderer.tsx:1-337`

**특징:**
- WordPress 스타일 Template Part 시스템
- DB 기반 헤더 구성 (priority 순 렌더링)
- 블록 컴포넌트 매핑 (`blockComponents` 레지스트리)
- Sticky, Responsive 기능 통합
- **이슈**: Priority 0 "Main Header"와 Priority 100 "Shop Header" 충돌 (H1-Full 리포트)

### 3.2 AccountModule (역할 표시 및 Dropdown)

**파일:** `/home/dev/o4o-platform/apps/main-site/src/components/blocks/AccountModule.tsx:1-100`

**현재 기능:**
- Guest 상태: "로그인" / "회원가입" 버튼 표시
- Authenticated 상태:
  - 사용자 아바타/이름 표시
  - 현재 active role 뱃지 표시 (예: "🛒 판매자")
  - Dropdown 메뉴:
    - 사용자 정보 (이름, 이메일, active role)
    - 내 계정, 주문 내역, 위시리스트, 알림, 설정, 고객지원
    - **RoleSwitcher** (복수 역할 시)
    - 로그아웃

**역할 뱃지 설정:**
```typescript
const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  customer: { label: '고객', color: 'bg-blue-100 text-blue-800', icon: '👤' },
  seller: { label: '판매자', color: 'bg-green-100 text-green-800', icon: '🛒' },
  supplier: { label: '공급자', color: 'bg-purple-100 text-purple-800', icon: '🏭' },
  partner: { label: '파트너', color: 'bg-orange-100 text-orange-800', icon: '🤝' },
  admin: { label: '관리자', color: 'bg-red-100 text-red-800', icon: '⚙️' },
};
```

**평가:**
- ✅ 조건부 렌더링 (guest vs authenticated) 완벽
- ✅ 역할 뱃지 표시 구현됨
- ✅ Dropdown 메뉴 구현됨
- ⚠️ **Gap**: Dropdown 메뉴 항목이 역할별로 변경되지 않음 (모든 역할에 동일한 메뉴)

### 3.3 RoleSwitcher (역할 전환 컴포넌트)

**파일:** `/home/dev/o4o-platform/apps/main-site/src/components/blocks/RoleSwitcher.tsx:1-150`

**현재 기능:**
- Workspace 기반 역할 전환
- 지원 역할: customer, seller, supplier, partner, admin
- URL 경로로 active role 감지: `/workspace/{role}`, `/dashboard/{role}`, `/account`, `/store`
- 복수 역할 사용자에게만 표시 (`activeAssignments.length > 1`)
- 역할 전환 시 해당 workspace로 navigate

**역할 옵션 설정:**
```typescript
const roleOptions: Record<string, RoleOption> = {
  customer: { path: '/workspace/customer', icon: '👤' },
  seller: { path: '/workspace/seller', icon: '🛒' },
  supplier: { path: '/workspace/supplier', icon: '🏭' },
  partner: { path: '/workspace/partner', icon: '🤝' },
  admin: { path: '/workspace/admin', icon: '⚙️' },
};
```

**평가:**
- ✅ 복수 역할 감지 로직 구현됨
- ✅ URL 기반 active role 감지
- ⚠️ **Gap**: AccountModule Dropdown에 통합되어 있어 UX가 다소 불편
- ⚠️ **Gap**: M3 문서에서 설명하는 RoleSwitcher API 호출 (`PATCH /user/preferences`) 연동 확인 필요

### 3.4 Navigation (메뉴 렌더링)

**파일:** `/home/dev/o4o-platform/apps/main-site/src/components/blocks/Navigation.tsx:1-100`

**현재 기능:**
- `useMenu(menuRef)` hook으로 DB에서 메뉴 데이터 가져오기
- 메뉴 항목 렌더링 (링크, 서브메뉴)
- Dropdown submenu 지원
- Responsive 지원 (모바일 햄버거 메뉴)

**평가:**
- ✅ DB 기반 메뉴 렌더링 구현됨
- ⚠️ **Gap**: 역할 기반 메뉴 필터링 로직 없음 (모든 사용자에게 동일한 메뉴 표시)
- ⚠️ **Gap**: `config/roles/menus.ts` 역할 메뉴 설정과 통합되지 않음

### 3.5 Role Configuration Files

**파일 위치:** `/home/dev/o4o-platform/apps/main-site/src/config/roles/`

**파일 목록:**
- `menus.ts` - 역할별 메뉴 정의 (customer, seller, supplier, affiliate)
- `dashboards.ts` - 역할별 대시보드 카드 설정
- `banners.ts` - 역할별 배너 설정
- `index.ts` - 통합 export

**menus.ts 예시:**
```typescript
export const ROLE_MENUS: Record<string, RoleMenuConfig> = {
  customer: {
    primary: [
      { id: 'home', title: '홈', url: '/', icon: 'Home' },
      { id: 'shop', title: '쇼핑', url: '/shop', icon: 'ShoppingCart' },
      { id: 'orders', title: '주문내역', url: '/orders', icon: 'Package' },
      { id: 'wishlist', title: '위시리스트', url: '/wishlist', icon: 'Heart' },
    ]
  },
  seller: {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/seller', icon: 'LayoutDashboard' },
      { id: 'products', title: '상품관리', url: '/seller/products', icon: 'Package' },
      { id: 'orders', title: '주문관리', url: '/seller/orders', icon: 'ShoppingBag' },
      { id: 'sales', title: '매출분석', url: '/seller/sales', icon: 'TrendingUp' },
    ]
  },
  // ... supplier, affiliate
};
```

**평가:**
- ✅ 역할별 메뉴 정의 존재
- ✅ 구조화된 설정 파일
- ⚠️ **Gap**: Navigation 컴포넌트와 통합되지 않음 (사용되지 않는 설정)
- ⚠️ **Gap**: M3 문서의 affiliate 역할 메뉴 정의되어 있지만, 실제 Navbar.tsx에는 partner만 있음

### 3.6 HubLayout (역할 인지 레이아웃)

**파일:** `/home/dev/o4o-platform/apps/main-site/src/components/layout/HubLayout.tsx:1-135`

**현재 기능:**
- `useAuth()`로 currentRole 구독
- 역할별 메뉴, 배너, 대시보드 설정 자동 로드
- M4 개인화 슬롯 통합 (TopNotice, SideSuggestions, BottomBanners)
- 분석 이벤트 전송 (role_menu_loaded, role_dashboard_loaded, role_banner_shown)

**사용 예시:**
```typescript
<HubLayout requiredRole="seller" showPersonalization={true}>
  {/* 대시보드 콘텐츠 */}
</HubLayout>
```

**평가:**
- ✅ 역할 인지 레이아웃 구현됨
- ✅ 개인화 슬롯 통합 (M4)
- ⚠️ **Gap**: Template Part Layout.tsx와 분리되어 있음 (두 가지 레이아웃 시스템 공존)
- ⚠️ **Gap**: HubLayout을 사용하는 페이지에서는 역할별 UI가 작동하지만, 일반 Layout.tsx를 사용하는 페이지에서는 작동하지 않음

### 3.7 Navbar.tsx (레거시 컴포넌트?)

**파일:** `/home/dev/o4o-platform/apps/main-site/src/components/layout/Navbar.tsx:1-177`

**현재 기능:**
- 역할 기반 대시보드 링크 (supplier, seller, partner)
- 역할 신청 링크 (역할 없는 사용자에게만 표시)
- Admin 링크 (admin 역할에게만 표시)
- 위시리스트 링크 (R-6-6)
- 로그아웃 버튼

**평가:**
- ⚠️ **Gap**: Template Part 시스템이 사용하는지 불명확
- ⚠️ **Gap**: AccountModule과 중복 기능 (사용자 정보, 로그아웃)
- ⚠️ **의문**: Layout.tsx는 TemplatePartRenderer를 사용하는데, Navbar.tsx는 언제 렌더링되는가?

### 3.8 Dashboard Layouts (역할별 대시보드)

**파일 위치:**
- `/home/dev/o4o-platform/apps/main-site/src/components/dashboard/seller/SellerLayout.tsx`
- `/home/dev/o4o-platform/apps/main-site/src/components/dashboard/supplier/SupplierLayout.tsx`
- `/home/dev/o4o-platform/apps/main-site/src/components/dashboard/partner/PartnerLayout.tsx`
- `/home/dev/o4o-platform/apps/main-site/src/components/dashboard/RoleDashboardMenu.tsx`

**현재 기능:**
- 역할별 Nested Layout (예: SellerLayout)
- RoleDashboardMenu로 탭 네비게이션
- Section/Route 기반 네비게이션 지원
- URL 경로로 active section 감지

**SellerLayout 예시:**
```typescript
const menuItems: DashboardMenuItem<SellerSection>[] = [
  { key: 'overview', label: '개요', icon: <LayoutDashboard />, type: 'route', href: '/dashboard/seller' },
  { key: 'products', label: '상품', icon: <Package />, type: 'route', href: '/dashboard/seller/products' },
  { key: 'orders', label: '주문', icon: <ShoppingCart />, type: 'route', href: '/dashboard/seller/orders' },
  { key: 'analytics', label: '분석', icon: <BarChart3 />, type: 'route', href: '/dashboard/seller/analytics' },
  { key: 'inventory', label: '재고', icon: <Warehouse />, type: 'route', href: '/dashboard/seller/inventory' },
  { key: 'settlements', label: '정산', icon: <DollarSign />, type: 'route', href: '/dashboard/seller/settlements' },
];
```

**평가:**
- ✅ 역할별 Dashboard Layout 구현됨
- ✅ RoleDashboardMenu 재사용 가능한 컴포넌트
- ⚠️ **Gap**: HubLayout 사용하지 않음 (일반 Layout.tsx 사용)
- ⚠️ **Gap**: config/roles/dashboards.ts 카드 설정과 통합 불명확

---

## 4. 갭 분석 (설계 vs 구현)

### 4.1 주요 갭

| 항목 | 설계 사양 (M3 문서) | 현재 구현 | 갭 |
|------|-------------------|---------|-----|
| **역할 범위** | customer, seller, supplier, affiliate | customer, seller, supplier, **partner**, admin | ✅ partner 추가 구현됨, affiliate 미구현 |
| **Header 메뉴** | 역할별 메뉴 항목 필터링 | 모든 사용자에게 동일한 메뉴 표시 | ❌ 역할 기반 필터링 없음 |
| **Account Dropdown** | 역할별 Dropdown 항목 변경 | 모든 역할에 동일한 Dropdown | ❌ 역할별 차별화 없음 |
| **RoleSwitcher** | Header에 독립적으로 표시 | AccountModule Dropdown 내부에 표시 | ⚠️ UX 개선 필요 |
| **Navigation 통합** | config/roles/menus.ts 사용 | DB 메뉴만 사용, menus.ts 미사용 | ❌ 역할 메뉴 설정 미통합 |
| **HubLayout 사용** | 역할별 허브 페이지에서 사용 | Dashboard Layout에서 미사용 | ⚠️ 레이아웃 시스템 이원화 |
| **분석 이벤트** | role_switched, role_menu_loaded, etc. | HubLayout에서만 전송 | ⚠️ 전체 헤더에 미적용 |
| **Template Part Priority** | N/A (설계 문서에 없음) | Main Header (0) vs Shop Header (100) 충돌 | ❌ O1 Phase에서 수정 필요 |

### 4.2 역할별 메뉴 갭 상세

#### Customer (고객)
| 항목 | 설계 사양 | 현재 구현 | 갭 |
|------|---------|---------|-----|
| Header 메뉴 | 홈, 쇼핑, 주문내역, 위시리스트 | DB 메뉴 (역할 무관) | ❌ 역할별 필터링 없음 |
| Account Dropdown | 내 계정, 주문 내역, 위시리스트, 알림, 설정, 고객지원, 로그아웃 | ✅ 구현됨 | ✅ OK |
| RoleSwitcher | 복수 역할 시 표시 | ✅ 구현됨 | ✅ OK |

#### Seller (판매자)
| 항목 | 설계 사양 | 현재 구현 | 갭 |
|------|---------|---------|-----|
| Header 메뉴 | 대시보드, 상품관리, 주문관리, 매출분석 | DB 메뉴 (역할 무관) | ❌ 역할별 필터링 없음 |
| Account Dropdown | 내 계정, Seller 대시보드, 설정, 로그아웃 | 모든 역할에 동일한 Dropdown | ❌ 역할별 차별화 없음 |
| Dashboard Entry | `/seller` | `/dashboard/seller` | ⚠️ 경로 불일치 |
| Dashboard Layout | HubLayout 사용 | ✅ SellerLayout (Layout.tsx 사용) | ⚠️ HubLayout 미사용 |

#### Supplier (공급자)
| 항목 | 설계 사양 | 현재 구현 | 갭 |
|------|---------|---------|-----|
| Header 메뉴 | 대시보드, 재고관리, 주문관리, 파트너관리 | DB 메뉴 (역할 무관) | ❌ 역할별 필터링 없음 |
| Account Dropdown | 내 계정, Supplier 대시보드, 설정, 로그아웃 | 모든 역할에 동일한 Dropdown | ❌ 역할별 차별화 없음 |
| Dashboard Entry | `/supplier` | `/dashboard/supplier` | ⚠️ 경로 불일치 |
| Dashboard Layout | HubLayout 사용 | ✅ SupplierLayout (Layout.tsx 사용) | ⚠️ HubLayout 미사용 |

#### Affiliate (제휴자)
| 항목 | 설계 사양 | 현재 구현 | 갭 |
|------|---------|---------|-----|
| Header 메뉴 | 대시보드, 캠페인관리, 수익분석, 클릭통계 | config/roles/menus.ts에 정의됨 | ❌ 실제 페이지/라우팅 미구현 |
| Account Dropdown | 내 계정, Affiliate 대시보드, 설정, 로그아웃 | 미구현 | ❌ 미구현 |
| Dashboard Entry | `/affiliate` | 미구현 | ❌ 미구현 |
| Dashboard Layout | HubLayout 사용 | 미구현 | ❌ 미구현 |

**참고:** M3 문서에 affiliate 역할이 명시되어 있으나, 실제 코드에는 partner 역할로 대체된 것으로 보임.

#### Partner (파트너) - 설계 문서에 없음
| 항목 | 설계 사양 | 현재 구현 | 갭 |
|------|---------|---------|-----|
| Header 메뉴 | N/A | DB 메뉴 (역할 무관) | ⚠️ 설계 문서 업데이트 필요 |
| Account Dropdown | N/A | 모든 역할에 동일한 Dropdown | ❌ 역할별 차별화 없음 |
| Dashboard Entry | N/A | `/dashboard/partner` | ✅ 구현됨 |
| Dashboard Layout | N/A | ✅ PartnerLayout (Layout.tsx 사용) | ✅ 구현됨 |

### 4.3 컴포넌트 아키텍처 갭

**설계 사양 (M3):**
```
AuthContext
  └─ HubLayout (역할 인지)
       ├─ 역할별 배너
       ├─ 역할별 대시보드 카드
       └─ 개인화 슬롯 (M4)
```

**현재 구현:**
```
AuthContext
  ├─ Layout.tsx
  │    └─ TemplatePartRenderer (area="header")
  │         ├─ AccountModule (역할 뱃지 + Dropdown)
  │         ├─ Navigation (DB 메뉴, 역할 필터링 없음)
  │         └─ RoleSwitcher (Dropdown 내부)
  │
  └─ Dashboard Layouts (SellerLayout, SupplierLayout, PartnerLayout)
       └─ RoleDashboardMenu (탭 네비게이션)
```

**갭:**
- ❌ HubLayout이 일반 페이지에서 사용되지 않음 (Dashboard Layout과 분리)
- ❌ Navigation이 역할 기반 메뉴를 사용하지 않음
- ❌ AccountModule Dropdown이 역할별로 변경되지 않음
- ⚠️ 두 가지 레이아웃 시스템 공존 (Layout.tsx vs HubLayout)

---

## 5. 리팩토링 작업 목록

### H2-2: 역할 기반 헤더/메뉴 리팩토링 구현

#### H2-2-1: Navbar.tsx 사용 여부 확인 및 정리
- **목표**: Navbar.tsx가 실제로 사용되는지 확인하고, 미사용 시 제거
- **작업:**
  - [ ] App.tsx 및 모든 라우트에서 Navbar.tsx import 검색
  - [ ] TemplatePartRenderer에서 Navbar 렌더링 여부 확인
  - [ ] 미사용 시: Navbar.tsx 삭제
  - [ ] 사용 중이라면: AccountModule과 기능 통합 계획 수립
- **파일:**
  - `apps/main-site/src/components/layout/Navbar.tsx`
  - `apps/main-site/src/App.tsx`
- **우선순위**: 높음 (중복 코드 제거)

#### H2-2-2: Navigation에 역할 기반 메뉴 필터링 추가
- **목표**: Navigation 컴포넌트가 config/roles/menus.ts를 사용하여 역할별 메뉴 항목 표시
- **작업:**
  - [ ] Navigation.tsx에 `useAuth()` hook 추가
  - [ ] currentRole 구독
  - [ ] `getMenuForRole(currentRole)` 호출하여 역할별 메뉴 가져오기
  - [ ] DB 메뉴와 역할 메뉴 병합 로직 구현
  - [ ] 역할 권한 없는 메뉴 항목 필터링
  - [ ] Guest 사용자 대응 (기본 메뉴 표시)
- **파일:**
  - `apps/main-site/src/components/blocks/Navigation.tsx`
  - `apps/main-site/src/config/roles/menus.ts`
- **테스트:**
  - Customer 역할로 로그인 → Customer 메뉴만 표시
  - Seller 역할로 로그인 → Seller 메뉴만 표시
  - Guest 사용자 → 기본 메뉴 표시
- **우선순위**: 높음 (핵심 기능)

#### H2-2-3: AccountModule Dropdown 역할별 차별화
- **목표**: AccountModule의 Dropdown 메뉴 항목이 역할에 따라 변경됨
- **작업:**
  - [ ] AccountModule.tsx에 역할별 Dropdown 항목 설정 추가
  - [ ] currentRole에 따라 Dropdown 항목 필터링
  - [ ] 예시:
    - Customer: 내 계정, 주문 내역, 위시리스트, 알림, 설정, 고객지원
    - Seller: 내 계정, Seller 대시보드, 상품 관리 바로가기, 설정
    - Supplier: 내 계정, Supplier 대시보드, 재고 관리 바로가기, 설정
    - Partner: 내 계정, Partner 대시보드, 링크 관리 바로가기, 설정
  - [ ] 모든 역할에 공통: 로그아웃
- **파일:**
  - `apps/main-site/src/components/blocks/AccountModule.tsx`
- **테스트:**
  - 각 역할로 로그인하여 Dropdown 항목 확인
- **우선순위**: 중간 (UX 개선)

#### H2-2-4: RoleSwitcher UX 개선 (선택 사항)
- **목표**: RoleSwitcher를 AccountModule Dropdown 외부로 분리하여 더 명확하게 표시
- **작업:**
  - [ ] 현재 RoleSwitcher 위치 분석 (AccountModule Dropdown 내부)
  - [ ] 대안 1: Header 오른쪽에 독립적으로 표시 (역할 뱃지 옆)
  - [ ] 대안 2: AccountModule Dropdown 최상단에 강조 표시
  - [ ] 사용자 피드백 기반 최종 위치 결정
- **파일:**
  - `apps/main-site/src/components/blocks/RoleSwitcher.tsx`
  - `apps/main-site/src/components/blocks/AccountModule.tsx`
- **테스트:**
  - 복수 역할 사용자로 로그인하여 RoleSwitcher 표시 확인
  - 역할 전환 시 UI 업데이트 확인
- **우선순위**: 낮음 (선택 사항, UX 개선)

#### H2-2-5: RoleSwitcher API 연동 확인
- **목표**: RoleSwitcher가 M3 문서에서 설명하는 `PATCH /user/preferences` API를 호출하는지 확인
- **작업:**
  - [ ] RoleSwitcher.tsx 코드 검토
  - [ ] API 호출 코드 확인 (`PATCH /user/preferences`)
  - [ ] AuthContext updateUser() 호출 확인
  - [ ] 분석 이벤트 전송 확인 (`trackRoleSwitch`)
  - [ ] 미구현 시: API 연동 추가
- **파일:**
  - `apps/main-site/src/components/blocks/RoleSwitcher.tsx`
  - `apps/api-server/src/routes/user.ts` (API 엔드포인트)
- **테스트:**
  - 역할 전환 시 Network 탭에서 API 호출 확인
  - 역할 전환 후 새로고침 시 변경된 역할 유지 확인
- **우선순위**: 높음 (기능 완성도)

#### H2-2-6: 분석 이벤트 통합
- **목표**: Header/Navigation에서 역할 관련 분석 이벤트 전송
- **작업:**
  - [ ] Navigation.tsx에 `trackRoleMenuLoaded()` 추가
  - [ ] AccountModule에 `trackRoleMenuInteraction()` 추가 (필요 시)
  - [ ] RoleSwitcher에 `trackRoleSwitch()` 추가 (미구현 시)
  - [ ] 이벤트 전송 확인 (개발 환경 콘솔 로그)
- **파일:**
  - `apps/main-site/src/components/blocks/Navigation.tsx`
  - `apps/main-site/src/components/blocks/AccountModule.tsx`
  - `apps/main-site/src/components/blocks/RoleSwitcher.tsx`
  - `apps/main-site/src/utils/analytics.ts`
- **테스트:**
  - 역할 전환 시 `role_switched` 이벤트 전송 확인
  - 메뉴 로드 시 `role_menu_loaded` 이벤트 전송 확인
- **우선순위**: 낮음 (분석 기능)

### H2-3: 역할별 대시보드 진입 개선 (후속 Phase)

#### H2-3-1: Dashboard Entry 경로 통일
- **목표**: M3 문서의 `/seller`, `/supplier` 경로와 현재 `/dashboard/seller`, `/dashboard/supplier` 경로 통일
- **작업:**
  - [ ] 현재 라우팅 구조 분석
  - [ ] 경로 변경 영향 분석 (링크, 리디렉션, SEO)
  - [ ] 최종 경로 결정 (M3 사양 따르거나, 현재 구조 유지)
  - [ ] 라우팅 업데이트
  - [ ] 모든 링크 업데이트 (AccountModule, RoleSwitcher, Navigation)
- **파일:**
  - `apps/main-site/src/App.tsx` (라우팅)
  - `apps/main-site/src/components/blocks/RoleSwitcher.tsx`
  - `apps/main-site/src/components/blocks/AccountModule.tsx`
- **우선순위**: 중간 (일관성)

#### H2-3-2: HubLayout과 Template Part Layout 통합
- **목표**: HubLayout과 Layout.tsx의 이원화 문제 해결
- **작업:**
  - [ ] HubLayout의 역할: 역할별 배너, 개인화 슬롯, 분석 이벤트
  - [ ] Layout.tsx의 역할: Template Part 렌더링
  - [ ] 통합 방안 1: Layout.tsx가 HubLayout 기능 흡수
  - [ ] 통합 방안 2: HubLayout이 Layout.tsx를 래핑
  - [ ] 통합 방안 3: 두 레이아웃 공존 (페이지별 선택)
  - [ ] 최종 아키텍처 결정
  - [ ] 구현 및 리팩토링
- **파일:**
  - `apps/main-site/src/components/layout/Layout.tsx`
  - `apps/main-site/src/components/layout/HubLayout.tsx`
  - `apps/main-site/src/components/dashboard/*/Layout.tsx`
- **우선순위**: 낮음 (아키텍처 개선, 선택 사항)

#### H2-3-3: Dashboard Layout에 HubLayout 적용 (선택 사항)
- **목표**: SellerLayout, SupplierLayout, PartnerLayout이 HubLayout 기능 활용
- **작업:**
  - [ ] SellerLayout을 HubLayout으로 래핑
  - [ ] SupplierLayout을 HubLayout으로 래핑
  - [ ] PartnerLayout을 HubLayout으로 래핑
  - [ ] 역할별 배너 표시 확인
  - [ ] 개인화 슬롯 표시 확인 (M4)
  - [ ] 분석 이벤트 전송 확인
- **파일:**
  - `apps/main-site/src/components/dashboard/seller/SellerLayout.tsx`
  - `apps/main-site/src/components/dashboard/supplier/SupplierLayout.tsx`
  - `apps/main-site/src/components/dashboard/partner/PartnerLayout.tsx`
- **테스트:**
  - 각 역할 Dashboard 페이지 접속
  - 역할별 배너 표시 확인
  - 개인화 슬롯 표시 확인
- **우선순위**: 낮음 (선택 사항, M4 통합)

#### H2-3-4: config/roles/dashboards.ts 통합 확인
- **목표**: Dashboard Layout이 config/roles/dashboards.ts 카드 설정을 사용하는지 확인
- **작업:**
  - [ ] SellerLayout의 RoleDashboardMenu 항목과 dashboards.ts 비교
  - [ ] SupplierLayout의 RoleDashboardMenu 항목과 dashboards.ts 비교
  - [ ] PartnerLayout의 RoleDashboardMenu 항목과 dashboards.ts 비교
  - [ ] 불일치 시: dashboards.ts 사용하도록 리팩토링
  - [ ] 일치 시: dashboards.ts가 단순히 문서용인지 확인
- **파일:**
  - `apps/main-site/src/config/roles/dashboards.ts`
  - `apps/main-site/src/components/dashboard/*/Layout.tsx`
- **우선순위**: 낮음 (일관성, 선택 사항)

### H2-4: Affiliate 역할 구현 (선택 사항, 낮은 우선순위)

#### H2-4-1: Affiliate 역할 페이지 및 라우팅 구현
- **목표**: M3 문서에 명시된 Affiliate 역할 구현 (현재 Partner로 대체된 것으로 보임)
- **작업:**
  - [ ] 비즈니스 요구사항 확인 (Affiliate vs Partner 역할 구분)
  - [ ] Affiliate 역할이 필요한지 사용자/PM과 확인
  - [ ] 필요 시: AffiliateHub.tsx 페이지 생성
  - [ ] 필요 시: AffiliateLayout.tsx 생성
  - [ ] 필요 시: `/affiliate` 라우팅 추가
  - [ ] 필요 시: config/roles/menus.ts Affiliate 메뉴 활성화
  - [ ] 불필요 시: M3 문서 업데이트 (Affiliate → Partner)
- **파일:**
  - `apps/main-site/src/pages/hubs/AffiliateHub.tsx` (생성)
  - `apps/main-site/src/components/dashboard/affiliate/AffiliateLayout.tsx` (생성)
  - `apps/main-site/src/App.tsx` (라우팅)
  - `docs/development/specialized/role-based-navigation.md` (문서 업데이트)
- **우선순위**: 낮음 (비즈니스 요구사항 확인 필요)

---

## 6. 리스크 및 고려사항

### 6.1 리스크

1. **Template Part Priority 충돌 (O1)**
   - **리스크**: "Main Header" (priority 0)와 "Shop Header" (priority 100) 충돌로 인해 잘못된 헤더 표시
   - **영향**: Header 리팩토링 작업이 충돌하는 헤더에서 테스트되어 혼란 발생 가능
   - **해결**: O1 Phase에서 Main Header priority를 101로 업데이트 후 H2 작업 진행
   - **참고**: H1-Full-Header-Investigation.md

2. **역할 메뉴 설정 미사용**
   - **리스크**: config/roles/menus.ts가 실제로 사용되지 않아, 설정 변경이 UI에 반영되지 않음
   - **영향**: 역할별 메뉴 커스터마이징 불가
   - **해결**: H2-2-2에서 Navigation에 역할 메뉴 통합

3. **HubLayout과 Layout.tsx 이원화**
   - **리스크**: 두 가지 레이아웃 시스템 공존으로 인한 코드 복잡도 증가
   - **영향**: 유지보수 어려움, 일관성 없는 UX
   - **해결**: H2-3-2에서 통합 방안 결정

4. **Affiliate vs Partner 역할 불일치**
   - **리스크**: M3 문서에는 Affiliate, 실제 코드에는 Partner 역할 존재
   - **영향**: 문서와 코드 불일치, 혼란 발생
   - **해결**: 비즈니스 요구사항 확인 후 통일 (H2-4-1)

5. **Navbar.tsx 중복 코드**
   - **리스크**: Navbar.tsx가 사용되지 않는다면 불필요한 코드 유지
   - **영향**: 코드베이스 복잡도 증가
   - **해결**: H2-2-1에서 사용 여부 확인 후 제거

### 6.2 고려사항

1. **하위 호환성**
   - Dashboard Entry 경로 변경 시 기존 북마크, 외부 링크 영향
   - 리디렉션 규칙 추가 필요

2. **SEO 영향**
   - 경로 변경 시 SEO 영향 분석 필요
   - 301 리디렉션 설정

3. **사용자 경험**
   - RoleSwitcher 위치 변경 시 사용자 혼란 최소화
   - A/B 테스트 또는 사용자 피드백 수집

4. **성능**
   - 역할별 메뉴 필터링 로직이 성능에 미치는 영향 최소화
   - 메모이제이션 고려

5. **테스트 커버리지**
   - 역할별 UI 변경에 대한 E2E 테스트 추가
   - 각 역할로 로그인하여 헤더/메뉴 확인

---

## 7. 다음 Phase와의 연결

### 7.1 선행 Phase

- **O1: Main Header Priority 수정** (H1-Full에서 발견한 이슈)
  - H2 작업 전에 O1 완료 권장
  - Template Part "Main Header" priority를 0 → 101로 업데이트
  - H2 작업 시 올바른 헤더에서 테스트 가능

### 7.2 후속 Phase

- **H3: 모바일 헤더/네비게이션 개선**
  - ResponsiveHeader 개선
  - 모바일 햄버거 메뉴에 역할별 메뉴 적용
  - RoleSwitcher 모바일 UX 개선

- **H4: 헤더 성능 최적화**
  - Template Part 로딩 최적화
  - 메뉴 데이터 캐싱
  - 분석 이벤트 배치 처리

- **M5: 역할 기반 개인화 고도화**
  - M4 개인화 슬롯 확장
  - 사용자 행동 기반 메뉴 추천
  - 역할별 알림 우선순위

---

## 8. 작업 우선순위

### 우선순위 1 (높음) - 필수 기능
- H2-2-1: Navbar.tsx 사용 여부 확인 및 정리
- H2-2-2: Navigation에 역할 기반 메뉴 필터링 추가
- H2-2-5: RoleSwitcher API 연동 확인

### 우선순위 2 (중간) - UX 개선
- H2-2-3: AccountModule Dropdown 역할별 차별화
- H2-3-1: Dashboard Entry 경로 통일

### 우선순위 3 (낮음) - 선택 사항
- H2-2-4: RoleSwitcher UX 개선
- H2-2-6: 분석 이벤트 통합
- H2-3-2: HubLayout과 Template Part Layout 통합
- H2-3-3: Dashboard Layout에 HubLayout 적용
- H2-3-4: config/roles/dashboards.ts 통합 확인
- H2-4-1: Affiliate 역할 구현

---

## 9. 제약사항

### 9.1 H2 Phase에서 수정하지 않음

- ❌ Template Part DB 설정 (O1 Phase에서 처리)
- ❌ Admin Dashboard 헤더/메뉴 (별도 앱, 별도 Phase)
- ❌ API 서버 역할 권한 검증 로직 (이미 구현됨)
- ❌ Settlement, App Market, Dropshipping 기능 (별도 Phase)
- ❌ M4 개인화 슬롯 로직 (이미 구현됨, HubLayout에서 사용)

### 9.2 코드 수정 범위

**수정 허용:**
- `apps/main-site/src/components/blocks/AccountModule.tsx`
- `apps/main-site/src/components/blocks/Navigation.tsx`
- `apps/main-site/src/components/blocks/RoleSwitcher.tsx`
- `apps/main-site/src/components/layout/Navbar.tsx` (삭제 가능)
- `apps/main-site/src/components/dashboard/*/Layout.tsx` (선택 사항)
- `apps/main-site/src/config/roles/*.ts` (설정 파일)
- `apps/main-site/src/utils/analytics.ts` (분석 이벤트)

**수정 금지:**
- `apps/api-server/**` (API 서버)
- `apps/admin-dashboard/**` (Admin 앱)
- `packages/**` (공유 패키지)
- Template Part DB 데이터 (O1 Phase)

---

## 10. 성공 기준

### 10.1 기능적 성공 기준

- [ ] Navigation이 사용자 역할에 따라 다른 메뉴 항목 표시
- [ ] AccountModule Dropdown이 역할별로 다른 항목 표시
- [ ] RoleSwitcher가 복수 역할 사용자에게만 표시
- [ ] 역할 전환 시 Header/Navigation UI 자동 업데이트
- [ ] Guest 사용자에게 기본 메뉴 표시
- [ ] config/roles/menus.ts 설정 변경이 UI에 반영됨

### 10.2 기술적 성공 기준

- [ ] TypeScript 타입 체크 통과
- [ ] Build 성공
- [ ] Navbar.tsx 중복 코드 제거 (미사용 시)
- [ ] 분석 이벤트 정상 전송 (role_menu_loaded, role_switched)
- [ ] 성능 저하 없음 (역할 필터링 로직)

### 10.3 UX 성공 기준

- [ ] 각 역할로 로그인 시 해당 역할에 맞는 메뉴 표시
- [ ] 역할 전환 시 페이지 리로드 없이 UI 업데이트
- [ ] RoleSwitcher UX 직관적 (사용자 피드백 기반)
- [ ] 모바일에서도 정상 작동

---

## 11. 참고 문서

- `docs/development/specialized/role-based-navigation.md` - M3 역할 기반 네비게이션
- `docs/guides/roles/role-personalization.md` - 역할 기반 개인화 시스템
- `docs/guides/roles/menu-role-application.md` - 메뉴에 역할 적용 방법
- `docs/dev/H1-Full-Header-Investigation.md` - 헤더 전면 조사 리포트
- `apps/main-site/src/config/roles/menus.ts` - 역할별 메뉴 설정
- `apps/main-site/src/config/roles/dashboards.ts` - 역할별 대시보드 설정
- `apps/main-site/src/config/roles/banners.ts` - 역할별 배너 설정

---

**작성자**: Claude Code
**검토자**: [사용자 검토 필요]
**승인자**: [사용자 승인 필요]
