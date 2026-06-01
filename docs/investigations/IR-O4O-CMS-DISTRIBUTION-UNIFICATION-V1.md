# IR-O4O-CMS-DISTRIBUTION-UNIFICATION-V1

> **Investigation Report**
> WO-O4O-CMS-DISTRIBUTION-UNIFICATION-INVESTIGATION-V1
> Date: 2026-02-23
> Status: Complete

---

## 1. 현재 상품 Distribution 구조 요약

### 1.1 핵심 구조

**Entity**: `NetureSupplierProduct` (`neture_supplier_products` 테이블)

```typescript
enum DistributionType {
  PUBLIC = 'PUBLIC',    // HUB 공개 (모든 운영자에게 노출)
  PRIVATE = 'PRIVATE',  // 지정 판매자 전용
}

// 컬럼
distribution_type: DistributionType (default: PUBLIC)
allowed_seller_ids: TEXT[] | null    // PRIVATE일 때 판매자 UUID 배열
```

### 1.2 쿼리 패턴

| 조회 대상 | WHERE 조건 | 결과 |
|-----------|-----------|------|
| Operator (HUB) | `distribution_type = 'PUBLIC'` | PUBLIC만 |
| Seller (Neture) | `distribution_type = 'PUBLIC' OR (PRIVATE AND seller_id = ANY(allowed_seller_ids))` | PUBLIC + 자기 PRIVATE |
| Pharmacy (Catalog) | `distribution_type = 'PUBLIC' AND is_active = true AND supplier.status = 'ACTIVE'` | PUBLIC만 |

### 1.3 인프라

- **Partial Index**: `distribution_type = 'PRIVATE'` 전용 인덱스 (성능 최적화)
- **Validation**: PRIVATE → `allowed_seller_ids.length >= 1` 강제 (서비스 레이어)
- **Migration**: `20260222100000-AddDistributionPolicyToNetureSupplierProducts`

### 1.4 3계층 가시성 모델

```
PUBLIC   → 모든 사용자 (Operator, Seller, Pharmacy)
PRIVATE  → 지정 Seller만 (allowed_seller_ids 배열)
INACTIVE → 비활성 (is_active = false)
```

---

## 2. CMS 현재 구조 요약

### 2.1 가시성 모델

**Entity**: `CmsContent` (`cms_contents` 테이블)

| 필드 | 타입 | 용도 |
|------|------|------|
| `serviceKey` | VARCHAR(50) | 서비스 스코프 ('kpa', 'glycopharm', 'cosmetics') |
| `organizationId` | UUID | 조직 스코프 (null = 플랫폼 전체) |
| `status` | VARCHAR(20) | 생명주기 ('draft' → 'published' → 'archived') |

### 2.2 스코프 계층

```
Global:       serviceKey = null,  organizationId = null   → 모든 서비스
Service:      serviceKey = 'kpa', organizationId = null   → KPA 전용
Organization: serviceKey = any,   organizationId = UUID   → 특정 조직
```

### 2.3 없는 것

- ❌ `distribution_type` 컬럼
- ❌ `allowed_seller_ids` 컬럼
- ❌ `audience` / `target_segment` 컬럼
- ❌ 사용자/판매자 기반 필터링
- ❌ 역할 기반 노출 제어

### 2.4 쿼리 패턴

```sql
-- ContentQueryService
WHERE serviceKey IN (:serviceKeys)
  AND status = 'published'
ORDER BY isPinned DESC, createdAt DESC

-- CMS Slot 조회
WHERE slotKey = :slotKey
  AND serviceKey = :serviceKey
  AND isActive = true
  AND (startsAt IS NULL OR startsAt <= NOW())
  AND (endsAt IS NULL OR endsAt >= NOW())
  AND content.status = 'published'
```

---

## 3. Digital Signage 현재 구조 요약

### 3.1 데이터 소스

**CMS와 완전히 독립된 시스템** — 별도 `signage_*` 테이블 사용

| Entity | 테이블 | 용도 |
|--------|--------|------|
| `SignageMedia` | `signage_media` | 미디어 자산 |
| `SignagePlaylist` | `signage_playlists` | 재생목록 |
| `SignagePlaylistItem` | `signage_playlist_items` | 재생목록 아이템 |
| `SignageSchedule` | `signage_schedules` | 스케줄링 |
| `SignageTemplate` | `signage_templates` | 레이아웃 템플릿 |

### 3.2 가시성 모델 (2차원)

**Source** (누가 만들었는가):

| Source | 설명 | 가시성 |
|--------|------|--------|
| `hq` | 본부 콘텐츠 | Global |
| `supplier` | 공급자 콘텐츠 | Global |
| `community` | 커뮤니티 공유 | Global |
| `store` | 매장 자체 | Store만 |

**Scope** (어디에 노출되는가):

