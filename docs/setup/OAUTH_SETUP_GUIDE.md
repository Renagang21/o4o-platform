# 🔐 OAuth 클라이언트 설정 가이드

**목표**: Google, Naver, Kakao OAuth 클라이언트 생성 및 설정
**완료 시점**: auth.neture.co.kr 배포 시 즉시 사용 가능

---

## 📋 설정 개요

### 공통 설정 정보
```
서비스 도메인: https://neture.co.kr
인증 도메인: https://auth.neture.co.kr
콜백 URL 패턴: https://auth.neture.co.kr/auth/{provider}/callback
```

### 필요한 콜백 URL 목록
```
Google: https://auth.neture.co.kr/auth/google/callback
Naver:  https://auth.neture.co.kr/auth/naver/callback
Kakao:  https://auth.neture.co.kr/auth/kakao/callback
```

---

## 🔴 Google OAuth 설정

### 1단계: Google Cloud Console 접속
```
1. https://console.cloud.google.com/ 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
   - 프로젝트 명: "Neture-O4O-Platform" (권장)
   - 조직: 개인 계정 사용
```

### 2단계: API 및 서비스 활성화
```
1. 좌측 메뉴 > "API 및 서비스" > "라이브러리"
2. "Google+ API" 검색 후 활성화
3. "OAuth consent screen" 설정:
   - 사용자 유형: 외부
   - 앱 이름: "Neture O4O Platform"
   - 사용자 지원 이메일: [귀하의 이메일]
   - 개발자 연락처: [귀하의 이메일]
   - 승인된 도메인: neture.co.kr
```

### 3단계: OAuth 2.0 클라이언트 ID 생성
```
1. "사용자 인증 정보" > "+ 사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"
2. 애플리케이션 유형: 웹 애플리케이션
3. 이름: "Neture Auth Service"
4. 승인된 자바스크립트 원본:
   - https://neture.co.kr
   - https://auth.neture.co.kr
5. 승인된 리디렉션 URI:
   - https://auth.neture.co.kr/auth/google/callback
6. "만들기" 클릭
```

### 4단계: 클라이언트 정보 저장
```
✅ 저장 필요한 정보:
- 클라이언트 ID: [복사해서 저장]
- 클라이언트 보안 비밀: [복사해서 저장]
```

---

## 🟢 Naver OAuth 설정

### 1단계: Naver Developers 접속
```
1. https://developers.naver.com/ 접속
2. 네이버 계정으로 로그인
3. "Application" > "애플리케이션 등록" 클릭
```

### 2단계: 애플리케이션 정보 입력
```
애플리케이션 이름: Neture O4O Platform
사용 API: 
  ☑️ 네이버 로그인
  ☑️ 회원프로필 조회

서비스 환경:
  ☑️ PC웹
  
PC웹 설정:
  서비스 URL: https://neture.co.kr
  네이버아이디로로그인 Callback URL: https://auth.neture.co.kr/auth/naver/callback
```

### 3단계: 추가 설정
```
로고 이미지: [선택사항]
검수 상태: 개발 중 (서비스 검수 신청은 나중에)

개인정보 수집 및 이용약관: [필요시 작성]
```

### 4단계: 클라이언트 정보 저장
```
✅ 저장 필요한 정보:
- Client ID: [복사해서 저장]
- Client Secret: [복사해서 저장]
```

---

## 🟡 Kakao OAuth 설정

### 1단계: Kakao Developers 접속
```
1. https://developers.kakao.com/ 접속
2. 카카오 계정으로 로그인
3. "내 애플리케이션" > "애플리케이션 추가하기"
```

### 2단계: 앱 기본 정보 설정
```
앱 이름: Neture O4O Platform
사업자명: [개인 또는 사업자명]
카테고리: 커뮤니티
```

### 3단계: 플랫폼 설정
```
1. 좌측 메뉴 > "앱 설정" > "플랫폼"
2. "Web 플랫폼 등록" 클릭
3. 사이트 도메인: https://neture.co.kr
```

### 4단계: 카카오 로그인 설정
```
1. 좌측 메뉴 > "제품 설정" > "카카오 로그인"
2. "카카오 로그인 활성화" ON
3. Redirect URI 등록:
   - https://auth.neture.co.kr/auth/kakao/callback
```

