# O4O Platform 인증 시스템 마이그레이션 가이드

**버전:** 1.0
**작성일:** 2025-11-16
**최종 업데이트:** 2025-11-16

---

## 📋 목차

1. [개요](#개요)
2. [현재 상태 분석](#현재-상태-분석)
3. [목표 아키텍처](#목표-아키텍처)
4. [마이그레이션 원칙](#마이그레이션-원칙)
5. [단계별 마이그레이션 계획](#단계별-마이그레이션-계획)
6. [상세 작업 가이드](#상세-작업-가이드)
7. [테스트 전략](#테스트-전략)
8. [롤백 계획](#롤백-계획)
9. [체크리스트](#체크리스트)

---

## 개요

### 목적
O4O 플랫폼의 인증 시스템을 통일되고 안전하며 유지보수가 용이한 구조로 재구성

### 배경
- 5개 이상의 서로 다른 API 클라이언트 혼용
- localStorage vs httpOnly 쿠키 방식 혼재
- 하드코딩된 API 경로 및 환경변수 직접 사용
- User 타입 불일치로 인한 타입 안정성 부재
- 레거시 role 시스템과 P0 RBAC 공존

### 목표
- ✅ **단일 인증 방식**: 쿠키 기반 인증으로 통일
- ✅ **API 클라이언트 통일**: authClient/cookieAuthClient만 사용
- ✅ **타입 안정성 확보**: 공통 User 타입 정의
- ✅ **하드코딩 제거**: 모든 API 호출을 클라이언트 통해 수행
- ✅ **P0 RBAC 완전 도입**: role 필드 제거, assignments 배열로 통일
- ✅ **보안 강화**: XSS, CSRF 방지 및 토큰 관리 개선

### 예상 소요 기간
- **Phase 1 (긴급)**: 1-2일
- **Phase 2 (중요)**: 1주
- **Phase 3 (개선)**: 2-3주
- **Phase 4 (최적화)**: 1개월

---

## 현재 상태 분석

### 문제점 요약

#### 1. API 클라이언트 분산
```
Admin Dashboard:
  - authClient (권장)
  - apiClient (services/api.ts - 레거시)
  - lib/api-client.ts
  - 직접 fetch() 사용 (ForgotPassword, ResetPassword)

Main Site:
  - authClient
  - cookieAuthClient (권장)
  - services/api.ts (레거시)
  - 직접 axios 사용 (Signup.tsx)
```

#### 2. 토큰 저장 복잡성
```javascript
// 5개 위치에 중복 저장
localStorage.accessToken
localStorage.authToken
localStorage.token
localStorage.refreshToken
localStorage.admin-auth-storage (JSON)
```

#### 3. 하드코딩된 코드
```typescript
// ❌ 문제 파일
apps/admin-dashboard/src/pages/auth/ForgotPassword.tsx:17-18
apps/admin-dashboard/src/pages/auth/ResetPassword.tsx:62-63
apps/main-site/src/pages/auth/Signup.tsx:28, 76
```

#### 4. User 타입 불일치
```typescript
// 3가지 서로 다른 User 타입
@o4o/auth-client - User
main-site - User (userType 필수)
admin-dashboard - User (role 필수)
```

#### 5. 인증 방식 이원화
```
Admin: localStorage 토큰
Main Site: httpOnly 쿠키
```

---

## 목표 아키텍처

### 최종 구조

```
┌─────────────────────────────────────────────────────┐
│              Frontend Applications                   │
├──────────────────────┬──────────────────────────────┤
│  Admin Dashboard     │       Main Site              │
│  (admin.neture.co.kr)│    (neture.co.kr)            │
└──────────┬───────────┴──────────────┬───────────────┘
           │                          │
           └──────────┬───────────────┘
                      │
         ┌────────────▼─────────────┐
         │  @o4o/auth-context       │
         │  CookieAuthProvider      │  ← 통일된 Provider
         └────────────┬─────────────┘
                      │
         ┌────────────▼─────────────┐
         │  @o4o/auth-client        │
         │  CookieAuthClient        │  ← 단일 클라이언트
         └────────────┬─────────────┘
                      │
         ┌────────────▼─────────────┐
         │      API Server          │
         │  /api/auth/v2/*          │  ← 쿠키 기반 엔드포인트
         │  httpOnly Cookies        │
         └──────────────────────────┘
```

### 핵심 변경 사항

#### 1. 단일 인증 클라이언트
```typescript
// ✅ 모든 프론트엔드에서 사용
import { cookieAuthClient } from '@o4o/auth-client';

// ❌ 제거 대상
import { authClient } from '@o4o/auth-client';  // 레거시
import axios from 'axios';  // 직접 사용 금지
```

#### 2. 통일된 Provider
```typescript
// Admin Dashboard & Main Site 모두
import { CookieAuthProvider } from '@o4o/auth-context';

<CookieAuthProvider
  enableSessionSync={true}
  sessionCheckInterval={30000}
>
  <App />
</CookieAuthProvider>
```

#### 3. 표준 User 타입
```typescript
// @o4o/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;

  // P0 RBAC (표준)
  assignments: RoleAssignment[];

  // 추가 정보
  permissions?: string[];
  status: UserStatus;
  isEmailVerified: boolean;
  avatar?: string;
  businessInfo?: BusinessInfo;

  // Deprecated (제거 예정)
  role?: string;
  roles?: string[];
}
```

#### 4. 토큰 관리 간소화
```typescript
// 서버 측: httpOnly 쿠키만 사용
Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=Lax
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Lax

// 클라이언트: localStorage 사용 안 함
// 모든 토큰은 httpOnly 쿠키로 자동 관리
```

---

## 마이그레이션 원칙

### 1. 무중단 배포 (Zero Downtime)
- 하위 호환성 유지하며 점진적 마이그레이션
- 기존 시스템과 신규 시스템 병행 운영
- Feature Flag로 단계별 전환

### 2. 안전성 우선 (Safety First)
- 각 단계마다 테스트 후 다음 단계 진행
- 롤백 계획 사전 준비
- Production 배포 전 Staging 검증 필수

### 3. 데이터 무손실 (Data Integrity)
- 기존 사용자 세션 유지
- 토큰 마이그레이션 시 기존 토큰 유효성 보장
- DB 마이그레이션 시 백업 필수

### 4. 문서화 (Documentation)
- 각 단계마다 변경 사항 문서화
- 마이그레이션 로그 작성
- 개발자 가이드 업데이트

---

## 단계별 마이그레이션 계획

### Phase 1: 긴급 수정 (Critical) - 1-2일

**목표:** 하드코딩 제거 및 보안 위험 해소

#### 작업 항목

**1.1 Admin Dashboard - 비밀번호 관련 페이지 수정**
- `apps/admin-dashboard/src/pages/auth/ForgotPassword.tsx`
- `apps/admin-dashboard/src/pages/auth/ResetPassword.tsx`

```typescript
// Before (❌)
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';
const response = await fetch(`${apiUrl}/auth/v2/forgot-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});

// After (✅)
import { authClient } from '@o4o/auth-client';

const response = await authClient.api.post('/auth/v2/forgot-password', { email });
```

**1.2 Main Site - 회원가입 페이지 수정**
- `apps/main-site/src/pages/auth/Signup.tsx`

```typescript
// Before (❌)
const API_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
const response = await axios.post(`${API_URL}/api/v1/auth/signup`, signupData);

// After (✅)
import { cookieAuthClient } from '@o4o/auth-client';

const response = await cookieAuthClient.register(signupData);
```

**1.3 환경변수 직접 사용 제거**
- 모든 `import.meta.env.VITE_API_URL` 직접 참조 제거
- `authClient` 또는 `cookieAuthClient` 사용으로 대체

#### 테스트
```bash
# 비밀번호 찾기 테스트
1. Admin 로그인 페이지 → "비밀번호 찾기" 클릭
2. 이메일 입력 후 제출
3. Network 탭에서 /auth/v2/forgot-password 요청 확인
4. 이메일 수신 확인

# 회원가입 테스트
1. Main Site → "회원가입" 클릭
2. 정보 입력 후 제출
3. Network 탭에서 /auth/cookie/register 요청 확인
4. 쿠키 설정 확인 (accessToken, refreshToken)
```

#### 배포
```bash
# 1. 빌드
pnpm run build:admin
pnpm run build:main-site

# 2. 테스트 (Staging)
# - Staging 환경에 배포
# - QA 테스트 수행

# 3. Production 배포
./scripts/deploy-admin-manual.sh
ssh o4o-web "cd /home/ubuntu/o4o-platform && ./scripts/deploy-main-site.sh"
```

---

### Phase 2: API 클라이언트 통일 - 1주

**목표:** 모든 API 호출을 authClient/cookieAuthClient로 통일

#### 작업 항목

**2.1 레거시 API 클라이언트 Deprecated 표시**

```typescript
// apps/admin-dashboard/src/services/api.ts
/**
 * @deprecated Use authClient from '@o4o/auth-client' instead
 * This will be removed in v2.0
 */
export const apiClient = axios.create({ ... });

// apps/main-site/src/services/api.ts
/**
 * @deprecated Use cookieAuthClient from '@o4o/auth-client' instead
 */
export const apiClient = axios.create({ ... });
```

**2.2 Admin Dashboard API 호출 마이그레이션**

파일별 작업:
```bash
# 검색: apiClient 사용처
grep -r "apiClient\." apps/admin-dashboard/src --include="*.ts" --include="*.tsx"

# 주요 파일 목록
apps/admin-dashboard/src/hooks/useAdminMenu.ts  ✅ 완료
apps/admin-dashboard/src/services/api/postApi.ts
apps/admin-dashboard/src/services/api/metaApi.ts
apps/admin-dashboard/src/pages/users/
apps/admin-dashboard/src/pages/posts/
```

마이그레이션 패턴:
```typescript
// Before
import { apiClient } from '@/services/api';
const response = await apiClient.get('/users');

// After
import { authClient } from '@o4o/auth-client';
const response = await authClient.api.get('/users');
```

**2.3 Main Site API 호출 마이그레이션**

```bash
# 검색: 직접 axios 사용처
grep -r "axios\." apps/main-site/src --include="*.ts" --include="*.tsx"

# 마이그레이션
apps/main-site/src/pages/auth/Signup.tsx  → 우선순위 1
apps/main-site/src/components/shortcodes/auth/  → 우선순위 2
apps/main-site/src/services/  → 우선순위 3
```

**2.4 통합 API 서비스 작성 (선택)**

```typescript
// packages/auth-client/src/services/api-facade.ts
export class ApiService {
  constructor(private client: CookieAuthClient) {}

  // Users
  async getUsers() {
    return this.client.api.get('/users');
  }

  // Posts
  async getPosts(params?: PostQueryParams) {
    return this.client.api.get('/posts', { params });
  }

  // ... 기타 API
}

// 사용
import { cookieAuthClient } from '@o4o/auth-client';
const api = new ApiService(cookieAuthClient);
const users = await api.getUsers();
```

#### 테스트
```bash
# 단위 테스트
pnpm test -- api-client

# 통합 테스트
pnpm test:e2e -- auth-flow

# 수동 테스트
- 모든 페이지 네비게이션
- CRUD 작업 (Users, Posts, Products 등)
- Network 탭에서 Authorization 헤더 확인
```

---

### Phase 3: 쿠키 기반 인증 전환 - 2-3주

**목표:** Admin Dashboard도 쿠키 기반 인증으로 전환

#### 작업 항목

**3.1 CookieAuthProvider 통합**

```typescript
// apps/admin-dashboard/src/App.tsx

// Before
import { AuthProvider } from '@o4o/auth-context';
import { AuthClient } from '@o4o/auth-client';

const ssoClient = new AuthClient(import.meta.env.VITE_API_URL);

<AuthProvider ssoClient={ssoClient}>
  <Routes>...</Routes>
</AuthProvider>

// After
import { CookieAuthProvider } from '@o4o/auth-context';

<CookieAuthProvider
  enableSessionSync={true}
  sessionCheckInterval={30000}
  onAuthChange={(user) => {
    console.log('Auth changed:', user);
  }}
>
  <Routes>...</Routes>
</CookieAuthProvider>
```

**3.2 AuthContext 훅 변경**

```typescript
// Before
import { useAuth } from '@o4o/auth-context';
const { user, isAuthenticated, login, logout } = useAuth();

// After (변경 없음 - 호환성 유지)
import { useCookieAuth } from '@o4o/auth-context';
const { user, isAuthenticated, login, logout, hasRole } = useCookieAuth();

// 또는 Alias로 제공
export { useCookieAuth as useAuth } from '@o4o/auth-context';
```

**3.3 로그인 페이지 수정**

```typescript
// apps/admin-dashboard/src/pages/auth/Login.tsx

// Before
const { login } = useAuth();
await login({ email, password });

// After (변경 없음 - CookieAuthProvider가 내부적으로 처리)
const { login } = useAuth();
await login({ email, password });
// 내부적으로 cookieAuthClient.login() 호출
// 쿠키 자동 설정
```

**3.4 토큰 저장소 정리**

```typescript
// packages/auth-context/src/CookieAuthProvider.tsx

// 로그인 시 localStorage 정리 (마이그레이션 기간)
const login = async (credentials) => {
  await cookieAuthClient.login(credentials);

  // 레거시 토큰 제거
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('admin-auth-storage');

  // 사용자 정보 조회
  const meResponse = await cookieAuthClient.getCurrentUser();
  setUser(meResponse.user);
};
```

**3.5 AdminProtectedRoute 수정**

```typescript
// packages/auth-context/src/AdminProtectedRoute.tsx

// Before
const { isAuthenticated, isAdmin } = useAuth();

// After
const { isAuthenticated, hasRole } = useCookieAuth();
const isAdmin = hasRole(['admin', 'super_admin', 'operator']);
```

**3.6 API 서버 CORS 설정 확인**

```typescript
// apps/api-server/src/main.ts

app.use(cors({
  origin: [
    'https://admin.neture.co.kr',
    'https://neture.co.kr',
    'http://localhost:5173',  // Admin dev
    'http://localhost:5174',  // Main Site dev
  ],
  credentials: true,  // 중요!
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

#### 테스트

**3-1. 쿠키 설정 확인**
```bash
# 로그인 후 DevTools → Application → Cookies
- accessToken (HttpOnly, Secure, SameSite=Lax)
- refreshToken (HttpOnly, Secure, SameSite=Lax)
- sessionId (HttpOnly, Secure, SameSite=Lax, Domain=.neture.co.kr)
```

**3-2. 자동 토큰 갱신 테스트**
```javascript
// DevTools Console
// 1. 로그인
// 2. 15분 대기 (accessToken 만료)
// 3. API 요청 (자동 갱신 확인)
await fetch('/api/users', { credentials: 'include' });
// Network 탭에서 /auth/cookie/refresh 자동 호출 확인
```

**3-3. 세션 동기화 테스트**
```bash
# 1. 탭 A에서 로그인
# 2. 탭 B 새로 열기 (자동 로그인 확인)
# 3. 탭 A에서 로그아웃
# 4. 탭 B에서 자동 로그아웃 확인
```

---

### Phase 4: P0 RBAC 완전 도입 & 최적화 - 1개월

**목표:** 레거시 role 시스템 제거, assignments 배열로 통일

#### 작업 항목

**4.1 User 타입 통일**

```typescript
// packages/types/src/user.ts

export interface User {
  id: string;
  email: string;
  name: string;

  // P0 RBAC (표준)
  assignments: RoleAssignment[];

  permissions?: string[];
  status: UserStatus;
  isEmailVerified: boolean;
  avatar?: string;
  businessInfo?: BusinessInfo;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // ❌ Deprecated - 제거 예정
  // role?: string;
  // roles?: string[];
  // currentRole?: string;
}

export interface RoleAssignment {
  role: 'admin' | 'supplier' | 'seller' | 'partner';
  active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  valid_from: string;
  valid_until: string | null;
  assigned_by: string | null;
  assigned_at: string;
}
```

**4.2 hasRole 헬퍼 함수 통일**

```typescript
// packages/auth-context/src/utils/role-helpers.ts

export function hasRole(
  user: User | null,
  roles: string | string[]
): boolean {
  if (!user || !user.assignments) return false;

  const roleArray = Array.isArray(roles) ? roles : [roles];

  return user.assignments.some(assignment =>
    roleArray.includes(assignment.role) &&
    assignment.active &&
    isValidNow(assignment)
  );
}

export function hasPermission(
  user: User | null,
  permission: string
): boolean {
  return user?.permissions?.includes(permission) ?? false;
}

function isValidNow(assignment: RoleAssignment): boolean {
  const now = new Date();
  const validFrom = new Date(assignment.valid_from);
  const validUntil = assignment.valid_until ? new Date(assignment.valid_until) : null;

  return validFrom <= now && (!validUntil || validUntil > now);
}
```

**4.3 기존 코드 마이그레이션**

```typescript
// Before (❌)
if (user.role === 'admin') {
  // ...
}

if (user.roles?.includes('seller')) {
  // ...
}

// After (✅)
import { hasRole } from '@o4o/auth-context/utils';

if (hasRole(user, 'admin')) {
  // ...
}

if (hasRole(user, 'seller')) {
  // ...
}
```

**4.4 API 서버 엔드포인트 확인**

```typescript
// apps/api-server/src/routes/auth-v2.ts

// /me 엔드포인트가 assignments 반환하는지 확인
router.get('/me', authenticateCookie, async (req, res) => {
  const user = req.user;
  const assignments = await roleAssignmentRepo.find({
    where: { userId: user.id },
    order: { assigned_at: 'DESC' }
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      permissions: user.permissions,
      isEmailVerified: user.isEmailVerified,
      // ❌ role 필드 제거 고려
    },
    assignments: assignments.map(a => ({
      role: a.role,
      active: a.isActive,
      activated_at: a.isActive ? a.updatedAt : null,
      deactivated_at: !a.isActive ? a.updatedAt : null,
      valid_from: a.validFrom,
      valid_until: a.validUntil,
      assigned_by: a.assignedBy,
      assigned_at: a.assignedAt,
    }))
  });
});
```

**4.5 AdminProtectedRoute 개선**

```typescript
// packages/auth-context/src/AdminProtectedRoute.tsx

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean;  // true: 모든 권한 필요, false: 하나만
  fallback?: React.ReactNode;
}

export const AdminProtectedRoute: FC<AdminProtectedRouteProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
  requireAll = false,
  fallback
}) => {
  const { user, isAuthenticated, loading } = useCookieAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  // 역할 확인
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requireAll
      ? requiredRoles.every(role => hasRole(user, role))
      : requiredRoles.some(role => hasRole(user, role));

    if (!hasRequiredRole) {
      return fallback || <AccessDenied />;
    }
  }

  // 권한 확인
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = requireAll
      ? requiredPermissions.every(perm => hasPermission(user, perm))
      : requiredPermissions.some(perm => hasPermission(user, perm));

    if (!hasRequiredPermission) {
      return fallback || <AccessDenied />;
    }
  }

  return <>{children}</>;
};
```

**4.6 DB 마이그레이션**

```sql
-- 1. role_assignments 테이블 검증
SELECT
  COUNT(*) as total_users,
  COUNT(DISTINCT user_id) as users_with_assignments
FROM role_assignments
WHERE is_active = true;

-- 2. 레거시 role 필드와 assignments 불일치 확인
SELECT u.id, u.email, u.role,
       STRING_AGG(ra.role, ', ') as assigned_roles
FROM users u
LEFT JOIN role_assignments ra ON u.id = ra.user_id AND ra.is_active = true
WHERE u.role IS NOT NULL
GROUP BY u.id, u.email, u.role
HAVING u.role != ALL(ARRAY_AGG(ra.role));

-- 3. 불일치 해결: users.role → role_assignments 동기화
INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at)
SELECT
  gen_random_uuid(),
  id,
  role,
  true,
  NOW(),
  NOW()
FROM users
WHERE role IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.user_id = users.id AND ra.role = users.role AND ra.is_active = true
  );

-- 4. (선택) users.role 필드 제거
-- ALTER TABLE users DROP COLUMN role;  -- 신중하게!
```

#### 테스트

**4-1. 역할 확인 테스트**
```typescript
// Test Suite: role-helpers.test.ts

describe('hasRole', () => {
  it('should return true for active role', () => {
    const user: User = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      assignments: [
        {
          role: 'seller',
          active: true,
          valid_from: '2024-01-01T00:00:00Z',
          valid_until: null,
          // ...
        }
      ]
    };

    expect(hasRole(user, 'seller')).toBe(true);
    expect(hasRole(user, 'admin')).toBe(false);
  });

  it('should return false for inactive role', () => {
    const user: User = {
      assignments: [
        {
          role: 'seller',
          active: false,  // 비활성
          // ...
        }
      ]
    };

    expect(hasRole(user, 'seller')).toBe(false);
  });

  it('should return false for expired role', () => {
    const user: User = {
      assignments: [
        {
          role: 'seller',
          active: true,
          valid_from: '2024-01-01T00:00:00Z',
          valid_until: '2024-06-01T00:00:00Z',  // 만료됨
          // ...
        }
      ]
    };

    expect(hasRole(user, 'seller')).toBe(false);
  });
});
```

---

## 상세 작업 가이드

### 파일별 마이그레이션 체크리스트

#### Admin Dashboard

**우선순위 1 (즉시)**
- [ ] `pages/auth/ForgotPassword.tsx` - authClient 사용
- [ ] `pages/auth/ResetPassword.tsx` - authClient 사용

**우선순위 2 (1주)**
- [ ] `services/api.ts` - Deprecated 표시
- [ ] `services/api/postApi.ts` - authClient로 교체
- [ ] `services/api/metaApi.ts` - authClient로 교체
- [ ] `hooks/useAdminMenu.ts` - ✅ 완료
- [ ] `pages/users/*` - authClient 사용 확인

**우선순위 3 (2주)**
- [ ] `App.tsx` - CookieAuthProvider로 전환
- [ ] `stores/authStore.ts` - Deprecated 또는 제거
- [ ] `components/layout/AdminLayout.tsx` - useCookieAuth 사용
- [ ] `components/layout/AdminSidebar.tsx` - 역할 확인 로직 업데이트

#### Main Site

**우선순위 1 (즉시)**
- [ ] `pages/auth/Signup.tsx` - cookieAuthClient 사용

**우선순위 2 (1주)**
- [ ] `services/api.ts` - Deprecated 표시
- [ ] `contexts/AuthContext.tsx` - 타입 통일
- [ ] `components/shortcodes/auth/SocialLoginShortcode.tsx` - 검토

**우선순위 3 (2주)**
- [ ] `types/user.ts` - 표준 User 타입으로 교체
- [ ] `hooks/useAuth.ts` - hasRole 헬퍼 사용

#### Packages

**auth-client**
- [ ] `src/client.ts` - Deprecated 표시
- [ ] `src/cookie-client.ts` - 개선 및 테스트 추가
- [ ] `src/types.ts` - User 타입 업데이트

**auth-context**
- [ ] `src/AuthProvider.tsx` - Deprecated 표시
- [ ] `src/CookieAuthProvider.tsx` - Admin 호환성 확인
- [ ] `src/AdminProtectedRoute.tsx` - hasRole 사용
- [ ] `src/utils/role-helpers.ts` - 신규 생성

**types**
- [ ] `src/user.ts` - 표준 User 타입 정의
- [ ] `src/role.ts` - RoleAssignment 타입 업데이트

---

## 테스트 전략

### 테스트 레벨

#### 1. 단위 테스트 (Unit Tests)
```typescript
// packages/auth-context/src/__tests__/role-helpers.test.ts
- hasRole() 함수
- hasPermission() 함수
- isValidNow() 함수

// packages/auth-client/src/__tests__/cookie-client.test.ts
- login() 메서드
- logout() 메서드
- getCurrentUser() 메서드
- refreshToken() 메서드
```

#### 2. 통합 테스트 (Integration Tests)
```typescript
// apps/admin-dashboard/src/__tests__/auth-flow.test.tsx
- 로그인 → 메인 페이지 이동
- 권한 있는 페이지 접근
- 권한 없는 페이지 접근 차단
- 로그아웃 → 로그인 페이지 리다이렉트

// apps/main-site/src/__tests__/auth-flow.test.tsx
- 회원가입 → 이메일 검증
- 로그인 → 역할별 리다이렉트
- 다중 역할 처리 (seller + partner)
```

#### 3. E2E 테스트 (End-to-End Tests)
```typescript
// e2e/admin-auth.spec.ts (Playwright)

test('Admin login and access control', async ({ page }) => {
  // 로그인
  await page.goto('https://admin.neture.co.kr/login');
  await page.fill('[name="email"]', 'admin@neture.co.kr');
  await page.fill('[name="password"]', 'Test@1234');
  await page.click('button[type="submit"]');

  // 로그인 성공 확인
  await expect(page).toHaveURL(/\/admin$/);

  // 쿠키 확인
  const cookies = await page.context().cookies();
  const accessToken = cookies.find(c => c.name === 'accessToken');
  expect(accessToken).toBeDefined();
  expect(accessToken.httpOnly).toBe(true);

  // 권한 있는 페이지 접근
  await page.goto('https://admin.neture.co.kr/users');
  await expect(page).toHaveURL(/\/users$/);

  // 로그아웃
  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL(/\/login$/);

  // 쿠키 삭제 확인
  const cookiesAfterLogout = await page.context().cookies();
  const accessTokenAfterLogout = cookiesAfterLogout.find(c => c.name === 'accessToken');
  expect(accessTokenAfterLogout).toBeUndefined();
});
```

#### 4. 수동 테스트 체크리스트

**로그인/로그아웃**
- [ ] 올바른 자격증명으로 로그인 성공
- [ ] 잘못된 자격증명으로 로그인 실패
- [ ] 비밀번호 찾기 이메일 수신
- [ ] 비밀번호 재설정 성공
- [ ] 로그아웃 후 쿠키 삭제 확인
- [ ] 로그아웃 후 보호된 페이지 접근 차단

**세션 관리**
- [ ] 페이지 새로고침 후 로그인 상태 유지
- [ ] 15분 후 자동 토큰 갱신
- [ ] 다른 탭에서 로그아웃 시 모든 탭 로그아웃
- [ ] 7일 후 세션 만료

**권한 제어**
- [ ] Admin 역할만 접근 가능한 페이지 확인
- [ ] Seller 역할 전용 기능 확인
- [ ] 권한 없는 페이지 접근 시 403 페이지
- [ ] 다중 역할 (seller + partner) 처리 확인

**크로스 브라우저**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## 롤백 계획

### Phase 1 롤백

**문제 발생 시:**
```bash
# Git 롤백
git revert <commit-hash>
git push origin main

# 재배포
./scripts/deploy-admin-manual.sh
ssh o4o-web "./scripts/deploy-main-site.sh"
```

**영향 범위:**
- 비밀번호 찾기/재설정 기능만 영향
- 기존 로그인 사용자 영향 없음

### Phase 2 롤백

**문제 발생 시:**
```bash
# Feature Flag로 레거시 클라이언트 활성화
# apps/admin-dashboard/.env.local
VITE_USE_LEGACY_API_CLIENT=true

# apps/main-site/.env.local
VITE_USE_LEGACY_API_CLIENT=true
```

**코드:**
```typescript
// Conditional import
const apiClient = import.meta.env.VITE_USE_LEGACY_API_CLIENT
  ? legacyApiClient
  : authClient.api;
```

### Phase 3 롤백

**문제 발생 시:**
```bash
# 1. localStorage 기반 AuthProvider로 복구
# 2. 기존 토큰 마이그레이션 스크립트 실행

# apps/api-server/src/scripts/migrate-tokens.ts
async function migrateTokensToLocalStorage() {
  // 쿠키의 토큰을 localStorage로 이동
  const token = getCookie('accessToken');
  if (token) {
    localStorage.setItem('accessToken', token);
  }
}
```

**DB 롤백 (Phase 4):**
```sql
-- role_assignments 변경 취소
BEGIN;

-- 백업에서 복구
RESTORE TABLE role_assignments FROM BACKUP 'backup_20251116';

-- 또는 특정 변경 취소
DELETE FROM role_assignments WHERE created_at > '2025-11-16 00:00:00';

COMMIT;
```

---

## 체크리스트

### Phase 1 체크리스트

**개발**
- [ ] ForgotPassword.tsx authClient 사용
- [ ] ResetPassword.tsx authClient 사용
- [ ] Signup.tsx cookieAuthClient 사용
- [ ] 환경변수 직접 사용 제거
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성

**테스트**
- [ ] 로컬 환경 테스트
- [ ] Staging 배포 및 QA
- [ ] 크로스 브라우저 테스트
- [ ] 모바일 테스트

**배포**
- [ ] Production 배포
- [ ] 배포 후 모니터링 (1시간)
- [ ] 로그 확인 (에러 없음)

### Phase 2 체크리스트

**개발**
- [ ] 레거시 API 클라이언트 Deprecated 표시
- [ ] Admin Dashboard API 호출 마이그레이션
- [ ] Main Site API 호출 마이그레이션
- [ ] 통합 API 서비스 작성 (선택)
- [ ] 테스트 업데이트

**테스트**
- [ ] 모든 페이지 네비게이션
- [ ] CRUD 작업 (Users, Posts 등)
- [ ] API 호출 로그 확인
- [ ] 성능 테스트 (응답 시간)

**배포**
- [ ] Staging 배포
- [ ] QA 테스트 (2일)
- [ ] Production 배포
- [ ] 24시간 모니터링

### Phase 3 체크리스트

**개발**
- [ ] CookieAuthProvider 통합
- [ ] AuthContext 훅 변경
- [ ] 로그인 페이지 수정
- [ ] AdminProtectedRoute 수정
- [ ] 토큰 저장소 정리
- [ ] CORS 설정 확인

**테스트**
- [ ] 쿠키 설정 확인
- [ ] 자동 토큰 갱신 테스트
- [ ] 세션 동기화 테스트
- [ ] 다중 탭 테스트
- [ ] 로그아웃 all devices 테스트

**배포**
- [ ] Feature Flag 설정
- [ ] Staging 배포
- [ ] 단계적 롤아웃 (10% → 50% → 100%)
- [ ] 1주일 모니터링

### Phase 4 체크리스트

**개발**
- [ ] User 타입 통일
- [ ] hasRole 헬퍼 함수 작성
- [ ] 기존 코드 마이그레이션
- [ ] API 엔드포인트 확인
- [ ] DB 마이그레이션 스크립트
- [ ] AdminProtectedRoute 개선

**테스트**
- [ ] 역할 확인 테스트
- [ ] 권한 확인 테스트
- [ ] DB 마이그레이션 검증
- [ ] 성능 테스트
- [ ] 보안 테스트

**배포**
- [ ] DB 백업
- [ ] Staging DB 마이그레이션
- [ ] Staging 배포 및 검증
- [ ] Production DB 마이그레이션
- [ ] Production 배포
- [ ] 2주간 모니터링

---

## 부록

### A. 환경변수 설정

**.env (Production)**
```bash
# Admin Dashboard
VITE_API_URL=https://api.neture.co.kr/api/v1
VITE_USE_COOKIE_AUTH=true

# Main Site
VITE_API_URL=https://api.neture.co.kr/api/v1
VITE_USE_COOKIE_AUTH=true

# API Server
JWT_SECRET=<production-secret>
JWT_REFRESH_SECRET=<production-refresh-secret>
COOKIE_DOMAIN=.neture.co.kr
COOKIE_SECURE=true
```

**.env.local (Development)**
```bash
# Admin Dashboard
VITE_API_URL=http://localhost:4000/api/v1
VITE_USE_COOKIE_AUTH=true

# Main Site
VITE_API_URL=http://localhost:4000/api/v1
VITE_USE_COOKIE_AUTH=true

# API Server
JWT_SECRET=dev-jwt-secret
JWT_REFRESH_SECRET=dev-refresh-secret
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
```

### B. 마이그레이션 스크립트

**scripts/migrate-auth-phase1.sh**
```bash
#!/bin/bash
set -e

echo "🚀 Starting Phase 1 Migration..."

# 1. Backup
echo "📦 Creating backup..."
git tag "pre-migration-phase1-$(date +%Y%m%d-%H%M%S)"

# 2. Update ForgotPassword.tsx
echo "🔧 Updating ForgotPassword.tsx..."
# ... sed commands or manual changes

# 3. Update ResetPassword.tsx
echo "🔧 Updating ResetPassword.tsx..."
# ... sed commands or manual changes

# 4. Update Signup.tsx
echo "🔧 Updating Signup.tsx..."
# ... sed commands or manual changes

# 5. Build
echo "🏗️  Building..."
pnpm run build:admin
pnpm run build:main-site

# 6. Test
echo "🧪 Running tests..."
pnpm test

echo "✅ Phase 1 Migration Complete!"
echo "📝 Review changes and commit if everything looks good."
```

### C. 모니터링 쿼리

**Sentry 에러 모니터링**
```javascript
// 인증 관련 에러만 필터
error.type === "AuthenticationError" ||
error.message.includes("401") ||
error.message.includes("token")
```

**Datadog 메트릭**
```
# 로그인 성공률
sum:auth.login.success / (sum:auth.login.success + sum:auth.login.failure)

# 토큰 갱신 실패율
sum:auth.refresh.failure / sum:auth.refresh.total

# 평균 응답 시간
avg:auth.api.response_time
```

---

**문서 버전:** 1.0
**작성자:** Claude
**최종 검토일:** 2025-11-16

---

이 문서는 O4O Platform 인증 시스템 마이그레이션의 공식 가이드입니다.
모든 단계는 순차적으로 진행하며, 각 Phase 완료 후 다음 Phase로 진행하시기 바랍니다.
