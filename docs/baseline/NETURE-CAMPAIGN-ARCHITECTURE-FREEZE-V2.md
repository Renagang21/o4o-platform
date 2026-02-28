# NETURE-CAMPAIGN-ARCHITECTURE-FREEZE-V2

## 1. 선언 목적

본 문서는 Neture 도메인 내 "Campaign(기간 한정 특가)" 구조가
기술적·도메인적 무결성을 만족하며 안정 상태에 도달했음을 선언한다.

Campaign 구조는 다음 원칙을 따른다.

* 단순성
* 결정성(Deterministic)
* DB 레벨 무결성 강제
* 기존 DistributionType 구조와의 완전한 분리

이 문서는 V2 기준으로 Campaign 구조를 Freeze 한다.

---

## 2. 도메인 정의

### 2.1 Campaign의 의미

Campaign은 다음과 같이 정의한다.

> Campaign = 특정 상품(product_id)에 대해 일정 기간(start_at ~ end_at) 동안 적용되는 서버 강제 가격 오버라이드 레이어

Campaign은:

* 상품 단위이다.
* 다상품 캠페인을 허용하지 않는다.
* DistributionType과 무관하다.
* Listing 생성에 관여하지 않는다.
* RECRUIT 구조와 무관하다.

---

## 3. 스키마 구조 (최종)

### 3.1 neture_time_limited_price_campaigns

핵심 필드:

* id
* supplier_id
* product_id
* campaign_price
* start_at
* end_at
* status (DRAFT / ACTIVE / COMPLETED / CANCELLED)

### 3.2 무결성 제약

#### ① ACTIVE 단일 보장

```sql
CREATE UNIQUE INDEX uq_active_campaign_per_product
ON neture_time_limited_price_campaigns (product_id)
WHERE status = 'ACTIVE';
```

동일 product_id에 대해 ACTIVE Campaign은 1건만 허용한다.

#### ② 기간 무결성

```sql
CHECK (start_at < end_at)
```

start_at ≥ end_at 저장은 DB 레벨에서 차단된다.

---

## 4. 상태 전이 규칙

허용 전이:

* DRAFT → ACTIVE
* DRAFT → CANCELLED
* ACTIVE → COMPLETED
* ACTIVE → CANCELLED

불허 전이:

* COMPLETED → ACTIVE
* CANCELLED → ACTIVE

재활성화는 허용하지 않는다.

---

## 5. Supplier ↔ Product 무결성

Campaign 생성 시:

* product_id는 반드시 해당 supplier_id의 상품이어야 한다.
* 다른 supplier 상품에 대한 Campaign 생성은 서버에서 차단한다.
* 에러 코드: `PRODUCT_NOT_OWNED_BY_SUPPLIER`

---

## 6. 주문 가격 결정 규칙

주문(createOrder) 시:

1. product_id 기준 ACTIVE Campaign 조회
2. 현재 시각이 start_at ≤ now < end_at 인지 확인
3. 존재하면 campaign_price 적용
4. 없으면 product.priceGeneral 적용

클라이언트 전달 가격은 무시한다.
가격 결정은 항상 서버에서 수행한다.

---

## 7. 집계 정책

neture_campaign_aggregations는 다음 기준을 따른다:

* (campaign_id, product_id) 단위 집계
* totalOrders = 참여 주문 건수 (status='PAID')
* totalQuantity = 총 수량
* totalAmount는 의도적으로 사용하지 않는다.

집계는 수량 기반 정책만을 따른다.

---

## 8. DistributionType과의 관계

Campaign은 다음과 독립적이다:

* PUBLIC
* SERVICE
* PRIVATE

Campaign은 가격 레이어이며,
DistributionType 기반 Listing 생성 로직을 변경하지 않는다.

---

## 9. 구조적 안정성 판정

Campaign 구조는 다음을 충족한다:

* ACTIVE 단일성 DB 강제
* 기간 무결성 DB 강제
* Supplier-Product 소유 검증 존재
* 주문 가격 결정 단일성 보장
* 집계 단순성 유지
* RECRUIT 도메인과 완전 격리

따라서 본 구조는 도메인적으로 닫힌 상태이며,
추가 정책 변경 없이 운영 가능한 상태이다.

---

## 10. 변경 금지 항목 (Freeze 규칙)

다음은 별도 설계 승인 없이 변경할 수 없다:

1. Campaign을 다상품 구조로 확장
2. ACTIVE 다중 허용 정책 도입
3. DistributionType과 Campaign을 결합
4. 금액 기반 집계 추가
5. 상태 전이 규칙 완화

---

## 11. 최종 선언

```text
NETURE-CAMPAIGN-ARCHITECTURE-FREEZE-V2
Status: FROZEN
```

Campaign 구조는 V2 기준으로 Freeze 되었다.
