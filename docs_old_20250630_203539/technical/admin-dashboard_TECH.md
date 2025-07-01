# ⚙️ Admin Dashboard 서비스 기술 문서

> **서비스 이름**: Admin Dashboard (통합 관리자 패널)  
> **포트**: TBD  
> **상태**: 🟡 부분 구현 (API 완성, UI 개발 중)

---

## 📋 서비스 개요

O4O Platform의 **통합 관리 시스템**으로, 모든 마이크로서비스를 하나의 대시보드에서 관리할 수 있는 WordPress/WooCommerce 스타일의 관리자 패널입니다.

### 🎯 핵심 목표
- **통합 관리**: 7개 서비스를 단일 인터페이스에서 관리
- **WordPress 스타일**: 직관적이고 익숙한 관리자 경험
- **역할 기반 권한**: superadmin → manager → editor → viewer 계층
- **실시간 모니터링**: 실시간 통계 및 시스템 상태 감시

---

## 🏗️ 아키텍처

### 서비스 구조

```
services/admin-dashboard/
├── src/
│   ├── api/                        # API 클라이언트들
│   │   ├── authStore.ts           # 인증 관리
│   │   ├── base.ts                # 기본 API 설정
│   │   ├── client.ts              # HTTP 클라이언트
│   │   ├── contentApi.ts          # 콘텐츠 관리 API
│   │   ├── dashboard.ts           # 대시보드 API
│   │   ├── ecommerceApi.ts        # 이커머스 통합 API (346줄)
│   │   ├── policy-settings.ts     # 정책 설정 API
│   │   └── userApi.ts             # 사용자 관리 API
│   ├── components/                 # UI 컴포넌트들
│   │   ├── charts/                # 차트 컴포넌트
│   │   ├── forms/                 # 폼 컴포넌트
│   │   ├── layout/                # 레이아웃 컴포넌트
│   │   ├── media/                 # 미디어 관리
│   │   ├── tables/                # 테이블 컴포넌트
│   │   └── ui/                    # 기본 UI 컴포넌트
│   ├── pages/                      # 페이지 컴포넌트들
│   │   ├── analytics/             # 분석 대시보드
│   │   ├── auth/                  # 로그인
│   │   ├── content/               # 콘텐츠 관리
│   │   ├── custom-fields/         # 커스텀 필드
│   │   ├── dashboard/             # 메인 대시보드
│   │   ├── ecommerce/             # 이커머스 관리
│   │   ├── media/                 # 미디어 라이브러리
│   │   ├── pages/                 # 페이지 빌더
│   │   ├── posts/                 # 포스트 관리
│   │   ├── settings/              # 설정
│   │   ├── templates/             # 템플릿 관리
│   │   ├── tools/                 # 도구
│   │   ├── users/                 # 사용자 관리
│   │   └── woocommerce/           # WooCommerce 스타일
│   ├── stores/                     # 상태 관리
│   ├── styles/                     # 스타일 (멀티 테마)
│   └── types/                      # TypeScript 타입
└── package.json
```

### 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| **Frontend** | React + TypeScript | 19.1.2 |
| **Build Tool** | Vite | 6.3.5 |
| **Styling** | TailwindCSS | 4.1.7 |
| **HTTP Client** | Axios | - |
| **Routing** | React Router | 7.6.0 |
| **State Management** | Context API + Local State | - |

---

## 🎨 사용자 인터페이스

### WordPress 스타일 디자인

#### 메인 대시보드
```typescript
// 📊 대시보드 위젯
interface DashboardWidget {
  title: string
  type: 'stat' | 'chart' | 'table' | 'quick-actions'
  data: any
  permissions: AdminRole[]
}

// 📈 실시간 통계
interface LiveStats {
  totalUsers: number
  totalOrders: number
  todayRevenue: number
  activeVisitors: number
  
  // 차트 데이터
  revenueChart: ChartData[]
  ordersChart: ChartData[]
  usersChart: ChartData[]
}
```

