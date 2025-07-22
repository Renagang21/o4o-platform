# O4O Platform API Gateway

Enterprise-grade API Gateway for the O4O Platform, providing centralized routing, authentication, rate limiting, and service management.

## Features

### 🚀 Core Features
- **Centralized Routing**: Single entry point for all API requests
- **Service Discovery**: Automatic health checks and circuit breakers
- **Authentication**: JWT-based auth with cookie support
- **Rate Limiting**: Configurable limits with Redis backing
- **Load Balancing**: Round-robin and failover strategies
- **Request/Response Transformation**: Path rewriting and header injection
- **Metrics & Monitoring**: Service health and performance metrics
- **CORS Management**: Centralized CORS configuration

### 🔐 Security Features
- Helmet.js security headers
- JWT token validation
- Rate limiting per user/IP
- Request sanitization
- Auth forwarding to services

### 📊 Observability
- Structured logging with Winston
- Response time tracking
- Service health monitoring
- Request/response logging
- Metrics endpoint

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Clients   │────▶│  API Gateway │────▶│  Microservices  │
└─────────────┘     └──────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │    Redis     │
                    └──────────────┘
```

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start in development mode
npm run dev
```

### Production
```bash
# Build
npm run build

# Start
npm start
```

## Configuration

### Environment Variables
```env
# Server
GATEWAY_PORT=3000
NODE_ENV=development

# Services
AUTH_SERVICE_URL=http://localhost:4000
USER_SERVICE_URL=http://localhost:4000
ECOMMERCE_SERVICE_URL=http://localhost:4000

# Security
JWT_SECRET=your-secret-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100
```

### Route Configuration
Routes are defined in `src/config/gateway.config.ts`:

```typescript
{
  path: '/api/v1/products',
  service: 'ecommerce',
  methods: ['GET', 'POST'],
  auth: true,
  rateLimit: {
    windowMs: 60000,
    max: 30
  }
}
```

## API Endpoints

### Health Check
```
GET /health
```

### Metrics
```
GET /metrics
```

### Service Routes
All service routes are proxied based on configuration:
- `/api/v1/auth/*` → Auth Service
- `/api/v1/users/*` → User Service
- `/api/v1/products/*` → E-commerce Service
- `/api/v1/posts/*` → Content Service

## Middleware Chain

1. **Global Middlewares**
   - Helmet (security headers)
   - CORS
   - Compression
   - Response Time
   - Cookie Parser
   - Body Parser

2. **Request Pipeline**
   - Request Logging
   - Global Rate Limiting
   - Route-specific Rate Limiting
   - Authentication (if required)
   - Auth Forwarding
   - Service Proxy

## Service Registry

The gateway maintains a registry of all backend services with:
- Health check monitoring
- Circuit breaker pattern
- Automatic retry with exponential backoff
- Service status tracking

### Health Check Response
```json
{
  "name": "E-commerce Service",
  "status": "healthy",
  "lastCheck": "2024-01-20T10:30:00Z",
  "responseTime": 45
}
```

## Rate Limiting

### Strategies
1. **Global**: All requests
2. **Auth**: Stricter limits for auth endpoints
3. **API**: Per-user limits for authenticated requests
4. **Public**: More lenient for public endpoints

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642680000
```

## Authentication

The gateway validates JWT tokens and forwards user information to services:

### Forwarded Headers
```
X-User-Id: user123
X-User-Email: user@example.com
X-User-Role: customer
X-User-Status: active
X-Session-Id: session123
```

## Load Balancing

### Round-Robin
```typescript
// Distribute requests across healthy services
loadBalancedProxy(['service1', 'service2', 'service3'])
```

### Failover
```typescript
// Primary with fallback
fallbackProxy('primary-service', 'backup-service')
```

## Error Handling

### Error Responses
```json
{
  "error": "Service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "service": "E-commerce Service"
}
```

### Error Codes
- `NO_TOKEN`: No authentication token
- `TOKEN_EXPIRED`: JWT token expired
- `INVALID_TOKEN`: Invalid JWT token
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: Backend service down
- `BAD_GATEWAY`: Proxy error
- `GATEWAY_ERROR`: Internal gateway error

## Monitoring

### Metrics Endpoint
```json
{
  "gateway": {
    "uptime": 3600,
    "memory": { ... },
    "cpu": { ... }
  },
  "services": {
    "auth": {
      "status": "healthy",
      "lastCheck": "...",
      "responseTime": 23
    }
  },
  "routes": {
    "total": 45,
    "byService": {
      "auth": 10,
      "ecommerce": 15
    }
  }
}
```

## Development

### Adding a New Service
1. Add service config in `gateway.config.ts`
2. Define routes for the service
3. Restart gateway

### Adding a New Route
```typescript
routeManager.addRoute({
  path: '/api/v1/new-endpoint',
  service: 'new-service',
  auth: true
});
```

### Custom Middleware
```typescript
app.use('/api/v1/custom/*', customMiddleware, proxyMiddleware);
```

## Production Considerations

1. **Scaling**
   - Run multiple gateway instances
   - Use external load balancer
   - Share Redis for session/rate limiting

2. **Security**
   - Use HTTPS only
   - Rotate JWT secrets
   - Monitor rate limit violations
   - Log security events

3. **Performance**
   - Enable compression
   - Cache static responses
   - Monitor response times
   - Set appropriate timeouts

4. **Reliability**
   - Health checks every 30s
   - Circuit breakers prevent cascading failures
   - Graceful shutdown handling
   - Automatic retries with backoff

## Troubleshooting

### Service Unavailable
- Check service health: `GET /metrics`
- Verify service URL configuration
- Check network connectivity
- Review gateway logs

### Authentication Issues
- Verify JWT secret matches auth service
- Check token expiration
- Ensure cookies are forwarded
- Review auth middleware logs

### Rate Limiting
- Check current limits: Headers
- Reset specific key via Redis
- Adjust limits in config
- Monitor for abuse patterns

## License

Part of the O4O Platform - All rights reserved