# IR-O4O-ASSET-COPY-CORE-IMPACT-ANALYSIS-V1

> **Asset Copy Engine → Execution Core 승격 전 최종 안전 점검**
>
> 이 IR은 플랫폼 구조 고정 전 마지막 안전 점검이다.
> 추측이 아닌 코드 기반 분석만 포함한다.

- **작성일**: 2026-02-16
- **유형**: Read-Only Investigation (코드 수정 없음)
- **범위**: Asset Copy Engine 전체 파일 + 잠재 확장 서비스
- **선행 WO**: WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1, WO-O4O-ASSET-COPY-NETURE-PILOT-V1

---

## 1. Dependency Matrix — SnapshotService & Controller Import 분석

### 1.1 AssetSnapshotService 의존성

| Import | 소스 | 계층 | Core 승격 시 처리 |
|--------|------|------|------------------|
| `DataSource, Repository` | `typeorm` | 외부 라이브러리 | 유지 (Core도 TypeORM 사용) |
| `AssetSnapshot` | `./entities/asset-snapshot.entity.js` | 내부 Entity | Core 패키지에 포함 |
| `CmsContent` | `@o4o-apps/cms-core/entities` | **cms-core 패키지** | **제거 대상** — Core에서 직접 참조 금지 |
| `AssetResolver` (type) | `./interfaces/asset-resolver.interface.js` | 내부 Interface | Core 패키지에 포함 |

**핵심 발견**: `AssetSnapshotService`가 `CmsContent`를 직접 import하는 구간은 레거시 `copyAsset()` 메서드의 `fetchCmsContent()`/`fetchSignageContent()` 내부 — KPA Pilot 1차 코드.

```
asset-snapshot.service.ts:16 → import { CmsContent } from '@o4o-apps/cms-core/entities';
```

이 import는 `copyWithResolver()` 경로에서는 사용되지 않음. Resolver 패턴 도입 후 `copyAsset()` → `copyWithResolver()` 전환 시 **제거 가능**.

### 1.2 KPA Controller 의존성

| Import | 소스 | Core 이동 가능? |
|--------|------|----------------|
| `AssetSnapshotService` | `../../../modules/asset-snapshot/` | Core에서 제공 |
| `KpaMember` | `../entities/kpa-member.entity.js` | ❌ KPA 전용 — Controller에 잔류 |
| `asyncHandler` | `../../../middleware/error-handler.js` | 유틸리티, Core 또는 공통 |
| `hasAnyServiceRole` | `../../../utils/role.utils.js` | 유틸리티, Core 또는 공통 |
| `KpaRole` (type) | `../../../types/roles.js` | Controller에 잔류 |

### 1.3 Neture Controller 의존성

| Import | 소스 | Core 이동 가능? |
|--------|------|----------------|
| `AssetSnapshotService` | `../../asset-snapshot/asset-snapshot.service.js` | Core에서 제공 |
| `NetureAssetResolver` | `../../asset-snapshot/resolvers/neture-asset.resolver.js` | Resolver Registry 또는 서비스 잔류 |
| `asyncHandler` | `../../../middleware/error-handler.js` | 유틸리티, Core 또는 공통 |
| `hasAnyServiceRole` | `../../../utils/role.utils.js` | 유틸리티, Core 또는 공통 |
| `NetureRole` (type) | `../../../types/roles.js` | Controller에 잔류 |

### 1.4 Dependency Matrix 요약

```
                    ┌──────────────────────────┐
                    │   Core 패키지 후보        │
                    │                          │
                    │  AssetSnapshot (Entity)   │
                    │  AssetSnapshotService     │
                    │  AssetResolver (Interface)│
                    │  ResolvedAsset (Type)     │
                    └──────────┬───────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐  ┌─────▼──────┐   ┌─────▼──────┐
     │ KPA Controller│  │ Neture Ctrl│   │ Future Ctrl│
     │               │  │            │   │            │
     │ KpaMember     │  │ neture_    │   │ cosmetics_ │
     │ KpaRole[]     │  │ suppliers  │   │ products   │
     │ KpaResolver   │  │ NetureRole │   │ CosRole[]  │
     └───────────────┘  │ NetureResv │   │ CosResolver│
                        └────────────┘   └────────────┘
```

