# 📄 **Step 25 — Phase B-2 Step 3: AUTH Controllers & Routes Migration**

## O4O Platform — NextGen Backend Architecture: AUTH Module Consolidation

**Version**: 2025-12-03
**Author**: Claude (Rena AI Assistant)
**Status**: 🟡 READY TO START
**Priority**: 🔴 CRITICAL (P1)
**Estimated Duration**: 4-6 hours
**Dependencies**: Phase B-2 Step 2 (AUTH Services Migration) ✅ COMPLETED

---

## 0. 목적 (Purpose)

### ✅ 완료된 작업 (Phase B-2 Step 2)
- AUTH Services가 NextGen 구조로 완전히 마이그레이션 완료
- `modules/auth/services/` 구조 안정화
- `modules/auth/entities/` 완료

### ❌ 현재 문제점
**AUTH 라우트와 컨트롤러가 Legacy 구조에 남아있음:**

```
❌ Legacy Routes (3개 파일 중복):
   - src/routes/auth.ts                  (JWT Token 방식)
   - src/routes/auth-v2.ts               (Cookie 방식)
   - src/routes/authentication.routes.ts (Unified 방식)

❌ Controller 계층 부재:
   - 모든 비즈니스 로직이 라우트 파일 내부에 직접 구현됨
   - BaseController 패턴 미적용
   - 표준 응답 구조 불일치
```

### 🎯 Phase B-2 Step 3의 목표

> **AUTH 모듈의 Controller/Routes를 NextGen 패턴으로 완전히 마이그레이션하여
> Step 25 전체의 Reference Implementation을 확립한다.**

### 완료 시 기대 효과

* ✅ AUTH 모듈이 100% NextGen 구조로 전환 완료
* ✅ 다른 모듈(Commerce, Dropshipping, CMS)의 마이그레이션 참조 기준 확립
* ✅ BaseController 패턴 적용으로 응답 구조 통일
* ✅ DTO Validation 표준화
* ✅ 라우트 중복 제거 및 엔드포인트 통합
* ✅ TypeScript strict mode 준비 완료

---

## 1. 현재 상태 분석 (Current State)

### 1.1 기존 AUTH Routes 구조

```
src/routes/
  ├── auth.ts                     (516 lines) - JWT Token 기반
  ├── auth-v2.ts                  (541 lines) - httpOnly Cookie 기반
  └── authentication.routes.ts    (378 lines) - Unified API
```

#### 엔드포인트 중복 현황

| Endpoint | auth.ts | auth-v2.ts | authentication.routes.ts | 통합 필요 |
|----------|---------|------------|-------------------------|----------|
| POST /login | ✅ | ✅ | ✅ | 🔴 3중 중복 |
| POST /register | ✅ | ✅ | ❌ | 🟡 2중 중복 |
| POST /signup | ✅ | ❌ | ❌ | - |
| POST /refresh | ✅ | ✅ | ✅ | 🔴 3중 중복 |
| POST /logout | ✅ | ✅ | ✅ | 🔴 3중 중복 |
| GET /me | ❌ | ✅ | ✅ | 🟡 2중 중복 |
| GET /status | ✅ | ❌ | ✅ | 🟡 2중 중복 |
| GET /verify | ✅ | ❌ | ❌ | - |
| POST /forgot-password | ❌ | ✅ | ✅ | 🟡 2중 중복 |
| POST /reset-password | ❌ | ✅ | ✅ | 🟡 2중 중복 |
| POST /verify-email | ❌ | ✅ | ❌ | - |

**총 문제점:**
- 3중 중복: 4개 엔드포인트
- 2중 중복: 6개 엔드포인트
- 비일관적인 응답 구조
- Controller 계층 부재

### 1.2 NextGen 구조 요구사항

