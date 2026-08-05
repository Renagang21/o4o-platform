# WO-O4O-ADMIN-OPERATION-ACCOUNT-ROLE-JWT-SCOPE-READONLY-CENSUS-V1 — CHECK

관리자 운영 계정·역할·JWT scope 전달 경로 read-only census (후속 순서 8번)

**완료 판정: `PASS_WITH_FOLLOWUP`**

---

## 1. 기준 커밋 · 조사 시각

| 항목 | 값 |
|------|-----|
| 브랜치 | `main` |
| 조사 시작 HEAD | `b482a1bd6` |
| 작성 시점 HEAD | `ed066f840` (타 세션 커밋 진행 중) |
| 조사 시각 (UTC) | 2026-08-04T23:37:11Z ~ 2026-08-05T00:14:35Z |
| 운영 DB | `netureyoutube:asia-northeast3:o4o-platform-db` / `o4o_platform` |
| 접속 경로 | cloud-sql-proxy `127.0.0.1:15481` (본 세션 전용 포트) |
| DB 사용자 | `o4o_api` |

선행 커밋 4개 모두 현재 HEAD의 ancestor 로 확인:

| 커밋 | 후속 순서 | 확인 |
|------|:---:|:---:|
| `26f04de6e` | 5번 메뉴 권한 선언 정비 | ancestor |
| `456242de7` | 6번 개별 API 경로 오류 정비 | ancestor |
| `13d30fef3` | 7번 역할 순서·운영 주체 확정 | ancestor |
| `b482a1bd6` | 7번 CHECK §18 보정 | ancestor |

**작업 트리 상태:** clean 아님. 타 세션 3건(HFF ZH 번역 배치, easy-drug 코퍼스 재구축, dropshipping-admin 은퇴)의 WIP 가 존재한다. 사용자가 "진행" 으로 병행을 명시 승인하여 계속하였고, **타 세션 파일은 열람 목적 외 수정·삭제·stash·stage 하지 않았다.**

---

## 2. read-only 안전장치 · write 0 증거

세션 고정:

```
PGOPTIONS='-c default_transaction_read_only=on'
SHOW default_transaction_read_only;  →  on
```

쓰기 차단 실증(의도적 실패 probe):

```
CREATE TEMP TABLE _wo_probe(x int);
ERROR:  cannot execute CREATE TABLE in a read-only transaction
```

- 실행한 SQL 은 `SHOW` / `SELECT` / `information_schema` 조회뿐이다.
- INSERT·UPDATE·DELETE·DDL 을 **의도적 차단 probe 1건 외에는 시도하지 않았고**, 그 1건도 서버가 거부하여 반영 0이다.
- 역할 부여·회수 API, 로그인 API, 토큰 발급 API 를 **호출하지 않았다.**

---

## 3. 운영 역할 전체 모집단 (role 문자열별, 접두 합산 금지)

`role_assignments` 전체 **51 rows / distinct 계정 28명 / is_active=true 43 rows**.

| role 문자열 | 배정 rows | distinct 계정 | active rows | 현재 유효 계정 | 로그인 가능 계정 |
|-------------|---:|---:|---:|---:|---:|
| `customer` | 8 | 8 | 7 | 7 | 5 |
| `supplier` | 6 | 6 | 6 | 6 | 3 |
| `kpa:store_owner` | 5 | 5 | 5 | 5 | 5 |
| `platform:super_admin` | 5 | 4 | 2 | 2 | **2** |
| `pharmacy-hub:store_owner` | 3 | 3 | 3 | 3 | 3 |
| `glycopharm:admin` | 2 | 2 | 2 | 2 | 2 |
| `glycopharm:operator` | 2 | 2 | 2 | 2 | 2 |
| `cosmetics:store_owner` | 2 | 2 | 2 | 2 | 2 |
| `pharmacy` | 2 | 2 | 2 | 2 | 1 |
| `neture:operator` | 2 | 2 | 1 | 1 | 1 |
| `cosmetics:operator` | 2 | 2 | 1 | 1 | 1 |
| `cosmetics:admin` | 2 | 2 | 1 | 1 | 1 |
| `kpa:admin` | 1 | 1 | 1 | 1 | 1 |
| `kpa:operator` | 1 | 1 | 1 | 1 | 1 |
| `neture:admin` | 1 | 1 | 1 | 1 | 1 |
| `glycopharm:store_owner` | 1 | 1 | 1 | 1 | 1 |
| `pharmacy-hub:operator` | 1 | 1 | 1 | 1 | 1 |
| `pharmacy-hub:supplier` | 1 | 1 | 1 | 1 | 1 |
| `lms:instructor` | 1 | 1 | 1 | 1 | 1 |
| `user` | 1 | 1 | 1 | 1 | 1 |
| `store_owner` | 1 | 1 | 1 | 1 | **0** |
| `super_admin` | 1 | 1 | **0** | 0 | 0 |
| **합계** | **51** | (50, 중복포함) | **43** | — | — |

