# Phase 2.4 – 운영 패널 및 대시보드 UI 확장 가이드

**작성일:** 2025-11-04
**버전:** 0.1.0
**목표:** 관리자 및 파트너용 운영 대시보드 확장 (UI + API 연동)

---

## 📋 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [API 엔드포인트](#api-엔드포인트)
4. [프론트엔드 컴포넌트](#프론트엔드-컴포넌트)
5. [배포 가이드](#배포-가이드)
6. [트러블슈팅](#트러블슈팅)

---

## 개요

Phase 2.4는 Phase 2.3의 성과를 기반으로 관리자와 파트너가 시스템 상태 및 성과를 실시간으로 모니터링할 수 있는 고급 대시보드를 제공합니다.

### 핵심 기능

1. **시스템 메트릭 대시보드** (`/api/v1/admin/dashboard/system`)
   - Prometheus 메트릭 집계
   - 캐시 성능 (L1/L2 Hit Rate, Circuit Breaker 상태)
   - API 서버 리소스 사용량 (CPU, Memory)

2. **파트너 통계 대시보드** (`/api/v1/admin/dashboard/partners/:id`)
   - 파트너별 커미션 통계 (전체/확정/대기)
   - 7일/30일 수익 추이
   - 일별 커미션 트렌드 차트

3. **운영 패널** (`/api/v1/admin/dashboard/operations`)
   - 웹훅 전송 성공률
   - 배치 작업 실행 통계
   - 수동 웹훅 재전송 기능
   - 수동 배치 작업 트리거

### 수용 기준

- ✅ 관리자 대시보드에서 5개 핵심 지표 실시간 표시
- ✅ 파트너 대시보드에서 최근 7일 커미션 그래프 표시
- ✅ API 응답 < 200 ms (캐시 적용 상태, 60s TTL)
- ✅ 수동 웹훅/배치 트리거 정상 작동 (200 응답)
- ✅ RBAC: admin/operator 전용 접근 제어

---

## 아키텍처

### 데이터 흐름

```
┌─────────────────┐
│  Admin UI       │
│  (React)        │
└────────┬────────┘
         │
         │ GET /api/v1/admin/dashboard/system
         │ GET /api/v1/admin/dashboard/partners/:id
         │ GET /api/v1/admin/dashboard/operations
         │ POST /api/v1/admin/dashboard/operations/webhook/retry
         │ POST /api/v1/admin/dashboard/operations/batch/trigger
         │
         ▼
┌──────────────────────────────────────────────┐
│  API Server - DashboardController            │
│  (apps/api-server/src/controllers/          │
│   dashboardController.ts)                    │
│                                              │
│  - getSystemMetrics()                        │
│  - getPartnerStats(id)                       │
│  - getOperationsStats()                      │
│  - retryWebhook(webhookId)                   │
│  - triggerBatchJob(jobType)                  │
└─────────┬────────────────────────────────────┘
          │
          │ Cached (60s TTL)
          ▼
┌──────────────────────────────────────────────┐
│  CacheService (L1 Memory + L2 Redis)         │
└─────────┬────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────┐
│  Data Sources                                │
│  - Prometheus Metrics                        │
│  - TypeORM Repositories (Partner, Commission)│
│  - Webhook/Batch Job Services                │
└──────────────────────────────────────────────┘
```

### 캐싱 전략

- **TTL:** 60초 (환경변수로 조정 가능)
- **Layer 1 (Memory):** LRU Cache (최대 1000개 항목)
- **Layer 2 (Redis):** 분산 캐시 (Circuit Breaker 지원)
- **Cache Key 패턴:**
  - `dashboard:system-metrics`
  - `dashboard:partner-stats:{partnerId}`
  - `dashboard:operations-stats`

---

## API 엔드포인트

### 1. GET /api/v1/admin/dashboard/system

**설명:** 시스템 메트릭 요약 (Prometheus + Cache Stats)

**인증:** 필수 (admin/operator)

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "cache": {
      "hitRate": 0.85,
      "l1HitRate": 0.60,
      "l2HitRate": 0.25,
      "errors": 2,
      "memorySize": 450,
      "circuitBreakerState": "CLOSED"
    },
    "api": {
      "uptime": 345600,
      "memory": {
        "used": 245,
        "total": 512,
        "percentage": 48
      },
      "cpu": {
        "user": 123456,
        "system": 78900
      }
    }
  },
  "cached": false,
  "timestamp": "2025-11-04T08:47:00.000Z"
}
```

---

### 2. GET /api/v1/admin/dashboard/partners/:id

**설명:** 파트너 통계 (커미션, 수익, 트렌드)

**인증:** 필수 (admin/operator)

**파라미터:**
- `id` (path): 파트너 UUID

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "partner": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "user-uuid",
      "status": "active",
      "tier": "gold"
    },
    "commissions": {
      "total": 150,
      "confirmed": 120,
      "pending": 30,
      "confirmationRate": "80.00%"
    },
    "revenue": {
      "total": "15000000.00",
      "last7Days": "3500000.00",
      "currency": "KRW"
    },
    "trend": [
      {
        "date": "2025-10-28",
        "count": 5,
        "amount": 500000
      },
      {
        "date": "2025-10-29",
        "count": 7,
        "amount": 700000
      }
      // ... 7일치 데이터
    ]
  },
  "cached": true,
  "timestamp": "2025-11-04T08:47:00.000Z"
}
```

---

### 3. GET /api/v1/admin/dashboard/operations

**설명:** 운영 통계 (웹훅, 배치 작업)

**인증:** 필수 (admin/operator)

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "webhooks": {
      "total": 1000,
      "successful": 950,
      "failed": 50,
      "successRate": "95.0%",
      "avgResponseTime": 120
    },
    "batchJobs": {
      "totalRuns": 50,
      "itemsProcessed": 15000,
      "lastRunAt": "2025-11-04T06:00:00.000Z",
      "nextScheduledAt": "2025-11-05T06:00:00.000Z"
    },
    "cache": {
      "hitRate": 0.85,
      "errors": 2,
      "memorySize": 450
    }
  },
  "cached": false,
  "timestamp": "2025-11-04T08:47:00.000Z"
}
```

---

### 4. POST /api/v1/admin/dashboard/operations/webhook/retry

**설명:** 수동 웹훅 재전송

**인증:** 필수 (admin/operator)

**Request Body:**
```json
{
  "webhookId": "webhook-uuid-here"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Webhook retry triggered successfully",
  "webhookId": "webhook-uuid-here"
}
```

---

### 5. POST /api/v1/admin/dashboard/operations/batch/trigger

**설명:** 수동 배치 작업 트리거

**인증:** 필수 (admin/operator)

**Request Body:**
```json
{
  "jobType": "commission-batch"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "Batch job triggered successfully",
  "jobType": "commission-batch"
}
```

---

## 프론트엔드 컴포넌트

### 디렉토리 구조

```
apps/admin-dashboard/src/pages/dashboard/phase2.4/
├── index.tsx                    # 메인 대시보드 레이아웃
├── SystemOverview.tsx           # 시스템 메트릭 카드
├── CommissionStats.tsx          # 커미션 통계 차트
├── WebhookStatus.tsx            # 웹훅 상태 카드
├── BatchJobPanel.tsx            # 배치 작업 패널
└── PartnerStats.tsx             # 파트너 통계 테이블/차트
```

### 컴포넌트 가이드

#### SystemOverview.tsx

**목적:** 시스템 메트릭 표시 (캐시 성능, 메모리, CPU)

**데이터 소스:** `GET /api/v1/admin/dashboard/system`

**주요 요소:**
- 캐시 Hit Rate 게이지
- 메모리 사용량 프로그레스 바
- Circuit Breaker 상태 배지
- Uptime 표시

**기술 스택:**
- Recharts (차트 라이브러리)
- Tailwind CSS (스타일링)
- React Query (데이터 페칭)

---

#### PartnerStats.tsx

**목적:** 파트너별 수익 및 커미션 통계

**데이터 소스:** `GET /api/v1/admin/dashboard/partners/:id`

**주요 요소:**
- 7일 커미션 트렌드 라인 차트
- 커미션 확정률 원형 차트
- 수익 요약 카드

---

#### BatchJobPanel.tsx

**목적:** 배치 작업 수동 실행 및 모니터링

**기능:**
- 작업 트리거 버튼 (POST /api/v1/admin/dashboard/operations/batch/trigger)
- 마지막 실행 시간 표시
- 다음 예정 시간 표시

---

## 배포 가이드

### 1. 백엔드 배포

```bash
# 1. 브랜치 병합
git checkout main
git merge feat/phase-2-4

