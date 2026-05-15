# IR-O4O-GROUPBUY-LEGACY-RESIDUE-AUDIT-V1

> **조사 목적:** O4O/KPA 코드 안에 남아 있는 `groupbuy` legacy 잔재 전수 조사. 기능 복구 아님. **삭제 대상 식별**이 목적.
>
> **전제:** `groupbuy` 용어와 `/api/groupbuy/*` 기반 구조는 더 이상 canonical이 아님. Canonical은 Event Offer 구조.
>
> **조사 일자:** 2026-05-15
>
> **기준 커밋:** main (6e7aa99e9)
>
> **상태:** COMPLETE

---

## 목차

1. [핵심 발견사항 요약](#1-핵심-발견사항-요약)
2. [groupbuy 잔재 전체 파일 목록](#2-groupbuy-잔재-전체-파일-목록)
3. [Frontend 잔재 상세 조사](#3-frontend-잔재-상세-조사)
4. [Backend 잔재 상세 조사](#4-backend-잔재-상세-조사)
5. [packages/groupbuy-yaksa 패키지 조사](#5-packagesgroupbuy-yaksa-패키지-조사)
6. [Canonical Event Offer 보호 대상](#6-canonical-event-offer-보호-대상)
7. [삭제 우선순위 분류](#7-삭제-우선순위-분류)
8. [위험도 분석](#8-위험도-분석)
9. [후속 WO 후보](#9-후속-wo-후보)
10. [장기 명칭 정리 후보](#10-장기-명칭-정리-후보)

---

## 1. 핵심 발견사항 요약

### F1. admin-dashboard groupbuy UI — 완전 데드 (즉시 삭제 후보)

`apps/admin-dashboard/src/pages/groupbuy/` + `hooks/groupbuy/` + `components/groupbuy/` 전체가 존재하지 않는 `/api/groupbuy/*` 경로를 호출.  
`apps/admin-dashboard/src/routes/commerce.routes.tsx`가 이 페이지들을 `/admin/groupbuy/*` 라우트에 등록.  
**Admin 메뉴에 등록 없음** — 직접 URL 입력 시만 접근 가능한 상태.  
현재 실행 가능 API 없음 → 완전 비동작. 즉시 삭제 대상.

### F2. packages/groupbuy-yaksa — 고립된 패키지 (삭제 후보)

`packages/groupbuy-yaksa/src/` — 자체 완성 서버 구조(entity/service/route/middleware)를 가진 독립 패키지.  
`register-routes.ts` 줄 342: `// 20. Groupbuy-Yaksa routes` — **주석만 있고 실제 등록 코드 없음**.  
`apps/api-server/src`에서 `import ... from '@o4o/groupbuy-yaksa'` **없음**.  
**apps/api-server/package.json에 의존성 선언은 있으나** 런타임에서 실제 사용 없음.  
CI에서 빌드(`pnpm --filter '@o4o/groupbuy-yaksa' run build`)는 실행됨 — 빌드 오류 발생 시 CI 영향.

### F3. main-site groupbuy UI — 구조 데드 (조사 필요)

`apps/main-site/src/pages/groupbuy/` 의 `GroupbuyListPage`, `GroupbuyDetailPage` 존재.  
`GroupbuyListPage`: `/groupbuy/campaigns` 직접 경로가 아닌 `/groupbuy/campaigns?` 형태로 호출.  
**KPA 서비스(web-kpa-society)가 아니라 main-site에 위치** — 어느 서비스를 위한 UI인지 불명확.  
router에 `/groupbuy`, `/groupbuy/:id` 등록됨 — 접근 가능하나 API dead.

### F4. kpa-groupbuy 서비스 키 — 실제 사용 중인 canonical 식별자

`kpa-groupbuy` 문자열은 **삭제 대상이 아님**. 현재 OPL(organization_product_listings)에서 `service_key='kpa-groupbuy'`로 Event Offer 행을 구분하는 canonical 데이터 키.  
이 키 제거는 DB 마이그레이션 + Event Offer 전체 흐름 변경을 수반 → 별도 WO 필요.

### F5. `/api/v1/kpa/groupbuy-admin/*` — 현재 사용 중인 Event Offer Operator API

경로 이름에 `groupbuy`가 포함되어 있으나 **삭제 대상 아님**.  
web-kpa-society의 `eventOfferAdmin.ts`가 이 경로를 직접 호출 중 (실제 운영 기능).  
장기적으로 경로명 정리(`groupbuy-admin` → `event-offer-admin`) 는 WO 필요.

### F6. `/api/v1/kpa/groupbuy/*` — 현재 사용 중인 Event Offer 사용자 API

`/api/v1/kpa/groupbuy` — `kpa.routes.ts`에서 `createEventOfferController`로 등록됨.  
web-kpa-society의 `eventOffer.ts`가 이 경로 직접 호출 중.  
이 경로도 **삭제 대상 아님**, 장기 명칭 정리 후보.

---

## 2. groupbuy 잔재 전체 파일 목록

### 2-A. 즉시 삭제 후보 (완전 데드 — API 없음)

| 파일 경로 | 유형 | 호출 경로 | 서버 등록 | 삭제 가능 |
|----------|------|----------|---------|---------|
| `apps/admin-dashboard/src/pages/groupbuy/GroupbuyCampaignListPage.tsx` | Frontend UI | `/api/groupbuy/campaigns` | ❌ 미존재 | ✅ |
| `apps/admin-dashboard/src/pages/groupbuy/GroupbuyCampaignDetailPage.tsx` | Frontend UI | `/api/groupbuy/campaigns/:id` | ❌ 미존재 | ✅ |
| `apps/admin-dashboard/src/pages/groupbuy/GroupbuyParticipantsPage.tsx` | Frontend UI | `/api/groupbuy/campaigns/:id/participants` | ❌ 미존재 | ✅ |
| `apps/admin-dashboard/src/pages/groupbuy/GroupbuySettlementPage.tsx` | Frontend UI | (API 없음, 비활성 명시) | ❌ | ✅ |
| `apps/admin-dashboard/src/pages/groupbuy/CampaignFormModal.tsx` | Frontend Component | `/api/groupbuy/campaigns` | ❌ 미존재 | ✅ |
| `apps/admin-dashboard/src/pages/groupbuy/index.ts` | Export barrel | pages/groupbuy 전체 | - | ✅ |
| `apps/admin-dashboard/src/hooks/groupbuy/useGroupbuyCampaigns.ts` | Hook | `/api/groupbuy/campaigns` | ❌ 미존재 | ✅ |
| `apps/admin-dashboard/src/hooks/groupbuy/useCampaignDetail.ts` | Hook | `/api/groupbuy/campaigns/:id` | ❌ 미존재 | ✅ |
| `apps/admin-dashboard/src/hooks/groupbuy/useParticipants.ts` | Hook | `/api/groupbuy/campaigns/:id/participants` + `/api/groupbuy/orders/:id/cancel` | ❌ 미존재 | ✅ |
| `apps/admin-dashboard/src/hooks/groupbuy/index.ts` | Export barrel | hooks/groupbuy 전체 | - | ✅ |
| `apps/admin-dashboard/src/components/groupbuy/GroupbuyStatusBadge.tsx` | Component | (페이지에서만 사용) | - | ✅ |
| `apps/admin-dashboard/src/components/groupbuy/DeadlineCountdown.tsx` | Component | (페이지에서만 사용) | - | ✅ |
| `apps/admin-dashboard/src/components/groupbuy/GroupbuyQuantityProgressBar.tsx` | Component | (페이지에서만 사용) | - | ✅ |
| `apps/admin-dashboard/src/components/groupbuy/index.ts` | Export barrel | components/groupbuy 전체 | - | ✅ |

### 2-B. 라우트 파일 (부분 정리 필요)

| 파일 경로 | 현재 상태 | 처리 |
|----------|---------|------|
| `apps/admin-dashboard/src/routes/commerce.routes.tsx` | `/admin/groupbuy/*` 4개 Route 등록 | **groupbuy 섹션 제거** (dropshipping/order 섹션 유지) |

### 2-C. main-site groupbuy (조사 필요 — 독립 서비스용)

| 파일 경로 | 호출 경로 | 서버 등록 | 처리 |
|----------|---------|---------|------|
| `apps/main-site/src/pages/groupbuy/GroupbuyListPage.tsx` | `/groupbuy/campaigns` | ❌ 미존재 | 추가 판단 필요 |
| `apps/main-site/src/pages/groupbuy/GroupbuyDetailPage.tsx` | `/groupbuy/:id` (경로 패턴 미확인) | ❌ 미존재 | 추가 판단 필요 |
| `apps/main-site/src/router/index.tsx` | `/groupbuy`, `/groupbuy/:id` 등록 | - | groupbuy 라우트 제거 후보 |
| `apps/main-site/src/layouts/MainLayout.tsx` | 네비게이션 `공동구매` 항목 | - | main-site 서비스 정체성 판단 후 결정 |

### 2-D. KPA Society Frontend — 보존 (실제 사용 중)

| 파일 경로 | groupbuy 사용 방식 | 처리 |
|----------|-----------------|------|
| `services/web-kpa-society/src/api/eventOffer.ts` | `/groupbuy/*` 경로 직접 호출 | 장기 경로명 정리 후보 |
| `services/web-kpa-society/src/api/eventOfferAdmin.ts` | `/groupbuy-admin/*` 경로 직접 호출 | 장기 경로명 정리 후보 |
| `services/web-kpa-society/src/types/index.ts` | `groupbuyId` 필드 (EventOfferParticipation) | 장기 타입명 정리 후보 |
| `services/web-kpa-society/src/types/storeListing.ts` | `'event-offer': /groupbuy 계열` 주석 | 보존 (주석 설명용) |
| `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx` | `kpa-groupbuy` serviceKey 식별자 | 보존 (canonical serviceKey) |
| `services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx` | `kpa-groupbuy` serviceKey 식별자 | 보존 (canonical serviceKey) |
| `services/web-kpa-society/src/api/mypage.ts` | `groupbuyParticipations` 필드, `/mypage/groupbuys` | 장기 명칭 정리 후보 |
| `services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx` | `groupbuyParticipations` 필드 참조 | 장기 명칭 정리 후보 |
| `services/web-kpa-society/src/pages/admin/KpaOperatorDashboardPage.tsx` | `/groupbuy-admin/*` API 재사용 주석 | 보존 |
| `services/web-kpa-society/src/components/event-offer/EventOfferContentPanel.tsx` | `kpa-groupbuy` 탭 참조 주석 | 보존 |

### 2-E. Backend API 서버 — 보존 (Event Offer Canonical)

| 파일 경로 | groupbuy 사용 방식 | 처리 |
|----------|-----------------|------|
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | `router.use('/groupbuy-admin', ...)`, `router.use('/groupbuy', ...)` | 장기 경로명 정리 후보 |
| `apps/api-server/src/routes/kpa/controllers/event-offer.controller.ts` | KPA_GROUPBUY serviceKey 사용 | 보존 |
| `apps/api-server/src/routes/kpa/controllers/event-offer-operator.controller.ts` | groupbuy-admin 경로에 등록됨 | 보존 |
| `apps/api-server/src/routes/kpa/services/event-offer.service.ts` | `groupbuyId` 필드 반환 (legacy 호환) | 장기 정리 후보 |
| `apps/api-server/src/constants/service-keys.ts` | `KPA_GROUPBUY: 'kpa-groupbuy'` 상수 | 보존 (canonical serviceKey) |
| `apps/api-server/src/constants/event-offer-service-mapping.ts` | `KPA_SOCIETY → KPA_GROUPBUY` 매핑 | 보존 |
| `apps/api-server/src/config/service-scopes.ts` | `kpa:groupbuy:manage` 스코프 | 장기 정리 후보 |
| `apps/api-server/src/bootstrap/register-routes.ts` | `// 20. Groupbuy-Yaksa routes` 주석 | 주석 정리 필요 |
| `apps/api-server/src/routes/kpa/controllers/mypage.controller.ts` | `GET /groupbuys (placeholder)` 주석 | 주석/경로명 정리 후보 |

### 2-F. Backend 마이그레이션 — 보존 (DB 이력)

| 파일 경로 | 내용 |
|----------|------|
| `apps/api-server/src/migrations/1771200000026-EventOfferCoreReform.ts` | `service_key='kpa-groupbuy'` 데이터 이관 SQL (DB 이력 보존) |
| `apps/api-server/src/database/migrations/20260906100000-AddEventOfferColumnsToListings.ts` | Event Offer 컬럼 추가 |
| `apps/api-server/src/database/migrations/20260309200000-SeedProductServiceKeys.ts` | kpa-groupbuy 시드 |

### 2-G. packages/groupbuy-yaksa — 별도 WO 판단

| 경로 | 내용 | 처리 |
|------|------|------|
| `packages/groupbuy-yaksa/src/` | 독립 패키지 전체 | 별도 WO 후 삭제 |
| `packages/groupbuy-yaksa/package.json` | `@o4o/groupbuy-yaksa` 패키지 선언 | - |
| `apps/api-server/package.json` | `@o4o/groupbuy-yaksa` dependency 선언 | 패키지 삭제 후 제거 |
| `.github/workflows/deploy-api.yml` | `pnpm --filter '@o4o/groupbuy-yaksa' run build` | 패키지 삭제 후 제거 |

### 2-H. 문서 (보존, 이력 목적)

| 파일 경로 | 내용 |
|----------|------|
| `docs/investigations/IR-O4O-KPA-GROUPBUY-ARCHITECTURE-AUDIT-V1.md` | 과거 조사 이력 — 보존 |
| `docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md` | Event Offer canonical 정의 — 보존 |
| `docs/baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md` | Event Offer 통합 정의 — 보존 |
| `docs/event-offer/EventOffer-Final-Summary.md` | Event Offer 최종 정리 — 보존 |

---

## 3. Frontend 잔재 상세 조사

### 3.1 admin-dashboard/pages/groupbuy 전체

**위치:** `apps/admin-dashboard/src/pages/groupbuy/`

6개 파일:
- `GroupbuyCampaignListPage.tsx` — `useGroupbuyCampaigns` hook 의존 → `/api/groupbuy/campaigns` dead
- `GroupbuyCampaignDetailPage.tsx` — `useCampaignDetail` hook 의존 → dead
- `GroupbuyParticipantsPage.tsx` — `useParticipants` hook 의존 → dead
- `GroupbuySettlementPage.tsx` — **파일 내 DISABLED 명시**, 실제 API 없음
- `CampaignFormModal.tsx` — `useGroupbuyCampaigns.createCampaign/updateCampaign` → dead
- `index.ts` — barrel export

**현재 참조:**
- `apps/admin-dashboard/src/routes/commerce.routes.tsx`에서 lazy import
- 해당 라우트: `/admin/groupbuy`, `/admin/groupbuy/settlement`, `/admin/groupbuy/:id`, `/admin/groupbuy/:id/participants`

**메뉴 노출:** `admin-menu.static.tsx`에 groupbuy 항목 없음 → 직접 URL 접근 시만 렌더링됨.

**실제 실행 가능 여부:** ❌ — 모든 API 호출이 `/api/groupbuy/*` 기반이며 서버 미등록.

**TypeScript 영향:** `pages/groupbuy/index.ts`가 `CampaignFormModal`을 named export. `commerce.routes.tsx`에서만 소비됨.

### 3.2 admin-dashboard/hooks/groupbuy 전체

**위치:** `apps/admin-dashboard/src/hooks/groupbuy/`

3개 훅:
- `useGroupbuyCampaigns` — `/api/groupbuy/campaigns` CRUD (POST/PUT/DELETE/GET)
- `useCampaignDetail` — `/api/groupbuy/campaigns/:id` GET
- `useParticipants` — `/api/groupbuy/campaigns/:id/participants` + `/api/groupbuy/orders/:id/cancel`

**현재 참조:**
- `pages/groupbuy/*.tsx` 5개 파일에서만 사용
- hooks 외부에서 import 없음 (`GroupbuyStatusBadge` 등 components도 pages/groupbuy에서만 사용)

### 3.3 admin-dashboard/components/groupbuy 전체

**위치:** `apps/admin-dashboard/src/components/groupbuy/`

- `GroupbuyStatusBadge` — `pages/groupbuy/GroupbuyCampaignListPage` + `GroupbuyCampaignDetailPage`에서 사용
- `DeadlineCountdown` — 동일
- `GroupbuyQuantityProgressBar` — **현재 어떤 파일에서도 import 미확인** (사용 여부 재확인 필요)

### 3.4 commerce.routes.tsx groupbuy 섹션

```tsx
// 삭제 대상 (lines 79-108)
<Route path="/admin/groupbuy" ... />
<Route path="/admin/groupbuy/settlement" ... />
<Route path="/admin/groupbuy/:id" ... />
<Route path="/admin/groupbuy/:id/participants" ... />
```

`dropshipping` 섹션과 `order` 섹션은 **보존** 필요.

### 3.5 service-content-manager/types.ts

줄 174: `//   id: 'yaksa-groupbuy',` — **주석 처리됨**. 이미 비활성. 추가 처리 불필요.

### 3.6 main-site groupbuy

**상황 특이:** `apps/main-site`는 KPA Society 전용이 아님. `GroupbuyListPage`가 `/groupbuy/campaigns` 를 직접 호출하나 이 경로는 `register-routes.ts`에 미등록.  
`MainLayout.tsx` 네비게이션에 `공동구매` 항목 존재 → 일반 사용자가 접근 가능한 dead link.

**의존성:** `apps/main-site/src/router/index.tsx`에서 lazy import → 빌드에는 포함됨.

---

## 4. Backend 잔재 상세 조사

### 4.1 register-routes.ts 주석

```typescript
// 20. Groupbuy-Yaksa routes - @o4o/groupbuy-yaksa
```

**실제 등록 코드 없음** — 주석만 존재. 패키지가 import되거나 `app.use()`가 호출되는 코드 없음.  
즉, `@o4o/groupbuy-yaksa` 패키지는 api-server 빌드에 포함되나 런타임에 사용되지 않음.

### 4.2 KPA routes에서 실제 사용 중인 groupbuy 경로

```typescript
// kpa.routes.ts:240
router.use('/groupbuy-admin', createEventOfferOperatorController(...))
// kpa.routes.ts:2202
router.use('/groupbuy', createEventOfferController(...))
```

**두 경로 모두 보존 대상** — KPA Society 운영 핵심 기능.  
- `/api/v1/kpa/groupbuy-admin/*` → `eventOfferAdmin.ts`에서 호출
- `/api/v1/kpa/groupbuy/*` → `eventOffer.ts`에서 호출

### 4.3 service-keys.ts

```typescript
KPA_GROUPBUY: 'kpa-groupbuy',
```

DB `organization_product_listings.service_key` 의 canonical 값. 삭제 불가.

### 4.4 service-scopes.ts

```typescript
'kpa:groupbuy:manage',
```

`kpa:operator` 역할에 할당된 스코프. 현재 이 스코프가 어디서 guard에 사용되는지 추가 확인 필요 (이번 조사 범위 외).

### 4.5 event-offer.service.ts

```typescript
groupbuyId: (o.metadata as any)?.productListingId || '',
groupbuy: { title: ... },
```

**legacy 응답 필드** — 과거 캠페인 구조(GroupbuyCampaign) 호환성을 위한 필드.  
현재 KPA Society 프론트엔드 `types/index.ts`의 `EventOfferParticipation.groupbuyId`가 이 필드를 소비.  
장기 명칭 정리 시 함께 처리 필요.

### 4.6 mypage.controller.ts

```typescript
* - GET /groupbuys        (authenticate) — Groupbuys (placeholder)
```

**주석만 있고 실제 라우트 핸들러 없음** (grep 결과 `router.get.*groupbuy` 없음).  
`web-kpa-society/api/mypage.ts`의 `getMyEventOffers`가 `/mypage/groupbuys` 경로 호출 → 서버 미구현.  
**별도 주의 필요** — mypage groupbuys API가 placeholder 상태임.

---

## 5. packages/groupbuy-yaksa 패키지 조사

### 구조

```
packages/groupbuy-yaksa/
├── src/
│   ├── backend/
│   │   ├── entities/
│   │   │   ├── GroupbuyCampaign.ts      ← 독립 Entity (DB 테이블 없음)
│   │   │   ├── CampaignProduct.ts
│   │   │   ├── GroupbuyOrder.ts
│   │   │   └── SupplierProfile.ts
│   │   ├── services/
│   │   │   ├── GroupbuyCampaignService.ts
│   │   │   ├── CampaignProductService.ts
│   │   │   └── GroupbuyOrderService.ts
│   │   ├── routes/
│   │   │   └── groupbuy.routes.ts       ← GET/POST /campaigns, /orders, /products
│   │   └── middleware/
│   │       └── groupbuy-auth.middleware.ts
│   ├── lifecycle/
│   │   ├── install.ts / activate.ts / deactivate.ts / uninstall.ts
│   └── manifest.ts                      ← status: 'development'
```

### 실제 등록 여부

| 체크 항목 | 결과 |
|---------|------|
| `register-routes.ts`에 등록 코드 | ❌ 없음 (주석만) |
| api-server/src에 import | ❌ 없음 |
| DB 마이그레이션 (테이블 생성) | ❌ 없음 |
| manifest.status | `'development'` (비프로덕션) |

### 패키지 자체 API

`groupbuy.routes.ts`는 `/campaigns`, `/orders`, `/products` 경로 정의 — **`/api/groupbuy/campaigns`** 패턴.  
admin-dashboard hooks가 호출하는 `/api/groupbuy/campaigns`와 경로 패턴이 **일치**하나:
1. 실제 서버 등록 없음
2. 등록해도 `apps/api-server`에서 `/api/groupbuy` prefix 등록 코드 없음

**이 패키지가 과거 admin-dashboard groupbuy UI의 서버 구현 의도로 만들어졌다고 판단.**

### CI 영향

```yaml
# .github/workflows/deploy-api.yml:102
pnpm --filter '@o4o/groupbuy-yaksa' run build
```

CI에서 빌드됨 → 패키지 삭제 시 CI 스크립트 수정 필요.

### apps/api-server/packages/groupbuy-yaksa

`apps/api-server/packages/groupbuy-yaksa/` — `dist/`만 있는 빌드 결과물 디렉토리.  
`pnpm workspace` 로컬 링크용으로 추정. 패키지 삭제 시 함께 제거.

---

## 6. Canonical Event Offer 보호 대상

> **아래 항목은 groupbuy 문자열이 포함되어 있어도 삭제/변경 금지.**

| 항목 | 이유 |
|------|------|
| `SERVICE_KEYS.KPA_GROUPBUY = 'kpa-groupbuy'` | OPL `service_key` column의 canonical 데이터 값 |
| `TARGET_TO_EVENT_OFFER_KEY` 매핑 (`KPA_SOCIETY → KPA_GROUPBUY`) | event-offer-service-mapping.ts, 경로 변환 로직 |
| `router.use('/groupbuy-admin', ...)` | KPA Operator Event Offer 관리 API (실제 운영 중) |
| `router.use('/groupbuy', ...)` | KPA 사용자 Event Offer 열람/참여 API (실제 운영 중) |
| `eventOfferAdmin.ts`의 `/groupbuy-admin/*` 호출 | web-kpa-society 실운영 기능 |
| `eventOffer.ts`의 `/groupbuy/*` 호출 | web-kpa-society 실운영 기능 |
| `PharmacyB2BPage.tsx`의 `'kpa-groupbuy'` serviceKey | 매장 B2B 탭 Event Offer 필터 |
| `PharmacySellPage.tsx`의 `'kpa-groupbuy'` serviceKey | 매장 판매 탭 Event Offer 필터 |
| DB 마이그레이션 파일들 | 이력 보존 |
| `kpa:groupbuy:manage` 스코프 (service-scopes.ts) | Operator 권한 정의 |

---

## 7. 삭제 우선순위 분류

### 7-A. 즉시 삭제 가능 (의존성 없는 완전 dead)

| 항목 | 이유 |
|------|------|
| `apps/admin-dashboard/src/pages/groupbuy/` (6파일) | API dead, 메뉴 미노출, 독립 의존 트리 |
| `apps/admin-dashboard/src/hooks/groupbuy/` (4파일) | pages/groupbuy에서만 사용, API dead |
| `apps/admin-dashboard/src/components/groupbuy/` (4파일) | pages/groupbuy에서만 사용 |
| `apps/admin-dashboard/src/routes/commerce.routes.tsx`의 groupbuy 섹션 | 4개 Route 제거 (파일 자체는 유지) |

**삭제 전 TypeScript 검증 필요:**
- `GroupbuyQuantityProgressBar.tsx` — 현재 어디서도 import 안 되는 것으로 추정되나 재확인 필요
- `commerce.routes.tsx` 수정 후 TypeScript 컴파일 에러 없음 확인

### 7-B. Event Offer로 대체 후 삭제

| 항목 | 대체 방향 |
|------|---------|
| `apps/main-site/src/pages/groupbuy/` (2파일) | main-site용 Event Offer 페이지 신규 작성 또는 main-site에서 groupbuy 기능 제거 결정 필요 |
| `apps/main-site/src/layouts/MainLayout.tsx` 네비게이션 `공동구매` 항목 | main-site 서비스 정체성 결정 후 처리 |

### 7-C. 이름만 변경 필요 (장기)

| 항목 | 변경 방향 |
|------|---------|
| `kpa.routes.ts`의 `/groupbuy-admin`, `/groupbuy` 경로 | `/event-offer-admin`, `/event-offers` |
| `api/eventOffer.ts`의 경로 문자열 | `/event-offers/*` |
| `api/eventOfferAdmin.ts`의 경로 문자열 | `/event-offer-admin/*` |
| `EventOfferParticipation.groupbuyId` 타입 필드 | `eventOfferId` |
| `event-offer.service.ts`의 `groupbuyId` 반환 필드 | `eventOfferId` |
| `service-scopes.ts`의 `kpa:groupbuy:manage` | `kpa:event-offer:manage` |
| `mypage.controller.ts`의 `/groupbuys` placeholder | `/event-offers` |
| `mypage.ts`의 `getMyEventOffers` → `/mypage/groupbuys` | `/mypage/event-offers` |

### 7-D. 보존 필요

| 항목 | 이유 |
|------|------|
| `SERVICE_KEYS.KPA_GROUPBUY` + DB 데이터 | canonical serviceKey, DB 마이그레이션 전 변경 불가 |
| `event-offer-service-mapping.ts` | 서비스 매핑 로직 |
| DB 마이그레이션 파일 전체 | 이력 보존 |

### 7-E. 별도 WO 판단 필요

| 항목 | 판단 기준 |
|------|---------|
| `packages/groupbuy-yaksa/` 전체 | 패키지 역할 확정 후 삭제. CI 영향 있음 |
| `apps/api-server/package.json`의 `@o4o/groupbuy-yaksa` 의존성 | 패키지 삭제 연동 |
| `.github/workflows/deploy-api.yml`의 groupbuy 빌드 라인 | 패키지 삭제 연동 |

---

## 8. 위험도 분석

### 8.1 즉시 삭제 (7-A) 위험도

| 영향 영역 | 위험도 | 설명 |
|---------|-------|------|
| TypeScript | 🟡 LOW | `commerce.routes.tsx` 수정 후 TS 오류 없음 확인 필요 |
| Route | 🟢 NONE | `/admin/groupbuy/*` 라우트 없어져도 실제 사용자 없음 (메뉴 미노출) |
| Menu | 🟢 NONE | admin-menu.static.tsx에 groupbuy 항목 없음 |
| Build | 🟢 NONE | pages/hooks/components 모두 commerce.routes만 참조 |
| CI | 🟢 NONE | 해당 파일들 CI path에 없음 |
| 운영 화면 | 🟢 NONE | 현재 아무도 접근 불가 (API dead + 메뉴 없음) |

### 8.2 packages/groupbuy-yaksa 삭제 위험도

| 영향 영역 | 위험도 | 설명 |
|---------|-------|------|
| TypeScript | 🟢 NONE | api-server/src에서 import 없음 |
| Route | 🟢 NONE | register-routes.ts에 등록 코드 없음 |
| Build | 🟡 MEDIUM | `deploy-api.yml:102` CI 스크립트 수정 필요 (누락 시 CI 실패) |
| CI | 🟡 MEDIUM | 위와 동일 |
| 운영 화면 | 🟢 NONE | 런타임 미사용 |
| DB | 🟢 NONE | 패키지 자체 테이블 없음 (DB 마이그레이션 없음) |

### 8.3 main-site groupbuy 삭제 위험도

| 영향 영역 | 위험도 | 설명 |
|---------|-------|------|
| TypeScript | 🟡 LOW | router/index.tsx 수정 필요 |
| Route | 🟡 LOW | main-site가 어느 서비스인지 명확히 해야 함 |
| 운영 화면 | 🔴 UNKNOWN | main-site 사용자에게 노출 중인 `공동구매` 링크 — dead이나 visible |

### 8.4 명칭 정리 (7-C) 위험도

| 영향 영역 | 위험도 | 설명 |
|---------|-------|------|
| API 경로 변경 | 🔴 HIGH | 동시 배포 필요 (Backend 경로 + Frontend 호출 동시 변경) |
| DB serviceKey | 🔴 HIGH | `kpa-groupbuy` → 마이그레이션 + 모든 코드 변경 동시 필요 |
| 운영 화면 | 🔴 HIGH | 배포 중 순간 단절 위험 |

---

## 9. 후속 WO 후보

### WO-O4O-GROUPBUY-ADMIN-DASHBOARD-CLEANUP-V1 (즉시 실행 가능)

**목적:** admin-dashboard groupbuy 완전 삭제  
**범위:**
- `apps/admin-dashboard/src/pages/groupbuy/` 전체 삭제
- `apps/admin-dashboard/src/hooks/groupbuy/` 전체 삭제
- `apps/admin-dashboard/src/components/groupbuy/` 전체 삭제
- `apps/admin-dashboard/src/routes/commerce.routes.tsx` groupbuy 섹션 제거

**사전 조건:** TypeScript 컴파일 에러 없음 확인  
**위험도:** LOW

---

### WO-O4O-GROUPBUY-YAKSA-PACKAGE-DEPRECATION-V1

**목적:** packages/groupbuy-yaksa 패키지 제거  
**범위:**
- `packages/groupbuy-yaksa/src/` 삭제
- `apps/api-server/package.json`에서 `@o4o/groupbuy-yaksa` 의존성 제거
- `apps/api-server/packages/groupbuy-yaksa/` 삭제
- `.github/workflows/deploy-api.yml` 줄 102 제거
- `apps/api-server/src/bootstrap/register-routes.ts` 주석 줄 342 제거

**사전 조건:** api-server 빌드 오류 없음 확인  
**위험도:** LOW-MEDIUM (CI 변경)

---

### WO-O4O-MAIN-SITE-GROUPBUY-CLEANUP-V1

**목적:** main-site groupbuy UI 정리  
**사전 조건:** main-site의 서비스 정체성 결정 (KPA-only? 플랫폼 공통?)  
**위험도:** UNKNOWN (운영 영향 확인 필요)

---

### WO-O4O-EVENT-OFFER-CANONICAL-RENAME-V1 (장기)

**목적:** `/groupbuy` → `/event-offers`, `kpa-groupbuy` serviceKey 마이그레이션  
**사전 조건:** Event Offer 전체 흐름 안정화 + DB 마이그레이션 계획  
**위험도:** HIGH (동시 배포 필요)

---

## 10. 장기 명칭 정리 후보

> **이 섹션은 식별만 한다. 당장 실행 아님.**

### 경로명 정리

| 현재 | 목표 | 영향 범위 |
|------|------|---------|
| `/api/v1/kpa/groupbuy-admin/*` | `/api/v1/kpa/event-offer-admin/*` | kpa.routes.ts + eventOfferAdmin.ts 동시 |
| `/api/v1/kpa/groupbuy/*` | `/api/v1/kpa/event-offers/*` | kpa.routes.ts + eventOffer.ts 동시 |
| `/mypage/groupbuys` | `/mypage/event-offers` | mypage.controller.ts + mypage.ts 동시 |

### serviceKey 정리

| 현재 | 목표 | 영향 범위 |
|------|------|---------|
| `kpa-groupbuy` | `kpa-event-offer` | DB 마이그레이션 + service-keys.ts + event-offer-service-mapping.ts + PharmacyB2BPage + PharmacySellPage + 모든 OPL 쿼리 |

> ⚠️ serviceKey 변경은 DB row 전체 영향. 별도 마이그레이션 계획 필요.

### 타입/필드명 정리

| 현재 | 목표 | 파일 |
|------|------|------|
| `EventOfferParticipation.groupbuyId` | `.eventOfferId` | types/index.ts + event-offer.service.ts |
| `groupbuyParticipations` | `eventOfferParticipations` | mypage.ts + MyDashboardPage.tsx |
| `kpa:groupbuy:manage` | `kpa:event-offer:manage` | service-scopes.ts |

---

## 부록: 조사 방법

**검색 기준:** `groupbuy` 전체 문자열 검색 (90개 파일 발견, 문서 파일 제외 후 실코드 조사)

**확인 방법:**
1. `register-routes.ts` — 서버 등록 여부 확인
2. `kpa.routes.ts` — KPA 도메인 라우트 트리 확인
3. 각 파일별 실제 API 호출 경로 추출
4. 해당 경로가 서버에 실제 등록되어 있는지 교차 확인
5. admin-menu.static.tsx — 메뉴 노출 여부 확인
6. packages/groupbuy-yaksa 구조 및 CI 참조 확인

**조사 완전성:** 90개 파일 중 문서(docs/) 제외, 실코드 파일 전수 확인 완료.

---

*Auditor: Claude Code (IR-O4O-GROUPBUY-LEGACY-RESIDUE-AUDIT-V1)*
*Date: 2026-05-15*
*Method: Full grep traversal + file reads + cross-reference with register-routes.ts*
*Status: Complete*
