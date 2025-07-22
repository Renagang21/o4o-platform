# O4O Platform API Documentation

## Base URL
```
Production: https://api.neture.co.kr/api
Development: http://localhost:4000/api
```

## Authentication

### Overview
The API uses JWT-based authentication with httpOnly cookies and refresh tokens.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "business"
  }
}
```

### Refresh Token
```http
POST /auth/refresh
```

### Logout
```http
POST /auth/logout
```

## Vendor APIs

### Dashboard Statistics

#### Get Dashboard Stats
```http
GET /vendor/stats/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "todaySales": 2345000,
  "totalOrders": 156,
  "newOrders": 12,
  "activeProducts": 42,
  "monthSales": 15780000,
  "growthRate": 12.5
}
```

#### Get Sales Chart Data
```http
GET /vendor/stats/sales-chart?period=7d
Authorization: Bearer {token}
```

**Query Parameters:**
- `period`: `7d` | `30d` | `90d` (default: `7d`)

**Response:**
```json
[
  {
    "date": "2024-01-20",
    "sales": 1234000,
    "orders": 15
  }
]
```

### Product Management

#### List Products
```http
GET /vendor/products?page=1&limit=20&search=&category=&status=
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search term
- `category`: Category filter
- `status`: Status filter

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "sku": "SKU-001",
      "category": "Electronics",
      "price": 89000,
      "stock": 45,
      "status": "active",
      "image": "https://...",
      "sales": 234
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

#### Create Product
```http
POST /vendor/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "sku": "SKU-002",
  "price": 99000,
  "categoryId": "category-uuid",
  "inventory": {
    "quantity": 100,
    "stockStatus": "in_stock"
  },
  "images": [
    {
      "url": "https://...",
      "alt": "Product image"
    }
  ]
}
```

#### Update Product
```http
PUT /vendor/products/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 89000
}
```

#### Delete Product
```http
DELETE /vendor/products/{id}
Authorization: Bearer {token}
```

### Order Management

#### List Orders
```http
GET /vendor/orders?page=1&status=&search=
Authorization: Bearer {token}
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Order status filter
- `search`: Search term
- `startDate`: Date range start
- `endDate`: Date range end

#### Get Order Details
```http
GET /vendor/orders/{id}
Authorization: Bearer {token}
```

#### Update Order Status
```http
PUT /vendor/orders/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "shipped",
  "trackingNumber": "1234567890",
  "carrier": "CJ대한통운"
}
```

## Error Responses

### Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Internal Server Error

### Rate Limiting
- Authenticated endpoints: 100 requests per 15 minutes
- Public endpoints: 300 requests per 15 minutes

Headers:
- `X-RateLimit-Limit`: Total allowed requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## WebSocket Events

### Connection
```javascript
const socket = io('https://api.neture.co.kr', {
  withCredentials: true
});
```

### Session Events
```javascript
// Listen for session updates
socket.on('session:event', (data) => {
  console.log('Session event:', data);
});

// Join user room
socket.emit('join:user', { userId });
```

### Order Events
```javascript
// New order notification
socket.on('order:new', (order) => {
  console.log('New order received:', order);
});

// Order status update
socket.on('order:status', (data) => {
  console.log('Order status updated:', data);
});
```

## Testing

### Test Credentials
```
Vendor Account:
Email: vendor@example.com
Password: Test123!

Customer Account:
Email: customer@example.com
Password: Test123!
```

### Postman Collection
Import the Postman collection from: `/docs/postman/O4O_Platform_API.postman_collection.json`

## SDK Usage

### JavaScript/TypeScript
```typescript
import { VendorAPI } from '@o4o/sdk';

const api = new VendorAPI({
  baseURL: 'https://api.neture.co.kr',
  credentials: 'include'
});

// Get dashboard stats
const stats = await api.stats.getDashboard();

// List products
const products = await api.products.list({ page: 1 });
```