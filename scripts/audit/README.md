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

- **`shortcode-registry-report.json`**
  - Machine-readable shortcode audit data

- **`block-registry-report.json`**
  - Machine-readable block audit data

## Current Status

### Blocks
- **Coverage**: 97% (32/33 registered)
- **Missing**: 1 (buttons.tsx)
- **Dangling**: 1 (slide)

### Shortcodes
- **Coverage**: 26% (16/61 registered)
- **Missing**: 47 components
- **Dangling**: 5 entries

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

1. **Immediate**: Register `buttons` block
2. **Phase 1**: Register core e-commerce shortcodes
3. **Phase 2**: Register dashboard shortcodes
4. **Phase 3**: Register admin tool shortcodes
5. **Phase 4**: Register dropshipping suite shortcodes

See `REGISTRY_AUDIT_REPORT.md` for detailed recommendations.
