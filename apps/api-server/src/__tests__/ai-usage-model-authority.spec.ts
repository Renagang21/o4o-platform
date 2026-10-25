import { AiPolicyExecutorService } from "../modules/ai-policy/ai-policy-executor.service.js";
import { AiAccountedExecution } from "../modules/ai-policy/ai-accounted-execution.js";
import { resolveAiApiKey } from "../utils/ai-key.util.js";

jest.mock("../utils/ai-key.util.js", () => ({
  resolveAiApiKey: jest.fn(async (_db, provider) => "synthetic-" + provider),
}));

function fixture() {
  const policy = {
    provider: "gemini",
    model: "old-policy-model",
    fallbackProvider: "openai",
    fallbackModel: "old-fallback",
    isEnabled: true,
    maxTokens: 100,
    temperature: 0.2,
    retryMax: 2,
    retryDelayMs: 0,
    responseMode: "json",
    timeoutMs: 1000,
  };
  const models = [
    {
      provider: "gemini",
      id: "gemini-current",
      name: "Synthetic first",
      capabilities: ["text"],
    },
    {
      provider: "openai",
      id: "gpt-current",
      name: "Synthetic second",
      capabilities: ["text"],
    },
  ];
  const control = {
    revision: 1,
    models,
    deleted: [],
    selections: {} as Record<string, { provider: string; model: string }>,
  };
  const db = {
    isInitialized: true,
    query: jest.fn(async () => [{ value: structuredClone(control) }]),
    getRepository: jest.fn(() => ({ findOne: jest.fn(async () => policy) })),
  };
  return {
    policy,
    control,
    db,
    executor: new AiPolicyExecutorService(db as any),
  };
}
afterEach(() => jest.restoreAllMocks());
it("uses the latest per-usage model despite a cached policy, caller model override and legacy fallback", async () => {
  const f = fixture();
  const invoke = jest
    .spyOn(AiAccountedExecution.prototype, "invoke")
    .mockResolvedValue({ content: "synthetic" } as any);
  f.control.selections["policy.PRODUCT_CONTENT"] = {
    provider: "gemini",
    model: "gemini-current",
  };
  await f.executor.execute("PRODUCT_CONTENT", "system", "user", {
    model: "caller-old-model",
  });
  expect(invoke.mock.calls[0][0]).toMatchObject({
    provider: "gemini",
    config: { model: "gemini-current", maxTokens: 100 },
    retry: { maxAttempts: 2 },
  });
  expect(invoke.mock.calls[0][2]).toBeUndefined();
  f.control.selections["policy.PRODUCT_CONTENT"] = {
    provider: "openai",
    model: "gpt-current",
  };
  f.control.revision++;
  await f.executor.execute("PRODUCT_CONTENT", "system", "user");
  expect(invoke.mock.calls[1][0]).toMatchObject({
    provider: "openai",
    config: { model: "gpt-current", apiKey: "synthetic-openai" },
  });
  expect(invoke.mock.calls[1][2]).toBeUndefined();
  expect(f.db.getRepository).toHaveBeenCalledTimes(1); // existing policy cache remains, model selection is fresh.
});
it("keeps unconfigured legacy fallback behavior without changing another usage", async () => {
  const f = fixture();
  const invoke = jest
    .spyOn(AiAccountedExecution.prototype, "invoke")
    .mockResolvedValue({ content: "synthetic" } as any);
  f.control.selections["store.translation"] = {
    provider: "gemini",
    model: "gemini-current",
  };
  await f.executor.execute("CONTENT_TRANSLATION", "system", "user", {
    usage: "pharmacy.consultation",
  });
  expect(invoke.mock.calls[0][0]).toMatchObject({
    config: { model: "old-policy-model" },
  });
  expect(invoke.mock.calls[0][2]).toMatchObject({
    provider: "openai",
    config: { model: "old-fallback" },
  });
  await f.executor.execute("CONTENT_TRANSLATION", "system", "user");
  expect(invoke.mock.calls[1][0]).toMatchObject({
    config: { model: "gemini-current" },
  });
  expect(invoke.mock.calls[1][2]).toBeUndefined();
});
it("selects the configured provider before checking or resolving credentials for obsolete providers", async () => {
  const f = fixture();
  f.policy.provider = "obsolete-provider";
  f.policy.fallbackProvider = "obsolete-fallback";
  f.control.selections["policy.PRODUCT_CONTENT"] = {
    provider: "openai",
    model: "gpt-current",
  };
  const invoke = jest
    .spyOn(AiAccountedExecution.prototype, "invoke")
    .mockResolvedValue({ content: "synthetic" } as any);
  jest.mocked(resolveAiApiKey).mockClear();
  await f.executor.execute("PRODUCT_CONTENT", "system", "user");
  expect(resolveAiApiKey).toHaveBeenCalledTimes(1);
  expect(resolveAiApiKey).toHaveBeenCalledWith(f.db, "openai");
  expect(invoke.mock.calls[0][0]).toMatchObject({
    provider: "openai",
    config: { model: "gpt-current" },
  });
});
