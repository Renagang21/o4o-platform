/** Explicit local-only integration. Uses its own ephemeral PostgreSQL 15 container/database. */
import { randomUUID } from "node:crypto";
import { cmsMutationRows, ORDINARY_CMS_CONTENT_SQL } from "../../cms-content/cms-reserved-presentation.js";
import { DataSource } from "typeorm";
import { initialHomePresentation } from "@o4o/types";
import {
  HomePresentationService,
  PresentationConflict,
  type PresentationScope,
} from "../home-presentation.service";
import express from 'express';
import request from 'supertest';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from '../../../database/bootstrap/canonical-schema-baseline.js';
import { ContentQueryService } from '../../../modules/content/content-query.service.js';
import { HubContentQueryService } from '../../../modules/hub-content/hub-content.service.js';
import { ContentApprovalService } from '../../kpa/services/content-approval.service.js';
jest.mock('@o4o-apps/cms-core', () => ({
  ...jest.requireActual('../../../../../../packages/cms-core/src/entities/CmsContent.entity.ts'),
  ...jest.requireActual('../../../../../../packages/cms-core/src/entities/CmsContentSlot.entity.ts'),
}), { virtual: true });
jest.mock('@o4o-apps/cms-core/entities', () => ({
  ...jest.requireActual('../../../../../../packages/cms-core/src/entities/CmsContent.entity.ts'),
}), { virtual: true });
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { hasAnyRole: async (id: string) => id === 'fixture', getActiveRoles: async () => [] } }));
jest.mock('../../../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => { if (req.headers['x-test-admin']) req.user = { id: 'fixture', roles: ['platform:super_admin'] }; next(); },
  requireAuth: (req: any, res: any, next: any) => { if (!req.headers['x-test-admin']) return res.sendStatus(401); req.user = { id: 'fixture', roles: ['platform:super_admin'] }; next(); },
}));
const { CmsContent } = jest.requireActual('../../../../../../packages/cms-core/src/entities/CmsContent.entity.ts');
const { CmsContentSlot } = jest.requireActual('../../../../../../packages/cms-core/src/entities/CmsContentSlot.entity.ts');
import { KpaAssetResolver } from '../../../modules/asset-snapshot/resolvers/kpa-asset.resolver.js';
import { createCmsContentSlotRoutes } from '../../cms-content/cms-content-slot.handler.js';
const run =
  process.env.O4O_HOME_PRESENTATION_PG_TEST === "1" ? describe : describe.skip;
