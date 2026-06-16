# IR-O4O-CROSSSERVICE-OPERATOR-MENU-AND-SUPPLY-APPROVAL-FLOW-AUDIT-V1

> 조사 전용 IR. 코드/메뉴/capability/route/DB 수정 없음.
> 기준 문서: `docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md`, `docs/baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md`, `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`, `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md`, `docs/guides/O4O-SUPPLY-CATALOG-APPROVAL-FLOW-GUIDE-V1.md`
> 선행: `IR-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMONIZATION-AUDIT-V1`(sidebar 메커니즘 공통화), `IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1`(승인 surface 결정), `IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1`(매장 측 상품 화면)
> 작성일: 2026-06-16

---

## 1. 조사한 파일 목록

### 프론트엔드 — operator menu/capability config
- `services/web-kpa-society/src/config/operatorMenuGroups.ts` (UNIFIED_MENU 29~, hide 주석 33/134/145)
- `services/web-kpa-society/src/config/operatorCapabilities.ts`
- `services/web-glycopharm/src/config/operatorMenuGroups.ts` (products 45, orders 59, approvals 36~41)
- `services/web-glycopharm/src/config/operatorCapabilities.ts`
- `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` (products 34, orders 45, approvals 28~32)
- `services/web-k-cosmetics/src/config/operatorCapabilities.ts`
- `services/web-neture/src/config/operatorMenuGroups.ts` (approvals 45~49, 상품 후보 검토 55, 주석 132/151)
- `services/web-neture/src/config/operatorCapabilities.ts`

### 프론트엔드 — operator 승인/상품/주문 화면
- `packages/operator-core-ui/src/modules/product-applications/ProductApplicationManagementConsole.tsx` (공통 승인 콘솔, 61~159)
- `services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx` (Neture 공급자 Offer 승인)
- `services/web-{glycopharm,k-cosmetics}/src/pages/operator/ProductsPage.tsx` (상품 관리 = view-only)
- `services/web-{glycopharm,k-cosmetics}/src/pages/operator/OrdersPage.tsx` (주문 관리 = view-only, 배너 주석 1~10)
- `services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx`, `OrdersManagementPage.tsx`
- 이벤트 오퍼 관리 페이지: `EventOfferManagePage.tsx`(KPA/GP), `EventOfferApprovalsPage.tsx`(KCos)

### 백엔드 — route/controller/entity
- `apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts` (공통 컨트롤러, serviceKey 파라미터화 33~75)
- `apps/api-server/src/routes/{kpa,glycopharm,cosmetics}/*.routes.ts` (product-applications mount: kpa 246 / gp 537 / kcos 139)
- `apps/api-server/src/modules/neture/neture.routes.ts:166` (`/operator` → operator-product-approval)
- `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts:119-130` (`approveServiceProduct(..., {activateListing:true})`)
- entity: `modules/neture/entities/SupplierProductOffer.entity.ts:36`, `entities/ProductApproval.ts:33`, `modules/store-core/entities/organization-product-listing.entity.ts:24`, `modules/neture/entities/ProductMaster.entity.ts:32`
- event-offer: `routes/kpa/controllers/event-offer-operator.controller.ts`, `routes/cosmetics/controllers/event-offer.controller.ts`, `routes/glycopharm/controllers/event-offer-operator.controller.ts`

### 문서
- `docs/baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md` §3 책임 매트릭스
- `docs/baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md` §3~4
- `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` §4-2 (8 Group)
- `docs/guides/O4O-SUPPLY-CATALOG-APPROVAL-FLOW-GUIDE-V1.md` §5~7
- `docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md` §3,6
- `docs/investigations/IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1.md` (D1/D2)
- `docs/archive/investigations/IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1.md`, `IR-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMONIZATION-AUDIT-V1.md`

---

## 2. 서비스별 operator menu 비교표

각 서비스 `operatorMenuGroups.ts` UNIFIED_MENU 기준. `route✓`=메뉴+route 존재, `숨김(WO)`=의도적 미노출(주석 근거), `미정의`=그룹 자체 없음, `adminOnly`=admin 게이트.

