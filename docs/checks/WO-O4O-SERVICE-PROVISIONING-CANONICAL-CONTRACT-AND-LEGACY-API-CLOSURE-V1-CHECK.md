# WO-O4O-SERVICE-PROVISIONING-CANONICAL-CONTRACT-AND-LEGACY-API-CLOSURE-V1 — CHECK

- 작성일: 2026-08-25
- 대상: `/api/v1/service/*`(provisioning) 7개 + `/api/v1/service-admin/*` 8개 = **15개 endpoint**,
  그리고 그 뒤의 `service-templates/*` · `serviceInitializer` · `serviceInstaller` ·
  `themePresetService` · template/initpack linter · `AppStoreService`
- **최종 판정: `SERVICE_PROVISIONING_LEGACY_RETIRE` (전 축)**
- 처리: 두 라우터 mount 해제 + provisioning 계층 전체 제거 + admin-dashboard 소비 UI 제거.
  **DB schema 변경 0, migration 생성 0, production write 0.**
- 시작 기준 commit: `0dc6b6c6c`

---

## 1. 판정 요약 (§22)

| 축 | 판정 | 근거 |
|---|---|---|
| `/api/v1/service/*` (provisioning) | **LEGACY_RETIRE** | production template 0개 → 전 endpoint 무효, consumer 1개(항상 빈 화면) |
| `/api/v1/service-admin/*` | **LEGACY_RETIRE** | consumer **0**, 저장소 in-memory, template 의존 |
| `service-templates/*` | **RETIRE** | production 이미지에 JSON 미포함(설계상 미포함) |
| `serviceInitializer` | **RETIRE** | 8단계 write 전부 스텁 |
| `themePresetService` | **RETIRE** | `new Map()` — Cloud Run 재기동 시 소실 |
| `AppStoreService` | **RETIRE** | 유일 참조가 `service-installer.ts` 였음 → 고아 |
| App Store canonical (`app_registry`/`/admin/apps`/AppManager/availability) | **ACTIVE — 무변경** | provisioning 과 접점 0 |
| `ModuleLoader` | **ACTIVE_INTERNAL_OTHER_USE — 유지** | 부트 시 dynamic route mount · entity 수집에 사용 |

`ACTIVE` 0 / `BROKEN·NO_EFFECT` 15 / `UNKNOWN` **0** / `DEAD_REFERENCE` **0**.

---

## 2. Endpoint 전수 census (§3)

두 라우터 모두 라우터 수준 `authenticate` + `requireAdmin`(platform:super_admin) 아래였다
(경계 자체는 선행 WO 로 이미 정상 — `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1`,
`WO-O4O-SERVICE-API-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1`).

### 2-1. `/api/v1/service/*` (`service-provisioning.routes.ts`)

| Method | Path | 의존 | Consumer | production 실효 | 분류 |
|---|---|---|---|---|---|
| GET | `/templates` | `templateRegistry` | `ServiceTemplateSelector` | 항상 `[]` | **BROKEN** |
| GET | `/templates/:id` | `templateRegistry` | CONSUMER_ZERO | 항상 404 | **BROKEN** |
| GET | `/templates/:id/preview` | `templateRegistry`+`serviceInstaller` | `ServiceTemplateSelector` | 항상 404 | **BROKEN** |
| POST | `/templates/:id/install` | `serviceInstaller` | `ServiceTemplateSelector` | 항상 404 | **BROKEN** |
| GET | `/templates/recommend/:serviceGroup` | `templateRegistry` | CONSUMER_ZERO | 항상 `[]` | **BROKEN** |
| POST | `/create` | `serviceInstaller`+`serviceInitializer` | CONSUMER_ZERO | 항상 404 | **BROKEN** |
| GET | `/stats` | `templateRegistry` | CONSUMER_ZERO | 항상 0 | **BROKEN** |

### 2-2. `/api/v1/service-admin/*` (`service-admin.routes.ts`)

