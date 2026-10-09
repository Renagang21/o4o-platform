import { DEFAULT_SEMI_FRANCHISE_KEY, NETURE_PHARMACY_SERVICE_KEY } from '../constants.js';
export const PHARMACY_RECRUITMENT_SERVICE_KEYS = [NETURE_PHARMACY_SERVICE_KEY, 'kpa-society'] as const;

/** Legacy pharmacy recruitment with a supply price retains franchise approval and supply access. */
export function isPublicRecruitment(row: { semiFranchiseId?: string | null; supplyUnitPrice?: number | null; serviceId?: string }): boolean {
  return !row.semiFranchiseId && !(row.supplyUnitPrice != null
    && PHARMACY_RECRUITMENT_SERVICE_KEYS.includes(row.serviceId as typeof PHARMACY_RECRUITMENT_SERVICE_KEYS[number]));
}
export function recruitmentPublicMatch(recruitment = 'sr'): string {
  return `(${recruitment}.semi_franchise_id IS NULL AND
    (${recruitment}.supply_unit_price IS NULL OR ${recruitment}.service_id NOT IN ('neture-pharmacy', 'kpa-society')))`;
}
export function recruitmentTargetMatch(recruitment = 'sr', franchise = 'sf'): string {
  return `(${franchise}.id = ${recruitment}.semi_franchise_id OR
    (${recruitment}.semi_franchise_id IS NULL AND ${recruitment}.supply_unit_price IS NOT NULL
      AND ${recruitment}.service_id IN ('${NETURE_PHARMACY_SERVICE_KEY}', 'kpa-society')
      AND ${franchise}.key = '${DEFAULT_SEMI_FRANCHISE_KEY}'))`;
}
export function recruitmentAvailable(): string {
  return `(${recruitmentPublicMatch()} OR
    (sf.status = 'active' AND sfm.status = 'active' AND sr.exposure_status = 'approved'))`;
}
