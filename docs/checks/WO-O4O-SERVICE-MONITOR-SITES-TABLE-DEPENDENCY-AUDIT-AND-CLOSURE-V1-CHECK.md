# WO-O4O-SERVICE-MONITOR-SITES-TABLE-DEPENDENCY-AUDIT-AND-CLOSURE-V1 — CHECK

- 작성일: 2026-08-21
- 대상: `/api/v1/service/monitor/*` 8개 endpoint 및 `sites` 의존성
- **최종 판정: `MONITOR_LEGACY_RETIRE`**
- 처리: router 미등록(404) + service/route/화면 제거. **DB schema 변경 0, migration 생성 0.**

---

## 1. Monitor Endpoint Census (§3) — 미조사 0

라우터 전체가 `authenticate` + `requireAdmin`(platform:super_admin) 아래에 있었다(경계 자체는 정상).
8개 전부 `ServiceMonitorService` → `siteRepository`(= `sites` 테이블) 단일 의존이다.

| Method | Path | Service 메서드 | 참조 테이블 | Consumer | 실측(retire 전, super_admin) | 분류 |
|---|---|---|---|---|---|---|
| GET | `/tenants` | `getAllTenants` | `sites` | ServiceOverview | 200 `{tenants:[]}` | **BROKEN**(오류 삼킴) |
| GET | `/apps` | `getAppsMatrix` | `sites` | ServiceOverview | 200 전 필드 `[]` | **BROKEN**(오류 삼킴) |
| GET | `/themes` | `getThemesStatus` | `sites` | ServiceOverview | 200 `{themes:[]}` | **BROKEN**(오류 삼킴) |
| GET | `/warnings` | `getValidationWarnings` → `runFullValidation` | `sites` | ServiceOverview | 200 `{warnings:[]}` | **BROKEN**(오류 삼킴) |
| GET | `/summary` | `getSystemSummary` | `sites` | ServiceOverview | **500** `relation "sites" does not exist` | **BROKEN** |
| GET | `/tenant/:tenantId` | `getTenantDetails` | `sites` | CONSUMER_ZERO | 404 `TENANT_NOT_FOUND` (항상) | **BROKEN**(오류 삼킴 → 404 오인) |
| POST | `/validate` | `runFullValidation` | `sites` | ServiceOverview | 200 `success:false, tenantsValidated:0` | **BROKEN** |
| GET | `/report` | `generateReport` → `getSystemSummary` | `sites` | ServiceOverview | **500** `relation "sites" does not exist` | **BROKEN** |

`ACTIVE` 0 / `BROKEN` 8 / `DUPLICATE` 0 / `UNKNOWN` 0.

> **500 이 2개뿐이었던 이유**: `ServiceMonitorService` 의 나머지 메서드는 `catch` 에서
> 빈 배열을 반환한다(오류 삼킴). `getSystemSummary` 만 `throw error` 한다.
> 즉 나머지 5개의 200 은 **정상이 아니라 은폐된 동일 오류**다.

---

## 2. `sites` 의존성 추적 (§4)

| 위치 | 종류 | 상태 |
|---|---|---|
| `services/service-monitor.service.ts` | ORM repository (`AppDataSource.getRepository(Site)`) | 본 WO 에서 제거 |
| `modules/sites/site.entity.ts` | ORM entity `@Entity('sites')` | **유지**(범위 밖 — §12 후속) |
| `modules/sites/sites.routes.ts` | site CRUD 라우터 | **어디에도 mount 되지 않음** (`register-routes.ts` 에 참조 0) |
| `database/entities.ts:109,648` | DataSource entity 등록 | 유지(범위 밖) |
| migration | — | **없음** (§3 참조) |
| seed / test fixture / CI / scripts / docs | — | **0건** |

raw SQL 로 `FROM sites` / `JOIN sites` 를 쓰는 곳은 없다. 전부 ORM 경로다.
`branch_sites`(KPA 분회 홈페이지)는 이름만 유사할 뿐 별개 도메인이다.

**핵심**: site 를 **생성**할 수 있는 유일한 코드(`sites.routes.ts`)가 mount 돼 있지 않다.
따라서 `sites` 가 있었더라도 production 에는 행이 생길 수 없다.

---

## 3. `sites` 테이블 역사 (§5) — 판정 **`NEVER_EXISTED`**

| 시점 | 사건 |
|---|---|
| 2025-12-03 | `f80ce6c32 feat: Add sites table migration for Multi-Site Builder` → `9000000000000-CreateSitesTable.ts` 추가 |
| 2026-01-08 | `d8e18cd84 chore(migrations): remove 124 unexecuted migrations` → **실행된 적 없이 삭제** |

production DB 실측(cloud-sql-proxy, read-only SELECT):

```text
SELECT to_regclass('public.sites') IS NOT NULL;                    -> f
SELECT count(*) FROM typeorm_migrations WHERE name ILIKE '%site%'; -> 2
  → CreateSiteGuideTables1737330000000 / DropSiteGuideSchema20261113000000
    (SiteGuide — 무관하며 이미 폐기된 별개 스키마)
```

