# CHECK-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1

> **WO**: `WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1` (실행본 §1–§43, 사용자 확정 · 2026-09-16)
> **일자**: 2026-09-16 · **기준 main**: `68c18634a` (Service Operator CLOSED 이후 · fresh census)
> **성격**: Community Identity ≠ Service Identity 분리 · Community Catalog(SSOT 1, 초기 3) · 참여 자격 resolver · 공통 Forum Core 의 communityKey 컨텍스트 채택 · Industry Community 폐기. 새 테이블 0 · migration 0 · schema 변경 0 · 새 membership 테이블 0 · policy engine 0 · Forum/Content/Resources/LMS Core 복제 0 · RBAC 변경 0 · 프로덕션 write 0.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5(재작성) · §4-1 · §6 · §9-1(7단계) · 선행 [`CHECK-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1`](CHECK-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1.md) · [`CHECK-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1`](CHECK-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1.md)
> **구현 commit**: `c1fc325d8` (2026-09-16 · Deploy Web Services success · **Deploy API Server = failure** — `7f4f6eb26` 부터 이어지는 migration Job 실패(타 세션 PHASE 1 `expected-schema-states` 미등록, 본 WO 무관) → 프로덕션 API 는 `fb08c0dd1` 에 머묾 · 본 WO 의 backend 는 그 수리 후 도달)

---

## 0. 한 줄 결론

Community 를 Service 와 **별도 Identity** 로 세웠다. SSOT 는 `apps/api-server/src/config/community-catalog.ts` 하나(`O4O_COMMUNITIES`: `pharmacy` 약사 커뮤니티 = kpa-society OR pharmacy-hub · `cosmetics` 화장품 커뮤니티 = k-cosmetics · `o4o-general` O4O 공통 커뮤니티 = authenticated)이고, 참여 판정은 `resolveCommunityAccess(user, communityKey)`(`utils/community-access.resolver.ts`, 기존 service_memberships 를 **읽기만**) 한 곳이다. Forum 공통 Core(`createServiceForumRouter` · `ForumControllerBase` · `ForumQueryService`)는 복제하지 않고 `ForumContext.communityKey` 하나로 경계를 바꿨다 — KPA `/kpa/forum` 과 Pharmacy-Hub `/pharmacy-hub/forum` 이 같은 `pharmacy` 원장 코드 집합(kpa-society + pharmacy-hub)을 읽고 쓰므로 **약사 커뮤니티는 하나**다(PH 별도 약사 Community = 0). 물리 `forum_category_requests.service_code` 는 파티션과 운영 governance(승인·중재)를 겸하는 실제 Service scope 라 rename 하지 않고 Catalog `forumStorageCodes` 를 논리→물리 adapter 로 뒀다(dual-read · bridge · lineage 0). `GET /api/v1/communities` 가 서비스 중립 read contract 이며 대표 홈 「커뮤니티」는 이 목록만 쓴다(프런트 membership 추론 0). Industry Community 는 RETIRED, "Neture Community" identity 는 없다(저장 코드 `neture` 는 구현 seed).

---

## 1. Fresh Census (§43) — origin/main `68c18634a`

### 1-1. Community surface · scope field 분류 (§8)

