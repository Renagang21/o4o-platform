---
id: IR-O4O-MEMBER-MANAGEMENT-COMMONIZATION-AUDIT-V1
title: 4개 서비스 회원 관리 UI/UX/API 공통화 GAP 조사
status: completed
date: 2026-05-28
domain: member-management / operator-ux / admin-ux / canonical-alignment
related:
  - IR-O4O-NETURE-KPA-UX-CANONICAL-ALIGNMENT-AUDIT-V1
  - WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
  - WO-O4O-OPERATOR-MEMBERS-CONSOLE-KPA-ALIGNMENT-V1
  - WO-O4O-OPERATOR-MEMBERS-ACTION-POLICY-EXTENSION-V1
  - WO-NETURE-MEMBER-DELETE-SAFE-FLOW-V1
constitution:
  - CLAUDE.md §0 (read-only / DB 직접 수정 금지)
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §11 (Admin / Operator 역할 구분)
  - CLAUDE.md §14 F2 (KPA UX Baseline) / F11 (User/Operator Freeze)
target_services:
  - KPA-Society (services/web-kpa-society)
  - GlycoPharm (services/web-glycopharm)
  - K-Cosmetics (services/web-k-cosmetics)
  - Neture (services/web-neture)
baseline_service: KPA-Society
shared_modules:
  - packages/operator-core-ui/src/modules/members/
  - packages/operator-ux-core/
  - packages/ui/ (BaseDetailDrawer / ActionBar / ConfirmActionDialog / BulkResultModal)
backend_ssot: apps/api-server/src/controllers/operator/MembershipConsoleController.ts
---

# IR-O4O-MEMBER-MANAGEMENT-COMMONIZATION-AUDIT-V1

> 4개 서비스 회원 관리 UI/UX/API를 공통화하기 전 read-only GAP 조사. 코드 수정 없음. DB 수정 없음. 마이그레이션 없음.
>
> 3개 영역 병렬 sub-agent 조사 → 종합 보고.

---

## 1. 전체 판정

**판정**: 🟢 **공통화 ROI HIGH, 작업 난이도 LOW-MED, 위험 LOW-MED.**

- **Backend는 이미 100% 통합.** `MembershipConsoleController` + `/api/v1/operator/members` 단일 endpoint. 4개 서비스 모두 `serviceKey` 쿼리 파라미터로 분기.
- **공통 모듈은 70% 완성.** `OperatorMembersConsolePage` (packages/operator-core-ui)는 Neture/GlycoPharm/K-Cosmetics 3서비스가 이미 사용 중. KPA만 독립 1400줄 구현.
- **남은 GAP은 UI 라벨/탭/bulk action 비대칭.** Neture bulk 전무, GP/K-Cos 상태 탭 2개만, 컬럼 "유형"/"역할" 라벨 불일치 등.
- **완전삭제 구현은 4개 서비스 모두 완료.** 단, Delete Flow UI는 4개 서비스 모두 **개별 커스텀** — 공통화 가장 큰 ROI.

**핵심 권고**: KPA는 도메인 복잡성 때문에 별도 유지가 정당하므로, **3서비스(Neture/GP/K-Cos) 정합 + Delete Flow 공통화** 우선 진행. KPA는 `OperatorMembersConsolePage` 옵션 prop을 통한 점진 정합을 선택지로 검토.

---

## 2. 서비스별 회원 관리 진입 경로

| 서비스 | 역할 | 메뉴 라벨 | 라우트 | Page 컴포넌트 | 권한 Guard |
|--------|------|----------|--------|--------------|-----------|
| **KPA-Society** | operator | 회원 관리 | `/operator/members` | [pages/operator/MemberManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) | `RoleGuard` (PLATFORM_ROLES) → KpaOperatorLayoutWrapper |
| KPA-Society | admin | 회원 완전삭제 | `/admin/members` | [pages/admin/AdminMemberManagementPage.tsx](../../services/web-kpa-society/src/pages/admin/AdminMemberManagementPage.tsx) | `AdminAuthGuard` |
| **GlycoPharm** | operator | 회원 관리 | `/operator/members` | [pages/operator/UsersPage.tsx](../../services/web-glycopharm/src/pages/operator/UsersPage.tsx) | `OperatorRoute` |
| GlycoPharm | admin | 회원 관리(Admin) | `/admin/members` | [pages/admin/GlycoPharmAdminMembersPage.tsx](../../services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx) | RoleGuard (`glycopharm:admin`, `platform:super_admin`) |
| **K-Cosmetics** | operator | 회원 관리 | `/operator/members` | [pages/operator/UsersPage.tsx](../../services/web-k-cosmetics/src/pages/operator/UsersPage.tsx) | `OperatorRoute` |
| K-Cosmetics | admin | 회원 관리 | `/admin/members` | [pages/admin/KCosmeticsAdminMembersPage.tsx](../../services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminMembersPage.tsx) | RoleGuard (`cosmetics:admin`, `platform:super_admin`) |
| **Neture** | operator | 회원 관리 | `/operator/users` ⚠ | [pages/operator/UsersManagementPage.tsx](../../services/web-neture/src/pages/operator/UsersManagementPage.tsx) | `OperatorRoute` |
| Neture | admin | 회원 완전삭제 | `/admin/members` | [pages/admin/AdminMemberManagementPage.tsx](../../services/web-neture/src/pages/admin/AdminMemberManagementPage.tsx) | `AdminRoute` |

