# Digital Signage - Unified Entity Diagram v0.1

> **Work Order**: WO-DIGITAL-SIGNAGE-ARCHITECTURE-V1
> **Phase**: 1-C (Entity Design)
> **Status**: Draft
> **Created**: 2026-01-17

---

## 1. Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DIGITAL SIGNAGE CORE ENTITIES                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     1:N     ┌──────────────┐     N:1     ┌──────────────┐
│   Channel    │◄────────────│   Schedule   │────────────►│   Playlist   │
│              │             │              │             │              │
│ id           │             │ id           │             │ id           │
│ code         │             │ channelId    │             │ name         │
│ name         │             │ playlistId   │             │ status       │
│ type         │             │ daysOfWeek[] │             │ loopEnabled  │
│ status       │             │ startTime    │             │ totalDuration│
│ playlistId?  │             │ endTime      │             └──────┬───────┘
│ slotKey?     │             │ priority     │                    │
└──────┬───────┘             │ isActive     │                    │
       │                     └──────────────┘                    │ 1:N
       │                                                         │
       │ 1:N                                                     ▼
       │                                               ┌──────────────────┐
       ▼                                               │  PlaylistItem    │
┌──────────────────┐                                   │                  │
│  PlaybackLog     │                                   │ id               │
│                  │                                   │ playlistId       │
│ id               │                                   │ mediaId          │
│ channelId        │                                   │ sortOrder        │
│ contentId        │                                   │ duration?        │
│ mediaId?         │                                   │ isActive         │
│ playedAt         │                                   │ isForced         │
│ durationSec      │                                   │ sourceType       │
│ completed        │                                   └────────┬─────────┘
└──────────────────┘                                            │
                                                                │ N:1
       │ 1:N                                                    ▼
       │                                               ┌──────────────────┐
       ▼                                               │     Media        │
┌──────────────────┐                                   │                  │
│   Heartbeat      │                                   │ id               │
│                  │                                   │ name             │
│ id               │                                   │ mediaType        │
│ channelId        │                                   │ sourceType       │
│ receivedAt       │                                   │ sourceUrl        │
│ playerVersion    │                                   │ embedId?         │
│ isOnline         │                                   │ thumbnailUrl?    │
│ uptimeSec        │                                   │ duration?        │
│ metrics          │                                   │ status           │
└──────────────────┘                                   └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              SCOPE INHERITANCE                               │
└─────────────────────────────────────────────────────────────────────────────┘

All entities include scope fields for multi-tenant isolation:

  ┌─────────────────────────────────────┐
  │          Base Scope Fields          │
  ├─────────────────────────────────────┤
  │  serviceKey: string                 │  ← Required (e.g., 'glycopharm')
  │  organizationId?: string            │  ← Optional (e.g., pharmacy UUID)
  └─────────────────────────────────────┘
```

---

## 2. Entity Definitions

### 2.1 Channel (채널)

**Table**: `channels` (existing in cms-core)

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type & Status
  type VARCHAR(20) NOT NULL CHECK (type IN ('tv', 'kiosk', 'signage', 'web')),
  status VARCHAR(20) NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'inactive', 'maintenance')),

  -- Display Config
  resolution VARCHAR(20),
  orientation VARCHAR(20) CHECK (orientation IN ('landscape', 'portrait')),

  -- Content Binding (choose one)
  slot_key VARCHAR(100),           -- CMS slot binding (loose coupling)
  playlist_id UUID REFERENCES signage_playlists(id),  -- Direct playlist binding

  -- Playback Settings
  autoplay BOOLEAN DEFAULT true,
  refresh_interval_sec INTEGER DEFAULT 300,

  -- Location & Metadata
  location VARCHAR(255),
  metadata JSONB,

  -- Scope
  service_key VARCHAR(50) NOT NULL,
  organization_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE (service_key, organization_id, code)
);

CREATE INDEX idx_channels_service_key ON channels(service_key);
CREATE INDEX idx_channels_organization_id ON channels(organization_id);
CREATE INDEX idx_channels_status ON channels(status);
CREATE INDEX idx_channels_type ON channels(type);
```

---

### 2.2 Playlist (플레이리스트)

**Table**: `signage_playlists` (NEW - replaces glycopharm_display_playlists)

```sql
CREATE TABLE signage_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('active', 'inactive', 'draft')),

  -- Settings
  loop_enabled BOOLEAN DEFAULT true,
  default_item_duration INTEGER DEFAULT 10,  -- seconds
  transition_type VARCHAR(20) DEFAULT 'fade'
    CHECK (transition_type IN ('none', 'fade', 'slide')),
  transition_duration INTEGER DEFAULT 500,   -- milliseconds

  -- Computed (updated via trigger)
  total_duration INTEGER DEFAULT 0,
  item_count INTEGER DEFAULT 0,

  -- Social Features (for content sharing)
  is_public BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,

  -- Ownership
  created_by_user_id UUID,

  -- Scope
  service_key VARCHAR(50) NOT NULL,
  organization_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_playlists_service_key ON signage_playlists(service_key);
CREATE INDEX idx_playlists_organization_id ON signage_playlists(organization_id);
CREATE INDEX idx_playlists_status ON signage_playlists(status);
CREATE INDEX idx_playlists_is_public ON signage_playlists(is_public);
```

