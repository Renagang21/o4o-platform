# Task-05: 판매자 등록 및 상품 관리 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 판매자 등록 (`/seller/register`)
- 이름, 이메일, 스토어명, 연락처 입력 폼
- 등록 정보는 localStorage에 저장
- 별도 인증 없이 더미 방식으로 판매자 등록 처리

### 2. 내 스토어 정보 (`/seller/store`)
- 등록한 스토어 정보 확인 및 수정 가능
- 수정 내용은 localStorage에 즉시 반영

### 3. 내 상품 목록 (`/seller/products`)
- 판매자가 등록한 상품 리스트를 테이블로 표시
- 상품명, 가격, 등록일 확인 가능
- 상품 삭제 기능 포함

### 4. 상품 등록 (`/seller/products/new`)
- 상품명, 설명, 가격, 재고, 이미지 URL 입력
- 등록 시 localStorage에 저장되고, 목록으로 리디렉션

## 🔁 상태 관리
- 모든 데이터는 localStorage 기반
- 판매자 로그인 없이, 브라우저 단에서 관리되는 상태로 구현됨

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 접속: [http://localhost:5173/seller/register](http://localhost:5173/seller/register)

## 📌 추가 안내
- 이 플로우는 추후 Medusa 멀티스토어 기능과 연동하기 위한 기초 구성입니다
- 디자인, 사용자 경험 개선, 로그인 기능 연동 등 추가 확장이 가능합니다
- 관련 컴포넌트는 모두 `src/components` 하위에 구성됨