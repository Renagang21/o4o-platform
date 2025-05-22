# Task: 사용자 상품 목록 / 상세 / 장바구니 UI 구성

## 🎯 목적
최종 사용자(구매자)가 상품을 탐색하고 장바구니에 담을 수 있는 쇼핑몰 기본 UI를 구현한다.  
로그인 없이 접근 가능하며, 장바구니는 localStorage에 저장된다.

---

## ✅ 구현할 기능 목록

### 1. 사용자 상품 목록 화면 (`/shop`)
- GET `/store/products` 또는 `/products` API 호출
- 카드 형태의 상품 타일 UI
- 이름, 가격, 썸네일 표시
- 클릭 시 상세 페이지 이동

### 2. 상품 상세 화면 (`/product/:id`)
- GET `/products/:id`
- 이름, 설명, 가격, 이미지 등 표시
- "장바구니 담기" 버튼
- 수량 선택 가능

### 3. 장바구니 화면 (`/cart`)
- localStorage에 저장된 장바구니 상태 기반
- 상품 이름, 수량, 가격, 총합계 표시
- 수량 증가/감소, 삭제 기능 포함
- "주문하기" 버튼 (미구현, 더미로 둠)

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: localStorage
- 경로 관리: `react-router-dom`

---

## 🧪 테스트 조건
- 장바구니 추가 후 `/cart`에서 정상적으로 확인 가능
- 새로고침 후에도 장바구니 유지
- API 주소는 백엔드와 연동 가능하도록 유연하게 설계

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-03-user-product-cart.md`