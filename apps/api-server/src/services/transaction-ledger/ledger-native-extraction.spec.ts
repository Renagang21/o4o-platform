import { extractNativeInvoice } from "./ledger-native-extraction.js";
import { resolveAiTarget } from "../../utils/ai-provider-runtime.js";
import { executeAccountedNativeAi } from "../../modules/ai-policy/ai-accounted-execution.js";
import { executeMultimodalChat } from "../ai-tools/multimodal-chat.js";
jest.mock("../../utils/ai-provider-runtime.js", () => ({
  resolveAiTarget: jest.fn(),
}));
jest.mock("../../modules/ai-policy/ai-accounted-execution.js", () => ({
  executeAccountedAi: jest.fn(),
  executeAccountedNativeAi: jest.fn(),
}));
jest.mock("../ai-tools/multimodal-chat.js", () => ({
  executeMultimodalChat: jest.fn(),
}));
jest.mock("../../modules/ai-policy/ai-pricing.js",()=>({loadAiPriceCatalog:jest.fn(()=>({})),resolveAiPrice:jest.fn(()=>({native:{multimodal:{maxOutputTokens:8192}}}))}));
const attachment = {
  kind: "image" as const,
  name: "synthetic.png",
  mimeType: "image/png",
  base64: "AAAA",
  bytes: 3,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(resolveAiTarget)
    .mockResolvedValue({
      provider: "openai",
      model: "synthetic-model",
      apiKey: "synthetic",
    } as never);
  jest
    .mocked(executeAccountedNativeAi)
    .mockImplementation(
      (async (
        _db: unknown,
        _request: unknown,
        _account: unknown,
        invoke: () => Promise<{ value: unknown }>,
      ) => (await invoke()).value) as never,
    );
});
afterEach(() => jest.restoreAllMocks());
it("routes the vision request through existing accounting and does not turn images into text-only guesses", async () => {
  const fetch = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '{"synthetic":true}' },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 10 },
        }),
        { status: 200 },
      ),
    );
  expect(
    await extractNativeInvoice(
      {} as never,
      "actor",
      undefined,
      [attachment],
      "system",
      "user",
    ),
  ).toBe('{"synthetic":true}');
  expect(executeAccountedNativeAi).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ kind: "multimodal", provider: "openai" }),
    expect.objectContaining({ userId: "actor" }),
    expect.any(Function),
  );
  expect(
    JSON.parse(String(fetch.mock.calls[0][1]?.body)).messages[1].content[1],
  ).toMatchObject({ type: "image_url" });
});
it("rejects truncated vision output before a partial invoice can be stored", async () => {
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "{}" }, finish_reason: "length" }],
        }),
        { status: 200 },
      ),
    );
  await expect(
    extractNativeInvoice(
      {} as never,
      "actor",
      undefined,
      [attachment],
      "system",
      "user",
    ),
  ).rejects.toMatchObject({ code: "LEDGER_EXTRACTION_INCOMPLETE" });
});
it("rejects unsupported image providers before any text fallback or billed inference", async () => {
  jest
    .mocked(resolveAiTarget)
    .mockResolvedValue({
      provider: "claude",
      model: "synthetic",
      apiKey: "synthetic",
    } as never);
  await expect(
    extractNativeInvoice(
      {} as never,
      "actor",
      undefined,
      [attachment],
      "system",
      "user",
    ),
  ).rejects.toMatchObject({ code: "LEDGER_IMAGE_PROVIDER_UNSUPPORTED" });
  expect(executeAccountedNativeAi).not.toHaveBeenCalled();
  expect(executeMultimodalChat).not.toHaveBeenCalled();
});
