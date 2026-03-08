# GCP Cloud SQL 연결 가이드 (로컬 개발)

이 가이드는 로컬 개발 환경에서 GCP Cloud SQL에 연결하는 방법을 설명합니다.

## 📋 개요

로컬에 PostgreSQL을 설치하지 않고, **Cloud SQL Proxy**를 사용하여 GCP Cloud SQL에 직접 연결합니다.

## 🎯 장점

- ✅ 로컬 PostgreSQL 설치 불필요
- ✅ 프로덕션 데이터베이스와 동일한 환경
- ✅ 안전한 인증 및 암호화된 연결
- ✅ 여러 Cloud SQL 인스턴스 쉽게 전환 가능

## 🔧 설정 방법

### 1단계: Cloud SQL Proxy 설치

프로젝트 루트에서 실행:

```cmd
.\setup-cloud-sql-proxy.cmd
```

이 스크립트는:
- Cloud SQL Proxy를 `bin/cloud-sql-proxy.exe`에 다운로드
- 약 15MB 크기 (최초 1회만 실행)

### 2단계: 환경 변수 설정

`.env` 파일을 열고 Cloud SQL 비밀번호를 입력:

```env
DB_PASSWORD=YOUR_CLOUD_SQL_PASSWORD_HERE
```

**비밀번호 확인 방법**:

1. GCP Console에서:
   ```
   https://console.cloud.google.com/sql/instances/o4o-platform-db/users?project=netureyoutube
   ```

2. gcloud CLI로:
   ```cmd
   .\gcloud.cmd sql users list --instance=o4o-platform-db
   ```

### 3단계: GCP 인증

Application Default Credentials 설정:

```cmd
.\gcloud.cmd auth application-default login
```

이 명령은:
- 브라우저에서 Google 계정 로그인 창 열림
- 로그인 후 로컬에 자격 증명 저장
- Cloud SQL Proxy가 이 자격 증명을 사용

## 🚀 사용 방법

### Cloud SQL Proxy 시작

**별도 터미널 창**을 열고 다음 명령 실행:

```cmd
.\start-cloud-sql-proxy.cmd
```

출력 예시:
```
============================================================
O4O Platform - Starting Cloud SQL Proxy
============================================================

Starting Cloud SQL Proxy...
Instance: netureyoutube:asia-northeast3:o4o-platform-db
Local Port: 5432

NOTE: Keep this window open while developing
Press Ctrl+C to stop the proxy

Listening on 127.0.0.1:5432
```

**중요**:
- 이 터미널 창을 **닫지 말고** 계속 열어두세요
- 개발이 끝나면 `Ctrl+C`로 종료
- 다음 개발 세션에서 다시 실행

### 애플리케이션 실행

Cloud SQL Proxy가 실행 중인 상태에서, **다른 터미널 창**에서:

```cmd
# 의존성 설치 (최초 1회)
pnpm install

# 패키지 빌드
pnpm run build:packages

# 개발 서버 실행
pnpm run dev
```

## 🔍 연결 확인

### 방법 1: psql 사용 (PostgreSQL 클라이언트 필요)

```cmd
psql -h localhost -p 5432 -U postgres -d o4o_platform
```

### 방법 2: DBeaver 또는 pgAdmin 사용

연결 정보:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `o4o_platform`
- **Username**: `postgres` (또는 설정된 사용자)
- **Password**: `.env` 파일에 설정한 비밀번호

### 방법 3: API 서버 Health Check

```cmd
# API 서버 실행 후
curl http://localhost:3001/health
```

## 📊 사용 가능한 Cloud SQL 인스턴스

현재 프로젝트에는 2개의 Cloud SQL 인스턴스가 있습니다:

| 인스턴스 | 버전 | 연결 이름 |
|---------|------|-----------|
| o4o-platform-db | PostgreSQL 15 | `netureyoutube:asia-northeast3:o4o-platform-db` |
| neture-db | PostgreSQL 17 | `netureyoutube:asia-northeast3:neture-db` |

다른 인스턴스에 연결하려면 `start-cloud-sql-proxy.cmd`를 편집하세요.

## ❓ 문제 해결

### 문제: "Cannot connect to Cloud SQL instance"

**해결 방법**:

1. **GCP 인증 확인**:
   ```cmd
   .\gcloud.cmd auth application-default login
   ```

2. **Cloud SQL API 활성화 확인**:
   ```cmd
   .\gcloud.cmd services enable sqladmin.googleapis.com
   ```

3. **인스턴스 상태 확인**:
   ```cmd
   .\gcloud.cmd sql instances describe o4o-platform-db
   ```

### 문제: "Permission denied"

**해결 방법**:

1. **IAM 권한 확인**:
   - GCP Console → IAM
   - 계정에 `Cloud SQL Client` 역할 필요

2. **프로젝트 확인**:
   ```cmd
   .\gcloud.cmd config get-value project
   # netureyoutube 여야 함
   ```

### 문제: "Port 5432 already in use"

**해결 방법**:

1. **기존 프로세스 확인**:
   ```cmd
   netstat -ano | findstr :5432
   ```

2. **옵션 1**: 기존 프로세스 종료
3. **옵션 2**: 다른 포트 사용
   - `start-cloud-sql-proxy.cmd` 편집
   - `LOCAL_PORT=5433`으로 변경
   - `.env`의 `DB_PORT=5433`으로 변경

### 문제: Cloud SQL Proxy 다운로드 실패

**해결 방법**:

수동 다운로드:
1. https://cloud.google.com/sql/docs/mysql/sql-proxy#install
2. `cloud-sql-proxy.exe` 다운로드
3. `bin/` 폴더에 저장

## 🔐 보안 주의사항

- ✅ `.env` 파일은 절대 Git에 커밋하지 마세요
- ✅ Cloud SQL 비밀번호는 안전하게 보관하세요
- ✅ Application Default Credentials는 로컬 머신에만 저장됩니다
- ✅ Cloud SQL Proxy는 암호화된 연결을 사용합니다

## 📚 추가 자료

- [Cloud SQL Proxy 공식 문서](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [O4O Platform SETUP.md](./SETUP.md)
- [CLAUDE.md - 플랫폼 헌법](./CLAUDE.md)

---

*최종 업데이트: 2026-01-07*
*작성자: O4O Platform Team*
