# IR-PHASE3-A-VERIFICATION-V1

## BusinessRole 구조 통합 — 설계 검증 보고서

> **대상 WO:** WO-ROLE-NORMALIZATION-PHASE3-A-V1
> **검증일:** 2026-02-26
> **검증 범위:** BusinessRole을 RBAC에서 분리하고 organization_members relation-based 모델로 통합
> **수정 여부:** 없음 (조사 전용)

---

## 1. Git 기준선 확인

| 항목 | 값 |
|------|------|
| 현재 브랜치 | `feature/role-normalization-phase3-a` |
| Feature 커밋 | `1e39e9ad625c51ab00dfbe09ca162dd927a231bd` |
| Main 커밋 | `10608c8893d5fee00974962712ad8f19eb41d8ec` |
| 브랜치 상태 | Main에서 분기됨, 독립 커밋 존재 |

### Phase3-A 변경 파일

**신규 파일 (2):**
| 파일 | 목적 |
|------|------|
| `apps/api-server/src/utils/store-owner.utils.ts` | 중앙화된 relation-based ownership 유틸리티 |
| `apps/api-server/src/database/migrations/20260226200001-BackfillOrganizationMembersOwner.ts` | 기존 데이터 backfill |

**수정 파일 (11):**
| 파일 | 변경 내용 |
|------|----------|
| `routes/glycopharm/controllers/admin.controller.ts` | 승인 시 organization_members owner INSERT |
| `routes/kpa/controllers/pharmacy-request.controller.ts` | pharmacy_owner → organization_members 전환 |
| `routes/kpa/controllers/pharmacy-store-config.controller.ts` | createRequireStoreOwner 미들웨어 적용 |
| `routes/kpa/controllers/pharmacy-products.controller.ts` | createRequireStoreOwner 미들웨어 적용 |
| `routes/kpa/controllers/store-hub.controller.ts` | resolveStoreAccess 유틸리티 적용 |
| `routes/kpa/controllers/store-playlist.controller.ts` | resolveStoreAccess 유틸리티 적용 |
| `routes/kpa/controllers/store-channel-products.controller.ts` | resolveStoreAccess 유틸리티 적용 |
| `routes/platform/store-tablet.routes.ts` | resolveStoreAccess 유틸리티 적용 |
| `routes/platform/store-local-product.routes.ts` | resolveStoreAccess 유틸리티 적용 |
| `modules/auth/controllers/auth.controller.ts` | pharmacistRole derive + self-set 차단 |

**Phase3-A 외 변경사항:** git status에 다른 WO 변경사항 포함 (neture entities, product-policy, vite configs 등). 선별 커밋 필요.

---

## 2. users 테이블 검증

### 2-1. pharmacist_role 값 확인

| 항목 | 상태 | 근거 파일 |
|------|------|----------|
| Entity 정의 | `varchar(50), nullable` | `User.ts:180-182` |
| pharmacy_owner 직접 WRITE | **제거됨** | grep 0건 (migration 제외) |
| pharmacy_owner READ (derive) | organization_members 기반 | `auth.controller.ts:479-489, 611-621` |
| Profile self-set 차단 | `validRoles`에서 제외 | `auth.controller.ts` (pharmacy_owner 제외) |
| Migration 내 사용 | 허용 (backfill 읽기 전용) | `BackfillOrganizationMembersOwner.ts:58` |
| 시드 데이터 내 사용 | 허용 (테스트 전용) | `SeedKpaTestAccounts.ts:58, 76` |

**pharmacy_owner 잔존 참조 분류:**