| Menu Domain | KPA-Society | GlycoPharm | K-Cosmetics | Neture |
|---|:---:|:---:|:---:|:---:|
| 대시보드 | route✓ | route✓ | route✓ | route✓ |
| 회원 관리 | route✓ | route✓ | route✓ | route✓ |
| **Approvals(승인)** | route✓ | route✓ | route✓ | route✓ |
| **상품 관리** | **숨김(WO)** | route✓ | route✓ | route✓ |
| **주문 관리** | **숨김/미정의** | route✓ | route✓ | route✓ |
| Stores(매장 HUB) | route✓ | route✓ | route✓ | route✓(매장 관리만) |
| Content | route✓ | route✓ | route✓ | route✓ |
| 자료실 관리 | route✓ | route✓ | route✓ | 미정의 |
| LMS | route✓ | route✓ | route✓ | 미정의 |
| Signage | route✓ | route✓ | route✓ | 미정의 |
| Forum | route✓ | route✓ | route✓ | route✓ |
| Analytics | route✓ | route✓ | route✓ | route✓ |
| System | route✓ | route✓ | 미정의 | route✓ |

### Approvals 그룹 내부 구성 (라벨·route)
| 서비스 | Approvals 항목 (label → path) |
|---|---|
| **KPA** | 공급 상품 신청 승인 → `/operator/product-applications` (38) · 이벤트 오퍼 승인 → `/operator/event-offers` (40) · 협업 문의 → `/operator/collaboration-requests` (42) |
| **GlycoPharm** | 매장 승인 → `/operator/store-approvals` (36) · 이벤트 오퍼 승인 → `/operator/event-offers` (39) · 공급 상품 신청 승인 → `/operator/product-applications` (41) |
| **K-Cosmetics** | 신청 관리 → `/operator/applications` (28) · 이벤트 오퍼 승인 → `/operator/event-offers` (30) · 공급 상품 신청 승인 → `/operator/product-applications` (32) |
| **Neture** | 가입 승인 → `/operator/applications` (45) · 유통참여형 펀딩 → `/operator/market-trial` (46) · 서비스 승인 → `/admin/service-approvals` (47, adminOnly) · 공급자 활성화 → `/operator/suppliers` (49) |

> **핵심 관찰:** `공급 상품 신청 승인`(→`/operator/product-applications`)과 `이벤트 오퍼 승인`(→`/operator/event-offers`)은 **KPA/GP/KCos 3서비스에서 동일 path로 이미 정합**되어 있다. 즉 사용자가 우려한 "공급자 상품/이벤트 오퍼 승인을 어디서 처리하는지 불명확"은 **코드 레벨에선 이미 Approvals 그룹으로 통일**되어 있다. 진짜 불일치는 §3.

---

## 3. KPA vs GlycoPharm 메뉴 차이 원인 확인

**차이는 단 두 항목 — `상품 관리` / `주문 관리` (view-only 운영 화면)이며, KPA가 의도적으로 숨긴 것이다.**

근거 (KPA `operatorMenuGroups.ts`):
- 라인 33/134: `// WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1: 약국 서비스 신청 메뉴 제거 (라우트/API/DB 유지)`
- 라인 145: `// WO-KPA-OPERATOR-STORES-MENU-HIDE-V1: stores 메뉴 노출 제거`
- → KPA는 `products`/`orders` 그룹을 **정의하지 않음**. 단 route/API/DB는 유지(주석 명시).

대조 (GlycoPharm `operatorMenuGroups.ts`): `products`(45) `상품 관리`→`/operator/products`, `orders`(59) `주문 관리`→`/operator/orders` 정의됨.

| 가설 | 판정 | 근거 |
|---|---|---|
| (a) 실제 기능 부재 | ❌ | KPA도 route/API/DB 유지 (주석). 백엔드 동일 컨트롤러 사용 |
| (b) capability gate로 숨김 | ❌ | KPA `ENABLED_CAPABILITIES`에 `STORE_MANAGEMENT` 포함. capability 게이트가 아니라 메뉴 항목 **자체 미정의** |
| (c) route 미마운트 | ❌ | route는 유지(주석). 메뉴만 제거 |
| **(d) 의도적 UI 제거(WO)** | **✅** | `WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1` / `-STORES-MENU-HIDE-V1` |

