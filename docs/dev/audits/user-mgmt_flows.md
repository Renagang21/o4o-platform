# 사용자 관리 플로우

**작성일**: 2025-11-08
**버전**: 1.0
**작성자**: Claude Code Agent

---

## 목차

1. [인증 플로우](#1-인증-플로우)
2. [인가 플로우](#2-인가-플로우)
3. [보안](#3-보안)
4. [발견된 이슈](#4-발견된-이슈)

---

## 1. 인증 플로우

### 1.1 이메일/비밀번호 로그인

#### 시퀀스 다이어그램

```
Client                    API Server                   Database
  |                           |                            |
  |--POST /api/auth/login---->|                            |
  |  {email, password}        |                            |
  |                           |                            |
  |                           |--findOne(email)----------->|
  |                           |<--User or null-------------|
  |                           |                            |
  |                           |--bcrypt.compare()--------->|
  |                           |  (password, hash)          |
  |                           |<--true/false---------------|
  |                           |                            |
  |                           |--jwt.sign()--------------->|
  |                           |  (payload, secret)         |
  |                           |<--accessToken--------------|
  |                           |                            |
  |                           |--save(lastLoginAt)-------->|
  |<--{token, user}-----------|                            |
```

#### 주요 파일 경로

**Backend**:
- `/home/sohae21/o4o-platform/apps/api-server/src/routes/auth.ts` - 로그인 엔드포인트
- `/home/sohae21/o4o-platform/apps/api-server/src/services/AuthService.ts` - 인증 로직
- `/home/sohae21/o4o-platform/apps/api-server/src/middleware/auth.middleware.ts` - JWT 검증 미들웨어
- `/home/sohae21/o4o-platform/apps/api-server/src/routes/email-auth.routes.ts` - 이메일 인증 라우트

**Frontend**:
- `/home/sohae21/o4o-platform/apps/main-site/src/pages/auth/Login.tsx` - 로그인 페이지

#### API 엔드포인트

**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "customer",
    "status": "active",
    "activeRole": {
      "id": "uuid",
      "name": "customer",
      "displayName": "고객"
    },
    "roles": [...],
    "canSwitchRoles": false
  }
}
```

**POST /api/auth/email/login** (Alternative endpoint)
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}

Response:
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "user": {...},
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### 에러 처리

| 에러 코드 | HTTP Status | 설명 |
|----------|-------------|------|
| `INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호 오류 |
| `SOCIAL_LOGIN_REQUIRED` | 401 | 소셜 로그인 전용 계정 |
| `ACCOUNT_NOT_ACTIVE` | 400 | 계정이 활성화되지 않음 (pending, suspended, rejected) |
| `DATABASE_UNAVAILABLE` | 503 | 데이터베이스 연결 실패 |
| `ACCOUNT_LOCKED` | 429 | 로그인 시도 초과로 계정 잠김 |
| `EMAIL_NOT_VERIFIED` | 403 | 이메일 미인증 |

#### 보안 고려사항

1. **비밀번호 해싱**: bcrypt (salt rounds: 12)
2. **토큰 만료**: JWT 7일 (기본 설정)
3. **로그인 실패 추적**: LoginAttempt 테이블에 기록
4. **계정 잠금**: 5회 실패 시 30분 잠금
5. **최종 로그인 시간 업데이트**: 보안 감사 목적

---

### 1.2 OAuth 소셜 로그인

#### 지원 제공자

- **Google OAuth 2.0**
- **Kakao OAuth 2.0**
- **Naver OAuth 2.0**

#### Google OAuth 플로우

```
Client              Frontend           API Server          Google OAuth      Database
  |                     |                    |                    |              |
  |--Click Login------->|                    |                    |              |
  |                     |                    |                    |              |
  |                     |--Redirect--------->|                    |              |
  |                     |  /auth/google      |                    |              |
  |                     |                    |                    |              |
  |                     |                    |--Authorization---->|              |
  |                     |                    |  Request           |              |
  |                     |                    |                    |              |
  |<--------------------Redirect to Google------------------------|              |
  |                                          |                    |              |
  |--User Consent----------------------->|                        |              |
  |                                          |                    |              |
  |<----Callback with code------------------|                    |              |
  |  /auth/callback/google?code=xxx          |                    |              |
  |                     |                    |                    |              |
  |                     |--POST /auth/oauth->|                    |              |
  |                     |  /google/callback  |                    |              |
  |                     |  {code, state}     |                    |              |
  |                     |                    |                    |              |
  |                     |                    |--Exchange code---->|              |
  |                     |                    |  for tokens        |              |
  |                     |                    |<--Access Token-----|              |
  |                     |                    |                    |              |
  |                     |                    |--Get User Info---->|              |
  |                     |                    |<--Profile----------|              |
  |                     |                    |                    |              |
  |                     |                    |--Find/Create User-------------->|
  |                     |                    |<--User---------------------------|
  |                     |                    |                    |              |
  |                     |<--{user, tokens}---|                    |              |
  |<--Login Success-----|                    |                    |              |
```

#### Kakao OAuth 플로우

동일한 패턴이지만 Kakao OAuth 2.0 API 사용:
- 인증 URL: `https://kauth.kakao.com/oauth/authorize`
- 토큰 URL: `https://kauth.kakao.com/oauth/token`
- 사용자 정보: `https://kapi.kakao.com/v2/user/me`

#### Naver OAuth 플로우

동일한 패턴이지만 Naver OAuth 2.0 API 사용:
- 인증 URL: `https://nid.naver.com/oauth2.0/authorize`
- 토큰 URL: `https://nid.naver.com/oauth2.0/token`
- 사용자 정보: `https://openapi.naver.com/v1/nid/me`

#### 주요 파일 경로

**Backend**:
- `/home/sohae21/o4o-platform/apps/api-server/src/config/passport.ts` - Passport.js 전략 설정
- `/home/sohae21/o4o-platform/apps/api-server/src/routes/unified-auth.routes.ts` - 통합 OAuth 라우트
- `/home/sohae21/o4o-platform/apps/api-server/src/services/unified-auth.service.ts` - OAuth 로직

**Frontend**:
- `/home/sohae21/o4o-platform/apps/main-site/src/pages/auth/OAuthCallback.tsx` - OAuth 콜백 처리
- `/home/sohae21/o4o-platform/apps/main-site/src/pages/auth/Signup.tsx` - 소셜 로그인 버튼
- `/home/sohae21/o4o-platform/packages/shortcodes/src/auth/SocialLogin.tsx` - 소셜 로그인 컴포넌트

#### 리다이렉트 URL 처리

**Callback URLs**:
- Google: `/api/v1/auth/google/callback`
- Kakao: `/api/v1/auth/kakao/callback`
- Naver: `/api/v1/auth/naver/callback`

**Frontend Callback**:
- `/auth/callback/{provider}` → OAuthCallback 컴포넌트

#### 토큰 교환

1. Authorization Code 획득
2. Backend에 code 전송
3. Backend가 OAuth Provider와 토큰 교환
4. 사용자 정보 조회
5. DB에서 사용자 찾기/생성
6. JWT 토큰 발급 및 반환

#### 사용자 정보 매핑

```typescript
// Google Profile Mapping
{
  email: profile.emails?.[0]?.value,
  name: profile.displayName,
  firstName: profile.name?.givenName,
  lastName: profile.name?.familyName,
  provider: 'google',
  provider_id: profile.id,
  isEmailVerified: true
}

// Kakao Profile Mapping
{
  email: profile._json.kakao_account?.email,
  name: profile.displayName || profile.username || profile._json?.properties?.nickname,
  provider: 'kakao',
  provider_id: String(profile.id),
  isEmailVerified: true
}

// Naver Profile Mapping
{
  email: profile.email,
  name: profile.displayName || profile.nickname,
  provider: 'naver',
  provider_id: profile.id,
  isEmailVerified: true
}
```

#### OAuth 환경 변수

```bash
# Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Kakao
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Naver
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

---

### 1.3 토큰/세션 관리

#### 액세스 토큰 발급

**JWT Payload**:
```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "role": "customer",
  "sub": "user-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**설정**:
- 알고리즘: HS256 (HMAC SHA256)
- 만료: 15분 (기본값: `JWT_ACCESS_TOKEN_EXPIRES`)
- Secret: `JWT_SECRET` 환경 변수

#### 리프레시 토큰 발급

**JWT Payload**:
```json
{
  "userId": "user-uuid",
  "sub": "user-uuid",
  "tokenVersion": 1,
  "tokenFamily": "family-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**설정**:
- 만료: 7일 (기본값: `JWT_REFRESH_TOKEN_EXPIRES`)
- Secret: `JWT_REFRESH_SECRET` 환경 변수
- 저장: RefreshToken 테이블에 저장
- Rotation: 새 리프레시 토큰 발급 시 기존 토큰 무효화

#### 토큰 갱신

**엔드포인트**: `POST /api/auth/refresh`

```json
Request:
{
  "refreshToken": "refresh-token-string"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "tokenType": "Bearer"
  }
}
```

**프로세스**:
1. 리프레시 토큰 검증
2. RefreshToken 테이블에서 조회
3. 만료 여부 및 revoked 상태 확인
4. 새 액세스 토큰 생성
5. 리프레시 토큰의 `updatedAt` 업데이트

#### 토큰 만료 처리

**액세스 토큰 만료**:
- HTTP 403 Forbidden 응답
- 클라이언트는 리프레시 토큰으로 갱신 시도

**리프레시 토큰 만료**:
- 재로그인 필요
- 로그인 페이지로 리다이렉트

#### 저장 위치 및 방식

**프로덕션 환경**:
- **액세스 토큰**: HTTP-only 쿠키 (15분 만료)
- **리프레시 토큰**: HTTP-only 쿠키 (7일 만료)
- **쿠키 설정**:
  ```javascript
  {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    domain: '.neture.co.kr',
    maxAge: 15 * 60 * 1000 // 15분
  }
  ```

**개발 환경**:
- **액세스 토큰**: localStorage 또는 메모리
- **리프레시 토큰**: localStorage 또는 메모리

**데이터베이스 저장**:
- RefreshToken 테이블에 모든 리프레시 토큰 저장
- 필드: token, userId, expiresAt, deviceId, userAgent, ipAddress, revoked, revokedAt, revokedReason

---

### 1.4 이메일 검증

#### 검증 토큰 발급

**엔드포인트**: `POST /api/auth/register`

**프로세스**:
1. 회원가입 시 EmailVerificationToken 생성
2. 랜덤 토큰 생성 (64자리 hex)
3. 만료 시간 설정 (24시간)
4. DB에 저장

```typescript
const verificationToken = crypto.randomBytes(32).toString('hex');
const tokenEntity = {
  token: verificationToken,
  userId: user.id,
  email: user.email,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  usedAt: null
};
```

#### 검증 링크 전송

**이메일 템플릿**: `verification`

**링크 형식**:
```
https://neture.co.kr/auth/verify-email?token=verification-token-here
```

**주요 파일**:
- `/home/sohae21/o4o-platform/apps/api-server/src/routes/email-auth.routes.ts` (L61-148)
- `/home/sohae21/o4o-platform/apps/api-server/src/entities/EmailVerificationToken.ts`

#### 토큰 검증 및 만료

**엔드포인트**: `POST /api/auth/verify-email`

```json
Request:
{
  "token": "verification-token"
}

Response:
{
  "success": true,
  "message": "이메일 인증이 완료되었습니다"
}
```

**검증 프로세스**:
1. 토큰으로 EmailVerificationToken 조회
2. 토큰 존재 여부 확인
3. 만료 여부 확인 (`expiresAt > now`)
4. 사용 여부 확인 (`usedAt === null`)
5. User 상태를 `APPROVED`로 변경
6. 토큰의 `usedAt` 업데이트
7. Welcome 이메일 발송

**에러 처리**:
- `INVALID_TOKEN`: 토큰이 존재하지 않거나 이미 사용됨
- `TOKEN_EXPIRED`: 토큰 만료 (24시간 초과)
- `USER_NOT_FOUND`: 사용자 없음

---

### 1.5 비밀번호 재설정

#### 재설정 요청

**엔드포인트**: `POST /api/auth/password/reset-request` 또는 `POST /api/auth/unified/forgot-password`

```json
Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "비밀번호 재설정 링크가 이메일로 발송되었습니다"
}
```

**프로세스**:
1. 이메일로 사용자 조회
2. 존재하지 않아도 성공 응답 (보안상 이메일 열거 방지)
3. PasswordResetToken 생성
4. 만료 시간 설정 (1시간)
5. 재설정 링크 이메일 발송

#### 이메일 전송

**이메일 템플릿**: `passwordReset`

**링크 형식**:
```
https://neture.co.kr/auth/reset-password?token=reset-token-here
```

**주요 파일**:
- `/home/sohae21/o4o-platform/apps/api-server/src/routes/email-auth.routes.ts` (L387-462)
- `/home/sohae21/o4o-platform/apps/api-server/src/entities/PasswordResetToken.ts`

#### 토큰 검증

**엔드포인트**: `POST /api/auth/password/reset` 또는 `POST /api/auth/unified/reset-password`

```json
Request:
{
  "token": "reset-token",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}

