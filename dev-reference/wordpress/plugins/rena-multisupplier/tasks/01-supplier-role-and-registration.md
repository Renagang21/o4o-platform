# Task 01 - Supplier Role & Registration

## 🎯 목적
rena-multisupplier 플러그인에서 공급자가 WooCommerce 연동 상품을 등록할 수 있도록 하기 위해, 공급자 전용 사용자 역할 및 등록/승인 흐름을 정의한다.

---

## ✅ 작업 목표

- `supplier` 사용자 역할 정의
- 공급자 전용 등록 폼 제작 (프론트엔드)
- 관리자 승인 시스템 구축
- 승인 전에는 상품 등록 불가

---

## 🏗️ 작업 구조

### 1. 사용자 역할 정의

- 역할명: `supplier`
- 권한(capabilities):
  - read
  - edit_posts (자신의 상품 초안 작성 권한)
  - publish_posts (승인된 경우)
  - rename to: `manage_supplier_products` (커스텀 권한 생성)

### 2. 공급자 등록 절차

- `/register-supplier` 페이지에서 등록 폼 제공
- 입력 항목:
  - 상호명
  - 담당자명
  - 연락처
  - 이메일
  - 사업자번호 (선택)
- 등록 시 워드프레스 기본 사용자로 생성되며 `pending_supplier` 상태로 마킹
- 등록 완료 후 관리자 승인 대기

### 3. 관리자 승인 플로우

- `pending_supplier` 사용자 목록을 관리자 메뉴에서 확인 가능
- 승인 시 `supplier` 역할 부여 및 알림 발송

---

## 🔁 후속 연동 작업

- 승인된 공급자만 상품 등록 페이지 접근 가능
- WooCommerce REST API 연동은 이후 Task 03에서 정의

---

## 📌 기타 참고

- 등록/승인 상태는 user_meta 필드로 관리: `supplier_status = 'pending' | 'approved' | 'rejected'`
- 프론트엔드 화면은 `public/` 디렉토리에 별도 템플릿 구성 예정

