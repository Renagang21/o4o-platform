# CHECK — WO-O4O-APP-INSTANCES-LIFECYCLE-CENSUS-AND-CANONICAL-DISPOSITION-V1

- **일자**: 2026-08-21
- **대상**: `app_instances` 테이블 / `AppInstance` entity 의 생명주기·소유권·현재 역할
- **최종 판정**: **`RETIRE_CONFIRMED`** (코드 retire 완료 · **DB 테이블은 유지**, 후속 schema-cleanup 대상)

---

## 1. 결론 요약

`app_instances` 는 **2025-10-23 e28f0c0dd 에서 도입된 "테넌트별 AI 앱 설치 instance" 계약**이다.
그 계약을 노출하던 route·controller 가 이후 **두 차례의 dead-code cleanup 에서 제거**되면서,
테이블은 남았지만 **도달 가능한 read/write 경로가 하나도 없는 상태**로 방치되어 있었다.

`0 row` 는 판정 근거가 아니라 **결과**다. 실제 판정 근거는 아래 3가지다.

1. **HTTP 계약 부재** — `/api/v1/apps/:slug/install|instance|config|execute` 가 **존재하지 않는다**.
   `/api/v1/apps` 에는 `GET /availability` **단 1개**만 mount 되어 있다.
2. **runtime consumer 0** — `AppRegistryService` 의 `install/getInstance/updateConfig/execute` 는
   **외부 호출자가 0개**였다. 서로만 호출하는 폐쇄 루프였다.
3. **tenant 축 미연결** — `businessId` 컬럼은 **DB 전체에서 `app_instances`·`app_usage_logs` 2곳에만** 존재한다.
   `organizations` / `service_memberships` / `stores` 등 실제 소유권 모델과 **FK 도 검증도 없다**.

`app_registry` 는 **별개 계보**이며 이번 작업에서 **일절 건드리지 않았다**.

---

## 2. 코드 Census (§3) — 미조사 0

검색어: `app_instances` · `AppInstance` · `appInstance` · `app_instance` · `instanceId` · `businessId` · `appId`

| # | 경로 | 분류 | 처리 |
|---|------|------|------|
| 1 | `apps/api-server/src/entities/AppInstance.ts` | `ACTIVE_DATA_MODEL` (등록만 · 소비 0) | **삭제** |
| 2 | `apps/api-server/src/database/entities.ts:61,617` | `ACTIVE_DATA_MODEL` (DataSource 등록) | **등록 해제** |
| 3 | `apps/api-server/src/services/app-registry.service.ts` (6곳) | `LEGACY_CODE` | **계약 제거** |
| 4 | `apps/admin-dashboard/src/api/app-system.api.ts` (4곳) | `DEAD_UI` (전 메서드 404) | **파일 삭제** |
| 5 | `apps/admin-dashboard/src/services/app-system-keys.service.ts` | `DEAD_UI` (항상 undefined/false) | **파일 삭제** |
| 6 | `apps/admin-dashboard/src/components/ai/SimpleAIModal.tsx` | `DEAD_UI` (동작한 적 없는 useEffect) | **제거(동작 보존)** |
| 7 | `apps/api-server/scripts/run-migration-standalone.mjs:123-134` | `LEGACY_CODE` (부트스트랩 DDL) | **DDL 블록 제거** |
| 8 | `apps/api-server/src/__tests__/service-monitor-retirement.spec.ts:16` | `HISTORICAL_DOC` (주석) | 유지 |
| 9 | `apps/api-server/src/database/migrations/20270219000000-*.ts:24` | `HISTORICAL_DOC` (실행완료 migration 주석) | 유지 |
| 10 | `docs/checks/*.md` 8건 | `HISTORICAL_DOC` | 유지 (§16-1 기록물 비대상) |

### NAME_COLLISION (1건 — 확정)

| 심볼 | 실제 대상 |
|------|-----------|
| `AppRegistryService` (`services/app-registry.service.ts`) | **`apps` 테이블** — `app_registry` 아님 |
| `AppManager` (`services/AppManager.ts`) | **`app_registry` 테이블** — 정본 |