Response:
{
  "success": true,
  "message": "비밀번호가 성공적으로 변경되었습니다"
}
```

**검증 프로세스**:
1. 토큰으로 PasswordResetToken 조회
2. 토큰 유효성 검증 (존재, 만료, 사용 여부)
3. 비밀번호 강도 검증
4. 비밀번호 해싱 (bcrypt, salt rounds: 10)
5. User 비밀번호 업데이트
6. 토큰의 `usedAt` 업데이트

#### 새 비밀번호 설정

**비밀번호 요구사항**:
- 최소 8자
- 대문자 1개 이상
- 소문자 1개 이상
- 숫자 1개 이상
- 특수문자 1개 이상 (`!@#$%^&*(),.?":{}|<>`)

**보안 조치**:
- bcrypt 해싱 (salt rounds: 10)
- 토큰은 일회용 (사용 후 `usedAt` 설정)
- 1시간 만료
- 이메일 열거 방지 (항상 성공 응답)

---

## 2. 인가 플로우

### 2.1 역할 체계

#### 역할 목록 및 설명

| 역할 코드 | 표시명 | 설명 | 권한 수준 |
|----------|--------|------|----------|
| `super_admin` | 슈퍼 관리자 | 시스템 최고 권한, 모든 기능 접근 가능 | 10 |
| `admin` | 관리자 | 관리 기능 접근, 사용자 및 콘텐츠 관리 | 9 |
| `moderator` | 중재자 | 콘텐츠 검토 및 중재 | 7 |
| `vendor` | 벤더 | 상품 판매, 주문 관리 | 6 |
| `vendor_manager` | 벤더 관리자 | 벤더 관리 기능 | 6 |
| `seller` | 판매자 | 드롭쉬핑 판매자, 상품 판매 | 5 |
| `supplier` | 공급자 | 드롭쉬핑 공급자, 상품 제공 및 재고 관리 | 5 |
| `partner` | 파트너 | 제휴 파트너 | 5 |
| `affiliate` | 제휴자 | 제휴 마케팅, 커미션 | 4 |
| `business` | 비즈니스 | 기업 고객 | 3 |
| `customer` | 고객 | 일반 사용자 | 2 |
| `beta_user` | 베타 사용자 | 베타 기능 테스트 | 2 |
| `manager` | 매니저 | 레거시 역할 (호환성 유지) | 7 |

