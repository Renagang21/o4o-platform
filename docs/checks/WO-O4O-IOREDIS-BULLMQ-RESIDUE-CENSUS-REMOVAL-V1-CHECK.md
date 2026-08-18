# CHECK — WO-O4O-IOREDIS-BULLMQ-RESIDUE-CENSUS-REMOVAL-V1

- 작업일: 2026-08-18
- 대상: 저장소 전체 (`ioredis` / `redis` / `bullmq` 잔재)
- 선행: `WO-O4O-REDIS-REMOVAL-V1` (Memorystore · VPC Connector 폐기, commit `e3c3b2fa3`)
- 판정: **DEAD_RUNTIME 잔재 제거 완료 · ACTIVE 소비처 0 · UNKNOWN 0**

---

## 1. Census 요약

전수조사 결과 Redis/BullMQ 관련 지점 **41건**을 식별했다.

| 판정 | 건수 | 처리 |
|---|---:|---|
| ACTIVE | 0 | — |
| DEAD_RUNTIME | 20 | 제거 |
| PACKAGE_ONLY | 6 | 제거 |
| TEST_ONLY | 0 | — |
| DOC_ONLY | 13 | 11 유지(기록물) · 2 설명 주석으로 대체 |
| UNKNOWN | 0 | — |

**ACTIVE 0 · UNKNOWN 0** 이므로 §7 중지 조건에 해당하지 않았다.

---

## 2. DEAD_RUNTIME — 근거와 제거 내역

### 2-1. BullMQ 큐/워커 (생산자 0)

| 대상 | dead 근거 |
|---|---|
| `src/services/ai-job-queue.service.ts` (`Queue 'ai-generation'`) | `add()` 호출 producer 0건. route·service·script 어디에서도 import 없음 |
| `src/workers/ai-job.worker.ts` (`Worker 'ai-generation'`) | `getAIJobWorker()` 호출자 0건. `startup.service.ts` 의 `initializeWorkers()` 가 유일 경로였고 그 자체도 호출자 0 |
| `src/services/ai-dlq.service.ts` (`'ai-generation-dlq'`) | 위 워커 전용. 외부 소비처 0 |
| `src/services/ai-metrics.service.ts` | 위 큐 전용 지표. `/metrics` 노출 경로 없음 |
| `src/types/ai-job.types.ts` | 위 3개 파일 전용 타입 |
| `src/queues/webhook.queue.ts` (`Queue`/`Worker 'webhooks'`) | `enqueueWebhook()` 호출자 0건. webhook 전송은 동기 경로(`webhookDeliveries*` 지표)로만 동작 |
| `scripts/ai-admin-cli.ts` | 위 큐 조작용 CLI. `package.json` `ai:admin` 스크립트 외 참조 0, CI/배포에서 미실행 |

별도 worker entrypoint · cron · queue consumer 존재 여부 확인 결과:
- `Dockerfile` / `package.production.json` 의 시작 명령은 `main.js` 단일 entrypoint. worker 프로세스 없음
- Cloud Run 서비스는 `o4o-core-api` 단일. Cloud Scheduler → BullMQ 경로 없음
- CI 워크플로에 worker/queue job 없음

### 2-2. ioredis 직접 소비

| 대상 | 처리 |
|---|---|
| `src/types/cache.ts` | ioredis import 보유, 소비처 0 → 삭제 |
| `src/services/CacheService.ts` | **소비처 ACTIVE**(degradation 2곳 + metrics.middleware 1곳)이나, L2(Redis) 경로는 `redisClient = null` 고정으로 도달 불가 → **L1 전용으로 재작성**하고 ioredis 의존 제거. 공개 API 유지 |
| `src/cache/cache.config.ts` | `type: 'memory' \| 'redis'` 및 `REDIS_HOST/PORT/PASSWORD/DB/KEY_PREFIX` 분기 제거 → `type: 'memory'` 고정 |

`CacheService` 동작 보존 메모: `options.ttl` 은 이전에도 L2 전용이었고 L1 LRU 는 인스턴스 공통 TTL 을 사용했다. 동작 변경을 피하기 위해 동일하게 유지했다.

### 2-3. 설정 · 지표 · telemetry 잔재

| 대상 | dead 근거 |
|---|---|
| `src/config/app.config.ts` `queueConfig` + `features.queue` | 큐 자체가 사라져 status 의미 소멸. 소비처 2곳 함께 제거 |
| `src/middleware/metrics.middleware.ts` `redis_errors_total` · `recordRedisError()` | 호출자 0 |
| `src/middleware/metrics.middleware.ts` `webhook_queue_size` · `updateWebhookQueueMetrics()` | webhook 큐 제거로 생산자 0 |
| `src/services/prometheus-metrics.service.ts` `ai_*` 큐 지표 | 생산자 0 |
| `src/middleware/errorHandler.middleware.ts` `REDIS_CONNECTION_ERROR` | 참조 0 |
| `src/utils/telemetry.ts` `startJobWorkerSpan()` | 호출자 0 |
| `src/types/performance-types.ts` `RedisInfo` + `types/index.ts` re-export | 소비처 0 |
| `src/services/startup.service.ts` `initializeWorkers()` | 호출자 0 |

