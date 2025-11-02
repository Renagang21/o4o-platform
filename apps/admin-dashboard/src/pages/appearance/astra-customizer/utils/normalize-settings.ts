import { AstraCustomizerSettings } from '../types/customizer-types';
import { getDefaultSettings } from './default-settings';

type UnknownRecord = Record<string, unknown> | undefined | null;

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

    const result: Record<string, unknown> = {
      ...(defaults as Record<string, unknown>),
    };
    const keys = new Set([
      ...Object.keys(defaults as Record<string, unknown>),
      ...Object.keys(source as Record<string, unknown>),
    ]);

    keys.forEach((key) => {
      const defaultValue = (defaults as Record<string, unknown>)[key];
      const sourceValue = (source as Record<string, unknown>)[key];
      result[key] = mergeWithDefaults(defaultValue, sourceValue as UnknownRecord);
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
