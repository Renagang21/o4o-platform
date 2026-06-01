# IR-O4O-MEMBER-MANAGEMENT-STATUS-TABS-ALIGNMENT-AUDIT-V1

**조사 일시:** 2026-05-29  
**조사자:** Claude Sonnet 4.6  
**작업 성격:** 읽기 전용 조사 (코드 수정 없음)

---

## 1. 전체 판정

| 항목 | 판정 |
|------|------|
| GlycoPharm 상태 탭 확장 가능성 | **YES — Backend 이미 지원 (UI 제한만)** |
| K-Cosmetics 상태 탭 확장 가능성 | **PARTIAL — active/pending 탭 추가 가능, pending은 정책 확인 필요** |
| 공통 Backend API 대응 | **완전 지원** — `GET /operator/members?status=<value>` 모든 ServiceMembershipStatus 허용 |
| 바로 WO 진행 가능 여부 | **GlycoPharm: YES (즉시 가능)** / **K-Cosmetics: 정책 논의 필요** |
| 위험 등급 | 낮음 (frontend props 변경만, backend 수정 없음) |

---

## 2. 조사한 파일

### 공통 패키지
- `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx`
- `packages/operator-core-ui/src/modules/members/types.ts`
- `packages/operator-ux-core/src/member-list/MemberBadges.tsx`

### Backend API
- `apps/api-server/src/controllers/operator/MembershipConsoleController.ts`
- `apps/api-server/src/routes/operator/membership.routes.ts`
- `apps/api-server/src/modules/auth/entities/ServiceMembership.ts`

### 서비스별 페이지
- `services/web-neture/src/pages/operator/UsersManagementPage.tsx`
- `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx`
- `services/web-glycopharm/src/pages/operator/GlycopharmMembersPage.tsx`
- `services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx`
- `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx`
- `services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminMembersPage.tsx`

### 도메인 엔티티
- `apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts`
- `apps/api-server/src/database/migrations/20260524083827-CreateCosmeticsMembersTable.ts`
- `services/web-glycopharm/src/api/glycopharm.ts`

---

## 3. 서비스별 상태 탭 현황

### 3-1. KPA-Society — 9탭 (사실상 가장 확장됨)

| 탭 key | 표시 레이블 | 필터 방식 | 비고 |
|---------|------------|-----------|------|
| `all` | 전체 | - | wrapper 자동 추가 |
| `pharmacist` | 약사 | client-side (membership_type) | - |
| `student` | 약대생 | client-side (membership_type) | - |
| `status-pending` | 승인대기 | server-side (status=pending) | - |
| `status-active` | 승인완료 | server-side (status=active) | - |
| `status-rejected` | 반려 | server-side (status=rejected) | - |
| `status-suspended` | 정지 | server-side (status=suspended) | - |
| `status-withdrawn` | 탈퇴 | server-side (status=withdrawn) | WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1 |
| `applications` | 가입 신청 | 별도 ApplicationsTab | KPA 전용 엔티티 |

**주의:** KPA는 `OperatorMembersConsolePage` wrapper를 사용하지 않고 독립 구현(`MemberManagementPage`). 9탭 구조는 KPA 전용 UX임.

### 3-2. Neture — 공통 wrapper, 7탭 (role 3 + status 4 + all + pending 자동)

| 탭 key | 표시 레이블 | 필터 방식 | 비고 |
|---------|------------|-----------|------|
| `all` | 전체 | - | wrapper 자동 추가 |
| `supplier` | 공급자 | client-side (roleFilter) | - |
| `partner` | 파트너 | client-side (roleFilter) | - |
| `seller` | 셀러 | client-side (roleFilter) | - |
| `status-active` | 활성 | server-side (status=active) | statusTabs prop |
| `status-suspended` | 정지 | server-side (status=suspended) | statusTabs prop |
| `status-rejected` | 거절 | server-side (status=rejected) | statusTabs prop |
| `status-withdrawn` | 탈퇴 | server-side (status=withdrawn) | statusTabs prop |
| `pending` | 가입 신청 | server-side (status=pending) | wrapper 자동 추가 |

합계: **9탭** (all + supplier + partner + seller + 4 status + pending)

