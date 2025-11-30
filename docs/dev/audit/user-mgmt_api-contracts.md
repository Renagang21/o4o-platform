# 사용자 관리 API 계약

**작성일**: 2025-11-08
**버전**: 1.0
**범위**: 프론트엔드-백엔드 API 계약 조사

---

## 목차

1. [개요](#1-개요)
2. [인증 API](#2-인증-api)
3. [사용자 API](#3-사용자-api)
4. [역할/권한 API](#4-역할권한-api)
5. [클라이언트 호출 패턴](#5-클라이언트-호출-패턴)
6. [발견된 이슈](#6-발견된-이슈)

---

## 1. 개요

### 1.1 API 서버 구조

- **프로덕션 환경**: `api.neture.co.kr` → 웹서버 (13.125.144.8) → API 서버 (43.202.242.215:4000)
- **베이스 경로**: `/api/v1`
- **주요 라우트 파일**:
  - `/apps/api-server/src/routes/auth.ts` - JWT 기반 인증
  - `/apps/api-server/src/routes/auth-v2.ts` - 쿠키 기반 인증
  - `/apps/api-server/src/routes/unified-auth.routes.ts` - 통합 인증 (이메일 + OAuth)
  - `/apps/api-server/src/routes/social-auth.ts` - OAuth 소셜 로그인
  - `/apps/api-server/src/routes/user.ts` - 사용자 프로필 관리
  - `/apps/api-server/src/routes/v1/users.routes.ts` - 사용자 CRUD (관리자)

### 1.2 클라이언트 구조

- **Main Site**: `/apps/main-site/src`
  - 주 클라이언트: `axiosInstance`, `ssoAuthAPI`
  - 하이브리드 인증 (SSO 우선, 레거시 폴백)

- **Admin Dashboard**: `/apps/admin-dashboard/src`
  - 주 클라이언트: `authClient` (from `@o4o/auth-client`)
  - Zustand 상태 관리: `authStore.ts`

- **공용 패키지**: `/packages/auth-client`
  - `AuthClient` 클래스: Axios 기반 인증 클라이언트
  - 자동 토큰 갱신 인터셉터 포함

---

## 2. 인증 API

### 2.1 POST /api/auth/login (JWT 기반)

**설명**: 이메일/비밀번호 로그인 (JWT 토큰 반환)

**요청**:
```typescript
{
  email: string;      // 이메일 (유효한 형식 필수)
  password: string;   // 비밀번호 (최소 6자)
}
```

**응답 (성공)**:
```typescript
{
  success: true,
  message: 'Login successful',
  token: string,  // JWT 액세스 토큰 (7일 만료)
  user: {
    id: string,
    email: string,
    name: string,
    role: string,  // 레거시 필드
    activeRole: {  // 현재 활성 역할
      id: string,
      name: string,
      displayName: string
    } | null,
    roles: Array<{  // 사용자의 모든 역할
      id: string,
      name: string,
      displayName: string
    }>,
    canSwitchRoles: boolean,  // 다중 역할 보유 여부
    status: string,
    businessInfo?: BusinessInfo
  }
}
```

**에러 코드**:
- `400`: 유효성 검증 실패 (`VALIDATION_ERROR`)
- `401`: 잘못된 자격 증명 (`INVALID_CREDENTIALS`)
- `401`: 소셜 로그인 전용 계정 (`SOCIAL_LOGIN_REQUIRED`)
- `400`: 계정 비활성화 (`ACCOUNT_NOT_ACTIVE`)
- `503`: 데이터베이스 연결 실패 (`DATABASE_UNAVAILABLE`)

**입력 검증**:
```javascript
// express-validator 사용
body('email').isEmail().withMessage('Valid email is required')
body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
```

**클라이언트 사용처**:
- Main Site: `/apps/main-site/src/api/auth/authApi.ts` (레거시 폴백)
- Admin Dashboard: `authClient.login()` via `@o4o/auth-client`

**구현 파일**: `/apps/api-server/src/routes/auth.ts` (라인 15-101)

---

### 2.2 POST /api/auth/signup (회원가입)

**설명**: 새 사용자 등록 (강화된 비밀번호 정책)

**요청**:
```typescript
{
  email: string;
  password: string;         // 최소 8자, 대소문자+숫자+특수문자 필수
  passwordConfirm: string;  // 비밀번호 확인
  name?: string;            // 선택적 (기본값: 이메일 앞부분)
  tos: boolean;             // 약관 동의 필수
}
```

**응답 (성공)**:
```typescript
{
  success: true,
  message: 'Signup successful',
  token: string,  // 즉시 로그인 처리
  user: {
    id: string,
    email: string,
    name: string,
    role: 'customer',  // 기본 역할
    status: 'active'   // 즉시 활성화
  },
  redirectUrl: string  // 역할별 리다이렉트 경로
}
```

**에러 코드**:
- `400`: 비밀번호 불일치 (`PASSWORD_MISMATCH`)
- `400`: 약관 미동의 (`TOS_NOT_ACCEPTED`)
- `400`: 이메일 중복 (`EMAIL_EXISTS`)
- `400`: 회원가입 비활성화 (`SIGNUP_DISABLED`)

**입력 검증**:
```javascript
body('email').isEmail()
body('password')
  .isLength({ min: 8 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
body('passwordConfirm').notEmpty()
body('name').optional().isLength({ min: 2 })
body('tos').isBoolean().equals('true')
```

**클라이언트 사용처**:
- Main Site: `/apps/main-site/src/pages/auth/Signup.tsx`

**구현 파일**: `/apps/api-server/src/routes/auth.ts` (라인 195-204)

---

### 2.3 POST /api/v1/auth/cookie/login (쿠키 기반)

**설명**: httpOnly 쿠키 기반 로그인 (CSRF 보호 강화)

**요청**: 동일한 이메일/비밀번호

**응답**:
```typescript
{
  success: true,
  message: 'Login successful',
  user: {
    id: string,
    email: string,
    name: string,
    role: string,
    status: string,
    businessInfo?: BusinessInfo
  }
  // 주의: 토큰은 httpOnly 쿠키로 설정되며 응답 본문에 포함되지 않음
}
```

**쿠키 설정**:
```javascript
// accessToken (15분)
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000
});

// refreshToken (7일)
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// sessionId (SSO용)
res.cookie('sessionId', sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: process.env.COOKIE_DOMAIN
});
```

**클라이언트 사용처**:
- SSO 인증 시스템에서 사용

**구현 파일**: `/apps/api-server/src/routes/auth-v2.ts` (라인 16-87)

---

### 2.4 POST /api/v1/auth/cookie/refresh (토큰 갱신)

**설명**: 리프레시 토큰으로 액세스 토큰 갱신

**요청**: 쿠키에서 `refreshToken` 자동 전달

**응답**:
```typescript
{
  success: true,
  message: 'Token refreshed successfully'
}
// 새 액세스 토큰과 리프레시 토큰이 쿠키로 자동 설정됨
```

**에러 코드**:
- `401`: 리프레시 토큰 없음 (`NO_REFRESH_TOKEN`)
- `401`: 유효하지 않은 리프레시 토큰 (`INVALID_REFRESH_TOKEN`)

**클라이언트 사용처**:
- `authClient` 인터셉터에서 401 에러 시 자동 호출

**구현 파일**: `/apps/api-server/src/routes/auth-v2.ts` (라인 158-195)

---

### 2.5 POST /api/auth/logout (로그아웃)

**설명**: JWT 토큰 무효화 (향후 블랙리스트 구현 예정)

**요청**: 헤더에 Bearer 토큰 필요

**응답**:
```typescript
{
  success: true,
  message: 'Logout successful'
}
```

**클라이언트 처리**:
- 서버 응답과 무관하게 로컬 토큰 삭제
- localStorage, sessionStorage, 쿠키 모두 정리

**구현 파일**: `/apps/api-server/src/routes/auth.ts` (라인 224-231)

---

### 2.6 GET /api/auth/status (인증 상태 확인)

**설명**: 현재 인증된 사용자 정보 조회

**요청**: Bearer 토큰 필요

**응답**:
```typescript
{
  authenticated: true,
  user: {
    id: string,
    email: string,
    name: string,
    role: string,
    activeRole: { ... } | null,
    roles: Array<{ ... }>,
    canSwitchRoles: boolean,
    status: string,
    createdAt: Date,
    lastLoginAt: Date
  },
  tokenInfo: {
    issuedAt: string | null,  // ISO 8601
    expiresAt: string | null   // ISO 8601
  }
}
```

**구현 파일**: `/apps/api-server/src/routes/auth.ts` (라인 234-284)

---

### 2.7 GET /api/auth/verify (토큰 검증)

**설명**: JWT 토큰 유효성 검증

**요청**: Bearer 토큰 필요

**응답**:
```typescript
{
  success: true,
  message: 'Token is valid',
  user: {
    // JWTPayload 필드들
  }
}
```

**구현 파일**: `/apps/api-server/src/routes/auth.ts` (라인 215-221)

---

### 2.8 POST /api/auth/unified/login (통합 인증)

**설명**: 이메일 및 OAuth 통합 로그인 엔드포인트

**요청**:
```typescript
{
  provider: 'email' | 'google' | 'kakao' | 'naver',

  // 이메일 로그인 시:
  email?: string,
  password?: string,

  // OAuth 로그인 시:
  oauthProfile?: {
    id: string,
    email: string,
    displayName?: string,
    firstName?: string,
    lastName?: string,
    avatar?: string,
    emailVerified?: boolean
  }
}
```

**응답**:
```typescript
{
  success: true,
  user: { ... },
  tokens: {
    accessToken: string,
    refreshToken: string
  }
}
```

**쿠키 설정** (프로덕션 환경):
- `accessToken`: 15분, `.neture.co.kr` 도메인
- `refreshToken`: 7일, `.neture.co.kr` 도메인

**구현 파일**: `/apps/api-server/src/routes/unified-auth.routes.ts` (라인 45-128)

---

### 2.9 OAuth 소셜 로그인

#### GET /api/v1/social/google
**설명**: Google OAuth 인증 시작

**리다이렉트**: Google 로그인 페이지

#### GET /api/v1/social/google/callback
**설명**: Google OAuth 콜백 처리

**성공 시**: `{FRONTEND_URL}/auth/callback?success=true`로 리다이렉트
**실패 시**: `{FRONTEND_URL}/auth/callback?error=social_auth_failed`로 리다이렉트

#### GET /api/v1/social/kakao, /api/v1/social/naver
**설명**: Kakao, Naver OAuth (동일한 패턴)

#### GET /api/v1/social/status
**설명**: OAuth 설정 상태 확인

**응답**:
```typescript
{
  success: true,
  oauth: {
    enabled: boolean,
    providers: {
      google: boolean,
      kakao: boolean,
      naver: boolean
    },
    activeStrategies: string[],
    message: string
  }
}
```

**구현 파일**: `/apps/api-server/src/routes/social-auth.ts`

---

### 2.10 비밀번호 재설정

#### POST /api/v1/auth/cookie/forgot-password
**요청**:
```typescript
{ email: string }
```

**응답**: 항상 성공 (이메일 열거 공격 방지)
```typescript
{
  success: true,
  message: 'If an account exists with this email, a password reset link has been sent.'
}
```

#### POST /api/v1/auth/cookie/reset-password
**요청**:
```typescript
{
  token: string,
  password: string  // 최소 6자
}
```

**응답**:
```typescript
{
  success: true,
  message: 'Password has been reset successfully'
}
```

**구현 파일**: `/apps/api-server/src/routes/auth-v2.ts` (라인 305-360)

---

### 2.11 이메일 인증

#### POST /api/v1/auth/cookie/resend-verification
**요청**:
```typescript
{ email: string }
```

**응답**: 항상 성공 (이메일 열거 공격 방지)

#### GET /api/v1/auth/cookie/verify-email?token=...
**설명**: 이메일 인증 링크 처리

**응답**:
```typescript
{
  success: true,
  message: 'Email has been verified successfully'
}
```

**에러 코드**:
- `TOKEN_EXPIRED`: 토큰 만료
- `INVALID_TOKEN`: 유효하지 않은 토큰
- `ALREADY_VERIFIED`: 이미 인증됨

**구현 파일**: `/apps/api-server/src/routes/auth-v2.ts` (라인 387-509)

---

## 3. 사용자 API

### 3.1 GET /api/users/profile (현재 사용자 프로필)

**설명**: 인증된 사용자의 프로필 조회

**요청**: Bearer 토큰 필요

**응답**:
```typescript
{
  id: string,
  email: string,
  name: string,
  role: string,
  status: string,
  businessInfo?: BusinessInfo,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt?: Date
}
```

**클라이언트 사용처**:
- UserController.getProfile()

**구현 파일**: `/apps/api-server/src/routes/user.ts` (라인 11)

---

### 3.2 PUT /api/users/business-info (비즈니스 정보 업데이트)

**설명**: 사용자의 비즈니스 정보 업데이트

**요청**:
```typescript
{
  companyName?: string,
  businessType?: string,
  taxId?: string,
  address?: {
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  contactInfo?: {
    phone: string,
    website?: string
  },
  metadata?: Record<string, any>
}
```

**구현 파일**: `/apps/api-server/src/routes/user.ts` (라인 14)

---

### 3.3 GET /api/v1/users (사용자 목록 - 관리자)

**설명**: 모든 사용자 조회 (관리자 전용)

**요청 쿼리**:
```typescript
{
  page?: number,      // 기본값: 1
  limit?: number,     // 기본값: 10
  search?: string,    // 이메일/이름 검색
  status?: string,    // 상태 필터
  role?: string       // 역할 필터
}
```

**응답**:
```typescript
{
  success: true,
  data: {
    users: Array<{
      id: string,
      email: string,
      name: string,
      role: string,
      status: string,
      provider: string,
      businessInfo?: BusinessInfo,
      createdAt: Date,
      updatedAt: Date,
      lastLoginAt?: Date
    }>,
    pagination: {
      current: number,
      total: number,
      count: number,
      totalItems: number
    }
  }
}
```

**권한**: `ADMIN`, `SUPER_ADMIN`, `MANAGER`

**구현 파일**: `/apps/api-server/src/routes/v1/users.routes.ts` (라인 23-95)

---

### 3.4 GET /api/v1/users/:id (사용자 상세 - 관리자)

**설명**: 특정 사용자 조회

**권한**: 관리자

**응답**:
```typescript
{
  success: true,
  data: {
    // User 엔티티 전체
  }
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/users.routes.ts` (라인 98-121)

---

### 3.5 POST /api/v1/users (사용자 생성 - 관리자)

**설명**: 새 사용자 생성 (관리자 전용)

**요청**:
```typescript
{
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  role?: string,      // 기본값: 'customer'
  status?: string     // 기본값: 'active'
}
```

**응답**:
```typescript
{
  success: true,
  data: {
    // 생성된 User (비밀번호 제외)
  }
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/users.routes.ts` (라인 150-195)

---

### 3.6 PUT /api/v1/users/:id (사용자 전체 업데이트 - 관리자)

**설명**: 사용자 정보 전체 업데이트

**요청**:
```typescript
{
  email?: string,
  password?: string,
  firstName?: string,
  lastName?: string,
  role?: string,
  status?: string
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/users.routes.ts` (라인 198-237)

---

### 3.7 PATCH /api/v1/users/:id (사용자 부분 업데이트 - 관리자)

**설명**: 사용자 정보 부분 업데이트 (role, status, name만)

**요청**:
```typescript
{
  role?: string,
  status?: string,
  name?: string
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/users.routes.ts` (라인 240-270)

---

### 3.8 DELETE /api/v1/users/:id (사용자 삭제 - 관리자)

**설명**: 사용자 삭제

**응답**:
```typescript
{
  success: true,
  message: 'User deleted successfully'
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/users.routes.ts` (라인 124-147)

---

## 4. 역할/권한 API

### 4.1 GET /api/v1/users/roles (역할 정의)

**설명**: 시스템의 모든 역할 정의 조회 (공개 엔드포인트)

**응답**:
```typescript
{
  roles: Array<{
    name: string,
    displayName: string,
    description: string,
    permissions: string[]
  }>
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/userRole.routes.ts` (라인 14)

---

### 4.2 GET /api/v1/users/roles/statistics (역할 통계 - 관리자)

**설명**: 각 역할별 사용자 수 통계

**권한**: 관리자

**응답**:
```typescript
{
  statistics: Record<string, number>
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/userRole.routes.ts` (라인 15)

---

### 4.3 GET /api/v1/users/permissions (권한 목록)

**설명**: 현재 사용자의 권한 조회

**응답**:
```typescript
{
  permissions: string[]
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/userRole.routes.ts` (라인 16)

---

### 4.4 GET /api/v1/users/:id/role (사용자 역할 조회)

**설명**: 특정 사용자의 역할 조회

**권한**: 본인 또는 관리자

**응답**:
```typescript
{
  role: string,
  activeRole?: {
    id: string,
    name: string,
    displayName: string
  },
  roles: Array<{
    id: string,
    name: string,
    displayName: string
  }>
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/userRole.routes.ts` (라인 19)

---

### 4.5 PUT /api/v1/users/:id/role (역할 업데이트 - 관리자)

**설명**: 사용자의 역할 변경

**요청**:
```typescript
{
  role: string
}
```

**권한**: 관리자

**구현 파일**: `/apps/api-server/src/routes/v1/userRole.routes.ts` (라인 20)

---

### 4.6 GET /api/v1/users/:id/permissions (사용자 권한 조회)

**설명**: 특정 사용자의 모든 권한 조회

**권한**: 본인 또는 관리자

**구현 파일**: `/apps/api-server/src/routes/v1/userRole.routes.ts` (라인 21)

---

### 4.7 GET /api/v1/users/:id/permissions/check (권한 확인)

**설명**: 특정 권한 보유 여부 확인

**요청 쿼리**:
```typescript
{ permission: string }
```

**응답**:
```typescript
{
  hasPermission: boolean
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/userRole.routes.ts` (라인 22)

---

### 4.8 PATCH /api/v1/users/me/active-role (활성 역할 전환)

**설명**: 다중 역할 사용자의 현재 활성 역할 전환

**요청**:
```typescript
{
  roleId: string  // 전환할 역할 ID
}
```

**응답**:
```typescript
{
  success: true,
  activeRole: {
    id: string,
    name: string,
    displayName: string
  }
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/userRoleSwitch.routes.ts` (라인 9-14)

---

### 4.9 GET /api/v1/users/me/roles (현재 사용자 역할 목록)

**설명**: 현재 사용자의 모든 역할 조회

**응답**:
```typescript
{
  roles: Array<{
    id: string,
    name: string,
    displayName: string,
    isActive: boolean
  }>
}
```

**구현 파일**: `/apps/api-server/src/routes/v1/userRoleSwitch.routes.ts` (라인 17-22)

---

## 5. 클라이언트 호출 패턴

### 5.1 authClient 사용 (Admin Dashboard)

**파일**: `/packages/auth-client/src/client.ts`

**초기화**:
```typescript
const authClient = new AuthClient(getApiUrl());

// baseURL 자동 설정
function getApiUrl() {
  // 환경변수 우선
  const envApiUrl = window.__ENV__?.VITE_API_URL || import.meta.env?.VITE_API_URL;

  if (envApiUrl) {
    // /api/v1 자동 추가
    return envApiUrl.endsWith('/api/v1') ? envApiUrl :
           envApiUrl.endsWith('/api') ? `${envApiUrl}/v1` :
           `${envApiUrl}/api/v1`;
  }

  // localhost 감지
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3002/api/v1';
  }

  // 프로덕션 기본값
  return 'https://api.neture.co.kr/api/v1';
}
```

**토큰 주입 인터셉터**:
```typescript
this.api.interceptors.request.use((config) => {
  // 다중 토큰 위치 확인
  let token = localStorage.getItem('accessToken') ||
              localStorage.getItem('token') ||
              localStorage.getItem('authToken');

  // admin-auth-storage 확인
  if (!token) {
    const authStorage = localStorage.getItem('admin-auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      token = parsed.state?.accessToken || parsed.state?.token;
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**자동 토큰 갱신**:
```typescript
this.api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 에러 && 재시도 안 함 && refreshToken 존재
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // /auth/refresh 호출
        const response = await this.api.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // 토큰 업데이트
        localStorage.setItem('accessToken', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return this.api.request(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
```

**장점**:
- baseURL 자동 설정으로 환경별 URL 관리 편리
- 토큰 갱신 자동화
- 다중 토큰 저장소 지원

**단점**:
- 여러 localStorage 키를 확인하여 복잡성 증가
- 토큰 갱신 실패 시 로그인 페이지로 강제 리다이렉트

---

### 5.2 axiosInstance 사용 (Main Site)

**파일**: `/apps/main-site/src/api/config/axios.ts`

**특징**:
- SSO API와 레거시 API 하이브리드 사용
- 환경변수로 SSO 활성화 제어: `VITE_USE_SSO`

**SSO 우선 폴백 패턴**:
```typescript
async login(data: LoginRequest) {
  if (USE_SSO) {
    try {
      const ssoResponse = await ssoAuthAPI.login(data.email, data.password);
      // SSO 성공 시 레거시 형식으로 변환
      return {
        token: ssoResponse.data.accessToken,
        user: ssoUserToLegacyUser(ssoResponse.data.user)
      };
    } catch (error) {
      // SSO 실패 시 레거시 시스템으로 폴백
      return this.legacyLogin(data);
    }
  } else {
    return this.legacyLogin(data);
  }
}
```

---

### 5.3 React Query 사용 (Admin Dashboard)

**캐시 키 전략**:
```typescript
// 사용자 목록
queryKey: ['users', { page, limit, search, status, role }]

// 단일 사용자
queryKey: ['user', userId]

// 현재 사용자
queryKey: ['auth', 'me']
```

**무효화(Invalidation) 패턴**:
```typescript
// 사용자 생성/수정 후
queryClient.invalidateQueries({ queryKey: ['users'] });
queryClient.invalidateQueries({ queryKey: ['user', userId] });

// 로그인 성공 후
queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
```

**낙관적 업데이트(Optimistic Update)**:
```typescript
const mutation = useMutation({
  mutationFn: updateUser,
  onMutate: async (newUser) => {
    // 이전 쿼리 취소
    await queryClient.cancelQueries({ queryKey: ['user', userId] });

    // 이전 데이터 스냅샷
    const previousUser = queryClient.getQueryData(['user', userId]);

    // 낙관적 업데이트
    queryClient.setQueryData(['user', userId], newUser);

    return { previousUser };
  },
  onError: (err, newUser, context) => {
    // 에러 시 롤백
    queryClient.setQueryData(['user', userId], context.previousUser);
  },
  onSettled: () => {
    // 완료 후 재검증
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
  }
});
```

---

### 5.4 에러 처리

**표준 에러 응답**:
```typescript
{
  success: false,
  error: string,      // 에러 메시지
  code: string,       // 에러 코드
  message?: string    // 추가 설명
}
```

**공통 에러 코드**:
- `VALIDATION_ERROR`: 입력 검증 실패
- `INVALID_CREDENTIALS`: 잘못된 자격 증명
- `UNAUTHORIZED`: 인증 실패
- `FORBIDDEN`: 권한 부족
- `NOT_FOUND`: 리소스 없음
- `CONFLICT`: 충돌 (예: 이메일 중복)
- `INTERNAL_SERVER_ERROR`: 서버 오류

**클라이언트 에러 핸들링**:
```typescript
try {
  const response = await authClient.api.post('/auth/login', credentials);
  return response.data;
} catch (error) {
  if (error.response?.status === 401) {
    throw new Error('아이디 또는 비밀번호가 잘못되었습니다.');
  } else if (error.response?.status === 403) {
    throw new Error('계정이 비활성화되었습니다.');
  } else {
    throw new Error('로그인에 실패했습니다. 다시 시도해주세요.');
  }
}
```

---

## 6. 발견된 이슈

### 6.1 계약 불일치

#### 6.1.1 역할 필드 타입 불일치

**문제**: 백엔드는 `activeRole` 객체와 `roles` 배열을 반환하지만, 일부 클라이언트는 레거시 `role` 문자열만 사용

**위치**:
- 백엔드: `/apps/api-server/src/routes/auth.ts` (라인 85-95)
- 클라이언트: `/apps/main-site/src/types/auth.ts`

**권장 사항**:
- 모든 클라이언트에서 `activeRole` 및 `roles` 필드 지원
- 레거시 `role` 필드는 deprecated 표시

---

#### 6.1.2 에러 코드 불일치

**문제**: 일부 엔드포인트는 `code` 필드를 사용하고, 다른 엔드포인트는 사용하지 않음

**예시**:
```typescript
// auth.ts (일관성 있음)
throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');

// auth-v2.ts (문자열 직접 반환)
return res.status(401).json({
  error: 'Invalid credentials',
  code: 'INVALID_CREDENTIALS'  // 일관성 있음
});
```

**권장 사항**:
- 모든 에러 응답에 표준 `code` 필드 추가
- 클라이언트는 `code` 필드로 에러 타입 판단

---

### 6.2 하드코딩 문제

#### 6.2.1 직접 URL 구성

**문제**: 클라이언트에서 API 경로를 직접 구성하여 baseURL 중복

**사례 1**: Main Site - `/apps/main-site/src/services/analyticsApi.ts`
```typescript
// 잘못된 예시 - /api/v1이 두 번 들어감
const response = await authClient.api.get('/api/v1/analytics/partner/summary', {
  params: { startDate, endDate }
});
```

**올바른 방법**:
```typescript
// authClient는 이미 baseURL에 /api/v1을 포함함
const response = await authClient.api.get('/analytics/partner/summary', {
  params: { startDate, endDate }
});
```

---

**사례 2**: Admin Dashboard - `/apps/admin-dashboard/src/hooks/useReusableBlocks.ts`
```typescript
// 잘못된 예시 - fetch() 직접 사용
const response = await fetch('/api/reusable-blocks', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // 토큰 주입 수동 처리 필요
  }
});
```

**올바른 방법**:
```typescript
// authClient 사용
const response = await authClient.api.get('/reusable-blocks');
```

---

**사례 3**: Main Site - `/apps/main-site/src/api/admin/adminApi.ts`
```typescript
// 잘못된 예시 - /api 접두사 직접 추가
const response = await axiosInstance.get<SalesStats>('/api/admin/stats/sales');
```

**올바른 방법**:
```typescript
// axiosInstance의 baseURL이 /api/v1이면
const response = await axiosInstance.get<SalesStats>('/admin/stats/sales');
```

---

#### 6.2.2 환경변수 직접 사용

**문제**: 클라이언트에서 `VITE_API_URL`을 직접 참조하여 baseURL을 하드코딩

**사례**: `/apps/admin-dashboard/src/App.tsx`
```typescript
// 잘못된 예시
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
```

**올바른 방법**:
```typescript
// authClient가 자동으로 처리
import { authClient } from '@o4o/auth-client';
// authClient.api 사용 시 baseURL 자동 설정됨
```

---

#### 6.2.3 중복 경로 문제

**문제**: API 경로에 `/api/v1`이 중복되어 404 에러 발생 가능성

**검증 필요한 파일**:
- `/apps/main-site/src/services/analyticsApi.ts` (라인 194, 209, 227)
- `/apps/main-site/src/services/settlementApi.ts` (라인 98, 106, 114)
- `/apps/admin-dashboard/src/api/ai-references.api.ts` (라인 46, 59, 72, 85, 98)

**확인 방법**:
1. `authClient.api.baseURL` 확인
2. 요청 경로가 `/api/v1`로 시작하는지 확인
3. 중복되면 `/api/v1` 제거

---

### 6.3 성능 이슈

#### 6.3.1 불필요한 재요청

**문제**: 사용자 정보를 매번 요청하여 불필요한 네트워크 트래픽 발생

**권장 사항**:
- React Query의 `staleTime` 설정으로 캐시 유지
```typescript
const { data: user } = useQuery({
  queryKey: ['auth', 'me'],
  queryFn: getCurrentUser,
  staleTime: 5 * 60 * 1000,  // 5분간 캐시 유지
  cacheTime: 30 * 60 * 1000  // 30분간 메모리 유지
});
```

---

#### 6.3.2 대용량 사용자 목록 응답

**문제**: 페이지네이션이 있지만 기본 limit이 작음

**권장 사항**:
- 기본 limit을 10에서 25로 증가
- 프론트엔드에서 가상 스크롤(Virtual Scrolling) 구현

---

### 6.4 보안 이슈

#### 6.4.1 입력 검증 누락

**문제**: 일부 엔드포인트에서 입력 검증 미흡

**사례**: `/apps/api-server/src/routes/v1/users.routes.ts` (라인 150-195)
```typescript
// POST /api/v1/users - 비밀번호 강도 검증 없음
router.post('/', authenticate, requireAdmin, async (req, res) => {
  // 비밀번호 검증 로직 없음 - User 엔티티의 BeforeInsert 훅에만 의존
});
```

**권장 사항**:
- express-validator 추가
```typescript
router.post('/',
  authenticate,
  requireAdmin,
  body('email').isEmail(),
  body('password').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  async (req, res) => { ... }
);
```

---

#### 6.4.2 레이트 리밋 미적용

**문제**: 일부 인증 엔드포인트에 레이트 리밋 미적용

**확인 필요**:
- `/api/auth/login` - 브루트포스 공격 가능성
- `/api/auth/signup` - 스팸 가입 가능성

**권장 사항**:
- `/apps/api-server/src/config/rate-limiters.config.ts`에 정의된 리미터 적용
```typescript
import { standardLimiter } from '../config/rate-limiters.config.js';

router.post('/login', standardLimiter, ...);
router.post('/signup', standardLimiter, ...);
```

---

#### 6.4.3 민감정보 노출

**문제**: 에러 메시지에서 사용자 존재 여부 노출

**사례**: `/apps/api-server/src/routes/auth.ts` (라인 38-40)
```typescript
if (!user) {
  throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
}

// 개선됨: 비밀번호가 없는 경우에도 동일한 에러 메시지
if (!user.password) {
  throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');  // Good
}
```

**좋은 사례**: 비밀번호 재설정 (라인 305-330)
```typescript
// 항상 성공 응답 (이메일 열거 공격 방지)
res.json({
  success: true,
  message: 'If an account exists with this email, a password reset link has been sent.'
});
```

---

### 6.5 기타 이슈

#### 6.5.1 토큰 저장소 일관성 부족

**문제**: 여러 localStorage 키에 토큰 저장 (혼란 가능성)

**현재 상태**:
- `accessToken`
- `token`
- `authToken`
- `admin-auth-storage` (Zustand persist)
- `legacy_token`
- `sso_access_token`

**권장 사항**:
- 표준 키를 하나로 통일 (예: `accessToken`)
- 레거시 키는 마이그레이션 후 제거

---

#### 6.5.2 Passport 세션 사용 불필요

**문제**: OAuth 사용 시 세션 미들웨어 필요하지만, JWT 사용 시 불필요

**현재 상태**:
```typescript
// /apps/api-server/src/main.ts
app.use(session(sessionConfig));  // 항상 활성화
app.use(passport.initialize());
```

**권장 사항**:
- OAuth 라우트에만 세션 미들웨어 적용
- JWT 라우트는 세션 미들웨어 스킵

---

## 7. 권장 조치 사항

### 7.1 우선순위 1 (즉시 수정)

1. **하드코딩된 API 경로 제거**
   - `/apps/main-site/src/services/analyticsApi.ts` 수정
   - `/apps/admin-dashboard/src/hooks/useReusableBlocks.ts` 수정
   - authClient.api 사용으로 통일

2. **입력 검증 강화**
   - 모든 사용자 생성/수정 엔드포인트에 express-validator 추가
   - 비밀번호 강도 검증 표준화

3. **레이트 리밋 적용**
   - `/api/auth/login`, `/api/auth/signup`에 리미터 추가

---

### 7.2 우선순위 2 (단기 개선)

1. **에러 코드 표준화**
   - 모든 에러 응답에 `code` 필드 추가
   - 에러 코드 문서화

2. **토큰 저장소 통일**
   - 레거시 키 마이그레이션 스크립트 작성
   - `accessToken` 하나로 통일

3. **TypeScript 타입 정의 일치**
   - 백엔드 응답 타입을 프론트엔드 공용 패키지로 이동
   - `@o4o/shared-types` 패키지 생성

---

### 7.3 우선순위 3 (장기 개선)

1. **API 문서 자동화**
   - Swagger/OpenAPI 스펙 완성
   - 클라이언트 SDK 자동 생성

2. **성능 최적화**
   - 사용자 목록 가상 스크롤링
   - Redis 캐싱 적용

3. **보안 강화**
   - CSRF 토큰 적용
   - 토큰 블랙리스트 구현

---

## 8. 부록

### 8.1 주요 파일 경로

#### 백엔드
- 인증 라우트: `/apps/api-server/src/routes/auth.ts`
- 쿠키 인증: `/apps/api-server/src/routes/auth-v2.ts`
- 통합 인증: `/apps/api-server/src/routes/unified-auth.routes.ts`
- OAuth: `/apps/api-server/src/routes/social-auth.ts`
- 사용자 관리: `/apps/api-server/src/routes/v1/users.routes.ts`
- 역할 관리: `/apps/api-server/src/routes/v1/userRole.routes.ts`

#### 프론트엔드
- Auth Client: `/packages/auth-client/src/client.ts`
- Main Site Auth: `/apps/main-site/src/api/auth/authApi.ts`
- Admin Auth Store: `/apps/admin-dashboard/src/stores/authStore.ts`

#### 타입 정의
- Auth Types: `/apps/api-server/src/types/auth.ts`
- User Types: `/apps/api-server/src/types/user.ts`

---

### 8.2 환경변수

#### 백엔드
```bash
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...
COOKIE_DOMAIN=.neture.co.kr
FRONTEND_URL=https://neture.co.kr
AUTH_ALLOW_SIGNUP=true
BCRYPT_ROUNDS=12
```

#### 프론트엔드
```bash
VITE_API_URL=https://api.neture.co.kr
VITE_USE_SSO=true
```

---

**문서 끝**
