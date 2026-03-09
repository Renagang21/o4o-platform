# IR-O4O-PRODUCT-AI-DATA-AUDIT-V1

## Product Master · AI Content · OCR 구조 종합 감사 보고서

> **조사 일자:** 2026-03-09
> **조사 범위:** `apps/api-server/src/` + `packages/` 전체
> **조사 방식:** 코드 정적 분석 (Read-Only, 수정 없음)

---

## 1. Product Master (제품 마스터)

### 1.1 엔티티

**파일:** `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`
**테이블:** `product_masters`

| 컬럼 | 타입 | Nullable | 제약 | 비고 |
|------|------|----------|------|------|
| id | UUID | NO | PK | auto-gen |
| barcode | VARCHAR(14) | NO | UNIQUE | GTIN — **IMMUTABLE** |
| regulatory_type | VARCHAR(50) | NO | - | 식약처 규제 유형 — **IMMUTABLE** |
| regulatory_name | VARCHAR(255) | NO | - | 식약처 공식 제품명 — **IMMUTABLE** |
| marketing_name | VARCHAR(255) | NO | - | 마케팅용 표시명 |
| brand_name | VARCHAR(255) | YES | - | Legacy (brandId 마이그레이션 후 null) |
| category_id | UUID | YES | FK → product_categories | 카테고리 |
| brand_id | UUID | YES | FK → brands | 브랜드 |
| specification | TEXT | YES | - | 제품 규격 (예: 500mg × 60정) |
| origin_country | VARCHAR(100) | YES | - | 원산지 |
| tags | JSONB | NO | GIN Index | 검색/필터 태그 (AI sync) |
| manufacturer_name | VARCHAR(255) | NO | - | 제조사명 — **IMMUTABLE** |
| mfds_permit_number | VARCHAR(100) | YES | - | 식약처 허가 번호 — **IMMUTABLE** |
| mfds_product_id | VARCHAR(100) | NO | - | 식약처 제품 ID — **IMMUTABLE** |
| is_mfds_verified | BOOLEAN | NO | default: true | 식약처 검증 여부 |
| mfds_synced_at | TIMESTAMP | YES | - | 식약처 동기화 시각 |
| created_at | TIMESTAMP | NO | auto | - |
| updated_at | TIMESTAMP | NO | auto | - |

**불변 필드(Immutable):** barcode, regulatory_type, regulatory_name, manufacturer_name, mfds_permit_number, mfds_product_id

**Relations:**
- `@OneToMany('SupplierProductOffer', 'master')` → offers
- `@OneToMany('ProductImage', 'master')` → images

### 1.2 SSOT 원칙

- **1 barcode = 1 ProductMaster** (물리적 제품과 1:1)
- 불변 필드는 생성 후 수정 불가 (Guard 로직 존재)
- 공급자(Supplier)가 `SupplierProductOffer`를 통해 가격/유통 설정
- 매장(Store)이 `StoreProductProfile`을 통해 매장별 설명/코멘트 커스터마이징

---

## 2. Product Description (제품 설명)

### 2.1 설명 저장 구조

| 계층 | 테이블 | 설명 필드 | 소유자 |
|------|--------|----------|--------|
| Master | product_masters | **없음** (regulatory_name, marketing_name만 존재) | 플랫폼 |
| Store | store_product_profiles | `description` (TEXT), `pharmacist_comment` (TEXT) | 매장(조직) |

**핵심:** ProductMaster에는 `description` 필드가 없다. 제품 설명은 매장별 `StoreProductProfile`에서 관리한다.

### 2.2 StoreProductProfile

**테이블:** `store_product_profiles`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | UUID | PK |
| organization_id | UUID | FK → organizations (매장) |
| master_id | UUID | FK → product_masters (UNIQUE per org) |
| display_name | VARCHAR(255) | 매장 표시명 |
| description | TEXT | 매장별 상품 설명 |
| pharmacist_comment | TEXT | 약사 코멘트 |
| is_active | BOOLEAN | default: true |
| created_at / updated_at | TIMESTAMP | - |

