# CHECK-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1

> **상태**: 구현·로컬 검증 완료 → CI·배포·콜드스타트 관측 _(§8~§10 갱신)_
> **작성일**: 2026-09-13
> **WO**: WO-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1
> **기준 SHA**: `64c6c7ba2` (origin/main · 이번 범위 clean · 다른 세션 dirty 1건 `IR-O4O-CROSSSERVICE-…` 불가침)
> **작업 위치**: 메인 저장소, path-specific stage — 디스크 4.9 GB 여유라 새 worktree 부트스트랩(수 GB)은 앞선 ENOSPC 사고 재발 위험이 있어 만들지 않았다

---

## 0. WO 전제의 정정 — 먼저 읽을 것

WO §1 은 "API 가 HTTP port 를 먼저 열고 → TCP probe 성공 → 트래픽 → DB 준비 전 요청 실패" 라고 가정했다.
**로그를 인스턴스 단위로 재구성한 결과 그 순서는 이미 아니었다.**

### 0-1. 관측된 콜드스타트 실제 타임라인 (revision `o4o-core-api-03642-7f9` · instance `…e8e77210` · 2026-09-13 UTC)

| 시각 | 사건 |
|---|---|
| 05:36:08.952 | `GET /api/v1/guide/contents` **500 · latency 8.525s** (bingbot) — request 로그 |
| 05:36:08.972 | `Starting new instance. Reason: AUTOSCALING` ← **이 요청이 스케일아웃을 유발** |
| 05:36:14.748 | node 프로세스 첫 로그 (컨테이너 스케줄링 ~6s) |
| 05:36:15.18 | `Initializing database…` · `attempt 1/5` |
| 05:36:16.62 | `✅ Database connection successful` · `Database ready` |
| 05:36:17.63 | `Initialization sequence completed` → Passport → 도메인 라우트 |
| **05:36:17.81** | **`STARTUP TCP probe succeeded after 1 attempt … port 8080`** ← listen 은 여기 |
| 05:36:17.83 | 첫 앱 처리 요청 (siteguide CORS 차단 로그) |

- **앱은 DB 준비(16.62) → 라우트 등록 → listen(17.8) 순서였다.** `main.ts` 의 `httpServer.listen()` 은 이미 `startupService.initialize()` 와 `registerDomainRoutes()` 뒤에 있다(`WO-O4O-CARE-AI-CHAT-STABILITY-FIX-V1` 시점부터).
- 500 요청은 **앱이 처리한 적이 없다**. 앱 로그에 해당 요청의 흔적(에러 핸들러 · CORS · 라우트)이 0 이고, 프로세스가 뜨기 전(14.7s)에 이미 8.5s 가 흘렀다. 스케일아웃을 유발한 요청이 새 인스턴스에 고정된 채 기동을 기다리다 **Cloud Run 인프라 계층에서 실패**한 것이다(요청 종료 08.95 vs listen 17.8 — 시각이 시작이든 종료든 앱 도달 전).
- 즉 "DB 준비 전 앱이 500 을 냈다" 는 성립하지 않는다. 실제 병목은 **인스턴스 시작 → listen 까지 ~9s** 이고, 그 중 ~6s 는 컨테이너 스케줄링(앱 코드 밖), ~3s 는 앱 초기화다.

### 0-2. 그래도 이 WO 가 닫아야 했던 실제 갭 (조사에서 확인)

| # | 갭 | 실증 |
|:-:|---|---|
| 1 | **프로덕션 `GRACEFUL_STARTUP=true`** — DB 연결이 5회 모두 실패해도 `"Continuing without database"` → 라우트 등록 → **listen → TCP probe 성공 → 트래픽** → 모든 DB 의존 route 500 | `startup.service.ts:147-153` · `main.ts` 2곳 · `deploy-api.yml --set-env-vars="GRACEFUL_STARTUP=true"`. WO §6 표 1행 그대로 |
| 2 | 서버 준비 상태의 **정본이 없었다** — `/health/ready` 는 `SELECT 1` 만 보고, "graceful 로 DB 없이 뜬 프로세스" 와 "shutdown 중" 을 구분하지 못함 | `checkReadiness()` |
| 3 | 배포 검증이 **liveness(`/health`, 항상 200)** 를 봄 → 배포 성공의 근거가 아님 | `deploy-api.yml Verify deployment` |
| 4 | 기동 로그에 **접속 문자열** 출력 — `Database: <db>@<host>:<port>` · `Database configuration: {host, username, …}` · 재시도 실패 시 pg 에러 객체 전체(`address`) | `env-validator.ts:97` · `startup.service.ts` |
| 5 | 워크플로 주석이 stale — "Server starts immediately, DB connects async" | 사실과 다름 |

