import {
  STORE_IMAGE_SOURCE, StoreImageGuardError, assertHandledMaster, assertPrimaryReplaceable, assertPublicImageUrl, ownStoreImage,
} from '../store-product-image-guard.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const MASTER = '33333333-3333-4333-8333-333333333333';
const IMAGE = '44444444-4444-4444-8444-444444444444';
const code = async (promise: Promise<unknown>) => {
  try { await promise; return 'ok'; } catch (error) { return error instanceof StoreImageGuardError ? `${error.status}:${error.code}` : String(error); }
};

describe('store product image guard — shared catalog images stay protected', () => {
  it('lets a store add images only to products it handles', async () => {
    const handled = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    expect(await code(assertHandledMaster(handled as never, ORG, MASTER))).toBe('ok');
    expect(handled.query.mock.calls[0][1]).toEqual([ORG, MASTER]);
    const other = { query: jest.fn().mockResolvedValue([]) };
    expect(await code(assertHandledMaster(other as never, ORG, MASTER))).toBe('403:PRODUCT_NOT_HANDLED');
    expect(await code(assertHandledMaster(other as never, ORG, 'not-a-uuid'))).toBe('400:INVALID_INPUT');
  });

  it('allows changing only images this account uploaded from the store, scoped to handled products', async () => {
    const own = { query: jest.fn().mockResolvedValue([{ id: IMAGE, master_id: MASTER, gcs_path: 'p', is_primary: false, source: STORE_IMAGE_SOURCE, created_by: USER }]) };
    expect(await ownStoreImage(own as never, ORG, USER, IMAGE)).toMatchObject({ id: IMAGE, master_id: MASTER });
    expect(own.query.mock.calls[0][0]).toContain('organization_product_listings');
    expect(own.query.mock.calls[0][1]).toEqual([IMAGE, ORG]);
    for (const row of [
      { source: 'supplier_upload', created_by: 'supplier' },
      { source: null, created_by: null },
      { source: STORE_IMAGE_SOURCE, created_by: 'another-store-user' },
    ]) {
      const db = { query: jest.fn().mockResolvedValue([{ id: IMAGE, master_id: MASTER, ...row }]) };
      expect(await code(ownStoreImage(db as never, ORG, USER, IMAGE))).toBe('403:IMAGE_PROTECTED');
    }
    const missing = { query: jest.fn().mockResolvedValue([]) };
    expect(await code(ownStoreImage(missing as never, ORG, USER, IMAGE))).toBe('404:NOT_FOUND');
  });

  it('never replaces a primary image set by a supplier or operator', async () => {
    const none = { query: jest.fn().mockResolvedValue([]) };
    expect(await code(assertPrimaryReplaceable(none as never, USER, MASTER))).toBe('ok');
    const mine = { query: jest.fn().mockResolvedValue([{ source: STORE_IMAGE_SOURCE, created_by: USER }]) };
    expect(await code(assertPrimaryReplaceable(mine as never, USER, MASTER))).toBe('ok');
    const supplier = { query: jest.fn().mockResolvedValue([{ source: 'supplier_upload', created_by: 'supplier' }]) };
    expect(await code(assertPrimaryReplaceable(supplier as never, USER, MASTER))).toBe('403:PRIMARY_PROTECTED');
  });

  it('fetches only public http(s) image hosts', async () => {
    const publicDns = jest.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    expect(await assertPublicImageUrl('https://images.example.com/a.png', publicDns as never)).toBe('https://images.example.com/a.png');
    for (const url of [
      'ftp://images.example.com/a.png', 'file:///etc/passwd', 'not a url', 'https://user:pw@images.example.com/a.png',
      'http://127.0.0.1/a.png', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.5/a.png', 'http://[::1]/a.png',
    ]) expect(await code(assertPublicImageUrl(url, publicDns as never))).toMatch(/^400:/);
    const privateDns = jest.fn().mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '192.168.0.10', family: 4 }]);
    expect(await code(assertPublicImageUrl('https://internal.example.com/a.png', privateDns as never))).toBe('400:INVALID_URL');
    const failing = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));
    expect(await code(assertPublicImageUrl('https://nowhere.example.com/a.png', failing as never))).toBe('400:FETCH_FAILED');
  });
});
