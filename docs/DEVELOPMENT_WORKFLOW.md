# O4O Platform Development Workflow

**버전**: 2.0  
**최종 업데이트**: 2025-07-02  
**적용 범위**: 모든 개발팀 구성원  

---

## 🎯 개발 워크플로우 개요

O4O Platform은 모노레포 기반 마이크로서비스 아키텍처로 구성되어 있으며, 효율적인 협업을 위한 체계적인 개발 워크플로우를 제공합니다.

### **핵심 원칙**
1. **안전성 우선**: 모든 변경사항은 검증 후 배포
2. **점진적 개발**: 기존 기능을 보호하며 새 기능 추가
3. **문서화 의무**: 모든 변경사항은 문서화 필수
4. **코드 품질**: TypeScript strict mode, ESLint, Prettier 준수

---

## 🚀 개발 환경 설정

### **1. 초기 설정**

```bash
# 1. 저장소 클론
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform

# 2. Node.js 20 설정 (Volta 권장)
volta install node@20

# 3. 전체 의존성 설치
npm run install:all

# 4. 환경 변수 설정
cp .env.example .env
# .env 파일 편집 필요

# 5. PostgreSQL 설정 (Docker 미사용)
# 로컬에 PostgreSQL 15+ 직접 설치

# 6. 데이터베이스 초기화
cd services/api-server
npm run migration:run
npm run create-admin  # 관리자 계정 생성
```

### **2. 개발 서버 시작**

```bash
# 방법 1: 모든 서비스 동시 시작 (권장)
npm run dev:all

# 방법 2: 개별 서비스 시작
npm run dev:api          # API 서버 (port 4000)
npm run dev:web          # 메인 사이트 (port 3000)
npm run dev:admin        # 관리자 대시보드

# 방법 3: 스마트 시작 (의존성 체크 포함)
npm run dev:smart
```

### **3. 개발 도구 설정**

#### **VSCode 설정 (권장)**
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

#### **필수 VSCode 확장**
- TypeScript and JavaScript Language Features
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- Auto Rename Tag
- GitLens

---

## 🔄 Git 워크플로우

### **브랜치 전략**

```
main (프로덕션)
├── develop (개발 통합)
├── feature/기능명 (기능 개발)
├── hotfix/수정명 (긴급 수정)
└── release/버전명 (릴리스 준비)
```

### **기능 개발 프로세스**

#### **1. 브랜치 생성**
```bash
# develop 브랜치에서 시작
git checkout develop
git pull origin develop

# 기능 브랜치 생성
git checkout -b feature/user-authentication
```

#### **2. 개발 진행**
```bash
# 1. 개발 서버 시작
npm run dev:all

# 2. 코드 작성
# - TypeScript strict mode 준수
# - ESLint 규칙 준수
# - 기존 기능 보호 원칙

# 3. 실시간 검증
npm run type-check:all  # TypeScript 검사
npm run lint:all        # ESLint 검사
npm run test            # 테스트 실행
```

#### **3. 커밋 규칙**

```bash
# Conventional Commits 규칙 준수
git commit -m "feat: add user authentication API"
git commit -m "fix: resolve login token expiration issue"
git commit -m "docs: update API documentation"
git commit -m "refactor: improve user service performance"
git commit -m "test: add unit tests for auth module"
```

**커밋 타입**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경

#### **4. Pull Request 생성**

```bash
# 브랜치 푸시
git push origin feature/user-authentication

# GitHub에서 PR 생성
# 제목: feat: Add user authentication system
# 내용: PR 템플릿 사용
```

**PR 체크리스트**:
- [ ] 모든 테스트 통과
- [ ] TypeScript 타입 검사 통과
- [ ] ESLint 규칙 준수
- [ ] 문서 업데이트 완료
- [ ] 기존 기능 영향 없음 확인
- [ ] 빌드 성공 확인

#### **5. 코드 리뷰 및 병합**

**리뷰어 체크리스트**:
- [ ] 코드 품질 확인
- [ ] 보안 이슈 점검
- [ ] 성능 영향 검토
- [ ] 아키텍처 일관성 확인
- [ ] 테스트 커버리지 확인

---

## 🛠️ 개발 도구 및 명령어

### **워크스페이스 레벨 명령어**

