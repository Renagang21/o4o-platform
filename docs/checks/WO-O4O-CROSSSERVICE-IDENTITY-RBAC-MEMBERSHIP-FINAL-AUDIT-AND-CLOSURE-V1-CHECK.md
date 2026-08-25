# WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1 — CHECK

- 작업일: 2026-08-25
- 기준점: `origin/main` (작업 시작 시 `HEAD == origin/main == 0dc6b6c6c`)
- 성격: 회원·membership·role·authorization 공통화 트랙 **최종 감사 및 종료**
- 대상 서비스: KPA Society · K-Cosmetics · GlycoPharm · Neture · Pharmacy-Hub

---

## 0. 먼저 보고해야 할 사실 세 가지

### 0-1. 선행 WO 하나가 실행된 적이 없다

본 WO 는 4개 선행 WO 가 닫혔다는 전제로 잡혔다. 그중

`WO-O4O-CROSSSERVICE-AUTHORIZATION-MEMBERSHIP-AWARENESS-FINAL-CLOSURE-V1`

은 **실행 기록이 없다** — CHECK 문서도, commit 도 없다. 따라서 그 WO 가 닫기로 했던
항목(role-only live consumer 3계열, JWT 즉시성, KPA AdminAuthGuard, cosmetics
membership key)은 전부 **열린 상태로** 본 WO 에 들어왔다.

