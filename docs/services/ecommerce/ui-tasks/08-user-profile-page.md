
# 🧾 Task 08: 사용자 프로필 페이지 (`/profile`) 구현

## 📌 목적
로그인한 사용자가 자신의 정보(이름, 이메일, 주소 등)를 확인하고 수정할 수 있는 프로필 페이지를 제공한다.

---

## ✅ 요구 기능

- 경로: `/profile`
- 표시 요소:
  - 이름, 이메일
  - 기본 배송지 정보 (주소, 전화번호 등)
  - 정보 수정 버튼 또는 인라인 수정 기능
- 초기 데이터: 로그인 후 `/store/customers/me` API로 불러옴
- 정보 수정: `POST /store/customers/me` 또는 `PUT /store/customers/me` 사용
- 인증 필요: 로그인하지 않은 사용자는 `/login`으로 리디렉션
- TailwindCSS 스타일 적용

---

## 🧱 구현 방식

- 페이지: `o4o-platform/services/ecommerce/web/src/pages/Profile.tsx`
- 상태 관리: `authStore.ts`의 사용자 정보 활용
- API 연동: Medusa Store API 사용
- 보호 라우트 적용 필요

---

## 🔗 참고 API

Medusa Store API:
- 현재 사용자 조회: `GET /store/customers/me`
- 사용자 정보 수정: `POST /store/customers/me`

---

## ⏭️ 다음 작업 연결

- Task-09: 사용자 주소 관리 (다중 배송지 선택 및 편집)
