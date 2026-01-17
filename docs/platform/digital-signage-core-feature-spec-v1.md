# Digital Signage Core - Feature Specification v1.0

> **Work Order**: WO-DIGITAL-SIGNAGE-ARCHITECTURE-V1
> **Phase**: 1-B (Architecture Definition)
> **Status**: Draft
> **Created**: 2026-01-17

---

## 1. Executive Summary

Digital Signage Core는 O4O Platform 내 모든 디지털 디스플레이 기능의 **공통 기반**을 제공하는 Core App이다.
약국, 화장품 매장, 관광 안내소 등 다양한 산업군에서 **동일한 Core API와 엔진**을 사용하여
디스플레이 관리, 플레이리스트, 스케줄링, 재생 로깅 기능을 활용할 수 있다.

### 1.1 Core vs Extension 원칙

| 구분 | Core App | Extension App |
|------|----------|---------------|
| **역할** | 공통 인프라, 엔진, API | 산업별 비즈니스 로직 |
| **소유 테이블** | channels, playlists, schedules, media, playback_logs, heartbeats | 없음 (Core 테이블 참조만) |
| **변경 권한** | Platform Admin만 | Service Operator |
| **예시** | Channel CRUD, Playlist 엔진 | 약국 콘텐츠 추천, 화장품 프로모션 |

---

## 2. Core App 기능 목록

### 2.1 Channel Management (채널 관리)

**범위**: Core

| 기능 | 설명 | API |
|------|------|-----|
| Channel CRUD | 채널 생성/조회/수정/삭제 | `POST/GET/PUT/DELETE /channels` |
| Channel by Code | 기계 코드로 채널 조회 | `GET /channels/code/:code` |
| Status Toggle | 채널 활성/비활성 전환 | `PATCH /channels/:id/status` |
| Content Resolution | 채널의 활성 콘텐츠 조회 | `GET /channels/:id/contents` |

**Channel Entity (Core)**:
```typescript
interface Channel {
  id: string;                    // UUID
  code: string;                  // Machine-readable (unique per scope)
  name: string;
  description?: string;
  type: 'tv' | 'kiosk' | 'signage' | 'web';
  status: 'active' | 'inactive' | 'maintenance';

  // Display Configuration
  resolution?: string;           // e.g., "1920x1080"
  orientation?: 'landscape' | 'portrait';

  // Content Binding (Loose Coupling)
  slotKey?: string;              // CMS ContentSlot reference
  playlistId?: string;           // Direct playlist binding (NEW)

  // Playback Settings
  autoplay: boolean;
  refreshIntervalSec: number;

  // Scope
  serviceKey: string;
  organizationId?: string;

  // Metadata
  location?: string;
  metadata?: Record<string, any>; // deviceId, macAddress, tags

  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2.2 Playlist Engine (플레이리스트 엔진)

**범위**: Core

**통합 대상**:
- `glycopharm_display_playlists` → `signage_playlists`
- `glycopharm_display_playlist_items` → `signage_playlist_items`
- `signage_playlists` (legacy) → 통합

| 기능 | 설명 | API |
|------|------|-----|
| Playlist CRUD | 플레이리스트 관리 | `POST/GET/PUT/DELETE /playlists` |
| Add/Remove Items | 콘텐츠 항목 관리 | `POST/DELETE /playlists/:id/items` |
| Reorder Items | 재생 순서 변경 | `PUT /playlists/:id/items/order` |
| Clone Playlist | 플레이리스트 복제 | `POST /playlists/:id/clone` |

**Playlist Entity (Core)**:
```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';

  // Ownership
  serviceKey: string;
  organizationId?: string;
  createdByUserId?: string;

  // Settings
  loopEnabled: boolean;
  defaultItemDuration: number;   // seconds
  transitionType: 'none' | 'fade' | 'slide';
  transitionDuration: number;    // milliseconds

  // Computed
  totalDuration: number;         // auto-calculated
  itemCount: number;

  // Social (Optional for Extension use)
  isPublic: boolean;
  likeCount: number;
  downloadCount: number;

  createdAt: Date;
  updatedAt: Date;
}