```
✅ 목표 구조:

src/modules/auth/
  ├── controllers/
  │   ├── auth.controller.ts          (Login, Register, Logout, Refresh)
  │   ├── password.controller.ts      (Forgot, Reset)
  │   └── verification.controller.ts  (Email verification)
  ├── routes/
  │   └── auth.routes.ts              (통합 라우트)
  ├── dto/
  │   ├── login.dto.ts
  │   ├── register.dto.ts
  │   ├── refresh.dto.ts
  │   └── password.dto.ts
  ├── services/
  │   ├── user.service.ts             ✅ 이미 완료
  │   ├── refresh-token.service.ts    ✅ 이미 완료
  │   ├── login-security.service.ts   ✅ 이미 완료
  │   └── permission.service.ts       ✅ 이미 완료
  └── entities/
      ├── User.ts                     ✅ 이미 완료
      ├── Role.ts                     ✅ 이미 완료
      ├── Permission.ts               ✅ 이미 완료
      └── RefreshToken.ts             ✅ 이미 완료
```

---

## 2. 마이그레이션 전략 (Migration Strategy)

### 2.1 단계별 접근 방식

```
Step 1: DTOs 정의 (Request/Response)       [30분]
Step 2: Controllers 생성 (BaseController)  [2시간]
Step 3: Routes 통합 (단일 라우트 파일)      [1시간]
Step 4: Legacy Routes Deprecation         [30분]
Step 5: 통합 테스트 및 검증                [1시간]
```

### 2.2 Backward Compatibility 전략

```typescript
// 기존 엔드포인트 유지 (Deprecated)
// ❌ /api/auth/login        (Legacy - auth.ts)
// ❌ /api/auth-v2/login     (Legacy - auth-v2.ts)

// ✅ /api/v1/auth/login     (NextGen - 신규 통합)

// 호환성 라우터 (90일 유지 후 제거 예정)
router.post('/api/auth/login', (req, res) => {
  res.redirect(307, '/api/v1/auth/login');
});
```

---

## 3. 구현 체크리스트 (Implementation Checklist)

### Phase 1: DTOs 정의 ✅

#### 3.1.1 Login DTOs
```typescript
// src/modules/auth/dto/login.dto.ts

import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

/**
 * Login Request DTO
 */
export class LoginRequestDto {
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

/**
 * Login Response DTO
 */
export interface LoginResponseDto {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  };
}
```

**작업 항목:**
- [ ] `LoginRequestDto` 구현
- [ ] `LoginResponseDto` 인터페이스 정의
- [ ] `RegisterRequestDto` 구현
- [ ] `RegisterResponseDto` 인터페이스 정의
- [ ] `RefreshTokenRequestDto` 구현
- [ ] `PasswordResetRequestDto` 구현
- [ ] `PasswordResetDto` 구현
- [ ] `EmailVerificationDto` 구현

#### 3.1.2 파일 생성 목록
```bash
src/modules/auth/dto/
  ├── login.dto.ts           # Login Request/Response
  ├── register.dto.ts        # Register Request/Response
  ├── refresh.dto.ts         # Refresh Token Request/Response
  ├── password.dto.ts        # Password Reset DTOs
  ├── verification.dto.ts    # Email Verification DTOs
  └── index.ts               # Barrel export
```

---

### Phase 2: Controllers 생성 ✅

#### 3.2.1 AuthController (Primary)

