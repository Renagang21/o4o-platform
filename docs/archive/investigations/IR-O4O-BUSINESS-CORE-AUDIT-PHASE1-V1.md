# IR-O4O-BUSINESS-CORE-AUDIT-PHASE1-V1

## Organization / Storefront 구조 판정 보고서

> **작성일**: 2026-02-20
> **상태**: 조사 완료 — 코드 수정 없음
> **범위**: Organization, Storefront, Service-key 구조 판정

---

## 1. 전체 요약

O4O 플랫폼은 **이중 조직 체계 + 중앙 슬러그 레지스트리 + 서비스별 분리 테이블** 구조를 사용한다.

| 구분 | 판정 |
|------|------|
| Organization | 🟡 이중 체계 (범용 + KPA 전용) |
| Storefront slug | 🟢 범용 (`platform_store_slugs`) |
| Storefront config | 🟡 이중 저장 (kpa) |
| URL 라우팅 | 🟢 범용 (`/store/:slug`) |
| Multi-service Organization | 🔴 직접 지원 안 됨 (PK 공유로 우회) |
| Product 다중 서비스 | 🟢 service_key 컬럼으로 지원 |

---

## 2. Organization 구조 판정

### 2-A. 이중 조직 테이블

| 테이블 | 패키지 | 용도 | 상태 |
|--------|--------|------|------|
| `organizations` | `@o4o/organization-core` | 범용 계층 조직 | Frozen |
| `kpa_organizations` | KPA routes | KPA 전용 약사회 계층 | Active |

**`organizations` 테이블** (범용):

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | UUID PK | |
| name | varchar(255) | |
| code | varchar(100) | UNIQUE |
| type | varchar(50) | 'division' / 'branch' |
| parentId | UUID FK (self) | 계층 구조 |
| level | int | 트리 깊이 |
| path | text | 경로 문자열 |
| metadata | JSONB | 확장 필드 |
| isActive | boolean | |

- **service_key 컬럼 없음**
- 서비스 구분 없는 범용 컨테이너

**`kpa_organizations` 테이블** (KPA 전용):

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | UUID PK | |
| name | varchar(200) | |
| type | varchar(50) | 'association' / 'branch' / 'group' |
| parent_id | UUID FK (self) | 계층 구조 |
| description, address, phone | varchar | 상세 정보 |
| is_active | boolean | |
| **storefront_config** | **JSONB** | **매장 설정** |

### 2-B. Organization PK 판정

```
[Organization PK 체계]
구조: UUID 단일 PK — 두 테이블 모두 동일 체계
판정: 🟢 범용
리스크: 없음
```

### 2-C. 서비스별 분리 테이블 존재 여부

```
[서비스별 Organization 분리]
구조: kpa_organizations (KPA 전용) + organizations (범용) 이중 체계
판정: 🟡 부분 종속
리스크: KPA 전용 조직 테이블이 독립적이어서 organization-core와 동기화 불가
필요 시 수정 방향: 장기적으로 organization-core 통합 검토
```

## 3. Storefront 구조 판정

### 3-A. 중앙 슬러그 레지스트리

**`platform_store_slugs` 테이블** (플랫폼 전역):

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | UUID PK | |
| **slug** | varchar(120) | **UNIQUE — 플랫폼 전역 유일** |
| store_id | UUID | 서비스별 store PK |
| service_key | varchar(50) | — |
| is_active | boolean | |

**`platform_store_slug_history` 테이블** (변경 이력):

| 컬럼 | 타입 | 비고 |
|------|------|------|
| store_id | UUID | 변경 대상 |
| old_slug | varchar(120) | 이전 주소 (301 리다이렉트용) |
| new_slug | varchar(120) | 새 주소 |
| changed_by | UUID | 변경자 |

```
[Storefront Slug]
구조: platform_store_slugs — 플랫폼 전역 UNIQUE, service_key로 서비스 구분
판정: 🟢 범용
리스크: 없음 — 서비스에 무관하게 slug 유일성 보장
```

### 3-B. Storefront Config 저장 위치

