# Cursor 작업 지시서 - AWS 서버 테스트 및 API 연동

## 📋 현재 상황 요약

### ✅ 완료된 작업
- Common-Core 통합 인증 시스템 구현 완료
- AWS o4o-apiserver에 Common-Core 설치 및 Medusa.js 연동 완료
- o4o-platform 로컬 작업 서버 동기화 완료
- MCP 관련 작업 완료

### 🎯 다음 작업 목표
**AWS 서버에서 통합 인증 API 테스트 및 프론트엔드 연동**

---

## 🚀 즉시 수행할 작업

### **TASK 1: AWS 서버 상태 확인 및 API 서버 구동**

#### 1.1 서버 접속 및 상태 확인
```bash
# AWS o4o-apiserver 접속
ssh ubuntu@43.202.242.215

# 현재 실행 중인 프로세스 확인
ps aux | grep medusa
ps aux | grep node
pm2 list

# 디렉토리 구조 확인
ls -la /home/ubuntu/
cd /home/ubuntu/medusa-backend
ls -la
```

#### 1.2 Common-Core 연동 상태 확인
```bash
# 설치된 패키지 확인
npm list @renagang21/common-core
npm link list

# medusa-config.js 설정 확인
cat medusa-config.js | grep -A 10 -B 10 "common-core"

# 환경 변수 확인
cat .env | head -20
```

#### 1.3 Medusa 서버 구동
```bash
# 데이터베이스 마이그레이션 (필요시)
medusa migrations run

# 개발 서버 실행
medusa develop
# 또는 프로덕션 서버
medusa start

# 서버 구동 확인 (새 터미널에서)
curl http://localhost:9000/store
curl http://localhost:9000/health
```

---

### **TASK 2: 통합 인증 API 테스트**

#### 2.1 회원가입 API 테스트
```bash
# 기본 회원가입 테스트
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com", 
    "password": "password123",
    "first_name": "홍",
    "last_name": "길동"
  }'

# 응답 예상: 201 Created, JWT 토큰 포함
```

#### 2.2 로그인 API 테스트
```bash
# 로그인 테스트
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 응답 예상: 200 OK, JWT 토큰 포함
```

#### 2.3 JWT 토큰 검증 테스트
```bash
# 로그인 응답에서 받은 토큰을 사용
TOKEN="여기에_JWT_토큰_입력"

curl -X GET http://localhost:9000/store/customers/me \
  -H "Authorization: Bearer $TOKEN"
```

---

### **TASK 3: 에러 발생 시 문제 해결**

#### 3.1 일반적인 문제 확인
```bash
# 로그 확인
tail -f ~/.pm2/logs/medusa-out.log
tail -f ~/.pm2/logs/medusa-error.log

# 포트 사용 확인
netstat -tulpn | grep 9000
lsof -i :9000

# 메모리 사용량 확인
free -h
df -h
```

#### 3.2 Common-Core 연동 문제 시
```bash
# 패키지 재설치
cd /home/ubuntu/common-core
npm run build
npm link

cd /home/ubuntu/medusa-backend  
npm link @renagang21/common-core
npm install

# 설정 파일 재확인
cat src/api/store/auth/register/route.ts
cat src/api/store/auth/login/route.ts
```

#### 3.3 데이터베이스 연결 문제 시
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql
sudo -u postgres psql -l

# 데이터베이스 연결 테스트
sudo -u postgres psql -d medusa_db -c "SELECT NOW();"
```

---

### **TASK 4: 도메인 및 HTTPS 설정**

#### 4.1 Nginx 프록시 설정
```bash
# Nginx 설정 확인
sudo cat /etc/nginx/sites-available/api.neture.co.kr

# 설정이 없다면 생성
sudo nano /etc/nginx/sites-available/api.neture.co.kr
```

#### 4.2 Nginx 설정 내용 (신규 생성 시)
```nginx
server {
    listen 80;
    server_name api.neture.co.kr;
    
    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4.3 SSL 인증서 설정
```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Certbot으로 SSL 인증서 발급
sudo certbot --nginx -d api.neture.co.kr
```

---

### **TASK 5: 프론트엔드 연동 테스트**

#### 5.1 환경 변수 설정 확인
```bash
# o4o-webserver에서 환경 변수 확인
ssh ubuntu@13.125.144.8
cd /home/ubuntu/o4o-platform
cat .env | grep VITE_API
```

#### 5.2 프론트엔드 API 연동 테스트
- 브라우저에서 https://neture.co.kr 접속
- 회원가입 페이지에서 테스트 계정 생성
- 로그인 페이지에서 로그인 테스트
- 개발자 도구 Network 탭에서 API 호출 확인

---

## 🔍 테스트 체크리스트

### API 서버 기본 테스트
- [ ] Medusa 서버 정상 구동 (포트 9000)
- [ ] `/store` 엔드포인트 응답 확인
- [ ] `/health` 엔드포인트 응답 확인
- [ ] Common-Core 패키지 로드 확인

### 인증 API 테스트
- [ ] 회원가입 API (`/store/auth/register`) 정상 작동
- [ ] 로그인 API (`/store/auth/login`) 정상 작동
- [ ] JWT 토큰 생성 및 검증 정상
- [ ] User-Customer 양방향 연동 확인

### 프론트엔드 연동 테스트
- [ ] 프론트엔드에서 API 서버 접근 가능
- [ ] 회원가입 폼 실제 동작 확인
- [ ] 로그인 폼 실제 동작 확인
- [ ] CORS 설정 문제 없음

### 인프라 설정
- [ ] 도메인 연결 (api.neture.co.kr)
- [ ] HTTPS 인증서 설정
- [ ] Nginx 프록시 정상 작동
- [ ] 보안 설정 적용

---

## 🚨 주의사항

### 보안
- 실제 프로덕션 환경이므로 테스트 데이터만 사용
- API 키나 시크릿 정보 노출 주의
- 불필요한 포트 노출 금지

### 서버 안정성
- 기존 서비스 영향 최소화
- 메모리 사용량 모니터링
- 백업 및 롤백 계획 준비

### 테스트 데이터
- 테스트용 이메일 주소 사용 (test@example.com 등)
- 실제 사용자 데이터와 구분
- 테스트 완료 후 데이터 정리

---

## 📞 문제 발생 시 대응

### 즉시 보고할 상황
1. 서버 접근 불가
2. 기존 서비스 중단
3. 데이터베이스 연결 실패
4. 메모리 부족으로 인한 시스템 다운

### 로그 수집 명령어
```bash
# 시스템 로그
sudo journalctl -u nginx -f
sudo journalctl -u postgresql -f

# 애플리케이션 로그
pm2 logs medusa
tail -f /var/log/nginx/error.log

# 시스템 상태
top
iostat 1 5
```

---

## 🎯 성공 기준

### 최소 성공 기준
- [ ] Medusa 서버 정상 구동
- [ ] 회원가입/로그인 API 정상 작동
- [ ] JWT 토큰 생성/검증 성공

### 완전 성공 기준  
- [ ] 프론트엔드-백엔드 완전 연동
- [ ] HTTPS 도메인 접근 가능
- [ ] 실제 사용자 플로우 테스트 성공
- [ ] 상품 등록 기능 구현 준비 완료

---

**작업 시작 전 반드시 현재 서버 상태를 백업하고, 단계별로 신중하게 진행하세요.**

**각 단계 완료 시마다 결과를 기록하고, 문제 발생 시 즉시 이전 단계로 롤백할 수 있도록 준비하세요.**