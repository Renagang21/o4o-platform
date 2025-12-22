# Cosmetics API - Cloud Run Deployment

## Overview
Minimal standalone API for Cloud Run deployment.
Designed to avoid Windows ZIP timestamp issues.

## Directory Structure
```
cosmetics-api/
├── Dockerfile
├── .dockerignore
├── .env.example
├── package.json
├── package-lock.json
└── src/
    └── main.js
```

## Local Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev
```

## Cloud Run Deployment

### Prerequisites
1. GCP project: `neture-services`
2. Region: `asia-northeast3`
3. Cloud SQL instance: `neture-db`

### Step 1: Generate package-lock.json (Windows)
```bash
cd cloud-deploy/cosmetics-api
npm install
```

### Step 2: Deploy to Cloud Run
```bash
cd cloud-deploy/cosmetics-api

gcloud run deploy cosmetics-api \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --add-cloudsql-instances neture-services:asia-northeast3:neture-db \
  --set-env-vars "DB_HOST=/cloudsql/neture-services:asia-northeast3:neture-db,DB_NAME=neture,DB_USER=neture_admin"
```

### Step 3: Set DB Password (Secret)
```bash
# Create secret
echo -n "YOUR_PASSWORD" | gcloud secrets create db-password --data-file=-

# Update service with secret
gcloud run services update cosmetics-api \
  --region asia-northeast3 \
  --set-secrets "DB_PASSWORD=db-password:latest"
```

## Cloud SQL Connection

For Cloud Run, use Unix socket connection:
- **DB_HOST**: `/cloudsql/neture-services:asia-northeast3:neture-db`
- **DB_NAME**: `neture`
- **DB_USER**: `neture_admin`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/api/products` | GET | List products |
| `/api/products/:id` | GET | Get product by ID |
| `/api/categories` | GET | List categories |

## Troubleshooting

### ZIP Timestamp Error
If you encounter ZIP timestamp errors on Windows:
1. Ensure you're deploying from this minimal folder only
2. Don't include node_modules (will be installed during build)
3. Use `npm install` to generate fresh package-lock.json

### Cloud SQL Connection Issues
1. Verify Cloud SQL Admin API is enabled
2. Check service account has `Cloud SQL Client` role
3. Verify instance name matches exactly

## Extending the API

To add new endpoints:
1. Add route handlers in `src/main.js`
2. Create SQL tables in Cloud SQL
3. Redeploy with `gcloud run deploy`
