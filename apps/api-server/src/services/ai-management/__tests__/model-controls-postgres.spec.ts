import { DataSource } from "typeorm";
import { MODEL_CONTROL_KEY, ModelControlService } from "../model-controls.js";

// Never use application connection configuration: only the explicitly isolated loopback fixture.
const fixture =
  process.env.O4O_AI_QUOTA_TEST_PORT === "55447" ? describe : describe.skip;
fixture("durable model controls on isolated PostgreSQL", () => {
  let admin: DataSource, db: DataSource;
  const name = `o4o_aimodel_${process.pid}`;
  const actor = "10000000-0000-4000-8000-000000000001";
  const model = {
    provider: "openai" as const,
    id: "gpt-postgres-fixture",
    name: "Synthetic PostgreSQL model",
    capabilities: ["text" as const],
  };
  beforeAll(async () => {
    const config = {
      type: "postgres" as const,
      host: "127.0.0.1",
      port: 55447,
      username: "o4o_quota_fixture",
      database: "postgres",
    };
    admin = new DataSource(config);
    await admin.initialize();
    await admin.query(`CREATE DATABASE ${name}`);
    db = new DataSource({ ...config, database: name });
    await db.initialize();
    await db.query(
      'CREATE TABLE settings (key varchar(100) PRIMARY KEY,value jsonb,type varchar(50),description text,"createdAt" timestamptz DEFAULT NOW(),"updatedAt" timestamptz DEFAULT NOW())',
    );
    await db.query("CREATE TABLE ai_query_policy (default_model varchar(100))");
    await db.query(
      "CREATE TABLE ai_llm_policies (provider varchar(20),model varchar(100),fallback_provider varchar(20),fallback_model varchar(100),is_enabled boolean)",
    );
    // Older physical schema has config but no entity defaultmodel/defaultModel column.
    await db.query(
      'CREATE TABLE ai_settings (provider varchar(20),"apiKey" text,"isEnabled" boolean,config jsonb)',
    );
  });
  beforeEach(async () => {
    await db.query(
      "TRUNCATE settings, ai_query_policy, ai_llm_policies, ai_settings",
    );
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP DATABASE ${name}`);
      await admin.destroy();
    }
  });
  it("permits one writer for concurrent first insert and one for concurrent updates across service instances", async () => {
    const a = new ModelControlService(db),
      b = new ModelControlService(db);
    const initial = await Promise.allSettled([
      a.change(0, actor, { action: "create", model }),
      b.change(0, actor, {
        action: "create",
        model: { ...model, id: "gpt-second-fixture" },
      }),
    ]);
    expect(initial.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(
      initial
        .filter((x) => x.status === "rejected")
        .map((x) => (x as PromiseRejectedResult).reason.code),
    ).toEqual(["AI_MODEL_CONTROL_CONFLICT"]);
    const changes = await Promise.allSettled([
      a.change(1, actor, {
        action: "create",
        model: { ...model, id: "gpt-third-fixture" },
      }),
      b.change(1, actor, {
        action: "create",
        model: { ...model, id: "gpt-fourth-fixture" },
      }),
    ]);
    expect(changes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((await a.snapshot()).revision).toBe(2);
    expect(
      (
        await db.query("SELECT value FROM settings WHERE key=$1", [
          MODEL_CONTROL_KEY,
        ])
      )[0].value.updatedBy,
    ).toBe(actor);
  });
  it("persists selection, protects the model, then allows removal after release without recreating it on reload", async () => {
    const service = new ModelControlService(db);
    await service.change(0, actor, { action: "create", model });
    await service.change(1, actor, {
      action: "select",
      target: "home.chat",
      selection: { provider: "openai", model: model.id },
    });
    const fresh = new ModelControlService(db);
    expect((await fresh.snapshot()).selections["home.chat"]).toEqual({
      provider: "openai",
      model: model.id,
    });
    await expect(
      fresh.change(2, actor, {
        action: "delete",
        provider: "openai",
        id: model.id,
      }),
    ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
    await fresh.change(2, actor, {
      action: "select",
      target: "home.chat",
      selection: null,
    });
    await fresh.change(3, actor, {
      action: "delete",
      provider: "openai",
      id: model.id,
    });
    expect((await new ModelControlService(db).snapshot()).deleted).toContain(
      "openai:" + model.id,
    );
  });
  it("reads legacy config model references without returning credential fields and protects disabled policy/fallback references", async () => {
    await db.query("INSERT INTO ai_settings VALUES ($1,$2,false,$3::jsonb)", [
      "openai",
      "synthetic-credential-must-not-leak",
      JSON.stringify({ model: "gpt-4o" }),
    ]);
    await db.query(
      "INSERT INTO ai_llm_policies VALUES ('gemini','gemini-2.0-flash','openai','gpt-4.1',false)",
    );
    const service = new ModelControlService(db);
    const snapshot = await service.snapshot();
    expect(snapshot.protectedModels).toEqual(
      expect.arrayContaining([
        "openai:gpt-4o",
        "gemini:gemini-2.0-flash",
        "openai:gpt-4.1",
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain(
      "synthetic-credential-must-not-leak",
    );
    await expect(
      service.change(0, actor, {
        action: "delete",
        provider: "openai",
        id: "gpt-4o",
      }),
    ).rejects.toMatchObject({ code: "AI_MODEL_IN_USE" });
    expect(await db.query("SELECT key FROM settings")).toEqual([]);
  });
});
