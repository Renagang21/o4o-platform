# CHECK-O4O-NETURE-SUPPLIER-SHIPMENT-LOAD-ERROR-CONTRACT-V1

> WO: `WO-O4O-NETURE-SUPPLIER-SHIPMENT-LOAD-ERROR-CONTRACT-V1`
> 선행 IR: `IR-O4O-NETURE-SUPPLIER-ORDER-AUX-404-ERROR-CONTRACT-AUDIT-V1` (우선순위 1)
> 일자: 2026-07-26
> 상태: **PASS**

---

## 1. backend 계약 재확인 (변경 0)

핸들러 [supplier-order.controller.ts:246-262](apps/api-server/src/modules/neture/controllers/supplier-order.controller.ts#L246-L262) ·
서비스 [supplier-order.service.ts:210-216](apps/api-server/src/modules/neture/services/supplier-order.service.ts#L210-L216)

| 상황 | 응답 |
|------|------|
| **배송 정보 미생성(출고 전)** | **`200 { success:true, data:null }`** — 정상 미출고 |
| 배송 정보 존재 | `200 { success:true, data:{...} }` |
| 주문 미존재 · **타인 소유** | `404 ORDER_NOT_FOUND` (존재 은닉) |
| 미인증 · 공급자 미연결 | `401` / `401 NO_SUPPLIER` |
| 서버 오류 | `500 INTERNAL_ERROR` |
| **403** | **경로 없음** ([neture-identity.middleware.ts:88](apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts#L88) 이 403 아닌 401 반환) |

403 분기는 만들지 않았다 — 죽은 코드가 된다.
프로덕션 실측(§7-1)에서 `200 + data:null` 계약을 그대로 확인했다.

---

## 2. 기존 null 이중 삼킴 원인

```ts
// lib/api/supplier.ts — 내부 catch 로 1차 삼킴
catch (error) { console.warn(...); return null; }

// SupplierOrderDetailPage.tsx — 소비처에서 2차 삼킴
setShipment(await supplierApi.getShipment(id).catch(() => null));
```

결과: `404` · `401` · `500` · 네트워크 · 깨진 payload 가 **정상 미출고(`null`)와 완전히 동일**해졌다.

- `preparing` 주문 → 조회 실패인데 송장 등록 폼이 노출
- `shipped`/`delivered` 주문 → **배송 섹션 전체가 오류 표시 없이 소멸**, 배송완료 처리도 `if (!shipment) return` 으로 무성 차단

---

## 3. 적용한 실패 계약과 오류 코드

```ts
export const SUPPLIER_SHIPMENT_LOAD_FAILED = 'SUPPLIER_SHIPMENT_LOAD_FAILED';
export const SUPPLIER_SHIPMENT_ORDER_NOT_FOUND = 'SUPPLIER_SHIPMENT_ORDER_NOT_FOUND';
```

| 입력 | 반환 |
|------|------|
| `200 + data:null` | **`null` (정상 미출고 — 유지)** |
| `200 + data:{...}` | `Shipment` |
| `404` | throw `SUPPLIER_SHIPMENT_ORDER_NOT_FOUND` |
| 401 · 기타 4xx · 500 · 네트워크 | throw `SUPPLIER_SHIPMENT_LOAD_FAILED` |

반환 타입 `Promise<Shipment | null>` 은 유지했다. 정상 미존재가 실재하는 상태이기 때문이다.
`orderId` 에 `encodeURIComponent` 를 적용했고, 서버 원문은 `console.warn(extractApiError(error))` 로만 남긴다.

---

## 4. payload 검증

```ts
if (response.data?.success !== true) throw SUPPLIER_SHIPMENT_LOAD_FAILED;
const data = response.data.data;
if (data === null || data === undefined) return null;                  // 정상 미출고
if (typeof data !== 'object' || Array.isArray(data)) throw SUPPLIER_SHIPMENT_LOAD_FAILED;
return data as Shipment;
```

기존 `response.data.data`(옵셔널 체이닝 없음) → `response.data?.` 로 교정.
`data` 가 문자열·배열이면 `null` 로 흘리지 않고 load-failed 로 처리한다.

---

## 5. 배송 상태 구조

```ts
type ShipmentLoadState = 'idle' | 'loading' | 'none' | 'success' | 'error' | 'order-not-found';
```

| 상태 | 의미 |
|------|------|
| `none` | 정상 미출고 (200 + null) |
| `success` | 배송 정보 존재 |
| `error` | 401 · 500 · 네트워크 · 깨진 payload — **실제 송장 유무를 알 수 없음** |
| `order-not-found` | 404 — 기존 주문 not-found 화면과 통합 |

`order-not-found` 는 `order` 상태를 덮어쓰지 않고 렌더 조건에서만 합류시켰다
(`if (!order || shipmentState === 'order-not-found')`) — 성공적으로 로드된 주문 객체를 지우지 않는다.

---

## 6. 주문 조회와 배송 조회 분리

```ts
const loadShipment = useCallback(async () => { ... });   // 내부에서 상태만 세팅, throw 하지 않음

const fetchOrder = useCallback(async () => {
  orderData = await supplierApi.getOrderById(id);        // 실패 → loadError, 배송 조회 미실행
  setOrder(orderData);
  if (!orderData) { /* not-found → 배송 조회 불필요 */ return; }
  await loadShipment();
});
```

- 주문 not-found 이면 배송 API 를 **호출하지 않는다**
- 주문 성공 + 배송 실패 → **주문 본문 유지**, 배송 영역만 오류
- 배송 실패로 주문 전체를 not-found/오류 화면으로 전환하지 않는다

---

## 7. UI

| 상태 | 렌더 |
|------|------|
| `loading` | "배송 정보를 불러오는 중..." |
| `none` + `preparing` | 기존 송장 등록 폼 |
| `success` | 기존 배송 정보 · 배송완료 처리 UI |
| `error` | "배송 정보를 불러오지 못했습니다. / 잠시 후 다시 시도해 주세요." + **다시 시도** |
| `order-not-found` | 기존 주문 not-found 화면 |

`error` 상태에서 금지 항목 전부 준수: 송장 등록 폼 노출 0 · 배송완료 버튼 노출 0 ·
"배송 정보 없음" 표시 0 · **배송 섹션 완전 숨김 0**.

---

## 8. 다시 시도

`onClick={loadShipment}` — **배송 조회만** 재호출한다.
프로덕션 계측에서 재시도 시 `ordCalls: 0`, `shipCalls: 1` 로 주문 전체 재조회·페이지 reload·다른 API 재호출이 없음을 확인했다(§10 H/I/J).

---

## 9. mutation 처리

```ts
// 송장 등록
if (shipmentState !== 'none') { setMessage({type:'error', text:'배송 정보를 확인할 수 없어 처리할 수 없습니다.'}); return; }

// 배송완료 처리
if (shipmentState !== 'success' || !shipment) { setMessage({...}); return; }
```

`if (!shipment) return` 무성 return 을 제거하고 사유를 표시한다.
UI 레벨(폼·버튼 미노출)과 핸들러 레벨 이중 가드.

**mutation 후 재조회**: 기존 `fetchOrder()` 재사용 구조를 유지했다.
`setMessage(성공)` 이 `await fetchOrder()` 앞에 있고 `loadShipment` 가 throw 하지 않으므로,
후속 배송 조회가 실패해도 **mutation 성공을 실패로 뒤집지 않는다**(§10 실측 확인).

---

## 10. 프로덕션 오류 주입·복구 결과

계측: XHR `open`/`send` 후킹으로 주문 상세 + 배송 응답을 합성 주입 (`__ordCalls` / `__shipCalls` / `unhandledrejection` 카운터).
이 공급자 계정은 실제 주문 0건이므로 합성 주문으로 검증했다.

| # | 시나리오 | 결과 | 판정 |
|---|----------|------|:----:|
| A | `200 + null` · preparing | 주문 본문 O, **송장 등록 폼 O**, 오류 X | PASS |
| B | `200 + shipment` · shipped | 배송 정보 O, **배송완료 버튼 O** | PASS |
| C | `404` | **주문 not-found 화면**, 배송 오류 X | PASS |
| D | `401` · preparing | 주문 본문 O, **배송 오류 O + 재시도 O, 송장 폼 X** | PASS |
| E | `500` · shipped | 주문 본문 O, 배송 오류 O, **섹션 소멸 X** | PASS |
| F | 네트워크 실패 · delivered | 주문 본문 O, 배송 오류 O | PASS |
| G | `200 + data:"문자열"` · preparing | 배송 오류 O, 송장 폼 X | PASS |
| H | 재시도 실패 유지 | 오류 유지, `ordCalls: 0` | PASS |
| I | 재시도 성공 + `null` | **정상 미출고 복구 → 송장 폼 O** | PASS |
| J | 재시도 성공 + shipment | **배송 정보 복구 + 배송완료 버튼 O** | PASS |

전 시나리오 `unhandledrejection: 0`, 로딩 고착 0.

**mutation 후 재조회 (합성 — 서버 미도달)**

| 확인 | 결과 |
|------|------|
| 송장 등록 성공 메시지 | 유지 (`mutationSuccessMsg: true`) |
| 후속 배송 재조회 500 | 배송 영역 오류 + 다시 시도 |
| 주문 본문 | 유지 |
| **서버로 나간 비-GET 요청** | **0건** (`realNonGetToServer: 0`) |

---

## 11. 주문 상태별 검증

| 주문 상태 | 배송 상태 | 결과 | 판정 |
|-----------|-----------|------|:----:|
| preparing | none | 송장 등록 폼 표시 | PASS |
| preparing | error | 오류 UI, **송장 등록 폼 미노출** | PASS |
| shipped | success | 배송 정보 + 배송완료 버튼 | PASS |
| shipped | error | 오류 UI, **무성 소멸 0** | PASS |
| delivered | success | 배송 정보 + "배송이 완료되었습니다" | PASS |
| delivered | error | 오류 UI | PASS |

---

## 12. 공유 route · 목록 회귀

| route | none | error | success | 판정 |
|-------|:----:|:-----:|:-------:|:----:|
| `/supplier/orders/:id` | 송장 폼 | 오류+재시도 | 배송 정보 | PASS |
| `/account/supplier/orders/:id` | 송장 폼 | 오류+재시도 | 배송 정보 | PASS |

`/account/*` 경로에서 돌아가기 링크가 `/account/supplier/orders` 로 유지됨을 확인했다.

| 목록 route | 결과 |
|------------|------|
| `/supplier/orders` | 정상 렌더, 오류 문구 없음 |
| `/account/supplier/orders` | 정상 렌더, 오류 문구 없음 |

---

## 13. 반응형

| 폭 | hOverflow | 다시 시도 | 문구 잘림 | 송장폼 동시렌더 | 배송정보 동시렌더 |
|----|:---------:|:---------:|:---------:|:---------------:|:-----------------:|
| 1440×900 | 0 | 접근 가능 | 없음 | 0 | 0 |
| 768×1024 | 0 | 접근 가능 | 없음 | 0 | 0 |
| 390×844 (error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 390×844 (success) | 0 | — | 없음 | — | 정상 표시 |

주문 본문 레이아웃 회귀 없음.

---

## 14. typecheck · build · 배포

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.json` (web-neture) | PASS |
| `pnpm --filter @o4o/web-neture build` | PASS |
| 커밋 | `42e35db03` — `fix(neture): distinguish supplier shipment load errors` (API + 소비처 동일 커밋) |
| Deploy Web Services (Cloud Run) | run `30195650987` **success** |
| `deploy-neture` | **success** (skip 아님 — 재배포 불필요) |
| revision | `neture-web-01323-tsx` → **`neture-web-01324-f7z`** |

정상 상태 콘솔 오류 **0** (계측 스크립트 제거 후 새 세션 로드 기준).

---

## 15. 변경 범위

| 항목 | 결과 |
|------|:----:|
| backend 변경 | **0** |
| DB 변경 / migration | **0** |
| 운영 데이터 write | **0** |
| 주문 상태 머신 · 배송 ENUM · 송장/배송완료 계약 변경 | 0 |
| 공통 API wrapper · UI Core 변경 | 0 |
| dependency · lockfile 변경 | 0 |
| 테스트 계정·데이터 생성 | 0 |
| 서버 원문·stack trace 화면 노출 | 0 |

변경 파일 2개:
- [supplier.ts](services/web-neture/src/lib/api/supplier.ts) — 오류 코드 2종 + `getShipment()` 계약
- [SupplierOrderDetailPage.tsx](services/web-neture/src/pages/account/SupplierOrderDetailPage.tsx) — 상태 분리 · UI · mutation 가드

---

## 16. 실데이터 제한

이 검증 계정은 **Neture 공급자 주문이 0건**이다. 따라서:

- 실주문 기반 배송 조회·송장 등록·배송완료의 **실동작 검증은 미실시**
- 전 시나리오를 합성 주문 + 합성 배송 응답으로 검증했다
- mutation 후 재조회는 POST 를 클라이언트에서 가로채 서버에 도달시키지 않았다 (운영 write 0)
- 실데이터 검증은 실주문 발생 시 별도 확인이 필요하다

---

## 17. 후속

| # | 항목 | 비고 |
|---|------|------|
| 1 | `WO-O4O-NETURE-SUPPLIER-ORDER-CONDITION-LOAD-ERROR-CONTRACT-V1` | IR 우선순위 2 (P2) |
| 2 | 매장 측 `storeApi.getOrderById()` — 5xx·네트워크를 "주문 없음" 으로 위장 | IR 우선순위 3 (P1) |
| 3 | `GET /supplier/orders/:orderId/shipment` UUID 검증 누락 (POST 에는 존재) → 비-UUID 시 500 | backend 소규모, 본 WO 범위 외 |

---

*Recorded: 2026-07-26*
