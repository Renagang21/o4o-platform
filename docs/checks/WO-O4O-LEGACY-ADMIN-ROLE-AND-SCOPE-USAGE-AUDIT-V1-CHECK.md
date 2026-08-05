# WO-O4O-LEGACY-ADMIN-ROLE-AND-SCOPE-USAGE-AUDIT-V1 — CHECK

> **초기 권한 설계 잔재(`platform:admin` · `yaksa:*` · JWT scopes) 실사용·제거 영향 read-only 감사**
>
> 코드 변경 0 · DB write 0 · 역할 변경 0 · migration 0 · 배포 0

**최종 판정: `PASS_WITH_FOLLOWUP`**

---

## 1. 기준 커밋 · 조사 시각

| 항목 | 값 |
|------|------|
| 브랜치 | `main` |
| HEAD | `cf91949b51871c4586d0a08b7ca55099865c6ec1` |
| `origin/main` | `cf91949b51871c4586d0a08b7ca55099865c6ec1` (동일, ahead/behind 0) |
| 조사 시각 (UTC) | `2026-08-05T00:54Z` ~ `2026-08-05T01:20Z` |
| 프로덕션 API 호스트 | `https://api.neture.co.kr` (= Cloud Run `o4o-core-api`) |

**선행 근거 커밋 포함 확인 (`git merge-base --is-ancestor`)**

| 커밋 | HEAD 조상 여부 |
|------|:---:|
| `94a407e8a` — 관리자 계정·역할 census CHECK | ✅ YES |
| `84c3f0dbb` — 동 CHECK §20 커밋·push 결과 기재 | ✅ YES |

조사 도중 HEAD 가 `4656b5113` → `0c857f984` → `223832247` → `cf91949b5` 로 이동했다(타 세션의 easy-drug 재조립 및 dropshipping 레거시 제거 커밋). 본 CHECK 의 모든 코드 판정은 **최종 HEAD `cf91949b5` 기준**으로 재확인했다.

### 1-1. 호스트 확인 과정 (오판 방지 기록)

초기 probe 에서 `https://o4o-core-api-117791934476.asia-northeast3.run.app` 및 `gcloud run services describe` 가 반환한 `https://o4o-core-api-3e3aws7zqa-du.a.run.app` 양쪽 모두 `/health` 를 포함한 **전 경로가 404** 였다. 응답 본문이 애플리케이션 JSON 이 아니라 Google Frontend 의 HTML 404 였고, Cloud Run 로그에는 `✅ Yaksa routes registered at /api/v1/yaksa` 가 정상 기록되어 있었다. 즉 **run.app 직접 URL 은 실 진입점이 아니다.** 실 진입점 `https://api.neture.co.kr` 로 재측정하여 아래 §8 의 수치를 확정했다. run.app URL 의 404 를 "라우트 미등록" 으로 판정하지 않았다.

---

## 2. 작업 트리와 타 세션 WIP 보존

### 2-1. 사전 점검 시점 (조사 시작, HEAD `4656b5113`)

`git status --short` 결과 **staged 395건 + untracked 20건**이 존재했다. 전량 타 세션 작업물(dropshipping / sellerops / supplierops / pharmacyops / pharmaceutical-core 제거, HFF ZH 배치)이었고, 그 중에는 본인이 이전 작업에서 작성한 `apps/admin-dashboard/src/tests/admin-operation-boundary.test.ts` 에 대한 **타 세션의 -1 line staged 수정**도 포함되어 있었다.

WO 의 중지 조건("작업 트리가 clean 이 아니면 기존 변경을 수정·삭제·restore·stash 하지 않고 보고 후 중지한다")에 따라 **즉시 중지하고 사용자에게 보고**했다. 사용자가 "맞다 지금 dropshipping 는 제거 중이다. 이는 일단 제외하고 진행하는 것은 어떤가?" 로 **dropshipping 축 제외 + 나머지 3축 진행을 명시 승인**하여 재개했다.

### 2-2. 조사 종료 시점 (HEAD `cf91949b5`)

타 세션이 dropshipping 제거를 커밋·push 완료하여 index 가 비었다. 현재 잔존 상태:

| 구분 | 건수 | 내용 | 소유 |
|------|:---:|------|------|
| staged | **0** | — | — |
| modified | 2 | `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts`, `apps/api-server/src/scripts/hff-zh-b01-translate.mjs` | 타 세션 |
| untracked | 27 | `PharmacyHubStoreDashboardController.ts`, `hff-zh-b04-z*-translations-v1.json` ×18, `hff-zh-final-*.mjs` ×8 | 타 세션 |

### 2-3. 보존 확인

- 타 세션 파일을 **열람하지 않았고**, 수정·삭제·`restore`·`stash`·`unstage`·commit **모두 0건**이다.
- `git add .` / 디렉터리 pathspec 을 사용하지 않았다. `reset` · `clean` · `amend` · `force-push` 0건.
- 진행 중이던 dropshipping-admin 은퇴 작업에 어떤 개입도 하지 않았다. **파일 충돌 0건** (§검증-10 참조).

---

## 3. `platform:admin` 의 최초 목적과 현재 사용 결과

### 3-1. 최초 목적 (git 이력)

| 커밋 | 일자 | 성격 |
|------|------|------|
| `2adbf8e91` `feat(phase-4): implement multi-service role prefix enforcement` | 2026-02-05 | `apps/api-server/src/types/roles.ts` 에 `platform:admin` **최초 도입** |
| `20260205070000-Phase4MultiServiceRolePrefixMigration.ts` | 2026-02-05 | 특정 `service_key` 가 없는 기존 `admin` 보유자에게 `platform:admin` **자동 부여** |
| `cd7c8d9a1` `feat: Phase3-E RBAC legacy drop` | 2026-02-26 | `ROLE_REGISTRY` 에 `deprecated` 필드 도입 |
| `20260228000001-CleanupLegacyRoles.ts` | 2026-02-28 | 알려진 `platform:admin` 계정을 **서비스별 admin 으로 전환**하고 나머지에서 `platform:admin`·`platform:operator` **제거** |

즉 최초 목적은 **접두 없는 legacy `admin` 을 접두 체계로 옮기기 위한 과도기 버킷**이었다. 서비스 경계가 확정되면서 2026-02-28 마이그레이션이 이미 이 역할을 정리했고, 서비스별 admin 이 canonical 이 되었다.

### 3-2. 코드가 이미 deprecated 로 선언하고 있음

`apps/api-server/src/types/roles.ts` L234-266 — `ROLE_REGISTRY`:

| role | `deprecated` | description |
|------|:---:|------|
| `platform:super_admin` | `false` | Highest privilege, cross-service access |
| **`platform:admin`** | **`true`** | *"Platform administrator (deprecated — use service-specific admin)"* |
| **`platform:operator`** | **`true`** | *"Platform operator (deprecated — use service-specific operator)"* |
| `platform:manager` | `false` | — |

**코드가 이미 "서비스별 admin 을 쓰라"고 명시**하고 있다. 이번 감사는 이 선언과 실제 소비처가 일치하는지를 검증한 것이다.

### 3-3. 현재 프로덕션 보유 현황 (선행 census 근거)

| 항목 | 값 | 근거 |
|------|:---:|------|
| `platform:admin` 활성 보유 계정 | **0명** | `94a407e8a` CHECK §역할 census |
| `platform:operator` 활성 보유 계정 | **0명** | 동일 |
| `platform:super_admin` 로그인 가능 계정 | **2명** | 동일 (§C1 정정치) |

본 감사에서 DB 를 추가 조회하지 않았다 — 선행 census 가 확정한 사실을 재사용했다(§검증-11).

### 3-4. 참조 분포 (production / test / docs / migration 구분)

`.ts`/`.tsx` 전수 스캔 결과 **총 234 occurrence**.

| 영역 | occurrence | files | 성격 |
|------|:---:|:---:|------|
| `apps/api-server/src` | 181 | 90 | production 60 files + test 30 files |
| `apps/admin-dashboard/src` | 17 | 10 | production |
| `packages/*` | 11 | 4 | production |
| `services/web-*` | 25 | 25 | 대부분 주석·라벨 |
| `apps/main-site/src` | **0** | 0 | — |

**핵심 판정 근거 — 비대칭 분석.** `platform:admin` 이 등장하되 전후 ±6줄 안에 `platform:super_admin` 이 **없는** 지점은 39건이다. 전수 육안 확인 결과 **production 권한 부여 선언은 단 1건도 없다**:

| 분류 | 건수 | 예시 |
|------|:---:|------|
| migration (역사적 기록) | 19 | `20260205070000-Phase4...`, `20260228000001-CleanupLegacyRoles`, `20261027000000-MigrateLegacyRoles...` |
| JSDoc · 주석 · 에러 메시지 문자열 | 12 | `roles.ts:168,183`, `scope-assignment.utils.ts:10,38`, `glycopharm/admin.controller.ts:44`, `neture.controller.ts:390`, `security-core/types.ts:28` |
| 테스트 (오히려 **거부**를 단언) | 4 | `scope-guard.spec.ts:97,219,269` — *"platform:admin → denied (only super_admin bypasses)"* |
| `ROLE_REGISTRY` 정의 자체 | 2 | `roles.ts:244-245` |
| 프론트 — `expandRequiredRoles` 가 보완 | 1 | `dashboard.routes.tsx:72` (§4-3) |
| 프론트 — 상수 참조로 super_admin 포함 | 1 | `web-neture/lib/role-constants.ts:42` (`NETURE_ROLES.PLATFORM_SUPER_ADMIN` 심볼 사용) |

`modules/platform/platform-hub.controller.ts:40` 은 403 **메시지 문자열**만 `platform:admin required` 이고, 실제 판정은 L39 `isPlatformAdmin(roles)` 이므로 두 역할 모두 통과한다 — 비대칭이 아니다.

---

## 4. `platform:admin` 과 `platform:super_admin` 의 실질적 차이 — 필수 산출물 ②

| # | 기능군 | `platform:admin` 허용 | `platform:super_admin` 허용 | 서비스 admin·operator 허용 | 독립 용도 존재 | 제거 영향 |
|---|--------|:---:|:---:|:---:|:---:|------|
| 1 | 서비스 scope bypass (`extractServiceScope` → `injectServiceScope` → 운영자 콘솔 전체: Membership / Product / Store / Role) | ✅ | ✅ | ❌ (자기 서비스만) | **없음** — `isPlatformAdmin()` 이 두 역할을 동일 취급 | 없음 (보유자 0) |
| 2 | security-core scope guard `platformBypass` (neture / glycopharm / cosmetics 등) | **❌ 거부** | ✅ | ✅ (해당 서비스 접두 role) | **없음** | 없음 |
| 3 | Membership 관리자 subtree (`MEMBERSHIP_ADMIN_ROLES`) | ✅ | ✅ | ❌ | 없음 | 없음 |
| 4 | Admin Users API 역할 회수 (`ADMIN_ROLES`, `routes/admin/users.routes.ts:32`) | ✅ | ✅ | ❌ | 없음 | 없음 |
| 5 | 역할 카탈로그 CUD (`RoleController`, `scope.isPlatformAdmin`) | ✅ | ✅ | ❌ | 없음 | 없음 |
| 6 | Platform Hub 요약 (`platform-hub.controller.ts`) | ✅ | ✅ | ❌ | 없음 | 없음 |
| 7 | Yaksa 관리 subtree (`requireYaksaScope`) | ✅ | ✅ | ❌ | 없음 | 없음 (§8) |
| 8 | 마지막 `platform:super_admin` 삭제·회수 방어 | 해당 없음 | **보호 대상** | 해당 없음 | super_admin 고유 | — |
| 9 | 프론트 대시보드 진입 (`isDashboardRole`, `expandRequiredRoles`) | ✅ | ✅ | ✅ | 없음 | 없음 |

**결론:** `platform:admin` 이 `platform:super_admin` 보다 **더 넓은 권한을 갖는 기능군은 0개**이고, `platform:super_admin` 이 통과하지 못하는데 `platform:admin` 만 통과하는 기능군도 **0개**다. 반대로 #2 에서 `platform:admin` 은 **명시적으로 거부**된다(`packages/security-core/src/service-configs.ts` 헤더 — `WO-OPERATOR-ROLE-CLEANUP-V1: platformBypass = platform:super_admin only`, 테스트 3건이 이를 단언). 즉 `platform:admin` 은 `platform:super_admin` 의 **진부분집합**이며 독립 용도가 없다.

### 4-3. 프론트 비대칭으로 보이는 1건의 해소

`apps/admin-dashboard/src/routes/dashboard.routes.tsx:72` 는 `requiredRoles={['admin','super_admin','platform:admin']}` 로 `platform:super_admin` 이 문자열로 없다. 그러나 `packages/auth-context/src/adminRouteAccess.ts:61-71` 의 `expandRequiredRoles()` 가 **`admin` 이 포함되면 `super_admin`·`operator`·`platform:admin`·`platform:super_admin` 을 자동 추가**한다. 같은 파일 L58-59 에 *"`platform:admin` 을 포함하면서 `admin` 을 포함하지 않는 선언은 저장소 전역 0건(전수 확인)"* 이라는 선행 검증 기록이 있고, 본 감사에서 재확인했다. **실질 비대칭 없음.**