**제약:** `organization_id + master_id` UNIQUE — 매장당 하나의 프로필만 가능

### 2.3 AI 설명 생성

- **product_ai_contents 테이블: 존재하지 않음**
- AI가 생성하는 것은 **태그(tags)와 인사이트(insights)** 뿐
- 코스메틱 파트너 전용 `AIDescriptionService` 존재하나 템플릿 기반 (LLM 미사용)

---

## 3. Product Tags (제품 태그)

### 3.1 ProductAiTag 엔티티

**테이블:** `product_ai_tags`

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | UUID | PK | - |
| product_id | UUID | FK, Index | product_masters 참조 |
| tag | VARCHAR(100) | Index | 검색 태그명 |
| confidence | NUMERIC(3,2) | default: 0 | 0.00~1.00 |
| source | VARCHAR(20) | default: 'ai' | 'ai' \| 'manual' |
| model | VARCHAR(100) | nullable | AI 모델명 (예: gemini-2.0-flash) |
| created_at | TIMESTAMP | auto | - |

### 3.2 태그 동기화 흐름

```
ProductAiTaggingService.generateTags()
  → LLM(Gemini) 태그 생성
  → product_ai_tags 저장 (source='ai', confidence 포함)
  → syncMasterTags(productId)
    → AI 태그: confidence >= 0.7 필터
    → Manual 태그: 전부 포함 (confidence=1.0)
    → 중복 제거
    → product_masters.tags (JSONB) 업데이트
```

### 3.3 태그 관리 서비스

| 메서드 | 기능 |
|--------|------|
| `generateTags(product)` | Fire-and-forget LLM 태그 생성 |
| `getTagsByProduct(productId)` | AI/Manual 분리 조회 |
| `addManualTag(productId, tag)` | 수동 태그 추가 (confidence=1.0) |
| `deleteTag(tagId)` | 태그 삭제 후 sync |
| `syncMasterTags(productId)` | product_masters.tags 동기화 |

---

## 4. Product Images (제품 이미지)

**테이블:** `product_images`

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | UUID | PK | - |
| master_id | UUID | FK → product_masters (CASCADE) | - |
| image_url | TEXT | NOT NULL | Public/CDN URL |
| gcs_path | TEXT | NOT NULL | Google Cloud Storage 경로 |
| sort_order | INT | default: 0 | 표시 순서 |
| is_primary | BOOLEAN | default: false | 대표 이미지 플래그 |
| created_at / updated_at | TIMESTAMP | auto | - |

**인덱스:** `(master_id, is_primary) WHERE is_primary = true` — 부분 인덱스

---

## 5. OCR (광학 문자 인식)

### 조사 결과: 존재하지 않음

- `*ocr*` 패턴 파일 검색: 0건
- `*vision*` 패턴 파일 검색: 0건 (코드 수준)
- 코드 내 "OCR" 키워드 검색: `pnpm-lock.yaml`만 매치 (의존성 잠금 파일)
- Google Vision API / Tesseract / 기타 OCR 라이브러리: 없음

**결론:** O4O Platform에 OCR 기능은 구현되지 않았다.

---

## 6. AI Content (AI 콘텐츠)

### 6.1 AI 프로바이더

| 프로바이더 | 역할 | 모델 | 설정 |
|-----------|------|------|------|
| **GeminiProvider** | Primary | gemini-2.0-flash | temp=0.3, maxTokens=2048, JSON 강제 |
| **OpenAIProvider** | Fallback | gpt-4o-mini | temp=0.3, maxTokens=2048, JSON Mode |

### 6.2 AI 서비스 목록

| # | 서비스 | 기능 |
|---|--------|------|
| 1 | ProductAiTaggingService | 제품 태그 자동 생성 + sync |
| 2 | ProductAiRecommendationService | 태그 기반 상품 추천 |
| 3 | ProductAiSearchService | 태그 기반 상품 검색 |
| 4 | StoreAiProductSnapshotService | 일별 매장 KPI 집계 |
| 5 | StoreAiProductInsightService | LLM 기반 매장 인사이트 생성 |
| 6 | AIDescriptionService (cosmetics) | 코스메틱 설명 생성 (템플릿 기반) |