- `platform:admin` 은 **행 자체가 0** 이다 (아래 §4).
- "현재 유효" = `is_active AND valid_from<=now() AND (valid_until IS NULL OR valid_until>now())`.
- "로그인 가능" = 위 + `users.isActive = true` + `users.status IN ('active','approved')` (`account-access.policy.ts` 의 `resolveAccountAccess` 가 이 두 상태만 `normal` 로 판정).

**합계 정합 검증:** role별 배정 rows 합 51 = 전체 51 ✓. role별 distinct 계정 합 50 ≠ 전체 distinct 28 — 불일치 원인은 **복수 역할 보유**이며, 아래 §8 의 분포(단일 22명 + 4역할 1명 + 7역할 1명 + 10역할 1명 = 22 + 21 = 43 active 배정)로 정확히 설명된다 ✓.

---

## 4. `platform:admin` / `platform:super_admin` 현황 (분리 집계)

| 항목 | `platform:admin` | `platform:super_admin` |
|------|---:|---:|
| 전체 배정 rows | **0** | 5 |
| distinct 계정 | **0** | 4 |
| active 배정 | **0** | 2 |
| 현재 유효 계정 | **0** | 2 |
| 로그인 가능 계정 | **0** | **2** |

두 역할을 **동시에 보유한 계정: 0명.**

`platform:super_admin` 5행 상세 (비가역 해시 식별자, 개인정보 없음):

| uhash | is_active | users.status | isActive | 비밀번호 보유 | 로그인 이력 | valid_until |
|-------|:---:|---|:---:|:---:|:---:|---|
| `42a3b315` | true | active | true | O | O | (없음) |
| `fe8233b2` | true | approved | true | O | O | (없음) |
| `42a3b315` | false | active | true | O | O | (없음) |
| `16dd1bae` | false | active | true | O | O | (없음) |
| `ef54799e` | false | active | true | O | O | (없음) |

- 활성 2건 중 `42a3b315` 는 비활성 이력 1건이 함께 남아 있다(회수 후 재부여 흔적). 동일 role 의 **중복 active 는 0건**이므로 정합성 문제는 아니다.
- `16dd1bae` · `ef54799e` 는 계정은 살아 있으나 역할이 회수된 상태다.

**판정:**
- 플랫폼 최고 관리자(`platform:super_admin`) 는 **로그인 가능한 활성 계정 2명**이 실재하므로 9번 smoke 수행이 가능하다.
- 반면 **`platform:admin` 보유자는 프로덕션 전체에 0명**이다. 이는 이번 census 의 최대 발견 사항이다 (§16-A).
- WO 지시대로 **역할을 부여하지 않았고, guard 를 완화하지도 않았다.**

**최초·비상 관리자 생성 경로 (존재 확인만, 실행하지 않음):**

| 경로 | 위치 | 성격 |
|------|------|------|
| migration `ActivateAdminUser` | `apps/api-server/src/database/migrations/1770601460383-ActivateAdminUser.ts` | legacy `users.roles` 배열 직접 write (RBAC SSOT 이전 방식) |
| 역할 접두 migration 3종 | `20260205040103-KpaRolePrefixMigration` 외 | `super_admin` → `platform:super_admin` 승격, `admin`(무 service_key) → `platform:admin` 승격 |
| 진단 스크립트 | `apps/api-server/src/scripts/diagnose-admin-login.ts` | `assignRole` 호출 포함 |
| 계정 생성 스크립트 | `create-admin-user.ts` · `reset-admin-password.ts` | 수동 운영 도구 |

→ **비상 관리자 부트스트랩은 API·화면이 아니라 migration/스크립트로만 가능**하다.

---

## 5. 서비스 접두 역할 현황 (role 문자열별)