`CreateSitesTable` 은 `typeorm_migrations` 에 **없다**. `REMOVED_LEGACY` 가 아니라
**한 번도 존재한 적 없는(NEVER_EXISTED)** 테이블이다.

---

## 4. 현재 정본 데이터 모델 대조 (§6)

```text
sites 는 무엇이었나   : Multi-Site Builder(2025-12)의 "도메인 1개 = 사이트 1개" 스캐폴딩 단위.
                        domain / template / apps[] / config(theme·navigation) / deploymentId 보유.
지금 누가 담당하나    : 없음. 이 개념이 이관된 canonical table 이 없다.
집계가 지금도 필요한가 : 아니다 — 집계 대상(사이트별 설치 앱·테마·네비게이션)이 현행 모델에 없다.
```

후보 대조(production 실측):

| 후보 | 판정 |
|---|---|
| `branch_sites` | 다른 도메인(KPA 분회 홈페이지). apps/theme 개념 없음 |
| `service_memberships` | 사용자↔서비스 소속. 사이트 구성 정보 아님 |
| `app_registry` / `app_instances` | 앱은 **플랫폼 전역**. `app_instances` **0행** — 테넌트별 설치 개념이 운영되지 않음 |
| `service_instances` / `service_registry` / `themes` / `navigation` | **테이블 자체가 없음** |
| `organizations` / `stores` | 조직·매장 축. 사이트 스캐폴딩 축과 의미가 다름 |

→ 대체 canonical data source **없음**. `MONITOR_CANONICAL_DATA_SOURCE_CHANGED` 아님,
`MONITOR_SCHEMA_MISSING` 도 아님(§14 조건 중 "active consumer 존재" · "migration 누락이 명확" 불충족).

---

## 5. Consumer Census (§7)

| Endpoint | Consumer | 판정 |
|---|---|---|
| summary · tenants · apps · themes · warnings · validate · report | `apps/admin-dashboard/src/pages/services/ServiceOverview.tsx` | 화면 1개 |
| `/tenant/:tenantId` | 없음 | **CONSUMER_ZERO** |

`ServiceOverview` 자체의 상태:

- 라우트는 `/admin/services`, `/admin/services/overview` 2개(`platform.routes.tsx`)
- **nav/menu 진입점 0건** — 코드 전체에서 이 경로를 가리키는 링크가 없다(직접 URL 입력 외 도달 불가)
- `packages/` · `scripts/` · `.github/` · `docs/` 에서 `service/monitor` 참조 **0건**
  (CI · cron · health check · 외부 운영 도구 소비 없음)
- 30일 Cloud Run 로그의 `/service/monitor` 요청 전량:

  | 시각 | 성격 |
  |---|---|
  | 2026-08-01 01:42 / 02:08 | `/api/v1/v1/...` **404** — double-prefix 버그(WO-O4O-ADMIN-API-DOUBLE-PREFIX-RESIDUAL-FIX-V1 이전) |
  | 2026-08-01 02:57 | 위 WO 수정 후 smoke — summary **500**, 나머지 200(빈 값) |
  | 2026-08-21 05:01~05:16 | 직전 WO(SERVICE-API-AUTHORIZATION) 의 401/403/500 검증 호출 |

  → **organic 사용자 트래픽 0건.** 기록된 호출은 전부 WO 검증 트래픽이다.

> 직전 WO 보고에서 "24시간 로그에 동일 오류 없음"이라고 적었는데, 30일로 넓히면
> 2026-08-01 02:57 에 같은 500 이 이미 있었다. 여기서 정정해 기록한다.

---

## 6. 중복 Monitoring 계약 (§8)

| 목적 | canonical | monitor 측 |
|---|---|---|
| API 생존 | `/health` (200) | 없음 |
| DB 연결 | `/health/database` (healthy, pingMs) | 없음 |
| 템플릿 · 앱 카탈로그 통계 | `/api/v1/service-admin/stats`, `/api/v1/admin/apps` | `/monitor/apps` (빈 값) |
| 인프라 지표 · 에러 | Cloud Monitoring / Cloud Logging | `/monitor/summary` (500) |

판정: monitor 는 **LEGACY**. 유일하게 고유했던 축(사이트별 구성 검증)은 그 대상 데이터가
존재하지 않으므로 고유 가치도 없다. **monitor 를 유지하기 위해 dead schema 를 복원하지 않는다.**

---

## 7. 최종 판정 및 처리 (§10-B)

```text
consumer 0 (organic)           : 충족 — 화면 1개는 nav 진입점 0 + 30일 organic 트래픽 0
대체 canonical monitoring 존재 : 충족 — /health, /health/database, service-admin/stats, Cloud Monitoring
sites 는 legacy schema         : 충족 — NEVER_EXISTED (unexecuted migration, 2026-01-08 purge)
운영 기능 가치 없음            : 충족 — 8/8 BROKEN, 데이터 생성 경로 자체 부재
UNKNOWN 0                      : 충족
```

