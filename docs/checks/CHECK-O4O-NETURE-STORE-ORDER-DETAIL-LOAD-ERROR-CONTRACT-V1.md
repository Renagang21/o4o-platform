# CHECK-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1

> WO: `IR/WO-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1`
> IR: [`IR-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1.md`](docs/investigations/IR-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1.md) (commit `c009c3184`)
> 일자: 2026-07-26
> 상태: **PASS** (범위 밖 프로덕션 결함 1건 신규 발견 — §13)

---

## 1. 적용한 오류 코드 · 반환 타입

```ts
export const STORE_ORDER_NOT_FOUND = 'STORE_ORDER_NOT_FOUND';
export const STORE_ORDER_LOAD_FAILED = 'STORE_ORDER_LOAD_FAILED';
export const STORE_SHIPMENT_ORDER_NOT_FOUND = 'STORE_SHIPMENT_ORDER_NOT_FOUND';
export const STORE_SHIPMENT_LOAD_FAILED = 'STORE_SHIPMENT_LOAD_FAILED';
```

| 함수 | 반환 타입 | 근거 |
|------|-----------|------|
| `getOrderById` | `Promise<StoreOrder>` — **null 제거** | backend 에 정상 null 상태가 없다 |
| `getShipment` | `Promise<Shipment \| null>` — **null 유지** | `200 + data:null` 이 정상 미출고 |

| 입력 | `getOrderById` | `getShipment` |
|------|----------------|---------------|
| `200 + 정상 객체` | 객체 | 객체 |
| `200 + data:null` | load-failed (계약상 없음) | **null (정상)** |
| `404` | `STORE_ORDER_NOT_FOUND` | `STORE_SHIPMENT_ORDER_NOT_FOUND` |
| 401 · 기타 4xx · 500 · 네트워크 | `STORE_ORDER_LOAD_FAILED` | `STORE_SHIPMENT_LOAD_FAILED` |
| `success!==true` · 비객체 · 배열 | load-failed | load-failed |

`encodeURIComponent` 적용. 서버 원문은 `console.warn(describeApiError(error))` 로만 남긴다
(`extractApiError` 는 supplier.ts 모듈 전용이라 store.ts → supplier.ts 순환을 피해 동일 형태의 소형 헬퍼를 store.ts 에 별도 정의).

---

## 2. 주문 · 배송 상태 분리

```ts
type OrderLoadState = 'loading' | 'error' | 'not-found' | 'success';
type ShipmentLoadState = 'idle' | 'loading' | 'none' | 'success' | 'error' | 'order-not-found';
```

```ts
const loadOrder = useCallback(async () => {
  const seq = ++reqRef.current;
  ...
  try { const orderData = await storeApi.getOrderById(id); setOrder(orderData); setOrderState('success'); }
  catch (e) { setOrderState(msg === STORE_ORDER_NOT_FOUND ? 'not-found' : 'error'); setLoading(false); return; }
  await loadShipment(id, seq);      // 주문 성공 시에만 배송 조회
  setLoading(false);
}, [id, loadShipment]);
```

- 기존 `Promise.all([...]).then(...)` 을 **순차 + 독립 상태**로 교체
- `.then()` 전용 흐름 → `try/catch` (throw 계약 전환 시의 unhandled rejection 경로 제거)
- 주문 not-found 이면 배송 API 를 호출하지 않는다(§6 B 시나리오 `shipCalls: 0` 로 확인)
- 배송 404 는 주문 not-found 화면으로 통합 (`orderState === 'not-found' || shipmentState === 'order-not-found'`)

---

## 3. UI

| 상태 | 렌더 |
|------|------|
| 주문 `error` | "주문 정보를 불러오지 못했습니다 / 잠시 후 다시 시도해 주세요." + **다시 시도** |
| 주문 `not-found` | "주문을 찾을 수 없습니다" (재시도 없음) |
| 배송 `none` | 기존과 동일 — 배송 추적 섹션 미표시 |
| 배송 `success` | 기존 배송 추적 섹션 |
| 배송 `error` | 배송 추적 섹션 자리에 "배송 정보를 불러오지 못했습니다" + **다시 시도** |

배송 `error` 에서 금지 항목 준수: "배송 정보 없음" 표시 0 · **섹션 완전 숨김 0** · 배송 mutation 노출 0.

---

## 4. 다시 시도

