import { afterEach, expect, it, vi } from 'vitest';
import { OPERATOR_INVITATION_KEY, operatorInvitationReturnPath } from '../operatorInvitationReturn';
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });
it('keeps ordinary signup at home', () => { expect(operatorInvitationReturnPath()).toBe('/'); });
it('returns only to the fixed inspection page for a stored invitation', () => {
  sessionStorage.setItem(OPERATOR_INVITATION_KEY, 'a'.repeat(64));
  expect(operatorInvitationReturnPath()).toBe('/operator-invite');
});
it('does not interpret a malformed token as a redirect destination', () => {
  sessionStorage.setItem(OPERATOR_INVITATION_KEY, 'https://untrusted.example');
  expect(operatorInvitationReturnPath()).toBe('/');
});
it('keeps ordinary signup usable when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
  expect(operatorInvitationReturnPath()).toBe('/');
});
