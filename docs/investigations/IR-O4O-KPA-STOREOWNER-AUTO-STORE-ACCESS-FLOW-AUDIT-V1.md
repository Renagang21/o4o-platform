# IR-O4O-KPA-STOREOWNER-AUTO-STORE-ACCESS-FLOW-AUDIT-V1

> **조사 전용 IR (Read-Only Audit)** — 코드 수정 없음. KPA-Society 에서 약국 경영자(store_owner)가 서비스/역할 승인 이후 **별도의 "내 약국 사용승인" 게이트 없이** 자동으로 `/store` 를 사용할 수 있는지 점검한다. 직전 IR(`IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1`)이 권고한 `kpa:store_owner → /store` redirect 작업의 **선행 안전 점검**이다.

- **작성일:** 2026-06-02
- **유형:** Investigation Report (조사 전용, redirect WO 선행 점검)
- **범위:** web-kpa-society (frontend) + apps/api-server (backend) + packages/store-ui-core
- **선행 IR:** [IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1](IR-O4O-CROSSSERVICE-POSTLOGIN-STOREOWNER-DASHBOARD-POLICY-AUDIT-V1.md)
- **방침:** 코드/문서 수정·이동·삭제 없음. 추측 금지. 주석-구현 불일치 명시. 실제 작동 흐름과 legacy 잔재 구분.

---

## 0. 한 줄 결론

> **별도의 "내 약국 사용승인" 2차 게이트는 존재하지 않는다.** KPA 에서 "약국 request 승인"은 `kpa:store_owner` 역할을 **부여하는 행위 그 자체**이며, 같은 트랜잭션에서 organization(약국)·organization_members(owner)·store slug 까지 **원자적으로 함께 생성**된다. 일단 `kpa:store_owner` 역할을 보유하면 `/store` Guard 는 **역할만으로 통과**시키고, 약국 request 를 재확인하지 않는다(`getMyRequestsCached()` 는 stale JWT 복구 fallback 일 뿐). 따라서 IR 이 우려한 "store_owner 부여 후 또 사용 신청 → 운영자 재승인" 형태의 **중복 승인 anti-pattern 은 없다**. → **`kpa:store_owner → /store` post-login redirect 는 즉시 적용 가능(안전)**.

---

## 1. 현재 KPA store_owner 부여 흐름 요약

### 1-1. store_owner 가 부여되는 3개 경로 (모두 동일 결과)

`kpa:store_owner` 는 **service membership(커뮤니티 가입) 승인만으로는 부여되지 않는다.** 약국 차원(activity_type='pharmacy_owner')의 승인이 있어야 부여되며, 부여 시점에 store context 가 함께 생성된다.

| 경로 | 트리거 | 부여 행위 | 산출물 |
|------|--------|-----------|--------|
| **A. 약국 request 승인** | 운영자 `PATCH /api/v1/kpa/pharmacy-requests/:id/approve` | role 부여 + org/slug 생성 | store_owner + 약국 context |
| **B. 회원 상태 승인 (pharmacy_owner)** | 운영자 `PATCH /kpa/members/:id/status` pending→active, `activity_type='pharmacy_owner'` 인 경우 | 동일 | 동일 |
| **B'. 회원 정보 편집 → pharmacy_owner** | 운영자 `PATCH /kpa/members/:id/info` 로 activity_type 을 pharmacy_owner 로 변경 | 동일 | 동일 |

