# ✅ Auth 시스템 설치 체크리스트

## 📋 설치 진행 상황 체크

### 1️⃣ 서버 접속 및 코드 업데이트
```bash
ssh ubuntu@13.125.144.8
cd /home/ubuntu/o4o-platform
git pull origin main
```

### 2️⃣ 자동 설치 스크립트 실행
```bash
chmod +x ./scripts/install-common-core-auth.sh
./scripts/install-common-core-auth.sh
```

### 3️⃣ 설치 중 확인 사항
- [ ] PostgreSQL 설치/실행 확인
- [ ] common-core 저장소 클론 성공
- [ ] npm install 완료
- [ ] 데이터베이스 생성 완료
- [ ] TypeScript 빌드 성공
- [ ] PM2 서비스 시작

### 4️⃣ 설치 검증
```bash
./scripts/verify-common-core-auth.sh
```

### 5️⃣ OAuth 키 설정
```bash
nano /home/ubuntu/common-core/auth/backend/.env
```

필요한 키값들:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- NAVER_CLIENT_ID
- NAVER_CLIENT_SECRET
- KAKAO_CLIENT_ID

---

## 🔍 설치 후 확인 명령어

### 서비스 상태 확인
```bash
# PM2 프로세스 확인
pm2 status

# 로그 확인
pm2 logs auth-server --lines 50

# 헬스체크
curl http://localhost:5000/health

# 포트 확인
sudo netstat -tlnp | grep 5000
```

### PostgreSQL 확인
```bash
# PostgreSQL 상태
sudo systemctl status postgresql

# 데이터베이스 접속 테스트
sudo -u postgres psql -c "\l" | grep common_core_auth
```

---

## 🚨 문제 발생 시 대처

### npm install 실패 시
```bash
# Node.js 버전 확인 (20+ 필요)
node --version

# 캐시 정리 후 재시도
npm cache clean --force
npm install
```

### PostgreSQL 연결 실패 시
```bash
# PostgreSQL 재시작
sudo systemctl restart postgresql

# 권한 확인
sudo -u postgres psql
\du
```

### PM2 시작 실패 시
```bash
# 직접 실행 테스트
cd /home/ubuntu/common-core/auth/backend
node dist/server.js

# 에러 메시지 확인 후 수정
```

---

## 📊 설치 완료 후 상태

### 정상 설치 시 확인 사항
```
✅ PM2 리스트에 auth-server 표시
✅ http://localhost:5000/health 응답
✅ PostgreSQL에 common_core_auth DB 존재
✅ 로그에 "Server running on port 5000" 메시지
```

### 다음 단계 준비
```
1. DNS 전파 확인
2. nginx 설정 추가
3. SSL 인증서 발급
4. 소셜 로그인 테스트
```

---

## 💡 팁

### JWT Secret 생성
```bash
# 강력한 랜덤 키 생성
openssl rand -base64 32
```

### 환경변수 확인
```bash
# .env 파일 로드 테스트
cd /home/ubuntu/common-core/auth/backend
node -e "require('dotenv').config(); console.log('OAuth providers:', {
  google: !!process.env.GOOGLE_CLIENT_ID,
  naver: !!process.env.NAVER_CLIENT_ID,
  kakao: !!process.env.KAKAO_CLIENT_ID
})"
```

---

설치 중 문제가 발생하면 언제든 알려주세요!