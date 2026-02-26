# IR-GLYCOPHARM-WEB-CURRENT-STATE-AUDIT-PHASE1-V1

> **조사 보고서** — GlycoPharm 웹(약국/약사용) 현재 구현 상태 감사 Phase 1
> 조사일: 2026-02-26 | 코드 수정: 없음

---

## 요약

GlycoPharm 웹 애플리케이션(`services/web-glycopharm`)의 **라우트, 메뉴, 가드, 진입 흐름**을 코드 기준으로 전수 조사하였다.
React Router v6 기반, 13개 라우트 그룹, 7개 레이아웃, 3종 가드 패턴으로 구성되어 있다.

**핵심 파일:**
- 라우트 정의: `src/App.tsx` (546줄)
- 인증 컨텍스트: `src/contexts/AuthContext.tsx` (397줄)
- 역할 가드: `src/components/auth/RoleGuard.tsx` (40줄)
- 역할 라우팅: `src/lib/auth-utils.ts` (22줄)

---

## 1. Routes Tree

### 1.1 Public Routes (`MainLayout`)
> App.tsx:275-322 | 가드 없음

| 경로 | 컴포넌트 | Lazy | 비고 |
|------|----------|------|------|
| `/` | HomeLivePage | ❌ | 랜딩 페이지 |
| `/login` | LoginPage | ❌ | 로그인 |
| `/register` | RegisterPage | ✅ | 회원가입 (약사 등록 포함) |
| `/role-select` | RoleSelectPage | ✅ | 역할 선택 |
| `/forum` | ForumHubPage | ✅ | 포럼 허브 |
| `/forum/posts` | ForumPage | ✅ | 포럼 게시글 |
| `/forum/request-category` | RequestCategoryPage | ✅ | 요청 카테고리 |
| `/forum/my-requests` | MyRequestsPage | ✅ | 내 요청 |
| `/forum/feedback` | ForumFeedbackPage | ✅ | 포럼 피드백 |
| `/forum-ext` | ForumListPage | ✅ | 포럼 확장 리스트 |
| `/forum-ext/:forumId` | ForumFeedPage | ✅ | 포럼 확장 상세 |
| `/education` | EducationPage | ✅ | 교육/자료 |
| `/contact` | ContactPage | ✅ | 문의 |
| `/partners` | PartnerInfoPage | ✅ | 파트너 정보 |
| `/partners/apply` | PartnerApplyPage | ✅ | 파트너 신청 |
| `/apply` | PharmacyApplyPage | ✅ | 약국 참여 신청 |
| `/apply/my-applications` | MyApplicationsPage | ✅ | 내 신청 현황 |
| `/test-center` | TestCenterPage | ✅ | 테스트 센터 |
| `/test-guide` | TestGuidePage | ✅ | 테스트 가이드 홈 |
| `/test-guide/manual/pharmacy` | PharmacyManualPage | ✅ | 약국 매뉴얼 |
| `/test-guide/manual/consumer` | ConsumerManualPage | ✅ | 소비자 매뉴얼 |
| `/test-guide/manual/operator` | OperatorManualPage | ✅ | 운영자 매뉴얼 |
| `/b2b/supply` | SupplyPage | ✅ | B2B 공급 |
| `/signage` | ContentLibraryPage | ✅ | 사이니지 콘텐츠 라이브러리 |
| `/hub` | GlycoPharmHubPage | ✅ | 허브 탐색 |
| `/hub/b2b` | HubB2BCatalogPage | ✅ | 허브 B2B 카탈로그 |
| `/mypage` | MyPage | ✅ | 내 정보 (SoftGuard) |
| `/store` | StoreEntryPage | ✅ | 약국 관리 진입 (SoftGuard, pharmacy) |

### 1.2 Care Routes (`MainLayout` + `SoftGuardOutlet`)
> App.tsx:325-339 | SoftGuard: allowedRoles=['pharmacy']

