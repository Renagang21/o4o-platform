import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createAutomationJobRouter } from '../modules/automation/controllers/automation-job.controller.js';

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: () => void) => {
    const role = req.headers['x-test-role'];
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    req.user = { id: '00000000-0000-4000-8000-000000000001', roles: [role] };
    next();
  },
}));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@google-cloud/storage', () => ({ Storage: jest.fn().mockImplementation(() => ({})) }));

describe('Automation job HTTP authorization and validation', () => {
  const app = express();
  app.use(express.json());
  app.use(createAutomationJobRouter({ getRepository: () => ({}) } as unknown as DataSource));
  const job = '/automation-jobs/00000000-0000-4000-8000-000000000001';

  test('anonymous requests are denied', async () => {
    expect((await request(app).get('/automation-jobs')).status).toBe(401);
    expect((await request(app).post(`${job}/assets`).send({})).status).toBe(401);
  });
  test.each(['neture:operator', 'supplier', 'kpa:admin', 'admin', 'super_admin'])(
    'role %s cannot read jobs or link assets (platform admin only)',
    async (role) => {
      expect((await request(app).get('/automation-jobs').set('x-test-role', role)).status).toBe(403);
      expect((await request(app).post('/automation-jobs').set('x-test-role', role).send({ title: 'x' })).status).toBe(403);
      expect(
        (await request(app).post(`${job}/assets`).set('x-test-role', role).send({ mediaAssetId: 'x', purpose: 'INPUT' })).status,
      ).toBe(403);
      expect((await request(app).post(`${job}/cleanup`).set('x-test-role', role).send({ decision: 'KEEP_ALL' })).status).toBe(403);
      // 완성 영상 임시 output — 등록·상태·다운로드·제거 모두 같은 platform admin 경계
      expect((await request(app).get(`${job}/temp-output`).set('x-test-role', role)).status).toBe(403);
      expect((await request(app).get(`${job}/temp-output/download`).set('x-test-role', role)).status).toBe(403);
      expect((await request(app).post(`${job}/temp-output`).set('x-test-role', role).attach('file', Buffer.from('x'), 'a.mp4')).status).toBe(403);
      expect((await request(app).delete(`${job}/temp-output`).set('x-test-role', role)).status).toBe(403);
    },
  );
  test('temp output: anonymous denied; object key is never a route input (bucket path cannot be addressed via API)', async () => {
    expect((await request(app).get(`${job}/temp-output/download`)).status).toBe(401);
    expect((await request(app).post(`${job}/temp-output`).attach('file', Buffer.from('x'), 'a.mp4')).status).toBe(401);
    const admin = 'platform:super_admin';
    const notUuid = await request(app).get('/automation-jobs/not-a-uuid/temp-output/download').set('x-test-role', admin);
    expect(notUuid.status).toBe(400);
    expect(notUuid.body.code).toBe('INVALID_UUID');
    // object key 로 직접 받는 경로는 존재하지 않는다
    expect((await request(app).get('/automation-jobs/temp-output/video-jobs/x/y.mp4').set('x-test-role', admin)).status).toBe(404);
    // multipart 없이 등록 → 파일 필수
    const noFile = await request(app).post(`${job}/temp-output`).set('x-test-role', admin).send({});
    expect(noFile.status).toBe(400);
    expect(noFile.body.code).toBe('TEMP_OUTPUT_FILE_REQUIRED');
    // 영상이 아닌 파일은 upload middleware 가 아니라 서비스가 거부한다 (image 는 middleware 허용 목록)
    const png = await request(app).post(`${job}/temp-output`).set('x-test-role', admin).attach('file', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });
    expect(png.status).toBe(400);
    expect(png.body.code).toBe('TEMP_OUTPUT_VIDEO_ONLY');
  });
  test('platform admin gets bad-input errors before any DB access', async () => {
    const admin = 'platform:super_admin';
    const bad = await request(app).post('/automation-jobs').set('x-test-role', admin).send([]);
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_BODY');
    const notUuid = await request(app).get('/automation-jobs/not-a-uuid/cleanup-preview?decision=KEEP_ALL').set('x-test-role', admin);
    expect(notUuid.status).toBe(400);
    expect(notUuid.body.code).toBe('INVALID_UUID');
    const badDecision = await request(app).post(`${job}/cleanup`).set('x-test-role', admin).send({ decision: 'DELETE_ALL' });
    expect(badDecision.status).toBe(400);
    expect(badDecision.body.code).toBe('INVALID_CLEANUP_DECISION');
    const badPurpose = await request(app)
      .post(`${job}/assets`)
      .set('x-test-role', admin)
      .send({ mediaAssetId: '00000000-0000-4000-8000-000000000002', purpose: 'TEMPORARY' });
    expect(badPurpose.status).toBe(400);
    expect(badPurpose.body.code).toBe('INVALID_PURPOSE');
  });
});