### 5단계: 동의항목 설정
```
1. "제품 설정" > "카카오 로그인" > "동의항목"
2. 필수 동의항목:
   ☑️ 닉네임
   ☑️ 프로필 사진
   ☑️ 카카오계정(이메일)
```

### 6단계: 클라이언트 정보 저장
```
1. "앱 설정" > "앱 키" 에서 확인
✅ 저장 필요한 정보:
- REST API 키: [복사해서 저장]
- JavaScript 키: [복사해서 저장]
- Admin 키: [복사해서 저장]

* Common-Core Auth에서는 REST API 키를 사용
```

---

## 📝 환경변수 설정 준비

### .env 파일에 추가할 내용
```bash
# Google OAuth
GOOGLE_CLIENT_ID=[Google에서 복사한 클라이언트 ID]
GOOGLE_CLIENT_SECRET=[Google에서 복사한 클라이언트 Secret]

# Naver OAuth  
NAVER_CLIENT_ID=[Naver에서 복사한 Client ID]
NAVER_CLIENT_SECRET=[Naver에서 복사한 Client Secret]

# Kakao OAuth
KAKAO_CLIENT_ID=[Kakao에서 복사한 REST API 키]
KAKAO_CLIENT_SECRET=[Kakao는 Client Secret 없음, 빈 문자열]
```

---

## 🧪 테스트 준비

### OAuth 플로우 테스트 절차
```
1. https://auth.neture.co.kr/login 접속
2. 각 소셜 로그인 버튼 클릭
3. 해당 플랫폼으로 리다이렉트 확인
4. 로그인 후 콜백 URL로 정상 리턴 확인
5. JWT 토큰 발급 확인
```

### 디버깅용 테스트 URL
```
Google: https://auth.neture.co.kr/auth/google
Naver:  https://auth.neture.co.kr/auth/naver  
Kakao:  https://auth.neture.co.kr/auth/kakao
```

---

## 🚨 보안 고려사항

### Client Secret 보안
```
⚠️ 주의사항:
1. Client Secret은 절대 브라우저에 노출하지 말 것
2. .env 파일은 git에 커밋하지 말 것
3. 프로덕션 환경에서는 환경변수로 관리
4. 정기적으로 Secret 갱신 권장
```

### 도메인 화이트리스트
```
✅ 등록된 도메인만 OAuth 허용:
- neture.co.kr
- auth.neture.co.kr

❌ localhost나 IP 주소는 프로덕션에서 제거
```

---

## 📋 설정 완료 체크리스트

### Google OAuth
- [ ] Google Cloud Console 프로젝트 생성
- [ ] OAuth consent screen 설정
- [ ] OAuth 2.0 클라이언트 ID 생성
- [ ] 콜백 URL 등록 (https://auth.neture.co.kr/auth/google/callback)
- [ ] 클라이언트 ID/Secret 저장

### Naver OAuth  
- [ ] Naver Developers 애플리케이션 등록
- [ ] 네이버 로그인 API 활성화
- [ ] 서비스 URL 등록 (https://neture.co.kr)
- [ ] 콜백 URL 등록 (https://auth.neture.co.kr/auth/naver/callback)
- [ ] 클라이언트 ID/Secret 저장

### Kakao OAuth
- [ ] Kakao Developers 앱 생성
- [ ] 웹 플랫폼 등록 (https://neture.co.kr)
- [ ] 카카오 로그인 활성화
- [ ] 리다이렉트 URI 등록 (https://auth.neture.co.kr/auth/kakao/callback)
- [ ] 동의항목 설정 (닉네임, 프로필, 이메일)
- [ ] REST API 키 저장

### 환경변수 준비
- [ ] 모든 OAuth 클라이언트 정보 수집
- [ ] .env 파일 형식으로 정리
- [ ] 보안 확인 (Secret 노출 방지)

---

## 🔄 다음 단계

OAuth 설정 완료 후:
1. **DNS 전파 확인** - auth.neture.co.kr 해석 확인
2. **Auth 서버 배포** - 환경변수와 함께 즉시 배포
3. **OAuth 테스트** - 실제 소셜 로그인 플로우 검증

---

**🎯 목표**: 3개 플랫폼 OAuth 클라이언트 설정 완료**

**⏱️ 예상 소요시간**: 15-20분**

**📋 성공 지표**: 모든 OAuth 클라이언트 ID/Secret 확보 완료**