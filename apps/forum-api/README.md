# App API Reference

> O4O Platform App API Reference Implementation

This is the **template for all App API servers** in the O4O Platform.
When creating a new App API, copy this directory and modify as needed.

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## Structure

```
apps/app-api-reference/
├── src/
│   ├── config/
│   │   └── env.ts           # Environment configuration
│   ├── middleware/
│   │   └── auth.middleware.ts  # Core API auth delegation
│   ├── routes/
│   │   ├── health.routes.ts    # Health check endpoints
│   │   └── api.routes.ts       # API endpoints
│   └── main.ts              # Entry point
├── Dockerfile               # Cloud Run deployment
├── package.json
└── tsconfig.json
```

## Key Principles

1. **Authentication Delegation**: All auth is handled by Core API
2. **No Core DB Access**: Use Core API endpoints only
3. **Health Endpoints**: `/health` and `/health/ready` are mandatory
4. **Cloud Run Compatible**: Works in Cloud Run environment

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Liveness check |
| `/health/ready` | GET | No | Readiness check |
| `/api/v1/me` | GET | Yes | Current user |
| `/api/v1/public/info` | GET | No | Service info |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment |
| `PORT` | No | 3100 | Server port |
| `CORE_API_URL` | Yes (prod) | http://localhost:4000 | Core API URL |

## Creating a New App API

1. Copy this directory: `cp -r apps/app-api-reference apps/my-new-api`
2. Update `package.json` name
3. Modify routes for your domain
4. Update Dockerfile if needed
5. Deploy to Cloud Run

## Reference

- [app-api-architecture.md](../../docs/_platform/app-api-architecture.md)
- [core-boundary.md](../../docs/_platform/core-boundary.md)
- [CLAUDE.md](../../CLAUDE.md)
