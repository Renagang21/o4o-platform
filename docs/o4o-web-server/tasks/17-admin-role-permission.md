
# 🧾 Task 17: 운영자 역할 및 권한 시스템 구현

## 📌 목적
복수의 운영자가 존재하는 환경에서 역할 기반 접근 제어를 구현하여, 관리자 권한을 세분화하고 시스템 보안을 강화한다.

---

## ✅ 요구 역할 및 권한

### 기본 운영자 역할
- `superadmin`: 전체 시스템 접근 및 운영자 권한 부여 가능
- `manager`: 상품/주문/회원 관리 가능, 설정 제한
- `editor`: 상품 등록/수정 가능, 주문/회원/설정 접근 불가
- `viewer`: 읽기 전용 (모든 페이지 접근 가능, 수정 불가)

---

## ✅ 요구 기능

- 운영자 목록(`admin/users`)에서 역할 설정 UI
- 권한에 따라 관리자 메뉴 조건부 렌더링
- 권한 부족 시 `/403` 또는 안내 메시지 출력
- 각 페이지 단위로 접근 권한 검증

---

## 🧱 구현 방식

- 역할 정보 저장 위치:
  - 로그인 시 JWT 또는 API 응답에 포함된 역할 정보 저장
  - `adminAuthStore.ts`에 역할 필드 추가 (`role: 'superadmin' | 'manager' | ...`)
- 역할 기반 보호 컴포넌트:
  - `AdminRoleProtectedRoute` 컴포넌트 생성
  - 예: `<AdminRoleProtectedRoute roles={['superadmin', 'manager']}>...</AdminRoleProtectedRoute>`
- 메뉴 렌더링 조건 처리
- 수정 버튼 등 기능 단위 권한 분기 처리도 포함

---

## 💡 추가 구현 포인트

- 역할 필터를 통해 로그, 설정 페이지 등 제한
- 사용자 관리 테이블 내 권한 드롭다운 제공
- `superadmin`만 다른 운영자 역할 변경 가능

---

## 🔐 보안

- 모든 역할 정보는 서버 응답 기준으로만 사용
- 클라이언트 조작 불가하게 서버 권한 검증 반드시 포함

---

## ⏭️ 다음 작업 연결

- Task-18: 관리자 활동 감사 로그(행위 추적, 누가 무엇을 했는가)
