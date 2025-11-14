# Dashboard vs Profile 페이지 구조 연구

## 🔍 조사 목적
드랍쉬핑 플랫폼에서 대시보드(Dashboard)와 프로필/설정(Profile/Settings) 페이지를 별도로 구분하는지, 아니면 통합하는지 조사

---

## 📊 주요 플랫폼 분석

### 1. Shopify (판매자)

**구조: 완전 분리**

```
┌─────────────────────────────────────┐
│  [Logo]              [🔔] [⚙️] [👤] │ ← 헤더
├─────────────────────────────────────┤
│  📊 Dashboard (메인)                 │
│    - 매출 통계                       │
│    - 주문 현황                       │
│    - 재고 알림                       │
│    - 빠른 실행                       │
│                                     │
│  ⚙️ Settings (좌측 하단 메뉴)        │
│    - Store Details                  │
│    - Payments                       │
│    - Checkout                       │
│    - Shipping & Taxes               │
│                                     │
│  👤 Profile (우상단 아이콘)          │
│    - Account Info                   │
│    - Password                       │
│    - Notifications                  │
└─────────────────────────────────────┘
```

**핵심 포인트:**
- Dashboard = 운영 중심 (매출, 주문, 재고)
- Settings = 스토어 설정 (결제, 배송, 세금)
- Profile = 개인 계정 관리

---

### 2. Amazon Seller Central (판매자)

**구조: 완전 분리**

```
┌─────────────────────────────────────┐
│  [Amazon]    🔍 Search    [📬] [⚙️]  │ ← 헤더
├─────────────────────────────────────┤
│  📊 Dashboard (메인)                 │
│    - Sales Overview                 │
│    - Performance Metrics            │
│    - Inventory Health               │
│    - Orders to Fulfill              │
│                                     │
│  ⚙️ Settings (우상단 톱니바퀴)        │
│    - Account Info                   │
│    - Notification Preferences       │
│    - Login Settings                 │
│    - User Permissions               │
│    - Return Settings                │
└─────────────────────────────────────┘
```

**핵심 포인트:**
- Dashboard = 판매 성과와 즉시 처리 필요 사항
- Settings = 계정/알림/권한 관리 (우상단 별도 아이콘)

---

### 3. Alibaba (공급자)

**구조: 완전 분리**

```
┌─────────────────────────────────────┐
│  My Alibaba Workbench (대시보드)      │
│    - 주문 관리                       │
│    - 상품 관리                       │
│    - 메시지 관리                     │
│    - 성과 분석                       │
│                                     │
│  Account Settings (별도 섹션)        │
│    ├─ Personal Information          │
│    ├─ Account Security              │
│    ├─ Finance Account               │
│    └─ Sub-account Management        │
└─────────────────────────────────────┘
```

**핵심 포인트:**
- Workbench = 비즈니스 운영 중심
- Settings = 계정/보안/재무 관리

---

### 4. Shopify Customer Accounts (고객)

**구조: 탭 기반 통합 (하지만 기능적으로 분리)**

```
┌─────────────────────────────────────┐
│  My Account                         │
│  [Overview] [Orders] [Profile] [Addresses] [Payment]
│                                     │
│  Overview Tab:                      │
│    - 최근 주문                       │
│    - 위시리스트                      │
│    - 리워드 포인트                   │
│                                     │
│  Profile Tab:                       │
│    - First/Last Name                │
│    - Email                          │
│    - Password Change                │
│    - Notification Settings          │
└─────────────────────────────────────┘
```

**핵심 포인트:**
- 고객 계정은 상대적으로 단순하므로 탭으로 통합 가능
- 하지만 기능은 여전히 분리: Overview(대시보드) vs Profile(설정)

---

## 🎯 결론 및 권장사항

### ✅ **대시보드와 프로필은 별도 페이지로 분리해야 함**

**이유:**

1. **목적의 차이**
   - Dashboard: "무엇을 해야 하나?" (액션 중심)
   - Profile: "계정을 어떻게 관리하나?" (설정 중심)

2. **사용 빈도 차이**
   - Dashboard: 매일 접속 (성과 확인, 주문 처리)
   - Profile: 가끔 접속 (비밀번호 변경, 알림 설정)

3. **정보 과부하 방지**
   - 한 페이지에 모든 것을 넣으면 너무 복잡함
   - 사용자는 "지금 뭘 해야 하는지" 빠르게 파악해야 함

---

## 📋 각 역할별 권장 구조

### 🛍️ Customer (고객)

**Option 1: 단순 탭 구조** (추천)
```
/my-account
  ├─ [대시보드 탭] - 주문, 위시리스트, 포인트
  ├─ [주문내역 탭]
  ├─ [프로필 탭] - 개인정보 수정
  └─ [설정 탭] - 배송지, 결제수단
```

**Option 2: 별도 페이지 구조**
```
/my-account (대시보드 메인)
/my-account/profile (프로필 수정)
/my-account/orders (주문 내역)
/my-account/settings (계정 설정)
```

**추천:** Option 1 (고객은 기능이 적어서 탭으로 충분)

---

### 🏪 Seller (판매자)

**별도 페이지 필수** (복잡한 기능)

```
/seller/dashboard           (메인 대시보드)
  - 매출 통계
  - 주문 현황
  - 인기 상품
  - 빠른 실행

/seller/profile            (프로필 관리)
  - 개인정보
  - 비밀번호 변경
  - 사업자 정보

/seller/settings           (스토어 설정)
  - 정산 계좌
  - 알림 설정
  - 배송 정책
  - 반품 정책
```

