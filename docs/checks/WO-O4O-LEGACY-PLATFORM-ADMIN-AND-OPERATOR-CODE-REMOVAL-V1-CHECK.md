# WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1 — CHECK

**판정: PASS_WITH_FOLLOWUP**

초기 과도기 역할 `platform:admin` · `platform:operator` 의 **production 정의와 소비를 전량 제거**했다.
두 역할을 다른 역할로 기계적으로 치환하지 않고, **독립 용도가 없는 조건과 선택지 자체를 제거**했다.
현행 권한 구조(플랫폼 전체 = `platform:super_admin` / 서비스 관리 = `{service}:admin` /
서비스 운영 = `{service}:operator` / roles·memberships·소유권 경계)는 그대로 유지된다.

FOLLOWUP 사유는 §4-2 (동결 Core 파일 1건 변경) 와 §16 (배포·역할별 브라우저 smoke 미실시, WO 제외 범위) 뿐이다.

---

## 1. 기준 commit · 작업 트리 상태

| 항목 | 값 |
|------|-----|
| 기준 commit | `03913b22d` (docs(check): 파일럿 재생산 CHECK 에 커밋·push 결과 기재) |
| 브랜치 | `main` |
| 작업 트리 | **clean 아님** — 타 세션 WIP 존재 |

**타 세션 WIP (사전 확인, 본 WO 대상과 0 중복):**

- modified 1건: `apps/api-server/src/scripts/hff-zh-b01-translate.mjs`
- untracked 38건: 전부 `apps/api-server/src/scripts/**` (HFF ZH · easy-drug-ko 파일럿)

WO 사전점검 3항("충돌하지 않고 내 pathspec 만 안전하게 분리할 수 있으면 진행")에 따라 진행했다.
본 WO 대상 파일은 역할·guard·route·타입 계층이며 `src/scripts/**` 와 경로가 완전히 분리된다.
단, 같은 디렉터리의 tracked 파일 `apps/api-server/src/scripts/diagnose-admin-login.ts` 1건은
타입 제거의 강제 여파로 수정이 필요했고, **수정 전 tracked·clean 임을 개별 확인**한 뒤 편집했다.

## 2. 선행 CHECK 포함 여부

포함한다. 근거는 `WO-O4O-LEGACY-ADMIN-ROLE-AND-SCOPE-USAGE-AUDIT-V1` (CHECK commit `4f63b2844`).
확정 사실:

- 두 역할의 **활성 보유자 0명**
- `platform:super_admin` 대비 **독립 production 권한 0개**
- `ROLE_REGISTRY` 에서 이미 `deprecated: true`
- security-core `platformBypass` 는 두 역할을 허용하지 않음

따라서 본 WO 의 모든 제거는 **판정 결과 불변(behavior-preserving)** 이다.

## 3. 제거한 production 정의 · 소비처

### 3-1. 역할 정의와 타입 (SSOT)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/types/roles.ts` | `PlatformRole` union 에서 `'platform:admin'` · `'platform:operator'` 제거 + `ROLE_REGISTRY` 항목 2건 제거 + JSDoc 예시 정정 |
| `apps/api-server/src/types/auth.ts` | `UserRole` enum 에서 `ADMIN = 'platform:admin'` 제거 |
| `services/web-kpa-society/src/lib/role-constants.ts` | `ROLES.PLATFORM_ADMIN` · `ROLES.PLATFORM_OPERATOR` 제거, `DASHBOARD_ADMIN_ROLES` 재구성 |
| `services/web-neture/src/lib/role-constants.ts` | `PLATFORM_ROLES` → `[PLATFORM_SUPER_ADMIN]` 단독 |

`services/web-kpa-society/src/lib/role-constants.ts` 가 저장소 전체에서
**`platform:operator` 를 참조하던 유일한 코드**였다(정의 파일 `roles.ts` 제외).

### 3-2. allow-list 축소 (legacy 항목만 제거, 서비스 역할 보존)

구조 패턴 pass 로 112개 production 파일을 대상 삼아 **배열 리터럴의 legacy 원소만** 제거했다(~85건).
대표 사례:

