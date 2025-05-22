# Task: 판매자 전용 프론트엔드 설계 시작

## 🎯 목적
관리자와 사용자 UI와는 별도로, 판매자 전용 인터페이스를 제공하여 판매자가 자신의 상품, 주문, 정산 정보를 직접 관리할 수 있는 환경을 구축한다.

---

## ✅ 1단계 구현 목표

### 1. 판매자 로그인/회원가입 (더미 기반)
- `/seller/login`: 이메일/비밀번호 입력 → localStorage에 판매자 토큰 저장
- `/seller/register`: 이름, 이메일, 비밀번호 입력 → 더미 계정 생성
- 토큰 예시: `"seller_jwt"` 또는 `"seller_email"`

### 2. 판매자 인증 상태 관리
- `SellerAuthContext` 생성
- 로그인/로그아웃/판매자 상태 전역 제공
- 보호 라우트 `SellerProtectedRoute` 구성

### 3. 기본 대시보드 (`/seller/dashboard`)
- 로그인 후 진입 가능한 판매자 홈
- 예시 UI: 총 상품 수, 총 주문 수, 최근 주문 등

### 4. 네비게이션 구성
- 상단 바 또는 사이드 메뉴에 판매자 메뉴 노출
- 로그인 상태에 따라 메뉴 동적 전환

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리: Context API (`SellerAuthContext`)
- 인증 저장소: localStorage (`seller_jwt` or `seller_email`)
- 라우팅 보호: `react-router-dom` + `SellerProtectedRoute`

---

## 🧪 테스트 조건
- `/seller/*` 경로는 로그인하지 않으면 `/seller/login`으로 리디렉션
- 로그인 성공 시 대시보드 진입 가능
- 로그아웃 시 모든 판매자 페이지 접근 차단

---

## 📌 확장 계획
- `/seller/products`: 판매자 상품 목록 및 등록
- `/seller/orders`: 판매자 주문 현황
- `/seller/settlement`: 판매자 정산 내역
- Medusa API 연동 시 판매자 전용 필터 적용

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin` 또는 `services/ecommerce/seller`
- 문서 위치: `docs/ui-tasks/task-19-seller-frontend.md`