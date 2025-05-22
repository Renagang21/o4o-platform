# Task: 회원가입 및 로그인 기능의 Medusa API 연동

## 🎯 목적
현재 localStorage 기반으로 구성된 회원가입 및 로그인 기능을 Medusa의 고객(Customer) 인증 API와 연동하여 실제 사용자 인증 흐름을 구축한다.

---

## ✅ 연동 대상 기능 및 API

### 1. 회원가입 (`/register`)
- API: `POST /store/customers`
- 입력 항목: 이름, 이메일, 비밀번호
- 요청 성공 시 자동 로그인 및 토큰 저장
- 실패 시 중복 이메일 메시지 등 처리

### 2. 로그인 (`/login`)
- API: `POST /store/customers/auth`
- 입력 항목: 이메일, 비밀번호
- 요청 성공 시 JWT 토큰을 localStorage에 저장
- 이후 요청에 Authorization 헤더 포함
- 로그인 실패 시 오류 메시지 표시

---

## 🔐 인증 처리
- 로그인 성공 시 응답에서 JWT 토큰 추출
- `localStorage.setItem("jwt", token)` 저장
- 모든 API 요청에 자동 헤더 삽입
- 로그아웃 시 `localStorage.removeItem("jwt")` 처리

---

## 🧩 기술 스택
- React + TailwindCSS
- 인증 상태 전역 관리: `AuthProvider`, `useAuth()`
- fetch 또는 axios 기반 API 연동

---

## 🧪 테스트 조건
- 회원가입 성공 시 자동 로그인 처리
- 로그인 후 보호된 페이지(`/orders`, `/cart`) 접근 가능
- 로그인 실패 시 오류 알림 출력
- 로그아웃 시 인증된 페이지 접근 불가 및 `/login`으로 리디렉션

---

## 📌 확장 계획
- 사용자 정보 조회: `GET /store/customers/me`
- 비밀번호 변경, 탈퇴 기능 추가
- 관리자/판매자 인증 계정 체계로 확장

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-11-auth-api-integration.md`