# WO-O4O-MULTI-SITE-BUILDER-SITES-DOMAIN-CENSUS-AND-RETIREMENT-V1 — CHECK

- **작성일**: 2026-08-21
- **대상**: `modules/sites/*`, `Site` entity, `database/entities.ts` 등록, Multi-Site Builder 잔여 계약
- **최종 판정**: **`RETIRE_CONFIRMED`**
- **선행 WO**: `WO-O4O-SERVICE-MONITOR-SITES-TABLE-DEPENDENCY-AUDIT-AND-CLOSURE-V1` (후속 후보 1번)

---

## 1. Domain Census (§3)

전수검색 키워드: `modules/sites` · `site.entity` · `sites.routes` · `Site` · `sites` · `siteId` · `site_id` · `Multi-Site` · `multi-site` · `site builder`

| # | 참조 위치 | 판정 |
|---|---|---|
| 1 | `modules/sites/site.entity.ts` (`@Entity('sites')`, `SiteStatus`) | LEGACY_CODE |
| 2 | `modules/sites/sites.routes.ts` (CRUD 6개 + `triggerScaffolding`) | LEGACY_CODE |
| 3 | `modules/sites/index.ts` (barrel) | LEGACY_CODE |
| 4 | `modules/sites/dto/create-site.dto.ts` | LEGACY_CODE |
| 5 | `modules/sites/dto/scaffold-site.dto.ts` | LEGACY_CODE |
| 6 | `database/entities.ts:109` import · `:648` 배열 등록 | LEGACY_CODE (등록만) |
| 7 | `common/docs/module-structure.md:56` `sites / Multi-site builder` 행 | LEGACY_CODE (dead doc row) |
| 8 | `bootstrap/register-routes.ts:180-185` 선행 WO 주석 | HISTORICAL_DOC (주석) |
| 9 | `__tests__/service-monitor-retirement.spec.ts` 헤더 주석 | HISTORICAL_DOC (주석) |
| 10 | `routes/kpa-branch/entities/branch-site.entity.ts` · `BranchSiteController` · `entities/index.ts` | **NAME_COLLISION** (branch_sites = KPA 분회 홈페이지, 별개 ACTIVE 도메인) |
| 11 | `entities/Theme.ts:147` `ThemeInstallation.siteId` (varchar) | ACTIVE_DATA_MODEL (FK 없음, Site 무관) |
| 12 | `modules/cms/entities/Page.ts:67` `siteId?` (varchar, `Multi-site support` 주석) | ACTIVE_DATA_MODEL (FK 없음) |
| 13 | `modules/cms/services/PageService.ts` · `PageGeneratorV2.ts` `siteId` 필터 | ACTIVE_RUNTIME (문자열 필터, Site entity 무관) |
| 14 | `services/ThemeService.ts` `siteId` 파라미터 | ACTIVE_RUNTIME (문자열, Site entity 무관) |
| 15 | `utils/schema-migration.ts` · `settingsService.ts` 등 `siteIdentity` | NAME_COLLISION (customizer 설정 키) |
| 16 | `scripts/otc-*` 7개 파일의 로컬 `type Site = 'cutaneous' \| ...` | **NAME_COLLISION** (해부학적 투여부위) |
| 17 | `migrations/1737330000000-CreateSiteGuideTables.ts` · `20261113000000-DropSiteGuideSchema.ts` | NAME_COLLISION (SiteGuide) |
| 18 | `docs/**` 7개 문서 (IR·CHECK·PLAN·rbac IR) | HISTORICAL_DOC (기록물, CLAUDE.md §16-1 대상 외) |
| 19 | `config/editor.constants.ts` `Site headers` 문자열 | NAME_COLLISION |

- **ACTIVE_RUNTIME(Site 도메인) 0** · **ACTIVE_UI 0** · **UNKNOWN 0** · 미조사 0
- `packages/**` · `services/**` · `.github/**` 에서 `modules/sites` · `sites.routes` · `site-builder` 참조 **0건**