§0-1 의 인프라 계층 500(스케일아웃 대기 실패)은 **앱 코드로는 막을 수 없고**, 완화 수단(minScale · startup CPU boost — 이미 `true`)은 WO §12 변경 금지 범위다 → §12 보고.

---

## 1. 변경 전 · 후 startup sequence

```text
[전]  process → liveness 핸들러 등록 → 미들웨어 → core routes → swagger
      → startupService.initialize()  ── DB 5회 재시도 ──┐
                                       실패 & GRACEFUL=true → "Continuing without database" (return)
      → passport → domain routes → error handler → httpServer.listen()  ← DB 없이도 도달
      → (Cloud Run TCP probe 성공 → 트래픽 → DB route 500)

[후]  process ──[STARTUP] process_start
      → liveness 핸들러 등록(port 아직 닫힘) → 미들웨어 → core routes → swagger
      → startupService.initialize() ──[STARTUP] db_connecting ── DB 5회 재시도(예산 ≤105s)
            성공 → "Database ready"
            실패 → 프로덕션: [STARTUP] failed → throw → main: process.exit(1)   (port 열리지 않음)
                   비프로덕션(GRACEFUL): 계속, 상태는 DB_CONNECTING 유지
      → passport → domain routes → error handler
      → AppDataSource.isInitialized 이면 [STARTUP] ready
      → httpServer.listen() ──[STARTUP] http_listen                             (한 곳 · 한 번)
      → Cloud Run TCP probe 성공 → 트래픽
      SIGTERM/SIGINT → [STARTUP] shutting_down → httpServer.close() → services.shutdown → exit
```

상태 정본: `apps/api-server/src/bootstrap/startup-state.ts` — `STARTING → DB_CONNECTING → READY`, `STARTING|DB_CONNECTING → FAILED`, `READY|FAILED → SHUTTING_DOWN`. 전환은 `transitionStartupState()` 하나로만. 허용되지 않는 전환(예: `STARTING → READY`)은 throw.

## 2. Cloud Run probe 설정 (전 · 후 동일 — 변경 없음)

```yaml
startupProbe: { tcpSocket: { port: 8080 }, failureThreshold: 1, periodSeconds: 240, timeoutSeconds: 240 }
livenessProbe: (없음)
timeoutSeconds: 300 · min-instances 0 · max 10 · concurrency 80 · startup-cpu-boost: true
```

TCP probe 는 port 개방 = 성공이므로, **listen 을 READY 이후로 두는 것이 곧 트래픽 게이트**다. probe 자체는 바꾸지 않았다(WO §5.1 우선안 채택 · §5.2 대안 불요).

## 3. DB retry · timeout (상수화 · `startup-state.ts`)

| 상수 | 값 |
|---|---|
| `DB_CONNECT_MAX_ATTEMPTS` | 5 |
| `DB_CONNECT_ATTEMPT_TIMEOUT_MS` | 15,000 |
| `DB_CONNECT_RETRY_BASE_DELAY_MS` | 3,000 (백오프 3·6·9·12s) |
| `DB_CONNECT_TOTAL_BUDGET_MS` | **105,000** = 5×15s + 30s < startup probe **240s** (spec 이 고정) |

무한 재시도 없음 · 고정 긴 sleep 없음 · 실패 시 로그는 `attempt/max · code · name` 만(에러 객체 전체 미출력).

## 4. `GRACEFUL_STARTUP` 최종 판정

| 조사 항목 | 결과 |
|---|---|
| 도입 | "Phase 2.5 GRACEFUL_STARTUP Policy" — "Express server MUST start and listen on PORT / DB is optional / degraded functionality". 워크플로 주석의 사유: Cloud SQL 소켓이 5-10s 늦게 떠 timeout 나던 시절 |
| 프로덕션 실제 분기 | `deploy-api.yml` 이 `GRACEFUL_STARTUP=true` 명시 → DB 실패 후 **listen** (갭 1) |
| 정식 degraded mode 계약 | **없음** (사업·운영 문서 0) |
| 소비처 | `startup.service.ts` · `main.ts` 2곳 · `errorHandler.middleware.ts`(런타임 uncaught 예외 정책 — startup 아님) |

