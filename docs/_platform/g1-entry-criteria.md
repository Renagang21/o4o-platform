# O4O Platform: G1 Entry Criteria (G1 진입 조건)

> **문서 상태**: Active (기준 문서)
> **작성일**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-DEPLOYMENT-MEANING-D0
> **Phase**: D0 동시 확정 문서

---

## 1. 문서의 목적

> **G1 Phase를 언제 시작할 수 있는지 명확히 고정**

G1(GCP App API / Web 서버 생성)은 인프라 작업이다.
이 작업을 시작하기 전에 충족해야 하는 조건을 명시한다.

---

## 2. G1 Phase 정의

### 2.1 G1의 범위

| 작업 | 설명 |
|------|------|
| Cloud SQL 연결 | Core API를 Operational 상태로 전환 |
| App API 생성 (선택) | 별도 앱 API 서비스 생성 |
| 웹서버 프록시 설정 | Nginx 설정 업데이트 |

### 2.2 G1 완료 후 예상 상태

| 대상 | G1 전 상태 | G1 후 상태 |
|------|------------|------------|
| Core API | Deployed (Non-Operational) | **Operational** |
| App API | Not Deployed | Deployed (Non-Operational) |
| Web Server | Static Hosting | Static + API Proxy |

---

## 3. G1 진입 조건 체크리스트 (필수)

### 3.1 코드/구조 조건

| 조건 | 상태 | 확인 방법 |
|------|------|-----------|
| AppStore Guard PASSED | ✅ 충족 | `pnpm run appstore-guard` |
| 38개 패키지 lifecycle 완결 | ✅ 충족 | C1 Phase 완료 |
| FROZEN Core 무변경 | ✅ 충족 | R10 baseline |
| 모든 패키지 빌드 성공 | ✅ 충족 | `pnpm run build:packages` |

### 3.2 배포/인프라 조건

| 조건 | 상태 | 확인 방법 |
|------|------|-----------|
| Core API Cloud Run 배포됨 | ✅ 충족 | GCP 콘솔 확인 |
| /health 200 응답 | ✅ 충족 | curl 테스트 |
| GRACEFUL_STARTUP 모드 동작 | ✅ 충족 | env-validator.ts |
| deploy-api.yml 워크플로우 정상 | ✅ 충족 | GitHub Actions |

### 3.3 문서/기준 조건

| 조건 | 상태 | 확인 방법 |
|------|------|-----------|
| D0 Phase 완료 | ✅ 충족 | 본 문서 포함 4종 확정 |
| 배포 상태 정의 확정 | ✅ 충족 | deployment-status-definition.md |
| CI/CD 해석 규칙 확정 | ✅ 충족 | ci-cd-interpretation.md |
| GCP 단일 운영 선언 | ✅ 충족 | infra-migration-gcp.md |

### 3.4 분석/검증 조건

| 조건 | 상태 | 확인 방법 |
|------|------|-----------|
| C2 Pre-Deploy Check 완료 | ✅ 충족 | 5개 점검 영역 통과 |
| Post-R10 Sanity Check 완료 | ✅ 충족 | 문서-현실 정합성 확인 |

---

## 4. G1 진입 판정

### 4.1 현재 판정 (2025-12-25)

```
╔════════════════════════════════════════════╗
║  G1 Entry Criteria Check                    ║
╠════════════════════════════════════════════╣
║  코드/구조 조건:      4/4 ✅                ║
║  배포/인프라 조건:    4/4 ✅                ║
║  문서/기준 조건:      4/4 ✅                ║
║  분석/검증 조건:      2/2 ✅                ║
╠════════════════════════════════════════════╣
║  결과: G1 진입 가능                         ║
╚════════════════════════════════════════════╝
```

### 4.2 G1 시작 승인

> **G1 Phase 진입이 승인되었습니다.**

D0 Phase 완료 후, 다음 Work Order로 G1을 시작할 수 있습니다.

---

## 5. G1 Phase 작업 계획

### 5.1 필수 작업

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | Cloud SQL 인스턴스 생성 | PostgreSQL 15, asia-northeast3 |
| 2 | 환경변수 설정 | DB_HOST, DB_PASSWORD 등 |
| 3 | Core API 재배포 | DB 연결 활성화 |
| 4 | /health/ready 200 확인 | Operational 상태 전환 확인 |

### 5.2 선택 작업

| 작업 | 조건 |
|------|------|
| App API 서비스 생성 | 별도 앱 API가 필요한 경우 |
| Nginx 프록시 설정 | 도메인 연결이 필요한 경우 |

---

## 6. G1 완료 조건 (DoD)

| 조건 | 확인 방법 |
|------|-----------|
| Core API /health/ready 200 | curl 테스트 |
| database.status = 'healthy' | /health 응답 확인 |
| DB 읽기/쓰기 가능 | 테스트 API 호출 |
| 배포 상태 = Operational | deployment-status-definition.md 기준 |

---

## 7. G1 이후 다음 단계

| Phase | 내용 | 조건 |
|-------|------|------|
| G2 | App API Operational 전환 | G1 완료 후 |
| G3 | 모니터링/알림 설정 | Operational 이후 |
| G4 | Production 전환 | 운영 준비 완료 시 |

---

## 8. G1-1 진행 상태 (2025-12-25)

### 8.1 현재 상태

| 항목 | 상태 |
|------|------|
| G1 진입 승인 | ✅ 완료 |
| Cloud SQL Setup Guide 작성 | ✅ 완료 |
| deploy-api.yml G1 준비 | ✅ 완료 |
| Cloud SQL 인스턴스 생성 | ⏳ 대기 (GCP 콘솔 작업 필요) |
| Core API Operational 전환 | ⏳ 대기 |

### 8.2 다음 액션 (수동 작업 필요)

1. GCP 콘솔에서 Cloud SQL 인스턴스 생성
2. GitHub Secrets에 DB 환경변수 설정
3. deploy-api.yml에서 GRACEFUL_STARTUP=false로 변경
4. 재배포 후 /health/ready 200 확인

자세한 가이드: [g1-cloud-sql-setup-guide.md](./g1-cloud-sql-setup-guide.md)

---

## 9. 관련 문서

| 문서 | 역할 |
|------|------|
| [deployment-status-definition.md](./deployment-status-definition.md) | 상위 기준 문서 |
| [ci-cd-interpretation.md](./ci-cd-interpretation.md) | CI/CD 해석 규칙 |
| [infra-migration-gcp.md](./infra-migration-gcp.md) | GCP 운영 기준 |
| [g1-cloud-sql-setup-guide.md](./g1-cloud-sql-setup-guide.md) | Cloud SQL 설정 가이드 |

---

*이 문서는 deployment-status-definition.md에 종속되며, G1 진입의 공식 기준입니다.*
*D0 Phase 동시 확정 문서 4종 중 하나입니다.*
*G1-1 Work Order: WO-GEN-PLATFORM-CORE-OPERATIONAL-G1-1*
