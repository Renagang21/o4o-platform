import { MultilingualConsultationService } from '../services/multilingual-consultation.js';
import { consultationTranslationExtension } from '../services/consultation-translation.extension.js';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
jest.mock('../../../services/store/store-membership.service.js', () => ({ resolveStoreAccessLevel: jest.fn() }));

let features: string[];
let professional: jest.Mock;
let translate: jest.Mock;
let service: MultilingualConsultationService;
beforeEach(() => {
  features = ['multilingual-consultation', 'multilingual-staff-response', 'multilingual-pharmacist-consultation'];
  professional = jest.fn().mockResolvedValue(true);
  translate = jest.fn(async (input, access) => { await access.authorize(); return { translation: 'Translated utterance' }; });
  (resolveStoreAccessLevel as jest.Mock).mockResolvedValue({ level: 'member', organizationId: 'store' });
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('SELECT status')) return [{ status: 'active' }];
    if (sql.includes('FROM semi_franchises sf')) return [{ key: 'synthetic', name: 'Synthetic business', features }];
    if (sql.includes('ownerUserId')) return [{ ownerUserId: 'owner' }];
    if (sql.includes("metadata->'pharmacyServiceFeatures'")) return [{ role: 'staff', configured: true, features }];
    return [];
  });
  service = new MultilingualConsultationService({ query } as any, { translate, professional });
});

it('translates only a server-selected staff phrase and rejects arbitrary outgoing staff text', async () => {
  const input = { mode: 'floor-staff', language: 'en', direction: 'to-customer', phrase: 'pharmacist' };
  const output = await service.translate('staff', 'store', input);
  expect(output.source).toBe('약 선택과 복용에 관한 질문은 약사에게 연결해 드리겠습니다.');
  expect(translate.mock.calls[0][0]).toMatchObject({ source: 'ko', target: 'en' });
  expect(professional).not.toHaveBeenCalled();
  for (const invalid of [{ ...input, text: 'Take a medicine' }, { ...input, phrase: 'unknown' }]) {
    await expect(service.translate('staff', 'store', invalid)).rejects.toMatchObject({ code: 'STAFF_PHRASE_REQUIRED' });
  }
  expect(translate).toHaveBeenCalledTimes(1);
});
it('allows incoming customer words without generating a staff answer', async () => {
  await service.translate('staff', 'store', { mode: 'floor-staff', language: 'ja', direction: 'to-staff', text: 'Original utterance' });
  expect(translate.mock.calls[0][0]).toEqual({ source: 'ja', target: 'ko', text: 'Original utterance' });
});
it('does not equate business/payment permission with professional confirmation', async () => {
  professional.mockResolvedValue(false);
  const context = await service.context('staff', 'store');
  expect(context.modes[0]).toMatchObject({ entitled: true, allowed: false });
  expect(context.modes[1]).toMatchObject({ entitled: true, allowed: true });
  await expect(service.translate('staff', 'store', { mode: 'counter-pharmacist', language: 'en', direction: 'to-customer', text: 'Original' }))
    .rejects.toMatchObject({ code: 'PHARMACIST_CONFIRMATION_REQUIRED' });
  expect(translate).not.toHaveBeenCalled();
});
it('rejects another store and unavailable function before invoking a provider', async () => {
  const input = { mode: 'floor-staff', language: 'en', direction: 'to-staff', text: 'Original' };
  await expect(service.translate('staff', 'other', input)).rejects.toMatchObject({ code: 'STORE_ACCESS_REQUIRED' });
  features = [];
  await expect(service.translate('staff', 'store', input)).rejects.toMatchObject({ code: 'SERVICE_FEATURE_REQUIRED' });
  expect(translate).not.toHaveBeenCalled();
});
it('discards results if role, feature or professional confirmation is revoked while translating', async () => {
  const input = { mode: 'floor-pharmacist', language: 'en', direction: 'to-customer', text: 'Original' };
  for (const revoke of [() => { features = []; }, () => { professional.mockResolvedValue(false); },
    () => { (resolveStoreAccessLevel as jest.Mock).mockResolvedValue({ level: 'none', organizationId: null }); }]) {
    features = ['multilingual-pharmacist-consultation']; professional.mockResolvedValue(true);
    (resolveStoreAccessLevel as jest.Mock).mockResolvedValue({ level: 'member', organizationId: 'store' });
    translate.mockImplementation(async () => { revoke(); return { translation: 'Late private output' }; });
    await expect(service.translate('staff', 'store', input)).rejects.toHaveProperty('httpStatus');
  }
});
it.each([{ mode: 'unknown' }, { language: 'unknown' }, { direction: 'unknown' }, { text: '' }, { text: 'x'.repeat(1001) }])('rejects invalid consultation input: %j', async patch => {
  await expect(service.translate('staff', 'store', { mode: 'counter-pharmacist', language: 'en', direction: 'to-customer', text: 'Original', ...patch }))
    .rejects.toMatchObject({ httpStatus: 400 });
  expect(translate).not.toHaveBeenCalled();
});
it('uses a bounded plain-text translation prompt and rejects malformed or markup model output', () => {
  const prompt = consultationTranslationExtension.prepare({ text: 'Quoted utterance', source: 'ko', target: 'en' }, {} as any);
  expect(JSON.parse(prompt.userPrompt).text).toBe('Quoted utterance');
  expect(prompt.systemPrompt).toContain('never answer questions');
  for (const content of ['{}', '{"translation":42}', '{"translation":""}', '{"translation":"<script>bad()</script>"}']) {
    expect(() => consultationTranslationExtension.parse(content)).toThrow();
  }
  expect(consultationTranslationExtension.parse('{"translation":"Plain words"}')).toEqual({ translation: 'Plain words' });
});

it('keeps Korean local and adds typed counter staff guidance without professional escalation', async () => {
  const input = { mode: 'counter-staff', language: 'ko', direction: 'to-customer', text: 'Original guidance' };
  const output = await service.translate('staff', 'store', input);
  expect(output.translation).toBe('Original guidance');
  expect(translate).not.toHaveBeenCalled(); expect(professional).not.toHaveBeenCalled();
  features = [];
  await expect(service.translate('staff', 'store', input)).rejects.toMatchObject({ code: 'SERVICE_FEATURE_REQUIRED' });
});
it('enforces fixed floor-staff phrases for Korean as well as foreign languages', async () => {
  await expect(service.translate('staff', 'store', { mode: 'floor-staff', language: 'ko', direction: 'to-customer', text: 'Free-form outgoing' })).rejects.toMatchObject({ code: 'STAFF_PHRASE_REQUIRED' });
  expect(translate).not.toHaveBeenCalled();
});
