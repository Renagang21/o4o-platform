# CHECK-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1

> **WO**: `WO-O4O-FINAL-ROLE-WORKSPACE-ARCHITECTURE-CENSUS-AND-CLOSURE-V1` (사용자 확정 · 2026-09-17)
> **일자**: 2026-09-17 · **기준 main**: `806a5114d` (Community Workspace CLOSED + PHASE 1 CI·migration 수리 이후 · fresh census · Deploy API SUCCESS `o4o-core-api-03682-9zv` 상태에서 시작)
> **성격**: Role Workspace 리팩터링 전체(§9-1 0~7단계)의 **최종 Census · 안전한 잔여 drift 정리 · 최신 production API 기준 Community smoke 재수행 · active canonical docs closure**. 새 테이블 0 · migration 0 · schema 변경 0 · dual-read / dual-write / bridge 0 · RBAC 모델 변경 0 · Architecture §1~§7 사업 결정 변경 0 · 프로덕션 write 0.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §1~§9 · 선행 [`CHECK-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1`](CHECK-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1.md) · [`CHECK-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1`](CHECK-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1.md)
> **구현 commit**: `4e0cf7f9c` (코드 drift 2건 · 2026-09-17) + 본 CHECK 와 함께 커밋하는 active docs 정정 7 파일

---

## 0. 한 줄 결론

Role Workspace 리팩터링은 **닫혔다** (`ROLE_WORKSPACE_REFACTOR = CLOSED`). 최신 `origin/main` 기준 Fresh Global Census 에서 Supplier · Store · Service Operator · Community 4 업무공간과 Platform Admin 분리, Service / Community / Store identity, membership · RBAC · scope, O4O Home · profile/header 진입, desktop/mobile nav, Content Boundary, Store Copy 는 모두 Architecture §1~§7 과 일치한다. 남아 있던 잔여는 **안전한 drift 2건(코드)** — media platform-admin guard 가 은퇴 role `platform:admin` 을 allow-list 로 들고 있던 것, Neture 내 글 라벨 「Neture 커뮤니티」(Catalog 상 존재하지 않는 identity) — 과 **active doc drift 5건(문서)** 뿐이었고 이번 WO 에서 직접 닫았다. 선행 Community CHECK 가 `PRODUCTION_SMOKE = PARTIAL_API_DEPLOY_BLOCKED` 로 남겼던 backend 검증은 최신 production API(`o4o-core-api-03682-9zv` 이후)에서 read-only smoke 로 **PASS** 로 재판정했다.

---

## 1. Fresh Global Census (origin/main `806a5114d`)

### 1-1. 축별 판정

