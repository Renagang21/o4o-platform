# o4o-web-server 프론트엔드 개발 전달 문서

## 🎯 목적
이 문서는 현재까지 완료된 관리자 백엔드 기능 기반으로, 이제 사용자/판매자 중심의 프론트엔드 UI 개발을 `o4o-web-server`에서 이어가기 위한 안내 및 인수 문서입니다.  
프론트엔드는 실질적으로 다양한 사용자(소비자, 판매자, 참여자 등)가 접속하고 상호작용하는 핵심 인터페이스입니다.

---

## ✅ 현재까지의 작업 상황

### 1. 백엔드 (`o4o-api-server`) / 관리자 UI
- 관리자 상품/주문/계정 관리 기능: ✅ 완료
- 관리자 인증 및 역할 기반 보호: ✅ 적용
- Medusa Admin API 연동: ✅ 완료
- 경로: `services/ecommerce/admin`

---

## ⏭️ 다음 작업: `o4o-web-server`에서 프론트엔드 화면 구축

### 2. 사용자/판매자 중심 프론트 UI (개발 위치: `o4o-web-server`)
- 프레임워크: React (or Next.js 등 CSR 기반)
- API 연동: Medusa Store API (`/store/*`) + 백엔드 인증 포함

---

## 👥 주요 사용자 그룹

| 사용자 유형 | 설명 | 인증 수단 |
|-------------|------|------------|
| 고객 (user) | 상품 탐색, 장바구니, 결제, 주문 확인 | customer JWT |
| 판매자 (seller) | 상품 등록, 주문 처리, 정산 보기 등 | seller JWT |
| 관리자 (admin) | 이미 별도 admin UI에서 구현 완료 | admin JWT (별도 서버)

---

## 🛠️ 구현이 필요한 프론트 UI 예시

| 경로 | 설명 |
|------|------|
| `/shop` | 상품 목록 |
| `/product/:id` | 상품 상세 |
| `/cart`, `/checkout` | 장바구니 및 결제 |
| `/orders`, `/orders/:id` | 주문 목록 및 상세 |
| `/login`, `/register`, `/profile` | 사용자 인증 및 정보 수정 |
| `/seller/login`, `/seller/dashboard`, `/seller/products` | 판매자 전용 대시보드 |

---

## 🔐 인증 정책 요약

| 역할 | 토큰 | 저장소 |
|------|------|--------|
| 사용자 | customer JWT | localStorage (`jwt`) |
| 판매자 | seller JWT | localStorage (`seller_jwt`) |
| 관리자 | admin JWT | localStorage (`admin_jwt`) - 이미 별도 구현됨

---

## 📌 현재 구현된 사항 (참고용)

- 관리자 기능은 전체 구현 완료 상태
- 프론트엔드는 기본 구조만 존재하거나 아직 작업되지 않음
- Medusa API 연동은 준비 완료

---

## 📎 문서 기반 개발 흐름
- 문서 위치: `Coding/o4o-platform/docs/ui-tasks/`
- 각 기능별 Task 문서를 기반으로 구현 → 완료 시 Task-Result 문서로 정리됨

---

## ✅ 다음 시작점 제안 (o4o-web-server에서 Cursor에 요청)

> “Task-01: 사용자 상품 목록 `/shop`을 Medusa API와 연동해서 카드형 UI로 만들어줘. 로그인 없이 접근 가능하게 하고, Tailwind를 사용해 스타일도 적용해줘.”

---

이 문서를 o4o-web-server 작업 공간에 전달하고, 이후 UI 기반 프론트엔드 흐름을 이어가면 됩니다.