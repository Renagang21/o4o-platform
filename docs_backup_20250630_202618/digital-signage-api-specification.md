# Digital Signage API Specification

## Overview
o4o-platform의 Digital Signage 서비스는 매장에서 디지털 사이니지를 통해 동영상 컨텐츠를 재생하고 관리할 수 있는 시스템입니다.

## Base URL
```
Production: https://neture.co.kr/api/signage
Development: http://localhost:4000/api/signage
```

## Authentication
모든 API 엔드포인트는 JWT 토큰을 통한 인증이 필요합니다.
```
Authorization: Bearer <jwt_token>
```

## User Roles & Permissions

### Role-based Access Control
- **ADMIN**: 모든 기능 접근 가능
- **MANAGER**: 매장 관리자 (store_manage 권한 필요)
- **BUSINESS/AFFILIATE**: 컨텐츠 등록 신청 가능
- **CUSTOMER**: 공개 컨텐츠 조회만 가능

---

## 1. Content Management API

### 1.1 Get All Contents
**Endpoint:** `GET /contents`

**Description:** 컨텐츠 목록 조회 (역할별 필터링)

**Query Parameters:**
- `page` (optional): 페이지 번호 (default: 1)
- `limit` (optional): 페이지당 항목 수 (default: 20)
- `status` (optional): 컨텐츠 상태 (`pending`, `approved`, `rejected`, `inactive`)
- `type` (optional): 컨텐츠 타입 (`youtube`, `vimeo`)
- `search` (optional): 제목/설명 검색
- `createdBy` (optional): 작성자 ID (admin only)
- `isPublic` (optional): 공개 여부 (boolean)