---

## 5. `yaksa:*` 전체 소비 결과

### 5-1. 이름 축 분리 (필수 — §검증-9 계열 오탐 방지)

저장소에 "yaksa" 문자열은 광범위하나 **대부분 역할·scope 축이 아니다.** 다음을 명시적으로 분리한다:

| 축 | 실체 | 본 감사 대상 |
|------|------|:---:|
| **role/scope 접두 `yaksa:`** | `yaksa:admin` scope 문자열 | ✅ **대상** |
| 패키지명 `*-yaksa` | `@o4o/membership-yaksa`, `forum-yaksa`, `lms-yaksa`, `annualfee-yaksa`, `reporting-yaksa` | ❌ 이름 잔재 (별도 축) |
| 서비스 템플릿 키 `yaksa` | `template-linter.ts`, `initpack-linter.ts`, `theme-preset.service.ts`, `service-groups/index.ts` | ❌ 템플릿 축 |
| 라우트 경로 `/admin/yaksa/*`, `/lms/yaksa/*` | admin-dashboard 화면 경로 | ❌ 경로 축 (백엔드는 `/api/v1/membership`, `/api/v1/lms-yaksa`) |

**역할·scope 축 `yaksa:` 의 production 소비처는 아래 2개 파일이 전부다.**

### 5-2. `yaksa:` scope 소비처 전수

| 위치 | 코드 | 성격 |
|------|------|------|
| `apps/api-server/src/routes/yaksa/yaksa.routes.ts:29` | `userScopes.includes('yaksa:admin')` | guard 정의 |
| `apps/api-server/src/routes/yaksa/controllers/yaksa.controller.ts` L186·224·263·306·343·369·405·443·474 | `requireScope('yaksa:admin')` ×9 | 주입된 guard 호출 |
| `docs/architecture/BUSINESS-SERVICE-RULES.md:222` | `yaksa:read, yaksa:write, yaksa:admin` | **docs-only** |
| `apps/api-server/tests/multi-tenant/view-system.spec.ts:282` | `yaksa.member.list` 등 (점 표기, 콜론 아님) | **test-only · 다른 문자열 체계** |

### 5-3. `requireScope` 의 정체 — 오판 방지

`yaksa.controller.ts:64` 는 `requireScope` 를 **파라미터로 주입받는다**:

```ts
requireScope: (scope: string) => (req, res, next) => void
```

주입 지점은 `yaksa.routes.ts:52-56` — 여기서 넘기는 것은 **같은 파일에 인라인 정의된 `requireYaksaScope`** 이다. 즉 저장소에 `requireScope` 라는 이름이 두 개 존재하며 **동작이 전혀 다르다**:

| 이름 | 출처 | 판정 축 | 생존 여부 |
|------|------|------|:---:|
| `requireScope` (membership 계열) | `common/middleware/membership-guard.middleware.ts` → `createMembershipScopeGuard` → `@o4o/security-core` `createServiceScopeGuard` | `user.memberships` (전달됨) **+** `user.roles` (전달됨) | **생존** |
| `requireScope` (yaksa 주입 인자) | `routes/yaksa/yaksa.routes.ts:18-43` `requireYaksaScope` | `user.scopes` (**전달 안 됨**) + `platform:admin`·`platform:super_admin` roles | scope 축 **사망**, role 축만 생존 |

Yaksa 는 membership guard 를 **사용하지 않는다.** 이름이 같다는 이유로 "yaksa 도 membership 으로 살아있다" 고 판정하지 않았다.

### 5-4. `yaksa:*` 역할 보유 현황

`role_assignments` 에 `yaksa` 접두 자체가 없다(선행 census `94a407e8a`). `SERVICE_SCOPES`(`config/service-scopes.ts`) 키는 `glycopharm` · `neture` · `kpa-society` · `cosmetics` **4개뿐**이며 `yaksa` 가 없다 → `yaksa:admin` scope 는 **어떤 경로로도 발급되지 않는다.**

따라서 9개 yaksa 관리 endpoint 를 통과할 수 있는 유일한 조건은 `platform:admin`(보유자 0) 또는 `platform:super_admin`(2명) role 이다.

---

## 6. `dropshipping:*` — 사용자 승인에 의한 제외

WO 원문의 조사 항목 중 `dropshipping:*` 는 **사용자가 명시 승인하여 본 감사에서 제외**했다("맞다 지금 dropshipping 는 제거 중이다. 이는 일단 제외하고 진행하는 것은 어떤가?"). 판정·대체안·후속 계획을 제시하지 않는다.

다만 **파일 충돌 확인 목적의 사실 관측**만 기록한다(§검증-10): 조사 종료 시점 HEAD `cf91949b5` 기준으로 타 세션의 `0c857f984 refactor(o4o): dropshipping 레거시 체인 전면 제거 (WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1)` 가 이미 머지되었고, `apps/` 전체에서 `dropshipping:` 접두 **occurrence 0건**이다. 해당 작업 결과에 본 감사는 어떤 개입도 하지 않았다.

---

## 7. JWT scopes 생성 · 전달 · 소비 경로

```
role_assignments (RBAC SSOT)
   │  RoleAssignmentService.getRoleNames()
   ▼
generateAccessToken(user, roles, domain, memberships)   ← utils/token.utils.ts
   │  payload.roles       = roles
   │  payload.memberships = memberships
   │  payload.scopes      = deriveUserScopes({ role: roles[0], roles })   ← ★생성됨
   ▼
JWT (access, 15분)
   │
   ├─▶ authentication.middleware.ts
   │      requireAuth        L148-154 : user.roles ✅  user.memberships ✅  user.scopes ❌
   │      optionalAuth       L222-225 : user.roles ✅  user.memberships ❌  user.scopes ❌
   │      requirePlatformUser L316-319: user.roles ✅  user.memberships ❌  user.scopes ❌
   │                                                   └──▶ req.user.scopes === undefined → []
   │
   └─▶ /auth/me (auth-account.controller.ts:70, 281)
          userData.scopes = deriveUserScopes(...)    ← ★프론트에는 전달됨
```

### 7-1. 확정 사실 3가지

