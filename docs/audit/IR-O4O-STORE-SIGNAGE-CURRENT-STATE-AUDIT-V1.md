# IR-O4O-STORE-SIGNAGE-CURRENT-STATE-AUDIT-V1

> **O4O Platform Store Signage — Cross-Service Current State Investigation Report**
>
> 조사 전용 (investigation-only). 코드 수정 없음.
>
> 작성 일자: 2026-04-17
> **2차 검증 일자: 2026-04-17** (GlycoPharm 판정 정정, 전체 판정 FAIL→PARTIAL)
> 조사 기준: 실제 코드 기준, 추측 배제.
> 범위: 4개 서비스 (KPA Society, GlycoPharm, Neture, K-Cosmetics) 전체의 Store Signage 구현 상태
> 선행 문서: IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1 (2026-04-16, KPA 한정)
>
> **2차 검증 요약**: GlycoPharm이 Core 직접 CRUD를 한다는 초기 판정은 **오류**였음. 실제로는 KPA와 동일한 `store_playlists` 스냅샷 엔진을 이미 사용 중. K-Cosmetics의 격리(`cosmetics_store_*`)는 COSMETICS-DOMAIN-RULES.md에 의한 **필수 격리**이며 통합 대상이 아님.

---

## 1. 전체 판정

| 판정 | **PARTIAL** (2차 검증으로 FAIL→PARTIAL 상향) |
|------|----------------------------------------------|

**근거 요약:**

- ✅ **데이터 엔진은 예상보다 통일** — 2차 검증 결과, KPA와 GlycoPharm 모두 `store_playlists` 스냅샷 엔진을 사용 중. K-Cosmetics의 격리(`cosmetics_store_*`)는 Cosmetics Domain Rules에 의한 필수 사항
- ⚠️ **UI 완성도가 서비스마다 극단적으로 다름** — GlycoPharm(4-tab 풀스택 1,569줄) vs KPA(2-tab 레거시 공존 1,622줄) vs Neture(browse-only) vs K-Cosmetics(기본형)
- ⚠️ **HUB/Store 경계 혼재** — 탐색(browse)과 운영(manage)이 같은 화면에 공존 (KPA ContentHubPage의 operatorMode, GlycoPharm Explore 탭)
- ⚠️ **Schedule 구현 불일치** — GlycoPharm만 완전 구현, 나머지 서비스 미구현
- ⚠️ **KPA raw SQL + Entity 충돌** 미해결
- ✅ **forced content 시스템은 정상 설계** — `signage_forced_content` + `store_playlist_items` UNION 병합으로 store 단계에서 적용

결론: **"데이터 엔진은 이미 수렴 중이나, UI 완성도 · HUB/Store 경계 · Schedule 정책이 정비 필요"** → 대규모 데이터 마이그레이션 없이 UI/정책 수준 정비로 해결 가능.

---

## 2. 현재 구조 다이어그램

### 2.1 데이터 흐름 전체도

