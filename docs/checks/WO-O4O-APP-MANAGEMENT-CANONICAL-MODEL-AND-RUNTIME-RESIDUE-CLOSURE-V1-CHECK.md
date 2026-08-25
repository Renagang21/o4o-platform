# WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1 — CHECK

App 관리 축(APPS_CATALOG · app_registry · /api/v1/appstore · /api/v1/admin/apps ·
ModuleLoader · AppManager · manifest)을 전수 census 하고 **책임별 canonical owner 를 1개씩
고정**한 뒤, 죽은 runtime residue 를 제거한 기록.

- 기준 branch: `main`
- 착수 기준 commit: `88fda710c` (작업 중 다른 세션 커밋으로 `c98d95644` 까지 진행됨 — 충돌 없음)
- DB schema change: **0** / migration: **0** / production DB write: **0** (전 구간 SELECT only)
- `packages/**` active package code 변경: **0**

---

## 1. 판정 요약

| 판정 코드 | 대상 | 결과 |
|---|---|---|
| `MODULE_LOADER_RETIRE` | `modules/module-loader.ts` 및 부트 시 dynamic plugin 등록 | 제거 |
| `ADMIN_APPS_WRITE_RETIRE` | `/api/v1/admin/apps` write 8종 + 전용 부속 서비스 7종 | 제거 |
| KEEP | APPS_CATALOG 17 · `packages/**/manifest.ts` 17 · `app_registry` 6행 · read API 전부 | 무변경 |

---

## 2. 책임별 canonical owner (§19 — UNKNOWN 0)

| 책임 | canonical owner | 근거 |
|---|---|---|
| App 정의 metadata | `apps/api-server/src/app-manifests/appsCatalog.ts` (`APPS_CATALOG` 17개) | admin/apps 의 market · service-group · compatibility read 가 전부 여기서 파생. CI AppStore Guard 가 packages manifest 와 정합 검증 |
| Package 자체 metadata | `packages/**/manifest.ts` (17개) | 각 패키지 barrel `index.ts` 가 re-export, `scripts/appstore-guard.ts` (CI) 가 소비. **API 런타임 소비 0** → KEEP·무접촉 |
| 공개 카탈로그 API | `GET /api/v1/appstore` (2종) | APPS_CATALOG 투영. organic consumer 0 → 후속 후보로만 보고 |
| 운영 상태(설치·활성) | **`app_registry` 테이블 (production 6행)** | `/apps/availability` → `AppGuard` · `AppRouteGuard` · `useAdminMenu` 게이팅에 실사용 |
| 운영 상태 read API | `GET /api/v1/apps/availability` | production 30일 organic 200/304 트래픽 확인 |
| 관리자 조회 API | `/api/v1/admin/apps` READ 9종 | `AppStorePage` READ-ONLY UI |
| 관리자 변경 API | **없음 (retire)** | consumer 0 · 30일 호출 0 · DB 무변경 |
| Runtime plugin 로딩 | **없음 (retire)** | 전 환경에서 dynamic route 0 · entity 0 |
| lifecycle hook 실행 | **없음** | 파생 원본 `app-manifests/index.ts` 의 `manifestRegistry` 가 Phase R1 이후 비어 있었음 |
| `apps` 테이블 / `app-registry.service.ts` | AI integration 등록 전용(1행) | App 관리 축이 아니라 **이름만 충돌**. 이 WO 범위 밖 |

> `APPS_CATALOG 17` 과 `app_registry 6` 의 숫자는 **의도적으로 맞추지 않았다.**
> 전자는 "존재하는 App 정의", 후자는 "특정 서비스에 설치된 운영 상태" 로 의미 축이 다르다.

---

## 3. `app_registry` 6행 census (§6 — production, SELECT only)

| appId | type | status | source | installedAt = updatedAt | 분류 |
|---|---|---|---|---|---|
| `membership-yaksa` | core | active | local | 2026-01-22T04:36:28.617Z | admin-dashboard 게이팅에 사용 |
| `digital-signage` | standalone | active | local | 2026-01-22T04:36:28.617Z | admin-dashboard 게이팅에 사용 |
| `digital-signage-core` | core | active | local | 2026-01-22T04:36:28.617Z | admin-dashboard 게이팅에 사용 |
| `partnerops` | standalone | active | local | 2026-01-22T04:36:28.617Z | admin-dashboard 게이팅에 사용 |
| `annualfee-yaksa` | core | active | local | 2026-01-22T04:36:28.617Z | **STALE_ROW** (패키지·화면 제거됨) |
| `reporting-yaksa` | core | active | local | 2026-01-22T04:36:28.617Z | **STALE_ROW** (패키지·화면 제거됨) |

