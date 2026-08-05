# CHECK — WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1

> 백엔드 인증 구조에 남아 있던 **미완성 JWT scope 축**(생성·전달·판정)을 제거하고,
> 살아 있는 역할·membership·소유권 기반 권한 구조만 남긴다.

| 항목 | 값 |
|------|-----|
| 판정 | **PASS_WITH_FOLLOWUP** |
| 작성일 | 2026-08-05 |
| 기준 commit (작업 시작) | `b442bbb9cdf8e6f6af605cce33cc264061749d47` |
| origin/main (작업 시작) | `b442bbb9c` (동일 · ahead/behind 0/0) |
| 선행 CHECK | `WO-O4O-LEGACY-ADMIN-ROLE-AND-SCOPE-USAGE-AUDIT-V1` (`4f63b2844`) |
| 선행 제거 | `WO-O4O-LEGACY-PLATFORM-ADMIN-AND-OPERATOR-CODE-REMOVAL-V1` (impl `5a9826925` · CHECK `b442bbb9c`) |

---

## 1. 기준 commit · origin/main · 작업 트리

- `git branch --show-current` → `main`
- `git rev-parse HEAD` → `b442bbb9cdf8e6f6af605cce33cc264061749d47`
- `git rev-parse origin/main` → `b442bbb9cdf8e6f6af605cce33cc264061749d47` (fast-forward 불필요)
- `git status --short` → **타 세션 WIP 만 존재**: `apps/api-server/src/scripts/hff-zh-b01-translate.mjs` (M) + `apps/api-server/src/scripts/**` untracked 38건.
  작업 도중 타 세션이 `apps/api-server/src/controllers/PharmacyHubStoreDashboardController.ts` ·
  `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts` 를 추가 수정함.
  → **본 작업 대상 파일과 교집합 0**. 수정·삭제·restore·stash·stage 하지 않았고 path-specific 커밋으로 분리.

## 2. 선행 커밋 포함 여부

`git merge-base --is-ancestor` 결과 — `4f63b2844` **YES** / `5a9826925` **YES** / `b442bbb9c` **YES**.

## 3. scope 생성·전달·소비 경로 BEFORE / AFTER

| 단계 | BEFORE | AFTER |
|------|--------|-------|
| **생성** | `generateAccessToken()` 이 `deriveUserScopes()` 로 scopes 계산 → `payload.scopes` / 서비스·게스트 토큰은 `scopes: []` | scopes claim **생성 없음** (3 경로 전부) |
| **재발급** | `refresh-token.service.ts:141` → 동일 `generateAccessToken()` | 동일 함수 사용 → **계약 자동 일치** (별도 분기 없음) |
| **전달** | `requireAuth` 는 payload 에서 `roles` · `memberships` 만 `req.user` 로 이관. **scopes 는 이관한 적이 없음** (User 엔티티에 `scopes` 필드 자체가 없음) | 변경 없음 (원래부터 전달 경로 부재) |
| **소비** | `req.user.scopes` 참조 6곳 — 전부 항상 `undefined` → `[]` 로 접혀 **항상 false** | production 활성 소비 **0** |
| **프런트 공급** | `GET /auth/me` 가 `deriveUserScopes()` 로 별도 계산해 `user.scopes` 응답 | **불변 — 그대로 유지** |

핵심 사실: scope 는 **토큰에는 실렸으나 미들웨어가 요청 컨텍스트로 옮기지 않아**, 백엔드 판정에서 한 번도 성립한 적이 없는 축이었다.

## 4. 제거한 scope 상수 · 타입 · helper

| 파일 | 제거 대상 | 근거 |
|------|-----------|------|
| `apps/api-server/src/types/auth.ts` | `AccessTokenPayload.scopes` | claim 생성 제거 → 타입 잔존 불필요 |
| `packages/security-core/src/types.ts` | `SecurityUser.scopes` | 미들웨어가 채운 적 없는 필드 |
| `apps/api-server/src/utils/scope-assignment.utils.ts` | `getBasicScopesForRole` · `getOperatorScopesForService` · `getKpaSocietyOperatorScopes` · `detectServiceFromRole` | 소비처 0 (repo 전수 검색) |
| `apps/api-server/src/config/service-scopes.ts` | `getAllScopes` · `hasScope` · `extractServiceFromScope` · `hasAnyScopes` | 소비처 0 — 서로만 호출하던 폐쇄 그룹 |