#### 사이드바 네비게이션
```typescript
// 🧭 네비게이션 메뉴
const adminMenuItems = [
  // 메인
  { id: 'dashboard', label: '대시보드', icon: 'dashboard', path: '/' },
  
  // 콘텐츠 관리
  { id: 'posts', label: '포스트', icon: 'edit', path: '/posts' },
  { id: 'pages', label: '페이지', icon: 'pages', path: '/pages' },
  { id: 'media', label: '미디어', icon: 'image', path: '/media' },
  
  // 이커머스
  { id: 'ecommerce', label: '이커머스', icon: 'shopping', children: [
    { id: 'products', label: '상품', path: '/ecommerce/products' },
    { id: 'orders', label: '주문', path: '/ecommerce/orders' },
    { id: 'customers', label: '고객', path: '/ecommerce/customers' }
  ]},
  
  // 사용자 관리
  { id: 'users', label: '사용자', icon: 'users', path: '/users' },
  
  // 설정
  { id: 'settings', label: '설정', icon: 'settings', children: [
    { id: 'general', label: '일반', path: '/settings/general' },
    { id: 'theme', label: '테마', path: '/settings/theme' },
    { id: 'policy', label: '정책', path: '/settings/policy' }
  ]}
]
```

### 멀티 테마 시스템

```css
/* 🎨 테마 변수들 */
:root {
  /* Afternoon 테마 */
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* 배경색 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-accent: #f1f5f9;
  
  /* 텍스트 색상 */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
}

/* 다크 모드 지원 */
[data-theme="dusk"] {
  --bg-primary: #1e293b;
  --bg-secondary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
}
```

---

## 🔌 API 통합

### E-commerce API 클라이언트 (핵심)

```typescript
// 📁 services/admin-dashboard/src/api/ecommerceApi.ts (346줄)
class EcommerceApi {
  
  // 🏷️ 상품 관리
  async getProducts(filters?: ProductFilters): Promise<ApiResponse<Product[]>>
  async getProduct(id: string): Promise<ApiResponse<Product>>
  async createProduct(data: CreateProductRequest): Promise<ApiResponse<Product>>
  async updateProduct(id: string, data: UpdateProductRequest): Promise<ApiResponse<Product>>
  async deleteProduct(id: string): Promise<ApiResponse<void>>
  async bulkUpdateProducts(products: BulkUpdateProduct[]): Promise<ApiResponse<void>>
  async duplicateProduct(id: string): Promise<ApiResponse<Product>>
  
  // 📦 주문 관리
  async getOrders(filters?: OrderFilters): Promise<ApiResponse<Order[]>>
  async getOrder(id: string): Promise<ApiResponse<Order>>
  async updateOrderStatus(id: string, status: OrderStatus): Promise<ApiResponse<Order>>
  async cancelOrder(id: string, reason: string): Promise<ApiResponse<void>>
  async refundOrder(id: string, amount: number, reason: string): Promise<ApiResponse<void>>
  async bulkUpdateOrders(orders: BulkUpdateOrder[]): Promise<ApiResponse<void>>
  
  // 👥 고객 관리
  async getCustomers(filters?: CustomerFilters): Promise<ApiResponse<Customer[]>>
  async getCustomer(id: string): Promise<ApiResponse<Customer>>
  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>>
  async blockCustomer(id: string, reason: string): Promise<ApiResponse<void>>
  async unblockCustomer(id: string): Promise<ApiResponse<void>>
  
  // 🏷️ 카테고리 & 태그
  async getCategories(): Promise<ApiResponse<Category[]>>
  async createCategory(data: CreateCategoryRequest): Promise<ApiResponse<Category>>
  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<ApiResponse<Category>>
  async deleteCategory(id: string): Promise<ApiResponse<void>>
  
  // 🎫 쿠폰 관리
  async getCoupons(filters?: CouponFilters): Promise<ApiResponse<Coupon[]>>
  async createCoupon(data: CreateCouponRequest): Promise<ApiResponse<Coupon>>
  async updateCoupon(id: string, data: UpdateCouponRequest): Promise<ApiResponse<Coupon>>
  async deleteCoupon(id: string): Promise<ApiResponse<void>>
  async applyCoupon(code: string, orderId: string): Promise<ApiResponse<void>>
  
  // 📊 재고 관리
  async getInventory(filters?: InventoryFilters): Promise<ApiResponse<InventoryItem[]>>
  async updateStock(productId: string, quantity: number, reason: string): Promise<ApiResponse<void>>
  async getStockMovements(productId: string): Promise<ApiResponse<StockMovement[]>>
  async getLowStockProducts(): Promise<ApiResponse<Product[]>>
  
  // 📈 보고서 & 분석
  async getSalesReport(dateRange: DateRange, groupBy: 'day' | 'week' | 'month'): Promise<ApiResponse<SalesReport>>
  async getRevenueReport(dateRange: DateRange): Promise<ApiResponse<RevenueReport>>
  async getProductPerformance(dateRange: DateRange): Promise<ApiResponse<ProductPerformance[]>>
  async getCustomerAnalytics(dateRange: DateRange): Promise<ApiResponse<CustomerAnalytics>>
  
  // 📊 대시보드 통계
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>>
  async getRecentOrders(limit: number): Promise<ApiResponse<Order[]>>
  async getTopProducts(limit: number): Promise<ApiResponse<Product[]>>
  async getCustomerGrowth(period: string): Promise<ApiResponse<GrowthData[]>>
  
  // ⚙️ 설정 관리
  async getSettings(): Promise<ApiResponse<EcommerceSettings>>
  async updateSettings(settings: EcommerceSettings): Promise<ApiResponse<void>>
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>>
  async updatePaymentMethod(id: string, data: PaymentMethodUpdate): Promise<ApiResponse<void>>
  
  // 📤 데이터 내보내기
  async exportProducts(format: 'csv' | 'xlsx'): Promise<ApiResponse<string>>
  async exportOrders(dateRange: DateRange, format: 'csv' | 'xlsx'): Promise<ApiResponse<string>>
  async exportCustomers(format: 'csv' | 'xlsx'): Promise<ApiResponse<string>>
  
  // 🖼️ 미디어 업로드
  async uploadProductImage(file: File): Promise<ApiResponse<MediaFile>>
  async uploadCategoryImage(file: File): Promise<ApiResponse<MediaFile>>
}
```

