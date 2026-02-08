# Cloud SQL 운영 기준선 조사 가이드

> **목적**: Migration Job 인증 실패 문제 해결을 위한 Cloud SQL 인스턴스/사용자 정합성 조사
> **작성일**: 2026-01-12
> **상태**: 조사 진행 중

---

## 1. 현재 상황 요약

### 1.1 증상

| 구분 | 상태 | 에러 |
|------|------|------|
| API Server | 기동 성공 (health OK) | Connection timeout (간헐적) |
| Migration Job | 실패 | `password authentication failed for user "o4o_api"` |

### 1.2 확인된 Cloud SQL 인스턴스

| 인스턴스 ID | PostgreSQL 버전 | 리전 | 상태 |
|-------------|-----------------|------|------|
| `neture-db` | PostgreSQL 17 | asia-northeast3 | 정상 |
| `o4o-platform-db` | PostgreSQL 15 | asia-northeast3 | 정상 |

### 1.3 현재 워크플로우 설정 (deploy-api.yml)

```
INSTANCE_CONNECTION_NAME: netureyoutube:asia-northeast3:o4o-platform-db
DB_HOST: /cloudsql/netureyoutube:asia-northeast3:o4o-platform-db
```

**결론**: 워크플로우는 `o4o-platform-db` 인스턴스를 대상으로 함

---

## 2. Task A: 조사 체크리스트

### Step 1: 워크플로우 설정 확인

**목적**: API Server / Migration Job이 바라보는 인스턴스 확인

```bash
# 1-1. deploy-api.yml에서 인스턴스 확인
grep -E "cloudsql|DB_HOST" .github/workflows/deploy-api.yml

# 1-2. Cloud Run Service 환경변수 확인
gcloud run services describe o4o-core-api \
  --region=asia-northeast3 \
  --project=netureyoutube \
  --format="yaml(spec.template.spec.containers[0].env)"

# 1-3. Cloud Run Job 환경변수 확인
gcloud run jobs describe o4o-api-migrations \
  --region=asia-northeast3 \
  --project=netureyoutube \
  --format="yaml(spec.template.spec.containers[0].env)"
```

**확인 포인트**:
- [ ] Service와 Job이 동일한 `INSTANCE_CONNECTION_NAME`을 사용하는가?
- [ ] `DB_HOST`, `DB_NAME`, `DB_USERNAME`이 일치하는가?

---

### Step 2: Cloud SQL 인스턴스 직접 접속

**목적**: 실제 DB에 사용자/데이터베이스가 존재하는지 확인

```bash
# 2-1. o4o-platform-db 인스턴스 접속
gcloud sql connect o4o-platform-db \
  --user=postgres \
  --project=netureyoutube

# 접속 후 PostgreSQL 명령어:

# 2-2. 사용자 목록 확인
\du

# 2-3. 데이터베이스 목록 확인
\l

# 2-4. 특정 사용자 존재 여부 확인
SELECT usename, usesuper FROM pg_user WHERE usename = 'o4o_api';

# 2-5. 데이터베이스 존재 여부 확인
SELECT datname FROM pg_database WHERE datname = 'o4o_platform';
```

**확인 포인트**:
- [ ] `o4o_api` 사용자가 존재하는가?
- [ ] `o4o_platform` 데이터베이스가 존재하는가?
- [ ] 사용자에게 해당 DB 접근 권한이 있는가?

---

### Step 3: neture-db 인스턴스도 동일하게 확인

```bash
# 3-1. neture-db 인스턴스 접속
gcloud sql connect neture-db \
  --user=postgres \
  --project=netureyoutube

# 동일한 PostgreSQL 명령어로 확인
\du
\l
```

**확인 포인트**:
- [ ] 이 인스턴스에도 `o4o_api` 사용자가 있는가?
- [ ] 어느 인스턴스가 실제 운영 데이터를 갖고 있는가?

---

### Step 4: 사용자 불일치 시 조치 방법

**4-1. 사용자 생성 (사용자가 없는 경우)**

```sql
-- postgres 사용자로 접속 후
CREATE USER o4o_api WITH PASSWORD 'your_secure_password';
```

**4-2. 비밀번호 재설정 (비밀번호 불일치 의심 시)**

```sql
ALTER USER o4o_api WITH PASSWORD 'new_secure_password';
```

**4-3. 데이터베이스 권한 부여**

```sql
-- 데이터베이스 소유권 부여
ALTER DATABASE o4o_platform OWNER TO o4o_api;

-- 또는 모든 권한 부여
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_api;

-- 스키마 권한 (필요시)
\c o4o_platform
GRANT ALL ON SCHEMA public TO o4o_api;
GRANT ALL ON ALL TABLES IN SCHEMA public TO o4o_api;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO o4o_api;
```

---

### Step 5: GitHub Secrets 정합성 확인

**GitHub Secrets 위치**:
```
https://github.com/Renagang21/o4o-platform/settings/secrets/actions
```

**확인해야 할 Secrets**:

