# O4O Platform - 로컬 개발 환경 설정 가이드

## ✅ 완료된 설정

### 1. Google Cloud SDK
- **버전**: 550.0.0 ✅
- **프로젝트**: netureyoutube ✅
- **리전**: asia-northeast3 ✅
- **계정**: sohae2100@gmail.com ✅

### 2. 환경 파일
- `.env` 파일 생성 완료 ✅
- 로컬 개발용 환경 변수 설정 완료 ✅

### 3. GCP 리소스 확인
- Cloud Run 서비스 9개 정상 실행 ✅
- Cloud SQL 인스턴스 2개 정상 실행 ✅
- Artifact Registry 준비 완료 ✅

---

## 📋 아직 필요한 설치 항목

### 1. Node.js 설치 (필수)
**필수 버전**: 22.18.0 이상

**설치 방법**:
1. https://nodejs.org/ 방문
2. "22.x LTS" 버전 다운로드
3. 인스톨러 실행 및 설치
4. 설치 확인:
   ```cmd
   node --version
   # v22.18.0 이상이어야 함
   ```

### 2. pnpm 설치 (필수)
**필수 버전**: 9.0.0 이상

**설치 방법** (Node.js 설치 후):
```cmd
npm install -g pnpm
```

**설치 확인**:
```cmd
pnpm --version
# 9.0.0 이상이어야 함
```

### 3. Cloud SQL Proxy 설치 (GCP Cloud SQL 연결용, 필수)
**용도**: 로컬에서 GCP Cloud SQL에 안전하게 연결

**설치 방법**:
```cmd
# 프로젝트 루트에서 실행
.\setup-cloud-sql-proxy.cmd
```

이 스크립트는 자동으로:
- Cloud SQL Proxy를 다운로드하여 `bin/` 폴더에 설치
- 필요한 설정 파일 생성

**Cloud SQL Proxy 실행**:
```cmd
# 별도 터미널 창에서 실행하고 계속 열어두기
.\start-cloud-sql-proxy.cmd
```

**중요**:
- Cloud SQL Proxy는 개발 중 **항상 실행**되어 있어야 합니다
- 새 터미널 창을 열어서 백그라운드로 실행하세요
- 프록시가 실행되면 `localhost:5432`로 Cloud SQL에 연결됩니다

**데이터베이스 접속 정보**:
- **Instance**: `netureyoutube:asia-northeast3:o4o-platform-db`
- **로컬 포트**: `5432`
- **사용자명/비밀번호**: 프로젝트 관리자에게 문의 또는 GCP Console에서 확인

### 4. Docker Desktop 설치 (선택사항, 권장)
**용도**: 로컬에서 컨테이너 빌드 및 테스트

**설치 방법**:
1. https://www.docker.com/products/docker-desktop 방문
2. Windows용 Docker Desktop 다운로드
3. WSL2 백엔드 사용 설정

---

## 🚀 프로젝트 시작하기

위 필수 항목(Node.js, pnpm, Cloud SQL Proxy)을 모두 설치한 후:

### 0. Cloud SQL Proxy 시작 (항상 먼저!)
```cmd
# 별도 터미널 창에서 실행하고 열어두기
.\start-cloud-sql-proxy.cmd
```

### 1. 환경 변수 설정
`.env` 파일을 열고 Cloud SQL 비밀번호를 입력:
```env
DB_PASSWORD=YOUR_CLOUD_SQL_PASSWORD_HERE
```

### 2. 의존성 설치
```cmd
pnpm install
```

### 3. 패키지 빌드
```cmd
pnpm run build:packages
```

### 4. API 서버 빌드
```cmd
pnpm run build:api
```

### 5. 데이터베이스 마이그레이션 (선택사항)
```cmd
cd apps/api-server
pnpm run migration:run
```

### 6. 개발 서버 실행

**전체 개발 서버** (웹 + 관리자):
```cmd
pnpm run dev
```

**API 서버만**:
```cmd
pnpm run dev:api
```

**Admin Dashboard만**:
```cmd
pnpm run dev:admin
```

**Main Site만**:
```cmd
pnpm run dev:web
```

---

