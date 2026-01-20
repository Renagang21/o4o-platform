# O4O Platform 진단 인프라 기준 (Alpha)

> **작성일**: 2026-01-20
> **상태**: **공식 운영 기준** (CLAUDE.md Section 14 연동)
> **적용 범위**: Production 환경 전체
> **Work Order**: WO-DIAGNOSTIC-BASELINE-ALIGNMENT-V1

---

## 1. 요약

O4O Platform에는 다음과 같은 진단 인프라가 존재합니다:

| 분류 | 수량 | 상태 |
|------|------|------|
| Debug 페이지 (`__debug__/*`) | 1개 (admin-dashboard) | 활성 |
| Test 페이지 (`/test/*`, `/admin/test/*`) | 15개+ | 활성 |
| Health Check 엔드포인트 | 7개 (Core) + 9개 (Service) | 활성 |
| Monitoring 대시보드 | 3개 | 활성 |
| Token Debug 유틸리티 | 1개 | Dev 전용 |

**Alpha 단계 결정사항**:
- `/__debug__/auth-bootstrap`이 **공식 Auth 진단 Entry Point**
- `/__debug__/login`, `/__debug__/navigation`, `/__debug__/api`는 **참고 설계** (필요 시 구현)
- Health API (`/health/*`)가 **시스템 진단 Entry Point**

---

## 2. 디버그 페이지 (Frontend)

### 2.1 `__debug__` 디렉토리 (Production 접근 가능)

| 경로 | 파일 | 라우트 | 목적 | 인증 필요 |
|------|------|--------|------|-----------|
| admin-dashboard | `AuthBootstrapDebug.tsx` | `/__debug__/auth-bootstrap` | 로그인 후 인증 상태 유지 분석 | 아니오 |

**AuthBootstrapDebug 기능**:
- 로그인 API 테스트 (POST `/api/v1/auth/login`)
- 토큰 저장 확인 (Cookie vs localStorage)
- `/auth/me` 호출 검증
- 후속 API 호출 테스트
- JSON 타임라인 출력

**사용법**:
```
https://admin.neture.co.kr/__debug__/auth-bootstrap
1. Email/Password 입력
2. "Run Auth Bootstrap Probe" 클릭
3. JSON 결과 분석 (Copy JSON / Open in New Tab)
```

### 2.2 Test 페이지 (Admin 전용)

| 라우트 | 파일 | 목적 | 인증 필요 |
|--------|------|------|-----------|
| `/admin/test/auth-debug` | `AuthDebug.tsx` | 토큰 소스 및 권한 검사 | 예 (Admin) |
| `/auth-inspector` | `AuthInspector.tsx` | 인증 상태 디버깅 | 아니오 |
| `/test/api-response-checker` | `ApiResponseChecker.tsx` | API 응답 테스트 | 예 |
| `/test/menu-debug` | `MenuDebug.tsx` | 메뉴 권한 디버깅 | 예 (Admin) |
| `/admin/test/cms-fields` | `CMSFieldsDebug.tsx` | CMS 필드 설정 검사 | 예 (Admin) |
| `/admin/test/cms-view-list-debug` | `CMSViewListDebug.tsx` | CMS 뷰 리스트 로딩 테스트 | 예 (Admin) |

### 2.3 Monitoring 대시보드

| 라우트 | 파일 | 목적 | 사용 API |
|--------|------|------|----------|
| `/monitoring/system` | `SystemMonitoring.tsx` | 시스템 상태 모니터링 | `/monitoring/health`, `/monitoring/performance` |
| `/monitoring/performance` | `PerformanceDashboard.tsx` | 성능 메트릭 | `/monitoring/metrics`, `/monitoring/history` |
| `/monitoring/integrated` | `IntegratedMonitoring.tsx` | 통합 모니터링 | `/monitoring/summary`, `/monitoring/backup/trigger` |

---

## 3. Health Check API 엔드포인트

### 3.1 Core Health Endpoints (`/health/*`)