---

## 2. Runtime Mount 조사 (§4)

**판정: `UNMOUNTED` (의도적 retirement)**

| 확인 | 결과 |
|---|---|
| `register-routes.ts` import / `app.use` | 0건 (주석 외) |
| `main.ts` / `server.ts` | 0건 |
| dynamic import 등록 | 0건 — `register-routes.ts` 의 dynamic import 는 전부 명시 경로이며 sites 없음 |
| module loader (`modules/module-loader.ts`, `modules/index.ts`) | `site` 문자열 0건 |
| manifest / plugin registration | 해당 없음 |

### 이력 (선행 IR 정정)

| 시점 | commit | 내용 |
|---|---|---|
| 2025-12-03 | `fe83e3896 feat: Complete Step 23 & Step 24 Multi-Site Builder with CMS Integration` | `modules/sites/*` 신설. **`config/routes.config.ts` 에서 `app.use('/api/sites', ...)` · `app.use('/api/v1/sites', ...)` 로 mount 됨** |
| 2025-12-11 | `6354e8755 refactor(api-server): Phase 8-3 Legacy Entity Removal & Service Cleanup` | mount 2줄 + import 제거. 같은 commit 에서 `setupRoutes` 와 `config/routes.config.ts` 파일 자체가 제거됨 → 이후 mount 경로가 물리적으로 존재하지 않음 |

> **선행 IR 정정**: `docs/investigations/IR-O4O-ADMIN-SERVICE-MONITOR-SITES-TABLE-DISPOSITION-V1.md` §3 은
> "`git log -S"sites.routes"` 이력 0건 = 한 번도 mount된 적 없음" 이라고 기록했으나, 실제로는
> **2025-12-03 ~ 2025-12-11 8일간 mount 돼 있었다.** 다만 그 기간에도 `sites` 테이블이 존재한 적이
> 없어 라우트는 동작할 수 없었고, 결론(`sites` 복원 불필요)은 그대로 유지된다.
> 해당 IR 은 기록물이므로 본문을 수정하지 않고 여기에 정정만 남긴다.

**의도적 retirement 여부**: 대규모 legacy route 일괄 제거(Phase 8-3)의 일부였고, 같은 흐름에서 admin UI(`pages/site-builder/*`) · `routes/deployment.routes.ts` · `services/deployment-service/` 가 함께 삭제됐다 → **미완성 기능 방치가 아니라 의도적 폐기**.

---

## 3. Site Entity 소비처 (§5)

**판정: `ENTITY_REGISTRATION_ONLY`** (retire 직전 기준)

| 소비 형태 | 결과 |
|---|---|
| `getRepository(Site)` | 5곳 — **전부 `sites.routes.ts` 내부** (미mount) |
| EntityManager 직접 사용 | 0건 |
| ORM relation (`@ManyToOne('Site'...)`, `=> Site`) | **0건** — 저장소 전체에서 Site 를 참조하는 relation 없음 |
| DTO / type 소비 | `CreateSiteDto` · `ScaffoldSiteDto` — 외부 참조 0건 |
| service / controller | 0건 (선행 WO 에서 `service-monitor.service.ts` 제거 완료) |
| background job / seed / test | 0건 |
| `database/entities.ts` | import 1 + 배열 등록 1 — **등록만** |

`ThemeInstallation.siteId` · `Page.siteId` 는 **FK 없는 varchar** 이며 Site entity 를 import 하지 않는다 → Site 제거로 깨지지 않는다.

---

## 4. Production DB Schema (§6, read-only)

접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db --port 15433` → `psql -U o4o_api_v2 -d o4o_platform` (SELECT only)

```
to_regclass('public.sites')            = NULL
information_schema %site% tables       = public.branch_sites (BASE TABLE) 만
typeorm_migrations WHERE name ILIKE %site%
    = CreateSiteGuideTables1737330000000
    | DropSiteGuideSchema20261113000000     ← CreateSitesTable 이력 없음
