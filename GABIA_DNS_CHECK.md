# 🌐 가비아 DNS 설정 확인 가이드

## 📋 가비아에서 설정하셨다면

### 1️⃣ 가비아 DNS 설정 확인
```
가비아 My가비아 > 도메인 관리 > neture.co.kr > DNS 관리

설정하신 내용:
- 호스트: api  → IP: 13.125.144.8
- 호스트: auth → IP: 13.125.144.8
```

### 2️⃣ DNS 전파 시간
- **가비아 DNS**: 보통 10분~1시간
- **전 세계 전파**: 최대 24시간

---

## 🔍 즉시 확인 방법

### 가비아 DNS 서버로 직접 확인
```bash
# 가비아 DNS 서버 주소
# ns.gabia.co.kr (211.234.118.50)
# ns1.gabia.co.kr (211.234.118.54)

nslookup auth.neture.co.kr 211.234.118.50
nslookup api.neture.co.kr 211.234.118.50
```

### 온라인 확인
```
1. https://www.whatsmydns.net/
   - auth.neture.co.kr 입력
   - 한국 서버들 확인

2. https://toolbox.googleapps.com/apps/dig/
   - Google의 DNS 조회 도구
```

---

## 🚀 DNS 전파 동안 할 수 있는 작업

### 1. 서버에 Auth 시스템 설치
```bash
# SSH 접속
ssh ubuntu@13.125.144.8

# Common-Core 설치
cd /home/ubuntu/
git clone https://github.com/Renagang21/common-core.git
cd common-core/auth/backend
npm install

# .env 파일 생성 (OAuth 키값 입력)
nano .env
```

### 2. nginx 임시 설정 (서브경로)
```bash
# 임시로 서브경로 사용
sudo nano /etc/nginx/sites-available/neture.co.kr

# 추가할 내용:
location /auth/ {
    proxy_pass http://localhost:5000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# nginx 재시작
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 로컬 테스트 (hosts 파일)
```bash
# Windows: C:\Windows\System32\drivers\etc\hosts
# 관리자 권한으로 메모장 실행 후 편집

13.125.144.8 auth.neture.co.kr
13.125.144.8 api.neture.co.kr

# 저장 후 브라우저에서 확인
```

---

## 📊 가비아 DNS 설정 체크리스트

### 설정 확인 사항
- [ ] 호스트명: `api` (api.neture.co.kr 아님)
- [ ] 호스트명: `auth` (auth.neture.co.kr 아님)
- [ ] 레코드 타입: A
- [ ] IP 주소: 13.125.144.8
- [ ] TTL: 3600 (또는 더 짧게)
- [ ] 설정 저장 완료

### 흔한 실수
❌ 호스트명에 전체 도메인 입력 (api.neture.co.kr)
❌ CNAME 레코드로 설정
❌ 저장 버튼 누르지 않음

✅ 호스트명에 서브도메인만 (api, auth)
✅ A 레코드로 설정
✅ IP 주소 정확히 입력

---

## 🎯 현재 추천 방안

### Option 1: DNS 기다리며 서버 준비
1. Auth 시스템 설치 (30분)
2. OAuth 키값 설정
3. PM2 서비스 준비
4. DNS 전파되면 nginx 설정

### Option 2: 즉시 서브경로로 시작
1. neture.co.kr/auth 로 바로 시작
2. neture.co.kr/api 로 API 운영
3. 나중에 서브도메인으로 이전

---

**💡 가비아 DNS는 보통 30분 내에 전파됩니다!**

설정을 다시 확인하시고, 그동안 서버 준비를 진행하시는 것이 어떨까요?