| 대상 | 동작 |
|------|------|
| 주문 오류 | `loadOrder()` — 주문 상세부터 재실행 |
| 배송 오류 | `retryShipment()` — **배송 API 만 재호출** (§6 배송 H/I/J 에서 `ordCalls: 0` 확인) |

---

## 5. mutation 영향

`StoreOrderDetailPage` 의 mutation 은 **`handleReorder()` (재주문 → 장바구니) 1건뿐**이다.
배송 상태 변경·수령 확인 등 배송 관련 mutation 은 매장 측에 존재하지 않는다(읽기 전용 추적).

| 상황 | 재주문 버튼 |
|------|------------|
| 주문 error / not-found | 화면 자체가 오류·not-found 라 **도달 불가** |
| 주문 success + 배송 error | **노출 유지** — 재주문은 `order.items` 에만 의존하고 배송과 무관하다 |

따라서 배송 조회 실패를 이유로 재주문을 막지 않았다. 무성 return 으로 이유를 숨기는 경로도 없다.

---

## 6. 프로덕션 오류 주입 결과

계측: XHR `open`/`send` 후킹. 합성 주문 2건(`ORD-A` / `ORD-B`)을 사용했고, 비-GET 요청은 전부 차단했다.

### 주문 조회

| # | 시나리오 | 결과 | 판정 |
|---|----------|------|:----:|
| A | `200 + 정상 주문` | 주문 본문 표시 | PASS |
| B | `404` | **"주문을 찾을 수 없습니다"**, `shipCalls: 0` (배송 미호출) | PASS |
| C | `401` | **"주문 정보를 불러오지 못했습니다" + 다시 시도** | PASS |
| D | `500` | 오류 + 재시도 | PASS |
| E | 네트워크 실패 | 오류 + 재시도 | PASS |
| F | `200 + data:"문자열"` | 오류 + 재시도 | PASS |
| G | 다시 시도 실패 유지 | 오류 유지 | PASS |
| H | 다시 시도 성공 | 주문 본문 복구 + 배송 재조회 | PASS |

**핵심**: C~F 가 더 이상 "주문을 찾을 수 없습니다" 로 위장되지 않는다.

### 배송 조회

| # | 시나리오 | 결과 | 판정 |
|---|----------|------|:----:|
| A | `200 + null` | 정상 미출고 — 기존과 동일(섹션 미표시), 오류 X | PASS |
| B | `200 + shipment` | 배송 추적 표시 (`TRK-ORD-A`) | PASS |
| C | `404` | 주문 not-found 화면으로 통합 | PASS |
| D | `401` | **주문 본문 유지 + 배송 오류 + 재시도** | PASS |
| E | `500` | 주문 본문 유지 + 배송 오류 | PASS |
| F | 네트워크 실패 | 주문 본문 유지 + 배송 오류 | PASS |
| G | `200 + data:"문자열"` | 주문 본문 유지 + 배송 오류 | PASS |
| H | 재시도 실패 유지 | 오류 유지, **`ordCalls: 0`** | PASS |
| I | 재시도 성공 + `null` | 정상 미출고 복구 | PASS |
| J | 재시도 성공 + shipment | 배송 추적 복구 | PASS |

전 시나리오 `unhandledrejection: 0` · 로딩 고착 0 · 차단된 write 시도 0.
배송 오류 상태에서도 **재주문 버튼 유지**를 확인했다(§5).

### 요청 경쟁 · route 전환

| 확인 | 결과 |
|------|------|
| A(오류·1.5s 지연) 진입 직후 B 로 전환 | B 정상 표시, **A 의 늦은 오류/데이터가 덮어쓰지 않음** (staleA/staleOrdErr/staleShipErr/staleTracking 전부 false) |
| B(정상) → A(오류) 전환 | 주문 오류 표시, **B 데이터 잔존 0** |

`reqRef` 지역 request id 로 처리했다 — 공통 상태관리 구조는 만들지 않았다.

---

## 7. route

