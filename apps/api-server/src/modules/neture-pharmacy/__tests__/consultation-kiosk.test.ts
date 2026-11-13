import { createHash } from 'node:crypto';
import { ConsultationKioskService } from '../services/consultation-kiosk.js';
import { cleanupConsultationState } from '../services/consultation-state-cleanup.js';
import { NeturePharmacyError } from '../constants.js';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
jest.mock('../../../services/store/store-membership.service.js', () => ({ resolveStoreAccessLevel: jest.fn() }));
jest.mock('../../neture/services/neture-main-membership.js', () => ({ getNetureMainMembershipStatus: jest.fn() }));
jest.mock('../../../services/ai-management/model-controls.js', () => ({ ModelControlService: jest.fn().mockImplementation(() => ({ read: async () => ({ consultation: { detectLanguage: true } }) })) }));

const STORE = '11111111-1111-4111-8111-111111111111';
const ROW = '22222222-2222-4222-8222-222222222222';
const PRODUCT = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'a'.repeat(64);
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
let tablets: unknown[];
let row: Record<string, unknown> | null;
let query: jest.Mock;
let requireMode: jest.Mock;
let requireProductSupport: jest.Mock;
let prepare: jest.Mock;
let products: jest.Mock;
let translate: jest.Mock;
let service: ConsultationKioskService;
const device = { id: ROW, token: TOKEN };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(resolveStoreAccessLevel).mockResolvedValue({ level: 'owner', organizationId: STORE, memberRole: 'owner' } as never);
  jest.mocked(getNetureMainMembershipStatus).mockResolvedValue('active' as never);
  tablets = [{ id: 'consumer-kiosk1', role: 'consumer', name: '입구 키오스크' }, { id: 'staff-1', role: 'staff', name: '근무자' }];
  row = { id: ROW, organization_id: STORE, station_key: 'kiosk-consumer-kiosk1', name: '입구 키오스크', operator_user_id: 'owner' };
  query = jest.fn(async (sql: string, values: unknown[] = []) => {
    if (sql.includes("metadata->'consultationTablets'")) return [{ tablets }];
    if (sql.startsWith('SELECT id,organization_id') && sql.includes('device_hash=$2')) return values[1] === sha(TOKEN) && row ? [row] : [];
    if (sql.startsWith('SELECT id,organization_id') && sql.includes('pairing_hash=$1')) return row ? [row] : [];
    if (sql.startsWith('UPDATE store_consultation_stations SET device_hash')) return [[{ id: ROW, name: '입구 키오스크' }], 1];
    if (sql.startsWith('SELECT id FROM store_consultation_stations')) return [{ id: ROW }];
    return [];
  });
  requireMode = jest.fn(async (_actor: string, _org: string, mode: string) => {
    if (mode !== 'floor-staff') throw new NeturePharmacyError(403, 'SERVICE_FEATURE_REQUIRED', 'feature');
  });
  requireProductSupport = jest.fn(async () => undefined);
  prepare = jest.fn(async () => ({ state: 'ready', intent: 'location', card: { kind: 'product', title: '비타민', text: 'Product location: A-1', language: 'en', requestedLanguage: 'en', publicKey: 'pub' },
    proof: { sourceVersion: 'secret' }, product: { id: PRODUCT, location: 'A-1' } }));
  products = jest.fn(async (_org: string, term: string) => term === '비타민' ? [{ kind: 'listing', id: PRODUCT, name: '비타민', location: 'A-1' }] : term === 'vitamin' ? [{ kind: 'listing', id: PRODUCT, name: '비타민' }] : []);
  translate = jest.fn(async (input: { text: string; source: string }) => ({ translation: input.text === 'vitamin' ? '비타민' : input.text === 'Which medicine should I take for a headache?' ? '두통에 어떤 약을 복용해야 하나요?' : '번역', detectedLanguage: 'en' }));
  service = new ConsultationKioskService({ query } as never, { requireMode, requireProductSupport, guidance: { prepare } as never, products: { products } as never, translate });
});

describe('pairing', () => {
  it('lets only the current owner create a 10-minute code for a registered consumer tablet', async () => {
    const result = await service.pairing('owner', STORE, { tabletId: 'consumer-kiosk1' });
    expect(result.code).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
    const insert = query.mock.calls.find(([sql]) => String(sql).startsWith('INSERT INTO store_consultation_stations'))!;
    expect(insert[1]).toEqual(expect.arrayContaining([STORE, 'kiosk-consumer-kiosk1', '입구 키오스크', 'owner', 'consumer-kiosk']));
    expect(insert[0]).toContain('WHERE store_consultation_stations.mode=EXCLUDED.mode');
  });
  it.each(['member', 'manager', 'expired'])('denies %s before any write', async kind => {
    if (kind === 'expired') jest.mocked(getNetureMainMembershipStatus).mockResolvedValue('inactive' as never);
    else jest.mocked(resolveStoreAccessLevel).mockResolvedValue({ level: kind === 'member' ? 'member' : 'owner', organizationId: STORE, memberRole: kind === 'manager' ? 'manager' : 'owner' } as never);
    await expect(service.pairing('actor', STORE, { tabletId: 'consumer-kiosk1' })).rejects.toMatchObject({ httpStatus: 403 });
    expect(query).not.toHaveBeenCalled();
  });
  it('refuses a staff tablet or an unknown tablet', async () => {
    await expect(service.pairing('owner', STORE, { tabletId: 'staff-1' })).rejects.toMatchObject({ code: 'KIOSK_NOT_REGISTERED' });
    await expect(service.pairing('owner', STORE, { tabletId: 'missing' })).rejects.toMatchObject({ code: 'KIOSK_NOT_REGISTERED' });
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('INSERT'))).toBe(false);
  });
});

