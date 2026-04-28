# DOC-O4O-EVENT-OFFER-COMMON-DOMAIN-V1

> Event Offer 공통 도메인 설계 기준
>
> Status: Active
> Version: 1.0
> Created: 2026-04-28

---

## 1. 목적

Event Offer 기능을 KPA 전용 기능이 아닌
O4O Platform 공통 도메인으로 정의하고,
향후 다수 서비스에서 재사용 가능한 구조 기준을 확정한다.

---

## 2. 도메인 정의

Event Offer는
공급자가 특정 조건(가격, 기간, 수량 등)을 설정하여 제안하고,
서비스 운영자가 이를 승인한 후,
매장 경영자가 해당 조건에 따라 참여(주문)하는
기간·수량 기반 거래 단위이다.

---

## 3. 핵심 흐름

```
[공급자]
Event Offer 생성 (pending)

→

[운영자]
승인 (approved)

→

[시스템]
startAt 도달 → active

→

[매장 경영자]
참여 및 주문

→

endAt 경과 → ended
```

---

## 4. 상태(State) 모델

| 상태 | 설명 |
|------|------|
| `pending` | 공급자 제안, 미노출 |
| `approved` | 승인됨, 시작 전 |
| `active` | 진행 중 (주문 가능) |
| `ended` | 종료됨 (노출 제외) |
| `canceled` | 취소됨 |

> DB 저장값: `pending` / `approved` / `canceled`
> 런타임 계산값: `approved`(곧 시작) / `active`(진행중) / `ended`(종료)
> 계산 함수: `resolveEventStatus()` — `apps/api-server/src/routes/kpa/services/event-offer.service.ts`

---

## 5. 노출 정책

### 매장 경영자

노출 조건:
- `status IN ('approved', 'active')`
- 현재 시간 >= `start_at`
- 현재 시간 <= `end_at`
- `total_quantity > 0` (또는 제한 없음)

결과:
- `active`만 실질적 참여 대상
- `ended` / `canceled` / `pending`은 노출되지 않음

### 운영자 / 공급자

모든 상태 조회 가능

---

## 6. 수량 정책

| 필드 | 설명 |
|------|------|
| `total_quantity` | 전체 이벤트 수량 제한 |
| `per_store_limit` | 매장별 총 구매 제한 |
| `per_order_limit` | 1회 주문 제한 |

현재 단계:
- `total_quantity` 우선 적용 (원자적 차감, SELECT FOR UPDATE)
- `per_store_limit`, `per_order_limit` 검증 구현 완료

---

## 7. 수정 정책

Event Offer는 생성 이후 수정 불가 (공급자/운영자 모두 동일)

변경 필요 시:
- 취소 또는 재생성

---

## 8. 기술 구조

### 8.1 Core Service

```
EventOfferService
- resolveEventStatus()   : 상태 계산 (순수 함수)
- participate()          : 참여/주문 처리 + SELECT FOR UPDATE
- listGroupbuys()        : 매장 경영자용 목록 조회
- listGroupbuysEnriched(): 상품/공급자 정보 포함 조회
- getGroupbuyStats()     : 집계 통계
```

공통 도메인 로직 — KPA 의존성 없음

파일: `apps/api-server/src/routes/kpa/services/event-offer.service.ts`

### 8.2 Service Adapter (서비스별)

```
현재:
KPA Adapter
→ 권한 (kpa_members)
→ route (/groupbuy, /groupbuy-admin)
→ 파일: event-offer.controller.ts, event-offer-operator.controller.ts

향후:
K-Cosmetics Adapter
Neture Adapter
GlycoPharm Adapter
```

서비스별 차이(권한/라우트)만 처리, 비즈니스 로직은 Core Service 공유

---

## 9. 데이터 구조

테이블: `organization_product_listings`

| 필드 | 타입 | 설명 |
|------|------|------|
| `service_key` | varchar(50) | 서비스 구분자 |
| `status` | varchar(20) | pending / approved / canceled |
| `start_at` | timestamp | 시작 일시 (nullable) |
| `end_at` | timestamp | 종료 일시 (nullable) |
| `total_quantity` | integer | 전체 수량 제한 (nullable) |
| `per_store_limit` | integer | 매장별 한도 (nullable) |
| `per_order_limit` | integer | 1회 주문 한도 (nullable) |

마이그레이션: `1771200000026-EventOfferCoreReform.ts`

---

## 10. service_key 정책

현재 값:
```
service_key = 'kpa-groupbuy'
```

정책:
- 값 변경하지 않음 (레거시 호환)
- **코드에서 반드시 `SERVICE_KEYS.KPA_GROUPBUY` 상수 사용**
- 리터럴 하드코딩 `'kpa-groupbuy'` 금지

향후:
- `o4o-event-offer` 등 공통 key로 전환 가능 (별도 migration 필요)

---

## 11. API 정책

현재 유지 (frozen):
```
/api/v1/kpa/groupbuy
/api/v1/kpa/groupbuy-admin
/api/v1/kpa/supplier/event-offers
```

원칙:
- 외부 API는 서비스별 유지
- 내부 로직은 공통 서비스 사용
- URL 변경 금지

---

## 12. 공통화 범위

### 즉시 공통화 가능

```
resolveEventStatus()          — 순수 함수
참여 트랜잭션 패턴 (participate) — domain-agnostic
수량 검증 로직                 — SELECT FOR UPDATE + compensation
EventOfferError               — 표준 에러 클래스
```

### 서비스별 유지

```
조직/권한 조회 (resolveOperatorOrgId — kpa_members 의존)
route 구조 (/groupbuy 등)
UI/UX
```

---

## 13. 확장 전략

```
KPA (기준 구현)
→ Neture
→ K-Cosmetics
→ GlycoPharm
```

각 서비스 적용 시:
- 동일 `EventOfferService` 사용
- `service_key`만 분리 (`SERVICE_KEYS.{SERVICE}`)
- 권한/조직 조회만 별도 adapter 구현

---

## 14. 금지 사항

- `service_key` 값 변경 금지 (migration 없이)
- API URL 변경 금지
- 테이블 분리 금지 (단일 `organization_product_listings` 유지)
- Generic 클래스 도입 금지 (현 단계 — 다수 서비스 수요 발생 시 재검토)
- `'kpa-groupbuy'` 리터럴 하드코딩 금지

---

## 15. 현재 상태 정의

Event Offer는
공통 도메인 구조를 갖춘 상태이며,
현재는 KPA adapter를 통해 제공되는 1차 구현 상태이다.

완료된 작업:
- WO-O4O-EVENT-OFFER-CORE-REFORM-V1: status + 날짜 + 수량 필드 추가
- WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V1: 수량 제한 원자적 검증
- WO-O4O-EVENT-OFFER-BACKEND-NAMING-ALIGNMENT-V1: Groupbuy → EventOffer 명칭 정렬
- WO-O4O-EVENT-OFFER-SERVICE-KEY-NORMALIZATION-V1: 하드코딩 제거, SERVICE_KEYS 상수 통일

---

## 한 줄 결론

**Event Offer는 KPA 기능이 아니라 O4O 공통 도메인으로 확정한다.**
