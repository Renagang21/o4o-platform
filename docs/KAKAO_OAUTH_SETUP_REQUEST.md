# 🔧 O4O Platform — Kakao 소셜 로그인 설정 수정 요청서 (PostgreSQL 버전)

## 1️⃣ 목적 (Goal)

* 현재 WordPress 기반(`cosmosfarm_members_social_login_callback_kakao`) 방식에서
  O4O 플랫폼의 **직접 구현된 OAuth 2.0 인증 구조**로 완전히 전환
* 카카오 OAuth Redirect URI 불일치 문제를 해소하고
  **`https://neture.co.kr/api/v1/social/kakao/callback`** 형태로 통합
* 로그인 후 세션/토큰 발급이 PostgreSQL 기반 사용자 테이블(`users`)과 연동되도록 정비

---

## 2️⃣ 현재 상태 (Current)

| 구분 | 시스템 | Redirect URI | 비고 |
|------|--------|--------------|------|
| A. 기존 | `https://thedang.co.kr/?action=cosmosfarm_members_social_login_callback_kakao` | WordPress + Cosmosfarm 플러그인 구조 | O4O와 완전히 별도 |
| B. O4O 현재 | `https://neture.co.kr/api/v1/social/kakao/callback` | Node.js + Express + PostgreSQL 기반 API 서버 | 앱 설정 미등록 시 `invalid_redirect_uri` 오류 발생 |

**현재 구현된 OAuth 경로:**
- OAuth 로그인 시작: `/api/v1/social/kakao`
- OAuth Callback: `/api/v1/social/kakao/callback`
- 상태 확인: `/api/v1/social/status`

---

## 3️⃣ 수정 목표 (Target)

| 항목 | 목표 설정 |
|------|----------|
| Kakao 개발자 콘솔 | O4O 전용 앱 등록 또는 기존 앱에 Redirect URI 추가 |
| Redirect URI | `https://neture.co.kr/api/v1/social/kakao/callback` |
| 허용 도메인 | `https://neture.co.kr`, `https://admin.neture.co.kr`, `https://api.neture.co.kr` |
| Client ID / Secret | O4O 전용으로 등록 |
| 서버 환경 변수 | `.env` 파일 내에 아래 값 추가/갱신 |

```bash
KAKAO_CLIENT_ID=발급받은값
KAKAO_CLIENT_SECRET=발급받은값
FRONTEND_URL=https://neture.co.kr
```

| 로그인 흐름 | `/api/v1/social/kakao → 카카오 OAuth → /api/v1/social/kakao/callback` 로 일원화 |
| 데이터 저장 | PostgreSQL의 `users` 테이블에 통합 저장 |

---

## 4️⃣ 수행 절차 (Procedure)

### Step 1. Kakao Developers 설정