### 기타 API 클라이언트들

```typescript
// 👥 사용자 관리 API
class UserApi {
  async getUsers(filters?: UserFilters): Promise<ApiResponse<User[]>>
  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>>
  async updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>>
  async deleteUser(id: string): Promise<ApiResponse<void>>
  async updateUserRole(id: string, role: UserRole): Promise<ApiResponse<void>>
  async blockUser(id: string, reason: string): Promise<ApiResponse<void>>
  async getPendingApprovals(): Promise<ApiResponse<User[]>>
  async approveUser(id: string): Promise<ApiResponse<void>>
  async rejectUser(id: string, reason: string): Promise<ApiResponse<void>>
}

// 📝 콘텐츠 관리 API
class ContentApi {
  async getPosts(filters?: PostFilters): Promise<ApiResponse<Post[]>>
  async createPost(data: CreatePostRequest): Promise<ApiResponse<Post>>
  async updatePost(id: string, data: UpdatePostRequest): Promise<ApiResponse<Post>>
  async deletePost(id: string): Promise<ApiResponse<void>>
  async publishPost(id: string): Promise<ApiResponse<void>>
  async getPages(): Promise<ApiResponse<Page[]>>
  async createPage(data: CreatePageRequest): Promise<ApiResponse<Page>>
}

// 🖼️ 미디어 관리 API  
class MediaApi {
  async getMediaFiles(filters?: MediaFilters): Promise<ApiResponse<MediaFile[]>>
  async uploadFile(file: File): Promise<ApiResponse<MediaFile>>
  async deleteFile(id: string): Promise<ApiResponse<void>>
  async updateFileMetadata(id: string, metadata: FileMetadata): Promise<ApiResponse<MediaFile>>
}
```

---

## 🔐 권한 관리 시스템

### 관리자 역할 계층

