# Cursor 작업 지시서 - 사무실 재개 작업 (AWS API 테스트 및 배포)

## 📋 현재 상황 분석 (2025-06-10)

### ✅ 완료된 작업 확인
- Common-Core 통합 인증 시스템 구현 완료 ✅
- AWS o4o-apiserver에 Common-Core 설치 및 Medusa.js 연동 완료 ✅
- o4o-platform 로컬-GitHub 동기화 완료 ✅
- common-core 로컬-GitHub 동기화 완료 ✅

### ⚠️ 이전 작업 중단 지점
**커서가 AWS 서버 테스트 작업을 중단한 상태**
- 작업 중단 시점: 통합 인증 API 테스트 직전 단계
- AWS o4o-apiserver: 43.202.242.215
- Medusa 서버 구동 상태 불명
- API 엔드포인트 테스트 미완료

### 🎯 사무실 재개 작업 목표
**중단된 지점부터 재개하여 AWS API 서버 완전 구동 및 테스트 완료**

---

## 🚀 즉시 수행할 작업 (우선순위 순)

### **TASK 1: AWS 서버 현재 상태 점검**

#### 1.1 서버 접속 및 프로세스 확인
```bash
# AWS o4o-apiserver 접속
ssh ubuntu@43.202.242.215

# 현재 실행 중인 프로세스 전체 확인
ps aux | grep -E "(medusa|node|npm)"
pm2 list
netstat -tulpn | grep -E "(9000|3000|5432)"

# 시스템 리소스 상태 확인
free -h
df -h
uptime
```

#### 1.2 디렉토리 및 설치 상태 확인
```bash
# 주요 디렉토리 구조 확인
ls -la /home/ubuntu/
cd /home/ubuntu/medusa-backend && pwd && ls -la
cd /home/ubuntu/common-core && pwd && ls -la

# npm 패키지 연동 상태 확인
npm list @renagang21/common-core
npm link list | grep common-core
```

#### 1.3 환경 설정 확인
```bash
# 환경 변수 확인
cd /home/ubuntu/medusa-backend
cat .env | head -20
echo "DATABASE_URL: $(grep DATABASE_URL .env)"
echo "JWT_SECRET: $(grep JWT_SECRET .env)"

# PostgreSQL 연결 확인
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

---

### **TASK 2: Medusa 서버 구동 및 상태 확인**

#### 2.1 기존 프로세스 정리 (필요시)
```bash
# 기존 Medusa 프로세스가 있다면 정리
pkill -f medusa
pm2 delete medusa 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 포트 사용 확인 및 정리
lsof -ti:9000 | xargs kill -9 2>/dev/null || true
```

#### 2.2 Medusa 서버 시작
```bash
cd /home/ubuntu/medusa-backend

# 의존성 확인 및 설치
npm install

# 데이터베이스 마이그레이션 실행
medusa migrations run

# 개발 서버 시작 (백그라운드)
nohup medusa develop > medusa.log 2>&1 &

# 또는 PM2로 관리
pm2 start "medusa develop" --name medusa
```

#### 2.3 서버 구동 확인
```bash
# 프로세스 확인
ps aux | grep medusa
pm2 status

# 포트 리스닝 확인
netstat -tulpn | grep 9000
lsof -i :9000

# 기본 엔드포인트 테스트
sleep 10  # 서버 시작 대기
curl -v http://localhost:9000/store
curl -v http://localhost:9000/health
```

---

### **TASK 3: Common-Core 통합 인증 API 테스트**

#### 3.1 커스텀 인증 엔드포인트 확인
```bash
# 커스텀 인증 라우트 존재 확인
ls -la /home/ubuntu/medusa-backend/src/api/store/auth/
cat /home/ubuntu/medusa-backend/src/api/store/auth/register/route.ts | head -20
cat /home/ubuntu/medusa-backend/src/api/store/auth/login/route.ts | head -20
```

#### 3.2 회원가입 API 테스트
```bash
# 테스트 사용자 회원가입
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-office@example.com",
    "password": "password123",
    "first_name": "테스트",
    "last_name": "사용자"
  }' | jq '.'