| Method | Path | 의존 | Consumer | production 실효 | 분류 |
|---|---|---|---|---|---|
| GET | `/summary` | `moduleLoader`(in-memory) | **0** | — | **NO_EFFECT** |
| GET | `/apps` | `moduleLoader`(in-memory) | **0** | — | **NO_EFFECT** |
| GET | `/theme` | `themePresetService`(Map) | **0** | — | **NO_EFFECT** |
| PUT | `/theme` | `themePresetService`(Map) | **0** | 재기동 시 소실 | **NO_EFFECT** |
| POST | `/theme/reset` | `themePresetService`(Map) | **0** | 재기동 시 소실 | **NO_EFFECT** |
| GET | `/init-preview/:templateId` | `serviceInitializer`(read-only) | **0** | template 0 → 404 | **BROKEN** |
| GET | `/templates` | `templateRegistry` | **0** | 항상 `[]` | **BROKEN** |
| GET | `/stats` | `templateRegistry` | **0** | 항상 0 | **BROKEN** |

> WO 가 전제했던 "`/service-admin` 이 canonical" 은 **사실이 아니었다**.
> frontend · packages · scripts 전수 검색에서 `/service-admin/` 호출 **0건**.

---

## 3. Production 실측 (§5, §12)

`o4o-core-api` (Cloud Run, project `netureyoutube`) 부트 로그 — **전 revision 공통**:

```
[TemplateRegistry] Templates directory not found: /app/dist/templates
✅ Service Templates loaded: 0 templates
[InitPackRegistry] Init packs directory not found: /app/dist/init-packs
✅ Init Packs loaded: 0 packs
```

원인: Dockerfile 은 `dist/main.js` 번들 · `dist/migrate.js` · drug job 번들 · `dist/database`
· `src/assets` · `mail-templates` 만 COPY 한다. `service-templates/{templates,init-packs}/*.json`
은 **이미지에 들어간 적이 없다**. tsup ESM 단일 번들의 `__dirname` 은 `/app/dist` 이므로
loader 가 읽을 디렉터리 자체가 존재하지 않는다.

- dev 저장소: template 6개 + init pack 3개 → production: **0 / 0**
- 30일 Cloud Run HTTP 로그: `/api/v1/service/*` · `/api/v1/service-admin/*` 호출은
  **전부 선행 WO 의 smoke 트래픽**. 유기 트래픽 **0**.

### §12 판단

production 이미지에 template JSON 이 없음이 확정됐으나 **Dockerfile COPY 를 추가하지 않았다.**
COPY 를 추가해도 그 뒤 단계(`serviceInitializer`)가 전부 스텁이라 여전히 아무것도 생성되지 않는다.
즉 "살릴 것인가" 의 답이 **아니오** 였고, 사용자 확인 결과도 전 축 retire 였다.

---

## 4. Write 경로 실효성 (§6)

`serviceInitializer.initializeService()` 8단계 전수:

| 단계 | 구현 | 상태 |
|---|---|---|
| categories / posts / pages / menus / settings / roles / widgets / media | `// TODO: Integrate with ...` + `logger.debug` | **STUB / NO_EFFECT** |

생성 개수를 반환하지만 **어떤 테이블에도 쓰지 않는다**(반환값은 조작된 수치).
`getInitializationPreview()` 만 실제 구현(read-only)이며, 유일한 소비처가 consumer 0 인
`/service-admin/init-preview` 였다.

`serviceInstaller.installAppsInOrder()` → `appStoreService.installApp(appId)` (dataSource 없음)
→ `moduleLoader.installModule()` = **in-memory registry 만** 변경. App Store 정본
`app_registry` 테이블에는 쓰지 않는다.

`themePresetService` = `new Map()` (`"would be DB in production"` 주석). Cloud Run 인스턴스
재기동 시 즉시 소실.

→ §21 대로 **production 에서 destructive provisioning write 를 수행하지 않았다.**
(그리고 수행할 필요도 없었다 — write 경로 자체가 무효였다.)

---

## 5. Consumer 조사 (§7)

