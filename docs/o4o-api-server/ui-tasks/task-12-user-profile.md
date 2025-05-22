# Task: 사용자 정보 조회 및 수정 기능 (/profile)

## 🎯 목적
로그인한 사용자가 자신의 계정 정보를 확인하고, 이름, 이메일, 주소 등 일부 정보를 수정할 수 있는 프로필 페이지를 구현한다.  
데이터는 Medusa의 고객 API(`/store/customers/me`)를 사용하여 실시간으로 조회 및 업데이트된다.

---

## ✅ 구현할 기능 목록

### 1. 프로필 정보 조회 (`GET /store/customers/me`)
- 페이지 진입 시 현재 로그인된 사용자의 정보 자동 조회
- 표시 항목: 이름, 이메일, 전화번호, 주소 등

### 2. 프로필 정보 수정 (`POST /store/customers/me`)
- 이름, 이메일, 전화번호 등 수정 가능한 입력 필드 제공
- 저장 버튼 클릭 시 Medusa API를 통해 정보 업데이트
- 성공/실패 메시지 표시

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리: `AuthProvider` (로그인된 사용자 정보 제공)
- API 연동: `apiFetch()`로 GET/POST 처리

---

## 🧪 테스트 조건
- `/profile` 접속 시 로그인된 사용자 정보가 자동 표시되어야 함
- 입력 필드 수정 후 저장하면 서버에 반영되어야 함
- 저장 성공 시 사용자 정보 다시 불러오기 또는 성공 메시지 표시
- 저장 실패 시 에러 알림 표시

---

## 📌 확장 계획
- 비밀번호 변경 기능 추가 (`POST /store/customers/password`)
- 배송지 주소 관리 페이지 연동
- 회원 탈퇴 기능 구성

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-12-user-profile.md`