이름과 실제 소관 테이블이 어긋나 있어 조사 시 혼동을 유발한다. 서비스 상단 주석에 명시했다.

---

## 3. Entity 구조 (§4)

| 필드 | 타입 | 비고 |
|------|------|------|
| `id` | uuid PK | |
| `appId` | uuid, `@Index` | `@ManyToOne('App')` → **`apps` 테이블** (`app_registry` 아님) |
| `businessId` | uuid nullable, `@Index` | NULL = global. **대응 테이블 없음** |
| `status` | enum(active/inactive/suspended) | |
| `config` | jsonb | API key 등 앱별 설정 |
| `usageCount` | integer | |
| `installedAt` / `updatedAt` | timestamp | |

### `app_registry` 와의 의미 비교 (§4 질문 마감)

```text
Q. app_registry = 앱 정의/설치 상태인가?          → YES (플랫폼 전역 feature availability)
Q. app_instances = 사업자/tenant별 설치 instance? → 설계상 YES
Q. 둘이 1:N 을 의도했는가?                        → NO. 계보가 다르다.
                                                    app_instances.appId → apps.id (uuid)
                                                    app_registry.appId  → varchar slug
                                                    두 테이블 사이에 관계가 존재한 적 없다.
Q. 그 1:N 계약이 실제로 사용되는가?               → 해당 없음 (관계 자체가 부재)
```

**중요**: `app_instances` 는 `app_registry` 의 하위 테이블이 **아니다**. 서로 다른 시기·다른 목적의 독립 계보다.

---

## 4. Runtime Consumer 추적 (§5)

| Consumer | 판정 | 근거 |
|---|---|---|
| `AppRegistryService.install()` | `DEAD` | 외부 호출자 0 |
| `AppRegistryService.getInstance(appSlug)` | `DEAD` | 호출자는 install/updateConfig/execute 뿐 (모두 DEAD) |
| `AppRegistryService.updateConfig()` | `DEAD` | 외부 호출자 0 |
| `AppRegistryService.execute()` | `DEAD` | 외부 호출자 0. `getInstance()` 가 항상 null → 구조적으로 항상 throw |
| `AppRegistryService.executeAppLogic()` | `DEAD` | execute 전용 private |
| `startup.service.ts:214-221` | `REAL_WRITE` — **단, `apps` 테이블 대상** | `initialize()` / `getBySlug()` / `register()` 만 사용. **app_instances 미접촉** |
| repository / EntityManager 직접 접근 | 없음 | `getRepository(AppInstance)` 는 서비스 내 1곳뿐 |
| background worker / scheduler / installer / module loader | 없음 | 검색 결과 0 |

**runtime read consumer 0 · runtime write consumer 0** 확정.

---

## 5. `/api/v1/admin/apps` 관계 (§6) — 질문 마감

canonical 17개 endpoint 전수 확인 결과 **`app_instances` / `AppInstance` 참조 0건**.

```text
Q. 현재 앱 install 이 app_instances row 를 생성하는가?      → NO. app_registry 만 변경.
Q. activate/deactivate 가 app_instances 를 갱신하는가?      → NO. app_registry 만 변경.
Q. uninstall 이 app_instances 를 삭제/비활성화하는가?       → NO. app_registry 만 변경.
```

write endpoint (`/install` `/activate` `/deactivate` `/uninstall` `/update` `/rollback` `/install-remote`)
는 모두 `AppManager` → **`app_registry` 단독**이다.

---

## 6. 다른 App API 관계 (§7)

| 경로 | app_instances 의존 |
|---|---|
| `GET /api/v1/apps/availability` | **없음** (`AppManager` → `app_registry`) |
| `GET /api/v1/appstore`, `/appstore/:appId` | **없음** (정적 카탈로그 read) |
| service installer / package manifest / app catalog | **없음** |

