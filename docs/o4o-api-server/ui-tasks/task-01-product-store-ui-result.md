# Task-01: 관리자 상품/재고 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

| 기능 | 설명 |
|------|------|
| JWT 인증 Context | localStorage의 jwt 토큰을 자동으로 읽고 API 요청에 Authorization 헤더 추가 |
| 상품 등록 폼 | 상품명, 설명, 가격 입력 후 `/admin/products`로 POST 요청 |
| 재고 목록 조회 | `/admin/inventory-items`로 GET 요청하여 재고 리스트 표시 |
| 스토어 구성 UI (더미) | 스토어명, 메모 입력 필드 제공, 연동은 미구현 |
| TailwindCSS 적용 | 버튼, input 등 기본 스타일 적용 및 커스텀 유틸리티 클래스 포함 |

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 접속: [http://localhost:5173](http://localhost:5173)
- JWT 토큰 필요: localStorage에 `jwt` 키로 토큰 저장 필수

```js
localStorage.setItem("jwt", "<your_token_here>");
```

## ⚠️ 주의사항
- API 경로는 프록시 또는 실제 서버 주소로 교체 가능
- 인증이 없으면 `"로그인이 필요합니다."` 메시지 표시
- 컴포넌트는 `src/components`에 위치

## 🖼️ UI 확인 (예시)
![screenshot](../screenshots/task-01-ui-preview.png)