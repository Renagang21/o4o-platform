# Task: 상품 목록 및 상세 페이지 UI + 스토어 관리 화면

## 🎯 목적
관리자 또는 판매자가 Medusa API를 통해 등록된 상품 목록을 조회하고, 상세 정보를 확인할 수 있는 화면을 구성한다.  
추가로 스토어 관리 화면을 구성하여, 스토어 정보를 수정하거나 관리할 수 있는 UI도 설계한다.

---

## ✅ 구현할 기능 목록

### 1. 상품 목록 화면
- GET `/admin/products` 호출
- 제목, 가격, 상태를 테이블 형식으로 출력
- "상세 보기" 버튼 → 상품 상세 화면 이동

### 2. 상품 상세 화면
- GET `/admin/products/:id`
- 단일 상품 정보 표시: 이름, 설명, 가격, 이미지 등
- "수정" / "삭제" 버튼 구성 (API 연동은 선택 사항)

### 3. 스토어 관리 화면 (더미)
- 스토어 정보 표시 및 수정 입력 폼
- 스토어명, 대표자, 메모, 주소 등
- 연동 API는 아직 없음 (목업 기반)

---

## 🧩 기술 스택
- React + TailwindCSS
- Router 적용 필요 (`react-router-dom`)
- JWT 토큰 인증은 기존 Context 방식 유지

---

## 🧪 테스트 조건
- JWT가 localStorage에 있어야 함
- 상품 목록이 제대로 출력되는지 확인
- 없는 상품 ID로 접근 시 에러 핸들링

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-02-product-list-detail-store.md`