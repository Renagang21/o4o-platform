---
id: IR-O4O-NETURE-KPA-UX-CANONICAL-ALIGNMENT-AUDIT-V1
title: Neture 운영자/회원관리/프로필/MyPage UI 를 KPA-Society 기준으로 정렬하기 위한 GAP 조사
status: completed
date: 2026-05-27
domain: neture / kpa-society / operator-ux / canonical-alignment
related:
  - WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1
  - WO-O4O-NETURE-ADMIN-DASHBOARD-ACTUAL-STRUCTURE-FIX-V1
  - WO-O4O-NETURE-REGISTRATION-ROLE-SMOKING-GUN-FIX-V1
  - WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
  - WO-O4O-ROLE-BASED-PROFILE-MENU-CANONICALIZATION-V1
  - KPA-UX-BASELINE-V1
constitution:
  - CLAUDE.md §0 (read-only / DB 직접 수정 금지)
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §11 (Admin / Operator 역할 구분 + Dashboard 표준)
  - CLAUDE.md §14 F2 (KPA UX Baseline)
  - CLAUDE.md §14 F11 (User/Operator Freeze)
baseline_service: KPA-Society
target_service: Neture (services/web-neture)
---

# IR-O4O-NETURE-KPA-UX-CANONICAL-ALIGNMENT-AUDIT-V1

> Neture 운영자/회원관리/프로필/MyPage UX 를 KPA-Society 기준으로 정렬하기 위한 read-only GAP 조사. 코드/DB 수정 없음. Renagang21 데이터 보정 없음. admin/operator role 정책 변경 없음.
>
> 6 영역 병렬 Explore 조사 + 종합.

---

## 0. 조사 원칙 및 범위

```
코드 수정 금지
DB 수정 금지
Renagang21 데이터 삭제/보정 금지
admin/operator role 정책 변경 금지
HIGH 버그도 본 IR 에서는 수정 안 함 (보고만)
```

대상 서비스: Neture (`services/web-neture`)
기준 서비스: KPA-Society (`services/web-kpa-society`)
유지 원칙: Neture 도메인 특성 (공급자/파트너/B2B 흐름) 은 보존, **운영자 UX·회원관리·표준 테이블·프로필 메뉴·대시보드 진입·MyPage 구조**만 KPA 기준 정렬.

---

## 1. KPA-Society 운영자 UX 기준 요약

| 항목 | KPA 표준 | 핵심 파일 |
|------|---------|----------|
| **운영자 대시보드** | 5-Block (KPI / AI Summary / Action Queue / Activity Log / Quick Actions) + 2축 운영 네비게이션 + 운영 철학 카드 | [pages/operator/KpaOperatorDashboard.tsx:1-269](../../services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx) |
| **관리자 대시보드** | 화면 제목 "관리자 대시보드" + 3영역 간결 구조 (KPI 3개 / 최근 가입 신청 / 빠른 이동) + ShieldCheck 헤더 | [pages/admin/KpaAdminDashboardPage.tsx:51-189](../../services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx) |
| **Sidebar Shell** | `KpaOperatorSidebar` (OperatorShell 우회 — KPA 전용) | `services/web-kpa-society/src/components/layouts/` |
| **Sidebar 메뉴** | UNIFIED_MENU + adminOnly 플래그 + **Domain IA 헤딩** (커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) | [config/operatorMenuGroups.ts:29-167](../../services/web-kpa-society/src/config/operatorMenuGroups.ts) |
| **회원 관리** | 독립 1421줄 `MemberManagementPage` — status 탭 5개 + role 탭 2개 + 가입 신청 탭 + `KpaEditUserModal` + `BaseDetailDrawer` | [pages/operator/MemberManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) |
| **표준 테이블** | `@o4o/operator-ux-core` DataTable + ListColumnDef + ActionBar + RowActionMenu + useBatchAction + defineActionPolicy 풀스택 | KPA MemberManagementPage / PharmacyBlogPage / StorePopPage / StoreQRPage / StoreLibraryResources / TabletRequestsPage |
| **프로필 메뉴 (KpaGlobalHeader)** | 6항목: 강의 / 관리자 / 운영 / 내 매장 / 마이페이지 / 설정. admin+operator 겸임 시 **둘 다 표시** | [components/KpaGlobalHeader.tsx:171-205](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx) |
| **로그인 후 redirect** | `KPA_ROLE_PRIORITY = [platform:super_admin, kpa:admin, kpa:operator]` 만 자동 redirect. 강사/약국 경영자는 NULL → 메인/커뮤니티 유지 | [config/dashboard.ts:35-51](../../services/web-kpa-society/src/config/dashboard.ts) |
| **MyPageLayout** | 서비스 로컬 [layouts/MyPageLayout.tsx](../../services/web-kpa-society/src/layouts/MyPageLayout.tsx) — `title`, `description`, `breadcrumb?`, `width?` 지원 + 고정 KPA_MYPAGE_NAV_ITEMS (10+ tabs) |

