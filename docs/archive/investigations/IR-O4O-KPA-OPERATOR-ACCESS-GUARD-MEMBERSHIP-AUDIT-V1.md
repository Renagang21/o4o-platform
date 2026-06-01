# IR-O4O-KPA-OPERATOR-ACCESS-GUARD-MEMBERSHIP-AUDIT-V1

**조사 일자**: 2026-05-16
**조사 기준**: main `292e3dcc9` (방금 pull한 최신 시점)
**조사 범위**: `/operator/*` 접근 시 "서비스 가입이 필요합니다" 화면이 표시되는 원인. `kpa:admin` / `kpa:operator` role 보유 계정이 차단되는 이유.
**조사 방식**: 정적 코드 분석 + migration 내용 검토. 코드/DB 수정 없음. DB 직접 조회는 환경 권한(gcloud sql 권한) 미부여로 미수행 — §11 검증 방법 참조.

---

## 0. 핵심 결론 (TL;DR)

**원인은 2층 구조이고 둘 다 데이터 상태(state) 문제**. 코드 자체는 의도된 정책대로 동작 중:

| 후보 | 설명 | 영향 |
|------|------|------|
| **#1 (★★★ 결정적)** | **`service_memberships.service_key` 의 키 불일치** — 백필 migration 이 `'kpa'` 로 row 를 만들었고, 가드는 `'kpa-society'` 를 찾는다 | 백필로 생성된 모든 kpa operator/admin 계정이 차단 |
| **#2 (★★ 의도된 정책)** | **`kpa:admin` / `kpa:operator` role 단독은 우회 불가** — `platform:super_admin` 만 MembershipGate 를 통과 | service membership 이 없거나 inactive 면 role 이 있어도 차단 (코드 의도) |

> **사용자 관측 증상 ("UI 표시는 정상인데 /operator 접근만 차단")** 은 두 endpoint 의 데이터 출처가 다르기 때문 — UI 메뉴 가시성은 `/kpa/me-context` 가 `kpa_members` 를 읽고, `/operator` 가드는 `/auth/status` 가 `service_memberships` 를 읽는다. 두 테이블은 서로 다른 source 라 한 쪽만 양호한 상태가 가능.

**Canonical 기준** (코드 정책으로 명문화):
- `/operator/*` 접근 = `role_assignments` 의 적절한 role + `service_memberships` 의 `(service_key='kpa-society', status='active')` row **둘 다 필요**.
- `platform:super_admin` 만 예외.
- `kpa_members` 는 KPA 도메인 컨텍스트(약사 활동 유형, 조직 소속)이지 **operator 자격 판정에 사용되지 않음**.

---

## 1. `/operator` 접근 흐름 (Frontend + Backend Full Chain)

### 1.1 Frontend chain

```
URL /operator/*
  ↓
App.tsx 라우트 정의
  ↓
OperatorRoutes.tsx — <RoleGuard allowedRoles={[...PLATFORM_ROLES]}> 진입 ([:57](services/web-kpa-society/src/routes/OperatorRoutes.tsx))
  ↓
RoleGuard — JWT roles 와 PLATFORM_ROLES (=['kpa:admin','kpa:operator','platform:super_admin']) 교집합 ([:38-42](services/web-kpa-society/src/lib/role-constants.ts))
  ↓ pass 시
RoleGuard 내부에서 enforceMembership=true(기본값) 분기 → <MembershipGate> ([RoleGuard.tsx:57-59](services/web-kpa-society/src/components/auth/RoleGuard.tsx))
  ↓
MembershipGate ([MembershipGate.tsx:30-55](services/web-kpa-society/src/components/auth/MembershipGate.tsx))
  → isAuthenticated 체크
  → isPlatformSuperAdmin(user) → 통과
  → getServiceMembershipStatus(user, 'kpa-society') → 'active' 면 통과 / 아니면 차단 화면
```

### 1.2 Backend chain (API 호출 시)

