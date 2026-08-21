# CHECK — WO-O4O-DEPLOYMENT-DOMAIN-CENSUS-AND-RETIREMENT-V1

- 작성일: 2026-08-21
- 대상: `apps/api-server/src/modules/deployment/*` (application-level Deployment 도메인)
- **최종 판정: `RETIRE_CONFIRMED`**
- 선행 WO: `WO-O4O-MULTI-SITE-BUILDER-SITES-DOMAIN-CENSUS-AND-RETIREMENT-V1` 의 후속 후보 #1

> ⚠ **축 분리(§1)**: 본 WO 는 **A. application deployment domain** 만 다룬다.
> **B. 실제 운영 배포 인프라**(GitHub Actions `deploy-*.yml` · Cloud Run · Dockerfile ·
> Artifact Registry · `deploy-cloudrun.sh`)는 **한 파일도 건드리지 않았다**.

---

## 1. Domain Census (§3)

`git grep` 으로 추적 파일 전수 조사(정규식: `DeploymentInstance|modules/deployment|deployment\.entity|deployment_instances|DeploymentStatus|CreateInstanceDto|InstallAppsDto|InstanceRegion`). **미조사 0**.

| # | 경로 | hit | 분류 |
|---|---|---|---|
| 1 | `apps/api-server/src/modules/deployment/deployment.entity.ts` | `@Entity('deployment_instances')` · `DeploymentInstance` · `DeploymentStatus` | APP_DOMAIN_DATA_MODEL |
| 2 | `apps/api-server/src/modules/deployment/index.ts` | `export * from './deployment.entity'` | APP_DOMAIN_DATA_MODEL |
| 3 | `apps/api-server/src/modules/deployment/dto/index.ts` | re-export | APP_DOMAIN_DATA_MODEL |
| 4 | `apps/api-server/src/modules/deployment/dto/create-instance.dto.ts` | `CreateInstanceDto` · `InstanceRegion` · `InstanceType` | APP_DOMAIN_DATA_MODEL |
| 5 | `apps/api-server/src/modules/deployment/dto/install-apps.dto.ts` | `InstallAppsDto` | APP_DOMAIN_DATA_MODEL |
| 6 | `apps/api-server/src/database/entities.ts:107,646` | import + entities 배열 등록 | APP_DOMAIN_DATA_MODEL (등록 전용) |
| 7 | `apps/api-server/src/common/docs/module-structure.md:59` | `deployment / DevOps utilities` 표 행 | HISTORICAL_DOC (모듈 표) |
| 8 | `.github/workflows/deploy-api.yml` · `deploy-admin.yml` · `deploy-web-services.yml` | CI 배포 workflow | **INFRA_DEPLOYMENT_KEEP** |
| 9 | `apps/api-server/deploy-cloudrun.sh` · `Dockerfile*` · `TRIGGER_DEPLOY.txt` · `redeploy.txt` · `apps/admin-dashboard/.deploy-trigger` | Cloud Run 배포 스크립트/트리거 | **INFRA_DEPLOYMENT_KEEP** |
| 10 | `apps/admin-dashboard/scripts/deployment/fix-cache.sh` | 배포 캐시 스크립트 | **INFRA_DEPLOYMENT_KEEP** |
| 11 | `scripts/monitoring-dashboard.cjs:55,108` `getDeploymentStatus()` | 로컬 PM2 로그(`logs/deployments.log`) 파서 — DB/entity 무관 | NAME_COLLISION |
| 12 | `apps/api-server/src/entities/Alert.ts:54` `DEPLOYMENT = 'deployment'` | Alert 카테고리 enum 값(문자열) | NAME_COLLISION |
| 13 | `apps/api-server/src/entities/SystemMetrics.ts:99-103` `ACTIVE_DEPLOYMENTS` 등 | 메트릭 키 enum 값(문자열) | NAME_COLLISION |
| 14 | `apps/api-server/src/modules/partner/guards/partner-context.guard.ts:51` | 주석 "per deployment" | NAME_COLLISION |
| 15 | `apps/api-server/src/services/index.ts:16` | `// DeploymentMonitoringService removed (WO-O4O-CODEBASE-CLEANUP-V1)` 주석 | HISTORICAL_DOC |
| 16 | `apps/api-server/src/services/pop-generator.service.ts` (5곳) | TypeScript 내장 `InstanceType<typeof PDFDocument>` | NAME_COLLISION |
| 17 | `docs/**` (CHECK/SMOKE/WO 다수) · `docs/templates/*/deployment-boundary.template.md` | 배포 기록물/템플릿 | HISTORICAL_DOC |
| 18 | `docs/work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1.md:256` | 과거 `DeploymentInstance#domain` 메타데이터 오류 기록 | HISTORICAL_DOC |

