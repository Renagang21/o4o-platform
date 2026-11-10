import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
const submit = jest.fn(),
  decide = jest.fn(),
  self = jest.fn(),
  policies = jest.fn();
const authority = jest.fn(),
  protect = jest.fn(),
  documentOwner = jest.fn(),
  upload = jest.fn();
jest.mock('../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../middleware/rateLimiter.js', () => ({
  apiLimiter: (_q: any, _s: any, next: any) => next(),
}));
jest.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!req.headers['x-user']) return res.sendStatus(401);
    req.user = { id: req.headers['x-user'] };
    req.authMethod = req.headers['x-method'];
    next();
  },
}));
jest.mock('../../services/admin/member-registration.service.js', () => ({
  MemberRegistrationService: jest
    .fn()
    .mockImplementation(() => ({ submit, decide, self, policies })),
}));
jest.mock('../../services/admin/central-member-workspace.service.js', () => ({
  memberWorkspaceAccess: (...args: any[]) => authority(...args),
}));
jest.mock('../../services/admin/member-identity-guards.js', () => ({
  assertRecoverableTarget: (...args: any[]) => protect(...args),
}));
jest.mock('../../services/admin/member-registration-data.js', () => ({
  assertRegistrationDocument: (...args: any[]) => documentOwner(...args),
  readRegistrationView: jest.fn(async () => null),
}));
import { createMemberRegistrationRoutes } from '../member-registration.routes.js';
import { OperationError } from '../../services/operations/operation-audit.js';
const actor = '11111111-1111-4111-8111-111111111111',
  target = '22222222-2222-4222-8222-222222222222';
const app = express();
app.use(express.json());
app.use(
  createMemberRegistrationRoutes(
    { query: jest.fn() } as unknown as DataSource,
    () => ({ upload }) as any,
  ),
);
const version = '2026-11-04T00:00:00.000001';
beforeEach(() => {
  jest.clearAllMocks();
  authority.mockResolvedValue({ manageAccount: false });
  protect.mockResolvedValue(undefined);
  submit.mockResolvedValue({ saved: true });
  decide.mockResolvedValue({ saved: true });
});
it('keeps every endpoint authenticated and central approval Google-only', async () => {
  expect((await request(app).post('/self').send({})).status).toBe(401);
  for (const method of ['password', 'kakao'])
    expect(
      (
        await request(app)
          .post(`/members/${target}/approve`)
          .set('x-user', actor)
          .set('x-method', method)
          .send({ version, reason: '확인' })
      ).status,
    ).toBe(403);
  expect(decide).not.toHaveBeenCalled();
  expect(authority).not.toHaveBeenCalled();
});
it('checks current delegated authority and protected targets before upload bytes or approval', async () => {
  authority.mockRejectedValue(
    new OperationError(403, 'MEMBER_DIRECTORY_REQUIRED', '위임 필요'),
  );
  const r = await request(app)
    .post(`/members/${target}/document`)
    .set('x-user', actor)
    .set('x-method', 'google')
    .attach('file', Buffer.from('synthetic'), 'test.pdf');
  expect(r.status).toBe(403);
  expect(upload).not.toHaveBeenCalled();
  authority.mockResolvedValue({ manageAccount: false });
  protect.mockRejectedValue(
    new OperationError(403, 'ADMIN_ACCOUNT_PROTECTED', '보호 계정'),
  );
  expect(
    (
      await request(app)
        .post(`/members/${target}/approve`)
        .set('x-user', actor)
        .set('x-method', 'google')
        .send({ version, reason: '확인' })
    ).status,
  ).toBe(403);
  expect(decide).not.toHaveBeenCalled();
});
it('passes only caller identity and strict applicant fields, never client-approved state or privilege', async () => {
  const input = {
    name: '합성 회원',
    nickname: '합성 별칭',
    phone: '01012345678',
    version,
    type: 'other',
    fields: {},
  };
  for (const extra of [
    { state: 'approved' },
    { userId: target },
    { role: 'platform:super_admin' },
    { fields: { licenseNumber: 'x' } },
  ]) {
    expect(
      (
        await request(app)
          .post('/self')
          .set('x-user', actor)
          .send({ ...input, ...extra })
      ).status,
    ).toBe(400);
  }
  expect(submit).not.toHaveBeenCalled();
  expect(
    (await request(app).post('/self').set('x-user', actor).send(input)).status,
  ).toBe(200);
  expect(submit).toHaveBeenCalledWith(actor, input);
});
it('accepts a nickname-only applicant: name and phone are optional (2026-11-09 S4 · S5)', async () => {
  const send = (body: unknown) => request(app).post('/self').set('x-user', actor).send(body);
  expect((await send({ nickname: '합성 별칭', version, type: 'other', fields: {} })).status).toBe(200);
  expect(submit).toHaveBeenLastCalledWith(actor, { name: '', nickname: '합성 별칭', phone: '', version, type: 'other', fields: {} });
  expect((await send({ nickname: '', version, type: 'other', fields: {} })).status).toBe(400);
});
it('requires version and reason and preserves conflicts without leaking database failures', async () => {
  const send = (body: unknown) =>
    request(app)
      .post(`/members/${target}/approve`)
      .set('x-user', actor)
      .set('x-method', 'google')
      .send(body);
  for (const input of [
    { reason: '확인' },
    { version, reason: '' },
    { version, reason: '확인', employeeTerminationConfirmed: true },
  ])
    expect((await send(input)).status).toBe(400);
  decide.mockRejectedValueOnce(
    new OperationError(409, 'MEMBER_CHANGED', '다시 조회'),
  );
  const conflict = await send({ version, reason: '확인' });
  expect(conflict.status).toBe(409);
  expect(conflict.headers['cache-control']).toContain('no-store');
  decide.mockRejectedValueOnce(new Error('private SQL payload'));
  const failure = await send({ version, reason: '확인' });
  expect(failure.status).toBe(503);
  expect(JSON.stringify(failure.body)).not.toContain('private SQL');
});
it('checks document ownership before reading a private stream', async () => {
  documentOwner.mockRejectedValue(
    new OperationError(403, 'REGISTRATION_DOCUMENT_FORBIDDEN', '서류 확인'),
  );
  const response = await request(app)
    .get(`/self/document/${target}`)
    .set('x-user', actor);
  expect(response.status).toBe(403);
  expect(documentOwner).toHaveBeenCalledWith(expect.anything(), actor, {
    businessRegistrationDocumentId: target,
  });
});