---

## 2. Neture 현재 운영자 UX 구조

| 항목 | Neture 현재 | 핵심 파일 |
|------|------------|----------|
| **운영자 대시보드** | 5-Block (표준) — buildNetureOperatorConfig() pass-through (백엔드에서 직접 5-block 반환) | [pages/operator/NetureOperatorDashboard.tsx:1-71](../../services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx) |
| **관리자 대시보드** | 4-Block (Structure Snapshot / Policy Overview / Governance Alerts / Structure Actions) — `@o4o/admin-ux-core` AdminDashboardLayout | [pages/admin/AdminDashboardPage.tsx:1-69](../../services/web-neture/src/pages/admin/AdminDashboardPage.tsx) |
| **Sidebar Shell** | 공용 `OperatorShell` (`@o4o/ui`) — admin/operator wrapper 모두 동일 사용 | AdminLayoutWrapper / OperatorLayoutWrapper |
| **Sidebar 메뉴** | `getAdminMenu()` (admin 전용 항목만, 직전 `f8be8cd82` 재설계) + `filterMenuByRole(UNIFIED_MENU, false)` (operator) — Domain IA 헤딩 없음 | [config/operatorMenuGroups.ts:131-165](../../services/web-neture/src/config/operatorMenuGroups.ts) |
| **회원 관리** | 237줄 thin wrapper — `OperatorMembersConsolePage` 공통 모듈 + Neture client adapter + `EditUserModal` (CommonEditUserModal thin wrapper) | [pages/operator/UsersManagementPage.tsx](../../services/web-neture/src/pages/operator/UsersManagementPage.tsx) |
| **표준 테이블** | 화면별 편차 큼 — FULL canonical 4, PARTIAL 4, NON-CANONICAL 7+ (자세히는 §5) | - |
| **프로필 메뉴 (NetureGlobalHeader)** | 6항목: 관리자 / 운영자 / 공급자 / 파트너 / 마이페이지 / 설정. admin+operator 겸임 시 **isOperator && !isAdmin** 조건부 (직전 `8ee4c0f97`) | [components/NetureGlobalHeader.tsx:108-145](../../services/web-neture/src/components/NetureGlobalHeader.tsx) |
| **로그인 후 redirect** | `NETURE_ROLE_PRIORITY` 9개 모두 매핑 — supplier/partner/store_owner 까지 자동 redirect | [config/dashboard.ts:28-52](../../services/web-neture/src/config/dashboard.ts) |
| **MyPageLayout** | 공통 패키지 [packages/account-ui/src/components/MyPageLayout.tsx](../../packages/account-ui/src/components/MyPageLayout.tsx) — title/subtitle/breadcrumb/width/navItems/basePath/showNav 지원 | - |

---

## 3. admin / operator 경계 GAP

| 항목 | KPA | Neture | GAP | 심각도 |
|------|-----|--------|-----|:------:|
| Admin/Operator wrapper 동일 shell? | KpaOperatorSidebar (admin/operator 동일 wrapper 재사용, isAdmin 플래그) | OperatorShell (둘 다 사용, serviceName 만 다름) | 구조적으로 유사 — Neture 가 직전 작업으로 admin-only 메뉴 분리 완료 ✅ | Info |
| Admin Menu 분리 패턴 | `filterMenuByRole(UNIFIED_MENU, isAdmin)` (동일 메뉴, 필터링만) | `getAdminMenu()` 별도 함수 (구조 완전 분리) | Neture 가 더 엄격 — KPA 정합 위해 동일 함수 통합 가능하나 현재 Neture 패턴이 사용자 체감 더 명확 | Low |
| Admin 화면 제목 | "관리자 대시보드" 명시 | 없음 (Layout 컴포넌트가 직접 렌더) | Neture 화면 제목 누락 | **MED** |
| Operator 화면 제목 | 없음 (Dashboard 만) | 없음 | 동일 | Info |
| Admin 대시보드 블록 | 3영역 간결 (KPI 3 + 최근 가입 + 빠른 이동) | 4-Block 구조 중심 | 양식 차이 — Neture B2B 도메인 적합 | Low |
| Domain IA 헤딩 (커뮤니티/매장 등) | ✅ KPA 적용 | ❌ Neture 미적용 (11-그룹 평탄) | 적용 가능하나 Neture 도메인 차이 (커뮤니티 운영 ≠ 공급자/파트너) | Low |

---

