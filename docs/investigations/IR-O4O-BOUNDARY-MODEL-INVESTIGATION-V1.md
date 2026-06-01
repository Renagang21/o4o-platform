# IR-O4O-BOUNDARY-MODEL-INVESTIGATION-V1

> Investigation Report: O4O Platform Boundary Model Analysis
> 2026-02-24

---

## 1. 조사 목적

O4O 플랫폼에서 `serviceKey`와 `organization_id` 중 실제 경계(Source of Truth)가 무엇인지,
코드 기준으로 규명한다.

### 핵심 질문

1. serviceKey만으로 완전 분리되는가?
2. organization_id가 반드시 함께 필요하게 설계되어 있는가?
3. 둘 중 하나가 빠지면 교차 노출 가능성이 있는가?

---

## 2. Boundary Dependency Matrix

### 분류 기준

| Class | 정의 | 경계 모델 |
|-------|------|----------|
| **A** | serviceKey + organizationId 모두 존재 | 복합 경계 |
| **B** | serviceKey만 존재 | 서비스 단독 경계 |
| **C** | organizationId만 존재 | 조직 단독 경계 |
| **D** | 둘 다 없음 | 대체 식별자 사용 |

### 전체 테이블 매트릭스

#### Class A — 복합 경계 (serviceKey + organizationId)

| 테이블 | serviceKey | organizationId | 비고 |
|--------|:---------:|:--------------:|------|
| `cms_contents` | nullable | nullable | 핵심 콘텐츠 테이블 |
| `cms_content_slots` | nullable | nullable | 콘텐츠 슬롯 |
| `channels` | nullable | nullable | CMS 채널 |
| `channel_heartbeats` | nullable | nullable | |
| `channel_playback_logs` | nullable | nullable | |
| `signage_media` | **required** | nullable | 사이니지 미디어 |
| `signage_playlists` | **required** | nullable | 사이니지 재생목록 |
| `signage_schedules` | **required** | nullable | |
| `signage_templates` | **required** | nullable | |
| `signage_content_blocks` | **required** | nullable | |
| `signage_analytics` | **required** | nullable | |
| `signage_ai_generation_logs` | **required** | nullable | |
| `organization_product_listings` | `service_key` (default='kpa') | `organization_id` | 상품 리스팅 |
| `organization_product_applications` | `service_key` | `organization_id` | 상품 신청 |

**특징**: organizationId가 **nullable** — global 콘텐츠(HQ/supplier)는 org 없이 존재 가능.

#### Class B — serviceKey만 존재

| 테이블 | serviceKey | 비고 |
|--------|:---------:|------|
| `signage_playlist_shares` | required | 재생목록 공유 |
| `signage_layout_presets` | nullable | 레이아웃 프리셋 |
| `signage_media_tags` | required | 미디어 태그 |
| `billing_invoices` | YES | GlycoPharm 청구 |
| `store_blog_posts` | YES | 매장 블로그 |

#### Class C — organizationId만 존재

| 테이블 | organizationId | 비고 |
|--------|:--------------:|------|
| `cms_menus` | required | CMS 메뉴 |
| `cms_views` | required | CMS 뷰 |
| `cms_templates` | required | CMS 템플릿 |
| `cms_medias` | required | CMS 미디어 |
| `cms_settings` | required | CMS 설정 |
| `forum_post` | nullable | 커뮤니티 포럼 |
| `forum_category` | nullable | 포럼 카테고리 |
| `store_local_products` | required | 매장 자체 상품 |
| `store_tablets` | required | 태블릿 디바이스 |
| `kpa_store_contents` | required | KPA 매장 콘텐츠 |
| `kpa_store_asset_controls` | required | 자산 제어 |
| `store_playlists` (KPA) | required | 매장 재생목록 |
| `o4o_asset_snapshots` | required | 자산 스냅샷 |
| `organization_channels` | required | 조직 채널 |
| `organization_service_enrollments` | required | 서비스 등록 |

**특징**: Forum의 organizationId는 **nullable** — `IS NULL` = 커뮤니티 (전체 공개).

#### Class D — 둘 다 없음 (대체 식별자)

| 테이블 | 대체 식별자 | 비고 |
|--------|-----------|------|
| `ecommerce_orders` | `storeId`, `buyerId`, `sellerId` | 주문 |
| `ecommerce_order_items` | `orderId` FK | 주문 항목 |
| `ecommerce_payments` | `orderId` FK | 결제 |
| `checkout_orders` | `sellerOrganizationId` | 체크아웃 |
| `o4o_payments` | `sourceService` | 통합 결제 |
| `organizations` | PK (id) | 조직 자체 |
| `physical_stores` | — | 물리 매장 |
| `physical_store_links` | `serviceType` | 매장 연결 |

**특징**: E-commerce는 `storeId`라는 **제3의 식별자**를 사용.

---

## 3. Hub 집계 쿼리 경계 분석

