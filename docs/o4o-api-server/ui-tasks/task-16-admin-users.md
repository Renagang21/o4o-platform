# Task: 관리자 계정 목록 및 추가/수정 기능 (권한 세분화)

## 🎯 목적
관리자 인증 기능을 확장하여, 복수의 관리자 계정을 관리하고 각 관리자에 대해 권한(Role)을 부여할 수 있는 UI 및 기능을 구성한다.  
초기에는 localStorage 기반으로 처리하고, 이후 Medusa Admin API 또는 별도 백엔드 연동을 고려한다.

---

## ✅ 구현할 기능 목록

### 1. 관리자 계정 목록 페이지 (`/admin/users`)
- 테이블로 전체 관리자 계정 표시
- 항목: 이메일, 이름, 역할(Role), 등록일
- "수정" 버튼 → 수정 페이지로 이동

### 2. 관리자 계정 추가 페이지 (`/admin/users/new`)
- 입력 항목: 이메일, 이름, 비밀번호, 역할(Role)
- 저장 시 localStorage 또는 별도 관리자 상태에 저장
- "추가 완료" 메시지 표시 및 목록으로 이동

### 3. 관리자 계정 수정 페이지 (`/admin/users/:id/edit`)
- 기존 정보 불러오기
- 이메일/이름/비밀번호/역할 수정 가능
- 저장 시 즉시 반영

---

## 📌 권한 역할(Role) 구조 예시
- superadmin: 전체 접근 가능
- manager: 주문/상품 관리 가능, 계정 관리 불가
- viewer: 읽기 전용

> (초기에는 드롭다운 선택만, 향후 보호 라우트에 반영 가능)

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: localStorage 또는 AdminContext 기반
- 추후 Medusa Admin API 또는 별도 DB로 확장 가능

---

## 🧪 테스트 조건
- 관리자 계정 목록이 정확히 출력되어야 함
- 계정 추가/수정 시 localStorage에 반영
- 각 계정의 역할 변경이 가능해야 함

---

## 📌 확장 계획
- Medusa Admin API 기반 관리자 관리 연동
- 관리자 활동 로그 기능
- 역할 기반 라우팅/보호 로직 적용

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-16-admin-users.md`