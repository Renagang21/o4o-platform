# OAuth 설정 가이드

## 개요

회원가입 페이지에서 소셜 로그인(Google, Naver, Kakao)을 사용하려면 OAuth 설정이 필요합니다.

## 설정 방법

### 옵션 1: 환경변수 설정 (권장 - 개발/스테이징)

API 서버의 `.env` 파일에 OAuth credential을 추가:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Kakao OAuth
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Naver OAuth
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

**적용 방법:**

```bash
# API 서버 SSH 접속
ssh o4o-api

# .env 파일 수정
cd /home/ubuntu/o4o-platform/apps/api-server
nano .env

# 환경변수 추가 후 저장 (Ctrl+O, Enter, Ctrl+X)

# PM2 재시작으로 적용
npx pm2 restart o4o-api-server

# 로그 확인
npx pm2 logs o4o-api-server --lines 20
```

**확인할 로그:**
```
"Using OAuth settings from environment variables"
"Google OAuth strategy configured"
"Naver OAuth strategy configured"
"Kakao OAuth strategy configured"
```

### 옵션 2: Admin Dashboard 설정 (권장 - 프로덕션)

1. Admin Dashboard 접속: `https://admin.neture.co.kr`
2. **Settings → OAuth Configuration** 메뉴
3. 각 Provider 활성화 및 Credential 입력:
   - **Enable** 체크박스 선택
   - **Client ID** 입력
   - **Client Secret** 입력 (자동 암호화됨)
   - **Callback URL** 자동 설정됨
4. **Save** 버튼 클릭
5. API 서버 자동 reload (또는 수동 재시작)

## OAuth Credential 발급 방법

### 1. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services → Credentials** 이동
4. **Create Credentials → OAuth 2.0 Client ID** 선택
5. Application type: **Web application**
6. Authorized redirect URIs 추가:
   ```
   https://neture.co.kr/api/v1/social/google/callback
   https://api.neture.co.kr/api/v1/social/google/callback
   ```
7. Client ID와 Client Secret 복사

### 2. Naver OAuth

1. [네이버 개발자센터](https://developers.naver.com/apps) 접속
2. **애플리케이션 등록** 클릭
3. 애플리케이션 정보 입력:
   - 애플리케이션 이름: `O4O Platform`
   - 사용 API: **네이버 로그인**
4. 서비스 URL 및 Callback URL 설정:
   ```
   서비스 URL: https://neture.co.kr
   Callback URL: https://neture.co.kr/api/v1/social/naver/callback
   ```
5. 제공 정보 선택: **이메일, 이름**
6. Client ID와 Client Secret 복사

### 3. Kakao OAuth

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션 → 애플리케이션 추가하기**
3. 앱 정보 입력
4. **플랫폼 → Web 플랫폼 등록**:
   ```
   사이트 도메인: https://neture.co.kr
   ```
5. **제품 설정 → 카카오 로그인** 활성화
6. **Redirect URI 등록**:
   ```
   https://neture.co.kr/api/v1/social/kakao/callback
   ```
7. **동의항목 설정**: 이메일, 닉네임 필수 동의
8. **앱 키** 페이지에서 REST API 키 복사 (Client ID로 사용)
9. **보안** 페이지에서 Client Secret 발급 (선택사항)

## 우선순위

OAuth 설정 로드 우선순위:

1. **Database Settings** (Admin Dashboard에서 설정)
2. **Environment Variables** (`.env` 파일)
3. **Default** (모두 disabled)

## 테스트

### 로컬 테스트

```bash
# OAuth 엔드포인트 테스트
curl https://api.neture.co.kr/api/v1/social/naver

# 예상 응답 (strategy 등록 전):
# {"success":false,"error":"Internal server error","code":"INTERNAL_ERROR"}
# 로그: "Unknown authentication strategy \"naver\""

# 예상 응답 (strategy 등록 후):
# 302 Redirect to Naver OAuth page
```

### 브라우저 테스트

1. `https://neture.co.kr/signup` 접속
2. 소셜 로그인 버튼 클릭 (Google/Naver/Kakao)
3. OAuth provider 로그인 페이지로 리다이렉트 확인
4. 로그인 후 `/auth/callback` 페이지로 돌아옴
5. 성공 시 홈페이지로 리다이렉트

## 문제 해결

### 1. "Unknown authentication strategy" 에러

**원인:** Passport strategy가 등록되지 않음

**해결:**
- 환경변수 설정 확인
- PM2 재시작: `npx pm2 restart o4o-api-server`
- 로그 확인: `npx pm2 logs --lines 50`

### 2. 404 에러

**원인:** 라우트 경로 불일치

**확인:**
- Signup 페이지가 `/api/v1/social/{provider}` 사용하는지 확인
- Nginx 프록시 설정 확인

### 3. OAuth 리다이렉트 실패

**원인:** Callback URL 불일치

**해결:**
- OAuth provider 콘솔에서 Callback URL 확인:
  - `https://neture.co.kr/api/v1/social/{provider}/callback`
- `.env` 파일의 `FRONTEND_URL` 확인

## 참고

- OAuth 설정 파일: `apps/api-server/src/config/passportDynamic.ts`
- 라우트 설정: `apps/api-server/src/routes/social-auth.ts`
- 환경변수 예시: `apps/api-server/.env.example`

## 보안 주의사항

1. **Client Secret 보호**
   - `.env` 파일을 git에 커밋하지 마세요
   - Production에서는 환경변수 또는 암호화된 DB 사용

2. **Callback URL 화이트리스트**
   - OAuth provider 콘솔에서 정확한 Callback URL만 등록
   - 와일드카드(`*`) 사용 금지

3. **HTTPS 필수**
   - OAuth는 반드시 HTTPS에서만 사용
   - 로컬 개발 시 localhost 예외 허용

## 현재 상태 (2025-01-08)

- ✅ 환경변수 폴백 구현 완료
- ⏳ OAuth Credential 미설정 (환경변수 주석 처리됨)
- ⏳ Admin OAuth 설정 페이지 구현 필요

**다음 단계:** 위 가이드를 따라 OAuth Credential을 발급받아 환경변수에 설정하세요.
