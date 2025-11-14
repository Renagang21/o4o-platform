# 네비게이션 및 URL 구조 가이드

## 📋 목차

1. [헤더 모듈과 네비게이션](#헤더-모듈과-네비게이션)
2. [URL 구조 및 Slug 패턴](#url-구조-및-slug-패턴)
3. [역할별 페이지 구조](#역할별-페이지-구조)
4. [Dashboard vs Profile 분리](#dashboard-vs-profile-분리)
5. [페이지 생성 가이드](#페이지-생성-가이드)
6. [주요 플랫폼 조사 결과](#주요-플랫폼-조사-결과)

---

## 🧭 헤더 모듈과 네비게이션

### 헤더에서 사용 가능한 모듈

현재 구현된 헤더 모듈들:

1. **AccountModule** - 사용자 계정 드롭다운
2. **CartModule** - 장바구니
3. **RoleSwitcher** - 역할 전환기 (복수 역할 보유 시)

---

### 1. AccountModule (사용자 계정)

**위치:** `apps/main-site/src/components/blocks/AccountModule.tsx`

#### 📍 미인증 사용자

```
┌─────────────┐
│  👤 로그인   │  → /login
└─────────────┘
```

#### 📍 인증된 사용자

```
┌──────────────────────────────┐
│  👤 [사용자 아바타/이름]       │ ← 클릭
└──────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ 홍길동                        │
│ hong@example.com             │
├──────────────────────────────┤
│ 👤 프로필          /my-account          │
│ 📦 주문 내역       /my-account/orders   │
│ ❤️ 위시리스트      /my-account/wishlist │
│ 🔔 알림           /my-account/notifications │
│ ⚙️ 설정           /my-account/settings │
│ ❓ 고객지원        /support            │
├──────────────────────────────┤
│ 🚪 로그아웃                   │
└──────────────────────────────┘
```

#### 설정 가능 옵션

```typescript
{
  showAvatar?: boolean;         // 아바타 표시 여부
  showName?: boolean;           // 이름 표시 여부
  avatarSize?: number;          // 아바타 크기 (기본: 32px)
  dropdownAlignment?: 'left' | 'right';  // 드롭다운 정렬
  loginUrl?: string;            // 로그인 페이지 URL (기본: /login)
  accountUrl?: string;          // 계정 메인 URL (기본: /my-account)
}
```

---

### 2. RoleSwitcher (역할 전환기)

**위치:** `apps/main-site/src/components/blocks/RoleSwitcher.tsx`

#### 조건부 표시

- **표시**: 사용자가 2개 이상의 역할을 가진 경우만
- **숨김**: 단일 역할 사용자

#### 예시

```
┌──────────────────────────────┐
│  🔄 판매자 모드 ▼             │ ← 클릭
└──────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ ✓ 판매자 모드                 │
│   공급자 모드  → /supplier    │
│   파트너 모드  → /partner     │
└──────────────────────────────┘
```

---

## 🔗 URL 구조 및 Slug 패턴

### 업계 표준 분석

주요 이커머스 플랫폼의 URL 패턴 조사:

| 플랫폼 | 계정 메인 | 주문 | 프로필 | 설정 |
|--------|----------|------|--------|------|
| **WooCommerce** | `/my-account` | `/my-account/orders` | `/my-account/edit-account` | `/my-account/edit-address` |
| **Shopify** | `/account` | 탭 방식 | 탭 방식 | 탭 방식 |
| **Magento** | `/customer/account` | `/sales/order/history` | `/customer/account/edit` | `/customer/address` |

**결론:** WooCommerce 스타일의 `/base-url/endpoint` 패턴이 가장 널리 사용됨

---

### 우리 프로젝트 URL 구조

#### 🛍️ Customer (고객)

```
/my-account                      ← 메인 대시보드
/my-account/orders               ← 주문 내역
/my-account/orders/{orderId}     ← 주문 상세
/my-account/wishlist             ← 위시리스트
/my-account/notifications        ← 알림
/my-account/profile              ← 프로필 수정
/my-account/settings             ← 설정
/my-account/addresses            ← 배송지 관리
/my-account/payment-methods      ← 결제 수단
```

#### 🏪 Seller (판매자)

```
/seller                          ← 메인 대시보드 (자동 리다이렉트)
/seller/dashboard                ← 대시보드 (명시적 URL)
/seller/products                 ← 상품 관리
/seller/orders                   ← 주문 관리
/seller/analytics                ← 분석
/seller/settlements              ← 정산
/seller/profile                  ← 프로필 수정
/seller/settings                 ← 설정
/seller/settings/store           ← 스토어 설정
/seller/settings/shipping        ← 배송 설정
/seller/settings/payment         ← 정산 계좌
```

#### 🏭 Supplier (공급자)

```
/supplier                        ← 메인 대시보드
/supplier/dashboard              ← 대시보드
/supplier/products               ← 제품 관리
/supplier/orders                 ← 주문 처리
/supplier/inventory              ← 재고 관리
/supplier/analytics              ← 수익 분석
/supplier/profile                ← 프로필 수정
/supplier/settings               ← 설정
/supplier/settings/company       ← 회사 정보
/supplier/settings/subaccounts   ← Sub-account 관리
```

#### 🤝 Partner (파트너/제휴자)

```
/partner                         ← 메인 대시보드
/partner/dashboard               ← 대시보드
/partner/links                   ← 링크 관리
/partner/links/generate          ← 링크 생성
/partner/analytics               ← 성과 분석
/partner/settlements             ← 정산
/partner/marketing-materials     ← 마케팅 자료
/partner/profile                 ← 프로필 수정
/partner/settings                ← 설정
/partner/settings/api            ← API 키 관리
```

---

## 📱 역할별 페이지 구조

### 🛍️ Customer (고객) - 탭 기반 통합 OK

**이유:** 기능이 비교적 단순하므로 하나의 페이지에서 탭으로 관리 가능

```
Page: /my-account (slug: my-account)

┌─────────────────────────────────────────┐
│  [대시보드] [주문내역] [프로필] [설정]    │ ← 탭 네비게이션
├─────────────────────────────────────────┤
│                                         │
│  [대시보드 탭 내용]                      │
│  - 최근 주문                             │
│  - 위시리스트 요약                       │
│  - 리워드 포인트                         │
│                                         │
└─────────────────────────────────────────┘
```

**Shortcode:** `[user_dashboard]` 또는 `[customer_account]`

**또는 별도 페이지로도 가능:**

```
/my-account           → [user_dashboard]
/my-account/orders    → [user_orders]
/my-account/profile   → [user_profile]
/my-account/settings  → [user_settings]
```

---

### 🏪 Seller / 🏭 Supplier / 🤝 Partner - 별도 페이지 필수

**이유:** 복잡한 비즈니스 기능, 대시보드와 설정의 사용 목적/빈도가 다름

```
┌─────────────────────────────────────────┐
│  Header (로고, 메뉴, AccountModule)      │
├─────────────────────────────────────────┤
│ Sidebar  │  Main Content                │
│          │                              │
│ 📊 대시보드  │  [대시보드 콘텐츠]           │
│ 📦 상품   │  - KPI 카드                  │
│ 📋 주문   │  - 빠른 실행                 │
│ 📈 분석   │  - 최근 활동                 │
│ 💰 정산   │                              │
│ ─────   │                              │
│ ⚙️ 설정   │                              │
│ 👤 프로필  │                              │
└─────────────────────────────────────────┘
```

**페이지별 Shortcode:**

```
/seller/dashboard     → [seller_dashboard]
/seller/profile       → [profile_editor]
/seller/settings      → [seller_settings]

/supplier/dashboard   → [supplier_dashboard]
/supplier/profile     → [profile_editor]
/supplier/settings    → [supplier_settings]

/partner/dashboard    → [partner_dashboard]
/partner/profile      → [profile_editor]
/partner/settings     → [partner_settings]
```

---

## 🔀 Dashboard vs Profile 분리

### ✅ **별도 페이지로 분리 필수**

모든 주요 드랍쉬핑 플랫폼(Shopify, Amazon Seller Central, Alibaba)이 분리 사용

#### 분리 이유

| 항목 | Dashboard | Profile/Settings |
|------|-----------|------------------|
| **목적** | "무엇을 해야 하나?" (액션) | "계정을 어떻게 관리하나?" (설정) |
| **사용 빈도** | 매일 접속 📈 | 가끔 접속 (월 1-2회) ⚙️ |
| **주요 내용** | 매출, 주문, 성과, 알림 | 개인정보, 비밀번호, 알림설정 |
| **사용자 목표** | 빠른 현황 파악 및 처리 | 계정 관리 및 설정 변경 |

---

### 주요 플랫폼 구조 비교

#### 1️⃣ Shopify (판매자)

```
📊 Dashboard (메인)
   ↳ 매출, 주문, 재고, 성과

⚙️ Settings (좌측 하단)
   ↳ Store Details
   ↳ Payments
   ↳ Checkout
   ↳ Shipping & Taxes

👤 Profile (우상단 아이콘)
   ↳ Account Info
   ↳ Password
   ↳ Notifications
```

#### 2️⃣ Amazon Seller Central

```
📊 Dashboard (메인)
   ↳ Sales Overview
   ↳ Performance Metrics
   ↳ Orders to Fulfill

⚙️ Settings (우상단 톱니바퀴)
   ↳ Account Info
   ↳ Notification Preferences
   ↳ User Permissions
   ↳ Return Settings
```

#### 3️⃣ Alibaba (공급자)

```
📊 My Alibaba Workbench
   ↳ 주문 관리
   ↳ 상품 관리
   ↳ 성과 분석

⚙️ Account Settings
   ├─ Personal Information
   ├─ Account Security
   ├─ Finance Account
   └─ Sub-account Management
```

---

## 📄 페이지 생성 가이드

### Step 1: 페이지 목적 파악

먼저 생성하려는 페이지가 어떤 역할인지 결정:

- **Dashboard** → 자주 접속, 현황 확인, 빠른 액션
- **Profile** → 가끔 접속, 개인정보 수정
- **Settings** → 가끔 접속, 비즈니스 설정

---

### Step 2: URL Slug 결정

**고객 (Customer):**
- 단순 기능 → `/my-account` 하나로 탭 구조 가능
- 또는 `/my-account/orders`, `/my-account/profile` 등 분리

**판매자/공급자/파트너:**
- 복잡한 기능 → 별도 페이지 필수
- `/seller/dashboard`, `/seller/profile`, `/seller/settings`

---

### Step 3: Shortcode 선택 또는 생성

#### 기존 Shortcode 활용

```
[user_dashboard]         ← 고객 대시보드
[seller_dashboard]       ← 판매자 대시보드
[supplier_dashboard]     ← 공급자 대시보드
[partner_dashboard]      ← 파트너 대시보드
[profile_editor]         ← 프로필 편집기 (모든 역할 공통)
```

#### 새 Shortcode 생성이 필요한 경우

1. `apps/main-site/src/components/shortcodes/` 에 컴포넌트 생성
2. `dropshippingShortcodes.tsx` 또는 새 파일에 등록
3. 자동 등록 (파일명 → snake_case)

---

### Step 4: Admin에서 페이지 생성

1. **Admin Dashboard** → **Pages** → **Add New**
2. **Title**: 페이지 제목 (예: "Seller Dashboard")
3. **Slug**: URL slug (예: `seller-dashboard`)
4. **Content**: Shortcode 삽입
   ```
   [seller_dashboard]
   ```
5. **Publish**

---

### Step 5: 헤더 모듈 연결

#### AccountModule 드롭다운 링크 수정

현재 AccountModule의 링크들:

```typescript
// apps/main-site/src/components/blocks/AccountModule.tsx

<Link to={accountUrl}>프로필</Link>                    // /my-account
<Link to={`${accountUrl}/orders`}>주문 내역</Link>     // /my-account/orders
<Link to={`${accountUrl}/wishlist`}>위시리스트</Link>  // /my-account/wishlist
<Link to={`${accountUrl}/settings`}>설정</Link>        // /my-account/settings
```

**역할별 동적 링크로 개선 필요:**

```typescript
// 사용자 역할에 따라 다른 URL로 이동
const getDashboardUrl = (role: string) => {
  switch(role) {
    case 'seller': return '/seller/dashboard';
    case 'supplier': return '/supplier/dashboard';
    case 'partner': return '/partner/dashboard';
    default: return '/my-account';
  }
};
```

---

## 🗂️ 페이지 생성 예시

### 예시 1: 고객 대시보드 (탭 방식)

**페이지 설정:**
- Title: "My Account"
- Slug: `my-account`
- Content:
  ```
  [user_dashboard]
  ```

**생성되는 URL:** `https://neture.co.kr/my-account`

**헤더 AccountModule 클릭 시 이동:** `/my-account`

---

### 예시 2: 판매자 대시보드

**페이지 설정:**
- Title: "Seller Dashboard"
- Slug: `seller-dashboard` (또는 `seller`)
- Content:
  ```
  [seller_dashboard]
  ```

**생성되는 URL:** `https://neture.co.kr/seller` 또는 `/seller-dashboard`

**RoleSwitcher에서 "판매자 모드" 선택 시 이동**

---

### 예시 3: 판매자 프로필 수정

**페이지 설정:**
- Title: "Seller Profile"
- Slug: `seller-profile`
- Content:
  ```
  [profile_editor role="seller"]
  ```

**생성되는 URL:** `https://neture.co.kr/seller-profile`

**헤더 AccountModule → "프로필" 클릭 시 이동** (역할이 seller인 경우)

---

### 예시 4: 판매자 설정

**페이지 설정:**
- Title: "Seller Settings"
- Slug: `seller-settings`
- Content:
  ```
  [seller_settings]
  ```

**생성되는 URL:** `https://neture.co.kr/seller-settings`

**Sidebar 메뉴 → "설정" 클릭 시 이동**

---

## 🎯 구현 우선순위

### Phase 1: 필수 페이지 (현재)

✅ 이미 구현 완료:
- [x] Customer Dashboard (`[user_dashboard]`)
- [x] Seller Dashboard (`[seller_dashboard]`)
- [x] Supplier Dashboard (`[supplier_dashboard]`)
- [x] Partner Dashboard (`[partner_dashboard]`)

⏳ 다음 단계:
- [ ] Profile Editor (모든 역할 공통)
- [ ] Settings Page (역할별)

---

### Phase 2: 역할별 상세 페이지

**Seller:**
- [ ] `/seller/products` - 상품 관리
- [ ] `/seller/orders` - 주문 관리
- [ ] `/seller/analytics` - 분석
- [ ] `/seller/settlements` - 정산

**Supplier:**
- [ ] `/supplier/products` - 제품 관리
- [ ] `/supplier/orders` - 주문 처리
- [ ] `/supplier/inventory` - 재고 관리

**Partner:**
- [ ] `/partner/links` - 링크 관리
- [ ] `/partner/analytics` - 성과 분석
- [ ] `/partner/marketing-materials` - 마케팅 자료

---

### Phase 3: 고급 기능

- [ ] Sub-account 관리 (Supplier, Seller)
- [ ] 2FA 설정
- [ ] Activity Log (로그인 기록, 변경 이력)
- [ ] API Key 관리 (Partner)

---

## 📊 URL Slug 네이밍 컨벤션

### 기본 원칙

1. **소문자 + 하이픈** (`kebab-case`)
   - ✅ `my-account`, `seller-dashboard`
   - ❌ `MyAccount`, `seller_dashboard`

2. **명확하고 간결하게**
   - ✅ `/seller/products`
   - ❌ `/seller/manage-all-products-list`

3. **복수형 사용** (목록/컬렉션인 경우)
   - ✅ `/orders`, `/products`, `/addresses`
   - ❌ `/order`, `/product`, `/address`

4. **액션은 동사 사용**
   - ✅ `/seller/products/create`
   - ✅ `/partner/links/generate`

5. **역할 prefix 일관성**
   - ✅ `/seller/...`, `/supplier/...`, `/partner/...`
   - ❌ `/sellers/...`, `/sell/...`

---

## 🔍 주요 플랫폼 조사 결과

### 헤더 네비게이션 패턴

#### "My Account" 드롭다운 위치

**업계 표준:**
- **거의 모든 이커머스**가 헤더 우측 상단에 배치
- 아이콘: 사용자 아이콘 (👤) 또는 아바타
- 미인증 시: "로그인" 또는 "Sign In" 링크

**Baymard Institute UX 연구:**
> "The 'My Account' drop-down is nearly always placed in the main navigation and is by now an e-commerce convention."

> "Users' first step on a site where they're trying to track an order, initiate a return, update a payment method... is often to immediately go to the 'My Account' drop-down — sometimes before the homepage has even finished loading."

---

### WooCommerce Endpoint 시스템

WooCommerce는 `/my-account` 페이지에 **endpoint**를 추가하는 방식:

```
Base: /my-account

Endpoints:
- dashboard        → /my-account/dashboard
- orders           → /my-account/orders
- view-order       → /my-account/view-order/{order-id}
- downloads        → /my-account/downloads
- edit-address     → /my-account/edit-address
- payment-methods  → /my-account/payment-methods
- edit-account     → /my-account/edit-account
- customer-logout  → /my-account/customer-logout
```

**장점:**
- 명확한 URL 구조
- SEO 친화적
- 북마크 가능
- 직접 접근 가능

---

### Shopify Customer Accounts

Shopify는 **메인 페이지**(`/account`)에서 **탭 방식**으로 관리:

```
/account  (메인)
  ├─ [Overview 탭]
  ├─ [Orders 탭]
  ├─ [Profile 탭]
  └─ [Addresses 탭]
```

**특징:**
- URL은 `/account` 하나만
- 탭 전환 시 URL 변경 없음 (SPA 방식)
- 단순한 고객 계정에 적합

**확장 기능:**
- Full-page extensions로 별도 페이지 추가 가능
- `customer-account.page.render` 사용

---

### Amazon Seller Central

**헤더 구조:**

```
┌──────────────────────────────────────────────────┐
│ [로고] [검색] [알림] [메시지] [도움말] [⚙️설정]  │
└──────────────────────────────────────────────────┘
```

**Settings 접근:**
1. 우상단 톱니바퀴 아이콘 클릭
2. "Account Info" 선택

**Settings 메뉴:**
- Account Info
- Notification Preferences
- Login Settings
- User Permissions
- Return Settings
- Gift Options

---

### Alibaba Supplier Portal

**구조:**

```
My Alibaba Workbench (대시보드)
  └─ 비즈니스 운영 중심

Account Settings (별도 섹션)
  ├─ Personal Information
  ├─ Account Security
  ├─ Finance Account
  └─ Sub-account Management
```

**특징:**
- 명확한 업무/설정 분리
- Sub-account 지원 (팀 관리)

---

## 💡 UX 모범 사례

### 1. 대시보드 페이지

**필수 요소:**
```jsx
<Dashboard>
  <KPICards />           {/* 상단: 핵심 지표 */}
  <AlertBanners />       {/* 긴급 알림 */}
  <QuickActions />       {/* 빠른 실행 버튼 */}
  <RecentActivity />     {/* 최근 활동 */}
  <PerformanceChart />   {/* 성과 차트 */}
</Dashboard>
```

**디자인 원칙:**
- 가장 중요한 정보를 상단에
- 액션 버튼은 명확하고 크게
- 알림/경고는 눈에 띄게
- 기간 필터 제공 (7일/30일/90일/1년)

---

### 2. 프로필 페이지

**필수 요소:**
```jsx
<Profile>
  <ProfileImageUpload />
  <PersonalInfoForm>
    <Input name="firstName" />
    <Input name="lastName" />
    <Input name="email" />
    <Input name="phone" />
  </PersonalInfoForm>
  <ChangePasswordButton />
  <SaveButton />
</Profile>
```

**디자인 원칙:**
- 단순하고 직관적인 폼
- 실시간 유효성 검사
- 명확한 저장/취소 버튼

---

### 3. 설정 페이지

**필수 요소:**
```jsx
<Settings>
  <Tabs>
    <Tab label="알림">
      <NotificationSettings />
    </Tab>
    <Tab label="정산">
      <PaymentSettings />
    </Tab>
    <Tab label="배송">
      <ShippingSettings />
    </Tab>
  </Tabs>
</Settings>
```

**디자인 원칙:**
- 탭 또는 아코디언으로 그룹화
- 토글/체크박스 (on/off 설정)
- 즉시 저장 vs 명시적 저장 버튼 (일관성 유지)

---

## 📱 모바일 고려사항

### 모바일에서는 더욱 분리가 중요

```
모바일 화면은 작음
  ↓
한 페이지에 너무 많은 정보 X
  ↓
명확한 페이지 분리 필수
```

**권장:**
- ✅ 대시보드 = 메인 화면
- ✅ 프로필/설정 = 햄버거 메뉴 → 별도 페이지
- ✅ 각 페이지는 단일 목적에 집중

---

## 🎨 UI/UX 원칙 (Baymard Institute)

### 핵심 원칙

> "Users are typically better off with a few somewhat long account pages rather than a deep multilayer navigation hierarchy"

**의미:**
- ❌ 여러 단계의 깊은 네비게이션
- ✅ 몇 개의 긴 페이지 (스크롤)

---

> "Most users navigating to account pages should be considered novice first-time users, as they will likely have forgotten the navigational structure between visits"

**의미:**
- 사용자는 구조를 기억하지 못함
- 명확하고 직관적인 레이블 필요
- 일관된 위치와 패턴 유지

---

## 📚 참고 자료

### 조사한 플랫폼
- Shopify Seller Admin
- Shopify Customer Accounts
- Amazon Seller Central
- Alibaba Supplier Portal (1688)
- WooCommerce
- Baymard Institute UX Research

### 관련 문서
- `docs/ROLE_BASED_LANDING_PAGES.md` - 역할별 랜딩 페이지 상세
- `docs/development/specialized/role-based-navigation.md` - 역할 기반 네비게이션
- `docs/HEADER_BUILDER_MODULE_SPECS.md` - 헤더 빌더 모듈 사양
- `apps/main-site/src/components/blocks/AccountModule.tsx` - AccountModule 구현

---

## 🚀 다음 단계

1. **Profile Editor 컴포넌트 구현**
   - [ ] 공통 프로필 편집기 (`[profile_editor]`)
   - [ ] 모든 역할에서 사용 가능
   - [ ] 역할별 추가 필드 지원

2. **Settings 페이지 구현**
   - [ ] 역할별 Settings shortcode
   - [ ] 탭 기반 설정 그룹
   - [ ] 알림/정산/배송 설정

3. **AccountModule 개선**
   - [ ] 역할별 동적 링크
   - [ ] `/seller/profile`, `/supplier/profile` 등
   - [ ] 역할에 따라 다른 메뉴 아이템

4. **페이지 자동 생성 스크립트**
   - [ ] 역할별 필수 페이지 자동 생성
   - [ ] Shortcode 자동 삽입
   - [ ] Slug 자동 설정

---

*작성일: 2025-11-14*
*최종 업데이트: 2025-11-14*
*기반: 주요 드랍쉬핑 플랫폼 UX 조사 + 현재 구현 분석*
