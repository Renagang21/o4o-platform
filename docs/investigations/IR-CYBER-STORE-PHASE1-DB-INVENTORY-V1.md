# IR-CYBER-STORE-PHASE1-DB-INVENTORY-V1

> **Phase 1: DB/엔티티 조사 완료**
> **조사일**: 2026-02-17
> **목적**: Store 관련 테이블/컬럼 현황 확정

---

## 1. Store 관련 테이블/엔티티 목록

### 1-1. Core Store (범용 매장)

| 테이블 | 스키마 | 파일 |
|--------|--------|------|
| `stores` | public | `src/entities/Store.ts` |

**핵심 컬럼:**
```
id (uuid PK)
name (varchar)
description (varchar, nullable)
address (json, nullable)
phone (varchar, nullable)
businessHours (varchar, nullable)
status (enum: active/inactive/suspended)
displaySettings (json: resolution, orientation, defaultTemplate)
managerId (uuid FK → users)
```

**특징:**
- slug: ❌ 없음
- storefront_config: ❌ 없음
- 주 용도: Signage/Display 매장 (기존 레거시)

---

### 1-2. GlycopharmPharmacy (글라이코팜 약국)

| 테이블 | 스키마 | 파일 |
|--------|--------|------|
| `glycopharm_pharmacies` | public | `src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts` |

**핵심 컬럼:**
```
id (uuid PK)
name (varchar 255)
code (varchar 100, unique)
business_number (varchar 20, unique)
owner_name (varchar 100)
address, phone, email
slug (varchar 120, unique, nullable) ✅
description (text, nullable) ✅
logo (varchar 2000, nullable) ✅
hero_image (varchar 2000, nullable) ✅
storefront_config (jsonb, nullable) ✅
enabled_services (jsonb, default []) ✅
status (varchar: active/inactive/suspended)
created_by_user_id (uuid)
```

**특징:**
- **slug 있음**: varchar 120, unique index
- **storefront_config 있음**: JSONB
- **enabled_services**: 서비스별 기능 활성화 (dropshipping, sample_sales, digital_signage)
- KpaOrganization과 PK 공유 관계 (pharmacy.id ≡ organization.id)

---

### 1-3. CosmeticsStore (K-화장품 매장)

| 테이블 | 스키마 | 파일 |
|--------|--------|------|
| `cosmetics_stores` | cosmetics | `src/routes/cosmetics/entities/cosmetics-store.entity.ts` |

**핵심 컬럼:**
```
id (uuid PK)
name (varchar 200)
code (varchar 100, unique)
business_number (varchar 100, unique)
owner_name (varchar 200)
contact_phone, address, region
slug (varchar 120, unique, nullable) ✅
description (text, nullable) ✅
logo (varchar 2000, nullable) ✅
hero_image (varchar 2000, nullable) ✅
status (varchar: draft/pending/approved/rejected/suspended) ✅
```

**특징:**
- **slug 있음**: varchar 120, unique index
- **storefront_config 없음**: 별도 관리 필요
- **status에 승인 워크플로우 포함**: draft → pending → approved/rejected

---

### 1-4. PhysicalStore (물리 매장 연결)

| 테이블 | 스키마 | 파일 |
|--------|--------|------|
| `physical_stores` | public | `src/routes/platform/entities/physical-store.entity.ts` |

**핵심 컬럼:**
```
id (uuid PK)
business_number (varchar 20, unique)
store_name (varchar 255)
region (varchar 100, nullable)
```

**특징:**
- **Cross-Service Linking용**: 하나의 물리 매장이 여러 서비스에 연결
- PhysicalStoreLink로 cosmetics/glycopharm 등과 연결
- slug: ❌ 없음
- storefront_config: ❌ 없음

---

### 1-5. KpaOrganization (약사회 조직)

| 테이블 | 스키마 | 파일 |
|--------|--------|------|
| `kpa_organizations` | public | `src/routes/kpa/entities/kpa-organization.entity.ts` |

**핵심 컬럼:**
```
id (uuid PK)
name (varchar 200)
type (varchar: association/branch/group)
parent_id (uuid FK, nullable)
description, address, phone
is_active (boolean)
storefront_config (jsonb, default {}) ✅
```

**특징:**
- **storefront_config 있음**: JSONB, default {}
- **slug 없음**: 별도 관리 필요
- GlycopharmPharmacy와 PK 공유 (pharmacy.id ≡ organization.id)

---

## 2. 신청/승인 테이블

### 2-1. GlycopharmApplication (글라이코팜 신청)

