import express from 'express';
import request from 'supertest';
import { sqlInjectionDetection } from '../securityMiddleware.js';
import { logSecurityEvent } from '../../services/SecurityAuditService.js';

jest.mock('../../services/SecurityAuditService.js', () => ({
  isIPBlocked: jest.fn(() => false), logSecurityEvent: jest.fn(), securityAuditService: {},
}));

const token = 'a'.repeat(20) + '--' + 'b'.repeat(21);
const code = 'Synthetic--OAuth_code.sp_value';
const idToken = 'header.payload.signature--opaque';
const callback = '/api/v1/auth/social/kakao/callback';
const proofPaths = ['kakao/complete', 'reauth/complete', 'link/verify'];
const tokenPaths = [...proofPaths, 'kakao/signup', 'link/start', 'link/confirm'];

function app() {
  const server = express();
  server.use(express.json());
  server.use(sqlInjectionDetection);
  // Reaching the route does not authenticate a caller; actual flow/identity validators run later.
  server.use((_req, res) => res.status(401).json({code:'SOCIAL_FLOW_INVALID'}));
  return server;
}

describe('SQL detection respects bounded opaque social proofs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets a Kakao callback reach flow validation with URL-safe opaque code/state', async () => {
    const result = await request(app()).get(callback).query({state:token,code});
    expect(result.status).toBe(401);
    expect(result.body.code).toBe('SOCIAL_FLOW_INVALID');
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });

  it('preserves the original proof with production security-before-body-parser ordering', async () => {
    const server = express();
    server.use(sqlInjectionDetection);
    server.use(express.json());
    server.use((req, res) => res.status(401).json({
      code:'SOCIAL_FLOW_INVALID', unchanged:req.query.code===code && req.query.state===token,
    }));
    const result = await request(server).get(callback).query({state:token,code});
    expect(result.status).toBe(401);
    expect(result.body.unchanged).toBe(true);
  });

  it.each(tokenPaths)('lets the registered POST %s carry a generated flow token', async path => {
    expect((await request(app()).post('/api/v1/auth/social/'+path).send({token})).status).toBe(401);
  });

  it.each(proofPaths)('lets POST %s carry bounded code and signed ID token', async path => {
    expect((await request(app()).post('/api/v1/auth/social/'+path).send({token,code,idToken})).status).toBe(401);
  });

  it.each([
    ['GET', '/api/v1/auth/social/kakao/config', 'query', {code}],
    ['GET', '/api/v1/auth/social/kakao/complete', 'query', {token}],
    ['POST', callback, 'body', {code}],
    ['POST', '/api/v1/auth/social/kakao/signup', 'body', {code}],
    ['POST', '/api/v1/auth/social/link/start', 'body', {idToken}],
    ['POST', '/api/v1/auth/social/unknown', 'body', {token}],
    ['POST', '/api/v1/auth/email/login', 'body', {token}],
    ['POST', '/api/v1/auth/social/kakao/complete', 'query', {token}],
  ] as const)('keeps detection on %s %s %s outside the exact field contract', async (method,path,section,data) => {
    const call = method==='GET' ? request(app()).get(path) : request(app()).post(path);
    const result = section==='query' ? await call.query(data) : await call.send(data);
    expect(result.status).toBe(400);
    expect(result.body.message).toBe('Your request contains invalid characters');
  });

  it.each([
    {state:token,code:"abc'; DROP TABLE users;--"},
    {state:token,code:code+';'},
    {state:token,code:'x'.repeat(2049)+'--'},
    {state:token+'--',code:'safe'},
    {state:token,code,search:'select value from users'},
  ])('does not exempt SQL text, oversize proof, or unrelated callback fields', async query => {
    expect((await request(app()).get(callback).query(query)).status).toBe(400);
  });

  it('retains detection for unrelated body fields and redacts all proof values from audit logs', async () => {
    const result = await request(app()).post('/api/v1/auth/social/kakao/complete').send({token,code,idToken,name:'select value from users'});
    expect(result.status).toBe(400);
    const audit = (logSecurityEvent as jest.Mock).mock.calls[0][0];
    expect(audit.details.matchedFields.body).toEqual(['name']);
    const logged = JSON.stringify(audit);
    for (const value of [token,code,idToken,'select value from users']) expect(logged).not.toContain(value);
  });
});
