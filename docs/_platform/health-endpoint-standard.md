# Health Endpoint Standard

> **Status**: FROZEN (Beta)
> **Created**: 2025-12-25
> **Phase**: P3 - Beta Readiness Consolidation
> **Authority**: CLAUDE.md 종속

---

## 1. 이 문서의 지위

이 문서는 **모든 App API의 Health 엔드포인트 표준**을 정의한다.

* Alpha Phase에서 6개 앱(Reference + 5개 Alpha)에서 검증된 패턴
* Beta Phase부터 **FROZEN** 상태로 고정
* 신규 App API 생성 시 **그대로 복사**하여 사용

---

## 2. 필수 엔드포인트

### 2.1 엔드포인트 목록

| 엔드포인트 | 용도 | HTTP 상태 | Cloud Run 용도 |
|-----------|------|----------|----------------|
| `GET /health` | Liveness Probe | 200 | 컨테이너 실행 확인 |
| `GET /health/ready` | Readiness Probe | 200/503 | 트래픽 수신 가능 확인 |
| `GET /health/live` | K8s 호환 | 200 | Kubernetes 호환성 |

### 2.2 각 엔드포인트 역할

| 엔드포인트 | 검사 대상 | 실패 시 의미 |
|-----------|----------|-------------|
| `/health` | 프로세스 실행 | 컨테이너 재시작 필요 |
| `/health/ready` | Core API 연결 | 트래픽 차단 (다른 인스턴스로) |
| `/health/live` | 프로세스 실행 | 컨테이너 재시작 필요 |

---

## 3. 응답 스키마 (FROZEN)

### 3.1 GET /health 응답

```typescript
interface HealthResponse {
  status: 'alive';
  timestamp: string;      // ISO 8601 형식
  uptime: number;         // 초 단위
  version: string;        // 서비스 버전
  service: string;        // 서비스 이름
  environment: string;    // 환경 (development/production)
}
```

**예시 응답:**
```json
{
  "status": "alive",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "service": "forum-api",
  "environment": "production"
}
```

### 3.2 GET /health/ready 응답

```typescript
interface ReadyResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  uptime: number;
  checks: {
    coreApi: {
      status: 'healthy' | 'unhealthy';
      latency?: number;   // ms 단위 (healthy일 때)
      error?: string;     // 에러 메시지 (unhealthy일 때)
    };
    // 추가 의존성 체크 가능 (선택)
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
  };
}
```

**정상 응답 (200):**
```json
{
  "status": "ready",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "coreApi": {
      "status": "healthy",
      "latency": 45
    }
  }
}
```

**비정상 응답 (503):**
```json
{
  "status": "not_ready",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "coreApi": {
      "status": "unhealthy",
      "error": "Connection refused"
    }
  }
}
```

### 3.3 GET /health/live 응답

```typescript
interface LiveResponse {
  status: 'live';
}
```

**응답:**
```json
{
  "status": "live"
}
```

---

## 4. 구현 표준 (FROZEN)

### 4.1 필수 파일

```
src/routes/health.routes.ts
```

### 4.2 표준 구현 코드

```typescript
/**
 * Health Check Routes
 * =============================================================================
 * Required endpoints for all App API servers.
 *
 * Endpoints:
 * - /health       : Liveness check (is the process running?)
 * - /health/ready : Readiness check (are dependencies available?)
 * =============================================================================
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';

const router = Router();

// Track server start time
const startTime = Date.now();

/**
 * GET /health
 * Liveness probe - returns 200 if the server is running
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: '1.0.0',
    service: '<service-name>',  // 서비스별 수정
    environment: env.NODE_ENV,
  });
});

/**
 * GET /health/ready
 * Readiness probe - checks if all dependencies are available
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let allHealthy = true;

  // Check Core API connectivity
  try {
    const startMs = Date.now();
    const response = await axios.get<{ status: string }>(`${env.CORE_API_URL}/health`, {
      timeout: 5000,
    });
    const latencyMs = Date.now() - startMs;

    if (response.data?.status === 'alive') {
      checks.coreApi = { status: 'healthy', latency: latencyMs };
    } else {
      checks.coreApi = { status: 'unhealthy', error: 'Invalid response' };
      allHealthy = false;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    checks.coreApi = {
      status: 'unhealthy',
      error: message,
    };
    allHealthy = false;
  }

  // Add more dependency checks here as needed
  // e.g., database, cache, external services

  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  });
});

/**
 * GET /health/live
 * Alternative liveness endpoint (Kubernetes style)
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'live' });
});

export default router;
```