**판정**: 프로덕션에서 **비활성화** — `isGracefulStartupAllowed()` 는 `NODE_ENV=production` 이면 env 와 무관하게 `false`. 비프로덕션(로컬 · 테스트)에서만 `GRACEFUL_STARTUP !== 'false'` 로 DB 없이 기동 허용(개발 편의 분리). 워크플로의 env 설정은 dead configuration 으로 **제거**. Cloud SQL 지연은 재시도 예산(105s)이 흡수한다.
`errorHandler.middleware.ts` 의 런타임 분기는 이번 범위(startup gate) 밖이며, env 제거 후에도 `undefined !== 'false'` 로 **동작 불변** — §12 보고.

## 5. Health endpoint 계약표

| 엔드포인트 | 의미 | DB 확인 | 준비 전 | READY | SHUTTING_DOWN | 소비자 |
|---|---|:-:|---|---|---|---|
| `GET /health` (main.ts) | liveness | X | (port 닫힘) | 200 | 200 | Dockerfile HEALTHCHECK · 옛 deploy verify |
| `GET /health/live` | liveness | X | (port 닫힘) | 200 | 200 | — |
| **`GET /health/ready`** | readiness | **O** (`getStartupState()==='READY'` **AND** `SELECT 1`) | 503 (비프로덕션 graceful 경로에서 listen 된 경우) | 200 | **503** | **deploy verify (신규)** |
| `GET /health/database` · `/detailed` | 컴포넌트 | O | — | 200/503 | — | — |
| `GET /` (GoogleHC UA) | liveness | X | — | 200 | — | — |

readiness 에 catch→200 없음(`catch → return false` → 503). 응답에 host · username · 접속 문자열 · stack 없음(spec 고정). migration pending 검사 없음(선행 계약).

## 6. Migration job 비회귀

`deploy-api.yml` 순서 `Build and Push → Run database migrations(Job dist/migrate.js) → Deploy to Cloud Run → Verify` 불변 · migration step 에 `continue-on-error`/`|| true` 0 · API 시작 명령 `dist/main.js` 와 job `dist/migrate.js` 분리 · startup 에 `runMigrations/showMigrations/.up(` 0 · `synchronize: false` — 신규 spec + 선행 spec(`database-migration-ownership-…`)이 이중으로 고정.

## 7. 변경 파일 (9)

```text
A  apps/api-server/src/bootstrap/startup-state.ts            상태 정본 · isGracefulStartupAllowed · DB 예산 상수 · [STARTUP] 로그
M  apps/api-server/src/main.ts                                 프로덕션 fail-fast(exit 1) · READY 전환 후 listen · 구조화 로그
M  apps/api-server/src/services/startup.service.ts             DB_CONNECTING/FAILED 전환 · 프로덕션 throw · 예산 상수 · 로그 위생
M  apps/api-server/src/routes/health.ts                        checkReadiness: READY 선행 조건
M  apps/api-server/src/bootstrap/setup-shutdown.ts             SHUTTING_DOWN 전환
M  apps/api-server/src/utils/env-validator.ts                  접속 문자열 로그 제거
M  .github/workflows/deploy-api.yml                            GRACEFUL_STARTUP env 제거 · stale 주석 정정 · verify → /health/ready
A  apps/api-server/src/__tests__/api-database-readiness-cold-start-gate.spec.ts   (22 tests)
M  apps/api-server/src/__tests__/database-migration-ownership-startup-health-final-closure.spec.ts   (GRACEFUL 단언 1건 갱신)
```

schema · migration · 운영 데이터 · 권한 · minScale · probe · Dockerfile · dependency 변경 **0**.

## 8. 테스트

### 8-1. 계약 spec (`api-database-readiness-cold-start-gate.spec.ts`, 22 tests)

| WO §10.1 | 검증 방식 | 결과 |
|:-:|---|---|
| 1·2 listen 은 DB 초기화 후 정확히 한 번 | main.ts 순서(initialize < registerDomainRoutes < READY < listen) · `listen(` 1회 | ✅ |
| 3·4 DB 실패 → listen 0 · exit non-zero | 프로덕션 분기 `!isGracefulStartupAllowed() → process.exit(1)` · `process.env.GRACEFUL_STARTUP` 직접 참조 0 | ✅ + **§8-2 시뮬 A** |
| 5 재시도 후 성공 시 정상 기동 | 예산 상수 · 루프 상수 사용 | ✅ + 운영(§10) |
| 6·7 migration · seed 0 | `runMigrations|showMigrations|.up(queryRunner` 0 · `synchronize:false` | ✅ |
| 8·9 readiness 준비 전 503 / 후 200 | `checkReadiness` 가 READY 선행 + SELECT 1, catch→false | ✅ + **§8-2 시뮬 B** |
| 10 liveness/readiness 분리 | `/health` · `/live` 에 DB 참조 0 | ✅ |
| 11 catch 로 200 위장 없음 | `/ready` 503 ×2 · catch→200 0 | ✅ |
| 12 migration job command 불변 | `dist/migrate.js` · Dockerfile `dist/main.js` | ✅ |
| 13 shutdown 신규 요청 거부 | `SHUTTING_DOWN` 전환 + `httpServer.close` | ✅ |
| 14 route 등록 후 listen | 순서 검사 | ✅ |
| 상태 머신 | STARTING→READY 직행 금지 · FAILED/SHUTTING_DOWN 종단 · 프로덕션 graceful=false | ✅ |
| 예산 < probe | 105,000 < 240,000 | ✅ |
| workflow | migration→deploy · `GRACEFUL_STARTUP=` 0 · verify `/health/ready` · 5회 · exit 1 · 삼킴 0 | ✅ |

