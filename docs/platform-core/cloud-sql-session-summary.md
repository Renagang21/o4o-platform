# Cloud SQL 기준선 확정 세션 요약

> **문서 목적**: 2026-01-12 세션에서 진행된 Cloud SQL DB 기준선 조사 및 설정 작업 전체 정리
> **작성일**: 2026-01-12
> **상태**: 작업 미완료 (Migration Job 실패)

---

## 1. 세션 시작 배경

### 1.1 사용자 초기 요청
사용자가 제시한 정보:
- 실제 운영 환경변수: `neture-db / neture_admin / neture`
- 기존 워크플로우: `o4o-platform-db / o4o_api` 기준
- 요청: DB 기준선을 `neture-db`로 통일

### 1.2 작업 지시
1. TypeORM DataSource 설정 수정
2. Migration Job 설정 수정
3. deploy-api.yml 환경변수 수정
4. 비밀번호는 GitHub Secrets로만 처리

---

## 2. 1차 수정 시도

### 2.1 수정 내용
`deploy-api.yml`에서 6개 위치 수정:
- `o4o-platform-db` → `neture-db`

### 2.2 사용자 중단
**사용자 판단**: "어느 DB가 맞는지 불확실"
- 가정이 아닌 사실 확인 필요
- "운영 감사(Audit) 모드"로 전환 결정

### 2.3 롤백
수정 내용 원복 완료

---

## 3. 운영 환경 사실 조사

### 3.1 Cloud SQL 인스턴스 현황
```
NAME             DATABASE_VERSION  LOCATION           TIER         STATUS
neture-db        POSTGRES_17       asia-northeast3-c  db-g1-small  RUNNABLE
o4o-platform-db  POSTGRES_15       asia-northeast3-a  db-f1-micro  RUNNABLE
```

### 3.2 각 인스턴스 상세

| 인스턴스 | 데이터베이스 | 사용자 |
|----------|--------------|--------|
| `o4o-platform-db` | `o4o_platform` | `o4o_api`, postgres |
| `neture-db` | `neture` | `neture_admin`, postgres |

### 3.3 Cloud Run Service 실제 환경변수
```yaml
DB_HOST: /cloudsql/netureyoutube:asia-northeast3:o4o-platform-db
DB_USERNAME: o4o_api
DB_PASSWORD: O4oPlatform2025!
DB_NAME: o4o_platform
```

### 3.4 조사 결론
**운영 DB 기준선**: `o4o-platform-db / o4o_platform / o4o_api`

사용자가 처음 제시한 `neture-db`는 **별개의 인스턴스**였음.
현재 워크플로우의 `o4o-platform-db` 설정이 **올바른 설정**이었음.

---

## 4. 2차 작업: Secrets 정합성 확보

### 4.1 GitHub Secrets 업데이트
사용자 요청에 따라 secrets를 운영 값과 일치시킴:
```
GCP_DB_USERNAME = o4o_api
GCP_DB_PASSWORD = O4oPlatform2025!
GCP_DB_NAME = o4o_platform
```

### 4.2 Workflow Dispatch 실행
- Run ID: 20911516530
- 트리거: workflow_dispatch (수동)
- 시간: 2026-01-12T07:39:06Z

---

## 5. 결과: Migration Job 실패

### 5.1 Workflow 진행 상황
| Step | 상태 |
|------|------|
| Checkout code | ✅ |
| Install dependencies | ✅ |
| Build all packages | ✅ |
| Build API server | ✅ |
| Build and Push Docker image | ✅ |
| Deploy to Cloud Run | ✅ |
| **Run database migrations** | ❌ FAILED |

### 5.2 실패 상세
```
gcloud run jobs execute o4o-api-migrations \
  --region=asia-northeast3 \
  --project=netureyoutube \
  --wait

Creating execution...
Provisioning resources..........done
Starting execution...done
Running execution...failed
ERROR: (gcloud.run.jobs.execute) The execution failed.
```

### 5.3 Migration Job 상태
- Job 생성/업데이트: 성공
- Job 실행: 실패
- 실패 원인: 조사 필요 (Cloud Run Job 로그 미확인)

---

## 6. 현재 상태

| 항목 | 상태 |
|------|------|
| Cloud Run Service (o4o-core-api) | ✅ 배포 성공 |
| Migration Job (o4o-api-migrations) | ❌ 실행 실패 |
| GitHub Secrets | ✅ 업데이트 완료 |
| 코드 변경 | 없음 |

---

## 7. 미해결 과제

1. **Migration Job 실패 원인 규명**
   - Cloud Run Job 로그 확인 필요
   - DB 연결 문제 vs 마이그레이션 스크립트 문제

2. **배포 연속 실패 원인**
   - 2026-01-11 13:12 이후 15회 연속 실패
   - Phase 5-9A 커밋 이후 발생

3. **DB 이중 구조 정리**
   - `o4o-platform-db`: 운영 중
   - `neture-db`: 용도 불명

---

## 8. 세션 타임라인

| 시간 | 작업 |
|------|------|
| 세션 시작 | neture-db 기준 수정 요청 |
| 중단 | 사용자: "어느 DB가 맞는지 불확실" |
| 롤백 | deploy-api.yml 원복 |
| 조사 | Cloud Run/SQL 실제 환경 확인 |
| 발견 | o4o-platform-db가 실제 운영 DB |
| Secrets 업데이트 | GCP_DB_* 값 설정 |
| Workflow 실행 | Migration Job 실패로 종료 |
| 세션 종료 | 문서화 요청 |

---

*이 문서는 2026-01-12 세션의 사실 기록입니다.*
