# WO-O4O-CHECKOUT-ORDERS-SCHEMA-CONTRACT-ALIGNMENT-V1 (설계 + 마이그레이션 설계 WO)

> **설계 전용 — 코드/DB 미변경(docs only).** 실제 `checkout_orders` 스키마와 Frozen E-commerce 계약 문서의
> drift 를 정리하고, retail canonical 정렬을 가능케 하는 **마이그레이션 설계안**까지만 보고한다.
> 실제 migration 작성/배포는 본 설계 승인 후 별도 진행.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 분류 | 설계 + migration 설계 (DB write 미실행) |
| 동기 | `WO-O4O-CHECKOUT-SERVICE-RETAIL-CHANNEL-SUPPORT-V1` 구현 착수 중 스키마 drift 발견 |
| 계약 SSOT | `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md` (Frozen) |
| 판정 | **READY FOR MIGRATION APPROVAL** |

---

## 0. 배경 / 중단 사유

K-Cosmetics create/payment 구현 착수 직전, 실제 `checkout_orders` 스키마가 설계 전제와 다름을 발견:
- `order_type` 컬럼 **부재** → 결정 #13(order_type 기록)·#15(엔티티 orderType 매핑) 불가(매핑 추가 시 없는 컬럼 SELECT → **list/detail 포함 전 쿼리 회귀**).
- `supplierId` **NOT NULL** → 결정 #8(retail supplier optional/null) 불가.
- 우회책으로 제시했던 `supplierId='__RETAIL__'` sentinel 은 **사용자 불허**(가짜 supplier 값 = 주문 원장 의미 왜곡, 정산/attribution drift 위험).

⇒ "구현 중 조정" 이 아니라 **계약 문서 ↔ 실제 DB 스키마 drift**. 스키마를 계약에 맞춘 뒤 create/payment 구현을 재개한다. **K-Cosmetics create/payment 구현은 중단 유지.** 1차 list/detail PASS 는 불변.

## 1. drift 요약

| 항목 | 계약 문서(§3/§7.1) | 실제 DB (`CreateCheckoutTables` 20260414100000) | drift |
|------|------|------|:---:|
| `order_type` 컬럼 | `checkout_orders_order_type_enum`(GENERIC/DROPSHIPPING/GLYCOPHARM/COSMETICS/TOURISM), 기본 GENERIC | **없음** (마이그레이션 `1736950000000-AddOrderTypeToCheckoutOrders` 도 부재) | ✅ |
| `supplierId` | (dropshipping 전제) | `varchar(100) NOT NULL` | ✅ (retail 불가) |
| 엔티티 매핑 | order_type 사용 | `CheckoutOrder` 엔티티에 `orderType` 필드 없음 | ✅ |

## 2. 실제 schema (checkout_orders, 운영)

```
id uuid PK, orderNumber varchar(50), buyerId uuid NOT NULL,
sellerId varchar(100) NOT NULL, supplierId varchar(100) NOT NULL,
sellerOrganizationId uuid NULL, partnerId varchar(100) NULL,
subtotal/shippingFee/discount/totalAmount decimal, status enum, paymentStatus enum,
paymentMethod varchar, shippingAddress jsonb, items jsonb NOT NULL DEFAULT '[]',
metadata jsonb, paidAt/refundedAt/cancelledAt timestamp, createdAt/updatedAt timestamp
indexes: orderNumber(uniq), buyerId, supplierId, partnerId, status, paymentStatus, sellerOrganizationId
```
- `order_type` 없음. `supplierId` NOT NULL. (status/paymentStatus enum 은 존재.)

## 3. 계약상 schema (목표)

- canonical 주문 원장 = checkout_orders (유지).
- 모든 주문 유형(GENERIC/DROPSHIPPING/GLYCOPHARM/COSMETICS/TOURISM)을 `order_type` 으로 분류(§3).
- retail(매장 직접 판매)은 공급자 없음 → supplier 비강제 가능해야 함.

## 4. 변경 필요 컬럼

| 컬럼 | 변경 | 사유 |
|------|------|------|
| `order_type` | **ADD** (enum, default `GENERIC`) | 계약 §3 주문 유형 분류 복원. retail=COSMETICS 기록 가능 |
| `supplierId` | **DROP NOT NULL** (nullable 허용) | retail 주문에 가짜 supplier 없이 null 저장 (sentinel 금지 충족) |

## 5. migration 설계안 (멱등, 비파괴)

