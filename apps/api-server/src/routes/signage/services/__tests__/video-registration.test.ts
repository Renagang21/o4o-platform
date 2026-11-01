import 'reflect-metadata';
jest.mock('@o4o-apps/digital-signage-core/entities', () => ({ SignageMedia: class {} }), { virtual: true });
import { registerVideo } from '../video-registration.service.js';

const scope = { actorId: 'actor', serviceKey: 'kpa-society', organizationId: 'store' };
const input = { requestId: '90000000-0000-4000-a000-000000000001', name: '약국 안내', sourceUrl: 'https://youtu.be/abcdefghijk', tags: ['안내'] };
function database() {
  const rows = new Map<string, any>();
  const repo = { findOne: jest.fn(async ({where}: any) => rows.get(where.id) ?? null), create: jest.fn((row: any) => row), save: jest.fn(async (row: any) => { rows.set(row.id, row); return row; }) };
  const query = jest.fn(async () => []);
  const db = { transaction: async (fn: any) => fn({ query, getRepository: () => repo }) } as any;
  return { db, repo, query, rows };
}
describe('video registration persistence', () => {
  it('returns the committed row for a lost-response retry, with one insert and normalized URL', async () => {
    const {db, repo, query} = database();
    const first = await registerVideo(db, scope, input);
    const second = await registerVideo(db, scope, input);
    expect(first.id).toBe(second.id);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), expect.any(Array));
    expect(first.sourceUrl).toBe('https://www.youtube.com/watch?v=abcdefghijk');
  });
  it('rejects reuse of a request for changed content', async () => {
    const {db, repo} = database();
    await registerVideo(db, scope, input);
    await expect(registerVideo(db, scope, {...input, name: '변경'})).rejects.toMatchObject({statusCode: 409});
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
  it('binds request identity and ownership to the server actor and destination', async () => {
    const {db, repo} = database();
    await registerVideo(db, scope, {...input, source: 'hq', scope: 'global', createdByUserId: 'other'} as any);
    await registerVideo(db, {...scope, organizationId: 'other-store'}, input);
    const rows = repo.save.mock.calls.map(c => c[0]);
    expect(rows[0]).toMatchObject({createdByUserId: 'actor', organizationId: 'store', source: 'store', scope: 'store'});
    expect(rows[0].id).not.toBe(rows[1].id);
  });
  it('rejects channel/Studio URLs and invalid AI metadata without any write', async () => {
    const {db, repo} = database();
    for (const url of ['https://studio.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg', 'https://www.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg', 'https://youtube.com.evil.test/watch?v=abcdefghijk'])
      await expect(registerVideo(db, scope, {...input, sourceUrl: url})).rejects.toMatchObject({statusCode: 400});
    await expect(registerVideo(db, scope, {...input, tags: [12] as any})).rejects.toMatchObject({statusCode: 400});
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('does not resurrect a deleted registration on retry', async () => {
    const {db, rows} = database();
    const row = await registerVideo(db, scope, input);
    rows.get(row.id).deletedAt = new Date();
    await expect(registerVideo(db, scope, input)).rejects.toMatchObject({statusCode: 410});
  });
});