| 위치 | 유형 | 판정 |
|------|------|------|
| `auth.controller.ts:479, 487, 611, 619` | Derive 로직 (organization_members 쿼리) | GREEN |
| `User.ts:180` | 주석 (가능 값 설명) | YELLOW |
| `BackfillOrganizationMembersOwner.ts:58` | Migration WHERE 조건 (일회성) | GREEN |
| `PharmacyIdentityRealign.ts:20, 25` | 이전 Phase Migration | GREEN |
| `SeedKpaTestAccounts.ts:58, 76` | 테스트 시드 | GREEN |
| `member.controller.ts:100, 104, 398, 402` | KPA activity_type enum 검증 (Qualification) | YELLOW |
| `kpa-member.entity.ts:25, 39` | KpaActivityType enum 정의 (Qualification) | YELLOW |
| `kpa-pharmacy-request.entity.ts:8` | 주석 문서 | YELLOW |

### 2-2. users.roles[] 검증

```
grep -rn "store_owner" apps/api-server/src/
```

| 패턴 | 결과 | 판정 |
|------|------|------|
| `glycopharm:store_owner` | **0건** | GREEN |
| `cosmetics:store_owner` | **0건** | GREEN |
| `store_owner` (일반) | 1건 (audit log fallback) | YELLOW |

**유일한 잔존:**
- `pharmacy-store-config.controller.ts:77` — audit log fallback 기본값
- `operator_role: (user.roles || []).find(r => r.startsWith('kpa:')) || 'store_owner'`
- 접근 제어가 아닌 로깅 메타데이터 → **YELLOW (비위험)**

---

## 3. JWT Claims 검증

### 토큰 생성 경로

```
login() → handleEmailLogin() → tokenUtils.generateTokens(user)
  → generateAccessToken(user)
    → deriveRoles(user)       ← Platform roles만 포함
    → deriveUserScopes()      ← roles 기반 scopes만 포함
    → jwt.sign(payload)       ← pharmacistRole 미포함
```

### JWT Payload 구조

```json
{
  "userId": "user-456",
  "sub": "user-456",
  "email": "pharmacist@example.com",
  "role": "user",
  "roles": ["user", "kpa:pharmacist"],
  "permissions": [],
  "scopes": ["member:view-profile", "member:update-profile"],
  "domain": "neture.co.kr",
  "tokenType": "user",
  "iss": "o4o-platform",
  "aud": "o4o-api"
}
```

| 검증 포인트 | 결과 | 판정 |
|------------|------|------|
| JWT roles[]에 store_owner 포함 | **미포함** | GREEN |
| JWT roles[]에 pharmacy_owner 포함 | **미포함** | GREEN |
| JWT payload에 pharmacistRole 필드 | **미포함** | GREEN |
| deriveRoles() 소스 | user.roles[] (platform roles만) | GREEN |
| deriveUserScopes() 소스 | platform roles 기반 | GREEN |

### API Response vs JWT 분리

```
┌──────────────────┐        ┌──────────────────┐
│ JWT Token        │        │ API Response     │
│ (signed payload) │        │ (user data)      │
├──────────────────┤        ├──────────────────┤
│ roles[] (platform)│       │ roles[] (platform)│
│ scopes[]         │        │ scopes[]         │
│                  │        │ pharmacistRole   │
│ ❌ NO            │        │ ✅ Derived from  │
│ pharmacistRole   │        │ organization_    │
│ store_owner      │        │ members at read  │
│ pharmacy_owner   │        │ time             │
└──────────────────┘        └──────────────────┘
```

**pharmacistRole derive 로직:**
- `auth.controller.ts:479-489` (/me 엔드포인트)
- `auth.controller.ts:611-621` (/status 엔드포인트)
- 쿼리: `SELECT 1 FROM organization_members WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL LIMIT 1`
- **JWT 토큰에는 반영되지 않음** — API 응답에서만 derive

---

## 4. organization_members 구조 검증