#### 역할 계층 구조

```
super_admin
    └── admin
        ├── moderator
        ├── vendor_manager
        │   └── vendor
        └── manager (legacy)
            ├── seller
            ├── supplier
            ├── partner
            └── affiliate
                ├── business
                ├── customer
                └── beta_user
```

#### 기본 역할 및 권한

**신규 가입 시 기본 역할**: `customer`

**역할별 기본 권한**:

**super_admin / admin**:
- 모든 권한 (`*`)
- 사용자 관리: `users.view`, `users.create`, `users.edit`, `users.delete`, `users.suspend`, `users.approve`
- 콘텐츠 관리: `content.view`, `content.create`, `content.edit`, `content.delete`, `content.publish`, `content.moderate`
- 설정 관리: `admin.settings`, `admin.analytics`, `admin.logs`, `admin.backup`
- 기타: `acf.manage`, `cpt.manage`, `shortcodes.manage`, `api.access`, `api.admin`

**vendor / seller / supplier / partner**:
- 제품 관리: `read:products`, `create:products`, `update:own_products`
- 주문 조회: `read:own_orders`
- 분석: `read:analytics`
- 재고 관리 (supplier): `read:inventory`, `manage:inventory`

**customer / beta_user**:
- 제품 조회: `read:products`
- 주문 생성: `create:orders`
- 자신의 주문 조회: `read:own_orders`

