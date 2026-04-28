# WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V2

> **상태**: OPEN  
> **작성일**: 2026-04-28  
> **우선순위**: High  
> **영향 범위**: EventOfferService / KPA Controller / Neture Controller / KPA Frontend / Neture Frontend

---

## 0. 작업 정의

> **이 WO는 서버 검증 신규 구현이 아니다.**  
> 이미 `participate()`에 완성된 서버 검증(total_quantity / per_order_limit / per_store_limit / SELECT FOR UPDATE / compensation rollback)을  
> **조회 응답 · 가용수량 API · 프론트엔드 UX에 연결하는 작업이다.**

---

## 1. 배경 및 목적

V1(`WO-O4O-EVENT-OFFER-QUANTITY-LIMITS-V1`)에서 `participate()` 서버 검증은 완성되었다:

| 제한 유형 | V1 서버 검증 | V1 프론트엔드 |
|-----------|:---:|:---:|
| `total_quantity` 원자적 차감 (SELECT FOR UPDATE) | ✅ | ❌ 미노출 |
| `per_order_limit` 1회 주문 수량 상한 | ✅ | ❌ 미적용 |
| `per_store_limit` 매장별 누적 구매 상한 | ✅ | ❌ 미노출 |
| compensation rollback (주문 실패 시 차감 복원) | ✅ | — |

**문제**: 서버는 막지만 프론트엔드는 한도를 알지 못한다.  
사용자가 한도를 초과하는 수량을 입력 → 서버 에러 → UX 불량.

**V2 목표**: 서버 계산 결과를 API에 노출 → 프론트엔드가 입력 시점에 한도를 표시/강제.

---

## 2. 갭 분석

### 2-A. `listGroupbuysEnriched` 응답에 수량 정보 없음

현재 SELECT에 `total_quantity`, `per_order_limit`, `per_store_limit` 미포함.  
`EventOfferItem` 타입에도 해당 필드 없음.

```typescript
// 현재: 수량 정보 없음
interface EventOfferItem {
  id, offerId, price, isActive, status, startAt, endAt,
  supplierId, unitPrice, productName, supplierName
  // ← totalQuantity, perOrderLimit 없음
}
```

### 2-B. 매장별 잔여 한도(per_store_limit remaining)를 조회하는 API 없음

인증된 사용자가 "이미 몇 개 주문했는가"를 조회할 방법이 없다.  
상세 페이지(`GET /:id`)도 현재 `opl.*` 전체를 반환하므로 per_store_limit 컬럼은 있지만  
**해당 사용자의 누적 주문량**은 없다.

### 2-C. 프론트엔드 quantity input에 max 미적용

KPA `EventOfferContentPanel`, Neture `EventOfferPage` 모두  
`<input type="number" min={1} />` 뿐이며 서버 한도 반영 없음.

### 2-D. `ACTIVE_OFFER_CLAUSE`가 `total_quantity = 0` 제외 — 정상

```sql
AND (opl.total_quantity IS NULL OR opl.total_quantity > 0)
```
목록 조회 수준에서 품절 이벤트를 자동 제외. 이 동작은 유지.

---

## 3. 변경 범위

### 범위 요약

```
Backend
  EventOfferService
    - listGroupbuysEnriched(): total_quantity, per_order_limit, per_store_limit 추가
    - getListingAvailability(listingId, userId, serviceKey): 인증 사용자용 잔여 한도 조회

  KPA Controller
    - GET /:id 응답에 availability 포함 (authenticate 시)

  Neture Controller
    - GET /:id 응답에 availability 포함 (requireAuth 시)

Frontend
  KPA: EventOfferContentPanel, EventOfferDetailPage
  Neture: EventOfferPage
    - 잔여 수량 표시
    - per_order_limit 기준 max 적용
    - 품절/한도 초과 상태 UI
```

### 절대 금지

| 금지 항목 | 이유 |
|-----------|------|
| `participate()` 핵심 트랜잭션 로직 재작성 | V1 완성 상태 — 건드리면 race condition 보장 깨짐 |
| `serviceKey` 기본값 의존 | Neture 호출이 KPA로 silently fallback되는 버그 유발 |
| KPA/Neture 분기 코드 복제 | serviceKey 파라미터로 처리 — 서비스별 if 분기 금지 |
| API URL 변경 | `/groupbuy/*`, `/event-offers/*` 경로 동결 |

---

## 4. 상세 명세

### 4-A. `listGroupbuysEnriched` — 수량 필드 추가

**Backend `event-offer.service.ts`**

SELECT에 추가:
```sql
opl.total_quantity     AS "totalQuantity",
opl.per_order_limit    AS "perOrderLimit",
opl.per_store_limit    AS "perStoreLimit"
```

응답 map에 추가:
```typescript
totalQuantity: r.totalQuantity !== null ? Number(r.totalQuantity) : null,
perOrderLimit: r.perOrderLimit !== null ? Number(r.perOrderLimit) : null,
perStoreLimit: r.perStoreLimit !== null ? Number(r.perStoreLimit) : null,
```

**타입 변경 (`EventOfferItem`)**:
```typescript
interface EventOfferItem {
  // ...기존 필드 유지...
  totalQuantity: number | null;    // null = 무제한
  perOrderLimit: number | null;    // null = 무제한
  perStoreLimit: number | null;    // null = 무제한
}
```