| role 문자열 | 접두 | 성격 | active 계정 | 로그인 가능 | 동일 service_key membership 연결 |
|-------------|------|------|---:|---:|---:|
| `glycopharm:admin` | glycopharm | admin | 2 | 2 | 2 / 2 |
| `glycopharm:operator` | glycopharm | operator | 2 | 2 | 2 / 2 |
| `glycopharm:store_owner` | glycopharm | store | 1 | 1 | 1 / 1 |
| `neture:admin` | neture | admin | 1 | 1 | 1 / 1 |
| `neture:operator` | neture | operator | 1 | 1 | 1 / 1 |
| `cosmetics:admin` | cosmetics | admin | 1 | 1 | **0 / 1** |
| `cosmetics:operator` | cosmetics | operator | 1 | 1 | **0 / 1** |
| `cosmetics:store_owner` | cosmetics | store | 2 | 2 | **0 / 2** |
| `kpa:admin` | kpa | admin | 1 | 1 | **0 / 1** |
| `kpa:operator` | kpa | operator | 1 | 1 | **0 / 1** |
| `kpa:store_owner` | kpa | store | 5 | 5 | **0 / 5** |
| `pharmacy-hub:operator` | pharmacy-hub | operator | 1 | 1 | 1 / 1 |
| `pharmacy-hub:store_owner` | pharmacy-hub | store | 3 | 3 | 3 / 3 |
| `pharmacy-hub:supplier` | pharmacy-hub | supplier | 1 | 1 | 1 / 1 |
| `lms:instructor` | lms | 기능 역할 | 1 | 1 | **0 / 1** (lms 는 service 가 아님) |
| `platform:super_admin` | platform | 플랫폼 | 2 | 2 | 1 / 2 |

**실제 존재하는 role 접두 7종:** `cosmetics` · `glycopharm` · `kpa` · `lms` · `neture` · `pharmacy-hub` · `platform`

**축 불일치 (중요):** membership 연결 0 은 membership 부재가 아니라 **키 문자열 축이 다르기 때문**이다. `service_memberships.service_key` 실측 값은 `glycopharm` · `k-cosmetics` · `kpa-society` · `neture` · `pharmacy-hub` · `platform` 이다.

| role 접두 | 대응 service_key | 일치 |
|---|---|:---:|
| `cosmetics:` | `k-cosmetics` | ✗ |
| `kpa:` | `kpa-society` | ✗ |
| `glycopharm:` / `neture:` / `pharmacy-hub:` / `platform:` | 동일 | ✓ |

→ `split_part(role,':',1) = service_key` 를 가정한 코드가 있다면 cosmetics·kpa 에서 오작동한다. 역할명만으로 serviceKey 를 추측하지 말라는 WO 지시가 실측으로 확인되었다.

**service_memberships 현황 (참고):**

| service_key | status | rows |
|---|---|---:|
| glycopharm | active | 4 |
| k-cosmetics | active / pending | 5 / 1 |
| kpa-society | active | 5 |
| neture | active | 4 |
| pharmacy-hub | active / rejected | 4 / 1 |
| platform | active | 7 |

membership 의 `role` 컬럼 값은 표기 규약이 혼재한다 — 무접두(`admin`, `operator`, `customer`, `user`, `supplier`, `pharmacy`)와 접두(`pharmacy-hub:operator`, `cosmetics:store_owner`) 가 같은 컬럼에 섞여 있다. **RBAC 판정 SSOT 는 `role_assignments` 이므로 판정에는 영향이 없으나**, membership.role 을 권한 판정에 쓰는 코드가 생기면 즉시 결함이 된다.

**미사용(보유자 0) 역할:** 코드가 참조하지만 프로덕션 보유자가 없는 역할 — `platform:admin`(0명), `yaksa:*`(role_assignments 에 접두 자체 없음), `dropshipping:*`(동일).

---

## 6. legacy 무접두 역할 잔존

| role | rows | active |
|---|---:|---:|
| `customer` | 8 | 7 |
| `supplier` | 6 | 6 |
| `pharmacy` | 2 | 2 |
| `store_owner` | 1 | 1 |
| `user` | 1 | 1 |
| `super_admin` | 1 | **0** |

- **권한 관점 잔존 위험은 `super_admin` 1건뿐이며, 이미 `is_active=false` 로 무효**다. 접두 없는 `admin` 은 0건이다.
- 나머지 무접두 역할(`customer`/`supplier`/`pharmacy`/`store_owner`/`user`) 은 관리자 권한이 아닌 일반 사용자 역할로, 접두 migration 대상에 포함되지 않은 채 정상 사용 중이다.
- 7번에서 확정한 "접두 없는 `admin`·`super_admin` 을 허용 역할에 복원하지 않는다" 는 경계는 **실측상 안전**하다 (복원하지 않아도 잠기는 계정이 0명).