```

| 테이블 | 존재 | row | 비고 |
|---|:---:|---:|---|
| `sites` | **없음** | — | 테이블 자체가 없으므로 view · trigger · sequence · FK 도 없음 |
| `branch_sites` | 있음 | 0 | **별개 ACTIVE 도메인**. FK `FK_branch_sites_organization → kpa_organizations` |
| `deployment_instances` | 없음 | — | Multi-Site Builder 동반 설계 잔재 |
| `theme_installations` | 없음 | — | |
| `app_instances` | 있음 | 0 | 선행 WO 실측과 동일 |

`pg_constraint` 에서 `%site%` 관련 FK 검색 결과는 `branch_sites → kpa_organizations` **1건뿐**이다.

---

## 5. Migration 역사 (§7)

**판정: `UNEXECUTED_LEGACY`**

| commit | 날짜 | 내용 |
|---|---|---|
| `fe83e3896` | 2025-12-03 | `migrations/1850000000000-CreateSitesTable.ts` 추가 |
| `6354e8755` | 2025-12-11 | 위 파일 `ARCHIVE_2025/` 경로째 삭제 |
| `f80ce6c32` | 2025-12-03 | `database/migrations/9000000000000-CreateSitesTable.ts` 추가 |
| `d8e18cd84` | 2026-01-08 | `chore(migrations): remove 124 unexecuted migrations` 에서 위 파일 삭제 |

- production `typeorm_migrations` 실행 이력 **0건**
- `sites` 를 전제로 하는 후속 migration **0건** (현행 migration 디렉터리에서 `'sites'` 문자열 0건)
- **복원하지 않음** (§7 원칙)

---

## 6. Multi-Site Builder 기능 판정 (§8)

| 기능 | 코드 현황 | 판정 |
|---|---|---|
| site 생성 (`POST /api/sites`) | route 파일만 존재, mount 0 | **REMOVED** (이번 WO 에서 파일까지 제거) |
| site template | `site.template` 은 단순 문자열. 실제 해석은 scaffolding service 몫이었으나 그 서비스가 없음 | **NEVER_COMPLETED** |
| scaffolding | `getScaffoldingService()` 가 **항상 `null` 반환** → `triggerScaffolding` 은 즉시 `Scaffolding service is not available` 로 FAILED 처리 | **STUB** |
| navigation / theme | `site.config.theme/navigation` 은 jsonb 자리만 존재. `ThemeService`/`theme_installations` 는 별도 계보이며 테이블 없음 | **NEVER_COMPLETED** |
| page builder | CMS `Page` 는 **ACTIVE**. `Page.siteId` 는 FK 없는 optional varchar | **REPLACED** (CMS 가 canonical) |
| domain / custom domain | `site.domain` unique 컬럼만. DNS·인증서 연동 코드 0 | **NEVER_COMPLETED** |
| tenant | `service-provisioning` 의 tenant 축이 canonical, Site 와 무관 | **REPLACED** |
| service provisioning | §7 참조 — Site 의존 0 | **REPLACED** |
| site deployment | `routes/deployment.routes.ts` · `services/deployment-service/` 삭제됨. `modules/deployment/` 는 entity+dto 껍데기만 남음, `deployment_instances` 테이블 없음 | **REMOVED** (잔재는 후속 후보 1) |
| admin UI (`pages/site-builder/*`) | 디렉터리 자체 없음 | **REMOVED** |

→ **Site 도메인 고유의 살아 있는 기능 0.** 핵심(scaffolding)이 설계 당시부터 stub 이었으므로 mount 돼 있던 8일 동안에도 site 레코드 생성 이상은 동작할 수 없었다.

---

## 7. Service Template / Provisioning 관계 (§9)

| 파일 | `Site` / `sites` / `siteId` 참조 |
|---|---|
| `service-templates/index.ts` | 0건 |
| `service-templates/service-initializer.ts` | 0건 |
| `service-templates/service-installer.ts` | 0건 |
| `services/AppStoreService.ts` | 0건 |
| `routes/service-provisioning.routes.ts` | 0건 |
| `routes/service-admin.routes.ts` | 0건 |

| 질문 | 답 |
|---|---|
| Service provisioning 이 Site 생성을 전제로 하는가? | **아니다.** 코드 참조 0건 |
| 현재 production 에서 그 경로가 동작하는가? | provisioning 자체는 동작(`/service/templates` · `/service-admin/templates` 200). Site 경로는 애초에 없음 |
| Site domain 삭제 시 provisioning 계약이 깨지는가? | **아니다.** import · 타입 · 런타임 의존 0 |

---

## 8. Frontend / Admin Consumer Census (§10)

| 대상 | 검색 결과 | 판정 |
|---|---|---|
| `apps/admin-dashboard` | `api/sites` · `site-builder` · `SiteBuilder` · `multi-site` **0건**. `pages/site-builder/` 디렉터리 부재 | **DEAD_UI (이미 제거됨)** |
| operator UI / `packages/ui` | 0건 | 해당 없음 |
| `services/**` (서비스별 web) | 0건 | 해당 없음 |
| main-site retired source | 0건 | 해당 없음 |
| `docs/**` | 7개 문서 (IR·CHECK·PLAN) | **HISTORICAL_SOURCE** |

**ACTIVE_UI 0 / UNROUTED_UI 0 / UNKNOWN 0.**

---

## 9. `branch_sites` 구분 (§11)

```
sites ≠ branch_sites
```

| 항목 | `sites` (Multi-Site Builder) | `branch_sites` (KPA 분회 홈페이지) |
|---|---|---|
| entity | `modules/sites/site.entity.ts` | `routes/kpa-branch/entities/branch-site.entity.ts` |
| routes | `modules/sites/sites.routes.ts` (미mount) | `controllers/kpa-branch/BranchSiteController.ts` (kpa-branch 라우터에서 소비) |
| 컬럼 | domain · template · apps[] · config(jsonb) · deploymentId · status enum | organization_id · title · tagline · logo_url · intro · contact(jsonb) · template · is_published |
| FK | 없음 | `FK_branch_sites_organization → kpa_organizations` |
| production 테이블 | **없음** | **있음** (row 0) |
| 이번 WO 처리 | **retire** | **불변 — 삭제하지 않음** |

이름 유사성 외 공통점 없음. 소유권 혼재 **0건**.

---

## 10. 최종 판정 (§12)

**`RETIRE_CONFIRMED`** — §12-D 조건 8개 전부 충족:

| 조건 | 실측 |
|---|:---:|
| runtime mount 0 | ✅ (2025-12-11 이후 mount 지점 파일 자체 부재) |
| repository consumer 0 | ✅ (전부 `sites.routes.ts` 내부) |
| production `sites` table 0 | ✅ (`to_regclass` = null) |
| executed migration 0 | ✅ (`typeorm_migrations` 이력 없음) |
| active UI 0 | ✅ |
| provisioning runtime dependency 0 | ✅ |
| unique 기능 0 | ✅ (scaffolding stub) |
| UNKNOWN 0 | ✅ |

§18 중지 조건 8개는 **전부 미해당**.

---

## 11. 변경 내역 (§13, §14)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/sites/site.entity.ts` | **삭제** |
| `apps/api-server/src/modules/sites/sites.routes.ts` | **삭제** |
| `apps/api-server/src/modules/sites/index.ts` | **삭제** |
| `apps/api-server/src/modules/sites/dto/create-site.dto.ts` | **삭제** |
| `apps/api-server/src/modules/sites/dto/scaffold-site.dto.ts` | **삭제** (디렉터리 전체 제거) |
| `apps/api-server/src/database/entities.ts` | Site import 1줄 + 배열 등록 1줄 제거, 사유 주석 대체 |
| `apps/api-server/src/common/docs/module-structure.md` | 도메인 표에서 `sites` 행 제거 (dead doc row) |
| `apps/api-server/src/bootstrap/register-routes.ts` | 이번 WO 판정 주석 추가 (mount 코드 변경 없음) |
| `apps/api-server/src/__tests__/service-monitor-retirement.spec.ts` | 헤더 주석 1줄 갱신 (assertion 불변) |
| `apps/api-server/src/__tests__/sites-domain-retirement.spec.ts` | **신규** — 재등록 방지 계약 12 test |

**DB 변경 0** — `sites` 테이블이 존재하지 않으므로 write · DDL · migration 모두 불필요(§15). 수동 DROP 없음.

**DEAD_REFERENCE 0** — 제거 후 `modules/sites` · `site.entity` · `sites.routes` · `SiteStatus` · `CreateSiteDto` · `ScaffoldSiteDto` 참조는 **주석 · 기록물 외 0건**.

범위를 넘겨 별도 WO 로 분리한 항목: `modules/deployment/*`(entity+dto 껍데기, `deployment_instances` 테이블 없음) — Site 전용 잔재가 아니라 자체 도메인 잔재이므로 §14 에 따라 이번 WO 에서 제거하지 않는다.

---

## 12. 테스트 / Build (§16)

| 항목 | 결과 |
|---|---|
| `sites-domain-retirement.spec.ts` (신규) | **12 PASS** |
| `service-monitor-retirement.spec.ts` | PASS |
| `service-provisioning-guard.spec.ts` | PASS |
| `service-admin-guard.spec.ts` | PASS |
| 합계 | **4 suites / 102 tests PASS / 0 FAIL** |
| `tsc --noEmit -p tsconfig.json` | 이번 변경 기인 오류 **0**. 잔여 23건은 전부 다른 세션의 **미커밋** `packages/action-log-core` 삭제로 인한 `TS2307 Cannot find module '@o4o/action-log-core'` (선행 상태, 본 WO 무관) |
| `build` | 위와 같은 이유로 로컬 전체 build 는 다른 세션 WIP 에 막혀 수행하지 않았다. 동일 컴파일러 · 동일 tsconfig 의 typecheck 로 대체하고, CI 의 Deploy API Server(clean checkout) 결과로 실제 build 를 확인한다 |
| Site import / sites.routes import / entities 등록 / dead reference | 각 **0** (신규 spec 이 계약으로 고정) |

---

## 13. Production 검증 (§17)

### 배포 전

`/api/sites` · `/api/v1/sites` 는 2025-12-11 이후 이미 존재하지 않으므로 이번 retire 로 상태가 바뀌는 route 는 없다(신규 404 없음). 검증 초점은 **entity 등록 제거 후 TypeORM 부팅 정상 여부**다.

### 배포 후

<!-- FILLED_AFTER_DEPLOY -->

---

## 14. 후속 후보

1. `modules/deployment/*`(`DeploymentInstance` entity + dto) 정리 — `deployment_instances` 테이블 없음, routes · service 이미 삭제됨. Multi-Site Builder 동반 잔재
2. `entities/Theme.ts`(`Theme` · `ThemeInstallation`) 정리 — `theme_installations` 테이블 production 부재
3. `modules/cms/entities/Page.ts` 의 `siteId` 컬럼 의미 재정의 — Multi-Site 전제가 사라진 뒤의 용도 확정
4. `/service` read ↔ `/service-admin` 중복 계약 통합 (선행 WO 이월)
5. 배포 이미지 `service-templates/templates/*.json` COPY 누락 (선행 WO 이월)
6. `serviceInitializer` TODO 스텁 (선행 WO 이월)
