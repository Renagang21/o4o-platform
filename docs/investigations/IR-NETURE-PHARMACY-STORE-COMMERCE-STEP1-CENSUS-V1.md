# IR-NETURE-PHARMACY-STORE-COMMERCE-STEP1-CENSUS-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO/IR**: [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](../work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) 단계 1 (1-1 ~ 1-6)

단계 1 현재 코드 조사 결과(읽기 전용, 기준 `7f09a7a71`). 4개 영역 조사를 그대로 모았다. 경로의 `api/` · `API/` 는 `apps/api-server/src/`, `WS/` 는 `services/web-store/src/`, `BL` 은 `apps/api-server/src/database/bootstrap/canonical-schema-baseline.ts` 다. 결함 판정 중 일부는 코드 추론이며 실행 검증 전이다(각 절에 표기). 설계 확정은 WO 단계 1-7 문서에서 한다.


---

## A. 가입 · 자격 · 조직 · 내 매장 · 세미프랜차이즈 · 운영자 권한

- 대상 WO: `WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1` 단계 1-1 · 1-2 · 1-3 (+2-5 공급자 승인), 단계 2 설계 입력
- 기준: worktree `D:/o4o-wt/neture-pharmacy-store-commerce-refactor-v1` HEAD `7f09a7a71` (READ-ONLY, DB/네트워크 0)
- 경로 표기: `api/` = `apps/api-server/src/`

---

### 0. 결론 요약

1. **"Neture 기본 약국 가입" 은 현재 코드에 존재하지 않는다.** 약국의 실제 진입은 전부 `kpa-society`(= `pharmacy.neture.co.kr`) 서비스 회원 승인 경로이거나, 승인 없는 `store.neture.co.kr` 자가 가입(`POST /api/v1/store/enrollment`)이다. `neture` 서비스 membership 은 공급자 축이며 매장 축이 없다(`STORE_IDENTITY_NOT_SUPPORTED`).
2. **약국 "자격 확인" 은 실질적으로 없다.** 자격 근거는 `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` + `users.businessInfo.businessNumber` 존재 여부뿐이며, `license_verified` 를 true 로 쓰는 런타임 writer 가 0 이다.
3. **매장 = organizations row 그 자체**(별도 store 테이블 없음). "약국 1 : 매장 1" 은 DB 로 강제되지 않는다 — 프로비저너마다 org code 규칙이 달라 같은 약국이 서비스별로 다른 org 를 가질 수 있고, `organizations.business_number` 는 UNIQUE 가 아니다.
4. **세미프랜차이즈 = 현재는 "O4O 서비스(serviceKey)" 그 자체**(kpa-society · k-cosmetics). 별도 개체·가입·운영자 배정 개념은 없다. 다만 같은 구조의 선례(**서비스 키 1개 + 개체 테이블 + 개체 단위 소속/운영자**)가 `kpa-branch`(분회)와 `community`(커뮤니티)에 이미 있다.
5. **운영자 권한은 서비스 단위 role(`{prefix}:operator`) + active service_membership** 뿐이고 개체(세미프랜차이즈) 단위 범위 개념은 없다. `role_assignments.scope_type/scope_id` 는 런타임 판정 소비 0 이며, 부분 유니크 인덱스 `(user_id, role) WHERE is_active` 때문에 같은 role 을 여러 scope 로 동시 보유할 수 없다.
6. **공급자 가입은 이미 승인형**(`neture_suppliers.status PENDING→ACTIVE`, `supplier:operator` scope). 현행 유지 가능.
7. **(발견) 승인 우회 경로**: `POST /api/v1/store/enrollment {serviceKey:'kpa'}` 는 로그인만으로 조직 + `kpa:store_owner` + (기존 행이 없으면) `service_memberships('kpa-society', status='active')` 를 만든다 — 운영자 승인·자격 확인 없음.

---

### 1. 약국이 현재 "가입"하는 방법

#### 1-1. 서비스 카탈로그 (`api/config/service-catalog.ts`)

| key | domain | joinEnabled | workspace | 비고 |
|---|---|---|---|---|
| `neture` | neture.co.kr | true | special · storeWorkspaceEnabled=false · operator=true (L112-121) | 공급자 축 · 대표 진입. 매장 identity 축 없음 |
| `kpa-society` | **pharmacy.neture.co.kr** (legacy `kpa-society.co.kr`) | true | standard · store=true · operator=true (L122-137) | 사업 의미 = 약국 사업자 세미프랜차이즈 서비스. role prefix `kpa:*` |
| `k-cosmetics` | retail.neture.co.kr | true | standard (L138-149) | role prefix `cosmetics:*` |
| `pharmacy-hub` | pharmacyhub.co.kr | **false** (L168-175) | standard | 호환 식별자 보존. 자체 join/승인 콘솔은 살아 있음 |
| store.neture.co.kr | — | — | `api/config/store-workspace.ts` L1-10 | **서비스가 아님**(serviceKey 없음) |

정본 `docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md` §2 L32: `pharmacy.neture.co.kr` = serviceKey `kpa-society` = role prefix `kpa:*`.

#### 1-2. 경로 A — kpa-society 회원 승인 (주 경로, "Path B")

```text
Google/이메일 가입 (계정만 생성, membership·role 0 — Identity V3 §3)
 → POST /api/v1/auth/services/kpa-society/join          service_memberships(status='pending')
      api/modules/auth/controllers/handoff.controller.ts L656-748 (joinService)
 → (선택) POST /api/v1/kpa/members/apply                 kpa_members 신청
      api/routes/kpa/controllers/member.controller.ts L238-
 → PATCH /api/v1/auth/me/profile {activityType:'pharmacy_owner', businessInfo}
      api/modules/auth/controllers/auth-account.controller.ts L147-290
      → kpa_pharmacist_profiles(activity_type) UPSERT (SSOT) + kpa_members.activity_type mirror
      → users."businessInfo" (사업자번호·약국명·주소)
      프런트: services/web-kpa-society/src/pages/ActivitySetupPage.tsx (setActivityType)
 → 운영자 승인 PATCH /api/v1/kpa/members/:id/status {status:'active'}
      requireScope('kpa:operator')  member.controller.ts L641-647
      pending→active ∧ activity_type='pharmacy_owner' 이면 (L871-909)
      → ensureKpaStoreOrganization()
         api/routes/kpa/services/kpa-store-organization.provisioning.ts L82-140
           1) organizations(type='pharmacy', code=`kpa-pharm-{사업자번호}`)
           2) kpa_members.organization_id 보정
           3) organization_members(role='owner')
           4) role_assignments('kpa:store_owner')
           5) organization_service_enrollments(service_code='kpa-society', active)
           6) platform_store_slugs(service_key='kpa')
      사업자번호/약국명 누락 시 store_owner 부여 skip + warning (회원 승인은 성공)
```

- 공통 승인 엔진 `api/services/approval/MembershipApprovalService.ts`(F10 Approval Engine)도 kpa-society 를 특수 분기한다: approve 시 kpa_members upsert(L486-), suspend 시 `kpa:store_owner` 비활성(L817-841), reactivate 시 `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` 일 때만 복원(L1034-1048), withdraw 시 kpa 정리(L1251-).
- 별도 약국 신청 테이블 `kpa_pharmacy_requests` 는 **route 은퇴**(`api/routes/kpa/kpa.routes.ts` L72-74), 엔티티·테이블만 이력 보존. `pharmacy-info.controller.ts` L142-148 가 fallback 읽기로만 사용.
- `services/web-kpa-society/src/pages/join/PharmacyJoinPage.tsx` 는 안내+문의폼(JoinInquiryForm)일 뿐 가입 write 가 아니다("약사회 회원 약국이라면 누구나" 문구 L22-24 — 현 사업 의미와 불일치).

#### 1-3. 경로 B — store.neture.co.kr 자가 가입 (승인 없음)

- `POST /api/v1/store/enrollment` — `api/routes/store/store-membership.routes.ts` L70-94, guard = `requireAuth` 만.
- `api/services/store/store-enrollment.service.ts`
  - `ENROLLABLE_SERVICE_KEYS = ['kpa','cosmetics','pharmacy-hub']` (L45)
  - org code = `store-{serviceKey}-{userId 앞 12hex}` (L94-96), type='store'
  - `ensureOrganizationWithOwnerAndService()` → owner + enrollment (L140-150)
  - `ensureServiceMembershipsForRoles(userId,[ownerRole])` (L153-155) → **행이 없으면 `status='active'` 로 생성** (`api/services/admin/service-membership-ensure.ts` L7, L55-63). 기존 행은 status 보존.
  - `roleAssignmentService.assignRole({role: ownerRole})` (L159)
- 정본 `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md` §3-A 는 "운영자 승인이 아니라 본인 신청" 을 명시. 이번 WO §3-1(자격 확인 + 운영자 승인)과 **직접 충돌** → 단계 1-8 정본 정비 대상.

#### 1-4. 경로 C — Pharmacy-Hub (호환)

- `POST /api/v1/pharmacy-hub/join` (`api/controllers/pharmacy-hub/PharmacyHubJoinController.ts`) → pending, roleType member|store_owner.
- 운영자 콘솔 `PharmacyHubMembershipConsoleController.ts` → `MembershipApprovalService.approveMembership`(serviceKeys 고정) + 사업자정보 5항목 재검증(`assertStoreOwnerBusinessInfo`, MembershipApprovalService L217-275, L441) + `PharmacyHubStoreProvisioningService`(org code `ph-pharm-{userId 12hex}`).

#### 1-5. kpa-society 의존 지점 (약국/매장 축)

| 위치 | 의존 |
|---|---|
| `api/utils/store-owner.utils.ts` L64-68 `STORE_OWNER_ROLES_BY_SERVICE` | kpa/cosmetics/pharmacy-hub 3종 |
| `api/utils/store-owner.utils.ts` L135-150 | isStoreOwner 가 해당 서비스 active service_membership 을 요구 → 약국 매장 = kpa-society membership |
| `api/utils/store-organization.resolver.ts` L59, L62, L73-82 | `STORE_MEMBER_ROLES`, `StoreOwnerServiceKey`, `STORE_SERVICE_ORG_LINKAGE` |
| `api/modules/policy-acceptance/policy-acceptance.service.ts` L44-46, `.routes.ts` L87-89 | 매장 경영자 계약 게이트 serviceKey→role 맵 |
| `api/services/store-owner-termination.service.ts` L33-35 | 종료 처리 맵 |
| `api/services/store/store-membership.service.ts` L82 `STORE_MEMBER_ROLE_BY_SERVICE` | Record<StoreOwnerServiceKey> |
| `api/utils/buyer-organization.resolver.ts` L49-55 | cart serviceKey→store org key |
| `api/config/community-catalog.ts` L64-70 | 커뮤니티 `pharmacy` 참여 자격 = kpa-society OR pharmacy-hub membership |
| `api/modules/auth/controllers/auth-account.controller.ts` L147-290 | 공통 `/auth/me/profile` 이 kpa_pharmacist_profiles · kpa_members · `kpa:store_owner` 회수까지 직접 수행 |
| `api/services/approval/MembershipApprovalService.ts` (위 1-2) | Core 승인 엔진 안의 kpa 분기 |
| `services/web-store/src/lib/serviceContext.ts` L16, L39, L84, L128, L139 | 통합 매장 공통 문맥 = KPA→KCos→PH 우선, 기본값 kpa-society |
| `services/web-store/src/App.tsx` | `/work/kpa-society/store/*` 등 서비스별 트리 |

---

### 2. 약국 조직 ↔ 내 매장

#### 2-1. 모델

- **Store = `organizations` row.** 매장 자산 경계 = `organizationId`(ROLE-WORKSPACE-ARCHITECTURE §3, Boundary F6). 별도 store 테이블 없음(`organization_stores` 는 같은 테이블의 엔티티 이름 `OrganizationStore`).
- 스키마(`api/database/bootstrap/canonical-schema-baseline.ts`):
  - `organizations` L2881-2903 — `code` UNIQUE(L5160), `type`, `business_number`(**비유니크**, 부분 인덱스 L5615), `parentId`, `metadata`, storefront_* 컬럼.
  - `organization_members` L2823-2834 — `UNIQUE(organization_id,user_id)`(L4908), `role` 기본 'member', `left_at`, `is_primary`.
  - `organization_service_enrollments` L2871-2880 — `UNIQUE(organization_id, service_code)`, `status varchar(20) default 'active'`(CHECK 없음), `config jsonb`. 엔티티 `api/routes/kpa/entities/organization-service-enrollment.entity.ts`.
  - `service_memberships` L3529-3541 — `UNIQUE(user_id, service_key)`(L5238), status/role/approved_by/approved_at/rejection_reason.
  - `platform_store_slugs` — (store_id, service_key) 단위 slug.
- 1 Store : N Services = `organization_service_enrollments` (ROLE-WORKSPACE §3·§4-1).

#### 2-2. "약국당 매장 1개" 인가?

- 조직 1개 = 매장 1개는 정의상 1:1(같은 row). **그러나 한 약국(사업자) = 조직 1개는 보장되지 않는다.**
  - KPA 승인: code `kpa-pharm-{bizno}` (사업자번호 결정적)
  - store 자가 가입: `store-{svc}-{uid12}` (사용자 결정적)
  - Pharmacy-Hub: `ph-pharm-{uid12}`, 동일 bizno PH 조직 재사용만(PharmacyHubStoreProvisioningService L21-38)
  - 서비스 스코프 해석이라 다른 서비스 조직은 재사용 후보가 아님 → 같은 약국이 KPA org · PH org 를 따로 가질 수 있음.
- Identity V3 §5(L94-100): Target 은 `Business ≠ Store`, Business row ⊃ Store row, Store 정체성을 사업자번호에 묶지 말 것(REVIEW-9). 이번 WO("약국 내 매장 하나")와 충돌하지 않지만 **Business row 신설 여부**는 사용자 판단 대상(최소안은 org 1개 = 약국 = 매장).

#### 2-3. 매장 해석 유틸

| 유틸 | 위치 | 동작 |
|---|---|---|
| `isStoreOwner()` | `api/utils/store-owner.utils.ts` L125- | role(`{prefix}:store_owner`) ∧ active membership(DB) ∧ 조직 해석 |
| `resolveStoreOrganization()` | `api/utils/store-organization.resolver.ts` L262-345 | serviceKey 지정 시 linkage(enrollment active ∨ slug active) 후보만, 2개 이상 ambiguous. `x-store-organization-id` 는 후보 내 선택 힌트(L353-366) |
| `isOrganizationLinkedToService()` | 같은 파일 L98-121 | enrollment(status='active') ∨ slug |
| `findStoreMemberOrganizationCandidates()` | L239-252 | `'staff'` 관계(Store Member) |
| `resolveWorkScopeStore()` | `api/utils/work-scope-store-resolution.ts` L122-176 | membership active → store-capable 서비스(neture 는 STORE_IDENTITY_NOT_SUPPORTED, L148-152) → resolver |
| `resolveAccessibleStores()` / `resolveStoreServices()` / `resolveOperatorServices()` | `api/utils/service-tenant.resolver.ts` L259-, L208-, L370- | 통합 매장 목록 · My Services · 운영 가능 서비스 |
| `kpa-store-owner.util.ts` | `api/routes/o4o-store/utils/` | KPA 매장 API 전용 |

라우트: `GET /api/v1/work-scope/{store-resolution,store-services,accessible-stores,operator-services}` (`api/routes/work-scope.routes.ts` L40-114, mount `bootstrap/register-routes.ts` L987-989).

프런트 `services/web-store`: `StoreContext.tsx` L1-11 (accessible-stores → selector → store-services), `StoreGate.tsx`, `App.tsx` `/store/*`(통합, 공통 문맥) + `/work/kpa-society/store/*` · `/work/k-cosmetics/store/*` · PH `services/ph/*` · `/hub/*`(Store Hub 화면 다수 — WO §3-7 제거 대상).

`StoreOwnerServiceKey` 를 참조하는 비테스트 파일 31개, 서비스 리터럴로 owner/store access 를 호출하는 지점 약 22곳.

---

### 3. pharmacy.neture.co.kr · 세미프랜차이즈 · 운영자 권한

#### 3-1. pharmacy.neture.co.kr 의 코드상 실체

- serviceKey `kpa-society`, role prefix `kpa:*`, 앱 `services/web-kpa-society`, API `/api/v1/kpa/*` (`register-routes.ts` L939). 운영자 = `kpa:operator`/`kpa:admin` (`packages/security-core/src/service-configs.ts` L113-127, platformBypass=false).
- 즉 WO 의 "pharmacy 세미프랜차이즈" 는 오늘 **kpa-society 서비스 전체**와 동일시돼 있다. WO §3-1 은 kpa-society 가입을 Neture 기본 자격으로 재해석·자동 전환하지 말라고 하므로, pharmacy 세미프랜차이즈 가입도 **새 가입 기록**이어야 한다(기존 kpa-society membership 을 세미프랜차이즈 가입으로 쓰면 재해석이 됨).

#### 3-2. franchise / group / chain 개념

