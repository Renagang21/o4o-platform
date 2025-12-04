# Phase C-2 CMS Integration - Deployment Steps

## Current Status (2025-12-04)

### ✅ Completed
1. CMS Module V2 created with all entities, services, controllers
2. Routes mounted at `/api/v1/cms`
3. TypeORM entities registered
4. Database migration created

### 🔄 Next Steps

#### Step 1: Deploy Code to API Server

```bash
# On o4o-api server (SSH: ssh o4o-api)
cd /home/ubuntu/o4o-platform
git pull origin develop
pnpm install
pnpm run build
```

#### Step 2: Run Database Migration

```bash
# On o4o-api server
cd /home/ubuntu/o4o-platform/apps/api-server
NODE_ENV=production npx typeorm -d dist/database/data-source.js migration:run
```

**Expected Output**:
```
query: SELECT * FROM "typeorm_migrations" "migrations"
query: CREATE TABLE "custom_post_types" (...)
query: CREATE TABLE "custom_fields" (...)
query: CREATE TABLE "views" (...)
query: CREATE TABLE "pages" (...)
Migration CreateCMSTablesV2_1733302800000 has been executed successfully.
```

#### Step 3: Restart API Server

```bash
npx pm2 restart o4o-api-server
npx pm2 logs o4o-api-server --lines 50
```

#### Step 4: Verify Migration

```bash
# Check if tables were created
npx pm2 logs | grep "CMS routes mounted"

# Test CMS endpoints
curl -X GET https://api.neture.co.kr/api/v1/cms/cpts \
  -H "Authorization: Bearer <your-token>"
```

## Migration Details

### Tables Created
1. **custom_post_types** - CPT definitions with schema
2. **custom_fields** - ACF field definitions
3. **views** - ViewRenderer V2 compatible templates
4. **pages** - Page content with versioning & publishing

### Endpoints Available
- `POST /api/v1/cms/cpts` - Create CPT
- `GET /api/v1/cms/cpts` - List CPTs
- `POST /api/v1/cms/fields` - Create Field
- `GET /api/v1/cms/fields` - List Fields
- `POST /api/v1/cms/views` - Create View
- `GET /api/v1/cms/views` - List Views
- `POST /api/v1/cms/pages` - Create Page
- `GET /api/v1/cms/pages` - List Pages
- `GET /api/v1/cms/public/page/:slug` - Get Published Page (no auth)

## Known Issues

### Local Migration Issue
- Cannot run migrations locally due to entity metadata errors (pre-existing)
- Entities `RoleAssignment` and `RoleApplication` have incorrect User import paths
- **Fix**: These should be fixed in a separate PR

## Phase C-2 Remaining Tasks

### Phase C-2.3: API Testing
Test all CMS endpoints with sample data

### Phase C-2.4: ViewRenderer Integration
Create frontend components to consume CMS data

### Phase C-2.5: Admin Dashboard Integration
Build admin UI for CMS management

---
*Created: 2025-12-04*
*Status: Ready for deployment*
