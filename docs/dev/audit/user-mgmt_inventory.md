# 사용자 관리 코드 인벤토리

> 작성일: 2025-11-08
> 대상 경로: apps/main-site, apps/admin-dashboard, apps/api-server, packages/*

## 목차
1. [프론트엔드 (Main Site)](#1-프론트엔드-main-site)
2. [관리자 대시보드](#2-관리자-대시보드)
3. [API 서버](#3-api-서버)
4. [공용 패키지](#4-공용-패키지)
5. [파일 관계도](#5-파일-관계도)
6. [발견사항 요약](#6-발견사항-요약)

---

## 1. 프론트엔드 (Main Site)

### 1.1 인증/인가

#### `/apps/main-site/src/contexts/AuthContext.tsx`
- **책임**: 메인 사이트 전역 인증 상태 관리 (Context API)
- **주요 의존성**:
  - `@/services/api` (authAPI)
  - `js-cookie` (쿠키 기반 토큰 관리)
- **주요 기능**:
  - 로그인/로그아웃 처리
  - 쿠키 기반 토큰 저장 (24시간 TTL)
  - 사용자 정보 정규화 (MongoDB `_id` → `id`)
  - 역할 기반 권한 확인 (usePermissions 훅)
- **사용처**:
  - 메인 사이트 전역 (App.tsx에서 Provider로 래핑)
  - 인증 필요 페이지들

#### `/apps/main-site/src/api/auth/authApi.ts`
- **책임**: 레거시 + SSO 하이브리드 인증 API 클라이언트
- **주요 의존성**:
  - `../config/axios` (레거시 axios 인스턴스)
  - `../ssoApiClient` (SSO 클라이언트)
- **주요 기능**:
  - SSO 우선, 레거시 폴백 로그인
  - 회원가입 (레거시만 지원)
  - 토큰 관리 (이중 저장: localStorage + SSO)
- **문제점**:
  - 환경변수 `VITE_USE_SSO` 하드코딩 (`true` 강제)
  - 이중 토큰 관리로 인한 복잡도 증가

#### `/apps/main-site/src/services/authInterceptor.ts`
- **책임**: Axios 요청/응답 인터셉터 (토큰 갱신 처리)
- **주요 의존성**: `./api` (apiClient)
- **주요 기능**:
  - 401 에러 시 자동 토큰 갱신
  - Refresh Token Rotation 지원
  - 세션 만료 시 자동 로그아웃 + 리다이렉트
- **사용처**: API 클라이언트 초기화 시 (앱 진입점)

#### `/apps/main-site/src/services/authProviderService.ts`
- **책임**: OAuth 프로바이더 설정 조회
- **주요 의존성**: `@o4o/auth-client`
- **주요 기능**:
  - 백엔드에서 활성화된 OAuth 제공자 목록 가져오기
  - API 실패 시 기본값 반환 (모두 비활성화)
- **사용처**: 로그인 페이지, 소셜 로그인 컴포넌트

### 1.2 OAuth/소셜 로그인

#### `/apps/main-site/src/components/shortcodes/authShortcodes.tsx`
- **책임**: 인증 관련 Shortcode 컴포넌트 (로그인, ID찾기, 비밀번호 찾기)
- **주요 의존성**:
  - `@o4o/shortcodes` (ShortcodeDefinition)
  - `@o4o/auth-client` (authClient)
  - `@/config/roleRedirects` (역할 기반 리다이렉트)
- **주요 기능**:
  - **SocialLoginComponent**: OAuth + 이메일 로그인 통합 UI
  - **FindIdComponent**: 이메일로 아이디 찾기
  - **FindPasswordComponent**: 비밀번호 재설정 이메일 발송
  - 테스트 계정 패널 (개발/스테이징 환경 전용)
- **Shortcode 목록**:
  - `[[social_login]]`
  - `[[login_form]]`
  - `[[oauth_login]]`
  - `[[find_id]]`
  - `[[find_password]]`
- **사용처**:
  - WordPress 블록으로 등록되어 페이지에 삽입 가능
  - 로그인/회원가입 페이지

#### `/apps/main-site/src/pages/auth/OAuthCallback.tsx`
- **책임**: OAuth 인증 콜백 처리 (Google, Kakao, Naver)
- **주요 의존성**:
  - `@/contexts/AuthContext` (useAuth)
  - `@/services/api` (apiClient)
  - `@/config/roleRedirects` (역할별 리다이렉트 맵)
- **주요 기능**:
  - OAuth 인가 코드 → 토큰 교환
  - 에러 처리 (access_denied, invalid_request 등)
  - 로그인 성공 시 역할 기반 자동 리다이렉트
- **사용처**:
  - `/auth/callback/:provider` 라우트

### 1.3 사용자 프로필/설정

#### `/apps/main-site/src/components/account/SessionManager.tsx`
- **책임**: 사용자 세션 관리 (다중 기기 로그인 제어)
- **주요 의존성**:
  - `@tanstack/react-query` (세션 목록 조회/갱신)
  - `@/utils/api` (apiClient)
- **주요 기능**:
  - 활성 세션 목록 표시 (기기, IP, 로그인 시간)
  - 특정 세션 로그아웃
  - 모든 기기 로그아웃
  - 현재 세션 표시
- **사용처**:
  - 계정 설정 페이지

### 1.4 페이지

#### `/apps/main-site/src/pages/auth/Login.tsx`
- **책임**: 로그인 페이지 (Lazy Loading)
- **주요 의존성**: `authShortcodes.tsx` (SocialLoginComponent)
- **사용처**: `/login` 라우트

#### `/apps/main-site/src/pages/auth/Signup.tsx`
- **책임**: 회원가입 페이지 (이메일 + 소셜)
- **주요 의존성**: `axios`
- **문제점**:
  - **하드코딩된 API URL**: `VITE_API_URL` 직접 사용
  - **하드코딩된 OAuth URL**: `/api/v1/social/{provider}` 직접 구성
  - **중복 로직**: SocialLoginComponent와 기능 중복
- **사용처**: `/register` 라우트

#### `/apps/main-site/src/pages/auth/ForgotPassword.tsx`
#### `/apps/main-site/src/pages/auth/FindPassword.tsx`
#### `/apps/main-site/src/pages/auth/ResetPassword.tsx`
- **책임**: 비밀번호 재설정 플로우
- **사용처**: `/auth/forgot-password`, `/auth/find-password`, `/auth/reset-password`

### 1.5 타입 정의

#### `/apps/main-site/src/types/auth.ts`
- **책임**: 인증 관련 TypeScript 타입 정의
- **주요 타입**:
  - LoginRequest, LoginResponse
  - RegisterRequest, RegisterResponse
  - User, SSOUser
  - OAuthProvidersResponse

#### `/apps/main-site/src/types/user.ts`
- **책임**: 사용자 관련 TypeScript 타입 정의
- **주요 타입**:
  - User, UserRole, UserPermissions
  - AuthContextType

---

## 2. 관리자 대시보드

### 2.1 인증/인가

#### `/apps/admin-dashboard/src/stores/authStore.ts`
- **책임**: Zustand 기반 전역 인증 상태 관리
- **주요 의존성**:
  - `zustand` + `persist` 미들웨어
  - `@/api/sso` (ssoService)
- **주요 기능**:
  - 로그인/로그아웃
  - 사용자 정보 업데이트
  - SSO 세션 체크 (`checkSSOSession`)
  - 크로스 도메인 쿠키 설정/삭제
- **저장소**: localStorage (`admin-auth-storage`)
- **사용처**: 관리자 대시보드 전역

#### `/apps/admin-dashboard/src/hooks/useAuth.ts`
- **책임**: authStore를 감싸는 커스텀 훅
- **주요 의존성**: `@/stores/authStore`
- **사용처**: 관리자 대시보드 컴포넌트들

#### `/apps/admin-dashboard/src/utils/auth.ts`
- **책임**: 인증 유틸리티 함수 (존재 여부만 확인, 상세 내용 미조사)

### 2.2 사용자 관리

#### `/apps/admin-dashboard/src/api/userApi.ts`
- **책임**: 사용자 관리 API 클라이언트
- **주요 의존성**: `./unified-client` (unifiedApi)
- **주요 기능**:
  - 사용자 목록 조회 (페이지네이션, 필터링)
  - 사용자 승인/거부
  - 사용자 생성/수정/삭제
  - 일괄 작업 (bulk approve/reject)
  - 사용자 통계 조회
  - CSV 내보내기
  - 사용자 활동 로그 조회
- **사용처**:
  - `/apps/admin-dashboard/src/pages/users/` 하위 컴포넌트들

#### `/apps/admin-dashboard/src/pages/users/UserDetail.tsx`
#### `/apps/admin-dashboard/src/pages/users/UsersListClean.tsx`
#### `/apps/admin-dashboard/src/pages/users/UserForm.tsx`
#### `/apps/admin-dashboard/src/pages/users/UserStatistics.tsx`
#### `/apps/admin-dashboard/src/pages/users/RoleManagement.tsx`
- **책임**: 사용자 관리 페이지들
- **사용처**: 관리자 대시보드 `/users/*` 라우트

### 2.3 OAuth 설정

#### `/apps/admin-dashboard/src/pages/settings/OAuthSettings.tsx`
#### `/apps/admin-dashboard/src/pages/settings/AuthSettings.tsx`
- **책임**: OAuth 제공자 설정 관리
- **사용처**: 관리자 대시보드 `/settings/*` 라우트

### 2.4 역할/권한

#### `/apps/admin-dashboard/src/config/rolePermissions.ts`
- **책임**: 역할별 권한 매핑 정의
- **사용처**: 역할 기반 접근 제어

#### `/apps/admin-dashboard/src/components/menu/RoleBasedMenu.tsx`
#### `/apps/admin-dashboard/src/components/menu/RoleSelector.tsx`
- **책임**: 역할 기반 메뉴 렌더링 및 역할 선택기
- **사용처**: 관리자 대시보드 레이아웃

### 2.5 인증 페이지

#### `/apps/admin-dashboard/src/pages/auth/Login.tsx`
- **책임**: 관리자 로그인 페이지
- **주요 의존성**: `@o4o/auth-context` (useAuth)
- **주요 기능**:
  - 관리자 권한 검증
  - 테스트 계정 자동 입력 (개발용)
- **사용처**: `/login` 라우트

### 2.6 타입 정의

#### `/apps/admin-dashboard/src/types/auth.ts`
#### `/apps/admin-dashboard/src/types/oauth.ts`
#### `/apps/admin-dashboard/src/types/user.ts`
- **책임**: 인증 및 사용자 관련 TypeScript 타입 정의

---

## 3. API 서버

### 3.1 인증 서비스

#### `/apps/api-server/src/services/AuthService.ts`
- **책임**: 핵심 인증 서비스 (JWT 토큰 관리)
- **주요 의존성**:
  - `typeorm` (User 엔티티)
  - `jsonwebtoken` (JWT 생성/검증)
  - `bcryptjs` (비밀번호 해싱)
- **주요 기능**:
  - 로그인 (이메일/비밀번호)
  - JWT Access Token / Refresh Token 생성
  - Refresh Token Rotation
  - 로그인 실패 처리 (5회 실패 시 30분 잠금)
  - 비밀번호 해싱
  - 사용자 역할 변경
  - 계정 정지
- **토큰 정책**:
  - Access Token: 15분
  - Refresh Token: 7일
  - 쿠키 도메인: `.neture.co.kr`
- **사용처**:
  - `/apps/api-server/src/routes/auth.ts`
  - 기타 인증 관련 라우트

#### `/apps/api-server/src/services/unified-auth.service.ts`
- **책임**: 통합 인증 서비스 (이메일 + OAuth)
- **주요 의존성**:
  - `./AuthService` (기본 인증 로직)
  - `./account-linking.service` (계정 연동)
  - `./email.service` (이메일 발송)
- **주요 기능**:
  - 이메일 로그인 처리
  - OAuth 로그인 처리 (신규 가입 or 기존 연동)
  - 계정 자동 연동 (같은 이메일)
  - 아이디 찾기 / 비밀번호 재설정 이메일 발송
  - 테스트 계정 목록 조회
- **사용처**:
  - `/apps/api-server/src/routes/unified-auth.routes.ts`

#### `/apps/api-server/src/services/AuthServiceV2.ts`
#### `/apps/api-server/src/services/socialAuthService.ts`
- **책임**: 레거시 인증 서비스 (추정)
- **문제점**: AuthService와 기능 중복 가능성

### 3.2 인증 미들웨어

#### `/apps/api-server/src/middleware/auth.middleware.ts`
- **책임**: JWT 토큰 검증 미들웨어
- **주요 의존성**: `jsonwebtoken`
- **주요 기능**:
  - Authorization 헤더에서 Bearer 토큰 추출
  - JWT 토큰 검증
  - 사용자 정보 조회 (DB에서)
  - `req.user`에 사용자 정보 첨부
- **에러 응답**:
  - 403: 토큰 없음 / 유효하지 않음
- **사용처**: 인증 필요한 모든 API 라우트

#### `/apps/api-server/src/middleware/auth.ts`
- **책임**: 레거시 인증 미들웨어 (중복 가능성)

#### `/apps/api-server/src/middleware/authorize.middleware.ts`
#### `/apps/api-server/src/middleware/authorize.ts`
- **책임**: 역할/권한 기반 인가 미들웨어

#### `/apps/api-server/src/middleware/checkRole.ts`
- **책임**: 역할 체크 미들웨어

#### `/apps/api-server/src/middleware/permission.middleware.ts`
- **책임**: 권한 체크 미들웨어

#### `/apps/api-server/src/middleware/dropshipping-auth.ts`
- **책임**: 드롭쉬핑 관련 인증 미들웨어

### 3.3 인증 라우트

#### `/apps/api-server/src/routes/auth.ts`
- **책임**: 메인 인증 API 엔드포인트
- **주요 의존성**:
  - `express-validator` (입력 검증)
  - `bcryptjs` (비밀번호 비교)
  - `jsonwebtoken` (JWT 생성)
- **엔드포인트**:
  - `POST /login`: 이메일/비밀번호 로그인
  - `POST /signup`: 회원가입 (즉시 활성화)
  - `POST /register`: 회원가입 (레거시, 호환성)
  - `GET /verify`: 토큰 검증
  - `POST /logout`: 로그아웃
  - `GET /status`: 인증 상태 확인
- **사용처**: `/api/v1/auth` 경로

#### `/apps/api-server/src/routes/auth-v2.ts`
#### `/apps/api-server/src/routes/social-auth.ts`
#### `/apps/api-server/src/routes/unified-auth.routes.ts`
#### `/apps/api-server/src/routes/email-auth.routes.ts`
- **책임**: 다양한 인증 API 버전/타입별 라우트
- **문제점**: 여러 버전의 인증 라우트가 혼재

### 3.4 사용자 관리

#### `/apps/api-server/src/controllers/userController.ts`
#### `/apps/api-server/src/controllers/UserManagementController.ts`
#### `/apps/api-server/src/controllers/admin/AdminUserController.ts`
#### `/apps/api-server/src/controllers/betaUserController.ts`
- **책임**: 사용자 관리 컨트롤러

#### `/apps/api-server/src/services/UserService.ts`
#### `/apps/api-server/src/services/user-role.service.ts`
#### `/apps/api-server/src/services/betaUserService.ts`
- **책임**: 사용자 관리 서비스 로직

#### `/apps/api-server/src/routes/user.ts`
#### `/apps/api-server/src/routes/users.routes.ts`
#### `/apps/api-server/src/routes/v1/users.routes.ts`
#### `/apps/api-server/src/routes/v1/userRole.routes.ts`
#### `/apps/api-server/src/routes/v1/userRoleSwitch.routes.ts`
#### `/apps/api-server/src/routes/v1/userStatistics.routes.ts`
#### `/apps/api-server/src/routes/v1/userActivity.routes.ts`
#### `/apps/api-server/src/routes/admin/users.routes.ts`
- **책임**: 사용자 관리 API 라우트

#### `/apps/api-server/src/repositories/UserRepository.ts`
- **책임**: 사용자 데이터 액세스 레이어

### 3.5 세션 관리

#### `/apps/api-server/src/entities/UserSession.ts`
- **책임**: 사용자 세션 엔티티 (다중 기기 로그인)

#### `/apps/api-server/src/routes/sessions.ts`
- **책임**: 세션 관리 API

#### `/apps/api-server/src/services/sessionSyncService.ts`
#### `/apps/api-server/src/websocket/sessionSync.ts`
- **책임**: 실시간 세션 동기화

#### `/apps/api-server/src/middleware/sessionActivity.ts`
- **책임**: 세션 활동 추적 미들웨어

### 3.6 토큰 관리

#### `/apps/api-server/src/entities/RefreshToken.ts`
#### `/apps/api-server/src/entities/PasswordResetToken.ts`
#### `/apps/api-server/src/entities/EmailVerificationToken.ts`
- **책임**: 토큰 엔티티

#### `/apps/api-server/src/services/RefreshTokenService.ts`
#### `/apps/api-server/src/services/refreshToken.service.ts`
#### `/apps/api-server/src/services/passwordResetService.ts`
#### `/apps/api-server/src/services/preview-token.service.ts`
- **책임**: 토큰 관리 서비스

### 3.7 역할/권한

#### `/apps/api-server/src/entities/Role.ts`
#### `/apps/api-server/src/entities/Permission.ts`
- **책임**: 역할/권한 엔티티

#### `/apps/api-server/src/controllers/v1/userRole.controller.ts`
#### `/apps/api-server/src/controllers/v1/userRoleSwitch.controller.ts`
- **책임**: 역할 관리 컨트롤러

### 3.8 활동 로그

#### `/apps/api-server/src/entities/UserActivityLog.ts`
#### `/apps/api-server/src/entities/UserAction.ts`
- **책임**: 사용자 활동 추적

#### `/apps/api-server/src/controllers/v1/userActivity.controller.ts`
- **책임**: 활동 로그 컨트롤러

### 3.9 계정 연동

#### `/apps/api-server/src/entities/LinkedAccount.ts`
#### `/apps/api-server/src/entities/AccountActivity.ts`
#### `/apps/api-server/src/entities/LinkingSession.ts`
- **책임**: 소셜 계정 연동 엔티티

### 3.10 OAuth 설정

#### `/apps/api-server/src/config/oauth-providers.ts`
- **책임**: OAuth 제공자 설정

### 3.11 Seller Authorization (드롭쉬핑)

#### `/apps/api-server/src/entities/SellerAuthorization.ts`
#### `/apps/api-server/src/entities/SellerAuthorizationAuditLog.ts`
- **책임**: 판매자 권한 부여 엔티티

#### `/apps/api-server/src/services/SellerAuthorizationService.ts`
#### `/apps/api-server/src/services/AuthorizationGateService.ts`
#### `/apps/api-server/src/services/authorization-metrics.service.ts`
- **책임**: 판매자 권한 관리 서비스

#### `/apps/api-server/src/routes/ds-seller-authorization-v2.routes.ts`
#### `/apps/api-server/src/routes/admin/seller-authorization.routes.ts`
- **책임**: 판매자 권한 API

### 3.12 마이그레이션

#### `/apps/api-server/src/migrations/1700000000000-CreateUsersTable.ts`
#### `/apps/api-server/src/migrations/1748000000000-CreateUserManagementTables.ts`
#### `/apps/api-server/src/migrations/1735000000000-AddUserRolesAndApprovalLogs.ts`
#### `/apps/api-server/src/migrations/1749876543210-AddActiveRoleToUsers.ts`
#### `/apps/api-server/src/migrations/1810000000000-CreateRolePermissionTables.ts`
#### `/apps/api-server/src/migrations/add-avatar-to-users.ts`
#### `/apps/api-server/src/migrations/create-refresh-tokens-table.ts`
#### `/apps/api-server/src/migrations/create-email-tokens-tables.ts`
#### `/apps/api-server/src/migrations/1800000000000-Phase9-SellerAuthorization.ts`
- **책임**: 데이터베이스 스키마 마이그레이션

### 3.13 시드

#### `/apps/api-server/src/database/seeds/phase9-seller-authorization.seed.ts`
- **책임**: 개발용 시드 데이터

### 3.14 타입 정의

#### `/apps/api-server/src/types/auth.ts`
#### `/apps/api-server/src/types/email-auth.ts`
#### `/apps/api-server/src/types/user.ts`
#### `/apps/api-server/src/types/userManagement.types.ts`
- **책임**: 인증 및 사용자 관련 TypeScript 타입 정의

#### `/apps/api-server/src/utils/auth.utils.ts`
- **책임**: 인증 유틸리티 함수

---

## 4. 공용 패키지

### 4.1 @o4o/auth-context

#### `/packages/auth-context/src/AuthContext.tsx`
- **책임**: React Context 기반 인증 상태 관리
- **주요 타입**:
  - User, SessionStatus
  - AuthContextType
- **주요 기능**:
  - useAuth 훅 제공
- **사용처**:
  - 관리자 대시보드
  - 메인 사이트 (일부)

#### `/packages/auth-context/src/AuthProvider.tsx`
- **책임**: AuthContext Provider 구현
- **주요 의존성**: `@o4o/auth-client` (AuthClient)
- **주요 기능**:
  - 로그인/로그아웃
  - 세션 상태 관리
  - localStorage 기반 상태 복원
  - SSO 세션 체크 (옵션)
- **저장소**: localStorage (`admin-auth-storage`, `accessToken`, `token`, `authToken`)
- **사용처**:
  - 관리자 대시보드 (App.tsx)

#### `/packages/auth-context/src/CookieAuthProvider.tsx`
#### `/packages/auth-context/src/SSOAuthProvider.tsx`
- **책임**: 특수 인증 Provider 구현
- **사용 여부**: 미확인

### 4.2 @o4o/shortcodes

#### `/packages/shortcodes/src/auth/SocialLogin.tsx`
- **책임**: 간단한 소셜 로그인 Shortcode 컴포넌트
- **주요 기능**:
  - Google, Kakao, Naver 로그인 버튼
  - 이메일 로그인 폼
- **문제점**:
  - **하드코딩된 API URL**: `https://api.neture.co.kr` 직접 사용
  - **메인 사이트 authShortcodes.tsx와 기능 중복**
- **사용처**: Shortcode 시스템 (`[[social_login]]`)

#### `/packages/shortcodes/src/auth/index.ts`
- **책임**: 인증 관련 Shortcode export

### 4.3 @o4o/ui

#### `/packages/ui/src/components/SocialLoginButtons.tsx`
- **책임**: 재사용 가능한 소셜 로그인 버튼 컴포넌트
- **사용처**: 메인 사이트, 관리자 대시보드

### 4.4 @o4o/types

#### `/packages/types/src/auth.ts`
- **책임**: 공통 인증 타입 정의
- **사용처**: 여러 앱에서 공통 사용

---

## 5. 파일 관계도

### 5.1 핵심 의존성 그래프

```
┌─────────────────────────────────────────────────────┐
│ Main Site                                           │
│                                                     │
│  AuthContext.tsx                                    │
│    ├─> authApi.ts (SSO + Legacy)                   │
│    │     ├─> ssoApiClient                          │
│    │     └─> axios (legacy)                        │
│    └─> authInterceptor.ts                          │
│                                                     │
│  authShortcodes.tsx                                 │
│    ├─> @o4o/auth-client                            │
│    └─> roleRedirects                               │
│                                                     │
│  OAuthCallback.tsx                                  │
│    ├─> AuthContext                                 │
│    └─> apiClient                                   │
│                                                     │
│  Signup.tsx (하드코딩 문제)                          │
│    └─> axios (VITE_API_URL 직접 사용)               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Admin Dashboard                                     │
│                                                     │
│  authStore.ts (Zustand)                             │
│    └─> ssoService                                  │
│                                                     │
│  useAuth.ts                                         │
│    └─> authStore                                   │
│                                                     │
│  userApi.ts                                         │
│    └─> unifiedApi                                  │
│                                                     │
│  Login.tsx                                          │
│    └─> @o4o/auth-context                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ API Server                                          │
│                                                     │
│  routes/auth.ts                                     │
│    ├─> AuthService                                 │
│    └─> auth.middleware                             │
│                                                     │
│  AuthService.ts                                     │
│    ├─> User (TypeORM)                              │
│    ├─> jsonwebtoken                                │
│    └─> bcryptjs                                    │
│                                                     │
│  unified-auth.service.ts                            │
│    ├─> AuthService                                 │
│    ├─> AccountLinkingService                       │
│    └─> emailService                                │
│                                                     │
│  auth.middleware.ts                                 │
│    ├─> jsonwebtoken                                │
│    └─> User (TypeORM)                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Shared Packages                                     │
│                                                     │
│  @o4o/auth-context                                  │
│    ├─> AuthContext.tsx                             │
│    └─> AuthProvider.tsx                            │
│         └─> @o4o/auth-client                       │
│                                                     │
│  @o4o/shortcodes                                    │
│    └─> auth/SocialLogin.tsx (하드코딩 문제)          │
│                                                     │
│  @o4o/types                                         │
│    └─> auth.ts                                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 데이터 플로우

#### 로그인 플로우 (이메일/비밀번호)
```
[사용자 입력]
    ↓
[Main Site] authShortcodes.tsx
    ↓ authClient.api.post('/auth/login')
[API Server] routes/auth.ts
    ↓
AuthService.login()
    ↓
    ├─> bcrypt.compare(password)
    ├─> generateTokens() → JWT 생성
    └─> 쿠키 설정
    ↓
[Response] { user, tokens, sessionId }
    ↓
[Main Site] AuthContext.updateUser()
    ↓ Cookie 저장
localStorage + Cookie 업데이트
```

#### OAuth 로그인 플로우
```
[사용자 클릭] Google/Kakao/Naver 버튼
    ↓
[Redirect] /api/v1/auth/{provider}
    ↓
[OAuth Provider] 인증 페이지
    ↓ 승인
[Callback] /auth/callback/:provider?code=xxx
    ↓
[Main Site] OAuthCallback.tsx
    ↓ apiClient.post('/auth/oauth/:provider/callback')
[API Server] unified-auth.service.ts
    ↓
    ├─> 기존 계정 확인
    ├─> 신규 가입 or 계정 연동
    └─> generateTokens()
    ↓
[Response] { user, tokens }
    ↓
[Main Site] AuthContext.updateUser()
    ↓
역할 기반 리다이렉트 (/dashboard, /seller, /admin 등)
```

### 5.3 Dead Code 후보

다음 파일들은 임포트되지 않거나 사용처가 불분명합니다:

#### API Server
- `/apps/api-server/src/services/AuthServiceV2.ts` (AuthService와 중복)
- `/apps/api-server/src/services/socialAuthService.ts` (unified-auth.service와 중복)
- `/apps/api-server/src/middleware/auth.ts` (auth.middleware.ts와 중복)
- `/apps/api-server/src/middleware/authorize.ts` (authorize.middleware.ts와 중복)
- `/apps/api-server/src/routes/auth-v2.ts` (routes/auth.ts와 중복)

#### Shared Packages
- `/packages/auth-context/src/CookieAuthProvider.tsx` (사용처 미확인)
- `/packages/auth-context/src/SSOAuthProvider.tsx` (사용처 미확인)

### 5.4 중복 코드 후보

다음 파일들은 유사한 책임을 가지고 있습니다:

#### Main Site
- `authShortcodes.tsx` ↔ `pages/auth/Signup.tsx`
  - 둘 다 소셜 로그인 UI 제공
  - Signup.tsx가 하드코딩된 API URL 사용

#### Shared Packages
- `packages/shortcodes/src/auth/SocialLogin.tsx` ↔ `apps/main-site/src/components/shortcodes/authShortcodes.tsx`
  - 둘 다 소셜 로그인 Shortcode
  - 메인 사이트 버전이 더 기능이 많음
  - 패키지 버전이 하드코딩 문제

#### API Server
- `AuthService.ts` ↔ `AuthServiceV2.ts` ↔ `socialAuthService.ts`
  - 인증 로직 중복 가능성
- `auth.middleware.ts` ↔ `auth.ts`
  - 인증 미들웨어 중복
- `routes/auth.ts` ↔ `routes/auth-v2.ts` ↔ `routes/unified-auth.routes.ts`
  - 인증 라우트 버전 혼재

---

## 6. 발견사항 요약

### 6.1 주요 문제점

#### A. 하드코딩된 API URL
다음 파일들이 환경변수를 직접 사용하거나 URL을 하드코딩:

1. **`/apps/main-site/src/pages/auth/Signup.tsx`**
   - `VITE_API_URL` 직접 사용
   - OAuth URL 직접 구성: `/api/v1/social/{provider}`
   - **권장**: `authClient.api` 사용

2. **`/packages/shortcodes/src/auth/SocialLogin.tsx`**
   - `https://api.neture.co.kr` 하드코딩
   - **권장**: authClient 또는 환경변수 사용

3. **`/apps/main-site/src/api/auth/authApi.ts`**
   - `VITE_USE_SSO` 환경변수를 `true`로 강제
   - **권장**: 환경변수 값을 그대로 사용

#### B. 코드 중복

1. **소셜 로그인 컴포넌트 중복**
   - `authShortcodes.tsx` (Main Site)
   - `SocialLogin.tsx` (Shared Package)
   - **권장**: 패키지 버전을 개선하여 통합

2. **인증 서비스 중복 (API Server)**
   - `AuthService.ts` (현재 사용 중)
   - `AuthServiceV2.ts` (사용 여부 불명확)
   - `socialAuthService.ts` (unified-auth.service와 중복)
   - **권장**: 사용하지 않는 서비스 제거

3. **인증 미들웨어 중복 (API Server)**
   - `auth.middleware.ts` (현재 사용 중)
   - `auth.ts` (사용 여부 불명확)
   - **권장**: 사용하지 않는 미들웨어 제거

4. **인증 라우트 중복 (API Server)**
   - `routes/auth.ts` (메인)
   - `routes/auth-v2.ts` (사용 여부 불명확)
   - `routes/unified-auth.routes.ts` (OAuth 통합)
   - **권장**: 버전별 역할 명확화 또는 통합

#### C. 이중 토큰 관리

**Main Site `authApi.ts`**:
- SSO 토큰과 레거시 토큰을 동시에 관리
- localStorage에 3가지 키로 저장:
  - `token`
  - `legacy_token`
  - `sso_access_token`
- **문제**: 복잡도 증가, 버그 발생 가능성
- **권장**: SSO로 완전히 마이그레이션 후 레거시 제거

**Admin Dashboard `authStore.ts`**:
- localStorage에 4가지 키로 저장:
  - `admin-auth-storage` (Zustand persist)
  - `authToken`
  - `accessToken`
  - `refreshToken`
- **문제**: 동기화 문제 가능성
- **권장**: Zustand persist만 사용하고 나머지 제거

#### D. 타입 정의 분산

인증 관련 타입이 여러 곳에 분산:
- `/apps/main-site/src/types/auth.ts`
- `/apps/main-site/src/types/user.ts`
- `/apps/admin-dashboard/src/types/auth.ts`
- `/apps/admin-dashboard/src/types/user.ts`
- `/apps/api-server/src/types/auth.ts`
- `/apps/api-server/src/types/user.ts`
- `/packages/types/src/auth.ts`

**권장**:
- 공통 타입은 `@o4o/types`로 통합
- 앱별 특수 타입만 각 앱에 유지

#### E. 세션 관리 복잡성

다음 세션 관리 방식이 혼재:
1. **JWT 기반** (stateless)
2. **Cookie 기반** (httpOnly)
3. **localStorage 기반** (SPA)
4. **DB 기반** (`UserSession` 엔티티)

**권장**:
- 세션 전략을 명확히 정의
- 문서화

### 6.2 장점

1. **역할 기반 접근 제어 (RBAC)**
   - 체계적인 역할/권한 시스템
   - 다중 역할 지원
   - 역할 전환 기능

2. **OAuth 통합**
   - Google, Kakao, Naver 지원
   - 계정 자동 연동
   - 관리자 대시보드에서 설정 가능

3. **보안 기능**
   - Refresh Token Rotation
   - 로그인 실패 5회 시 계정 잠금
   - httpOnly 쿠키
   - CORS 설정 (`.neture.co.kr`)

4. **다중 기기 세션 관리**
   - 활성 세션 목록 조회
   - 특정 기기 로그아웃
   - 모든 기기 로그아웃

5. **활동 로그**
   - 사용자 활동 추적
   - 계정 연동 히스토리

### 6.3 개선 권장사항

#### 우선순위 1 (Critical)
1. **하드코딩된 API URL 제거**
   - Signup.tsx, SocialLogin.tsx 수정
   - authClient 사용으로 통일

2. **중복 코드 제거**
   - 사용하지 않는 AuthServiceV2, socialAuthService 제거
   - 중복 미들웨어 제거 (auth.ts, authorize.ts)

#### 우선순위 2 (High)
3. **이중 토큰 관리 단순화**
   - SSO 완전 마이그레이션 또는 레거시 제거
   - localStorage 키 통일

4. **타입 정의 통합**
   - 공통 타입을 `@o4o/types`로 이동

#### 우선순위 3 (Medium)
5. **소셜 로그인 컴포넌트 통합**
   - 패키지 버전을 개선하여 메인 사이트에서 사용

6. **세션 전략 문서화**
   - JWT vs Cookie vs DB 세션 사용 시나리오 명확화

7. **Dead Code 제거**
   - 사용하지 않는 파일 삭제 전 사용처 재확인

#### 우선순위 4 (Low)
8. **테스트 커버리지 확대**
   - 인증 플로우 E2E 테스트
   - 단위 테스트 추가

---

## 7. 파일 목록 (전체)

### Main Site (28개 파일)
- `/apps/main-site/src/api/auth/authApi.ts`
- `/apps/main-site/src/types/auth.ts`
- `/apps/main-site/src/types/user.ts`
- `/apps/main-site/src/contexts/AuthContext.tsx`
- `/apps/main-site/src/services/authInterceptor.ts`
- `/apps/main-site/src/services/authProviderService.ts`
- `/apps/main-site/src/components/shortcodes/authShortcodes.tsx`
- `/apps/main-site/src/components/common/UserRoleSwitch.tsx`
- `/apps/main-site/src/components/account/SessionManager.tsx`
- `/apps/main-site/src/pages/auth/Login.tsx`
- `/apps/main-site/src/pages/auth/Signup.tsx`
- `/apps/main-site/src/pages/auth/OAuthCallback.tsx`
- `/apps/main-site/src/pages/auth/ForgotPassword.tsx`
- `/apps/main-site/src/pages/auth/FindPassword.tsx`
- `/apps/main-site/src/pages/auth/ResetPassword.tsx`
- `/apps/main-site/src/hooks/useReusableBlock.ts`

### Admin Dashboard (47개 파일)
- `/apps/admin-dashboard/src/stores/authStore.ts`
- `/apps/admin-dashboard/src/hooks/useAuth.ts`
- `/apps/admin-dashboard/src/utils/auth.ts`
- `/apps/admin-dashboard/src/types/auth.ts`
- `/apps/admin-dashboard/src/types/oauth.ts`
- `/apps/admin-dashboard/src/types/user.ts`
- `/apps/admin-dashboard/src/constants/oauth.ts`
- `/apps/admin-dashboard/src/config/rolePermissions.ts`
- `/apps/admin-dashboard/src/api/userApi.ts`
- `/apps/admin-dashboard/src/pages/auth/Login.tsx`
- `/apps/admin-dashboard/src/pages/settings/AuthSettings.tsx`
- `/apps/admin-dashboard/src/pages/settings/OAuthSettings.tsx`
- `/apps/admin-dashboard/src/pages/users/UserDetail.tsx`
- `/apps/admin-dashboard/src/pages/users/UsersListClean.tsx`
- `/apps/admin-dashboard/src/pages/users/UserForm.tsx`
- `/apps/admin-dashboard/src/pages/users/UserStatistics.tsx`
- `/apps/admin-dashboard/src/pages/users/RoleManagement.tsx`
- `/apps/admin-dashboard/src/pages/users/components/UserActivityLog.tsx`
- `/apps/admin-dashboard/src/pages/cpt-acf/UserArchive.tsx`
- `/apps/admin-dashboard/src/pages/cpt-acf/forms/UserForm.tsx`
- `/apps/admin-dashboard/src/pages/dashboard/components/StatsCards/UserStats.tsx`
- `/apps/admin-dashboard/src/pages/dashboard/components/StatsOverview/UserStatsCard.tsx`
- `/apps/admin-dashboard/src/components/menu/RoleSelector.tsx`
- `/apps/admin-dashboard/src/components/menu/RoleBasedMenu.tsx`
- `/apps/admin-dashboard/src/components/shortcodes/dropshipping/UserDashboard.tsx`
- `/apps/admin-dashboard/src/components/shortcodes/dropshipping/RoleVerification.tsx`
- `/apps/admin-dashboard/src/features/cpt-acf/components/location-rules/CurrentUserInfo.tsx`
- `/apps/admin-dashboard/src/pages/dropshipping/SupplierAuthorizationInbox.tsx`
- `/apps/admin-dashboard/src/pages/dropshipping/SellerAuthorizations.tsx`
- `/apps/admin-dashboard/src/pages/dropshipping/AdminAuthorizationConsole.tsx`
- (기타 helpers, hooks 등)

### API Server (94개 파일)
- `/apps/api-server/src/services/AuthService.ts`
- `/apps/api-server/src/services/AuthServiceV2.ts`
- `/apps/api-server/src/services/unified-auth.service.ts`
- `/apps/api-server/src/services/socialAuthService.ts`
- `/apps/api-server/src/services/UserService.ts`
- `/apps/api-server/src/services/user-role.service.ts`
- `/apps/api-server/src/services/betaUserService.ts`
- `/apps/api-server/src/services/RefreshTokenService.ts`
- `/apps/api-server/src/services/refreshToken.service.ts`
- `/apps/api-server/src/services/passwordResetService.ts`
- `/apps/api-server/src/services/preview-token.service.ts`
- `/apps/api-server/src/services/sessionSyncService.ts`
- `/apps/api-server/src/services/SellerAuthorizationService.ts`
- `/apps/api-server/src/services/AuthorizationGateService.ts`
- `/apps/api-server/src/services/authorization-metrics.service.ts`
- `/apps/api-server/src/middleware/auth.middleware.ts`
- `/apps/api-server/src/middleware/auth.ts`
- `/apps/api-server/src/middleware/authorize.middleware.ts`
- `/apps/api-server/src/middleware/authorize.ts`
- `/apps/api-server/src/middleware/checkRole.ts`
- `/apps/api-server/src/middleware/permission.middleware.ts`
- `/apps/api-server/src/middleware/dropshipping-auth.ts`
- `/apps/api-server/src/middleware/sessionActivity.ts`
- `/apps/api-server/src/routes/auth.ts`
- `/apps/api-server/src/routes/auth-v2.ts`
- `/apps/api-server/src/routes/unified-auth.routes.ts`
- `/apps/api-server/src/routes/email-auth.routes.ts`
- `/apps/api-server/src/routes/social-auth.ts`
- `/apps/api-server/src/routes/user.ts`
- `/apps/api-server/src/routes/users.routes.ts`
- `/apps/api-server/src/routes/v1/users.routes.ts`
- `/apps/api-server/src/routes/v1/userRole.routes.ts`
- `/apps/api-server/src/routes/v1/userRoleSwitch.routes.ts`
- `/apps/api-server/src/routes/v1/userStatistics.routes.ts`
- `/apps/api-server/src/routes/v1/userActivity.routes.ts`
- `/apps/api-server/src/routes/admin/users.routes.ts`
- `/apps/api-server/src/routes/ds-seller-authorization-v2.routes.ts`
- `/apps/api-server/src/routes/admin/seller-authorization.routes.ts`
- `/apps/api-server/src/routes/sessions.ts`
- `/apps/api-server/src/controllers/userController.ts`
- `/apps/api-server/src/controllers/UserManagementController.ts`
- `/apps/api-server/src/controllers/admin/AdminUserController.ts`
- `/apps/api-server/src/controllers/betaUserController.ts`
- `/apps/api-server/src/controllers/v1/userRole.controller.ts`
- `/apps/api-server/src/controllers/v1/userRoleSwitch.controller.ts`
- `/apps/api-server/src/controllers/v1/userStatistics.controller.ts`
- `/apps/api-server/src/controllers/v1/userActivity.controller.ts`
- `/apps/api-server/src/entities/User.ts`
- `/apps/api-server/src/entities/BetaUser.ts`
- `/apps/api-server/src/entities/Role.ts`
- `/apps/api-server/src/entities/Permission.ts`
- `/apps/api-server/src/entities/UserSession.ts`
- `/apps/api-server/src/entities/UserActivityLog.ts`
- `/apps/api-server/src/entities/UserAction.ts`
- `/apps/api-server/src/entities/RefreshToken.ts`
- `/apps/api-server/src/entities/PasswordResetToken.ts`
- `/apps/api-server/src/entities/EmailVerificationToken.ts`
- `/apps/api-server/src/entities/LinkedAccount.ts`
- `/apps/api-server/src/entities/AccountActivity.ts`
- `/apps/api-server/src/entities/LinkingSession.ts`
- `/apps/api-server/src/entities/SellerAuthorization.ts`
- `/apps/api-server/src/entities/SellerAuthorizationAuditLog.ts`
- `/apps/api-server/src/repositories/UserRepository.ts`
- `/apps/api-server/src/types/auth.ts`
- `/apps/api-server/src/types/email-auth.ts`
- `/apps/api-server/src/types/user.ts`
- `/apps/api-server/src/types/userManagement.types.ts`
- `/apps/api-server/src/utils/auth.utils.ts`
- `/apps/api-server/src/config/oauth-providers.ts`
- `/apps/api-server/src/websocket/sessionSync.ts`
- (마이그레이션 파일 10개)
- (시드 파일 1개)
- (테스트 파일 3개)

### Shared Packages (8개 파일)
- `/packages/auth-context/src/AuthContext.tsx`
- `/packages/auth-context/src/AuthProvider.tsx`
- `/packages/auth-context/src/CookieAuthProvider.tsx`
- `/packages/auth-context/src/SSOAuthProvider.tsx`
- `/packages/shortcodes/src/auth/SocialLogin.tsx`
- `/packages/shortcodes/src/auth/index.ts`
- `/packages/ui/src/components/SocialLoginButtons.tsx`
- `/packages/types/src/auth.ts`

**총 파일 수: 약 177개**

---

*이 인벤토리는 2025-11-08 기준으로 작성되었으며, 코드베이스 변경에 따라 업데이트가 필요할 수 있습니다.*

---

## 8. Shortcode 로그인 시스템

> 조사일: 2025-11-08
> 조사 대상: 로그인 관련 Shortcode (`[[social_login]]`, `[[login_form]]`, `[[oauth_login]]`)

### 8.1 Shortcode 정의

#### 8.1.1 `[[social_login]]`

**파일 위치**: `/home/sohae21/o4o-platform/apps/main-site/src/components/shortcodes/authShortcodes.tsx`

**정의**:
```typescript
export const socialLoginShortcode: ShortcodeDefinition = {
  name: 'social_login',
  component: ({ attributes }) => (
    <SocialLoginComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      showEmailLogin={attributes.show_email_login !== false}
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      providers={attributes.providers as string}
      showTestPanel={attributes.showTestPanel as string | boolean}
    />
  )
};
```

**지원 속성**:

| 속성명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `redirect_url` / `redirectUrl` | string | `/dashboard` | 로그인 성공 후 리다이렉트 URL (역할 기반 자동 리다이렉트로 재정의됨) |
| `show_email_login` | boolean | `true` | 이메일/비밀번호 로그인 폼 표시 여부 |
| `title` | string | `로그인` | 제목 |
| `subtitle` | string | `계정에 접속하여 서비스를 이용하세요` | 부제목 |
| `providers` | string | (전체) | 표시할 OAuth 제공자 (쉼표 구분: `google,kakao,naver`) |
| `showTestPanel` | string \| boolean | `env:dev` | 테스트 계정 패널 표시 여부 (`true`, `false`, `env:dev`) |

**사용 예시**:
```
[[social_login]]
[[social_login redirect_url="/my-page" title="회원 로그인"]]
[[social_login show_email_login="false" providers="google,kakao"]]
[[social_login showTestPanel="true"]]
```

**렌더링 컴포넌트**: `SocialLoginComponent` (동일 파일 내)

---

#### 8.1.2 `[[login_form]]`

**파일 위치**: `/home/sohae21/o4o-platform/apps/main-site/src/components/shortcodes/authShortcodes.tsx`

**정의**:
```typescript
export const loginFormShortcode: ShortcodeDefinition = {
  name: 'login_form',
  component: ({ attributes }) => (
    <SocialLoginComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      showEmailLogin={attributes.show_email_login !== false}
      title={attributes.title as string}
      subtitle={attributes.subtitle as string}
      providers={attributes.providers as string}
      showTestPanel={attributes.showTestPanel as string | boolean}
    />
  )
};
```

**지원 속성**: `[[social_login]]`과 동일

**비고**: `[[social_login]]`의 별칭(alias)으로, 동일한 `SocialLoginComponent`를 렌더링

**사용 예시**:
```
[[login_form]]
[[login_form redirect_url="/dashboard"]]
```

---

#### 8.1.3 `[[oauth_login]]`

**파일 위치**: `/home/sohae21/o4o-platform/apps/main-site/src/components/shortcodes/authShortcodes.tsx`

**정의**:
```typescript
export const oauthLoginShortcode: ShortcodeDefinition = {
  name: 'oauth_login',
  component: ({ attributes }) => (
    <OAuthOnlyComponent
      redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
      title={attributes.title as string}
    />
  )
};
```

**지원 속성**:

| 속성명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `redirect_url` / `redirectUrl` | string | `/dashboard` | 로그인 성공 후 리다이렉트 URL |
| `title` | string | `소셜 로그인` | 제목 |

**비고**: 이메일 로그인 폼 없이 소셜 로그인 버튼만 표시

**사용 예시**:
```
[[oauth_login]]
[[oauth_login redirect_url="/welcome" title="간편 로그인"]]
```

**렌더링 컴포넌트**: `OAuthOnlyComponent` (동일 파일 내, `SocialLoginComponent`를 `showEmailLogin={false}`로 래핑)

---

### 8.2 파서 구현

#### 8.2.1 파서 경로
- **파일 위치**: `/home/sohae21/o4o-platform/packages/shortcodes/src/parser.ts`
- **클래스**: `DefaultShortcodeParser`
- **기본 인스턴스**: `defaultParser` (export됨)

#### 8.2.2 속성 추출 로직

**정규식 기반 파싱**:
```typescript
// Shortcode 매칭: [shortcode attrs]content[/shortcode] 또는 [shortcode attrs]
private shortcodeRegex = /\[(\w+)([^\]]*?)\](?:([\s\S]*?)\[\/\1\])?/g;

// 속성 파싱: name="value", name='value', name=value, name
private attrRegex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;
```

**속성 타입 자동 변환**:
1. **Boolean**: 값 없는 속성 → `true` (예: `enabled` → `{ enabled: true }`)
2. **Number**: 숫자 문자열 → `number` (예: `limit="10"` → `{ limit: 10 }`)
3. **Boolean 문자열**: `"true"` / `"false"` → `boolean`
4. **String**: 나머지는 문자열로 저장

**예시**:
```
[social_login redirect_url="/dashboard" show_email_login="false" providers="google,kakao"]
```

파싱 결과:
```typescript
{
  redirect_url: "/dashboard",        // string
  show_email_login: false,           // boolean
  providers: "google,kakao"          // string
}
```

#### 8.2.3 검증 규칙

**타입 정의** (`/home/sohae21/o4o-platform/packages/shortcodes/src/types.ts`):
```typescript
export interface ShortcodeDefinition {
  name: string;
  component: ShortcodeComponent;
  description?: string;
  defaultAttributes?: ShortcodeAttributes;
  attributes?: Record<string, ShortcodeAttributeDefinition>;
  validate?: (attributes: ShortcodeAttributes) => boolean;
}

export interface ShortcodeAttributeDefinition {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: any;
}
```

**현재 상태**:
- **검증 함수 미구현**: `social_login`, `login_form`, `oauth_login` 모두 `validate` 함수 없음
- **속성 정의 미구현**: `attributes` 스키마 정의 없음
- **기본값 미정의**: `defaultAttributes` 없음 (컴포넌트 props 기본값으로 대체)

**결과**: 잘못된 속성이 전달되어도 검증 없이 렌더링됨 (런타임 에러 가능성)

#### 8.2.4 에러 처리

**파서 수준**:
- **Unknown 속성**: 무시하고 파싱 (검증 없음)
- **형식 오류**: 정규식 매칭 실패 시 빈 배열 반환

**렌더러 수준**:
- **Unknown Shortcode**: `UnknownShortcodeComponent` 표시 (Main Site)
- **Render 에러**: `ErrorComponent` 표시 또는 에러 무시 (환경에 따라 다름)

---

### 8.3 렌더러 구현

#### 8.3.1 공통 렌더러 (Packages)

**파일 위치**: `/home/sohae21/o4o-platform/packages/shortcodes/src/renderer.ts`

**클래스**: `DefaultShortcodeRenderer`

**주요 메서드**:
1. `render(content: string, context?: any): ReactElement | null`
   - 콘텐츠 내 모든 shortcode 파싱 및 렌더링
   - 텍스트와 shortcode 혼합 콘텐츠 처리
   - Fragment로 래핑하여 반환

2. `renderShortcode(shortcode: ParsedShortcode, context?: any): ReactElement | null`
   - 단일 shortcode 렌더링
   - 속성 병합: `defaultAttributes` + 사용자 정의 속성
   - 검증 실행 (정의된 경우)
   - 컴포넌트 생성

**에러 처리**:
- Unknown shortcode: `console.warn` + `null` 반환
- 속성 검증 실패: `console.error` + `null` 반환
- 렌더링 에러: `try-catch` + `console.error` + `null` 반환

---

#### 8.3.2 Main Site 렌더러

**파일 위치**: `/home/sohae21/o4o-platform/apps/main-site/src/components/TemplateRenderer/blocks/ShortcodeBlock.tsx`

**컴포넌트**: `ShortcodeBlock`

**특징**:
- `@o4o/shortcodes`의 `ShortcodeRenderer` 컴포넌트 사용
- 커스텀 컴포넌트 제공:
  - `LoadingComponent`: Tailwind CSS + 애니메이션
  - `ErrorComponent`: 빨간색 알림 박스
  - `UnknownShortcodeComponent`: 회색 인라인 에러 표시
- **디버그 패널 포함** (개발 모드):
  - Shortcode 콘텐츠 표시
  - 등록된 shortcode 목록 표시 (window.__shortcodeRegistry)

**코드 예시**:
```tsx
<ShortcodeRenderer
  content={content}
  context={{ postId: settings?.postId }}
  LoadingComponent={LoadingComponent}
  ErrorComponent={ErrorComponent}
  UnknownShortcodeComponent={UnknownShortcodeComponent}
/>
```

---

#### 8.3.3 Admin Dashboard 렌더러

**파일 위치**: `/home/sohae21/o4o-platform/apps/admin-dashboard/src/components/shortcodes/ShortcodeRenderer.tsx`

**컴포넌트**: `ShortcodeRenderer`

**특징**:
- **독립 구현** (packages의 ShortcodeRenderer 미사용)
- 드롭쉬핑 전용 shortcode에 특화
- 인증 상태 확인 내장 (localStorage 토큰 + API 검증)
- 에러 타입별 아이콘 표시:
  - `auth_required`: 🔐
  - `permission_denied`: 🚫
  - `component_not_found`: 🔍
  - `network_error`: 🌐

**주요 차이점 (Main Site vs Admin Dashboard)**:

| 항목 | Main Site | Admin Dashboard |
|------|-----------|-----------------|
| 기반 클래스 | `@o4o/shortcodes` ShortcodeRenderer | 독립 구현 |
| 대상 shortcode | 로그인, 폼, 상품 등 범용 | 드롭쉬핑 대시보드 전용 |
| 인증 체크 | 없음 (컴포넌트 내부 처리) | 내장 (useEffect에서 토큰 검증) |
| Unknown 처리 | 회색 인라인 텍스트 | Alert 컴포넌트 (빨간색 박스) |
| 로딩 UI | 스피너 + 텍스트 | Loader2 아이콘 (lucide-react) |
| 디버그 모드 | 있음 (등록된 shortcode 표시) | 없음 |

**코드 비교**:

*Main Site*:
```tsx
// @o4o/shortcodes의 ShortcodeRenderer 사용
<ShortcodeRenderer content={content} ... />
```

*Admin Dashboard*:
```tsx
// 수동으로 Component Map에서 조회 후 렌더링
const Component = COMPONENT_MAP[shortcodeConfig.component];
return <Component type="supplier" {...attributes} />;
```

---

### 8.4 Shortcode 등록 시스템

#### 8.4.1 레지스트리 구조

**파일 위치**: `/home/sohae21/o4o-platform/packages/shortcodes/src/registry.ts`

**클래스**: `DefaultShortcodeRegistry`

**저장소**: `Map<string, ShortcodeDefinition>`

**주요 메서드**:
- `register(definition: ShortcodeDefinition)`: Shortcode 등록
- `registerLazy(definition: LazyShortcodeDefinition)`: Lazy loading 지원
- `get(name: string)`: Shortcode 조회
- `has(name: string)`: 존재 여부 확인
- `getAll()`: 모든 shortcode 반환

**글로벌 인스턴스**: `globalRegistry` (export됨)

#### 8.4.2 Main Site 등록 흐름

**파일 위치**: `/home/sohae21/o4o-platform/apps/main-site/src/main.tsx`

**등록 시점**: React 앱 초기화 전 (비동기)

**방식**: Lazy Loading
```typescript
await registerShortcodesFromModule(
  'authShortcodes',
  () => import('./components/shortcodes/authShortcodes')
);
```

**프로세스**:
1. `authShortcodes` 배열 import
2. 각 shortcode 정의에 대해 `registerLazyShortcode()` 호출
3. 컴포넌트는 사용 시점에 lazy load (React.lazy)

**등록된 Shortcode**:
- `social_login`
- `login_form`
- `oauth_login`
- `find_id`
- `find_password`
- (기타 form, dropshipping shortcodes)

**디버그 모드**:
```typescript
if (import.meta.env.DEV) {
  (window as any).__shortcodeRegistry = globalRegistry;
}
```

---

### 8.5 발견된 이슈

#### 8.5.1 속성 처리 불일치

**문제 1: 속성명 Snake Case vs Camel Case**

Main Site 컴포넌트가 두 가지 형식 모두 지원:
```typescript
redirectUrl={attributes.redirect_url as string || attributes.redirectUrl as string}
```

**원인**:
- Shortcode는 `redirect_url` (snake_case) 사용 권장
- React props는 `redirectUrl` (camelCase) 선호
- 호환성을 위해 둘 다 허용

**일관성 부족**:
- 다른 속성은 하나만 지원 (예: `show_email_login`만 지원, `showEmailLogin` 미지원)
- 문서화 부족으로 사용자 혼란 가능

**권장 사항**:
- 속성명 통일 (snake_case 권장)
- 또는 모든 속성에 대해 둘 다 지원 + 문서화

---

**문제 2: 속성 타입 검증 없음**

예상:
```
[[social_login providers="invalid,providers"]]
```

실제: 에러 없이 렌더링 → 백엔드에서 필터링되지 않은 제공자는 무시됨

**권장 사항**:
```typescript
export const socialLoginShortcode: ShortcodeDefinition = {
  name: 'social_login',
  attributes: {
    redirect_url: { type: 'string', default: '/dashboard' },
    show_email_login: { type: 'boolean', default: true },
    providers: { type: 'string' },
    // ...
  },
  validate: (attrs) => {
    if (attrs.providers) {
      const validProviders = ['google', 'kakao', 'naver'];
      const requested = (attrs.providers as string).split(',');
      return requested.every(p => validProviders.includes(p.trim()));
    }
    return true;
  },
  // ...
};
```

---

#### 8.5.2 렌더러 간 동작 차이

**Main Site vs Admin Dashboard 비교**:

| 동작 | Main Site | Admin Dashboard |
|------|-----------|-----------------|
| Shortcode 파싱 | `@o4o/shortcodes` 파서 사용 | 직접 구현 (config 기반) |
| 렌더링 방식 | `ShortcodeRenderer` 컴포넌트 | 수동 Component Map 조회 |
| Unknown 처리 | 회색 인라인 텍스트 | 빨간색 Alert 박스 |
| 로딩 UI | 스피너 + "Loading shortcode..." | Loader2 아이콘 |
| 에러 UI | 빨간색 박스 + 에러 메시지 | 타입별 아이콘 + Alert |
| 인증 체크 | 없음 | 있음 (localStorage 토큰) |
| 디버그 정보 | 등록된 shortcode 목록 표시 | 없음 |

**일관성 문제**:
- 같은 shortcode라도 환경에 따라 다른 UI 제공
- Admin은 packages의 공통 렌더러를 사용하지 않음 (독립 구현)

**권장 사항**:
1. Admin Dashboard도 `@o4o/shortcodes` ShortcodeRenderer 사용
2. 또는 공통 UI 컴포넌트 추출 (Loading, Error, Unknown)
3. 드롭쉬핑 전용 기능은 플러그인 형태로 확장

---

#### 8.5.3 검증 누락

**현재 상태**:
- `validate` 함수 미구현
- `attributes` 스키마 정의 없음
- 잘못된 속성값도 그대로 전달됨

**문제 시나리오**:
```
[[social_login show_email_login="yes"]]
```
→ `"yes"`는 문자열이므로 truthy → 의도와 다르게 동작

**해결 방법**:
1. **파서 수준 검증**: 속성 타입 정의 후 파싱 시 검증
2. **렌더러 수준 검증**: `validate` 함수 구현
3. **컴포넌트 수준 검증**: Props validation (PropTypes 또는 TypeScript)

---

#### 8.5.4 에러 메시지 불일치

**Main Site ShortcodeBlock**:
```tsx
<UnknownShortcodeComponent shortcode={shortcode} />
// 출력: "[shortcode_name] not found"
```

**Packages ShortcodeRenderer**:
```tsx
<span style={{ color: '#999', fontStyle: 'italic' }}>
  [Unknown shortcode: {shortcode.name}]
</span>
```

**Admin Dashboard**:
```tsx
<Alert variant="destructive">
  Shortcode [name] not found
  Available shortcodes: ...
</Alert>
```

**권장 사항**: 통일된 에러 메시지 포맷

---

### 8.6 개선 제안

#### 8.6.1 우선순위 1 (Critical)

**1. 속성 스키마 정의 및 검증**

모든 인증 shortcode에 대해:
```typescript
export const socialLoginShortcode: ShortcodeDefinition = {
  name: 'social_login',
  attributes: {
    redirect_url: { type: 'string', default: '/dashboard' },
    show_email_login: { type: 'boolean', default: true },
    title: { type: 'string', default: '로그인' },
    subtitle: { type: 'string', default: '계정에 접속하여 서비스를 이용하세요' },
    providers: { type: 'string' }, // comma-separated
    showTestPanel: { type: 'string' | 'boolean', default: 'env:dev' }
  },
  defaultAttributes: {
    redirect_url: '/dashboard',
    show_email_login: true,
    title: '로그인',
    subtitle: '계정에 접속하여 서비스를 이용하세요'
  },
  validate: (attrs) => {
    // Validate providers if provided
    if (attrs.providers) {
      const validProviders = ['google', 'kakao', 'naver'];
      const requested = String(attrs.providers).split(',').map(p => p.trim());
      return requested.every(p => validProviders.includes(p));
    }
    return true;
  },
  component: ...
};
```

**2. 속성명 통일**

- **권장**: Snake case (`redirect_url`, `show_email_login`)
- 레거시 호환성: Camel case도 허용하되, 내부적으로 변환
- 문서 업데이트

---

#### 8.6.2 우선순위 2 (High)

**3. 렌더러 통일**

Admin Dashboard가 `@o4o/shortcodes` ShortcodeRenderer 사용하도록 리팩토링:

```tsx
// Admin Dashboard ShortcodeRenderer.tsx
import { ShortcodeRenderer as BaseRenderer } from '@o4o/shortcodes';
import { customLoadingComponent, customErrorComponent } from './components';

export const ShortcodeRenderer = ({ name, attributes, content }) => {
  // 인증 체크는 HOC 또는 미들웨어로 분리
  return (
    <BaseRenderer
      content={`[${name} ${serializeAttrs(attributes)}]${content}[/${name}]`}
      LoadingComponent={customLoadingComponent}
      ErrorComponent={customErrorComponent}
    />
  );
};
```

**4. 에러 처리 표준화**

공통 에러 컴포넌트 정의:
```tsx
// packages/shortcodes/src/components/ErrorComponents.tsx
export const StandardUnknownShortcode = ({ shortcode }) => (
  <div className="shortcode-error unknown">
    <span className="icon">🔍</span>
    <span>Unknown shortcode: <code>{shortcode.name}</code></span>
  </div>
);

export const StandardRenderError = ({ error }) => (
  <div className="shortcode-error render">
    <span className="icon">⚠️</span>
    <span>Render error: {error.message}</span>
  </div>
);
```

---

#### 8.6.3 우선순위 3 (Medium)

**5. 문서화 강화**

`/docs/manual/shortcode-list-table.md` 업데이트:
- 모든 속성의 타입, 기본값, 유효한 값 범위 명시
- 사용 예시 추가
- 에러 시나리오 및 해결 방법

**6. TypeScript 타입 개선**

```typescript
// packages/shortcodes/src/auth/types.ts
export interface SocialLoginAttributes {
  redirect_url?: string;
  redirectUrl?: string; // Deprecated: use redirect_url
  show_email_login?: boolean;
  title?: string;
  subtitle?: string;
  providers?: 'google' | 'kakao' | 'naver' | string; // comma-separated
  showTestPanel?: boolean | 'env:dev';
}

export const socialLoginShortcode: ShortcodeDefinition<SocialLoginAttributes> = {
  // ...
};
```

**7. 테스트 추가**

```typescript
// packages/shortcodes/src/auth/__tests__/SocialLogin.test.tsx
describe('SocialLogin Shortcode', () => {
  it('parses attributes correctly', () => {
    const parsed = defaultParser.parse(
      '[[social_login redirect_url="/test" show_email_login="false"]]'
    );
    expect(parsed[0].attributes).toEqual({
      redirect_url: '/test',
      show_email_login: false
    });
  });

  it('validates providers attribute', () => {
    const definition = socialLoginShortcode;
    expect(definition.validate?.({ providers: 'google,kakao' })).toBe(true);
    expect(definition.validate?.({ providers: 'invalid' })).toBe(false);
  });

  // ...
});
```

---

### 8.7 참고 자료

**관련 파일**:
- Parser: `/home/sohae21/o4o-platform/packages/shortcodes/src/parser.ts`
- Renderer (공통): `/home/sohae21/o4o-platform/packages/shortcodes/src/renderer.ts`
- Registry: `/home/sohae21/o4o-platform/packages/shortcodes/src/registry.ts`
- Main Site Shortcodes: `/home/sohae21/o4o-platform/apps/main-site/src/components/shortcodes/authShortcodes.tsx`
- Main Site Renderer: `/home/sohae21/o4o-platform/apps/main-site/src/components/TemplateRenderer/blocks/ShortcodeBlock.tsx`
- Admin Dashboard Renderer: `/home/sohae21/o4o-platform/apps/admin-dashboard/src/components/shortcodes/ShortcodeRenderer.tsx`
- Main Site 등록: `/home/sohae21/o4o-platform/apps/main-site/src/main.tsx`
- 문서: `/home/sohae21/o4o-platform/docs/manual/shortcode-list-table.md`

**기술 스택**:
- Parser: 정규식 기반 (WordPress 스타일)
- Renderer: React Fragment + createElement
- Registry: Map 기반 전역 저장소
- Lazy Loading: React.lazy + dynamic import

---

**조사 완료**: 2025-11-08
