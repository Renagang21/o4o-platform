# H2-3 Partial Completion Summary: Dashboard Entry & Role Consistency

**Phase**: H2-3 (역할별 대시보드 진입·레이아웃 리팩토링)
**Status**: Partial Completion (Tasks H2-3-1 and H2-3-2)
**Date**: 2025-11-25

---

## ✅ Completed Tasks

### H2-3-1: 역할별 Dashboard Entry 경로 정리 (COMPLETED)

**목표**: Seller / Supplier / Partner 대시보드 진입 URL을 일관된 규칙으로 정리

**결정사항**: `/workspace/{role}` → `/dashboard/{role}` 패턴 채택

**근거**:
- **2단계 URL 구조 장점**:
  - `/workspace/{role}`: 공개 진입점, 역할 검증, WorkspaceRedirect 사용
  - `/dashboard/{role}`: 실제 라우트, RoleGuard 보호, 중첩 라우팅 지원
- **기존 인프라 활용**: WorkspaceRedirect 컴포넌트가 이미 구현되어 있음
- **유연성**: 향후 대시보드 내부 구조 변경 시에도 공개 URL은 유지 가능
- **명확한 의미**: "workspace"는 진입점, "dashboard"는 구현 계층으로 명확히 분리

**변경 내역**:

1. **AccountModule.tsx** (apps/main-site/src/components/blocks/AccountModule.tsx)
   - ❌ Before: `/dashboard/seller`, `/dashboard/supplier`, `/dashboard/partner`
   - ✅ After: `/workspace/seller`, `/workspace/supplier`, `/workspace/partner`
   - Dashboard 진입 링크만 변경, 하위 페이지(products, orders 등)는 `/dashboard/{role}/{page}` 유지

2. **config/roles/menus.ts** (apps/main-site/src/config/roles/menus.ts)
   - ❌ Before: `/seller`, `/supplier`, `/affiliate` (M3 설계 문서 기준, 실제 라우트와 불일치)
   - ✅ After:
     - Dashboard 홈: `/workspace/{role}` (진입점)
     - 하위 페이지: `/dashboard/{role}/{page}` (직접 라우팅)
   - Seller, Supplier, Partner 메뉴 모두 업데이트

3. **config/roles/dashboards.ts** (apps/main-site/src/config/roles/dashboards.ts)
   - ❌ Before: `/seller/sales`, `/supplier/inventory`, `/affiliate/campaigns` 등
   - ✅ After: `/dashboard/seller/sales`, `/dashboard/supplier/inventory`, `/dashboard/partner/links` 등
   - 모든 대시보드 카드 URL을 `/dashboard/{role}/` 패턴으로 통일

4. **Documentation Update**
   - `docs/development/specialized/role-based-navigation.md` (M3 문서) 업데이트
   - 2단계 URL 구조 명확히 문서화
   - QA 체크리스트 업데이트 (리다이렉트 테스트 포함)

**URL 매핑**:
```
Public Entry → Internal Route
/workspace/seller   → /dashboard/seller   (SellerLayout)
/workspace/supplier → /dashboard/supplier (SupplierLayout)
/workspace/partner  → /dashboard/partner  (PartnerLayout)
/workspace/customer → /account            (AccountPage)
```

**완료 조건 달성**:
- ✅ Seller / Supplier / Partner 대시보드 진입 경로 통일
- ✅ AccountModule / RoleSwitcher / Navigation의 링크 규칙 일치
- ✅ WorkspaceRedirect가 기존 경로를 정상 처리

---

### H2-3-2: Partner / Affiliate 역할 정의 정리 (COMPLETED)

**목표**: 설계 문서의 `affiliate`와 실제 구현의 `partner` 불일치 해결

**결정사항**: **`partner`를 공식 역할로 채택**, `affiliate`는 호환성 별칭으로 유지

**근거**:
- 실제 구현: App.tsx, PartnerLayout, RoleGuard 모두 `partner` 사용
- 비즈니스 의도: 제휴 마케팅보다는 파트너십 모델에 가까움
- 향후 확장: `affiliate`를 별칭으로 남겨두어 추후 분리 가능성 보존

**변경 내역**:

1. **config/roles/menus.ts**
   - `partner` 메뉴 설정 추가:
     - Dashboard, 링크 관리, 분석, 정산
     - URL: `/workspace/partner`, `/dashboard/partner/links`, etc.
   - `affiliate` 메뉴는 `partner`와 동일한 내용으로 별칭 유지

2. **config/roles/dashboards.ts**
   - `partner` 대시보드 설정 추가:
     - 이번 달 수익, 활성 링크, 클릭 수, 전환율
     - Campaign 개념 → Link 개념으로 변경 (실제 구현에 맞춤)
   - `affiliate` 대시보드는 `partner`와 동일한 내용으로 별칭 유지

