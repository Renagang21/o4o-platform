# 🚀 O4O Platform 빠른 시작 가이드

## 서버별 빠른 실행 명령어

### 📦 o4o-webserver (프론트엔드만)
```bash
# 1회만 실행 (초기 설정)
git clone [repository-url] && cd o4o-platform
npm install
cp .env.webserver.example .env
# .env 파일에서 VITE_API_URL 수정

# 실행
npm run pm2:start:webserver

# 업데이트 후 재시작
git pull && npm install && npm run pm2:restart:webserver
```

### 🔧 o4o-apiserver (API만)
```bash
# 1회만 실행 (초기 설정)
git clone [repository-url] && cd o4o-platform
npm install
cp .env.apiserver.example apps/api-server/.env
# apps/api-server/.env 파일에서 DB 정보 설정

# 빌드 및 마이그레이션
cd apps/api-server
npm run build
npm run migration:run
cd ../..

# 실행
npm run pm2:start:apiserver

# 업데이트 후 재시작
git pull && npm install
cd apps/api-server && npm run build && npm run migration:run && cd ../..
npm run pm2:restart:apiserver
```

### 💻 로컬 개발 (전체 스택)
```bash
# 1회만 실행 (초기 설정)
git clone [repository-url] && cd o4o-platform
npm install
cp .env.example .env.local

# 실행
npm run pm2:start:local

# 개발 모드 (PM2 없이)
npm run dev
```

## 🔍 상태 확인
```bash
pm2 status        # 프로세스 상태
pm2 logs          # 전체 로그
pm2 monit         # 실시간 모니터링
```

## 🛑 중지/재시작
```bash
# 웹서버
npm run pm2:stop:webserver
npm run pm2:restart:webserver

# API 서버
npm run pm2:stop:apiserver
npm run pm2:restart:apiserver

# 로컬
npm run pm2:stop:local
npm run pm2:restart:local
```

## ⚠️ 트러블슈팅 체크리스트

### 메모리 부족 시
```bash
# 스왑 추가 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 포트 충돌 시
```bash
lsof -i :3001     # API 포트 확인
lsof -i :5173     # Admin 포트 확인
kill -9 [PID]     # 프로세스 종료
```

### DB 연결 실패 시
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 연결 테스트
psql -h localhost -U o4o_user -d o4o_platform
```

## 📝 환경 변수 필수 항목

### 웹서버 (.env)
- `VITE_API_URL` - API 서버 주소
- `SESSION_SECRET` - 세션 암호화 키

### API 서버 (apps/api-server/.env)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - DB 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT 토큰
- `PORT` - API 서버 포트 (기본: 3001)

---
자세한 내용은 `SERVER_DEPLOYMENT_GUIDE.md` 참조