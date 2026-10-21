const policy = jest.fn();
const account = jest.fn();
const authorize = jest.fn().mockResolvedValue(undefined);
jest.mock("../../../database/connection", () => ({
  AppDataSource: { getRepository: () => ({ findOneBy: policy }) },
}));
jest.mock("../../../modules/ai-policy/ai-accounted-execution", () => ({
  executeAccountedAi: (...args: unknown[]) => account(...args),
}));
jest.mock("../../../utils/ai-editing-model-resolver", () => ({
  resolveEditingModel: async () => "configured-model",
}));
jest.mock("../../../utils/ai-key.util", () => ({
  resolveAiApiKey: async () => "fixture-key",
}));
jest.mock("../community-management.service", () => ({
  requireCommunityManager: (...args: unknown[]) => authorize(...args),
}));
jest.mock("../../../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn() },
}));
import { generateNewsSuggestions } from "../community-news-ai.service";
const input = [
  {
    id: "a",
    title: "제목",
    summary: "요약",
    linkUrl: "https://kpanews.co.kr/a",
  },
];
beforeEach(() => {
  jest.clearAllMocks();
  policy.mockResolvedValue({ aiEnabled: true });
  authorize.mockResolvedValue(undefined);
});
it("uses existing accounting and configured model with one bounded provider attempt", async () => {
  account.mockResolvedValue({
    content: JSON.stringify([
      {
        articleIds: ["a"],
        representativeId: "a",
        summary: "제공된 요약",
        recommended: false,
        reason: "",
      },
    ]),
    provider: "gemini",
    model: "configured-model",
    usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
  });
  expect((await generateNewsSuggestions(input, "actor"))[0].id).toBe("a");
  expect(account).toHaveBeenCalledTimes(1);
  expect(account.mock.calls[0][1]).toMatchObject({
    retry: { maxAttempts: 1 },
    timeoutMs: 24000,
    config: { maxTokens: 1800, model: "configured-model" },
  });
  expect(account.mock.calls[0][2]).toEqual({
    scope: "SERVICE_QUERY",
    serviceKey: "community",
    userId: "actor",
  });
});
it("never invokes provider when disabled or manager authorization is revoked", async () => {
  policy.mockResolvedValue({ aiEnabled: false });
  await expect(generateNewsSuggestions(input, "actor")).rejects.toThrow(
    "AI_DISABLED",
  );
  policy.mockResolvedValue({ aiEnabled: true });
  authorize.mockRejectedValue(Error("revoked"));
  await expect(generateNewsSuggestions(input, "actor")).rejects.toThrow();
  expect(account).not.toHaveBeenCalled();
});