**판정**: Core 패키지는 Entity + Service + Interface만 포함. Resolver와 Controller는 서비스별 잔류. **의존 방향이 깨끗하다.**

---

## 2. Resolver Generalization — KPA vs Neture 구조 비교

### 2.1 인터페이스 동일성

```typescript
// 두 Resolver 모두 동일 인터페이스 구현
export interface AssetResolver {
  resolve(sourceAssetId: string, assetType: 'cms' | 'signage'): Promise<ResolvedAsset | null>;
}
```

### 2.2 구현 비교 매트릭스

| 항목 | KpaAssetResolver | NetureAssetResolver | 일반화 가능? |
|------|-----------------|---------------------|------------|
| 생성자 | `DataSource` | `DataSource` | ✅ 동일 |
| resolve() 시그니처 | 동일 | 동일 | ✅ 동일 |
| CMS 소스 | `CmsContent` (cms-core) | `NetureSupplierContent` | ❌ 서비스별 상이 |
| Signage 소스 | `signage_media` raw SQL | `signage_media` raw SQL | ✅ **동일 쿼리** |
| CMS contentJson 필드 | title, type, summary, body, imageUrl, linkUrl, linkText, metadata | title, type, description, body, imageUrl, status, availableServices, availableAreas | ❌ 서비스별 상이 |
| sourceService 값 | `'kpa'` (하드코딩) | `'neture'` (하드코딩) | ✅ 매개변수화 가능 |

### 2.3 Signage Resolver 공통화 가능성

두 Resolver의 `resolveSignage()` 메서드는 **완전히 동일한 SQL**:

```sql
SELECT "id", "name", "description", "mediaType", "sourceType", "sourceUrl",
       "thumbnailUrl", "duration", "resolution", "content", "tags", "category", "metadata"
FROM "signage_media"
WHERE "id" = $1 AND "deletedAt" IS NULL
LIMIT 1
```

**권장**: Signage Resolver는 Core에 공통 구현 제공 가능. CMS Resolver만 서비스별 구현.

### 2.4 Resolver 팩토리 가능성

```typescript
// 가능한 Core 유틸리티
function createSignageResolver(dataSource: DataSource, sourceService: string): (id: string) => Promise<ResolvedAsset | null>
```

CMS resolver는 소스 엔티티가 서비스마다 다르므로(CmsContent vs NetureSupplierContent vs 향후 CosmeticsProduct) 팩토리 불가. **서비스별 구현이 올바른 설계**.

### 2.5 판정

| 항목 | 결과 |
|------|------|
| AssetResolver 인터페이스 | ✅ Core 승격 적합 — 변경 없이 그대로 |
| ResolvedAsset 타입 | ✅ Core 승격 적합 — 변경 없이 그대로 |
| Signage 공통 resolver | ⚡ 선택적 Core 제공 가능 (우선순위 낮음) |
| CMS resolver | ❌ Core 불가 — 서비스별 구현 필수 |

---

## 3. Permission Model Abstraction 가능성 분석

### 3.1 현재 권한 모델 비교

| 항목 | KPA Controller | Neture Controller |
|------|---------------|------------------|
| 허용 역할 | `['kpa:admin', 'kpa:operator', 'kpa:branch_admin', 'kpa:branch_operator']` | `['neture:admin', 'neture:supplier']` |
| 역할 타입 | `KpaRole[]` | `NetureRole[]` |
| 검증 함수 | `hasAnyServiceRole(userRoles, OPERATOR_ROLES)` | `hasAnyServiceRole(userRoles, NETURE_ASSET_ROLES)` |
| Org 해석 | `KpaMember.organization_id` 조회 | `neture_suppliers.id` 조회 |
| Org 미소속 에러 | `NO_ORGANIZATION` | `NO_SUPPLIER` |

### 3.2 공통 패턴 추출

