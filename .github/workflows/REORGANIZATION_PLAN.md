# GitHub Actions Reorganization Plan

**Quick Reference Guide for Implementation**

---

## Current vs Proposed Structure

### BEFORE (Current)
```
.github/workflows/
├── main.yml                    (155 lines) - CI pipeline
├── codeql.yml                  (44 lines)  - Security
├── deploy-admin.yml            (212 lines) - Deploy admin
├── deploy-api.yml              (136 lines) - Deploy API
├── deploy-main-site.yml        (134 lines) - Deploy main site
├── deploy-nginx.yml            (89 lines)  - Deploy nginx
├── pr-size-labeler.yml         (71 lines)  - PR automation
├── setup-labels.yml            (72 lines)  - Label setup
├── setup-pnpm.yml              (36 lines)  - UNUSED reusable
├── README.md                   (95 lines)
└── README-CI-CD.md             (107 lines)

Total: 9 workflows, 949 lines, 2 READMEs
```

### AFTER (Proposed)
```
.github/workflows/
├── ci/
│   ├── main.yml               - Quality checks, tests, builds
│   └── security.yml           - CodeQL security analysis
│
├── deploy/
│   ├── admin.yml              - Deploy admin dashboard
│   ├── api.yml                - Deploy API server (fix SSH)
│   ├── main-site.yml          - Deploy main site
│   └── nginx.yml              - Deploy nginx configs
│
├── automation/
│   ├── pr-labeler.yml         - Auto-label PRs by size
│   └── repo-setup.yml         - Setup repository labels
│
├── shared/
│   ├── setup-node-pnpm.yml    - Reusable Node+pnpm setup
│   └── build-packages.yml     - Reusable package build (NEW)
│
└── README.md                   - Consolidated docs

Total: 11 workflows (~800 lines), 1 README
```

---

## Critical Issues to Fix

### 🔴 Issue 1: Inconsistent Package Build Order

**Problem:**
- `deploy-admin.yml` lists individual build commands
- Other workflows use `build:packages` script
- Risk of missing dependencies or wrong order

**Current (deploy-admin.yml lines 52-63):**
```yaml
- name: Build packages (required before building apps)
  if: steps.check_changes.outputs.deploy == 'true'
  run: |
    echo "🔨 Building shared packages..."
    pnpm run build:types
    pnpm run build:auth-client
    pnpm run build:utils
    pnpm run build:ui
    pnpm run build:auth-context
    pnpm run build:shortcodes
    pnpm run build:block-renderer
    echo "✅ All packages built successfully"
```

**Should be:**
```yaml
- name: Build packages (required before building apps)
  if: steps.check_changes.outputs.deploy == 'true'
  run: |
    echo "🔨 Building shared packages..."
    pnpm run build:packages
    echo "✅ All packages built successfully"
```

**Why:**
- Missing `build:slide-app`
- If order changes in package.json, must update here too
- DRY principle violated

---

### 🔴 Issue 2: API Deployment SSH Failures

**Problem:**
From README-CI-CD.md:
> deploy-api.yml (비활성화됨)
> - 이유: SSH 연결 타임아웃

**Current State:**
- Workflow exists and is "active"
- But doesn't work reliably
- Manual deployment required

**Solutions:**

**Option A: Add SSH Retry Logic**
```yaml
- name: Wait for SSH availability
  run: |
    echo "🔌 Testing SSH connection..."
    for i in {1..5}; do
      if nc -zv ${{ secrets.API_HOST }} 22 2>&1; then
        echo "✅ SSH is available"
        exit 0
      fi
      echo "⏳ Waiting for SSH... attempt $i/5"
      sleep 10
    done
    echo "❌ SSH connection failed after 5 attempts"
    exit 1
```

**Option B: Disable with Clear Documentation**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    # DISABLED: SSH connectivity issues with API server
    # Use manual deployment: ./scripts/deploy-api-local.sh
    if: false
