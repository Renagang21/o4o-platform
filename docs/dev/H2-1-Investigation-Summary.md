# H2-1: 역할 기반 헤더/메뉴 구조 조사 - 완료 리포트

**작성일**: 2025-11-25
**Phase**: H2-1 (조사 및 플랜 수립)
**상태**: ✅ 완료
**다음 Phase**: H2-2 (역할 기반 헤더/메뉴 리팩토링 구현)

---

## 1. 요약

H2-1 Phase에서 역할 기반 헤더/메뉴 시스템의 설계 사양과 현재 구현 상태를 조사하고, 갭 분석을 수행하였습니다. 조사 결과를 바탕으로 **H2-RoleBasedHeaderNavigation_Plan.md** 리팩토링 플랜 문서를 작성하였습니다.

**핵심 발견사항:**
- ✅ 역할 기반 설계 문서 존재 (M3, 역할 개인화 매뉴얼)
- ✅ 역할 설정 파일 구현됨 (`config/roles/menus.ts`, `dashboards.ts`, `banners.ts`)
- ✅ AccountModule, RoleSwitcher, HubLayout 구현됨
- ❌ **주요 갭**: Navigation이 역할별 메뉴 필터링 미사용
- ❌ **주요 갭**: AccountModule Dropdown이 역할별로 변경되지 않음
- ⚠️ HubLayout과 Layout.tsx 이원화 (두 레이아웃 시스템 공존)

---

## 2. 설계 문서 조사 결과

### 2.1 발견한 설계 문서 (4건)

#### 문서 1: M3 역할 기반 네비게이션 시스템
- **경로**: `docs/development/specialized/role-based-navigation.md`
- **내용**: 역할 기반 네비게이션 기술 문서
- **지원 역할**: customer, seller, supplier, affiliate
- **핵심 컴포넌트**: HubLayout, RoleGuard, RoleSwitcher
- **설정 파일**: menus.ts, banners.ts, dashboards.ts
- **분석 이벤트**: role_switched, role_menu_loaded, role_banner_shown, role_dashboard_loaded

#### 문서 2: 역할 기반 개인화 시스템
- **경로**: `docs/guides/roles/role-personalization.md`
- **내용**: 관리자용 역할 개인화 매뉴얼
- **개인화 슬롯**: Top Notice, Main Feed, Side Suggestions, Bottom Banners
- **Signal 수집**: 행동 신호, 상태 신호, 디바이스 신호
- **우선순위 규칙**: 긴급 작업 (+10~+30), 온보딩 (+30), 클릭 학습 (+5)

#### 문서 3: 메뉴 역할 적용 매뉴얼
- **경로**: `docs/guides/roles/menu-role-application.md`
- **내용**: 사용자용 메뉴에 역할 적용 방법
- **Target Audience**: Everyone, Logged Out Only, Specific Roles
- **지원 역할**: customer, seller, supplier, affiliate, super_admin, admin, editor
- **Display Mode**: Show/Hide

#### 문서 4: H1 헤더 전면 조사 리포트
- **경로**: `docs/dev/H1-Full-Header-Investigation.md`
- **내용**: 헤더 렌더링 플로우 및 Template Part 시스템 조사
- **발견 이슈**: "Main Header" (priority 0) vs "Shop Header" (priority 100) 충돌
- **해결 방안**: Main Header priority를 101로 업데이트 (O1 Phase)
- **AccountModule 평가**: 조건부 렌더링 완벽 (guest vs authenticated)

### 2.2 역할별 메뉴 매트릭스 (설계 사양)

| 역할 | Header Visible Items | Account Dropdown | Dashboard Entry | RoleSwitcher |
|------|---------------------|------------------|-----------------|--------------|
| Guest (비로그인) | 홈, 쇼핑, 소개 | "로그인", "회원가입" | - | 숨김 |
| Customer | 홈, 쇼핑, 주문내역, 위시리스트 | 내 계정, 주문 내역, 위시리스트, 알림, 설정, 고객지원, 로그아웃 | - | 복수 역할 시 표시 |
| Seller | 대시보드, 상품관리, 주문관리, 매출분석 | 내 계정, Seller 대시보드, 설정, 로그아웃 | `/seller` | 복수 역할 시 표시 |
| Supplier | 대시보드, 재고관리, 주문관리, 파트너관리 | 내 계정, Supplier 대시보드, 설정, 로그아웃 | `/supplier` | 복수 역할 시 표시 |
| Affiliate | 대시보드, 캠페인관리, 수익분석, 클릭통계 | 내 계정, Affiliate 대시보드, 설정, 로그아웃 | `/affiliate` | 복수 역할 시 표시 |
| Partner | (설계 문서에 없음) | - | `/dashboard/partner` | 복수 역할 시 표시 |

**참고:**
- M3 문서에는 `customer`, `seller`, `supplier`, `affiliate` 4개 역할만 명시
- 실제 코드에는 `partner` 역할 구현되어 있음 (설계 문서 업데이트 필요)

---

## 3. 현재 구현 상태 조사 결과

### 3.1 Template Part 시스템 (헤더 렌더링)

**렌더링 플로우:**
```
App.tsx → Layout.tsx → TemplatePartRenderer (area="header")
  ├─ useTemplateParts() - DB에서 Template Parts 조회
  ├─ ResponsiveHeader - 모바일 지원
  ├─ StickyHeader - Sticky 기능
  └─ Block 렌더링
       ├─ AccountModule (o4o/account-menu)
       ├─ Navigation (core/navigation)
       ├─ RoleSwitcher (o4o/role-switcher)
       └─ CartModule (o4o/cart-icon)
```

**조사 파일:**
- `apps/main-site/src/components/layout/Layout.tsx` (✅ 조사 완료)
- `apps/main-site/src/components/TemplatePartRenderer.tsx` (✅ 조사 완료)

**평가:**
- ✅ WordPress 스타일 Template Part 시스템 구현됨
- ✅ DB 기반 헤더 구성
- ✅ Sticky, Responsive 기능 통합
- ⚠️ **이슈**: Priority 0 "Main Header"와 Priority 100 "Shop Header" 충돌 (H1-Full 리포트, O1 Phase에서 수정)

### 3.2 AccountModule (역할 표시 및 Dropdown)

**파일:** `apps/main-site/src/components/blocks/AccountModule.tsx`

**현재 기능:**
- ✅ Guest 상태: "로그인" / "회원가입" 버튼
- ✅ Authenticated 상태: 사용자 아바타, 이름, 역할 뱃지 표시
- ✅ 역할 뱃지 설정 (customer, seller, supplier, partner, admin)
- ✅ Dropdown 메뉴: 내 계정, 주문 내역, 위시리스트, 알림, 설정, 고객지원, RoleSwitcher, 로그아웃

**갭:**
- ❌ Dropdown 메뉴 항목이 역할별로 변경되지 않음 (모든 역할에 동일한 메뉴)

### 3.3 RoleSwitcher (역할 전환)

**파일:** `apps/main-site/src/components/blocks/RoleSwitcher.tsx`

**현재 기능:**
- ✅ Workspace 기반 역할 전환
- ✅ 지원 역할: customer, seller, supplier, partner, admin
- ✅ URL 경로로 active role 감지
- ✅ 복수 역할 사용자에게만 표시

**갭:**
- ⚠️ AccountModule Dropdown 내부에 위치 (UX 개선 가능)
- ⚠️ M3 문서의 RoleSwitcher API 호출 (`PATCH /user/preferences`) 연동 확인 필요

### 3.4 Navigation (메뉴 렌더링)

**파일:** `apps/main-site/src/components/blocks/Navigation.tsx`

**현재 기능:**
- ✅ `useMenu(menuRef)` hook으로 DB 메뉴 데이터 가져오기
- ✅ 메뉴 항목 렌더링 (링크, 서브메뉴)
- ✅ Dropdown submenu 지원
- ✅ Responsive 지원

