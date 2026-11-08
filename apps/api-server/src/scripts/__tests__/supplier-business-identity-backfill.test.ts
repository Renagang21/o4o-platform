import { APPLY_SQL, PLAN_SQL, applyBackfill, planBackfill } from '../supplier-business-identity-backfill.js';

describe('supplier business identity backfill CLI (WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T9)', () => {
  it('only updates organizations, never deletes, and never touches the old supplier columns', () => {
    expect(APPLY_SQL).toMatch(/UPDATE organizations o/);
    for (const sql of [APPLY_SQL, PLAN_SQL]) {
      expect(sql).not.toMatch(/\bDELETE\b|\bINSERT\b|\bDROP\b|\bALTER\b|UPDATE neture_suppliers/i);
      expect(sql).toMatch(/HAVING count\(\*\) = 1/);
    }
    // 정본에 값이 있으면 덮어쓰지 않는다 — 빈 키만 채운다.
    expect(APPLY_SQL).toMatch(/patch\.cur \|\| patch\.fill/);
  });

  it('rolls back (throws) when targets remain after apply', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([[], 2])
      .mockResolvedValueOnce([{ targets: 1, representative: 1, business_type: 0, business_category: 0 }]);
    await expect(applyBackfill({ query })).rejects.toThrow('BACKFILL_RESIDUE');
  });

  it('reports the affected count when nothing remains', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([[], 3])
      .mockResolvedValueOnce([{ targets: 0, representative: 0, business_type: 0, business_category: 0 }]);
    expect(await applyBackfill({ query })).toBe(3);
    expect(await planBackfill({ query: jest.fn().mockResolvedValue([{ targets: 0 }]) })).toEqual({ targets: 0 });
  });
});
