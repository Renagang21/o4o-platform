# Auth 코드 복잡성 조사 보고서

> **Work Order**: WO-AUTH-INVESTIGATION-R3-B
> **작성일**: 2026-01-06
> **상태**: 조사 완료 (수정 없음)

---

## 요약

O4O Platform의 인증 시스템은 여러 버전이 공존하며, 다음과 같은 복잡성 문제를 가지고 있습니다:

1. **3개의 Auth 서비스가 존재** (deprecated 2개 + recommended 1개)
2. **5개 이상의 토큰 저장 키**가 서비스마다 다르게 사용됨
3. **DB 초기화 실패 시 GRACEFUL_STARTUP 모드**로 503 에러 발생

---

## D1. Auth 계층 실체 지도

### 1.1 Auth 서비스 계층

```
┌─────────────────────────────────────────────────────────────────┐
│                         API 서버 라우트                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /api/v1/auth/*  ────────────────────────────────────────────┐  │
│       │                                                       │  │
│       └─► modules/auth/routes/auth.routes.ts                 │  │
│               │                                               │  │
│               └─► AuthController (auth.controller.ts)        │  │
│                       │                                       │  │
│                       └─► authenticationService ◄────────────┤  │
│                           (authentication.service.ts)        │  │
│                           [866 lines, RECOMMENDED]           │  │
│                                                               │  │
├───────────────────────────────────────────────────────────────┤
│                                                               │  │
│  /api/auth-v2/*  (DEPRECATED - 등록되지 않음)                   │  │
│       │                                                       │  │
│       └─► routes/auth-v2.ts                                  │  │
│               │                                               │  │
│               └─► authenticationService (동일)                │  │
│                                                               │  │
├───────────────────────────────────────────────────────────────┤
│                                                               │  │
│  /api/auth/unified/*  (DEPRECATED - 등록되지 않음)              │  │
│       │                                                       │  │
│       └─► routes/authentication.routes.ts                    │  │
│               │                                               │  │
│               └─► authenticationService (동일)                │  │
│                                                               │  │
├───────────────────────────────────────────────────────────────┤
│                                                               │  │
│  Social OAuth  (/api/social-auth/*)                          │  │
│       │                                                       │  │
│       └─► routes/social-auth.ts                              │  │
│               │                                               │  │
│               └─► SocialAuthService                          │  │
│                   (socialAuthService.ts)                     │  │
│                                                               │  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 실제 등록된 라우트 (main.ts)

| 라인 | 코드 | 상태 |
|------|------|------|
| 352 | `import authRoutes from './modules/auth/routes/auth.routes.js'` | ACTIVE |
| 418 | `app.use('/api/v1/auth', authRoutes)` | ACTIVE |
| 419 | `app.use('/api/auth', authRoutes)` | Legacy 호환 |

### 1.3 서비스 파일 상태

| 파일 | 라인 수 | 상태 | 비고 |
|------|---------|------|------|
| `services/authentication.service.ts` | 866 | **RECOMMENDED** | 통합 서비스, 싱글톤 |
| `services/AuthService.ts` | ~200 | DEPRECATED | 마이그레이션 가이드 있음 |
| `services/AuthServiceV2.ts` | ~150 | DEPRECATED | Cookie 기반 |
| `services/socialAuthService.ts` | ~300 | ACTIVE | OAuth 전용 |

### 1.4 서비스 Import 현황

**AuthService (deprecated) - 5개 파일에서 사용:**
- `config/passportDynamic.ts`
- `services/index.ts`
- `controllers/userController.ts`
- `routes/social-auth.ts`
- `services/socialAuthService.ts`

**AuthServiceV2 (deprecated) - 1개 파일에서 사용:**
- `services/index.ts` (export만)

**AuthenticationService (recommended) - 3개 파일에서 사용:**
- `modules/auth/controllers/auth.controller.ts` ✓
- `routes/auth-v2.ts` (미등록 라우트)
- `routes/authentication.routes.ts` (미등록 라우트)

---

## D2. 토큰 저장 구조 분석

### 2.1 localStorage 키 파편화

| 서비스/패키지 | localStorage 키 | 비고 |
|---------------|-----------------|------|
| `web-glycopharm` | `glycopharm_token` | 서비스 전용 prefix |
| `web-glycopharm` | `glycopharm_user` | 사용자 정보 캐시 |
| `admin-dashboard` | `token` | 레거시 |
| `main-site` | `accessToken` | 표준 |
| `auth-context` | `accessToken` | 표준 |
| `auth-context` | `authToken` | postApi 호환성 |
| `auth-context` | `token` | 하위 호환성 |
| `forum-web` | `accessToken` | 표준 |

### 2.2 auth-context 패키지의 토큰 저장 코드

```typescript
// packages/auth-context/src/AuthProvider.tsx:116-118
localStorage.setItem('accessToken', token);
localStorage.setItem('authToken', token); // postApi 호환성
localStorage.setItem('token', token);     // 하위 호환성
```

**문제점**: 동일 토큰을 3개의 키에 중복 저장

### 2.3 glycopharm-web의 독자적 토큰 관리

```typescript
// services/web-glycopharm/src/contexts/AuthContext.tsx:72
const token = localStorage.getItem('glycopharm_token');