---

### 2.3 PlaylistItem (플레이리스트 항목)

**Table**: `signage_playlist_items` (NEW - replaces glycopharm_display_playlist_items)

```sql
CREATE TABLE signage_playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES signage_playlists(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES signage_media(id) ON DELETE CASCADE,

  -- Order
  sort_order INTEGER NOT NULL,

  -- Override Settings (null = use defaults)
  duration INTEGER,              -- seconds, null = use media duration
  transition_type VARCHAR(20),   -- null = use playlist default

  -- Control
  is_active BOOLEAN DEFAULT true,
  is_forced BOOLEAN DEFAULT false,  -- HQ content, immutable by operator

  -- Source Tracking
  source_type VARCHAR(30) NOT NULL DEFAULT 'store'
    CHECK (source_type IN ('platform', 'hq', 'supplier', 'store', 'operator_ad')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE (playlist_id, sort_order)
);

CREATE INDEX idx_playlist_items_playlist_id ON signage_playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_media_id ON signage_playlist_items(media_id);
CREATE INDEX idx_playlist_items_source_type ON signage_playlist_items(source_type);
```

---

### 2.4 Media (미디어)

**Table**: `signage_media` (NEW - replaces glycopharm_display_media)

```sql
CREATE TABLE signage_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type
  media_type VARCHAR(20) NOT NULL
    CHECK (media_type IN ('video', 'image', 'html', 'text', 'rich_text', 'link')),

  -- Source
  source_type VARCHAR(20) NOT NULL
    CHECK (source_type IN ('upload', 'youtube', 'vimeo', 'url', 'cms')),
  source_url TEXT NOT NULL,
  embed_id VARCHAR(100),         -- YouTube/Vimeo video ID

  -- Metadata
  thumbnail_url TEXT,
  duration INTEGER,              -- seconds (for video/audio)
  resolution VARCHAR(20),
  file_size BIGINT,
  mime_type VARCHAR(100),

  -- Content (for text/rich_text)
  content TEXT,

  -- Categorization
  tags TEXT[],
  category VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'processing')),

  -- Scope
  service_key VARCHAR(50) NOT NULL,
  organization_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_service_key ON signage_media(service_key);
CREATE INDEX idx_media_organization_id ON signage_media(organization_id);
CREATE INDEX idx_media_media_type ON signage_media(media_type);
CREATE INDEX idx_media_source_type ON signage_media(source_type);
CREATE INDEX idx_media_status ON signage_media(status);
CREATE INDEX idx_media_tags ON signage_media USING GIN(tags);
```

---

### 2.5 Schedule (스케줄)

**Table**: `signage_schedules` (NEW - replaces glycopharm_display_schedules)

```sql
CREATE TABLE signage_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,

  -- Target
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES signage_playlists(id) ON DELETE CASCADE,

  -- Time Rules
  days_of_week INTEGER[] NOT NULL,  -- 0-6 (Sun-Sat)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Date Range (optional)
  valid_from DATE,
  valid_until DATE,

  -- Control
  priority INTEGER DEFAULT 0,       -- Higher = takes precedence
  is_active BOOLEAN DEFAULT true,

  -- Scope
  service_key VARCHAR(50) NOT NULL,
  organization_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedules_channel_id ON signage_schedules(channel_id);
CREATE INDEX idx_schedules_playlist_id ON signage_schedules(playlist_id);
CREATE INDEX idx_schedules_service_key ON signage_schedules(service_key);
CREATE INDEX idx_schedules_is_active ON signage_schedules(is_active);
CREATE INDEX idx_schedules_priority ON signage_schedules(priority DESC);
```

---

### 2.6 PlaybackLog (재생 로그)

**Table**: `channel_playback_logs` (existing in cms-core)

```sql
-- Already exists, no changes needed
CREATE TABLE channel_playback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  content_id VARCHAR(255) NOT NULL,
  media_id UUID,
  playlist_id UUID,

  played_at TIMESTAMP NOT NULL DEFAULT NOW(),
  duration_sec INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,

  source VARCHAR(100),  -- player version/type

  service_key VARCHAR(50) NOT NULL,
  organization_id UUID
);

CREATE INDEX idx_playback_logs_channel_id_played_at
  ON channel_playback_logs(channel_id, played_at DESC);
CREATE INDEX idx_playback_logs_content_id ON channel_playback_logs(content_id);
CREATE INDEX idx_playback_logs_service_key ON channel_playback_logs(service_key);
```

---

