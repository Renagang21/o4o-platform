# IR-O4O-LEGACY-ROLE-PREFIX-COMPATIBILITY-AUDIT-V1

> **목적**: legacy role prefix(`super_admin`, `admin`, `operator`, `manager`)와 `platform:` 접두사 체계의 충돌 위험 전수 조사
>
> **발단**: CHECK-O4O-HARD-DELETE-SERVICE-SCOPE-DISPOSABLE-ACCOUNT-V1 수행 중 운영 계정이 `super_admin`(legacy) 역할을 보유하고 있음을 발견. `isPlatformAdmin()`이 이를 인식하지 못해 삭제 범위 오판정 가능성 확인.
>
> **조사일**: 2026-05-22
> **상태**: 조사 완료 — 후속 WO 판단 대기

---

## 1. 핵심 발견

### 1-1. DB 현황 (production)

```
role_assignments 역할 분포 (15명 기준)
--
   2  super_admin          ← legacy, platform: 접두사 없음
   4  kpa:store_owner      ← 서비스 접두사 ✅
   1  kpa:admin            ← 서비스 접두사 ✅
   1  kpa:operator         ← 서비스 접두사 ✅
   1  glycopharm:admin     ← 서비스 접두사 ✅
   1  glycopharm:operator  ← 서비스 접두사 ✅
   1  cosmetics:admin      ← 서비스 접두사 ✅
   1  cosmetics:operator   ← 서비스 접두사 ✅
   1  cosmetics:store_owner← 서비스 접두사 ✅
   1  neture:admin         ← 서비스 접두사 ✅
   1  neture:operator      ← 서비스 접두사 ✅
   1  lms:instructor       ← 서비스 접두사 ✅

platform:admin          = 0  ← 없음
platform:super_admin    = 0  ← 없음
admin                   = 0  ← 없음 (super_admin과 별개)
operator                = 0
manager                 = 0
```

**결론**: `platform:` 접두사 역할은 단 1개도 존재하지 않는다. `super_admin` 2개가 legacy 형태로 잔존.

### 1-2. 핵심 불일치

```
isPlatformAdmin(['super_admin', 'kpa:admin', ...])
  → platform:admin 또는 platform:super_admin 없음
  → return FALSE

실제 의도: super_admin = 플랫폼 전체 관리자
인식 결과: 플랫폼 관리자 아님 → serviceScope 필터 적용됨
```

---

## 2. 코드별 Legacy Role 처리 현황

### 2-1. `isPlatformAdmin()` — `apps/api-server/src/utils/role.utils.ts:135`

```typescript
export function isPlatformAdmin(userRoles: string[]): boolean {
  return hasAnyServiceRole(userRoles, ['platform:admin', 'platform:super_admin']);
}
// 'super_admin' → FALSE (legacy 완전 미지원)
```

**상태**: `platform:` 접두사 필수. legacy `super_admin` 전혀 인식 안 함.

### 2-2. `requireAdmin` 미들웨어 — `apps/api-server/src/common/middleware/auth/authorization.middleware.ts`

```typescript
const isAdmin = await roleAssignmentService.hasAnyRole(user.id, [
  'admin',                // ← legacy 수용 (호환 레이어)
  'super_admin',          // ← legacy 수용 (호환 레이어)
  'platform:admin',       // ← prefixed
  'platform:super_admin', // ← prefixed
]);
```

**상태**: legacy + prefixed 양쪽 수용. WO 주석에 "role_assignments 마이그레이션 완료 전까지 legacy 유지"로 명시됨.

### 2-3. `extractServiceScope()` — `apps/api-server/src/utils/serviceScope.ts:42`

```typescript
for (const role of userRoles) {
  const parsed = parseServiceRole(role);   // "service:role" 형식만 파싱
  if (parsed && parsed.service !== 'platform') {
    keys.add(resolveServiceKey(parsed.service));
  }
}
// 'super_admin' → parseServiceRole 반환 null → 스킵됨
```

