# WordPress i18n Error Fix - Deployment Instructions

## Problem
The production server (admin.neture.co.kr) was showing the error:
```
wp-i18n-DOK2wPpo.js:1 Uncaught ReferenceError: Cannot access 'q' before initialization
```

## Solution
We've implemented a WordPress polyfill that initializes the `window.wp` global object before any @wordpress packages are loaded.

## Deployment Steps

### On the Production Server:

1. **Pull the latest changes from GitHub:**
```bash
cd /path/to/o4o-platform
git pull origin main
```

2. **Install dependencies (if package.json changed):**
```bash
npm ci
```

3. **Build the admin-dashboard with the fix:**
```bash
npm run build --workspace=@o4o/admin-dashboard
```

4. **Deploy the new build files:**
   - The build outputs to `apps/admin-dashboard/dist/`
   - Copy or sync these files to your web server's document root
   - Example (adjust paths as needed):
```bash
rsync -av apps/admin-dashboard/dist/ /var/www/admin.neture.co.kr/
```

5. **Clear browser cache and CDN cache (if applicable):**
   - Clear any CloudFlare or other CDN caches
   - Force refresh in browser: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

## What Changed

1. **Added WordPress Polyfill** (`src/utils/wordpress-polyfill.ts`):
   - Initializes `window.wp` global object
   - Provides mock implementations for i18n, data, hooks, blocks APIs
   - Prevents "Cannot access before initialization" errors

2. **Updated Block Registration**:
   - All custom blocks now use lazy loading pattern
   - Blocks wait for `window.wp` to be available before registering
   - Affected files:
     - `src/blocks/cpt-acf-loop/index.tsx`
     - `src/blocks/group/index.tsx`
     - `src/blocks/columns/index.tsx`
     - `src/blocks/cover/index.tsx`

3. **Modified main.tsx**:
   - Calls `initWordPress()` before React app initialization
   - Ensures polyfill runs before any WordPress packages are imported

## Verification

After deployment, verify the fix:

1. Open admin.neture.co.kr in browser
2. Open browser console (F12)
3. Check for any errors
4. You should see: `[WordPress Polyfill] Initializing WordPress global objects...`
5. The wp-i18n error should be resolved

## Rollback (if needed)

If issues occur, rollback to previous version:
```bash
git revert HEAD
git push origin main
# Then rebuild and redeploy
```

## Notes

- The polyfill provides basic mock implementations that return default values
- When implementing actual multilingual support in the future, replace the mock i18n functions with real implementations
- The WordPress block editor functionality is preserved and working