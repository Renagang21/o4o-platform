# IR-O4O-SIGNAGE-APP-ARCHITECTURE-AUDIT-V1

> **조사 목적**: O4O 플랫폼의 Digital Signage App 구조를 파악하여, Operator Console 연동(WO-O4O-SIGNAGE-CONSOLE-V1)의 기반 자료로 사용한다.
>
> **작성일**: 2026-03-11
>
> **코드 수정**: 없음 (READ-ONLY 조사)

---

## 1. Signage App 위치

### 1-1. 패키지 구조

| 위치 | 역할 |
|------|------|
| `packages/digital-signage-core/src/backend/entities/` | Core 엔티티 (18개 테이블) |
| `packages/types/src/signage.ts` | 공유 타입 정의 |
| `apps/api-server/src/routes/signage/` | Core Signage API (~148 엔드포인트) |
| `apps/api-server/src/routes/o4o-store/controllers/store-playlist.controller.ts` | Store Playlist 엔진 |
| `apps/api-server/src/middleware/signage-role.middleware.ts` | 권한 미들웨어 |
| `services/signage-player-web/` | 전용 Player 서비스 (React 19 + Vite) |

### 1-2. 프론트엔드 서비스별 현황

| 서비스 | 사이니지 페이지 | Store 연동 | 비고 |
|--------|:---------------:|:----------:|------|
| **KPA Society** | 4개 | YES (Asset Snapshot) | 가장 완전한 구현 |
| **GlycoPharm** | 5+개 | YES (자체 Display 시스템) | Smart Display + Editorial |
| **K-Cosmetics** | 3개 | NO (Browse only) | Content Hub 탐색만 |
| **Neture** | 1개 | NO (외부 링크만) | Browse only |
| **GlucoseView** | 0개 | N/A | 사이니지 미사용 |

### 1-3. GlycoPharm Legacy Display 시스템

GlycoPharm은 **독자적인 Display 엔티티**를 가짐:
- `glycopharm_display_playlists`
- `glycopharm_display_media`
- `glycopharm_display_playlist_items`
- `glycopharm_display_schedules`

이는 Core Signage 시스템과 **별도로 존재**하는 레거시 구조.

---

## 2. Signage 데이터 모델

### 2-1. Core 엔티티 목록 (18개)

| # | 테이블 | 역할 | Multi-tenant Key |
|---|--------|------|------------------|
| 1 | `signage_playlists` | 재생 목록 | serviceKey + organizationId |
| 2 | `signage_playlist_items` | 재생 목록 항목 | playlistId (FK) |
| 3 | `signage_media` | 미디어 에셋 | serviceKey + organizationId |
| 4 | `signage_media_tags` | 미디어 태그 (N:M) | serviceKey |
| 5 | `signage_playlist_shares` | 재생 목록 공유 | serviceKey |
| 6 | `signage_schedules` | 스케줄 | serviceKey + organizationId |
| 7 | `signage_templates` | 레이아웃 템플릿 | serviceKey + organizationId |
| 8 | `signage_template_zones` | 템플릿 영역 | templateId (FK) |
| 9 | `signage_content_blocks` | 콘텐츠 블록 | serviceKey + organizationId |
| 10 | `signage_layout_presets` | 레이아웃 프리셋 | serviceKey |
| 11 | `signage_display` | 디스플레이 기기 | organizationId |
| 12 | `signage_display_slot` | 디스플레이 슬롯 | displayId (FK) |
| 13 | `signage_analytics` | 재생 분석 | serviceKey + organizationId |
| 14 | `signage_ai_generation_logs` | AI 생성 로그 | serviceKey + organizationId |
| 15 | `signage_action_execution` | 실행 제어 | organizationId |
| 16 | `signage_media_list` | 미디어 리스트 | organizationId |
| 17 | `signage_media_list_item` | 미디어 리스트 항목 | mediaListId (FK) |
| 18 | `signage_media_source` | 미디어 소스 | organizationId |

### 2-2. Store Playlist 테이블 (HUB 연동)

| 테이블 | 역할 |
|--------|------|
| `store_playlists` | 매장 소유 재생 목록 |
| `store_playlist_items` | 매장 재생 항목 (snapshot 참조) |
| `store_library_items` | 매장 미디어 라이브러리 |
| `o4o_asset_snapshots` | 에셋 스냅샷 (불변 복사본) |

### 2-3. ER 관계 요약