#### 다중 역할 지원

**User 엔티티 구조**:
```typescript
// Legacy single role (backward compatibility)
role: UserRole

// Legacy roles array
roles: string[]

// New database roles (ManyToMany)
dbRoles: Role[]

// Active role for multi-role users
activeRole: Role | null
```

**역할 전환 메서드**:
- `hasMultipleRoles()`: 사용자가 2개 이상의 역할 보유 여부
- `canSwitchToRole(roleId)`: 특정 역할로 전환 가능 여부
- `getActiveRole()`: 현재 활성화된 역할 반환

---

### 2.2 권한 가드

#### 프론트엔드 라우트 보호

**PrivateRoute 컴포넌트** (`/home/sohae21/o4o-platform/apps/main-site/src/components/auth/PrivateRoute.tsx`):

```tsx
<PrivateRoute allowedUserTypes={['admin', 'vendor']}>
  <AdminDashboard />
</PrivateRoute>
```

**기능**:
- 인증 여부 확인 (`isAuthenticated`)
- 사용자 역할 확인 (`allowedUserTypes`)
- 권한 없을 시 역할별 기본 페이지로 리다이렉트
- Mock 모드 지원 (`VITE_USE_MOCK === 'true'`)

**RoleGate 컴포넌트** (`/home/sohae21/o4o-platform/apps/main-site/src/components/auth/RoleGate.tsx`):

```tsx
<RoleGate
  allowedRoles={['seller', 'vendor']}
  userRole={user.role}
  isApproved={user.status === 'approved'}
>
  <SellerDashboard />
</RoleGate>
```

**기능**:
- 역할 기반 접근 제어
- 승인 대기 상태 확인 (seller, supplier, yaksa 역할)
- 권한 없을 시 에러 페이지 표시
- 승인 대기 시 `/pending` 페이지로 리다이렉트

#### 컴포넌트 수준 권한

**조건부 렌더링**:
```tsx
{user.hasPermission('content.edit') && (
  <EditButton />
)}

{user.isAdmin() && (
  <AdminPanel />
)}

{user.hasAnyRole(['seller', 'vendor']) && (
  <SalesReport />
)}
```

#### API 미들웨어

**authenticate 미들웨어** (`/home/sohae21/o4o-platform/apps/api-server/src/middleware/auth.middleware.ts`):

```typescript
router.get('/protected', authenticate, async (req, res) => {
  // req.user contains authenticated user
});
```

**기능**:
1. Authorization 헤더에서 토큰 추출
2. JWT 검증
3. 사용자 조회 (relations: linkedAccounts, dbRoles, permissions)
4. req.user에 User 인스턴스 첨부

**에러 응답**:
- 토큰 없음: `AUTH_REQUIRED` (403)
- 토큰 무효: `INVALID_TOKEN` (403)
- 사용자 없음: `INVALID_USER` (403)

**authorize 미들웨어** (`/home/sohae21/o4o-platform/apps/api-server/src/middleware/authorize.ts`):

```typescript
router.delete('/admin/users/:id',
  authenticate,
  authorize(['admin', 'super_admin']),
  async (req, res) => {
    // Only admin and super_admin can access
  }
);
```

**기능**:
1. req.user.roles 또는 req.user.role 확인
2. allowedRoles 배열과 비교
3. 권한 있으면 next(), 없으면 403 응답

**편의 함수**:
- `adminOnly` = `authorize(['admin'])`
- `editorOnly` = `authorize(['editor', 'admin'])`
- `authorOnly` = `authorize(['author', 'editor', 'admin'])`
- `contributorOnly` = `authorize(['contributor', 'author', 'editor', 'admin'])`

#### 권한 체크 로직

**User 엔티티 메서드**:

```typescript
// 역할 확인
user.hasRole(role: UserRole | string): boolean
user.hasAnyRole(roles: (UserRole | string)[]): boolean
user.isAdmin(): boolean

// 권한 확인
user.getAllPermissions(): string[]
user.hasPermission(permission: string): boolean
user.hasAnyPermission(permissions: string[]): boolean
user.hasAllPermissions(permissions: string[]): boolean

// 상태 확인
user.isPending(): boolean
user.isActiveUser(): boolean
user.isSupplier(): boolean
user.isSeller(): boolean
user.isPartner(): boolean
```

**권한 체계**:
1. **Admin 우선**: `isAdmin()` true면 모든 권한 부여
2. **역할 권한**: dbRoles의 permissions 수집
3. **직접 권한**: user.permissions 배열
4. **중복 제거**: Set으로 unique 권한 반환