### 3-3. GlycoPharm Operator — 별도 구현, 실질 2탭 (dropdown 필터)

`GlycopharmMembersPage` (operator 경로)는 `OperatorMembersConsolePage`를 **사용하지 않는** 독립 구현.  
탭 UI 없이 **dropdown select 필터** 방식:
- 상태: 전체 / 대기 / 승인됨 / 반려됨 / 정지됨 (선택지)
- 세부직역: 전체 / 약국경영자 / 근무약사

`GlycoPharmAdminMembersPage` (admin 경로)는 `OperatorMembersConsolePage` wrapper 사용:
- roleTabs: `all`, `pharmacist`, `pharmacy_owner` (3개)
- statusTabs: 없음 (미설정)
- 결과: all + pharmacist + pharmacy_owner + pending (자동) = **4탭**

**"GlycoPharm 상태 탭 2개"는 GlycopharmMembersPage의 dropdown 선택지 구조를 탭으로 간주한 것임.**

### 3-4. K-Cosmetics Operator — 공통 wrapper, 실질 4탭

`UsersPage` (operator 경로)는 `OperatorMembersConsolePage` wrapper 사용:

| 탭 key | 표시 레이블 | 필터 방식 |
|---------|------------|-----------|
| `all` | 전체 | - |
| `seller` | 판매자 | client-side (roleFilter: cosmetics:store_owner) |
| `consumer` | 소비자 | client-side (roleFilter: consumer, customer) |
| `suspended` | 정지 | server-side (status=suspended) |
| `withdrawn` | 탈퇴 | server-side (status=withdrawn) |
| `pending` | 가입 신청 | server-side (status=pending) |

합계: **6탭** (all + seller + consumer + 2 status + pending)

**"K-Cosmetics 상태 탭 2개"는 statusTabs에 2개만 설정(suspended, withdrawn)되어 있기 때문.**

---

## 4. 서비스별 status 값 정의

### service_memberships 공식 enum (Core Entity, Frozen)

```typescript
// apps/api-server/src/modules/auth/entities/ServiceMembership.ts (F10 Frozen)
export type ServiceMembershipStatus =
  'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';
```

### GlycopharmMember 독자 entity

```typescript
// apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts
export type GlycopharmMemberStatus =
  'pending' | 'approved' | 'rejected' | 'suspended' | 'withdrawn';
```

**주목:** GlycoPharm은 `active` 대신 `approved`를 사용. service_memberships와 sync 시 `approved → active` 매핑 처리됨.

### cosmetics_members 독자 table

```sql
-- Migration: 20260524083827-CreateCosmeticsMembersTable.ts
CHECK (status IN ('active', 'suspended', 'withdrawn'))
```

**주목:** K-Cosmetics cosmetics_members는 `pending`, `rejected` 없음. 가입 즉시 `active`가 기본값.

### KPA kpa_members status

```typescript
// services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx
type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';
```

### 정리표

| 상태값 | service_memberships | glycopharm_members | cosmetics_members | kpa_members |
|--------|---------------------|--------------------|-------------------|-------------|
| `pending` | O | O | X (기본 active) | O |
| `active` | O | X (approved 사용) | O | O |
| `approved` | X (API 응답에서만) | O | X | X (active 사용) |
| `rejected` | O | O | X | O |
| `suspended` | O | O | O | O |
| `withdrawn` | O | O | O | O |
| `inactive` | X (withdrawn으로 통일됨) | X | X | X |

---

## 5. Backend API status filter 지원 여부

### 공통 Membership Console API (`GET /api/v1/operator/members`)

```typescript
// MembershipConsoleController.ts
if (status && status !== 'all') {
  smConditions.push(`sm_f.status = $${paramIdx}`);
  params.push(status);
  paramIdx++;
}
```

**임의 string 값을 그대로 SQL WHERE에 파라미터로 바인딩.** 어떤 status 문자열이든 받아들임.  
Backend에서 별도 유효성 검사 없음 — frontend에서 유효한 status 값을 보내야 함.

### batch-status API (`POST /api/v1/operator/members/batch-status`)

```typescript
if (!targetStatus || !['approved', 'rejected', 'suspended'].includes(targetStatus)) {
  res.status(400).json({ success: false, error: 'status must be approved, rejected, or suspended' });
  return;
}
```

