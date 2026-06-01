# IR-O4O-STORE-EXECUTION-LIBRARY-CANONICAL-REFACTOR-V1

> 목적: "마케팅 자료함"과 Store 실행 결과물 저장 구조를 조사하고, "내 자료함" 및 "내 약국에서 만든 자료" canonical 구조를 정의한다.

**조사일**: 2026-05-11  
**조사 범위**: storeMenuConfig / 실행 결과물 entity 전체 / API 저장 흐름  
**변경사항**: 없음 (조사 전용)

---

## 1. 현재 메뉴 구조 ("마케팅 자료함")

**파일**: `packages/store-ui-core/src/config/storeMenuConfig.ts:228`

```
KPA_SOCIETY_STORE_CONFIG 현재 구조:
  ├─ (홈)
  ├─ 상품 관리
  ├─ 마케팅 자료함          ← 현재 그룹명
  │    ├─ 콘텐츠            /library/contents
  │    └─ 디지털 자료        /library/resources
  ├─ 디지털 사이니지
  │    ├─ 플레이리스트 / 동영상 / 스케줄 / TV 재생
  ├─ 매장 실행
  │    ├─ 채널 관리 / 태블릿
  │    ├─ POP              /marketing/pop
  │    ├─ QR 코드           /marketing/qr
  │    ├─ 블로그            /content/blog
  │    ├─ 상품 상세설명      /marketing/product-descriptions
  │    └─ 상담 요청
  ├─ 분석
  └─ 설정
```

**명칭 히스토리**:
```
"내 자료함" (초기)
→ "마케팅 자료함" (WO-O4O-STORE-SIDEBAR-MENU-UX-IMPROVEMENT-V1에서 변경)
→ 현재: "마케팅 자료함"
```

**화면 내부 breadcrumb**:
- StoreLibraryContentsPage: `<span>내 자료함</span>` (line 211)
- StoreLibraryResourcesPage: `<span>내 자료함</span>` (line 234)

→ **사이드바 그룹명과 내부 breadcrumb 불일치**: 그룹은 "마케팅 자료함", 내부는 "내 자료함"

**다른 서비스 현황**:
- GlycoPharm: "마케팅·콘텐츠" 그룹 (library 항목 없음, 구조 다름)
- K-Cosmetics: library 그룹 없음 (사이니지만 존재)

---

## 2. 실행 결과물 저장 구조 매핑

### 2.1 전체 테이블 매핑

| 결과물 | 테이블 | 저장 방식 | organization 격리 | soft delete |
|--------|--------|---------|-----------------|------------|
| **블로그 게시글** | `store_blog_posts` | DB 직접 | `store_id` | `status='archived'` |
| **블로그 설정** | `store_blog_settings` | DB 직접 | `store_id` (UNIQUE) | 없음 |
| **상품 AI 콘텐츠** | `product_ai_contents` | DB 직접 | `productId` 기반 | 없음 (hard delete) |
| **POP PDF** | **없음** | HTTP 응답 온-디맨드 | organization_id | N/A |
| **QR 코드** | `store_qr_codes` | DB 직접 | `organization_id` | `is_active=false` |
| **QR 스캔 로그** | `store_qr_scan_events` | DB 직접 | `organization_id` | 없음 (로그) |
| **실행 자산 (library)** | `store_execution_assets` | DB + 파일 스토리지 | `organization_id` | `is_active=false` |
| **매장 콘텐츠** | `kpa_store_contents` | DB 직접 | `organization_id` | 없음 (hard delete) |
| **Asset Snapshot** | `o4o_asset_snapshots` | DB 직접 | `organization_id` | 없음 |
| **Asset Control** | `kpa_store_asset_controls` | DB 직접 | `organization_id` | 없음 |
| **사이니지 미디어** | `signage_media` | DB + 파일 스토리지 | `serviceKey` + `organizationId` | `deletedAt` IS NULL |
| **사이니지 플레이리스트** | `signage_playlists` | DB (items JSONB) | `serviceKey` + `organizationId` | `deletedAt` IS NULL |

### 2.2 소프트 딜리트 정책 불일치 현황

```
store_blog_posts       → status='archived'
store_qr_codes         → is_active=false
store_execution_assets → is_active=false
signage_media          → deletedAt IS NULL (TypeORM @DeleteDateColumn)
signage_playlists      → deletedAt IS NULL (TypeORM @DeleteDateColumn)
product_ai_contents    → hard delete (없음)
kpa_store_contents     → hard delete (없음)
```

→ **정책 불통일**: 5가지 방식 혼재. 향후 정규화 필요.

---

## 3. 각 결과물의 실제 역할 판정

