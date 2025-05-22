# Task: Medusa 백엔드 API 연동 시작

## 🎯 목적
현재 localStorage 기반으로 구현된 상품, 주문, 사용자 기능을 Medusa의 백엔드 REST API와 연동하여 실제 전자상거래 플랫폼 데이터 기반으로 전환한다.

---

## ✅ 연동 대상 기능 및 API

### 1. 상품 목록 및 상세
- `/shop` → `GET /store/products`
- `/product/:id` → `GET /store/products/:id`

### 2. 주문 생성
- `/checkout/confirm` → `POST /store/orders`
- 사용자 정보 포함 필요 (JWT 기반 인증 또는 guest 주문)

### 3. 주문 목록 및 상세
- `/orders` → `GET /store/orders`
- `/orders/:id` → `GET /store/orders/:id`
- 인증된 사용자 전용

### 4. 사용자 인증
- `/register` → `POST /store/customers`
- `/login` → `POST /store/customers/auth`
- 로그인 시 JWT 토큰을 localStorage에 저장, 이후 모든 요청에 Authorization 헤더 포함

---

## 🧩 기술 스택
- REST API: `fetch` 또는 `axios`
- 인증 처리: JWT + localStorage
- 에러 핸들링: 인증 실패 시 `/login` 리디렉션

---

## 🧪 테스트 조건
- 상품 목록과 상세가 실제 Medusa 상품과 동기화되어야 함
- 주문 생성 시 실제 백엔드에 주문이 저장되어야 함
- 로그인한 사용자만 주문 내역 확인 가능해야 함
- API 에러 시 fallback 메시지 출력

---

## 📌 확장 계획
- 관리자/판매자 기능 연동을 위한 Admin API 확장
- Medusa 이벤트 기반 주문 처리 흐름 구성
- 실제 PG 연동 및 결제 상태 처리 전환

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-10-medusa-api-integration.md`