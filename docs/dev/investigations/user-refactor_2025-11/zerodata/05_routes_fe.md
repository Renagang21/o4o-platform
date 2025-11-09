# FE 라우팅 정의 (Frontend Routes)

> **작성일**: 2025-01-08
> **Phase**: P0
> **목적**: 역할 분리형 전환에 따른 FE 라우팅 구조 정의

---

## 원칙

1. **역할별 분리**: `/dashboard/{role}` 형태로 명확히 구분
2. **접근 제어**: 역할 없으면 신청 페이지로 리디렉션
3. **UX 최적화**: 승인 대기 중에도 상태 확인 가능
4. **관리자 통합**: 모든 관리 기능은 `/admin/*` 하위에

---

## 1. 라우팅 구조 (전체)

```
/                              # 메인 사이트 홈
/auth
  /register                    # 회원가입
  /login                       # 로그인
  /verify-email                # 이메일 인증

/apply                         # 역할 신청
  /supplier                    # 공급자 신청
  /seller                      # 판매자 신청
  /partner                     # 파트너 신청
  /status                      # 신청 현황 조회 (통합)
  /supplier/status             # 공급자 신청 현황
  /seller/status               # 판매자 신청 현황
  /partner/status              # 파트너 신청 현황

/dashboard                     # 역할별 대시보드
  /supplier                    # 공급자 대시보드
  /seller                      # 판매자 대시보드
  /partner                     # 파트너 대시보드

/admin                         # 관리자
  /dashboard                   # 관리자 대시보드
  /enrollments                 # 신청 관리
    /suppliers                 # 공급자 신청 목록
    /sellers                   # 판매자 신청 목록
    /partners                  # 파트너 신청 목록
    /:id                       # 신청 상세
  /users                       # (기존) 사용자 관리
  /suppliers                   # (기존) 공급자 관리
  /sellers                     # (기존) 판매자 관리
  /partners                    # (기존) 파트너 관리
```

---

## 2. 공개 라우트 (Public Routes)

### 2.1 메인 사이트

| 경로 | 컴포넌트 | 설명 | 인증 |
|------|---------|------|------|
| `/` | `HomePage` | 메인 페이지 | ❌ |
| `/about` | `AboutPage` | 회사 소개 | ❌ |

### 2.2 인증

| 경로 | 컴포넌트 | 설명 | 인증 |
|------|---------|------|------|
| `/auth/register` | `RegisterPage` | 회원가입 | ❌ |
| `/auth/login` | `LoginPage` | 로그인 | ❌ |
| `/auth/verify-email` | `VerifyEmailPage` | 이메일 인증 | ❌ |

---

## 3. 역할 신청 라우트 (Enrollment Routes)

### 3.1 신청 폼

| 경로 | 컴포넌트 | 필요 인증 | 리디렉션 (조건) |
|------|---------|----------|----------------|
| `/apply/supplier` | `SupplierApplicationPage` | ✅ authenticated | 이미 supplier 역할 → `/dashboard/supplier` |
| `/apply/seller` | `SellerApplicationPage` | ✅ authenticated | 이미 seller 역할 → `/dashboard/seller` |
| `/apply/partner` | `PartnerApplicationPage` | ✅ authenticated | 이미 partner 역할 → `/dashboard/partner` |

**컴포넌트 구조**:
```typescript
// apps/main-site/src/pages/apply/SupplierApplicationPage.tsx
export function SupplierApplicationPage() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth/login?redirect=/apply/supplier');
    }
    if (hasRole('supplier')) {
      navigate('/dashboard/supplier');
    }
  }, [user, hasRole]);

  return (
    <div>
      <h1>공급자 신청</h1>
      <SupplierApplicationForm />
    </div>
  );
}
```

### 3.2 신청 현황

