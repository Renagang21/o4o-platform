# O4O StoreLocalProduct Boundary Policy Declaration v1.0

> **Status: Active**
> **Scope: Platform-wide (Store Execution Layer)**
> **Date: 2026-02-24**

---

## 1. 선언 (Identity Statement)

StoreLocalProduct는 다음과 같이 정의된다:

> **StoreLocalProduct는 Store Private Display Domain이다.**
> **Commerce Object가 아니다.**

이 도메인은 매장의 오프라인 경쟁력을 강화하기 위한
콘텐츠 중심 Display 객체이며,
전자상거래 기능을 포함하지 않는다.

---

## 2. 존재 목적 (Purpose)

StoreLocalProduct의 목적은 다음과 같다:

- 매장 자체 상품을 Tablet 및 Display 채널에 노출
- 오프라인 상담 및 판매 보조
- 매장별 자율적 콘텐츠 구성 지원
- 공급자 유통 구조와 무관한 자체 상품 진열 지원

---

## 3. 명시적 비목표 (Explicit Non-Goals)

다음 기능은 영구적으로 허용하지 않는다:

### Commerce 연결 금지

- Checkout 진입
- EcommerceOrder 생성
- Cart 연결
- 결제 버튼 생성

### 유통 인프라 연결 금지

- OrganizationProductListing 등록
- OrganizationProductChannel 등록
- Distribution policy 적용
- Sales limit 적용

### 정산 모델 확장 금지

- Settlement 대상 포함
- 수수료 계산
- 세금 계산
- 재고 차감 로직

---

## 4. 채널 경계 (Channel Boundary)

| 채널 | 허용 여부 |
|------|----------|
| Tablet | 허용 |
| Signage (향후) | 허용 |
| B2C Ecommerce | 금지 |
| Kiosk 결제 | 금지 |

Tablet은 Display Channel이며, Commerce Channel이 아니다.

---

## 5. KPI 경계 (Analytics Boundary)

StoreLocalProduct는 다음 집계에 포함되지 않는다:

- 매출 집계
- Top Products
- 채널 매출 분석
- 판매 수량 집계

허용되는 집계:

- Display Count
- Tablet Interaction Count
- Highlight 노출 수

---

## 6. 아키텍처 경계 (Architectural Guard)

다음 보호 장치는 반드시 유지되어야 한다:

- 별도 테이블 (`store_local_products`)
- DB ENUM 강제 (`store_local_product_badge_type_enum`)
- Checkout Controller 차단 (구조적 거부)
- `ecommerce_order_items` 연결 없음
- DB UNION 금지 (애플리케이션 레벨 merge만 허용)
- 코드 레벨 경계 주석 유지 (WO 마커)

### 5-Layer 보호 구조

| Layer | 보호 수단 |
|-------|----------|
| DB | PostgreSQL ENUM + TABLE COMMENT |
| Checkout | 서비스별 Product 테이블만 조회 (구조적 거부) |
| Query | supplierProducts / localProducts 별도 쿼리 (UNION 금지) |
| KPI | ecommerce_order_items만 집계 (오염 불가) |
| Code | WO 마커 주석으로 향후 개발자에게 경고 |

---

## 7. 확장 규칙 (Future Extension Rule)

향후 StoreLocalProduct를 Commerce Domain으로 전환하려면:

1. 새로운 도메인으로 분리한다.
2. 기존 테이블을 직접 확장하지 않는다.
3. Boundary Policy를 개정한다.
4. 아키텍처 리뷰를 통과해야 한다.

**기존 Display Domain을 변형하는 방식의 확장은 금지한다.**

---

## 8. 플랫폼 철학 정합성

O4O는 Marketplace가 아니다.

> **O4O = Online for Offline**

즉, 오프라인 매장의 경쟁력을 강화하는 플랫폼이다.

StoreLocalProduct는 이 철학을 구현하는 Display Layer이다.

---

## 9. 관련 Work Order 이력

| WO | 내용 | 상태 |
|----|------|------|
| WO-STORE-LOCAL-PRODUCT-DISPLAY-V1 | Display Domain 최초 구현 | 완료 |
| WO-STORE-LOCAL-PRODUCT-HARDENING-V1 | 5-Layer 경계 고정 | 완료 |
| WO-STORE-LOCAL-PRODUCT-CONTENT-REFINEMENT-V1 | 콘텐츠 블록 확장 (Level 1) | 완료 |

### 검증 보고서

- [IR-STORE-LOCAL-PRODUCT-HARDENING-VERIFICATION-V1](../../docs/investigation/IR-STORE-LOCAL-PRODUCT-HARDENING-VERIFICATION-V1.md)

---

## 10. 현재 상태 요약

| 항목 | 상태 |
|------|------|
| Domain 분리 | 완료 |
| Hardening (경계 고정) | 완료 |
| Content 확장 (Level 1) | 완료 |
| Boundary 문서화 | 본 문서 |

이 도메인은 구조적으로 고정되었다.

---

*Version: 1.0*
*Updated: 2026-02-24*
*Classification: Baseline Policy (Active)*
