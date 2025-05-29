# Task 04 - Supplier Approval Flow

## 🎯 목적
공급자 등록 시 자동 승인이 아닌, 관리자가 수동으로 승인 여부를 결정하는 절차를 구현한다. 승인 전까지는 상품 등록 및 대시보드 접근이 제한된다.

---

## ✅ 작업 목표

- 공급자 등록 시 기본 상태는 `pending`
- 관리자가 승인하거나 거절할 수 있는 관리 UI 구현
- 승인 후 `supplier` 역할 부여
- 승인 상태에 따라 기능 제한

---

## 🏗️ 작업 구조

### 1. 등록 상태 관리

- `user_meta`에 공급자 상태 저장
  - 키: `supplier_status`
  - 값: `'pending' | 'approved' | 'rejected'`
- 등록 완료 후 자동으로 `pending` 상태 지정
- 상태에 따라 대시보드 접근 또는 상품 등록 제한

### 2. 관리자 승인 화면

- 관리자 메뉴 경로: `rena-multisupplier > 공급자 관리`
- 기능:
  - 모든 `supplier_status = pending` 사용자 조회
  - 승인 버튼 → 상태 변경: `approved` + 역할 변경
  - 거절 버튼 → 상태 변경: `rejected`
  - 승인/거절 시 사용자에게 알림 (이메일 또는 알림)

### 3. 상태별 UI 제한

- `pending`, `rejected` 상태일 경우:
  - `/supplier-dashboard` 접근 시 안내 메시지 표시
  - 상품 등록/수정 비활성화
- `approved` 상태일 경우:
  - 모든 공급자 기능 활성화

---

## 🔁 후속 연동 작업

- `01-supplier-role-and-registration.md`와 구조 통합
- 향후 승인 상태 변경 로그 저장 기능은 Task 06에서 다룸

---

## 📌 기타 참고

- 승인 작업 시 `update_user_meta()` 및 `wp_update_user()` 사용
- 역할 변경: `wp_update_user( ['ID' => $user_id, 'role' => 'supplier'] );`

