# WO-O4O-PUBLIC-APPSTORE-READ-CONTRACT-CENSUS-AND-DISPOSITION-V1 — CHECK

공개 상태로 남아 있던 App Store read API 2종의 실제 제품 계약·소비처·외부 사용 여부를
전수조사하고 최종 처분을 확정한 기록.

- 기준 branch: `main`
- 착수 기준 commit: `fb49dabf2` (worktree clean, foreign WIP 0)
- **최종 판정: `RETIRE_CONFIRMED`** (판정 코드 `PUBLIC_APPSTORE_READ_RETIRE`)
- DB schema change 0 / migration 0 / production DB write 0

---

## 1. Endpoint 현재 계약 (§3)

| Method | Path | Data Source | Auth | Response | Error |
|---|---|---|---|---|---|
| GET | `/api/v1/appstore` | `APPS_CATALOG` (정적 배열) | **없음 (익명 공개)** | `{success, data[], total, categories[]}` | 500 only |
| GET | `/api/v1/appstore/:appId` | `getCatalogItem()` | **없음 (익명 공개)** | `{success, data}` | 404 / 500 |

- `APPS_CATALOG` 직접 read: **예**
- runtime/DB 상태 혼입: **없음** — 선행 `WO-O4O-APPSTORE-DUAL-CONTRACT-CENSUS-AND-CANONICALIZATION-V1`
  에서 `installed`/`status`/`loadedAt` 등 ModuleLoader 파생 상태 필드가 이미 제거됨
- retired/nonexistent app 처리: 카탈로그에 없으면 404
- cache: **없음** (매 요청 in-memory 배열 투영)
- CORS/public 접근성: 익명 curl 로 200 확인

**판정: `PURE_CATALOG_READ`**

---

## 2. Code Consumer Census (§4)

`/api/v1/appstore` 문자열을 **호출**하는 코드: **0건**.

| Hit | 분류 |
|---|---|
| `routes/appstore.routes.ts` | 대상 자신 |
| `bootstrap/register-routes.ts` (import·mount·log) | 대상 자신의 mount |
| `routes/__tests__/appstore-auth-boundary.test.ts` | `ACTIVE_TEST` (대상 자신의 테스트) |
| `__tests__/app-management-runtime-residue-retirement.spec.ts:173` | `ACTIVE_TEST` (mount 유지 단언) |
| `__tests__/service-provisioning-retirement.spec.ts:166` | `ACTIVE_TEST` (mount 유지 단언) |
| `__tests__/app-instances-retirement.spec.ts:56` | `ACTIVE_TEST` (파일 존재 단언) |
| `docs/baseline/core-boundary.md:19` | `DOC_ONLY` (내부 baseline, 실제와 drift) |
| admin-dashboard `/admin/appstore*` | **오탐** — frontend 라우트 경로이지 API 경로가 아님 |
| `.github/workflows/ci-appstore-guard.yml`, `scripts/appstore-guard.ts` | `CI_GUARD` — **`appsCatalog.ts` 파일**을 파싱, HTTP API 무관 |
| `apps/api-server/tests/multi-tenant/appstore.spec.ts` | `ACTIVE_TEST` — **`APPS_CATALOG` 모듈 직접 import**, HTTP API 무관 |
| `apps/main-site/**/appstore/*` | `DEAD_UI` — 별도 client-side registry, 아래 §4 참조 |

→ **HTTP API 의 code consumer = 0**

## 3. Literal / Raw-source Consumer Census (§5)

`readFileSync` 계열 raw-source guard 중 appstore 를 단언하는 파일:

| 파일 | 단언 | 처리 |
|---|---|---|
| `__tests__/app-instances-retirement.spec.ts:56` | `existsSync(routes/appstore.routes.ts) === true` | **반전**(`false`) |
| `__tests__/app-management-runtime-residue-retirement.spec.ts` | `app.use('/api/v1/appstore', appstoreRoutes)` 존재 | **반전**(재등록 금지) |
| `__tests__/service-provisioning-retirement.spec.ts` | 동일 | **반전**(재등록 금지) |
| `scripts/appstore-guard.ts` | `appsCatalog.ts` 파일 파싱 | **무관** — 유지 |