### 6.3 AI 테이블

| 테이블 | 용도 |
|--------|------|
| product_ai_tags | 개별 태그 + 신뢰도/출처 |
| store_ai_product_snapshots | 일별 KPI 스냅샷 |
| store_ai_product_insights | LLM 생성 인사이트 (캐시) |
| ai_settings | 프로바이더 레벨 설정 |
| ai_model_settings | 서비스 레벨 모델 설정 |

### 6.4 추천 스코어링

```
score = (matching_tags / input_tags * 0.6) + (avg_confidence * 0.3) + (normalized_popularity * 0.1)
```

---

## 7. ProductMarketingAsset (마케팅 자산)

**테이블:** `product_marketing_assets`

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | UUID | PK | - |
| organization_id | UUID | NOT NULL | 멀티테넌트 격리 |
| product_id | UUID | NOT NULL | 제품 참조 |
| asset_type | VARCHAR(50) | NOT NULL | QR, POP, Library, Signage 등 |
| asset_id | UUID | NOT NULL | 자산 UUID 참조 |
| created_at | TIMESTAMP | auto | - |

**UNIQUE:** `(product_id, asset_type, asset_id)`

---

## 8. 종합 요약

### 8.1 구현 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| Product Master SSOT | ✅ 완료 | 불변 필드 Guard 포함 |
| Product Images | ✅ 완료 | GCS 저장, 대표 이미지 관리 |
| Product Categories | ✅ 완료 | 4단계 계층 구조 |
| Brands | ✅ 완료 | slug 기반 |
| Store Product Profile | ✅ 완료 | 매장별 설명/코멘트 |
| AI Tag 생성 | ✅ 완료 | Gemini, 자동 sync |
| AI 상품 추천 | ✅ 완료 | 태그 기반 스코어링 |
| AI 상품 검색 | ✅ 완료 | 태그 + 제품명 ILIKE |
| 매장 KPI 스냅샷 | ✅ 완료 | 일별 집계 |
| 매장 AI 인사이트 | ✅ 완료 | LLM 분석 + 캐시 |
| Marketing Asset 매핑 | ✅ 완료 | QR/POP/Signage 연결 |
| OCR / Vision | ❌ 미구현 | 코드베이스에 없음 |
| product_ai_contents | ❌ 미구현 | 테이블/엔티티 없음 |
| AI 상품 설명 자동 생성 | ⚠️ 부분 | 코스메틱 전용 템플릿만 존재 |

### 8.2 데이터 흐름도

```
[식약처 MFDS] → ProductMaster (불변 마스터)
                   ↓
              SupplierProductOffer (공급자 가격/유통)
                   ↓
              OrganizationProductListing (매장 진열)
                   ↓
              StoreProductProfile (매장별 설명)

[AI Pipeline]
ProductMaster → ProductAiTaggingService → product_ai_tags
                                              ↓ syncMasterTags
                                         product_masters.tags

StoreAiProductSnapshotService → store_ai_product_snapshots
                                              ↓
StoreAiProductInsightService → store_ai_product_insights
                                              ↓
ProductAiRecommendationService ← tags + snapshots
```

### 8.3 아키텍처 관찰

1. **제품 설명 부재:** ProductMaster에 description 필드 없음. 공급자 수준의 공통 설명 없음
2. **OCR 부재:** 이미지에서 텍스트 추출 기능 없음. 모든 제품 정보는 수동 입력 또는 식약처 API
3. **AI 범위 제한:** AI는 태그 생성과 KPI 인사이트에만 활용. 상품 설명 자동 생성은 미구현
4. **단일 프로바이더 의존:** 실제 서비스는 Gemini만 사용. OpenAI는 Fallback 정의만 존재

---

**조사 완료:** 2026-03-09
**모드:** Read-Only (수정 없음)