```typescript
// src/modules/auth/controllers/auth.controller.ts

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { authenticationService } from '../../../services/authentication.service.js';
import { refreshTokenService } from '../services/refresh-token.service.js';
import { LoginRequestDto, RegisterRequestDto } from '../dto/index.js';

/**
 * Auth Controller - NextGen Pattern
 *
 * Handles authentication operations:
 * - Login (email/password + OAuth)
 * - Register
 * - Logout (current session + all devices)
 * - Refresh tokens
 * - Get current user (/me)
 */
export class AuthController extends BaseController {
  /**
   * POST /api/v1/auth/login
   * Login with email/password
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password, deviceId } = req.body as LoginRequestDto;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    try {
      const result = await authenticationService.login({
        provider: 'email',
        credentials: { email, password },
        ipAddress,
        userAgent,
      });

      // Set httpOnly cookies
      authenticationService.setAuthCookies(res, result.tokens, result.sessionId);

      return BaseController.ok(res, {
        message: 'Login successful',
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error: any) {
      // Handle specific auth errors
      if (error.code === 'INVALID_CREDENTIALS') {
        return BaseController.unauthorized(res, error.message);
      }
      if (error.code === 'ACCOUNT_NOT_ACTIVE') {
        return BaseController.forbidden(res, error.message);
      }
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/auth/register
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    const data = req.body as RegisterRequestDto;

    try {
      const result = await authenticationService.register(data);

      return BaseController.created(res, {
        message: 'Registration successful',
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    } catch (error: any) {
      if (error.code === 'EMAIL_EXISTS') {
        return BaseController.error(res, 'Email already exists', 409);
      }
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout current session
   */
  static async logout(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    const sessionId = req.cookies?.sessionId;

    if (userId) {
      await authenticationService.logout(userId, sessionId);
    }

    authenticationService.clearAuthCookies(res);

    return BaseController.ok(res, {
      message: 'Logout successful',
    });
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return BaseController.unauthorized(res, 'Refresh token not provided');
    }

    try {
      const tokens = await authenticationService.refreshTokens(refreshToken);

      if (!tokens) {
        authenticationService.clearAuthCookies(res);
        return BaseController.unauthorized(res, 'Invalid refresh token');
      }

      authenticationService.setAuthCookies(res, tokens);

      return BaseController.ok(res, {
        message: 'Token refreshed successfully',
        tokens,
      });
    } catch (error) {
      authenticationService.clearAuthCookies(res);
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user
   */
  static async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    return BaseController.ok(res, {
      user: req.user.toPublicData?.() || req.user,
    });
  }

  /**
   * POST /api/v1/auth/logout-all
   * Logout from all devices
   */
  static async logoutAll(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    await authenticationService.logoutAll(userId);
    authenticationService.clearAuthCookies(res);

    return BaseController.ok(res, {
      message: 'Logged out from all devices',
    });
  }
}
```

**작업 항목:**
- [ ] `AuthController` 클래스 생성
- [ ] `login()` 메서드 구현
- [ ] `register()` 메서드 구현
- [ ] `logout()` 메서드 구현
- [ ] `refresh()` 메서드 구현
- [ ] `me()` 메서드 구현
- [ ] `logoutAll()` 메서드 구현
- [ ] BaseController 패턴 적용 확인
- [ ] 에러 핸들링 표준화 확인

#### 3.2.2 PasswordController

```typescript
// src/modules/auth/controllers/password.controller.ts

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';

/**
 * Password Controller - NextGen Pattern
 *
 * Handles password-related operations:
 * - Forgot password (request reset)
 * - Reset password (with token)
 * - Change password (authenticated)
 */
export class PasswordController extends BaseController {
  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset email
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    try {
      await PasswordResetService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      return BaseController.ok(res, {
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      return BaseController.error(res, 'Failed to process password reset request');
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Reset password with token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body;

    try {
      await PasswordResetService.resetPassword(token, password);

      return BaseController.ok(res, {
        message: 'Password has been reset successfully',
      });
    } catch (error: any) {
      return BaseController.error(res, error.message || 'Failed to reset password', 400);
    }
  }
}
```

**작업 항목:**
- [ ] `PasswordController` 클래스 생성
- [ ] `forgotPassword()` 메서드 구현
- [ ] `resetPassword()` 메서드 구현

#### 3.2.3 VerificationController

