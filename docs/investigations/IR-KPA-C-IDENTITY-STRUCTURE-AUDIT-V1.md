# IR-KPA-C-IDENTITY-STRUCTURE-AUDIT-V1

> **KPA-c Identity 구조 코드 조사 결과**
> **Date**: 2026-02-21
> **Status**: 조사 완료 (수정 없음)

---

## 기준 철학

1. 조직의 주체는 약사(Identity)
2. 약사는 다중 역할을 가질 수 있다
3. 조직 역할과 직무 역할은 구분 가능해야 한다
4. 약국은 약사의 활동 컨텍스트일 뿐 조직 하위 계층이 아니다
5. 구조는 단순하고 유지보수가 쉬워야 한다

---

## 1. Identity 테이블 구조

### 1-A. Core User Entity (`users` — auth-core)

**파일**: `apps/api-server/src/modules/auth/entities/User.ts`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | UUID PK | |
| `email` | VARCHAR(255) UNIQUE | |
| `pharmacist_role` | VARCHAR(50) | **직무 정체성** (pharmacy_owner, hospital, other) |
| `pharmacist_function` | VARCHAR(50) | **레거시** (pharmacy, hospital, industry) |
| `roles` | TEXT[] | 플랫폼 역할 배열 (`kpa-c:operator`, `kpa-c:branch_admin`) |
| `role` | ENUM | **Deprecated** — 이전 단일 역할 |
| `service_key` | VARCHAR(100) | 데이터 격리 키 (`kpa-c`) |
| `status` | ENUM | PENDING, ACTIVE, APPROVED, SUSPENDED |
| `isActive` | BOOLEAN | Soft delete |

**3-Layer 역할 모델**:

| Layer | 위치 | 범위 | 예시 |
|-------|------|------|------|
| L1: 직무 | `User.pharmacist_role` | 개인 | `pharmacy_owner`, `hospital` |
| L2: 조직 | `KpaMember.role` | 조직 범위 | `member`, `operator`, `admin` |
| L3: 플랫폼 | `User.roles[]` | 전역 | `kpa-c:operator`, `kpa-c:branch_admin` |

**철학 대비**: L1(직무)과 L2(조직)가 분리되어 있어 **원칙 3(역할 분리) 충족**.
단, L2↔L3 동기화가 수동이어서 불일치 가능성 있음.

---

### 1-B. KPA Member Entity (`kpa_members`)