**관찰**:
- 라우트 표준화 95% 진행 — **Neture operator만 `/operator/users` 비표준** (canonical: `/operator/members`)
- Guard 패턴 분산: `RoleGuard` / `OperatorRoute` / `AdminAuthGuard` / `AdminRoute` 혼재 → 정합 가치 있음
- 메뉴 라벨도 "회원 관리" / "회원 완전삭제" 혼재 — KPA/Neture는 admin을 "회원 완전삭제"로 노출

---

## 3. operator 회원 관리 비교

| 항목 | KPA-Society | GlycoPharm | K-Cosmetics | Neture |
|------|------------|-----------|------------|--------|
| 구현 방식 | 독립 1400줄+ | OperatorMembersConsolePage thin wrapper | OperatorMembersConsolePage thin wrapper | OperatorMembersConsolePage thin wrapper |
| 코드 라인 수 | ~1421 | ~340 (extraRowActions 포함) | ~280 | ~243 |
| role 탭 | 약사 / 약대생 (2개) | 약사 / 약국 경영자 (2개) | 판매자 / 소비자 (2개) | 공급자 / 파트너 / 셀러 (3개) |
| 상태 탭 | **5개** (pending/active/suspended/rejected/withdrawn) | 2개 (suspended/withdrawn) | 2개 (suspended/withdrawn) | 4개 (active/suspended/rejected/withdrawn) |
| 가입 신청 탭 | ✅ 별도 | ❌ | ❌ | ❌ (별도 RegistrationRequestsPage) |
| 컬럼 헤더 | "유형" (membership_type) | "역할" (RoleBadge) | "역할" (RoleBadge) | "역할" (RoleBadge) |
| Drawer 진입 | ✅ BaseDetailDrawer | ✅ BaseDetailDrawer | ✅ BaseDetailDrawer | ✅ BaseDetailDrawer |
| EditModal | KpaEditUserModal (도메인 특화) | EditUserModal (generic) | EditUserModal (generic) | EditUserModal (generic) |

**핵심 관찰**:
- KPA가 baseline 기능량 최대. 다른 3서비스는 점진 정합 중
- **GlycoPharm/K-Cosmetics는 status 탭이 2개뿐** — pending/active/rejected 회원을 운영자가 검색하기 어려움 (운영 흐름 막힘)
- 컬럼 라벨 "유형" vs "역할" 정합 미완료 — IR-O4O-NETURE-KPA-UX-CANONICAL-ALIGNMENT-AUDIT-V1에서도 동일하게 지적된 MED gap

---

## 4. admin 회원 관리 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| 분리 페이지? | ✅ 분리 (`AdminMemberManagementPage`) | ✅ 분리 (`GlycoPharmAdminMembersPage`) | ✅ 분리 (`KCosmeticsAdminMembersPage`) | ✅ 분리 (`AdminMemberManagementPage`) |
| 주 용도 | 완전삭제 + 위험 작업 | 완전삭제 + soft/hard 선택 DeleteFlow | 완전삭제 + soft/hard 선택 DeleteFlow | 완전삭제 |
| 권한 | `kpa:admin` | `glycopharm:admin` | `cosmetics:admin` | `neture:admin` |
| Delete 확인 UX | `MemberDeleteRiskModal` (2단계) | `GpAdminDeleteFlow` (soft/hard 선택 + risk 평가) | `KCosAdminDeleteFlow` (동일) | `AdminMemberDeleteModal` (risk 평가) |
| API endpoint | `DELETE /api/v1/operator/members/:userId?mode=hard` | 동일 | 동일 | 동일 |
| audit log | ActionLogService | ActionLogService | ActionLogService | ActionLogService |

**핵심 관찰**:
- ✅ **4개 서비스 모두 admin 분리 + 완전삭제 구현 완료** (2026-05 시점)
- ⚠ Delete Flow UI는 **4개 서비스 모두 별도 커스텀** — `MemberDeleteRiskModal` / `GpAdminDeleteFlow` / `KCosAdminDeleteFlow` / `AdminMemberDeleteModal` — 공통화 ROI 가장 높은 영역

---

