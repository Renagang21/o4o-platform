# 🧾 Task 03: 관리자용 약사 승인 기능 구현 요청 (`admin.neture.co.kr`)

## 📌 목적

neture.co.kr에 가입한 약사 계정은 승인을 거쳐야만 역할(`yaksa`)로 확정됩니다.  
이를 위해 관리자만 접근 가능한 승인 화면을 별도 서브도메인(`admin.neture.co.kr`)에서 제공합니다.

---

## ✅ 대상 도메인 및 위치

- 운영 도메인: `admin.neture.co.kr`
- 기준 폴더: `Coding/o4o-platform/services/main-site/src/pages/admin/`

> 현재 약사 승인 관련 파일은 일부 존재:
> - `YaksaApprovalList.tsx`
> - `YaksaApprovalDetail.tsx`

---

## ✅ 구현할 기능 목록

### 1. 승인 목록 페이지 (`YaksaApprovalList.tsx`)
- 대기 중인 약사 회원 목록 조회
- 검색(이름/이메일/전화번호), 필터링(대기/승인됨 등)
- 목록 항목 클릭 시 상세 페이지로 이동

### 2. 승인 상세 페이지 (`YaksaApprovalDetail.tsx`)
- 가입 정보, 면허번호, 전화번호 표시
- 승인 / 반려 버튼
- 승인 시 사용자 역할을 `yaksa`로 업데이트
- 반려 시 상태 변경 또는 삭제

---

## 🔐 보호 기능

- 이 페이지들은 `AdminProtectedRoute` 또는 `RoleProtectedRoute`로 보호되어야 하며,
- 일반 사용자 또는 미승인 약사는 접근 불가

---

## 🗂️ 참고 구성 예시 (ecommerce 관리자 구조 기반)

- `AdminProtectedRoute.tsx` → 보호 컴포넌트
- `AdminUserList.tsx` / `AdminUserEdit.tsx` 참고
- Context API 또는 React Query로 승인 처리 API 연동

---

## 📎 기타 요구 사항

- 승인 완료 후 토스트 메시지 및 목록 리디렉션 처리
- 에러/로딩 처리 UI 포함
- 관리자 페이지 디자인은 공용 스타일 사용
