# Migration Job 실패 원인 조사 보고서

> **문서 목적**: Migration Job 실패의 가능한 원인 분석 및 조사 방향 제시
> **작성일**: 2026-01-12
> **분석 기준**: 현재 수집된 정보 + 기술적 판단

---

## 1. 현상 요약

### 1.1 실패 지점
```
Deploy to Cloud Run: ✅ 성공
Run database migrations: ❌ 실패
```

### 1.2 실패 메시지
```
Running execution...failed
Executing job failed
ERROR: (gcloud.run.jobs.execute) The execution failed.
```

### 1.3 실행된 Job 정보
- Job 이름: `o4o-api-migrations`
- Execution ID: `o4o-api-migrations-h5x5h`
- 상태: Failed

---

## 2. 가능한 원인 분석

### 2.1 원인 후보 A: DB 연결 실패

**가설**: Cloud SQL 연결이 실패했을 수 있음

**근거**:
- Migration Job의 환경변수가 secrets에서 주입됨
- Secrets 값이 방금 업데이트됨
- 값의 정확성이 100% 검증되지 않음

**확인 방법**:
```bash
gcloud run jobs executions describe o4o-api-migrations-h5x5h \
  --region=asia-northeast3 --project=netureyoutube
```

**가능성**: 중간 (30%)

---

### 2.2 원인 후보 B: migrate.js 실행 오류

**가설**: migrate.js 스크립트 자체에 문제가 있을 수 있음

**근거**:
- 최근 커밋 `f6d12b51f`: "separate migration entry point for Cloud Run Job"
- 새로운 진입점 파일이 추가됨
- ESM/CJS 호환성 문제 가능

**확인 방법**:
```bash
# Cloud Run Job 로그 확인
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=o4o-api-migrations" \
  --limit=50 --project=netureyoutube
```

**가능성**: 높음 (50%)

---

### 2.3 원인 후보 C: 마이그레이션 파일 누락

**가설**: Docker 이미지에 migration 파일이 포함되지 않았을 수 있음

**근거**:
- 커밋 `58fe4ef46`: "add migrate.js to .dockerignore whitelist"
- .dockerignore 설정 변경 이력 있음
- 워크플로우에서 backup/restore 로직 존재

**확인 방법**:
```bash
# 로컬에서 이미지 검증
docker run --rm \
  asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:latest \
  ls -la /app/dist/database/migrations/
```

**가능성**: 중간 (20%)

---

### 2.4 원인 후보 D: Cloud SQL 인스턴스 연결 권한

**가설**: Cloud Run Job이 Cloud SQL에 연결할 권한이 없을 수 있음

**근거**:
- `--set-cloudsql-instances` 플래그는 사용됨
- 하지만 Service Account 권한이 별도 필요
- Job과 Service가 다른 권한을 가질 수 있음

**확인 방법**:
```bash
gcloud run jobs describe o4o-api-migrations \
  --region=asia-northeast3 --project=netureyoutube \
  --format="yaml(spec.template.spec.serviceAccountName)"
```

**가능성**: 낮음 (10%)

---

## 3. 조사 우선순위

| 순위 | 원인 | 조사 방법 | 예상 시간 |
|------|------|-----------|-----------|
| 1 | migrate.js 실행 오류 | Job 실행 로그 확인 | 5분 |
| 2 | DB 연결 실패 | Job 환경변수 + 로그 확인 | 10분 |
| 3 | Migration 파일 누락 | Docker 이미지 내부 확인 | 10분 |
| 4 | 권한 문제 | IAM 설정 확인 | 15분 |

---

## 4. 조사 명령어 목록

### 4.1 Job 실행 상세 확인
```bash
gcloud run jobs executions describe o4o-api-migrations-h5x5h \
  --region=asia-northeast3 \
  --project=netureyoutube
```

### 4.2 Job 로그 확인
```bash
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=o4o-api-migrations AND labels.execution_name=o4o-api-migrations-h5x5h" \
  --limit=100 \
  --format="table(timestamp,textPayload)" \
  --project=netureyoutube
```

### 4.3 현재 Job 설정 확인
```bash
gcloud run jobs describe o4o-api-migrations \
  --region=asia-northeast3 \
  --project=netureyoutube \
  --format="yaml(spec)"
```

### 4.4 Docker 이미지 내부 확인
```bash
# 최신 이미지 pull
docker pull asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:latest

# 파일 구조 확인
docker run --rm \
  asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:latest \
  ls -la /app/dist/

# migrate.js 존재 확인
docker run --rm \
  asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:latest \
  cat /app/dist/migrate.js | head -50
```

---

## 5. 핵심 판단

### 5.1 가장 유력한 원인
**migrate.js 실행 시 런타임 오류**

이유:
1. 최근 커밋에서 migrate.js가 새로 추가됨
2. ESM 모듈 시스템 사용 (복잡성 증가)
3. DataSource 초기화 과정에서 실패 가능
4. Cloud Run Job 환경과 로컬 환경 차이

### 5.2 조사 시작점
Job 실행 로그를 먼저 확인하면 정확한 에러 메시지를 얻을 수 있음.
에러 메시지 없이는 추측에 불과함.

### 5.3 임시 우회 방안
만약 migrate.js 자체가 문제라면:
1. Migration 스킵하고 Service만 배포
2. 수동으로 migration 실행 (Cloud SQL Proxy 사용)
3. migrate.js 대신 기존 방식 복원

---

## 6. 연관 커밋 분석

| 커밋 | 내용 | 관련성 |
|------|------|--------|
| `f6d12b51f` | separate migration entry point | 직접 관련 - migrate.js 추가 |
| `58fe4ef46` | migrate.js dockerignore whitelist | 직접 관련 - 빌드 설정 |
| `4ca11e480` | CACHEBUST for Docker cache | 간접 관련 - 빌드 |
| `6e6ee7cec` | delimiter syntax for env vars | 직접 관련 - Job 환경변수 |

---

## 7. 다음 단계 권장

1. **즉시 실행**: Job 로그 확인 (4.2 명령어)
2. **로그 분석**: 정확한 에러 메시지 파악
3. **원인 확정**: 위 4개 후보 중 실제 원인 특정
4. **수정 계획**: 원인에 따른 수정 방향 결정

---

*이 문서는 수집된 정보를 기반으로 한 기술적 판단입니다.*
*실제 로그 확인 후 업데이트가 필요합니다.*