`deploymentId` / `deployment_id` 검색 결과 **코드 hit 0건** (선행 WO 에서 제거된 `Site.deploymentId` 가 마지막 참조였다).

**UNKNOWN 0.**

---

## 2. `modules/deployment/*` 실체 (§4)

| 파일 | 역할 | Consumer | Runtime 영향 | 판정 |
|---|---|---|---|---|
| `deployment.entity.ts` | `DeploymentInstance` (`deployment_instances`) + `DeploymentStatus` 7단계 enum | `database/entities.ts` 등록 1곳뿐 | TypeORM 메타데이터 등록만 (테이블 없음) | LEGACY_SHELL |
| `index.ts` | entity·dto re-export. 1~4행이 `deployment.module`·`controller`·`service` 를 주석 처리한 상태 | import 0 | 없음 | DEAD |
| `dto/index.ts` | DTO re-export | import 0 | 없음 | DEAD |
| `dto/create-instance.dto.ts` | `CreateInstanceDto` + `InstanceRegion`(ap-northeast-2 등) + `InstanceType`(`nano_3_0`·`micro_3_0` = **AWS Lightsail bundle id**) | import 0 | 없음 | DEAD |
| `dto/install-apps.dto.ts` | `InstallAppsDto` | import 0 | 없음 | DEAD |

**entity + DTO 만 남은 shell 이며, write/read 를 실행하는 코드는 0 이다.**
controller / module / service 는 2025-12-03 `4e6241224 fix: Remove NestJS-style deployment files` 에서 이미 삭제됐다.

---

## 3. Runtime Mount (§5) — 판정 `NO_ROUTE_EXISTS`

- `bootstrap/register-routes.ts` 에 `deploy` 문자열 **0건**.
- `main.ts` / `server.ts` / `app.ts` 에 **0건**.
- `config/routes.config.ts` 는 파일 자체가 존재하지 않는다(선행 WO 에서 확인 — `6354e8755` 에서 삭제).
- **동적 mount 아님**: `modules/module-loader.ts` 는 `workspaceRoot/packages/**/manifest.ts` 만 스캔한다(`packagesDir: 'packages'`, `scanPatterns: ['**/manifest.ts']`). `apps/api-server/src/modules/deployment` 는 스캔 대상 밖이고 manifest 도 없다.

### mount 역사

| 시점 | commit | 사건 |
|---|---|---|
| 2025-12-03 | `fe83e3896 feat: Complete Step 23 & Step 24 Multi-Site Builder with CMS Integration` | `routes.config.ts:433-435` 에서 `/api/deployment`·`/api/v1/deployment` mount |
| 2025-12-03 | `4e6241224` | NestJS 스타일 controller·module·service 삭제 (entity+DTO shell 화) |
| 2025-12-03 | `3829b1330 fix: Disable scaffolding service temporarily` | scaffolding 비활성화 |
| 2025-12-11 | `6354e8755 refactor(api-server): Phase 8-3 Legacy Entity Removal & Service Cleanup` | `routes.config.ts` 자체 제거 → **mount 해제** |
| 2026-01-06 | `8d58243bf chore(api-server): remove 30 unused route files (WO-DEAD-CODE-LEGACY-CLEANUP-V1)` | `routes/deployment.routes.ts` 삭제 |
| 2026-01-07 | `495140e91 feat(admin): Admin Goal State 정의 및 아키텍처 재구조화` | admin `pages/deployment/*` 4개 컴포넌트 삭제 |