```
SignageMedia ←── SignagePlaylistItem ──→ SignagePlaylist
     │                                        │
     ├── SignageMediaTag                       ├── SignagePlaylistShare
     │                                        │
     └── (sourceType: upload/youtube/vimeo)    └── SignageSchedule

SignageTemplate ←── SignageTemplateZone

Display ←── DisplaySlot

--- Store HUB 연동 ---

o4o_asset_snapshots ←── store_playlist_items ──→ store_playlists
                                                      │
                                          (organization_id FK)
```

---

## 3. Asset 구조

### 3-1. Media 타입

| mediaType | 설명 |
|-----------|------|
| `video` | 동영상 파일 |
| `image` | 이미지 파일 |
| `html` | HTML 콘텐츠 |
| `text` | 텍스트 |
| `rich_text` | 리치 텍스트 |
| `link` | 외부 링크 |

### 3-2. Source 타입

| sourceType | 설명 |
|------------|------|
| `upload` | 직접 업로드 |
| `youtube` | YouTube 영상 (embedId 사용) |
| `vimeo` | Vimeo 영상 (embedId 사용) |
| `url` | 외부 URL |
| `cms` | CMS 연동 |

### 3-3. 콘텐츠 계층 구조 (Content Hierarchy)

**Source** (콘텐츠 생산자):

| source | 설명 | 권한 |
|--------|------|------|
| `hq` | 운영자(본사) 제공 | requireSignageOperator |
| `supplier` | 공급자 제공 | requireSignageSupplier |
| `community` | 커뮤니티 공유 | requireSignageCommunity |
| `store` | 매장 자체 생성 | requireSignageStore |

**Scope** (가시 범위):

| scope | 설명 |
|-------|------|
| `global` | 전체 서비스에서 조회 가능 |
| `store` | 해당 매장에서만 조회 가능 |

**Status** (승인 워크플로):

```
draft → pending → active → archived
```

### 3-4. Forced Content (강제 콘텐츠)

```
SignagePlaylistItem.isForced = true
→ 매장에서 삭제/비활성 불가
→ 운영자가 설정한 콘텐츠가 반드시 재생됨
```

Store Playlist 레벨에서도 동일:

```
store_playlist_items.is_forced = true
store_playlist_items.is_locked = true
store_playlist_items.forced_start_at / forced_end_at  (시간 윈도우)
```

---

## 4. Playlist 구조

### 4-1. 핵심 컬럼

```typescript
SignagePlaylist {
  id: uuid
  serviceKey: string           // 멀티테넌트
  organizationId: uuid | null  // 매장 스코프
  name: string
  status: 'draft' | 'pending' | 'active' | 'archived'
  loopEnabled: boolean         // 반복 재생 (default: true)
  defaultItemDuration: number  // 기본 항목 시간 (초, default: 10)
  transitionType: 'none' | 'fade' | 'slide'
  transitionDuration: number   // ms (default: 500)
  totalDuration: number        // 계산된 총 시간
  itemCount: number            // 계산된 항목 수
  source: 'hq' | 'supplier' | 'community' | 'store'
  scope: 'global' | 'store'
  parentPlaylistId: uuid | null // 클론 추적
  isPublic: boolean
  version: number              // 낙관적 잠금
}
```

### 4-2. Playlist Item 구조

```typescript
SignagePlaylistItem {
  playlistId: uuid
  mediaId: uuid
  sortOrder: number            // UNIQUE [playlistId, sortOrder]
  duration: number | null      // 개별 오버라이드 (null = playlist default)
  transitionType: string | null // 개별 오버라이드
  isActive: boolean
  isForced: boolean            // HQ 강제 콘텐츠
  sourceType: 'platform' | 'hq' | 'supplier' | 'store' | 'operator_ad'
}
```

### 4-3. Store Playlist (HUB용)

```typescript
StorePlaylist {
  organization_id: uuid
  name: string
  playlist_type: 'SINGLE' | 'LIST'  // SINGLE: 최대 1개 항목
  publish_status: 'draft' | 'published'
  is_active: boolean
  source_playlist_id: uuid | null    // 클론 원본 추적
}
```

### 4-4. Playlist 공유 구조

```typescript
SignagePlaylistShare {
  playlistId: uuid
  sharedByOrganizationId: uuid
  sharedWithOrganizationId: uuid
  status: 'pending' | 'accepted' | 'rejected' | 'revoked'
  canEdit: boolean
  canUse: boolean
  canReshare: boolean
}
```

