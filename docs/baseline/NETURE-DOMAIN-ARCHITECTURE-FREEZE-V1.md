# DOC-NETURE-DOMAIN-ARCHITECTURE-FREEZE-V1

**Neture Price & Distribution Architecture Freeze Declaration**

---

## 1. 목적

본 문서는 Neture 도메인의 가격·유통·캠페인 구조를 공식적으로 확정(FREEZE)하기 위한 선언 문서이다.

이 문서에 명시된 구조는 Beta 3 기준 최종 구조로 간주하며,
이후 변경은 별도 아키텍처 승인 절차 없이는 허용하지 않는다.

---

# 2. Price Architecture (확정)

## 2.1 기본 가격

```text
NetureSupplierProduct.priceGeneral
```

* Neture의 기본 B2B 공급가
* 단일 가격
* Listing/Channel에 가격 없음
* Price Freeze 대상

추가 필드:

* priceGold
* pricePlatinum
* consumerReferencePrice

그러나 **실제 주문 가격 결정 공식은 priceGeneral 기준**으로 한다.

---

## 2.2 가격 구조 원칙

금지:

* Listing에 가격 필드 추가 금지
* Channel에 가격 필드 추가 금지
* 조직별 가격 필드 추가 금지
* DistributionType에 가격 로직 삽입 금지

---

# 3. TimeLimitedPriceCampaign Architecture (확정)

## 3.1 개념

TimeLimitedPriceCampaign은
기본 가격을 "기간 한정"으로 덮어쓰는 선택적 레이어이다.

Campaign은 DistributionType과 완전히 독립된 구조이다.

---

## 3.2 테이블 구조

### 3.2.1 time_limited_price_campaigns

* product_id
* supplier_id
* campaign_price
* start_at
* end_at
* status (DRAFT / ACTIVE / CLOSED)
* campaign_type (GROUPBUY / PROMOTION / CUSTOM)

---

### 3.2.2 campaign_targets

* campaign_id
* organization_id

역할:

* 대상 조직 지정
* 가격 필드 없음

---

### 3.2.3 campaign_aggregations

* campaign_id
* organization_id
* total_quantity

금액 집계 금지.

---

## 3.3 Campaign 적용 공식 (불변)

```ts
unitPrice =
    activeCampaignExists
        ? campaign.campaignPrice
        : product.priceGeneral
```

activeCampaign 조건:

* status = ACTIVE
* 현재 시간이 start_at ~ end_at 사이
* organization이 campaign_targets에 존재

이 공식은 변경 금지.

---

# 4. Distribution Architecture (확정)

## 4.1 DistributionType

```text
PUBLIC
SERVICE
PRIVATE
```

역할:

* 유통 경로 정책
* Listing 생성 정책
* 노출 범위 제어

Campaign과 교차 금지.

---

## 4.2 Listing

Listing은 "노출 정책 객체"이다.

금지:

* Listing에 Campaign 필드 추가 금지
* Listing에 가격 필드 추가 금지
* Campaign 로직을 Listing에 삽입 금지

---

# 5. RECRUIT Architecture (격리 유지)

RECRUIT 구조:

* NeturePartnerRecruitment
* NeturePartnerApplication
* NetureSellerPartnerContract

RECRUIT는 계약/관계 도메인이다.

금지:

* RECRUIT가 Listing을 생성하는 구조 금지
* RECRUIT가 Campaign을 생성하는 구조 금지
* RECRUIT가 DistributionType을 수정하는 구조 금지

Campaign과 RECRUIT은 완전히 독립된 도메인이다.

---

# 6. Order Architecture (확정)

Order는 기존 B2B 구조를 유지한다.

추가된 로직은 Campaign 가격 오버라이드 한 단계뿐이다.

금지:

* Order 테이블 구조 변경 금지
* Campaign 전용 Order 테이블 생성 금지
* 금액 집계 구조 추가 금지

---

# 7. KPA-b / KPA-c 연동 원칙

## 7.1 공동구매 UI

* UI 단어는 "공동구매"
* 내부 도메인 명은 TimeLimitedPriceCampaign

## 7.2 KPA-c (분회)

* Campaign 목록 조회
* 기존 B2B 주문 사용
* 수량 집계 조회 가능

## 7.3 KPA-b (지부)

* 분회별 수량 합산 조회
* 금액 조회 기능 금지

Campaign 생성 및 가격 수정 권한은 Neture 도메인에만 존재한다.

---

# 8. 금지 사항 (Architecture Protection Rules)

다음 변경은 아키텍처 위반으로 간주한다:

1. Listing에 가격 필드 재도입
2. Channel에 가격 필드 재도입
3. 조직별 가격 차등 구조 도입
4. Campaign과 DistributionType 결합
5. Campaign과 RECRUIT 결합
6. Campaign을 KPA 전용 도메인으로 이동
7. Order 구조를 Campaign 전용으로 분기

---

# 9. 최종 구조 다이어그램

```text
Product (Base Price)
      |
TimeLimitedPriceCampaign (Optional Override)
      |
DistributionType
      |
Listing
      |
Order
```

Campaign은 선택적 레이어이며,
존재하지 않으면 시스템은 기본 가격으로 동작한다.

---

# 10. Freeze 선언

Neture 도메인의 가격·유통·캠페인 구조는
본 문서를 기준으로 Freeze 상태로 선언한다.

변경은 별도 아키텍처 검토 문서와 승인 절차를 거쳐야 한다.

---

**Declared: Neture Domain Architecture Freeze (Beta 3 Stage)**
**Date: 2026-02-28**
