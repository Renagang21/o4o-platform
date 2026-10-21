import { aiProxyService } from "../services/ai-proxy.service.js";
import { aiAdminService } from "../services/ai-admin.service.js";
import { ModelControlService } from "../services/ai-management/model-controls.js";
import { AppDataSource } from "../database/connection.js";
import { AiEngine } from "../entities/AiEngine.js";

it.each(["gpt-6-astra", "gpt-5-mini", "o3", "gpt-4.1"])(
  "passes the managed %s model with generation-compatible OpenAI parameters",
  async (model) => {
    const resolve = jest
      .spyOn(ModelControlService.prototype, "resolve")
      .mockResolvedValue({ provider: "openai", model, managed: true });
    const allows = jest
      .spyOn(ModelControlService.prototype, "allows")
      .mockResolvedValue(true);
    const key = jest
      .spyOn(aiProxyService as any, "getApiKey")
      .mockResolvedValue("synthetic-key");
    const log = jest
      .spyOn(aiProxyService as any, "saveUsageLog")
      .mockResolvedValue(undefined);
    const original = global.fetch;
    const fetchMock = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"blocks":[]}' } }],
          }),
          { status: 200 },
        ),
    );
    global.fetch = fetchMock;
    try {
      await aiProxyService.generateContent(
        {
          provider: "gemini",
          model: "gemini-3.8-flash",
          systemPrompt: "synthetic",
          userPrompt: "synthetic",
          maxTokens: 123,
          temperature: 0.2,
        },
        "synthetic-actor",
        "synthetic-request",
      );
      const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
      expect(body).toMatchObject({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "synthetic" },
          { role: "user", content: "synthetic" },
        ],
      });
      if (model === "gpt-4.1") {
        expect(body).toMatchObject({ temperature: 0.2, max_tokens: 123 });
        expect(body).not.toHaveProperty("max_completion_tokens");
      } else {
        expect(body.max_completion_tokens).toBe(123);
        expect(body).not.toHaveProperty("temperature");
        expect(body).not.toHaveProperty("max_tokens");
      }
    } finally {
      global.fetch = original;
      resolve.mockRestore();
      allows.mockRestore();
      key.mockRestore();
      log.mockRestore();
    }
  },
);

it("rejects a retired inactive engine before changing activation flags or policy and permits an available model", async () => {
  const engine = {
    id: 1,
    slug: "gemini-retired-fixture",
    name: "Synthetic",
    provider: "google",
    isAvailable: true,
    isActive: false,
  };
  const engines = {
    findOne: jest.fn(async () => ({ ...engine })),
    update: jest.fn(),
    save: jest.fn(),
  };
  const policies = {
    findOne: jest.fn(async () => ({ id: 1, defaultModel: "gemini-3.8-flash" })),
    save: jest.fn(async (value) => value),
  };
  let retired = true;
  const manager = {
    query: jest.fn(async (sql: string) =>
      sql.startsWith("SELECT pg_advisory_xact_lock")
        ? []
        : [
            {
              value: {
                revision: 1,
                models: [],
                deleted: retired ? ["gemini:" + engine.slug] : [],
                selections: {},
              },
            },
          ],
    ),
    getRepository: jest.fn((entity) =>
      entity === AiEngine ? engines : policies,
    ),
  };
  const previous = AppDataSource.transaction;
  AppDataSource.transaction = jest.fn(async (run: any) => run(manager)) as any;
  (aiAdminService as any).initialized = true;
  try {
    await expect(aiAdminService.activateEngine(1)).rejects.toMatchObject({
      status: 409,
      code: "AI_MODEL_REMOVED",
    });
    expect(engines.update).not.toHaveBeenCalled();
    expect(policies.save).not.toHaveBeenCalled();
    retired = false;
    await expect(aiAdminService.activateEngine(1)).resolves.toMatchObject({
      isActive: true,
    });
    expect(manager.query.mock.calls[0][0]).toContain("pg_advisory_xact_lock");
    expect(policies.save).toHaveBeenCalledWith(
      expect.objectContaining({ activeEngineId: 1, defaultModel: engine.slug }),
    );
  } finally {
    AppDataSource.transaction = previous;
    (aiAdminService as any).initialized = false;
  }
});

it.each(["openai", "claude"] as const)(
  "adapts the main modal Gemini token default when managed blocks select %s",
  async (provider) => {
    const resolve = jest
      .spyOn(ModelControlService.prototype, "resolve")
      .mockResolvedValue({
        provider,
        model: "synthetic-managed-model",
        managed: true,
      });
    const allows = jest
      .spyOn(ModelControlService.prototype, "allows")
      .mockResolvedValue(true);
    const call = jest
      .spyOn(aiProxyService as any, "callProviderWithRetry")
      .mockResolvedValue({
        success: true,
        provider,
        model: "synthetic-managed-model",
        result: { blocks: [] },
      });
    const log = jest
      .spyOn(aiProxyService as any, "saveUsageLog")
      .mockResolvedValue(undefined);
    try {
      await expect(
        aiProxyService.generateContent(
          {
            provider: "gemini",
            model: "gemini-3.8-flash",
            systemPrompt: "synthetic",
            userPrompt: "synthetic",
            maxTokens: 16384,
          },
          "synthetic-actor",
          "synthetic-request",
        ),
      ).resolves.toMatchObject({ success: true });
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({
          provider,
          model: "synthetic-managed-model",
          maxTokens: 8192,
        }),
        "synthetic-request",
      );
    } finally {
      resolve.mockRestore();
      allows.mockRestore();
      call.mockRestore();
      log.mockRestore();
    }
  },
);