---

## 5. Display 구조

### 5-1. Display 기기

```typescript
Display {
  id: uuid
  organizationId: uuid
  ownerUserId: uuid | null
  name: string
  deviceCode: string | null
  status: 'online' | 'offline' | 'error'
  widthPx: number | null
  heightPx: number | null
  lastHeartbeat: timestamp | null
  metadata: jsonb
  isActive: boolean
}
```

### 5-2. Display Slot

디스플레이 화면을 **영역(Zone)**으로 분할:

```typescript
DisplaySlot {
  displayId: uuid
  name: string
  positionX: number
  positionY: number
  widthPx: number | null
  heightPx: number | null
  zIndex: number
  isActive: boolean
}
```

### 5-3. Template 시스템

디스플레이 레이아웃 사전 정의:

```typescript
SignageTemplate {
  layoutConfig: {
    width: number
    height: number
    orientation: string
    backgroundColor: string
    backgroundImage: string
  }
  category: 'pharmacy' | 'retail' | 'restaurant' | ...
  isPublic: boolean     // 전체 서비스 사용 가능
  isSystem: boolean     // 플랫폼 제공
}

SignageTemplateZone {
  templateId: uuid
  zoneType: 'media' | 'text' | 'clock' | 'weather' | 'ticker' | 'custom'
  position: { x, y, width, height, unit }
  zIndex: number
  defaultPlaylistId: uuid | null
  defaultMediaId: uuid | null
}
```

### 5-4. Action Execution (실행 제어)

```typescript
ActionExecution {
  actionType: 'play' | 'stop' | 'switch' | ...
  displayId: uuid | null
  displaySlotId: uuid | null
  status: 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed'
  executeMode: 'immediate' | 'replace' | 'reject'
}
```

---

## 6. Player 구조

### 6-1. 전용 Player 서비스

**위치**: `services/signage-player-web/`

| 항목 | 값 |
|------|------|
| 프레임워크 | React 19 + Vite + TypeScript |
| 진입 방식 | Channel 기반 (channelId 또는 channelCode) |
| 디바이스 | TV, Kiosk, Signage, Web |

### 6-2. Player Core 아키텍처

```
PlaybackEngine (Queue-based)
├── Preloading (configurable count)
├── Retry (3 attempts default)
├── Event-driven (STATE_CHANGE, ITEM_START, ITEM_END, ...)
└── States: IDLE → LOADING → PLAYING → PAUSED → ERROR → STOPPED
```

### 6-3. 지원 미디어 타입

```
image | video | html | text | youtube | vimeo | external | corner-display
```

### 6-4. Transition 효과

```
none | fade | slide-left | slide-right | slide-up | slide-down | zoom
```

### 6-5. Player Mode

| 모드 | 설명 |
|------|------|
| `zero-ui` | UI 없음 (TV 전체 화면) |
| `minimal` | 최소 UI |
| `preview` | 미리보기 |
| `debug` | 디버그 정보 표시 |

### 6-6. 핵심 서비스

| 서비스 | 역할 |
|--------|------|
| `ContentCache` | 오프라인 지원 (TTL/사이즈 제한) |
| `PlayerTelemetry` | Heartbeat + 재생 로깅 |
| `ScheduleResolver` | 활성 콘텐츠 결정 |

### 6-7. Device Detection

Heartbeat 시 디바이스 자동 감지: Tizen, WebOS, Android TV, Chrome, Safari 등

---

## 7. Store HUB 연결 가능성

### 7-1. 현재 연결 구조

```
Core Signage (signage_playlists/media)
        │
        │  publicContentApi (조회)
        ▼
   프론트엔드 Content Hub
        │
        │  assetSnapshotApi.copy()
        ▼
   o4o_asset_snapshots (불변 복사본)
        │
        │  store-playlist API
        ▼
   store_playlists + store_playlist_items
        │
        │  /store-playlists/public/:id
        ▼
   TV / Kiosk (PublicSignagePage)
```

### 7-2. Asset Snapshot Copy 흐름

