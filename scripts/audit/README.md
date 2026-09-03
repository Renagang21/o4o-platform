# Registry Audit Tools

Automated integrity checking for the Block registry.

> **Shortcode 축은 은퇴했다** (`WO-O4O-SHORTCODE-DOMAIN-RETIREMENT-V1`, 2026-09-03).
> 선행 census 가 실사용 0(`RETIRE_READY`)으로 닫으면서 `@o4o/shortcodes` 패키지,
> admin shortcode 편집기, block-renderer shortcode 지원, `check-shortcode-registry.ts`,
> `verify:shortcodes` 가 모두 사라졌다. 은퇴 계약은
> `apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts` 가 고정한다.
> 아래 문서는 **block 축만** 다룬다.

## Quick Start

```bash
# Run block registry audit
npx tsx scripts/audit/check-block-registry.ts
```

## Files

### Audit Scripts
- **`check-block-registry.ts`**
  - Scans block definitions
  - Compares with registrations
  - Generates `block-registry-report.json`

### Reports
- **`REGISTRY_AUDIT_REPORT.md`**
  - Comprehensive audit findings
  - Recommendations and action items
  - Registration phase plan

The JSON report is **generated locally and git-ignored** — re-run the audit script
to recreate it. It has its own anchored `.gitignore` rule; do not replace it with a
broad `scripts/audit/*.json` pattern (that would also hide the audit script's
siblings).

Since `WO-O4O-REGISTRY-AUDIT-GENERATOR-CANONICALIZATION-V1` the output is
**environment-independent**: paths are repo-relative POSIX paths and no timestamp
is written unless you pass `--timestamp`. Two runs on the same commit produce
byte-identical files.

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
      - run: npx tsx scripts/audit/check-block-registry.ts
```

## Next Steps

1. ~~Register `buttons` block~~ — done (`o4o/buttons`, 2026-08-27).

`REGISTRY_AUDIT_REPORT.md` §2–§8 is a 2025-11-21 snapshot and is no longer
current; its header carries the up-to-date figures.
