# IR-O4O-UNIFIED-STORE-WORKSPACE-SUBDOMAIN-AND-CROSSSERVICE-ROUTING-V1

> **종류**: 조사 전용(IR) · **조사 기준**: `origin/main` `237ffd3df6f` · **저장소 등재**: 2026-09-21(팀장 제공 IR 원문 §0~§38 을 그대로 등재 · 등재 시 핵심 주장을 `b4b0f70f8` 기준 코드로 재확인 — §0-A) · **구현 없음**
> **후속 WO**: [`WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1`](../work-orders/WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1.md)(WO A) → WO B Cross-Service Capability Adoption → WO C Domain Cutover & Legacy Closure
> **관련 정본**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)(1 Store : N Services) · [`STORE-LAYER-ARCHITECTURE`](../architecture/STORE-LAYER-ARCHITECTURE.md)(F3) · [`O4O-BOUNDARY-POLICY-V1`](../architecture/O4O-BOUNDARY-POLICY-V1.md)(Store Ops = organizationId)

## 0-A. 등재 시 코드 재확인 (2026-09-21 · `b4b0f70f8`)

| IR 주장 | 확인 | 근거 |
|---|---|---|
| `GET /api/v1/work-scope/store-services` 는 service-neutral · `resolveStoreServices` · 2개 이상이면 `MULTIPLE_ACCESSIBLE_STORES` | ✔ | `routes/work-scope.routes.ts` L7·L68 · `utils/service-tenant.resolver.ts` · `utils/work-scope-store-resolution.ts` |
| 서비스 handoff 는 `targetServiceKey` + target `service_memberships.status='active'` 검증 후 Service Catalog domain 으로 이동 | ✔ | `modules/auth/controllers/handoff.controller.ts` L55~L151 |
| `handoff_tokens.target_service_key varchar(64) NOT NULL` — **workspace handoff 가 이 테이블을 그대로 쓰면 가짜 serviceKey 가 되고, 컬럼을 늘리면 DDL** | ✔ (IR 본문 미언급 · WO A 결정 항목) | `database/migrations/20270311000000-CreateHandoffTokens.ts` L29 |
| API CORS prod origins 에 `store.neture.co.kr` 없음 · wildcard 없음 · `CORS_ORIGIN` env 로 추가 가능 | ✔ | `bootstrap/setup-middlewares.ts` `getAllowedOrigins()` |
| Neture `storeWorkspaceEnabled=false` · KPA/KCos/PH `true` | ✔ | `config/service-catalog.ts` L95·L104·L113·L133 |
| Store route owner = 3 서비스 web app · `MyServicesView` 는 `store-ui-core/workspace` | ✔ | `services/web-{kpa-society,k-cosmetics,pharmacy-hub}/src/App.tsx` · `packages/store-ui-core/src/workspace/MyServicesView.tsx` |
| 웹 앱 배포 명명 `{serviceKey}-web` · `deploy-web-services.yml` 의 detect-changes 경로 매핑 | ✔ — 새 앱 추가 = CI/Docker 변경 = **중지 조건(사용자 승인 항목)** | `.github/workflows/deploy-web-services.yml` L21·L30·L70 |

---

## 0. 조사 목적

기존 구조:

```text
KPA          → kpa-society.co.kr/store/*
K-Cosmetics → k-cosmetics.site/store/*
PharmacyHub → pharmacyhub.co.kr/store-owner/*
```

를 다음으로 전환할 수 있는지 조사한다.

```text
store.neture.co.kr
        ↓
   하나의 내 매장
        ↓
하나의 매장(organization)이
이용 중인 여러 O4O 서비스를
한 Workspace에서 관리
```

중요:

```text
Store = 새로운 서비스가 아님
Store = O4O 공통 Workspace
```

따라서 신규 `serviceKey='store'` · store membership · store role 은 만들지 않는다.

## 1. 조사 결론 — 판정: FEASIBLE

현재 저장구조는 이미 `1 Store : N Services` 를 표현한다.

```text
organizations → organization_service_enrollments → KPA Society / K-Cosmetics / PharmacyHub / ...
```

