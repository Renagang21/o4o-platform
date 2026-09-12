# CHECK-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1

> **상태**: **CLOSED** — CI 3/3 success · migration job 성공 · 새 revision startup/health PASS (§11~§13)
> **작성일**: 2026-09-12
> **WO**: WO-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1

---

## 1. 작업 기준 SHA · worktree (§1.1)

```text
기준 SHA (origin/main) : 71ba4e074bd66da231d300233bc4033a9c2984ce
메인 worktree          : C:/Users/sohae/o4o-platform  main @ 71ba4e074 · git status clean
작업 worktree          : C:/tmp/o4o-db-migration  branch work/db-migration-ownership-final-closure-v1 (origin/main 기반)
기존 worktree          : 15개 (D:/o4o-event-offer-order 는 prunable 표시 — 손대지 않음)
PharmacyHub 등 다른 세션 변경 : 메인 worktree clean 이라 교집합 0. 작업은 전용 worktree 에서만 수행
```

---

## 2. 사전 조사 (§1.2 · §3) — 구현 전 기록

### 2-1. migration 실행 주체 전수표 (§3.1)

| 실행 위치 | 실행 조건 | 실행 명령 | transaction | 실패 처리 | 운영 사용 여부 |
|---|---|---|---|---|---|
| **Deploy migration job** (`deploy-api.yml` "Run database migrations") | `main` push 마다, **`gcloud run deploy` 트래픽 전환 *후*** | Cloud Run Job `o4o-api-migrations` → `node dist/migrate.js` (`--wait`, `--max-retries=1`) | `each` | `migrate.ts` exit 1 → step fail → **workflow fail (그러나 새 revision 은 이미 serving)** | ✅ 매 배포 실행 (2026-09-12 07:46 · 07:55 성공 이력) |
| **API startup** (`startup.service.ts:165-201`) | `NODE_ENV=production` && DB 연결 성공 → **모든 인스턴스 부팅마다** | `AppDataSource.showMigrations()` → `runMigrations({transaction:'each'})` | `each` | **catch → `warn` 후 계속 기동** → Seed 필터 → `migration.up(queryRunner)` 직접 호출 (실패 시 `release()` 미호출) | ✅ **실사용 — 30일 로그 실측 §2-2** |
| package script `migration:run:prod` | 수동 | `node scripts/run-migrations.mjs` → `node dist/database/run-migration.js` | — | — | ❌ **깨짐** — `src/database/run-migration.ts` 가 존재하지 않아 dist 산출물이 없음. 소비처 0 |
| 독립 runner `scripts/run-migration-standalone.mjs` | 수동 `--run` | raw `pg` 로 CREATE TABLE ×15 + INSERT seed user | 없음 | — | ❌ 소비처 0 (spec 1건이 raw-text 로 읽을 뿐). `typeorm_migrations` 미기록 · 자격정보 fallback 하드코딩 · **F9 로 제거된 `user_roles` 를 DROP+CREATE** · 은퇴한 `apps`·`app_usage_logs` 재생성 |
| 독립 runner `scripts/run-migration.js` | 수동 | `dist/database/connection.js`(전체 entity DataSource) 로 `runMigrations` | 기본 | — | ❌ 소비처 0 |
| 로컬 개발 `migration:run/show/revert/generate` · `db:setup` | 수동 | TypeORM CLI (`data-source.ts` → `connection.ts`) | — | CLI 표준 | ✅ 개발 정본 — 보존 |
| `migration:drop` · `migration:sync` · `db:reset` | 수동 | TypeORM CLI schema:drop / schema:sync | — | — | 로컬 파괴 명령 — 운영 호출 경로 0 (workflow·Dockerfile 미참조). §4.2 에 따라 **이번 WO 에서 손대지 않음** |
| CI (`ci-pipeline.yml`) | — | migration 실행 없음 (정적 entity 검사만) | — | — | — |

**§3.1 확인 항목 답**