`/api/v1/apps` 에 mount 된 라우터는 `app-availability.routes.ts` **하나**이며 정의된 route 는 `GET /availability` **하나**다.
따라서 `app-system.api.ts` 가 호출하던 `/apps`, `/apps/:slug`, `/apps/:slug/install|instance|config|execute|usage`,
`/apps/usage/overall` 은 **전부 미존재 경로**였다.

> **실측 주의**: 미인증 요청은 404 가 아니라 **401** 이 반환된다.
> `app-availability.routes.ts` 가 `router.use(authenticate)` 를 route 정의보다 먼저 적용하기 때문이다.
> 인증된 요청에서만 404 가 된다. (프런트는 인증 상태였으므로 404 를 받았다.)

---

## 7. Production DB 실측 (§8) — read-only

채널: Cloud SQL Auth Proxy v2 (127.0.0.1:5451) + `gcloud auth print-access-token`. **SELECT 전용, write 0.**

### row count

| 테이블 | rows | n_tup_ins | n_tup_upd | n_tup_del |
|---|---:|---:|---:|---:|
| **`app_instances`** | **0** | **0** | **0** | **0** |
| `apps` | 1 | 1 | 0 | 0 |
| `app_registry` | **6** | 7 | 0 | 1 |
| `app_usage_logs` | 0 | 0 | 0 | 0 |

`pg_stat_database.stats_reset = 2025-12-25 06:43:13+00`.
→ **2025-12-25 이후 `app_instances` 에 삽입도 삭제도 단 1건 없었다.** (0 row 가 "삭제된 흔적"이 아님을 실증)

### schema metadata

| 항목 | 결과 |
|---|---|
| columns | 8 (id, appId, businessId, status, config, usageCount, installedAt, updatedAt) |
| constraints | **`PK_app_instances` (PRIMARY KEY) 뿐** |
| **inbound FK** | **0** |
| **outbound FK** | **0** (entity 의 `@ManyToOne(App)` 이 물리 FK 로 생성된 적 없음) |
| indexes | `PK_app_instances`, `IDX_app_instances_app_business` |
| trigger | **0** |
| dependent view / matview | **0** |
| sequence | 없음 (`uuid_generate_v4()` default) |
| total size | 24 kB |

### `apps` / `app_registry` 실제 내용

- `apps` 1행: `google-gemini-text` (google / text-generation / active / isSystem=t)
  → `startup.service.ts` 가 기동 시 seed. **app_instances 와 무관.**
- `app_registry` 6행: `membership-yaksa`, `digital-signage`, `digital-signage-core`,
  `partnerops`, `annualfee-yaksa`, `reporting-yaksa` — 전부 `status=active`, `source=local`.

---

## 8. Migration 역사 (§9)

| 시점 | 사건 |
|---|---|
| 2025-10-23 `e28f0c0dd` | App system 도입. `1840000000000-CreateAppSystemTables.ts` + `routes/apps.ts` + `controllers/apps.controller.ts` 생성 |
| — `8d58243bf` | **`routes/apps.ts` 제거** (WO-DEAD-CODE-LEGACY-CLEANUP-V1, unused route 30개 정리) |
| — `32273509a` | **`controllers/apps.controller.ts` 제거** (dead code cleanup) |
| — `d8e18cd84` | **`1840000000001-CreateAppSystemTables.ts` 제거** ("remove 124 unexecuted migrations") |

### 실행 여부 실측

`typeorm_migrations` 조회 결과 **`CreateAppSystemTables` 항목 없음**.
app 관련으로 실행된 것은 `CreateAppRegistryTable2026012200001` · `SeedDefaultApps2026012200002` (= `app_registry` 계보) 뿐이다.

**판정: `SCHEMA_DRIFT`**

- migration 은 **미실행**이었고 파일도 삭제됐다.
- 그런데 물리 테이블은 production 에 **존재**한다.
- 생성 경로는 migration 이 아니라 `scripts/run-migration-standalone.mjs` (수동 부트스트랩 스크립트) 또는 초기 `synchronize` 로 추정된다.
- 즉 이 테이블은 **정규 migration 이력에 근거가 없는 drift 산물**이다. 이것이 DB DROP 을 이번에 수행하지 않은 이유 중 하나다(§11).