describe('device credential', () => {
  it('claims a code once and returns a device token without exposing the store id', async () => {
    const claimed = await service.claim({ code: 'abcde-12345' });
    expect(claimed).toEqual({ id: ROW, name: '입구 키오스크', token: expect.stringMatching(/^[a-f0-9]{64}$/) });
    await expect(service.claim({ code: 'nope' })).rejects.toMatchObject({ code: 'INVALID_PAIRING_CODE' });
  });
  it('rejects a wrong token, a tablet removed from the list and an owner who lost staff access', async () => {
    await expect(service.context({ id: ROW, token: 'b'.repeat(64) })).rejects.toMatchObject({ httpStatus: 401 });
    tablets = [];
    await expect(service.context(device)).rejects.toMatchObject({ code: 'KIOSK_NOT_REGISTERED' });
    tablets = [{ id: 'consumer-kiosk1', role: 'consumer', name: '입구 키오스크' }];
    requireMode.mockRejectedValue(new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', 'revoked'));
    await expect(service.context(device)).rejects.toMatchObject({ code: 'STORE_ACCESS_REQUIRED' });
  });
  it('gives the kiosk its own speech auto-detect candidates and falls back to the admin default', async () => {
    tablets = [{ id: 'consumer-kiosk1', role: 'consumer', name: '입구 키오스크', speechLanguages: ['vi', 'th'] }];
    expect((await service.context(device)).runtime.speechLanguages).toEqual(['vi', 'th']);
    expect((await service.device(device)).speechLanguages).toEqual(['vi', 'th']);
    tablets = [{ id: 'consumer-kiosk1', role: 'consumer', name: '입구 키오스크' }];
    expect((await service.device(device)).speechLanguages).toBeNull();
  });
  it('falls back to counter-staff when the store is entitled only to that staff mode', async () => {
    requireMode.mockImplementation(async (_a: string, _o: string, mode: string) => { if (mode !== 'counter-staff') throw new NeturePharmacyError(403, 'SERVICE_FEATURE_REQUIRED', 'x'); });
    await service.answer({ ...device, intent: 'location', language: 'en', productKind: 'listing', productId: PRODUCT });
    expect(prepare.mock.calls[0][2]).toMatchObject({ mode: 'counter-staff' });
  });
});

describe('consumer answers', () => {
  it('searches by original and translated words and shows each product location in the customer language', async () => {
    translate.mockImplementation(async (input: { text: string }) => ({ translation: input.text === 'vitamin' ? '비타민' : input.text === '1) A-1' ? '1) Shelf A-1' : '번역', detectedLanguage: 'en' }));
    const result = await service.search({ ...device, text: 'vitamin', language: 'en' });
    expect(translate).toHaveBeenNthCalledWith(1, { text: 'vitamin', source: 'en', target: 'ko' }, expect.objectContaining({ actorId: 'owner', organizationId: STORE }));
    expect(translate).toHaveBeenNthCalledWith(2, { text: '1) A-1', source: 'ko', target: 'en' }, expect.objectContaining({ actorId: 'owner', organizationId: STORE }));
    expect(result).toEqual({ state: 'products', language: 'en', products: [
      { kind: 'listing', id: PRODUCT, name: '비타민', location: { text: 'Product location: Shelf A-1', language: 'en' } },
    ] });
  });
  it('translates distinct locations once and falls back to the Korean text when lines do not line up', async () => {
    const OTHER = '44444444-4444-4444-8444-444444444444', THIRD = '55555555-5555-4555-8555-555555555555';
    products.mockResolvedValue([
      { kind: 'listing', id: PRODUCT, name: '비타민C', location: '2번 진열대 왼쪽' },
      { kind: 'local', id: OTHER, name: '비타민D', location: '2번 진열대 왼쪽' },
      { kind: 'listing', id: THIRD, name: '비타민B', location: '' },
    ]);
    translate.mockImplementation(async (input: { text: string; source: string }) => input.source === 'ko'
      ? { translation: 'Left of shelf 2, and something else' } : { translation: '비타민', detectedLanguage: 'en' });
    const result = await service.search({ ...device, text: 'vitamin', language: 'en' }) as { products: Array<{ name: string; location: { text: string; language: string } }> };
    expect(translate.mock.calls.filter(([input]) => input.source === 'ko')).toHaveLength(1);
    expect(translate.mock.calls.find(([input]) => input.source === 'ko')![0].text).toBe('1) 2번 진열대 왼쪽');
    expect(result.products.map(item => item.location)).toEqual([
      { text: 'Product location: 2번 진열대 왼쪽', language: 'ko' },
      { text: 'Product location: 2번 진열대 왼쪽', language: 'ko' },
      { text: 'Please ask a staff member for the product location.', language: 'en' },
    ]);
  });
  it('shows Korean locations without any translation call and keeps access errors from the location step', async () => {
    const korean = await service.search({ ...device, text: '비타민', language: 'ko' }) as { products: Array<{ location: unknown }> };
    expect(korean.products[0].location).toEqual({ text: '상품 위치: A-1', language: 'ko' });
    expect(translate).not.toHaveBeenCalled();
    translate.mockImplementation(async (input: { source: string }) => {
      if (input.source === 'ko') throw new NeturePharmacyError(403, 'STORE_ACCESS_REQUIRED', 'revoked');
      return { translation: '비타민', detectedLanguage: 'en' };
    });
    await expect(service.search({ ...device, text: 'vitamin', language: 'en' })).rejects.toMatchObject({ httpStatus: 403 });
    translate.mockImplementation(async (input: { source: string }) => {
      if (input.source === 'ko') throw new Error('provider down');
      return { translation: '비타민', detectedLanguage: 'en' };
    });
    const fallback = await service.search({ ...device, text: 'vitamin', language: 'en' }) as { products: Array<{ location: unknown }> };
    expect(fallback.products[0].location).toEqual({ text: 'Product location: A-1', language: 'ko' });
  });
  it('refuses product search when the store lost the staff product-support feature', async () => {
    requireProductSupport.mockRejectedValue(new NeturePharmacyError(403, 'SERVICE_FEATURE_REQUIRED', 'feature'));
    await expect(service.search({ ...device, text: '비타민', language: 'ko' })).rejects.toMatchObject({ httpStatus: 403 });
    expect(requireProductSupport).toHaveBeenCalledWith('owner', STORE);
    expect(products).not.toHaveBeenCalled();
  });
  it('turns medicine-choice questions into the pharmacist notice without searching or preparing guidance', async () => {
    const searched = await service.search({ ...device, text: 'Which medicine should I take for a headache?', language: 'en' });
    expect(searched).toMatchObject({ state: 'ready', intent: 'pharmacist', card: { kind: 'notice', language: 'en' } });
    expect(products).not.toHaveBeenCalled();
    const answered = await service.answer({ ...device, intent: 'product-details', question: '두통약 추천해 주세요', language: 'ko', productKind: 'listing', productId: PRODUCT });
    expect(answered).toMatchObject({ intent: 'pharmacist' });
    expect(prepare).not.toHaveBeenCalled();
  });
  it('uses staff-level guidance for location and strips internal proof data', async () => {
    const result = await service.answer({ ...device, intent: 'location', language: 'en', productKind: 'listing', productId: PRODUCT });
    expect(prepare).toHaveBeenCalledWith('owner', STORE, { mode: 'floor-staff', language: 'en', intent: 'location', productKind: 'listing', productId: PRODUCT, translateMaterial: true });
    expect(result).toEqual({ state: 'ready', intent: 'location', language: 'en', card: { kind: 'product', title: '비타민', text: 'Product location: A-1', language: 'en', requestedLanguage: 'en', publicKey: 'pub', fallbackUsed: false, translated: false } });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  it('lets AI pick published paragraphs for a translated question and shows the original when translation is too long', async () => {
    prepare.mockRejectedValueOnce(new NeturePharmacyError(400, 'GUIDANCE_TRANSLATION_UNAVAILABLE', 'long'));
    await service.answer({ ...device, intent: 'product-details', question: 'What is it made of?', language: 'en', productKind: 'listing', productId: PRODUCT });
    expect(prepare.mock.calls[0][2]).toMatchObject({ question: '번역', useAi: true, translateMaterial: true });
    expect(prepare.mock.calls[1][2]).toMatchObject({ question: '번역', useAi: true });
    expect(prepare.mock.calls[1][2]).not.toHaveProperty('translateMaterial');
  });
  it('rejects unsupported intents and over-long input before any provider call', async () => {
    await expect(service.answer({ ...device, intent: 'pharmacist-support', language: 'en' })).rejects.toMatchObject({ httpStatus: 400 });
    await expect(service.search({ ...device, text: 'x'.repeat(301), language: 'en' })).rejects.toMatchObject({ httpStatus: 400 });
    expect(translate).not.toHaveBeenCalled();
  });
});

it('keeps kiosk pairing and device rows out of the 90-second consultation cleanup', async () => {
  const db = { query: jest.fn().mockResolvedValue([{ count: 0 }]) };
  await cleanupConsultationState(db, false);
  expect(db.query.mock.calls[0][0]).toContain("mode<>'consumer-kiosk'");
});
