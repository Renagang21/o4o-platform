# Community test-data retirement

Owner-authorized companion to `WO-O4O-COMMUNITY-INDEPENDENT-SERVICE-V1`.
This is a manual operation, not an application startup task or a migration.

Run from the repository root with the pinned Node toolchain and installed dependencies.
Use an approved production DB execution environment with existing `DB_HOST`, `DB_PORT`,
`DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` bindings. The script does not load `.env`.
Do not put secret values in command arguments, logs, documents, or commits.

```bash
COMMUNITY_PURGE_ENVIRONMENT=production node scripts/maintenance/community-test-data-purge.mjs --plan
COMMUNITY_PURGE_ENVIRONMENT=production node scripts/maintenance/community-test-data-purge.mjs --apply --expected-digest=<reviewed-plan-digest>
```

Review counts and blockers from the plan before apply. A changed fingerprint or any
blocker rolls back the operation. After apply, require `applied: true` and all
`remaining` counts zero; run a fresh plan to verify. No production operation has
been executed merely by adding this tool.

The scope is the former community entity/membership/creation ledger and forums
whose organization is NULL and whose storage code is `neture`, `kpa-society`,
`pharmacy-hub`, `k-cosmetics`, `community`, or `community:%`, plus their posts,
comments, likes, bookmarks, notifications and forum memberships/requests.
Community service memberships are removed only for former entity members;
currently assigned service administrators/operators retain their service memberships.
Users, role assignments, other service memberships, business/funding forums,
shared media, legal/policy acceptance records and platform audit logs are retained.
Ads/sponsors/quick links are not selected by this forum-ledger tool.

Inbound foreign keys to rows outside the selected scope, organization-owned posts,
and detected upload references block apply for further reference review. Media
objects are never deleted by URL. The tool is not a universal content inventory;
inspect the actual production plan/schema before deciding that the cleanup is complete.
An absent expected table fails closed rather than silently skipping it.

The apply transaction locks target and referring tables and uses SERIALIZABLE
isolation. Review operational timing because these locks briefly block writes.
A lock timeout or query failure rolls back all selected deletions.

Local PostgreSQL fixture verification (port 5543, dedicated disposable database):

```bash
COMMUNITY_PURGE_TEST_SOCKET=/tmp/community-independent-pg node --test scripts/maintenance/community-test-data-purge.pg.test.mjs
```

Without the socket binding tests explicitly skip. They must execute, rather than
skip, before claiming DB verification. Never point this fixture test at production.