**즉 KPA에서 "상품 관리/주문 관리가 안 보이는 것"은 버그/누락이 아니라 과거 WO의 의도적 결정이다.** 단, 그 WO가 cross-service parity 합의 이전 결정이므로 "지금도 유효한 정책인가"는 §12/§16에서 재판정.

> 부가: KPA의 상품 관련 운영 업무는 사라진 게 아니라 **Approvals 그룹의 `공급 상품 신청 승인`(38)으로 존재**한다. KPA는 "운영자가 상품을 직접 보는 화면(view-only 카탈로그)"만 숨겼고, "승인 업무"는 유지했다.

---

## 4. K-Cosmetics·Neture 포함 차이 요약

- **KPA**: 상품 관리/주문 관리 **숨김**. 승인 업무는 Approvals(공급 상품 신청 승인/이벤트 오퍼 승인/협업 문의).
- **GlycoPharm**: 상품 관리/주문 관리 **노출**(view-only). 승인 = 매장 승인 + 이벤트 오퍼 + 공급 상품 신청.
- **K-Cosmetics**: GP와 거의 동일. 승인 첫 항목이 `신청 관리`(통합 신청). System 그룹 미정의.
- **Neture**: 구조 자체가 다름(매장 부재 서비스). 상품 관리(상품 후보 검토 등 7항목)/주문 관리(4항목) 노출. 승인은 **공급자 도메인**(가입 승인/공급자 활성화/유통참여형 펀딩/서비스 승인). 자료실/LMS/Signage **미정의**. → 별도 4-domain IA 대상(문서 정책과 합치, §13).

**비대칭 요약:** 메커니즘(sidebar/layout)은 공통화되었으나, **메뉴 노출 정책이 서비스별로 갈림**. 그중 KPA의 상품/주문 숨김만이 "동일 카테고리 다른 노출"의 유일한 실질 격차다(KPA↔GP↔KCos 기준). Neture는 설계상 별도 축이라 직접 비교 대상이 아니다.

---

## 5. 공급자 상품 공급 신청 흐름

```
[공급자] SupplierProductOffer 등록 (approvalStatus=PENDING, distributionType=PUBLIC|SERVICE|PRIVATE)
   ↓  (Neture 운영자/관리자 1차 승인 — 플랫폼 공급 자격)
SupplierProductOffer.approvalStatus = APPROVED  (neture operator-product-approval.controller)
   ↓  (특정 서비스/매장 대상 SERVICE 분배 → 매장이 신청)
ProductApproval 생성 (service_key='kpa|glycopharm|k-cosmetics', approval_status=PENDING)
   ↓  (서비스 운영자 2차 승인 — 내 서비스 매장 편입 허용)
ProductApprovalV2Service.approveServiceProduct(id, operatorId, {activateListing:true})
   ↓
ProductApproval.approval_status=APPROVED  +  OrganizationProductListing 생성/활성(is_active=true)
   ↓  (※ 승인 ≠ 소비자 노출 — 별도 채널/진열 승인 필요)
매장이 내 매장 O4O 주문 가능 상품으로 편입
```

- **2단 승인 구조**: ① Neture 운영자=플랫폼 공급 자격(SupplierProductOffer) ② 서비스 운영자=내 서비스 편입 자격(ProductApproval→OPL).
- **per-store 단건 활성**: 한 건 승인이 같은 offer 신청한 다른 매장을 함께 켜지 않음 (가이드 §6).
- 처리 화면: 서비스 운영자 측은 **Approvals > 공급 상품 신청 승인**(`/operator/product-applications`, 공통 `ProductApplicationManagementConsole`). Neture 측은 **`/operator/product-approvals`**(SupplierProductOffer 직접).

---

## 6. 서비스 상품 승인 흐름 (운영자 처리 위치)