**제한:** batch 업데이트는 `approved`, `rejected`, `suspended` 3개만 허용. `withdrawn`는 별도 DELETE 경로.

### GlycoPharm 전용 멤버 API (`GET /api/v1/glycopharm/members`)

```typescript
// glycopharm-member.service.ts
if (opts.status) qb.andWhere('m.status = :status', { status: opts.status })
```

status 파라미터 허용 (pending / approved / rejected / suspended / withdrawn 모두 가능).

### 결론

| API | 지원 status 값 | 탭 추가 시 backend 수정 필요 |
|-----|----------------|------------------------------|
| `GET /operator/members?status=` | 모든 ServiceMembershipStatus | **불필요** |
| `POST /operator/members/batch-status` | approved / rejected / suspended | 탭 추가 자체는 불필요 (bulk action 별도 검토) |
| `GET /glycopharm/members?status=` | GlycopharmMemberStatus 모두 | **불필요** |

---

## 6. Status badge 표현 비교

공통 `StatusBadge` 컴포넌트 (`packages/operator-ux-core/src/member-list/MemberBadges.tsx`):

| status 값 | 표시 레이블 | 색상 |
|-----------|------------|------|
| `active` | 활성 | green |
| `approved` | 승인 | green |
| `pending` | 대기 | amber |
| `rejected` | 반려 | red |
| `suspended` | 정지 | red |
| `inactive` | 비활성 | slate |
| 기타(withdrawn 포함) | **비활성** (fallback) | slate |

**위험:** `withdrawn` 전용 스타일이 StatusBadge에 없어 `inactive` (비활성) 로 표시됨. KPA가 withdrawn 탭을 사용하지만 badge는 '비활성'으로 표시되는 표현 불일치 존재.

GlycoPharm Operator 페이지는 서비스 자체 `StatusBadge` 컴포넌트(`services/web-glycopharm/src/components/common/StatusBadge.tsx`) 사용 (별도 정의, 공통 패키지와 다를 수 있음).

---

## 7. 상태 변경 action 비교

### 서비스별 지원 action 매트릭스

| Action | Neture Operator | KPA Operator | GlycoPharm Operator | K-Cosmetics Operator |
|--------|----------------|--------------|---------------------|----------------------|
| 단건 승인 | O (Drawer) | O (Drawer) | O (모달) | O (Drawer — pending→approved) |
| 단건 반려 | O (Drawer) | O (Drawer) | O (모달) | O (Drawer — pending→rejected) |
| 단건 정지 | O (RowAction) | O (RowAction) | X | O (RowAction) |
| 단건 복원 | O (RowAction) | O (RowAction) | X | O (RowAction) |
| 단건 탈퇴 처리 | O (renderDeleteFlow) | O (bulk) | X | O (renderDeleteFlow) |
| 단건 hard delete | X (admin only) | X (admin only) | X (admin only) | X (admin only) |
| Bulk 승인 | O (ActionBar) | O (ActionBar) | X | O (ActionBar) |
| Bulk 반려 | O (ActionBar) | O (ActionBar) | X | O (ActionBar) |
| Bulk 정지 | O (extraBulkActions) | O (ActionBar) | X | O (extraBulkActions) |
| Bulk 복원 | O (extraBulkActions) | O (ActionBar) | X | O (extraBulkActions) |
| Bulk 탈퇴 처리 | O (extraBulkActions) | O (ActionBar) | X | O (extraBulkActions) |

**GlycoPharm Operator 페이지 (`GlycopharmMembersPage`)는 승인/거절 외 모든 bulk action 미지원** — 독립 구현이기 때문.

---

## 8. GlycoPharm 상태 탭 확장 가능성

### 현재 상태

`GlycopharmMembersPage` (operator)는 **dropdown 방식** 사용. 탭 UI 없음.  
`GlycoPharmAdminMembersPage` (admin)는 공통 wrapper 사용이나 statusTabs 미설정.

### 확장 가능 범위

**Backend:** `GET /glycopharm/members?status=` 이미 모든 GlycopharmMemberStatus 허용.  
**Frontend:** `statusTabs` prop에 원하는 상태만 추가하면 됨.