| 파일 | before → after |
|------|----------------|
| `apps/api-server/src/bootstrap/membership-admin-guard.ts:34` | `['platform:admin','platform:super_admin']` → `['platform:super_admin']` |
| `apps/admin-dashboard/src/config/rolePermissions.ts:29` | `PLATFORM_ADMIN_ROLES` 동일 축소 |
| `apps/api-server/src/routes/admin/platform-accounts.routes.ts:30` | `['platform:super_admin','neture:admin','neture:operator']` — **서비스 역할 보존** |
| `apps/api-server/src/routes/o4o-store/controllers/operator-screen-set.controller.ts:71` | `${serviceKey}:admin` / `:operator` 캐스트 **보존** |
| `apps/api-server/src/controllers/forum/ForumPostController.ts:65` · `routes/kpa/kpa.routes.ts:915` | `['kpa:admin','kpa:operator','platform:super_admin']` — 서비스 역할 보존 |
| `apps/api-server/src/modules/lms/routes/lms.routes.ts:33,41` · `services/auth/auth-login.service.ts:167` | unprefixed legacy `'admin'`·`'super_admin'` **보존** (§3-5) |
| `packages/auth-context/src/adminRouteAccess.ts` | `ADMIN_LEVEL_ROLES` 및 `expandRequiredRoles` 확장 집합에서 제거 |
| `packages/auth-context/src/AuthProvider.tsx:295` | 동일 축소 |

그 외 neture controller 16건 · glycopharm controller 7건 + `pharmacy-context.middleware.ts` ·
o4o-store operator controller 6건 · operator routes 5건 · admin/cms/content/security routes 다수.

### 3-3. 조건식 · 판정 분기 제거 (수기)

| 파일 | 변경 |
|------|------|
| `controllers/operator/MembershipConsoleController.ts:1033` | `r === 'platform:super_admin' \|\| r.endsWith(':admin')` |
| `modules/platform/platform-hub.controller.ts:40` | 오류 메시지 `'platform:super_admin required'` |
| `routes/guide/guide.controller.ts` | `isOperatorOrAbove` 에서 `r === 'platform:admin'` 절 제거 |
| `routes/signage/extensions/common/extension.guards.ts:89` | `signage:operator \|\| platform:super_admin` |
| `routes/yaksa/yaksa.routes.ts:30` | `roles?.includes('platform:admin')` 절 제거 (yaksa scope·API 는 미변경) |
| `services/web-k-cosmetics/src/components/KCosGlobalHeader.tsx:73` | `r === 'platform:admin'` 절 제거 |
| `services/web-kpa-society/src/pages/forum/ForumDetailPage.tsx:199` | `[...PLATFORM_ROLES, ROLES.PLATFORM_SUPER_ADMIN]` |
| `services/web-kpa-society/src/pages/operator/RoleManagementPage.tsx:21` | `r === ROLES.PLATFORM_SUPER_ADMIN` |
| `apps/admin-dashboard/src/routes/dashboard.routes.tsx:72` | `['admin','super_admin']` — **자동 대체하지 않음** (§9-2) |

### 3-4. 역할 표시명 · 선택 UI

`'platform:admin'` label map 항목을 3개 화면에서 제거:
`services/web-account/src/components/UserProfileCard.tsx`,
`services/web-neture/src/pages/admin/platform/PlatformUsersPage.tsx`,
`services/web-neture/src/pages/admin/platform/PlatformAccountsPage.tsx`.
`PlatformRolesPage.tsx` 의 역할 선택 배열에서도 제거했다.
→ 역할 부여·선택 UI 에서 두 역할을 **고를 수 없다**.

### 3-5. 의도적으로 건드리지 않은 인접 축 — unprefixed legacy role

`'admin'` / `'super_admin'` / `'operator'` (접두 없음) 는 `PrefixedRole` 과 **다른 legacy 축**이며
본 WO 범위 밖이다. 두 축이 함께 나열된 모든 배열에서 unprefixed 항목을 그대로 보존했다
(`lms.routes.ts`, `auth-login.service.ts`, `adminRouteAccess.ts`, `dashboard.routes.tsx`, `users.routes.tsx`).

## 4. 백엔드 변경

### 4-1. helper 정리 (WO 실행원칙 5)

