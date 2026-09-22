# WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1

> **종류**: 구현 WO · **상태**: **REOPENED / DDL_APPROVED (2026-09-21)** — Foundation 완료(`a2e89bf85`) · `CLOSED_WITH_HANDOFF_STOP → REOPENED` · 사용자 DDL 승인으로 §3-④ handoff 완성 + **§8 Scope Extension(Unified Store Migration Completion) 흡수** · 별도 WO B/C/handoff WO 없음 · **작성 기준일**: 2026-09-21 (`origin/main` `b4b0f70f8`) · **CHECK**: [`CHECK-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1`](../checks/CHECK-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1.md)
> **실행 전제 IR**: [`IR-O4O-UNIFIED-STORE-WORKSPACE-SUBDOMAIN-AND-CROSSSERVICE-ROUTING-V1`](../investigations/IR-O4O-UNIFIED-STORE-WORKSPACE-SUBDOMAIN-AND-CROSSSERVICE-ROUTING-V1.md) — 판정 `UNIFIED_STORE_WORKSPACE=FEASIBLE`. 3 덩어리(IR §35) 중 **WO A(첫 번째)**. ~~후속 WO B · WO C 는 별도 작성~~ → **2026-09-21 판정: 별도 WO 로 쪼개지 않는다.** WO B/C 범위는 §8 Scope Extension 으로 본 WO 에 흡수.
> **도메인 확정**: canonical `https://store.neture.co.kr` · 화면명 `내 매장`. **Store ≠ 서비스** — `serviceKey='store'` · store membership · store role · Store-Service 신규 테이블은 만들지 않는다(IR §34·§36).
> **관련 정본**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)(1 Store : N Services) · [`STORE-LAYER-ARCHITECTURE`](../architecture/STORE-LAYER-ARCHITECTURE.md)(F3 · 구조 변경은 본 WO 가 명시적 WO) · [`O4O-BOUNDARY-POLICY-V1`](../architecture/O4O-BOUNDARY-POLICY-V1.md)(Store Ops = `organizationId`) · serviceKey SSOT = `apps/api-server/src/config/service-catalog.ts`(본 WO 에서 **변경 없음**).
>
> 실행 시 최신 `origin/main` 에서 다시 census 하고, 동일 파일에 다른 세션 WIP 가 있으면 즉시 보고 · 중지한다.

## 1. 목적

```text
현재   서비스 → 서비스의 /store → 내 서비스 → 다른 서비스 /store 로 handoff      (service-first)
목표   사용자 → 매장(organization) 선택 → store.neture.co.kr → 그 매장이 이용 중인 서비스들   (organization-first)
```

이번 WO 는 **기능을 옮기지 않는다.** 뒤집힌 조립 순서를 세우는 **기반**만 만든다:

```text
① store-web 앱 골격            새 frontend entry(조립 계층) · 새 O4O 서비스 Identity 아님
② Unified Store Context        { organizationId, services[] } — organizationId 1차 · serviceKey 2차
③ Store Selector               접근 가능 organization 1개=자동 진입 · 2개 이상=선택
④ Workspace handoff            서비스 origin → store.neture.co.kr 로 로그인 상태 이전
⑤ 직접 진입 준비               Google authorized origin · API CORS 정확 origin
⑥ 공통 root shell / router     홈 · 내 매장 · 매장 HUB · 내 서비스 상위 nav 골격(내용은 WO B)
```

완료 시 사용자는 `store.neture.co.kr`(또는 임시 검증 origin)에서 **로그인 → 매장 선택 → 그 매장의 서비스 목록이 보이는 빈 Workspace** 까지 도달한다. 매장 기능 화면은 아직 기존 서비스 `/store`·`/store-owner` 에 그대로 있다.

## 2. 조사 · 재사용 (신규 작성 최소화)