| 대상 | 현행 | 분류 | 처리 |
|---|---|---|---|
| `createServiceForumRouter` (`routes/forum/service-forum.routes.ts`) + `forumContextMiddleware` | PH · KCos · Neture 가 `serviceCode` 로 mount · PH 만 `requireActiveServiceMembership` 쓰기 가드 | 공통 Core (KEEP) | `context.communityKey` · `requireCommunityAccess` 추가, 서비스별 분기 0 |
| KPA `/kpa/forum` (kpa.routes.ts 자체 remount, `ForumController` facade) | `serviceCode:'kpa'` · 쓰기 = authenticate 만 | 공통 Core 재사용 (KEEP) | `communityKey:'pharmacy'` + `pharmacyWrite` 가드 (구조 변경 `categories` · `moderation` 은 kpa 운영 governance 그대로) |
| `ForumControllerBase.applyServiceScope / isForumInServiceScope / getCanonicalServiceKey` · `ForumDirectoryController.applyForumContextFilter / getForum` · `ForumPostController` slug 해석 · popular tags | 단일 canonical service_code 비교 | `LEGACY_COMMUNITY_SCOPE` (읽기·쓰기 파티션) | **단일 해석 지점 `getContextForumCodes(ctx)`** — communityKey → 코드 집합(IN / ANY) · serviceCode → [canonical] · 없음 → 무경계 |
| `forum_category_requests.service_code` (물리) | 파티션 + 운영자 승인·중재 소유(`hasForumModerationOverride` · closed forum bypass · operator/admin forum routes `?serviceCode=`) | `REAL_SERVICE_SCOPE` 겸용 → **SHARED_STORAGE_FIELD** | rename 안 함(WO §9 두 번째 경우) · Catalog `forumStorageCodes` adapter · 새 business logic 은 `community == serviceKey` 가정 0 |
| `ForumQueryService` (KPA 홈/포럼 허브 · KCos 홈 · Neture 홈) | community scope 에 **서비스 경계 없음** — 어느 서비스 홈이든 전 서비스 포럼 노출(선행 누출) | `LEGACY_COMMUNITY_SCOPE` | `config.communityKey` → 원장 코드 집합 필터 (KPA pharmacy · KCos cosmetics · Neture o4o-general) |
| PH `/home/latest` forum 축 | `service_code = 'pharmacy-hub'` | `LEGACY_COMMUNITY_SCOPE` | `communityForumStorageCodes('pharmacy')` |
| Neture `neture-home-news.controller` (`service_code='neture'` 「O4O 서비스 소식」 slug) | 특정 포럼 1개 조회 | 구현 seed (o4o-general 저장 코드) | 무변경 |
| forum operator/admin/category-requests routes (`/api/v1/forum/operator|admin|category-requests?serviceCode`) · `forum-request.service` · `forumHardDelete` · `marketTrialOperatorController` | 운영자 governance | `REAL_SERVICE_SCOPE` | 무변경 (참여 자격 ≠ 운영 권한, WO §19) |
| `cms_contents.serviceKey` (Community Content `authorRole='community'` · Resources) | serviceKey read 경계(cms-core, F10 Core) · 운영자 승인 · Service Content 와 원장 공유 | `SHARED_STORAGE_FIELD` (Service Content 의 REAL_SERVICE_SCOPE 겸용) | **EXISTING_BOUNDARY_REUSED** — 논리 귀속은 Catalog capabilities/policy · Core 재작성 0 (§2 D8) |
| `lms_courses.service_key` · `lms-service-scope.ts` (course scope · operator approval · enrollment · points) | 실제 Service domain | `REAL_SERVICE_SCOPE` | **EXISTING_BOUNDARY_REUSED** (WO §23) |
| `organization_service_enrollments.service_code` · `operator_notification_settings.service_code` 등 | Store/운영 도메인 | `REAL_SERVICE_SCOPE` | 무변경 |
| 대표 홈 `home-entry.ts` 「커뮤니티」 그룹 | `isActive('kpa-society'|'pharmacy-hub')` + `Neture 커뮤니티` 하드코딩 | Community = Service 가정 | `GET /communities` 만 소비 · 참여 가능 Community 만 · 이용 중 서비스의 surface 로 handoff |
| 서비스 web 포럼 페이지(KPA `/forum` · PH `/forum` · KCos `/forum` · Neture `/community`) | 서비스 route 로 공통 API 호출 | KEEP_AS_CONTEXT_ALIAS | 무변경 (같은 Community 데이터를 본다) |

### 1-2. 프로덕션 read-only census (§38 · 2026-09-16 · 집계만 · Cloud SQL Auth Proxy)

