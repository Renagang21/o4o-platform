# O4O Platform Deployment Scripts

## 현재 권장 스크립트 (Active)

### API Server (Local)
- **`deploy-api-local.sh`** - 🟢 **권장**: API 서버 로컬 배포 (현재 환경용)
  ```bash
  # 전체 배포 (권장)
  ./scripts/deploy-api-local.sh
  
  # 빠른 재배포 (의존성 설치 건너뛰기)
  ./scripts/deploy-api-local.sh --skip-deps
  
  # 초고속 재배포 (빌드도 건너뛰기)
  ./scripts/deploy-api-local.sh --skip-build --skip-deps
  ```

### Web Server
- **`deploy-web.sh`** - 웹서버 배포용
- **`deploy-main-site.sh`** - 메인 사이트 배포용

### 통합 배포
- **`deploy.sh`** - 통합 배포 스크립트
  ```bash
  ./scripts/deploy.sh api    # API 서버만
  ./scripts/deploy.sh web    # 웹 서버만  
  ./scripts/deploy.sh all    # 전체
  ```

## 더 이상 사용하지 않는 스크립트 (Deprecated)

⚠️ **다음 스크립트들은 더 이상 사용하지 마세요:**

### API Server (Old/Remote)
- ~~`deploy-api.sh`~~ - SSH로 외부 서버 배포 (연결 불가)
- ~~`deploy-api-production.sh`~~ - 복잡한 의존성 설치 포함
- ~~`deploy-api-simple.sh`~~ - deploy-api-local.sh로 대체됨
- ~~`deploy-apiserver.sh`~~ - 구버전

### 기타 Deprecated
- ~~`deploy-with-ssh.sh`~~ - SSH 배포 (연결 문제)
- ~~`deploy-unified.sh`~~ - 복잡한 통합 스크립트
- ~~`deploy-with-rollback.sh`~~ - 롤백 기능 (현재 미사용)

## 환경별 사용법

### 개발 환경 (현재)
```bash
# API 서버 배포
./scripts/deploy-api-local.sh

# 웹 서버 배포  
./scripts/deploy-web.sh

# 전체 배포
./scripts/deploy.sh all
```

### CI/CD 환경
CI/CD에서는 빌드만 수행하고, 실제 배포는 각 서버에서 로컬 스크립트 실행

## PM2 프로세스 관리

```bash
# 상태 확인
pm2 list

# 로그 확인
pm2 logs o4o-api-production

# 재시작
pm2 restart o4o-api-production

# 중지
pm2 stop o4o-api-production
```

## 문제 해결

### API 서버가 시작되지 않는 경우
1. 로그 확인: `pm2 logs o4o-api-production`
2. 수동 시작: `./test-api-server.sh`
3. 포트 확인: `ss -tlnp | grep :4000`

### 의존성 문제
```bash
# 의존성 강제 재설치
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 빌드 문제
```bash
# API 서버 개별 빌드
cd apps/api-server
npm run build
```