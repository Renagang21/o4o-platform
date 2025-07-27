# GitHub Actions Workflows

이 디렉토리는 O4O Platform의 CI/CD 파이프라인을 정의합니다.

## 📋 Workflow 목록

### 1. main.yml
- **목적**: 전체 프로젝트의 메인 CI/CD 파이프라인
- **트리거**: main/develop 브랜치 push, PR
- **작업**:
  - 코드 품질 검사 (TypeScript, ESLint)
  - 모든 앱 빌드
  - API 서버 및 웹 앱 배포

### 2. api-server.yml
- **목적**: API 서버 전용 CI/CD
- **트리거**: api-server 관련 파일 변경시
- **작업**:
  - PostgreSQL 연동 테스트
  - 마이그레이션 실행
  - PM2를 통한 무중단 배포

### 3. web-apps.yml
- **목적**: 웹 애플리케이션들의 CI/CD
- **트리거**: 각 웹 앱 파일 변경시
- **작업**:
  - 변경된 앱만 감지하여 빌드
  - 정적 파일 배포
  - CDN 캐시 삭제

### 4. health-check.yml
- **목적**: 서비스 상태 모니터링
- **트리거**: 30분마다 자동 실행, 수동 실행 가능
- **작업**:
  - 모든 서비스 엔드포인트 체크
  - 서버 리소스 모니터링
  - 장애 시 알림 발송

## 🚀 사용 방법

### 수동 배포
1. GitHub Actions 탭으로 이동
2. 원하는 workflow 선택
3. "Run workflow" 버튼 클릭

### 브랜치 전략
- `main`: Production 배포
- `develop`: 개발 환경 배포
- `feature/*`: 빌드 및 테스트만 실행

## 🔐 필수 Secrets

다음 secrets가 GitHub 저장소에 설정되어야 합니다:

- `API_SERVER_SSH_KEY`: API 서버 SSH 키
- `WEB_SERVER_SSH_KEY`: 웹 서버 SSH 키
- `API_SERVER_ENV`: API 서버 환경변수
- `SLACK_WEBHOOK_URL`: (선택) Slack 알림

자세한 설정은 [SECRETS_SETUP.md](../.github/SECRETS_SETUP.md) 참조

## 📊 모니터링

### 배포 상태 확인
- Actions 탭에서 실시간 로그 확인
- 각 job의 성공/실패 상태 확인

### Health Check
- 30분마다 자동으로 모든 서비스 상태 확인
- 수동으로 실행하려면 health-check.yml workflow 실행

## 🛠️ 문제 해결

### 배포 실패 시
1. Actions 로그에서 에러 메시지 확인
2. SSH 키 권한 확인
3. 서버 디스크 공간 확인
4. PM2/Nginx 상태 확인

### 일반적인 문제
- **SSH 연결 실패**: SSH 키가 올바르게 설정되었는지 확인
- **빌드 실패**: node_modules 캐시 삭제 후 재시도
- **Health check 실패**: 서버 로그 확인

## 📝 개발 가이드

### 새 workflow 추가
1. `.github/workflows/` 디렉토리에 `.yml` 파일 생성
2. 필요한 트리거와 작업 정의
3. 테스트 후 main 브랜치에 병합

### 기존 workflow 수정
1. 별도 브랜치에서 수정
2. PR을 통해 검토
3. 테스트 환경에서 검증 후 병합