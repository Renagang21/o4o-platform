# CHECK-O4O-NETURE-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1

> WO: `IR/WO-O4O-NETURE-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1`
> IR: [`IR-O4O-NETURE-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1.md`](docs/investigations/IR-O4O-NETURE-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1.md)
> 일자: 2026-07-26
> 상태: **PASS — 프로덕션 500 해소 확인**

---

## 1. backend 500 원인과 수정

**원인**: 컨트롤러가 정렬 필드를 컬럼명으로 넘기는데 TypeORM `order` 는 엔티티 속성명을 요구한다.

```ts
// seller.controller.ts:249 — 컬럼명(snake_case)
sort: (sort as any) || 'created_at',

// neture.repository.ts — 그대로 order 에 사용 → EntityPropertyNotFoundError → 500
order: { [orderField]: orderDir } as any,
```

`NetureOrder` 의 속성은 `createdAt`(`@CreateDateColumn({ name: 'created_at' })`).
repository 기본값(`|| 'createdAt'`)은 올발랐지만 **컨트롤러가 항상 값을 채워 보내 무력화**되어
쿼리 파라미터와 무관하게 **상시 500** 이었다.

**수정** — [neture.repository.ts `findOrders()`](apps/api-server/src/routes/neture/repositories/neture.repository.ts#L222):

```ts
const SORTABLE_FIELDS: Record<string, string> = {
  created_at: 'createdAt', createdAt: 'createdAt',
  updated_at: 'updatedAt', updatedAt: 'updatedAt',
  order_number: 'orderNumber', orderNumber: 'orderNumber',
  total_amount: 'totalAmount', totalAmount: 'totalAmount',
  final_amount: 'finalAmount', finalAmount: 'finalAmount',
  status: 'status',
};
const orderField = SORTABLE_FIELDS[options.sort ?? ''] ?? 'createdAt';
```

- snake/camel 양쪽을 받고, **화이트리스트 밖 값은 기본 정렬로 떨어뜨린다** — 임의 `?sort=` 입력이 더 이상 500 을 만들지 못한다.
- 호출부를 고치지 않고 repository 에서 흡수해 `listOrders` / `listAllOrders` 양쪽에 동시 적용된다.
- **`page`/`limit` 클램프는 도입하지 않았다** — service 가 `meta.page`/`meta.limit` 을 자체 계산하므로
  repository 에서 별도로 클램프하면 응답 meta 와 실제 쿼리가 어긋난다. NaN 은 service 의 `|| 1` / `|| 20` 이 이미 흡수한다.

---

## 2. 정상 응답 계약

| 상황 | 응답 |
|------|------|
| 정상 0건 | `200 { success:true, data:[], meta:{ total:0, totalPages:0 } }` |
| 정상 데이터 | `200 { success:true, data:[...], meta }` |
| 미인증 | `401 UNAUTHORIZED` |
| 서버 오류 | `500 INTERNAL_ERROR` |

정상 0건도 `data: []` 이므로 실패를 빈 배열로 대체하면 구분이 불가능하다.

---

## 3. backend 수정 여부

**수정함** (1개 함수). DB schema 변경 0 / migration 0 / 주문 상태 머신 변경 0 / 소유권 정책 변경 0 / 운영 데이터 수정 0.

---

## 4. frontend 오류 삼킴 원인과 적용 계약

```ts
// 수정 전
catch (error) { console.warn(...); return { data: [], meta: { ..., total: 0 } }; }   // 500 → "정상 0건"
```

```ts
export const STORE_ORDERS_LOAD_FAILED = 'STORE_ORDERS_LOAD_FAILED';
```

| 입력 | 반환 |
|------|------|
| `200 + success:true + data:[]` | 빈 목록 (정상 0건) |
| `200 + success:true + data:[...]` | 목록 |
| `success !== true` · `data` 비배열 | throw `STORE_ORDERS_LOAD_FAILED` |
| 4xx · 5xx · 네트워크 | throw `STORE_ORDERS_LOAD_FAILED` |

서버 원문은 `console.warn(describeApiError(error))` 로만 남긴다.
소비처는 [StoreOrdersPage.tsx](services/web-neture/src/pages/store/StoreOrdersPage.tsx) 1곳뿐이다
(`supplierApi.getOrders()` 는 별개 함수이며 선행 WO 에서 이미 정비됨).

---

## 5. 목록 상태 분리 · 재시도

```ts
try { const result = await storeApi.getOrders({ page, limit: 20, status: statusFilter || undefined }); ... }
catch { setOrders([]); setTotalPages(0); setTotal(0); setLoadError(true); }
finally { setLoading(false); }
```

| 상태 | 렌더 |
|------|------|
| `loading` | "주문 내역을 불러오는 중..." |
| `error` | "주문 내역을 불러오지 못했습니다 / 잠시 후 다시 시도해 주세요." + **다시 시도** |
| `success` + 0건 | 기존 "주문 내역이 없습니다" + 상품 둘러보기 |
| `success` + 데이터 | 기존 테이블/카드 |

오류 상태에서 "주문 내역이 없습니다"·상품 둘러보기·목록은 렌더되지 않는다(§6 상호 배타 확인).
다시 시도는 `fetchOrders()` — **현재 `page`·`statusFilter` 조건 그대로 목록 API 만 재호출**한다.

---

## 6. 프로덕션 검증

### 6-1. 500 해소 (본 WO 의 핵심)

| 시점 | 관측 |
|------|------|
| 배포 전 | `GET /neture/seller/orders?page=1&limit=20` → **500 `INTERNAL_ERROR`**, 화면 "주문 내역이 없습니다" |
| 배포 후 | 같은 요청 → **`200 { data: [], meta:{ page:1, limit:20, total:0, totalPages:0 } }`**, 화면 "주문 내역이 없습니다" |

배포 후에야 이 매장의 주문이 **실제로 0건**임이 처음으로 확인된다.
(그 전에는 장애와 0건을 구분할 수 없었다.)

### 6-2. 오류 주입

| # | 시나리오 | 결과 | 판정 |
|---|----------|------|:----:|
| A | `200 + data:[]` (정상 0건) | "주문 내역이 없습니다" + 상품 둘러보기, 오류 X | PASS |
| B | `200 + data:[...]` | 목록 렌더 | PASS |
| C | `500` | **"주문 내역을 불러오지 못했습니다" + 다시 시도**, 빈 상태 문구 X | PASS |
| D | `401` | 오류 + 재시도 | PASS |
| E | 네트워크 실패 | 오류 + 재시도 | PASS |
| F | `200 + data:{비배열}` | 오류 + 재시도 | PASS |
| G | `200 + success:false` | 오류 + 재시도 | PASS |

전 시나리오 로딩 고착 0 · `unhandledrejection` 0 · 차단된 write 시도 0.

### 6-3. 재시도 · 조건 유지

| 확인 | 결과 |
|------|------|
| `status` 필터 유지 | 오류 발생 쿼리 `page=1&limit=20&status=shipped` → 재시도 동일 |
| `page` 유지 | 오류 발생 쿼리 `page=2&limit=20` → 재시도 **`page=2&limit=20`** (동일) |
| 재시도 실패 | 오류 유지, 같은 조건으로 1회 재호출 |
| 재시도 성공 | 목록 복구, 오류·빈 상태 문구 소멸 |

### 6-4. 반응형

| 폭 | hOverflow | 다시 시도 | 문구 잘림 | 빈 상태 동시 렌더 | 목록 동시 렌더 |
|----|:---------:|:---------:|:---------:|:-----------------:|:--------------:|
| 1440×900 (error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 768×1024 (error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 390×844 (error) | 0 | 접근 가능 | 없음 | 0 | 0 |
| 390×844 (정상 0건) | 0 | 미제공(정상) | 없음 | — | 0 |
| 390×844 (정상 데이터) | 0 | — | 없음 | 0 | 카드 정상 |

### 6-5. 콘솔

| 항목 | 결과 |
|------|------|
| `/store/orders` 정상 상태 콘솔 오류 | **0** — 직전 CHECK 에서 1건이던 500 이 사라졌다 |
| 로딩 고착 | 0 |
| unhandled rejection | 0 |

---

## 7. typecheck · build · 배포

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.build.json` (api-server) | PASS |
| `tsc --noEmit -p tsconfig.json` (web-neture) | PASS |
| `pnpm --filter @o4o/web-neture build` | PASS |
| 커밋 | `83106502d` — `fix(neture): resolve store orders list 500 and stop swallowing load errors` (IR + backend + frontend 동일 커밋) |
| Deploy API Server (Cloud Run) | run `30202925943` **success** → **`o4o-core-api-02945-2fm`** |
| Deploy Web Services (Cloud Run) | run `30202925961` **success**, `deploy-neture` success → **`neture-web-01331-jl6`** |

---

## 8. 변경 범위

| 항목 | 결과 |
|------|:----:|
| DB schema 변경 / migration | **0** |
| 운영 데이터 write | **0** (비-GET 요청은 하네스에서 전부 차단, 계측값 `writes: 0`) |
| 주문 상태 머신 · 소유권 정책 변경 | 0 |
| 공통 API wrapper · UI Core 변경 | 0 |
| dependency · lockfile 변경 | 0 |
| 서버 원문·stack trace 화면 노출 | 0 |

변경 파일 3개:
- [neture.repository.ts](apps/api-server/src/routes/neture/repositories/neture.repository.ts) — 정렬 필드 매핑·화이트리스트
- [store.ts](services/web-neture/src/lib/api/store.ts) — `STORE_ORDERS_LOAD_FAILED` + `getOrders()` 계약
- [StoreOrdersPage.tsx](services/web-neture/src/pages/store/StoreOrdersPage.tsx) — `loadError` 상태 · 오류 UI · 재시도

---

## 9. 후속

| # | 항목 |
|---|------|
| 1 | `GET /neture/seller/orders/:id` · `/shipment` UUID 검증 누락 → 비-UUID 시 500 (공급자 측과 동일, backend 소규모) |
| 2 | 실주문이 생긴 뒤 목록·상세의 실데이터 검증 (현재 이 매장 주문 0건) |

---

*Recorded: 2026-07-26*