interface PlaylistItem {
  id: string;
  playlistId: string;
  mediaId: string;

  sortOrder: number;

  // Override settings
  duration?: number;             // null = use media duration
  transitionType?: string;       // null = use playlist default

  // Control
  isActive: boolean;
  isForced: boolean;             // Immutable by operator (HQ content)

  // Source tracking
  sourceType: 'platform' | 'hq' | 'supplier' | 'store' | 'operator_ad';

  createdAt: Date;
}
```

---

### 2.3 Schedule Engine (스케줄 엔진)

**범위**: Core

**통합 대상**:
- `glycopharm_display_schedules` → `signage_schedules`

| 기능 | 설명 | API |
|------|------|-----|
| Schedule CRUD | 스케줄 규칙 관리 | `POST/GET/PUT/DELETE /schedules` |
| Evaluate Active | 현재 활성 스케줄 판단 | `GET /schedules/evaluate?channelId=` |
| Bulk Update | 다수 채널 스케줄 일괄 적용 | `PUT /schedules/bulk` |

**Schedule Entity (Core)**:
```typescript
interface Schedule {
  id: string;
  name: string;

  // Target
  channelId?: string;            // Specific channel
  playlistId: string;            // Playlist to activate

  // Time Rules
  daysOfWeek: number[];          // 0-6 (Sun-Sat)
  startTime: string;             // HH:mm
  endTime: string;               // HH:mm

  // Date Range (Optional)
  validFrom?: Date;
  validUntil?: Date;

  // Control
  priority: number;              // Higher = takes precedence
  isActive: boolean;

  // Scope
  serviceKey: string;
  organizationId?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2.4 Media Engine (미디어 엔진)

**범위**: Core

**통합 대상**:
- `glycopharm_display_media` → `signage_media`

| 기능 | 설명 | API |
|------|------|-----|
| Media CRUD | 미디어 등록/관리 | `POST/GET/PUT/DELETE /media` |
| Upload Media | 파일 업로드 | `POST /media/upload` |
| External Media | YouTube/Vimeo 등록 | `POST /media/external` |

**Media Entity (Core)**:
```typescript
interface Media {
  id: string;
  name: string;
  description?: string;

  // Type
  mediaType: 'video' | 'image' | 'html' | 'text' | 'rich_text' | 'link';

  // Source
  sourceType: 'upload' | 'youtube' | 'vimeo' | 'url' | 'cms';
  sourceUrl: string;
  embedId?: string;              // YouTube/Vimeo video ID

  // Metadata
  thumbnailUrl?: string;
  duration?: number;             // seconds (for video/audio)
  resolution?: string;
  fileSize?: number;
  mimeType?: string;

  // Content (for text/rich_text)
  content?: string;

  // Scope
  serviceKey: string;
  organizationId?: string;

  // Status
  status: 'active' | 'inactive' | 'processing';

  // Tags for filtering
  tags?: string[];
  category?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2.5 Playback Logging (재생 로깅)

**범위**: Core

| 기능 | 설명 | API |
|------|------|-----|
| Log Playback | 재생 이벤트 기록 | `POST /channels/:id/playback-log` |
| Query Logs | 재생 이력 조회 | `GET /playback-logs` |
| Analytics | 노출 통계 | `GET /playback-logs/analytics` |

**PlaybackLog Entity (Core)** - 기존 `ChannelPlaybackLog` 유지:
```typescript
interface PlaybackLog {
  id: string;
  channelId: string;
  contentId: string;
  mediaId?: string;
  playlistId?: string;

  playedAt: Date;
  durationSec: number;
  completed: boolean;

  source: string;                // player version/type

