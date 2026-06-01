# IR-O4O-KPA-STORE-MY-PRODUCTS-REGISTRATION-FLOW-AUDIT-V1

**작성일**: 2026-05-13  
**감사 대상**: `/store/my-products` 내 매장 상품 등록 흐름  
**범위**: 조사/판단만 (구현 변경 없음)

---

## 1. 현재 구현 흐름 요약

`/store/my-products`는 `StoreProductsManagerPage` 컴포넌트(`packages/store-products-ui`)로 구현된 **3단계 등록 모달 기반 상품 관리 페이지**다.

### 3단계 등록 흐름

```
[+ 상품 등록] 버튼
    ↓
Step 1 — 상품 검색 (search)
  - 상품명 또는 바코드 입력 (350ms debounce)
  - GET /api/v1/store/products/search?q=...
  - 결과: 상품명 / 제조사 / 바코드 / 공급 수량 배지 표시
    ↓ 항목 클릭
Step 2 — 공급 제안 선택 (offer)
  - GET /api/v1/store/products/master/:masterId/offers
  - APPROVED + ACTIVE offer 목록 + 공급가 표시
    ↓ 공급 제안 선택
Step 3 — 등록 확인 (confirm)
  - 매장 판매가 설정 (선택, 미입력 시 공급가 사용)
  - POST /api/v1/store/products/list
  - 성공: 목록 refresh
  - ALREADY_LISTED: 이미 등록된 상품 안내
```

### 등록 완료 후 관리 기능

