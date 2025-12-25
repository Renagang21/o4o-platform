# O4O Platform: Deployment Status Definition (배포 상태 정의)

> **문서 상태**: Active (기준 문서)
> **작성일**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-DEPLOYMENT-MEANING-D0
> **Phase**: D0 완료

---

## 1. 문서의 목적

> **이 플랫폼에서 "배포"란 무엇인가?**

이 문서는 O4O 플랫폼의 배포 상태를 명확히 정의하여,
모든 사람(개발자, AI, 운영자)이 동일한 기준으로 판단할 수 있게 한다.

---

## 2. 배포 상태 정의 (4단계)

| 상태 | 영문 | 정의 | 예시 |
|------|------|------|------|
| **미배포** | Not Deployed | 코드가 서버에 전혀 올라가지 않은 상태 | 로컬 개발 중 |
| **배포됨 (비운영)** | Deployed (Non-Operational) | 서버에 배포되었으나 실제 서비스 제공 불가 | DB 없음, 외부 API 미연결 |
| **운영 가능** | Operational | 모든 의존성 연결, 서비스 제공 가능 상태 | DB 연결, Health Check 전체 통과 |
| **프로덕션** | Production | 실제 사용자에게 서비스 중 | 라이브 트래픽 처리 중 |

---

## 3. 상태별 판단 기준

### 3.1 Not Deployed (미배포)

```
조건:
- Cloud Run 서비스 없음
- 또는 배포 워크플로우 미실행
```

### 3.2 Deployed (Non-Operational) - 배포됨 (비운영)

```
조건:
- Cloud Run 서비스 존재 ✅
- /health 엔드포인트 200 응답 ✅
- 다음 중 하나 이상 미충족:
  - DB 연결 안됨 (database.status != 'healthy')
  - 필수 환경변수 미설정
  - 외부 서비스 연결 안됨

판단 근거:
- GRACEFUL_STARTUP=true 모드로 시작 가능
- 서버 프로세스는 실행 중
- 그러나 전체 기능 사용 불가
```

**이 상태에서 에러는 "정상"이다:**
- DB 연결 실패 로그
- 일부 API 503 응답
- /health/ready 503 응답

### 3.3 Operational (운영 가능)

```
조건:
- /health 200 응답 ✅
- /health/ready 200 응답 ✅
- database.status = 'healthy' ✅
- 모든 필수 환경변수 설정 ✅

판단 근거:
- 전체 API 기능 사용 가능
- 데이터 읽기/쓰기 가능
- 사용자 요청 처리 가능
```

### 3.4 Production (프로덕션)

```
조건:
- Operational 상태 ✅
- 실제 사용자 트래픽 처리 중 ✅
- 모니터링 알림 활성화 ✅
- 장애 대응 체계 활성화 ✅
```

---

## 4. 현재 Core API 상태 (2025-12-25 기준)

| 항목 | 현재 값 |
|------|---------|
| **서비스** | o4o-core-api |
| **플랫폼** | Cloud Run (asia-northeast3) |
| **상태** | **Deployed (Non-Operational)** |

### 4.1 현재 상태인 이유

| 조건 | 충족 여부 |
|------|-----------|
| Cloud Run 배포됨 | ✅ |
| /health 200 응답 | ✅ |
| GRACEFUL_STARTUP 모드 | ✅ |
| DB 연결 | ❌ (Cloud SQL 미설정) |
| /health/ready 200 | ❌ |

> **결론**: 서버는 "살아있음(alive)" 상태이나, DB 미연결로 전체 기능 사용 불가.
> 이것은 **의도된 상태**이며, 에러가 아니다.

### 4.2 Operational로 전환 조건

1. Cloud SQL 인스턴스 생성 및 연결
2. 필수 환경변수 설정 (DB_HOST, DB_PASSWORD 등)
3. /health/ready 200 응답 확인

---

## 5. G1 Phase 이후 기준

### 5.1 G1 완료 시 예상 상태

| 대상 | G1 완료 후 상태 |
|------|-----------------|
| Core API | Deployed (Non-Operational) → **Operational** |
| App API | Not Deployed → **Deployed (Non-Operational)** |
| Web Server | Active (Static Hosting) |

### 5.2 G1 완료 조건

- [ ] Cloud SQL 인스턴스 생성
- [ ] Core API DB 연결 확인
- [ ] /health/ready 200 응답 확인
- [ ] App API 서비스 생성 (선택)

---

## 6. CI/CD 해석 규칙

### 6.1 Push 성공의 의미

| 이벤트 | 의미 | 의미하지 않는 것 |
|--------|------|------------------|
| GitHub Actions 성공 | 빌드 및 배포 완료 | 서비스 운영 중 |
| Docker Image Push 완료 | 이미지 저장됨 | 서비스 정상 |
| Cloud Run Deploy 완료 | 컨테이너 시작됨 | 전체 기능 사용 가능 |

### 6.2 Health Check 해석

| 엔드포인트 | 200 응답 의미 | 503 응답 의미 |
|------------|---------------|---------------|
| `/health` | 서버 프로세스 실행 중 | - (항상 200) |
| `/health/live` | 프로세스 alive | 프로세스 dead |
| `/health/ready` | **전체 의존성 정상** | 일부 의존성 미연결 |
| `/health/database` | DB 연결 정상 | DB 연결 안됨 |

### 6.3 장애 판단 기준

| 현상 | 판단 | 조치 |
|------|------|------|
| /health 503 | **장애** | 즉시 대응 |
| /health 200 + /health/ready 503 | **비운영 상태 (정상)** | G1 완료 후 해결 |
| /health/ready 200 + 사용자 에러 | **애플리케이션 버그** | 코드 수정 |

---

## 7. 용어 사용 규칙

### 7.1 "운영 중인가요?" 질문에 대한 답변

| 상태 | 답변 |
|------|------|
| Not Deployed | "아니요, 배포되지 않았습니다" |
| Deployed (Non-Operational) | "배포는 되었지만 운영 상태는 아닙니다" |
| Operational | "예, 운영 가능 상태입니다" |
| Production | "예, 실제 서비스 중입니다" |

### 7.2 문서/대화에서 사용할 표현

| 상황 | 올바른 표현 | 잘못된 표현 |
|------|-------------|-------------|
| Cloud Run에 배포됨, DB 없음 | "배포됨 (비운영)" | "운영 중" |
| Health Check 기본만 통과 | "alive 상태" | "정상 운영" |
| 모든 의존성 연결 | "운영 가능" | "배포 완료" |
| 실제 트래픽 처리 | "프로덕션" | "운영 가능" |

---

## 8. 이 문서의 적용 범위

- Cloud Run Core API (o4o-core-api)
- 향후 생성될 App API 서비스
- GitHub Actions CI/CD 파이프라인
- 웹서버 (13.125.144.8) 프록시 연결

---

## 9. 관련 문서

- [CLAUDE.md](../../CLAUDE.md) - 플랫폼 헌법 (섹션 8: 인프라)
- [infra-migration-gcp.md](./infra-migration-gcp.md) - GCP 단일 운영 선언
- `.github/workflows/deploy-api.yml` - Cloud Run 배포 워크플로우
- `apps/api-server/src/routes/health.ts` - Health Check 구현

---

*이 문서는 CLAUDE.md에 종속되며, 배포 상태 판단의 공식 기준입니다.*
*D0 Phase 이후 모든 배포 관련 논의는 이 문서를 참조합니다.*
