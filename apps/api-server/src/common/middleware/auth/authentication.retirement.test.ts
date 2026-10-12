const mockVerify = jest.fn();
const mockRepository = jest.fn();
jest.mock('../../../utils/token.utils.js', () => ({ verifyAccessToken: (...args: unknown[]) => mockVerify(...args), isServiceToken: jest.fn() }));
jest.mock('../../../database/connection.js', () => ({ AppDataSource: { getRepository: (...args: unknown[]) => mockRepository(...args) } }));
import { requireAuth, optionalAuth } from './authentication.middleware.js';
beforeEach(() => { jest.clearAllMocks(); mockVerify.mockReturnValue({ userId: 'user', serviceKey: 'pharmacy-hub', tokenType: 'user' }); });
it('rejects a verified PH access token before database authentication', async () => {
 const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() }; const next = jest.fn();
 await requireAuth({ headers: { authorization: 'Bearer fixture' }, cookies: {} } as any, res, next);
 expect(res.status).toHaveBeenCalledWith(401);
 expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SERVICE_SESSION_REVOKED' }));
 expect(next).not.toHaveBeenCalled(); expect(mockRepository).not.toHaveBeenCalled();
});
it('treats a retired token as anonymous on optional routes', async () => {
 const req: any = { headers: { authorization: 'Bearer fixture' }, cookies: {} }; const next = jest.fn();
 await optionalAuth(req, {} as any, next);
 expect(next).toHaveBeenCalled(); expect(req.user).toBeUndefined(); expect(mockRepository).not.toHaveBeenCalled();
});