## 4. 회원관리 UX GAP

| 항목 | KPA | Neture | GAP | 심각도 |
|------|-----|--------|-----|:------:|
| 구현 방식 | 독립 1421줄 MemberManagementPage | OperatorMembersConsolePage 공통 wrapper (237줄) | Neture 가 공통화 우선, KPA 가 도메인 분리 우선 — 양립 가능 | Info |
| status 탭 5개 (pending/active/suspended/rejected/withdrawn) | ✅ | ❌ **부재** (pending 탭만) | 운영자가 active/suspended/rejected/withdrawn 회원을 찾기 어려움 | **HIGH** |
| role 탭 | 약사/약대생 2개 | 공급자/파트너/셀러 3개 | 도메인 차이 — OK | Info |
| 컬럼 명칭 | "유형" (membership_type) | "역할" (membership role) | 용어 일관성 — 직전 정렬 작업으로 Neture 회원 "유형" 으로 통일 필요 | MED |
| capability chips 표시 | ✅ RBAC SSOT 강조 | ❌ 대시보드 접근 라벨만 | 권한 시각화 부족 | MED |
| 편집 모달 | KpaEditUserModal (독립) | CommonEditUserModal (공통) | OK | Info |
| soft delete | 탈퇴 처리 (bulk) | 비활성화 (Drawer) | 표현 차이 — "탈퇴" vs "비활성화" 의미 정합 검토 필요 | Low |
| hard delete | admin 전용 페이지 분리 (`AdminMemberManagementPage`) | admin 전용 페이지 분리 (`AdminMemberManagementPage`) | 동일 ✅ | Info |
| hard delete 권한 | `kpa:admin` | `neture:admin` + `platform:super_admin` | 동일 패턴 | Info |
| Drawer 용도 | 상세보기 전용 | 상세보기 + 상태변경 Footer | Neture 가 한 곳에서 상태변경 가능 — UX 우월하나 KPA 와 다름 | Low |

---

## 5. 표준 테이블 리스트 적용 GAP

### 5-A. 적용 현황 (Neture pages 인벤토리)

| 구분 | 화면 | 파일 | 패턴 | 비고 |
|:----:|------|------|------|------|
| ✅ FULL | OperatorProductApprovalPage | `pages/operator/` | DataTable + ActionBar + useBatchAction | OK |
| ✅ FULL | ForumDeleteRequestsPage | `pages/operator/` | DataTable + ActionBar + useBatchAction | OK |
| ✅ FULL | ForumManagementPage | `pages/operator/` | DataTable + ActionBar + useBatchAction | OK |
| ✅ FULL | AdminMemberManagementPage | `pages/admin/` | DataTable + ActionBar + delete flow | OK |
| ⚠ PARTIAL | UsersManagementPage | `pages/operator/UsersManagementPage.tsx` | OperatorMembersConsolePage 공통 wrapper | status 탭 부재 |
| ⚠ PARTIAL | RegistrationRequestsPage | `pages/operator/registrations/RegistrationRequestsPage.tsx:103` | DataTable + Drawer / **ActionBar/Batch 부재** | **HIGH — 가입 승인 daily workflow** |
| ⚠ PARTIAL | AllRegisteredProductsPage | `pages/operator/` | DataTable + RowActionMenu, no ActionBar | LOW |
| ⚠ PARTIAL | BrandManagementPage | `pages/operator/` | DataTable + RowActionMenu, no ActionBar | LOW |
| ⚠ PARTIAL | OperatorsPage | `pages/admin/` | DataTable only | LOW |
| ⚠ PARTIAL | AdminPartnerMonitoringPage | `pages/admin/` | DataTable only | LOW |
| ❌ NON | AdminProductApprovalPage | `pages/admin/AdminProductApprovalPage.tsx:30` | raw HTML + `confirm()` dialog | **MED** |
| ❌ NON | AdminSupplierApprovalPage | `pages/admin/AdminSupplierApprovalPage.tsx:25` | raw HTML + `confirm()` dialog | **MED** |
| ❌ NON | AdminServiceApprovalPage | `pages/admin/` | (동일 패턴 추정) | MED |
| ❌ NON | MarketTrialApprovalsPage | `pages/operator/MarketTrialApprovalsPage.tsx:46` | 커스텀 탭 + JS 필터 | LOW |
| ❌ NON | SupplierProductsPage | `pages/supplier/SupplierProductsPage.tsx` | EditableDataTable (인라인 편집 — 다른 컴포넌트) | LOW (변형) |
| ❌ NON | SupplierTrialListPage | `pages/supplier/SupplierTrialListPage.tsx:35` | 카드형 (div 스타일) | LOW |

### 5-B. 핵심 GAP

