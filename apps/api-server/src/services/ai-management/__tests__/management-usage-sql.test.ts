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
      "costEstimated" NUMERIC, "createdAt" TEXT, "requestId" TEXT
    )`);
    database.exec(`CREATE TABLE ai_usage_reservations (
      provider_request_id TEXT, pricing TEXT, receipt TEXT, scope TEXT, outcome TEXT, status TEXT, actual_cost NUMERIC, created_at TEXT
    )`);
    service = new AiManagementService(
      {
        isInitialized: true,
        query: async (sql: string, values: unknown[]) => {
          const rows = database
            .prepare(sql.replace(/::(?:text|bigint|boolean)/g, "").replace(/\$(\d+)/g, "@p$1"))
            .all({ p1: values[0], p2: values[1] }) as Record<string, unknown>[];
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
      .prepare("INSERT INTO ai_usage_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(
        "gemini",
        "fixture-model",
        "CONTENT_TRANSLATION",
        status,
        input,
        output,
        cost,
        at,
        null,
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
  function native(provider: string, known: boolean, units = 1, cost: number | null = 0.05, receiptPresent = true) {
    database.prepare('INSERT INTO ai_usage_reservations VALUES (?,?,?,?,?,?,?,?)').run('native-request',
      JSON.stringify([{ provider, invocation: { kind: 'ocr', model: 'native-model' } }]),
      receiptPresent ? JSON.stringify({ provider, model: 'native-model', native: { usageKnown: known, inputTokens: 0, outputTokens: 0, units } }) : null,
      'PRODUCT_CONTENT', receiptPresent ? 'success' : null, known ? 'settled' : receiptPresent ? 'pending' : 'reserved', cost, '2026-10-20T01:00:00.000Z');
  }
  it('includes native-only providers without a legacy enum row or treating image-based zero tokens as missing usage', async () => {
    native('google-vision', true);
    expect((await query()).total).toMatchObject({ records: 1, successes: 1, unmetered: 0, unpriced: 0, cost: '0.05000000' });
  });
  it('does not double-count the legacy copy of a native provider receipt', async () => {
    record(10, 20, 0.05);
    database.exec(`UPDATE ai_usage_logs SET "requestId"='native-request'`);
    native('gemini', true);
    expect((await query()).total).toMatchObject({ records: 1, successes: 1, cost: '0.05000000' });
  });
  it('counts a native failure and its matching legacy error log as one uncertain attempt', async () => {
    record(0, 0, 0, 'error');
    database.exec(`UPDATE ai_usage_logs SET "requestId"='native-request'`);
    native('gemini', false, 0, 0);
    database.exec(`UPDATE ai_usage_reservations SET outcome='error'`);
    expect((await query()).total).toMatchObject({ records: 1, errors: 1, successes: 0, unmetered: 1, unpriced: 1 });
  });
  it('includes crashed/unsettled Qwen attempts as unknown rather than free successful calls', async () => {
    native('qwen', false, 0, 0, false);
    const result = await query();
    expect(result.groups[0]).toMatchObject({ provider: 'qwen', model: 'native-model' });
    expect(result.total).toMatchObject({ records: 1, successes: 0, errors: 0, unmetered: 1, unpriced: 1 });
  });
  it('keeps successful audio responses with absent usage visibly unmetered', async () => {
    native('openai', false, 0, 0);
    expect((await query()).total).toMatchObject({ records: 1, successes: 1, unmetered: 1, unpriced: 1 });
  });
  it('does not turn a missing native cost into verified free usage', async () => {
    native('google-vision', true, 1, null);
    expect((await query()).total).toMatchObject({ records: 1, unpriced: 1, cost: '0.00000000' });
  });

});