| # | 축 | 정본 SSOT (코드) | Census 결과 | 판정 |
|---|---|---|---|---|
| 1 | Supplier Workspace | `services/web-neture` supplier 3축 IA(Products / Orders / Content) · Hub adapter `supplier-library` · `POST /auth/handoff` catalog 파생 | 3축 그대로 · Community 진입 은퇴 유지(deep-link 보존) · handoff 대상 = catalog `storeWorkspaceEnabled` 3서비스 | OK |
| 2 | Store Workspace | `packages/store-ui-core/src/workspace/` 1구현 · `/store/workspace` · `GET /work-scope/store-services` | KPA / KCos / PH 조립만 · `/mobile/pharmacy` 는 redirect 1 + `MobileBottomNav` compat 1 (RETIRE 유지) | OK |
| 3 | Service Operator Workspace | `packages/operator-ux-core/src/sidebar/operatorDomainIA.ts` `DEFAULT_OPERATOR_DOMAIN_IA`(서비스 운영 / 사업 운영 / 운영 관리) · `GET /work-scope/operator-services` | KPA / KCos / PH 모두 기본 IA 소비(서비스 config 미주입) · PH 는 사업 운영 0(REAL_SERVICE_DIFFERENCE, 가짜 카드 0) · Neture SPECIAL 별도 config | OK |
| 4 | Community Workspace | `apps/api-server/src/config/community-catalog.ts` · `utils/community-access.resolver.ts` · `GET /communities` · `/communities/:key/access` | 소비처 5곳(register-routes · communities.routes · resolver · web-neture `home-entry.ts` · admin apps.routes) 전부 Catalog 만 읽음 · Industry Community 0 · "Neture Community" identity 0 → 단 **Neture `MyPostsPage` 라벨 1건 drift** (D2) | OK (D2 정리) |
| 5 | Platform Admin 분리 | `apps/api-server/src/utils/role.utils.ts` `isPlatformAdmin` = `platform:super_admin` 만 | `platform:admin` 문자열은 거부 테스트 + role.utils 주석에만 존재 → 단 **media 컨트롤러 2곳이 자체 allow-list 로 `platform:admin` 허용** (D1) · admin `rolePermissions.ts` 주석 stale | OK (D1 정리) |
| 6 | Service Identity | `apps/api-server/src/config/service-catalog.ts` (neture store=false/operator=true · kpa-society / k-cosmetics / pharmacy-hub both true · kpa-branch operator only · cafe24-b2b UNDECIDED 없음) | Identity ≠ Workspace metadata 유지 · 새 하드코딩 서비스 목록 0 | OK |
| 7 | Community Identity | community-catalog 3(pharmacy · cosmetics · o4o-general) | Forum Core `communityKey` 컨텍스트 · KPA + PH = 하나의 약사 커뮤니티 · 서비스 라우트는 CONTEXT_ALIAS | OK |
| 8 | Store Identity | `organization_service_enrollments` · `/work-scope/store-services` | 1 Store : N Services 유지 · demo 계정 3매장 = `ambiguous MULTIPLE_ACCESSIBLE_STORES`(정상 응답) | OK |
| 9 | membership / RBAC / scope | `role_assignments`(SSOT) + `service_memberships` + `require{Service}Scope` | 신규 membership 테이블 0 · policy engine 0 · Community 참여 = resolver 가 service_memberships 읽기만 | OK |
| 10 | O4O Home · profile/header 진입 | `services/web-neture/src/pages/home/home-entry.ts` · `GET /neture/home/entry` | 커뮤니티 그룹 = `/communities` 목록만 · 매장 HUB / 내 매장 / 공급자 업무 / 내가 이용하는 서비스 = entry API 파생 · 프런트 membership 추론 0 | OK |
| 11 | desktop / mobile nav | store-ui-core `workspace/` nav(홈 / 내 매장 / 매장 HUB / 내 서비스) · `MobileBottomNav` | 4 서비스 동일 골격 · KPA 모바일 전용 화면 RETIRE 유지 | OK |
| 12 | Content Boundary · Store Copy | ContentDomain 4종 · `HubProducer='supplier'` canonical · `LegacyContentProducer` TEMP_COMPAT 2곳 | 새 producer 키 0 · Partner 잔존 = 주석 · migration 파일뿐 · 6-Workspace A~F 문자열 = 역사 migration · 무관 web-neture work-scope 만 | OK |

### 1-2. 잔여 검색 요약 (검색어 → hit → 분류)

| 검색 | hit | 분류 |
|---|---|---|
| `platform:admin` (apps · services · packages) | 거부 테스트 · role.utils 주석 · **media-catalog / media-library 컨트롤러 allow-list** | D1 (수정) / 나머지 KEEP |
| `Neture 커뮤니티` | `services/web-neture/src/pages/forum/MyPostsPage.tsx` 1 | D2 (수정) |
| `/mobile/pharmacy` | redirect 1 · `MobileBottomNav` compat 1 | KEEP (RETIRE 유지) |
| `LegacyContentProducer` | adapter 2 | TEMP_COMPAT (KEEP, Content Boundary CHECK 기록) |
| `Partner` (runtime) | 주석 · migrations · `foreign_visitor_partner*`(타 도메인) | KEEP |
| `Workspace A` ~ `Workspace F` / `6 Workspace` | migrations · web-neture work-scope(무관) · **active doc 2건** (OPERATOR-DASHBOARD §4-2 · NON-APPROVAL §5) | 문서 처리 (§3) |
| `Industry` | `SellerOverviewByIndustry`(무관 admin 통계) | KEEP |
| `demo` (KPA) | App.tsx `/demo/*` 없음 · **KPA-SOCIETY-SERVICE-STRUCTURE 문서만 잔존** | 문서 처리 (§3) |

`UPDATE_REQUIRED` 잔존: CANONICAL-INDEX · ROLE-WORKSPACE-ARCHITECTURE 모두 0.

