import 'reflect-metadata';
jest.mock('../../../../packages/mail-core/src/mail-template.service.js', () => ({ MailTemplateService: jest.fn() }));
import { MailService } from '../../../../packages/mail-core/src/mail.service.js';
import { MailTransportService } from '../../../../packages/mail-core/src/mail-transport.service.js';

const recipient = 'fixture@example.invalid';
const secret = 'synthetic-invitation-proof';
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
beforeEach(() => jest.clearAllMocks());
function transport() {
  const t = new MailTransportService({ logger });
  Object.assign(t, { _isEnabled: true, _isInitialized: true, _transporter: { sendMail: jest.fn(async () => ({ messageId: 'fixture' })) } });
  return t;
}
it('ephemeral delivery stores neither EmailLog nor recipient/secret in application logs', async () => {
  jest.useFakeTimers();
  try {
    const t = transport();
    const audit = jest.spyOn(t, 'logEmail');
    const facade = Object.create(MailService.prototype) as MailService;
    Object.assign(facade, { transport: t });
    Object.values(logger).forEach(fn => fn.mockClear());
    expect(await facade.sendEmail({ to: recipient, subject: 'Operator invitation', text: secret, ephemeral: true })).toEqual({ success: true });
    expect(audit).not.toHaveBeenCalled();
    expect(JSON.stringify(Object.values(logger).map(fn => fn.mock.calls))).not.toContain(recipient);
    expect(JSON.stringify(Object.values(logger).map(fn => fn.mock.calls))).not.toContain(secret);
  } finally { jest.clearAllTimers(); jest.useRealTimers(); }
});
it('ephemeral transport errors cannot retain recipients or proof in audit or returned errors', async () => {
  const t = transport();
  jest.spyOn(t, 'send').mockRejectedValue(new Error(`${recipient}: ${secret}`));
  const audit = jest.spyOn(t, 'logEmail');
  const facade = Object.create(MailService.prototype) as MailService;
  Object.assign(facade, { transport: t });
  expect(await facade.sendEmail({ to: recipient, subject: 'Operator invitation', text: secret, ephemeral: true })).toEqual({ success: false, error: 'Ephemeral email delivery failed' });
  expect(audit).not.toHaveBeenCalled();
});
it('ordinary business mail retains its existing audit behavior', async () => {
  const t = transport();
  jest.spyOn(t, 'send').mockResolvedValue({ messageId: 'fixture' });
  const audit = jest.spyOn(t, 'logEmail').mockResolvedValue();
  const facade = Object.create(MailService.prototype) as MailService;
  Object.assign(facade, { transport: t });
  expect(await facade.sendEmail({ to: recipient, subject: 'Business receipt', text: 'Fixture' })).toEqual({ success: true });
  expect(audit).toHaveBeenCalledWith(recipient, expect.any(String), 'Business receipt', 'sent', 'fixture', 'custom');
});