**보존:** `SERVICE_SCOPES` · `getScopesByLevel` · `deriveUserScopes` — `GET /auth/me` 의 `user.scopes` 응답 계산 경로에서 계속 사용된다. WO 원칙 ②·⑤ 에 따라 **scope 를 추가하지 않았고 프런트 계약도 건드리지 않았다.**

## 5. 로그인 · refresh · JWT payload 변경

- `generateAccessToken()` — `deriveUserScopes()` 호출 및 `scopes` claim 제거. `roles` · `memberships` · `permissions` · `accountAccess` 등 나머지 claim 불변.
- `generateServiceAccessToken()` · `generateGuestAccessToken()` — `scopes: []` 제거.
- refresh 경로(`refresh-token.service.ts`)는 동일 함수를 호출하므로 **access token 과 완전히 같은 계약**. 별도 scope 생성 분기 없음(검증 ②).
- `import { deriveUserScopes }` 를 `token.utils.ts` 에서 제거.

## 6. 제거한 backend guard 분기

| 위치 | 제거한 것 | 남은 판정 축 | 동작 변화 |
|------|-----------|--------------|-----------|
| `packages/security-core/src/service-scope-guard.ts` | `user.scopes` 기반 `hasScope` (exact + `{service}:admin`) 및 `if (hasScope \|\| hasServiceRole)` 의 scope 항 | service-prefixed role + `platform:super_admin` bypass + cross-service DENY | **없음** (scope 항 상시 false) |
| `apps/api-server/src/routes/yaksa/yaksa.routes.ts` `requireYaksaScope` | `userScopes.includes(requiredScope)` · `userScopes.includes('yaksa:admin')` | `roles.includes('platform:super_admin')` | **없음** (`yaksa:*` 는 SERVICE_SCOPES 에 없어 발급 자체가 0) |
| `apps/api-server/.../kpa/controllers/member.controller.ts` hard-delete 인라인 체크 | `hasAdminScope` (`scopes.includes('kpa:admin')`) | `hasAdminRole`(role) OR `hasAdminMembership`(membership) | **없음** |
| 동 파일 soft-withdraw 감사 로그 | `scopes?.includes('kpa:admin') ? 'kpa:admin' : 'kpa:operator'` | 상수 `'kpa:operator'` | **없음** (실제로 늘 `'kpa:operator'` 였음) |
| `apps/api-server/src/controllers/OperatorNotificationController.ts` (2곳) | `req.user.scopes` 에서 `*:operator` 를 찾아 serviceCode 유추 | query 파라미터 → 기본값 `'neture'` | **없음** (분기 실행 이력 0) |
| glycopharm `application` · `admin` · `store-applications` controller | 로컬 `AuthRequest.user.scopes?: string[]` 타입 필드 | `roles` | 타입만 |

`{service}:admin` / `{service}:operator` 등 **주입형 `requireScope(...)` 호출 약 60여 곳은 전부 role·membership guard 로 동작**하므로 호출부는 하나도 변경하지 않았다(동명 3종 — `createServiceScopeGuard` 의 반환 함수 · `createMembershipScopeGuard` 의 반환 함수 · service-legal 위임 — 모두 role/membership 축).

## 7. 보존한 role · membership · 소유권 경계 (검증 ⑥)

| # | 경계 | 상태 |
|---|------|------|
| 1 | `platform:super_admin` | 불변 (유일한 platform bypass) |
| 2 | `{service}:admin` | 불변 |
| 3 | `{service}:operator` | 불변 |
| 4 | organization membership | 불변 |
| 5 | service membership (`createMembershipScopeGuard`) | 불변 — 파일 미변경 |
| 6 | supplier · store_owner 등 도메인 역할 | 불변 |
| 7 | `organization_id` · 리소스 소유권 · 승인/업무 상태 | 불변 |

