# CHECK-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-COMPLETION-V1

**날짜**: 2026-06-01  
**목적**: `WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1` 완료 상태 확인 및 고정  
**결과**: **PASS** — 3개 서비스 thin wrapper 전환 완료

---

## 관련 커밋

| 커밋 | 내용 |
|------|------|
| `de364ef9f` | `IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1` — Option C 확정 |
| `a8becbadd` | **`WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1`** — Neture/GP/K-Cos 3 service thin wrapper |
| `3c8ab8f93` | `WO-O4O-MEMBER-MANAGEMENT-HARD-DELETE-FLOW-COMMONIZATION-V1` — admin 완전삭제 공통화 |
| `6f9471173` | `WO-O4O-OPERATOR-MEMBERS-DELETE-FLOW-COMMONIZATION-V1` — GP/K-Cos admin Delete Flow 공통화 |

---

## 1. OperatorMembersConsolePage 공통 패키지 상태

| 파일 | 라인수 |
|------|--------|
| `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` | 952줄 |
| `packages/operator-core-ui/src/modules/members/types.ts` | 265줄 |

`OperatorMembersConsolePage`는 DataTable, ActionBar, BaseDetailDrawer, BulkResultModal, useBatchAction 등 모든 공통 로직을 내장하고 있으며, 서비스별 차이는 아래 props/slots으로 주입됩니다:
- `serviceKey` — 서비스 식별자
- `client: MembersConsoleClient` — API adapter
- `roleTabs`, `statusTabs` — 탭 구성
- `renderEditModal`, `renderDeleteFlow` — 서비스별 UX slot
- `getPrimaryRole`, `roleDisplayMap`, `roleColumnHeader` — 역할 표시
- `extraColumns`, `extraRowActions`, `extraBulkActions` — 서비스별 확장

---

## 2. 서비스별 wrapper 완료 상태

### Neture — `UsersManagementPage.tsx` (346줄)

| 항목 | 상태 | 내용 |
|------|------|------|
| OperatorMembersConsolePage 사용 | ✅ | import 및 렌더 |
| 자체 DataTable/ActionBar 로직 | ❌ 없음 | wrapper에 위임 |
| serviceKey | ✅ `'neture'` | |
| client adapter | ✅ `netureMembersClient` | list/stats/updateStatus/batchUpdateStatus/updatePassword |
| roleTabs | ✅ 공급자/파트너/셀러 3종 | |
| statusTabs | ✅ 활성/정지/거절/탈퇴 4종 | |
| getPrimaryRole | ✅ Neture 참여 유형 도출 | |
| roleDisplayMap | ✅ `NETURE_ROLE_DISPLAY` | |
| extraColumns | ✅ 운영권한 + 대시보드접근 2컬럼 | |
| renderEditModal | ✅ `EditUserModal` | |
| renderDeleteFlow | ✅ `NetureDeleteFlow` (soft delete only) | hard delete는 admin 전용 |
| extraBulkActions | ✅ 정지/복원/탈퇴 3종 | |
| 원래 크기 → thin wrapper | 917줄 → 346줄 | **-63%** |

### GlycoPharm — `UsersPage.tsx` (367줄)

| 항목 | 상태 | 내용 |
|------|------|------|
| OperatorMembersConsolePage 사용 | ✅ | import 및 렌더 |
| 자체 DataTable/ActionBar 로직 | ❌ 없음 | wrapper에 위임 |
| serviceKey | ✅ `'glycopharm'` | |
| client adapter | ✅ `gpMembersClient` | list/stats/updateStatus/batchUpdateStatus/updatePassword |
| roleTabs | ✅ 약사/약국 경영자 2종 | |
| statusTabs | ✅ 승인/반려/정지/탈퇴 4종 | |
| getPrimaryRole | ✅ GP 참여 유형 도출 | |
| roleDisplayMap | ✅ `GP_ROLE_DISPLAY` (약사/약국 경영자/공급자 등) | |
| extraColumns | ✅ 운영권한 1컬럼 | |
| renderEditModal | ✅ `EditUserModal` | |
| renderDeleteFlow | ✅ `GpDeleteRiskFlow` (soft delete + 리스크 조회) | hard delete는 admin 전용 |
| extraRowActions | ✅ 정지/복원 단건 | |
| extraBulkActions | ✅ 정지/복원/탈퇴 3종 | |
| 원래 크기 → thin wrapper | 957줄 → 367줄 | **-62%** |

### K-Cosmetics — `UsersPage.tsx` (310줄)