run("home presentation PostgreSQL persistence", () => {
  let ds: DataSource, service: HomePresentationService;
  const schema = `home_presentation_test_${randomUUID().replaceAll("-", "")}`;
  let created = false;
  const actor = "11111111-1111-4111-8111-111111111111";
  const scope: PresentationScope = {
    surface: "supplier",
    organizationId: null,
  };
  beforeAll(async () => {
    const password = process.env.O4O_HOME_PRESENTATION_PG_PASSWORD;
    if (!password)
      throw new Error(
        "Set O4O_HOME_PRESENTATION_PG_PASSWORD for the isolated local test database.",
      );
    ds = new DataSource({
      type: "postgres",
      host: "127.0.0.1",
      port: 55432,
      username: "postgres",
      password,
      database: "o4o_home_presentation_test",
      synchronize: false,
      schema,
      entities: [CmsContent, CmsContentSlot],
      extra: { options: `-c search_path=${schema}` },
    });
    await ds.initialize();
    await ds.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    for (const table of ['cms_contents', 'cms_content_slots']) {
      const sql = CANONICAL_SCHEMA_BASELINE_STATEMENTS.find(statement => statement.startsWith(`CREATE TABLE public.${table} (`));
      if (!sql) throw new Error('Missing canonical CMS fixture table');
      await ds.query(sql.replace(`public.${table}`, table));
    }
    service = new HomePresentationService(ds);
  });
  beforeEach(async () => {
    await ds.query("TRUNCATE cms_content_slots, cms_contents");
  });
  afterAll(async () => {
    if (ds?.isInitialized) {
      if (created) await ds.query(`DROP SCHEMA "${schema}" CASCADE`);
      await ds.destroy();
    }
  });
  it("keeps reserved draft/published state out of ordinary CMS list, publish and delete", async () => {
    const neture: PresentationScope = { surface: 'neture', organizationId: null };
    await service.save(neture, initialHomePresentation('neture'), 0, false, actor);
    const [reserved] = await ds.query('SELECT id FROM cms_contents');
    const ordinaryId = randomUUID();
    await ds.query(`INSERT INTO cms_contents(id, "serviceKey", type, title) VALUES ($1, 'neture', 'hero', 'Ordinary')`, [ordinaryId]);
    const where = `"serviceKey" = 'neture' AND ${ORDINARY_CMS_CONTENT_SQL}`;
    expect(await ds.query(`SELECT id FROM cms_contents WHERE ${where}`)).toEqual([{ id: ordinaryId }]);
    expect(cmsMutationRows(await ds.query(`UPDATE cms_contents SET status='published' WHERE id=$1 AND ${where} RETURNING id`, [reserved.id]))).toEqual([]);
    expect(cmsMutationRows(await ds.query(`DELETE FROM cms_contents WHERE id=$1 AND ${where} RETURNING id`, [reserved.id]))).toEqual([]);
    expect((await service.read(neture)).revision).toBe(1);
    expect(await service.publicRead(neture)).toBeNull();
    expect(cmsMutationRows(await ds.query(`UPDATE cms_contents SET status='published' WHERE id=$1 AND ${where} RETURNING id`, [ordinaryId]))).toEqual([{ id: ordinaryId }]);
    expect(cmsMutationRows(await ds.query(`DELETE FROM cms_contents WHERE id=$1 AND ${where} RETURNING id`, [ordinaryId]))).toEqual([{ id: ordinaryId }]);
  });
  it.each(['neture', 'kpa-society'])('hides reserved metadata from shared readers and copies for %s', async (serviceKey) => {
    const localScope: PresentationScope = { surface: serviceKey === 'neture' ? 'neture' : 'pharmacy', organizationId: null };
    await service.save(localScope, initialHomePresentation(localScope.surface), 0, false, actor);
    const [privateRow] = await ds.query('SELECT id FROM cms_contents');
    // Even a malformed legacy status must not expose the private draft/published pair.
    await ds.query(`UPDATE cms_contents SET status='published' WHERE id=$1`, [privateRow.id]);
    const reader = new ContentQueryService(ds, { serviceKeys: [serviceKey] });
    expect(await reader.getById(privateRow.id)).toBeNull();
    expect(await reader.getByIdWithRecommendations(privateRow.id)).toBeNull();
    expect((await reader.listPublished()).pagination.total).toBe(0);
    expect(await reader.listForHome(['hero'], 5)).toEqual([]);
    expect(await reader.listFeatured(['hero'], 5)).toEqual([]);
    await reader.incrementViewCount(privateRow.id);
    expect(await reader.toggleRecommendation(privateRow.id, actor)).toEqual({ recommendCount: 0, isRecommendedByMe: false });
    const ordinary = randomUUID();
    await ds.query(`INSERT INTO cms_contents(id,"serviceKey",type,title,status) VALUES($1,$2,'hero','Ordinary','published')`, [ordinary, serviceKey]);
    expect((await reader.listPublished()).data.map(item => item.id)).toEqual([ordinary]);
    expect((await new HubContentQueryService(ds).getContents({ serviceKey, sourceDomain: 'cms' })).data.map(item => item.id)).toEqual([ordinary]);
    expect((await reader.getById(ordinary))?.title).toBe('Ordinary');
    if (serviceKey === 'kpa-society') {
      expect(await new KpaAssetResolver(ds).resolve(privateRow.id, 'cms')).toBeNull();
      expect(await new KpaAssetResolver(ds).resolve(ordinary, 'cms')).toMatchObject({ title: 'Ordinary' });
    }
    expect((await ds.query('SELECT "viewCount", "likeCount" FROM cms_contents WHERE id=$1', [privateRow.id]))[0]).toEqual({ viewCount: 0, likeCount: 0 });
    expect((await service.read(localScope)).revision).toBe(1);
  });
  it('rejects private CMS publication through approval but keeps ordinary publication', async () => {
    await service.save(scope, initialHomePresentation(scope.surface), 0, false, actor);
    const [privateRow] = await ds.query('SELECT id FROM cms_contents');
    const publisher = new ContentApprovalService(ds);
    const q = ds.createQueryRunner();
    try {
      await expect((publisher as any).publishContent(q, 'cms', privateRow.id)).rejects.toThrow('Content not found');
      expect((await ds.query('SELECT status FROM cms_contents WHERE id=$1', [privateRow.id]))[0].status).toBe('draft');
      const ordinary = randomUUID();
      await ds.query(`INSERT INTO cms_contents(id,"serviceKey",type,title) VALUES($1,'supplier','news','Ordinary')`, [ordinary]);
      await (publisher as any).publishContent(q, 'cms', ordinary);
      expect((await ds.query('SELECT status FROM cms_contents WHERE id=$1', [ordinary]))[0].status).toBe('published');
    } finally { await q.release(); }
  });
  it('hides pre-existing reserved slots even with activeOnly=false and blocks slot mutation/replacement', async () => {
    const localScope: PresentationScope = { surface: 'neture', organizationId: null };
    await service.save(localScope, initialHomePresentation('neture'), 0, false, actor);
    const [privateRow] = await ds.query('SELECT id FROM cms_contents');
    const ordinary = randomUUID(), privateSlot = randomUUID(), ordinarySlot = randomUUID();
    await ds.query(`INSERT INTO cms_contents(id,"serviceKey",type,title,status) VALUES($1,'neture','hero','Ordinary','published')`, [ordinary]);
    await ds.query(`INSERT INTO cms_content_slots(id,"slotKey","serviceKey","contentId") VALUES($1,'fixture','neture',$2),($3,'fixture','neture',$4)`, [privateSlot,privateRow.id,ordinarySlot,ordinary]);
    const app = express(); app.use(express.json()); app.use('/cms', createCmsContentSlotRoutes({ dataSource: ds }));
    const response = await request(app).get('/cms/slots/fixture?serviceKey=neture&activeOnly=false');
    expect(response.status).toBe(200); expect(response.body.data.map((slot: any) => slot.id)).toEqual([ordinarySlot]); expect(response.body.meta.total).toBe(1);
    expect((await request(app).put('/cms/slots/'+privateSlot).set('x-test-admin','1').send({sortOrder:3})).status).toBe(404);
    expect((await request(app).delete('/cms/slots/'+privateSlot).set('x-test-admin','1')).status).toBe(404);
    expect((await request(app).post('/cms/slots').set('x-test-admin','1').send({slotKey:'other',serviceKey:'neture',contentId:privateRow.id})).status).toBe(400);
    expect((await ds.query('SELECT "sortOrder" FROM cms_content_slots WHERE id=$1',[privateSlot]))[0].sortOrder).toBe(0);
    expect((await request(app).put('/cms/slots/'+ordinarySlot).set('x-test-admin','1').send({sortOrder:3})).status).toBe(200);
    expect((await ds.query('SELECT "sortOrder" FROM cms_content_slots WHERE id=$1',[ordinarySlot]))[0].sortOrder).toBe(3);
    expect((await service.read(localScope)).revision).toBe(1);
  });
  it("starts without any persisted or published configuration", async () => {
    expect(await service.read(scope)).toEqual({
      revision: 0,
      draft: null,
      published: null,
    });
    expect(await service.publicRead(scope)).toBeNull();
  });
  it("persists a draft without publishing or entering general feeds", async () => {
    const draft = initialHomePresentation("supplier");
    expect(await service.save(scope, draft, 0, false, actor)).toMatchObject({
      revision: 1,
      published: null,
      draft,
    });
    expect(await service.publicRead(scope)).toBeNull();
    expect(
      await ds.query('SELECT status, "serviceKey" FROM cms_contents'),
    ).toEqual([{ status: "draft", serviceKey: "supplier" }]);
  });
  it("publishes a snapshot and keeps later draft edits private", async () => {
    const document = initialHomePresentation("supplier");
    await service.save(scope, document, 0, true, actor);
    document.slides[0].title = "아직 공개하지 않은 초안";
    await service.save(scope, document, 1, false, actor);
    expect((await service.read(scope)).draft!.slides[0].title).toBe(
      document.slides[0].title,
    );
    expect((await service.publicRead(scope))!.slides[0].title).not.toBe(
      document.slides[0].title,
    );
  });
  it("filters disabled, future and expired messages before public serialization", async () => {
    const document = initialHomePresentation("supplier");
    document.slides[0].startsAt = new Date(
      Date.now() + 86_400_000,
    ).toISOString();
    document.slides[1].enabled = false;
    document.promotions[0].endsAt = new Date(Date.now() - 1000).toISOString();
    await service.save(scope, document, 0, true, actor);
    expect(await service.publicRead(scope)).toEqual({
      enabled: true,
      slides: [],
      promotions: [],
    });
  });
  it("keeps service scopes independent even when the same operator owns both", async () => {
    await service.save(
      scope,
      initialHomePresentation("supplier"),
      0,
      true,
      actor,
    );
    expect(
      await service.publicRead({ surface: "funding", organizationId: null }),
    ).toBeNull();
  });
  it("keeps branch and business organization scopes independent", async () => {
    for (const surface of ["branch", "pharmacy"] as const) {
      await service.save(
        { surface, organizationId: actor },
        initialHomePresentation(surface),
        0,
        true,
        actor,
      );
      expect(
        await service.publicRead({
          surface,
          organizationId: "22222222-2222-4222-8222-222222222222",
        }),
      ).toBeNull();
      expect(
        await service.publicRead({ surface, organizationId: null }),
      ).toBeNull();
    }
  });
  it("rejects stale revisions without changing either snapshot", async () => {
    const first = await service.save(
      scope,
      initialHomePresentation("supplier"),
      0,
      true,
      actor,
    );
    await expect(
      service.save(scope, initialHomePresentation("supplier"), 0, false, actor),
    ).rejects.toBeInstanceOf(PresentationConflict);
    expect(await service.read(scope)).toEqual(first);
  });
  it("serializes simultaneous first saves and creates one row", async () => {
    const results = await Promise.allSettled([
      service.save(scope, initialHomePresentation("supplier"), 0, false, actor),
      service.save(scope, initialHomePresentation("supplier"), 0, true, actor),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      await ds.query("SELECT count(*)::int AS count FROM cms_contents"),
    ).toEqual([{ count: 1 }]);
  });
  it("does not create a row for unsafe links or missing advertiser identity", async () => {
    const bad = initialHomePresentation("supplier");
    bad.slides[0].linkUrl = "javascript:alert(1)";
    await expect(service.save(scope, bad, 0, true, actor)).rejects.toThrow();
    bad.slides[0].linkUrl = "";
    bad.promotions[0].kind = "advertisement";
    await expect(service.save(scope, bad, 0, true, actor)).rejects.toThrow();
    expect(
      await ds.query("SELECT count(*)::int AS count FROM cms_contents"),
    ).toEqual([{ count: 0 }]);
  });
  it("publishes an explicit hide without falling back to stock promotions", async () => {
    const document = initialHomePresentation("supplier");
    document.enabled = false;
    await service.save(scope, document, 0, true, actor);
    expect(await service.publicRead(scope)).toEqual({
      enabled: false,
      slides: [],
      promotions: [],
    });
  });
});
