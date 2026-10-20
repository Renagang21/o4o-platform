import Database from "better-sqlite3";
import { AiManagementService } from "../management.service.js";

/** Execute the production aggregation predicates; only PG text casts/binds are adapted for SQLite. */
describe("historical unknown-usage SQL", () => {
  let database: Database.Database;
  let service: AiManagementService;
  beforeEach(() => {
    database = new Database(":memory:");
    database.exec(`CREATE TABLE ai_usage_logs (
      provider TEXT, model TEXT, scope TEXT, status TEXT,
      "promptTokens" INTEGER, "completionTokens" INTEGER,
      "costEstimated" NUMERIC, "createdAt" TEXT
    )`);
    service = new AiManagementService(
      {
        isInitialized: true,
        query: async (sql: string, values: unknown[]) => {
          const rows = database
            .prepare(sql.replace(/::text/g, "").replace(/\$\d+/g, "?"))
            .all(...values) as Record<string, unknown>[];
          return rows.map((row) =>
            Object.fromEntries(
              Object.entries(row).map(([key, value]) => [
                key,
                typeof value === "number" ? String(value) : value,
              ]),
            ),
          );
        },
      } as any,
      {},
    );
  });
  afterEach(() => database.close());
  function record(
    input: number | null,
    output: number | null,
    cost: number | null,
    status = "success",
    at = "2026-10-20T01:00:00.000Z",
  ) {
    database
      .prepare("INSERT INTO ai_usage_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        "gemini",
        "fixture-model",
        "CONTENT_TRANSLATION",
        status,
        input,
        output,
        cost,
        at,
      );
  }
  const query = () => service.usage(7, new Date("2026-10-20T02:00:00.000Z"));

  it("flags legacy zero/zero/zero success as unknown rather than fully priced free usage", async () => {
    record(0, 0, 0);
    expect((await query()).total).toMatchObject({
      records: 1,
      successes: 1,
      unpriced: 1,
      unmetered: 1,
      cost: "0.00000000",
    });
  });
  it("also flags missing or partly missing counters even when a cost was stored", async () => {
    record(null, null, 0);
    record(null, 10, 1.25);
    expect((await query()).total).toMatchObject({
      records: 2,
      unpriced: 2,
      unmetered: 2,
      output: 10,
      cost: "1.25000000",
    });
  });
  it("preserves explicitly metered zero-cost calls as priced and distinguishes missing price", async () => {
    record(10, 5, 0);
    record(10, 5, null);
    expect((await query()).total).toMatchObject({
      records: 2,
      unpriced: 1,
      unmetered: 0,
      input: 20,
      output: 10,
    });
  });
  it("keeps failed unknown attempts and filters outside the Korea calendar window", async () => {
    record(0, 0, null, "error");
    record(0, 0, 0, "success", "2026-10-13T14:59:59.999Z");
    record(0, 0, 0, "success", "2026-10-20T02:00:00.000Z");
    const result = await query();
    expect(result.total).toMatchObject({
      records: 1,
      errors: 1,
      unpriced: 1,
      unmetered: 1,
    });
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].relatedUsages).toHaveLength(2);
  });
});