- `forum_category_requests` service_code × status: kpa-society completed 2 · archived 1 / neture completed 2 · rejected 1 / pharmacy-hub rejected 1 (전부 organization_id NULL = community scope). k-cosmetics 0.
- `forum_post`: kpa-society 6(작성자 3) · neture 1 · forum_id NULL 1(고아). → 약사 커뮤니티 합집합 = KPA 포럼 2 + PH 0 (PH 회원이 KPA 포럼을 보게 되는 것이 목표 구조).
- `service_memberships` active: kpa-society 6 · pharmacy-hub 10 · k-cosmetics 5 · neture 7 · kpa-branch 3 · platform 7. **KPA+PH 4 · PH-only 6 · KPA-only 2 · KCos 5** — Scenario B(PH-only) 실 사용자 6명이 존재.
- Community Content(`cms_contents authorRole='community'`): pharmacy-hub archived 2. LMS: kpa-society 8 · pharmacy-hub 3.
- 판정: 데이터가 작고 단순하다. 물리 rename 없이 adapter 로 목표 구조가 성립하므로 migration · 삭제 · bridge 0 (WO §25 · §26 — 데이터 보존이 설계 제약이 아니었고, 단순한 쪽이 adapter 였다).

### 1-3. Legacy service-scoped route 판정 (§27)

| route | 판정 | Community |
|---|---|---|
| `/api/v1/kpa/forum/*` | KEEP_AS_CONTEXT_ALIAS | pharmacy |
| `/api/v1/pharmacy-hub/forum/*` | KEEP_AS_CONTEXT_ALIAS | pharmacy |
| `/api/v1/cosmetics/forum/*` | KEEP_AS_CONTEXT_ALIAS | cosmetics |
| `/api/v1/neture/forum/*` | KEEP_AS_CONTEXT_ALIAS (o4o-general 의 유일 surface — TEMP_COMPAT 아님) | o4o-general |
| `/api/v1/forum/*` (generic/admin · operator · category-requests) | KEEP (governance · 무경계) | — |
| `/api/v1/communities` · `/communities/:key/access` | 신설 (read-only) | catalog |
| RETIRE | 0 | |

---

## 2. 결정 (§2 ~ §30)

| # | 결정 | 근거 |
|---|---|---|
| D1 | Catalog SSOT = `config/community-catalog.ts` · `CommunityDefinition {key,name,status,participationPolicy,capabilities,forumStorageCodes,entries}` · key 는 string · policy 2종만 | WO §4 · §5 |
| D2 | Community key 는 Service Identity 집합과 겹치지 않는다 · policy/entries 의 serviceKey 는 canonical Service Identity 만 | §2 Identity 분리 |
| D3 | 참여 판정 = `resolveCommunityAccess` 순수 함수(JWT `user.memberships` = 기존 forum write gate 와 동일 소스) · `platform:super_admin` 만 기존과 같은 bypass · membership/role/enrollment 생성 0 | §10 · §11 |
| D4 | Forum 경계 = `ForumContext.communityKey` → `getContextForumCodes` 한 곳. communityKey 없는 컨텍스트(kpa-branch organization scope 등)는 종전 serviceCode 경계 그대로 · 미등록 key 는 fail-closed | §7 · §20 |
| D5 | 물리 `service_code` rename 안 함 (파티션 + governance 겸용 = 실제 Service scope) → Catalog `forumStorageCodes` adapter. dual-read · dual-write · bridge · lineage 0 | §9 |
| D6 | 약사 커뮤니티 = KPA + PH 원장 합집합 · 쓰기 자격 = kpa-society OR pharmacy-hub (KPA route 도 동일 가드 — 종전 authenticate-only 에서 참여 자격 강제로) · PH 서비스 전용 membership 가드 제거 | §14 · §36 · §37 |
| D7 | 운영 governance(포럼 개설 승인 · 중재 · closed forum bypass · operator/admin routes) = 각 forum 의 service_code 서비스 운영자 그대로 (KPA 운영자 ↔ kpa-society 포럼, PH 운영자 ↔ pharmacy-hub 포럼). 다중 운영 governance engine 0 | §19 |
| D8 | Content · Resources · Education = EXISTING_BOUNDARY_REUSED (cms-core F10 · LMS 계약이 실제 Service scope 와 공유) · Catalog capabilities 로 논리 귀속만 표현 | §21 · §22 · §23 |
| D9 | 공개 read 정책 무변경 — `/communities` 는 비로그인도 200(canParticipate=false · AUTH_REQUIRED) · forum GET 은 종전 optionalAuth | §13 |
| D10 | 대표 홈 「커뮤니티」 = `/communities` 목록 · canParticipate 만 · 진입 surface 는 Neture 내부 > 이용 중 서비스 > 첫 entry · 배포 간극(API 404) 동안은 커뮤니티 그룹만 비운다(홈 전체 error 아님) | §17 · §18 |
| D11 | Industry 모델 0 · "Neture Community" identity 0 (o4o-general 저장 코드 `neture` 는 seed) | §16 · §30 |
| D12 | 서비스 web 포럼 UI 무변경 (라우트·API 동일, 데이터가 Community 로 합쳐짐) | §7 wrapper 보존 |

