# Registry Audit Tools

Automated integrity checking for Block and Shortcode registries.

## Quick Start

```bash
# Run shortcode registry audit
npx tsx scripts/audit/check-shortcode-registry.ts

# Run block registry audit
npx tsx scripts/audit/check-block-registry.ts
```

## Files

### Utilities
- **`../../packages/shortcodes/src/utils/shortcodeNaming.ts`**
  - Naming convention utilities (PascalCase ↔ snake_case)

### Audit Scripts
- **`check-shortcode-registry.ts`**
  - Scans shortcode components
  - Compares with registrations
  - Generates `shortcode-registry-report.json`

- **`check-block-registry.ts`**
  - Scans block definitions
  - Compares with registrations
  - Generates `block-registry-report.json`

### Reports
- **`REGISTRY_AUDIT_REPORT.md`**
  - Comprehensive audit findings
  - Recommendations and action items
  - Registration phase plan

Both JSON reports are **generated locally and git-ignored** — re-run the matching
audit script to recreate one. Each has its own anchored `.gitignore` rule; do not
replace them with a broad `scripts/audit/*.json` pattern (that would also hide the
audit scripts' siblings).

Since `WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1` the output is
**environment-independent**: paths are repo-relative POSIX paths and no timestamp
is written unless you pass `--timestamp`. Two runs on the same commit produce
byte-identical files.

- **`shortcode-registry-report.json`**
  - Machine-readable shortcode audit data
  - Generated, git-ignored

- **`block-registry-report.json`**
  - Machine-readable block audit data
  - Generated, git-ignored

## Current Status

Last measured 2026-08-27 (`WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1`).

### Blocks
- **Coverage**: 100% (33/33 registered)
- **Missing**: 0
- **Dangling**: 0
- Checker exits **0**.

### Shortcodes
- **Coverage**: 100% of the axis this scanner can verify (3/3 registered)
- **Missing**: 2 (`approval_queue`, `product_shortcodes`)
- **Dangling**: 0
- Checker exits **1** on the 2 missing entries.

Those 2 are **not defects in the registry this scanner reads**. They belong to the
admin-dashboard lazy-loader axis (`src/utils/shortcode-loader.ts`), whose single
source of truth is not yet settled — deliberately left open for a follow-up WO
rather than closed with placeholder registrations. See
[`docs/checks/WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1-CHECK.md`](../../docs/checks/WO-O4O-REGISTRY-AUDIT-MISSING-AND-DANGLING-CLOSURE-V1-CHECK.md).

## Usage Examples

### Running Audits in CI

```yaml
# .github/workflows/registry-check.yml
name: Registry Integrity Check

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - run: npm install
      - run: npx tsx scripts/audit/check-shortcode-registry.ts
      - run: npx tsx scripts/audit/check-block-registry.ts
```

### Using Naming Utility

```typescript
import { toShortcodeName, fromShortcodeName, fileNameToShortcodeName } from '@o4o/shortcodes/utils/shortcodeNaming';

// Convert PascalCase to snake_case
toShortcodeName("SellerDashboardShortcode") // → "seller_dashboard"

// Convert snake_case to PascalCase
fromShortcodeName("seller_dashboard") // → "SellerDashboardShortcode"

// Extract from filename
fileNameToShortcodeName("ProductGrid.tsx") // → "product_grid"
```

## Next Steps

1. ~~Register `buttons` block~~ — done (`o4o/buttons`, 2026-08-27).
2. **Settle the shortcode registry SSOT.** Three registration mechanisms coexist
   (`packages/shortcodes` `registerShortcode`, the admin-dashboard
   `import.meta.glob` lazy loader, and a plain `adminShortcodes` component map),
   and `registerAuthShortcodes()` currently has no caller. Until that is decided,
   do not add registrations to make the checker exit 0.

`REGISTRY_AUDIT_REPORT.md` §2–§8 is a 2025-11-21 snapshot and is no longer
current; its header carries the up-to-date figures.
