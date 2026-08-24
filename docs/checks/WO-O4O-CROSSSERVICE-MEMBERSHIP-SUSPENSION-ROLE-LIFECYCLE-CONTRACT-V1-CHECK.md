# WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 — CHECK

- 일자: 2026-08-24
- 범위: KPA Society / K-Cosmetics / GlycoPharm / Neture / Pharmacy-Hub 5개 서비스
- 성격: 전수조사 + canonical contract 확정 + 코드 수정 + 회귀 테스트 + 프로덕션 read-only 검증 + RBAC 문서 정합

---

## 1. 결론 (canonical contract)

**membership = 서비스에 들어갈 수 있느냐 / role = 그 서비스 안에서 무엇을 할 수 있느냐.**

| 상태 | 계약 |
|------|------|
| SUSPENDED | `service_memberships.status = 'suspended'` (해당 serviceKey 만). role row 는 **보존**. 접근은 membership gate 가 차단 |
| REACTIVATED | membership 을 `active` 로 되돌리고 **기존 role 을 복원**. 정지 이전에 없던 role 을 새로 만들지 않는다 (restore-only) |

WO §7 이 단 조건 — "membership 을 보지 않고 role 만 보는 live consumer 가 있으면 즉시 적용하지 않는다" — 이
실제로 걸렸다. 그래서 순수 membership-only 가 아니라 **hybrid** 로 확정했다.

- 접근 판정의 SSOT 는 membership 이고, 그 검사를 **`isStoreOwner()` 한 곳으로 내렸다** (§4).
- 다만 아직 role 만 보는 live consumer(signage 권한 계열 · serviceScope 주입 · auth-helpers 매장 플래그)가
  남아 있으므로, suspend 의 role soft-revoke 는 **defense-in-depth 로 유지**한다. 단, 서비스마다 달랐던 것을
  **5개 서비스 대칭으로 통일**했다.
- 이 판정에 따라 WO §18 중지 조건은 발동하지 않았다.

---

## 2. 조사 질문 A–D 답

**A. suspended membership 이 authorization 자체를 차단하는가?**
부분적으로만. 5개 서비스의 주 scope guard 는 `createMembershipScopeGuard` 를 거쳐 membership 을 본다(BOTH_GATED).
그러나 판정 근거가 **JWT 스냅샷**이다 — `user.roles` 와 `user.memberships` 가 같은 토큰에 실려 있고
`freshenUserContext` 는 로그인/refresh 때만 갱신한다. 따라서 **role 을 회수해도 즉시성은 0** 이다
(role 도 같은 토큰을 타므로). 즉시성이 필요한 지점은 DB 를 봐야 한다 —
이번에 추가한 `isStoreOwner()` 의 membership 검사는 DB 기반이다.

**B. suspend 가 role assignment 를 건드리는가?**
건드렸다. `resolveGrantedRole(service_key, membership.role)` 을 soft revoke 하고, **추가로 kpa 에만**
`kpa:store_owner` 를 내렸다. → glycopharm / cosmetics / pharmacy-hub 의 `store_owner` 는 정지해도 살아남았다
(**INCONSISTENT**). 이번에 5개 서비스 대칭으로 통일했다.

**C. reactivate 의 role 복원 방식은?**
`activateRoleAssignment()` 가 **행이 없으면 INSERT** 했다. 즉 "정지 이전에 없던 권한"이 복구로 생길 수 있었다.
직전 WO 에서 bare admin tier 에 대해서만 막았던 것을 이번에 **전 role 로 일반화**했다(`mode: 'restore-only'`).

**D. (가장 중요) membership 을 보지 않고 role 만 보는 consumer 전수조사**
§3 (backend) · §3-F (frontend) 참조. live ROLE_GATED 가 실재했고, 그중 매장 데이터 노출 경로를 이번에 닫았다.

---

## 3. Authorization consumer census — backend