### 서비스별 Primary Boundary 사용 현황

| 서비스/모듈 | Primary Boundary | Secondary | serviceKey 사용 | organizationId 사용 |
|------------|:----------------:|:---------:|:---------------:|:-------------------:|
| **HubContentQueryService** | serviceKey | scope, source | YES (param) | NO |
| **ContentQueryService** | serviceKey | authorRole, visibility | YES (array) | NO |
| **SignageQueryService** | serviceKey | source | YES (config) | NO |
| **ForumQueryService** | organizationId | — | **NO** | YES (IS NULL or = value) |
| **operator-summary** | serviceKey | — | YES (hardcoded) | NO (forum만 orgId) |
| **StoreHubController** | organizationId | — | **NO** | YES (from auth) |
| **GlycopharmStoreDataAdapter** | storeId | — | **NO** | **NO** |
| **CosmeticsStoreDataAdapter** | storeId | — | **NO** | **NO** |

### 핵심 발견

```
Content/Signage → serviceKey가 Primary
Forum          → organizationId가 Primary (serviceKey 개념 없음)
Store/Hub      → organizationId가 Primary
E-commerce     → storeId가 Primary (제3 식별자)
```

**O4O는 단일 경계 모델이 아니라 도메인별 하이브리드 경계 모델을 사용한다.**

---

## 4. 교차 노출(Cross-Exposure) 분석

### RISK (교차 노출 가능성)

| # | 위치 | 문제 | 영향 |
|---|------|------|------|
| R-1 | `member-home-query.service.ts` | `forum_posts` 쿼리에 serviceKey/organizationId 필터 없음. 전체 플랫폼 게시물 반환 | 서비스 간 포럼 데이터 혼합 |
| R-2 | `unified-store-public.routes.ts:922` | tablet request UUID만으로 조회, 매장 소유권 검증 없음 | 타 매장 요청 상태/내용 노출 |
| R-3 | `signage.controller.ts:62` | `x-service-key` 헤더 fallback으로 serviceKey 스푸핑 가능 | 타 서비스 사이니지 접근 |
| R-4 | `signage.repository.ts` | `incrementPlaylistDownloadCount`, `incrementPlaylistLikeCount`, `reorderPlaylistItems` — UUID만으로 변경, 스코프 검증 없음 | 타 서비스 사이니지 데이터 변조 |

### WARNING (경미한 경계 부재)

| # | 위치 | 문제 | 영향 |
|---|------|------|------|
| W-1 | `store-hub.controller.ts:173` | `cms_contents` 조직 콘텐츠 카운트에 serviceKey 필터 없음 | 교차 서비스 KPI 부풀림 |
| W-2 | `neture.routes.ts:1287` | CMS ID 조회에 serviceKey 가드 없음 | 타 서비스 CMS 메타데이터 노출 |
| W-3 | `neture.routes.ts:1392` | `service_key IN ('neture', 'glycopharm') OR service_key IS NULL` — 의도적 교차 쿼리 | 설계 의도이나 문서화 필요 |
| W-4 | `dashboard-assets.routes.ts:316` | CMS viewCount 조회에 serviceKey 없음 | 비민감 지표만 노출 |
| W-5 | `sellerops/OrderIntegrationService.ts:196` | 주문 ID만으로 조회, 판매자 소유권 검증 없음 | orderType/paymentStatus 노출 |
| W-6 | `signage-public.routes.ts:255` | playlist items 서브쿼리에서 media serviceKey 미검증 | 부모 playlist 검증에 의존 |

### SAFE (정상 경계 적용)

- `signage-public.routes.ts` 목록/상세 API
- `operator-summary.controller.ts` 모든 카운트 쿼리
- `hub-content.service.ts` 모든 쿼리
- `signage-query.service.ts` Home 쿼리
- `content-query.service.ts` 모든 쿼리
- E-commerce 어댑터 (`storeId` 기반)
- Store Hub 채널/주문 KPI (`organizationId` 기반)
- `unified-store-public.routes.ts` 상품 쿼리 (4중 Gate)

---

## 5. 경계 모델 판정

### 3가지 후보 평가

| 패턴 | 설명 | O4O 적합도 |
|------|------|:----------:|
| **A. serviceKey 단독 절대 경계** | 모든 테이블에 serviceKey, 모든 쿼리에 serviceKey 필수 | **불일치** — Forum, Store Hub, E-commerce에 serviceKey 없음 |
| **B. organization + serviceKey 복합 경계** | 둘 다 항상 함께 사용 | **부분 일치** — Class A 테이블만 해당, 나머지는 한쪽만 |
| **C. UI 레벨 분리** | DB/API 공유, 프론트엔드만 분리 | **불일치** — DB 레벨 컬럼/FK 존재 |

### 실제 O4O 경계 모델: **Domain-Specific Hybrid**