| 경로 | 컴포넌트 | 비고 |
|------|----------|------|
| `/care` (index) | CareDashboardPage | **약사 기본 대시보드** |
| `/care/patients` | PatientsPage | 환자 리스트 |
| `/care/patients/:id` (index) | SummaryTab | 환자 상세 — 요약 탭 |
| `/care/patients/:id/analysis` | PatientAnalysisTab | 환자 상세 — 분석 탭 |
| `/care/patients/:id/coaching` | PatientCoachingTab | 환자 상세 — 코칭 탭 |
| `/care/patients/:id/history` | HistoryTab | 환자 상세 — 이력 탭 |
| `/care/analysis` | AnalysisPage | 분석 (전체) |
| `/care/coaching` | CoachingPage | 코칭 (전체) |

### 1.3 Service User Routes (Phase 2)
> App.tsx:341-356 | ServiceUserProtectedRoute

| 경로 | 컴포넌트 | 가드 | 비고 |
|------|----------|------|------|
| `/service-login` | ServiceLoginPage | 없음 | OAuth 기반 (Google/Kakao/Naver) |
| `/service` | ServiceDashboardPage | ServiceUserProtected | 소비자 서비스 대시보드 |
| `/service/dashboard` | ServiceDashboardPage | ServiceUserProtected | 동일 |

### 1.4 Supplier Routes (차단됨)
> App.tsx:361-368

| 경로 | 컴포넌트 | 비고 |
|------|----------|------|
| `/supplier` | RoleNotAvailablePage | Neture 관리 — 사용 불가 |
| `/supplier/*` | RoleNotAvailablePage | 전체 catch-all |

### 1.5 Partner Dashboard Routes (`PartnerLayout`)
> App.tsx:371-392 | ProtectedRoute: allowedRoles=['partner']

| 경로 | 컴포넌트 |
|------|----------|
| `/partner` (index) | PartnerIndex |
| `/partner/overview` | PartnerOverviewPage |
| `/partner/targets` | PartnerTargetsPage |
| `/partner/content` | PartnerContentPage |
| `/partner/events` | PartnerEventsPage |
| `/partner/status` | PartnerStatusPage |
| `/partner/signage/library` | ContentLibraryPage |
| `/partner/signage/content` | ContentHubPage |
| `/partner/signage/playlist/:id` | SignagePlaylistDetailPage |
| `/partner/signage/media/:id` | SignageMediaDetailPage |
| `/partner/signage/my` | MySignagePage |
| `/partner/signage/preview` | SignagePreviewPage |

### 1.6 Admin Dashboard Routes (`DashboardLayout` role='admin')
> App.tsx:395-407 | ProtectedRoute: allowedRoles=['admin']

| 경로 | 컴포넌트 |
|------|----------|
| `/admin` (index) | GlycoPharmAdminDashboard |
| `/admin/pharmacies` | PharmaciesPage |
| `/admin/users` | UsersPage |
| `/admin/settings` | SettingsPage |

### 1.7 Operator Dashboard Routes (`DashboardLayout` role='operator')
> App.tsx:410-456 | ProtectedRoute: allowedRoles=['operator']

