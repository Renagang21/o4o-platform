# 🚀 O4O Platform 개발 가이드

## 📖 **개요**
O4O Platform 개발을 위한 종합 가이드로, 환경 설정부터 배포까지 모든 단계를 다룹니다.

## 🏗️ **프로젝트 아키텍처**

### **전체 구조**
```
O4O Platform (모노레포)
├── 🌐 Frontend Services
│   ├── main-site (React 19 + Vite)          # 메인 웹사이트
│   ├── admin-dashboard (React 18)           # 관리자 대시보드
│   └── crowdfunding (React + Vite)          # 크라우드펀딩 플랫폼
├── 🔧 Backend Services  
│   ├── api-server (Node.js + Express)       # 통합 API 서버
│   └── Database (PostgreSQL + TypeORM)     # 데이터베이스
├── 📦 Shared Libraries
│   ├── shared/components                    # 공통 UI 컴포넌트
│   ├── shared/types                         # TypeScript 타입 정의
│   └── shared/utils                         # 유틸리티 함수
└── 🛠️ Development Tools
    ├── scripts/                             # 개발/배포 스크립트
    ├── docs/                                # 프로젝트 문서
    └── tests/                               # 테스트 파일
```

### **기술 스택**
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js 20, Express, TypeORM, PostgreSQL
- **Testing**: Vitest, React Testing Library, MSW
- **State Management**: React Query, Zustand
- **Authentication**: JWT, Role-based Access Control
- **Deployment**: AWS Lightsail, PM2, Nginx

## ⚙️ **환경 설정**

### **1. 시스템 요구사항**
```bash
# Node.js 20.x (LTS)
node --version  # v20.18.0+

# npm 9.x+
npm --version   # 9.8.0+

# PostgreSQL 15+
psql --version  # 15.0+

# Git 2.x+
git --version   # 2.40.0+
```

### **2. 개발 환경 설정**
```bash
# 1. 저장소 클론
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform

# 2. Node.js 버전 설정 (NVM 권장)
nvm install 20.18.0
nvm use 20.18.0
nvm alias default 20.18.0

# 3. 의존성 설치
npm run install:all

# 4. 환경 변수 설정
cp services/api-server/.env.example services/api-server/.env
cp services/main-site/.env.example services/main-site/.env
cp services/admin-dashboard/.env.example services/admin-dashboard/.env

# 5. 데이터베이스 설정
# PostgreSQL 설치 및 데이터베이스 생성
createdb o4o_platform

# 6. 개발 서버 시작
npm run dev:all
```

### **3. IDE 설정 (Cursor AI 권장)**
```bash
# Cursor AI 설치 후 프로젝트 열기
cursor .

# 또는 VSCode 사용
code .

# 권장 확장 프로그램이 자동으로 설치됨
# .cursor/extensions.json 참조
```

## 🛠️ **개발 워크플로우**

### **일일 개발 루틴**
```bash
# 1. 최신 코드 동기화
git pull origin main

# 2. 새 기능 브랜치 생성
git checkout -b feature/your-feature-name

# 3. 개발 서버 시작
npm run dev:smart  # 스마트 시작 (의존성 체크 포함)

# 4. 개발 진행
# - 코드 작성
# - 테스트 작성
# - 타입 체크

# 5. 코드 품질 검사
npm run type-check:all
npm run lint:all
npm run test:all

# 6. 커밋 및 푸시
git add .
git commit -m "feat(component): add new feature"
git push origin feature/your-feature-name

# 7. Pull Request 생성
```

### **브랜치 전략**
```
main (프로덕션)
├── develop (개발 통합)
│   ├── feature/user-authentication
│   ├── feature/product-management
│   └── feature/order-processing
├── release/v2.1.0 (릴리즈 준비)
└── hotfix/security-patch (긴급 수정)
```

## 🎯 **개발 패턴**

### **컴포넌트 개발 패턴**
```typescript
// 1. 타입 정의
interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  className?: string;
}

// 2. 컴포넌트 구현
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  className
}) => {
  // 로직 구현
  const handleEdit = () => onEdit?.(product);
  const handleDelete = () => onDelete?.(product.id);

  // 렌더링
  return (
    <div className={cn("product-card", className)}>
      {/* UI 구현 */}
    </div>
  );
};

// 3. 테스트 작성
describe('ProductCard', () => {
  test('renders product information', () => {
    const mockProduct = createMockProduct();
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
  });
});
```

