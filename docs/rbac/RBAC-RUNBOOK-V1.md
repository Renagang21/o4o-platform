# RBAC Runbook V1

> 운영 기준 문서 | 2026-02-27 | WO-RBAC-CLOSEOUT-FREEZE-AND-RUNBOOK-V1

---

## 1. 관리자 접근 불가 시 점검 순서

1. `role_assignments`에 해당 `user_id` 존재 여부 확인
2. `is_active = true` 여부 확인
3. `scope_type` 확인 (global / organization)
4. `/api/v1/auth/status` 응답의 roles와 DB 값 비교
5. Debug endpoint 활용: `/__debug__/auth-bootstrap`

```sql
-- 특정 사용자의 활성 역할 확인
SELECT ra.role, ra.is_active, ra.scope_type, ra.assigned_at
FROM role_assignments ra
WHERE ra.user_id = '<USER_UUID>'
  AND ra.is_active = true
ORDER BY ra.assigned_at;
```

---

## 2. RA 없는 활성 사용자 발견 시

### 진단 쿼리

```sql
SELECT u.id, u.email, u."createdAt"
FROM users u
WHERE u."isActive" = true
AND NOT EXISTS (
  SELECT 1 FROM role_assignments ra
  WHERE ra.user_id = u.id
    AND ra.is_active = true
);
```

### 조치 원칙

| 유형 | 조치 |
|------|------|
| 일반 사용자 | `assignRole(userId, 'user')` |
| 서비스 관리자 | 적절한 서비스 prefix role 부여 (예: `neture:admin`) |
| 시스템 계정 | `platform:super_admin` 부여 |

원인 분석 후 재발 방지 — 회원가입/OAuth 흐름에서 assignRole 호출 누락 여부 확인.

---

## 3. 새 관리자 생성 표준

### 허용 방법

```typescript
// API 서비스 코드에서
await roleAssignmentService.assignRole({
  userId: user.id,
  role: 'neture:admin',
  assignedBy: 'system:admin-creation'
});
```

### 긴급 복구 (Cloud Console SQL Editor)

```sql
INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type)
SELECT gen_random_uuid(), id, 'platform:super_admin', true, NOW(), NOW(), 'global'
FROM users WHERE email = 'target@email.com'
ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING;
```

---

## 4. 금지된 직접 조작

다음 SQL은 더 이상 동작하지 않으며 사용 금지:

```sql
-- 모두 금지 (컬럼/테이블 DROP 완료)
UPDATE users SET role = ...
UPDATE users SET roles = ...
INSERT INTO user_roles ...
```

코드에서도 금지:

```typescript
// 금지
user.roles = ['admin'];
userRepo.create({ roles: [...] });
userRepo.update(id, { roles: [...] });
```

유일한 허용 경로:

```typescript
await roleAssignmentService.assignRole({ userId, role });
await roleAssignmentService.removeRole(userId, role);
await roleAssignmentService.removeAllRoles(userId);
```

---

## 5. 역할 비활성화 (Soft Delete)

역할을 제거할 때 `role_assignments` 레코드는 삭제하지 않고 `is_active = false`로 전환:

```typescript
await roleAssignmentService.removeRole(userId, 'neture:admin');
// 내부: UPDATE role_assignments SET is_active = false WHERE user_id = ? AND role = ?
```

---

## 6. 마이그레이션 로그 확인

```bash
gcloud logging read \
  "resource.type=cloud_run_job AND resource.labels.job_name=o4o-api-migrations AND severity>=ERROR" \
  --project=netureyoutube --limit=20 \
  --format="table(timestamp,textPayload)" --freshness=2h
```

---

*Document Version: 1.0*
*Last Updated: 2026-02-27*