| 파일 | 내용 |
|------|------|
| `utils/role.utils.ts` `isPlatformAdmin()` | allow-list 축소 → `hasServiceRole(roles,'platform:super_admin')`. **함수명은 유지** — `ServiceScope.isPlatformAdmin` **계약 필드명**과 짝이고 소비처가 5개 controller + `MembershipApprovalService` 등 ~30곳이라 rename 은 WO 범위 초과. JSDoc 에 사유 명시 |
| `utils/role.utils.ts` `hasPlatformRole()` | 파라미터 타입 `'admin' \| 'super_admin'` → `'super_admin'` (도달 불가 분기 제거) |
| `middleware/signage-role.middleware.ts` | 위 축소가 강제한 유일한 호출부 정정 — `hasPlatformRole(userRoles,'super_admin')` |
| `modules/auth/entities/User.ts` `isAdmin()` | `hasAnyRole([UserRole.SUPER_ADMIN])` |
| `utils/role.utils.ts` `isServiceAdmin`/`isServiceOperator` | 코드 본문은 이미 `platform:super_admin` 만 사용 중이었고, 사실과 어긋난 doc 줄만 제거 |

### 4-2. ⚠️ 동결 Core 파일 변경 1건 (FOLLOWUP 사유)

`apps/api-server/src/modules/auth/services/role-assignment.service.ts` (`@core O4O_PLATFORM_CORE`,
`Freeze: WO-O4O-CORE-FREEZE-V1`, 2026-03-11) 의 `isAdmin()` 을
`hasAnyRole(userId, [UserRole.SUPER_ADMIN])` 으로 축소했다.

- **불가피성**: `UserRole.ADMIN` enum 상수 제거가 컴파일 레벨에서 강제한 변경이다.
- **무해성**: 해당 역할 보유자 0명 → 판정 결과 불변. 구조·테이블·시그니처·계약 변경 없음.
- 이 파일의 `isAdmin()` 외부 소비처는 0건이다.

구조 변경이 아니라 **삭제된 상수의 참조 제거**이므로 중지 조건으로 보지 않고 진행했으며, 여기에 명시 보고한다.

### 4-3. 진단 스크립트

`apps/api-server/src/scripts/diagnose-admin-login.ts:244` — `UserRole.SUPER_ADMIN` 단독 판정.

## 5. 프런트엔드 변경

- 역할 상수·타입: §3-1
- route·menu 접근 조건: `admin-dashboard` (`users.routes.tsx`, `dashboard.routes.tsx`,
  `yaksa.routes.tsx` 주석, `AdminAccountsSettings.tsx`, `rolePermissions.ts`),
  `packages/auth-context` (`adminRouteAccess.ts`, `AuthProvider.tsx`),
  `web-neture` (`RoleGuard.tsx` PlatformRoute · `App.tsx` · `PlatformAdminLandingPage` ·
  `PlatformSectionLayout` · `ServiceAudiencePolicyPage` · `lib/api/platform.ts`)
- 역할 선택 UI · 표시명: §3-4
- `web-kpa-society` · `web-k-cosmetics` · `web-glycopharm` · `web-account`: §3-3, §3-4, 주석 정비

프런트 `user.scopes` · `user.permissions` 는 **미변경**(WO 제외 범위).

## 6. 테스트 · fixture · 문서 변경

### 6-1. 테스트 (허용 케이스 정비)

| 파일 | 변경 |
|------|------|
| `__tests__/membership-admin-guard.spec.ts` | `ADMIN` 헤더 상수 제거 → `SUPER_ADMIN` 로 통합, 중복 통과 블록 1개 제거, `MEMBERSHIP_ADMIN_ROLES` 기대값 `['platform:super_admin']`, 소스 계약 `toContain("'platform:admin'")` 제거 |
| `__tests__/membership-residual-subtree-guard.spec.ts` | 동일 패턴 |
| `__tests__/membership-category-inactive-list.spec.ts` | 기대값·제목 정비 |
| `__tests__/service-admin-guard.spec.ts` | `PLATFORM_ADMIN_ROLES` 대역 축소, legacy 통과 블록 제거 |
| `__tests__/security/isolation.spec.ts` | admin bypass **허용** 행렬에서 `['platform:admin']` 행 제거 |
| admin-dashboard `admin-menu-route-backend-alignment` / `admin-operation-boundary` / `admin-protected-route-access` / `membership-admin-api-contract` / `membership-category-menu-route` | 허용 role 행렬·소스 문자열 기대값 정비 |

### 6-2. 문서 (현재 계약을 설명하는 것만)