```sql
-- 1) order_type enum 타입 (없으면 생성)
DO $$ BEGIN
  CREATE TYPE "checkout_orders_order_type_enum" AS ENUM
    ('GENERIC','DROPSHIPPING','GLYCOPHARM','COSMETICS','TOURISM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) order_type 컬럼 추가 (기존 행 default GENERIC)
ALTER TABLE "checkout_orders"
  ADD COLUMN IF NOT EXISTS "order_type" "checkout_orders_order_type_enum" NOT NULL DEFAULT 'GENERIC';

-- 3) order_type 인덱스 (조회/집계 보조)
CREATE INDEX IF NOT EXISTS "IDX_checkout_orders_order_type" ON "checkout_orders" ("order_type");

-- 4) supplierId nullable 화 (retail 수용)
ALTER TABLE "checkout_orders" ALTER COLUMN "supplierId" DROP NOT NULL;
```
- `down()`: order_type 컬럼/인덱스/타입 DROP + supplierId NOT NULL 복원(단, 복원 시 null 행 있으면 실패 → down 은 best-effort/문서화).
- 위치: `apps/api-server/src/database/migrations/` (glob 내 — pending 정상 인식). class명 timestamp 는 기존 ALTER(20260224500000)보다 **뒤**.

## 6. 기존 데이터 영향

- `order_type` ADD + DEFAULT GENERIC → **기존 모든 checkout_orders 행 = GENERIC** (비파괴, 데이터 손실 0).
- `supplierId` DROP NOT NULL → 기존 행 supplierId **그대로 유지**(non-null). 신규 retail 만 null 허용.
- 백필 불필요(pre-service). 운영 주문 데이터 영향 없음.

## 7. 기존 dropshipping / createOrder 영향

- **회귀 없음.** migration 은 제약 **완화(relax)** + 컬럼 **추가**만. 기존 동작 변경 없음.
- `checkoutService.createOrder` 실사용 호출처: `controllers/checkout/checkoutController.ts:110`(소비자 체크아웃), `routes/kpa/services/event-offer.service.ts:701`(KPA 이벤트 오퍼) — 모두 supplierId 공급 → 변동 없음.
- supplierId 조회(`checkout.service.ts:421` `order.supplierId = :supplierId`): 기존 행 non-null 유지 → 결과 불변. null 행은 supplier 필터에 미매칭(정상). 인덱스는 null 허용.
- entity `orderType` 매핑은 **컬럼 생성 후** 추가해야 안전(본 migration 적용 후 구현 WO 에서).

## 8. metadata.serviceKey vs order_type 장기 역할 분담 (권고)

- **조회/집계/스코프 1차 기준: `metadata.serviceKey`** (현 store-summary/list/detail 이미 사용 — 변경 없음, 회귀 0).
- **`order_type`: 주문 유형 분류 보조 + 계약 정합**(GENERIC/DROPSHIPPING/RETAIL계열). 신규 주문은 둘 다 기록(serviceKey + order_type).
- 장기적으로 order_type 으로 스코프 일원화는 별도 표준 WO(`...STATUS-MAPPING-STANDARD`)에서 결정.

## 9. K-Cosmetics, GlycoPharm, LMS 에 필요한 최소 schema 변경

- 본 2건(order_type ADD + supplierId nullable)으로 **3 서비스 retail/비-supplier 주문 모두 수용 가능**(공통).
- 서비스별 추가 컬럼 불필요(channel/storeId/serviceKey 는 metadata 사용).

## 10. K-Cosmetics create/payment 구현 재개 조건

1. 본 migration 설계 **승인**.
2. migration 작성·배포(`o4o-api-migrations` job) 성공 + `migration:show` 확인.
3. `checkout_orders` 에 order_type 컬럼 존재 + supplierId nullable 확인.
4. → 그 후 `WO-O4O-CHECKOUT-SERVICE-RETAIL-CHANNEL-SUPPORT-V1` 권장안(B+C)으로 create/payment 구현 재개 (supplier=null, order_type=COSMETICS, metadata.serviceKey/channel 보존).

## 11. DB write 승인 필요 여부

- **필요(YES)** — `ALTER TABLE ADD COLUMN` + `ALTER COLUMN DROP NOT NULL` + `CREATE TYPE/INDEX`. 단 **마이그레이션 코드 작성 → CI/CD `o4o-api-migrations` job 자동 실행** 원칙(수동 DDL 금지). 본 WO 는 **설계까지만**, 실제 migration 작성/배포는 **별도 승인 후**.

## 12. 하지 않은 것
- DB write·migration 작성·코드 수정·sentinel(`__RETAIL__`)·`supplierId=sellerId`·계약 변경·glyco/lms 수정: **전부 안 함**.
- 산출물 = 본 문서 1건. 1차 list/detail PASS 불변.

## 13. 최종 판정: **READY FOR MIGRATION APPROVAL**
- drift 원인·영향·비파괴 migration 설계 확정. 승인 시 migration 작성 WO(`...SCHEMA-ALIGNMENT` 구현분) 또는 본 WO 의 구현 단계로 진행.