```
1. 프론트엔드: assetSnapshotApi.copy({
     sourceService: 'kpa',
     sourceAssetId: mediaId,
     assetType: 'signage',
   })

2. 백엔드: POST /assets/copy
   → o4o_asset_snapshot 레코드 생성
   → source_service, source_asset_id, asset_type 저장

3. 매장 소유자: Store Playlist에 snapshot 추가
   → POST /store-playlists/:id/items { snapshot_id }

4. 공개 렌더링: GET /store-playlists/public/:id
   → publish_status='published' + is_active=true 필터
   → forced 항목 시간 윈도우 체크
```

### 7-3. Asset Snapshot 타입

```typescript
SnapshotType = 'user_copy' | 'hq_forced' | 'campaign_push' | 'template_seed'
LifecycleStatus = 'active' | 'expired' | 'archived'
```

### 7-4. 서비스별 Store HUB 연동 현황

| 서비스 | Store HUB 연동 | 방식 |
|--------|:--------------:|------|
| **KPA Society** | YES | Asset Snapshot Copy → Store Playlist |
| **GlycoPharm** | YES | 자체 Display 시스템 + Asset Snapshot |
| **K-Cosmetics** | NO | Browse-only (Content Hub 탐색만) |
| **Neture** | NO | 외부 링크만 |
| **GlucoseView** | N/A | 사이니지 미사용 |

---

## 8. Operator 권한 구조

### 8-1. Signage Role Middleware

**위치**: `apps/api-server/src/middleware/signage-role.middleware.ts`

| 함수 | 권한 | 설명 |
|------|------|------|
| `requireSignageAdmin` | platform:admin, platform:super_admin | 전체 관리 |
| `requireSignageOperator` | 서비스별 operator | HQ 콘텐츠 생성/관리 |
| `requireSignageStore` | organization member | 매장 콘텐츠 관리 (X-Organization-Id 헤더 필요) |
| `requireSignageOperatorOrStore` | operator OR store member | 조회 겸용 |
| `allowSignageStoreRead` | 관대한 읽기 접근 | Global 콘텐츠 조회 |
| `requireSignageCommunity` | community role | 커뮤니티 콘텐츠 생성 |
| `requireSignageSupplier` | supplier role | 공급자 콘텐츠 생성 |
| `validateServiceKey` | 서비스 키 검증 | 허용된 서비스 목록 확인 |

### 8-2. 권한 매트릭스

| 동작 | Admin | Operator | Store | Community | Supplier |
|------|:-----:|:--------:|:-----:|:---------:|:--------:|
| HQ 콘텐츠 생성 | O | O | X | X | X |
| HQ 콘텐츠 상태 변경 | O | O | X | X | X |
| 템플릿 관리 | O | O | X | X | X |
| 콘텐츠 블록 관리 | O | O | X | X | X |
| 레이아웃 프리셋 관리 | O | O | X | X | X |
| 매장 플레이리스트 CRUD | X | X | O | X | X |
| 매장 미디어 CRUD | X | X | O | X | X |
| 스케줄 관리 | X | X | O | X | X |
| Global 콘텐츠 조회 | O | O | O | O | O |
| 커뮤니티 콘텐츠 생성 | X | X | X | O | X |
| 공급자 콘텐츠 생성 | X | X | X | X | O |
| AI 콘텐츠 생성 | X | X | O | X | X |

---

## 9. API 구조

### 9-1. Core Signage API

**Base Path**: `/api/signage/:serviceKey`

**인증**: Bearer Token (authenticate 미들웨어)

#### 플레이리스트 관리
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/playlists` | OperatorOrStore | 목록 조회 |
| POST | `/playlists` | Store | 생성 |
| GET | `/playlists/:id` | OperatorOrStore | 상세 조회 |
| PATCH | `/playlists/:id` | Store | 수정 |
| DELETE | `/playlists/:id` | Store | 삭제 |

#### 플레이리스트 항목
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/playlists/:id/items` | OperatorOrStore | 항목 목록 |
| POST | `/playlists/:id/items` | Store | 항목 추가 |
| POST | `/playlists/:id/items/bulk` | Store | 일괄 추가 |
| POST | `/playlists/:id/items/reorder` | Store | 순서 변경 |
| PATCH | `/playlists/:id/items/:itemId` | Store | 항목 수정 |
| DELETE | `/playlists/:id/items/:itemId` | Store | 항목 삭제 |