---

## 3. 변경 파일

**api-server (runtime)**
- `src/config/community-catalog.ts` — 신설 (SSOT)
- `src/utils/community-access.resolver.ts` — 신설 (resolveCommunityAccess · listCommunitiesForUser · communityForumStorageCodes)
- `src/routes/communities.routes.ts` — 신설 · `src/bootstrap/register-routes.ts` mount `/api/v1/communities`
- `src/middleware/forum-context.middleware.ts` — `ForumContext.communityKey?`
- `src/controllers/forum/ForumControllerBase.ts` — `getContextForumCodes` · IN/ANY 경계 · `ForumDirectoryController.ts` · `ForumPostController.ts`(slug · popular tags)
- `src/routes/forum/service-forum.routes.ts` — `requireCommunityAccess` · communityKey 자동 해석 · write 가드 순서
- `src/routes/kpa/kpa.routes.ts`(remount communityKey + pharmacyWrite · ForumQueryService communityKey) · `routes/pharmacy-hub/pharmacy-hub.routes.ts`(mount · home/latest) · `routes/cosmetics/cosmetics.routes.ts` · `routes/neture/neture.routes.ts` · `routes/neture/controllers/neture.controller.ts`
- `src/modules/forum/forum-query.service.ts` — `communityKey` 경계 (선행 누출 CLOSED)

**api-server (tests)** — `src/__tests__/community-workspace-catalog-and-access.spec.ts`(신설 · 28) · 갱신 3(`community-forum-interaction-and-write-boundary-commonization` stub ANY · `pharmacy-hub-community-baseline` · `pharmacy-hub-community-capability-adoption`)

**web-neture** — `src/lib/home-entry.ts`(`/communities` · 커뮤니티 그룹) · `src/lib/__tests__/home-entry.communities.test.ts`(신설 · 5) · `src/components/home/__tests__/HomeEntryPanel.back-navigation.test.tsx`(fixture)

**docs** — `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md`(§5 재작성 · §4-1 · §9-1 7·8단계) · `docs/CANONICAL-INDEX.md`(ROLE-WORKSPACE 행 설명 "Industry Community" → Community Workspace) · `docs/o4o-common-structure.md`(§5 Forum 경계 = communityKey 1줄) · `docs/checks/CHECK-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1.md`(구현 commit 행 정정 — API deploy failure 오기 수정) · 본 CHECK

**무변경(명시)**: forum-core 패키지 · `ForumController` facade · operator/admin/category-request forum routes · cms-core · LMS Core · KPA/PH/KCos web 포럼 페이지 · security-core · RBAC · migrations · package.json · lockfile.

---

## 4. 검증 (§34)

