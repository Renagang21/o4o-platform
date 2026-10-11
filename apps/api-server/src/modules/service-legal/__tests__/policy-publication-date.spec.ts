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


describe('새 공통 계정 문서의 게시 준비', () => {
  it.each([
    ['content', undefined], ['content', null], ['content', 42], ['content', {}],
    ['content', ''], ['content', ' \n\t '],
    ['title', undefined], ['title', null], ['title', 42], ['title', {}],
    ['title', ''], ['title', ' \n\t '],
  ])('%s=%j: 읽을 수 없는 draft는 기존 공개 문서를 내리기 전에 거부한다', async (field, value) => {
    const { app, execute, repo, doc } = harness(new Date(Date.now() - 1000));
    Object.assign(doc, { slug: 'neture-account-terms', [field as string]: value });
    const before = { ...doc };
    const result = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'publish' });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('POLICY_DISPLAY_FIELDS_REQUIRED');
    expect(execute).not.toHaveBeenCalled();
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(doc).toEqual(before);
  });

  it('일반 서비스 정책에도 본문 검증을 적용한다', async () => {
    const { app, execute, repo, doc } = harness(null);
    Object.assign(doc, { content: ' ', version: 1 });
    const result = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'publish' });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('POLICY_DISPLAY_FIELDS_REQUIRED');
    expect(execute).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('불완전한 문서의 게시 해제는 허용한다', async () => {
    const { app, execute, repo, doc } = harness(null);
    Object.assign(doc, { content: '', title: '', status: 'published' });
    const result = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'unpublish' });
    expect(result.status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });

  it('공백이 포함된 실제 본문은 원문 그대로 게시한다', async () => {
    const { app, execute, repo, doc } = harness(new Date(Date.now() - 1000));
    Object.assign(doc, { title: ' Account terms ', content: ' \nComplete terms\n ', slug: 'neture-account-terms' });
    const result = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'publish' });
    expect(result.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ title: ' Account terms ', content: ' \nComplete terms\n ', status: 'published' }));
  });

  it.each([
    ['published', null, 'neture-account-terms', 'PUBLISHED_POLICY_IMMUTABLE'],
    ['published', 'neture-account-terms', null, 'PUBLISHED_POLICY_IMMUTABLE'],
    ['published', 'legacy-neture', 'changed-legacy', 'PUBLISHED_POLICY_IMMUTABLE'],
    ['draft', null, 'neture-account-terms', 'COMMON_ACCOUNT_POLICY_MARKER_IMMUTABLE'],
    ['draft', 'neture-account-terms', null, 'COMMON_ACCOUNT_POLICY_MARKER_IMMUTABLE'],
  ])('%s의 표식 %s→%s 변경은 저장 전에 거부한다', async (status, slug, nextSlug, code) => {
    const { app, execute, repo, doc } = harness(new Date());
    Object.assign(doc, { status, slug });
    const before = { ...doc };
    const result = await request(app).put('/api/v1/admin/services/neture/policies/draft-id').send({ slug: nextSlug });
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe(code);
    expect(repo.save).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(doc).toEqual(before);
  });

  it('새 공통 draft의 동일 표식 유지와 본문 수정은 허용한다', async () => {
    const { app, repo, doc } = harness(new Date());
    Object.assign(doc, { slug: 'neture-account-terms' });
    const result = await request(app).put('/api/v1/admin/services/neture/policies/draft-id').send({ slug: 'neture-account-terms', content: 'Reviewed common body' });
    expect(result.status).toBe(200);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ slug: 'neture-account-terms', content: 'Reviewed common body' }));
  });

  it.each([{ version: 1, effective: new Date() }, { version: 2, effective: null }])('%j: marker만 붙인 구 버전/미정 시행일은 기존 문서를 바꾸지 않는다', async ({ version, effective }) => {
    const { app, execute, repo, doc } = harness(effective);
    Object.assign(doc, { version, slug: 'neture-account-terms' });
    const result = await request(app).patch('/api/v1/admin/services/neture/policies/draft-id/publish').send({ action: 'publish' });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('COMMON_ACCOUNT_POLICY_NOT_READY');
    expect(execute).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
