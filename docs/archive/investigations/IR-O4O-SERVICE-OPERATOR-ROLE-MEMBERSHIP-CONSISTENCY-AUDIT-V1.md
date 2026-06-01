---
id: IR-O4O-SERVICE-OPERATOR-ROLE-MEMBERSHIP-CONSISTENCY-AUDIT-V1
title: "서비스 운영자 role 부여 vs service_memberships 정합성 감사"
status: investigation-complete
date: 2026-05-15
type: investigation
scope:
  - admin.neture.co.kr 에서 service-prefixed operator/admin role 부여 시 service_memberships 동기 보정 동작 점검
  - role prefix (kpa/cosmetics) ↔ canonical service_key (kpa-society/k-cosmetics) 불일치 식별
  - KPA-Society MembershipGate + RoleGuard 통과 정책 정리
  - 운영자 지정 시 membership 자동 보정 정책 결정 입력 자료
related:
  - WO-O4O-OPERATOR-CREATION-FLOW-FIX-V1 (현행 ensureServiceMemberships 도입 — 동시에 bug 도입)
  - WO-O4O-KPA-MEMBERSHIP-SYNC-FIX-V1 (auth-register canonical alias)
  - WO-O4O-BACKEND-MEMBERSHIP-GUARD-CANONICALIZATION-V1 (role-only bypass 제거)
  - WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1 (frontend MembershipGate)
---

# IR-O4O-SERVICE-OPERATOR-ROLE-MEMBERSHIP-CONSISTENCY-AUDIT-V1

> admin.neture.co.kr 에서 `kpa:operator` / `kpa:admin` role 을 부여한 사용자가 KPA-Society `/operator` 진입 시 "서비스 가입이 필요합니다" 안내로 차단되는 현상의 원인을 코드 단위로 전수 감사한다. 코드 변경 없음 — 후속 정책 결정 및 fix WO 발행을 위한 근거 자료.

---

## 0. Executive Summary

| 항목 | 값 |
|---|---|
| 근본 원인 | `AdminUserController.ensureServiceMemberships` 가 role prefix(`kpa`)를 canonical service_key(`kpa-society`)로 정규화하지 않고 raw 값으로 `service_memberships` row 를 생성 |
| 영향 서비스 | **KPA-Society** (`kpa` → `kpa-society`), **K-Cosmetics** (`cosmetics` → `k-cosmetics`) |
| Neture / GlycoPharm | 영향 없음 (role prefix 와 service_key 가 동일) |
| 정책 | role 만으로 진입 차단은 **이미 canonical 정책** (WO-O4O-BACKEND-MEMBERSHIP-GUARD-CANONICALIZATION-V1). membership active 필수. |
| Data drift | `service_memberships.service_key` 에 `'kpa'` / `'kpa-society'` **혼재** 가능 (`marketTrialController.ts:93` 의 `IN ('kpa', 'kpa-society')` 쿼리가 이를 시사) |
| 위험도 | **중** — UX 차단 + 일부 코드는 raw key 읽기로 우회 중이지만 frontend MembershipGate 는 canonical 만 인정 |
| 권장 fix | 5단계 WO (P1: ensureServiceMemberships canonical 적용 / P2: drift 데이터 정합 / P3: 정책 결정 / P4: alias 단일 출처 / P5: 테스트) |

**핵심 결론**: 운영자 role 부여 시 membership 동기 보정은 **이미 구현되어 있으나** (`AdminUserController.ensureServiceMemberships`) **canonical service_key alias 가 누락되어** KPA / K-Cosmetics 에서만 깨진다. 정책 변경이 아니라 **단순 버그 fix + 데이터 정합** 으로 해결 가능.

---

## 1. Scope & Method

### 1-1. 조사 대상
- 백엔드 admin role 부여 API: `apps/api-server/src/controllers/admin/AdminUserController.ts`
- RBAC SSOT: `apps/api-server/src/modules/auth/services/role-assignment.service.ts`
- Membership canonical alias: `apps/api-server/src/common/middleware/membership-guard.middleware.ts`, `apps/api-server/src/utils/serviceScope.ts`, `apps/api-server/src/utils/store-owner.utils.ts`
- auth-register canonical mapping: `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`
- 프론트엔드 KPA-Society guard 체인: `services/web-kpa-society/src/components/auth/RoleGuard.tsx`, `MembershipGate.tsx`, `services/web-kpa-society/src/lib/membershipGate.ts`
- 비교 대상: `services/web-{neture,k-cosmetics,glycopharm}/src/lib/membershipGate.ts`

