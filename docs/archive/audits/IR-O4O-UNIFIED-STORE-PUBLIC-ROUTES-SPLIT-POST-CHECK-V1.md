# IR-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-POST-CHECK-V1

> Post-check investigation for WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1
> Branch: `feature/unified-store-public-split`
> Commit: `61a487672`
> Date: 2026-03-22
> Status: **Read-only investigation — no code modifications**

---

## 1. 전체 판정

| 항목 | 결과 |
|------|------|
| Split 최종 상태 | **SAFE — push ready** |
| Oversized 정비 1차 완료 | **YES** |
| Push 가능 여부 | **YES** |
| 후속 follow-up 필요 | **NO** (현재 상태로 충분) |

---

## 2. 파일별 상세 표

| 파일 | Lines | 역할 | 판정 | 책임 혼합 | 비고 |
|------|-------|------|------|----------|------|
| `unified-store-public.routes.ts` | 53 | Facade: repos 1회 생성, 4 sub-handler compose | **SAFE** | NO | Business logic 0줄, pure compose |
| `store-public-utils.ts` | 405 | Shared helpers: resolvePublicStore, queryVisibleProducts, queryTabletVisibleProducts, generateDefaultBlocks, deriveChannels, tabletRequestLimiter | **SAFE** | NO | 모든 export가 2개 이상 handler에서 사용됨. God-helper 아님 |
| `store-public-home.handler.ts` | 157 | Store info (GET /:slug), layout, template, config, hero — 5 endpoints | **SAFE** | NO | Store identity/presentation 단일 책임 |
| `store-public-product.handler.ts` | 183 | Featured, products, detail, categories — 4 endpoints | **SAFE** | NO | B2C product visibility 단일 책임. Route 순서 유지 (featured before :id) |
| `store-public-content.handler.ts` | 98 | Blog list, blog detail — 2 endpoints | **SAFE** | NO | 가장 경량. Blog content 단일 책임 |
| `store-public-tablet.handler.ts` | 325 | Tablet products, requests (POST), interest (POST), interest status (GET), request status (GET) — 5 endpoints | **SAFE** | NO | Tablet domain 단일 책임. Query Separation Guard 주석 보존 |

---

## 3. 조사 항목별 결과

### 3.1 Facade 안전성 점검

**판정: SAFE**

- Facade 53줄 중 business logic: **0줄**
- 역할: `Router` 생성, 3개 repo 인스턴스 생성, 4개 sub-handler mount
- Sub-handler 연결: 4개 모두 `router.use('/', ...)` — 누락 없음
- Export signature: `createUnifiedStorePublicRoutes(dataSource: DataSource): Router` — 원본과 동일
- `main.ts` mount 변경: 없음 (git diff 비어있음)

### 3.2 Handler 책임 분리 점검

**판정: SAFE — 모든 handler가 단일 책임**

| Handler | 책임 범위 | 교차 도메인 | God-handler 위험 |
|---------|----------|------------|-----------------|
| Home | Store identity + presentation config | 없음 | 없음 (157줄) |
| Product | B2C product visibility + catalog | 없음 | 없음 (183줄) |
| Content | Blog content CRUD (read-only) | 없음 | 없음 (98줄) |
| Tablet | Tablet channel + request/interest lifecycle | 없음 | 없음 (325줄) |

- Home/Product 경계: Home은 store 자체 정보, Product는 B2C 상품 쿼리 — 명확히 구분
- Content 독립성: blogRepo만 사용, 다른 handler 의존 없음
- Tablet 묶음 적절성: tablet products + tablet requests + tablet interest가 동일 도메인 — 분리 불필요

### 3.3 Utils/Helper 적절성 점검

**판정: SAFE — god-helper 아님**

각 export의 실제 사용처:

| Export | Home | Product | Content | Tablet |
|--------|:----:|:-------:|:-------:|:------:|
| `resolvePublicStore()` | YES | YES | YES | YES |
| `queryVisibleProducts()` | — | YES | — | — |
| `queryTabletVisibleProducts()` | — | — | — | YES |
| `generateDefaultBlocks()` | YES | — | — | — |
| `deriveChannels()` | YES | — | — | — |
| `tabletRequestLimiter` | — | — | — | YES |

- `resolvePublicStore`: 4/4 handler에서 사용 — 최고 공유도, utils 위치 적절
- `queryVisibleProducts`: Product handler 전용이나, 138줄 raw SQL + cache 로직 — handler 내장 시 과대해짐, utils 유지 적절
- `queryTabletVisibleProducts`: Tablet handler 전용이나 동일 이유로 utils 유지 적절
- `generateDefaultBlocks` + `deriveChannels`: Home handler 전용이나 layout 관련 독립 로직 — utils 수준 유지 적절
- 405줄은 6개 독립 helper의 합산이며, orchestration 없음 — god-helper 판정 **불해당**

### 3.4 Route / Endpoint 정합성 점검

**판정: SAFE — 16/16 endpoints 유지**