---

### 2.3 역할 전환

#### 역할 부여 조건

**자동 부여** (회원가입 시):
- 모든 사용자: `customer` 역할
- 상태: `ACTIVE` 또는 `PENDING` (이메일 인증 여부)

**승인 필요 역할**:
- `seller`: 판매자 신청 후 관리자 승인
- `supplier`: 공급자 신청 후 관리자 승인
- `vendor`: 벤더 신청 후 관리자 승인
- `partner`: 파트너 신청 후 관리자 승인

**관리자만 부여 가능**:
- `admin`
- `super_admin`
- `moderator`
- `vendor_manager`

#### 역할 변경 프로세스

**사용자 신청**:
1. 역할 신청 폼 제출 (businessInfo 포함)
2. User 상태 `PENDING`으로 변경
3. 관리자에게 알림 전송
4. 신청 내역 ApprovalLog에 기록

**관리자 승인**:
1. Admin Dashboard에서 승인 요청 확인
2. 사용자 정보 및 비즈니스 정보 검토
3. 승인 또는 거절 결정
4. 승인 시:
   - User.status → `APPROVED`
   - User에 새 역할 추가 (dbRoles)
   - ApprovalLog 업데이트 (approvedAt, approvedBy)
   - 사용자에게 승인 이메일 발송
5. 거절 시:
   - User.status → `REJECTED`
   - ApprovalLog에 거절 사유 기록
   - 사용자에게 거절 이메일 발송

**역할 전환 (다중 역할 사용자)**:

**엔드포인트**: `POST /api/v1/users/role/switch`

```json
Request:
{
  "roleId": "role-uuid"
}

Response:
{
  "success": true,
  "activeRole": {
    "id": "role-uuid",
    "name": "seller",
    "displayName": "판매자"
  }
}
```

**프로세스**:
1. 사용자가 보유한 역할인지 확인 (`canSwitchToRole`)
2. User.activeRole 업데이트
3. 새 액세스 토큰 발급 (선택적)
4. 응답 반환

#### 권한 상속

**상속 규칙**:
- 역할은 독립적이며 상속하지 않음
- 사용자는 여러 역할의 권한을 **누적**으로 보유
- 예: `seller` + `customer` 역할 보유 시 두 역할의 모든 권한 획득

**권한 계산**:
```typescript
getAllPermissions(): string[] {
  if (this.isAdmin()) {
    return [...allAdminPermissions]; // 모든 권한
  }

  const rolePermissions = this.dbRoles?.flatMap(role =>
    role.getPermissionKeys()
  ) || [];

  const directPermissions = this.permissions || [];

  return [...new Set([...rolePermissions, ...directPermissions])];
}
```

---

## 3. 보안

### 3.1 비밀번호 보안

#### 해시 알고리즘

**알고리즘**: bcrypt

**설정**:
- **Salt Rounds**: 12 (기본값, `BCRYPT_ROUNDS` 환경 변수로 설정 가능)
- **Auto-hashing**: User 엔티티의 `@BeforeInsert` 및 `@BeforeUpdate` 훅

**구현** (`/home/sohae21/o4o-platform/apps/api-server/src/entities/User.ts`):
```typescript
@BeforeInsert()
@BeforeUpdate()
async hashPassword() {
  if (this.password && !this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
```

#### 솔트 처리

- bcrypt가 자동으로 salt 생성 및 포함
- 각 비밀번호마다 고유한 salt 사용
- Salt는 해시된 비밀번호에 포함되어 저장

#### 강도 정책

**요구사항** (`validatePasswordStrength` 함수):
1. 최소 8자 이상
2. 대문자 1개 이상 (`/[A-Z]/`)
3. 소문자 1개 이상 (`/[a-z]/`)
4. 숫자 1개 이상 (`/[0-9]/`)
5. 특수문자 1개 이상 (`/[!@#$%^&*(),.?":{}|<>]/`)

**검증 위치**:
- 회원가입: `/api/auth/register`, `/api/auth/signup`
- 비밀번호 재설정: `/api/auth/password/reset`

**에러 응답**:
```json
{
  "success": false,
  "message": "비밀번호가 보안 요구사항을 충족하지 않습니다",
  "errors": [
    "대문자를 하나 이상 포함해야 합니다",
    "특수문자를 하나 이상 포함해야 합니다"
  ],
  "error": {
    "code": "WEAK_PASSWORD",
    "field": "password"
  }
}
```

---

### 3.2 토큰 보안

#### JWT 구조