| 질문 | 답 |
|---|---|
| migration job 이 새 revision 트래픽 전환 **전**에 완료되는가 | **아니오.** 순서가 `Deploy to Cloud Run`(트래픽 100%) → `Run database migrations` 다 |
| job 실패 시 API deployment 가 중단되는가 | **아니오.** deploy step 이 이미 성공한 뒤라 workflow 는 fail 하지만 새 revision 이 serving 중 |
| job 과 startup 이 같은 migration 집합을 참조하는가 | 예 — 둘 다 `dist/database/migrations/*.js` · `typeorm_migrations` (job 은 `migration-config`, startup 은 `connection.ts`) |
| 다중 인스턴스에서 startup migration 중복 실행 가능한가 | **예** — 인스턴스마다 `runMigrations` 호출. `transaction:'each'` + TypeORM 의 history 조회로 대부분 0건이지만 race 는 구조적으로 열려 있음 |
| `run-migrations.mjs` 가 history 를 정식 기록하는가 | 실행 자체가 불가(대상 파일 부재) |
| `continue-on-error` · `\|\| true` | migration job step 에는 **없음** (`2>/dev/null \|\|` 는 create-or-update 분기용) |
| 실제 job 이름·순서 | `o4o-api-migrations` · deploy **후** 실행 |
| rollback·재실행 멱등성 | job 재실행은 멱등(history 기반). 단 startup Seed fallback 은 history 를 우회해 **비멱등** |

### 2-2. startup migration 실측 (§3.2) — Cloud Run 로그 30일 (`o4o-core-api` 서비스 인스턴스, Job 아님)

| 로그 | 건수 | 의미 |
|---|---:|---|
| `Database migrations completed (0 executed)` | 183+ | 모든 인스턴스 부팅이 migration 실행 경로를 통과 |
| `Database migrations completed (1 executed)` | **16** | **API 서비스 인스턴스가 직접 스키마를 변경** |
| `Database migrations completed (2 executed)` | **1** | 동상 |
| `Pending migrations detected` | 33 | — |
| `Migration error (continuing)` | **3** (09-08 14:16 · 09-10 04:17 · 09-10 04:25) | **실패를 삼키고 기동 계속** |
| `Seed migration executed: …` | **45** (15종 × 3회) | 실패 부팅마다 Seed 15종을 `.up()` 직접 호출 — `typeorm_migrations` 우회 |

→ startup migration 은 dead path 가 아니라 **운영에서 실제로 스키마를 바꾸고 실패를 숨겨온 경로**다.
Seed 직접 실행은 history 에 기록되지 않으므로 다음 부팅·다음 job 에서 다시 대상이 된다(불일치 §3.2 질문 → **예**).
실패 시 `queryRunner.release()` 가 호출되지 않아 커넥션 누수 가능(§3.2 질문 → **아니오, 항상 release 하지 않음**).

`GRACEFUL_STARTUP`: 프로덕션 workflow 가 `GRACEFUL_STARTUP=true` 를 명시 설정. migration 블록은 이 값과 무관하게 실행된다(우회 없음).

### 2-3. health · readiness · liveness (§3.3)

| 경로 | 구현 | DB 의존 | 소비자 |
|---|---|---|---|
| `GET /health` | `main.ts:100` — 즉시 등록, **항상 200** (`status:'alive'`) | 없음 | deploy `Verify deployment` step (LB 도메인 curl, 5회) |
| `GET /health/live` | `routes/health.ts:113` — 항상 200 | 없음 | 없음(정의만) |
| `GET /health/ready` | `routes/health.ts:87` — `SELECT 1` + 메모리 90% → 실패 시 **503** | **있음** | 없음(정의만) |
| `GET /health/database` | `SELECT 1` · version · pg_stat_activity → 503 가능 | 있음 | 없음 |
| Cloud Run probe | **기본 TCP startupProbe :8080** (`failureThreshold 1 · period 240s`). livenessProbe 없음. HTTP probe 없음 | — | 플랫폼 |
| 외부 uptime check | `gcloud monitoring uptime list-configs` → **0건** | — | — |

