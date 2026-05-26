# IR-O4O-OPERATOR-EDITUSER-MODAL-ADAPTER-DESIGN-V1

> **목적**: Operator EditUserModal 공통화를 위해 서비스별 profile classification / sub_role / 직역 필드를 공통 모달에 어떻게 연결할지 adapter 구조 확정
>
> **상태**: 조사 완료 (2026-05-26)
> **코드 수정**: 없음

---

## 핵심 결론

```
1차 공통화 대상: Neture / GlycoPharm / K-Cosmetics
KPA: KpaMember 구조 + MemberManagementPage Drawer 구조가 달라 후속 통합 대상으로 분리
후속 WO: WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1 (예약)
```

- 공통 모달 구조: `CommonEditUserModal` + `serviceProfileSection` slot + `submit adapter`
- `OperatorMembersConsolePage`의 `renderEditModal` slot은 1차에서 유지
- K-Cosmetics `sub_role`: `PATCH /api/v1/cosmetics/members/:userId` 로 별도 adapter 처리
- GlycoPharm: 근무약사 / 약국 경영자 분류 위치 확인 후 adapter 처리
- Neture: supplier / partner / customer 관련 차이를 adapter 처리

---

## 1. 현재 구조 비교표

| 항목 | Neture | GlycoPharm | K-Cosmetics | KPA |
|------|--------|-----------|------------|-----|
| **파일** | `services/web-neture/src/pages/operator/EditUserModal.tsx` | `services/web-glycopharm/src/pages/operator/EditUserModal.tsx` | `services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx` | `MemberManagementPage.tsx` 내부 Drawer inline (별도 Modal 없음) |
| **호출 페이지** | `UsersManagementPage.tsx` | `UsersPage.tsx` | `UsersPage.tsx` | `MemberManagementPage.tsx` |
| **Props** | `userId, onClose, onSuccess` | 동일 | 동일 | state 기반 |
| **API 클라이언트** | `@/lib/apiClient` | 커스텀 `apiFetch` | 커스텀 `apiFetch` | `apiClient` |
| **회원 유형 필드** | `service_memberships.role` | `service_memberships.role` | `service_memberships.role` | `kpa_members.membership_type` |
| **회원 유형 옵션** | supplier, partner, seller, customer | pharmacy, customer, supplier | seller, consumer, pharmacist, supplier, partner | pharmacist_member, pharmacy_student_member |
| **운영 권한 옵션** | neture:operator, neture:admin | glycopharm:operator, glycopharm:admin | cosmetics:operator, cosmetics:admin | kpa:operator, kpa:admin, kpa:store_owner |
| **사업자 정보** | `users.businessInfo` (JSONB) | 동일 | 동일 | 동일 |
| **서비스별 프로필 필드** | 없음 | `glycopharm_members.sub_role` | `cosmetics_members.sub_role` | `kpa_members.activity_type` + `sub_role` |
| **편집 가능 필드 수** | ~4개 | ~4개 | ~4개 | **15개+** |
| **submit endpoint** | `PUT /operator/members/:userId` + 역할 API | 동일 | 동일 | `PATCH /members/:id/info` + `PATCH /members/:id/status` |

---

## 2. 서비스별 profile classification 필드 위치

### K-Cosmetics — `sub_role`
- **위치**: `apps/api-server/src/routes/cosmetics/entities/cosmetics-member.entity.ts:50-51`
- **값**: `'store_owner'` | `'store_staff'`
- **의미**: 매장 경영자 vs 매장 근무자
- **운영자 수정 API**: **없음** — 별도 WO로 `PATCH /api/v1/cosmetics/members/:userId` 추가 예정

### GlycoPharm — `sub_role`
- **위치**: `apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts:40-41`
- **값**: `'pharmacy_owner'` | `'staff_pharmacist'`
- **의미**: 약국 경영자 vs 근무약사
- **운영자 수정 API**: **없음** — 별도 WO로 추가 예정

### KPA — `activity_type` + `sub_role`
- **위치**: `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts`
  - `activity_type`: line 100-101
  - `sub_role`: line 81-82
- **운영자 수정 API**: **완벽 지원** (`PATCH /members/:id/info`)

### Neture
- 프로필 분류 필드: 없음 (service_memberships.role 만으로 충분)

---

## 3. API 조회/수정 가능 여부

### 공통 운영자 엔드포인트 (`apps/api-server/src/routes/operator/membership.routes.ts`)

| 엔드포인트 | Neture | GlycoPharm | K-Cosmetics | KPA |
|----------|:------:|:----------:|:-----------:|:---:|
| `GET /operator/members` | ✓ | ✓ | ✓ | ✗ |
| `GET /operator/members/:userId` | ✓ | ✓ | ✓ | ✗ |
| `PUT /operator/members/:userId` | ✓ | ✓ | ✓ | ✗ |
| `PATCH /operator/members/:userId/status` | ✓ | ✓ | ✓ | ✓ (정책 다름) |
| `POST /operator/members/:userId/roles` | ✓ | ✓ | ✓ | ✓ |
| `DELETE /operator/members/:userId/roles/:role` | ✓ | ✓ | ✓ | ✓ |

### 서비스별 프로필 수정 API

| 서비스 | sub_role 수정 | 현황 |
|--------|:------------:|------|
| Neture | 해당 없음 | — |
| GlycoPharm | ✗ | 가입 신청 시 1회만 설정 가능, 운영자 수정 API 미구현 |
| K-Cosmetics | ✗ | 동일 |
| KPA | ✓ | `PATCH /members/:id/info` |

---

## 4. 공통 필드 vs 서비스별 필드 분리

### 공통 필드 (3개 서비스 동일)