**갭:**
- ❌ **핵심 갭**: 역할 기반 메뉴 필터링 로직 없음
- ❌ `config/roles/menus.ts` 역할 메뉴 설정 미사용
- ❌ 모든 사용자에게 동일한 메뉴 표시

### 3.5 Role Configuration Files

**파일 위치:** `apps/main-site/src/config/roles/`

**파일 목록:**
- `menus.ts` - 역할별 메뉴 정의 (customer, seller, supplier, affiliate) ✅
- `dashboards.ts` - 역할별 대시보드 카드 설정 ✅
- `banners.ts` - 역할별 배너 설정 ✅
- `index.ts` - 통합 export ✅

**평가:**
- ✅ 역할별 설정 파일 존재
- ✅ 구조화된 설정
- ❌ **핵심 갭**: Navigation 컴포넌트와 통합되지 않음 (사용되지 않는 설정)

### 3.6 HubLayout (역할 인지 레이아웃)

**파일:** `apps/main-site/src/components/layout/HubLayout.tsx`

**현재 기능:**
- ✅ `useAuth()`로 currentRole 구독
- ✅ 역할별 메뉴, 배너, 대시보드 설정 자동 로드
- ✅ M4 개인화 슬롯 통합 (TopNotice, SideSuggestions, BottomBanners)
- ✅ 분석 이벤트 전송 (role_menu_loaded, role_dashboard_loaded, role_banner_shown)

**갭:**
- ⚠️ Template Part Layout.tsx와 분리되어 있음 (두 가지 레이아웃 시스템 공존)
- ⚠️ 일반 페이지에서는 사용되지 않음 (Dashboard Layout과 분리)

### 3.7 Dashboard Layouts (역할별 대시보드)

**파일:**
- `apps/main-site/src/components/dashboard/seller/SellerLayout.tsx` ✅
- `apps/main-site/src/components/dashboard/supplier/SupplierLayout.tsx` ✅
- `apps/main-site/src/components/dashboard/partner/PartnerLayout.tsx` ✅
- `apps/main-site/src/components/dashboard/RoleDashboardMenu.tsx` ✅

**현재 기능:**
- ✅ 역할별 Nested Layout
- ✅ RoleDashboardMenu로 탭 네비게이션
- ✅ Section/Route 기반 네비게이션 지원

**갭:**
- ⚠️ HubLayout 사용하지 않음 (일반 Layout.tsx 사용)
- ⚠️ config/roles/dashboards.ts 카드 설정과 통합 불명확

### 3.8 Navbar.tsx (레거시 컴포넌트?)

**파일:** `apps/main-site/src/components/layout/Navbar.tsx`

**현재 기능:**
- 역할 기반 대시보드 링크 (supplier, seller, partner)
- 역할 신청 링크
- Admin 링크
- 위시리스트 링크
- 로그아웃 버튼

**갭:**
- ⚠️ Template Part 시스템이 사용하는지 불명확
- ⚠️ AccountModule과 중복 기능
- ❓ **조사 필요**: 실제 사용 여부 확인 필요

---

## 4. 갭 분석 요약

### 4.1 핵심 갭 (우선순위 높음)

| 항목 | 설계 사양 | 현재 구현 | 갭 설명 |
|------|---------|---------|---------|
| **Header 메뉴** | 역할별 메뉴 항목 필터링 | 모든 사용자에게 동일한 메뉴 | ❌ 역할 기반 필터링 없음 |
| **Navigation 통합** | config/roles/menus.ts 사용 | DB 메뉴만 사용 | ❌ 역할 메뉴 설정 미통합 |
| **Account Dropdown** | 역할별 Dropdown 항목 변경 | 모든 역할에 동일한 Dropdown | ❌ 역할별 차별화 없음 |
| **Navbar.tsx** | N/A | 존재하지만 사용 여부 불명확 | ❓ 사용 여부 확인 필요 |

### 4.2 부차적 갭 (우선순위 중간)

