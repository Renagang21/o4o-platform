import express from 'express';
import request from 'supertest';

jest.mock('../../controllers/google-auth.controller.js', () => ({ GoogleAuthController: {
  config: (_req: any, res: any) => res.json({ enabled: true }),
  login: (req: any, res: any) => res.status(req.body.idToken === 'synthetic-success' ? 200 : 401).json({ success: req.body.idToken === 'synthetic-success' }),
  signup: (_req: any, res: any) => res.status(401).json({ success: false }),
} }));
jest.mock('../../controllers/email-auth.controller.js', () => ({ EmailAuthController: {
  login: (_req: any, res: any) => res.status(401).json({ success: false }),
} }));

import authRoutes from '../auth.routes.js';

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
const post = (ip: string, path = '/api/v1/auth/google/login', body: object = { idToken: 'synthetic-rejected' }) =>
  request(app).post(path).set('X-Forwarded-For', ip).send(body);

describe('actual auth router Google attempt limits', () => {
  it('rejects the sixth failed Google login and shares its bucket with the legacy alias', async () => {
    for (let i = 0; i < 5; i++) expect((await post('10.38.1.1')).status).toBe(401);
    const denied = await post('10.38.1.1', '/api/auth/google/login');
    expect(denied.status).toBe(429);
    expect(denied.body.code).toBe('RATE_LIMITED');
    expect(denied.headers['retry-after']).toBeDefined();
    expect((await post('10.38.1.2')).status).toBe(401);
  });
  it('successful logins do not consume the failure quota', async () => {
    for (let i = 0; i < 8; i++) expect((await post('10.38.2.1', undefined, { idToken: 'synthetic-success' })).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await post('10.38.2.1')).status).toBe(401);
    expect((await post('10.38.2.1')).status).toBe(429);
  });
  it('email login failures do not use up the independent Google bucket', async () => {
    for (let i = 0; i < 5; i++) expect((await post('10.38.3.1', '/api/v1/auth/email/login', { email: 'fixture@example.invalid', password: 'fixture123!' })).status).toBe(401);
    expect((await post('10.38.3.1', '/api/v1/auth/email/login', { email: 'fixture@example.invalid', password: 'fixture123!' })).status).toBe(429);
    expect((await post('10.38.3.1')).status).toBe(401);
  });
  it('Google signup has a separate ten-request bucket and checks it before DTO work', async () => {
    // Invalid DTO still consumes the signup quota. No provider or account is contacted.
    for (let i = 0; i < 10; i++) expect((await post('10.38.4.1', '/api/v1/auth/google/signup', {})).status).toBe(400);
    expect((await post('10.38.4.1', '/api/v1/auth/google/signup', {})).status).toBe(429);
    expect((await post('10.38.4.1')).status).toBe(401);
  });
});
