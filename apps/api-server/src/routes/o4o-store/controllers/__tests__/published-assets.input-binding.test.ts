import express from 'express';
import request from 'supertest';
import { createPublishedAssetsController } from '../published-assets.controller.js';
import { buildPublishedAssetQuery } from '../../../kpa/helpers/asset-render-filter.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const SNAPSHOT = '22222222-2222-4222-8222-222222222222';

function app(query: jest.Mock) {
  const server = express();
  server.use('/published-assets', createPublishedAssetsController({ query } as never));
  return server;
}

describe('published assets — request input never becomes SQL text', () => {
  it('binds the channel as a parameter in the list query and its count query', () => {
    const filter = buildPublishedAssetQuery(ORG, 'home', { assetType: 'cms', page: 2, limit: 10 });
    for (const sql of [filter.query, filter.countQuery]) expect(sql).not.toContain("'home'");
    expect(filter.countQuery).toContain('(c.channel_map->>$2)::boolean = true');
    expect(filter.countQuery).toContain('s.asset_type = $3');
    expect(filter.countParams).toEqual([ORG, 'home', 'cms']);
    expect(filter.params).toEqual([ORG, 'home', 'cms', 10, 10]);
    expect(filter.query).toContain('LIMIT $4 OFFSET $5');
  });

  it('rejects a malformed channel inside the query builder as well', () => {
    expect(() => buildPublishedAssetQuery(ORG, "home'--", {})).toThrow('INVALID_CHANNEL');
  });

  it('answers 400 for a malformed channel or id without touching the database', async () => {
    const query = jest.fn();
    for (const path of [
      `/published-assets/${ORG}?channel=${encodeURIComponent("x')::boolean OR true --")}`,
      `/published-assets/${ORG}/${SNAPSHOT}?channel=${encodeURIComponent('Home Page')}`,
      '/published-assets/not-a-uuid',
      `/published-assets/${ORG}/not-a-uuid`,
    ]) {
      const response = await request(app(query)).get(path);
      expect(response.status).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it('passes a valid channel to the detail query as $3', async () => {
    const query = jest.fn().mockResolvedValue([{ id: SNAPSHOT }]);
    const response = await request(app(query)).get(`/published-assets/${ORG}/${SNAPSHOT}?channel=signage`);
    expect(response.status).toBe(200);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('(c.channel_map->>$3)::boolean = true');
    expect(sql).not.toContain("'signage'");
    expect(params).toEqual([ORG, SNAPSHOT, 'signage']);
  });

  it('does not expose internal error text in the public response', async () => {
    const query = jest.fn().mockRejectedValue(new Error('relation "secret_table" does not exist'));
    const response = await request(app(query)).get(`/published-assets/${ORG}`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('secret_table');
  });
});
