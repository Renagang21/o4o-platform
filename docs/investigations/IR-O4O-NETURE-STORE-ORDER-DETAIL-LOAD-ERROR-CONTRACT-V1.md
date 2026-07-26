# IR-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1

> 유형: 조사 → **구현 진행 판정**
> 일자: 2026-07-26
> 선행: `IR-O4O-NETURE-SUPPLIER-ORDER-AUX-404-ERROR-CONTRACT-AUDIT-V1` (우선순위 3)
> 조사 범위 변경: 코드 0 / backend 0 / DB 0 / 운영 데이터 접근 0

---

## 1. 대상 함수

| 함수 | 정의 | endpoint | 반환 타입 |
|------|------|----------|-----------|
| `storeApi.getOrderById()` | [store.ts:372](services/web-neture/src/lib/api/store.ts#L372) | `GET /neture/seller/orders/:id` | `StoreOrder \| null` |
| `storeApi.getShipment()` | [store.ts:361](services/web-neture/src/lib/api/store.ts#L361) | `GET /neture/seller/orders/:orderId/shipment` | `Shipment \| null` |

별칭(`shipment` / `orderDetail` / `getOrder`) 전수 검색 결과 매장 측 소비처는 `StoreOrderDetailPage` 1곳뿐이다.

---

## 2. backend 계약 — `getOrderById`

핸들러 [seller.controller.ts:265-287](apps/api-server/src/modules/neture/controllers/seller.controller.ts#L265-L287)
서비스 [neture.service.ts:760-770](apps/api-server/src/routes/neture/services/neture.service.ts#L760-L770)

```ts
async getOrder(id: string, userId?: string): Promise<OrderDto | null> {
  const order = await this.repository.findOrderById(id);
  if (!order) return null;
  if (userId && order.userId !== userId) return null;   // 타인 주문 → null
  return this.toOrderDto(order);
}
```

| 상황 | 응답 |
|------|------|
| 정상 | `200 { success:true, data:{...} }` |
| 주문 미존재 | `404 ORDER_NOT_FOUND` |
| **타인 매장 주문** | `404 ORDER_NOT_FOUND` (미존재와 동일 — 존재 은닉) |
| 미인증 | `401 UNAUTHORIZED` |
| 서버 오류 | `500 INTERNAL_ERROR` |
| **403** | **경로 없음** |
| **정상 `null`** | **없음** |

`requireAuth` 만 사용하고 별도 매장 스코프 가드가 없다 — 소유권은 `order.userId !== userId` 로만 판정한다.
비-UUID `orderId` 는 검증 없이 repository 로 내려가 캐스팅 오류 → 500 가능(공급자 측과 동일 패턴).

**핵심 답**: 404 만 정상 not-found 로 분류할 수 있다. 정상 `null` 상태는 존재하지 않는다.

---

## 3. backend 계약 — `getShipment`

핸들러 [seller.controller.ts:293-315](apps/api-server/src/modules/neture/controllers/seller.controller.ts#L293-L315)
서비스 [seller.service.ts:234-240](apps/api-server/src/modules/neture/services/seller.service.ts#L234-L240)

```ts
const order = await legacyNetureService.getOrder(orderId, userId);
if (!order) return res.status(404).json({ success:false, error:'ORDER_NOT_FOUND', ... });
const shipment = await sellerService.getShipmentByOrderId(orderId);   // rows[0] || null
res.json({ success: true, data: shipment });
```

| 상황 | 응답 |
|------|------|
| **주문 존재 + 배송 미생성** | **`200 { success:true, data:null }`** |
| 배송 존재 | `200 + 객체` |
| 주문 미존재 · 타인 소유 | `404 ORDER_NOT_FOUND` |
| 미인증 | `401 UNAUTHORIZED` |
| 서버 오류 | `500 INTERNAL_ERROR` |
| **403** | **경로 없음** |

공급자 측 endpoint 와 별개로 확인했으며, 결과적으로 **동일한 계약**이다
(단 소유권 판정 기준이 다르다 — 공급자는 `validateOwnership(orderId, supplierId)`, 매장은 `order.userId === userId`).

**핵심 답**: 정상 배송 미생성 상태가 실재한다 → 반환 타입의 `null` 은 유지해야 한다.

---

## 4. 현재 frontend fallback

```ts
async getOrderById(id: string): Promise<StoreOrder | null> {
  try { const response = await api.get(`/neture/seller/orders/${id}`); return response.data.data || null; }
  catch (error) { console.warn('[Store API] Failed to fetch order:', error); return null; }
}

async getShipment(orderId: string): Promise<Shipment | null> {
  try { const response = await api.get(`/neture/seller/orders/${orderId}/shipment`); return response.data.data || null; }
  catch (error) { console.warn('[Store API] Failed to fetch shipment:', error); return null; }
}
```

### getOrderById

| 입력 | 현재 반환 | 구분 |
|------|:---------:|:----:|
| `200 + 정상 객체` | 객체 | ✅ |
| `404` | `null` | ❌ |
| `401` | `null` | ❌ |
| `500` | `null` | ❌ |
| 네트워크 오류 | `null` | ❌ |
| `200 + 깨진 payload` | `null` (형상 검증 0) | ❌ |

### getShipment

| 입력 | 현재 반환 | 구분 |
|------|:---------:|:----:|
| `200 + null` (정상 미출고) | `null` | — |
| `200 + 객체` | 객체 | ✅ |
| `404` · `401` · `500` · 네트워크 · 깨진 payload | `null` | ❌ |

공통: `response.data.data`(옵셔널 체이닝 없음) · 고정 오류 코드 없음 · `id` 미인코딩.

---

## 5. 소비처 · 화면의 null 처리

**유일 소비처**: [StoreOrderDetailPage.tsx:137-152](services/web-neture/src/pages/store/StoreOrderDetailPage.tsx#L137-L152)
**route**: `/store/orders/:id` ([App.tsx:915](services/web-neture/src/App.tsx#L915)) — `/account/store/orders/:id` 는 **존재하지 않는다.**

```ts
Promise.all([storeApi.getOrderById(id), storeApi.getShipment(id)])
  .then(([orderResult, shipmentResult]) => {
    if (orderResult) setOrder(orderResult); else setNotFound(true);   // ← 오류를 not-found 로 위장
    setShipment(shipmentResult);
    setLoading(false);
  });
```

| 상태 | 현재 |
|------|------|
| loading | `주문 정보를 불러오는 중...` |
| not-found | `if (notFound || !order)` → "주문을 찾을 수 없습니다" |
| **error** | **없음** — 404·401·500·네트워크가 전부 not-found 로 표시 |
| 배송 실패 | `shipment = null` → `{shipment && ...}` 로 **배송 추적 섹션 무성 소멸** |

주문 오류와 배송 오류가 **하나의 `null` 로 결합**되어 있다.
`.then()` 만 있고 `.catch()` 가 없으나 두 API 모두 현재는 reject 하지 않아 안전하다 —
**throw 계약으로 바꾸는 순간 unhandled rejection 이 되므로 함께 고쳐야 한다.**

**mutation 전수**: `handleReorder()`(재주문 → 장바구니 담기) 1건.
`order.items` 에만 의존하고 `shipment` 와 무관하다. 주문 로드 실패 시에는 화면이 not-found/error 라 도달 불가.
배송 상태 변경·수령 확인 등 **배송 관련 mutation 은 매장 측에 존재하지 않는다**(읽기 전용 추적).

---

## 6. 위험도

| 함수 | 위험도 | 근거 |
|------|:------:|------|
| `getOrderById()` | **P1** | 5xx·네트워크 장애가 **"주문을 찾을 수 없습니다"** 로 표시된다. 매장 사용자는 주문이 사라졌다고 오인하고 재주문·문의로 이어질 수 있다. 재시도 수단도 없다 |
| `getShipment()` | **P2** | 배송 추적 섹션이 오류 표시 없이 사라져 "배송 정보 미등록" 으로 오인된다. 다만 매장 측에는 배송 관련 mutation 이 없어(읽기 전용) 잘못된 상태 변경으로 이어지지 않는다 — 공급자 측 P1 보다 낮다 |

---

## 7. A/B/C/D/E 판정

| 함수 | 등급 | 근거 |
|------|:----:|------|
| `getOrderById()` | **C** | API 가 404·401·5xx·네트워크·깨진 payload 를 모두 `null` 로 삼키고, 소비처가 그 `null` 을 not-found 로 확정 표시 |
| `getShipment()` | **C** | 동일하게 전부 `null` 로 삼키고, 소비처가 섹션 숨김으로 흡수 |

D 후보 없음 — fail-open 근거가 코드·주석·UX 어디에도 없다.

---

## 8. 구현 가능 여부 — **진행**

| 판정 항목 | 결과 |
|-----------|------|
| backend 응답 의미 명확한가 | **명확** (§2·§3, 코드로 확정) |
| 정상 `null` 과 오류를 구분 가능한가 | **가능** — 주문은 정상 null 없음, 배송은 `200 + null` 만 정상 |
| 소유권 계약 변경 필요한가 | 불필요 (404 존재 은닉 유지) |
| backend 변경 필수인가 | **불필요** |
| frontend-only 완결 가능한가 | **가능** — 소비처 1곳, route 1개 |

→ **중지 조건에 해당하지 않으므로 같은 작업에서 구현까지 진행한다.**

권장 계약:

```text
getOrderById → Promise<StoreOrder>            (null 제거)
  404 → STORE_ORDER_NOT_FOUND
  그 외 → STORE_ORDER_LOAD_FAILED

getShipment  → Promise<Shipment | null>       (정상 미출고 유지)
  200 + null → null
  404 → STORE_SHIPMENT_ORDER_NOT_FOUND
  그 외 → STORE_SHIPMENT_LOAD_FAILED
```

구현 결과는 `CHECK-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1.md` 에 기록한다.

---

## 9. 범위 밖 (기록만)

| # | 항목 |
|---|------|
| 1 | `GET /neture/seller/orders/:id` · `/shipment` 의 UUID 검증 누락 → 비-UUID 시 500 (공급자 측과 동일, backend 소규모 후속) |
| 2 | 매장 측 주문 목록 `storeApi.getOrders()` — `catch → { data: [], meta: 0 }` 로 "정상 0건" 위장 (별도 항목) |

---

*Recorded: 2026-07-26*