| 단계 | 처리 주체 | 화면/route | 메뉴 위치 | serviceKey |
|---|---|---|---|---|
| 공급자 Offer 승인(플랫폼) | Neture 운영자/admin | `/operator/product-approvals` (OperatorProductApprovalPage) | Neture Approvals | neture |
| 매장 공급 상품 신청 승인 | 서비스 운영자 | `/operator/product-applications` (ProductApplicationManagementConsole) | **Approvals > 공급 상품 신청 승인** | kpa / glycopharm / k-cosmetics |

- 백엔드는 **KPA 컨트롤러를 serviceKey 파라미터화**하여 GP/KCos 재사용 (`createOperatorProductApplicationsController(..., {scope, serviceKey})`, kpa.routes 246 / gp 537 / kcos 139). 승인 SQL은 `approval.service_key` 기반이라 서비스 격리됨.
- 승인 후 `activateListing:true` → OPL `is_active=true`(주문 가능 자격). **소비자 진열은 별도 채널 승인 단계** (가이드 §7, IR-PRODUCT-APPROVAL-DECISION D2).
- **모든 서비스(KPA 포함)가 이 승인 화면을 Approvals 그룹에서 도달 가능** — 즉 승인 위치는 이미 정합.

---

## 7. 이벤트 오퍼 승인 흐름

```
[공급자] Event Offer 제안 (status=pending)
   ↓ [운영자] 승인 (approved)   ← Approvals > 이벤트 오퍼 승인 (/operator/event-offers)
   ↓ [시스템] startAt 도달 → active
   ↓ [매장 경영자] 참여·주문 (참여 시 매장 진열 자동 등록: WO-O4O-EVENT-OFFER-STORE-PRODUCT-LINK-V1)
```

| 서비스 | operator 승인 메뉴 | 백엔드 승인 route | 화면 |
|---|---|---|---|
| KPA | Approvals > 이벤트 오퍼 승인(40) | `POST /kpa/groupbuy-admin/products/:id/approve` | EventOfferManagePage |
| GlycoPharm | Approvals > 이벤트 오퍼 승인(39) | `POST /glycopharm/operator/event-offers/products/:id/approve` | EventOfferManagePage |
| K-Cosmetics | Approvals > 이벤트 오퍼 승인(30) | `POST /cosmetics/event-offers/products/:id/approve` | EventOfferApprovalsPage |
| Neture | **미노출** | buyer-only route, operator 승인 컨트롤러 없음 | 없음 |

- Event Offer는 플랫폼 공통 도메인(EVENT-OFFER-COMMON-DOMAIN-V1). KPA/GP/KCos는 operator 승인 일관 배치, **Neture만 미연결**(공급자/시장 도메인 특성).
- 승인 위치는 KPA/GP/KCos 모두 **Approvals 그룹**으로 이미 통일. 라벨도 "이벤트 오퍼 승인"으로 동일.

---

## 8. ProductApproval / SupplierProductOffer / OrganizationProductListing 관계

```
ProductMaster (barcode 1:1 SSOT)
   └─1:N─ SupplierProductOffer  (공급자 공급 제안; approvalStatus PENDING→APPROVED/REJECTED; distributionType PUBLIC/SERVICE/PRIVATE)
              └─ SERVICE 분배 시, org+service 단위 ─ ProductApproval (approval_status pending→approved/rejected/revoked; service_key 격리)
                        └─ 승인(activateListing:true) ─ OrganizationProductListing (매장 진열; is_active false→true; offer_id/master_id/decided_by/decided_at)
StoreLocalProduct = 매장 자체 상품 (Display only, Checkout 연결 금지 — 본 흐름과 별개)
glycopharm_products = GP 레거시 별도 테이블 (공통 도메인 미정렬, 선행 IR 참조)
```

- **SupplierProductOffer** = 공급 자격(플랫폼). **ProductApproval** = 서비스별 편입 승인(추적). **OrganizationProductListing** = 매장 최종 진열 상태(EventOffer 필드 내장, 별도 테이블 없음).
- 승인 진입점: 공급자 Offer=Neture, 서비스 편입=각 서비스 operator. 상태 전이는 §5~6.

---