**공통**:
- `hasAnyServiceRole(userRoles, allowedRoles)` — 동일 유틸리티 사용
- Auth → Role Guard → Org Resolution → Service Call → Error Handling 흐름 동일
- 에러 코드 패턴 동일: UNAUTHORIZED → FORBIDDEN → NO_ORG → MISSING_FIELDS → SERVICE_ERROR

**비공통**:
- `allowedRoles` 배열 — 서비스마다 다름
- `resolveOrgId(dataSource, userId)` — 조회 테이블/로직 완전히 다름
- 에러 메시지 — 서비스 컨텍스트 반영

### 3.3 Controller Factory 패턴 평가

```typescript
// 제안된 Core Controller Factory
function createAssetCopyController(config: {
  allowedRoles: PrefixedRole[];
  resolveOrgId: (ds: DataSource, userId: string) => Promise<string | null>;
  sourceService: string;
  resolver: AssetResolver;
  noOrgErrorCode?: string;
}): (dataSource: DataSource, requireAuth: AuthMiddleware) => Router;
```

| 평가 항목 | 점수 | 근거 |
|----------|------|------|
| 보일러플레이트 제거 | ⭐⭐⭐ | POST/GET 핸들러 구조 ~80% 동일 |
| 유연성 유지 | ⭐⭐⭐ | 모든 가변 요소가 config로 주입됨 |
| 복잡도 | ⭐⭐ | 중간 — config 인터페이스 문서화 필요 |
| 서비스별 커스텀 | ⭐⭐⭐ | `resolveOrgId`로 완전 분리 |

### 3.4 `isServiceOperator()` 적합성

```typescript
// role.utils.ts:132
export function isServiceOperator(userRoles: string[], serviceKey: ServiceKey): boolean {
  // 검사: {service}:operator, {service}:admin, platform:admin, platform:super_admin
}
```

**KPA**: `isServiceOperator(roles, 'kpa')` → `kpa:operator` + `kpa:admin` 매칭. 하지만 `branch_admin`, `branch_operator`는 누락됨 → **부적합**
**Neture**: `isServiceOperator(roles, 'neture')` → `neture:operator` 매칭. 하지만 Neture에는 `operator` 역할이 없고 `supplier`가 필요 → **부적합**

**결론**: `isServiceOperator()`는 Asset Copy에 부적합. `hasAnyServiceRole()` + 서비스별 역할 배열이 올바른 패턴. Controller Factory에서 `allowedRoles` 주입 방식이 정답.

### 3.5 판정

| 항목 | 결과 |
|------|------|
| Controller Factory | ✅ Core 제공 권장 — 보일러플레이트 80% 제거 |
| hasAnyServiceRole() | ✅ 이미 공통 유틸 — 변경 불필요 |
| isServiceOperator() | ❌ Asset Copy에 부적합 — 사용 금지 |
| resolveOrgId 콜백 | ✅ 서비스별 주입이 올바른 설계 |

---

## 4. DB / Migration Impact 분석

### 4.1 현재 테이블 구조

```sql
-- Migration: 20260216000001-CreateO4oAssetSnapshots.ts
CREATE TABLE "o4o_asset_snapshots" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"  uuid NOT NULL,
  "source_service"   varchar(50) NOT NULL,
  "source_asset_id"  uuid NOT NULL,
  "asset_type"       varchar(20) NOT NULL,
  "title"            text NOT NULL,
  "content_json"     jsonb NOT NULL DEFAULT '{}',
  "created_by"       uuid NOT NULL,
  "created_at"       timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX "IDX_asset_snap_org_id" ON "o4o_asset_snapshots" ("organization_id");
CREATE INDEX "IDX_asset_snap_asset_type" ON "o4o_asset_snapshots" ("asset_type");
CREATE INDEX "IDX_asset_snap_source" ON "o4o_asset_snapshots" ("source_service", "source_asset_id");

-- Migration: 20260216100001-AddUniqueConstraintAssetSnapshots.ts
ALTER TABLE "o4o_asset_snapshots"
  ADD CONSTRAINT "UQ_asset_snapshot_org_source_type"
  UNIQUE ("organization_id", "source_asset_id", "asset_type");
```

### 4.2 Core 승격 시 DB 변경 필요 여부

