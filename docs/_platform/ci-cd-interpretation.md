# O4O Platform: CI/CD Interpretation Rules (CI/CD 해석 규칙)

> **문서 상태**: Active (기준 문서)
> **작성일**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-DEPLOYMENT-MEANING-D0
> **Phase**: D0 동시 확정 문서

---

## 1. 문서의 목적

> **CI/CD 결과를 보고 "정상/문제"를 즉시 판정하기 위한 기준**

이 문서는 설명용이 아니다.
GitHub Actions, Cloud Run 배포, Health Check 결과를 보고
**무엇이 정상이고 무엇이 문제인지 즉시 판단**하기 위한 규칙이다.

---

## 2. 상위 문서

이 문서는 [deployment-status-definition.md](./deployment-status-definition.md)에 종속된다.
충돌 시 상위 문서가 우선한다.

---

## 3. CI/CD 파이프라인 단계별 해석

### 3.1 GitHub Actions 워크플로우

| 워크플로우 | 성공 의미 | 실패 의미 |
|------------|-----------|-----------|
| `ci-pipeline.yml` | 코드 빌드/테스트 통과 | 코드 문제, 즉시 수정 필요 |
| `ci-appstore-guard.yml` | AppStore 정합성 유지 | manifest/lifecycle 문제 |
| `deploy-api.yml` | Cloud Run 배포 완료 | 배포 실패, 확인 필요 |
| `deploy-admin.yml` | Admin 정적 파일 배포 | 웹서버 접근 문제 |
| `deploy-main-site.yml` | Main Site 배포 | 웹서버 접근 문제 |

---

## 4. 배포 성공 ≠ 운영 시작 (핵심 규칙)

### 4.1 Push/Deploy 성공의 정확한 의미

| 이벤트 | 의미 | 의미하지 않는 것 |
|--------|------|------------------|
| `git push` 성공 | 코드 저장소 업데이트 | 배포됨 |
| GitHub Actions 성공 | 빌드 및 배포 작업 완료 | 서비스 운영 중 |
| Docker Image Push 완료 | 이미지가 Artifact Registry에 저장됨 | 서비스 정상 |
| Cloud Run Deploy 완료 | 컨테이너 시작됨 | 전체 기능 사용 가능 |
| Health Check 통과 | 프로세스 alive | 모든 의존성 정상 |

### 4.2 핵심 공식

```
Push 성공 ≠ Deployed
Deploy 성공 ≠ Operational
Health 200 ≠ Production
```

---

## 5. Health Check 엔드포인트 해석

### 5.1 엔드포인트별 의미

| 엔드포인트 | 200 응답 의미 | 503 응답 의미 | 비고 |
|------------|---------------|---------------|------|
| `/health` | 서버 프로세스 실행 중 | - | 항상 200 반환 |
| `/health/live` | 프로세스 alive | 프로세스 dead | Liveness Probe |
| `/health/ready` | **전체 의존성 정상** | 일부 의존성 미연결 | Readiness Probe |
| `/health/database` | DB 연결 정상 | DB 연결 안됨 | 개별 체크 |
| `/health/detailed` | 전체 healthy | 일부 unhealthy | 상세 정보 |

### 5.2 상태 판정 매트릭스

| /health | /health/ready | 판정 | 조치 |
|---------|---------------|------|------|
| 200 | 200 | **Operational** | 정상 |
| 200 | 503 | **Deployed (Non-Operational)** | G1 완료 후 해결 |
| 503 | - | **장애** | 즉시 대응 |
| 연결 불가 | - | **Not Deployed / Dead** | 즉시 확인 |

---

## 6. 배포 상태별 정상/비정상 판단

### 6.1 Deployed (Non-Operational) 상태에서

| 현상 | 판단 | 사유 |
|------|------|------|
| DB 연결 실패 로그 | **정상** | DB 미설정 상태 |
| /health/ready 503 | **정상** | 의존성 미연결 |
| 일부 API 503 응답 | **정상** | 전체 기능 미활성화 |
| /health 200 | **정상** | GRACEFUL_STARTUP 모드 |

### 6.2 Operational 상태에서