```typescript
// src/modules/auth/controllers/verification.controller.ts

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';

/**
 * Verification Controller - NextGen Pattern
 *
 * Handles email verification operations
 */
export class VerificationController extends BaseController {
  /**
   * POST /api/v1/auth/verify-email
   * Verify email with token (POST)
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.body;

    try {
      await PasswordResetService.verifyEmail(token);

      return BaseController.ok(res, {
        message: 'Email has been verified successfully',
      });
    } catch (error: any) {
      return BaseController.error(res, error.message || 'Failed to verify email', 400);
    }
  }

  /**
   * GET /api/v1/auth/verify-email
   * Verify email with token (GET - for email links)
   */
  static async verifyEmailGet(req: Request, res: Response): Promise<void> {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return BaseController.error(res, 'Verification token is required', 400);
    }

    try {
      await PasswordResetService.verifyEmail(token);

      return BaseController.ok(res, {
        message: 'Email has been verified successfully',
      });
    } catch (error: any) {
      return BaseController.error(res, error.message || 'Failed to verify email', 400);
    }
  }

  /**
   * POST /api/v1/auth/resend-verification
   * Resend verification email (authenticated)
   */
  static async resendVerification(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      return BaseController.unauthorized(res, 'Not authenticated');
    }

    try {
      await PasswordResetService.requestEmailVerification(userId);

      return BaseController.ok(res, {
        message: 'Verification email has been sent',
      });
    } catch (error: any) {
      return BaseController.error(res, error.message || 'Failed to send verification email', 400);
    }
  }
}
```

**작업 항목:**
- [ ] `VerificationController` 클래스 생성
- [ ] `verifyEmail()` 메서드 구현 (POST)
- [ ] `verifyEmailGet()` 메서드 구현 (GET)
- [ ] `resendVerification()` 메서드 구현

---

### Phase 3: Routes 통합 ✅

#### 3.3.1 NextGen Auth Routes

```typescript
// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { PasswordController } from '../controllers/password.controller.js';
import { VerificationController } from '../controllers/verification.controller.js';
import {
  validateDto,
  validateQuery,
} from '../../../common/middleware/validation.middleware.js';
import {
  requireAuth,
  optionalAuth,
} from '../../../common/middleware/auth.middleware.js';
import {
  LoginRequestDto,
  RegisterRequestDto,
  RefreshTokenRequestDto,
  PasswordResetRequestDto,
  PasswordResetDto,
  EmailVerificationDto,
} from '../dto/index.js';

const router = Router();

/**
 * ========================================
 * Authentication Routes (Public)
 * ========================================
 */

// POST /api/v1/auth/login - Login with email/password
router.post(
  '/login',
  validateDto(LoginRequestDto),
  AuthController.login
);

// POST /api/v1/auth/register - Register new user
router.post(
  '/register',
  validateDto(RegisterRequestDto),
  AuthController.register
);

// POST /api/v1/auth/refresh - Refresh access token
router.post(
  '/refresh',
  validateDto(RefreshTokenRequestDto),
  AuthController.refresh
);

/**
 * ========================================
 * Authentication Routes (Protected)
 * ========================================
 */

// GET /api/v1/auth/me - Get current user
router.get(
  '/me',
  requireAuth,
  AuthController.me
);

// POST /api/v1/auth/logout - Logout current session
router.post(
  '/logout',
  requireAuth,
  AuthController.logout
);

// POST /api/v1/auth/logout-all - Logout from all devices
router.post(
  '/logout-all',
  requireAuth,
  AuthController.logoutAll
);

/**
 * ========================================
 * Password Management Routes (Public)
 * ========================================
 */

// POST /api/v1/auth/forgot-password - Request password reset
router.post(
  '/forgot-password',
  validateDto(PasswordResetRequestDto),
  PasswordController.forgotPassword
);

// POST /api/v1/auth/reset-password - Reset password with token
router.post(
  '/reset-password',
  validateDto(PasswordResetDto),
  PasswordController.resetPassword
);

/**
 * ========================================
 * Email Verification Routes
 * ========================================
 */

// POST /api/v1/auth/verify-email - Verify email (POST)
router.post(
  '/verify-email',
  validateDto(EmailVerificationDto),
  VerificationController.verifyEmail
);

// GET /api/v1/auth/verify-email - Verify email (GET - for email links)
router.get(
  '/verify-email',
  VerificationController.verifyEmailGet
);

// POST /api/v1/auth/resend-verification - Resend verification email
router.post(
  '/resend-verification',
  requireAuth,
  VerificationController.resendVerification
);

/**
 * ========================================
 * Optional Auth Routes (Development/Debug)
 * ========================================
 */

// GET /api/v1/auth/status - Check authentication status
router.get(
  '/status',
  optionalAuth,
  (req, res) => {
    const authenticated = !!(req as any).user;
    res.json({
      authenticated,
      user: authenticated ? (req as any).user.toPublicData?.() || (req as any).user : null,
    });
  }
);

export default router;
```