| 항목 | 변경 필요? | 근거 |
|------|-----------|------|
| 테이블 이름 | ❌ | `o4o_asset_snapshots` — 이미 플랫폼 접두사 |
| 컬럼 구조 | ❌ | 서비스 비종속적 설계 (source_service가 서비스 구분) |
| organization_id | ❌ | KPA=org UUID, Neture=supplier UUID — 의미적 차이만, 타입 동일 |
| source_service | ❌ | varchar(50) — 서비스 확장에 충분 |
| asset_type | ⚠️ 검토 | 현재 'cms'/'signage'만. 향후 'product' 등 추가 시 varchar(20) 확인 필요 |
| content_json | ❌ | jsonb — 스키마리스, 무한 확장 가능 |
| UNIQUE 제약 | ❌ | (org_id, source_asset_id, asset_type) — 모든 서비스에 동일 적용 |
| FK 제약 | ❌ | 없음 — No FK 설계 원칙 유지 |

### 4.3 마이그레이션 전략

**Core 승격 시 필요한 DB 마이그레이션: 0건**

테이블 구조가 이미 플랫폼 수준으로 설계되어 있음. Core 패키지 생성은 코드 구조 변경만 수반.

### 4.4 asset_type 확장성

현재 값: `'cms' | 'signage'`

| 잠재 확장 | asset_type 값 | content_json 스키마 |
|----------|--------------|-------------------|
| Cosmetics 제품 | `'product'` | `{ name, images, ingredients, ... }` |
| GlycoPharm 제품 | `'product'` | `{ name, images, manufacturer, ... }` |
| AI 생성 콘텐츠 | `'ai_content'` | `{ prompt, output, model, ... }` |

`varchar(20)`은 이 모든 값에 충분. ResolvedAsset 인터페이스의 `type` 필드만 유니온 확장 필요:

```typescript
// 현재
type: 'cms' | 'signage';
// 확장 시
type: 'cms' | 'signage' | 'product' | 'ai_content';
```

### 4.5 판정

| 항목 | 결과 |
|------|------|
| DB 마이그레이션 | ✅ 불필요 — 0건 |
| 테이블 네이밍 | ✅ 이미 플랫폼 표준 (`o4o_` 접두사) |
| 스키마 확장성 | ✅ jsonb + varchar로 무한 확장 |
| asset_type 확장 | ⚠️ TypeScript 타입만 확장 필요 (DB 변경 없음) |

---

## 5. Cross-Service Coupling Risk 분석

### 5.1 현재 커플링 포인트

| 커플링 | 위치 | 위험도 | 설명 |
|--------|------|--------|------|
| `CmsContent` import | `asset-snapshot.service.ts:16` | **HIGH** | Service → cms-core 직접 의존 |
| `CmsContent` import | `kpa-asset.resolver.ts:11` | LOW | Resolver는 서비스 코드 — Core 외부 |
| `NetureSupplierContent` import | `neture-asset.resolver.ts:15` | LOW | Resolver는 서비스 코드 — Core 외부 |
| `signage_media` raw SQL | 두 Resolver 모두 | MEDIUM | 테이블명 하드코딩 |
| `KpaMember` import | KPA controller | LOW | Controller는 서비스 코드 |
| `neture_suppliers` raw SQL | Neture controller | LOW | Controller는 서비스 코드 |

### 5.2 Core 승격 시 커플링 제거 계획

**제거 대상 (1건)**:

```
asset-snapshot.service.ts:16
import { CmsContent } from '@o4o-apps/cms-core/entities';
```

이 import는 `copyAsset()` → `fetchCmsContent()` → `fetchSignageContent()` 레거시 경로에서만 사용됨.

**제거 방법**:
- `copyAsset()` 메서드를 KPA Controller 내부로 이동하거나
- `copyAsset()` 호출을 `copyWithResolver(input, new KpaAssetResolver(ds))` 로 교체
- 교체 후 `CmsContent` import, `fetchCmsContent()`, `fetchSignageContent()` private 메서드 3개 제거

**영향 범위**: KPA Controller 1곳만 호출 변경 → 극히 제한적

