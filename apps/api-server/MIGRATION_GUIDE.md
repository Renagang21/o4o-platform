# Customizer Settings Migration Guide

## Overview

The O4O Platform Customizer has been upgraded from a legacy structure (v0.0.0) to a unified token system (v1.0.0). This guide explains the migration process and how it affects your data.

---

## What Changed?

### Version System

- **Legacy (v0.0.0)**: No version tracking, inconsistent naming, WordPress-legacy colors
- **Current (v1.0.0)**: Version tracking, unified naming, Tailwind-based colors, new General sections

### New Sections

Three new sections were added in v1.0.0:

1. **scrollToTop**: Scroll-to-top button settings
2. **buttons**: Button style variants (primary, secondary, outline, text)
3. **breadcrumbs**: Breadcrumb navigation settings

### Color Palette Update

Legacy WordPress colors have been mapped to modern Tailwind colors:

| Legacy Color | New Color | Description |
|--------------|-----------|-------------|
| `#0073aa` | `#3b82f6` | Primary Blue (WordPress → Tailwind Blue 500) |
| `#005177` | `#2563eb` | Primary Dark Blue (→ Tailwind Blue 600) |
| `#ff6b6b` | `#ef4444` | Secondary Red (→ Tailwind Red 500) |
| `#e74c3c` | `#dc2626` | Dark Red (→ Tailwind Red 600) |
| `#4ecdc4` | `#14b8a6` | Teal (→ Tailwind Teal 500) |
| `#00d2d3` | `#06b6d4` | Cyan (→ Tailwind Cyan 500) |
| `#f7b731` | `#f59e0b` | Orange (→ Tailwind Amber 500) |
| `#5f27cd` | `#8b5cf6` | Purple (→ Tailwind Violet 500) |
| `#ff9ff3` | `#f0abfc` | Pink (→ Tailwind Pink 300) |
| `#54a0ff` | `#60a5fa` | Light Blue (→ Tailwind Blue 400) |
| `#48dbfb` | `#38bdf8` | Sky Blue (→ Tailwind Sky 400) |

**Note**: Custom colors not in this table are preserved as-is.

---

## Automatic Migration

### When Does Migration Happen?

Migration is **automatic and transparent**:

1. **On Read (GET)**: When you fetch settings via API, migration is applied if needed
2. **On Write (PUT)**: When you save settings, migration is applied before saving

### How It Works

1. **Version Detection**: System detects if settings are legacy (v0.0.0) or current (v1.0.0)
2. **Color Mapping**: All legacy colors are automatically updated to new palette
3. **Missing Sections**: New sections (scrollToTop, buttons, breadcrumbs) are added with defaults
4. **Metadata**: `_meta` field is created with version, timestamps, and migration info

### Example

**Before (Legacy):**
```json
{
  "colors": {
    "primaryColor": "#0073aa",
    "linkColor": {
      "normal": "#0073aa",
      "hover": "#005177"
    }
  }
}
```

**After (Migrated to v1.0.0):**
```json
{
  "colors": {
    "primaryColor": "#3b82f6",
    "linkColor": {
      "normal": "#3b82f6",
      "hover": "#2563eb"
    }
  },
  "scrollToTop": {
    "enabled": true,
    "displayType": "both",
    "threshold": 300,
    "backgroundColor": "#3b82f6",
    "iconColor": "#ffffff",
    "position": "right"
  },
  "buttons": {
    "primary": {
      "backgroundColor": "#3b82f6",
      "textColor": "#ffffff",
      ...
    }
  },
  "breadcrumbs": {
    "enabled": true,
    "position": "below-header",
    ...
  },
  "_meta": {
    "version": "1.0.0",
    "lastModified": "2025-10-11T12:00:00Z",
    "isDirty": false,
    "migratedFrom": "0.0.0",
    "migrationDate": "2025-10-11T12:00:00Z"
  }
}
```

---

## API Changes

### Endpoints

All endpoints now support automatic migration:

- `GET /api/v1/customizer/scroll-to-top` (public)
- `PUT /api/v1/customizer/scroll-to-top` (authenticated)
- `GET /api/v1/customizer/button-settings` (public)
- `PUT /api/v1/customizer/button-settings` (authenticated)
- `GET /api/v1/customizer/breadcrumbs-settings` (public)
- `PUT /api/v1/customizer/breadcrumbs-settings` (authenticated)

### Response Format

All endpoints return data in this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Handling

**Validation Errors (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "path": ["enabled"],
      "message": "Expected boolean, received string"
    }
  ]
}
```

**Server Errors (500):**
```json
{
  "success": false,
  "error": "Failed to update settings",
  "message": "Database connection error"
}
```

---

## Frontend Integration

### Hooks Updated

Three hooks have been updated to use new API endpoints:

1. **useScrollToTopSettings**: `/api/v1/customizer/scroll-to-top`
2. **useButtonSettings**: `/api/v1/customizer/button-settings`
3. **useBreadcrumbsSettings**: `/api/v1/customizer/breadcrumbs-settings`

### Response Handling

Hooks now handle the new response format:

```typescript
const result = await response.json();

if (result.success && result.data) {
  setSettings(result.data);
} else {
  // Use defaults
  setSettings(defaultSettings);
}
```

---

## Data Integrity

### Deep Merge

When updating settings, **deep merge** is used to prevent data loss:

```typescript
// Existing settings
const existing = {
  enabled: true,
  displayType: 'both',
  threshold: 300
};

// User update (partial)
const update = {
  enabled: false
};

// Result after deep merge
const result = {
  enabled: false,        // Updated
  displayType: 'both',   // Preserved
  threshold: 300         // Preserved
};
```

### Validation

After migration, settings are validated:

- Required sections exist
- Color formats are valid (hex)
- _meta field is complete

Validation warnings are logged but don't block the migration.

---

## Troubleshooting

### Colors Not Updating

**Symptom**: Colors still show legacy values

**Solution**: Clear browser cache and reload. Migration happens on next API call.

### Missing Sections

**Symptom**: scrollToTop, buttons, or breadcrumbs sections are missing

**Solution**: Sections are added automatically on next GET/PUT. If still missing, check server logs for migration errors.

### Settings Not Persisting

**Symptom**: Changes are lost after reload

**Solution**:
1. Check authentication (PUT requires `settings:write` permission)
2. Verify _meta.lastModified is updating
3. Check browser console for API errors

### Color Mapping Issues

**Symptom**: Custom color changed unexpectedly

**Solution**: Only colors in the mapping table (11 colors) are changed. If a custom color changed, it may have accidentally matched a legacy color. Check the color mapping table above.

---

## For Developers

### Testing Migration

Use the test utilities:

```typescript
import { migrateCustomizerSettings, validateMigration } from './utils/schema-migration';

// Test migration
const legacy = { colors: { primaryColor: '#0073aa' } };
const migrated = migrateCustomizerSettings(legacy);

// Validate result
const validation = validateMigration(migrated);
if (!validation.valid) {
  console.error('Migration errors:', validation.errors);
}
```

### Adding New Sections

To add a new section in future versions:

1. Update `migrateFromLegacy()` to add default for new section
2. Update `validateMigration()` to check for new section (if required)
3. Update `getDefaultSettingsV1()` to include new section
4. Increment version number

### Color Mapping

To add new color mappings:

```typescript
// In schema-migration.ts
const COLOR_MAPPING: Record<string, string> = {
  '#oldColor': '#newColor',
  // Add more mappings here
};
```

---

## Version History

### v1.0.0 (2025-10-11)
- Initial versioned release
- Added migration system
- Updated color palette (WordPress → Tailwind)
- Added General sections (scrollToTop, buttons, breadcrumbs)
- Added _meta field for version tracking

### v0.0.0 (Legacy)
- Original unversioned structure
- WordPress-legacy colors
- No General sections
- No version tracking

---

## Support

For issues or questions:
- Check server logs for migration warnings
- Review validation errors in API responses
- Contact development team with _meta field info

**Migration logs format:**
```
[Migration] Migrating customizer settings from legacy to v1.0.0
[Customizer] Migration validation warnings: [...]
```