→ liveness/readiness 는 이미 분리돼 있고 `/health/ready` 가 실제 DB readiness 를 본다. **새 endpoint 불필요 · status code 변경 불필요**(§7.5 미발생).

`DatabaseChecker` (`utils/database-checker.ts`):

```text
requiredTables = []                 → checkRequiredTables 항상 success
optionalTables = products/orders/categories/inventory/coupons/themes/posts/pages  → 은퇴 WP·commerce 개념
checkMigrations().pending = []      → 상수
healthy = connection && requiredTables.success = connection (initialize 직후라 항상 true)
소비처 = startup.service.ts 1곳 · 결과는 GRACEFUL_STARTUP=true(프로덕션)에서 로그만 남김
GRACEFUL_STARTUP=false 여도 healthy 가 false 가 될 수 없어 throw 불가
```

→ **어떤 probe·route·배포 판정에도 쓰이지 않는 no-op** → §4.4 **선택 B (제거)**.

### 2-4. 필수 테이블 판정 (§3.4)

선택 B 채택으로 `requiredTables` 하드코딩 자체가 사라진다. readiness 계약은 `/health/ready` 의 `SELECT 1`(연결)로 충분하며,
후보(`users` · `role_assignments` · `typeorm_migrations` · `organizations` · `platform_services` · `app_registry`)는 **확정값으로 채택하지 않는다** —
테이블 부재는 migration job 이 배포 전에 실패시키는 것이 정본 경로이지 readiness 가 대신 막을 일이 아니다.

### 2-5. 독립 runner 소비자 조사 (§3.5)

| 파일 | package.json | workflow | 문서(활성) | 테스트 | 다른 script | 최근 git | 판정 |
|---|---|---|---|---|---|---|---|
| `scripts/run-migration-standalone.mjs` (427줄) | 0 | 0 | 0 (IR 1건 = 기록물) | `app-instances-retirement.spec.ts` 가 raw-text 로 읽어 "app_instances 를 만들지 않는다" 단언 | 0 | `d9ecc678a` (app_instances 제거 시 내용 수정) | **제거** — spec 은 "파일 부재"로 강화 |
| `scripts/run-migrations.mjs` | `migration:run:prod` | 0 | 0 | 0 | 0 | — | **제거** (대상 `dist/database/run-migration.js` 부재 = 실행 불가) |
| `scripts/run-migration.js` | 0 | 0 | 0 | 0 | 0 | — | **제거** (같은 계열 독립 runner · 전체 entity DataSource 로 `runMigrations`) |

standalone 이 실행하는 DDL (요약): `users`(legacy `role`·`roles` 컬럼 포함) · `settings` · **`apps` · `app_usage_logs`**(은퇴, 정본 `app_registry`) · `roles` · `permissions` · `role_permissions` · `role_assignments` · `refresh_tokens` · `login_attempts` · `ai_settings` · **`DROP TABLE IF EXISTS "user_roles"` + CREATE**(F9 RBAC Freeze 가 제거한 테이블) · `linked_accounts` · `account_activities` + seed user INSERT(legacy `role`,`roles` 컬럼).
자격정보 fallback: `user: 'o4o_user'` · `password: <literal>` 하드코딩 (값은 기록하지 않는다). `typeorm_migrations` 기록 0.
→ 현재 정본(F9 · app_registry)과 **정면 충돌**하는 구형 스키마 재생성기. 소비 0 → 제거.

### 2-6. PM2 · 부재 파일 · legacy script (§3.6)

| script | 참조 | 파일 존재 | CI/운영 호출 | 판정 |
|---|---|---|---|---|
| `deploy:production` · `deploy:staging` | `pm2:reload` | — | 0 | 제거 |
| `monitor` | `scripts/pm2-monitor.sh` | **MISSING** | 0 | 제거 |
| `pm2:delete/reload/restart/start/stop` | `ecosystem.config.apiserver.cjs` | **MISSING** (저장소 전체 0) | 0 | 제거 |
| `pm2:logs/monit/status` | pm2 바이너리 | — | 0 | 제거 |
| `validate:env` | `scripts/pm2-env-validator.sh` | **MISSING** | 0 | 제거 |
| `migration:run:prod` | `scripts/run-migrations.mjs` → `dist/database/run-migration.js` | 대상 **MISSING** | 0 | 제거 |

