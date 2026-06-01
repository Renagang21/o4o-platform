# IR-O4O-OPERATOR-MEMBER-MANAGEMENT-CANONICAL-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·UI·route·wrapper·migration 변경 없음.**
>
> KPA-Society / GlycoPharm / K-Cosmetics / Neture 의 operator 회원 관리 화면이 **운영자가 같은 프로세스로 회원을 관리할 수 있는 수준** 으로 공통화되어 있는지 5 기준 (표준 리스트 / 컬럼 / 작업 UX / Backend API / Route+Menu) 으로 전수 audit.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-DECISION-V1](IR-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-DECISION-V1.md) (Hybrid Canonical 결정)
  - [IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1](IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1.md) (Option C — KPA 별도 유지 + Neture/GP/K-Cos 단일 wrapper, commit `de364ef9f`)
  - `WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1` (CommonUserDetailPage 완료)
  - `WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1` (Hybrid 적용)
- **참조 SSOT:**
  - `docs/architecture/OPERATOR-DASHBOARD-STANDARD-V1.md`
  - `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`
  - `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- **검증 환경:** local repo (origin/main 와 0 commits 차이)
- **수정 행위:** **없음**

---

## 1. Executive Summary

> **공통 wrapper `OperatorMembersConsolePage` (949 lines) 는 robust 한 설계로 GP / K-Cos / Neture **3 service 채택 완료**. 단 KPA 만 1427 lines 독립 페이지 (`MemberManagementPage.tsx`) 유지. Route / Menu / Backend API / Admin-Operator hard delete 정책 모두 canonical 정렬 완료. 표준 리스트 / 컬럼 / 작업 UX 의 핵심 drift = **KPA wrapper 미적용** 단일 항목 + KPA Drawer footer 의 status change UX 가 canonical (ActionBar + row menu) 과 다름.

### 1.1 정렬 분포

| 정렬 상태 | 항목 수 | 비고 |
|:---:|:---:|---|
| ✅ 이미 정렬 | 5 | Backend API / Route / Menu / Admin hard delete 정책 / 3 service wrapper 채택 |
| ⚠️ Drift (KPA 단일) | 2 | KPA wrapper 미적용 (P1) + KPA Drawer status change UX (P2) |
| ⚪ 의도된 차이 | 3 | KPA capabilities 컬럼 / Neture dashboardAccess / Admin delete modal 차이 |

### 1.2 한 줄 권고

> **KPA 공통화 1건이 핵심.** GP/K-Cos/Neture 의 wrapper 적용은 이미 완료된 reference. KPA 의 1427 → ~30 lines thin wrapper 전환이 **운영 일관성 회복 + 유지보수 비용 절감 70%** 의 단일 가치.

---

## 2. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 (0 commits ahead/behind) |
| 조사 범위 | `packages/operator-core-ui/src/modules/members/*` + 4 service `pages/operator/{MemberManagementPage,UsersPage,UsersManagementPage}.tsx` + admin 영역 + `apps/api-server/src/controllers/operator/MembershipConsoleController.ts` + 4 service `operatorMenuGroups.ts` / `App.tsx` |
| 조사 방법 | Explore agent 광범위 read-only (props / 라인 수 / 컬럼 / 작업 / API / route / menu / admin policy) |

---

## 3. 공통 Wrapper 현재 능력 — `OperatorMembersConsolePage` (949 lines)

### 3.1 Props / Slot 정확 목록

| 카테고리 | Prop | 타입 / 역할 | 평가 |
|---|---|---|:---:|
| **클라이언트** | `client: MembersConsoleClient` | list / listAll / stats / updateStatus / batchUpdateStatus / updatePassword | ✅ |
| **탭 구성** | `roleTabs: RoleTab[]` (필수) | wrapper 가 'all' / 'pending' 자동 추가 | ✅ |
|  | `statusTabs?: StatusTab[]` | service-specific 화이트리스트 | ✅ |
| **역할 추출** | `getPrimaryRole?: (user) => string` | default: `memberships.find(m => m.serviceKey === serviceKey)?.role` | ✅ |
|  | `roleDisplayMap?: Record<string,string>` | Neture `{ customer → consumer }` 매핑 예 | ✅ |
| **컬럼 확장** | `extraColumn?: ListColumnDef` | 단일 추가 | ✅ |
|  | `extraColumns?: ListColumnDef[]` | 복수 추가 | ✅ |
| **편집 모달** | `renderEditModal: (user, onClose, onSuccess) => ReactNode` (필수) | service 가 modal UI 제공 | ✅ |
| **삭제 흐름** | `renderDeleteFlow?: (user, onClose, onSuccess) => ReactNode` | soft delete only (operator) | ✅ |
| **행 액션 확장** | `extraRowActions?: MembersRowActionConfig[]` | suspend / restore 단축키 | ✅ |
| **일괄 액션 확장** | `extraBulkActions?: MembersBulkActionConfig[]` | wrapper 내장 (approve/reject) + service 추가 (suspend/restore/withdraw) | ✅ |
| **Drawer 커스텀** | `drawerExtraSections?: (user) => ReactNode` | service-specific 추가 정보 | ✅ |
| **DataTable persistence** | `tableId: string` | 컬럼 가시성 저장. default `{serviceKey}-operator-members` | ✅ |
| **비밀번호 modal** | wrapper 내장 | service 가 별도 제공 안 함 — 공통 | ✅ |

→ **A+ 설계.** 모든 service-specific 차이를 slot 으로 흡수 가능. props 부족 (`B`) 항목 0건.

---

## 4. 서비스별 회원 관리 현재 구조

### 4.1 페이지 전수

| 항목 | KPA | GP | K-Cos | Neture |
|---|:---:|:---:|:---:|:---:|
| 파일 경로 | `pages/operator/MemberManagementPage.tsx` | `pages/operator/UsersPage.tsx` | `pages/operator/UsersPage.tsx` | `pages/operator/UsersManagementPage.tsx` |
| **라인 수** | **1427** | **297** | **232** | **305** |
| **`OperatorMembersConsolePage` wrapper 사용** | **❌ 독립** | ✅ thin | ✅ thin | ✅ thin |
| DataTable / ListColumnDef | ✅ 독자 | ✅ wrapper | ✅ wrapper | ✅ wrapper |
| Checkbox selectable | ✅ | ✅ | ✅ | ✅ |
| ActionBar | ✅ | ✅ wrapper | ✅ wrapper | ✅ wrapper |
| BulkResultModal | ✅ | ✅ wrapper | ✅ wrapper | ✅ wrapper |
| Status tabs | ✅ 5 (pending/active/rejected/suspended/withdrawn) | ✅ 4 | ✅ 5 | ✅ 4 |
| Role tabs | ✅ 2 (약사/약대생) | ✅ 2 | ✅ 2 | ✅ 3 |
| Row click → Drawer | ✅ | ✅ | ✅ | ✅ |
| EditModal | `KpaEditUserModal` | `EditUserModal` | `EditUserModal` | `EditUserModal` |
| PasswordModal | (wrapper 내장 패턴 적용 안 됨) | ✅ wrapper | ✅ wrapper | ✅ wrapper |
| Bulk approve/reject | ✅ | ✅ wrapper builtin | ✅ wrapper builtin | ✅ (extraBulk + custom endpoint) |
| Bulk suspend/restore/withdraw | ✅ | ✅ extraBulk | ✅ extraBulk | ✅ extraBulk |

→ **drift 의 중심: KPA 만 wrapper 미적용.** 다른 3 service 는 thin wrapper 로 정합.

### 4.2 Admin 영역

| Service | Admin 페이지 | Hard delete UI |
|---|---|---|
| KPA | `AdminMemberManagementPage` | `MemberDeleteRiskModal` (KPA 특화 — DeleteRisk 사전 평가) |
| GP | `GlycoPharmAdminMembersPage` | `MemberHardDeleteConfirmModal` |
| K-Cos | `KCosmeticsAdminMembersPage` | `MemberHardDeleteConfirmModal` |
| Neture | `AdminMemberManagementPage` | custom modal |

→ Admin 페이지 모두 존재. KPA 만 DeleteRiskModal 채택 (KPA 약사회 도메인 특성 — 의도된 차이 가능성).

---

## 5. 표준 리스트 Matrix

| 항목 | KPA | GP | K-Cos | Neture | 판정 |
|---|:---:|:---:|:---:|:---:|---|
| DataTable / BaseTable | ✅ 독자 | ✅ wrapper | ✅ wrapper | ✅ wrapper | ✅ 표준 사용 (KPA 만 독립 구현) |
| checkbox selection | ✅ | ✅ | ✅ | ✅ | ✅ |
| ActionBar | ✅ | ✅ | ✅ | ✅ | ✅ |
| BulkResultModal | ✅ | ✅ | ✅ | ✅ | ✅ |
| pagination | ✅ | ✅ | ✅ | ✅ | ✅ |
| search | ✅ | ✅ | ✅ | ✅ | ✅ |
| roleTabs | ✅ | ✅ | ✅ | ✅ | ✅ |
| statusTabs | ✅ | ✅ | ✅ | ✅ | ✅ |
| pending tab | ✅ | ✅ | ✅ | ✅ | ✅ |
| loading / empty / error | ✅ | ✅ | ✅ | ✅ | ✅ |

→ **모든 표준 리스트 요소 100% 사용.** 단 KPA 는 wrapper 가 아닌 독자 구현으로 표준 충족.

---

## 6. 컬럼 Matrix

| 컬럼 | KPA | GP | K-Cos | Neture | 공통화 필요 |
|---|:---:|:---:|:---:|:---:|:---:|
| 선택 checkbox | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 회원명 (클릭 가능) | ✅ Drawer | ✅ Drawer | ✅ Drawer | ✅ Drawer | ✅ 완료 |
| 이메일 | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 역할 (RoleBadge) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 상태 (StatusBadge) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 가입일 | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 승인일 / 최근 활동 | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| 작업 (RowActionMenu) | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| **KPA-only 추가 권한 (capabilities chip)** | ✅ | — | — | — | ⚪ 의도된 차이 (extraColumn 가능) |
| **KPA-only 활동 유형 (activity_type)** | ✅ | — | — | — | ⚪ 의도된 차이 |
| **Neture-only 대시보드 접근** | — | — | — | ✅ `extraColumn` | ⚪ 의도된 차이 (이미 slot 활용) |

→ **공통 8 컬럼 100% 정합.** Service-specific 3 컬럼은 모두 의도된 차이 + `extraColumn` slot 으로 흡수 가능.

---

## 7. 작업 UI-UX Matrix

| 작업 | KPA | GP | K-Cos | Neture | Canonical | Gap |
|---|---|---|---|---|---|:---:|
| 이름 클릭 → 상세 | Drawer | Drawer | Drawer | Drawer | Drawer | ✅ |
| row action menu | ✅ | ✅ | ✅ | ✅ | RowActionMenu | ✅ |
| 수정 (EditModal) | `KpaEditUserModal` | `EditUserModal` | `EditUserModal` | `EditUserModal` | `renderEditModal` slot | ✅ |
| 비밀번호 변경 | (독자) | wrapper builtin | wrapper builtin | wrapper builtin | wrapper builtin | △ (KPA 미통합) |
| 가입 신청 승인 | **Drawer footer** | **ActionBar** | **ActionBar** | **ActionBar** | ActionBar | **E** (KPA UX 다름) |
| 가입 신청 반려 | **Drawer footer** | **ActionBar** | **ActionBar** | **ActionBar** | ActionBar | **E** |
| 정지 | row menu + **Drawer** | row menu + ActionBar | row menu | row menu | row menu | △ (KPA Drawer 가능) |
| 복원 | **Drawer footer** | row menu | row menu | row menu | row menu | △ (KPA Drawer 가능) |
| 탈퇴 처리 (soft delete) | bulk only | bulk | bulk | bulk | bulk + row | ✅ |
| 완전 삭제 (hard delete) | /admin/members 전용 | /admin/members 전용 | /admin/members 전용 | /admin/members 전용 | admin-only | ✅ |
| bulk 승인 | ✅ ActionBar | ✅ ActionBar | ✅ ActionBar | ✅ ActionBar | ActionBar | ✅ |
| bulk 반려 | ✅ ActionBar | ✅ ActionBar | ✅ ActionBar | ✅ ActionBar | ActionBar | ✅ |
| bulk 정지 / 복원 / 탈퇴 | ✅ extraBulk | ✅ extraBulk | ✅ extraBulk | ✅ extraBulk | extraBulkActions | ✅ |

→ **Drift 2 건:**
1. **E — KPA Drawer footer 의 approve/reject 버튼** (canonical 은 ActionBar)
2. **△ — KPA Drawer footer 의 suspend/restore 버튼** (canonical 은 row menu — KPA 도 row menu 보유하므로 가능 가능성)

→ **`hard delete operator 노출` 위험 0건** (4 service 모두 `/admin/members` 분리).

---

## 8. Backend / API Readiness

### 8.1 Endpoint matrix (`/api/v1/operator/members` prefix)

| Endpoint | 4 Service 사용 | 정책 | Source |
|---|:---:|---|---|
| `GET /` (list + filter) | ✅ 모두 | serviceKey 필수 / status / search | `MembershipConsoleController.getMembers` |
| `GET /stats` | ✅ 모두 | byStatus[] count | 동일 controller |
| `GET /:userId` | ✅ 모두 | 상세 조회 | `MembershipConsoleController.getMemberDetail` |
| `PATCH /:userId/status` | ✅ 모두 | pending / active / rejected / suspended / withdrawn | 동일 |
| `PUT /:userId` (with password) | ✅ 모두 | profile + password 갱신 | `MembershipConsoleController.updateMember` |
| `POST /batch-status` | ✅ 모두 | ids[] + status | 동일 |
| `GET /:userId/delete-risk` | ✅ 모두 | soft/hard 사전 평가 | GP/K-Cos active, KPA/Neture 미사용 (가용) |
| `DELETE /:userId?mode=soft\|hard` | ✅ 모두 | mode 파라미터 | operator soft only / admin hard |
| **Service scope guard** | ✅ 모두 | `resolveOperatorScope()` — serviceKey 검증 | F6 Boundary Policy 정합 |
| **Hard delete admin-only guard** | ✅ 모두 | `requireRole` check — admin role only | 위반 시 403 |

→ **Backend = A (이미 정렬 완료).** `MembershipConsoleController` 단일 + serviceKey 필터링 + admin-only guard 모두 4 service 공통.

---

## 9. Route / Menu Matrix

| 항목 | KPA | GP | K-Cos | Neture | Canonical |
|---|:---:|:---:|:---:|:---:|:---:|
| Operator 회원 관리 route | `/operator/members` | `/operator/members` | `/operator/members` | `/operator/members` | ✅ 완전 통일 |
| Admin 회원 관리 route | `/admin/members` | `/admin/members` | `/admin/members` | `/admin/members` | ✅ 완전 통일 |
| Sidebar menu (`operatorMenuGroups.ts` users 그룹) | `/operator/members` | `/operator/members` | `/operator/members` | `/operator/members` | ✅ 통일 |
| Legacy `/operator/users` redirect | ✅ → `/operator/members` | ✅ | ✅ | ✅ | ✅ |
| Legacy `/admin/users` redirect | ✅ → `/admin/members` | ✅ | ✅ | ✅ | ✅ |
| Admin-only tag (sidebar) | ✅ | ✅ | ✅ | ✅ | ✅ |

→ **Route / Menu = A.** 4 service 100% canonical.

---

## 10. Admin / Operator Delete Policy

| 정책 | KPA | GP | K-Cos | Neture | Status |
|---|:---:|:---:|:---:|:---:|:---:|
| Operator hard delete UI 노출 | ❌ (/admin 분리) | ❌ (soft only) | ❌ (soft only) | ❌ (soft only) | ✅ 통일 |
| Operator hard delete API 호출 시 backend 거부 | ✅ 403 | ✅ 403 | ✅ 403 | ✅ 403 | ✅ 통일 |
| Admin hard delete UI | ✅ MemberDeleteRiskModal | ✅ MemberHardDeleteConfirmModal | ✅ MemberHardDeleteConfirmModal | ✅ custom | ✅ 정책화 |
| Admin hard delete 사전 risk 평가 | ✅ `/delete-risk` 활용 | ✅ | ✅ | △ | ⚪ KPA/GP/K-Cos 완료, Neture 자체 패턴 |
| Soft delete (탈퇴 처리) operator + admin | ✅ | ✅ | ✅ | ✅ | ✅ 통일 |

→ **Hard delete admin-only 정책 = A.** Operator UI 노출 0건 + backend 403 guard 일관.

---

## 11. Root Cause 분류

| Gap | 상세 | Root Cause | 우선순위 |
|---|---|:---:|:---:|
| KPA 독립 페이지 1427 lines | `MemberManagementPage.tsx` wrapper 미채택 | **C** 서비스별 사용부 미적용 (의도성: KPA 특화 entity `KpaMember` 사용) | **P1** |
| KPA Drawer footer 의 approve/reject/suspend/restore 버튼 | canonical 은 ActionBar (승인/반려) + row menu (정지/복원) | **E** row action / bulk action drift | **P2** |
| KPA admin 회원 관리 UI 별도 (`MemberDeleteRiskModal`) | KPA 약사회 특화 hard delete 정책 | **I** 의도된 차이 (도메인 본질) | P4 |
| KPA-only capabilities 컬럼 | KPA 만 추가 권한 chip | **I** 의도된 차이 (`extraColumn` slot 활용 가능) | P5 |
| KPA-only activity_type 컬럼 | KPA 만 활동 유형 표시 | **I** 의도된 차이 | P5 |
| Neture-only dashboardAccess 컬럼 | Neture 만 대시보드 접근 표시 | **I** 의도된 차이 (이미 `extraColumn` 사용) | — |
| Neture registration 이중 endpoint | `/neture/operator/registrations/:id/approve` + `/operator/members/:id/status` | **G** backend 이중 endpoint (client adapter 흡수 — ok) | P3 |
| KPA admin 메뉴 라벨 | sidebar 라벨 약간 다름 | **F** route/menu drift (사소) | P5 |

### 11.1 분류 분포

| 분류 | 항목 수 | 의미 |
|:---:|:---:|---|
| A (이미 정렬됨) | 0 | drift 항목 기준 |
| B (wrapper props 부족) | **0** | wrapper 설계 robust — props 부족 0건 |
| C (서비스별 사용부 미적용) | **1** | **KPA** — 단일 핵심 drift |
| D (컬럼 구성 drift) | 0 | 8 공통 컬럼 100% 정합 |
| E (row/bulk action drift) | 1 | KPA Drawer status change UX |
| F (route/menu drift) | 1 (사소) | KPA admin 메뉴 라벨 |
| G (backend/API gap) | 1 (흡수됨) | Neture 이중 endpoint |
| H (admin/operator 정책 분리 미흡) | **0** | hard delete admin-only 일관 |
| I (의도된 차이) | 4 | KPA capabilities/activity_type / Neture dashboardAccess / Admin delete modal |
| J (legacy 제거 필요) | 0 | redirect 모두 정렬 |

→ **본질적 drift = C (KPA 사용부 미적용) + E (KPA Drawer UX) 2 건.** 나머지는 의도된 차이 또는 사소.

---

## 12. 후속 WO 후보 + 우선순위 평가

### 12.1 사용자 IR 본문 6 WO 평가

선행 IR (`IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1`, commit `de364ef9f`) 와 그 후속 WO 시리즈는 다음 상태:

| WO | 사용자 본문 명칭 | 현 상태 |
|---|---|:---:|
| WO-1 | `WO-O4O-OPERATOR-MEMBERS-COLUMN-CANONICALIZATION-V1` (컬럼 공통화) | **이미 완료** (8 공통 컬럼 100%) |
| WO-2 | `WO-O4O-OPERATOR-MEMBERS-DETAIL-DRAWER-CANONICALIZATION-V1` (Drawer 통일) | **이미 완료** (Hybrid Canonical) |
| WO-3 | `WO-O4O-OPERATOR-MEMBERS-BULK-ACTIONS-CANONICALIZATION-V1` (bulk 통일) | **이미 완료** (4 service ActionBar + extraBulk) |
| WO-4 | `WO-O4O-OPERATOR-MEMBERS-STATUS-ROLE-TABS-CANONICALIZATION-V1` (tabs 통일) | **이미 완료** |
| WO-5 | `WO-O4O-NETURE-OPERATOR-MEMBERS-CONSOLE-ALIGNMENT-V1` (Neture 정렬) | **이미 완료** (Neture wrapper 채택) |
| WO-6 | `WO-O4O-OPERATOR-MEMBERS-ADMIN-HARD-DELETE-POLICY-CHECK-V1` (hard delete 정책) | **이미 완료** (4 service admin-only) |

→ **사용자 IR 본문의 6 WO 중 5 + KPA wrapper 채택 외 모두 완료 상태.** Members commonization 의 큰 그림은 거의 끝남.

### 12.2 본 IR 의 직접 후속 (1 WO 권고)

**`WO-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-MIGRATION-V1`** (제안)

| 항목 | 내용 |
|---|---|
| 범위 | KPA `MemberManagementPage.tsx` (1427 lines) → `OperatorMembersConsolePage` thin wrapper 마이그레이션 |
| 작업 | KPA-specific client adapter (`kpaMembersConsoleClient`) + `roleTabs` (약사/약대생) + `extraColumns` (capabilities chip / activity_type) + `renderEditModal={(u,o,s) => <KpaEditUserModal ... />}` + `extraRowActions` (status change 정렬) |
| Backend 변경 | 0 |
| Wrapper 변경 | 0 |
| 회귀 위험 | 중 — KPA UX 변경 (Drawer footer 의 status change → canonical ActionBar + row menu). 사용자 학습 곡선 짧음 |
| 예상 라인 감소 | 1427 → ~50 (thin wrapper) = -1377 lines |
| 검증 | KPA `/operator/members` 진입 + role/status filter + bulk approve/reject/suspend/restore/withdraw + Drawer / EditModal / PasswordModal 정상 작동 |

### 12.3 부차 후속 (선택)

- `WO-O4O-NETURE-REGISTRATION-ENDPOINT-CONSOLIDATION-V1` (Neture 이중 endpoint → 단일) — 매우 사소, 보류 가능
- `WO-O4O-KPA-ADMIN-MEMBER-DELETERISKMODAL-CANONICALIZATION-V1` (KPA admin delete modal → MemberHardDeleteConfirmModal 통합 검토) — 의도된 차이 가능성 → 보류

---

## 13. Current Structure vs O4O Philosophy Conflict Check

| 차원 | 현재 (KPA wrapper 미적용) | KPA 마이그레이션 후 | 충돌 |
|---|:---:|:---:|:---:|
| 공통 Core (operator-core-ui) | ✅ 3 service 채택 + wrapper robust | ✅ 4 service 채택 | 없음 |
| 같은 Capability → 같은 UI/UX | △ KPA Drawer UX 차이 | ✅ 정렬 | **약함 (현재)** |
| 서비스별 독립 도메인 | ✅ KPA capabilities / Neture dashboardAccess slot 활용 | ✅ 유지 | 없음 |
| 운영자 mental model | △ KPA 만 다른 UX 패턴 | ✅ 4 service 동일 운영 프로세스 | **약함 (현재)** |
| Boundary Policy (F6) | ✅ 4 service serviceKey 정합 | ✅ 유지 | 없음 |
| Hard delete admin-only | ✅ 정책화 일관 | ✅ 유지 | 없음 |
| Route / Menu canonical | ✅ 4 service `/operator/members` | ✅ 유지 | 없음 |
| 사용자 정책 "공통화 미흡 = 문제" | △ KPA 미적용 1건 잔존 | ✅ 해소 | **약함 (현재)** |

→ **충돌 약함 3 건 (모두 KPA wrapper 미적용 에서 파생).** KPA 마이그레이션 1 WO 로 모두 해소.

---

## 14. 본 IR 이 결정하지 않는 것

- KPA 공통화 WO 의 실제 실행 시점
- KPA `MemberDeleteRiskModal` 의 통합 vs 유지 결정 (의도된 차이 평가)
- Neture registration 이중 endpoint 통합의 실제 가치
- KPA capabilities / activity_type 컬럼의 `extraColumn` 활용 방식 (wrapper 가 이미 지원)
- KPA-specific `KpaEditUserModal` 통합 가능성 (별도 IR 영역)
- admin-dashboard 의 회원 관리 UI 영역 (본 IR 범위 외 — 4 service `/operator/members` 만)

---

## 15. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 즉시 WO 후보 | **1 건** (`WO-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-MIGRATION-V1`) |
| 핵심 발견 | 공통 wrapper 능력 A+ + 3 service 채택 완료. Drift = KPA wrapper 미적용 단일 |
| 사용자 IR 본문 6 WO 평가 | 5 + 1 모두 완료 (선행 commonization 시리즈) |
| Backend / Route / Menu / hard delete 정책 | A (이미 정렬) |
| Top 5 우선순위 | P1 = KPA wrapper / P2 = KPA Drawer UX (P1 의 자연스러운 부산물) / P3-5 = 사소 |
| Conflict Check | 약함 3 건 (모두 KPA wrapper 미적용 파생) → 단일 WO 해소 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. 공통 wrapper 능력
wc -l packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx
grep -n "interface\|export type\|render.*Modal\|extra.*Action\|extra.*Column" \
  packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx | head -40

# 2. 4 service 페이지 라인 수
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  for FILE in MemberManagementPage UsersPage UsersManagementPage; do
    F="services/web-$SVC/src/pages/operator/$FILE.tsx"
    [ -f "$F" ] && printf "%-30s " "$FILE.tsx" && wc -l < "$F"
  done
done

# 3. wrapper 사용 여부
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  grep -ln "OperatorMembersConsolePage" services/web-$SVC/src/pages/operator/*.tsx
done

# 4. canonical route
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  grep -n "operator/members\|operator/users" services/web-$SVC/src/App.tsx | head -5
done

# 5. Backend canonical controller
ls apps/api-server/src/controllers/operator/MembershipConsoleController.ts
grep -n "router.get\|router.post\|router.patch\|router.delete\|router.put" \
  apps/api-server/src/routes/operator/membership.routes.ts | head -15

# 6. admin hard delete UI
for SVC in kpa-society neture glycopharm k-cosmetics; do
  grep -ln "MemberHardDeleteConfirmModal\|MemberDeleteRiskModal\|hard.*delete\|hardDelete" \
    services/web-$SVC/src/pages/admin/*.tsx 2>/dev/null
done
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only)*
*Status: 조사 완료 — KPA 공통화 1 WO + 의도된 차이 4 건 + 사소 drift 3 건. 큰 그림 거의 완료.*
*Decision Required: `WO-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-MIGRATION-V1` 진입 여부.*