실행자는 먼저 아래를 **재사용 전제**로 census 한다. 새로 만들기 전에 기존 자산으로 되는지 확인하고, CHECK 에 재사용/신규 구분표를 남긴다.

| 필요 | 기존 자산 | 처리 |
|---|---|---|
| 접근 가능 매장 · 서비스 목록 | `GET /api/v1/work-scope/store-services[?organizationId]` · `resolveStoreServices` · `MULTIPLE_ACCESSIBLE_STORES` | **재사용**. 응답이 Store Selector 에 필요한 organization 목록(이름 · id)을 이미 주는지 확인 — 부족하면 additive 필드만 |
| Store shell · nav · workspace 뷰 | `MyStoreShell` · `StoreDashboardLayout` · `StoreWorkspaceNav` · `store-ui-core/workspace/*`(`MyServicesView` · `StoreWorkspaceHomeView`) | **재사용/조립**. `StoreWorkspaceNav` 의 service `basePath` 파생은 Unified 에서 basePath 없음 → nav 입력 계약 additive 확장(기존 3 서비스 소비처 무변경) |
| 서비스 간 handoff | `/auth/handoff` (`handoff.controller.ts` · `handoff_tokens`) · 각 서비스 `HandoffPage`(`/handoff?token=`) · refresh family 승계 | **패턴 재사용**, 계약은 §3-④ 결정 |
| Google 로그인 · 토큰 저장 | 기존 web-account/Google Continue 경로 · per-origin localStorage SSOT | **재사용**. store-web 은 새 인증 방식을 만들지 않는다 |
| 웹 앱 골격 | `services/web-*` 중 가장 얇은 앱(예: `web-lecture`)의 Vite/router/authClient 구성 | **골격 복제** — 서비스 페이지는 복제하지 않음 |
| Store Owner Agreement 428 gate | `createRequireStoreOwner` 계열 · `STORE_OWNER_AGREEMENT_REQUIRED` | **census 만**(IR §28). 정책 · guard 변경 없음. Common Store 진입에 agreement 가 어떻게 걸리는지 CHECK 에 기록 |

## 3. 구현 범위

### ① `store-web` 기반 (조립 계층)

- 위치 `services/web-store`(기존 명명 `web-{key}` 준수). package name · 앱 title `내 매장`.
- **새 O4O Service Identity 가 아니다**: `service-catalog.ts` 무변경 · `serviceKey` 없음 · 로그인 API 가 serviceKey 를 요구하면(`ref-login-api-requires-servicekey`) 어떤 값으로 부르는지 census 후 **기존 값 재사용 또는 serviceKey 불요 경로** 로 해결 — 새 값 등록은 중지 조건.
- 배포 · Docker · CI 등록은 **본 WO 범위 밖**(§5 중지 조건). 로컬 dev 서버 기동 + 빌드 통과까지.

### ② Unified Store Context

```text
Authenticated User + selected organizationId
  → 서버 검증 (organization_members · owner/admin/manager)
  → 그 organization 의 active service enrollments
  → { organizationId, organizationName, services: [{ serviceKey, status, ... }] }
```

- 프론트 context provider 1개(`store-web` 내부 또는 `store-ui-core/workspace`). 서비스 하나를 고정하지 않는다.
- 서버 측은 `/work-scope/store-services?organizationId=` 를 정본으로 쓴다. 새 API 는 기존 것으로 부족할 때만 additive.

### ③ Store Selector

- 1개 → 자동 진입 · 2개 이상 → 선택 화면(`MULTIPLE_ACCESSIBLE_STORES` 를 오류가 아닌 선택 진입으로 승격) · 0개 → 안내 화면(가입 유도 · 서비스별 신청 경로 링크).
- 선택값은 **DB 에 저장하지 않는다**(IR §12). 전달 방식은 실행자가 확정하되 조건: 새로고침에 살아남을 것 · 서버는 매 요청 organization 소유권 재검증 · 사용자가 언제든 바꿀 수 있을 것(nav 의 `내 매장: ○○ ▼`). 권장 = URL 은 유지하지 않고 `sessionStorage` + `organizationId` query/header 로 서버 전달 — 최종 선택과 근거를 CHECK 에.
- `createRequireStoreOwner(dataSource)` 의 serviceKey 없는 자동 org 선택(is_primary → joined_at → id)은 **Unified 경로에서 사용 금지**(IR §10). 기존 호환 소비처는 건드리지 않는다.

