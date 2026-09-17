# IR-PHASE3-B-VERIFICATION-V1

> **WO-IR-PHASE3-B-VERIFICATION-V1**
> **Date: 2026-02-26**
> **Status: Complete**
> **Type: Read-Only Investigation**

---

## 1. Overview

Phase3-B (WO-ROLE-NORMALIZATION-PHASE3-B-V1)는 Identity/Qualification/BusinessRole 3계층 분리를 수행한다.
본 문서는 분리 작업의 현재 상태를 검증하고, 잔여 위험을 식별한다.

### 목적

| 계층 | Before (Phase2) | After (Phase3-B) |
|------|-----------------|-------------------|
| **Identity** | `users.pharmacist_role`, `users.pharmacist_function` 컬럼 | 컬럼 제거 |
| **Qualification** | users 테이블에 혼재 | `kpa_pharmacist_profiles` 독립 테이블 |
| **BusinessRole** | `pharmacistRole === 'pharmacy_owner'` 문자열 비교 | `organization_members.role = 'owner'` relation-based |
| **RBAC** | `users.roles[]` 배열 | `role_assignments` + `deriveRoles()` (Phase3-A) |

---

## 2. Identity Layer 검증

### 2.1 users 테이블 컬럼 제거

| 항목 | 상태 | 근거 |
|------|------|------|
| `pharmacist_role` 컬럼 삭제 | ✅ 완료 | Migration `20260227000002-DropUsersPharmacistColumns.ts` |
| `pharmacist_function` 컬럼 삭제 | ✅ 완료 | 동일 마이그레이션 |
| `DROP COLUMN IF EXISTS` 안전장치 | ✅ 적용 | 멱등 실행 가능 |

### 2.2 User.ts Entity 정리

**파일**: `apps/api-server/src/modules/auth/entities/User.ts`

| 항목 | 상태 | 근거 |
|------|------|------|
| `@Column pharmacist_role` 데코레이터 제거 | ✅ 완료 | Lines 175-177 주석 확인 |
| `@Column pharmacist_function` 데코레이터 제거 | ✅ 완료 | 동일 위치 |
| 제거 사유 주석 | ✅ 적절 | `"Qualification 데이터는 kpa_pharmacist_profiles 테이블로 이전"` |
| `toPublicData()` 잔여 참조 | ⚠️ 존재 | null placeholder로 유지 (Lines 510-512) |

**toPublicData() 상세:**

```typescript
// WO-ROLE-NORMALIZATION-PHASE3-B-V1: DB에서 제거됨, 컨트롤러에서 derive
pharmacistFunction: null as string | null,
pharmacistRole: null as string | null,
```

**평가**: null placeholder는 의도적 설계. 컨트롤러가 `derivePharmacistQualification()`으로 실제 값을 주입한다.
API 응답 형태를 유지하면서 DB 컬럼 의존은 제거된 상태.

### 2.3 auth.controller.ts 참조 제거

| 항목 | 상태 | 근거 |
|------|------|------|
| `user.pharmacistRole` 직접 읽기 | ✅ 제거 | `derivePharmacistQualification()` 사용 |
| `user.pharmacistFunction` 직접 읽기 | ✅ 제거 | 동일 함수 사용 |
| GET `/me` 엔드포인트 | ✅ 정상 | Line 545: derive 후 응답에 주입 |
| GET `/status` 엔드포인트 | ✅ 정상 | Line 664: derive 후 응답에 주입 |
| PATCH `/me/profile` 엔드포인트 | ✅ 정상 | kpa_pharmacist_profiles UPSERT 후 derive |

---

## 3. Qualification Layer 검증

### 3.1 kpa_pharmacist_profiles 마이그레이션

**파일**: `apps/api-server/src/database/migrations/20260227000001-CreateKpaPharmacistProfiles.ts`

| 항목 | 상태 | 근거 |
|------|------|------|
| 테이블 생성 | ✅ 완료 | `CREATE TABLE IF NOT EXISTS kpa_pharmacist_profiles` |
| user_id UNIQUE 제약조건 | ✅ 적용 | 1:1 관계 보장 |
| user_id 인덱스 | ✅ 생성 | `idx_kpa_pharmacist_profiles_user_id` |

