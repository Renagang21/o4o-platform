
# ✅ Test 02: 사용자 구매 흐름 테스트 체크리스트

## 🎯 목적
사용자가 상품을 탐색하고 장바구니 → 결제 → 주문 확인까지 구매 흐름이 자연스럽게 작동하는지 전반적인 테스트를 진행한다.

---

## 🧪 테스트 시나리오 체크리스트

### 1. 로그인 (선택)
- [ ] 로그인 없이도 상품 탐색이 가능한가?
- [ ] 로그인한 상태에서 장바구니와 주문이 정상 작동하는가?

### 2. 상품 목록 (`/shop`)
- [ ] 상품 카드가 로드되고 제목/가격/이미지가 보이는가?
- [ ] 상품 클릭 시 상세 페이지로 이동하는가?

### 3. 상품 상세 (`/product/:id`)
- [ ] 상품 상세 정보(설명, 가격, 썸네일)가 정상 출력되는가?
- [ ] "장바구니에 담기" 버튼이 정상 작동하는가?
- [ ] 담기 후 `/cart`로 이동되는가?

### 4. 장바구니 (`/cart`)
- [ ] 담은 상품이 목록에 표시되는가?
- [ ] 수량 조절 버튼이 동작하는가?
- [ ] 상품 삭제 버튼이 동작하는가?
- [ ] 총합 계산이 정확한가?
- [ ] "결제하기" 버튼 클릭 시 `/checkout`으로 이동되는가?

### 5. 결제 (`/checkout`)
- [ ] 배송지 정보 입력이 가능한가?
- [ ] 주문 완료 시 서버에 전송되며 `/order/confirmation`으로 이동되는가?

### 6. 주문 확인 (`/order/confirmation`)
- [ ] 주문 번호, 금액, 날짜가 표시되는가?
- [ ] "주문 내역 보기" 버튼이 작동하는가?

### 7. 주문 내역 (`/orders`, `/orders/:id`)
- [ ] 최근 주문 목록이 출력되는가?
- [ ] 클릭 시 주문 상세 정보가 출력되는가?

---

## 🛠️ 기타 테스트

- [ ] 새로고침 후 장바구니/주문 정보 유지 확인
- [ ] localStorage에서 사용자 토큰 확인 및 제거 시 로그아웃 반응

---

## ⏭️ 다음 문서

- `test-03-admin-panel-checklist.md` (관리자 기능 점검 시나리오)
