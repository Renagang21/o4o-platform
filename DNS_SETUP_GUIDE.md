# 🌐 AWS Lightsail DNS 서브도메인 설정 가이드

**작업 목표**: api.neture.co.kr, auth.neture.co.kr 서브도메인 설정

---

## 📋 사전 준비사항

### 현재 확인된 정보
- **o4o-webserver**: 13.125.144.8 (neture.co.kr 운영 중)
- **o4o-apiserver**: IP 주소 확인 필요

### 필요한 작업
1. o4o-apiserver IP 주소 확인
2. AWS Lightsail DNS 설정
3. DNS 전파 확인

---

## 🔍 Step 1: o4o-apiserver IP 주소 확인

### 방법 1: AWS Lightsail 콘솔에서 확인
```
1. AWS Lightsail 콘솔 접속
2. "인스턴스" 탭에서 o4o-apiserver 찾기
3. 공용 IP 주소 기록

예상 이름: o4o-apiserver, api-server, apiserver 등
```

### 방법 2: o4o-webserver에서 확인 (SSH 접속)
```bash
# o4o-webserver에 SSH 접속 후
ssh ubuntu@13.125.144.8

# 관련 설정 파일에서 API 서버 IP 확인
grep -r "api.*server\|4000" ~/o4o-platform/ 2>/dev/null | head -10
cat ~/o4o-platform/.env* 2>/dev/null | grep -i api
```

### 방법 3: 문서에서 추가 확인 ✅ 완료
**검색 결과**: o4o-apiserver의 정확한 IP 주소가 설정 파일에 명시되지 않음

**발견된 중요 정보**:
- API 서버는 포트 4000에서 실행 중
- nginx 설정에서 `api-server:3000` 참조 발견
- 배포 설정에서 `localhost:4000/api` 사용
- **결론**: API 서버가 웹서버와 같은 인스턴스에 있을 가능성 높음

---

## 🌐 Step 2: AWS Lightsail DNS 설정

### DNS 레코드 추가 방법

#### 2.1 Lightsail 콘솔 접속
```
1. AWS Lightsail 콘솔 로그인
2. "네트워킹" → "DNS 존"
3. "neture.co.kr" 클릭
```

#### 2.2 A 레코드 추가
```
📌 api.neture.co.kr 설정:
- 레코드 타입: A
- 이름: api
- 값: 13.125.144.8 (임시로 웹서버 IP 사용)
- TTL: 300
- 참고: API 서버가 웹서버와 동일 인스턴스에 있을 가능성 높음

📌 auth.neture.co.kr 설정:
- 레코드 타입: A  
- 이름: auth
- 값: 13.125.144.8 (o4o-webserver IP)
- TTL: 300
```

#### 2.3 설정 예시 화면
```
neture.co.kr DNS 존:
┌─────────────────────────────────────────┐
│ 레코드 이름    │ 타입 │ 값              │
├─────────────────────────────────────────┤
│ @             │ A    │ 13.125.144.8    │
│ www           │ A    │ 13.125.144.8    │
│ api           │ A    │ [API서버 IP]    │
│ auth          │ A    │ 13.125.144.8    │
└─────────────────────────────────────────┘
```

---

## 🧪 Step 3: DNS 전파 확인

### 3.1 명령어로 확인
```bash
# DNS 전파 확인 (5-10분 소요)
nslookup api.neture.co.kr
nslookup auth.neture.co.kr

# 성공 예시:
# api.neture.co.kr → [o4o-apiserver IP]
# auth.neture.co.kr → 13.125.144.8
```

### 3.2 온라인 도구 확인
```
https://www.whatsmydns.net/
- api.neture.co.kr 입력
- auth.neture.co.kr 입력
- 전 세계 DNS 서버에서 전파 상태 확인
```

### 3.3 브라우저 테스트
```bash
# DNS 전파 완료 후 (현재는 접속 안됨이 정상)
curl -I http://api.neture.co.kr
curl -I http://auth.neture.co.kr

# 예상 결과: Connection refused (정상, 서비스 아직 미배포)
```

---

## 📝 작업 체크리스트

### DNS 설정 체크리스트
- [ ] o4o-apiserver IP 주소 확인
- [ ] AWS Lightsail DNS 콘솔 접속
- [ ] api.neture.co.kr A 레코드 추가
- [ ] auth.neture.co.kr A 레코드 추가
- [ ] DNS 전파 확인 (nslookup)
- [ ] 온라인 DNS 전파 도구 확인

### 예상 소요시간
- DNS 레코드 추가: 5분
- DNS 전파 대기: 5-10분
- 확인 및 테스트: 5분
- **총 소요시간: 15-20분**

---

## 🚨 문제 해결 가이드

### 일반적인 문제들

#### Q1: o4o-apiserver IP를 찾을 수 없어요
```
A1: 다음 방법들을 시도해보세요:
1. AWS Lightsail 콘솔에서 인스턴스 목록 확인
2. o4o-webserver SSH 접속 후 설정 파일 확인
3. 임시로 auth.neture.co.kr만 설정하고 api는 나중에 추가
```

#### Q2: DNS 전파가 너무 오래 걸려요
```
A2: 보통 5-10분이지만 최대 24시간까지 소요될 수 있습니다:
1. TTL을 300으로 설정했는지 확인
2. 다른 DNS 서버에서 테스트 (8.8.8.8)
3. 브라우저 캐시 삭제 후 재테스트
```

#### Q3: nslookup 결과가 다르게 나와요
```
A3: 지역별 DNS 서버 차이일 수 있습니다:
1. https://www.whatsmydns.net/ 에서 글로벌 확인
2. 주요 DNS 서버에서 50% 이상 전파되면 진행 가능
3. 완전 전파는 시간이 걸리지만 작업은 계속 진행
```

---

## 🔄 다음 단계 미리보기

DNS 설정 완료 후 진행할 작업들:

### Phase 3: Common-Core Auth 배포
```bash
# auth.neture.co.kr 서비스 구축
1. o4o-webserver에 auth 시스템 설치
2. PostgreSQL 연결 설정
3. OAuth 클라이언트 설정
4. nginx 리버스 프록시 설정
5. SSL 인증서 발급
```

### Phase 4: API 서버 도메인 연결
```bash
# api.neture.co.kr 서비스 구축  
1. o4o-apiserver nginx 설정
2. SSL 인증서 발급
3. CORS 설정 업데이트
4. API 엔드포인트 테스트
```

---

## 💡 꿀팁

### DNS 작업 시 주의사항
1. **TTL 설정**: 300초로 설정하여 빠른 전파
2. **백업**: 기존 DNS 설정 스크린샷 저장
3. **단계적 접근**: 한 번에 하나씩 설정 후 확인
4. **문서화**: 설정한 IP 주소들 기록 보관

### 시간 절약 팁
1. DNS 전파 대기 중에 다른 준비 작업 진행
2. 여러 DNS 확인 도구 동시 사용
3. 브라우저 여러 개로 동시 테스트

---

**🎯 목표**: DNS 설정 완료 후 auth.neture.co.kr, api.neture.co.kr 도메인 준비

**⏭️ 다음**: Common-Core Auth 시스템 배포 시작