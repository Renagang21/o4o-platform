# CHECK-O4O-NETURE-SETTLEMENT-SCHEMA-QUALIFICATION-FIX-V1

> WO: `WO-O4O-NETURE-SETTLEMENT-SCHEMA-QUALIFICATION-FIX-V1`
> 작업일: 2026-08-01 · 브랜치 `main` · 작업 전 HEAD `3214b4afd`
> **결과: 정산 경로 복구 완료 · 커미션 경로는 중지 조건 발동으로 미완 (§6)**

---

## 1. 오류 원인

| 항목 | 값 |
|---|---|
| 실제 테이블 | `neture.neture_order_items` (**neture 스키마**) |
| 쿼리 참조 | `JOIN neture_order_items` (스키마 미한정) |
| `search_path` | `"$user", public` — 역할 `o4o_api` 에 rolconfig override 없음 |
| 결과 | `ERROR: relation "neture_order_items" does not exist` |

수정 전 프로덕션에서 오류를 직접 재현했다.

> 공급자 조회 쪽(`supplier-order.service` 등)은 처음부터 `neture.neture_order_items` 로
> 한정되어 있어 정상이었다. 정산·커미션 파일만 미한정이었다.

### 1-1. 구조 사전 확인 (중지 조건 ① 대조)

| 항목 | 결과 |
|---|---|
| 테이블 위치 | `neture.neture_order_items` / `public.neture_orders` · `neture_settlements` · `neture_settlement_orders` · `partner_commissions` |
| 사용 컬럼 존재 | `order_id` · `product_id` · `total_price` ✅ 전부 존재 |

→ 조사 결과와 실제 구조가 일치. 중지 조건 ① **미해당**.

## 2. 수정한 쿼리 — 4곳

| # | 파일 | 지점 | WO 지정 |
|:-:|------|------|:---:|
| ① | `neture-settlement.service.ts` | 정산 생성 집계 | ✅ |
| ② | `neture-settlement.service.ts` | per-order 판매액 조회 | ⚠️ **범위 확장 — §2-1** |
| ③ | `partner-commission.service.ts` | 단건 주문 커미션 산정 | ✅ |
| ④ | `partner-commission.service.ts` | 기간 배치 커미션 산정 | ✅ |

변경은 전부 동일한 기계적 치환이다.

```diff
- JOIN neture_order_items oi ON oi.order_id = o.id
+ JOIN neture.neture_order_items oi ON oi.order_id = o.id
```

잔여 미한정 참조: **0건** (전수 grep 확인).

### 2-1. ⚠️ 범위 확장 1건과 사유

WO 는 3경로를 지정하고 "per-order 판매액 조회 변경"을 제외 목록에 두었다.
그러나 ② 는 ① **직후에 실행되는 같은 정산 생성 흐름의 일부**이고 **동일한 결함**을 갖고 있다.
①만 고치면 정산 생성이 한 줄 뒤에서 다시 실패해 WO 목표("정산 쿼리 실행 가능")가 달성되지 않는다.

제외 항목은 그 쿼리의 **로직 변경**(직전 WO 에서 서비스 필터를 넣지 않기로 한 판단)을 뜻하는 것으로
해석했고, 스키마 한정은 로직 변경이 아니므로 함께 적용했다. **금액 산식·필터 조건은 건드리지 않았다.**

## 3. 서비스 경계 유지 방식

직전 WO 에서 넣은 경계를 **그대로 보존**했다 — 이번 변경은 `JOIN` 절만 건드렸다.

```
netureOrderServiceScopeSql 사용:  neture-settlement.service 2곳 · partner-commission.service 3곳
```

계약 불변: **Neture 정산·커미션은 Neture 주문만 집계**하고, `service_key` 미표기 주문은
`COALESCE(..., 'neture')` 로 Neture 로 간주한다.

## 4. 수정 전후 검증 (프로덕션 read-only)

| 쿼리 | 수정 전 | 수정 후 |
|---|---|---|
| ① 정산 생성 집계 | ❌ `relation does not exist` | ✅ **실행 성공** · 0건 |
| ② per-order 판매액 | ❌ 동일 오류 | ✅ **실행 성공** · 0건 |
| ③ 커미션 단건 | ❌ 동일 오류 | ❌ **다른 오류로 실패** — §6 |
| ④ 커미션 기간 배치 | ❌ 동일 오류 | ❌ **다른 오류로 실패** — §6 |