1. [https://developers.kakao.com](https://developers.kakao.com) 접속
2. "내 애플리케이션" → O4O용 앱 선택 또는 신규 생성
3. **플랫폼 → Web 플랫폼 추가**

```
https://neture.co.kr
https://admin.neture.co.kr
https://api.neture.co.kr
```

4. **Redirect URI 등록**

```
https://neture.co.kr/api/v1/social/kakao/callback
https://api.neture.co.kr/api/v1/social/kakao/callback
```

5. **카카오 로그인 활성화**
   - 제품 설정 → 카카오 로그인 → 활성화
   - 동의 항목 설정: 이메일(필수), 닉네임(선택)

6. REST API 키(Client ID), Client Secret 확인
   - 앱 키 → REST API 키 복사
   - 보안 → Client Secret 발급

---

### Step 2. 서버 환경 구성

O4O API 서버 `.env` 파일 갱신:

```bash
# SSH 접속
ssh o4o-api

# .env 파일 수정
cd /home/ubuntu/o4o-platform/apps/api-server
nano .env

# 다음 추가
KAKAO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxx
KAKAO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://neture.co.kr

# 저장 후 재시작
npx pm2 restart o4o-api-server

# 상태 확인
curl http://localhost:4000/api/v1/social/status
```

**예상 응답:**
```json
{
  "success": true,
  "oauth": {
    "enabled": true,
    "providers": {
      "google": false,
      "kakao": true,
      "naver": false
    },
    "activeStrategies": ["kakao"],
    "message": "OAuth is configured and ready"
  }
}
```

---

### Step 3. API 라우트 점검

**현재 구현된 라우트:**

```typescript
// apps/api-server/src/routes/social-auth.ts

// OAuth 시작
router.get('/kakao', passport.authenticate('kakao'));

// OAuth Callback
router.get('/kakao/callback',
  passport.authenticate('kakao', { session: false }),
  async (req, res) => {
    const user = req.user;
    await SocialAuthService.completeSocialLogin(user, res);
    res.redirect(getRedirectUrls().success);
  }
);
```

**Callback 처리 로직:**

1. `authorization_code` 수신 (Kakao → O4O)
2. Passport Kakao Strategy가 자동으로 token 교환
3. 사용자 정보 조회: `https://kapi.kakao.com/v2/user/me`
4. `users` 테이블에서 email로 조회 또는 신규 생성
5. JWT 토큰 발급 → 쿠키 설정
6. 성공 URL로 리다이렉트: `https://neture.co.kr/auth/callback?success=true`

---

### Step 4. 프론트엔드 연동

**Signup 페이지 (Main Site):**

```typescript
// apps/main-site/src/pages/auth/Signup.tsx

<button onClick={() => window.location.href =
  `${API_URL}/api/v1/social/kakao?redirect_url=${encodeURIComponent(redirectUrl)}`}>
  <img src="/icons/kakao.svg" alt="Kakao" />
  카카오로 가입
</button>
```

**로그인 완료 후:**
- OAuth Callback Handler: `apps/main-site/src/pages/auth/OAuthCallback.tsx`
- 성공 시: 토큰 저장 → 홈페이지 리다이렉트
- 실패 시: 에러 메시지 표시

---

### Step 5. 테스트 & 검증

| 항목 | 기대 결과 |
|------|----------|
| 로그인 요청 (`/api/v1/social/kakao`) | 카카오 인증 페이지로 이동 |
| 콜백 요청 (`/api/v1/social/kakao/callback`) | DB에 유저 정보 저장, JWT 발급 |
| 브라우저 리다이렉트 | 정상 로그인 상태로 `/auth/callback?success=true` 이동 |
| 로그 | `Kakao OAuth strategy configured` 로그 출력 |
| 예외 처리 | `invalid_redirect_uri`, `401 unauthorized` 발생 없음 |

**테스트 시나리오:**

1. **신규 사용자 가입**
   - `https://neture.co.kr/signup` 접속
   - "카카오로 가입" 버튼 클릭
   - 카카오 로그인 완료
   - DB에 신규 user 생성 확인
   - 홈페이지로 리다이렉트 확인

2. **기존 사용자 로그인**
   - 이미 가입된 이메일로 카카오 로그인
   - 기존 user 정보 조회
   - lastLoginAt 업데이트 확인
   - JWT 토큰 발급 확인

3. **에러 처리**
   - Redirect URI 불일치 → 에러 메시지
   - 이메일 미동의 → 안내 메시지
   - 네트워크 오류 → 재시도 안내

---

## 5️⃣ 데이터베이스 스키마

**users 테이블:**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  provider VARCHAR(50),  -- 'kakao', 'google', 'naver', 'email'
  provider_id VARCHAR(255),  -- 카카오 고유 ID
  role VARCHAR(50) DEFAULT 'customer',
  status VARCHAR(50) DEFAULT 'active',
  is_email_verified BOOLEAN DEFAULT false,
  password VARCHAR(255),  -- OAuth 사용자는 NULL
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);
```

**OAuth 사용자 저장 예시:**

```typescript
const user = {
  email: 'user@example.com',
  name: '홍길동',
  provider: 'kakao',
  provider_id: '1234567890',
  role: 'customer',
  status: 'active',
  is_email_verified: true,
  password: ''  // OAuth는 비밀번호 없음
};
```

---

## 6️⃣ 검증 기준 (Acceptance Criteria)

| 항목 | 기준 |
|------|------|
| Redirect URI 정상 등록 | Kakao Console에서 오류 없음 |
| 사용자 DB 저장 | PostgreSQL `users` 테이블에 신규 row 생성 |
| 토큰 발급 | JWT 토큰 발급 및 쿠키 설정 |
| 보안 | HTTPS만 허용, CSRF 방어 |
| 기존 WordPress 사용자 | 로그인 독립 운영 (서로 간섭 없음) |

---

## 7️⃣ 리스크 및 대응

| 리스크 | 대응 방안 |
|--------|----------|
| 카카오 앱 Redirect URI 미등록 | 콘솔에 `https://neture.co.kr/api/v1/social/kakao/callback` 추가 |
| 환경 변수 오타 | `.env.example`에 표준 키명 추가 후 검증 |
| 세션 만료/리다이렉트 오류 | JWT 만료시간 7일, 자동 갱신 로직 확인 |
| 기존 Cosmosfarm 사용자 혼동 | 분리 운영 (별도 도메인 유지) |
| Email 미제공 사용자 | "이메일 동의가 필요합니다" 안내 후 재시도 |

---

## 8️⃣ 요청 항목

| 구분 | 담당 | 상태 |
|------|------|------|
| Kakao 개발자 콘솔 등록 | 운영자 | ☐ |
| `.env` 갱신 | 서버 담당 | ☐ |
| API 콜백 경로 테스트 | QA | ☐ |
| DB 사용자 생성 검증 | 개발자 | ☐ |
| 결과 보고 | Codex | ☐ |

---

## 9️⃣ 참고 자료

- OAuth 설정 가이드: `docs/OAUTH_SETUP.md`
- Passport 설정 파일: `apps/api-server/src/config/passportDynamic.ts`
- Social Auth 라우트: `apps/api-server/src/routes/social-auth.ts`
- Signup 페이지: `apps/main-site/src/pages/auth/Signup.tsx`

---

**작성일:** 2025-01-08
**작성자:** Claude Code
**버전:** 1.0 (PostgreSQL 기반)
