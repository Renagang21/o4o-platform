# 🏠 Main-Site 서비스 기술 문서

> **서비스 이름**: Main-Site (플랫폼 허브)  
> **포트**: 3011  
> **상태**: ✅ 고도로 구현된 React 19 애플리케이션

---

## 📋 서비스 개요

O4O Platform의 **핵심 허브 서비스**로, 모든 마이크로서비스를 통합하고 조율하는 통합 플랫폼입니다. React 19와 최신 기술 스택을 사용하여 **멀티 서비스 통합 경험**을 제공합니다.

### 🎯 핵심 역할
- **서비스 오케스트레이터**: 7개 마이크로서비스의 통합 진입점
- **통합 인증 시스템**: 플랫폼 전체의 중앙 인증 관리
- **역할 기반 라우팅**: 사용자 타입별 차별화된 경험 제공
- **공통 UI/UX**: 일관된 디자인 시스템과 사용자 경험

---

## 🏗️ 아키텍처

### 프로젝트 구조

```
services/main-site/
├── src/
│   ├── App.tsx                    # 메인 애플리케이션 라우터
│   ├── main.tsx                   # React 19 진입점
│   ├── api/                       # API 통합 계층
│   │   ├── admin/                 # 관리자 API 엔드포인트
│   │   │   ├── adminApi.ts
│   │   │   └── types.ts
│   │   ├── auth/                  # 인증 API
│   │   │   ├── authApi.ts
│   │   │   └── types.ts
│   │   ├── config/                # API 설정
│   │   │   ├── axios.ts           # Axios 설정
│   │   │   └── endpoints.ts       # 엔드포인트 정의
│   │   ├── forum/                 # Forum API 통합
│   │   │   ├── forumApi.ts
│   │   │   └── types.ts
│   │   └── products/              # 상품 API 통합
│   │       ├── productApi.ts
│   │       └── types.ts
│   ├── components/                # 재사용 가능한 컴포넌트
│   │   ├── admin/                 # 관리자 패널 컴포넌트
│   │   │   ├── AdminBreadcrumb.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   └── AdminSidebar.tsx
│   │   ├── auth/                  # 인증 컴포넌트
│   │   │   ├── LoginForm.tsx
│   │   │   ├── ModernLoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── PrivateRoute.tsx
│   │   │   └── RoleGate.tsx
│   │   ├── common/                # 공통 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── [40+ UI 컴포넌트들]
│   │   ├── dropshipping/          # 드롭시핑 컴포넌트
│   │   │   ├── CommissionManagementSystem.tsx
│   │   │   ├── CustomerTierManager.tsx
│   │   │   ├── PartnerDashboard.tsx
│   │   │   └── ProductInfoHub.tsx
│   │   └── theme/                 # 테마 관리
│   │       ├── MultiThemeContext.tsx
│   │       └── ThemeSelector.tsx
│   ├── pages/                     # 페이지 컴포넌트
│   │   ├── admin/                 # 관리자 페이지 (20+ 페이지)
│   │   ├── auth/                  # 인증 페이지
│   │   ├── dropshipping/          # 드롭시핑 페이지
│   │   ├── forum/                 # 포럼 페이지
│   │   ├── signage/               # 디지털 사이니지 페이지
│   │   └── [기타 페이지들]
│   ├── stores/                    # Zustand 상태 관리
│   │   ├── authStore.ts           # 인증 상태
│   │   ├── orderStore.ts          # 주문 상태
│   │   ├── productStore.ts        # 상품 상태
│   │   └── reviewStore.ts         # 리뷰 상태
│   ├── types/                     # TypeScript 정의
│   │   ├── order.ts
│   │   ├── product.ts
│   │   ├── review.ts
│   │   └── user.ts
│   └── utils/                     # 유틸리티 함수
│       ├── homePageData.ts
│       ├── logAccess.ts
│       ├── logRoleChange.ts
│       └── pageSystem.ts
├── shared/                        # 공유 컴포넌트 라이브러리
│   ├── components/
│   │   ├── admin/                 # 관리자 공유 컴포넌트
│   │   ├── dropshipping/          # 드롭시핑 공유 컴포넌트
│   │   ├── editor/                # 리치 텍스트 에디터
│   │   ├── layouts/               # 레이아웃 컴포넌트
│   │   ├── patterns/              # 디자인 패턴
│   │   ├── shortcodes/            # 숏코드 컴포넌트
│   │   ├── theme/                 # 테마 컴포넌트
│   │   └── ui/                    # UI 컴포넌트
│   ├── lib/                       # 공유 유틸리티
│   │   ├── api/                   # 공유 API 클라이언트
│   │   └── shortcode/             # 숏코드 라이브러리
│   └── types/                     # 공유 타입 정의
└── package.json
```

