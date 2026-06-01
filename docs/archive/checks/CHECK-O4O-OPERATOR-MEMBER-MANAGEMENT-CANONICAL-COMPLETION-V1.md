# CHECK-O4O-OPERATOR-MEMBER-MANAGEMENT-CANONICAL-COMPLETION-V1

**Status**: Verified (static — browser smoke 보류)
**Date**: 2026-05-30
**Subject**: Operator 회원 관리 공통화 (KPA 포함 4 서비스) Canonical 정렬 완료 확인
**Closes**: WO-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-MIGRATION-V1
**References**:
- [IR-O4O-OPERATOR-MEMBER-MANAGEMENT-CANONICAL-AUDIT-V1.md](IR-O4O-OPERATOR-MEMBER-MANAGEMENT-CANONICAL-AUDIT-V1.md) — 최초 audit (KPA 단일 drift 식별)
- Commit `7ada5bc4d` — KPA wrapper migration
- [packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx) — 공통 wrapper
- [packages/operator-core-ui/src/modules/members/types.ts](../../packages/operator-core-ui/src/modules/members/types.ts) — wrapper props 타입

---

## 1. 배경

IR-AUDIT-V1 시점에 회원 관리 공통화의 마지막 drift 는 **KPA-Society 가 1427줄 자체 구현 화면을 유지**한다는 점이었다. 본 CHECK 는 WO-WRAPPER-MIGRATION 적용 이후의 정렬 상태를 정적 코드 기준으로 검증한다.

## 2. 결과 요약

| 서비스 | OperatorMembersConsolePage | 비고 |
|---|---|---|
| GlycoPharm | ✅ thin wrapper | [services/web-glycopharm/src/pages/operator/UsersPage.tsx](../../services/web-glycopharm/src/pages/operator/UsersPage.tsx) |
| K-Cosmetics | ✅ thin wrapper | [services/web-k-cosmetics/src/pages/operator/UsersPage.tsx](../../services/web-k-cosmetics/src/pages/operator/UsersPage.tsx) |
| Neture | ✅ thin wrapper | wrapper 사용 — 이전 WO 들에서 정렬 완료 |
| KPA-Society | ✅ thin wrapper (Hybrid) | [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) — 회원 관리 영역 wrapper + ApplicationsTab 외부 렌더 |
| Backend / Route / Menu / Delete Policy | ✅ 이미 공통 정렬 | |

**결론**: Operator 회원 관리 공통화는 4 서비스 모두 Canonical 상태에 도달했다. KPA-Society 의 핵심 drift (자체 구현 1427줄) 가 해소되었고, wrapper / types.ts 는 본 작업에서 수정되지 않았다.

---

## 3. 13개 항목 정적 검증

### 3.1 KPA `/operator/members` 렌더링