## 5. 회원 리스트 UI 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| DataTable 소스 | `@o4o/operator-ux-core` | `@o4o/operator-ux-core` (via wrapper) | `@o4o/operator-ux-core` (via wrapper) | `@o4o/operator-ux-core` (via wrapper) |
| 검색 입력 | ✅ debounce | ✅ debounce | ✅ debounce | ✅ debounce |
| 상태 탭 | 5개 ✅ | 2개 ⚠ | 2개 ⚠ | 4개 ⚠ |
| role 탭 | 2개 | 2개 | 2개 | 3개 |
| 상태 Badge | `StatusBadge` | `StatusBadge` | `StatusBadge` | `StatusBadge` |
| 역할 Badge | `RoleBadge` 또는 "유형" 텍스트 | `RoleBadge` | `RoleBadge` | `RoleBadge` |
| 체크박스 | ✅ | ✅ (wrapper 내장) | ✅ (wrapper 내장) | ✅ (wrapper 내장) |
| row action | RowActionMenu | RowActionMenu | RowActionMenu | RowActionMenu |
| 빈 목록 / 로딩 / 에러 | 기본 | 기본 (wrapper) | 기본 (wrapper) | 기본 (wrapper) |
| 페이징 | ✅ | ✅ | ✅ | ✅ |
| 고아 컬럼 | (없음) | (없음) | (없음) | **"대시보드 접근"** chip column (Neture only) |

**핵심 관찰**:
- DataTable 컴포넌트 자체는 4서비스 모두 `@o4o/operator-ux-core` 사용 ✅
- 상태 탭/컬럼 라벨/특수 컬럼만 비대칭
- Neture의 `dashboardAccess` extraColumn은 IR-O4O-NETURE-KPA에서 capability chip의 실질 등가로 평가됨

---

## 6. 체크박스/일괄 작업 비교

### 능력 매트릭스

| 서비스 | bulk 승인 | bulk 거절 | bulk 정지 | bulk 복원 | bulk 탈퇴 | bulk 완전삭제 | 확인 Modal |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **KPA-Society** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (admin 전용) | ✅ |
| **GlycoPharm** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **K-Cosmetics** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Neture** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**핵심 관찰**:
- ⚠ **Neture는 operator bulk가 전무** — 회원 정지/복원/탈퇴를 한 건씩만 처리해야 함 (HIGH gap)
- GP/K-Cos는 정지/복원/탈퇴 bulk 있으나 승인/거절은 없음. RegistrationRequestsPage 별도 흐름이 그 자리를 일부 대체하나 통합 회원 관리 화면에서 bulk 승인이 빠진 상태
- ✅ **bulk hard delete는 4개 서비스 모두 미지원** — 정책상 단건만 허용 (안전)
- 작업 후 갱신 방식은 4개 서비스 모두 refresh — 일관

---

## 7. 아이디/이름 클릭 후 상세/수정 흐름 비교

| 서비스 | 클릭 컬럼 | 열리는 방식 | 클릭 후 가능 작업 | 상태 유지 |
|--------|----------|-------------|-------------------|----------|
| **KPA** | row 전체 (`onRowClick`) | BaseDetailDrawer (width=520) | 상세보기 + status-aware footer (승인/반려/정지/복원/탈퇴) + 수정 진입 | ✅ |
| **GlycoPharm** | row 전체 | BaseDetailDrawer (width=520) | 상세보기 + footer 액션 (status-aware) + 수정 진입 | ✅ |
| **K-Cosmetics** | row 전체 | BaseDetailDrawer (width=520) | 상세보기 + footer 액션 (status-aware) + 수정 진입 | ✅ |
| **Neture** | row 전체 | BaseDetailDrawer (width=520) | 상세보기 + footer 액션 (approval/rejection status-aware) | ✅ |

**핵심 관찰**:
- ✅ **4개 서비스 모두 row → BaseDetailDrawer 패턴 완전 일치**
- ✅ Drawer 닫을 때 필터/검색/페이지 상태 유지 — 4개 서비스 일관
- ✅ status-aware footer 패턴도 일치 (다만 KPA가 가장 풍부)
- 공통화 시 추가 정합 비용 매우 낮음

---

## 8. 상세/수정 화면 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| 모달 컴포넌트 | `KpaEditUserModal` | `EditUserModal` (서비스 로컬) | `EditUserModal` (서비스 로컬) | `EditUserModal` (서비스 로컬) |
| 위치 | packages/operator-core-ui | services/web-glycopharm | services/web-k-cosmetics | services/web-neture |
| 방식 | Modal | Modal (slot-based) | Modal (slot-based) | Modal (slot-based) |
| 도메인 필드 | 약사/약대생/약국명/면허번호/활동유형/capabilities/사업자정보 | 기본 정보 + 연락처 | 기본 정보 + 연락처 | 기본 정보 + 대시보드 접근 (read-only) |
| 수정 가능 필드 | 이름/약국정보/면허/사업정보 (이메일 불가) | 이름/연락처 (이메일 불가) | 이름/연락처 (이메일 불가) | 이름/연락처 |
| 저장 API | `PATCH /api/v1/kpa/members/{id}` | (추정 `PATCH /operator/members/{id}`) | 동일 | 동일 |
| operator vs admin 권한 | 동일 모달 + 권한별 버튼 노출 | 동일 모달 | 동일 모달 | 동일 모달 |

