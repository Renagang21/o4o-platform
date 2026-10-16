import express from 'express';
import request from 'supertest';
import { requirePharmacyFeature } from '../service-feature-access.js';

function server(query: jest.Mock, organizationId: string | undefined = 'store') {
  const app = express();
  app.use((req, _res, next) => { req.organizationId = organizationId; next(); });
  app.post('/execute', requirePharmacyFeature({ query }, 'tablet'), (_req, res) => res.json({ executed: true }));
  return app;
}
it('retains other store domains and denies unresolved organization scope', async () => {
  expect((await request(server(jest.fn().mockResolvedValue([]))).post('/execute')).body.executed).toBe(true);
  const query = jest.fn();
  expect((await request(server(query, '')).post('/execute')).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
});
it('requires the active pharmacy and rejects unavailable reads without running the action', async () => {
  expect((await request(server(jest.fn().mockResolvedValue([{ status: 'suspended' }]))).post('/execute')).status).toBe(403);
  const response = await request(server(jest.fn().mockRejectedValue(new Error('private')))).post('/execute');
  expect(response.status).toBe(503);
  expect(response.body.executed).toBeUndefined();
  expect(JSON.stringify(response.body)).not.toContain('private');
});
it('allows a paid owner for free staff and denies an unqualified owner', async () => {
  for (const paid of [true, false]) {
    const query = jest.fn().mockResolvedValueOnce([{ status: 'active' }]).mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ownerUserId: 'owner' }]).mockResolvedValueOnce(paid ? [{ user_id: 'owner' }] : []);
    const response = await request(server(query)).post('/execute');
    expect(response.status).toBe(paid ? 200 : 403);
    expect(query.mock.calls[3][1]).toEqual(['owner']);
  }
});