**스키마:**

```sql
CREATE TABLE kpa_pharmacist_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE,   -- users.id FK
  license_number  VARCHAR(100),
  license_verified BOOLEAN DEFAULT false,
  activity_type   VARCHAR(50),            -- 핵심: pharmacistRole/Function 원천
  verified_at     TIMESTAMP NULL,
  verified_by     UUID NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Backfill 로직

| 항목 | 상태 | 근거 |
|------|------|------|
| kpa_members → kpa_pharmacist_profiles 백필 | ✅ 완료 | `DISTINCT ON (user_id)` 중복 방지 |
| NULL 필터링 | ✅ 적용 | `license_number IS NOT NULL OR activity_type IS NOT NULL` |
| 멱등성 | ✅ 보장 | `ON CONFLICT DO NOTHING` 패턴 |

### 3.3 license_verified 기본값

| 항목 | 상태 | 비고 |
|------|------|------|
| 기본값 `false` | ✅ 적용 | 마이그레이션 및 Entity 모두 |
| 백필 시 `false` | ✅ 적용 | 기존 데이터 이전 시 미검증 상태 |

### 3.4 register() 자동 생성

**파일**: `apps/api-server/src/modules/auth/controllers/auth.controller.ts` Lines 319-334

| 항목 | 상태 | 근거 |
|------|------|------|
| KPA 회원가입 시 자동 생성 | ✅ 구현 | `service === 'kpa-society'` 조건 |
| pharmacistFunction → activity_type 매핑 | ✅ 구현 | 4단계 매핑 |
| ON CONFLICT 보호 | ✅ 적용 | `ON CONFLICT (user_id) DO NOTHING` |

**activity_type 매핑 (register):**

| 입력 pharmacistFunction | activity_type |
|-------------------------|---------------|
| `pharmacy` | `pharmacy_employee` |
| `hospital` | `hospital` |
| `industry` | `other_industry` |
| `other` | `other` |

**주의**: `pharmacy_owner`는 register()에서 생성되지 않음 → 약국 소유자는 별도 승인 프로세스 필요.

### 3.5 PATCH /me/profile UPSERT

| 항목 | 상태 | 근거 |
|------|------|------|
| UPSERT 패턴 | ✅ 구현 | `ON CONFLICT (user_id) DO UPDATE` |
| pharmacistFunction 검증 | ✅ 적용 | `['pharmacy', 'hospital', 'industry', 'other']` |
| 응답에 derive 결과 포함 | ✅ 구현 | 업데이트 후 derivePharmacistQualification() 호출 |

### 3.6 학생(student) 미생성

| 항목 | 상태 | 비고 |
|------|------|------|
| student 타입 비생성 | ✅ 확인 | register()에 student 분기 없음 |
| activity_type에 student 없음 | ✅ 확인 | 허용 값에 미포함 |

---

## 4. BusinessRole 분리 검증

### 4.1 organization_members owner 결정

**마이그레이션**: `20260226200002-BackfillOrganizationMembersOwner.ts`

| 백필 원천 | 조건 | 상태 |
|-----------|------|------|
| KPA 약사 | `users.pharmacist_role = 'pharmacy_owner'` + `kpa_members` JOIN | ✅ 완료 |
| 중복 방지 | `NOT EXISTS (SELECT 1 FROM organization_members ...)` | ✅ 적용 |
| 컬럼 존재 확인 | `pharmacist_role` 컬럼 유무 체크 후 쿼리 | ✅ 안전장치 |

**organization_members.role 값:**

| role | 설명 | 원천 |
|------|------|------|
| `member` | 일반 회원 (기본값) | 기존 |
| `admin` | 조직 관리자 | 기존 |
| `manager` | 조직 매니저 | 기존 |
| `moderator` | 중재자 | 기존 |
| `owner` | 매장/약국 소유자 | **Phase3-B 추가** |

### 4.2 isStoreOwner 파생 위치

**resolveStoreAccess()** — `apps/api-server/src/utils/store-owner.utils.ts`

```
Path 1: KPA admin/operator roles → kpa_members.organization_id
Path 2: organization_members.role = 'owner' AND left_at IS NULL
```

**derivePharmacistQualification()** — `auth.controller.ts:48-53`

```sql
SELECT FROM organization_members
WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL
```

| 항목 | 상태 | 비고 |
|------|------|------|
| DB relation 기반 판단 | ✅ 구현 | 문자열 비교 대신 테이블 조회 |
| left_at 필터 | ✅ 적용 | 탈퇴 회원 제외 |
| 두 함수 간 일관성 | ✅ 확인 | 동일 조건 사용 |

### 4.3 roles[] 정리

| 항목 | 상태 | 근거 |
|------|------|------|
| `users.roles[]` 배열에서 pharmacist 관련 제거 | ⚠️ 미확인 | Phase3-A 범위, 별도 검증 필요 |
| `deriveRoles()` 함수 | ✅ 정상 | `getRoleNames()` → `roles[]` → `role` 순서 |
| JWT에 pharmacistRole 미포함 | ✅ 확인 | Section 5 참조 |

### 4.4 JWT 내 isStoreOwner 배제

| 항목 | 상태 | 근거 |
|------|------|------|
| isStoreOwner JWT 미포함 | ✅ 확인 | `generateAccessToken()` payload에 없음 |
| 요청 시 derive | ✅ 구현 | API 호출마다 DB 조회 |

---

## 5. JWT Pollution 검증

### 5.1 generateAccessToken() 페이로드

**파일**: `apps/api-server/src/utils/token.utils.ts` Lines 94-123

**JWT Access Token 포함 필드:**

| 필드 | 포함 | 비고 |
|------|:---:|------|
| `userId` | ✅ | User UUID |
| `sub` | ✅ | JWT standard (= userId) |
| `email` | ✅ | 사용자 이메일 |
| `role` | ✅ | 단일 역할 (레거시) |
| `roles` | ✅ | 다중 역할 배열 |
| `permissions` | ✅ | 권한 배열 |
| `scopes` | ✅ | 서비스 스코프 |
| `domain` | ✅ | 도메인 |
| `tokenType` | ✅ | `'user'` |
| `iss` / `aud` | ✅ | 서버 격리 (Phase 2.5) |
| `pharmacistRole` | ❌ | **미포함 확인** |
| `pharmacistFunction` | ❌ | **미포함 확인** |
| `isStoreOwner` | ❌ | **미포함 확인** |
| `businessInfo` | ❌ | 미포함 |

### 5.2 deriveRoles() 내용

**파일**: `apps/api-server/src/utils/token.utils.ts` Lines 38-46

```typescript
export function deriveRoles(user): string[] {
  if (user.getRoleNames) {
    const names = user.getRoleNames();
    if (names.length > 0) return names;
  }
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  if (user.role) return [user.role];
  return [];
}
```

| 항목 | 상태 | 비고 |
|------|------|------|
| pharmacistRole 반환 없음 | ✅ 확인 | RBAC 역할만 반환 |
| Qualification 데이터 혼입 없음 | ✅ 확인 | 계층 분리 준수 |

### 5.3 JWT Pollution 판정

**🟢 GREEN** — JWT에 Qualification/BusinessRole 데이터가 포함되지 않음.
pharmacistRole, pharmacistFunction, isStoreOwner 모두 요청 시 DB에서 파생.

---

## 6. Layer Separation Model

### 6.1 3계층 분리 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     JWT Access Token                         │
│  { userId, email, roles[], scopes[], permissions[] }         │
│  ❌ pharmacistRole  ❌ pharmacistFunction  ❌ isStoreOwner   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌───────────────┐ ┌──────────────────────┐
│  Identity    │ │ Qualification │ │ BusinessRole         │
│  Layer       │ │ Layer         │ │ Layer                │
│              │ │               │ │                      │
│  users       │ │ kpa_pharma-   │ │ organization_        │
│  ┌────────┐  │ │ cist_profiles │ │ members              │
│  │ id     │  │ │ ┌───────────┐ │ │ ┌──────────────────┐ │
│  │ email  │  │ │ │ user_id   │ │ │ │ user_id          │ │
│  │ name   │  │ │ │ license_  │ │ │ │ organization_id  │ │
│  │ status │  │ │ │ number    │ │ │ │ role = 'owner'   │ │
│  │ roles[]│  │ │ │ activity_ │ │ │ │ left_at IS NULL  │ │
│  └────────┘  │ │ │ type      │ │ │ └──────────────────┘ │
│              │ │ │ license_  │ │ │                      │
│ ❌ pharma-   │ │ │ verified  │ │ │ isStoreOwner =      │
│   cist_role  │ │ └───────────┘ │ │ (role='owner' AND   │
│ ❌ pharma-   │ │               │ │  left_at IS NULL)   │
│   cist_func  │ │ pharmacist-   │ │                      │
│   (DROPPED)  │ │ Role = f(     │ │ resolveStoreAccess() │
│              │ │   activity_   │ │ isStoreOwner()       │
│              │ │   type)       │ │                      │
└──────────────┘ └───────────────┘ └──────────────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       ▼
          derivePharmacistQualification()
                       │
                       ▼
             ┌─────────────────┐
             │ API Response    │
             │ {               │
             │   pharmacist-   │
             │     Role,       │
             │   pharmacist-   │
             │     Function,   │
             │   isStoreOwner  │
             │ }               │
             └─────────────────┘
```