`docs/baseline/ROLE-POLICY-AND-GUARD-V1.md` (3건),
`docs/architecture/O4O-BOUNDARY-POLICY-V1.md` (1건),
`docs/baseline/BASELINE-OPERATOR-OS-V1.md` (1건),
`docs/architecture/SIGNAGE-APPROVAL-ARCHITECTURE-V1.md` (1건).

## 7. 의도적으로 보존한 역사 참조

### 7-1. 보안 거부 회귀 테스트 (WO §4 명시 요구 — 의미 보존)

| 파일 | 건수 | 내용 |
|------|:---:|------|
| `__tests__/security/scope-guard.spec.ts` | 7 | `platform:admin → denied (only super_admin bypasses)` 3개 케이스. 파일 헤더에 보존 사유 명시 |
| `__tests__/security/cross-service.spec.ts` | 2 | KPA guard 가 `platform:admin` 을 403 으로 막는다 |
| `__tests__/kpa-role-guard.spec.ts` | 2 | `deniedRoles` 목록 |

문자열이 다시 유입돼도 bypass 되지 않음을 고정하는 테스트이므로 **삭제하지 않고 보존 사유 주석만 추가**했다.
`createMockUser({ roles?: string[] })` 는 `PrefixedRole` 로 타입돼 있지 않아 union 축소에도 컴파일된다.

### 7-2. 과거 migration (미수정)

`20260205033223-RolePrefixMigrationFoundation` · `20260205070000-Phase4MultiServiceRolePrefixMigration` ·
`20260228000001-CleanupLegacyRoles` · `20260318100000-ExtendRolesTable` ·
`20261027000000-MigrateLegacyRolesToPlatformPrefixed` · `1771200000019-PrefixUnprefixedRoles`.

### 7-3. 과거 CHECK · IR · 감사 · 작업 기록 (미수정)

`docs/checks/**`, `docs/investigations/**`, `docs/audits/**`, `docs/archive/**`, `docs/work-orders/**`,
`docs/rbac/IR-*`, `docs/reference/**` — 총 91개 문서. 과거 시점 기록이므로 사실 그대로 둔다.

### 7-4. 본 WO 가 새로 남긴 주석

11개 production 파일에 제거 사유(`보유자 0 · 독립 권한 0 · 판정 결과 불변`)를 기록한 주석이 있으며,
그 안에서만 legacy 역할 문자열이 등장한다.

## 8. 제거 후 전체 검색 결과

저장소 전역 재검색(`*.ts/tsx/js/mjs/json/md/sql`, `node_modules`·`dist`·`.git` 제외) 결과 잔존 참조 분류:

| 분류 | 판정 |
|------|------|
| **production 코드의 활성 참조 (조건·배열·상수·타입·라벨)** | **0건** ✅ |
| production 주석 — 본 WO 가 기록한 제거 사유 | 11파일 (§7-4) |
| 의도 보존 보안 거부 회귀 테스트 | 3파일 11건 (§7-1) |
| 본 WO 가 테스트에 남긴 제거 사유 주석 | 5파일 |
| 과거 migration | 6파일 (§7-2) |
| 과거 CHECK·IR·감사·작업 기록 | 91파일 (§7-3) |
| 빌드 생성물 `apps/api-server/dist/**` | 미수정 (재빌드 시 자동 소멸) |

## 9. `platform:super_admin` 동작 불변 확인

1. 모든 allow-list 에서 `platform:super_admin` 은 **제거되지 않았다**. 축소는 legacy 원소에만 적용했다.
2. `dashboard.routes.tsx` 는 `['admin','super_admin']` 으로 남겼고 **치환하지 않았다**.
   `expandRequiredRoles` 가 `admin`·`super_admin` 트리거로 `platform:super_admin` 을 push 하므로 통과 대상 불변.
3. security-core `platformBypass` 설정·`platform:super_admin` bypass 경로 미변경 —
   `scope-guard.spec.ts` 의 super_admin bypass 허용 케이스 전부 통과.
4. `serviceScope.isPlatformAdmin` **계약 필드명·의미 미변경** → 소비 controller 5종 + `MembershipApprovalService` 영향 없음.

## 10. 서비스별 admin / operator 동작 불변 확인

- 혼합 배열에서 `{service}:admin` · `{service}:operator` 전부 보존 (§3-2 표).
- `isServiceAdmin` / `isServiceOperator` 는 코드 본문 무변경(doc 만 정정).
- `requireKpaScope` · `requireNetureScope` · `requireGlycopharmScope` · `requireCosmeticsScope` 구성 미변경.
- `kpa-role-guard.spec.ts` 의 `kpa:admin`·`kpa:operator` 허용 케이스, `cross-service.spec.ts` 의
  서비스 간 차단 행렬 전부 통과.