---

## 7. 계정 상태 집계

`users` 전체 **40 rows**.

| users.status | rows | isActive=true | accountAccess 판정 |
|---|---:|---:|---|
| `active` | 16 | 16 | normal |
| `deleted` | 19 | 0 | **blocked** (TS enum 밖 legacy 값 → fail-closed) |
| `approved` | 4 | 4 | normal |
| `pending` | 1 | 1 | restricted (allowlist 경로만) |

| 집계 | 값 |
|---|---:|
| 전체 계정 | 40 |
| `isActive = true` | 21 |
| 로그인 가능 (isActive ∧ status∈{active,approved}) | **20** |
| 삭제/탈퇴 상태 | 19 |
| `permissions` 가 `[]` 가 아닌 계정 | **0** |

상태 합계 검증: 16 + 19 + 4 + 1 = 40 = 모집단 ✓

---

## 8. 복수 역할 · 중복 · orphan

| 항목 | 값 |
|---|---:|
| active 역할 1개 보유 계정 | 22 |
| active 역할 4개 보유 계정 | 1 |
| active 역할 7개 보유 계정 | 1 |
| active 역할 10개 보유 계정 | 1 |
| **동일 (user, role) 중복 active 배정** | **0** |
| **orphan 배정 (users 에 없는 user_id)** | **0** |
| `valid_until` 설정 배정 | 0 (만료 배정 0) |
| `assigned_by` 미기록 배정 | 20 / 51 |
| 자기 자신이 부여한 배정 | 0 |
| `scope_type` | 전부 `global` (51/51), `organizationId` 사용 0 |

**차단 상태 계정이 active 역할을 보유:** 7계정 / 7배정 (전부 `status='deleted'`). 인증 단계(`requireAuth` → `enforceAccountAccess`) 에서 blocked 되므로 **권한 상승 위험은 없으나, 역할 회수 없이 계정만 삭제 처리된 잔여**다.

---

## 9. DB role → JWT roles 전달 경로

```
role_assignments (SSOT)
  └─ RoleAssignmentService.getActiveRoles(userId)
       find({ userId, isActive: true }).filter(a => a.isValidNow())
       ※ isValidNow(): isActive → valid_from<=now → valid_until>now
  └─ getRoleNames(userId) → string[]
       ↓
  freshenUserContext(userId)            [services/auth/auth-context.helper.ts]
       roles = getRoleNames(userId)
       memberships = SELECT service_key, status, role FROM service_memberships WHERE user_id=$1
       ↓
  generateAccessToken(user, roles, domain, memberships)   [utils/token.utils.ts]
       payload.role        = roles[0] || 'user'
       payload.roles       = roles                 ← DB 값 그대로, 변환·필터 없음
       payload.permissions = user.permissions || []
       payload.scopes      = deriveUserScopes({ role: roles[0], roles })
       payload.memberships = memberships
       payload.accountAccess = resolveAccountAccess(user.status)
       exp = 15분 / refresh 7일
       ↓
  requireAuth  [common/middleware/auth/authentication.middleware.ts:148-154]
       user.roles       = payload.roles || []
       user.memberships = payload.memberships || []
       req.user = user
```

**검증 결과:**
- DB role 문자열 → JWT `roles` 배열까지 **변환·매핑·누락 없음**. 접두 그대로 전달된다.
- 갱신 시점: 로그인(`auth-login.service.ts` 4개 경로) · refresh(`refresh-token.service.ts:132`, `auth-token-session.service.ts:113`) 모두 `getRoleNames` / `freshenUserContext` 로 **DB 재조회**한다. → 역할 회수는 **최대 access token 수명 15분** 안에 반영된다.
- `requireAuth` 는 매 요청 `users` 를 재조회하므로 계정 상태(`status`, `isActive`) 판정은 **항상 DB 기준**이다. JWT claim 위조로 승격 불가.

---

## 10. JWT scopes — 생성 · 공급 · 소비 (핵심 결함)

**생성 (코드상 존재):** `deriveUserScopes()` [`utils/scope-assignment.utils.ts`]

```
rolesToScopeLevel: super_admin|admin(접미 매칭 포함) → 'admin'
                   operator → 'operator'
                   user/customer/member/pharmacy/... → 'member'
targetServices  : serviceCode 가 주어지면 [serviceCode]
                  없고 scopeLevel==='admin' 이면 Object.keys(SERVICE_SCOPES)
                  그 외 → []           ← 여기서 비어버린다
```