### 6.2 데이터 흐름

```
[회원가입]
  register() → kpa_pharmacist_profiles INSERT (activity_type)
             → kpa_members INSERT (organization membership)

[약국 소유자 승인]
  approve() → organization_members INSERT (role='owner')

[API 요청]
  GET /me → derivePharmacistQualification(userId)
         → SELECT organization_members WHERE role='owner'
         → SELECT kpa_pharmacist_profiles.activity_type
         → COMPUTE pharmacistRole, pharmacistFunction, isStoreOwner
         → INJECT into toPublicData() response

[매장 접근]
  resolveStoreAccess(dataSource, userId, roles)
         → Path 1: KPA admin/operator → kpa_members.organization_id
         → Path 2: organization_members.role='owner'
         → RETURN organizationId | null
```

---

## 7. Frontend Impact 분석

### 7.1 pharmacistRole 사용 파일 목록

| # | 파일 | 발생 수 | 용도 |
|---|------|---------|------|
| 1 | `contexts/AuthContext.tsx` | 9 | 상태 관리 + API 호출 |
| 2 | `pages/FunctionGatePage.tsx` | 6 | 온보딩 선택 UI |
| 3 | `components/FunctionGateModal.tsx` | 6 | 온보딩 모달 UI |
| 4 | `pages/mypage/MyProfilePage.tsx` | 9 | 프로필 편집 |
| 5 | `components/auth/PharmacyGuard.tsx` | 4 | 라우트 가드 |
| 6 | `pages/pharmacy/PharmacyPage.tsx` | 2 | 주석/설명 |
| 7 | `components/pharmacy/PharmacyOnboardingBanner.tsx` | 2 | 조건부 배너 |
| 8 | `pages/dashboard/UserDashboardPage.tsx` | 2 | 대시보드 |
| 9 | `pages/dashboard/CommunityDashboardTab.tsx` | 1 | 라벨 표시 |
| 10 | `components/Header.tsx` | 1 | 메뉴 필터링 |
| 11 | `pages/groupbuy/KpaGroupbuyPage.tsx` | 1 | 매장 유무 판단 |
| 12 | `pages/groupbuy/GroupbuyDetailPage.tsx` | 1 | 매장 유무 판단 |
| **합계** | **12 파일** | **44 회** | |