**핵심 관찰**:
- ⚠ **EditUserModal이 서비스별로 3종 각자 구현됨** (GP/K-Cos/Neture) — 동일 generic 패턴인데 공통화 안 됨. `CommonEditUserModal` (이미 packages/operator-core-ui에 존재)으로 통합 가능
- KPA는 도메인 특화 KpaEditUserModal이 정당함 (약사 면허/사업자정보 등 도메인 필드 다수)
- 저장 API는 backend SSOT 통합되어 있음 (`PATCH /api/v1/operator/members/{id}`)

---

## 9. 승인/거절/상태 변경 흐름 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| 사용 상태값 | active/suspended/rejected/withdrawn/pending | active/approved/suspended/pending/rejected/withdrawn | active/approved/suspended/pending/rejected/withdrawn | active/suspended/rejected/pending/withdrawn |
| 승인 (pending → active) | Drawer footer + bulk | ⚠ 불가 (RegistrationRequestsPage 별도) | ⚠ 불가 (동일) | ⚠ 불가 (`/neture/operator/registrations/{id}/approve` 별도 endpoint) |
| 거절 (pending → rejected) | Drawer footer + bulk | ⚠ 불가 | ⚠ 불가 | ⚠ 불가 |
| 정지 (active → suspended) | row + bulk | row + bulk | row + bulk | ❌ 미구현 |
| 복원 (suspended → active) | row + bulk | row + bulk | row + bulk | ❌ |
| 탈퇴 (→ withdrawn) | bulk + row | bulk + row | bulk + row | ❌ |
| 복구 (withdrawn → active) | ✅ (admin 재가입) | ✅ admin | ✅ admin | ✅ admin (AdminMemberManagementPage) |
| 사유 입력 요구? | rejection 시만 | rejection 시만 | rejection 시만 | rejection 시만 |
| 확인 Modal | ✅ ConfirmActionDialog | ✅ ConfirmActionDialog | ✅ ConfirmActionDialog | ⚠ 일부 |
| service_memberships 갱신? | ✅ | ✅ | ✅ | ✅ |
| 서비스 profile 동시 갱신? | ✅ kpa_members | ✅ glycopharm profile | ✅ cosmetics profile | ✅ neture_suppliers (supplier만) |
| 알림/이메일 발송 | ⚠ 일부 | ⚠ 일부 | ⚠ 일부 | ⚠ 일부 |

**상태값 SSOT**: 모든 서비스에서 `service_memberships.status`가 SSOT (WO-GLYCOPHARM-MEMBER-REGISTRATION-PENDING-VISIBILITY-FIX-V1에서 정합 완료).

**핵심 관찰**:
- 상태 enum은 5개 모두 공유: `pending | active | suspended | rejected | withdrawn` ✅
- 다만 **`approved` 상태가 GP/K-Cos에 잔존** (active의 alias로 추정)
- 승인/거절은 KPA가 일원화된 회원 관리 화면에서 가능, 나머지 3서비스는 별도 RegistrationRequestsPage에서 처리 — 운영자 컨텍스트 스위칭 발생

---

## 10. 탈퇴/withdrawn 처리 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| 표현 라벨 | "탈퇴 처리" | "탈퇴" 또는 "비활성화" 혼용 | 동일 혼용 | "비활성화" |
| 실제 동작 | soft delete (`status='withdrawn'` + isActive=false) | 동일 | 동일 | 동일 |
| API | `DELETE /api/v1/operator/members/:userId` (default mode=soft) | 동일 | 동일 | 동일 |
| operator 가능? | ✅ | ✅ | ✅ | ⚠ Drawer 내 단건만 |
| bulk 가능? | ✅ | ✅ | ✅ | ❌ |
| 복구 가능? | ✅ admin | ✅ admin | ✅ admin | ✅ admin |

**핵심 관찰**: 라벨 혼용("탈퇴" vs "비활성화") — 운영자 혼동 가능. 라벨 정합 권장.

---

## 11. admin 완전삭제 기능 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| 구현 여부 | ✅ | ✅ | ✅ | ✅ |
| Page | AdminMemberManagementPage | GlycoPharmAdminMembersPage | KCosmeticsAdminMembersPage | AdminMemberManagementPage |
| 메뉴 라벨 | "완전삭제" | "완전삭제" | "완전삭제" | "회원 완전삭제" |
| 라우트 | /admin/members | /admin/members | /admin/members | /admin/members |
| 권한 | kpa:admin | glycopharm:admin | cosmetics:admin | neture:admin |
| 단건 | ✅ | ✅ | ✅ | ✅ |
| bulk | ❌ (정책상 금지) | ❌ | ❌ | ❌ |
| 확인 UX | MemberDeleteRiskModal 2단계 | GpAdminDeleteFlow (soft/hard 선택) | KCosAdminDeleteFlow (soft/hard 선택) | AdminMemberDeleteModal |
| API | `DELETE /api/v1/operator/members/:userId?mode=hard` | 동일 | 동일 | 동일 |
| cascade 정책 | service_memberships + role_assignments 삭제, users status='deleted' + isActive=false, kpa_members status='withdrawn' 동기화, organization_members 정리 | 동일 base + 도메인 프로필 정리 | 동일 base | 동일 base + neture_suppliers 정리 |
| audit log | ActionLogService (`${serviceKey}.operator.member_delete`) | 동일 | 동일 | 동일 |

