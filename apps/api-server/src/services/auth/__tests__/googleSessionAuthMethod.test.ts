import { randomUUID } from 'node:crypto';
const query = jest.fn();
jest.mock('../../../database/connection.js', () => ({ AppDataSource: { query, getRepository: () => ({}) } }));
jest.mock('../service-session-epoch.js', () => ({ readServiceSessionEpoch: jest.fn(async () => 0) }));

import { GoogleAuthService } from '../google-auth.service.js';
import { verifyAccessToken, verifyRefreshToken } from '../../../utils/token.utils.js';

it('the Google issuer emits explicit Google claims through the real token helper', async () => {
  process.env.JWT_SECRET ||= randomUUID(); process.env.JWT_REFRESH_SECRET ||= randomUUID();
  const family = randomUUID(); const userId = randomUUID();
  query.mockResolvedValue([{ refreshTokenFamily: family }]);
  const user: any = {
    id: userId, email: 'identity-fixture@example.test', status: 'active', isActive: true,
    refreshTokenFamily: family, toPublicData: () => ({ id: userId }),
  };
  const repo = { findOne: jest.fn(async () => user), update: jest.fn(async () => {}), create: (x: unknown) => x, save: jest.fn(async () => {}) };
  const service = new GoogleAuthService({
    identity: {
      verifyGoogleIdToken: jest.fn(async () => ({ sub: 'verified-google-fixture', audience: 'fixture', issuer: 'accounts.google.com', expiresAt: new Date(Date.now() + 60000) })),
      findGoogleIdentityBySub: jest.fn(async () => ({ id: randomUUID(), userId } as any)),
    },
    dataSource: { getRepository: () => repo as any, transaction: jest.fn() },
    readContext: jest.fn(async () => ({ roles: ['platform:super_admin'], memberships: [] })),
    // Do not inject issueSession: the production default must pass 'google'.
  });
  const session = await service.login({ idToken: 'fixture', sessionServiceKey: 'admin', ipAddress: '127.0.0.1', userAgent: 'fixture' });
  for (const claims of [verifyAccessToken(session.tokens.accessToken), verifyRefreshToken(session.tokens.refreshToken)]) {
    expect(claims).toMatchObject({ authMethod: 'google', userId, tokenFamily: family, serviceKey: 'admin' });
    expect(claims!.sessionId).toBeDefined();
  }
});