### 7.2 pharmacistFunction 사용 파일 목록

| # | 파일 | 발생 수 | 용도 |
|---|------|---------|------|
| 1 | `contexts/AuthContext.tsx` | 8 | 상태 관리 + API 호출 |
| 2 | `pages/FunctionGatePage.tsx` | 7 | 온보딩 선택 |
| 3 | `components/FunctionGateModal.tsx` | 7 | 온보딩 모달 |
| 4 | `pages/branch-admin/MemberStatusPage.tsx` | 5 | 회원 상태 표시 |
| 5 | `types/pharmacist.ts` | 2 | 타입 정의 |
| **합계** | **5 파일** | **29 회** | |

### 7.3 사용 유형 분류

| 유형 | 발생 수 | 위험도 | 설명 |
|------|---------|--------|------|
| **Routing/Guard** | 9 | 🟡 | `pharmacistRole === 'pharmacy_owner'` 비교로 UI 가시성 제어 |
| **Display** | 16 | 🟢 | `PHARMACIST_ROLE_LABELS` 매핑으로 라벨 표시 |
| **State Management** | 8 | 🟢 | AuthContext에서 API 응답 캐싱 |
| **API Calls** | 6 | 🟢 | `PATCH /auth/me/profile`로 프로필 업데이트 |
| **Type/Interface** | 5 | 🟢 | 인터페이스 속성 정의 |
| **Documentation** | 3 | 🟢 | 주석 |