| 경로 | 컴포넌트 | 필요 인증 | 설명 |
|------|---------|----------|------|
| `/apply/status` | `ApplicationStatusPage` | ✅ | 모든 역할 신청 현황 통합 조회 |
| `/apply/supplier/status` | `SupplierStatusPage` | ✅ | 공급자 신청 현황만 조회 |
| `/apply/seller/status` | `SellerStatusPage` | ✅ | 판매자 신청 현황만 조회 |
| `/apply/partner/status` | `PartnerStatusPage` | ✅ | 파트너 신청 현황만 조회 |

**상태별 UI**:
```typescript
// apps/main-site/src/components/EnrollmentStatus.tsx
export function EnrollmentStatus({ enrollment }: Props) {
  switch (enrollment.status) {
    case 'PENDING':
      return (
        <Alert variant="info">
          <p>검토 중입니다. 영업일 기준 3일 이내 연락드립니다.</p>
          <p>신청일: {enrollment.created_at}</p>
        </Alert>
      );

    case 'APPROVED':
      return (
        <Alert variant="success">
          <p>승인되었습니다! 이제 {getRoleLabel(enrollment.role)} 대시보드를 사용할 수 있습니다.</p>
          <Button onClick={() => navigate(`/dashboard/${enrollment.role}`)}>
            대시보드 이동
          </Button>
        </Alert>
      );

    case 'REJECTED':
      return (
        <Alert variant="error">
          <p>신청이 거부되었습니다.</p>
          <p>사유: {enrollment.review_note}</p>
          <Button onClick={() => navigate(`/apply/${enrollment.role}`)}>
            재신청
          </Button>
        </Alert>
      );

    case 'ON_HOLD':
      return (
        <Alert variant="warning">
          <p>추가 확인이 필요합니다.</p>
          <p>{enrollment.review_note}</p>
          <Button>서류 추가 업로드</Button>
        </Alert>
      );
  }
}
```

---

## 4. 역할별 대시보드 라우트

### 4.1 대시보드 메인

| 경로 | 컴포넌트 | 필요 역할 | 리디렉션 (역할 없음) |
|------|---------|----------|---------------------|
| `/dashboard/supplier` | `SupplierDashboard` | supplier | `/apply/supplier/status` |
| `/dashboard/seller` | `SellerDashboard` | seller | `/apply/seller/status` |
| `/dashboard/partner` | `PartnerDashboard` | partner | `/apply/partner/status` |

**라우트 가드 예시**:
```typescript
// apps/main-site/src/pages/dashboard/SupplierDashboard.tsx
import { RoleGuard } from '@/components/RoleGuard';

export function SupplierDashboard() {
  return (
    <RoleGuard
      roles={['supplier']}
      fallback={<Navigate to="/apply/supplier/status" replace />}
    >
      <SupplierDashboardContent />
    </RoleGuard>
  );
}

function SupplierDashboardContent() {
  return (
    <div>
      <h1>공급자 대시보드</h1>
      <SupplierMetrics />
      <SupplierProductList />
    </div>
  );
}
```

### 4.2 대시보드 하위 페이지 (공급자 예시)

| 경로 | 컴포넌트 | 설명 |
|------|---------|------|
| `/dashboard/supplier/products` | `SupplierProductsPage` | 상품 관리 |
| `/dashboard/supplier/orders` | `SupplierOrdersPage` | 주문 관리 |
| `/dashboard/supplier/profile` | `SupplierProfilePage` | 프로필 관리 |
| `/dashboard/supplier/settings` | `SupplierSettingsPage` | 설정 |

---

## 5. 관리자 라우트 (Admin Routes)

### 5.1 대시보드 & 신청 관리

| 경로 | 컴포넌트 | 필요 역할 | 설명 |
|------|---------|----------|------|
| `/admin/dashboard` | `AdminDashboard` | admin | 관리자 대시보드 |
| `/admin/enrollments` | `EnrollmentsListPage` | admin | 전체 신청 목록 |
| `/admin/enrollments/suppliers` | `SupplierEnrollmentsPage` | admin | 공급자 신청 목록 |
| `/admin/enrollments/sellers` | `SellerEnrollmentsPage` | admin | 판매자 신청 목록 |
| `/admin/enrollments/partners` | `PartnerEnrollmentsPage` | admin | 파트너 신청 목록 |
| `/admin/enrollments/:id` | `EnrollmentDetailPage` | admin | 신청 상세 & 승인/반려 |