---

## 9. 원래 설계 목적 (§10)

`e28f0c0dd` 커밋 메시지: *"Created App, AppInstance, AppUsageLog entities with **multi-tenant support**"*

| 원래 목적 | 판정 | 근거 |
|---|---|---|
| tenant별 앱 설치 | `NEVER_COMPLETED` | tenant 축(`businessId`) 이 어떤 테이블과도 연결되지 않음 |
| business별 app instance | `NEVER_COMPLETED` | `businesses` 테이블 자체가 DB 에 없음 |
| organization별 설정 | `REPLACED` | 현행 조직 축은 `organizationId` (Boundary Policy F6). `businessId` 는 그 축이 아님 |
| SaaS multi-tenant plugin | `NEVER_COMPLETED` | Phase 1 MVP 이후 진전 없음 |
| App Store 설치 이력 | `REPLACED` | `app_registry` + `/api/v1/admin/apps` 가 정본 |
| AI provider API key 보관 | `REPLACED` | 서버측 AI proxy(`@o4o/ai-core`) 로 이관. 클라이언트가 키를 들고 다니지 않음 |
| service provisioning | `REMOVED` | 의존 0 |

---

## 10. Multi-Tenant 의미 검증 (§11) — 질문 마감

```text
Q. 현재 O4O 의 실제 tenant 정본은?
   → serviceKey / organizationId (CLAUDE.md §7 Boundary Policy, F6 Frozen).

Q. organizationId / serviceKey 와 app_instances.businessId 가 연결되는가?
   → NO. 컬럼명도 축도 다르다.

Q. FK 또는 검증이 존재하는가?
   → NO. 물리 FK 0, 애플리케이션 검증 0.

Q. 임의 businessId 로 row 를 만들 수 있는 구조였는가?
   → YES. install(appSlug, businessId) 는 businessId 를 그대로 받아 저장했다.
     검증 없는 uuid 를 그대로 신뢰하는 구조였다(= 도달 가능했다면 Boundary Guard Rule 위반).
```

**결론**: `businessId` 는 실제 소유권 모델과 연결된 적 없는 **고아 tenant 축**이다.
DB 전체에서 이 컬럼을 가진 테이블은 `app_instances` · `app_usage_logs` **2개뿐**이며, 둘 다 0행이다.

---

## 11. Frontend Consumer Census (§12)

| 소비처 | 판정 | 상세 |
|---|---|---|
| `api/app-system.api.ts` | `DEAD_UI` | 전 메서드가 미존재 endpoint 호출. 유일한 소비자는 아래 1건 |
| `services/app-system-keys.service.ts` | `DEAD_UI` | `getInstance` 실패 → 4개 메서드 전부 항상 `undefined` / `false` |
| `components/ai/SimpleAIModal.tsx` | `DEAD_UI` (부분) | `isGeminiInstalled()` 가 **항상 false** → API 키/모델 자동 채움이 **한 번도 동작한 적 없음** |
| `pages/settings/AppServices.tsx` (`/settings/app-services`) | `ACTIVE_UI` — **단 mock 전용** | 라우팅되어 있으나 `appSystemApi` 를 **import 조차 하지 않는다**. `handleSave` = `setTimeout(1000)`, 통계 = 하드코딩 `mockUsageStats` |
| 그 외 web (kpa / glycopharm / k-cosmetics / neture / pharmacy-hub) | `NO_CONSUMER` | 참조 0 |

**app_instances 를 실제로 읽거나 쓰는 UI 는 0개다.**

### DEAD_REFERENCE 로 남긴 것 (이번 WO 범위 밖 — 후속 후보)

`SimpleAIModal` 이 안내하는 `/admin/settings/app-services` 는 **mock 화면**이다.
"AI Services 설정에서 Gemini 앱을 먼저 설치하세요" · "API 키를 미리 저장하면 자동으로 입력됩니다" 라는 안내는
**저장 기능이 실재하지 않으므로 사실과 다르다.** 이번 변경으로 발생한 것이 아니라 **기존 상태 그대로**이며,
AI 설정 UX 영역 문제이므로 범위 외로 분리해 보고한다(§16 후속 후보 1).