KPA `EventOfferItem` 타입, Neture `EventOfferPage` 로컬 `OfferItem` 타입 모두 업데이트.

---

### 4-B. `getListingAvailability` — 새 메서드

인증된 사용자가 특정 이벤트에 대해 "현재 주문 가능한 최대 수량"을 조회.

```typescript
async getListingAvailability(
  listingId: string,
  userId: string,
  serviceKey: string = SERVICE_KEYS.KPA_GROUPBUY,
): Promise<{
  totalQuantity: number | null;      // 전체 잔여 수량
  perOrderLimit: number | null;      // 1회 주문 최대
  perStoreLimit: number | null;      // 매장 누적 최대
  alreadyOrdered: number;            // 이미 주문한 누적 수량
  availableForStore: number | null;  // perStoreLimit - alreadyOrdered (null = 무제한)
  maxOrderable: number;              // min(totalQuantity, perOrderLimit, availableForStore)
  isSoldOut: boolean;
}> {
  // 1. listing 조회 (service_key 격리)
  // 2. 매장 누적 주문량 조회 (per_store_limit 검사용)
  // 3. maxOrderable 계산:
  //    candidates = [perOrderLimit, availableForStore, totalQuantity].filter(v => v !== null)
  //    maxOrderable = candidates.length > 0 ? Math.min(...candidates) : Infinity → clamp to 999
}
```

**이 메서드를 호출하는 엔드포인트**:

KPA: `GET /groupbuy/:id` (이미 있는 라우트) — `optionalAuth` → 인증 시 availability 포함  
Neture: `GET /event-offers/:id` — `requireAuth` → 항상 availability 포함

응답 예시:
```json
{
  "success": true,
  "data": { ...listing },
  "availability": {
    "totalQuantity": 100,
    "perOrderLimit": 5,
    "perStoreLimit": 10,
    "alreadyOrdered": 3,
    "availableForStore": 7,
    "maxOrderable": 5,
    "isSoldOut": false
  }
}
```

---

### 4-C. 프론트엔드 UI 반영

**적용 대상 컴포넌트:**
- `services/web-kpa-society/src/components/event-offer/EventOfferContentPanel.tsx`
- `services/web-neture/src/pages/store/EventOfferPage.tsx`

**변경 내용:**

1. **잔여 수량 배지**
   - `totalQuantity !== null`: 잔여 N개 표시
   - `totalQuantity <= 10`: 경고 색상 (주황)
   - `isSoldOut`: 품절 배지, 참여 버튼 비활성

2. **quantity input max 적용**
   - enriched 목록의 `perOrderLimit` 사용 (상세 호출 불필요)
   - `maxOrderable`이 API에서 오면 그것을 사용, 없으면 `perOrderLimit` 사용
   - `<input type="number" min={1} max={effectiveMax} />`

3. **에러 메시지 표준화**
   - 서버 에러 코드별 메시지:
     ```
     SOLD_OUT           → "판매 종료된 이벤트입니다."
     INSUFFICIENT_QUANTITY → "잔여 수량이 N개입니다."
     PER_ORDER_LIMIT_EXCEEDED → "1회 최대 N개까지 주문 가능합니다."
     PER_STORE_LIMIT_EXCEEDED → "매장 구매 한도를 초과하였습니다."
     ```
   - 현재는 서버 메시지를 그대로 표시 — 에러 코드 기반으로 변경

4. **KPA EventOfferContentPanel 변경 금지 사항**
   - 기존 `compact` prop, 필터 탭, 페이지네이션 구조 유지
   - 수량 관련 표시만 추가

---

## 5. 구현 순서

```
Step 1: EventOfferService.listGroupbuysEnriched() — 수량 필드 3개 추가 (SELECT + map)
Step 2: EventOfferService.getListingAvailability() — 새 메서드 추가
Step 3: KPA Controller GET /:id — availability 포함 응답
Step 4: Neture Controller GET /:id — availability 포함 응답
Step 5: KPA EventOfferItem 타입 + EventOfferContentPanel UI
Step 6: Neture EventOfferPage OfferItem 타입 + UI
```

---

## 6. 검증 기준 (완료 조건)

| 항목 | 기준 |
|------|------|
| listGroupbuysEnriched 응답 | `totalQuantity`, `perOrderLimit`, `perStoreLimit` 포함 |
| availability API | `maxOrderable` 계산 정확성 (3개 후보값 min) |
| quantity input | `max={perOrderLimit}` 적용, 초과 입력 불가 |
| 품절 표시 | `total_quantity=0` 또는 `isSoldOut=true` 시 참여 버튼 비활성 |
| 에러 코드 표시 | 4개 에러 코드 모두 한국어 메시지로 표시 |
| KPA 무영향 | 기존 enriched 호출 응답 형식 하위 호환 (필드 추가만, 제거 없음) |
| Neture serviceKey 격리 | availability 조회 시 neture-event-offer 기준 per_store 계산 |

---

## 7. 제외 범위

- **Operator 수량 수동 조정 UI** — 별도 WO
- **수량 변경 이력(audit log)** — 별도 WO
- **웨이팅 리스트(품절 후 알림)** — 별도 WO
- **DB 마이그레이션** — `total_quantity`, `per_order_limit`, `per_store_limit` 컬럼은 이미 존재 (V1에서 생성)

---

*Version: 1.0*  
*Status: OPEN → 구현 시작 가능*
