import express from 'express';
import request from 'supertest';
import { createPublicServiceLegalController } from '../public-service-legal.controller.js';

function makeApp() {
  const findOne = jest.fn(async ({ where }: any) => ({
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', service_key: where.service_key,
    document_type: where.document_type, title: 'Fixture terms', content: 'Published fixture body',
    version: 2, status: 'published', effective_date: null, published_at: null,
  }));
  const db = { getRepository: () => ({ findOne }) };
  const app = express();
  app.use('/public/services', createPublicServiceLegalController(db as any));
  return { app, findOne };
}

describe('canonical 서비스의 게시 문서 공개 조회', () => {
  it.each(['supplier', 'funding', 'community', 'kpa-branch'])('%s: 동의 gate의 본문은 현재 published 문서로 조회한다', async serviceKey => {
    const { app, findOne } = makeApp();
    const result = await request(app).get(`/public/services/${serviceKey}/policies/terms`);
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ serviceKey, documentType: 'terms', version: 2, content: 'Published fixture body' });
    expect(findOne).toHaveBeenCalledWith({ where: { service_key: serviceKey, document_type: 'terms', status: 'published' }, order: { published_at: 'DESC', version: 'DESC' } });
  });

  it.each(['store', 'unregistered-fixture'])('%s: workspace나 미등록 키를 서비스로 취급하지 않는다', async serviceKey => {
    const { app, findOne } = makeApp();
    expect((await request(app).get(`/public/services/${serviceKey}/policies/terms`)).status).toBe(404);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('미게시 문서는 404이고 공급자 법정정보는 독립 scope로 조회한다', async () => {
    const { app, findOne } = makeApp();
    findOne.mockResolvedValueOnce(null as any);
    expect((await request(app).get('/public/services/supplier/policies/terms')).status).toBe(404);
    expect((await request(app).get('/public/services/supplier/legal-profile')).status).toBe(200);
    expect(findOne).toHaveBeenCalledTimes(2);
  });
});