### 2-4. PACKAGE_ONLY · env · CI

| 대상 | 제거 항목 |
|---|---|
| `apps/api-server/package.json` | `bullmq ^5.61.0` · `ioredis ^5.8.2` · `@types/ioredis ^5.0.0` · `ai:admin` script |
| `apps/api-server/package.production.json` | `ioredis ^5.7.0` · `bullmq ^5.61.0` |
| `apps/api-server/package-apiserver.json` | `ioredis ^5.6.1` |
| `apps/api-server/tsup.config.ts` | external `ioredis` · `bullmq` |
| `apps/api-server/tsconfig.build.json` | `scripts/ai-admin-cli.ts` |
| `.env.example` | `REDIS_HOST/PORT/PASSWORD/DB` 블록 |
| `apps/api-server/env.example` | `REDIS_URL=redis://localhost:6379` 블록 |
| `.github/workflows/deploy-api.yml` | `REDIS_HOST=10.165.134.11` · `REDIS_PORT=6379` · `REDIS_ENABLED=true` (3줄) |
| `pnpm-lock.yaml` | 재생성 (14 insertions / 134 deletions) |

---

## 3. 의도적으로 남긴 항목 (제거 금지 판정)

| 항목 | 판정 | 유지 이유 |
|---|---|---|
| `packages/types/src/performance.ts` · `.d.ts` `RedisInfo` | DOC_ONLY(공개 계약) | 공유 published 패키지의 외부 표면. 소비처 0 이나 패키지 계약 변경은 별도 WO 대상 |
| `pnpm-lock.yaml` 의 `ioredis` / `redis` 항목 | PACKAGE_ONLY(불가피) | **TypeORM 의 optional peerDependencies** (`peerDependenciesMeta.ioredis.optional: true`). 앱 dependency 아님. 실제 설치 안 됨 |
| `workspace-packages.json` | DOC_ONLY | 과거 `npm ls` 스냅샷(EC2 경로 포함). 빌드·런타임 소비처 0 인 고아 파일. 정리는 Redis 무관 → 별도 WO |
| `docs/archive/**` · `docs/investigations/**` · `docs/work-orders/**` · `docs/checks/**` 언급 | DOC_ONLY | 과거 시점 사실 기록물. CLAUDE.md §16-1 에 따라 정비 대상 아님 |
| `docs/baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md:215` `- 비동기 AI Job (BullMQ)` | DOC_ONLY | **§9 향후 확장 후보 / Phase 3** 항목. 현재 구현 서술이 아니라 미래 후보이므로 잔재가 아님. 유지 |
| `src/config/app.config.ts:296` · `src/services/prometheus-metrics.service.ts:5` 주석 | 설명 주석 | 제거 경위를 남긴 WO 주석. 코드 아님 |

---

## 4. 재검색 결과

`node_modules` · `.git` · `dist` · `docs` · `pnpm-lock.yaml` · `workspace-packages.json` 제외 전수 재검색(`ioredis|bullmq|BullMQ|REDIS_|redisClient|new Queue\(|new Worker\(`):

- 코드 잔존 **0건** (위 3장 설명 주석 2건 제외)
- `apps/api-server/node_modules` 내 `ioredis` · `bullmq` 디렉터리 **부재** 확인
- 빌드 산출물 `dist/main.js` 에 `ioredis` · `bullmq` · `new Queue(` · `new Worker(` **0건**

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `npm run type-check` (api-server) | PASS (clean) |
| `pnpm run build` (tsc) | PASS |
| `pnpm run build:api` (tsup) | PASS · `main.js` 8.57 MB |
| `npx jest --ci` (api-server) | **PASS · 141 suites / 2237 tests 전부 통과** (152s) |
| dist 문자열 검사 | ioredis/bullmq 0건 |

### 5-1. 사전 존재 실패 (본 WO 무관 · 숨기지 않고 명시)

fresh worktree 에서 아래 패키지 빌드가 실패한다. 원인은 workspace 빌드 순서(`@o4o/ui` · `@o4o/shortcodes` 미빌드)이며 Redis/BullMQ 와 무관하다. api-server 의 type-check · build · test 는 이들 없이 통과한다.

- `@o4o/cosmetics-seller-extension`
- `@o4o/utils`
- `@o4o/shortcodes`

### 5-2. 배포 계약 변경

`deploy-api.yml` 의 `--set-env-vars` 에서 `REDIS_HOST` · `REDIS_PORT` · `REDIS_ENABLED` 3개가 제거된다. `--set-env-vars` 는 env 집합을 치환하므로 **다음 배포에서 Cloud Run 서비스의 REDIS_* 환경변수가 사라진다.** 이를 읽는 런타임 코드는 이미 0건이다.

---

## 6. 결론

본 WO 범위(`ioredis` / `redis` / `bullmq` 잔재)에 한해 **ACTIVE 0 · UNKNOWN 0 · 잔존 코드 0** 이 확인되었다. 남은 것은 TypeORM optional peer(lockfile) · 공유 타입 패키지의 `RedisInfo` · 기록물 문서뿐이며, 모두 유지 근거가 명확하다.