→ **의도적 은퇴가 여러 차례 진행됐고 shell 만 남은 상태**다(미완성 기능의 방치가 아니라 단계적 제거의 잔재).

---

## 4. Entity 소비처 (§6) — 판정 `ENTITY_REGISTRATION_ONLY` → 제거

| 추적 대상 | 결과 |
|---|---|
| `getRepository(DeploymentInstance)` | **0** |
| repository injection / EntityManager | **0** |
| relations (`@ManyToOne('DeploymentInstance')` 등) | **0** |
| subscribers | **0** |
| background worker / cron | **0** |
| service / controller | **0** |
| tests | **0** (본 WO 신규 계약 테스트 제외) |
| seeds | **0** |
| `database/entities.ts` 등록 | **1** ← 유일한 참조였다 |

---

## 5. Production DB (§7) — read-only

Cloud SQL Auth Proxy(자체 포트 15437) 경유, `SELECT` 만 수행. **write 0**.

| 항목 | 실측 |
|---|---|
| `to_regclass('public.deployments')` | **NULL** |
| `to_regclass('public.deployment_instances')` | **NULL** |
| `%deploy%` / `%instance%` 매칭 table·view | `public.app_instances` **1건뿐** |
| `typeorm_migrations` 中 `%deploy%`·`%instance%` | **0건** |
| `%deployment%` enum type (`pg_type`) | **0건** |
| `%deploy%` sequence | **0건** |
| trigger | 대상 테이블 부재로 해당 없음 |

### `app_instances` 는 별개 도메인 (§7 "이름이 유사한 table 분리")

| 항목 | 값 |
|---|---|
| row count | **0** |
| 컬럼 | `id` uuid · `appId` uuid · `businessId` uuid · `status` varchar · `config` jsonb · `usageCount` int · `installedAt` · `updatedAt` |
| 제약 | `PK_app_instances` (PK) 뿐, inbound/outbound FK **0** |
| 소속 | **AppStore(앱 설치) 도메인** — `appId`·`businessId` 축이며 `DeploymentInstance`(domain·ipAddress·region·instanceType) 와 컬럼이 전혀 다르다 |
| 처리 | **이번 WO 대상 아님. 유지.** |

---

## 6. Migration 역사 (§8) — 판정 `REMOVED_BEFORE_EXECUTION`

- `deployment_instances` 를 만드는 migration 이 현재 저장소에 **없다**.
- 파일명에 `deploy`·`instance` 를 포함한 migration **0개**.
- `typeorm_migrations` 실행 기록 **0건** → 스키마가 만들어진 적이 없다.
- 선행 WO 에서 확인한 대로 2026-01-08 `chore(migrations): remove 124 unexecuted migrations` 로 미실행 migration 이 일괄 제거된 흐름과 동일하다.
- **다른 migration 의 dependency 아님** (참조 0).
- 실행되지 않은 migration 을 **복구하지 않았다**. schema 신설 **0**.

---

## 7. 원래 기능 목적 (§9)

`8d58243bf^:apps/api-server/src/routes/deployment.routes.ts` (272 라인, 5 endpoint) 원문 확인 결과:

| endpoint | 기능 |
|---|---|
| `POST /create` | 도메인·앱 목록으로 인스턴스 생성 후 `triggerDeployment()` |
| `GET /status/:id` | 상태·로그 조회 |
| `GET /list` | 목록 |
| `POST /install-apps` | 인스턴스에 앱 추가 설치 |
| `DELETE /:id` | 인스턴스 삭제 |

| 목적 후보 | 판정 | 근거 |
|---|---|---|
| site deployment (사이트별 서버 인스턴스 provisioning) | **NEVER_COMPLETED** | `triggerDeployment()` 이 `setTimeout(2000/3000/...)` 으로 상태만 바꾸고, IP 는 `13.125.${random}.${random}` **mock** 을 채웠다. 실제 인프라 호출 0 |
| app deployment (앱 설치) | **NEVER_COMPLETED** | `install-apps` 역시 동일 mock 경로 |
| service provisioning 후 배포 | **REPLACED** | 현재 provisioning 은 `routes/service-provisioning.routes.ts` + `AppStoreService` 가 담당하며 deployment 를 참조하지 않는다 |
| release tracking / build status | **REPLACED** | 실제 배포 상태는 GitHub Actions + Cloud Run 리비전이 담당 |
| tenant deploy / custom domain publish | **NEVER_COMPLETED** | 동일 mock |
| theme/page publish | **REMOVED** | Multi-Site Builder 계열과 함께 제거됨 |

