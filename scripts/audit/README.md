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
  - Naming convention utilities (PascalCase ↔ snake_case).
    **The audit scripts no longer use these to guess shortcode names** — a
    filename is not a registration. Kept for callers that convert deliberately.

### Audit Scripts
- **`check-shortcode-registry.ts`**
  - Collects declared shortcode `name:` tokens
  - Resolves which of them the admin-dashboard bootstrap actually registers
  - Classifies the rest as explained gaps (`DEAD_INITIALIZER` /
    `UNMOUNTED_DEFINITION_BUNDLE`) or unexplained missing
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
- **Model**: registration is judged by **runtime reachability from the bootstrap**,
  not by file existence. The canonical key is the declared `name:` — never derived
  from a filename.
- **SSOT**: the single `globalRegistry` instance in
  `packages/shortcodes/src/registry.ts`. Both the renderer and the editor look up
  through that one instance.
- **Declared definitions**: 14
- **Runtime registered**: 5 — `preset`, `cpt_list`, `cpt_field`, `acf_field`,
  `meta_field` (bootstrap: `apps/admin-dashboard/src/utils/register-dynamic-shortcodes.ts`)
- **Explained gaps**: 9 — `social_login` / `login_form` / `oauth_login`
  (`DEAD_INITIALIZER`: `registerAuthShortcodes()` has no caller) and the 6 product
  tokens in `productShortcodes.tsx` (`UNMOUNTED_DEFINITION_BUNDLE`: outside the
  loader glob, zero importers).
- **Unexplained missing**: 0 · **Dangling**: 0
- Checker exits **0**.

The `approval_queue` / `product_shortcodes` entries earlier reported as missing
were **filename-derived names that exist nowhere in the source**. They disappeared
when the scanner switched to declared `name:` tokens. See
[`docs/checks/WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1-CHECK.md`](../../docs/checks/WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1-CHECK.md).

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
2. ~~Settle the shortcode registry SSOT~~ — done
   (`WO-O4O-SHORTCODE-REGISTRY-SSOT-AND-RUNTIME-REACHABILITY-V1`, 2026-08-27):
   `globalRegistry` is the single SSOT and audit now measures runtime reachability.
3. **Decide the fate of `registerAuthShortcodes()`.** It is a confirmed
   `DEAD_INITIALIZER` but is still re-exported from the package barrel; removing a
   public export is a shared-contract change and needs its own WO.
4. **Decide whether the product shortcode bundle should exist at all.**
   `add_to_cart` / `product_grid` are consumer-commerce surfaces, so this is a
   business-boundary call under
   [`docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md`](../../docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) —
   not an audit decision. Do not register them to make numbers look better.

`REGISTRY_AUDIT_REPORT.md` §2–§8 is a 2025-11-21 snapshot and is no longer
current; its header carries the up-to-date figures.