| Secret Name | 용도 | 확인 방법 |
|-------------|------|-----------|
| `GCP_DB_USERNAME` | DB 사용자명 | Step 2에서 확인한 사용자와 일치? |
| `GCP_DB_PASSWORD` | DB 비밀번호 | Step 4-2로 재설정 후 동기화 |
| `GCP_DB_NAME` | 데이터베이스명 | Step 2에서 확인한 DB와 일치? |

**주의사항**:
- GitHub Secrets 값은 UI에서 직접 볼 수 없음 (마스킹됨)
- 확실하지 않으면 **비밀번호를 재설정하고 Secret도 업데이트**하는 것이 안전

---

## 3. Task B: 인스턴스 단일화 판단 기준

### 3.1 운영 인스턴스 선택 기준

| 기준 | o4o-platform-db | neture-db |
|------|-----------------|-----------|
| 워크플로우 참조 | ✅ 현재 설정됨 | ❌ |
| PostgreSQL 버전 | 15 (LTS) | 17 (최신) |
| 실제 데이터 존재 | 확인 필요 | 확인 필요 |
| 마이그레이션 이력 | 확인 필요 | 확인 필요 |

### 3.2 판단 절차

```
1. 두 인스턴스 모두 접속하여 테이블 존재 여부 확인
   - typeorm_migrations 테이블 존재 여부
   - 실제 비즈니스 테이블 존재 여부

2. 워크플로우가 참조하는 인스턴스 우선
   - 현재: o4o-platform-db

3. 데이터가 있는 인스턴스 우선
   - 둘 다 없으면 워크플로우 기준 따름
   - 둘 다 있으면 최신 마이그레이션 기준

4. PostgreSQL 버전은 부차적 기준
   - 15도 충분히 안정적
   - 17로 업그레이드는 별도 계획
```

### 3.3 인스턴스 폐기 기준 (삭제하지 않음)

**논리적 폐기 = 다음 조건 충족 시**:
- [ ] 워크플로우에서 참조하지 않음
- [ ] 실제 운영 데이터 없음 (또는 백업 완료)
- [ ] 30일 이상 접속 이력 없음

**폐기 인스턴스 처리**:
1. 인스턴스 설명에 `[DEPRECATED]` 태그 추가
2. 문서에 "사용하지 않음" 명시
3. 즉시 삭제하지 않고 1개월 유예 기간

---

## 4. Task C: 운영 기준선 선언 템플릿

### 4.1 기준선 선언문 (조사 완료 후 작성)

```markdown
## Cloud SQL 운영 기준선 (확정일: YYYY-MM-DD)

### 운영 인스턴스
- **인스턴스 ID**: ____________
- **Connection Name**: netureyoutube:asia-northeast3:____________
- **PostgreSQL 버전**: ____

### 운영 데이터베이스
- **Database Name**: o4o_platform
- **Owner**: o4o_api

### 비운영 인스턴스
- **인스턴스 ID**: ____________
- **상태**: DEPRECATED (삭제 예정일: YYYY-MM-DD)
- **사유**: 워크플로우 미참조, 데이터 없음

### 향후 DB 작업 체크포인트
모든 DB 관련 작업 전 확인:
1. [ ] 대상 인스턴스가 운영 기준선과 일치하는가?
2. [ ] GitHub Secrets가 해당 인스턴스 정보와 일치하는가?
3. [ ] 마이그레이션 대상 DB가 올바른가?
```

### 4.2 Secrets 변경 전 체크포인트

```markdown
## GitHub Secrets 변경 체크리스트

변경 전 확인:
- [ ] Cloud SQL 인스턴스에 직접 접속하여 현재 비밀번호 확인/재설정
- [ ] 변경할 Secret 이름 정확히 확인 (GCP_DB_PASSWORD 등)
- [ ] 로컬에서 동일 credentials로 접속 테스트

변경 후 확인:
- [ ] GitHub Actions 워크플로우 수동 트리거
- [ ] Cloud Run Job 실행하여 Migration 성공 확인
- [ ] API Server health check 확인
```

---

## 5. 즉시 실행 가이드

### 최우선 조사 명령어 (복사하여 실행)

```bash
# 1. o4o-platform-db 접속 (현재 워크플로우 대상)
gcloud sql connect o4o-platform-db --user=postgres --project=netureyoutube

# 접속 후 실행:
# \du                     -- 사용자 목록
# \l                      -- DB 목록
# SELECT usename FROM pg_user WHERE usename = 'o4o_api';
```

### 비밀번호 재설정 후 Secrets 업데이트

```bash
# PostgreSQL 내에서 비밀번호 재설정
ALTER USER o4o_api WITH PASSWORD 'NEW_SECURE_PASSWORD_HERE';

# GitHub Secrets 업데이트
# https://github.com/Renagang21/o4o-platform/settings/secrets/actions
# GCP_DB_PASSWORD 값을 위와 동일하게 설정
```

---

## 6. 다음 단계

이 조사가 완료되면:

1. **기준선 선언문 확정** → 이 문서 Section 4.1 채우기
2. **Migration Job 재실행** → 성공 확인
3. **WO-CLOUDRUN-MIGRATION-JOB-FIX-P0 완료 처리**

---

*이 문서는 조사 진행에 따라 업데이트됩니다.*
