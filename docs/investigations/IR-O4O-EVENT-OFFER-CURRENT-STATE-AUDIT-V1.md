# IR-O4O-EVENT-OFFER-CURRENT-STATE-AUDIT-V1

> **목적**: 이벤트 오퍼(Event Offer / 레거시 "groupbuy") 기능의 현재 구현 상태(코드·DB·API·화면·서비스별 노출)를 전수 조사하고, `WO-O4O-EVENT-OFFER-CURRENT-STATE-AUDIT-AND-FOUNDATION-ALIGNMENT-V1` 정책과의 정합·불일치를 판정한다.
> **성격**: read-only 조사 (코드/API/DB/migration/화면 변경 없음).
> **작성일**: 2026-06-06
> **선행 정책 문서**: `docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md`, `docs/baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md`, `docs/baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md`
> **연관 규칙**: CLAUDE.md §4(E-commerce Core), §7(Boundary), §11(Operator), F7/F8(Neture), `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`

---

## 1. Summary / Verdict

이벤트 오퍼는 **신규로 만들 기능이 아니다.** O4O 공통 도메인으로 이미 구현되어 4개 서비스(KPA·K-Cosmetics·GlycoPharm·Neture)에 라우트·컨트롤러·엔티티·마이그레이션·화면이 mount 되어 있다. 더 중요한 것은 **새 WO 정책의 핵심 조항 대부분이 이미 코드에 반영**되어 있다는 점이다.

**판정: B에 가깝되 C 요소가 많음 — "상당 부분 구현 완료, 소수 정책 항목만 정렬/완성 필요".** 신규 Foundation 구현(WO §10-A) 불필요. 기존 구현을 살리고 최소 정렬만 한다.

