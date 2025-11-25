# H2-3: 역할별 대시보드 진입·레이아웃 리팩토링 작업 요청서

**작성일**: 2025-11-25
**이전 Phase**: H2-2 역할 기반 헤더/메뉴 리팩토링 (완료)
**다음 Phase 예정**: App Market 인프라 (AM1~) – H2 계열 정리 후 착수

---

## 1. 작업 목적

H2-1, H2-2를 통해 **헤더/메뉴/AccountModule/RoleSwitcher**는 역할 기반으로 잘 정리되었습니다.

이제 H2-3 Phase에서는:

1. 역할별 대시보드 진입 경로와 구조를 **설계 문서(M3)와 실제 코드 간에 일치**시키고,
2. 역할 인지 레이아웃인 **HubLayout**을 Dashboard에 녹여
3. 역할별 대시보드를 **메뉴/레이아웃/설정(config/roles/dashboards.ts)** 관점에서 한 덩어리로 정리하는 것이 목표입니다.

> 한 줄 요약:
> **"역할에 따라 들어가는 '대시보드 허브'의 경로와 레이아웃을 일관되게 만들고,
> Role 설정 파일(dashboards.ts)을 실제 UI에서 사용하도록 정리하는 리팩토링"**입니다.

---

## 2. 선행 조건 및 작업 범위

### 2.1 선행 조건

* H2-2 Phase(역할 기반 헤더/메뉴) 작업이 main 브랜치에 반영되어 있음. ✅
* (권장) O1 Phase – Template Part "Main Header" priority 수정

  * 실제 개발은 별도 Phase이나, 테스트 환경에서는 **올바른 Main Header**가 기본값이어야 함.

### 2.2 작업 범위 (포함)

* `apps/main-site` 내 **대시보드/역할 레이아웃 관련 코드**:

  * Seller / Supplier / Partner 대시보드 레이아웃
  * HubLayout, RoleDashboardMenu, 역할별 대시보드 설정(config/roles/dashboards.ts)
* 역할별 Dashboard 진입 경로(`/seller`, `/supplier`, `/dashboard/seller` 등) 정리
* Partner/affiliate 역할의 설계 vs 구현 불일치 정리 (최소한 현재 코드와 문서를 맞추는 수준)

### 2.3 범위 밖 (이번 Phase에서 건드리지 않음)

* Admin Dashboard (`apps/admin-dashboard/**`)
* API 서버 (`apps/api-server/**`)
* App Market 인프라, Dropshipping, Settlement 등 다른 도메인
* 역할 개인화(M4) 로직의 추가적인 고도화 (HubLayout 내부의 슬롯 로직은 가급적 그대로 유지)

---

## 3. 상세 작업 항목

### H2-3-1. 역할별 Dashboard Entry 경로 정리

**목표**

* Seller / Supplier / Partner 등의 대시보드 진입 URL을 **일관된 규칙**으로 정리합니다.
* 설계 문서(M3)와 실제 코드를 맞추거나,
  반대로 현실적인 경로(/dashboard/… 패턴)를 **새 기준으로 확정**한 뒤 문서를 고칩니다.

**현재 상황 (H2-1 조사 요약)**

* 설계(M3):

  * Seller: `/seller`
  * Supplier: `/supplier`
  * Affiliate: `/affiliate`
* 실제:

  * Seller: `/dashboard/seller`
  * Supplier: `/dashboard/supplier`
  * Partner: `/dashboard/partner`

**작업 내용**

1. **현재 라우팅 구조 확인**

   * `apps/main-site/src/App.tsx` 혹은 라우트 정의 파일에서
     Seller/Supplier/Partner 관련 라우트 전체 확인
2. **최종 기준 경로 결정**

   * 옵션 A: 설계 문서(M3) 기준 `/seller`, `/supplier`, `/partner` 로 맞추고, `/dashboard/*`는 리다이렉트
   * 옵션 B: `/dashboard/{role}` 패턴을 공식 기준으로 삼고, 설계 문서 쪽을 업데이트
   * 실제 구현 난이도/향후 확장(다른 대시보드들) 고려해서 하나로 결정
3. **라우트 및 링크 수정**

   * AccountModule Dropdown, RoleSwitcher, Navigation에서 대시보드로 가는 링크 경로를 모두 기준에 맞게 수정
   * 기존 경로로 접근하는 경우 301/302 리다이렉트(필요 시) 또는 최소한 SPA 내부에서 redirect 처리