| # | consumer | 이전 | 현재 | 비고 |
|---|----------|------|------|------|
| 1 | 5개 서비스 주 scope guard (`createMembershipScopeGuard`) | BOTH_GATED | BOTH_GATED | JWT 스냅샷 기반 |
| 2 | `createRequireStoreOwner` 미들웨어 | BOTH_GATED | BOTH_GATED | membership 검사가 미들웨어에만 있었음 |
| 3 | `service-forum.routes` | BOTH_GATED | BOTH_GATED | — |
| 4 | `requireStoreAuth` / `optionalStoreAuth` — store-hub 공개 GET 4개 (kpa · glycopharm · cosmetics) | **ROLE_GATED** | BOTH_GATED | `isStoreOwner` 수정으로 해소 |
| 5 | `resolveStoreAccess` 호출자 전부 — store-playlist(×11: cosmetics·kpa·glycopharm mount) · store-handled-products(×4) · store-local-product · event-offer.service · neture seller.controller | **ROLE_GATED** | BOTH_GATED | 라우터 레벨 membership guard 가 없는 mount(`cosmetics.routes.ts` 등)라 role 만으로 통과했음. 동일 수정으로 해소 |
| 6 | `signage-role.middleware.ts` 권한 계열 | ROLE_GATED | ROLE_GATED (유지) | 이번 범위 밖. suspend 의 role revoke 를 유지하는 근거 |
| 7 | `extractServiceScope` / `injectServiceScope` | ROLE_GATED | ROLE_GATED (유지) | 동일 |
| 8 | `auth-helpers.ts` 매장 플래그 | ROLE_GATED | ROLE_GATED (유지) | 동일 |

**UNKNOWN = 0.**

### 3-F. Authorization consumer census — frontend

데이터 출처는 JWT 가 아니라 **`GET /auth/me`** 다 (`useServiceAuth` → `normalizeMemberships`).

| 계층 | 판정 |
|------|------|
| 공통 SSOT `packages/auth-utils/src/membershipGate.ts` (`isServiceAccessAllowed`) | MEMBERSHIP_GATED (+ `platform:super_admin` bypass) |
| 5개 서비스 `MembershipGate` (kpa · neture · cosmetics · glycopharm · pharmacy-hub) | MEMBERSHIP_GATED — 판정 로직 동일 |
| 서비스별 `RoleGuard` / `OperatorRoute` / `GlycoHubGuard` / `PharmacyGuard` / `HubGuard` / `PharmacyOwnerOnlyGuard` / `StoreOwnerShell` / `OperatorLayoutWrapper` | BOTH_GATED |
| `packages/auth-react/src/createRouteGuard.tsx` | 자체로는 ROLE_GATED — `MembershipGate` 주입 + `enforceMembership` 일 때만 BOTH_GATED |
| `packages/store-ui-core/src/auth/StoreOwnerGuard.tsx` | role 로 판정. membership 은 **통과를 추가로 허용하는 분기일 뿐 차단 근거가 아니다**(glycopharm 만 사용). 차단은 주입된 `membershipGate` 가 담당 |
| neture `PlatformRoute` | ROLE_GATED (의도 — cross-service 표면) |
| kpa `AdminAuthGuard` (`/admin/*` 전체) | **ROLE_GATED** — 잔여(§10) |
| kpa `AuthGate` | MEMBERSHIP_GATED 이나 **다른 축** (`kpaMembership.serviceAccess`, `service_memberships` 아님) |
| k-cosmetics `StoreOwnerRoute` (App.tsx) | **ROLE_GATED 였음 → 이번에 `membershipGate` 주입으로 BOTH_GATED** |

**suspended 취급**: 프론트에 `'suspended'` 를 키로 하는 **차단 분기는 없다**. 모든 gate 는
`status === 'active'` 단일 양성 판정이며, `suspended` / `withdrawn` / `rejected` / `none` 은
접근 판정상 구분되지 않고 안내 문구만 달라진다. 정지 계약과 모순되지 않는다(모두 차단).

---

## 4. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/utils/store-owner.utils.ts` | `isStoreOwner()` 안으로 **DB membership 선검사**를 내렸다. 매장 판정의 접근 게이트가 한 곳이 된다. serviceKey 가 있으면 `resolveCanonicalServiceKey` 로 정규화해 해당 서비스의 active membership 을, 없으면 active membership 최소 1개를 요구(fail-closed). membership 이 없으면 role 조회까지 가지 않는다 |
| `apps/api-server/src/services/approval/MembershipApprovalService.ts` | ① `activateRoleAssignment(… mode: 'grant' \| 'restore-only')` — restore-only 는 행이 없으면 `skipped_no_row` 로 **INSERT 하지 않는다**. ② reactivate STEP3 를 restore-only 로 전환. ③ suspend STEP2.5 / reactivate STEP3.5 의 `store_owner` 처리를 kpa 전용 → **5개 서비스 대칭**으로 일반화 (kpa 는 `kpa_pharmacist_profiles.activity_type = 'pharmacy_owner'` 게이트 유지) |
| `services/web-k-cosmetics/src/App.tsx` | `StoreOwnerRoute` 에 `membershipGate={MembershipGate}` 주입 — 5개 서비스 중 유일하게 gate 없이 role 로 통과하던 매장 마운트 |

