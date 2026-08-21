# WO-O4O-APPSTORE-DUAL-CONTRACT-CENSUS-AND-CANONICALIZATION-V1 — CHECK

- 작성일: 2026-08-21
- 대상: `/api/v1/appstore` (정적 카탈로그 + ModuleLoader in-memory) vs `/api/v1/admin/apps` (DB `app_registry`)
- 판정: **A. ADMIN_APPS_CANONICAL**

---

## 1. Endpoint 전수 Census (§3)

### A. `/api/v1/appstore` — 변경 전 (mount: `bootstrap/register-routes.ts:238`)

| Method | Path | R/W | Auth (변경 전) | 저장소 | Consumer |
|---|---|---|---|---|---|
| GET | `/` | R | 없음 (public) | STATIC_CATALOG + IN_MEMORY | CONSUMER_ZERO |
| GET | `/modules` | R | authenticate+requireAdmin | IN_MEMORY | CONSUMER_ZERO |
| GET | `/:appId` | R | 없음 (public) | STATIC_CATALOG + IN_MEMORY | CONSUMER_ZERO |
| POST | `/install` | W | authenticate+requireAdmin | IN_MEMORY | CONSUMER_ZERO |
| POST | `/activate` | W | authenticate+requireAdmin | IN_MEMORY | CONSUMER_ZERO |
| POST | `/deactivate` | W | authenticate+requireAdmin | IN_MEMORY | CONSUMER_ZERO |
| DELETE | `/uninstall` | W | authenticate+requireAdmin | IN_MEMORY | CONSUMER_ZERO |

미조사 0.

### B. `/api/v1/admin/apps` — `routes/admin/apps.routes.ts` (전 라우트 `router.use(authenticate); router.use(requireAdmin);`)

| Method | Path | R/W | 저장소 | Consumer |
|---|---|---|---|---|
| GET | `/market` | R | DATABASE | ACTIVE_FRONTEND_CONSUMER (`AppStorePage`) |
| GET | `/disabled` | R | DATABASE | ACTIVE_FRONTEND_CONSUMER (`AppStorePage`) |
| GET | `/` | R | DATABASE | ACTIVE_FRONTEND_CONSUMER (`AppStorePage`) |
| GET | `/service-groups` | R | STATIC_CATALOG | ACTIVE_FRONTEND_CONSUMER (`AppStorePage`) |
| GET | `/service-groups/stats` | R | STATIC_CATALOG | CONSUMER_ZERO |
| GET | `/:appId` | R | DATABASE | CONSUMER_ZERO |
| GET | `/:appId/version-info` | R | DATABASE | CONSUMER_ZERO |
| GET | `/by-service/:serviceGroup` | R | STATIC_CATALOG | CONSUMER_ZERO |
| GET | `/:appId/compatibility` | R | STATIC_CATALOG | CONSUMER_ZERO |
| POST | `/install` | W | DATABASE | CONSUMER_ZERO (UI 는 WO-APPSTORE-UI-DEMOTION 으로 read-only) |
| POST | `/activate` | W | DATABASE | CONSUMER_ZERO |
| POST | `/deactivate` | W | DATABASE | CONSUMER_ZERO |
| POST | `/uninstall` | W | DATABASE | CONSUMER_ZERO |
| POST | `/update` | W | DATABASE | CONSUMER_ZERO |
| POST | `/rollback` | W | DATABASE | CONSUMER_ZERO |
| POST | `/validate-remote` | W | FILESYSTEM_MANIFEST | CONSUMER_ZERO |
| POST | `/install-remote` | W | MIXED | CONSUMER_ZERO |

미조사 0.

### C. 조사 중 확인된 제3·제4 계약 (참고 — 본 WO 변경 대상 아님)

| API | Auth | 저장소 | Consumer |
|---|---|---|---|
| `GET /api/v1/apps/availability` | authenticate | DATABASE (`app_registry`) | ACTIVE_FRONTEND_CONSUMER (`useAppStatus.ts` 메뉴·라우트 게이팅) |
| `/api/v1/service/*` (service-provisioning) | **가드 없음** | STATIC/IN_MEMORY (`templateRegistry` + `AppStoreService`) | `ServiceTemplateSelector.tsx` (templates/preview/install) |

