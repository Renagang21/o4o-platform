# WO-P4-CHANNEL-ENTITY-DESIGN-P0 Design Specification

## Channel Entity Design for Content Distribution

**Version**: 1.0
**Status**: Design Complete
**Date**: 2026-01-09
**Phase**: P4 (Channel Layer)

---

## 1. Executive Summary

This document defines the **Channel Entity** - the abstraction layer that represents "where CMS content is displayed". Channels connect CMS Slots to physical/virtual output destinations without modifying the existing CMS structure.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Channel references `slotKey` (not slot ID) | Loose coupling, allows slot reassignment |
| CMS remains unaware of Channel | One-way dependency, CMS is the source of truth |
| Channel is a "context", not just a device | Supports TV, kiosk, web areas, signage |
| Scope follows CMS pattern | organizationId + serviceKey for consistent filtering |

---

## 2. Existing CMS Structure (Reference Only)

### 2.1 CmsContent Entity (DO NOT MODIFY)

```
Table: cms_contents
├── id: uuid (PK)
├── organizationId: uuid | null    // Scope
├── serviceKey: varchar(50) | null // 'glycopharm', 'kpa', etc.
├── type: ContentType              // 'hero', 'notice', 'news', etc.
├── title, summary, body           // Content
├── imageUrl, linkUrl, linkText    // Media/Links
├── status: ContentStatus          // 'draft', 'published', 'archived'
├── publishedAt, expiresAt         // Timing
├── sortOrder, isPinned            // Display
├── metadata: jsonb                // Extensible
└── createdAt, updatedAt           // Audit
```

### 2.2 CmsContentSlot Entity (DO NOT MODIFY)

```
Table: cms_content_slots
├── id: uuid (PK)
├── organizationId: uuid | null
├── serviceKey: varchar(50) | null
├── slotKey: varchar(100)          // 'home-hero', 'store-tv-loop'
├── contentId: uuid (FK → cms_contents)
├── sortOrder: int
├── isActive: boolean
├── startsAt, endsAt: timestamp    // Time window
└── createdAt, updatedAt
```

---

## 3. Channel Entity Design

### 3.1 Entity Definition

```typescript
@Entity('channels')
@Index(['serviceKey', 'organizationId', 'status'])
@Index(['slotKey', 'status'])
@Index(['type', 'status'])
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ═══════════════════════════════════════════════════════════════
  // SCOPE (Who owns this channel?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;
  // null = platform-owned channel
  // uuid = organization-owned (pharmacy, branch, etc.)

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  serviceKey!: string | null;
  // null = cross-service channel
  // 'glycopharm', 'kpa', 'glucoseview', 'neture', 'k-cosmetics'

  // ═══════════════════════════════════════════════════════════════
  // IDENTITY (What is this channel?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 100 })
  name!: string;
  // Human-readable name: "강남약국 TV-1", "서울지부 로비 디스플레이"

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  code!: string | null;
  // Machine-readable unique code: "GN-TV-001", "SEOUL-LOBBY-01"
  // Used for device binding and API identification

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ═══════════════════════════════════════════════════════════════
  // CHANNEL TYPE (What kind of output?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 30 })
  type!: ChannelType;
  // 'tv' | 'kiosk' | 'signage' | 'web'

  // ═══════════════════════════════════════════════════════════════
  // CMS BINDING (Where does content come from?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 100 })
  slotKey!: string;
  // References CmsContentSlot.slotKey
  // Examples: 'home-hero', 'store-tv-loop', 'intranet-hero'
  // NOT a foreign key - loose coupling by design

  // ═══════════════════════════════════════════════════════════════
  // STATUS (Is this channel active?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: ChannelStatus;
  // 'active' | 'inactive' | 'maintenance'

  // ═══════════════════════════════════════════════════════════════
  // DISPLAY OPTIONS (How should content be displayed?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 20, nullable: true })
  resolution!: string | null;
  // '1920x1080', '3840x2160', '1080x1920' (portrait)

  @Column({ type: 'varchar', length: 20, default: 'landscape' })
  orientation!: string;
  // 'landscape' | 'portrait'

  @Column({ type: 'boolean', default: true })
  autoplay!: boolean;
  // Auto-start content playback

  @Column({ type: 'int', nullable: true })
  refreshIntervalSec!: number | null;
  // How often to refresh content (null = no auto-refresh)

  @Column({ type: 'int', default: 10 })
  defaultDurationSec!: number;
  // Default display duration per content item (for loops)

  // ═══════════════════════════════════════════════════════════════
  // LOCATION (Where is this channel physically?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;
  // Physical location: "1층 로비", "계산대 옆", "대기실"

  // ═══════════════════════════════════════════════════════════════
  // METADATA (Extensible properties)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;
  // Device ID, MAC address, tags, custom properties
  // Example: { deviceId: 'SAMSUNG-TV-001', macAddress: '00:1A:2B:3C:4D:5E', tags: ['lobby', 'high-traffic'] }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 3.2 Type Definitions

```typescript
/**
 * ChannelType - Kind of output destination
 */
