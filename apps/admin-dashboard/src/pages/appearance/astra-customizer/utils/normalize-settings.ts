import { AstraCustomizerSettings } from '../types/customizer-types';
import { getDefaultSettings } from './default-settings';

type UnknownRecord = Record<string, unknown> | undefined | null;

// --- Guard helpers -----------------------------------------------------------
const NUMERIC_KEY_RE = /^\d+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Remove numeric-key properties recursively.
 * This prevents data contamination from spread operations like { ...'string' }
 */
function sanitizeObjectDeep<T = unknown>(input: T): T {
  if (Array.isArray(input)) {
    // arrays are allowed as-is (elements sanitized recursively)
    return input.map(sanitizeObjectDeep) as unknown as T;
  }
  if (!isPlainObject(input)) return input;

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (NUMERIC_KEY_RE.test(key)) {
      // drop numeric keys to prevent contamination
      continue;
    }
    const val = (input as Record<string, unknown>)[key];
    out[key] = sanitizeObjectDeep(val);
  }
  return out as unknown as T;
}

/**
 * Safe keys from defaults & source (exclude numeric keys)
 */
function collectSafeKeys(a?: Record<string, unknown>, b?: Record<string, unknown>) {
  const keys = new Set<string>();
  for (const o of [a, b]) {
    if (o) {
      for (const k of Object.keys(o)) {
        if (!NUMERIC_KEY_RE.test(k)) keys.add(k);
      }
    }
  }
  return keys;
}

function mergeWithDefaults<T>(defaults: T, source: UnknownRecord): T {
  if (source === undefined) {
    return defaults;
  }

  if (source === null) {
    if (Array.isArray(defaults)) {
      return defaults;
    }

    if (defaults && typeof defaults === 'object') {
      return defaults;
    }

    return source as T;
  }

  if (Array.isArray(defaults)) {
    if (Array.isArray(source)) {
      const defaultArray = defaults as unknown[];
      const sourceArray = source as unknown[];

      return sourceArray.map((item, index) => {
        const defaultItem = defaultArray[index];
        if (defaultItem === undefined) {
          return item;
        }
        return mergeWithDefaults(defaultItem, item as UnknownRecord);
      }) as unknown as T;
    }

    return [...defaults] as unknown as T;
  }

  if (defaults && typeof defaults === 'object') {
    if (typeof source !== 'object' || Array.isArray(source)) {
      return defaults;
    }

    // Sanitize both inputs to drop numeric-key contamination (deep)
    const safeDefaults = sanitizeObjectDeep(defaults as Record<string, unknown>) as Record<string, unknown>;
    const safeSource = sanitizeObjectDeep(source as Record<string, unknown>) as Record<string, unknown>;

    const result: Record<string, unknown> = {};
    const keys = collectSafeKeys(safeDefaults, safeSource);

    keys.forEach((key) => {
      const defaultValue = safeDefaults[key];
      const sourceValue = safeSource[key];

      // If 'source' is undefined, fall back to default
      if (typeof sourceValue === 'undefined') {
        result[key] = defaultValue;
        return;
      }

      // Arrays: don't attempt to merge objects into arrays or vice versa
      if (Array.isArray(defaultValue) || Array.isArray(sourceValue)) {
        result[key] = Array.isArray(sourceValue) ? sourceValue : (Array.isArray(defaultValue) ? defaultValue : sourceValue);
        return;
      }

      // Nested plain objects: recurse
      if (isPlainObject(defaultValue) && isPlainObject(sourceValue)) {
        result[key] = mergeWithDefaults(defaultValue as UnknownRecord, sourceValue as UnknownRecord);
        return;
      }

      // Primitives: prefer source
      result[key] = sourceValue;
    });

    return result as T;
  }

  return (source as T) ?? defaults;
}

/**
 * Ensure value is a ResponsiveValue object {desktop, tablet, mobile}
 * Used for responsive controls (AstraSlider with responsive=true)
 */
function ensureResponsiveValue<T>(
  value: unknown,
  defaultValue: { desktop: T; tablet: T; mobile: T }
): { desktop: T; tablet: T; mobile: T } {
  // If value is undefined or null, use default
  if (value === undefined || value === null) {
    return defaultValue;
  }

  // If value is a number or string, convert to responsive object
  if (typeof value === 'number' || typeof value === 'string') {
    const numValue = typeof value === 'number' ? value : Number(value);
    return {
      desktop: numValue as T,
      tablet: Math.max(2, Math.floor(numValue / 1.2)) as T,
      mobile: Math.max(1, Math.floor(numValue / 1.5)) as T
    };
  }

  // If value is already an object, ensure all properties exist
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as any;
    return {
      desktop: obj.desktop ?? defaultValue.desktop,
      tablet: obj.tablet ?? defaultValue.tablet,
      mobile: obj.mobile ?? defaultValue.mobile
    };
  }

  return defaultValue;
}