| Scope | 의미 |
|-------|------|
| `global` | 모든 매장 탐색 가능 |
| `store` | 해당 매장만 |

### 3.3 쿼리 패턴

```sql
-- Global 콘텐츠 (공개 탐색)
WHERE source IN ('hq', 'supplier', 'community')
  AND scope = 'global'
  AND status = 'active'

-- 매장 콘텐츠 (매장 전용)
WHERE scope = 'store'
  AND organizationId = :orgId

-- 혼합 (매장 보기)
WHERE (scope = 'store' AND organizationId = :orgId)
   OR (scope = 'global' AND source IN ('hq', 'supplier', 'community'))
```

### 3.4 CMS와의 관계

- `sourceType: 'cms'` enum 값이 존재하지만 **현재 미사용** (향후 통합 포인트)
- 실질적 연결: **없음** (독립 시스템)

---

## 4. 3개 시스템 비교

| 차원 | 상품 (Product) | CMS (Content) | Signage |
|------|---------------|---------------|---------|
| **스코프 기준** | distribution_type | serviceKey + organizationId | source + scope |
| **사용자 타겟팅** | allowed_seller_ids (UUID[]) | 없음 | 없음 |
| **상태 제어** | is_active | status (draft/published/archived) | status (active/inactive) |
| **시간 제어** | 없음 | expiresAt (콘텐츠), startsAt/endsAt (슬롯) | validFrom/validUntil (스케줄) |
| **조직 스코프** | 없음 (공급자 기준) | organizationId | organizationId |
| **서비스 스코프** | 없음 (Neture 전용) | serviceKey | serviceKey |
| **출처 추적** | supplier_id | createdBy + metadata.creatorType | source (hq/supplier/community/store) |
| **잠금 제어** | 없음 | isLocked, lockedBy (슬롯) | 없음 |
| **인덱스 전략** | Partial (PRIVATE) | Composite (serviceKey + organizationId + status) | Composite (serviceKey + organizationId) |

---

## 5. 통합 가능성 분석

### Q1. distribution_type 컬럼을 cms_contents에 추가 가능?

**기술적으로 가능하지만, 의미가 다르다.**

| 구분 | 상품 Distribution | CMS에 적용 시 의미 |
|------|-------------------|-------------------|
| PUBLIC | 모든 Operator에게 노출 | 모든 서비스 HUB에 노출 → **이미 serviceKey=null로 가능** |
| PRIVATE | 지정 Seller만 | 지정 조직만 노출 → **organizationId로 부분 가능** |

**결론**: CMS는 이미 `serviceKey` + `organizationId`로 PUBLIC/PRIVATE 의미를 **부분 커버**하고 있다. 단, 개별 사용자(seller) 단위 타겟팅은 불가.

### Q2. allowed_seller_ids를 CMS에 추가 가능?

**기술적으로 가능하지만, 사용 시나리오가 다르다.**

- 상품: "이 상품은 A, B 판매자만 볼 수 있다" → **공급자가 결정**
- 콘텐츠: "이 콘텐츠는 A, B 매장만 볼 수 있다" → **Admin이 결정**

추가할 경우:
```sql
-- cms_contents에 추가
allowed_organization_ids TEXT[] NULL
distribution_type VARCHAR(20) DEFAULT 'PUBLIC'
```

하지만 **CMS Core는 Frozen** (CLAUDE.md §5) → 스키마 변경에 WO 승인 필요.

### Q3. 기존 상품 쿼리를 CMS에서 재사용 가능?

**불가능.** 이유:

1. 상품 쿼리는 `neture_supplier_products` 테이블 전용 SQL
2. CMS는 TypeORM Repository 기반 (raw SQL 아님)
3. 필터 기준이 다름 (supplier_id vs serviceKey)
4. 관계 구조가 다름 (Supplier → Product vs Content → Slot)

### Q4. 공통 Distribution Core 추출 가능?

**가능하지만, 현재 시기상조.**

추출 가능한 공통 개념:

```typescript
interface DistributionPolicy {
  type: 'public' | 'private' | 'organization';
  allowedIds?: string[];      // 대상 ID 배열
  serviceKeys?: string[];     // 서비스 스코프
  organizationIds?: string[]; // 조직 스코프
}
```

하지만:
- 3개 시스템의 사용 패턴이 상이
- Core 패키지 생성은 CLAUDE.md §20 Operator OS Baseline Frozen 정책과 충돌 가능
- 현재 실제 사용 사례가 Product(Neture)에만 한정

### Q5. Signage도 동일 모델로 통합 가능?

**부분적으로 가능.**

Signage는 이미 `source` + `scope` 2차원 모델을 보유:
- `source`: 상품의 `distribution_type`과 유사 (출처 기반)
- `scope`: CMS의 `serviceKey` 스코프와 유사

하지만:
- Signage는 **개별 사용자 타겟팅** 개념이 없음
- `allowed_seller_ids` 등가물 없음
- 이미 자체 모델이 잘 작동 중