- 런타임 개념 **없음**. "세미프랜차이즈" 는 문서·주석(`service-catalog.ts` L127, L144, SUBDOMAIN-SEMANTICS §1)과 guide copy 문자열에만 존재.
- 가장 가까운 기존 축: `service_memberships`(사용자↔서비스), `organization_service_enrollments`(조직↔서비스), `offer_service_approvals`(오퍼↔서비스 승인, `api/modules/neture/entities/OfferServiceApproval.entity.ts`), `supplier_product_offers.service_keys text[]`(L146), `service_audience_policies`(서비스가 약국 대상인지, admin 설정). → 공급 제안·이벤트 쪽도 "세미프랜차이즈 = serviceKey" 를 전제한다(1-4 조사 범위와 연결).
- **선례(개체 단위 소속·운영자)**:
  - 분회: `kpa-branch` 서비스 키 1개 + `kpa_organizations` + `branch_memberships`(status active/left) + `kpa-branch:operator` 는 개체 관계로 정해지는 운영자(`api/config/operator-role-catalog.ts` L13-36).
  - 커뮤니티: `CreateCommunityDomain1790400000000`(`api/database/migrations/1790400000000-CreateCommunityDomain.ts` L1-21) — "서비스 키를 늘리지 않고 개체 + 개체 단위 가입·역할". `community_memberships(community_id,user_id) UNIQUE, role operator|member, status pending|active|rejected|withdrawn`. 운영자 판정 = role='operator' ∧ status='active'.

#### 3-3. 운영자 권한 범위 판정 (현재)

- Guard: `requireAuth` → `require{Service}Scope('{prefix}:operator')` (security-core `createServiceScopeGuard`, configs L113-200). membership guard(`common/middleware/membership-guard.middleware.ts`, F10)와 결합.
- 운영 가능 서비스 목록: `resolveOperatorServices()` = role `{prefix}:admin|operator` ∧ service_membership active (`service-tenant.resolver.ts` L370-418).
- `role_assignments.scope_type / scope_id` (`api/modules/auth/entities/RoleAssignment.ts` L121-131): 판정 소비 0, 표시용 SELECT 1곳(`controllers/operator/MembershipConsoleController.ts` L378, L430).
- 부분 유니크 `ux_role_assignments_user_role_active (user_id, role) WHERE is_active` (엔티티 L45-48, baseline L6132) → **같은 role 을 여러 scope_id 로 동시 활성 보유 불가**. scope 컬럼으로 "운영자 ↔ 복수 세미프랜차이즈" 를 표현하려면 F9/F10 인덱스 변경이 필요 → 비권장.

#### 3-4. serviceKey 하드코딩 — 세미프랜차이즈를 serviceKey 로 추가하면 수정해야 할 곳

`'kpa-society'` 리터럴: api 비테스트 76파일 · web-store 8파일 · packages 40파일. 새 서비스 키 1개 추가 시 최소 수정 지점:

1. `api/config/service-catalog.ts` O4O_SERVICES + `platform_services` seed migration
2. `packages/security-core/src/service-configs.ts` prefix 맵(L40-43) + 새 `*_SCOPE_CONFIG` + 다른 config 의 `blockedServicePrefixes`
3. `api/types/roles.ts` role registry · `api/config/operator-role-catalog.ts` + 프런트 카탈로그(테스트가 일치 강제)
4. `api/utils/store-owner.utils.ts` L64 · `store-organization.resolver.ts` L62, L73 · `store-enrollment.service.ts` L45, L53 · `store-membership.service.ts` L82 · `store-pop-v2.controller.ts` L49 (Record 타입이라 컴파일 강제)
5. `policy-acceptance.service.ts` L44 · `.routes.ts` L87 · `store-owner-termination.service.ts` L33
6. `buyer-organization.resolver.ts` L49 · `store-product-request.controller.ts` L41 · `supplier-content-handoff-targets.ts` L36 · forum `admin-forum.routes.ts` L40 / `operator-forum.routes.ts` L75 · `store-screen-set-qr.service.ts` L20
7. `community-catalog.ts` participation policy
8. `MembershipApprovalService` 서비스별 분기(L227-228 등)
9. web-store `serviceContext.ts` union/priority/origin, `App.tsx` `/work/<key>/*` 트리, 서비스 앱 1개(도메인·배포 workflow)
→ WO §3-2 "추가 때마다 여러 곳 수정 금지" 와 정면 충돌. **세미프랜차이즈는 serviceKey 가 아니라 데이터(개체 row)여야 한다.**

---

### 4. 공급자 가입 승인 (2-5)

- 이미 승인형. `neture_suppliers.status` enum PENDING/ACTIVE/INACTIVE/REJECTED (`api/modules/neture/entities/NetureSupplier.entity.ts` L11-16, status 컬럼 ~L178-183, `user_id`, `organization_id`, `approved_by/at`, `rejected_reason`).
- 승인 `POST /api/v1/neture/operator/suppliers/:id/approve` — `operator-supplier.controller.ts` L366, guard `requireSupplierScope('supplier:operator')` (L72-73).
- `NetureSupplierService.approveSupplier()` (`api/modules/neture/services/supplier.service.ts` L132-188): PENDING→ACTIVE, `service_memberships('neture')` active 전환, role `supplier`(unprefixed) 부여, 조직 sync·활성(organization_members 경유, `organizations(type='supplier')`).
- 사업자 본인 접근 판정은 `organization_members(owner) → organizations(type='supplier') → neture_suppliers` (SUBDOMAIN-SEMANTICS §2-1, `O4O-SUPPLIER-DOMAIN-BOUNDARY-V1` §7 FROZEN).
- 결론: **현행 유지**. 단, `service_memberships('neture')` 는 공급자 승인이 쓰는 축이므로 약국 기본 가입 상태를 이 행에 실으면 공급자와 충돌(동일 사용자 겸업 시 정지/해지가 서로 번짐).

---

### 5. 최소 데이터 모델 제안

원칙: 기존 축(organizations · organization_members · organization_service_enrollments · role_assignments · service_memberships)을 **의미가 정확히 맞을 때만** 재사용. 세미프랜차이즈는 개체 데이터로. 권한 = Role ∧ Relationship(Identity V3 §7).

#### (a) Neture 기본 약국 가입 · 자격 확인 · 운영자 승인

| 요소 | 저장 | 비고 |
|---|---|---|
| 약국(사업자=매장) | `organizations` (type='pharmacy', code `neture-pharm-{uuid}` 등 사업자번호 비의존), `business_number` = 사업자번호 단일 정본 | 스키마 변경 없음 |
| 신청자 ↔ 약국 | `organization_members(role='owner')` | 기존 |
| 기본 가입 상태 | **안 1 (스키마 0)**: `organization_service_enrollments(service_code='neture', status pending→active / rejected / suspended / terminated)` — 모든 기존 reader 가 `status='active'` 만 linked 로 봄(resolver L110, L163; tenant fold L155-165) → 비활성 상태 추가가 기존 경로에 권한을 주지 않음. 결정 이력(신청자·결정자·사유)은 `config jsonb` + ActionLog. **안 2 (권장 시 migration 1)**: 신청·심사 원장 `neture_pharmacy_applications`(organization_id UNIQUE, applicant_user_id, status CHECK, decided_by, decided_at, reason, submitted_at) + 승인 시 enrollment(active) 기록. 감사 컬럼을 jsonb 에 숨기지 않음 |
| 자격 근거 | 약사 면허: `kpa_pharmacist_profiles`(Identity V3 §4 L98-105 — "플랫폼 Professional Credential 의 초기 물리 저장소, KPA 소유 아님", verification `operator_review`). 사업자번호: `organizations.business_number`. | **사용자 판단 필요**: 테이블명이 kpa_* 라 WO §3-1 "kpa-society 재해석 금지" 와 오해 소지. membership 이 아니라 credential 재사용임을 정본에 명시하거나, 신청 원장에 확인 결과만 기록 |
| 매장 경영 Role | 새 role `neture:store_owner` (F9 §4 절차: roles.ts 등록 · assignRole · catalog 문서 · scope config) + 사용자 `service_memberships('neture')` active(F11 "membership 없이 role 금지", isStoreOwner L135-150) | `kpa:store_owner` 재사용 시 isStoreOwner 가 kpa-society membership 을 요구 → §3-1 위반. 따라서 neture 축 신설이 일관됨 |
| Store 해석 등록 | `STORE_OWNER_ROLES_BY_SERVICE` · `StoreOwnerServiceKey` · `STORE_SERVICE_ORG_LINKAGE`(neture: enrollmentCodes ['neture']) · `STORE_MEMBER_ROLE_BY_SERVICE` · `POP_SERVICE_TO_CATALOG_KEY` · policy-acceptance · termination 맵에 `neture` 1항목 + catalog `neture.workspace.storeWorkspaceEnabled` | 공유 모듈 변경 → SHARED-MODULE-CHANGE-PROTOCOL 소비처 전수 |
| 자가 가입 우회 | `ENROLLABLE_SERVICE_KEYS` 에서 약국 축 제거 또는 enrollment 를 "신청(pending)" 으로 전환 | §1-3 발견 사항 |

#### (b) 약국당 매장 1개

- 정의: Neture 약국 = 기본 가입 원장 1행 = organization 1개 = 내 매장 1개.
- DB 보장: 신청 원장 `organization_id UNIQUE`(안 2) 또는 enrollment `UNIQUE(organization_id, service_code)`(안 1, 기존). 사용자당 Neture 약국 owner 1개는 신청 시 앱 레벨 검사(+ advisory lock).
- 사업자번호 중복 방지: `organizations.business_number` 에 부분 UNIQUE 를 거는 것은 Core(organization-core) 테이블 변경 → 승인 필요. 최소안은 신청 시 앱 레벨 검사.
- 데이터는 전부 테스트용(WO §6) → 기존 kpa/ph/store-* 조직의 이관·backfill 불필요.

#### (c) 세미프랜차이즈별 가입 (신청·승인·정지·종료)

새 테이블 (migration 1개, 커뮤니티·분회 선례와 동형):

```text
semi_franchises
  id uuid PK, key varchar(64) UNIQUE (lower), name, status CHECK('active','closed'),
  created_at, updated_at
  -- 'pharmacy' 행 1개를 seed (pharmacy.neture.co.kr 의미). 기본 공급(§3-3 A)은 이 행을 가리킨다.

semi_franchise_memberships
  id uuid PK, semi_franchise_id FK, organization_id FK(organizations),
  status CHECK('pending','active','rejected','suspended','terminated'),
  applied_by uuid, applied_at, decided_by uuid NULL, decided_at NULL, reason text NULL,
  created_at, updated_at,
  UNIQUE(semi_franchise_id, organization_id)   -- 재신청 = 같은 행을 pending 으로
  INDEX(organization_id, status), INDEX(semi_franchise_id, status)
```

- 가입 주체 = 약국 조직(WO §3-6 "참여 대상은 조직"). 기본 가입 active 를 신청 전제조건으로 검사하되 자동 승인 없음(§3-1).
- `organization_service_enrollments` 재사용 비권장: service_code 는 catalog 서비스 identity 이고 `resolveStoreServices`/My Services 가 그대로 노출 → §3-2 "서비스 식별과 세미프랜차이즈 식별 혼용 금지" 위반, 결정 컬럼도 없음.
- 커뮤니티 연결(§3-8): `community-access.middleware.ts` 는 community_memberships 승인을 요구 → 세미프랜차이즈 커뮤니티는 이 테이블 status='active' 를 직접 판정하는 participation mode 추가가 필요(단계 3-4).

#### (d) 운영자 ↔ 담당 세미프랜차이즈

```text
semi_franchise_operators
  id uuid PK, semi_franchise_id FK, user_id FK(users),
  assigned_by, assigned_at, revoked_at NULL,
  UNIQUE(semi_franchise_id, user_id) WHERE revoked_at IS NULL
```

- 판정 = Role(서비스 범위 운영 role) ∧ Relationship(이 테이블 활성 행). 분회 `kpa-branch:operator` · 커뮤니티 운영자와 같은 2층 패턴.
- Role 후보: 기존 `neture:operator`(NETURE_SCOPE_CONFIG L136-151, 이미 존재·membership 축 neture) 재사용 — **사용자 판단**: 현재 neture:operator 의 의미(Neture 전역 운영)와 겹침. 대안은 새 role 1개(F9 절차). `role_assignments.scope_id` 사용은 부분 유니크 때문에 불가(§3-3).
- 운영 UI 호스트(pharmacy 앱 `/operator` 는 kpa scope guard) — API 를 neture scope 로 둘지 결정 필요.

#### Migration 규약 (CI 강제)

- 파일 `api/database/migrations/<epoch13>-<PascalName>.ts`, class/name = `<PascalName><epoch13>`, epoch 는 기존 최대(1791100000000) 초과 (`api/database/incremental/manifest.ts` L16-26, cutoff L56-63).
- `manifest.ts` import + `INCREMENTAL_MIGRATIONS` append-only (L68-83).
- `incremental/expected-schema-states.ts` 에 격리 PostgreSQL 15 에서 `migrate` 실행 후 얻은 fingerprint/lineCount 를 **같은 커밋**에 append (L12-20, C22 `scripts/db/check-migration-contract.mjs`). 운영 DB 값 복사 금지.
- 관련 spec: `api/__tests__/canonical-database-bootstrap-incremental-migration-separation.spec.ts`(L237-248) 등 — 메모리상 ledger spec · agent 테스트 동반 갱신 주의.
- ESM 엔티티 규칙(CLAUDE.md §2): `import type` + 문자열 relation. `api/database/entities.ts` 등록.
- 독립 `*_orders`/`*_payments` 금지 검사(`scripts/check-forbidden-tables.mjs`)와 무관한 이름.
- 테스트 데이터 초기화는 운영 DB write → 사용자 명시 승인(WO §6).

---

### 6. 영향 받는 공유 모듈 · Frozen 경계

| 대상 | 변경 성격 | Frozen |
|---|---|---|
| `role_assignments` 구조 · `ux_role_assignments_user_role_active` · `RoleAssignment.ts` | **건드리지 않음**(scope_id 방식 배제) | F9 · F10 |
| 새 role `neture:store_owner` (+선택 운영 role) | role 추가 = F9 §4 절차(roles.ts · assignRole · RBAC-ROLE-CATALOG · service-configs). 구조 변경 아님 | F9 절차 |
| `packages/security-core/src/service-configs.ts` | 새 role 을 scope guard 에 넣을 경우만 | F9 연관 · 공유 패키지 |
| `service_memberships` · `membership-guard.middleware.ts` · `ServiceMembership.ts` | 구조 변경 없음. neture 행 사용만 | F10 |
| `MembershipApprovalService` (Approval Engine) | 수정 지양 — 기본 가입/세미프랜차이즈 승인은 Extension 새 서비스로 | F10 |
| `auth-account.controller.ts` `/auth/me/profile` (kpa 직결) | 이번 범위에서 손대면 F10 인접 → 새 신청 API 에서 자격 입력 받는 쪽 권장 | F10 인접 |
| `organizations` · `organization_members` · `organization_service_enrollments` | 행 사용만. business_number UNIQUE 추가 시 Core 테이블 변경 | organization-core(§3) |
| `store-organization.resolver.ts` · `store-owner.utils.ts` · `store-enrollment.service.ts` · `store-membership.service.ts` · `buyer-organization.resolver.ts` · policy-acceptance · termination · `store-pop-v2` | `neture` 키 추가 — 31 소비 파일, SHARED-MODULE-CHANGE-PROTOCOL + `check-literal-consumers.mjs` | Store Layer F3 인접 |
| `service-catalog.ts` neture workspace 플래그 · `service-tenant.resolver.ts` | My Services/운영 목록 노출 변화 | 공통 catalog |
| `community-catalog.ts` · `community-access.middleware.ts` | 세미프랜차이즈 participation mode 추가(단계 3) | — |
| web-store `serviceContext.ts` · `StoreContext.tsx` · `App.tsx` · `@o4o/store-ui-core` workspace | 공통 문맥에 neture 약국 추가, HUB 트리 정리(단계 3) | F3 Store Layer(공통 Core 재작성 금지) |
| `offer_service_approvals.service_key` · `supplier_product_offers.service_keys` | 세미프랜차이즈를 serviceKey 로 표현 중 → 제안 모델(1-4)에서 semi_franchise_id 로 전환 필요 | F8 Distribution Engine 확인 필요 |
| F11 USER-OPERATOR-FREEZE §8.4 "membership 없이 role 직접 생성 금지" | neture:store_owner 부여 시 neture membership 동반 필수 | F11 |

### 7. 정본 충돌 (단계 1-8 후보)

- `O4O-STORE-ACCESS-AND-MEMBERSHIP-V1` §3-A: 본인 신청 자가 가입(승인 없음, 업종 kpa/cosmetics/pharmacy-hub) ↔ WO §3-1 운영자 승인.
- `O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1` §2 L32: pharmacy.neture.co.kr = kpa-society 서비스 ↔ WO 의 세미프랜차이즈 개체 모델.
- `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1` §3 "Store Hub" · §3-1 · §4-1 (My Services = enrollment) ↔ WO §3-7 HUB 제거 · 세미프랜차이즈 ≠ 서비스.
- `services/web-kpa-society/src/pages/join/PharmacyJoinPage.tsx` "약사회 회원 약국" 문구(코드, 정본 아님).

### 8. 사용자 판단 필요 항목

1. 기본 가입 상태 저장: 안 1(enrollment 재사용, 스키마 0) vs 안 2(신청 원장 테이블).
2. 약사 면허 자격 근거로 `kpa_pharmacist_profiles` 재사용 허용 여부(Identity V3 §4 는 허용, WO §3-1 문구와의 정합).
3. 세미프랜차이즈 운영 Role: `neture:operator` 재사용 vs 새 role.
4. pharmacy 세미프랜차이즈 운영 화면 호스트(pharmacy 앱 vs Neture 운영 화면)와 그 API scope.
5. Business row 분리(Identity V3 §5) 이번 범위 제외 여부.
6. store 자가 가입(`/api/v1/store/enrollment`)의 약국 축 폐쇄 방식.