---

## 12. `app_registry` 와 정본 비교 (§13)

| 항목 | `app_registry` | `app_instances` |
|---|---|---|
| 앱 정의 | △ (appId/name/version/type 보유) | ✗ (`apps` 테이블이 담당) |
| 설치 상태 | ✅ **정본** (`installed`/`active`/`inactive`) | ✗ |
| tenant별 상태 | ✗ (플랫폼 전역 · serviceKey/orgId 컬럼 없음) | △ 설계상 존재했으나 **미연결·미사용** |
| persistence | ✅ 6 rows | ✅ 테이블 존재 / **0 rows** |
| active consumer | ✅ `AppManager` · `/api/v1/admin/apps` (17) · `/apps/availability` | **0** |
| production rows | **6** | **0** |
| canonical 여부 | ✅ **canonical** | ❌ **retire** |

**중복 상태 없음** — 두 테이블은 서로 다른 계보이며 겹치는 데이터가 존재한 적이 없다.
따라서 판정은 `REPLACED_BY_APP_REGISTRY` 가 아니라, **역할이 분화되어 소멸한 `LEGACY_UNUSED` → `RETIRE_CONFIRMED`** 다.

- 설치·활성 상태 역할 → `app_registry` 로 흡수
- AI 키·설정 보관 역할 → 서버측 AI proxy(`@o4o/ai-core`) 로 이관
- tenant별 instance 역할 → **구현된 적 없음**

---

## 13. 최종 판정 (§14)

### `RETIRE_CONFIRMED` — 8개 조건 전부 충족

| 조건 | 실측 |
|---|---|
| production row 0 | ✅ 0 (n_tup_ins 0 · stats_reset 2025-12-25 이후 무변동) |
| runtime read consumer 0 | ✅ |
| runtime write consumer 0 | ✅ |
| active UI consumer 0 | ✅ (AppServices 는 mock, api client 는 404) |
| canonical API dependency 0 | ✅ `/admin/apps` 17개 전수 참조 0 |
| service provisioning dependency 0 | ✅ |
| FK dependency 0 | ✅ inbound 0 / outbound 0 / trigger 0 / view 0 |
| unique product function 0 | ✅ (§12 역할 분화 완료) |
| **UNKNOWN** | ✅ **0** |

### 중지 조건 (§20) 해당 없음

active write consumer · tenant 기능 사용 · FK · 외부 integration · `/admin/apps` 의존 ·
provisioning 의존 · migration 의미 불명 · UNKNOWN — **전부 미해당**.

> migration 의미는 §8 에서 `SCHEMA_DRIFT` 로 **명확히 규명**했다(미실행 + 파일 삭제 + 수동 스크립트 생성).
> "불명확"이 아니라 "drift 임이 확정"이므로 중지 조건이 아니다. 단, 이 사실은 §14 의 DB 보존 근거가 된다.

---

## 14. 코드 정리 내용 (§15)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/entities/AppInstance.ts` | **삭제** |
| `apps/api-server/src/database/entities.ts` | import 1줄 · entities 배열 1줄 제거 (retire 주석 대체) |
| `apps/api-server/src/services/app-registry.service.ts` | `AppInstance` import · `instanceRepository` · `install()` · `getInstance(appSlug)` · `updateConfig()` · `execute()` · `executeAppLogic()` · `logUsage()` · `categorizeError()` · `ExecuteOptions` · `ExecuteResult` · `executeAI` import 제거. 상단에 retire·명칭충돌 주석 추가 |
| `apps/admin-dashboard/src/api/app-system.api.ts` | **삭제** (전 메서드 미존재 endpoint) |
| `apps/admin-dashboard/src/services/app-system-keys.service.ts` | **삭제** |
| `apps/admin-dashboard/src/components/ai/SimpleAIModal.tsx` | 동작한 적 없는 로드 `useEffect` · `isAppInstalled` state 제거, `useEffect` import 정리 |
| `apps/api-server/scripts/run-migration-standalone.mjs` | `CREATE TABLE app_instances` + index DDL 블록 제거 |
| `apps/api-server/src/__tests__/app-instances-retirement.spec.ts` | **신규** — 재도입 방지 계약 5건 |