Dockerfile: `CMD ["node","--max-old-space-size=512","dist/main.js"]` · `dist/migrate.js` 를 Job 진입점으로 COPY. PM2 참조 0 → **Dockerfile 변경 불필요**.
CLAUDE.md §6 은 PM2 를 금지 항목으로 명시한다.

### 2-7. 정본 문서 정합 (§13 사전)

`docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` §"Method 1":
> 2. GitHub Actions builds and deploys API server → 3. Cloud Run Job executes → 5. **Deployment proceeds only if migrations succeed** / "Migration Fails but Deployment Continues — **Not possible.**"

→ 문서는 의도한 계약을 서술하지만 **workflow 실제 순서가 이를 위반**한다. 이번 WO 는 workflow 를 문서의 계약에 맞춘다. 문서의 단계 순서·stale 줄 번호(`339-386` · `146-249`)만 현재형으로 정정한다(WO §13 승인 범위).

---

## 3. 구현 계획 (조사 결과 → 변경)

| # | 대상 | 변경 |
|:-:|---|---|
| 1 | `.github/workflows/deploy-api.yml` | "Run database migrations" step 을 "Deploy to Cloud Run" **앞**으로 이동 → 실패 게이트 강제. 이미지 push 는 그 이전 step 이라 Job 이 같은 IMAGE_TAG 를 쓴다 |
| 2 | `startup.service.ts` | DatabaseChecker 블록 + migration 블록(165-201) 제거 · import 제거 · 헤더 주석 갱신. DB 연결 재시도·GRACEFUL_STARTUP 은 불변 |
| 3 | `utils/database-checker.ts` | 삭제 (선택 B) |
| 4 | `scripts/run-migration-standalone.mjs` · `run-migrations.mjs` · `run-migration.js` | 삭제 |
| 5 | `package.json` | 13 script 제거 (`migration:run:prod` + PM2/deploy/monitor/validate 12). dependency 변경 0 → lockfile 불변(install 로 확인) |
| 6 | `app-instances-retirement.spec.ts` | "파일 부재" 단언으로 강화 |
| 7 | 신규 spec | `database-migration-ownership-startup-health-final-closure.spec.ts` (§8 계약) |
| 8 | `PRODUCTION-MIGRATION-STANDARD.md` | 단계 순서 · stale 줄 번호 정정 |

---

## 4. 작업 후 migration 단일 소유자

```text
PRODUCTION_MIGRATION_OWNER = DEPLOY_MIGRATION_JOB_ONLY

.github/workflows/deploy-api.yml (build-and-deploy):
  … → Build and Push Docker image
    → Run database migrations        ← Cloud Run Job o4o-api-migrations · node dist/migrate.js · --wait
                                        실패(exit 1) = step fail = workflow 중단 = 기존 serving revision 유지
    → Deploy to Cloud Run            ← migration 성공 후에만 도달
    → Refresh one-off job images
    → Verify deployment (/health via LB)
```

API 서비스 시작 명령(`Dockerfile CMD node dist/main.js`)·startup 코드 모두 migration 미실행. `ci-pipeline.yml` 은 원래 migration 을 실행하지 않는다.

## 5. startup before / after

| | before | after |
|---|---|---|
| DB 연결 | 5회 재시도 · `GRACEFUL_STARTUP` | **불변** |
| `DatabaseChecker.performHealthCheck()` | 실행 후 로그만 (no-op) | **제거** |
| `showMigrations()` → `runMigrations({transaction:'each'})` | 프로덕션 모든 인스턴스 부팅마다 실행 | **제거** |
| migration 실패 | `warn` 후 기동 계속 | **경로 자체 없음** |
| Seed* `.up(queryRunner)` 직접 호출 fallback | 실패 시 15종 실행 · history 우회 · 실패 시 미release | **제거** |
| 이후 서비스 초기화 (monitoring · scheduler · upload · email) | — | **불변** |