**이중 저장 발견:**

| 위치 | 테이블 | 컬럼 | 내용 |
|------|--------|------|------|
| KPA | `kpa_organizations` | `storefront_config` (JSONB) | 매장 설정 |

```
[Storefront Config 저장]
      동일 약국(PK 공유)의 설정이 두 곳에 분산 저장
판정: 🟡 부분 종속
리스크: ⚠️ 두 config 간 동기화 정책 없음
필요 시 수정 방향: storefront_config를 하나의 테이블로 통합하거나
                   한쪽을 Source of Truth로 지정
```

### 3-C. URL 라우팅

**공개 API**: `/store/:slug`

해석 흐름:
```
GET /store/:slug
  → StoreSlugService.findBySlug(slug)
  → platform_store_slugs 조회
  → { storeId, serviceKey, isActive } 반환
  → serviceKey로 서비스별 store 엔티티 로드
  → 스토어프론트 렌더
```

지원 라우트:
```
GET  /store/:slug                    — 매장 정보
GET  /store/:slug/products/featured  — 추천 상품 (B2C gate)
GET  /store/:slug/layout             — 블록 레이아웃
GET  /store/:slug/blog               — 블로그
GET  /store/:slug/storefront-config  — 설정
GET  /store/:slug/tablet/products    — 태블릿 상품
POST /store/:slug/tablet/requests    — 태블릿 주문
```

```
[URL 라우팅]
구조: /store/:slug → platform_store_slugs → 서비스 독립 해석
판정: 🟢 범용
리스크: 없음 — service_key가 URL에 하드코딩되지 않음
```

### 3-D. Slug 정책

```
[Slug 정책]
구조: platform_store_slugs.slug = UNIQUE (전역)
      service별 prefix 불필요
      slug 변경 시 platform_store_slug_history에 기록 (301 리다이렉트)
판정: 🟢 범용
리스크: 없음
```

---

## 4. Service-key 구조 판정

### 4-A. 서비스 정의

**`platform_services` 테이블**:

| code | name | type | 승인 필요 |
|------|------|------|----------|
| glucoseview | GlucoseView | tool | Yes |
| neture | Neture | community | No |
| kpa-society | KPA Society | community | Yes |
| k-cosmetics | K-Cosmetics | extension | Yes |

### 4-B. 사용자 ↔ 서비스 관계

**`user_service_enrollments` 테이블**:

| 컬럼 | 타입 | 비고 |
|------|------|------|
| user_id | UUID FK | |
| service_code | varchar(50) FK | platform_services.code |
| status | enum | not_applied / applied / approved / rejected |

- UNIQUE(user_id, service_code)
- **사용자는 여러 서비스에 동시 가입 가능** ✅

```
[사용자 다중 서비스]
구조: user_service_enrollments — 사용자당 서비스별 1행
판정: 🟢 범용
리스크: 없음
```

### 4-C. 조직 ↔ 서비스 관계

```
[조직 다중 서비스]
구조: organization ↔ service junction table 없음
      서비스 소속은 서비스별 전용 테이블로 암묵적 결정
판정: 🔴 서비스 종속
리스크: ⚠️ 조직이 새 서비스에 가입하려면 해당 서비스 전용 테이블에 행 생성 필요
         범용 organization-service enrollment 체계 없음
필요 시 수정 방향: organization_service_enrollments junction table 도입 검토
```

### 4-D. 상품 서비스 키

**`organization_product_listings`** / **`organization_product_applications`**:

| 컬럼 | 값 | 비고 |
|------|-----|------|
| service_key | 'kpa' (default) | 상품 소속 서비스 |

- UNIQUE(organization_id, service_key, external_product_id)
- **하나의 약국이 여러 서비스의 상품을 진열 가능** ✅

```
[상품 다중 서비스]
구조: organization_product_listings.service_key로 서비스 구분
      동일 organization이 여러 service_key 상품 보유 가능
판정: 🟢 범용
리스크: 없음 — 설계 의도대로 작동
```

---

## 5. 필수 확인 질문 응답

### Q1. 하나의 organization이 여러 service_key를 가질 수 있는가?

**NO** (직접적으로는 불가)

- `organizations` 테이블에 service_key 컬럼 없음
- 서비스 소속은 서비스별 전용 테이블 존재 여부로 결정
- 단, PK 공유로 **동일 물리 조직이 서비스에 걸칠 수 있음**
- 상품 레벨에서는 `service_key`로 다중 서비스 지원

### Q2. Storefront slug는 organization 단위로 유일한가?

**YES** — `platform_store_slugs.slug`가 플랫폼 전역 UNIQUE

- slug → (store_id, service_key) 매핑
- 동일 organization에 대해 서비스별 slug를 **별도 등록 가능** (1 org → N slugs)

### Q3. 서비스에 따라 storefront가 분리 저장되는가?

**YES** — 이중 저장

| 서비스 | 저장 위치 |
|--------|----------|
| KPA | `kpa_organizations.storefront_config` |

- 동일 약국(PK 공유)이라도 config가 두 곳에 분산
- 동기화 정책 없음 → **리스크**

### Q4. service_key가 URL 경로에 하드코딩되어 있는가?

**NO** — `/store/:slug`는 service_key 없이 해석

- slug → `platform_store_slugs` → service_key 자동 판별
- 레거시 경로 `/kpa/store/:slug` → `/store/:slug` 301 리다이렉트 존재

## 6. 구조 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM LEVEL                                │
│                                                                  │
│  platform_services ─┬─                                          │
│                     ├─ glucoseview                               │
│                     ├─ neture                                    │
│                     ├─ kpa-society                               │
│                     └─ k-cosmetics                               │
│                                                                  │
│  platform_store_slugs ───→ slug → (store_id, service_key)       │
│  (플랫폼 전역 UNIQUE)                                           │
│                                                                  │
│  user_service_enrollments ───→ user_id + service_code           │
│  (사용자 다중 서비스 가입)                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  SERVICE-SPECIFIC LEVEL                           │
│                                                                  │
│  kpa_organizations ←──── PK 공유 ────→                          │
│  ├─ storefront_config    │              ├─ storefront_config     │
│  ├─ parent_id (계층)     │              ├─ template_profile      │
│  └─ type, address...     │              ├─ storefront_blocks     │
│                          │              └─ slug (legacy)         │
│                       동일 UUID                                  │
│                                                                  │
│  organization_channels (B2C, TABLET, KIOSK, SIGNAGE)            │
│  organization_product_listings (service_key 포함)                │
│  organization_product_channels (채널별 상품 매핑)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PUBLIC STOREFRONT                              │
│                                                                  │
│  /store/:slug                                                    │
│    → platform_store_slugs.slug 조회                              │
│    → service_key 자동 판별                                       │
│    → 서비스별 store entity 로드                                  │
│    → 통합 공개 API 제공                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 리스크 요약

| # | 항목 | 레벨 | 설명 |
|---|------|------|------|
| R1 | Storefront config 이중 저장 | 🟡 중 | kpa 양쪽에 config 존재, 동기화 없음 |
| R2 | KPA 종속 FK | 🟡 중 | — |
| R3 | Organization multi-service 미지원 | 🔴 고 | 조직-서비스 junction table 없음, PK 공유로 우회 |
| R4 | Template/Blocks KPA 미존재 | 🟡 중 | — |
| R5 | Legacy slug 이중 관리 | 🟢 저 | — |

---

## 8. 수정 필요 항목 정리 (판정만, 수정 보류)

| # | 항목 | 우선순위 | 방향 |
|---|------|---------|------|
| M1 | Storefront config 통합 | High | 단일 Source of Truth 지정 또는 통합 테이블 |
| M2 | Organization-service enrollment | Medium | junction table 도입 검토 |
| M3 | KPA FK 의존성 완화 | Medium | organization-core 기반 통합 FK 전환 |
| M4 | Template/Blocks 범용화 | Low | platform-core로 이동 검토 |
| M5 | Legacy slug 정리 | Low | — |

---
