import express from 'express';
import request from 'supertest';
import { rejectRetiredService } from '../retired-service.middleware.js';

const app = express();
app.use(express.json());
app.use('/api', rejectRetiredService);
const downstream = jest.fn((_req, res) => res.json({ success: true }));
app.use('/api', downstream);
beforeEach(() => downstream.mockClear());

it.each([
  '/api/v1/store/membership?serviceKey=pharmacy-hub',
  '/api/v1/store/membership?serviceKey[]=kpa&serviceKey[]=pharmacy-hub',
  '/api/v1/pharmacy-hub/join',
  '/api/v1/cms/pharmacy%2Dhub/items',
  '/api/v1/store/pharmacy-hub-event-offer/items',
])('rejects retired request %s before service-neutral handlers', async url => {
  expect((await request(app).get(url)).status).toBe(410);
  expect(downstream).not.toHaveBeenCalled();
});
it.each(['serviceKey', 'service_key', 'serviceCode', 'service_code', 'sourceService'])('rejects retired body scope %s', async key => {
  expect((await request(app).post('/api/v1/store/items').send({ [key]: 'pharmacy-hub' })).status).toBe(410);
  expect(downstream).not.toHaveBeenCalled();
});
it.each(['/api/v1/store/membership?serviceKey=kpa', '/api/v1/store/membership', '/api/v1/hospital-pharmacy/tasks'])('preserves current API %s', async url => {
  expect((await request(app).get(url)).status).toBe(200);
  expect(downstream).toHaveBeenCalledTimes(1);
});