실제 route 는 [App.tsx:915](services/web-neture/src/App.tsx#L915) 의 **`/store/orders/:id` 1개뿐**이다.
`/account/store/orders/:id` 는 **존재하지 않아** 검증 대상에서 제외했다(공급자 측과 달리 공유 route 없음).

| route | 결과 |
|-------|------|
| `/store/orders` | 정상 렌더 (단 §13 참조) |
| `/store/orders/:id` | §6 전 시나리오 PASS |

---

## 8. 반응형

| 폭 | hOverflow | 다시 시도 | 문구 잘림 | not-found+error 동시 | 배송 정상+오류 동시 |
|----|:---------:|:---------:|:---------:|:--------------------:|:-------------------:|
| 1440×900 (주문 error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 1440×900 (배송 error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 768×1024 (배송 error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 390×844 (배송 error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 390×844 (주문 error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 390×844 (not-found) | 0 | 의도적 미제공 | 없음 | 0 | 0 |

---

## 9. typecheck · build · 배포

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.json` (web-neture) | PASS |
| `pnpm --filter @o4o/web-neture build` | PASS |
| IR 커밋 | `c009c3184` — `docs(neture): audit store order detail error contracts` |
| 구현 커밋 | `1610ab189` — `fix(neture): distinguish store order detail load errors` (API + 소비처 동일 커밋) |
| Deploy Web Services (Cloud Run) | run `30201010005` **success** |
| `deploy-neture` | **success** (skip 아님) |
| revision | **`neture-web-01328-tpt`** |

---

## 10. 변경 범위

| 항목 | 결과 |
|------|:----:|
| backend 변경 | **0** |
| DB 변경 / migration | **0** |
| 운영 데이터 write | **0** |
| 주문 상태 머신 · 배송 ENUM · 소유권 정책 · mutation 계약 변경 | 0 |
| 공통 API wrapper · UI Core 변경 | 0 |
| dependency · lockfile 변경 | 0 |
| 서버 원문·stack trace 화면 노출 | 0 |

변경 파일 2개:
- [store.ts](services/web-neture/src/lib/api/store.ts) — 오류 코드 4종 + `describeApiError` + 두 함수 계약
- [StoreOrderDetailPage.tsx](services/web-neture/src/pages/store/StoreOrderDetailPage.tsx) — 상태 분리 · reqRef · 오류 UI · 스타일

---

## 11. 운영 데이터 제한

- 이 계정은 매장 주문 상세를 열 수 있는 **실주문이 없어** 전 시나리오를 합성 주문으로 검증했다.
  (정확히는 목록 API 가 500 이라 실제 주문 유무를 확인할 수 없다 — §13)
- 비-GET 요청은 하네스에서 전부 차단해 서버에 도달시키지 않았다 (`writes: 0`).
- 실데이터 기반 검증은 주문이 존재하고 목록 API 가 정상화된 뒤 별도 확인이 필요하다.

---

## 12. 콘솔

| 항목 | 결과 |
|------|------|
| 주문 상세 화면 unhandled rejection | 0 |
| 로딩 고착 | 0 |
| `/store/orders` 정상 상태 콘솔 오류 | **0 아님** — 아래 §13 의 500 이 1건 발생. **본 변경과 무관한 기존 결함**이며 목록 API 에서 발생한다 |

---

## 13. 범위 밖 — 프로덕션 실결함 발견 (미수정)

검증 중 프로덕션에서 **재현되는 실제 장애**를 확인했다.

```text
GET /api/v1/neture/seller/orders?page=1&limit=20
→ 500 { error: "INTERNAL_ERROR" }

화면(/store/orders)
→ "주문 내역이 없습니다"
```

원인 구조: [store.ts `getOrders()`](services/web-neture/src/lib/api/store.ts#L345)

```ts
catch (error) {
  console.warn('[Store API] Failed to fetch orders:', error);
  return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };   // 500 → "정상 0건"
}
```

- 본 WO 가 제거한 것과 **동일한 위장 패턴**이지만 대상은 **목록** endpoint 라 §22(범위 밖 수정 금지)에 따라 수정하지 않았다.
- 등급 **C** / 위험도 **P1** — 매장 사용자에게 주문이 아예 없는 것으로 보인다.
- backend 500 자체의 원인 규명이 선행돼야 하므로 frontend 계약 정비만으로는 완결되지 않는다.

**권장 후속 (2건, 분리)**

| # | 항목 | 성격 |
|---|------|------|
| 1 | `GET /neture/seller/orders` 500 원인 규명 | **backend, 우선** |
| 2 | `storeApi.getOrders()` 실패의 "정상 0건" 위장 제거 | frontend 계약 |

---

## 14. 기타 후속

| # | 항목 |
|---|------|
| 1 | `GET /neture/seller/orders/:id` · `/shipment` UUID 검증 누락 → 비-UUID 시 500 (공급자 측과 동일, backend 소규모) |

---

*Recorded: 2026-07-26*
