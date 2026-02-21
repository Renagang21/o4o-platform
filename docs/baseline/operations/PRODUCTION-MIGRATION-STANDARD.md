# Production Migration Standard

**Status:** Active
**Version:** 1.0
**Last Updated:** 2026-01-29

---

## Overview

This document defines the standard process for executing database migrations in O4O Platform production environment.

---

## Migration Execution Methods

### Method 1: Automatic (CI/CD) — **RECOMMENDED**

TypeORM migrations run automatically on every deployment to `main` branch.

**How it works:**
1. Code merged to `main` branch
2. GitHub Actions builds and deploys API server
3. Cloud Run Job `o4o-api-migrations` executes automatically
4. Migration runs: `node dist/migrate.js`
5. Deployment proceeds only if migrations succeed

**Configuration:** `.github/workflows/deploy-api.yml` lines 339-386

**Logs:**
```bash
gcloud run jobs executions list \
  --job=o4o-api-migrations \
  --region=asia-northeast3 \
  --project=netureyoutube
```

---

### Method 2: Manual (Admin API) — **FOR URGENT FIXES**

Use when migrations need to run outside of deployment cycle.

**Steps:**

1. **Login as admin** to any service (e.g., https://glycopharm.neture.co.kr)
2. **Open browser console** (F12)
3. **Execute migration endpoint:**

```javascript
await fetch('https://api.neture.co.kr/api/v1/glycopharm/admin/migrate/add-product-fields', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

4. **Verify in Cloud Run logs:**

```bash
gcloud logs read \
  --project=netureyoutube \
  --resource-type=cloud_run_revision \
  --log-filter='resource.labels.service_name="o4o-core-api"' \
  --limit=50
```

**Current Admin Endpoints:**
- POST `/api/v1/glycopharm/admin/migrate/add-product-fields` — Add missing product columns
- POST `/api/v1/glycopharm/admin/products/activate-all` — Set all products to active

**Why this works:**
- Runs inside Cloud Run (has DB access)
- Requires admin authentication
- Logged in Cloud Run audit trail
- No firewall issues

---

### Method 3: TypeORM CLI (Local Development Only)

**⚠️ BLOCKED IN PRODUCTION**

Local development database only. Production DB (34.64.96.252) is not accessible from developer machines.

```bash
# Development only
cd apps/api-server
pnpm run migration:run
```

---

## Creating New Migrations

### Step 1: Generate Migration

```bash
cd apps/api-server
pnpm run migration:generate -- src/database/migrations/DescriptiveName
```

This creates a timestamped migration file in `src/database/migrations/`.

### Step 2: Review Generated SQL

Open the generated migration file and verify:
- SQL correctness
- Rollback logic (down method)
- No destructive changes without safeguards

### Step 3: Test Locally

```bash
# Run migration
pnpm run migration:run

# Verify
pnpm run migration:show

# Rollback if needed
pnpm run migration:revert
```

### Step 4: Commit and Deploy

```bash
git add src/database/migrations/
git commit -m "feat(db): add migration for [description]"
git push origin feature/your-branch
```

Merge to `main` → Migration runs automatically on deployment.

---

## Migration Architecture

### TypeORM Configuration

**Migration Config:** `src/database/migration-config.ts`

- Lightweight config (NO entity imports)
- Avoids bundling issues
- Compiled to `migration-config.js` by tsc
- Used by TypeORM CLI

**Why separate from main config?**
- Main config imports 60+ entities
- Causes tsup compilation failures
- Migration config only needs connection settings

### Build Process

1. `tsc` compiles migrations with decorators
2. Backup migrations folder
3. `tsup` bundles main.js (service) and migrate.js (job)
4. Restore migrations from backup

See: `.github/workflows/deploy-api.yml` lines 146-249

---

## Rollback Strategy

### Automatic Rollback

If migration fails during CI/CD:
- Deployment is aborted
- Previous version continues running
- No partial state

### Manual Rollback

If migration succeeded but caused issues:

```bash
# Via Cloud Run Job
gcloud run jobs execute o4o-api-migrations \
  --region=asia-northeast3 \
  --project=netureyoutube \
  --command="node" \
  --args="dist/migrate.js,revert" \
  --wait
```

**Note:** Add `revert` command support to `migrate.js` if needed.

---

## Security & Access Control

### Production DB Access Policy

**ALLOWED:**
- ✅ Cloud Run services (via Cloud SQL Proxy)
- ✅ Cloud Run Jobs (migrations)
- ✅ Google Cloud Console SQL Editor

**BLOCKED:**
- ❌ Developer local machines
- ❌ Direct psql connections
- ❌ Scripts running outside Cloud Run

**Why?**
- Security: Minimizes attack surface
- Audit: All DB access logged in Cloud Run
- Reliability: Consistent environment

---

## Monitoring

### Check Migration Status

```bash
# List migration executions
gcloud run jobs executions list \
  --job=o4o-api-migrations \
  --region=asia-northeast3 \
  --project=netureyoutube \
  --limit=10

# View logs for specific execution
gcloud run jobs executions logs <EXECUTION_NAME> \
  --region=asia-northeast3 \
  --project=netureyoutube
```

### Check Applied Migrations

Via Admin API endpoint (TODO: Create this):

```javascript
await fetch('https://api.neture.co.kr/api/v1/admin/migrations/status', {
  credentials: 'include'
}).then(r => r.json());
```

---

## Troubleshooting

### Migration Timeout

**Symptom:** Migration job times out after 300s

**Solution:**
1. Check migration SQL complexity
2. Add indexes before heavy data migrations
3. Split large migrations into smaller chunks

### Migration Fails but Deployment Continues

**Not possible.** CI/CD aborts deployment if migration fails.

### Need to Skip a Migration

**Don't.** Fix the migration instead.

If absolutely necessary, manually insert into `migrations` table:

```sql
INSERT INTO migrations (timestamp, name)
VALUES (1234567890123, 'DescriptiveName1234567890123');
```

---

## Related Documents

- [EXECUTE-PRODUCTION-MIGRATION.md](../../api-server/migrations-sql/EXECUTE-PRODUCTION-MIGRATION.md) — Current migration execution guide
- [CLAUDE.md Section 0.1](../../CLAUDE.md) — Production Environment Policy
- [deploy-api.yml](../../.github/workflows/deploy-api.yml) — CI/CD Pipeline

---

## Summary

| Method | Use Case | Access |
|--------|----------|--------|
| **CI/CD Automatic** | Normal deployments | GitHub Actions |
| **Admin API** | Urgent fixes, one-time ops | Browser + Admin auth |
| **TypeORM CLI** | Local development only | Never for production |

**Golden Rule:** Production DB is only accessible from Cloud Run. Never connect from local machines.
