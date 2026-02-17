# IR-CYBER-STORE-PHASE2-API-INVENTORY-V1

> **Phase 2: API(컨트롤러/라우트) 조사 완료**
> **조사일**: 2026-02-17
> **목적**: 신청/승인 API, slug 처리, storefront_config API 현황 확정

---

## 1. GlycoPharm API 현황

### 1-1. 신청 API

| 엔드포인트 | 메서드 | 권한 | 파일 |
|-----------|--------|------|------|
| `/api/v1/glycopharm/applications` | POST | requireAuth | `application.controller.ts:45` |

**입력 필드:**
```typescript
{
  organizationType: 'pharmacy' | 'pharmacy_chain',  // required
  organizationName: string,                          // required, max 255
  businessNumber?: string,                           // optional, max 100
  serviceTypes: ('dropshipping' | 'sample_sales' | 'digital_signage')[],  // required, min 1
  note?: string                                      // optional, max 2000
}
```

**⚠️ 주의: slug 입력 필드 없음**

---

### 1-2. 승인/거절 API

| 엔드포인트 | 메서드 | 권한 | 파일 |
|-----------|--------|------|------|
| `/api/v1/glycopharm/applications/:id/review` | PATCH | requireAuth + glycopharm:admin/operator | `admin.controller.ts:208` |

**입력 필드:**
```typescript
{
  status: 'approved' | 'rejected',  // required
  rejectionReason?: string          // required if rejected
}
```

**승인 시 동작:**
1. GlycopharmPharmacy 생성
2. **slug 자동 생성**: `generateUniqueStoreSlug(organizationName)` (line 300-303)
3. 사용자에게 `glycopharm:store_owner` 역할 자동 부여

**⚠️ 주의:**
- 운영자가 승인 시 slug 직접 지정 불가
- slug는 매장명 기반 자동 생성 (한글 보존)
- 중복 시 -1, -2, -3 suffix 자동 추가

---

### 1-3. Storefront Config API

| 엔드포인트 | 메서드 | 권한 | 파일 |
|-----------|--------|------|------|
| `/api/v1/glycopharm/stores/:slug/storefront-config` | GET | Public | `store.controller.ts:384` |
| `/api/v1/glycopharm/stores/:slug/storefront-config` | PUT | authenticate + owner | `store.controller.ts:410` |

**PUT 입력 필드:**
```typescript
{
  theme?: 'neutral' | 'clean' | 'modern' | 'professional',
  template?: 'franchise-standard'
}
```

**✅ 구현 상태: 완료**

---

### 1-4. Hero API

| 엔드포인트 | 메서드 | 권한 | 파일 |
|-----------|--------|------|------|
| `/api/v1/glycopharm/stores/:slug/hero` | GET | Public | `store.controller.ts:477` |
| `/api/v1/glycopharm/stores/:slug/hero` | PUT | authenticate + owner | `store.controller.ts:504` |

**PUT 입력 필드:**
```typescript
{
  heroContents: Array<{
    id: string,          // required
    title: string,       // required
    source?: 'operator' | 'pharmacy' | 'default'
    // ... other fields
  }>
}
```

**✅ 구현 상태: 완료**

---

### 1-5. Storefront Public API (상품 조회)

| 엔드포인트 | 메서드 | 권한 | 설명 |
|-----------|--------|------|------|
| `/api/v1/glycopharm/stores/:slug` | GET | Public | 매장 정보 |
| `/api/v1/glycopharm/stores/:slug/categories` | GET | Public | 상품 카테고리 |
| `/api/v1/glycopharm/stores/:slug/products` | GET | Public | 상품 목록 (4중 게이트) |
| `/api/v1/glycopharm/stores/:slug/products/featured` | GET | Public | 추천 상품 |
| `/api/v1/glycopharm/stores/:slug/products/:id` | GET | Public | 상품 상세 |

**4중 Visibility Gate (WO-O4O-STOREFRONT-VISIBILITY-GATE-FIX-V1):**
1. `organization_channels.status = 'APPROVED' AND channel_type = 'B2C'`
2. `organization_product_listings.is_active = true AND service_key = 'kpa'`
3. `organization_product_channels.is_active = true`
4. `glycopharm_products.status = 'active'`

---

## 2. K-Cosmetics API 현황

### 2-1. 신청 API

| 엔드포인트 | 메서드 | 권한 | 파일 |
|-----------|--------|------|------|
| `/api/v1/cosmetics/stores/apply` | POST | requireAuth | `cosmetics-store.controller.ts:281` |

**입력 필드:**
```typescript
{
  store_name: string,        // required, 1-200
  business_number: string,   // required, 1-100
  owner_name: string,        // required, 1-200
  contact_phone?: string,    // optional, max 50
  address?: string,          // optional
  region?: string,           // optional, max 100
  note?: string              // optional
}
```

