# Deployment Issues - Production API Endpoints

## Current Status (as of latest commit)

### ❌ Endpoints Returning 404 in Production (but working locally)

| Endpoint | Local Status | Production Status | Issue |
|----------|-------------|-------------------|-------|
| `/v1/users/roles` | ✅ 401 (Auth) | ❌ 404 | Route exists, needs deployment |
| `/v1/users/permissions` | ✅ 401 (Auth) | ❌ 404 | Route exists, needs deployment |
| `/v1/users/statistics` | ✅ 401 (Auth) | ❌ 404 | Route exists, needs deployment |
| `/api/acf/custom-field-groups` | ✅ 500 (DB) | ❌ 404 | Route exists, needs deployment |
| `/api/vendors` | ✅ 200/500 | ❌ 404 | Route exists, needs deployment |
| `/api/vendors/pending` | ✅ 200/500 | ❌ 404 | Route exists, needs deployment |
| `/api/vendors/commissions` | ✅ 200/500 | ❌ 404 | Route exists, needs deployment |
| `/monitoring/summary` | ✅ 401 (Auth) | ❌ 404 | Route exists, needs deployment |
| `/monitoring/metrics` | ✅ 401 (Auth) | ❌ 404 | Route exists, needs deployment |

## Root Cause

**Production server is running outdated code.** All endpoints are properly configured and working locally.

## Fixes Applied (in chronological order)

1. **ACF Routes** - Fixed mounting from `/admin` to `/api/acf` (commit: cb7cf320)
2. **Monitoring Routes** - Added `/api/monitoring` mounting (commit: 5974fcd3)
3. **Payment Routes** - Added authentication middleware (commit: e1012d5e)
4. **Multiple deployment triggers** - Several empty commits to force deployment

## Manual Deployment

If automatic deployment isn't working, use the force deployment script:

```bash
./scripts/force-deploy.sh
```

Or manually trigger via GitHub CLI:

```bash
# API Server
gh workflow run deploy-api.yml --ref main -f force_deploy=true

# Admin Dashboard  
gh workflow run deploy-admin.yml --ref main -f force_deploy=true

# Main Site
gh workflow run deploy-main-site.yml --ref main -f force_deploy=true
```

## Verification Steps

1. **Test locally** (all should NOT return 404):
```bash
curl -I http://localhost:3002/v1/users/roles
curl -I http://localhost:3002/api/acf/custom-field-groups
curl -I http://localhost:3002/api/vendors
curl -I http://localhost:3002/monitoring/summary
```

2. **Check production** (currently returning 404, should be fixed after deployment):
```bash
curl -I https://api.neture.co.kr/v1/users/roles
curl -I https://api.neture.co.kr/api/acf/custom-field-groups
curl -I https://api.neture.co.kr/api/vendors
curl -I https://api.neture.co.kr/monitoring/summary
```

## Next Steps

1. **Wait for deployment** - Check GitHub Actions for status
2. **If still failing** - Use force deployment script
3. **If deployment succeeds but endpoints still 404** - Check PM2 on production server:
   - SSH into production server
   - Run `pm2 list` to check API server status
   - Run `pm2 restart api-server` if needed
   - Check logs: `pm2 logs api-server`

## Important Files

- API Routes: `/apps/api-server/src/main.ts`
- User Routes: `/apps/api-server/src/routes/v1/userRole.routes.ts`
- ACF Routes: `/apps/api-server/src/routes/acf.ts`
- Vendor Routes: `/apps/api-server/src/routes/vendor.ts`
- Monitoring Routes: `/apps/api-server/src/routes/monitoring.ts`

## Contact

If deployment issues persist, check:
1. GitHub Actions logs: https://github.com/Renagang21/o4o-platform/actions
2. Production server logs via SSH
3. PM2 status on production server