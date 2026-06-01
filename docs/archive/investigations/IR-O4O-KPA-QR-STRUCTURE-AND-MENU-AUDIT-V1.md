---
id: IR-O4O-KPA-QR-STRUCTURE-AND-MENU-AUDIT-V1
title: KPA QR-code 구조 / 메뉴 현황 조사 — 운영자→HUB→매장 흐름 구성안 판단
status: completed
date: 2026-05-24
domain: kpa / store-hub / qr-code
related:
  - WO-O4O-QR-LANDING-PAGE-V1
  - WO-O4O-QR-SCAN-ANALYTICS-V1
  - WO-O4O-QR-PRINT-MODULE-V2
  - WO-STORE-QR-PRODUCT-DIRECT-LINK-V1
  - WO-O4O-STORE-HUB-BLOG-CONTENT-IMPORT-V1
  - WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1
  - IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §7 (Boundary Policy — organizationId 단독 조회 금지 규칙 §7.1)
  - docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md
  - docs/baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md
---

# IR-O4O-KPA-QR-STRUCTURE-AND-MENU-AUDIT-V1

> KPA QR-code 가 현재 어디까지 구현되어 있는지 entity / API / frontend / menu 4 축으로 조사하고, Blog/POP 와 같은 **운영자 → HUB → 매장 가져가기** 흐름을 어떤 방식으로 구성할지 판단한다.

---

## 1. 배경

- Phase 3-B 완료: KPA POP 운영자 → HUB → 매장 흐름 닫힘 (commit `b9098d2d5`, [WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1])
- 다음 트랙으로 **QR-code** 논의 시작.
- QR 은 POP 와 달리 entity (`StoreQrCode`) 와 scan tracking (`StoreQrScanEvent`) 이 이미 존재하는 것으로 알려져 있음.
- 본 IR 은 **조사 전용** — 코드 / UI / API / DB / Migration 모두 변경 금지. 다음 WO 의 권장 옵션 도출.

---

## 2. 조사 범위

| # | 범위 | 산출물 |
|---|------|--------|
| 1 | QR entity / table / migration 구조 | 필드 매핑 + 제약 조건 |
| 2 | QR backend API / controller / route mount | endpoint inventory |
| 3 | QR frontend page / route / sidebar menu | 페이지 / 라우트 / 메뉴 매트릭스 |
| 4 | Blog / POP 패턴과 비교 + entity 제약 판단 | gap 표 |
| 5 | 설문 / 태블릿 흐름과 QR 경계 | 사업 boundary |
| 6 | 권장 구현 옵션 (A~E) | 다음 WO 범위 제안 |

---

## 3. 조사 결과 — QR entity / table

### 3.1 `StoreQrCode` ([apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts:23-61](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts#L23-L61))

```typescript
@Entity({ name: 'store_qr_codes' })
export class StoreQrCode {
  id: uuid (PK)
  organizationId: uuid           // 'organization_id' — NOT NULL
  type: varchar(50)              // default 'product'
  title: varchar(300)
  description: text?
  libraryItemId: uuid?           // 'library_item_id' — 논리적 참조 (FK 없음)
  landingType: varchar(50)       // 'landing_type' — product/promotion/page/link/tablet
  landingTargetId: varchar(500)? // 'landing_target_id'
  slug: varchar(200) UNIQUE      // globally unique
  isActive: boolean (default true)
  createdAt / updatedAt
}
```

### 3.2 Migration 제약 ([apps/api-server/src/database/migrations/20260304120000-CreateStoreQrCodes.ts:14-44](apps/api-server/src/database/migrations/20260304120000-CreateStoreQrCodes.ts#L14-L44))

```sql
CREATE TABLE store_qr_codes (
  ...
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ...
  slug VARCHAR(200) NOT NULL,
  ...
);
CREATE UNIQUE INDEX "IDX_store_qr_codes_slug" ON store_qr_codes (slug);
CREATE INDEX "IDX_store_qr_codes_org" ON store_qr_codes (organization_id);
CREATE INDEX "IDX_store_qr_codes_org_active" ON store_qr_codes (organization_id, is_active);
```