**GlycopharmMembersPage를 공통 wrapper로 전환 시 가능한 탭 구조:**

```typescript
statusTabs={[
  { key: 'status-pending', label: '대기', status: 'pending' },
  { key: 'status-approved', label: '승인', status: 'approved' },
  { key: 'status-rejected', label: '반려', status: 'rejected' },
  { key: 'status-suspended', label: '정지', status: 'suspended' },
  { key: 'status-withdrawn', label: '탈퇴', status: 'withdrawn' },
]}
```

### 사업 정책 제약

정책: GlycoPharm 회원은 **약사(근무약사)와 약국(약국 경영자)만**.  
현재 `GlycopharmMemberRecord.membershipType`이 `'pharmacist'` 단일 값. 당뇨인 전용 상태 설계 필요 없음. 탭 확장 자체는 정책 위반 없음.

### 결론

**GlycoPharm statusTabs 확장: backend 수정 없이 frontend만으로 가능.**  
단, GlycopharmMembersPage를 공통 wrapper 기반으로 교체하는 선행 작업 필요 (현재 독립 구현).

---

## 9. K-Cosmetics 상태 탭 확장 가능성

### 현재 상태

`UsersPage` (operator)는 공통 wrapper 사용. statusTabs에 2개 설정:
```typescript
statusTabs={[
  { key: 'suspended', label: '정지', status: 'suspended' },
  { key: 'withdrawn', label: '탈퇴', status: 'withdrawn' },
]}
```

### K-Cosmetics cosmetics_members 제약

cosmetics_members 테이블 status CHECK 제약: `('active', 'suspended', 'withdrawn')` 만 허용.  
**`pending`, `rejected` 상태가 DB 수준에서 차단됨.**

K-Cosmetics는 서비스 가입 즉시 `active`가 기본 — 별도 승인 프로세스 없음.

따라서:
- `active` 탭 추가: **가능** (service_memberships 기준 조회)
- `pending` 탭 추가: **정책 논의 필요** (cosmetics_members에 pending 없음; 다만 service_memberships에는 pending 상태 가능)
- `rejected` 탭 추가: 같은 이유로 정책 논의 필요

### 추천 추가 탭

```typescript
statusTabs={[
  { key: 'status-active', label: '활성', status: 'active' },
  { key: 'suspended', label: '정지', status: 'suspended' },
  { key: 'withdrawn', label: '탈퇴', status: 'withdrawn' },
]}
```

`active` 탭 추가는 backend 수정 없이 즉시 가능. 3탭 구성으로 확장 가능.

### 결론

**K-Cosmetics: active 탭 추가는 즉시 가능. pending/rejected 탭은 정책(승인 프로세스 유무) 결정 필요.**

---

## 10. Neture 상태 탭 기준 확인 (4탭 구조)

Neture는 `statusTabs` prop에 4개 설정:
```typescript
statusTabs={[
  { key: 'status-active', label: '활성', status: 'active' },
  { key: 'status-suspended', label: '정지', status: 'suspended' },
  { key: 'status-rejected', label: '거절', status: 'rejected' },
  { key: 'status-withdrawn', label: '탈퇴', status: 'withdrawn' },
]}
```

`pending` 탭은 wrapper가 자동으로 "가입 신청" 탭으로 추가. 총 9탭.  
Neture는 공급자/파트너/셀러 회원 구분이 필요하여 role 탭도 함께 사용.

---

## 11. KPA 상태 탭 기준 확인

KPA는 독립 구현(`MemberManagementPage`)으로 wrapper 미사용. 상태 탭:

| 탭 | 기반 | 비고 |
|----|------|------|
| 전체 | - | |
| 약사 | client-side (membership_type) | pharmacist / pharmacist_member |
| 약대생 | client-side (membership_type) | student / pharmacy_student_member |
| 승인대기 | server-side (status=pending) | |
| 승인완료 | server-side (status=active) | |
| 반려 | server-side (status=rejected) | |
| 정지 | server-side (status=suspended) | |
| 탈퇴 | server-side (status=withdrawn) | WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1 |
| 가입 신청 | 별도 ApplicationsTab | kpa_applications 엔티티 |