→ **`MONITOR_LEGACY_RETIRE`**

### 변경 파일

| 파일 | 처리 |
|---|---|
| `apps/api-server/src/bootstrap/register-routes.ts` | import + `app.use('/api/v1/service/monitor', …)` 제거, 사유 주석 |
| `apps/api-server/src/routes/service-monitor.routes.ts` | **삭제** |
| `apps/api-server/src/services/service-monitor.service.ts` | **삭제** |
| `apps/admin-dashboard/src/pages/services/ServiceOverview.tsx` | **삭제** (lockstep — 이 API 전용 화면) |
| `apps/admin-dashboard/src/routes/platform.routes.tsx` | lazy import + Route 2개 제거, 사유 주석 |
| `apps/api-server/src/__tests__/service-monitor-retirement.spec.ts` | **신규** |

**DB 변경 0** — migration 생성/실행 0, 수동 DDL 0, schema 복구 0.
`Site` entity(`modules/sites/*`)와 `database/entities.ts` 등록은 **건드리지 않았다**(§12 후속).
기존 `authenticate + requireAdmin` 경계는 형제 라우터에서 그대로 유지된다.

---

## 8. 상태코드 계약 (§11)

| 대상 | 전 | 후 |
|---|---|---|
| `/service/monitor/summary`, `/report` | **500** (generic INTERNAL_ERROR) | **404** (라우트 없음) |
| `/service/monitor/{tenants,apps,themes,warnings}` | 200 + 빈 배열(오류 은폐) | **404** |
| `POST /service/monitor/validate` | 200 + `success:false` | **404** |
| `/service/monitor/tenant/:id` | 404 (항상) | **404** |
| 비인증 | 401 | 404 (라우트 부재가 우선) |

retire 된 endpoint 는 404 가 기본이라는 §11 규칙을 따른다. legacy 를 generic 500 으로 남기지 않는다.

---

## 9. 테스트 (§12)

| 스펙 | 결과 |
|---|---|
| `service-monitor-retirement.spec.ts` (신규) | **11 PASS** — 파일 부재 / import 부재 / mount 부재 / 사유 주석 존재 / 형제 라우터(`/api/v1/service`, `/api/v1/service-admin`) mount 유지 |
| `service-provisioning-guard.spec.ts` | 42 PASS (회귀 없음) |
| `service-admin-guard.spec.ts` | 39 PASS (회귀 없음) |
| 합계 | **90 PASS / 0 FAIL** |

DB fixture 기반 contract test 는 추가하지 않았다 — query 교정이 아니라 retire 이므로
검증 대상 query 자체가 남아 있지 않다.

타입 검사: `apps/api-server` — 본 변경 관련 오류 **0**
(잔여 오류는 전부 다른 세션의 미커밋 `packages/action-log-core` 삭제로 인한 `TS2307` 이며 본 변경과 무관),
`apps/admin-dashboard` — 오류 **0**.

---

## 10. Production 실측 (§9·§13)

### 배포 전 (super_admin, `api.neture.co.kr`)

§1 표 참조 — 500 **2건**(`summary`, `report`), 200-빈값 5건, 404 1건.
`sites` 의존으로 깨지는 endpoint 는 **8개 전부**이며, 500 으로 드러난 것만 2개였다.

read-only SELECT 외 DB write 0. production 상태 변경 0.

### 배포 후

(배포 후 채움)

---

## 11. 중지 조건 점검 (§15)

| 조건 | 해당 여부 |
|---|---|
| `sites` 의미 불명확 | 아니오 — git history + entity 정의로 확정 |
| consumer ownership 불명확 | 아니오 — 화면 1개 + 코드/로그 전수 확인 |
| 대체 canonical table 이 여러 개 | 아니오 — **0개** |
| 외부 운영 도구 사용 가능성 | 아니오 — 30일 로그 organic 0, CI/scripts/docs 참조 0 |
| schema 복구 영향 범위 큼 | 해당 없음 — schema 복구를 하지 않음 |
| UNKNOWN 발생 | 없음 |

→ 중지 조건 미해당. 조사에서 끝내지 않고 retire 까지 수행했다.

---

## 12. 후속 후보

1. `modules/sites/*` (`Site` entity + mount 되지 않은 `sites.routes.ts`) 및 `database/entities.ts`
   의 `Site` 등록 정리 — Multi-Site Builder 전체 은퇴 판단이 필요하므로 별도 WO
2. `ServiceMonitorService` 가 보여준 **오류 삼킴 패턴**(catch → 빈 배열)이 다른 서비스에도
   있는지 점검 — 조회 실패 삼킴 계약화 시리즈와 동일 축
3. `/api/v1/service` provisioning read ↔ `/api/v1/service-admin` 중복 계약 통합 (직전 WO 이월)
4. 배포 이미지에 `service-templates/templates/*.json` COPY 누락 (직전 WO 이월)
5. `serviceInitializer` TODO 스텁 (직전 WO 이월)