| 엔드포인트 | 메서드 | 상태 코드 | 인증 | 용도 |
|------------|--------|-----------|------|------|
| `/health` | GET | 항상 200 | 불필요 | Cloud Run 시작 프로브 (DB 실패해도 200) |
| `/health/live` | GET | 200/500 | 불필요 | K8s Liveness 프로브 |
| `/health/ready` | GET | 200/503 | 불필요 | K8s Readiness 프로브 (DB, Memory 검사) |
| `/health/detailed` | GET | 200/503 | 불필요 | 전체 컴포넌트 상세 검사 |
| `/health/database` | GET | 200/503 | 불필요 | DB 연결, 버전, 활성 연결 수 |
| `/health/system` | GET | 200/503 | 불필요 | CPU, Memory, Load Average |
| `/health/redis` | GET | 200/503 | 불필요 | Redis 연결 상태 |

### 3.2 Service-Level Health Endpoints

| 서비스 | 엔드포인트 | 인증 |
|--------|------------|------|
| Cosmetics | `/api/v1/cosmetics/health` | 불필요 |
| GlycoPharm | `/api/v1/glycopharm/health` | 불필요 |
| KPA | `/api/v1/kpa/health` | 불필요 |
| CMS | `/api/v1/cms/health` | 불필요 |
| Channels | `/api/v1/channels/health` | 불필요 |
| SiteGuide | `/api/siteguide/health` | 불필요 |
| Forum | `/api/v1/forum/health` | 불필요 |
| Forum AI | `/api/v1/forum/ai/status` | 불필요 |
| Sellers | `/api/admin/sellers/health` | Admin 필요 |

### 3.3 Auth Status Endpoint

| 엔드포인트 | 메서드 | 인증 | 응답 |
|------------|--------|------|------|
| `/api/v1/auth/status` | GET | Optional | `{ authenticated: boolean, user?: {...} }` |
| `/api/v1/auth/me` | GET | 필수 | `{ success: true, data: { user: {...} } }` |

---

## 4. JSON 응답 스키마 표준

### 4.1 성공 응답

```typescript
{
  success: true,
  data: T,
  message?: string,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### 4.2 에러 응답

```typescript
{
  success: false,
  error: string,           // 사람이 읽을 수 있는 메시지
  code: string,            // 머신 리더블 에러 코드
  details?: unknown,       // 추가 정보 (validation errors 등)
  retryable?: boolean      // 재시도 가능 여부 (일부 엔드포인트)
}
```

### 4.3 주요 에러 코드

| 코드 | HTTP | 의미 |
|------|------|------|
| `AUTH_REQUIRED` | 401 | 인증 필요 |
| `INVALID_TOKEN` | 401 | 토큰 무효/만료 |
| `FORBIDDEN` | 403 | 권한 부족 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION_ERROR` | 400 | 입력 검증 실패 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |
| `SERVICE_UNAVAILABLE` | 503 | DB 미초기화 등 |
| `CONFIG_ERROR` | 503 | 환경설정 오류 (JWT 등) |

### 4.4 Health Check 응답 스키마

```typescript
// 기본 Health 응답
{
  status: 'alive' | 'ready' | 'not ready' | 'healthy' | 'unhealthy' | 'degraded',
  timestamp: string,        // ISO8601
  uptime: number,           // seconds
  version?: string,
  environment?: string,
  responseTime?: number,    // ms
  database?: {
    status: 'healthy' | 'unhealthy' | 'not_connected' | 'degraded',
    error?: string,
    details?: { version, activeConnections, longRunningQueries }
  },
  memory?: {
    used: number,           // MB
    total: number,          // MB
    percentage: number
  }
}

// Detailed Health 응답
{
  status: string,
  timestamp: string,
  responseTime: number,
  checks: Array<{
    component: string,
    status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown',
    responseTime?: number,
    details?: Record<string, unknown>,
    error?: string,
    timestamp: string
  }>
}
```

---

## 5. Alpha 단계 상태 (의도된 구현 범위)

### 5.1 디버그 페이지 구현 상태

| 페이지 | URL | 상태 | 비고 |
|--------|-----|------|------|
| Auth Bootstrap | `/__debug__/auth-bootstrap` | ✅ 구현됨 | **공식 Entry Point** |
| Login Probe | `/__debug__/login` | 📋 참고 설계 | Beta 검토 |
| Navigation Probe | `/__debug__/navigation` | 📋 참고 설계 | Beta 검토 |
| API Probe | `/__debug__/api` | 📋 참고 설계 | Beta 검토 |

