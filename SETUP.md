# O4O Platform — 로컬 실행환경 정본

> 이 문서는 **로컬 개발 실행환경의 단일 기준(SSOT)** 입니다.
> 개발 규칙·아키텍처 경계·운영 정책은 [CLAUDE.md](CLAUDE.md)를 따릅니다.

---

## 1. 필수 도구

| 도구 | 버전 | 확인 |
|---|---|---|
| Node.js | 22.18.0 이상 | `node --version` |
| pnpm | 9.0.0 이상 | `pnpm --version` |
| gcloud CLI | 최신 | `gcloud --version` |
| Cloud SQL Proxy | 최신 | `bin/cloud-sql-proxy.exe` 존재 |

Node/pnpm 버전은 루트 `package.json`의 Volta 설정에 고정되어 있습니다.
Volta 사용 시 저장소 디렉터리에서 자동으로 해당 버전이 적용됩니다.

Docker Desktop은 컨테이너 빌드를 로컬에서 재현할 때만 필요합니다(선택).

---

## 2. 최초 1회 설정

### 2-1. 의존성 설치

```bash
pnpm install
```

### 2-2. Cloud SQL Proxy 설치

```cmd
.\setup-cloud-sql-proxy.cmd
```

`bin/cloud-sql-proxy.exe`(약 15MB)를 내려받습니다. 이미 존재하면 건너뛰어도 됩니다.

### 2-3. GCP 인증 (Application Default Credentials)

```cmd
gcloud auth application-default login
```

브라우저에서 GCP 프로젝트 접근 권한이 있는 계정으로 로그인합니다.
Cloud SQL Proxy가 이 자격증명을 사용하므로, 계정에 **Cloud SQL Client** IAM 역할이 필요합니다.

프로젝트가 `netureyoutube`인지 확인:

```cmd
gcloud config get-value project
```

### 2-4. 환경변수 파일 생성

```bash
cp .env.example .env
```

`.env`에서 최소한 아래 값을 채웁니다.

```env
DB_PASSWORD=<Cloud SQL 비밀번호>
```

비밀번호는 GCP Console → Cloud SQL → `o4o-platform-db` → 사용자, 또는 프로젝트 관리자를 통해 확인합니다.
**`.env`는 절대 커밋하지 않습니다** (`.gitignore` 처리됨).

API 서버 전용 항목은 [apps/api-server/env.example](apps/api-server/env.example)를 참조하세요.

---

## 3. 개발 시작 (매일)

로컬에는 PostgreSQL을 설치하지 않고, **Cloud SQL Proxy를 통해 GCP Cloud SQL에 연결**합니다.

### 터미널 1 — Cloud SQL Proxy (계속 실행)

```cmd
.\start-cloud-sql-proxy.cmd
```

```
Instance: netureyoutube:asia-northeast3:o4o-platform-db
Local Port: 5432
Listening on 127.0.0.1:5432
```

이 창은 개발 중 닫지 않습니다. 종료는 `Ctrl+C`.

### 터미널 2 — 개발 서버

```bash
pnpm run build:packages   # 최초 1회 또는 packages/ 수정 시
pnpm run dev:admin        # Admin Dashboard  → http://localhost:5173
pnpm run dev:api          # API 서버         → http://localhost:3001
pnpm run dev:web          # Main Site
pnpm run dev              # web + admin 동시
```

API 상태 확인: `curl http://localhost:3001/health`

---

## 4. 데이터베이스

| 항목 | 값 |
|---|---|
| 연결 방식 | Cloud SQL Proxy (`localhost:5432`) |
| Instance | `netureyoutube:asia-northeast3:o4o-platform-db` |
| Database | `o4o_platform` |
| 엔진 | PostgreSQL |

환경변수 키는 `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` 입니다.

다른 인스턴스(`neture-db` 등)에 연결하려면 `start-cloud-sql-proxy.cmd`의
`INSTANCE_CONNECTION_NAME`을 수정합니다.

**마이그레이션은 `main` 배포 시 CI/CD에서 자동 실행**됩니다 (CLAUDE.md §0).
로컬 수동 실행은 예외 상황에 한정합니다.

```bash
pnpm --filter @o4o/api-server migration:run
```

프로덕션 DB에 대한 접근 정책·검증 채널은 [CLAUDE.md](CLAUDE.md) §0을 따릅니다.

---

## 5. 검증 명령

```bash
pnpm run type-check
pnpm run lint
pnpm run lint:fix
pnpm test
pnpm run verify           # 레지스트리 검증 (shortcode / block / CPT)
```

커밋 전 최소 `type-check` + `lint`를 실행합니다.
브랜치 전략과 커밋·푸시 절차는 [CLAUDE.md](CLAUDE.md) §1을 따릅니다
(`main` 직접 작업, path-specific staging).

---

## 6. 문제 해결

### DB 연결 실패
1. Cloud SQL Proxy가 실행 중인지 확인 (터미널 1)
2. `.env`의 `DB_PASSWORD` 확인
3. `gcloud auth application-default login` 재실행
4. `gcloud sql instances describe o4o-platform-db`로 인스턴스 상태 확인
5. `gcloud services enable sqladmin.googleapis.com` (API 미활성 시)

### `Module not found` 빌드 에러
```bash
pnpm run build:packages
```

### 포트 충돌
```cmd
netstat -ano | findstr :5432
netstat -ano | findstr :5173
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```
Cloud SQL Proxy 포트를 바꾸려면 `start-cloud-sql-proxy.cmd`의 `LOCAL_PORT`와
`.env`의 `DB_PORT`를 함께 변경합니다.

### 빌드 캐시 문제
```bash
pnpm run clean
rm -rf node_modules
pnpm install
pnpm run build:packages
```

### 메모리 부족
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Cloud SQL Proxy 다운로드 실패
https://cloud.google.com/sql/docs/postgres/sql-proxy 에서 직접 받아 `bin/cloud-sql-proxy.exe`로 저장합니다.

---

## 7. 프로덕션 참조 (읽기 전용)

| 서비스 | Cloud Run |
|---|---|
| API Server | `o4o-core-api` |
| Admin Dashboard | `o4o-admin-dashboard` |
| Main Site | `o4o-main-site` |
| Neture / GlycoPharm / K-Cosmetics / KPA-Society | `*-web` |

- Cloud Run: https://console.cloud.google.com/run?project=netureyoutube
- Cloud SQL: https://console.cloud.google.com/sql?project=netureyoutube
- 프로덕션 환경변수는 GitHub Secrets에서 관리합니다.

---

## 8. 관련 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 개발 규칙 · 아키텍처 경계 · 운영 정책 (최상위) |
| [README.md](README.md) | 저장소 개요 |
| [scripts/README.md](scripts/README.md) | 스크립트 시스템 |
| [docs/README.md](docs/README.md) | 문서 폴더 구조 |

---

*로컬 실행환경 단일 기준 문서. 실행환경 관련 안내는 이 문서에만 유지합니다.*
