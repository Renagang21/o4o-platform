# Production Migration Standard

**Status:** Active
**Version:** 2.0
**Last Updated:** 2026-09-15

> **v2.0 (2026-09-15, WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)**
> 신규 환경의 **canonical schema bootstrap** 과 기존 운영 환경의 **incremental migration** 을 분리했다.
> 이 판에서 정정된 항목과 근거는 [§ Bootstrap / Incremental Separation](#bootstrap--incremental-separation) 과
> [§ Change Log](#change-log) 에 기록한다. 이전 판의 `migrations` 테이블 표기는 오기이며 실제 history 테이블은 `typeorm_migrations` 다.

---

## Overview

This document defines the standard process for executing database migrations in O4O Platform production environment.

---

## Migration Execution Methods

### Method 1: Automatic (CI/CD) — **RECOMMENDED**

TypeORM migrations run automatically on every deployment to `main` branch.

**How it works:**
1. Code merged to `main` branch
2. GitHub Actions builds the API image and pushes it to Artifact Registry
3. Cloud Run Job `o4o-api-migrations` executes **before** the API service is deployed
4. Migration runs: `node dist/migrate.js` (exit 1 on failure → workflow stops here).
   The job first classifies `DATABASE_STATE` (see § Bootstrap / Incremental Separation) and then
   applies **only** the incremental manifest — historical migrations are never replayed.
5. API service revision is deployed **only if migrations succeed** — on failure the previous
   serving revision stays untouched

> **Single owner.** Production migrations run **only** in this job. The API service startup does
> **not** run `runMigrations()` / `showMigrations()` and does not fall back to executing seed
> migrations directly (removed in
> WO-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1,
> 2026-09-12 — before that, service instances had applied migrations themselves 17 times in 30 days
> and swallowed 3 failures). Regression guard:
> `apps/api-server/src/__tests__/database-migration-ownership-startup-health-final-closure.spec.ts`.

**Configuration:** `.github/workflows/deploy-api.yml` — step "Run database migrations"
(placed before "Deploy to Cloud Run")

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

Local development database only. The production DB is not directly accessible from developer machines (Cloud SQL Auth Proxy or the Cloud Run `/cloudsql/...` socket only).

```bash
# Development only (isolated local PostgreSQL — never the production proxy port)
cd apps/api-server
pnpm run migration:show   # = node src/migrate.ts --status  (classify + pending, no writes)
pnpm run migration:run    # = node src/migrate.ts           (bootstrap if FRESH_EMPTY, then incremental)
```

Both scripts execute the same `src/migrate.ts` entry as the Cloud Run job; there is no second runner.

---

## Creating New Migrations

### Step 1: Generate Migration

```bash
cd apps/api-server
pnpm run migration:generate -- src/database/migrations/DescriptiveName
```

This creates a timestamped migration file in `src/database/migrations/`.

**Naming contract (enforced by `scripts/db/check-migration-contract.mjs` in CI):**

| Item | Rule |
|---|---|
| File | `src/database/migrations/<epoch13>-<PascalName>.ts` — `epoch13` = `Date.now()` at creation, **13 digits** |
| Class | `export class <PascalName><epoch13> implements MigrationInterface` |
| `name` | `name = '<PascalName><epoch13>'` — identical to the class name |
| Order | `epoch13` strictly greater than every epoch already in `INCREMENTAL_MIGRATIONS` |
| Registration | import + append to `INCREMENTAL_MIGRATIONS` in `src/database/incremental/manifest.ts` (append only) |

TypeORM orders migrations by `parseInt(name.slice(-13))`, so a non-13-digit or non-epoch suffix breaks
ordering silently (the historical `YYYYMMDDhhmmss`-style names are frozen for this reason).

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

### Step 4: Register the Expected Schema State (mandatory, lockstep)

Every incremental migration has a registered expected fingerprint in
`src/database/incremental/expected-schema-states.ts` (`EXPECTED_SCHEMA_STATES[k]` = baseline +
`INCREMENTAL_MIGRATIONS[0..k-1]`). CI (`check-migration-contract.mjs` C22 + jest) fails when the
registry and the manifest disagree, so a migration cannot be merged without its state.

1. Bootstrap an **isolated** PostgreSQL 15 database and run the full sequence:
   `DB_HOST=127.0.0.1 DB_PORT=<local> DB_USERNAME=… DB_PASSWORD=… DB_NAME=<empty db> pnpm --filter @o4o/api-server migration:run`
   (FRESH_EMPTY → bootstrap → every incremental migration). The job prints
   `POST_MIGRATION_SCHEMA_ASSERTION = FAILED` with `LIVE_FINGERPRINT = <hash> (<n> lines)` because the
   new state is not registered yet.
2. Append `{ appliedThrough: '<MigrationName>', fingerprint: '<hash>', fingerprintLineCount: <n> }`
   to `EXPECTED_SCHEMA_STATES` (append only, manifest order).
3. Re-run step 1 on a fresh isolated database: `POST_MIGRATION_SCHEMA_ASSERTION = PASS`.
4. Optional cross-check before deploy: `pnpm --filter @o4o/api-server migration:show` against a
   read-only production connection must still report `PRE_MIGRATION_SCHEMA_ASSERTION = PASS`
   for the *current* prefix (the new state is only compared after the job applies the migration).

The values are never copied from production at runtime, never regenerated by CI and never adopted
automatically on mismatch (`UNKNOWN_PARTIAL` / `POST_MIGRATION_SCHEMA_ASSERTION = FAILED` mean investigate).

### Step 5: Commit and Deploy

```bash
git add -- src/database/migrations/<epoch13>-<PascalName>.ts src/database/incremental/manifest.ts src/database/incremental/expected-schema-states.ts
git commit -m "feat(db): add migration for [description]" -- src/database/migrations/<epoch13>-<PascalName>.ts src/database/incremental/manifest.ts src/database/incremental/expected-schema-states.ts
git push origin HEAD:main
```

Merge to `main` → Migration runs automatically on deployment.

---

## Migration Architecture

### TypeORM Configuration

**Migration Config:** `src/database/migration-config.ts`

- Lightweight config (NO entity imports)
- Loads **only** `INCREMENTAL_MIGRATIONS` from `src/database/incremental/manifest.ts` (no glob)
- Compiled to `migration-config.js` by tsc
- Used by TypeORM CLI (`migration:revert`)

**API runtime (`src/database/connection.ts`)** declares `migrations: []` and `migrationsRun: false`:
the service neither loads nor runs migrations or the bootstrap.

**Why separate from main config?**
- Main config imports 60+ entities
- Causes tsup compilation failures
- Migration config only needs connection settings

### Build Process

1. `tsc` compiles migrations with decorators
2. Backup migrations folder
3. `tsup` bundles main.js (service) and migrate.js (job)
4. Restore migrations from backup

See: `.github/workflows/deploy-api.yml` — step "Build API server (bundled with tsup)"

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

Manual edits to the history table `typeorm_migrations` (INSERT / UPDATE / DELETE of rows, renaming
recorded names) are **prohibited** — see § Bootstrap / Incremental Separation. A migration that must not
run is fixed in code (or superseded by a new migration); history is never rewritten to skip it.

---

## Bootstrap / Incremental Separation

> Introduced 2026-09-15 (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1).
> Background: production `typeorm_migrations` holds 677 rows (674 distinct names, max id 678) while the
> repository holds 644 historical migration files; 30 production-only names come from deleted files, and
> replaying the repository history on an empty database fails (IR-O4O-MIGRATION-TIMESTAMP-ORDERING-HISTORY-GAP-AND-FRESH-DATABASE-REPLAY-CENSUS-V1).
> Empty databases are therefore built from a canonical schema snapshot, not from history replay.

### Components

| Component | Path | Role |
|---|---|---|
| Canonical schema snapshot | `apps/api-server/src/database/bootstrap/canonical-schema-baseline.ts` | schema-only DDL (tables · enums · sequences · constraints · indexes · functions · triggers). No data, no seed, no roles/permission rows, no GRANT/OWNER, no `IF NOT EXISTS` |
| Snapshot meta | `.../bootstrap/canonical-schema-baseline.meta.ts` | baseline version `2026-09-15-id678`, expected fingerprint + line count, last historical migration |
| State classifier | `.../bootstrap/database-state.ts` | `FRESH_EMPTY` · `BOOTSTRAPPED` · `LEGACY_ESTABLISHED` · `UNKNOWN_PARTIAL` |
| Bootstrap runner | `.../bootstrap/bootstrap-runner.ts` | one transaction: extensions → statements → fingerprint verify → marker |
| Bootstrap marker | table `o4o_schema_baselines` (`.../bootstrap/baseline-marker.ts`) | exactly one row per bootstrap; **not** a bulk INSERT of 644 names into `typeorm_migrations` |
| Incremental manifest | `apps/api-server/src/database/incremental/manifest.ts` | the only migration list loaded by the job and the CLI |
| Historical freeze | `.../incremental/historical-migrations.manifest.json` | 644 frozen (file · class · name) triples — never loaded, never renamed |
| Historical names (generated) | `.../incremental/historical-migration-names.ts` | name ∪ class of every frozen entry; used only to validate `LEGACY_ESTABLISHED` history names. Regenerated by `--write-historical`, lockstep guard C21 |
| Legacy history facts | `.../incremental/legacy-history.facts.ts` | production-only history names (30 retired files) and 3 known duplicate names, captured read-only. Guard C23 |
| Expected schema states | `.../incremental/expected-schema-states.ts` | one `{ appliedThrough, fingerprint, fingerprintLineCount }` per reachable state (baseline + each incremental prefix). Guard C22 |
| History rules | `.../bootstrap/incremental-history.ts` | contiguous-prefix rule (gap / skip / reversal / duplicate → invalid) and legacy name validation — pure functions |
| Safe error summary | `.../bootstrap/safe-db-error.ts` | redacts host / database / user / password / URL / socket path from every logged error |
| Entry point | `apps/api-server/src/migrate.ts` | classify → bootstrap or skip → incremental (each in its own transaction) |
| Contract guard | `scripts/db/check-migration-contract.mjs` (CI `ci-pipeline.yml`) | C01–C24: naming · ordering · manifest · entry-point · no-glob · no API-startup migration · names/states/facts lockstep · no connection-detail logging |
| Snapshot builder | `scripts/db/build-canonical-schema-baseline.mjs` | regenerates the snapshot from an isolated database only (never from production) |
| Isolated-PostgreSQL harness | `apps/api-server/src/__tests__/helpers/isolated-pg-classifier-harness.ts` (spec `database-state-classifier-schema-drift-and-connection-log-hardening.spec.ts`) | builds 16 real database states and checks the classifier verdicts; runs when `O4O_ISOLATED_PG_URL` points at a local PostgreSQL, otherwise prints an explicit SKIP |

### Database states and job behaviour

| `DATABASE_STATE` | Condition | Job behaviour |
|---|---|---|
| `FRESH_EMPTY` | no user objects, no history, no marker | bootstrap **EXECUTED**, then incremental |
| `BOOTSTRAPPED` | exactly one marker matching the code baseline, no legacy anchors, history = contiguous incremental prefix only, core tables present, **live fingerprint == expected state for that prefix** | bootstrap SKIPPED, incremental only |
| `LEGACY_ESTABLISHED` | no marker, all 5 anchors + last historical migration in `typeorm_migrations`, every history name ∈ historical ∪ retired facts ∪ contiguous incremental prefix (known duplicates ≤ 2), core tables present, **live fingerprint == expected state for that prefix** (production) | bootstrap SKIPPED, incremental only |
| `UNKNOWN_PARTIAL` | anything else (partial schema, drift of any column/constraint/table, marker mismatch, marker + anchors coexisting, history gap `[M2]` / skip `[M1, M3]` / reversal `[M3, M2]` / duplicate / unknown name, unregistered expected state…) | **fail-fast, exit 1** — no repair, no fallback, no DDL |

Since v2.1 the schema fingerprint is compared for **every** established database (both states, with or
without incremental migrations applied): marker, anchors and history rows prove provenance, the
fingerprint proves the schema. Comparison = sha256 **and** line count against
`EXPECTED_SCHEMA_STATES[prefixLength]`.

Expected job log for production (LEGACY_ESTABLISHED, nothing pending):

```text
Database transport: CLOUD_SQL_SOCKET
Database configuration: COMPLETE (environment production)
Database connection: SUCCESS
DATABASE_STATE = LEGACY_ESTABLISHED
CLASSIFICATION = LEGACY_ESTABLISHED
CURRENT_INCREMENTAL_PREFIX = <k> / <k>
EXPECTED_SCHEMA_STATE = <last incremental migration name>
EXPECTED_FINGERPRINT = <sha256> (<n> lines)
LIVE_FINGERPRINT = <sha256> (<n> lines)
UNKNOWN_HISTORY_NAMES = 0
PRE_MIGRATION_SCHEMA_ASSERTION = PASS
BOOTSTRAP_EXECUTION = SKIPPED
HISTORICAL_REPLAY = ZERO
INCREMENTAL_PENDING = 0
INCREMENTAL_EXECUTED = 0
POST_MIGRATION_SCHEMA_ASSERTION = PASS
MIGRATION_JOB = SUCCESS
```

`PRE_MIGRATION_SCHEMA_ASSERTION = FAILED` (state `UNKNOWN_PARTIAL`) runs nothing and exits 1.
`POST_MIGRATION_SCHEMA_ASSERTION = FAILED` after migrations is reported with
`MANUAL_INVESTIGATION_REQUIRED = YES` and `MIGRATION_JOB = FAILED`; there is **no automatic rollback**
(the applied migrations stay, the investigation decides). `--status` additionally reports
`EXPECTED_LIVE_FINGERPRINT_MATCH = YES | NO` and `DB_WRITES = 0`.

The job log never contains the DB host, port, name, user, password, socket path or a connection
string — only `Database transport: CLOUD_SQL_SOCKET | TCP`, `Database configuration: COMPLETE`,
`Database connection: SUCCESS` and `DB_X: SET | MISSING`. Errors are summarized through
`safe-db-error.ts` (guard C24, jest §8.3 test).

### Rules

1. **History table is `typeorm_migrations`** (`migrationsTableName` in every DataSource). The name `migrations` in earlier versions of this document was wrong.
2. **Never rename, renumber, edit or re-run an applied migration** (file name, class name, `name`). The historical set is frozen in `historical-migrations.manifest.json`.
3. **Never modify `typeorm_migrations` rows** (no manual INSERT / UPDATE / DELETE, no synthetic "historical" bulk INSERT).
4. **Bootstrap is for empty databases only.** Production (`LEGACY_ESTABLISHED`) is never bootstrapped, never fingerprint-repaired, never auto-ALTERed.
5. **Fail-fast.** `UNKNOWN_PARTIAL` stops the job; a fingerprint mismatch rolls the bootstrap back with no marker. No `IF NOT EXISTS` / catch-and-continue is used to hide drift.
6. **Single entry point.** Migrations and bootstrap run only through `dist/migrate.js` (job) or `src/migrate.ts` (local isolated DB). No API-startup migration, no HTTP route, no lifecycle installer, no `synchronize: true`.
7. **Snapshot regeneration** requires a new baseline version, a new expected fingerprint and a WO; it is built from an isolated database, never from production.
8. Reference seed (roles · permissions · catalogs) is **out of scope** of the bootstrap and is handled by a separate, explicit step.
9. **Expected-state lockstep.** Every incremental migration is registered in `EXPECTED_SCHEMA_STATES` with a fingerprint computed in an isolated database (Step 4 above). A fingerprint mismatch is never auto-adopted; the registry is never regenerated by CI or copied from production.
10. **History prefix rule.** The incremental names in `typeorm_migrations` must be exactly `manifest[0..k-1]` in id order; gaps, skips, reversals and duplicates are `UNKNOWN_PARTIAL`. Legacy history may contain only historical names, the explicit retired-name facts and that prefix.
11. **No connection details in logs** — anywhere in the migration path (job, CLI, deploy workflow, error dumps).

### Change Log

| Date | Change | Basis |
|---|---|---|
| 2026-09-15 | v2.1 — classifier hardening: fingerprint compared for every established state (BOOTSTRAPPED with incrementals · LEGACY_ESTABLISHED) against `EXPECTED_SCHEMA_STATES[prefix]` · contiguous incremental prefix rule · legacy history name validation (historical ∪ retired facts) · PRE/POST_MIGRATION_SCHEMA_ASSERTION · DB host/name/user removed from job logs · guard C21–C24 · isolated-PostgreSQL harness | WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1 (CHECK: `docs/checks/CHECK-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1.md`) |
| 2026-09-15 | v2.0 — bootstrap/incremental separation · `migrations`→`typeorm_migrations` · naming contract (13-digit epoch, class=name) · manifest registration · history/rename prohibition · CLI scripts route to `src/migrate.ts` | WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1 (CHECK: `docs/checks/CHECK-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1.md`) |
| 2026-09-12 | Single owner — API startup no longer runs migrations | WO-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1 |
| 2026-01-29 | v1.0 | initial |

---

## Related Documents

- [IR-O4O-MIGRATION-TIMESTAMP-ORDERING-HISTORY-GAP-AND-FRESH-DATABASE-REPLAY-CENSUS-V1](../../investigations/IR-O4O-MIGRATION-TIMESTAMP-ORDERING-HISTORY-GAP-AND-FRESH-DATABASE-REPLAY-CENSUS-V1.md) — why history replay cannot build an empty database

- [CLAUDE.md §0 환경 원칙](../../../CLAUDE.md) — Production Environment Policy
- [deploy-api.yml](../../../.github/workflows/deploy-api.yml) — CI/CD Pipeline

---

## Summary

| Method | Use Case | Access |
|--------|----------|--------|
| **CI/CD Automatic** | Normal deployments | GitHub Actions |
| **Admin API** | Urgent fixes, one-time ops | Browser + Admin auth |
| **TypeORM CLI** | Local development only | Never for production |

**Golden Rule:** Production DB is only accessible from Cloud Run. Never connect from local machines.