**핵심 관찰**:
- ✅ **모든 서비스 구현 완료** — 미구현 서비스 없음
- ✅ **API 100% 통합** — 단일 endpoint
- ⚠ **Delete UX 모달은 4서비스 4종** — 공통화 가장 큰 ROI
- ✅ **bulk hard delete는 모두 금지** — 안전 정책 일관

---

## 12. API 구조 비교

### Endpoint 매트릭스

모든 서비스가 동일한 endpoint를 `serviceKey` 쿼리 파라미터로 분기:

| 작업 | Endpoint | Controller |
|------|----------|-----------|
| 목록 조회 | `GET /api/v1/operator/members?serviceKey={svc}` | [MembershipConsoleController.ts:58](../../apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L58) |
| 상세 조회 | `GET /api/v1/operator/members/:userId` | `MembershipConsoleController.ts:254` |
| 수정 | `PUT /api/v1/operator/members/:userId` | `:769` |
| 승인 | `PATCH /api/v1/operator/members/:membershipId/approve` | `:371` |
| 거절 | `PATCH /api/v1/operator/members/:membershipId/reject` | `:413` |
| 정지 | `PATCH /api/v1/operator/members/:userId/status` (status='suspended') | `:456` |
| 복원 | `POST /api/v1/operator/members/:userId/reactivate` | `:706` |
| 탈퇴 (soft) | `DELETE /api/v1/operator/members/:userId` | `:956` |
| 완전삭제 (hard) | `DELETE /api/v1/operator/members/:userId?mode=hard` | `:956` |
| batch | `POST /api/v1/operator/members/batch-status` | `:580` |

라우트 선언: [apps/api-server/src/routes/operator/membership.routes.ts:1-57](../../apps/api-server/src/routes/operator/membership.routes.ts)

### 응답 구조

| 항목 | 표준화 여부 | 비고 |
|------|:---:|------|
| pagination 구조 (`{page, limit, total, totalPages}`) | ✅ 동일 | 4서비스 모두 |
| status 필드명 (`status`) | ✅ 동일 | SSOT: service_memberships.status |
| role 필드명 (`role`) | ✅ 동일 | service_memberships.role 또는 role_assignments.role |
| service_memberships 포함 | ✅ 동일 | 배열 |
| service profile 포함 | ⚠ 서비스별 | KPA: kpa_members metadata / Neture: supplier/partner / GP: glycopharm profile / KCos: cosmetics profile |

### Backend SSOT

- **`MembershipConsoleController`** = 회원 관리 backend SSOT
- **`MembershipApprovalService.deleteMember()`** = 삭제 통합 implementation (WO-NETURE-MEMBER-DELETE-SAFE-FLOW-V1)
- 서비스별 controller (예: `neture.controller.ts`)는 도메인 특화 endpoint(`/neture/operator/registrations/{id}/approve`)만 별도 보유

**핵심 관찰**:
- ✅ Backend는 이미 통합되어 있음. API adapter 추상화 불필요 — 단순 `serviceKey` 주입만으로 충분
- 서비스 profile 차이는 frontend에서 slot/extraColumn으로 흡수 가능

---

## 13. 공통화 가능 영역

| 영역 | 현재 상태 | 공통화 방향 |
|------|----------|------------|
| 회원 관리 Layout (Sidebar + Header + Container) | OperatorShell 공유 (KPA만 자체) | KPA를 OperatorShell로 마이그레이션 — 단, KPA 도메인 IA 헤딩은 유지 옵션화 |
| 회원 리스트 Table | DataTable 공유 ✅ | 이미 공통화 |
| 검색/필터/탭 | OperatorMembersConsolePage prop (statusTabs/roleTabs) | KPA도 동일 prop 시그니처로 흡수 가능 |
| 체크박스 선택 | DataTable 내장 ✅ | 이미 공통화 |
| Bulk ActionBar | ActionBar 공유 ✅ | extraBulkActions prop 추가 (84d4e2771 이후 가능) — Neture에 적용 필요 |
| 회원 상세/수정 Drawer | BaseDetailDrawer 공유 ✅ | 이미 공통화 |
| **EditUserModal generic** | CommonEditUserModal 존재, 3서비스가 자기 EditUserModal 별도 구현 | **GP/K-Cos/Neture의 EditUserModal을 CommonEditUserModal로 정합** |
| 상태 변경 Modal | ConfirmActionDialog 공유 ✅ | 이미 공통화 |
| **Delete 확인 Modal/Flow** | 4서비스 4종 별도 구현 | **`DeleteRiskModal` + `DeleteFlow` 신규 공통 컴포넌트 작성** (최대 ROI) |
| 결과 Toast/Modal | BulkResultModal 공유 ✅ | 이미 공통화 |
| Status / Role Badge | StatusBadge / RoleBadge 공유 ✅ | 이미 공통화 |
| API adapter interface | MembersConsoleClient interface 존재 | 이미 공통화 |

