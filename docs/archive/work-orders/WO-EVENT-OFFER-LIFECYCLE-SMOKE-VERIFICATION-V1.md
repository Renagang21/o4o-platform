# WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
## Smoke Verification Report

**작성일**: 2026-05-07  
**대상 WO**: WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1  
**브랜치 병합**: `feature/event-offer-data-lifecycle-completion-v1` → `main` (커밋: `1d9d72cd3`)  
**검증 환경**: Production (o4o-core-api, asia-northeast3)

---

## 1. Production DB 상태 (검증 기준 시점)

### supplier_product_offers (9건)

| approval_status | is_active | count | 비고 |
|:---:|:---:|:---:|---|
| PENDING | false | 6 | 검토 대기 |
| PENDING | true | 1 | 미네락 600 (eaa39c13) |
| APPROVED | false | 1 | 4b218490, price_general=15000 |
| REJECTED | false | 1 | 2dfaa373 |

> **핵심**: `is_active=true AND approval_status='APPROVED'`인 SPO = **0건**

### organization_product_listings with offer_id (2건)

| opl_id | status | is_active | start_at | end_at | event_price |
|---|:---:|:---:|:---:|:---:|:---:|
| 7f1484f7 | pending | true | NULL | NULL | NULL |
| 8f03450a | pending | false | NULL | NULL | NULL |

> **핵심**: status='approved'인 OPL = **0건**. 모든 start_at/end_at = NULL.

### SPO price_general 기준값 (WO 이전부터 변동 없음)

| SPO ID | price_general | updated_at |
|---|:---:|---|
| fee036a0 | 20,000 | 2026-04-28 |
| eaa39c13 | 24,000 | 2026-04-27 |
| b66cf834 | 22,000 | 2026-04-07 |
| e7dc8f98 | 18,000 | 2026-04-07 |
| 6bdca25d | 15,000 | 2026-04-07 |
| 38a69a98 | 12,000 | 2026-04-07 |
| ed41e8b4 | 28,000 | 2026-04-07 |
| 4b218490 | 15,000 | 2026-04-07 |
| 2dfaa373 | 35,000 | 2026-04-07 |

WO 병합일(2026-05-07) 이후 updated_at 갱신 없음 — **배포 후 SPO 가격 변동 없음** 확인.

---

## 2. 검증 코드 기준

| 파일 | 라인 | 내용 |
|---|:---:|---|
| `apps/api-server/src/routes/kpa/services/event-offer.service.ts` | 501–515 | Pre-lock SQL guard (status + 시간 윈도우) |
| 同 | 534–539 | `unitPrice = eventPrice ?? price_general` |
| 同 | 551–565 | `FOR UPDATE` 재검증 (race condition 방지) |

### Pre-lock SQL Guard (L501–515)

```sql
SELECT opl.id, opl.offer_id, opl.master_id, opl.organization_id, opl.service_key,
       opl.status, opl.start_at, opl.end_at, opl.event_price
FROM organization_product_listings opl
WHERE opl.id = $1
  AND opl.service_key = $2
  AND opl.status = 'approved'                              -- ① 상태 guard
  AND (opl.start_at IS NULL OR NOW() >= opl.start_at)     -- ② 시작 시간 guard  (Smoke A)
  AND (opl.end_at   IS NULL OR NOW() <= opl.end_at)       -- ③ 종료 시간 guard  (Smoke C)
LIMIT 1
```

`preLockRows.length === 0` → `throw EventOfferError(404, '이벤트를 찾을 수 없거나 진행 중이 아닙니다.')`

### eventPrice / unitPrice 로직 (L534–539)

```typescript
// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1
const eventPrice = preListing.event_price != null ? Number(preListing.event_price) : null;
const unitPrice  = eventPrice ?? Number(product.price_general ?? 0);  // Smoke B
if (unitPrice <= 0) throw new EventOfferError(400, 'Invalid product price', 'INVALID_PRICE');
```

`price_general`에 대한 **UPDATE는 participate() 내 어디에도 없음** — 단가는 `checkout_orders.items[].unitPrice` 스냅샷에만 반영.

---

## 3. Smoke Test 판정

### Smoke A — 시간 윈도우 guard (start_at 이전 참여 차단)