DTO 의 `InstanceType = nano_3_0 / micro_3_0 / small_3_0 / medium_3_0` 과 `InstanceRegion = ap-northeast-2` 는 **AWS Lightsail bundle 식별자**다. 현재 인프라 정본(CLAUDE.md §6)은 GCP Cloud Run 이며 AWS EC2 계열은 금지돼 있어, 이 도메인은 인프라 정본과도 어긋난 잔재다.

---

## 8. Sites / Provisioning 관계 (§10)

| 질문 | 답 | 근거 |
|---|---|---|
| deployment domain 이 Multi-Site Builder 의 후속 단계였는가? | **예** | 같은 commit `fe83e3896` 에서 `modules/sites` 와 함께 도입. `Site.deploymentId` 컬럼이 두 도메인을 잇는 유일한 연결이었고, 선행 WO 에서 `Site` 와 함께 제거됐다 |
| service provisioning 이 deployment entity 를 실제 호출하는가? | **아니오** | `service-provisioning.routes.ts` · `service-admin.routes.ts` · `AppStoreService.ts` · `service-templates/` 에 `deploy` 문자열 **0건** |
| sites retire 이후 deployment 가 독립적인 의미를 갖는가? | **아니오** | 유일한 진입점(route)·UI·DB·연결 컬럼이 모두 사라져 남은 것은 등록만 된 entity 클래스뿐이다 |

`scaffold` 검색 결과 deployment 를 참조하는 active consumer **0** (LMS·glycopharm payment 등은 무관한 문맥).

---

## 9. Frontend / Admin Consumer Census (§11)

| 대상 | 결과 | 판정 |
|---|---|---|
| admin-dashboard | `pages/deployment/*`(DeploymentManager·InstanceCard·InstanceDetail·CreateInstanceModal·index) 는 **2026-01-07 `495140e91` 에서 삭제됨** | HISTORICAL_SOURCE |
| admin-dashboard | `pages/site-builder/*` 도 같은 commit 에서 삭제됨 | HISTORICAL_SOURCE |
| operator / service web / neture / main-site / packages UI | `api/deployment`·`/deployment/create`·`/deployment/status`·`install-apps` 호출 **0건** | NOT_DOMAIN_CONSUMER |
| 일반 "배포" 문구 | CI/배포 문서·스크립트에만 존재 | INFRA_DEPLOYMENT_KEEP / HISTORICAL_DOC |

**ACTIVE_UI 0 · UNROUTED_UI 0 · DEAD_UI 0 (이미 삭제됨) · UNKNOWN 0.**

---

## 10. Worker / Queue / Scheduler (§12) — 판정 `NONE`

- `jobs` / `workers` / `queues` / `cron` / `schedulers` / `subscribers` 디렉터리 내 `deploy` 문자열 **0건**.
- BullMQ 큐 정의에 deployment job **0건**.
- 선행 `WO-O4O-REDIS-SESSIONSYNC-REMOVAL` 결과와 **충돌 없음** (해당 WO 는 Redis 세션 축이며 deployment job 은 애초에 존재하지 않았다).

---

## 11. 실제 CI/CD 분리 결과 (§13)

아래는 **retire 후보가 아니며 이번 커밋에서 한 줄도 변경하지 않았다** — `INFRA_DEPLOYMENT_KEEP`.

```text
.github/workflows/deploy-api.yml
.github/workflows/deploy-admin.yml
.github/workflows/deploy-web-services.yml
apps/api-server/deploy-cloudrun.sh
apps/api-server/TRIGGER_DEPLOY.txt · redeploy.txt
apps/admin-dashboard/.deploy-trigger
apps/admin-dashboard/scripts/deployment/fix-cache.sh
Dockerfile* / Cloud Run / Artifact Registry 설정
```