| # | Method | Path | Handler | 원본 Line |
|---|--------|------|---------|----------|
| 1 | GET | `/:slug` | Home | 448 |
| 2 | GET | `/:slug/products/featured` | Product | 488 |
| 3 | GET | `/:slug/products` | Product | 536 |
| 4 | GET | `/:slug/products/:id` | Product | 561 |
| 5 | GET | `/:slug/categories` | Product | 591 |
| 6 | GET | `/:slug/layout` | Home | 644 |
| 7 | GET | `/:slug/blog` | Content | 676 |
| 8 | GET | `/:slug/blog/:postSlug` | Content | 712 |
| 9 | GET | `/:slug/template` | Home | 747 |
| 10 | GET | `/:slug/storefront-config` | Home | 769 |
| 11 | GET | `/:slug/hero` | Home | 785 |
| 12 | GET | `/:slug/tablet/products` | Tablet | 810 |
| 13 | POST | `/:slug/tablet/requests` | Tablet | 853 |
| 14 | POST | `/:slug/tablet/interest` | Tablet | 941 |
| 15 | GET | `/:slug/tablet/interest/:id` | Tablet | 1003 |
| 16 | GET | `/:slug/tablet/requests/:id` | Tablet | 1048 |

Route 순서 검증:
- `/:slug/products/featured` (Product handler line 27) → `/:slug/products/:id` (line 100): 순서 보존 — `:id`가 `featured`를 가리지 않음
- Express sub-router 각각 독립 매칭 — cross-handler shadowing 없음
- `/:slug` (Home handler) vs `/:slug/products` (Product handler): Express `router.get('/:slug')` is exact match for single segment — 충돌 없음

### 3.5 Dead Code / Orphan 여부 점검

**판정: CLEAN — dead code 없음**

- Facade: 모든 import가 사용됨 (3 entity + 4 handler factory)
- Utils: 모든 export가 handler에서 import됨 (6/6 사용)
- Home handler: `GlycopharmPharmacyExtension` import → `GET /:slug`에서 사용
- Home handler: `GlycopharmProduct` import → `Repository<GlycopharmProduct>` deps 타입에 사용
- Product handler: `SERVICE_KEYS`, `cacheAside`, `hashCacheKey`, `READ_CACHE_TTL` → featured + categories에서 사용
- Content handler: `LessThanOrEqual`, `StoreBlogPost`, `StoreBlogPostStatus` → blog 조회에 사용
- Tablet handler: `TabletInterestRequest`, `InterestRequestStatus`, `ProductMaster` → interest/request에서 사용
- 중복 response formatting: 없음 (각 endpoint 독자 응답 shape 유지)
- 중복 query parsing: 없음 (shared helper에 집약)

### 3.6 Oversized 잔존 여부 점검

| 파일 | Lines | 판정 |
|------|-------|------|
| `store-public-utils.ts` | 405 | **유지 가능** — 6개 독립 helper 합산, orchestration 없음, 개별 helper 최대 138줄 |
| `store-public-tablet.handler.ts` | 325 | **유지 가능** — 5 endpoints, POST handler에 validation 포함이라 자연스러운 크기 |
| `store-public-product.handler.ts` | 183 | **유지 가능** — 4 endpoints, categories에 inline SQL 포함 |
| `store-public-home.handler.ts` | 157 | **유지 가능** |
| `store-public-content.handler.ts` | 98 | **유지 가능** — 최소 단위 |

후속 미세 분해: **불필요**. 모든 파일이 400줄 이하, 단일 책임.

---

## 4. 잔존 이슈

| 항목 | 결과 |
|------|------|
| Dead code | 없음 |
| 중복 로직 | 없음 |
| 과분할 | 없음 (Content 98줄이 최소이나, blog 도메인 독립성으로 유지 적절) |
| 미분리 | 없음 |
| Follow-up | 없음 |

**Observation (정보 제공):**
- `queryVisibleProducts`와 `queryTabletVisibleProducts`는 구조가 유사하나 channel_type(B2C vs TABLET)과 sort 기본값이 다름. 통합은 이번 scope 외이며 현재 상태로 문제없음.
- `store-public-utils.ts`의 `tabletRequestLimiter`는 module-level singleton으로, sub-handler간 rate-limit 상태가 공유됨 — 이는 원본과 동일한 동작.

---

## 5. 다음 Oversized 정비 추천

Oversized File Audit Phase 2 기준 P0 잔여:

| 순위 | 파일 | Lines | 특성 | 권장 |
|------|------|-------|------|------|
| 1 | `cms-content.routes.ts` | ~900+ | Route mega-file, inline business logic | 단독 WO (route split) |
| 2 | `mail.service.ts` | ~800+ | Service, 다수 template + 발송 로직 혼합 | 단독 WO (service split) |

**추천: `cms-content.routes.ts`를 다음 대상으로.**
- 이유: route 계열 정비 패턴이 확립됨 (partner-controller-split → unified-store-public-split → cms-content 순서 자연스러움)
- 패턴 재사용: facade + sub-handler + shared utils 패턴 그대로 적용 가능
- service 계열(`mail.service.ts`)은 route 정비 완료 후 전환 권장

---

## 6. 결론

WO-O4O-UNIFIED-STORE-PUBLIC-ROUTES-SPLIT-V1은 **안전한 구조 분해로 완료**.

- 1,091줄 → 53줄 facade + 4 handler + shared utils
- 16 endpoints 전량 유지
- Route path, response, 공개 정책 변경 없음
- tsc --noEmit 신규 오류 0건
- Dead code 없음, 과분할/미분리 없음
- **Push ready. Follow-up 불필요.**
