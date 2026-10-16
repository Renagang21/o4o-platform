import type { RequestHandler, Response } from 'express';
import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from './constants.js';
import { createPharmacyFeatureService } from './services/member-paid-features.js';
import type { PharmacyServiceFeature } from './services/service-features.js';

/** Existing membership/device guards must resolve the organization before this check. */
export async function checkPharmacyFeature(db: Pick<DataSource, 'query'>, res: Response,
  organizationId: string, feature: PharmacyServiceFeature): Promise<boolean> {
  try {
    const pharmacies = await db.query(`SELECT status FROM neture_pharmacy_memberships WHERE organization_id=$1`, [organizationId]);
    if (!pharmacies.length) return true; // Other store domains retain their existing rules.
    res.setHeader('Cache-Control', 'private, no-store');
    if (pharmacies[0].status !== 'active') throw new NeturePharmacyError(403, 'PHARMACY_ACCESS_REQUIRED', '내 매장 승인을 확인해 주세요.');
    await createPharmacyFeatureService(db).require('verified-store-context', organizationId, feature);
    return true;
  } catch (error) {
    const known = error instanceof NeturePharmacyError;
    res.status(known ? error.httpStatus : 503).json({ success: false,
      code: known ? error.code : 'FEATURE_ACCESS_UNAVAILABLE',
      error: known ? error.message : '서비스 이용 자격을 확인하지 못했습니다. 다시 시도해 주세요.' });
    return false;
  }
}
export function requirePharmacyFeature(db: Pick<DataSource, 'query'>, feature: PharmacyServiceFeature): RequestHandler {
  return async (req, res, next) => {
    if (!req.organizationId) { res.status(403).json({ success: false, code: 'STORE_ACCESS_REQUIRED' }); return; }
    if (await checkPharmacyFeature(db, res, req.organizationId, feature)) next();
  };
}