### 보존한 것 (의도적)

- `AppRegistryService.initialize()` / `register()` / `getBySlug()` / `getByProvider()` / `getByCategory()` / `getAllActive()` / `getUsageStats()`
  → `apps` · `app_usage_logs` 소관이며 **`app_instances` 와 무관**. `startup.service.ts` 가 앞 3개를 실사용한다.
- `App` · `AppUsageLog` · `AppRegistry` entity 전부 유지.
- **`app_registry` 및 App Store 계약 일절 미변경.**

### 동작 보존 증명 — `SimpleAIModal`

제거한 `useEffect` 는 `AppSystemKeyService.isGeminiInstalled()` 를 호출했고, 그 경로는
미존재 endpoint 로 인해 **항상 실패**했다. 따라서 `isAppInstalled` 는 **언제나 `false`**,
`setApiKey` / `setModel` 자동 채움은 **한 번도 실행된 적이 없다**.
`!isAppInstalled` 로 감싸져 있던 안내 문구는 **항상 렌더링**되던 것이므로 무조건 렌더링으로 바꿨다.
→ **사용자가 보는 화면과 동작은 변경 전과 동일하다.**

---

## 15. DB Table 처리 (§16) — **유지**

**`DROP TABLE` 을 수행하지 않았다.** WO §16 의 허용 조항을 택한다.

> "불필요한 schema migration 추가 자체가 더 복잡하다면 **코드만 retire 하고 empty table 은
> 후속 schema-cleanup 대상으로 남기는 것도 허용**한다."

### 유지 이유

1. **§8 의 `SCHEMA_DRIFT`** — 이 테이블은 정규 migration 이력에 근거가 없다.
   생성 이력이 없는 테이블을 migration 으로 DROP 하면 `down()` 이 복원할 대상을 정의할 수 없어
   **rollback 계약이 성립하지 않는다**.
2. 24 kB · 0 row · FK 0 · trigger 0 · view 0 → **유지 비용이 사실상 0**이며 위험도 0.
3. 코드 계약이 제거되고 재도입 방지 테스트가 고정되었으므로 **재사용 위험도 0**.

### DROP 조건 충족 현황 (후속 WO 용 기록)

| 조건 | 현재 |
|---|---|
| row 0 | ✅ |
| FK inbound/outbound 0 | ✅ |
| trigger/view dependency 0 | ✅ |
| runtime consumer 0 | ✅ (본 WO 로 달성) |
| **migration history 명확** | ⚠️ **drift** — 생성 migration 이 이력에 없음 |
| rollback/backup 판단 완료 | ⏸ 후속 |

→ `app_instances` · `app_usage_logs` · (필요 시) `apps` 를 **drift table 일괄 정리 WO** 로 묶는 것이 적절하다(§16 후속 후보 2).
**수동 `DROP TABLE` 은 수행하지 않았다.**

---

## 16. 테스트 / Build (§18)

| 항목 | 결과 |
|---|---|
| `app-instances-retirement.spec.ts` (신규) | ✅ **5/5 pass** |
| `appstore-auth-boundary.test.ts` (App Store 회귀) | ✅ **pass** |
| `service-monitor-retirement.spec.ts` | ✅ **pass** (2 suites 합계 **26/26**) |
| api-server `type-check` (`tsc --noEmit`) | ✅ **에러 0** |
| api-server `build` (`tsc -p tsconfig.build.json`) | ✅ **성공** |
| admin-dashboard `type-check` | ✅ **에러 0** |
| eslint (변경 파일 4개) | ✅ **error 0** / warning 5 — 전부 **기존 항목** (`currentBlocks`·`editMode`·`setEditMode`·`progress`·`editModes`), 본 변경과 무관 |

### CI 결과 — 본 변경 기인 오류 0 (§18 별도 증명)