### 8-2. 로컬 기동 시뮬레이션 (tsup 번들 `dist/main.js`, DB 도달 불가 `127.0.0.1:1`)

| 시뮬 | 조건 | 관측 |
|---|---|---|
| **A** | `NODE_ENV=production` | `phase=process_start` → `db_connecting` → attempt 1…5 (ECONNREFUSED · 30.8s) → **`phase=failed`** → `Startup FAILED (production): exiting without opening the HTTP port` → **exit 1**. `http_listen` **0** · `listening on` **0** · 로그에 host/address **0** |
| **B** | `NODE_ENV=development` (graceful) | 5회 실패 후 계속 → `http_listen`(51s). `GET /health` **200** · `/health/live` **200** · **`/health/ready` 503** `not ready` (상태 DB_CONNECTING 유지, READY 미도달) |

### 8-3. 회귀

| 단계 | 결과 |
|---|---|
| api-server type-check | ✅ 0 |
| 신규 spec + 선행 migration-ownership spec | ✅ 49/49 |
| eslint (변경 6 파일) | ✅ 0 (regex-spaces 1건 수정) |
| api lint 전체 | 44 errors = baseline · 내 파일 0 |
| `check-unsafe-routes` | ✅ 1122 파일 · 위반 0 |
| api-server `build` · `build:api`(tsup) | ✅ |
| api-server 전체 Jest (`--runInBand`) | **274/275 suites · 4,508 pass · 21 skipped**. 실패 1 = `main-site-full-source-deletion`(로컬 미추적 `apps/main-site/{dist,node_modules}` 잔여물 — 선행 CHECK 들과 동일, 무관) |
| `build:packages` · `type-check:frontend` | ✅ exit 0 · 0 errors (workspace 회귀 없음) |

## 9. CI · 배포

_(push 후 갱신)_

## 10. 콜드스타트 관측 · 운영 API · 로그

_(배포 후 갱신)_

## 11. 완료 판정

_(§9·§10 후 갱신)_

## 12. 중지 · 미처리 · 보고

| # | 항목 | 처분 |
|:-:|---|---|
| 1 | §0-1 의 **인프라 계층 500** — 스케일아웃을 유발한 요청이 인스턴스 기동(~9s: 컨테이너 스케줄링 ~6s + 앱 초기화 ~3s)을 기다리다 Cloud Run 이 실패시킴. 앱 코드로 막을 수 없음 | 완화 수단은 `min-instances`(WO §12 변경 금지) · `startup-cpu-boost`(**이미 true**) · 이미지/초기화 경량화. **보고만** — minScale 정책은 사용자 판단 |
| 2 | `errorHandler.middleware.ts` 의 런타임 `uncaughtException/unhandledRejection` 이 `GRACEFUL_STARTUP==='false'` 일 때만 exit — startup 정책이 아니라 런타임 crash 정책. env 제거 후에도 분기 동일(계속 실행) | 범위 밖 · 동작 불변 · 보고 |
| 3 | `apps/api-server/src/scripts/*dryrun*.ts` 2개가 `console.error` 로 `host=…` 출력 — 로컬 CLI 도구, Cloud Run 서비스 경로 아님 | 보고 |
| 4 | WO §13 중지 조건 1~14 | **미발동** (probe/retry 정합 ✅ · 정상 DB 에서 readiness 200 = §10 실측 · 외부 모니터링 계약 = uptime check 0건(선행 IR) · 겹치는 세션 변경 0) |

## 13. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

`PRODUCTION-MIGRATION-STANDARD.md` 의 migration 소유권 서술과 충돌 없음. `SETUP.md` 는 GRACEFUL_STARTUP 을 언급하지 않는다.
