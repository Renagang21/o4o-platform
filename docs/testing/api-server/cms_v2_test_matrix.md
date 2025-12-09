# CMS V2 API Test Matrix

**Phase**: C-2.3
**Date**: 2025-12-04
**Environment**: Production (api.neture.co.kr)
**Auth**: JWT Bearer Token Required

---

## 🎯 Test Objectives

1. ✅ Verify all 41 CMS endpoints are operational
2. ✅ Validate CRUD operations for all entities
3. ✅ Test publishing workflows (draft → published)
4. ✅ Verify ViewRenderer JSON compatibility
5. ✅ Test public page rendering
6. ✅ Validate authentication/authorization
7. ✅ Check response formats and error handling

---

## 🔐 Prerequisites

### 1. JWT Token Generation
```bash
# Get admin JWT token
curl -X POST https://api.neture.co.kr/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@neture.co.kr",
    "password": "YOUR_PASSWORD"
  }'

# Extract token
export JWT_TOKEN="eyJhbGci..."
```

### 2. Test Data Preparation
- Sample CPT schema
- Sample field configurations
- Sample view templates (ViewRenderer compatible)
- Sample page content

---

## 📝 Test Cases

### Test Suite 1: CustomPostType (CPT) Management

#### TC-1.1: Create CPT
```bash
POST /api/v1/cms/cpts
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "slug": "blog_post",
  "name": "Blog Post",
  "description": "Blog articles and news",
  "schema": {
    "fields": [
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "type": "richtext",
        "required": true
      },
      {
        "name": "author",
        "type": "relation",
        "target": "users"
      },
      {
        "name": "publishedDate",
        "type": "datetime"
      }
    ]
  },
  "status": "active"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "blog_post",
    "name": "Blog Post",
    "status": "active",
    "createdAt": "2025-12-04T...",
    "updatedAt": "2025-12-04T..."
  }
}
```

**Validation**:
- [ ] Status code: 201 Created
- [ ] Response contains all fields
- [ ] UUID is valid format
- [ ] Timestamps are ISO 8601 format

---

#### TC-1.2: List CPTs
```bash
GET /api/v1/cms/cpts?status=active
Authorization: Bearer $JWT_TOKEN
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "blog_post",
      "name": "Blog Post",
      "status": "active",
      "createdAt": "..."
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Array contains created CPT
- [ ] Pagination metadata present

---

#### TC-1.3: Get CPT by ID
```bash
GET /api/v1/cms/cpts/:id
Authorization: Bearer $JWT_TOKEN
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Full CPT details returned
- [ ] Schema field is valid JSON

---

#### TC-1.4: Update CPT
```bash
PUT /api/v1/cms/cpts/:id
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "description": "Updated description",
  "status": "active"
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Changes are persisted
- [ ] updatedAt timestamp changed

---

#### TC-1.5: Delete CPT
```bash
DELETE /api/v1/cms/cpts/:id
Authorization: Bearer $JWT_TOKEN
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] CPT no longer appears in list
- [ ] Associated fields are handled (cascade/prevent)

---

### Test Suite 2: CustomField Management

#### TC-2.1: Create Custom Field
```bash
POST /api/v1/cms/fields
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "postTypeId": "{{cpt_id}}",
  "name": "featured_image",
  "label": "Featured Image",
  "type": "image",
  "groupName": "Media",
  "order": 1,
  "required": false,
  "config": {
    "maxSize": 5242880,
    "allowedTypes": ["image/jpeg", "image/png", "image/webp"],
    "aspectRatio": "16:9"
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "postTypeId": "uuid",
    "name": "featured_image",
    "label": "Featured Image",
    "type": "image",
    "order": 1,
    "config": {...}
  }
}
```

**Validation**:
- [ ] Status code: 201 Created
- [ ] Field linked to CPT
- [ ] Config JSON is preserved

---

#### TC-2.2: List Fields for CPT
```bash
GET /api/v1/cms/fields?postTypeId={{cpt_id}}
Authorization: Bearer $JWT_TOKEN
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Only fields for specified CPT returned
- [ ] Fields ordered by 'order' property

---

#### TC-2.3: Update Field Configuration
```bash
PUT /api/v1/cms/fields/:id
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "required": true,
  "config": {
    "maxSize": 10485760
  }
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Config merged correctly
- [ ] Changes reflected immediately

---