## 9. 상품 관리 / 주문 관리 메뉴의 현재 역할

| 서비스 | 상품 관리 | 주문 관리 |
|---|---|---|
| KPA | (메뉴 숨김) — 상품 업무는 Approvals 승인으로만 | (메뉴 숨김/미정의) |
| GlycoPharm | `/operator/products` ProductsPage — **view-only**(목록+검색+새로고침, 생성/수정 없음) | `/operator/orders` OrdersPage — **조회 전용**(배너 주석: "상태변경/배송/취소/환불/송장/정산/bulk action 없음") |
| K-Cosmetics | `/operator/products` ProductsPage — **view-only** | `/operator/orders` — **조회 전용**(동일 배너) |
| Neture | `/operator/all-registered-products` — **view-only** + 상품 후보 검토(승인성) | `/operator/orders` OrdersManagementPage — **view-only** |

**판정:** 현재 `상품 관리`/`주문 관리`는 **모두 조회 전용(view-only)**이다. 운영자가 상품을 직접 등록/수정하거나 주문 상태를 변경하지 않는다(배너 주석 명시: `WO-O4O-OPERATOR-ORDER-VIEW-FRONTEND-WIRE-V1` 조회 전용). 운영자의 **실제 상품 의사결정은 Approvals(승인)** 에서 일어난다. → "상품 관리"라는 라벨이 실제로는 "상품 카탈로그 조회"에 가까워 의미 과장 소지.

---

## 10. 운영자가 처리해야 하는 승인 업무 목록

1. 회원/매장 가입 승인 (회원·매장)
2. 공급자 가입/서비스 참여 승인 (Neture: 가입 승인/공급자 활성화/서비스 승인)
3. 공급자 상품 공급 신청 승인 — 플랫폼 자격 (Neture, SupplierProductOffer)
4. 매장 공급 상품 신청 승인 — 서비스 편입 (KPA/GP/KCos, ProductApproval→OPL)
5. 이벤트 오퍼 승인 (KPA/GP/KCos)
6. (보조) 협업 문의 / 포럼 신청·삭제 요청 / 강사 승인 등 도메인별 승인

> 정책상 승인은 "예외 업무"다(NON-APPROVAL-UX-BASELINE §4): 회원 가입·공급자/파트너 계약·정산 변경·법적 규제 콘텐츠만 명시적 승인 대상. 위 3~5는 그 예외에 해당 → Approvals(Workspace F)에 모으는 것이 표준.

---

## 11. 승인 업무별 현재 메뉴 위치

| 승인 업무 | KPA | GlycoPharm | K-Cosmetics | Neture |
|---|---|---|---|---|
| 매장/가입 승인 | (회원/협업) | 매장 승인 | 신청 관리 | 가입 승인 |
| 공급자 가입·활성화 | — | — | — | 공급자 활성화/서비스 승인 |
| 공급 상품 신청 승인 | Approvals✓ | Approvals✓ | Approvals✓ | (Neture=공급자 Offer 측) |
| 이벤트 오퍼 승인 | Approvals✓ | Approvals✓ | Approvals✓ | 미노출 |
| 협업/기타 | 협업 문의 | — | — | 유통참여형 펀딩 |

→ **공급 상품 신청 승인·이벤트 오퍼 승인은 KPA/GP/KCos 모두 Approvals 그룹에 동일 배치(정합).** 라벨 차이(매장 승인 vs 신청 관리 vs 가입 승인)와 Neture 이벤트오퍼 미연결만 비정합.

---

## 12. 승인 업무별 권장 메뉴 위치

표준(OPERATOR-DASHBOARD-STANDARD §4-2 8 Group)의 **Workspace F(검수·승인)** = Approvals 그룹에 승인 업무 집결.

| 승인 업무 | 권장 위치 | 비고 |
|---|---|---|
| 회원/매장 가입 승인 | Approvals(검수·승인) | 라벨 통일 권장(가입/매장 승인 표현 정리) |
| 공급자 가입·활성화·서비스 승인 | Approvals (Neture) / admin 트랙 | adminOnly 유지 |
| 공급 상품 신청 승인 | Approvals (현행 유지) | 이미 정합 |
| 이벤트 오퍼 승인 | Approvals (현행 유지) | Neture 적용 여부는 정책 결정 |
| (상품 카탈로그 조회) | **상품 관리(별도, 승인 아님)** | view-only이므로 승인과 분리 유지 |

