# CONTENT-META-PRODUCTION-READY-V1

> O4O 콘텐츠 메타 구조 통합 완료 선언

| 항목 | 값 |
|------|------|
| 문서명 | CONTENT-META-PRODUCTION-READY-V1 |
| 작성일 | 2026-04-21 |
| 상태 | **Production Ready** |
| 타입 정의 | `packages/types/src/content-meta.ts` |

---

## 1. 배경

### 기존 문제

O4O Platform의 콘텐츠는 서비스별로 독립된 테이블에 분산 저장되어 있었다:

| 서비스 | 테이블 | 문제 |
|--------|--------|------|
| CMS | `cms_contents` | `authorRole`, `visibilityScope` 등 독자적 필드명 |
| KPA Society | `kpa_contents` | `status`='draft'\|'ready', 자체 블록 구조 |
| Neture | `neture_supplier_library_items` | `isPublic` boolean만 존재, 메타 없음 |
| KPA Working | `kpa_working_contents` | 원본-복사본 관계, 메타 없음 |
| Store Execution | `store_execution_assets` | `isActive` boolean, 콘텐츠가 아닌 실행물 |

각 테이블이 콘텐츠의 **생산자, 가시성, 유형, 상태**를 서로 다른 방식으로 표현했고, 이로 인해:

- 크로스-서비스 콘텐츠 조회 불가
- HUB 통합 시 매핑 로직 반복
- UI 필터/라벨 서비스별 분기 필요

### ContentMeta 도입 목적

**물리적 테이블은 독립 유지**하되, **공통 메타 언어(ContentMeta)**를 정의하여:

1. API 응답에서 통일된 메타 필드를 제공
2. 레거시 필드(isPublic, authorRole 등)를 표준 필드로 변환
3. UI에서 서비스 무관하게 동일한 필터/라벨 사용

---

## 2. 수행 작업 요약

### Step 1 — ContentMeta 타입 계약

> `WO-CONTENT-META-TYPE-CONTRACT-V1`

`@o4o/types`에 ContentMeta 인터페이스와 관련 타입을 정의했다.

| 타입 | 값 |
|------|------|
| `ContentProducer` | `platform_admin` \| `service_admin` \| `supplier` \| `store_operator` \| `community` |
| `ContentVisibility` | `platform` \| `service` \| `store` \| `personal` |
| `ContentType` | `cms_block` \| `document` \| `media` \| `guide` \| `banner` \| `working_copy` \| `execution_asset` |
| `ContentStatus` | `draft` \| `ready` \| `published` \| `archived` |
| `ContentServiceKey` | `neture` \| `glycopharm` \| `glucoseview` \| `kpa-society` \| `k-cosmetics` |

**매핑 함수** 5개를 함께 제공:

```
mapCmsAuthorRole()       — CMS authorRole → ContentProducer
mapCmsVisibilityScope()  — CMS visibilityScope → ContentVisibility
mapCmsStatus()           — CMS status → ContentStatus
mapNetureVisibility()    — Neture isPublic → ContentVisibility
mapExecutionAssetStatus() — Store isActive → ContentStatus
```

**결과**: `@o4o/types` 패키지에서 모든 서비스가 동일 타입/매핑을 import.

---

### Step 2 — API 응답 메타 필드 추가

> `WO-CONTENT-META-API-ENRICHMENT-V1`

각 서비스의 콘텐츠 조회 API 응답에 ContentMeta 필드를 추가했다.

| 서비스 | 엔드포인트 | 매핑 방식 |
|--------|-----------|----------|
| Neture Library | `GET /api/v1/neture/library/public`, `GET /api/v1/neture/library` | `isPublic` → `visibility`, 고정 `producer='supplier'` |
| CMS | `GET /api/v1/cms-content` (list/detail) | `authorRole` → `producer`, `visibilityScope` → `visibility` |
| KPA | `GET /api/v1/kpa/news` | 고정 `producer='service_admin'`, `visibility='service'` |