- 6행 전부 `dependencies = null`, `installedAt == updatedAt == 2026-01-22T04:36:28.617Z`
  → **seed 이벤트 1회 이후 write 가 한 번도 없었다.**
- 출처: `2026012200002-SeedDefaultApps.ts` (7행 seed) →
  `20270219000000-RemoveLegacyCosmeticsPartnerAppRegistry.ts` 로 `cosmetics-partner` 제거 → 6행.
- STALE_ROW 2건은 `WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1` 에서
  패키지·화면이 제거되며 남은 잔여 행이다.
  **§22 에 따라 삭제하지 않았다** (production 데이터, DELETE 승인 대상).
- 인접 테이블: `apps` 1행(`google-gemini-text`, AI integration), `app_instances` **0행**
  (§23 에 따라 canonical 복원도 DROP 도 하지 않았다).

---

## 4. ID 계보 판정 (§7)

`APPS_CATALOG` 의 17개 appId 와 `packages/**/manifest.ts` 17개는 **1:1 대응**한다
(CI AppStore Guard 가 이 정합을 강제한다). `app_registry` 의 6개 appId 는 그중 4개
(`membership-yaksa`, `digital-signage`, `digital-signage-core`, `partnerops`)가 카탈로그와
일치하고, 나머지 2개(`annualfee-yaksa`, `reporting-yaksa`)는 카탈로그에서 이미 빠진 STALE 이다.
**UNKNOWN mapping 0.**

`apps/api-server/scripts/bootstrap-install-apps.ts` 는 카탈로그에 없는 `sellerops` ·
`supplierops` 를 install 하도록 적혀 있었으나, `docs/checks/CHECK-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1.md:150`
에 "미실행 스크립트 | jest·CI 실행 대상 아님" 으로 이미 기록돼 있었다 → 삭제 대상.

---

## 5. MODULE_LOADER_RETIRE 근거 (실측)

ModuleLoader 는 `glob('<workspaceRoot>/packages/**/manifest.ts')` → `import()` →
`installModule` → `activateModule` → `getModuleRouter` → `app.use('/api/v1/<moduleId>')`
순으로 dynamic route 와 entity 를 등록하도록 작성돼 있었다. 실측 결과 **모든 환경에서 결과 0**:

- **production**: Dockerfile 은 `dist/main.js` 번들 + `dist/database` + `src/assets` +
  `mail-templates` 만 COPY 한다. 이미지에 `packages/` 디렉터리 자체가 없다.
  번들의 `__dirname` 은 `/app/dist` 이므로 glob 대상 경로가 존재하지 않는다.
  → **dynamic route 0 · entity 0**.
- **로컬 재현**: manifest 17개 발견 → 그중 **13개가 top-level `id` 부재로 로더 게이트에서 거부**.
  통과한 4개(`signage`, `auth-core`, `cosmetics-seller-extension`, `platform-core`)도
  `dist/backend/index.js` 가 `export {}` 또는 `export * from './routes'` 뿐이라
  named `routes` export 가 없어 **router 0**. (`dist/` 는 gitignore 대상)

→ "manifest 가 존재한다" 는 사실은 runtime active 의 근거가 아니었다(§작업원칙).
→ production 에서 깨진 로더를 **복구하지 않고 제거**했다(§작업원칙).

## 6. ADMIN_APPS_WRITE_RETIRE 근거 (실측)

| 항목 | 결과 |
|---|---|
| frontend consumer | **0** — AppStore 화면은 `WO-APPSTORE-UI-DEMOTION` 이후 READ-ONLY, API 클라이언트에만 정의가 남아 있었다 |
| internal consumer | **0** — `git grep` 전수(exact path · appId literal · 대상 파일 경로 · 패키지명 · raw-source spec) |
| production 30일 호출 | **0** — 동일 필터의 read endpoint 로 대조 검증(필터 자체가 동작함을 증명) |
| unique runtime effect | **0** — 모든 lifecycle 분기가 `hasManifest()` 항상 false 로 no-op |
| DB 흔적 | **0** — 6행 전부 `updatedAt == installedAt` |

→ §10 조건(모두 0)을 충족하여 retire.

---

## 7. 변경 목록