### 1-2. 조사 범위 외
- DB 실제 상태 (read-only SELECT) — 본 IR 작성 시점에 `gcloud sql connect` 컨텍스트 차이로 미실행. §5-2 의 권장 SQL 로 별도 검증 필요.
- 코드 수정 / 마이그레이션 발행 — 모두 본 IR 범위 외.

---

## 2. 현행 동작 분석

### 2-1. admin.neture.co.kr 에서 operator/admin role 부여 시 흐름

**Frontend** ([apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx](../../apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx) `handleSubmit`):
```ts
// 신규
POST /admin/users { email, password, ..., roles: ['kpa:operator'] }
// 수정
PUT /admin/users/:id { ..., roles: ['kpa:operator'] }
```

**Backend** ([apps/api-server/src/controllers/admin/AdminUserController.ts](../../apps/api-server/src/controllers/admin/AdminUserController.ts)):
- `createUser` (line ~178-258) — 신규 사용자 생성 + roleAssignmentService.assignRole + `ensureServiceMemberships(savedUser.id, rolesToAssignNew)` (line 257)
- `updateUser` (line ~260-228) — 기존 사용자 role 추가/제거 + `ensureServiceMemberships(existingUser.id, rolesToAssign)` (line 219)

→ 즉 admin role 부여는 `role_assignments` + `service_memberships` 둘 다 보정한다. **설계 의도는 정확하다.**

### 2-2. `ensureServiceMemberships` 구현 (line 18-46)

```ts
private ensureServiceMemberships = async (userId: string, roles: string[]): Promise<void> => {
  const smRepo = AppDataSource.getRepository<ServiceMembership>('ServiceMembership');
  const processedServices = new Set<string>();

  for (const r of roles) {
    const parts = r.split(':');
    if (parts.length === 2) {
      const [serviceKey, roleName] = parts;       // ⚠ raw prefix 그대로
      if (!processedServices.has(serviceKey)) {
        processedServices.add(serviceKey);
        const existing = await smRepo.findOne({ where: { userId, serviceKey } as any });
        if (!existing) {
          const membership = smRepo.create({
            userId,
            serviceKey,                              // ⚠ 'kpa' 그대로 저장
            status: 'active',
            role: roleName,
          } as any);
          await smRepo.save(membership);
        } else if ((existing as any).status !== 'active') {
          (existing as any).status = 'active';
          (existing as any).role = roleName;
          await smRepo.save(existing);
        }
      }
    }
  }
};
```

**결함**: `kpa:operator` 입력 시:
- `serviceKey = 'kpa'` (raw)
- `INSERT INTO service_memberships (service_key, ...) VALUES ('kpa', ...)`

그러나 canonical `service_key` 는 `'kpa-society'` 이다. (다음 §2-3 참조)

### 2-3. Canonical `service_key` 값과 alias 매핑

[services/web-kpa-society/src/lib/membershipGate.ts:14](../../services/web-kpa-society/src/lib/membershipGate.ts):
```ts
export const SERVICE_KEY = 'kpa-society' as const;
```

[services/web-k-cosmetics/src/lib/membershipGate.ts:12](../../services/web-k-cosmetics/src/lib/membershipGate.ts):
```ts
export const SERVICE_KEY = 'k-cosmetics' as const;
```

→ frontend MembershipGate 는 정확히 이 값으로 `user.memberships.find(m => m.serviceKey === 'kpa-society')` 를 검색한다.

**Backend 의 canonical alias 정의** ([apps/api-server/src/common/middleware/membership-guard.middleware.ts:43-50](../../apps/api-server/src/common/middleware/membership-guard.middleware.ts)):
```ts
const SCOPE_TO_MEMBERSHIP_KEY: Record<string, string> = {
  'kpa': 'kpa-society',
  'cosmetics': 'k-cosmetics',
};

function resolveMembershipKey(scopeServiceKey: string): string {
  return SCOPE_TO_MEMBERSHIP_KEY[scopeServiceKey] || scopeServiceKey;
}
```

이 매핑은 **`AdminUserController.ensureServiceMemberships` 에서 사용되지 않는다**. 동일 매핑이 코드 4곳에 중복 정의되어 있다:

| 파일 | 매핑명 |
|---|---|
| `apps/api-server/src/common/middleware/membership-guard.middleware.ts:43` | `SCOPE_TO_MEMBERSHIP_KEY` |
| `apps/api-server/src/utils/serviceScope.ts:19` | `ROLE_PREFIX_TO_SERVICE_KEY` |
| `apps/api-server/src/utils/store-owner.utils.ts:49-52` | (인라인) |
| `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts:54` | 인라인 `'kpa' → 'kpa-society'` (cosmetics 누락) |

`auth-register.controller.ts:54` 는 인라인이고 `cosmetics → k-cosmetics` alias 가 누락되어 있어 K-Cosmetics 회원가입에도 잠재 결함 있음 (별도 확인 필요).

### 2-4. service_key 매핑 매트릭스

| Role prefix | Canonical `service_key` | 일치 여부 | 현행 ensureServiceMemberships 결과 |
|---|---|---|---|
| `kpa:` | `kpa-society` | ❌ 불일치 | `service_key='kpa'` 저장 → MembershipGate 차단 |
| `cosmetics:` | `k-cosmetics` | ❌ 불일치 | `service_key='cosmetics'` 저장 → MembershipGate 차단 |
| `neture:` | `neture` | ✅ | 정상 |
| `glycopharm:` | `glycopharm` | ✅ | 정상 |
| `glucoseview:` | `glucoseview` | ✅ (deprecated) | 정상 (서비스 폐지됨 — IR-GLUCOSEVIEW-RESIDUAL 참조) |
| `platform:` | `platform` | ✅ | 정상 (super_admin 전역) |

### 2-5. KPA-Society `/operator` 진입 chain

**진입 시퀀스** ([services/web-kpa-society/src/components/auth/RoleGuard.tsx](../../services/web-kpa-society/src/components/auth/RoleGuard.tsx)):
```
1. RoleGuard (allowedRoles=['kpa:admin','kpa:operator','platform:super_admin',...])
   └─ user.roles.some(r => allowedRoles.includes(r)) 체크
   └─ pass 시 enforceMembership=true (default) 면 ↓
2. MembershipGate (serviceKey='kpa-society')
   └─ super_admin 예외 통과
   └─ user.memberships.find(m => m.serviceKey === 'kpa-society').status === 'active' 체크
   └─ fail 시 "서비스 가입이 필요합니다" 안내 화면
```

→ admin 이 부여한 `kpa:operator` role 은 RoleGuard 통과시키지만, `service_memberships` 에 `service_key='kpa'` 로 저장된 row 는 MembershipGate 의 `'kpa-society'` 매칭에 실패 → **차단**.

**Backend 도 동일 정책** ([membership-guard.middleware.ts:23-29](../../apps/api-server/src/common/middleware/membership-guard.middleware.ts)):
> "service-prefix role 단독 bypass 는 제거되었다. role 과 membership 이 모두 있어야 통과한다 (frontend 정책과 정렬)."

즉 **role-only bypass 는 canonical 정책상 제거됨** — 운영자 지정 시 membership active 가 SSOT 요구 사항이다.

---

## 3. 사용자 시나리오 재현

### 3-1. admin.neture.co.kr 에서 `user@example.com` 에게 `kpa:operator` 부여
1. POST `/admin/users` (또는 PUT) — `roles: ['kpa:operator']`
2. `roleAssignmentService.assignRole({role: 'kpa:operator'})` → `role_assignments` insert ✅
3. `ensureServiceMemberships(userId, ['kpa:operator'])`:
   - `serviceKey='kpa'` (alias 미적용)
   - `service_memberships` insert (`service_key='kpa', status='active'`)

### 3-2. `user@example.com` 이 KPA-Society 로그인 → `/operator` 진입 시도
1. AuthContext fetch `/auth/status` → `user.roles=['kpa:operator']`, `user.memberships=[{serviceKey:'kpa', status:'active'}]`
2. RoleGuard: `user.roles.includes('kpa:operator')` → pass
3. MembershipGate: `memberships.find(m => m.serviceKey === 'kpa-society')` → **undefined**
4. `getServiceMembershipStatus` → `'none'` → **MembershipStatusScreen "서비스 가입이 필요합니다" 표시**

### 3-3. 우회 경로 (현재 상태)
- `marketTrialController.ts:93` 는 `IN ('kpa', 'kpa-society')` 로 둘 다 인정 → 일부 백엔드 라우트는 통과
- 그러나 frontend MembershipGate 는 canonical 만 인정 → UI 차단
- **결과**: API 는 권한 있음, UI 는 차단 — 일관성 없음

