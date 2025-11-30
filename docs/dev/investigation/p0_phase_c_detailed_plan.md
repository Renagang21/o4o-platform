# Phase C — Frontend 상세 실행 계획 (파일 경로 기반)

> 생성일: 2025-11-09
> 기반 문서: `p0_phase_c_execution_order.md`
> Phase B 완료: `/me`, `/enrollments`, RBAC, httpOnly 쿠키 인증

---

## 📋 목차

1. [타입 정의 업데이트](#1-타입-정의-업데이트)
2. [Main Site 수정](#2-main-site-수정)
3. [Admin Dashboard 수정](#3-admin-dashboard-수정)
4. [공통 패키지 수정](#4-공통-패키지-수정)
5. [테스트 계획](#5-테스트-계획)

---

## 1. 타입 정의 업데이트

### 1.1 auth-client 타입 확장

**파일**: `packages/auth-client/src/types.ts`

**현재 상태**:
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'business' | 'affiliate' | 'customer' | 'seller' | 'supplier';
  // ...
}
```

**변경 사항**:
```typescript
export interface RoleAssignment {
  role: 'supplier' | 'seller' | 'partner' | 'admin';
  active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  valid_from: string;
  valid_until: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  status: string;
  businessInfo?: any;
  permissions?: string[];
  isActive?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // P0: assignments 배열 추가
  assignments?: RoleAssignment[];
}

export interface MeResponse {
  success: boolean;
  user: User;
  assignments: RoleAssignment[];
}

// Enrollment 관련 타입 추가
export type EnrollmentRole = 'supplier' | 'seller' | 'partner';
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'on_hold';

export interface Enrollment {
  id: string;
  userId: string;
  role: EnrollmentRole;
  status: EnrollmentStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface EnrollmentCreateData {
  role: EnrollmentRole;
  metadata?: Record<string, any>;
}
```

---

### 1.2 CookieAuthClient 확장

**파일**: `packages/auth-client/src/cookie-client.ts`

**추가할 메서드**:
```typescript
// Enrollment API
async createEnrollment(data: EnrollmentCreateData): Promise<Enrollment> {
  const response = await this.api.post('/enrollments', data);
  return response.data.enrollment;
}

async getMyEnrollments(): Promise<Enrollment[]> {
  const response = await this.api.get('/enrollments/my');
  return response.data.enrollments;
}

// Admin Enrollment API
async getAdminEnrollments(params: {
  role?: EnrollmentRole;
  status?: EnrollmentStatus;
  page?: number;
  limit?: number;
}): Promise<{ enrollments: Enrollment[]; total: number }> {
  const response = await this.api.get('/admin/enrollments', { params });
  return response.data;
}

async approveEnrollment(id: string, notes?: string): Promise<void> {
  await this.api.post(`/admin/enrollments/${id}/approve`, { notes });
}

async rejectEnrollment(id: string, reason: string): Promise<void> {
  await this.api.post(`/admin/enrollments/${id}/reject`, { reason });
}

async holdEnrollment(id: string, reason: string): Promise<void> {
  await this.api.post(`/admin/enrollments/${id}/hold`, { reason });
}

// Updated getCurrentUser to match /me response
async getCurrentUser(): Promise<MeResponse | null> {
  try {
    const response = await this.api.get('/auth/v2/me');
    return response.data;
  } catch (error) {
    return null;
  }
}
```

---

## 2. Main Site 수정

### 2.1 API 클라이언트 교체

**파일**: `apps/main-site/src/services/api.ts`

**현재 상태**: Bearer 토큰 기반 axios 인스턴스

**변경 사항**:
```typescript
import { cookieAuthClient } from '@o4o/auth-client';

// Export the cookie client instance
export const authClient = cookieAuthClient;

// For backwards compatibility
export const apiClient = authClient.api;
export const authAPI = {
  login: (email: string, password: string) =>
    authClient.login({ email, password }),
  register: (data: any) =>
    authClient.register(data),
  verifyToken: () =>
    authClient.getCurrentUser(),
  // ... 기타 메서드
};
```

---

### 2.2 AuthContext 리팩토링

**파일**: `apps/main-site/src/contexts/AuthContext.tsx`

**변경 사항**:
```typescript
import { authClient } from '../services/api';
import { User, RoleAssignment } from '@o4o/auth-client';

interface ExtendedUser extends User {
  assignments: RoleAssignment[];
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: Check if user has active role
  const hasRole = (role: string): boolean => {
    return user?.assignments?.some(a => a.role === role && a.active) ?? false;
  };

  // Check auth status
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const response = await authClient.getCurrentUser();

      if (response && response.user) {
        setUser({
          ...response.user,
          assignments: response.assignments
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login (쿠키 기반)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authClient.login({ email, password });
      if (response.success) {
        await checkAuthStatus(); // Reload /me to get assignments
        toast.success('로그인되었습니다.');
        return true;
      }
      return false;
    } catch (error: any) {
      const errorCode = error.response?.data?.code;
      // ... 에러 처리
      return false;
    }
  };

  // Logout
  const logout = async () => {
    await authClient.logout();
    setUser(null);
    toast.info('로그아웃되었습니다.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasRole,
        login,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

---

### 2.3 라우팅 추가

**파일**: `apps/main-site/src/App.tsx`

**추가할 라우트**:
```typescript
// Enrollment Pages
import ApplySupplier from './pages/apply/ApplySupplier';
import ApplySeller from './pages/apply/ApplySeller';
import ApplyPartner from './pages/apply/ApplyPartner';
import ApplyStatus from './pages/apply/ApplyStatus';

// Dashboard Pages
import DashboardSupplier from './pages/dashboard/DashboardSupplier';
import DashboardSeller from './pages/dashboard/DashboardSeller';
import DashboardPartner from './pages/dashboard/DashboardPartner';

// Routes
<Route path="/apply/supplier" element={<ApplySupplier />} />
<Route path="/apply/seller" element={<ApplySeller />} />
<Route path="/apply/partner" element={<ApplyPartner />} />
<Route path="/apply/:role/status" element={<ApplyStatus />} />

<Route path="/dashboard/supplier" element={
  <RoleGuard role="supplier">
    <DashboardSupplier />
  </RoleGuard>
} />
<Route path="/dashboard/seller" element={
  <RoleGuard role="seller">
    <DashboardSeller />
  </RoleGuard>
} />
<Route path="/dashboard/partner" element={
  <RoleGuard role="partner">
    <DashboardPartner />
  </RoleGuard>
} />
```

---

### 2.4 RoleGuard 컴포넌트

**파일**: `apps/main-site/src/components/auth/RoleGuard.tsx` (신규)

```typescript
import { FC, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGuardProps {
  role: string;
  children: ReactNode;
}

export const RoleGuard: FC<RoleGuardProps> = ({ role, children }) => {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(role)) {
    // 승인 대기/신청 안함 → 상태 페이지로 리디렉션
    return <Navigate to={`/apply/${role}/status`} replace />;
  }

  return <>{children}</>;
};
```

---

### 2.5 신청 페이지 (예시: Supplier)

**파일**: `apps/main-site/src/pages/apply/ApplySupplier.tsx` (신규)

```typescript
import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../services/api';
import toast from 'react-hot-toast';

const ApplySupplier: FC = () => {
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState({
    companyName: '',
    businessNumber: '',
    // ... 기타 필드
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await authClient.createEnrollment({
        role: 'supplier',
        metadata
      });

      toast.success('신청이 완료되었습니다.');
      navigate('/apply/supplier/status');
    } catch (error: any) {
      const errorCode = error.response?.data?.code;

      if (errorCode === 'DUPLICATE_ENROLLMENT') {
        toast.error('이미 신청한 내역이 있습니다.');
        navigate('/apply/supplier/status');
      } else if (errorCode === 'VALIDATION_ERROR') {
        toast.error('입력 정보를 확인해주세요.');
      } else {
        toast.error('신청에 실패했습니다.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드 */}
    </form>
  );
};
```

---

### 2.6 신청 현황 페이지

**파일**: `apps/main-site/src/pages/apply/ApplyStatus.tsx` (신규)

```typescript
import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authClient } from '../../services/api';
import { Enrollment } from '@o4o/auth-client';

const ApplyStatus: FC = () => {
  const { role } = useParams<{ role: string }>();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  useEffect(() => {
    loadEnrollment();
  }, [role]);

  const loadEnrollment = async () => {
    const enrollments = await authClient.getMyEnrollments();
    const current = enrollments.find(e => e.role === role);
    setEnrollment(current || null);
  };

  if (!enrollment) {
    return (
      <div>
        <p>신청 내역이 없습니다.</p>
        <Link to={`/apply/${role}`}>신청하기</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>{role} 신청 현황</h1>
      <div>
        <span>상태: </span>
        <Badge status={enrollment.status} />
      </div>

      {enrollment.status === 'pending' && (
        <p>심사 중입니다. 영업일 기준 3일 이내에 결과를 알려드립니다.</p>
      )}

      {enrollment.status === 'on_hold' && (
        <div>
          <p>추가 정보가 필요합니다.</p>
          <p>사유: {enrollment.reason}</p>
        </div>
      )}

      {enrollment.status === 'rejected' && (
        <div>
          <p>신청이 반려되었습니다.</p>
          <p>사유: {enrollment.reason}</p>
        </div>
      )}

      {enrollment.status === 'approved' && (
        <div>
          <p>승인되었습니다!</p>
          <Link to={`/dashboard/${role}`}>대시보드 가기</Link>
        </div>
      )}
    </div>
  );
};
```

---

## 3. Admin Dashboard 수정

### 3.1 관리자 신청 관리 페이지

**파일**: `apps/admin-dashboard/src/pages/enrollments/EnrollmentManagement.tsx` (신규)

```typescript
import { FC, useState, useEffect } from 'react';
import { cookieAuthClient } from '@o4o/auth-client';
import { Enrollment, EnrollmentRole, EnrollmentStatus } from '@o4o/auth-client';

const EnrollmentManagement: FC = () => {
  const [role, setRole] = useState<EnrollmentRole>('supplier');
  const [status, setStatus] = useState<EnrollmentStatus>('pending');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    loadEnrollments();
  }, [role, status]);

  const loadEnrollments = async () => {
    const data = await cookieAuthClient.getAdminEnrollments({ role, status });
    setEnrollments(data.enrollments);
  };

  const handleApprove = async (id: string) => {
    try {
      await cookieAuthClient.approveEnrollment(id);
      toast.success('승인되었습니다.');
      loadEnrollments();
    } catch (error) {
      toast.error('승인에 실패했습니다.');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await cookieAuthClient.rejectEnrollment(id, reason);
      toast.success('반려되었습니다.');
      loadEnrollments();
    } catch (error) {
      toast.error('반려에 실패했습니다.');
    }
  };

  return (
    <div>
      <h1>신청 관리</h1>

      {/* 필터 */}
      <div>
        <select value={role} onChange={e => setRole(e.target.value as EnrollmentRole)}>
          <option value="supplier">공급업체</option>
          <option value="seller">판매자</option>
          <option value="partner">파트너</option>
        </select>

        <select value={status} onChange={e => setStatus(e.target.value as EnrollmentStatus)}>
          <option value="pending">대기</option>
          <option value="on_hold">보류</option>
          <option value="rejected">반려</option>
          <option value="approved">승인</option>
        </select>
      </div>

      {/* 목록 */}
      <table>
        <thead>
          <tr>
            <th>신청자</th>
            <th>역할</th>
            <th>신청일</th>
            <th>상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map(enrollment => (
            <tr key={enrollment.id}>
              <td>{enrollment.userId}</td>
              <td>{enrollment.role}</td>
              <td>{enrollment.submittedAt}</td>
              <td>{enrollment.status}</td>
              <td>
                {enrollment.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(enrollment.id)}>승인</button>
                    <button onClick={() => handleReject(enrollment.id, '사유')}>반려</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

### 3.2 라우팅 추가

**파일**: `apps/admin-dashboard/src/App.tsx`

**추가할 라우트**:
```typescript
import EnrollmentManagement from '@/pages/enrollments/EnrollmentManagement';

// Routes
<Route path="/enrollments" element={
  <AdminProtectedRoute requiredPermissions={['users:read']}>
    <Suspense fallback={<PageLoader />}>
      <EnrollmentManagement />
    </Suspense>
  </AdminProtectedRoute>
} />
```

---

## 4. 공통 패키지 수정

### 4.1 auth-context 업데이트 (선택사항)

**파일**: `packages/auth-context/src/CookieAuthProvider.tsx`

**확인 사항**:
- `cookieAuthClient` 사용 중인지 확인
- `/me` 응답에 `assignments` 반영 확인

---

## 5. 테스트 계획

### 5.1 단위 테스트 체크리스트

- [ ] `CookieAuthClient.getCurrentUser()` → `assignments[]` 반환
- [ ] `CookieAuthClient.createEnrollment()` → 201 응답
- [ ] `CookieAuthClient.getMyEnrollments()` → 배열 반환
- [ ] `AuthContext.hasRole()` → 정확한 boolean 반환

### 5.2 통합 테스트 체크리스트

- [ ] 로그인 → `/me` 호출 → `assignments` 존재
- [ ] `/apply/supplier` → 제출 → 201 응답
- [ ] `/apply/supplier/status` → 신청 현황 표시
- [ ] 승인 전 `/dashboard/supplier` → `/apply/supplier/status`로 리디렉션
- [ ] 승인 후 `/dashboard/supplier` → 정상 진입
- [ ] 관리자 `/enrollments` → 목록 표시
- [ ] 관리자 승인/반려 → 목록 갱신

### 5.3 E2E 테스트 시나리오

1. **신청 → 승인 → 대시보드 접근**
   - 사용자 회원가입 → 로그인
   - `/apply/supplier` 신청
   - `/apply/supplier/status` 확인 (pending)
   - 관리자 승인
   - `/dashboard/supplier` 접근 성공

2. **중복 신청 방지**
   - 사용자 `/apply/supplier` 신청
   - 다시 신청 시도 → 409 에러
   - `/apply/supplier/status`로 리디렉션

3. **반려 후 재신청**
   - 관리자 반려
   - `/apply/supplier/status` → 반려 사유 표시
   - (추후 P1에서 재신청 기능 구현)

---

## 6. 배포 체크리스트

### 6.1 빌드 & 타입 체크

```bash
# 패키지 빌드
pnpm run build --filter @o4o/auth-client
pnpm run build --filter @o4o/auth-context

# 앱 빌드
pnpm run build --filter main-site
pnpm run build --filter admin-dashboard

# 타입 체크
pnpm run type-check
```

### 6.2 환경 변수 확인

**api-server `.env`**:
```env
COOKIE_DOMAIN=.neture.co.kr  # 크로스 도메인 SSO
NODE_ENV=production
```

**main-site `.env`**:
```env
VITE_API_URL=https://api.neture.co.kr
```

### 6.3 CORS 설정 확인

**api-server**:
```typescript
app.use(cors({
  origin: ['https://neture.co.kr', 'https://admin.neture.co.kr'],
  credentials: true
}));
```

---

## 7. 롤백 계획

**시나리오**: Phase C 배포 후 심각한 버그 발견

1. **라우팅 비활성화**:
   - `main-site/src/App.tsx`에서 신규 라우트 주석 처리
   - 재배포

2. **메뉴 숨김**:
   - 헤더/네비게이션에서 신규 메뉴 숨김

3. **서버 유지**:
   - Phase B는 롤백하지 않음 (데이터/보안 회귀 방지)
   - `/me`, `/enrollments` 엔드포인트는 정상 동작 유지

---

*최종 업데이트: 2025-11-09*
