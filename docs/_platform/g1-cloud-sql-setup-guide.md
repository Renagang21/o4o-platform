# G1-1: Cloud SQL Setup Guide (Core API Operational 전환)

> **문서 상태**: Active
> **작성일**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-CORE-OPERATIONAL-G1-1
> **Phase**: G1-1

---

## 1. 목적

Core API를 `Deployed (Non-Operational)` 상태에서 **`Operational`** 상태로 전환하기 위한 Cloud SQL 설정 가이드.

---

## 2. 현재 상태

| 항목 | 현재 값 |
|------|---------|
| Core API | o4o-core-api (Cloud Run) |
| 상태 | Deployed (Non-Operational) |
| GRACEFUL_STARTUP | true |
| DB 연결 | 미연결 |
| /health/ready | 503 |

---

## 3. Cloud SQL 설정 단계

### 3.1 Cloud SQL 인스턴스 생성 (GCP 콘솔)

```bash
# GCP 프로젝트
프로젝트: netureyoutube
리전: asia-northeast3 (서울)

# 인스턴스 설정
이름: o4o-platform-db
버전: PostgreSQL 15
머신 타입: db-f1-micro (개발용) 또는 db-g1-small (운영용)
스토리지: 10GB SSD
```

### 3.2 데이터베이스 및 사용자 생성

```sql
-- 데이터베이스 생성
CREATE DATABASE o4o_platform;

-- 사용자 생성 (GCP 콘솔에서 생성 권장)
-- 비밀번호는 Cloud Secret Manager 사용 권장
```

### 3.3 Cloud Run 연결 설정

1. Cloud Run 서비스 → o4o-core-api
2. 편집 및 새 버전 배포
3. 연결 탭 → Cloud SQL 연결 추가
4. o4o-platform-db 선택

---

## 4. 환경변수 설정

### 4.1 필수 환경변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `DB_HOST` | Cloud SQL 연결 소켓 | `/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db` |
| `DB_PORT` | 포트 (Unix Socket 시 생략) | `5432` |
| `DB_USERNAME` | DB 사용자명 | `o4o_api` |
| `DB_PASSWORD` | DB 비밀번호 | (Secret Manager 사용) |
| `DB_NAME` | 데이터베이스명 | `o4o_platform` |
| `JWT_SECRET` | JWT 서명 키 | (Secret Manager 사용) |

### 4.2 GitHub Secrets 설정

```
GCP_DB_HOST=/cloudsql/netureyoutube:asia-northeast3:o4o-platform-db
GCP_DB_USERNAME=o4o_api
GCP_DB_PASSWORD=(비밀번호)
GCP_DB_NAME=o4o_platform
GCP_JWT_SECRET=(JWT 시크릿)
```

### 4.3 deploy-api.yml 수정 사항

```yaml
# 현재 (GRACEFUL_STARTUP 모드)
--set-env-vars="GRACEFUL_STARTUP=true"

# 변경 후 (Operational 모드)
--set-env-vars="GRACEFUL_STARTUP=false"
--set-env-vars="DB_HOST=${{ secrets.GCP_DB_HOST }}"
--set-env-vars="DB_USERNAME=${{ secrets.GCP_DB_USERNAME }}"
--set-env-vars="DB_PASSWORD=${{ secrets.GCP_DB_PASSWORD }}"
--set-env-vars="DB_NAME=${{ secrets.GCP_DB_NAME }}"
--set-env-vars="JWT_SECRET=${{ secrets.GCP_JWT_SECRET }}"
```

---

## 5. 전환 검증 체크리스트

### 5.1 Cloud SQL 준비 완료 조건

- [ ] Cloud SQL 인스턴스 생성됨
- [ ] 데이터베이스 생성됨
- [ ] 사용자 생성됨
- [ ] Cloud Run 연결 설정됨

### 5.2 환경변수 설정 완료 조건

- [ ] GitHub Secrets에 DB 정보 설정됨
- [ ] deploy-api.yml 수정됨
- [ ] GRACEFUL_STARTUP=false로 변경됨

### 5.3 Operational 전환 확인

- [ ] 재배포 성공
- [ ] /health 200 응답
- [ ] /health/ready 200 응답
- [ ] /health/database healthy 응답

---

## 6. 검증 명령어

```bash
# Health Check
curl https://o4o-core-api-xxxxx.run.app/health

# Readiness Check
curl https://o4o-core-api-xxxxx.run.app/health/ready

# Database Health
curl https://o4o-core-api-xxxxx.run.app/health/database
```

---

## 7. 예상 응답 (Operational 상태)

### /health
```json
{
  "status": "alive",
  "database": {
    "status": "healthy"
  }
}
```

### /health/ready
```json
{
  "status": "ready",
  "timestamp": "2025-12-25T..."
}
```

---

## 8. 롤백 방법

문제 발생 시:
1. deploy-api.yml에서 `GRACEFUL_STARTUP=true`로 변경
2. 재배포
3. Core API는 Non-Operational 상태로 복귀

---

## 9. 다음 단계 (G1-1 완료 후)

G1-1 완료 후:
1. Core API 상태: **Operational**
2. 배포 실패는 **장애**로 간주
3. App API 생성 가능 (G1-2)
4. 웹서버 프록시 설정 가능 (G1-3)

---

*이 가이드는 G1-1 Phase 진행을 위한 실무 문서입니다.*
*인프라 작업은 GCP 콘솔에서 직접 수행해야 합니다.*