## 📊 GCP 서비스 URL

### Cloud Run 서비스
| 서비스 | URL |
|--------|-----|
| API Server | https://o4o-core-api-117791934476.asia-northeast3.run.app |
| Admin Dashboard | https://o4o-admin-dashboard-117791934476.asia-northeast3.run.app |
| Admin Dev | https://o4o-admin-dashboard-dev-117791934476.asia-northeast3.run.app |
| Main Site | https://o4o-main-site-117791934476.asia-northeast3.run.app |
| Neture Web | https://neture-web-117791934476.asia-northeast3.run.app |
| Glycopharm Web | https://glycopharm-web-117791934476.asia-northeast3.run.app |
| Glucoseview Web | https://glucoseview-web-117791934476.asia-northeast3.run.app |
| K-Cosmetics Web | https://k-cosmetics-web-117791934476.asia-northeast3.run.app |
| KPA Society Web | https://kpa-society-web-117791934476.asia-northeast3.run.app |

### Cloud SQL 인스턴스
| 인스턴스 | 버전 | IP |
|---------|------|-----|
| o4o-platform-db | PostgreSQL 15 | 34.64.96.252 |
| neture-db | PostgreSQL 17 | 34.22.71.145 |

### Artifact Registry
- **리포지토리**: `asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api`
- **용량**: ~10.5 GB

---

## 🛠️ 유용한 명령어

### gcloud CLI 사용
프로젝트 루트에서 `gcloud.cmd`를 사용하여 gcloud 명령어 실행:
```cmd
.\gcloud.cmd run services list
.\gcloud.cmd sql instances list
.\gcloud.cmd artifacts repositories list --location=asia-northeast3
```

### 빌드 및 테스트
```cmd
# 타입 체크
pnpm run type-check

# 린트
pnpm run lint

# 린트 자동 수정
pnpm run lint:fix

# 전체 빌드
pnpm run build
```

### Cloud Run 배포
```cmd
# API 서버 배포 (GitHub Actions 자동 실행)
git push origin main

# 수동 배포 트리거
.\gcloud.cmd run deploy o4o-core-api \
  --region=asia-northeast3 \
  --image=asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:latest
```

---

## 🔐 환경 변수 (.env)

`.env` 파일이 프로젝트 루트에 생성되어 있습니다.

**중요**: 프로덕션 환경 변수는 GitHub Secrets에서 관리됩니다.

---

## 📚 참고 문서

- [CLAUDE.md](./CLAUDE.md) - 플랫폼 개발 헌법 (최상위 규칙)
- [package.json](./package.json) - 프로젝트 스크립트 및 의존성
- [.github/workflows/deploy-api.yml](./.github/workflows/deploy-api.yml) - API 서버 배포 워크플로우
- [.github/workflows/deploy-web-services.yml](./.github/workflows/deploy-web-services.yml) - 웹 서비스 배포 워크플로우

---

## ❓ 문제 해결

### Cloud SQL 연결 오류
1. **Cloud SQL Proxy가 실행 중인지 확인**:
   ```cmd
   # 별도 터미널에서 실행되어 있어야 함
   .\start-cloud-sql-proxy.cmd
   ```

2. **`.env` 파일의 DB 설정 확인**:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=YOUR_CLOUD_SQL_PASSWORD_HERE
   DB_NAME=o4o_platform
   ```

3. **GCP 인증 확인**:
   ```cmd
   .\gcloud.cmd auth application-default login
   ```

4. **Cloud SQL 인스턴스 상태 확인**:
   ```cmd
   .\gcloud.cmd sql instances describe o4o-platform-db
   ```

### 빌드 오류
```cmd
# 캐시 정리 후 재설치
pnpm clean
pnpm install
pnpm run build:packages
```

### gcloud 명령어 오류
전체 경로 사용 또는 프로젝트 루트의 `gcloud.cmd` 사용:
```cmd
.\gcloud.cmd config list
```

---

*최종 업데이트: 2026-01-07*
*환경 설정 완료 상태: gcloud ✅, .env ✅, Cloud SQL Proxy Scripts ✅, Node.js ⏳, pnpm ⏳*
