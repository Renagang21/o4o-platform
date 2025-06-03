# 🧾 Task 04: 관리자 대시보드 통계 기능 구현 요청 (`admin.neture.co.kr`)

## 📌 목적

관리자가 한눈에 사이트의 운영 상태를 파악할 수 있도록 요약 통계를 보여주는 **대시보드 화면**을 구현합니다.

---

## ✅ 작업 위치 및 기준

- 도메인: `admin.neture.co.kr`
- 기준 폴더: `Coding/o4o-platform/services/main-site/src/pages/admin/`
- 신규 파일: `AdminDashboard.tsx`

> `ecommerce/admin/` 폴더에 이미 존재하는 `AdminDashboard.tsx`를 참고하여 구조 구성 가능

---

## 📊 구현할 통계 항목

### 1. 사용자 관련
- 전체 회원 수
- 승인된 약사 수 (`yaksa`)
- 관리자 수 (`admin`)
- 승인 대기 약사 수

### 2. 주문 / 활동 관련 (선택)
- 전체 주문 수 (ecommerce 참고 시)
- 오늘 가입한 사용자 수

---

## 🧱 UI 구성 요소

- 통계 카드 (숫자 + 설명)
- 아이콘 포함 (예: 유저, 체크, 시계 등)
- Tailwind 기반 반응형 UI
- 로딩/에러 상태 표시 포함

---

## 🔐 보호 기능

- `AdminProtectedRoute`를 사용하여 관리자만 접근 가능하도록 설정

---

## 📎 기타 고려사항

- 현재 통계 수치는 mock data 또는 JSON 기반 상태로 구성해도 무방
- 이후 API 연동을 고려하여 상태/props 기반 구조로 설계
- 클릭 시 상세 페이지 이동 기능은 후속 작업(Task)으로 분리 예정