```typescript
// 🎭 관리자 권한 계층
enum AdminRole {
  SUPERADMIN = 'superadmin',  // 모든 권한
  MANAGER = 'manager',        // 대부분 권한 (삭제 제외)
  EDITOR = 'editor',          // 편집 권한
  VIEWER = 'viewer'           // 읽기 전용
}

// 🔒 권한 매트릭스
const permissions = {
  // 이커머스 권한
  'ecommerce.products.view': ['superadmin', 'manager', 'editor', 'viewer'],
  'ecommerce.products.create': ['superadmin', 'manager', 'editor'],
  'ecommerce.products.edit': ['superadmin', 'manager', 'editor'],
  'ecommerce.products.delete': ['superadmin', 'manager'],
  
  'ecommerce.orders.view': ['superadmin', 'manager', 'editor', 'viewer'],
  'ecommerce.orders.edit': ['superadmin', 'manager'],
  'ecommerce.orders.refund': ['superadmin', 'manager'],
  
  // 사용자 권한
  'users.view': ['superadmin', 'manager', 'viewer'],
  'users.create': ['superadmin', 'manager'],
  'users.edit': ['superadmin', 'manager'],
  'users.delete': ['superadmin'],
  'users.roles': ['superadmin'],
  
  // 시스템 설정
  'settings.view': ['superadmin', 'manager'],
  'settings.edit': ['superadmin'],
  'settings.theme': ['superadmin', 'manager'],
}

// 🛡️ 권한 체크 훅
const usePermission = (permission: string) => {
  const { user } = useAuth()
  
  return useMemo(() => {
    if (!user) return false
    
    const allowedRoles = permissions[permission] || []
    return allowedRoles.includes(user.role)
  }, [user, permission])
}

// 🚫 권한 기반 컴포넌트
const ProtectedAction = ({ 
  permission, 
  children, 
  fallback = null 
}: ProtectedActionProps) => {
  const hasPermission = usePermission(permission)
  
  return hasPermission ? children : fallback
}
```

### 인증 플로우

```typescript
// 🔐 관리자 인증 컨텍스트
interface AdminAuthContext {
  user: AdminUser | null
  isAuthenticated: boolean
  role: AdminRole
  permissions: string[]
  
  login: (credentials: AdminCredentials) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  
  // 권한 체크
  hasPermission: (permission: string) => boolean
  hasRole: (role: AdminRole) => boolean
}

// 🎫 로그인 프로세스
const adminLogin = async (credentials: AdminCredentials) => {
  try {
    const response = await api.post('/api/admin/auth/login', credentials)
    const { token, user, permissions } = response.data
    
    // 토큰 저장
    localStorage.setItem('admin-token', token)
    
    // 사용자 정보 저장
    setUser(user)
    setPermissions(permissions)
    
    // Axios 기본 헤더 설정
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    
  } catch (error) {
    throw new Error('로그인에 실패했습니다.')
  }
}
```

---

## 📊 대시보드 컴포넌트

### 메인 대시보드

```typescript
// 📈 대시보드 통계 위젯
const DashboardStats = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => ecommerceApi.getDashboardStats(),
    refetchInterval: 30000 // 30초마다 갱신
  })
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="총 매출"
        value={stats?.totalRevenue}
        change={stats?.revenueChange}
        icon="currency"
        color="green"
      />
      <StatCard
        title="주문 수"
        value={stats?.totalOrders}
        change={stats?.ordersChange}
        icon="shopping-bag"
        color="blue"
      />
      <StatCard
        title="고객 수"
        value={stats?.totalCustomers}
        change={stats?.customersChange}
        icon="users"
        color="purple"
      />
      <StatCard
        title="상품 수"
        value={stats?.totalProducts}
        change={stats?.productsChange}
        icon="package"
        color="orange"
      />
    </div>
  )
}

// 📊 차트 컴포넌트
const RevenueChart = () => {
  const { data: chartData } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => ecommerceApi.getRevenueReport({
      startDate: subDays(new Date(), 30),
      endDate: new Date()
    })
  })
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>지난 30일 매출 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart data={chartData} />
      </CardContent>
    </Card>
  )
}
```

### 실시간 알림 시스템