**결과**: 프론트엔드는 서비스 무관하게 `item.producer`, `item.visibility`, `item.contentType`, `item.metaStatus` 접근 가능.

---

### Step 3 — UI 표시 및 활용

> `WO-CONTENT-META-UI-INTEGRATION-V1`

프론트엔드에서 ContentMeta 필드를 활용한 UI를 구현했다.

| 서비스 | 기능 | 구현 |
|--------|------|------|
| Neture Library | Visibility 필터 바 | `service`(서비스 공개) / `personal`(비공개) 필터 |
| Neture Library | Visibility 배지 | `visibility` 값에 따른 한국어 라벨 표시 |
| CMS Admin | Visibility Scope 필터 | `platform` / `service` / `organization` 구분 |

**결과**: 사용자가 ContentMeta 용어로 콘텐츠를 필터하고 확인할 수 있음.

---

### Step 4 — UI 검증

> `WO-CONTENT-META-UI-VALIDATION-V1`

UI에서 ContentMeta 필터/라벨이 정확하게 동작하는지 검증했다.

- Neture Library: `isPublic=true` ↔ `visibility='service'` 필터 일치 확인
- CMS: `visibilityScope` → ContentMeta `visibility` 변환 정확성 확인
- 프론트엔드 타입에 optional ContentMeta 필드 존재 확인 (backward compatible)

**결과**: UI-API 간 ContentMeta 계약 정합성 검증 완료.

---

### Step 5 — Neture DB 통합

> `WO-NETURE-SUPPLIER-CONTENT-TABLE-MERGE-V1`

Neture `neture_supplier_library_items` 테이블에 ContentMeta 칼럼을 DB 레벨까지 추가했다.

| 작업 | 내용 |
|------|------|
| Dead code 제거 | DROP된 `neture_supplier_contents` 참조 엔티티/엔드포인트 삭제 |
| 마이그레이션 | `content_type`, `visibility`, `blocks` 3개 칼럼 추가 (`20260421100000`) |
| Backfill | `is_public=true` → `visibility='service'`, 나머지 → `'personal'` |
| Entity | `NetureSupplierLibraryItem`에 3개 필드 추가 |
| Service | `create()`/`update()`에서 `visibility` 자동 파생, `contentType`/`blocks` 저장 |
| Route | API 응답에서 hardcode → DB 값 우선 전환 (`item.contentType ?? 'media'`) |

**결과**: Neture가 ContentMeta를 DB 레벨까지 완전 지원하는 첫 번째 서비스가 됨.

---