**Response:**
```json
{
  "success": true,
  "data": {
    "contents": [
      {
        "id": "uuid",
        "title": "Sample Video",
        "description": "Video description",
        "type": "youtube",
        "url": "https://youtube.com/watch?v=xxx",
        "videoId": "xxx",
        "thumbnailUrl": "https://img.youtube.com/vi/xxx/maxresdefault.jpg",
        "duration": 180,
        "status": "approved",
        "tags": ["promotional", "product"],
        "isPublic": true,
        "creator": {
          "id": "uuid",
          "name": "Creator Name",
          "role": "business"
        },
        "approvedBy": "admin_id",
        "approvedAt": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 1.2 Get Content by ID
**Endpoint:** `GET /contents/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Sample Video",
    "description": "Video description",
    "type": "youtube",
    "url": "https://youtube.com/watch?v=xxx",
    "videoId": "xxx",
    "thumbnailUrl": "https://img.youtube.com/vi/xxx/maxresdefault.jpg",
    "duration": 180,
    "status": "approved",
    "tags": ["promotional", "product"],
    "isPublic": true,
    "creator": {
      "id": "uuid",
      "name": "Creator Name",
      "role": "business"
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 1.3 Create Content
**Endpoint:** `POST /contents`

**Permissions:** BUSINESS, AFFILIATE, MANAGER, ADMIN

**Request Body:**
```json
{
  "title": "New Video Content",
  "description": "Content description",
  "type": "youtube",
  "url": "https://youtube.com/watch?v=xxx",
  "tags": ["promotional", "new"],
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content created successfully. Approval pending for non-admin users.",
  "data": {
    "id": "uuid",
    "title": "New Video Content",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 1.4 Update Content
**Endpoint:** `PUT /contents/:id`

**Permissions:** Creator or ADMIN

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["updated", "content"],
  "isPublic": false
}
```

### 1.5 Delete Content
**Endpoint:** `DELETE /contents/:id`

**Permissions:** Creator or ADMIN

### 1.6 Approve/Reject Content
**Endpoint:** `PATCH /contents/:id/approval`

**Permissions:** ADMIN only

**Request Body:**
```json
{
  "action": "approve", // or "reject"
  "reason": "Rejection reason (required for reject)"
}
```

---

## 2. Store Management API

### 2.1 Get All Stores
**Endpoint:** `GET /stores`

**Permissions:** ADMIN (all stores), MANAGER (own store only)

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "id": "uuid",
        "name": "Downtown Store",
        "description": "Main downtown location",
        "address": {
          "street": "123 Main St",
          "city": "Seoul",
          "state": "Seoul",
          "zipcode": "12345",
          "country": "Korea"
        },
        "phone": "02-1234-5678",
        "businessHours": "09:00-22:00",
        "status": "active",
        "displaySettings": {
          "resolution": "1920x1080",
          "orientation": "landscape",
          "defaultTemplate": "template_id"
        },
        "manager": {
          "id": "uuid",
          "name": "Store Manager",
          "email": "manager@store.com"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 2.2 Create Store
**Endpoint:** `POST /stores`

**Permissions:** ADMIN only

**Request Body:**
```json
{
  "name": "New Store",
  "description": "Store description",
  "address": {
    "street": "456 New St",
    "city": "Seoul",
    "state": "Seoul",
    "zipcode": "54321",
    "country": "Korea"
  },
  "phone": "02-9876-5432",
  "businessHours": "10:00-21:00",
  "managerId": "manager_user_id",
  "displaySettings": {
    "resolution": "1920x1080",
    "orientation": "landscape",
    "defaultTemplate": "template_id"
  }
}
```

### 2.3 Update Store
**Endpoint:** `PUT /stores/:id`

**Permissions:** ADMIN or Store Manager

### 2.4 Delete Store
**Endpoint:** `DELETE /stores/:id`

**Permissions:** ADMIN only

---

## 3. Playlist Management API

### 3.1 Get Store Playlists
**Endpoint:** `GET /stores/:storeId/playlists`

**Permissions:** ADMIN or Store Manager

**Response:**
```json
{
  "success": true,
  "data": {
    "playlists": [
      {
        "id": "uuid",
        "name": "Morning Playlist",
        "description": "Content for morning hours",
        "status": "active",
        "isDefault": false,
        "loop": true,
        "totalDuration": 1800,
        "itemCount": 5,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 3.2 Create Playlist
**Endpoint:** `POST /stores/:storeId/playlists`

**Permissions:** ADMIN or Store Manager

**Request Body:**
```json
{
  "name": "Evening Playlist",
  "description": "Content for evening hours",
  "isDefault": false,
  "loop": true
}
```

### 3.3 Get Playlist Items
**Endpoint:** `GET /playlists/:playlistId/items`

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "video",
        "order": 1,
        "duration": 180,
        "customSettings": {
          "volume": 80,
          "autoplay": true,
          "startTime": 0,
          "endTime": 180
        },
        "content": {
          "id": "content_uuid",
          "title": "Product Video",
          "type": "youtube",
          "url": "https://youtube.com/watch?v=xxx",
          "thumbnailUrl": "https://img.youtube.com/vi/xxx/maxresdefault.jpg"
        },
        "title": "Custom Title Override",
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "uuid",
        "type": "image",
        "order": 2,
        "duration": 30,
        "imageUrl": "https://example.com/image.jpg",
        "title": "Promotional Image"
      }
    ]
  }
}
```

### 3.4 Add Item to Playlist
**Endpoint:** `POST /playlists/:playlistId/items`

**Request Body:**
```json
{
  "type": "video",
  "contentId": "content_uuid",
  "order": 1,
  "duration": 180,
  "customSettings": {
    "volume": 80,
    "startTime": 10,
    "endTime": 170
  },
  "title": "Custom Title"
}
```

### 3.5 Update Playlist Item Order
**Endpoint:** `PATCH /playlists/:playlistId/items/reorder`

**Request Body:**
```json
{
  "items": [
    {"id": "item1_uuid", "order": 1},
    {"id": "item2_uuid", "order": 2},
    {"id": "item3_uuid", "order": 3}
  ]
}
```

### 3.6 Delete Playlist Item
**Endpoint:** `DELETE /playlist-items/:itemId`

---

## 4. Schedule Management API

### 4.1 Get Store Schedules
**Endpoint:** `GET /stores/:storeId/schedules`

**Response:**
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "uuid",
        "name": "Morning Schedule",
        "description": "9AM to 12PM content",
        "type": "daily",
        "status": "active",
        "startTime": "09:00",
        "endTime": "12:00",
        "daysOfWeek": [1, 2, 3, 4, 5],
        "validFrom": "2024-01-01",
        "validUntil": "2024-12-31",
        "priority": 1,
        "playlist": {
          "id": "playlist_uuid",
          "name": "Morning Playlist"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 4.2 Create Schedule
**Endpoint:** `POST /stores/:storeId/schedules`

**Request Body:**
```json
{
  "name": "Afternoon Schedule",
  "description": "12PM to 6PM content",
  "type": "weekly",
  "startTime": "12:00",
  "endTime": "18:00",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "validFrom": "2024-01-01",
  "validUntil": "2024-12-31",
  "priority": 2,
  "playlistId": "playlist_uuid"
}
```

### 4.3 Get Active Schedule
**Endpoint:** `GET /stores/:storeId/schedules/active`

**Description:** 현재 시간에 활성화된 스케줄 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "activeSchedule": {
      "id": "uuid",
      "name": "Current Schedule",
      "playlist": {
        "id": "playlist_uuid",
        "name": "Current Playlist",
        "items": [...]
      }
    }
  }
}
```

---

## 5. Template Management API

### 5.1 Get All Templates
**Endpoint:** `GET /templates`

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Full Screen",
        "description": "Single full screen video",
        "layout": {
          "zones": [
            {
              "id": "main",
              "name": "Main Video",
              "type": "video",
              "position": {
                "x": 0,
                "y": 0,
                "width": 100,
                "height": 100
              },
              "zIndex": 1,
              "isMain": true
            }
          ],
          "resolution": {
            "width": 1920,
            "height": 1080
          }
        },
        "status": "active",
        "isDefault": true,
        "previewImage": "https://example.com/template-preview.jpg"
      }
    ]
  }
}
```

---

## 6. Analytics API

### 6.1 Get Content Usage Statistics
**Endpoint:** `GET /analytics/content-usage`

**Permissions:** ADMIN or Store Manager (own store only)

**Query Parameters:**
- `storeId` (optional): 특정 매장 (관리자만)
- `contentId` (optional): 특정 컨텐츠
- `dateFrom` (optional): 시작 날짜 (YYYY-MM-DD)
- `dateTo` (optional): 종료 날짜 (YYYY-MM-DD)
- `groupBy` (optional): 그룹화 기준 (`day`, `week`, `month`)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlays": 1250,
    "totalDuration": 45000,
    "averagePlayDuration": 36,
    "topContents": [
      {
        "contentId": "uuid",
        "title": "Popular Video",
        "playCount": 150,
        "totalDuration": 5400
      }
    ],
    "playsByDate": [
      {
        "date": "2024-01-01",
        "plays": 45,
        "duration": 1620
      }
    ]
  }
}
```

### 6.2 Get Store Performance
**Endpoint:** `GET /analytics/store-performance`

**Permissions:** ADMIN only

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "storeId": "uuid",
        "storeName": "Downtown Store",
        "totalPlays": 500,
        "totalDuration": 18000,
        "averageSessionDuration": 36,
        "lastActivity": "2024-01-15T14:30:00Z"
      }
    ]
  }
}
```