**작업 항목:**
- [ ] `auth.routes.ts` 파일 생성
- [ ] 모든 Authentication 엔드포인트 라우팅
- [ ] DTO Validation 미들웨어 적용
- [ ] Auth 미들웨어 적용 (requireAuth, optionalAuth)
- [ ] 엔드포인트 그룹핑 및 주석 정리

#### 3.3.2 Routes 등록 (Main Router)

```typescript
// src/config/routes.config.ts

import authRoutes from '../modules/auth/routes/auth.routes.js';

// ... existing imports ...

export function configureRoutes(app: Express): void {
  // ... existing routes ...

  // ✅ NextGen Auth Routes (v1)
  app.use('/api/v1/auth', authRoutes);

  // ❌ Legacy Routes (Deprecated - 90일 후 제거)
  // Redirect to new endpoints
  app.use('/api/auth', createDeprecationRouter('/api/v1/auth'));
  app.use('/api/auth-v2', createDeprecationRouter('/api/v1/auth'));
}

/**
 * Create deprecation router that redirects to new endpoints
 */
function createDeprecationRouter(newBasePath: string): Router {
  const router = Router();

  router.all('*', (req, res) => {
    const newPath = req.path.replace(req.baseUrl, newBasePath);
    res.status(301).json({
      deprecated: true,
      message: 'This endpoint has been moved',
      oldEndpoint: req.originalUrl,
      newEndpoint: newPath,
      removedAt: '2025-03-01',
    });
  });

  return router;
}
```

**작업 항목:**
- [ ] NextGen Auth Routes 등록 (`/api/v1/auth`)
- [ ] Legacy Routes Deprecation 처리
- [ ] Redirect 메커니즘 구현
- [ ] API 문서 업데이트

---

### Phase 4: Legacy Routes Deprecation ✅

#### 3.4.1 Deprecation 전략

```typescript
// src/routes/auth.ts (Legacy)
// ⚠️ DEPRECATED - Use /api/v1/auth instead
// This file will be removed on 2025-03-01

import { Router } from 'express';

const router = Router();

router.all('*', (req, res) => {
  res.status(410).json({
    deprecated: true,
    message: 'This API version is deprecated',
    oldEndpoint: req.originalUrl,
    newEndpoint: req.originalUrl.replace('/api/auth', '/api/v1/auth'),
    documentation: 'https://docs.o4o-platform.com/api/v1/auth',
    removedAt: '2025-03-01',
  });
});

export default router;
```

**작업 항목:**
- [ ] `auth.ts` Deprecation 처리
- [ ] `auth-v2.ts` Deprecation 처리
- [ ] `authentication.routes.ts` Deprecation 처리
- [ ] 90일 제거 일정 명시
- [ ] API 문서에 Migration Guide 추가

---

### Phase 5: 통합 테스트 및 검증 ✅

#### 3.5.1 엔드포인트 테스트 스크립트