> `/api/v1/service/templates/:id/install` 은 라우터·앱 어디에도 `authenticate` 가 없다.
> production 에서 `templateRegistry` 가 0개(아래 §4)라 실제 설치 효과는 없지만,
> **비인증 write 경로**라는 점은 별도 WO 후보로 보고한다(본 WO 범위 밖이라 미수정).

---

## 2. Frontend / Runtime Consumer Census (§4)

검색어: `/api/v1/appstore`, `/api/v1/admin/apps`, `appstore`, `AppStoreService`, `ModuleLoader`, `app_registry`, `app_instances`.

- **`/api/v1/appstore` read**: 저장소 전체에서 호출 소비처 **0**. (문자열 hit 은 라우트 파일·테스트·문서뿐)
- **`/api/v1/appstore` write**: 호출 소비처 **0**.
- **`/api/v1/admin/apps` read**: admin-dashboard 4개 (`getMarketApps` / `getInstalledApps` / `getDisabledApps` / `getServiceGroupMeta` — 모두 `AppStorePage.tsx`).
- **`/api/v1/admin/apps` write**: 호출 소비처 **0** (WO-APPSTORE-UI-DEMOTION 으로 UI 가 read-only Module Explorer 로 강등된 뒤 write 버튼이 없다).
- **`AppStoreService`**: ACTIVE_INTERNAL_CONSUMER — `service-templates/service-installer.ts` 가 `isInstalled()` / `installApp()` 사용 → `POST /api/v1/service/templates/:id/install`.
- **`ModuleLoader`**: ACTIVE_INTERNAL_CONSUMER (`register-routes.ts` 부팅 시 loadAll/install/activate, `service-admin.routes.ts` read) — 단 production 효과는 §4 참조.
- `apps/main-site/src/appstore/*`: API 소비처 아님(프론트 로컬 registry 모듈), main-site 는 이미 폐기 트랙. NOT_A_CONSUMER.
- `.github/workflows/ci-appstore-guard.yml` + `.husky/pre-commit`: `packages/**/manifest.ts` · `appsCatalog.ts` 정합성 검사 — 카탈로그·manifest 대상이며 본 WO 변경 대상 아님.
- `AppGuard.tsx` / `appearance.routes.tsx` 의 `/admin/appstore`: **frontend 라우트 경로**이며 API `/api/v1/appstore` 와 무관.
- 테스트: `src/routes/__tests__/appstore-auth-boundary.test.ts`, `tests/multi-tenant/appstore.spec.ts`(APPS_CATALOG 순수 함수), `src/__tests__/service-admin-guard.spec.ts`.

---

## 3. 데이터 계약 비교 (§5)

| 항목 | `/appstore` | `/admin/apps` |
|---|---|---|
| 원천 | `APPS_CATALOG` (하드코딩 17개) + ModuleLoader in-memory `Map` | `app_registry` 테이블 (+ `app_instances`) |
| 영속 | 없음 (프로세스/리비전 재시작 시 소멸) | 있음 |
| install 의미 | manifest import → registry 등록 + lifecycle hook | manifest 검증 → DB row + CPT/ACF/permission 등록 |
| 상태값 | `not_installed` / `loaded` / `active` … | `installed` / `active` / `inactive` |
| scope | 프로세스 전역 | 플랫폼 전역 (serviceKey·organizationId 컬럼 없음) |
| 동기화 | **없음** | **없음** |

**production 실측 (read-only SELECT)**

- `app_registry` 6행 전부 `status='active'`: `annualfee-yaksa`, `digital-signage`, `digital-signage-core`, `membership-yaksa`, `partnerops`, `reporting-yaksa`
- `app_instances` **0행**
- `APPS_CATALOG` 17개 중 `app_registry` 와 겹치는 ID 는 `digital-signage-core`, `partnerops` **2개뿐**

→ **ID 체계가 서로 다르고(4/6 은 카탈로그에 없음), 상태 정의도 다르며, 동기화되지 않는다.**
실제로 production `GET /api/v1/appstore` 는 `partnerops`·`digital-signage-core` 를 `installed:false` /
`status:"not_installed"` 로 응답했다 — DB 정본(`active`)과 정면으로 모순되며,
카탈로그 고유 필드 `status`(AppStatus)까지 덮어써서 잘못된 값을 내보내고 있었다.

---

## 4. ModuleLoader production 판정 (§6)