신규 계약 테스트가 위 workflow 3종의 **존재를 assert** 하여 오삭제를 방지한다.

---

## 12. 최종 판정 (§14) — `RETIRE_CONFIRMED`

| §14-D 조건 | 실측 | 충족 |
|---|---|---|
| runtime consumer 0 | route·mount·loader 모두 0 | ✅ |
| repository consumer 0 | `getRepository` 0 · relation 0 | ✅ |
| active UI 0 | 2026-01-07 삭제 완료 | ✅ |
| background consumer 0 | worker/queue/cron 0 | ✅ |
| production operational data 0 | 테이블 자체 부재 | ✅ |
| provisioning dependency 0 | provisioning 계열 참조 0 | ✅ |
| unique application function 0 | 구현이 setTimeout+random IP mock | ✅ |
| UNKNOWN 0 | census 미조사 0 | ✅ |

---

## 13. 변경 내역 (§15 · §17)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/deployment/deployment.entity.ts` | **삭제** |
| `apps/api-server/src/modules/deployment/index.ts` | **삭제** |
| `apps/api-server/src/modules/deployment/dto/index.ts` | **삭제** |
| `apps/api-server/src/modules/deployment/dto/create-instance.dto.ts` | **삭제** |
| `apps/api-server/src/modules/deployment/dto/install-apps.dto.ts` | **삭제** (디렉터리 전체 제거) |
| `apps/api-server/src/database/entities.ts` | `DeploymentInstance` import·배열 등록 제거 + retire 주석 |
| `apps/api-server/src/common/docs/module-structure.md` | `deployment` 모듈 표 행 제거 |
| `apps/api-server/src/bootstrap/register-routes.ts` | retire 사유 주석 추가(인프라 축과 무관함을 명시) |
| `apps/api-server/src/__tests__/deployment-domain-retirement.spec.ts` | **신규** 계약 테스트 |

### 연쇄 dead residue (§17)

| 후보 | 처리 |
|---|---|
| `DeploymentStatus` enum | 도메인 전용 → entity 와 함께 제거 |
| `InstanceRegion` · `InstanceType` (DTO 내) | 도메인 전용 → 제거 |
| `entities.ts` 등록 | 제거 |
| module 문서 표 행 | 제거 |
| `Alert.DEPLOYMENT` · `SystemMetrics.ACTIVE_DEPLOYMENTS` 등 | **유지** — 모니터링 도메인의 문자열 enum 값이며 Deployment 도메인 전용이 아니다 |
| `services/index.ts:16` 주석 | **유지** — 과거 제거 기록 |
| unused package dependency | `class-validator` 는 다른 DTO 들이 계속 사용 → 유지 |

**provisioning 전체 retirement 로 범위가 커지지 않았다** (§17 중지 조건 해당 없음).

### DB (§16)

```text
DB write 0 / migration 0 / 수동 DROP 0
```

production 에 `deployments`·`deployment_instances` 가 없으므로 정상 상태다. `app_instances` 는 별개 도메인이라 손대지 않았다.

---

## 14. 테스트 / Build (§18)

| 항목 | 결과 |
|---|---|
| `deployment-domain-retirement.spec.ts` (신규) | **PASS** |
| `sites-domain-retirement.spec.ts` | PASS |
| `service-monitor-retirement.spec.ts` | PASS |
| `service-provisioning-guard.spec.ts` | PASS |
| `service-admin-guard.spec.ts` | PASS |
| 합계 | **5 suites / 116 tests PASS / 0 FAIL** |
| `tsc --noEmit -p tsconfig.json` | 이번 변경 기인 오류 **0**. 잔여 23건은 전부 다른 세션의 **미커밋** `packages/action-log-core` 삭제로 인한 `TS2307 Cannot find module '@o4o/action-log-core'` (선행 상태, 본 WO 무관) |
| `build` | 위와 같은 이유로 로컬 전체 build 는 다른 세션 WIP 에 막혀 수행하지 않았다. 동일 tsconfig 의 typecheck 로 대체하고 CI 의 Deploy API Server(clean checkout) 결과로 실제 build 를 확인한다 |