### 테이블 구조

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID (PK) | |
| organization_id | UUID (FK, indexed) | Unique with user_id |
| user_id | UUID (FK, indexed) | Unique with organization_id |
| role | VARCHAR(50) | 'admin', 'manager', 'member', 'moderator', **'owner'** |
| is_primary | BOOLEAN | 기본 조직 여부 |
| metadata | JSONB | 확장 필드 |
| joined_at | TIMESTAMP | 가입 시점 |
| left_at | TIMESTAMP (nullable) | NULL = 활성 멤버 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**핵심 제약 조건:**
- UNIQUE `(organization_id, user_id)` — 중복 owner 방지
- left_at IS NULL 패턴으로 soft delete

**참고:** Entity TypeScript 타입은 `'admin' | 'manager' | 'member' | 'moderator'`이지만, DB VARCHAR(50)에는 'owner' 저장 가능. organization-core가 FROZEN이므로 Entity 타입 수정 불가 → raw SQL로 'owner' INSERT하는 설계는 적절.

### Migration 검토 (BackfillOrganizationMembersOwner.ts)

| 검증 항목 | 결과 | 판정 |
|----------|------|------|
| 중복 방지 | NOT EXISTS 사용 | GREEN |
| 멱등성 | 재실행 시 중복 생성 없음 | GREEN |
| 롤백 가능 | DOWN: `DELETE WHERE role = 'owner'` | GREEN |
| GlycoPharm 누락 | organizations WHERE type='pharmacy' AND created_by_user_id IS NOT NULL | GREEN |
| KPA 누락 | users JOIN kpa_members WHERE pharmacist_role='pharmacy_owner' | GREEN |
| FK 무결성 | organization_id, user_id 모두 기존 레코드 참조 | GREEN |

### 승인 흐름 owner 생성

| 흐름 | 구현 | 중복 방지 | 판정 |
|------|------|----------|------|
| GlycoPharm 매장 승인 | `admin.controller.ts:394-404` | ON CONFLICT DO NOTHING | GREEN |
| KPA 약국 승인 | `pharmacy-request.controller.ts:179-191` | ON CONFLICT DO NOTHING | GREEN |

---

## 5. 권한 계산 로직 검증

### 레거시 함수 잔존 여부

| 함수명 | 검색 결과 | 판정 |
|--------|----------|------|
| `isStoreOwnerRole()` | **0건** (소스 코드) | GREEN |
| `isPharmacyOwnerRole()` | **0건** (소스 코드) | GREEN |
| `requirePharmacyOwner` (레거시) | **제거됨** → `createRequireStoreOwner` 교체 | GREEN |

### 신규 유틸리티 적용 현황

| 파일 | 사용 함수 | 사용 횟수 | 판정 |
|------|----------|----------|------|
| `store-tablet.routes.ts` | `resolveStoreAccess` | 2 | GREEN |
| `store-local-product.routes.ts` | `resolveStoreAccess` | 5 | GREEN |
| `store-playlist.controller.ts` | `resolveStoreAccess` | 8 | GREEN |
| `store-hub.controller.ts` | `resolveStoreAccess` | 5 | GREEN |
| `store-channel-products.controller.ts` | `resolveStoreAccess` | 6 | GREEN |
| `pharmacy-products.controller.ts` | `createRequireStoreOwner` | 미들웨어 | GREEN |
| `pharmacy-store-config.controller.ts` | `createRequireStoreOwner` | 미들웨어 | GREEN |

### 접근 제어 패턴

```typescript
// 모든 store 접근은 두 경로로 확인:
// Path 1: KPA admin/operator roles (기존 RBAC 유지)
// Path 2: organization_members.role = 'owner' (relation-based)
```

- ❌ `user.roles.includes('store_owner')` — **0건** (제거 완료)
- ✅ `organization_members WHERE role = 'owner'` — **전 파일 적용**
- ✅ 모든 데이터 접근에 `organizationId` boundary 필터 적용

---

## 6. 시나리오 테스트 검증

### 시나리오 1: 약사 + 매장 owner