### ④ Workspace handoff

- 계약: `targetWorkspace='store'`. 권한 = **접근 가능한 Store organization 이 1개 이상**(target service membership 아님).
- **결정 항목 — `handoff_tokens.target_service_key varchar(64) NOT NULL`**(IR 미언급 · 등재 시 확인). 선택지:
  1. 컬럼 nullable 화 + `target_workspace` 컬럼 추가 → **DDL = 중지 조건**(사용자 승인 후 migration).
  2. 컬럼에 `'store'` 등 마커 값 저장 → 가짜 serviceKey 냄새 · IR §13 위반. **채택 금지.**
  3. 별도 단기 토큰 메커니즘(기존 `refresh family` 승계 로직 재사용, 테이블 신설 없음 · 예: 기존 테이블 재사용 불가 시 stateless 서명 토큰 또는 기존 auth 세션 저장소) → DDL 0 유지.
  
  **권장 3**, 단 보안 속성(1회성 · 짧은 TTL · origin 검증)이 기존 handoff 와 동등해야 한다. 동등성 확보가 어렵다고 판단되면 **1 로 중지 · 보고**. 어느 쪽이든 기존 `/auth/handoff`(service handoff) 의 동작은 변경하지 않는다.
- 수신 측: `store-web` 의 `/handoff?token=` 페이지 — 기존 `HandoffPage` 패턴(토큰 교환 → per-origin localStorage 저장 · `useLayoutEffect clearStoredTokens` 등 stale guard 승계).
- 송신 측 연결(기존 3 서비스의 `내 매장`/`MyServicesView` 클릭 → workspace handoff)은 **WO B/C** — 이번엔 API + 수신 페이지 + 수동 호출 smoke 까지.

### ⑤ 직접 진입 준비

- API CORS: `getAllowedOrigins()` prodOrigins 에 `https://store.neture.co.kr` **정확한 origin** 추가(wildcard 금지). 로컬 dev origin 은 기존 env 방식.
- Google authorized origin 추가는 **외부 콘솔 작업 = 사용자 승인 항목**. 본 WO 는 필요한 origin 값과 절차를 CHECK 에 기록만.
- `store-web` 이 Google 로그인 → `/work-scope/store-services` 조회 → Selector 까지 동작해야 한다(로컬 origin 기준).

### ⑥ 공통 root shell / router

- 상위 nav 골격: `홈 · 내 매장(매장 관리) · 서비스 업무 · 매장 HUB · 내 서비스 · 설정`. 하위 항목은 **placeholder** — 기능 이전 · 메뉴 합집합 금지(IR §23).
- `내 서비스` = 현재 organization 의 enrollments 표시. 클릭 시 handoff 하지 않고 **같은 Workspace 안의 service filter/context 전환**(내용은 WO B). 이번엔 표시 + 선택 상태만.
- canonical path 초안(IR §21) 을 router 에 등록하되 기능 없는 경로는 `준비 중` 안내 1개 컴포넌트로 통일.

## 4. 하지 않는 것 (본 WO)