```

**Option C: Webhook-Based Deployment (Future)**
- Add webhook endpoint to API server
- GitHub webhook triggers local deployment
- No SSH required

---

### 🔴 Issue 3: Missing Concurrency Control in main.yml

**Problem:**
- Multiple CI runs can execute simultaneously
- Wastes GitHub Actions minutes
- Risk of cache conflicts

**Current:**
```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
```

**Should be:**
```yaml
name: CI Pipeline

concurrency:
  group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
```

---

### 🟡 Issue 4: Unused Reusable Workflow

**Problem:**
- `setup-pnpm.yml` exists but no workflow uses it
- All workflows duplicate setup logic instead

**Current Setup (repeated 4+ times):**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22.18.0'

- name: Install pnpm
  run: npm install -g pnpm

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**Solution:**
Update `setup-pnpm.yml` and use it everywhere:

```yaml
# .github/workflows/shared/setup-node-pnpm.yml
name: Setup Node & pnpm

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22.18.0'
      pnpm-version:
        type: string
        default: '9'

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ inputs.pnpm-version }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'pnpm'
          cache-dependency-path: '**/pnpm-lock.yaml'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
```

**Then in other workflows:**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node & pnpm
        uses: ./.github/workflows/shared/setup-node-pnpm.yml
        with:
          pnpm-version: '9'
```

---

## Step-by-Step Implementation

### Phase 1: Critical Fixes (Do First - 2-3 days)

#### Step 1.1: Fix deploy-admin.yml Build Order
```bash
# 1. Create backup
cp .github/workflows/deploy-admin.yml .github/workflows/deploy-admin.yml.backup

# 2. Edit deploy-admin.yml
# Replace lines 52-63 with:
# run: pnpm run build:packages

# 3. Commit
git add .github/workflows/deploy-admin.yml
git commit -m "fix(workflows): Use build:packages script in deploy-admin

- Replaces individual build commands with build:packages script
- Ensures correct build order from package.json
- Includes missing build:slide-app step
- Reduces maintenance burden"

# 4. Test deployment
git push origin main
# Monitor deployment at: https://github.com/YOUR_ORG/o4o-platform/actions
```

#### Step 1.2: Fix API Deployment SSH
```bash
# Option B (Recommended for now): Disable with documentation
# Edit deploy-api.yml, add after line 26:
#   if: false  # Disabled: SSH connectivity issues

git add .github/workflows/deploy-api.yml
git commit -m "fix(workflows): Disable deploy-api due to SSH issues

- SSH connectivity timeouts prevent automated deployment
- Use manual deployment: ./scripts/deploy-api-local.sh
- TODO: Investigate webhook-based deployment alternative"
```

#### Step 1.3: Add Concurrency Control
```bash
# Edit main.yml, add after line 2:
# concurrency:
#   group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
#   cancel-in-progress: true

git add .github/workflows/main.yml
git commit -m "fix(workflows): Add concurrency control to CI pipeline

- Prevents duplicate CI runs for same branch/PR
- Cancels in-progress runs when new commits pushed
- Reduces wasted Actions minutes"
```

---

### Phase 2: Reusable Workflows (Medium Priority - 3-4 days)

#### Step 2.1: Create Reusable Package Build
```bash
# Create new file: .github/workflows/shared/build-packages.yml
mkdir -p .github/workflows/shared

cat > .github/workflows/shared/build-packages.yml << 'EOF'
name: Build Packages

on:
  workflow_call:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build all packages in correct order
        run: pnpm run build:packages

      - name: Verify critical dist directories
        run: |
          echo "🔍 Verifying package builds..."
          for pkg in types auth-client utils ui auth-context shortcodes block-renderer slide-app; do
            if [ ! -d "packages/$pkg/dist" ]; then
              echo "❌ packages/$pkg/dist not found!"
              exit 1
            fi
            echo "✅ packages/$pkg/dist exists"
          done
EOF

git add .github/workflows/shared/build-packages.yml
git commit -m "feat(workflows): Add reusable package build workflow"
```

#### Step 2.2: Update setup-pnpm.yml
```bash
# Move to shared/
git mv .github/workflows/setup-pnpm.yml .github/workflows/shared/setup-node-pnpm.yml

# Update content (see "Issue 4" above)
# Then commit
git add .github/workflows/shared/setup-node-pnpm.yml
git commit -m "feat(workflows): Convert to reusable setup workflow"
```

