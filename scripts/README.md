# O4O Platform Scripts

이 디렉토리에는 O4O Platform 개발, 배포, 운영에 필요한 스크립트들이 포함되어 있습니다.

## 📋 스크립트 목록

### 🔧 개발 (Development)
- **`dev.sh`** - 메인 개발 스크립트
  ```bash
  ./scripts/dev.sh lint          # ESLint 실행
  ./scripts/dev.sh lint:fix      # ESLint 자동 수정
  ./scripts/dev.sh type-check    # TypeScript 검사
  ./scripts/dev.sh test          # 테스트 실행
  ./scripts/dev.sh build         # 전체 빌드
  ./scripts/dev.sh start         # 개발 서버 시작
  ./scripts/dev.sh stop          # 개발 서버 중지
  ```

### 🚀 배포 (Deployment)
- **`deploy.sh`** - 통합 배포 스크립트
  ```bash
  ./scripts/deploy.sh api        # API 서버만 배포
  ./scripts/deploy.sh web        # 웹 앱만 배포
  ./scripts/deploy.sh all        # 전체 배포
  ./scripts/deploy.sh all --emergency  # 긴급 배포 (테스트 스킵)
  ```

### 🔐 SSL 관리
- **`ssl-setup.sh`** - SSL 인증서 설정 및 관리
  ```bash
  ./scripts/ssl-setup.sh setup        # SSL 초기 설정
  ./scripts/ssl-setup.sh verify       # SSL 인증서 확인
  ./scripts/ssl-setup.sh renew        # SSL 인증서 갱신
  ./scripts/ssl-setup.sh troubleshoot # SSL 문제 해결
  ```

### 💾 백업/복구
- **`backup.sh`** - 데이터베이스 및 파일 백업
- **`restore.sh`** - 백업에서 복구
- **`backup-monitoring.sh`** - 백업 상태 모니터링
- **`setup-backup-automation.sh`** - 자동 백업 설정

### 🔍 모니터링/헬스체크
- **`health-check.sh`** - 서비스 헬스체크
- **`health-check.js`** - Node.js 헬스체크 스크립트
- **`server-diagnosis.sh`** - 서버 진단 도구

### 🗄️ 데이터베이스
- **`init-db.js`** - 데이터베이스 초기화
- **`test-database.js`** - 데이터베이스 연결 테스트

### 🔧 CI/CD
- **`ci-install.sh`** - CI/CD용 의존성 설치
- **`ci-debug.sh`** - CI/CD 디버깅 및 검증
  ```bash
  ./scripts/ci-debug.sh setup     # CI 환경 설정
  ./scripts/ci-debug.sh validate  # 배포 환경 검증
  ./scripts/ci-debug.sh test      # CI 빌드 테스트
  ```

### 🛠️ 유틸리티
- **`validate-dependencies.sh`** - 의존성 유효성 검사
- **`measure-performance.sh`** - 성능 측정
- **`production-test.sh`** - 프로덕션 테스트
- **`quick-setup-server.sh`** - 서버 빠른 설정
- **`security-audit-fallback.sh`** - 보안 감사 (package-lock.json 없을 때)

## 📝 사용 가이드

### 일반 개발 워크플로우
```bash
# 1. 의존성 설치
npm install

# 2. 패키지 빌드
./scripts/dev.sh build:packages

# 3. 개발 서버 시작
./scripts/dev.sh start

# 4. 코드 검사
./scripts/dev.sh lint
./scripts/dev.sh type-check

# 5. 개발 서버 중지
./scripts/dev.sh stop
```

### 배포 워크플로우
```bash
# 1. 테스트 및 빌드
./scripts/dev.sh test
./scripts/dev.sh build

# 2. 배포
./scripts/deploy.sh all

# 3. 헬스체크
./scripts/health-check.sh
```

### 백업/복구
```bash
# 백업 생성
./scripts/backup.sh

# 백업에서 복구
./scripts/restore.sh /backup/o4o-platform/backup_20250129.tar.gz

# 자동 백업 설정
sudo ./scripts/setup-backup-automation.sh
```

## ⚠️ 주의사항

1. **권한**: 일부 스크립트는 sudo 권한이 필요합니다 (SSL, 백업 자동화 등)
2. **환경변수**: 배포 스크립트는 SSH_PRIVATE_KEY 환경변수가 필요합니다
3. **서버별 실행**: 일부 스크립트는 특정 서버에서만 실행해야 합니다
   - API 서버: `init-db.js`, 데이터베이스 관련 스크립트
   - 웹 서버: SSL 설정 스크립트

## 🧹 정리 내역

2025년 2월 초 대대적인 스크립트 정리를 통해 51개에서 19개로 줄였습니다:
- 일회성 수정 스크립트 삭제 (fix-*.sh)
- 중복 스크립트 통합 (배포, SSL, CI/CD)
- 임시 해결책 스크립트 제거
- 기능별 통합 스크립트 생성