**Fallback** (라인 89-100):
```typescript
// 역할에서 serviceScope 없으면 JWT memberships로 대체
if (!scope.isPlatformAdmin && scope.serviceKeys.length === 0) {
  scope.serviceKeys = activeMembershipKeys;
}
```

**상태**: legacy role은 무시 → membership 기반 scope로 fallback.

### 2-4. `requireRole` 라우트 목록 — Legacy 포함

| 파일 | Legacy 역할 포함 여부 |
|------|-------------------|
| `routes/admin/users.routes.ts` | `['admin', 'super_admin', 'platform:admin', ...]` — HYBRID |
| `routes/v1/platformInquiry.routes.ts` | `['admin', 'super_admin']` — LEGACY ONLY |
| `routes/partner.routes.ts` | `['partner', 'admin', 'super_admin']` — LEGACY ONLY |
| `routes/operator/membership.routes.ts` | `['admin', 'super_admin', 'operator', 'manager', 'platform:admin', ..., 'neture:admin', ...]` — ALL 5 TYPES |
| `routes/operator/products.routes.ts` | 동일 |
| `routes/operator/stores.routes.ts` | 동일 |
| `routes/operator/analytics.routes.ts` | 동일 |
| `routes/content/content-templates.routes.ts` | HYBRID |

---

## 3. 실제 위험 시나리오

### Scenario A — 운영 계정 serviceScope 오판정 (실증됨)

```
sohae2100@gmail.com 역할:
  role_assignments: ['super_admin', 'kpa:admin', 'glycopharm:admin', 'cosmetics:admin', 'neture:admin', ...]

extractServiceScope() 처리:
  isPlatformAdmin(['super_admin', ...]) → FALSE (platform: 없음)
  kpa:admin       → serviceKey: 'kpa-society'
  glycopharm:admin → serviceKey: 'glycopharm'
  cosmetics:admin  → serviceKey: 'k-cosmetics'
  neture:admin     → serviceKey: 'neture'
  Result: { isPlatformAdmin: false, serviceKeys: ['kpa-society','glycopharm','k-cosmetics','neture'] }

deleteMember(mode='hard') 결과:
  DELETE service_memberships WHERE service_key = ANY(['kpa-society','glycopharm','k-cosmetics','neture'])
  → 4개 서비스 membership 모두 삭제 (의도: KPA만 삭제)
```

→ **실제 발생**: CHECK 중 glycopharm membership이 함께 삭제됨.

### Scenario B — 순수 super_admin 계정 (platform: 없음, 서비스 역할 없음)

```
가상 계정: platform_admin@o4o.com
role_assignments: ['super_admin']

extractServiceScope(['super_admin']):
  isPlatformAdmin → FALSE
  parseServiceRole('super_admin') → null → 스킵
  serviceKeys = [] → fallback to JWT memberships
  JWT memberships: [kpa-society:active]
  Result: { isPlatformAdmin: false, serviceKeys: ['kpa-society'] }

deleteMember(mode='hard') 결과:
  DELETE service_memberships WHERE service_key = ANY(['kpa-society'])
  → KPA membership만 삭제 (의도: 전 서비스 삭제)
  → 다른 서비스 데이터 보존됨 (안전 side)
  → 하지만 관리자 의도와 완전히 다름
```

### Scenario C — requireAdmin 통과 후 데이터 접근 불일치

```
super_admin 계정이 /api/v1/operator/members 접근:
  requireRole(['admin', 'super_admin', ...]) → ✅ PASS
  injectServiceScope → isPlatformAdmin=false, serviceKeys=[memberships]

getMembers() 조회:
  isPlatformAdmin=false → serviceKey 필터 적용
  → 본인의 membership 서비스 사용자만 조회됨
  → 의도: 전체 플랫폼 사용자 조회

결과: 로그인 성공, 접근 성공, 하지만 partial data만 노출
```

---