export type ChannelType =
  | 'tv'        // Store/pharmacy TV display
  | 'kiosk'     // Interactive kiosk
  | 'signage'   // Digital signage (non-interactive)
  | 'web';      // Web area (banner, widget, dashboard section)

/**
 * ChannelStatus - Operational state
 */
export type ChannelStatus =
  | 'active'      // Receiving and displaying content
  | 'inactive'    // Disabled, not displaying
  | 'maintenance'; // Temporarily offline for maintenance
```

---

## 4. Database Schema

### 4.1 Table Definition (PostgreSQL)

```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  organization_id UUID,
  service_key VARCHAR(50),

  -- Identity
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,

  -- Type
  type VARCHAR(30) NOT NULL,

  -- CMS Binding
  slot_key VARCHAR(100) NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',

  -- Display Options
  resolution VARCHAR(20),
  orientation VARCHAR(20) DEFAULT 'landscape',
  autoplay BOOLEAN DEFAULT TRUE,
  refresh_interval_sec INTEGER,
  default_duration_sec INTEGER DEFAULT 10,

  -- Location
  location VARCHAR(255),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT chk_type CHECK (type IN ('tv', 'kiosk', 'signage', 'web')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'maintenance')),
  CONSTRAINT chk_orientation CHECK (orientation IN ('landscape', 'portrait'))
);

-- Indexes
CREATE INDEX idx_channels_scope ON channels (service_key, organization_id, status);
CREATE INDEX idx_channels_slot ON channels (slot_key, status);
CREATE INDEX idx_channels_type ON channels (type, status);
CREATE INDEX idx_channels_code ON channels (code) WHERE code IS NOT NULL;
CREATE INDEX idx_channels_org ON channels (organization_id) WHERE organization_id IS NOT NULL;
```

### 4.2 TypeORM Migration (Reference)

```typescript
// Migration: CreateChannelsTable
export class CreateChannelsTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID,
        service_key VARCHAR(50),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50),
        description TEXT,
        type VARCHAR(30) NOT NULL,
        slot_key VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        resolution VARCHAR(20),
        orientation VARCHAR(20) DEFAULT 'landscape',
        autoplay BOOLEAN DEFAULT TRUE,
        refresh_interval_sec INTEGER,
        default_duration_sec INTEGER DEFAULT 10,
        location VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_channels_scope ON channels (service_key, organization_id, status);
      CREATE INDEX idx_channels_slot ON channels (slot_key, status);
      CREATE INDEX idx_channels_type ON channels (type, status);
      CREATE INDEX idx_channels_code ON channels (code) WHERE code IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS channels`);
  }
}
```

---

## 5. Entity Relationships

### 5.1 Logical ERD (ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CMS LAYER (P3)                               │
│  ┌──────────────────┐         ┌──────────────────────┐              │
│  │   CmsContent     │         │   CmsContentSlot     │              │
│  ├──────────────────┤         ├──────────────────────┤              │
│  │ id (PK)          │◄────────┤ contentId (FK)       │              │
│  │ type             │    1:N  │ slotKey              │──────┐       │
│  │ title            │         │ serviceKey           │      │       │
│  │ status           │         │ organizationId       │      │       │
│  │ serviceKey       │         │ sortOrder            │      │       │
│  │ organizationId   │         │ isActive             │      │       │
│  └──────────────────┘         │ startsAt/endsAt      │      │       │
│                               └──────────────────────┘      │       │
└─────────────────────────────────────────────────────────────│───────┘
                                                              │
                           slotKey reference (loose coupling) │
                                                              │
┌─────────────────────────────────────────────────────────────│───────┐
│                       CHANNEL LAYER (P4)                     │       │
│                               ┌──────────────────────┐      │       │
│                               │      Channel         │      │       │
│                               ├──────────────────────┤      │       │
│                               │ id (PK)              │      │       │
│                               │ slotKey ─────────────│──────┘       │
│                               │ type                 │              │
│                               │ name                 │              │
│                               │ code                 │              │
│                               │ serviceKey           │              │
│                               │ organizationId       │              │
│                               │ status               │              │
│                               │ resolution           │              │
│                               │ orientation          │              │
│                               │ autoplay             │              │
│                               │ refreshIntervalSec   │              │
│                               │ defaultDurationSec   │              │
│                               │ location             │              │
│                               │ metadata             │              │
│                               └──────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Flow