---

## 6. 리스크 분석

### 리스크 1: CMS Core Freeze 위반

CMS Core는 CLAUDE.md §5에서 **동결**되어 있다.
`cms_contents` 테이블에 컬럼 추가는 명시적 WO 승인 필요.

### 리스크 2: 과잉 통합

3개 시스템의 사용 패턴이 다른데 강제 통합하면:
- 쿼리 복잡도 증가
- 각 시스템의 단순성 상실
- 유지보수 비용 증가

### 리스크 3: 마이그레이션 부담

프로덕션 DB에 대한 스키마 변경은:
- CI/CD 자동 실행 필요
- 기존 데이터와의 호환성 검증 필요
- 롤백 계획 수립 필요

---

## 7. 판정: A/B/C/D 안

### A안: CMS에 상품 Distribution 구조를 그대로 이식

**❌ 부적합**

- 상품과 콘텐츠의 Distribution 의미가 다름
- CMS Core Freeze 정책 위반
- `allowed_seller_ids`의 사용 시나리오가 콘텐츠에 맞지 않음

### B안: CMS 전용 Visibility 모델 생성

**⭕ 가장 적합 (권장)**

CMS에 맞는 독자적 가시성 모델:

```typescript
// cms_contents 확장 (향후 WO)
visibility_scope: 'platform' | 'service' | 'organization' | 'targeted'
allowed_organization_ids: UUID[] | null  // targeted일 때
```

- 기존 `serviceKey` + `organizationId`를 명시적으로 체계화
- 상품 모델과 의미적으로 분리
- CMS 맥락에 맞는 설계

### C안: Distribution Core 패키지로 분리

**❌ 시기상조**

- 실사용 시스템이 Product 1개뿐
- Core 패키지 생성은 과잉 엔지니어링
- 3개 시스템의 공통점보다 차이점이 더 큼

### D안: 부분 재사용

**⭕ 현실적 대안**

- Distribution 개념(PUBLIC/PRIVATE)만 참고
- 각 시스템별 독자 구현 유지
- 향후 패턴이 수렴하면 Core 추출 고려

---

## 8. 결론

### 현재 상태

| 시스템 | 가시성 모델 | 성숙도 |
|--------|------------|--------|
| **Product** | `distribution_type` + `allowed_seller_ids` | 프로덕션 (WO 완료) |
| **CMS** | `serviceKey` + `organizationId` + `status` | 프로덕션 (Phase 0) |
| **Signage** | `source` + `scope` + `status` | 프로덕션 (Phase 2) |

### 권장 방향

1. **지금**: 각 시스템의 독자 모델 유지 (D안)
2. **다음 단계**: CMS에 `visibility_scope` 확장 검토 (B안, 별도 WO)
3. **중기**: 3개 시스템 패턴 수렴 시 공통 인터페이스 정의 고려
4. **장기**: Distribution Core 패키지는 실제 수요 발생 시에만

### 핵심 판정

> **통합은 시기상조이다.**
> 3개 시스템은 각자의 맥락에서 잘 작동하고 있으며,
> 강제 통합은 복잡도만 증가시킨다.
>
> CMS에 필요한 것은 **상품 모델 이식**이 아니라
> **CMS 맥락에 맞는 가시성 확장**이다.

---

## 9. 파일 위치 참조

| 구성요소 | 경로 |
|----------|------|
| NetureSupplierProduct Entity | `apps/api-server/src/modules/neture/entities/NetureSupplierProduct.entity.ts` |
| Distribution Migration | `apps/api-server/src/database/migrations/20260222100000-AddDistributionPolicyToNetureSupplierProducts.ts` |
| Neture Service (쿼리) | `apps/api-server/src/modules/neture/neture.service.ts` |
| KPA Catalog Controller | `apps/api-server/src/routes/kpa/controllers/pharmacy-products.controller.ts` |
| CmsContent Entity | `packages/cms-core/src/entities/CmsContent.entity.ts` |
| CmsContentSlot Entity | `packages/cms-core/src/entities/CmsContentSlot.entity.ts` |
| ContentQueryService | `apps/api-server/src/modules/content/content-query.service.ts` |
| CMS Routes | `apps/api-server/src/routes/cms-content/cms-content.routes.ts` |
| SignageMedia Entity | `packages/digital-signage-core/src/backend/entities/SignageMedia.entity.ts` |
| SignagePlaylist Entity | `packages/digital-signage-core/src/backend/entities/SignagePlaylist.entity.ts` |
| Signage Routes | `apps/api-server/src/routes/signage/` |
| Signage Types | `packages/types/src/signage.ts` |
| SignageQueryService | `apps/api-server/src/modules/signage/signage-query.service.ts` |

---

*Investigation completed: 2026-02-23*
*Investigator: Claude (AI-assisted code analysis)*