| 경로 | 컴포넌트 | 비고 |
|------|----------|------|
| `/operator` (index) | GlycoPharmOperatorDashboard | Signal 기반 |
| `/operator/applications` | ApplicationsPage | 신청 관리 |
| `/operator/applications/:id` | ApplicationDetailPage | 신청 상세 |
| `/operator/products` | ProductsPage | 상품 관리 |
| `/operator/orders` | OrdersPage | 주문 관리 |
| `/operator/inventory` | InventoryPage | 재고/공급 |
| `/operator/settlements` | SettlementsPage | 정산 관리 |
| `/operator/analytics` | AnalyticsPage | 분석/리포트 |
| `/operator/reports` | ReportsPage | 청구 리포트 (Phase 3-B) |
| `/operator/billing-preview` | BillingPreviewPage | 청구 미리보기 (Phase 3-C) |
| `/operator/invoices` | InvoicesPage | 인보이스 (Phase 3-D) |
| `/operator/marketing` | MarketingPage | 마케팅 |
| `/operator/forum-requests` | ForumRequestsPage | 포럼 신청 |
| `/operator/forum-management` | OperatorForumManagementPage | 포럼 관리 |
| `/operator/market-trial` | OperatorTrialSelectorPage | Trial 관리 |
| `/operator/store-approvals` | StoreApprovalsPage | 입점 승인 |
| `/operator/store-approvals/:id` | StoreApprovalDetailPage | 입점 상세 |
| `/operator/store-template` | StoreTemplateManagerPage | 스토어 템플릿 |
| `/operator/support` | SupportPage | 고객지원 |
| `/operator/ai-report` | AiReportPage | AI 리포트 |
| `/operator/signage/library` | ContentLibraryPage | 사이니지 |
| `/operator/signage/content` | ContentHubPage | 콘텐츠 허브 |
| `/operator/signage/playlist/:id` | SignagePlaylistDetailPage | |
| `/operator/signage/media/:id` | SignageMediaDetailPage | |
| `/operator/signage/my` | MySignagePage | |
| `/operator/signage/preview` | SignagePreviewPage | |

### 1.8 Consumer Store Routes (`StoreLayout`)
> App.tsx:459-464 | 가드 없음 (공개)

| 경로 | 컴포넌트 |
|------|----------|
| `/store/:pharmacyId` | StoreFront |
| `/store/:pharmacyId/products` | StoreProducts |
| `/store/:pharmacyId/products/:productId` | StoreProductDetail |
| `/store/:pharmacyId/cart` | StoreCart |

### 1.9 Kiosk Store Routes (`KioskLayout`)
> App.tsx:467-472 | 가드 없음 (매장 내)

| 경로 | 컴포넌트 |
|------|----------|
| `/store/:pharmacyId/kiosk` | StoreFront |
| `/store/:pharmacyId/kiosk/products` | StoreProducts |
| `/store/:pharmacyId/kiosk/products/:productId` | StoreProductDetail |
| `/store/:pharmacyId/kiosk/cart` | StoreCart |

### 1.10 Tablet Store Routes (`TabletLayout`)
> App.tsx:475-480 | 가드 없음 (직원 보조)

| 경로 | 컴포넌트 |
|------|----------|
| `/store/:pharmacyId/tablet` | StoreFront |
| `/store/:pharmacyId/tablet/products` | StoreProducts |
| `/store/:pharmacyId/tablet/products/:productId` | StoreProductDetail |
| `/store/:pharmacyId/tablet/cart` | StoreCart |

### 1.11 QR Landing
> App.tsx:482-483 | 가드 없음

| 경로 | 컴포넌트 |
|------|----------|
| `/qr/:pharmacyId` | QrLandingPage |

### 1.12 Store Owner Dashboard (`StoreDashboardLayout`)
> App.tsx:486-524 | ProtectedRoute: allowedRoles=['pharmacy']

| 경로 | 컴포넌트 | 비고 |
|------|----------|------|
| `/store/hub` | StoreOverviewPage | 매장 허브 |
| `/store/identity` | StoreMainPage | 매장 메인 |
| `/store/products` | PharmacyProducts | 상품 관리 |
| `/store/channels` | StorePlaceholderPage | 채널 관리 (Placeholder) |
| `/store/orders` | PharmacyOrders | 주문 관리 |
| `/store/content` | StoreAssetsPage | 콘텐츠 |
| `/store/services` | PharmacyPatients | 고객 관리 |
| `/store/settings` | PharmacySettings | 설정 |
| `/store/apply` | StoreApplyPage | 입점 신청 |
| `/store/billing` | StoreBillingPage | 정산/인보이스 |
| `/store/signage` | SmartDisplayPage | 스마트 디스플레이 (레거시) |
| `/store/signage/playlists` | PlaylistsPage | 재생목록 (레거시) |
| `/store/signage/schedules` | SchedulesPage | 스케줄 (레거시) |
| `/store/signage/media` | MediaLibraryPage | 미디어 (레거시) |
| `/store/signage/forum` | PlaylistForumPage | 포럼 (레거시) |
| `/store/signage/library` | ContentLibraryPage | 콘텐츠 라이브러리 (신규) |
| `/store/signage/playlist/:id` | SignagePlaylistDetailPage | |
| `/store/signage/media/:id` | SignageMediaDetailPage | |
| `/store/signage/my` | MySignagePage | |
| `/store/signage/preview` | SignagePreviewPage | |
| `/store/market-trial` | MarketTrialListPage | 마켓 트라이얼 |
| `/store/b2b-order` | B2BOrderPage | B2B 주문 |
| `/store/requests` | CustomerRequestsPage | 고객 요청 |
| `/store/funnel` | FunnelPage | 전환 퍼널 |
| `/store/management` | PharmacyManagement | 약국 경영 |
| `/store/management/b2b` | PharmacyB2BProducts | B2B 상품 |

