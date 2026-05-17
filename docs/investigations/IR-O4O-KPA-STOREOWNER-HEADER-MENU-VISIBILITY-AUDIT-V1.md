---
id: IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1
title: "KPA-Society 상단 헤더 / 프로필 드롭다운 약국 메뉴 노출 조건 감사"
status: investigation-complete
date: 2026-05-17
type: investigation
scope:
  - KpaGlobalHeader 상단 nav + 프로필 드롭다운 + 모바일 메뉴 노출 조건
  - useAuth / AuthContext 의 user.isStoreOwner 채움 경로
  - /auth/me 와 /kpa/me-context 응답 비교
  - HubGuard / PharmacyGuard 의 dual-check 와 header 의 정합성
  - role_assignments(kpa:store_owner) 자동 부여 / 회수 경로 점검
  - operator/admin + store_owner multi-role 처리
related:
  - IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1 (Guard chain root cause — 이미 main 머지)
  - IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1 (auto-activation 흐름)
  - WO-O4O-KPA-HEADER-MENU-CANONICAL-ALIGNMENT-V1 (header 의 dual-check 도입 — 이미 머지)
  - WO-O4O-KPA-STOREOWNER-GUARD-CANONICAL-ALIGNMENT-V1 (HubGuard 의 dual-check 도입 — 이미 머지)
  - WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-V1 (activity_type 전환 시 role 동기화 — pharmacy_owner → 다른 직역만 처리)
---

# IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1

> 사용자 가설: "Header/Menu 가 아직 user.roles 만 보고 isStoreOwnerDual 기준이 적용되지 않은 상태일 가능성이 큼"
> **검증 결과: 가설 반증.** Header / HubGuard / PharmacyGuard 모두 이미 `isStoreOwnerDual(roles, 'kpa:store_owner', user.isStoreOwner)` 동일 dual-check 적용 중. 메뉴가 보이지 않는 진짜 원인은 **데이터 측면**.

---

## 0. Executive Summary

| 항목 | 값 |
|---|---|
| 사용자 가설 | Header 가 단일 `user.roles` check 만 사용 — dual-check 미적용 |
| **실측** | **Header 는 이미 `isStoreOwnerDual` 사용 중** (line 97). HubGuard 도 동일 (line 43). 헤더와 가드는 정합. |
| 진짜 원인 (가장 유력) | `role_assignments.role = 'kpa:store_owner'` 가 해당 사용자에게 **부재**. 둘 다 false 로 평가됨 |
| 부원인 (timing) | `/auth/me` 는 `isStoreOwner` 미반환 → 초기 렌더에서 `user.isStoreOwner === false`. `/kpa/me-context` async 응답 후에야 채워짐. 단 `/auth/me` 의 `roles` 는 role_assignments 에서 fresh 로 조회하므로 role 이 있으면 첫 응답으로 즉시 회복 |
| 위험도 | **중** — 메뉴 미노출 + 사용자가 URL 직접 입력 안 하면 진입 자체 불가 |
| 결정적 진단 채널 | `/__debug__/user?email=...` 의 step5 (role_assignments(kpa:store_owner)) — 행 데이터로 즉시 판단 가능 |
| 수정 방향 (제안) | A) 자동 부여 누락 사용자 backfill / B) `/kpa/me-context` 의 isStoreOwner 정의에 activity_type 포함 검토 / C) `/auth/me` 가 isStoreOwner 동봉 옵션 |
| 본 IR 범위 | 조사 전용. 코드 수정 없음. commit 없음. |

**핵심 결론**: 사용자 추정과 달리 frontend visibility 조건은 이미 canonical dual-check 으로 정렬되어 있다. 메뉴가 보이지 않는 이유는 `dual-check 양쪽 입력 모두 false` 인 사용자가 존재하기 때문 — 즉 `role_assignments(kpa:store_owner)` 부재. 후속 작업은 **frontend 가 아니라 backend 자동 부여 chain 의 backfill / 보정 / 정책 결정** 에 집중해야 한다.

---

## 1. 조사 방법

- Read-only 파일 분석 — Glob/Grep/Read 만 사용
- pull 직후 main HEAD `5c4ae4f61` 기준 (최신 캐노니컬 정렬 commit 포함)
- DB 직접 조회 없음 — 사용자 식별이 필요한 데이터 검증은 본 IR 범위 외 (검증 채널은 §6 에 명시)