**결함 1 — 비관리자에게는 토큰에도 scope 가 생성되지 않는다.**
로그인 경로는 `deriveUserScopes` 에 `serviceCode` 를 **전달하지 않는다**. 따라서 `scopeLevel !== 'admin'` 인 모든 계정(operator 포함)의 `targetServices` 가 `[]` 가 되어 `payload.scopes = []` 다. 프로덕션의 operator 역할 보유자 5명(`glycopharm:operator` 2, `neture:operator` 1, `cosmetics:operator` 1, `kpa:operator` 1, `pharmacy-hub:operator` 1) 은 **토큰에 scope 를 받지 못한다.**

**결함 2 — 생성된 scope 조차 `req.user` 에 전달되지 않는다.**
`authentication.middleware.ts` 의 세 개 인증 블록(`requireAuth` L148-154, `optionalAuth` L222-225, `requirePlatformUser` L316-319) 은 **`roles` 와 `memberships` 만 할당하고 `scopes` 는 할당하지 않는다.** DB 에서 로드한 `User` 엔티티에 scopes 필드가 채워지는 지점이 없으므로, 백엔드의 모든 `req.user.scopes` 읽기는 `undefined → []` 로 평가된다.

**결함 3 — 일부 scope 는 애초에 생성 불가능하다.**
`config/service-scopes.ts` 의 `SERVICE_SCOPES` 키는 `glycopharm` · `neture` · `kpa-society` · `cosmetics` **4개뿐**이며 `yaksa` · `dropshipping` 이 없다. 따라서 `yaksa:admin` · `dropshipping:admin` scope 는 어떤 경로로도 발급되지 않는다.

**소비 지점의 실제 판정 결과:**

| 가드 | 위치 | scope 조건 | 실제 통과 조건 |
|------|------|---|---|
| `requireYaksaScope` | `routes/yaksa/yaksa.routes.ts:14-45` | `scopes.includes('yaksa:admin')` | scope 항상 `[]` → **`platform:admin` 또는 `platform:super_admin` role 보유자만** |
| `requireScope('yaksa:admin')` ×9 | `routes/yaksa/yaksa.controller.ts` (186,224,263,306,343,369,405,443,474) | 동일 | 동일 |
| `requireDropshippingScope` | `routes/dropshipping-admin/dropshipping-admin.routes.ts:26-37` | `scopes.includes('dropshipping:admin')` | scope 항상 `[]` → `neture:admin` · `platform:admin` · `platform:super_admin` role 보유자만 |

`platform:admin` 보유자가 0명이므로(§4), **yaksa 관리자 API 는 현재 `platform:super_admin` 2계정만 접근 가능**하다.

> 참고: dropshipping-admin 라우터는 조사 시점 타 세션이 은퇴(staged delete) 진행 중이다. 본 CHECK 는 조사 시점 origin/main 기준 기록이며, 해당 은퇴 결과는 그 세션의 산출물에서 확인해야 한다.

**추가 불일치:** `User.toPublicData()` 는 `scopes: []` 를 하드코딩하는데, `/auth/me`(`auth-account.controller.ts:35-75`) 는 `deriveUserScopes` 로 재계산하여 `userData.scopes` 를 덮어쓴다. → **프론트가 보는 scopes 와 백엔드가 판정에 쓰는 scopes(`[]`) 가 서로 다르다.** 제한 계정은 `account-access.policy.ts:165-166` 에서 `scopes=[] / permissions=[]` 로 강제된다.

---

## 11. `user.permissions` 공급 여부 (현황 조사만)

| 항목 | 결과 |
|---|---|
| 컬럼 실재 | `users.permissions` `json NOT NULL DEFAULT '[]'` |
| JWT 반영 | `payload.permissions = user.permissions \|\| []` (그대로 복사) |
| 백엔드 write 지점 | **없음** (`auth-login.service.ts:461` 계정 생성 시 `permissions: []` 고정이 유일) |
| 프로덕션 비어있지 않은 계정 수 | **0 / 40** |

→ 7번 결론(백엔드가 permissions 를 채우지 않으므로 프론트에서 `requiredPermissions` 단독 판정 시 전원 잠김)이 **프로덕션 실측으로 확인**되었다. WO 지시대로 **공급을 시작하지 않았다.**

---

## 12. 역할 발급 · 회수 경로 (존재 확인만, 호출하지 않음)

