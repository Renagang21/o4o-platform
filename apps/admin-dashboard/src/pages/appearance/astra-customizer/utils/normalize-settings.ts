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

export function normalizeCustomizerSettings(raw: unknown): AstraCustomizerSettings {
  const defaults = getDefaultSettings();

  if (raw === undefined || raw === null) {
    return defaults;
  }

  const merged = mergeWithDefaults(defaults, raw as UnknownRecord);

  // Special handling for footer.widgets.columns
  // Ensure it's always a responsive object, not a number
  if (merged.footer?.widgets?.columns !== undefined) {
    const columns = merged.footer.widgets.columns;

    // If columns is a number, convert it to responsive object
    if (typeof columns === 'number') {
      merged.footer.widgets.columns = {
        desktop: columns,
        tablet: Math.max(2, Math.floor(columns / 2)),
        mobile: 1
      };
    } else if (typeof columns === 'object' && columns !== null) {
      // Ensure all properties exist
      const cols = columns as any;
      merged.footer.widgets.columns = {
        desktop: cols.desktop ?? defaults.footer.widgets.columns.desktop,
        tablet: cols.tablet ?? defaults.footer.widgets.columns.tablet,
        mobile: cols.mobile ?? defaults.footer.widgets.columns.mobile
      };
    }
  }

  return merged;
}