검증 ⑦ 7가지 문제 미발생: 무권한 공개 0 / 빈 허용 목록 0 / 항상 true 0 / 항상 false 0 (`requireYaksaScope` 는 `platform:super_admin` 통과 유지) / super_admin 차단 0 / 서비스 admin·operator 차단 0 / membership 사용자 차단 0. 모든 변경이 **상시 false 였던 OR 항의 제거**이므로 허용 집합이 축소되지 않는다.

## 8. dropshipping 삭제 상태와 잔여 scope 정리 (검증 ④⑤)

- 기능·`dropshipping-admin` 라우터·`requireDropshippingScope` 는 **선행 타 세션 커밋 `0c857f984` 에서 이미 제거 완료**. 본 작업에서 재조사·복구하지 않았다(원칙 ⑦).
- 공용 인증 코드(`SERVICE_SCOPES` · JWT 생성 · guard · 테스트·fixture)에서 `dropshipping:*` **활성 참조 0** — 제거할 잔재가 남아 있지 않았다.
- 남은 `dropshipping` 문자열 분류:
  1. **현행 기능 · scope 아님** — `services/web-glycopharm/**` 5곳. 글라이코팜 입점 신청의 **판매 방식 라벨 맵 키**(`dropshipping: '무재고 판매'`). JWT scope 와 무관하므로 유지.
  2. **과거 CHECK · 작업 기록** — `docs/checks/**` (은퇴 감사 · census).
  3. **삭제 사실 설명 문서** — `docs/architecture/BUSINESS-SERVICE-RULES.md` 등.
  4. **과거 migration** — 미수정(원칙 ⑨).

## 9. yaksa scope 와 yaksa 실서비스 구조의 분리 (검증 ⑥ 경계)

- **제거:** `requireYaksaScope` 의 `yaksa:*` scope 판정 2분기. `yaksa` 는 `SERVICE_SCOPES` 키에 없어 어떤 경로로도 발급되지 않았다.
- **보존(미변경):** `@o4o/membership-yaksa` · `@o4o/forum-yaksa` · `@o4o/lms-yaksa` · `@o4o/annualfee-yaksa` · `/admin/yaksa/*` 화면 · `/api/v1/membership` · `/api/v1/lms-yaksa` · kpa-society role·membership 경계.
- `YaksaForumRouter` / `/api/v1/yaksa/*` route 자체의 처분은 **별도 WO** — 이번엔 scope 분기 제거에 필요한 최소 변경만 수행했다(§17 FOLLOWUP-2).

## 10. 프런트 `user.scopes` 불변 확인 (검증 ⑫)

- `GET /auth/me`(`auth-account.controller.ts`) 의 `deriveUserScopes()` 계산 및 `userData.scopes` 주입 **미변경**.
- `projectRestrictedUser()` 의 `ud.scopes = []` **미변경**.
- 프런트 소비처 `apps/admin-dashboard/src/stores/authStore.ts` · `hooks/useOperatorPolicy.ts` **미변경** — 프런트 파일 변경 0.

## 11. production · test-only · docs-only · history 구분

| 구분 | 내용 |
|------|------|
| production 변경 | 11개 파일 (§4·§6 표) |
| test-only 변경 | `__tests__/security/test-utils.ts` (mock shape 축소) · `__tests__/security/scope-guard.spec.ts` (`admin scope match` describe 2케이스 제거 — guard 의 scope 분기 자체가 사라졌고 프로덕션에서 성립한 적 없는 경로. **역할 기반 허용/거부 케이스는 전부 보존**) |
| docs-only | 본 CHECK 신규 1건. 기존 문서 미수정 |
| history | 과거 migration · 과거 CHECK · 감사 문서 전부 미수정(원칙 ⑨) |

## 12. 제거 후 전체 재검색 결과

- `apps/api-server/src` + `packages/security-core/src` 에 남은 `scopes` 문자열 = **`/auth/me` 계약 경로 · 본 WO 설명 주석 · 무관 항목**(`entities/App.ts` OAuth 앱 scopes · migration 로그 문자열 · `signage-role.middleware.ts` 산문 주석)뿐. **backend 권한 판정용 scope 참조 0**.
- `dropshipping:` 활성 코드 참조 = glycopharm 판매방식 라벨 5건뿐 (scope 아님).

