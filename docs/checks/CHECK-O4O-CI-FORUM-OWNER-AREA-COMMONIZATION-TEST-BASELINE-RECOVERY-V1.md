# CHECK-O4O-CI-FORUM-OWNER-AREA-COMMONIZATION-TEST-BASELINE-RECOVERY-V1

- **WO**: `WO-O4O-CI-FORUM-OWNER-AREA-COMMONIZATION-TEST-BASELINE-RECOVERY-V1`
- **작성일**: 2026-08-21
- **기준 commit**: `eb7d814f0` (origin/main) — fresh worktree `C:/tmp/o4o-forum-owner`
- **판정**: **STALE_TEST** — 제품 회귀 아님. 테스트만 최소 수정(단, 완화가 아니라 **강화**)

---

## 1. CI 실패 재현 (§3)

| 항목 | 값 |
|------|-----|
| CI run | `32448253785` — 실패 step은 `Run tests (api-server Jest)` 하나 |
| 실패 test | `서비스 고유 정책이 보존된다 › Pharmacy-Hub — 소유자 영역을 신설하지 않는다 (census NOT_IMPLEMENTED 유지)` |
| 로컬 재현 | `npx jest src/__tests__/forum-owner-area-commonization.spec.ts --maxWorkers=1` → exit 1, `Tests: 1 failed, 54 passed, 55 total` |
| expected | `[]` |
| actual | `["pages\forum\ForumMemberManagementPage.tsx", "pages\forum\MyForumDashboardPage.tsx", "services\forumOwnerAdapter.ts"]` |
| 검사 방식 | `services/web-pharmacy-hub/src` 전체를 walk 하며 `.ts(x)` 중 문자열 `ForumOwner` 포함 파일을 수집, 0건을 기대 |

## 2. provenance (§5)

| commit | 내용 | 관계 |
|--------|------|------|
| `7bea07680` | `WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1` — 공통 View 추출 + 본 spec 최초 도입 | spec 도입(선행) |
| `ee8ba929f` | `WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1` — PH 커뮤니티 포럼 capability 공통 채택. PH 3파일 신설 | **최초 FAIL 유입(후행)** |

즉 직전 PASS → 최초 FAIL 경계는 `ee8ba929f` 이며, 그 커밋은 **승인된 WO 에 따른 정상 채택**이다
(CHECK: `docs/investigations/CHECK-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1.md`).

## 3. 테스트가 의미하는 실제 계약 (§4)

이 spec 의 축은 "**복제(VIEW_DUPLICATED) 로 돌아가지 못하게 정적으로 고정**"이다(파일 헤더 명시).
문제의 단언은 그 축이 아니라 **census 시점의 사실 스냅샷**(PH = NOT_IMPLEMENTED)을 고정한 것이다.

구분 결과:

| 대상 | 이번 실패와의 관계 |
|------|-------------------|
| Forum 전용 owner area (공통 View wrapper) | **해당** — PH 가 채택으로 신설 |
| PharmacyHub StoreOwnerShell / 내 매장 | 무관 (건드리지 않음) |
| `/store-owner` route | PH 에 존재하지 않음, 무관 |
| 서비스별 복제 View | **0건** — PH 는 복제가 아니라 공통 소비 |

## 4. PharmacyHub route/page census (§6) — 미조사 0

| route | page/component | shell | inbound 진입점 | backend | 공통 여부 | 분류 |
|-------|----------------|-------|----------------|---------|-----------|------|
| `/forum` | `ForumHubPage` | MembershipGate + 공통 `ForumHubTemplate` | GNB 커뮤니티 > 포럼 | `/api/v1/pharmacy-hub/forum/*` | 공통 | FORUM_SHARED |
| `/forum/posts` | `ForumListPage` | 공통 | 커뮤니티 메뉴 | 동일 | 공통 | FORUM_SHARED |
| `/forum/posts/:postId` | `ForumDetailPage` | 공통 | 목록 | 동일 | 공통 | FORUM_SHARED |
| `/forum/write`, `/forum/edit/:postId` | `ForumWritePage` | 공통 | 목록/상세 | 동일 | 공통 | FORUM_SHARED |
| `/forum/my-posts` | `MyPostsPage` | 공통 | GNB 내 글 | 동일 | 공통 | FORUM_SHARED |
| `/forum/request` | `RequestForumPage` | 공통 `ForumRequestForm` wrapper | GNB 포럼 개설 신청 | 동일 | 공통 | FORUM_SHARED |
| `/forum/my-dashboard` | `MyForumDashboardPage` (39줄 wrapper) | 공통 `ForumOwnerDashboard` | GNB 내 포럼 | 동일 | 공통 | FORUM_SHARED (owner) |
| `/forum/my-dashboard/:forumId/members` | `ForumMemberManagementPage` (28줄 wrapper) | 공통 `ForumOwnerMemberManagement` | 대시보드 카드 | 동일 | 공통 | FORUM_SHARED (owner) |
| `/community`, `/community/search` | `CommunityHomePage`/`CommunitySearchPage` | 공통 `StandardHomeTemplate` | GNB | 동일 | 공통 | FORUM_SHARED |
| `/operator/forum*` (5) | Operator 콘솔 | Operator 셸 | 운영자 메뉴 | operator API | 공통 | SERVICE_SPECIFIC(운영자 축, 이번 범위 밖) |