  serviceKey: string;
  organizationId?: string;
}
```

---

### 2.6 Device Heartbeat (장치 상태)

**범위**: Core

| 기능 | 설명 | API |
|------|------|-----|
| Send Heartbeat | 장치 상태 전송 | `POST /channels/:id/heartbeat` |
| Device Status | 장치 온라인 상태 | `GET /devices/status` |
| Health Dashboard | 전체 장치 상태 | `GET /devices/health` |

**Heartbeat Entity (Core)** - 기존 `ChannelHeartbeat` 유지:
```typescript
interface Heartbeat {
  id: string;
  channelId: string;

  receivedAt: Date;

  playerVersion: string;
  deviceType?: string;
  platform?: string;
  ipAddress?: string;

  isOnline: boolean;
  uptimeSec?: number;

  metrics?: Record<string, any>;  // CPU, memory, etc.

  serviceKey: string;
  organizationId?: string;
}
```

---

### 2.7 Player URL Logic (플레이어 URL)

**범위**: Core

| URL Pattern | 용도 |
|-------------|------|
| `/player/:channelId` | UUID로 채널 재생 |
| `/player/code/:code` | 기계 코드로 채널 재생 |
| `/player/preview/:playlistId` | 플레이리스트 미리보기 |

**Player 동작**:
1. Channel 정보 조회
2. 활성 Schedule 평가 → Playlist 결정
3. Playlist Items 로드
4. Media 순차 재생
5. Playback Log 전송 (fire-and-forget)
6. Heartbeat 주기적 전송 (60초)

---

## 3. Extension App 역할

### 3.1 Extension이 담당하는 기능

| Extension | 담당 기능 |
|-----------|----------|
| **signage-pharmacy** | 약국별 콘텐츠 추천, 본부 공지 노출, 약국 정보 오버레이 |
| **signage-cosmetics** | 화장품 프로모션 연동, 제품 정보 표시, 브랜드 템플릿 |
| **signage-tourist** | 관광지 정보 표시, 다국어 지원, 실시간 안내 |
| **signage-seller-promo** | 판매자 광고 관리, 입찰 시스템, 노출 통계 |

### 3.2 Extension의 Core 사용 방식

```typescript
// Extension에서 Core API 호출 예시
import { SignageContractClient } from '@o4o/digital-signage-contract';

// Extension은 Core 테이블을 직접 수정하지 않음
// Core API를 통해서만 데이터 조작

// 플레이리스트 생성
const playlist = await signageClient.playlists.create({
  name: '약국 프로모션',
  serviceKey: 'glycopharm',
  organizationId: pharmacyId,
});

// 미디어 추가
await signageClient.playlists.addItem(playlist.id, {
  mediaId: contentMediaId,
  sortOrder: 1,
  sourceType: 'store',
});

// 스케줄 설정
await signageClient.schedules.create({
  playlistId: playlist.id,
  channelId: tvChannelId,
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
});
```

---

## 4. 폐기/통합 대상

### 4.1 폐기 예정

| 항목 | 위치 | 이유 |
|------|------|------|
| TV1/TV2 하드코딩 | signage.controller.ts | Channel 엔터티로 대체 |
| SignagePlaylist (legacy) | api-server/entities | Playlist로 통합 |

### 4.2 통합 대상

| 기존 | 통합 후 |
|------|---------|
| `glycopharm_display_playlists` | `signage_playlists` |
| `glycopharm_display_playlist_items` | `signage_playlist_items` |
| `glycopharm_display_schedules` | `signage_schedules` |
| `glycopharm_display_media` | `signage_media` |

### 4.3 유지 (변경 없음)

| 항목 | 위치 | 상태 |
|------|------|------|
| Channel | cms-core | 유지 (scope 추가) |
| ChannelPlaybackLog | cms-core | 유지 |
| ChannelHeartbeat | cms-core | 유지 |

---

## 5. API Endpoint Summary

### 5.1 Core Endpoints

```
# Channels
GET    /api/v1/signage/channels
POST   /api/v1/signage/channels
GET    /api/v1/signage/channels/:id
PUT    /api/v1/signage/channels/:id
DELETE /api/v1/signage/channels/:id
PATCH  /api/v1/signage/channels/:id/status
GET    /api/v1/signage/channels/:id/contents
GET    /api/v1/signage/channels/code/:code

# Playlists
GET    /api/v1/signage/playlists
POST   /api/v1/signage/playlists
GET    /api/v1/signage/playlists/:id
PUT    /api/v1/signage/playlists/:id
DELETE /api/v1/signage/playlists/:id
POST   /api/v1/signage/playlists/:id/items
DELETE /api/v1/signage/playlists/:id/items/:itemId
PUT    /api/v1/signage/playlists/:id/items/order
POST   /api/v1/signage/playlists/:id/clone

# Schedules
GET    /api/v1/signage/schedules
POST   /api/v1/signage/schedules
GET    /api/v1/signage/schedules/:id
PUT    /api/v1/signage/schedules/:id
DELETE /api/v1/signage/schedules/:id
GET    /api/v1/signage/schedules/evaluate

# Media
GET    /api/v1/signage/media
POST   /api/v1/signage/media
GET    /api/v1/signage/media/:id
PUT    /api/v1/signage/media/:id
DELETE /api/v1/signage/media/:id
POST   /api/v1/signage/media/upload
POST   /api/v1/signage/media/external

# Playback & Heartbeat
POST   /api/v1/signage/channels/:id/playback-log
POST   /api/v1/signage/channels/:id/heartbeat
GET    /api/v1/signage/playback-logs
GET    /api/v1/signage/playback-logs/analytics
GET    /api/v1/signage/devices/status
GET    /api/v1/signage/devices/health

# Player
GET    /player/:channelId
GET    /player/code/:code
GET    /player/preview/:playlistId
```

---

## 6. Permission Model

### 6.1 Core Permissions

| Permission | Description | Default Role |
|------------|-------------|--------------|
| `signage.channel.read` | 채널 조회 | operator, admin |
| `signage.channel.write` | 채널 생성/수정/삭제 | admin |
| `signage.playlist.read` | 플레이리스트 조회 | operator, admin |
| `signage.playlist.write` | 플레이리스트 관리 | operator, admin |
| `signage.schedule.read` | 스케줄 조회 | operator, admin |
| `signage.schedule.write` | 스케줄 관리 | operator, admin |
| `signage.media.read` | 미디어 조회 | operator, admin |
| `signage.media.write` | 미디어 등록/관리 | operator, admin |
| `signage.analytics.read` | 통계 조회 | operator, admin |
| `signage.device.read` | 장치 상태 조회 | operator, admin |

---

## 7. Migration Plan

### Phase 1: Entity Creation
1. `signage_playlists` 테이블 생성
2. `signage_playlist_items` 테이블 생성
3. `signage_schedules` 테이블 생성
4. `signage_media` 테이블 생성

### Phase 2: Data Migration
1. `glycopharm_display_*` 데이터 마이그레이션
2. Legacy `signage_playlists` 데이터 마이그레이션

### Phase 3: API Migration
1. Core API 엔드포인트 구현
2. Glycopharm 컨트롤러를 Core API 호출로 전환
3. Player를 새 API로 전환

### Phase 4: Cleanup
1. Legacy 테이블 Deprecation
2. Glycopharm 전용 엔터티 제거
3. 하드코딩 제거

---

## 8. Appendix

### 8.1 Related Documents
- `docs/platform/digital-signage-core-minimum-responsibility-v1.md` (LOCKED)
- `docs/specs/channel-spec.md` (WO-P4)
- Phase 1-A Investigation Report

### 8.2 File Locations
- Core Package: `apps/api-server/packages/digital-signage-core/`
- Contract: `apps/api-server/packages/digital-signage-contract/`
- Player: `services/signage-player-web/`
- Admin UI: `apps/admin-dashboard/src/pages/cms/channels/`

---

**Document Version**: 1.0 Draft
**Author**: AI Assistant (Phase 1-B)
**Review Required**: Platform Architect