> 권장: **승인은 Approvals 단일 집결, 조회(상품/주문)는 별도 그룹**. 현 구조가 대체로 이를 따르나, KPA만 조회 그룹을 숨겨 비대칭 발생.

---

## 13. 서비스별 권장 operator menu 구조 (초안)

표준 8 Group(Dashboard + A자료등록 / B AI작업 / C 큐레이션 / D 매장지원 / E 운영수익 / F 검수·승인 + System)을 도메인 IA로 매핑. **KPA/GP/KCos = 동일 3-domain(커뮤니티/매장 HUB/운영 공통) 공유, Neture = 별도 4-domain.**

### KPA / GlycoPharm / K-Cosmetics (공통 축)
```
대시보드
검수·승인(Approvals)   : 가입·매장 승인 / 공급 상품 신청 승인 / 이벤트 오퍼 승인 / (협업)
상품·거래(조회)         : 상품 관리(view) / 주문 관리(view)      ← KPA 숨김 해제 검토 대상
매장 HUB 운영           : 매장/약국 관리 / 채널 / HUB 블로그·POP·QR
콘텐츠·자료             : 공지/뉴스 / Home·가이드 / 자료실 / LMS / Signage
커뮤니티(Forum)
Analytics
System
```
→ 3서비스 라벨/순서/노출 동일화. 차이는 서비스 고유 기능 유무로만(예: GP 경영/정산).

### Neture (별도 축, 매장 부재)
```
대시보드 / Action Queue
공급·유통 운영   : 공급자 활성화 / 상품 후보 검토 / 상품 관리 / 유통참여형 펀딩
커머스·정산 운영 : 주문 관리 / 파트너 현황 / 정산
커뮤니티·콘텐츠   : 홈 CMS / 포럼 / 안내 문구
검수·승인        : 가입 승인 / 서비스 승인(admin) / (이벤트 오퍼 — 적용 결정 필요)
운영 공통/System : 알림·역할·이메일
```

특히 아래 업무 권장 위치:
- 공급자 가입/서비스 참여 승인 → Neture 검수·승인(admin 트랙 분리 유지)
- 공급자 상품 공급 신청 승인 → Neture 공급·유통(Offer) / 서비스 측은 검수·승인
- 서비스 상품 승인 → 각 서비스 검수·승인 > 공급 상품 신청 승인 (현행)
- 매장/약국 상품 신청 승인 → 동일(ProductApproval→OPL)
- 이벤트 오퍼 승인 → 검수·승인 (Neture 적용 여부 결정)
- 주문 조회/관리 → 상품·거래 또는 커머스(조회 전용 명시)
- 상품 관리 → 상품·거래(조회 전용, 승인과 분리)
- 콘텐츠/POP/QR/Signage → 콘텐츠·자료 / 매장 HUB

---

## 14. 메뉴를 일치시킬 범위 vs 다르게 둘 범위

**일치(공통화) 대상 — KPA/GP/KCos:**
- 검수·승인 그룹 라벨/순서/항목 (공급 상품 신청 승인·이벤트 오퍼 승인은 이미 동일 path)
- 상품 관리/주문 관리 노출 정책 (KPA 숨김 해제 여부 통일)
- 도메인 그룹 순서·라벨 (sidebar 공통화 IR 후속과 정렬)

**다르게 둘 대상 (정상 차이):**
- 서비스 고유 기능: GP 경영/정산, KPA 협업 문의, KCos System 미정의 등 — 기능 유무 기반
- **Neture 전체 구조** — 매장 부재로 별도 4-domain IA (STORE-MENU-CANONICAL §1.3: "Neture 제외", NETURE-OPERATOR-DOMAIN-IA-DESIGN: Twin Axis)
- Neture 이벤트 오퍼 미노출 — 도메인 특성(정책 결정 필요, 기본은 유지)