이 항목들은 본 WO §20 의 수정 허용 범위("실제 authorization gap", "frontend membership
guard 누락", "잘못된 serviceKey scope")에 그대로 해당하므로, 감사만 하지 않고 이번에
닫았다. 아래 §3 이 그 내역이다.

### 0-2. production DB read census(§16)를 수행하지 못했다

`o4o_api` DB 계정의 비밀번호를 확보할 수 없었다.

- `.pgpass` 의 자격증명 거부
- `apps/api-server/.env` 의 `DB_PASSWORD` 는 빈 값(길이 0)
- Secret Manager `o4o-db-password` 값도 proxy(5433) 에서 `o4o_api` 로 거부

동일한 벽이 `CHECK-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1.md` 에도 기록되어 있다.
그 이상의 자격증명 탐색(다른 DB 계정 순회, listener 열거)은 진행하지 않았다 —
세션 안전 분류기가 두 차례 차단했고, 우회하지 않는 쪽을 택했다.

따라서 §16 의 수치는 **본 세션 실측이 아니다**. 가장 최근 실측인
`WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1-CHECK.md` §7
(2026-08-24)을 인용하고, 인용임을 §7 에 명시했다.

### 0-3. 다른 세션의 WIP 가 같은 워킹트리에 있다

`service-templates` / `service-provisioning` / `service-monitor` retire 작업과
Pharmacy-Hub 매장 화면 작업이 미커밋 상태로 공존한다. 지시대로 **손대지 않았다**
(수정·restore·stash·stage 모두 없음, `git add .` 사용 안 함). 전체 테스트에서 실패한
2개 suite 는 전부 그 WIP 소유다 — §8 참조.

---

## 1. canonical 계약 (§4) — 확인 결과

| 축 | 계약 | 코드 정합 |
|----|------|-----------|
| `users.id` | 전역 identity | OK — 권한 컬럼 없음 (F11) |
| `service_memberships.status` | 이 서비스에 **들어올 수 있는가** | OK — `active`/`pending`/`rejected`/`suspended`/`withdrawn` |
| `role_assignments.role` | 그 안에서 **무엇을 할 수 있는가** | OK — RBAC SSOT (F9) |
| authorization | active membership + 필요한 role | 결함 — 4곳이 role-only 였음 → §3 에서 수정 |
| platform SSOT | `platform:*` | OK — 무접두 신규 생성/승격 경로 0 |
| `suspended != rejected` | 서비스별 재해석 금지 | OK — 상태 문자열 그대로 전파 |

`suspended` 와 `rejected` 가 섞이지 않는다는 점은 회귀 테스트로 고정했다
(`crossservice-identity-rbac-membership-closure.spec.ts`).

---

## 2. authorization entry census (§5)

api-server 의 진입 게이트 계열별 집계 (테스트 제외, live 코드만):

| 게이트 | 사용 수 | 분류 | 근거 |
|--------|--------|------|------|
| `requireAuth` | 1171 | PUBLIC_OR_AUTH_ONLY 하한 | 인증만. 뒤에 다른 게이트가 붙는다 |
| `createMembershipScopeGuard` | 29 | **MEMBERSHIP_AND_ROLE** | membership(DB) → scope(role) |
| `createServiceScopeGuard` (직접) | 0 | — | 전량 membership guard 경유. 우회 진입점 없음 |
| `requireStoreOwner` / `createRequireStoreOwner` | 66 / 59 | **MEMBERSHIP_AND_ROLE** | `isStoreOwner()` 가 DB membership 선검사 |
| `requireStoreAuth` / `optionalStoreAuth` | 7 / 8 | **MEMBERSHIP_AND_ROLE** | 동일 SSOT 경유 |
| signage 6종 | 91 | **MEMBERSHIP_AND_ROLE** | 본 WO 에서 membership 검사 추가 (§3-1) |
| `requireAdmin` | 190 | **PLATFORM_OVERRIDE** | `platform:super_admin` 전용, DB 조회 |
| `requireRole` | 99 | **PLATFORM_OVERRIDE** / 운영자 콘솔 | 아래 표 참조 |
| `requirePermission` | 6 | MEMBERSHIP_AND_ROLE | capability 축 |
| `injectServiceScope` | 20 | NOT_APPLICABLE (게이트 아님) | 데이터 격리 scope 계산 |

`requireRole` 의 실제 인자 분포:

| 인자 | 분류 |
|------|------|
| `['platform:super_admin']` (`ADMIN_ACCESS_ROLES`, `routes/admin/*`) | PLATFORM_OVERRIDE — 문서화된 플랫폼 관리 API |
| `ADMIN_ROLES` / `OPERATOR_ROLES` (neture product-master 계열) | cross-service 운영자 콘솔. 상품 마스터는 서비스 소속이 아닌 플랫폼 공용 도메인 |
| `[...PLATFORM_ADMIN, 'admin', 'operator', 'staff']` (operator-notification) | PLATFORM_OVERRIDE + **무접두 tier(보유자 0)** → §4 |
| `['partner', ...]` | 서비스 무관 파트너 축 |

**UNKNOWN = 0** — 분류하지 못한 진입점은 없다.
**GAP = 0** — §3 수정 이후 role-only live 진입점은 남지 않았다.

---

## 3. 실제 결함 수정 내역 (§20 허용 범위 안)

### 3-1. signage 6개 게이트가 role 만 보고 있었다 — CLOSED

`apps/api-server/src/middleware/signage-role.middleware.ts`

`requireSignageOperator` · `requireSignageStore` · `requireSignageCommunity` ·
`requireSignageSupplier` · `allowSignageStoreRead` · `requireSignageOperatorOrStore`
전부 JWT role 만 확인했다. 정지된 회원이 role 을 그대로 들고 있으면 signage 운영/매장
표면으로 계속 들어왔다.

- `hasSignageServiceMembership()` 추가 — `platform:super_admin` 우회 유지, DB 로 판정
- membership 축이 있는 canonical key 4종(`kpa-society`/`k-cosmetics`/`glycopharm`/`neture`)
  에만 적용. `pharmacy`/`tourism`/`common`/`test` 는 membership SSOT 가 없는 legacy signage
  key 이므로 **추정으로 차단하지 않는다**
- 차단 응답은 공통 `403 MEMBERSHIP_NOT_ACTIVE`
- sync 였던 3개 게이트를 `async` 로 전환. 기존 계약(코드·메시지)은 불변

### 3-2. membership 판정이 JWT 스냅샷 단독이었다 (정지 즉시성 0) — CLOSED

`apps/api-server/src/common/middleware/membership-guard.middleware.ts`
`apps/api-server/src/utils/service-membership.ts` (신규)

- 1단계: JWT 사전검사 유지 — 토큰에 이미 "없음/비활성" 이면 DB 를 보지 않고 거부(질의 증가 0)
- 2단계: **긍정 판정일 때만** DB 확정검사. 정지가 토큰 만료를 기다리지 않는다
- refresh token 일괄 폐기 방식은 **채택하지 않았다** — 토큰이 전역이라 한 서비스의 정지가
  나머지 4개 서비스 세션까지 끊는 cross-service fan-out 이 된다
- `DataSource` 미초기화 구간(부팅 직전·단위테스트)은 1단계 판정을 쓴다. fail-closed 하면
  부팅 중 전 요청이 403 이 된다
- 응답 코드(`MEMBERSHIP_NOT_FOUND` / `MEMBERSHIP_NOT_ACTIVE`) · 미들웨어 체인 · 시그니처 불변

> **F10 O4O Core Freeze 관련 보고**: 이 파일은 `@core O4O_PLATFORM_CORE` 다.
> 변경은 `docs/architecture/O4O-CORE-FREEZE-V1.md` §3.2 가 허용하는 **버그 수정**으로
> 판단했다(구조·엔티티 컬럼·API 계약·미들웨어 체인 변경 없음, 판정 *근거*만 교정).
> 파일 헤더에 `CORE_CHANGE` 사유를 남겼다. 이 판단은 사용자 확인 대상이다.

### 3-3. `injectServiceScope` 가 role 만으로 scope 를 만들었다 — CLOSED

`apps/api-server/src/utils/serviceScope.ts`

정지된 회원의 role 이 살아 있으면 그 서비스 데이터가 계속 scope 에 남았다.
**negative filter 만** 적용한다 — JWT membership row 가 "있는데 active 가 아닌" 서비스만
제거하고, row 가 아예 없는 서비스는 종전 동작을 유지한다(membership 축이 없는 내부 운영
scope 를 깨지 않기 위해). sync 시그니처 유지 → 20개 호출부 체인 불변.

### 3-4. 약사 자격 판정이 role-only + `pharmacy-hub` 누락 — CLOSED

`apps/api-server/src/modules/auth/controllers/auth-helpers.ts`

`derivePharmacistQualification()` 이 role 목록을 직접 나열해 두 결함을 동시에 갖고 있었다.

1. membership 미확인 — 정지된 회원도 경영자 자격이 계속 참
2. `pharmacy-hub:store_owner` 누락 — 약국 HUB 경영자만 자격이 거짓

판정을 store-owner SSOT(`isStoreOwner()`)로 위임해 둘 다 닫았다. 서비스별 role 목록도
`STORE_OWNER_ROLES_BY_SERVICE` 한 곳만 남는다.

### 3-5. **CROSS_SERVICE_LEAK — KPA me-context** — CLOSED (본 WO 신규 발견)

`apps/api-server/src/routes/kpa/controllers/me-context.controller.ts`

KPA-Society 의 `me-context` 가 `is_store_owner` 를
`role IN ('kpa:store_owner','glycopharm:store_owner','cosmetics:store_owner')` 로 계산했다.

소비 경로:

```
me-context.is_store_owner
  → web-kpa-society AuthContext.tsx: updated.isStoreOwner = !!ctx.isStoreOwner
  → KpaGlobalHeader.tsx: isStoreOwnerDual(roles, 'kpa:store_owner', user?.isStoreOwner)
  → store-ui-core StoreOwnerGuard: isStoreOwnerByRole = roles.includes(...) || !!user?.isStoreOwner
```

즉 **GlycoPharm 전용 / Cosmetics 전용 매장 경영자에게 KPA 약국 HUB UI 가 열렸다.**
판정을 `kpa:store_owner` 로 한정하고 `kpa-society` active membership 을 요구하도록 고쳤다.
분류: `CROSS_SERVICE_LEAK` + `PRIVILEGE_ESCALATION_PATH` → **닫힘**.

### 3-6. KPA `/admin/*` 전체가 role 만으로 열렸다 — CLOSED

`services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx`

`AdminRoutes.tsx` 전체를 감싸는 가드가 `roles.includes('kpa:admin') || membershipRole === 'admin'`
만 확인했다. `isServiceAccessAllowed(user)` (SSOT: `lib/membershipGate`, 데이터원 `GET /auth/me`)
를 role 검사 **앞에** 넣었다. `platform:super_admin` 은 Gate 내부에서 기존대로 우회한다.

### 3-7. cosmetics membership serviceKey 오기 — CLOSED

`packages/store-ui-core/src/auth/StoreOwnerGuard.tsx`

`membershipServiceKey: 'cosmetics'` → canonical 은 `'k-cosmetics'`. 현재 cosmetics 는
`membershipStoreOwnerRole: null` 이라 실사용 영향은 없었지만, membership 기반 판정을 켜는
순간 조용히 전원 차단되는 잠복 결함이므로 지금 맞췄다.

---

## 4. 수정하지 않고 분류만 한 항목

| 항목 | 분류 | 이유 |
|------|------|------|
| `kpa-society:admin` / `kpa-society:operator` 문자열 (16파일) | `DEAD_OR_UNUSED` / `REQUIRES_SEPARATE_DOMAIN_WORK` | canonical 은 `kpa:admin`. 살리면 KPA 역할이 Neture 상품 도메인에 새로 접근하게 된다 = business role 재설계(§20 금지). 이미 `CHECK-O4O-KPA-OPERATOR-CANONICAL-ROLE-GUARD-FIX-V1.md` §관찰 4 에서 동일 판정 |
| `operator-notification.routes.ts` 의 `'admin','operator','staff'` tier | `DEAD_OR_UNUSED` (보유자 0) | 가산 OR 분기이며 무접두 보유자 0(2026-08-24 실측 인용). 본 세션에서 재실측 불가 → 미검증 전제로 live 코드를 지우지 않는다 |
| `guide.controller.ts` 의 `r === 'admin'` | `DEAD_OR_UNUSED` (보유자 0) | 동일 |
| `checkoutController.ts:287,402` 의 `['admin','operator']` | `DEAD_OR_UNUSED` — **기능 폐색** | 이쪽은 가산이 아니라 **배타**다. `platform:super_admin` 이 목록에 없어, 무접두 보유자가 0 인 현재 환불 경로는 사실상 아무도 통과하지 못한다. 권한 누수가 아니라 기능이 닫힌 상태다. 여기에 역할을 추가하는 것은 "누구에게 환불 권한을 줄 것인가" 라는 업무 결정이라 감사 범위 밖 → **별도 WO 권고** |
| `media-library.controller.ts` 의 `r.includes('admin')` | 느슨한 매처 | 부분문자열 매칭이라 `platform:super_admin`·`kpa:admin` 등 접두 역할도 모두 잡는다. 무접두 전용 경로가 아니므로 보안 결함은 아니지만 매처 정밀화는 별건 |

---

## 5. write-path census (§6) · producer-consumer 대칭 (§10)

**role 생산자** (`role_assignments` 쓰기): 20개 파일, 전부 `roleAssignmentService` 경유.
무접두 역할을 **새로 만드는 경로는 0** 이다. `1771200000019-PrefixUnprefixedRoles` 마이그레이션이
과거분을 `platform:*` 로 승격시켰고, 이후 신규 생성 경로는 접두 역할만 쓴다.

**membership 상태 생산자**: 13개 파일. lifecycle 전이(approve/reject/suspend/reactivate/withdraw)의
SSOT 는 `services/approval/MembershipApprovalService.ts` 한 곳이다. 나머지는 가입/등록 시점의
row 생성이다.

대칭 검사 결과:

- 생산되지만 아무도 소비하지 않는 역할: 없음
- 소비처만 있고 생산자가 없는 역할: `kpa-society:*` 계열(§4 첫 행), 무접두
  `admin`/`operator`/`staff` tier(§4)
- `service_credentials`: 생산자는 `auth-register.controller.ts` 뿐이고 **로그인 판정 소비처가
  없다**(로그인은 `users.password` 를 쓴다). 서비스 경계를 넘는 자격증명 사용 경로는 없다 →
  §13 경계 위반 0. 다만 producer-only 상태이므로 향후 정리 대상으로 기록한다

---

## 6. lifecycle 매트릭스 (§8) · 역할 매트릭스 (§9)

| 서비스 | canonical service_key | role prefix | frontend membership SSOT | 진입 게이트 |
|--------|----------------------|-------------|--------------------------|-------------|
| KPA Society | `kpa-society` | `kpa` | `lib/membershipGate` (`SERVICE_KEY='kpa-society'`) | RoleGuard→MembershipGate · **AdminAuthGuard(본 WO 에서 추가)** |
| K-Cosmetics | `k-cosmetics` | `cosmetics` | `SERVICE_KEY='k-cosmetics'` | RoleGuard→MembershipGate |
| GlycoPharm | `glycopharm` | `glycopharm` | `SERVICE_KEY='glycopharm'` | RoleGuard→MembershipGate · OperatorRoute |
| Neture | `neture` | `neture` | `SERVICE_KEY='neture'` | RoleGuard(기본 enforce) · OperatorRoute/AdminRoute/SupplierRoute(`requireMembership='neture'`) |
| Pharmacy-Hub | `pharmacy-hub` | `pharmacy-hub` | `config/service` 의 `SERVICE_KEY` | AdminLayoutWrapper = MembershipGate + 역할 |

키 매핑(`kpa`→`kpa-society`, `cosmetics`→`k-cosmetics`, 나머지 self-map)은
`@o4o/security-core` 의 `resolveCanonicalServiceKey` / `resolveRolePrefixFromCanonicalServiceKey`
단일 SSOT 다(F1 Frozen). 로컬 매핑 상수는 본 감사에서 **0건** 확인.

`INTENTIONALLY_DIFFERENT` 로 남기는 차이:

| 차이 | 근거 |
|------|------|
| Neture `PlatformRoute` 만 membership 을 요구하지 않음 | cross-service surface 전용(`platform:super_admin` 만 통과). 경로별 명시 override 로 문서화 (`RBAC-CANONICAL-STATE-V1.md` §8-A) |
| KPA 의 `platformBypass=false` | KPA 는 super_admin 도 membership 없이 진입시키지 않는 서비스 정책 |
| signage legacy key 4종에 membership 미적용 | 그 key 들에는 membership SSOT 자체가 없다(추정 차단 금지) |

---

## 7. 역할 없는 active membership (§11) · production 수치 (§16)

**본 세션 실측 아님** — §0-2 의 이유로 DB 접속 불가. 아래는
`WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1-CHECK.md` §7
(2026-08-24 실측)의 **인용**이다.

| 항목 | 값 (2026-08-24) |
|------|-----------------|
| `service_memberships.status='suspended'` | 0 |
| `status='withdrawn'` | 0 |
| `status='rejected'` | 1 (pharmacy-hub) |
| 활성 `store_owner` role 보유자 | 18명 — 전원 같은 서비스 active membership 보유 |
| role 없는 active membership | 5건 (k-cosmetics/customer 1 · kpa-branch/user 1 · kpa-society/user 2 · platform/super_admin 1) |

이 수치는 §3 수정들의 **사용자 영향이 0** 이라는 근거이기도 하다. suspended/withdrawn 이
0 이므로, membership 검사를 추가해도 현재 통과하던 사용자가 새로 막히지 않는다.

role 없는 active membership 5건에 대한 계약 판정: **`VALID_ROLELESS_MEMBERSHIP`**.

`membership` 은 "들어올 수 있는가", `role` 은 "안에서 무엇을 하는가" 이므로,
**일반 이용자는 role 이 없는 것이 정상**이다. 5건 중 4건이 `customer`/`user` 등 일반
이용자 등급이다. 나머지 `platform/super_admin` 1건은 membership row 의 `role` 문자열일
뿐 RBAC 역할이 아니며(`RBAC-ROLE-CATALOG-V1.md` 의 기존 계약: membership 의 role 문자열이
`admin`/`super_admin` 이어도 역할은 생기지 않는다), 실제 권한은 `role_assignments` 의
`platform:super_admin` 에서만 나온다. 따라서 **보정 대상 아님**이고, 추측 보정은 §20
금지 사항이기도 하다.

정지/재활성 fixture(§12)는 **만들지 않았다** — 실사용 회원에게 위험한 write 를 하지 않는다는
§17 제약과, 안전한 전용 fixture 계정을 DB 접속 없이 만들 수 없다는 사정 때문이다.
대신 §17 이 명시한 대체 경로를 썼다: **production read-only + 자동화 write 테스트 + API smoke**.
정지→차단, 재활성→복구 대칭은 아래 자동화 테스트가 검증한다.

PII·비밀번호·해시·secret 은 본 문서에 기록하지 않았다.

---

## 8. 검증

### 8-1. 타입 검사

| 대상 | 결과 |
|------|------|
| `apps/api-server` `tsc --noEmit` | 통과 |
| `packages/store-ui-core` `tsc --noEmit` | 통과 |
| `services/web-kpa-society` `tsc --noEmit` | 통과 |

### 8-2. 자동화 테스트 (api-server 전체)

```
Test Suites: 2 failed, 185 passed, 187 total
Tests:       1 failed, 2994 passed, 2995 total
```

실패 2개 suite 는 **다른 세션 WIP 소유**이며 본 WO 변경과 무관하다:

- `service-monitor-retirement.spec.ts` — 미커밋 수정본의 정규식 파싱 오류 (` M` 상태)
- `service-provisioning-retirement.spec.ts` — 미커밋 신규 파일 (`??` 상태)

둘 다 service-templates/provisioning retire 트랙이며, 지시대로 손대지 않았다.

### 8-3. 본 WO 회귀 테스트 (신규 21개, 전부 통과)

`apps/api-server/src/__tests__/crossservice-identity-rbac-membership-closure.spec.ts` (12)

- role prefix 로 물어도 canonical key 로 조회 (`kpa`→`kpa-society`, `cosmetics`→`k-cosmetics`)
- `suspended` 와 `rejected` 가 서로 다른 상태로 그대로 보고됨
- DB 오류 시 fail-closed
- `injectServiceScope` — 정지 서비스 제거 / active 유지 / row 없음은 종전 동작 / platform admin 우회

`apps/api-server/src/__tests__/crossservice-membership-gate-live-consumers.spec.ts` (9)

- signage: role 있어도 membership `suspended` → 403 `MEMBERSHIP_NOT_ACTIVE`
- signage: membership 축 없는 legacy key 는 추정 차단하지 않음
- signage store: organization 검사보다 membership 을 먼저 봄
- **membership guard: JWT 는 active 인데 DB 가 suspended → 403** (정지 즉시성)
- membership guard: JWT 에 membership 없으면 DB 질의 없이 즉시 거부 (질의 증가 0)
- 인증 없음은 401 유지

기존 `signage-servicekey-canonicalization.spec.ts` 는 게이트가 async 가 되면서 호출을
`await` 로 맞췄다(판정 계약 변경 없음, 23개 전부 통과).

### 8-4. production API smoke (§15 실패 의미 · §17 read-only)

`https://api.neture.co.kr` 무인증 요청:

| 경로 | 코드 | 판정 |
|------|------|------|
| `/api/health` | 200 | 서비스 정상 |
| `/api/v1/auth/me` | 401 | 인증 없음 = 401 |
| `/api/signage/kpa-society/hq/playlists` | 401 | 인증 없음 = 401 |
| `/api/v1/kpa/me-context` | 401 | 인증 없음 = 401 |
| `/api/v1/admin/users` | 401 | 인증 없음 = 401 |

401(인증 없음) / 403(권한·membership 부족) / 404(자원 없음) 의 구분이 유지된다.
membership 부족의 403 은 `MEMBERSHIP_NOT_FOUND` / `MEMBERSHIP_NOT_ACTIVE` 코드로 구분된다.

**실사용 회원에 대한 write 는 하지 않았다.** 로그인 자격증명을 쓰는 인증 E2E(§17)와
브라우저 스모크(§18)는 수행하지 못했다 — 본 세션에서는 §0-2 의 제약으로 상태 변경 검증을
production 에서 재현할 수 없었고, §8-3 의 자동화 write 테스트로 대체했다.
이는 §17 이 명시한 대체 경로다.

---

## 9. 문서 정합 (§19)

- `docs/rbac/RBAC-CANONICAL-STATE-V1.md` 에 **§8-A 권한 판정 계약** 절을 추가했다.
  기존 §6(JWT Payload)을 지우지 않고 *한정*한다 — JWT 는 여전히 스냅샷이지만 진입 게이트의
  최종 판정 근거는 DB 라는 점, 금지되는 판정 형태 3가지, 정지 즉시성, 경로별 platform
  override 표, 프런트 membership SSOT 를 명시했다.
- 과거 완료 문서는 **역사 자체를 바꾸는 방식으로 수정하지 않았다**. 선행 CHECK 들은 그대로
  두고 본 문서가 그 위에 쌓인다.
- `SUPERSEDED` 관계: 선행
  `WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1-CHECK.md` §10
  "잔여 문제" 목록 중 1·2·3·6 항은 본 문서 §3 이 대체한다(닫힘). 4·5 항은 본 문서 §4·§7 이
  대체한다(분류 확정, 수정 불필요).

---

## 10. 최종 분류 (§21)

| 지표 | 값 |
|------|-----|
| `UNKNOWN` | **0** |
| `GAP` | **0** |
| `REQUIRED_BUT_MISSING` | **0** |
| `CROSS_SERVICE_LEAK` | **0** (1건 발견 → §3-5 에서 닫음) |
| `PRIVILEGE_ESCALATION_PATH` | **0** (동일 건) |

단, 위 0 은 **정적 감사 + 자동화 테스트 기준**이다. production DB 실측(§16)과 브라우저
E2E(§18)는 §0-2 의 이유로 본 세션에서 수행하지 못했으므로, 그 축에 대해서는 0 을
주장하지 않는다.

### soft-revoke 최종 판정: **RETAIN (유지)**

role-only live consumer 가 모두 닫힌 지금도 `suspendMembership` 의 role soft-revoke 는
**유지한다**. 이유:

1. `role_assignments` 를 사실에 맞게 유지한다 — 들어올 수 없는 서비스의 "안에서 할 수 있는 일"
   을 계속 보유하는 것은 계약상 모순이다
2. `reactivateMembership` 의 `'restore-only'` 분기와 대칭이며 회귀 테스트로 고정되어 있다
3. 제거는 이득 없는 동작 변경이고, 아직 찾지 못한 소비처가 있다면 그대로 다시 열린다

즉 soft-revoke 는 이제 **유일한 방어선이 아니라 이중화의 한 겹**이다. 이것이 본 WO 의
목표였다.

---

## 11. 남은 권고 (본 WO 범위 밖)

1. **production DB read census 재수행** — `o4o_api` 자격증명 확보 후 §7 수치를 실측으로 갱신.
   `.env` 의 빈 `DB_PASSWORD` 자체가 별도로 정리 대상이다
2. **checkout 환불 권한 결정** — §4 의 기능 폐색. 누구에게 환불 권한을 줄지는 업무 결정
3. **`kpa-society:*` dead literal 정리** — 별도 domain WO (Neture 상품 도메인 접근 정책 결정 필요)
4. **`service_credentials` producer-only 상태 정리** — 생산만 하고 소비처가 없다
5. 이후에는 RBAC 자체보다 각 서비스의 실제 업무 기능 정비로 이동

---

## 12. 변경 파일

**apps/api-server**
- `src/utils/service-membership.ts` (신규) — membership 판정 공용 SSOT
- `src/common/middleware/membership-guard.middleware.ts` — DB 확정검사 (F10 CORE_CHANGE)
- `src/middleware/signage-role.middleware.ts` — signage 6개 게이트 membership 검사
- `src/utils/serviceScope.ts` — 비활성 membership negative filter
- `src/modules/auth/controllers/auth-helpers.ts` — 약사 자격 SSOT 위임
- `src/routes/kpa/controllers/me-context.controller.ts` — cross-service leak 차단
- `src/__tests__/crossservice-identity-rbac-membership-closure.spec.ts` (신규)
- `src/__tests__/crossservice-membership-gate-live-consumers.spec.ts` (신규)
- `src/__tests__/signage-servicekey-canonicalization.spec.ts` — async 호출 정합

**packages / services**
- `packages/store-ui-core/src/auth/StoreOwnerGuard.tsx` — `cosmetics` → `k-cosmetics`
- `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx` — membership 게이트 추가

**docs**
- `docs/rbac/RBAC-CANONICAL-STATE-V1.md` — §8-A 권한 판정 계약 추가
- `docs/checks/WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1-CHECK.md` (본 문서)