---

## 4. inactive / withdrawn / suspended 사용자 처리

### 4-1. 기존 동작 ([AdminUserController.ts:38-42](../../apps/api-server/src/controllers/admin/AdminUserController.ts))
```ts
} else if ((existing as any).status !== 'active') {
  (existing as any).status = 'active';
  (existing as any).role = roleName;
  await smRepo.save(existing);
}
```

→ 기존 membership row 가 `pending/rejected/suspended/withdrawn` 어느 상태든 admin role 부여 시 **무조건 `active` 로 덮어쓴다**.

### 4-2. 정책 관점 검토

| 시나리오 | 현재 동작 | 정책 적정성 |
|---|---|---|
| `pending` → `active` (admin 이 운영자 지정) | 자동 active | ✅ 합리적 — 운영자 지정은 implicit 승인 |
| `suspended` → `active` | 자동 active | ⚠ **정책 결정 필요** — 정지된 사용자를 admin 이 다시 운영자로 복귀시킬 때 자동 active 가 맞는가? |
| `withdrawn` → `active` | 자동 active | ⚠ **정책 결정 필요** — 탈퇴자 복귀의 정당성 |
| `rejected` → `active` | 자동 active | ⚠ **정책 결정 필요** — 가입 거절자가 admin 지정으로 복귀 가능한 것 같음 |

**문제**: 현재는 status 종류에 관계없이 무조건 `active` 처리. audit trail 도 남지 않는다. 별도 정책 결정 필요.

### 4-3. 비교: auth-register 의 신규 가입 시
[auth-register.controller.ts:110](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts):
```ts
membership.status = 'pending';
```
신규 가입은 **`pending`** 으로 시작. 즉 일반 사용자 flow 는 승인 대기를 거치지만, **admin 운영자 지정은 곧바로 active**. 정책상 일관성 부족.

---

## 5. 권장 검증 SQL

### 5-1. 핵심 검증 쿼리 (read-only)

```sql
-- 1. role_assignments 의 service-prefixed role 분포
SELECT role, COUNT(*) AS cnt
FROM role_assignments
WHERE is_active = true
  AND role LIKE '%:%'
GROUP BY role
ORDER BY role;

-- 2. service_memberships.service_key 분포 (drift 확인)
SELECT service_key, status, COUNT(*) AS cnt
FROM service_memberships
GROUP BY service_key, status
ORDER BY service_key, status;

-- 3. 핵심 drift: 'kpa' vs 'kpa-society', 'cosmetics' vs 'k-cosmetics'
SELECT service_key, status, COUNT(*) AS cnt
FROM service_memberships
WHERE service_key IN ('kpa', 'kpa-society', 'cosmetics', 'k-cosmetics')
GROUP BY service_key, status
ORDER BY service_key;

-- 4. kpa:* role 보유 사용자 중 'kpa-society' active membership 누락자
SELECT DISTINCT
  ra.user_id,
  u.email,
  ARRAY_AGG(DISTINCT ra.role) AS roles,
  (SELECT status FROM service_memberships sm
    WHERE sm.user_id = ra.user_id AND sm.service_key = 'kpa-society' LIMIT 1) AS kpa_society_status,
  (SELECT status FROM service_memberships sm
    WHERE sm.user_id = ra.user_id AND sm.service_key = 'kpa' LIMIT 1) AS kpa_legacy_status
FROM role_assignments ra
JOIN users u ON u.id = ra.user_id
WHERE ra.is_active = true
  AND ra.role LIKE 'kpa:%'
GROUP BY ra.user_id, u.email
HAVING (SELECT status FROM service_memberships sm
         WHERE sm.user_id = ra.user_id AND sm.service_key = 'kpa-society' LIMIT 1) IS DISTINCT FROM 'active';

-- 5. cosmetics:* role 보유 사용자 동일 점검
SELECT DISTINCT
  ra.user_id,
  u.email,
  ARRAY_AGG(DISTINCT ra.role) AS roles,
  (SELECT status FROM service_memberships sm
    WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' LIMIT 1) AS k_cosmetics_status,
  (SELECT status FROM service_memberships sm
    WHERE sm.user_id = ra.user_id AND sm.service_key = 'cosmetics' LIMIT 1) AS cosmetics_legacy_status
FROM role_assignments ra
JOIN users u ON u.id = ra.user_id
WHERE ra.is_active = true
  AND ra.role LIKE 'cosmetics:%'
GROUP BY ra.user_id, u.email
HAVING (SELECT status FROM service_memberships sm
         WHERE sm.user_id = ra.user_id AND sm.service_key = 'k-cosmetics' LIMIT 1) IS DISTINCT FROM 'active';

-- 6. sohae2100 의 실제 상태 (이번 검증 케이스)
SELECT u.email, ra.role, ra.is_active, sm.service_key, sm.status AS membership_status
FROM users u
LEFT JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
LEFT JOIN service_memberships sm ON sm.user_id = u.id
WHERE u.email = 'sohae2100@gmail.com'
ORDER BY ra.role, sm.service_key;
```