| 소비처 | 식별자 | 경로/href | 대상 파일 | 상태 |
|---|---|---|---|---|
| AppStorePage `서비스 템플릿` 탭 | `activeTab === 'templates'` | `/admin/apps` 내부 탭 | `pages/apps/AppStorePage.tsx` | **제거** |
| 템플릿 목록 | `adminAppsApi.getTemplates` | `GET /service/templates` | `api/admin-apps.ts` | **제거** |
| 설치 미리보기 | `getInstallationPreview` | `GET /service/templates/:id/preview` | `api/admin-apps.ts` | **제거** |
| 템플릿 설치 | `installTemplate` | `POST /service/templates/:id/install` | `api/admin-apps.ts` | **제거** |
| 템플릿 상세 / 서비스 생성 / 추천 / 통계 | `getTemplate`·`provisionService`·`getRecommendedTemplates`·`getTemplateStats` | — | `api/admin-apps.ts` | **CONSUMER_ZERO → 제거** |
| `/service-admin/*` | — | — | — | **소비처 0** |

`ServiceTemplateSelector` 의 일괄 설치 버튼은 `WO-APPSTORE-UI-DEMOTION` 의
**AppStore UI READ-ONLY 계약과 정면 충돌**하고 있었다. 제거로 계약 정합이 회복된다.

---

## 6. App Store canonical 축 무손상 (§14)

| 대상 | 조치 |
|---|---|
| `app_registry` 테이블 / migration | **무변경** |
| `app-registry.service` | **무변경** |
| `/api/v1/appstore`, `/api/v1/admin/apps`, `/api/v1/apps/availability` | **mount 유지** |
| AppManager UI | **무변경** |
| `moduleLoader.loadAll()` 부트 호출 | **유지** (dynamic route · entity 등록에 필요) |

provisioning 과 App Store 정본은 접점이 없었다(provisioning 은 in-memory registry 만 건드렸다).
`service-provisioning-retirement.spec.ts` 가 위 4개 항목을 **회귀 단언**으로 고정한다.

---

## 7. Router prefix 간섭 (§15)

mount 상태에서는 인증 없는 `/api/v1/service/<임의경로>` 요청이 **401** 을 반환했다
(라우터 수준 `authenticate` 가 라우트 매칭보다 먼저 실행되기 때문).
mount 해제 후에는 전역 404 로 떨어진다 — 즉 retire 는 `/api/v1/service/monitor/*`
(선행 WO 에서 이미 제거)를 포함해 **404 표면을 정직하게 만든다**.

---

## 8. 제거 목록

**backend (api-server)**

- `routes/service-provisioning.routes.ts`, `routes/service-admin.routes.ts`
- `service-templates/` 전체 (ts 9 + `templates/*.json` 6 + `init-packs/*.json` 3)
- `validators/template-linter.ts`, `validators/initpack-linter.ts`
- `services/theme-preset.service.ts`
- `services/AppStoreService.ts` (유일 참조 `service-installer.ts` 제거로 고아화)
- `__tests__/service-provisioning-guard.spec.ts`, `__tests__/service-admin-guard.spec.ts`
  (제거된 라우터의 guard 테스트 → 재등록 방지 계약으로 대체)
- `bootstrap/register-routes.ts`: import 4개 + `templateRegistry.loadAll()` ·
  `initPackRegistry.loadAll()` · `app.use` 2개 제거, retire 사유 주석 유지

**frontend (admin-dashboard)**

- `components/apps/ServiceTemplateSelector.tsx`
- `api/admin-apps.ts`: Service Template 타입 5개 + `TemplateCategory` + 메서드 7개
- `pages/apps/AppStorePage.tsx`: `templates` 탭 · 탭 버튼 · 조건부 렌더 가드

합계 **27개 파일 · 7,645 라인 삭제**(staged 삭제 기준).

---

## 9. DB / migration

**변경 0.** `sites` 때와 달리 provisioning 은 애초에 테이블을 쓰지 않았다
(전 단계 스텁 + in-memory). migration 생성·삭제 없음, production DB 접근은 read-only 확인뿐.

---