## 13. 테스트 결과 (검증 ⑧⑨)

```
apps/api-server: npx jest --silent
Test Suites: 73 passed, 73 total
Tests:      1306 passed, 1306 total
```
로그인·refresh·토큰 검증·관리자 guard·membership guard·scope guard·cross-service·isolation·ownership 스위트 전부 포함, 실패 0.

## 14. typecheck · build 결과 (검증 ⑩⑪)

| 대상 | 결과 |
|------|------|
| `@o4o/security-core` build (`tsc --build`) | ✅ 0 error |
| `apps/api-server` `tsc --noEmit -p tsconfig.build.json` | ✅ 0 error |
| security-core 소비 앱 | `@o4o/security-core` 의존 package.json = `apps/api-server` **단독** → 추가 build 대상 없음 |
| 프런트 앱 | 변경 0 → 영향 없음 |

## 15. 변경 0 확인 (검증 ⑬)

운영 DB write **0** / 계정·역할·membership 변경 **0** / schema·migration·seed 변경 **0** / 프런트 `user.scopes` 변경 **0** / dropshipping 복구 **0** / 배포 **0**. 운영 DB 접속 자체를 수행하지 않았다.

## 16. 타 세션 WIP 보존

`hff-zh-b01-translate.mjs` + `src/scripts/**` untracked 38건 + 작업 중 추가된 `PharmacyHubStoreDashboardController.ts` · `pharmacy-hub.routes.ts` — **전부 미수정·미스테이지**. `git add .` 미사용, 자기 파일 목록만 명시적으로 add.

## 17. 후속 작업

- **FOLLOWUP-1 — Frozen 패키지 사후 승인**: `packages/security-core` 는 F1 (`BASELINE-OPERATOR-OS-V1`, 2026-02-16) Freeze 대상이다. 본 변경은 **상시 false 였던 죽은 분기 제거**로 허용 집합을 바꾸지 않으나, 절차상 `WO-O4O-CORE-FREEZE-V1` 계열 사후 확인이 필요하다.
- **FOLLOWUP-2 — `/api/v1/yaksa/*` route 처분**: `requireYaksaScope` 가 이제 `platform:super_admin` 전용 가드로 남았다. route·컨트롤러 자체의 존폐(실서비스 `@o4o/*-yaksa` 패키지와 별개)는 별도 WO 로 판단한다.
- **FOLLOWUP-3 — 프런트 `user.scopes` 존폐**: 백엔드 판정 축이 사라졌으므로 `/auth/me` 의 `user.scopes` 는 이제 **프런트 표시 전용**이다. `useOperatorPolicy` 가 이를 소비 중이므로 이번엔 유지했으나, role 축으로의 정렬 여부는 별도 판단 대상이다.
- **FOLLOWUP-4 — 감사 로그 라벨**: KPA soft-withdraw 감사 로그의 `operator_role` 이 상수 `'kpa:operator'` 로 고정된다(기존 실동작과 동일). role 축 기반 정확 라벨링은 별도 판단.
- (이월) 관리자 9단계 중 **역할별 프로덕션 브라우저 smoke** 는 본 WO 제외 범위로 여전히 미실시.

## 18. CHECK 경로

`docs/checks/WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1-CHECK.md`

## 19. commit · push · ahead/behind

| 항목 | 값 |
|------|-----|
| 구현 commit | `2e06c94f1` — 14 files, +77 / −153 (자기 파일만 path-specific) |
| CHECK commit | 본 커밋 |
| push | 완료 |
| ahead/behind | 0/0 |

---

## 완료 문장

> 백엔드에서 실제 권한 판정에 연결된 적 없는 JWT scope 축을 제거하고, 살아 있는 역할·membership·소유권 기반 권한 구조만 남겼다.
> 이미 삭제된 dropshipping 기능은 복구하지 않았으며, 관련 scope 잔재도 production 코드에서 제거했다.