---

## 2. 코드 drift 정리 (commit `4e0cf7f9c`)

| ID | 파일 | 전 | 후 | 근거 |
|---|---|---|---|---|
| D1 | `apps/api-server/src/modules/media/controllers/media-catalog.controller.ts` (`requireMediaPlatformAdmin`) · `media-library.controller.ts:69` (entityType/entityId 필터 가드) | 자체 allow-list `['platform:super_admin','platform:admin']` | canonical `isPlatformAdmin(user.roles)` (`utils/role.utils.ts`) · 403 `PLATFORM_ADMIN_REQUIRED` 유지 | Architecture §7 Platform Admin = `platform:super_admin` 단일 · 은퇴 role 을 허용하는 dead compatibility |
| D1' | `apps/admin-dashboard/src/config/rolePermissions.ts:218` | 주석 "platform:admin 도 허용" | "platform:super_admin 전용 (`platform:admin` 은 은퇴한 role)" | 주석 stale (동작 무변경) |
| D2 | `services/web-neture/src/pages/forum/MyPostsPage.tsx:59` | `description="Neture 커뮤니티에 …"` | `"O4O 공통 커뮤니티에 내가 작성한 글입니다."` | Catalog `o4o-general` 표시명 · "Neture Community" identity 0 (Community CHECK §2) |

RETIRE route 0 · registry 변경 0 · API contract 변경 0 (guard 의 허용 집합이 `platform:admin` 만큼 좁아진 것은 은퇴 role 이라 실사용자 0 — 프로덕션 `role_assignments` 에 `platform:admin` 부여 없음은 Legacy Role IR 시점 확인).

### 2-1. 테스트 · 빌드

| 항목 | 결과 |
|---|---|
| `apps/api-server` `tsc --noEmit` | exit 0 |
| jest `media-library-v2-http` · `media-library-v2` · `signage-media-library-route-order` | 3 suites passed · 25 tests (10 skipped, 기존 skip) |
| `services/web-neture` `tsc --noEmit` | exit 0 (최초 2 errors 는 로컬 stale `packages/ui/dist`(2026-09-03) 원인 → `pnpm --filter "@o4o/ui" build` 후 0 — 코드 결함 아님) |
| `services/web-neture/src/pages/forum` vitest | 테스트 파일 없음 (해당 페이지 unit test 부재, 신규 추가 안 함 — 라벨 문자열 변경) |
| CI Pipeline · CodeQL (`4e0cf7f9c`) | §4-3 |

---

## 3. Active docs closure (CLAUDE.md §16 — 본 WO 가 정정을 명시 승인)