3. **Documentation Update**
   - M3 문서의 "지원되는 역할" 섹션:
     - ❌ Before: "affiliate (제휴자): 마케팅 캠페인 및 수익 관리"
     - ✅ After: "partner (파트너): 제휴 링크 관리 및 수익 관리"
     - "affiliate는 호환성을 위한 별칭으로 유지됨" 명시
   - QA 체크리스트: "Affiliate Hub" → "Partner Dashboard"로 변경

**완료 조건 달성**:
- ✅ 공식 역할이 `partner`임을 문서에 명시
- ✅ 코드 상 `partner`/`affiliate` 키가 일관되게 정리됨 (둘 다 존재하지만 명확한 주/부 관계)
- ✅ 향후 분리 가능성을 위한 별칭 구조 유지

---

## 📊 파일 변경 통계

**Modified Files (7)**:
1. `apps/main-site/src/components/blocks/AccountModule.tsx`
   - Header comment + 3개 대시보드 URL 변경
2. `apps/main-site/src/config/roles/menus.ts`
   - Header comment + seller/supplier/partner 메뉴 URL 변경
   - `affiliate` → `partner` 역할 추가 및 별칭 유지
3. `apps/main-site/src/config/roles/dashboards.ts`
   - Header comment + seller/supplier/partner 대시보드 URL 변경
   - `affiliate` → `partner` 역할 추가 및 별칭 유지
4. `docs/development/specialized/role-based-navigation.md`
   - "지원되는 역할" 섹션 업데이트
   - "허브 페이지" → "역할별 대시보드 라우팅" 섹션 대폭 수정
   - QA 체크리스트 업데이트
5. `docs/dev/H2-3-RoleBasedDashboardAccess_Task.md`
   - (이전에 생성, 이번 작업의 기반 문서)
6. `docs/dev/H2-3-Partial-Summary.md`
   - (현재 문서)

**TypeScript Type-check**: ✅ Passed (no errors)

---

## 🚧 Remaining Tasks (H2-3-3, H2-3-4)

### H2-3-3: HubLayout과 Dashboard Layout 통합 전략 적용

**현재 상태**:
- HubLayout: 역할 인지, 개인화 슬롯(M4), 분석 이벤트 담당
- Dashboard Layouts: URL 기반 섹션/탭 네비게이션, RoleDashboardMenu 담당
- 둘이 완전히 분리된 상태

**작업 내용** (예정):
- SellerLayout 등 대시보드 레이아웃을 HubLayout으로 감싸거나
- HubLayout 내부 기능(분석 이벤트, 배너)을 훅/컴포넌트로 분리해서 Dashboard에서 사용
- 역할 불일치 시 접근 제어를 HubLayout/Guard로 통일

### H2-3-4: config/roles/dashboards.ts 실제 반영

**현재 상태**:
- `dashboards.ts`에 역할별 대시보드 카드 설정이 정의되어 있음
- 하지만 실제 Dashboard Layout에서는 하드코딩된 메뉴/카드를 사용 중

**작업 내용** (예정):
- Dashboard Layout에서 `getDashboardForRole(role)` 호출하도록 변경
- 하드코딩된 메뉴/카드 배열 제거
- 설정 파일 수정 시 UI에 즉시 반영되도록 구조화

---

## 🎯 Next Steps

1. **Option A**: H2-3-3, H2-3-4 즉시 진행
   - HubLayout 통합 및 dashboards.ts 적용까지 완료
   - H2-3 전체를 한 번에 커밋

2. **Option B**: Checkpoint 커밋 후 H2-3-3, H2-3-4 진행 (권장)
   - H2-3-1, H2-3-2를 먼저 커밋 (안정적인 변경사항 확정)
   - 이후 H2-3-3, H2-3-4를 별도 작업으로 진행
   - 이유: H2-3-1/H2-3-2는 URL 정리로 독립적이고, H2-3-3/H2-3-4는 아키텍처 변경으로 리스크가 더 높음

---

## 📝 Notes

- **설계 vs 구현**: M3 설계 문서는 `/seller` 패턴을 제안했으나, 실제 구현은 `/dashboard/seller` 패턴 사용. H2-3-1에서 `/workspace/seller` → `/dashboard/seller` 2단계 구조로 최종 확정.
- **Partner vs Affiliate**: 비즈니스 모델이 진화하면서 "affiliate marketing"보다 "partnership" 개념이 더 적합해짐. 향후 필요 시 분리 가능하도록 별칭 유지.
- **내부 네비게이션**: Dashboard 내부 링크(예: "View All Products")는 `/dashboard/{role}/{page}` 직접 사용 (리다이렉트 불필요, 성능 최적화)
- **외부 진입점**: 헤더 메뉴, AccountModule, RoleSwitcher 등은 `/workspace/{role}` 사용 (역할 검증 계층 거침)

---

**작성자**: Claude Code
**작성일**: 2025-11-25