| 검증 | 결과 |
|---|---|
| api-server `tsc --noEmit` | PASS |
| web-neture `tsc` · `vite build` | PASS |
| web-kpa-society · web-pharmacy-hub · web-k-cosmetics `tsc --noEmit` | PASS ×3 (프런트 무변경 · 확인용) |
| api-server jest `community-workspace-catalog-and-access.spec.ts` | **28/28 PASS** — Catalog(6: 초기 3 · policy · Identity 분리 · policy 2종 · Industry/Neture identity 0 · entries 역해석) · **Scenario A~E**(8: B 의 membership 생성 0 · pending/alias · Neture 불요) · **Pharmacy 동일성**(5: KPA ctx == PH ctx == [kpa-society, pharmacy-hub] · legacy/무경계/fail-closed · 4 mount · 홈 피드) · **Leakage**(4: KCos-only→pharmacy 403 · non-member 403 · 비로그인 401 · PH-only 통과 · authenticated→o4o-general 통과 · 가드 순서) · Core 재사용(5: 사본 0 · if 0 · 새 테이블/migration 0 · communities read-only · 홈 추론 0) |
| api-server jest 회귀 13 suites(forum · community · pharmacy-hub-community · service-tenant · store/supplier/service-operator workspace) | **267/267 PASS** (갱신 3 spec 포함) |
| web-neture vitest (`home-entry.*` 4 · `HomeEntryPanel` 8) | **30/30 + 8 PASS** — Scenario B/E/D 진입 · 목록 없으면 추론 0 · KPA+PH 도 진입 1 |
| `node scripts/lint-ratchet.mjs` | 본 WO 파일 오류 0 · 전체 47 > 46 (선행 WO 와 동일 · 무관 파일, 별도) |
| 프로덕션 read-only census | §1-2 (write 0) |

### 4-1. Production smoke (§39) — **PARTIAL_API_DEPLOY_BLOCKED**

**실행**: 2026-09-16, `c1fc325d8` web 배포 성공 후 Playwright(headless) · 프로덕션 read-only(write 0) · `sohae2100` L1 토큰 주입 우회(TEST-ACCOUNTS §4-2, 로그인 검증 아님).

| # | 항목 | 결과 | 확인 내용 |
|---|---|---|---|
| S1 | `GET /api/v1/communities` | **BLOCKED** | 404 — API 배포가 선행 migration Job 실패로 차단(F1). Catalog · access · Forum 합집합은 프로덕션에 미도달 |
| S2 | O4O Home(neture.co.kr) 배포 간극 fallback | PASS | `/communities` 404 인데 홈 전체 error 배너 없음(`불러오지 못했습니다` 0) · 「내 매장」 · 「서비스 운영자 화면」(5행) 정상 · 「커뮤니티」 그룹은 목록이 없어 비표시(설계 D10). telemetry: 404 1건(= S1) 외 clean |
| S3 | KPA `/kpa/forum/categories` · PH `/pharmacy-hub/forum/categories` (read-only) | INFO | 구 API 기준: KPA 2 forum · PH 0 → 아직 별도 (API 배포 후 두 목록이 pharmacy 합집합으로 같아져야 함 — spec 이 계약 고정) |
| S4 | KPA member / PH member / KCos member / generic user 별 Community 진입 | **BLOCKED** | S1 과 같은 이유. 시나리오 A~E · PH-only 접근 · 누출 차단은 unit spec 28 로 검증(§4) |
| S5 | write smoke | 미실행 | 안전한 테스트 데이터 없음 (WO §39) |

**한계(숨기지 않음)**: backend 동작 전부가 API 배포 차단에 걸려 있다. 차단 해소(별도 WO, F1) 후 S1·S3·S4 를 재실행해야 PASS 로 바뀐다 — 그때까지 프로덕션 커뮤니티 동작은 종전(서비스별 격리)과 같다.

#### 4-1-a. 재실행 (2026-09-17 · API 배포 해소 후 — Deploy API `bbd61992a` success, `c1fc325d8` 포함)