### 5.3 Resolver 간 커플링

```
KpaAssetResolver → CmsContent (cms-core)        → OK (서비스 코드)
KpaAssetResolver → signage_media (raw SQL)       → OK (서비스 코드)
NetureAssetResolver → NetureSupplierContent      → OK (서비스 코드)
NetureAssetResolver → signage_media (raw SQL)    → OK (서비스 코드)
```

Resolver는 Core 외부에 남으므로 이 커플링은 **정상적인 서비스-레이어 의존성**. 문제 없음.

### 5.4 Controller 간 커플링

KPA Controller와 Neture Controller 사이에 직접 커플링 **없음**. 둘 다 독립적으로 `AssetSnapshotService`를 인스턴스화.

### 5.5 판정

| 항목 | 결과 |
|------|------|
| Core → 외부 커플링 | ⚠️ 1건 (`CmsContent`) — **제거 필수** |
| 서비스 → Core 커플링 | ✅ 정상 (단방향 의존) |
| 서비스 간 커플링 | ✅ 없음 |
| 제거 난이도 | LOW — `copyAsset()` → `copyWithResolver()` 전환 1건 |

---

## 6. Extensibility Simulation

### 6.1 Cosmetics 서비스 확장 시뮬레이션

**시나리오**: K-Cosmetics 제품을 매장 자산으로 복사

| 항목 | 구현 내용 |
|------|----------|
| Resolver | `CosmeticsAssetResolver` 신규 생성 |
| CMS 소스 | `cosmetics_products` 테이블 (entity: `CosmeticsProduct`) |
| contentJson | `{ name, subtitle, description, images, ingredients, manufacturer, ... }` |
| asset_type | `'product'` (신규 타입) |
| 허용 역할 | `['cosmetics:admin', 'cosmetics:operator', 'cosmetics:supplier']` |
| Org 해석 | Cosmetics supplier/seller 매핑 테이블 조회 |
| Controller | `createCosmeticsAssetController(config)` — Factory 패턴 사용 시 ~20줄 |

**필요 작업**:
1. `CosmeticsAssetResolver` 1파일 (~50줄)
2. Controller config 1파일 (~20줄, Factory 사용 시)
3. Route 마운트 1줄
4. `ResolvedAsset.type` 유니온에 `'product'` 추가

**Core 변경**: `ResolvedAsset.type` 확장만 — **미미**

### 6.2 GlycoPharm 서비스 확장 시뮬레이션

**시나리오**: GlycoPharm 약국 제품을 매장 자산으로 복사

| 항목 | 구현 내용 |
|------|----------|
| Resolver | `GlycopharmAssetResolver` 신규 생성 |
| CMS 소스 | `glycopharm_products` 테이블 (entity: `GlycopharmProduct`) |
| contentJson | `{ name, subtitle, description, images, manufacturer, origin_country, ... }` |
| asset_type | `'product'` |
| 허용 역할 | `['glycopharm:admin', 'glycopharm:operator', 'glycopharm:pharmacy']` |
| Org 해석 | `glycopharm_pharmacies.id` (pharmacy_id) |
| Controller | Factory 패턴 동일 |

**주의사항**: GlycoPharm Legacy 정책 (CLAUDE.md §13) — `glycopharm_orders` READ-ONLY, `OrderType.GLYCOPHARM` BLOCKED. 단, Asset Copy는 주문이 아니므로 **Legacy 제약에 해당하지 않음**.

**필요 작업**: Cosmetics와 동일 수준 (~70줄 신규 코드)

### 6.3 AI 생성 콘텐츠 확장 시뮬레이션

**시나리오**: AI 오케스트레이터가 생성한 콘텐츠를 매장 자산으로 저장

| 항목 | 구현 내용 |
|------|----------|
| Resolver | `AiContentResolver` — AI 출력을 ResolvedAsset로 변환 |
| CMS 소스 | AI 오케스트레이터 응답 (DB 테이블 불필요) |
| contentJson | `{ prompt, output, model, provider, confidenceScore, ... }` |
| asset_type | `'ai_content'` |
| 특이사항 | Resolver가 DB 조회 대신 AI API 호출 가능 |

