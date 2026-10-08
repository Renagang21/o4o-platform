import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf8');

describe('user all-device logout retirement', () => {
  it('does not register the public route or its controller', () => {
    expect(read('modules/auth/routes/auth.routes.ts')).not.toContain("'/logout-all'");
    expect(read('modules/auth/controllers/auth-session.controller.ts')).not.toContain('static async logoutAll');
    expect(read('modules/auth/routes/auth.routes.ts')).toContain("'/logout'");
  });

  it('removes the retired endpoint from limited-account and terms exceptions', () => {
    expect(read('common/auth/account-access.policy.ts')).not.toContain('/auth/logout-all');
    expect(read('common/auth/terms-acceptance.policy.ts')).not.toContain('/auth/logout-all');
  });

  it('keeps password-reset security revocation internal', () => {
    expect(read('services/auth/email-auth.service.ts')).toContain('authenticationService.revokeAllSessions(userId)');
    expect(read('services/authentication.service.ts')).not.toContain('async logoutAll');
  });
});