---

## 2. 메뉴 렌더링 컴포넌트 — 실측

### 2-1. 상단 nav (KPA_CONTEXTUAL_NAV) — "내 매장" + "약국 운영 허브"

**파일**: [services/web-kpa-society/src/components/KpaGlobalHeader.tsx:90-108](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L90-L108)

```tsx
// 역할 판정 — WO-O4O-OPERATOR-MENU-COMMONIZATION-V1: platform:super_admin 포함
const isAdmin = user ? isAdminOrAbove(user.roles, 'kpa') : false;
const isOperator = user ? isOperatorOrAbove(user.roles, 'kpa') : false;
const isInstructor = user ? user.roles.includes('lms:instructor') : false;
// WO-O4O-KPA-HEADER-MENU-CANONICAL-ALIGNMENT-V1:
//   내 약국 + 운영 허브 모두 store_owner role 기준으로 통일.
//   HubGuard/PharmacyGuard/StoreHubPage CTA 가 모두 isStoreOwnerDual 단일 SSOT 사용 — header도 동일.
const isStoreOwner = isStoreOwnerDual(user?.roles ?? [], 'kpa:store_owner', user?.isStoreOwner);

const roleItems = filterContextualNav(KPA_CONTEXTUAL_NAV, { isStoreOwner });
const computedNav = [
  ...KPA_BASE_NAV,
  ...roleItems,
  KPA_ABOUT_NAV_ITEM,
  ...(user ? [] : [KPA_CONTEXTUAL_NAV_ITEM]),  // (안가공 — 실제 KPA_CONTACT_NAV_ITEM)
];
```