**신청 목록 예시**:
```typescript
// apps/admin-dashboard/src/pages/enrollments/SupplierEnrollmentsPage.tsx
export function SupplierEnrollmentsPage() {
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const { data, isLoading } = useQuery(['enrollments', 'supplier', filter], () =>
    api.get('/admin/enrollments', { params: { role: 'supplier', status: filter } })
  );

  return (
    <div>
      <h1>공급자 신청 관리</h1>
      <Tabs value={filter} onChange={setFilter}>
        <Tab value="PENDING">대기 중 ({counts.pending})</Tab>
        <Tab value="APPROVED">승인 ({counts.approved})</Tab>
        <Tab value="REJECTED">반려 ({counts.rejected})</Tab>
      </Tabs>
      <EnrollmentTable enrollments={data.enrollments} />
    </div>
  );
}
```

### 5.2 기존 관리 페이지 (레거시)

| 경로 | 컴포넌트 | 변경 사항 |
|------|---------|----------|
| `/admin/users` | `UsersListPage` | ⏳ P1에서 역할별 분리 검토 |
| `/admin/suppliers` | `SuppliersListPage` | ✅ 유지 (승인된 공급자 관리) |
| `/admin/sellers` | `SellersListPage` | ✅ 유지 (승인된 판매자 관리) |
| `/admin/partners` | `PartnersListPage` | ✅ 유지 (승인된 파트너 관리) |

---

## 6. React Router 정의

### 6.1 메인 사이트 (`apps/main-site`)