```
┌─────────────────── SOURCE (콘텐츠 생성) ──────────────────────┐
│                                                               │
│  [HQ Operator]     [Supplier]      [Community]     [Store]    │
│       │                │                │             │       │
│       ▼                ▼                ▼             ▼       │
│  POST /hq/media   POST /supplier/  POST /community/  POST    │
│  POST /hq/playlists  media         media             /media  │
│       │                │                │             │       │
│       ▼                ▼                ▼             ▼       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              signage_media (Core)                     │    │
│  │  source='hq' │ source='supplier' │ source='community'│    │
│  │  scope='global'│ scope='global'   │ scope='global'   │    │
│  └──────────────────────────────────────────────────────┘    │
│       │                                                       │
│       ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           signage_playlists (Core)                    │    │
│  │           signage_playlist_items (Core)                │    │
│  │  + isForced flag + sourceType tracking                │    │
│  └──────────────────────────────────────────────────────┘    │
│       │                                                       │
│       ├── signage_forced_content (HQ 강제 삽입)               │
│       │   signage_forced_content_positions                    │
│       │                                                       │
│       ├── signage_schedules (시간 기반 배정)                   │
│       │                                                       │
│       └── signage_categories (분류 체계)                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                         │
                         ▼ (가져오기 / Snapshot)
┌─────────────────── STORE (매장 소유) ────────────────────────┐
│                                                               │
│  [KPA 전용]                    [K-Cosmetics 전용]             │
│  store_playlists               cosmetics_store_playlists      │
│  store_playlist_items          cosmetics_store_playlist_items  │
│  (snapshot_* 컬럼 기반)         (격리 스키마)                   │
│       │                              │                        │
│       ▼                              ▼                        │
│  /public/signage?playlist=:id   /public/signage?playlist=:id  │
│  (태블릿 재생)                   (태블릿 재생)                  │
│                                                               │
│  [GlycoPharm]                                                 │
│  store_playlists + store_playlist_items (KPA와 동일 엔진)      │
│  + signage_schedules (스케줄 완전 구현)                         │
│  ※ 2차 검증 결과: Core 직접 사용 아님, 이미 snapshot 기반        │
│                                                               │
│  [Neture]                                                     │
│  Store 엔진 없음 (browse-only)                                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 서비스별 데이터 엔진 사용 현황

| 서비스 | Core 테이블 사용 | Store 전용 테이블 | 스냅샷 여부 | 재생 엔진 |
|--------|:----------------:|:-----------------:|:-----------:|:---------:|
| **KPA Society** | HQ 콘텐츠 등록/조회 | `store_playlists` + `store_playlist_items` | YES (snapshot_* 컬럼) | `/public/signage` |
| **GlycoPharm** | HQ 콘텐츠 조회 (Public API) | `store_playlists` + `store_playlist_items` (KPA와 공유) | YES (snapshot 기반, 2차 검증으로 정정) | store 기반 + Schedule |
| **Neture** | Seller/Operator 콘텐츠 조회 | 없음 | NO | N/A |
| **K-Cosmetics** | HQ 콘텐츠 조회 | `cosmetics_store_playlists` + items | YES (격리 스키마) | `/public/signage` |

**핵심 발견 (2차 검증 정정)**: KPA와 GlycoPharm은 **동일한 `store_playlists` 스냅샷 엔진**을 사용 중. GlycoPharm의 코드 주석 `"globalContentApi 삭제 (clone 경로 전면 제거)"`가 이를 확인. 실제 분열은 2개 엔진: (1) `store_playlists` (KPA+GlycoPharm 공유) (2) `cosmetics_store_playlists` (K-Cosmetics 격리, Cosmetics Domain Rules 필수).

---

## 3. 데이터 구조 상세

### 3.1 Core 테이블 (digital-signage-core)

#### signage_media

| 컬럼 | 타입 | 목적 |
|------|------|------|
| id | UUID PK | |
| serviceKey | VARCHAR(50) | 멀티테넌트 격리 |
| organizationId | UUID nullable | 조직 스코프 |
| name | VARCHAR(255) | |
| mediaType | VARCHAR(20) | video/image/html/text/rich_text/link |
| sourceType | VARCHAR(20) | youtube/vimeo/url/cms |
| sourceUrl | TEXT | 실제 URL |
| embedId | VARCHAR(100) | YouTube/Vimeo ID |
| **source** | **VARCHAR(20)** | **WHO 생성: hq/supplier/community/store** |
| **scope** | **VARCHAR(20)** | **WHERE 노출: global/store** |
| **parentMediaId** | **UUID nullable** | **원본 추적 (clone 시)** |
| status | VARCHAR(20) | draft/pending/active/archived |
| categoryId | UUID FK → signage_categories | 분류 |
| createdByUserId | UUID | 생성자 |
| deletedAt | TIMESTAMP | 소프트 삭제 |
| version | INT | 낙관적 잠금 |

#### signage_playlists

| 컬럼 | 타입 | 목적 |
|------|------|------|
| id | UUID PK | |
| serviceKey | VARCHAR(50) | 멀티테넌트 |
| organizationId | UUID nullable | |
| name | VARCHAR(255) | |
| status | VARCHAR(20) | draft/pending/active/archived |
| loopEnabled | BOOLEAN | 반복 재생 |
| defaultItemDuration | INT | 기본 재생 시간(초) |
| transitionType | VARCHAR(20) | none/fade/slide |
| **source** | **VARCHAR(20)** | **hq/supplier/community/store** |
| **scope** | **VARCHAR(20)** | **global/store** |
| **parentPlaylistId** | **UUID nullable** | **clone 원본 추적** |
| totalDuration | INT | 계산된 총 재생 시간 |
| itemCount | INT | 계산된 항목 수 |
| isPublic | BOOLEAN | 공개 여부 |

#### signage_playlist_items

| 컬럼 | 타입 | 목적 |
|------|------|------|
| id | UUID PK | |
| playlistId | UUID FK | |
| mediaId | UUID FK | |
| sortOrder | INT | 재생 순서 |
| duration | INT nullable | 개별 재생 시간 오버라이드 |
| **isForced** | **BOOLEAN** | **HQ 강제 콘텐츠 여부** |
| **sourceType** | **VARCHAR(30)** | **platform/hq/supplier/store/operator_ad** |
| isActive | BOOLEAN | |

#### signage_schedules

| 컬럼 | 타입 | 목적 |
|------|------|------|
| id | UUID PK | |
| serviceKey | VARCHAR(50) | |
| playlistId | UUID FK | 대상 플레이리스트 |
| channelId | UUID nullable | null = 전체 채널 |
| daysOfWeek | INT[] | 0-6 (일-토) |
| startTime | TIME | |
| endTime | TIME | |
| validFrom | DATE nullable | 유효 시작일 |
| validUntil | DATE nullable | 유효 종료일 |
| priority | INT | 높을수록 우선 |
| isActive | BOOLEAN | |

#### signage_forced_content (신규 2026-04-18)

| 컬럼 | 타입 | 목적 |
|------|------|------|
| id | UUID PK | |
| service_key | VARCHAR(50) | |
| title | VARCHAR(255) | |
| video_url | TEXT | |
| source_type | VARCHAR(20) | youtube/vimeo |
| embed_id | VARCHAR(100) | |
| start_at | TIMESTAMPTZ | 활성 시작 |
| end_at | TIMESTAMPTZ | 활성 종료 |
| is_active | BOOLEAN | |
| created_by_user_id | UUID | |

#### signage_forced_content_positions

| 컬럼 | 타입 | 목적 |
|------|------|------|
| id | UUID PK | |
| playlist_id | UUID | 대상 플레이리스트 |
| forced_content_id | UUID FK | |
| display_order | INT | 삽입 위치 |

#### signage_categories

| 컬럼 | 타입 | 목적 |
|------|------|------|
| id | UUID PK | |
| serviceKey | VARCHAR(50) | |
| name | VARCHAR(100) | |
| sortOrder | INT | |
| isActive | BOOLEAN | |

KPA Seed: 건강정보(10) / 약국홍보(20) / 안전복약(30) / 행사안내(40) / 교육자료(50) / 기타(99)

#### 추가 Core 테이블 (HOLD 상태)

| 테이블 | 목적 | 사용 상태 |
|--------|------|----------|
| signage_templates | 레이아웃 템플릿 | 3개 서비스 TemplatesPage에서 사용 |
| signage_template_zones | 템플릿 내 영역 | templates 종속 |
| signage_layout_presets | 레이아웃 프리셋 | API만 존재, Frontend 소비 미확인 |
| signage_content_blocks | 재사용 블록 | API만 존재, Frontend 소비 미확인 |
| signage_ai_generation_logs | AI 생성 기록 | write-only audit trail |

#### DROP 완료/예정 테이블

| 테이블 | 상태 |
|--------|------|
| signage_playlist_shares | DROP (migration 20260417100000) |
| signage_analytics | DROP (migration 20260417100000) |
| signage_media_tags | DROP (migration 20260417100000) |

### 3.2 KPA 전용 Store 엔진

#### store_playlists

- 매장 소유 플레이리스트
- type: SINGLE (단일 미디어) / LIST (목록)
- publishStatus 관리
- organizationId 기반 격리

#### store_playlist_items

- **스냅샷 기반** — `snapshot_*` 컬럼에 재생 시점의 완전한 데이터 복사
- source_type + source_id → 원본 참조
- 원본 삭제/변경과 **무관하게 재생 안정성 보장**

### 3.3 K-Cosmetics 격리 엔진

#### cosmetics_store_playlists / cosmetics_store_playlist_items

- KPA와 동일한 스냅샷 구조
- `cosmetics_` prefix로 스키마 격리

---

## 4. Source / Scope 구조 분석

### 4.1 Source 개념 (WHO 생성했나)

| Source | 의미 | 생성 경로 | 노출 범위 |
|--------|------|----------|----------|
| **hq** | 본부 운영자가 생성 | `POST /hq/media`, `POST /hq/playlists` | global (모든 매장) |
| **supplier** | 공급자/파트너가 생성 | `POST /supplier/media` | global |
| **community** | 커뮤니티 사용자가 생성 | `POST /community/media` | global |
| **store** | 개별 매장이 생성 | `POST /media` (store guard) | store (해당 매장만) |

### 4.2 Scope 개념 (WHERE 보이는가)

| Scope | 의미 | 대상 |
|-------|------|------|
| **global** | 모든 매장에서 조회 가능 | HQ/Supplier/Community 콘텐츠 |
| **store** | 특정 조직(매장)에서만 조회 | Store 자체 생성 콘텐츠 |

### 4.3 Source → Scope 매핑 규칙

```
hq        → scope = 'global' (항상)
supplier  → scope = 'global' (항상)
community → scope = 'global' (항상)
store     → scope = 'store'  (항상)
```

### 4.4 구조적 문제: "가져오기"가 왜 생겼는가

**핵심 원인**: Source(global)와 Store(store) 사이에 **"소유권 전환"** 개념이 필요했기 때문.

```
HQ가 만든 콘텐츠 (source=hq, scope=global)
     │
     │  매장이 이것을 "내 플레이리스트"에 넣고 싶다
     │  → 단순 참조? 복사?
     │
     ▼
