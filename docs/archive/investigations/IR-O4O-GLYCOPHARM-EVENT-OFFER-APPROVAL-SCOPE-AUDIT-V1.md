# IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1

**작성 일자**: 2026-05-31
**작업 성격**: 정책 결정 IR (Policy Decision Investigation) — 코드 / DB / migration / route / API / frontend / menu / dashboard / 권한 수정 일절 없음
**상위 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md) §12 I2
**선행 CHECK**: [CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1](CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1.md) (Tier 1 + 2 종결)
**선행 IR**: [IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1](IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1.md) (I1 — Option B 권장)
**조사 도구**: 4개 병렬 Explore agent — GlycoPharm frontend / GlycoPharm backend / K-Cosmetics baseline / Neture supplier proposal flow

---

## 0. 핵심 결론 (TL;DR)

> ✅ **권장: Option A — operator 업무로 확정 (현재 구조 유지 + 누락된 supplier proposal 매핑 보완)**
>
> 1. **GlycoPharm Event Offer 승인 화면은 이미 존재** — `services/web-glycopharm/src/pages/operator/event-offer/EventOfferManagePage.tsx` + route `/operator/event-offers` + approvals 그룹 메뉴 "이벤트 오퍼 승인" + 백엔드 3 endpoint + `glycopharm:operator` guard. WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1 (commit `748dfc360`) 으로 정합 완료 상태.
> 2. **K-Cosmetics baseline 과 동일 패턴** — 같은 path, 같은 메뉴 그룹, 같은 EventOfferService (공통) 재사용, 같은 status enum, 같은 `requireXxxScope('xxx:operator')` 가드 패턴. **operator 업무로 확정한 기존 결정과 정합.**
> 3. **단 1개 critical gap 발견**: Neture supplier 의 multi-service proposal `TARGET_TO_EVENT_OFFER_KEY` 매핑에 GlycoPharm 누락 → `services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx` 의 PROPOSE_TARGETS 에서 GlycoPharm 체크박스 `disabled` (준비 중) → **operator pending list 가 실데이터 0** (현 시점). Backend operator endpoint 는 활성. **결정 자체는 operator 로 확정되어 있고, 데이터 흐름 일부 미연결이 잔존.**
> 4. **Dashboard Action Queue 연동 미구현** — GlycoPharm operator dashboard `buildGlycoPharmOperatorConfig` 가 backend pass-through 이나, backend `/operator/dashboard` 응답에 event offer pending count 가 미포함 (추정). KPA / K-Cos 모두 동일 미연동 — 본 IR scope 외.
> 5. **O4O 철학 (Business Philosophy §3.2 + 3-Role Flow §5)** 와 정합 — supplier 는 Neture 에서 제안, 각 서비스 운영자가 매장 맥락에 맞게 노출 승인. operator 일상 운영 / admin 정책 분리도 정합.
> 6. **권고 후속**: 즉시 새 WO 진행 보다 §10 의 후속 WO 후보 4개를 Tier 4 정책 사이클 완료 후 trigger 시 진행. 즉시 처리 권장은 §10 의 **G2 (TARGET_TO_EVENT_OFFER_KEY 매핑 추가)** 만 small WO 로 분리 가능.

권고 단계: ① 본 IR 로 Option A 정책 확정 → ② §10 G2 (supplier proposal 매핑 정상화) 소규모 WO trigger 검토 → ③ I3 AxisNavigation 정합 IR / 다른 Tier 4 IR 진행 → ④ KPA 5-Block + GlycoPharm dashboard Action Queue 연동 WO 들은 Tier 4 사이클 완료 후

---

## 1. Executive Summary

| 측면 | K-Cosmetics (baseline) | GlycoPharm (현재) | 정합 여부 |
|------|:----------------------:|:-----------------:|:---------:|
| Operator 승인 화면 존재 | ✅ EventOfferApprovalsPage | ✅ EventOfferManagePage | ✅ 동일 |
| Route path | `/operator/event-offers` | `/operator/event-offers` | ✅ 동일 |
| 메뉴 그룹 / 라벨 | approvals / "이벤트 오퍼 승인" | approvals / "이벤트 오퍼 승인" | ✅ 동일 |
| Frontend route guard | OperatorRoute (`cosmetics:operator`/`admin`/`platform:super_admin`) | OperatorRoute (`glycopharm:operator`/`admin`/`platform:super_admin`) | ✅ 동일 패턴 |
| Backend operator endpoint | `/api/v1/cosmetics/operator/event-offers/*` | `/api/v1/glycopharm/operator/event-offers/*` | ✅ 동일 (3 endpoint) |
| Backend role guard | `requireCosmeticsScope('cosmetics:operator')` | `requireGlycopharmScope('glycopharm:operator')` | ✅ 동일 패턴 |
| 공통 EventOfferService 재사용 | ✅ (SK = `k-cosmetics-event-offer`) | ✅ (SK = `glycopharm-event-offer`) | ✅ 동일 |
| Supplier 측 multi-service proposal 매핑 | ✅ (k-cosmetics → k-cosmetics-event-offer) | ❌ **누락** (glycopharm → ???) | ⚠️ **불일치** |
| Frontend supplier 체크박스 활성 | ✅ | ❌ **disabled (준비 중)** | ⚠️ **불일치** |
| Pending list 실데이터 | 정상 | **항상 empty** (proposal 진입 막힘) | ⚠️ **dead end** |
| Operator dashboard 연동 (pending count → Action Queue) | ❌ (미구현) | ❌ (미구현) | △ 양쪽 미구현 |
| Admin 메뉴 진입점 | 없음 (operator 전용) | 없음 (operator 전용) | ✅ 동일 |
| Operator create endpoint (직접 생성) | ✅ (`POST /` for operator-created offer) | ❌ (supplier proposal 만) | △ K-Cos 만 추가 |

