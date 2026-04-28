# DOC-O4O-EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1

> **상태**: ACTIVE  
> **작성일**: 2026-04-28  
> **근거 WO**: WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1, WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2

---

## 1. 목적

Event Offer의 공통 도메인 구조에서 Neture의 역할을 명확히 정의하고,  
서비스 적용 대상과 지원 허브를 구분한다.

---

## 2. 기본 원칙

Event Offer는 O4O 공통 도메인이다.  
그러나 모든 시스템이 동일한 방식으로 사용하는 것은 아니다.

---

## 3. 시스템 역할 구분

### 3.1 매장 서비스 (공통 적용 대상)

```text
- KPA-Society
- K-Cosmetics
- GlycoPharm
- 기타 매장 기반 서비스
```

특징:

```text
- 매장(Store)이 존재
- 내 매장 상품 구조가 존재
- Event Offer → 매장 상품 확보 흐름으로 연결
```

### 3.2 Neture (지원 허브)

Neture는 매장 서비스가 아니다.

```text
- 공급자 / 파트너 / 운영자 중심 허브
- 매장(Store) 중심 서비스가 아님
- 실행 채널이 아니라 지원/중개 채널
```

---

## 4. Event Offer 적용 방식 차이

### 4.1 매장 서비스에서의 Event Offer

```
Event Offer = 매장 상품 확보 채널
```

흐름:

```text
Event Offer 참여
→ 상품 확보
→ 내 매장 상품 등록
→ 매장 판매
```

### 4.2 Neture에서의 Event Offer

```
Event Offer = 공급자 제안 / 관리 / 운영 흐름
```

흐름:

```text
공급자 제안
→ 조건 설정
→ (운영자 관점) 관리/노출
→ 실제 실행은 매장 서비스에서 발생
```

---

## 5. 핵심 구분

| 구분 | 역할 |
|------|------|
| **매장 서비스** | Event Offer를 **소비(사용)** 한다 |
| **Neture** | Event Offer를 **생성/관리/지원** 한다 |

---

## 6. 기술 구조 기준

### 6.1 공통 영역

```text
EventOfferService
- 상태 계산 (resolveEventStatus)
- 수량 제한 (per_order_limit / per_store_limit / total_quantity)
- 참여/주문 로직 (SELECT FOR UPDATE + compensation)
- getListingAvailability
```

serviceKey 파라미터로 KPA / Neture / 기타 서비스 격리.

### 6.2 매장 서비스

```text
- StoreProductsPage
- Event Offer 탭
- 참여 → 내 매장 상품 연결
```

### 6.3 Neture

```text
- SupplierEventOfferPage / Operator 관리 화면
- Event Offer 조회/관리 중심
- 내 매장 상품 확보 흐름 없음
```

---

## 7. API 구조 기준

| 대상 | 엔드포인트 |
|------|-----------|
| KPA (매장 서비스) | `/api/v1/kpa/groupbuy/*` |
| 기타 매장 서비스 | `/api/v1/{service}/event-offers/*` |
| Neture (지원 허브) | `/api/v1/neture/event-offers/*` |

---

## 8. 금지 사항

```text
❌ Neture를 매장 서비스와 동일한 공통 적용 대상으로 취급
❌ Neture에 "내 매장 상품 확보 흐름" 강제 연결
❌ Event Offer를 Neture 중심으로 재설계
```

---

## 9. 허용 사항

```text
✅ Neture에서 Event Offer 생성/관리 가능
✅ Neture에서 Event Offer 목록 조회 가능
✅ Neture에서 참여 테스트/검증 가능 (개발/운영 목적)
```

---

## 10. 현재 구현 상태 해석

Neture Event Offer 구현(`WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1`)은  
공통 서비스 확장이 아니라 **"지원 허브 연계 구현"** 이다.

serviceKey `neture-event-offer`는 공급자/운영자 관점의 데이터 격리 단위이며,  
매장 서비스의 `kpa-groupbuy`와 같은 실행 흐름을 공유하지 않는다.

---

## 11. 향후 확장 기준

```text
새로운 서비스에 Event Offer 적용 시:
→ 매장 서비스 구조에 맞게 적용
→ serviceKey 신규 발급 (SERVICE_KEYS에 등록)
→ EventOfferService 공통 사용 (복제 금지)

Neture는:
→ 별도 허브 역할 유지
→ 매장 서비스 흐름 편입 금지
```

---

## 한 줄 결론

> **Event Offer는 매장 서비스의 실행 기능이고, Neture는 그 실행을 지원하는 허브이다.**

---

*Version: 1.0*  
*Status: ACTIVE*
