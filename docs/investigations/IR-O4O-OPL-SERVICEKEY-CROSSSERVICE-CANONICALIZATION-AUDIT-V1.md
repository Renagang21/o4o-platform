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

---

## Addendum — KPA kpa/kpa-society 이중키 gate 추가 발견 및 결론 보정

**추가 조사 일자**: 2026-06-01 (V1 본문 이후)
**성격**: read-only — 코드 수정 없음. 기존 V1 결론 보정.

### A-1. 추가 발견 요약

본 V1 본문(§2)은 KPA OPL serviceKey를 `kpa-society`(checkout) vs `kpa-groupbuy`(groupbuy)의 **의도적 흐름 분리**로 판단하고, "KPA에는 GlycoPharm식 다중키 gate가 없다 / 추가 작업 대부분 불필요"로 결론냈다.

그러나 추가 조사에서 **별개의 `kpa` ↔ `kpa-society` 이중키 drift**가 확인되었다. 이는 V1 본문이 다루지 않은 차원이며, "다중키 gate 없음" 결론과 충돌한다.

### A-2. 코드 근거

| 위치 | 패턴 | 평가 |
|------|------|:---:|
| `apps/api-server/src/routes/platform/store-public/store-public-utils.ts:25-26` | `resolveServiceKeys(serviceKey)` → `serviceKey === 'kpa'`이면 `['kpa', 'kpa-society']` 반환 | **이중키 gate** |
| `store-public-utils.ts:294` | `opl.service_key = $2` (단일키) | ⚠️ 단일 |
| `store-public-utils.ts:330` | `opl.service_key = $2` (단일키) | ⚠️ 단일 |
| `apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts:373` | `opl.service_key = 'kpa-society'` (literal) | ⚠️ literal |

**`resolveServiceKeys` 주석 (L20-23)**:
```
platform_store_slugs.service_key = 'kpa'
organization_product_listings.service_key = 'kpa-society'
두 테이블 간 불일치 보정: OPL 조회 시 'kpa-society'도 포함.
```

→ `platform_store_slugs`는 `'kpa'`, OPL은 `'kpa-society'`로 **테이블 간 serviceKey 불일치**가 존재하며, 이를 보정하기 위해 공개 storefront 목록 경로는 `['kpa', 'kpa-society']` 이중키 gate(`= ANY($n)`)를 사용한다.

### A-3. 호출부 검증

- `resolveServiceKeys`는 `store-public-product.handler.ts`(공개 storefront 상품 **목록** 경로)에서 호출되어 `queryVisibleProducts(... = ANY($n))`로 이중키 적용 → **목록 경로는 이중키 정상**.
- 그러나 `store-public-utils.ts:294, :330`(detail/utils 계열 쿼리)은 단일 `= $2`, `kpa-checkout.controller.ts:373`은 literal `'kpa-society'` → **이중키 미적용**.

### A-4. KPA 내부 3패턴 혼재

KPA OPL/storefront/checkout 흐름에는 다음 3가지 serviceKey 처리 방식이 혼재한다:
1. `kpa` 단일키 (platform_store_slugs 측)
2. `kpa-society` literal (checkout, 일부 utils)
3. `['kpa', 'kpa-society']` 이중키 gate (storefront 목록, resolveServiceKeys)

### A-5. 결론 보정

**기존 V1 결론**:
> KPA는 `kpa-society`와 `kpa-groupbuy`가 서로 다른 흐름이므로 다중키 gate 없음 / 추가 작업 대부분 불필요 (판정 E).

**보정 결론**:
> `kpa-society`와 `kpa-groupbuy`의 **흐름 분리는 유효하며 유지**한다(V1 §2 판단 보존). 그러나 이와 **별개로** `kpa`와 `kpa-society`가 같은 공개 storefront/OPL 연결 흐름에서 이중키로 묶이는 구간이 존재하고, 그 처리 방식이 목록(이중키) / detail·utils(단일키) / checkout(literal)로 혼재한다. 따라서 **KPA `kpa` ↔ `kpa-society`는 C급 serviceKey canonical drift로 재분류**한다.

> 단, `resolveServiceKeys` helper가 이미 canonical 보정 의도를 담고 있으므로, 전면 재설계가 아니라 **helper 재사용/명시적 보정으로 정합 가능**하다. checkout literal은 결제/주문 영향이 있어 **즉시 수정하지 않고 별도 IR로 분리**한다.

### A-6. 후속 WO/IR 후보 (보정 추가)

| WO/IR | 범위 | 위험도 | 우선순위 |
|-------|------|:---:|:---:|
| `WO-O4O-KPA-STORE-PUBLIC-SERVICEKEY-DRIFT-ALIGNMENT-V1` | `store-public-utils.ts` 내 이중키 helper(`resolveServiceKeys`) 사용 위치와 단일 `= $2`(L294/L330) 비교 위치 정합. 공개 storefront list/detail 계열 우선. backend/API contract 변경 없이 helper 재사용 또는 명시적 보정. | 낮음~중간 | 중간 |
| `IR-O4O-KPA-CHECKOUT-SERVICEKEY-LITERAL-AUDIT-V1` | `kpa-checkout.controller.ts:373` literal `'kpa-society'`의 정당성 조사. checkout은 결제/주문 영향이 있어 즉시 수정하지 않고 별도 IR로 분리. | 중간 (결제 영향) | 중간 |

**권장 진행 순서**: (1) storefront list/detail serviceKey drift 정합(저위험) → (2) checkout literal 별도 IR(결제 영향 신중) → (3) 필요 시 OPL serviceKey canonical 정책 문서화/CHECK.

### A-7. K-Cosmetics 재확인

V1 §3 결론 유지. K-Cosmetics는 `organization_product_listings` 미사용(cosmetics 전용 테이블), `kpa`/`kpa-society` 류 테이블 불일치 없음 → 본 addendum 영향 없음. 판정 A 유지.

---

*Addendum 작성: Claude Code (2026-06-01)*  
*read-only 보강 — 코드/DB/source/migration 수정 없음. 기존 V1 결론 보존 + 보정.*