"가져오기" = 두 가지 구현이 공존
     │
     ├── [KPA 방식] assetSnapshotApi.copy()
     │   → o4o_asset_snapshots 에 스냅샷 생성
     │   → store_playlist_items.snapshot_* 컬럼에 데이터 복사
     │   → 원본과 완전 독립 (원본 삭제해도 재생 가능)
     │
     └── [GlycoPharm 방식] 직접 참조
         → signage_playlist_items.mediaId = 원본 media ID
         → 원본에 직접 의존 (원본 삭제 시 재생 불가)
```

**"가져오기"가 존재하는 3가지 이유:**

1. **데이터 소유권 모델 미확정** — global 콘텐츠를 store가 사용할 때 참조(reference)인지 복사(snapshot)인지 플랫폼 수준에서 확정되지 않음
2. **HUB/Store 경계 미정의** — 탐색(browse)과 운영(manage)의 경계가 서비스마다 다르게 해석됨
3. **UI 설계에서 데이터 계약을 선행하지 않음** — UI가 먼저 만들어지고, 각 서비스가 가장 편한 방식으로 API를 호출함

---

## 5. API 흐름 상세

### 5.1 인증 라우트 구조

**Base**: `/api/signage/:serviceKey/`

| 그룹 | 경로 패턴 | Guard | 역할 |
|------|----------|-------|------|
| Store Playlist | `/playlists/*` | operatorOrStore | 매장 플레이리스트 CRUD |
| Store Media | `/media/*` | operatorOrStore | 매장 미디어 CRUD |
| Store Schedule | `/schedules/*` | store | 스케줄 CRUD |
| Global Browse | `/global/playlists`, `/global/media` | storeRead | HQ/Supplier/Community 콘텐츠 조회 |
| HQ Management | `/hq/playlists/*`, `/hq/media/*` | operator | HQ 콘텐츠 CRUD + 상태 전이 |
| Forced Content | `/hq/forced-content/*` | operator | 강제 콘텐츠 관리 |
| Community | `/community/media/*`, `/community/playlists/*` | community | 커뮤니티 콘텐츠 생성/삭제 |
| Template | `/templates/*` | operator (쓰기) / storeRead (읽기) | 레이아웃 템플릿 |
| Content Block | `/content-blocks/*` | operator (쓰기) / storeRead (읽기) | 재사용 블록 |
| Category | `/categories/*` | operator (쓰기) / storeRead (읽기) | 분류 관리 |
| Upload | `/upload/presigned` | operatorOrStore | 업로드 |
| AI | `/ai/generate` | operatorOrStore | AI 생성 |

### 5.2 공개 라우트 (인증 불필요)

**Base**: `/api/signage/:serviceKey/public/`

| 경로 | 필터 | 용도 |
|------|------|------|
| `GET /media` | scope='global', status='active', source IN (hq,supplier,community) | 공개 미디어 목록 |
| `GET /playlists` | 상동 | 공개 플레이리스트 목록 |
| `GET /media/:id` | | 단일 미디어 |
| `GET /playlists/:id` | | 단일 플레이리스트 (items 포함) |

### 5.3 Guard 5종 매트릭스

| Guard | 역할 검증 | 조직 검증 | 용도 |
|-------|----------|----------|------|
| `requireSignageAdmin` | 시스템 전체 | 없음 | 플랫폼 설정 |
| `requireSignageOperator` | 서비스별 운영자 | 없음 | HQ 콘텐츠 CRUD |
| `requireSignageStore` | 매장 소유자 | X-Organization-Id 필수 | 매장 CRUD |
| `requireSignageOperatorOrStore` | 운영자 또는 매장 | 상황별 | 혼합 읽기 |
| `allowSignageStoreRead` | 매장 읽기 전용 | 느슨한 검증 | Global 콘텐츠 조회 |
| `requireSignageCommunity` | 커뮤니티 멤버 | 없음 | 커뮤니티 생성 |
| `requireSignageSupplier` | 공급자 | 없음 | 공급자 생성 |

### 5.4 UI-API 불일치

| # | 영역 | 현상 | 영향 |
|---|------|------|------|
| 1 | HQ 경로 | GET은 `?source=hq` 쿼리, 변이(POST/PATCH/DELETE)는 `/hq/` prefix | 동일 도메인에 2가지 규칙 |
| 2 | Copy | Signage 전용 `/copy` 제거됨 → `assetSnapshotApi.copy()` 으로 이전. 화면 문구 잔재 | 사용자 혼란 |
| 3 | Schedule | API 존재하나 KPA에서 화면 미구현. GlycoPharm만 4-tab에서 사용 | 서비스 간 불일치 |
| 4 | Scope filter | Public API에서 `scope='global'` 필터가 누락될 수 있음 | store 콘텐츠 노출 위험 |

---

## 6. UI 구조 — 서비스별 현재 상태

### 6.1 KPA Society

| 화면 | Route | 역할 | 상태 |
|------|-------|------|------|
| ContentHubPage | `/signage` | 커뮤니티 콘텐츠 탐색 | PARTIAL — operatorMode prop으로 운영자와 공유 |
| ContentHubPage (operator) | `/operator/signage/content` | 운영자 콘텐츠 관리 | DROP 대상 — HQMedia/HQPlaylists와 중복 |
| HQMediaPage | `/operator/signage/hq-media` | HQ 미디어 관리 | ACTIVE |
| HQPlaylistsPage | `/operator/signage/hq-playlists` | HQ 플레이리스트 관리 | ACTIVE |
| TemplatesPage | `/operator/signage/templates` | 템플릿 관리 | HOLD — 사용도 낮음 |
| CategoriesPage | `/operator/signage/categories` | 분류 관리 | ACTIVE |
| StoreSignagePage | `/store/marketing/signage` | 매장 사이니지 | PARTIAL — 2-tab(신규+legacy) |
| HubSignageLibraryPage | `/hub/signage` | HUB 라이브러리 탐색 | ACTIVE |
| PublicSignagePage | `/public/signage` | 태블릿 재생 | ACTIVE (핵심 경로) |
| MediaDetailPage | `/signage/media/:id` | 미디어 상세 | ACTIVE |
| PlaylistDetailPage | `/signage/playlist/:id` | 플레이리스트 상세 | ACTIVE |

**KPA 가져오기**: `assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId, assetType: 'signage' })`
- 위치: ContentHubPage 테이블의 "가져가기" 버튼 (Download 아이콘)
- 결과: `o4o_asset_snapshots` 에 스냅샷 생성 → `store_playlist_items`에서 참조

### 6.2 GlycoPharm

| 화면 | Route | 역할 | 상태 |
|------|-------|------|------|
| **StoreSignageMainPage** | `/store/signage/main` | **메인 4-tab 인터페이스** | ACTIVE — 가장 완성도 높음 |
| StoreSignagePage (legacy) | `/store/signage` | Legacy 2-tab (Playlist + Assets) | SUNSET 대상 |
| ContentLibraryPage | `/store/signage/library` | 콘텐츠 라이브러리 | ACTIVE |
| MediaDetailPage | `/store/signage/media/:id` | 미디어 상세 | ACTIVE |
| PlaylistDetailPage | `/store/signage/playlist/:id` | 플레이리스트 상세 | ACTIVE |
| SignagePreviewPage | `/store/signage/preview` | 미리보기 | ACTIVE |
| SignagePlaybackPage | `/store/signage/playback` | 재생 시뮬레이터 | ACTIVE |

**GlycoPharm StoreSignageMainPage 4-tab 상세:**

| Tab | 이름 | 기능 |
|-----|------|------|
| 1 | 가져올 콘텐츠 (Explore) | ContentLibraryPage 연결, 콘텐츠 탐색 후 매장으로 가져오기 |
| 2 | 내 동영상 (Assets) | KPI 카드 5종 + 필터/정렬 + 채널 토글 + 게시 상태 순환 |
| 3 | 내 플레이리스트 (Playlist) | CRUD + DataTable + 드래그 재정렬 + 항목 추가 |
| 4 | 스케줄 (Schedules) | 스케줄 CRUD + 요일/시간/우선순위 + 실시간 "현재 재생" 패널 |

**GlycoPharm 가져오기**: `?mediaId=` URL 파라미터로 선택 플레이리스트에 자동 추가 (Community → Store 흐름)

**2차 검증 정정**: GlycoPharm은 Core 직접 CRUD가 **아님**. 실제로는 `store_playlists` + `store_playlist_items` + `o4o_asset_snapshots` 스냅샷 기반 구조를 **이미 사용 중**. API 클라이언트 `storePlaylist.ts`가 `/glycopharm/store-playlists` 엔드포인트를 호출하며, 코드 주석 `"globalContentApi 삭제"`가 Core 직접 접근 제거를 확인. Tab 1 "Explore"는 Public API를 통한 **읽기 전용** 탐색일 뿐, Core CRUD가 아님.

### 6.3 Neture

| 화면 | Route | 역할 | 상태 |
|------|-------|------|------|
| SignageContentHubPage | `/seller/signage` | Seller 콘텐츠 탐색 | ACTIVE — browse-only |
| CommunitySignagePage | `/community/signage` | 커뮤니티 참조 | MINIMAL |
| StoreSignagePage | `/supplier/signage` | Supplier 매장 사이니지 | MINIMAL |
| HqMediaPage | `/operator/signage/hq-media` | HQ 미디어 관리 | ACTIVE |
| HqPlaylistsPage | `/operator/signage/hq-playlists` | HQ 플레이리스트 관리 | ACTIVE |
| TemplatesPage | `/operator/signage/templates` | 템플릿 관리 | ACTIVE |
| TemplateDetailPage | `/operator/signage/templates/:id` | 템플릿 상세 | ACTIVE |

**Neture 특징**: Store 수준 사이니지 구성 기능 없음. Seller/Supplier 는 browse-only.

### 6.4 K-Cosmetics

| 화면 | Route | 역할 | 상태 |
|------|-------|------|------|
| StoreSignagePage | `/store/signage` | 매장 사이니지 | BASIC |
| ContentHubPage | `/signage/content-hub` | 콘텐츠 허브 | ACTIVE |
| MediaDetailPage | `/signage/media/:id` | 미디어 상세 | ACTIVE |
| PlaylistDetailPage | `/signage/playlist/:id` | 플레이리스트 상세 | ACTIVE |
| HqMediaPage | `/operator/signage/hq-media` | HQ 미디어 관리 | ACTIVE |
| HqPlaylistsPage | `/operator/signage/hq-playlists` | HQ 플레이리스트 관리 | ACTIVE |
| TemplatesPage | `/operator/signage/templates` | 템플릿 관리 | ACTIVE |

**K-Cosmetics 특징**: `cosmetics_store_playlists` 격리 엔진 사용. KPA와 유사한 스냅샷 패턴이나 별도 스키마.

### 6.5 UI 일관성 비교표

| 기능 | KPA | GlycoPharm | Neture | K-Cosmetics |
|------|:---:|:----------:|:------:|:-----------:|
| Store Playlist CRUD | Snapshot 기반 | Core 직접 | 없음 | 격리 스키마 |
| Schedule CRUD | 없음 | 4-tab에서 완전 구현 | 없음 | 없음 |
| 가져오기 | assetSnapshot.copy | URL param 기반 | 없음 (browse-only) | Hub 링크 |
| KPI 대시보드 | 없음 | 5종 카드 | 없음 | 없음 |
| 강제 콘텐츠 표시 | 뱃지 (StoreSignagePage) | 뱃지+만료 경고 | 없음 | 없음 |
| 커뮤니티 콘텐츠 생성 | Modal (YouTube URL) | 없음 | 없음 | 없음 |
| 실시간 재생 상태 | 없음 | "현재 재생" + "다음 예정" 패널 | 없음 | 없음 |
| Operator 템플릿 | 화면 존재 여부 미확인 | 없음 (Operator 없음) | TemplatesPage 활성 | TemplatesPage 활성 |
| Design Core 적용 | 미적용 | 미적용 | 미적용 | 미적용 |
| 스타일링 | Custom table | Custom table | Card grid | Custom table |

---

## 7. Copy / Snapshot 구조 분석

### 7.1 두 가지 소유권 전환 패턴

#### 패턴 A: 스냅샷 기반 (KPA / K-Cosmetics)

```
Global Content (signage_media, scope='global')
    │
    ▼  assetSnapshotApi.copy()
o4o_asset_snapshots (불변 복사)
    │
    ▼  store_playlist_items 에 연결
store_playlists → store_playlist_items
    snapshot_title, snapshot_url, snapshot_thumbnail, ...
    (원본과 완전 독립)
```

**장점**: 원본 삭제/수정에 영향 없음. 재생 안정성 최고.
**단점**: 원본 업데이트 시 스냅샷은 갱신되지 않음. 저장 공간 증가.

#### ~~패턴 B: 직접 참조 (GlycoPharm)~~ — **2차 검증으로 삭제**

> **정정**: GlycoPharm도 패턴 A(스냅샷 기반)를 사용 중. `storePlaylist.ts` API 클라이언트가 `/glycopharm/store-playlists` 엔드포인트를 호출하며, `store_playlist_items` + `o4o_asset_snapshots` 기반. 코드 주석 `"globalContentApi 삭제 (clone 경로 전면 제거)"`가 확인.
>
> 따라서 **패턴 B는 현재 사용되지 않음**. 모든 서비스가 패턴 A(스냅샷)를 사용.

### 7.2 parentMediaId / parentPlaylistId (Clone 추적)

Core 엔티티에 `parentMediaId`, `parentPlaylistId` 필드가 존재하지만:
- **실제 사용 확인 불가** — clone 생성 시 이 필드를 설정하는 코드 경로가 명확하지 않음
- KPA는 `assetSnapshotApi.copy()`를 사용하므로 이 필드를 사용하지 않음
- GlycoPharm은 직접 참조하므로 clone 자체가 없음

**결론**: parent 추적 필드는 **설계만 존재하고 실사용되지 않는 상태**.

---

## 8. Store 내부 사이니지의 실제 역할

### 8.1 의도된 역할 vs 현재 역할

| 항목 | 원래 의도 | 현재 KPA 구현 | 현재 GlycoPharm 구현 |
|------|----------|-------------|---------------------|
| **콘텐츠 탐색** | HUB에서 global 콘텐츠 browse | `/hub/signage` + `/signage` (ContentHubPage) | `/store/signage/library` (ContentLibraryPage) |
| **콘텐츠 가져오기** | HUB → 매장으로 소유권 전환 | `assetSnapshotApi.copy()` (스냅샷) | Explore tab → URL param → 직접 추가 |
| **플레이리스트 구성** | 매장 소유 플레이리스트 편집 | `store_playlists` 기반 Playlist 탭 | `signage_playlists` Core 직접 CRUD |
| **스케줄 관리** | 시간대별 플레이리스트 배정 | 미구현 | 4-tab Schedule (완전 구현) |
| **재생** | 태블릿/사이니지 디스플레이 | `/public/signage?playlist=:id` | 미확인 (playback 시뮬레이터 존재) |
| **강제 콘텐츠** | HQ가 매장 플레이리스트에 강제 삽입 | `signage_forced_content` 시스템 | forced 뱃지 + 만료 경고 UI |

### 8.2 핵심 GAP

| # | GAP | 심각도 | 설명 |
|---|-----|:------:|------|
| G1 | **데이터 엔진 분열** | MEDIUM (정정) | KPA+GlycoPharm은 동일 `store_playlists` 스냅샷 엔진 공유. K-Cosmetics만 격리 (`cosmetics_store_playlists`, Cosmetics Domain Rules 필수). 실제 분열은 3개→2개 |
| G2 | **Store Signage 정의 부재** | HIGH | "Store Signage"가 무엇인지 플랫폼 수준에서 정의되지 않음. 각 서비스가 독자 해석 |
| G3 | **Schedule 불일치** | HIGH | GlycoPharm만 완전 구현, KPA/Neture/K-Cosmetics는 미구현. Core에 테이블은 존재 |
| G4 | **가져오기 패턴 불일치** | HIGH | KPA: assetSnapshot, GlycoPharm: URL param + 직접 추가, Neture: 없음, K-Cosmetics: Hub 링크 |
| G5 | **HUB/Store 경계 혼재** | MEDIUM | KPA에서 `ContentHubPage`가 탐색 + operatorMode로 관리까지 겸용 |
| G6 | **재생 경로 불명확** | MEDIUM | GlycoPharm의 재생이 `signage_*` Core 기반인데, 어떻게 store device에 연결되는지 불명확 |
| G7 | **forced content 적용 범위** | MEDIUM | HQ 강제 콘텐츠가 KPA 스냅샷 엔진에도 영향을 미치는지 불명확 |
| G8 | **Design Core 전면 미적용** | LOW | 모든 서비스의 사이니지 화면이 custom table 사용 |

---

## 9. 문제 리스트 (핵심)

### P1. 2개 데이터 엔진 공존 — Cosmetics 격리는 규칙 필수 (MEDIUM, 정정)

**현상 (2차 검증 정정)**: 실제로는 2개 경로:
- KPA + GlycoPharm: `store_playlists` → `store_playlist_items` (snapshot 기반, **공유**)
- K-Cosmetics: `cosmetics_store_playlists` → `cosmetics_store_playlist_items` (격리 스키마)

GlycoPharm이 Core 직접 CRUD를 한다는 초기 판정은 **오류**. 이미 `store_playlists` 스냅샷 엔진 사용 중.

**K-Cosmetics 격리는 의도적**: COSMETICS-DOMAIN-RULES.md §1.1-1.2에 의해 `cosmetics_` prefix + 독립 스키마 **필수**. 통합 대상이 아님.

**영향**: 신규 서비스 온보딩 기준은 명확해짐 → `store_playlists` 스냅샷 엔진이 표준. Cosmetics만 도메인 규칙에 의한 예외.

### P2. "가져오기" UI가 Store에 존재하는 이유 불명확 (HIGH)

**현상**: "가져오기"(Import) 버튼이 Store Signage 화면에 존재
- KPA: ContentHubPage의 "가져가기" 버튼
- GlycoPharm: Explore 탭의 "콘텐츠 허브 열기"

**문제**: "가져오기"는 HUB(탐색)의 기능이지 Store(운영)의 기능이 아님. Store 화면 안에 탐색 기능이 들어있으면 HUB와 역할이 중복되고, Store의 "내 플레이리스트 운영"이라는 핵심 목적이 희석됨.

### P3. HUB와 Store Signage 역할 중복 (HIGH)

**현상**:
- KPA: `/hub/signage` (HubSignageLibraryPage) + `/signage` (ContentHubPage) + `/store/marketing/signage` (StoreSignagePage) — 3곳에서 콘텐츠 탐색 가능
- GlycoPharm: `/store/signage/library` (ContentLibraryPage) + `/store/signage` Explore 탭

**문제**: 탐색(browse) 진입점이 분산되어 있어, 사용자가 "어디서 콘텐츠를 찾아야 하는지" 혼란.

### P4. 탐색(Browse) vs 운영(Manage) 혼재 (HIGH)

**현상**:
- KPA ContentHubPage: `operatorMode` prop으로 커뮤니티(탐색) + 운영자(관리) 겸용
- GlycoPharm StoreSignageMainPage: 4-tab 중 Tab 1이 "가져올 콘텐츠" = 탐색 기능

**문제**: 단일 컴포넌트/화면이 탐색과 운영을 모두 담당하면 책임 분리 원칙 위반. 각 역할에 맞는 최적 UX를 제공하기 어려움.

### P5. Schedule 테이블 존재하나 사용 불일치 (MEDIUM)

**현상**: `signage_schedules` 테이블과 API(GET/POST/PATCH/DELETE)가 모두 존재하지만:
- GlycoPharm만 4-tab에서 Schedule CRUD를 완전 구현
- KPA/Neture/K-Cosmetics는 Schedule UI가 없음

**문제**: "스케줄은 플랫폼 표준인가, GlycoPharm 전용인가"가 불명확.

### P6. Entity 충돌 + raw SQL (KPA 고유, 기존 IR에서 지적)

**현상**: `store_playlists` 테이블에 매핑된 엔티티 2종 + KPA 컨트롤러 raw SQL
**영향**: 스키마 변경 시 타입 안전성 없음

### P7. Playlist 재생 개념 통일 부재 (MEDIUM)

**현상**:
- KPA: `PublicSignagePage`에서 `store_playlists` 스냅샷 기반 재생
- GlycoPharm: `SignagePlaybackPage`에서 Core `signage_playlists` 기반 재생
- 공유 컴포넌트(`@o4o-apps/signage/SignagePlayer`)는 존재하나, 어떤 데이터 소스를 사용하는지 서비스마다 다름

**문제**: "플레이리스트를 재생한다"는 같은 동작이 서비스마다 다른 데이터 경로를 탐.

### P8. Forced Content 범위 불명확 (MEDIUM)

**현상**: `signage_forced_content`가 새로 생성됨 (migration 20260418100000)
- service_key 기반 scoping
- query-time에 playlist에 자동 주입

**문제**:
- KPA의 `store_playlists` 스냅샷 엔진에는 forced content가 어떻게 반영되는지 불명확
- GlycoPharm의 Core 기반 playlist에는 `signage_playlist_items.isForced` 플래그로 반영
- 두 엔진 간 forced content 적용 방식이 다를 수 있음

---

## 10. 구조 GAP 분석 (설계 의도 vs 현실)

### 10.1 digital-signage-core 설계 의도

```
설계 의도:
┌─────────────────────────────────────────────┐
│  모든 서비스가 signage_* Core 테이블 사용      │
│  source/scope 로 멀티테넌트 격리               │
│  parentId 로 clone 추적                       │
│  schedules 로 시간 기반 재생                   │
│  templates 로 레이아웃 관리                    │
│  forced content 로 HQ 강제 삽입               │
│  → 단일 통합 Signage 플랫폼                   │
└─────────────────────────────────────────────┘
```

### 10.2 현실 (2차 검증 정정)

```
현실 (정정 후):
┌──────── KPA + GlycoPharm (공유 엔진) ────────┐
│ store_playlists (동일 테이블)                  │
│ store_playlist_items (동일 테이블)              │
│ o4o_asset_snapshots (동일 스냅샷)              │
│ (snapshot 기반 — 동일 구조)                    │
│                                               │
│ 차이점:                                       │
│   KPA: Schedule 미구현, raw SQL, 2-tab legacy  │
│   GlycoPharm: Schedule 완전 구현, 4-tab 풀스택  │
│               Forced content UNION 병합         │
└───────────────────────────────────────────────┘

┌───── K-Cosmetics (격리 — 규칙 필수) ─────┐
│ cosmetics.cosmetics_store_playlists       │
│ cosmetics.cosmetics_store_playlist_items  │
│ (독립 스키마, COSMETICS-DOMAIN-RULES §1.1) │
│ KPA와 동일 스냅샷 구조, 별도 네임스페이스     │
└───────────────────────────────────────────┘

┌────── Neture ──────┐
│ Browse-only        │
│ Store 기능 없음     │
│ Seller/Supplier    │
└────────────────────┘
```

### 10.3 GAP 원인 분석

| # | 원인 | 결과 |
|---|------|------|
| 1 | Core 패키지가 엔티티만 제공하고 **사용 계약을 강제하지 않음** | 서비스가 Core를 무시하고 독자 엔진 구축 |
| 2 | "매장이 global 콘텐츠를 어떻게 사용하는가"에 대한 **플랫폼 표준이 없음** | 스냅샷 vs 직접 참조 분열 |
| 3 | Schedule 기능의 **필수/선택 여부가 정의되지 않음** | GlycoPharm만 구현 |
| 4 | Store Signage의 **최소 기능 세트(MVP)가 정의되지 않음** | 서비스마다 구현 범위가 다름 |
| 5 | KPA가 먼저 구현되면서 `store_playlists` 독자 엔진 생성 → 이것이 Core와 충돌 | 이후 서비스들이 어느 쪽을 따를지 혼란 |

---

## 11. 정비 방향 (초안 수준)

> 본 절은 구현 지시가 아니라 **방향만 정의**한다.

### 11.1 데이터 엔진 — 결정 불필요 (2차 검증)

**2차 검증 결과**: 데이터 엔진은 **이미 스냅샷 기반으로 수렴됨**.

| 서비스 | 엔진 | 상태 |
|--------|------|------|
| KPA | `store_playlists` (snapshot) | ✅ 표준 |
| GlycoPharm | `store_playlists` (snapshot) | ✅ 표준 (이미 전환 완료) |
| K-Cosmetics | `cosmetics_store_playlists` (snapshot, 격리) | ✅ 규칙 필수 |
| Neture | 없음 (browse-only) | N/A |

**Core 테이블(`signage_*`)의 역할**: Global 콘텐츠 저장소 (HQ/Supplier/Community). Store 재생에는 직접 사용하지 않음 (스냅샷으로 복사 후 사용).

**남은 과제**: 엔진 통일이 아니라 **UI 완성도 통일** + **HUB/Store 역할 분리**.

### 11.2 Store Signage 역할 재정의 방향

```
[탐색 (Browse)]              [운영 (Manage)]           [재생 (Play)]
  HUB / ContentHub             Store Dashboard            Device/Tablet
  "어떤 콘텐츠가 있나"          "내 플레이리스트 구성"       "매장에서 재생"

  → 가져오기는 여기서만          → 편집/정렬/삭제만           → 스케줄 기반
  → 모든 source 조회            → 매장 소유 콘텐츠만          → 자동 재생
```

- "가져오기"는 탐색(HUB) 영역에서만 제공
- Store Signage는 "이미 가져온 콘텐츠"를 관리하는 역할만
- Player는 Store와 분리된 독립 영역

### 11.3 Schedule/Template/Forced 정책 방향

| 기능 | 방향 | 근거 |
|------|------|------|
| Schedule | 플랫폼 표준으로 승격 또는 Out of Scope 공식화 | GlycoPharm만 구현된 현 상태는 불안정 |
| Template | Hold 유지 → 사용도 재평가 후 결정 | 3개 서비스 TemplatesPage 존재 |
| Forced Content | Core 수준으로 통합 필요 | 현재 KPA 스냅샷 엔진과 Core 사이의 적용 방식 불명확 |

---

## 12. 판정 기준 결과

| 기준 | 결과 | 근거 |
|------|------|------|
| **구조 일관성** | PARTIAL (정정) | 데이터 엔진은 KPA+GlycoPharm 공유 + K-Cosmetics 격리(규칙 필수). UI 완성도만 불일치 |
| **HUB/Store 경계** | FAIL | 탐색과 운영이 혼재, 가져오기 위치 불일치 |
| **데이터 흐름 명확성** | PARTIAL | Core 설계는 명확하나 실제 사용이 설계를 따르지 않음 |
| **API 계약 일관성** | PARTIAL | 공통 라우트 구조는 있으나 HQ 경로 규칙 불일치 |
| **재생 경로 안정성** | PASS (KPA) | KPA 스냅샷 기반 재생은 안정적으로 동작 |
| **신규 서비스 온보딩** | PARTIAL (정정) | `store_playlists` 스냅샷 엔진이 사실상 표준 (KPA+GlycoPharm). 문서화만 필요 |

**종합 판정: PARTIAL** (2차 검증으로 FAIL→PARTIAL 상향)

---

## 13. 후속 단계

### 필수 결정 사항 (2차 검증 반영)

1. **데이터 엔진: 이미 수렴됨** — `store_playlists` 스냅샷 엔진이 사실상 표준 (KPA+GlycoPharm 공유). K-Cosmetics 격리는 규칙 필수이므로 유지. **엔진 선택 결정은 불필요.**
2. **Store Signage MVP 기능 세트 정의** — GlycoPharm의 4-tab(Assets/Playlist/Schedule + Explore)을 기준으로 모든 서비스가 갖춰야 할 최소 기능 목록 확정
3. **가져오기 패턴: 이미 통일됨** — 스냅샷 방식(`assetSnapshotApi.copy()` + `store_playlist_items` snapshot 컬럼)이 표준. **패턴 선택 결정은 불필요.**
4. **Schedule 정책 확정** — GlycoPharm 기준으로 플랫폼 표준 승격 or Out of Scope 공식화
5. **HUB/Store 역할 분리** — 탐색(HUB)과 운영(Store) 경계 명확화. Store 내 Explore 탭 정책 결정
6. **KPA 정비** — raw SQL 제거, Entity 통일, 2-tab legacy 정리, Schedule 도입 여부

### 권장 순서 (정정)

```
Step 1: 본 IR 결과를 기반으로 MVP 기능 세트 합의
Step 2: WO-KPA-SIGNAGE-STORE-MODERNIZATION-V1 (KPA를 GlycoPharm 수준으로 끌어올림)
        - raw SQL → Repository 전환
        - 2-tab → 3-tab(Assets/Playlist/Schedule) 통합
        - Entity 충돌 해소
Step 3: WO-O4O-SIGNAGE-HUB-STORE-BOUNDARY-V1 (HUB/Store 역할 분리 표준화)
        - operatorMode 분기 해체
        - Explore 탭 정책 결정
Step 4: Schedule/Forced Content 정책 문서화
```

**주의**: GlycoPharm 데이터 마이그레이션은 **불필요** (이미 스냅샷 기반). K-Cosmetics 통합도 **불가** (규칙 위반).

---

## 부록 A. 주요 파일 위치

### API Server

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/signage/signage.routes.ts` | 메인 인증 라우트 |
| `apps/api-server/src/routes/signage/signage-public.routes.ts` | 공개 라우트 |
| `apps/api-server/src/middleware/signage-role.middleware.ts` | 역할 Guard 미들웨어 |
| `apps/api-server/src/routes/signage/controllers/` | 6개 컨트롤러 |
| `apps/api-server/src/routes/signage/services/` | 6개 서비스 |
| `apps/api-server/src/routes/signage/repositories/` | 6개 리포지토리 |
| `apps/api-server/src/routes/kpa/controllers/store-playlist.controller.ts` | KPA Store Playlist (raw SQL) |
| `apps/api-server/src/routes/kpa/entities/store-playlist.entity.ts` | KPA Store Entity (표준) |
| `apps/api-server/src/routes/dashboard/dashboard-assets.copy-handlers.ts` | Asset Copy/Import |

### Core Package

| 파일 | 역할 |
|------|------|
| `packages/digital-signage-core/src/backend/entities/` | 9개 Core 엔티티 |
| `packages/@o4o-apps/signage/` | 공유 UI 컴포넌트 (Player, Grid, Cards) |
| `packages/types/src/signage.ts` | 공유 타입 정의 |

### Frontend — KPA

| 파일 | 화면 |
|------|------|
| `services/web-kpa-society/src/pages/signage/ContentHubPage.tsx` | 콘텐츠 허브 |
| `services/web-kpa-society/src/pages/store/StoreSignagePage.tsx` | 매장 사이니지 (2-tab) |
| `services/web-kpa-society/src/pages/public/PublicSignagePage.tsx` | 태블릿 재생 |
| `services/web-kpa-society/src/pages/signage/HubSignageLibraryPage.tsx` | HUB 라이브러리 |

### Frontend — GlycoPharm

| 파일 | 화면 |
|------|------|
| `services/web-glycopharm/src/pages/store/signage/StoreSignageMainPage.tsx` | 메인 4-tab |
| `services/web-glycopharm/src/pages/store/signage/ContentLibraryPage.tsx` | 콘텐츠 라이브러리 |

### Frontend — Neture

| 파일 | 화면 |
|------|------|
| `services/web-neture/src/pages/seller/signage/SignageContentHubPage.tsx` | Seller 허브 |
| `services/web-neture/src/pages/operator/signage/` | Operator 관리 |

### Frontend — K-Cosmetics

| 파일 | 화면 |
|------|------|
| `services/web-k-cosmetics/src/pages/store/StoreSignagePage.tsx` | 매장 사이니지 |
| `services/web-k-cosmetics/src/pages/signage/ContentHubPage.tsx` | 콘텐츠 허브 |

## 부록 B. 관련 문서

| 문서 | 역할 |
|------|------|
| `docs/kpa/IR-KPA-SIGNAGE-CURRENT-STATE-AUDIT-V1.md` | KPA 한정 현황 감사 (2026-04-16) |
| `docs/kpa/WO-KPA-SIGNAGE-DEAD-CODE-RETIREMENT-PLAN-V1.md` | Dead code 제거 계획 |
| `docs/kpa/WO-KPA-SIGNAGE-IA-RESTRUCTURE-DRAFT-V1.md` | KPA IA 재설계 초안 |
| `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` | Boundary Policy (F6) |
| `docs/architecture/SIGNAGE-APPROVAL-ARCHITECTURE-V1.md` | 승인 워크플로 설계 |

## 부록 C. 용어 정의

| 용어 | 정의 |
|------|------|
| **Source** | 콘텐츠를 생성한 주체 (hq/supplier/community/store) |
| **Scope** | 콘텐츠가 보이는 범위 (global/store) |
| **Snapshot** | 원본 콘텐츠의 특정 시점 완전 복사. 원본과 독립 |
| **Clone** | 원본 기반으로 새 레코드 생성. parentId로 추적 |
| **Forced Content** | HQ가 매장 플레이리스트에 강제 삽입하는 콘텐츠 |
| **Core 테이블** | `signage_*` prefix의 digital-signage-core 엔티티 테이블 |
| **Store 엔진** | `store_playlists` / `cosmetics_store_playlists` 등 매장 전용 재생 엔진 |

---

*조사자: Claude (Opus 4.6)*
*조사 일자: 2026-04-17*
*조사 근거: 4개 병렬 Explore agent (Data Model / API / UI / Core Package) + 기존 KPA 감사 문서 교차 검증*
*범위: O4O Platform 전체 Store Signage 현황 — 수정 없음, 진단/권고만 수록*