| 기능 | API | 구현 |
|-----|-----|-----|
| 활성/비활성 토글 | PATCH /:id | ✅ |
| 가격 override | PATCH /:id | ✅ |
| 설명 override | PATCH /:id/description | ✅ |
| 이미지 관리 (URL 임포트, 대표 지정, 순서) | /master/:id/images/* | ✅ |
| 채널 노출 토글 (B2C, KIOSK) | /channel-products/* | ✅ |

---

## 2. 현재 API 목록

**Base URL**: `/api/v1/store/products`  
**인증**: `requireAuth` + `requireStoreOwner` (전 엔드포인트 공통)

| Method | Path | 기능 |
|--------|------|-----|
| GET | `/search?q=&page=&limit=` | 상품 검색 (ProductMaster + offer count) |
| GET | `/master/:masterId/offers` | 공급 제안 목록 (APPROVED+ACTIVE) |
| GET | `/master/:masterId/images` | 상품 이미지 목록 |
| POST | `/master/:masterId/images/from-url` | URL → GCS 이미지 임포트 |
| PATCH | `/images/reorder` | 이미지 순서 일괄 저장 |
| PATCH | `/images/:imageId/primary` | 대표 이미지 지정 |
| DELETE | `/images/:imageId` | 이미지 삭제 |
| POST | `/list` | 매장 상품 등록 (OrganizationProductListing 생성) |
| GET | `/` | 내 매장 진열 목록 (페이지네이션) |
| GET | `/my-channels` | 내 매장 채널 목록 |
| PATCH | `/:id` | Listing 수정 (isActive, price) |
| PATCH | `/:id/description` | 매장 상품 설명 override |

**채널 상품 API** (별도 router, `/api/v1/store/channel-products`):

| Method | Path | 기능 |
|--------|------|-----|
| GET | `/:channelId` | 채널의 상품 목록 |
| POST | `/:channelId` | 채널에 상품 추가 |
| PATCH | `/:channelId/:productChannelId/activate` | 채널 노출 활성화 |
| PATCH | `/:channelId/:productChannelId/deactivate` | 채널 노출 비활성화 |

---

## 3. 현재 데이터 구조 요약

### 핵심 테이블 관계

```
role_assignments            ← store_owner 여부 판단 SSOT
    ↓ (user_id, role='kpa:store_owner')
organization_members        ← organizationId 조회
    ↓ (organization_id)
organization_product_listings   ← 내 매장 편입 상품
    ├── master_id → product_masters       ← 공통 상품 정보
    └── offer_id  → supplier_product_offers ← 공급자 제안
                       ↓ supplier_id
                    neture_suppliers → organizations (공급자명)
```

### product_masters (공통 상품 정보 DB)

| 필드 | 타입 | 비고 |
|-----|-----|-----|
| `barcode` | VARCHAR(14) | GTIN 바코드 — 불변 |
| `name` | VARCHAR(255) | 상품명 — 수정 가능 |
| `regulatory_name` | VARCHAR(255) | 식약처 공식명 — 불변 |
| `manufacturer_name` | VARCHAR(255) | 제조사명 — 불변 |
| `mfds_permit_number` | VARCHAR(100) | 식약처 허가번호 — 불변 |
| `category_id`, `brand_id` | UUID | 카테고리/브랜드 FK |
| `specification` | TEXT | 규격 |
| `tags` | JSONB | 검색 태그 |

### organization_product_listings (내 매장 편입 상품)

| 필드 | 타입 | 비고 |
|-----|-----|-----|
| `organization_id` | UUID | 매장 FK |
| `service_key` | VARCHAR | `'neture'` 고정 |
| `master_id` | UUID | 공통 상품 FK |
| `offer_id` | UUID | 공급 제안 FK |
| `is_active` | BOOLEAN | 노출 여부 |
| `price` | NUMERIC(12,2) | 매장 override 가격 (null = 공급가 사용) |

**Unique Constraint**: `(organization_id, service_key, offer_id)`

---

## 4. 검색 대상 판정

**현재 검색 대상: ProductMaster 테이블 전체**

`NetureCatalogService.searchProductMasters()`는 offer 존재 여부와 무관하게 모든 `product_masters`를 검색한다.

```sql
-- 검색 범위 (catalog.service.ts)
SELECT m.* FROM product_masters m
WHERE (
  m.name ILIKE :q
  OR m.regulatory_name ILIKE :q
  OR m.barcode ILIKE :q
  OR m.manufacturer_name ILIKE :q
  OR EXISTS (SELECT 1 FROM product_aliases pa WHERE pa.product_master_id = m.id AND pa.alias ILIKE :q)
)
```

컨트롤러에서 offer count를 별도 조회해 결과에 붙이지만, `offerCount=0`인 상품도 검색 결과에 노출된다.  
→ **사용자가 `offerCount=0` 상품을 선택하면 Step 2에서 "공급 제안이 없습니다" 빈 화면**을 보게 된다.

**검색 대상 범위:**
- ✅ O4O 플랫폼 등록 전체 ProductMaster (약품, 건강기능식품 등)
- ✅ 바코드 검색 지원
- ✅ 식약처 공식명 검색 지원
- ✅ 제조사명 검색 지원
- ✅ 별칭(product_aliases) 검색 지원
- ❌ 다른 매장이 등록한 상품 중 "미등록 master" 검색 불가 (모두 product_masters에 있음)
- ❌ 외부 상품 정보 (식약처 공공 DB 실시간 연동) 없음

---

## 5. 신규 등록 가능 여부

**판정: 불가. 신규 ProductMaster 생성 진입점 없음.**

현재 `StoreProductsManagerPage`에는 "신규 상품 등록" 또는 "상품 정보 직접 입력" 기능이 없다. 등록 모달은 검색 → 기존 ProductMaster 선택 경로만 지원한다.

신규 ProductMaster는 Neture Admin/Operator 또는 공급자가 등록한 후에만 검색 가능하다.

**신규 등록이 필요한 시나리오:**

| 시나리오 | 현재 처리 |
|---------|---------|
| 약국에서 직접 유통하는 신규 상품 | 검색 불가 → 등록 불가 |
| 특수 약품 (ProductMaster 미등록) | 검색 불가 → 등록 불가 |
| 바코드는 있으나 DB 미등록 상품 | 검색 불가 → 등록 불가 |

---

## 6. 내 매장 상품 편입 가능 여부

**판정: 가능. 완전 구현됨.**

`POST /list` → `organization_product_listings` 생성 흐름이 완성되어 있다.

조건:
1. `role_assignments`에 `kpa:store_owner` 역할 보유
2. `organization_members`에 `role IN ('owner','admin','manager')` AND `left_at IS NULL` 레코드 존재 → `organizationId` 파생
3. 선택한 offer가 `approval_status='APPROVED'` AND `is_active=true`

**중요**: `requireStoreOwner`가 `serviceKey` 없이 생성됨 → 모든 서비스(kpa, glycopharm, cosmetics)의 store_owner role을 허용하는 back-compat 경로 사용.

```typescript
// store-product-library.controller.ts:59
const requireStoreOwner = createRequireStoreOwner(dataSource); // serviceKey 미지정
```

---

## 7. 현재 오류 원인

**"검색 중 오류가 발생했습니다"** 메시지는 `status !== 403 && status !== 401`일 때 표시되는 catch-all 문구다.

### 가능한 원인

| 원인 | HTTP | 단서 |
|-----|-----|-----|
| `role_assignments`에 `kpa:store_owner` 없음 | 403 | "상품 검색 권한이 없습니다" 표시됨 |
| JWT 만료/미인증 | 401 | "로그인이 필요합니다" 표시됨 |
| `organization_members` 레코드 없어 `organizationId=null`인 상태에서 목록 조회(`GET /`) | 500 | DB NULL 오류 |
| `NetureService` DB 연결 오류 | 500 | "검색 중 오류가 발생했습니다" 표시됨 |
| API base URL 설정 오류 | network | "검색 중 오류가 발생했습니다" 표시됨 |

### 핵심 취약점

`requireStoreOwner` 미들웨어의 `isStoreOwner()` 결과:

```typescript
// role_assignments에 store_owner role 있으나 organization_members에 레코드 없는 경우
return { isOwner: true, organizationId: null, memberRole: '' };
// → req.organizationId = null
```

이 상태에서 `GET /` 또는 `POST /list`를 호출하면 `organization_id = null`로 DB 쿼리가 실행되어 **의도치 않은 결과 또는 500 오류** 발생 가능.

**단, `/search`는 `organizationId`를 사용하지 않으므로** 검색 자체에서 이 문제가 발생하지는 않는다.

### 디버깅 체크리스트

1. 브라우저 Network 탭 → `/api/v1/store/products/search` 요청 → 실제 HTTP status 확인
2. 403이면: `role_assignments` 테이블에 `kpa:store_owner` 레코드 존재 여부 확인
3. 500이면: Cloud Run 로그에서 `[StoreProductLibrary]` 키워드 조회
4. API URL 오류면: `VITE_API_BASE_URL` 환경변수 확인

---

## 8. 재사용 가능한 부분

| 구성요소 | 위치 | 재사용 범위 |
|---------|-----|-----------|
| 3단계 등록 모달 (`RegisterModal`) | `StoreProductsManagerPage.tsx` | 전체 재사용 가능 |
| 검색 API + 디바운스 패턴 | `api.ts` + `StoreProductsManagerPage.tsx` | 바코드/상품명 검색 완성 |
| 공급 제안 조회 + 가격 표시 | `getMasterOffers()` | 완성 |
| 편입 API (`createStoreListing`) | `POST /list` | 멱등성 처리 완성 |
| 이미지 관리 (`StoreProductImageManagerModal`) | `packages/store-products-ui` | Google 이미지 검색 포함 |
| 채널 노출 토글 | `getMyChannels()` + `toggleChannelProduct()` | B2C/KIOSK 완성 |
| 가격/설명 override | `updateStoreListing()` / `updateListingDescription()` | 완성 |
| `requireStoreOwner` 미들웨어 | `store-owner.utils.ts` | serviceKey 지정 시 cross-service 차단 |

---

## 9. 부족한 부분

### 구조적 부족

| 항목 | 현황 | 영향 |
|-----|-----|-----|
| 신규 ProductMaster 등록 | ❌ 없음 | 플랫폼 미등록 상품은 내 매장에 추가 불가 |
| `offerCount=0` 상품 필터 | ❌ 없음 | 검색 결과에 등록 불가 상품 노출 |
| `organizationId=null` 방어 | ⚠️ 취약 | `organization_members` 없으면 목록 API 오류 가능 |
| `serviceKey` 미지정 | ⚠️ 취약 | 다른 서비스 store_owner도 접근 가능 (back-compat) |
| 바코드 카메라 스캔 | ❌ 없음 | 텍스트 입력만 가능 |
| 상품 등록 현황 피드백 | ❌ 없음 | "이미 등록됨" 배지 없음 (등록 시도 후에야 알 수 있음) |

### UX 부족

| 항목 | 현황 |
|-----|-----|
| `offerCount=0` 상품 선택 시 안내 | Step 2에서 빈 목록만 표시, 명시적 안내 문구 없음 |
| 검색 결과 없을 때 신규 등록 CTA | 없음 |
| 공급자 별 최저가 강조 | 없음 (가격 순 정렬만) |

---

## 10. 다음 개발 작업 제안

### 긴급도 높음

**WO-O4O-KPA-STORE-MY-PRODUCTS-OFFER-ZERO-FILTER-V1**  
검색 결과에서 `offerCount=0` 상품을 필터링하거나 "공급 불가" 표시 추가.  
→ 사용자가 선택 후 Step 2에서 빈 화면을 보는 혼란 제거.

**WO-O4O-KPA-STORE-MY-PRODUCTS-ORG-ID-NULL-GUARD-V1**  
`POST /list`, `GET /` 엔드포인트에서 `organizationId=null` 케이스 방어.  
→ 400 또는 구체적 오류 메시지 반환으로 500 방지.

### 중간 우선순위

**WO-O4O-KPA-STORE-MY-PRODUCTS-EMPTY-SEARCH-CTA-V1**  
검색 결과가 없을 때 "찾는 상품이 없으신가요? → 운영자에게 상품 등록 요청" CTA 추가.  
→ 신규 등록 필요성을 운영자에게 전달하는 경로 확보.

**WO-O4O-KPA-STORE-MY-PRODUCTS-ALREADY-LISTED-BADGE-V1**  
목록 조회 시 검색 결과에 "이미 등록됨" 배지 표시.  
→ 중복 등록 시도 방지.

### 낮은 우선순위

**WO-O4O-KPA-STORE-MY-PRODUCTS-NEW-MASTER-REQUEST-V1**  
신규 상품 등록 요청 폼 (ProductMaster 직접 생성 아님, 운영자 검토 요청).  
→ 약국이 취급하는 미등록 상품을 플랫폼에 추가 요청하는 흐름.

---

## 판정

| 항목 | 판정 | 근거 |
|-----|-----|-----|
| **전체 흐름** | **A** | 3단계 모달, 검색, 편입, 관리 기능 완전 구현 |
| **검색 기능** | **A** | 바코드/상품명/식약처명/별칭 검색 지원 |
| **내 매장 편입** | **A** | 멱등성 처리 포함 완전 구현 |
| **신규 상품 등록** | **D** | 진입점 없음, 별도 WO 필요 |
| **오류 원인** | 진단 필요 | 권한(403) 또는 DB(500) 가능성 모두 존재, 실제 Network log 확인 필요 |

---

## 핵심 결론

`/store/my-products`는 **기존 ProductMaster 검색 → 내 매장 편입** 흐름이 완전히 구현되어 있다.

현재 발생 중인 "검색 중 오류" 원인은 코드 구조 문제보다 **사용자 계정의 `role_assignments` 또는 `organization_members` 데이터 부재** 가능성이 높다. Network 탭에서 실제 HTTP status 확인이 선행되어야 한다.

신규 상품 등록은 현재 구조에 없으므로, 필요 시 별도 WO로 설계해야 한다.