근거:
- 경로 A — [pharmacy-request.controller.ts:208-348](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L208): 승인 시 `ensureOrganization()` → `organization_members(role='owner')` → `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` → `RoleAssignmentService.assignRole('kpa:store_owner')` → store slug 생성을 **연속 실행**.
- 경로 B — [member.controller.ts:626-784](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L626): 동일 시퀀스.
- 경로 B' — [member.controller.ts:1314-1363](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1314): activity_type 을 pharmacy_owner 로 바꾸면 동일하게 role + org 부여. (반대로 pharmacy_owner 에서 벗어나면 [member.controller.ts:1292-1309](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1292) 에서 store_owner 를 `is_active=false` 로 회수.)
- role 부여 SSOT — [role-assignment.service.ts:123-161](apps/api-server/src/modules/auth/services/role-assignment.service.ts#L123): `role_assignments` 에 `kpa:store_owner, is_active=true` upsert.

### 1-2. role 부여 시점 = store context 생성 시점 (원자성)

핵심 안전 요소: **role 만 부여되고 store/org context 가 누락되는 상태는 설계상 발생하지 않는다.** 세 경로 모두 동일 핸들러 안에서 org → org_members(owner) → profile → role → slug 를 순차 생성한다. 따라서 "role 은 있는데 /store 가 context 없어 실패"하는 위험은 코드 흐름상 없다.

- `ensureOrganization()` 는 business_number 키 멱등 생성([organization-ops.service.ts:58-104](apps/api-server/src/modules/organization/services/organization-ops.service.ts#L58)).
- 백필 마이그레이션도 존재 — [20260900000000-BackfillStoreOwnerRoles.ts:27-48](apps/api-server/src/database/migrations/20260900000000-BackfillStoreOwnerRoles.ts#L27): `organization_members(owner)`+active KPA membership, 또는 `pharmacist_profiles(pharmacy_owner)`+active membership 인 기존 사용자에게 store_owner 소급 부여.

### 1-3. organization / store context 연결 여부 — **연결됨 (자동)**

승인 후 사용자는 다음을 모두 보유:
- ✅ `role_assignments(kpa:store_owner, is_active=true)`
- ✅ `organization_members(role='owner', left_at IS NULL)` + `organizations(type='pharmacy')`
- ✅ `platform_store_slugs` (= `/store` 라우팅용)

---

## 2. `/store` 접근 조건 요약

### 2-1. Guard 구조 (frontend)

`/store/*` → `PharmacyGuard` ([PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx)) → 공통 `StoreOwnerGuard(serviceKey='kpa')` ([StoreOwnerGuard.tsx](packages/store-ui-core/src/auth/StoreOwnerGuard.tsx)) → 통과 시 `MembershipGate` 로 감쌈.

평가 우선순위: `loading > !auth > platformOnly 카드 > directAccess > staleRecovery > denial(/pharmacy)`.

### 2-2. 접근 허용 조건 (정확한 boolean)

KPA config — [StoreOwnerGuard.tsx:51-56](packages/store-ui-core/src/auth/StoreOwnerGuard.tsx#L51): `storeOwner='kpa:store_owner'`, `membershipStoreOwnerRole=null`.

`hasDirectAccess` ([StoreOwnerGuard.tsx:169-195](packages/store-ui-core/src/auth/StoreOwnerGuard.tsx#L169)) = 다음 중 하나:
1. `kpa:operator` / `kpa:admin` / `platform:super_admin` 보유 (운영자·관리자 통과 — 다중역할 안전), **또는**
2. **`kpa:store_owner` 보유 또는 `user.isStoreOwner===true`** ← KPA store_owner 의 주 경로, **또는**
3. extraRole matcher.

→ **`kpa:store_owner` 역할(+ active kpa-society membership) 만으로 `/store` 접근이 허용된다. 약국 request 의 approved 여부는 directAccess 평가에서 확인하지 않는다.**

### 2-3. `getMyRequestsCached()` 의 실제 역할 — **2차 게이트 아님 (stale 복구 fallback)**

[PharmacyGuard.tsx:83-91](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx#L83) 의 `staleRecovery.check` 는 `hasDirectAccess === false` 일 때만 실행된다. 즉 JWT 가 stale(역할 누락) 이고 `isStoreOwner` flag 도 false 인 **edge case 복구용**이다. 정상적으로 역할을 가진 store_owner 는 이 경로에 진입하지 않는다.

### 2-4. 접근 차단 조건

- 비로그인 → `/login`.
- store 역할/flag 없이 admin/operator 만 보유(platform-only) → 차단 카드(stale 복구 호출 회피, [PharmacyGuard.tsx:66-72](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx#L66)).
- 역할·flag·approved request 전부 없음 → `denialFallback='/pharmacy'`.
- backend 도 동일 — `requireStoreOwner(dataSource,'kpa')` 가 `role_assignments(kpa:store_owner)` + active kpa-society membership 부재 시 403 ([store-owner.utils.ts:73-101](apps/api-server/src/utils/store-owner.utils.ts#L73)). **즉 role 없으면 API 가 조용히 통과시키지 않고 403 — silent fail 없음.**

### 2-5. store_owner role 만으로 충분한가 — **충분 (단, active membership 동반 필요)**

`kpa:store_owner` 역할 + active `kpa-society` membership 이면 `/store` 사용 가능. KPA 는 `membershipStoreOwnerRole=null` 이라 Guard 단계에서 membership-role 매칭은 안 하지만, 통과 후 `MembershipGate` 가 active 상태를 요구한다. 실무상 store_owner 부여는 membership 승인/약국 승인과 함께 일어나므로 둘은 정렬되어 있다(§4 참조).

---

## 3. 별도 "내 약국 사용승인" 흐름 존재 여부

### 3-1. 결론: **독립된 2차 "사용승인" 게이트 없음**

IR 이 우려한 anti-pattern:
```
가입 → 승인 → store_owner 부여 → 다시 내 약국 사용신청 → 운영자 추가승인 → /store 접근
```
이 형태는 **존재하지 않는다.** 코드상:
- "약국 request 승인" = store_owner 부여 = store context 생성 (동일 행위, §1).
- store_owner 부여 **이후** /store 를 쓰기 위한 추가 신청/승인 절차는 없음. 역할만 있으면 Guard·API 모두 통과.

### 3-2. `/pharmacy*` 경로의 정체 — 역할 신청 게이트 (legacy 잔재 아님, 사용 후 게이트 아님)

| 경로 | 컴포넌트 | 정체 |
|------|----------|------|
| `/pharmacy` | `PharmacyPage` | 상태 안내 게이트. **store 역할 보유 시 즉시 `/store` 로 redirect** ([PharmacyPage.tsx:133-134](services/web-kpa-society/src/pages/pharmacy/PharmacyPage.tsx#L133)). 미보유자만 request 상태(none→approval 폼 / pending / rejected) 안내 |
| `/pharmacy/approval` | `PharmacyApprovalGatePage` | **store_owner 가 되기 위한 신청 폼** (사업자번호·약국명·전화 등 → `POST /pharmacy-requests`). 이미 store_owner 면 즉시 `/store` redirect ([PharmacyApprovalGatePage.tsx:109-115](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx#L109)) |
| `/pharmacy/*` (그 외) | `<Navigate to="/store">` | wildcard → /store |

→ `/pharmacy/approval` 은 **"역할 변경 신청"**(IR 이 정상 흐름으로 인정한 경로)이지, "store_owner 가 된 뒤의 사용승인"이 아니다. `/store/apply`, `/store/request` 경로는 **존재하지 않음**.

### 3-3. 운영자 승인 메뉴

운영자 측 승인 표면은 `PATCH /kpa/pharmacy-requests/:id/approve`(scope `kpa:operator`) 1개 + 회원 상태/정보 편집(경로 B/B'). **"내 약국 사용승인"이라는 별도 승인 큐는 없다** — 약국 request 승인이 곧 역할 부여 승인이다.

### 3-4. service membership 승인 vs store_owner — 분리되어 있음 (정상)

- `service_memberships(kpa-society)` 승인 = 커뮤니티 기본 접근(`kpa:member`). store_owner 자동 부여 안 함.
- store_owner 는 약국 차원(pharmacy_owner) 승인에서 부여.
- 이는 "커뮤니티 회원 ≠ 약국 경영자"를 구분하는 **정당한 설계**이지 중복 승인이 아니다. pharmacy_owner 로 가입한 사용자는 경로 B 에서 membership 승인과 store_owner 부여가 **한 번의 운영자 액션**으로 동시 처리된다(중복 아님).

---

## 4. post-login `/store` redirect 적용 가능성 판단

### 판정: **즉시 적용 가능 (Immediately applicable)**

근거:
1. post-login redirect 는 `user.roles` 에 `kpa:store_owner` 가 있을 때만 발동(`getPrimaryDashboardRoute` 가 역할 매칭). 역할이 있는 사용자는 §2-2 에 따라 `/store` Guard 를 **directAccess 로 통과** → redirect 후 재게이트 없음.
2. 역할 부여 시 store context 가 원자적으로 함께 생성(§1-2)되므로, redirect 직후 `/store` 가 context 부재로 실패할 위험 없음.
3. `getMyRequestsCached()` 재확인은 stale JWT 일 때만 작동하는 fallback 이지 정상 흐름의 게이트가 아님(§2-3).
4. 단순히 `KPA_DASHBOARD_MAP` 에 `kpa:store_owner: '/store'` + priority 배열 포함만으로 충분(구조 변경 불필요).

### 잔여 확인 사항 (낮은 위험, 차단 요소 아님)

- **membership active 정렬:** store_owner 인데 kpa-society membership 이 active 가 아닌 사용자는 `MembershipGate` 에서 상태 화면으로 갈 수 있음. 단 store_owner 부여 경로상 membership/약국 승인과 함께 일어나므로 실무상 정렬. → redirect WO 에서 "active membership 동반" 전제만 확인하면 됨. **선행 제거가 필요한 게이트는 아님.**
- **다중역할:** operator/admin 겸 store_owner 는 우선순위상 `/operator`·`/admin` 으로 감(의도된 동작). store_owner 첫 화면을 원하면 별도 정책 필요하나, 이는 redirect 안전성과 무관.

---

## 5. O4O 정책 충돌 여부

| O4O 기준 | 현재 KPA 구조 | 충돌? |
|----------|---------------|:-----:|
| 매장/약국 경영자는 서비스 승인 후 곧 store_owner | pharmacy_owner 승인 시 store_owner 원자 부여 (경로 A/B/B') | 일치 |
| store_owner 는 별도 사용승인 없이 내 약국 사용 가능 | 역할 보유 시 Guard·API 모두 직접 통과, 2차 게이트 없음 | **일치 (충돌 없음)** |
| 별도 사용승인 흐름이 남아 있으면 충돌 | 그런 흐름 없음 (`/pharmacy/approval` 은 역할 신청, 사용승인 아님) | 일치 |
| 단순 안내·legacy 와 실제 게이트 구분 | `/pharmacy*` 는 역할 신청/상태 안내, store 역할자는 즉시 /store | 일치 |
| 승인 후 store context 자동 연결 | org/org_members/slug 원자 생성 | 일치 |
| KPA 를 커뮤니티 예외로 보지 않음 (본 IR 기준) | (정책 판단은 선행 IR 소관) | 해당 없음 |

**충돌 요약: 없음.** "store_owner 부여 = 약국 승인 = context 생성"이 원자적이고, 부여 이후 추가 사용승인 게이트가 없다. O4O 의 "승인 후 store_owner 자동 접근" 기준과 **정합적**이다.

---

## 6. 후속 WO 필요 여부

| 항목 | 판정 |
|------|------|
| 별도 승인 게이트 **제거 WO** | **불필요** — 제거할 redundant 게이트가 없음 |
| KPA post-login `kpa:store_owner → /store` redirect WO | **가능 (권장)** — `WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1` 로 바로 진행 가능 |
| 두 작업 묶음 | 묶을 게이트 제거 작업이 없으므로 **단일 redirect WO 로 충분** |

### redirect WO 범위 (참고, 본 IR 에서 수정 없음)
- [services/web-kpa-society/src/config/dashboard.ts](services/web-kpa-society/src/config/dashboard.ts) — `KPA_DASHBOARD_MAP`/`KPA_ROLE_PRIORITY` 에 `kpa:store_owner: '/store'` 추가.
- [services/web-kpa-society/src/components/LoginModal.tsx:107](services/web-kpa-society/src/components/LoginModal.tsx#L107) — stale 주석("약국 경영자 → /store") 정리(선행 IR 에서 확정된 불일치).
- (선택) active membership 전제 확인 — 신규 코드 불요, redirect 동작 검증으로 충분.

> ⚠️ 단, KPA "커뮤니티 우선" redirect 정책은 `WO-O4O-KPA-POST-LOGIN-PRIMARY-ROUTE-FIX-V1` 에서 의도적으로 결정된 것이므로, 이를 갱신(supersede)하는 사업 의사결정 확인이 선행되어야 한다(선행 IR §6 과 동일).

---

## 7. 주석-구현 불일치 (확정/검토)

| 위치 | 주석 | 구현 | 판정 |
|------|------|------|------|
| [LoginModal.tsx:107-108](services/web-kpa-society/src/components/LoginModal.tsx#L107) | "약국 경영자(isStoreOwner) → /store" | 실제 `null`(이동 없음) | **불일치 (확정)** — redirect WO 에서 정리 |
| [PharmacyGuard.tsx:4-15](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx#L4) | stale recovery 로 approved 확인 후 세션 갱신 | 코드 일치 | 일치 |
| [PharmacyPage.tsx:1-7](services/web-kpa-society/src/pages/pharmacy/PharmacyPage.tsx#L1) | store 역할 보유 시 /store, 미보유 시 신청 상태 안내 | 코드 일치 | 일치 |
| [PharmacyApprovalGatePage.tsx:109-113](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx#L109) | 이미 store_owner 면 신청 폼 안 보이고 /store 로 | 코드 일치 | 일치 |

→ stale 주석 1건 외 추가 불일치 없음. 본 IR 에서는 수정하지 않고 redirect WO 정리 후보로만 표시.

---

## Current Structure vs O4O Philosophy Conflict Check

| # | O4O 철학 기준 | 현재 KPA 구조 | 충돌? |
|---|---------------|---------------|:-----:|
| 1 | 승인 후 store_owner 자동 부여 | pharmacy 승인 시 role 원자 부여 (A/B/B') | 일치 |
| 2 | store_owner 는 추가 사용승인 없이 내 약국 사용 | 역할 보유 → Guard/API 직접 통과, 2차 게이트 없음 | **일치** |
| 3 | 승인 시 store/org context 자동 연결 | org/org_members(owner)/slug 원자 생성 | 일치 |
| 4 | 별도 사용승인 흐름 잔재 없어야 | redundant 사용승인 게이트 없음 (`/pharmacy/approval`=역할신청) | 일치 |
| 5 | role 누락 시 silent fail 금지 | backend 403, frontend denial → 명시적 차단 | 일치 |
| 6 | KPA=커뮤니티 예외 아님, 약국 경쟁력 서비스 | redirect 정책은 선행 IR 소관(여기선 게이트 안전성만) | 해당 없음 |

**종합:** redirect WO 의 선행 안전 점검 기준(1~5) 전부 **충돌 없음**. KPA 의 store_owner 접근 구조는 "승인=부여=context 생성, 이후 무게이트"로 O4O 철학과 정합적이다. **→ 별도 게이트 제거 WO 없이 `WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1` 로 직행 가능.**

---

## 완료 보고 (요약)

- **조사한 주요 파일:**
  - frontend: [PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx), [PharmacyPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyPage.tsx), [PharmacyApprovalGatePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx), [pharmacyRequestApi.ts](services/web-kpa-society/src/api/pharmacyRequestApi.ts), [StoreOwnerGuard.tsx](packages/store-ui-core/src/auth/StoreOwnerGuard.tsx)
  - backend: [pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts), [member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts), [role-assignment.service.ts](apps/api-server/src/modules/auth/services/role-assignment.service.ts), [store-owner.utils.ts](apps/api-server/src/utils/store-owner.utils.ts), [auth-helpers.ts](apps/api-server/src/modules/auth/controllers/auth-helpers.ts), [BackfillStoreOwnerRoles.ts](apps/api-server/src/database/migrations/20260900000000-BackfillStoreOwnerRoles.ts)
- **KPA store_owner 부여 흐름:** pharmacy_owner 승인(경로 A/B/B') 시 `role_assignments(kpa:store_owner)` + organization(owner) + store slug 를 **원자 생성**. service membership 단독 승인으로는 부여 안 됨(정상 분리).
- **`/store` 접근 조건:** `kpa:store_owner` 역할(+active kpa-society membership) 만으로 통과. 약국 request approved 재확인은 stale JWT 복구 fallback 뿐.
- **별도 내 약국 사용승인 흐름:** **없음.** `/pharmacy/approval` 은 store_owner 가 되기 위한 역할 신청 폼이며, 부여 이후 사용을 위한 2차 승인은 존재하지 않음.
- **redirect 적용 전 제거 잔재:** **없음.** (stale 주석 1건은 redirect WO 에서 정리할 cosmetic 항목)
- **후속 WO 권고:** 게이트 제거 WO 불필요. `WO-O4O-KPA-POSTLOGIN-STOREOWNER-DASHBOARD-ALIGNMENT-V1` **단일 WO 로 직행 가능**. (단 KPA 커뮤니티 정책 supersede 에 대한 사업 의사결정 확인 선행.)

*— 본 IR 은 조사 전용. 코드/문서 수정·이동·삭제 없음.*