**원칙(CLAUDE.md Shared Module Rule):** route 없는 메뉴 노출 금지 / 실기능 메뉴 은폐 금지. KPA 숨김은 route 유지 상태의 "은폐"에 해당하므로 §16에서 정책 재확인 필요.

---

## 15. 후속 WO 후보

| 순위 | WO 후보 | 목적 | 대상 | 위험도 | 선행 |
|---|---|---|---|---|---|
| 1 | **WO-O4O-CROSSSERVICE-OPERATOR-APPROVAL-GROUP-LABEL-ALIGN-V1** | 검수·승인 그룹 라벨/순서/항목 3서비스 정합 (매장 승인/신청 관리/가입 승인 표현 통일) | KPA/GP/KCos | 하 | 본 IR |
| 2 | **WO-O4O-KPA-OPERATOR-PRODUCT-ORDER-MENU-PARITY-DECISION-V1** | KPA 상품 관리/주문 관리(view-only) 노출 정책 재결정·정렬 (숨김 유지 or 해제) | KPA(↔GP/KCos parity) | 중 | 본 IR, Shared Module Protocol |
| 3 | **WO-O4O-OPERATOR-PRODUCT-MENU-LABEL-CLARIFY-V1** | view-only 화면 라벨 명확화("상품 관리"→"상품 조회/카탈로그" 등), 승인과 조회 분리 명시 | 4서비스 | 하 | WO2 |
| 4 | **WO-O4O-NETURE-EVENT-OFFER-OPERATOR-APPROVAL-DECISION-V1** | Neture 이벤트 오퍼 operator 승인 연결 여부 정책 결정 | Neture | 중 | 본 IR |
| 5 | **WO-O4O-OPERATOR-MENU-DOMAIN-IA-COMMONIZE-V1** | sidebar 공통화 후속 — KPA/GP/KCos 도메인 IA 메타데이터 단일화 | 3서비스 | 중 | sidebar 공통화 IR |

**권장 진행:** WO1(라벨 정합, 저위험) → WO2(KPA parity 결정, 정책성) → WO3(라벨 명확화) 순. WO4/WO5는 별도 트랙.

---

## 16. 최종 판정

복합 판정 (사용자 제시 선택지 기준):

1. **승인 흐름 위치는 "이미 정합"이며 불명확하지 않다.** 공급 상품 신청 승인·이벤트 오퍼 승인은 KPA/GP/KCos 모두 Approvals 그룹의 동일 path(`/operator/product-applications`, `/operator/event-offers`)에 배치됨. → "승인 흐름이 불명확해 별도 콘솔 필요" 판정은 **기각**. 단, 라벨/구성 통일 여지는 있음(WO1).

2. **메뉴 불일치(상품 관리/주문 관리)는 "정상 정책 차이"이자 "과거 작업 잔재"의 경계 사례다.** KPA의 숨김은 `WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1`/`-STORES-MENU-HIDE-V1`에 의한 의도적 결정(=정책 차이)이나, 이후 GP/KCos가 view-only 상품/주문 메뉴를 노출하는 방향으로 정렬되며 cross-service parity가 깨짐(=잔재). → **capability/route 누락은 아님(가설 b,c 기각).** 재정렬 WO(WO2)가 필요.

3. **Neture 차이는 정상 정책 차이.** 매장 부재 서비스로 별도 4-domain IA가 문서 정책상 올바름. 이벤트 오퍼 미노출만 별도 결정 필요(WO4).

**결론:** 승인 흐름은 별도 콘솔 신설 없이 현 Approvals 구조 유지 + 라벨 정합. 핵심 후속은 **KPA 상품/주문 view-only 메뉴 parity 재결정**과 **승인 그룹 라벨 정합** 2건. 사용자 예상대로 후속 WO는 (1) 운영자 메뉴 정합화, (2) 승인 흐름 라벨/위치 정리로 나뉘되, **승인 위치 자체는 신설이 아니라 정리**다.

---

## 17. Current Structure vs O4O Philosophy Conflict Check