### 5-2. 실행 방식
CLAUDE.md §0 read-only 검증 정책에 따라 Claude Code 가 직접 `gcloud sql connect` 또는 Cloud SQL Admin API 로 실행 가능. 본 IR 작성 시점에는 instance 명/프로젝트 컨텍스트 차이로 미실행. 후속 WO 또는 사용자 요청 시 즉시 수행 가능.

---

## 6. 정책 결정 사항 (사용자 입력 필요)

### Q1. role 부여 시 membership 자동 보정 — 유지/변경?
- **현행**: `pending/rejected/suspended/withdrawn` 모두 자동 `active` 덮어쓰기
- **옵션 A** (현행 유지, alias 만 수정): admin 이 운영자 지정 → 무조건 active (가장 단순)
- **옵션 B** (보수적): `suspended/withdrawn` 은 자동 active 금지, 명시적 reactivate 단계 분리
- **옵션 C** (audit-aware): 자동 active 유지하되 `service_membership_audit_log` 에 변경 이력 기록

→ **권장**: 단기 P1 fix 는 옵션 A (현행 유지 + alias 적용). 옵션 B/C 는 별도 정책 WO.

### Q2. inactive 사용자를 admin 이 operator 로 지정하는 게 허용되는가?
- 현재 admin UI 는 user.isActive 체크 없이 role 부여 가능
- inactive user 가 operator role 받으면 로그인 자체가 안 되므로 무의미
- 차단할지 (validation), 허용할지 (audit 만)

### Q3. drift 데이터 cleanup 방식
- 옵션 1: `kpa` row → `kpa-society` 로 UPDATE (active 였으면 active 그대로)
- 옵션 2: 사용자별로 두 row 중 active 우선, 충돌 시 최신 timestamp 우선
- 옵션 3: 양쪽 모두 인정하도록 frontend MembershipGate 도 alias 적용 (반대 방향)

→ **권장**: 옵션 1. canonical 단일 출처 원칙 정렬. 별도 마이그레이션 WO.

---

## 7. 후속 WO 제안 (5단계)

### Phase 1 — `ensureServiceMemberships` canonical alias 적용 (P0 — 즉시)

**WO-O4O-ADMIN-OPERATOR-MEMBERSHIP-CANONICAL-KEY-FIX-V1**
- 범위: `apps/api-server/src/controllers/admin/AdminUserController.ts:19-46`
- 변경: `resolveMembershipKey()` 또는 동일 매핑 적용 후 `service_memberships.service_key` 저장
- 영향: admin.neture.co.kr 에서 `kpa:*` / `cosmetics:*` role 부여 시 정상 canonical key 사용
- 영향 없음: `role_assignments` 는 raw prefix 그대로 (서로 다른 도메인)
- 의존성: 없음 (단독 수정 가능)
- 리스크: 낮음 (신규 row 만 영향 — 기존 row 는 Phase 2 에서 처리)

### Phase 2 — Drift 데이터 cleanup (P0 — Phase 1 직후)

**WO-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DATA-MIGRATION-V1**
- 범위: `service_memberships` 테이블
- 작업:
  1. §5-1 SQL 4-5 로 영향 사용자 식별
  2. `service_key='kpa'` → `'kpa-society'` 로 UPDATE (충돌 시 active 우선)
  3. `service_key='cosmetics'` → `'k-cosmetics'` 동일 처리
  4. `marketTrialController.ts:93` 의 `IN ('kpa', 'kpa-society')` 우회 코드 제거 가능 여부 검토
- CLAUDE.md §0 정책 — UPDATE/DELETE 사용자 승인 필수
- 의존성: Phase 1 완료 후 (재발 차단 보장)

### Phase 3 — Alias 단일 출처화 (P1 — 위생)

