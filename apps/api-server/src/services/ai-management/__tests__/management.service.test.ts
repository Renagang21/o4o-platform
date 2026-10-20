import { randomUUID } from "node:crypto";
import { AiManagementService, usagePeriod } from "../management.service.js";
import { AI_USAGE_CATALOG } from "../catalog.js";

function fixture() {
  const policies = [
    {
      scope: "CONTENT_TRANSLATION",
      provider: "openai",
      model: "fixture-translation",
      enabled: false,
    },
  ];
  const usage = [
    {
      provider: "openai",
      model: "fixture-model",
      scope: "CONTENT_TRANSLATION",
      records: "2",
      successes: "1",
      errors: "1",
      unpriced: "1",
      unmetered: "1",
      input: "20",
      output: "30",
      cost: "0.00000001",
    },
  ];
  const query = jest.fn(async (sql: string) => {
    if (sql.includes("FROM ai_query_policy"))
      return [{ model: "fixture-query", enabled: false }];
    if (sql.includes("FROM ai_llm_policies")) return policies;
    if (sql.includes("FROM ai_settings"))
      return [{ provider: "gemini", configured: true }];
    if (sql.includes("FROM ai_usage_logs")) return usage;
    throw new Error("Unexpected SQL");
  });
  return { db: { query, isInitialized: true }, policies, usage };
}