4. **문서 동기화**

   * 선택한 기준에 따라
     `docs/development/specialized/role-based-navigation.md` (M3 문서)
     또는 새로운 H2-3 문서에 최종 경로 규칙을 명시

**완료 조건**

* Seller / Supplier / Partner 대시보드로 가는 경로 규칙이 하나로 통일되어 있다.
* AccountModule / RoleSwitcher / Navigation 등에서 대시보드 링크가 모두 이 규칙을 따른다.
* 기존 경로로 접속해도 치명적인 404 없이 정상 경로로 유도된다(적어도 개발 환경 기준).

---

### H2-3-2. Partner / Affiliate 역할 정의 정리 (최소 정합성 맞추기)

**목표**

* 설계 문서에는 `affiliate`, 실제 구현에는 `partner` 역할이 혼재되어 있는 상황을 **최소한 문서/코드 수준에서 일관되게** 정리합니다.
* 이번 Phase에서는 **새 기능 구현 보다는 "정합성 맞추기"에 초점**을 둡니다.

**작업 내용**

1. 코드 기준 **실제 사용 중인 역할** 확인

   * `partner` 관련 코드 경로 및 사용처:

     * RoleSwitcher, AccountModule, Dashboard Layout, RBAC 설정 등
   * `affiliate` 관련 코드는 실질적으로 사용 중인지, 설계만 남아 있는지 확인
2. 비즈니스 의도(간단 정리)

   * 현재 서비스 계획 상, `partner`가 `affiliate`를 사실상 대체한 것인지,
     아니면 나중에 별도로 affiliate를 도입할 여지를 남길 것인지 "메모 수준"으로만 정리
3. 이번 Phase의 결정

   * H2-3에서는 아래 둘 중 하나를 선택:

     * (A) `partner`를 공식 역할로 채택 → M3 문서의 `affiliate` 부분을 `partner`로 업데이트
     * (B) `affiliate`를 미래 예약 역할로 남기되, 현재는 partner만 사용한다고 명시
4. 문서 및 설정 업데이트

   * `docs/development/specialized/role-based-navigation.md`에서 역할 목록을 실제 코드에 맞게 업데이트
   * `config/roles/menus.ts` 및 `config/roles/dashboards.ts`에서 role 키가 `partner`인지 `affiliate`인지 일관되게 맞추기
   * H2-1/H2-2 문서의 관련 섹션도 필요 시 간단히 정리

**완료 조건**

* "현재 기준으로 어떤 역할이 공식인지(partner/affiliate)"가 문서 한 군데에 명확히 적혀 있다.
* 코드 상에서 `partner`/`affiliate` 키가 뒤섞여 있지 않고, 최소한 혼란이 줄어든 상태이다.

---

### H2-3-3. HubLayout과 Dashboard Layout 통합 전략 적용

**목표**

* 역할 인지 레이아웃인 **HubLayout**과, 현재 Seller/Supplier/Partner에서 쓰는 Dashboard Layout을
  완전히 하나로 합치지는 않더라도, **관계/사용 방식을 정리**해 두는 것이 목표입니다.
* 이번 Phase에서는 "완전 통합"보다, **Dashboard 쪽에서 HubLayout 기능을 일정 부분 활용하는 수준**까지를 목표로 잡습니다.

**현재 상황 (요약)**

* HubLayout:

  * 역할 인지, 개인화 슬롯(M4), 분석 이벤트 등을 담당
  * 일부 허브 페이지에서만 사용
* Dashboard Layout들:

  * `SellerLayout`, `SupplierLayout`, `PartnerLayout` 등
  * URL 기반 섹션/탭 네비게이션, RoleDashboardMenu 등 담당
  * HubLayout을 사용하지 않고, 일반 Layout.tsx만 사용

**작업 내용**

1. HubLayout 역할 재확인

   * 역할 인지(현재 역할), 역할별 배너, M4 개인화 슬롯, 분석 이벤트 전송
   * 해당 기능을 Dashboard에도 주입할 가치가 있는지 판단
2. 통합 방안 선택 (이번 Phase 수준)

   * 방안 예시:

     * A: SellerLayout 등 대시보드 레이아웃에서 **최상단을 HubLayout으로 감싸는 래핑**

       ```tsx
       <HubLayout requiredRole="seller" showPersonalization>
         <SellerLayoutInner ... />
       </HubLayout>
       ```
     * B: HubLayout 내부 기능 일부(예: 분석 이벤트, 배너만) 훅/컴포넌트로 분리해서 Dashboard Layout에서 사용
   * 이번 Phase에서는 **A 또는 B 중 하나만** 선택해도 충분합니다.
