# 02. Open Source Analysis - YITH WooCommerce Product Vendors

## 1. 플러그인 개요

- **플러그인명**: YITH WooCommerce Product Vendors
- **제작사**: YITH (Your Inspiration Themes)
- **목적**: WooCommerce 기반의 멀티 벤더 마켓플레이스 구축
- **구현 방식**:
  - 사용자 역할 기반으로 판매자 등록
  - WooCommerce 상품에 벤더 할당
  - 수수료(커미션) 설정 및 통계 관리
  - 관리자/벤더별 기능 분리

---

## 2. 주요 기능 정리

| 기능 | 설명 |
|------|------|
| 벤더 역할 등록 | WordPress 사용자에게 vendor 역할 부여 |
| 상품 벤더 할당 | WooCommerce 상품에 벤더 연결 |
| 커미션 설정 | 글로벌 또는 벤더별 수수료 설정 |
| 커미션 로그 | 주문 기반 수익 정산 정보 저장 |
| 벤더 대시보드 | 벤더 전용 관리 UI 제공 |
| 관리자 승인 흐름 | 벤더 등록 승인 및 편집 기능 |

---

## 3. 디렉터리 구조 요약
yith-woocommerce-product-vendors/ ├── init.php # 플러그인 초기화 진입점 ├── includes/ # 주요 클래스 (커미션, 벤더 등) │ ├── class.yith-vendor.php │ ├── class.yith-vendors.php │ └── class.yith-commission.php ├── templates/ # 관리자/프론트 템플릿 │ ├── admin/ │ └── woocommerce/ ├── plugin-options/ # 관리자 옵션 정의 ├── plugin-fw/ # YITH 공통 프레임워크 └── widgets/ # 벤더 리스트 위젯


---

## 4. 주요 클래스 및 훅 구조

### 📦 주요 클래스

| 클래스명 | 설명 |
|----------|------|
| `YITH_Vendor` | 단일 벤더 정보를 객체로 다룸 |
| `YITH_Vendors` | 벤더 목록, 필터, 생성/삭제 등 통합 |
| `YITH_Commission` | 커미션 데이터 모델 |
| `YITH_Commissions` | 통계 및 목록 출력 지원 |
| `YITH_Vendors_Admin` | 관리자 영역 렌더링 |
| `YITH_Vendors_Frontend` | 벤더 사용자 영역 기능 |

### 🔧 대표 훅 사용

| Hook | 설명 |
|------|------|
| `init` | CPT 및 역할 등록 |
| `woocommerce_product_tabs` | 상품 상세 탭에 벤더 정보 추가 |
| `admin_menu` | 관리자 메뉴 추가 |
| `widgets_init` | 벤더 위젯 등록 |

---

## 5. 관리자 및 사용자 화면 흐름

### 📋 관리자

- 벤더 목록 보기 / 승인 / 수정
- 커미션 전체 내역 및 벤더별 필터
- 설정: 기본 수수료, 수수료 지급 방식 등

### 👤 벤더

- 본인 상품/수익 내역 조회
- 프로필/은행 정보 입력
- 본인 상품의 주문 확인 (WooCommerce 연동)

### 🛒 구매자

- 상품 페이지에 판매자 정보 확인 가능
- 판매자 프로필 링크 클릭 시 벤더 페이지로 이동

---

## 6. rena-retail 플러그인에 적용할 인사이트

| 항목 | 적용 방향 |
|------|-----------|
| 판매자 역할 등록 | 사용자 역할 → CPT 기반 등록 요청 흐름으로 전환 가능 |
| 커미션 구조 | 클래스 단위 분리 구조는 유지하며, DB 연동방식 최적화 필요 |
| 관리자 UI | `admin_menu` + 템플릿 구조 분리 방식 그대로 적용 가능 |
| 벤더 대시보드 | 프론트엔드용 페이지는 숏코드 또는 별도 경로에서 구현 |
| 플러그인 구조 | `plugin-fw` 스타일의 공통 라이브러리 사용 유효 |

---

## 7. 분석 요약

YITH Product Vendors 플러그인은 WooCommerce의 구조를 훼손하지 않으면서 벤더 개념을 도입한 구조로, CPT 없이도 대부분의 기능을 사용자 역할 기반으로 구현한다. rena-retail에서는 CPT 및 API 기반으로 재설계할 예정이므로 **역할 모델은 참조하되 구조는 더 분리/확장된 형태로 전환**할 수 있다.

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT (rena-retail 분석 지원)