```
┌─────────────────────────────────────────────────────────────┐
│                    O4O Boundary Model                       │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Content Domain   │  │ Commerce Domain  │                  │
│  │ (CMS, Signage)  │  │ (Order, Payment) │                  │
│  │                 │  │                  │                  │
│  │ Primary:        │  │ Primary:         │                  │
│  │  serviceKey     │  │  storeId         │                  │
│  │ Secondary:      │  │ Secondary:       │                  │
│  │  organizationId │  │  sellerId        │                  │
│  │  scope, source  │  │  sellerOrgId     │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Community Domain │  │ Store Ops Domain │                  │
│  │ (Forum)         │  │ (Hub, Tablet,    │                  │
│  │                 │  │  LocalProduct)   │                  │
│  │ Primary:        │  │ Primary:         │                  │
│  │  organizationId │  │  organizationId  │                  │
│  │  (NULL=global)  │  │                  │                  │
│  │ Secondary:      │  │ Secondary:       │                  │
│  │  (없음)         │  │  (없음)          │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────┐                                        │
│  │ Product Domain   │                                        │
│  │ (Listing,Channel)│                                        │
│  │                 │                                        │
│  │ Primary:        │                                        │
│  │  organizationId │                                        │
│  │ Secondary:      │                                        │
│  │  serviceKey     │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 핵심 질문 답변

### Q1: serviceKey만으로 완전 분리되는가?

**아니오.**

- Forum 전체 도메인에 serviceKey 개념 없음
- Store Hub/Tablet/LocalProduct에 serviceKey 없음
- E-commerce 주문/결제에 serviceKey 없음
- serviceKey가 존재하는 곳에서도 nullable인 경우 다수

### Q2: organization_id가 반드시 함께 필요하게 설계되어 있는가?

**도메인에 따라 다르다.**

- Content/Signage: organizationId는 optional (global 콘텐츠는 org 없음)
- Forum: organizationId가 유일한 경계 (NULL = 커뮤니티)
- Store Ops: organizationId가 유일한 경계
- E-commerce: organizationId 대신 storeId 사용

### Q3: 둘 중 하나가 빠지면 교차 노출 가능성이 있는가?

**있다.** 4건의 RISK와 6건의 WARNING 확인.

가장 심각한 교차 노출 경로:
1. `member-home-query.service.ts` — 포럼 게시물 전체 플랫폼 노출
2. `signage.controller.ts` — x-service-key 헤더 스푸핑
3. `signage.repository.ts` — UUID만으로 사이니지 데이터 변조
4. `unified-store-public.routes.ts` — 태블릿 요청 소유권 미검증

---

## 7. 컬럼명 불일치 문제

동일 개념에 두 가지 컬럼명 컨벤션이 공존:

| 컨벤션 | 사용 위치 | 예시 |
|--------|----------|------|
| **camelCase** | CMS Core, Signage Core (packages/) | `"serviceKey"`, `"organizationId"` |
| **snake_case** | KPA entities (api-server/routes/kpa/) | `service_key`, `organization_id` |

Cross-table JOIN 시 명시적 aliasing 필요. SnakeNamingStrategy가 적용되지만 packages/ Core 엔티티는 이미 camelCase 컬럼명으로 생성됨.

---

## 8. 결론 및 권고

### 현재 상태 요약

O4O는 **도메인별 하이브리드 경계 모델**을 사용한다.
단일 Source of Truth는 존재하지 않으며, 도메인마다 다른 Primary Boundary를 갖는다.

| 도메인 | Primary Boundary | 교차 노출 위험 |
|--------|:----------------:|:--------------:|
| Content/Signage | serviceKey | 낮음 (대부분 적용됨) |
| Forum | organizationId | **중간** (serviceKey 없음) |
| Store Ops | organizationId | 낮음 |
| E-commerce | storeId | 낮음 |
| Product Listing | organizationId + serviceKey | 낮음 |

### 향후 결정 필요 사항

1. **Forum에 serviceKey 도입 여부** — 현재 Forum은 조직 경계만 존재
2. **storeId ↔ organizationId 매핑 공식화** — E-commerce와 Store Ops 간 식별자 불일치
3. **RISK 항목 4건 수정 WO 발행 여부** — 즉시 대응 vs 후순위
4. **Boundary 정책 공식 문서화** — 도메인별 경계 규칙을 CLAUDE.md 또는 별도 Baseline으로 고정

### 이 조사로 검증된 사실

- KPA-a vs KPA-b/c 분리는 **organizationId** 기반 (serviceKey가 아님)
- 신규 서비스 추가 시 Content/Signage는 serviceKey 추가로 충분하나, Forum/Store는 별도 org 구성 필요
- Core 승격 후보: organizationId 경계가 가장 보편적 (모든 도메인에 존재)

---

*Generated: 2026-02-24*
*Status: Investigation Complete — Read Only*
*Next: Boundary Policy Declaration (별도 WO 필요)*