#### Step 2.3: Update Workflows to Use Reusable Setup
```bash
# Update deploy-admin.yml
# Replace lines 36-50 with call to reusable workflow
# (This requires restructuring - see full example in ANALYSIS_REPORT.md)

# Update deploy-main-site.yml
# Update main.yml
# Test each one individually
```

---

### Phase 3: Reorganization (Lower Priority - 3-4 days)

#### Step 3.1: Create Directory Structure
```bash
cd .github/workflows
mkdir -p ci deploy automation shared
```

#### Step 3.2: Move Files (Git-tracked)
```bash
# CI workflows
git mv main.yml ci/
git mv codeql.yml ci/security.yml

# Deploy workflows
git mv deploy-admin.yml deploy/admin.yml
git mv deploy-api.yml deploy/api.yml
git mv deploy-main-site.yml deploy/main-site.yml
git mv deploy-nginx.yml deploy/nginx.yml

# Automation
git mv pr-size-labeler.yml automation/pr-labeler.yml
git mv setup-labels.yml automation/repo-setup.yml

# Shared (already moved in Phase 2)
# setup-node-pnpm.yml and build-packages.yml

# Commit all moves at once
git commit -m "refactor(workflows): Reorganize into subdirectories

- ci/: Quality checks and security
- deploy/: Deployment workflows
- automation/: PR and repo automation
- shared/: Reusable workflow components

This improves discoverability and maintenance."
```

#### Step 3.3: Update Documentation
```bash
# Merge README.md + README-CI-CD.md
cat README.md > NEW_README.md
echo "" >> NEW_README.md
echo "---" >> NEW_README.md
echo "" >> NEW_README.md
cat README-CI-CD.md >> NEW_README.md

# Edit to remove duplication, reorganize
# Then:
mv NEW_README.md README.md
git rm README-CI-CD.md
git add README.md
git commit -m "docs(workflows): Consolidate workflow documentation"
```

#### Step 3.4: Environment Variables to Secrets
```bash
# Add secrets via GitHub UI or CLI
gh secret set VITE_API_URL --body "https://api.neture.co.kr/api/v1"
gh secret set VITE_PUBLIC_APP_ORIGIN --body "https://neture.co.kr"

# Update workflows to use secrets instead of hardcoded values
# In deploy-admin.yml and deploy-main-site.yml:
# Replace:
#   VITE_API_URL=https://api.neture.co.kr/api/v1
# With:
#   VITE_API_URL=${{ secrets.VITE_API_URL }}

git add .github/workflows/deploy/admin.yml .github/workflows/deploy/main-site.yml
git commit -m "security(workflows): Move env vars to GitHub secrets"
```

---

## Testing Checklist

After each phase, verify:

### Phase 1 Testing
- [ ] deploy-admin workflow succeeds
- [ ] Build output includes all packages
- [ ] Admin dashboard deploys correctly
- [ ] Version.json is updated
- [ ] Nginx config is applied

### Phase 2 Testing
- [ ] Reusable setup workflow can be called
- [ ] Package build workflow produces correct artifacts
- [ ] All dist directories exist
- [ ] No build errors

### Phase 3 Testing
- [ ] All workflows appear in Actions tab
- [ ] Workflows trigger on correct events
- [ ] Path filters still work correctly
- [ ] Manual triggers work
- [ ] Scheduled runs work (CodeQL)

---

## Rollback Procedures

### If Phase 1 Breaks Deployment:
```bash
# Revert specific commit
git revert <commit-hash>
git push origin main

# Or restore from backup
cp .github/workflows/deploy-admin.yml.backup .github/workflows/deploy-admin.yml
git add .github/workflows/deploy-admin.yml
git commit -m "revert: Restore deploy-admin to working state"
git push origin main
```

### If Phase 2 Breaks CI:
```bash
# Revert the reusable workflow changes
git revert <commit-hash>
git push origin main

# Or restore inline setup
# Edit affected workflows to restore inline setup steps
```