→ raw-source consumer는 전부 **자기 계약 guard**이며 외부 소비가 아니다.

## 4. Frontend 실제 사용 여부 (§6)

| 화면 | 판정 | 근거 |
|---|---|---|
| admin-dashboard `AppStorePage` | **`READ_ONLY_OTHER_API`** | `adminAppsApi.getMarketApps/getInstalledApps/getServiceGroupMeta/getDisabledApps` 만 호출 — 전부 `/admin/apps/*`. `/api/v1/appstore` 호출 0 |
| main-site `appStoreManager` + `AppList` | **`UNROUTED_UI` / `DEAD_UI`** | client-side `@/appstore/registry` 를 읽고, install/uninstall/toggle 핸들러가 전부 `alert('will be implemented soon')` 스텁. 레지스트리가 가리키는 `@o4o-apps/commerce·customer·admin` 패키지는 존재하지 않으며(`packages/@o4o-apps/` 에는 content-app·learning-app·signage 만 있음), `views/appstore.json` 은 어디서도 라우팅되지 않는다. HTTP API 호출 0 |

→ **`/api/v1/appstore` 의 frontend consumer = 0** (`NO_UI`)

## 5. External / Partner Contract (§7)

| 확인 대상 | 결과 |
|---|---|
| Swagger (`config/swagger-enhanced.ts`, `swagger/swagger.config.ts`) | appstore 경로 등재 **0건** |
| OpenAPI (`docs/services/cosmetics/openapi.yaml`, 템플릿, 생성기) | 등재 **0건** |
| `packages/api-types` (SDK 타입) | 등재 **0건** |
| partner docs / public developer docs / README / integration examples | **0건** |
| `docs/**/*.md` 의 `/api/v1/appstore` 문자열 | 내부 CHECK/WO 문서와 `docs/baseline/core-boundary.md` 뿐 |

**판정: `NO_EXTERNAL_CONTRACT`**

## 6. Production Traffic 실측 (§8)

로그 버킷 `_Default` 보존기간은 **30일**이며, 서비스의 가장 오래된 `httpRequest` 는
`2026-07-27T00:36:17Z` 다. 따라서 **관측 가능 창 = 2026-07-27 ~ 2026-08-26 (30일)** 이고
그 이전은 보존 정책상 조회 불가다. 창 전체 결과:

| 항목 | 값 |
|---|---|
| 총 요청 | **65건** |
| User-Agent | `curl/8.12.1` 61건, `curl/8.11.0` 4건 — **브라우저 UA 0** |
| 고유 IP | 2개 (`124.194.156.36`, `112.153.205.95`) |
| 날짜 분포 | 2026-08-04 1건 / 2026-08-21 59건 / 2026-08-25 5건 |
| 분류 | **전부 `WO_VERIFICATION`** (선행 WO smoke + 본 WO census 프로브) |
| `ORGANIC_USER` | **0** |
| `INTERNAL_TOOL` / `BOT` / `UNKNOWN_TRAFFIC` | **0** |

## 7. Public Product 의미 (§9)

| 질문 | 답 |
|---|---|
| 소비자가 앱 목록을 볼 제품 요구가 있는가? | **없음** — 어떤 서비스 web 에도 앱 카탈로그 화면이 없다 |
| 매장 경영자가 App Store 에서 앱을 선택하는가? | **아니오** — 앱 활성은 서버 배포 시 결정되며, AppStore 화면 자체가 `WO-APPSTORE-UI-DEMOTION` 이후 READ-ONLY 이고 그마저 `/admin/apps` 를 쓴다 |
| read-only UI 라도 catalog API 가 미래 UX 정본인가? | **아니다** — 정본은 `appsCatalog.ts` 모듈이고, 화면이 생긴다면 인증된 `/admin/apps/market` 이 이미 같은 데이터를 준다 |
| 외부 개발자가 쓰는 API 인가? | **아니오** — §5 참조 |