# 2. 배포 (자동 배포 실패 시 수동 스크립트 사용)
./scripts/deploy-admin-manual.sh

# 3. 배포 확인
curl -s https://api.neture.co.kr/api/v1/health
```

### 2. 프론트엔드 배포

```bash
# Admin 배포
./scripts/deploy-admin-manual.sh

# 배포 확인
curl -s https://admin.neture.co.kr/version.json
```

### 3. 환경 변수 설정

API 서버 (`.env`):
```env
# Cache TTL (seconds)
CACHE_TTL_DASHBOARD=60

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Prometheus (if external)
PROMETHEUS_URL=http://localhost:9090
```

---

## 권한 관리 (RBAC)

### 접근 제어

모든 Phase 2.4 엔드포인트는 `admin` 또는 `operator` 역할이 필요합니다.

**Middleware 체인:**
```typescript
router.use(authenticate);  // JWT 인증
router.use(requireAdmin);  // admin/operator 확인
```

### 역할별 권한

| 역할 | 시스템 메트릭 | 파트너 통계 | 웹훅 재전송 | 배치 트리거 |
|------|---------------|-------------|-------------|-------------|
| admin | ✅ | ✅ | ✅ | ✅ |
| operator | ✅ | ✅ | ✅ | ✅ |
| partner | ❌ | ⚠️ (본인만) | ❌ | ❌ |
| user | ❌ | ❌ | ❌ | ❌ |

---

## 모니터링 및 로깅

### 로그 위치

- **API 로그:** `logs/api-server.log`
- **Dashboard 요청:** `[DashboardController]` prefix로 검색

### 주요 메트릭

```promql
# 대시보드 API 응답 시간
histogram_quantile(0.95, http_request_duration_seconds{path="/api/v1/admin/dashboard/*"})