KPA 특수성: `applications` 탭은 `service_memberships`가 아닌 `kpa_applications` 전용 엔티티 기반. 공통 wrapper로 흡수 불가.

---

## 12. 공통 상태 탭 후보

서비스 공통 ServiceMembershipStatus 기준으로 도출한 표준 탭 후보:

| status | 권장 레이블 | 해당 서비스 |
|--------|------------|-------------|
| `pending` | 가입 신청 / 승인대기 | KPA, Neture (자동), GP (dropdown) |
| `active` | 활성 | Neture, K-Cos (추가 가능) |
| `approved` | 승인됨 | GP (GlycopharmMember 전용) |
| `rejected` | 반려 / 거절 | KPA, Neture, GP (dropdown) |
| `suspended` | 정지 | KPA, Neture, GP (dropdown), K-Cos |
| `withdrawn` | 탈퇴 | KPA, Neture, K-Cos |

**공통 최소 세트 (4개):** `pending`, `active/approved`, `suspended`, `withdrawn`  
**KPA 확장 세트 (6개):** 위 + `rejected` + `applications` (KPA 전용)

---

## 13. W-E 구현 가능 범위

### 안 A: GlycoPharm Operator 페이지 공통 wrapper 전환 + 탭 확장

- 대상: `GlycopharmMembersPage` (operator)
- 작업: 독립 구현 → `OperatorMembersConsolePage` wrapper 교체 + statusTabs 설정
- Backend: 수정 없음
- 예상 공수: 소 (1-2일)
- 리스크: 낮음 — wrapper 안정적, 서비스 정책 변경 없음

**권장:** GlycoPharm은 이미 `GlycoPharmAdminMembersPage`에서 wrapper를 사용 중이므로 패턴 검증됨.

### 안 B: K-Cosmetics active 탭 추가

- 대상: `UsersPage` (operator) — `statusTabs` prop만 수정
- 추가: `{ key: 'status-active', label: '활성', status: 'active' }` 1줄 추가
- Backend: 수정 없음
- 예상 공수: 극소 (30분 이내)
- 리스크: 없음

### 안 C: StatusBadge withdrawn 스타일 추가

- 대상: `packages/operator-ux-core/src/member-list/MemberBadges.tsx`
- 현황: `withdrawn` 값이 `inactive` (비활성) 로 fallback 표시됨
- 추가: `withdrawn: { label: '탈퇴', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300' }`
- Backend: 수정 없음
- 예상 공수: 극소 (10분 이내)
- 리스크: 없음 — 표시 정확도 개선

### 안 D: K-Cosmetics pending 탭 추가 (조건부)

- 조건: K-Cosmetics에 승인 프로세스 도입 결정 필요
- 현황: cosmetics_members.status CHECK 제약 `('active', 'suspended', 'withdrawn')` — pending 없음
- 작업: CHECK 제약 변경(마이그레이션) + frontend 탭 추가
- Backend: 마이그레이션 필요
- 예상 공수: 중 (별도 WO 필요)
- 리스크: 중 — DB 스키마 변경, 정책 변경 수반

**권장: 안 D는 별도 정책 결정 후 별도 WO로 분리.**

---

## 14. 위험 요소

| # | 위험 항목 | 서비스 | 영향도 | 조치 필요 여부 |
|---|----------|--------|--------|----------------|
| R1 | `withdrawn` StatusBadge 미등록 — '비활성' 표시 오류 | 전체 | 낮음 | 안 C로 즉시 수정 가능 |
| R2 | GlycoPharm `approved` vs service_memberships `active` 의미 차이 | GP | 중간 | wrapper 전환 시 status 매핑 확인 필요 |
| R3 | GlycoPharmMembersPage가 독립 구현으로 bulk action 미지원 | GP | 중간 | 안 A(wrapper 전환) 로 해결 |
| R4 | K-Cosmetics pending 탭 없음 — 승인 프로세스 없는 서비스 정책과 일치 | K-Cos | 낮음 | 정책 논의 없이 탭 추가 금지 |
| R5 | batch-status API가 `withdrawn` 직접 지원 안 함 | 전체 | 낮음 | withdrawn bulk는 DELETE `/operator/members/:id?mode=soft` N회 병렬 처리 (기존 패턴 있음) |
| R6 | GlycoPharmAdminMembersPage의 roleTabs 정의 방식 불일치 | GP | 낮음 | `{ key: 'all', label: '전체' }` — roleFilter 없음. wrapper는 roleFilter: [] 를 '필터 없음'으로 처리하여 문제 없음 |