### 1.13 Catch-All
> App.tsx:527

| 경로 | 컴포넌트 |
|------|----------|
| `*` | NotFoundPage |

---

## 2. Menu Tree

### 2.1 상단 헤더 (전체 사용자 공통)
> `src/components/common/Header.tsx` | WO-GLYCOPHARM-SOFT-GUARD-INTRO-V1

| # | 라벨 | 아이콘 | 경로 | 비고 |
|---|------|--------|------|------|
| 1 | Home | Home | `/` | |
| 2 | Care 관리 | HeartPulse | `/care` | SoftGuard |
| 3 | 환자관리 | Users | `/care/patients` | SoftGuard |
| 4 | 약국 관리 | Store | `/store` | SoftGuard (pharmacy) |
| 5 | 내정보 | UserCircle | `/mypage` | SoftGuard |

### 2.2 Care 서브 네비게이션
> `src/pages/care/CareSubNav.tsx`

| # | 라벨 | 경로 |
|---|------|------|
| 1 | 대시보드 | `/care` |
| 2 | 환자 관리 | `/care/patients` |
| 3 | 분석 | `/care/analysis` |
| 4 | 코칭 | `/care/coaching` |

### 2.3 Admin 사이드바
> `src/components/layouts/DashboardLayout.tsx:49-58` | role='admin'

| # | 라벨 | 아이콘 | 경로 |
|---|------|--------|------|
| 1 | 대시보드 | LayoutDashboard | `/admin` |
| 2 | 약국 네트워크 | Store | `/admin/pharmacies` |
| 3 | 회원 관리 | Users | `/admin/users` |
| 4 | 설정 | Settings | `/admin/settings` |

### 2.4 Operator 사이드바
> `src/components/layouts/DashboardLayout.tsx:106-131` | role='operator'

| # | 라벨 | 아이콘 | 경로 |
|---|------|--------|------|
| 1 | 대시보드 | LayoutDashboard | `/operator` |
| 2 | 신청 관리 | FileCheck | `/operator/applications` |
| 3 | 상품 관리 | Package | `/operator/products` |
| 4 | 주문 관리 | ShoppingCart | `/operator/orders` |
| 5 | 재고/공급 | Boxes | `/operator/inventory` |
| 6 | 정산 관리 | CreditCard | `/operator/settlements` |
| 7 | 분석/리포트 | BarChart3 | `/operator/analytics` |
| 8 | 청구 리포트 | FileText | `/operator/reports` |
| 9 | 청구 미리보기 | Briefcase | `/operator/billing-preview` |
| 10 | 인보이스 | CreditCard | `/operator/invoices` |
| 11 | 마케팅 | Megaphone | `/operator/marketing` |
| 12 | 포럼 신청 | MessageSquare | `/operator/forum-requests` |
| 13 | 포럼 관리 | FileText | `/operator/forum-management` |
| 14 | Trial 관리 | Tag | `/operator/market-trial` |
| 15 | 콘텐츠 허브 | Monitor | `/operator/signage/content` |
| 16 | 콘텐츠 라이브러리 | Monitor | `/operator/signage/library` |
| 17 | 내 사이니지 | Tv | `/operator/signage/my` |
| 18 | 고객지원 | HelpCircle | `/operator/support` |
| 19 | AI 리포트 | BarChart3 | `/operator/ai-report` |