**AssetResolver 인터페이스 적합성**: `resolve(sourceAssetId, assetType)` — sourceAssetId를 AI 생성 세션 ID로 해석 가능. 인터페이스 변경 불필요.

### 6.4 확장성 종합 평가

| 서비스 | 신규 파일 수 | Core 변경 | 예상 코드량 | 난이도 |
|--------|------------|----------|-----------|--------|
| Cosmetics | 2 (Resolver + Controller config) | type 확장 1줄 | ~70줄 | LOW |
| GlycoPharm | 2 | type 확장 0줄 (Cosmetics와 공유) | ~70줄 | LOW |
| AI Content | 2 | type 확장 1줄 | ~60줄 | LOW |
| 미래 서비스 X | 2 | 0줄 | ~70줄 | LOW |

**패턴**: 새 서비스 추가 = Resolver 1개 + Controller config 1개. **Core 수정 최소화 원칙 달성.**

---

## 7. Risk Classification

### 7.1 리스크 매트릭스

| ID | 리스크 | 등급 | 영향 | 완화 방안 |
|----|--------|------|------|----------|
| R1 | CmsContent import 잔류 | **MEDIUM** | Core가 cms-core에 의존 → 순환 위험 | `copyAsset()` → `copyWithResolver()` 전환으로 제거 |
| R2 | `copyAsset()` 레거시 메서드 잔존 | **MEDIUM** | 이중 경로 혼란 | KPA Controller가 Resolver 경로 사용 후 제거 |
| R3 | signage_media 테이블명 하드코딩 | **LOW** | Signage 테이블 변경 시 2곳 수정 필요 | 공통 상수 또는 Core Signage Resolver 제공 |
| R4 | asset_type이 TypeScript에서 string | **LOW** | 잘못된 타입 값 가능 | Core에서 `AssetType` 유니온 타입 export |
| R5 | organization_id 의미 불일치 | **LOW** | KPA=조직, Neture=공급자 — 개념적 혼동 | 문서화. DB 수준 동일 타입(uuid)이므로 실제 위험 없음 |
| R6 | Controller 보일러플레이트 반복 | **LOW** | 3번째 서비스부터 복붙 위험 | Controller Factory 패턴 도입 |
| R7 | ResolvedAsset.type 유니온 확장 필요 | **LOW** | 신규 asset_type 추가 시 Core 수정 | string literal union → string으로 변경 또는 확장 가능 설계 |

### 7.2 CRITICAL 리스크

**없음.** 현재 구조에 CRITICAL 등급 리스크는 발견되지 않음.

### 7.3 Core 승격 전 필수 조치 (MEDIUM)

1. **R1+R2**: `AssetSnapshotService`에서 `CmsContent` import 제거
   - `copyAsset()` 메서드 → deprecated 표기 또는 제거
   - `fetchCmsContent()`, `fetchSignageContent()` private 메서드 제거
   - KPA Controller가 `copyWithResolver(input, new KpaAssetResolver(ds))` 사용

**예상 작업량**: ~15줄 변경, 영향 범위 KPA Controller 1곳

---

## 8. Final Verdict

### 8.1 Core 승격 적합성 평가

| 평가 기준 | 점수 | 근거 |
|----------|------|------|
| 인터페이스 안정성 | ⭐⭐⭐ | AssetResolver, ResolvedAsset — 2개 서비스에서 검증, 변경 불필요 |
| 서비스 독립성 | ⭐⭐⭐ | Resolver/Controller가 서비스에 남고, Core는 순수 |
| DB 안정성 | ⭐⭐⭐ | 마이그레이션 0건, 테이블 이미 플랫폼 표준 |
| 확장성 | ⭐⭐⭐ | 서비스 추가 = Resolver + Config 2파일, Core 변경 최소 |
| 커플링 제거 가능성 | ⭐⭐ | CmsContent import 1건 제거 필요 (MEDIUM 난이도) |
| 권한 모델 | ⭐⭐⭐ | hasAnyServiceRole + 역할 배열 주입 — 깨끗한 추상화 |

### 8.2 판정

## **A) Core 승격 가능**

