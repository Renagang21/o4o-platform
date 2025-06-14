# 🧩 Task: 판매자 대시보드 UI 개발 (`/dashboard/seller`)

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 반드시 다음 폴더 경로 내에서 작업해야 합니다:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\services\main-site
  Coding\src\pages
  Coding\main-site
  ```

---

## 🎯 목적
판매자가 자신의 상품/주문/수익 등을 한눈에 관리할 수 있는 대시보드를 구성합니다.  
카드 기반 요약 정보와 좌측 사이드 메뉴, 실시간 승인 상태 표시 기능이 포함됩니다.

---

## 📐 기능 및 섹션 구성

### 1. 좌측 고정 사이드 메뉴
- 메뉴 항목: `상품관리`, `주문관리`, `정산`, `설정`
- 현재 메뉴 강조 및 아이콘 포함

### 2. 상단 요약 카드 4종
- 총 주문 수
- 총 매출액
- 승인 대기 상품 수
- 누적 방문자 수 (또는 클릭수)

### 3. 최근 주문 / 최근 상품 요약
- 최근 주문 5건 (주문번호, 상태, 금액)
- 최근 등록 상품 5개 (썸네일, 상태, 가격)

### 4. 승인 상태 안내
- "승인 대기 중인 상품이 있습니다" 경고
- yaksa 인증/보호 기능이 연동될 수 있음

---

## 💡 디자인 참고
- Shopify, Cafe24의 판매자 대시보드
- Supliful, AutoDS 대시보드 레이아웃

---

## 🧪 테스트 체크리스트
- 카드 컴포넌트가 모바일에서도 정렬 깨지지 않는가?
- 사이드 메뉴 클릭 시 색상 및 포커스 효과 적용되는가?
- 최근 주문 및 상품 리스트가 샘플 데이터로 렌더링되는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/pages/SellerDashboard.tsx`

## 컴포넌트 분리 권장 구조
- `/components/dashboard/` 하위에 다음 컴포넌트 생성:
  - `SidebarMenu.tsx`
  - `SummaryCards.tsx`
  - `RecentOrders.tsx`
  - `RecentProducts.tsx`
  - `ApprovalNotice.tsx`

## 작업 요청
1. `SellerDashboard.tsx`에서 위 컴포넌트를 조합해 UI를 완성하세요.
2. TailwindCSS 기반 반응형 UI로 구성하세요.
3. 실제 데이터를 아직 연동하지 않고 mock data로 처리해도 무방합니다.
4. 전체 컴포넌트가 조화롭게 배치되어 시각적으로 안정감 있게 구성되어야 합니다.
