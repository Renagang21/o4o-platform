# IR-O4O-OPL-SERVICEKEY-CROSSSERVICE-CANONICALIZATION-AUDIT-V1

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `f2c772945` 시점 정적 코드 (read-only)  
**작업 성격**: read-only 조사 — 코드/UI/API/DB 수정 없음  
**선행**: GlycoPharm `WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1` 완료 (GLYCOPHARM_OPL_SERVICE_KEYS 상수화)

---

## 핵심 결론

**GlycoPharm 상수화 패턴(다중 OPL serviceKey IN → 배열 상수)은 KPA/K-Cosmetics에 그대로 필요하지 않다.**

| 서비스 | OPL 사용 | 다중 serviceKey gate | 판정 |
|--------|:---:|:---:|:---:|
| GlycoPharm | ✅ | ✅ `glycopharm` + `glycopharm-event-offer` 동일 gate | (완료) 상수화 정당 |
| **KPA** | ✅ | ❌ `kpa-society`(checkout) vs `kpa-groupbuy`(groupbuy) **다른 흐름** | **E + 미세 B** |
| **K-Cosmetics** | ❌ OPL 미사용 (cosmetics 전용 테이블) | — | **A (불필요)** |

- **KPA**: OPL serviceKey가 2종(`kpa-society`, `kpa-groupbuy`)이나 **서로 다른 도메인 흐름**에 단일로 쓰임 → GlycoPharm처럼 한 gate에서 IN으로 묶을 대상 아님. 대부분 이미 `= $n` parameter binding. checkout 1곳만 single literal(저위험 미세 정리 후보, 비필수).
- **K-Cosmetics**: `organization_product_listings` 미사용(cosmetics route/module 전체 0건) → OPL serviceKey drift 자체가 없음.

**판정: 추가 WO 대부분 불필요. KPA checkout single literal만 선택적 초저위험 정리 후보.**

---

## 1. GlycoPharm 기준 패턴 (선행 완료)

```
storefront/checkout/payment 동일 visibility gate에서:
  opl.service_key IN ('glycopharm', 'glycopharm-event-offer')
→ GLYCOPHARM_OPL_SERVICE_KEYS 배열 상수 + = ANY($n) parameter binding
```

상수화 정당성: **2개 serviceKey가 같은 gate를 공유**하므로 literal 중복 + 누락 위험 존재 → 배열 상수가 단일 출처 제공.

---

## 2. KPA 조사 결과

### OPL serviceKey 분포

| serviceKey | 용도 | 사용처 | 바인딩 |
|-----------|------|--------|:---:|
| `kpa-society` | 일반 storefront/checkout | `kpa-checkout.controller.ts` | ⚠️ L373 single literal |
| `kpa-groupbuy` | 공동구매/event-offer OPL | `supplier-offers.controller.ts`, `event-offer-operator.controller.ts` | ✅ `= $n` param binding |

### 핵심 구조 차이 (GlycoPharm 대비)

- GlycoPharm: `glycopharm` + `glycopharm-event-offer`가 **하나의 storefront/checkout gate**에서 함께 노출 → IN 묶음 필요
- KPA: `kpa-society`(일반 checkout)와 `kpa-groupbuy`(공동구매 별도 흐름)는 **서로 다른 컨트롤러/흐름** → 한 gate에서 IN으로 묶지 않음. 각 흐름이 자기 serviceKey 단일로 필터.

### literal vs parameter binding 현황

| 위치 | 패턴 | 평가 |
|------|------|:---:|
| `kpa-checkout.controller.ts:373` | `opl.service_key = 'kpa-society'` (single literal) | ⚠️ 미세 drift |
| `supplier-offers.controller.ts:148,204` | `opl.service_key = $2` | ✅ 양호 |
| `event-offer-operator.controller.ts:209` | `opl.service_key = $1` | ✅ 양호 |

**KPA는 이미 대부분 parameter binding 사용 중.** checkout L373 single literal은 GlycoPharm처럼 다중 키 IN이 아니라 단일 `kpa-society`이므로, 배열 상수화 실익 없음. 일관성 차원의 `= $n` 전환은 선택적(초저위험).

---

## 3. K-Cosmetics 조사 결과

```
grep organization_product_listings:
  apps/api-server/src/routes/cosmetics/   → 0건
  apps/api-server/src/modules/cosmetics/  → 0건
```

K-Cosmetics storefront/checkout는 **OPL을 사용하지 않는다.** cosmetics 전용 테이블(`cosmetics_products`, `cosmetics_store_listings`, `cosmetics-store.repository`)로 상품 노출을 처리.

`cosmetics-store.controller.ts`에 `organization_product_listings` / `service_key` 참조 0건.

**→ OPL serviceKey drift 자체가 존재하지 않음. 추가 작업 불필요.**

---

## 4. GlycoPharm 패턴 재사용 가능성

| 서비스 | GLYCOPHARM_OPL_SERVICE_KEYS 류 배열 상수 필요? |
|--------|:---:|
| KPA | ❌ 불필요 — 단일 serviceKey씩 다른 흐름, IN 묶음 대상 없음 |
| K-Cosmetics | ❌ 불필요 — OPL 미사용 |

GlycoPharm 패턴의 본질은 "**한 gate에서 여러 OPL serviceKey 허용**"이다. KPA/K-Cos는 이 조건에 해당하지 않으므로 패턴 재사용 불가/불필요.

