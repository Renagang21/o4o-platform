# GitHub Secrets 설정 가이드

이 문서는 O4O Platform의 CI/CD 파이프라인에 필요한 GitHub Secrets 설정을 안내합니다.

## 인프라 구성 (2025-12 기준)

- **API 서버**: GCP Cloud Run (`o4o-core-api`)
- **데이터베이스**: GCP Cloud SQL (PostgreSQL)
- **웹서버**: 13.125.144.8 (Nginx 프록시 + Static)

## 필수 Secrets

### 1. GCP 인증

#### GCP_SA_KEY
- **설명**: GCP 서비스 계정 JSON 키 (Cloud Run 배포용)
- **생성 방법**:
  1. GCP Console → IAM & Admin → Service Accounts
  2. 서비스 계정 생성 또는 선택
  3. Keys → Add Key → Create New Key → JSON
  4. 다운로드된 JSON 파일 전체 내용을 Secret에 저장

### 2. 데이터베이스 (Cloud SQL)

#### GCP_DB_USERNAME
- **설명**: Cloud SQL PostgreSQL 사용자명

#### GCP_DB_PASSWORD
- **설명**: Cloud SQL PostgreSQL 비밀번호

#### GCP_DB_NAME
- **설명**: Cloud SQL 데이터베이스 이름

### 3. 인증 관련

#### GCP_JWT_SECRET
- **설명**: JWT 토큰 서명 시크릿 키

### 4. 웹서버 SSH (프론트엔드 배포용)

#### WEB_SERVER_SSH_KEY
- **설명**: 웹서버(13.125.144.8) 접속용 SSH 개인키
- **용도**: Admin Dashboard, Main Site 배포 시 사용

## GitHub에서 Secrets 추가하기

1. GitHub 저장소로 이동
2. Settings → Secrets and variables → Actions 클릭
3. "New repository secret" 버튼 클릭
4. Name과 Value 입력 후 저장

## 보안 주의사항

1. **절대 커밋하지 마세요**: 실제 값을 코드에 포함시키지 마세요
2. **정기적으로 교체**: 비밀번호와 키는 정기적으로 교체하세요
3. **최소 권한 원칙**: 각 키/계정은 필요한 최소한의 권한만 부여

## 문제 해결

### Cloud Run 배포 실패 시
- GitHub Actions 로그에서 GCP 인증 단계 확인
- 서비스 계정 권한 확인 (Cloud Run Admin, Artifact Registry Writer 등)

### 데이터베이스 연결 실패 시
- Cloud SQL 연결 확인 (`--add-cloudsql-instances` 옵션)
- DB 자격증명 확인

## 연락처

문제 발생 시 DevOps 팀에 문의하세요.