| 항목 | 설계 사양 | 현재 구현 | 갭 설명 |
|------|---------|---------|---------|
| **RoleSwitcher 위치** | Header에 독립적 표시 | AccountModule Dropdown 내부 | ⚠️ UX 개선 가능 |
| **Dashboard Entry 경로** | `/seller`, `/supplier` | `/dashboard/seller`, `/dashboard/supplier` | ⚠️ 경로 불일치 |
| **역할 범위** | customer, seller, supplier, affiliate | customer, seller, supplier, **partner**, admin | ⚠️ affiliate 미구현, partner 추가됨 |

### 4.3 아키텍처 갭 (우선순위 낮음)

| 항목 | 설계 사양 | 현재 구현 | 갭 설명 |
|------|---------|---------|---------|
| **레이아웃 통합** | HubLayout 사용 | HubLayout과 Layout.tsx 이원화 | ⚠️ 두 레이아웃 시스템 공존 |
| **Dashboard Layout** | HubLayout 사용 | 일반 Layout.tsx 사용 | ⚠️ HubLayout 미사용 |
| **분석 이벤트** | 전체 Header에 적용 | HubLayout에서만 전송 | ⚠️ 전체 헤더 미적용 |

---

## 5. 리팩토링 플랜 문서 작성 완료

**문서 경로**: `docs/dev/H2-RoleBasedHeaderNavigation_Plan.md`

**문서 구조:**
1. 목표 및 범위
2. 설계 문서 조사 결과
3. 현재 구현 상태 조사 결과
4. 갭 분석 (설계 vs 구현)
5. **리팩토링 작업 목록** (H2-2, H2-3, H2-4)
6. 리스크 및 고려사항
7. 다음 Phase와의 연결
8. 작업 우선순위
9. 제약사항
10. 성공 기준
11. 참고 문서

**핵심 작업 목록:**
- **H2-2-1**: Navbar.tsx 사용 여부 확인 및 정리
- **H2-2-2**: Navigation에 역할 기반 메뉴 필터링 추가 (핵심)
- **H2-2-3**: AccountModule Dropdown 역할별 차별화
- **H2-2-4**: RoleSwitcher UX 개선 (선택 사항)
- **H2-2-5**: RoleSwitcher API 연동 확인
- **H2-2-6**: 분석 이벤트 통합
- **H2-3-1**: Dashboard Entry 경로 통일
- **H2-3-2**: HubLayout과 Template Part Layout 통합
- **H2-3-3**: Dashboard Layout에 HubLayout 적용
- **H2-3-4**: config/roles/dashboards.ts 통합 확인
- **H2-4-1**: Affiliate 역할 구현 (선택 사항)

---

## 6. 다음 단계 (H2-2)

### 6.1 선행 작업 (권장)

**O1: Template Part "Main Header" Priority 수정**
- H1-Full 리포트에서 발견한 이슈
- "Main Header" priority를 0 → 101로 업데이트
- H2 작업 시 올바른 헤더에서 테스트 가능

### 6.2 H2-2 Phase 시작 준비

**우선순위 1 작업 (필수):**
1. H2-2-1: Navbar.tsx 사용 여부 확인 및 정리
2. H2-2-2: Navigation에 역할 기반 메뉴 필터링 추가
3. H2-2-5: RoleSwitcher API 연동 확인

**테스트 시나리오 준비:**
- Customer 역할로 로그인 → Customer 메뉴만 표시
- Seller 역할로 로그인 → Seller 메뉴만 표시
- Supplier 역할로 로그인 → Supplier 메뉴만 표시
- Guest 사용자 → 기본 메뉴 표시
- 복수 역할 사용자 → RoleSwitcher 표시 및 역할 전환 테스트

---

## 7. 조사 통계

### 7.1 조사한 파일 수

| 카테고리 | 파일 수 | 상태 |
|---------|--------|------|
| 설계 문서 | 4 | ✅ 조사 완료 |
| Layout 컴포넌트 | 3 | ✅ 조사 완료 |
| Block 컴포넌트 | 4 | ✅ 조사 완료 |
| Role Config 파일 | 4 | ✅ 조사 완료 |
| Dashboard 컴포넌트 | 4 | ✅ 조사 완료 |
| **합계** | **19** | **✅ 완료** |