---

## B. 공급자 · 제품 · 공급 제안 · 이벤트 · 취급매장 모집 · 재고

- 조사 대상: worktree `D:/o4o-wt/neture-pharmacy-store-commerce-refactor-v1` (HEAD `7f09a7a71`), 읽기 전용. DB · 네트워크 접근 없음.
- 경로 표기: 별도 표시가 없으면 `apps/api-server/src/` 기준. `BL` = `database/bootstrap/canonical-schema-baseline.ts`.
- 도메인 매핑 사실: `pharmacy.neture.co.kr` = serviceKey `kpa-society` (`config/service-catalog.ts:122-136`, "약국 사업자 대상 세미프랜차이즈 운영 서비스"). 이 서비스의 이벤트 키는 `kpa-groupbuy` (`constants/event-offer-service-mapping.ts:25-28`). `pharmacy-hub`(pharmacyhub.co.kr)는 별도 서비스로 joinEnabled=false다.

---

### 1. 제품 모델 · 승인

#### 1-1. 테이블과 관계
| 테이블 | 역할 | 근거 |
|---|---|---|
| `product_masters` | 플랫폼 소유 상품 기준정보. `status` ACTIVE/SUSPENDED/ARCHIVED는 admin만 변경 | `modules/neture/entities/ProductMaster.entity.ts:158`, `controllers/product-master-status.controller.ts` |
| `supplier_product_offers` (SPO) | 공급자 1명 × master 1개에 대한 공급 상품. **가격 · 설명(B2C/B2B) · 재고 · 노출 범위가 모두 이 한 행에 있다** | `modules/neture/entities/SupplierProductOffer.entity.ts:35-175` (price_general :92, descriptions :110-123, stock/reserved/track_inventory :128-141, service_keys :146, allowed_seller_ids :88) |
| `offer_service_approvals` (OSA) | (offer, serviceKey) 별 운영자 공급 승인. SSOT | entity `modules/neture/entities/OfferServiceApproval.entity.ts`; 서비스 `services/offer-service-approval.service.ts:1-10` |
| `offer_service_prices` (OSP) | (offer, serviceKey) 별 서비스 공급가 | `modules/neture/services/offer-service-price.service.ts:1-8` |
| `distribution_type` | 파생 필드: isPublic → PUBLIC, service_keys 있음 → SERVICE, 그 밖 → PRIVATE | `modules/neture/services/offer.service.ts:34-38` (계약 테스트 `__tests__/supplier-domain-boundary.spec.ts:120-122`) |
| `organization_product_listings` (OPL) | 매장 진열 행 **이면서 동시에 이벤트 오퍼 원장**(source_type='event-offer'), 모집 bridge 행(source_type='seller_recruitment') | `modules/store-core/entities/organization-product-listing.entity.ts:24-147` |
| `spot_price_policies` | 기간 한정 스팟가. **주문 경로에서 쓰지 않음**(cart · checkout 쪽에 참조 없음) | `modules/neture/entities/SpotPricePolicy.entity.ts` |
| `product_approvals` | F8 v2 승인 레코드. 현재는 kpa-society 승인 시 KPA 2차 심사 큐(bridge)로 생성 | `offer-service-approval.service.ts:468-479` |

#### 1-2. "공급 제안을 하나로 강제하는" 제약
| 제약 | 의미 | 근거 |
|---|---|---|
| `uq_supplier_product_offers_master_supplier UNIQUE (master_id, supplier_id)` | 공급자 × 상품 = SPO 1행 (soft-delete 행도 자리를 차지함) | BL:5368; 코드 사전검사 `offer.service.ts:812-835` (`OFFER_ALREADY_EXISTS` / `OFFER_IN_RECYCLE_BIN`), 23505 변환 :843-856, 호출 :974-990 |
| `offer_service_approvals_offer_id_service_key_key UNIQUE (offer_id, service_key)` | 서비스당 승인 1건 | BL:5130 |
| `offer_service_prices_offer_id_service_key_key UNIQUE (offer_id, service_key)` | 서비스당 가격 1개 | BL:5134 |
| `idx_org_listing_unique_v2 UNIQUE (organization_id, service_key, offer_id)` (부분조건 없음) | 조직 × 서비스 × offer = OPL 1행. **이벤트 행에도 적용된다** | BL:5942 |
| `idx_org_listing_unique_master UNIQUE (organization_id, service_key, master_id) WHERE offer_id IS NULL` | master 기반 매장 진열 1행 | BL:5941 |
| `uq_seller_recruitments_product_seller_service UNIQUE (product_id, seller_id, service_id)` | 상품 × 공급자 사용자 × 서비스 = 모집 1건 | BL:5354; 코드 `seller-recruitment.service.ts:295-299` (`RECRUITMENT_ALREADY_EXISTS`) |
| `UQ_seller_recruitment_applications_recruitment_applicant (recruitment_id, applicant_id)` | 모집 × 신청 **사용자** 1건 | BL:4918 |
| `idx_product_approval_unique_v2 (offer_id, organization_id, approval_type)` | F8 승인 1건 | BL:5972 |

선행 감사 `docs/checks/CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1.md` §9 판정은 "A. SPO unique 제약 유지"다. §11에 따르면 제약을 없애면 OSA · OSP 유일성, distribution_type 파생, 승인→listing 연결, slug 규칙을 모두 다시 설계해야 한다.

#### 1-3. 승인은 어디서 하고, 제품 승인과 공급 승인은 나뉘어 있는가
- **현재는 나뉘어 있지 않다.** `supplier_product_offers.approval_status`는 OSA에서 파생된다. 하나라도 approved면 APPROVED와 is_active=true가 되고 PUBLIC/SERVICE 자동 확산이 일어난다. 모두 rejected면 REJECTED가 되고 listing이 비활성화된다 (`offer-service-approval.service.ts:400-513`). 별도의 "제품 등록 승인" 축은 없다.
- 운영자 승인 화면은 두 경로 모두 **`neture:operator`** scope다.
  - `POST /neture/operator/products/:id/approve` (`modules/neture/controllers/operator-product-approval.controller.ts:40,178`) → `offer.service.ts:201-307 approveProduct`. 이 함수는 OSA 행을 전부 approved로 바꾼 뒤 sync를 호출한다. 규제상품 permit 게이트는 :219-243에 있다.
  - `PATCH /neture/operator/service-approvals/:id/approve` (`operator-service-approval.controller.ts:36,184`) → `offer-service-approval.service.ts:519 approve`.
  - 즉 KPA나 K-Cos 대상 공급 승인도 해당 서비스 운영자가 아니라 **Neture 운영자**가 한다. (KPA 쪽에는 `product_approvals` 2차 심사 큐가 따로 생긴다, :468-479.)
- 승인 대상 키는 `kpa-society`와 `k-cosmetics` 둘뿐이다 (`modules/neture/constants/approval-service-keys.ts:18-21`). `pharmacy-hub`는 공급자가 직접 opt-in하는 키다 (`constants/supplier-optin-services.ts:79`). `'neture'`는 승인 대상이 아니고 service_keys 입력 단계에서 제거된다 (`offer.service.ts:907`).
- **[확인 필요 결함 후보]** PRIVATE offer(service_keys가 비어 있음)는 OSA 행이 0이다. 이 경우 approveProduct가 INSERT할 키가 없고 (`offer.service.ts:250-264`), sync는 approvals가 0이면 PENDING으로 즉시 반환한다 (`offer-service-approval.service.ts:410-412`). 그래서 이 경로로는 APPROVED가 될 수 없는 것으로 보인다. 그런데 모집은 PRIVATE offer만 허용하고 (`seller-recruitment.service.ts:285`), Neture 축 checkout은 APPROVED를 요구한다 (`services/cart/offer-exposure-strategy.ts:171-174`).

---

### 2. 가격 저장과 복수 제안을 어디에 둘 것인가

#### 2-1. 현재 가격 축
- `spo.price_general`: 기본 B2B 공급가 (`SupplierProductOffer.entity.ts:92`). `price_gold`와 `price_platinum`은 "참고용, 주문 미반영"이다 (:96-101).
- `offer_service_prices.unit_price`: 서비스별 공급가. 주문 단가의 우선순위는 주석 기준으로 event_price > OSP > price_general > opl.price다 (`offer-service-price.service.ts:6`).
- B2B 확정(`services/cart/b2b-checkout-confirm.core.ts`)은 OSP를 우선하고 없으면 price_general을 쓴다 (:193-195, :335-336). cart의 `price_snapshot`은 신뢰하지 않는다.
- 이벤트: 단가는 `opl.event_price`, 없으면 price_general이다 (`routes/kpa/services/event-offer.service.ts:733-736`). 목록과 상세는 COALESCE(event_price, OSP, price_general, opl.price)로 표시한다 (:312, :545). 따라서 event_price가 NULL인 레거시 행은 표시가와 청구가가 다를 수 있다 (경미).
- 모집: `seller_recruitments`에는 `consumer_price`와 `commission_rate`(레거시 파트너 잔재)만 있고 **공급 조건 가격은 없다** (`modules/neture/entities/SellerRecruitment.entity.ts:60-63`). 승인된 참여자는 일반 offer 가격으로 주문한다.

#### 2-2. 복수 제안을 어디에 둘 것인가
SPO 한 행에 설명 · 재고 · 기본가가 모두 있다. 그래서 SPO를 여러 행 만들면 3-4가 금지하는 "설명 · 이미지 · 재고 반복 생성"이 된다. 이미지는 master 기준 `ProductImage`에 있다. 결론은 다음과 같다.
**SPO는 (supplier, master) 1행으로 유지**한다 (unique 제약과 위 CHECK 판정을 따름). 그 아래에 **가격 · 대상 · 승인 상태만 갖는 자식 행**을 둔다. 자세한 안은 §7에 있다.

---

### 3. 이벤트 오퍼

#### 3-1. 저장과 수명주기
- 원장은 `organization_product_listings`의 `source_type='event-offer'` 행이다 (`event-offer.service.ts:1155`). `organization_id`는 매장이 아니라 **서비스 운영 조직**이다. KPA 공급자 제안은 `kpa_members role='operator' LIMIT 1` 임의 선택이고 (`routes/kpa/helpers/event-offer-organization.helper.ts:51-54,126-132`), K-Cos는 첫 enroll 조직이다 (:96-108).
- DB 상태: pending / approved / rejected / canceled. 실행 시점에는 upcoming / active / sold_out / ended로 계산한다 (`event-offer.service.ts:57-90`). 노출 조건 ACTIVE_OFFER_CLAUSE는 :97-102에 있다.
- 생성: `createListing` (:993-1194). 공급자는 pending과 is_active=false로, 운영자는 approved로 생성한다 (:1083-1093). 이벤트 가격은 대상 서비스 공급가(OSP, 없으면 price_general) 이하여야 하고, 기간은 필수다 (:1099-1137). 다중 서비스 제안은 `createMultiServiceProposal` (:1435-1563)이다.
- 공급자 제안 경로는 다음과 같다.
  - Neture: `POST/GET /api/v1/neture/supplier/event-offer-proposals` (`routes/neture/controllers/supplier-event-offer-proposals.controller.ts:50-205, 211-297`). 이 경로는 eventPrice, startAt, endAt이 필수다.
  - KPA: `POST/GET /kpa/supplier/event-offers` (`routes/kpa/controllers/supplier-offers.controller.ts:13-16`).
- 승인과 반려: `approveListing` :1203-1243, `rejectListing` :1249-1300. 둘 다 pending에서만 가능하다.
  - KPA: `/kpa/groupbuy-admin/products/:id/approve|reject` (`event-offer-operator.controller.ts:410-473`, `requireKpaScope('kpa:operator')` :121)
  - K-Cos: `routes/cosmetics/controllers/event-offer.controller.ts:161-233`
- 조회:
  - KPA `/kpa/groupbuy`, `/enriched`, `/:id`, `/my-participations`
  - Neture `/neture/event-offers` (`routes/neture/controllers/event-offer.controller.ts:33-103`, key `neture-event-offer`)
  - 운영자 `pending-listings`
  - 공급자 목록 (위 GET)
- **Neture · pharmacy 대상 이벤트는 생성 경로가 없다.**
  - TARGET_TO_EVENT_OFFER_KEY에는 kpa-society와 k-cosmetics만 있다 (`constants/event-offer-service-mapping.ts:25-28`).
  - helper에는 `EVENT_OFFER_NETURE` 분기가 없고 TODO 주석만 있다 (helper :114-117).
  - `pharmacy-hub-event-offer`는 키만 등록되어 있고 매핑이 없다 (`constants/service-keys.ts:20-23`).
  - 정리하면 `/neture/event-offers` 조회 API는 있지만 공급하는 경로가 없다.

#### 3-2. 가격 수정 경로
- 생성 이후 `event_price`를 바꾸는 코드는 없다. 쓰는 곳은 INSERT 한 군데뿐이다 (`event-offer.service.ts:1148`). 정책 문서도 같다 (`docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md` §7 "생성 이후 수정 불가 → 취소 또는 재생성").
- 다만 **승인 우회 경로가 있다.** `POST /kpa/groupbuy-admin/products/:id/visibility`가 `isVisible=true`일 때 status를 **canceled에서 approved로 되돌린다** (`event-offer-operator.controller.ts:248-276`). "삭제·종료 후 새로 신청" 원칙과 충돌한다.

#### 3-3. 삭제 · 종료와 주문 참조
- 삭제는 soft cancel이다: `DELETE /kpa/groupbuy-admin/products/:id`가 is_active=false, status='canceled'로 바꾼다 (`event-offer-operator.controller.ts:478-505`). 행은 남는다.
- 주문은 OPL에 FK를 걸지 않는다. `checkout_orders.items[].metadata.productListingId/eventOfferId`(jsonb)로만 참조한다 (`services/cart/event-offer-cart-checkout.service.ts:242-246`). 그래서 cancel해도 주문 기록이 손상되지 않는다.
- OPL.offer FK는 `onDelete: 'CASCADE'`다 (`organization-product-listing.entity.ts:83`). SPO를 hard delete하면 이벤트 행도 사라진다 (운영자 cleanup `modules/neture/controllers/operator-product-cleanup.controller.ts:313,493`). 공급자 삭제는 soft delete다.
- SPO가 REJECTED로 파생되면 `UPDATE organization_product_listings SET is_active=false WHERE offer_id=$1`이 실행된다. 이벤트 행 is_active도 함께 꺼진다 (`offer-service-approval.service.ts:497-500`).
- **재신청이 막힌다 (3-5 위반).**
  - `createListing`의 중복 검사는 `(organization_id, service_key, offer_id)`를 **status와 무관하게** 본다. 그래서 canceled나 rejected 행이 있어도 409 `ALREADY_LISTED`가 난다 (`event-offer.service.ts:1072-1081`).
  - DB 인덱스 `idx_org_listing_unique_v2`(BL:5942)도 같은 키라서, 코드 검사를 없애도 23505가 난다.
  - 이 구조에서는 같은 offer, 같은 서비스에 이벤트를 **평생 1건**만 둘 수 있다. 동시에 여러 승인 이벤트를 두는 것도 불가능하다.

#### 3-4. 수량 한도와 예약 · 차감 · 복원 (보존 대상)
| 기능 | 함수 | 위치 |
|---|---|---|
| 한도 컬럼 | `total_quantity`(**남은 수량을 직접 차감 저장**하며 원래 총량은 보존되지 않음), `per_store_limit`, `per_order_limit` | entity :60-70 |
| 매장 누적 주문량 | `STORE_ORDERED_QTY_SQL`(buyerId 기준, cancelled/refunded 제외, line-item metadata productListingId) / `countStoreOrderedQuantity` | `event-offer.service.ts:124-138, 177-185` |
| 가용 표시 | `getListingAvailability` | :422-490 |
| 주문 컨텍스트 | `loadEventOfferContext` (approved + 기간 + SPO active/APPROVED + 공급자 ACTIVE) | :696-750 |
| 예약(원자 차감) | `reserveEventOfferListing` — `FOR UPDATE`. 순서: (A) per_order, (B) total 잔여, (C) per_store 누적, (D) `total_quantity - qty` | :760-833 |
| 보상 · 복원 | `incrementListingQuantity` (best-effort) | :835-848 |
| 호출처 | cart 확정 reserve `event-offer-cart-checkout.service.ts:209`, 실패 보상 :312, 결제 전 취소 복원 `services/checkout/store-order-cancel.service.ts:196-214`(total_quantity가 NOT NULL인 listing만), 레거시 `participate` :619-686(route는 410 은퇴, `routes/neture/controllers/event-offer.controller.ts:112-121`) |
| cart → 이벤트 키 매핑 | `CART_TO_EVENT_OFFER_SERVICE_KEY` (kpa-society, k-cosmetics만) | `event-offer-cart-checkout.service.ts:38-41` |

한도 판정이 buyer **user** 기준이라 per_store_limit이 실제로는 "사용자별" 한도다. 약국 조직 기준으로 바꿀지는 별도 판단이 필요하다.

---

### 4. 취급매장 모집 (seller recruitment)

- 모델은 `seller_recruitments`(product_id = **master id**, seller_id = **공급자 user id**, service_id)와 `seller_recruitment_applications`(applicant_id = **사용자**)다 (`SellerRecruitment.entity.ts:46-95`, `SellerRecruitmentApplication.entity.ts:29-66`).
- 상태는 두 축이다: 모집 운영 상태 recruiting/closed, 노출 승인 상태 pending/approved/rejected (:28-43).
- 생성: `createRecruitment` (`seller-recruitment.service.ts:251-333`).
  - offer는 master와 내 공급자 집합으로 고르되 `LIMIT 1`이다 (:265-281).
  - **PRIVATE offer만 허용**한다 (:285).
  - 서비스당 1건으로 제한한다 (:295-299).
