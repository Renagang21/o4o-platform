import { AppDataSource } from "../database/connection.js";
import { aiQueryService } from "../services/ai-query.service.js";
import { MODEL_CONTROL_KEY } from "../services/ai-management/model-controls.js";

it("rechecks retirement inside the shared policy transaction and rejects stale model selections", async () => {
  const policy = { id: 1, defaultModel: "gemini-3.8-flash" };
  const repo = {
    findOneOrFail: jest.fn(async () => ({ ...policy })),
    save: jest.fn(async (value) => value),
  };
  const manager = {
    query: jest.fn(async (sql: string) => {
      if (sql.startsWith("SELECT pg_advisory_xact_lock")) return [];
      if (sql.startsWith("SELECT value FROM settings"))
        return [
          {
            value: {
              revision: 1,
              models: [],
              deleted: ["gemini:gemini-retired-fixture"],
              selections: {},
            },
          },
        ];
      throw new Error("Unexpected fixture SQL");
    }),
    getRepository: jest.fn(() => repo),
  };
  (aiQueryService as any).initialized = true;
  const policyRead = jest
    .spyOn(aiQueryService, "getPolicy")
    .mockResolvedValue(policy as any);
  const previousTransaction = AppDataSource.transaction;
  AppDataSource.transaction = jest.fn(async (run: any) => run(manager)) as any;
  try {
    await expect(
      aiQueryService.updatePolicy({ defaultModel: "gemini-retired-fixture" }),
    ).rejects.toMatchObject({ status: 409, code: "AI_MODEL_REMOVED" });
    expect(repo.save).not.toHaveBeenCalled();
    expect(manager.query.mock.calls[0][0]).toContain("pg_advisory_xact_lock");
    expect(manager.query).toHaveBeenCalledWith(
      "SELECT value FROM settings WHERE key=$1",
      [MODEL_CONTROL_KEY],
    );
    await expect(
      aiQueryService.updatePolicy({ aiEnabled: false }),
    ).resolves.toMatchObject({ aiEnabled: false });
    expect(repo.save).toHaveBeenCalledTimes(1);
  } finally {
    policyRead.mockRestore();
    AppDataSource.transaction = previousTransaction;
    (aiQueryService as any).initialized = false;
  }
});