근거:
1. **인터페이스가 안정적** — AssetResolver/ResolvedAsset은 KPA + Neture 2개 파일럿에서 변경 없이 동작
2. **의존 방향이 깨끗** — Core → 외부 커플링은 CmsContent 1건뿐이며 제거 가능
3. **DB 변경 불필요** — 테이블이 이미 플랫폼 수준 설계
4. **확장 비용이 일정** — 서비스 추가마다 ~70줄, Core 변경 최소
5. **CRITICAL 리스크 없음** — MEDIUM 2건은 승격 작업 중 자연 해소

### 8.3 Core 패키지 구성 권장안

```
packages/asset-copy-core/
├── src/
│   ├── entities/
│   │   └── asset-snapshot.entity.ts     ← 현재 위치에서 이동
│   ├── interfaces/
│   │   └── asset-resolver.interface.ts  ← 현재 위치에서 이동
│   ├── services/
│   │   └── asset-snapshot.service.ts    ← CmsContent 의존 제거 후 이동
│   ├── factory/
│   │   └── create-asset-controller.ts   ← 신규 (Controller Factory)
│   └── index.ts                         ← public API export
├── package.json
└── tsconfig.json
```

**Core 외부 잔류 (서비스별)**:
- `resolvers/kpa-asset.resolver.ts` → `apps/api-server/src/routes/kpa/`
- `resolvers/neture-asset.resolver.ts` → `apps/api-server/src/modules/neture/`
- 각 서비스 Controller config

### 8.4 승격 전 필수 조치 체크리스트

| # | 조치 | 우선순위 | 상태 |
|---|------|---------|------|
| 1 | `copyAsset()` 레거시 경로 → Resolver 경로 전환 | **필수** | 미완 |
| 2 | `CmsContent` import 제거 (Service에서) | **필수** | 미완 |
| 3 | `fetchCmsContent()` / `fetchSignageContent()` 제거 | **필수** | 미완 |
| 4 | Controller Factory 구현 | 권장 | 미완 |
| 5 | `AssetType` 유니온 타입 정의 | 권장 | 미완 |
| 6 | signage_media 공통 Resolver 검토 | 선택 | 미완 |

---

## 부록: 분석 대상 파일 목록

| 파일 | 역할 | 분석 결과 |
|------|------|----------|
| `apps/api-server/src/modules/asset-snapshot/asset-snapshot.service.ts` | Core Service | CmsContent 의존 1건 제거 필요 |
| `apps/api-server/src/modules/asset-snapshot/entities/asset-snapshot.entity.ts` | Core Entity | 변경 불필요 |
| `apps/api-server/src/modules/asset-snapshot/interfaces/asset-resolver.interface.ts` | Core Interface | 변경 불필요 |
| `apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts` | KPA Resolver | 서비스에 잔류 |
| `apps/api-server/src/modules/asset-snapshot/resolvers/neture-asset.resolver.ts` | Neture Resolver | 서비스에 잔류 |
| `apps/api-server/src/routes/kpa/controllers/asset-snapshot.controller.ts` | KPA Controller | 서비스에 잔류, Resolver 경로 전환 필요 |
| `apps/api-server/src/modules/neture/controllers/neture-asset-snapshot.controller.ts` | Neture Controller | 서비스에 잔류 |
| `apps/api-server/src/utils/role.utils.ts` | 공통 유틸 | 변경 불필요 |
| `apps/api-server/src/types/roles.ts` | 공통 타입 | 변경 불필요 |
| `apps/api-server/src/database/migrations/20260216000001-CreateO4oAssetSnapshots.ts` | DB Migration | 추가 마이그레이션 불필요 |
| `apps/api-server/src/database/migrations/20260216100001-AddUniqueConstraintAssetSnapshots.ts` | DB Migration | 추가 마이그레이션 불필요 |
| `services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx` | Store Hub UI | 변경 불필요 |

---

*Investigation completed: 2026-02-16*
*Verdict: **A) Core 승격 가능***
*CRITICAL risks: 0 | MEDIUM: 2 (승격 작업 중 해소) | LOW: 5*