## 10. 검증 (§20)

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | **0 errors** |
| api-server `npm run build` | **성공** |
| admin-dashboard `tsc --noEmit` | **0 errors** |
| admin-dashboard `npm run build` | **성공** (`built in 1m 56s`) |
| `service-provisioning-retirement.spec.ts` (신규) | **23 passed** |
| `service-monitor-retirement.spec.ts` (형제 단언 반전) | **passed** |
| `admin-api-guard-inventory.spec.ts` (인벤토리 부재 단언) | **passed** |
| repo 전역 `AppStoreService` 참조 | **0** (문서 주석 1건 제외) |

### 재등록 방지 계약

`apps/api-server/src/__tests__/service-provisioning-retirement.spec.ts` 가
① 삭제 파일 부재 ② mount·import 부재 ③ retire 사유 주석 존재
④ admin-dashboard raw-source 에 `/service/templates`·`/service/create`·`/service/stats`·
`/service-admin/`·`ServiceTemplateSelector` 참조 0 ⑤ App Store canonical mount 유지
를 단언한다. DB·네트워크 접근 0.

`service-monitor-retirement.spec.ts` 는 선행 WO 가 "형제 라우터는 유지" 라고 단언했던 블록을
"형제 라우터도 후속 WO 에서 retire 됐다" 로 뒤집고, 뒤집은 이유를 주석으로 남겼다.

---

## 11. Production 검증 (§21) — 배포 후 실측

- 배포 commit `23fdb013e` / Cloud Run revision **`o4o-core-api-03457-jbh`** (2026-08-25 05:30 UTC)

| 경로 | retire 전 | retire 후 | 판정 |
|---|---|---|---|
| `GET /api/v1/service/templates` | 401 | **404** `Cannot GET` | mount 해제 확인 |
| `GET /api/v1/service/templates/:id` | 401 | **404** | 〃 |
| `POST /api/v1/service/create` | 401 | **404** | 〃 |
| `GET /api/v1/service/stats` | 401 | **404** | 〃 |
| `GET /api/v1/service-admin/summary` | 401 | **404** | 〃 |
| `GET /api/v1/service-admin/theme` | 401 | **404** | 〃 |
| `GET /api/v1/service-admin/templates` | 401 | **404** | 〃 |
| `GET /api/v1/service-admin/stats` | 401 | **404** | 〃 |

> retire 전 401 은 §7 대로 라우터 수준 `authenticate` 가 라우트 매칭보다 먼저
> 실행됐기 때문이다. 이제 전역 404 로 정직하게 떨어진다.

**canonical 축 정상 (§14)**

| 경로 | 결과 |
|---|---|
| `GET /health` | **200** |
| `GET /health/database` | **200** `status: healthy`, PostgreSQL 15.17, pingMs 3, longRunningQueries 0 |
| `GET /api/v1/appstore` | **200** |
| `GET /api/v1/apps/availability` | **401**(무인증 — 정상 guard) |
| `GET /api/v1/admin/apps` | **401**(무인증 — 정상 guard) |

**로그**

- 배포 후 20분 구간 `severity>=ERROR` / `httpRequest.status>=500`: **0건**
- `[TemplateRegistry] Templates directory not found` · `[InitPackRegistry] ...`
  부트 경고: **소멸**(loader 자체가 제거돼 더 이상 출력되지 않는다)

**CI**: Deploy API Server ✅ / Deploy Admin Dashboard ✅ / CodeQL ✅

---

## 12. 한계

인증 토큰이 필요한 production 호출은 이 세션에서 수행할 수 없었다(자격 증명 전송 차단).
따라서 super_admin 인증 상태의 endpoint 응답 본문 실측 대신 **Cloud Run 부트 로그 ·
소스 계약 · 무인증 상태 코드 프로브**로 판정했다. 판정의 결정적 근거(template 0개,
write 단계 전부 스텁, consumer 0)는 모두 인증과 무관하게 확정된 사실이다.

---

## 13. 후속 후보 (범위 밖)

1. `modules/sites/site.entity.ts` · `database/entities.ts` 의 `sites` 잔재 (선행 WO 에서 이월)
2. `docs/` 내 Phase 7/8 service template 서술 — 본 CHECK 로 대체 서술 필요
3. `packages/*` 의 `ServiceGroup` 타입은 App Store 축에서 계속 쓰이므로 **유지**