### 권고: ✅ **Option A — operator 업무로 확정 (현재 구조 유지) + supplier proposal 매핑 보완 (G2 WO)**

---

## 2. 현재 GlycoPharm Event Offer / OPL 관련 구조

### 2.1 Frontend 구조

**Page**: [`services/web-glycopharm/src/pages/operator/event-offer/EventOfferManagePage.tsx`](../../services/web-glycopharm/src/pages/operator/event-offer/EventOfferManagePage.tsx)

- **목적**: 공급자 (Neture supplier) 가 multi-service proposal 로 GlycoPharm 에 제안한 pending OPL 을 운영자가 검토 → 승인 / 반려
- **표시 정보**: 상품명 / 공급사 / 가격 / 기간 / 수량
- **Author WO**: `WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1` (commit `748dfc360`)

**Route**: [`services/web-glycopharm/src/App.tsx`](../../services/web-glycopharm/src/App.tsx#L791)

- path: `/operator/event-offers`
- element: `<EventOfferManagePage />` (lazy load, line 264)
- 부모 guard: `OperatorRoute` (line 713) — `isOperatorOrAbove(user.roles, 'glycopharm')` + `MembershipGate` (service_memberships.glycopharm.status === 'active')
- 허용 role: `glycopharm:operator` / `glycopharm:admin` / `platform:super_admin`

**메뉴**: [`services/web-glycopharm/src/config/operatorMenuGroups.ts`](../../services/web-glycopharm/src/config/operatorMenuGroups.ts#L38-L39)

- 그룹: `approvals`
- label / path: `'이벤트 오퍼 승인' / '/operator/event-offers'`
- adminOnly: `false`
- 주석: WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1

### 2.2 Backend 구조

**Controllers**:
- [`apps/api-server/src/routes/glycopharm/controllers/event-offer.controller.ts`](../../apps/api-server/src/routes/glycopharm/controllers/event-offer.controller.ts) — consumer (`authenticate` 만)
- [`apps/api-server/src/routes/glycopharm/controllers/event-offer-operator.controller.ts`](../../apps/api-server/src/routes/glycopharm/controllers/event-offer-operator.controller.ts) — operator (`glycopharm:operator` 가드)

**Endpoints (GlycoPharm)**:

| Endpoint | Method | Route Guard | 호출 service |
|----------|--------|-------------|-------------|
| `/event-offers/enriched` | GET | `authenticate` | EventOfferService.listEnriched(SK) |
| `/event-offers/my-participations` | GET | `authenticate` | EventOfferService |
| `/event-offers/:id` | GET | `authenticate` | EventOfferService |
| `/event-offers/:id/participate` | POST | `authenticate` | EventOfferService |
| `/operator/event-offers/pending-listings` | GET | `requireGlycopharmScope('glycopharm:operator')` | EventOfferService.listPendingListings(SK) |
| `/operator/event-offers/products/:id/approve` | POST | `requireGlycopharmScope('glycopharm:operator')` | EventOfferService.approveListing |
| `/operator/event-offers/products/:id/reject` | POST | `requireGlycopharmScope('glycopharm:operator')` | EventOfferService.rejectListing |

**공통 EventOfferService**: [`apps/api-server/src/routes/kpa/services/event-offer.service.ts`](../../apps/api-server/src/routes/kpa/services/event-offer.service.ts) — KPA/Glyco/K-Cos 공유, SERVICE_KEYS 로 분기.

**Service Key**: `SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER` = `'glycopharm-event-offer'`

### 2.3 Entity / Status

**Entity**: [`apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts`](../../apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts) (= "OPL")

**Status enum**:
- `pending` (default) — 승인 대기
- `approved` — 승인 (is_active=true)
- `rejected` (WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1) — 반려 (is_active=false, rejected_reason)
- `canceled` — 취소

**Runtime status** (status='approved' 분기, `resolveEventStatus` 함수):
- `upcoming` / `active` / `sold_out` / `ended` — 시간 + 재고 기반 계산

### 2.4 Pending count query

`event-offer.service.ts` 라인 1237-1240:

```sql
SELECT COUNT(*)::int AS total
FROM organization_product_listings opl
WHERE opl.service_key = $1 AND opl.status = 'pending'
```

Parameter: `[SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER]`

→ **dashboard Action Queue 에 표시 가능한 데이터 source 존재**. 단 현재 backend `/operator/dashboard` 응답에 미포함 (추정).

---

## 3. Frontend route / page / menu 조사

### 3.1 Route 인벤토리

| Path | Element | Guard | 위치 | 상태 |
|------|---------|-------|------|------|
| `/operator/event-offers` | `<EventOfferManagePage />` | OperatorRoute | App.tsx operator block | ✅ active |
| `/store-hub/event-offers` | `<HubEventOffersPage />` | (매장 hub guard) | App.tsx store-hub block | ✅ active (열람 only, 승인 아님) |

### 3.2 메뉴 entry 인벤토리 (operatorMenuGroups.ts)

| 그룹 | 항목 | path | adminOnly | 상태 |
|------|------|------|-----------|------|
| approvals | 이벤트 오퍼 승인 | /operator/event-offers | false | ✅ active |
| (다른 항목들 — out of scope) | | | | |

### 3.3 Dead link / 메뉴-route 불일치

- ✅ 없음. menu entry path 와 route path 일치.
- ✅ component lazy import 정상.
- ✅ Guard 일관.

### 3.4 KPA 와의 비교

| 항목 | GlycoPharm | KPA |
|------|-----------|-----|
| 페이지 파일 경로 | `/pages/operator/event-offer/EventOfferManagePage.tsx` | `/pages/operator/event-offer/EventOfferManagePage.tsx` (동명) |
| Route path | `/operator/event-offers` | `/operator/event-offers` |
| Menu group | approvals | approvals |
| Menu label | 이벤트 오퍼 승인 | 이벤트 오퍼 승인 |

→ **3 서비스 (KPA/Glyco/K-Cos) 가 동일 file path + route + menu 구조**. cross-service canonical 정합.

### 3.5 Admin 메뉴 진입점

- GlycoPharm 의 `/admin` route block 에 Event Offer 메뉴 / route **없음**.
- ✅ operator 전용 패턴 (K-Cos 동일).

---

## 4. Backend API / guard / status 조사

§2.2 + §2.3 이미 상세. 추가 발견:

### 4.1 Status transition

```
[pending] --approve--> [approved] (is_active=true, decided_by, decided_at)
[pending] --reject--> [rejected] (is_active=false, rejected_reason, decided_by, decided_at)
[approved] --time/stock--> [upcoming / active / sold_out / ended] (resolveEventStatus)
[pending|approved] --cancel--> [canceled]
```

### 4.2 Approval 메타필드

- `decided_by` (user_id) — 승인/반려 처리한 operator user
- `decided_at` (timestamp)
- `rejected_reason` (text) — 반려 사유

→ 감사 추적 가능. operator audit log 연동 시 자동 기록 가능 (현재 별도 audit log 연동 여부는 본 IR scope 외).

### 4.3 Error codes (EventOfferCreateError)

- `NOT_FOUND` / `INVALID_STATE` / `INVALID_REASON` — approval-specific
- `OFFER_NOT_FOUND` / `OFFER_NOT_OWNED` / `ALREADY_LISTED` — create-specific (GlycoPharm 미사용, K-Cos 만 사용)

### 4.4 GlycoPharm specific 분기

- **공통 EventOfferService 재사용** + SERVICE_KEYS 격리 (KPA/Glyco/K-Cos 공유)
- **GlycoPharm 만의 특이점**:
  - consumer endpoint 가 `authenticate` (인증 필수). K-Cos 는 `optionalAuth` (비로그인 가능). → 본 IR scope 외.
  - operator create endpoint 없음 (K-Cos 만 `POST /` 로 supplier 없이 operator 가 직접 생성 가능)
  - 그 외 operator approval endpoint 3개는 K-Cos 와 동일.

### 4.5 STORE_SERVICE_KEY_MAP

- `GLYCOPHARM_EVENT_OFFER` → `GLYCOPHARM` 매장 진열 자동 생성 (WO-O4O-EVENT-OFFER-STORE-PRODUCT-LINK-V1)
- → 승인 시 GlycoPharm 매장 진열로 cascade. **operator 업무가 매장 운영과 직결**.

---

## 5. Operator vs Admin 권한 정합성

### 5.1 권한 정합 매트릭스

| Route / Endpoint | Frontend guard | Backend guard | 실제 허용 role | 정합 여부 |
|------------------|----------------|---------------|---------------|:---------:|
| `/operator/event-offers` (frontend) | OperatorRoute (isOperatorOrAbove + Membership) | — | glycopharm:operator/admin + platform:super_admin | ✅ |
| `GET /operator/event-offers/pending-listings` | — | `requireGlycopharmScope('glycopharm:operator')` | glycopharm:operator/admin + platform bypass | ✅ |
| `POST /operator/event-offers/products/:id/approve` | — | 동일 | 동일 | ✅ |
| `POST /operator/event-offers/products/:id/reject` | — | 동일 | 동일 | ✅ |

→ **frontend / backend / scope guard 정합**. operator 로 일관 매핑. ✅

### 5.2 Admin 권한 처리

- `glycopharm:admin` 도 operator endpoint 접근 가능 (scope guard 의 표준 상위 우회).
- `platform:super_admin` 도 우회 가능.
- **별도 admin-only event offer 화면 / endpoint 없음**.
- → Admin 은 "operator 의 상위 권한 + 정책/관리 도구" 패턴. Admin 전용 분리 안 됨 = 단순 operator role 의 superset.

### 5.3 Membership 강제

- `MembershipGate` 가 frontend operator route 전체에 적용 (WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1).
- → role 있어도 `service_memberships.glycopharm.status === 'active'` 없으면 차단.
- → K-Cos / KPA 와 동일 패턴.

---

## 6. Dashboard / Action Queue 연동 가능성

### 6.1 현재 상태

| 영역 | GlycoPharm | KPA | K-Cos |
|------|:----------:|:---:|:-----:|
| Operator dashboard 가 backend `/operator/dashboard` 사용 | ✅ | ❌ (summary + 6 보조) | ✅ |
| Backend 응답에 event offer pending count 포함 | ❌ (추정) | ❌ | ❌ |
| AI Summary / Action Queue 에 event offer pending 표시 | ❌ | ❌ | ❌ |
| Quick Actions 에 event offer 진입 링크 | (확인 필요) | ✅ | (확인 필요) |

### 6.2 Pending count source

- §2.4 의 query 가 존재. service_key + status='pending' 으로 즉시 count 조회 가능.
- O(1) — 인덱싱 가능 (현재 entity 의 IDX 가 service_key 기준인지는 별도 확인 필요).

### 6.3 Action Queue 노출 권장

| 데이터 | source | count 가능 | dashboard 노출 권장 | 비고 |
|--------|--------|:---------:|:------------------:|------|
| Event offer pending count | OPL pending where SK | ✅ | ✅ operator | dashboard Action Queue / KPI Grid 후보 |
| 최근 승인 이력 | OPL approved order by decided_at | ✅ | △ (선택) | Activity Log 후보 |
| 최근 반려 이력 | OPL rejected order by decided_at | ✅ | △ (선택) | Activity Log 후보 |
| 매장 진열 cascade 결과 | STORE_SERVICE_KEY_MAP 이후 store_products | △ | △ | 별도 store-products 영역 |

→ **operator 가 매일 처리해야 할 일상 업무 → Action Queue 최적 후보**. 단 §3 의 supplier proposal gap 해소 (G2) 후 의미 있음 (현재 pending 항상 0).

---

## 7. K-Cosmetics Event Offer 승인 흐름 비교

### 7.1 Side-by-side

| 항목 | K-Cosmetics | GlycoPharm | 정합 판단 |
|------|:-----------:|:----------:|:--------:|
| Page 파일 | `pages/operator/EventOfferApprovalsPage.tsx` | `pages/operator/event-offer/EventOfferManagePage.tsx` | △ 파일명 다름, 의도/기능 동일 |
| Route path | `/operator/event-offers` | `/operator/event-offers` | ✅ |
| Menu group / label | approvals / "이벤트 오퍼 승인" | approvals / "이벤트 오퍼 승인" | ✅ |
| Frontend route guard | OperatorRoute | OperatorRoute | ✅ |
| Frontend Membership | MembershipGate (cosmetics) | MembershipGate (glycopharm) | ✅ |
| Backend operator endpoint (3개) | `cosmetics:operator` | `glycopharm:operator` | ✅ |
| 공통 EventOfferService 재사용 | ✅ (K_COSMETICS_EVENT_OFFER) | ✅ (GLYCOPHARM_EVENT_OFFER) | ✅ |
| Operator create endpoint (직접 생성) | ✅ (POST /) WO-O4O-EVENT-OFFER-KCOS-CREATE-V1 | ❌ (없음) | △ K-Cos 만 추가 |
| Consumer endpoint auth | optionalAuth | authenticate | △ K-Cos 가 더 open |
| Supplier multi-service proposal 매핑 | ✅ k-cosmetics → k-cosmetics-event-offer | ❌ **glycopharm 매핑 누락** | ⚠️ Gap |
| Frontend supplier 체크박스 | 활성 | **disabled (준비 중)** | ⚠️ Gap |
| WO 도입 commit | ba40357b0 (WO-...-KCOS-OPERATOR-APPROVAL-V1) | 748dfc360 (WO-...-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1) | ✅ 양쪽 도입 완료 |

### 7.2 결론

- **승인 흐름 자체는 K-Cos baseline 과 GlycoPharm 가 정합** — operator 업무, 같은 path, 같은 guard, 같은 EventOfferService.
- **차이 2개**:
  1. K-Cos 만 operator-create 추가 (정책: K-Cos operator 가 자체 이벤트 직접 등록 가능. GlycoPharm 은 supplier 제안만 받음.) — 정책 결정으로 보임, 본 IR scope 외.
  2. **supplier multi-service proposal 매핑 누락** — GlycoPharm 측 frontend 체크박스 disabled / backend TARGET_TO_EVENT_OFFER_KEY 매핑 없음. **operator endpoint 가 활성이지만 데이터 진입 막힘 = 항상 empty list.**

---

## 8. Neture supplier proposal 흐름과의 관계

### 8.1 Cross-service dispatch 구조

```
Neture supplier (services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx)
  ↓ "이벤트 제안" 버튼 → 모달
  ↓ (1) 대상 서비스 선택 (체크박스 다중)
  ↓     PROPOSE_TARGETS = [
  ↓       { key: 'kpa-society', enabled: true },
  ↓       { key: 'k-cosmetics', enabled: true },
  ↓       { key: 'glycopharm', enabled: false, label: '(준비 중)' }  ← gap
  ↓     ]
  ↓ (2) 상품 선택 (라디오)
  ↓ (3) 이벤트 조건 (eventPrice, startAt, endAt, totalQuantity, perOrderLimit, perStoreLimit)
  ↓
POST /api/v1/neture/supplier/event-offer-proposals
  body: { offerId, serviceKeys[], eventPrice, startAt, endAt, ... }
  ↓
controller: supplier-event-offer-proposals.controller.ts
  ↓ (input 검증 + supplier 확인)
EventOfferService.createMultiServiceProposal()
  ↓ for each target in [kpa-society, k-cosmetics]:
  ↓   TARGET_TO_EVENT_OFFER_KEY 매핑 (kpa-society → kpa-groupbuy, k-cosmetics → k-cosmetics-event-offer)
  ↓   ※ glycopharm 매핑 없음 → 'unsupported' 결과 반환
  ↓   resolveOrganizationForEventOffer() — 서비스별 org 결정
  ↓   createListing(eventOfferServiceKey, roleType='supplier') 호출
  ↓     INSERT organization_product_listings (status='pending', is_active=false, requested_by, service_key=eventOfferServiceKey)
  ↓
응답: { results: [{ targetServiceKey, eventOfferServiceKey, status, listingId, message }] }

각 서비스 operator dashboard
  ↓ GET /operator/event-offers/pending-listings
  ↓   K-Cos: requireCosmeticsScope('cosmetics:operator')
  ↓   Glyco: requireGlycopharmScope('glycopharm:operator')
  ↓   KPA: requireKpaScope('kpa:operator') (추정)
  ↓
EventOfferService.listPendingListings(serviceKey)
  ↓ SELECT * FROM OPL WHERE service_key = $1 AND status = 'pending'
  ↓
Operator approve / reject
  ↓ POST /operator/event-offers/products/:id/approve | /reject
  ↓
UPDATE OPL (status, is_active, decided_by, decided_at, rejected_reason)
  ↓ (approve 시 STORE_SERVICE_KEY_MAP cascade → store_products 자동 생성)
```

### 8.2 GlycoPharm 의 dispatch gap

- **Frontend** ([`services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx`](../../services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx)): PROPOSE_TARGETS 에서 glycopharm `enabled: false`, 라벨 "(준비 중)".
- **Backend** ([`apps/api-server/src/constants/event-offer-service-mapping.ts`](../../apps/api-server/src/constants/event-offer-service-mapping.ts)): `TARGET_TO_EVENT_OFFER_KEY` 에 glycopharm 매핑 없음.
- **결과**: supplier 가 GlycoPharm 선택 불가 → glycopharm-event-offer service_key 의 OPL 이 INSERT 되지 않음 → operator pending list 항상 empty.

### 8.3 Cross-service dispatch 정합

- 1 supplier proposal → N service operator 독립 승인 (각 service_key 의 OPL row 별개) — 정합 ✅
- 각 service 의 operator 가 자기 service_key 의 pending 만 본다 — 정합 ✅
- Status 는 service 별 별개 (한 supplier 가 K-Cos 만 승인되고 KPA 는 반려되는 경우 가능) — 정합 ✅

---

## 9. 정책 옵션 A/B/C/D 비교

### Option A — operator 업무로 확정 (현재 구조 유지 + 누락 보완) ✅

| 측면 | 평가 |
|------|------|
| 장점 | (1) 이미 구현 완료 — 코드 변경 최소. (2) K-Cos baseline 정합 — 3 서비스 (KPA/Glyco/K-Cos) 통일 패턴. (3) O4O 철학 §3.2 (operator = 일상 운영 + 매장 실행 자산 제작) 정합. (4) Dashboard Action Queue 노출 후보 명확. (5) Membership Gate 자동 적용. |
| 단점 | supplier proposal 매핑 누락 (G2) 보완 필요 — 별도 small WO. |
| 리스크 | 매우 낮음 (현재 구조 유지) |
| 권장 | ✅ **권장** |

### Option B — admin 업무로 확정

| 측면 | 평가 |
|------|------|
| 장점 | 정책성 판단을 admin 으로 집중. 매장 노출 영향이 큰 경우 admin 결재 가능. |
| 단점 | (1) 현재 operator endpoint 3개 + frontend page + menu + DB 권한 모두 operator 기반 → **전면 재구현 필요**. (2) K-Cos baseline (operator 업무) 와 divergence — cross-service 정합 깨짐. (3) O4O 철학 §3.2 (operator 가 일상 승인 주체) 와 충돌. (4) admin 업무 부담 증가 — admin 은 정책 / 회원 / 시스템 중심이어야. (5) WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1 (`748dfc360`) 정책 결정 번복. |
| 리스크 | 매우 높음 |
| 권장 | ❌ |

### Option C — hybrid

| 측면 | 평가 |
|------|------|
| 장점 | 일상 승인은 operator, 예외/대형 건은 admin escalation. |
| 단점 | (1) escalation 분기 기준 정의 어려움 (가격? 기간? 수량?). (2) 구조 복잡 — operator/admin 양쪽 화면 + 권한 + 데이터 필터링 필요. (3) supplier UX 혼란 (어디로 갈지 예측 불가). (4) 1인 개발 부담 큼. |
| 리스크 | 높음 |
| 권장 | ❌ — 현 단계에 과도 |

### Option D — 보류

| 측면 | 평가 |
|------|------|
| 장점 | 검토 시간 확보. |
| 단점 | (1) 코드 이미 완성 — 보류 의미 없음. (2) supplier proposal 막힌 상태 그대로. (3) operator dashboard Action Queue 노출 결정도 보류. (4) Tier 4 사이클 진행 차단. |
| 리스크 | 중간 (의사 결정 지연으로 인한 다른 IR 영향) |
| 권장 | ❌ |

---

## 10. 권장안

### 최종 권장: ✅ **Option A — operator 업무로 확정**

**근거**:

1. **현재 구조가 이미 operator 업무로 구현 완료** — WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1 (`748dfc360`). 본 IR 의 역할은 정책 confirm.
2. **K-Cosmetics baseline 과 동일 패턴** — 3 서비스 cross-service canonical 정합.
3. **O4O 철학 §3.2 정합**: operator = "서비스 운영 사업자 (공급자 자료 수신·등록·구성 + AI 활용 + 매장 실행 자산 제작 + 큐레이션 + 매장 지원 + 운영 수익 모델 구축)" — 공급자 제안 수신 + 승인 + 매장 노출 cascade 가 정확히 operator 책임.
4. **Membership Gate 자동 적용** — service_memberships.glycopharm.status === 'active' 강제.
5. **3 자 Canonical Flow §2 ~ §3 정합** — 공급자 (Neture) → 운영 사업자 (GlycoPharm operator) → 매장 (store_products cascade).

### 예상 후속 WO (4 단계)

| ID (가칭) | 범위 | 의존성 | 우선 |
|-----------|------|-------|------|
| **G2: WO-O4O-GLYCOPHARM-EVENT-OFFER-SUPPLIER-PROPOSAL-MAPPING-V1** | (1) Neture frontend SupplierEventOfferPage `PROPOSE_TARGETS` 에서 glycopharm `enabled: true` 활성. (2) Backend `TARGET_TO_EVENT_OFFER_KEY` 에 `'glycopharm' → 'glycopharm-event-offer'` 매핑 추가. (3) `resolveOrganizationForEventOffer` 의 glycopharm 분기 확인 (있으면 유지, 없으면 추가). (4) smoke test — supplier 가 GlycoPharm 선택 후 제안 → operator pending list 에 노출 확인. | 본 IR Option A 확정 후 | **즉시 가능** (소규모) |
| **G1: WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-EVENT-OFFER-ACTION-QUEUE-V1** | Backend `/api/v1/glycopharm/operator/dashboard` 응답에 event offer pending count 추가 → frontend Action Queue 표시. KPI Grid 에도 추가 검토. | G2 완료 후 (pending 데이터 정상 흐름 검증) | 중간 |
| **G3: WO-O4O-GLYCOPHARM-EVENT-OFFER-ADMIN-READONLY-AUDIT-V1** (선택) | Admin 측 read-only 감사 화면 — operator approval 이력 조회 + 통계. operator 권한과 분리. | G1 완료 후 | 낮음 |
| **CHECK-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-SMOKE-V1** | 브라우저 smoke — supplier 제안 → operator pending → approve → store_products cascade → consumer 노출 의 전체 cycle. | G1 + G2 완료 후 | 중간 |

### 즉시 진행 권장은 **G2 (supplier proposal 매핑 정상화)** 만

- **이유**: operator endpoint 가 활성이지만 데이터 진입이 막혀 있음 → 사용자 (supplier + operator) 양쪽이 dead end 경험. 본 IR 의 정책 결정 (operator 업무 확정) 의 실효성을 위해 supplier 진입을 풀어야 의미. small scope.
- **G1 / G3 / CHECK** 은 Tier 4 사이클 완료 후 KPA 5-Block (I1) 와 함께 일관된 Dashboard 구조 정비 시점으로 후순위.

### 보류 항목

- **Operator create endpoint 도입 검토** (K-Cos 의 `POST /`) — GlycoPharm 도 자체 이벤트 생성 허용? 공급자 협력 없이 operator 가 직접 이벤트 만드는 사업적 정당성이 있나? → 별도 IR 필요. 본 IR scope 외.
- **Consumer endpoint authenticate vs optionalAuth** — GlycoPharm 의 비로그인 노출 정책. 본 IR scope 외.
- **STORE_SERVICE_KEY_MAP cascade 의 store_products 자동 생성 정책** — 승인 cascade 의 visibility/seo/asset 정합. 별도 영역.

---

## 11. 리스크와 회귀 가능성

### 11.1 본 IR (정책 결정) 자체의 리스크

| 항목 | 리스크 | 완화 |
|------|:------:|------|
| 정책 결정 (operator 업무 확정) 자체 | **매우 낮음** | 현 구조 유지 |
| 다른 세션 WIP (operator-ux-core layout 추출) 와 충돌 | 매우 낮음 | 본 IR 은 문서 1개만 commit |

### 11.2 G2 (supplier proposal 매핑) WO 진행 시 리스크

| 항목 | 리스크 | 완화 |
|------|:------:|------|
| Frontend PROPOSE_TARGETS 의 enabled 만 toggle 시 backend 매핑 누락으로 'unsupported' 응답 | 중간 | (1) backend mapping 추가 먼저 + (2) frontend toggle 동시 PR. CHECK smoke 필수. |
| `resolveOrganizationForEventOffer` 의 glycopharm 분기 처리 | 중간 | 함수 내부 확인 후 진행. 누락 시 추가. |
| 매장 진열 cascade (STORE_SERVICE_KEY_MAP) 의 organization 결정 | 중간 | 기존 GLYCOPHARM 매장의 organization_id 매핑 확인. test data seeding 권장. |

### 11.3 G1 (dashboard Action Queue) WO 진행 시 리스크

| 항목 | 리스크 | 완화 |
|------|:------:|------|
| backend dashboard 응답 shape 변경 | 중간 | additive (필드 추가) — 기존 응답 호환 |
| frontend Action Queue 정렬 / severity 정합 | 중간 | builder 측 정합 검증, smoke 시각 검증 |

### 11.4 G3 (admin readonly audit) WO 진행 시 리스크

| 항목 | 리스크 |
|------|:------:|
| operator 와의 권한 경계 모호 | 낮음 (read-only 만) |
| admin menu / route 신규 도입 부담 | 낮음 |

---

## 12. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) + [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) 정합 점검.

| 원칙 | **Option A (권장)** | Option B (admin) | Option C (hybrid) | Option D (보류) |
|------|:-------------------:|:----------------:|:-----------------:|:---------------:|
| §3.1 공급자 (Neture supplier) 정의 — 자료/상품/이벤트 제안 주체 | ✅ supplier 제안 흐름 정합 | ✅ | ✅ | △ supplier 진입 막힘 |
| §3.2 운영 사업자 (operator) 정의 — 공급자 자료 수신·등록·구성 + 매장 실행 자산 제작 | ✅ **핵심 정합** | ❌ operator 가 일상 승인 주체에서 배제됨 | △ 부분 | △ |
| §3.3 매장 (store) 정의 — 매장 실행 자산 수신 | ✅ STORE_SERVICE_KEY_MAP cascade | ✅ | ✅ | △ |
| §4 Canonical Flow (공급자 → 운영자 → 매장) | ✅ | ⚠️ admin 이 끼면 흐름 한 단계 추가 | △ 흐름 다단화 | △ |
| §5 HUB 철학 (매장 HUB = 콘텐츠 + 자산 + 운영지원) | ✅ event offer 매장 진열 cascade 가 HUB 의 자산 공급 흐름 | ✅ | ✅ | △ |
| §6 AI 역할 (수신 + 능동) | △ (현재 미연동) | △ | △ | △ |
| §7 Drift 방지 (도메인 어휘 격리) | ✅ K-Cos baseline 정합으로 cross-service drift 차단 | ❌ KPA/K-Cos 와 divergence | ❌ | △ |
| 3-Role Flow §2 책임 매트릭스 (operator 의 검수·승인) | ✅ 정확히 정합 | ❌ admin 으로 이동 시 매트릭스 깨짐 | △ | △ |
| 3-Role Flow §3 데이터 흐름 (supplier → operator 자료 등록) | ✅ | ❌ | △ | △ |
| 3-Role Flow §5 AI 개입 (작업 자료 흐름) | △ 미연동 | △ | △ | △ |
| 3-Role Flow §6 Drift 금지 (operator 의 검수·승인 책임 누락 금지) | ✅ | ❌ operator 책임 누락 = Drift | △ | △ |
| OPERATOR-DASHBOARD-STANDARD-V1 (5-Block + A~F 6 Workspace 중 F 검수·승인) | ✅ F 검수·승인 의 핵심 데이터 | ❌ | △ | △ |
| Cross-service 정합 (KPA / Glyco / K-Cos 통일) | ✅ | ❌ Glyco 만 divergence | ❌ | △ |
| 1인 개발 속도 | ✅ 현 구조 유지 + G2 만 small | ❌ 전면 재구현 | ❌ 복잡 | ❌ 작업 정체 |

> **종합**: **Option A** 가 모든 O4O 철학 원칙 정합. Option B/C 는 §3.2 operator 정의 + 3-Role Flow §2/§3/§6 와 충돌. Option D 는 의사 결정 지연 + supplier 진입 막힌 상태 방치.

### 12.1 운영자 관점

> "operator = 일상 운영 + 매장 실행 자산 제작 + 큐레이션 + 매장 지원" — O4O-BUSINESS-PHILOSOPHY-V1 §3.2

- Event Offer 승인 = "공급자 자료 수신 → 매장 노출 실행" 의 정확한 operator 책임
- K-Cos baseline 가 같은 결정 — 정합
- Dashboard Action Queue 노출이 operator 의 일상 업무 흐름과 자연스럽게 연동 (G1 WO)

### 12.2 1인 개발 속도

- 본 IR 자체로 정책 결정 ✅ (즉시 코드 작업 없음)
- 즉시 진행은 G2 (supplier proposal 매핑) 만 — small WO
- G1 / G3 / CHECK 은 Tier 4 사이클 + KPA 5-Block (I1) 이후 일관 정비

---

## 13. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 작성 문서 | `docs/investigations/IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1.md` |
| 현재 Event Offer 구조 요약 | (1) operator 승인 화면 + route + menu + 백엔드 3 endpoint 이미 구현 완료 (WO-O4O-GLYCOPHARM-OPERATOR-EVENT-OFFER-APPROVAL-V1, commit `748dfc360`). (2) K-Cos baseline 과 동일 패턴 (path / guard / EventOfferService 공유). (3) Supplier proposal 매핑 누락 → operator pending list 가 현재 empty. (4) Dashboard Action Queue 연동 미구현. |
| operator/admin 권한 판정 | **operator 업무** — frontend OperatorRoute + backend `requireGlycopharmScope('glycopharm:operator')` + Membership Gate 일관 정합 |
| K-Cosmetics 비교 결과 | 거의 동일 패턴 — operator 업무 확정 baseline 정합. 차이 2개: (1) K-Cos 만 operator-create endpoint, (2) GlycoPharm 만 supplier proposal 매핑 누락 |
| 권장 옵션 | **Option A** — operator 업무로 확정 (현재 구조 유지) + G2 (supplier proposal 매핑) small WO 즉시 trigger 가능 |
| 즉시 WO 필요 여부 | **선택적 G2 만 즉시 가능** (소규모). G1 / G3 / CHECK 는 Tier 4 사이클 완료 후 |
| 보류 항목 | (1) operator create endpoint 도입 검토 (별도 IR), (2) consumer endpoint 인증 정책 (별도 IR), (3) STORE_SERVICE_KEY_MAP cascade 정합 (별도 영역) |
| 코드 / DB / migration / route / API / frontend / menu / dashboard / 권한 수정 | **없음** ✅ |
| 다른 세션 WIP 미포함 | ✅ working tree 의 9개 모디파이드 / 1개 untracked (operator-ux-core layout 추출) 격리 보존 |
| Commit 여부 | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 정책 결정 IR 완료. 권장 옵션 A (operator 업무 확정 — 현재 구조 유지). 즉시 진행 권장: G2 (supplier proposal 매핑 정상화) 만 small WO. G1 / G3 / CHECK 는 Tier 4 사이클 완료 후. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