| 문서 | 발견 drift | 처리 |
|---|---|---|
| [`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) | §3 참여 주체가 Partner · 6-Workspace 시대 표현 · Neture 를 매장 서비스로 기술 | 정정 완료 (2026-09-17 note): 적용 범위 = catalog 기준 · §3 = 4 업무공간(Supplier / Operator / Store / Community 구성원) + 공급자 온라인 제공 경로 2 · §6 "Workspace B" → Service Operator Workspace · §7 역할별 업무공간 경계 + Community membership 규칙 · 주의사항 Neture = `storeWorkspaceEnabled=false` · 후속 문서 표에 ROLE-WORKSPACE 행 · 3-ROLE-FLOW SUPERSEDED note. 사업 철학(참여 주체 · HUB · AI 역할) 본질은 무변경 |
| [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) | §4-2-A · B · D · E 의 "A~F 6 Workspace" Sidebar IA 가 표준 Service Operator 3도메인 IA 와 충돌 | v1.2 · §4-2-A 상단 `> **상태**: SUPERSEDED (§4-2-A · B · D · E 공통) · 대체 문서: ROLE-WORKSPACE §4 · §4-2 · 표기일 2026-09-17` (본문 보존) · 5-Block 대시보드 · Guard · Route 규칙은 ACTIVE 유지 |
| [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1`](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) | §5 가 A~F 를 Sidebar IA 로 오독될 수 있음 | §5 에 1줄 주의(A~F 는 UX 분류이며 Sidebar IA 아님) — 판정 · 본문 무변경 |
| [`KPA-SOCIETY-SERVICE-STRUCTURE`](../baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md) | 데모 서비스(`/demo/*`) 가 아직 있는 것처럼 기술 · Community Identity / Store Workspace 미반영 · `docs/app-guidelines/` 깨진 링크 | v1.1: §2 데모 행 제거 완료 표기 · §3.1 Community Identity(`communityKey=pharmacy`, KPA+PH 합집합) + Store Workspace(`/store/workspace`, `/mobile/pharmacy` redirect) · §3.2 web-kpa-branch catalog · §3.3 제거 완료 · §7 링크 정정(ROLE-WORKSPACE · KPA-UX-BASELINE · CANONICAL-INDEX) |
| [`O4O-STORE-MENU-CANONICAL-TREE-V1`](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) | §1.3 적용 서비스에 Neture 포함 · SMT-G8 가 Partner 유입 경로 전제 | 상태 정정 line + 상위 문서 ROLE-WORKSPACE · §1.3 = catalog `storeWorkspaceEnabled` 기준(KPA / KCos / PH) · §5.1 유입 경로 대응(operator_hub 에 supplier-library 포함) · SMT-G8 = §2-2 제외 경로 재등장 금지 · `HubProducer='supplier'` canonical |
| [`PLATFORM-CONTENT-POLICY-V1`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) §6.4 (`serviceKey = current`) | 검토 — Community Content 의 현행 runtime 은 `EXISTING_BOUNDARY_REUSED`(cms_contents.serviceKey) 로 §6.4 와 **일치** | **NO_CHANGE**. communityKey 귀속 여부는 Community CHECK F2 판정 대기 그대로 (별도 WO) |
| [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) | §8 PHILOSOPHY · STORE-MENU 행 `UPDATE_REQUIRED` · §9-1 8단계 미완료 | 헤더 최종 갱신 2026-09-17 · §8 두 행 정정 완료 + OPERATOR-DASHBOARD/NON-APPROVAL · KPA-STRUCTURE 행 추가 · §9-1 8단계 완료 (`ROLE_WORKSPACE_REFACTOR = CLOSED`) |
| [`CANONICAL-INDEX`](../CANONICAL-INDEX.md) | 리팩터링 진행 중 note · 4 문서 설명 stale | 진행 note → CLOSED(본 CHECK 링크) · PHILOSOPHY · OPERATOR-DASHBOARD · STORE-MENU · KPA-STRUCTURE 행 설명 갱신 (행 추가 · 삭제 0) |

`CLAUDE.md` §11 의 "A~F 6 Workspace" 문구는 진입점 문서라 §16-6(판단 불가는 그대로) 에 따라 **미수정 · 보고만** — OPERATOR-DASHBOARD 의 SUPERSEDED 표기가 정본이므로 진입점은 다음 CLAUDE.md 개정 시 정리 (별도 WO 제안 대상 아님, 1줄).

---

## 4. Production smoke (최신 API · read-only · 2026-09-17)

전제: 선행 Community CHECK `PRODUCTION_SMOKE = PARTIAL_API_DEPLOY_BLOCKED` 를 인계하지 않고 **최신 production API** 기준으로 재수행. 로그인 = KPA 로그인 페이지 체험용 약국 경영자 데모 버튼(자격정보 미기록) · 교차 서비스 = `POST /api/v1/auth/handoff` · 프로덕션 write 0.

### 4-1. Community backend (선행 CHECK 미도달분 재판정)

| 요청 | 결과 |
|---|---|
| `GET /api/v1/communities` | 200 · 3건(`pharmacy` 약사 커뮤니티 entries kpa-society + pharmacy-hub · `cosmetics` · `o4o-general` O4O 공통 커뮤니티 entry neture `/community`) · 전부 `canParticipate:true` |
| `GET /communities/pharmacy/access` · `/cosmetics/access` · `/o4o-general/access` | 200 allowed (via kpa-society / k-cosmetics / null=authenticated) |
| `GET /communities/nope/access` | 404 `COMMUNITY_NOT_FOUND` |
| `GET /kpa/forum/categories` vs `GET /pharmacy-hub/forum/categories` | 둘 다 200 · 동일 2 카테고리 → **약사 커뮤니티 합집합 확인** |
| `GET /work-scope/store-services` | 200 `status:ambiguous MULTIPLE_ACCESSIBLE_STORES` (데모 계정 3매장 — INFO, 정상) |
| `GET /work-scope/operator-services` | 200 빈 목록 (데모는 운영자 아님 — 정상) |
| `GET /neture/home/entry` | 200 · stores kpa-society / k-cosmetics / pharmacy-hub · supplier active |