| 기타 검증 | 결과 |
|---|---|
| 서비스 필터 정상 적용 | ✅ 쿼리에 `COALESCE(o.service_key,'neture') = $n` 유지 확인 |
| `tsc --noEmit -p tsconfig.build.json` | ✅ 0 errors |
| 관련 테스트 (`fulfillment-service-scope`) | ✅ 10/10 |

## 5. 데이터 변경

```
migration 0 · DB write 0 · 신규 테이블 0 · 신규 컬럼 0
```

정산 원장 건수 **전후 불변**:

```
neture_settlements 0 · neture_settlement_orders 0 · partner_commissions 0
neture_orders 0 · neture.neture_order_items 0
```

→ 대상 데이터가 0건이라 **금액 비교 대상이 없다**. WO 의 "정산 데이터가 존재한다면 수정 전후
대상 주문 수·금액 비교" 조건은 데이터 부재로 해당하지 않는다(금액 변화 위험 0).
중지 조건 ③ **미해당**.

## 6. ⚠️ 중지 조건 ② 발동 — 커미션 경로의 두 번째 결함

스키마 한정 후 커미션 쿼리 2개에서 **독립적인 새 오류**가 나왔다.

```
ERROR: operator does not exist: character varying = uuid
  ... neture_partner_recruitments npr ON npr.product_id = spo.master_id
```

| 컬럼 | 타입 |
|---|---|
| `neture_partner_recruitments.product_id` | **character varying** |
| `supplier_product_offers.master_id` | **uuid** |
| `neture.neture_order_items.product_id` | uuid |

즉 커미션 산정은 스키마 한정만으로 복구되지 않는다. 타입 캐스트가 필요하다.

**고치지 않은 이유** — WO 중지 조건 ②("스키마 한정 후 추가 SQL 결함이 연속 발견됨")에 정확히 해당한다.
또한 캐스트 방향 결정이 **데이터 모델 판단**을 요구한다:

- `npr.product_id::uuid` — `product_id` 가 항상 UUID 문자열이라는 전제가 필요하다.
  비-UUID 값이 하나라도 있으면 **런타임 캐스트 예외**가 난다.
- `spo.master_id::text` — 안전하지만 `master_id` 인덱스를 못 쓴다.
- 또는 `product_id` 컬럼 타입 자체를 uuid 로 정정 (migration — 이번 WO 제외 범위)

관련 데이터는 현재 **`neture_partner_recruitments` 0건 · active 계약 0건**이라 즉시 영향은 없다.

→ 후속 WO 권고: `WO-O4O-PARTNER-COMMISSION-PRODUCT-ID-TYPE-ALIGNMENT-V1`
(캐스트 vs 컬럼 타입 정정 판단 + `product_id` 실제 값 형식 조사)

## 7. 최종 상태

| 경로 | 상태 |
|---|---|
| **정산 생성** (①②) | ✅ **복구 완료** — 스키마 한정으로 실행 가능 |
| **파트너 커미션** (③④) | ⚠️ **여전히 미동작** — 스키마 한정은 되었으나 타입 불일치가 남음 |

이번 커밋은 커미션 경로의 오류를 **2개 중 1개 제거**한 상태다. 남은 1개는 §6 후속 WO 대상이다.

## 8. 중지 조건 판정

| 조건 | 판정 |
|---|---|
| 실제 테이블·컬럼 구조가 조사 결과와 다름 | ❌ 미해당 (§1-1) |
| **스키마 한정 후 추가 SQL 결함이 연속 발견됨** | ⚠️ **해당** — §6. 커미션 캐스트 미수정, 보고로 종료 |
| 기존 0건이 아닌 정산 데이터에 금액 변화 발생 | ❌ 미해당 — 전 대상 0건 (§5) |
| 정산 정책 판단이 필요한 로직 변경 필요 | ❌ 미해당 — 이번 변경은 JOIN 절만 |
| 병행 세션 파일 수정 필요 | ❌ 미해당 |