### 2.7 Heartbeat (장치 상태)

**Table**: `channel_heartbeats` (existing in cms-core)

```sql
-- Already exists, no changes needed
CREATE TABLE channel_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,

  received_at TIMESTAMP NOT NULL DEFAULT NOW(),

  player_version VARCHAR(50),
  device_type VARCHAR(50),
  platform VARCHAR(50),
  ip_address VARCHAR(45),

  is_online BOOLEAN DEFAULT true,
  uptime_sec BIGINT,

  metrics JSONB,

  service_key VARCHAR(50) NOT NULL,
  organization_id UUID
);

CREATE INDEX idx_heartbeats_channel_id_received_at
  ON channel_heartbeats(channel_id, received_at DESC);
CREATE INDEX idx_heartbeats_service_key ON channel_heartbeats(service_key);
```

---

## 3. Migration from Glycopharm

### 3.1 Table Mapping

| Source (Glycopharm) | Target (Core) |
|---------------------|---------------|
| `glycopharm_display_playlists` | `signage_playlists` |
| `glycopharm_display_playlist_items` | `signage_playlist_items` |
| `glycopharm_display_schedules` | `signage_schedules` |
| `glycopharm_display_media` | `signage_media` |

### 3.2 Migration Script (Draft)

```sql
-- 1. Migrate Media
INSERT INTO signage_media (
  id, name, description, media_type, source_type, source_url,
  embed_id, thumbnail_url, duration, status, service_key, organization_id,
  created_at, updated_at
)
SELECT
  id,
  COALESCE(title, 'Untitled') as name,
  description,
  'video' as media_type,
  source_type,
  source_url,
  embed_id,
  thumbnail_url,
  duration,
  'active' as status,
  'glycopharm' as service_key,
  pharmacy_id as organization_id,
  created_at,
  updated_at
FROM glycopharm_display_media;

-- 2. Migrate Playlists
INSERT INTO signage_playlists (
  id, name, description, status, is_public, like_count, download_count,
  created_by_user_id, service_key, organization_id, created_at, updated_at
)
SELECT
  id,
  name,
  description,
  status,
  is_public,
  like_count,
  download_count,
  created_by,
  'glycopharm' as service_key,
  pharmacy_id as organization_id,
  created_at,
  updated_at
FROM glycopharm_display_playlists;

-- 3. Migrate Playlist Items
INSERT INTO signage_playlist_items (
  id, playlist_id, media_id, sort_order, duration,
  transition_type, is_active, source_type, created_at
)
SELECT
  id,
  playlist_id,
  media_id,
  sort_order,
  play_duration as duration,
  transition_type,
  true as is_active,
  'store' as source_type,
  created_at
FROM glycopharm_display_playlist_items;

-- 4. Migrate Schedules
INSERT INTO signage_schedules (
  id, name, playlist_id, days_of_week, start_time, end_time,
  priority, is_active, service_key, organization_id, created_at, updated_at
)
SELECT
  id,
  'Schedule ' || id as name,
  playlist_id,
  ARRAY[days_of_week] as days_of_week,
  start_time::TIME,
  end_time::TIME,
  priority,
  is_active,
  'glycopharm' as service_key,
  (SELECT pharmacy_id FROM glycopharm_display_playlists WHERE id = playlist_id) as organization_id,
  created_at,
  updated_at
FROM glycopharm_display_schedules;
```

---

## 4. Triggers & Computed Fields

### 4.1 Playlist Duration Calculation

```sql
CREATE OR REPLACE FUNCTION update_playlist_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE signage_playlists
  SET
    item_count = (
      SELECT COUNT(*) FROM signage_playlist_items
      WHERE playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id)
      AND is_active = true
    ),
    total_duration = (
      SELECT COALESCE(SUM(
        COALESCE(pi.duration, m.duration, p.default_item_duration)
      ), 0)
      FROM signage_playlist_items pi
      JOIN signage_media m ON m.id = pi.media_id
      JOIN signage_playlists p ON p.id = pi.playlist_id
      WHERE pi.playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id)
      AND pi.is_active = true
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.playlist_id, OLD.playlist_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_playlist_stats
AFTER INSERT OR UPDATE OR DELETE ON signage_playlist_items
FOR EACH ROW EXECUTE FUNCTION update_playlist_stats();
```

---

## 5. Appendix

### 5.1 Entity Relationship Summary

```
Channel ─┬─► Schedule ─► Playlist ─► PlaylistItem ─► Media
         │
         ├─► PlaybackLog
         │
         └─► Heartbeat
```

### 5.2 Scope Hierarchy

```
Platform (serviceKey = null)
  └── Service (serviceKey = 'glycopharm')
        └── Organization (organizationId = pharmacy UUID)
              └── Channel/Playlist/Schedule/Media
```

---

**Document Version**: 0.1 Draft
**Author**: AI Assistant (Phase 1-C)
**Review Required**: Database Architect