```
Cloud Run /api/v1/kpa/operator/*
  ↓
authenticate middleware (JWT 검증)
  ↓
requireKpaScope('kpa:operator') ([operator-summary.controller.ts:31-42](apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts))
  ↓
membership-guard.middleware.ts ([:58-123](apps/api-server/src/common/middleware/membership-guard.middleware.ts))
  → KPA_SCOPE_CONFIG.platformBypass=false → platform:super_admin 우회 안 함
  → JWT payload.memberships 에서 serviceKey === resolveMembershipKey('kpa') === 'kpa-society' 찾기
  → 못 찾으면 403 MEMBERSHIP_NOT_FOUND
  → 찾았는데 status !== 'active' 면 403 MEMBERSHIP_NOT_ACTIVE
  → 통과 시 scopeRoleMapping ({'kpa:operator': ['kpa:operator','kpa:admin']}) 으로 role 매칭 ([service-configs.ts:23-37](packages/security-core/src/service-configs.ts))
```

→ **frontend MembershipGate 와 backend membership-guard 가 같은 정책(`service_memberships` 의 `kpa-society` 행 + active) 을 적용**. 둘 다 통과시키는 우회는 `platform:super_admin` 하나뿐.

---

## 2. "서비스 가입이 필요합니다" 렌더 위치 + 정확한 조건

### 2.1 소스 위치