| 항목 | 상태 | 내용 |
|------|------|------|
| OperatorMembersConsolePage 사용 | ✅ | import 및 렌더 |
| 자체 DataTable/ActionBar 로직 | ❌ 없음 | wrapper에 위임 |
| serviceKey | ✅ `'k-cosmetics'` | |
| client adapter | ✅ `kcosMembersClient` | list/stats/updateStatus/batchUpdateStatus/updatePassword |
| roleTabs | ✅ 판매자/소비자 2종 | |
| statusTabs | ✅ 가입신청/활성/거절/정지/탈퇴 5종 (pending 포함) | |
| getPrimaryRole | ✅ K-Cos 참여 유형 도출 | |
| roleDisplayMap | ✅ `KCOS_ROLE_DISPLAY` | |
| extraColumns | ✅ 운영권한 1컬럼 | |
| renderEditModal | ✅ `EditUserModal` | |
| renderDeleteFlow | ✅ `KcosDeleteFlow` (ConfirmActionDialog, soft delete) | |
| extraRowActions | ✅ 정지/복원 단건 | |
| extraBulkActions | ✅ 정지/복원/탈퇴 3종 | **bulk action parity 완전 복구** |
| 원래 크기 → thin wrapper | 768줄 → 310줄 | **-60%** |

---

## 3. KPA — 별도 유지 (Option C 정책)

IR Option C 결정에 따라 KPA는 이번 공통화 대상이 아님.

| 항목 | 상태 |
|------|------|
| 파일 | `MemberManagementPage.tsx` |
| OperatorMembersConsolePage 사용 | ✅ (별도로 KPA 전용 래핑) |
| 변경 여부 | 없음 (thin wrapper WO 범위 외) |

KPA는 KpaMember entity / activity_type / capabilities 등 본질적 차이가 크므로 adapter 강행보다 별도 유지가 원칙임.

---

## 4. 중복 로직 제거 결과

| 제거된 중복 로직 | 위치 |
|----------------|------|
| DataTable 정의 (컬럼/선택/정렬) | wrapper → OperatorMembersConsolePage 위임 |
| ActionBar (bulk 선택 UI) | wrapper → OperatorMembersConsolePage 위임 |
| useBatchAction / BulkResultModal | wrapper → OperatorMembersConsolePage 위임 |
| 페이지네이션 상태 관리 | wrapper → OperatorMembersConsolePage 위임 |
| 검색/필터 상태 관리 | wrapper → OperatorMembersConsolePage 위임 |
| BaseDetailDrawer (상세 보기) | wrapper → OperatorMembersConsolePage 위임 |

서비스별 custom 로직(역할 표시, 삭제 정책, API endpoint)만 wrapper에 남음.

---

## 5. EditUserModal / CommonUserDetailPage 유지 확인

| 항목 | 상태 |
|------|------|
| Neture `EditUserModal` | ✅ `renderEditModal` slot으로 주입 |
| GlycoPharm `EditUserModal` | ✅ `renderEditModal` slot으로 주입 |
| K-Cosmetics `EditUserModal` | ✅ `renderEditModal` slot으로 주입 |
| `CommonUserDetailPage` (Hybrid Canonical) | 영향 없음 — slot 구조 외부 |

---

## 최종 판정

**PASS** ✅

| 확인 항목 | 결과 |
|----------|------|
| 3개 서비스 OperatorMembersConsolePage 기반 thin wrapper | ✅ 완료 |
| 자체 DataTable/ActionBar/Drawer 로직 중복 없음 | ✅ 확인 |
| roleTabs / statusTabs / searchPlaceholder 정상 주입 | ✅ 확인 |
| API client adapter 서비스별 분리 | ✅ 확인 |
| EditModal / DeleteFlow slot 정상 연결 | ✅ 확인 |
| KPA 미변경 (Option C 정책 준수) | ✅ 확인 |
| 구현 커밋 (`a8becbadd`) git log 확인 | ✅ 확인 |

---

## 후속 후보

| 항목 | 유형 | 우선순위 |
|------|------|---------|
| EditUserModal 통합 여부 조사 | IR | 낮음 (3서비스 EditModal 구조 유사, 공통화 검토 가능) |
| API client 통일 여부 조사 | IR | 낮음 (각 서비스 `MembersConsoleClient` impl, 패턴은 동일) |
| Operator Members smoke check | CHECK | 낮음 (계정 있을 때 live 검증) |
| GlycoPharm `searchPlaceholder` 커스텀 적용 | WO 후보 | 낮음 (prop 이미 노출됨) |