# 응답 확인: 201 Created, JWT 토큰, user 및 customer 정보 포함되어야 함
```

#### 3.3 로그인 API 테스트
```bash
# 생성한 사용자로 로그인
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-office@example.com",
    "password": "password123"
  }' | jq '.'

# JWT 토큰 추출 및 저장
TOKEN=$(curl -s -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-office@example.com","password":"password123"}' | \
  jq -r '.token')

echo "JWT Token: $TOKEN"
```

#### 3.4 인증된 요청 테스트
```bash
# 토큰을 사용한 인증된 요청
curl -X GET http://localhost:9000/store/customers/me \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 사용자 정보 조회 결과 확인
```

---

### **TASK 4: 도메인 및 프록시 설정**

#### 4.1 Nginx 설정 확인
```bash
# 기존 Nginx 설정 확인
sudo nginx -t
sudo systemctl status nginx
ls -la /etc/nginx/sites-enabled/

# api.neture.co.kr 설정 확인
sudo cat /etc/nginx/sites-available/api.neture.co.kr 2>/dev/null || echo "설정 파일 없음"
```

#### 4.2 도메인 프록시 설정 (필요시)
```bash
# api.neture.co.kr 설정 생성
sudo tee /etc/nginx/sites-available/api.neture.co.kr > /dev/null <<EOF
server {
    listen 80;
    server_name api.neture.co.kr;
    
    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Authorization \$http_authorization;
    }
}
EOF

# 사이트 활성화
sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4.3 SSL 인증서 설정 (필요시)
```bash
# Certbot으로 SSL 인증서 발급
sudo certbot --nginx -d api.neture.co.kr --non-interactive --agree-tos -m sohae2100@gmail.com

# 설정 확인
sudo nginx -t
```

---

### **TASK 5: 외부 접근 테스트**

#### 5.1 도메인을 통한 API 테스트
```bash
# 도메인을 통한 접근 테스트
curl -v https://api.neture.co.kr/store
curl -v https://api.neture.co.kr/health

# 도메인을 통한 회원가입 테스트
curl -X POST https://api.neture.co.kr/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-domain@example.com",
    "password": "password123",
    "first_name": "도메인",
    "last_name": "테스트"
  }' | jq '.'
```

#### 5.2 CORS 설정 확인
```bash
# CORS 헤더 확인
curl -H "Origin: https://neture.co.kr" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://api.neture.co.kr/store/auth/login -v
```

---

### **TASK 6: 프론트엔드 연동 준비**

#### 6.1 o4o-webserver 환경 변수 확인
```bash
# o4o-webserver 접속
ssh ubuntu@13.125.144.8

# 환경 변수 확인
cd /home/ubuntu/o4o-platform
cat .env | grep -E "(VITE_API|API_BASE|API_URL)"

# 필요시 환경 변수 설정
echo "VITE_API_BASE_URL=https://api.neture.co.kr" >> .env
```

#### 6.2 프론트엔드 빌드 및 재시작 (필요시)
```bash
# 프론트엔드 재빌드
npm run build

# PM2 재시작
pm2 restart all
pm2 status
```

---

## 🔍 테스트 체크리스트

### 서버 인프라 확인
- [ ] AWS o4o-apiserver 접근 가능
- [ ] 시스템 리소스 정상 (메모리, 디스크)
- [ ] PostgreSQL 서비스 정상 동작
- [ ] Common-Core 패키지 연동 상태 정상

### Medusa API 서버 확인
- [ ] Medusa 서버 정상 구동 (포트 9000)
- [ ] `/store` 엔드포인트 응답 정상 (200 OK)
- [ ] `/health` 엔드포인트 응답 정상
- [ ] 데이터베이스 마이그레이션 완료

### 인증 API 기능 확인
- [ ] 회원가입 API (`/store/auth/register`) 정상 작동
- [ ] 로그인 API (`/store/auth/login`) 정상 작동
- [ ] JWT 토큰 생성 및 검증 정상
- [ ] 인증된 요청 (`/store/customers/me`) 정상

