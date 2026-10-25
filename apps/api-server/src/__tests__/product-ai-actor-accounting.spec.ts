/** Product permissions precede AI, verified actors reach all interactive billing paths, failure stops fan-out. */
import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';

const managedCall = jest.fn();
const policyCall = jest.fn();
jest.mock('../services/ai-extensions/accounted-runtime.js', () => ({ executeManagedAccountedAi: (...args: unknown[]) => managedCall(...args) }));
jest.mock('../modules/ai-policy/ai-policy-factory.js', () => ({ createPolicyExecutor: () => ({ execute: (...args: unknown[]) => policyCall(...args) }) }));
jest.mock('../middleware/auth.middleware.js', () => ({
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const id = req.headers['x-test-user'];
    if (!id) return res.status(401).json({ success: false });
    (req as unknown as { user: unknown }).user = { id };
    next();
  },
}));

import { createProductAiTagRouter } from '../modules/store-ai/controllers/product-ai-tag.controller.js';
import { createProductAiContentRouter } from '../modules/store-ai/controllers/product-ai-content.controller.js';
import { ProductAiTaggingService } from '../modules/store-ai/services/product-ai-tagging.service.js';
import { ProductAiContentService } from '../modules/store-ai/services/product-ai-content.service.js';

const product = { id: '11111111-1111-4111-8111-111111111111', regulatoryName: '테스트', marketingName: '테스트', manufacturerName: '제조사', existingTags: [] };
const actor = 'verified-admin';
const repo = { find: jest.fn(async () => []), findOne: jest.fn(async () => null), create: jest.fn(row => row), save: jest.fn(async row => row), update: jest.fn(async () => ({})), delete: jest.fn(async () => ({})) };
const db = {
  getRepository: () => repo,
  query: jest.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes('FROM role_assignments')) return params[0] === actor ? [{ ok: 1 }] : [];
    if (sql.includes('FROM product_masters')) return [product];
    return [];
  }),
} as unknown as DataSource;
const app = express();
app.use(express.json());
app.use('/products', createProductAiTagRouter(db));
app.use('/products', createProductAiContentRouter(db));
const path = `/products/${product.id}`;
const post = (suffix: string, user = actor, body = {}) => request(app).post(path + suffix).set('x-test-user', user).send(body);
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
beforeEach(() => {
  jest.clearAllMocks();
  managedCall.mockResolvedValue({ content: JSON.stringify({ tags: [{ tag: '테스트', confidence: 0.9 }] }), model: 'normal' });
  policyCall.mockResolvedValue({ content: JSON.stringify({ content: '제작된 초안' }), model: 'normal' });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('suggestion uses authorized user, ignoring forged accounting claims', async () => {
  await post('/ai-tags/suggest', actor, { purpose: 'b2b', userId: 'forged', serviceKey: 'forged' }).expect(200);
  expect(managedCall).toHaveBeenCalledWith(db, 'product.tagging', expect.anything(), { scope: 'PRODUCT_TAGGING', userId: actor });
  expect(repo.save).not.toHaveBeenCalled();
});

it.each(['/ai-tags/suggest', '/ai-tags/regenerate', '/ai-contents/generate', '/ai-contents/generate/pop_short'])('%s rejects unauthorized users before AI and writes', async suffix => {
  await post(suffix, 'plain').expect(403);
  await request(app).post(path + suffix).send({}).expect(401);
  expect(managedCall).not.toHaveBeenCalled();
  expect(policyCall).not.toHaveBeenCalled();
  expect(repo.save).not.toHaveBeenCalled();
});

it.each(['QUOTA_EXCEEDED', 'AI_QUOTA_UNAVAILABLE'])('tag %s does not write tags or launch five downstream paid generations', async code => {
  managedCall.mockRejectedValueOnce(new Error(code));
  await post('/ai-tags/regenerate', actor, { userId: 'forged' }).expect(200); // existing asynchronous response
  await flush();
  expect(managedCall).toHaveBeenCalledTimes(1);
  expect(policyCall).not.toHaveBeenCalled();
  expect(repo.save).not.toHaveBeenCalled();
});

it('successful tag generation propagates verified actor to all five downstream content types', async () => {
  await post('/ai-tags/regenerate', actor, { userId: 'forged' }).expect(200);
  await flush();
  expect(managedCall).toHaveBeenCalledWith(db, 'product.tagging', expect.anything(), { scope: 'PRODUCT_TAGGING', userId: actor });
  expect(policyCall).toHaveBeenCalledTimes(5);
  for (const call of policyCall.mock.calls) expect(call[3]).toEqual({ userId: actor });
});

it.each([['/ai-contents/generate', 5], ['/ai-contents/generate/pop_short', 1]] as const)('content route %s keeps verified actor through execution', async (suffix, count) => {
  await post(suffix, actor, { userId: 'forged' }).expect(200);
  await flush();
  expect(policyCall).toHaveBeenCalledTimes(count);
  for (const call of policyCall.mock.calls) expect(call[3]).toEqual({ userId: actor });
});

it('server-owned content jobs do not inherit or invent a user', async () => {
  await new ProductAiContentService(db).generateAllContents(product);
  expect(policyCall).toHaveBeenCalledTimes(5);
  for (const call of policyCall.mock.calls) expect(call[3]).toEqual({ userId: undefined });
});

it('invalid tag output fails quietly without saving or exposing generated text', async () => {
  managedCall.mockResolvedValueOnce({ content: 'sensitive-generated-output', model: 'normal' });
  await expect(new ProductAiTaggingService(db).generateTags(product, actor)).resolves.toBe(false);
  expect(repo.save).not.toHaveBeenCalled();
  expect(JSON.stringify(jest.mocked(console.error).mock.calls)).not.toContain('sensitive-generated-output');
});