| 항목 | 현 구조 | 철학/표준 | 판정 |
|---|---|---|---|
| 운영자=심사관 편향 | 상품/주문이 view-only뿐, 의사결정은 Approvals 집중 | NON-APPROVAL-UX §3: "운영자=심사관 아님, 6 Workspace" | ⚠️ Approvals 외 Workspace(A~E) 가시성 점검 필요(별도). 승인 자체는 예외 업무로 정당 |
| 승인 위치 | Approvals 그룹 집결 | DASHBOARD-STANDARD §4-2: Workspace F | ✅ 합치 |
| 승인≠소비자 노출 | OPL active=편입 자격, 진열은 별도 채널 | SUPPLY-CATALOG-GUIDE §7 | ✅ 합치 |
| 상품 관리 라벨 | view-only인데 "관리" 라벨 | 3-ROLE §3: 운영자 상품 직접 제작 제한적 | ⚠️ 라벨 과장, 명확화 권장(WO3) |
| KPA 메뉴 은폐 | route 유지 + 메뉴 숨김 | CLAUDE.md: "실기능 메뉴 은폐 0" | ⚠️ 단 view-only 화면이라 "실기능" 해당성 약함. parity 관점 재결정(WO2) |
| Neture 별도 축 | 4-domain | STORE-MENU-CANONICAL §1.3, NETURE-IA | ✅ 합치 |
| 서비스 parity | KPA↔GP↔KCos 메뉴 노출 비대칭 | sidebar 공통화 IR: "도메인 IA 공통화 가능" | ⚠️ 정합 WO 필요 |

**철학 충돌 요약:** 치명적 충돌 없음. 주요 정렬 과제는 ① 상품/주문 view-only 라벨 과장, ② KPA 메뉴 은폐로 인한 parity 비대칭, ③ Approvals 편향 방지(A~E Workspace 가시성)다. 모두 "정리/재결정" 수준이며 구조 신설은 불요.

---

## Out of Scope

본 IR은 다음을 하지 않는다: 코드/메뉴/capability/route/header/sidebar/layout 수정, API 구현, DB migration, KPA 메뉴 숨김 해제, Neture 이벤트 오퍼 연결, 상품/주문 화면 리팩터링, 배포. 후속은 §15 WO로 분리한다.

## Evidence (대표 인용)

- KPA 숨김: `services/web-kpa-society/src/config/operatorMenuGroups.ts:33,134,145`
- KPA Approvals: 같은 파일 `:38(공급 상품 신청 승인) :40(이벤트 오퍼 승인) :42(협업 문의)`
- GP products/orders: `services/web-glycopharm/src/config/operatorMenuGroups.ts:45,59`; approvals `:36,39,41`
- KCos: `services/web-k-cosmetics/src/config/operatorMenuGroups.ts:34,45,28,30,32`
- Neture approvals: `services/web-neture/src/config/operatorMenuGroups.ts:45,46,47,49,55`
- 공통 승인 콘솔: `packages/operator-core-ui/src/modules/product-applications/ProductApplicationManagementConsole.tsx:61-159`
- serviceKey 파라미터화 컨트롤러: `apps/api-server/src/routes/kpa/controllers/operator-product-applications.controller.ts:33-75` (mount kpa.routes:246 / glycopharm.routes:537 / cosmetics.routes:139)
- 승인 서비스: `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts:119-130`
- 엔티티: `SupplierProductOffer.entity.ts:36`, `ProductApproval.ts:33`, `organization-product-listing.entity.ts:24`, `ProductMaster.entity.ts:32`
- view-only 주문 배너: `services/web-{glycopharm,k-cosmetics}/src/pages/operator/OrdersPage.tsx:1-10`
- 문서: `O4O-SUPPLY-CATALOG-APPROVAL-FLOW-GUIDE-V1 §5-7`, `OPERATOR-DASHBOARD-STANDARD-V1 §4-2`, `O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1 §3-4`, `O4O-3-ROLE-FLOW-BASELINE-V1 §3`, `IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1 D1/D2`, `IR-O4O-NETURE-OPERATOR-DOMAIN-IA-DESIGN-V1`