```typescript
// 🔔 실시간 알림
const NotificationSystem = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  useEffect(() => {
    // Socket.IO 연결
    const socket = io('/admin')
    
    socket.on('new-order', (order: Order) => {
      addNotification({
        id: generateId(),
        type: 'info',
        title: '새 주문',
        message: `${order.customer.name}님이 주문했습니다.`,
        timestamp: new Date(),
        action: {
          label: '주문 보기',
          url: `/ecommerce/orders/${order.id}`
        }
      })
    })
    
    socket.on('low-stock', (product: Product) => {
      addNotification({
        id: generateId(),
        type: 'warning',
        title: '재고 부족',
        message: `${product.name}의 재고가 부족합니다.`,
        timestamp: new Date(),
        action: {
          label: '상품 보기',
          url: `/ecommerce/products/${product.id}`
        }
      })
    })
    
    return () => socket.disconnect()
  }, [])
  
  return (
    <NotificationContainer>
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </NotificationContainer>
  )
}
```

---

## 🎨 UI 컴포넌트 라이브러리

### 기본 컴포넌트들

```typescript
// 🧩 재사용 가능한 UI 컴포넌트들

// 테이블 컴포넌트 (DataTable)
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  pagination?: PaginationProps
  filters?: FilterProps
  actions?: ActionProps<T>[]
}

const DataTable = <T,>({ data, columns, ...props }: DataTableProps<T>) => {
  // 정렬, 필터링, 페이징 로직
  return (
    <div className="admin-table-container">
      <TableFilters />
      <Table>
        <TableHeader columns={columns} />
        <TableBody data={data} columns={columns} />
      </Table>
      <TablePagination />
    </div>
  )
}

// 폼 컴포넌트 (AdminForm)
interface AdminFormProps {
  schema: FormSchema
  onSubmit: (data: any) => Promise<void>
  initialData?: any
  loading?: boolean
}

const AdminForm = ({ schema, onSubmit, initialData }: AdminFormProps) => {
  const { register, handleSubmit, formState } = useForm({
    defaultValues: initialData,
    resolver: zodResolver(schema)
  })
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="admin-form">
      {schema.fields.map(field => (
        <FormField
          key={field.name}
          field={field}
          register={register}
          errors={formState.errors}
        />
      ))}
      <FormActions loading={formState.isSubmitting} />
    </form>
  )
}

// 모달 컴포넌트 (AdminModal)  
interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

const AdminModal = ({ isOpen, onClose, title, size = 'md', children }: AdminModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent size={size}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton onClick={onClose} />
        </ModalHeader>
        <ModalBody>
          {children}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
```

### 페이지 템플릿

```typescript
// 📄 표준 관리자 페이지 템플릿
const AdminPageTemplate = ({ 
  title, 
  breadcrumbs, 
  actions, 
  children 
}: AdminPageProps) => {
  return (
    <div className="admin-page">
      <AdminHeader>
        <div className="flex items-center justify-between">
          <div>
            <AdminBreadcrumb items={breadcrumbs} />
            <h1 className="admin-page-title">{title}</h1>
          </div>
          <div className="admin-page-actions">
            {actions}
          </div>
        </div>
      </AdminHeader>
      
      <AdminContent>
        {children}
      </AdminContent>
    </div>
  )
}

// 📋 리스트 페이지 템플릿
const AdminListPage = <T,>({ 
  title,
  data,
  columns,
  createButton,
  filters
}: AdminListPageProps<T>) => {
  return (
    <AdminPageTemplate
      title={title}
      breadcrumbs={[{ label: '홈', href: '/' }, { label: title }]}
      actions={createButton}
    >
      <div className="admin-list-page">
        {filters && <AdminFilters filters={filters} />}
        <DataTable data={data} columns={columns} />
      </div>
    </AdminPageTemplate>
  )
}
```

---

## 📈 성능 및 최적화

### 데이터 로딩 최적화