### **API 훅 개발 패턴**
```typescript
// 1. 타입 정의
interface UseProductsOptions {
  page?: number;
  limit?: number;
  filters?: ProductFilters;
}

// 2. 훅 구현
export const useProducts = ({ 
  page = 1, 
  limit = 20, 
  filters = {} 
}: UseProductsOptions = {}) => {
  return useQuery({
    queryKey: ['products', page, limit, filters],
    queryFn: () => EcommerceApi.getProducts(page, limit, filters),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// 3. 뮤테이션 훅
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productData: CreateProductRequest) => 
      EcommerceApi.createProduct(productData),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('상품이 성공적으로 생성되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '상품 생성에 실패했습니다.');
    },
  });
};

// 4. 테스트 작성
describe('useProducts', () => {
  test('fetches products successfully', async () => {
    vi.mocked(EcommerceApi.getProducts).mockResolvedValue(mockResponse);
    
    const { result } = renderHook(() => useProducts(), {
      wrapper: createTestWrapper()
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toEqual(mockResponse);
  });
});
```

### **상태 관리 패턴**
```typescript
// Zustand 스토어 패턴
interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,
  
  addItem: (product, quantity) => set((state) => {
    const existingItem = state.items.find(item => item.productId === product.id);
    
    if (existingItem) {
      return {
        ...state,
        items: state.items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      };
    }
    
    return {
      ...state,
      items: [...state.items, {
        productId: product.id,
        productName: product.name,
        price: product.retailPrice,
        quantity,
        total: product.retailPrice * quantity,
      }],
    };
  }),
  
  // 다른 액션들...
}));
```

## 🧪 **테스트 개발**

### **테스트 구조**
```
__tests__/
├── components/              # 컴포넌트 테스트
│   ├── ProductCard.test.tsx
│   └── ProductList.test.tsx
├── hooks/                   # 훅 테스트
│   ├── useProducts.test.tsx
│   └── useOrders.test.tsx
├── utils/                   # 유틸리티 테스트
│   └── formatters.test.ts
└── integration/             # 통합 테스트
    └── api.integration.test.ts
```

### **테스트 작성 패턴**
```typescript
// 1. 단위 테스트
describe('formatPrice', () => {
  test('formats price correctly', () => {
    expect(formatPrice(15000)).toBe('₩15,000');
    expect(formatPrice(0)).toBe('₩0');
    expect(formatPrice(1234567)).toBe('₩1,234,567');
  });
});

// 2. 컴포넌트 테스트
describe('ProductCard', () => {
  test('renders product information', () => {
    const product = createMockProduct();
    render(<ProductCard product={product} />);
    
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(formatPrice(product.retailPrice))).toBeInTheDocument();
  });
  
  test('handles user interactions', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const product = createMockProduct();
    
    render(<ProductCard product={product} onEdit={onEdit} />);
    
    await user.click(screen.getByRole('button', { name: /편집/i }));
    expect(onEdit).toHaveBeenCalledWith(product);
  });
});

// 3. 훅 테스트
describe('useProducts', () => {
  test('loads products successfully', async () => {
    const mockData = [createMockProduct()];
    vi.mocked(EcommerceApi.getProducts).mockResolvedValue({
      data: mockData,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    
    const { result } = renderHook(() => useProducts(), {
      wrapper: createTestWrapper()
    });
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data?.data).toEqual(mockData);
  });
});
```

## 📦 **패키지 관리**

### **워크스페이스 구조**
```json
// package.json (루트)
{
  "workspaces": [
    "services/*",
    "packages/*"
  ],
  "scripts": {
    "dev:all": "concurrently \"npm run dev --workspace=api-server\" \"npm run dev --workspace=main-site\" \"npm run dev --workspace=admin-dashboard\"",
    "build:all": "npm run build --workspaces",
    "test:all": "npm run test --workspaces",
    "type-check:all": "npm run type-check --workspaces"
  }
}
```

### **의존성 관리**
```bash
# 루트 레벨 의존성 설치
npm install -w root typescript vitest

# 특정 워크스페이스에 의존성 설치
npm install -w api-server express typeorm
npm install -w main-site react@19 react-dom@19

# 모든 워크스페이스 의존성 설치
npm run install:all

# 의존성 업데이트
npm update --workspaces
```

## 🔧 **유용한 개발 도구**

### **코드 생성 스크립트**
```bash
# 새 컴포넌트 생성
npm run generate:component ProductCard

# 새 API 훅 생성
npm run generate:hook useProducts

# 새 페이지 생성
npm run generate:page ProductManagement
```