- `FORUM_OWNER_SPECIFIC`(PH 자체 재구현) = **0건**
- `DEAD` = **0건** (GNB 의 `내 포럼`·`포럼 개설 신청` 모두 App.tsx 에 실등재)
- `PHARMACYHUB_STORE_OWNER`(매장 경영자 영역) = 이번 축과 **무관**, 미접촉

## 5. 5서비스 대조 (§7)

| 서비스 | 대시보드 (LOC) | 회원관리 (LOC) | adapter (LOC) | 구조 |
|--------|---------------:|---------------:|--------------:|------|
| KPA-Society | 52 | 31 | 56 | 공통 View + adapter (마이페이지 소속) |
| GlycoPharm | 40 | 31 | 58 | 공통 View + adapter |
| K-Cosmetics | 40 | 29 | 53 | 공통 View + adapter |
| Neture | 43 | **없음(정책)** | 46 | 공통 View + adapter (폐쇄형 회원관리 미도입) |
| **Pharmacy-Hub** | **39** | **28** | **54** | 공통 View + adapter — 다른 서비스와 **동일 구조** |

5서비스 모두 동일한 shared Forum owner core(`@o4o/shared-space-ui/forum-owner`)를 소비하며,
차이는 endpoint 배선 · accent · links · slot 뿐이다. **PharmacyHub 만의 회귀는 없다.**

## 6. 판정 (§8)

**STALE_TEST (B)**.

- PH 소유자 영역은 승인 WO 에 따른 **정상 공통 채택**이며 복제가 아니다(39/28/54줄 wrapper).
- 같은 저장소의 후속 spec `pharmacy-hub-community-capability-adoption.spec.ts` 는 정반대로
  **PH 가 `ForumOwnerDashboard`/`ForumOwnerMemberManagement` 를 소비할 것**을 단언한다(119~127행).
  즉 두 spec 이 직접 충돌했고, 낡은 쪽은 census 스냅샷을 고정한 이전 단언이다.
- 따라서 **코드는 수정하지 않고 테스트만** 현재 canonical 구조에 맞춘다.

## 7. 테스트 수정 내용과 근거 (§9)

수정 파일: `apps/api-server/src/__tests__/forum-owner-area-commonization.spec.ts` (**유일한 변경 파일**)

| # | 변경 | 근거 |
|---|------|------|
| 1 | `CENSUS_PAGES`(기존 4서비스 7화면) / `ADOPTED_PAGES`(PH 2화면) 분리, `ALL_PAGES` = 합집합 | census `before` LOC 가 없는 채택분을 감축 총량 단언에서 분리하되, 공통 소비·복제 지문 검사에는 **포함**시키기 위함 |
| 2 | PH 2화면이 `공통 컴포넌트 소비` · `복제 지문 0` 단언 대상에 편입 | 채택 서비스도 동일 계약으로 고정 |
| 3 | PH 2화면 wrapper 상한(≤ 80줄) 단언 추가 | 채택분이 나중에 자체 구현으로 부풀지 못하게 |
| 4 | `ADAPTERS` 에 PH adapter 추가 → accent 9토큰·동적 클래스 금지·자체 mapper 금지·≤70줄 단언 적용 | 다른 4서비스와 동일 계약 |
| 5 | tailwind content 스캔 단언을 4서비스 → **5서비스**로 확대 | PH 도 shared-space-ui purge 회귀 대상 |
| 6 | `Pharmacy-Hub — 소유자 영역을 신설하지 않는다` → **`소유자 영역은 공통 View 채택으로만 존재한다 (자체 재구현 0)`** 로 교체. `ForumOwner` 를 포함하는 PH 파일 집합이 정확히 `pages/forum/MyForumDashboardPage.tsx` · `pages/forum/ForumMemberManagementPage.tsx` · `services/forumOwnerAdapter.ts` **3곳과 일치**해야 하고, 그 소비가 `@o4o/shared-space-ui` / `createForumOwnerApi` / `createForumOwnerMembershipApi` 여야 함을 단언 | 계약을 "없어야 한다"에서 "있다면 공통으로만 있어야 한다"로 이동. 파일이 하나라도 늘면 실패 → **약화 아님** |