[services/web-kpa-society/src/components/auth/MembershipGate.tsx:55, 62-68](services/web-kpa-society/src/components/auth/MembershipGate.tsx#L55-L68)

```tsx
const STATUS_MESSAGES: Record<...> = {
  none:      { title: '서비스 가입이 필요합니다', ... },  // ← 이 화면
  pending:   { title: '가입 승인 대기 중', ... },
  rejected:  { title: '가입 신청 반려', ... },
  suspended: { title: '서비스 이용 정지', ... },
  withdrawn: { title: '탈퇴 처리된 서비스', ... },
};

// 가드 본체 (line 30-55)
const status = getServiceMembershipStatus(user, serviceKey);  // serviceKey='kpa-society'
if (status === 'active') return <>{children}</>;
return <MembershipStatusScreen status={status} serviceKey={serviceKey} />;
```

### 2.2 status 가 `'none'` 으로 결정되는 정확한 조건

[lib/membershipGate.ts:40-58](services/web-kpa-society/src/lib/membershipGate.ts#L40-L58)

```ts
export function getServiceMembershipStatus(user, serviceKey = 'kpa-society') {
  if (!user) return 'none';
  const ms = user.memberships ?? [];
  const m = ms.find((x) => x?.serviceKey === serviceKey);
  if (!m) return 'none';     // ← 여기서 'none' 반환 (사용자 케이스의 가장 가능성 높은 경로)
  switch (m.status) { case 'active'/'pending'/.../'withdrawn': return m.status; default: return 'none'; }
}
```

→ "서비스 가입이 필요합니다" 가 뜨는 사용자 케이스는 거의 확실히 **`memberships` 배열에 `serviceKey === 'kpa-society'` 인 row 자체가 없는 상태**.

### 2.3 operator/admin 우회 분기 부재

[lib/membershipGate.ts:64-66](services/web-kpa-society/src/lib/membershipGate.ts#L64-L66) 의 명시적 주석:

```ts
/**
 * 주의: 'kpa:admin' / 'kpa:operator' 등 service-prefixed role 은
 * bypass 하지 않는다 — WO 정책상 role 만 있고 membership 없으면 이용 불가.
 */
```

→ **버그가 아니라 의도된 정책**. WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1 의 명시적 결정.

---

## 3. role_assignments vs service_memberships vs kpa_members — 3 테이블 사용 매트릭스

| 테이블 | `/auth/status` | `/kpa/me-context` | Frontend MembershipGate | Backend operator guard |
|--------|:--------------:|:-----------------:|:-----------------------:|:----------------------:|
| `role_assignments` (is_active=true) | ✅ `roles` 배열 출처 | ✅ `isStoreOwner` 판정 | ❌ (직접 안 봄) | ✅ scope role 매핑 |
| `service_memberships` | ✅ `memberships` 배열 출처 | ❌ (안 봄) | ✅ `serviceKey='kpa-society'` 검색 | ✅ JWT memberships → 검색 |
| `kpa_members` | ❌ | ✅ `kpaMembership` 객체 출처 | ❌ | ❌ |

**확정 출처**:
- `/auth/status` 의 `memberships` — `apps/api-server/src/modules/auth/controllers/auth-account.controller.ts:79-86` 의 raw SQL `SELECT service_key, status, role FROM service_memberships WHERE user_id = $1`
- `/kpa/me-context` 의 `kpaMembership` — `apps/api-server/src/routes/kpa/controllers/me-context.controller.ts:40-65` 의 LEFT JOIN on `kpa_members`

→ **UI 메뉴 표시(드롭다운 등) 가 `/kpa/me-context` 또는 `roles` 만 보면, 사용자가 "운영자 메뉴는 보이는데 들어가면 차단" 경험을 한다.**

---

## 4. role vs membership 판정 차이 (핵심 mismatch)

### 4.1 두 source 의 독립적 lifecycle

| Event | role_assignments 변경 | service_memberships 변경 | kpa_members 변경 |
|-------|:--------------------:|:-----------------------:|:----------------:|
| 회원 가입 신청 → 승인 | ❌ (자동 X) | ✅ (회원 가입 흐름) | ✅ |
| Admin 이 user 에게 operator role 부여 | ✅ | ⚠ (코드/migration 에 의존) | ❌ |
| Operator 가 admin 으로 승격 | ✅ | ⚠ | ❌ |
| Backfill migration | ✅ | ⚠ (key mismatch 후보) | ❌ |

→ **service_memberships 가 다른 두 테이블과 자동 동기화되지 않는 점이 본 격차의 구조적 원인**.

### 4.2 SCOPE_TO_MEMBERSHIP_KEY 매핑 (backend)

[apps/api-server/src/common/middleware/membership-guard.middleware.ts:43-50](apps/api-server/src/common/middleware/membership-guard.middleware.ts#L43-L50)

```ts
const SCOPE_TO_MEMBERSHIP_KEY: Record<string, string> = {
  'kpa': 'kpa-society',
  'cosmetics': 'k-cosmetics',
};

function resolveMembershipKey(scopeServiceKey: string): string {
  return SCOPE_TO_MEMBERSHIP_KEY[scopeServiceKey] || scopeServiceKey;
}
```

→ scope 는 `'kpa'`, membership 은 `'kpa-society'`. **이 매핑 자체가 mismatch 유발 후보를 만든다** (§6 참조).

---

## 5. canonical bootstrap 계정의 의도된 상태

[apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts) 의 표(line 6-18):

| 계정 | service_key | role_assignment |
|------|-------------|-----------------|
| super-admin@o4o.com | (없음) | super_admin |
| **kpa-admin@o4o.com** | **kpa-society** | **kpa:admin** |
| **kpa-operator@o4o.com** | **kpa-society** | **kpa:operator** |
| phamacy1@o4o.com | kpa-society | kpa:pharmacist |
| neture-operator@o4o.com | neture | neture:operator |
| kcos-admin@o4o.com | k-cosmetics | cosmetics:admin |
| kcos-operator@o4o.com | k-cosmetics | cosmetics:operator |
| glyco-operator@o4o.com | glycopharm | glycopharm:operator |

→ **새 bootstrap migration 으로 생성된 계정은 `service_memberships.service_key='kpa-society'` 가 정확히 들어감**. 이들 계정은 가드를 통과해야 정상.

**비밀번호**: `process.env.SEED_BOOTSTRAP_PASSWORD || 'O4oBootstrap1!'` (line 37). 프로덕션에선 환경변수로 override 필수.

---

## 6. 핵심 원인 후보 #1 — **백필 migration 의 service_key 키 불일치 (★★★ 결정적)**

### 6.1 결정적 증거

[apps/api-server/src/database/migrations/20260318100000-BackfillServiceMembershipsFromRoles.ts:42-60](apps/api-server/src/database/migrations/20260318100000-BackfillServiceMembershipsFromRoles.ts#L42-L60)

```sql
INSERT INTO service_memberships (id, user_id, service_key, role, status, ...)
SELECT
  gen_random_uuid(),
  ra.user_id,
  SPLIT_PART(ra.role, ':', 1),     -- ★★★ 'kpa:admin' → 'kpa' ★★★
  SPLIT_PART(ra.role, ':', 2),     -- 'kpa:admin' → 'admin'
  'active',
  NOW(), NOW()
FROM role_assignments ra
LEFT JOIN service_memberships sm ON ...
WHERE ra.is_active = true AND ra.role LIKE '%:%' AND sm.id IS NULL
ON CONFLICT (user_id, service_key) DO NOTHING
```

이 backfill 은:
- `'kpa:admin'` → `service_memberships.service_key='kpa'` 로 row 생성
- `'kpa:operator'` → `service_memberships.service_key='kpa'`

그러나:
- frontend `MembershipGate` — `getServiceMembershipStatus(user, 'kpa-society')` 검색
- backend `membership-guard` — `SCOPE_TO_MEMBERSHIP_KEY['kpa'] = 'kpa-society'` 로 변환 후 검색

→ **둘 다 `'kpa-society'` 를 찾는데, backfill 은 `'kpa'` 를 넣는다.** 따라서 **이 migration 으로 backfill 된 계정은 `MEMBERSHIP_NOT_FOUND` 로 영구 차단**.

### 6.2 보조 증거 — Normalize migration 의 적용 범위

[apps/api-server/src/database/migrations/20260411300000-NormalizeKpaServiceKeys.ts](apps/api-server/src/database/migrations/20260411300000-NormalizeKpaServiceKeys.ts)

이 migration 은 `'kpa' → 'kpa-society'` 정규화를 수행하지만 **대상은 `product_approvals` 와 `organization_product_listings` 두 테이블에 한정**. **`service_memberships` 는 정규화 대상이 아님**.

→ 따라서 백필 잔재가 그대로 남아있을 수 있음.

### 6.3 가설 확인 SQL (사용자 또는 권한자가 실행)

```sql
-- 백필로 'kpa' 키로 들어간 잔재 조회
SELECT user_id, service_key, role, status, created_at
FROM service_memberships
WHERE service_key = 'kpa'
ORDER BY created_at DESC;
```

> 결과가 1+ rows 면 본 후보 #1 확정.

```sql
-- 특정 계정의 정확한 상태 확인 (예: kpa-admin@o4o.com)
SELECT u.email,
       (SELECT array_agg(role) FROM role_assignments WHERE user_id=u.id AND is_active=true) AS active_roles,
       (SELECT json_agg(json_build_object('service_key', service_key, 'status', status, 'role', role))
        FROM service_memberships WHERE user_id=u.id) AS memberships,
       (SELECT json_build_object('status', status, 'role', role, 'organization_id', organization_id)
        FROM kpa_members WHERE user_id=u.id LIMIT 1) AS kpa_member
FROM users u
WHERE u.email = 'kpa-admin@o4o.com';
```

> `memberships` 에 `serviceKey='kpa-society'` 가 없거나 status≠'active' 면 차단 원인 확정.

---

## 7. 핵심 원인 후보 #2 — operator/admin 우회 부재 (★★ 의도된 정책)

`platform:super_admin` 외에는 모든 role 이 service membership active 를 요구한다 — 이는 [WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1](services/web-kpa-society/src/components/auth/MembershipGate.tsx#L4) 의 명시적 결정.

- 의도: **role 만 있고 membership 없는 계정은 서비스 이용 불가** ([membershipGate.ts:8-11](services/web-kpa-society/src/lib/membershipGate.ts#L8-L11))
- 결과: 백필 migration 또는 admin UI 에서 role 만 부여하고 membership 동기화를 빼먹으면 차단

**이 정책 자체는 변경하지 않는 것이 권장됨** — service_memberships 가 service 이용 자격의 canonical 출처라는 원칙이 평행 서비스(neture/cosmetics/glycopharm) 와 동일하게 정렬됨.

---

## 8. operator/admin canonical 기준 (정리)

```
operator/admin 접근 가능 조건 (코드 기준 canonical):

  (role_assignments.role ∈ {'kpa:admin', 'kpa:operator'} AND is_active=true)
    AND
  EXISTS (
    SELECT 1 FROM service_memberships
    WHERE user_id = $current_user
      AND service_key = 'kpa-society'      -- ← 'kpa' 아님, 'kpa-society' 임
      AND status = 'active'
  )

  + 우회 1건: role_assignments.role = 'platform:super_admin' AND is_active=true
              (platformBypass=false 라 super_admin도 'platform' scope에서만 우회. KPA scope에서는 평등하게 membership 필요)
```

> **`kpa_members` 는 자격 판정에 사용되지 않음**. KPA 도메인 컨텍스트(약사 활동 유형, 조직 소속)이지 operator 자격 게이트가 아니다.
>
> **legacy fallback 없음**. `'kpa'` 키로 들어간 service_membership 은 자동 매핑되지 않는다 (SCOPE_TO_MEMBERSHIP_KEY는 scope→membership 방향만 변환, 데이터를 fix하지 않음).

---

## 9. 문제 원인 정리 (최종)

| # | 원인 | 메커니즘 | 영향 받는 계정 군 |
|---|------|----------|-------------------|
| 1 | **백필 migration `service_key='kpa'`** | `BackfillServiceMembershipsFromRoles20260318100000` 가 SPLIT_PART 로 `'kpa'` 키 생성. 가드는 `'kpa-society'` 검색 | 본 migration 실행 시점에 role_assignments 에 `kpa:admin`/`kpa:operator` 만 있던 모든 계정 |
| 2 | **service_memberships row 부재** | admin UI 에서 operator 부여 시 role_assignments 만 INSERT, service_memberships INSERT 누락 | 신규 admin UI 로 생성된 operator (해당 코드 경로가 fix 됐는지 별도 확인 필요) |
| 3 | **bootstrap seed 미실행 환경** | `BootstrapCanonicalSeedAccounts20260927100000` 미실행 시 표 안의 계정 자체 부재 | 신규 환경 / 일부 staging |
| 4 | **`/auth/status` JWT 캐시** | service_memberships 변경 후에도 JWT 재발급 전에는 stale `memberships` 사용 | 권한 부여 직후 재로그인 안 한 세션 |

→ 사용자 케이스에서 가장 가능성 높은 것: **#1 (백필 미스매치)** 또는 **#3 (seed 미실행)**.

---

## 10. 수정 방향 후보 (코드 변경 없음 — 권고만)

### 10.1 데이터 수정 (즉시 해결)

**옵션 A — 백필 잔재 정규화 migration 신규** (권장):

```sql
-- 새 migration: 20260927200000-NormalizeServiceMembershipsKpaKey.ts
UPDATE service_memberships
SET service_key = 'kpa-society', updated_at = NOW()
WHERE service_key = 'kpa'
  AND NOT EXISTS (  -- 동일 user 가 이미 'kpa-society' 가지면 skip (UNIQUE 충돌 방지)
    SELECT 1 FROM service_memberships sm2
    WHERE sm2.user_id = service_memberships.user_id
      AND sm2.service_key = 'kpa-society'
  );

-- 그 후 중복 잔재 정리
DELETE FROM service_memberships
WHERE service_key = 'kpa'
  AND EXISTS (
    SELECT 1 FROM service_memberships sm2
    WHERE sm2.user_id = service_memberships.user_id
      AND sm2.service_key = 'kpa-society'
  );
```

- 멱등 안전. `NormalizeKpaServiceKeys20260411300000` 패턴 그대로 service_memberships 까지 확장.
- 영향: 후보 #1 계정군 일괄 복구.

**옵션 B — 백필 migration 자체 수정** (소급):
- `BackfillServiceMembershipsFromRoles20260318100000` 의 `SPLIT_PART(ra.role, ':', 1)` 부분에 `CASE WHEN ... = 'kpa' THEN 'kpa-society' ... END` 매핑 추가.
- 단점: 이미 실행된 migration 을 수정하면 prod 와 dev 의 상태가 갈림. 새 normalize migration (옵션 A) 이 안전.

### 10.2 코드 정렬 (보조)

**옵션 C — Backfill migration 의 매핑 일관성**:
- `SCOPE_TO_MEMBERSHIP_KEY` 가 `'kpa' → 'kpa-society'` 로 매핑하는 것을 backfill 도 동일하게 따르도록.
- 신규 migration 이 추가될 때마다 이 매핑을 import 해서 사용.

**옵션 D — 가드 측 fallback (비추)**:
- MembershipGate 에서 `serviceKey='kpa-society'` 가 없으면 `serviceKey='kpa'` 도 fallback 검색.
- 단점: legacy 키를 영구 허용하게 됨. canonical 표준 흐려짐. **비권장**.

### 10.3 admin UI 보완 (장기)

- admin 측 "operator 권한 부여" UI가 `role_assignments` 만 쓰지 말고 동시에 `service_memberships` upsert 하도록.
- 별도 WO 후보: `WO-O4O-ADMIN-OPERATOR-CREATION-SERVICE-MEMBERSHIP-SYNC-V1`.

### 10.4 권고 조합

1. **즉시** — 옵션 A (normalize migration) 작성 + apply
2. **장기** — 옵션 C (backfill 일관성 codify) + 옵션 D 의 부재 명문화 (canonical 키 표준 유지)

---

## 11. 검증 방법

본 IR 은 정적 분석 + migration 검토 기반. 실제 DB 상태 확인은 다음 단계 필요 (Claude Code 권한 범위 외 — 사용자 또는 권한자 수행):

### 11.1 코드 측 검증 (수행 완료)
- ✅ `/operator/*` route guard chain (frontend) — OperatorRoutes → RoleGuard → MembershipGate
- ✅ `/api/v1/kpa/operator/*` guard chain (backend) — authenticate → requireKpaScope → membership-guard
- ✅ `/auth/status` 응답 shape + 데이터 출처 — service_memberships raw SQL
- ✅ `/kpa/me-context` 응답 shape + 데이터 출처 — kpa_members LEFT JOIN
- ✅ MembershipGate "서비스 가입이 필요합니다" 렌더 조건 정확히 — status='none' (memberships 에 'kpa-society' 키 부재)
- ✅ Backfill / Normalize / Bootstrap migration 내용 비교

### 11.2 DB 측 검증 (미수행 — 사용자 실행 권장)

```bash
gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform
```

```sql
-- 후보 #1 검증: 백필 잔재 (kpa 키) 카운트
SELECT service_key, status, COUNT(*)
FROM service_memberships
GROUP BY service_key, status
ORDER BY service_key, status;

-- 후보 #3 검증: bootstrap 계정 존재 + 정확한 키
SELECT u.email, sm.service_key, sm.status, sm.role,
       (SELECT array_agg(role) FROM role_assignments WHERE user_id=u.id AND is_active=true) AS roles
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id
WHERE u.email IN ('kpa-admin@o4o.com', 'kpa-operator@o4o.com', 'super-admin@o4o.com');

-- 실제 영향 받는 user 식별
SELECT u.email, ra.role
FROM users u
JOIN role_assignments ra ON ra.user_id = u.id
WHERE ra.is_active = true
  AND ra.role IN ('kpa:admin', 'kpa:operator')
  AND NOT EXISTS (
    SELECT 1 FROM service_memberships sm
    WHERE sm.user_id = u.id
      AND sm.service_key = 'kpa-society'
      AND sm.status = 'active'
  );
```

### 11.3 브라우저 측 검증 (사용자 수행 권장)

```
1. /operator/* 진입 → "서비스 가입이 필요합니다" 확인
2. DevTools Network → /api/v1/auth/status 응답의 user.memberships 확인
   - serviceKey='kpa-society' 인 항목 존재 여부
   - 항목 status 값
3. DevTools Network → /api/v1/kpa/me-context 응답의 kpaMembership 확인
   - 두 endpoint 간의 mismatch 확인 (kpa_members 는 있는데 service_memberships 는 없는 케이스)
```

---

## 12. 산출물 체크리스트

- [x] `/operator` 접근 흐름 — frontend + backend (§1)
- [x] 실제 차단 조건 — `serviceKey='kpa-society'` 의 `status='active'` 부재 (§2)
- [x] "서비스 가입 필요" 렌더 위치 — `MembershipGate.tsx:55, 62-68` (§2)
- [x] role vs membership 판정 차이 — service_memberships 가 자동 동기화되지 않음 (§4)
- [x] operator/admin canonical 기준 — role_assignments + service_memberships 둘 다 필요, kpa_members 무관 (§8)
- [x] bootstrap 계정 의도된 상태 — 표 명시 (§5)
- [x] legacy fallback 존재 여부 — 없음. 키 자동 매핑은 가드 측 SCOPE_TO_MEMBERSHIP_KEY 뿐이고 데이터 fix 는 안 함 (§8)
- [x] 문제 원인 정리 — 4건 (§9)
- [x] 수정 방향 후보 — 데이터 normalize migration 권장 (§10)
- [x] 작업 규칙 준수 — 조사만 수행, 코드/DB 수정 0건

---

*IR-O4O-KPA-OPERATOR-ACCESS-GUARD-MEMBERSHIP-AUDIT-V1*
*Updated: 2026-05-16*
*Status: Investigation Complete — DB 측 검증 후 normalize migration 진행 권장*