#### TC-2.4: Delete Field
```bash
DELETE /api/v1/cms/fields/:id
Authorization: Bearer $JWT_TOKEN
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Field removed from CPT
- [ ] Existing content handling (preserve/cascade)

---

### Test Suite 3: View Management (ViewRenderer Compatible)

#### TC-3.1: Create View Template
```bash
POST /api/v1/cms/views
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "slug": "blog_list_view",
  "name": "Blog List View",
  "description": "Grid layout for blog posts",
  "type": "page",
  "status": "active",
  "schema": {
    "version": "2.0",
    "type": "page",
    "components": [
      {
        "id": "hero-1",
        "type": "Hero",
        "props": {
          "title": "{{binding:page.title}}",
          "subtitle": "{{binding:page.subtitle}}",
          "backgroundImage": "{{binding:page.heroImage}}"
        }
      },
      {
        "id": "blog-grid-1",
        "type": "BlogGrid",
        "props": {
          "posts": "{{binding:cpt.blog_post.list}}",
          "columns": 3,
          "showExcerpt": true
        }
      }
    ],
    "bindings": [
      {
        "source": "cpt",
        "target": "blog-grid-1.props.posts",
        "query": {
          "type": "blog_post",
          "status": "published",
          "limit": 9
        }
      }
    ],
    "styles": {
      "theme": "default",
      "variables": {
        "--primary-color": "#3b82f6",
        "--grid-gap": "2rem"
      }
    }
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "blog_list_view",
    "name": "Blog List View",
    "type": "page",
    "status": "active",
    "schema": {...}
  }
}
```

**Validation**:
- [ ] Status code: 201 Created
- [ ] Schema is ViewRenderer 2.0 compatible
- [ ] Components array preserved
- [ ] Bindings array preserved

---

#### TC-3.2: Validate ViewRenderer Compatibility
```bash
GET /api/v1/cms/views/:id
Authorization: Bearer $JWT_TOKEN
```

**Validation**:
- [ ] schema.version === "2.0"
- [ ] schema.components is array
- [ ] Each component has id, type, props
- [ ] Bindings use correct source types

---

#### TC-3.3: Update View
```bash
PUT /api/v1/cms/views/:id
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "status": "active",
  "schema": {
    "version": "2.0",
    "components": [...]
  }
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Schema update preserved
- [ ] Version compatibility maintained

---

### Test Suite 4: Page Management & Publishing Workflow

#### TC-4.1: Create Draft Page
```bash
POST /api/v1/cms/pages
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "slug": "about-us",
  "title": "About Us",
  "viewId": "{{view_id}}",
  "content": {
    "heroTitle": "Welcome to Our Platform",
    "heroSubtitle": "Transforming e-commerce since 2024",
    "heroImage": "https://cdn.example.com/hero.jpg",
    "sections": [
      {
        "type": "text",
        "content": "Our mission is to..."
      }
    ]
  },
  "seo": {
    "title": "About Us - O4O Platform",
    "description": "Learn more about O4O Platform",
    "keywords": ["about", "company", "platform"],
    "ogImage": "https://cdn.example.com/og-about.jpg"
  },
  "status": "draft",
  "tags": ["company", "info"],
  "metadata": {
    "author": "admin",
    "category": "corporate"
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "about-us",
    "title": "About Us",
    "viewId": "uuid",
    "content": {...},
    "status": "draft",
    "publishedAt": null,
    "currentVersion": 1,
    "createdAt": "..."
  }
}
```

**Validation**:
- [ ] Status code: 201 Created
- [ ] status === "draft"
- [ ] publishedAt is null
- [ ] Content JSON preserved

---

#### TC-4.2: Publish Page
```bash
PUT /api/v1/cms/pages/:id/publish
Authorization: Bearer $JWT_TOKEN
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "about-us",
    "status": "published",
    "publishedAt": "2025-12-04T...",
    "currentVersion": 1
  }
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] status changed to "published"
- [ ] publishedAt timestamp set
- [ ] Version saved to versions array

---

#### TC-4.3: Schedule Page for Publishing
```bash
PUT /api/v1/cms/pages/:id/schedule
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "scheduledAt": "2025-12-05T00:00:00Z"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "scheduled",
    "scheduledAt": "2025-12-05T00:00:00Z"
  }
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] status === "scheduled"
- [ ] scheduledAt timestamp set

---

#### TC-4.4: Test Public Page Access
```bash
GET /api/v1/cms/public/page/about-us
# NO AUTH REQUIRED
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "page": {
      "id": "uuid",
      "slug": "about-us",
      "title": "About Us",
      "content": {...},
      "seo": {...},
      "publishedAt": "..."
    },
    "view": {
      "id": "uuid",
      "slug": "blog_list_view",
      "schema": {
        "version": "2.0",
        "components": [...]
      }
    }
  }
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] No authentication required
- [ ] Both page and view data returned
- [ ] View schema is ViewRenderer compatible
- [ ] Only published pages accessible

---

#### TC-4.5: Test Draft Page is Not Public
```bash
# Create a draft page with slug "test-draft"
POST /api/v1/cms/pages
{
  "slug": "test-draft",
  "title": "Test Draft",
  "status": "draft",
  ...
}

