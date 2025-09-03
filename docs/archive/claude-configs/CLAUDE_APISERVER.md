# CLAUDE.md for o4o-apiserver (API Server)

## 서버 역할 및 환경
이 서버는 **o4o-apiserver**로, API 전용 서버입니다.
- REST API와 데이터베이스 관리만 담당
- 프론트엔드 앱은 실행하지 않음
- PM2 설정: `ecosystem.config.apiserver.cjs` 사용

## 중요 작업 지침

### 1. 코드 동기화 시
```bash
# GitHub에서 최신 코드 가져오기
git pull origin main

# 의존성 업데이트
pnpm install

# API 서버 빌드
cd apps/api-server
npm run build

# 데이터베이스 마이그레이션 (필요시)
npm run migration:run

# PM2 재시작
cd ../..
npm run pm2:restart:apiserver
```

### 2. PM2 관리
```bash
# 이 서버는 반드시 apiserver 설정만 사용
npm run pm2:start:apiserver    # 시작
npm run pm2:stop:apiserver     # 중지
npm run pm2:restart:apiserver  # 재시작

# 절대 사용하지 말 것:
# npm run pm2:start:webserver (X)
# npm run pm2:start:local (X)
```

### 3. 환경 변수
`apps/api-server/.env` 파일 필수 설정:
```env
NODE_ENV=production
SERVER_TYPE=apiserver
PORT=3001

# 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=[secure_password]
DB_NAME=o4o_platform

# JWT (필수)
JWT_SECRET=[32자 이상 랜덤 문자열]
JWT_REFRESH_SECRET=[다른 32자 이상 랜덤 문자열]
```

### 4. 데이터베이스 관리
```bash
cd apps/api-server

# 마이그레이션 생성
npm run migration:generate -- -n MigrationName

# 마이그레이션 실행
npm run migration:run

# 마이그레이션 되돌리기
npm run migration:revert

# 데이터베이스 연결 테스트
psql -h localhost -U o4o_user -d o4o_platform
```

### 5. 빌드 및 실행
```bash
# API 서버만 빌드
cd apps/api-server
npm run build

# 개발 모드 실행 (디버깅용)
npm run start:dev

# 프로덕션 실행 (PM2 사용)
cd ../..
npm run pm2:start:apiserver
```

### 6. 로그 확인
```bash
pm2 logs o4o-api          # API 서버 로그
pm2 logs o4o-api --lines 100  # 최근 100줄
pm2 monit                 # 실시간 모니터링
```

## 메모리 관리
메모리 부족 시 스왑 설정:
```bash
# 스왑 파일 생성 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 영구 적용
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Node.js 메모리 설정
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 주의사항
1. **프론트엔드 빌드 금지**: 이 서버에서는 프론트엔드 앱을 빌드/실행하지 않음
2. **데이터베이스 보안**: 프로덕션 DB 비밀번호는 강력하게 설정
3. **JWT 시크릿**: 절대 기본값 사용 금지, 랜덤하게 생성
4. **포트 관리**: 3001 포트만 사용 (API 서버)

## 트러블슈팅
- DB 연결 실패: PostgreSQL 실행 상태 및 인증 설정 확인
- JWT 에러: JWT_SECRET, JWT_REFRESH_SECRET 환경변수 확인
- 메모리 부족: 스왑 설정 또는 PM2 인스턴스 수 조정
- 빌드 실패: `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

## 헬스 체크
```bash
# API 서버 상태 확인
curl http://localhost:3001/health

# PostgreSQL 상태
sudo systemctl status postgresql
```

## 서버 타입 확인
현재 서버가 apiserver인지 확인:
```bash
echo $SERVER_TYPE  # "apiserver" 출력되어야 함
cat apps/api-server/.env | grep SERVER_TYPE
```