### 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| **Frontend** | React + TypeScript | 19.1.0 + 5.8.3 |
| **Build Tool** | Vite | 6.3.5 |
| **Styling** | TailwindCSS | 4.1.11 |
| **Routing** | React Router DOM | 7.6.0 |
| **State Management** | Zustand | 5.0.5 |
| **HTTP Client** | Axios | 1.10.0 |
| **Data Fetching** | TanStack React Query | 5.0.0 |
| **Forms** | React Hook Form | 7.49.3 |
| **Notifications** | React Hot Toast | 2.5.2 |
| **File Upload** | React Dropzone | 14.3.8 |
| **Icons** | Lucide React + React Icons | 0.523.0 + 5.5.0 |
| **Charts** | Chart.js + React Chartjs 2 | 4.4.9 + 5.3.0 |
| **Animation** | Motion | 12.19.2 |
| **Testing** | Vitest + Playwright | 2.1.9 + 1.53.1 |

---

## 🎯 핵심 기능

### 멀티 서비스 통합

```typescript
// 🚀 서비스 라우팅 시스템
const App = () => {
  return (
    <Router>
      <Routes>
        {/* 메인 허브 */}
        <Route path="/" element={<HomePage />} />
        
        {/* 인증 */}
        <Route path="/auth/*" element={<AuthRoutes />} />
        
        {/* 사용자 역할별 라우팅 */}
        <Route path="/admin/*" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <AdminRoutes />
          </RoleProtectedRoute>
        } />
        
        <Route path="/supplier/*" element={
          <RoleProtectedRoute allowedRoles={['supplier']}>
            <SupplierRoutes />
          </RoleProtectedRoute>
        } />
        
        <Route path="/retailer/*" element={
          <RoleProtectedRoute allowedRoles={['retailer']}>
            <RetailerRoutes />
          </RoleProtectedRoute>
        } />
        
        <Route path="/customer/*" element={
          <RoleProtectedRoute allowedRoles={['customer']}>
            <CustomerRoutes />
          </RoleProtectedRoute>
        } />
        
        {/* 서비스별 라우팅 */}
        <Route path="/dropshipping/*" element={<DropshippingRoutes />} />
        <Route path="/forum/*" element={<ForumRoutes />} />
        <Route path="/signage/*" element={<SignageRoutes />} />
        <Route path="/crowdfunding/*" element={<CrowdfundingRoutes />} />
        
        {/* 에디터 및 특수 기능 */}
        <Route path="/editor/*" element={<EditorRoutes />} />
        <Route path="/page-viewer/*" element={<PageViewerRoutes />} />
      </Routes>
    </Router>
  )
}
```

### 사용자 역할 관리 시스템

```typescript
// 👤 확장된 사용자 타입 시스템
type UserType = 'admin' | 'supplier' | 'retailer' | 'customer' | 'manager'

interface User {
  id: string
  email: string
  name: string
  userType: UserType
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active' | 'inactive'
  businessInfo?: BusinessInfo
  permissions: string[]
  createdAt: Date | string
  lastLoginAt?: Date | string
  
  // 확장 프로필 정보
  profile?: {
    avatar?: string
    phone?: string
    address?: Address
    preferences?: UserPreferences
    notifications?: NotificationSettings
  }
}

// 🔐 역할 기반 접근 제어
interface RoleBasedAccess {
  // 기본 권한
  'app.access': UserType[]
  'profile.edit': UserType[]
  'notifications.manage': UserType[]
  
  // 관리자 권한
  'admin.dashboard': ['admin']
  'admin.users.manage': ['admin']
  'admin.system.config': ['admin']
  
  // 비즈니스 권한
  'supplier.products.manage': ['admin', 'supplier']
  'retailer.orders.manage': ['admin', 'retailer']
  'customer.orders.view': ['admin', 'customer']
  
  // 서비스별 권한
  'dropshipping.access': ['admin', 'supplier', 'retailer']
  'signage.manage': ['admin', 'manager']
  'forum.moderate': ['admin']
  'crowdfunding.create': ['admin', 'supplier']
}

// 권한 확인 훅
const usePermission = (permission: string): boolean => {
  const { user } = useAuth()
  return user?.permissions?.includes(permission) || false
}

// 역할 보호 컴포넌트
const RoleProtectedRoute = ({ 
  allowedRoles, 
  children, 
  fallback = <ForbiddenPage /> 
}: RoleProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" />
  }
  
  if (!allowedRoles.includes(user.userType)) {
    return fallback
  }
  
  return children
}
```