**금지 항목 위반 0**: `toBeTruthy` 수준 약화 없음 / case 삭제 없음 / `skip`·`todo` 없음 / 파일명 변경 회피 없음 / 문자열 blacklist 치환 없음.
**제품 코드 변경 0** — route·component·menu·backend 모두 무수정.

**부정 검증(negative probe)**: PH `src/pages/forum/` 에 `ForumOwner` 문자열을 포함한 더미 파일 1개를 임시 추가하자 새 단언이 곧바로 **FAIL**(`1 failed`) 했고, 제거 후 다시 PASS. 회귀 탐지력이 살아 있음을 확인했다(더미 파일은 커밋되지 않았다).

## 8. 검증

| 검증 | 결과 |
|------|------|
| `forum-owner-area-commonization.spec.ts` (수정 전) | FAIL — `1 failed, 54 passed, 55 total` |
| `forum-owner-area-commonization.spec.ts` (수정 후) | **PASS — `65 passed, 65 total`** (단언 55 → 65, 삭제 0) |
| 관련 Forum tests | (§8-1) |
| api-server 전체 Jest (CI 동일: `npx jest --maxWorkers=1`) | (§8-2) |
| frontend type-check baseline | (§8-3) |
| 실제 GitHub Actions | (§8-4) |

### 8-1. 관련 Forum tests
아래 Forum/Community/PharmacyHub 관련 spec 10개가 전체 실행에 포함돼 **전부 PASS**:
`forum-owner-area-commonization` · `pharmacy-hub-community-capability-adoption` · `pharmacy-hub-community-baseline` ·
`community-crossservice-my-posts-contract` · `community-forum-interaction-and-write-boundary-commonization` ·
`community-forum-content-server-normalization` · `community-forum-orphan-write-guard` ·
`community-content-resource-frontend-view-commonization` · `glycopharm-forum-service-boundary` · `market-trial-neture-forum-sync`.
특히 정반대 계약을 단언하던 `pharmacy-hub-community-capability-adoption` 과 **동시 PASS** 한다(계약 충돌 해소).

### 8-2. api-server 전체 Jest
`cd apps/api-server && npx jest --maxWorkers=1` → **exit 0**
`Test Suites: 172 passed, 172 total` / `Tests: 2786 passed, 2786 total` / FAIL suite **0**.
알려진 forum-owner-area 실패 = 0, 이번 수정으로 인한 신규 Jest 실패 = 0, 새로 드러난 기존 실패 = 0.

### 8-3. frontend 영향 (§13)
변경 파일은 `apps/api-server/src/__tests__/*.spec.ts` **1개(test-only)** 이고 frontend route/component/config 변경은 **0건**이다.
따라서 §13 에 따라 5서비스 production build 를 강제하지 않는다. frontend type-check baseline 유지 여부는
실제 CI 의 `Run TypeScript check (Frontend only)` step 으로 확인한다(§8-4).

### 8-4. 실제 GitHub Actions (§15)
워크플로 `CI Pipeline` / job `Code Quality Check` 기준 (`main` push).

| run | headSha | Frontend type-check | App Store / api-server type-check | ESLint ratchet | api-server Jest | run 결론 |
|---|---|---|---|---|---|---|
| `32448253785` | `46216e841` (본 WO 이전) | success | success | success | **failure** — forum-owner-area spec | failure |
| `32449459615` | `564f27890` (타 WO) | success | success | **failure (70 > 69)** | skipped | failure |
| `32450858719` | `c3e99f85c` (타 WO) | success | success | **failure (70 > 69)** | skipped | failure |
| `32451405784` | `20800d2ca` (**본 WO**) | **success** | success | **failure (70 > 69)** | skipped | failure |