describe.each(['/self/document', `/members/${target}/document`])(
  'bounded document upload: %s',
  (path) => {
    const send = () =>
      request(app).post(path).set('x-user', actor).set('x-method', 'google');
    const pdf = (size: number) => {
      const bytes = Buffer.alloc(size);
      bytes.write('%PDF-1.4');
      return bytes;
    };
    it.each([7_999_999, 8_000_000])(
      'accepts one %i-byte file up to the 8MB bound',
      async (size) => {
        upload.mockResolvedValueOnce({ id: target });
        const response = await send().attach(
          'file',
          pdf(size),
          'synthetic.pdf',
        );
        expect(response.status).toBe(200);
        expect(upload).toHaveBeenCalledWith(
          path === '/self/document' ? actor : target,
          expect.objectContaining({
            size,
            buffer: expect.any(Buffer),
          }),
        );
      },
    );
    it.each([8_000_001])(
      'rejects a %i-byte file before document storage',
      async (size) => {
        const response = await send().attach(
          'file',
          pdf(size),
          'synthetic.pdf',
        );
        expect(response.status).toBe(400);
        expect(response.body.code).toBe('INVALID_DOCUMENT');
        expect(response.body.error).toContain('8MB 이하');
        expect(upload).not.toHaveBeenCalled();
      },
    );
    it('rejects non-file fields and a second file before document storage', async () => {
      expect(
        (
          await send()
            .field('userId', target)
            .attach('file', pdf(16), 'synthetic.pdf')
        ).status,
      ).toBe(400);
      expect(
        (
          await send()
            .attach('file', pdf(16), 'one.pdf')
            .attach('file', pdf(16), 'two.pdf')
        ).status,
      ).toBe(400);
      expect(upload).not.toHaveBeenCalled();
    });
  },
);