```bash
# 개발 서버
npm run dev:all              # 모든 서비스 동시 시작
npm run dev:smart            # 스마트 시작 (헬스체크 포함)

# 빌드
npm run build:all            # 모든 서비스 빌드
npm run build:clean          # 클린 빌드

# 코드 품질
npm run type-check:all       # 전체 TypeScript 검사
npm run lint:all             # 전체 ESLint 검사
npm run lint:fix             # 자동 수정
npm run prettier:all         # 코드 포맷팅

# 테스트
npm run test:all             # 전체 테스트
npm run test:unit            # 단위 테스트
npm run test:integration     # 통합 테스트
npm run test:e2e             # E2E 테스트
npm run test:coverage        # 커버리지 포함

# 유틸리티
npm run install:all          # 전체 의존성 설치
npm run clean:all            # 빌드 캐시 정리
npm run health:all           # 헬스 체크
```

### **서비스별 명령어**

#### **API Server**
```bash
cd services/api-server

# 개발
npm run dev                  # 개발 서버 (nodemon)
npm run build                # TypeScript 컴파일
npm run start                # 프로덕션 실행

# 데이터베이스
npm run migration:generate   # 마이그레이션 생성
npm run migration:run        # 마이그레이션 실행
npm run migration:revert     # 마이그레이션 롤백

# 관리
npm run create-admin         # 관리자 계정 생성
npm run db:test              # DB 연결 테스트
```

#### **Frontend Services**
```bash
cd services/main-site  # 또는 admin-dashboard

# 개발
npm run dev                  # Vite 개발 서버
npm run build                # 프로덕션 빌드
npm run preview              # 빌드 미리보기

# 테스트
npm run test                 # Vitest 실행
npm run test:ui              # UI 테스트 도구
```

---

## 🔍 코드 품질 관리

### **TypeScript 규칙**

#### **Strict Mode 설정**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true
  }
}
```

#### **타입 정의 원칙**
```typescript
// ✅ 올바른 타입 정의
interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'BUSINESS' | 'AFFILIATE' | 'ADMIN';
  createdAt: Date;
}

// ✅ 제네릭 사용
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ❌ any 타입 사용 금지
const userData: any = fetchUser(); // 금지
```

### **ESLint 규칙**

```javascript
// eslint.config.js 주요 규칙
export default [
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/order': 'error'
    }
  }
];
```

### **Prettier 설정**

```javascript
// prettier.config.js
export default {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false
};
```

---

## 🧪 테스트 전략

### **테스트 피라미드**

```
        /\
       /  \
      / E2E \ (적음)
     /______\
    /        \
   / Integration \ (보통)
  /______________\
 /                \
