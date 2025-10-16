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

  return mergeWithDefaults(defaults, raw as UnknownRecord);
}
