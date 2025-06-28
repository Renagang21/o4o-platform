# 🔑 OAuth 키값 체크리스트 및 사용 가이드

## 📋 필요한 OAuth 키값들

### 🔴 Google OAuth
```bash
GOOGLE_CLIENT_ID=실제_구글_클라이언트_ID
GOOGLE_CLIENT_SECRET=실제_구글_클라이언트_시크릿
```
**어디서 확인?**
- https://console.cloud.google.com/
- API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID

### 🟢 Naver OAuth  
```bash
NAVER_CLIENT_ID=실제_네이버_클라이언트_ID
NAVER_CLIENT_SECRET=실제_네이버_클라이언트_시크릿
```
**어디서 확인?**
- https://developers.naver.com/
- 내 애플리케이션 → 애플리케이션 정보

### 🟡 Kakao OAuth
```bash
KAKAO_CLIENT_ID=실제_카카오_REST_API_키
KAKAO_CLIENT_SECRET=
```
**어디서 확인?**
- https://developers.kakao.com/
- 내 애플리케이션 → 앱 설정 → 앱 키 → REST API 키
- ⚠️ 카카오는 Client Secret이 없으므로 빈 값으로 둡니다

---

## 🔐 키값이 사용되는 곳

### 1. Common-Core Auth 서버에서 사용
```javascript
// passport.ts에서 각 OAuth 전략 설정 시 사용
GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,      // 여기!
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, // 여기!
    callbackURL: '/auth/google/callback'
})
```

### 2. OAuth 인증 플로우
```
사용자 → auth.neture.co.kr → Google/Naver/Kakao 로그인 
→ OAuth 제공자가 Client ID로 앱 확인
→ Client Secret으로 보안 검증
→ 인증 성공 → JWT 토큰 발급
```

---

## ⚠️ 키값 없이는 발생하는 문제

1. **Google 로그인 클릭 시**
   - Error: "Invalid OAuth client"
   - 리다이렉트 실패

2. **Naver 로그인 클릭 시**
   - Error: "인증 실패"
   - 클라이언트 정보 불일치

3. **Kakao 로그인 클릭 시**
   - Error: "KOE101: Invalid app key"
   - 앱 키 검증 실패

---

## ✅ 키값 설정 확인 방법

### 서버에서 확인
```bash
# .env 파일 확인
cat /home/ubuntu/common-core/auth/backend/.env | grep CLIENT

# 환경변수 로드 확인
cd /home/ubuntu/common-core/auth/backend
node -e "require('dotenv').config(); console.log({
  google: process.env.GOOGLE_CLIENT_ID ? '✓' : '✗',
  naver: process.env.NAVER_CLIENT_ID ? '✓' : '✗',
  kakao: process.env.KAKAO_CLIENT_ID ? '✓' : '✗'
})"
```

### PM2 로그에서 확인
```bash
pm2 logs auth-server | grep -i "oauth"
```

---

## 🚀 키값 설정 후 필수 작업

1. **서비스 재시작**
```bash
pm2 restart auth-server
```

2. **로그 확인**
```bash
pm2 logs auth-server --lines 50
```

3. **OAuth 엔드포인트 테스트**
```bash
# 각 제공자별 리다이렉트 확인
curl -I https://auth.neture.co.kr/auth/google
curl -I https://auth.neture.co.kr/auth/naver  
curl -I https://auth.neture.co.kr/auth/kakao
```

---

## 💡 보안 팁

1. **절대 하지 말아야 할 것**
   - Git에 커밋하지 마세요
   - 로그에 출력하지 마세요
   - 클라이언트 코드에 포함하지 마세요

2. **권장 사항**
   - 정기적으로 키 재발급
   - 프로덕션/개발 환경 키 분리
   - 환경변수로만 관리

---

**🎯 목표**: 모든 OAuth 키값을 .env 파일에 정확히 입력하여 소셜 로그인 활성화