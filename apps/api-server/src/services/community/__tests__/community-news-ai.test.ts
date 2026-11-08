const policy = jest.fn();
const account = jest.fn();
const authorize = jest.fn().mockResolvedValue(undefined);
jest.mock("../../../database/connection", () => ({
  AppDataSource: {
    query: jest.fn(async () => [{ ai_enabled: true }]),
    getRepository: () => ({ findOneBy: policy }),
  },
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
import {
  generateNewsClusters,
  generateNewsSuggestions,
  generateScheduledNewsClusters,
  generateScheduledNewsSuggestions,
} from "../community-news-ai.service";
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
describe("V2 clusters", () => {
  const articles = [
    {
      source: "kpanews" as const,
      title: "합성 제목",
      lead: "",
      section: null,
      group: null,
    },
  ];
  const answer = (content: string) => ({
    content,
    provider: "gemini",
    model: "configured-model",
    promptTokens: 10,
    completionTokens: 10,
    requestId: "fixture",
  });
  it("makes one bounded provider attempt with the V2 caps, through accounting", async () => {
    account.mockResolvedValue(
      answer(JSON.stringify({ clusters: [{ a: [0], s: 70, r: "이유" }] })),
    );
    await expect(generateScheduledNewsClusters(articles)).resolves.toEqual([
      { indexes: [0], score: 70, reason: "이유" },
    ]);
    expect(account).toHaveBeenCalledTimes(1);
    expect(account.mock.calls[0][1]).toMatchObject({
      retry: { maxAttempts: 1 },
      timeoutMs: 90000,
      responseMode: "json",
      config: { maxTokens: 8000, temperature: 0.1, model: "configured-model" },
    });
    expect(account.mock.calls[0][2]).toEqual({
      scope: "SERVICE_QUERY",
      serviceKey: "community",
      userId: undefined,
    });
    expect(authorize).not.toHaveBeenCalled();
  });
  it("rejects a forged index from the model instead of publishing it", async () => {
    account.mockResolvedValue(
      answer(JSON.stringify({ clusters: [{ a: [7], s: 70, r: "이유" }] })),
    );
    await expect(generateScheduledNewsClusters(articles)).rejects.toThrow();
    expect(account).toHaveBeenCalledTimes(1);
  });
  it("a manual run is accounted to the operator and stops when access is revoked or AI is off", async () => {
    account.mockResolvedValue(answer(JSON.stringify({ clusters: [] })));
    await generateNewsClusters(articles, "actor");
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      "actor",
      false,
      "editorial",
    );
    expect(account.mock.calls[0][2].userId).toBe("actor");
    account.mockClear();
    authorize.mockRejectedValue(Error("revoked"));
    await expect(generateNewsClusters(articles, "actor")).rejects.toThrow();
    policy.mockResolvedValue({ aiEnabled: false });
    await expect(generateScheduledNewsClusters(articles)).rejects.toThrow(
      "AI_DISABLED",
    );
    expect(account).not.toHaveBeenCalled();
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

it("scheduled draft uses platform service accounting without impersonating a user", async () => {
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
    promptTokens: 10,
    completionTokens: 10,
    requestId: "fixture",
  });
  expect((await generateScheduledNewsSuggestions(input))[0].id).toBe("a");
  expect(authorize).not.toHaveBeenCalled();
  expect(account.mock.calls[0][2]).toEqual({
    scope: "SERVICE_QUERY",
    serviceKey: "community",
    userId: undefined,
  });
});