### 7.2 발견한 주요 컴포넌트

- ✅ AccountModule - 역할 뱃지 및 Dropdown (조건부 렌더링 완벽)
- ✅ RoleSwitcher - 역할 전환 컴포넌트 (복수 역할 감지)
- ✅ Navigation - 메뉴 렌더링 (역할 필터링 미사용)
- ✅ HubLayout - 역할 인지 레이아웃 (M4 개인화 통합)
- ✅ RoleDashboardMenu - 재사용 가능한 대시보드 메뉴
- ✅ SellerLayout, SupplierLayout, PartnerLayout - 역할별 Dashboard Layout
- ⚠️ Navbar.tsx - 사용 여부 불명확 (조사 필요)

### 7.3 발견한 역할 설정 파일

- ✅ `config/roles/menus.ts` - 역할별 메뉴 정의 (미사용)
- ✅ `config/roles/dashboards.ts` - 역할별 대시보드 카드 설정
- ✅ `config/roles/banners.ts` - 역할별 배너 설정
- ✅ `config/roles/index.ts` - 통합 export

---

## 8. 결론

### 8.1 조사 성과

✅ **성공적으로 완료한 작업:**
1. 역할 기반 헤더/메뉴 설계 문서 4건 발견 및 분석
2. 현재 main-site 헤더/네비게이션 구현 구조 19개 파일 조사
3. 설계 vs 구현 갭 분석 완료 (핵심 갭 4개, 부차적 갭 3개, 아키텍처 갭 3개)
4. 리팩토링 플랜 문서 작성 완료 (H2-RoleBasedHeaderNavigation_Plan.md)
5. 작업 목록 정의 (11개 작업, 우선순위 3단계)

### 8.2 핵심 발견사항

**Good (잘 구현된 부분):**
- ✅ AccountModule 조건부 렌더링 완벽 (H1-Full 평가)
- ✅ 역할 뱃지 시스템 구현됨
- ✅ RoleSwitcher 복수 역할 감지 로직 구현됨
- ✅ 역할 설정 파일 구조화됨 (config/roles/*.ts)
- ✅ HubLayout 역할 인지 레이아웃 구현됨 (M4 통합)
- ✅ Dashboard Layout 역할별 구현됨 (Seller, Supplier, Partner)

**Bad (개선 필요한 부분):**
- ❌ Navigation이 역할별 메뉴 필터링 미사용 (핵심 갭)
- ❌ AccountModule Dropdown이 역할별로 변경되지 않음
- ❌ config/roles/menus.ts 설정이 실제로 사용되지 않음
- ⚠️ HubLayout과 Layout.tsx 이원화 (레이아웃 시스템 분리)
- ⚠️ Navbar.tsx 사용 여부 불명확 (중복 코드 가능성)
- ⚠️ Affiliate 역할 미구현 (M3 문서에는 명시되어 있음)

### 8.3 다음 Phase 준비 완료

**H2-2 Phase 진행 준비:**
- ✅ 리팩토링 플랜 문서 작성 완료
- ✅ 작업 우선순위 정의 완료
- ✅ 테스트 시나리오 정의 완료
- ✅ 리스크 및 제약사항 정의 완료
- ✅ 성공 기준 정의 완료

**권장 선행 작업:**
- O1: Template Part "Main Header" Priority 수정 (H1-Full 이슈)

---

**작성자**: Claude Code
**검토자**: [사용자 검토 필요]
**승인자**: [사용자 승인 필요]

**참고 문서:**
- `docs/dev/H2-RoleBasedHeaderNavigation_Plan.md` - 리팩토링 플랜
- `docs/dev/H1-Full-Header-Investigation.md` - H1 헤더 조사 리포트
- `docs/development/specialized/role-based-navigation.md` - M3 역할 기반 네비게이션