# Try to access publicly
GET /api/v1/cms/public/page/test-draft
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Page not found or not published"
}
```

**Validation**:
- [ ] Status code: 404 Not Found
- [ ] Draft pages not accessible publicly

---

#### TC-4.6: Archive Page
```bash
PUT /api/v1/cms/pages/:id/archive
Authorization: Bearer $JWT_TOKEN
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] status === "archived"
- [ ] Page removed from public access

---

#### TC-4.7: Revert to Previous Version
```bash
PUT /api/v1/cms/pages/:id/revert
Authorization: Bearer $JWT_TOKEN
Content-Type: application/json

{
  "version": 1
}
```

**Validation**:
- [ ] Status code: 200 OK
- [ ] Content reverted to specified version
- [ ] New version created in history

---

### Test Suite 5: Error Handling & Edge Cases

#### TC-5.1: Duplicate Slug Prevention
```bash
# Create first page
POST /api/v1/cms/pages
{
  "slug": "duplicate-test",
  ...
}

# Try to create second page with same slug
POST /api/v1/cms/pages
{
  "slug": "duplicate-test",
  ...
}
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Slug already exists",
  "code": "DUPLICATE_SLUG"
}
```

**Validation**:
- [ ] Status code: 409 Conflict
- [ ] Error message is clear

---

#### TC-5.2: Invalid ViewRenderer Schema
```bash
POST /api/v1/cms/views
{
  "slug": "invalid-view",
  "schema": {
    "version": "1.0",  # Wrong version
    "components": "invalid"  # Should be array
  }
}
```

**Validation**:
- [ ] Status code: 400 Bad Request
- [ ] Validation error returned
- [ ] Schema not created

---

#### TC-5.3: Unauthorized Access
```bash
# Without JWT token
GET /api/v1/cms/cpts
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Validation**:
- [ ] Status code: 401 Unauthorized

---

#### TC-5.4: Access Non-existent Resource
```bash
GET /api/v1/cms/pages/00000000-0000-0000-0000-000000000000
Authorization: Bearer $JWT_TOKEN
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Page not found",
  "code": "NOT_FOUND"
}
```

**Validation**:
- [ ] Status code: 404 Not Found

---

### Test Suite 6: Performance & Load Testing

#### TC-6.1: List Large Number of Pages
```bash
GET /api/v1/cms/pages?limit=100
Authorization: Bearer $JWT_TOKEN
```

**Validation**:
- [ ] Response time < 1000ms
- [ ] Pagination works correctly
- [ ] All fields returned

---

#### TC-6.2: Complex View Schema
```bash
# Create view with 20+ components
POST /api/v1/cms/views
{
  "schema": {
    "components": [ /* 20 components */ ]
  }
}
```

**Validation**:
- [ ] Response time < 500ms
- [ ] Large JSON handled correctly
- [ ] No data loss

---

## 📊 Test Results Template

### Summary
| Test Suite | Total | Passed | Failed | Skipped |
|------------|-------|--------|--------|---------|
| CPT Management | 5 | - | - | - |
| CustomField | 4 | - | - | - |
| View Management | 3 | - | - | - |
| Page Publishing | 7 | - | - | - |
| Error Handling | 4 | - | - | - |
| Performance | 2 | - | - | - |
| **TOTAL** | **25** | **-** | **-** | **-** |

### Failed Tests
| TC ID | Test Name | Error | Notes |
|-------|-----------|-------|-------|
| - | - | - | - |

### Performance Metrics
| Endpoint | Avg Response Time | Max Response Time |
|----------|-------------------|-------------------|
| POST /cms/cpts | - | - |
| GET /cms/cpts | - | - |
| POST /cms/pages | - | - |
| GET /cms/public/page/:slug | - | - |

---

## 🚀 Next Steps After Testing

1. **Fix any failing tests**
2. **Document API quirks/limitations**
3. **Create sample CMS data** for ViewRenderer integration
4. **Update API documentation** with actual response examples
5. **Proceed to Phase C-2.4**: ViewRenderer Integration

---

*Test Matrix Version: 1.0*
*Last Updated: 2025-12-04*
*Status: Ready for Execution*
