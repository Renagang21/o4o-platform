# O4O Platform Customizer - Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Token System](#token-system)
3. [Component Structure](#component-structure)
4. [Adding New Sections](#adding-new-sections)
5. [API Integration](#api-integration)
6. [Migration System](#migration-system)
7. [Testing](#testing)
8. [Best Practices](#best-practices)

---

## Architecture Overview

### System Components

The Customizer system consists of three main parts:

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Customizer   │→ │  Live        │→ │  CSS Generator   │  │
│  │  UI          │  │  Preview     │  │  (token-map.ts)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         ↓                                      ↓             │
└─────────┼──────────────────────────────────────┼─────────────┘
          ↓                                      ↓
┌─────────┼──────────────────────────────────────┼─────────────┐
│         ↓              API Server              ↓             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Customizer  │→ │  Schema      │→ │   Settings       │  │
│  │  Routes      │  │  Migration   │  │   Storage        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         ↓                                      ↓             │
└─────────┼──────────────────────────────────────┼─────────────┘
          ↓                                      ↓
┌─────────┼──────────────────────────────────────┼─────────────┐
│         ↓              Main Site               ↓             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Settings    │→ │  Style       │→ │  Rendered        │  │
│  │  Hooks       │  │  Providers   │  │  Components      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** (Admin Dashboard)
   - User changes settings in Customizer UI
   - Changes are validated client-side
   - Preview updates in real-time via CSS variables

2. **Save Operation** (API Server)
   - Settings are sent to API via PUT request
   - Schema validation (Zod)
   - Migration applied if needed
   - Deep merge with existing settings
   - Saved to database

3. **Frontend Consumption** (Main Site)
   - Settings fetched via GET request
   - Migration applied automatically
   - Converted to CSS variables
   - Applied to page via StyleProviders

---

## Token System

### Overview

The token system provides a unified naming convention for all CSS variables, replacing the legacy "3 parallel universes" problem where different systems used different variable names.

### Naming Convention

All tokens follow the pattern: `--wp-{category}-{element}-{variant}-{state}`

Examples:
- `--wp-color-primary-500` (color category, primary element, 500 variant)
- `--wp-btn-primary-bg` (button category, primary variant, background property)
- `--wp-text-primary` (text category, primary variant)

### Token Map (`token-map.ts`)

The single source of truth for all CSS variables.

```typescript
export const TOKEN_MAP = {
  colors: {
    primary: {
      500: {
        cssVar: '--wp-color-primary-500',
        defaultValue: '#3b82f6',
        customizerPath: 'colors.primaryColor',
        description: 'Primary brand color',
      },
      // ... other shades (50-900)
    },
    secondary: { /* ... */ },
    // ... other color categories
  },
  buttons: {
    primary: {
      bg: {
        cssVar: '--wp-btn-primary-bg',
        defaultValue: '#3b82f6',
        customizerPath: 'buttons.primary.backgroundColor',
      },
      text: {
        cssVar: '--wp-btn-primary-text',
        defaultValue: '#ffffff',
        customizerPath: 'buttons.primary.textColor',
      },
      // ... other button properties
    },
    // ... other button variants
  },
  // ... other categories
};
```

### Using Tokens

**In CSS (globals.css):**
```css
:root {
  /* Define tokens */
  --wp-color-primary-500: #3b82f6;
  --wp-btn-primary-bg: var(--wp-color-primary-500);
  --wp-btn-primary-text: #ffffff;

  /* Legacy aliases for backward compatibility */
  --primary-500: var(--wp-color-primary-500);
  --btn-primary-bg: var(--wp-btn-primary-bg);
}
```

**In React Components:**
```tsx
// Use CSS variables directly
<button style={{ backgroundColor: 'var(--wp-btn-primary-bg)' }}>
  Click me
</button>

// Or use Tailwind classes (mapped in tailwind.config.cjs)
<button className="bg-wp-btn-primary-bg text-wp-btn-primary-text">
  Click me
</button>
```

**In TypeScript (token-map.ts):**
```typescript
import { TOKEN_MAP } from './token-map';

// Get CSS variable name
const primaryColorVar = TOKEN_MAP.colors.primary['500'].cssVar;
// → '--wp-color-primary-500'

// Get default value
const defaultColor = TOKEN_MAP.colors.primary['500'].defaultValue;
// → '#3b82f6'

// Get customizer path
const customizerPath = TOKEN_MAP.colors.primary['500'].customizerPath;
// → 'colors.primaryColor'
```

### CSS Generator (`css-generator.ts`)

Generates dynamic CSS from Customizer settings:

```typescript
function generateColorVariables(settings: AstraCustomizerSettings): string[] {
  const vars: string[] = [];
  const { colors } = settings;

  // Generate --wp-* variables (new)
  vars.push(`  --wp-color-primary-500: ${colors.primaryColor};`);
  vars.push(`  --wp-color-secondary-500: ${colors.secondaryColor};`);

  // Generate legacy aliases for backward compatibility
  vars.push(`  --ast-primary-color: ${colors.primaryColor};`);

  return vars;
}
```

**Output:**
```css
:root {
  /* Unified Token System */
  --wp-color-primary-500: #3b82f6;
  --wp-color-secondary-500: #8b5cf6;

  /* Legacy backward compatibility */
  --ast-primary-color: #3b82f6;
}
```

---

## Component Structure

### Customizer UI (`SimpleCustomizer.tsx`)

Main customizer component with section-based navigation.

```typescript
interface CustomizerProps {
  initialSettings?: AstraCustomizerSettings;
  onSave?: (settings: AstraCustomizerSettings) => Promise<void>;
}

const sections: Section[] = [
  { key: 'colors', label: '색상', icon: '🎨' },
  { key: 'typography', label: '타이포그래피', icon: '🖋️' },
  { key: 'general', label: '일반 설정', icon: '⚙️' },
  { key: 'header', label: '헤더', icon: '🗂️' },
  { key: 'footer', label: '푸터', icon: '📄' },
];
```

### Section Components

Each section is a separate component:

```typescript
// apps/admin-dashboard/src/pages/appearance/astra-customizer/sections/

ColorSection.tsx          // Color palette, primary/secondary colors
TypographySection.tsx     // Fonts, sizes, weights
GeneralSection.tsx        // Scroll-to-top, buttons, breadcrumbs
HeaderBuilder.tsx         // Header layout and settings
FooterBuilder.tsx         // Footer layout and widgets
```

### Control Components

Reusable input controls:

```typescript
// apps/admin-dashboard/src/pages/appearance/astra-customizer/components/controls/

ColorPicker.tsx           // Color selection with eyedropper
FontSelector.tsx          // Google Fonts dropdown
ResponsiveSlider.tsx      // Desktop/Tablet/Mobile sliders
Toggle.tsx                // On/off switches
Select.tsx                // Dropdown selections
```

---

## Adding New Sections

### Step 1: Define Types

Add your section interface to `types/customizer-types.ts`:

```typescript
export interface MyNewSectionSettings {
  enabled: boolean;
  customProperty: string;
  colors: {
    primary: string;
    secondary: string;
  };
  responsiveSize: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
}

// Add to main settings interface
export interface AstraCustomizerSettings {
  // ... existing sections
  myNewSection: MyNewSectionSettings;
}
```

### Step 2: Add to Token Map

Add tokens to `utils/token-map.ts`:

```typescript
export const TOKEN_MAP = {
  // ... existing tokens
  myNewSection: {
    primary: {
      cssVar: '--wp-mynew-primary',
      defaultValue: '#3b82f6',
      customizerPath: 'myNewSection.colors.primary',
      description: 'My new section primary color',
    },
    secondary: {
      cssVar: '--wp-mynew-secondary',
      defaultValue: '#8b5cf6',
      customizerPath: 'myNewSection.colors.secondary',
    },
    size: {
      desktop: {
        cssVar: '--wp-mynew-size-desktop',
        defaultValue: '24px',
        customizerPath: 'myNewSection.responsiveSize.desktop',
      },
      // ... tablet, mobile
    },
  },
};
```

### Step 3: Add Default Settings

Update `default-settings.ts`:

```typescript
export const getDefaultSettingsV1 = (): AstraCustomizerSettings => ({
  // ... existing defaults
  myNewSection: {
    enabled: true,
    customProperty: 'default-value',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
    },
    responsiveSize: {
      desktop: 24,
      tablet: 20,
      mobile: 16,
    },
  },
  _meta: {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    isDirty: false,
  },
});
```

### Step 4: Create Section Component

Create `sections/MyNewSection.tsx`:

```typescript
import React from 'react';
import { Toggle, ColorPicker, ResponsiveSlider } from '../components/controls';
import { useCustomizerContext } from '../context/CustomizerContext';

export const MyNewSection: React.FC = () => {
  const { settings, updateSettings } = useCustomizerContext();
  const sectionSettings = settings.myNewSection;

  const handleChange = (updates: Partial<MyNewSectionSettings>) => {
    updateSettings({
      ...settings,
      myNewSection: {
        ...sectionSettings,
        ...updates,
      },
    });
  };

  return (
    <div className="section-container">
      <h2>My New Section</h2>

      <Toggle
        label="Enable Feature"
        checked={sectionSettings.enabled}
        onChange={(enabled) => handleChange({ enabled })}
      />

      <ColorPicker
        label="Primary Color"
        value={sectionSettings.colors.primary}
        onChange={(primary) => handleChange({
          colors: { ...sectionSettings.colors, primary }
        })}
      />

      <ResponsiveSlider
        label="Size"
        values={sectionSettings.responsiveSize}
        min={12}
        max={48}
        step={1}
        unit="px"
        onChange={(responsiveSize) => handleChange({ responsiveSize })}
      />
    </div>
  );
};
```

### Step 5: Register Section

Add to `SimpleCustomizer.tsx`:

```typescript
import { MyNewSection } from './sections/MyNewSection';

const sections: Section[] = [
  // ... existing sections
  { key: 'myNewSection', label: 'My New Section', icon: '🆕' },
];

// In render switch statement:
switch (activeSection) {
  // ... existing cases
  case 'myNewSection':
    return <MyNewSection />;
}
```

### Step 6: Add CSS Generation

Update `utils/css-generator.ts`:

```typescript
function generateMyNewSectionVariables(settings: AstraCustomizerSettings): string[] {
  const vars: string[] = [];
  const { myNewSection } = settings;

  if (!myNewSection.enabled) return [];

  // Generate CSS variables
  vars.push(`  --wp-mynew-primary: ${myNewSection.colors.primary};`);
  vars.push(`  --wp-mynew-secondary: ${myNewSection.colors.secondary};`);
  vars.push(`  --wp-mynew-size-desktop: ${myNewSection.responsiveSize.desktop}px;`);
  vars.push(`  --wp-mynew-size-tablet: ${myNewSection.responsiveSize.tablet}px;`);
  vars.push(`  --wp-mynew-size-mobile: ${myNewSection.responsiveSize.mobile}px;`);

  return vars;
}

// Add to main generator
export function generateCustomCSS(settings: AstraCustomizerSettings): string {
  const colorVars = generateColorVariables(settings);
  const typographyVars = generateTypographyVariables(settings);
  const myNewVars = generateMyNewSectionVariables(settings); // Add this

  const allVars = [
    ...colorVars,
    ...typographyVars,
    ...myNewVars, // Add this
  ];

  return `:root {\n${allVars.join('\n')}\n}`;
}
```

### Step 7: Add API Endpoint (Optional)

If your section needs a dedicated endpoint, create in `apps/api-server/src/routes/v1/customizer.routes.ts`:

```typescript
import { z } from 'zod';

const MyNewSectionSchema = z.object({
  enabled: z.boolean().default(true),
  customProperty: z.string().default('default-value'),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  responsiveSize: z.object({
    desktop: z.number().min(12).max(48),
    tablet: z.number().min(12).max(48),
    mobile: z.number().min(12).max(48),
  }),
});

// GET endpoint
router.get('/my-new-section', async (req, res) => {
  try {
    const customizerSettings = await settingsService.getSettings('customizer');
    const migrated = migrateCustomizerSettings(customizerSettings);
    const myNewSection = migrated?.myNewSection || getDefaultSettingsV1().myNewSection;
    res.json({ success: true, data: myNewSection });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

// PUT endpoint
router.put('/my-new-section', authenticateToken, checkPermission('settings:write'),
  async (req, res) => {
    try {
      const validatedData = MyNewSectionSchema.parse(req.body);
      const customizerSettings = await settingsService.getSettings('customizer') || {};
      const merged = deepMerge(customizerSettings.myNewSection || {}, validatedData);

      customizerSettings.myNewSection = merged;
      customizerSettings._meta = {
        ...customizerSettings._meta,
        lastModified: new Date().toISOString(),
      };

      await settingsService.updateSettings('customizer', customizerSettings);
      res.json({ success: true, data: merged });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
  }
);
```

### Step 8: Add Frontend Hook (Optional)

Create `apps/main-site/src/hooks/useMyNewSectionSettings.ts`:

```typescript
import { useState, useEffect } from 'react';
import { MyNewSectionSettings } from '@/types/customizer-types';

const defaultSettings: MyNewSectionSettings = {
  enabled: true,
  customProperty: 'default-value',
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
  },
  responsiveSize: {
    desktop: 24,
    tablet: 20,
    mobile: 16,
  },
};

export const useMyNewSectionSettings = () => {
  const [settings, setSettings] = useState<MyNewSectionSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/v1/customizer/my-new-section');
        const result = await response.json();

        if (result.success && result.data) {
          setSettings({ ...defaultSettings, ...result.data });
        }
      } catch (error) {
        console.error('Failed to load my-new-section settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
};
```

### Step 9: Add Migration Support

Update `apps/api-server/src/utils/schema-migration.ts`:

```typescript
function migrateFromLegacy(legacySettings: any): any {
  const migrated = { ...legacySettings };

  // Add new section with defaults if missing
  if (!migrated.myNewSection) {
    migrated.myNewSection = {
      enabled: true,
      customProperty: 'default-value',
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
      },
      responsiveSize: {
        desktop: 24,
        tablet: 20,
        mobile: 16,
      },
    };
  }

  // Apply color mapping if needed
  if (migrated.myNewSection?.colors) {
    migrated.myNewSection.colors.primary = mapColor(migrated.myNewSection.colors.primary);
    migrated.myNewSection.colors.secondary = mapColor(migrated.myNewSection.colors.secondary);
  }

  // ... rest of migration

  return migrated;
}
```

---

## API Integration

### Endpoints

All customizer endpoints follow REST conventions:

- **GET** `/api/v1/customizer/{section}` - Fetch settings (public)
- **PUT** `/api/v1/customizer/{section}` - Update settings (authenticated)

### Request/Response Format

**Request (PUT):**
```json
{
  "enabled": true,
  "customProperty": "value",
  "colors": {
    "primary": "#3b82f6"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "customProperty": "value",
    "colors": {
      "primary": "#3b82f6"
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "path": ["colors", "primary"],
      "message": "Invalid color format"
    }
  ]
}
```

### Validation (Zod)

All API endpoints use Zod schemas for validation:

```typescript
import { z } from 'zod';

const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color');

const MySettingsSchema = z.object({
  enabled: z.boolean().default(true),
  colors: z.object({
    primary: ColorSchema,
    secondary: ColorSchema.optional(),
  }),
  size: z.number().min(12).max(48).default(24),
});

// Usage
const validatedData = MySettingsSchema.parse(req.body);
```

### Deep Merge

All updates use deep merge to prevent data loss:

```typescript
import { deepMerge } from '../utils/deep-merge';

const existing = {
  enabled: true,
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
  },
  size: 24,
};

const update = {
  colors: {
    primary: '#ff0000', // Only update primary
  },
};

const result = deepMerge(existing, update);
// Result:
// {
//   enabled: true,          // Preserved
//   colors: {
//     primary: '#ff0000',   // Updated
//     secondary: '#8b5cf6', // Preserved
//   },
//   size: 24,              // Preserved
// }
```

---

## Migration System

### Overview

The migration system automatically converts legacy settings (v0.0.0) to the current version (v1.0.0) with:
- Color mapping (WordPress legacy → Tailwind modern)
- Missing section addition
- Version tracking

### Version Detection

```typescript
export function detectVersion(settings: any): string {
  // Check for explicit version
  if (settings?._meta?.version) {
    return settings._meta.version;
  }

  // Detect legacy by structure
  const hasLegacyStructure =
    !settings?._meta &&
    (settings?.colors?.primaryColor === '#0073aa' || !settings?.scrollToTop);

  return hasLegacyStructure ? LEGACY_VERSION : CURRENT_VERSION;
}
```

### Color Mapping

```typescript
const COLOR_MAPPING: Record<string, string> = {
  // WordPress legacy → Tailwind modern
  '#0073aa': '#3b82f6', // Primary Blue
  '#005177': '#2563eb', // Primary Dark Blue
  '#ff6b6b': '#ef4444', // Secondary Red
  '#e74c3c': '#dc2626', // Dark Red
  // ... 7 more mappings
};

function mapColor(color: string): string {
  return COLOR_MAPPING[color.toLowerCase()] || color;
}
```

### Migration Entry Point

```typescript
export function migrateCustomizerSettings(settings: any): any {
  if (!settings || Object.keys(settings).length === 0) {
    return getDefaultSettingsV1();
  }

  const version = detectVersion(settings);

  if (version === LEGACY_VERSION) {
    console.log('[Migration] Migrating from legacy to v1.0.0');
    return migrateFromLegacy(settings);
  }

  return settings;
}
```

### Migration Usage

Migration is applied automatically in all API endpoints:

```typescript
router.get('/scroll-to-top', async (req, res) => {
  let customizerSettings = await settingsService.getSettings('customizer');
  customizerSettings = migrateCustomizerSettings(customizerSettings); // Auto-migrate
  res.json({ success: true, data: customizerSettings.scrollToTop });
});
```

---

## Testing

### Unit Tests

Located in `apps/api-server/src/__tests__/`:

**Schema Migration Tests (`schema-migration.test.ts`):**
- Version detection (4 cases)
- Color mapping (11 legacy colors)
- Migration from legacy (6 cases)
- Validation (4 cases)

**Deep Merge Tests (`deep-merge.test.ts`):**
- Basic merging
- Nested objects (3+ levels)
- Array handling
- Null/undefined handling

**Run Unit Tests:**
```bash
cd apps/api-server
npm test schema-migration
npm test deep-merge
```

### E2E Tests

Located in `apps/admin-dashboard/src/test/e2e/`:

**Core Scenarios (`customizer.spec.ts`):**
- Color change flow
- General section features
- Legacy migration
- Header/Footer builder
- Data persistence
- Performance tests

**Error Cases (`customizer-errors.spec.ts`):**
- Authentication errors (401)
- Network errors (500)
- Validation errors (400)
- Fallback behavior
- Edge cases

**Run E2E Tests:**
```bash
cd apps/admin-dashboard

# All tests
npm run test:e2e

# Specific suite
npx playwright test customizer.spec.ts

# Debug mode
npx playwright test --debug

# UI mode
npx playwright test --ui
```

---

## Best Practices

### CSS Variables

✅ **Do:**
- Use `--wp-*` prefix for all new variables
- Group related variables (e.g., `--wp-btn-primary-*`)
- Provide fallback values: `color: var(--wp-color-primary-500, #3b82f6);`
- Document variables in token-map.ts

❌ **Don't:**
- Use unprefixed variables (e.g., `--primary`)
- Mix naming conventions
- Define CSS variables inline without token map entry

### Type Safety

✅ **Do:**
- Define TypeScript interfaces for all settings
- Use Zod schemas for API validation
- Export types from a central location
- Use strict TypeScript config

❌ **Don't:**
- Use `any` types
- Skip validation
- Define types inline

### Performance

✅ **Do:**
- Debounce preview updates (300ms)
- Use CSS variables for dynamic styles (no re-render)
- Lazy load section components
- Memoize expensive computations

❌ **Don't:**
- Update state on every keystroke
- Regenerate all CSS on single property change
- Load all sections upfront

### Backward Compatibility

✅ **Do:**
- Maintain legacy aliases for at least 1 major version
- Provide automatic migration
- Test migration with real legacy data
- Document breaking changes

❌ **Don't:**
- Remove legacy variables without warning
- Force manual migration
- Break existing frontend code

### Documentation

✅ **Do:**
- Document all public APIs
- Provide examples for common tasks
- Keep documentation in sync with code
- Include troubleshooting guides

❌ **Don't:**
- Assume developers know the system
- Document only "happy path"
- Use jargon without explanation

---

## Troubleshooting

### Preview Not Updating

**Symptom:** Changes in customizer don't reflect in preview.

**Debug:**
1. Check browser console for errors
2. Verify CSS variables are being set:
   ```javascript
   getComputedStyle(document.documentElement).getPropertyValue('--wp-color-primary-500')
   ```
3. Check if iframe is loaded:
   ```javascript
   document.querySelector('iframe#preview-frame')
   ```
4. Verify WebSocket connection (if using live reload)

### Migration Not Working

**Symptom:** Legacy data not migrating to v1.0.0.

**Debug:**
1. Check version detection:
   ```typescript
   console.log(detectVersion(settings));
   ```
2. Verify migration is called:
   ```typescript
   console.log('[Migration] Settings version:', settings._meta?.version);
   ```
3. Check migration validation:
   ```typescript
   const validation = validateMigration(migrated);
   console.log(validation);
   ```

### Type Errors

**Symptom:** TypeScript errors after adding new section.

**Solutions:**
1. Run type check: `npm run type-check`
2. Rebuild: `npm run build`
3. Restart TypeScript server (VS Code: Cmd+Shift+P → "Restart TS Server")
4. Check imports are correct
5. Verify all interfaces are exported

---

## Additional Resources

- [User Guide](./CUSTOMIZER_USER_GUIDE.md) - End-user documentation
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Migration Guide](../../api-server/MIGRATION_GUIDE.md) - Schema migration details
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions
- [Naming Convention](./pages/appearance/astra-customizer/NAMING_CONVENTION.md) - CSS variable naming

---

## Support & Contributing

### Reporting Issues

Use GitHub Issues with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/version info
- Relevant code/screenshots

### Contributing

1. Read this guide thoroughly
2. Follow existing patterns
3. Add tests for new features
4. Update documentation
5. Submit PR with clear description

### Questions?

- **Developer Slack:** #o4o-platform-dev
- **Email:** dev@o4o-platform.com
- **Docs:** https://docs.o4o-platform.com

Happy coding! 🚀
