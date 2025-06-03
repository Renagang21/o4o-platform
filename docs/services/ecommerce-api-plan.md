# Medusa 기반 커머스 API 설계 개요 (`ecommerce/api`)

이 문서는 o4o-platform의 커머스 기능을 담당할 Medusa 기반 API 서버(`services/ecommerce/api`)의 구조와 구현 계획을 설명합니다.

---

## 🧭 기본 개요

| 항목 | 내용 |
|------|------|
| 프레임워크 | Medusa.js (Node.js 기반 Headless 커머스 플랫폼) |
| 실행방식 | `medusa develop` 또는 `medusa start` |
| DB 연동 | PostgreSQL |
| 인증 방식 | JWT (초기 자체 구현 → 이후 OAuth2 연동 고려) |

---

## 🧱 주요 도메인 모델 (기본 제공)

- `Product`: 상품, 옵션, 가격, 상태 등
- `Region`: 배송 정책, 통화, 세금 등
- `Order`: 주문 상태, 결제, 발송 추적
- `Customer`: 사용자(소비자) 계정
- `Cart`: 장바구니 처리
- `Payment`, `Shipping`: 각종 결제 및 배송 전략

---

## 🧩 확장 및 커스터마이징 대상

| 영역 | 커스터마이징 내용 |
|------|------------------|
| 관리자 승인 | 상품 등록 후 관리자 승인 필요 여부 설정 |
| 사용자 역할 | `user`, `seller`, `admin`, `yaksa` 등 역할 기반 제한 |
| 상품 속성 | 판매자 유형별 속성 추가 (예: 약사 전용 카테고리) |
| 주문 승인 | 특정 조건부 주문 승인 로직 설정 (예: 의약품 등) |

---

## 🔌 예상 REST API 흐름

### 사용자

- `POST /auth/register`: 회원가입
- `POST /auth/login`: 로그인
- `GET /products`: 전체 상품 조회
- `GET /products/:id`: 상품 상세
- `POST /cart`: 장바구니 생성 및 상품 추가
- `POST /orders`: 주문 요청

### 판매자/관리자

- `POST /products`: 상품 등록 요청
- `PATCH /products/:id`: 상품 수정
- `POST /admin/products/approve`: 상품 승인
- `GET /admin/orders`: 주문 목록 확인
- `GET /admin/dashboard`: 통계용 요약 데이터

---

## 🗃 디렉터리 구조 예시

```
ecommerce/api/
├── medusa-config.js
├── medusa.js
├── src/
│   ├── services/         # 커스터마이징 서비스
│   ├── subscribers/      # 이벤트 리스너 (예: 주문 생성 후 알림)
│   ├── models/           # 사용자 정의 모델
│   └── routes/           # REST API 커스터마이징 라우트
```

---

## 📌 향후 고려사항

- 상품 승인 API는 `admin-token` 필요
- 주문 상태 커스터마이징 필요 (약품 등 특수 조건)
- 한국형 PG 연동 (Nice, KG이니시스 등) 수동 연동 필요
- 역할 기반 인증 통합 (`api-server`와 통합 고려)

