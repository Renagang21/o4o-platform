# CHECK-O4O-NETURE-ORDER-UUID-PARAM-VALIDATION-V1

> WO: `WO-O4O-NETURE-ORDER-UUID-PARAM-VALIDATION-V1`
> 일자: 2026-07-26
> 상태: **PASS**
> 배경: 선행 CHECK 3건(공급자 배송 / 매장 주문 상세 / 매장 주문 목록)에서 반복 기록된 후속 항목을 마무리한다.

---

## 1. 변경 endpoint

| endpoint | 변경 전 | 변경 후 |
|----------|:-------:|:-------:|
| `GET /neture/seller/orders/:id` | 비-UUID → **500** | 비-UUID → **400 `INVALID_ORDER_ID`** |
| `GET /neture/seller/orders/:orderId/shipment` | 비-UUID → **500** | 비-UUID → **400 `INVALID_ORDER_ID`** |
| `GET /neture/supplier/orders/:orderId/shipment` | 비-UUID → **500** | 비-UUID → **400 `INVALID_ORDER_ID`** |

원인: 경로 파라미터가 검증 없이 repository 로 내려가 `uuid` 캐스팅 오류를 일으키고, 컨트롤러 catch 가 이를 500 으로 반환했다.

---

## 2. 적용한 검증 방식

프로젝트에 이미 있던 **컨트롤러 파일-로컬 `UUID_REGEX` 패턴**을 그대로 재사용했다
(`supplier-order.controller.ts` 의 `POST /orders/:orderId/shipment` 에 존재하던 검증).

```ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
...
if (!UUID_REGEX.test(orderId)) {
  return res.status(400).json({ success: false, error: 'INVALID_ORDER_ID', message: 'Invalid order ID format' });
}
```

- **공통 middleware 신설 0** — WO 지침대로 기존 관례(컨트롤러별 로컬 상수)를 따랐다.
  같은 패턴이 `admin-settlement` / `supplier-settlement` / `supplier-order` 컨트롤러에 이미 존재한다.
- 검증은 **DB 조회 이전**, 인증(`requireAuth`) 및 공급자 연결 가드 **이후**에 위치한다 —
  미인증 요청이 400 으로 새어나가지 않는다(auth-first 유지).
- 대소문자 무시(`/i`) — 대문자 UUID 도 유효 취급.

변경 파일 2개:
- [seller.controller.ts](apps/api-server/src/modules/neture/controllers/seller.controller.ts) — 파일-로컬 `UUID_REGEX` 추가 + 2개 route
- [supplier-order.controller.ts](apps/api-server/src/modules/neture/controllers/supplier-order.controller.ts) — 기존 `UUID_REGEX` 재사용 + GET shipment 1개 route

---

## 3. 400 · 404 계약

| 입력 | 응답 | 의미 |
|------|:----:|------|
| 형식이 잘못된 id | `400 INVALID_ORDER_ID` | **신규** — 요청 자체가 잘못됨 |
| 유효 UUID · 주문 미존재 | `404 ORDER_NOT_FOUND` | 기존 유지 |
| 유효 UUID · 타인 소유 | `404 ORDER_NOT_FOUND` | 기존 유지 (존재 은닉) |
| 유효 UUID · 정상 | `200` | 기존 유지 |

404·소유권·정상 응답 계약은 **변경하지 않았다.** 400 은 기존에 500 이던 경로에만 새로 생긴다.

프론트엔드 영향: 400 은 `STORE_ORDER_NOT_FOUND` / `SUPPLIER_SHIPMENT_ORDER_NOT_FOUND` 가 아니라
**load error** 로 분류된다(404 만 not-found). 형식 오류를 "주문 없음" 으로 표시하지 않는 것이 옳으므로 의도된 동작이다.

---

## 4. 프로덕션 검증

배포 전후를 같은 방식(로그인 세션 XHR)으로 실측했다.

### 4-1. 비-UUID → 400

| 입력 id | seller 상세 | seller 배송 | supplier 배송 |
|---------|:-----------:|:-----------:|:-------------:|
| `not-a-uuid` | 400 `INVALID_ORDER_ID` | 400 | 400 |
| `item-syn-1` | 400 | 400 | 400 |
| `123` | 400 | 400 | 400 |
| `00000000-0000-0000-0000-00000000000` (한 자리 부족) | 400 | 400 | 400 |

**배포 전 동일 요청은 세 endpoint 모두 `500 INTERNAL_ERROR` 였다.**

### 4-2. 유효 UUID 회귀

| 입력 | 결과 |
|------|------|
| 미존재 UUID `00000000-...-000000000000` | 세 endpoint 모두 **404 `ORDER_NOT_FOUND`** (기존 유지) |
| 대문자 UUID | **404 `ORDER_NOT_FOUND`** (유효 취급, 400 아님) |
| 주문 목록 `GET /neture/seller/orders?page=1&limit=20` | **200** (선행 WO 의 500 해소 상태 유지) |

### 4-3. 화면 회귀

| 화면 | 비-UUID id | 미존재 UUID | 목록 |
|------|------------|-------------|------|
| 매장 `/store/orders/:id` | 조회 오류 + 다시 시도 (not-found 아님) | "주문을 찾을 수 없습니다" | "주문 내역이 없습니다"(정상 0건) |
| 공급자 `/supplier/orders/:id` | 조회 오류 | "주문을 찾을 수 없습니다" | 정상 |

로딩 고착 0 · 배송 영역 오분류 0 · 목록 회귀 0.

---

## 5. typecheck · build · 배포

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.build.json` (api-server) | PASS |
| `pnpm --filter @o4o/api-server build` | PASS (exit 0) |
| 커밋 | `5e7e7d8d8` — `fix(neture): validate order id format on order detail and shipment reads` |
| Deploy API Server (Cloud Run) | run `30203968460` **success** |
| revision | **`o4o-core-api-02949-tvp`** |

Web 배포는 불필요 (frontend 변경 0).

---

## 6. 변경 범위

| 항목 | 결과 |
|------|:----:|
| DB 변경 / migration | **0** |
| 운영 데이터 write | **0** (전 검증이 GET only) |
| 404 · 소유권 · 정상 응답 계약 변경 | 0 |
| 공통 middleware 신설 | 0 |
| frontend 변경 | 0 |
| dependency · lockfile 변경 | 0 |

---

## 7. 남은 후속

| # | 항목 |
|---|------|
| 1 | 실주문이 생긴 뒤 매장·공급자 주문 목록/상세의 실데이터 검증 (현재 이 매장 주문 0건) |

> 이 CHECK 로 선행 3개 CHECK 에 반복 기록돼 있던 "UUID 검증 누락" 후속 항목이 닫힌다.

---

*Recorded: 2026-07-26*