### 3.1 POP (팜플렛/홍보물)

| 항목 | 내용 |
|------|------|
| 역할 | 온-디맨드 PDF 생성기 |
| 저장 | **없음** — 생성 즉시 HTTP 응답으로 다운로드 |
| 참조 | `store_execution_assets` (library items) + `store_qr_codes` |
| 결과물 보관 | 사용자가 수동으로 `store_execution_assets`에 파일 업로드해야 보관 가능 |
| 판정 | **GENERATOR** — 저장소 아님 |
| 위험 | 재생성 가능하나 히스토리 없음 |

### 3.2 QR 코드

| 항목 | 내용 |
|------|------|
| 역할 | QR 코드 생성 + 공개 랜딩 페이지 |
| 저장 | `store_qr_codes` (slug, landing_type, landing_target_id) |
| 공개 URL | `/qr/:slug` — 영구 URL |
| 분석 | `store_qr_scan_events` — 스캔 로그 |
| library 참조 | `library_item_id` → `store_execution_assets` (논리적 참조, FK 아님) |
| 판정 | **CANONICAL STORAGE** — 별도 entity 필수 (slug + analytics) |
| 위험 | `store_execution_assets` 삭제 시 QR의 library_item_id dangling |

### 3.3 블로그

| 항목 | 내용 |
|------|------|
| 역할 | 매장 공개 블로그 채널 |
| 저장 | `store_blog_posts` (title, slug, content TEXT) |
| 공개 URL | `/stores/:slug/blog` — 매장 외부 공개 |
| 판정 | **CANONICAL STORAGE** — 독립 entity 필수 (공개 채널) |

### 3.4 상품 상세설명

| 항목 | 내용 |
|------|------|
| 역할 | 상품별 AI 생성 텍스트 콘텐츠 |
| 저장 | `product_ai_contents` (productId + content_type 기반 upsert) |
| content_type | product_description / pop_short / pop_long / qr_description / signage_text |
| 재생성 | overwrite 방식 (히스토리 없음) |
| organization 격리 | **productId 기반만** (organization_id 없음) |
| 판정 | **CANONICAL STORAGE** — 상품 종속 텍스트 저장소 |
| 위험 | organization 격리 미흡 |

### 3.5 사이니지

| 항목 | 내용 |
|------|------|
| 역할 | TV 디지털 사이니지 재생 |
| 미디어 저장 | `signage_media` (serviceKey + organizationId 격리) |
| 플레이리스트 | `signage_playlists` (items JSONB) |
| 스냅샷 연계 | `o4o_asset_snapshots` (asset_type='signage') |
| 판정 | **CANONICAL STORAGE** — 독립 도메인 |

---

## 4. kpa_store_contents 구조 분석

**테이블**: `kpa_store_contents`

```
source_type 기반 2-path 구조:
  'snapshot_edit' (snapshot_id NOT NULL)
    → 커뮤니티 콘텐츠 복제 후 매장이 편집
    → 렌더링: COALESCE(store_content, snapshot_content)
  'direct' (snapshot_id NULL)
    → 매장이 직접 생성한 콘텐츠
    → 렌더링: content_json 직접 사용
```

**content_json 내 metadata 필드** (선택적):
```json
{
  "purpose": "pop | qr | blog | product_description",
  "stage": "draft | finalized | archived",
  "createdFrom": "contents | resources | direct | ai | production_material"
}
```

**현재 상태**: `purpose/stage/createdFrom` 필드가 각 도구(POP/QR/블로그)에서 아직 저장 미구현. `StoreProductionMaterialsPage`가 이 metadata를 기대하지만 실제 데이터 수집이 되지 않음.

---

## 5. Single Source of Truth — 후보 분석

### 후보 A: 각 도메인별 독립 저장 유지 (현재 상태)

```
QR          → store_qr_codes
블로그       → store_blog_posts
상품설명     → product_ai_contents
POP         → store_execution_assets (파일 업로드 시)
사이니지     → signage_media / signage_playlists
직접 콘텐츠  → kpa_store_contents (source_type='direct')
```

**장점**: 각 도메인 독립성, slug/analytics 구조 유지  
**단점**: "내 약국에서 만든 자료" 통합 뷰 불가능, 검색/필터 불가  

### 후보 B: 내 자료함을 canonical 저장소로 승격

모든 결과물을 `store_execution_assets` 또는 `kpa_store_contents`로 통합 저장.

**장점**: 단일 조회 API  
**단점**: QR은 slug/analytics 때문에 별도 entity 불가피 → 사실상 mirror 구조 강제

### 후보 C: 도메인별 저장 유지 + 내 자료함에 URL/reference만 (권장)

