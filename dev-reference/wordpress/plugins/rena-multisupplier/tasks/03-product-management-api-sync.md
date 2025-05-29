# Task 03 - Product Management & WooCommerce API Sync

## 🎯 목적
공급자가 등록한 상품을 WooCommerce에 자동으로 연동하기 위한 API 연동 및 데이터 관리 로직을 구성한다.  
상품 등록/수정/삭제 시 WooCommerce REST API를 통해 연동한다.

---

## ✅ 작업 목표

- 공급자 상품 등록 폼 구현
- 상품 저장 시 WooCommerce API 호출 (POST)
- 상품 수정/삭제 시 WooCommerce API 연동 (PUT, DELETE)
- 오류 발생 시 사용자에게 알림 제공

---

## 🏗️ 작업 구조

### 1. 상품 등록 폼 구성

- 입력 항목:
  - 상품명
  - 카테고리
  - 가격
  - 재고 수량
  - 설명
  - 이미지 업로드
- `/supplier-dashboard/add-product` 경로에서 접근

### 2. WooCommerce API 연동

#### [1] 상품 등록

- API Endpoint: `POST /wp-json/wc/v3/products`
- 인증: Application Password 또는 OAuth2
- 요청 본문: 공급자 입력값을 기반으로 JSON 생성

#### [2] 상품 수정

- API Endpoint: `PUT /wp-json/wc/v3/products/{product_id}`
- `product_id`는 공급자 로컬 DB에 저장된 WooCommerce 연동 ID로 관리

#### [3] 상품 삭제

- API Endpoint: `DELETE /wp-json/wc/v3/products/{product_id}`

### 3. 로컬 데이터 구조

- 자체 DB 테이블 또는 `user_meta`/`post_meta` 기반 관리
- 공급자가 등록한 상품의 WooCommerce product ID를 별도로 저장
  - ex) `supplier_product_map` 테이블 또는 `postmeta: _wc_synced_product_id`

---

## 🔁 후속 연동 작업

- 공급자 승인 상태 확인 후만 API 동기화 수행
- API 실패 시 로컬 DB 저장 후 재시도 큐 적용 가능 (Task 06에서 처리)

---

## 📌 기타 참고

- WooCommerce API 문서: [https://woocommerce.github.io/woocommerce-rest-api-docs/](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- 공급자별 `consumer_key`, `consumer_secret`을 다르게 운용할 경우 설정 필요