```text
매장 기능 화면 이전(제품 · 콘텐츠 · 자료 · QR · POP · 태블릿 · 사이니지 · 다국어 · 분석)   → WO B
Unified Store Hub · 서비스별 모듈 조립 · 서비스 filter 실동작                          → WO B
기존 3 서비스 App.tsx 의 /store · /store-owner 변경 · legacy entry → handoff 전환       → WO C
DNS · certificate · GCLB · Cloud Run store-web 배포 · deploy-web-services.yml 등록      → WO C (또는 사용자 승인 후 별도)
Google authorized origin · 프로덕션 CORS env 반영                                        → 사용자 승인 항목(값만 기록)
public URL 이전(/qr/:slug · /view/:id · /multilingual-products/:publicKey · 블로그 · signage player · PG callback)
serviceKey='store' · 새 store membership/role/table · 서비스별 store 서브도메인 3개
KPA 앱을 통합 Store 앱으로 사용 · 모든 Store API 의 serviceKey 제거 · 서비스 메뉴 단순 합집합
service-catalog.ts · role · 기존 guard · 기존 /auth/handoff 계약 변경
Store Owner Agreement 정책 변경(census 만)
```

## 5. 중지 조건 (사용자 판단 요청)

- **DDL**: `handoff_tokens` 변경 등 어떤 migration 이든 필요해지면(§3-④ 선택지 1). 목표 `DB_MIGRATION=0`.
- **CI · Docker · 배포 인프라**: 새 앱의 `deploy-web-services.yml` · Dockerfile · 선별 COPY(신규 패키지 의존 시 `ref: web-kpa Dockerfile 선별 COPY 함정`) 변경. 빌드 통과까지만 하고 등록은 보고.
- **`package.json` · lockfile**: 새 앱 추가 자체가 workspace 등록을 요구한다 — 신규 앱 생성 시 **최초 1회 workspace/lockfile 변경 범위를 먼저 보고**하고 승인 후 진행. 외부 dependency 신규 추가 금지(기존 앱과 동일 버전만).
- **권한 · route · API contract**: 기존 `/work-scope/store-services` · `/auth/handoff` 응답 형태 변경(additive 필드 외) · 새 guard 가 기존 guard 를 대체하려 할 때.
- 실제 계정 · Google 콘솔 · 외부 서비스 승인.
- 다른 세션 dirty/untracked 파일 접촉 필요 · 현재 변경과 무관한 build/test 실패.

## 6. 완료 기준 · 검증

```text
STORE_WEB_APP=CREATED (services/web-store · 로컬 기동 · typecheck/build PASS)
NEW_SERVICE_IDENTITY=0 · SERVICE_CATALOG_CHANGED=0 · NEW_ROLE=0 · NEW_TABLE=0 · DB_MIGRATION=0
UNIFIED_STORE_CONTEXT=organizationId-first (services[] secondary)
STORE_SELECTOR=1 auto / ≥2 select / 0 guide · SELECTION_DB_PERSISTED=0 · SERVER_REVALIDATES_ORG=PASS
LEGACY_AUTO_ORG_PICK_IN_UNIFIED_PATH=0
WORKSPACE_HANDOFF(targetWorkspace='store')=API+RECEIVER PASS · SERVICE_HANDOFF_UNCHANGED=PASS · FAKE_SERVICE_KEY=0
CORS_EXACT_ORIGIN=ADDED(code) · GOOGLE_ORIGIN=RECORDED(승인 대기)
ROOT_SHELL_NAV=6 상위 항목 · FEATURE_MIGRATED=0 · MENU_UNION=0
EXISTING_3_SERVICE_STORE_ROUTES=UNCHANGED (spec 로 단언)
```

- 테스트: 신규 계약 spec(api-server jest) — workspace handoff 권한(org 없음=403 · service membership 무관) · store-services organizationId 재검증 · service-catalog/`handoff` 기존 계약 무변경 · 3 서비스 App.tsx Store route 무변경. `store-ui-core` vitest 는 nav 계약 확장에 맞춰 추가.
- smoke: 로컬 실브라우저 — Google 로그인(또는 기존 정상 인증 경로) → Selector → 빈 Workspace + 내 서비스 목록. **프로덕션 store_owner 계정 문제로 불가하면** WO5 와 같은 규칙으로 `PENDING_USER_VERIFICATION` 기록(로그인 반복 시도 · seed 계정 · lockout 해제 금지).
- 기존 3 서비스 build/typecheck 회귀 0.