**파일**: `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | 인증 사용자 |
| `organization_id` | UUID FK → organizations | **단일 조직 소속** |
| `role` | VARCHAR(50) | member / operator / admin |
| `status` | VARCHAR(50) | pending / active / suspended / withdrawn |
| `identity_status` | VARCHAR(50) | active / suspended / withdrawn |
| `membership_type` | VARCHAR(50) | pharmacist / student |
| `license_number` | VARCHAR(100) | 면허번호 (약사만) |
| `pharmacy_name` | VARCHAR(200) | **비정규화** — 약국명 캐시 |
| `pharmacy_address` | VARCHAR(300) | **비정규화** — 약국 주소 캐시 |
| `activity_type` | VARCHAR(50) | Phase 5: pharmacy_owner, hospital 등 |
| `fee_category` | VARCHAR(50) | Phase 5: 회비 분류 |
| `joined_at` | DATE | 승인 완료일 |

**특이사항**:
- Soft delete 없음 (status + identity_status로 관리)
- `pharmacy_name`은 FK 아님 — 단순 텍스트 캐시 (비정규화)
- `organization_id`는 단일값 — 1인 1개 조직 소속만 가능

---

### 1-C. KPA Member Service (`kpa_member_services`)

**파일**: `apps/api-server/src/routes/kpa/entities/kpa-member-service.entity.ts`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `member_id` | UUID FK → kpa_members | |
| `service_key` | VARCHAR(50) | kpa-a, kpa-b, kpa-c |
| `status` | VARCHAR(50) | pending / approved / rejected / suspended |

**UNIQUE**: (member_id, service_key)

**목적**: 조직 가입(kpa_members)과 서비스 승인(kpa_member_services)을 분리.
약사가 조직 회원이지만 특정 서비스는 미승인 상태 가능.

---

## 2. 조직 소속 관리

### 2-A. 현재 구조

- `kpa_members.organization_id` = **단일 조직** (1:1)
- `membership_history` 테이블 **없음**
- 소속 변경 이력 관리 **없음**

### 2-B. Organization Join Request (`kpa_organization_join_requests`)

| 컬럼 | 용도 |
|------|------|
| `request_type` | join / promotion / operator / pharmacy_join / pharmacy_operator |
| `requested_role` | admin / manager / member / moderator |
| `status` | pending / approved / rejected |

**승인 시 역할 매핑** (organization-join-request.controller.ts:388-397):

| request_type | requested_role | 결과 |
|---|---|---|
| `pharmacy_join` | (무시) | User.pharmacist_role = 'pharmacy_owner' (조직 역할 없음) |
| `operator` | - | User.roles += 'kpa-c:operator' |
| `pharmacy_operator` | - | User.roles += 'kpa-c:operator' |
| `join` | `admin` | User.roles += 'kpa-c:branch_admin' |
| `join` | `manager/moderator` | User.roles += 'kpa-c:operator' |
| `join` | `member` | (글로벌 역할 없음, 조직 회원만) |

**복잡도**: MEDIUM — 5개 타입 × 역할 조합 → 7개 분기

---

### 2-C. 약국 서비스 신청 (`kpa_pharmacy_requests`)

**파일**: `apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts`

조직 가입과 **독립**. 개인 속성 변경 요청.
승인 시: `User.pharmacist_role = 'pharmacy_owner'` (kpa_members 생성 안 함)

---

## 3. 역할(Role) 구조

### 3-A. 서비스 접두사 역할 (security-core)

| 역할 | 범위 | 의미 |
|------|------|------|
| `kpa:admin` | 전체 | 최상위 관리자 |
| `kpa:operator` | 전체 | 운영자 |
| `kpa:district_admin` | 지부 | 지부 관리자 |
| `kpa:branch_admin` | 분회 | 분회 관리자 |
| `kpa:branch_operator` | 분회 | 분회 운영자 |
| `kpa:pharmacist` | 회원 | 약사 회원 |
| `kpa:student` | 회원 | 약대생 회원 |

### 3-B. 분회 임원 (`kpa_branch_officers`)

**파일**: `apps/api-server/src/routes/kpa/entities/kpa-branch-officer.entity.ts`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `organization_id` | UUID | 분회 |
| `name` | VARCHAR(100) | 이름 |
| `position` | VARCHAR(100) | 직위 표시명 (분회장, 부회장 등) |
| `role` | VARCHAR(50) | 역할 코드 (president, vice_president 등) |
| `pharmacy_name` | VARCHAR(200) | 약국명 (텍스트) |
| `is_deleted` | BOOLEAN | Soft delete |

**핵심 문제**: `kpa_members`와 **FK 없음**. 임원 등록이 회원 등록과 독립.
실제 회원이 아닌 사람도 임원으로 등록 가능 (ghost officer).

### 3-C. 운영 위임 (`kpa_stewards`)

**파일**: `apps/api-server/src/routes/kpa/entities/kpa-steward.entity.ts`

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `organization_id` | UUID | 대상 조직 |
| `member_id` | UUID FK → kpa_members | 위임 대상 회원 |
| `scope_type` | VARCHAR(50) | organization / forum / education / content |
| `scope_id` | UUID (nullable) | 특정 범위 ID |
| `is_active` | BOOLEAN | |

**핵심**: Steward는 RBAC가 아닌 **운영 위임**. `kpa_members`에 FK 있음 (올바름).

---

## 4. 약국 연결 구조

### 4-A. Post-Normalization 상태

- `glycopharm_pharmacies` 테이블 **DROP 완료** (Phase C)
- 약국 데이터 → `organizations` 테이블 (type='pharmacy')
- 소유자 → `organizations.created_by_user_id`

### 4-B. 소유 관계

| 위치 | 타입 | 제약 |
|------|------|------|
| `User.pharmacist_role` | 'pharmacy_owner' | 개인 속성 (1값) |
| `organizations.created_by_user_id` | UUID | **UNIQUE 제약 없음** |
| `kpa_members.pharmacy_name` | TEXT | FK 아님, 단순 캐시 |

**1:N 약국 소유 가능**: `created_by_user_id`에 UNIQUE 없으므로 1인 다약국 소유 가능.
**kpa_members.organization_id는 KPA 분회** 소속이지, 약국 소유 관계가 아님.

### 4-C. 철학 대비 평가

- **원칙 4 충족**: 약국은 `organizations` 테이블의 행. 조직 하위 계층이 아님.
- **미흡점**: 약사→약국 직접 FK 없음. 3가지 간접 신호(pharmacist_role + created_by_user_id + pharmacy_name)로만 연결.
- **owner_history 없음**: 약국 소유자 변경 이력 관리 안 됨.

---

## 5. 공동구매 참여 구조

### 5-A. Entity 구조 (packages/groupbuy-yaksa/)

| 테이블 | 참여 주체 | pharmacy_id |
|--------|----------|-------------|
| `groupbuy_campaigns` | 조직(organizationId) | - |
| `groupbuy_orders` | **pharmacy(pharmacyId)** | 필수 |
| `campaign_products` | 공급자(supplierId) | - |

### 5-B. 참여 주체 분석

**`groupbuy_orders.pharmacyId`** = 약국(organizations 테이블의 UUID)

- 참여 주체는 **약국** (not 약사)
- `orderedBy` 필드 = 주문 실행자 (nullable, 참조용)
- 약사 개인 ID(user_id)는 **orders에 없음**

### 5-C. 철학 대비 평가

- **현재**: 공동구매 주체 = 약국 (organization)
- **철학 기준**: "조직의 주체는 약사" → 약국이 아닌 약사가 주체여야
- **충돌 수준**: MEDIUM — 실무적으로 약국 단위 발주가 자연스러움
- **판단**: 약국 단위 참여가 올바름. 약사는 `orderedBy`로 추적.

### 5-D. KPA 컨트롤러 상태

`groupbuy-operator.controller.ts` — **빈 배열 반환 (Entity 미연동)**
현재 로컬 Entity 없이 외부 supplier stats 서비스만 호출.

---

## 6. 복잡성 유발 지점

### HOT-1: request_type 과부하 (MEDIUM)

**위치**: `kpa_organization_join_requests.request_type`

5개 타입이 2가지 다른 목적(조직 가입 vs 개인 속성 변경)을 혼재.
`pharmacy_join`은 조직 가입이 아닌 개인 속성 변경인데 같은 테이블에 있음.

**단순화**: `OrganizationMembershipRequest` + `PharmacistAttributeRequest`로 분리.

### HOT-2: User.roles[] ↔ KpaMember.role 비동기화 (HIGH)

**위치**: 인증 체크 전반

`User.roles`(전역)와 `KpaMember.role`(조직 범위)가 수동 동기화.
매 요청마다 `getUserOrganizationId()` DB 쿼리 필요.

**단순화**: 스코프 JWT 또는 `role_assignments(user_id, organization_id, role)` 활용.

### HOT-3: Branch Officer ↔ Member 미연결 (MEDIUM)

**위치**: `kpa_branch_officers`

`kpa_members`와 FK 없음. Ghost officer 생성 가능.
임원 상태와 회원 상태가 독립 관리 → 데이터 불일치.

**단순화**: `kpa_branch_officers.member_id → kpa_members(id)` FK 추가.

### HOT-4: 약사-약국 간접 연결 (MEDIUM-HIGH)

**위치**: 3곳 분산

1. `User.pharmacist_role = 'pharmacy_owner'`
2. `organizations.created_by_user_id`
3. `kpa_members.pharmacy_name` (텍스트 캐시)

스키마 제약 없음. 불일치 자연 발생.

**단순화**: `kpa_members.primary_pharmacy_id → organizations(id)` FK 추가.

### HOT-5: 2단계 승인 (MEDIUM-HIGH)

**위치**: `kpa_members` + `kpa_member_services`

조직 가입 승인 ≠ 서비스 승인. 비동기 상태 관리 복잡.

**단순화**: 단일 승인 흐름으로 통합 또는 완전 분리.

### HOT-6: Branch Scope 매 요청 DB 조회 (MEDIUM)

**위치**: `branch-admin-dashboard.controller.ts:46-55`

```typescript
async function getUserOrganizationId(ds, userId) {
  const member = await memberRepo.findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}