`organization_service_enrollments` 는 `UNIQUE(organization_id, service_code)` 이고, 기존 `resolveStoreServices()` 가 한 organization 의 여러 서비스 enrollment 를 읽어낸다. **신규 Store-Service junction 은 필요 없다.**

## 2. 기존 코드에 이미 존재하는 핵심 기반

`MyStoreShell` · `StoreDashboardLayout` · `StoreWorkspaceNav` · `MyServicesView` · `StoreWorkspaceHomeView` · `StoreHubShell` · `store-ui-core` · `store-core` · `asset-copy-core`. 특히 `GET /api/v1/work-scope/store-services` 는 이미 service-neutral API 로, 현재 사용자의 Store organization 확인 후 `organizationId + 그 organization 의 service enrollments` 를 반환한다. 통합 Store Workspace 의 **데이터 기반 자체는 상당 부분 이미 구현되어 있다.**

## 3. 현재 구조에서 잘못된 계층

```text
서비스 → 서비스의 내 매장 → 내 서비스 → 다른 서비스 내 매장으로 handoff
```

`MyServicesView` 도 현재 서비스 = 내부 Link, 다른 서비스 = `/auth/handoff` → 해당 서비스의 `/store` 또는 `/store-owner`. 기존 설계에서는 맞았지만 통합 Store Workspace 기준에서는 뒤집혀야 한다.

## 4. 목표 계층

```text
사용자 → 내 매장 organization 선택 → store.neture.co.kr → Unified Store Workspace → 이 매장이 이용하는 서비스들
```

**최상위 Context = `organizationId`.** `serviceKey` 는 필요한 기능에서만 2차 Context.

## 5. Canonical Domain

권장 canonical `https://store.neture.co.kr` · 화면명 `내 매장`. (`mystore.neture.co.kr` 도 가능하지만 `store.` 가 짧고 다른 workspace 이름과 맞는다.)

## 6. Store 는 Neture 서비스가 아니다

도메인이 `store.neture.co.kr` 이라고 `serviceKey=neture` 가 되지 않는다. Neture 는 `storeWorkspaceEnabled=false` 의 공급자/O4O 대표 진입 서비스.

```text
neture.co.kr        = O4O 대표 Home
store.neture.co.kr  = O4O 공통 Store Workspace
```

## 7. 현재 Service Catalog 의 domain 은 유지

`kpa-society → kpa-society.co.kr` · `k-cosmetics → k-cosmetics.site` · `pharmacy-hub → pharmacyhub.co.kr` 는 서비스 Identity domain. 이를 `store.neture.co.kr` 로 바꾸면 안 된다. Store Workspace origin 은 Service Identity 와 별도 축 — Service Catalog(서비스 Identity) / Workspace Catalog 또는 플랫폼 workspace config(`store.neture.co.kr`) 로 분리.

## 8. 가장 중요한 기존 자산: `resolveStoreServices`

```text
사용자가 접근 가능한 organization 조사 → organizationId 지정 시 소유 검증
→ 미지정+1개 = resolved / 미지정+2개 이상 = ambiguous → organization_service_enrollments 조회 → 서비스 목록
```

Unified Store 에서 필요한 핵심 resolver 를 새로 만들 필요가 거의 없다.

## 9. Multi-Store 사용자 문제는 반드시 해결

프로덕션 조사 기록에 한 사용자가 여러 organization 에 연결된 사례가 이미 존재. `store.neture.co.kr` 진입 시 항상 매장을 하나 자동 선택할 수 없다. 현재 `MULTIPLE_ACCESSIBLE_STORES` 차단을 오류로 끝내지 말고 **Store Selector** 로 승격:

```text
내 매장 1개 → 자동 진입 / 2개 이상 → 매장 선택 → 선택한 organizationId 로 Workspace 진입
```

## 10. serviceKey 없는 Store Guard 는 통합 Store 정본으로 쓰면 안 된다

