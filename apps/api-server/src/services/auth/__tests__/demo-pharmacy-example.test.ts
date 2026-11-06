import { demoPharmacyExample, DEMO_PHARMACY_EXAMPLE } from '../demo-pharmacy-example.js';
describe('synthetic pharmacy display data', () => {
  it.each([false, undefined, 'true', 1])('does not expose examples for a denied or malformed match: %s', async allowed => {
    const db = { query: jest.fn().mockResolvedValue([{ allowed }]) };
    expect(await demoPharmacyExample(db, 'owner', 'pharmacy')).toBeUndefined();
  });
  it('requires a user and resolved organization before any lookup', async () => {
    const db = { query: jest.fn() };
    expect(await demoPharmacyExample(db, undefined, 'pharmacy')).toBeUndefined();
    expect(await demoPharmacyExample(db, 'owner', undefined)).toBeUndefined();
    expect(db.query).not.toHaveBeenCalled();
  });
  it('only reads the exact active Demo owner and approved pharmacy relationship', async () => {
    const db = { query: jest.fn().mockResolvedValue([{ allowed: true }]) };
    expect(await demoPharmacyExample(db, 'owner', 'pharmacy')).toEqual(DEMO_PHARMACY_EXAMPLE);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("d.demo_type='STORE_OWNER'"), ['owner','pharmacy']);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("om.role='owner' AND om.left_at IS NULL AND pm.status='active'"), ['owner','pharmacy']);
    expect(DEMO_PHARMACY_EXAMPLE.businessNumber).toMatch(/^DEMO-/);
  });
  it('does not turn a lookup failure into Demo access', async () => {
    const db = { query: jest.fn().mockRejectedValue(new Error('unavailable')) };
    await expect(demoPharmacyExample(db, 'owner','pharmacy')).rejects.toThrow('unavailable');
  });
});