/ Unit Tests       \ (많음)
/________________\
```

### **단위 테스트 (Unit Tests)**

```typescript
// services/api-server/src/__tests__/user.test.ts
describe('User Service', () => {
  test('should create user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      role: 'CUSTOMER'
    };
    
    const user = await userService.create(userData);
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.password).not.toBe(userData.password); // 해싱 확인
  });
});
```

### **통합 테스트 (Integration Tests)**

```typescript
// services/api-server/src/__tests__/integration/auth.test.ts
describe('Auth API Integration', () => {
  test('POST /api/auth/login should return JWT token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

### **E2E 테스트 (Playwright)**

```typescript
// tests/e2e/user-flow.spec.ts
test('user can complete purchase flow', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="product-1"]');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="cart-icon"]');
  await page.click('[data-testid="checkout"]');
  
  await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
});
```

---

## 📦 패키지 관리

### **의존성 관리 원칙**

#### **버전 통일**
```json
// 모든 서비스에서 동일한 버전 사용
{
  "react": "^19.1.0",        // 모든 프론트엔드 서비스
  "axios": "^1.10.0",        // 모든 API 클라이언트
  "typescript": "^5.8.3"     // 모든 TypeScript 프로젝트
}
```

#### **공통 의존성 관리**
```bash
# 루트 레벨에서 공통 개발 도구 관리
npm install -D typescript eslint prettier

# 서비스별 특화 의존성
cd services/api-server
npm install express typeorm pg

cd services/main-site
npm install react react-dom vite
```

### **보안 업데이트**

```bash
# 보안 취약점 검사
npm audit

# 자동 수정 (주의: 테스트 필수)
npm audit fix

# 수동 업데이트
npm update package-name
```

---

## 🚀 빌드 및 배포

### **빌드 프로세스**

#### **로컬 빌드 검증**
```bash
# 1. 전체 타입 체크
npm run type-check:all

# 2. 전체 린트 검사
npm run lint:all

# 3. 전체 테스트
npm run test:all

# 4. 전체 빌드
npm run build:all

# 5. 빌드 결과 확인
npm run preview  # main-site 미리보기
```

#### **CI/CD 파이프라인**

```yaml
# .github/workflows/ci.yml 예시
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Type check
        run: npm run type-check:all
      
      - name: Lint
        run: npm run lint:all
      
      - name: Test
        run: npm run test:all
      
      - name: Build
        run: npm run build:all
```

### **배포 전략**

#### **환경별 배포**
- **Development**: 자동 배포 (develop 브랜치)
- **Staging**: 수동 배포 (release 브랜치)
- **Production**: 수동 배포 (main 브랜치)

#### **롤백 전략**
```bash
# 긴급 롤백
git revert HEAD
git push origin main

# PM2 이전 버전 복구
pm2 restart all --update-env
```

---

## 🔧 디버깅 및 로그

### **개발 환경 디버깅**

#### **API Server 디버깅**
```typescript
// logger 설정
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});
```

#### **Frontend 디버깅**
```typescript
// React DevTools 설정
if (process.env.NODE_ENV === 'development') {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
}

// API 요청 로깅
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request);
  return request;
});

axios.interceptors.response.use(
  response => {
    console.log('Response:', response);
    return response;
  },
  error => {
    console.error('Response Error:', error);
    return Promise.reject(error);
  }
);
```

### **프로덕션 모니터링**

```bash
# PM2 로그 확인
pm2 logs

# 특정 애플리케이션 로그
pm2 logs api-server
pm2 logs main-site

# 실시간 모니터링
pm2 monit
```

---

## 📋 체크리스트

### **개발 시작 전**
- [ ] 최신 코드 pull 받기
- [ ] Node.js 20 버전 확인
- [ ] 의존성 설치 완료
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 연결 확인
- [ ] 개발 서버 정상 시작 확인

### **코드 작성 시**
- [ ] TypeScript strict mode 준수
- [ ] ESLint 규칙 통과
- [ ] 기존 기능 영향 없음 확인
- [ ] 적절한 에러 처리 구현
- [ ] 보안 이슈 점검
- [ ] 성능 영향 고려

### **커밋 전**
- [ ] `npm run type-check:all` 통과
- [ ] `npm run lint:all` 통과
- [ ] `npm run test` 통과
- [ ] `npm run build:all` 성공
- [ ] 커밋 메시지 규칙 준수
- [ ] 관련 문서 업데이트

### **PR 생성 전**
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 준비 완료
- [ ] PR 템플릿 작성 완료
- [ ] 스크린샷/데모 첨부 (필요시)
- [ ] 브레이킹 체인지 명시

### **배포 전**
- [ ] 프로덕션 빌드 테스트
- [ ] 환경 변수 확인
- [ ] 데이터베이스 마이그레이션 확인
- [ ] 백업 계획 수립
- [ ] 롤백 계획 준비

---

## 🎯 성능 최적화 가이드

### **Frontend 최적화**

```typescript
// React.memo 사용
const ProductCard = React.memo(({ product }: { product: Product }) => {
  return <div>{product.name}</div>;
});

// useMemo 사용
const expensiveValue = useMemo(() => {
  return products.filter(p => p.price > 1000);
}, [products]);

// React.lazy 사용
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
```

### **Backend 최적화**

```typescript
// 데이터베이스 쿼리 최적화
const products = await productRepository
  .createQueryBuilder('product')
  .leftJoinAndSelect('product.category', 'category')
  .where('product.isActive = :isActive', { isActive: true })
  .orderBy('product.createdAt', 'DESC')
  .limit(10)
  .getMany();

// 캐싱 구현
const cachedResult = await redis.get(`products:${categoryId}`);
if (cachedResult) {
  return JSON.parse(cachedResult);
}
```

---

## 📞 지원 및 문의

### **문서 및 리소스**
- **아키텍처 문서**: `ARCHITECTURE.md`
- **서비스 상태**: `docs/SERVICES_STATUS.md`
- **프론트엔드 가이드라인**: `FRONTEND_GUIDELINES.md`
- **Claude AI 지침**: `CLAUDE.md`

### **문제 해결**
- **GitHub Issues**: 버그 리포트 및 기능 요청
- **개발팀 채널**: 일반적인 개발 문의
- **긴급 연락처**: 프로덕션 이슈 대응

### **코드 리뷰 요청**
- **Architecture 변경**: 전체 팀 리뷰 필요
- **보안 관련**: 보안 담당자 리뷰 필수
- **성능 최적화**: 성능 전문가 리뷰 권장

---

**이 워크플로우를 준수하여 안전하고 효율적인 개발 환경을 유지해주세요. 궁금한 점이 있으면 언제든 문의하세요.**

*최종 업데이트: 2025-07-02*