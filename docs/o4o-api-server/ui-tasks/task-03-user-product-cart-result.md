# Task-03: 사용자 상품 탐색 / 장바구니 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 사용자 상품 목록 (`/shop`)
- 카드 형태 UI로 상품 표시
- 이름, 가격, 이미지 노출
- 상세 페이지 및 장바구니 담기 기능 포함

### 2. 상품 상세 페이지 (`/product/:id`)
- 상품 이름, 설명, 가격, 이미지 상세 표시
- 수량 선택 가능
- "장바구니 담기" 버튼

### 3. 장바구니 페이지 (`/cart`)
- localStorage 기반 장바구니 관리
- 항목 목록, 수량 증가/감소, 삭제, 장바구니 비우기
- 총합계 표시
- "주문하기" 버튼 (더미 기능)

## 🔁 상태 관리
- `CartProvider`를 통해 전역 장바구니 상태 관리
- 새로고침 후에도 상태 유지 (localStorage 저장 기반)

## 🧭 라우팅 및 네비게이션
- `react-router-dom` 사용
- 상단 네비게이션에서 사용자 화면 및 관리자 화면 모두 이동 가능

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 접속: [http://localhost:5173/shop](http://localhost:5173/shop)

## 📝 기타 안내
- 디자인 개선, 에러 처리, API 연동 방식 변경 등 추가 요청 가능
- 컴포넌트 구성은 `src/components` 하위에 위치