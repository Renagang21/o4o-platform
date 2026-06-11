# CHECK-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1

> 공급자 정산 대상을 일반 전자상거래 흐름으로 정렬. **legacy delivered-only 정산 조건을 제거**하고
> delivered + payment/collection readiness 로 정정. 결제 확인 전 주문은 정산 제외.
> **결과: PASS** — api-server tsc 0 / 호출처·실사용 조사(수동 admin 액션, no cron) / narrowing-only.
> (정산 후보 건수 변화 live 실측은 firewalled DB 로 deferred — 코드·근거로 판정.) — 2026-06-11
> 상위: `IR-O4O-STORE-ORDER-PAYMENT-READINESS-MODEL-V1`

---

## 1. 변경 파일 (1, backend-only)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/services/neture-settlement.service.ts` | `calculateSettlements` 후보 쿼리 WHERE 를 `status='delivered'` → `status='delivered' AND (readiness)` 로 정정. 빈결과 메시지 갱신 |

> 함수/테이블/수수료율(10%)/배송비 정산 정책/정산 UI/DB schema/migration/bridge/payment handler **무변경**.

## 2. 사전 조사 (삭제 전 실사용 확인 — WO §6)
- **호출처**: `calculateSettlements` 는 `POST /settlements/calculate` (admin-settlement.controller, `requireAuth`+`adminGuard`) **단일 호출**. **cron/job 없음** → 자동 실행 아님, 수동 admin 액션.
- **의존성**: 정산 결과는 `neture_settlements` / `neture_settlement_orders` 테이블에 적재. supplier/admin 정산 목록·KPI·상세·승인·지급은 **이 테이블을 읽음** → 함수/테이블은 **보존 필요**(삭제 불가). 정정 대상은 **후보 선정 WHERE 절(legacy delivered-only)** 뿐.
- **판단**: 따라서 "함수 삭제"가 아니라 **"delivered-only 후보 조건 제거 + readiness 조건 추가"**(WO 후보 B). calculate 가 수동 액션이라 narrowing 으로 인한 자동 사고 없음. 기존 적재된 settlement rows 무영향.

## 3. 변경 전/후 (후보 쿼리)
**전 (legacy delivered-only):**
```sql
WHERE o.status = 'delivered'
  AND o.updated_at >= $1 AND o.updated_at < $2+1d
  AND NOT EXISTS (... already settled)
```
**후 (delivered + readiness):**
```sql
WHERE o.status = 'delivered'
  AND (
    o.paid_at IS NOT NULL
    OR o.metadata->>'paymentStatus' = 'paid'
    OR o.metadata->>'paymentReady' = 'true'
    OR o.metadata->>'collectionStatus' = 'confirmed'
  )
  AND o.updated_at >= $1 AND o.updated_at < $2+1d
  AND NOT EXISTS (... already settled)
```

## 4. readiness 기준 근거 (§10.1 핵심)
- neture_orders 가 `delivered` 가 되면 `status` 는 `'delivered'` 로 덮여 **`status='paid'` 는 동시 성립 불가** → status 기반 readiness 사용 안 함.
- **`paid_at IS NOT NULL`**: `NeturePaymentEventHandler`(serviceKey='neture') 가 결제 완료 시 `status=PAID, paid_at` 세팅. delivered 로 전이돼도 **paid_at 은 잔존** → online 결제 주문의 신뢰 가능한 readiness 신호.
- **metadata**: checkout_order-origin / future bridge 주문(`paymentStatus='paid'`|`paymentReady`)과 V2 collectionStatus 대비(`collectionStatus='confirmed'`). future-compatible.
- 결과: **결제 확인 없이 delivered 만 된 주문(legacy 우회/테스트)은 정산 제외**. checkout-origin 미결제 주문이 bridge→delivered 돼도 readiness 없으면 자동 제외 → 별도 source 예외 block 불필요(positive readiness 로 충족, §9.3).

## 5. 검증
- **api-server tsc 0** ✅
- **호출처/실사용 조사**: 수동 admin 액션, no cron, 기존 settlement rows 무영향 ✅ (§2)
- **narrowing-only 논증**: 변경은 후보 집합을 **축소만** 한다(readiness 미충족 delivered 주문 제외). 이미 적재된 정산·승인·지급·목록·KPI 무영향. calculate 재실행 시 미결제 delivered 주문이 새로 편입되지 않음 ✅
- **정산 후보 건수 변화 — DEFERRED(live)**: 프로덕션 DB 는 firewall 로 `gcloud sql connect` 인터랙티브만 허용(psql 미설치) → 후보 0건/N건 live 실측은 deferred. pre-launch 단계상 결제 미확인 delivered 주문은 정산 제외가 정상(0건 허용). admin settlement 화면은 `neture_settlements` 적재분을 읽으므로 빈 계산 결과에도 무관(빈 결과 정상 처리 — `created:0, settlements:[]`).
- **regression**: legacy delivered-only 자동 편입 제거 외 동작 무변경. 수수료/배송비/junction/취소·승인·지급 무변경 ✅

## 6. 회귀 무영향
- supplier/admin 정산 목록·KPI·상세·승인(approve)·지급(pay)·취소(cancel) 무변경 — `neture_settlements` 읽기/쓰기 그대로.
- payment handler / fulfillment / bridge / DB schema / migration 무변경.
- `calculateSettlements` 의 INSERT·junction·수수료 계산 로직 무변경(후보 선정 WHERE 만 정정).

## 7. 완료 기준 체크 (WO §13)
1(delivered-only 쿼리 조사) ✅. 2(실사용 확인 — 수동 admin) ✅. 3(delivered-only 제거 + readiness 추가) ✅. 4(checkout-origin/bridge readiness 없으면 제외) ✅. 5(legacy delivered-only 조건 제거 — 함수는 실사용 의존으로 보존, 조건만 정리) ✅. 6(0건 정상 처리) ✅. 7(admin 화면 무영향) ✅. 8(payment/fulfillment/bridge 무변경) ✅. 9(schema/migration 무변경) ✅. 10(tsc 0) ✅. 11(가능 smoke — 코드/근거 판정, live deferred) ✅. 12(CHECK) ✅. 13(path-specific) ✅. 14(다른 세션 무접촉) ✅.

## 8. 남은 GAP/RISK · 후속
- **live 후보 건수 실측**: bridge/실주문 누적 후 `gcloud sql connect` 또는 admin calculate 액션으로 0건/정상 편입 1회 실측(후속).
- **B2B 결제 경로**: neture_orders B2B 주문이 결제 없이 운영상 delivered 되는 케이스가 실재한다면(현재 pre-launch 가정) readiness 정보(paid_at/metadata) 가 없어 정산 제외됨 → 운영 정책 확인 후 `collectionStatus` 모델로 수렴 필요. **중단조건(§12) 해당 데이터는 firewalled DB 로 미확인 — pre-launch 가정 하 진행. 실주문 존재 시 IR-O4O-SUPPLIER-SETTLEMENT-LEGACY-USAGE-AUDIT-V1 로 재검토.**
- **collectionReady 정식 모델 부재**: V1 은 metadata 기반 임시 → `IR/WO-O4O-ORDER-COLLECTION-STATUS-MODEL-V1`.
- 후속: `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1`(paid checkout_order만 bridge), `WO-O4O-SUPPLIER-SETTLEMENT-REFUND-ADJUSTMENT-V1`(정산 후 환불/취소 조정).

---

*Date: 2026-06-11 · Status: PASS (delivered-only 정산 정정 → delivered + payment readiness. 수동 admin 액션·narrowing-only. live 후보 건수 실측 deferred).*