### 드롭시핑 마켓플레이스

```typescript
// 🚚 드롭시핑 시스템 (4개 역할 통합)
interface DropshippingEcosystem {
  // 공급업체 (Supplier)
  supplier: {
    // 상품 관리
    productManagement: {
      createProduct: (product: ProductData) => Promise<Product>
      updateInventory: (productId: string, quantity: number) => Promise<void>
      setPricing: (productId: string, pricing: PricingTiers) => Promise<void>
      manageShipping: (productId: string, shipping: ShippingOptions) => Promise<void>
    }
    
    // 파트너 관리
    partnerManagement: {
      approveRetailer: (retailerId: string) => Promise<void>
      setCommissionRates: (retailerId: string, rates: CommissionRates) => Promise<void>
      viewSalesAnalytics: () => Promise<SalesAnalytics>
    }
  }
  
  // 리테일러 (Retailer)
  retailer: {
    // 상품 소싱
    productSourcing: {
      browseSupplierCatalog: () => Promise<Product[]>
      requestProductAccess: (productId: string) => Promise<void>
      importToStore: (productId: string) => Promise<void>
      customizeListing: (productId: string, customization: ListingCustomization) => Promise<void>
    }
    
    // 주문 관리
    orderManagement: {
      receiveOrder: (order: Order) => Promise<void>
      forwardToSupplier: (orderId: string) => Promise<void>
      trackFulfillment: (orderId: string) => Promise<TrackingInfo>
      handleCustomerService: (orderId: string, issue: Issue) => Promise<void>
    }
  }
  
  // 고객 (Customer)
  customer: {
    // 쇼핑 경험
    shopping: {
      browseProducts: (filters: ProductFilters) => Promise<Product[]>
      compareProducts: (productIds: string[]) => Promise<ProductComparison>
      placeOrder: (orderData: OrderData) => Promise<Order>
      trackOrder: (orderId: string) => Promise<OrderStatus>
    }
    
    // 서비스
    customerService: {
      contactSupport: (issue: CustomerIssue) => Promise<SupportTicket>
      requestReturn: (orderId: string, reason: ReturnReason) => Promise<ReturnRequest>
      leaveReview: (productId: string, review: ReviewData) => Promise<Review>
    }
  }
  
  // 관리자 (Admin)
  admin: {
    // 플랫폼 관리
    platformManagement: {
      moderateContent: (contentId: string, action: ModerationAction) => Promise<void>
      resolveDisputes: (disputeId: string, resolution: DisputeResolution) => Promise<void>
      manageCommissions: (commissionData: CommissionData) => Promise<void>
      viewPlatformAnalytics: () => Promise<PlatformAnalytics>
    }
  }
}

// 실시간 동기화 시스템
interface RealTimeSyncSystem {
  // 재고 동기화
  inventorySync: {
    supplierUpdate: (productId: string, quantity: number) => void
    retailerNotification: (productId: string, status: InventoryStatus) => void
    customerAvailability: (productId: string, isAvailable: boolean) => void
  }
  
  // 주문 플로우 동기화
  orderSync: {
    customerPlacesOrder: (orderData: OrderData) => Promise<void>
    retailerReceivesOrder: (orderId: string) => Promise<void>
    supplierGetsNotification: (orderId: string) => Promise<void>
    fulfillmentUpdates: (orderId: string, status: FulfillmentStatus) => Promise<void>
  }
  
  // 가격 동기화
  pricingSync: {
    supplierPriceChange: (productId: string, newPrice: number) => void
    retailerMarginUpdate: (productId: string, margin: number) => void
    customerPriceDisplay: (productId: string) => number
  }
}
```

