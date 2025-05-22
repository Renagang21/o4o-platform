# Task: 비밀번호 찾기 및 재설정 기능 (이메일 발송 기반)

## 🎯 목적
이메일 주소를 통해 비밀번호 재설정 요청을 하고, 메일로 전달된 링크에서 새 비밀번호를 설정할 수 있도록 하는 전체 흐름을 구현한다.  
Medusa의 비밀번호 재설정 API 및 메일 발송 기능을 사용한다.

---

## ✅ 구현할 기능

### 1. 비밀번호 찾기 페이지 (`/forgot-password`)
- 사용자 이메일 입력
- API 호출: `POST /store/customers/password-token`
- 성공 시 "비밀번호 재설정 링크가 이메일로 전송되었습니다" 메시지 출력
- 실패 시 오류 메시지 출력

### 2. 비밀번호 재설정 페이지 (`/reset-password/:token`)
- 토큰을 URL 파라미터에서 추출 (`useParams`)
- 입력 필드: 새 비밀번호, 비밀번호 확인
- API 호출: `POST /store/customers/reset-password`
```json
{
  "token": "<token-from-url>",
  "password": "<new-password>"
}
```
- 성공 시 "비밀번호가 변경되었습니다" 메시지 출력 및 `/login`으로 이동
- 실패 시 오류 메시지 출력

---

## 📩 메일 발송 전제 조건
- Medusa 백엔드의 `.env`에 SMTP 메일 서버 설정 필요
  - 예: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- `/store/customers/password-token` 호출 시 Medusa가 이메일 전송 처리

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리 없음 (비회원 흐름)
- API 호출: `fetch` 또는 `apiFetch()` (비인증)

---

## 🧪 테스트 조건
- 유효한 이메일 입력 시 "메일 전송 완료" 메시지 출력
- 잘못된 토큰으로 접근 시 오류 메시지 출력
- 새 비밀번호 입력 성공 시 로그인 가능 여부 확인

---

## 📌 확장 계획
- 메일 템플릿 커스터마이징 (Medusa backend)
- 이메일 인증 기반 회원가입 전환
- OTP 기반 추가 인증 보완

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-14-forgot-password.md`