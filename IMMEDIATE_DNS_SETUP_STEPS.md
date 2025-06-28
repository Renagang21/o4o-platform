# 🚀 즉시 실행 가능한 DNS 설정 단계

**작업 목표**: Phase 2 완료 - DNS 서브도메인 설정
**현재 상황**: o4o-apiserver IP 확인 필요, 하지만 진행 가능한 방법 있음

---

## 🎯 권장 접근 방법

### 📋 Option A: 임시 설정으로 진행 (권장)
**이유**: API 서버가 웹서버와 같은 인스턴스에 있을 가능성이 높음

```bash
# 1. AWS Lightsail DNS 설정
1. AWS Lightsail 콘솔 접속
2. "네트워킹" → "DNS 존" → "neture.co.kr"
3. A 레코드 추가:

   📌 api.neture.co.kr:
   - 레코드 타입: A
   - 이름: api
   - 값: 13.125.144.8
   - TTL: 300

   📌 auth.neture.co.kr:
   - 레코드 타입: A
   - 이름: auth
   - 값: 13.125.144.8
   - TTL: 300
```

### 🔍 Option B: 정확한 IP 먼저 확인
```bash
# SSH로 웹서버 접속하여 API 서버 확인
ssh ubuntu@13.125.144.8

# API 서버 프로세스 확인
pm2 list
ps aux | grep node
netstat -tlnp | grep :4000

# nginx 설정 확인
sudo cat /etc/nginx/sites-available/default
sudo cat /etc/nginx/sites-available/neture.co.kr
```

---

## 🚀 즉시 실행 계획

### Step 1: DNS 설정 (5분)
```bash
✅ 실행할 작업:
1. AWS Lightsail 콘솔 로그인
2. neture.co.kr DNS 존 선택
3. 다음 A 레코드 2개 추가:
   - api.neture.co.kr → 13.125.144.8
   - auth.neture.co.kr → 13.125.144.8
```

### Step 2: DNS 전파 확인 (5-10분)
```bash
# 명령어로 확인
nslookup api.neture.co.kr
nslookup auth.neture.co.kr

# 온라인 확인
https://www.whatsmydns.net/
```

### Step 3: 서버 상태 확인 (5분)
```bash
# 현재 상태 확인 (접속 안됨이 정상)
curl -I http://api.neture.co.kr
curl -I http://auth.neture.co.kr

# 예상 결과: "Connection refused" (서비스 미배포)
```

---

## 📊 근거 및 판단 이유

### 🔍 발견된 증거들
1. **nginx 설정**: `proxy_pass http://api-server:3000/api/`
2. **GitHub Actions**: `VITE_API_BASE_URL=http://localhost:4000/api`
3. **환경 설정**: API 서버 포트 4000 사용
4. **배포 문서**: 웹서버 13.125.144.8에서 전체 플랫폼 관리

### 💡 합리적 추론
- API 서버가 별도 인스턴스가 아닌 웹서버 내부에서 실행 중일 가능성 높음
- nginx 리버스 프록시로 `/api` 경로 처리 중
- 단일 인스턴스에서 다중 서비스 운영 (일반적인 소규모 배포 패턴)

---

## 🎯 다음 Phase 준비

### Phase 3 준비사항
DNS 설정 완료 후 즉시 진행할 수 있는 작업들:

```bash
1. Common-Core Auth 시스템 배포 준비
   - auth.neture.co.kr 도메인 활성화됨
   - 웹서버에 auth 시스템 설치 준비

2. API 서버 도메인 연결
   - api.neture.co.kr 도메인 활성화됨
   - nginx 리버스 프록시 설정 작업
```

---

## 🚨 리스크 관리

### 만약 API 서버가 다른 IP라면?
1. **쉬운 수정**: DNS A 레코드만 변경하면 됨
2. **TTL 300초**: 5분 내 전파 완료
3. **롤백 가능**: 언제든 이전 설정으로 복원

### 현재 서비스 영향도
- **neture.co.kr**: 영향 없음 (기존 설정 유지)
- **새 서브도메인**: 아직 서비스 없으므로 영향 없음

---

## ✅ 실행 결정

**권장 방안**: Option A (임시 설정) → 즉시 진행
**이유**: 
- 리스크 최소화
- 빠른 진행 가능
- 추후 수정 용이
- 근거 있는 합리적 추정

**다음 단계**: DNS 설정 완료 후 Phase 3 (Common-Core Auth 배포) 시작

---

**🎯 즉시 실행하세요!**
1. AWS Lightsail DNS 콘솔 접속
2. A 레코드 2개 추가 (api, auth → 13.125.144.8)
3. 5분 후 nslookup으로 확인
4. Phase 3 진행 준비