## 3. 최종 구조 — 3 Layer 모델

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1 — Content (원본 콘텐츠)                          │
│                                                         │
│  cms_contents                    — CMS 블록 콘텐츠        │
│  kpa_contents                    — KPA 소식/자료          │
│  neture_supplier_library_items   — 공급자 자료실           │
├─────────────────────────────────────────────────────────┤
│  Layer 2 — Working (작업 복사본)                          │
│                                                         │
│  kpa_working_contents            — 매장 복사/편집본        │
├─────────────────────────────────────────────────────────┤
│  Layer 3 — Execution (실행 결과물)                         │
│                                                         │
│  store_execution_assets          — 매장 실행 자산          │
└─────────────────────────────────────────────────────────┘
```

**Layer 간 관계**: Layer 1 → (복사) → Layer 2 → (배포) → Layer 3

- **Layer 1**: 원본 콘텐츠. 생산자가 직접 작성/관리.
- **Layer 2**: Layer 1의 복사본. 매장 운영자가 편집 가능. 원본과 독립.
- **Layer 3**: 콘텐츠가 아닌 **실행 결과물**. POP, QR, 사이니지 등 최종 산출물.

---

## 4. ContentMeta 필드 정의

### ContentMeta Interface

```typescript
interface ContentMeta {
  id: string;
  title: string;
  producer: ContentProducer;
  producerRef: string;
  visibility: ContentVisibility;
  serviceKey?: ContentServiceKey;
  organizationId?: string;
  contentType: ContentType;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 필드별 비즈니스 의미

| 필드 | 의미 | 설명 |
|------|------|------|
| `producer` | **누가 만들었는가** | 플랫폼 관리자, 서비스 관리자, 공급자, 매장 운영자, 커뮤니티 |
| `producerRef` | **생산자 식별자** | `created_by` (CMS), `supplier_id` (Neture), `owner_id` (Working) |
| `visibility` | **누가 볼 수 있는가** | `platform`=전체, `service`=서비스 내, `store`=매장 내, `personal`=본인만 |
| `serviceKey` | **어떤 서비스 소속인가** | `visibility='service'`일 때 필수. `neture`, `kpa-society` 등 |
| `organizationId` | **어떤 조직 소속인가** | `visibility='store'`일 때 필수. 매장/조직 격리 |
| `contentType` | **콘텐츠 유형** | `cms_block`, `document`, `media`, `guide`, `banner`, `working_copy`, `execution_asset` |
| `status` | **콘텐츠 상태** | `draft`→`ready`→`published`→`archived` |

---

## 5. 핵심 설계 원칙

### 원칙 1: 메타 통합, 물리 통합 아님

각 서비스의 테이블은 **독립적으로 유지**된다. ContentMeta는 물리적 테이블 머지가 아닌, **공통 메타 언어**다.

- `cms_contents`는 CMS 전용 필드(`bodyBlocks`, `isPinned`, `sortOrder`)를 독자적으로 유지
- `neture_supplier_library_items`는 파일 기반 필드(`fileUrl`, `mimeType`)를 독자적으로 유지
- API 응답 레벨에서 ContentMeta 필드를 추가하여 **공통 인터페이스** 제공

이 원칙은 도메인 독립성을 보장하면서 크로스-서비스 조회를 가능하게 한다.

### 원칙 2: 실행 레이어 분리

`store_execution_assets`는 **콘텐츠가 아니다**. 콘텐츠(Layer 1/2)에서 **파생된 실행 결과물**(Layer 3)이다.

- POP 자료, QR 코드, 사이니지 배포 등 매장에서 실제 사용되는 최종 산출물
- ContentMeta의 `contentType='execution_asset'`으로 명확히 구분
- Layer 3은 Layer 1/2와 동일한 CRUD 흐름을 따르지 않음

### 원칙 3: 단방향 파생 규칙

레거시 필드에서 ContentMeta 필드로의 변환은 **단방향**이다.

```
isPublic: true   →  visibility: 'service'     (Neture)
isPublic: false  →  visibility: 'personal'    (Neture)
isActive: true   →  status: 'published'       (Store Execution)
isActive: false  →  status: 'archived'        (Store Execution)
authorRole       →  producer                  (CMS)
visibilityScope  →  visibility                (CMS)
```

**역방향 파생은 존재하지 않는다.** ContentMeta 필드를 변경해도 레거시 필드는 변경되지 않으며, 레거시 필드가 파생의 원천이다. Neture의 경우 `isPublic` 변경 시 `visibility`가 자동 동기화된다.

---

## 6. Neture 통합 결과

Neture는 ContentMeta를 DB 레벨까지 완전 통합한 **첫 번째 서비스**다.

### 통합 전

| 항목 | 상태 |
|------|------|
| `neture_supplier_contents` | 이미 DROP됨 (migration `20260303000000`) |
| `neture_supplier_library_items` | `isPublic` boolean만 존재 |
| API 응답 | ContentMeta 필드 hardcoded |

### 통합 후

| 항목 | 상태 |
|------|------|
| `content_type` 칼럼 | `'media'` (파일) / `'document'` (블록 콘텐츠) |
| `visibility` 칼럼 | `isPublic`에서 파생, DB에 저장 |
| `blocks` 칼럼 | JSONB, document 타입 전용 |
| API 응답 | DB 값 우선, fallback으로 매핑 함수 |
| Dead code | `NetureSupplierLibrary` 엔티티 삭제, 깨진 endpoint 제거 |

### 파일/문서 통합 구조

```
neture_supplier_library_items
├── 파일 기반 (content_type = 'media')
│   └── fileUrl, fileName, fileSize, mimeType
└── 블록 기반 (content_type = 'document')
    └── blocks (JSONB)
```

---

## 7. 검증 결과 요약

### IR-O4O-TABLE-STANDARD-ALIGNMENT-VERIFY-V1

O4O 테이블 표준 정렬 검증. ContentMeta 타입 정합성, API 응답 매핑, UI 필터 동작 확인.

**결과: PASS**

### IR-NETURE-SUPPLIER-CONTENT-META-POST-VERIFY-V1

Neture DB 통합 후 8개 시나리오 검증:

| # | 시나리오 | 판정 |
|---|---------|------|
| S1 | 신규 Content 생성 (ContentMeta 저장) | PASS |
| S2 | Content 수정 (update 흐름) | PASS |
| S3 | API 응답 contentType 우선순위 | PASS |
| S4 | 기존 데이터 호환성 | PASS |
| S5 | visibility ↔ isPublic 동기화 | PASS |
| S6 | Supplier Library UI 영향 | PASS |
| S7 | 삭제된 endpoint 영향 | PASS |
| S8 | 시스템 안정성 | PASS |

**결과: PASS — Production Ready**

---

## 8. 현재 상태 정의

> **O4O 콘텐츠 구조는 ContentMeta 기반으로 통합되었으며 Production Ready 상태이다.**

| 서비스 | 타입 계약 | API 메타 | DB 칼럼 | UI 활용 |
|--------|:--------:|:--------:|:-------:|:-------:|
| Neture Library | O | O | **O** | O |
| CMS | O | O | - | O |
| KPA Society | O | O | - | - |
| KPA Working | O | - | - | - |
| Store Execution | O | - | - | - |

- **O**: 구현 완료
- **-**: 해당 단계 미적용 (향후 확장 가능)

Neture Library가 전체 파이프라인(타입 → API → DB → UI)을 완주한 기준 구현이다.

---

## 9. 향후 작업 기준

### 필수 규칙

1. **신규 콘텐츠 테이블**은 반드시 ContentMeta 필드(`content_type`, `visibility`, `producer` 개념)를 포함해야 한다.
2. **콘텐츠 API 응답**은 ContentMeta 필드(`producer`, `visibility`, `serviceKey`, `contentType`, `metaStatus`)를 유지해야 한다.
3. **visibility / contentType 값**은 `@o4o/types`에 정의된 값만 사용한다. 임의 확장 금지.
4. **기존 ContentMeta 구조를 임의로 변경하지 않는다.** 변경 필요 시 명시적 WO 필요.
5. **단방향 파생 규칙**을 위반하지 않는다. ContentMeta 필드에서 레거시 필드로의 역파생 금지.
6. **매핑 함수**(`mapCmsAuthorRole`, `mapNetureVisibility` 등)는 `@o4o/types`의 것을 사용한다. 서비스별 중복 구현 금지.

### 확장 로드맵 (참고)

| 순서 | 대상 | 내용 |
|------|------|------|
| 1 | CMS | `content_type`, `visibility` DB 칼럼 추가 (Neture 패턴 적용) |
| 2 | KPA Society | API 메타 필드 완성, UI 필터 추가 |
| 3 | Store Execution | API 메타 필드 추가, `contentType='execution_asset'` 명시 |
| 4 | KPA Working | `contentType='working_copy'` 메타 추가 |

---

## 10. 한 줄 요약

> **O4O 콘텐츠는 하나의 메타 언어(ContentMeta)로 통합되었다.**

---

*WO-CONTENT-META-PRODUCTION-DECLARATION-V1*
*Generated: 2026-04-21*