| # | 경로 | 가드 | 성격 |
|---|------|------|------|
| 1 | `POST /api/v1/operator/membership/:userId/roles` → `MembershipConsoleController.assignMemberRole` (L1150) | `authenticate` + `requireRole([...])` + `injectServiceScope` | 운영자 콘솔 — canonical 역할 부여 |
| 2 | `DELETE /api/v1/operator/membership/:userId/roles/:role` → `removeMemberRole` (L1265) | 동일 | 회수. **마지막 `platform:super_admin` 회수 차단 로직 내장** (L1240-1258) |
| 3 | `DELETE /api/v1/admin/users/:userId/role-assignments/:role` → `AdminUserController.revokeRoleAssignment` | `requireRole(['platform:admin','platform:super_admin'])` | 계정 삭제 없이 배정만 비활성화. **`platform:super_admin` 회수 전면 차단** (L507-511) |
| 4 | `AdminUserController` 계정 생성·수정 (L254/290/368/372) | 동일 ADMIN_ROLES | 생성 시 역할 동시 부여 |
| 5 | 서비스 승인 흐름 자동 부여 | 각 서비스 가드 | `supplier.service.ts`(supplier), `member.controller.ts`(kpa), `instructor.service.ts`(lms:instructor), `cosmetics-store.service.ts`, `glycopharm-member.service.ts`, `partner-contract.service.ts`, `socialAuthService.ts` |
| 6 | migration / 스크립트 | 없음(운영자 수동) | `ActivateAdminUser` migration, `create-admin-user.ts`, `diagnose-admin-login.ts`, 접두 migration 3종 |
| 7 | 프론트 화면 | `AdminProtectedRoute` | `OperatorsPage.tsx`(단건·일괄 회수), `UsersListClean.tsx`(회수) — **부여 전용 화면은 확인되지 않음** |

**중요:** 경로 3·7 의 가드가 `['platform:admin','platform:super_admin']` 인데 `platform:admin` 보유자가 0명이므로, **역할 회수 화면·API 는 `platform:super_admin` 2계정에만 열려 있다.** `platform:super_admin` 자신은 이 API 로 회수 불가(자기 보호)이므로, 최고 관리자 교체는 **migration/스크립트 없이는 불가능**하다.

WO 지시대로 위 경로를 **하나도 호출하지 않았다.**

---

## 13. 7번 CHECK §16 항목별 답변

| # | 7번이 8번에 넘긴 질문 | 실측 답변 |
|---|---|---|
| 1 | `platform:admin` · `platform:super_admin` 활성 계정 수 | `platform:admin` **0명** / `platform:super_admin` **활성 2명(둘 다 로그인 가능)** |
| 2 | 서비스 접두 admin·operator 보유 현황 | admin 4명(glycopharm 2, neture 1, cosmetics 1, kpa 1 — 계정 기준 5배정), operator 5명. 전원 로그인 가능. `yaksa:*` · `dropshipping:*` 보유자 0 |
| 3 | legacy 무접두 `admin`/`super_admin` 잔존 여부 | 무접두 `admin` **0건**, `super_admin` 1건이나 `is_active=false` → **유효 잔존 0** |
| 4 | `user.permissions` 를 실제로 공급하는가 | **공급하지 않는다.** 비어있지 않은 계정 0/40, write 코드 0 |
| 5 | JWT scopes 가 백엔드 guard 까지 도달하는가 | **도달하지 않는다.** 생성은 되나 `authentication.middleware` 가 `req.user.scopes` 를 할당하지 않아 모든 scope guard 가 `[]` 로 평가 (§10) |
| 6 | 9번 smoke 를 수행할 역할별 계정이 존재하는가 | **부분 가능.** `platform:super_admin` · 서비스 admin/operator · store_owner 는 계정 존재. `platform:admin` · `yaksa:*` · `dropshipping:*` 는 **계정 부재로 검증 불가** (§14) |

---

## 14. 9번 smoke 계정 가용성 표