## 4. 위험 분류

| 위험 | 레벨 | 설명 |
|------|------|------|
| isPlatformAdmin 미인식 | **HIGH** | super_admin → isPlatformAdmin=false → serviceScope 필터 적용 → 전체 플랫폼 데이터 접근 불가 |
| 삭제 범위 오판정 | **HIGH** | 멀티 서비스 admin 계정으로 삭제 시 의도하지 않은 범위 삭제 (이미 실증됨) |
| 조회 범위 오판정 | **MEDIUM** | 전체 사용자 조회 의도하나 partial 반환 |
| requireRole 불일치 | **MEDIUM** | legacy만 있으면 platform: 추가 후 통과 못할 수 있음 (이미 legacy 수용 중이라 현재는 동작) |
| frontend 불일치 | **LOW** | USER-OPERATOR-FREEZE 위반 패턴이 frontend에 잔존 가능성 |

---

## 5. 안전 요소 (현재 보호되는 것)

1. **users row 삭제 금지**: `deleteMember()` H4에 명시적으로 `users` DELETE 없음 — legacy/prefixed 무관하게 안전
2. **service_memberships 범위 격리**: `service_key = ANY($2)` — 코드 로직은 정확히 구현됨
3. **requireAdmin 호환 레이어**: 현재 legacy role 보유 계정도 라우트 접근 가능 — 즉각적 서비스 장애 없음
4. **membership-guard**: `platform:super_admin` 접두사 필수 (WO-O4O-AUTH-RBAC-STABILIZATION-V1) — 별도 보호

---

## 6. 후속 WO 후보

| WO | 범위 | 우선순위 | 선행 조건 |
|----|------|---------|---------|
| **WO-O4O-LEGACY-ROLE-MIGRATION-V1** | role_assignments의 `super_admin` → `platform:super_admin`, `admin` → `platform:admin` 마이그레이션 | P1 | 이 IR 확정 후 |
| **WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1** | requireAdmin의 legacy 호환 레이어 제거, platform: only 전환 | P1 | 데이터 마이그레이션 완료 후 |
| **WO-O4O-OPERATOR-ROUTE-ROLE-CLEANUP-V1** | requireRole에서 legacy role 제거 (9개 라우트 파일) | P2 | requireAdmin 전환 후 |
| **WO-O4O-SUPER-ADMIN-SCOPE-TEST-V1** | platform:super_admin 계정으로 hard delete 단일 서비스 격리 재실증 | P2 | 데이터 마이그레이션 후 |

### 권장 실행 순서

```
1. WO-O4O-LEGACY-ROLE-MIGRATION-V1
   role_assignments: super_admin → platform:super_admin (2명)
   migration SQL: UPDATE role_assignments SET role='platform:super_admin' WHERE role='super_admin'
   → isPlatformAdmin() 즉시 인식

2. WO-O4O-REQUIREADMIN-PREFIXED-ONLY-V1
   requireAdmin에서 legacy role 제거
   → RBAC-FREEZE 준수 상태 달성

3. WO-O4O-SUPER-ADMIN-SCOPE-TEST-V1
   마이그레이션 후 단일 서비스 격리 재실증
```

---

## 7. 마이그레이션 SQL (P1 WO 참고용)

```sql
-- 검증 (read-only)
SELECT id, user_id, role, is_active
FROM role_assignments
WHERE role IN ('admin', 'super_admin', 'operator', 'manager')
ORDER BY role;

-- 마이그레이션 (사용자 승인 필수)
UPDATE role_assignments
SET role = 'platform:super_admin'
WHERE role = 'super_admin';

UPDATE role_assignments
SET role = 'platform:admin'
WHERE role = 'admin';
```

---

*조사: 2026-05-22*
*담당: CHECK-O4O-HARD-DELETE-SERVICE-SCOPE-DISPOSABLE-ACCOUNT-V1 부산물*
*상태: 조사 완료 — WO 확정 대기*
