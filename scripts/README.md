# Scripts Directory

## 🎯 주요 스크립트

### 개발 통합 도구
- `dev.sh` - 모든 개발 명령어 통합 (lint, type-check, test, build, start/stop)

### CI/CD 관련
- `setup-ci-env.sh` - CI 환경 설정
- `validate-deploy-env.sh` - 배포 환경 검증

### 배포 스크립트
- `quick-deploy-api.sh` - API 서버 빠른 배포
- `quick-deploy-web.sh` - 웹 앱 빠른 배포
- `emergency-deploy.sh` - 긴급 배포

### 백업/복구
- `backup.sh` - 데이터베이스 백업
- `restore.sh` - 백업 복원
- `setup-backup-automation.sh` - 자동 백업 설정

### SSL 관련
- `ssl-setup-commands.sh` - SSL 설정
- `ssl-verification.sh` - SSL 인증서 확인

### 데이터베이스
- `init-db.js` - DB 초기화
- `test-database.js` - DB 연결 테스트

## 🗑️ Deprecated (삭제 예정)

다음 스크립트들은 더 이상 사용하지 않으며 정리될 예정입니다:

### React 19 마이그레이션 관련 (완료됨)
- fix-react19-imports.sh
- fix-remaining-react-issues.sh
- fix-component-imports.sh
- fix-ui-imports.sh
- 기타 fix-*.sh 파일들

### 개별 명령어 스크립트 (dev.sh로 통합됨)
- run-lint.sh
- type-check-all.sh
- test-all.sh
- build-all.sh
- build-packages.sh

## 📝 사용 예시

```bash
# Lint 실행
./scripts/dev.sh lint

# Type check 실행
./scripts/dev.sh type-check

# 빌드
./scripts/dev.sh build

# 개발 서버 시작
./scripts/dev.sh start

# 개발 서버 중지
./scripts/dev.sh stop
```