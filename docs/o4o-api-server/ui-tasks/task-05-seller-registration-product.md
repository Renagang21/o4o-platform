# Task: 판매자 등록 및 상품 관리 UI

## 🎯 목적
스토어 운영자(판매자)가 자신의 판매자 계정을 생성하고, 상품을 등록 및 관리할 수 있는 관리자 UI를 구성한다.  
판매자는 로그인 없이 더미 방식으로 처리하고, 상품 등록 시 localStorage 또는 상태 기반 저장을 사용한다.

---

## ✅ 구현할 기능 목록

### 1. 판매자 등록 화면 (`/seller/register`)
- 입력 항목: 이름, 이메일, 스토어명, 연락처 등
- 등록 완료 시 localStorage에 저장 (판매자 ID 생성)
- 이후 화면에서 판매자 인증된 것처럼 처리

### 2. 내 스토어 정보 화면 (`/seller/store`)
- 등록된 스토어 정보 조회 및 수정 UI
- 저장은 localStorage 기반 (실제 저장 API는 없음)
- 추후 API 연동 고려

### 3. 내 상품 목록 (`/seller/products`)
- 판매자가 등록한 상품 목록 표시
- 상품명, 가격, 등록일 등
- "수정" / "삭제" 버튼 포함 (삭제는 동작)

### 4. 상품 등록 화면 (`/seller/products/new`)
- 상품명, 설명, 가격, 재고, 이미지 URL 입력
- localStorage 또는 임시 상태 저장
- 등록 후 `/seller/products`로 이동

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: localStorage (판매자 및 상품)
- 경로 관리: `react-router-dom`

---

## 🧪 테스트 조건
- 판매자 등록 후 다른 화면 이동 가능해야 함
- 등록된 상품이 목록에 표시되어야 함
- 상품 삭제/추가 UI 동작 테스트

---

## 📌 확장 계획
- 판매자 인증 및 로그인 기능과 연동 예정
- Medusa 멀티스토어 API 연동 준비를 위한 기초 화면 구성

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-05-seller-registration-product.md`