판정: **MODULE_LOADER_BROKEN_IN_PRODUCTION** (설계상 dev 전용, 배포 이미지에서는 무효)

근거:
1. `scanWorkspace()` 는 `<workspaceRoot>/packages/**/manifest.ts` (**TypeScript 원본**) 를 glob 한다.
2. `apps/api-server/Dockerfile` 은 `dist/main.js`(esbuild 번들) 와 일부 job 파일만 COPY 한다. `packages/` 디렉터리가 이미지에 없다.
3. `workspaceRoot = path.resolve(__dirname,'../../../../')` 는 컨테이너에서 저장소 루트를 가리키지 않는다.
4. production 실측: `GET /api/v1/appstore` 전 17개가 `installed:false` — registry 가 비어 있음.
5. 같은 이유로 `templateRegistry`(`service-templates/templates/*.json` 도 이미지 미포함) 역시 production 에서 `total:0` (`GET /api/v1/service/stats` 실측).

본 WO 에서는 §6 지시대로 **ModuleLoader 복구를 위한 Docker/build 변경을 하지 않았다.**
반면 `/admin/apps` 의 `AppManager` 는 번들에 포함되는 `src/app-manifests/index.ts`(`loadLocalManifest`)를 쓰므로 production 에서 정상 동작한다.

---

## 5. install 의미 비교 (§7)

| 경로 | 판정 |
|---|---|
| `POST /api/v1/appstore/install` | **IN_MEMORY_ONLY** → production 에서는 manifest 를 찾지 못하므로 사실상 **NO_EFFECT** |
| `POST /api/v1/admin/apps/install` | **REAL_RUNTIME_INSTALL** (DB `app_registry` + ownership 검증 + CPT/ACF/permission 등록 + lifecycle hook) |

---

## 6. Canonical 결정 및 조치 (§8·§9·§10)

**판정 A — ADMIN_APPS_CANONICAL**

| 대상 | 판정 | 조치 |
|---|---|---|
| `POST /appstore/install` · `/activate` · `/deactivate` · `DELETE /uninstall` | RETIRE_ENDPOINT | 라우트 제거 (미등록 → 404) |
| `GET /appstore/modules` | RETIRE_ENDPOINT | 라우트 제거 |
| `GET /appstore/` · `/:appId` | KEEP_PUBLIC_READ | 유지. 단 ModuleLoader 파생 설치상태 필드(`installed`/`loadedAt`/`activatedAt`) 제거, 카탈로그 `status` 덮어쓰기 중단 |
| `/api/v1/admin/apps` 전체 | KEEP_CANONICAL | 변경 없음 |
| `GET /api/v1/apps/availability` | KEEP_CANONICAL(read 게이팅) | 변경 없음 |
| `AppStoreService` | KEEP (ACTIVE_INTERNAL) | `getAppDetails()` 만 제거(유일 소비처 소멸) |
| `ModuleLoader` | KEEP (부팅 경로 소비) | 변경 없음 |

retire 방식은 §12 지시대로 **404(라우트 미등록)** 를 택했다 — 소비처 0이므로 deprecated 응답보다 단순하다.

---

## 7. DB 영향 (§11)

- schema 변경 **없음**, migration **없음**, DB write **없음** (read-only SELECT 만 수행).
- `app_registry` 6행 / `app_instances` 0행 그대로 유지.

---

## 8. 테스트 (§13)

| 스펙 | 결과 |
|---|---|
| `src/routes/__tests__/appstore-auth-boundary.test.ts` (재작성) | 17 passed |
| `src/__tests__/service-admin-guard.spec.ts` | 39 passed (2 suites 합산 56) |
| `tests/multi-tenant/appstore.spec.ts` (vitest) | 24 passed |

재작성된 테스트는 제거된 endpoint 에 대해 **404 를 요구하고 401/403 을 강제하지 않는다** (legacy 동작 고정 방지).

`npx tsc --noEmit`: 본 WO 파일 관련 오류 0.
단, 저장소 전체에는 **다른 세션의 작업트리 변경(`packages/action-log-core` 삭제)** 으로 인한
`Cannot find module '@o4o/action-log-core'` 오류가 다수 존재한다. 본 변경과 무관하므로 손대지 않았다.

---

## 9. Production 검증 (§14)