`CI Pipeline` (run 32488018335, commit `d9ecc678a`) 이 **failure** 로 끝났다. 숨기지 않고 기록한다.

```text
Test Suites: 1 failed, 179 passed, 180 total
Tests:       2 failed, 2894 passed, 2896 total

PASS src/__tests__/app-instances-retirement.spec.ts        ← 본 WO 신규
PASS src/routes/__tests__/appstore-auth-boundary.test.ts   ← App Store 회귀 가드
FAIL src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts
  ● §14 navigation › /forum/request 가 공개 navigation 에 노출된다
  ● §14 navigation › /forum/my-dashboard 가 공개 navigation 에 노출된다
```

**본 변경과 무관함을 실증한다** (CLAUDE.md 중지 조건 "현재 변경과 무관한 build·test 실패").

| 증거 | 결과 |
|---|---|
| 본 commit 이 건드린 파일 9개 중 pharmacy-hub / forum 파일 | **0건** |
| 실패 spec 이 읽는 입력 파일이 부모 `d98533518` → `d9ecc678a` 사이에 변경됐는가 | **0건** (`git diff --name-only` 빈 결과) |
| 부모 commit `d98533518` 의 `services/web-pharmacy-hub/src/config/navigation.ts` 에 `forum/request`·`forum/my-dashboard` 존재 여부 | **0회** — 부모에서도 동일하게 실패 |
| 본 WO 신규·회귀 테스트 CI 결과 | **PASS** |

→ 입력이 하나도 바뀌지 않았으므로 이 spec 의 결과는 부모 commit 에서와 **논리적으로 동일**하다. **선행 실패(pre-existing)** 이며 `WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1` 계보의 미완 항목이다. 범위 외이므로 **수정하지 않고 보고**한다(§20 후속 후보 5).

**clean deploy 성공**: Deploy API Server ✅ / Deploy Admin Dashboard ✅ / CodeQL ✅ — 3개 모두 `d9ecc678a` 에서 success.

> 게이트 오탐 1건 처리: 신규 테스트가 `getInstance(` 를 금지어로 검사해 최초 1회 실패했다.
> 확인 결과 **싱글턴 접근자 `static getInstance(): AppRegistryService`** 와의 명칭 충돌(오탐)이었다.
> 저작을 우회하지 않고 **규칙을 `getInstance(appSlug` 시그니처로 좁힌 뒤**, 싱글턴 접근자는
> 반대로 **존재해야 한다**는 검사를 추가했다. 재실행 5/5 통과(오탐 0 / 미탐 0).

---

## 17. Production 검증 (§19)

접근 채널: **`https://api.neture.co.kr`** (LB).
Cloud Run ingress 가 `internal-and-cloud-load-balancing` 이라 `*.run.app` 직접 호출은 전량 404 다 — 검증 시 주의.

### 배포 전 baseline

| 항목 | 결과 |
|---|---|
| `/health` | **200** |
| `/health/database` | **200** `{"status":"healthy","version":"15.17","pingMs":4,"longRunningQueries":0}` |
| `/api/v1/appstore` | **200** (`success:true`, 카탈로그 정상) |
| `/api/v1/admin/apps` (미인증) | **401** — auth 경계 정상 |
| `/api/v1/apps/availability` (미인증) | **401** — auth 경계 정상 |
| `app_registry` rows | **6** |
| `app_instances` rows | **0** |

### 배포 후

- commit `d9ecc678a` · Cloud Run revision **`o4o-core-api-03444-cd9`**
- 워크플로: **Deploy API Server ✅ success** / **Deploy Admin Dashboard ✅ success** / **CodeQL ✅ success**

| 항목 | 배포 전 | 배포 후 | 판정 |
|---|---|---|---|
| `/health` | 200 | **200** | 동일 |
| `/health/database` | healthy | **healthy** (`pingMs:3`, `activeConnections:10`, `longRunningQueries:0`) | 동일 |
| `/api/v1/appstore` | 200 | **200** (6,394 bytes) | 동일 |
| `/api/v1/admin/apps` (미인증) | 401 | **401** | auth 경계 유지 |
| `/api/v1/apps/availability` (미인증) | 401 | **401** | auth 경계 유지 |
| `app_registry` rows | 6 | **6** | **불변** |
| `app_instances` rows | 0 | **0** | 의도된 최종 상태 |
| `apps` rows | 1 | **1** | 불변 |

