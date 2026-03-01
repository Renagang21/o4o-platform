# NETURE-DOMAIN-BOUNDARY-V1

## 1. 문서 목적

본 문서는 Neture 도메인의 **책임 범위와 타 도메인과의 경계**를 명확히 정의한다.

목표:

- Neture를 Supply & Distribution Core로 고정
- 타 도메인의 직접 개입 차단
- 구조 오염 방지
- 장기적 도메인 분리 가능성 확보

---

## 2. Neture의 정체성

```text
Neture = Supply & Distribution Core
```

Neture는 다음 실행 레이어의 **독점 소유자**이다:

```text
Supplier
Offer
DistributionType
Listing
Order
Campaign (정책 레이어)
```

이 영역은 Neture의 Core 책임이다.

---

## 3. 도메인 책임 구분

### 3.1 Neture가 소유하는 것

| 영역 | 설명 |
|------|------|
| Supplier | 공급자 등록, 승인, 상태 |
| Offer | 상품 제안, 승인, 활성화 |
| DistributionType | PUBLIC / PRIVATE / SERVICE 정책 |
| Listing | 조직 단위 노출 |
| Order | 주문 생성, 가격 계산, 트랜잭션 |
| Campaign | 가격 오버레이 정책 |

이 데이터는 Neture 내부에서만 수정 가능하다.

### 3.2 타 도메인의 역할

타 도메인(GlycoPharm, KPA, Cosmetics 등)은:

```text
Neture API Consumer
```

역할은 다음으로 제한된다:

- 상품 조회
- Listing 조회
- 주문 생성 요청
- 주문 상태 조회

수정 권한은 없다.

---

## 4. 수정 금지 영역

다음 행위는 경계 위반으로 간주한다.

1. 타 도메인에서 Supplier 수정
2. Offer 승인/수정
3. DistributionType 변경
4. Listing 직접 생성
5. Order 가격 직접 계산
6. Neture 트랜잭션 공유
7. Neture DB 직접 JOIN

---

## 5. 기술적 경계 원칙

### 5.1 Entity Import 금지

다음은 금지된다:

```ts
import { SupplierProductOffer } from 'neture/...'
```

타 도메인은 Neture entity를 직접 import하지 않는다.

### 5.2 DB 직접 접근 금지

타 도메인은 다음을 수행할 수 없다:

```sql
JOIN supplier_product_offers
JOIN organization_product_listings
JOIN neture_orders
```

모든 접근은 API 계층을 통해야 한다.

### 5.3 트랜잭션 공유 금지

Neture의 트랜잭션은 외부 도메인과 공유되지 않는다.

Neture는 자체 트랜잭션 경계를 가진다.

---

## 6. Order 소유권 선언

Order는 Neture가 단독 소유한다.

타 도메인은:

- 주문 요청 생성만 가능
- 가격 계산 불가
- 상태 강제 변경 불가

---

## 7. Campaign 위치

Campaign은 Layer 5로 정의되며:

- Neture 내부 정책 레이어
- Execution Layer와 분리
- Order Gate를 우회할 수 없음

---

## 8. 허용되는 상호작용

타 도메인은 다음 인터페이스만 사용한다:

```text
GET  /neture/listings
GET  /neture/offers
POST /neture/orders
GET  /neture/orders/:id
```

이 범위를 벗어난 접근은 경계 위반이다.

---

## 9. 미래 확장 원칙

1. Neture는 독립 서비스로 분리 가능해야 한다.
2. 타 도메인은 Neture를 외부 API로 간주해야 한다.
3. Neture Core 변경은 별도 Freeze 해제 절차를 거친다.

---

## 10. 최종 선언

Neture는 다음 상태로 정의된다:

```text
CORE SUPPLY DOMAIN
BOUNDARY ENFORCED
NO CROSS-DOMAIN MUTATION
```

타 도메인은 Neture를 **내부 모듈이 아닌 외부 Core**로 취급한다.

---

*Version: 1.0*
*Declared: 2026-03-01*
*Status: ACTIVE*