### **개발 서버 관리**
```bash
# 스마트 개발 시작 (의존성 체크 포함)
npm run dev:smart

# 개별 서비스 시작
npm run dev:api      # API 서버만
npm run dev:web      # 웹사이트만
npm run dev:admin    # 관리자 대시보드만

# 헬스 체크
npm run health:all

# 로그 확인
npm run logs:api
npm run logs:web
```

### **코드 품질 도구**
```bash
# 타입 체크
npm run type-check:all

# 린트 검사
npm run lint:all

# 자동 수정
npm run lint:fix

# 포맷팅
npm run format

# 테스트 커버리지
npm run test:coverage
```

## 🚀 **배포 프로세스**

### **로컬 배포 테스트**
```bash
# 1. 빌드 테스트
npm run build:all

# 2. 프로덕션 모드 테스트
npm run start:prod

# 3. E2E 테스트
npm run test:e2e

# 4. 성능 테스트
npm run test:performance
```

### **프로덕션 배포**
```bash
# 1. 자동 배포 (GitHub Actions)
git push origin main

# 2. 수동 배포
./scripts/deploy-to-lightsail.sh

# 3. 배포 상태 확인
npm run health:production
```

## 📊 **모니터링 및 로깅**

### **개발 환경 모니터링**
```bash
# 서비스 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 메모리 사용량 확인
pm2 monit

# 재시작
pm2 restart all
```

### **에러 추적**
```typescript
// 에러 바운더리 패턴
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅
    console.error('Error caught by boundary:', error, errorInfo);
    
    // 운영 환경에서는 에러 추적 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // Sentry, LogRocket 등
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

## 🔒 **보안 고려사항**

### **인증 및 권한**
```typescript
// JWT 토큰 관리
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    const response = await AuthApi.login(credentials);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('token', response.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 권한 확인 HOC
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: string
) => {
  return (props: P) => {
    const { user } = useAuth();
    
    if (!user) {
      return <Redirect to="/login" />;
    }
    
    if (requiredRole && user.role !== requiredRole) {
      return <AccessDenied />;
    }
    
    return <WrappedComponent {...props} />;
  };
};
```

### **데이터 검증**
```typescript
// Zod를 사용한 타입 안전한 검증
import { z } from 'zod';

const CreateProductSchema = z.object({
  name: z.string().min(1, '상품명은 필수입니다').max(100),
  description: z.string().max(1000),
  retailPrice: z.number().positive('가격은 양수여야 합니다'),
  stock: z.number().int().min(0, '재고는 0 이상이어야 합니다'),
  category: z.string().min(1, '카테고리는 필수입니다'),
});

export type CreateProductRequest = z.infer<typeof CreateProductSchema>;

// API에서 사용
export const createProduct = async (data: unknown): Promise<Product> => {
  const validatedData = CreateProductSchema.parse(data);
  return EcommerceApi.createProduct(validatedData);
};
```

## 📋 **체크리스트**

### **새 기능 개발**
- [ ] 요구사항 분석 완료
- [ ] 기술 스택 결정
- [ ] API 명세 작성
- [ ] 컴포넌트 설계
- [ ] 타입 정의 작성
- [ ] 구현 완료
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 코드 리뷰 완료
- [ ] 문서 업데이트

### **배포 전 확인**
- [ ] 빌드 성공
- [ ] 테스트 통과 (단위, 통합, E2E)
- [ ] 타입 체크 통과
- [ ] 린트 검사 통과
- [ ] 보안 검토 완료
- [ ] 성능 테스트 통과
- [ ] 문서 업데이트
- [ ] 배포 계획 검토

### **코드 리뷰**
- [ ] 기능 요구사항 충족
- [ ] 코드 품질 (가독성, 재사용성)
- [ ] 성능 최적화
- [ ] 보안 고려사항
- [ ] 테스트 커버리지
- [ ] 문서화

## 🛠️ **트러블슈팅**

### **일반적인 문제들**

#### **Node.js 버전 문제**
```bash
# 현재 버전 확인
node --version

# NVM으로 올바른 버전 설치
nvm install 20.18.0
nvm use 20.18.0
nvm alias default 20.18.0
```

#### **의존성 설치 오류**
```bash
# 캐시 정리
npm cache clean --force

# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

#### **포트 충돌**
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 다른 포트 사용
PORT=3001 npm run dev
```

#### **TypeScript 오류**
```bash
# 타입 캐시 정리
npx tsc --build --clean

# 타입 정의 재설치
npm install @types/node @types/react --save-dev
```

---

**💡 이 가이드는 O4O Platform 개발의 기본서입니다. 프로젝트에 참여하는 모든 개발자는 이 가이드를 숙지하고 따라주세요!**