## 7. 실행 순서 · Git · 문서

```text
A. git fetch → status → 최신 main 에서 §2 census (다른 세션 WIP 충돌 확인) · workspace/lockfile 변경 범위 보고 → 승인
B. store-web 골격 · router · root shell (placeholder) · authClient 연결
C. Unified Store Context + Store Selector (/work-scope/store-services 재사용)
D. Workspace handoff — §3-④ 결정(3 권장 · DDL 필요 시 중지) → API + 수신 페이지
E. CORS 정확 origin 추가 · Google origin 값 기록 · Agreement gate census
F. 계약 spec + 기존 spec · 3 서비스 + store-web build → 로컬 smoke → CHECK 작성
G. path-specific stage → node scripts/git/check-staged-scope.mjs <paths> → git commit -m "…" -- <paths> → push
```

- CHECK 에 남길 것: 재사용/신규 구분표 · Selector 전달 방식 결정 근거 · handoff 결정(선택지·보안 속성 비교) · CI/DNS/Google origin 인계 항목(WO C 입력) · WO B 로 넘길 nav 하위 항목 목록.
- **WO5(`WO-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1`) 관계**: 개념적 blocker 가 `UNIFIED_STORE_WORKSPACE_MIGRATION + STORE_OWNER_ACCOUNT` 로 확장(IR §32~33). 본 WO 만으로는 해제되지 않으며 WO C 종료 후 상태 갱신 — 본 WO 에서 WO5 파일은 건드리지 않는다.
- 자격정보 · 계정 email 을 CHECK/커밋/로그에 기록하지 않는다. 다른 세션의 수정·미추적 파일 불가침. 보고에 `문서 정합` 한 줄 포함.

## 8. Scope Extension — Unified Store Migration Completion (2026-09-21 REOPEN)

> 사용자 판정(2026-09-21): "Foundation 구현은 유효 · STOP 도 적절. 여기서 작업을 다시 잘게 나누지 않는다." CHECK §5 의 "별도 handoff WO 제안"은 **채택하지 않는다.** §4 의 "하지 않는 것" 중 WO B/C 항목은 이 절이 대체한다. **하나의 연속 작업**으로 진행하며 사용자 외부 조작이 필요한 단계만 `PENDING_USER_ACTION` 으로 남긴다.

### 8-1. DDL 승인 (최소 · handoff_tokens)

| 항목 | 승인 내용 |
|---|---|
| `target_service_key varchar(64)` | `NOT NULL` → **NULL 허용** |
| `target_workspace varchar(32)` | **신규 · nullable** |
| DB CHECK 제약 (**필수**) | 정확히 하나만 — SERVICE HANDOFF `target_service_key IS NOT NULL AND target_workspace IS NULL` / WORKSPACE HANDOFF `target_service_key IS NULL AND target_workspace IS NOT NULL` |
| `target_workspace` 허용값 | **현재 `'store'` 만** (임의 문자열 금지 · CHECK 에 고정) |
| 기존 행 | backfill 불필요 (모두 SERVICE HANDOFF 형태) |
| 단일 사용 보장 | 기존 PostgreSQL 원자 `UPDATE … WHERE consumed_at IS NULL … RETURNING` 재사용. **별도 토큰 시스템 금지** |
| 절차 | epoch13 migration + `incremental/manifest.ts` + `expected-schema-states.ts` lockstep · 배포 시 migration Job 먼저 |

### 8-2. Handoff 계약 (기존 Service Handoff 회귀 금지)