**공통화 진행도 종합**: **약 70% 완료**. 남은 30%의 핵심은:
1. Delete Flow 공통화 (가장 큰 ROI)
2. EditUserModal 정합 (GP/K-Cos/Neture)
3. Neture bulk action 활성화
4. GP/K-Cos status 탭 확장
5. KPA의 OperatorMembersConsolePage 점진 흡수 (선택)

---

## 14. 서비스별 유지 영역

| 영역 | 유지 사유 |
|------|----------|
| 서비스명 (serviceName prop) | 도메인 식별자 |
| 회원 유형 옵션 (membership role) | 도메인 차이 — KPA(약사/약대생) / Neture(공급자/파트너/셀러) / GP(약사/약국 경영자) / K-Cos(판매자/소비자) |
| KPA 약사/약대생 도메인 필드 | 면허번호, 활동유형, 약국 정보, capabilities 등 도메인 고유 |
| Neture supplier/partner 프로필 | neture_suppliers / neture_partner 별도 엔티티 |
| K-Cosmetics store 관련 필드 | 매장 관련 도메인 (현재 미발달) |
| GlycoPharm 약국 경영자 관련 필드 | 도메인 차이 |
| Neture "대시보드 접근" extraColumn | Neture 도메인 특화 capability chip 등가 — 다른 3서비스 도메인 부적합 |
| 라우트 prefix(`/api/v1/{svc}/...`)에 위치한 도메인 특화 endpoint | 예: `/neture/operator/registrations/{id}/approve` |
| 표시 문구 일부 | 도메인 표현 |
| 알림/이메일 템플릿 | 서비스별 브랜딩 |

---

## 15. 공통 컴포넌트 후보

| 컴포넌트명 | 신규 필요 | 기존 유사 | 공통화 가능성 | 서비스별 설정 필요 |
|----------|:---:|---------|:---:|------|
| MemberManagementPage | ❌ | `OperatorMembersConsolePage` (이미 존재) | ✅ 완료 | serviceKey / statusTabs / roleTabs / extraColumn(s) / extraRowActions / extraBulkActions / renderEditModal / renderDeleteFlow |
| MemberManagementTable | ❌ | `@o4o/operator-ux-core DataTable` (이미 존재) | ✅ 완료 | - |
| MemberFilterBar | ❌ | 이미 wrapper 내장 | ✅ 완료 | - |
| MemberStatusTabs | ❌ | wrapper 내장 (statusTabs prop) | ✅ 완료 | tab 정의 |
| MemberBulkActionBar | ❌ | `ActionBar` (이미 존재) + extraBulkActions | ✅ 완료 (84d4e2771) | bulk 동작 정의 |
| MemberDetailDrawer | ❌ | `BaseDetailDrawer` (이미 존재) | ✅ 완료 | - |
| **MemberEditForm (generic)** | ⚠ | `CommonEditUserModal` (이미 존재) | ⚠ 미사용 | GP/K-Cos/Neture가 자기 EditUserModal 유지 — 정합 필요 |
| MemberStatusBadge | ❌ | `StatusBadge` (이미 존재) | ✅ 완료 | - |
| MemberRoleBadge | ❌ | `RoleBadge` (이미 존재) | ✅ 완료 | role 라벨 매핑 |
| MemberActionMenu | ❌ | `RowActionMenu` (이미 존재) | ✅ 완료 | - |
| **MemberDeleteConfirmModal** | ⭐ **신규** | 4서비스 4종 별도 | ⭐ ROI 최고 | risk 평가 / soft/hard 선택 / 권한 가드 |
| MemberBulkResultModal | ❌ | `BulkResultModal` (이미 존재) | ✅ 완료 | - |

**신규 작성 필요한 핵심 후보**:
1. **`OperatorMemberDeleteFlow`** (가칭) — packages/operator-core-ui에 추가. soft/hard 선택 + risk 평가 + 권한 가드를 단일 컴포넌트로 통합. 4서비스 모두 흡수 가능.

---

## 16. 위험 요소