| 역할 | 로그인 가능 계정 | 9번 smoke | 비고 |
|------|---:|:---:|---|
| `platform:super_admin` | 2 | 가능 | 관리자 전 영역 |
| `platform:admin` | **0** | **불가** | 프로덕션 보유자 없음 — 별도 결정 필요 |
| `kpa:admin` | 1 | 가능 | |
| `kpa:operator` | 1 | 가능 | |
| `kpa:store_owner` | 5 | 가능 | |
| `neture:admin` | 1 | 가능 | |
| `neture:operator` | 1 | 가능 | |
| `glycopharm:admin` | 2 | 가능 | |
| `glycopharm:operator` | 2 | 가능 | |
| `glycopharm:store_owner` | 1 | 가능 | |
| `cosmetics:admin` | 1 | 가능 | |
| `cosmetics:operator` | 1 | 가능 | |
| `cosmetics:store_owner` | 2 | 가능 | |
| `pharmacy-hub:operator` | 1 | 가능 | |
| `pharmacy-hub:store_owner` | 3 | 가능 | |
| `pharmacy-hub:supplier` | 1 | 가능 | |
| `lms:instructor` | 1 | 가능 | |
| `supplier` (무접두) | 3 | 가능 | |
| `customer` (무접두) | 5 | 가능 | 비권한 대조군 |
| `yaksa:*` scope | **0** | **불가** | scope 발급 경로 자체가 없음 |
| `dropshipping:*` scope | **0** | **불가** | 동일 |
| `pending` 상태 (restricted) | 1 | 가능 | 제한 로그인 경계 검증용 |

> 계정 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 에서만 확인한다. 본 CHECK 에는 이메일·비밀번호·UUID 를 기록하지 않는다.

---

## 15. 이번 작업으로 검증할 수 없는 항목

| 항목 | 사유 |
|---|---|
| 실제 JWT claim 의 런타임 값 | 승인된 인증 계정으로 로그인을 수행하지 않았다. **추정하지 않고 코드 경로 판정만 기록**했다 |
| 역할 부여·회수 API 의 실제 동작 | WO 가 호출을 금지했다 |
| `platform:admin` guard 통과 여부 | 보유 계정 0명 |
| yaksa / dropshipping 관리자 API 응답 | scope 발급 불가 + 계정 부재 |
| 역할별 화면 접근 결과 | 9번 범위 |

---

## 16. 별도 후속 작업 필요 여부

| # | 사안 | 심각도 | 필요 조치 |
|---|---|---|---|
| A | **`platform:admin` 보유자 0명** — `ADMIN_ROLES` · `MEMBERSHIP_ADMIN_ROLES` · `authorization.middleware` 등 다수 지점이 이 역할을 허용하지만 실제 보유자가 없다. 현행 운영은 `platform:super_admin` 2계정에 전적으로 의존한다 | **높음** | 별도 WO — `platform:admin` 을 실사용 역할로 확정하고 부여할지, 아니면 코드에서 정리할지 정책 결정 |
| B | **JWT scopes 가 `req.user` 에 전달되지 않음** — scope 기반 guard 전부가 role fallback 으로만 동작 | **높음** | 별도 WO — scope 를 전달할지, scope 축을 폐기하고 role 단일 축으로 정리할지 결정. **이번 WO 범위 밖이므로 수정하지 않았다** |
| C | **`SERVICE_SCOPES` 에 `yaksa`·`dropshipping` 부재** — 해당 scope 는 발급 불가 | 중간 | B 와 함께 판단. 7번 §8-5(`requireYaksaScope` 이중 축) POLICY_REQUIRED 와 동일 사안 |
| D | **role 접두 ↔ service_key 축 불일치** (`cosmetics`↔`k-cosmetics`, `kpa`↔`kpa-society`) | 중간 | 별도 WO — 매핑 테이블 명문화. 문자열 파싱으로 serviceKey 를 도출하는 코드 금지 명시 |
| E | **`deleted` 계정 7명이 active 역할 보유** | 낮음 | 인증 단계에서 blocked 되어 위험은 없음. 정리 WO 시 함께 비활성화 |
| F | **`service_memberships.role` 표기 혼재** (접두/무접두) | 낮음 | 권한 판정에 쓰지 않는 한 무해. 사용 금지 명문화 권장 |
| G | **비상 관리자 부트스트랩이 migration/스크립트에만 존재** | 낮음 | 운영 절차 문서화 |

이번 WO 는 **census 이므로 위 항목을 하나도 실행하지 않았다.**

---

## 17. 개인정보 비노출 확인

- 이름·이메일·전화번호·사용자 UUID 전체를 **본 CHECK 에 기록하지 않았다.**
- 계정 구분이 필요한 §4 표에는 `left(md5(user_id::text),8)` 비가역 해시 8자만 사용했다.
- 토큰·쿠키·비밀번호·인증 헤더를 출력·저장하지 않았다. DB 비밀번호는 명령 치환으로만 전달하고 화면에 출력하지 않았다.
- 조회는 COUNT / boolean / status / 존재여부(`password IS NOT NULL`) 집계로 한정했다.
- SQL 결과 원본 파일을 저장하거나 커밋하지 않았다.