**WO-O4O-SERVICE-KEY-ALIAS-SINGLE-SOURCE-V1**
- 범위: 4곳 중복된 alias 매핑을 단일 utility 로 통합
  - `membership-guard.middleware.ts:43`
  - `utils/serviceScope.ts:19`
  - `utils/store-owner.utils.ts:49`
  - `auth-register.controller.ts:54` (인라인)
- 신설: `apps/api-server/src/common/service-key-alias.ts` 에 `resolveCanonicalServiceKey()` export
- 모두 import 하여 사용
- `auth-register.controller.ts` 의 `cosmetics → k-cosmetics` 누락도 함께 보정

### Phase 4 — inactive/withdrawn 사용자 처리 정책 (P2 — 정책)

**WO-O4O-OPERATOR-ROLE-ASSIGNMENT-LIFECYCLE-POLICY-V1**
- §6 Q1, Q2 정책 결정 → 구현
- 옵션 B (보수적) 채택 시: `suspended/withdrawn` 은 admin UI 에서 별도 reactivate 단계 분리
- 옵션 C (audit) 채택 시: `service_membership_audit_log` 테이블 추가
- 의존성: 사용자 정책 결정 입력 필수

### Phase 5 — 테스트 강화 (P1)

**WO-O4O-ADMIN-OPERATOR-CREATION-INTEGRATION-TEST-V1**
- admin role 부여 → DB 양쪽 (role_assignments + service_memberships canonical key) 검증 통합 테스트
- 정합성 회귀 방지

---

## 8. 본 IR 의 범위 외

- DB 실제 row count / drift 규모 정량 측정 — §5-1 SQL 의 후속 실행 결과로 확인
- frontend MembershipGate 의 alias 역방향 적용 (옵션 3) — canonical 단일 출처 원칙에 반함, 채택 비권장
- security-core / scope guard 자체 수정 — F1 Freeze (`docs/baseline/BASELINE-OPERATOR-OS-V1.md`) 준수
- glucoseview 잔재 — 별도 [IR-O4O-GLUCOSEVIEW-RESIDUAL-REFERENCE-AUDIT-V1](IR-O4O-GLUCOSEVIEW-RESIDUAL-REFERENCE-AUDIT-V1.md) 참조

---

## 9. 참고 — 동일 사용자 (sohae2100) 의 현재 admin 화면 표시

[admin.neture.co.kr/users](https://admin.neture.co.kr/users) 검증 결과 (2026-05-15):
- `sohae2100@gmail.com` 의 role_assignments: `kpa:admin`, `kpa:operator`, `platform:super_admin`
- assignment-row UI 에 3 row 로 정상 표시 (Service: KPA / KPA / Platform)
- 추정 service_memberships: `service_key='kpa'` (canonical 아님)
- KPA-Society `/operator` 접속 → MembershipGate 의 `kpa-society` 검색 실패 → 차단 (단, `platform:super_admin` 보유로 실제 사용자는 super_admin bypass 통과 가능)
- 즉, **super_admin 이 아닌 일반 KPA operator 사용자** (예: `kpa-a-operator@o4o.com`) 가 admin 화면에서 `kpa:operator` role 을 받는 경우에 본 IR 의 차단 시나리오가 정확히 재현된다.

---

## 10. 최종 결론

1. admin.neture.co.kr 의 운영자 role 부여 흐름은 **이미 service_memberships 보정 로직을 포함**한다 (WO-O4O-OPERATOR-CREATION-FLOW-FIX-V1).
2. 그러나 `ensureServiceMemberships` 가 **canonical service_key alias 를 적용하지 않아** `kpa:*` / `cosmetics:*` role 의 membership row 가 잘못된 key 로 저장된다.
3. Backend 의 alias 매핑은 4곳에 중복 정의되어 있으나 admin 컨트롤러는 이를 사용하지 않음.
4. Frontend MembershipGate 는 canonical key 만 인정 (의도된 설계) — backend 정합 강제.
5. 정책 정정 불필요. **단순 버그 fix (Phase 1) + drift 데이터 cleanup (Phase 2)** 로 해결.
6. `suspended/withdrawn` 자동 active 처리는 별도 정책 결정 사항 (Phase 4).
7. 사용자 가시 영향은 KPA-Society / K-Cosmetics 운영자에 한정 — Neture / GlycoPharm 영향 없음.

---

*Status: Investigation Complete. No code changes performed. Awaiting Phase 1 WO authorization.*
*Updated: 2026-05-15*
*Version: 1.0*