### 4.3 main.ts 연결

```typescript
import healthRoutes from './routes/health.routes.js';

// Health check routes (required for all App APIs)
app.use('/health', healthRoutes);
```

---

## 5. 검증 기준

### 5.1 필수 통과 조건

| 조건 | 검증 방법 | 통과 기준 |
|------|----------|----------|
| Liveness 응답 | `curl /health` | 200 + `status: 'alive'` |
| Readiness 응답 | `curl /health/ready` | 200/503 + checks 포함 |
| Live 응답 | `curl /health/live` | 200 + `status: 'live'` |
| 응답 시간 | Liveness < 100ms | 100ms 이내 응답 |
| Core API 체크 | Readiness 시 Core API 호출 | timeout 5초 내 응답 |

### 5.2 자동 검증 스크립트

```bash
#!/bin/bash
# health-check.sh

BASE_URL=${1:-"http://localhost:3000"}

echo "=== Health Check Validation ==="

# Liveness
echo -n "GET /health: "
LIVENESS=$(curl -s -w "%{http_code}" "$BASE_URL/health")
if [[ "$LIVENESS" == *"alive"*"200" ]]; then
  echo "PASS"
else
  echo "FAIL"
fi

# Readiness
echo -n "GET /health/ready: "
READINESS=$(curl -s -w "%{http_code}" "$BASE_URL/health/ready")
if [[ "$READINESS" == *"checks"* ]]; then
  echo "PASS"
else
  echo "FAIL"
fi

# Live
echo -n "GET /health/live: "
LIVE=$(curl -s -w "%{http_code}" "$BASE_URL/health/live")
if [[ "$LIVE" == *"live"*"200" ]]; then
  echo "PASS"
else
  echo "FAIL"
fi

echo "=== Validation Complete ==="
```

---

## 6. 확장 가이드

### 6.1 추가 의존성 체크 (허용)

Readiness에 추가 의존성을 체크할 수 있다. 단, 기존 coreApi 체크는 **수정 불가**.

```typescript
// 예: 데이터베이스 연결 체크 추가
try {
  const dbStart = Date.now();
  await database.ping();
  checks.database = { status: 'healthy', latency: Date.now() - dbStart };
} catch (error) {
  checks.database = { status: 'unhealthy', error: 'DB connection failed' };
  allHealthy = false;
}
```

### 6.2 금지 사항

| 금지 | 사유 |
|------|------|
| `/health` 응답 스키마 변경 | Cloud Run 호환성 |
| `/health/ready` HTTP 상태 코드 변경 | 503 = 트래픽 차단 표준 |
| Core API 체크 제거 | 플랫폼 의존성 필수 |
| timeout 값 변경 | 5초 = Cloud Run 권장 |

---

## 7. Cloud Run 설정

### 7.1 권장 설정

```yaml
# Cloud Run 서비스 설정
spec:
  containers:
    - livenessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 30
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 10
```

### 7.2 상태 코드 매핑

| HTTP 상태 | Cloud Run 동작 |
|----------|----------------|
| 200 | 정상 - 트래픽 라우팅 |
| 503 | 비정상 - 트래픽 차단 |
| 5xx (기타) | 비정상 - 컨테이너 재시작 고려 |

---

## 8. Alpha 검증 결과

### 8.1 검증된 앱 목록

| 앱 | 엔드포인트 일치 | 응답 스키마 일치 | 비고 |
|----|----------------|-----------------|------|
| app-api-reference | ✅ | ✅ | 기준 |
| forum-api | ✅ | ✅ | interface 추가 (허용) |
| commerce-api | ✅ | ✅ | - |
| lms-api | ✅ | ✅ | - |
| dropshipping-api | ✅ | ✅ | - |
| supplier-api | ✅ | ✅ | - |

### 8.2 허용된 변형

| 변형 | 예시 | 허용 여부 |
|------|------|----------|
| interface 타입 추가 | `interface CoreAPIHealthResponse` | ✅ 허용 |
| 변수명 미세 조정 | `message` vs `errorMessage` | ✅ 허용 |
| 추가 의존성 체크 | `checks.database` | ✅ 허용 |
| 응답 스키마 변경 | `status` 값 변경 | ❌ 금지 |

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | 초기 작성 (P3 Phase) - FROZEN |

---

*This document is part of the P3 Phase - Beta Readiness Consolidation.*
*Status: FROZEN (Beta)*
*Authority: CLAUDE.md 종속*