```
내 자료함
  ├─ 콘텐츠 (외부에서 가져온 것)    → o4o_asset_snapshots
  ├─ 디지털 자료 (업로드/복사)       → store_execution_assets
  └─ 내 약국에서 만든 자료           → 각 도메인 canonical 집계 뷰 (read-only)
       - QR: store_qr_codes 참조 (URL + 스캔 수)
       - 블로그: store_blog_posts 참조 (최신 N개)
       - 상품설명: product_ai_contents 참조 (content_type='product_description')
       - POP: store_execution_assets (usage_type='pop') 참조
       - 사이니지: signage_playlists 참조
```

**장점**: 각 도메인 canonical 유지, 추가 저장 비용 없음, orphan 없음  
**단점**: 집계 API가 여러 테이블 JOIN 필요

### 후보 D: execution_assets 완전 통합

불가능. QR slug + scan events 포기 불가.

---

## 6. 권장 canonical 구조

### 6.1 결론: 후보 C 채택

```
내 자료함 (sidebar group)
  ├─ 콘텐츠      /library/contents     → o4o_asset_snapshots (cms/content/lesson)
  ├─ 자료        /library/resources    → store_execution_assets + o4o_asset_snapshots (resource)
  └─ 내 약국에서 만든 자료              → 집계 API (read-only)
       /library/produced
```

각 기능 화면 (POP/QR/블로그/상품설명)은 기존 canonical entity를 그대로 사용하며 CRUD 담당. `내 약국에서 만든 자료` 페이지는 read-only 집계 뷰.

### 6.2 "내 약국에서 만든 자료" 집계 API 설계

```sql
-- /library/produced API가 반환할 데이터 (union 방식)

SELECT 'qr' AS type, id, title, created_at, NULL AS url, is_active
FROM store_qr_codes WHERE organization_id = $1 AND is_active = true

UNION ALL

SELECT 'blog' AS type, id, title, created_at, NULL AS url, true
FROM store_blog_posts WHERE store_id = $1 AND status != 'archived'

UNION ALL

SELECT 'product_description' AS type, id,
       (SELECT name FROM product_masters WHERE id = product_id) AS title,
       created_at, NULL AS url, true
FROM product_ai_contents
WHERE product_id IN (SELECT id FROM product_masters WHERE organization_id = $1)
AND content_type = 'product_description'

UNION ALL

SELECT 'pop' AS type, id, title, created_at, file_url AS url, is_active
FROM store_execution_assets
WHERE organization_id = $1 AND usage_type = 'pop' AND is_active = true

ORDER BY created_at DESC LIMIT 50
```

---

## 7. 메뉴명 변경 범위 (단순 수정)

### 7.1 "마케팅 자료함" → "내 자료함" 명칭 변경