**⚠️ 주의: slug 입력 필드 없음**

---

### 2-2. 승인/거절 API

| 엔드포인트 | 메서드 | 권한 | 파일 |
|-----------|--------|------|------|
| `/api/v1/cosmetics/stores/admin/applications/:id/review` | PATCH | cosmetics:admin | `cosmetics-store.controller.ts:155` |

**입력 필드:**
```typescript
{
  action: 'approve' | 'reject',  // required
  rejection_reason?: string      // optional
}
```

**⚠️ 주의:**
- slug 자동 생성 로직은 service 코드에 있음
- 운영자가 slug 직접 지정 불가

---

### 2-3. Storefront Config API

**❌ 없음**

K-Cosmetics는 storefront_config CRUD API가 아직 구현되지 않음.
(Entity에는 없지만, DB에도 없음 - Phase 1 참조)

---

## 3. KPA (약사회) API 현황

### 3-1. Storefront Config API

| 엔드포인트 | 메서드 | 권한 | 파일 |
|-----------|--------|------|------|
| `/api/v1/kpa/pharmacy/store/config` | GET | requireAuth + pharmacy_owner | `pharmacy-store-config.controller.ts:45` |
| `/api/v1/kpa/pharmacy/store/config` | PUT | requireAuth + pharmacy_owner | `pharmacy-store-config.controller.ts:82` |

**PUT 입력:**
- JSON 전체 overwrite (전체 config 객체)
- Audit log 기록

---

## 4. slug 관련 유틸리티

### 4-1. slug 생성 함수

| 함수 | 파일 | 설명 |
|------|------|------|
| `generateSlug()` | `utils/slug.ts:4` | 기본 slug 생성 (영문만) |
| `generateStoreSlug()` | `utils/slug.ts:19` | 매장 slug 생성 (한글 보존) |
| `generateUniqueStoreSlug()` | `utils/slug.ts:62` | 중복 시 -1/-2/-3 suffix |
| `isValidSlug()` | `utils/slug.ts:34` | slug 유효성 검사 |

### 4-2. slug 중복 체크

**❌ 별도 API 없음**

slug 중복 체크는 승인 시 내부적으로만 수행되며,
신청 시점에 사용자가 slug 가용성을 확인할 수 있는 API가 없음.

---

## 5. 채널별(B2C/Tablet/Kiosk) API

### 5-1. 현재 상태

- **B2C (웹)**: ✅ 4중 visibility gate로 구현
- **Tablet**: ❌ 별도 API 없음
- **Kiosk**: ❌ 별도 API 없음

### 5-2. 채널 관련 테이블

```sql
-- organization_channels 테이블 (Phase 1 미확인 - 추가 조사 필요)
channel_type: 'B2C' | 'B2B' | 'TABLET' | 'KIOSK' | ...
status: 'APPROVED' | 'PENDING' | ...
```

**⚠️ 채널별 API 분기는 DB/엔티티 구조는 있으나, 전용 엔드포인트는 없음**

---

## 6. Phase 2 핵심 결론

### 6-1. 신청/승인 API 존재 여부

| 서비스 | 신청 API | 승인 API | 거절 사유 |
|--------|----------|----------|----------|
| GlycoPharm | ✅ | ✅ | ✅ required |
| K-Cosmetics | ✅ | ✅ | ✅ optional |
| KPA | - | - | - |

### 6-2. slug 입력/중복체크 API 존재 여부

| 항목 | 존재 여부 |
|------|----------|
| 신청 시 slug 입력 | ❌ 없음 |
| slug 중복 체크 API | ❌ 없음 |
| 승인 시 slug 지정 | ❌ 없음 (자동 생성) |
| slug 변경 API | ❌ 없음 |

**⚠️ slug는 승인 시 매장명 기반 자동 생성만 지원**

### 6-3. storefront_config API 존재 여부

| 서비스 | GET | PUT | 비고 |
|--------|-----|-----|------|
| GlycoPharm | ✅ | ✅ | theme/template 검증 |
| K-Cosmetics | ❌ | ❌ | Entity에도 없음 |
| KPA | ✅ | ✅ | JSON 전체 overwrite |

### 6-4. 채널 타입 분기 API 존재 여부

| 채널 | API 존재 |
|------|----------|
| B2C (웹) | ✅ visibility gate로 구현 |
| Tablet | ❌ 없음 |
| Kiosk | ❌ 없음 |
| Blog | ❌ 없음 |

---

## 7. Phase 3로 전달되는 질문

1. **신청 UI에서 slug 입력 필드가 있는가?**
2. **승인 UI에서 slug 수정 기능이 있는가?**
3. **storefront_config 설정 UI가 연결되어 있는가?**
4. **템플릿 선택/미리보기 UI가 있는가?**

---

*Phase 2 완료 - Phase 3(UI/프론트 조사)로 진행*