### 7.4 핵심 발견

1. **데이터 소스**: Frontend의 `pharmacistRole`은 **JWT 토큰이 아닌 API 응답** (`/auth/me`, `/auth/status`)에서 가져옴
2. **AuthContext 매핑**: `apiUser.pharmacistRole`을 읽어 `user.pharmacistRole`에 저장 (Line 251)
3. **Stale Token 대응**: PharmacyGuard가 `pharmacistRole` 부재 시 API fallback 수행 (Line 32-53)
4. **제거 영향**: Frontend는 API 응답 필드명 `pharmacistRole`에 의존 → **필드명을 유지하는 한 변경 없음**

### 7.5 제거 시 영향도

| 시나리오 | 영향 | 판정 |
|----------|------|------|
| API 응답에서 `pharmacistRole` 필드 유지 | 영향 없음 | 🟢 GREEN |
| API 응답에서 `pharmacistRole` 필드 제거 | 12 파일 수정 필요 | 🔴 RED |
| API 응답에서 `isStoreOwner` 필드 추가 | 점진적 마이그레이션 가능 | 🟡 YELLOW |

---

## 8. Risk Assessment

### 8.1 전체 판정

| 영역 | 판정 | 근거 |
|------|------|------|
| Identity Layer | 🟢 GREEN | DB 컬럼 완전 제거, Entity 정리 완료 |
| Qualification Layer | 🟢 GREEN | kpa_pharmacist_profiles 정상 생성, 백필 완료 |
| BusinessRole Layer | 🟢 GREEN | organization_members.role='owner' 백필 완료 |
| JWT Pollution | 🟢 GREEN | pharmacistRole/isStoreOwner 미포함 확인 |
| Backend API 호환 | 🟢 GREEN | derivePharmacistQualification()으로 응답 유지 |
| Frontend 호환 | 🟢 GREEN | API 응답 형태 동일, 변경 불필요 |

### 8.2 잔여 위험

| # | 항목 | 위험도 | 설명 |
|---|------|--------|------|
| R1 | `toPublicData()` null placeholder | 🟢 LOW | 의도적 설계, 컨트롤러가 derive 값 주입 |
| R2 | 마이그레이션 실행 순서 | 🟡 MEDIUM | 3개 마이그레이션 순서 의존 (BackfillOwner → CreateProfiles → DropColumns) |
| R3 | ~~`store-playlist.controller.ts` 레거시 패턴~~ | 🟢 RESOLVED | `resolveStoreAccess()` 전환 완료 (8곳), 레거시 0건 |
| R4 | Frontend pharmacistRole 하드코딩 | 🟢 LOW | API 응답 필드 유지하는 한 문제 없음 |
| R5 | `kpa_members` 테이블 중복 | 🟢 LOW | `kpa_pharmacist_profiles`와 일부 데이터 중복, 점진적 통합 가능 |

### 8.3 마이그레이션 실행 순서 의존성

```
20260226200002 BackfillOrganizationMembersOwner
  └─ users.pharmacist_role 읽기 (DROP 전 실행 필수)
       │
20260227000001 CreateKpaPharmacistProfiles
  └─ kpa_members에서 activity_type 복사
       │
20260227000002 DropUsersPharmacistColumns
  └─ pharmacist_role, pharmacist_function 삭제 (최후 실행)
```

**위험**: TypeORM 마이그레이션 실행 순서는 파일명 정렬 기준.
타임스탬프 prefix가 올바른 순서를 보장: `20260226200002` < `20260227000001` < `20260227000002` ✅

---

## 9. Phase3-C Entry Conditions