정리 후 확인:

```text
modules/deployment runtime ref 0
DeploymentInstance entity import 0
database entity registration 0
DEAD_REFERENCE 0
UNKNOWN 0
```

---

## 15. Production 검증 (§19)

### 배포 전

`/api/deployment`·`/api/v1/deployment` 는 2025-12-11 이후 이미 존재하지 않으므로 **이번 retire 로 상태가 바뀌는 route 는 없다**(신규 404 없음). 검증 초점은 **entity 등록 제거 후 TypeORM 부팅 정상 여부**다.

### 배포 후

커밋 `acefe70e4` · CI `Deploy API Server (Cloud Run)` **success** ·
신규 리비전 **`o4o-core-api-03440-qxj`** · 검증 시각 2026-08-21T07:24~07:27Z.

| 항목 | 실측 | 판정 |
|---|---|---|
| Cloud Run 부팅 (entity 등록 제거 후 TypeORM) | 신규 리비전 Ready, `/health` `uptime` 85s 정상 기동 | PASS |
| `GET /health` | **200** `{"status":"alive","environment":"production"}` | PASS |
| `GET /health/database` | **200** `status:"healthy"`, `pingMs` 4, `activeConnections` 10, `longRunningQueries` 0 | PASS |
| `GET /api/v1/appstore` | **200** `success:true`, 앱 목록 정상 | PASS |
| `GET /api/v1/service/templates` (미인증 / 로그인 후) | **401** `AUTH_REQUIRED` / **403** `Admin privileges required` | PASS (라우터 생존 · 500 아님) |
| `GET /api/v1/service-admin/templates` (미인증 / 로그인 후) | **401** / **403** | PASS |
| 로그인 `POST /api/v1/auth/login` (`serviceKey=neture`) | **200**, `/api/v1/auth/status` **200** `authenticated:true` | PASS |
| `GET /api/v1/deployment` · `GET /api/deployment` | **404** `Cannot GET ...` (2025-12-11 이후 동일, 이번 retire 로 새로 사라진 route 아님) | PASS (기대 404) |
| Cloud Run 신규 ERROR | 신규 리비전 로그 `severity>=ERROR OR httpRequest.status>=500` **0건** | PASS |
| `deployment_instances` / `DeploymentInstance` 관련 오류 | **0건** | PASS |
| 신규 5xx | **0건** | PASS |

검증 한계(숨기지 않고 기록):

- `/service/templates` · `/service-admin/templates` 는 `platform:super_admin` 급 권한을 요구한다.
  `docs/local/TEST-ACCOUNTS.local.md` 에 해당 계정 비밀번호가 없어 **200 본문까지는 확인하지 못했다.**
  미인증 401 → 로그인 후 403 전이로 "라우터가 mount 돼 있고 가드까지 도달하며 500 이 아니다" 까지 확증했다.
  이번 WO 의 위험(entity 등록 제거로 인한 부팅/스키마 오류)은 이 범위에서 배제된다.
- 로그 조회 창은 신규 리비전 기준 `--freshness=1h` 이며, 동일 쿼리에서 리비전 로그 자체는 정상 반환된다
  (빈 결과가 필터 오류가 아님을 sanity 확인 완료).


---

## 16. 후속 후보

| # | 항목 | 메모 |
|---|---|---|
| 1 | `app_instances` (0 row) 생명주기 판정 | AppStore 앱 설치 축. 소비처·데이터 의미 확인 후 별도 WO |
| 2 | `scripts/monitoring-dashboard.cjs` | PM2 기반 로컬 스크립트. CLAUDE.md §6 이 PM2 를 금지하므로 생명주기 판정 필요 |
| 3 | `apps/api-server/TRIGGER_DEPLOY.txt` · `redeploy.txt` · `.deploy-trigger` | 배포 트리거용 더미 파일들의 현행 필요 여부 |
| 4 | `docs/templates/*/deployment-boundary.template.md` | 템플릿 현행성 점검 |
| 5 | `apps/api-server/src/common/docs/module-structure.md` | 표에 남은 다른 모듈 행들의 실제 존재 여부 전수 확인 |