- **조건 승인(운영자)**: `setRecruitmentExposure` (:149-172).
  - Neture 운영자 경로: `operator-recruitment-exposure.controller.ts:36,65-72` (neture:operator)
  - 서비스 운영자 proxy: `service-recruitment-exposure-proxy.controller.ts` (KPA/K-Cos operator, serviceKey 고정, SERVICE_MISMATCH 차단)
  - 승인된 조건을 다시 승인받는 반복 승인은 없다.
- **참여 승인(공급자)**:
  - 신청: `createApplication` :339-358 (노출 승인된 모집에만 가능)
  - 처리: `approveApplication` :468-500, `rejectApplication` :502, `terminateParticipation` :537-
  - 매장 browse는 kpa-society, approved, recruiting으로 고정된다 (`store-seller-recruitment-browse.controller.ts`).
- **참여 단위는 사용자다 (3-6 위반).**
  - application.applicant_id는 user다.
  - 승인 C-bridge는 `spo.allowed_seller_ids`에 **신청자 user id**를 추가한다 (:629-638).
  - 조직은 `organization_members WHERE user_id LIMIT 1`로 **임의 선택**한다 (:640-647). 그 조직에 OPL을 `source_type='seller_recruitment'`, `ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`으로 만든다 (:648-655).
  - 공급자 측도 user id(seller_id)를 쓰고 있어 Supplier Domain §7 canonical(organization) 기준과 어긋난다.
- **승인된 참여자의 주문 경로 [확인 필요]**: kpa-society cart는 approval strategy를 쓴다. 이 전략은 `osa.service_key=kpa-society AND approved`인 EXISTS가 필수이고, PRIVATE이면 allowed_seller_ids에 buyerId가 있어야 한다 (`offer-exposure-strategy.ts:113-142`). 그런데 모집 대상은 PRIVATE offer(service_keys가 비어 있어 OSA가 없음)다. 따라서 승인된 참여자가 실제로 kpa-society cart로 주문할 수 없을 가능성이 크다. Neture 축(`neture` strategy :165-185)은 APPROVED가 필요한데 §1-3 결함 후보와 겹친다. 모집 고유의 공급가도 없다.

---

### 5. 재고 (내부 재고) — 보존해야 할 함수와 호출처

| 기능 | 위치 | 현재 실행 여부 |
|---|---|---|
| 재고 컬럼 | SPO `stock_quantity` · `reserved_quantity` · `low_stock_threshold` · `track_inventory` | `SupplierProductOffer.entity.ts:128-141` |
| 공급자 재고 관리 | `InventoryService.getSupplierInventory/getInventoryDetail/updateInventory` | `modules/neture/services/inventory.service.ts:10,29,47` (controller `inventory.controller.ts`) |
| **주문 확정 시 재고 검사** | `B2BCheckoutConfirmCore.confirm`: `available = stock - reserved < qty → INSUFFICIENT_STOCK` (**검사만 하고 예약 write는 없음**) | `services/cart/b2b-checkout-confirm.core.ts:342-352` (neture · approval · optin 3축 공통) |
| 예약 증가 | `NetureService.createOrder` → `reserved_quantity + qty` | `routes/neture/services/neture.service.ts:437-444(검사), 526-538(예약)` — **호출하는 route 없음(사실상 dead)**. 현행 checkout 경로는 예약하지 않는다 |
| 취소 시 예약 해제 | `NetureService.updateOrderStatus(CANCELLED)` → `GREATEST(reserved - qty, 0)` | `neture.service.ts:626-644` |
| **배송 완료 시 재고 차감** | `updateOrderStatus(DELIVERED)` → `stock_quantity`, `reserved_quantity`를 `GREATEST(... - qty, 0)`로 함께 차감 | `neture.service.ts:646-660` |
| 위 함수 호출처 | 공급자 상태 변경 `modules/neture/controllers/supplier-order.controller.ts:180`, 송장 등록 후 SHIPPED `:236`, 배송 완료 `modules/neture/controllers/shipment.controller.ts:52` | 대상은 bridge된 `neture_orders`. `item.productId` = SPO id (`b2b-checkout-confirm.core.ts:409-413` 주석) |
| 결제 전 취소 | `cancelStoreOrderBeforePayment` — 이벤트 listing 수량만 복원하고 SPO 재고는 건드리지 않는다 (예약이 없으므로 정합) | `services/checkout/store-order-cancel.service.ts:180-237` |
| 기존 수량 상한 | `quantity > 1000` 거부가 **이미 있음** (WO §4 "추가하지 않음"은 새로 추가하지 말라는 뜻이며, 기존 검사의 처리 여부는 판단 필요) | `b2b-checkout-confirm.core.ts:330`, `neture.service.ts:428` |

재고는 SPO 단일 행이 소유한다. 그래서 복수 공급 제안이 재고를 **공유**하려면 제안을 SPO 하위 행으로 두어야 한다. 이 점이 §7 설계의 근거다.

---

### 6. 단일 제안 · 단일 조건을 전제한 지점 (복수 제안을 막는 곳)

1. `uq_supplier_product_offers_master_supplier` + `findDuplicateOffer` 409 `OFFER_ALREADY_EXISTS` / `OFFER_IN_RECYCLE_BIN` — `offer.service.ts:812-856, 974-990`, BL:5368. SPO 단위에서는 유지를 권장한다.
2. `(offer_id, service_key)` unique: OSA BL:5130 (`ON CONFLICT` `offer-service-approval.service.ts:56`, `offer.service.ts:261,347,1558`), OSP BL:5134 (`offer-service-price.service.ts:97`). 서비스당 가격과 승인이 하나로 고정된다. 같은 세미프랜차이즈 대상 복수 조건이나 개별 약국 조건을 표현할 수 없다.
3. `idx_org_listing_unique_v2 (organization_id, service_key, offer_id)` BL:5942. 이 키를 쓰는 곳:
   - 이벤트 중복 409 `ALREADY_LISTED` — `event-offer.service.ts:1072-1081`, 다중 제안 결과 `already_proposed` :1536
   - ON CONFLICT 소비처: `utils/auto-listing.utils.ts:105,162,216,266`, `modules/product-policy-v2/product-approval-v2.service.ts:192`, `routes/o4o-store/controllers/store-product-library.controller.ts:241`, `controllers/pharmacy-hub/PharmacyHubHandledProductController.ts:199`, `seller-recruitment.service.ts:653`, `event-offer.service.ts:968`
4. `idx_org_listing_unique_master ... WHERE offer_id IS NULL` BL:5941 (`product-candidate.service.ts:496`, `store-product-request-admin.service.ts:133`, `store-product-library.controller.ts:301`). 매장 진열용이므로 제안과는 무관하다.
5. 모집 `uq_seller_recruitments_product_seller_service` + `RECRUITMENT_ALREADY_EXISTS` (`seller-recruitment.service.ts:295-299`). 모집과 bridge의 offer 해소가 `master + supplier LIMIT 1`로 되어 있다 (:265-281, :605-617).
6. 이벤트 운영 조직 결정이 `LIMIT 1`이다 (helper :126-132). 세미프랜차이즈별 운영 주체 개념이 없다.
7. 주문 단가 결정이 "offer + serviceKey → 가격 1개"를 전제한다 (`b2b-checkout-confirm.core.ts:193-195, 335-336`). cart에는 선택 조건 ID 컬럼이 없다 (`entities/cart/StoreCartItem.entity.ts:42-76`: supplier_product_offer_id, organization_product_listing_id, event_offer_id, pricing_source뿐).
8. 승인 파생 규칙 "ANY approved → offer 전체 APPROVED"와 "ALL rejected → offer 전체 REJECTED + 모든 OPL 비활성" (`offer-service-approval.service.ts:422-500`). 개별 제안 반려가 상품 전체에 연쇄된다.

---

### 7. 최소 변경 제안

원칙: SPO = "제품 · 공급자 관계 + 설명 · 재고 · 기본가" 1행을 유지한다 (unique 유지, CHECK 판정 존중). 제안은 **가격 · 대상 · 승인만** 갖는 하위 행으로 둔다. Programs(이벤트 · 모집)는 각자의 원장에 그대로 둔다 (Supplier Domain §6 "공통 table 금지").

#### (a) 기본 pharmacy 공급 (대상 미지정)
- **제품 등록 승인을 OSA와 분리**한다. SPO에 이미 있는 `approval_status`를 "제품 등록 승인"의 **입력 상태**로 쓰고, 승인하는 사람은 Neture 운영자다.
  - 이렇게 하면 Supplier Domain §4가 "approval_status = OSA의 파생"이라고 정한 의미가 바뀐다 → **명시적 예외가 필요**하다.
  - 예외를 피하려면 대안이 있다: pharmacy 기본 공급을 `offer_service_approvals(service_key='kpa-society')`의 approved 행으로 표현하고, 제품 승인 시 이 행을 자동 approved로 만든다. 기존 `approveProduct`가 이미 OSA를 일괄 approved로 바꾸므로(:266-271) 동작 변화가 가장 작다. 다만 "공급처 미지정 = pharmacy만"을 보장하려면 승인 시 OSA 대상을 kpa-society 하나로 고정해야 한다.
- 가격은 `price_general`(OSP kpa-society가 있으면 그 값)이다. 추가 승인은 없다.
- 노출과 주문 조건: SPO 승인 + 매장 조직의 pharmacy 세미프랜차이즈 가입 approved.
- cart와 주문에는 "제안 ID = NULL(기본 공급)"로 기록하거나, 아래 (b) 테이블에 `kind='default'` 행을 자동 생성해 ID를 통일한다. 권장은 후자다. 주문 항목 metadata에 제안 ID를 일관되게 남길 수 있다.

#### (b) 명시 제안 (특정 세미프랜차이즈 또는 특정 약국)
- **신규 테이블 1개**(예: `supplier_offer_terms`, 실제 이름은 구현 시 결정)를 SPO 하위에 둔다.
  - 컬럼: `id`, `offer_id → SPO`, `kind`(default · explicit), `target_semifranchise`(세미프랜차이즈 식별자. 다른 조사 축의 모델을 따르고 serviceKey와 섞지 않음), `target_organization_id`(nullable, 개별 약국), `unit_price`, `status`(pending · approved · rejected · ended), `requested_by`, `decided_by`, `decided_at`, `reason`, 타임스탬프.
  - **unique 제약은 두지 않는다.** 단 `kind='default'`만 offer당 1행으로 partial unique를 건다.
  - 설명 · 이미지 · 재고 컬럼은 두지 않는다 (F12 · SPO 재사용).
- 승인 권한은 `target_semifranchise`의 담당 운영자만 갖는다. 서버에서 판정한다.
- 개별 약국 대상이라도 해당 세미프랜차이즈 가입 approved가 필요하다.
- 주문 경로:
  - `store_cart_items`에 `supplier_offer_term_id` 컬럼을 추가한다.
  - B2B confirm core에서 단가를 `term.unit_price`로 결정하고, 권한(term approved + 대상 조직/세미프랜차이즈 가입 판정)을 다시 검증한다.
  - line metadata에 termId와 단가를 snapshot으로 남긴다.
  - 재고 검사는 SPO 기존 로직(`b2b-checkout-confirm.core.ts:342-352`)을 그대로 쓴다.
- 기존 OSA와 OSP는 kpa-society · k-cosmetics의 다른 서비스 흐름을 위해 **그대로 둔다** (다른 서비스 사용처 보존). Neture 약국 흐름에서는 새 테이블이 판정 근거다.
- 개별 제안 반려는 상품 전체에 연쇄하지 않는다 (§6-8의 파생 규칙과 분리).

#### (c) 이벤트 = 가격 불변 제안
- 이벤트는 **OPL `source_type='event-offer'`에 그대로 둔다.** `reserveEventOfferListing`, `incrementListingQuantity`, 취소 복원, `STORE_ORDERED_QTY_SQL`을 100% 보존하기 위해서다 (WO §4). EVENT-OFFER-COMMON-DOMAIN-V1 §14 "테이블 분리 금지"도 지킨다.
- 필요한 최소 변경:
  1. `idx_org_listing_unique_v2`를 **이벤트 행을 제외하는 부분 인덱스**로 교체한다 (`WHERE source_type IS DISTINCT FROM 'event-offer'`). 그리고 `createListing` 중복 검사(:1072-1081)를 이벤트에서는 제거한다. 이렇게 해야 복수 승인 이벤트와 재신청이 가능해진다. migration이 필요하다 → **사용자 승인 항목**.
  2. pharmacy 대상 이벤트 키를 등록한다.
     - `TARGET_TO_EVENT_OFFER_KEY`: kpa-society → kpa-groupbuy는 이미 있다.
     - 세미프랜차이즈별 대상을 표현하려면 OPL에 세미프랜차이즈 식별 컬럼(또는 organization_id = 해당 세미프랜차이즈 운영 조직)을 추가한다.
     - helper의 `LIMIT 1` 임의 조직 선택을 담당 세미프랜차이즈 조직으로 바꾼다.
  3. 승인은 해당 세미프랜차이즈 운영자만 한다.
  4. `visibility` 토글의 canceled → approved 되돌리기(`event-offer-operator.controller.ts:248-276`)를 막는다. 종료는 단방향이어야 한다.
  5. 삭제와 종료는 지금의 soft cancel을 유지한다. 주문은 jsonb로만 참조하므로 기록이 손상되지 않는다.
  6. event_price 수정 경로는 지금도 없으니 계속 만들지 않는다. 회귀 테스트로 고정한다.

#### (d) 취급매장 모집
- 조건 승인은 기존 `exposure_status`를 운영자(해당 세미프랜차이즈 운영자 proxy)가 승인하는 방식을 그대로 쓴다. 재승인 반복은 없다.
- `seller_recruitments`에 **공급 조건 가격**(예: `supply_unit_price`)을 추가하거나 (b) 테이블의 term을 참조하게 한다. Supplier Domain §6 공통 table 금지를 고려하면 **모집 원장에 컬럼을 추가하는 쪽**을 권장한다.
- 참여 단위를 조직으로 바꾼다.
  - `seller_recruitment_applications.applicant_organization_id`를 추가하고, unique를 `(recruitment_id, applicant_organization_id)`로 교체한다.
  - 승인자는 그대로 공급자다.
- 주문은 "승인된 application(조직) 존재 + 모집 노출 approved + recruiting"이면 모집 조건가로 바로 주문할 수 있다.
  - cart에 recruitment(또는 term) ID를 저장한다.
  - `allowed_seller_ids`(user) 추가와 OPL bridge(:600-656)는 Neture 약국 흐름에서는 쓰지 않는다. 다만 Supplier Domain §4는 `allowed_seller_ids`를 "살아 있는 축"으로 보므로 **삭제하지 않는다**.
  - PRIVATE 전용 제한(:285)은 재검토 대상이다. 지금 상태에서는 주문이 막히는 것으로 보인다 (§4).
- 공급자 식별(seller_id = user)을 공급자 조직 · `neture_suppliers.id`로 정렬하는 것은 Supplier Domain §7 canonical과 맞는 방향이지만 범위 확대다. 별도 판단이 필요하다.

#### Frozen 기준과의 충돌 표

| 변경 | 걸리는 기준 | 판단 · 회피 방법 |
|---|---|---|
| 신규 `supplier_offer_terms` + checkout 판정 추가 | F8 §7 "Checkout Guard 조건 변경 = WO + 구조 검토"; B2B-ORDER-CONTRACT §13-2 (strategy가 유일한 서비스 분기점) | **명시적 예외 기록 필요.** 이 WO를 근거로 F8 · B2B 계약 문서에 "Neture 약국 = term 기반 strategy"를 추가한다. 기존 3개 strategy는 바꾸지 않는다 |
| SPO.approval_status를 제품 승인 입력으로 전환 | Supplier Domain §4 (approval_status = OSA 파생) — FROZEN | 예외가 필요하다. 회피안: pharmacy 기본 공급을 OSA(kpa-society) approved 행으로 표현해 §4를 유지한다 (§7-a 대안) |
| OSA · OSP 의미 유지, 새 테이블은 하위 행 | Supplier Domain §3 (OSA는 Service Operator 소유), §9.1 (새 Framework 금지) | 단순 테이블과 service만 둔다. `DistributionEngine` 같은 추상화는 만들지 않는다 |
| SPO unique 유지 | CHECK 판정 A, F12 (설명은 master/SPD 기준) | 위반 없음 |
| 이벤트 unique 인덱스를 부분 인덱스로 변경 | F8 §4 Listing 정책 ("승인과 listing 생성 원자" 등) 인접. EVENT-OFFER-COMMON-DOMAIN §14 (테이블 분리 금지) | 테이블 분리가 없으므로 §14는 지킨다. 인덱스 변경 자체는 F8 표의 통제 항목이 아니지만, Listing 정책 인접이라 WO에 명시할 것을 권장한다 |
| PUBLIC 자동 확산(`autoExpandPublicProduct`) | F8 Tier1 "상품 승인 시 모든 활성 조직에 listing" — 3-3 A(pharmacy만) · 3-7(HUB 진열 없음)과 충돌 | 코드는 건드리지 않는다 (다른 서비스 보존). Neture 약국 흐름은 OPL 진열을 판정 근거로 쓰지 않고 term · 가입 상태로 직접 판정한다. 확산 정책을 바꿀 경우에만 F8 예외가 필요하다 |
| 모집 · 이벤트를 공통 "offer" 테이블로 통합 | Supplier Domain §6 ("공통 Program Framework · 상태머신 · table 금지") | **하지 않는다.** 각 원장을 유지하고 cart · 주문 쪽에서만 "선택한 제안 ID"로 통일 기록한다 |
| 모집 참여를 조직 단위로 변경 | 위반 없음 (§7 canonical 방향과 일치) | migration(컬럼과 unique 교체) → 사용자 승인 |
| `allowed_seller_ids` | Supplier Domain §4 ("살아 있는 축") | 삭제하지 않고 Neture 약국 흐름에서만 사용을 중단한다 |
| ProductMaster 변경 | F12 Freeze #6 | 변경 없음 (위반 없음) |