**이미 정책과 일치(추가 작업 불필요)**:
1. **Neture는 이벤트 오퍼 대상 service_key가 아니다** — 공급자가 선택 가능한 `TargetServiceKey`는 `KPA Society | K-Cosmetics | GlycoPharm` 셋뿐 ([event-offer-service-mapping.ts:17-31](apps/api-server/src/constants/event-offer-service-mapping.ts#L17-L31)). Neture는 "공급자 제안 생성 기지(허브)" 역할만 한다. → WO §2.2 일치.
2. **승인 주체 = 대상 서비스 운영자** — 승인 큐는 `status='pending' AND service_key=$1` 로 서비스별 격리, 각 서비스 운영자가 자기 서비스 대상 제안만 승인(KPA `requireKpaScope('kpa:operator')`, GlycoPharm `requireGlycopharmScope('glycopharm:operator')`, K-Cos 동형). 중앙/Neture 일괄 승인 없음. → WO §3 일치.
3. **이벤트 가격은 원본 상품 가격을 변경하지 않는다** — `event_price`는 `organization_product_listings`에만 저장, 주문 단가 = `event_price ?? price_general`, `supplier_product_offers.price_general` / `product_masters` 불변 ([event-offer.service.ts:592-596](apps/api-server/src/routes/kpa/services/event-offer.service.ts#L592-L596)). → WO §6 일치.
4. **"바로 주문"이며 사전수요/신청 단계 없음** — `participate()`는 관심등록/수요조사가 아니라 `checkoutService.createOrder()`로 **즉시 실주문**을 생성한다(승인+기간+수량 검증 후). 별도 신청→승인→주문 단계 없음. → WO §5 일치.

**정책과 어긋나거나 미완(정렬 대상)**:
1. **(결정됨 2026-06-06 — 독립 페이지 유지) 노출 위치 — 탭 vs 독립 페이지**: 새 WO §4는 "상품 리스트 내 이벤트 오퍼 **탭**"을 요구했으나, **기존 baseline `EVENT-OFFER-STORE-INTEGRATION-V1 §13`의 독립 route 확정(허브=공급계층 / 스토어=실행계층 분리)을 유지**하기로 결정. 독립 페이지 `/store-hub/event-offers`(3서비스) 유지, 상품 리스트 탭 이전 안 함, 홍보는 운영자 안내/공지/알림으로 처리. 새 WO §4(탭)는 baseline §13에 의해 대체됨. (상세 §9-A)
2. **매장 측 "바로 주문" 버튼 미완(glyco/kcos)**: GlycoPharm·K-Cosmetics 매장 허브 이벤트 오퍼 페이지의 추가/주문 버튼이 `disabled`("주문 제품 추가는 준비 중입니다"). KPA는 주문 흐름 구조 존재. → WO §5(바로 주문) 완성 필요.
3. **공급자별 물류비/무료배송 grouping 부재**: 현재 배송비는 주문 단위 전역 플랫(예: Neture 5만원↑ 무료, else 3000) — 공급자별 그룹 합산 아님 ([neture.service.ts:617-619](apps/api-server/src/routes/neture/services/neture.service.ts#L617-L619)). WO §5.5-5.6 요구와 갭. 단 WO §11이 "주문/결제/정산 대규모 재설계"를 제외 → **별도 후속 WO**.
4. **레거시 명칭·dormant 잔재**: `kpa-groupbuy` service_key·`/kpa/groupbuy*` route·`participate` 용어가 레거시로 남음(외부 API frozen). `neture-event-offer` serviceKey + `/neture/event-offers/:id/participate`는 대상 맵에서 빠져 **dormant**(과거 NETURE-ADOPTION 잔재). → 명칭 정렬은 선택, dormant route는 문서화/정리 후순위.

---

## 2. Scope
- 대상: 이벤트 오퍼 기능의 DB/entity/migration · API route · frontend page/route/menu · 서비스별 연결 · 주문/상품 연결의 현재 상태 + 새 WO 정책 정합 판정.
- 제외: 코드/API/DB/migration/화면 수정. 산출물 = 본 문서 1건.
- 근거: 백엔드·프론트엔드·주문연결 3축 read-only 코드 조사 + 기존 baseline 3건 대조.

---

## 3. 현재 구현 요약 (아키텍처)

```
[공급자 — Neture 측]
SupplierEventOfferPage (/neture/supplier/event-offers)
  → 다중 서비스 제안: 대상 = {KPA Society, K-Cosmetics, GlycoPharm} (Neture 제외)
  → POST /neture/supplier/event-offer-proposals
  → organization_product_listings INSERT (service_key=대상, status='pending', event_price/start/end/qty)
        ↓
[운영자 — 대상 서비스 측]
EventOfferManagePage (/operator/event-offers)  ※ KPA/Glyco/Kcos 각 서비스
  → GET .../pending-listings  (status='pending' AND service_key=자기서비스)
  → POST .../approve | reject  → status='approved' | 'rejected', decided_by/decided_at
        ↓
[매장 경영자 — 대상 서비스 측]
HubEventOffersPage / KpaEventOfferPage (/store-hub/event-offers)  ※ 독립 페이지
  → GET .../event-offers/enriched  (active 상태 노출)
  → POST .../:id/participate  → checkoutService.createOrder() (즉시 실주문)
                              → (best-effort) 매장 상품 자동 등록(source_type='event-offer')
```

- **단일 테이블 모델**: 별도 `event_offers` 테이블 없음. 전부 `organization_product_listings`(OPL) 위에 구현. (DOC-EVENT-OFFER-COMMON-DOMAIN §9 일치)
- **공통 코어 서비스**: `EventOfferService` ([apps/api-server/src/routes/kpa/services/event-offer.service.ts](apps/api-server/src/routes/kpa/services/event-offer.service.ts)) — KPA 디렉터리에 있으나 4서비스 공유.

---

## 4. 관련 파일 목록 (주요)

### 4.1 백엔드
| 영역 | 파일 |
|---|---|
| 코어 서비스 | `apps/api-server/src/routes/kpa/services/event-offer.service.ts` |
| service_key 상수 | `apps/api-server/src/constants/service-keys.ts` |
| 대상→이벤트키 매핑 | `apps/api-server/src/constants/event-offer-service-mapping.ts` |
| KPA 컨트롤러 | `.../routes/kpa/controllers/event-offer.controller.ts`, `event-offer-operator.controller.ts`, `supplier-offers.controller.ts` |
| Neture 컨트롤러 | `.../routes/neture/...` event-offer.controller, `supplier-event-offer-proposals.controller.ts` |
| K-Cos / Glyco 컨트롤러 | `.../routes/cosmetics/...`, `.../routes/glycopharm/...` event-offer(+operator).controller |
| 엔티티 | `apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts` |
| 주문 | `apps/api-server/src/services/checkout.service.ts`, `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` |
| 라우트 등록 | `apps/api-server/src/bootstrap/register-routes.ts` |

### 4.2 프론트엔드
| 서비스 | 공급자 생성 | 운영자 승인 | 매장 노출 |
|---|---|---|---|
| Neture | `services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx` (다중서비스) | — (역할상 없음) | — (제거됨, App.tsx:822 주석) |
| KPA | `web-kpa-society/src/pages/supplier/SupplierEventOfferPage.tsx` (단일, 레거시) | `.../pages/operator/event-offer/EventOfferManagePage.tsx` | `.../pages/event-offer/KpaEventOfferPage.tsx` |
| GlycoPharm | ❌ 없음 (Neture 경유 설계) | `.../pages/operator/event-offer/EventOfferManagePage.tsx` | `.../pages/hub/HubEventOffersPage.tsx` (버튼 disabled) |
| K-Cosmetics | ❌ 없음 (Neture 경유 설계) | `.../pages/operator/EventOfferApprovalsPage.tsx` | `.../pages/hub/HubEventOffersPage.tsx` (버튼 disabled) |

---

## 5. DB / Entity / Migration 현황

**엔티티**: `OrganizationProductListing` (테이블 `organization_product_listings`). 별도 event_offers 테이블/EventOffer 엔티티 **없음**.

이벤트 오퍼 관련 컬럼:
| 컬럼 | 타입 | 의미 |
|---|---|---|
| `service_key` | varchar(50) | `kpa-groupbuy` / `k-cosmetics-event-offer` / `glycopharm-event-offer` / `neture-event-offer`(dormant) |
| `status` | varchar(20) | `pending` / `approved` / `rejected` / `canceled` (런타임 계산: upcoming/active/ended) |
| `start_at` / `end_at` | timestamp | 기간 |
| `total_quantity` / `per_store_limit` / `per_order_limit` | integer | 수량 정책 |
| `event_price` | numeric(12,2) | 이벤트 단가(원본 불변) |
| `price` | numeric(12,2) | 생성 시점 공급가 스냅샷 |
| `requested_by` / `decided_by` / `decided_at` / `rejected_reason` | — | 승인 큐 |
| `master_id` / `offer_id` | FK | ProductMaster / SupplierProductOffer 참조 |
| `source_type` / `source_id` | — | participate 후 매장 상품 자동등록 시 `'event-offer'` 표시 |

**마이그레이션**:
- `apps/api-server/src/migrations/1771200000026-EventOfferCoreReform.ts` — status/기간/수량 컬럼.
- `apps/api-server/src/database/migrations/20260906100000-AddEventOfferColumnsToListings.ts` — 동 컬럼 idempotent 재적용(prod catch-up).
- `.../20260912000000-AddApprovalFieldsToOpl.ts` — 승인 큐 필드 + `(status, service_key)` 인덱스.
- `.../20260915000000-AddEventPriceToOrgProductListings.ts` — `event_price`.

> ⚠️ 마이그레이션 디렉터리 분기 주의: `src/migrations` vs `src/database/migrations` 혼재. pending 판정은 class명 기준(과거 오경보 사례, [project_apiserver_migration_deploy_drift] 참조). 실제 prod 반영 여부는 별도 `migration:show` 확인 권장(본 조사 범위 외).

---

## 6. API Route 현황 (전부 mount 확인됨)

| 서비스 | route | 컨트롤러 | 역할 |
|---|---|---|---|
| KPA | `/api/v1/kpa/groupbuy/*` | event-offer.controller | 매장 조회·participate |
| KPA | `/api/v1/kpa/groupbuy-admin/*` | event-offer-operator.controller | 운영자 승인/관리 |
| KPA | `/api/v1/kpa/supplier/event-offers` | supplier-offers.controller | (레거시) 단일 서비스 공급자 제안 |
| Neture | `/api/v1/neture/supplier/event-offer-proposals` | supplier-event-offer-proposals.controller | **다중 서비스 제안(주 경로)** |
| Neture | `/api/v1/neture/event-offers/*` (participate 포함) | event-offer.controller | **dormant**(대상맵 제외, 매장화면 제거됨) |
| K-Cos | `/api/v1/cosmetics/event-offers/*` | event-offer.controller | 매장 조회·participate |
| K-Cos | `/api/v1/cosmetics/operator/event-offers/*` | (operator) | 운영자 승인 |
| Glyco | `/api/v1/glycopharm/event-offers/*` | event-offer.controller | 매장 조회·participate |
| Glyco | `/api/v1/glycopharm/operator/event-offers/*` | event-offer-operator.controller | 운영자 승인 |

외부 API는 서비스별 prefix 유지(COMMON-DOMAIN §11 frozen). 내부 로직은 `EventOfferService` 공유.

---

## 7. 새 WO 정책 ↔ 현재 구현 정합 매트릭스 (WO §8 질문 답)

| WO 질문 | 현재 구현 | 판정 |
|---|---|---|
| **§8.1** event_offers 테이블/EventOffer 엔티티? | 없음. OPL 단일 테이블 모델. migration·route·화면 모두 실재. | 구현 존재 ✅ |
| **§8.2** Neture가 대상 서비스인가? | ❌ 아니다. `TargetServiceKey` = KPA/Kcos/Glyco. 공급자 제안 생성 기지로만. | 정책 일치 ✅ |
| **§8.2** Neture 운영자가 승인 주체인가? | ❌ 아니다. Neture 운영자 승인 화면 없음. | 정책 일치 ✅ |
| **§8.2** 대상 서비스 운영자 승인 구조? | ✅ 있음. service_key 격리 + 서비스별 operator scope guard. | 정책 일치 ✅ |
| **§8.2** KPA/Glyco/Kcos를 매장 기반 동일 취급? | ✅ 셋 다 대상, operator 승인, store-hub 노출 대칭. | 정책 일치 ✅ |
| **§8.3** 기존 공급자 상품 참조 vs 복제? | 참조. `offer_id`→SupplierProductOffer, `master_id`→ProductMaster. 상품정보 복제 아님(가격만 스냅샷). | 정책 일치 ✅ |
| **§8.3** 이벤트 가격이 원본가를 변경? | ❌ 변경 안 함. event_price는 OPL에만. | 정책 일치 ✅ |
| **§8.4** 바로 주문 가능? | participate()=즉시 createOrder(). 단 glyco/kcos 매장 버튼 `disabled`(미완). | 백엔드 ✅ / 프론트 미완 ⚠️ |
| **§8.4** 관심/참여신청 등 별도 구조? | ❌ 없음(수요조사/신청-승인-주문 단계 없음). | 정책 일치 ✅ |
| **§8.4** event_offer_id가 주문 라인에 기록? | 전용 필드 없음. `CheckoutOrder.metadata.productListingId`로 추적. | 설계상 허용(스냅샷) — 정책 위반 아님 |
| **§8.4** supplier_id 주문 그룹 포함? | participate가 `supplierId` 전달, OrderType=RETAIL+serviceKey. | ✅ |
| **§8.4** 공급자별 물류비 계산 포함? | ❌ 공급자별 grouping 없음(전역 플랫 배송비). | 갭 — 별도 후속 ⚠️ |
| **§8.5** 별도 추천영역/홍보 페이지로 구현? | ❌ 아니다. 추천/홍보 영역 없음. | 정책 일치 ✅ |
| **§8.5** 상품 리스트 탭으로 구현? | ❌ 독립 페이지 `/store-hub/event-offers`. (baseline §13이 의도적으로 독립 route 확정) | **충돌 — 결정 필요** ⚠️ |
| **§8.5** 매장 허브/내매장 상품관리 연결? | store-hub에 독립 노출. `/store/my-products`에 이벤트 탭은 없음. | 결정 필요 ⚠️ |
| **§8.5** 운영자 안내/공지와 분리? | ✅ 분리됨(상품 리스트 UI에서 홍보 안 함). | 정책 일치 ✅ |

---

## 8. dormant / 미완 코드

| 항목 | 상태 | 비고 |
|---|---|---|
| `neture-event-offer` serviceKey + `/neture/event-offers/*` participate | **dormant** | 대상맵 제외 + 매장화면 제거(App.tsx:822). NETURE-ADOPTION 잔재. 정리 또는 "의도적 보존" 문서화 후순위 |
| KPA `/kpa/supplier/event-offers` (단일 제안) | **레거시 병존** | 주 경로는 Neture 다중제안. KPA 단일 공급자 화면도 라우트됨 |
| GlycoPharm·K-Cos 매장 "추가/주문" 버튼 | **미완(disabled)** | "준비 중" — WO §5 바로주문 완성 필요 |
| GlycoPharm·K-Cos 공급자 생성 화면 | **부재(의도적)** | 공급자는 Neture 경유 제안 → 부재가 설계와 정합 |

---

## 9. 정렬 권고 (코드 복잡도 미증가 원칙)

### 9-A. 결정됨 (2026-06-06) — 노출 위치: **독립 페이지 유지**

새 WO §4("상품 리스트 탭")와 기존 baseline `EVENT-OFFER-STORE-INTEGRATION-V1 §13`("독립 canonical route")의 충돌은 **옵션 1(독립 페이지 유지)로 확정**한다.

- ✅ **독립 페이지 `/store-hub/event-offers` 유지** (3서비스). 코드 변경 0.
- ✅ 상품 리스트 탭으로 이전하지 않음.
- ✅ 홍보는 상품 리스트 UI가 아니라 **운영자 안내/공지/알림**으로 처리.
- 새 WO §4(탭)는 **baseline §13에 의해 대체됨**. baseline `EVENT-OFFER-STORE-INTEGRATION-V1 §13`에 본 결정을 반영(2026-06-06 노트).

근거: 허브=공급계층 / 스토어=실행계층 분리(Store Layer 원칙), 코드 복잡도 0, "clean and simple" 원칙 부합.

### 9-B. 정렬 불필요 (이미 일치) — 변경하지 않음
Neture 대상 제외 / 대상-서비스 운영자 승인 / event_price 원본 불변 / participate=즉시주문 / 사전수요·신청 단계 부재 / 추천·홍보 페이지 부재. → **건드리지 않는다.**

### 9-C. 후속 Fix Phase 후보 (WO §11 포함 범위 내, 9-A 결정 후)
1. GlycoPharm·K-Cos 매장 이벤트 오퍼 "바로 주문" 버튼 활성화(participate 연결) — 백엔드 route는 이미 존재.
2. (선택) 명칭 정렬: 사용자-facing은 "이벤트 오퍼"로 통일(프론트는 대체로 적용됨), 백엔드 `groupbuy` route/serviceKey는 frozen 유지.
3. (선택) `neture-event-offer` dormant participate route 정리 또는 "지원 허브 검증용 보존" 명문화.

### 9-D. 별도 후속 WO (WO §11 제외 범위 — 본 정비에 포함 금지)
- 공급자별 물류비/무료배송/주문금액 grouping(§5.5-5.6) → 주문/정산 설계 변경이므로 독립 WO. 현재 전역 플랫 배송비.

---

## 10. 진행 판단 (WO §10)

**판정 = B(기존 구현 존재, 일부 정책 정렬 필요), 단 C(상당 부분 완료)에 근접.**

- 신규 Foundation 구현(§10-A) **불필요** — 엔티티·migration·route·승인·주문·화면 모두 실재.
- 새 WO 정책의 민감 조항(Neture 비대상 / 대상서비스 운영자 승인 / 원본가 불변 / 바로주문 / 신청흐름 부재)은 **이미 충족**.
- 남은 것은 (i) ~~노출 위치 탭/페이지 정책 충돌 해소~~ → **결정됨: 독립 페이지 유지(§9-A)**, (ii) ~~glyco/kcos 바로주문 버튼 완성~~ → **완료(`WO-...-GLYCO-KCOS-STORE-ORDER-ENABLE-V1`, commit f999b53cd)**, (iii) 명칭·dormant 정리(선택), (iv) 공급자별 물류비는 별도 트랙.

---

## 11. 변경하지 않은 것 / 금지 준수
- 코드/API/DB/migration/화면/커밋(코드) 변경 없음 — read-only 조사.
- 4서비스 화면·공통 컴포넌트·엔티티·service_key 미수정. dormant route 미삭제.
- 다른 세션 untracked 파일 미접촉. 산출물 = 본 문서 1건.

---

## 12. Follow-ups (제안)
1. ✅ **(결정 완료 2026-06-06)** 노출 위치 = **독립 페이지 유지**(§9-A). baseline `EVENT-OFFER-STORE-INTEGRATION-V1 §13`에 반영.
2. ✅ **(완료)** `WO-O4O-EVENT-OFFER-GLYCO-KCOS-STORE-ORDER-ENABLE-V1` — 매장 바로주문 버튼 활성화. commit `f999b53cd`, CHECK 문서 작성.
3. (선택·미진행) `WO-...-EVENT-OFFER-TERMINOLOGY-DORMANT-CLEANUP-V1` — 명칭 정렬 + neture dormant route 정리(9-C-2,3).
4. (별도 트랙·미진행) `WO-...-SUPPLIER-SHIPPING-GROUPING-V1` — 공급자별 물류비/무료배송 grouping(9-D, WO §11 제외 범위).