---

## 15. Current Structure vs O4O Philosophy Conflict Check

### O4O-BUSINESS-PHILOSOPHY-V1 §3.2 (Operator 역할) 기준

Operator = "서비스 운영 사업자 (회원 검수·승인·큐레이션)". 회원 상태 탭은 Operator의 핵심 검수 도구에 해당.

**GlycoPharm dropdown 방식 vs 탭 방식:** 철학적 문제 없음. 표현 방식 차이이며 기능 동등. 단, 공통 UX 표준(`OperatorMembersConsolePage` wrapper)과 불일치 — Drift 가능성.

### O4O-OPERATOR-CANONICAL-WORKFLOW-V1 (검수·승인 UX)

GlycoPharm `GlycopharmMembersPage`가 공통 wrapper 미사용으로 **Operator UX 표준에서 이탈**. Admin 페이지(`GlycoPharmAdminMembersPage`)는 wrapper 사용 중이므로 불일치 상태.

### USER-OPERATOR-FREEZE-V1 (F11) — service_memberships.status SSOT

`service_memberships.status`가 회원 상태 SSOT. GlycoPharm의 `glycopharm_members.status`는 별도 도메인 테이블이지만, `approveMember()`와 `rejectMember()` 모두 service_memberships와 sync 처리. 일관성 유지됨.

### OPERATOR-DATATABLE-POLICY-V1

공통 wrapper 미사용 서비스(GlycoPharm operator)는 DataTable 정책 적용 여부가 개별 구현에 의존. 안 A(wrapper 전환) 수행 시 DataTable 정책 자동 적용.

### 판정

| 항목 | 상태 |
|------|------|
| GlycoPharm Operator 독립 구현 | Drift (공통 wrapper 이탈) — 수정 권장 |
| K-Cosmetics statusTabs 미설정 | 정책 반영 (pending 프로세스 없는 서비스) — 현상 유지 가능 |
| KPA 독립 구현 | 예외 (kpa_applications 전용 엔티티 사용) — 의도적 예외 |

---

## 16. 다음 WO 제안

### WO-O4O-GLYCOPHARM-OPERATOR-MEMBER-TAB-CANONICALIZE-V1 (권장, 즉시 가능)

**목적:** GlycopharmMembersPage를 OperatorMembersConsolePage wrapper로 교체 + 상태 탭 5개 추가  
**범위:**
- `services/web-glycopharm/src/pages/operator/GlycopharmMembersPage.tsx` 교체
- statusTabs: pending / approved / rejected / suspended / withdrawn
- MembersConsoleClient adapter: 기존 glycopharmApi.listGlycopharmMembers 또는 공통 `/operator/members?serviceKey=glycopharm` 사용
- Backend: 수정 없음

**기대 효과:** Operator UX 표준 정합, bulk action 자동 활성화, DataTable 정책 적용

---

### WO-O4O-KCOSMETICS-OPERATOR-MEMBER-ACTIVE-TAB-ADD-V1 (선택, 즉시 가능)

**목적:** K-Cosmetics UsersPage statusTabs에 'active' 탭 1개 추가  
**범위:**
- `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx` statusTabs 1줄 추가
- Backend: 수정 없음

---

### WO-O4O-STATUS-BADGE-WITHDRAWN-STYLE-ADD-V1 (즉시 가능, 소규모)

**목적:** StatusBadge에 `withdrawn` 전용 스타일 추가 (현재 '비활성'으로 오표시)  
**범위:**
- `packages/operator-ux-core/src/member-list/MemberBadges.tsx` 1줄 추가
- Backend: 수정 없음

---

### (대기) WO-O4O-KCOSMETICS-PENDING-APPROVAL-POLICY-V1

**조건:** K-Cosmetics에 가입 승인 프로세스 도입 여부 정책 결정 필요  
**현황:** cosmetics_members.status에 pending 없음. pending 탭 추가 시 DB 마이그레이션 필요.