판정:

- §15 전제 중 **`Run TypeScript check (Frontend only)` 는 PASS 유지**가 실제 CI 에서 확인됐다
  (선행 WO `WO-O4O-CI-FRONTEND-TYPECHECK-BASELINE-RECOVERY-V1` baseline 유지).
- §15 의 **`Run tests (api-server Jest)` 는 CI 에서 관측하지 못했다.** 이유는 본 WO 의 변경이 아니라,
  같은 job 에서 **앞선 step 인 `Run ESLint (regression ratchet)` 이 실패해 Jest step 이 `skipped`** 되기 때문이다.
- 이 ESLint 실패는 **본 WO 이전부터 존재**한다. 직전 커밋 `c3e99f85c` · `564f27890` 에서 동일 메시지
  (`ESLint: 70 errors, 2303 warnings (error baseline 69)`) 로 이미 실패했고, lint 오류 목록에
  `forum-owner-area-commonization` 은 **0회** 등장한다.
- 따라서 본 WO 범위의 Jest 계약은 **CI 와 동일 조건의 로컬 실행(§8-2, exit 0 / 2786 passed)** 으로 확정하고,
  CI 측 최종 확인은 아래 §9 부채가 해소된 직후 run 에서 자동으로 관측된다.

### 8-5. before / after

| 항목 | before (`46216e841`) | after (`20800d2ca`) |
|---|---|---|
| `forum-owner-area-commonization` | 1 failed / 54 passed | **0 failed / 65 passed** |
| api-server 전체 Jest | FAIL (1 suite) | **PASS (172/172, 2786 tests)** |
| `pharmacy-hub-community-capability-adoption` 와의 계약 | 정면 충돌 | 정합 |

## 9. 새로 드러난 CI 부채 (§12 별도 분류 — 본 WO 범위 밖)

| 항목 | 내용 |
|---|---|
| 현상 | `Run ESLint (regression ratchet)` 이 `70 > 69` 로 실패 → 이후 Jest·Vitest step 전부 `skipped` |
| 마지막 PASS | run `32448253785` (`46216e841`) |
| 최초 FAIL | run `32449459615` (**`564f27890`** — `WO-O4O-SERVICE-API-AUTHORIZATION-BOUNDARY-AUDIT-AND-HARDENING-V1`, 타 세션) |
| 원인 | `apps/api-server/src/__tests__/service-provisioning-guard.spec.ts:113` 의 `require()` 에 붙인 억제 주석이 **폐기된 규칙명**(`@typescript-eslint/no-var-requires`)이라 실제 규칙 `@typescript-eslint/no-require-imports` 를 억제하지 못함 → 신규 오류 1건이 baseline 69 를 초과 |
| 본 WO 와의 관계 | 무관. 본 WO 변경 파일은 lint 오류 목록에 등장하지 않음 |
| 조치 | **미수정**. CLAUDE.md 실행 원칙(범위 외 수정 금지)에 따라 보고 후 **별도 WO 로 분리**한다 |

> 참고로 같은 run 에는 `apps/api-server/src/__tests__/pharmacy-hub-community-capability-adoption.spec.ts:39`
> 의 `no-control-regex` 오류도 있으나, 이는 baseline 69 에 이미 포함된 기존 오류다.

## 10. Browser smoke 미수행 사유 (§14)

이번 변경은 **테스트 파일 1개**뿐이며 사용자 route·component·menu·backend 는 **한 줄도 바뀌지 않았다**.
따라서 배포도 browser smoke 도 필요하지 않다. PH 포럼 소유자 동선 자체의 브라우저 검증은
선행 WO(`WO-O4O-PHARMACYHUB-COMMUNITY-CAPABILITY-FULL-ADOPTION-V1`)의 CHECK 가 이미 담당한다.

## 11. 범위 밖 / 잔여

- Forum·Community 전체 공통화 재감사, PH 신규 기능, My Store·Store Hub·Operator·DB·RBAC 변경 — 모두 미수행(§16).
- PH `Content/Resources` 축은 선행 WO 에서 `pharmacy_hub_*` 테이블 부재로 중지 상태 — 이번 WO 와 무관.

## 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§9 ESLint ratchet 부채)