> **Alpha 단계 원칙**: "문서에 있는 모든 것을 구현하지 않는다"
> 현재 진단 인프라는 기능적으로 충분하며, 추가 페이지는 ROI 판단 후 구현

### 5.2 서비스별 Debug 페이지 (Beta 검토 대상)

| 서비스 | 상태 | Alpha 대안 |
|--------|------|------------|
| admin-dashboard | ✅ 구현됨 | - |
| web-glycopharm | 미구현 | `/health/*` API 활용 |
| web-glucoseview | 미구현 | `/health/*` API 활용 |
| web-neture | 미구현 | `/health/*` API 활용 |
| web-kpa-society | 미구현 | `/health/*` API 활용 |
| web-k-cosmetics | 미구현 | `/health/*` API 활용 |

### 5.3 @o4o/debug 패키지 (Beta 검토 대상)

docs/debugging/README.md에 명세된 패키지:
- **현재 상태**: 미구현 (packages/debug 없음)
- **Alpha 대안**: 개별 Debug 페이지에서 직접 구현
- **Beta 검토**: 공통 패키지화 필요 여부 재평가

---

## 6. 운영 루틴 제안

### 6.1 버그 진단 표준 루틴

```
1. 재현
   └─ 브라우저에서 문제 발생 확인

2. JSON 진단 실행
   ├─ Auth 문제: /__debug__/auth-bootstrap
   ├─ API 문제: /health/detailed + 개별 서비스 health
   └─ 시스템 문제: /health/system, /health/database

3. 원인 특정
   ├─ JSON 응답의 success/error/code 필드 확인
   └─ timeline/responseTime으로 병목 지점 식별

4. 코드 위치 추적
   ├─ error.code → BaseController 또는 개별 컨트롤러
   └─ 401/403 → auth.middleware.ts 또는 auth.controller.ts

5. 수정 및 재검증
   └─ 동일 진단 페이지로 수정 확인
```

### 6.2 진단 엔드포인트 활용 가이드

| 증상 | 1차 진단 | 2차 진단 |
|------|----------|----------|
| 로그인 실패 | `/__debug__/auth-bootstrap` | `/api/v1/auth/status` |
| 페이지 접근 거부 | `/api/v1/auth/me` | 해당 서비스 health |
| API 느림/타임아웃 | `/health/detailed` | `/health/database`, `/health/system` |
| 503 에러 | `/health/ready` | `/health/database` |
| 쿠키 문제 | `/__debug__/auth-bootstrap` (token_check 단계) | - |

---

## 7. Beta 검토 대상 (현재 작업 불필요)

아래 항목들은 **Alpha 단계에서는 작업하지 않으며**, Beta 전환 시 재검토합니다.

### 7.1 추가 Debug 페이지

| 페이지 | 우선순위 | 검토 시점 |
|--------|----------|-----------|
| `/__debug__/login` | 중 | Beta |
| `/__debug__/navigation` | 낮 | Beta |
| `/__debug__/api` | 낮 | Beta |

### 7.2 서비스별 Debug 페이지 표준화

- 현재: Health API로 충분히 진단 가능
- Beta: 서비스별 복잡도 증가 시 재검토

### 7.3 @o4o/debug 패키지

- 현재: 개별 구현으로 운영
- Beta: 공통화 ROI 평가 후 결정

---

## 8. 참조 문서

- [docs/debugging/README.md](./README.md) - 디버깅 가이드 (원본)
- [docs/debugging/auth-investigation-report.md](./auth-investigation-report.md) - Auth 복잡성 조사
- [CLAUDE.md Section 14](../../CLAUDE.md) - 화면 디버깅 규칙

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-01-20 | 1.0 | 최초 작성 (조사 보고서) |
| 2026-01-20 | 2.0 | **공식 운영 기준으로 승격** (WO-DIAGNOSTIC-BASELINE-ALIGNMENT-V1) |

---

*이 문서는 O4O Platform Alpha 단계의 공식 진단 인프라 기준입니다.*
*CLAUDE.md Section 14와 연동되며, 변경 시 동기화가 필요합니다.*