### 3.3 `StoreQrScanEvent` ([store-qr-scan-event.entity.ts:23-46](apps/api-server/src/routes/platform/entities/store-qr-scan-event.entity.ts#L23-L46))

```typescript
@Entity({ name: 'store_qr_scan_events' })
export class StoreQrScanEvent {
  id: uuid (PK)
  organizationId: uuid           // NOT NULL
  qrCodeId: uuid                 // 논리적 참조 (FK 없음)
  deviceType: varchar(20)        // default 'desktop'
  userAgent / referer / ipHash
  createdAt
}
```

### 3.4 부재 필드

| 필드 | 상태 | 영향 |
|------|------|------|
| `service_key` | **없음** | cross-service 격리는 `organization_id → organization.service` 간접 조인만 |
| `author_role` | **없음** | operator/store 구분 컬럼 부재 |
| `status` | **없음** (`is_active` boolean 만) | draft/published/archived 단계 표현 불가 |
| `store_id` NULL 허용 | **불가** | `organization_id NOT NULL + FK` — operator 원본을 NULL 로 표현 불가 |
| `(store_id, slug)` 복합 unique | **없음** | slug 가 globally unique — 매장 사본 slug 충돌 가능성 |

### 3.5 정리

- QR entity 는 **"매장이 자기 매장 컨텍스트로 만든 short-URL + landing redirect"** 로 설계됨.
- `organization_id NOT NULL + FK` 제약이 핵심 — **Blog/POP 의 "store_id NULL = operator 원본" 패턴 직접 적용 불가**.
- scan event 도 `organization_id` 단위 집계 — 매장 사본 모델을 도입하면 운영자 입장에서 원본 QR 의 통합 scan 통계를 보기 어려움.

---

## 4. 조사 결과 — QR backend API

### 4.1 Controller — [`store-qr-landing.controller.ts`](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts)

| Endpoint | 권한 | 비고 |
|----------|------|------|
| `GET /qr/public/:slug` | **public** | landing data + scan event 자동 기록 |
| `GET /pharmacy/qr/source/products` | requireAuth + requirePharmacyOwner | 공급자 상품 목록 (QR 직접 연결용) |
| `GET /pharmacy/qr` | requireAuth + requirePharmacyOwner | 내 QR 목록 + scanCount |
| `POST /pharmacy/qr/print` | requireAuth + requirePharmacyOwner | 선택 QR A4 PDF 일괄 |
| `POST /pharmacy/qr` | requireAuth + requirePharmacyOwner | QR 생성 |
| `PUT /pharmacy/qr/:id` | requireAuth + requirePharmacyOwner | QR 수정 |
| `DELETE /pharmacy/qr/:id` | requireAuth + requirePharmacyOwner | soft-delete (`is_active=false`) |
| `GET /pharmacy/qr/:id/analytics` | requireAuth + requirePharmacyOwner | scan 통계 |
| `GET /pharmacy/qr/:id/image` | requireAuth + requirePharmacyOwner | PNG/SVG 다운로드 |

### 4.2 Mount