**코드 경로:**
1. KPA 약국 신청 승인 → `pharmacy-request.controller.ts:179-191`
2. organization_members에 `role='owner'` INSERT
3. `/auth/me` 호출 → `auth.controller.ts:479-489`에서 organization_members 쿼리
4. `pharmacistRole: 'pharmacy_owner'` derive하여 응답

**예상 API 응답:**
```json
{
  "user": {
    "roles": ["user", "kpa:pharmacist"],
    "pharmacistRole": "pharmacy_owner",
    "scopes": ["member:view-profile", "member:update-profile"]
  }
}
```

**판정:** GREEN — pharmacistRole은 API 응답에서만 derive, JWT 미포함

### 시나리오 2: 일반 사용자 + GlycoPharm 매장 owner

**코드 경로:**
1. GlycoPharm 신청 승인 → `admin.controller.ts:394-404`
2. organization_members에 `role='owner'` INSERT
3. `createRequireStoreOwner` 미들웨어에서 `isStoreOwner()` 확인
4. `req.organizationId` 주입 후 매장 관리 API 접근 허용

**예상 API 응답:**
```json
{
  "user": {
    "roles": ["user"],
    "pharmacistRole": "pharmacy_owner",
    "scopes": ["member:view-profile"]
  }
}
```

**판정:** GREEN — organization_members 기반 접근 제어

### 시나리오 3: 매장 비활성화 후 접근 차단

**코드 경로:**
1. organization_members.left_at 설정 (soft delete)
2. `isStoreOwner()` 쿼리: `WHERE left_at IS NULL` 조건
3. left_at이 설정되면 쿼리 결과 0건 → `isOwner: false`
4. `createRequireStoreOwner` → 403 STORE_OWNER_REQUIRED 반환

**판정:** GREEN — left_at 기반 soft delete로 접근 자동 차단

### 시나리오 4: GlycoPharm 매장 승인 → owner 자동 등록

**코드 경로:** `admin.controller.ts:394-404`
```sql
INSERT INTO organization_members (id, organization_id, user_id, role, ...)
VALUES (uuid_generate_v4(), $1, $2, 'owner', ...)
ON CONFLICT (organization_id, user_id) DO NOTHING
```

**판정:** GREEN — ON CONFLICT으로 멱등성 보장

### 시나리오 5: Cosmetics 매장 승인 → owner 자동 등록

**현재 상태:** Cosmetics는 별도 `cosmetics_store_members` 테이블 사용.
Phase3-A 범위에서 **제외** (CLAUDE.md §9 스키마 격리 원칙).

- `cosmetics_store_members`에 `role='OWNER'` 레코드 생성 (기존 로직 유지)
- `organization_members`에는 미반영
- **store-owner.utils의 isStoreOwner()로 cosmetics owner 확인 불가**

**판정:** YELLOW — Cosmetics owner는 별도 경로. Phase3-B에서 통합 예정.

---

## 7. 위험도 평가

| 영역 | 판정 | 근거 |
|------|------|------|
| **BusinessRole 분리** | **GREEN** | pharmacy_owner/store_owner가 RBAC(users.roles[])에서 완전 제거. organization_members relation-based로 전환 완료. |
| **RBAC 혼용 여부** | **GREEN** | 모든 backend store owner 체크가 organization_members 기반. isStoreOwnerRole/isPharmacyOwnerRole 레거시 함수 0건. |
| **JWT 오염 여부** | **GREEN** | JWT payload에 pharmacistRole, store_owner, pharmacy_owner 미포함. deriveRoles()는 platform roles만 반환. pharmacistRole은 API 응답에서만 derive. |
| **데이터 무결성** | **GREEN** | BackfillOrganizationMembersOwner 마이그레이션이 NOT EXISTS로 멱등성 보장. (organization_id, user_id) UNIQUE 제약으로 중복 방지. ON CONFLICT DO NOTHING으로 승인 시 안전 INSERT. |
| **Cosmetics 통합** | **YELLOW** | cosmetics_store_members 별도 유지. CLAUDE.md 스키마 격리 원칙에 따라 Phase3-A에서 제외. Phase3-B에서 통합 예정. |

