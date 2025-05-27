# 📘 O4O Platform 전체 문서 통합본

> 이 문서는 `docs/` 폴더 내의 모든 `.md` 파일을 주제별로 병합한 통합 문서입니다.


---

## 📄 o4o-api-server/01-project-overview.md

<!-- From: o4o-api-server/01-project-overview.md -->

# o4o-platform 프로젝트 개요

- 목적: Medusa 기반의 O4O 전자상거래 플랫폼 구축
- 주요 기능: 상품 등록, 재고 관리, 멀티스토어, 관리자 인증, API 연동 등
- 현재 진행: 관리자 UI 설정 완료, 인증 모듈 연동 중


---

## 📄 o4o-api-server/02-server-setup.md

<!-- From: o4o-api-server/02-server-setup.md -->

# 서버 환경 구축 요약

- AWS Lightsail 사용
- API 서버: o4o-api-server
- 기본 포트: 9000 (Medusa)
- PM2로 프로세스 관리, Redis/PG 설정 완료


---

## 📄 o4o-api-server/03-admin-user-setup.md

<!-- From: o4o-api-server/03-admin-user-setup.md -->

# 관리자 계정 수동 삽입

- `user` 테이블에 직접 삽입 (id, email 등)
- `auth_identity` 테이블에 bcrypt hash 사용한 비밀번호 등록
- 기본 이메일: admin@example.com


---

## 📄 o4o-api-server/04-auth-module-config.md

<!-- From: o4o-api-server/04-auth-module-config.md -->

# 인증 모듈 구성 (medusa-config.js)

- @medusajs/auth 설치
- AUTH 설정에 DB URL 포함 필요
- 누락된 cache 모듈로 인한 에러 해결


---

## 📄 o4o-api-server/05-env-and-config-reference.md

<!-- From: o4o-api-server/05-env-and-config-reference.md -->

# .env 및 설정 파일 정리

```
DATABASE_URL=...
REDIS_URL=...
AUTHENTICATION_DATABASE_URL=...
```
- medusa-config.js에서 이들 참조하여 구성


---

## 📄 o4o-api-server/06-api-task-guide.md

<!-- From: o4o-api-server/06-api-task-guide.md -->

# 1번 업무: 상품/재고/스토어 등록 및 API 확인 가이드

## 1. 상품 등록
- POST /admin/products

## 2. 재고 확인
- GET /admin/inventory-items

## 3. 인증 테스트
- 로그인 후 Bearer Token으로 요청


---

## 📄 o4o-api-server/07-troubleshooting-log.md

<!-- From: o4o-api-server/07-troubleshooting-log.md -->

# 주요 트러블슈팅 정리

- 인증 모듈 설치 시 `cache` 미등록 문제 발생
- `.env`에서 특수문자 인코딩 (`!` → `%21`)
- Postgres 인증 실패 원인: 비밀번호 오입력 또는 DB 미반영


---

## 📄 o4o-api-server/08-medusa-cli-reference.md

<!-- From: o4o-api-server/08-medusa-cli-reference.md -->

# Medusa CLI 명령어 정리

- `medusa user -e -p`: 사용자 생성
- `yarn medusa db:migrate`: 마이그레이션
- `pm2 start yarn --name medusa-api -- dev`: 서비스 실행


---

## 📄 o4o-api-server/09-mcp-and-context-config.md

<!-- From: o4o-api-server/09-mcp-and-context-config.md -->

# MCP 및 Context7 설정 정리

- TaskMaster 연동 필요
- context7 도입 예정
- MCP에서 auth, config, schema, task 전부 설정 가능해야 함


---

## 📄 o4o-api-server/10-deployment-checklist.md

<!-- From: o4o-api-server/10-deployment-checklist.md -->

# 배포 점검 체크리스트

- [x] pm2 실행 상태 확인
- [x] Redis 연결 확인 (`redis-cli ping`)
- [x] Postgres 비밀번호 일치 여부 확인
- [ ] 관리자 계정 로그인 테스트 완료


---

## 📄 o4o-api-server/ui-tasks/task-01-product-store-ui-result.md

<!-- From: o4o-api-server/ui-tasks/task-01-product-store-ui-result.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-01-product-store-ui.md

<!-- From: o4o-api-server/ui-tasks/task-01-product-store-ui.md -->

# Task: 상품 등록 및 스토어 구성 UI 개발

## 📂 작업 범위
- 개발 환경: `o4o-platform`
- 문서 위치: `docs/o4o-api-server/02~06.md` 기반
- 작업 요청 위치: `docs/ui-tasks/task-01-product-store-ui.md`

## 🎯 목적
Medusa 기반 o4o-platform에서 관리자용 상품/재고 등록 화면을 React로 개발하고자 한다. Backend API는 이미 구축되어 있으며 인증은 JWT 방식이다.

## 📌 참고 문서
- `o4o-api-server/02-server-setup.md`: Medusa 서버 설정 및 포트 정보
- `o4o-api-server/03-admin-user-setup.md`: 관리자 계정 수동 생성 방식
- `o4o-api-server/04-auth-module-config.md`: 인증 모듈 설정
- `o4o-api-server/05-env-and-config-reference.md`: .env 설정 값
- `o4o-api-server/06-api-task-guide.md`: 상품/재고 관련 API 가이드

## ✅ 구현 대상 기능

### 1. 상품 등록 폼
- 입력 항목: 상품명, 설명, 가격
- 전송: POST `/admin/products`
- 인증: JWT 토큰 필요 (`Authorization: Bearer ...`)
- 개발 도구: React + TailwindCSS

### 2. 재고 목록 조회
- API: GET `/admin/inventory-items`
- 결과 테이블 표시
- 인증 필수

### 3. 스토어 구성 화면 (더미 UI만)
- 스토어명, 메모 입력 필드
- 실제 연동은 추후 예정

## 🧪 테스트 조건
- JWT는 localStorage에서 불러와 자동 헤더 설정
- 인증되지 않은 경우 로그인 요구 문구 출력
- API 응답은 콘솔 출력

## 💡 기타
- 상태 관리는 간단한 Context 또는 useState 사용
- 이 UI는 관리자 전용 화면임
- 컴포넌트 분리는 자유롭게 해도 무방

---

요청:

**"위 내용을 기반으로 React + Tailwind로 두 개의 화면(상품 등록, 재고 확인)을 만들어줘. JWT 인증 포함하고 API 요청은 medusa 기본 관리자 API에 맞춰줘."**


---

## 📄 o4o-api-server/ui-tasks/task-02-product-list-detail-store-result.md

<!-- From: o4o-api-server/ui-tasks/task-02-product-list-detail-store-result.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-02-product-list-detail-store.md

<!-- From: o4o-api-server/ui-tasks/task-02-product-list-detail-store.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-03-user-product-cart-result.md

<!-- From: o4o-api-server/ui-tasks/task-03-user-product-cart-result.md -->

# Task-03: 사용자 상품 탐색 / 장바구니 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 사용자 상품 목록 (`/shop`)
- 카드 형태 UI로 상품 표시
- 이름, 가격, 이미지 노출
- 상세 페이지 및 장바구니 담기 기능 포함

### 2. 상품 상세 페이지 (`/product/:id`)
- 상품 이름, 설명, 가격, 이미지 상세 표시
- 수량 선택 가능
- "장바구니 담기" 버튼

### 3. 장바구니 페이지 (`/cart`)
- localStorage 기반 장바구니 관리
- 항목 목록, 수량 증가/감소, 삭제, 장바구니 비우기
- 총합계 표시
- "주문하기" 버튼 (더미 기능)

## 🔁 상태 관리
- `CartProvider`를 통해 전역 장바구니 상태 관리
- 새로고침 후에도 상태 유지 (localStorage 저장 기반)