### 고급 에디터 시스템

```typescript
// ✏️ TipTap 기반 리치 텍스트 에디터
interface AdvancedEditor {
  // 기본 에디터 기능
  basicFeatures: {
    textFormatting: ['bold', 'italic', 'underline', 'strike']
    lists: ['bulletList', 'orderedList']
    alignment: ['left', 'center', 'right', 'justify']
    headers: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  }
  
  // 고급 기능
  advancedFeatures: {
    // 블록 삽입기
    blockInserter: {
      insertImage: (imageData: ImageData) => void
      insertVideo: (videoUrl: string) => void
      insertTable: (rows: number, cols: number) => void
      insertCodeBlock: (language: string) => void
      insertQuote: () => void
    }
    
    // 숏코드 시스템
    shortcodes: {
      insertButton: (buttonData: ButtonShortcode) => void
      insertPricingTable: (pricingData: PricingTableShortcode) => void
      insertProductGrid: (productIds: string[]) => void
      insertTestimonial: (testimonialData: TestimonialShortcode) => void
      insertContactForm: (formData: ContactFormShortcode) => void
    }
    
    // 패턴 라이브러리
    patterns: {
      heroSection: HeroPattern[]
      featureSection: FeaturePattern[]
      testimonialSection: TestimonialPattern[]
      ctaSection: CTAPattern[]
      footerSection: FooterPattern[]
    }
  }
  
  // AI 어시스턴트
  aiAssistant: {
    contentSuggestions: (context: string) => Promise<string[]>
    grammarCheck: (text: string) => Promise<GrammarSuggestion[]>
    seoOptimization: (content: string) => Promise<SEOSuggestion[]>
    translationSupport: (text: string, targetLang: string) => Promise<string>
  }
}

// 에디터 컴포넌트들
const TiptapEditor = ({ content, onChange, extensions }: EditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Video,
      Table,
      ShortcodeExtension,
      PatternExtension,
      ...extensions
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    }
  })
  
  return (
    <div className="editor-container">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      <EditorInspector editor={editor} />
    </div>
  )
}
```

### 디지털 사이니지 관리

```typescript
// 📺 디지털 사이니지 통합 관리
interface SignageManagement {
  // 콘텐츠 관리
  contentManagement: {
    createPlaylist: (playlistData: PlaylistData) => Promise<Playlist>
    scheduleContent: (scheduleData: ScheduleData) => Promise<Schedule>
    manageDisplays: (storeId: string) => Promise<Display[]>
    monitorPerformance: (contentId: string) => Promise<PerformanceMetrics>
  }
  
  // 매장 관리
  storeManagement: {
    registerStore: (storeData: StoreData) => Promise<Store>
    configureDisplay: (storeId: string, config: DisplayConfig) => Promise<void>
    managePermissions: (storeId: string, permissions: StorePermissions) => Promise<void>
    viewAnalytics: (storeId: string) => Promise<StoreAnalytics>
  }
  
  // 실시간 제어
  realTimeControl: {
    sendCommand: (storeId: string, command: DisplayCommand) => Promise<void>
    updateContent: (storeId: string, contentId: string) => Promise<void>
    emergencyBroadcast: (message: string, storeIds: string[]) => Promise<void>
    systemHealthCheck: (storeId: string) => Promise<HealthStatus>
  }
}

// 사이니지 컴포넌트
const SignageScheduler = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  
  return (
    <div className="signage-scheduler">
      <StoreSelector onStoreSelect={setSelectedStore} />
      <ScheduleCalendar schedules={schedules} />
      <ContentLibrary />
      <PlaylistEditor />
      <RealTimePreview store={selectedStore} />
    </div>
  )
}
```

---

## 🗄️ 상태 관리

### Zustand 스토어 아키텍처