| 테이블 | 스키마 | 파일 |
|--------|--------|------|
| `glycopharm_applications` | public | `src/routes/glycopharm/entities/glycopharm-application.entity.ts` |

**핵심 컬럼:**
```
id (uuid PK)
user_id (uuid FK → users)
organization_type (varchar: pharmacy/pharmacy_chain)
organization_name (varchar 255)
business_number (varchar 100)
service_types (jsonb: dropshipping/sample_sales/digital_signage)
note (text, nullable)
status (varchar: submitted/approved/rejected) ✅
rejection_reason (text, nullable) ✅
submitted_at (timestamptz)
decided_at (timestamptz, nullable) ✅
decided_by (uuid, nullable) ✅
metadata (jsonb)
```

**특징:**
- **신청/승인 워크플로우 존재**: submitted → approved/rejected
- **거절 사유 기록 가능**: rejection_reason
- **서비스 타입 선택 가능**: dropshipping, sample_sales, digital_signage
- **❌ slug 입력 필드 없음**: 신청 시 서브디렉토리 지정 불가

---

### 2-2. CosmeticsStoreApplication (K-화장품 신청)

| 테이블 | 스키마 | 파일 |
|--------|--------|------|
| `cosmetics_store_applications` | cosmetics | `src/routes/cosmetics/entities/cosmetics-store-application.entity.ts` |

**핵심 컬럼:**
```
id (uuid PK)
applicant_user_id (uuid)
store_name (varchar 200)
business_number (varchar 100)
owner_name (varchar 200)
contact_phone, address, region
note (text, nullable)
status (varchar: draft/submitted/approved/rejected) ✅
rejection_reason (text, nullable) ✅
reviewed_by (uuid, nullable) ✅
reviewed_at (timestamptz, nullable) ✅
```

**특징:**
- **신청/승인 워크플로우 존재**: draft → submitted → approved/rejected
- **거절 사유 기록 가능**: rejection_reason
- **❌ slug 입력 필드 없음**: 신청 시 서브디렉토리 지정 불가

---

## 3. Phase 1 핵심 결론

### 3-1. slug 필드 존재 여부

| 테이블 | slug 존재 | 비고 |
|--------|-----------|------|
| `glycopharm_pharmacies` | ✅ YES | varchar 120, unique index |
| `cosmetics_stores` | ✅ YES | varchar 120, unique index |
| `stores` (Core) | ❌ NO | - |
| `kpa_organizations` | ❌ NO | - |
| `glycopharm_applications` | ❌ NO | 신청 시 slug 지정 불가 |
| `cosmetics_store_applications` | ❌ NO | 신청 시 slug 지정 불가 |

### 3-2. storefront_config 저장 방식

**방식: JSONB 컬럼**

| 테이블 | 컬럼 | 기본값 |
|--------|------|--------|
| `glycopharm_pharmacies` | `storefront_config` JSONB | NULL |
| `kpa_organizations` | `storefront_config` JSONB | {} |
| `cosmetics_stores` | ❌ 없음 | - |

### 3-3. 신청/승인 워크플로우 DB 존재 여부

**✅ 존재함**

- GlycopharmApplication: submitted → approved/rejected
- CosmeticsStoreApplication: draft → submitted → approved/rejected
- 두 테이블 모두 `rejection_reason`, `decided_by/reviewed_by` 필드 존재

**⚠️ 단, slug(서브디렉토리) 신청은 DB에 없음**

- 신청 테이블에 slug 필드가 없어, 신청 시 서브디렉토리 지정 불가
- 승인 후 slug는 별도 프로세스로 생성/backfill

---

## 4. 마이그레이션 현황

| 마이그레이션 | 대상 | 추가 내용 |
|-------------|------|----------|
| `20260214000003-AddStoreIdentityFields.ts` | glycopharm/glucoseview/cosmetics | slug, description, logo, hero_image |
| `20260215000003-AddStorefrontConfig.ts` | glycopharm_pharmacies | storefront_config JSONB |
| `20260215000010-AddKpaStorefrontConfig.ts` | kpa_organizations | storefront_config JSONB |
| `1736800000000-CreateGlycopharmApplications.ts` | glycopharm_applications | 신청 테이블 생성 |

---

## 5. Phase 2로 전달되는 질문

1. **신청 API에 slug 입력/중복체크가 구현되어 있는가?**
2. **승인 API에서 slug 자동생성/수동지정 처리가 있는가?**
3. **storefront_config CRUD API가 있는가?**
4. **채널별(B2C/Tablet/Kiosk) 분기 로직이 API에 있는가?**

---

*Phase 1 완료 - Phase 2(API 조사)로 진행*
