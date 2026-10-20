import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import { readServiceFeatures, validateServiceFeatures, type PharmacyServiceFeature } from './service-features.js';

type Executor = Pick<DataSource, 'query'>;
export type PharmacyPolicyTarget = 'default' | 'paid';
const keys = { default: 'pharmacy-service-features:default', paid: 'pharmacy-service-features:paid' };
const defaults: Record<PharmacyPolicyTarget, PharmacyServiceFeature[]> = {
  default: [], paid: ['tablet', 'multilingual-content'],
};

/** Missing settings preserve the previous policy; an explicitly saved [] grants nothing. */
export class PharmacyServicePolicyService {
  constructor(private readonly db: Executor) {}

  async read(target: PharmacyPolicyTarget): Promise<PharmacyServiceFeature[]> {
    try {
      const rows = await this.db.query('SELECT value FROM settings WHERE key=$1', [keys[target]]);
      if (!rows.length) return [...defaults[target]];
      const value = rows[0].value;
      if (!value || typeof value !== 'object' || !Array.isArray(value.features)) throw new Error('Invalid policy');
      return readServiceFeatures(value.features);
    } catch {
      throw new NeturePharmacyError(503, 'FEATURE_ACCESS_UNAVAILABLE', '서비스 제공 설정을 확인하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  async set(target: string, features: unknown, actorId: string) {
    if (target !== 'default' && target !== 'paid') throw new NeturePharmacyError(400, 'INVALID_POLICY_TARGET', '설정 대상을 확인해 주세요.');
    const selected = validateServiceFeatures(features);
    await this.db.query(`INSERT INTO settings(key,value,type,description)
      VALUES ($1,$2::jsonb,'pharmacy-service-features','약국 서비스 제공 기능')
      ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,"updatedAt"=NOW()`,
    [keys[target], JSON.stringify({ features: selected, updatedBy: actorId })]);
    return { key: target, features: selected };
  }
}
