# IR-O4O-NETURE-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1

> 유형: 조사 → **구현 진행 판정**
> 일자: 2026-07-26
> 발단: `CHECK-O4O-NETURE-STORE-ORDER-DETAIL-LOAD-ERROR-CONTRACT-V1` §13 (검증 중 발견한 프로덕션 실장애)
> 위험도: **C / P1**

---

## 1. 관측된 증상

```text
GET /api/v1/neture/seller/orders?page=1&limit=20
→ 500 { success:false, error:"INTERNAL_ERROR" }

화면 /store/orders
→ "주문 내역이 없습니다"
```

프로덕션에서 재현되며(SPA 재진입 시 매번 500), 매장 사용자에게는 **주문이 아예 없는 것으로 보인다.**

---

## 2. backend 500 원인 — 확정

호출 경로:

```text
seller.controller.ts:237  GET /orders
  → neture.service.ts:708  listOrders()
    → neture.repository.ts:222  findOrders()
      → orderRepo.findAndCount({ order: { [orderField]: dir } })
```

**컨트롤러가 정렬 필드를 컬럼명(snake_case)으로 넘긴다**:

```ts
// seller.controller.ts:249
sort: (sort as any) || 'created_at',
```

**repository 는 그 값을 TypeORM `order` 에 그대로 사용한다**:

```ts
// neture.repository.ts (수정 전)
const orderField = options.sort || 'createdAt';
...
order: { [orderField]: orderDir } as any,
```

TypeORM 의 `order` 는 **엔티티 속성명**을 요구한다.
`NetureOrder` 의 속성은 `createdAt` 이고 `created_at` 은 DB 컬럼명일 뿐이다
([neture-order.entity.ts:186](apps/api-server/src/routes/neture/entities/neture-order.entity.ts#L186)).

```ts
@CreateDateColumn({ name: 'created_at' })
createdAt!: Date;
```

→ `order: { created_at: 'DESC' }` → `EntityPropertyNotFoundError` → catch → **500**.

**중요**: repository 의 기본값(`|| 'createdAt'`)은 올바르지만 **컨트롤러가 항상 `'created_at'` 을 채워 보내므로 기본값이 작동하지 않는다.**
따라서 쿼리 파라미터와 무관하게 이 endpoint 는 **상시 500** 이다. 관측 결과와 일치한다.

부수 확인: 클라이언트가 `?sort=아무값` 을 보내도 동일하게 500 이 된다(화이트리스트 부재).

### 영향 범위

| 호출부 | `sort` 전달 | 영향 |
|--------|:-----------:|------|
| `seller.controller.ts:245` (매장 목록) | `'created_at'` 고정 | **상시 500** |
| `supplier-order.controller.ts:75` | 전달 안 함 (다른 service) | 영향 없음 |
| `listAllOrders()` | 호출부 없음 | 영향 없음 |

`sort` 를 넘기는 호출부는 매장 목록 하나뿐이다.

---

## 3. 정상 응답 계약

| 상황 | 응답 |
|------|------|
| 정상 0건 | `200 { success:true, data:[], meta:{ page, limit, total:0, totalPages:0 } }` |
| 정상 데이터 | `200 { success:true, data:[...], meta }` |
| 미인증 | `401 UNAUTHORIZED` |
| 서버 오류 | `500 INTERNAL_ERROR` |

**정상 0건도 `data: []`** 이므로 실패를 빈 배열로 대체하면 구분이 불가능하다.
소유권은 `where.userId = userId` 로만 걸리며(§2 경로), 소유권 정책 변경은 필요 없다.

---

## 4. frontend 오류 삼킴

```ts
// store.ts getOrders() — 수정 전
catch (error) {
  console.warn('[Store API] Failed to fetch orders:', error);
  return { data: [], meta: { page:1, limit:20, total:0, totalPages:0 } };   // 500 → "정상 0건"
}
```

| 입력 | 수정 전 반환 | 구분 |
|------|:------------:|:----:|
| `200 + data:[]` (정상 0건) | 빈 목록 | — |
| `200 + data:[...]` | 목록 | ✅ |
| `500` · `401` · 네트워크 · 깨진 payload | **빈 목록** | ❌ |

소비처 [StoreOrdersPage.tsx:138](services/web-neture/src/pages/store/StoreOrdersPage.tsx#L138) 은
결과를 그대로 세팅했고 `loadError` 상태 자체가 없었다 → `filteredOrders.length === 0` → "주문 내역이 없습니다".

`storeApi.getOrders()` 소비처는 이 페이지 1곳뿐이다
(`supplierApi.getOrders()` 는 별개 함수로 이미 선행 WO 에서 정비됨).

---

## 5. 판정

| 항목 | 결과 |
|------|------|
| 500 원인 명확한가 | **명확** — 정렬 필드 명명 불일치 |
| 소규모 수정으로 해결 가능한가 | **가능** — repository 1개 함수 |
| DB schema 변경 / migration 필요한가 | **불필요** |
| 소유권 정책 변경 필요한가 | **불필요** |
| 주문 목록 구조 재설계 필요한가 | **불필요** |

→ 중지 조건에 해당하지 않으므로 **backend 수정 + frontend 계약 정비를 같은 작업에서 진행**한다.

구현 결과는 `CHECK-O4O-NETURE-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1.md` 에 기록한다.

---

*Recorded: 2026-07-26*