| # | 항목 | 결과 | 확인 내용 |
|---|---|---|---|
| S1' | `GET /api/v1/communities` (비로그인) | **PASS** | 200 · `pharmacy:false · cosmetics:false · o4o-general:false` (AUTH_REQUIRED — 공개 read 와 분리된 참여 판정, D9) |
| S3' | KPA `/kpa/forum/categories` vs PH `/pharmacy-hub/forum/categories` (read-only) | **PASS** | 두 목록 동일 = `["O4O 서비스 소식","kpa-society 개선"]` — **약사 커뮤니티 동일성(§36) 프로덕션 실측**. 종전(S3) 에는 PH 0건이었음 |
| S4' | 로그인 계정별 Community 참여(A~E) · O4O Home 커뮤니티 카드 | **BLOCKED_CREDENTIALS** | `sohae2100` L1 로그인 401 INVALID_CREDENTIALS(최초 시도) → 재시도 후 403 `ACCOUNT_LOCKED`(2026-09-17T10:44Z 까지). 로컬 TEST-ACCOUNTS 의 L1 값이 프로덕션과 불일치(교체 추정) — 추측 금지 원칙에 따라 중단. 계정 소유자가 §1 표를 갱신하면 재실행 |
| S5' | write smoke | 미실행 | 안전한 테스트 데이터 없음 (WO §39) |

---

## 5. Re-census (§40)

| 기준 | 결과 |
|---|---|
| Community Catalog SSOT | 1 (`community-catalog.ts`) |
| Community Identity ≠ Service Identity | ✅ key 집합 disjoint · Service 는 policy 조건일 뿐 (spec) |
| community-specific hardcoded access branches | 0 (`=== 'pharmacy'` 등 Forum Core/홈 0 · 판정은 resolver 1곳) |
| pharmacy / cosmetics / o4o-general access | kpa-society OR pharmacy-hub / k-cosmetics / authenticated (spec A~E) |
| new Community membership table · policy engine | 0 / 0 |
| Forum Core 복제 · Content/Resources/LMS Core 신규 복제 | 0 / 0 |
| Industry Community canonical references | 0 (ROLE-WORKSPACE §5·§4-1·§9-1 · CANONICAL-INDEX 설명 정정) |
| Neture Community canonical identity | 0 (o4o-general) |
| PH separate pharmacy Community | 0 (같은 communityKey · 원장 합집합) |
| Legacy route | 4 KEEP_AS_CONTEXT_ALIAS · RETIRE 0 · COMPAT_REDIRECT 0 |
| semantic drift | 물리 `service_code` 겸용은 adapter 로 설명됨(D5) · Content/LMS 는 EXISTING_BOUNDARY_REUSED 로 명시(D8) |

---

## 6. 문서 정합 (§33 · CLAUDE.md §16)

| 문서 | 발견 | 처리 |
|---|---|---|
| `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` §5 · §4-1 · §9-1 | Industry Community 방향 · 7단계 미완 | **UPDATE** (WO §31 · §32 명시) |
| `docs/CANONICAL-INDEX.md` ROLE-WORKSPACE 행 | 설명에 "Industry Community" | **기계적 설명 정정** (판정/상태 열 무변경) |
| `docs/o4o-common-structure.md` §5 | "데이터는 서비스 기준 → serviceKey 격리" 가 Forum 에도 적용되는 것으로 읽힘 | **1줄 보강** (Forum 경계 = communityKey) |
| `PLATFORM-CONTENT-POLICY-V1`(F4) §6.4 커뮤니티 `serviceKey = current` | Community Content 는 이번 단계 EXISTING_BOUNDARY_REUSED 라 현행과 일치 · 향후 communityKey 귀속 시 정정 필요 | 보고 — 별도 WO 제안(F2) |
| `KPA-SOCIETY-SERVICE-STRUCTURE` §3.1 "Forum 은 커뮤니티 서비스의 기능" | KPA 내부 서비스 분류 표현 — Forum 이 이제 약사 커뮤니티(pharmacy, PH 와 공유)임을 담지 않음 | 보고 — 별도 WO 제안(F3) (§16-6 애매 → 보고) |
| `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1` · KCos · Neture 관련 active docs | "PH 별도 약사 커뮤니티" · "Neture Community" 표현 검색 결과 0 | 해당 없음 |
| 과거 WO/CHECK/IR | 구 표현 | 기록물 — 무수정 |