1. **생성은 된다.** `deriveUserScopes()` 가 JWT `payload.scopes` 를 채운다. 단 `scope-assignment.utils.ts` 는 `serviceCode` 없이 호출될 때 `scopeLevel === 'admin'` 이 아니면 `targetServices = []` 이므로 **operator 급 이하는 애초에 빈 배열**이다.
2. **백엔드로 전달되지 않는다.** 인증 미들웨어 3개 블록 어디에도 `scopes` 대입이 없다.
3. **한 번도 배선된 적이 없다.** `git log -S"user.scopes ="` / `-S"scopes = payload"` 를 `apps/api-server/src/middleware` · `src/common` 전체에 대해 실행한 결과 **해당 대입을 도입한 커밋이 존재하지 않는다.** HEAD 에서도 `grep -rn "scopes = payload\|user.scopes =" apps/api-server/src` 결과 **0건**이다.

   → 백엔드 scope 축은 **회귀(regression)로 깨진 기능이 아니라, 설계만 있고 배선된 적 없는 미완성 축**이다. 이 구분은 판정에 결정적이다: "복구" 대상이 아니라 "제거 또는 완성" 대상이다.

4. **프론트에는 전달된다.** `/auth/me` 가 `deriveUserScopes` 로 재계산해 응답에 실으므로, **프론트가 보는 `user.scopes` 와 백엔드가 판정에 쓰는 `req.user.scopes`(항상 `[]`) 가 서로 다르다.**

---

## 8. Scope guard 별 실제 도달 가능성 — 필수 산출물 ③

| # | scope / guard | 발급 경로 | JWT 포함 | `req.user` 전달 | route·기능 | role 우회 조건 | 현재 도달 가능성 | 판정 |
|---|------|------|:---:|:---:|------|------|------|:---:|
| 1 | `createServiceScopeGuard` (`security-core`) 의 `user.scopes` 분기 | `SERVICE_SCOPES` (4키) | ✅ (admin 급만) | ❌ | neture·glycopharm·cosmetics·kpa 전 scope 경로 | — | **scope 분기 항상 false** | REMOVE (분기만) |
| 2 | 동 guard 의 `user.roles` 분기 (`allowedRoles` + `platformBypass`) | `role_assignments` | ✅ | ✅ | 동일 | 서비스 접두 role 또는 `platform:super_admin` | **정상 도달** | KEEP_ACTIVE |
| 3 | `createMembershipScopeGuard` 의 `user.memberships` 선행 검사 | `service_memberships` | ✅ | ✅ | cosmetics · glycopharm · neture · service-legal | — | **정상 도달** | KEEP_ACTIVE |
| 4 | `requireYaksaScope` 의 `yaksa:admin` scope 분기 | **없음** (`SERVICE_SCOPES` 에 `yaksa` 키 부재) | ❌ | ❌ | `/api/v1/yaksa/admin/*` 9개 | — | **도달 불가** | REMOVE |
| 5 | `requireYaksaScope` 의 `platform:admin` role 분기 | `role_assignments` | ✅ | ✅ | 동일 | 보유자 **0명** | **도달 불가(계정 부재)** | REMOVE |
| 6 | `requireYaksaScope` 의 `platform:super_admin` role 분기 | `role_assignments` | ✅ | ✅ | 동일 | 2명 | **도달 가능** | REPLACE |
| 7 | `member.controller.ts:1543` `hasAdminScope` | 없음 | ❌ | ❌ | KPA hard delete | 같은 줄의 `hasAdminRole`·`hasAdminMembership` 이 실동작 | scope 분기 항상 false, **기능은 정상** | REMOVE (분기만) |
| 8 | `member.controller.ts:1501` 감사로그 `operatorRole` 산출 | 없음 | ❌ | ❌ | 감사 로그 값 | — | **항상 `kpa:operator` 로 기록** (admin 도) | REPLACE (로그 정확도 결함) |
| 9 | `OperatorNotificationController.ts:32,124` serviceCode 추론 | 없음 | ❌ | ❌ | 운영자 알림 설정 | — | **항상 `'neture'` 로 폴백** (L41) | REPLACE (경계 결함) |
| 10 | 프론트 `useOperatorPolicy.ts:143` `user.scopes` | `/auth/me` 재계산 | ✅ | 해당 없음 | 운영자 정책 화면 | — | admin 급만 비어있지 않음 | KEEP_RESERVED |
| 11 | 프론트 `authStore.ts:136` `scopes` 저장 | `/auth/me` | ✅ | 해당 없음 | 상태 저장 | — | 동일 | KEEP_RESERVED |

> #7·#9 는 **guard 가 아니다.** #7 은 이미 무해한 방어적 OR 조건이고(주석이 그렇게 명시), #9 는 권한 판정이 아니라 serviceCode 힌트다. 다만 #9 는 scope 부재 시 **무조건 `neture`** 로 폴백하므로 다른 서비스 운영자가 neture 알림 설정을 보게 되는 **경계 결함**이다. 본 WO 범위 밖이므로 후속 항목으로만 올린다.
>
> #8 은 `kpa:admin` 보유자의 회원 탈퇴 처리가 감사 로그에 **항상 `kpa:operator` 로 기록**됨을 뜻한다. 권한 우회는 아니고 **감사 정확도 결함**이다.

### 8-1. `/api/v1/yaksa/*` 실측 (비인증 GET, `https://api.neture.co.kr`)

| 경로 | HTTP | 해석 |
|------|:---:|------|
| `GET /api/v1/yaksa/categories` | **200** | 공개. 응답은 seed 카테고리(`공지사항`/`일반 게시판` 등, `created_at 2026-01-08`, **`post_count: 0`**) |
| `GET /api/v1/yaksa/posts?limit=3` | **200** | `{"data":[], "meta":{"total":0}}` — **게시물 0건** |
| `GET /api/v1/yaksa/admin/posts` | 401 | 마운트됨. 인증 후 `requireYaksaScope` 판정 |
| `GET /api/v1/yaksa/admin/categories` | 401 | 동일 |
| `GET /api/v1/yaksa/admin/logs/posts` | 401 | 동일 |
| `GET /api/v1/yaksa/forum/home` | **404** | **경로 자체가 없음** |
| `GET /api/v1/yaksa/organizations` | **404** | 동일 |
| `GET /api/v1/yaksa/user/profile` | **404** | 동일 |

`apps/main-site/src/lib/yaksa/forum-data.ts` (L144·187·211·235·260·294·324·346) 는 위 **404 경로 8개만 호출한다.** `main-site` 는 Cloud Run `o4o-main-site` 로 실제 배포되어 있으나(`.github/workflows/deploy-main-site.yml`), 그 yaksa 포럼 화면은 **전량 404 를 받는다.**

### 8-2. 관리자 UI 도달 가능성

