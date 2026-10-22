import { CopilotEngineService } from "../copilot/copilot-engine.service.js";
import { resolveAiTarget } from "../utils/ai-provider-runtime.js";
import { executeAccountedAi } from "../modules/ai-policy/ai-accounted-execution.js";

jest.mock("../utils/ai-provider-runtime.js", () => ({
  resolveAiTarget: jest.fn(),
}));
jest.mock("../modules/ai-policy/ai-accounted-execution.js", () => ({
  executeAccountedAi: jest.fn(),
}));
jest.mock("@o4o/ai-core", () => ({
  ...jest.requireActual("@o4o/ai-core"),
  runAiExtension: jest.fn(async (_request, adapter) => {
    await adapter.invoke({
      systemPrompt: "synthetic",
      userPrompt: "synthetic",
    });
    return {
      output: {
        riskLevel: "low",
        summary: "Synthetic insight",
        recommendedActions: [],
      },
    };
  }),
}));

it("uses resolved DB-only credentials and managed model with environment keys absent", async () => {
  const saved = [process.env.GEMINI_API_KEY, process.env.OPENAI_API_KEY];
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    (resolveAiTarget as jest.Mock).mockResolvedValue({
      provider: "openai",
      model: "gpt-db-fixture",
      apiKey: "synthetic-db-key",
    });
    (executeAccountedAi as jest.Mock).mockResolvedValue({
      text: "synthetic",
      provider: "openai",
    });
    const result = await new CopilotEngineService().generateInsights(
      "neture",
      {},
      { id: "synthetic-actor", role: "operator" },
    );
    expect(result.source).toBe("ai");
    expect(resolveAiTarget).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      "operator.insight",
    );
    expect(executeAccountedAi).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        provider: "openai",
        config: expect.objectContaining({
          apiKey: "synthetic-db-key",
          model: "gpt-db-fixture",
        }),
      }),
      expect.objectContaining({ userId: "synthetic-actor" }),
    );
  } finally {
    for (const [index, key] of ["GEMINI_API_KEY", "OPENAI_API_KEY"].entries()) {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    }
  }
});
