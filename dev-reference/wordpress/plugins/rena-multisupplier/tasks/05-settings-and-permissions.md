# Task 05 - Settings and Permissions Management

## 🎯 목적
rena-multisupplier 플러그인 운영을 위한 관리자 설정 화면과, 공급자 기능에 대한 세부 권한 제어 방식을 정의한다.

---

## ✅ 작업 목표

- 플러그인 설정 화면 생성 (관리자 메뉴)
- 공급자 관련 기본 설정값 등록 및 저장
- 역할별 권한 정의
- WooCommerce API 연동 관련 키값 설정 영역 포함

---

## 🏗️ 작업 구조

### 1. 관리자 설정 화면 구성

- 관리자 메뉴 위치: `rena-multisupplier > 설정`
- 설정 화면 탭 구성 예:
  - 기본 설정 (공급자 등록 정책, 승인 방식 등)
  - API 설정 (WooCommerce 연결 정보)
  - 이메일/알림 설정

### 2. 저장 항목 예시

- 자동 승인 여부 (true/false)
- WooCommerce API 엔드포인트
- consumer_key / consumer_secret
- 상품 등록 시 승인 필요 여부
- 이메일 템플릿 설정

### 3. 저장 방식

- WordPress Options API 사용
  - 옵션 그룹: `rena_multisupplier_options`
  - 저장 키 예:
    - `auto_approve_supplier`
    - `wc_api_endpoint`
    - `wc_api_consumer_key`
    - `wc_api_consumer_secret`

### 4. 권한 제어 방식

- 사용자 역할에 따른 기능 제어:
  - `supplier`: 본인의 상품만 등록/수정
  - `administrator`: 모든 공급자/상품 접근 가능
- 커스텀 capability 예:
  - `manage_supplier_products`
  - `view_supplier_orders`

---

## 🔁 후속 연동 작업

- 공급자 대시보드 접근 시 설정값 반영 (`auto_approve_supplier`)
- 상품 등록 제한 조건 등 설정값 기준 적용

---

## 📌 기타 참고

- WordPress Settings API 활용 권장 (add_settings_section, add_settings_field)
- API 키 보안 처리를 위해 저장 시 암호화(선택)