```typescript
// ⚡ React Query를 사용한 데이터 캐싱
const useEcommerceData = () => {
  // 대시보드 통계 (짧은 캐시)
  const dashboardStats = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => ecommerceApi.getDashboardStats(),
    staleTime: 1 * 60 * 1000,      // 1분
    cacheTime: 5 * 60 * 1000       // 5분
  })
  
  // 상품 목록 (긴 캐시)
  const products = useQuery({
    queryKey: ['products'],
    queryFn: () => ecommerceApi.getProducts(),
    staleTime: 10 * 60 * 1000,     // 10분
    cacheTime: 30 * 60 * 1000      // 30분
  })
  
  // 실시간 주문 (매우 짧은 캐시)
  const recentOrders = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => ecommerceApi.getRecentOrders(10),
    staleTime: 30 * 1000,          // 30초
    refetchInterval: 30 * 1000     // 30초마다 자동 갱신
  })
  
  return { dashboardStats, products, recentOrders }
}

// 🔄 무한 스크롤 (대용량 데이터)
const useInfiniteProducts = (filters: ProductFilters) => {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      ecommerceApi.getProducts({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length + 1 : undefined
  })
}
```

### 번들 크기 최적화

```typescript
// 📦 코드 스플리팅
const EcommercePage = lazy(() => import('./pages/ecommerce/Products'))
const UsersPage = lazy(() => import('./pages/users/Users'))
const AnalyticsPage = lazy(() => import('./pages/analytics/Analytics'))

// 🎯 선택적 로딩
const AdminRoutes = () => (
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route 
      path="/ecommerce/*" 
      element={
        <Suspense fallback={<PageLoader />}>
          <EcommercePage />
        </Suspense>
      } 
    />
    <Route 
      path="/users/*" 
      element={
        <Suspense fallback={<PageLoader />}>
          <UsersPage />
        </Suspense>
      } 
    />
  </Routes>
)

// 🖼️ 이미지 최적화
const OptimizedImage = ({ src, alt, ...props }: ImageProps) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    decoding="async"
    {...props}
    onError={(e) => {
      e.currentTarget.src = '/placeholder-image.png'
    }}
  />
)
```

---

## 🧪 테스트 전략

### 컴포넌트 테스트

```typescript
// 🧪 관리자 컴포넌트 테스트
describe('AdminDashboard', () => {
  test('should display dashboard stats', async () => {
    const mockStats = {
      totalRevenue: 1000000,
      totalOrders: 150,
      totalCustomers: 450,
      totalProducts: 80
    }
    
    jest.spyOn(ecommerceApi, 'getDashboardStats')
      .mockResolvedValue({ data: mockStats })
    
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('1,000,000')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })
  
  test('should handle permission-based rendering', () => {
    const mockUser = { role: 'editor', permissions: ['ecommerce.products.view'] }
    
    render(
      <AuthProvider value={{ user: mockUser }}>
        <ProductsPage />
      </AuthProvider>
    )
    
    expect(screen.getByText('상품 목록')).toBeInTheDocument()
    expect(screen.queryByText('상품 삭제')).not.toBeInTheDocument() // editor는 삭제 권한 없음
  })
})

// 🔒 권한 시스템 테스트
describe('Permission System', () => {
  test('should grant access to superadmin', () => {
    const user = { role: 'superadmin' }
    
    expect(hasPermission(user, 'ecommerce.products.delete')).toBe(true)
    expect(hasPermission(user, 'users.delete')).toBe(true)
    expect(hasPermission(user, 'settings.edit')).toBe(true)
  })
  
  test('should restrict access for viewer', () => {
    const user = { role: 'viewer' }
    
    expect(hasPermission(user, 'ecommerce.products.view')).toBe(true)
    expect(hasPermission(user, 'ecommerce.products.edit')).toBe(false)
    expect(hasPermission(user, 'users.create')).toBe(false)
  })
})
```

### API 통합 테스트

```typescript
// 🔄 API 클라이언트 테스트
describe('EcommerceApi', () => {
  beforeEach(() => {
    // Mock API 설정
    mockAxios.reset()
  })
  
  test('should fetch products with filters', async () => {
    const mockProducts = [
      { id: '1', name: 'Product 1', price: 10000 },
      { id: '2', name: 'Product 2', price: 20000 }
    ]
    
    mockAxios.onGet('/api/ecommerce/products')
      .reply(200, { success: true, data: mockProducts })
    
    const api = new EcommerceApi()
    const result = await api.getProducts({ category: 'electronics' })
    
    expect(result.data).toEqual(mockProducts)
    expect(mockAxios.history.get[0].params).toEqual({ category: 'electronics' })
  })
  
  test('should handle API errors gracefully', async () => {
    mockAxios.onGet('/api/ecommerce/products')
      .reply(500, { error: 'Internal Server Error' })
    
    const api = new EcommerceApi()
    
    await expect(api.getProducts()).rejects.toThrow('Internal Server Error')
  })
})
```