```typescript
// 🏪 인증 스토어
interface AuthStore {
  // 상태
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  
  // 액션
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  register: (userData: RegisterData) => Promise<void>
  updateProfile: (profileData: ProfileUpdate) => Promise<void>
  switchRole: (newRole: UserType) => Promise<void>
  
  // 권한 체크
  hasPermission: (permission: string) => boolean
  hasRole: (role: UserType) => boolean
  canAccess: (resource: string) => boolean
}

// 🛍️ 상품 스토어
interface ProductStore {
  // 상태
  products: Product[]
  currentProduct: Product | null
  filters: ProductFilters
  isLoading: boolean
  
  // 드롭시핑 관련
  supplierProducts: Product[]  // 공급업체가 제공하는 상품
  retailerProducts: Product[]  // 리테일러가 판매하는 상품
  
  // 액션
  fetchProducts: (filters?: ProductFilters) => Promise<void>
  fetchProduct: (id: string) => Promise<void>
  createProduct: (productData: CreateProductData) => Promise<void>
  updateProduct: (id: string, updates: ProductUpdate) => Promise<void>
  
  // 드롭시핑 액션
  importProduct: (productId: string) => Promise<void>
  customizeListing: (productId: string, customization: ListingCustomization) => Promise<void>
  syncInventory: (productId: string) => Promise<void>
  
  // 가격 계산
  calculateRetailPrice: (productId: string, userType: UserType) => number
  calculateCommission: (productId: string, salePrice: number) => number
}

// 📦 주문 스토어
interface OrderStore {
  // 상태
  orders: Order[]
  currentOrder: Order | null
  cart: CartItem[]
  
  // 드롭시핑 주문 플로우
  supplierOrders: Order[]      // 공급업체가 처리할 주문들
  retailerOrders: Order[]      // 리테일러가 받은 주문들
  customerOrders: Order[]      // 고객이 넣은 주문들
  
  // 액션
  addToCart: (productId: string, quantity: number) => void
  removeFromCart: (itemId: string) => void
  updateCartQuantity: (itemId: string, quantity: number) => void
  
  // 주문 처리
  createOrder: (orderData: OrderData) => Promise<Order>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  trackOrder: (orderId: string) => Promise<TrackingInfo>
  
  // 드롭시핑 플로우
  forwardOrderToSupplier: (orderId: string) => Promise<void>
  fulfillOrder: (orderId: string, fulfillmentData: FulfillmentData) => Promise<void>
  handleReturn: (orderId: string, returnData: ReturnData) => Promise<void>
}

// 📝 리뷰 스토어
interface ReviewStore {
  reviews: Review[]
  currentProductReviews: Review[]
  
  // 액션
  fetchReviews: (productId: string) => Promise<void>
  createReview: (reviewData: CreateReviewData) => Promise<void>
  updateReview: (reviewId: string, updates: ReviewUpdate) => Promise<void>
  deleteReview: (reviewId: string) => Promise<void>
  
  // 신뢰도 관련
  calculateTrustScore: (reviews: Review[]) => number
  flagInappropriateContent: (reviewId: string, reason: string) => Promise<void>
  verifyPurchase: (reviewId: string) => Promise<boolean>
}
```

### 실시간 상태 동기화

```typescript
// 🔄 실시간 동기화 시스템
interface RealTimeSync {
  // Socket.IO 연결
  socket: Socket
  
  // 인벤토리 동기화
  syncInventory: () => void
  onInventoryUpdate: (callback: (update: InventoryUpdate) => void) => void
  
  // 주문 동기화
  syncOrders: () => void
  onOrderUpdate: (callback: (update: OrderUpdate) => void) => void
  
  // 사용자 활동 동기화
  syncUserActivity: () => void
  onUserStatusChange: (callback: (update: UserStatusUpdate) => void) => void
  
  // 알림 시스템
  onNotification: (callback: (notification: Notification) => void) => void
  markNotificationAsRead: (notificationId: string) => void
}

// 실시간 동기화 훅
const useRealTimeSync = () => {
  const socket = useSocket()
  const { updateProduct } = useProductStore()
  const { updateOrder } = useOrderStore()
  
  useEffect(() => {
    // 인벤토리 업데이트 수신
    socket.on('inventory-update', (update: InventoryUpdate) => {
      updateProduct(update.productId, { stockQuantity: update.quantity })
    })
    
    // 주문 상태 업데이트 수신
    socket.on('order-status-update', (update: OrderUpdate) => {
      updateOrder(update.orderId, { status: update.status })
    })
    
    return () => {
      socket.off('inventory-update')
      socket.off('order-status-update')
    }
  }, [socket, updateProduct, updateOrder])
}
```

---

## 🎨 UI/UX 시스템