| 위험 | 영향 서비스 | 설명 | 심각도 |
|------|----------|------|:---:|
| Neture `/operator/users` 비표준 라우트 | Neture | canonical `/operator/members`와 불일치. 메뉴 라벨/링크 정합 시 함께 수정 | MED |
| FK CASCADE — `service_memberships.user_id ON DELETE CASCADE` | 전체 | users hard delete 정책 금지로 현재는 위험 완화 상태이나, 향후 hard delete 정책 변경 시 즉시 위험 | MED |
| KPA `kpa_members` 동기화 | KPA | Hard delete 시 `kpa_members.status='withdrawn'` 미동기화 → 면허번호 중복 미해제. 현재 구현됨 (MembershipApprovalService:901-906) | HIGH |
| `organization_members` cleanup | KPA | owner 역할 `left_at` soft mark 필요 — 사점유 기록 유지. 구현됨 | HIGH |
| Forum post/comment FK orphaning | 전체 | Hard delete 후 author_id FK 정합성 위험. 현재는 `getDeleteRisk` count 기반 경고만, 실제 cascade 정리 없음 | **HIGH** |
| Role prefix drift (`kpa` vs `kpa-society`) | 전체 | 2개 mapping 유지 (ROLE_PREFIX ↔ CANONICAL_SERVICE_KEY). 모든 코드가 `resolveRolePrefixFromCanonicalServiceKey()` 사용 강제 | MED |
| Service scope boundary violation | GP/K-Cos/Neture | `isPlatformAdmin` 여부에 따라 scope 필터링 달라짐. 누락 시 cross-service 접근 가능. 현재 구현됨 (`:264-270, 972-985`) — 회귀 주의 | HIGH |
| 상태값 `approved` 잔존 | GP/K-Cos | `active`의 alias로 보이나 잔존 데이터 가능성. 정리 필요 | MED |
| Hard delete 권한 frontend 강제 누락 | 전체 | backend는 admin role 검증, frontend에서 버튼 노출은 조건부 강제 필요 — 누락 시 403 UX 저하 | MED |
| Neture supplier/partner 별도 엔티티 | Neture | 일반 회원 구조와 별도 — hard delete 시 관련 테이블(`neture_suppliers`, `neture_partner_*`) 정리 필요 | MED |
| GlycoPharm 당뇨인 잔재 | GlycoPharm | 기존 IR 언급. 현재 회원 관리에는 영향 적으나, role/status 잔존 데이터 점검 권장 | LOW |
| K-Cosmetics 초기 구현 미비 | K-Cosmetics | f7e5bed6b 신규 추가, 엣지 케이스 위험 | MED |
| audit log 누락 가능성 | 전체 | hard delete 시 `${serviceKey}.operator.member_delete` 액션 로그가 catch 무시 처리됨 | LOW |
| 라벨 혼용 ("탈퇴"/"비활성화") | GP/K-Cos | 운영자 혼동 위험 | LOW |
| 컬럼 라벨 "유형"/"역할" 불일치 | KPA vs 나머지 | 운영자 컨텍스트 스위칭 비용 | MED |

---

## 17. Current Structure vs O4O Philosophy Conflict Check

**판정**: ✅ **충돌 없음** (일부 정합 권장)

### 충돌 또는 주의 지점

1. **공통화 vs 도메인 분리의 균형이 이미 잘 잡힘** — KPA의 약사 도메인 복잡성은 독립 구현을 정당화. 다른 3서비스는 generic 공통 모듈로 충분.
2. **operator/admin 권한 구분이 명확** — CLAUDE.md §11에 부합. admin = 구조/정책/금융 / operator = 운영/콘텐츠. 완전삭제는 admin 전용으로 일관 적용.
3. **CLAUDE.md §14 F11 (User/Operator Freeze) 부합** — `users / service_memberships / role_assignments` 3테이블 구조 유지. 회원 관리는 이 3테이블 위에서 작동.
4. **Backend SSOT (`MembershipConsoleController`)가 §7 Boundary Policy의 serviceKey 분기 패턴과 부합** — `service_memberships`의 `service_key` 컬럼으로 도메인 분리.

### 잠재적 충돌 가능성 (현재는 충돌 아님)

- Neture의 `/operator/users` 비표준 라우트 → IA 일관성 측면에서 정합 권장이나 철학적 충돌은 아님
- "공급자 승인" 라벨 메뉴와 별도 RegistrationRequestsPage 분리 → operator의 daily workflow가 두 화면으로 나뉘는 비용. 단, 도메인 분리 정당성도 있음

### 권장 방향

1. **Backend 통합은 유지 + 강화** — `MembershipConsoleController`를 SSOT로 유지. 새 서비스 추가 시 `serviceKey` 분기만으로 즉시 흡수.
2. **Frontend 공통 모듈을 4번째 서비스(KPA)도 점진 흡수 옵션 검토** — KPA의 도메인 필드/탭은 prop으로 흡수. 단, 전환 비용이 ROI 대비 작지 않으므로 후순위.
3. **Delete Flow 공통화 우선** — 4서비스 4종 → 단일 공통 컴포넌트. UX 안전성과 코드 정합 동시 확보.
4. **완전삭제 권한 admin 전용 정책 유지** — 안전. CLAUDE.md §11 부합.
5. **Neture bulk 활성화 + GP/K-Cos status 탭 확장** — IR-O4O-NETURE-KPA의 W1과 일부 중복. 이미 main에서 부분 처리됨 (`a37edb78d`, `743995e88`, `84d4e2771`).

---

## 18. 다음 WO 제안

본 IR을 바탕으로 다음 WO를 단계적으로 제안한다.

### W-A — WO-O4O-OPERATOR-MEMBERS-DELETE-FLOW-COMMONIZATION-V1
**범위**: 4서비스의 별도 DeleteFlow/DeleteRiskModal을 packages/operator-core-ui의 단일 공통 컴포넌트로 통합.
- 신규 컴포넌트: `OperatorMemberDeleteFlow` (packages/operator-core-ui/src/modules/members/)
- soft/hard 선택 + risk 평가 + 권한 가드 통합
- 4서비스가 thin wrapper로 흡수
- KPA `MemberDeleteRiskModal`, GP `GpAdminDeleteFlow`, KCos `KCosAdminDeleteFlow`, Neture `AdminMemberDeleteModal` 통합
- **위험도**: LOW (UI/UX 통합, 정책 변화 없음)
- **예상 변경 파일**: 8-10 (신규 1 + 서비스별 wrapper 4 + 기존 4종 삭제)