---

### 🏭 Supplier (공급자)

**별도 페이지 필수**

```
/supplier/dashboard         (메인 대시보드)
  - 제품 승인 현황
  - 주문 처리 대기
  - 매출 통계
  - 재고 알림

/supplier/profile          (프로필 관리)
  - 개인정보
  - 비밀번호 변경
  - 회사 정보

/supplier/settings         (계정 설정)
  - 정산 계좌
  - 알림 설정
  - 배송 정책
  - Sub-account 관리
```

---

### 🤝 Partner (파트너)

**별도 페이지 필수**

```
/partner/dashboard          (메인 대시보드)
  - 커미션 통계
  - 링크 성과
  - 클릭/전환율
  - 정산 현황

/partner/profile           (프로필 관리)
  - 개인정보
  - 비밀번호 변경

/partner/settings          (계정 설정)
  - 정산 계좌
  - 알림 설정
  - API 키 관리
```

---

## 🗂️ Navigation 구조 제안

### Header Navigation (모든 역할 공통)

```jsx
┌────────────────────────────────────────────────┐
│  [Logo]  [메뉴들...]        [🔔] [⚙️] [👤]      │
└────────────────────────────────────────────────┘
                                  │    │    └─ Profile Dropdown
                                  │    │         ├─ My Profile
                                  │    │         ├─ Account Settings
                                  │    │         ├─ Logout
                                  │    │
                                  │    └─ Settings (역할별)
                                  │         ├─ Store Settings (Seller)
                                  │         ├─ Payment Settings
                                  │         ├─ Notification Settings
                                  │
                                  └─ Notifications
```

### Sidebar Navigation (판매자/공급자/파트너)

```
📊 대시보드 (/)
📦 제품 관리
📋 주문 관리
📈 분석
💰 정산
───────────────
⚙️ 설정
👤 프로필
```

---

## 🎨 UI/UX 모범 사례

### 1. 대시보드 페이지

**필수 요소:**
- ✅ KPI 카드 (매출, 주문, 전환율 등)
- ✅ 최근 활동 (주문, 메시지, 알림)
- ✅ 빠른 실행 버튼
- ✅ 중요 알림 배너
- ✅ 기간 필터 (7일/30일/90일/1년)

**예시:**
```jsx
<Dashboard>
  <KPICards />           {/* 상단 통계 */}
  <AlertBanners />       {/* 긴급 알림 */}
  <QuickActions />       {/* 빠른 실행 */}
  <RecentActivity />     {/* 최근 활동 */}
  <PerformanceChart />   {/* 성과 차트 */}
</Dashboard>
```

### 2. 프로필 페이지

**필수 요소:**
- ✅ 개인정보 폼
- ✅ 프로필 이미지 업로드
- ✅ 비밀번호 변경 버튼
- ✅ 저장/취소 버튼

**예시:**
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

### 3. 설정 페이지

**필수 요소:**
- ✅ 탭 또는 아코디언 네비게이션
- ✅ 그룹화된 설정 항목
- ✅ 토글/체크박스 (on/off 설정)
- ✅ 저장 버튼

**예시:**
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

---

## 📱 모바일 고려사항

### 모바일에서는 더욱 분리가 중요

```
모바일 화면은 작음 → 한 페이지에 너무 많은 정보 X

✅ 대시보드 = 메인 화면 (자주 보는 정보)
✅ 프로필/설정 = 햄버거 메뉴 → 별도 페이지
```

---

## 🚀 구현 우선순위

### Phase 1: 최소 구현 (MVP)
1. ✅ 각 역할별 대시보드 페이지 (이미 완료)
2. ⏳ 프로필 페이지 (단일 페이지, 모든 역할 공통)
3. ⏳ 기본 설정 페이지 (알림 설정만)

### Phase 2: 기능 확장
4. 역할별 설정 페이지 분리
   - Seller Settings (스토어, 배송, 정산)
   - Supplier Settings (회사정보, Sub-account)
   - Partner Settings (API 키, 마케팅 도구)

### Phase 3: 고급 기능
5. Sub-account 관리 (Supplier, Seller)
6. 2FA 설정
7. Activity Log (로그인 기록, 변경 이력)

---

## 💡 최종 결론

### ✅ YES - 별도 페이지로 만들어야 함

**이유:**
1. 모든 주요 드랍쉬핑 플랫폼이 분리
2. 사용 목적과 빈도가 다름
3. 정보 과부하 방지
4. 모바일 UX 향상

**예외:**
- 고객(Customer)의 경우, 기능이 단순하므로 **탭 기반 통합**도 가능
- 하지만 기능적으로는 여전히 분리 (Overview 탭 vs Profile 탭)

---

## 📚 참고 자료

### 조사한 플랫폼
- Shopify Seller Admin
- Amazon Seller Central
- Alibaba Supplier Portal (1688)
- Shopify Customer Accounts
- Baymard Institute UX Research

### 핵심 UX 원칙
> "Users are typically better off with a few somewhat long account pages rather than a deep multilayer navigation hierarchy"
> - Baymard Institute

> "Most users navigating to account pages should be considered novice first-time users, as they will likely have forgotten the navigational structure between visits"
> - Baymard Institute

---

*작성일: 2025-11-14*
*기반: 주요 드랍쉬핑 플랫폼 UX 조사*