Phase3-C 진입을 위해 다음 조건이 충족되어야 한다:

### 9.1 필수 조건 (Must)

| # | 조건 | 현재 상태 | 판정 |
|---|------|-----------|------|
| C1 | 3개 마이그레이션 프로덕션 실행 완료 | ⚠️ 미확인 (CI/CD 확인 필요) | PENDING |
| C2 | `users.pharmacist_role` 컬럼 프로덕션 제거 확인 | ⚠️ 미확인 | PENDING |
| C3 | `kpa_pharmacist_profiles` 테이블 프로덕션 존재 확인 | ⚠️ 미확인 | PENDING |
| C4 | `organization_members.role='owner'` 레코드 존재 확인 | ⚠️ 미확인 | PENDING |
| C5 | `store-playlist.controller.ts` resolveStoreAccess 전환 | ✅ 완료 (8곳 적용, 레거시 0건) | CLEAR |

### 9.2 권장 조건 (Should)

| # | 조건 | 현재 상태 | 판정 |
|---|------|-----------|------|
| S1 | Frontend `pharmacistRole` → `isStoreOwner` 점진적 전환 | ❌ 미시작 | DEFERRED |
| S2 | PharmacyGuard `pharmacistRole` 체크 → `isStoreOwner` 전환 | ❌ 미시작 | DEFERRED |
| S3 | `kpa_members` ↔ `kpa_pharmacist_profiles` 데이터 중복 정리 | ❌ 미시작 | DEFERRED |

### 9.3 진입 판정

**🟢 CODE-READY** — 코드 레벨 분리 완료, `store-playlist.controller.ts` 전환 확인됨.
프로덕션 마이그레이션 실행 확인(C1~C4)만 남음.

---

## Appendix A: 파일 매트릭스

### A.1 Backend 변경 파일

| 파일 | 변경 유형 | Phase |
|------|-----------|-------|
| `modules/auth/entities/User.ts` | Column 제거 + 주석 | 3-B |
| `modules/auth/controllers/auth.controller.ts` | derivePharmacistQualification() 추가 | 3-B |
| `utils/store-owner.utils.ts` | resolveStoreAccess() 신규 | 3-A |
| `utils/token.utils.ts` | pharmacistRole 미포함 유지 | 3-B |
| `routes/kpa/entities/kpa-pharmacist-profile.entity.ts` | Entity 신규 | 3-B |
| `database/migrations/20260226200002-*` | BackfillOwner | 3-B |
| `database/migrations/20260227000001-*` | CreateProfiles | 3-B |
| `database/migrations/20260227000002-*` | DropColumns | 3-B |
| `routes/kpa/controllers/store-hub.controller.ts` | resolveStoreAccess 전환 완료 | 3-A |
| `routes/kpa/controllers/store-playlist.controller.ts` | resolveStoreAccess 전환 완료 (8곳) | 3-A |

### A.2 Frontend 의존 파일 (변경 불필요)

| 파일 | pharmacistRole | pharmacistFunction |
|------|:-:|:-:|
| `contexts/AuthContext.tsx` | 9 | 8 |
| `pages/FunctionGatePage.tsx` | 6 | 7 |
| `components/FunctionGateModal.tsx` | 6 | 7 |
| `pages/mypage/MyProfilePage.tsx` | 9 | - |
| `components/auth/PharmacyGuard.tsx` | 4 | - |
| `pages/pharmacy/PharmacyPage.tsx` | 2 | - |
| `components/pharmacy/PharmacyOnboardingBanner.tsx` | 2 | - |
| `pages/dashboard/UserDashboardPage.tsx` | 2 | - |
| `pages/dashboard/CommunityDashboardTab.tsx` | 1 | - |
| `components/Header.tsx` | 1 | - |
| `pages/groupbuy/KpaGroupbuyPage.tsx` | 1 | - |
| `pages/groupbuy/GroupbuyDetailPage.tsx` | 1 | - |
| `pages/branch-admin/MemberStatusPage.tsx` | - | 5 |
| `types/pharmacist.ts` | - | 2 |

---

*WO-IR-PHASE3-B-VERIFICATION-V1*
*Created: 2026-02-26*
*Author: Claude Code (Automated Investigation)*