`createRequireStoreOwner(dataSource)` 를 serviceKey 없이 호출하면 모든 store_owner role 허용 + active membership 하나 이상 확인 후, organization 이 여럿이면 `is_primary → joined_at → organization_id` 순으로 **하나를 자동 선택**한다. 기존 호환 경로에는 허용되지만 Unified Store 에는 부적절. **사용자가 선택한 organizationId 를 서버가 검증해서 사용한다. 임의 선택 금지.**

## 11. Unified Store Context 의 새로운 핵심 계약

새 권한체계가 아니라 **명시적 Store Context**:

```text
Authenticated User + Selected organizationId → 서버에서 organization_members 검증
→ 해당 organization 의 active service enrollments → Unified Store Context { organizationId, services[] }
```

서비스 하나를 고정하지 않는다.

## 12. Store Selector 선택값 저장

DB 에 `current_store_id` 류 사용자 설정을 추가하지 않는다. WorkScope 원칙과 동일하게 실행 Context. V1 전달 방식은 Foundation WO 에서 확정(후보: URL · sessionStorage · workspace context · request header). 조건: **DB 영구 저장하지 않음 · 서버가 organization 소유권 재검증.**

## 13. 인증 — 현재 `/auth/handoff` 그대로는 부족

현재 handoff = `targetServiceKey` → 해당 서비스 active membership 확인 → Service Catalog domain 이동. Unified Store 는 서비스가 아니므로 `targetServiceKey='store'` 같은 가짜 서비스를 만들면 안 된다.

## 14. Workspace Handoff 가 필요

서비스 도메인에서 `내 매장` 클릭 → Workspace handoff → `store.neture.co.kr`. 권한 기준은 target service membership 이 아니라 **사용자가 접근 가능한 Store organization 이 있는가**. `targetWorkspace='store'` 를 지원하는 workspace handoff 계약 도입.

## 15. 왜 handoff 가 필요한가

웹 인증 SSOT(`o4o_accessToken` · `o4o_refreshToken`)는 각 origin 의 `localStorage`. `kpa-society.co.kr` 의 localStorage 는 `store.neture.co.kr` 에서 읽을 수 없어 단순 redirect 는 로그아웃처럼 보인다.

```text
service origin → one-time workspace handoff → store.neture.co.kr → token exchange → Store origin localStorage
```

## 16. Google Login 직접 진입

사용자가 `store.neture.co.kr` 을 직접 열 수 있으므로 Store Workspace 자체에서 정상 Google login 이 가능해야 한다. Google authorized origin `https://store.neture.co.kr` 추가. 로그인 후 accessible store organization 조회.

## 17. CORS

API CORS 에 `store.neture.co.kr` 없음 → 정확한 origin 추가. Wildcard 사용 안 함.

## 18. 새로운 Frontend Workspace 가 필요하다는 판정

기존 Store UI 는 공통화되어 있지만 **route owner 는 여전히 세 서비스 web app**(각 App.tsx 가 자기 Store route 소유). 진정한 단일 Workspace 를 만들려면 별도 frontend entry 필요. 권장 `services/web-store` (또는 명명 규칙에 맞는 `store-web`). **새 frontend app ≠ 새 O4O Service Identity.**

## 19. Cloud Run 도 하나의 Store Web runtime 이 자연스럽다

```text
store.neture.co.kr → o4o-global-lb → store-web
```

기존 3개 web 앱 중 하나를 Store host 에 재사용하지 않는다(KPA 앱에 KCos/PH page 역-import · 의존성 재결합 · "KPA 기반 Store" 잔존).

## 20. MyStoreShell 은 재사용

새 Store 앱을 만든다고 Store Core 를 다시 만들지 않는다. 재사용: `MyStoreShell` · `StoreDashboardLayout` · `store-ui-core` · `store-products-ui` · `tablet-screen-set-editor` · `StoreExecutionHomeView` · 기존 공통 Views. 서비스별 wrapper 의 역할을 새 `web-store` 가 조립.

## 21. `StoreWorkspaceNav` 는 구조 변경 대상

