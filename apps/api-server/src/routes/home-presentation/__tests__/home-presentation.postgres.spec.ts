/** Explicit local-only integration. Uses its own ephemeral PostgreSQL 15 container/database. */
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { initialHomePresentation } from "@o4o/types";
import {
  HomePresentationService,
  PresentationConflict,
  type PresentationScope,
} from "../home-presentation.service";
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
      extra: { options: `-c search_path=${schema}` },
    });
    await ds.initialize();
    await ds.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await ds.query(
      `CREATE TABLE cms_contents (id uuid PRIMARY KEY, "serviceKey" varchar(50), "organizationId" uuid, type varchar(50) NOT NULL, title varchar(255) NOT NULL, status varchar(20) NOT NULL DEFAULT 'draft', metadata jsonb NOT NULL DEFAULT '{}', "authorRole" varchar(20) NOT NULL DEFAULT 'admin', "visibilityScope" varchar(20) NOT NULL DEFAULT 'platform', "createdBy" uuid, "createdAt" timestamp NOT NULL DEFAULT NOW(), "updatedAt" timestamp NOT NULL DEFAULT NOW())`,
    );
    service = new HomePresentationService(ds);
  });
  beforeEach(async () => {
    await ds.query("TRUNCATE cms_contents");
  });
  afterAll(async () => {
    if (ds?.isInitialized) {
      if (created) await ds.query(`DROP SCHEMA "${schema}" CASCADE`);
      await ds.destroy();
    }
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