→ “향후 쓸 수 있음” 외의 KEEP 근거 **없음**.

## 8. APPS_CATALOG 와의 관계 (§10)

```text
APPS_CATALOG 유지 여부  ≠  Public HTTP API 유지 여부
```

`APPS_CATALOG` 는 App 정의 metadata canonical 로 **유지**한다. 소비처가 실재한다:

- `routes/admin/apps.routes.ts` (market · service-group · compatibility read)
- `services/app-manager/app-manager.registry.ts` (`getCatalogItem`)
- `tests/multi-tenant/appstore.spec.ts` · `setup.ts` (모듈 직접 import, 24 tests)
- `scripts/appstore-guard.ts` (CI, 파일 파싱)

→ public HTTP surface 만 닫고 catalog 는 그대로 둔다.

## 9. 다른 canonical read 와 비교 (§11)

| 비교 | 결과 |
|---|---|
| `GET /api/v1/appstore` vs `GET /api/v1/admin/apps/market` | `/market` 은 `res.json({ apps: APPS_CATALOG })` — **동일 데이터 전량**. `/appstore` 의 추가분은 서버측 `search`/`category` 필터와 `categories[]` 뿐이며 클라이언트에서 파생 가능 |
| `GET /api/v1/appstore/:appId` | `/market` 응답의 **부분집합**. (`/admin/apps/:appId` 는 `app_registry` 상태를 주는 다른 의미) |

**판정: `DUPLICATE_READ`** (상세는 `SUBSET`) — unique public read 없음.

## 10. Security / Exposure (§12)

익명 응답 실측 노출 필드:

```text
appId, name, version, description, category, tags, type, author,
serviceGroups, dependencies, status
```

- `status` 값에 **`experimental`** 포함 → 미출시 앱 상태가 익명 노출
- `dependencies` 9개 앱에서 **내부 앱 의존 그래프** 노출
- `appId` 17개 + `serviceGroups` → **플랫폼 모듈 topology 전체**가 무인증 공개

자격증명 유출은 아니지만 제품 가치 없는 내부 기술 metadata 다.

**판정: `OVEREXPOSED_INTERNAL_METADATA` (경미)**

## 11. 최종 판정 (§13)

`RETIRE_CONFIRMED` 조건 전수 충족:

| 조건 | 결과 |
|---|---|
| frontend consumer 0 | ✅ |
| internal runtime consumer 0 | ✅ |
| external contract 0 | ✅ |
| organic production traffic 0 | ✅ (30일 관측창 전체) |
| unique product function 0 | ✅ (`/admin/apps/market` 과 DUPLICATE_READ) |
| APPS_CATALOG 별도 유지 가능 | ✅ |
| UNKNOWN 0 | ✅ |

§20 중지 조건 **전 항목 미해당**.

---

## 12. 변경 목록 (§14 최소 범위)

### 삭제 (2)

```
apps/api-server/src/routes/appstore.routes.ts
apps/api-server/src/routes/__tests__/appstore-auth-boundary.test.ts   (대상 소멸)
```

### 수정 (6)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/bootstrap/register-routes.ts` | `appstoreRoutes` import · mount · 로그 제거, `PUBLIC_APPSTORE_READ_RETIRE` 근거 주석 삽입 |
| `apps/api-server/src/app-manifests/appsCatalog.ts` | `searchCatalog()` · `filterByCategory()` · `getCategories()` 제거 — 세 함수 모두 소비처가 `appstore.routes.ts` 단독이었다. **`APPS_CATALOG` 17개 항목과 serviceGroup 계열 helper 는 무변경** |
| `apps/api-server/src/__tests__/app-instances-retirement.spec.ts` | `appstore.routes.ts` 존재 단언 → 부재 단언으로 반전 |
| `apps/api-server/src/__tests__/app-management-runtime-residue-retirement.spec.ts` | appstore mount 유지 단언 제거 + 재등록 금지 단언 추가 |
| `apps/api-server/src/__tests__/service-provisioning-retirement.spec.ts` | 동일 |
| `docs/baseline/core-boundary.md` | Core 도메인 표의 `App Registry` 행을 실제 canonical(`/api/v1/admin/apps/*`, `/api/v1/apps/availability`)로 정정 + 경위 주석 |