상위 nav(홈 · 내 매장 · 매장 HUB · 내 서비스)는 유지하되, 현재 구현은 service config 의 `basePath` 에서 경로를 파생. Unified Store 에는 service basePath 가 없다. 새 canonical 예: `/ · /products · /content · /library · /execution · /hub · /services · /settings`. 정확한 IA 는 다음 WO 에서 census 와 함께 확정.

## 22. `My Services` 의 역할도 바뀐다

```text
내 서비스: KPA Society 이용 중 / K-Cosmetics 이용 중 / PharmacyHub 이용 중지
```

클릭 시 현재 Workspace 안에서 service filter/context 만 바뀐다. **handoff ❌ · same workspace context switch ✅**

## 23. 메뉴를 서비스별 단순 합집합으로 만들면 안 된다

QR · POP · 블로그 · 자료함 · 태블릿 · 사이니지 · 매장 제품이 서비스마다 반복되면 안 된다. 한 번만.

## 24. 기능 두 종류

**A. STORE COMMON**(organization 소유 업무 · 한 번만): 매장 정보 · 경영활용 제품 · 자체 상품 · 내 콘텐츠 · 내 자료 · 제작 자료 · QR · POP · 태블릿 · 사이니지 · 다국어 · 분석.
**B. SERVICE-SPECIFIC**(서비스 사업 종속): KPA O4O 상품·거래 · KCos commerce · PH 공급 상품 · PH 장바구니/주문 · 서비스별 모집/승인 · 서비스별 콘텐츠/HUB · 특정 프로그램 → `서비스 업무 ├ KPA Society ├ K-Cosmetics └ PharmacyHub`.

## 25. Store Hub 도 통합

`매장 HUB` 하나 + source/service filter(전체 · KPA · KCos · PH · Supplier · Community). 기존 서비스별 Hub API 는 `serviceKey` scope 유지. 범용 backend aggregation 은 처음부터 만들지 않고 frontend 에서 서비스별 read 조합부터 검토.

## 26. 데이터 저장 구조는 혼합형

organization 중심(`store_local_products` · `kpa_store_contents` · `store_execution_assets` · `store_qr_codes` · Store Library 자산) + organization+service scope(cross-service leakage 방지). 후자도 없애지 않는다. Unified Store 에서 serviceKey = **데이터 출처 / 서비스 사업 Context**(Workspace identity 아님).

## 27. API Guard 는 두 종류

- **Common Store API**: selected organization 검증 + owner/admin/manager 확인 + 최소 하나의 active Store service.
- **Service-specific API**: 기존 그대로 organization + serviceKey + active membership + service store_owner role.

기존 service guard 를 모두 없애는 것이 아니다.

## 28. Store Owner Agreement 재조사 필요

현재 guard 는 `serviceKey` 를 받아 서비스별 pending agreement 확인. 공통 Store 진입 agreement 와 서비스별 업무 진입 agreement 의 경계 확인 필요. 이번 IR 은 정책 변경 없음 · Foundation WO 전 census.

## 29~30. 기존 `/store` · `/store-owner` 의 최종 역할 · Legacy 진입

전환 후 세 서비스의 `/store/*` · `/store-owner/*` 는 canonical 이 아닌 **legacy entry**. 로그인 사용자 → Workspace handoff → `store.neture.co.kr/<동등 기능>` / 비로그인 → `store.neture.co.kr` → Google login. 단 PG callback 등 외부 계약 경로(`/store-owner/payment/success|fail`)는 함께 이동시키지 않는다.

## 31. Public URL 은 Store Workspace 와 분리

`/qr/:slug` · `/view/:id` · `/multilingual-products/:publicKey` · 공개 블로그 · signage player · 제품 공개 landing 은 소비자/public URL — 이번 migration 대상 아님.

## 32~33. AI First WO5 관계

```text
WO1~4 AI First → Unified Store Workspace Migration → store.neture.co.kr production → 정상 Store Owner Google login → WO5 AI First E2E Closure
```

WO5 는 BLOCKED 유지. 개념적 blocker = `UNIFIED_STORE_WORKSPACE_MIGRATION` + `STORE_OWNER_ACCOUNT`. Store migration 완료 시 실행 전 상태 갱신.