---

## 7. Playback Control API

### 7.1 Get Current Playback Status
**Endpoint:** `GET /stores/:storeId/playback/status`

**Description:** 현재 재생 상태 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "isPlaying": true,
    "currentItem": {
      "id": "item_uuid",
      "contentId": "content_uuid",
      "title": "Current Video",
      "type": "video",
      "url": "https://youtube.com/watch?v=xxx",
      "duration": 180,
      "position": 45
    },
    "playlist": {
      "id": "playlist_uuid",
      "name": "Current Playlist"
    },
    "schedule": {
      "id": "schedule_uuid",
      "name": "Current Schedule"
    }
  }
}
```

### 7.2 Change Playback Content
**Endpoint:** `POST /stores/:storeId/playback/change`

**Description:** 현재 재생 컨텐츠 즉시 변경

**Request Body:**
```json
{
  "contentId": "new_content_uuid",
  "playlistId": "new_playlist_uuid" // optional
}
```

### 7.3 Control Playback
**Endpoint:** `POST /stores/:storeId/playback/control`

**Request Body:**
```json
{
  "action": "pause", // "play", "pause", "stop", "next", "previous"
  "position": 30 // optional: seek to position (seconds)
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "url",
      "message": "Invalid YouTube URL format"
    }
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: 입력 데이터 검증 실패
- `UNAUTHORIZED`: 인증 실패
- `FORBIDDEN`: 권한 부족
- `NOT_FOUND`: 리소스를 찾을 수 없음
- `CONTENT_APPROVAL_REQUIRED`: 컨텐츠 승인 필요
- `SCHEDULE_CONFLICT`: 스케줄 충돌
- `STORE_INACTIVE`: 매장이 비활성 상태
- `EXTERNAL_API_ERROR`: 외부 API (YouTube/Vimeo) 오류

---

## Rate Limiting
- Authentication endpoints: 5 requests per minute
- Content creation: 10 requests per minute
- Other endpoints: 100 requests per minute

## WebSocket Events (Future Implementation)
실시간 재생 상태 업데이트를 위한 WebSocket 이벤트:
- `playback:start`
- `playback:pause`
- `playback:next`
- `schedule:change`
- `playlist:update`