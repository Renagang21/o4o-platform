# Kakao OAuth 설정 체크리스트

## 📋 Kakao Developers 콘솔 설정 항목

### 1. 애플리케이션 기본 정보
- [ ] 앱 이름: O4O Platform
- [ ] 회사명: (귀사명 입력)
- [ ] 카테고리: 쇼핑/커머스

### 2. 플랫폼 설정

**Web 플랫폼 사이트 도메인:**
```
https://neture.co.kr
https://admin.neture.co.kr
https://api.neture.co.kr
```

### 3. Redirect URI 등록

**⚠️ 중요: 아래 2개 URL을 모두 등록해야 합니다**

```
https://neture.co.kr/api/v1/social/kakao/callback
https://api.neture.co.kr/api/v1/social/kakao/callback
```

**왜 2개?**
- `neture.co.kr`: Main Site에서 로그인 시 사용
- `api.neture.co.kr`: API 서버 직접 호출 시 사용

### 4. 카카오 로그인 활성화

**제품 설정 → 카카오 로그인:**
- [ ] 카카오 로그인 활성화 ON
- [ ] OpenID Connect 활성화 (선택사항)

**동의 항목 설정:**
- [x] **이메일 (필수 동의)** ← 반드시 설정
- [x] **프로필 정보 (닉네임/프로필 사진)** ← 선택 동의

### 5. Client ID & Secret 발급

**앱 키 탭:**
```
REST API 키: [복사] ← 이것이 KAKAO_CLIENT_ID
```

**보안 탭:**
```
Client Secret: [코드 생성] → [활성화 상태로 설정] ← 이것이 KAKAO_CLIENT_SECRET
```

⚠️ **주의:** Client Secret은 발급 후 다시 확인할 수 없으므로 안전하게 보관

---

## 🔧 서버 환경 변수 설정

### API 서버 `.env` 파일

```bash
# SSH 접속
ssh o4o-api

# 디렉토리 이동
cd /home/ubuntu/o4o-platform/apps/api-server

# .env 파일 수정
nano .env
```

**추가할 내용:**
```bash
# Kakao OAuth
KAKAO_CLIENT_ID=여기에_REST_API_키_입력
KAKAO_CLIENT_SECRET=여기에_Client_Secret_입력

# Frontend URL (이미 설정되어 있으면 확인만)
FRONTEND_URL=https://neture.co.kr
```

**저장 방법:**
1. `Ctrl + O` (저장)
2. `Enter` (파일명 확인)
3. `Ctrl + X` (종료)

---

## 🚀 서버 재시작

```bash
# PM2 재시작
npx pm2 restart o4o-api-server

# 로그 확인 (OAuth 설정 확인)
npx pm2 logs o4o-api-server --lines 50 | grep -i kakao

# 상태 확인
curl http://localhost:4000/api/v1/social/status
```

**예상 로그:**
```
"Kakao OAuth strategy configured"
"OAuth strategies configured successfully"
```

**예상 상태 응답:**
```json
{
  "oauth": {
    "enabled": true,
    "providers": {
      "kakao": true
    },
    "activeStrategies": ["kakao"]
  }
}
```

---

## ✅ 테스트 시나리오

### 1. 브라우저 테스트

```
1. https://neture.co.kr/signup 접속
2. "카카오로 가입" 버튼 클릭
3. 카카오 로그인 페이지로 이동 확인
4. 로그인 완료 후 /auth/callback?success=true 로 돌아오는지 확인
5. 로그인 상태 확인 (우측 상단 사용자 정보 표시)
```

### 2. API 직접 테스트

```bash
# OAuth 시작 URL
curl -I https://api.neture.co.kr/api/v1/social/kakao

# 예상: 302 Redirect to kauth.kakao.com
```

### 3. 데이터베이스 확인

```bash
# SSH 접속
ssh o4o-api

# PostgreSQL 접속
psql -U postgres -d o4o_platform

# 사용자 조회
SELECT id, email, name, provider, provider_id, created_at
FROM users
WHERE provider = 'kakao'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🐛 문제 해결

### 문제 1: "Unknown authentication strategy"

**원인:** 환경변수 미설정 또는 PM2 미재시작

**해결:**
```bash
# 환경변수 확인
cat /home/ubuntu/o4o-platform/apps/api-server/.env | grep KAKAO

# PM2 재시작
npx pm2 restart o4o-api-server

# 로그 확인
npx pm2 logs o4o-api-server --lines 50
```

### 문제 2: "invalid_redirect_uri"

**원인:** Kakao Developers 콘솔에 Redirect URI 미등록

**해결:**
1. Kakao Developers 콘솔 접속
2. 카카오 로그인 → Redirect URI 등록
3. 정확히 입력: `https://neture.co.kr/api/v1/social/kakao/callback`

### 문제 3: "Email not provided by Kakao"

**원인:** 이메일 동의 항목이 필수로 설정되지 않음

**해결:**
1. Kakao Developers → 동의 항목
2. 이메일을 **필수 동의**로 변경
3. 사용자에게 재로그인 요청

### 문제 4: 로그인 후 홈으로 리다이렉트 안됨

**원인:** OAuth Callback Handler 오류

**해결:**
```bash
# 브라우저 개발자 도구 → Console 확인
# Network 탭에서 /auth/callback 응답 확인

# 서버 로그 확인
ssh o4o-api
npx pm2 logs o4o-api-server --lines 100 | grep -i "kakao\|callback"
```

---

## 📊 완료 체크리스트

### Kakao Developers 콘솔
- [ ] Web 플랫폼 도메인 등록 (3개)
- [ ] Redirect URI 등록 (2개)
- [ ] 카카오 로그인 활성화
- [ ] 이메일 필수 동의 설정
- [ ] Client Secret 발급 및 활성화

### API 서버
- [ ] `.env` 파일에 KAKAO_CLIENT_ID 설정
- [ ] `.env` 파일에 KAKAO_CLIENT_SECRET 설정
- [ ] FRONTEND_URL 확인 (https://neture.co.kr)
- [ ] PM2 재시작
- [ ] `/api/v1/social/status` 엔드포인트에서 kakao: true 확인

### 테스트
- [ ] Signup 페이지 카카오 버튼 작동
- [ ] 카카오 로그인 페이지 리다이렉트
- [ ] 로그인 완료 후 콜백 처리
- [ ] DB에 사용자 저장 확인
- [ ] JWT 토큰 발급 확인
- [ ] 로그인 상태 유지 확인

---

## 📞 지원

문제 발생 시:
1. 로그 확인: `npx pm2 logs o4o-api-server --lines 100`
2. 상태 확인: `curl https://api.neture.co.kr/api/v1/social/status`
3. 문서 참조: `docs/OAUTH_SETUP.md`, `docs/KAKAO_OAUTH_SETUP_REQUEST.md`

---

**작성일:** 2025-01-08
**최종 수정:** 2025-01-08