// services/web-glycopharm/src/contexts/AuthContext.tsx:145
localStorage.setItem('glycopharm_token', accessToken);
```

**문제점**: 플랫폼 공통 토큰 키와 분리되어 세션 공유 불가

### 2.4 Cookie 기반 인증 (CookieAuthClient)

```typescript
// packages/auth-client/src/cookie-client.ts
withCredentials: true, // httpOnly cookie 사용
```

- `/auth/cookie/login` 엔드포인트 사용
- `refreshToken`은 httpOnly cookie에 저장
- `accessToken`은 메모리에만 유지 (`currentToken`)
- 탭 간 세션 동기화: `localStorage.setItem('auth-session-expired', ...)`

---

## D3. 503 에러 발생 구조 설명

### 3.1 GRACEFUL_STARTUP 정책

```
┌─────────────────────────────────────────────────────────────────┐
│                     서버 시작 (main.ts)                          │
│                            │                                    │
│                            ▼                                    │
│              startupService.initialize()                        │
│                            │                                    │
│                            ▼                                    │
│         ┌──── AppDataSource.initialize() ────┐                  │
│         │                                    │                  │
│         ▼                                    ▼                  │
│      성공                               실패                     │
│         │                                    │                  │
│         │                         GRACEFUL_STARTUP?             │
│         │                            /    \                     │
│         │                         Yes      No                   │
│         │                          │        │                   │
│         ▼                          ▼        ▼                   │
│    정상 운영               서버 계속 실행   서버 종료             │
│                            (DB 없이)                            │
│                                    │                            │
│                                    ▼                            │
│                           로그인 시도 시                         │
│                                    │                            │
│                                    ▼                            │
│                    AppDataSource.isInitialized === false        │
│                                    │                            │
│                                    ▼                            │
│                            503 에러 반환                         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 503 발생 지점

**auth.controller.ts:52-63**
```typescript
if (!AppDataSource.isInitialized) {
  logger.error('[AuthController.login] Database not initialized (GRACEFUL_STARTUP mode)');
  return res.status(503).json({
    success: false,
    error: 'Service temporarily unavailable. Please try again later.',
    code: 'SERVICE_UNAVAILABLE',
    retryable: true,
  });
}
```

### 3.3 503 발생 시나리오

| 시나리오 | 원인 | 증상 |
|----------|------|------|
| Cold Start | Cloud Run 인스턴스가 새로 생성될 때 DB 연결 지연 | 간헐적 503 |
| DB 재시작 | Cloud SQL 인스턴스 재시작 시 연결 끊김 | 일시적 503 |
| 네트워크 지연 | VPC 네트워크 지연으로 DB 연결 실패 | 간헐적 503 |
| 연결 풀 고갈 | 동시 요청 증가로 DB 연결 풀 부족 | 부하 시 503 |

