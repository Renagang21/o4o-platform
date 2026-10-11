import express from 'express';
import request from 'supertest';
import { createAdminServiceLegalController } from '../admin-service-legal.controller.js';

jest.mock('../../../middleware/auth.middleware.js', () => ({ authenticate: (_req: any, _res: any, next: any) => next() }));
jest.mock('../service-legal-scope.js', () => ({
  requireServiceLegalScope: () => (_req: any, _res: any, next: any) => next(),
  isSupportedPolicyDocumentType: () => true,
}));
jest.mock('@o4o/action-log-core', () => ({ ActionLogService: class { async logSuccess() {} } }));

function harness(effective: Date | null) {
  const doc = { id: 'draft-id', service_key: 'neture', document_type: 'terms', status: 'draft', effective_date: effective, version: 2, title: 'T', content: 'Body' };
  const execute = jest.fn(async () => ({}));
  const builder: any = {};
  for (const name of ['update', 'set', 'where']) builder[name] = jest.fn(() => builder);
  builder.execute = execute;
  const repo = { findOne: jest.fn(async () => doc), createQueryBuilder: jest.fn(() => builder), save: jest.fn(async (value: any) => value) };
  const app = express();
  app.use(express.json());
  app.use('/api/v1/admin/services', createAdminServiceLegalController({ getRepository: () => repo } as any));
  return { app, repo, execute, doc };
}

describe('게시 전 시행일 방어 — 기존 published를 보존', () => {
  it('미래 시행 문서는 409이며 기존 published나 draft를 수정하지 않는다', async () => {
    const { app, repo, execute, doc } = harness(new Date(Date.now() + 31 * 86400000));
    const res = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'publish' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('POLICY_NOT_YET_EFFECTIVE');
    expect(execute).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(doc.status).toBe('draft');
  });
  it('시행 시점에 도달한 draft만 즉시 게시한다', async () => {
    const { app, repo, execute } = harness(new Date(Date.now() - 1000));
    const res = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'publish' });
    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
  });
  it('공고 중 draft의 게시 해제는 기존 공개 문서에 영향을 주지 않는다', async () => {
    const { app, execute, doc } = harness(new Date(Date.now() + 31 * 86400000));
    const res = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'unpublish' });
    expect(res.status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
    expect(doc.status).toBe('draft');
  });
});


it('한국 시행일 자정에는 controller가 새 문서를 게시한다(UTC로는 전날)', async () => {
  jest.useFakeTimers({ doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  jest.setSystemTime(new Date('2026-11-09T15:00:00Z'));
  try {
    const { app, repo, execute } = harness(new Date('2026-11-10'));
    const res = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'publish' });
    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
  } finally { jest.useRealTimers(); }
});