/**
 * Ensure value is a ColorState object {normal, hover?}
 * Used for color controls (AstraColorPicker with hasHover=true)
 */
function ensureColorState(
  value: unknown,
  defaultValue: { normal: string; hover?: string }
): { normal: string; hover?: string } {
  // If value is undefined or null, use default
  if (value === undefined || value === null) {
    return defaultValue;
  }

  // If value is a string, convert to ColorState
  if (typeof value === 'string') {
    return {
      normal: value,
      hover: undefined
    };
  }

  // If value is already an object, ensure normal exists
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as any;
    return {
      normal: obj.normal ?? defaultValue.normal,
      hover: obj.hover
    };
  }

  return defaultValue;
}

export function normalizeCustomizerSettings(raw: unknown): AstraCustomizerSettings {
  const defaults = getDefaultSettings();

  if (raw === undefined || raw === null) {
    return defaults;
  }

  // Handle legacy siteIdentity format (string URL instead of object)
  let processedRaw = raw as UnknownRecord;
  if (processedRaw && typeof processedRaw === 'object') {
    const rawObj = processedRaw as Record<string, unknown>;

    // If siteIdentity is a string (legacy format), convert to object
    if (typeof rawObj.siteIdentity === 'string') {
      const logoUrl = rawObj.siteIdentity as string;
      rawObj.siteIdentity = {
        logo: {
          desktop: logoUrl,
          mobile: logoUrl,
          width: defaults.siteIdentity.logo.width
        },
        siteTitle: defaults.siteIdentity.siteTitle,
        tagline: defaults.siteIdentity.tagline
      };
    }
  }

  const merged = mergeWithDefaults(defaults, processedRaw);

  // ========================================
  // Control-Based Type Enforcement
  // See: docs/dev/tasks/control_based_schema_spec.md
  // ========================================

  // --- Site Identity: Responsive Fields ---
  // CRITICAL: Always enforce types, even if value is undefined
  // This ensures UI never encounters undefined when accessing .desktop, .tablet, .mobile
  merged.siteIdentity.logo.width = ensureResponsiveValue(
    merged.siteIdentity?.logo?.width,
    defaults.siteIdentity.logo.width
  );

  merged.siteIdentity.siteTitle.typography.fontSize = ensureResponsiveValue(
    merged.siteIdentity?.siteTitle?.typography?.fontSize,
    defaults.siteIdentity.siteTitle.typography.fontSize
  );

  merged.siteIdentity.siteTitle.typography.lineHeight = ensureResponsiveValue(
    merged.siteIdentity?.siteTitle?.typography?.lineHeight,
    defaults.siteIdentity.siteTitle.typography.lineHeight
  );

  merged.siteIdentity.siteTitle.typography.letterSpacing = ensureResponsiveValue(
    merged.siteIdentity?.siteTitle?.typography?.letterSpacing,
    defaults.siteIdentity.siteTitle.typography.letterSpacing
  );

  merged.siteIdentity.tagline.typography.fontSize = ensureResponsiveValue(
    merged.siteIdentity?.tagline?.typography?.fontSize,
    defaults.siteIdentity.tagline.typography.fontSize
  );

  merged.siteIdentity.tagline.typography.lineHeight = ensureResponsiveValue(
    merged.siteIdentity?.tagline?.typography?.lineHeight,
    defaults.siteIdentity.tagline.typography.lineHeight
  );

  merged.siteIdentity.tagline.typography.letterSpacing = ensureResponsiveValue(
    merged.siteIdentity?.tagline?.typography?.letterSpacing,
    defaults.siteIdentity.tagline.typography.letterSpacing
  );

  // --- Site Identity: ColorState Fields ---
  // CRITICAL: Always enforce types, even if value is undefined
  // This ensures UI never encounters undefined when accessing .normal, .hover
  merged.siteIdentity.siteTitle.color = ensureColorState(
    merged.siteIdentity?.siteTitle?.color,
    defaults.siteIdentity.siteTitle.color
  );

  merged.siteIdentity.tagline.color = ensureColorState(
    merged.siteIdentity?.tagline?.color,
    defaults.siteIdentity.tagline.color
  );

  // --- Colors: ColorState Fields ---
  // CRITICAL: Always enforce types, even if value is undefined
  merged.colors.linkColor = ensureColorState(
    merged.colors?.linkColor,
    defaults.colors.linkColor
  );

  // --- Footer Widgets: Responsive Fields ---
  // CRITICAL: Always enforce types, even if value is undefined
  merged.footer.widgets.columns = ensureResponsiveValue(
    merged.footer?.widgets?.columns,
    defaults.footer.widgets.columns
  );

  return merged;
}
