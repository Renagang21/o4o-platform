# Task D: Member/User Field Deduplication Complete

**Date**: 2025-12-14
**Branch**: `feature/cms-core`
**Commit**: `cde7775f1`
**Status**: Completed

---

## Summary

Task D (Member/User 필드 중복 제거)가 완료되었습니다. Member 엔티티의 name, phone, email 필드가 deprecated 처리되었고, User 엔티티를 참조하도록 변경되었습니다.

---

## Changes Made

### 1. Member Entity Deprecated Fields

**File**: `packages/membership-yaksa/src/backend/entities/Member.ts`

다음 필드들에 `@deprecated` 주석 추가:

| Field | Line | Deprecation Note |
|-------|------|------------------|
| `name` | 78-84 | Use User.name via userId JOIN |
| `phone` | 103-108 | Use User.phone via userId JOIN |
| `email` | 110-115 | Use User.email via userId JOIN |

**Example**:
```typescript
/**
 * @deprecated Phase P0 Task D: Use User.name via userId JOIN instead
 * This field will be removed after migration is complete.
 * Query with: LEFT JOIN users u ON u.id = member.userId
 */
@Column({ type: 'varchar', length: 100 })
name!: string;
```

### 2. MemberService User Data Enrichment

**File**: `packages/membership-yaksa/src/backend/services/MemberService.ts`

새로운 helper 메서드 추가:

```typescript
/**
 * Phase P0 Task D: Enrich members with User data
 * Fetches user name/phone/email from users table and merges into member results
 */
private async enrichMembersWithUserData(members: Member[]): Promise<Member[]>
```

다음 메서드들이 User 데이터를 자동으로 enrich:
- `findById()`
- `findByUserId()`
- `findByLicenseNumber()`
- `list()`

### 3. Migration Script

**File**: `apps/api-server/src/scripts/migrate-member-to-user-fields.ts`

기능:
- Member.name → User.name (if User.name is empty)
- Member.phone → User.phone (if User.phone is empty)
- Email은 마이그레이션하지 않음 (User.email이 unique identifier)

**NPM Scripts**:
```bash
# 마이그레이션 실행
pnpm -F @o4o/api-server migration:member-dedup

# 마이그레이션 검증
pnpm -F @o4o/api-server migration:member-dedup:verify
```

---

## Migration Strategy

### Phase 1 (Current - Completed)
1. ✅ Member 필드에 @deprecated 주석 추가
2. ✅ MemberService에서 User 데이터 자동 enrich
3. ✅ 마이그레이션 스크립트 생성

### Phase 2 (Future - After Verification)
1. 프로덕션에서 마이그레이션 스크립트 실행
2. 충분한 테스트 기간 경과
3. Member.name/phone/email 컬럼 제거

---

## Technical Details

### Why Raw SQL Instead of TypeORM JOIN?

Member 엔티티는 `packages/membership-yaksa`에 있고, User 엔티티는 `apps/api-server`에 있습니다. Cross-package entity reference 문제로 TypeORM relation을 사용할 수 없어서, DataSource.query()를 통한 raw SQL 쿼리를 사용합니다:

```typescript
const users = await this.dataSource.query(`
  SELECT id, name, email, phone
  FROM users
  WHERE id = ANY($1)
`, [userIds]);
```

### Backward Compatibility

- Member.name/phone/email 필드는 여전히 존재 (deprecated)
- MemberService가 결과를 반환하기 전에 User 데이터로 덮어씀
- 기존 코드가 member.name을 참조해도 User.name 값을 받음

---

## Definition of Done (DoD) Check

| Criteria | Status |
|----------|--------|
| Member entity fields deprecated | ✅ |
| MemberService uses User JOIN | ✅ |
| Migration script created | ✅ |
| NPM scripts added | ✅ |
| Build succeeds | ✅ |
| No breaking changes | ✅ |

---

## Files Changed

| File | Change |
|------|--------|
| `packages/membership-yaksa/src/backend/entities/Member.ts` | @deprecated annotations |
| `packages/membership-yaksa/src/backend/services/MemberService.ts` | enrichMembersWithUserData() |
| `apps/api-server/src/scripts/migrate-member-to-user-fields.ts` | New migration script |
| `apps/api-server/package.json` | NPM scripts added |

---

## Next Steps

- **Task A**: Dynamic Navigation System
- **Task B**: Dynamic Routing System

---

*Generated: 2025-12-14*
*Branch: feature/cms-core*