### 2.5 Pharmacy(Store Owner) 사이드바
> `src/components/layouts/DashboardLayout.tsx:60-79` | role='pharmacy'

| # | 라벨 | 아이콘 | 경로 |
|---|------|--------|------|
| 1 | 대시보드 | LayoutDashboard | `/store` |
| 2 | 매장 메인 | Store | `/store/identity` |
| 3 | B2B 주문 | ShoppingCart | `/store/b2b-order` |
| 4 | 상품 관리 | Package | `/store/products` |
| 5 | 주문 내역 | ShoppingCart | `/store/orders` |
| 6 | 고객 관리 | Users | `/store/services` |
| 7 | 스마트 디스플레이 | Tv | `/store/signage` |
| 8 | 콘텐츠 가져오기 | Monitor | `/store/content` |
| 9 | 콘텐츠 라이브러리 | Monitor | `/store/signage/library` |
| 10 | 내 사이니지 | Tv | `/store/signage/my` |
| 11 | Market Trial | Tag | `/store/market-trial` |
| 12 | 전환 퍼널 | BarChart3 | `/store/funnel` |
| 13 | 약국 경영 | Briefcase | `/store/management` |
| 14 | 설정 | Settings | `/store/settings` |

### 2.6 Partner 사이드바
> `src/components/layouts/PartnerLayout.tsx:36-42`

| # | 라벨 | 아이콘 | 경로 |
|---|------|--------|------|
| 1 | 요약 | LayoutDashboard | `/partner/overview` |
| 2 | 홍보 대상 | Target | `/partner/targets` |
| 3 | 콘텐츠 | FileText | `/partner/content` |
| 4 | 이벤트 조건 | Calendar | `/partner/events` |
| 5 | 상태 | Activity | `/partner/status` |

### 2.7 Consumer Store 카테고리 탭
> `src/components/layouts/StoreLayout.tsx:206-254`

| # | 라벨 | 경로 |
|---|------|------|
| 1 | 홈 | `/store/{pharmacyId}` |
| 2 | 전체상품 | `/store/{pharmacyId}/products` |
| 3 | 연속혈당측정기 | `/store/{pharmacyId}/products?category=cgm` |
| 4 | 건강기능식품 | `/store/{pharmacyId}/products?category=supplement` |
| 5 | 당뇨식품 | `/store/{pharmacyId}/products?category=food` |

### 2.8 Footer
> `src/components/common/Footer.tsx`

| 섹션 | 라벨 | 경로 |
|------|------|------|
| 서비스 | 포럼 | `/forum` |
| 서비스 | 교육/자료 | `/education` |
| 참여하기 | 약국 입점 신청 | `/register` |
| 참여하기 | 제휴/파트너 문의 | `/contact` |
| 고객지원 | 문의하기 | `/contact` |

### 2.9 메뉴에 없는 라우트 (Direct URL Only)

| 경로 | 설명 |
|------|------|
| `/login` | 로그인 (헤더 버튼에서 접근) |
| `/register` | 회원가입 (Footer/링크에서 접근) |
| `/role-select` | 역할 선택 (가입 후 리다이렉트) |
| `/service-login` | 서비스 사용자 로그인 (Phase 2) |
| `/care/patients/:id/*` | 환자 상세 탭들 (리스트에서 클릭) |
| `/operator/applications/:id` | 신청 상세 (리스트에서 클릭) |
| `/operator/store-approvals/:id` | 승인 상세 (리스트에서 클릭) |
| `/store/:pharmacyId/products/:productId` | 상품 상세 (리스트에서 클릭) |
| `/qr/:pharmacyId` | QR 랜딩 (물리 QR에서 접근) |
| `/store/hub` | 매장 허브 (사이드바에 없음) |
| `/store/apply` | 입점 신청 (사이드바에 없음) |
| `/store/billing` | 정산/인보이스 (사이드바에 없음) |
| `/store/channels` | 채널 관리 Placeholder (사이드바에 없음) |
| `/store/requests` | 고객 요청 (사이드바에 없음) |
| `/operator/store-template` | 스토어 템플릿 (사이드바에 없음) |

