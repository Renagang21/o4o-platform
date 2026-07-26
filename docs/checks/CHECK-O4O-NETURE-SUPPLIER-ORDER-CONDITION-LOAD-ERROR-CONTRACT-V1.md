# CHECK-O4O-NETURE-SUPPLIER-ORDER-CONDITION-LOAD-ERROR-CONTRACT-V1

> WO: `WO-O4O-NETURE-SUPPLIER-ORDER-CONDITION-LOAD-ERROR-CONTRACT-V1`
> 선행 IR: `IR-O4O-NETURE-SUPPLIER-ORDER-AUX-404-ERROR-CONTRACT-AUDIT-V1` (우선순위 2 · P2)
> 일자: 2026-07-26
> 상태: **PASS**

---

## 1. backend 계약 재확인 (변경 0)

라우트 [neture.routes.ts:246-258](apps/api-server/src/modules/neture/neture.routes.ts#L246-L258) ·
서비스 [supplier.service.ts:528-541](apps/api-server/src/modules/neture/services/supplier.service.ts#L528-L541)

| 상황 | 응답 |
|------|------|
| **조건 미설정 공급자** | `200 + { minOrderAmount:null, minOrderSurcharge:null, note:null }` |
| 조건 설정됨 | `200 + 값이 채워진 객체` |
| 공급자 미존재 · **비-ACTIVE** | `404 SUPPLIER_NOT_FOUND` |
| 미인증 | `401` (`requireAuth` 만 — 공급자 스코프 가드 없음) |
| 서버 오류 | `500 INTERNAL_ERROR` |
| **403** | **경로 없음** |

**핵심**: 이 endpoint 에는 **정상 `null` 응답이 존재하지 않는다.**
ACTIVE 공급자면 항상 객체를 반환하고, "조건 미설정" 은 객체 내부 필드가 null 인 것이다.
404 는 공급자 부재·비활성 = **오류 상태**다.
`supplierOnboardingApi.getOnboarding()` 과 동일 구조이며 같은 근거로 정비했다.

---

## 2. 기존 문제

```ts
async getOrderCondition(supplierId): Promise<SupplierOrderCondition | null> {
  try { ... return response.data?.data ?? null; }
  catch { console.warn(...); return null; }        // 404·401·500·네트워크 전부
}
```

```ts
// SupplierConditionModal — .then() 전용, .catch() 없음
supplierProfileApi.getOrderCondition(supplierId).then((result) => {
  if (result) setData(result); else setError('주문 조건을 불러오지 못했습니다.');
  setLoading(false);
});
```

| # | 결함 |
|---|------|
| 1 | 404(공급자 부재·비활성)와 5xx·네트워크가 같은 문구로 수렴 |
| 2 | **다시 시도 버튼 없음** — 일시 장애 시 모달을 닫았다 다시 여는 수밖에 없음 |
| 3 | payload 형상 검증 0 → `200 + data:{}` 같은 값이 truthy 로 통과해 **"조건 없음" 으로 위장** |
| 4 | `.then()` 전용 흐름 — API 를 throw 계약으로 바꾸면 **unhandled rejection** 이 된다 |

> 소비처가 `null` 을 오류로 표시하던 점은 원래 옳았고, 그 동작은 유지했다.

---

## 3. 적용한 실패 계약과 오류 코드

```ts
export const SUPPLIER_ORDER_CONDITION_LOAD_FAILED = 'SUPPLIER_ORDER_CONDITION_LOAD_FAILED';
export const SUPPLIER_ORDER_CONDITION_NOT_FOUND = 'SUPPLIER_ORDER_CONDITION_NOT_FOUND';
```

| 입력 | 반환 |
|------|------|
| `200 + 정상 객체` | `SupplierOrderCondition` |
| `404` | throw `SUPPLIER_ORDER_CONDITION_NOT_FOUND` |
| 401 · 기타 4xx · 500 · 네트워크 | throw `SUPPLIER_ORDER_CONDITION_LOAD_FAILED` |
| `200 + data:null` · 비객체 · 배열 · `success!==true` | throw `SUPPLIER_ORDER_CONDITION_LOAD_FAILED` |

**반환 타입에서 `null` 을 제거**했다 — `Promise<SupplierOrderCondition>`.
정상 미존재 상태가 backend 에 없기 때문이다(§1). 서버 원문은 `console.warn(extractApiError(error))` 로만 남긴다.

---

## 4. payload 검증

```ts
const data = response.data?.data;
if (response.data?.success !== true || !data || typeof data !== 'object' || Array.isArray(data)) {
  console.warn('[Supplier API] Unexpected order condition payload shape');
  throw new Error(SUPPLIER_ORDER_CONDITION_LOAD_FAILED);
}
```

`200 + data:"문자열"` · `200 + data:null` 이 더 이상 "조건 없음" 으로 위장하지 않는다(§8 G·H).

---

## 5. 소비처 상태 구조

```ts
type ConditionLoadState = 'idle' | 'loading' | 'error' | 'not-found' | 'success';
```

```ts
const loadCondition = useCallback(async () => {
  if (!supplierId) return;
  setLoadState('loading'); setData(null);
  try {
    const result = await supplierProfileApi.getOrderCondition(supplierId);
    setData(result); setLoadState('success');
  } catch (e) {
    setLoadState((e as Error)?.message === SUPPLIER_ORDER_CONDITION_NOT_FOUND ? 'not-found' : 'error');
  }
}, [supplierId]);
```

`.then()` 전용 흐름을 **`async` + `try/catch`** 로 교체했다 — unhandled rejection 경로 제거.

| 상태 | 렌더 |
|------|------|
| `loading` | "조건을 불러오는 중..." |
| `success` | 조건 값. 필드가 비면 **"조건 없음" + "별도 주문 조건을 설정하지 않았습니다"** (정상 표시) |
| `error` | "주문 조건을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." + **다시 시도** |
| `not-found` | "공급자 정보를 확인할 수 없습니다." — **다시 시도 없음** (재시도해도 결과 동일) |

"조건 없음" 은 `success` 상태에서만 렌더된다 — 오류가 정상 미설정으로 위장할 경로가 없다.

---

## 6. 소비처 전수

| 파일 | 비고 |
|------|------|
| [SupplierConditionModal.tsx](services/web-neture/src/components/common/SupplierConditionModal.tsx) | 유일한 호출부 |
| [StoreListingsPage.tsx:278](services/web-neture/src/pages/store/StoreListingsPage.tsx#L278) | 모달 진입 화면 1 (`listing.supplierId` 있을 때 "공급: <이름>" 버튼) |
| [StoreProductLibraryPage.tsx:427](services/web-neture/src/pages/store/StoreProductLibraryPage.tsx#L427) | 모달 진입 화면 2 (진열하기 → 공급자 선택 모달 내 공급자명) |

두 진입 화면 모두 `open` / `supplierId` / `fallbackName` / `onClose` 동일 prop 형태이므로
모달 한 곳 수정으로 양쪽이 함께 정비된다. typecheck 로 다른 소비처 부재를 확인했다.

---

## 7. 빌드 · 배포

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.json` (web-neture) | PASS |
| `pnpm --filter @o4o/web-neture build` | PASS |
| 커밋 | `64e54c78c` — `fix(neture): distinguish supplier order condition load errors` (API + 소비처 동일 커밋) |
| Deploy Web Services (Cloud Run) | run `30200296324` **success** |
| `deploy-neture` | **success** (skip 아님) |
| revision | `neture-web-01324-f7z` → **`neture-web-01325-sv6`** |

---

## 8. 프로덕션 오류 주입 결과

계측: XHR `open`/`send` 후킹.
진입 화면은 `StoreProductLibraryPage` 를 사용했다 — 현재 실데이터의 `store/products` 목록에는 `supplierId` 가 없어
`StoreListingsPage` 의 "공급:" 트리거가 렌더되지 않기 때문이다(§10).
오퍼 응답에 합성 공급자 2건을 주입했다(**1건이면 자동 진열 POST 가 발생**하므로 2건으로 차단).

| # | 시나리오 | 결과 | 판정 |
|---|----------|------|:----:|
| A | `200 + 조건 설정됨` | 최소 주문 300,000원 · 미달 물류비 +5,000원 · 안내 문구 표시 | PASS |
| B | `200 + 필드 전부 null` | **"조건 없음" + "별도 주문 조건을 설정하지 않았습니다"**, 오류 X | PASS |
| C | `404 SUPPLIER_NOT_FOUND` | "공급자 정보를 확인할 수 없습니다", **재시도 X** | PASS |
| D | `401` | "주문 조건을 불러오지 못했습니다" + **재시도 O** | PASS |
| E | `500` | 오류 + 재시도 | PASS |
| F | 네트워크 실패 | 오류 + 재시도 | PASS |
| G | `200 + data:"문자열"` | **오류** (조건 없음 위장 X) | PASS |
| H | `200 + data:null` | **오류** (정상 미존재 경로 없음 — 계약대로) | PASS |
| I | 재시도 실패 유지 | 오류 유지, `condCalls: 1` | PASS |
| J | 재시도 성공 복구 | 조건 정상 표시, 오류 문구 소멸 | PASS |
| K | error 상태에서 닫았다 재오픈 | 이전 오류 잔존 없이 정상 표시 | PASS |

전 시나리오 `unhandledrejection: 0` · 차단된 write 시도 `0`.

---

## 9. 반응형

| 폭 | hOverflow | 다시 시도 | 문구 잘림 | 조건값 동시 렌더 |
|----|:---------:|:---------:|:---------:|:----------------:|
| 1440×900 (error) | 0 | 접근 가능 | 없음 | 0 |
| 768×1024 (error) | 0 | 접근 가능 | 없음 | 0 |
| 390×844 (error) | 0 | 접근 가능 | 없음 | 0 |
| 390×844 (not-found) | 0 | 의도적 미제공 | 없음 | 0 |

모달 레이아웃 회귀 없음.

---

## 10. 회귀 · 콘솔

| 항목 | 결과 |
|------|------|
| `/store/manage/products` 정상 렌더 | PASS (진열된 제품 목록 정상) |
| `/store/manage/products/library` 정상 렌더 | PASS |
| 정상 상태 콘솔 오류 | **0** (계측 제거 후 새 세션 로드 기준) |
| unhandled rejection | 0 |
| 로딩 고착 | 0 |

---

## 11. 변경 범위

| 항목 | 결과 |
|------|:----:|
| backend 변경 | **0** |
| DB 변경 / migration | **0** |
| 운영 데이터 write | **0** |
| 공통 API wrapper · UI Core 변경 | 0 |
| dependency · lockfile 변경 | 0 |
| 테스트 계정·데이터 생성 | 0 |
| 서버 원문·stack trace 화면 노출 | 0 |

변경 파일 2개:
- [supplier.ts](services/web-neture/src/lib/api/supplier.ts) — 오류 코드 2종 + `getOrderCondition()` 계약
- [SupplierConditionModal.tsx](services/web-neture/src/components/common/SupplierConditionModal.tsx) — 상태 머신 · try/catch · error/not-found 분리 · 재시도

---

## 12. 실데이터 제한

- 현재 이 매장의 `store/products` 목록 데이터에는 **`supplierId` 가 없어** `StoreListingsPage` 의 "공급:" 트리거가 렌더되지 않는다.
  따라서 해당 화면에서의 실데이터 모달 진입은 검증하지 못했다. 두 화면 모두 동일 prop 으로 같은 모달을 렌더하므로 동작은 동일하다.
- 제품 라이브러리의 오퍼도 실데이터에는 이 계정 기준 공급자 오퍼가 없어("현재 이용 가능한 공급자가 없습니다") 합성 오퍼로 진입했다.
- 진열(POST) 은 하네스에서 차단해 서버에 도달시키지 않았다 — 운영 데이터 write 0.
- 실데이터 기반 조건 조회 검증은 공급자 오퍼가 연결된 매장에서 별도 확인이 필요하다.

---

## 13. 후속

| # | 항목 | 비고 |
|---|------|------|
| 1 | 매장 측 `storeApi.getOrderById()` — 5xx·네트워크를 "주문 없음" 으로 위장 / `storeApi.getShipment()` 전량 삼킴 | IR 우선순위 3 (P1 포함) |
| 2 | `GET /supplier/orders/:orderId/shipment` UUID 검증 누락 → 비-UUID 시 500 | backend 소규모 |
| 3 | `StoreListingsPage` 목록 응답에 `supplierId` 가 비어 조건 모달 진입점이 사실상 미노출 | 데이터/계약 확인 필요 — 본 WO 범위 외 |

---

*Recorded: 2026-07-26*
