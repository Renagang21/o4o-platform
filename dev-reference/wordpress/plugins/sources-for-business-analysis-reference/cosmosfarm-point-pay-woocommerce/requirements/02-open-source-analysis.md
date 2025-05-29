# 02. Open Source Analysis - Cosmosfarm Point Pay for WooCommerce

## 1. 플러그인 개요

- 플러그인명: Cosmosfarm Point Pay for WooCommerce
- 주요 기능: WooCommerce 기반 포인트 결제 및 적립 시스템
- 한국형 PG 연동과 포인트 적립/사용 정책에 최적화
- 특징:
  - 포인트로 상품 전액 또는 일부 결제 가능
  - 구매 후 자동 적립 처리
  - 유효기간 기반 소멸 정책 지원
  - 관리자 수동 지급 및 로그 확인 기능 제공

---

## 2. 주요 기능 정리

| 기능 | 설명 |
|------|------|
| 포인트 지급/차감 | 관리자 수동 처리 및 주문 기반 자동 지급/차감 |
| 포인트 결제 | WooCommerce 결제 단계에서 포인트 사용 가능 |
| 포인트 적립 | 주문 완료 후 설정된 적립 비율에 따라 자동 적립 |
| 유효기간 설정 | 적립 포인트에 대해 만료일 설정 가능 |
| 사용자 마이페이지 | 포인트 사용/적립 내역 열람 |
| 관리자 리포트 | 사용자별 포인트 잔액 및 이력 확인 가능 |

---

## 3. 디렉터리 구조 요약
cosmosfarm-point-pay-woocommerce/ ├── cosmosfarm-point-pay-woocommerce.php ├── includes/ │ ├── admin/ │ ├── frontend/ │ ├── class-point-logger.php │ └── class-point-manager.php ├── templates/ │ ├── mypage/ │ └── order/ ├── assets/ └── languages/


---

## 4. 핵심 클래스 및 훅 구조

| 클래스 | 설명 |
|--------|------|
| `Point_Manager` | 포인트 지급/차감 처리, 유효성 체크 |
| `Point_Logger` | 로그 기록 및 내역 조회 |
| `Point_Frontend` | 사용자 화면 렌더링 및 마이페이지 출력 |
| `Point_Admin` | 관리자 UI 설정 처리, 수동 지급 인터페이스 제공 |

### 주요 Hook

| Hook | 설명 |
|------|------|
| `woocommerce_payment_complete` | 주문 완료 시 포인트 적립 처리 |
| `woocommerce_before_cart_totals` | 결제 시 포인트 사용 UI 표시 |
| `woocommerce_checkout_create_order` | 포인트 차감 처리 |
| `wp_ajax_cosmosfarm_point_use` | 비동기 포인트 차감 처리 |
| `admin_menu` | 관리자 메뉴 등록 |

---

## 5. 관리자 및 사용자 UI 흐름

### ✅ 관리자

- 포인트 정책 설정
- 사용자별 지급/차감 처리
- 포인트 로그 확인 (날짜/사용자/사유)

### 👤 사용자

- 마이페이지 → 포인트 내역 확인
- 상품 구매 시 포인트 사용 선택 가능
- 주문 상세 페이지에서 포인트 사용 내역 확인

---

## 6. rena-retail 적용 인사이트

| 항목 | 적용 방향 |
|------|-----------|
| 포인트 적립 | 상품 가격 비율 + 조건 기반 적립 로직 적용 가능 |
| 포인트 사용 | WooCommerce 카트/체크아웃 통합 방식 유지 |
| 유효기간 관리 | 관리 UI + 자동 소멸 스케줄러 구조 도입 |
| 포인트 로그 | DB 로그 구조 → 통계 및 상태 흐름 전환 가능 |
| UI 구성 | 마이페이지 확장 방식은 rena-retail에서도 활용 가능 |

---

## 7. 분석 요약

Cosmosfarm Point Pay 플러그인은 WooCommerce를 커스터마이징하지 않고 포인트 시스템을 자연스럽게 통합한 구조입니다.  
rena-retail에서는 이 구조를 기반으로 보다 유연한 포인트-캐시 연동, 멀티 지급 정책, 상품/스토어 조건별 포인트 비율 설정 등의 확장 요소를 설계할 수 있습니다.

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT

