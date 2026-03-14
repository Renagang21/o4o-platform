# IR-O4O-CAPABILITY-REGISTRY-AUDIT-V1

## Investigation Report: O4O Store Capability Registry 구조 조사

**조사일**: 2026-03-14
**조사 대상**: O4O Platform Store Capability 시스템 전체
**비교 대상**: Backend (api-server) / Frontend (KPA, K-Cosmetics, GlycoPharm) / Shared Packages

---

## Executive Summary

Capability 시스템은 **Backend 1곳(정적 상수)에서 정의되어 정상 동작**하고 있다.

| 영역 | 상태 | 설명 |
|------|------|------|
| Capability 정의 (Backend) | **SAFE** | `store-capabilities.ts` 단일 SSOT, 10개 Key |
| Capability → Channel 매핑 | **SAFE** | 양방향 매핑 일관, 자동 Channel 생성 정상 |
| Guard 미들웨어 | **SAFE** | `requireStoreCapability()` 403 차단 정상 |
| DB 스키마 | **SAFE** | UNIQUE, FK, INDEX 완비 |
| Frontend (KPA) | **ACTIVE** | Read-only + Operator Toggle 구현 |
| Frontend (K-Cosmetics) | **ACTIVE** | Operator Toggle 구현 |
| Frontend (GlycoPharm) | **NOT IMPLEMENTED** | Capability UI 전무 |
| 서비스별 정책 | **NOT IMPLEMENTED** | 전 서비스 동일 10개, 차별화 없음 |
| Frontend 라벨 | **PARTIAL** | 하드코딩 2곳 중복 |

**결론**: Capability 시스템이 정상 운영 중이나, **서비스별 정책 부재 + Frontend 라벨 하드코딩 + GlycoPharm UI 미구현** 3가지 구조적 개선 여지 존재. Full DB Registry는 불필요하며 **Lightweight Registry (Shared 상수 통합)** 권고.

---

## 1. Capability 정의 위치

### 1.1 Backend 중앙 정의 (SSOT)

**파일**: `apps/api-server/src/modules/store-core/constants/store-capabilities.ts`

**전체 Capability 목록 (10개):**

| Key | 설명 | 기본 활성 | Channel 매핑 |
|-----|------|:---------:|:----------:|
| `B2C_COMMERCE` | 온라인 스토어 (B2C) | **YES** | `B2C` |
| `TABLET` | 태블릿 디스플레이 | NO | `TABLET` |
| `KIOSK` | 키오스크 | NO | `KIOSK` |
| `QR_MARKETING` | QR 마케팅 | **YES** | null |
| `POP_PRINT` | POP 인쇄물 | **YES** | null |
| `SIGNAGE` | 디지털 사이니지 | NO | `SIGNAGE` |
| `BLOG` | 블로그/콘텐츠 | NO | null |
| `LIBRARY` | 자산 라이브러리 | NO | null |
| `AI_CONTENT` | AI 콘텐츠 | NO | null |
| `LOCAL_PRODUCTS` | 지역 상품 | NO | null |

### 1.2 정의 위치 요약

| 위치 | 정의 내용 | 동적/정적 |
|------|----------|:---------:|
| Backend `store-capabilities.ts` | Key enum + Channel map + Defaults | 정적 (SSOT) |
| Frontend KPA `CAPABILITY_LABELS` | 한국어 라벨 (하드코딩) | 정적 |
| Frontend K-Cosmetics `CAPABILITY_LABELS` | 한국어 라벨 (하드코딩, KPA와 동일) | 정적 |
| Frontend GlycoPharm | (없음) | - |
| Database `store_capabilities` | `capability_key VARCHAR(50)` — Enum 제약 없음 | 동적 |
| Shared packages | `requiredCapabilities?: string[]` (dashboard widget) | 참조만 |

**핵심 발견**: Capability 정의가 **Backend 상수 1곳 + Frontend 하드코딩 2곳**에 분산. DB는 `VARCHAR(50)` free-text로 어떤 값이든 저장 가능.

---

## 2. Capability → Channel 매핑 구조

### 2.1 정방향 매핑 (CAPABILITY_CHANNEL_MAP)

```typescript
{
  B2C_COMMERCE:   'B2C',       // Channel 자동 생성
  TABLET:         'TABLET',    // Channel 자동 생성
  KIOSK:          'KIOSK',     // Channel 자동 생성
  SIGNAGE:        'SIGNAGE',   // Channel 자동 생성
  QR_MARKETING:   null,        // Channel 없음
  POP_PRINT:      null,        // Channel 없음
  BLOG:           null,        // Channel 없음
  LIBRARY:        null,        // Channel 없음
  AI_CONTENT:     null,        // Channel 없음
  LOCAL_PRODUCTS: null,        // Channel 없음
}
```

### 2.2 역방향 매핑 (CHANNEL_CAPABILITY_MAP)

```typescript
{
  B2C:     'B2C_COMMERCE',
  TABLET:  'TABLET',
  KIOSK:   'KIOSK',
  SIGNAGE: 'SIGNAGE',
}
```

### 2.3 관계 구조

```
1 Capability → 0..1 Channel (현재)
1 Channel    → 1 Capability (역방향 보장)
```

1:N 관계 없음. 매핑이 단순하고 양방향 일관성 보장.

---

## 3. Backend 사용 위치

### 3.1 서비스 계층

**파일**: `apps/api-server/src/modules/store-core/services/store-capability.service.ts`

| 메서드 | 용도 |
|--------|------|
| `getCapabilities(orgId)` | 전체 Capability 목록 조회 |
| `isEnabled(orgId, key)` | 특정 Capability 활성 여부 (없으면 false) |
| `initDefaults(orgId)` | Store 생성 시 10개 전부 생성, 3개 활성 |
| `setCapability(orgId, key, enabled, source)` | Capability 토글 + Channel 자동 생성 |
| `bulkUpdate(orgId, updates, source)` | 일괄 업데이트 |

### 3.2 Channel 자동 생성 로직

```
setCapability(orgId, 'TABLET', enabled=true, 'admin')
  ↓ CAPABILITY_CHANNEL_MAP['TABLET'] = 'TABLET'
  ↓ ensureChannel(orgId, 'TABLET')
  ↓ OrganizationChannel 존재? → skip
  ↓ 없으면 → CREATE (status='APPROVED', approved_at=now())

setCapability(orgId, 'TABLET', enabled=false, 'admin')
  ↓ enabled=false만 저장
  ↓ Channel 삭제 안 함 (데이터 보존)
```

### 3.3 Guard 미들웨어

**파일**: `apps/api-server/src/modules/store-core/middleware/capability-guard.middleware.ts`

```
requireStoreCapability(dataSource, 'TABLET')
→ isEnabled(orgId, 'TABLET')
→ false → 403 { code: 'STORE_CAPABILITY_DISABLED' }
→ true → next()
```

### 3.4 API 엔드포인트

#### Store Owner (Store Hub)

| 엔드포인트 | Method | 용도 |
|-----------|:------:|------|
| `/store-hub/capabilities` | GET | 전체 Capability 조회 |
| `/store-hub/channels` | GET | Channel 목록 (KPI 포함) |
| `/store-hub/channels` | POST | Channel 생성 (Capability 검증) |

#### Operator

| 엔드포인트 | Method | 용도 |
|-----------|:------:|------|
| `/api/v1/operator/stores/:storeId/capabilities` | GET | Capability 조회 |
| `/api/v1/operator/stores/:storeId/capabilities` | PUT | Capability 일괄 토글 |
| `/api/v1/operator/stores/:storeId/channels` | GET | Channel 목록 |
| `/api/v1/operator/stores/:storeId/channels/:channelId/status` | PUT | Channel 상태 변경 |
| `/api/v1/operator/store-channels` | GET | 전체 Channel (Cross-store) |

### 3.5 Channel 생성 Validation

```
POST /store-hub/channels { channelType: 'TABLET' }
  ↓ CHANNEL_CAPABILITY_MAP['TABLET'] → 'TABLET'
  ↓ isEnabled(orgId, 'TABLET')
  ↓ false → 403 STORE_CAPABILITY_DISABLED
  ↓ true → Channel 생성 (APPROVED)
```

---

## 4. Frontend 사용 위치

### 4.1 KPA Society

**StoreOverviewPage** (`pages/pharmacy/StoreOverviewPage.tsx`):
- 경로: `/store`
- 표시: 10개 Capability chip (Read-only)
- 상태: `활성` (초록 #22c55e) / `비활성` (회색 #94a3b8)
- 편집 불가 — "기능 변경은 운영자에게 문의하세요"
- API: `GET /store-hub/capabilities`

**OperatorStoreDetailPage** (`pages/operator/OperatorStoreDetailPage.tsx`):
- 경로: `/operator/stores/:storeId`
- 표시: 10개 Capability Toggle switch (초록 ON / 회색 OFF)
- API: `GET → PUT /api/v1/operator/stores/:storeId/capabilities`

### 4.2 K-Cosmetics

**StoreDetailPage** (`pages/operator/StoreDetailPage.tsx`):
- 경로: `/operator/stores/:storeId`
- 표시: 10개 Capability Toggle switch (핑크 ON / 회색 OFF)
- API: KPA와 동일 엔드포인트

### 4.3 GlycoPharm

```
Capability UI: 없음
Channel UI: 없음
```

### 4.4 Frontend 비교

| 기능 | KPA Society | K-Cosmetics | GlycoPharm |
|------|:----------:|:----------:|:----------:|
| Capability 표시 (Owner) | **YES** (Read-only) | NO | NO |
| Capability Toggle (Operator) | **YES** (초록) | **YES** (핑크) | **NO** |
| CAPABILITY_LABELS 하드코딩 | YES | YES (동일) | - |
| Channel 관리 UI | YES | YES | NO |
| 10개 전부 표시 | YES | YES | - |

### 4.5 Frontend 라벨 (하드코딩, KPA/K-Cosmetics 동일)

```typescript
CAPABILITY_LABELS = {
  B2C_COMMERCE: '온라인 스토어 (B2C)',
  TABLET: '태블릿 디스플레이',
  KIOSK: '키오스크',
  QR_MARKETING: 'QR 마케팅',
  POP_PRINT: 'POP 인쇄물',
  SIGNAGE: '디지털 사이니지',
  BLOG: '블로그/콘텐츠',
  LIBRARY: '자산 라이브러리',
  AI_CONTENT: 'AI 콘텐츠',
  LOCAL_PRODUCTS: '지역 상품',
}
```

---

## 5. Database 구조

### 5.1 store_capabilities

**Migration**: `20260311100000-CreateStoreCapabilities.ts`

| 컬럼 | 타입 | 제약 |
|------|------|------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK → organizations(id) CASCADE |
| `capability_key` | VARCHAR(50) | **Enum 제약 없음** |
| `enabled` | BOOLEAN | default true |
| `source` | VARCHAR(20) | `'system'`, `'admin'`, `'plan'` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**UNIQUE**: `(organization_id, capability_key)`
**INDEX**: `(capability_key, enabled)`

### 5.2 organization_channels

**Migration**: `20260215200001-CreateOrganizationChannels.ts`

| 컬럼 | 타입 | 제약 |
|------|------|------|
| `id` | UUID | PK |
| `organization_id` | UUID | FK |
| `channel_type` | ENUM | `'B2C', 'KIOSK', 'TABLET', 'SIGNAGE'` |
| `status` | ENUM | 6-state FSM |
| `approved_at` | TIMESTAMP | nullable |
| `config` | JSONB | default `{}` |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**UNIQUE**: `(organization_id, channel_type)`

**Channel 상태 머신:**

```
PENDING  → APPROVED, SUSPENDED, TERMINATED
APPROVED → SUSPENDED, TERMINATED
SUSPENDED → APPROVED, TERMINATED
REJECTED → APPROVED, TERMINATED
TERMINATED → (final)
EXPIRED → (final)
```

### 5.3 organization_product_channels

| 컬럼 | 타입 | 제약 |
|------|------|------|
| `channel_id` | UUID FK | → organization_channels CASCADE |
| `product_listing_id` | UUID FK | → organization_product_listings CASCADE |
| `is_active` | BOOLEAN | default true |
| `display_order` | INT | default 0 |
| `sales_limit` | INT | nullable |

**UNIQUE**: `(channel_id, product_listing_id)`

### 5.4 CMS channels vs organization_channels (별도 시스템)

| 테이블 | 도메인 | 용도 |
|--------|--------|------|
| `channels` | CMS/Signage | 콘텐츠 배포 채널 (물리 장치 — tv, kiosk, signage, web) |
| `organization_channels` | Store | 매장 판매 채널 (비즈니스 채널 — B2C, KIOSK, TABLET, SIGNAGE) |

---

## 6. 서비스별 Capability 차이

### 6.1 Backend — 차이 없음

```
initDefaults(): 서비스 구분 없이 10개 전체 생성
기본 활성: B2C_COMMERCE, QR_MARKETING, POP_PRINT
store_capabilities 테이블에 service_key 컬럼 없음
```

### 6.2 Frontend — UI 차이만 존재

| Capability | KPA UI | K-Cosmetics UI | GlycoPharm UI |
|------------|:------:|:--------------:|:-------------:|
| B2C_COMMERCE | 표시 | 표시 | 없음 |
| TABLET | 표시 | 표시 | 없음 |
| KIOSK | 표시 | 표시 | 없음 |
| QR_MARKETING | 표시 | 표시 | 없음 |
| POP_PRINT | 표시 | 표시 | 없음 |
| SIGNAGE | 표시 | 표시 | 없음 |
| BLOG | 표시 | 표시 | 없음 |
| LIBRARY | 표시 | 표시 | 없음 |
| AI_CONTENT | 표시 | 표시 | 없음 |
| LOCAL_PRODUCTS | 표시 | 표시 | 없음 |

### 6.3 서비스별 메뉴 설정 (별도 시스템)

**파일**: `packages/store-ui-core/src/config/storeMenuConfig.ts`

| 서비스 | 메뉴 | Capability 연동 |
|--------|------|:--------------:|
| Cosmetics | dashboard, products, channels, orders, billing, content, settings | **NO** |
| GlycoPharm | dashboard, products, channels, orders, content, signage, billing, settings | **NO** |

**메뉴 시스템은 Capability와 분리**됨. 서비스별 정적 config.

---

## 7. Shared Package 참조

### 7.1 이름 매핑 불일치

| 레이어 | B2C 이름 | TABLET 이름 | 위치 |
|--------|----------|------------|------|
| Capability Key | `B2C_COMMERCE` | `TABLET` | Backend 상수 |
| Channel Type (DB) | `B2C` | `TABLET` | Entity ENUM |
| Device Type (Shared) | `web` | `tablet` | `@o4o/types` |
| Store Block | `B2C` | `TABLET` | `packages/ui` |

**주의**: `B2C_COMMERCE → B2C → web` 3단계 매핑 필요. 다른 Capability는 casing만 다름.

### 7.2 Capability 참조하는 Shared Packages

| Package | 파일 | 참조 |
|---------|------|------|
| `@o4o/types` | `dashboard.ts` | `requiredCapabilities?: string[]` |
| `@o4o/types` | `listing-display.ts` | `DeviceType` |
| `packages/ui` | `store-blocks/types.ts` | `StoreChannels` |
| `packages/store-asset-policy-core` | `snapshot.ts` | `ChannelMap` |

---

## 8. 전체 흐름

### 8.1 Store 생성 시

```
Organization 생성
  ↓ initDefaults(organizationId)
  ↓ 10개 StoreCapability 레코드 생성 (3개 활성)
  ↓ B2C_COMMERCE 활성 → ensureChannel('B2C')
  ↓ OrganizationChannel(B2C, APPROVED) 생성
```

### 8.2 Operator Capability 토글

```
PUT /api/v1/operator/stores/:storeId/capabilities
  Body: { capabilities: [{ key: "TABLET", enabled: true }] }
  ↓ setCapability(orgId, 'TABLET', true, 'admin')
  ↓ StoreCapability(TABLET) enabled=true, source='admin'
  ↓ CAPABILITY_CHANNEL_MAP['TABLET'] = 'TABLET'
  ↓ ensureChannel(orgId, 'TABLET')
  ↓ OrganizationChannel(TABLET, APPROVED) 생성
```

### 8.3 Route Guard

```
GET /stores/:slug/tablet/products
  ↓ requireStoreCapability(dataSource, 'TABLET')
  ↓ isEnabled(orgId, 'TABLET')
  ↓ false → 403 STORE_CAPABILITY_DISABLED
  ↓ true → next()
```

---

## 9. GAP 분석

### 9.1 구조적 문제

| # | GAP | 현재 상태 | 심각도 |
|---|-----|----------|:------:|
| G1 | **서비스별 Capability 정책 부재** | 전 서비스 동일 10개, 차별화 없음 | MEDIUM |
| G2 | **GlycoPharm Capability UI 미구현** | API 직접 호출로만 관리 가능 | MEDIUM |
| G3 | **Frontend 라벨 하드코딩** | KPA, K-Cosmetics에 동일 라벨 중복 | LOW |
| G4 | **DB capability_key Enum 제약 없음** | VARCHAR(50) free-text, 잘못된 key 삽입 가능 | LOW |
| G5 | **B2C_COMMERCE → B2C → web 이름 불일치** | 3단계 매핑 필요 | LOW |
| G6 | **CMS channels vs organization_channels 혼동** | 용도 다른데 이름 유사 | LOW |

### 9.2 이미 구현된 항목 (No GAP)

| 항목 | 상태 |
|------|------|
| Capability SSOT (Backend 상수) | SAFE |
| Capability → Channel 양방향 매핑 | SAFE |
| Channel 자동 생성 (ensureChannel) | SAFE |
| Guard 미들웨어 (403 차단) | SAFE |
| DB UNIQUE(org_id, capability_key) | SAFE |
| Channel 상태 머신 (6-state FSM) | SAFE |
| Operator API (GET/PUT capabilities) | SAFE |
| Store Hub API (GET capabilities, POST channels) | SAFE |
| KPA Capability UI (Read-only + Toggle) | SAFE |
| K-Cosmetics Capability UI (Toggle) | SAFE |

---

## 10. Capability Registry 필요 여부 판단

### 10.1 현재 상태

| 항목 | 상태 |
|------|:----:|
| Capability 정의 (Backend 상수) | 충분 |
| Channel 매핑 (Backend 상수) | 충분 |
| Frontend 라벨 | **중복** |
| 서비스별 정책 | **부재** |
| DB 제약 | **느슨** |
| 문서화 | **부재** |

### 10.2 판단

```
Full Registry (DB 테이블):   불필요
  → 10개 Capability가 자주 변경되지 않음
  → DB CRUD 오버헤드 불필요

Lightweight Registry (Shared 상수 통합):   권고
  → Frontend 라벨 중복 제거
  → 서비스별 available capabilities 정책 추가
  → API 응답에 label/metadata 포함 가능
  → 새 Capability 추가 시 변경 지점 1곳으로 최소화
```

### 10.3 Lightweight Registry 구현 방향

```
1. Shared package에 Capability 정의 추출
   (key, label, channelType, category, icon)

2. 서비스별 available capabilities 설정
   { kpa: [...], cosmetics: [...], glycopharm: [...] }

3. API 응답에 label/metadata 포함
   GET /capabilities → [{ key, label, enabled, channelType }]

4. Frontend 하드코딩 CAPABILITY_LABELS 제거
   → API 또는 Shared import로 대체
```

---

## 11. 결론 및 권장 사항

### 현재 상태 요약

```
Capability 시스템 = SAFE (운영 정상)
Capability Registry = NOT IMPLEMENTED (중앙 레지스트리 없음)
서비스별 정책 = NOT IMPLEMENTED (차별화 없음)
```

### 종합 평가

| 영역 | 평가 |
|------|:----:|
| Capability 정의 구조 | **SAFE** |
| Capability → Channel 매핑 | **SAFE** |
| Channel 자동 생성 | **SAFE** |
| Guard 미들웨어 | **SAFE** |
| DB 스키마 | **SAFE** |
| Frontend-Backend 일관성 | **PARTIAL** |
| 서비스별 정책 | **PARTIAL** |
| Capability 확장성 | **PARTIAL** |
| **종합** | **SAFE** |

### 권장 작업

**Phase 1: Lightweight Registry (WO-O4O-CAPABILITY-REGISTRY-V1)**
1. Shared package에 Capability 메타데이터 정의 추출
2. 서비스별 available capabilities 설정 추가
3. Frontend 하드코딩 라벨 제거

**Phase 2: UI 보완**
1. GlycoPharm Operator 페이지에 Capability UI 추가
2. API 응답에 label 포함

### 주의 사항

- Store Core 구조 변경 불필요 (기존 서비스/엔티티 유지)
- DB 스키마 변경 불필요 (현재 구조 충분)
- **구현 전 반드시 WO 작성 후 검토 필요**

---

## 12. 파일 매니페스트

### Backend Core

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/store-core/constants/store-capabilities.ts` | Capability 정의 (SSOT) |
| `apps/api-server/src/modules/store-core/entities/store-capability.entity.ts` | StoreCapability Entity |
| `apps/api-server/src/modules/store-core/entities/organization-channel.entity.ts` | OrganizationChannel Entity |
| `apps/api-server/src/modules/store-core/services/store-capability.service.ts` | Capability Service |
| `apps/api-server/src/modules/store-core/services/store-channel.service.ts` | Channel Service |
| `apps/api-server/src/modules/store-core/middleware/capability-guard.middleware.ts` | Guard 미들웨어 |

### Backend Routes

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts` | Store Hub API |
| `apps/api-server/src/routes/operator/stores.routes.ts` | Operator API |
| `apps/api-server/src/controllers/operator/StoreConsoleController.ts` | Console Controller |

### Migrations

| 파일 | 내용 |
|------|------|
| `20260311100000-CreateStoreCapabilities.ts` | store_capabilities 생성 |
| `20260215200001-CreateOrganizationChannels.ts` | organization_channels 생성 |
| `20260215200002-CreateOrganizationProductChannels.ts` | product-channel 매핑 |
| `20260225000001-AddConfigToOrganizationChannels.ts` | config JSONB 추가 |
| `20260225000002-NormalizePendingBaseRightChannels.ts` | PENDING→APPROVED 정규화 |

### Frontend

| 파일 | 역할 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/StoreOverviewPage.tsx` | Owner Read-only |
| `services/web-kpa-society/src/pages/operator/OperatorStoreDetailPage.tsx` | Operator Toggle |
| `services/web-k-cosmetics/src/pages/operator/StoreDetailPage.tsx` | Operator Toggle |

### Shared Packages

| 파일 | 역할 |
|------|------|
| `packages/types/src/dashboard.ts` | `requiredCapabilities` 참조 |
| `packages/types/src/listing-display.ts` | `DeviceType` 정의 |
| `packages/ui/src/store-blocks/types.ts` | `StoreChannels` 정의 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | 서비스별 메뉴 (별도 시스템) |
| `packages/store-asset-policy-core/src/types/snapshot.ts` | `ChannelMap` 정의 |

---

*작성: Claude Opus 4.6*
*상태: 조사 완료 — WO 대기*
