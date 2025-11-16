# 인증 시스템 마이그레이션 Quick Start

> 전체 가이드: [AUTH_MIGRATION_GUIDE.md](./AUTH_MIGRATION_GUIDE.md)

## 즉시 시작 가능한 작업 (Phase 1 - 1일)

### 목표
하드코딩된 API 경로 제거 및 보안 위험 해소

### 수정 파일 목록 (3개)

#### 1. Admin - ForgotPassword.tsx
**파일:** `apps/admin-dashboard/src/pages/auth/ForgotPassword.tsx`

**Before (Line 17-18):**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';
const response = await fetch(`${apiUrl}/auth/v2/forgot-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
```

**After:**
```typescript
import { authClient } from '@o4o/auth-client';

const response = await authClient.api.post('/auth/v2/forgot-password', { email });
```

**변경 사항:**
1. Line 1에 import 추가: `import { authClient } from '@o4o/auth-client';`
2. Line 17-18의 `apiUrl` 선언 제거
3. `fetch()` 호출을 `authClient.api.post()` 로 교체
4. Line 30-42의 응답 처리 수정:
   ```typescript
   if (response.data.success) {
     setSuccess(true);
     toast.success('비밀번호 재설정 링크가 전송되었습니다.');
   } else {
     throw new Error(response.data.message || '요청 실패');
   }
   ```

---

#### 2. Admin - ResetPassword.tsx
**파일:** `apps/admin-dashboard/src/pages/auth/ResetPassword.tsx`

**Before (Line 62-63):**
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';
const response = await fetch(`${apiUrl}/auth/v2/reset-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, password }),
});
```

**After:**
```typescript
import { authClient } from '@o4o/auth-client';

const response = await authClient.api.post('/auth/v2/reset-password', {
  token,
  password
});
```

**변경 사항:**
1. Line 1에 import 추가: `import { authClient } from '@o4o/auth-client';`
2. Line 62-63의 `apiUrl` 선언 제거
3. `fetch()` 호출을 `authClient.api.post()` 로 교체
4. Line 75-87의 응답 처리 수정:
   ```typescript
   if (response.data.success) {
     setSuccess(true);
     toast.success('비밀번호가 성공적으로 변경되었습니다.');
     setTimeout(() => navigate('/login'), 3000);
   } else {
     throw new Error(response.data.message || '비밀번호 재설정 실패');
   }
   ```

---

#### 3. Main Site - Signup.tsx
**파일:** `apps/main-site/src/pages/auth/Signup.tsx`

**Before (Line 28, 76-80):**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

// 회원가입 처리
const response = await axios.post(`${API_URL}/api/v1/auth/signup`, {
  email,
  password,
  name,
  userType,
  businessInfo
});

// 토큰 저장
const { token, user } = response.data;
localStorage.setItem('accessToken', token);
localStorage.setItem('authToken', token);
localStorage.setItem('token', token);
```

**After:**
```typescript
import { cookieAuthClient } from '@o4o/auth-client';

// 회원가입 처리
const response = await cookieAuthClient.register({
  email,
  password,
  name,
  userType,
  businessInfo
});

// 쿠키에 자동 저장됨 (localStorage 불필요)
const { user } = response.data;
```

**변경 사항:**
1. Line 1에 import 추가: `import { cookieAuthClient } from '@o4o/auth-client';`
2. Line 28의 `API_URL` 선언 제거
3. Line 76-80의 `axios.post()` → `cookieAuthClient.register()` 교체
4. Line 88-90의 localStorage 저장 코드 **제거** (쿠키 자동 저장)
5. 소셜 로그인 부분도 수정 (Line 334, 343, 352):
   ```typescript
   // Before
   window.location.href = `${API_URL}/api/v1/social/${provider}`;

   // After
   import { authClient } from '@o4o/auth-client';
   const baseUrl = authClient.getBaseUrl();
   window.location.href = `${baseUrl}/social/${provider}`;
   ```

---

## 빠른 테스트 가이드

### 1. 빌드 테스트
```bash
cd /home/sohae21/o4o-platform

# Admin 빌드
cd apps/admin-dashboard
pnpm build

# Main Site 빌드
cd ../main-site
pnpm build
```

### 2. 로컬 테스트
```bash
# Admin Dashboard
cd apps/admin-dashboard
pnpm dev

# 브라우저: http://localhost:5173/login
# 1. "비밀번호 찾기" 클릭
# 2. 이메일 입력 후 제출
# 3. Network 탭에서 /auth/v2/forgot-password 요청 확인
```

```bash
# Main Site
cd apps/main-site
pnpm dev

# 브라우저: http://localhost:5174/signup
# 1. 회원가입 정보 입력
# 2. 제출
# 3. Network 탭에서 /auth/cookie/register 요청 확인
# 4. Cookies 탭에서 accessToken, refreshToken 확인
```

### 3. 타입 체크
```bash
# Admin
cd apps/admin-dashboard
npx tsc --noEmit

# Main Site
cd apps/main-site
npx tsc --noEmit
```

---

## 배포 가이드

### 1. 커밋
```bash
cd /home/sohae21/o4o-platform

git add apps/admin-dashboard/src/pages/auth/ForgotPassword.tsx
git add apps/admin-dashboard/src/pages/auth/ResetPassword.tsx
git add apps/main-site/src/pages/auth/Signup.tsx

git commit -m "refactor(auth): Replace hardcoded API calls with authClient

Phase 1: Remove hardcoded API URLs and direct fetch/axios usage

Changes:
- Admin ForgotPassword: Use authClient.api.post
- Admin ResetPassword: Use authClient.api.post
- Main Site Signup: Use cookieAuthClient.register

Benefits:
- Remove environment variable direct usage
- Centralized API client management
- Better error handling
- Improved type safety

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

### 2. Admin Dashboard 배포
```bash
./scripts/deploy-admin-manual.sh
```

### 3. Main Site 배포
```bash
ssh o4o-web "cd /home/ubuntu/o4o-platform && ./scripts/deploy-main-site.sh"
```

### 4. 배포 확인
```bash
# Admin 버전 확인
curl -s https://admin.neture.co.kr/version.json

# Main Site 버전 확인
curl -s https://neture.co.kr/version.json
```

---

## 배포 후 테스트 체크리스트

### Admin Dashboard (https://admin.neture.co.kr)

**비밀번호 찾기**
- [ ] 로그인 페이지에서 "비밀번호 찾기" 클릭
- [ ] 존재하는 이메일 입력 후 제출
- [ ] "비밀번호 재설정 링크가 전송되었습니다" 메시지 확인
- [ ] 이메일 수신 확인
- [ ] 이메일의 링크 클릭하여 재설정 페이지 이동

**비밀번호 재설정**
- [ ] 새 비밀번호 입력 (8자 이상, 대소문자, 숫자, 특수문자)
- [ ] 비밀번호 확인 입력
- [ ] "비밀번호가 성공적으로 변경되었습니다" 메시지 확인
- [ ] 3초 후 로그인 페이지로 자동 이동
- [ ] 새 비밀번호로 로그인 성공

### Main Site (https://neture.co.kr)

**회원가입**
- [ ] 회원가입 페이지 이동
- [ ] 이메일, 비밀번호, 이름, 사용자 유형 입력
- [ ] 제출
- [ ] "회원가입이 완료되었습니다" 메시지 확인
- [ ] DevTools → Application → Cookies에서 확인:
  - [ ] accessToken (HttpOnly: ✓, Secure: ✓, SameSite: Lax)
  - [ ] refreshToken (HttpOnly: ✓, Secure: ✓, SameSite: Lax)
- [ ] 자동 로그인 확인
- [ ] localStorage에 토큰 없음 확인 (쿠키만 사용)

**소셜 로그인**
- [ ] Google 로그인 클릭
- [ ] OAuth 페이지로 리다이렉트 확인
- [ ] 로그인 후 Main Site로 복귀
- [ ] 쿠키 설정 확인

---

## 문제 해결 (Troubleshooting)

### 빌드 에러: "Cannot find module '@o4o/auth-client'"

**원인:** 패키지가 빌드되지 않음

**해결:**
```bash
cd /home/sohae21/o4o-platform
pnpm run build:auth-client
```

### 런타임 에러: "authClient.api.post is not a function"

**원인:** authClient import 오류

**확인:**
```typescript
// ✅ 올바른 import
import { authClient } from '@o4o/auth-client';

// ❌ 잘못된 import
import authClient from '@o4o/auth-client';
```

### CORS 에러: "Access-Control-Allow-Origin"

**원인:** API 서버 CORS 설정

**해결:**
```typescript
// apps/api-server/src/main.ts
app.use(cors({
  origin: [
    'https://admin.neture.co.kr',
    'https://neture.co.kr',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}));
```

### 쿠키가 설정되지 않음

**원인:** `withCredentials` 미설정

**확인:**
```typescript
// CookieAuthClient는 자동으로 설정
// cookieAuthClient.api는 withCredentials: true
```

**브라우저 확인:**
```javascript
// DevTools Console
document.cookie
// 결과에 accessToken, refreshToken이 없어야 함 (HttpOnly)
```

---

## 롤백 절차

### 문제 발견 시

1. **즉시 롤백**
```bash
cd /home/sohae21/o4o-platform
git revert HEAD
git push origin main
```

2. **재배포**
```bash
./scripts/deploy-admin-manual.sh
ssh o4o-web "./scripts/deploy-main-site.sh"
```

3. **확인**
```bash
# 이전 버전으로 복구 확인
curl -s https://admin.neture.co.kr/version.json
```

---

## 다음 단계 (Phase 2 - 1주)

Phase 1 완료 후 다음 작업:

1. **레거시 API 클라이언트 Deprecated 표시**
   - `apps/admin-dashboard/src/services/api.ts`
   - `apps/main-site/src/services/api.ts`

2. **모든 API 호출 마이그레이션**
   - Users API
   - Posts API
   - Products API
   - 기타 도메인 API

3. **테스트 추가**
   - 단위 테스트
   - 통합 테스트
   - E2E 테스트

자세한 내용은 [AUTH_MIGRATION_GUIDE.md](./AUTH_MIGRATION_GUIDE.md) 참고

---

## 지원

**문의:**
- GitHub Issues: https://github.com/Renagang21/o4o-platform/issues
- 문서: `/docs/AUTH_MIGRATION_GUIDE.md`

**긴급 문제:**
- 롤백 절차 따름
- 로그 확인: `apps/api-server/logs/error.log`
- Sentry 에러 모니터링