### 신규 (1)

- `apps/api-server/src/__tests__/public-appstore-read-retirement.spec.ts`

### 제거하지 않은 것

```text
APPS_CATALOG (17개 항목)
packages/**/manifest.ts
app_registry 테이블
/api/v1/admin/apps
/api/v1/apps/availability
```

## 13. Route Prefix 간섭 확인 (§15)

production 실측으로 미등록 prefix 의 최종 상태를 확인했다:

| 경로 | 응답 | 의미 |
|---|---|---|
| `/api/v1/nonexistent-xyz` | **404** | 미등록 prefix 는 404 로 떨어진다 |
| `/api/v1/appstore-nope` | **404** | 접두 유사 경로도 404 |
| `/api/v1/apps` | 401 | router-level `authenticate` (별개 축, 정상) |

→ `/api/v1/appstore` 제거 후 기대 상태는 **404** 이며, 401/403 으로 가려지는 간섭 경로는 없다.

## 14. 테스트 / 빌드 (§16·§17)

- `apps/api-server` typecheck: **PASS**
- `apps/api-server` build (`tsc -p tsconfig.build.json`): **PASS**
- jest 전체: **193 suites / 3224 tests PASS**
- multi-tenant vitest `appstore.spec.ts`: **24 tests PASS** (APPS_CATALOG 회귀 0)
- CI AppStore Guard 로컬 실행: **PASSED** (15/15 앱 카탈로그 정합)
- frontend runtime 코드 변경 0 → admin-dashboard build 생략(§17 허용)

신규 guard 가 고정하는 계약:

- `appstore.routes.ts` · `appstore-auth-boundary.test.ts` 부활 금지
- `register-routes.ts` 의 appstore import·mount 0, `PUBLIC_APPSTORE_READ_RETIRE` 주석 존속
- `searchCatalog` / `filterByCategory` / `getCategories` export 부활 금지
- `APPS_CATALOG` 17개 유지 + `filterByServiceGroup` · `getCatalogItem` ·
  `getAppsForServiceGroupWithDependencies` 유지 + 소비처 5곳 존속
- `/api/v1/apps` · `/api/v1/admin/apps` mount 유지, `/admin/apps/market` 유지
- `apps` · `packages` · `services` · `scripts` 전체에서 `/api/v1/appstore` 호출 0,
  `appstore.routes` import 0, 은퇴 helper 참조 0

## 15. DEAD_REFERENCE / UNKNOWN

- DEAD_REFERENCE: **0** (신규 guard 가 저장소 전 범위 스캔으로 고정)
- UNKNOWN: **0**

## 16. 후속 후보

1. **main-site 의 병렬 App Store 축** — `apps/main-site/src/appstore/*`,
   `components/ui/appstore/*`, `shortcodes/_functions/appstore/appStoreManager.ts`,
   `views/appstore.json`. 존재하지 않는 `@o4o-apps/commerce·customer·admin` 을 참조하고
   핸들러가 전부 `alert()` 스텁이며 라우팅 진입점이 없다. 별도 WO 로 census 권장.
2. `app_registry` STALE_ROW 2건(`annualfee-yaksa`, `reporting-yaksa`) — production DELETE 는
   사용자 승인 필요 (선행 WO 에서 이월).
3. `apps` 테이블 / `app-registry.service.ts` 이름 충돌 해소(rename) 검토.