수정하지 않은 것: schema · migration · API contract · `users.status` 연동 · 타 서비스 membership/role · platform role.

---

## 5. 제거한 role mutation / 유지한 role mutation

**제거**
- reactivate 의 role **신규 생성**(privilege synthesis) — 전 role 로 일반화.

**유지 (근거 있음)**
- suspend 의 service role soft revoke — §3 의 6·7·8 이 아직 role 만 보기 때문. 단 5개 서비스 대칭.
- reactivate 의 기존 role 복원(`UPDATE is_active = true`) — 행이 있을 때만.

**혼합하지 않은 것**: 운영자 명시 grant/revoke · 탈퇴 · platform security action 은 suspend 경로와 분리 유지.
`rejected` 와 `suspended` 도 경로를 섞지 않았다.

---

## 6. 테스트

| 파일 | 내용 | 결과 |
|------|------|------|
| `apps/api-server/src/services/approval/__tests__/MembershipApprovalService.suspensionLifecycleContract.test.ts` (신규) | §10 fan-out · §11 admin tier · §12 5서비스 왕복 매트릭스 | 24 PASS |
| `apps/api-server/src/__tests__/store-owner-membership-gate.spec.ts` (신규) | §7 게이트 회귀 — `isStoreOwner` / `resolveStoreAccess` / `requireStoreAuth` / `optionalStoreAuth` | 8 PASS |
| `MembershipApprovalService.bareRoleContract.test.ts` (수정) | suspended fixture 가 실제 정지 결과(비활성 행)를 재현하도록 `seed()` 확장 + restore-only 케이스 추가 | PASS |
| `store-owner-backcompat-servicekey.spec.ts` · `store-local-products-service-scoped-org.spec.ts` · `store-owner-service-scoped-org.spec.ts` (수정) | fake DataSource 에 membership 질의 추가 (fixture drift — 결함 아님) | PASS |

- api-server 관련 12 suite / 218 test **전부 PASS**.
- `npx tsc --noEmit` : api-server PASS · web-k-cosmetics PASS.

**§11 admin tier 회귀**: bare admin tier 신규 0 · `platform:admin` 신규 0 · `platform:super_admin` 신규 0.
**§10 fan-out**: 대상 서비스 외 4개 membership·role 불변, `users.status` 불변(그리고 suspend 경로에 `UPDATE users`
질의 자체가 존재하지 않음을 테스트로 고정), `supplier` / `customer` / `platform:super_admin` 불변.

---

## 7. 프로덕션 검증 (read-only)

Cloud SQL Auth Proxy 경유 SELECT 만 수행. **write 0건.**

| 항목 | 결과 |
|------|------|
| A. membership status 분포 | `active` 외에는 pharmacy-hub `rejected` 1건뿐. **`suspended` 0 · `withdrawn` 0** |
| B. membership.role × service_key | glycopharm(member/operator/pharmacy/store_owner) · k-cosmetics(`cosmetics:store_owner`1 / customer1 / member1 / store_owner2) · kpa-branch(user2) · kpa-society(admin1 / member1 / store_owner1 / user3) · neture(member4 / `neture:operator`1 / supplier2) · pharmacy-hub(`pharmacy-hub:admin`1 / member2 / operator2 / store_owner5 + rejected1) · platform(customer5 / super_admin2) |
| C. role prefix × is_active | bare f5/t17 · cosmetics f2/t7 · glycopharm t7 · kpa f2/t9 · kpa-branch t2 · lms t1 · neture f1/t6 · pharmacy-hub f2/t12 · platform f3/t2 |
| D. active membership 인데 대응 active role 없음 | k-cosmetics/customer 1 · kpa-branch/user 1 · kpa-society/user 2 · platform/super_admin 1 |
| E. store_owner 계열 활성 | cosmetics 4 · glycopharm 3 · kpa 5 · pharmacy-hub 6 (bare `store_owner` 활성 0) |
| H. **활성 store_owner 18명 전원** | 같은 서비스의 **active membership 보유** (kpa 5/5 · cosmetics 4/4 · glycopharm 3/3 · pharmacy-hub 6/6) |

**H 가 결정적이다** — 이번 `isStoreOwner` membership 게이트는 현재 사용자 누구의 동작도 바꾸지 않는다.