## 6. health / readiness before / after

| 경로 | before | after |
|---|---|---|
| `GET /health` (main.ts 즉시 등록) | 항상 200 | **불변** (Cloud Run TCP startupProbe · deploy verify 계약 유지) |
| `GET /health/live` | 200 | 불변 |
| `GET /health/ready` | `SELECT 1` + 메모리 → 503 가능 | 불변 (실제 readiness 정본) |
| `GET /health/database` · `/detailed` | — | 불변 |
| `DatabaseChecker` | `requiredTables=[]`·`pending=[]`·은퇴 optionalTables → 항상 healthy | **삭제 (선택 B)** |
| status code 변경 | — | **0** (§7.5 미발생) |
| `GRACEFUL_STARTUP` | 프로덕션 `true` 명시 | **불변** (§4.5 — probe 가 TCP 라 변경 근거 없음. 보고만) |

## 7. 독립 migration runner · 하드코딩 자격정보 (§2-5 판정 이행)

| 삭제 | 근거 |
|---|---|
| `scripts/run-migration-standalone.mjs` | 소비 0 · 구형 스키마 재생성(F9 제거 `user_roles` DROP+CREATE · 은퇴 `apps`/`app_usage_logs`) · `o4o_user`/`<password literal>` fallback · history 미기록 |
| `scripts/run-migrations.mjs` + script `migration:run:prod` | 대상 `dist/database/run-migration.js` 가 존재한 적 없음 |
| `scripts/run-migration.js` | 소비 0 · 전체 entity DataSource 로 `runMigrations` 하는 같은 계열 |
| `scripts/fix-user-roles-table.mjs` (§3.6 후보 외 발견) | 소비 0 · **`DROP TABLE user_roles CASCADE` 무게이트** · 자격정보 literal(값 미기록) → `HARDCODED_DB_CREDENTIAL_FALLBACK = ZERO` 계약으로 제거 |

**제거된 하드코딩 자격정보 fallback**: 2건 (standalone runner · fix-user-roles-table). literal 값은 CHECK 에 기록하지 않는다 — 회귀 spec 이 패턴(`DB_PASSWORD || '…'`)으로만 검사한다.
대체 독립 runner 는 만들지 않았다. 정본 = `migrate.ts` Job + TypeORM CLI(`migration:run` 등).

## 8. PM2 · 부재 script (§2-6 이행 + 같은 계약 발견분)

| 제거 script | 건수 |
|---|---:|
| PM2 (`pm2:*` 8) · `deploy:production` · `deploy:staging` · `monitor` · `validate:env` | 12 |
| `migration:run:prod` | 1 |
| **§3.6 후보 외 — 부재 파일 참조** (`MISSING_SCRIPT_REFERENCES = ZERO` 계약): `build:optimized`(`../../scripts/build-api-optimized.sh`) · `create-test-users` · `batch:settlement:daily` · `db:seed:roles` · `db:seed:users` · `db:seed:users:prod` · `db:seed:seller-dashboard` · `db:test` · `db:test:detailed` · `setup:apiserver` — 9개 대상 파일 전부 부재 실측, CI·문서 소비 0 | 10 |
| `dev:full` | dead 세그먼트(`pnpm run db:test`) 제거 → `db:setup && dev` (원래도 실행 불가였음) |

scripts 96 → 73. **dependency 변경 0 → `pnpm-lock.yaml` 불변** (install 로 확인). Dockerfile 불변.
보존: `migration:run/show/revert/generate` · `db:setup` · `db:reset` · `migration:drop` · `migration:sync`(§4.2 — 운영 호출 경로 0, 판정 유보) · `start` · `start:prod` · `dev`.

## 9. 변경 파일