**신규 ERROR 0 / 신규 5xx 0** — 배포 시각(13:39Z) 이후 `severity>=ERROR` 로그 조회 결과 **0건**.

```text
gcloud logging read 'resource.type=cloud_run_revision AND
  resource.labels.service_name=o4o-core-api AND severity>=ERROR AND
  timestamp>="2026-08-21T13:39:00Z"' --limit 20   →   결과 없음
```

`app_registry` 6행이 배포 전후 동일하므로 **App Store 회귀 0** 이다.

**App install/uninstall write 는 production 에서 수행하지 않았다** (§19 준수).
**DB write 0** — 본 WO 의 모든 DB 접근은 SELECT 전용이었다.

---

## 18. 문서 정합 (CLAUDE.md §16-5)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```

기준 문서(`docs/baseline/` · `docs/architecture/` · `docs/rules/` 등)에서 `app_instances` 를
현행 구조로 서술한 곳은 없었다. 참조는 전부 `docs/checks/` 기록물이며 §16-1 상 정비 대상이 아니다.

---

## 19. DEAD_REFERENCE / UNKNOWN

| 구분 | 건수 | 비고 |
|---|---:|---|
| **DEAD_REFERENCE** | **0** | 잔여 `app_instances` 문자열은 전부 retire 설명 주석 · 본 CHECK · 계약 테스트 · 기록물 |
| **UNKNOWN** | **0** | §3~§13 전 항목 판정 완료 |

---

## 20. 후속 후보

| # | 항목 | 사유 |
|---|---|---|
| 1 | `/admin/settings/app-services` (`AppServices.tsx`) mock 화면 정리 | 저장 기능 없이 "API 키를 저장하면 자동 입력" 이라 안내. `SimpleAIModal` 이 이 화면을 링크한다. **기존 상태이며 본 WO 범위 밖** |
| 2 | drift table 일괄 schema-cleanup (`app_instances` · `app_usage_logs` 등) | 생성 migration 이력이 없는 테이블들의 rollback 계약 설계 후 일괄 DROP 판단 |
| 3 | `AppRegistryService` 명칭 정정 (`AppService` 등) | `app_registry` 를 다루지 않는데 이름이 그렇게 읽힌다. 조사 혼동 유발 (NAME_COLLISION) |
| 4 | `AppRegistryService.getUsageStats()` / `getByProvider()` / `getByCategory()` / `getAllActive()` 소비처 0 | `app_instances` 무관이라 본 WO 범위 밖. 별도 dead-code 판정 필요 |
| 5 | **`pharmacy-hub-community-capability-adoption.spec.ts` §14 navigation 2건 선행 실패** | `services/web-pharmacy-hub/src/config/navigation.ts` 에 `/forum/request`·`/forum/my-dashboard` 항목 부재. `WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1` 계보. **main CI red 상태이므로 우선순위 높음** |

---

## 21. 완료 기준 대조 (§22)

| 기준 | 상태 |
|---|---|
| `app_instances` 역할 확정 | ✅ `RETIRE_CONFIRMED` |
| `app_registry` 와 정본 관계 명확 | ✅ 별개 계보 · `app_registry` 단독 canonical |
| runtime/UI/API 소비처 미확정 0 | ✅ |
| RETIRE_CONFIRMED 시 dead code 제거 완료 | ✅ |
| DB 불필요 변경 0 | ✅ **DB write 0 · DDL 0** |
| DEAD_REFERENCE 0 | ✅ |
| UNKNOWN 0 | ✅ |
| App Store 회귀 0 | ✅ `app_registry` 6행 불변 · appstore 테스트 통과 |
| production 정상 | ✅ (배포 후 재확인 — §17) |