### If Phase 3 Breaks Workflows:
```bash
# Move files back
cd .github/workflows
git mv ci/main.yml ./
git mv ci/security.yml codeql.yml
git mv deploy/*.yml ./
git mv automation/*.yml ./
git commit -m "revert: Restore flat workflow structure"
git push origin main
```

---

## Quick Commands Reference

### View Workflow Status
```bash
# List all workflows
gh workflow list

# View specific workflow
gh workflow view "Deploy Admin Dashboard"

# Watch live run
gh run watch

# View logs for failed run
gh run view <run-id> --log-failed
```

### Manual Deployment
```bash
# Trigger workflow manually
gh workflow run deploy-admin.yml

# Admin dashboard (manual script)
./scripts/deploy-admin-manual.sh

# API server (local only)
./scripts/deploy-api-local.sh

# Main site (SSH to web server)
ssh o4o-web
cd /home/ubuntu/o4o-platform
./scripts/deploy-main-site.sh
```

### Verify Deployment
```bash
# Check version deployed
curl -s https://admin.neture.co.kr/version.json | jq
curl -s https://neture.co.kr/version.json | jq

# Health check
curl -s https://api.neture.co.kr/api/health | jq
```

---

## Estimated Timeline

| Phase | Tasks | Estimated Time | Risk Level |
|-------|-------|----------------|------------|
| Phase 1 | Critical fixes (build order, SSH, concurrency) | 2-3 days | 🔴 High |
| Phase 2 | Reusable workflows | 3-4 days | 🟡 Medium |
| Phase 3 | Reorganization + docs | 3-4 days | 🟢 Low |
| **Total** | **Complete reorganization** | **2-3 weeks** | - |

**Recommendation:** Can stop after Phase 1 if time-constrained. Phases 2-3 are optimizations.

---

## Success Metrics

### Before
- Workflows: 9 (1 unused)
- Lines: 949
- Duplication: 4 setup blocks
- Hardcoded vars: 2 workflows
- Concurrency control: 4/9 workflows

### After Phase 1
- Workflows: 9 (1 disabled)
- Lines: ~940
- Duplication: 4 setup blocks
- Hardcoded vars: 2 workflows
- Concurrency control: 5/9 workflows
- **Build order consistency: ✅ Fixed**

### After Phase 2
- Workflows: 11 (2 reusable)
- Lines: ~850
- Duplication: 0 setup blocks
- Hardcoded vars: 2 workflows
- Concurrency control: 5/9 workflows
- **Reusable workflows: ✅ Implemented**

### After Phase 3
- Workflows: 11 (organized)
- Lines: ~800
- Duplication: 0
- Hardcoded vars: 0
- Concurrency control: 9/9 workflows
- **Organization: ✅ Complete**

---

## Questions & Answers

### Q: Will subdirectories break workflow triggers?
A: No, GitHub Actions supports subdirectories. Workflows are discovered recursively.

### Q: Can we test workflows before merging to main?
A: Yes, push to a feature branch and workflows will run (for those triggered on push/PR).

### Q: What if deploy-api.yml SSH issues get resolved?
A: Simply remove `if: false` condition and test with workflow_dispatch first.

### Q: Will this affect running workflows?
A: No, running workflows complete with their original code. Changes affect new runs only.

### Q: How do we handle multiple environments (dev/staging/prod)?
A: Future enhancement. Can use workflow inputs or environment-specific workflows.

---

## Next Steps

1. **Review this plan** with team
2. **Create feature branch** for changes
3. **Implement Phase 1** (critical fixes)
4. **Test thoroughly** on feature branch
5. **Deploy to production** (merge to main)
6. **Monitor deployments** for 1 week
7. **Decide on Phase 2/3** based on results

---

**Related Documents:**
- Full analysis: `ANALYSIS_REPORT.md`
- Current docs: `README.md`, `README-CI-CD.md`
- Scripts: `/scripts/deploy-*.sh`, `/scripts/ci-*.sh`

**Contact:** See repository maintainers for questions.

---

*Last Updated: 2025-10-31*