```
[Content Creation]          [Slot Assignment]            [Channel Output]
      │                            │                           │
      ▼                            ▼                           ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│  CmsContent  │──────────▶│CmsContentSlot│◀──────────│   Channel    │
│              │   1:N     │              │   N:1     │              │
│ (What)       │           │ (When/Where) │           │ (Output To)  │
└──────────────┘           └──────────────┘           └──────────────┘
       │                          │                          │
       │                          │                          │
       ▼                          ▼                          ▼
  "Create hero              "Place in                "Display on
   banner content"           home-hero slot"          pharmacy TV"
```

### 5.3 Relationship Rules

| From | To | Type | Description |
|------|-----|------|-------------|
| CmsContentSlot | CmsContent | N:1 FK | Slot references content |
| Channel | CmsContentSlot | N:1 (slotKey) | Channel reads from slot (no FK) |
| CMS | Channel | None | CMS is unaware of channels |

---

## 6. Use Case Scenarios

### 6.1 Glycopharm Pharmacy TV

| Field | Value | Notes |
|-------|-------|-------|
| name | 강남약국 TV-1 | Human-readable |
| code | GN-TV-001 | Machine identifier |
| type | tv | Physical TV display |
| serviceKey | glycopharm | Pharmacy service |
| organizationId | `<pharmacy-uuid>` | Specific pharmacy |
| slotKey | store-tv-loop | Content loop for store TVs |
| status | active | Currently displaying |
| resolution | 1920x1080 | Full HD |
| orientation | landscape | Standard TV |
| autoplay | true | Auto-start |
| defaultDurationSec | 15 | 15 seconds per item |
| location | 대기실 | Physical location |
| metadata | `{ deviceId: 'SAMSUNG-001' }` | Device binding |

**Content Flow:**
1. Admin creates hero/promo content in CMS
2. Assigns to `store-tv-loop` slot with schedule
3. Pharmacy TV (Channel) reads from slot
4. Content displays automatically

### 6.2 KPA Branch Lobby Signage

| Field | Value |
|-------|-------|
| name | 서울지부 로비 디스플레이 |
| code | SEOUL-LOBBY-01 |
| type | signage |
| serviceKey | kpa |
| organizationId | `<seoul-branch-uuid>` |
| slotKey | intranet-hero |
| status | active |
| resolution | 3840x2160 |
| orientation | landscape |
| autoplay | true |
| defaultDurationSec | 20 |
| location | 1층 로비 |

### 6.3 GlucoseView Web Dashboard Banner

| Field | Value |
|-------|-------|
| name | Dashboard Top Banner |
| code | GLUCOSEVIEW-DASH-BANNER |
| type | web |
| serviceKey | glucoseview |
| organizationId | null |
| slotKey | dashboard-banner |
| status | active |
| resolution | null |
| orientation | landscape |
| autoplay | false |
| refreshIntervalSec | 300 |
| location | null |

### 6.4 K-Cosmetics Store Kiosk

| Field | Value |
|-------|-------|
| name | 명동점 제품 안내 키오스크 |
| code | MD-KIOSK-01 |
| type | kiosk |
| serviceKey | k-cosmetics |
| organizationId | `<store-uuid>` |
| slotKey | store-promo |
| status | active |
| resolution | 1080x1920 |
| orientation | portrait |
| autoplay | true |
| defaultDurationSec | 10 |
| location | 매장 입구 |

---

## 7. API Design (Reference for P4-IMPLEMENT)

### 7.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/channels` | List channels (with filters) |
| GET | `/api/v1/channels/:id` | Get channel by ID |
| GET | `/api/v1/channels/code/:code` | Get channel by code |
| POST | `/api/v1/channels` | Create channel |
| PUT | `/api/v1/channels/:id` | Update channel |
| PATCH | `/api/v1/channels/:id/status` | Update status only |
| DELETE | `/api/v1/channels/:id` | Delete channel |
| GET | `/api/v1/channels/:id/contents` | Get current contents for channel |

### 7.2 Content Retrieval Logic