---

## 5. serviceKey literal 사용처 요약 (OPL 한정)

| 서비스 | OPL literal | 정리 필요도 |
|--------|------------|:---:|
| KPA checkout | `'kpa-society'` 1곳 (single) | 선택적 초저위험 |
| KPA groupbuy/event-offer | `$n` param (양호) | 불필요 |
| K-Cosmetics | 없음 (OPL 미사용) | 불필요 |

> 주의: `service_memberships.service_key`(member.controller 등)의 `'kpa-society'`/`'kpa'` literal은 OPL이 아닌 **멤버십 도메인**이므로 본 조사 범위 외. OPL/storefront visibility gate literal만 대상으로 한정함.

---

## 6. 판정

| 서비스 | 판정 | 근거 |
|--------|:---:|------|
| **K-Cosmetics** | **A — 추가 작업 불필요** | OPL 미사용, drift 없음 |
| **KPA** | **E — 서비스별 의도 차이로 유지** (+ 미세 B 선택) | kpa-society/kpa-groupbuy 도메인 분리, 대부분 param binding. checkout single literal만 선택적 정리 가능 |

GlycoPharm처럼 **정책 결정(C)이나 보류(D)가 필요한 상황은 아니다.**

---

## 7. 후속 WO 후보

| WO | 범위 | 위험도 | 우선순위 |
|----|------|:---:|:---:|
| `WO-O4O-KPA-CHECKOUT-OPL-SERVICEKEY-PARAM-BINDING-V1` (선택) | kpa-checkout L373 `'kpa-society'` literal → `= $n` parameter binding (단일 키, 배열 상수 아님) | 초저위험 | 매우 낮음 (선택) |
| K-Cosmetics OPL WO | — | — | 불필요 |
| KPA 배열 상수화 WO | — | — | 불필요 (IN 묶음 대상 없음) |

**권고**: KPA checkout literal은 기능상 문제 없고 다중 키 IN이 아니므로 상수화 실익이 낮다. 일관성 강박으로 지금 정리할 필요는 없으며, kpa-checkout을 다른 사유로 수정할 때 함께 param binding으로 정리하면 충분.

---

## 8. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **OPL serviceKey drift가 매장 상품 노출 안정성을 해치는가** | KPA는 흐름별 단일 serviceKey로 명확 필터, K-Cos는 OPL 미사용. 노출 안정성 위협 없음. GlycoPharm 같은 다중 키 누락 위험 부재. | ✅ 안정 |
| **serviceKey constants가 O4O 공통 운영 안정성에 도움** | GlycoPharm은 다중 키 gate라 상수가 도움. KPA/K-Cos는 다중 키 gate 부재 → 상수 도입이 오히려 불필요 추상화. | ⚠️ 서비스별 상이 |
| **서비스별 노출 정책 차이를 상수화가 숨기는가** | KPA `kpa-society` vs `kpa-groupbuy`는 의도된 도메인 분리. 만약 배열로 묶으면 두 흐름 차이를 숨길 위험 → 묶지 않는 현재가 정책에 충실. | ✅ 분리 유지가 안전 |
| **Neture 공급자/운영자 책임과 서비스 storefront 책임 분리** | OPL은 Neture 공급(supplier_product_offers) → 서비스별 listing(serviceKey)으로 분기. KPA/K-Cos 각자 자기 serviceKey/테이블로 노출 — 책임 분리 유지. | ✅ |
| **지금 refactor가 1인 개발 속도에 과한가** | KPA single literal 1곳 정리는 가치 대비 즉시성 낮음. K-Cos는 대상 없음. 지금 refactor 불필요. | ✅ 보류 합리적 |

**결론**:
1. GlycoPharm 상수화는 "다중 OPL serviceKey가 한 gate를 공유"하는 특수 상황의 해법이었다.
2. KPA는 serviceKey별로 **다른 흐름**이라 그 상황에 해당하지 않으며, 대부분 이미 parameter binding이다.
3. K-Cosmetics는 OPL을 쓰지 않아 drift 자체가 없다.
4. **추가 상수화/WO는 대부분 불필요**하며, KPA checkout single literal만 선택적 초저위험 정리 후보로 남긴다.

---

## 코드 변경 없음 확인

이 IR에서 수정한 소스/DB/migration: **없음.**  
조사 파일:
- `apps/api-server/src/routes/kpa/controllers/{kpa-checkout,supplier-offers,event-offer-operator}.controller.ts`
- `apps/api-server/src/routes/cosmetics/controllers/cosmetics-store.controller.ts`
- `apps/api-server/src/routes/glycopharm/controllers/{store,checkout}.controller.ts` (기준 패턴)
- `apps/api-server/src/constants/service-keys.ts` (GLYCOPHARM_OPL_SERVICE_KEYS)

git status: 다른 세션 WIP 미접촉.

---

## 관련 선행 문서

- `WO-O4O-OPL-SERVICEKEY-CANONICAL-CONSTANTS-V1` (GlycoPharm 상수화)
- `CHECK-O4O-GLYCOPHARM-STOREFRONT-CHECKOUT-POST-OPL-CONSTANTS-V2` (GlycoPharm 운영 안정화)

---

*작성: Claude Code (2026-06-01)*  
*read-only 조사 — 코드/DB/source/migration 수정 없음*
