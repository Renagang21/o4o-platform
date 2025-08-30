# Gallery Block API Server Integration Requirements

## Overview
The StandardGalleryBlock has been implemented in the admin-dashboard with full frontend functionality. This document outlines the API server endpoints and functionality needed to fully integrate the gallery block with backend services.

## Required API Endpoints

### 1. Image Upload Endpoint
**Endpoint:** `POST /api/media/upload`

**Purpose:** Handle single and multiple image uploads from the gallery block

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  ```
  {
    files: File[], // Multiple image files
    folder?: string, // Optional folder path
    metadata?: {
      alt?: string,
      caption?: string,
      description?: string
    }
  }
  ```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "unique-image-id",
      "url": "https://cdn.example.com/images/image1.jpg",
      "thumbnailUrl": "https://cdn.example.com/images/image1-thumb.jpg",
      "filename": "image1.jpg",
      "size": 1024000,
      "width": 1920,
      "height": 1080,
      "mimeType": "image/jpeg",
      "alt": "Image alt text",
      "caption": "Image caption",
      "uploadedAt": "2025-08-30T10:00:00Z"
    }
  ]
}
```

### 2. Media Library Listing
**Endpoint:** `GET /api/media/images`

**Purpose:** Retrieve list of available images for gallery selection

**Request:**
- Method: `GET`
- Query Parameters:
  ```
  page?: number (default: 1)
  limit?: number (default: 20)
  search?: string
  folder?: string
  sortBy?: 'date' | 'name' | 'size' (default: 'date')
  order?: 'asc' | 'desc' (default: 'desc')
  ```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "image-id",
        "url": "https://cdn.example.com/images/image.jpg",
        "thumbnailUrl": "https://cdn.example.com/images/image-thumb.jpg",
        "filename": "image.jpg",
        "width": 1920,
        "height": 1080,
        "size": 1024000,
        "alt": "Alt text",
        "caption": "Caption text"
      }
    ],
    "total": 100,
    "page": 1,
    "pages": 5
  }
}
```

### 3. Image Delete Endpoint
**Endpoint:** `DELETE /api/media/images/:id`

**Purpose:** Delete an image from the media library

**Request:**
- Method: `DELETE`
- URL Parameter: `id` (image ID)

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### 4. Image Update Endpoint
**Endpoint:** `PATCH /api/media/images/:id`

**Purpose:** Update image metadata (alt text, caption, etc.)

**Request:**
- Method: `PATCH`
- URL Parameter: `id` (image ID)
- Body:
  ```json
  {
    "alt": "Updated alt text",
    "caption": "Updated caption",
    "description": "Updated description"
  }
  ```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "image-id",
    "alt": "Updated alt text",
    "caption": "Updated caption",
    "description": "Updated description",
    "updatedAt": "2025-08-30T11:00:00Z"
  }
}
```

## Database Schema Requirements

### Media Table
```sql
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type VARCHAR(100),
  size BIGINT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  description TEXT,
  folder_path VARCHAR(255),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_user_id ON media(user_id);
CREATE INDEX idx_media_folder_path ON media(folder_path);
CREATE INDEX idx_media_created_at ON media(created_at);
```

## File Storage Requirements

### Storage Options
1. **Local Storage** (Development)
   - Store in `public/uploads/` directory
   - Serve through static file middleware

2. **Cloud Storage** (Production - Recommended)
   - AWS S3 or compatible service
   - CloudFlare R2 (recommended for cost-effectiveness)
   - Generate presigned URLs for uploads
   - Use CDN for serving images

### Image Processing
- Generate thumbnails (300x300px) for gallery previews
- Support responsive images with multiple sizes:
  - Thumbnail: 150x150
  - Small: 300x300
  - Medium: 768x768
  - Large: 1024x1024
  - Full: Original size
- Optimize images (compression, format conversion)
- Support WebP format for modern browsers

## Security Considerations

1. **File Validation**
   - Validate file types (accept only image formats)
   - Check file size limits (e.g., max 10MB per image)
   - Scan for malicious content

2. **Access Control**
   - Implement user authentication for upload/delete operations
   - Role-based permissions (admin, editor, viewer)
   - Rate limiting for upload endpoints

3. **Storage Security**
   - Use secure file naming (UUID or hash-based)
   - Prevent directory traversal attacks
   - Implement CORS policies for CDN

## Implementation Priority

1. **Phase 1 (MVP)**
   - Basic upload endpoint with local storage
   - Simple listing endpoint
   - Update metadata endpoint

2. **Phase 2 (Enhancement)**
   - Cloud storage integration
   - Thumbnail generation
   - Delete functionality

3. **Phase 3 (Optimization)**
   - Image optimization
   - CDN integration
   - Advanced search and filtering

## Frontend Integration Points

The StandardGalleryBlock is already prepared to integrate with these endpoints:

1. **Upload Handler** (line 150-165 in StandardGalleryBlock.tsx)
   - Currently creates blob URLs
   - Ready to integrate with upload endpoint

2. **Media Selection** (line 180-195)
   - Prepared for media library modal
   - Can integrate with listing endpoint

3. **Image Management** (line 200-250)
   - Delete functionality ready
   - Metadata update handlers in place

## Testing Requirements

1. **Unit Tests**
   - File upload validation
   - Database operations
   - Image processing functions

2. **Integration Tests**
   - Full upload flow
   - Gallery CRUD operations
   - Permission checks

3. **Performance Tests**
   - Bulk upload handling
   - Concurrent request handling
   - CDN response times

## Notes

- The frontend Gallery block is fully functional with local blob URLs
- All UI components and interactions are complete
- The block can work immediately once API endpoints are available
- Consider implementing progressive enhancement (work offline, sync when online)

---

**Document Created:** 2025-08-30
**Status:** Ready for API implementation
**Frontend Implementation:** Complete