3. 실제 적용 (선택한 방안 기준)

   * SellerLayout, SupplierLayout, PartnerLayout에 대해 동일한 패턴으로 적용
   * 역할이 맞지 않을 때 접근 제어(리다이렉트/에러 처리)를 HubLayout/Guard로 통일
4. 개인화 슬롯/배너/분석 이벤트 최소 검증

   * 각 Dashboard에 접속했을 때, 필요한 이벤트(예: role_dashboard_loaded)가 정상 전송되는지 확인

**완료 조건**

* Seller/Supplier/Partner 대시보드가 HubLayout 또는 HubLayout에서 떼어낸 기능을 통해
  **역할 인지 + 기본 개인화/이벤트 처리**를 공유하는 구조가 된다.
* 코드 레벨에서 "대시보드만 따로 노는 레이아웃" 상태가 완화된다.

---

### H2-3-4. config/roles/dashboards.ts 실제 반영

**목표**

* 현재 `config/roles/dashboards.ts`에 정의된 역할별 대시보드 카드/메뉴 설정이
  **실제 Dashboard Layout에 반영**되도록 정리한다.

**작업 내용**

1. `config/roles/dashboards.ts` 내용 확인

   * Seller, Supplier, Partner(또는 Affiliate)별 설정 구조 확인
2. Dashboard Layout의 메뉴/카드 로직 비교

   * `SellerLayout` 내부의 `menuItems`/카드 목록과 설정 파일 내용 비교
   * Supplier/Partner도 동일하게 비교
3. 통합 방식 결정

   * Dashboard Layout에서 **직접 하드코딩된 메뉴/카드 배열을 삭제**하고,
     `getDashboardConfigForRole(role)` 같은 헬퍼를 통해 설정에서 읽어오도록 변경
4. 테스트

   * 설정 파일에서 카드/메뉴를 하나 바꾼 후, 실제 UI에서 즉시 반영되는지 확인

**완료 조건**

* `config/roles/dashboards.ts`를 수정하면
  Seller/Supplier/Partner 대시보드 메뉴/카드 구성이 실제로 바뀐다.
* Dashboard Layout 파일 내부에는 "역할별 메뉴/카드 하드코딩"이 최대한 줄어들어 있다.

---

## 4. 테스트 시나리오

### 4.1 기능 테스트 (수동)

* **Seller 계정**

  * 헤더에서 Seller 관련 메뉴 확인
  * Seller 대시보드 진입 경로가 기준 규칙대로 동작하는지 확인
  * 대시보드 내 섹션/카드 구성 확인
  * HubLayout/개인화/이벤트 이상 여부 확인
* **Supplier 계정**

  * 동일 패턴으로 확인
* **Partner 계정**

  * Partner 대시보드 경로와 메뉴/카드 구성 확인
  * Partner/affiliate 정리 내용이 문서·UI와 일치하는지 확인
* **복수 역할 계정**

  * RoleSwitcher로 역할 전환 후, 각 역할의 대시보드 진입이 자연스럽게 이어지는지 확인

### 4.2 기술 검증

* TypeScript, Lint, Build 모두 통과
* 기존 H2-2에서 완성된 헤더/메뉴 동작에 악영향이 없는지 간단 회귀 체크

---

## 5. 산출물 및 보고 방식

### 5.1 코드 변경 예상 위치

* `apps/main-site/src/App.tsx` 또는 라우트 정의 파일(대시보드 경로)
* `apps/main-site/src/components/dashboard/seller/SellerLayout.tsx`
* `apps/main-site/src/components/dashboard/supplier/SupplierLayout.tsx`
* `apps/main-site/src/components/dashboard/partner/PartnerLayout.tsx`
* `apps/main-site/src/components/layout/HubLayout.tsx` (또는 관련 유틸)
* `apps/main-site/src/config/roles/dashboards.ts`
* (필요시) `docs/development/specialized/role-based-navigation.md` 문서

### 5.2 완료 보고 형식

* 커밋 메시지 예:

  * `feat(H2-3): Refine role-based dashboard entry and layouts`
* 간단 요약:

  * 어떤 경로 규칙으로 통일했는지
  * HubLayout과 Dashboard 통합 방식을 어떻게 선택했는지
  * dashboards.ts 설정이 실제로 어느 부분에 반영되었는지

---

**작성자**: 사용자
**검토자**: Claude Code (구현 담당)