#### 사용자 승인 · 판단이 필요한 항목 (CLAUDE.md 중지 조건)
- 스키마 migration 4건: 신규 테이블, cart 컬럼, OPL unique 부분 인덱스, 모집 조직 컬럼과 unique.
- Frozen 예외 기록 2건: F8 Checkout Guard, Supplier Domain §4 (회피안을 택하면 1건).
- `quantity > 1000` 기존 검사의 유지 여부.
- per_store_limit을 사용자 기준에서 조직 기준으로 바꿀지 여부.
- 결함 후보 확인: PRIVATE offer APPROVED 불가, 모집 참여자 주문 불가 (§1-3, §4).

---

## C. 내 매장 · HUB · 콘텐츠 · 커뮤니티

조사 기준: worktree `D:/o4o-wt/neture-pharmacy-store-commerce-refactor-v1` (branch `wo/neture-pharmacy-store-commerce-refactor-v1`). READ-ONLY. 코드 · git · DB 변경 0.
경로 접두: `API=apps/api-server/src`, `WS=services/web-store/src`.

---

### 0. 결론 요약 (먼저 읽을 것)

1. **약국 「내 매장」 = `services/web-store` (store.neture.co.kr)**. 공통 `/store/*` + 서비스 업무 `/work/kpa-society/*` + 별도 **`/hub/*` (매장 HUB)** 3축. 약국 문맥의 serviceKey 는 `kpa-society` (= pharmacy.neture.co.kr, 세미프랜차이즈 서비스 — SUBDOMAIN-SEMANTICS §2 L32).
2. **결정적 충돌**: 현재 내 매장의 **모든 기본 기능**(사이니지 · QR · 태블릿 · 자체 콘텐츠 · 매장 정보)이 `isStoreOwner(...,'kpa')` = `service_memberships(kpa-society, active)` + `kpa:store_owner` role + 조직의 kpa-society 연결(`platform_store_slugs`/enrollment)로 게이트된다. 정본 의미상 kpa-society = **pharmacy 세미프랜차이즈**이므로, WO §3-1("세미프랜차이즈 미가입이어도 내 매장 이용") 과 정면 충돌. 기본 매장 게이트를 "Neture 기본 가입 승인 + 약국 조직 연결"로 바꾸고, kpa-society membership 은 pharmacy 세미프랜차이즈 상품 · 콘텐츠 · 커뮤니티 게이트로만 써야 한다 (단계 2 설계와 직결).
3. 상품 · 이벤트 · 모집 노출은 **API 판정이 일부 존재**하지만 축이 "서비스(kpa-society) membership + offer_service_approvals" 하나뿐이며 세미프랜차이즈 개념이 없다. 이벤트 목록(`/kpa/groupbuy`, `/groupbuy/enriched`)은 **optionalAuth 공개 · membership 필터 0**. Hub 콘텐츠(`/api/v1/hub/contents`)는 **무인증 공개 · serviceKey 를 query 로 받음**.
4. 커뮤니티: 참여 판정 = Catalog policy(`service_membership_any`) **AND** `community_memberships(status='active')` 승인(별도 가입 신청). WO §3-8("세미프랜차이즈 가입 승인 = 이용 가능, 별도 커뮤니티 가입 없음, 회원 데이터 복제 금지") 과 충돌. 판정 지점은 `API/middleware/community-access.middleware.ts:35-91` 한 곳이라 확장 지점이 명확하다.
5. HUB 제거는 **web-store 의 `/hub/*` 를 약국 문맥에서만** 대상으로 하고, 공급자/운영자 게시 화면 · `/api/v1/hub/contents`(F5 Stable) · `asset-copy-core`(F3 FROZEN) · KPA/KCos/PH 서비스 앱의 `/store-hub` 는 보존해야 한다. web-store `/hub` 는 **K-Cosmetics 매장 화면도 링크**하므로(spec 이 고정) 전면 삭제 불가.

---

### 1. 내 매장 앱 · Store HUB · 가져오기 흐름

#### 1-1. 약국 내 매장 앱 = web-store

- 앱 정체: `WS/config/workspace.ts:1-15` — "store.neture.co.kr 은 O4O 공통 Store Workspace 이며 서비스가 아니다", 1차 축 organizationId, serviceKey 는 enrollment 2차 축.
- 경로 상수 `WS/config/workspace.ts:25-39`: `/store`(내 매장) · `/work`(서비스 업무) · `/hub`(매장 HUB) · `/services` · `/settings` · `/select-store` · `/start-store`(사업자 가입).
- 최상위 nav `WS/config/workspace.ts:48-55`: 홈 / 내 매장 / 서비스 업무 / **매장 HUB** / 내 서비스 / 설정.
- 서비스 문맥: `WS/lib/serviceContext.ts:16-40` (`kpa-society→/api/v1/kpa`, `k-cosmetics→/api/v1/cosmetics`, `pharmacy-hub→/api/v1/pharmacy-hub`), 공통 문맥 우선순위 KPA→KCos→PH (`:39-48`), 문맥 없으면 `kpa-society` 기본(`:192-195`). 매장 선택은 헤더로 전달(`API/utils/store-organization.resolver.ts:351-362`).