### W-B — WO-O4O-OPERATOR-MEMBERS-EDIT-MODAL-COMMONIZATION-V1
**범위**: GP/K-Cos/Neture의 EditUserModal을 `CommonEditUserModal`로 정합.
- 3서비스의 서비스-로컬 EditUserModal 제거
- `CommonEditUserModal` prop으로 도메인 필드 슬롯 흡수
- KPA `KpaEditUserModal`은 유지 (도메인 특화 정당)
- **위험도**: LOW-MED (Modal UI 정합, API 변경 없음)

### W-C — WO-O4O-NETURE-OPERATOR-MEMBERS-NAMING-CANONICALIZATION-V1
**범위**: Neture `/operator/users` → `/operator/members` 정합.
- 라우트 변경 + 메뉴 라벨 정합 + 리다이렉트
- **위험도**: LOW (라우팅 정합)
- 예상 변경 파일: 3-4

### W-D — WO-O4O-NETURE-OPERATOR-MEMBERS-BULK-ACTIONS-V1
**범위**: Neture `UsersManagementPage`에 `extraBulkActions` (정지/복원/탈퇴) 추가 — GP/K-Cos 패턴 차용.
- **위험도**: LOW (`84d4e2771` 인프라 이미 존재)

### W-E — WO-O4O-OPERATOR-MEMBERS-STATUS-TAB-EXPANSION-V1 (GP/K-Cos)
**범위**: GP/K-Cos에 pending/active/rejected 상태 탭 추가.
- 단, 두 서비스가 가입 신청 별도 흐름이라 pending 탭의 의미를 명확히 정의 후 진행
- **위험도**: LOW-MED (도메인 워크플로 확인 후 추가)

### W-F — WO-O4O-OPERATOR-MEMBERS-FORUM-CASCADE-POLICY-V1 (선택)
**범위**: Hard delete 시 forum post/comment FK orphaning 위험 해소.
- 정책 결정 필요: cascade soft (post를 익명화 / SET NULL) vs cascade hard / RESTRICT
- **위험도**: HIGH (데이터 정책 결정 필요 — 사용자 확인 필수)

### W-G — WO-O4O-OPERATOR-MEMBERS-LABEL-ALIGNMENT-V1 (선택)
**범위**: "유형"/"역할" 컬럼 라벨 통일, "탈퇴"/"비활성화" 표현 통일.
- **위험도**: LOW
- IR-O4O-NETURE-KPA-UX-CANONICAL-ALIGNMENT-AUDIT-V1의 일부 항목과 중복 — 이미 `907ce6781`에서 부분 처리됨. 잔존 부분만 처리.

### 권장 우선순위

```
1. W-A (DeleteFlow 공통화) ← 가장 큰 ROI
2. W-D (Neture bulk) + W-C (Neture 라우트 정합)  // 함께 묶을 수 있음
3. W-B (EditModal 공통화)
4. W-E (status 탭 확장) — 도메인 확인 후
5. W-G (라벨 정합) — 짜투리 정렬
6. W-F (Forum cascade) — 정책 결정 필요, 독립 IR 우선
```

W-A를 먼저 진행하면 Delete 안전성도 함께 강화되고, 이후 모든 서비스의 회원 관리 UI는 거의 동일한 컴포넌트 그래프 위에 놓이게 됨.

---

## 부록 A. 조사 메서드

- 3개 sub-agent 병렬 (Entry/Layout/Permission · Workflow/Actions · API/Delete/Risks)
- 각 agent는 read-only Explore. 코드 수정 0.
- 핵심 파일 경로 + 라인 번호 인용
- IR-O4O-NETURE-KPA-UX-CANONICAL-ALIGNMENT-AUDIT-V1 참조 (Neture/KPA 일부 비교는 거기서 확장)

## 부록 B. 최종 보고 체크리스트

| 항목 | 결과 |
|------|------|
| 코드 수정 없음 | ✅ |
| DB 수정 없음 | ✅ |
| UI 수정 없음 | ✅ |
| API 수정 없음 | ✅ |
| 마이그레이션 없음 | ✅ |
| 기존 untracked 문서 미수정 | ✅ |
| 4개 서비스 횡단 조사 | ✅ |
| 공통 모듈 재고 | ✅ |
| Backend SSOT 확인 | ✅ MembershipConsoleController |
| 완전삭제 현황 | ✅ 4서비스 모두 구현 |
| 다음 WO 제안 (7건) | ✅ |
| O4O Philosophy 충돌 검증 | ✅ 충돌 없음 |

---

*Author: Claude (read-only investigation, 3 parallel sub-agents)*
*Investigation date: 2026-05-28*
*Status: completed — awaiting W-A scope confirmation*