```text
M  .github/workflows/deploy-api.yml                     migration job step 을 deploy 앞으로 + 순서 계약 주석
M  apps/api-server/src/services/startup.service.ts     migration·DatabaseChecker 블록 제거 + 헤더 계약
D  apps/api-server/src/utils/database-checker.ts
D  apps/api-server/scripts/run-migration-standalone.mjs
D  apps/api-server/scripts/run-migrations.mjs
D  apps/api-server/scripts/run-migration.js
D  apps/api-server/scripts/fix-user-roles-table.mjs
M  apps/api-server/package.json                          script 23 제거 · dev:full 정리 (deps 불변)
M  apps/api-server/src/__tests__/app-instances-retirement.spec.ts   "파일 부재" 단언
A  apps/api-server/src/__tests__/database-migration-ownership-startup-health-final-closure.spec.ts
M  docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md   단계 순서 · 단일 소유자 · stale 줄번호
A  docs/checks/CHECK-…-FINAL-CLOSURE-V1.md
10 files · +115 / −1,002
```

**schema · production data 변경**: 0 (migration 파일 추가·수정 0 · DB write 0).

## 10. 로컬 검증 (§9)

| 단계 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` (worktree) | ✅ exit 0 · lockfile 불변 |
| `pnpm run build:packages` | ✅ exit 0 |
| `pnpm --filter @o4o/api-server run type-check` | ✅ **0 errors** |
| `pnpm --filter @o4o/api-server run lint:no-fix` | ⚠️ exit 1 — **44 errors / 481 warnings**. 메인 worktree(동일 기준) 실측 **44 errors / 482 warnings** → 제 변경으로 error 증감 0, warning −1(삭제 파일). 변경 파일 3개 단독 lint = **0 problems**. 기존 baseline(CI 는 ratchet 게이트) |
| 신규 spec + `app-instances-retirement.spec` | ✅ **32/32** |
| `pnpm run type-check:frontend` | ✅ exit 0 (1차 시도는 ENOSPC 로 중단 → 디스크 확보 후 재실행 통과) |
| `node scripts/check-unsafe-routes.mjs` | ✅ 1140 파일 · 위반 0 |
| `pnpm --filter @o4o/api-server test -- --runInBand` (jest `--runInBand`) | ✅ **269/269 suites · 4,388 pass · 16 skipped(기존 `.skip`) · exit 0 · 921s**. 실패 0 · 우회 옵션 0 |
| `check-staged-scope.mjs` | ✅ staged 12건 전부 범위 안 |

**환경 이슈 (변경과 무관)**: 검증 중 `C:` 디스크가 가득 차(ENOSPC) `type-check:frontend` 와 전체 Jest 1차 실행이 중단됐다.
worktree 는 손대지 않고 `npm cache clean`(2.2 GB) + `pnpm store prune`(957 packages) 으로 4.5 GB 확보 후 재실행했다.

---

## 11. CI · 배포 (§11)

구현 SHA = push SHA = **`15a9ac20a`** (rebase 후 · `5a6c397c1` 의 동일 내용). **취소·대체 없이 자기 SHA 에서 완주** → ancestor 대체 판정 불필요.

| 워크플로 | 결과 | run ID |
|---|---|---:|
| CI Pipeline | ✅ **success** | 34696954469 |
| CodeQL Security Analysis | ✅ success | 34696954442 |
| Deploy API Server (Cloud Run) | ✅ **success** | 34696954549 |
| Deploy Admin Dashboard · Deploy Web Services · AppStore Guard · E2E Auth Runtime | `NOT_TRIGGERED` (경로 필터 — 변경 경로 = api-server · deploy-api.yml · docs) | — |

**Deploy run 34696954549 의 실제 step 순서** (`gh run view --json jobs`):

```text
 9. Build and Push Docker image : success  13:40:39 → 13:45:19