```bash
# scripts/test-auth-endpoints.sh

#!/bin/bash

BASE_URL="http://localhost:4000"
API_V1="${BASE_URL}/api/v1/auth"

echo "🧪 Testing AUTH Endpoints (NextGen)"

# Test 1: Register
echo "\n📝 Test 1: Register"
curl -X POST "${API_V1}/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Test 2: Login
echo "\n🔐 Test 2: Login"
RESPONSE=$(curl -X POST "${API_V1}/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }')

ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')
echo "Access Token: ${ACCESS_TOKEN:0:20}..."

# Test 3: Get Current User (/me)
echo "\n👤 Test 3: Get Current User"
curl -X GET "${API_V1}/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Test 4: Refresh Token
echo "\n🔄 Test 4: Refresh Token"
curl -X POST "${API_V1}/refresh" \
  -H "Content-Type: application/json" \
  -b "refreshToken=${REFRESH_TOKEN}"

# Test 5: Logout
echo "\n👋 Test 5: Logout"
curl -X POST "${API_V1}/logout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

echo "\n✅ All tests completed"
```

**작업 항목:**
- [ ] 엔드포인트 테스트 스크립트 작성
- [ ] 모든 엔드포인트 수동 테스트
- [ ] Response 구조 검증
- [ ] 에러 핸들링 검증
- [ ] Cookie 처리 검증

#### 3.5.2 검증 체크리스트

```markdown
## 기능 검증

- [ ] ✅ Login (email/password)
  - [ ] 성공 케이스
  - [ ] 실패 케이스 (잘못된 비밀번호)
  - [ ] 실패 케이스 (존재하지 않는 사용자)
  - [ ] Cookie 설정 확인

- [ ] ✅ Register
  - [ ] 성공 케이스
  - [ ] 실패 케이스 (중복 이메일)
  - [ ] 실패 케이스 (약한 비밀번호)
  - [ ] Validation 에러 확인

- [ ] ✅ Refresh Token
  - [ ] 성공 케이스
  - [ ] 실패 케이스 (만료된 토큰)
  - [ ] 실패 케이스 (잘못된 토큰)

- [ ] ✅ Logout
  - [ ] 단일 세션 로그아웃
  - [ ] 전체 디바이스 로그아웃
  - [ ] Cookie 삭제 확인

- [ ] ✅ Get Current User (/me)
  - [ ] 인증된 사용자
  - [ ] 비인증 사용자 (401 에러)

- [ ] ✅ Password Reset
  - [ ] 비밀번호 재설정 요청
  - [ ] 비밀번호 재설정 실행
  - [ ] 이메일 enumeration 방지 확인

- [ ] ✅ Email Verification
  - [ ] 이메일 인증 (POST)
  - [ ] 이메일 인증 (GET - email link)
  - [ ] 인증 메일 재전송
```

---

## 4. 완료 기준 (Definition of Done)

### ✅ Phase B-2 Step 3 완료 조건

#### 4.1 구조 완성도
- [ ] ✅ `src/modules/auth/controllers/` 3개 컨트롤러 생성 완료
  - [ ] `auth.controller.ts`
  - [ ] `password.controller.ts`
  - [ ] `verification.controller.ts`
- [ ] ✅ `src/modules/auth/routes/auth.routes.ts` 통합 라우트 생성
- [ ] ✅ `src/modules/auth/dto/` 모든 DTOs 정의 완료
- [ ] ✅ BaseController 패턴 100% 적용

#### 4.2 코드 품질
- [ ] ✅ TypeScript 타입 에러 0개
- [ ] ✅ ESLint 에러 0개
- [ ] ✅ 모든 컨트롤러 메서드에 JSDoc 주석
- [ ] ✅ 에러 핸들링 표준화 완료

#### 4.3 기능 검증
- [ ] ✅ 모든 엔드포인트 수동 테스트 통과
- [ ] ✅ Cookie 처리 정상 동작
- [ ] ✅ DTO Validation 정상 동작
- [ ] ✅ Auth Middleware 정상 동작

#### 4.4 Legacy 처리
- [ ] ✅ Legacy Routes 3개 Deprecation 처리
- [ ] ✅ Redirect 메커니즘 구현
- [ ] ✅ Deprecation 경고 메시지 추가