---

## 18. DB write · 역할 변경 · migration · 배포 0 확인

| 항목 | 결과 |
|---|:---:|
| INSERT / UPDATE / DELETE 실행 | **0** |
| DDL 실행 | 0 (차단 probe 1건은 서버가 거부) |
| 역할 부여·회수 | **0** |
| membership 변경 | **0** |
| 계정 활성화·비활성화·비밀번호 초기화 | **0** |
| 토큰 발급·폐기 | **0** |
| schema / migration 실행 | **0** |
| seed 실행 | **0** |
| 배포 | **0** |
| 프로덕션 변경 endpoint 호출 | **0** |
| `user.permissions` 공급 시작 | **0** |
| JWT claim 구조 · auth middleware · guard 변경 | **0** |
| 메뉴 · route · API 수정 | **0** |
| G(DEAD_OR_UNIMPLEMENTED) 19개 기능군 구현 | **0** |
| 9번 브라우저 smoke 선행 수행 | **0** |

---

## 19. 타 세션 작업물 보존

조사 중 작업 트리에 타 세션 WIP 3건이 존재했다 — HFF ZH 번역 배치(`hff-zh-*`), easy-drug 코퍼스 재구축, dropshipping-admin 은퇴(staged delete).

- 해당 파일을 **수정·삭제·restore·stash·commit·unstage 하지 않았다.**
- `git add .` · 디렉터리 전체 pathspec 을 사용하지 않았다.
- Cloud SQL Proxy 는 본 세션이 시작한 PID 만 관리했고, 프로세스명 일괄 종료를 사용하지 않았다. 동시에 떠 있던 타 세션 proxy 는 건드리지 않았다.

---

## 20. 커밋 · push · ahead/behind

- 커밋 대상: 본 CHECK 문서 1개 (`docs/checks/WO-O4O-ADMIN-OPERATION-ACCOUNT-ROLE-JWT-SCOPE-READONLY-CENSUS-V1-CHECK.md`)
- 정확한 파일 경로 pathspec 으로만 add·commit 하였다. 인덱스에 타 세션의 staged delete 가 있었으므로 `git commit -- <파일>` 형태로 **본 파일만** 커밋했다.

| 항목 | 값 |
|---|---|
| 커밋 | `94a407e8a` |
| 포함 파일 | `docs/checks/WO-O4O-ADMIN-OPERATION-ACCOUNT-ROLE-JWT-SCOPE-READONLY-CENSUS-V1-CHECK.md` 1개 |
| push | `ed066f840..94a407e8a  main -> main` 성공 |
| ahead / behind | 0 / 0 |

(push 된 커밋은 amend 하지 않고 본 보정을 후속 커밋으로 남긴다.)

---

## 부록 — 재현 방법

```bash
# 1) 세션 전용 포트로 proxy 기동 (타 세션 포트와 충돌 금지)
cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db --port 15481

# 2) read-only 고정 + 쓰기 차단 실증
PGOPTIONS='-c default_transaction_read_only=on' psql -h 127.0.0.1 -p 15481 -U o4o_api -d o4o_platform \
  -c "SHOW default_transaction_read_only;" \
  -c "CREATE TEMP TABLE _wo_probe(x int);"   # ERROR 가 나야 정상

# 3) 역할 모집단 (집계 전용, 개인정보 조회 금지)
SELECT ra.role, COUNT(*), COUNT(DISTINCT ra.user_id),
       COUNT(*) FILTER (WHERE ra.is_active)
FROM role_assignments ra GROUP BY ra.role ORDER BY 2 DESC;

# 4) 로그인 가능 판정 (status active/approved 만 normal)
--   근거: apps/api-server/src/common/auth/account-access.policy.ts resolveAccountAccess
```

**scope 전달 결함 재현 지점 (코드 정적 확인):**
- 생성: `apps/api-server/src/utils/token.utils.ts` `generateAccessToken`
- 축소: `apps/api-server/src/utils/scope-assignment.utils.ts` `deriveUserScopes` (serviceCode 없음 + 비admin → `[]`)
- 미전달: `apps/api-server/src/common/middleware/auth/authentication.middleware.ts:148-154` (roles·memberships 만 할당)
- 소비: `apps/api-server/src/routes/yaksa/yaksa.routes.ts:14-45`