```

N+1 패턴. 캐시 없음.

**단순화**: JWT에 organization_id 포함 또는 미들웨어 레벨 캐시.

---

## 7. 종합 평가

| 원칙 | 충족도 | 근거 |
|------|--------|------|
| 1. 주체는 약사 | **부분** | L1(pharmacist_role) 존재하나 약국 연결 간접적 |
| 2. 다중 역할 | **충족** | 3-Layer 모델 (L1+L2+L3) |
| 3. 역할 분리 | **충족** | 직무(L1) vs 조직(L2) vs 플랫폼(L3) |
| 4. 약국 ≠ 조직 하위 | **충족** | organizations 테이블에 독립 존재 |
| 5. 구조 단순성 | **미흡** | 6개 HOT 복잡성 지점, 수동 동기화 |

### 전체 복잡도: MEDIUM-HIGH

- 기능적으로는 동작
- 구조적으로는 간접 연결 + 수동 동기화로 인한 불일치 위험
- 성장 시(다약국, 다분회) 리팩토링 필요

---

## 8. 다음 단계 후보

| 옵션 | 설명 | 우선순위 |
|------|------|---------|
| A | ERD-KPA-PHARMACIST-CENTER-V1 (이상 모델 설계) | 낮음 — 현재 구조와 괴리 클 수 있음 |
| B | HOT-1 + HOT-3 우선 수정 (request_type 분리, officer FK) | 높음 — 영향 범위 작고 효과 큼 |
| C | HOT-2 수정 (스코프 JWT 도입) | 중간 — 인증 체계 전면 변경 필요 |
| D | HOT-4 수정 (primary_pharmacy_id FK) | 중간 — kpa_members 스키마 변경 |

**권장**: B → D → A 순서 (점진적 개선 → 이상 모델 수렴)

---

*Investigation completed: 2026-02-21*
*No code changes made.*