**KPA_CONTEXTUAL_NAV 정의** ([config/navigation.ts:40-43](../../services/web-kpa-society/src/config/navigation.ts#L40-L43)):
```ts
export const KPA_CONTEXTUAL_NAV: KpaContextualNavItem[] = [
  { label: kpaConfig.terminology.myStoreLabel,  href: '/store',     visibleWhen: 'storeOwner' },
  { label: kpaConfig.terminology.storeHubLabel, href: '/store-hub', visibleWhen: 'storeOwner' },
];
```

→ 두 항목 모두 `visibleWhen: 'storeOwner'` 단일 조건. `filterContextualNav` 가 `isStoreOwner=true` 일 때만 노출.

### 2-2. 프로필 드롭다운 — "내 매장"

**파일**: [KpaGlobalHeader.tsx:191-195](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L191-L195)
```tsx
{isStoreOwner && (
  <GlobalHeaderMenuItem to="/store" icon={<Store className="w-4 h-4" />}>
    내 매장
  </GlobalHeaderMenuItem>
)}
```

→ 동일 `isStoreOwner` (dual-check) 사용. 상단 nav 와 동일 입력.

### 2-3. 모바일 메뉴

`@o4o/ui` 의 `GlobalHeader` 가 `publicNav` 와 `userMenuItems` 를 desktop / mobile 양쪽 모두 렌더링 (KpaGlobalHeader 는 데이터만 주입). 별도 mobile-specific 분기 없음 → desktop 과 mobile 의 노출 조건은 동일.

### 2-4. operator/admin 메뉴

운영 / 관리자 메뉴는 별도 ([KpaGlobalHeader.tsx:181-190](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L181-L190)):
```tsx
{isAdmin && (<GlobalHeaderMenuItem to="/admin">관리자 대시보드</GlobalHeaderMenuItem>)}
{isOperator && (<GlobalHeaderMenuItem to="/operator">운영 대시보드</GlobalHeaderMenuItem>)}
```

→ operator/admin + store_owner multi-role 사용자는 **3 가지 메뉴 모두 표시되어야 함** (각 조건 독립). 코드상 충돌 없음.

---

## 3. `isStoreOwnerDual` 의 작동 — 양쪽 입력 점검

**파일**: [packages/auth-utils/src/isStoreOwnerDual.ts](../../packages/auth-utils/src/isStoreOwnerDual.ts)

```ts
export function isStoreOwnerDual(roles, storeOwnerRole, contextFlag) {
  return roles.includes(storeOwnerRole) || contextFlag === true;
}
```

→ `roles` 또는 `contextFlag` 둘 중 하나라도 truthy 면 true. 우리는 다음을 확인해야 한다:

### 3-1. 입력 A: `user.roles`

**출처**: `useAuth().user.roles` ← [AuthContext.tsx:223](../../services/web-kpa-society/src/contexts/AuthContext.tsx#L223) `roles: apiUser.roles || [role]`

**`apiUser.roles` 의 출처**: `/auth/me` 응답
**`/auth/me` 의 roles 채움 로직** ([apps/api-server/src/modules/auth/controllers/auth-account.controller.ts:28-44](../../apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L28-L44)):
```ts
// WO-O4O-AUTH-ROLE-FRESHEN-V1:
//   roles는 role_assignments(SSOT) 기준으로 fresh 조회하되 60s in-memory 캐시.
let roles = getCachedRoles(req.user.id);
if (!roles) {
  try {
    roles = await roleAssignmentService.getRoleNames(req.user.id);
    setCachedRoles(req.user.id, roles);
  } catch (cacheError: any) {
    roles = req.user.roles || [];  // JWT fallback
  }
}
```

**핵심**: `/auth/me` 의 `roles` 는 **JWT 가 아니라 role_assignments(SSOT) 에서 fresh 조회** (60s 캐시 + 변경 즉시 invalidate). 따라서:
- role_assignments 에 `kpa:store_owner` 가 있으면 → 첫 `/auth/me` 응답에 포함 → header `isStoreOwner=true` 즉시 활성
- 없으면 → 어떤 stale JWT 경로로도 회복 불가 (배경: 자동 부여가 ra 에 INSERT 했어도 60s 캐시 잔존 가능 — 단, member.controller 등의 `roleAssignmentService.assignRole` 는 `setCachedRoles` invalidate 까지 처리하는 SSOT)

### 3-2. 입력 B: `user.isStoreOwner` (contextFlag)

**출처**: 두 단계로 채워짐.

**Stage 1 — 초기 `/auth/me` 응답 변환** ([AuthContext.tsx:226](../../services/web-kpa-society/src/contexts/AuthContext.tsx#L226)):
```ts
isStoreOwner: !!(apiUser as any).isStoreOwner,
```

**그런데** `/auth/me` 백엔드는 `isStoreOwner` 를 **반환하지 않는다** ([auth-account.controller.ts:75-77](../../apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L75-L77)):
```ts
// WO-KPA-LOGIN-LATENCY-CLEANUP-V1: KPA enrichment 제거
// pharmacistQualification, activityType, kpaMembership는
// 프론트엔드에서 GET /api/v1/kpa/me-context로 별도 조회
```

→ 초기 변환 시 `user.isStoreOwner = false` (undefined → `!!undefined === false`).

**Stage 2 — async `fetchKpaContext()`** ([AuthContext.tsx:256-287](../../services/web-kpa-society/src/contexts/AuthContext.tsx#L256-L287)):
```ts
const response = await authClient.api.get('/kpa/me-context');
...
updated.isStoreOwner = !!ctx.isStoreOwner;
```

**`/kpa/me-context` 의 isStoreOwner 정의** ([apps/api-server/src/routes/kpa/controllers/me-context.controller.ts:43-65](../../apps/api-server/src/routes/kpa/controllers/me-context.controller.ts#L43-L65)):
```sql
CASE WHEN ra.user_id IS NOT NULL THEN true ELSE false END AS is_store_owner
...
LEFT JOIN (
  SELECT user_id FROM role_assignments
  WHERE user_id = $1
    AND role IN ('kpa:store_owner','glycopharm:store_owner','cosmetics:store_owner')
    AND is_active = true
  LIMIT 1
) ra ON ra.user_id = u.id
```

→ `isStoreOwner` 는 **순수히 `role_assignments` 만 조회** (cross-service union). activity_type 미반영.

### 3-3. dual-check 의 실효성

| 시나리오 | user.roles | user.isStoreOwner | 결과 |
|---|---|---|---|
| role_assignments 에 kpa:store_owner 있음 | 포함 (fresh) | true (Stage 2) | ✅ true |
| role 없음 + activity_type=pharmacy_owner | **미포함** | **false** | ❌ **false** |
| role 있음 + JWT 자체 stale | 포함 (fresh /auth/me 가 회복) | true (Stage 2) | ✅ true |
| role 있음 + 60s 캐시 stale + assignRole invalidate 누락 | 미포함 | **true (Stage 2)** | ✅ true (contextFlag fallback 작동) |

**핵심**:
- "dual" 의 실제 효과는 "60s role cache 와 KPA context 가 부분적으로 stale 일 때 회복" 정도.
- **role_assignments 자체에 kpa:store_owner 가 없는 사용자는 dual-check 도 못 살린다.**

---

## 4. 누락 원인 — `role_assignments(kpa:store_owner)` 부재 시나리오

### 4-1. 자동 부여 chain (정상 경로)

**Trigger**: 회원 승인 ([apps/api-server/src/routes/kpa/controllers/member.controller.ts:540-614](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L540-L614))
```text
oldStatus=pending → newStatus=active
+ kpa_members.activity_type='pharmacy_owner'
+ users.businessInfo.businessNumber
+ (businessName OR pharmacy_name)
→ ensureOrganization(code=kpa-pharm-{bizno})
+ organization_members(role='owner')
+ role_assignments('kpa:store_owner')   ← 본 IR 의 핵심 필드
```

전체 chain 의 5 단계는 user-debug 페이지에서 행 단위 표시됨 ([apps/api-server/src/routes/debug/user-debug.controller.ts:195-206](../../apps/api-server/src/routes/debug/user-debug.controller.ts#L195-L206)).

### 4-2. 자동 부여 실패 / 누락 가능성

| # | 시나리오 | 결과 |
|---|---|---|
| F1 | 가입 시 `businessInfo.businessNumber` 누락 → step1 fail → step5(role 부여) skip | role 부재 |
| F2 | 승인 트랜잭션 중 `ensureOrganization` 실패 → step5 skip | role 부재 |
| F3 | 자동 부여 정책 도입 이전 가입자 → backfill 마이그레이션 미실행 / 부분 실행 | role 부재 (legacy) |
| F4 | `pharmacy_owner` → 다른 직역으로 변경 (예: pharmacy_employee) → [auth-account.controller.ts:211-215](../../apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L211-L215) 가 role soft-delete. 이후 다시 `pharmacy_owner` 로 복귀해도 **부여 방향 코드 없음** (현행 frontend guard `WO-O4O-KPA-PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1` 가 진입 자체 차단 — 단 admin/operator 의 직접 편집 경로는 별도 점검 필요) | role 부재 (회수만, 재부여 없음) |
| F5 | operator/admin 의 회원 편집 ([member.controller.ts:860-870, 1069-1079, 1119-1127](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts)) — activity_type 또는 organization role 변경에 따라 store_owner role 재활성/회수 분기. 분기 조건 누락 케이스 가능 | 시나리오별 |
| F6 | 부분 데이터 — kpa_pharmacist_profiles 에 activity_type=pharmacy_owner 가 있으나 kpa_members 가 없거나 다른 활동 유형 (두 테이블 drift) | 자동 부여 trigger 부정합 |

### 4-3. Backfill 마이그레이션 존재 여부

`apps/api-server/src/database/migrations/20260900000000-BackfillStoreOwnerRoles.ts` 가 존재 — 그러나 본 IR 시점에 내용 미확인. 후속 검증 필요.

---

## 5. 비교 표 — Header / Guard / Backend

| 컴포넌트 | 사용 함수 | 입력 | dual ? |
|---|---|---|---|
| KpaGlobalHeader (nav + dropdown) | `isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner)` | A + B | ✅ |
| HubGuard | 동일 (line 43) | A + B | ✅ |
| PharmacyGuard | 동일 + API fallback (`getMyRequestsCached`) | A + B + API | ✅✅ |
| Backend `/kpa/me-context` isStoreOwner | role_assignments JOIN | ra only | ❌ |
| Backend `/auth/me` isStoreOwner | (미반환) | — | — |
| Backend `requireStoreOwner` 미들웨어 | `isStoreOwner()` util — role_assignments query | ra only | ❌ |

→ **frontend 는 이미 dual 정합, backend 는 role_assignments 단일 소스**. dual-check 가 실효를 가지려면 `user.isStoreOwner` 가 role_assignments 외 다른 소스에서 채워져야 하는데, 현재는 동일 source 이므로 두 branch 가 사실상 같은 답을 준다 (timing 만 다름).

---

## 6. 결정적 진단 채널 (운영 시 즉시 사용 가능)

**디버그 페이지**: `https://api.neture.co.kr/__debug__/user?email=<사용자이메일>`

본 IR 의 모든 가설은 다음 두 표로 즉시 판단 가능:

1. **Role Assignments 테이블** — `kpa:store_owner` 의 `is_active` 컬럼 값
2. **KPA Pharmacy Owner Activation Chain** 표 — step1 ~ step5 의 ❌/✅:
   - step5_role_assignment_kpa_store_owner = ❌ → **본 IR 의 시나리오 확정**
   - step1/step2/step3/step4 중 어디서 끊겼는지로 시나리오 F1~F4 구분

추가 가능 액션:
- `/__debug__/user/sync-role?email=...` — service_memberships.role 을 role_assignments 에 보정 (단, store_owner 는 보통 sm.role 에 없으므로 직접 회복 불가 — 주의)

---

## 7. 수정 대상 파일 (잠재 — 후속 WO 단계에서 결정)

### 7-1. 시나리오별 우선 수정 위치

| 시나리오 | 수정 대상 | 비고 |
|---|---|---|
| F3 (legacy 사용자 누락) | `apps/api-server/src/database/migrations/` 신규 backfill | 운영 DB 의 `kpa_members.activity_type='pharmacy_owner'` AND ra 누락 user 식별 → INSERT |
| F4 (직역 전환 후 복귀) | `apps/api-server/src/modules/auth/controllers/auth-account.controller.ts:211` 부근 | 부여 방향 코드 추가 — 단 frontend guard 정책 (`PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1`) 과의 일관성 결정 필요 |
| F1/F2 (가입/승인 자체 실패) | `apps/api-server/src/routes/kpa/controllers/member.controller.ts:540-614` | 트랜잭션 롤백 / 부분 실패 시 alert / 재시도 매커니즘 |
| 정책 변경 (activity_type 단독으로도 인정) | `apps/api-server/src/routes/kpa/controllers/me-context.controller.ts:43-65` | 단 freeze (`USER-OPERATOR-FREEZE-V1`) 정책 + role_assignments SSOT 원칙 충돌 — 추천도 낮음 |
| `/auth/me` 가 isStoreOwner 동봉 | `apps/api-server/src/modules/auth/controllers/auth-account.controller.ts:75-77` | KPA enrichment 분리 정책 (`WO-O4O-KPA-LOGIN-LATENCY-CLEANUP-V1`) 와 충돌 — Stage 1 timing window 만 단축 |

### 7-2. **수정 불필요한 위치 (사용자 가설과 반대)**

- `KpaGlobalHeader.tsx` — 이미 dual-check (line 97). 변경 불필요.
- `HubGuard.tsx` — 이미 dual-check (line 43). 변경 불필요.
- `navigation.ts` `filterContextualNav` — 단일 boolean 입력, 변경 불필요.

---

## 8. 후속 WO 초안 (3 단계)

### Phase 1 — 진단 (P0, 즉시)

**WO-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1**
- 범위: 운영 DB read-only SELECT (`docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` 정책 준수)
- 작업:
  1. `SELECT u.email, pp.activity_type, km.activity_type AS km_activity_type, (ra.role IS NOT NULL) AS has_store_owner_role FROM users u LEFT JOIN kpa_pharmacist_profiles pp ON ... LEFT JOIN kpa_members km ON ... LEFT JOIN role_assignments ra ON ra.user_id=u.id AND ra.role='kpa:store_owner' AND ra.is_active=true WHERE pp.activity_type='pharmacy_owner' OR km.activity_type='pharmacy_owner';`
  2. 누락자 수 + 식별
  3. 누락의 분포 (step1~step5 어느 단계에서 끊겼는지)
- 결과 → Phase 2 의 backfill 범위 결정 입력

### Phase 2 — Backfill (P0, Phase 1 후)

**WO-O4O-KPA-STOREOWNER-ROLE-BACKFILL-V1**
- 범위: `apps/api-server/src/database/migrations/` 신규 마이그레이션
- 작업: Phase 1 식별 사용자에 대해
  - organization (kpa-pharm-{bizno}) 누락 시 INSERT
  - organization_members(role=owner) 누락 시 INSERT
  - role_assignments(kpa:store_owner, is_active=true) INSERT (멱등)
- 검증: 다시 user-debug page step5 = ✅
- 정책: CLAUDE.md §0 — 사용자 승인 + CI/CD 경로

### Phase 3 — 재발 방지 (P1)

**WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-BIDIRECTIONAL-V1**
- 범위: [auth-account.controller.ts:211](../../apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L211) (현재 한 방향만 처리)
- 작업: `다른 직역 → pharmacy_owner` 전환 시 role 재부여
- 정책 결정 필요: frontend `PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1` 와의 정합 (현재 차단 정책 유지인지 / 완화하여 양방향 허용인지)

### Phase 4 — frontend dual-check 강화 (P2, 선택)

**WO-O4O-KPA-USER-CONTEXT-ACTIVITY-FALLBACK-V1**
- 범위: `/kpa/me-context` 응답 + frontend `isStoreOwner` 정의
- 작업: 정책 결정 후 — `isStoreOwner = role_assignments 또는 activity_type='pharmacy_owner'` 로 union
- 위험: role_assignments SSOT 원칙 (`WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1`) 위배. 권한 부여를 데이터 소스 두 곳에서 인정 → audit 어려움. **추천도 낮음**, Phase 1/2/3 로 해결 가능하면 채택 비권장.

---

## 9. 핵심 질문 답변

| # | 질문 | 답 |
|---|---|---|
| 1 | 상단 "약국 운영 허브" 메뉴는 어떤 조건에서 노출되는가? | `isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner) === true` ([KpaGlobalHeader.tsx:97](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L97)) |
| 2 | 프로필 드롭다운 "내 매장/내 약국" 메뉴 조건? | 동일 `isStoreOwner` 변수 ([KpaGlobalHeader.tsx:191](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L191)) |
| 3 | 조건이 `user.roles` 단일 check 인가? | **NO** — dual-check 이미 적용 중. 사용자 가설 반증. |
| 4 | `isStoreOwnerDual` 또는 `user.isStoreOwner` fallback 사용 중인가? | **YES**, 둘 다. 단 `user.isStoreOwner` 의 source 가 결국 `role_assignments` 라서 fallback 의 실효는 timing 회복에 한정 |
| 5 | operator/admin + store_owner multi-role 사용자는 메뉴 노출 대상인가? | **YES** — `isAdmin`, `isOperator`, `isStoreOwner` 각 독립 조건. 세 메뉴 모두 표시. |
| 6 | activity_type 만 있고 kpa:store_owner role 이 없는 경우 처리? | **메뉴 미노출** — 두 입력 모두 false. 본 IR 의 핵심 결함 시나리오 |
| 7 | header 가 stale JWT 를 회복하지 못하는가? | `/auth/me` 의 roles 는 role_assignments fresh 조회 (60s 캐시) 이므로 JWT stale 자체는 회복함. 단 role 이 ra 에 부재하면 회복 불가 |

---

## 10. 본 IR 의 범위 외

- 운영 DB 의 실제 누락자 수 / 식별 — Phase 1 WO 필요 (read-only SELECT)
- Backfill 마이그레이션 작성 — Phase 2 WO
- `PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1` 정책 변경 결정 — Phase 3 WO
- `/auth/me` 가 isStoreOwner 동봉 옵션 — `KPA-LOGIN-LATENCY-CLEANUP-V1` 정책 재검토 필요
- 코드 수정 / commit / push — 모두 본 IR 범위 외 (사용자 지시)

---

## 11. 최종 결론

1. 사용자 가설 (Header 가 단일 role check) 은 **반증** — header / HubGuard / PharmacyGuard 모두 이미 `isStoreOwnerDual` 적용 중.
2. 메뉴 미노출의 진짜 원인은 **role_assignments 에 `kpa:store_owner` 가 없는 사용자가 존재** 하기 때문.
3. dual-check 의 두 입력 (`user.roles`, `user.isStoreOwner`) 이 둘 다 **결국 같은 role_assignments 를 source 로** 한다 — fallback 의 실효는 60s 캐시 / async context 의 timing 회복에 한정.
4. 결정적 진단은 **`/__debug__/user?email=...`** 페이지의 step5 한 줄로 판가름.
5. 후속 작업은 **frontend 가 아니라 backend** — drift 감사 (Phase 1) → backfill (Phase 2) → 재발 방지 (Phase 3).
6. 정책 변경 (activity_type 단독 인정) 은 SSOT 위배 우려로 비권장.

---

*Status: Investigation Complete. No code changes / no commits. Awaiting Phase 1 (DB drift check) authorization.*
*Updated: 2026-05-17*
*Version: 1.0*