**Access Token**:
```json
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "role": "customer",
  "sub": "user-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

**Refresh Token**:
```json
Payload:
{
  "userId": "user-uuid",
  "sub": "user-uuid",
  "tokenVersion": 1,
  "tokenFamily": "family-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

#### 서명 검증

**검증 프로세스** (`authenticate` 미들웨어):
1. Authorization 헤더에서 토큰 추출 (`Bearer <token>`)
2. `jwt.verify(token, JWT_SECRET)` 호출
3. 서명 검증 실패 시 `INVALID_TOKEN` 에러
4. 만료 확인 (`exp` 클레임)
5. 사용자 존재 여부 확인 (DB 조회)

**Secret 관리**:
- `JWT_SECRET`: 액세스 토큰 서명
- `JWT_REFRESH_SECRET`: 리프레시 토큰 서명
- 환경 변수로 관리, 절대 코드에 하드코딩 금지

#### 저장 방식

**프로덕션 (HTTPS)**:
- **HTTP-only Cookie**: JavaScript 접근 불가
- **Secure**: HTTPS에서만 전송
- **SameSite: Strict**: CSRF 방지
- **Domain**: `.neture.co.kr` (서브도메인 간 공유)

```javascript
res.cookie('accessToken', tokens.accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  domain: '.neture.co.kr',
  maxAge: 15 * 60 * 1000
});
```

**개발 환경**:
- localStorage 또는 메모리
- Secure 플래그 false

**보안 장점**:
- XSS 공격으로부터 보호 (httpOnly)
- CSRF 공격 방지 (sameSite: strict)
- 네트워크 도청 방지 (secure, HTTPS)

#### CSRF 방어

**방어 메커니즘**:
1. **SameSite Cookie**: `sameSite: 'strict'` 설정으로 크로스 사이트 요청 차단
2. **Origin 검증**: API 서버가 요청의 Origin 헤더 검증
3. **Referrer 검증**: 중요한 작업 시 Referer 헤더 확인

**주의사항**:
- 현재 구현은 주로 SameSite에 의존
- 추가 CSRF 토큰 미사용 (향후 개선 권장)

---

### 3.3 공격 방어

#### 레이트 리밋

**구현 위치**:
- `/home/sohae21/o4o-platform/apps/api-server/src/middleware/rateLimiter.ts`
- `/home/sohae21/o4o-platform/apps/api-gateway/src/middleware/rateLimit.middleware.ts`

**설정**:
```typescript
// 일반 API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});

// 로그인 API
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // 최대 5 요청
});
```

**적용 엔드포인트**:
- `/api/auth/login`
- `/api/auth/signup`
- `/api/auth/password/reset-request`

#### 브루트포스 차단

**LoginAttempt 테이블** (`/home/sohae21/o4o-platform/apps/api-server/src/entities/LoginAttempt.ts`):
- 모든 로그인 시도 기록
- 필드: email, successful, ipAddress, userAgent, deviceId, failureReason, attemptedAt

**계정 잠금 로직** (`checkAccountLock` 메서드):
1. 최근 20개 로그인 시도 조회
2. 실패 횟수 계산
3. 5회 이상 실패 시 계정 잠금
4. 잠금 시간: 30분

**잠금 해제**:
- 성공적인 로그인 시 loginAttempts 초기화
- 30분 경과 후 자동 해제

**구현** (`/home/sohae21/o4o-platform/apps/api-server/src/services/refreshToken.service.ts`):
```typescript
async checkAccountLock(email: string) {
  const attempts = await this.loginAttemptRepository.find({
    where: { email },
    order: { attemptedAt: 'DESC' },
    take: 20
  });

  const shouldLock = LoginAttempt.shouldLockAccount(attempts);

  if (shouldLock) {
    const failedAttempts = attempts.filter(a => !a.successful).length;
    const lockDuration = LoginAttempt.getLockDuration(failedAttempts);

    return { locked: true, lockDuration, attempts: failedAttempts };
  }

  return { locked: false };
}
```

#### XSS 방어

**방어 메커니즘**:
1. **Input Sanitization**: express-validator로 입력 검증 및 정제
2. **Output Encoding**: React의 자동 이스케이핑
3. **HTTP-only Cookie**: JavaScript 접근 차단
4. **Content-Security-Policy**: CSP 헤더 설정 (권장)

**구현 예시**:
```typescript
body('email').isEmail().normalizeEmail()
body('name').trim().escape()
```

**주의사항**:
- dangerouslySetInnerHTML 사용 금지
- 사용자 입력을 직접 DOM에 삽입 금지

#### SQL Injection 방어

**방어 메커니즘**:
1. **ORM 사용**: TypeORM의 파라미터화된 쿼리
2. **Query Builder**: 동적 쿼리도 안전하게 구성
3. **입력 검증**: express-validator로 타입 및 형식 검증

**안전한 쿼리 예시**:
```typescript
// Good: Parameterized query
await userRepository.findOne({ where: { email } });

// Good: Query builder
await userRepository
  .createQueryBuilder('user')
  .where('user.email = :email', { email })
  .getOne();

// Bad: Raw query with string interpolation (NEVER DO THIS)
await userRepository.query(`SELECT * FROM users WHERE email = '${email}'`);
```

**추가 보안 조치**:
- 최소 권한 원칙 (DB 사용자 권한 최소화)
- 에러 메시지에서 DB 정보 노출 방지
- 로깅에서 민감한 쿼리 정보 제외

---

## 4. 발견된 이슈

### 4.1 보안 취약점

#### 1. CSRF 토큰 미사용 (중위험)

**설명**:
- 현재 SameSite Cookie만으로 CSRF 방어
- SameSite=Strict가 모든 브라우저에서 지원되지 않을 수 있음

**영향**:
- 크로스 사이트 요청 위조 가능성
- 특히 구형 브라우저에서 취약

**권장 조치**:
```typescript
// CSRF 토큰 생성 및 검증 미들웨어 추가
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

router.post('/api/auth/login', csrfProtection, async (req, res) => {
  // Login logic
});
```

#### 2. 토큰 블랙리스트 미구현 (중위험)

**설명**:
- 로그아웃 시 JWT 토큰이 무효화되지 않음
- RefreshToken은 revoke되지만 AccessToken은 만료까지 유효

**영향**:
- 도난된 액세스 토큰이 만료(15분)까지 사용 가능
- 긴급 계정 정지 시 즉시 차단 불가

**권장 조치**:
```typescript
// Redis 기반 토큰 블랙리스트 구현
import { redisClient } from './redis';

async function blacklistToken(token: string, expiresIn: number) {
  await redisClient.setex(`blacklist:${token}`, expiresIn, 'true');
}

async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await redisClient.get(`blacklist:${token}`);
  return result === 'true';
}
```

#### 3. 비밀번호 변경 시 기존 세션 유지 (저위험)

**설명**:
- 비밀번호 재설정 후 기존 리프레시 토큰이 유효
- 공격자가 이미 토큰을 탈취한 경우 계속 사용 가능

**권장 조치**:
```typescript
// 비밀번호 변경 시 모든 토큰 무효화
await refreshTokenService.revokeAllUserTokens(user.id, 'Password changed');
user.refreshTokenFamily = null; // 토큰 패밀리 초기화
await userRepository.save(user);
```

#### 4. 이메일 열거 가능 (저위험)

**설명**:
- 회원가입 시 "Email already exists" 에러 반환
- 공격자가 유효한 이메일 목록 수집 가능

**현재 완화**:
- 비밀번호 재설정은 이미 열거 방지 구현됨 (항상 성공 응답)

**권장 조치**:
```typescript
// 회원가입도 동일하게 변경
if (existingUser) {
  // 기존 사용자에게 "이미 가입된 계정입니다" 이메일 발송
  await emailService.sendAccountExistsEmail(email);

  // 항상 성공 응답
  return res.status(200).json({
    success: true,
    message: '회원가입 확인 이메일을 발송했습니다. 이메일을 확인해주세요.'
  });
}
```

#### 5. JWT Secret 강도 미검증 (저위험)

**설명**:
- `JWT_SECRET` 환경 변수의 강도를 검증하지 않음
- 약한 시크릿 사용 시 브루트포스 공격 가능

**권장 조치**:
```typescript
// 앱 시작 시 JWT Secret 강도 검증
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}
if (jwtSecret === 'your-secret-key' || jwtSecret === 'default-jwt-secret') {
  throw new Error('JWT_SECRET must not use default values');
}
```

---

### 4.2 불일치 구간 (프론트/백)

#### 1. 역할 타입 불일치

**문제**:
- Backend: `UserRole` enum (TypeScript)
- Frontend: `UserType` type (일부 컴포넌트)
- 역할 이름 불일치 (`customer` vs `retailer`)

**영향**:
- 타입 안정성 저하
- 런타임 에러 가능성

**예시**:
```typescript
// Backend (apps/api-server/src/types/auth.ts)
export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  ADMIN = 'admin'
}

// Frontend (apps/main-site/src/types/user.ts)
export type UserType = 'admin' | 'supplier' | 'retailer' | 'customer';
//                                                ^^^^^^^^ 불일치!
```

**권장 조치**:
```typescript
// packages/types/src/auth.ts (공유 타입)
export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  ADMIN = 'admin',
  // ... 나머지 역할
}

// 프론트/백 모두에서 import
import { UserRole } from '@o4o/types';
```

#### 2. API 응답 형식 불일치

**문제**:
- `/api/auth/login`: `{ success, message, token, user }`
- `/api/auth/email/login`: `{ success, message, data: { user, accessToken, refreshToken } }`

**영향**:
- 클라이언트 코드 복잡도 증가
- 에러 핸들링 어려움

**권장 조치**:
```typescript
// 통일된 응답 형식
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message?: string;
    field?: string;
  };
}

// 모든 엔드포인트에서 일관된 형식 사용
res.json({
  success: true,
  data: {
    user: {...},
    tokens: {...}
  }
});
```

#### 3. 권한 체크 방식 차이

**문제**:
- Backend: `user.hasPermission('content.edit')`
- Frontend: `user.permissions.includes('content.edit')` 또는 `user.role === 'admin'`

**영향**:
- 프론트/백 권한 로직 불일치
- 보안 취약점 가능성

**권장 조치**:
```typescript
// 공유 권한 체크 유틸리티
// packages/utils/src/permissions.ts
export class PermissionChecker {
  static hasPermission(user: User, permission: string): boolean {
    if (user.role === 'admin' || user.role === 'super_admin') {
      return true;
    }
    return user.permissions?.includes(permission) || false;
  }
}

// 프론트/백 모두에서 동일한 로직 사용
import { PermissionChecker } from '@o4o/utils';
if (PermissionChecker.hasPermission(user, 'content.edit')) {
  // ...
}
```

---

### 4.3 개선 필요 사항

#### 1. 다중 인증 (MFA) 미구현

**제안**:
- TOTP (Time-based One-Time Password) 구현
- SMS 인증 (선택적)
- 백업 코드 제공

**구현 계획**:
```typescript
// 1단계: TOTP Secret 생성 및 QR 코드 제공
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const secret = speakeasy.generateSecret({
  name: `O4O Platform (${user.email})`
});

user.totpSecret = secret.base32;
await userRepository.save(user);

const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
// QR 코드를 사용자에게 제공

// 2단계: 로그인 시 TOTP 검증
const verified = speakeasy.totp.verify({
  secret: user.totpSecret,
  encoding: 'base32',
  token: userProvidedToken
});

if (!verified) {
  throw new Error('Invalid MFA code');
}
```

#### 2. 세션 관리 개선

**현재 문제**:
- 활성 세션 조회 불가
- 디바이스별 로그아웃 미지원
- 세션 하이재킹 감지 없음

**제안 기능**:
1. **활성 세션 목록**: 사용자가 모든 로그인 세션 확인
2. **원격 로그아웃**: 특정 디바이스 세션 종료
3. **이상 활동 감지**: IP 변경, 새 디바이스 감지 시 알림

**구현 예시**:
```typescript
// GET /api/auth/sessions
router.get('/sessions', authenticate, async (req, res) => {
  const sessions = await refreshTokenService.getUserActiveTokens(req.user.id);

  res.json({
    success: true,
    data: sessions.map(s => ({
      id: s.id,
      deviceId: s.deviceId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsed: s.updatedAt,
      current: s.token === req.cookies.refreshToken
    }))
  });
});

// DELETE /api/auth/sessions/:sessionId
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  const session = await refreshTokenService.revokeTokenById(req.params.sessionId);

  res.json({
    success: true,
    message: '세션이 종료되었습니다'
  });
});
```

#### 3. 감사 로그 (Audit Log) 강화

**현재 상태**:
- LoginAttempt: 로그인 시도만 기록
- ApprovalLog: 역할 승인만 기록

**제안**:
- 통합 AuditLog 테이블
- 모든 중요 작업 기록 (CRUD, 권한 변경, 설정 변경 등)

**스키마**:
```typescript
@Entity('audit_logs')
class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  action: string; // 'user.login', 'user.logout', 'user.role.change', 'content.create', etc.

  @Column({ type: 'varchar', nullable: true })
  resourceType?: string; // 'user', 'post', 'product', etc.

  @Column({ type: 'varchar', nullable: true })
  resourceId?: string;

  @Column({ type: 'json', nullable: true })
  changes?: any; // Before/after values

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

**사용 예시**:
```typescript
await auditLogService.log({
  userId: req.user.id,
  action: 'user.role.change',
  resourceType: 'user',
  resourceId: targetUser.id,
  changes: {
    before: { role: 'customer' },
    after: { role: 'seller' }
  },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

#### 4. 역할 권한 UI 개선

**현재 문제**:
- 관리자가 역할 권한을 직관적으로 관리하기 어려움
- 권한 변경 내역 추적 불가

**제안**:
- Admin Dashboard에 역할/권한 관리 페이지 추가
- 드래그 앤 드롭으로 권한 할당
- 권한 변경 이력 표시
- 권한 미리보기 (특정 역할로 로그인한 것처럼 시뮬레이션)

#### 5. 비밀번호 정책 강화

**현재 정책**:
- 8자 이상, 대소문자/숫자/특수문자 포함

**추가 제안**:
1. **비밀번호 재사용 방지**: 최근 5개 비밀번호 저장 및 비교
2. **비밀번호 만료**: 90일마다 변경 요구 (선택적)
3. **일반 단어 금지**: 사전 단어, 일반적인 패턴 차단
4. **계정 정보 포함 금지**: 이름, 이메일 일부 포함 방지

**구현 예시**:
```typescript
// PasswordHistory 테이블
@Entity('password_history')
class PasswordHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;
}

// 비밀번호 변경 시 이력 확인
const recentPasswords = await passwordHistoryRepository.find({
  where: { userId: user.id },
  order: { createdAt: 'DESC' },
  take: 5
});

for (const history of recentPasswords) {
  const isSame = await bcrypt.compare(newPassword, history.passwordHash);
  if (isSame) {
    throw new Error('최근에 사용한 비밀번호는 재사용할 수 없습니다');
  }
}
```

#### 6. OAuth 제공자 확장

**현재 지원**:
- Google, Kakao, Naver

**추가 제안**:
- Facebook OAuth
- Apple Sign In
- GitHub OAuth (개발자 대상)
- Twitter/X OAuth

**고려사항**:
- 각 제공자별 프로필 매핑 일관성 유지
- 이메일 없는 제공자 처리 (예: Twitter)
- 계정 연동 기능 (한 사용자가 여러 OAuth 연결)

---

## 요약 및 권장 사항

### 긴급 조치 필요 (우선순위 높음)

1. **JWT Secret 강도 검증**: 앱 시작 시 시크릿 길이 및 기본값 체크
2. **CSRF 토큰 구현**: 중요 엔드포인트에 CSRF 보호 추가
3. **비밀번호 변경 시 토큰 무효화**: 보안 강화

### 중기 개선 사항 (우선순위 중간)

1. **토큰 블랙리스트**: Redis 기반 블랙리스트 구현
2. **역할 타입 통일**: 프론트/백 타입 일치화
3. **API 응답 형식 표준화**: 일관된 응답 구조
4. **감사 로그 강화**: 통합 AuditLog 시스템 구축

### 장기 개선 사항 (우선순위 낮음)

1. **MFA 구현**: TOTP 기반 2단계 인증
2. **세션 관리 UI**: 활성 세션 조회 및 원격 로그아웃
3. **역할 권한 UI**: Admin Dashboard 개선
4. **비밀번호 정책 강화**: 재사용 방지, 만료 정책
5. **OAuth 제공자 확장**: 추가 소셜 로그인 지원

---

**문서 작성 완료**
**다음 단계**: 발견된 이슈를 바탕으로 보안 강화 작업 진행