| GAP | 심각도 |
|-----|:------:|
| RegistrationRequestsPage 의 bulk action 부재 — 운영자가 가입 신청을 한 건씩만 처리 | **HIGH** |
| UsersManagementPage 의 status 탭 부재 (pending 만) — active/suspended/rejected/withdrawn 회원 검색 불가 | **HIGH** |
| AdminProductApprovalPage / AdminSupplierApprovalPage 의 `confirm()` dialog (브라우저 native) — UX 일관성 깨짐 | **MED** |
| Partial PARTIAL/NON 합계 11+ 화면 — 점진 정렬 가능 (즉시 모두 정렬 부담) | MED |

---

## 6. 사용자 프로필 메뉴 GAP

| 항목 | KPA (KpaGlobalHeader) | Neture (NetureGlobalHeader) | GAP | 심각도 |
|------|----------------------|----------------------------|-----|:------:|
| 항목 수 | 6 | 6 | OK | Info |
| Admin+Operator 겸임 표시 | **둘 다 표시** (`WO-O4O-ROLE-BASED-PROFILE-MENU-CANONICALIZATION-V1`) | `isOperator && !isAdmin` (operator-only 사용자만 operator 링크 표시) | **차이** — KPA canonical 은 둘 다 표시. Neture 는 admin 이면 operator 링크 숨김 | **MED** |
| 매장 경영자 진입 | "내 매장" (`/store`) 메뉴 표시 | 메뉴 미표시 (직접: `/seller/overview` 자동 redirect 만) | Neture 는 메뉴 진입 누락 — 매장 경영자가 다른 화면에서 자기 영역 진입 어려움 | **MED** |
| 강사 (lms:instructor) 진입 | "강의 대시보드" 메뉴 | (Neture 강사 없음) | Info | Info |
| 공급자/파트너 진입 | (KPA 공급자/파트너 없음) | 메뉴 표시 (조건부) | Info | Info |
| 라벨 일관성 | "관리자 대시보드" / "운영 대시보드" | "관리자 대시보드" / "운영자 대시보드" | "운영" vs "운영자" — 직전 작업으로 Neture 가 "운영자" 통일 | Low |
| 마이페이지/설정 위치 | 메뉴 하단 | 메뉴 하단 | OK | Info |

---

## 7. 대시보드 진입 UX GAP

| 항목 | KPA | Neture | GAP | 심각도 |
|------|-----|--------|-----|:------:|
| 로그인 후 redirect 우선순위 | `KPA_ROLE_PRIORITY = [platform:super_admin, kpa:admin, kpa:operator]` 만 자동 redirect (3개) | `NETURE_ROLE_PRIORITY` 9개 모두 매핑 (admin/operator/supplier/partner/store_owner) | KPA 는 admin/operator 만, Neture 는 모든 role 자동 redirect | Low (정책 차이) |
| 기본 경로 (역할 없음 / 일반) | NULL → 메인/커뮤니티 유지 | NULL → 메인 | 동일 | Info |
| supplier/partner 자동 redirect | (KPA 없음) | `/supplier/dashboard` / `/partner/dashboard` 자동 진입 | Neture 도메인 특성 | Info |
| 다중 권한 사용자 우선순위 | super_admin > admin > operator (그 외 NULL) | super_admin > admin > operator > supplier > partner > store_owner | OK | Info |
| 공급자 승인 후 대시보드 접근 가능성 | N/A | role_assignments (`supplier`) + service_memberships.status='active' + neture_suppliers.status='ACTIVE' 모두 필요 | 2-step activation 정책상 가입 승인만으로는 supplier 기능 일부 제한 — IR-O4O-NETURE-REGISTRATION-ROLE-CONFIRMATION-FLOW-AUDIT-V1 §7-A 참조 | Info |
| MembershipGate 작동 | service_memberships.status='active' 기준 | 동일 | OK | Info |

---

## 8. MyPage 구조 GAP

| 항목 | KPA | Neture | GAP | 심각도 |
|------|-----|--------|-----|:------:|
| MyPageLayout 위치 | 서비스 로컬 `services/web-kpa-society/src/layouts/MyPageLayout.tsx` | 공통 패키지 `packages/account-ui/src/components/MyPageLayout.tsx` | KPA 는 도메인 분리, Neture 는 공통화 | Info |
| Props 시그니처 | title, description, breadcrumb?, width?, children | title?, subtitle?, breadcrumb?, width?, basePath?, navItems?, showNav?, children | Neture 가 더 유연 (basePath/navItems/showNav 추가) | Info |
| 페이지 수 | 10+ (MyDashboard / MyProfile / MySettings / Certificates / Credits 등) | 4 (MyPageHub / MyProfile / MySettings / MyBusinessProfile) | Neture 가 단순 — 도메인 차이 | Info |
| Navigation 항목 | 고정 `KPA_MYPAGE_NAV_ITEMS` (10+ tabs) | configurable navItems (3 default) | Neture 가 유연 | Info |
| PageHeader 구조 | 별도 `PageHeader` 컴포넌트 (title/description/breadcrumb) | MyPageLayout 자체에 인라인 | KPA 가 더 모듈화 | Low |
| Width 변형 | 'form'/'list'/'wide' | 'form'/'list'/'wide' | OK | Info |