### 수정 (4 + 3)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/routes/admin/apps.routes.ts` | write 8종 handler 제거(725 → 358줄), 관련 import 제거, `GET /` 응답에서 항상 빈 배열이던 `ownsTables`/`ownsCPT`/`ownsACF` 제거. **READ 9종 유지** |
| `apps/api-server/src/services/app-manager/app-manager.facade.ts` | read-only 5메서드로 재작성 |
| `apps/api-server/src/services/app-manager/app-manager.registry.ts` | write 경로 전용 `isInstalled()` · `canUninstall()` 제거 |
| `apps/api-server/src/bootstrap/register-routes.ts` | ModuleLoader 부트 블록(4단계) · `getAllEntities()` 수집 제거, `MODULE_LOADER_RETIRE` 주석 삽입, 로그·catch 식별자 정리 (1168 → 1138줄). **static mount 전부 보존** |
| `apps/admin-dashboard/src/api/admin-apps.ts` | 죽은 write client 8종 + `RemoteInstallOptions` · `SecurityValidationResult` 타입 + `ownsTables`/`ownsCPT`/`ownsACF` 필드 제거 |
| `apps/admin-dashboard/src/pages/apps/AppStorePage.tsx` | 항상 렌더되지 않던 "소유 데이터" 섹션 제거 |
| `apps/api-server/src/__tests__/service-provisioning-retirement.spec.ts` | 선행 WO 의 "ModuleLoader 는 계속 사용된다" 단언을 "재도입되지 않는다" 로 반전 + 근거 주석 |

### 삭제 (20)

```
apps/api-server/src/modules/module-loader.ts
apps/api-server/src/modules/types.ts
apps/api-server/src/modules/index.ts
apps/api-server/src/services/app-manager/app-manager.loader.ts
apps/api-server/src/services/app-manager/app-manager.execution.ts
apps/api-server/src/services/app-manager/app-manager.lifecycle.ts
apps/api-server/src/services/app-manager/app-manager.types.ts
apps/api-server/src/services/AppDependencyResolver.ts
apps/api-server/src/services/AppDataCleaner.ts
apps/api-server/src/services/AppTableOwnershipResolver.ts
apps/api-server/src/services/ExtensionMergeService.ts
apps/api-server/src/services/AppSecurityValidator.ts
apps/api-server/src/services/RemoteManifestLoader.ts
apps/api-server/src/services/RemoteResourcesLoader.ts
apps/api-server/src/constants/coreTables.ts
apps/api-server/src/app-manifests/index.ts
apps/api-server/src/app-manifests/forum.manifest.ts
apps/api-server/src/app-manifests/partnerops.manifest.ts
apps/api-server/scripts/bootstrap-install-apps.ts
apps/api-server/scripts/bootstrap-install-apps.mjs
```

부속 서비스 7종은 **write 경로에서만** 소비됐음을 `git grep` 으로 확인했다(테스트 참조 0).

### 신규 (1)

- `apps/api-server/src/__tests__/app-management-runtime-residue-retirement.spec.ts`
  — 재등록 방지 계약. DB·네트워크 접근 0.

---

## 8. DEAD_REFERENCE 0 / UNKNOWN 0

- `apps/api-server` typecheck: PASS
- `apps/admin-dashboard` typecheck: PASS
- `apps/api-server` build (`tsc -p tsconfig.build.json`): PASS
- `apps/admin-dashboard` build (vite): PASS
- jest 전체: **190 suites / 3115 tests PASS**
- UNKNOWN 항목: **0** (§28 중지 조건 미해당. "manifest 가 다른 build system 의 canonical
  metadata" 항목은 CI AppStore Guard 로 귀결 → `packages/**/manifest.ts` 무접촉으로 처리)

## 9. 재등록 방지 CHECK 경로

- `apps/api-server/src/__tests__/app-management-runtime-residue-retirement.spec.ts`
  - 삭제 20파일 부활 금지
  - `register-routes.ts` 의 `moduleLoader` import·호출 금지 + `MODULE_LOADER_RETIRE` 주석 존속
  - `admin/apps.routes.ts` 에 `router.post|put|patch|delete` 0
  - AppManager 계층의 `repo.save|insert|update|delete|remove` 0
  - `/api/v1/appstore` · `/api/v1/apps` · `/api/v1/admin/apps` mount 존속, READ 9종 존속
  - `packages` 하위 `manifest.ts` 17개 유지
  - admin-dashboard raw-source 에 write path 참조 0, `ownsTables|ownsCPT|ownsACF` 0
- `apps/api-server/src/__tests__/service-provisioning-retirement.spec.ts` (반전된 단언)

## 10. 후속 후보 (이 WO 범위 아님)

1. `/api/v1/appstore` GET 2종 — organic consumer 0. 별도 WO 로 census 후 판단.
2. `app_registry` STALE_ROW 2건(`annualfee-yaksa`, `reporting-yaksa`) — production DELETE 는
   **사용자 승인 필요**. 승인 시 migration 이 아닌 운영 절차로 처리 권장.
3. `apps` 테이블 / `app-registry.service.ts` — AI integration 축으로 이름 충돌 해소(rename) 검토.
