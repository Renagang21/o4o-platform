/** Actual SQL boundaries; temporary tables stay on one isolated test connection. */
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { ForumQueryService } from '../forum-query.service.js';

const url = process.env.NETURE_PHARMACY_IT_DATABASE_URL;
const databaseTests = url ? describe : describe.skip;
let database: DataSource;

databaseTests('Forum summary storage boundaries — isolated PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (!['127.0.0.1', 'localhost'].includes(target.hostname)) throw new Error('Use an isolated local test database');
    database = new DataSource({ type: 'postgres', url, entities: [], synchronize: false, logging: false });
    await database.initialize();
  });
  afterAll(async () => { if (database?.isInitialized) await database.destroy(); });

  async function withFixtures(check: (manager: EntityManager, organizationId: string) => Promise<void>) {
    await database.transaction(async manager => {
      await manager.query(`
        CREATE TEMP TABLE users(id uuid PRIMARY KEY, name text, nickname text) ON COMMIT DROP;
        CREATE TEMP TABLE forum_category_requests(id uuid PRIMARY KEY, name text, icon_emoji text, service_code text,
          status text, forum_type text, organization_id uuid) ON COMMIT DROP;
        CREATE TEMP TABLE forum_post(id uuid PRIMARY KEY, forum_id uuid, author_id uuid, title text,
          status text, organization_id uuid, created_at timestamptz) ON COMMIT DROP;
        CREATE TEMP TABLE forum_comment(id uuid PRIMARY KEY, "postId" uuid, created_at timestamptz) ON COMMIT DROP;
      `);
      const organizationId = randomUUID();
      for (const [name, code, count, closed, org, status] of [
        ['pharmacist', 'kpa-society', 2, false, null, 'completed'],
        ['pharmacist alias', 'pharmacy-hub', 1, false, null, 'completed'],
        ['other business', `sf:${randomUUID()}`, 4, false, null, 'completed'],
        ['closed', 'kpa-society', 2, true, null, 'completed'],
        ['organization', 'kpa-society', 3, false, organizationId, 'completed'],
        ['pending pharmacist', 'kpa-society', 0, false, null, 'pending'],
        ['pending other', `community:${randomUUID()}`, 0, false, null, 'pending'],
      ] as const) {
        const boardId = randomUUID();
        await manager.query(`INSERT INTO forum_category_requests VALUES($1,$2,NULL,$3,$4,$5,$6)`,
          [boardId, name, code, status, closed ? 'closed' : 'open', org]);
        for (let index = 0; index < count; index++) {
          const postId = randomUUID();
          await manager.query(`INSERT INTO forum_post VALUES($1,$2,NULL,$3,'publish',$4,NOW())`, [postId, boardId, name, org]);
          await manager.query(`INSERT INTO forum_comment VALUES($1,$2,NOW())`, [randomUUID(), postId]);
        }
      }
      await check(manager, organizationId);
    });
  }

  it('legacy pharmacist analytics, posts and requests exclude other spaces, organizations and closed boards', async () => {
    await withFixtures(async manager => {
      const service = new ForumQueryService(manager as unknown as DataSource, { scope: 'community', communityKey: 'pharmacy' });
      expect(await service.countVisiblePosts()).toBe(3);
      expect(await service.countPendingRequests()).toBe(1);
      expect((await service.listRecentPosts()).map((post: any) => post.categoryName).sort()).toEqual(['pharmacist', 'pharmacist', 'pharmacist alias']);
      const analytics = await service.getForumAnalytics();
      expect(analytics).toMatchObject({ totalForums: 2, activeForums7d: 2, posts7d: 3, comments7d: 3, inactiveForums30d: [] });
      expect(analytics.topForums.map((board: any) => board.name).sort()).toEqual(['pharmacist', 'pharmacist alias']);
    });
  });

  it('organization queries preserve their separate organization boundary', async () => {
    await withFixtures(async (manager, organizationId) => {
      const service = new ForumQueryService(manager as unknown as DataSource, { scope: 'organization', organizationId });
      expect(await service.countVisiblePosts()).toBe(3);
      expect(await service.countPendingRequests()).toBe(0);
      expect(await service.getForumAnalytics()).toMatchObject({ totalForums: 1, posts7d: 3, comments7d: 3 });
    });
  });
});