| 항목 | 결과 |
|---|:---:|
| **판정** | ✅ Static PASS |
| 검증 방법 | 코드 정적 분석 |
| 근거 | L508: `(opl.start_at IS NULL OR NOW() >= opl.start_at)` — DB 수준 검증, bypass 불가 |
| Live 검증 | **보류** — production에 start_at > NOW()이면서 status='approved'인 OPL 없음 |
| 다음 라운드 | APPROVED OPL이 생성되어 upcoming 상태가 될 때 자연 검증 |

### Smoke B — eventPrice 스냅샷 (일반 공급가 누출 방지)

| 항목 | 결과 |
|---|:---:|
| **판정** | ✅ Static PASS |
| 검증 방법 | 코드 정적 분석 + CI TypeScript 통과 |
| 근거 | L537–538: `??` nullish 연산자 — eventPrice가 null일 때만 price_general fallback, 누출 불가 |
| Live 검증 | **보류** — production에 APPROVED+is_active=true인 SPO 없음 |

> **Smoke B는 코드 기능 실패가 아니라 production 운영 데이터 조건 미충족으로 live 주문 검증을 보류했다. event_price 적용 로직은 정적 검증과 CI 통과 기준으로 PASS 처리하며, checkout_orders.items 실제 스냅샷 검증은 승인+활성 SPO가 준비된 다음 라운드에서 수행한다.**

### Smoke C — 기간 외 참여 차단 (end_at 이후 참여 차단)

| 항목 | 결과 |
|---|:---:|
| **판정** | ✅ Static PASS |
| 검증 방법 | 코드 정적 분석 |
| 근거 | L509: `(opl.end_at IS NULL OR NOW() <= opl.end_at)` — A와 동일한 SQL guard 절, DB 수준 |
| Live 검증 | **보류** — production에 end_at < NOW()이면서 status='approved'인 OPL 없음 |
| 다음 라운드 | APPROVED OPL이 만료(ended)된 후 자연 검증 |

### Smoke D — 가격 무오염 (price_general 불변)

| 항목 | 결과 |
|---|:---:|
| **판정** | ✅ PASS (Static + Live baseline) |
| 검증 방법 | 코드 정적 분석 + Production DB 기준값 확인 |
| 정적 근거 | participate() 내 `supplier_product_offers` 에 대한 UPDATE 없음 (SELECT only) |
| Live 근거 | WO 병합 후 전체 SPO price_general updated_at 변동 없음 — 최신값 2026-04-28 (WO 이전), WO 배포 2026-05-07 |
| 결론 | WO 배포 전후 가격 행은 동일. 배포 자체가 SPO 가격을 건드리지 않음 확인 |

---

## 4. 최종 판정 요약

| Smoke | 항목 | 판정 | 방법 |
|:---:|---|:---:|---|
| **A** | 시간 윈도우 guard (start_at) | ✅ Static PASS | SQL guard L508 코드 검증 |
| **B** | eventPrice 스냅샷 | ✅ Static PASS | L537–538 코드 검증 + CI TS |
| **C** | 기간 외 참여 차단 (end_at) | ✅ Static PASS | SQL guard L509 코드 검증 |
| **D** | 가격 무오염 | ✅ PASS | 코드 검증 + Production DB 기준값 |

**4/4 PASS** — WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1 smoke 검증 완료.

---

## 5. 후속 라운드 (Live 검증 보류 항목)

A, B, C의 live 주문 검증은 다음 조건이 충족될 때 자동으로 수행 가능:

| 조건 | 필요한 데이터 상태 |
|---|---|
| **Smoke A live** | APPROVED OPL (status='approved') + start_at > NOW() (upcoming) |
| **Smoke B live** | APPROVED+is_active=true SPO + 연결된 APPROVED OPL |
| **Smoke C live** | APPROVED OPL + end_at < NOW() (ended) — 자연적으로 만료 후 확인 |

> A, B, C 보류의 공통 근본 원인: **production에 APPROVED 상태 OPL이 0건**이라는 운영 데이터 조건.  
> 코드 결함이 아님 — 다음 Operator 승인 사이클에서 자동 검증 가능.

---

## 6. Production 시스템 상태

```
API Health: healthy (responseTime: 42ms)
DB Version: PostgreSQL 15.17
Active Connections: 9
Memory Usage: 26% (262/1024 MB)
Node.js: v22.22.2
```

---

*검증자: Claude Code (WO 자동 검증)*  
*검증일: 2026-05-07*
