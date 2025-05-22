# Task-02: 상품 목록 / 상세 / 스토어 관리 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 상품 목록 화면 (`/products`)
- `/admin/products` API 호출
- 제목, 가격, 상태를 테이블로 표시
- "상세 보기" 버튼으로 상세 페이지로 이동

### 2. 상품 상세 페이지 (`/products/:id`)
- `/admin/products/:id` API 호출
- 이름, 설명, 가격, 이미지 표시
- "삭제" 버튼 → 실제 삭제 API 호출
- "수정" 버튼 → UI만 구현 (동작 미구현)

### 3. 스토어 관리 화면 (`/store`)
- 스토어명, 대표자, 메모, 주소 등 입력 필드 구성 (더미)
- 실제 저장 기능은 미구현

## 🔁 라우팅 및 네비게이션
- `react-router-dom` 기반 라우팅 구조 사용
- 상단 네비게이션으로 각 화면 간 이동 가능

## 🔐 JWT 인증
- `localStorage`의 `jwt` 키 값을 활용해 인증 유지
- 모든 API 요청 시 자동으로 Authorization 헤더 포함

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 브라우저 접속: [http://localhost:5173/products](http://localhost:5173/products)

## ⚠️ 추가 안내
- API 주소는 개발 환경에 따라 프록시 설정 또는 실제 주소로 교체 가능
- 존재하지 않는 상품 ID 접근 시 에러 메시지 출력
- 컴포넌트들은 모두 `src/components` 디렉토리에 구성

## 🖼️ UI 구성 예시
- 상품 목록 → 상세 페이지 전환 흐름
- 스토어 정보 입력 폼 (더미 UI)