10. Run database migrations     : success  13:45:19 → 13:45:56   ← Job 이 먼저
11. Deploy to Cloud Run         : success  13:45:56 → 13:46:16   ← 성공 후에만 도달
13. Verify deployment           : success  13:46:55 → 13:46:58
```

## 12. 운영 검증 (§12)

### 12-1. migration job
| 항목 | 값 |
|---|---|
| execution | `o4o-api-migrations-dblmj` · completion 13:45:55Z · succeeded 1 · failed 0 |
| Job 로그 | `Step 4: Running migrations…` → `No pending migrations` → `Migrations executed: 0` → `Migration Job - SUCCESS` → `exit(0)` |
| 기대 (§10) | 이 WO 는 migration 파일을 추가하지 않으므로 **0 pending 정상 종료** — 일치 |
| 후속 배포 | 제 커밋 뒤 다른 push 의 배포(`o4o-api-migrations-zj4b9` 14:11 · revision `03635`)도 **같은 새 순서로 성공** — 계약이 1회성이 아님을 실증 |

### 12-2. API startup 로그 (신규 revision `o4o-core-api-03634-p7q` 13:45:59 · `03635-8dm` 14:11:38, 부팅 2회)

| 로그 | 건수 (13:46 이후) |
|---|---:|
| `Database connection successful` | 2 |
| `Database ready — migrations are owned by the deploy migration job, not by API startup` | **2** |
| `Database migrations completed` (startup migration 실행) | **0** |
| `Seed migration executed` | **0** |
| `Migration error (continuing)` | **0** |
| `Pending migrations detected` | **0** |
| severity ≥ ERROR | **0** |

(before: 30일간 각각 200+ / 45 / 3 / 33 — §2-2)

### 12-3. health · 핵심 API (LB 도메인 `https://api.neture.co.kr`, 트래픽 100% = 최신 revision)

| 경로 | 결과 |
|---|---|
| `/health` (liveness · deploy verify) | **200** `status:alive` |
| `/health/live` | 200 |
| `/health/ready` | **200** `status:ready` (DB `SELECT 1` 통과) |
| `/health/database` | 200 `healthy` · PostgreSQL 15.18 · 12ms |
| `/api/v1/public/cpt/types` (public read) | 200 |
| `/api/v1/hub/contents?serviceKey=kpa` (public read) | 200 |
| `/api/v1/admin/users` 미인증 | **401** (계약 유지) |
| `/api/v1/platform/hub/summary` 미인증 | **401** |
| 로그인(`renariver21`, platform:super_admin) → `/api/v1/admin/users?limit=1` | **200** |
| → `/api/v1/platform/hub/summary` | **200** |
| → `/api/v1/auth/status` | 200 |

신규 500 없음 · 인증·권한 계약 변화 없음 · 서비스 frontend 배포 불필요(미트리거) · 12.4 실패 시나리오 미발생(rollback 불요).

## 13. 중지 · 미처리 항목 (§7 · §4.2 · §4.5)

| # | 항목 | 상태 |
|:-:|---|---|
| §7 1~14 | 중지 조건 | **미발생.** ①deploy job 이 전부 실행(§12-1) ②startup 별도 집합 없음(동일 dist) ③standalone 소비 0 ④PM2 별도 서버 없음(Cloud Run 단일) ⑤status code 변경 0 ⑥required table 미채택 ⑦migration 파일 수정 0 ⑧DB write 0 ⑨Secret 수정 0 ⑩PharmacyHub 교집합 0 ⑪다른 세션 충돌 0(rebase 무충돌) ⑫unrelated failure = lint 44 baseline 으로 분리·ENOSPC 는 환경 ⑬⑭미발생 |
| §4.2 | `migration:drop` · `migration:sync` · `db:reset` | **보존·판정 유보** — 운영 호출 경로 0. 로컬 파괴 명령의 존치 여부는 별도 판단 |
| §4.5 | `GRACEFUL_STARTUP=true` (프로덕션 명시) | **불변·보고** — Cloud Run probe 가 TCP 라 `/health` 200 을 바꿀 근거 없음. readiness 는 `/health/ready` 가 이미 담당. 분리는 완료된 상태 |
| §3.6 | `deploy-api.yml` 헤더 주석 "Phase G1-2 … GRACEFUL_STARTUP=false" | stale 주석(실제 true). 동작 무관 → **보고만** |
| 발견 | `packages/appearance-system` test script 의 POSIX 인라인 env (전 WO 에서 확인) | 무관 · 보고만 |
| 환경 | `C:` 디스크 고갈(ENOSPC) — worktree 15개 누적 | npm cache 2.2 GB + pnpm store prune 으로 4.5 GB 확보. **worktree 는 손대지 않음.** 사용자가 정리 대상을 판단할 항목 |