---

## 🚀 배포 및 모니터링

### 환경 설정

```env
# 🌍 환경 변수
VITE_API_BASE_URL=https://api.neture.co.kr
VITE_APP_ENV=production
VITE_SENTRY_DSN=your_sentry_dsn
VITE_GOOGLE_ANALYTICS_ID=your_ga_id

# 관리자 설정
VITE_ADMIN_SESSION_TIMEOUT=3600000  # 1시간
VITE_ADMIN_REFRESH_INTERVAL=300000  # 5분
```

### 배포 스크립트

```bash
#!/bin/bash
# 🚀 배포 스크립트

# 빌드
echo "Building admin dashboard..."
npm run build

# 정적 파일 배포
echo "Deploying to AWS S3..."
aws s3 sync dist/ s3://your-admin-bucket/

# CloudFront 캐시 무효화
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"

echo "Deployment complete!"
```

### 모니터링

```typescript
// 📊 성능 모니터링
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Sentry 초기화
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_APP_ENV,
      tracesSampleRate: 0.1
    })
    
    // Google Analytics
    gtag('config', import.meta.env.VITE_GOOGLE_ANALYTICS_ID)
    
    // 성능 측정
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          // 페이지 로딩 시간 측정
          gtag('event', 'page_load_time', {
            value: Math.round(entry.loadEventEnd - entry.loadEventStart)
          })
        }
      })
    })
    
    observer.observe({ entryTypes: ['navigation'] })
    
    return () => observer.disconnect()
  }, [])
}

// 🚨 에러 바운더리
class AdminErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Sentry에 에러 보고
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    })
  }
  
  render() {
    if (this.state.hasError) {
      return <AdminErrorPage />
    }
    
    return this.props.children
  }
}
```

---

## 📊 현재 개발 상태

### ✅ 완료된 기능

- **API 클라이언트**: 포괄적인 E-commerce API 통합 (346줄)
- **인증 시스템**: 관리자 권한 기반 로그인/로그아웃
- **기본 구조**: React 19 + TypeScript + TailwindCSS
- **멀티 테마**: 5개 테마 (afternoon, dusk, evening, noon, twilight)
- **권한 시스템**: 역할 기반 접근 제어 설계

### 🟡 진행 중인 기능

- **UI 구현**: 대부분 페이지가 플레이스홀더 상태
- **E-commerce 관리**: API는 완성, 실제 관리 인터페이스 구현 중
- **대시보드**: 기본 구조 완성, 실시간 데이터 연동 필요

### ❌ 미구현 기능

- **실시간 알림**: Socket.IO 기반 알림 시스템
- **고급 차트**: 상세 분석 대시보드
- **사용자 관리**: 완전한 사용자 관리 인터페이스
- **시스템 설정**: 플랫폼 설정 관리 페이지

---

## 🎯 개발 로드맵

### Phase 1: 기본 UI 완성 (1개월)
- [ ] E-commerce 관리 페이지 구현
- [ ] 사용자 관리 페이지 구현
- [ ] 대시보드 실시간 데이터 연동
- [ ] 기본 CRUD 기능 완성

### Phase 2: 고급 기능 (1-2개월)
- [ ] 실시간 알림 시스템
- [ ] 고급 분석 차트
- [ ] 데이터 내보내기 기능
- [ ] 벌크 액션 기능

### Phase 3: 최적화 및 확장 (1개월)
- [ ] 성능 최적화
- [ ] 모바일 반응형
- [ ] PWA 기능
- [ ] 고급 필터링

---

*📄 이 문서는 O4O Platform Admin Dashboard 서비스의 포괄적인 기술 분석을 담고 있습니다.*