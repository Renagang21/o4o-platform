import { AstraCustomizerSettings } from '../types/customizer-types';
import { getDefaultSettings } from './default-settings';

/**
 * 간단한 deep merge 함수 - 저장된 값 우선, 없는 것만 defaults 사용
 */
function simpleDeepMerge(defaults: any, source: any): any {
  // source가 없으면 defaults 반환
  if (!source || typeof source !== 'object') {
    return defaults;
  }

  // 배열은 source를 그대로 사용
  if (Array.isArray(source)) {
    return source;
  }

  // object인 경우 각 key에 대해 재귀적으로 merge
  const result: any = { ...defaults };

  for (const key in source) {
    if (source[key] === undefined || source[key] === null) {
      // source 값이 없으면 defaults 유지
      continue;
    }

    if (typeof source[key] === 'object' && !Array.isArray(source[key]) && defaults[key] && typeof defaults[key] === 'object') {
      // 중첩 object는 재귀적으로 merge
      result[key] = simpleDeepMerge(defaults[key], source[key]);
    } else {
      // primitive 값은 source 우선
      result[key] = source[key];
    }
  }

  return result;
}

export function normalizeCustomizerSettings(raw: unknown): AstraCustomizerSettings {
  const defaults = getDefaultSettings();

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  // PRODUCTION DEBUG
  console.error('[DEBUG normalize] Input raw:', JSON.stringify((raw as any)?.siteIdentity, null, 2));

  // 간단한 deep merge: 저장된 값 우선, 없는 것만 defaults 사용
  const merged = simpleDeepMerge(defaults, raw) as AstraCustomizerSettings;

  // PRODUCTION DEBUG
  console.error('[DEBUG normalize] After merge:', JSON.stringify(merged.siteIdentity, null, 2));

  return merged;
}