### 테마 시스템

```typescript
// 🎨 멀티 테마 시스템
interface ThemeSystem {
  themes: {
    afternoon: AfternoonTheme
    dusk: DuskTheme
    evening: EveningTheme
    noon: NoonTheme
    twilight: TwilightTheme
  }
  
  currentTheme: string
  
  // 테마 관리
  setTheme: (themeName: string) => void
  getThemeConfig: (themeName: string) => ThemeConfig
  preloadThemes: () => Promise<void>
  
  // 동적 테마 로딩
  loadThemeCSS: (themeName: string) => Promise<void>
  unloadThemeCSS: (themeName: string) => void
}

// 테마 컨텍스트
const MultiThemeContext = createContext<ThemeSystem | null>(null)

export const MultiThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState('afternoon')
  
  const setTheme = useCallback((themeName: string) => {
    // CSS 변수 업데이트
    const root = document.documentElement
    const themeConfig = getThemeConfig(themeName)
    
    Object.entries(themeConfig.cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
    
    setCurrentTheme(themeName)
    localStorage.setItem('selected-theme', themeName)
  }, [])
  
  return (
    <MultiThemeContext.Provider value={{ 
      themes, 
      currentTheme, 
      setTheme 
    }}>
      {children}
    </MultiThemeContext.Provider>
  )
}

// 테마 셀렉터 컴포넌트
const ThemeSelector = () => {
  const { currentTheme, setTheme } = useTheme()
  
  return (
    <div className="theme-selector">
      {Object.keys(themes).map(themeName => (
        <button
          key={themeName}
          className={`theme-option ${currentTheme === themeName ? 'active' : ''}`}
          onClick={() => setTheme(themeName)}
        >
          <ThemePreview theme={themeName} />
          <span>{themeName}</span>
        </button>
      ))}
    </div>
  )
}
```

### 공통 UI 컴포넌트 라이브러리

```typescript
// 🧩 재사용 가능한 UI 컴포넌트들

// 버튼 컴포넌트
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
}

const Button = ({ variant, size, loading, disabled, icon, children, onClick }: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors'
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100'
  }
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner className="mr-2" />}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}

// 모달 컴포넌트
const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 테이블 컴포넌트
interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  pagination?: PaginationConfig
  onRowClick?: (row: T) => void
}

const Table = <T,>({ data, columns, loading, pagination, onRowClick }: TableProps<T>) => {
  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      {loading && <TableSkeleton />}
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(column => (
              <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr
              key={index}
              className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(column => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {pagination && <TablePagination {...pagination} />}
    </div>
  )
}
```

---

## 📊 현재 개발 상태

### ✅ 완료된 기능

**핵심 인프라:**
- React 19 + TypeScript + Vite 기반 모던 아키텍처
- 멀티 서비스 라우팅 시스템
- 역할 기반 접근 제어 (RBAC)
- JWT 인증 시스템
- Zustand 기반 상태 관리

**UI/UX 시스템:**
- 40개 이상의 재사용 가능한 UI 컴포넌트
- 5개 테마 멀티 테마 시스템
- 반응형 디자인 (TailwindCSS)
- 애니메이션 시스템 (Motion)

**드롭시핑 마켓플레이스:**
- 4개 역할 (공급업체, 리테일러, 고객, 관리자) 완전 구현
- 복잡한 커미션 관리 시스템
- 실시간 재고 동기화
- 고객 계층 관리 시스템

**고급 에디터:**
- TipTap 기반 리치 텍스트 에디터
- 숏코드 시스템 (20개 이상 숏코드)
- 패턴 라이브러리
- 블록 삽입기

**디지털 사이니지:**
- 콘텐츠 스케줄링 시스템
- 매장 관리 인터페이스
- 실시간 제어 기능

### 🟡 진행 중인 기능

**API 통합:**
- E-commerce API 연동 (목업 → 실제 API)
- Forum API 통합
- Crowdfunding API 통합
- 실시간 알림 시스템

**성능 최적화:**
- 코드 스플리팅 최적화
- 이미지 및 자산 최적화
- 캐싱 전략 구현

### ❌ 미구현 기능

**모바일 최적화:**
- PWA 기능
- 오프라인 지원
- 푸시 알림