### 도메인 및 네트워크 확인
- [ ] api.neture.co.kr 도메인 연결 정상
- [ ] HTTPS 인증서 설정 완료
- [ ] Nginx 프록시 정상 작동
- [ ] CORS 설정 적절히 구성

### 프론트엔드 연동 준비
- [ ] o4o-webserver 환경 변수 설정 완료
- [ ] 프론트엔드에서 API 서버 접근 가능
- [ ] 회원가입/로그인 플로우 테스트 준비

---

## 🚨 중요 주의사항

### 보안 및 운영
- **실제 프로덕션 환경**이므로 테스트 데이터만 사용
- 테스트 완료 후 테스트 계정 정리
- 시스템 리소스 모니터링 지속
- 기존 서비스에 영향 없도록 주의

### 작업 환경
- **사무실 환경**에서 작업 중
- 네트워크 환경이 집과 다를 수 있음
- SSH 연결 안정성 확인 필요
- 방화벽 설정 고려

### 에러 대응
- 각 단계별 결과를 반드시 확인
- 오류 발생 시 로그 수집 및 분석
- 롤백 계획 항상 준비

---

## 📊 성공 기준

### 최소 성공 기준 (Phase 1)
- [ ] Medusa 서버 안정적 구동
- [ ] 커스텀 인증 API 정상 동작
- [ ] JWT 토큰 기반 인증 시스템 작동
- [ ] 도메인을 통한 외부 접근 가능

### 완전 성공 기준 (Phase 2)
- [ ] HTTPS 도메인 완전 설정
- [ ] 프론트엔드-백엔드 API 연동 성공
- [ ] 실제 회원가입/로그인 플로우 작동
- [ ] 상품 관리 기능 구현 준비 완료

---

## 🔧 에러 발생 시 대응 방법

### Common-Core 연동 문제
```bash
# 패키지 재설치
cd /home/ubuntu/common-core
npm run build
npm link

cd /home/ubuntu/medusa-backend
npm link @renagang21/common-core
npm install
```

### Medusa 서버 구동 실패
```bash
# 로그 확인
tail -f medusa.log
pm2 logs medusa

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

### 데이터베이스 연결 문제
```bash
# PostgreSQL 재시작
sudo systemctl restart postgresql
sudo -u postgres psql -c "SELECT NOW();"
```

### 네트워크/도메인 문제
```bash
# DNS 확인
nslookup api.neture.co.kr
dig api.neture.co.kr

# 방화벽 확인
sudo ufw status
sudo iptables -L
```

---

## 📝 작업 진행 가이드

### 작업 시작 전
1. **현재 서버 상태 백업**
   - 중요 설정 파일 백업
   - 데이터베이스 백업 (필요시)
   - 실행 중인 프로세스 상태 기록

2. **작업 환경 준비**
   - SSH 연결 안정성 확인
   - 필요한 권한 및 접근 가능 여부 확인
   - 로그 모니터링 준비

### 작업 진행 중
1. **단계별 체크리스트 확인**
   - 각 TASK 완료 시 체크리스트 표시
   - 오류 발생 시 즉시 로그 수집
   - 성공 시 다음 단계로 진행

2. **실시간 모니터링**
   - 시스템 리소스 사용률 확인
   - API 응답 시간 측정
   - 에러 로그 지속 모니터링

### 작업 완료 후
1. **전체 시스템 테스트**
   - 모든 API 엔드포인트 테스트
   - 프론트엔드-백엔드 연동 확인
   - 성능 및 안정성 검증

2. **다음 단계 준비**
   - 상품 관리 기능 구현 계획
   - 추가 기능 개발 로드맵 검토
   - 작업 결과 문서화

---

**작업 우선순위:**
1. 🔥 **TASK 1-3**: 서버 상태 점검 및 API 테스트 (필수)
2. ⚡ **TASK 4-5**: 도메인 설정 및 외부 접근 (중요)
3. 🎯 **TASK 6**: 프론트엔드 연동 준비 (완료 목표)

**예상 소요 시간:** 2-4시간 (문제 없는 경우)

**긴급 상황 대응:** 작업 중 문제 발생 시 즉시 상황 보고 및 롤백 준비