## 🧭 라우팅 및 네비게이션
- `react-router-dom` 사용
- 상단 네비게이션에서 사용자 화면 및 관리자 화면 모두 이동 가능

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 접속: [http://localhost:5173/shop](http://localhost:5173/shop)

## 📝 기타 안내
- 디자인 개선, 에러 처리, API 연동 방식 변경 등 추가 요청 가능
- 컴포넌트 구성은 `src/components` 하위에 위치

---

## 📄 o4o-api-server/ui-tasks/task-03-user-product-cart.md

<!-- From: o4o-api-server/ui-tasks/task-03-user-product-cart.md -->

# Task: 사용자 상품 목록 / 상세 / 장바구니 UI 구성

## 🎯 목적
최종 사용자(구매자)가 상품을 탐색하고 장바구니에 담을 수 있는 쇼핑몰 기본 UI를 구현한다.  
로그인 없이 접근 가능하며, 장바구니는 localStorage에 저장된다.

---

## ✅ 구현할 기능 목록

### 1. 사용자 상품 목록 화면 (`/shop`)
- GET `/store/products` 또는 `/products` API 호출
- 카드 형태의 상품 타일 UI
- 이름, 가격, 썸네일 표시
- 클릭 시 상세 페이지 이동

### 2. 상품 상세 화면 (`/product/:id`)
- GET `/products/:id`
- 이름, 설명, 가격, 이미지 등 표시
- "장바구니 담기" 버튼
- 수량 선택 가능

### 3. 장바구니 화면 (`/cart`)
- localStorage에 저장된 장바구니 상태 기반
- 상품 이름, 수량, 가격, 총합계 표시
- 수량 증가/감소, 삭제 기능 포함
- "주문하기" 버튼 (미구현, 더미로 둠)

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: localStorage
- 경로 관리: `react-router-dom`

---

## 🧪 테스트 조건
- 장바구니 추가 후 `/cart`에서 정상적으로 확인 가능
- 새로고침 후에도 장바구니 유지
- API 주소는 백엔드와 연동 가능하도록 유연하게 설계

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-03-user-product-cart.md`

---

## 📄 o4o-api-server/ui-tasks/task-04-user-checkout-orders-result.md

<!-- From: o4o-api-server/ui-tasks/task-04-user-checkout-orders-result.md -->

# Task-04: 사용자 주문 생성 및 주문 목록 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 주문 생성 페이지 (`/checkout`)
- localStorage 기반 장바구니에서 주문 데이터 생성
- 입력 필드: 이름, 연락처, 주소, 메모
- "주문하기" 버튼 클릭 시 localStorage에 주문 저장
- 주문 완료 후 `/orders` 페이지로 이동

### 2. 주문 목록 페이지 (`/orders`)
- localStorage에 저장된 주문 목록 조회
- 주문 항목: 상품명, 수량, 총합계, 주문일시
- 최신 주문이 상단에 노출됨
- 주문이 없는 경우 "주문 내역이 없습니다" 메시지 표시

## 🔁 상태 관리
- `OrderProvider`를 사용하여 전역 상태로 주문 내역 관리

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 접속: [http://localhost:5173/checkout](http://localhost:5173/checkout)

## 📝 기타 안내
- 주문 정보는 localStorage 기반으로 저장되어 새로고침에도 유지됨
- 추후 실제 주문 API 및 결제 연동이 가능하도록 구조 설계됨
- 컴포넌트들은 `src/components` 및 `src/providers` 하위에 위치

---

## 📄 o4o-api-server/ui-tasks/task-04-user-checkout-orders.md

<!-- From: o4o-api-server/ui-tasks/task-04-user-checkout-orders.md -->

# Task: 사용자 주문 생성 및 주문 목록 확인 UI

## 🎯 목적
사용자가 장바구니에 담은 상품을 주문으로 전환하고, 주문 내역을 확인할 수 있는 UI를 구현한다.  
실제 결제(PG)는 추후 연동 예정이며, 현재는 더미 처리 기반으로 구현한다.

---

## ✅ 구현할 기능 목록

### 1. 주문 페이지 (`/checkout`)
- localStorage의 장바구니 데이터를 기반으로 주문 생성
- 입력 필드: 이름, 연락처, 주소, 메모
- "주문하기" 버튼 클릭 시 주문 정보 localStorage에 저장 또는 Medusa API로 전송
- 주문 완료 시 `/orders`로 이동

### 2. 주문 목록 페이지 (`/orders`)
- localStorage에 저장된 주문 목록을 테이블로 출력
- 상품명, 수량, 총합계, 주문일시 표시
- 최신 주문이 위로 정렬

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: localStorage
- Router: `react-router-dom`

---

## 🧪 테스트 조건
- 장바구니에서 `/checkout`으로 이동 가능해야 함
- 주문 후 새로고침해도 `/orders`에 기록이 남아야 함
- 빈 주문 목록일 경우 "주문 내역이 없습니다" 메시지 출력

---

## 📌 확장 계획
- 향후 Medusa 주문 API 연동으로 실제 주문 데이터와 연결
- PG사 결제 연동 전, 내부 주문 흐름 테스트 목적

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-04-user-checkout-orders.md`

---

## 📄 o4o-api-server/ui-tasks/task-05-seller-registration-product-result.md

<!-- From: o4o-api-server/ui-tasks/task-05-seller-registration-product-result.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-05-seller-registration-product.md

<!-- From: o4o-api-server/ui-tasks/task-05-seller-registration-product.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-06-auth-login-register-result.md

<!-- From: o4o-api-server/ui-tasks/task-06-auth-login-register-result.md -->

# Task-06: 사용자 및 판매자 로그인 / 회원가입 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 회원가입 및 로그인
- `/register`: 사용자 또는 판매자 회원가입 (이름, 이메일, 비밀번호 등 입력)
- `/login`: 로그인 후 localStorage에 사용자 정보 저장
- 역할 구분 필드 포함 (user / seller)

### 2. 인증 상태 관리
- `AuthProvider`로 전역 인증 상태 관리
- `useAuth()` 훅을 통해 로그인 여부, 사용자 정보 접근 가능
- 로그인 시 자동 리디렉션, 로그아웃 기능 포함

### 3. 보호 라우트 적용
- 장바구니(`/cart`), 주문(`/orders`), 판매자 화면(`/seller/*`) 등 인증이 필요한 경로에 `ProtectedRoute` 적용
- 로그인하지 않은 사용자가 접근 시 `/login`으로 자동 이동

## 🔐 인증 흐름
- 인증 정보는 localStorage 기반 저장
- 로그인 상태 유지 (새로고침 후에도 유지됨)
- 로그인 실패/성공 여부 처리 및 리디렉션 구현

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 주요 경로 예시:
  - `/login`
  - `/register`
  - `/cart` (인증 필요)
  - `/orders` (인증 필요)
  - `/seller/store` (인증 필요)

## 📌 향후 확장 가능 항목
- Medusa의 인증 API(`@medusajs/auth`)로 연동 전환
- JWT 기반 보안 강화
- 관리자 인증 도입 및 접근 권한 세분화

## 🗂️ 주요 컴포넌트 위치
- `src/components/Auth/`
- `src/providers/AuthProvider.tsx`
- `src/routes/ProtectedRoute.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-06-auth-login-register.md

<!-- From: o4o-api-server/ui-tasks/task-06-auth-login-register.md -->

# Task: 사용자 및 판매자 로그인 / 회원가입 UI 구성

## 🎯 목적
사용자 또는 판매자가 로그인하여 각자의 데이터를 안전하게 사용할 수 있도록 인증 UI를 구성한다.  
초기 구현은 localStorage 기반 인증 처리이며, 추후 실제 인증 API(Medusa @medusajs/auth 등)로 확장 가능하다.

---

## ✅ 구현할 기능 목록

### 1. 회원가입 화면 (`/register`)
- 입력 필드:
  - 사용자용: 이름, 이메일, 비밀번호
  - 판매자용: 이름, 이메일, 비밀번호, 스토어명
- 역할(사용자 / 판매자) 선택 필드 포함
- 등록 후 localStorage에 사용자 정보 저장
- 자동 로그인 및 홈 리디렉션 처리

### 2. 로그인 화면 (`/login`)
- 입력 필드: 이메일, 비밀번호
- localStorage 기반 사용자 검색 및 비교
- 성공 시 사용자 정보를 localStorage에 저장하고 대시보드로 이동
- 실패 시 오류 메시지 표시

---

## ✅ 인증 상태 관리
- `AuthProvider` 또는 `useAuth()` 훅 구현
- 전역 인증 상태 제공 (로그인 여부, 사용자 정보, 역할 등)
- 로그인 후 접근 가능한 경로 제한 처리
  - 예: `/cart`, `/orders`, `/seller/*` 등 인증 필요 경로 보호

---

## 🧪 테스트 조건
- 회원가입 후 즉시 로그인되어야 함
- 로그인 성공 시 페이지 리디렉션 확인
- 인증되지 않은 사용자는 보호된 페이지 접근 시 `/login`으로 이동
- localStorage에서 사용자 정보 및 로그인 상태 유지

---

## 📌 확장 계획
- 추후 Medusa의 인증 플러그인(`@medusajs/auth`) 연동
- JWT 기반 인증 처리 및 서버 연동으로 보안 강화
- 관리자 로그인 기능 추가 고려

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-06-auth-login-register.md`

---

## 📄 o4o-api-server/ui-tasks/task-07-payment-confirm-result.md

<!-- From: o4o-api-server/ui-tasks/task-07-payment-confirm-result.md -->

# Task-07: 결제 및 주문 확정 처리 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. CheckoutConfirm 페이지 (`/checkout/confirm`)
- 결제 수단 선택 (더미 방식)
- 주문 정보 요약 출력 (상품명, 수량, 금액 등)
- "결제하기" 버튼 → 주문 저장
- 주문 완료 후 `/orders` 페이지로 이동

### 2. 주문 확정 처리
- `OrderContext.tsx`에서 주문에 `status` 및 `paymentMethod` 필드 포함
- `addOrder()` 함수로 주문 생성 시 "결제 완료" 상태 저장
- 주문 목록(`/orders`)에 상태 및 결제수단 표시

## 🔁 상태 관리
- 주문 데이터는 `OrderProvider`를 통해 전역 상태로 관리
- 주문 생성 후에도 localStorage에 저장되어 새로고침 시 유지됨

## ❗ IDE 오류 관련 대응
- VSCode 또는 일부 TypeScript Linter에서 `Cannot find module './components/CheckoutConfirm'` 오류 발생
- 확인사항:
  - `CheckoutConfirm.tsx` 파일명 대소문자 정확히 일치 여부
  - import 경로 오류 (`./components/CheckoutConfirm` ← 철자 점검)
  - IDE 캐시 재빌드 필요 (`.next`, `dist`, `.cache` 폴더 삭제 후 재시작)

## 🧪 실행 방법

```bash
cd services/ecommerce/admin
npm install
npm run dev
```

- 경로: [http://localhost:5173/checkout/confirm](http://localhost:5173/checkout/confirm)

## 📌 추가 안내
- 향후 실제 결제(PG 연동) 시 이 구조에 API 요청만 추가하면 확장 가능
- 결제 실패/취소/보류 상태 등도 `status` 필드로 확장 가능
- 주문 상세 페이지(`/orders/:id`) 구현도 추후 가능

## 📂 컴포넌트 구조
- `src/components/CheckoutConfirm.tsx`
- `src/contexts/OrderContext.tsx`
- `src/routes/ProtectedRoute.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-07-payment-confirm.md

<!-- From: o4o-api-server/ui-tasks/task-07-payment-confirm.md -->

# Task: 결제 및 주문 확정 처리 UI 구성

## 🎯 목적
사용자가 장바구니에서 주문을 생성한 이후 실제 결제 과정을 거쳐 주문을 확정하는 전체 흐름을 구성한다.  
초기 구현은 결제 연동 없이 더미 데이터를 기반으로 구성하며, 추후 국내 PG사 API 연동을 위한 구조 확장을 고려한다.

---

## ✅ 구현할 기능 목록

### 1. 결제 선택 및 요약 화면 (`/checkout/confirm`)
- 주문 내용 요약: 상품 목록, 수량, 가격, 총합계
- 결제 수단 선택 (예: 카드, 가상계좌 – 더미 처리)
- "결제하기" 버튼 → 주문 확정 처리
- 결제 완료 시 주문 내역(`/orders`)으로 이동

### 2. 주문 확정 처리
- 주문 정보를 localStorage 또는 전역 상태에 저장
- 주문 상태: "결제 완료" 표시
- 주문 생성 시간 및 결제 정보 포함

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: localStorage 기반 (또는 OrderProvider 사용)
- 결제 모듈은 추후 실제 PG 연동 시 대체 가능

---

## 🧪 테스트 조건
- `/checkout/confirm`에서 정확한 주문 정보가 출력되어야 함
- "결제하기" 클릭 시 주문 상태가 "완료"로 변경
- `/orders`에서 해당 주문이 "결제 완료"로 보일 것
- 새로고침 후에도 주문 정보 유지

---

## 📌 확장 계획
- 국내 PG사(이니시스, KCP, 토스페이 등) 연동 시 실제 결제 API 연결
- Medusa backend와 실제 주문 DB 연동
- 결제 실패/취소 흐름 추가 고려

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-07-payment-confirm.md`

---

## 📄 o4o-api-server/ui-tasks/task-08-user-order-detail-result.md

<!-- From: o4o-api-server/ui-tasks/task-08-user-order-detail-result.md -->

# Task-08: 주문 상세 페이지 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 기능 요약

### 1. 주문 상세 페이지 (`/orders/:id`)
- `OrderDetail.tsx` 컴포넌트 구현
- `useParams()`로 주문 ID 추출 후 OrderProvider 또는 localStorage에서 해당 주문 조회
- 존재하지 않는 주문 ID일 경우 "주문을 찾을 수 없습니다" 메시지 출력

### 2. App.tsx 라우팅 구성
- `/orders/:id` 경로에 `OrderDetail` 컴포넌트 연결
- 인증 보호가 필요한 경우 `ProtectedRoute` 적용 가능

### 3. 주문 목록에서 상세보기 링크 추가
- `/orders` 목록에서 각 주문 항목에 “상세보기” 링크 추가
- 클릭 시 해당 주문 상세 페이지(`/orders/{id}`)로 이동

## 🧪 테스트 조건
- 유효한 주문 ID일 경우 상세 페이지 정상 출력
- 없는 주문 ID 접근 시 오류 메시지 출력 확인
- 새로고침 후에도 주문 정보가 유지됨

## 📌 확장 계획
- 주문 상태 변경 버튼 추가 (예: 배송 중, 배송 완료 등)
- 배송 정보 입력 필드 추가 (수령자, 주소, 운송장 번호 등)
- 관리자/판매자용 주문 처리 화면과 연동 가능

## 📂 컴포넌트 구조
- `src/components/OrderDetail.tsx`
- `src/routes/ProtectedRoute.tsx` (필요 시 인증 경로 보호용)

---

## 📄 o4o-api-server/ui-tasks/task-08-user-order-detail.md

<!-- From: o4o-api-server/ui-tasks/task-08-user-order-detail.md -->

# Task: 주문 상세 페이지 UI 구성

## 🎯 목적
사용자가 주문 목록에서 특정 주문을 선택했을 때, 해당 주문의 상세 정보를 확인할 수 있는 페이지를 구현한다.  
주문 ID 기반으로 라우팅되며, 주문이 존재하지 않는 경우 예외 처리를 포함한다.

---

## ✅ 구현할 기능 목록

### 1. 주문 상세 페이지 (`/orders/:id`)
- `useParams()`를 통해 주문 ID 추출
- 주문 정보 조회: OrderProvider 또는 localStorage에서 해당 ID의 주문 찾기
- 주문이 존재하지 않을 경우 오류 메시지 출력

### 2. 주문 상세 정보 구성
- 주문일시, 주문번호
- 상품명, 수량, 단가, 합계
- 총 주문 금액
- 결제수단 및 결제상태

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리: `OrderProvider` 또는 localStorage
- Router: `react-router-dom`

---

## 🧪 테스트 조건
- `/orders/:id` 경로에서 유효한 주문 데이터 출력 확인
- 없는 주문 ID 접근 시 "주문을 찾을 수 없습니다" 메시지 출력
- 새로고침 후에도 데이터 유지

---

## 📌 확장 계획
- 주문 상태 업데이트 버튼 추가 가능 (관리자 기능과 연동 예정)
- 배송 정보, 운송장 번호 등 확장 필드 추가 가능
- `/orders` 페이지에서 주문 상세 링크 추가

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-08-user-order-detail.md`

---

## 📄 o4o-api-server/ui-tasks/task-09-admin-order-management-result.md

<!-- From: o4o-api-server/ui-tasks/task-09-admin-order-management-result.md -->

# Task-09: 관리자 주문 관리 UI 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 구현된 주요 기능

### 1. OrderProvider 기능 확장
- `updateOrderStatus(orderId, newStatus)` 함수 추가
- `deleteOrder(orderId)` 함수 추가
- 모든 변경 사항은 localStorage에 반영되어 새로고침 후에도 유지됨

### 2. AdminOrders 컴포넌트 (`/admin/orders`)
- 전체 주문을 테이블 형식으로 출력
- 항목: 주문번호, 주문일시, 상태, 결제수단, 총금액, 상세보기 링크, 상태 변경, 삭제
- 상태 드롭다운으로 즉시 변경 가능
- 삭제 시 확인창(alert) 후 즉시 삭제

### 3. 라우팅 및 네비게이션 반영
- `App.tsx`에서 `/admin/orders` 경로에 `AdminOrders` 컴포넌트 라우팅 추가
- 상단 네비게이션에 "관리자 주문 관리" 메뉴 추가

## 🧪 실행 경로

```bash
npm run dev
→ http://localhost:5173/admin/orders
```

## ✅ 테스트 기준 충족
- 상태 변경 후 새로고침 시 반영 유지됨
- 주문 삭제 후 목록에서 즉시 제거
- 각 주문의 상세 페이지(`/orders/:id`)로 이동 가능

## 📌 확장 가능 기능
- 상태별 필터, 검색 기능 추가
- 관리자 전용 인증 기능 연동
- Medusa API와 연동한 실제 주문 처리 흐름 구성

---

## 📄 o4o-api-server/ui-tasks/task-09-admin-order-management.md

<!-- From: o4o-api-server/ui-tasks/task-09-admin-order-management.md -->

# Task: 관리자 주문 관리 UI 구성

## 🎯 목적
관리자가 전체 주문 목록을 확인하고, 주문 상태를 변경하거나 삭제할 수 있는 주문 관리 UI를 구성한다.  
기존 사용자 주문 흐름과 연동되며, 주문 데이터는 OrderProvider 또는 localStorage 기반으로 관리된다.

---

## ✅ 구현할 기능 목록

### 1. 관리자 주문 목록 (`/admin/orders`)
- 전체 주문 데이터를 테이블로 표시
- 컬럼: 주문번호, 주문일시, 상태, 결제수단, 총금액
- "상세보기" 버튼 → `/orders/:id` 페이지로 이동

### 2. 주문 상태 변경
- 상태 드롭다운 또는 버튼 (예: "결제 완료" → "배송 중" → "배송 완료")
- 변경 즉시 localStorage 또는 전역 상태에 반영

### 3. 주문 삭제
- 주문 목록 행에서 "삭제" 버튼 제공
- 클릭 시 해당 주문을 목록 및 상태에서 제거

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 저장: OrderProvider 또는 localStorage
- 보호 라우트: 관리자 전용 경로에 `ProtectedRoute` 적용

---

## 🧪 테스트 조건
- 주문 목록이 전체 주문을 정확히 표시해야 함
- 상태 변경이 실시간으로 반영되어야 함
- 삭제 시 주문이 즉시 사라지고, 새로고침 후에도 유지되지 않아야 함

---

## 📌 확장 계획
- 주문 필터링(상태별), 검색 기능 추가
- Medusa backend 연동 시 실제 주문 상태 업데이트 API와 연동
- 관리자 인증 기능 연계

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-09-admin-order-management.md`

---

## 📄 o4o-api-server/ui-tasks/task-10-medusa-api-integration-result.md

<!-- From: o4o-api-server/ui-tasks/task-10-medusa-api-integration-result.md -->

# Task-10: Medusa API 연동 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 연동 내역

### 1. 주문 생성 (CheckoutConfirm.tsx)
- `POST /store/orders` API 호출로 Medusa 백엔드에 실제 주문 생성
- JWT 토큰을 Authorization 헤더에 포함
- 결제 완료 후 주문 목록(`/orders`)으로 이동
- 로딩 처리 및 에러 메시지 표시 구현

### 2. 주문 목록 조회 (Orders.tsx)
- `GET /store/orders` API 호출
- JWT 인증 포함
- 주문 데이터 테이블 형식 렌더링
- 인증 실패 시 자동 `/login` 리디렉션
- 에러 및 로딩 상태 처리

### 3. 주문 상세 조회 (OrderDetail.tsx)
- `GET /store/orders/:id` API 호출
- JWT 인증 포함
- 상세 정보 렌더링: 상품 목록, 수량, 총합계, 결제수단 등
- 잘못된 주문 ID 접근 시 오류 메시지 출력

## 🔐 인증 처리
- JWT 토큰은 localStorage에서 불러와 모든 요청에 자동 포함
- 인증 실패 시 자동 리디렉션 처리 (`/login`)

## 🧪 테스트 기준 충족
- Medusa 서버에서 생성된 실제 주문 데이터가 프론트에서 정확히 반영됨
- API 요청 실패 시 적절한 에러 핸들링 및 사용자 메시지 제공

## 📌 다음 단계 제안
- 회원가입 및 로그인 (`/register`, `/login`) → Medusa API 연동
- 관리자 주문 목록 연동 (`/admin/orders`) → `GET /admin/orders`
- 사용자 정보 조회 및 프로필 수정 기능
- 상품 등록/관리 기능 연동

## 📂 주요 연동 컴포넌트
- `src/components/CheckoutConfirm.tsx`
- `src/components/Orders.tsx`
- `src/components/OrderDetail.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-10-medusa-api-integration.md

<!-- From: o4o-api-server/ui-tasks/task-10-medusa-api-integration.md -->

# Task: Medusa 백엔드 API 연동 시작

## 🎯 목적
현재 localStorage 기반으로 구현된 상품, 주문, 사용자 기능을 Medusa의 백엔드 REST API와 연동하여 실제 전자상거래 플랫폼 데이터 기반으로 전환한다.

---

## ✅ 연동 대상 기능 및 API

### 1. 상품 목록 및 상세
- `/shop` → `GET /store/products`
- `/product/:id` → `GET /store/products/:id`

### 2. 주문 생성
- `/checkout/confirm` → `POST /store/orders`
- 사용자 정보 포함 필요 (JWT 기반 인증 또는 guest 주문)

### 3. 주문 목록 및 상세
- `/orders` → `GET /store/orders`
- `/orders/:id` → `GET /store/orders/:id`
- 인증된 사용자 전용

### 4. 사용자 인증
- `/register` → `POST /store/customers`
- `/login` → `POST /store/customers/auth`
- 로그인 시 JWT 토큰을 localStorage에 저장, 이후 모든 요청에 Authorization 헤더 포함

---

## 🧩 기술 스택
- REST API: `fetch` 또는 `axios`
- 인증 처리: JWT + localStorage
- 에러 핸들링: 인증 실패 시 `/login` 리디렉션

---

## 🧪 테스트 조건
- 상품 목록과 상세가 실제 Medusa 상품과 동기화되어야 함
- 주문 생성 시 실제 백엔드에 주문이 저장되어야 함
- 로그인한 사용자만 주문 내역 확인 가능해야 함
- API 에러 시 fallback 메시지 출력

---

## 📌 확장 계획
- 관리자/판매자 기능 연동을 위한 Admin API 확장
- Medusa 이벤트 기반 주문 처리 흐름 구성
- 실제 PG 연동 및 결제 상태 처리 전환

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-10-medusa-api-integration.md`

---

## 📄 o4o-api-server/ui-tasks/task-11-auth-api-integration-result.md

<!-- From: o4o-api-server/ui-tasks/task-11-auth-api-integration-result.md -->

# Task-11: Medusa API 기반 회원가입 / 로그인 연동 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. AuthContext
- 로그인
  - `POST /store/customers/auth` 요청으로 JWT 토큰 발급
  - `GET /store/customers/me`로 사용자 정보 조회
  - localStorage에 "jwt" 및 사용자 정보 저장
- 회원가입
  - `POST /store/customers`로 가입 요청
  - 성공 시 자동 로그인 및 메인 페이지로 이동
- 로그아웃
  - localStorage에서 JWT 및 사용자 정보 제거
- 인증 상태 전역 제공 (`useAuth()` 훅 지원)

### 2. Register.tsx
- 이름, 이메일, 비밀번호 입력 폼
- 회원가입 후 자동 로그인 및 리디렉션 처리
- 실패 시 에러 메시지 표시

### 3. Login.tsx
- 이메일, 비밀번호 입력
- 로그인 성공 시 메인 페이지 이동
- 실패 시 에러 메시지 출력

### 4. apiFetch 유틸
- `requireAuth` 옵션이 true인 경우 localStorage의 JWT 토큰을 `Authorization: Bearer` 헤더로 자동 포함
- 모든 인증 API 요청에서 재사용 가능

## 🔐 인증 흐름
- 로그인된 사용자만 보호된 페이지(`/orders`, `/cart`, `/checkout`, `/admin/...`)에 접근 가능
- 인증 실패 시 자동으로 `/login`으로 리디렉션
- 로그아웃 시 인증 상태 초기화 및 인증 페이지 제외한 경로 접근 차단

## 🧪 테스트 기준 충족
- 정상 가입 및 로그인 시 토큰 저장 및 사용자 정보 유지
- 새로고침 후에도 인증 상태 유지
- 로그인 실패 시 메시지 출력
- 로그아웃 후 보호 페이지 접근 차단

## 📌 확장 가능 기능
- 사용자 정보 조회/수정 (`GET /store/customers/me`, `POST /store/customers/me`)
- 비밀번호 변경 기능
- 관리자 및 판매자 인증 기능 추가 분리

## 📂 관련 컴포넌트 및 훅
- `src/contexts/AuthContext.tsx`
- `src/components/Register.tsx`
- `src/components/Login.tsx`
- `src/utils/apiFetch.ts`

---

## 📄 o4o-api-server/ui-tasks/task-11-auth-api-integration.md

<!-- From: o4o-api-server/ui-tasks/task-11-auth-api-integration.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-12-user-profile-result.md

<!-- From: o4o-api-server/ui-tasks/task-12-user-profile-result.md -->

# Task-12: 사용자 정보 조회 및 수정 기능 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. Profile.tsx
- 페이지 진입 시 `GET /store/customers/me` 호출 → 사용자 정보 조회
- 입력 필드: 이름, 이메일, 전화번호, 주소
- 저장 버튼 클릭 시 `POST /store/customers/me` 호출 → 정보 업데이트
- 저장 성공 시 "저장되었습니다." 메시지 표시
- 실패 시 에러 메시지 출력

### 2. App.tsx 라우팅
- `/profile` 경로에 `Profile` 컴포넌트 연결
- `ProtectedRoute`로 보호되어 로그인된 사용자만 접근 가능
- 네비게이션에 "내 프로필" 링크 추가

## 🔐 인증 흐름
- `AuthContext`의 JWT 토큰을 이용하여 `Authorization` 헤더 자동 포함
- 인증 실패 시 `/login`으로 자동 리디렉션

## 🧪 테스트 기준 충족
- 로그인된 사용자가 `/profile`에서 정보를 실시간으로 확인/수정 가능
- 저장 시 Medusa 서버에 실제 데이터 반영됨
- 새로고침 시 수정된 정보가 그대로 유지됨

## 📌 확장 계획
- 비밀번호 변경 기능 (`POST /store/customers/password`)
- 배송지 주소 관리 연동
- 회원 탈퇴 기능

## 📂 관련 컴포넌트
- `src/components/Profile.tsx`
- `src/routes/App.tsx`
- `src/contexts/AuthContext.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-12-user-profile.md

<!-- From: o4o-api-server/ui-tasks/task-12-user-profile.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-13-change-password-result.md

<!-- From: o4o-api-server/ui-tasks/task-13-change-password-result.md -->

# Task-13: 비밀번호 변경 기능 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. ChangePassword.tsx
- 입력 필드: 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인
- `POST /store/customers/password` API 호출
- JWT 토큰 포함 (Authorization 헤더 자동 설정)
- 비밀번호 불일치 시 경고 메시지 표시
- 성공 시 "비밀번호가 변경되었습니다." 메시지 출력
- 실패 시 서버 응답 메시지 또는 기본 오류 표시

### 2. App.tsx 라우팅
- `/profile/password` 경로에 `ChangePassword` 컴포넌트 연결
- `ProtectedRoute`로 보호 → 로그인한 사용자만 접근 가능

### 3. Profile.tsx 연동
- 프로필 페이지 상단에 "비밀번호 변경" 내부 링크(`/profile/password`) 추가

## 🔐 인증 처리
- `AuthContext` 기반 JWT 토큰을 apiFetch에서 자동 삽입
- 인증 실패 시 `/login`으로 자동 리디렉션 처리 유지

## 🧪 테스트 기준 충족
- 올바른 현재 비밀번호 입력 시 변경 성공 확인
- 새 비밀번호 확인 불일치 시 사용자 경고 메시지 표시
- 인증 실패, 서버 오류 시 에러 메시지 출력 확인

## 📌 다음 확장 항목
- 이메일 기반 비밀번호 재설정(비밀번호 찾기)
- 회원 탈퇴 처리 흐름
- 관리자/판매자 전용 비밀번호 변경 페이지 분리

## 📂 관련 컴포넌트
- `src/components/ChangePassword.tsx`
- `src/components/Profile.tsx`
- `src/routes/App.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-13-change-password.md

<!-- From: o4o-api-server/ui-tasks/task-13-change-password.md -->

# Task: 로그인된 사용자의 비밀번호 변경 기능

## 🎯 목적
로그인된 사용자가 현재 비밀번호를 확인한 후 새 비밀번호로 변경할 수 있도록 UI를 구성하고, Medusa의 API(`/store/customers/password`)와 연동한다.

---

## ✅ 구현할 기능

### 1. 비밀번호 변경 페이지 (`/profile/password`)
- 입력 필드:
  - 현재 비밀번호
  - 새 비밀번호
  - 새 비밀번호 확인
- "비밀번호 변경" 버튼 클릭 시 Medusa API 호출

### 2. API 연동
- `POST /store/customers/password`
- 요청 본문:
```json
{
  "old_password": "current-password",
  "new_password": "new-password"
}
```
- 요청 시 JWT 토큰을 Authorization 헤더에 포함
- 응답 성공 시 "비밀번호가 변경되었습니다" 메시지 출력
- 실패 시 에러 메시지 출력 (예: 현재 비밀번호 불일치)

---

## 🧩 기술 스택
- React + TailwindCSS
- 인증 처리: `AuthContext`의 JWT 사용
- API 호출: `apiFetch({ requireAuth: true })`

---

## 🧪 테스트 조건
- 올바른 현재 비밀번호 입력 시 변경 성공
- 새 비밀번호가 일치하지 않으면 경고 표시
- 인증 실패 또는 서버 오류 시 에러 메시지 출력

---

## 📌 향후 확장
- 비밀번호 찾기(이메일 인증 기반) 흐름 구현
- 메일 발송 연동 (SMTP 설정 필요)
- 관리자/판매자 비밀번호 변경 페이지 분리 구성

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-13-change-password.md`

---

## 📄 o4o-api-server/ui-tasks/task-14-forgot-password-result.md

<!-- From: o4o-api-server/ui-tasks/task-14-forgot-password-result.md -->

# Task-14: 이메일 기반 비밀번호 찾기 / 재설정 기능 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. ForgotPassword.tsx
- 이메일 입력 필드 제공
- `POST /store/customers/password-token` 호출
- 성공 시: "비밀번호 재설정 링크가 이메일로 전송되었습니다." 메시지 표시
- 실패 시: 오류 메시지 표시

### 2. ResetPassword.tsx
- URL에서 `token` 파라미터 추출 (`useParams`)
- 입력 필드: 새 비밀번호, 새 비밀번호 확인
- `POST /store/customers/reset-password` 호출
- 성공 시: "비밀번호가 변경되었습니다." 메시지 출력 및 `/login`으로 2초 후 자동 이동
- 실패 시: 에러 메시지 출력

### 3. App.tsx 라우팅
- `/forgot-password`, `/reset-password/:token` 경로 설정
- 네비게이션에 "비밀번호 찾기" 메뉴 추가

## 🧪 테스트 기준 충족
- 유효한 이메일 입력 시 메일 발송 API 호출 성공
- 링크 클릭 후 새 비밀번호 변경 성공
- 잘못된 토큰 접근 시 오류 메시지 정상 출력
- 새 비밀번호 변경 후 로그인 가능 확인

## 📌 향후 확장 계획
- 메일 템플릿 커스터마이징 (Medusa backend 설정 필요)
- 이메일 인증 기반 회원가입 전환
- OTP 또는 2단계 인증 추가

## 📂 관련 컴포넌트
- `src/components/ForgotPassword.tsx`
- `src/components/ResetPassword.tsx`
- `src/routes/App.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-14-forgot-password.md

<!-- From: o4o-api-server/ui-tasks/task-14-forgot-password.md -->

# Task: 비밀번호 찾기 및 재설정 기능 (이메일 발송 기반)

## 🎯 목적
이메일 주소를 통해 비밀번호 재설정 요청을 하고, 메일로 전달된 링크에서 새 비밀번호를 설정할 수 있도록 하는 전체 흐름을 구현한다.  
Medusa의 비밀번호 재설정 API 및 메일 발송 기능을 사용한다.

---

## ✅ 구현할 기능

### 1. 비밀번호 찾기 페이지 (`/forgot-password`)
- 사용자 이메일 입력
- API 호출: `POST /store/customers/password-token`
- 성공 시 "비밀번호 재설정 링크가 이메일로 전송되었습니다" 메시지 출력
- 실패 시 오류 메시지 출력

### 2. 비밀번호 재설정 페이지 (`/reset-password/:token`)
- 토큰을 URL 파라미터에서 추출 (`useParams`)
- 입력 필드: 새 비밀번호, 비밀번호 확인
- API 호출: `POST /store/customers/reset-password`
```json
{
  "token": "<token-from-url>",
  "password": "<new-password>"
}
```
- 성공 시 "비밀번호가 변경되었습니다" 메시지 출력 및 `/login`으로 이동
- 실패 시 오류 메시지 출력

---

## 📩 메일 발송 전제 조건
- Medusa 백엔드의 `.env`에 SMTP 메일 서버 설정 필요
  - 예: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- `/store/customers/password-token` 호출 시 Medusa가 이메일 전송 처리

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리 없음 (비회원 흐름)
- API 호출: `fetch` 또는 `apiFetch()` (비인증)

---

## 🧪 테스트 조건
- 유효한 이메일 입력 시 "메일 전송 완료" 메시지 출력
- 잘못된 토큰으로 접근 시 오류 메시지 출력
- 새 비밀번호 입력 성공 시 로그인 가능 여부 확인

---

## 📌 확장 계획
- 메일 템플릿 커스터마이징 (Medusa backend)
- 이메일 인증 기반 회원가입 전환
- OTP 기반 추가 인증 보완

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-14-forgot-password.md`

---

## 📄 o4o-api-server/ui-tasks/task-15-admin-auth-result.md

<!-- From: o4o-api-server/ui-tasks/task-15-admin-auth-result.md -->

# Task-15: 관리자 인증 및 보호 라우트 기능 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. AdminAuthContext
- 더미 관리자 계정: `admin@example.com / adm!n1234`
- 로그인/로그아웃/관리자 인증 상태 전역 제공
- localStorage `"admin_jwt"`로 인증 상태 저장 및 유지

### 2. 관리자 로그인 페이지 (`/admin/login`)
- 관리자 이메일/비밀번호 입력 폼
- 로그인 성공 시 `/admin/orders`로 이동
- 실패 시 오류 메시지 출력
- 로그인 성공 시 `"admin_jwt"` 저장

### 3. AdminProtectedRoute
- `/admin/*` 경로 접근 보호
- 인증된 관리자만 children 렌더링
- 미인증 시 `/admin/login`으로 리디렉션 처리

### 4. App.tsx 라우팅 구성
- 전체 라우팅을 `<AdminAuthProvider>`로 감쌈
- `/admin/orders` 등에 `AdminProtectedRoute` 적용
- 네비게이션에서 관리자 메뉴는 관리자 로그인 시에만 노출
- 관리자용 로그아웃 버튼 제공

## 🔐 인증 흐름
- 더미 관리자 계정으로 로그인 → `"admin_jwt"` 저장
- 새로고침 후에도 인증 상태 유지
- 로그아웃 시 localStorage에서 제거 → 인증 상태 초기화
- 인증되지 않은 접근 시 강제 `/admin/login` 이동

## 🧪 테스트 기준 충족
- 잘못된 관리자 정보로 로그인 실패 시 메시지 출력
- 로그인 성공 후 `/admin/*` 페이지 정상 접근
- 로그아웃 후 접근 시 차단 및 리디렉션

## 📌 확장 계획
- Medusa Admin API 연동 방식으로 전환 (`POST /admin/auth`)
- 관리자 계정 추가/삭제/수정 기능
- 역할/권한 분리: 관리자, 슈퍼관리자, 운영자 등

## 📂 관련 컴포넌트
- `src/contexts/AdminAuthContext.tsx`
- `src/routes/AdminProtectedRoute.tsx`
- `src/components/AdminLogin.tsx`
- `src/routes/App.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-15-admin-auth.md

<!-- From: o4o-api-server/ui-tasks/task-15-admin-auth.md -->

# Task: 관리자 인증 및 관리자 전용 페이지 분리 구성

## 🎯 목적
기존 사용자/판매자 인증 흐름에서 "관리자" 역할을 분리하여, 관리자 전용 페이지 접근을 보호하고 인증된 관리자만 접근할 수 있도록 구성한다.

---

## ✅ 구현할 기능 목록

### 1. 관리자 전용 로그인 페이지 (`/admin/login`)
- 관리자용 이메일/비밀번호 입력 폼
- 관리자 전용 인증 API 연동 방식 2안:
  - (A) 더미 인증: 지정된 관리자 이메일/비밀번호와 일치 시 로그인 처리
  - (B) Medusa Admin API 연동: `POST /admin/auth` (인증 토큰 발급)
- 로그인 성공 시 `/admin/orders`, `/admin/products` 등으로 이동
- 실패 시 오류 메시지 출력

### 2. 관리자 인증 상태 관리
- `AdminAuthContext` 또는 `useAdminAuth()` 훅 생성
- 관리자 JWT 토큰 localStorage 저장: `"admin_jwt"`
- 전역 상태로 관리자 인증 여부 제공

### 3. 관리자 보호 라우트 구성
- `AdminProtectedRoute` 컴포넌트 생성
- 인증된 관리자만 접근 가능, 미인증 시 `/admin/login`으로 리디렉션

### 4. 기존 관리자 페이지 적용
- `/admin/orders` 등 기존 관리자 UI 경로에 `AdminProtectedRoute` 적용
- 네비게이션에서 관리자 메뉴 분리(로그인 상태일 때만 노출)

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리: React Context
- 인증 저장소: localStorage (`admin_jwt`)
- 보호 라우트 구성: `react-router-dom`

---

## 🧪 테스트 조건
- 지정된 관리자 계정으로 로그인 성공 시 관리자 페이지 접근 가능
- 인증되지 않은 상태에서 관리자 페이지 접근 시 `/admin/login`으로 이동
- 로그아웃 시 관리자 상태 초기화 및 보호 페이지 접근 차단

---

## 📌 확장 계획
- 관리자 계정 관리 UI 추가
- 관리자 활동 로그 기록
- 관리자와 판매자/사용자 계정 권한 세분화

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-15-admin-auth.md`

---

## 📄 o4o-api-server/ui-tasks/task-16-admin-users-result.md

<!-- From: o4o-api-server/ui-tasks/task-16-admin-users-result.md -->

# Task-16: 관리자 계정 목록 / 추가 / 수정 / 역할 관리 기능 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. AdminUserContext
- 관리자 계정 상태 관리 Context 구성
- localStorage 기반:
  - 관리자 목록 조회
  - 관리자 추가/수정/조회
  - 역할(role) 정보 저장
- 역할 종류: `superadmin`, `manager`, `viewer`

### 2. 관리자 계정 페이지

#### `/admin/users` (AdminUserList)
- 관리자 계정 테이블 출력
- 필드: 이메일, 이름, 역할, 등록일
- 각 항목에 “수정” 버튼
- 상단 “관리자 추가” 버튼 → `/admin/users/new`

#### `/admin/users/new` (AdminUserNew)
- 입력 항목: 이메일, 이름, 비밀번호, 역할
- 저장 시 localStorage에 계정 추가 및 목록 페이지로 이동

#### `/admin/users/:id/edit` (AdminUserEdit)
- 기존 관리자 정보 로드 및 수정 가능
- 수정 완료 후 저장 시 목록 페이지로 이동

### 3. App.tsx 라우팅 구성
- `/admin/users*` 경로에 `AdminProtectedRoute` 적용
- 전체 라우팅에 `AdminUserProvider` 포함
- 네비게이션에 "관리자 유저 관리" 메뉴 추가 (관리자 로그인 시에만 노출)

## 🧪 테스트 기준 충족
- 관리자 목록이 정확히 표시되고 추가/수정 동작 확인됨
- 역할 변경 즉시 반영
- 새로고침 후에도 localStorage를 통해 데이터 유지됨

## 📌 확장 계획
- Medusa Admin API 기반 관리자 관리로 전환
- 계정 삭제 기능 추가
- 역할 기반 접근 제한 적용 (예: viewer는 읽기 전용, manager는 일부 기능 제한 등)
- 관리자 활동 로그 추적 기능

## 📂 관련 컴포넌트
- `src/contexts/AdminUserContext.tsx`
- `src/components/AdminUserList.tsx`
- `src/components/AdminUserNew.tsx`
- `src/components/AdminUserEdit.tsx`
- `src/routes/App.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-16-admin-users.md

<!-- From: o4o-api-server/ui-tasks/task-16-admin-users.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-17-admin-role-protected-result.md

<!-- From: o4o-api-server/ui-tasks/task-17-admin-role-protected-result.md -->

# Task-17: 관리자 역할 기반 보호 라우팅 적용 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. AdminRoleProtectedRoute 컴포넌트
- `role="superadmin"` 등 최소 요구 권한 이상일 때만 children 렌더링
- 조건을 만족하지 않으면 "권한이 없습니다" 메시지 출력 또는 `/admin/login`으로 리디렉션
- 현재 로그인한 관리자 이메일을 기준으로 역할 판별
- 역할 정보는 localStorage의 `"admin_email"`과 `AdminUserContext`를 조합하여 추출

### 2. App.tsx 보호 라우팅 적용
- `/admin/users`, `/admin/users/new`, `/admin/users/:id/edit` 경로에 다음과 같은 보호 구조 적용:
```tsx
<AdminProtectedRoute>
  <AdminRoleProtectedRoute role="superadmin">
    <AdminUserEdit />
  </AdminRoleProtectedRoute>
</AdminProtectedRoute>
```

### 3. AdminLogin.tsx 연동
- 로그인 성공 시 `localStorage["admin_email"]`에 관리자 이메일 저장
- 이후 역할 판별 시 사용

## 🔐 인증 및 역할 흐름
- 관리자 로그인 시 역할 판별 → 역할 기반 라우팅 제한 적용
- superadmin만 관리자 계정 관리 화면 접근 가능
- manager 또는 viewer는 접근 시 권한 부족 메시지 출력
- 역할 변경 후 즉시 UI 및 접근 권한 반영

## 🧪 테스트 기준 충족
- `superadmin` 로그인 시 `/admin/users*` 경로 정상 접근 가능
- `manager` 또는 `viewer`는 접근 시 차단
- 네비게이션 조건 분기 가능 (추후 적용)

## 📌 확장 계획
- 관리자 역할 기반 네비게이션 메뉴 분기
- 403 Forbidden 페이지 구성
- `viewer` 역할 전용 읽기 전용 UI 구성
- 역할 기반 버튼 숨김 및 기능 제한 처리

## 📂 관련 컴포넌트
- `src/routes/AdminRoleProtectedRoute.tsx`
- `src/routes/App.tsx`
- `src/components/AdminLogin.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-17-admin-role-protected.md

<!-- From: o4o-api-server/ui-tasks/task-17-admin-role-protected.md -->

# Task: 관리자 역할 기반 라우팅 보호 적용

## 🎯 목적
관리자 계정에 설정된 역할(Role)에 따라 접근 가능한 기능/화면을 제한하여, 권한이 없는 관리자 계정이 중요한 관리 기능에 접근하지 못하도록 보호한다.

---

## ✅ 구현할 기능

### 1. 역할 기반 보호 라우트 컴포넌트 생성 (`AdminRoleProtectedRoute`)
- 사용자의 역할이 지정된 역할 이상인지 확인
- 조건 불충족 시 접근 거부 또는 `/admin`으로 리디렉션
- 최소 권한 설정 방식:
```tsx
<AdminRoleProtectedRoute role="superadmin">
  <AdminUserList />
</AdminRoleProtectedRoute>
```

### 2. 기존 관리자 페이지 적용
- `/admin/users*`: `superadmin`만 접근 가능
- `/admin/orders`, `/admin/products`: `manager` 이상 접근 가능
- `viewer`: 읽기 전용 접근 (또는 차후 별도 처리)

### 3. 네비게이션 표시 조건 분기
- 현재 로그인한 관리자 역할에 따라 메뉴 노출 여부 제어
- 예: `superadmin`만 "관리자 계정 관리" 메뉴 표시

---

## 🔐 역할 권한 정의 (예시)
| 역할        | 설명                           |
|-------------|--------------------------------|
| superadmin  | 모든 관리자 페이지 접근 가능   |
| manager     | 상품/주문 페이지만 접근 가능   |
| viewer      | 읽기 전용 접근 (추후 구현)     |

---

## 🧩 기술 스택
- React + Context (`AdminUserContext`)
- ProtectedRoute → 역할 조건 추가 확장

---

## 🧪 테스트 조건
- `superadmin`만 관리자 계정 관리 페이지 접근 가능
- `manager`는 주문/상품 관리 가능, 계정 관리 접근 시 리디렉션
- 역할 변경 후 동작 반영 확인

---

## 📌 확장 계획
- `viewer` 전용 UI 제한 (읽기 전용 컴포넌트 구성)
- 접근 거부 시 사용자 메시지 또는 403 페이지 제공
- 서버 연동 시 역할 기반 API 응답 제한 처리

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-17-admin-role-protected.md`

---

## 📄 o4o-api-server/ui-tasks/task-18-forbidden-page-result.md

<!-- From: o4o-api-server/ui-tasks/task-18-forbidden-page-result.md -->

# Task-18: 403 Forbidden 페이지 구성 작업 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. ForbiddenPage.tsx
- 메시지: "이 페이지에 접근할 수 있는 권한이 없습니다."
- 스타일: Tailwind 기반 관리자 UI
- 버튼:
  - "관리자 홈으로" → `/admin`
  - "관리자 로그인" → `/admin/login`

### 2. AdminRoleProtectedRoute 반영
- 로그인 상태가 아니면 `/admin/login`으로 리디렉션
- 로그인은 했지만 권한이 부족한 경우 `<ForbiddenPage />` 렌더링
```tsx
if (!hasRequiredRole) return <ForbiddenPage />;
```

### 3. 적용 예시
- `manager`, `viewer`가 `/admin/users` 등 `superadmin` 전용 페이지 접근 시 403 페이지로 전환
- superadmin은 정상 접근 가능

## 🧪 테스트 기준 충족
- 역할 미달 관리자 접근 시 ForbiddenPage 정상 표시
- 각 버튼 클릭 시 관리자 홈 또는 로그인 페이지로 이동
- 역할 변경 후 즉시 라우팅 결과 반영

## 📌 확장 계획
- 사용자/판매자용 403 페이지 분리 구성
- 404 Not Found 페이지 통합 처리
- 네비게이션에서 역할에 따라 메뉴 숨김 또는 제한 처리
- 접근 로그 기록 또는 관리자 알림 기능

## 📂 관련 컴포넌트
- `src/components/ForbiddenPage.tsx`
- `src/routes/AdminRoleProtectedRoute.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-18-forbidden-page.md

<!-- From: o4o-api-server/ui-tasks/task-18-forbidden-page.md -->

# Task: 403 Forbidden 페이지 구성 및 역할 미달 접근 처리

## 🎯 목적
역할(Role) 기반 보호 라우트에서 권한이 없는 사용자가 관리자 페이지에 접근할 경우, 명확한 UX를 제공하기 위해 403 Forbidden 전용 페이지를 구성한다.

---

## ✅ 구현할 기능

### 1. ForbiddenPage 컴포넌트 생성
- 메시지: "이 페이지에 접근할 수 있는 권한이 없습니다."
- 스타일: 관리자 UI에 맞는 Tailwind 기반 디자인
- 버튼: 홈(`/admin`) 또는 로그인(`/admin/login`)으로 이동

### 2. AdminRoleProtectedRoute 통합
- 조건 미달(`role !== superadmin` 등)일 때 `<ForbiddenPage />` 렌더링
```tsx
if (!hasRequiredRole) return <ForbiddenPage />;
```

### 3. App.tsx 적용 예시
- `/admin/users*` 경로에서 manager/viewer가 접근 시 403 페이지로 이동
- 추후 일반 사용자나 seller/supplier도 역할 기반 보호 시 사용 가능

---

## 🧩 기술 스택
- React + TailwindCSS
- 라우팅 구성: `react-router-dom`
- 인증 및 역할: `AdminAuthContext`, `AdminUserContext`

---

## 🧪 테스트 조건
- 관리자 로그인 상태에서 권한이 없는 경로 접근 시 403 페이지 렌더링
- "홈으로" 또는 "로그인" 버튼 정상 작동
- 역할 변경 후 접근 시 반응 확인

---

## 📌 확장 계획
- 사용자 전용 403 페이지 별도 구성 (예: `/cart` 접근 제한 시)
- 404 Not Found 페이지와 통합된 오류 시스템 구성
- 모든 보호 라우트에서 fallback 403 페이지 사용 가능

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-18-forbidden-page.md`

---

## 📄 o4o-api-server/ui-tasks/task-19-seller-frontend-result.md

<!-- From: o4o-api-server/ui-tasks/task-19-seller-frontend-result.md -->

# Task-19: 판매자 전용 프론트엔드 1단계 구현 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin` 또는 별도 seller 영역

## ✅ 주요 구현 내역

### 1. SellerAuthContext
- localStorage 기반 판매자 인증 상태 관리
- 필드: `seller_email`, `seller_jwt`
- 기능:
  - 로그인
  - 로그아웃
  - 회원가입
  - 인증 상태 확인

### 2. /seller/login, /seller/register
- 더미 기반 이메일/비밀번호로 회원가입 및 로그인
- 로그인/가입 성공 시 `seller_jwt` 저장 및 `/seller/dashboard`로 이동
- 로그인 실패 시 오류 메시지 표시

### 3. SellerProtectedRoute
- 인증된 판매자만 children 렌더링
- 미인증 시 `/seller/login`으로 리디렉션 처리

### 4. /seller/dashboard
- 로그인한 판매자만 접근 가능
- 간단한 판매자 전용 대시보드 UI 구성
- 예시: "환영합니다, {이메일}", 판매 상품/주문 개요

### 5. 판매자 네비게이션
- 로그인 여부에 따라 메뉴 동적 표시:
  - 로그인 상태: 대시보드, 로그아웃
  - 미로그인 상태: 로그인, 회원가입

### 6. App.tsx 라우팅 적용
- `/seller/*` 경로 전체를 `<SellerAuthProvider>`로 감쌈
- 각 경로에 `SellerProtectedRoute` 적용
- 판매자 관련 페이지와 UI 분리 유지

## 🧪 테스트 기준 충족
- 로그인 상태가 아니면 `/seller/dashboard` 접근 시 `/seller/login`으로 이동
- 로그인/회원가입 후 대시보드 자동 이동
- 로그아웃 시 상태 초기화 및 네비게이션 반영

## 📌 다음 단계 제안
- `/seller/products`: 판매자 상품 목록/등록
- `/seller/orders`: 판매자 주문 내역
- `/seller/settlement`: 판매자 정산 내역
- Medusa API 연동: 판매자 ID 기반 필터링 구현

## 📂 관련 컴포넌트
- `src/contexts/SellerAuthContext.tsx`
- `src/routes/SellerProtectedRoute.tsx`
- `src/components/SellerLogin.tsx`
- `src/components/SellerRegister.tsx`
- `src/components/SellerDashboard.tsx`

---

## 📄 o4o-api-server/ui-tasks/task-19-seller-frontend.md

<!-- From: o4o-api-server/ui-tasks/task-19-seller-frontend.md -->

# Task: 판매자 전용 프론트엔드 설계 시작

## 🎯 목적
관리자와 사용자 UI와는 별도로, 판매자 전용 인터페이스를 제공하여 판매자가 자신의 상품, 주문, 정산 정보를 직접 관리할 수 있는 환경을 구축한다.

---

## ✅ 1단계 구현 목표

### 1. 판매자 로그인/회원가입 (더미 기반)
- `/seller/login`: 이메일/비밀번호 입력 → localStorage에 판매자 토큰 저장
- `/seller/register`: 이름, 이메일, 비밀번호 입력 → 더미 계정 생성
- 토큰 예시: `"seller_jwt"` 또는 `"seller_email"`

### 2. 판매자 인증 상태 관리
- `SellerAuthContext` 생성
- 로그인/로그아웃/판매자 상태 전역 제공
- 보호 라우트 `SellerProtectedRoute` 구성

### 3. 기본 대시보드 (`/seller/dashboard`)
- 로그인 후 진입 가능한 판매자 홈
- 예시 UI: 총 상품 수, 총 주문 수, 최근 주문 등

### 4. 네비게이션 구성
- 상단 바 또는 사이드 메뉴에 판매자 메뉴 노출
- 로그인 상태에 따라 메뉴 동적 전환

---

## 🧩 기술 스택
- React + TailwindCSS
- 상태 관리: Context API (`SellerAuthContext`)
- 인증 저장소: localStorage (`seller_jwt` or `seller_email`)
- 라우팅 보호: `react-router-dom` + `SellerProtectedRoute`

---

## 🧪 테스트 조건
- `/seller/*` 경로는 로그인하지 않으면 `/seller/login`으로 리디렉션
- 로그인 성공 시 대시보드 진입 가능
- 로그아웃 시 모든 판매자 페이지 접근 차단

---

## 📌 확장 계획
- `/seller/products`: 판매자 상품 목록 및 등록
- `/seller/orders`: 판매자 주문 현황
- `/seller/settlement`: 판매자 정산 내역
- Medusa API 연동 시 판매자 전용 필터 적용

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin` 또는 `services/ecommerce/seller`
- 문서 위치: `docs/ui-tasks/task-19-seller-frontend.md`

---

## 📄 o4o-api-server/ui-tasks/task-20-admin-product-management-result.md

<!-- From: o4o-api-server/ui-tasks/task-20-admin-product-management-result.md -->

# Task-20: 관리자 상품 목록 / 등록 / 수정 기능 구현 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. AdminProductList (`/admin/products`)
- API: `GET /admin/products` (Medusa Admin API)
- 테이블 구성:
  - 상품명, 가격, 상태, 등록일
  - "수정" 버튼 → `/admin/products/:id/edit`
  - "신규 등록" 버튼 → `/admin/products/new`

### 2. AdminProductNew (`/admin/products/new`)
- 입력 항목: 상품명, 설명, 가격, 이미지 URL, 재고
- 저장 시 API: `POST /admin/products`
- 성공 시 목록 이동 및 메시지 표시

### 3. AdminProductEdit (`/admin/products/:id/edit`)
- API:
  - `GET /admin/products/:id`로 기존 정보 조회
  - `POST /admin/products/:id`로 수정 저장
- 성공 시 목록 이동 및 메시지 출력

### 4. App.tsx 라우팅 보호
- `/admin/products*` 경로에 다음 구조 적용:
```tsx
<AdminProtectedRoute>
  <AdminRoleProtectedRoute role="manager">
    <AdminProductList />
  </AdminRoleProtectedRoute>
</AdminProtectedRoute>
```

### 5. 네비게이션
- 관리자 로그인 시 "관리자 상품 관리" 메뉴 노출
- 로그아웃 시 메뉴 숨김

### 6. apiFetch 유틸
- `requireAdminAuth: true` 옵션으로 `admin_jwt` 자동 Authorization 헤더 삽입

## 🧪 테스트 기준 충족
- 인증되지 않거나 권한 미달 시 403 또는 로그인 페이지로 리디렉션
- 상품 등록/수정/조회 API 모두 정상 동작
- 수정 내용이 목록에 실시간 반영됨

## 📌 확장 계획
- 상품 삭제 기능
- 상품 카테고리/태그 관리
- 이미지 업로드 (Medusa file plugin 필요)
- 상태별 필터링 및 검색 기능 추가

## 📂 관련 컴포넌트
- `src/components/AdminProductList.tsx`
- `src/components/AdminProductNew.tsx`
- `src/components/AdminProductEdit.tsx`
- `src/utils/apiFetch.ts`

---

## 📄 o4o-api-server/ui-tasks/task-20-admin-product-management.md

<!-- From: o4o-api-server/ui-tasks/task-20-admin-product-management.md -->

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

---

## 📄 o4o-api-server/ui-tasks/task-21-admin-dashboard-result.md

<!-- From: o4o-api-server/ui-tasks/task-21-admin-dashboard-result.md -->

# Task-21: 관리자 대시보드 (요약 카드 기반) 구현 결과

## ✅ 구현 완료 위치
- `Coding/o4o-platform/services/ecommerce/admin`

## ✅ 주요 구현 내역

### 1. AdminDashboard (`/admin/dashboard`)
- API 연동:
  - `GET /admin/products` → 총 상품 수
  - `GET /admin/orders` → 총 주문 수
- 요약 카드 UI:
  - Tailwind 기반 그리드 카드
  - 각 카드 클릭 시 해당 상세 페이지로 이동
- 에러/로딩 상태 처리 포함

### 2. App.tsx 라우팅
- `/admin/dashboard` 경로에 `AdminDashboard` 컴포넌트 연결
- 보호 구성:
```tsx
<AdminProtectedRoute>
  <AdminDashboard />
</AdminProtectedRoute>
```

### 3. 네비게이션
- 관리자 로그인 시 "관리자 대시보드" 메뉴 동적 표시

## 🧪 테스트 기준 충족
- 관리자 로그인 시 대시보드 정상 접근
- 인증되지 않은 경우 접근 차단 (리디렉션 또는 403)
- 상품/주문 수는 Medusa Admin API 실시간 반영
- 카드 클릭 → 상세 페이지 이동 정상 작동

## 📌 확장 계획
- Chart.js, Recharts 기반 상태별 통계 시각화
- 신규 상품/주문 수, 최근 7일 데이터 분석
- 로그인한 관리자 정보 표시(이름, 역할 등)
- 시스템 알림 또는 로그 이벤트 표시

## 📂 관련 컴포넌트
- `src/components/AdminDashboard.tsx`
- `src/routes/App.tsx`
- `src/utils/apiFetch.ts`

---

## 📄 o4o-api-server/ui-tasks/task-21-admin-dashboard.md

<!-- From: o4o-api-server/ui-tasks/task-21-admin-dashboard.md -->

# Task: 관리자 대시보드 (요약 카드 기반) 구성

## 🎯 목적
관리자가 로그인 후 가장 먼저 확인할 수 있는 홈 화면에서 전체 서비스 상태를 한눈에 파악할 수 있도록 요약 정보를 카드 형태로 제공한다.

---

## ✅ 구현할 기능

### 1. 관리자 대시보드 페이지 (`/admin/dashboard`)
- 보호 라우트 적용 (`AdminProtectedRoute`)
- 관리자 로그인 시 진입 가능

### 2. 요약 카드 UI 구성
- 총 상품 수 (`GET /admin/products`)
- 총 주문 수 (`GET /admin/orders`)
- 최근 주문 수 / 오늘 등록된 상품 수 등 (가능한 경우)
- 각 카드 클릭 시 해당 상세 페이지로 이동 (선택사항)

### 3. 시각 요소 구성
- Tailwind 기반 카드 레이아웃
- 각 항목별 아이콘, 수치 강조
- 에러 또는 로딩 처리 포함

---

## 🧩 기술 스택
- React + TailwindCSS
- 데이터 API: Medusa Admin API
- 보호 라우트: `AdminProtectedRoute`

---

## 🧪 테스트 조건
- `/admin/dashboard`에서 관리자 요약 정보 정상 출력
- API 응답값 반영 확인
- 인증되지 않은 경우 접근 차단

---

## 📌 확장 계획
- 시간대별 차트 (차후 Chart.js, Recharts 등)
- 상품/주문 상태별 통계 시각화
- 관리자 개인화 정보 (로그인 시간, 역할 등)

---

## 🗂️ 위치
- 경로: `services/ecommerce/admin`
- 문서 위치: `docs/ui-tasks/task-21-admin-dashboard.md`

---

## 📄 o4o-api-server/zz-misc-notes.md

<!-- From: o4o-api-server/zz-misc-notes.md -->

# 기타 참고 사항

- .env 변경 후 서버 재시작 필수
- bcryptjs 설치 후 node REPL에서 해시 생성
- 로그인 에러 시 auth_identity → user_id 매핑 확인


---

## 📄 o4o-web-server/o4o-web-server-handoff.md

<!-- From: o4o-web-server/o4o-web-server-handoff.md -->

# o4o-web-server 프론트엔드 개발 전달 문서

## 🎯 목적
이 문서는 현재까지 완료된 관리자 백엔드 기능 기반으로, 이제 사용자/판매자 중심의 프론트엔드 UI 개발을 `o4o-web-server`에서 이어가기 위한 안내 및 인수 문서입니다.  
프론트엔드는 실질적으로 다양한 사용자(소비자, 판매자, 참여자 등)가 접속하고 상호작용하는 핵심 인터페이스입니다.

---

## ✅ 현재까지의 작업 상황

### 1. 백엔드 (`o4o-api-server`) / 관리자 UI
- 관리자 상품/주문/계정 관리 기능: ✅ 완료
- 관리자 인증 및 역할 기반 보호: ✅ 적용
- Medusa Admin API 연동: ✅ 완료
- 경로: `services/ecommerce/admin`

---

## ⏭️ 다음 작업: `o4o-web-server`에서 프론트엔드 화면 구축

### 2. 사용자/판매자 중심 프론트 UI (개발 위치: `o4o-web-server`)
- 프레임워크: React (or Next.js 등 CSR 기반)
- API 연동: Medusa Store API (`/store/*`) + 백엔드 인증 포함

---

## 👥 주요 사용자 그룹

| 사용자 유형 | 설명 | 인증 수단 |
|-------------|------|------------|
| 고객 (user) | 상품 탐색, 장바구니, 결제, 주문 확인 | customer JWT |
| 판매자 (seller) | 상품 등록, 주문 처리, 정산 보기 등 | seller JWT |
| 관리자 (admin) | 이미 별도 admin UI에서 구현 완료 | admin JWT (별도 서버)

---

## 🛠️ 구현이 필요한 프론트 UI 예시

| 경로 | 설명 |
|------|------|
| `/shop` | 상품 목록 |
| `/product/:id` | 상품 상세 |
| `/cart`, `/checkout` | 장바구니 및 결제 |
| `/orders`, `/orders/:id` | 주문 목록 및 상세 |
| `/login`, `/register`, `/profile` | 사용자 인증 및 정보 수정 |
| `/seller/login`, `/seller/dashboard`, `/seller/products` | 판매자 전용 대시보드 |

---

## 🔐 인증 정책 요약

| 역할 | 토큰 | 저장소 |
|------|------|--------|
| 사용자 | customer JWT | localStorage (`jwt`) |
| 판매자 | seller JWT | localStorage (`seller_jwt`) |
| 관리자 | admin JWT | localStorage (`admin_jwt`) - 이미 별도 구현됨

---

## 📌 현재 구현된 사항 (참고용)

- 관리자 기능은 전체 구현 완료 상태
- 프론트엔드는 기본 구조만 존재하거나 아직 작업되지 않음
- Medusa API 연동은 준비 완료

---

## 📎 문서 기반 개발 흐름
- 문서 위치: `Coding/o4o-platform/docs/ui-tasks/`
- 각 기능별 Task 문서를 기반으로 구현 → 완료 시 Task-Result 문서로 정리됨

---

## ✅ 다음 시작점 제안 (o4o-web-server에서 Cursor에 요청)

> “Task-01: 사용자 상품 목록 `/shop`을 Medusa API와 연동해서 카드형 UI로 만들어줘. 로그인 없이 접근 가능하게 하고, Tailwind를 사용해 스타일도 적용해줘.”

---

이 문서를 o4o-web-server 작업 공간에 전달하고, 이후 UI 기반 프론트엔드 흐름을 이어가면 됩니다.

---

## 📄 o4o-web-server/tasks/00-init-web-folders.md

<!-- From: o4o-web-server/tasks/00-init-web-folders.md -->


# 🧱 Task 00: o4o-web-server 초기 폴더 및 기본 파일 생성

## 📌 목적
전자상거래 프론트엔드 개발을 시작하기 위해 `o4o-platform/services/ecommerce/web/` 아래에 필요한 디렉터리 및 기본 템플릿 파일들을 생성한다.

---

## 📂 생성할 디렉터리 및 파일 구조

```
o4o-platform/
└── services/
    └── ecommerce/
        └── web/
            ├── src/
            │   ├── pages/
            │   │   └── Shop.tsx              # 상품 목록 페이지
            │   ├── components/
            │   │   └── ProductCard.tsx       # 상품 카드 컴포넌트
            │   ├── routes/
            │   │   └── index.tsx             # React Router 설정
            │   └── app.tsx                   # 앱 엔트리 포인트
            └── public/
```

---

## ✍️ 세부 설명

- `Shop.tsx`: Medusa API로부터 상품 목록을 받아와 카드로 출력
- `ProductCard.tsx`: 상품 정보를 카드 형태로 출력
- `index.tsx`: Router 설정 (e.g. `/shop` 경로)
- `app.tsx`: 기본 라우팅 구조 포함한 메인 앱

---

## ⏭️ 다음 작업 연결

- Task-01: `/shop` 화면 개발 (카드 UI, 상품 목록 출력)
- Task-02: `/product/:id` 상세 페이지 개발


---

## 📄 o4o-web-server/tasks/01-shop-product-list.md

<!-- From: o4o-web-server/tasks/01-shop-product-list.md -->


# 🛒 Task 01: 상품 목록 화면 (`/shop`) 구현

## 📌 목적
o4o 플랫폼 사용자들이 상품을 탐색할 수 있도록, `/shop` 경로에 카드 UI 형태의 상품 목록 화면을 구성한다. Medusa Store API와 연동한다.

---

## ✅ 요구 기능

- 경로: `/shop`
- API: `GET /store/products`
- 표시 요소: 상품명, 이미지(썸네일), 가격, 상세 링크
- 스타일: TailwindCSS 사용
- 인증: 로그인 없이 접근 가능

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/Shop.tsx`
- 카드 컴포넌트: `o4o-platform/services/ecommerce/web/src/components/ProductCard.tsx`
- 라우터 설정: `o4o-platform/services/ecommerce/web/src/routes/index.tsx`
- API 에러 처리 및 로딩 상태 처리 포함

---

## 🔗 참고 API
Medusa Store API: `/store/products`  
예상 응답: `{ products: [{ id, title, thumbnail, variants[{ prices[] }] }] }`

---

## ⏭️ 다음 작업 연결
- Task-02: `/product/:id` 상세 페이지 구성
- Task-03: 장바구니 상태관리 구성


---

## 📄 o4o-web-server/tasks/02-product-detail-page-DESKTOP-SS4Q2DK.md

<!-- From: o4o-web-server/tasks/02-product-detail-page-DESKTOP-SS4Q2DK.md -->


# 🧾 Task 02: 상품 상세 페이지 (`/product/:id`) 구현

## 📌 목적
사용자가 상품 목록에서 상품을 클릭하면 해당 상품의 상세 정보를 확인할 수 있도록 상세 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/product/:id`
- API: `GET /store/products/:id`
- 표시 요소:
  - 상품명
  - 이미지(썸네일)
  - 가격
  - 설명 (필요 시 메타 정보 활용)
  - 장바구니에 담기 버튼
- 로딩 및 에러 상태 처리 포함

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/ProductDetail.tsx`
- React Router의 `useParams`를 사용하여 `:id` 추출
- API 호출 후 데이터 렌더링
- TailwindCSS 사용

---

## 🔗 참고 API

Medusa Store API: `/store/products/:id`  
예상 응답: `{ product: { id, title, thumbnail, description, variants[{ prices[] }] } }`

---

## ⏭️ 다음 작업 연결

- Task-03: 장바구니 상태 관리 및 장바구니 페이지 (`/cart`)


---

## 📄 o4o-web-server/tasks/02-product-detail-page.md

<!-- From: o4o-web-server/tasks/02-product-detail-page.md -->


# 🧾 Task 02: 상품 상세 페이지 (`/product/:id`) 구현

## 📌 목적
상품 목록에서 개별 상품을 클릭하면 상세 정보를 볼 수 있도록 상세 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/product/:id`
- API: `GET /store/products/:id`
- 표시 요소:
  - 상품명
  - 썸네일 이미지
  - 가격 (옵션 포함 시 가격 범위)
  - 설명 (없으면 placeholder)
  - "장바구니에 담기" 버튼 → 클릭 시 `addToCart()` + `navigate("/cart")`
- 로딩 및 에러 상태 처리

---

## 🧱 구현 방식

- 파일 경로: `o4o-platform/services/ecommerce/web/src/pages/ProductDetail.tsx`
- React Router의 `useParams`로 `:id` 추출
- Zustand의 `addToCart()` 상태 사용
- TailwindCSS 스타일 적용

---

## 🔗 참고 API

Medusa Store API: `/store/products/:id`

예상 응답: 
```json
{
  "product": {
    "id": "prod_123",
    "title": "제품명",
    "thumbnail": "url",
    "description": "설명",
    "variants": [
      {
        "prices": [{ "amount": 10000 }]
      }
    ]
  }
}
```

---

## ⏭️ 다음 작업 연결

- Task-03: 장바구니 페이지 (`/cart`)


---

## 📄 o4o-web-server/tasks/03-cart-page-DESKTOP-SS4Q2DK.md

<!-- From: o4o-web-server/tasks/03-cart-page-DESKTOP-SS4Q2DK.md -->


# 🧾 Task 03: 장바구니 페이지 (`/cart`) 구현

## 📌 목적
사용자가 상품을 선택한 후 결제 전까지 확인하고 조정할 수 있도록 장바구니 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/cart`
- 표시 요소:
  - 장바구니에 담긴 상품 목록
  - 각 상품의 썸네일, 이름, 수량, 가격
  - 수량 조절 버튼 (+ / -)
  - 상품 삭제 버튼
  - 총 합계 금액 표시
  - 결제 페이지(`/checkout`)로 이동 버튼
- 상태 관리: React Context 또는 Zustand 등 사용 가능
- 로컬스토리지와 연동하여 새로고침 시에도 유지

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/Cart.tsx`
- 상태 관리 로직은 별도 디렉터리(`/src/store/cartStore.ts`)로 분리 가능
- TailwindCSS 사용

---

## 📦 예시 로컬 상태 구조

```ts
type CartItem = {
  productId: string;
  title: string;
  thumbnail: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};
```

---

## ⏭️ 다음 작업 연결

- Task-04: 결제 및 주문 확인 페이지 (`/checkout`)


---

## 📄 o4o-web-server/tasks/03-cart-page.md

<!-- From: o4o-web-server/tasks/03-cart-page.md -->


# 🧾 Task 03: 장바구니 페이지 (`/cart`) 구현

## 📌 목적
사용자가 담은 상품을 확인하고 수량을 조절하거나 삭제할 수 있는 장바구니 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/cart`
- 표시 요소:
  - 담긴 상품 리스트
  - 썸네일, 상품명, 가격, 수량
  - 수량 조절 버튼 (+ / -)
  - 삭제 버튼
  - 총 금액 표시
  - `/checkout` 페이지로 이동 버튼
- 로컬스토리지 연동

---

## 🧱 구현 방식

- 파일 경로: `o4o-platform/services/ecommerce/web/src/pages/Cart.tsx`
- Zustand 기반 상태 관리 (파일: `/src/store/cartStore.ts`)
- TailwindCSS 적용
- 총 합계 계산 포함
- 반응형 디자인 적용

---

## 🔗 상태 예시

```ts
type CartItem = {
  productId: string;
  title: string;
  thumbnail: string;
  price: number;
  quantity: number;
};
```

---

## ⏭️ 다음 작업 연결

- Task-04: 결제 및 주문 페이지 (`/checkout`)


---

## 📄 o4o-web-server/tasks/04-checkout-page.md

<!-- From: o4o-web-server/tasks/04-checkout-page.md -->


# 🧾 Task 04: 결제 및 주문 확인 페이지 (`/checkout`) 구현

## 📌 목적
사용자가 장바구니를 확인하고 주문을 완료할 수 있도록 결제 및 주문 확인 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/checkout`
- 표시 요소:
  - 배송지 정보 입력 (이름, 주소, 연락처 등)
  - 장바구니 상품 목록 요약
  - 총 주문 금액 표시
  - 주문 버튼 클릭 시 API 호출하여 주문 생성
  - 주문 완료 후 확인 메시지 또는 주문 상세로 이동
- 상태 관리: 기존 장바구니 상태 활용
- 에러 및 로딩 처리 포함

---

## 🧱 구현 방식

- React 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/Checkout.tsx`
- 상태: 장바구니 정보는 Zustand에서 불러오기
- TailwindCSS 사용
- 폼 유효성 검사 적용 (기본 validation 또는 라이브러리 사용 가능)

---

## 🔗 참고 API

Medusa Store API:
- `/store/carts`
- `/store/orders`
- 또는 커스텀 결제 API 연동 가능

---

## ⏭️ 다음 작업 연결

- Task-05: 주문 내역 페이지 (`/orders`)


---

## 📄 o4o-web-server/tasks/04b-cart-button-and-routing.md

<!-- From: o4o-web-server/tasks/04b-cart-button-and-routing.md -->


# 🧾 Task 04b: 장바구니 담기 버튼 및 라우터 연결

## 📌 목적
상품 상세 페이지에서 장바구니에 상품을 담고, `/cart`로 이동할 수 있도록 UI와 기능을 마무리하고,
`/checkout` 경로를 라우터에 등록하여 전체 사용자 흐름을 완성한다.

---

## ✅ 요구 작업

### 1. 장바구니 담기 버튼 연결
- 위치: `ProductDetail.tsx`
- 작업:
  - Zustand의 `addToCart()` 함수 사용
  - 담은 후 `navigate("/cart")`로 이동

### 2. `/checkout` 라우터 연결
- 위치: `routes/index.tsx` 또는 메인 라우터 구성
- 작업:
  - `/checkout` 경로에 `Checkout.tsx` 컴포넌트 연결
  - 이미 생성된 파일 사용: `src/pages/Checkout.tsx`

---

## 🧱 구현 방식 예시

```tsx
// 상품 상세 페이지에서 장바구니에 추가
<button onClick={() => {
  addToCart(product); // 상태 저장
  navigate("/cart");  // 페이지 이동
}}>
  Add to Cart
</button>
```

```tsx
// 라우터 등록 예시 (React Router)
<Route path="/checkout" element={<Checkout />} />
```

---

## ⏭️ 다음 작업 연결

- Task-05: 주문 내역 페이지 (`/orders`)


---

## 📄 o4o-web-server/tasks/05-order-history-page.md

<!-- From: o4o-web-server/tasks/05-order-history-page.md -->


# 🧾 Task 05: 주문 내역 페이지 (`/orders`, `/orders/:id`) 구현

## 📌 목적
사용자가 완료한 주문을 확인할 수 있도록 주문 목록 페이지와 주문 상세 페이지를 구현한다.

---

## ✅ 요구 기능

### `/orders` (주문 목록)
- Medusa API: `GET /store/orders`
- 표시 요소:
  - 주문 ID 또는 번호
  - 주문 일시
  - 총 주문 금액
  - 주문 상태
  - 각 주문 클릭 시 상세 페이지(`/orders/:id`)로 이동

### `/orders/:id` (주문 상세)
- Medusa API: `GET /store/orders/:id`
- 표시 요소:
  - 주문 ID, 상태, 날짜
  - 수령인 정보 (이름, 주소 등)
  - 주문한 상품 목록 (상품명, 수량, 가격)
  - 총 금액 요약

---

## 🧱 구현 방식

- 목록 페이지: `o4o-platform/services/ecommerce/web/src/pages/Orders.tsx`
- 상세 페이지: `o4o-platform/services/ecommerce/web/src/pages/OrderDetail.tsx`
- React Router 등록 필요
- API 호출 시 JWT 인증이 필요한 경우 추가
- TailwindCSS 사용

---

## 🔗 참고 API

Medusa Store API:
- `/store/orders`
- `/store/orders/:id`

---

## ⏭️ 다음 작업 연결

- Task-06: 주문 완료 후 확인 화면 또는 주문 추적 기능 (선택)


---

## 📄 o4o-web-server/tasks/06-order-confirmation-page.md

<!-- From: o4o-web-server/tasks/06-order-confirmation-page.md -->


# 🧾 Task 06: 주문 완료 후 확인 페이지 (`/order/confirmation`) 구현

## 📌 목적
사용자가 주문을 성공적으로 완료한 후, 주문 요약 정보를 확인할 수 있는 확인 페이지를 제공한다.

---

## ✅ 요구 기능

- 경로: `/order/confirmation`
- 표시 요소:
  - 주문 성공 메시지
  - 주문 번호
  - 총 금액
  - 주문 날짜
  - "주문 내역 보기" 버튼 (`/orders`로 이동)
- 상태: 주문 완료 시 전달된 정보를 localStorage 또는 상태로 유지
- TailwindCSS 스타일 적용

---

## 🧱 구현 방식

- 파일: `o4o-platform/services/ecommerce/web/src/pages/OrderConfirmation.tsx`
- 주문 완료 시 API 응답에서 필요한 정보를 로컬 상태나 로컬스토리지에 저장
- 페이지 진입 시 해당 정보가 없을 경우 `/`로 리디렉션 처리

---

## ⏭️ 다음 작업 연결

- Task-07: 사용자 인증 기능 (로그인 / 로그아웃)


---

## 📄 o4o-web-server/tasks/07-authentication-flow.md

<!-- From: o4o-web-server/tasks/07-authentication-flow.md -->


# 🧾 Task 07: 사용자 로그인 및 인증 흐름 구현

## 📌 목적
사용자가 로그인하고, 인증된 상태에서 주문 내역 등을 확인할 수 있도록 인증 기능을 구현한다.

---

## ✅ 요구 기능

- 로그인 페이지 (`/login`)
  - 이메일, 비밀번호 입력
  - Medusa API: `POST /store/auth`
  - 성공 시 JWT 토큰 저장 (localStorage 또는 Zustand)
  - 로그인 후 `/` 또는 `/profile`로 이동

- 로그아웃 기능
  - 로그아웃 버튼 클릭 시 JWT 제거 및 `/login`으로 이동

- 인증 상태 관리
  - Zustand 또는 Context API로 로그인 상태 전역 관리
  - 인증이 필요한 페이지 보호 (예: `/orders`, `/profile` 등)
  - 인증되지 않은 사용자가 접근 시 `/login`으로 리디렉션

---

## 🧱 구현 방식

- 로그인 페이지: `o4o-platform/services/ecommerce/web/src/pages/Login.tsx`
- 인증 상태: `src/store/authStore.ts`
- 보호 라우트: `src/components/ProtectedRoute.tsx`
- API 연동: Medusa `/store/auth` 사용
- TailwindCSS 스타일 적용

---

## 🔐 참고 API

Medusa Store API:
- 로그인: `POST /store/auth`
- 사용자 정보 확인: `GET /store/customers/me`
- 로그아웃: 클라이언트에서 토큰 제거

---

## ⏭️ 다음 작업 연결

- Task-08: 사용자 프로필 페이지 (`/profile`)


---

## 📄 o4o-web-server/tasks/08-user-profile-page.md

<!-- From: o4o-web-server/tasks/08-user-profile-page.md -->


# 🧾 Task 08: 사용자 프로필 페이지 (`/profile`) 구현

## 📌 목적
로그인한 사용자가 자신의 정보(이름, 이메일, 주소 등)를 확인하고 수정할 수 있는 프로필 페이지를 제공한다.

---

## ✅ 요구 기능

- 경로: `/profile`
- 표시 요소:
  - 이름, 이메일
  - 기본 배송지 정보 (주소, 전화번호 등)
  - 정보 수정 버튼 또는 인라인 수정 기능
- 초기 데이터: 로그인 후 `/store/customers/me` API로 불러옴
- 정보 수정: `POST /store/customers/me` 또는 `PUT /store/customers/me` 사용
- 인증 필요: 로그인하지 않은 사용자는 `/login`으로 리디렉션
- TailwindCSS 스타일 적용

---

## 🧱 구현 방식

- 페이지: `o4o-platform/services/ecommerce/web/src/pages/Profile.tsx`
- 상태 관리: `authStore.ts`의 사용자 정보 활용
- API 연동: Medusa Store API 사용
- 보호 라우트 적용 필요

---

## 🔗 참고 API

Medusa Store API:
- 현재 사용자 조회: `GET /store/customers/me`
- 사용자 정보 수정: `POST /store/customers/me`

---

## ⏭️ 다음 작업 연결

- Task-09: 사용자 주소 관리 (다중 배송지 선택 및 편집)


---

## 📄 o4o-web-server/tasks/09-address-management-page.md

<!-- From: o4o-web-server/tasks/09-address-management-page.md -->


# 🧾 Task 09: 사용자 주소 관리 페이지 (`/profile/address`) 구현

## 📌 목적
사용자가 여러 배송지를 등록하고, 기본 주소를 설정하거나 수정/삭제할 수 있도록 주소 관리 페이지를 구현한다.

---

## ✅ 요구 기능

- 경로: `/profile/address`
- 기능:
  - 등록된 주소 목록 표시
  - 새 주소 추가 폼 (이름, 우편번호, 주소, 상세 주소, 연락처)
  - 주소 수정/삭제 버튼
  - 기본 배송지 설정 기능 (선택된 주소에 표시)
- 인증 필요: 로그인하지 않은 사용자는 접근 불가
- TailwindCSS 적용

---

## 🧱 구현 방식

- 페이지 파일: `o4o-platform/services/ecommerce/web/src/pages/ProfileAddress.tsx`
- 상태 관리: 필요 시 별도 store(`addressStore.ts`) 생성
- 주소 정보 저장 방식:
  - 초기 MVP에서는 localStorage 사용 가능
  - 실제 운영 시 Medusa 커스터마이징 필요
- 기본 주소 여부 필드(`is_default`) 사용

---

## 💡 참고 구현 포인트

- 주소 데이터를 배열로 관리하며 각 항목에 고유 ID 부여
- 기본 주소는 한 번에 하나만 설정 가능
- 폼 제출 시 주소 유효성 검사 필요

---

## ⏭️ 다음 작업 연결

- Task-10: 관리자 패널 초기 구성


---

## 📄 o4o-web-server/tasks/10-admin-panel-outline.md

<!-- From: o4o-web-server/tasks/10-admin-panel-outline.md -->


# 🧾 Task 10: 관리자 패널 초기 구성 (`/admin/*`) 구현

## 📌 목적
플랫폼 운영을 위한 관리자 전용 UI를 구성하고, 역할 기반 접근 제어와 초기 관리 기능을 준비한다.

---

## ✅ 요구 기능

### 관리자 홈 대시보드 (`/admin`)
- 운영 요약 정보 표시 (예: 총 주문 수, 총 매출, 신규 가입자 수)
- 관리자 전용 네비게이션 메뉴 제공

### 관리자 기능 초기 항목
- 상품 관리 (`/admin/products`)
- 주문 관리 (`/admin/orders`)
- 사용자 관리 (`/admin/users`)
- 대시보드 (`/admin/dashboard`)

---

## 🔐 인증 및 접근 제어

- 별도 관리자 로그인 페이지 (`/admin/login`)
- 상태 저장 방식: `adminAuthStore.ts` 또는 공통 `authStore.ts` 확장
- 보호 라우트: `AdminProtectedRoute.tsx`
- 일반 사용자 접근 시 `/403` 또는 `/login` 리디렉션

---

## 🧱 구현 방식

- 폴더 구조 예시:
  - `src/pages/admin/Dashboard.tsx`
  - `src/pages/admin/Products.tsx`
  - `src/pages/admin/Orders.tsx`
  - `src/pages/admin/Users.tsx`
- 관리자 메뉴는 왼쪽 사이드바 또는 상단 탭으로 구성
- TailwindCSS 및 아이콘 사용

---

## 💡 참고 포인트

- 관리자/사용자 역할 구분은 JWT에 포함된 정보 또는 로그인 시점의 API 응답 기반
- Medusa Admin API 또는 별도 내부 API로 연결 가능

---

## ⏭️ 다음 작업 연결

- Task-11: 관리자 로그인 및 권한 기반 메뉴 렌더링


---

## 📄 o4o-web-server/tasks/11-admin-login-auth.md

<!-- From: o4o-web-server/tasks/11-admin-login-auth.md -->


# 🧾 Task 11: 관리자 로그인 및 권한 기반 메뉴 렌더링 구현

## 📌 목적
운영자만 접근할 수 있는 관리자 페이지를 위해 별도의 로그인 기능과 권한 기반 라우팅 및 UI 렌더링을 구현한다.

---

## ✅ 요구 기능

### 관리자 로그인 페이지 (`/admin/login`)
- 이메일/비밀번호 입력 → 인증 요청
- 성공 시 JWT 및 관리자 정보 저장
- 로그인 후 `/admin/dashboard`로 이동
- 실패 시 에러 메시지 출력

### 관리자 인증 상태 관리
- `adminAuthStore.ts` 또는 `authStore.ts` 확장
- 상태 정보: 관리자 여부, 토큰, 이름 등
- localStorage에 JWT 저장

### 보호 라우트
- `AdminProtectedRoute.tsx` 컴포넌트
- 비인증 관리자 접근 시 `/admin/login` 또는 `/403` 리디렉션

### 관리자 메뉴 렌더링
- 네비게이션에서 일반 사용자와 구분
- 관리자만 접근 가능한 메뉴는 조건부 렌더링

---

## 🧱 구현 방식

- 로그인 페이지: `src/pages/admin/AdminLogin.tsx`
- 상태 관리: `adminAuthStore.ts`
- 보호 라우트: `AdminProtectedRoute.tsx`
- 메뉴 컴포넌트에서 `isAdminAuthenticated` 체크 후 조건부 렌더링

---

## 🔐 참고 API

Medusa Admin API 또는 커스텀 관리자 로그인 API  
(초기에는 사용자 로그인 API를 그대로 활용하여 관리자 권한만 필터링 가능)

---

## ⏭️ 다음 작업 연결

- Task-12: 관리자 기능별 실제 관리 UI (상품, 주문, 회원)


---

## 📄 o4o-web-server/tasks/12-admin-feature-pages.md

<!-- From: o4o-web-server/tasks/12-admin-feature-pages.md -->


# 🧾 Task 12: 관리자 상품 / 주문 / 사용자 관리 기능 구현

## 📌 목적
관리자 패널 내에서 운영자가 상품, 주문, 사용자 정보를 실시간으로 조회/수정할 수 있도록 기능별 관리 UI를 구현한다.

---

## ✅ 요구 기능

### 1. 상품 관리 (`/admin/products`)
- 상품 목록 조회 (API: GET `/admin/products`)
- 상품 등록 버튼 → 상품 생성 폼 (모달 또는 별도 페이지)
- 상품 수정/삭제 기능 (편집 버튼 클릭 시 입력 가능)

### 2. 주문 관리 (`/admin/orders`)
- 주문 리스트 조회 (API: GET `/admin/orders`)
- 주문 상세 정보 보기 (`/admin/orders/:id`)
- 주문 상태 변경 드롭다운 (예: 처리중 → 배송중 → 완료)

### 3. 사용자 관리 (`/admin/users`)
- 회원 목록 조회 (API: GET `/admin/customers`)
- 사용자 상세 정보 보기
- 차단/탈퇴/관리자 권한 부여 등의 제어 버튼

---

## 🧱 구현 방식

- 레이아웃 유지: `AdminLayout.tsx` 그대로 사용
- 각 페이지 위치:
  - `src/pages/admin/Products.tsx`
  - `src/pages/admin/Orders.tsx`
  - `src/pages/admin/OrderDetail.tsx`
  - `src/pages/admin/Users.tsx`
- 테이블 UI: TailwindCSS + 테이블 컴포넌트 또는 커스텀 구성
- 모든 API 연동 시 관리자 인증 헤더 포함(JWT)

---

## 🔐 참고 API

- Medusa Admin API
  - `/admin/products`
  - `/admin/orders`
  - `/admin/orders/:id`
  - `/admin/customers`
- 또는 별도 백오피스 전용 API 설계 가능

---

## ⏭️ 다음 작업 연결

- Task-13: 관리자 활동 로그 또는 통계 차트 시각화


---

## 📄 o4o-web-server/tasks/13-admin-logs-and-stats.md

<!-- From: o4o-web-server/tasks/13-admin-logs-and-stats.md -->


# 🧾 Task 13: 관리자 활동 로그 및 통계 시각화

## 📌 목적
운영 효율성과 투명성을 높이기 위해 관리자 활동 로그를 기록하고, 주요 지표를 통계 차트로 시각화하여 관리자 대시보드에 표시한다.

---

## ✅ 요구 기능

### 1. 활동 로그 기능
- 관리자 로그인/로그아웃 시각 기록
- 상품 생성/수정/삭제 기록
- 주문 상태 변경 기록
- 사용자 계정 조작 기록 (차단/탈퇴/권한변경 등)
- 로그 리스트 UI (`/admin/logs`) + 검색/필터

### 2. 통계 시각화 (대시보드 내)
- 최근 7일 주문 수 변화
- 매출 추이 그래프 (line chart)
- 회원 가입 추이
- 인기 상품 Top 5

---

## 🧱 구현 방식

- 활동 로그 페이지: `src/pages/admin/Logs.tsx`
- 통계 차트 영역: `src/pages/admin/Dashboard.tsx` 내에 카드 + 차트 구성
- 차트 라이브러리 추천: `Recharts`, `Chart.js`, `Nivo` 등
- 스타일: TailwindCSS 기반 카드형 UI

---

## 🔐 참고 사항

- 로그 데이터는 별도 API 또는 DB 테이블을 통해 저장해야 함
- 관리자 JWT 포함 상태로만 로그 기록 가능
- 차트 API는 `GET /admin/stats/...` 또는 모킹 데이터 기반

---

## ⏭️ 다음 작업 연결

- Task-14: 관리자 알림(Notification) 시스템


---

## 📄 o4o-web-server/tasks/14-admin-notification-system.md

<!-- From: o4o-web-server/tasks/14-admin-notification-system.md -->


# 🧾 Task 14: 관리자 알림(Notification) 시스템 구현

## 📌 목적
주문 발생, 사용자 가입, 시스템 오류 등 중요한 이벤트가 발생할 때 관리자에게 실시간 알림을 제공하여 운영 대응 속도와 효율성을 향상시킨다.

---

## ✅ 요구 기능

### 알림 종류
- 신규 주문 발생
- 신규 사용자 가입
- 주문 상태 변경
- 시스템 오류 또는 예외 상황

### 알림 UI
- `/admin` 상단에 알림 아이콘 (벨 모양)
- 새 알림이 있을 경우 뱃지 표시 (ex. 🔔 3)
- 클릭 시 드롭다운 목록 또는 별도 `/admin/notifications` 페이지로 이동
- 각 알림 항목 클릭 시 관련 상세 페이지로 이동

---

## 🧱 구현 방식

- 상태 관리: `adminNotificationStore.ts`
- 알림 데이터는 배열 형태로 상태에 저장
- 초기에는 모킹 데이터 사용 가능
- 실시간 연동이 필요할 경우 WebSocket 또는 polling 적용 가능
- TailwindCSS + 아이콘(`lucide-react` 등)으로 스타일 구성

---

## 💡 참고 포인트

- 알림은 읽음/안 읽음 상태를 관리
- 페이지 진입 시 알림 목록 자동 갱신
- 알림 설정(알림 받을 이벤트 설정)은 차후 기능으로 확장 가능

---

## ⏭️ 다음 작업 연결

- Task-15: 실시간 대시보드 (웹소켓/주문 실시간 반영)


---

## 📄 o4o-web-server/tasks/15-admin-realtime-dashboard.md

<!-- From: o4o-web-server/tasks/15-admin-realtime-dashboard.md -->


# 🧾 Task 15: 실시간 대시보드 구현 (WebSocket 또는 Polling)

## 📌 목적
관리자 대시보드에서 주문, 매출, 사용자 가입 등의 정보를 실시간으로 반영하여 보다 빠르게 운영 상황을 파악할 수 있도록 한다.

---

## ✅ 요구 기능

### 실시간 데이터 항목
- 신규 주문 발생 시 실시간 반영
- 실시간 매출 총액 및 오늘 매출 변화
- 실시간 사용자 가입 수
- 주문 상태 변경 반영

---

## 🧱 구현 방식

- 통신 방식:
  - 기본: 주기적 polling (예: 5초마다 `/admin/stats/live`)
  - 확장: WebSocket 기반 push (후속 단계에서 적용 가능)
- 상태 저장: `adminLiveStatsStore.ts` 또는 Dashboard 내부 useState 사용
- 적용 위치: `src/pages/admin/Dashboard.tsx`
- 기존 Recharts 컴포넌트와 통합

---

## 💡 UI 요소

- 실시간 정보 상단 카드 (매출, 주문 수, 신규 가입자 등)
- 실시간 그래프 업데이트
- 변화 발생 시 강조 애니메이션 또는 색상 변경

---

## 🔐 보안 및 인증

- 관리자 인증 상태에서만 요청 수행
- 토큰 인증 헤더 포함

---

## ⏭️ 다음 작업 연결

- Task-16: 관리자 설정 페이지 (운영자 정보 변경, 테마 설정 등)


---

## 📄 o4o-web-server/tasks/16-admin-settings-page.md

<!-- From: o4o-web-server/tasks/16-admin-settings-page.md -->


# 🧾 Task 16: 관리자 설정 페이지 (`/admin/settings`) 구현

## 📌 목적
운영자가 자신의 계정 정보(이름, 이메일, 비밀번호 등)를 수정하거나 시스템 설정(테마, 알림 설정 등)을 관리할 수 있는 설정 페이지를 제공한다.

---

## ✅ 요구 기능

### 1. 관리자 정보 설정
- 이름, 이메일, 비밀번호 변경 폼
- 변경 시 비밀번호 확인 또는 재로그인 처리
- 성공/에러 메시지 출력

### 2. 테마 설정
- 다크 모드 / 라이트 모드 토글
- Tailwind 기반 클래스 전환 또는 CSS 변수 전환

### 3. 알림 설정
- 알림 수신 항목 설정 (주문, 가입, 오류 등)
- 설정 정보는 localStorage 또는 상태 저장소에 저장
- 알림 드롭다운/뱃지 동작과 연동

---

## 🧱 구현 방식

- 페이지: `src/pages/admin/Settings.tsx`
- 상태 관리: `adminSettingsStore.ts` 또는 localStorage 연동
- 테마 상태: Zustand 또는 context로 전역 적용
- TailwindCSS UI + 접근성 고려

---

## 🔐 보안 및 보호

- 관리자 인증 상태에서만 접근 가능 (`AdminProtectedRoute` 적용)
- 비밀번호 변경 시 보안 확인 (추후 MFA 등도 가능)

---

## 💡 추가 확장 기능 (선택)

- 백업/복원 설정
- 메타데이터 필드 관리
- 운영자 다중 계정 설정 (역할별 구분)

---

## ⏭️ 다음 작업 연결

- Task-17: 운영자 역할 및 권한 시스템


---

## 📄 o4o-web-server/tasks/17-admin-role-permission.md

<!-- From: o4o-web-server/tasks/17-admin-role-permission.md -->


# 🧾 Task 17: 운영자 역할 및 권한 시스템 구현

## 📌 목적
복수의 운영자가 존재하는 환경에서 역할 기반 접근 제어를 구현하여, 관리자 권한을 세분화하고 시스템 보안을 강화한다.

---

## ✅ 요구 역할 및 권한

### 기본 운영자 역할
- `superadmin`: 전체 시스템 접근 및 운영자 권한 부여 가능
- `manager`: 상품/주문/회원 관리 가능, 설정 제한
- `editor`: 상품 등록/수정 가능, 주문/회원/설정 접근 불가
- `viewer`: 읽기 전용 (모든 페이지 접근 가능, 수정 불가)

---

## ✅ 요구 기능

- 운영자 목록(`admin/users`)에서 역할 설정 UI
- 권한에 따라 관리자 메뉴 조건부 렌더링
- 권한 부족 시 `/403` 또는 안내 메시지 출력
- 각 페이지 단위로 접근 권한 검증

---

## 🧱 구현 방식

- 역할 정보 저장 위치:
  - 로그인 시 JWT 또는 API 응답에 포함된 역할 정보 저장
  - `adminAuthStore.ts`에 역할 필드 추가 (`role: 'superadmin' | 'manager' | ...`)
- 역할 기반 보호 컴포넌트:
  - `AdminRoleProtectedRoute` 컴포넌트 생성
  - 예: `<AdminRoleProtectedRoute roles={['superadmin', 'manager']}>...</AdminRoleProtectedRoute>`
- 메뉴 렌더링 조건 처리
- 수정 버튼 등 기능 단위 권한 분기 처리도 포함

---

## 💡 추가 구현 포인트

- 역할 필터를 통해 로그, 설정 페이지 등 제한
- 사용자 관리 테이블 내 권한 드롭다운 제공
- `superadmin`만 다른 운영자 역할 변경 가능

---

## 🔐 보안

- 모든 역할 정보는 서버 응답 기준으로만 사용
- 클라이언트 조작 불가하게 서버 권한 검증 반드시 포함

---

## ⏭️ 다음 작업 연결

- Task-18: 관리자 활동 감사 로그(행위 추적, 누가 무엇을 했는가)


---

## 📄 o4o-web-server/tasks/18-admin-audit-log.md

<!-- From: o4o-web-server/tasks/18-admin-audit-log.md -->


# 🧾 Task 18: 관리자 감사 로그 시스템 (행위 추적) 구현

## 📌 목적
운영자 활동의 투명성과 보안을 강화하기 위해 관리자 행위 로그를 기록하고 조회할 수 있는 감사 로그 시스템을 구현한다.

---

## ✅ 요구 기능

### 감사 로그 항목
- 작업 시간 (Timestamp)
- 관리자 ID/이메일
- 작업 종류 (예: 상품 수정, 주문 상태 변경, 회원 차단 등)
- 대상 객체 (상품 ID, 주문 ID, 사용자 ID 등)
- 작업 상세 메시지

---

## ✅ 로그 기록 대상
- 상품 등록/수정/삭제
- 주문 상태 변경
- 회원 상태 변경/권한 변경
- 관리자 로그인/로그아웃
- 설정 변경

---

## 🧱 구현 방식

- 로그 기록 방식:
  - 클라이언트 → 백엔드 `/admin/logs` 엔드포인트로 전송
  - 추후 로그 기록은 서버에서 자동 처리하는 방식으로 전환 가능
- 로그 보기 페이지: `/admin/logs`
  - 검색, 날짜 필터, 작업 종류 필터
  - TailwindCSS 테이블 UI

---

## 💡 UI 및 확장 포인트

- 로그 항목은 실시간 또는 페이지 진입 시 갱신
- 추후 CSV 다운로드, JSON 내보내기 기능 추가 가능
- 로그 항목을 Recharts 등으로 시각화 가능

---

## 🔐 보안

- `superadmin`만 로그 열람 가능
- 로그 기록은 반드시 관리자 인증 상태에서 수행

---

## ⏭️ 다음 작업 연결

- Task-19: 관리자 알림 히스토리 및 필터 기반 조회


---

## 📄 o4o-web-server/tasks/19-admin-notification-history.md

<!-- From: o4o-web-server/tasks/19-admin-notification-history.md -->


# 🧾 Task 19: 관리자 알림 히스토리 및 필터 조회 시스템 구현

## 📌 목적
운영 중 수신된 알림 내역을 기록하여 언제 어떤 이벤트에 대한 알림이 있었는지 확인할 수 있도록 알림 히스토리 페이지를 구현한다.

---

## ✅ 요구 기능

### 알림 이력 항목
- 수신 시간
- 알림 종류 (신규 주문, 사용자 가입, 시스템 오류 등)
- 요약 메시지
- 읽음 여부
- 관련 링크

---

## ✅ 기능 요건

- 알림 리스트 페이지: `/admin/notifications`
- 목록 UI:
  - 테이블 또는 카드형 목록
  - 필터: 알림 종류, 날짜 범위, 읽음 여부
  - 검색: 키워드 기반 메시지 검색
- 클릭 시 관련 상세 페이지 이동
- "모두 읽음 처리" 버튼 제공
- 알림 삭제(선택적) 기능

---

## 🧱 구현 방식

- 상태 관리: 기존 `adminNotificationStore.ts` 확장
- 데이터 저장: localStorage 또는 mock API (추후 DB 연동)
- UI: TailwindCSS 기반 반응형 테이블 or 카드 목록
- 알림 클릭 시 `read` 상태로 변경

---

## 💡 추가 포인트

- `/admin` 상단 알림 드롭다운과 연동
- 알림 삭제 기능은 `superadmin`만 사용 가능
- 알림 ID 기준 정렬 및 페이징 처리 (선택)

---

## 🔐 보안

- 알림 내역 접근은 인증된 관리자만 가능
- `superadmin`만 알림 삭제 가능

---

## ⏭️ 다음 작업 연결

- Task-20: 관리자 글로벌 검색 기능 (상품/주문/사용자 통합 검색)


---

## 📄 o4o-web-server/tasks/20-admin-global-search.md

<!-- From: o4o-web-server/tasks/20-admin-global-search.md -->


# 🧾 Task 20: 관리자 글로벌 통합 검색 시스템 구현

## 📌 목적
관리자가 상품, 주문, 사용자 정보를 빠르게 검색할 수 있도록 대시보드 또는 상단 바에서 통합 검색 기능을 제공한다.

---

## ✅ 요구 기능

### 통합 검색 항목
- 상품 (상품명, ID)
- 주문 (주문번호, 사용자 이메일)
- 사용자 (이메일, 이름)

---

## ✅ 기능 요건

- 검색 입력창:
  - 관리자 상단 바 또는 `/admin/search` 페이지
  - 실시간 검색어 입력 시 결과 리스트 표시
- 결과 출력:
  - 결과 항목별로 그룹핑(상품 / 주문 / 사용자)
  - 각 항목 클릭 시 관련 상세 페이지로 이동

---

## 🧱 구현 방식

- 상태 관리: `adminSearchStore.ts`
- API 호출:
  - `GET /admin/search?q=...` (mock 또는 통합 API)
  - 항목별 분기 처리 (상품: `/admin/products/:id`, 주문: `/admin/orders/:id`, 사용자: `/admin/users`)
- UI:
  - TailwindCSS 기반 드롭다운 or 페이지형 UI
  - 항목별 아이콘/색상 등으로 구분

---

## 💡 추가 확장 기능

- 자동완성 기능
- 최근 검색어 저장
- 결과 필터링 (범위, 날짜 등)
- 키보드 탐색 지원 (↑↓ + Enter)

---

## 🔐 보호 및 권한

- `AdminProtectedRoute` 적용
- 검색 가능한 항목은 역할별 권한에 따라 제한 가능

---

## ⏭️ 다음 작업 연결

- Task-21: 관리자 다중 계정 로그인/전환 기능 (예: 운영 중 관리자 전환)


---

## 📄 o4o-web-server/tasks/21-admin-multi-session.md

<!-- From: o4o-web-server/tasks/21-admin-multi-session.md -->


# 🧾 Task 21: 관리자 다중 계정 로그인 및 전환 기능 구현

## 📌 목적
운영 중 복수의 관리자 계정을 손쉽게 전환하거나 로그인 상태를 유지할 수 있도록 다중 계정 관리 기능을 제공한다.

---

## ✅ 요구 기능

### 계정 전환 기능
- 로그인한 관리자 외에 추가 계정 저장 가능
- 드롭다운 또는 버튼 클릭으로 계정 전환
- 전환 시 현재 세션 종료 후 새 세션으로 전환

### 로그인 상태 유지
- 자동 로그인 기능 (localStorage에 저장)
- 브라우저 종료 후에도 인증 유지 (토큰 + 관리자 정보)

---

## ✅ UI 구성

- `/admin` 상단에 계정 전환 드롭다운 또는 메뉴
- 현재 로그인된 관리자 정보 표시
- 다른 계정 선택 시 자동 전환
- "다른 계정 추가 로그인" 버튼 → 로그인 폼 모달 표시

---

## 🧱 구현 방식

- 상태 관리:
  - `adminSessionStore.ts`
  - 다중 계정 리스트 상태 (`[{ email, token, role }]`)
  - 현재 로그인 세션 ID 또는 키 저장
- 로컬 저장: localStorage 기반 세션 유지
- 로그인 시 기존 계정 리스트에 추가 가능
- 로그아웃 시 단일 계정만 제거 가능

---

## 💡 추가 확장 기능

- 최근 접속 계정 표시
- 계정 별 설정 동기화
- 사용자 간 전환 시 비밀번호 재입력 설정

---

## 🔐 보안

- 모든 계정 전환 시 인증 상태 체크
- 민감 작업 전 전환 시 재인증(선택)

---

## ⏭️ 다음 작업 연결

- Task-22: 관리자 활동 분석 리포트 (주간/월간 관리자 활동 요약)


---

## 📄 o4o-web-server/tasks/22-admin-activity-report.md

<!-- From: o4o-web-server/tasks/22-admin-activity-report.md -->


# 🧾 Task 22: 관리자 활동 분석 리포트 시스템 구현

## 📌 목적
주간/월간 단위로 각 운영자의 주요 활동(상품 수정, 주문 관리, 사용자 관리 등)을 요약 분석하여 통계 리포트를 제공한다.

---

## ✅ 요구 기능

### 활동 리포트 항목
- 관리자별 활동 건수 (상품, 주문, 사용자)
- 총 작업 수, 변경 건수, 삭제 건수 등
- 가장 활발한 운영자 / 비활동 운영자
- 주간/월간 비교 차트

---

## ✅ 기능 요건

- 리포트 경로: `/admin/reports`
- 필터:
  - 기간: 주간, 월간, 사용자 지정
  - 역할별: superadmin, manager 등
- 통계 시각화:
  - 바 차트, 라인 차트, 파이 차트
  - 활동 건수 추이

---

## 🧱 구현 방식

- 로그 기반 분석: `/admin/logs` 데이터를 가공
- 상태 저장: `adminReportStore.ts`
- 차트 라이브러리: `Recharts`, `Chart.js` 등
- UI: `AdminReports.tsx` 페이지 내 TailwindCSS + 카드형 UI

---

## 💡 확장 포인트

- PDF 또는 CSV 리포트 다운로드
- 자동 리포트 이메일 발송
- 비활동 관리자 경고 또는 권한 변경 제안

---

## 🔐 보안

- `superadmin` 또는 `manager` 이상만 접근 가능
- 로그 기반으로만 집계 (신뢰성 확보)

---

## ⏭️ 다음 작업 연결

- Task-23: 관리자 시스템 설정 백업 및 복원 기능


---

## 📄 o4o-web-server/tasks/23-admin-backup-restore.md

<!-- From: o4o-web-server/tasks/23-admin-backup-restore.md -->


# 🧾 Task 23: 관리자 시스템 설정 백업 및 복원 기능 구현

## 📌 목적
관리자가 시스템 설정(테마, 알림, 권한, 환경설정 등)을 백업하고 복원할 수 있도록 기능을 제공하여 재설정 부담을 줄이고 안정적인 운영을 지원한다.

---

## ✅ 요구 기능

### 백업 항목
- 관리자 테마 설정 (다크/라이트)
- 알림 수신 설정
- 사용자 권한 구성
- 주소지/배송 설정
- 기타 운영환경 설정 (선택적)

### 기능 요건
- 설정 다운로드 버튼 → JSON 파일로 저장
- 설정 복원 버튼 → JSON 업로드 후 반영
- 복원 전 확인 다이얼로그

---

## 🧱 구현 방식

- 페이지: `/admin/settings` 또는 `/admin/settings/backup`
- 백업 구성:
  - 현재 상태(`adminSettingsStore`, `themeStore`, `adminAuthStore` 등) → JSON 변환
- 복원 구성:
  - 업로드된 JSON → 상태 적용 + localStorage 반영
- UI:
  - TailwindCSS로 구성된 버튼, 모달

---

## 💡 추가 포인트

- 자동 백업 주기 설정
- 클라우드 저장 연동 (예: Google Drive, AWS S3)
- 설정 버전 관리 (복원 시점 선택)

---

## 🔐 보안

- `superadmin`만 접근 가능
- JSON 내 민감 정보 암호화 필요 (선택)

---

## ⏭️ 다음 작업 연결

- Task-24: 시스템 운영 상태 모니터링 대시보드 (서버 상태, 요청 수 등)


---

## 📄 o4o-web-server/tasks/24-admin-system-monitor.md

<!-- From: o4o-web-server/tasks/24-admin-system-monitor.md -->


# 🧾 Task 24: 시스템 운영 상태 모니터링 대시보드 구현

## 📌 목적
운영자가 서버 및 애플리케이션 상태를 실시간으로 확인할 수 있도록 시스템 상태, 요청 수, 에러 로그 등을 한눈에 모니터링할 수 있는 대시보드를 제공한다.

---

## ✅ 요구 기능

### 모니터링 항목
- 서버 상태 (API 응답 상태, 속도)
- 요청 수 (1분/10분/1시간 단위)
- 에러 로그 요약 (HTTP 4xx/5xx 비율)
- DB 상태 (Ping, 연결 여부)
- 운영자 세션 수 (활성 관리자 수)

---

## 🧱 구현 방식

- 페이지: `/admin/system-monitor`
- 상태 관리: `adminMonitorStore.ts`
- 데이터 수집:
  - `GET /admin/system/status` (mock or 실시간 API)
  - 주기적 polling (5~10초)
- 시각화: Recharts 또는 카드 + 그래프 + 아이콘
- TailwindCSS UI 구성

---

## 💡 추가 포인트

- 알림: 에러 증가 또는 응답 지연 시 관리자 알림 전송
- 최근 에러 목록 (클릭 시 상세 로그로 이동)
- 모니터링 데이터 저장 여부 설정 (비활성화 가능)

---

## 🔐 보호

- 접근 권한: `superadmin` 전용
- 민감 데이터는 서버에서 필터링 후 전달

---

## ⏭️ 다음 작업 연결

- Task-25: 서비스 가동률 리포트 및 장애 리포트 자동화


---

## 📄 o4o-web-server/tasks/yaksa-deploy-task-01-react-build-serve.md

<!-- From: o4o-web-server/tasks/yaksa-deploy-task-01-react-build-serve.md -->


# 🛠️ Task: yaksa.site React 앱 빌드 및 정적 실행 확인

## 🎯 목적
502 Bad Gateway 문제를 해결하기 위해, React 앱이 빌드되어 있고 정적 파일이 serve 또는 pm2로 실행되고 있는지 확인하고, 실행되지 않았다면 serve로 재실행한다.

---

## ✅ 단계별 실행 요청

### 1. React 앱 빌드
```
yarn install
yarn build
```
또는
```
npm install
npm run build
```

> `build/` 디렉터리가 생성되어야 합니다.

---

### 2. 정적 서버 실행 (선택 1)

#### serve 사용
```
npx serve -s build -l 3000
```

또는

#### PM2로 실행
```
pm2 start npx --name yaksa-web -- serve -s build -l 3000
```

> pm2가 없을 경우:
```
npm install -g pm2
```

---

### 3. 확인
- 실행 후 `curl localhost:3000` 또는 `pm2 logs yaksa-web` 으로 정상 응답 확인
- Nginx 설정이 `proxy_pass http://localhost:3000;`으로 되어 있는지 별도 점검

---

## 📎 서버 점검 명령어 (수동 점검 시)

```bash
pm2 list
pm2 logs yaksa-web
ls -alh build/
cat /etc/nginx/sites-available/default
```

---

이 작업이 완료되면 yaksa.site는 외부에서 정상 접속 가능해야 합니다.


---

## 📄 o4o-web-server/tasks/yaksa-deploy-task-02-permanent-serve.md

<!-- From: o4o-web-server/tasks/yaksa-deploy-task-02-permanent-serve.md -->


# 🛠️ Task 02: yaksa.site 정적 앱을 안정적으로 실행되도록 설정

## 🎯 목적
yaksa.site를 언제 어디서 접속하더라도 포털 화면이 항상 표시되도록, React 앱을 정적 빌드 후 pm2를 통해 백그라운드에서 안정적으로 실행하고, 서버 재시작 시 자동 복구되도록 설정한다.

---

## ✅ 단계별 실행 절차

### 1. 정적 빌드
```bash
yarn install
yarn build
```
또는
```bash
npm install
npm run build
```

### 2. `serve`로 실행 테스트
```bash
npx serve -s build -l 3000
```

---

## ✅ 3. pm2 등록 및 영구 실행 설정

```bash
pm2 start npx --name yaksa-web -- serve -s build -l 3000
pm2 save
pm2 startup
```

> `pm2 startup` 명령이 출력하는 스크립트를 복사해서 sudo로 실행해야 합니다.  
예: `sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/... pm2 startup systemd -u ubuntu --hp /home/ubuntu`

---

## ✅ 4. Nginx 설정 확인

`/etc/nginx/sites-available/default` 또는 `nginx.conf`에 다음이 포함되어야 합니다:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

Nginx 설정 적용:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 확인 체크리스트

- 브라우저에서 https://yaksa.site 새로고침 시 계속 포털 화면 유지
- PM2 프로세스가 살아 있는지 `pm2 list`로 확인
- 서버 재부팅 후에도 자동 실행되는지 `reboot` 후 재확인

---

이 작업이 완료되면 yaksa.site는 항상 안정적으로 사용자에게 화면을 제공할 수 있습니다.


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-00-start.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-00-start.md -->


# 🧾 Task 00: yaksa.site 메인 포털 UI 구현 시작

## 🎯 목적
yaksa.site 포털의 메인화면을 시작으로 전체 사용자 진입 흐름과 서비스 분기를 위한 UI 개발을 개시한다.

> ⚠️ 이 Task 문서는 전체 구조를 설명하지만, **우선은 `/src/pages/Home.tsx`에 메인 포털 UI 구성부터 구현**하는 데 집중해주세요.

---

## ✅ 작업 위치 및 구조

### 📁 작업 경로
`Coding/o4o-platform/o4o-web-server/`

### 🧱 개발 환경
- React + TailwindCSS 기반 SPA
- 반응형 (모바일/PC 대응)
- 컴포넌트: `src/components/`, 페이지: `src/pages/`

---

## 📦 메인 포털 UI 요구사항 (`/`)

- 상단(Header):
  - 로고
  - 로그인 버튼
  - 관리자 진입 버튼

- 메인 블록 (카드 형태 진입):
  - 쇼핑몰 (일반) → `/shop`
  - 쇼핑몰 (약사) → `/yaksa-shop`
  - 포럼 → `/forum`
  - 펀딩 → `/funding`
  - 디지털사이니지 → `/signage`

- 하단(Footer):
  - 회사정보, 약관, 개인정보처리방침

- 반응형 Tailwind 레이아웃 사용
  - PC: 3단 그리드
  - 모바일: 세로 스택

---

## 🧩 컴포넌트 (함께 만들면 좋음)

- `<ServiceCard />`: 각 서비스 진입용 카드
- `<AppHeader />`: 로고, 로그인 버튼 포함
- `<ThemeToggle />`: 다크모드 토글 버튼 (옵션)

---

## 🔐 인증 관련 (지금은 제외)

- 로그인 버튼은 현재는 라우터 이동용 dummy로 처리
- 추후 Task-02에서 통합 인증 연동 구현 예정

---

## 🗂️ 참고 문서

- `docs/yaksa-site/wireframes/01-home-responsive-wireframe.md`
- `docs/yaksa-site/wireframes/07-common-ui-and-menu-structure.md`

---

## ⏭️ 이후 연결 Task

- Task-01: 로그인/회원가입 UI
- Task-02: ProtectedRoute 및 역할 분기 구조
- Task-03: 인증 서버 연동 (`auth.yaksa.site`)


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-01-main-ui.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-01-main-ui.md -->


# 🧾 Task 01: yaksa.site 메인 포털 초기 UI 구현

## 🎯 목적
yaksa.site의 첫 화면을 구성하여 사용자 유형별로 서비스로 진입할 수 있도록 포털 UI를 구현한다. (반응형, 로그인 진입 포함)

---

## ✅ 요구 기능

### 상단(Header)
- 로고 (텍스트 로고 or 자리표시)
- 로그인 버튼
- 관리자 진입 버튼

### 메인 영역 (서비스 진입 카드)
- 일반 사용자 → "쇼핑몰 (일반)" → `/shop`
- 약사(기업 사용자) → "쇼핑몰 (약사용)", "크라우드 펀딩", "포럼" 등
- 디지털사이니지 → 별도 카드
- 각 카드 클릭 시 해당 서비스 서브도메인으로 이동

### 하단
- 회사 정보 (약사닷컴), 이용약관, 개인정보처리방침 링크

---

## 📱 반응형 요구 사항

- TailwindCSS 사용
- PC 기준: 그리드형 카드 UI
- 모바일 기준: 수직 스택형 UI로 전환
- 카드 내부에 아이콘(임시) 및 설명 포함

---

## 🧩 구현 방식

- React 기반 SPA 페이지
- 파일 위치: `src/pages/Home.tsx`
- 컴포넌트 분리 가능: `components/ServiceCard.tsx`
- 서비스 목록은 배열로 관리 (확장성 고려)

---

## 🔐 인증/로그인 (추후 작업)

- 로그인 버튼은 현재 라우터 이동만
- 추후 `auth.yaksa.site` 연동 예정

---

## 📎 기타

- 로그인된 사용자 유형에 따라 홈 진입 시 자동 redirect 가능 (추후 처리)


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-02-auth-ui.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-02-auth-ui.md -->


# 🧾 Task 02: 로그인 및 회원가입 UI 구현

## 🎯 목적
yaksa.site 사용자(B2C, 약사, 관리자 포함)의 공통 로그인/회원가입 화면을 구현하고, 기본 인증 UI 흐름을 구성한다.

---

## ✅ 작업 위치

- 로그인 페이지: `src/pages/Login.tsx`
- 회원가입 페이지: `src/pages/Register.tsx`
- 상태 관리 파일: `src/store/authStore.ts` (초기화만 가능)
- 보호 라우트: `src/components/ProtectedRoute.tsx` (다음 Task로 분리 가능)

---

## 📋 구현 요구 사항

### 1. 로그인 화면 (`/login`)
- 이메일 / 비밀번호 입력
- 로그인 버튼
- 로그인 실패 메시지
- 라우팅 후 리디렉션은 현재 dummy 처리

### 2. 회원가입 화면 (`/register`)
- 이메일, 비밀번호, 이름
- 사용자 유형 선택 (일반 / 약사)
- 약사 선택 시 인증절차 또는 라벨 추가
- 약관 동의 체크박스

### 3. 공통 UI 요소
- Tailwind 기반 반응형 폼 UI
- 가운데 정렬된 카드형 로그인 박스
- `text-sm`, `bg-white`, `shadow-xl`, `rounded-xl` 등 활용

---

## 💡 인증 로직 처리
- 실제 로그인 요청은 아직 구현하지 않음
- 로그인 버튼 클릭 시 상태 저장 또는 토큰 mock 저장 가능
- 추후 `/auth.yaksa.site` 연동 예정

---

## 📎 참고 문서

- `docs/yaksa-site/wireframes/02-auth-ui-wireframe.md`
- `docs/yaksa-site/wireframes/09-ui-theme-system.md`


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-03-protected-route.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-03-protected-route.md -->


# 🧾 Task 03: ProtectedRoute 및 역할 기반 라우트 가드 구현

## 🎯 목적
yaksa.site에서 인증된 사용자만 특정 페이지에 접근하거나, 역할에 따라 접근 제어를 적용할 수 있도록 보호 라우트 구조를 구현한다.

---

## ✅ 작업 위치

- 인증 보호 컴포넌트: `src/components/ProtectedRoute.tsx`
- 역할 기반 보호 컴포넌트: `src/components/RoleProtectedRoute.tsx`
- 인증 상태 관리: `src/store/authStore.ts`

---

## 🔐 기본 기능 구현

### 1. `ProtectedRoute`
- 로그인 여부에 따라 children 또는 `/login`으로 리디렉션
- localStorage 또는 authStore 기준으로 인증 여부 판단

### 2. `RoleProtectedRoute`
- `roles` prop으로 허용된 역할 배열 지정
- 로그인 + 허용 역할 포함 → 접근 허용
- 그렇지 않으면 `/403` 또는 fallback 메시지 출력

---

## ✅ 사용 예시

```tsx
<ProtectedRoute>
  <MyPage />
</ProtectedRoute>

<RoleProtectedRoute roles={['admin', 'superadmin']}>
  <AdminDashboard />
</RoleProtectedRoute>
```

---

## 📋 상태 구조 예시 (authStore)

```ts
{
  token: string;
  role: 'b2c' | 'yaksa' | 'admin' | 'superadmin';
  isAuthenticated: boolean;
}
```

---

## 💡 참고 사항

- 로그인 후 상태는 이미 mock 또는 토큰 저장으로 처리 가능
- 라우트 보호는 SPA 구조 기준 (React Router `Outlet`, `useLocation()` 활용)

---

## 📎 참고 문서

- `docs/yaksa-site/wireframes/08-role-permissions.md`
- `docs/yaksa-site/wireframes/07-common-ui-and-menu-structure.md`


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-04-login-redirect.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-04-login-redirect.md -->


# 🧾 Task 04: 로그인 후 리디렉션 및 메뉴 상태 동기화 구현

## 🎯 목적
로그인 성공 후 사용자의 역할에 따라 자동으로 적절한 페이지로 이동시키고, 상단 네비게이션 등 UI에 로그인/로그아웃 상태를 반영한다.

---

## ✅ 작업 위치

- 상태 관리: `src/store/authStore.ts`
- 리디렉션 처리: `src/pages/Login.tsx` 또는 전역 `App.tsx`
- UI 연동:
  - 헤더: `src/components/AppHeader.tsx`
  - 메뉴 항목: 로그인 상태 및 역할에 따라 동적 표시

---

## 📦 기능 상세

### 1. 로그인 후 리디렉션
| 역할 | 리디렉션 경로 |
|------|----------------|
| b2c | `/shop` |
| yaksa | `/yaksa-shop` |
| admin / superadmin | `/admin/main` 또는 지정된 관리자 URL |

- 로그인 성공 시 역할(role)에 따라 자동 이동
- 상태에서 `role` 값 판단

### 2. 로그아웃 기능
- 로그아웃 버튼 클릭 시:
  - 상태 초기화 (`authStore`)
  - localStorage 초기화
  - `/login`으로 이동

### 3. 네비게이션 연동
- 로그인 상태에 따라 메뉴 변경:
  - [로그인] → [내 계정], [로그아웃]
  - 역할에 따라 관리자 진입 메뉴 보임 여부 조절

---

## 🔐 상태 구조 예시

```ts
{
  token: string;
  isAuthenticated: boolean;
  role: "b2c" | "yaksa" | "admin" | "superadmin";
  email: string;
}
```

---

## 📎 참고 문서

- `yaksa-portal-task-02-auth-ui.md`
- `yaksa-portal-task-03-protected-route.md`
- `docs/yaksa-site/wireframes/07-common-ui-and-menu-structure.md`


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-05-register-flow.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-05-register-flow.md -->


# 🧾 Task 05: 회원가입 흐름 구현 (약사 인증 포함)

## 🎯 목적
yaksa.site의 사용자 유형별로 회원가입 흐름을 분기하여, 소비자(B2C)와 약사(B2B)의 등록 절차를 구분한다. 약사는 면허번호 기반 인증 과정을 포함한다.

---

## ✅ 사용자 유형별 가입 흐름

### 👤 일반 사용자 (b2c)
- 방식: 이메일/비밀번호 또는 소셜 로그인
- 승인: 자동 승인 (가입 즉시 활성화)
- 가입 후 리디렉션: `/` (yaksa.site 홈)

### 🧑‍⚕️ 약사 사용자 (yaksa)
- 방식: 이메일/비밀번호 + **면허번호 입력**
- 확인: 초기에는 수동 전화 확인 (번호 필드 포함)
- 승인: 관리자가 직접 승인 (가입 직후 상태는 `pending`)
- 가입 후 리디렉션: 승인 대기 안내 or 로그인 페이지

---

## 📋 UI 구성 항목 (`/register`)
- 이름, 이메일, 비밀번호
- 사용자 유형 선택 (`b2c`, `yaksa`)
- 약사 선택 시:
  - 면허번호 입력 필드
  - 전화번호 입력 필드
- 이용약관/개인정보 수집 동의 체크박스
- 등록 버튼 (`submit`)

---

## 🔐 상태/역할 관리

- `authStore.ts`에서 `role`, `status` 필드 추가
- 가입 성공 시 role에 따라 다른 흐름 적용
- 약사는 `status = 'pending'` → 이후 관리자가 승인

---

## 🧩 추가 연동 고려 (추후 Task)

- 관리자 승인 대시보드
- 전화번호 인증 (나중에 도입 예정)
- 약사 DB 연동을 통한 실시간 면허번호 검증 (추후)

---

## 📎 참고 문서

- `02-auth-ui-wireframe.md`
- `08-role-permissions.md`


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-06-yaksa-protection.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-06-yaksa-protection.md -->


# 🧾 Task 06: 승인 대기 상태 처리 및 약사용 페이지 접근 제한

## 🎯 목적
yaksa.site에서 약사 회원이 가입 후 승인 대기 상태일 때는 일반 사용자로 로그인할 수 있도록 허용하지만, 약사용 페이지에 접근 시 경고 메시지를 보여주고 이동을 제한한다.

---

## ✅ 처리 규칙

### 1. 승인 대기 중 사용자
- 상태: `role = 'b2c'`, `yaksaStatus = 'pending'` (authStore 기준)
- 로그인은 가능
- 약사용 페이지 접근은 제한 (`yaksa` 권한 필요)

---

## 📋 구현 항목

### ✅ 약사용 보호 라우트 구성
- `YaksaProtectedRoute.tsx` 생성
- 조건:
  - `role !== 'yaksa'` → 경고 메시지 표시
  - "약사 인증이 필요합니다. 홈으로 이동합니다."  
  - 3초 후 이전 페이지 or `/` 로 이동

### ✅ 사용 위치 예시

```tsx
<YaksaProtectedRoute>
  <YaksaShop />
</YaksaProtectedRoute>
```

---

## 💡 UX 설계
- 경고 메시지 출력용 컴포넌트 분리 (`<AccessDenied />`)
- 리디렉션 타이머: `setTimeout(() => navigate(-1), 3000);` or `navigate("/")`
- Tailwind 기반 메시지 스타일링

---

## 📦 상태 구조 예시 (authStore.ts)

```ts
{
  role: 'b2c' | 'yaksa' | 'admin',
  yaksaStatus: 'pending' | 'approved' | null
}
```

---

## 📎 참고 문서

- `yaksa-portal-task-03-protected-route.md`
- `yaksa-portal-task-05-register-flow.md`
- `docs/yaksa-site/wireframes/08-role-permissions.md`


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-07-admin-approval.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-07-admin-approval.md -->


# 🧾 Task 07: 관리자 승인 대시보드 (약사 인증 처리)

## 🎯 목적
yaksa.site에서 가입한 약사 사용자 중 '승인 대기' 상태(`yaksaStatus = 'pending'`)인 계정을 관리자가 승인하거나 거절할 수 있는 관리 UI를 구현한다.

---

## ✅ 작업 경로

- 페이지 파일: `src/pages/admin/YaksaApprovals.tsx`
- 보호 라우트: `<RoleProtectedRoute roles={['superadmin']}>`
- 상태 관리/연동: mock 데이터 기반 또는 `authStore` 확장

---

## 📋 화면 구성

### 1. 대시보드 테이블

| 항목 | 설명 |
|------|------|
| 이름 | 사용자 이름 |
| 이메일 | 가입 시 입력된 이메일 |
| 면허번호 | 가입 시 입력된 약사 면허번호 |
| 전화번호 | 연락용 |
| 상태 | `pending` |
| 액션 | [승인] [거절] 버튼

### 2. 승인 버튼 클릭 시
- 사용자 상태를 `yaksaStatus = 'approved'`, `role = 'yaksa'`로 변경
- 메시지: "승인 완료되었습니다"

### 3. 거절 시
- 사용자 제거 또는 `yaksaStatus = 'rejected'`
- 선택적으로 사유 입력 (추후 확장)

---

## 🧱 Tailwind 기반 UI
- 카드 또는 테이블 형태
- 버튼 색상: 승인 `bg-green-500`, 거절 `bg-red-500`
- 상태 뱃지: `text-yellow-600`, `text-green-600`

---

## 🔐 보호 및 조건

- 이 페이지는 `superadmin` 전용
- 인증된 관리자만 접근 가능 (`RoleProtectedRoute` 적용)

---

## 📎 참고 문서

- `yaksa-portal-task-05-register-flow.md`
- `yaksa-portal-task-06-yaksa-protection.md`
- `docs/yaksa-site/wireframes/08-role-permissions.md`


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-08-dashboard.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-08-dashboard.md -->


# 🧾 Task 08: 약사 계정 전용 대시보드 (`/yaksa/dashboard`)

## 🎯 목적
약사 로그인 사용자가 자신의 활동을 요약 확인할 수 있는 전용 대시보드를 구성한다.

## ✅ 경로 및 보호
- 페이지: `src/pages/yaksa/Dashboard.tsx`
- 보호: `<YaksaProtectedRoute />`

## 🧩 표시 요소
- 최근 주문 3건
- 참여 중인 펀딩 3건
- 최신 알림 5개
- 내 계정으로 이동 버튼

## 🧱 스타일
- 카드형 요약 UI
- Tailwind 기반 반응형 레이아웃


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-09-notifications.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-09-notifications.md -->


# 🧾 Task 09: 약사 전용 알림 센터 (`/yaksa/notifications`)

## 🎯 목적
약사 사용자가 수신한 알림을 목록으로 관리하고, 상태를 확인할 수 있도록 구성한다.

## ✅ 경로 및 보호
- 페이지: `src/pages/yaksa/Notifications.tsx`
- 보호: `<YaksaProtectedRoute />`

## 🧩 기능
- 알림 목록 (최신순)
- 읽음/안읽음 구분
- 클릭 시 관련 페이지 이동
- "모두 읽음 처리" 버튼

## 🧱 상태 관리
- `yaksaNotificationStore.ts` 또는 공통 store 확장


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-10-profile.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-10-profile.md -->


# 🧾 Task 10: 약사 내 정보(프로필) 페이지 (`/yaksa/profile`)

## 🎯 목적
약사 사용자가 자신의 개인정보를 확인하고 수정할 수 있도록 UI를 제공한다.

## ✅ 경로 및 보호
- 페이지: `src/pages/yaksa/Profile.tsx`
- 보호: `<YaksaProtectedRoute />`

## 🧩 정보 항목
- 이름, 이메일, 전화번호, 면허번호
- 비밀번호 변경
- 로그아웃 버튼

## 🧱 스타일
- 가운데 정렬 폼 카드
- Tailwind 기반 폼 UI


---

## 📄 o4o-web-server/tasks/yaksa-portal-task-11-router-setup.md

<!-- From: o4o-web-server/tasks/yaksa-portal-task-11-router-setup.md -->


# 🧾 Task 11: yaksa.site 전체 라우터 구성 및 연결

## 🎯 목적
지금까지 정의된 페이지 컴포넌트를 실제 라우팅 시스템에 연결하여, 사용자가 URL로 접근할 수 있도록 라우터를 설정한다.

---

## ✅ 라우터 설정 파일
- 위치: `src/routes/index.tsx` 또는 `App.tsx` 내 React Router 설정

---

## 🔌 연결할 경로 및 보호 구조

| 경로 | 컴포넌트 | 보호 방식 |
|------|-----------|------------|
| `/` | `<Home />` | 공개 |
| `/login` | `<Login />` | 공개 |
| `/register` | `<Register />` | 공개 |
| `/shop` | `<Shop />` | `<ProtectedRoute />` |
| `/yaksa-shop` | `<YaksaShop />` | `<YaksaProtectedRoute />` |
| `/yaksa/dashboard` | `<Dashboard />` | `<YaksaProtectedRoute />` |
| `/yaksa/notifications` | `<Notifications />` | `<YaksaProtectedRoute />` |
| `/yaksa/profile` | `<Profile />` | `<YaksaProtectedRoute />` |
| `/admin/yaksa-approvals` | `<YaksaApprovals />` | `<RoleProtectedRoute roles={['superadmin']}>` |

---

## 🧱 구현 가이드

### 1. Router 구조 예시 (React Router v6)

```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  <Route path="/shop" element={
    <ProtectedRoute><Shop /></ProtectedRoute>
  } />
  <Route path="/yaksa-shop" element={
    <YaksaProtectedRoute><YaksaShop /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/dashboard" element={
    <YaksaProtectedRoute><Dashboard /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/notifications" element={
    <YaksaProtectedRoute><Notifications /></YaksaProtectedRoute>
  } />
  <Route path="/yaksa/profile" element={
    <YaksaProtectedRoute><Profile /></YaksaProtectedRoute>
  } />
  <Route path="/admin/yaksa-approvals" element={
    <RoleProtectedRoute roles={['superadmin']}>
      <YaksaApprovals />
    </RoleProtectedRoute>
  } />
</Routes>
```

---

## 📎 참고 문서

- `yaksa-portal-task-00-start.md`
- `yaksa-portal-task-03-protected-route.md`
- `yaksa-portal-task-06-yaksa-protection.md`
- `yaksa-portal-task-07-admin-approval.md`


---

## 📄 o4o-web-server/tasks/yaksa-web-task-01-convert-app-to-home.md

<!-- From: o4o-web-server/tasks/yaksa-web-task-01-convert-app-to-home.md -->


# 🧾 yaksa-web-task-01-convert-app-to-home.md

## 🎯 목적
현재 yaksa.site의 Vite + React 프로젝트 구조는 기본 JavaScript 템플릿 상태입니다. 이 구조를 TypeScript 기반으로 전환하고, 포털 홈 UI(Home.tsx)를 진입점으로 설정합니다.

---

## ✅ 변경 요청 내용

### 1. 파일 구조 변경 (JS → TS)

| 기존 | 변경 후 |
|------|----------|
| `src/App.jsx` | `src/App.tsx` |
| `src/main.jsx` | `src/main.tsx` |
| `vite.config.js` | `vite.config.ts` |

---

### 2. 신규 파일 생성

```bash
src/pages/Home.tsx
```

내용 예시:
```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">yaksa.site 포털에 오신 것을 환영합니다</h1>
    </main>
  );
}
```

---

### 3. TypeScript 지원 설정

- `tsconfig.json` 생성
- `vite.config.ts`에 타입 설정 포함
- 다음 패키지 설치:

```bash
npm install -D typescript @types/react @types/react-dom @types/react-router-dom
```

---

### 4. 진입점 교체

`App.tsx`에서 `Home.tsx`를 기본으로 렌더링:

```tsx
import Home from "./pages/Home";

export default function App() {
  return <Home />;
}
```

---

### 5. 테스트 및 빌드

```bash
npm run build
pm2 restart yaksa-web
```

---

## 🔁 결과 기대

- TypeScript 기반의 Vite + React 구조로 전환 완료
- 포털 홈(Home.tsx)이 yaksa.site에 정상 표시
- 향후 모든 페이지를 `.tsx`로 개발 가능



---

## 📄 o4o-web-server/tests/test-01-initial-test-environment.md

<!-- From: o4o-web-server/tests/test-01-initial-test-environment.md -->


# 🧪 Test 01: 초기 테스트 환경 구성 문서

## 🎯 목적
o4o-platform의 주요 사용자 흐름과 관리자 기능을 통합적으로 점검할 수 있는 테스트 환경을 구성하기 위함입니다.

---

## ✅ 테스트 계정 정보

### 사용자 계정
- 이메일: testuser@example.com
- 비밀번호: test1234
- 역할: 일반 사용자
- 용도: 상품 탐색, 장바구니, 주문 테스트

### 관리자 계정
- 이메일: admin@super.com
- 비밀번호: admin1234
- 역할: superadmin
- 용도: 전체 관리자 패널 기능 점검

---

## 📦 테스트 데이터 샘플

### 테스트 상품
- 상품명: 테스트 혈당기 A
- 가격: 25,000원
- 재고: 100개
- 설명: 테스트용 기본 상품입니다.
- 생성 위치: /admin/products 또는 DB seed 스크립트

### 테스트 주문
- 주문번호: 자동 생성됨
- 사용자는 testuser@example.com
- 결제 상태: unpaid 또는 mock paid
- 확인 위치: /orders 또는 /admin/orders

---

## 🧭 점검 경로 목록 (우선 점검 대상)

| 항목 | 경로 |
|------|------|
| 사용자 상품 목록 | `/shop` |
| 상품 상세 페이지 | `/product/:id` |
| 장바구니 | `/cart` |
| 결제 페이지 | `/checkout` |
| 주문 완료 화면 | `/order/confirmation` |
| 주문 내역 페이지 | `/orders`, `/orders/:id` |
| 관리자 로그인 | `/admin/login` |
| 관리자 대시보드 | `/admin/dashboard` |
| 관리자 상품 관리 | `/admin/products` |
| 관리자 주문 관리 | `/admin/orders`, `/admin/orders/:id` |
| 관리자 사용자 관리 | `/admin/users` |

---

## 🛠️ 테스트 주의사항

- mock 데이터를 사용한 경우 상태 동기화 필요
- 관리자 보호 라우트가 적용되어 있어 권한 확인 필수
- localStorage에 JWT/token이 남아 있을 수 있음 → 브라우저 새로고침 후 확인

---

## 🧪 다음 테스트 문서

- `test-02-user-flow-checklist.md` (사용자 구매 흐름 점검 시나리오)
- `test-03-admin-panel-checklist.md` (관리자 기능별 UI/데이터 반응 점검)


---

## 📄 o4o-web-server/tests/test-02-user-flow-checklist.md

<!-- From: o4o-web-server/tests/test-02-user-flow-checklist.md -->


# ✅ Test 02: 사용자 구매 흐름 테스트 체크리스트

## 🎯 목적
사용자가 상품을 탐색하고 장바구니 → 결제 → 주문 확인까지 구매 흐름이 자연스럽게 작동하는지 전반적인 테스트를 진행한다.

---

## 🧪 테스트 시나리오 체크리스트

### 1. 로그인 (선택)
- [ ] 로그인 없이도 상품 탐색이 가능한가?
- [ ] 로그인한 상태에서 장바구니와 주문이 정상 작동하는가?

### 2. 상품 목록 (`/shop`)
- [ ] 상품 카드가 로드되고 제목/가격/이미지가 보이는가?
- [ ] 상품 클릭 시 상세 페이지로 이동하는가?

### 3. 상품 상세 (`/product/:id`)
- [ ] 상품 상세 정보(설명, 가격, 썸네일)가 정상 출력되는가?
- [ ] "장바구니에 담기" 버튼이 정상 작동하는가?
- [ ] 담기 후 `/cart`로 이동되는가?

### 4. 장바구니 (`/cart`)
- [ ] 담은 상품이 목록에 표시되는가?
- [ ] 수량 조절 버튼이 동작하는가?
- [ ] 상품 삭제 버튼이 동작하는가?
- [ ] 총합 계산이 정확한가?
- [ ] "결제하기" 버튼 클릭 시 `/checkout`으로 이동되는가?

### 5. 결제 (`/checkout`)
- [ ] 배송지 정보 입력이 가능한가?
- [ ] 주문 완료 시 서버에 전송되며 `/order/confirmation`으로 이동되는가?

### 6. 주문 확인 (`/order/confirmation`)
- [ ] 주문 번호, 금액, 날짜가 표시되는가?
- [ ] "주문 내역 보기" 버튼이 작동하는가?

### 7. 주문 내역 (`/orders`, `/orders/:id`)
- [ ] 최근 주문 목록이 출력되는가?
- [ ] 클릭 시 주문 상세 정보가 출력되는가?

---

## 🛠️ 기타 테스트

- [ ] 새로고침 후 장바구니/주문 정보 유지 확인
- [ ] localStorage에서 사용자 토큰 확인 및 제거 시 로그아웃 반응

---

## ⏭️ 다음 문서

- `test-03-admin-panel-checklist.md` (관리자 기능 점검 시나리오)


---

## 📄 o4o-web-server/tests/test-03-admin-panel-checklist.md

<!-- From: o4o-web-server/tests/test-03-admin-panel-checklist.md -->


# ✅ Test 03: 관리자 패널 기능 점검 체크리스트

## 🎯 목적
관리자 패널의 로그인, 인증, 상품/주문/사용자 관리 등 모든 기능이 실제로 작동하는지 기능별로 테스트하고 점검한다.

---

## 🧪 테스트 체크리스트

### 1. 로그인/인증
- [ ] `/admin/login`에서 로그인 시 인증 상태가 유지되는가?
- [ ] 관리자 계정 role에 따라 보호 라우트가 작동하는가?
- [ ] 로그인 후 대시보드(`/admin/dashboard`)로 이동되는가?

### 2. 네비게이션 및 접근 권한
- [ ] 역할(role)에 따라 메뉴가 다르게 보이는가?
- [ ] 접근 권한이 없는 페이지에 접근 시 `/403` 또는 안내 메시지가 표시되는가?

### 3. 대시보드 (`/admin/dashboard`)
- [ ] 통계 카드 및 차트가 보이고, mock 또는 API 데이터를 표시하는가?
- [ ] 실시간 대시보드 데이터가 일정 간격으로 업데이트되는가?

### 4. 상품 관리 (`/admin/products`)
- [ ] 상품 목록이 보이는가?
- [ ] 상품 등록 버튼이 동작하며 모달이 열리는가?
- [ ] 등록/수정/삭제 버튼이 정상 작동하는가?

### 5. 주문 관리 (`/admin/orders`, `/admin/orders/:id`)
- [ ] 주문 리스트가 보이고, 각 주문의 상태 변경이 가능한가?
- [ ] 상세 페이지에서 주문 정보가 정확히 표시되는가?

### 6. 사용자 관리 (`/admin/users`)
- [ ] 사용자 리스트가 보이는가?
- [ ] 차단, 삭제, 역할 변경 기능이 정상 동작하는가?
- [ ] 본인(superadmin)을 제외한 사용자만 역할 변경 가능한가?

### 7. 감사 로그 (`/admin/logs`)
- [ ] 주요 작업이 로그로 기록되는가?
- [ ] 로그 테이블에서 필터 및 검색 기능이 동작하는가?
- [ ] 로그는 `superadmin`만 열람 가능한가?

### 8. 설정 페이지 (`/admin/settings`)
- [ ] 관리자 정보 수정 폼이 작동하는가?
- [ ] 테마 설정(다크/라이트)이 전역 적용되는가?
- [ ] 알림 수신 항목 설정이 저장되고 연동되는가?

### 9. 알림 시스템
- [ ] 벨 아이콘 알림 뱃지가 보이는가?
- [ ] 알림 클릭 시 관련 페이지로 이동되는가?
- [ ] 모두 읽음 버튼이 동작하는가?

### 10. 백업/복원 (`/admin/settings/backup`)
- [ ] 설정 백업(JSON 저장)이 가능한가?
- [ ] 설정 복원(JSON 업로드 및 반영)이 가능한가?

---

## 🛠️ 추가 확인 사항

- [ ] 관리자 간 전환(다중 로그인) 기능이 작동하는가?
- [ ] 시스템 모니터링 페이지(`/admin/system-monitor`)가 작동하는가?
- [ ] 설정이 localStorage와 상태에 일관되게 반영되는가?

---

## ⏭️ 다음 테스트 문서
- 필요 시 Task별 테스트 케이스 문서로 분할 예정


---

## 📄 o4o-web-server/tests/test-04-results-log.md

<!-- From: o4o-web-server/tests/test-04-results-log.md -->


# 🧾 Test 04: 테스트 결과 기록 로그

## 🎯 목적
테스트 수행 후 발생한 결과, 성공/실패 여부, 확인된 버그 및 특이사항을 기록하여 QA 및 개발 피드백에 활용한다.

---

## 📅 테스트 정보

- 테스트 일자: [작성자 입력]
- 테스트 환경:
  - 브라우저: Chrome / Firefox / Safari / Edge
  - 디바이스: PC / 모바일
  - 백엔드 API 상태: Local / Staging / Production

---

## ✅ 테스트 요약 결과

| 테스트 항목 | 경로/기능 | 결과 | 비고 |
|-------------|-----------|-------|------|
| 로그인 동작 확인 | `/admin/login` | ✅ 성공 | - |
| 장바구니 담기 | `/product/:id → /cart` | ❌ 실패 | 수량 조절 오류 발생 |
| 주문 완료 | `/checkout → /order/confirmation` | ✅ 성공 | mock 상태로 확인 |
| 관리자 권한 제한 | `/admin/users` | ✅ 성공 | viewer 접근 제한 확인 |
| 설정 복원 기능 | `/admin/settings/backup` | ❌ 실패 | JSON 포맷 오류 발생 |

※ ✅ 성공 / ❌ 실패 / ⚠️ 일부 오류

---

## 🛠️ 상세 이슈 및 재현 경로

### 이슈 1: 장바구니 수량 조절 오류
- 발생 위치: `/cart`
- 증상: 수량 - 버튼 클릭 시 0 이하로 내려감
- 예상 원인: 수량 제한 조건 누락
- 스크린샷/콘솔 로그: [첨부]

### 이슈 2: 설정 복원 시 JSON 파싱 오류
- 발생 위치: `/admin/settings/backup`
- 증상: 복원 버튼 클릭 후 'undefined key' 오류 발생
- 재현 조건: 잘못된 필드명이 포함된 JSON 업로드

---

## 📌 기타 참고 사항

- [ ] QA 후 버그 티켓 생성 여부 확인
- [ ] 개발팀과의 공유 일정: ___
- [ ] 추후 회의용 발표자료 준비 여부: ___

---

## ⏭️ 다음 기록 문서
- `test-05-user-feedback-log.md` (사용자 피드백 기반 개선점 정리)


---

## 📄 yaksa-site/o4o-web-server-handoff.md

<!-- From: yaksa-site/o4o-web-server-handoff.md -->

# o4o-web-server 프론트엔드 개발 전달 문서

## 🎯 목적
이 문서는 현재까지 완료된 관리자 백엔드 기능 기반으로, 이제 사용자/판매자 중심의 프론트엔드 UI 개발을 `o4o-web-server`에서 이어가기 위한 안내 및 인수 문서입니다.  
프론트엔드는 실질적으로 다양한 사용자(소비자, 판매자, 참여자 등)가 접속하고 상호작용하는 핵심 인터페이스입니다.

---

## ✅ 현재까지의 작업 상황

### 1. 백엔드 (`o4o-api-server`) / 관리자 UI
- 관리자 상품/주문/계정 관리 기능: ✅ 완료
- 관리자 인증 및 역할 기반 보호: ✅ 적용
- Medusa Admin API 연동: ✅ 완료
- 경로: `services/ecommerce/admin`

---

## ⏭️ 다음 작업: `o4o-web-server`에서 프론트엔드 화면 구축

### 2. 사용자/판매자 중심 프론트 UI (개발 위치: `o4o-web-server`)
- 프레임워크: React (or Next.js 등 CSR 기반)
- API 연동: Medusa Store API (`/store/*`) + 백엔드 인증 포함

---

## 👥 주요 사용자 그룹

| 사용자 유형 | 설명 | 인증 수단 |
|-------------|------|------------|
| 고객 (user) | 상품 탐색, 장바구니, 결제, 주문 확인 | customer JWT |
| 판매자 (seller) | 상품 등록, 주문 처리, 정산 보기 등 | seller JWT |
| 관리자 (admin) | 이미 별도 admin UI에서 구현 완료 | admin JWT (별도 서버)

---

## 🛠️ 구현이 필요한 프론트 UI 예시

| 경로 | 설명 |
|------|------|
| `/shop` | 상품 목록 |
| `/product/:id` | 상품 상세 |
| `/cart`, `/checkout` | 장바구니 및 결제 |
| `/orders`, `/orders/:id` | 주문 목록 및 상세 |
| `/login`, `/register`, `/profile` | 사용자 인증 및 정보 수정 |
| `/seller/login`, `/seller/dashboard`, `/seller/products` | 판매자 전용 대시보드 |

---

## 🔐 인증 정책 요약

| 역할 | 토큰 | 저장소 |
|------|------|--------|
| 사용자 | customer JWT | localStorage (`jwt`) |
| 판매자 | seller JWT | localStorage (`seller_jwt`) |
| 관리자 | admin JWT | localStorage (`admin_jwt`) - 이미 별도 구현됨

---

## 📌 현재 구현된 사항 (참고용)

- 관리자 기능은 전체 구현 완료 상태
- 프론트엔드는 기본 구조만 존재하거나 아직 작업되지 않음
- Medusa API 연동은 준비 완료

---

## 📎 문서 기반 개발 흐름
- 문서 위치: `Coding/o4o-platform/docs/ui-tasks/`
- 각 기능별 Task 문서를 기반으로 구현 → 완료 시 Task-Result 문서로 정리됨

---

## ✅ 다음 시작점 제안 (o4o-web-server에서 Cursor에 요청)

> “Task-01: 사용자 상품 목록 `/shop`을 Medusa API와 연동해서 카드형 UI로 만들어줘. 로그인 없이 접근 가능하게 하고, Tailwind를 사용해 스타일도 적용해줘.”

---

이 문서를 o4o-web-server 작업 공간에 전달하고, 이후 UI 기반 프론트엔드 흐름을 이어가면 됩니다.

---

## 📄 yaksa-site/wireframes/01-home-responsive-wireframe.md

<!-- From: yaksa-site/wireframes/01-home-responsive-wireframe.md -->


# 🧭 Wireframe 01: yaksa.site 메인 포털 반응형 UI 설계

## 🎯 목적
yaksa.site의 첫 화면(포털)을 반응형으로 설계하여 사용자 유형별로 서비스 진입이 가능한 최신형 레이아웃을 구성한다.

---

## ✅ 페이지 목적

- 다양한 서비스로 연결되는 중앙 게이트웨이
- 사용자 유형별 분리 진입
- 로그인 및 관리자 진입 포함
- 모바일과 데스크탑 모두 대응

---

## 🧱 전체 레이아웃 구성

### 1. 헤더 (고정)
- 로고 (텍스트 또는 로고 아이콘)
- 로그인 버튼 (우측 상단)
- 관리자 진입 버튼 (더보기 메뉴 또는 우측 상단)

### 2. 메인 그리드 영역
- **그리드 구성 (PC 기준):**
  - 3컬럼 카드 UI (Tailwind `grid-cols-3`, `gap-6`)
- **카드 항목 예시:**
  - 쇼핑몰 (일반) → `/shop`
  - 쇼핑몰 (약사용) → `/yaksa-shop`
  - 크라우드펀딩 → `fund.yaksa.site`
  - 약사 포럼 → `forum.yaksa.site`
  - 디지털사이니지 → `signage.yaksa.site`

### 3. 모바일 대응
- Tailwind 기준: `grid-cols-1`, 카드 위→아래 배치
- 카드 항목은 더 크게, 설명은 요약
- 햄버거 메뉴 또는 드롭다운으로 메뉴 접근

---

## 💡 시각적 요소 설계 가이드

- **카드 스타일**
  - soft shadow (`shadow-xl`, `rounded-2xl`)
  - 배경 blur 또는 미묘한 그라디언트
  - hover 시 scale up 애니메이션

- **폰트**
  - 제목: `text-xl` 또는 `text-2xl`, 간결하고 큼직하게
  - 설명: `text-sm` 또는 `text-base`, 부드럽고 간략히

- **컬러 테마**
  - 초기: Light 테마 기준
  - 추후 다크모드 지원 위해 Tailwind `dark:` 구조 설계

---

## 📎 Tailwind 예시 코드 블록 (카드)

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="p-6 rounded-2xl shadow-xl bg-white hover:scale-105 transition-all cursor-pointer">
    <h3 className="text-xl font-semibold mb-2">쇼핑몰 (일반)</h3>
    <p className="text-sm text-gray-600">Yaksa 전용 소비자 쇼핑몰입니다.</p>
  </div>
</div>
```

---

## 📌 확장 시 고려 사항

- 로그인 후 역할에 따라 자동 redirect 또는 카드 강조
- 관리자/약사 등 사용자 구분 스타일 처리
- Figma MCP 설계와 연동 가능



---

## 📄 yaksa-site/wireframes/02-auth-ui-wireframe.md

<!-- From: yaksa-site/wireframes/02-auth-ui-wireframe.md -->


# 🔐 Wireframe 02: yaksa.site 인증 UI 흐름 설계

## 🎯 목적
yaksa.site의 다양한 사용자(B2C, B2B, 관리자)가 하나의 로그인 시스템을 통해 적절한 서비스로 진입할 수 있도록 인증 UI 및 흐름을 설계한다.

---

## ✅ 주요 경로 및 구성

### 1. 로그인 페이지 (`/login`)
- 이메일 / 비밀번호 입력
- 로그인 버튼
- 사용자 유형 자동 감지 또는 선택 드롭다운
- 로그인 실패 메시지
- "계정이 없으신가요?" → 회원가입 이동

### 2. 회원가입 페이지 (`/register`)
- 기본 항목: 이름, 이메일, 비밀번호, 사용자 유형 선택(B2C, 약사)
- 약사용 계정일 경우 인증 절차 추가 예정
- 이용약관 체크박스
- 등록 완료 후 자동 로그인 → 적절한 홈 리디렉션

### 3. 로그인 후 흐름

| 역할 | 리디렉션 경로 |
|------|----------------|
| 일반 사용자 | `/shop` |
| 약사 사용자 | `/yaksa-shop` |
| 관리자 | `admin.yaksa.site/main` 또는 역할별로 분기됨 |

---

## 🔐 인증 방식

- OAuth2 + JWT 기반 예상 (예: `auth.yaksa.site`)
- 로그인 시 localStorage에 token 저장
- 로그인 상태에 따라 상단 네비게이션 구성 변화

---

## 🧱 UI 컴포넌트 구성

- `LoginForm.tsx`
- `RegisterForm.tsx`
- `ProtectedRoute.tsx`
- 로그인 상태 context 또는 Zustand 활용 (`authStore.ts`)

---

## 💡 시각 구성 가이드 (Tailwind 기준)

- 양쪽 가운데 정렬된 카드형 UI (`max-w-md`, `rounded-xl`, `shadow-xl`)
- 다크/라이트 테마 대응 (`dark:bg-gray-900`)
- 비밀번호 입력: 보기 전환 버튼 포함
- 에러 메시지: `text-red-500`, success 메시지: `text-green-600`

---

## 📎 인증 흐름 요약도 (MVP 기준)

```
[로그인 페이지]
     ↓ 성공
[토큰 발급 → 상태 저장]
     ↓
[역할 판별 → 경로 리디렉션]
```


---

## 📄 yaksa-site/wireframes/03-mobile-entry-flow.md

<!-- From: yaksa-site/wireframes/03-mobile-entry-flow.md -->


# 📱 Wireframe 03: yaksa.site 모바일 진입 흐름 설계

## 🎯 목적
yaksa.site를 모바일 웹앱 기반으로 사용할 때 사용자(B2C, B2B, 관리자)가 효율적으로 진입하고 사용할 수 있도록 모바일 흐름을 설계한다.

---

## ✅ 초기 진입 시나리오

### 1. 도메인 접속
- `/` → 모바일 레이아웃으로 자동 전환 (Tailwind 기준 `sm:` 이하)
- 최상단에 "서비스 선택 카드" 목록

### 2. 사용자 유형 선택
- [ ] 일반 사용자
- [ ] 약사(기업 사용자)
- [ ] 관리자

> 선택 시 localStorage 또는 상태에 유형 저장 (선택적)

### 3. 로그인 유도 또는 자동 로그인
- 로그인되어 있으면 → 바로 리디렉션
- 로그인 안 되어 있으면 → `/login`으로 이동

---

## 📱 모바일 전용 구성 요소

### A. 카드형 진입
- 세로 스택 카드 UI
- 각 카드 아이콘 + 제목 + 설명
- 클릭 시 해당 도메인/서브서비스로 이동

### B. 하단 고정 메뉴 (선택)
- 홈 / 알림 / 계정 / 설정 (모바일앱과 유사한 하단 탭)

### C. 슬라이드 진입 또는 스플래시
- 약사닷컴 로고 간단히 보여주는 진입 스플래시 (2초)
- 첫 사용자에게만 보여주기 (localStorage flag)

---

## 🧱 기술 구성

- Tailwind + `sm:` 기준 반응형 처리
- 모바일 friendly 버튼 (`min-h-[48px]`, `text-base`, `px-6`)
- 상단 고정 요소는 `sticky top-0 z-50`

---

## 💡 기타 확장 고려

- PWA 등록 대응 (`Add to Homescreen`)
- 카메라/위치 사용 권한 안내
- QR 스캔 기능 연동 (약국 전용 기능에 활용 가능)


---

## 📄 yaksa-site/wireframes/04-funding-ui-wireframe.md

<!-- From: yaksa-site/wireframes/04-funding-ui-wireframe.md -->


# 💡 Wireframe 04: 크라우드펀딩 서비스 UI 흐름 설계

## 🎯 목적
yaksa.site 포털의 핵심 서비스 중 하나인 약사 대상 크라우드펀딩 플랫폼의 주요 화면 흐름 및 반응형 UI 구성을 설계한다.

---

## ✅ 주요 경로 구성

| 경로 | 설명 |
|------|------|
| `/funding` | 펀딩 메인 리스트 |
| `/funding/:id` | 펀딩 상세 페이지 |
| `/funding/create` | 펀딩 등록 페이지 (약사 전용) |
| `/funding/profile` | 내가 개설한 펀딩 내역 |

---

## 🧱 UI 구성 요소

### 1. 펀딩 메인 페이지 (`/funding`)
- 인기 프로젝트 슬라이드 (가로 스크롤 카드)
- 최신 펀딩 리스트 (카드형)
- 카테고리 필터 (예: 의료기기, 서비스, 약국경영)

### 2. 펀딩 상세 (`/funding/:id`)
- 제목, 이미지, 남은 기간, 목표금액, 현재 모금액
- 참여 버튼 + 참여자 수, 응원 메시지
- 상세 설명 (Rich Text)
- 댓글 영역 (선택)

### 3. 펀딩 등록 (`/funding/create`)
- 제목, 설명, 목표 금액, 마감일, 썸네일 업로드
- 약사만 접근 가능 (약사 인증 또는 `role === 'yaksa'`)
- 등록 후 `/funding/:id`로 이동

### 4. 프로필/내 펀딩 목록
- 내가 등록한 펀딩 목록
- 모금 현황, 수정/삭제 가능

---

## 📱 반응형 설계

- 카드형 UI는 모바일에서 세로 스택으로 전환
- 참여 버튼은 고정 하단 배치 (`fixed bottom-0`)
- 썸네일, 목표금액 등은 모바일 UI 우선

---

## 🔐 인증 흐름

- `/funding/create`, `/funding/profile`는 로그인 + `yaksa` 역할 필요
- 로그인되지 않으면 `/login`으로 리디렉션

---

## 💡 UI 스타일 가이드 (TailwindCSS)

- 카드: `rounded-xl shadow-lg p-4 bg-white`
- 버튼: `bg-blue-600 text-white py-2 px-4 rounded`
- 모바일 대응: `max-w-sm mx-auto`, `flex flex-col gap-4`

---

## ⏭️ 연동 서비스 (선택)

- 결제 모듈(PG)
- 관리자 승인 시스템
- 펀딩 종료 후 후기 작성 등


---

## 📄 yaksa-site/wireframes/05-b2b-forum-ui-wireframe.md

<!-- From: yaksa-site/wireframes/05-b2b-forum-ui-wireframe.md -->


# 🧩 Wireframe 05: 약사 전용 B2B 포럼 UI 흐름 설계

## 🎯 목적
yaksa.site의 B2B 대상 약사 커뮤니티 기능(포럼)의 화면 흐름을 정의하여 약사 간 정보 교류와 참여를 활성화할 수 있도록 한다.

---

## ✅ 주요 경로 구성

| 경로 | 설명 |
|------|------|
| `/forum` | 전체 포럼 게시판 리스트 |
| `/forum/:id` | 게시글 상세 보기 |
| `/forum/create` | 새 글 작성 |
| `/forum/profile` | 내가 쓴 글, 댓글 내역 |

---

## 🧱 UI 구성 요소

### 1. 포럼 메인 페이지 (`/forum`)
- 게시판 목록 (카테고리별 탭: 약국경영, 제도/정책, 제품 리뷰 등)
- 최신 글 리스트 (제목 + 요약 + 작성자 + 댓글 수 + 시간)
- 상단에 "글쓰기" 버튼

### 2. 게시글 상세 페이지 (`/forum/:id`)
- 제목, 작성자, 시간
- 본문 내용 (Rich Text)
- 댓글 영역
- 추천/공감 버튼 (선택)
- 작성자만 수정/삭제 가능

### 3. 게시글 작성 페이지 (`/forum/create`)
- 제목, 본문, 카테고리 선택
- 약사만 글 작성 가능 (role === 'yaksa')
- 저장 후 상세 페이지로 이동

### 4. 사용자 프로필 페이지 (`/forum/profile`)
- 내가 쓴 글 리스트
- 내가 쓴 댓글 목록
- 추천한 글 목록

---

## 📱 반응형 설계

- 리스트: 데스크탑 → 양측 정보, 모바일 → 한 줄 카드
- 글쓰기 버튼: 모바일에서는 플로팅 버튼(`fixed bottom-4 right-4`)
- 댓글: 줄이 접히고 "더보기"로 펼침 가능

---

## 🔐 인증 및 역할

- 모든 기능은 로그인 필요
- 글쓰기/수정/삭제는 `yaksa` 역할 전용
- `ProtectedRoute + RoleGuard` 적용

---

## 💡 UI 스타일 가이드 (TailwindCSS)

- 리스트 항목: `border-b py-4 px-2 hover:bg-gray-50`
- 상세 페이지: `max-w-3xl mx-auto prose`
- 댓글: `rounded-md bg-gray-100 p-2 my-2`

---

## ⏭️ 향후 확장 고려

- 글 신고/차단 기능
- 태그 기반 검색
- 인기글 정렬/검색 기능
- 관리자 승인 게시판


---

## 📄 yaksa-site/wireframes/06-signage-ui-wireframe.md

<!-- From: yaksa-site/wireframes/06-signage-ui-wireframe.md -->


# 🖥️ Wireframe 06: 디지털사이니지 서비스 UI 흐름 설계

## 🎯 목적
yaksa.site의 디지털사이니지 서비스는 약국 매장에 설치된 디스플레이 장치를 통해 약사 또는 본사에서 콘텐츠를 송출/관리할 수 있는 플랫폼입니다. 본 문서는 관리자/약사용 UI 흐름을 설계합니다.

---

## ✅ 주요 경로 구성

| 경로 | 설명 |
|------|------|
| `/signage` | 디스플레이 등록/연결, 콘텐츠 송출 설정 |
| `/signage/devices` | 내 디스플레이 장치 목록 |
| `/signage/playlists` | 콘텐츠 목록 및 스케줄 관리 |
| `/signage/preview/:id` | 특정 디스플레이의 콘텐츠 실시간 미리보기 |

---

## 🧱 UI 구성 요소

### 1. 디스플레이 관리 (`/signage/devices`)
- 등록된 디스플레이 리스트 (위치, 해상도, 연결 상태)
- 새 디바이스 등록 버튼 (등록 코드 입력 or QR 스캔)
- 연결 끊기, 삭제 버튼

### 2. 콘텐츠 재생 관리 (`/signage/playlists`)
- 콘텐츠 업로드 (이미지, 영상, HTML, 약사광고 등)
- 시간대별 재생 스케줄 설정
- 콘텐츠 순서 드래그 앤 드롭 편집

### 3. 콘텐츠 미리보기 (`/signage/preview/:id`)
- 실제 디스플레이 화면과 동일한 프리뷰 제공
- 테스트용 송출 버튼 포함

---

## 📱 반응형 설계

- 기본 데스크탑 UI
- 모바일에서는 콘텐츠 미리보기/스케줄 위주 화면으로 축소
- 디바이스 목록은 리스트형 전환

---

## 🔐 인증 및 권한

- 모든 기능은 로그인 필요
- 약사 또는 관리자만 접근 가능
- 디바이스 등록 시 사용자 계정과 연결됨

---

## 💡 UI 스타일 가이드 (TailwindCSS)

- 디바이스 카드: `rounded-lg bg-white p-4 shadow-md`
- 콘텐츠 편집: `grid grid-cols-2 gap-4`
- 스케줄 타임라인: 수직 또는 수평 슬라이드 바

---

## 🧩 향후 확장 고려

- WebSocket 기반 실시간 디스플레이 동기화
- 디스플레이 상태 모니터링
- 광고 송출 보고서
- 템플릿 저장/복원 기능


---

## 📄 yaksa-site/wireframes/07-common-ui-and-menu-structure.md

<!-- From: yaksa-site/wireframes/07-common-ui-and-menu-structure.md -->


# 🧩 Wireframe 07: 공통 UI 모듈 및 역할 기반 메뉴 구조 설계

## 🎯 목적
yaksa.site 플랫폼 내 모든 서비스에서 일관된 UI/UX 경험을 제공하고, 사용자 역할에 따라 표시되는 메뉴 및 UI 모듈을 구조화한다.

---

## ✅ 공통 UI 컴포넌트 정의

### 1. 상단 헤더 (`<AppHeader />`)
- 로고
- 현재 위치(title)
- 로그인/로그아웃 버튼
- 프로필/알림 아이콘

### 2. 사이드바 또는 메인 메뉴 (`<MainMenu />`)
- 역할 기반 표시 구조 적용
- 반응형 전환 (모바일에서는 햄버거 메뉴)

### 3. 알림 UI (`<NotificationBell />`)
- 벨 아이콘 + 새 알림 뱃지
- 클릭 시 최근 알림 드롭다운

### 4. 공통 카드 (`<ServiceCard />`)
- 아이콘 + 제목 + 설명 포함 진입용 카드

### 5. 모달/다이얼로그 (`<ConfirmDialog />`, `<InputModal />`)
- Tailwind + headlessui 기반

---

## 📋 역할별 메뉴 노출 정의

| 메뉴 항목 | B2C 사용자 | 약사(B2B) | 관리자 |
|-----------|------------|-----------|--------|
| 쇼핑몰 | ✅ `/shop` | ✅ `/yaksa-shop` | ❌ |
| 펀딩 | ✅ | ✅ | ❌ |
| 포럼 | ❌ | ✅ | ❌ |
| 디지털사이니지 | ❌ | ✅ | ✅ |
| 마이페이지 | ✅ | ✅ | ❌ |
| 관리자 대시보드 | ❌ | ❌ | ✅ |
| 사용자 관리 | ❌ | ❌ | ✅ (`superadmin`) |

---

## 🧱 Tailwind 구조 예시 (사이드바 메뉴)

```jsx
const menu = [
  { label: "쇼핑몰", href: "/shop", roles: ["b2c", "yaksa"] },
  { label: "펀딩", href: "/funding", roles: ["b2c", "yaksa"] },
  { label: "포럼", href: "/forum", roles: ["yaksa"] },
  { label: "관리자", href: "/admin", roles: ["admin"] }
];
```

---

## 🧩 확장 고려

- 다국어 미지원 → 제외
- 각 모듈은 Figma MCP 구성으로 추후 export 가능
- Zustand 또는 context 기반 역할 상태 분기

---

## ⏭️ 다음 연결 문서

- `role-permissions.md`: 역할별 기능 접근 권한 정의
- `ui-theme-system.md`: 공통 테마/다크모드 시스템 설계


---

## 📄 yaksa-site/wireframes/08-role-permissions.md

<!-- From: yaksa-site/wireframes/08-role-permissions.md -->


# 🔐 Wireframe 08: 역할별 기능 접근 권한 정의

## 🎯 목적
yaksa.site 플랫폼에서 각 사용자 유형(B2C, 약사, 관리자)의 기능 접근을 명확히 구분하여 보안성과 UX를 동시에 확보한다.

---

## ✅ 사용자 역할 정의

| 역할 | 설명 |
|------|------|
| b2c | 일반 소비자 |
| yaksa | 약사, 기업 사용자 |
| admin | 관리자(운영자) |
| superadmin | 시스템 전체 권한 보유자 |

---

## 📋 역할별 접근 권한 매트릭스

| 기능 | b2c | yaksa | admin | superadmin |
|------|-----|-------|--------|-------------|
| 쇼핑몰 접근 | ✅ `/shop` | ✅ `/yaksa-shop` | ❌ | ❌ |
| 펀딩 참여 | ✅ | ✅ | ❌ | ❌ |
| 펀딩 등록 | ❌ | ✅ | ❌ | ❌ |
| 포럼 글 읽기 | ❌ | ✅ | ❌ | ❌ |
| 포럼 글 작성 | ❌ | ✅ | ❌ | ❌ |
| 디지털사이니지 제어 | ❌ | ✅ | ✅ | ✅ |
| 관리자 대시보드 | ❌ | ❌ | ✅ | ✅ |
| 사용자 권한 변경 | ❌ | ❌ | ❌ | ✅ |
| 설정 백업/복원 | ❌ | ❌ | ❌ | ✅ |
| 활동 로그 열람 | ❌ | ❌ | ❌ | ✅ |
| 알림 시스템 | ✅ | ✅ | ✅ | ✅ |

---

## 🔒 보호 컴포넌트 예시

```tsx
<ProtectedRoute roles={['yaksa', 'admin']}>
  <PageComponent />
</ProtectedRoute>

<AdminRoleProtectedRoute roles={['superadmin']}>
  <AdminLogs />
</AdminRoleProtectedRoute>
```

---

## 🛠️ 권한 데이터 관리 방식

- `authStore.ts` 또는 `adminAuthStore.ts`에 역할(role) 저장
- 로그인 응답에서 역할 포함 (JWT claims or API payload)
- 메뉴 렌더링 및 접근 제어에 일관되게 사용

---

## 📎 확장 고려 사항

- 역할별 알림 필터링
- 역할 전환 기능 (관리자가 약사 계정으로 전환 등)
- `ROLE_VIEWER`, `ROLE_EDITOR` 등 하위 역할 체계

---

## ⏭️ 다음 문서

- `ui-theme-system.md`: 테마 설정 및 다크모드 대응 전략


---

## 📄 yaksa-site/wireframes/09-ui-theme-system.md

<!-- From: yaksa-site/wireframes/09-ui-theme-system.md -->


# 🎨 Wireframe 09: UI 테마 및 다크모드 시스템 설계

## 🎯 목적
yaksa.site 전체 서비스에서 일관된 UI 테마를 유지하고, 다크모드/라이트모드 전환이 가능한 유연한 테마 시스템을 설계한다.

---

## ✅ 기본 전략

- TailwindCSS `dark` 클래스를 기반으로 전체 다크모드 지원
- 사용자 설정을 `localStorage` 또는 `themeStore.ts`에 저장
- 기본값: 라이트 모드
- 테마는 모든 서비스에 공통 적용

---

## 📋 테마 저장 방식

```ts
// Zustand 예시
const themeStore = create((set) => ({
  theme: "light", // or "dark"
  setTheme: (value) => set({ theme: value })
}));
```

- 저장 위치: `localStorage.theme = 'dark'`
- 초기 진입 시 적용

---

## 💡 Tailwind 다크모드 구성 예시

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
  <button className="bg-gray-200 dark:bg-gray-700">버튼</button>
</div>
```

---

## 🧱 UI 구성 요소

- 테마 토글 버튼 (`<ThemeToggle />`)
  - 라이트 ☀️ → 다크 🌙 전환
  - 헤더 상단 우측에 배치
- 전역 적용: `body` 또는 `html`에 `class="dark"` 적용

---

## 🎯 동작 흐름

```
[ThemeToggle 클릭]
    ↓
[Zustand 상태 변경 + localStorage 저장]
    ↓
[body class 변경 → UI에 dark 클래스 적용]
```

---

## 🧩 확장 고려

- 테마 시스템을 Figma MCP에도 반영 가능
- 추후 고대비 / 저시력 모드 등도 테마 설정에 포함
- 관리자 테마와 사용자 테마 분리 고려

---

## ⏭️ 관련 문서

- `07-common-ui-and-menu-structure.md`
- `08-role-permissions.md`


---

## 📄 yaksa-site/yaksa-deploy-handoff.md

<!-- From: yaksa-site/yaksa-deploy-handoff.md -->


# 🔀 yaksa.site 작업 이관 요약 문서 (프론트/배포 테스트용)

## 📌 목적
이 문서는 yaksa.site 프로젝트의 프론트 화면 구성 및 배포 테스트를 진행하기 위해, 다른 채팅방 또는 프로젝트 환경에서 이어서 파악할 수 있도록 요약한 상태 문서입니다.

---

## ✅ 현재까지 완료된 작업

### 1. 메인 포털 구성
- `/`: 서비스 진입 카드 UI (쇼핑몰, 펀딩, 포럼 등)
- 역할별 접근 UI 설계 완료

### 2. 인증 흐름
- `/login`, `/register` UI 구현 Task 완료
- 소비자: 자동 승인 → 홈 리디렉션
- 약사: 면허번호 입력 + 전화번호 (수동 승인 필요)

### 3. 보호 라우트 및 역할 분기
- `<ProtectedRoute />`, `<YaksaProtectedRoute />`, `<RoleProtectedRoute />` 구현
- 약사 인증 전 상태는 일반 사용자로 간주

### 4. 약사 전용 화면
- `/yaksa/dashboard`
- `/yaksa/notifications`
- `/yaksa/profile`

### 5. 관리자 승인 화면
- `/admin/yaksa-approvals`: superadmin 전용 약사 승인 페이지

---

## 🔧 현재 테스트 목적

- yaksa.site 접속 시 `502 Bad Gateway` 오류 해결
- React 앱 빌드/serve 상태 점검 및 Nginx 연결 확인
- 실제 URL로 진입 가능한 화면 구성 여부 확인

---

## 📄 관련 Task 문서 요약

| 문서명 | 설명 |
|--------|------|
| `yaksa-portal-task-00-start.md` | 전체 Portal UI 시작 Task |
| `yaksa-portal-task-11-router-setup.md` | 전체 라우터 구조 연결 |
| `yaksa-deploy-task-01-react-build-serve.md` | 502 오류 해결 위한 빌드 및 serve 실행 요청 |

---

## ⏭️ 다음 예상 작업 흐름

- Nginx 설정 확인 (Task 12로 분리 예정)
- 실제 화면 접근 테스트 체크리스트 생성
- 화면 단위 에러 처리 / 경고 메시지 구성


---

## 📄 yaksa-site/yaksa-deploy-task-01-react-build-serve.md

<!-- From: yaksa-site/yaksa-deploy-task-01-react-build-serve.md -->


# 🛠 yaksa-deploy-task-01-react-build-serve.md

## 🎯 목적

`yaksa.site` 도메인에 배포된 React(Vite 기반) 프론트엔드 프로젝트가  
**502 Bad Gateway**, **404 Not Found** 오류를 거쳐  
정상적으로 **정적 웹사이트로 제공되도록 설정**한 과정을 기록한다.  
이 문서는 향후 동일한 구성 시 재활용 가능한 가이드 역할을 한다.

---

## ✅ 서버 및 환경 요약

| 항목 | 값 |
|------|----|
| 인스턴스 | AWS Lightsail (Ubuntu, o4o-web-server) |
| 퍼블릭 IP | `13.124.146.254` |
| 프레임워크 | Vite + React |
| 배포 방법 | `serve -s dist -l 3000` (정적 파일 서비스) |
| 웹서버 | Nginx (proxy_pass로 포워딩) |
| 연결 도메인 | yaksa.site |

---

## 🚨 문제 발생 흐름 요약

1. `502 Bad Gateway`
    - 원인: React 앱이 실행되지 않은 상태에서 Nginx가 3000번 포트로 프록시 시도
2. `404 Not Found`
    - 원인: `vite build`는 `dist/`에 생성되는데, `serve -s build` 명령어 사용 → 경로 불일치
3. `포트 중복 오류`
    - 원인: 이전 프로세스가 3000포트를 점유 중 → `serve`가 임의 포트로 실행됨 → Nginx와 불일치

---

## 🧰 해결 절차 (Step-by-Step)

### 1. 프로젝트 빌드

```bash
cd ~/o4o-web
npm run build
```

- 결과: `dist/` 디렉토리 생성됨

---

### 2. 기존 3000포트 점유 프로세스 종료

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

예:
```bash
sudo kill -9 41357
```

---

### 3. 정적 파일 serve 시작

```bash
serve -s dist -l 3000
```

- `serve`가 `3000`번 포트에서 정상 실행됨
- 결과:
  ```
  Serving!
  - Local: http://localhost:3000
  ```

---

### 4. Nginx 설정 확인 (필요 시)

```nginx
server {
    listen 80;
    server_name yaksa.site;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        try_files $uri /index.html;  # SPA fallback
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ 결과

- `yaksa.site` 접속 시, Vite + React 초기 페이지 정상 렌더링됨
- Vite 앱의 `/`, `/vite.svg`, `/assets/` 경로 모두 정상 동작
- 이후 포털 홈 UI로의 전환만 남은 상태

---

## 🗂️ 참고

| 파일명 | 내용 |
|--------|------|
| `vite.config.js` | 정적 빌드 관련 경로 조정 필요시 참조 |
| `o4o-web-pm2.json` | serve를 PM2에 등록하려는 경우 사용 가능 |
| `nginx.conf` | fallback 추가 필요 (SPA 경우) |

---

## 🔄 향후 작업 제안

- `src/App.jsx`를 실제 yaksa 포털 홈 UI로 교체
- React Router 도입 후 라우팅 테스트
- `/login`, `/shop`, `/yaksa/dashboard` 등의 경로별 화면 구성
- PM2를 통한 서비스 상시 실행 구성

---

## ✳️ PM2 등록 예시 (선택)

```bash
pm2 start serve --name yaksa-portal -- -s dist -l 3000
```

---


---

## 📄 yaksa-site/yaksa-site-auth-structure.md

<!-- From: yaksa-site/yaksa-site-auth-structure.md -->


# 🔐 yaksa.site 통합 인증 구조 설계 (초안)

## 🎯 목적
yaksa.site 전반의 서비스들이 하나의 로그인으로 접근 가능하도록 OAuth2 기반 통합 인증 시스템을 설계한다.

---

## ✅ 인증 흐름 요약

1. 모든 서비스는 `auth.yaksa.site`로 인증 요청
2. 사용자 로그인 → JWT 토큰 발급
3. 토큰은 각 프론트엔드에서 저장(localStorage 등)
4. 토큰 기반으로 서비스 간 이동 시 인증 유지

---

## 👥 사용자 역할 기준 리디렉션

| 역할 | 리디렉션 위치 |
|------|----------------|
| 일반 사용자 | `/shop` |
| 기업 사용자 (약사) | `/yaksa-shop` |
| 관리자 | `admin.yaksa.site/...` (경로별 필터링 적용)

---

## 🧱 기술 구성 제안

- 인증 서버 도메인: `auth.yaksa.site`
- 인증 방식: OAuth2 + JWT (NextAuth.js, Auth0, Keycloak 등 고려)
- 역할 판단: 로그인 응답 내 포함
- 세션 유지: refresh token 또는 access token 저장

---

## 🛡️ 보안 고려 사항

- HTTPS 적용 필수
- 토큰 만료/재발급 처리
- 관리자 로그인은 별도 MFA(다단계 인증) 고려 가능


---

## 📄 yaksa-site/yaksa-site-infra-overview.md

<!-- From: yaksa-site/yaksa-site-infra-overview.md -->


# 🧾 yaksa.site 백엔드 및 프론트엔드 호스팅 구조 요약

## ✅ 1. 서비스 개요

- yaksa.site는 React 기반 프론트엔드로 개발되었습니다.
- 백엔드는 Medusa.js 기반 커머스 API 서버 (`o4o-api-server`)입니다.
- 모든 서비스는 AWS Lightsail에서 운영되고 있습니다.

---

## ✅ 2. 프론트엔드 실행 구조

yaksa.site 프론트는 다음 중 하나의 방식으로 실행 중일 수 있습니다:

### [A] 개발 모드 (React Dev Server)
- 명령어: `npm run dev` 또는 `yarn dev`
- 기본 포트: `localhost:5173` 또는 `localhost:3000`
- 용도: 개발 중 핫 리로딩용

### [B] 정적 빌드 + Nginx 배포
- 명령어: `yarn build` → `dist/` 또는 `build/` 생성
- Nginx에서 해당 디렉터리를 정적으로 서빙
- Nginx 설정 위치: `/etc/nginx/sites-available/default`

### [C] PM2 프로세스 매니저 사용
- 명령어 예시: `pm2 start yarn --name yaksa-web -- start`
- 또는: `serve -s build` → 정적 파일 서비스
- 장점: 부팅 시 자동 시작, 관리 편리

---

## ✅ 3. SSH 접근 가능 여부

- SSH 접속은 현재 가능한 상태입니다.
- 점검 가능 항목:
  - `nginx.conf` 또는 `/etc/nginx/sites-available/default`
  - `pm2 list`, `pm2 logs yaksa-web`
  - `build/` 또는 `dist/` 디렉터리 존재 여부
  - `.env`, `medusa-config.js` 등 설정 확인

---

## ✅ 4. React 앱 점검 체크리스트

### 요청할 수 있는 확인 명령어
- `pm2 list`
- `pm2 logs yaksa-web`
- `ls -alh build/`
- `cat /etc/nginx/sites-available/default`

---

## ✅ 5. 추가 제공 가능 항목

- PM2 실행 복구 명령어
- `serve` 또는 `start` 방식별 실행 템플릿
- `.env` 템플릿
- nginx 설정 예시 (`proxy_pass`, `root`, `index`)
- 점검 자동화 bash 스크립트 (`check-react-deploy.sh`)

---

## 🔄 참고: 502 Bad Gateway 대처 요약

| 원인 | 조치 |
|------|------|
| React 앱 미실행 | PM2 또는 수동 실행 확인 |
| 포트 mismatch | Nginx proxy_pass 포트 확인 |
| build 폴더 없음 | `npm run build`로 재생성 |
| Nginx root 디렉토리 설정 오류 | `/var/www/html`, `/home/ubuntu/project/build` 등 확인 |

---

이 문서를 개발자 또는 서버 운영자에게 전달하시면 정확한 점검을 도울 수 있습니다.


---

## 📄 yaksa-site/yaksa-site-portal-overview.md

<!-- From: yaksa-site/yaksa-site-portal-overview.md -->


# 📌 yaksa.site 메인 포털 개요

## 🎯 목적
yaksa.site는 약사를 위한 다양한 디지털 서비스를 통합한 포털입니다.  
B2C/B2B 사용자와 관리자가 각자의 목적에 따라 접근할 수 있도록 중앙 진입점 역할을 합니다.

---

## 🧱 주요 구성 서비스

| 서비스 | 설명 | 도메인/경로 |
|--------|------|-------------|
| B2C 쇼핑몰 | 일반 사용자용 전자상거래 | `store.yaksa.site/shop` |
| B2B 쇼핑몰 | 약사용 전자상거래 | `store.yaksa.site/yaksa-shop` |
| 크라우드펀딩 | 약사 중심 펀딩 플랫폼 | (예: `fund.yaksa.site`) |
| 약사 포럼 | B2B 이용자 커뮤니티 | (예: `forum.yaksa.site`) |
| 디지털사이니지 | 매장 디스플레이 콘텐츠 관리 | (예: `signage.yaksa.site`) |
| 관리자 패널 | 서비스 운영 관리자용 | `admin.yaksa.site/...` |

---

## 👥 사용자 유형 및 진입 흐름

- **일반 사용자 (소비자)**: `/shop` → B2C 서비스
- **기업 사용자 (약사)**: `/yaksa-shop`, 포럼, 펀딩 등 → B2B 서비스
- **관리자**: `admin.yaksa.site` 서브경로로 진입, 역할 필터링

---

## 🧩 기술 스택 및 구조

- Frontend: React SPA + TailwindCSS + 반응형 UI
- 모바일: 웹앱 형태로 지원 (카메라, 위치정보 확장 고려)
- 인증: 단일 로그인 기반 OAuth2 / JWT (추후 결정)
- 디자인: MCP/Figma 연동 예정

---


---

## 📄 yaksa-site/yaksa-site-portal-wireframe.md

<!-- From: yaksa-site/yaksa-site-portal-wireframe.md -->


# 🧭 yaksa.site 메인 포털 UI 와이어프레임 설계

## 🎯 목적
다양한 서비스로 진입하는 포털의 UI 구조를 설계하여 사용자 유형별 접근성을 높인다.

---

## 🧱 주요 섹션 구성 (PC/모바일 반응형)

1. 헤더 영역
   - 로고 (yaksa.site)
   - 로그인 / 내 계정 버튼
   - 관리자 진입 버튼 (별도 우측)

2. 메인 섹션 (서비스 블록)
   - [일반 쇼핑몰] → `/shop`
   - [약사용 쇼핑몰] → `/yaksa-shop`
   - [펀딩 플랫폼] → `fund.yaksa.site`
   - [약사 포럼] → `forum.yaksa.site`
   - [디지털사이니지] → `signage.yaksa.site`

3. 하단 푸터
   - 고객센터 링크
   - 이용약관 / 개인정보 처리방침
   - 회사 정보 등

---

## 📱 모바일 레이아웃 전환 기준
- TailwindCSS breakpoint 기준 `md:` 이하로 접힘
- 메인 버튼은 카드 UI → 리스트 UI로 전환

---

## 💡 추후 고려 사항
- 로그인된 사용자 유형에 따라 블록 강조
- 관리자 계정은 자동 admin 도메인으로 리디렉션
- B2B 로그인은 별도 안내/입력 필요 가능성


---

## 📄 yaksa-site/yaksa-site-structure.md

<!-- From: yaksa-site/yaksa-site-structure.md -->


# 🗂️ yaksa-site 프로젝트 전체 구조 정리 (`o4o-platform/` 기준)

본 문서는 yaksa.site의 실제 프론트엔드 및 서브 서비스 개발을 위한 전체 폴더 구조 및 서비스 단위 개발 가이드를 제공합니다.  
현재 `o4o-platform/` 루트 아래에 있는 `o4o-web-server/`는 혼동을 피하기 위해 **yaksa-site 메인(프론트포털)**로 간주합니다.

---

## ✅ 전체 폴더 구조 (`o4o-platform/` 기준)

```
o4o-platform/
├── yaksa-site/                  # 기존 o4o-web-server/ → yaksa.site 메인 포털
│   ├── scripts/                 # 배포 스크립트 등
│   ├── services/
│   │   ├── ecommerce/
│   │   │   ├── admin/           # 관리자용 화면 (향후 admin.yaksa.site)
│   │   │   ├── api/             # API 핸들러 또는 proxy layer
│   │   │   └── web/             # 메인 커머스 프론트(B2C, B2B)
│   │   └── crowdfunding/        # 크라우드펀딩 프론트엔드
│   ├── forum/                   # 포럼 서비스
│   ├── lms/                     # 강의 시스템
│   ├── signage/                 # 디지털사이니지 디스플레이 앱
│   ├── shared/                 # 공통 유틸, 컴포넌트
│   ├── README.md
│   └── workspace.json
└── ...
```

---

## 🧱 yaksa-site (메인 포털) 구조

```
yaksa-site/
├── public/
├── src/
│   ├── components/          # 공통 UI 컴포넌트
│   ├── pages/               # 홈, 로그인, 서비스 진입 페이지 등
│   ├── routes/              # React Router
│   ├── store/               # Zustand 등 전역 상태
│   ├── index.css            # Tailwind 지시문
│   ├── main.tsx
│   └── app.tsx
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 🛒 services/ecommerce/web 구조

```
services/ecommerce/web/
├── public/
├── src/
│   ├── components/         # 상품카드, 장바구니 등
│   ├── pages/              # Shop, ProductDetail, Cart, Checkout 등
│   ├── store/              # cartStore.ts, authStore.ts 등
│   ├── routes/
│   ├── app.tsx
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 💳 services/crowdfunding 구조

```
services/crowdfunding/
├── src/
│   ├── components/
│   ├── pages/
│   ├── app.tsx
│   └── main.tsx
├── tsconfig.json
└── vite.config.ts
```

---

## 📚 services/lms 구조

```
services/lms/
├── src/
│   ├── pages/
│   └── player.tsx
└── ...
```

---

## 📡 services/signage 구조

```
services/signage/
├── public/
├── src/
│   └── screens/
└── ...
```

---

## 🧩 확장 관리 전략

- 모든 서비스는 독립 개발 → 독립 배포 가능 구조 유지
- Tailwind, Zustand 등 통일된 기술 스택 사용
- 각 서비스 폴더 내부에 `README.md`, `vite.config.ts`, `tsconfig.json` 별도 유지

---

이 문서를 기반으로 서비스 간 경계와 폴더 정리를 명확히 할 수 있습니다.  
필요하시면 각 서비스 구조별 `task 문서`도 별도 생성 가능합니다.

