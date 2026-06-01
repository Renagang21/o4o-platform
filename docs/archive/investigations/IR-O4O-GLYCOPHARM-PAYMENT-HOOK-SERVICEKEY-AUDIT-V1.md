# IR-O4O-GLYCOPHARM-PAYMENT-HOOK-SERVICEKEY-AUDIT-V1

> **상태**: Read-only 조사 IR. 코드 / DB / migration / seed / route / menu / guard / safe-fallback / 결제 hook / checkout controller 변경 없음. 커밋·푸시 사용자 확인 후.
> **모티브 commit**: `e3a458780` (Track C 완료 보고서) 의 "별도 후속 발견 B" — payment hook 의 `opl.service_key = 'kpa'` 의심 패턴
> **선행 IR/WO 체인**:
> 1. `cafe2aa31` IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1
> 2. `8ccb79f55` WO safe-fallback
> 3. `95077c7b7` IR schema diff
> 4. `682ac6a85` WO Track A KPI
> 5. `05d73d661` WO Track B K-Cos action queue
> 6. `e3a458780` WO Track C GlycoPharm sales limit (본 IR 의 모티브)
> **작성일**: 2026-05-31
> **범위**: `apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts:208` 의 `opl.service_key = 'kpa'` literal 의 의도성 / 위험도 확정.

---

## 1. 전체 판정

**판정: NEEDS WORK / 위험도: HIGH (즉시 WO 필요, fix 방향 1단계 정책 확정 후)**

| 질문 | 답변 |
|---|---|
| `opl.service_key = 'kpa'` 는 의도된 공통 매핑인가? | **NO — 명백한 잔재 bug.** KPA payment handler 에서 copy 된 후 service_key literal 업데이트 누락. |
| GlycoPharm payment hook 에서 올바른 serviceKey 는? | **`'glycopharm'`** (canonical, KPA 의 `'kpa-society'` 와 평행). 단, event-offer 통한 OPL 은 `'glycopharm-event-offer'` — fix 방향 결정 필요. |
| 결제 hook 흐름에 미치는 영향? | **CRITICAL — sales_limit validation silent skip.** GlycoPharm 의 모든 payment.confirmed 흐름에서 sales_limit 검증이 완전 우회됨 (production 영향 확인 필요). |
| 즉시 WO 필요? | **YES.** 단, "단일 key 치환 vs IN list" 1단계 정책 결정 사전 필요. |

### 핵심 결론 한 줄

> GlycoPharm payment hook 의 `service_key = 'kpa'` literal 은 **2026-02-16 도입 시점 KPA copy 의 미정렬 잔재** — 이후 KPA 정규화 migration (`20260411300000-NormalizeKpaServiceKeys.ts` 'kpa' → 'kpa-society') 도 적용 누락, **그 결과 production 의 모든 GlycoPharm payment.confirmed 이벤트에서 sales_limit 사후 검증이 0 rows → silent skip → 무효 (실질적 sales_limit hardening 부재)** 상태로 추정. checkout 트랜잭션 내 sales_limit 는 정상 동작 (FOR UPDATE), 그러나 payment confirmed 후 재검증은 무력화.

---

## 2. 핵심 결론