**문서 정합: 발견 5건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건**

---

## 7. 후속 (FOLLOWUP)

| # | 항목 | 성격 |
|---|---|---|
| F1 | **API 배포 차단**: `7f4f6eb26` 부터 Deploy API migration Job 실패(`expected-schema-states` 5번째 미등록, 타 세션 PHASE 1). 본 WO 의 backend(community access · forum 합집합 · `/communities`)는 그 수리 후에야 프로덕션에 도달 | 별도 WO (타 세션 소관) |
| F2 | Community Content / Resources 의 `communityKey` 귀속 (cms-core read 경계 확장) + `PLATFORM-CONTENT-POLICY-V1` §6.4 정정 | 판정 대기 (F4/F10 Frozen 접촉) |
| F3 | `KPA-SOCIETY-SERVICE-STRUCTURE` §3.1 Forum ↔ pharmacy Community 정합 | 문서 WO |
| F4 | 서비스 web 포럼 페이지에 Community 이름(약사 커뮤니티 등) 표시 · `CommunitySelector` 공통 UI (현재는 대표 홈 목록으로 충족) | UI WO |
| F5 | forum_post forum_id NULL 고아 1건 (선행) | 데이터 정리 |
| F6 | 다음 = Final Role Workspace Census (ROLE-WORKSPACE §9-1 8단계) | 다음 WO |

---

## 8. 최종 판정

```
COMMUNITY_WORKSPACE          = PASS
COMMUNITY_CATALOG            = PASS (config/community-catalog.ts · SSOT 1)
COMMUNITY_CORE               = PASS (Forum 공통 Core 1 · communityKey 컨텍스트)

COMMUNITY_IDENTITY_INDEPENDENT_FROM_SERVICE = PASS

INITIAL_COMMUNITIES          = 3

PHARMACY_COMMUNITY           = PASS
PHARMACY_ACCESS              = kpa-society OR pharmacy-hub

COSMETICS_COMMUNITY          = PASS
COSMETICS_ACCESS             = k-cosmetics

O4O_GENERAL_COMMUNITY        = PASS
O4O_GENERAL_ACCESS           = authenticated O4O user

NEW_COMMUNITY_MEMBERSHIP_TABLE = 0
NEW_POLICY_ENGINE              = 0

FORUM_COMMON_CORE            = PASS
CONTENT_COMMON_CORE          = EXISTING_BOUNDARY_REUSED
RESOURCES_COMMON_CORE        = EXISTING_BOUNDARY_REUSED
EDUCATION_COMMON_CORE        = EXISTING_BOUNDARY_REUSED

PH_SEPARATE_COMMUNITY        = 0
NETURE_COMMUNITY_IDENTITY    = 0
INDUSTRY_COMMUNITY           = RETIRED

LEGACY_DATA_COMPLEXITY       = 0 (adapter 1 · migration 0 · bridge 0)
LEGACY_ROUTE_COMPAT          = /kpa/forum · /pharmacy-hub/forum · /cosmetics/forum · /neture/forum = KEEP_AS_CONTEXT_ALIAS (RETIRE 0)

PRODUCTION_SMOKE             = PARTIAL_CREDENTIALS (2026-09-17 재실행: API 배포 해소 · /communities 200 · KPA=PH 포럼 목록 동일 실측 PASS · 로그인 시나리오는 smoke 계정 L1 불일치+lock 으로 BLOCKED — §4-1-a; unit 28 로 대체 검증)

NEXT                         = GO_FINAL_ROLE_WORKSPACE_ARCHITECTURE_CENSUS
```