## 14. 문서 정합 (§13 · CLAUDE.md §16-5)

```text
문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 1건 / 별도 WO 제안 0건
```

1. `PRODUCTION-MIGRATION-STANDARD.md` — 단계 순서(deploy→job 을 job→deploy 로) · 단일 소유자 명시 · stale 줄 번호 2곳 → **WO §13 승인 범위 내 현재형 정정** (기준 문서이지만 WO 가 이 범위를 명시 허용).
2. `SETUP.md` — PM2·startup migration 안내 **없음** (변경 불필요). `README`·`apps/api-server/*.md` 동일.
과거 CHECK·IR·archive 는 본문 불변.

## 15. 최종 판정 (§15)

```text
PRODUCTION_MIGRATION_OWNER           = DEPLOY_MIGRATION_JOB_ONLY
DEPLOY_MIGRATION_FAILURE_GATE        = ENFORCED       (job → deploy 순서 · continue-on-error/|| true 0 · run 34696954549 실측)
API_STARTUP_MIGRATION_EXECUTION      = ZERO
API_STARTUP_SHOW_MIGRATIONS          = ZERO
DIRECT_SEED_UP_FALLBACK              = ZERO
MIGRATION_FAILURE_SWALLOWING         = ZERO
LEGACY_STANDALONE_MIGRATION_RUNNER   = ZERO           (3 파일 + fix-user-roles-table)
HARDCODED_DB_CREDENTIAL_FALLBACK     = ZERO           (2건 제거 · spec 이 패턴 검사)
DATABASE_HEALTH_FALSE_POSITIVE       = ZERO           (DatabaseChecker 삭제)
LEGACY_OPTIONAL_TABLE_CHECKS         = ZERO
MIGRATION_PENDING_FALSE_REPORT       = ZERO
PM2_DEPLOY_RUNTIME_CONTRACT          = ZERO           (12 script)
MISSING_SCRIPT_REFERENCES            = ZERO           (+10 · spec 이 전 script 경로 실존 검사)
PRODUCTION_SCHEMA_CHANGE             = ZERO
PRODUCTION_DATA_CHANGE               = ZERO
AUTHORIZATION_CHANGE                 = ZERO           (401/200 계약 실측)
OTHER_SERVICE_REGRESSION             = PASS           (type-check:frontend · jest 4,388)
CI_PIPELINE                          = SUCCESS        (run 34696954469)
CODEQL                               = SUCCESS        (run 34696954442)
DEPLOY_API                           = SUCCESS        (run 34696954549)
PRODUCTION_MIGRATION_JOB             = SUCCESS        (o4o-api-migrations-dblmj · 0 pending)
PRODUCTION_API_STARTUP               = PASS           (구 migration 로그 0 · 신규 계약 로그 2)
PRODUCTION_HEALTH                    = PASS           (health 4종 200 · ready 200)

DATABASE_MIGRATION_OWNERSHIP_STARTUP_HEALTH_AND_LEGACY_DEPLOY_TOOLING
  = CLOSED
```

## 16. Git (§1.1 · WO §16)

| 항목 | 값 |
|---|---|
| 기준 SHA | `71ba4e074` |
| 구현 커밋 | `5a6c397c1` → rebase(origin/main 4커밋 앞) → **`15a9ac20a`** (충돌 0 · 상류와 파일 겹침 0) |
| push | `git push origin HEAD:main` fast-forward · force 0 |
| stage | path-specific · `check-staged-scope.mjs` 12건 범위 확인 · `git add .` 0 |
| 다른 세션 변경 포함 | 0 |
| 완료 조건 | `HEAD == origin/main` · 작업 범위 미커밋 0 |