**write E2E 는 수행하지 않았다.** WO §13 은 "안전한 전용 fixture 가 있을 때만" write 를 허용하는데,
프로덕션에 `suspended` / `withdrawn` membership 이 0건이라 전용 fixture 가 존재하지 않는다.
실사용 회원의 status 를 임의로 바꾸지 않는다는 §16 금지에 따라, lifecycle 왕복은 단위 테스트 매트릭스로만 검증했다.

---

## 8. 권한 경계 확인 (§8)

| 항목 | 결과 |
|------|------|
| `users.status` 변경 | 0 (경로 자체가 없음 — 테스트로 고정) |
| 타 서비스 membership 변경 | 0 |
| 타 서비스 role 변경 | 0 |
| platform role 변경 | 0 |
| bare role 신규 부여 | 0 |
| `rejected` 와 `suspended` 혼합 | 없음 |
| schema / migration / API contract 변경 | 없음 |

---

## 9. RBAC 문서 정합 (§14)

`docs/rbac/RBAC-ROLE-CATALOG-V1.md` §1 수정:

- Platform Roles 표에서 접두어 없는 `super_admin` · `admin` 을 **전역 역할 목록에서 내렸다**. 남은 것은 `user` · `customer`.
- "접두어 없는 admin tier 는 **신규 부여 금지**" 절 신설 — 정본은 `platform:` 접두어. 거부 지점 3곳
  (`isBareAdminTierRole()` · `operator-registration.service.ts` `ROLE_PROMOTION_NOT_ALLOWED` · 추측 접두어 변환 금지),
  아직 bare 값을 인정하는 legacy 소비처 표(`auth-login.service.ts` · `lms.routes.ts` · `role-revoke-safety.ts`),
  2026-08-24 실측(활성 bare admin tier 0), `platform:admin`·`platform:operator` 코드 제거 사실.
- Commerce 표 → "Commerce · Service Roles (접두어 없음)". 코드에서 확인된 현행 계약만 반영:
  - `supplier` — Neture 실사용, 접두어 없음이 의도된 계약 (WO-NETURE-ROLE-NORMALIZATION-V1), 활성 6.
  - `pharmacy` — GlycoPharm 정규값. `20260318110000-RenamePharmacistToPharmacyRole` 로 개명,
    `20260326100000-NormalizeGlycopharmPharmacyRole` 로 확정. 소비처 `ForumRecommendationController` 가 bare 문자열을 직접 읽음. 활성 2.
  - `vendor` · `seller` · `partner` · `manager` 는 **보유자 0** 임을 실측으로 명시(목록 유지, 신규 부여 대상 아님).
    `manager` 를 조회하는 코드 대부분은 `organization_members.role` — RBAC role 축이 아니라는 주석 추가.
  - bare `store_owner` 가 목록에 없는 이유와 잔여 1행 회수(`20270318000000-RevokeOrphanedBareStoreOwnerRole`) 명시.
- `customer` · `user` 는 코드·실측 모두와 일치하여 수정하지 않았다.

---

## 10. 잔여 문제 (이번 범위 밖 — 별도 판단)

1. **role 만 보는 live backend consumer 3계열** — `signage-role.middleware.ts` · `extractServiceScope`/`injectServiceScope` ·
   `auth-helpers.ts` 매장 플래그. 이들이 membership-aware 해지기 전에는 suspend 의 role soft-revoke 를 제거할 수 없다.
   제거하면 순수 membership 계약이 된다.
2. **membership/role 판정이 JWT 스냅샷** — scope guard 계열은 정지 즉시 차단되지 않고 토큰 만료를 기다린다.
   즉시성이 필요하면 DB 조회로 내리거나 정지 시 토큰 무효화가 필요하다.
3. **kpa `AdminAuthGuard` 가 `/admin/*` 전체를 role 만으로 통과시킨다** (frontend). 백엔드 guard 는 별개로 존재하므로
   데이터 노출은 아니지만, 정지 회원에게 admin UI 가 열린다.
4. **bare admin tier 소비처 3곳이 아직 bare 값을 인정한다** (보유자 0이라 실피해 없음). 소비처 제거는 별도 판단.
5. **role 없는 active membership 5건** (§7 D) — 로그인은 되지만 서비스 역할이 없는 상태. 의도인지 미부여인지 판정 필요.
6. `StoreOwnerGuard` 의 `cfg.membershipServiceKey` 가 cosmetics 에서 `'cosmetics'` — canonical 은 `'k-cosmetics'`.
   현재 cosmetics 는 membership 통과 분기를 쓰지 않아 무해하나, 활성화 시 정합이 필요하다.