**고급 분석:**
- 사용자 행동 추적
- A/B 테스트 시스템
- 성능 모니터링

**보안 강화:**
- 2FA 인증
- 보안 감사 로그
- 데이터 암호화

---

## 🔗 서비스 통합

### API 클라이언트 아키텍처

```typescript
// 📡 통합 API 클라이언트
class ApiClient {
  private baseURL: string
  private token: string | null = null
  
  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    // 요청 인터셉터
    axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })
    
    // 응답 인터셉터
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // 토큰 만료 시 자동 갱신
          await this.refreshToken()
          return axios.request(error.config)
        }
        return Promise.reject(error)
      }
    )
  }
  
  // 서비스별 API 클라이언트
  get auth() { return new AuthApi(this) }
  get products() { return new ProductsApi(this) }
  get orders() { return new OrdersApi(this) }
  get forum() { return new ForumApi(this) }
  get crowdfunding() { return new CrowdfundingApi(this) }
  get signage() { return new SignageApi(this) }
  get admin() { return new AdminApi(this) }
}

// API 엔드포인트 정의
const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    PROFILE: '/api/auth/profile'
  },
  PRODUCTS: {
    LIST: '/api/products',
    DETAIL: (id: string) => `/api/products/${id}`,
    CREATE: '/api/products',
    UPDATE: (id: string) => `/api/products/${id}`,
    DELETE: (id: string) => `/api/products/${id}`
  },
  ORDERS: {
    LIST: '/api/orders',
    DETAIL: (id: string) => `/api/orders/${id}`,
    CREATE: '/api/orders',
    UPDATE: (id: string) => `/api/orders/${id}`
  },
  FORUM: {
    POSTS: '/api/forum/posts',
    POST: (id: string) => `/api/forum/posts/${id}`,
    COMMENTS: (postId: string) => `/api/forum/posts/${postId}/comments`
  },
  CROWDFUNDING: {
    PROJECTS: '/api/crowdfunding/projects',
    PROJECT: (id: string) => `/api/crowdfunding/projects/${id}`,
    BACK: '/api/crowdfunding/back'
  },
  SIGNAGE: {
    STORES: '/api/signage/stores',
    CONTENT: '/api/signage/content',
    SCHEDULES: '/api/signage/schedules'
  },
  ADMIN: {
    STATS: '/api/admin/stats',
    USERS: '/api/admin/users',
    REPORTS: '/api/admin/reports'
  }
}
```

---

## 🚀 개발 로드맵

### Phase 1: API 통합 완성 (1-2개월)
- [ ] 모든 서비스 API 완전 연동
- [ ] 실시간 알림 시스템 구현
- [ ] 오류 처리 및 로딩 상태 개선
- [ ] 폼 검증 시스템 완성

### Phase 2: 성능 최적화 (1개월)
- [ ] 코드 스플리팅 최적화
- [ ] React Query 완전 구현
- [ ] 이미지 및 자산 최적화
- [ ] 캐싱 전략 구현

### Phase 3: 모바일 및 PWA (1개월)
- [ ] PWA 기능 구현
- [ ] 오프라인 지원
- [ ] 푸시 알림
- [ ] 모바일 UX 최적화

### Phase 4: 고급 기능 (1-2개월)
- [ ] A/B 테스트 시스템
- [ ] 고급 분석 대시보드
- [ ] 보안 강화 (2FA, 감사 로그)
- [ ] 국제화 (i18n) 지원

---

## 🎯 비즈니스 가치

### 플랫폼 허브로서의 역할

1. **통합 사용자 경험**: 모든 서비스에 일관된 UX/UI 제공
2. **효율적 개발**: 공통 컴포넌트와 라이브러리 재사용
3. **확장성**: 새로운 서비스 추가 시 빠른 통합 가능
4. **유지보수성**: 중앙집중식 상태 관리와 API 통합

### 기술적 우위

- **최신 기술 스택**: React 19, TypeScript 5.8, Vite 6
- **고도화된 아키텍처**: 마이크로서비스 오케스트레이션
- **확장 가능한 설계**: 모듈형 컴포넌트 아키텍처
- **성능 최적화**: 지연 로딩, 캐싱, 번들 최적화

---

*📄 이 문서는 O4O Platform Main-Site 서비스의 포괄적인 기술 분석을 담고 있습니다.*