# 🔐 O4O Platform 인증 시스템 문서

## 📋 개요

O4O Platform의 인증 시스템은 JWT 기반 토큰 인증, 세션 관리, OAuth 소셜 로그인을 포함한 완전한 인증 솔루션을 제공합니다.

---

## 📚 문서 구조

### 기본 인증 시스템

1. **[인증 통합 가이드](./authentication-integration.md)**
   - 전체 인증 시스템 아키텍처
   - API 엔드포인트 명세
   - 클라이언트 통합 방법
   - 추천: 처음 읽어야 할 문서

2. **[리프레시 토큰 구현](./refresh-token-implementation.md)**
   - 액세스/리프레시 토큰 메커니즘
   - 토큰 갱신 프로세스
   - 보안 고려사항

3. **[세션 관리 구현](./session-management-implementation.md)**
   - 세션 생성 및 관리
   - 세션 만료 처리
   - 멀티 디바이스 세션

### 보안 기능

4. **[로그인 보안 구현](./login-security-implementation.md)**
   - 로그인 시도 제한 (Rate Limiting)
   - IP 기반 제어
   - 계정 잠금 정책
   - 보안 이벤트 로깅

5. **[비밀번호 재설정 구현](./password-reset-implementation.md)**
   - 비밀번호 재설정 플로우
   - 이메일 인증
   - 보안 토큰 관리

### OAuth 소셜 로그인

6. **[OAuth 통합 가이드](./oauth-integration-guide.md)**
   - Google, GitHub, Kakao 로그인
   - OAuth 플로우 구현
   - 사용자 계정 연동
   - 프론트엔드 예제: [social-auth-frontend-example.tsx](./social-auth-frontend-example.tsx)

### 크로스 앱 기능

7. **[크로스 앱 세션 동기화](./cross-app-session-sync.md)**
   - Admin Dashboard ↔ Main Site 세션 공유
   - 통합 로그인/로그아웃
   - 세션 상태 동기화

---

## 🚀 빠른 시작

### 1. 기본 로그인/로그아웃 구현

```typescript
// 로그인
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken, refreshToken } = await response.json();

// 토큰 저장
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// 로그아웃
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 2. 토큰 자동 갱신

```typescript
// 액세스 토큰 갱신
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const { accessToken } = await response.json();
  localStorage.setItem('accessToken', accessToken);

  return accessToken;
};
```

### 3. OAuth 소셜 로그인

```typescript
// Google 로그인
window.location.href = '/api/auth/google';

// 콜백 처리
// GET /api/auth/google/callback?code=... 에서 자동 처리
```

---

## 🏗️ 아키텍처

### 인증 흐름

```
사용자 로그인
    ↓
이메일/비밀번호 검증
    ↓
액세스 토큰 (15분) + 리프레시 토큰 (7일) 발급
    ↓
클라이언트가 토큰 저장
    ↓
API 요청시 액세스 토큰 사용
    ↓
토큰 만료시 리프레시 토큰으로 갱신
    ↓
리프레시 토큰 만료시 재로그인 필요
```

### 보안 레이어

1. **Rate Limiting**: 로그인 시도 제한
2. **IP Tracking**: 의심스러운 IP 차단
3. **Session Management**: 멀티 디바이스 세션 관리
4. **Password Security**: bcrypt 해싱, 복잡도 검증
5. **Token Security**: JWT 서명 검증, 토큰 블랙리스트

---

## 📖 주요 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신

### OAuth
- `GET /api/auth/google` - Google 로그인 시작
- `GET /api/auth/google/callback` - Google 콜백
- `GET /api/auth/github` - GitHub 로그인 시작
- `GET /api/auth/github/callback` - GitHub 콜백
- `GET /api/auth/kakao` - Kakao 로그인 시작
- `GET /api/auth/kakao/callback` - Kakao 콜백

### 비밀번호 관리
- `POST /api/auth/password/forgot` - 비밀번호 재설정 요청
- `POST /api/auth/password/reset` - 비밀번호 재설정 실행

### 세션 관리
- `GET /api/auth/sessions` - 활성 세션 목록
- `DELETE /api/auth/sessions/:sessionId` - 특정 세션 종료
- `DELETE /api/auth/sessions/all` - 모든 세션 종료

---

## 🔧 환경 설정

### 필수 환경변수

```bash
# JWT 토큰
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback

# OAuth - Kakao
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_CALLBACK_URL=http://localhost:3001/api/auth/kakao/callback

# 이메일 (비밀번호 재설정)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

상세 설정: [docs/setup/API_SERVER_ENV_REQUIREMENTS.md](../setup/API_SERVER_ENV_REQUIREMENTS.md)

---

## 📊 데이터베이스 스키마

### users 테이블
```sql
- id: UUID (Primary Key)
- email: VARCHAR (Unique)
- password: VARCHAR (bcrypt hashed)
- role: ENUM (admin, user)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### sessions 테이블
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → users)
- refresh_token: VARCHAR
- ip_address: VARCHAR
- user_agent: VARCHAR
- expires_at: TIMESTAMP
- created_at: TIMESTAMP
```

### oauth_accounts 테이블
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → users)
- provider: ENUM (google, github, kakao)
- provider_user_id: VARCHAR
- created_at: TIMESTAMP
```

---

## 🧪 테스트

### 로컬 테스트

```bash
# API 서버 실행
cd apps/api-server
pnpm run dev

# 로그인 테스트
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 토큰 갱신 테스트
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token"}'
```

---

## 🚨 트러블슈팅

### 일반적인 문제

**1. 토큰 만료 오류**
- 액세스 토큰은 15분마다 갱신 필요
- 리프레시 토큰이 만료되면 재로그인 필요

**2. OAuth 콜백 실패**
- 환경변수의 CALLBACK_URL 확인
- OAuth 앱 설정에서 허용된 리디렉션 URI 확인

**3. 세션 동기화 안 됨**
- 쿠키 도메인 설정 확인 (.neture.co.kr)
- CORS 설정 확인

---

## 📝 참고사항

- **토큰 보안**: localStorage 대신 httpOnly 쿠키 사용 권장 (XSS 방어)
- **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용
- **Rate Limiting**: 로그인 시도는 IP당 5회/15분 제한
- **세션 관리**: 의심스러운 활동 감지시 세션 자동 종료

---

## 🔮 향후 개선사항

- [ ] 2FA (Two-Factor Authentication)
- [ ] 생체 인증 지원
- [ ] SSO (Single Sign-On)
- [ ] 세션 활동 알림
- [ ] 비밀번호 정책 강화

---

**최종 업데이트**: 2025-10-08
**인증 시스템 버전**: v1.0