describe("AI management source inventory", () => {
  it("keeps logical usages unique, all audit rows covered, and mixed controls separate", async () => {
    const { db } = fixture();
    const data = await new AiManagementService(db, {}).snapshot();
    expect(data.usages).toHaveLength(31);
    expect(new Set(data.usages.map((x) => x.id)).size).toBe(31);
    expect(data.usages.map((x) => x.evidenceId)).toEqual(
      Array.from(
        { length: 31 },
        (_, i) => `A${String(i + 1).padStart(2, "0")}`,
      ),
    );
    expect(
      data.usages.find((x) => x.evidenceId === "A01")?.configuration.enabled,
    ).toBe(false);
    expect(
      data.usages.find((x) => x.evidenceId === "A11")?.configuration.enabled,
    ).toBeNull();
    expect(data.usages.find((x) => x.evidenceId === "A26")).toMatchObject({
      accounting: "connected",
      stop: "none",
      application: "unverified",
    });
    expect(
      data.usages.every((x) => data.groups.some((g) => g.id === x.group)),
    ).toBe(true);
    expect(data.groups.find((g) => g.id === "hospital")?.serviceKey).toBeNull();
  });

  it("shows shared translation policy without pretending it is independently controlled", async () => {
    const { db } = fixture();
    const data = await new AiManagementService(db, {}).snapshot();
    const translations = data.usages.filter(
      (x) => x.scope === "CONTENT_TRANSLATION",
    );
    expect(translations).toHaveLength(2);
    expect(translations.map((x) => x.configuration.model)).toEqual([
      "fixture-translation",
      "fixture-translation",
    ]);
    expect(translations.every((x) => x.configuration.enabled === false)).toBe(
      true,
    );
    expect(
      data.usages.find((x) => x.evidenceId === "A19")?.configuration,
    ).toMatchObject({ state: "missing", enabled: null, model: null });
  });

  it("does not initialize missing query policy or expose prompts, credentials, environment values", async () => {
    const privateValue = randomUUID();
    const db = { isInitialized: true, query: jest.fn(async () => []) };
    const data = await new AiManagementService(db, {
      OPENAI_API_KEY: privateValue,
    }).snapshot();
    expect(
      data.usages.find((x) => x.evidenceId === "A01")?.configuration.state,
    ).toBe("missing");
    expect(data.providers.find((x) => x.id === "openai")?.credential).toBe(
      "present",
    );
    expect(JSON.stringify(data)).not.toContain(privateValue);
    expect(db.query.mock.calls.every(([sql]) => /^SELECT/.test(sql))).toBe(
      true,
    );
    expect(
      db.query.mock.calls.some(([sql]) =>
        /system_prompt|userId|SELECT\s+"?apiKey"?\s+FROM/i.test(sql),
      ),
    ).toBe(false);
  });

  it("keeps DB failures distinct from missing keys and never performs provider calls", async () => {
    const { db } = fixture();
    db.query.mockRejectedValue(new Error(randomUUID()));
    const fetch = jest.spyOn(global, "fetch");
    const data = await new AiManagementService(db, {}).snapshot();
    expect(data.queryPolicyRead).toBe("unavailable");
    expect(data.scopePolicyRead).toBe("unavailable");
    expect(
      data.usages.find((x) => x.evidenceId === "A20")?.configuration,
    ).toMatchObject({ state: "unavailable", model: null, enabled: null });
    expect(data.providers.find((x) => x.id === "openai")?.credential).toBe(
      "unknown",
    );
    expect(data.providers.find((x) => x.id === "deepseek")?.credential).toBe(
      "unsupported",
    );
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  it("does not attempt SQL before a database is initialized", async () => {
    const { db } = fixture();
    db.isInitialized = false;
    const data = await new AiManagementService(db, {
      QWEN_API_KEY: randomUUID(),
    }).snapshot();
    expect(data.providers.find((x) => x.id === "qwen")).toMatchObject({
      credential: "present",
      databaseRead: "not-applicable",
      models: [],
    });
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe("recorded usage, not a full-service bill", () => {
  it("aggregates exact decimals once per scope/model and labels shared features", async () => {
    const { db, usage } = fixture();
    usage.push({
      ...usage[0],
      provider: "gemini",
      model: "fixture-second",
      scope: "",
      unpriced: "0",
      cost: "999999999999.12345678",
    });
    const result = await new AiManagementService(db, {}).usage(
      7,
      new Date("2026-10-20T02:00:00Z"),
    );
    expect(result.total).toMatchObject({
      records: 4,
      errors: 2,
      unpriced: 1,
      cost: "999999999999.12345679",
    });
    expect(result.groups[0].relatedUsages).toHaveLength(2);
    expect(result.groups[1]).toMatchObject({ scope: null, relatedUsages: [] });
    expect(result.coverage).toBe("partial");
    expect(db.query.mock.calls[0][0]).not.toMatch(
      /userId|prompt\b|errorMessage|UPDATE|INSERT/i,
    );
  });

  it("returns a bounded empty recorded result but refuses to claim that failed reads are zero", async () => {
    const { db, usage } = fixture();
    usage.length = 0;
    expect((await new AiManagementService(db, {}).usage(30)).total.cost).toBe(
      "0.00000000",
    );
    db.query.mockRejectedValue(new Error(randomUUID()));
    await expect(
      new AiManagementService(db, {}).usage(30),
    ).rejects.toMatchObject({ status: 503, code: "AI_USAGE_UNAVAILABLE" });
  });

  it.each(["-1", "NaN", "9007199254740992"])(
    "rejects invalid or unsafe counts (%s)",
    async (records) => {
      const { db, usage } = fixture();
      usage[0].records = records;
      await expect(
        new AiManagementService(db, {}).usage(7),
      ).rejects.toMatchObject({ code: "AI_USAGE_INVALID" });
    },
  );

  it.each(["-0.1", "NaN", "0.123456789"])(
    "rejects invalid cost instead of calling it free (%s)",
    async (cost) => {
      const { db, usage } = fixture();
      usage[0].cost = cost;
      await expect(
        new AiManagementService(db, {}).usage(7),
      ).rejects.toMatchObject({ code: "AI_USAGE_INVALID" });
    },
  );

  it("uses Korea calendar days across the UTC date boundary", () => {
    expect(usagePeriod(7, new Date("2026-10-20T14:59:59Z"))).toMatchObject({
      from: "2026-10-13T15:00:00.000Z",
      timezone: "Asia/Seoul",
    });
    expect(usagePeriod(7, new Date("2026-10-20T15:00:00Z")).from).toBe(
      "2026-10-14T15:00:00.000Z",
    );
  });

  it.each([0, 1, 31, 91, NaN])(
    "rejects an unsupported period (%s) before SQL",
    async (days) => {
      const { db } = fixture();
      await expect(
        new AiManagementService(db, {}).usage(days),
      ).rejects.toMatchObject({ status: 400 });
      expect(db.query).not.toHaveBeenCalled();
    },
  );
});
