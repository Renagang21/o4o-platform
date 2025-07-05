# 📺 Signage API Documentation

## 🎯 Overview
Enhanced Signage API with Forum-style patterns for digital signage content management, real-time dashboard, and analytics.

**Base URL:** `/api/signage`
**Authentication:** Bearer Token required for all endpoints

---

## 📋 Content Management

### Enhanced Search
```http
POST /contents/search
Content-Type: application/json

{
  "query": "promotional video",
  "contentType": "youtube",
  "status": "approved",
  "tags": ["promotion", "marketing"],
  "sortBy": "popular",
  "page": 1,
  "limit": 20,
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  }
}
```

### Content CRUD
- `GET /contents` - List contents with basic filters
- `GET /contents/:id` - Get content details
- `POST /contents` - Create new content
- `PUT /contents/:id` - Update content
- `DELETE /contents/:id` - Delete content
- `PATCH /contents/:id/approval` - Approve/reject content

---

## 🏪 Store Management

### Store Operations
- `GET /stores` - List user's stores (role-based)
- `POST /stores` - Create store (admin only)
- `PUT /stores/:id` - Update store
- `DELETE /stores/:id` - Delete store (admin only)

---

## 🎵 Playlist Management

### Playlist CRUD
- `GET /stores/:storeId/playlists` - List store playlists
- `POST /stores/:storeId/playlists` - Create playlist
- `PUT /playlists/:playlistId` - Update playlist
- `DELETE /playlists/:playlistId` - Delete playlist

### Playlist Items
- `GET /playlists/:playlistId/items` - List playlist items
- `POST /playlists/:playlistId/items` - Add content to playlist
- `PUT /playlist-items/:itemId` - Update playlist item
- `DELETE /playlist-items/:itemId` - Remove from playlist
- `PATCH /playlists/:playlistId/items/reorder` - Reorder items

```http
PATCH /playlists/{playlistId}/items/reorder
{
  "itemOrders": [
    {"id": "uuid1", "order": 1},
    {"id": "uuid2", "order": 2}
  ]
}
```

---

## ⏰ Schedule Management

### Schedule Operations
- `GET /stores/:storeId/schedules` - List store schedules
- `POST /stores/:storeId/schedules` - Create schedule
- `PUT /schedules/:scheduleId` - Update schedule
- `DELETE /schedules/:scheduleId` - Delete schedule
- `GET /stores/:storeId/schedules/active` - Get current active schedule

### Schedule Types
- **daily**: Runs every day
- **weekly**: Runs on specific days of week
- **one_time**: Runs on specific date

---

## 🎨 Template Management

### Template CRUD
- `GET /templates` - List templates
- `POST /templates` - Create template (admin only)
- `PUT /templates/:templateId` - Update template (admin only)
- `DELETE /templates/:templateId` - Delete template (admin only)

---

## 📊 Analytics & Dashboard

### Analytics Endpoints
```http
GET /analytics
# Response: Overall signage analytics
{
  "success": true,
  "data": {
    "totalContent": 150,
    "totalStores": 25,
    "totalPlaylists": 40,
    "totalPlaytime": 50000,
    "activeStores": 20,
    "topContent": [...],
    "storeActivity": [...],
    "contentByType": {
      "youtube": 120,
      "vimeo": 30
    }
  }
}
```

- `GET /analytics/content-usage` - Content usage statistics
- `GET /analytics/store-performance` - Store performance metrics

### Live Dashboard
```http
GET /dashboard/live?storeId=optional
# Response: Real-time dashboard data
{
  "success": true,
  "data": {
    "activeStores": 20,
    "currentlyPlaying": 15,
    "totalViewTime": 12000,
    "liveActivity": [
      {
        "storeId": "uuid",
        "storeName": "Store 1",
        "currentContent": "Video Title",
        "status": "playing",
        "lastActivity": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "meta": {
    "refreshedAt": "2024-01-15T10:30:00Z",
    "autoRefreshInterval": 30000,
    "storeId": "optional-store-filter"
  }
}
```

---

## 🎮 Playback Control

### Real-time Control
```http
GET /stores/:storeId/playback/status
# Response: Current playback status
{
  "success": true,
  "data": {
    "isPlaying": true,
    "currentItem": {...},
    "playlist": {...},
    "schedule": {...}
  }
}

POST /stores/:storeId/playback/change
{
  "contentId": "uuid",
  "playlistId": "uuid"
}

POST /stores/:storeId/playback/control
{
  "action": "play" // play, pause, stop, restart
}
```

---

## 🔐 Authentication & Permissions

### Role-based Access Control

| Role | Content | Stores | Analytics | Playback |
|------|---------|--------|-----------|----------|
| **Customer** | View approved public | ❌ | ❌ | ❌ |
| **Business** | Create, manage own | ❌ | ❌ | ❌ |
| **Manager** | Create, manage own | Assigned stores | Store-specific | Store control |
| **Admin** | All access | All stores | Full analytics | All control |

### Error Handling
All endpoints return standardized error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [...] // Optional validation details
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `FORBIDDEN` - Access denied
- `SCHEDULE_CONFLICT` - Schedule time conflict
- `ANALYTICS_ERROR` - Analytics calculation failed
- `PLAYBACK_ERROR` - Playback control failed

---

## 🚀 New Features (Forum-style Enhancements)

1. **Enhanced Search**: Advanced filtering with tags, date ranges, popularity
2. **Real-time Dashboard**: Live store status monitoring (30s refresh)
3. **Analytics Suite**: Comprehensive usage statistics and performance metrics
4. **Playback Control**: Remote control capabilities for all stores
5. **Schedule Conflict Detection**: Automatic time conflict prevention
6. **Content Approval Workflow**: Pending → Approved/Rejected flow
7. **Caching System**: Redis-based caching for improved performance

## 📈 Performance Features

- **Caching**: 5-10 minute cache for analytics and store data
- **Pagination**: All list endpoints support pagination
- **Rate Limiting**: 100 requests per 15 minutes
- **Real-time Updates**: WebSocket support for live dashboard
- **Validation**: Comprehensive input validation on all endpoints