# Customizer Troubleshooting Guide

Common issues, debugging methods, and solutions for the O4O Platform Customizer.

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
   - [Settings Not Saving](#settings-not-saving)
   - [Preview Not Updating](#preview-not-updating)
   - [Colors Look Different](#colors-look-different)
   - [Migration Problems](#migration-problems)
3. [Authentication Issues](#authentication-issues)
4. [API Errors](#api-errors)
5. [Performance Problems](#performance-problems)
6. [Browser Compatibility](#browser-compatibility)
7. [Debugging Tools](#debugging-tools)
8. [Getting Help](#getting-help)

---

## Quick Diagnostics

### Step 1: Check Browser Console

Open your browser console (F12) and look for errors:

**Chrome/Edge:**
1. Press F12
2. Click "Console" tab
3. Look for red error messages

**Firefox:**
1. Press F12
2. Click "Console" tab
3. Look for red error messages

**Safari:**
1. Safari → Preferences → Advanced → "Show Develop menu"
2. Develop → Show Web Inspector
3. Click "Console" tab

### Step 2: Verify Authentication

Check if you're logged in:

```javascript
// In browser console
console.log(localStorage.getItem('accessToken'));
// Should show a long token string, not null
```

### Step 3: Test API Connectivity

```javascript
// In browser console
fetch('/api/v1/customizer/scroll-to-top')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Expected:** `{success: true, data: {...}}`
**Error:** Check network tab and error message

### Step 4: Check Network Tab

1. Open DevTools (F12)
2. Go to "Network" tab
3. Refresh page or trigger action
4. Look for failed requests (red status codes)
5. Click on failed request to see details

---

## Common Issues

### Settings Not Saving

#### Symptom
You click Save but changes revert after reload or don't persist.

#### Possible Causes & Solutions

**1. Authentication Expired**

**Check:**
```javascript
// Browser console
const token = localStorage.getItem('accessToken');
if (!token || token === 'null') {
  console.log('❌ Not authenticated');
} else {
  console.log('✅ Token exists');
}
```

**Solution:**
- Log out and log back in
- Check if session expired (default: 24 hours)
- Verify token in localStorage

**2. Insufficient Permissions**

**Check:**
```javascript
// Browser console
fetch('/api/v1/customizer/scroll-to-top', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ enabled: true })
}).then(r => r.json()).then(console.log);
```

**Expected:** `{success: true, ...}`
**Error:** `{success: false, error: "Forbidden", message: "Insufficient permissions. Required: settings:write"}`

**Solution:**
- Contact admin to grant `settings:write` permission
- Verify your user role has permission (admin, editor, designer)

**3. Network Error**

**Check Network Tab:**
- Status 0 or Failed = Network issue
- Status 500 = Server error
- Status 400 = Validation error

**Solution:**
- Check internet connection
- Verify API server is running
- Check for proxy/firewall blocking requests

**4. Browser Cache**

**Solution:**
- Hard refresh: Ctrl/Cmd + Shift + R
- Clear cache: DevTools → Network tab → "Disable cache" checkbox
- Clear all site data: DevTools → Application → Clear Storage

**5. Validation Error**

**Check Console:**
Look for error message with validation details

**Solution:**
- Check data types match expected (e.g., number not string)
- Verify color format is hex (e.g., `#3b82f6`)
- Ensure values within min/max range

---

### Preview Not Updating

#### Symptom
You change settings but preview doesn't reflect changes in real-time.

#### Possible Causes & Solutions

**1. JavaScript Error**

**Check Console:**
```
Uncaught TypeError: Cannot read property 'primaryColor' of undefined
```

**Solution:**
- Refresh page
- Check if error persists
- Report error with full stack trace

**2. Preview Iframe Not Loaded**

**Check:**
```javascript
// Browser console
document.querySelector('iframe#preview-frame') ||
document.querySelector('iframe[title*="Preview"]');
// Should return an iframe element
```

**Solution:**
- Wait for iframe to load (5-10 seconds)
- Refresh page
- Check if preview URL is accessible

**3. CSS Variables Not Applying**

**Check:**
```javascript
// Browser console
getComputedStyle(document.documentElement)
  .getPropertyValue('--wp-color-primary-500');
// Should return color value like "rgb(59, 130, 246)"
```

**Solution:**
- Verify CSS is generated correctly
- Check globals.css is loaded
- Ensure no conflicting CSS overriding variables

**4. Debounce Delay**

**Expected Behavior:**
Preview updates ~300ms after you stop typing/changing

**Solution:**
- Wait a moment after making changes
- This is intentional to prevent lag
- Not an error

**5. Preview URL Incorrect**

**Check:**
```javascript
// Browser console
document.querySelector('iframe#preview-frame').src;
// Should show your site URL
```

**Solution:**
- Verify VITE_PREVIEW_URL in .env
- Check if main site is running
- Ensure CORS headers allow iframe

---

### Colors Look Different

#### Symptom
Saved colors appear different on live site vs. preview or between browsers.

#### Possible Causes & Solutions

**1. Cache Not Cleared**

**Solution:**
- Hard refresh live site: Ctrl/Cmd + Shift + R
- Clear browser cache completely
- Try incognito/private window

**2. Legacy Color Migration**

**Check:**
If you had settings before v1.0.0, colors may have been automatically migrated.

**Old → New Mapping:**
- `#0073aa` → `#3b82f6` (WordPress Blue → Tailwind Blue)
- `#ff6b6b` → `#ef4444` (Legacy Red → Tailwind Red)

**Solution:**
- This is expected behavior
- Manually change to desired color if needed
- See [Migration Guide](../../api-server/MIGRATION_GUIDE.md) for full mapping

**3. Dark Mode Override**

**Check:**
Are you in dark mode? Dark mode has separate color values.

**Solution:**
- Check `[data-theme="dark"]` CSS rules
- Verify dark mode colors in Customizer
- Test in both light and dark modes

**4. Display Calibration**

**Check:**
Different monitors/devices have different color calibration.

**Solution:**
- Test on target device/monitor
- Use hex codes to ensure consistency
- Check color contrast with accessibility tools

**5. Browser Color Management**

**Check:**
Some browsers apply color profiles differently.

**Solution:**
- Test in multiple browsers
- Use sRGB color space
- Avoid device-specific profiles

---

### Migration Problems

#### Symptom
Legacy settings not migrating correctly or missing data after migration.

#### Possible Causes & Solutions

**1. Migration Not Triggered**

**Check:**
```javascript
// Browser console
fetch('/api/v1/customizer/scroll-to-top')
  .then(r => r.json())
  .then(data => {
    console.log('Version:', data._meta?.version);
    console.log('Migrated from:', data._meta?.migratedFrom);
  });
```

**Expected:**
- `version: "1.0.0"`
- `migratedFrom: "0.0.0"` (if migrated)

**Solution:**
- Migration happens automatically on GET/PUT
- Refresh page to trigger migration
- Check server logs for migration errors

**2. Color Not Mapped**

**Symptom:**
Custom color unchanged (only 11 colors are mapped).

**Solution:**
- Only colors in mapping table are changed
- If your custom color matches a legacy color, it may change
- Manually revert if unintended
- See mapping table in [Migration Guide](../../api-server/MIGRATION_GUIDE.md)

**3. Missing Sections**

**Symptom:**
Scroll-to-top, buttons, or breadcrumbs sections are empty.

**Solution:**
- These sections are added automatically during migration
- Refresh Customizer page
- Click Save to persist
- Check API response includes these sections

**4. Validation Warnings**

**Check Server Logs:**
```
[Customizer] Migration validation warnings: [...]
```

**Solution:**
- Warnings don't block migration but indicate potential issues
- Check specific warnings in logs
- Fix manually if data seems incorrect

---

## Authentication Issues

### 401 Unauthorized

#### Symptom
API returns `{success: false, error: "Unauthorized"}`

#### Solutions

**1. Token Expired**

Check token expiration:
```javascript
// Browser console
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
const expiry = new Date(payload.exp * 1000);
console.log('Token expires:', expiry);
console.log('Expired?', expiry < new Date());
```

**Solution:**
- Log out and log back in
- Use refresh token endpoint if available
- Check token expiration time (default: 24h)

**2. Token Missing**

**Solution:**
- Verify you're logged in
- Check localStorage has `accessToken`
- Clear localStorage and re-login if corrupted

**3. Invalid Token Format**

**Check:**
```javascript
const token = localStorage.getItem('accessToken');
console.log('Token format:', token?.startsWith('eyJ') ? 'Valid JWT' : 'Invalid');
```

**Solution:**
- Re-login to get new token
- Don't manually edit token

### 403 Forbidden

#### Symptom
API returns `{success: false, error: "Forbidden", message: "Insufficient permissions"}`

#### Solutions

**1. Missing Permission**

**Check Your Role:**
- Admin Dashboard → Users → Your Profile
- Check "Permissions" section
- Look for `settings:write`

**Solution:**
- Contact administrator
- Request `settings:write` permission
- Verify role has permission (admin/editor/designer)

**2. Wrong User Role**

**Allowed Roles:**
- ✅ Admin
- ✅ Editor
- ✅ Designer
- ❌ Subscriber
- ❌ Guest

**Solution:**
- Contact admin to change role
- Use account with proper role

---

## API Errors

### 400 Bad Request

#### Symptom
`{success: false, error: "Validation failed", details: [...]}`

#### Common Validation Errors

**1. Invalid Color Format**

```json
{
  "code": "invalid_string",
  "path": ["backgroundColor"],
  "message": "Invalid hex color format"
}
```

**Solution:**
- Use 6-digit hex: `#3b82f6` ✅
- Not: `3b82f6` ❌ (missing #)
- Not: `#3b8` ❌ (too short)
- Not: `rgb(59, 130, 246)` ❌ (use hex)

**2. Wrong Data Type**

```json
{
  "code": "invalid_type",
  "path": ["threshold"],
  "message": "Expected number, received string"
}
```

**Solution:**
- Send numbers as numbers: `{"threshold": 300}` ✅
- Not strings: `{"threshold": "300"}` ❌

**3. Out of Range**

```json
{
  "code": "too_small",
  "path": ["borderRadius"],
  "message": "Number must be greater than or equal to 0"
}
```

**Solution:**
- Check min/max values in [API Reference](./API_REFERENCE.md)
- Adjust value to be within range

### 429 Too Many Requests

#### Symptom
`{success: false, error: "Too Many Requests", retryAfter: 60}`

#### Solutions

**Rate Limits:**
- GET: 100 requests / 15 minutes
- PUT: 20 requests / 15 minutes

**Solution:**
- Wait for `retryAfter` seconds
- Implement exponential backoff
- Batch updates instead of individual calls
- Cache GET responses

**Example (JavaScript):**
```javascript
async function fetchWithRetry(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.log(`Rate limited. Waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return fetchWithRetry(url, options); // Retry
  }

  return response;
}
```

### 500 Internal Server Error

#### Symptom
`{success: false, error: "Internal Server Error"}`

#### Solutions

**1. Check Server Status**

```bash
# If you have server access
curl https://your-domain.com/api/health
```

**Expected:** `{status: "ok"}`

**2. Check Server Logs**

If you're an administrator:
```bash
# API server logs
tail -f apps/api-server/logs/error.log

# Or with PM2
pm2 logs api-server
```

**3. Report Issue**

If problem persists:
- Note the exact time error occurred
- Include request details (endpoint, payload)
- Check if error is reproducible
- Contact support with details

---

## Performance Problems

### Slow Customizer Load

#### Symptom
Customizer takes >3 seconds to load.

#### Solutions

**1. Check Network Speed**

- Run speed test
- Verify >1 Mbps download speed
- Check for network congestion

**2. Large Settings File**

**Check Size:**
```javascript
// Browser console
fetch('/api/v1/customizer/scroll-to-top')
  .then(r => r.json())
  .then(data => {
    const size = JSON.stringify(data).length;
    console.log(`Settings size: ${(size / 1024).toFixed(2)} KB`);
  });
```

**Expected:** < 50 KB
**Problem:** > 200 KB

**Solution:**
- Check for bloated palette (too many custom colors)
- Remove unused settings
- Contact admin if settings are corrupted

**3. Browser Extensions**

- Disable ad blockers temporarily
- Disable extensions one by one
- Test in incognito mode (no extensions)

**4. Device Performance**

- Close other tabs/applications
- Restart browser
- Update browser to latest version
- Check device has >2GB free RAM

### Laggy Preview

#### Symptom
Preview updates slowly or stutters.

#### Solutions

**1. Reduce Debounce**

Not recommended - debounce prevents lag!

**2. Disable Animations**

Temporarily disable CSS transitions for testing:
```css
* {
  transition: none !important;
}
```

**3. Check Browser Performance**

- Open DevTools → Performance tab
- Click Record
- Make a change in Customizer
- Stop recording
- Check for bottlenecks (long tasks, layout thrashing)

---

## Browser Compatibility

### Supported Browsers

✅ **Fully Supported:**
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

⚠️ **Partial Support:**
- Chrome 80-89
- Firefox 78-87
- Safari 12-13

❌ **Not Supported:**
- Internet Explorer (any version)
- Opera Mini
- UC Browser

### Browser-Specific Issues

**Safari:**
- Color picker may look different
- Some CSS variables require `-webkit-` prefix

**Solution:** Use latest Safari version (14+)

**Firefox:**
- Shadow DOM may have rendering issues
- WebSocket connection may need manual enable

**Solution:** Enable WebSocket in `about:config`

**Mobile Browsers:**
- Touch events may not work on desktop preview
- Use actual mobile device for testing

---

## Debugging Tools

### Browser Console Commands

**Check Customizer State:**
```javascript
// Get current settings
JSON.parse(localStorage.getItem('customizer-settings-cache'));

// Get last API response
JSON.parse(localStorage.getItem('customizer-api-cache'));

// Clear cache
localStorage.removeItem('customizer-settings-cache');
localStorage.removeItem('customizer-api-cache');
location.reload();
```

**Check CSS Variables:**
```javascript
// Get all --wp-* variables
const styles = getComputedStyle(document.documentElement);
const wpVars = {};
for (let i = 0; i < document.styleSheets[0].cssRules[0].style.length; i++) {
  const prop = document.styleSheets[0].cssRules[0].style[i];
  if (prop.startsWith('--wp-')) {
    wpVars[prop] = styles.getPropertyValue(prop).trim();
  }
}
console.table(wpVars);
```

**Monitor API Calls:**
```javascript
// Intercept fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('[Fetch]', args[0], args[1]);
  return originalFetch(...args).then(r => {
    console.log('[Response]', r.status, r.url);
    return r;
  });
};
```

### Network Debugging

**Export HAR File:**
1. Open DevTools → Network tab
2. Reproduce issue
3. Right-click → Save all as HAR
4. Share HAR file with support

**Check Request Headers:**
1. Network tab
2. Click on request
3. Headers tab
4. Verify Authorization header exists

**Check Response:**
1. Network tab
2. Click on request
3. Response/Preview tab
4. Check for error messages

### Server-Side Debugging

**Enable Debug Logging:**
```bash
# In .env file
LOG_LEVEL=debug
NODE_ENV=development
```

**Check API Logs:**
```bash
# With PM2
pm2 logs api-server --lines 100

# Direct logs
tail -f apps/api-server/logs/combined.log
```

**Test API Directly:**
```bash
# Test GET
curl https://your-domain.com/api/v1/customizer/scroll-to-top

# Test PUT (with auth)
curl -X PUT \
  https://your-domain.com/api/v1/customizer/scroll-to-top \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

## Getting Help

### Before Asking for Help

**Collect This Information:**

1. **Error Message** (exact text)
2. **Steps to Reproduce**
   - What you were doing
   - What you clicked
   - What you entered
3. **Browser & Version**
   - Chrome 120.0.6099.109
   - Firefox 121.0
   - Safari 17.2
4. **Screenshots**
   - Customizer UI showing issue
   - Browser console with errors
5. **Network Logs** (HAR file if possible)
6. **Settings Version**
   ```javascript
   fetch('/api/v1/customizer/scroll-to-top')
     .then(r => r.json())
     .then(d => console.log(d._meta?.version));
   ```

### Support Channels

**Documentation:**
- [User Guide](./CUSTOMIZER_USER_GUIDE.md) - How to use Customizer
- [Developer Guide](./CUSTOMIZER_DEVELOPER_GUIDE.md) - Technical docs
- [API Reference](./API_REFERENCE.md) - API documentation
- [Migration Guide](../../api-server/MIGRATION_GUIDE.md) - Migration info

**Community:**
- **Forum:** https://community.o4o-platform.com
- **Discord:** https://discord.gg/o4o-platform
- **GitHub Issues:** https://github.com/o4o-platform/platform/issues

**Official Support:**
- **Email:** support@o4o-platform.com
- **Priority Support:** support-priority@o4o-platform.com (paid plans)

**Response Times:**
- Community: 1-48 hours
- Email: 24-48 hours
- Priority: 2-4 hours (business hours)

### Reporting Bugs

**Create a GitHub Issue:**

1. Go to https://github.com/o4o-platform/platform/issues
2. Click "New Issue"
3. Use this template:

```markdown
### Bug Description
[Clear description of the bug]

### Steps to Reproduce
1. Go to Customizer
2. Click on...
3. Enter...
4. See error

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- Browser: Chrome 120
- OS: Windows 11
- Customizer Version: 1.0.0
- User Role: Editor

### Screenshots
[Attach screenshots]

### Console Errors
```
[Paste console errors here]
```

### Additional Context
[Any other relevant information]
```

---

## FAQ

**Q: Why are my settings reverting after save?**
A: Check authentication (token expired) or permissions (need `settings:write`).

**Q: Preview shows changes but live site doesn't?**
A: Hard refresh live site (Ctrl+Shift+R) to clear cache.

**Q: Can I undo changes?**
A: Not yet - screenshot before major changes. Undo feature planned for v2.

**Q: Why did my colors change?**
A: Legacy colors (v0.0.0) are automatically migrated to modern Tailwind colors.

**Q: How do I reset to defaults?**
A: Tools → Reset → Reset All Customizer Settings (cannot be undone!).

**Q: Settings loading is slow?**
A: Check network speed and settings file size (<50KB is normal).

**Q: My custom font isn't loading?**
A: Verify font is available in Google Fonts and spelling is correct.

**Q: Can I customize mobile separately?**
A: Yes! Most settings have responsive controls for desktop/tablet/mobile.

---

## Still Stuck?

If you've tried everything and still have issues:

1. **Check Status Page:** https://status.o4o-platform.com
2. **Search Forum:** Someone may have solved your issue
3. **Ask in Discord:** Real-time help from community
4. **Email Support:** Include all info from "Before Asking for Help"

Remember: The more details you provide, the faster we can help! 🚀

---

Last Updated: 2025-10-11