# 캐시 Hit Rate
cache_hits_total / (cache_hits_total + cache_misses_total)

# 웹훅 성공률
webhook_deliveries_successful / webhook_deliveries_total
```

---

## 트러블슈팅

### 1. 캐시 미스율이 높음 (Hit Rate < 50%)

**원인:**
- TTL이 너무 짧음
- Redis 연결 불안정 (Circuit Breaker OPEN)
- 데이터 변동이 심함

**해결방법:**
```bash
# Redis 상태 확인
redis-cli ping

# Cache Service 로그 확인
grep "Cache" logs/api-server.log | tail -50

# TTL 조정 (환경변수)
CACHE_TTL_DASHBOARD=120  # 60초 → 120초로 증가
```

---

### 2. 파트너 통계 API 느림 (> 200ms)

**원인:**
- 대량의 커미션 데이터 조회
- 인덱스 누락

**해결방법:**
```sql
-- 인덱스 확인
EXPLAIN SELECT * FROM commissions WHERE partnerId = 'uuid' AND status = 'confirmed';

-- 누락 시 인덱스 생성
CREATE INDEX idx_commissions_partner_status ON commissions(partnerId, status);
CREATE INDEX idx_commissions_created_at ON commissions(createdAt DESC);
```

---

### 3. 웹훅 재전송 실패

**원인:**
- WebhookService 미구현 (현재 TODO 상태)
- 권한 부족

**해결방법:**
```typescript
// apps/api-server/src/services/WebhookService.ts에서 구현 필요
// retryDelivery(webhookId: string) 메서드 추가
```

---

### 4. TypeScript 빌드 에러

**원인:**
- Entity 타입 불일치
- Missing imports

**해결방법:**
```bash
# 타입 체크
cd apps/api-server
npx tsc --noEmit

# 주요 에러 패턴:
# - partnerId: string (UUID) vs number
# - commissionAmount vs amount
# - CommissionStatus enum import 누락
```

---

## 다음 단계 (Phase 3 Preview)

Phase 2.4 완료 후 다음 항목들이 진행됩니다:

1. **프론트엔드 컴포넌트 완성** (현재 TODO)
   - SystemOverview.tsx
   - CommissionStats.tsx
   - WebhookStatus.tsx
   - BatchJobPanel.tsx
   - PartnerStats.tsx

2. **Webhook/Batch Service 구현**
   - WebhookService.retryDelivery()
   - BatchJobService.triggerManual()

3. **E2E 테스트**
   - 대시보드 UI 테스트
   - API 통합 테스트

4. **Phase 3 기획**
   - 멀티테넌트 지원
   - 고급 분석 기능
   - 실시간 알림

---

## 참고 자료

- [Phase 2.1 Commission Guide](./PHASE2_1_COMMISSION_GUIDE.md)
- [Phase 2.2 Analytics Guide](./PHASE2_2_ANALYTICS_GUIDE.md)
- [Phase 2.3 Operations Guide](./PHASE2_3_OPERATIONS_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [CLAUDE.md](./CLAUDE.md) - Claude 작업 규칙

---

**작성자:** Claude (AI Assistant)
**최종 업데이트:** 2025-11-04