#### 4.5 문서화
- [ ] ✅ API 엔드포인트 문서 업데이트
- [ ] ✅ Migration Guide 작성
- [ ] ✅ Completion Report 작성

---

## 5. 다음 단계 (Next Steps)

### Phase B-2 Step 4: User & Profile Module
- User CRUD operations NextGen 마이그레이션
- Profile management 통합
- User roles and permissions 정리

### Phase B-3: Commerce Module Migration
- Products, Cart, Orders 모듈 NextGen 전환
- AUTH 모듈 패턴을 참조하여 구현

---

## 6. 참고 자료 (References)

### 6.1 관련 문서
- `docs/nextgen-backend/tasks/step25_api_server_v2_workorder.md` - Step 25 전체 계획
- `src/common/docs/controller-pattern.md` - Controller 패턴 가이드
- `src/common/docs/dto-pattern.md` - DTO 패턴 가이드
- `src/common/templates/resource.controller.template.ts` - Controller 템플릿

### 6.2 기존 코드
- `src/modules/auth/services/` - NextGen Services (참조용)
- `src/modules/auth/entities/` - NextGen Entities (참조용)
- `src/common/base.controller.ts` - BaseController 구현
- `src/common/middleware/auth.middleware.ts` - Auth 미들웨어
- `src/common/middleware/validation.middleware.ts` - Validation 미들웨어

### 6.3 Legacy 코드 (마이그레이션 대상)
- `src/routes/auth.ts` - Legacy JWT Auth
- `src/routes/auth-v2.ts` - Legacy Cookie Auth
- `src/routes/authentication.routes.ts` - Legacy Unified Auth

---

## 7. 작업 시작 명령어 (Quick Start Commands)

```bash
# 1. 작업 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/auth-controllers-migration

# 2. DTOs 디렉토리 생성
mkdir -p src/modules/auth/dto
mkdir -p src/modules/auth/controllers
mkdir -p src/modules/auth/routes

# 3. 템플릿 복사 (선택적)
cp src/common/templates/resource.controller.template.ts \
   src/modules/auth/controllers/auth.controller.ts

# 4. 작업 진행
# (DTOs → Controllers → Routes → Tests 순서로 진행)

# 5. 빌드 및 테스트
cd apps/api-server
pnpm run build
pnpm run test

# 6. 엔드포인트 테스트
bash scripts/test-auth-endpoints.sh

# 7. 커밋 및 푸시
git add .
git commit -m "feat(auth): Migrate AUTH controllers and routes to NextGen pattern"
git push origin feature/auth-controllers-migration
```

---

## 8. 위험 요소 및 대응 방안 (Risks & Mitigation)

### 🔴 높은 위험
**R1: Legacy 엔드포인트 의존성**
- **위험**: 프론트엔드가 아직 `/api/auth` 경로 사용 중
- **대응**: Redirect 메커니즘 구현 + 90일 유예 기간

**R2: 토큰 발급 로직 변경**
- **위험**: 기존 토큰과의 호환성 문제
- **대응**: 토큰 구조 유지 + 점진적 마이그레이션

### 🟡 중간 위험
**R3: Cookie 처리 변경**
- **위험**: httpOnly cookie 설정 변경으로 인한 인증 실패
- **대응**: 기존 로직 유지 + 충분한 테스트

**R4: DTO Validation 강화**
- **위험**: 기존 요청이 새로운 Validation 규칙에 실패
- **대응**: Backward compatible validation + 점진적 강화

---

**작업 시작일**: 2025-12-03
**목표 완료일**: 2025-12-04
**담당자**: Claude (Rena AI Assistant)
**리뷰어**: Rena

---

*이 Work Order는 Step 25 Phase B-2 Step 3의 공식 작업 지시서입니다.*
*모든 구현은 이 문서의 체크리스트를 기준으로 진행하며, 완료 시 Completion Report를 작성합니다.*