## 11. membership · 소유권 경계 불변 확인

- `service_memberships` · `role_assignments` · `organization_members` 구조·쿼리 **미변경**.
- membership 기반 guard(`createMembershipScopeGuard`), organization/resource ownership guard 로직 미변경.
- `__tests__/security/ownership.spec.ts` · `dashboard-assets-ownership-gate.spec.ts` ·
  `restricted-account-access.spec.ts` · `store-hub-product-apply-gate.spec.ts` 전부 통과.
- `membership-residual-subtree-guard.spec.ts` 의 조직 scope 차단(임의 organizationId 403) 통과.

**위험 회귀 4종 점검 결과 — 전부 미발생:**

| 위험 | 결과 |
|------|:----:|
| 빈 허용 목록 (`[]`) 발생 | 없음 — 모든 배열에 최소 1개 실역할 잔존 |
| 항상 false/true 가 된 guard | 없음 |
| 잘못된 기본 역할 / 역할 없는 관리자 생성 | 없음 (부여 로직 미변경) |
| super_admin·서비스 admin/operator 접근 차단 | 없음 (§9, §10) |
| 관리자 route·menu·API 의 무권한 공개 | 없음 — 제거는 **좁히는 방향**뿐이고 보호 선언을 지운 곳이 없다 |

## 12. 실행한 테스트 · typecheck · build

| 항목 | 결과 |
|------|:----:|
| `apps/api-server` typecheck (`tsc --noEmit -p tsconfig.build.json`) | ✅ 0 error |
| `apps/api-server` jest — guard/security/membership 15 suite | ✅ **434 tests passed** (15/15 suite) |
| `apps/admin-dashboard` vitest `src/tests/` | ✅ **224 tests passed** (13/13 file) |
| `apps/admin-dashboard` typecheck | ✅ 0 error |
| `packages/auth-context` build | ✅ |
| `packages/security-core` build | ✅ |
| `services/web-kpa-society` · `web-neture` · `web-k-cosmetics` · `web-account` · `web-glycopharm` typecheck | ✅ 5/5 0 error |

저장소 전체 build 는 실행하지 않았다(WO 검증 8항 — 변경 범위 밖).

## 13. DB · 계정 · JWT scope · migration · 배포 변경

| 항목 | 결과 |
|------|:----:|
| 운영 DB write (UPDATE/DELETE/DROP/ALTER) | **0** |
| 운영 DB 접속 · SQL 실행 | **0** (본 WO 는 코드 정적 작업) |
| 계정 · 역할 부여 변경 | **0** |
| migration 파일 추가·수정 | **0** |
| JWT scopes 생성·전달·guard | **미변경** |
| 프런트 `user.scopes` · `user.permissions` | **미변경** |
| yaksa 패키지·화면·API·scope / dropshipping | **미변경** (yaksa 는 `platform:admin` 소비 1건 제거만) |
| 배포 | **0** |
| `pnpm-lock.yaml` | **미변경** |

## 14. 타 세션 WIP 보존 결과

- modified `apps/api-server/src/scripts/hff-zh-b01-translate.mjs` — **미수정, staged 하지 않음, commit 제외**
- untracked 38건 (`apps/api-server/src/scripts/**`) — **미수정, 미추가**
- stash · reset · clean · amend · force-push **미사용**

commit 은 pathspec 을 명시한 `git commit -- <파일 목록>` 으로 수행했다.

## 15. CHECK 경로

`docs/checks/WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1-CHECK.md` (본 문서)

## 16. commit · push · ahead/behind

(커밋·push 후 기재)

---

## 후속 (FOLLOWUP)

1. **동결 Core 1건 사후 승인** — §4-2 `role-assignment.service.ts`.
   구조 변경이 아닌 삭제 상수 참조 제거이나, `WO-O4O-CORE-FREEZE-V1` 대상 파일이므로 기록해 둔다.
2. **배포 + 역할별 브라우저 smoke** — WO 제외 범위. 관리자 API guard P0 트랙 9번 항목과 함께 수행한다.
3. `apps/api-server/dist/**` 의 잔존 문자열은 다음 빌드 시 자동 소멸한다(소스 아님).