```
users 테이블:
  - lastName, firstName
  - nickname  ← 수정 가능
  - phone     ← 수정 가능
  - email     ← 읽기 전용

users.businessInfo (JSONB):
  - businessName / businessNumber / taxEmail
  - businessType / businessCategory
  - zipCode / address / address2

service_memberships:
  - role (회원 유형)
  - status (활성/정지)

role_assignments:
  - role (운영 권한)
```

### 서비스별 필드 (config으로 주입)

| 서비스 | 회원 유형 옵션 | 운영 권한 옵션 | 프로필 분류 |
|--------|--------------|--------------|-----------|
| Neture | supplier, partner, seller, customer | neture:operator, neture:admin | 없음 |
| GlycoPharm | pharmacy, customer, supplier | glycopharm:operator, glycopharm:admin | pharmacy_owner, staff_pharmacist |
| K-Cosmetics | seller, consumer, pharmacist, supplier, partner | cosmetics:operator, cosmetics:admin | store_owner, store_staff |
| KPA | pharmacist_member, pharmacy_student_member | kpa:operator, kpa:admin, kpa:store_owner | activity_type (다중값) |

---

## 5. Adapter 설계안

### 권고: Option C — 1차 3서비스 공통화, KPA 후속

**공통 모달 구조**

```typescript
// packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx

export interface EditUserModalAdapterConfig {
  serviceKey: 'neture' | 'glycopharm' | 'k-cosmetics';
  apiBase: string;
  getToken: () => string | null;

  // 서비스별 옵션 주입
  membershipRoleOptions: { value: string; label: string }[];
  adminRoleOptions: { value: string; label: string }[];
  businessNameLabel?: string;  // 기본값 "사업자명"

  // serviceProfileSection slot — API 준비 후 활성화
  profileClassificationOptions?: { value: string; label: string }[];
  profileClassificationLabel?: string;
  onUpdateProfileClassification?: (userId: string, value: string) => Promise<void>;
}

export interface CommonEditUserModalProps {
  userId: string;
  config: EditUserModalAdapterConfig;
  onClose: () => void;
  onSuccess: () => void;
}
```

**서비스 thin wrapper 예시 (K-Cosmetics)**

```typescript
const kCosmeticsConfig: EditUserModalAdapterConfig = {
  serviceKey: 'k-cosmetics',
  apiBase: `${API_BASE_URL}/api/v1/cosmetics`,
  getToken: getAccessToken,
  membershipRoleOptions: [
    { value: 'seller', label: '판매자' },
    { value: 'consumer', label: '소비자' },
    { value: 'store_owner', label: '매장주' },
  ],
  adminRoleOptions: [
    { value: 'cosmetics:operator', label: '운영자' },
    { value: 'cosmetics:admin', label: '관리자' },
  ],
  profileClassificationOptions: [
    { value: 'store_owner', label: '매장 경영자' },
    { value: 'store_staff', label: '매장 근무자' },
  ],
  profileClassificationLabel: '매장 역할',
  // onUpdateProfileClassification: sub_role PATCH API 구현 후 연결
};
```

---

## 6. KPA 포함 여부 — 1차 제외

### 제외 근거

1. **구조 이질성**: EditUserModal 아닌 MemberManagementPage 내 Drawer inline editing — 별도 Modal 없음
2. **필드 수 차이**: 15개+ vs ~4개 — adapter config 복잡도 급증
3. **API 경로 분리**: `/kpa/members` vs `/operator/members`
4. **완성도 불일치**: KPA sub_role 수정 완벽 지원, GlycoPharm/K-Cosmetics는 미완 → 동일 단계 공통화 부적절
5. **현재 상태 양호**: MemberManagementPage Drawer가 이미 기능 완성 → 리팩토링 우선순위 낮음

---

## 7. WO 로드맵

### 1차 (즉시 실행)

**`WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1`**

| 항목 | 내용 |
|------|------|
| 대상 | Neture / GlycoPharm / K-Cosmetics |
| 작업 | `@o4o/operator-core-ui` 공통 `CommonEditUserModal` 추출 + 3서비스 thin wrapper 교체 |
| API | 현재 API 그대로 (`PUT /operator/members/:userId` + 역할 API) |
| 공통화 범위 | fetch, form state, submit, UI 레이아웃 |
| renderEditModal slot | `OperatorMembersConsolePage` 유지 |
| 제외 | KPA, sub_role 수정 섹션 (API 미구현) |

### 2차 (sub_role API 구현 후)

- **`WO-O4O-GLYCOPHARM-SUB-ROLE-EDIT-API-V1`**: `PATCH /api/v1/glycopharm/operator/members/:userId/sub-role` 추가
- **`WO-O4O-KCOSMETICS-SUB-ROLE-EDIT-API-V1`**: `PATCH /api/v1/cosmetics/operator/members/:userId/sub-role` 추가

### 3차 (예약)

**`WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1`**
- KPA MemberManagementPage Drawer를 공통 adapter에 통합 또는 별도 Drawer 컴포넌트 추출

---

## 주요 파일 위치

| 항목 | 경로 |
|------|------|
| Neture EditUserModal | `services/web-neture/src/pages/operator/EditUserModal.tsx` |
| GlycoPharm EditUserModal | `services/web-glycopharm/src/pages/operator/EditUserModal.tsx` |
| K-Cosmetics EditUserModal | `services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx` |
| KPA MemberManagementPage | `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx` |
| 공통 Members Console | `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` |
| K-Cosmetics Member Entity | `apps/api-server/src/routes/cosmetics/entities/cosmetics-member.entity.ts` |
| GlycoPharm Member Entity | `apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts` |
| KPA Member Entity | `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` |
| Operator Membership Routes | `apps/api-server/src/routes/operator/membership.routes.ts` |
| Membership Console Controller | `apps/api-server/src/controllers/operator/MembershipConsoleController.ts` |