| 파일 | 변경 내용 | 범위 |
|------|---------|------|
| `packages/store-ui-core/src/config/storeMenuConfig.ts:228` | `label: '마케팅 자료함'` → `label: '내 자료함'` | 1줄 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts:230` | `label: '디지털 자료'` → `label: '자료'` | 1줄 (원래 명칭 복원) |
| `packages/shared-space-ui/src/guide/copy/kpa.ts:515` | 가이드 문구 | 1줄 |

Route/path 변경 없음. breadcrumb은 이미 "내 자료함" 사용 중 → 일치.

---

## 8. Orphan / Duplication 위험 분석

### 8.1 현재 orphan 위험

| 위험 | 내용 | 현재 방어 |
|------|------|---------|
| QR → library_item dangling | store_execution_assets 삭제 시 store_qr_codes.library_item_id dangling | DELETE /store/assets/:id에서 QR 참조 체크 (409) |
| POP 참조 연결 없음 | POP는 DB 저장 없으므로 참조 구조 없음 | N/A (온디맨드) |
| 블로그 store_id 불일치 | store_blog_posts.store_id vs kpa_store_contents.organization_id | 별도 entity이므로 교차 참조 없음 |
| product_ai_contents 고아 | product_masters 삭제 시 product_ai_contents orphan | cascade 없음 (위험) |

### 8.2 duplication 위험

| 케이스 | 내용 |
|--------|------|
| AI 콘텐츠 중복 저장 경로 | `product_ai_contents` + `kpa_store_contents(direct)` 둘 다에 상품설명 저장 가능 |
| POP 결과물 | 생성 후 수동으로 library에 올리면 `store_execution_assets` 중복 저장 가능 |

---

## 9. "내 약국에서 만든 자료" 정의 (canonical)

### 9.1 포함 대상

| 결과물 | canonical 저장 | URL 공개 여부 | 재사용 가능 |
|--------|--------------|-------------|-----------|
| QR 코드 | `store_qr_codes` | ✅ `/qr/:slug` | ✅ |
| 블로그 게시글 | `store_blog_posts` | ✅ `/stores/:slug/blog` | ✅ |
| 상품 상세설명 | `product_ai_contents` | ❌ | ✅ (복사 가능) |
| POP (보관한 것) | `store_execution_assets` (usage_type='pop') | ❌ (file_url) | ✅ |
| 사이니지 플레이리스트 | `signage_playlists` | ❌ (TV 전용) | ✅ |
| 직접 작성 콘텐츠 | `kpa_store_contents` (source_type='direct') | ✅ (채널에 발행 시) | ✅ |

### 9.2 포함하지 않는 것

- `o4o_asset_snapshots`: 외부에서 가져온 것 (만든 것이 아님)
- `store_execution_assets` (usage_type != 'pop'): 업로드 자료 (만든 것이 아님)

---

## 10. 기능 화면 역할 재정의

| 화면 | 현재 역할 | 판정 | 이유 |
|------|---------|------|------|
| `StoreLibraryContentsPage` | VIEWER + ENTRY | **Keep** | 소스 자료 선택 진입점 |
| `StoreLibraryResourcesPage` | STORAGE + VIEWER + ENTRY | **Keep** | 직접 업로드 + 커뮤니티 자료 |
| `StorePopPage` | GENERATOR | **Keep** | 온디맨드 PDF 생성 |
| `StoreQRPage` | STORAGE + VIEWER | **Keep** | QR canonical entity |
| `PharmacyBlogPage` | STORAGE + VIEWER | **Keep** | 블로그 canonical entity |
| `StoreProductDescriptionsPage` | STORAGE + VIEWER | **Keep** | AI 콘텐츠 canonical entity |
| `StoreProductionMaterialsPage` | AGGREGATOR (미완성) | **Keep + 완성 필요** | 집계 뷰 (metadata 수집 미완) |

---

## 11. 분류 및 WO 순서

### 즉시 가능 (작고 안전)

```
WO-1: WO-O4O-KPA-STORE-LIBRARY-LABEL-CANONICAL-V1
  - "마케팅 자료함" → "내 자료함"
  - "디지털 자료" → "자료"
  - storeMenuConfig.ts 2줄 변경
  - breadcrumb 이미 "내 자료함" 사용 중 → 완전 일치
  - 위험도: 없음
```

### 중기 (별도 WO)

```
WO-2: WO-O4O-KPA-STORE-LIBRARY-PRODUCED-TAB-V1
  - /library/produced 신규 페이지 (read-only 집계 뷰)
  - "내 약국에서 만든 자료" 탭 추가
  - 집계 API: QR + 블로그 + 상품설명 + POP(library) UNION
  - 위험도: 낮음 (신규 페이지, 기존 코드 변경 없음)

WO-3: WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-METADATA-V1
  - POP/QR/블로그 저장 시 kpa_store_contents.content_json에 purpose/stage/createdFrom 기록
  - StoreProductionMaterialsPage 실 데이터 활성화
  - 위험도: 낮음 (메타데이터 추가만)
```

### 장기 (구조 정리)

```
WO-4: WO-O4O-STORE-CONTENT-SOFTDELETE-NORMALIZE-V1
  - kpa_store_contents / product_ai_contents soft delete 정책 통일
  - deletedAt 또는 is_active 기준 표준화
  - 위험도: 중간

WO-5: WO-O4O-PRODUCT-AI-CONTENTS-ORG-ISOLATION-V1
  - product_ai_contents에 organization_id 추가
  - 멀티테넌트 격리 강화
  - 위험도: 중간 (마이그레이션 필요)
```

---

## 12. 요약

| 항목 | 결론 |
|------|------|
| "마케팅 자료함" → "내 자료함" | storeMenuConfig 1줄, 즉시 가능 |
| "내 약국에서 만든 자료" canonical | 후보 C (read-only 집계 뷰), 신규 페이지 필요 |
| SSOT 방향 | 각 도메인별 canonical 유지 + 집계 뷰로 통합 표시 |
| POP | DB 저장 없음 (온디맨드), library 업로드 시에만 보관 가능 |
| QR | 별도 entity 유지 필수 (slug/analytics) |
| soft delete 불일치 | 5가지 방식 혼재 → 별도 WO로 정규화 필요 |
| orphan 위험 | QR→library_item (현재 방어됨), product_ai→product (cascade 없음) |
| 즉시 착수 가능 | WO-1 (메뉴명 2줄) → WO-2 (집계 탭 신규 페이지) |