```typescript
// apps/main-site/src/App.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },

      // 인증
      {
        path: 'auth',
        children: [
          { path: 'register', element: <RegisterPage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'verify-email', element: <VerifyEmailPage /> },
        ],
      },

      // 역할 신청
      {
        path: 'apply',
        children: [
          { path: 'supplier', element: <SupplierApplicationPage /> },
          { path: 'seller', element: <SellerApplicationPage /> },
          { path: 'partner', element: <PartnerApplicationPage /> },
          { path: 'status', element: <ApplicationStatusPage /> },
          { path: 'supplier/status', element: <SupplierStatusPage /> },
          { path: 'seller/status', element: <SellerStatusPage /> },
          { path: 'partner/status', element: <PartnerStatusPage /> },
        ],
      },

      // 역할별 대시보드
      {
        path: 'dashboard',
        children: [
          {
            path: 'supplier',
            element: <SupplierDashboard />,
            children: [
              { index: true, element: <SupplierDashboardHome /> },
              { path: 'products', element: <SupplierProductsPage /> },
              { path: 'orders', element: <SupplierOrdersPage /> },
              { path: 'profile', element: <SupplierProfilePage /> },
            ],
          },
          {
            path: 'seller',
            element: <SellerDashboard />,
            children: [
              { index: true, element: <SellerDashboardHome /> },
              // ...
            ],
          },
          {
            path: 'partner',
            element: <PartnerDashboard />,
            children: [
              { index: true, element: <PartnerDashboardHome /> },
              // ...
            ],
          },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

### 6.2 관리자 대시보드 (`apps/admin-dashboard`)

```typescript
// apps/admin-dashboard/src/App.tsx
const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },

      // 신청 관리 (신규)
      {
        path: 'enrollments',
        children: [
          { index: true, element: <EnrollmentsListPage /> },
          { path: 'suppliers', element: <SupplierEnrollmentsPage /> },
          { path: 'sellers', element: <SellerEnrollmentsPage /> },
          { path: 'partners', element: <PartnerEnrollmentsPage /> },
          { path: ':id', element: <EnrollmentDetailPage /> },
        ],
      },

      // 기존 관리 페이지
      { path: 'users', element: <UsersListPage /> },
      { path: 'suppliers', element: <SuppliersListPage /> },
      { path: 'sellers', element: <SellersListPage /> },
      { path: 'partners', element: <PartnersListPage /> },
    ],
  },
]);
```

---

## 7. 리디렉션 로직

### 7.1 로그인 후 리디렉션

```typescript
// apps/main-site/src/pages/auth/LoginPage.tsx
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  async function handleLogin(credentials: Credentials) {
    await login(credentials);

    // redirect 파라미터가 있으면 해당 경로로, 없으면 홈으로
    navigate(redirect, { replace: true });
  }

  return <LoginForm onSubmit={handleLogin} />;
}
```

### 7.2 미인증 접근 시

```typescript
// apps/main-site/src/components/RequireAuth.tsx
export function RequireAuth({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={`/auth/login?redirect=${location.pathname}`} replace />;
  }

  return <>{children}</>;
}
```

### 7.3 역할 없이 대시보드 접근 시

```typescript
// apps/main-site/src/components/RoleGuard.tsx
export function RoleGuard({ roles, children, fallback }: Props) {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(roles)) {
    return fallback || <Navigate to="/apply/status" replace />;
  }

  return <>{children}</>;
}
```

---

## 8. 메뉴 구조

### 8.1 공급자 대시보드 메뉴

```typescript
const supplierMenuItems = [
  { id: 'home', label: '홈', path: '/dashboard/supplier', icon: HomeIcon },
  { id: 'products', label: '상품 관리', path: '/dashboard/supplier/products', icon: PackageIcon },
  { id: 'orders', label: '주문 관리', path: '/dashboard/supplier/orders', icon: ShoppingCartIcon },
  { id: 'profile', label: '프로필', path: '/dashboard/supplier/profile', icon: UserIcon },
  { id: 'settings', label: '설정', path: '/dashboard/supplier/settings', icon: SettingsIcon },
];
```

### 8.2 관리자 메뉴

```typescript
const adminMenuItems = [
  { id: 'dashboard', label: '대시보드', path: '/admin/dashboard', icon: DashboardIcon },
  {
    id: 'enrollments',
    label: '신청 관리',
    icon: ClipboardIcon,
    children: [
      { id: 'enrollments-all', label: '전체 신청', path: '/admin/enrollments' },
      { id: 'enrollments-suppliers', label: '공급자 신청', path: '/admin/enrollments/suppliers' },
      { id: 'enrollments-sellers', label: '판매자 신청', path: '/admin/enrollments/sellers' },
      { id: 'enrollments-partners', label: '파트너 신청', path: '/admin/enrollments/partners' },
    ],
  },
  { id: 'users', label: '사용자 관리', path: '/admin/users', icon: UsersIcon },
  { id: 'suppliers', label: '공급자 관리', path: '/admin/suppliers', icon: TruckIcon },
  { id: 'sellers', label: '판매자 관리', path: '/admin/sellers', icon: StoreIcon },
  { id: 'partners', label: '파트너 관리', path: '/admin/partners', icon: HandshakeIcon },
];
```

---

## 9. 검증 체크리스트

- [ ] 회원가입 후 `/auth/login`으로 리디렉션
- [ ] 로그인 후 `redirect` 파라미터 경로로 이동
- [ ] 역할 없이 대시보드 접근 시 `/apply/{role}/status`로 리디렉션
- [ ] 역할 있는 상태에서 신청 페이지 접근 시 대시보드로 리디렉션
- [ ] 관리자 메뉴에 "신청 관리" 표시
- [ ] 역할별 메뉴 필터링 동작 확인
- [ ] RoleGuard 컴포넌트 동작 확인

---

**작성**: Claude Code
**상태**: ✅ P0 FE 라우팅 정의 완료
**다음**: P0 문서 커밋 및 푸시