---

## 3. Guard Tree

### 3.1 Guard 유형별 정리

#### (A) ProtectedRoute (= RoleGuard)
> `src/components/auth/RoleGuard.tsx` | App.tsx에서 `ProtectedRoute`로 alias

**동작:**
1. Loading → 스피너 표시
2. 미인증 → `fallback` 경로로 리다이렉트 (기본: `/login`)
3. 인증 + 역할 불일치 → `/`로 리다이렉트
4. 인증 + 역할 일치 → children 렌더

**적용 대상:**

| 경로 그룹 | allowedRoles |
|-----------|-------------|
| `/admin/*` | `['admin']` |
| `/operator/*` | `['operator']` |
| `/partner/*` | `['partner']` |
| `/store/*` (Owner Dashboard) | `['pharmacy']` |

#### (B) SoftGuard / SoftGuardOutlet
> App.tsx:222-253 | WO-GLYCOPHARM-SOFT-GUARD-INTRO-V1

**동작:**
1. 미인증 → `FeatureIntroPage` 표시 (로그인 리다이렉트 **아님**)
2. 인증 + 역할 불일치 → `/`로 리다이렉트
3. 인증 + 역할 일치 → children/Outlet 렌더

**적용 대상:**

| 경로 | feature | allowedRoles |
|------|---------|-------------|
| `/care/*` | care | `['pharmacy']` |
| `/store` (Entry) | store | `['pharmacy']` |
| `/mypage` | mypage | (없음 — 로그인만 필요) |

**FeatureIntroPage 표시 내용:**

| feature | 타이틀 | 설명 |
|---------|--------|------|
| care | 환자 관리 기능 | 환자 등록·관리, CGM 데이터 분석, 맞춤 코칭·상담, 성과 리포트 |
| store | 약국 운영 관리 | 상품·재고 관리, 주문 처리, 매출 분석, 디지털 사이니지 |
| mypage | 내 정보 | 프로필 관리, 활동 내역, 알림 설정 |

#### (C) ServiceUserProtectedRoute
> App.tsx:197-214

**동작:**
1. `isServiceUserAuthenticated` 확인
2. 미인증 → `/service-login`으로 리다이렉트
3. 인증 → children 렌더

**적용 대상:** `/service/*`

### 3.2 역할 정의

```typescript
type UserRole = 'admin' | 'pharmacy' | 'supplier' | 'partner' | 'operator' | 'consumer';
```

### 3.3 API Role → Web Role 매핑
> AuthContext.tsx:101-113

| API Role | Web Role |
|----------|----------|
| pharmacy | pharmacy |
| seller | pharmacy |
| customer | pharmacy |
| user | pharmacy |
| admin | operator |
| super_admin | operator |
| supplier | supplier |
| partner | partner |
| (기타) | consumer |

---

## 4. Entry Flow 요약

### 4.1 앱 초기화 흐름

```
index.html
  └→ src/main.tsx (React root)
      └→ <App />
          ├→ <BrowserRouter>
          ├→ <AuthProvider>  ← 세션 체크 시작
          │   └→ useEffect: localStorage 토큰 → GET /api/v1/auth/me
          │       ├→ 200: user/roles 설정
          │       ├→ 401: refreshAccessToken() 시도
          │       └→ isLoading = false
          ├→ <LoginModalProvider>
          ├→ <LoginModal />  ← 전역 로그인 모달
          └→ <Suspense fallback={<PageLoading />}>
              └→ <AppRoutes />
```

### 4.2 약사 로그인 → 첫 화면