```text
HandoffTokenPayload = { userId, sourceServiceKey, targetServiceKey?: string, targetWorkspace?: 'store', createdAt }

generate  targetServiceKey 있음 → 기존 로직 그대로 (catalog + target service active membership)
          targetWorkspace='store' → resolveAccessibleStores(userId) ≥ 1 (Store 접근 가능 organization) → targetUrl = https://store.neture.co.kr/handoff?token=…
          둘 다 / 둘 다 없음 → 400
exchange  payload.targetServiceKey 있음 → 기존 service handoff 로직 불변 (active membership 재검증)
          payload.targetWorkspace='store' → 접근 가능 organization 존재 재검증 + **Origin host === store.neture.co.kr 인 경우에만 교환**
```

- Store handoff 는 특정 KPA/KCos/PH membership 을 target 으로 고르지 않는다 — **Store 접근 가능 organization** 으로 판단.
- refresh family 승계 · setAuthCookies · 응답 body 토큰 — 기존과 동일.

### 8-3. Phase 계획 (연속 진행)

| Phase | 내용 | 산출 |
|---|---|---|
| 1 | Foundation(완료) + workspace handoff 마감 | migration · controller 분기 · spec · store-web `/handoff` |
| 2 | KPA/KCos/PH Store 기능을 store-web 에 **통합 조립** (`store-ui-core` 채택 판단 포함) | `내 매장` 공통 화면 |
| 3 | 공통 기능 1회 노출 + 서비스별 기능(service context) + 통합 Store HUB + 내 서비스 | `/store` · `/work` · `/hub` · `/services` |
| 4 | 기존 서비스의 `/store` · `/store-owner` → 통합 Store 진입(`targetWorkspace:'store'` 발급) | 세 서비스 sender 측 |
| 5 | `store.neture.co.kr` Cloud Run / LB / DNS / cert / CORS / Google origin | 가능한 것은 실행 · 외부는 PENDING_USER_ACTION |
| 6 | 전체 E2E + legacy compatibility | CHECK 갱신 · 재종결 |

> **진행 상태(2026-09-22)**: Phase 1 `e69b571fb` · Phase 2+3 `6581dc821` · Phase 4 `082f5887f`(플래그 게이트 · 기본 OFF) · Phase 5 인프라 additive 생성(NEG · backend · URL map · cert) + `4d7213a72` · Phase 6 결정론 검증 PASS. 잔여 = cert map entry · DNS · Google origin · cutover flip · store_owner 브라우저 E2E → CHECK §11-4.

### 8-4. 기능 통합 원칙

- 세 서비스의 Store 페이지를 **복사하지 않는다.** 공통 기능은 `내 매장 / 공통 매장 업무` 아래 **1회** 조립: 매장 경영활용 제품 · 매장 자체 상품 · 콘텐츠 · 자료 · 제작 자료 · 상품 설명 · 블로그 · POP · QR · 다국어 · 태블릿 · 사이니지 · 분석 · 매장 설정.
- 서비스 의존 기능만 `서비스 업무` 아래: KPA Society(O4O 제품 · 주문/신청 · KPA 서비스 콘텐츠) / K-Cosmetics(화장품 상품/거래 · KCos 고유 기능) / PharmacyHub(공급 상품 · 장바구니 · 주문 · PH 고유 프로그램).
- 같은 organization 이 3 서비스를 이용하면 **한 Workspace** 에 모두 보인다. 서비스 클릭은 **다른 도메인으로 handoff 하지 않고** in-workspace service context 전환이다.

### 8-5. 외부 조작 · 금지

- Google authorized origin(`https://store.neture.co.kr` · `http://localhost:4210`) · Gabia DNS → `PENDING_USER_ACTION` 기록 후 코드/빌드/테스트/Cloud Run 검증은 계속. 최종 production cutover 시점에만 사용자 확인.
- `taskkill //IM node.exe` 류 전체 프로세스 종료 **금지** — 이 세션이 띄운 PID 만 종료.
- WO5 AI First 는 계속 보류 → Unified Store 가 canonical `내 매장` 이 된 뒤 그 화면에서 1회 검증.