---

## 9. Pre-existing TypeScript breadcrumb 오류 원인 ✅ 확정

```
src/pages/mypage/MyPageHub.tsx(62,7): error TS2322
src/pages/mypage/MyProfilePage.tsx(76,7): error TS2322
src/pages/mypage/MySettingsPage.tsx(78,7): error TS2322
Property 'breadcrumb' does not exist on type 'IntrinsicAttributes & MyPageLayoutProps'.
```

### 9-A. 원인 — **dist stale**

`packages/account-ui/src/components/MyPageLayout.tsx` 는 이미 `breadcrumb?: MyPageBreadcrumbItem[]` prop 을 지원하도록 enhancement 적용됨 (src 에 `breadcrumb` 7회 등장).

그러나 `packages/account-ui/dist/components/MyPageLayout.d.ts` 의 type 정의에는 `breadcrumb` **0회** — dist 가 src enhancement 시점 이후 rebuild 안 됨.

### 9-B. 해소 방법

**최소 변경 1줄 명령**:
```bash
cd packages/account-ui && npm run build
```

이후 `npx tsc --noEmit -p tsconfig.json` (services/web-neture) 재실행 시 mypage 3 에러 사라짐.

→ Neture 페이지 코드 수정 / MyPageLayout Props 추가 모두 **불필요**. 단순히 패키지 dist 갱신만 필요.

### 9-C. 본 IR 에서 즉시 수정 안 함 이유

조사 원칙 ("코드 수정 금지") 준수 + 후속 WO (W1 또는 W3) 시작 시 첫 단계로 처리 권장.

---

## 10. 발견된 자잘한 버그 목록

§6 자잘한 버그 인벤토리 + 본 종합 검증 후 28 항목 → 핵심 16 항목 압축:

| # | 파일:라인 | 문제 | 우선순위 |
|:-:|----------|------|:--------:|
| B1 | [components/Footer.tsx:11](../../services/web-neture/src/components/Footer.tsx#L11) | footer 연락처 개인 이메일 `sohae2100@gmail.com` 운영 노출 | **HIGH** |
| B2 | [pages/mypage/MyPageHub.tsx:56](../../services/web-neture/src/pages/mypage/MyPageHub.tsx#L56) | 로그아웃 후 redirect `/workspace` — 라우트 미정의 | **HIGH** |
| B3 | [components/home/HeroSlider.tsx:114](../../services/web-neture/src/components/home/HeroSlider.tsx#L114) | 버튼 `to="/workspace/suppliers"` 라우트 미정의 | **HIGH** |
| B4 | [pages/hub/HubPage.tsx:569](../../services/web-neture/src/pages/hub/HubPage.tsx#L569) | 버튼 `to="/workspace"` 라우트 미정의 | **HIGH** |
| B5 | [pages/partner/PartnerOverviewPage.tsx:425](../../services/web-neture/src/pages/partner/PartnerOverviewPage.tsx#L425) | 버튼 `to="/workspace/partner/recruiting-products"` 라우트 미정의 | HIGH |
| B6 | [pages/PartnerInfoPage.tsx:112](../../services/web-neture/src/pages/PartnerInfoPage.tsx#L112) | 동일 (B5) | HIGH |
| B7 | [pages/PlatformPrinciplesPage.tsx:209](../../services/web-neture/src/pages/PlatformPrinciplesPage.tsx#L209) | 버튼 `to="/workspace/partners/info"` 라우트 미정의 | HIGH |
| B8 | mypage breadcrumb 3 에러 (§9) | dist stale — `packages/account-ui` rebuild 만 필요 | **HIGH (해결 비용 낮음)** |
| B9 | `pages/operator/registrations/RegistrationRequestsPage.tsx:103` | bulk approve/reject 부재 — 운영자가 daily 가입 신청을 한 건씩 처리 | **HIGH** |
| B10 | `pages/operator/UsersManagementPage.tsx` (OperatorMembersConsolePage:392-400) | status 탭 부재 (pending 만) — active/suspended/rejected/withdrawn 회원 검색 불가 | **HIGH** |
| B11 | [config/operatorMenuGroups.ts:42, 144](../../services/web-neture/src/config/operatorMenuGroups.ts#L42) | "공급사 승인" vs 사용자 메뉴 "공급자 대시보드" — 용어 혼용 | MED |
| B12 | NetureGlobalHeader admin+operator 겸임 처리 (§6) | `isOperator && !isAdmin` 조건 — KPA canonical 은 둘 다 표시. admin 사용자가 operator 영역 진입 시 메뉴 안 보임 (sidebar "운영자 업무 →" 로만 진입) | MED |
| B13 | 매장 경영자 (store_owner) 프로필 메뉴 진입 누락 | 자동 redirect 만 있고 사용자 메뉴 항목 없음 — KPA 의 "내 매장" 패턴 미적용 | MED |
| B14 | `pages/admin/AdminProductApprovalPage.tsx:30`, `AdminSupplierApprovalPage.tsx:25` | 브라우저 `confirm()` dialog 사용 — UX 일관성 깨짐 | MED |
| B15 | AdminLayoutWrapper serviceName "Neture 관리자" vs OperatorLayoutWrapper "Neture" | 비대칭 — Neture/Neture 관리자 표기 통일 검토 | Low |
| B16 | `pages/operator/registrations/RegistrationRequestsPage.tsx:74-84` | seller/pharmacist legacy 라벨 잔존 — 신규 가입에는 발생 안 함 (직전 작업으로 차단), legacy data 표시 호환 | Low (의도적 유지) |

---

## 11. HIGH / MED / LOW 우선순위 종합

### HIGH (운영 흐름 막힘 / 신뢰성 영향) — 10 건

| # | 영역 | 항목 |
|:-:|------|------|
| H1 | Footer | 개인 이메일 운영 노출 (B1) |
| H2 | Dead link | `/workspace/*` 계열 라우트 미정의 5건 (B2/B3/B4/B5/B6/B7) |
| H3 | TypeScript | mypage breadcrumb 3 에러 — `packages/account-ui` rebuild 만 필요 (B8) |
| H4 | 회원관리 | RegistrationRequestsPage bulk action 부재 (B9) |
| H5 | 회원관리 | UsersManagementPage status 탭 부재 (B10) |

### MED (UX 혼란 / 일관성) — 5 건

| # | 영역 | 항목 |
|:-:|------|------|
| M1 | 회원관리 | 컬럼 "역할" → "유형" 통일 (KPA 정합) |
| M2 | 회원관리 | capability chips 표시 추가 |
| M3 | 프로필 메뉴 | admin+operator 겸임 둘 다 표시 (KPA 정합) — B12 |
| M4 | 프로필 메뉴 | 매장 경영자 메뉴 진입 추가 (B13) |
| M5 | Admin 화면 | `confirm()` dialog → 표준 모달 정렬 (B14) |
| M6 | 용어 | "공급사"/"공급자" 혼용 (B11) |
| M7 | Admin 화면 제목 | "관리자 대시보드" 명시 누락 |

### LOW (표현 / 후순위) — 5 건

| # | 영역 | 항목 |
|:-:|------|------|
| L1 | Layout serviceName | "Neture" vs "Neture 관리자" 비대칭 (B15) |
| L2 | Sidebar | Domain IA 헤딩 적용 (KPA 패턴 차용) |
| L3 | Table | PARTIAL/NON 화면 점진 정렬 (10+ 화면) |
| L4 | MyPage | PageHeader 모듈 분리 (KPA 패턴 차용) |
| L5 | Legacy label | RegistrationRequestsPage seller/pharmacist 라벨 (B16) |

---

## 12. 수정 필요 파일 목록

### 12-A. HIGH (Phase 1 권장)

| 파일 | 변경 내용 |
|------|----------|
| `packages/account-ui` (build) | `npm run build` 만 — 코드 변경 없음. H3 해결 |
| `services/web-neture/src/components/Footer.tsx` | 개인 이메일 → 운영 이메일/연락처 정렬. H1 |
| `services/web-neture/src/pages/mypage/MyPageHub.tsx` | L56 `/workspace` → `/` 또는 정확한 logout 후 경로. H2 |
| `services/web-neture/src/components/home/HeroSlider.tsx` | L114 dead link 정정. H2 |
| `services/web-neture/src/pages/hub/HubPage.tsx` | L569 dead link 정정. H2 |
| `services/web-neture/src/pages/partner/PartnerOverviewPage.tsx` | L425 dead link 정정. H2 |
| `services/web-neture/src/pages/PartnerInfoPage.tsx` | L112 dead link 정정. H2 |
| `services/web-neture/src/pages/PlatformPrinciplesPage.tsx` | L209 dead link 정정. H2 |
| `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx` | ActionBar + useBatchAction 추가 (bulk approve/reject). H4 |
| `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` | status 탭 추가 (또는 Neture wrapper 에서 override). H5 |

### 12-B. MED (Phase 2 권장)

| 파일 | 변경 내용 |
|------|----------|
| `services/web-neture/src/components/NetureGlobalHeader.tsx` | admin+operator 겸임 둘 다 표시 (KPA 정합). M3 |
| 동일 | 매장 경영자 "내 매장" 메뉴 추가. M4 |
| `services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx`, `AdminSupplierApprovalPage.tsx` | confirm() → 표준 모달 정렬. M5 |
| `services/web-neture/src/pages/operator/UsersManagementPage.tsx` | 컬럼 라벨 "역할" → "유형". M1 |
| `services/web-neture/src/pages/operator/UsersManagementPage.tsx` | capability chips extraColumn 추가. M2 |
| `services/web-neture/src/pages/admin/AdminDashboardPage.tsx` 또는 layout | 화면 제목 "관리자 대시보드" 명시 (PageHeader 등). M7 |
| `services/web-neture/src/config/operatorMenuGroups.ts` | "공급사" → "공급자" 라벨 통일. M6 |

### 12-C. LOW (Phase 3 권장)

| 파일 | 변경 내용 |
|------|----------|
| `services/web-neture/src/components/layouts/AdminLayoutWrapper.tsx`, `OperatorLayoutWrapper.tsx` | serviceName 대칭 정렬. L1 |
| `services/web-neture/src/config/operatorMenuGroups.ts` | Domain IA 헤딩 적용 (선택). L2 |
| 10+ 표준 테이블 PARTIAL/NON 화면 | 점진 정렬. L3 |

---

## 13. Backend 수정 필요 여부

❌ **불필요** — 본 IR 의 모든 GAP 은 **frontend + 패키지 dist rebuild** 만으로 해결.

backend (api-server) 영향 0:
- API endpoint 변경 없음
- DB schema 변경 없음
- role_assignments / service_memberships 정책 변경 없음

단, **장기 정렬** (M4 매장 경영자 메뉴 진입 등) 진행 중 매장 경영자 backend dashboard endpoint 가 충분히 있는지 별도 검증 가능 (현 IR 범위 외).

---

## 14. Frontend 수정 필요 여부

✅ **필수** — §12-A/B/C 모두 frontend (services/web-neture + packages 일부)

영향 영역:
- `services/web-neture/src/pages/operator/` (회원관리, 가입승인, 표준 테이블)
- `services/web-neture/src/pages/admin/` (admin 화면 정렬)
- `services/web-neture/src/components/` (Header, Footer, Layout)
- `services/web-neture/src/config/` (메뉴, 라우트)
- `packages/account-ui/` (dist rebuild)
- `packages/operator-core-ui/` (OperatorMembersConsolePage status 탭)

---

## 15. 공통 컴포넌트화 가능 여부

| 항목 | 공통화 후보 / 유지 | 이유 |
|------|--------------------|------|
| **OperatorMembersConsolePage** | ✅ 이미 공통화됨 (`@o4o/operator-core-ui`) | KPA 가 독립 구현하는 부분 일부는 공통 모듈로 흡수 가능 (status 탭 옵션 등) |
| **EditUserModal (CommonEditUserModal)** | ✅ 이미 공통화됨 | service 별 wrapper |
| **DataTable + ActionBar + RowActionMenu + useBatchAction** | ✅ 이미 공통화 (`@o4o/operator-ux-core`) | KPA / Neture 모두 동일 사용 |
| **MyPageLayout** | ✅ 공통화 (`packages/account-ui`) | KPA 는 서비스 로컬 wrapper, Neture 는 직접 사용 |
| **PageHeader** | ⚠ 공통화 후보 — 현재 KPA 만 별도 컴포넌트 | KPA → @o4o/account-ui 로 이동 검토 |
| **GlobalHeader 의 프로필 메뉴 로직** | ⚠ 공통화 어려움 — 도메인 별 role 셋이 다름 | service 별 wrapper 유지 + 패턴 일관성 (KPA canonical 차용) |
| **Sidebar (OperatorShell)** | ✅ 이미 공통화 | menuItems 만 service 별 |
| **AdminDashboardLayout / OperatorDashboardLayout** | ✅ 이미 공통화 (`@o4o/admin-ux-core`, `@o4o/operator-ux-core`) | OK |
| **Neture 전용 유지** | SupplierLandingPage, PartnerLandingPage, supplier/partner workspace, hub, market-trial, supplier-quality 등 | B2B 도메인 특성 |

---

## 16. 권장 후속 WO

### W1 — WO-O4O-NETURE-UX-ALIGNMENT-PHASE1-CRITICAL-V1

**범위 (HIGH 10건)**
1. `packages/account-ui` rebuild (mypage breadcrumb 3 에러 해소 — 1줄 명령)
2. Footer 개인 이메일 정리 (B1)
3. `/workspace/*` dead link 6건 정정 (B2-B7) — Route 정의 또는 정확한 redirect
4. RegistrationRequestsPage bulk action 도입 (B9)
5. UsersManagementPage status 탭 추가 — `packages/operator-core-ui/OperatorMembersConsolePage` 에 status tab 옵션 + Neture wrapper 에서 활성화 (B10)

**예상 변경 파일 수**: 10-12 (frontend + 패키지 1)
**위험도**: Low-Medium (대부분 명백한 버그 fix)
**브라우저 검증 필수**: 가입 승인 흐름 + dead link redirect

### W2 — WO-O4O-NETURE-UX-ALIGNMENT-PHASE2-CONSISTENCY-V1

**범위 (MED 7건)**
1. NetureGlobalHeader admin+operator 겸임 둘 다 표시 (M3)
2. 매장 경영자 "내 매장" 메뉴 추가 (M4)
3. UsersManagementPage 컬럼 "역할" → "유형" + capability chips 표시 (M1, M2)
4. AdminDashboardPage 화면 제목 "관리자 대시보드" 명시 (M7)
5. AdminProductApprovalPage / AdminSupplierApprovalPage 의 confirm() → 표준 모달 (M5)
6. "공급사" → "공급자" 라벨 통일 (M6)

**예상 변경 파일 수**: 6-8
**위험도**: Low (UX/문구 정렬 위주)
**브라우저 검증 필수**: admin+operator 겸임 계정으로 사용자 메뉴 확인

### W3 — WO-O4O-NETURE-MYPAGE-PAGEHEADER-ALIGNMENT-V1 (선택)

**범위 (MyPage 구조 KPA 정합)**
- `packages/account-ui` 에 PageHeader 컴포넌트 통합 (KPA `services/web-kpa-society/src/components/PageHeader.tsx` 차용)
- Neture MyPage 페이지들이 PageHeader 직접 사용 가능 (현재 MyPageLayout 인라인 → 모듈 분리)
- 위험도 Low — 시각적 일관성만 정렬

**전제**: W1 가 mypage breadcrumb 해소 (dist rebuild) 후 진행. W2 와 병행 가능.

---

## 17. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 충돌 여부 |
|------|----------|
| §11 Admin / Operator 역할 구분 | ✅ Neture admin = 구조/정책/금융 / operator = 운영/콘텐츠 — KPA 동일 패턴, GAP 없음 |
| §11 Dashboard 5-Block 표준 (KPI+AI Summary+Action Queue+Activity Log+Quick Actions) | ✅ NetureOperatorDashboard 충족 |
| §14 F2 KPA UX Baseline | ⚠ 본 IR 의 GAP 들이 정확히 이 baseline 정합 작업 |
| §14 F11 User/Operator Freeze (3 테이블) | ✅ users / service_memberships / role_assignments 변경 없음 |
| §7 Boundary Policy | ✅ frontend 정렬만, boundary 영향 0 |
| Twin Axis (KPA + Neture) | ✅ Neture 도메인 (공급자/파트너/B2B) 유지하면서 KPA canonical 차용 — twin 정합 |
| 1인 개발 흐름 | ✅ 2~3 묶음 WO 로 분리 (W1/W2/W3) — 한 번에 너무 많이 들어가지 않음 |

→ 본 IR 의 모든 GAP 해소는 O4O 철학과 충돌 없음. Neture B2B 도메인 특성 (SupplierLandingPage/PartnerLandingPage/Hub/market-trial 등) 은 보존.

---

## 부록 A. 최종 보고

| 항목 | 값 |
|------|-----|
| 코드 수정 없음 | ✅ |
| DB 수정 없음 | ✅ |
| Renagang21 데이터 보정 없음 | ✅ |
| admin/operator role 정책 변경 없음 | ✅ |
| 6 영역 병렬 read-only 조사 | ✅ |
| 발견 항목 | 16 자잘한 버그 + 다수 구조 GAP |
| 우선순위 분류 | HIGH 10 / MED 7 / LOW 5 |
| 권장 후속 WO | 2-3 묶음 (W1 critical / W2 consistency / W3 mypage optional) |
| 즉시 해결 가능 (1줄 명령) | `cd packages/account-ui && npm run build` (mypage breadcrumb 3 에러 해소) |

---

*Author: Claude (read-only investigation)*
*Investigation date: 2026-05-27*
*Status: completed — awaiting W1 scope confirmation*
