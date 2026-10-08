import { DEFAULT_SEMI_FRANCHISE_KEY, NETURE_PHARMACY_SERVICE_KEY } from '../constants.js';

/** 약국 모집의 미지정 대상은 pharmacy. 다른 서비스의 NULL 행은 재해석하지 않는다. */
export const PHARMACY_RECRUITMENT_SERVICE_KEYS = [NETURE_PHARMACY_SERVICE_KEY, 'kpa-society'] as const;

export function recruitmentTargetMatch(recruitment = 'sr', franchise = 'sf'): string {
  return `(${franchise}.id = ${recruitment}.semi_franchise_id OR
    (${recruitment}.semi_franchise_id IS NULL
      AND ${recruitment}.service_id IN ('${NETURE_PHARMACY_SERVICE_KEY}', 'kpa-society')
      AND ${franchise}.key = '${DEFAULT_SEMI_FRANCHISE_KEY}'))`;
}