| 현상 | 판단 | 조치 |
|------|------|------|
| DB 연결 실패 | **장애** | 즉시 대응 |
| /health/ready 503 | **장애** | 의존성 확인 |
| API 503 응답 | **문제** | 코드/설정 확인 |
| /health 503 | **심각한 장애** | 즉시 대응 |

### 6.3 Production 상태에서

| 현상 | 판단 | 조치 |
|------|------|------|
| 모든 장애 | **긴급** | 즉시 대응, 알림 발송 |
| 응답 지연 | **경고** | 모니터링 확인 |
| 에러율 증가 | **경고** | 원인 분석 |

---

## 7. 에러 메시지 해석 가이드

### 7.1 정상적인 에러 (Non-Operational 상태에서)

```
"Database connection not initialized (GRACEFUL_STARTUP mode)"
→ 정상. DB 미설정 상태에서 예상되는 메시지.

"ECONNREFUSED" (DB 연결 거부)
→ 정상. Cloud SQL 미생성 상태.

"Environment variable DB_HOST is not set"
→ 정상. 필수 환경변수 미설정.
```

### 7.2 문제가 되는 에러 (Operational 상태에서)

```
"FATAL: password authentication failed"
→ 문제. 인증 정보 오류.

"Connection pool exhausted"
→ 문제. 커넥션 풀 고갈.

"ENOMEM" (메모리 부족)
→ 장애. 리소스 확장 필요.
```

---

## 8. 배포 워크플로우 실패 시 대응

### 8.1 deploy-api.yml 실패

| 실패 단계 | 원인 가능성 | 대응 |
|-----------|-------------|------|
| Install dependencies | 패키지 버전 충돌 | pnpm-lock.yaml 확인 |
| Build packages | 타입 에러 | 코드 수정 |
| Build API server | 컴파일 에러 | 코드 수정 |
| Docker build | Dockerfile 문제 | 설정 확인 |
| Authenticate to GCP | 시크릿 문제 | GitHub Secrets 확인 |
| Deploy to Cloud Run | 리소스/권한 문제 | GCP 콘솔 확인 |
| Health check | 서버 시작 실패 | 로그 확인 |

### 8.2 실패 후 재시도 규칙

| 상황 | 재시도 | 사유 |
|------|--------|------|
| 네트워크 일시 오류 | 자동 재시도 | 일시적 문제 |
| 코드 에러 | 수정 후 재시도 | 코드 문제 |
| 인증 실패 | 시크릿 확인 후 재시도 | 설정 문제 |
| 리소스 부족 | GCP 설정 변경 후 재시도 | 인프라 문제 |

---

## 9. 모니터링 기준

### 9.1 현재 단계별 모니터링 범위

| 상태 | 모니터링 필요 여부 | 알림 활성화 |
|------|---------------------|-------------|
| Not Deployed | ❌ 불필요 | ❌ |
| Deployed (Non-Operational) | ⚠️ 선택적 (개발 목적) | ❌ |
| Operational | ✅ 필수 | ⚠️ 선택적 |
| Production | ✅ 필수 | ✅ 필수 |

### 9.2 현재 Core API 모니터링 상태

```
상태: Deployed (Non-Operational)
모니터링: 선택적
알림: 비활성화
→ 에러 발생해도 "장애"로 간주하지 않음
```

---

## 10. 이 문서의 적용 범위

- GitHub Actions 전체 워크플로우
- Cloud Run 배포 결과 해석
- Health Check 응답 해석
- 에러 로그 해석
- 장애 판단 기준

---

## 11. 관련 문서

| 문서 | 역할 |
|------|------|
| [deployment-status-definition.md](./deployment-status-definition.md) | 상위 기준 문서 |
| [g1-entry-criteria.md](./g1-entry-criteria.md) | G1 진입 조건 |
| [infra-migration-gcp.md](./infra-migration-gcp.md) | GCP 운영 기준 |

---

*이 문서는 deployment-status-definition.md에 종속되며, CI/CD 결과 해석의 공식 기준입니다.*
*D0 Phase 동시 확정 문서 4종 중 하나입니다.*