### 3.4 JWT 설정 미비 시 503

**auth.controller.ts:66-78**
```typescript
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  return res.status(503).json({
    success: false,
    error: 'Service configuration error. Please contact administrator.',
    code: 'CONFIG_ERROR',
    retryable: false,
  });
}
```

---

## D4. 리팩토링 결정 필요 지점 리스트

### 4.1 [HIGH] Auth 서비스 통합

| 항목 | 현재 | 권장 |
|------|------|------|
| 사용 서비스 | AuthService, AuthServiceV2, AuthenticationService | AuthenticationService만 |
| deprecated import | 5개 파일 | 0개 |

**결정 필요**: deprecated 서비스 import를 모두 AuthenticationService로 마이그레이션할 것인가?

### 4.2 [HIGH] 토큰 저장 키 표준화

| 항목 | 현재 | 권장 옵션 |
|------|------|----------|
| localStorage 키 | 5개 이상 (`token`, `accessToken`, `authToken`, `glycopharm_token` 등) | 단일 키 (`accessToken`) |
| 서비스별 prefix | glycopharm만 사용 | 전체 통일 또는 전체 prefix 적용 |

**결정 필요**:
- 모든 서비스에서 단일 키 사용?
- 또는 모든 서비스에 prefix 적용? (예: `o4o_accessToken`)

### 4.3 [MEDIUM] Cookie vs localStorage 인증 통일

| 방식 | 사용 서비스 | 장점 | 단점 |
|------|-------------|------|------|
| Cookie (httpOnly) | CookieAuthClient | XSS 방어 | CORS 복잡성 |
| localStorage | glycopharm-web 등 | 단순함 | XSS 취약 |

**결정 필요**: 전체 플랫폼에서 Cookie 기반 인증으로 통일할 것인가?

### 4.4 [MEDIUM] GRACEFUL_STARTUP 정책 검토

| 항목 | 현재 | 대안 |
|------|------|------|
| DB 실패 시 동작 | 서버 계속 실행 → 503 반환 | 서버 종료 → Cloud Run 재시작 |
| 재시도 로직 | 3회 시도, 2초 간격 | 증가된 시도 횟수, 지수 백오프 |

**결정 필요**:
- GRACEFUL_STARTUP=false로 변경하여 빠른 실패?
- 또는 DB 재연결 로직 강화?

### 4.5 [LOW] 미등록 라우트 파일 정리

| 파일 | 상태 | 권장 |
|------|------|------|
| `routes/auth-v2.ts` | 미등록 | 삭제 또는 병합 |
| `routes/authentication.routes.ts` | 미등록 | 삭제 또는 병합 |

**결정 필요**: 미사용 라우트 파일을 삭제할 것인가?

### 4.6 [LOW] 역할 매핑 로직 통합

glycopharm-web에서 자체 역할 매핑 로직 사용:
```typescript
function mapApiRoleToWebRole(apiRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    'seller': 'pharmacy',
    'customer': 'pharmacy',
    // ...
  };
}
```

**결정 필요**: 역할 매핑을 API 서버에서 처리하도록 변경할 것인가?

---

## 결론

현재 인증 시스템은 다음과 같은 기술 부채를 가지고 있습니다:

1. **서비스 파편화**: 3개 서비스 중 1개만 권장되지만, deprecated 서비스가 여전히 import됨
2. **토큰 저장 혼란**: 5개 이상의 localStorage 키가 혼용
3. **503 에러 원인**: GRACEFUL_STARTUP 모드에서 DB 미초기화 상태로 요청 처리 시도

리팩토링 우선순위:
1. **HIGH**: deprecated 서비스 마이그레이션
2. **HIGH**: 토큰 저장 키 표준화
3. **MEDIUM**: Cookie 인증 통일
4. **MEDIUM**: GRACEFUL_STARTUP 정책 검토

---

*이 보고서는 코드 수정 없이 조사만 수행했습니다.*