#### 미디어 관리
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/media` | OperatorOrStore | 목록 조회 |
| POST | `/media` | Store | 생성 |
| GET | `/media/:id` | OperatorOrStore | 상세 조회 |
| PATCH | `/media/:id` | Store | 수정 |
| DELETE | `/media/:id` | Store | 삭제 |
| GET | `/media/library` | StoreRead | 라이브러리 |

#### 스케줄 관리
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/schedules` | Store | 목록 |
| POST | `/schedules` | Store | 생성 |
| GET | `/schedules/:id` | Store | 상세 |
| PATCH | `/schedules/:id` | Store | 수정 |
| DELETE | `/schedules/:id` | Store | 삭제 |
| GET | `/schedules/calendar` | Store | 캘린더 뷰 |

#### 템플릿 관리
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/templates` | StoreRead | 목록 |
| POST | `/templates` | Operator | 생성 |
| GET | `/templates/:id` | StoreRead | 상세 |
| PATCH | `/templates/:id` | Operator | 수정 |
| DELETE | `/templates/:id` | Operator | 삭제 |
| POST | `/templates/preview` | StoreRead | 미리보기 |

#### 템플릿 Zone
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/templates/:id/zones` | StoreRead | Zone 목록 |
| POST | `/templates/:id/zones` | Operator | Zone 추가 |
| PATCH | `/templates/:id/zones/:zoneId` | Operator | Zone 수정 |
| DELETE | `/templates/:id/zones/:zoneId` | Operator | Zone 삭제 |

#### 콘텐츠 블록 / 레이아웃
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/content-blocks` | StoreRead | 블록 목록 |
| POST | `/content-blocks` | Operator | 블록 생성 |
| GET | `/layout-presets` | StoreRead | 프리셋 목록 |
| POST | `/layout-presets` | Operator | 프리셋 생성 |

#### HQ 콘텐츠 (Operator 전용)
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | `/hq/playlists` | Operator | HQ 플레이리스트 생성 |
| POST | `/hq/media` | Operator | HQ 미디어 생성 |
| PATCH | `/hq/playlists/:id/status` | Operator | 상태 전환 |
| PATCH | `/hq/media/:id/status` | Operator | 상태 전환 |
| PATCH | `/hq/playlists/:id` | Operator | 수정 |
| PATCH | `/hq/media/:id` | Operator | 수정 |
| DELETE | `/hq/playlists/:id` | Operator | 삭제 |
| DELETE | `/hq/media/:id` | Operator | 삭제 |

#### Global / Community / 기타
| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/global/playlists` | StoreRead | 글로벌 플레이리스트 |
| GET | `/global/media` | StoreRead | 글로벌 미디어 |
| POST | `/community/media` | Community | 커뮤니티 미디어 |
| POST | `/community/playlists` | Community | 커뮤니티 플레이리스트 |
| GET | `/active-content` | StoreRead | 활성 콘텐츠 해석 |
| POST | `/upload/presigned` | OperatorOrStore | 업로드 URL |
| POST | `/ai/generate` | Store | AI 생성 |

### 9-2. Public Signage API

**Base Path**: `/api/signage/:serviceKey/public`

**인증**: 없음 (공개)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/media` | 공개 미디어 목록 (페이지네이션) |
| GET | `/playlists` | 공개 플레이리스트 목록 |
| GET | `/media/:id` | 미디어 상세 |
| GET | `/playlists/:id` | 플레이리스트 상세 (항목 포함) |

### 9-3. Store Playlist API

**Base Path**: `/api/v1/o4o-store` (o4o-store 라우트 내)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/store-playlists/public/:id` | 없음 | 공개 렌더링 (TV/Kiosk) |
| GET | `/store-playlists` | requireAuth | 내 플레이리스트 |
| POST | `/store-playlists` | requireAuth | 생성 |
| PATCH | `/store-playlists/:id` | requireAuth | 수정 |
| DELETE | `/store-playlists/:id` | requireAuth | 삭제 |
| GET | `/store-playlists/:id/items` | requireAuth | 항목 목록 |
| POST | `/store-playlists/:id/items` | requireAuth | 항목 추가 |
| POST | `/store-playlists/:id/items/from-library` | requireAuth | 라이브러리에서 추가 |
| PATCH | `/store-playlists/:id/items/reorder` | requireAuth | 순서 변경 |
| DELETE | `/store-playlists/:id/items/:itemId` | requireAuth | 항목 삭제 |

---

## 10. Operator Console 연동 설계 제안

### 10-1. 현재 Operator가 할 수 있는 것

기존 API에서 Operator (`requireSignageOperator`)가 사용 가능한 기능:

```
1. HQ 콘텐츠 생성 (플레이리스트 + 미디어)
2. HQ 콘텐츠 상태 전환 (draft → active)
3. 템플릿 관리 (생성/수정/삭제)
4. 콘텐츠 블록 관리
5. 레이아웃 프리셋 관리
6. 모든 플레이리스트/미디어 조회
```

### 10-2. Operator Console에서 필요한 화면

**기존 API를 재사용**하여 Operator Console 화면을 구성할 수 있다:

#### 화면 1: 사이니지 콘텐츠 관리 (HQ)

```
HQ 미디어 목록        → GET /api/signage/:serviceKey/media (source=hq)
HQ 미디어 생성        → POST /api/signage/:serviceKey/hq/media
HQ 플레이리스트 목록  → GET /api/signage/:serviceKey/playlists (source=hq)
HQ 플레이리스트 생성  → POST /api/signage/:serviceKey/hq/playlists
상태 관리              → PATCH /api/signage/:serviceKey/hq/(playlists|media)/:id/status
```

#### 화면 2: 전체 콘텐츠 현황

```
전체 미디어 통계       → GET /api/signage/:serviceKey/media (all sources)
전체 플레이리스트 통계 → GET /api/signage/:serviceKey/playlists (all sources)
커뮤니티 콘텐츠 현황   → source=community 필터
```

#### 화면 3: 템플릿 관리

```
템플릿 목록/생성/수정  → /api/signage/:serviceKey/templates
Zone 관리              → /api/signage/:serviceKey/templates/:id/zones
프리셋 관리            → /api/signage/:serviceKey/layout-presets
```

### 10-3. 핵심 발견: 서비스별 serviceKey

| 서비스 | serviceKey |
|--------|-----------|
| GlycoPharm | `glycopharm` |
| K-Cosmetics | `k-cosmetics` |
| Neture | `neture` |
| KPA Society | `kpa-society` |

Operator Console은 **서비스별로 serviceKey를 전달**하여 멀티테넌트 격리를 유지한다.

### 10-4. Signage Console 구현 시 고려사항

1. **Backend API 신규 구현 불필요**: 기존 `/api/signage/:serviceKey/` API가 Operator 권한을 이미 지원
2. **Extension Layer 패턴 불필요**: Core Signage API에 직접 연결 가능
3. **프론트엔드만 구현**: 각 서비스의 Operator Dashboard에 사이니지 관리 페이지 추가
4. **서비스 간 API 통일**: `publicContentApi` 패턴으로 serviceKey만 교체

### 10-5. WO-O4O-SIGNAGE-CONSOLE-V1 예상 흐름

```
Operator Dashboard
├── 사이니지 콘텐츠
│   ├── HQ 미디어 관리 (CRUD)
│   ├── HQ 플레이리스트 관리 (CRUD)
│   └── 전체 콘텐츠 현황 (읽기)
└── (선택) 템플릿 관리
    ├── 템플릿 CRUD
    └── Zone 편집
```

---

## 조사 완료 기준 답변

| 질문 | 답변 |
|------|------|
| **Signage App은 어디에 있는가** | Core: `packages/digital-signage-core/`, API: `apps/api-server/src/routes/signage/`, Player: `services/signage-player-web/` |
| **영상/URL/이미지 구조는 무엇인가** | `signage_media` 테이블. mediaType: video/image/html/text/rich_text/link. sourceType: upload/youtube/vimeo/url/cms |
| **Playlist는 어떻게 구성되는가** | `signage_playlists` → `signage_playlist_items` → `signage_media`. sortOrder로 순서, isForced로 강제 콘텐츠 |
| **Display는 어떻게 연결되는가** | `signage_display` + `signage_display_slot`. Channel 기반 재생 (channelId/channelCode) |
| **Store HUB와 연결 가능한가** | YES. Asset Snapshot Copy 흐름 존재: Core Media → Snapshot → Store Playlist → Public Render |
| **Operator가 생성 가능한가** | YES. `requireSignageOperator` guard로 HQ 콘텐츠, 템플릿, 블록, 프리셋 관리 가능 |
| **Operator Console에 어떻게 연결할 수 있는가** | 기존 `/api/signage/:serviceKey/hq/*` API 직접 사용. 프론트엔드 페이지만 추가하면 됨 |

---

*IR-O4O-SIGNAGE-APP-ARCHITECTURE-AUDIT-V1 — 2026-03-11*
