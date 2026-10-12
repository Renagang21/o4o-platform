import { ForeignVisitorPartnerQrCodeService } from './foreign-visitor-partner-qr-code.service.js';

it.each(['pharmacy-hub', ' pharmacy-hub ', 'pharmacy-hub-event-offer'])('does not resolve active retired affiliate QR %s', async serviceKey => {
  const findOne = jest.fn().mockResolvedValue({ serviceKey, status: 'ACTIVE' });
  const service = new ForeignVisitorPartnerQrCodeService({ getRepository: () => ({ findOne }) } as any);
  expect(await service.resolvePublicByShortCode('opaque')).toBeNull();
});

it('keeps current service affiliate QR resolution', async () => {
  const qr = { serviceKey: 'neture', status: 'ACTIVE' };
  const service = new ForeignVisitorPartnerQrCodeService({ getRepository: () => ({ findOne: async () => qr }) } as any);
  expect(await service.resolvePublicByShortCode('opaque')).toBe(qr);
});