```
GET /api/v1/channels/:id/contents

1. Get channel by ID
2. Read channel.slotKey
3. Query CmsContentSlot WHERE:
   - slotKey = channel.slotKey
   - serviceKey = channel.serviceKey OR null
   - organizationId = channel.organizationId OR null
   - isActive = true
   - startsAt <= NOW() OR startsAt IS NULL
   - endsAt >= NOW() OR endsAt IS NULL
4. Join CmsContent WHERE status = 'published'
5. Order by sortOrder
6. Return content list
```

---

## 8. Future Extensions (P5+)

These are explicitly **out of scope** for P4 but documented for future reference:

### 8.1 ChannelPlaybackLog (P5)

```typescript
// Track what was displayed and when
interface ChannelPlaybackLog {
  id: uuid;
  channelId: uuid;
  contentId: uuid;
  playedAt: timestamp;
  durationSec: number;
  completed: boolean;
}
```

### 8.2 ChannelSchedule (P5)

```typescript
// Time-based slot switching
interface ChannelSchedule {
  id: uuid;
  channelId: uuid;
  slotKey: string;
  dayOfWeek: number; // 0-6
  startTime: time;
  endTime: time;
}
```

### 8.3 ChannelHeartbeat (P5)

```typescript
// Device health monitoring
interface ChannelHeartbeat {
  channelId: uuid;
  lastSeenAt: timestamp;
  isOnline: boolean;
  ipAddress: string;
  version: string;
}
```

### 8.4 DeviceBinding (P5)

```typescript
// Physical device registration
interface DeviceBinding {
  id: uuid;
  channelId: uuid;
  deviceType: string;
  macAddress: string;
  activationCode: string;
  activatedAt: timestamp;
}
```

---

## 9. Slot Naming Convention

### 9.1 Standard Slot Keys

| Slot Key | Purpose | Typical Channel Types |
|----------|---------|----------------------|
| `home-hero` | Homepage main banner | web |
| `intranet-hero` | Intranet main banner | web, signage |
| `dashboard-banner` | Dashboard top banner | web |
| `store-tv-loop` | Store TV content loop | tv, signage |
| `store-promo` | Store promotional content | tv, kiosk |
| `lobby-display` | Lobby signage | signage |
| `waiting-room` | Waiting room display | tv |
| `checkout-banner` | Checkout area banner | signage, kiosk |

### 9.2 Naming Pattern

```
{location}-{purpose}[-{variant}]

Examples:
- home-hero
- intranet-hero
- store-tv-loop
- lobby-display-main
- checkout-promo-seasonal
```

---

## 10. Implementation Checklist (for P4-IMPLEMENT)

### 10.1 Entity & Migration
- [ ] Create Channel entity file
- [ ] Create TypeORM migration
- [ ] Run migration on dev database
- [ ] Verify table created correctly

### 10.2 API Endpoints
- [ ] GET /channels (list with filters)
- [ ] GET /channels/:id
- [ ] GET /channels/code/:code
- [ ] POST /channels
- [ ] PUT /channels/:id
- [ ] PATCH /channels/:id/status
- [ ] DELETE /channels/:id
- [ ] GET /channels/:id/contents

### 10.3 Admin UI
- [ ] Channel list page
- [ ] Channel form (create/edit)
- [ ] Channel status toggle
- [ ] Channel content preview

### 10.4 Integration
- [ ] Test with existing CMS slots
- [ ] Verify content retrieval logic
- [ ] Test scope filtering (service/org)

---

## 11. Definition of Done

- [x] Channel Entity fields fully defined
- [x] ChannelType and ChannelStatus enums defined
- [x] CMS Slot relationship documented (slotKey reference)
- [x] Logical ERD created
- [x] Use case scenarios documented
- [x] API design outlined
- [x] Future extensions identified (P5+)
- [x] Slot naming convention established
- [x] Implementation checklist prepared

---

## 12. Summary

The Channel Entity provides a clean abstraction for content distribution:

```
CMS (P3)                    Channel (P4)                Output (P5+)
┌─────────┐                ┌──────────┐                ┌──────────┐
│Content  │ → Slot →       │ Channel  │ →              │ TV/Kiosk │
│         │ (slotKey)      │(consumer)│                │ Web/Sign │
└─────────┘                └──────────┘                └──────────┘
```

**Key Benefits:**
- CMS remains unchanged (non-invasive)
- Loose coupling via slotKey (not FK)
- Supports all output types (TV, kiosk, web, signage)
- Scope-aware (service + organization)
- Ready for P5 extensions (playback, scheduling, heartbeat)

---

*Design Specification Complete*
*Ready for: WO-P4-CHANNEL-IMPLEMENT-P0*
