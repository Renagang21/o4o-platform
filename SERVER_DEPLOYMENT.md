# 🚀 O4O Platform 서버별 배포 가이드

## 📋 서버 구성

### 1. o4o-webserver (프론트엔드 서버)
- **역할**: Admin Dashboard, Storefront 등 프론트엔드 앱 서빙
- **포트**: 
  - Admin: 5173
  - Storefront: 5174
- **특징**: API 서버 제외

### 2. o4o-apiserver (API 서버)
- **역할**: REST API, 데이터베이스 연동
- **포트**: 3001
- **특징**: 프론트엔드 앱 제외

### 3. 로컬 개발 환경
- **역할**: 개발용 전체 스택 실행
- **특징**: 모든 서비스 포함

---

## 🔧 서버별 실행 방법

### o4o-webserver에서 실행
```bash
# 1. 코드 최신화
git pull origin main

# 2. 의존성 설치
npm install

# 3. PM2로 프론트엔드만 실행
npm run pm2:start:webserver

# 또는 개별 실행
npm run dev:admin     # Admin Dashboard만
npm run dev:web       # Storefront만
```

### o4o-apiserver에서 실행
```bash
# 1. 코드 최신화
git pull origin main

# 2. 의존성 설치
npm install

# 3. 데이터베이스 마이그레이션
cd apps/api-server
npm run migration:run

# 4. PM2로 API 서버만 실행
npm run pm2:start:apiserver

# 또는 개발 모드로 실행
cd apps/api-server
npm run start:dev
```

### 로컬 개발 환경에서 실행
```bash
# 전체 스택 실행 (API + 프론트엔드)
npm run pm2:start:local

# 또는 개별 실행
npm run dev:api       # API 서버
npm run dev           # 프론트엔드 앱들
```

---

## ⚙️ PM2 관리 명령어

### 상태 확인
```bash
pm2 status
pm2 logs
```

### 서비스 중지
```bash
# 웹서버
npm run pm2:stop:webserver

# API 서버
npm run pm2:stop:apiserver

# 로컬
npm run pm2:stop:local
```

### 서비스 재시작
```bash
# 웹서버
npm run pm2:restart:webserver

# API 서버
npm run pm2:restart:apiserver

# 로컬
npm run pm2:restart:local
```

---

## 🔒 환경 변수 설정

### 웹서버 (.env)
```env
NODE_ENV=production
VITE_API_URL=http://o4o-apiserver:3001
```

### API 서버 (.env)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

### 로컬 개발 (.env.local)
```env
NODE_ENV=development
VITE_API_URL=http://localhost:3001
```

---

## ⚠️ 주의사항

1. **서버 간 설정 충돌 방지**
   - 각 서버는 자신의 ecosystem 파일만 사용
   - 공통 `ecosystem.config.cjs`는 사용하지 않음

2. **Git Pull 시 주의**
   - 서버별 설정이 덮어쓰여지지 않도록 주의
   - 필요시 `.gitignore`에 서버별 설정 추가

3. **포트 충돌 방지**
   - 각 서버에서 사용하는 포트가 겹치지 않도록 확인
   - 방화벽 설정 확인

4. **데이터베이스 연결**
   - API 서버만 데이터베이스에 직접 연결
   - 웹서버는 API를 통해서만 데이터 접근

---

## 📊 모니터링

### PM2 모니터링
```bash
pm2 monit
```

### 로그 확인
```bash
# 웹서버 로그
pm2 logs o4o-admin
pm2 logs o4o-storefront

# API 서버 로그
pm2 logs o4o-api
```

### 메모리/CPU 사용량
```bash
pm2 list
pm2 show [app-name]
```