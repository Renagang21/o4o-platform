# Digital Signage - Phase 2 Baseline V2

> **Status:** Production Ready
> **Tag:** v2.0.0-signage-phase2
> **Date:** 2025-01-20

---

## 1. Overview

Phase 2는 Digital Signage 시스템의 프로덕션 수준 구현을 완료한 단계입니다.
이 문서는 Phase 3 확장앱 개발의 기준점(Baseline)이 됩니다.

---

## 2. Completed Features

### 2.1 Core Entities (12종)

| Entity | Description | Schema |
|--------|-------------|--------|
| SignagePlaylist | 재생 목록 관리 | signage_playlists |
| SignagePlaylistItem | 재생 목록 항목 | signage_playlist_items |
| SignageMedia | 미디어 파일 관리 | signage_media |
| SignageMediaTag | 미디어 태그 | signage_media_tags |
| SignageSchedule | 스케줄 관리 | signage_schedules |
| SignageTemplate | 템플릿 정의 | signage_templates |
| SignageTemplateZone | 템플릿 영역 | signage_template_zones |
| SignageLayoutPreset | 레이아웃 프리셋 | signage_layout_presets |
| SignageContentBlock | 콘텐츠 블록 | signage_content_blocks |
| SignagePlaylistShare | 재생목록 공유 | signage_playlist_shares |
| SignageAiGenerationLog | AI 생성 로그 | signage_ai_generation_logs |
| SignageAnalytics | 분석 데이터 | signage_analytics |

### 2.2 Core API

**Base Path:** `/api/signage/:serviceKey`

| Category | Endpoints |
|----------|-----------|
| Playlist | CRUD, Items, Reorder, Clone |
| Media | CRUD, Library, Clone |
| Schedule | CRUD, Calendar |
| Template | CRUD, Zones, Preview |
| Content Block | CRUD |
| Layout Preset | CRUD |
| Global Content | HQ/Supplier/Community |
| Active Content | Player resolution |
| Upload | Presigned URLs |
| AI | Content generation |

### 2.3 Role Structure (V3)

| Role | Scope | Capabilities |
|------|-------|--------------|
| **Admin** | Platform | 설정, Extensions, Analytics |
| **Operator** | HQ | 글로벌 콘텐츠 관리, 템플릿 |
| **Store** | Store | 로컬 콘텐츠, 스케줄, 디바이스 |

### 2.4 Global Content Flow

```
HQ (Operator)
   ↓ Publish
Global Pool (scope: global)
   ↓ Browse
Store (allowSignageStoreRead)
   ↓ Clone
Store Playlist (scope: store)
```

### 2.5 Player Capabilities

- Channel-code / Channel-id 재생
- Global + Store playlist merge
- Offline fallback
- Forced content (isForced=true)
- Heartbeat logging
- Error recovery

---

## 3. Architecture

### 3.1 Package Structure

```
packages/
├── digital-signage-core/     # Core 엔티티 및 타입
│   └── src/backend/entities/ # 12 production entities
└── @o4o-apps/signage/        # App manifest

apps/
├── api-server/
│   └── src/routes/signage/   # API endpoints
├── admin-dashboard/
│   └── src/pages/digital-signage/  # Admin UI
└── services/signage-player/  # Player app
```

### 3.2 Role-based Middleware

```typescript
// signage-role.middleware.ts
requireSignageAdmin      // Admin only
requireSignageOperator   // HQ Operator
requireSignageStore      // Store staff
requireSignageOperatorOrStore  // Both
allowSignageStoreRead    // Read-only for Store
validateServiceKey       // Service key validation
```

---

## 4. API Standards

### 4.1 Authentication

- JWT Bearer token required
- Service key validation via URL parameter

### 4.2 Response Format

```typescript
// Success
{ data: T, meta?: { page, limit, total } }

// Error
{ error: string, message: string, statusCode: number }
```

### 4.3 Pagination

```
GET /api/signage/:serviceKey/playlists?page=1&limit=20
```

---

## 5. Database Schema

### 5.1 Key Fields

| Field | Purpose |
|-------|---------|
| scope | 'store' \| 'global' |
| source | 'hq' \| 'supplier' \| 'community' |
| parentPlaylistId | Clone 원본 참조 |
| isForced | 강제 재생 여부 |
| organizationId | 멀티테넌시 |

### 5.2 Migration

- `2026011700001-CreateSignageCoreEntities.ts`
- All tables in default schema
- JSONB for template/layout config

---

## 6. Phase 3 Entry Points

Phase 3에서 확장할 영역:

| Area | Description |
|------|-------------|
| **Industry Extensions** | Pharmacy, Retail, Restaurant |
| **Analytics Dashboard** | Viewer insights, content performance |
| **AI Features** | Auto-scheduling, content recommendation |
| **Multi-display** | Synchronized playback |
| **Integration** | External CMS, POS systems |

---

## 7. Known Limitations

1. Video encoding server 미구현
2. Real-time sync (WebSocket) 미구현
3. Multi-region CDN 미구현

---

## 8. References

- [Core Extension Structure](../../platform/digital-signage/CORE-EXTENSION-STRUCTURE-V1.md)
- [Admin Access Policy](../../platform/digital-signage/ADMIN-ACCESS-POLICY.md)
- [Phase 2 Execution WO](../../platform/digital-signage-phase2-execution-wo-v1.md)

---

*Phase 2 Finalization: 2025-01-20*
*Tag: v2.0.0-signage-phase2*
