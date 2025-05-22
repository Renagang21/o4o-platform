# Task: 관리자 상품 목록 / 등록 / 수정 UI 및 Medusa 연동

## 🎯 목적
관리자가 전체 상품을 조회하고, 새로운 상품을 등록하거나 기존 상품을 수정할 수 있는 UI를 구성한다.  
모든 작업은 Medusa Admin API와 연동되며, 인증된 관리자만 접근 가능하도록 보호한다.

---

## ✅ 구현할 기능

### 1. 상품 목록 (`/admin/products`)
- API: `GET /admin/products`
- 관리자 JWT 포함 (localStorage: admin_jwt)
- 테이블 형식으로 상품명, 가격, 상태, 등록일 등을 표시
- "수정" 버튼 → 수정 페이지 이동
- "신규 등록" 버튼 → 등록 페이지 이동

### 2. 상품 등록 (`/admin/products/new`)
- 입력 항목: 상품명, 설명, 가격, 이미지 URL, 재고
- 저장 시 API: `POST /admin/products`
- 성공 시 목록으로 이동 또는 메시지 표시

### 3. 상품 수정 (`/admin/products/:id/edit`)
- API: `GET /admin/products/:id`, `POST /admin/products/:id`
- 기존 상품 정보 로딩 후 수정 가능
- 저장 시 API 요청 및 반영

---

## 🔐 인증 및 보호
- `AdminProtectedRoute` + `AdminRoleProtectedRoute role="manager"` 이상 적용
- 인증되지 않은 경우 `/admin/login`, 권한 미달 시 403

---

## 🧩 기술 스택
- React + TailwindCSS
- API 연동: fetch 또는 axios
- 인증: localStorage의 "admin_jwt" 포함

---

## 🧪 테스트 조건
- 상품 목록이 실제 Medusa 상품과 일치해야 함
- 상품 등록 시 새 상품이 목록에 표시되어야 함
- 수정 후 변경 내용이 반영되어야 함
- 인증/권한 미충족 시 라우팅 차단

---

## 📌 확장 계획
- 상품 삭제 기능 추가
- 카테고리/태그 필터링 UI 구성
- 상품 이미지 업로드 기능 구성 (medusa-file plugin 필요)

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-20-admin-product-management.md`