- commit `0f5641a84` / Deploy API Server (Cloud Run) **success** / 리비전 교체 확인
- 검증 시각: 2026-08-21 (배포 직후)

---

## 10. 배포 후 결과

### 제거된 계약 (§12 — 404, deprecated 응답 아님)

| 요청 | 결과 |
|---|---|
| `POST /api/v1/appstore/install` | 404 |
| `POST /api/v1/appstore/activate` | 404 |
| `POST /api/v1/appstore/deactivate` | 404 |
| `DELETE /api/v1/appstore/uninstall` | 404 |
| `GET /api/v1/appstore/modules` | 404 |

401/403 이 아니라 404 이며, 비인증 상태에서도 write 가 도달할 라우트가 없다.

### 유지된 계약

| 요청 | 결과 |
|---|---|
| `GET /api/v1/appstore` (비인증) | 200 |
| `GET /api/v1/appstore/partnerops` (비인증) | 200, 상태 필드 없음(카탈로그 메타데이터만) |
| `GET /api/v1/appstore/no-such-app` (비인증) | 404 |
| `GET /api/v1/admin/apps` (비인증) | 401 |
| `GET /api/v1/admin/apps` (인증·super_admin 아님) | 403 |
| `GET /api/v1/apps/availability` (비인증) | 401 |
| `GET /api/v1/apps/availability` (인증) | 200 — active app **6개 전부 정상** (`membership-yaksa`, `annualfee-yaksa`, `reporting-yaksa`, `digital-signage`, `digital-signage-core`, `partnerops`) |
| `/health` | 200 |
| `/health/database` | `status: healthy` (pingMs 4) |

> `platform:super_admin` 자격증명이 `TEST-ACCOUNTS.local.md` 에 없어
> `/admin/apps` 의 **허용(200) 경로는 production 에서 검증하지 못했다.** 401/403 차단만 확인했다.
> §14 지시대로 production 에서 실제 install/uninstall write 는 수행하지 않았다.

### 회귀

- 배포 후 15분 Cloud Run **신규 ERROR 0 / 신규 5xx 0**.
  (배포 전 1시간 baseline 에는 `auth/login`·`glycopharm/*` 관련 5xx 가 존재했으며, 본 변경과 무관하고 배포 후 재현되지 않았다.)
- `app_registry` 6행 / `app_instances` 0행 — 배포 전후 동일. DB write 0.

---

## 11. 잔존 참조 분류 (§15)

| 참조 | 분류 |
|---|---|
| `routes/appstore.routes.ts` | PUBLIC_READ |
| `services/AppStoreService.ts` | ACTIVE_INTERNAL (service-installer) |
| `AppStoreError` | ACTIVE_INTERNAL (AppStoreService 내부 throw) |
| `modules/module-loader.ts` | ACTIVE_INTERNAL (부팅·service-admin read) |
| `app-manifests/appsCatalog.ts` | PUBLIC_READ + ACTIVE_INTERNAL |
| `routes/admin/apps.routes.ts` | CANONICAL |
| `routes/app-availability.routes.ts` | CANONICAL (read 게이팅) |
| `apps/main-site/src/appstore/*` | HISTORICAL (폐기 트랙, API 무관) |
| `.github/workflows/ci-appstore-guard.yml`, `.husky/pre-commit` | ACTIVE_INTERNAL (카탈로그 정합성 CI) |
| 테스트 3종 | TEST |

**DEAD_REFERENCE 0.**

---

## 12. 후속 후보 (본 WO 미수행)

1. `/api/v1/service/*` (service-provisioning) **비인증 write** — `POST /service/create`, `POST /service/templates/:id/install` 에 가드 없음. production 효과는 0이지만 경계 결함.
2. `/api/v1/admin/apps` write 9종 소비처 0 — UI 강등 이후 실제 관리 동선이 없다. 유지/재노출/축소 결정 필요.
3. ModuleLoader dev-only 구조 정리 — production 에서 항상 0 모듈을 로드하는 부팅 경로(`registerDomainRoutes` 1~4단계) 존치 여부.
4. `templateRegistry` / `initPackRegistry` 이미지 미포함 — `ServiceTemplateSelector` 화면이 production 에서 빈 목록.
5. `AppStoreService` 의 다수 미사용 public 메서드(카탈로그 래퍼) 정리.
