# Task: 로그인된 사용자의 비밀번호 변경 기능

## 🎯 목적
로그인된 사용자가 현재 비밀번호를 확인한 후 새 비밀번호로 변경할 수 있도록 UI를 구성하고, Medusa의 API(`/store/customers/password`)와 연동한다.

---

## ✅ 구현할 기능

### 1. 비밀번호 변경 페이지 (`/profile/password`)
- 입력 필드:
  - 현재 비밀번호
  - 새 비밀번호
  - 새 비밀번호 확인
- "비밀번호 변경" 버튼 클릭 시 Medusa API 호출

### 2. API 연동
- `POST /store/customers/password`
- 요청 본문:
```json
{
  "old_password": "current-password",
  "new_password": "new-password"
}
```
- 요청 시 JWT 토큰을 Authorization 헤더에 포함
- 응답 성공 시 "비밀번호가 변경되었습니다" 메시지 출력
- 실패 시 에러 메시지 출력 (예: 현재 비밀번호 불일치)

---

## 🧩 기술 스택
- React + TailwindCSS
- 인증 처리: `AuthContext`의 JWT 사용
- API 호출: `apiFetch({ requireAuth: true })`

---

## 🧪 테스트 조건
- 올바른 현재 비밀번호 입력 시 변경 성공
- 새 비밀번호가 일치하지 않으면 경고 표시
- 인증 실패 또는 서버 오류 시 에러 메시지 출력

---

## 📌 향후 확장
- 비밀번호 찾기(이메일 인증 기반) 흐름 구현
- 메일 발송 연동 (SMTP 설정 필요)
- 관리자/판매자 비밀번호 변경 페이지 분리 구성

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-13-change-password.md`