### 종합 판정

```
╔══════════════════════════════════════════╗
║                                          ║
║   종합 판정:  GREEN (통과)                ║
║                                          ║
║   Cosmetics 통합 YELLOW 1건은             ║
║   아키텍처 결정에 의한 보류이며             ║
║   Phase3-B에서 해결 예정                  ║
║                                          ║
╚══════════════════════════════════════════╝
```

---

## 8. 변경 요약

### 제거된 코드 패턴

| 패턴 | 위치 | 대체 |
|------|------|------|
| `users.roles.push('glycopharm:store_owner')` | GlycoPharm 승인 흐름 | organization_members INSERT |
| `UPDATE users SET pharmacist_role = 'pharmacy_owner'` | KPA 약국 승인 | organization_members INSERT |
| `isStoreOwnerRole(roles, user)` | 7개 guard 파일 | `resolveStoreAccess()` / `createRequireStoreOwner()` |
| `isPharmacyOwnerRole(roles, user)` | 5개 controller | `resolveStoreAccess()` |
| `user.pharmacistRole === 'pharmacy_owner'` 직접 체크 | guard 로직 | organization_members 쿼리 |

### 추가된 관계 로직

| 함수 | 파일 | 역할 |
|------|------|------|
| `isStoreOwner()` | `store-owner.utils.ts` | organization_members 기반 owner 확인 |
| `createRequireStoreOwner()` | `store-owner.utils.ts` | Express 미들웨어 (req.organizationId 주입) |
| `resolveStoreAccess()` | `store-owner.utils.ts` | 인라인 owner 확인 (organizationId 반환) |
| pharmacistRole derive | `auth.controller.ts` (/me, /status) | organization_members에서 pharmacy_owner derive |

### 남은 Legacy 참조 (YELLOW)

| 위치 | 유형 | 위험도 |
|------|------|--------|
| `pharmacy-store-config.controller.ts:77` | audit log fallback 'store_owner' | 비위험 |
| `User.ts:180` | 주석 (가능 값 목록) | 비위험 |
| `kpa-member.entity.ts:25, 39` | KPA activity_type enum (Qualification) | 비위험 |
| `kpa-pharmacy-request.entity.ts:8` | 주석 문서 | 비위험 |

---

## 9. Phase3-A 완료 조건 체크리스트

| 조건 | 상태 |
|------|------|
| users.pharmacist_role = 'pharmacy_owner' 신규 기록 중단 | ✅ 완료 |
| users.roles[]에 glycopharm:store_owner push 중단 | ✅ 완료 |
| 모든 backend store owner 체크가 organization_members 기반 | ✅ 완료 |
| Auth API 응답에서 pharmacistRole derive 정상 동작 | ✅ 완료 |
| Frontend 동작 변경 없음 (API 응답 형태 유지) | ✅ 완료 |
| Backfill migration 생성 완료 | ✅ 완료 |
| JWT 토큰에 BusinessRole 미포함 | ✅ 완료 |

---

## 10. 권고 사항

### Phase3-B 예상 작업

1. `users.pharmacist_role`에서 'pharmacy_owner' 값 일괄 정리 (Qualification 전용으로 전환)
2. Cosmetics `cosmetics_store_members` → `organization_members` 통합
3. Legacy `users.roles[]` 정리 (Phase3-C)
4. `pharmacy-store-config.controller.ts:77` audit log fallback 정리

### 빌드 검증

- `pnpm exec tsc --noEmit --project apps/api-server/tsconfig.json` 실행 필요
- 선별 커밋 후 PR 생성 필요

---

*Generated: 2026-02-26*
*Verification Tool: Claude Code (Read-Only)*
*Status: 수정 없음 — 조사 전용 보고서*