`createStoreQrLandingController` 가 KPA / GlycoPharm / K-Cosmetics 3 서비스 routes 에 mount ([kpa.routes.ts:397](apps/api-server/src/routes/kpa/kpa.routes.ts#L397), [glycopharm.routes.ts:379](apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L379), [cosmetics.routes.ts:139](apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L139)). `serviceKey` 인자로 `createRequireStoreOwner` 가 cross-service 차단.

### 4.3 부재 endpoint

| 필요 endpoint | 상태 |
|---------------|:----:|
| 운영자 QR 게시 (`/api/v1/kpa/operator/qr/...`) | **없음** |
| 매장 HUB QR 목록 (`hubContentApi` 의 `sourceDomain='qr'`) | **없음** |
| 매장 사본 import (`/stores/:slug/qr/staff/import`) | **없음** |

### 4.4 landingType validation ([store-qr-landing.controller.ts:548](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts#L548))

```typescript
if (!landingType || !['product', 'promotion', 'page', 'link'].includes(landingType)) {
  res.status(400).json({ ... });
}
```

- 4 종 허용. `'tablet'` 은 frontend QrLandingPage 에서 처리하지만 backend POST validation 에는 없음 (별도 경로로 생성?).
- `'survey'` 는 **없음** — 설문 연결은 코드 상 미구현.

---

## 5. 조사 결과 — QR frontend page / route / menu

### 5.1 페이지 inventory

| 페이지 | 경로 | 역할 |
|--------|------|------|
| [`StoreQRPage`](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) | `/store/marketing/qr` | 매장 owner QR 생성 / 수정 / 삭제 / scan 통계 / PDF 출력 |
| [`QrLandingPage`](services/web-kpa-society/src/pages/qr/QrLandingPage.tsx) | `/qr/:slug` (public) | QR 스캔 시 모바일 landing — landingType 별 redirect |
| [`GuideFeatureQrTabletPage`](services/web-kpa-society/src/App.tsx#L607) | `/guide/features/qr` | 기능 안내 (read-only) |

### 5.2 라우트 추가 위치 ([App.tsx:198, 295, 900, 939, 992](services/web-kpa-society/src/App.tsx))

```tsx
const StoreQRPage = lazy(...);    // App.tsx:198
const QrLandingPage = lazy(...);  // App.tsx:295

<Route path="marketing/qr" element={<StoreQRPage />} />             // 900
<Route path="qr" element={<Navigate to="/store/marketing/qr" />} /> // 939 (legacy redirect)
<Route path="/qr/:slug" element={<QrLandingPage />} />              // 992 (public)
```

### 5.3 메뉴 inventory

| 위치 | QR 메뉴 |
|------|:-------:|
| [`PharmacyHubLayout.tsx`](services/web-kpa-society/src/components/pharmacy/PharmacyHubLayout.tsx) (매장 HUB) | **없음** |
| [`OperatorRoutes.tsx`](services/web-kpa-society/src/routes/OperatorRoutes.tsx) (운영자) | **없음** |
| [`operatorMenuGroups.ts`](services/web-kpa-society/src/config/operatorMenuGroups.ts) (운영자 sidebar) | **없음** |
| 매장 store sidebar | `/store/marketing/qr` 단일 진입 (`StoreQRPage`) |

### 5.4 정리

- 매장 owner 측: **완비** (CRUD + scan + print + analytics + product 직접 연결)
- 운영자 측 / 매장 HUB 측: **0개** — Blog/POP 의 Phase 3-A / Phase 3-B 에 대응하는 화면 / 메뉴 / 라우트 모두 부재
- 매장 HUB sidebar 에 'QR' 항목 자체가 없음 — 사용자 발견 경로도 없음

---

## 6. 조사 결과 — Blog / POP 패턴과 비교

### 6.1 패턴 매트릭스

| 요건 | Blog (store_blog_posts) | POP (store_pops) | QR (store_qr_codes) | gap |
|------|:-----------------------:|:----------------:|:-------------------:|-----|
| 운영자 원본 위치 | `store_id IS NULL` | `store_id IS NULL` | (불가) | `organization_id NOT NULL + FK` |
| 매장 사본 위치 | `store_id NOT NULL` | `store_id NOT NULL` | `organization_id NOT NULL` | OK |
| `author_role` 컬럼 | ✅ | ✅ | ❌ | 추가 필요 |
| `service_key` 컬럼 | ✅ | ✅ | ❌ | 추가 필요 (또는 org 조인) |
| `status` 컬럼 | draft/published/archived | draft/published/archived | `is_active` boolean 만 | 추가 필요 |
| slug uniqueness | `(store_id, slug)` | `(store_id, slug)` | global unique | 매장 사본 slug 충돌 위험 |
| FK 제약 | 없음 | 없음 | `organizations(id) CASCADE` | operator 가상 org 필요 또는 NULLABLE 변경 |
| HUB query | `queryBlog` | `queryPop` | 없음 | 신설 필요 |
| import endpoint | `/stores/:slug/blog/staff/import` | `/stores/:slug/pop/staff/import` | 없음 | 신설 필요 |
| asset-snapshot allowedAssetTypes | `'blog'` | `'pop'` | 없음 | 추가 (선택) |

### 6.2 구조적 차이 — 의미 있는 3가지

1. **scan event metadata 의 매장 단위 집계**
   - `store_qr_scan_events.organization_id` 가 매장 사본 단위 — 운영자가 원본 QR 의 전국 통합 scan 통계를 보려면 별도 집계 layer 필요.
   - Blog/POP 은 통계가 없어 단순했지만, QR 은 통계가 사업적 핵심.

2. **QR 이미지 URL = slug 1:1 대응**
   - `/qr/public/:slug` 가 매장 사본별로 새 slug → 매장마다 다른 PNG 인쇄.
   - 운영자가 **하나의 공통 QR PNG 를 모든 매장에 일괄 배포** 하려는 시나리오라면 사본 모델 부적합 — 원본 1개 + share 모델이 더 맞음.
   - 반대로 **landing target 만 공유하고 각 매장이 자기 QR 생성** 시나리오라면 사본 모델이 적합.

3. **landingTargetId 의 매장 컨텍스트 의존성**
   - `landingType='product'` 의 `landingTargetId` = `supplier_product_offers.id` 또는 `organization_product_listings.id` — 매장이 가진 상품 listing 식별자.
   - `landingType='page'` / `'link'` 는 매장 무관 — 공유 가능.
   - 즉 **landingType 별로 가져오기 의미가 다름** — 일률 처리 어려움.

### 6.3 사업 정의의 모호함 (가장 큰 위험)

POP/Blog 는 **콘텐츠 자체가 가치** (글, POP 디자인) — 운영자가 만든 콘텐츠를 매장이 그대로 활용 가능.

QR 은 **URL indirection** 으로 콘텐츠가 아닌 redirect rule. 운영자가 매장에 일괄 배포하는 QR 의 사업적 가치 시나리오:

| 시나리오 | landingType | 사본 모델 적합? | 비고 |
|---------|:-----------:|:---------------:|------|
| A. 회사 공식 페이지 일괄 배포 (예: "약사회 공지 페이지") | `page` | △ | 원본 1개 + share 가 더 맞음 (모든 매장이 같은 URL/PNG) |
| B. 캠페인 landing URL 표준화 | `link` | △ | 동일 |
| C. 공급자 상품 QR 표준화 | `product` | ❌ | landingTargetId 가 매장별 listing 이라 사본 의미 없음 |
| D. 매장 컨텍스트 주입 가능한 template | `tablet` | ✅ | 매장이 자기 컨텍스트 (storeSlug) 주입 — 사본 모델 적합 |
| E. 설문 캠페인 QR | `survey` (미구현) | ❌ | 설문 entity 자체 부재 — 별도 트랙 필요 |

→ **운영자 → 매장 QR 흐름의 사업적 가치가 단일 모델로 환원되지 않음.** Blog/POP 패턴 단순 mirror 시 시나리오 C/E 가 실패할 위험.

---

## 7. 조사 결과 — 설문 / 태블릿 흐름과의 경계

### 7.1 태블릿

- `landingType='tablet'` 이미 frontend [`QrLandingPage:65-68`](services/web-kpa-society/src/pages/qr/QrLandingPage.tsx#L65-L68) 에서 처리: `navigate(/tablet/${storeSlug}?from=qr)`
- backend POST validation 에 `'tablet'` 부재 — 별도 흐름으로 생성된 듯 (조사 범위 외)
- GlycoPharm `event.entity.ts` 의 `sourceType` 에 `'qr' | 'tablet' | 'web' | 'signage' | 'print'` 정의 — funnel/report 에서 사용
- 매장 태블릿 자체는 별도 트랙 (`/tablet/:storeSlug`) — 본 IR QR 트랙과 직교

### 7.2 설문

- `'survey'` landingType / survey entity / survey controller / survey frontend page **모두 부재**
- 설문 구조는 본 IR 범위 외로 명시됨 (사용자 지시)
- 단, 향후 QR + 설문 연결은 운영자 캠페인 핵심 시나리오 (사업 추정) — QR 모델 선택 시 설문 확장성 고려 필요

### 7.3 정리

- QR / 태블릿 / 설문은 **서로 다른 트랙**이며 본 IR 은 QR 만 다룸
- 설문 entity 자체 부재 — 설문 연결 QR 은 설문 구조 설계 선행 후 별도 IR / WO

---

## 8. 권장 구현 옵션

### 8.1 옵션 매트릭스

| 옵션 | 설명 | 작업량 | 사업 정합 | scan 통계 | slug 충돌 | 권장도 |
|:----:|------|:------:|:---------:|:---------:|:--------:|:------:|
| **A** | `store_qr_codes` 에 `service_key + author_role + status + organization_id NULLABLE` 컬럼 추가 + FK 변경 | 大 (migration + 정합 검사) | ⚠️ landingTargetId 매장 의존성 미해결 | 별도 집계 필요 | global unique 변경 필요 | ⚠️ |
| **B** | A 의 부분 (컬럼 추가만, FK 유지) — `organization_id` 에 가상 "운영자 org" 사용 | 中 | ⚠️ 가상 org 운영 복잡 | 동일 | 동일 | ⚠️ |
| **C** | `operator_qr_templates` (신규 entity) — 운영자가 작성하는 QR template (landing 설정만) + 매장이 가져갈 때 store_qr_codes 에 INSERT 변환 | 中~大 (신규 entity + import 흐름) | ✅ 운영자 가치 = "template", 매장 가치 = "내 QR" 으로 분리 | ✅ scan 은 매장 layer 만 — 통합 통계는 origin_template_id 조인으로 별도 | ✅ 매장 layer 는 기존 generation 흐름 그대로 | ★ |
| **D** | C 와 동일 (별도 entity) — 작명 차이만 (`operator_qr_kits` / `hub_qr_blueprints` 등) | C 와 동일 | C 와 동일 | C 와 동일 | C 와 동일 | C 의 변형 |
| **E** | **사업 정의 선행 보류** — "운영자 HUB QR 의 사업적 가치 정의" IR 후 결정 | 小 (IR) | ✅ 모호함 해결 후 진행 | — | — | ★★ |

### 8.2 권장 — **E (사업 정의 선행) + C (구조 후속)**

근거:

1. §6.3 에서 확인된 **사업 시나리오 5개가 단일 모델로 환원되지 않음** — 구조 결정 전 어떤 시나리오를 1차 타깃으로 할지 정의 필요
2. C 는 사업 정의 후 가장 자연스러운 후속이지만, 사업 정의 없이 진행 시 ① landingTargetId 매장 컨텍스트 (시나리오 C), ② 설문 entity 부재 (시나리오 E), ③ 통합 scan 통계 요구 여부 등이 코드 결정에 누락될 위험
3. POP/Blog 는 "콘텐츠 = 가치" 라 mirror 가 자명했지만, QR 은 redirect rule 자체가 매장 컨텍스트와 강결합

대안 (사업 정의 우회 시): **C 의 단순 변형 — `landingType='page'` / `'link'` 만 지원하는 좁은 운영자 QR 흐름**. 시나리오 A/B 만 cover, C/D/E 명시적 제외.

---

## 9. 다음 WO 권장 범위

### 9.1 1순위 (E)

**IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1**

- 범위:
  - "운영자 HUB QR 이 매장에 제공할 가치 시나리오 정의"
  - 시나리오 A~E (§6.3) 중 1차 타깃 결정
  - 사본 모델 vs share 모델 vs hybrid 결정
  - 설문 연결 QR 의 별도 트랙 분리 확정
  - 통합 scan 통계 요구사항 (운영자 needs) 정의
- 산출물: IR 문서. 구조 변경 없음.
- 사용자 의사결정 후 9.2 진행.

### 9.2 2순위 (E 결과 따라 C 또는 A)

**WO-O4O-KPA-OPERATOR-HUB-QR-FOUNDATION-V1** (E 에서 사본 모델 + page/link 시나리오 선택 시)

- 범위:
  - `operator_qr_templates` entity + migration
  - `HubSourceDomain` 에 `'qr'` 추가 + `queryQr` placeholder
  - asset-snapshot `allowedAssetTypes` 에 `'qr'` 추가 + `resolveQr` placeholder
  - Phase 1 Backend Foundation (POP Phase 1 패턴 mirror)
- 산출물: Foundation. 실 구현 (Write API + queryQr + resolveQr) 은 Phase 2 후속.

### 9.3 3순위 (선행 미루기)

**E 보류 + 다른 트랙 우선** — Phase 3-A/3-B (POP) 완료 후 사용자가 다음 트랙으로 KPA POP smoke (계정 복구), Operator Members commonization, 보안 cleanup 등을 우선시할 수도 있음. QR 트랙은 사업 정의 부담이 크므로 우선순위 조정 가능.

---

## 10. 결론

| 질문 | 답 |
|------|-----|
| QR entity 존재? | ✅ `StoreQrCode` + `StoreQrScanEvent` 완비 |
| 매장 owner CRUD ? | ✅ 9개 endpoint 완비 (StoreQRPage 연결) |
| 운영자 QR 게시 화면 / API ? | ❌ 전무 |
| 매장 HUB QR 진열 화면 / API ? | ❌ 전무 |
| Blog/POP 패턴 단순 mirror 가능? | ❌ entity 제약 (`organization_id NOT NULL+FK`, `global unique slug`) + 사업 모델 모호함 |
| 권장 진행 | **E (사업 정의 IR 선행)** → C (별도 entity 신설) 또는 좁은 page/link only A |
| 다음 단계 즉시 진행 가능 항목 | 없음 — 사업 정의 후 |

POP/Blog 패턴을 그대로 mirror 하지 않은 본 IR 의 판단이 사용자 사전 예측 ("`StoreQrCode` 확장형으로 갈 가능성") 과 다른 이유: §6.3 의 사업 시나리오 분기와 §3.4 의 entity 제약 (특히 FK + global unique slug) 이 단순 컬럼 추가로 cover 되지 않는 구조적 부담이기 때문.

---

## 11. 산출물 요약

| 항목 | 결과 |
|------|------|
| 조사 entity | `StoreQrCode`, `StoreQrScanEvent` |
| 조사 migration | `20260304120000-CreateStoreQrCodes`, `20260304130000-CreateStoreQrScanEvents` |
| 조사 backend controller | `store-qr-landing.controller.ts` (9 endpoint) |
| 조사 frontend pages | `StoreQRPage` (매장 owner), `QrLandingPage` (public landing), `GuideFeatureQrTabletPage` (가이드) |
| 운영자 / HUB 측 자산 | **0개** (entity / API / page / route / menu 전부 부재) |
| 권장 진행 | E 사업 정의 선행 + C 별도 entity 후속 |
| 코드 변경 | **없음** (조사 전용 IR) |

---

*Author: Claude (Investigation only — no code change executed)*
*Investigation date: 2026-05-24*
*Status: completed — awaiting business definition (E) before structure WO*
