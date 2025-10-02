# O4O Platform Deployment Scripts

## 서버 정보

- **API Server**: 43.202.242.215 (Ubuntu)
- **Web Server**: 13.125.144.8 (Ubuntu)

## SSH 설정

SSH 설정은 `~/.ssh/config`에 저장되어 있습니다:
- `o4o-api` 또는 `api-server`: API 서버 연결
- `o4o-web` 또는 `web-server`: Web 서버 연결

## 배포 스크립트

### 1. 전체 배포
```bash
# 빌드 후 배포
./scripts/deploy-all.sh

# 빌드 건너뛰고 배포만
./scripts/deploy-all.sh --skip-build
```

### 2. API 서버만 배포
```bash
# 빌드 후 배포
./scripts/deploy-api.sh

# 빌드 건너뛰고 배포만
./scripts/deploy-api.sh --skip-build
```

### 3. Web 서버만 배포
```bash
# 빌드 후 배포
./scripts/deploy-web.sh

# 빌드 건너뛰고 배포만
./scripts/deploy-web.sh --skip-build
```

### 4. 고급 옵션 (deploy.sh)
```bash
# API 서버만
./scripts/deploy.sh api

# Web 서버만
./scripts/deploy.sh web

# 모든 서버
./scripts/deploy.sh all

# 빌드 건너뛰기
./scripts/deploy.sh all --skip-build
```

## 배포 프로세스

### API 서버 배포
1. SSH 연결 테스트
2. 로컬 빌드 (선택사항)
3. 파일 동기화 (rsync)
4. 원격 서버에서 의존성 설치
5. PM2로 프로세스 재시작

### Web 서버 배포
1. SSH 연결 테스트
2. 로컬 빌드 (선택사항)
3. 빌드된 파일 동기화 (dist 폴더)
4. Nginx 설정 테스트 및 리로드
5. Redis 캐시 삭제

## 문제 해결

### SSH 연결 실패
```bash
# SSH 키 권한 확인
chmod 600 ~/.ssh/o4o_api_key
chmod 600 ~/.ssh/o4o_web_key_correct

# SSH 연결 테스트
ssh o4o-api "echo 'API Server OK'"
ssh o4o-web "echo 'Web Server OK'"
```

### 빌드 실패
```bash
# 의존성 재설치
pnpm install

# 캐시 삭제 후 재빌드
pnpm clean
pnpm install
pnpm run build
```

### PM2 프로세스 확인 (API 서버)
```bash
ssh o4o-api "pm2 list"
ssh o4o-api "pm2 logs o4o-api --lines 50"
```

### Nginx 상태 확인 (Web 서버)
```bash
ssh o4o-web "sudo systemctl status nginx"
ssh o4o-web "sudo nginx -t"
```

## 자동화 (GitHub Actions)

GitHub Actions를 통한 자동 배포는 `.github/workflows/deploy.yml` 파일을 참조하세요.
- main 브랜치에 push 시 자동 배포
- API와 Web 서버 병렬 배포

## 주의사항

1. 배포 전 항상 변경사항을 commit & push
2. 프로덕션 배포 전 로컬 테스트 수행
3. 데이터베이스 마이그레이션이 필요한 경우 별도 실행
4. 환경 변수(.env) 파일은 수동으로 관리