**라우트** (`WS/App.tsx`)
| 축 | 경로 | 근거 |
|---|---|---|
| 내 매장 공통 | `/store` + `storeChildRoutes()` : info · execution · my-products · handled-products · commerce/local-products · marketing/product-descriptions · marketing/qr(+ai-description) · marketing/pop-v2 · commerce/tablet-displays · requests · library/contents · library/resources · content(+blog/pop/video/direct/:id/:snapshotId/edit) · marketing/signage/{playlist,videos,schedules,player} · members · analytics/marketing | App.tsx:170-229, 257 |
| 약국 지정 매장 | `/work/kpa-society/store/*` (같은 트리 재mount) | App.tsx:263-268 |
| 약국 서비스 업무 | `/work/kpa-society/`: commerce/products(B2B) · products/b2c · order-worktable · orders · seller-recruitments · recruitment-applications · online-sales/* · sales-channels/foreign-visitor/* ; `commerce/orderable` → `/hub/b2b` redirect | App.tsx:327-350 (333) |
| KCos | `/work/k-cosmetics/store/*`, `/work/k-cosmetics/*` | App.tsx:272-320, 352-358 |
| PH | `/work/pharmacy-hub/{products,cart,orders,payment}` | App.tsx:360-370 |
| **매장 HUB** | `/hub` index · b2b · event-offers · cart · multilingual-product-contents(+/my) · blog · pop · qr · video · signage · screen-set · content · supplier-library | App.tsx:374-389 |
| 옛 주소 | `/store-hub/*` → LegacyHubRedirect | App.tsx:392 |

**메뉴**: 내 매장 `WS/config/storeMenu.ts:17-64` (매장 제품 / 경영지원 / 실행 / 자료함 / 사이니지 / 분석 / 설정), 약국 서비스 업무 `:68-91` (O4O 제품 · 발주 작업대 · 발주 내역 · 판매자 모집 · 신청·승인 현황 · 온라인 판매 · 외국인 판매지원). HUB 메뉴 `WS/components/layouts/UnifiedHubLayout.tsx:23-42`.

#### 1-2. Store HUB / 매장 HUB 화면 현황

| 앱 | 경로 | 근거 | 성격 |
|---|---|---|---|
| web-store | `/hub/*` (위 표) | App.tsx:374-389 | 약국·KCos 공용 "매장 HUB" (Store Hub, SUBDOMAIN §3-1) |
| web-kpa-society | `/store-hub/*` (b2b · signage · event-offers · cart · content · blog · pop · qr · video · screen-set · multilingual · supplier-library), `/hub`→`/store-hub` | services/web-kpa-society/src/App.tsx:822-850 | 서비스 앱 내 HUB. handoff 대상 아님(§21-17·18), `VITE_UNIFIED_STORE_HANDOFF='false'` (deploy-web-services.yml:92) |
| web-k-cosmetics | `store-hub/*` (b2b · content · signage · blog · pop · qr · event-offers · cart) | services/web-k-cosmetics/src/App.tsx:703-724 | 동일 |
| web-pharmacy-hub | `/store-hub` index 만 | services/web-pharmacy-hub/src/App.tsx:679-681 | 홈 소개 |
| web-neture | `/workspace/hub` (HubPage) | services/web-neture/src/App.tsx:999, pages/hub/HubPage.tsx:1-14 | **공급자/관리자 Control Tower (hub-core)** — 매장 HUB 아님, 보존 |

공통 UI: `StoreHubTemplate`(@o4o/shared-space-ui) 소비처 = web-store, web-kpa-society, web-k-cosmetics, web-pharmacy-hub. `SupplyCatalogHub`/`createSupplyCatalogApi`(@o4o/store-ui-core) 소비처 = KPA/web-store HubB2BCatalogPage 등.

참고: 백엔드 `/{kpa|cosmetics}/store-hub/*` (`API/routes/o4o-store/controllers/store-hub.controller.ts` — overview · channels · slug · kpi-summary · live-signals · capabilities, mount `API/routes/kpa/kpa.routes.ts:395`, `cosmetics.routes.ts:147`)는 이름만 "store-hub" 일 뿐 **내 매장 대시보드/채널/slug API** 다. HUB 단계 제거 대상이 아니다.

#### 1-3. "HUB 에 진열 → 내 매장으로 가져오기" 흐름별 API · 테이블 · 소비처

| 흐름 | 프런트 (web-store) | API | 테이블 | 비고 |
|---|---|---|---|---|
| **B2B 상품 취급 신청** (HUB 카탈로그 → 내 매장 진열) | `/hub/b2b` HubB2BCatalogPage (`WS/pages/pharmacy/HubB2BCatalogPage.tsx:43-80`) → `createSupplyCatalogApi` (`packages/store-ui-core/src/components/supply-catalog/createSupplyCatalogApi.ts:7-65`) | `GET /api/v1/kpa/pharmacy/products/catalog`, `POST .../apply`, `DELETE .../by-offer/:offerId` (`API/routes/o4o-store/controllers/pharmacy-products.controller.ts:210, 380, 933`; mount kpa.routes.ts:416, cosmetics.routes.ts:155) | `supplier_product_offers` · `offer_service_approvals` · `product_approvals` · `organization_product_listings`(OPL) | **apply = "가져오기" 단계**. PUBLIC 은 OPL 즉시 생성(KPA 는 활성화, :441-452), SERVICE/PRIVATE 은 `product_approvals` 승인 대기. 이후 `/orderable` 은 **OPL 존재 행만** 주문 가능(:582-735) — 즉 현재 구조는 "HUB 진열 → 취급 신청 → OPL → 주문" |
| 이벤트·특가 | `/hub/event-offers` KpaEventOfferPage (`WS/pages/event-offer/KpaEventOfferPage.tsx:23`) → `/kpa/groupbuy/*` | `GET /api/v1/kpa/groupbuy`, `/enriched`, `/:id` (`API/routes/kpa/controllers/event-offer.controller.ts:34, 87, 108`), 주문 = `POST /api/v1/store/cart/:serviceKey/checkout-confirm` | OPL(service_key='kpa-groupbuy', 운영자 조직 소유) · `store_cart_items` · `checkout_orders` | 가져오기 없음(직접 장바구니) |
| 장바구니 | `/hub/cart` StoreCartPage | `/api/v1/store/cart/:serviceKey/*` (`API/routes/cart/store-cart.routes.ts:17-26`) | `store_cart_items` | HUB 메뉴 아래 있을 뿐 HUB 기능 아님 → 이동 대상 |
| 콘텐츠(CMS / KPA 콘텐츠) | `/hub/content` HubContentLibraryPage (`:27-31` cmsApi · assetSnapshotApi · contentHub) | 목록 `GET /api/v1/cms/contents`, `GET /api/v1/kpa/contents`(optionalAuth, kpa.routes.ts:1407-1418), 복사 `POST /api/v1/kpa/assets/copy` | `cms_contents` · `kpa_contents` → `o4o_asset_snapshots` + `kpa_store_contents` | `asset-copy-core` `createAssetCopyController` (`API/routes/o4o-store/controllers/asset-snapshot.controller.ts:52-106`, mount kpa.routes.ts:434). 허용 role `kpa:admin/operator/pharmacist/store_owner`, 신규 생성 가능 assetType = cms · content · signage 뿐(:93-99) |
| 사이니지 | `/hub/signage` HubSignageLibraryPage (`:29-30`) | `GET /api/v1/hub/contents?serviceKey&sourceDomain=signage-*`, 복사 `/kpa/assets/copy (assetType=signage)` | `signage_media` · `signage_playlists` → snapshot / `store_playlists` | |
| 블로그 · POP · QR · 동영상 | `/hub/{blog,pop,qr,video}` (각 `importOperatorBlog/Pop/Qr/Video`) | 목록 `/api/v1/hub/contents?sourceDomain=blog|pop|qr|video`, 가져오기 `POST /api/v1/kpa/stores/:slug/{blog,pop,qr,video}/staff/import` (예: `API/routes/o4o-store/controllers/qr.controller.ts:129`) | `store_blog_posts` · `store_pops` · `operator_qr_templates` 등 → 매장 소유 행 | asset-copy-core 밖의 직접 import endpoint |
| 태블릿 화면(Screen Set) | `/hub/screen-set` | `/hub/contents?sourceDomain=screen-set` + 사본 생성 | 운영자/공급자 screen set → 매장 독립 사본 | |
| 다국어 상품 콘텐츠 | `/hub/multilingual-product-contents(/my)` | `/kpa/pharmacy/products/listings`, local-products, MLC API | 매장 상품 연결 | |
| 공급자 콘텐츠 | `/hub/supplier-library` (`WS/pages/pharmacy/HubSupplierLibraryPage.tsx:14`) | `/api/v1/hub/contents?sourceDomain=supplier-library` | `neture_supplier_library_items (is_public=true)` (`API/modules/hub-content/hub-content.service.ts:207-237`) | 열람만(사본 없음) |

Hub 콘텐츠 API: `GET /api/v1/hub/contents` 무인증 공개, `serviceKey` 는 query 필수 (`API/bootstrap/register-routes.ts:1167-1172`, `API/modules/hub-content/hub-content.controller.ts:42-84`, 프런트 `WS/api/hubContent.ts:23-38` 는 토큰 없이 fetch).

---

### 2. 매장이 상품 · 이벤트 · 모집 · 콘텐츠를 보는 방식 — API 판정 여부

공통 게이트 `createRequireStoreOwner(dataSource,'kpa')` (`API/utils/store-owner.utils.ts:209~`, 판정 `isStoreOwner` `:125-200`):
1) `service_memberships(user, 'kpa-society', status='active')` (`:153-166`) → 2) `role_assignments` 에 `kpa:store_owner` (`:64-68`, `:168-172`) → 3) 조직 = `organization_members(owner/admin/manager)` ∩ kpa-society 연결 매장 1개 (`API/utils/store-organization.resolver.ts:20-45`; 2개 이상 ambiguous 차단). **메뉴가 아니라 API 에서 판정**하지만 축은 "kpa-society 서비스 membership" 하나다.

| 대상 | endpoint | 필터 | 판정 근거 |
|---|---|---|---|
| B2B 카탈로그 | `GET /kpa/pharmacy/products/catalog` | `spo.is_active · deleted_at IS NULL · supplier ACTIVE` + `distribution_type='PUBLIC' OR offer_service_approvals(service_key='kpa-society', approved)` + PRIVATE 은 `orgId = ANY(allowed_seller_ids)` | pharmacy-products.controller.ts:84-120 (게이트 SSOT), :210-300. 매핑 `kpa→kpa-society` :67-70 |
| 신청 | `POST .../apply` | 위와 동일 조건 재검증 `findApplicableOffer` | :138-175, :380-470 |
| 주문 가능 | `GET .../orderable?source=all|b2b|operator|event|seller-recruitment` | OPL(organization_id=매장) 활성 + offer/공급자 활성 + SERVICE 는 승인 유지 + 이벤트 행 기간·수량 | :560-735. **source 탭은 접근 판정 후 분류**(CTE 후 outer filter) — WO §3-7 의 "먼저 판정 후 탭" 패턴과 이미 일치 |
| 이벤트 | `GET /kpa/groupbuy`, `/enriched`, `/:id` | `opl.service_key='kpa-groupbuy'` + 기간/상태 | event-offer.controller.ts:34-120 (optionalAuth), event-offer.service.ts:191-325. **membership · 조직 · 대상 세미프랜차이즈 필터 0 — 비로그인도 조회** |
| 이벤트 주문 | `POST /api/v1/store/cart/:serviceKey/*` | `hasActiveServiceMembership(buyer, serviceKey)` (DB) | store-cart.routes.ts:101-124 |
| 판매자(취급매장) 모집 | `GET /kpa/store/seller-recruitments` | `service_id='kpa-society'`, `exposure_status='approved'`, `status='recruiting'` 고정 + `createRequireStoreOwner('kpa')` | `API/modules/neture/controllers/store-seller-recruitment-browse.controller.ts:1-55`, mount kpa.routes.ts:299. 신청은 `POST /api/v1/neture/seller-recruitment/applications` (`WS/pages/pharmacy/SellerRecruitmentsBrowsePage.tsx:67,104`) |
| Hub 콘텐츠 | `GET /api/v1/hub/contents` | `serviceKey`(query) 격리 + producer/visibility | **무인증**. F4 §5·§8-3 은 "serviceKey 는 URL 기준"이라 하지만 실제는 query param (드리프트, 보고만) |

요약: 세미프랜차이즈(복수) · 공급 제안 대상 · 약국별 가입 상태 개념이 API 어디에도 없다. 현재 "서비스 = 세미프랜차이즈 1개(kpa-society)" 로 하드코딩된 상태(`'kpa-society'` 상수 고정 3곳 이상).

---

### 3. 매장 콘텐츠 출처 · 접근 검사

| 출처 | 원장 | 매장 측 API | 접근 검사 |
|---|---|---|---|
| 약국 자체(직접 작성) | `kpa_store_contents` (source direct/store), `store_execution_assets`, `store_blog_posts` 등 | `/kpa/store-contents*` (`API/routes/o4o-store/controllers/store-content.controller.ts` — `isStoreOwner(...,'kpa')` 8곳: :178, :393, :516, :668, :740, :792 등), `/kpa/store/assets` (`WS/api/storeExecutionAssets.ts:81-131`), `/kpa/store-library/*` (kpa.routes.ts:444) | kpa:store_owner + kpa-society membership |
| 운영자 HUB 게시 | `cms_contents`(authorRole admin/service_admin) · signage(hq) · `store_blog_posts`(operator) · `store_pops` · `operator_qr_templates` · screen set | `/api/v1/hub/contents` 목록 → copy/import | 목록 무인증 · 복사 시 store owner |
| 공급자 | `neture_supplier_library_items(is_public)` · `cms_contents(authorRole='supplier')` · signage(supplier) | `/hub/contents?sourceDomain=supplier-library` | 무인증, `storeWorkspaceEnabled` 서비스면 전체 공개(hub-content.service.ts:207-222). 공급자→특정 세미프랜차이즈 범위 개념 없음 |
| 커뮤니티 | `kpa_contents`(content_type/sub_type) · `cms_contents(authorRole=community)` | `/kpa/contents` (optionalAuth 목록), copy assetType=content | 목록 공개, 복사는 asset-copy 허용 role |

출처 표기 정본: STORE-MENU-CANONICAL-TREE §5.1 (`operator_hub`/`community_snapshot`/`store_direct`/`library_self`), ROLE-WORKSPACE §6 (3+1 유입 경로 · Store 소유 독립 사본).

---

### 4. 커뮤니티 — 현재 게이트와 세미프랜차이즈 연결 지점

- Catalog SSOT `API/config/community-catalog.ts:59-92`: `pharmacy`(policy `service_membership_any ['kpa-society','pharmacy-hub']`, forumStorageCodes 동일), `cosmetics`, `o4o-general`(authenticated, 저장코드 `neture`). policy 는 2종만(`:30-32`, ROLE-WORKSPACE §5 "두 가지뿐").
- 판정 함수 `API/utils/community-access.resolver.ts:59-94` (`resolveCommunityAccess`, JWT/freshened `memberships` 만 읽음, 순수 함수).
- **실제 게이트** `API/middleware/community-access.middleware.ts:35-71`: ① catalog policy ② `hasApprovedCommunityMembership` = `community_memberships cm JOIN communities c ON c.slug=communityKey WHERE cm.status='active'` (`:80-91`) — **모든 커뮤니티가 별도 가입 승인형**(행 없으면 fail-closed).
- 소비처: `API/routes/forum/service-forum.routes.ts:99` (communityKey 있으면 guard), `API/routes/kpa/kpa.routes.ts:670` (`requireCommunityAccess('pharmacy')`), pharmacy-hub.routes.ts:601, cosmetics.routes.ts:484. 목록/판정 읽기 `GET /api/v1/communities`, `/:key/access` (`API/routes/communities.routes.ts:1-117`, mount register-routes.ts:1000-1007).
- 커뮤니티 개체 스키마 `API/database/migrations/1790400000000-CreateCommunityDomain.ts:26-82`: `communities(slug, status active|suspended)`, `community_memberships(community_id,user_id,role operator|member,status pending|active|rejected|withdrawn)`, `community_creation_requests`. 운영 = 개체 operator / `community:admin`.
- web-store 에는 커뮤니티 진입이 없다(grep 0).

**세미프랜차이즈 가입 상태를 복제 없이 직접 게이트로 쓸 수 있는가 — 가능.**
- 판정 단일 지점이 이미 있으므로, catalog 에 세미프랜차이즈 커뮤니티를 등록하고 policy 를 "세미프랜차이즈 가입(active) 직접 판정" 으로 두면 된다. 구체 지점:
  1. `community-catalog.ts` — 세미프랜차이즈별 Community 정의(또는 세미프랜차이즈 테이블에서 파생) + `forumStorageCodes`(forum 원장 파티션 코드). 새 policy mode (예: `franchise_membership`) 추가 — ROLE-WORKSPACE §5 "policy 2종" 문장 정비 필요(정본 변경, Frozen 아님).
  2. `community-access.middleware.ts:54-67` — 이 policy 의 Community 는 ② `community_memberships` 승인 검사를 **건너뛰고** 세미프랜차이즈 가입 테이블(단계 2 신설, status=approved)을 조직(약국) ↔ 사용자(organization_members) 기준으로 조회. 정지/종료 = 403. `community_memberships` 행을 만들지 않는다(복제 0).
  3. `community-access.resolver.ts:59-83` 은 순수 함수(JWT memberships)라 DB 조회가 필요한 세미프랜차이즈 판정은 middleware(비동기) 또는 별도 async resolver 로 둔다. `GET /communities` 의 canParticipate 도 같은 async 판정을 써야 정합.
  4. pharmacy 세미프랜차이즈 = 기존 `pharmacy` 약사 커뮤니티와 동일시하면 안 됨: 현재 `pharmacy` 커뮤니티는 KPA 약사 개인(kpa-society/pharmacy-hub membership + 커뮤니티 가입) 커뮤니티이고, WO §3-8 의 "일반 커뮤니티 독립 가입 정책 유지" 대상이다. 세미프랜차이즈 커뮤니티는 별도 communityKey 로 둔다.
- 주의: `kpa-society` 커뮤니티 정책 · `pharmacy` 원장 코드 · KPA/PH forum 소비처는 보존(§6-3).

---

### 5. 기본 매장 기능이 세미프랜차이즈 가입을 요구하지 않는가 — **현재는 요구한다 (충돌)**

| 기능 | 백엔드 게이트 | 근거 |
|---|---|---|
| 사이니지 플레이리스트 | `resolveStoreAccess(..., storeOwnerServiceKey)` → `isStoreOwner` | `API/routes/o4o-store/controllers/store-playlist.controller.ts:27, 105, 137`; `API/utils/store-owner.utils.ts:338-350` |
| QR (staff) | `kpaStoreOwnerOwnsStore` | qr.controller.ts:50, 111-129 |
| QR 랜딩 | `createRequireStoreOwner(serviceKey)` | store-qr-landing.controller.ts:32, 150-154 |
| 자체 콘텐츠 | `isStoreOwner(...,'kpa')` | store-content.controller.ts:178 외 |
| 매장 정보·설정·분석·실행자산·POP v2·채널·상품 라이브러리 | `createRequireStoreOwner` 각 1회 | o4o-store/controllers/{pharmacy-info, pharmacy-store-config, store-analytics, store-execution-assets, store-pop-v2, store-channel-products, store-product-library, store-library(-feed), store-asset-control, multilingual-product-content}.controller.ts |

모두 `service_memberships(kpa-society active)` 필수(store-owner.utils.ts:153-166). SUBDOMAIN-SEMANTICS §2 L32 · §4 L97 에 따르면 kpa-society = pharmacy.neture.co.kr 세미프랜차이즈 서비스이므로, **현재 "pharmacy 세미프랜차이즈 가입 = 내 매장 이용 자격"** 이다. 태블릿 공개 화면(`API/routes/platform/store-public/store-public-tablet.handler.ts`)은 공개 경로라 별개.
→ 단계 2/3 에서 "Neture 기본 약국 가입 승인 + 약국 조직의 하나의 내 매장" 을 store 기본 게이트로 분리하고, `kpa-society` membership 은 pharmacy 세미프랜차이즈 가입(상품 · 콘텐츠 · 커뮤니티) 축으로 재배치해야 함. 이 게이트는 `createRequireStoreOwner`/`isStoreOwner` 공통 유틸이라 **KCos · PH · KPA 서비스 앱 소비처 전부 영향** — 서비스별 파라미터(`'kpa'`) 경로에서만 바꾸거나 새 resolver 를 약국 문맥에만 주입하는 방식 필요(공통 모듈 변경 프로토콜 대상).

---

### 6. 제안

#### 6-1. 제거 (매장 이용자의 HUB 단계만, 약국 문맥)
- web-store: 루트 nav `store-hub` 항목(`WS/config/workspace.ts:52`), HomePage 링크(`WS/pages/HomePage.tsx:19`), `/hub` 아래 **약국용** 진입: b2b(카탈로그 → apply), blog/pop/qr/video/content/screen-set "가져가기" 진열 화면, StoreHubPage/LatestFeed. `/work/kpa-society/commerce/orderable → /hub/b2b` redirect(App.tsx:333) 정리. 약국 화면 내 `/hub/*` 링크(PharmacyB2BPage.tsx:426, PharmacySellPage.tsx:82/276, PharmacyPopPage.tsx:332/516, PharmacyVideoPage.tsx:320/479, StoreChannelsPage.tsx:220/1058/1099, KpaEventOfferPage.tsx:282/436) 재지정.
- 백엔드: 약국 문맥에서 "apply → OPL 생성" 을 주문 전제에서 제거(WO §3-9 "B2B 주문 전에 취급제품 등록 강제 안 함"). `POST /pharmacy/products/apply` · `product_approvals` 경로는 **KCos 가 같은 controller 를 사용**(cosmetics.routes.ts:155)하므로 삭제 금지 — 약국 문맥 소비만 끊는다.
- 유지(삭제 금지): `/hub/cart`·`/hub/event-offers` 의 기능 자체(이동), K-Cosmetics 가 링크하는 `/hub/signage` · `/hub/b2b`(spec `API/__tests__/store-service-scoped-owner-entry.spec.ts:165-171` 이 KCos 매장 페이지의 `/hub/*` 링크를 고정) → web-store `/hub` 라우트는 KCos 문맥용으로 남기거나 KCos 링크 대체 후 spec 갱신 필요.

#### 6-2. 이동 · 링크
- 장바구니 · 이벤트 · B2B 상품 → `/work/kpa-society/commerce/*` 또는 내 매장 "상품" 단일 화면(탭: 전체 / pharmacy 기본 공급 / 세미프랜차이즈별 / 이벤트 / 모집 참여). 주문은 선택 제안 ID 로(단계 4).
- 콘텐츠: "가져가기" 진열 화면을 없애고, 내 매장 자료함(`/store/library/contents`, `/store/content`)에 **접근 가능 콘텐츠 탭**(자체 / 커뮤니티 / 가입 세미프랜차이즈 / 공급자)을 두고 "내 매장에서 편집용 사본 만들기" 버튼으로 기존 `POST /kpa/assets/copy` · `/stores/:slug/*/staff/import` 를 그대로 호출(출처 · 사본 원칙 유지 — STORE-MENU §4.2, ROLE-WORKSPACE §6). 사이니지 콘텐츠는 `/store/marketing/signage/*` 에서 직접 선택.
- 커뮤니티: 내 매장 홈/사이드바에 "가입 세미프랜차이즈 커뮤니티" 링크(접근 판정은 서버).

#### 6-3. 최소 "접근 가능 항목" API 설계 (약국 문맥)
```
GET /api/v1/kpa/store/accessible-items?type=product|event|recruitment|content&source=all|pharmacy|franchise:<id>|supplier|community|own&search=&page=
GET /api/v1/kpa/store/accessible-items/:type/:id
```
- 1단계(서버): 매장 org = 기본 게이트(신규 Neture 기본 가입 approved + 약국 조직 1:1 매장). 
- 2단계: `accessibleFranchiseIds = 세미프랜차이즈 가입(status='approved') of org` — 단일 SQL 조각(SSOT 함수, catalog 의 `buildServiceApprovalGateSql` 패턴 재사용)으로 **list / count / search / detail / cart add / checkout** 모두 같은 조건 적용:
  - 제품(제안): `offer.target = pharmacy(기본, 공급처 미지정)` → pharmacy 가입 approved 필요 / `target = franchise X` → X 운영자 승인 AND X 가입 approved / `target = 개별 약국` → 해당 약국 AND 해당 경로 가입 approved.
  - 이벤트: 대상 세미프랜차이즈 운영자 승인 + 가입 approved (현 `/groupbuy` 공개 목록은 약국 문맥에서 사용 중지 또는 같은 게이트 적용).
  - 모집: 모집 대상 경로 가입 approved + 승인된 참여 약국은 조건 주문 가능.
  - 콘텐츠: own(조직) · 일반 커뮤니티(기존 정책) · 가입 세미프랜차이즈 · 공급자(공개 또는 대상 세미프랜차이즈).
- 3단계: `source` 탭은 접근 집합 산출 **후** outer filter (현 `/orderable` CTE 구조 그대로). 미가입/정지/종료 항목은 404(존재 비노출, 현 `OFFER_NOT_AVAILABLE` 관례).
- 같은 게이트를 detail · `POST /store/cart/:serviceKey/items` · checkout 에서도 재검증(메뉴 숨김 금지).
- 범용 권한 엔진 · 업종 분기 없이 약국 마운트 1곳에만.

#### 6-4. Frozen / Stable 영향
- **F3 STORE-LAYER (FROZEN)**: `asset-copy-core`·`hub-core`·`store-ui-core` Public API · 의존 방향 · "서비스별 조건 분기 추가" 금지(STORE-LAYER-ARCHITECTURE.md:302-317). → web-store 라우트/메뉴 제거와 기존 copy API 재호출은 영향 없음. `SupplyCatalogHub`/`StoreHubTemplate` 에 약국 분기를 넣으면 위반 → 앱 로컬에서 처리.
- **F4 PLATFORM-CONTENT-POLICY / F5 CONTENT-STABLE**: `GET /api/v1/hub/contents` 계약 · HubProducer/Visibility/SourceDomain · serviceKey 격리(CONTENT-STABLE §4-A~D). 세미프랜차이즈 범위 콘텐츠를 이 API 에 넣으려면 WO 필요 → 대신 약국 accessible-items API 에서 원장을 직접 조회하는 편이 안전. 이 API 는 KPA/KCos/PH store-hub 와 web-store LatestFeed 가 계속 소비.
- ROLE-WORKSPACE §5 (policy 2종 · pharmacy=kpa-society OR pharmacy-hub), §6 (Store Hub → My Store 경로), STORE-MENU-CANONICAL-TREE §1·§3·§4 ("HUB 항목 축 = 내 매장 메뉴 축", HUB 진열→가져가기 표준 흐름), SUBDOMAIN-SEMANTICS §3-1 (Store Hub = store.neture.co.kr/hub) 은 WO §3-7·§3-8 과 충돌 → 단계 1-8 / 6-3 에서 정본 정비 필요 (Frozen 아님).
- o4o-common-structure: forum/lms/signage 공통 구조, serviceKey 격리 — 세미프랜차이즈 커뮤니티 forum 원장은 `forum_category_requests.service_code` 파티션 코드를 새로 할당(adapter)하되 Forum Core 무수정.

#### 6-5. 보존해야 할 타 서비스 소비처
- KPA(web-kpa-society): `/store-hub/*` 전체(App.tsx:826-850), `/kpa/pharmacy/products/*`, `/kpa/assets`, `/kpa/groupbuy`(운영자 `/groupbuy-admin` kpa.routes.ts:281 포함), `/kpa/store-hub/*`, `requireCommunityAccess('pharmacy')`.
- K-Cosmetics: web-k-cosmetics `store-hub/*`, web-store `/work/k-cosmetics/*` 및 `/hub/signage`·`/hub/b2b` 링크, `/cosmetics/pharmacy/products`(apply → `product_approvals`), `/cosmetics/assets`, cosmetics 커뮤니티.
- PharmacyHub: web-pharmacy-hub `/store-hub`, `/work/pharmacy-hub/*`, `pharmacy` 커뮤니티 forumStorageCodes.
- Neture: `/workspace/hub`(공급자/관리자), 공급자 자료 게시 · 운영자 HUB 게시 화면(operator-blog/pop/qr/video/screen-set controllers), seller-recruitment 운영자/공급자 화면.
- 공통 유틸: `createRequireStoreOwner`/`isStoreOwner`/`resolveStoreAccess` (store-owner.utils.ts) — 다수 controller · 3 서비스 공용.

---

### 7. 부수 발견 (범위 밖 · 보고만)
- `/api/v1/hub/contents` 의 serviceKey 가 query param — F4 §8-3 "serviceKey 는 URL 기준" 과 표현 불일치(문서 드리프트 후보).
- 이벤트 목록 `/kpa/groupbuy`·`/enriched` 비로그인 공개 — 세미프랜차이즈 전용 이벤트 도입 시 그대로 두면 WO §3-7 위반.
- `asset-snapshot.controller.ts` allowedAssetTypes 에 blog/pop/qr 는 placeholder(404).

문서 정합: 발견 5건(ROLE-WORKSPACE §5·§6, STORE-MENU-CANONICAL-TREE §1·§3·§4, SUBDOMAIN-SEMANTICS §3-1, F4 §8-3 표현) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건(본 WO 단계 1-8·6-3 범위에서 정비 권고).

---

## D. 장바구니 · 주문 · 결제 · 공급자 주문 처리

- 기준: worktree `D:/o4o-wt/neture-pharmacy-store-commerce-refactor-v1` @ `7f09a7a71` (READ-ONLY, DB/네트워크 미사용)
- 경로 접두: `api/` = `apps/api-server/src/`, `pc/` = `packages/payment-core/src/`, `web-*` = `services/web-*/src/`
- 약국 서비스 식별: `pharmacy.neture.co.kr` = serviceKey **`kpa-society`** (`docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md:21,32,97`). 이벤트 축은 `kpa-groupbuy`, 호환 축 `pharmacy-hub`.

---

### 1. Cart → Order

#### 1-1. `store_cart_items` 스키마 — `api/entities/cart/StoreCartItem.entity.ts`
| 컬럼 | 줄 | 비고 |
|---|---|---|
| buyer_id (uuid) | 46 | cart 소유자 |
| organization_id (uuid null) | 50 | **클라이언트 값(hint)** — 권위 아님 |
| service_key varchar(50) | 54 | 경로 파라미터에서만 (`api/routes/cart/store-cart.routes.ts:101-124`, active membership 필수 115) |
| source_type | 58 | regular/operator_approved/b2b/event_offer/seller_recruitment |
| supplier_id varchar | 62 | NetureSupplier.id |
| supplier_product_offer_id uuid | 66 | **SPO.id — 현재 "제안" 앵커** |
| organization_product_listing_id / event_offer_id | 70 / 74 | 이벤트 오퍼(OPL) |
| product_master_id | 78 | 표시용 |
| quantity int | 84 | |
| pricing_source | 88 | regular / event_offer |
| price_snapshot int | 92 | **표시용, 신뢰 안 함** |

- 담기: `api/services/cart/store-cart.service.ts:180-251` — priceSnapshot 클라이언트 값 그대로 저장(195-198), organizationId 는 `isBuyerOrganizationAllowed` 로 검증(217-233), 의약품 차단(204-210). **제안 ID 컬럼 없음**.
- 현재 "제안" = `supplier_product_offers` 1행. `uq_supplier_product_offers_master_supplier UNIQUE(master_id, supplier_id)` (`api/database/bootstrap/canonical-schema-baseline.ts:5368`, 엔티티 주석 `modules/neture/entities/SupplierProductOffer.entity.ts:5` "공급자별 1개의 Offer만"). 서비스별 가격은 `offer_service_prices UNIQUE(offer_id, service_key)` (baseline:5134) → **동일 공급자·동일 제품·동일 서비스에 복수 가격/제안 불가**.

#### 1-2. 가격 확정 (서버) — B2B 축
- `api/services/cart/b2b-checkout-confirm.core.ts`
  - cart 조회 buyerId+serviceKey (224-230), 조직 서버 확정 `resolveOrganization` (237, 476-536)
  - offer 서버 재조회 SQL `buildOfferQuery` (176-201): `offer_service_prices.unit_price(service_key=$2)` → 없으면 `price_general` (193-195, 335-336)
  - 노출 gate `strategy.gate` (315-323) — `api/services/cart/offer-exposure-strategy.ts` approval(kpa-society/k-cosmetics: `offer_service_approvals.approval_status='approved'` 121-145) / optin(pharmacy-hub 155-168) / neture(176-196)
  - 수량 1..1000 (329-332) ← WO §4 "추가하지 않음" 항목이 **이미 존재**함(보고만)
  - 재고 가용 검사만 (342-351) — **예약 없음**
  - 공급자별 grouping (363-374), 그룹 내 1건 실패 시 그룹 전체 보류(poisoned)
  - `checkoutService.createOrder()` 호출 (422-430). line item `productId = offer.id`(SPO id) — 공급자 스코프 join 의 전제 (409-413)
- adapter: Neture `services/cart/neture-b2b-cart-checkout.service.ts:84-143` (source `neture_b2b_checkout`, validate-only, `pg_` 접두), 승인축(kpa-society) `services/cart/store-b2b-cart-checkout.service.ts:41-103` (source `store_b2b_cart`, organizationPolicy `required` 44), PH `services/cart/pharmacy-hub-cart-checkout.service.ts:66-128` (source `pharmacy_hub_cart`, org unused).
- 라우팅: `POST /store/cart/:serviceKey/checkout-confirm-b2b` → 승인축이면 StoreB2B, 아니면 Neture (`routes/cart/store-cart.routes.ts:258-280`). event_offer 는 `checkout-confirm` (230-252).
- 이벤트 축: `services/cart/event-offer-cart-checkout.service.ts:108-330` — 단가는 `loadEventOfferContext` 서버값(`routes/kpa/services/event-offer.service.ts:696`), 그룹키 (supplierId, organizationId) (172-180), createOrder metadata `source='store_cart_checkout'`, `serviceKey=eventServiceKey(kpa-groupbuy)` (260-275), **paymentGroupId 없음**.

#### 1-3. `checkoutService.createOrder()` — `api/services/checkout.service.ts:159-216`
- 입력 `CreateOrderDto` (53-74): buyerId, sellerId, supplierId, sellerOrganizationId?, items[{productId, productName, quantity, unitPrice, subtotal, metadata}], shippingAddress?, metadata, shippingPolicy?, shippingFeeSnapshot?
- 의약품 최종 차단 (164), subtotal=Σitem.subtotal (168) — **item 금액을 재계산하지 않고 호출자 값을 신뢰**(호출자가 서버 확정값을 넣어야 함), status=CREATED/paymentStatus=PENDING (191-192)
- orderNumber `ORD-YYYYMMDD-NNNN` 난수 4자리 (131-138) — unique index 충돌 시 생성 실패 가능(소)
- **B2B Core 는 shippingAddress 를 넘기지 않는다** (core 422-430) → B2B 주문 배송지 null (아래 2-3)

#### 1-4. `checkout_orders` 스키마 — `api/entities/checkout/CheckoutOrder.entity.ts`
id, orderNumber(unique 62-64), buyerId(69-71), sellerId varchar(76), supplierId varchar(82-84, **주문=단일 공급자**), sellerOrganizationId uuid(90-92), subtotal/shippingFee/discount/totalAmount(100-119), status enum created|pending_payment|paid|refunded|cancelled(24-30), paymentStatus pending|paid|failed|refunded(35-40), paymentMethod, shippingAddress jsonb(152), **items jsonb(158) — 별도 order item 테이블 없음**, metadata jsonb(184), paidAt/refundedAt/cancelledAt.
- **`service_key` 컬럼 없음** — 서비스 축은 `metadata->>'serviceKey'` (`modules/neture/constants/fulfillment-service-scope.ts:36-44`).
- `checkout_payments` (`entities/checkout/CheckoutPayment.entity.ts`) 는 존재하나 B2B 결제는 쓰지 않음(→4-7).

#### 1-5. `neture_orders` (공급자 fulfillment 원장) 생성 — bridge
- `api/services/neture/checkout-fulfillment-bridge.service.ts:100-220`
  - source registry `BRIDGE_SOURCES` (50-65): neture_b2b_checkout / pharmacy_hub_cart / store_b2b_cart / store_cart_checkout
  - paid 가드 (126-128), 멱등 = `SELECT ... WHERE metadata->>'checkoutOrderId'=$1` 선조회 (131-137) — **unique 제약 없음 → 동시 실행 시 중복 생성 가능**(baseline 에 해당 인덱스 없음)
  - neture_order status=PAID, **`service_key = metadata.serviceKey || 'neture'`** (171), metadata.checkoutOrderId/paymentGroupId (172-186)
  - 아이템 `neture.neture_order_items` productId=SPO id (190-201)
  - **buyer 조직(sellerOrganizationId)·약국명 미복사**, shipping 은 null 승계 (145, 164-166)
- 엔티티 `routes/neture/entities/neture-order.entity.ts` — service_key default 'neture'(169), 조직 컬럼 없음.
- 레거시 직접 주문 `POST /neture/seller/orders` 는 410 은퇴 (`modules/neture/controllers/seller.controller.ts:326-355`).

---

### 2. 공급자 측

#### 2-1. 엔드포인트 (`modules/neture/neture.routes.ts:86,93`)
| 경로 | 위치 | 서비스 필터 |
|---|---|---|
| GET /neture/supplier/orders/kpi | `controllers/supplier-order.controller.ts:57` → `services/supplier-order.service.ts:32-52` | **'neture' 고정** (43-44) |
| GET /neture/supplier/orders | ctrl:69 → svc `listOrders` 54-108 | **'neture' 고정** (60, 66) |
| GET /neture/supplier/orders/unified | ctrl:85 → `services/supplier-unified-order.service.ts` | **neture_orders 'neture' 고정** (117-120) · **checkout_orders metadata.serviceKey 'neture' 고정** (173, 186) |
| GET /neture/supplier/orders/:id | ctrl:101-129 | 필터 없음 — `validateOwnership` 만 (svc 110-118) |
| PATCH /neture/supplier/orders/:id/status | ctrl:132-190 | 필터 없음, transitions created/paid→preparing→shipped→delivered (svc 10-15), checkout-origin readiness 가드 (svc 178-199) |
| POST/GET /neture/supplier/orders/:orderId/shipment | ctrl:193-265 | 필터 없음 |
| GET /neture/supplier/orders/summary | ctrl:38 (NetureService) | — |
| /neture/supplier/services/:serviceKey/orders(…/accept,/ship) | `controllers/supplier-service-delivery.controller.ts:320-480` | `:serviceKey` 경로값, 단 **opt-in 키(pharmacy-hub)만 허용** — kpa-society 진입 불가 |
| 공급자 비활성 차단 집계 | `services/supplier.service.ts:557-585, 659-675` | 'neture' 고정 |
| 정산 집계 | `services/neture-settlement.service.ts:160-190` | 'neture' 고정 |

#### 2-2. "service_key='neture' 고정" 결함 — 확정
- 정확한 조건: `COALESCE(o.service_key, 'neture') = $2` with `$2 = NETURE_FULFILLMENT_SERVICE_KEY('neture')` (`fulfillment-service-scope.ts:19,32-34`), checkout 쪽 `COALESCE(co.metadata->>'serviceKey','neture') = $2` (42-44).
- 약국(kpa-society) B2B 주문: StoreB2B adapter 가 metadata.serviceKey=`kpa-society` (store-b2b 89) → bridge 가 neture_orders.service_key=`kpa-society` (bridge 171) → 공급자 목록·KPI·unified·정산에서 **전부 탈락**. 이벤트 주문은 `kpa-groupbuy` 로 동일하게 탈락. 반면 상세·상태변경·배송은 서비스 필터가 없어 **ID 를 알면 처리 가능 = 목록과 처리 경로 불일치**.
- 올바른 필터: 공급자 격리는 이미 `spo.supplier_id = $1` (item join) 이 담당한다. 서비스 경계는 "이 공급자가 공급하는 서비스 집합"으로 바꿔야 함 — 최소안: `COALESCE(o.service_key,'neture') = ANY($2::text[])`, `$2 = ['neture','kpa-society','kpa-groupbuy','pharmacy-hub']`(SSOT 상수 1곳, fulfillment-service-scope.ts) + 응답에 `o.service_key` 반환 + 선택 query param 으로 좁히기. 정산(`neture-settlement.service.ts:187`)은 동일 상수를 쓰되 정산 정책 판단 후 별도 적용(보고 사항).

#### 2-3. 공급자 격리 · 구매 약국 식별
- 격리: `neture_order_items.product_id::uuid = spo.id AND spo.supplier_id = $1` (svc 41-42, 79-80, 112-115). 상세 `legacyNetureService.getOrder` 는 주문 전체 item 반환하나 bridge 주문은 공급자당 1주문이라 실질 누출 없음.
- 공급자 식별: `createRequireLinkedSupplier` / `createRequireActiveSupplier` → `req.supplierId`.
- **구매 약국 식별 결함**: neture_orders 행은 `orderer_name`(shipping.recipient_name) 만 노출 (unified 96-148). B2B 주문은 shippingAddress 를 받지 않으므로(1-3) **약국명·배송지 모두 null**. 조직명은 bridge 전 checkout_orders 경로에서만 `LEFT JOIN organizations ON co."sellerOrganizationId"` (unified 172-176)로 표시됨. 배송 처리에 필요한 수령지 정보 경로가 B2B 축에 없음 → 단계 4-5 에 포함 필요.

---

### 3. 재고 · 이벤트 한도 (보존 대상) — 실제 호출 지점

| 기능 | 함수/SQL | 위치 | 현재 호출 경로 |
|---|---|---|---|
| SPO 가용 검사 | `stock - reserved >= qty` | `b2b-checkout-confirm.core.ts:342-351` | B2B confirm (live) |
| SPO 예약 (+reserved) | UPDATE reserved_quantity+ | `routes/neture/services/neture.service.ts:526-537` (createOrder 338-543) | **은퇴한 레거시 주문에서만** (410). live B2B 경로는 예약하지 않음 |
| SPO 취소 해제 (−reserved) | `updateOrderStatus` CANCELLED | neture.service.ts:626-643 | 레거시 상태 변경 경로 |
| SPO 배송완료 차감 (stock−, reserved−) | `updateOrderStatus` DELIVERED | neture.service.ts:646-660 | 공급자 PATCH status=delivered (`supplier-order.controller.ts:180`) — bridge 주문에도 적용. reserved 는 GREATEST(…,0) 로 클램프 |
| 이벤트 per_order_limit · total_quantity · per_store_limit · 원자 차감 | `reserveEventOfferListing` | `routes/kpa/services/event-offer.service.ts:760-833` | event cart confirm (`event-offer-cart-checkout.service.ts:203-228`), participate (619-690) |
| 이벤트 보상 복원 | `incrementListingQuantity` | event-offer.service.ts:835-848 | createOrder 실패 보상 (cart 310-313, participate 686), **결제 전 취소** (`services/checkout/store-order-cancel.service.ts:195-213`, KPA `routes/kpa/controllers/kpa-checkout.controller.ts:36`, KCos `cosmetics-order.controller.ts:457`) |
| PH 결제 후 그룹 취소 | SQL 직접 UPDATE | `controllers/pharmacy-hub/PharmacyHubPaymentController.ts:364-382` | 재고/이벤트 복원 없음(PH 는 B2B offer 만이라 예약 없음 → 일관) |

추가 발견(보고만, 보존 대상의 정합 문제):
- **B2B 경로 예약 부재** → 주문~배송 사이 동시 주문 과판매 가능. "기존 예약/차감/복원 보존" 시 새 제안 주문은 최소한 현 동작(검사 + 배송완료 차감)을 유지해야 하며, 예약을 다시 붙일지는 별도 판단.
- **per_store_limit 집계 누락 의심**: `STORE_ORDERED_QTY_SQL` (event-offer.service.ts:127-142)은 `elem->'metadata'->>'productListingId'` 를 세는데, cart checkout line metadata 는 `eventOfferId` / `organizationProductListingId` 만 기록 (event-offer-cart-checkout 241-248) → cart 경로 주문이 누적 한도에 **잡히지 않음**. 연결 시 키 정합 필요(신규 한도 아님, 기존 한도의 정상 연결).
- 결제 실패 시 이벤트 수량 복원 없음 (handler 는 paymentStatus=FAILED 만, `StoreB2bCheckoutPaymentEventHandler.ts:164-196`).

---

### 4. 결제

#### 4-1. 구성
- PaymentCore: `pc/services/PaymentCoreService.ts` prepare(49-88) / confirm(107-195) / cancel(203-226) / refund(235-265). 상태기계 `pc/services/PaymentStateMachine.ts` CREATED→CONFIRMING→PAID→REFUNDED, FAILED/CANCELLED 종결.
- 저장소: **`o4o_payments`** (`api/entities/payment/PlatformPayment.entity.ts:21`, `services/payment/adapters/TypeORMPaymentRepository.ts`). unique: transactionId, paymentKey(partial) (baseline:5598,5601). orderId 는 일반 인덱스.
- PG: `services/payment/adapters/TossPaymentProviderAdapter.ts` — 단일 env 키 (27-28).
- 컨트롤러 3벌(같은 계약 복붙):
  - Neture B2B `routes/neture/controllers/neture-b2b-payment.controller.ts` (sourceService `neture-b2b`)
  - 승인축/이벤트 `services/payment/b2b/b2b-payment-controller.factory.ts` (sourceService `store-b2b`, KPA mount `routes/kpa/kpa.routes.ts:2227-2230`, allowedServiceKeys `['kpa-society','kpa-groupbuy']` — `store-b2b-payment.constants.ts`)
  - PH `controllers/pharmacy-hub/PharmacyHubPaymentController.ts` (sourceService `pharmacy-hub`)
- 완료 처리: in-process EventEmitter (`adapters/EventHubPaymentPublisher.ts:16-32`) → handler (`services/payment/b2b/StoreB2bCheckoutPaymentEventHandler.ts`, `services/neture/NetureB2bCheckoutPaymentEventHandler.ts`, `services/pharmacy-hub/PharmacyHubPaymentEventHandler.ts`, 초기화 `bootstrap/register-routes.ts:719,823-836`) → checkout_order paid → bridge → 공급자 노출.

#### 4-2. 결함 후보 판정
**(a) payment ↔ order(group) 대응 누락 — 확정**
- confirm 은 클라이언트가 보낸 `paymentId` 로 payment 를 찾고(`PaymentCoreService.ts:113`), 그 payment 의 `orderId` 가 요청한 order/paymentGroupId 와 같은지 **검사하지 않는다**. 이벤트 orderId 는 호출자 인자 `internalOrderId` 우선 (126).
- factory group confirm: 소유 group 존재만 확인 후 `confirm(paymentId, paymentKey, paymentGroupId, paymentGroupId)` (`b2b-payment-controller.factory.ts:286-299`). Neture 는 isNetureB2bOrder 검사조차 없음 (`neture-b2b-payment.controller.ts:251-263`). PH 동일 (`PharmacyHubPaymentController.ts:197-210`).
- payment 의 소유자(buyer) 검사 없음 — payment 레코드에 buyerId 없음.
- checkout_order 에 paymentId 기록 없음; 역방향 대응은 `o4o_payments.orderId = paymentGroupId|orderId` + `metadata.checkoutOrderIds`(prepare 시점 스냅샷)뿐.
- 시나리오: 소액 group G1 으로 prepare(P1, 1,000원) → Toss 결제창은 **클라이언트가 orderId/amount 를 지정**(web-kpa-society `api/storeB2bPayments.ts:150-158`)하므로 orderId=G2, amount=1,000 으로 승인 → confirm(paymentId=P1, paymentGroupId=G2) → Core 는 P1.amount=1,000 으로 Toss confirm(G2,1,000) 성공 → payment.completed(orderId=G2) → handler 가 **고액 G2 를 paid 전이 + 공급자 전달**.

**(b) 서버 주문 금액과의 일치 검사 누락 — 확정**
- Core 는 `payment.amount`(prepare 값)만 사용 (120-123); confirm 시 Σ order.totalAmount 재계산·비교 없음. handler 도 금액 비교 없음 (`StoreB2bCheckoutPaymentEventHandler.ts:73-162`). Toss adapter 는 응답 금액을 검증하지 않고 `paidAmount: amount`(요청값) 반환 (`TossPaymentProviderAdapter.ts:82-85`).

**(c) PG orderId vs 내부 id 불일치 — 확정 (단건 경로)**
- 단건: 백엔드 confirm 은 PG orderId=`order.orderNumber` (`factory.ts:330`, `neture-b2b-payment.controller.ts:294`), 그러나 KPA/KCos 프런트는 Toss 에 `orderId = checkout order UUID` 로 결제 요청 (`web-kpa-society/api/storeB2bPayments.ts:150-153`, `web-k-cosmetics` 동일) → 실 Toss 에서 confirm 거절. prepare 의 provider.prepare 에는 order.id 를 넘김(factory 231-232) — 3개 값이 서로 다름.
- group 경로는 PG orderId = paymentGroupId 로 일관 (factory 178-179, 299; Neture 프런트 `web-neture/pages/store/StorePaymentPage.tsx:66-70`; PH `web-store/services/ph/pages/PaymentPage.tsx:96-100`).

**(d) 이미 결제된 주문의 중복 prepare/confirm — 부분 확정**
- group prepare 는 paymentStatus=pending 을 요구 (factory 108-113, 136) → 결제 완료 후 재prepare 차단. 단건 prepare 는 status 만 검사 (factory 225) → paid 이후엔 status=paid 라 차단. **그러나 미결제 상태에선 prepare 를 몇 번이든 새 CREATED payment 로 생성**(중복 검사 없음, `PaymentCoreService.ts:60-74`) → 서로 다른 payment 2건이 각자 CONFIRMING 경합 보호만 받음. 동일 PG orderId 재승인은 Toss 측에서 막힐 가능성이 높지만 **PG 의존 보호**일 뿐.
- 재confirm: PAID payment 에 다시 confirm → `INVALID_PAYMENT_TRANSITION` 409 (멱등 성공 아님). paymentKey 중복 시에만 기존 PAID 반환 (factory 367-383).
- handler 멱등은 **메모리 Set 1시간** (`StoreB2bCheckoutPaymentEventHandler.ts:39,75-79,110-111`) + 상태 조건. 재시작·다중 인스턴스에서 무효. bridge 멱등은 unique 없음(1-5).
- **연쇄 결함**: PH 결제 후 취소는 `findByOrderId(paymentGroupId)` (`PharmacyHubPaymentController.ts:358`, repo `findOne({where:{orderId}})` 정렬·상태 조건 없음 `TypeORMPaymentRepository.ts:55-58`) → 중복 prepare 로 CREATED 행이 먼저 잡히면 `refunded=false` 인데도 주문을 `cancelled` + paymentStatus `refunded` 로 갱신 (359-374) — **PG 미환불 상태로 환불 처리 기록**.
- **재시도 결함**: PG 실패 시 Core 가 PAYMENT_FAILED 발행 → handler 가 order.paymentStatus=FAILED (`StoreB2bCheckoutPaymentEventHandler.ts:178-183`) → group prepare 는 pending 만 허용하므로 **해당 group 재결제 영구 불가**.
- Core confirm 의 catch 는 PG 승인 성공 이후의 save/publish 실패도 FAILED 로 기록 (`PaymentCoreService.ts:144-194`) → 돈은 승인됐는데 FAILED 가능.

**(e) web-store 주문 화면 결제 미연결 — 확정**
- `web-store/pages/store-cart/StoreCartPage.tsx:22-61` — `StoreCartView` 에 `renderPaymentAction` 미전달 (전달하는 곳: `web-kpa-society/pages/store-cart/StoreCartPage.tsx:60`, `web-k-cosmetics/.../StoreCartPage.tsx:29`). web-store 에 store-b2b 결제 API 모듈 없음. 결과: 주문 확정 후 결제 버튼 없음(공용 View `packages/store-ui-core/src/components/store-cart/StoreCartView.tsx:128-130`).
- 추가: KPA/KCos 의 `StoreB2bPayButton` 은 **2개 이상 공급자 주문이면 버튼 disable** (`web-kpa-society/components/store-cart/StoreB2bPayButton.tsx:40,56,61-64`) — group 결제 미사용. successUrl 에 paymentId 없음(42) 이고 **`confirmStoreB2bPayment` 를 호출하는 화면이 어느 앱에도 없음**(grep: 정의 `api/storeB2bPayments.ts:81` 외 호출 0) → KPA/약국 B2B 결제는 confirm 불가 = 주문이 paid 로 가지 않음 = 공급자 전달 0.
- web-store `/work/pharmacy-hub/payment*` 는 PH 축 전용 (`web-store/App.tsx:360-371`).

#### 4-3. 테스트 vs 실 PG · 키 부재
- 구분 기준은 secret key 접두 `test_` 뿐 (`TossPaymentProviderAdapter.ts:45`). 키 부재 시 기본값 `test_sk_test_key`/`test_ck_test_key` (27-28, `factory.ts:421`) → isTestMode=true 로 보이지만 실제 Toss 호출은 인증 실패 → FAILED.
- **키 부재 → 가짜 성공: 반박(현 코드)**. 모의 승인/우회 분기는 없다. 다만 "키 미설정" 을 명시 오류로 내지 않고 test 처럼 보이게 하며, 별도 테스트 결제(PG 미호출) 모드도 없음 → WO 5-5 미충족.
- isTestMode 는 응답·payment.metadata 에만 있고 주문/공급자 화면/정산에 전파되지 않음.

#### 4-4. paid 전이 · 공급자 전달
confirm 성공 → `paymentEventHub.emitCompleted` (비동기, HTTP 응답과 분리) → handler: CREATED|PENDING_PAYMENT 만 PAID 전이 (`StoreB2bCheckoutPaymentEventHandler.ts:126-142`) → `bridgeCheckoutOrderToNetureFulfillment` (145) → neture_orders(PAID). 실패 시 로그만, 복구는 관리자 `routes/admin/admin-fulfillment-recovery.routes.ts:50,68,97` (`services/neture/checkout-fulfillment-recovery.service.ts`).

---

### 5. 정산 · 취소/환불 (보고만, 삭제 제안 없음)
- `neture_settlements` API: 공급자 `modules/neture/controllers/supplier-settlement.controller.ts:34,53,(77)` · 관리자 `admin-settlement.controller.ts:44(calculate),78,104,122,136,158(approve),177(pay)`, 서비스 `services/neture-settlement.service.ts`. 집계 = neture_orders delivered + paid 흔적 + 미정산, **service_key='neture' 한정** (160-190), 공급자 금액=Σ item total_price(배송비 제외), 수수료 10% 고정 (20-23).
- 영향: 새 제안 주문이 bridge 를 타면 neture_orders 에 들어가지만 service_key=kpa-society 이므로 **정산 집계에서 제외** (현재 약국 주문 전부 동일). 수취 주체(→6)가 생기면 "어느 운영 주체 수취분의 정산인가" 축이 없음. 테스트 결제 제외 조건도 없음.
- 취소/환불 경로 현황:
  1. 결제 전 단건 취소 — KPA/KCos `store-order-cancel.service.ts`(이벤트 수량 복원 포함), PH `cancelBeforePayment`.
  2. 결제 후 그룹 취소+PG 환불 — **PH 만** (`PharmacyHubPaymentController.ts:304-400`, 공급자 접수 전 한정 334-348). 위 4-2(d) 결함 있음.
  3. `/checkout/refund`·admin refund (`controllers/checkout/checkoutController.ts:95-125`, `controllers/admin/adminOrderController.ts:129-195`, `routes/admin-orders.routes.ts:37`) — `checkout_payments` 를 읽는데 B2B 결제는 `o4o_payments` 에 기록 → B2B 주문엔 "Payment record not found" (사실상 미연결).
  4. Neture / KPA B2B 결제 후 취소 — 경로 없음.
- 새 제안 주문 연결 시 잔여: 정산 서비스 필터·수취 주체 축·테스트 결제 제외, 결제 후 취소(그룹 단위) 경로의 KPA 축 부재, admin refund 의 payment 저장소 불일치.

---

### 6. 수취 운영 주체
- 현재: **단일 가맹 키** — `TOSS_PAYMENTS_SECRET_KEY/CLIENT_KEY` 1쌍 (`TossPaymentProviderAdapter.ts:27-28`), 모든 sourceService 공용. 수취 주체 필드는 checkout_orders·o4o_payments 어디에도 없음. 결제 묶음은 paymentGroupId(=한 번의 cart confirm, 같은 serviceKey) 기준이며 수취 주체 개념 없이 **여러 공급자 주문을 1회 PG 결제로 합침** (core 239, factory 170-193).
- 둘 위치 (신규 *_orders/*_payments 금지 준수):
  - 주문: `checkout_orders.metadata.receiverKey` + 각 item `metadata.receiverKey/supplyRouteKey` (마이그레이션 0). 조회·인덱스 필요 시 이후 컬럼 승격(스키마 변경=사용자 승인).
  - 결제: `o4o_payments.metadata.receiverKey` + `checkoutOrderIds`.
  - 결정 원천: 선택된 공급 제안의 공급 경로(세미프랜차이즈) → 그 운영 주체. 공급처 미지정 = pharmacy 운영 주체.
- 합산 방지: (1) confirm Core 의 grouping 키를 `supplierId` → `(receiverKey, supplierId)` 로 하고 paymentGroupId 를 **receiverKey 별로 발급**; (2) prepare 에서 group 내 receiverKey 가 단일인지 재검증(불일치 409); (3) 수취 주체별 PG 설정이 없으면 실결제 prepare 거부(테스트 모드만 허용).

---

### 7. 최소 변경 제안 (신규 *_orders/*_payments 없음 · F8 존중)

1. **선택 제안 ID 저장** — `store_cart_items` 에 `supply_offer_id uuid null` 1컬럼(마이그레이션). 제안 엔티티 자체는 단계 2 설계 소관(현 `uq(master_id,supplier_id)`·`offer_service_prices uq(offer_id,service_key)` 때문에 SPO/OSP 로는 복수 제안 불가 → SPO 하위 자식 테이블 필요; 재고는 SPO 유지). 이벤트 오퍼는 기존 `event_offer_id`(OPL) 그대로.
2. **서버 권한·가격 확정** — `b2b-checkout-confirm.core.ts` 의 offer 재조회에 제안 행 JOIN: 제안 status=approved · 기간 · 대상(경로 가입 승인 약국/개별 약국) 판정 → `unitPrice = proposal.unit_price` (OSP/price_general fallback 은 "공급처 미지정 pharmacy 기본" 에만). 기존 strategy gate·PRIVATE/SERVICE 검사(F8 Layer 3)는 **AND 로 유지**, 제거·완화하지 않음. 새 strategy 추가 시 F8 §7 "Checkout Guard 변경 = WO+구조 검토" 로 문서화.
3. **스냅샷** — line item `metadata` 에 `supplyOfferId, supplyRouteKey, receiverKey, unitPrice, priceSource, conditionsSnapshot(최소수량/기간/이벤트 ID)` 기록(jsonb, 마이그레이션 0). `productId` 는 SPO id 유지(공급자 스코프 계약). bridge 가 `neture_order_items.options` 로 그대로 승계(이미 `it.metadata` 복사, bridge 198).
4. **경로/수취 주체별 분할** — Core grouping 키 확장 + paymentGroupId 를 receiver 단위로 발급(6절). 이벤트 축에도 paymentGroupId 부여(현재 없음).
5. **공급자 목록 수정** — `fulfillment-service-scope.ts` 에 공급자 가시 서비스 집합 상수 1개, `= $2` → `= ANY($2::text[])` 로 supplier-order.service(43,66), supplier-unified-order.service(117,173), supplier.service(569,578,659,670) 일괄. 응답에 serviceKey · 구매 약국명(organizations via `metadata.sellerOrganizationId` — bridge 에서 metadata 로 복사) · 배송지. B2B confirm 에 매장 배송지 snapshot 을 shippingAddress 로 전달(조직 주소 원천은 별도 확인 필요).
6. **PG 독립 결제** (PaymentCore + o4o_payments 재사용, 3벌 컨트롤러 → factory 1벌로 수렴 권장):
   - prepare: 서버 Σ totalAmount, PG orderId = **항상 paymentGroupId**(단건도 group 1건), payment.metadata 에 buyerId·checkoutOrderIds·receiverKey·amount. 같은 group 의 CREATED payment 존재 시 재사용(멱등), PAID 존재 시 409. paymentStatus `failed` 도 재시도 허용.
   - confirm: `payment.orderId === paymentGroupId` · `payment.metadata.buyerId === userId` · Σ현재 order.totalAmount === payment.amount 검사 → PG orderId 는 DB 값 사용(요청값 금지). PAID 재요청은 기존 결과 반환(멱등). Toss adapter 는 응답 `totalAmount` 를 검증해 불일치 시 실패.
   - handler: event.paymentId 로 payment 재조회해 대응·금액 재검증, 전이는 `UPDATE … WHERE paymentStatus='pending'` 조건부, 메모리 Set 대신 DB 조건으로 멱등.
   - 공급자 전달 1회: `neture_orders` 에 partial unique index `((metadata->>'checkoutOrderId')) WHERE metadata ? 'checkoutOrderId'` (마이그레이션) + bridge insert 충돌 시 기존 id 반환.
   - 테스트/실 PG: `PAYMENT_MODE=test|live` 명시 env. test = PG 미호출 승인(payment/order metadata `testPayment:true`, 공급자 화면 배지, 정산 제외). live 인데 키(또는 수취 주체 설정) 없음 = prepare 503 `PAYMENT_PROVIDER_NOT_CONFIGURED`. 하드코딩 기본 키 제거.
   - 프런트: web-store StoreCartPage 에 `renderPaymentAction` + 결제 성공 페이지(paymentId·paymentGroupId 로 confirm) 추가. 다중 공급자 disable 제거(group 결제).
   - 선택: `o4o_payments` partial unique `(orderId) WHERE status IN ('CREATED','CONFIRMING','PAID')` 로 중복 prepare 차단(마이그레이션).

#### 필요한 마이그레이션 (모두 사용자 승인 대상 — CLAUDE.md 중지 조건)
| # | 대상 | 내용 | 필수 |
|---|---|---|---|
| M1 | store_cart_items | `supply_offer_id uuid null` (+index) | 필수 |
| M2 | (단계 2 소관) 공급 제안 테이블 | SPO 하위 복수 제안 | 필수(설계 별도) |
| M3 | neture_orders | bridge 멱등 partial unique index | 권장(5-3) |
| M4 | o4o_payments | 활성 payment 1건 partial unique | 선택 |
| — | checkout_orders | 컬럼 추가 없음(metadata 사용) — 컬럼 승격 시 별도 승인 | — |

#### 범위 밖 발견 (보고만)
- 수량 1..1000 상한이 B2B confirm 에 이미 존재 (`b2b-checkout-confirm.core.ts:329`) — WO §4 "추가하지 않음" 과의 관계 판단 필요.
- `checkoutService.createOrder` 는 item subtotal 을 재계산하지 않음 — 호출자 신뢰.
- orderNumber 4자리 난수 충돌 가능성.
- neture adapter line metadata 가 OSP 가격이어도 `pricingSource:'regular'` 고정 (`neture-b2b-cart-checkout.service.ts:113-119`).