`/api/v1/yaksa/admin/*` 를 호출하는 프론트는 `apps/admin-dashboard/src/pages/yaksa-forum/{PostListPage,PostDetailPage,CategoryListPage}.tsx` 3개다. 이들은 `YaksaForumRouter.tsx` 안에서만 라우팅되는데, **`YaksaForumRouter` 는 저장소 어디에서도 mount 되지 않는다** (전수 검색 결과 정의·재export·아카이브 문서 3건 외 참조 0건).

→ **9개 yaksa 관리 endpoint 는 도달 가능한 UI 가 없다.**

`/admin/yaksa/*` 라우트(members·reports·officers·education·fees·forum·accounting)는 별개 화면이며 **백엔드가 `/api/v1/membership/*` · `/api/v1/lms-yaksa/*` 다.** `/api/v1/yaksa/*` 와 무관하다.

---

## 9. 현행 role·membership·소유권으로의 대체 — 필수 산출물 ④

| legacy 항목 | 대체할 role · membership · 소유권 | 이미 대체됐는가 | 추가 구현 필요 | 전환 위험 |
|------|------|:---:|:---:|------|
| `platform:admin` — cross-service bypass | `platform:super_admin` | **✅ 완료** (`isPlatformAdmin()` 이 이미 동일 취급, 보유자 0) | ❌ 없음 | **없음** |
| `platform:admin` — 서비스 운영 권한 | 서비스 접두 `{service}:admin` / `{service}:operator` + `service_memberships` | **✅ 완료** (2026-02-28 `CleanupLegacyRoles` migration) | ❌ 없음 | **없음** |
| `platform:operator` | `{service}:operator` + membership | ✅ 완료 (보유자 0, `deprecated: true`) | ❌ 없음 | 없음 |
| `yaksa:admin` scope | ① 기능 유지 시 → `requireRole(['platform:super_admin'])` ② KPA 커뮤니티로 통합 시 → `kpa:admin` + `service_memberships.service_key='kpa-society'` | **❌ 미대체** | 판정 필요 (§13-B) | **낮음** — 게시물 0건 · UI 미마운트 |
| `req.user.scopes` 기반 guard 분기 (#1·#4·#7) | `user.roles` + `user.memberships` (`createMembershipScopeGuard`) | **✅ 사실상 대체 완료** — 살아있는 경로가 이미 role/membership 축 | ❌ 없음 (분기 삭제만) | **없음** — 항상 false 인 OR 분기 제거 |
| `req.user.scopes` 기반 비-guard 소비 (#8·#9) | `user.roles` 로 직접 판정 | ❌ 미대체 | 소규모 수정 필요 | 낮음 (동작 정정) |
| 프론트 `user.scopes` (#10·#11) | — | 해당 없음 (`/auth/me` 가 실제 공급) | ❌ | — |

### 9-1. serviceKey 매핑 확인 (§검증-9)

문자열 접두로 serviceKey 를 추정하지 않았다. `common/middleware/membership-guard.middleware.ts` 는 `resolveCanonicalServiceKey()` (`@o4o/security-core`) 를 **SSOT 로 위임**하며, 파일 헤더에 *"로컬 const 정의 금지 — drift 재발 방지"* 가 명문화되어 있다. 확인된 매핑:

| role 접두 | canonical `service_memberships.service_key` |
|------|------|
| `kpa` | `kpa-society` |
| `cosmetics` | `k-cosmetics` |
| `neture` · `glycopharm` · `pharmacy-hub` | 자기 자신 |
| **`yaksa`** | **매핑 없음** — `SERVICE_SCOPES` 에도 키 없음 |

`member.controller.ts:1545` 는 `m.serviceKey === 'kpa-society' || m.serviceKey === 'kpa'` 로 양쪽을 모두 받아 방어한다.

---

## 10. production / test-only / docs-only / dead 참조 구분

| 항목 | production | test-only | docs-only | dead (도달 불가) |
|------|:---:|:---:|:---:|------|
| `platform:admin` | 권한 선언 참조 다수(**모두 `platform:super_admin` 과 동반**) | 4건 — **거부를 단언**하는 테스트 | migration 19 · JSDoc 12 | 보유자 0 → **실행 경로 전부 dead** |
| `platform:operator` | `ROLE_REGISTRY` 정의 + 프론트 상수 | — | migration | 보유자 0 → dead |
| `yaksa:admin` scope | 2 files (`yaksa.routes.ts`, `yaksa.controller.ts`) | 0 | `BUSINESS-SERVICE-RULES.md:222` | **발급 경로 없음 → scope 분기 100% dead** |
| yaksa 라우트 트리 | 마운트됨(`register-routes.ts:642-649`) | 0 | — | 공개 2개 200(데이터 0건) · admin 9개 **UI 미마운트** · main-site 호출 8개 **404** |
| JWT `scopes` 백엔드 소비 | 5 files | `__tests__/security/test-utils.ts:19` | 선행 CHECK 2건 | **전달 배선이 존재한 적 없음 → 전부 dead** |
| JWT `scopes` 프론트 소비 | 2 files | — | — | **live** (`/auth/me` 공급) |
| `*-yaksa` 패키지명 · 템플릿 키 | live (이름 잔재) | — | — | 본 감사 축 아님 |

---

## 11. 최종 판정 — 필수 산출물 ①

| 항목 | 최초 목적 | 현재 발급 가능 | backend 소비처 | frontend 소비처 | 활성 기능 존재 | 현행 대체 축 | **판정** | 근거 |
|------|------|:---:|------|------|:---:|------|:---:|------|
| **`platform:admin`** | 접두 없는 legacy `admin` 의 과도기 버킷 (2026-02-05) | 이론상 가능, **실 보유자 0** | 권한 선언 다수(전부 super_admin 동반) | `PLATFORM_ADMIN_ROLES` · `expandRequiredRoles` · `PLATFORM_ROLES` | **❌ 없음** | `platform:super_admin` + `{service}:admin` | **REMOVE** | `ROLE_REGISTRY` `deprecated: true` · 보유자 0 · 독립 기능군 0 · scope guard 는 이미 거부 · 테스트가 거부를 단언 |
| **`platform:operator`** | 동일 | 실 보유자 0 | `ROLE_REGISTRY` | 프론트 상수 | ❌ 없음 | `{service}:operator` | **REMOVE** | 동일 |
| **`yaksa:admin` scope** | Yaksa 서비스 관리 권한 (2025-12-30) | **❌ 불가** (`SERVICE_SCOPES` 키 부재) | `requireYaksaScope` + 9 endpoint | **없음** (`YaksaForumRouter` 미마운트) | ❌ 없음 | ①`platform:super_admin` ②`kpa:admin`+membership | **REMOVE** | 발급 경로 부재 · UI 미마운트 · 게시물 0건 |
| **yaksa 공개 endpoint** (`/posts`,`/categories`) | Yaksa 포럼 공개 조회 | 해당 없음 | 마운트·200 응답 | main-site 호출은 **전부 404 경로** | **❌ 없음** (게시물 0, 소비자 0) | KPA Forum (공통 구조 §13) | **REMOVE** (별도 WO) | 실측 200 이나 데이터 0건 · 실 소비자 0 |
| **yaksa 관리 endpoint** ×9 | Yaksa 포럼 관리 | 해당 없음 | 마운트·401 | 페이지 3개 존재하나 **라우팅 안 됨** | ❌ 없음 | 동일 | **REMOVE** (별도 WO) | UI 도달 불가 |
| **JWT scopes — 백엔드 축** | 서비스별 세분 권한 (2026-01-22) | 생성만 됨 | 5 files | — | **❌ 없음** — 배선된 적 없음 | `user.roles` + `user.memberships` | **REMOVE** | `req.user.scopes` 대입 커밋 이력 0건 · HEAD 에서도 0건 |
| **JWT scopes — 프론트 축** | 동일 | ✅ `/auth/me` 공급 | 해당 없음 | `useOperatorPolicy` · `authStore` | ✅ 있음(admin 급) | — | **KEEP_RESERVED** | 실제 값이 전달되고 화면이 소비 중. 백엔드 제거와 lockstep 판단 필요 |
| **`createMembershipScopeGuard` / `createServiceScopeGuard`** | 서비스 경계 강제 | — | 4 서비스 | — | ✅ **있음** | — | **KEEP_ACTIVE** | `roles`·`memberships` 축으로 정상 동작 |
| `requireScope` 내부 `user.scopes` OR 분기 | 위 guard 의 scope 경로 | — | `service-scope-guard.ts:59` | — | ❌ 없음 | — | **REMOVE** (분기만) | 항상 false |

**종합 판정: `PASS_WITH_FOLLOWUP`**

감사는 전 항목에 대해 판정을 확정했고 BLOCKED 사유가 없다. `platform:admin` · `platform:operator` · `yaksa:*` · 백엔드 JWT scope 축은 **모두 제거 가능**하며, 살아 있는 기능은 이미 role·membership 축으로 대체되어 있어 **추가 구현이 필요한 대체 작업은 없다**. 다만 실제 제거는 본 WO 가 금지한 작업이므로 후속 WO 로 넘긴다(§13).

---

## 12. 제거 시 영향 받는 기능 · 파일 · 테스트

### 12-A. `platform:admin` · `platform:operator` 제거

| 파일 | 변경 성격 | 기능 영향 |
|------|------|------|
| `apps/api-server/src/types/roles.ts` | `ROLE_REGISTRY` 2 entry 삭제, `PrefixedRole` 타입 축소 | 없음 |
| `apps/api-server/src/utils/role.utils.ts:136` | `isPlatformAdmin` → `['platform:super_admin']` | 없음 (보유자 0) |
| `apps/api-server/src/routes/admin/users.routes.ts:32` | `ADMIN_ROLES` 축소 | 없음 |
| `apps/api-server/src/bootstrap/membership-admin-guard.ts` | `MEMBERSHIP_ADMIN_ROLES` 축소 | 없음 |
| `apps/api-server/src/routes/operator/{roles,membership,stores,products,analytics}.routes.ts` | `requireRole` 배열에서 제거 | 없음 |
| `apps/admin-dashboard/src/config/rolePermissions.ts:29` | `PLATFORM_ADMIN_ROLES` 축소 | 없음 |
| `apps/admin-dashboard/src/routes/{users,dashboard}.routes.tsx` | 선언 정리 | 없음 (`expandRequiredRoles` 보완) |
| `packages/auth-context/src/adminRouteAccess.ts` L12-18·L61-71 | `ADMIN_LEVEL_ROLES` · `expandRequiredRoles` 축소 | 없음 |
| `packages/auth-context/src/AuthProvider.tsx:295` | `isDashboardRole` 목록 축소 | 없음 |
| `services/web-neture/src/lib/role-constants.ts:42` · `RoleGuard.tsx` | `PLATFORM_ROLES` 축소 | 없음 |
| `services/web-kpa-society/src/lib/role-constants.ts:26-27` | 상수 2개 삭제 | 소비처 확인 필요 |
| `services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx:73` | 조건 1줄 | 없음 |
| **migration 19곳** | **변경 금지** — 역사 기록 | — |

**테스트 영향:**

| 테스트 | 영향 |
|------|------|
| `__tests__/security/scope-guard.spec.ts:97,219,269` | `platform:admin → denied` 를 단언 → **역할 삭제 시 fixture 갱신 필요** |
| `__tests__/service-admin-guard.spec.ts:198` | `platform:admin → guard 통과` 단언 → **수정 필요** |
| `__tests__/membership-admin-guard.spec.ts` · `membership-residual-subtree-guard.spec.ts` · `membership-category-inactive-list.spec.ts` | 역할 배열 참조 → 갱신 필요 |
| `apps/admin-dashboard/src/tests/admin-operation-boundary.test.ts` · `admin-menu-batch2.test.ts` | 경계 선언 문자열 검증 → 갱신 필요 |

### 12-B. yaksa 라우트 트리 제거

| 대상 | 비고 |
|------|------|
| `apps/api-server/src/routes/yaksa/**` (routes·controllers·services·repositories·entities·dto) | 전체 |
| `apps/api-server/src/bootstrap/register-routes.ts:105,642-649` | import + mount |
| `apps/api-server/src/database/entities.ts` | yaksa 3 entity 등록 |
| `apps/admin-dashboard/src/pages/yaksa-forum/**` | 4 파일 (이미 미마운트) |
| `apps/main-site/src/pages/yaksa/forum/**` · `src/lib/yaksa/forum-data.ts` | **이미 404 를 호출 중** — 화면 자체 은퇴 판단 필요 |
| DB 테이블 `yaksa_posts` · `yaksa_categories` · `yaksa_post_logs` | 게시물 0건, 카테고리는 seed. **삭제는 별도 승인 필수** |

> ⚠️ `@o4o/membership-yaksa` · `forum-yaksa` · `lms-yaksa` · `annualfee-yaksa` **패키지는 제거 대상이 아니다** — 이름만 같고 `/api/v1/membership` · `/api/v1/lms-yaksa` 로 **실서비스 중**이다.

### 12-C. 백엔드 JWT scope 축 제거

| 파일 | 변경 |
|------|------|
| `packages/security-core/src/service-scope-guard.ts:59,64,84` | `userScopes` 분기 삭제 (role 분기 유지) |
| `apps/api-server/src/routes/kpa/controllers/member.controller.ts:1538,1543` | `hasAdminScope` 삭제 (`hasAdminRole`·`hasAdminMembership` 유지) |
| `apps/api-server/src/routes/kpa/controllers/member.controller.ts:1501` | `scopes` → `roles` 로 정정 (감사 로그 정확도) |
| `apps/api-server/src/controllers/OperatorNotificationController.ts:32,124` | `scopes` → `roles`/`memberships` (neture 폴백 결함 해소) |
| `apps/api-server/src/utils/token.utils.ts` · `scope-assignment.utils.ts` · `config/service-scopes.ts` | **프론트가 `/auth/me` 로 소비 중이므로 lockstep 판단 전까지 유지** |
| `apps/api-server/src/__tests__/security/test-utils.ts:19` | fixture 정리 |

---

## 13. 후속 제거 · 전환 작업 순서 — 필수 산출물 ⑤

> 각 단계는 별도 WO 로 분리한다. 본 CHECK 는 어떤 단계도 실행하지 않았다.

| 순서 | 작업 | 범위 | 위험 | 선행 조건 |
|:---:|------|------|:---:|------|
| **A** | `platform:admin` · `platform:operator` **코드 제거** | §12-A 파일 + 테스트 fixture. migration 은 불변 | **낮음** (보유자 0, 독립 기능 0) | 없음 — 즉시 착수 가능 |
| **B** | yaksa 라우트 트리 **처분 결정 IR** | 유지(→`platform:super_admin` guard 로 REPLACE) vs 은퇴(→KPA Forum 통합) 판정. main-site yaksa 화면 8개 404 처분 포함 | 낮음 | A 무관, 병행 가능 |
| **C** | B 판정에 따른 **yaksa 제거 또는 guard 정정** | §12-B. DB 테이블 DROP 은 별도 승인 | 낮음 (데이터 0건) | B |
| **D** | 백엔드 `req.user.scopes` **분기 제거** | §12-C 상단 4항목. guard 의 role 분기는 불변 | 낮음 (항상 false 인 분기) | A |
| **E** | 비-guard scope 소비 **결함 정정** | `member.controller.ts:1501` 감사 로그 오기록, `OperatorNotificationController` neture 폴백 | 낮음 | D |
| **F** | 프론트 `user.scopes` **축 존폐 판정** | `useOperatorPolicy` · `authStore` 가 실제로 무엇을 얻는지 확정 후 유지/제거. 유지 시 백엔드 `deriveUserScopes`·`SERVICE_SCOPES` 존치 | 중간 (화면 동작 변화 가능) | D·E |
| **G** | (선택) `req.user.scopes` **전달 완성** — F 에서 "필요" 판정 시에만 | 인증 미들웨어 3블록에 `scopes` 대입 | **높음** — 권한 확대. 별도 보안 검토 필수 | F |

**권고 순서: A → D → B → C → E → F.** G 는 F 가 명시적으로 요구할 때만 검토한다. WO 원칙 3("전달 누락을 이번 작업에서 수정하지 않는다")·원칙 2("scope 발급을 복구하지 않는다")와 정합하며, **기본 방향은 복구가 아니라 제거**다.

---

## 14. 9번 역할별 smoke 에 미치는 영향

| 항목 | 영향 |
|------|------|
| `platform:admin` 계정으로 smoke | **불가능** — 보유자 0. 선행 census(`94a407e8a` §14)에서 이미 "계정 부재로 검증 불가" 로 확정됨. **본 감사 판정(REMOVE)에 따라 smoke 대상에서 제외해야 한다.** 계정을 만들어 검증하는 것은 WO 원칙 1 위반 |
| `platform:operator` | 동일 — 제외 |
| `yaksa:*` 역할 계정 | **불가능** — 역할 자체가 발급되지 않음. 제외 |
| `/api/v1/yaksa/admin/*` 9개 endpoint | UI 미마운트로 **브라우저 smoke 불가**. 검증이 필요하면 `platform:super_admin` 토큰 직접 호출뿐 |
| `/admin/yaksa/*` 화면 7개 | `/api/v1/membership` · `/api/v1/lms-yaksa` 기반 → **정상 smoke 대상**. `/api/v1/yaksa/*` 와 혼동 금지 |
| `platform:super_admin` · 서비스 admin/operator · store_owner | **영향 없음** — 정상 수행 가능 |
| scope 기반 통과 여부 검증 항목 | **삭제 권고** — 백엔드 scope 축이 배선된 적 없으므로 "scope 로 통과" 는 존재하지 않는 시나리오다. role·membership 기준으로 재작성해야 한다 |

**결론:** 9번 smoke 의 역할 목록에서 `platform:admin` · `platform:operator` · `yaksa:*` **3축을 제외**하고, scope 검증 항목을 role/membership 검증으로 치환하면 나머지는 전량 수행 가능하다.

---

## 15. 코드 · DB · 역할 · JWT · migration · 배포 변경 0 확인

| 항목 | 결과 | 확인 방법 |
|------|:---:|------|
| 코드 파일 수정 | **0** | 본 CHECK 문서 1개만 신규 생성 |
| 역할 생성·부여·회수 | **0** | 운영 변경 endpoint 호출 없음 |
| 계정 상태 변경 | **0** | 동일 |
| JWT claim · middleware 변경 | **0** | 파일 미수정 |
| `SERVICE_SCOPES` 추가 | **0** | 파일 미수정 |
| guard 변경 | **0** | 파일 미수정 |
| `platform:admin` · yaksa 코드 제거 | **0** | 판정만 제시 |
| schema · migration · seed | **0** | 미작성 |
| **운영 DB write** | **0** | **본 감사에서 DB 접속 자체를 하지 않았다.** Cloud SQL Proxy 미기동 → 관리할 프로세스 없음. 역할 보유 수치는 선행 census(`94a407e8a`) 재사용 |
| 배포 | **0** | — |
| 운영 변경 endpoint 호출 | **0** | 실행한 HTTP 요청은 **전부 비인증 GET** (§8-1, 17건) |
| `user.permissions` 공급 | **0** | 미변경 |
| `pnpm-lock.yaml` | **미변경** | — |
| dropshipping 은퇴 작업 개입 | **0** | §6 |
| 자격증명 · 토큰 출력 | **0** | 로그인 수행 없음. `TEST-ACCOUNTS.local.md` 미열람. `apps/api-server/.env` 미열람·미수정 |
| 개인정보 기록 | **0** | 본 CHECK 에 이름·이메일·전화번호·사용자 UUID 없음 |
| 타 세션 작업물 | **열람 0 · 수정 0 · stage 0** | §2-3 |

**생성한 임시 도구 1건:** `scratchpad/pa_asym.py` — `platform:admin` ±6줄 문맥 비대칭 스캐너. 프로젝트 밖 scratchpad 에만 존재하며 **커밋하지 않는다**(재현 절차는 §부록에 기재).

---

## 16. 검증 12항목 대응

| # | 검증 항목 | 결과 |
|:---:|------|------|
| 1 | 문자열 검색만으로 판정하지 않고 실제 호출 경로 확인 | ✅ `yaksa.controller.ts:64` 의 `requireScope` 가 **주입 파라미터**임을 확인하고 `yaksa.routes.ts:52-56` 의 실 주입값까지 추적 (§5-3) |
| 2 | test·fixture·docs 참조와 production 참조 분리 | ✅ §10 표. 특히 `scope-guard.spec.ts` 3건은 **거부를 단언**하는 테스트로 별도 분류 |
| 3 | route 있어도 backend 없으면 활성 아님 | ✅ main-site 의 yaksa 포럼 8 경로 → **실측 404** (§8-1) |
| 4 | backend 있어도 메뉴·화면·호출자 없으면 도달 가능성 별도 판정 | ✅ yaksa admin 9개는 401(마운트 확인) 이나 **`YaksaForumRouter` 미마운트로 UI 도달 불가** (§8-2) |
| 5 | `platform:admin` vs `super_admin` 허용 목록 기능별 비교 | ✅ §4, 9개 기능군 비교 → 독립 용도 0 |
| 6 | scope 발급 가능성과 guard 소비 존재 분리 | ✅ §8 표에 "발급 경로" 와 "route·기능" 을 별도 열로 분리. `yaksa:admin` = guard 존재 O / 발급 X |
| 7 | JWT claim 생성과 `req.user` 전달 분리 | ✅ §7 다이어그램. 생성 ✅ / 전달 ❌ / **전달 배선 커밋 이력 0건** |
| 8 | role 우회로 동작하는 기능을 정상 scope 동작으로 판정 금지 | ✅ `requireYaksaScope` 는 role 우회로만 통과 가능 → §8 #4·#5·#6 을 scope 판정과 분리. `member.controller.ts:1543` 도 "scope 분기 dead / 기능은 role 로 생존" 으로 분리 |
| 9 | `kpa` vs `kpa-society` 등 접두·serviceKey 매핑 명시 확인 | ✅ §9-1. `resolveCanonicalServiceKey()` SSOT 위임 확인, 문자열 접두 추정 미사용 |
| 10 | dropshipping-admin 은퇴 작업과 파일 충돌 확인 | ✅ **충돌 0.** 본 감사 산출물은 신규 파일 `docs/checks/WO-O4O-LEGACY-ADMIN-ROLE-AND-SCOPE-USAGE-AUDIT-V1-CHECK.md` 1개뿐이며, 타 세션 산출물 `docs/checks/CHECK-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1.md` 와 경로가 다르다 |
| 11 | 운영 DB write 0 · 역할 변경 0 · schema 변경 0 · 배포 0 | ✅ §15. **DB 접속 자체 0회** |
| 12 | 타 세션 작업물 열람·수정·stage 여부 보고 | ✅ §2-3. 열람 0 · 수정 0 · stage 0 |

---

## 부록 — 재현 절차

```bash
# 기준
git rev-parse HEAD                      # cf91949b51871c4586d0a08b7ca55099865c6ec1
git merge-base --is-ancestor 94a407e8a HEAD && echo ancestor
git merge-base --is-ancestor 84c3f0dbb HEAD && echo ancestor

# platform:admin 비대칭 (production 권한 선언 중 super_admin 을 동반하지 않는 것)
#   → scratchpad/pa_asym.py : roots=[apps/api-server/src, apps/admin-dashboard/src, packages, services]
#     .ts/.tsx 전수, 'platform:admin' 라인의 ±6줄에 'platform:super_admin' 부재 시 출력
#   결과: asymmetric 39 / total 234, production 권한 선언 0건

# scopes 가 req.user 로 전달된 적이 있는가
git log -S"user.scopes ="  --oneline -- apps/api-server/src/middleware apps/api-server/src/common   # 0건
git log -S"scopes = payload" --oneline -- apps/api-server/src                                        # 해당 파일 없음
grep -rn "scopes = payload\|user.scopes =" apps/api-server/src --include=*.ts                        # 0건

# yaksa 도달 가능성 (비인증 GET, 실 진입점)
API=https://api.neture.co.kr
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" $API/api/v1/yaksa/categories      # 200
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" $API/api/v1/yaksa/posts           # 200 (total 0)
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" $API/api/v1/yaksa/admin/posts     # 401
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" $API/api/v1/yaksa/forum/home      # 404
#   ⚠ run.app 직접 URL 은 /health 포함 전 경로 404 — 실 진입점이 아니다

# yaksa 관리 UI 도달 가능성
#   Grep "YaksaForumRouter" 전역 → 정의·재export·아카이브 문서 3건, mount 0건
```

### 참조 문서

- [WO-O4O-ADMIN-OPERATION-ACCOUNT-ROLE-JWT-SCOPE-READONLY-CENSUS-V1-CHECK.md](WO-O4O-ADMIN-OPERATION-ACCOUNT-ROLE-JWT-SCOPE-READONLY-CENSUS-V1-CHECK.md) — 선행 근거 (역할·계정 census)
- [WO-O4O-ADMIN-DASHBOARD-OPERATION-SECURITY-BOUNDARY-ROLE-ACCESS-V1-CHECK.md](WO-O4O-ADMIN-DASHBOARD-OPERATION-SECURITY-BOUNDARY-ROLE-ACCESS-V1-CHECK.md) — 관리자 화면 경계
- [docs/rbac/RBAC-FREEZE-DECLARATION-V1.md](../rbac/RBAC-FREEZE-DECLARATION-V1.md) — F9 RBAC SSOT
- [docs/architecture/O4O-CORE-FREEZE-V1.md](../architecture/O4O-CORE-FREEZE-V1.md) — F10 (`membership-guard.middleware.ts` · `RoleAssignmentService` Freeze)
- [docs/baseline/ROLE-POLICY-AND-GUARD-V1.md](../baseline/ROLE-POLICY-AND-GUARD-V1.md)

---

*작성: 2026-08-05 · 판정 `PASS_WITH_FOLLOWUP` · 코드/DB/역할/JWT/migration/배포 변경 0*