```
1. /login 페이지에서 이메일/비밀번호 입력
2. POST /api/v1/auth/login
3. 토큰 저장: glycopharm_access_token / glycopharm_refresh_token (localStorage)
4. getDefaultRouteByRole('pharmacy') → '/care'
5. navigate('/care')
6. SoftGuardOutlet: 인증 ✓ + pharmacy 역할 ✓
7. CareDashboardPage 렌더
```

### 4.3 역할별 기본 대시보드

| 역할 | 기본 경로 | 화면 |
|------|-----------|------|
| admin | `/admin` | GlycoPharmAdminDashboard |
| pharmacy | `/care` | CareDashboardPage |
| supplier | `/supplier` | RoleNotAvailablePage (차단) |
| partner | `/partner` | PartnerIndex |
| operator | `/operator` | GlycoPharmOperatorDashboard |
| consumer | `/` | HomeLivePage |

### 4.4 약사 첫 화면 (CareDashboardPage) 구성

> `src/pages/care/CareDashboardPage.tsx` (317줄)

| 영역 | 내용 |
|------|------|
| Hero | "Care 관리 현황" + 오늘 날짜 |
| KPI 카드 4개 | 전체 환자 / 고위험 / 중위험 / 최근 7일 코칭 |
| 검색/필터 바 | 이름·전화 검색, 위험도 필터 (전체/고/중/저), 환자 추가 버튼 |
| 환자 테이블 | 이름, 전화, 위험도 배지, 마지막 분석일 → 클릭 시 `/care/patients/:id` |

**API 호출:**
- `pharmacyApi.getCustomers({ search, pageSize: 100 })`
- `pharmacyApi.getCareDashboardSummary()`

### 4.5 토큰 관리

| 키 | 용도 |
|----|------|
| `glycopharm_access_token` | Platform User JWT |
| `glycopharm_refresh_token` | Token 갱신용 |
| `glycopharm_service_access_token` | Service User JWT (Phase 2) |
| `glycopharm_service_refresh_token` | Service User 갱신용 (Phase 2) |

### 4.6 온보딩 흐름

**없음.** 로그인 후 별도 설정/가이드 없이 즉시 Care Dashboard로 이동.

---

## 라우트 통계 요약

| 분류 | 라우트 수 |
|------|-----------|
| Public (MainLayout) | 27 |
| Care (SoftGuard) | 8 |
| Service User | 3 |
| Supplier (차단) | 2 |
| Partner | 12 |
| Admin | 4 |
| Operator | 26 |
| Consumer Store | 4 |
| Kiosk | 4 |
| Tablet | 4 |
| QR Landing | 1 |
| Store Owner Dashboard | 26 |
| Catch-All | 1 |
| **합계** | **~122** |

| 분류 | 메뉴 항목 수 |
|------|-------------|
| 상단 헤더 | 5 |
| Care 서브네비 | 4 |
| Admin 사이드바 | 4 |
| Operator 사이드바 | 19 |
| Pharmacy 사이드바 | 14 |
| Partner 사이드바 | 5 |
| Consumer Store 탭 | 5 |
| Footer | 5 |
| **합계** | **~61** |

---

## Phase 2 조사를 위한 기준선

이 보고서에서 확정된 **약사(pharmacy) 역할 기준 핵심 동선**:

```
로그인 → /care (CareDashboardPage)
                ├→ /care/patients (PatientsPage)
                │       └→ /care/patients/:id
                │               ├→ (index) SummaryTab
                │               ├→ /analysis PatientAnalysisTab
                │               ├→ /coaching PatientCoachingTab
                │               └→ /history HistoryTab
                ├→ /care/analysis (AnalysisPage)
                └→ /care/coaching (CoachingPage)

        → /store (Store Owner Dashboard)
                ├→ /store/hub, /store/identity, /store/products ...
                └→ (14개 사이드바 메뉴)
```

Phase 2에서는 위 Care 동선의 각 화면별 **기능 성숙도(연동/Mock/Placeholder)** 와 **사용 API 목록**을 조사한다.

---

*조사 완료: 2026-02-26*
*코드 수정: 없음*
