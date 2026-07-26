# IR-O4O-NETURE-SUPPLIER-ORDER-AUX-404-ERROR-CONTRACT-AUDIT-V1

> 유형: **read-only 조사**
> 일자: 2026-07-26
> 선행: `IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1` · `CHECK-O4O-NETURE-SUPPLIER-ORDER-INVENTORY-SETTLEMENT-LOAD-ERROR-CONTRACT-V1`
> 변경: 코드 0 / backend 0 / DB 0 / migration 0 / 배포 0 / 운영 데이터 접근·write 0

---

## 1. 대상 함수 정의와 endpoint

| 함수 | 객체 | 정의 위치 | endpoint | 파라미터 | 반환 타입 |
|------|------|-----------|----------|----------|-----------|
| `getShipment()` | `supplierApi` | [supplier.ts:1139](services/web-neture/src/lib/api/supplier.ts#L1139) | `GET /neture/supplier/orders/:orderId/shipment` | `orderId` | `Shipment \| null` |
| `getOrderCondition()` | `supplierProfileApi` | [supplier.ts:1363](services/web-neture/src/lib/api/supplier.ts#L1363) | `GET /neture/suppliers/:id/order-condition` | `supplierId` | `SupplierOrderCondition \| null` |

**중요 — 명칭 오해 정정**: `getOrderCondition()` 은 **주문(order) 단위의 조건이 아니다.**
`supplierProfileApi` 소속이며 파라미터는 `supplierId` 다. 실체는 **공급자의 B2B 최소 주문 정책**
(`minOrderAmount` / `minOrderSurcharge` / `note`) 이며, WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1 에서 도입됐다.
따라서 "주문 미존재 404" 라는 개념 자체가 이 함수에는 존재하지 않는다.

별칭 검색(`shipment` / `shipmentInfo` / `orderShipment` / `orderCondition` / `condition` / `conditionInfo`) 결과
동일 이름의 **store 측 함수 1건**이 별도로 존재한다 — `storeApi.getShipment()` ([store.ts:361](services/web-neture/src/lib/api/store.ts#L361)).
공급자 범위 밖이므로 §10 에 인접 항목으로만 기록한다.

---

## 2. backend 계약

### 2-1. `getShipment()` — `GET /supplier/orders/:orderId/shipment`

핸들러: [supplier-order.controller.ts:246-262](apps/api-server/src/modules/neture/controllers/supplier-order.controller.ts#L246-L262)
서비스: [supplier-order.service.ts:210-216](apps/api-server/src/modules/neture/services/supplier-order.service.ts#L210-L216)

```ts
const isOwner = await service.validateOwnership(orderId, supplierId);
if (!isOwner) return res.status(404).json({ success:false, error:'ORDER_NOT_FOUND', ... });
const shipment = await service.getShipment(orderId, supplierId);   // rows[0] || null
res.json({ success: true, data: shipment });
```

| 상황 | 응답 |
|------|------|
| **배송 정보 미생성(출고 전)** | **`200 { success:true, data: null }`** |
| 배송 정보 존재 | `200 { success:true, data: {...} }` |
| 주문 미존재 | `404 ORDER_NOT_FOUND` |
| **타인 공급자 주문** | `404 ORDER_NOT_FOUND` (미존재와 동일 — 의도된 존재 은닉) |
| 미인증 | `401 UNAUTHORIZED` (`requireAuth`) |
| 공급자 계정 미연결 | **`401 NO_SUPPLIER`** ([neture-identity.middleware.ts:88](apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts#L88)) |
| 서버 오류 | `500 INTERNAL_ERROR` |
| **403** | **경로 없음** |

> `requireLinkedSupplier` 는 공급자 미연결 시 403 이 아니라 **401** 을 반환한다.
> 즉 이 endpoint 에 403 상태는 존재하지 않는다. 프론트에서 403 분기를 만들면 죽은 코드가 된다.

**비대칭 1건**: `POST /orders/:orderId/shipment` 는 `UUID_REGEX` 검증([:202](apps/api-server/src/modules/neture/controllers/supplier-order.controller.ts#L202))이 있으나
**GET 에는 없다.** 비-UUID `orderId` 는 `validateOwnership` 의 `oi.order_id = $1` 에서 캐스팅 오류 → **500**.
(라이브러리 단건 조회에서 확인된 것과 동일한 패턴.)

### 2-2. `getOrderCondition()` — `GET /suppliers/:id/order-condition`

핸들러: [neture.routes.ts:246-258](apps/api-server/src/modules/neture/neture.routes.ts#L246-L258)
서비스: [supplier.service.ts:528-541](apps/api-server/src/modules/neture/services/supplier.service.ts#L528-L541)

```ts
const supplier = await this.supplierRepo.findOne({ where: { id: supplierId, status: SupplierStatus.ACTIVE } });
if (!supplier) return null;                       // → 라우트에서 404 SUPPLIER_NOT_FOUND
return { supplierId, supplierName, minOrderAmount ?? null, minOrderSurcharge ?? null, note ?? null };
```

| 상황 | 응답 |
|------|------|
| **조건 미설정 공급자** | **`200 { success:true, data:{ minOrderAmount:null, minOrderSurcharge:null, note:null } }`** |
| 조건 설정됨 | `200 + 값 채워진 객체` |
| 공급자 미존재 | `404 SUPPLIER_NOT_FOUND` |
| **공급자 비-ACTIVE** | `404 SUPPLIER_NOT_FOUND` (미존재와 동일) |
| 미인증 | `401` (`requireAuth` 만 — 공급자 스코프 가드 없음) |
| 서버 오류 | `500 INTERNAL_ERROR` |
| **403** | **경로 없음** |

**핵심**: 이 endpoint 는 **정상 `null` 응답이 존재하지 않는다.**
ACTIVE 공급자면 항상 객체를 반환하고, 조건 미설정은 **객체 내부 필드가 null** 일 뿐이다.
404 는 "공급자 부재 또는 비활성" = **오류 상태**다.
`supplierOnboardingApi.getOnboarding()` 과 정확히 동일한 구조이며, 해당 함수는
`WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1` 에서 이미 같은 근거로 정비됐다.

---

## 3. 정상 미존재 의미

| 함수 | 정상 미존재 상태 | 의미 | 유지 필요 |
|------|-----------------|------|:---------:|
| `getShipment()` | **있음** — `200 + data:null` | 주문은 존재하나 아직 출고 전(송장 미등록) | **필수** |
| `getOrderCondition()` | **없음** | 조건 미설정은 200 + 필드 null 로 표현됨 | 해당 없음 |

두 함수의 정상 미존재 의미가 **정반대**다. 이것이 §9 묶음 판정의 결정 근거다.

---

## 4. 현재 frontend fallback

### 4-1. `getShipment()`

```ts
async getShipment(orderId: string): Promise<Shipment | null> {
  try {
    const response = await api.get(`/neture/supplier/orders/${orderId}/shipment`);
    return response.data.data || null;
  } catch (error) {
    console.warn('[Supplier API] Failed to fetch shipment:', error);
    return null;              // ← 404 / 401 / 500 / 네트워크 전부
  }
}
```

| 입력 | 현재 반환 | 구분 가능 |
|------|:---------:|:---------:|
| `200 + data:null` (정상 미출고) | `null` | — |
| `200 + data:{...}` | 객체 | ✅ |
| `404 ORDER_NOT_FOUND` | `null` | ❌ |
| `401` | `null` | ❌ |
| `500` | `null` | ❌ |
| 네트워크 오류 | `null` | ❌ |
| `200 + 깨진 payload` | `null` 또는 garbage (형상 검증 0) | ❌ |

- `response.data.data`(옵셔널 체이닝 없음) — `response.data` 가 문자열이면 `undefined` 로 흘러 `null`.
- 고정 오류 코드 **없음**. 서버 오류 원문은 `console.warn` 에만 남는다.
- `orderId` **미인코딩** (`encodeURIComponent` 없음).

### 4-2. `getOrderCondition()`

```ts
async getOrderCondition(supplierId: string): Promise<SupplierOrderCondition | null> {
  try {
    const response = await api.get(`/neture/suppliers/${encodeURIComponent(supplierId)}/order-condition`);
    return response.data?.data ?? null;
  } catch (error) {
    console.warn('[Supplier API] Failed to fetch order condition:', error);
    return null;              // ← 404 / 401 / 500 / 네트워크 전부
  }
}
```

| 입력 | 현재 반환 | 구분 가능 |
|------|:---------:|:---------:|
| `200 + 정상 객체` | 객체 | ✅ |
| `404 SUPPLIER_NOT_FOUND` | `null` | ❌ |
| `401` / `500` / 네트워크 | `null` | ❌ |
| `200 + data:{}` 또는 문자열 | **truthy garbage** (형상 검증 0) | ❌ |

- 고정 오류 코드 **없음**.
- 정상 미존재 상태가 없으므로 **`null` 반환 경로 자체가 오류 전용**이다 — 이 점이 정비를 단순하게 만든다.

---

## 5. 전체 소비처

### 5-1. `supplierApi.getShipment()` — **1곳**

| 파일 | route | 호출 |
|------|-------|------|
| [SupplierOrderDetailPage.tsx:129](services/web-neture/src/pages/account/SupplierOrderDetailPage.tsx#L129) | `/supplier/orders/:id` · `/account/supplier/orders/:id` ([App.tsx:813, 862](services/web-neture/src/App.tsx#L813)) | `fetchOrder()` 내부 |

```ts
const orderData = await supplierApi.getOrderById(id);
setOrder(orderData);
setShipment(await supplierApi.getShipment(id).catch(() => null));   // 이중 삼킴
```

- `getOrderById()` 는 선행 WO 에서 이미 정비됨(404→null, 그 외 throw).
- `getShipment()` 은 **API 내부 catch + 소비처 `.catch(() => null)`** 로 두 번 삼킨다.
  주석([:121](services/web-neture/src/pages/account/SupplierOrderDetailPage.tsx#L121))에 "IR E 등급(미변경)" 으로 의도가 명시돼 있다.
- mutation(`createShipment` / `updateShipmentStatus`) 성공 후 `fetchOrder()` 재호출 → 재조회 경로 동일.

### 5-2. `supplierProfileApi.getOrderCondition()` — **1곳 (모달), 2개 화면에서 열림**

| 파일 | 호출 |
|------|------|
| [SupplierConditionModal.tsx:38](services/web-neture/src/components/common/SupplierConditionModal.tsx#L38) | `useEffect` — `open && supplierId` 시 1회 |

모달을 여는 화면:

| 화면 | 위치 |
|------|------|
| `StoreListingsPage` | [:278](services/web-neture/src/pages/store/StoreListingsPage.tsx#L278) |
| `StoreProductLibraryPage` | [:433](services/web-neture/src/pages/store/StoreProductLibraryPage.tsx#L433) |

> 소비 주체는 **매장(store) 사용자**다. 공급자 화면이 아니다.
> 다만 API·계약은 supplier 도메인이므로 본 IR 범위에 포함한다.

---

## 6. 화면의 null 처리

### 6-1. `SupplierOrderDetailPage` (shipment)

```tsx
{order.status === 'preparing' && !shipment && ( ...송장 등록 폼... )}   // :464
{shipment && ( ...배송 정보 / 배송완료 처리 버튼... )}                  // :501
```

상태 구분: `loading` / `loadError`(주문 기준) / 주문 not-found — **배송 정보 전용 오류 상태 없음.**

| 실제 상황 | 화면 |
|-----------|------|
| 정상 미출고 (`preparing`) | 송장 등록 폼 노출 — **정상** |
| 배송 정보 조회 실패 + `preparing` | 송장 등록 폼 노출 — 정상 미출고와 **동일** |
| 배송 정보 조회 실패 + `shipped`/`delivered` | **배송 섹션 통째로 사라짐.** 등록 폼도 안 뜸(상태가 preparing 아님). 오류 표시 0 → 화면에 배송 관련 정보가 아무것도 없음 |
| 배송 정보 조회 실패 + `shipped` | `handleDeliverShipment` 는 `if (!shipment) return` ([:195](services/web-neture/src/pages/account/SupplierOrderDetailPage.tsx#L195)) → **배송완료 처리 불가, 이유 미표시** |

**중복 송장 등록 위험은 없다.** 서버가 3중으로 막는다:
`validateOwnership` 404 · `status !== PREPARING` 시 403 INVALID_STATE · 이미 등록 시 **409**.
따라서 상태 변경을 잘못 허용하는 P0 는 성립하지 않는다.

### 6-2. `SupplierConditionModal` (orderCondition)

```tsx
supplierProfileApi.getOrderCondition(supplierId).then((result) => {
  if (result) setData(result);
  else setError('주문 조건을 불러오지 못했습니다.');
  setLoading(false);
});
```

- **`null` 을 이미 오류로 표시한다** — "조건 없음" 으로 위장하지 않는다. 이 부분은 옳다.
- "조건 없음" 은 `data` 를 받은 뒤 `minOrderAmount`/`minOrderSurcharge` 필드가 비었을 때만 렌더된다([:103](services/web-neture/src/components/common/SupplierConditionModal.tsx#L103), [:122](services/web-neture/src/components/common/SupplierConditionModal.tsx#L122)).

남는 결함:

| # | 결함 |
|---|------|
| 1 | **다시 시도 버튼 없음** — 일시 장애 시 모달을 닫았다 다시 여는 수밖에 없음 |
| 2 | 404(공급자 부재·비활성) 와 5xx·네트워크가 같은 문구 |
| 3 | `200 + data:{}` 또는 문자열 → truthy → `setData(garbage)` → **"조건 없음" 으로 정상 표시** (유일한 위장 경로) |
| 4 | `.then()` 만 있고 `.catch()` 없음 — 현재는 API 가 절대 reject 하지 않아 안전하지만, **throw 계약으로 바꿀 때 반드시 함께 고쳐야 unhandled rejection 이 생기지 않는다** |

---

## 7. A/B/C/D/E 재분류

| 함수 | 선행 등급 | **재분류** | 근거 |
|------|:---------:|:----------:|------|
| `getShipment()` | E | **C** | backend 계약이 정적으로 확정됨(200+null / 404 / 401 / 500, 403 없음) → E 유지 불가. API 가 404·401·5xx·네트워크·깨진 payload 를 전부 `null` 로 삼키고, 소비처가 `.catch(() => null)` 로 한 번 더 삼킨다 |
| `getOrderCondition()` | E | **C** | backend 계약 확정(정상 null 없음 / 404=오류). API 가 모든 오류를 `null` 로 삼키고 payload 형상 검증이 없다. **단** 소비처가 `null` 을 오류로 표시하므로 실제 위장은 §6-2 ③ 경로 하나뿐 |

D 등급 후보 없음 — 두 함수 모두 "보조 정보라 숨겨도 된다" 는 근거가 코드·주석·UX 어디에도 없다.
`getShipment()` 의 주석은 "IR E 등급이라 미변경" 이라는 **작업 순서상의 유예**이지 fail-open 정책이 아니다.

---

## 8. 위험도

| 함수 | 위험도 | 근거 |
|------|:------:|------|
| `getShipment()` | **P1** | 출고 완료된 주문에서 조회 실패 시 배송 섹션이 오류 표시 없이 사라져 **"송장 미등록"** 으로 오인. 배송완료 처리도 이유 없이 막힘. 단 서버 3중 가드로 잘못된 상태 전이·중복 송장은 불가 → P0 아님 |
| `getOrderCondition()` | **P2** | 소비처가 이미 오류로 표시해 핵심 판단 왜곡은 제한적. 최소 주문 금액을 잘못 보여주는 경로는 깨진 payload 한 가지뿐. 다만 매장의 **발주 금액 판단**에 쓰이는 정보이므로 P3 는 아님 |

---

## 9. 구현 범위 · 묶음 가능 여부

| 항목 | `getShipment()` | `getOrderCondition()` |
|------|-----------------|----------------------|
| backend 변경 없이 정비 가능 | **가능** | **가능** |
| 소비처 수 | 1 | 1 (모달) — 진입 화면 2 |
| 소비 주체 | 공급자 | **매장** |
| 정상 `null` 유지 필요 | **필요** (미출고) | **불필요** (정상 null 없음) |
| 404 분기 필요 | 필요 (주문 미존재/타인) | 필요 (공급자 부재/비활성) |
| 403 분기 필요 | **불필요** (경로 없음) | **불필요** (경로 없음) |
| 고정 오류 코드 필요 | 필요 | 필요 |
| 별도 WO 필요 | 예 | 예 |

**묶음 판정: 분리한다.**

| 묶음 기준 | 충족 |
|-----------|:----:|
| 같은 API 파일(`supplier.ts`) | ✅ |
| 같은 소비처 | ❌ (주문 상세 vs 조건 모달) |
| 같은 화면 | ❌ (공급자 화면 vs 매장 화면) |
| 같은 not-found/error UI 패턴 | ❌ |
| **정상 미존재 의미 동일** | ❌ **정반대** |

정상 미존재 의미가 다르면 구현 WO 를 분리한다는 §11 기준에 그대로 걸린다.
`getShipment` 는 **`null` 을 살려두고 오류만 throw**, `getOrderCondition` 은 **`null` 경로를 없애고 전부 throw** —
반환 타입 자체가 달라지므로 한 WO 에 섞으면 리뷰가 흐려진다.

---

## 10. 권장 후속 계약

### 10-1. `getShipment()` → `Promise<Shipment | null>` 유지

```text
200 + data:null   → null            (정상 미출고 — 그대로 유지)
200 + data:{...}  → Shipment
404               → throw SUPPLIER_SHIPMENT_ORDER_NOT_FOUND
그 외 4xx/5xx/네트워크/깨진 payload → throw SUPPLIER_SHIPMENT_LOAD_FAILED
```

소비처(`SupplierOrderDetailPage`):

```text
shipmentState: 'loading' | 'error' | 'order-not-found' | 'none' | 'success'
- 'none'    → 기존과 동일 (preparing 이면 송장 등록 폼)
- 'error'   → 배송 섹션 자리에 "배송 정보를 불러오지 못했습니다" + 다시 시도
              (송장 등록 폼은 노출하지 않는다 — 실제 송장 유무를 모르는 상태이므로)
- 'order-not-found' → 주문 자체 not-found 와 통합
```

`.catch(() => null)` 이중 삼킴 제거 필수. `orderId` 는 `encodeURIComponent` 적용.

### 10-2. `getOrderCondition()` → `Promise<SupplierOrderCondition>` (null 제거)

```text
200 + 정상 객체 → 객체
404             → throw SUPPLIER_ORDER_CONDITION_NOT_FOUND   (공급자 부재·비활성)
그 외 4xx/5xx/네트워크/깨진 payload → throw SUPPLIER_ORDER_CONDITION_LOAD_FAILED
```

소비처(`SupplierConditionModal`) — **`.then()` 에 `.catch()` 를 반드시 추가**:

```text
'loading' | 'error' | 'not-found' | 'success'
- 'not-found' → "공급자 정보를 확인할 수 없습니다" (다시 시도 없음)
- 'error'     → "주문 조건을 불러오지 못했습니다" + 다시 시도
- payload 형상 검증 후에만 setData
```

> 오류 코드명은 구현 WO 에서 기존 명명 규칙(`SUPPLIER_*_LOAD_FAILED` / `SUPPLIER_*_NOT_FOUND`)에 맞춰 확정한다.

### 10-3. 인접 항목 (본 IR 범위 밖 — 기록만)

| # | 항목 | 등급/위험도 |
|---|------|-------------|
| 1 | `storeApi.getShipment()` ([store.ts:361](services/web-neture/src/lib/api/store.ts#L361)) — 동일 shape 로 전부 `null`. 소비처 [StoreOrderDetailPage.tsx:142](services/web-neture/src/pages/store/StoreOrderDetailPage.tsx#L142) | C / P2 |
| 2 | `storeApi.getOrderById()` ([store.ts:372](services/web-neture/src/lib/api/store.ts#L372)) — `null` → `setNotFound(true)`. **5xx·네트워크를 "주문 없음" 으로 위장** | C / **P1** |
| 3 | `GET /supplier/orders/:orderId/shipment` 의 `UUID_REGEX` 검증 누락(POST 에는 존재) → 비-UUID 시 500 | backend 소규모 |

①②는 매장 측 주문 상세라 **별도 IR/WO** 로 다루는 것이 맞다.

---

## 11. backend 변경 필요 여부

**두 함수 모두 backend 변경 불필요.** 계약이 이미 명확하다.

§10-3 ③ (UUID 검증 누락) 만 backend 개선 여지가 있으나, 이는 오류 코드 정확도 문제(400 이어야 할 것이 500)이고
프론트 정비와 무관하게 동작하므로 **필수 아님**. 별도 소규모 후속으로 분리한다.

---

## 12. 권장 후속 WO

| 순위 | WO | 범위 | 근거 |
|:---:|-----|------|------|
| 1 | `WO-O4O-NETURE-SUPPLIER-SHIPMENT-LOAD-ERROR-CONTRACT-V1` | `supplierApi.getShipment()` + `SupplierOrderDetailPage` | P1 |
| 2 | `WO-O4O-NETURE-SUPPLIER-ORDER-CONDITION-LOAD-ERROR-CONTRACT-V1` | `supplierProfileApi.getOrderCondition()` + `SupplierConditionModal` | P2 |
| 3 | `IR/WO-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1` | `storeApi.getOrderById()` / `getShipment()` | 매장 측, P1 포함 |
| 4 | (소규모) shipment GET UUID 검증 | backend | 선택 |

1·2 는 **동일 커밋에 묶지 않는다** (§9).

---

## 13. 변경 0 확인

| 항목 | 결과 |
|------|:----:|
| 코드 변경 | 0 |
| API 계약 변경 | 0 |
| UI 변경 | 0 |
| backend 변경 | 0 |
| DB 변경 / migration | 0 |
| 배포 | 0 |
| 운영 데이터 접근·write | 0 |
| 다른 세션 dirty·untracked 파일 접촉 | 0 |

조사는 전부 로컬 정적 소스 분석으로 수행했다. 프로덕션 API 호출·운영 데이터 조회는 하지 않았다.

---

## 14. 결과 표

| 함수 | endpoint | 정상 미존재 | 대상 미존재 | 권한 없음 | 서버 오류 | 현재 fallback | 소비처 | 화면 처리 | 등급 | 위험도 | 권장 계약 | 후속 WO |
|------|----------|-------------|-------------|-----------|-----------|---------------|--------|-----------|:----:|:------:|-----------|---------|
| `getShipment()` | `GET /neture/supplier/orders/:orderId/shipment` | **200 + null** (미출고) | 404 `ORDER_NOT_FOUND` (타인 주문 포함) | **403 없음** / 401 `NO_SUPPLIER` | 500 `INTERNAL_ERROR` | 전부 `null` + 소비처 `.catch(()=>null)` 이중 삼킴 | `SupplierOrderDetailPage` (1) | 실패 시 배송 섹션 무성 소멸, 배송완료 처리 차단 | **C** | **P1** | `null` 유지 + 404/기타 throw | #1 |
| `getOrderCondition()` | `GET /neture/suppliers/:id/order-condition` | **없음** (200 + 필드 null) | 404 `SUPPLIER_NOT_FOUND` (비활성 포함) | **403 없음** / 401 | 500 `INTERNAL_ERROR` | 전부 `null`, payload 검증 0 | `SupplierConditionModal` (1) → 매장 화면 2 | `null` 을 이미 오류로 표시(정상), 재시도 없음, 깨진 payload 는 "조건 없음" 위장 | **C** | **P2** | `null` 제거, 전부 throw | #2 |

---

*Recorded: 2026-07-26*