| 항목 | 결론 |
|---|---|
| 'kpa' literal 의도성 | **사고 (typo / migration 누락).** 2026-02-16 `73948d30e` 도입 commit 이 KPA handler 패턴을 GlycoPharm 으로 copy 하면서 service_key filter 만 업데이트 누락. |
| 같은 파일/도메인의 다른 query 와 정합? | **불일치.** [checkout.controller.ts:379, 413](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts#L379) 는 `'kpa-society'` 사용 (체크아웃 트랜잭션). 동일 organization_product_listings 테이블 + 동일 organization_id 인데 다른 service_key literal — 명백한 drift. |
| 정규화 migration 영향 | `20260411300000-NormalizeKpaServiceKeys.ts` 가 production 의 'kpa' → 'kpa-society' 일괄 변환. payment hook 의 'kpa' literal 은 그 migration 이후 production 에서 **항상 0 rows 반환**. |
| 빈 결과 처리 | [line 214](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts#L214) `if (channelMappings.length === 0) return null;` — 메서드 종료, `limitExceeded` falsy, **주문 PAID 진행, validation 우회**. silent skip. |
| Track C 작업으로 영향? | **무관.** Track C (e3a458780) 는 sales_limit 의 actual count query (legacy ecommerce_orders → checkout_orders) 만 정렬. 본 line 208 의 channelMappings prerequisite query 는 별도 영역. |
| 사용자 신뢰 영향 | **잠재 영향 큼** — 결제 완료된 주문이 sales_limit 정책에 어긋날 수 있으나 cancellation 트리거 안 됨. 단, **checkout 단계에서 1차 검증 통과한 주문만 payment.confirmed 진입** — checkout 단계 lock 으로 cross-request race 는 1차 차단. 본 hook 은 race-after-checkout safety net 이고 그 net 이 무력화된 상태. |

---

## 3. 코드 흐름 분석

### 3-1. payment.confirmed 이벤트 흐름

[GlycopharmPaymentEventHandler.ts](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts) 의 entry:

```
paymentEventHub.onPaymentCompleted(handlePaymentCompleted.bind(this), 'glycopharm')
  ↓
handlePaymentCompleted(event)  [line 67]
  ↓ try
processPaymentCompleted(event)  [line 106]
  ↓
checkSalesLimitBeforePaid(order)  [line 144] ← 본 IR 대상
  ↓
  1. order.metadata.{ channelId, pharmacyId } 읽기
  2. order items 조회 (EcommerceOrderItem)
  3. ⚠️ **channelMappings 조회 query (line 202-212) — opl.service_key = 'kpa' 잔재 위치**
  4. if (channelMappings.length === 0) return null;  ← silent skip
  5. limitMap 구성 + for each item validateSalesLimit
  6. soldResult 계산 (Track C 에서 checkout_orders JSONB 로 정렬됨)
  7. if exceeded: return { productId, salesLimit, currentSold, quantity }
  ↓
processPaymentCompleted 가 limitExceeded 받으면:
  ↓
  order.status = CANCELLED, paymentStatus = FAILED
  orderRepository.save(order)
  return { action: 'updated', reason: 'sales_limit exceeded at confirm' }
```

### 3-2. 빈 결과 / 오류 처리

- **0 rows return**: [line 214](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts#L214) `if (channelMappings.length === 0) return null;`. checkSalesLimitBeforePaid 가 null 반환 → `limitExceeded` falsy → 검증 통과 → 주문 PAID 진행. **silent skip**.
- **Query throw (PG 에러)**: try/catch 가 `handlePaymentCompleted` outer 에 있음. 에러 시 logger.error, return 없이 throw — order 는 PENDING_PAYMENT 잔존 (자동 retry 없음). PG 42P01 같은 명확한 에러는 silent skip 과 구분 가능.
- **현 시점**: 'kpa' literal + production 정규화 = 0 rows = silent skip. 에러 패턴이 아니므로 stderr / Cloud Run log 에 흔적 0건 (조용히 우회됨).

### 3-3. checkout vs payment hook 의 query 비교 (DECISIVE EVIDENCE)

**Checkout 트랜잭션 (정상)** — [checkout.controller.ts:413](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts#L413):
```sql
WHERE opc.channel_id = $1
  AND opl.organization_id = $2
  AND opl.service_key = 'kpa-society'   -- ← canonical 정렬됨
  AND opl.is_active = true
  AND opc.is_active = true
  AND oc.status = 'APPROVED'
```

**Payment hook (잔재)** — [GlycopharmPaymentEventHandler.ts:208](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts#L208):
```sql
WHERE opc.channel_id = $1
  AND opl.organization_id = $2
  AND opl.service_key = 'kpa'           -- ← 잔재 / 정규화 누락
  AND opc.is_active = true
  AND opc.sales_limit IS NOT NULL
```

→ **동일 트랜잭션 시작점·종점인 두 query 가 다른 service_key literal 사용.** 정합 위배.

---

## 4. serviceKey 사용 비교표

### 4-1. organization_product_listings.service_key 매트릭스

| 도메인 | listing 생성 시점 | 저장되는 service_key | listing 조회 시점 (정상) | listing 조회 시점 (잔재 발견) |
|---|---|---|---|---|
| **KPA 매장 등록** | operator approval (product-applications) | `'kpa-society'` (default 'kpa' → migration 'kpa-society' 정규화 완료) | KPA checkout: `'kpa-society'` ✅ / KPA storefront: `'kpa-society'` ✅ | — |
| **KPA Event Offer** (supplier proposal) | event-offer.service.createListing | `'kpa-groupbuy'` | KPA event-offer queue: `'kpa-groupbuy'` ✅ | — |
| **GlycoPharm 매장 등록** | auto-listing.utils (org_service_enrollments expansion) | `'glycopharm'` | GlycoPharm storefront: `'kpa-society'` ⚠️ / GlycoPharm checkout: `'kpa-society'` ⚠️ / GlycoPharm payment hook: `'kpa'` ❌ | **여기 정렬 가능성** — Agent 2 보고에 따르면 GlycoPharm 의 checkout / storefront 의 `'kpa-society'` 도 동일 잔재 가능성 있음 (별도 확인 권장) |
| **GlycoPharm Event Offer** (Neture supplier proposal) | event-offer.service.createListing via TARGET_TO_EVENT_OFFER_KEY | `'glycopharm-event-offer'` | (Track C 의 sales_limit count query — `'glycopharm'` filter — Event Offer OPL 미포함) | — |
| **K-Cosmetics** | auto-listing.utils | `'k-cosmetics'` | K-Cos checkout / storefront: 별도 확인 미수행 (본 IR 범위 외) | — |

### 4-2. 본 IR 대상 query 의 정렬 시 가능한 fix 방향

**Option α (단일 key 치환)**: `'kpa'` → `'glycopharm'`
- 가정: GlycoPharm 매장 등록 listings 의 service_key 가 `'glycopharm'` 임 (Agent 2 분석 기준 — auto-listing.utils 에서 org_service_enrollments.service_code 사용)
- 결과: GlycoPharm 매장 등록 product 의 channel mapping 만 sales_limit 검증 대상.
- **검증 필요**: 실제 production OPL row 의 service_key 분포 (DB audit) — 본 IR 의 read-only 범위 외, 별도 audit 권장.

**Option β (IN list — 매장 + event-offer 통합)**: `service_key IN ('glycopharm', 'glycopharm-event-offer')`
- Event Offer 통해 등록된 listing 도 sales_limit 검증 대상에 포함.
- Track A 의 KPI query / Track B / Track C 의 paid count query 와도 의미 정합 (event-offer 도 매출/주문 인정).
- 권장 fix 방향 — Agent 2 명시.

**Option γ (Mapping helper)**: `TARGET_TO_EVENT_OFFER_KEY` 활용한 동적 도출
- 과도. 본 hook 영역에서는 hardcoded literal 이 더 명료.

### 4-3. ⚠️ 추가 의심 발견 — 본 IR 범위 외 (별도 audit 권장)

Agent 1 분석 결과:
- [glycopharm/controllers/checkout.controller.ts:379, 413](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts) 가 `service_key = 'kpa-society'` 사용
- [glycopharm/controllers/store.controller.ts:116, 153, 271](apps/api-server/src/routes/glycopharm/controllers/store.controller.ts) 도 `'kpa-society'` 사용

이는 **payment hook 의 'kpa' 만큼 단순한 잔재가 아니라 의도된 KPA-shared registry 일 가능성** 있음. GlycoPharm 매장이 KPA 의 organization_product_listings registry 를 공유한다는 historical 설계가 있을 수 있음. 본 IR 의 'kpa' 잔재 fix 와 함께 정합성 광역 audit 필요. **별도 IR 후보**: `IR-O4O-ORGANIZATION-PRODUCT-LISTINGS-SERVICEKEY-CROSSSERVICE-AUDIT-V1` (사용자 안내 그대로).

---

## 5. 관련 테이블 / Entity / Seed / Migration 확인

### 5-1. organization_product_listings entity

[entities/organization-product-listing.entity.ts:38](apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts#L38):
```typescript
@Column({ type: 'varchar', length: 50, default: 'kpa' })
service_key: string;
```

- VARCHAR(50) NOT NULL, default `'kpa'` (legacy default — 새 row 가 명시적으로 set 안 하면 'kpa' 저장됨).
- 인덱스: org_id + service_key + external_product_id unique constraint.

### 5-2. 마이그레이션

**CREATE TABLE** ([20260215000021-CreateOrganizationProductListings.ts](apps/api-server/src/database/migrations/20260215000021-CreateOrganizationProductListings.ts)):
- `service_key VARCHAR(50) NOT NULL DEFAULT 'kpa'`
- 본 default 가 entity 와 일치.

**NORMALIZE** (`20260411300000-NormalizeKpaServiceKeys.ts`):
- production 의 `service_key = 'kpa'` 인 모든 row 를 `'kpa-society'` 로 일괄 UPDATE.
- 본 migration 이후 production OPL 의 `service_key = 'kpa'` row 는 정상 흐름에서 0건이어야 함.
- **즉**: payment hook 의 `WHERE opl.service_key = 'kpa'` 는 본 정규화 이후 production 에서 항상 0 rows 반환.

### 5-3. WRITE site 별 service_key 값

Agent 2 매트릭스:

| 위치 | line | 저장 값 |
|---|---|---|
| `auto-listing.utils.ts` | 34-49 | `ose.service_code` (organization_service_enrollments 의 service_code) |
| `auto-listing.utils.ts` | 125-143 | `$2` 파라미터 |
| `kpa/services/event-offer.service.ts` | 870-877 | `$2` 파라미터 — KPA 'kpa-groupbuy' / GlycoPharm 'glycopharm-event-offer' / K-Cos 'k-cosmetics-event-offer' |
| `kpa/controllers/operator-product-applications.controller.ts` | 166-176 | `approval.service_key \|\| 'kpa-society'` |
| `o4o-store/controllers/store-product-library.controller.ts` | 242-245 | 호출자 인자 |
| `controllers/market-trial/marketTrialOperatorController.ts` | 1166-1169 | `'neture'` (hardcoded) |

→ GlycoPharm 매장 등록 시 `auto-listing.utils` 가 `organization_service_enrollments.service_code = 'glycopharm'` 을 사용 → OPL.service_key = **`'glycopharm'`** 저장. **'kpa' 가 아님**.

### 5-4. Git history of suspect literal

`git log --oneline -- apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts` 출력:
- `e3a458780` (2026-05-31) — Track C, sales_limit JSONB 정렬. 본 'kpa' literal 미수정, commit message 에 별도 audit 필요 명시.
- `73948d30e` (2026-02-16) — WO O4O Retail Stable v1.0 — payment core + sales limit hardening. **이 commit 이 파일 신규 생성 + 'kpa' literal 최초 도입**.

→ 'kpa' literal 은 **2026-02-16 이후 4 commits 동안 production 에 잔존**. 그 사이 (2026-04-11) 정규화 migration 실행 — payment hook query 가 더 이상 데이터 매칭 안 됨.

---

## 6. 위험도 분류

### 6-1. 본 IR 의 종합 위험도: **HIGH**

| 영향 | 분류 | 근거 |
|---|---|---|
| 사용자 영향 | HIGH | sales_limit (재고 한도 / 시간대 한도 / 1인 한도 등 매장 정책) 미적용 → 정책 위반 주문이 PAID 처리되어 사용자에게 무효 / 환불 트리거 가능 |
| 결제 영향 | HIGH | payment.confirmed 단계의 정책 enforcement layer 가 완전 우회. checkout 단계 lock 은 정상 동작이나 race-after-checkout safety net 무력화. |
| 재고/sales_limit 영향 | CRITICAL | 본 hook 의 raison d'être 가 sales_limit 사후 검증. 그 검증이 0 rows 반환 = silent skip = 무력화. |
| 정산/후속 처리 | MEDIUM | sales_limit 위반 주문이 PAID 진행 후 발견될 경우 manual cancel + refund 필요 — 운영자 부담 + 사용자 신뢰. |
| Track A/B/C 정렬 작업과의 관계 | NONE | Track A/B/C 는 sales_limit 의 actual count 또는 KPI 정렬. 본 IR 은 prerequisite mapping query 의 잔재. 독립. |
| Cross-service 위험 | LOW | 본 query 가 우발적으로 KPA 의 organization_product_listings 를 조회해도 `opl.organization_id = $2` 가 GlycoPharm pharmacy.id 로 격리 — KPA 매장 listing 까지 절대 못 봄. silent skip 만 발생. |

### 6-2. Production 영향 발생 시점 추정

- **2026-02-16 ~ 2026-04-10**: 'kpa' literal 도입 ~ 정규화 migration 직전. 이 시점에는 entity default 가 'kpa' 였으므로 GlycoPharm 매장 listing 의 service_key 가 'kpa' 였을 가능성 — payment hook 이 정상 동작했을 수 있음.
- **2026-04-11 ~ 현재 (2026-05-31)**: 정규화 migration 이후. 모든 'kpa' → 'kpa-society'. payment hook query 0 rows. silent skip 시작.

→ **약 50일간 production sales_limit 사후 검증 무력화** 상태로 추정. 실제 sales_limit 위반 발생 건수 / 영향은 production DB audit 필요.

---

## 7. 권장 후속 작업

### 7-A. 즉시 가능한 WO (사용자 안내 그대로)

**`WO-O4O-GLYCOPHARM-PAYMENT-HOOK-SERVICEKEY-FIX-V1`**

**범위**: GlycopharmPaymentEventHandler.ts:208 의 single literal 정렬 (1 파일 변경).

**Fix 방향 (사전 정책 결정)**:
- **Option α** (보수적): `'kpa'` → `'glycopharm'`. 매장 등록 product 만 검증.
- **Option β** (권장): `service_key IN ('glycopharm', 'glycopharm-event-offer')`. 매장 등록 + Event Offer 통한 listing 모두 검증. Track C 의 paid count query 와 의미 정합.

**전제 검증** (사용자 권장):
- production DB audit: `SELECT service_key, COUNT(*) FROM organization_product_listings WHERE organization_id IN (SELECT id FROM organizations o JOIN organization_service_enrollments ose ON ose.organization_id = o.id WHERE ose.service_code = 'glycopharm') GROUP BY service_key`
- 결과로 GlycoPharm 매장의 실제 OPL service_key 분포 확인 후 Option α / β 확정.

### 7-B. 추가 IR 후보 (분리)

**`IR-O4O-ORGANIZATION-PRODUCT-LISTINGS-SERVICEKEY-CROSSSERVICE-AUDIT-V1`** (Agent 1 § D 추가 발견 기반):
- glycopharm/controllers/checkout.controller.ts 의 `'kpa-society'` literal (line 379, 413) 도 잔재인지 KPA-shared 의도인지 확정
- glycopharm/controllers/store.controller.ts 의 `'kpa-society'` literal (line 116, 153, 271) 도 동일 audit
- 가능성: GlycoPharm 매장이 KPA 의 organization_product_listings registry 를 공유한다는 historical 설계 vs Track C-style 단순 정렬 필요
- 본 IR 의 즉시 fix 와 분리 — 광역 audit

### 7-C. 데이터 audit 필요 여부

**YES — production DB audit 필수** (Cloud Run + Cloud SQL Admin):

1. `SELECT service_key, COUNT(*) FROM organization_product_listings GROUP BY service_key` — 전체 분포
2. 특히: GlycoPharm 매장 (organization_id IN GlycoPharm enrollments) 의 OPL service_key 분포
3. 만약 분포가 `'glycopharm'` + `'glycopharm-event-offer'` 인 경우 → Option β 권장
4. 만약 `'kpa-society'` 도 섞여 있다면 → 추가 IR §7-B 의 광역 audit 우선

### 7-D. 조치 불필요 (NO — 본 IR 결과로 조치 필수)

- 본 IR 의 결론: 'kpa' literal 은 명백한 잔재. 조치 불필요 분류 해당 없음.

---

## 8. Current Structure vs O4O Philosophy Conflict Check

### 8-1. "serviceKey 기준 서비스 경계 명확화"

❌ **명백한 충돌**. payment hook 의 'kpa' literal 이 GlycoPharm 도메인 안에서 KPA 도메인 키를 참조. 서비스 경계 위반. 다만 organization_id 격리로 cross-service data leak 은 발생 안 함 (silent skip 만 발생).

### 8-2. "공통 capability 와 service-specific data scope 분리"

⚠️ **잠재 충돌** (§7-B 의 광역 audit 결과에 따라 달라짐).
- payment hook 의 'kpa' literal 자체는 명백한 분리 위반.
- 단, GlycoPharm checkout / storefront 의 `'kpa-society'` literal 들이 의도된 shared registry 라면 — 서비스 경계가 organization_product_listings 차원에서 부분 공유되도록 설계된 historical 패턴일 가능성. 별도 audit 후 결정.

### 8-3. "결제/주문/재고/정산 silent failure 금지"

❌ **명백한 충돌**. 본 IR 의 핵심 문제. sales_limit 사후 검증이 silent skip — 정책 enforcement layer 가 production 에서 무력화. philosophy 직접 위반.

### 8-4. "GlycoPharm 의 KPA serviceKey 사용은 명확한 근거 필요"

❌ **충돌**. 코드 / 주석 / WO marker 모두에서 'kpa' literal 의 사용 근거 0건. 도입 commit (73948d30e) message 가 의도성을 언급하지 않음. 명백한 잔재.

### 8-5. "Store capability 공통화 + service-specific data scope 분리"

⚠️ **부분 충돌**. 본 IR 의 직접 fix 영역은 service-specific layer (payment hook). 다만 §7-B 의 광역 audit 결과가 organization_product_listings 의 cross-service 공유 패턴을 확인하면, capability 공통화 영역이 데이터 SSOT 분리 부재 상태일 수 있음.

### 8-6. 충돌 요약 + 최소 수정 방향

| 원칙 | 충돌 |
|---|---|
| serviceKey 경계 명확화 | ❌ |
| service-specific data scope | ⚠️ (광역 audit 후 확정) |
| **silent failure 금지** | ❌ **명백 — 본 IR 핵심** |
| KPA serviceKey 사용 근거 | ❌ |
| Store capability 공통화 + SSOT | ⚠️ |

**최소 수정 방향**:
- 단기 (1 WO): `WO-O4O-GLYCOPHARM-PAYMENT-HOOK-SERVICEKEY-FIX-V1` — Option β 권장, 사전 DB audit 후 확정.
- 중기 (1 IR): `IR-O4O-ORGANIZATION-PRODUCT-LISTINGS-SERVICEKEY-CROSSSERVICE-AUDIT-V1` — checkout / storefront 의 'kpa-society' literal 정합 audit.
- 즉시 사용자 결정: production sales_limit 위반 backfill audit 필요 여부 (지난 50일간).

---

## 부록 A. 핵심 파일 인덱스

| 항목 | 파일 |
|---|---|
| **본 IR 대상 잔재** | [apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts](apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts#L208) (line 208) |
| 본 IR 의 모티브 — Track C commit message | `e3a458780` |
| Checkout 트랜잭션 (정상 `'kpa-society'`) | [apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts#L379-L413) (line 379, 413) |
| Storefront (추가 audit 후보 `'kpa-society'`) | [apps/api-server/src/routes/glycopharm/controllers/store.controller.ts](apps/api-server/src/routes/glycopharm/controllers/store.controller.ts) (line 116, 153, 271) |
| OPL entity (default `'kpa'`) | [apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts](apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts#L38) (line 38) |
| OPL CREATE TABLE migration | [apps/api-server/src/database/migrations/20260215000021-CreateOrganizationProductListings.ts](apps/api-server/src/database/migrations/20260215000021-CreateOrganizationProductListings.ts) |
| 정규화 migration (`'kpa'` → `'kpa-society'`) | `apps/api-server/src/database/migrations/20260411300000-NormalizeKpaServiceKeys.ts` |
| Auto-listing utils (write site — uses `ose.service_code`) | [apps/api-server/src/utils/auto-listing.utils.ts](apps/api-server/src/utils/auto-listing.utils.ts) (line 34-49, 81-98, 125-192) |
| KPA event-offer service (write site — 'kpa-groupbuy' / 'glycopharm-event-offer') | [apps/api-server/src/routes/kpa/services/event-offer.service.ts](apps/api-server/src/routes/kpa/services/event-offer.service.ts) (line 870-877) |
| TARGET_TO_EVENT_OFFER_KEY constant | [apps/api-server/src/constants/event-offer-service-mapping.ts](apps/api-server/src/constants/event-offer-service-mapping.ts) |
| KPA reference (정상 `'kpa-society'` checkout) | [apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L373) (line 373) |

## 부록 B. 검증 결과 요약

| 검증 질문 | 답변 |
|---|---|
| `opl.service_key = 'kpa'` 가 active query 인가? | **YES** — payment.confirmed 이벤트마다 실행 |
| Query 목적 | sales_limit 사후 검증의 prerequisite — channel mapping 조회 |
| `'kpa'` 가 의도된 값인가? | **NO** — 명백한 잔재 (2026-02-16 KPA copy 후 미정렬, 2026-04-11 정규화 migration 누락) |
| GlycoPharm 의 올바른 serviceKey | `'glycopharm'` (매장 등록) + `'glycopharm-event-offer'` (Event Offer 통한 listing) — 둘 다 포함 권장 (Option β) |
| Silent skip 발생? | **YES** — channelMappings.length === 0 → return null → 주문 PAID 진행. sales_limit 사후 검증 완전 우회. |
| Sales limit 정렬과 직접 연결? | **NO** — Track C 가 정렬한 sold count query 와는 별도 영역. 본 query 는 그 검증을 호출할지 결정하는 prerequisite. |
| 즉시 WO 필요? | **YES** — Option β 권장. 단, production DB audit (실제 OPL service_key 분포) 후 확정. |

---

*IR 종료. 본 IR 은 read-only. 코드 / DB / migration / seed / route / menu / guard / safe-fallback / 결제 hook / checkout controller 변경 없음. 다음 단계는 §7-A 의 WO 후보 + §7-C 의 production DB audit 권장 — 사용자 정책 판정 후 진행.*