→ `PRODUCTION_SMOKE(Community) = PASS`.

### 4-2. UI

| 화면 | 결과 |
|---|---|
| KPA 로그인 후 Store Workspace nav(홈 / 내 매장 / 매장 HUB / 내 서비스) | 노출 PASS |
| handoff → Neture O4O Home | 커뮤니티 그룹(약사 / 화장품 / O4O 공통) · 매장 HUB ×3 · 내 매장 ×3 · 공급자 업무 · 내가 이용하는 서비스(약사회 분회 포함) PASS |
| 콘솔 | bootstrap 시 일시 401 `/auth/me` 1건 (선행 기록된 pre-existing, 본 WO 무관) |

### 4-3. `4e0cf7f9c` 배포 · post-deploy

| 항목 | 결과 |
|---|---|
| Deploy Web Services (Cloud Run) | success |
| Deploy Admin Dashboard (Cloud Run) | success |
| Deploy API Server (Cloud Run) | success (run 35164838018 · 최신 revision 에서 §4-1 · post-deploy 재확인) |
| CI Pipeline · CodeQL | CI Pipeline success · CodeQL success |
| post-deploy media guard (`GET /media-library?entityType=x` 데모 계정) | `GET /api/v1/platform/media-library?entityType=x` → 403 `PLATFORM_ADMIN_REQUIRED` · `?limit=1` → 200 (데모 = 비 platform admin, 의도대로) · `GET /communities` → 200 |

---

## 5. 후속 (별도 WO · 판정 대기)

| # | 항목 | 상태 |
|---|---|---|
| F1 | Community Content 의 `communityKey` 귀속(현재 `cms_contents.serviceKey` EXISTING_BOUNDARY_REUSED · PLATFORM-CONTENT-POLICY §6.4) | Community CHECK F2 그대로 **판정 대기** — 사업 결정 필요 시에만 WO |
| F2 | `LegacyContentProducer` TEMP_COMPAT 2곳 · admin 라벨 구 키 | Content Boundary CHECK 기록 유지 · 소비처 0 확인 후 제거 (긴급 아님) |
| F3 | `cafe24-b2b` workspaceMode UNDECIDED | Service Tenant CHECK 그대로 (Cafe24 트랙 판단) |
| F4 | `CLAUDE.md` §11 "A~F 6 Workspace" 문구 | 다음 CLAUDE.md 개정 시 1줄 정리 |
| F5 | `/mobile/pharmacy` redirect · `MobileBottomNav` compat | 접근 로그 0 확인 후 제거 (Store CHECK 기록) |

이 항목들은 Role Workspace **구조** 의 미완이 아니라 각 도메인 트랙의 판정 대기 · 사소한 잔여이며, 리팩터링 closure 를 막지 않는다.

---

## 6. 최종 판정

```text
FRESH_GLOBAL_CENSUS          = COMPLETE (12축 OK)
CODE_DRIFT_FIXED             = 2 (D1 media platform-admin guard · D2 Neture 라벨) + 주석 1
ACTIVE_DOC_DRIFT_FIXED       = 5 (PHILOSOPHY · OPERATOR-DASHBOARD · NON-APPROVAL · KPA-STRUCTURE · STORE-MENU) + 정본 2 (ROLE-WORKSPACE §8/§9-1 · CANONICAL-INDEX)
PLATFORM_CONTENT_POLICY_6_4  = NO_CHANGE (일치)
NEW_TABLE / MIGRATION / BRIDGE = 0
RBAC_MODEL_CHANGE            = 0
ARCHITECTURE_1_7_CHANGE      = 0

PRODUCTION_SMOKE(Community)  = PASS (최신 API · read-only · PARTIAL_API_DEPLOY_BLOCKED 해소)
PRODUCTION_SMOKE(Home/Store nav) = PASS

ROLE_WORKSPACE_REFACTOR      = CLOSED
```