## 34. 가장 중요한 판정

| 항목 | 판정 |
|---|---|
| 신규 DB Schema | **불필요** (`organizations` · `organization_members` · `organization_service_enrollments`) |
| 신규 Store serviceKey | **금지** |
| 신규 Store Role | **금지** |
| 신규 Store Frontend | **필요성 높음** — `store-web → store.neture.co.kr` |
| Store Selector | **필요** (multi-organization 필수) |
| Workspace handoff | **필요** (service handoff 와 목적이 다름) |

## 35. 구현 방향 — 3 덩어리

- **WO A** `WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1`: workspace identity · store-web foundation · Unified Store Context · organization selector · store-services 연결 · Workspace handoff · Google/CORS 준비 · 공통 root shell/router. DB migration 0.
- **WO B** `WO-O4O-UNIFIED-STORE-CROSSSERVICE-CAPABILITY-ADOPTION-V1`: common capabilities 1회 노출 · 서비스별 모듈 조립 · Unified Hub · 서비스 filter/context · 공통 View 이동/재사용 · 3 서비스 App 의 Store page 점진 수렴.
- **WO C** `WO-O4O-UNIFIED-STORE-DOMAIN-CUTOVER-AND-LEGACY-ENTRY-CLOSURE-V1`: DNS · certificate · GCLB · store-web deploy · Google origin · CORS production · 기존 `/store` `/store-owner` → handoff/compat · production E2E.

## 36. 구현하지 말아야 할 것

```text
서비스별 store 서브도메인 3개 · serviceKey='store' · 새 store membership · 새 store role · 새 Store-Service 테이블
서비스 메뉴 단순 합집합 · KPA 앱을 통합 Store 앱으로 사용 · 모든 Store API 의 serviceKey 제거
public QR/Blog/Signage URL 동시 이전
```

## 37. 최종 목표 UI

```text
store.neture.co.kr
내 매장: 서울 ○○약국 ▼
홈
매장 관리   ├ 매장 경영활용 제품 ├ 자체 상품 ├ 콘텐츠 ├ 자료 ├ 제작 자료 ├ QR ├ POP ├ 태블릿 └ 사이니지
서비스 업무 ├ KPA Society(O4O 제품 · 주문/신청) ├ PharmacyHub(공급 상품 · 장바구니 · 주문) └ K-Cosmetics(...)
매장 HUB    ├ 전체 ├ KPA Society ├ PharmacyHub ├ K-Cosmetics └ 공급자 콘텐츠
내 서비스   ├ KPA Society 이용 중 ├ PharmacyHub 이용 중 └ K-Cosmetics 이용 중
```

서비스를 바꿀 때 다른 사이트로 이동하지 않는다.

## 38. 최종 판정

```text
UNIFIED_STORE_WORKSPACE = FEASIBLE
STORE_PRIMARY_CONTEXT = organizationId · SERVICE_CONTEXT = SECONDARY
ONE_STORE_N_SERVICES_MODEL = ALREADY_PRESENT
NEW_STORE_SERVICE_IDENTITY = NOT_REQUIRED · NEW_STORE_DB_RELATION = NOT_REQUIRED
CURRENT_SERVICE_FIRST_UI = REFACTOR_REQUIRED
MULTI_STORE_SELECTOR = REQUIRED · WORKSPACE_HANDOFF = REQUIRED · STORE_WEB_FRONTEND = RECOMMENDED
PUBLIC_RUNTIME = KEEP_SEPARATE
AI_FIRST_WO5 = BLOCKED_UNTIL_STORE_MIGRATION
```

팀장 판단: 설계를 더 끌 필요 없음. 이번 작업은 새 플랫폼이 아니라 **현재 서비스 중심 조립 순서를 뒤집는 작업**. 다음 = WO A 작성 — 기능을 옮기기보다 `store-web + organization-first context + Store Selector + Workspace handoff + store.neture.co.kr 기반` 을 먼저 세운다.