✅ [services/web-kpa-society/src/routes/OperatorRoutes.tsx:137](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx#L137) — `<Route path="members" element={<MemberManagementPage />} />`
- `/operator/users`, `/operator/operators` 는 `/operator/members` 로 redirect (line 166, 198)

### 3.2 회원 리스트 / 검색 / 페이지네이션

✅ wrapper 가 처리.
- list fetch: [OperatorMembersConsolePage.tsx:264-287](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L264-L287) — `client.list({ page, limit, status, search })`
- KPA client adapter: [MemberManagementPage.tsx:213-235](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L213-L235) — `GET /kpa/members` 호출 + `{users, pagination}` shape 어댑터
- pagination JSX: [OperatorMembersConsolePage.tsx:750-772](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L750-L772)

### 3.3 roleTabs / statusTabs / ApplicationsTab 외부 렌더링

✅
- **roleTabs**: [MemberManagementPage.tsx:331-334](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L331-L334) — 약사 / 약대생 (membership_type 기준)
- **statusTabs**: [MemberManagementPage.tsx:335-340](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L335-L340) — 승인완료 / 반려 / 정지 / 탈퇴 (status-pending 은 wrapper auto 'pending' 으로 흡수)
- **ApplicationsTab 외부**: [MemberManagementPage.tsx:317-322](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L317-L322) — outer toggle `outerView === 'applications'` 시 wrapper 미렌더, ApplicationsTab 직접 렌더
- `?tab=applications` deeplink 호환: [MemberManagementPage.tsx:198](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L198)

### 3.4 회원 row 클릭 → Drawer

✅ wrapper 가 처리. [OperatorMembersConsolePage.tsx:742](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L742) — `onRowClick={(user) => setSelectedUser(user)}` → BaseDetailDrawer open.

### 3.5 KPA 약국/근무처/면허번호/권한 정보 표시

✅ `drawerExtraSections` slot 로 KPA-specific Drawer body 주입.
- KpaDrawerSections 정의: [MemberManagementPage.tsx:530-654](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L530-L654)
- 표시 필드: 유형, 면허번호, 직역(개설약사 badge 포함), 매장 권한(store_owner chip), 약국명, 약국 전화번호, 개설자 연락처, 대표자명, 담당자명, 사업자등록번호, 세금계산서 이메일, 우편번호, 기본주소, 상세주소, 가입일, 추가 권한 capability chips, super_admin 안내

### 3.6 수정 modal

✅ `renderEditModal` slot → `KpaEditUserModal` (super_admin / withdrawn 가드 적용).
- slot 정의: [MemberManagementPage.tsx:368-370](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L368-L370)
- guard: [MemberManagementPage.tsx:481-525](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L481-L525) — super_admin 회원 / withdrawn 회원은 onClose() 후 null 반환

### 3.7 비밀번호 변경

✅ `client.updatePassword` 구현 — wrapper 의 password row action 이 trigger.
- [MemberManagementPage.tsx:282-288](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L282-L288)
- `member.id → user_id` ref 맵 조회 후 `PUT /operator/members/:userId` (`/operator/members` 라우트는 `kpa-society:operator` 역할 허용 — [apps/api-server/src/routes/operator/membership.routes.ts:26](../../apps/api-server/src/routes/operator/membership.routes.ts#L26))

### 3.8 승인 / 반려

✅ wrapper 내장 + adapter 의 status 매핑.
- Drawer footer 의 '승인' / '반려' 버튼: [OperatorMembersConsolePage.tsx:614-631](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L614-L631)
- ActionBar 의 일괄 '승인 (n)' / '거부 (n)' : [OperatorMembersConsolePage.tsx:458-488](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L458-L488)
- KPA adapter 의 status 매핑: [MemberManagementPage.tsx:265-273](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L265-L273) — wrapper 의 'approved' → KPA canonical 'active', 'rejected' / 'suspended' / 'withdrawn' 은 동일

### 3.9 정지 / 복원

✅ `extraRowActions` + `extraBulkActions`.
- row 정지/복원: [MemberManagementPage.tsx:399-432](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L399-L432) — `has_kpa_member` 가드 적용
- bulk 정지/복원: [MemberManagementPage.tsx:435-477](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L435-L477)

### 3.10 탈퇴 처리

✅ `extraBulkActions` 의 `kpa-bulk-withdraw` — soft delete (status='withdrawn').
- [MemberManagementPage.tsx:478-496](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L478-L496) — `has_kpa_member` 가드 + 'withdrawn 이 아닌 회원' 필터 + 확인 다이얼로그

### 3.11 Bulk actions

✅ wrapper 의 built-in 승인/반려 + KPA `extraBulkActions` (정지/복원/탈퇴).
- wrapper bulk: [OperatorMembersConsolePage.tsx:458-488](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L458-L488)
- KPA extras: [MemberManagementPage.tsx:435-496](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L435-L496)
- BulkResultModal 표시: wrapper 내부 [OperatorMembersConsolePage.tsx:722-733](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L722-L733)

### 3.12 Operator hard delete 미노출

✅ KPA 의 wrapper 호출에 `renderDeleteFlow` prop 미전달.
- wrapper 의 row delete 조건: [OperatorMembersConsolePage.tsx:546](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx#L546) — `buildUserActionPolicy({ serviceKey, hasDelete: !!renderDeleteFlow })`. `renderDeleteFlow` 가 undefined 이면 `hasDelete=false` → row 메뉴에서 '삭제' 항목 부재
- KPA prop 전달 위치: [MemberManagementPage.tsx:325-505](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L325-L505) — `renderDeleteFlow` 키 부재 확인
- Hard delete 진입점은 `/admin/members` (admin 전용) — KPA 기존 정책 유지

### 3.13 GP / K-Cos / Neture 회귀 없음

✅ 본 WO 는 KPA 페이지 단일 파일만 수정.
- 변경 파일: `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx` (commit `7ada5bc4d`, 1 file changed)
- 미수정 확정: `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx`, `packages/operator-core-ui/src/modules/members/types.ts`, GP/K-Cos/Neture 의 wrapper 호출 사이트
- 회귀 가능성 0 (props 인터페이스 / wrapper 내부 미변경)

---

## 4. 정적 검증 외 영역 (browser smoke 보류)

본 CHECK 는 코드 정적 분석 기준 정렬을 확인했다. 실제 브라우저 동작 검증은 별도 smoke test 로 분리 — 본 CHECK 의 13개 항목에 대한 UI 레벨 확인은 다음 후속 작업에서 수행:

```
CHECK-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-BROWSER-SMOKE-V1
- KPA operator (sohae2100@gmail.com) 로 /operator/members 진입
- outer 'applications' 토글 → ApplicationsTab 렌더 확인
- 회원 row 클릭 → Drawer 약국 정보 표시
- 정지/복원/탈퇴 bulk action 동작 확인
- 비밀번호 변경 modal 동작 확인 (member.id → user_id ref 조회 정상 동작 확인)
```

---

## 5. 후속 권장 작업

| 순위 | 작업 | 비고 |
|---|---|---|
| 1 | CHECK-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-BROWSER-SMOKE-V1 | 13개 항목 UI 검증 |
| 2 | WO-O4O-OPERATOR-MEMBERS-SEARCH-PLACEHOLDER-PROP-V1 (선택) | wrapper props 에 `searchPlaceholder` 추가 — KPA 의 '이름 / 이메일 / 닉네임 / 약국명 / 사업자번호 / 면허번호' 문구 노출 목적. 본 WO 에서 의도적으로 보류한 영역 |
| 3 | (장기) WO-O4O-OPERATOR-MEMBERS-EXTRA-TABS-SLOT-V1 | wrapper props 에 `extraTabs` 또는 `tabsBefore/After` slot 추가 시 KPA 의 outer toggle 도 wrapper 내부 통합 가능 — Hybrid 가 완전 thin wrapper 로 진화 |

---

## 6. 변경 이력

| 일자 | 변경 |
|---|---|
| 2026-05-30 | 초안 작성. WO-WRAPPER-MIGRATION-V1 (commit `7ada5bc4d`) 적용 후 13개 항목 정적 검증 완료 |
