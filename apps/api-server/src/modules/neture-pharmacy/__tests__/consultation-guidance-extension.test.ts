const execute = jest.fn();
jest.mock("../../ai-policy/ai-policy-factory.js", () => ({
  createPolicyExecutor: () => ({ execute }),
}));
import {
  createConsultationGuidanceSelector,
  consultationGuidanceExtension,
} from "../services/consultation-guidance.extension.js";
import logger from "../../../utils/logger.js";
const input = {
  question: "Private inquiry",
  productName: "Published product",
  passages: [{ id: 1, text: "Private source passage" }],
};
const access = () => ({
  actorId: "staff",
  organizationId: "store",
  materialId: "published-page",
  authorize: jest.fn(async () => true),
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(logger, "info").mockImplementation(() => logger);
  execute.mockResolvedValue({
    content: '{"passageIds":[1]}',
    provider: "gemini",
    model: "configured",
    requestId: "fixture",
    promptTokens: 20,
    completionTokens: 5,
  });
});
afterEach(() => jest.restoreAllMocks());
it("uses Core and existing product content policy without logging question or content", async () => {
  expect(
    await createConsultationGuidanceSelector({} as any)(input, access()),
  ).toEqual([1]);
  expect(execute).toHaveBeenCalledWith(
    "PRODUCT_CONTENT",
    expect.any(String),
    expect.any(String),
    expect.objectContaining({ userId: "staff", maxTokens: 512 }),
  );
  expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain(
    "Private",
  );
});
it("blocks unauthorized invocation and rejects unknown passage output", async () => {
  const a = access();
  a.authorize.mockResolvedValue(false);
  await expect(
    createConsultationGuidanceSelector({} as any)(input, a),
  ).rejects.toHaveProperty("httpStatus", 503);
  expect(execute).not.toHaveBeenCalled();
  execute.mockResolvedValueOnce({
    content: '{"passageIds":[999]}',
    provider: "gemini",
    model: "configured",
    requestId: "fixture",
    promptTokens: 20,
    completionTokens: 5,
  });
  await expect(
    createConsultationGuidanceSelector({} as any)(input, access()),
  ).rejects.toHaveProperty("code", "GUIDANCE_AI_UNAVAILABLE");
});
it.each([
  "{}",
  '{"passageIds":[0]}',
  '{"passageIds":[1,1]}',
  '{"passageIds":[1,2,3,4]}',
  '{"passageIds":"invented"}',
])("rejects malformed selector output: %s", (body) => {
  expect(() => consultationGuidanceExtension.parse(body)).toThrow();
});
it('reports quota refusal distinctly without leaking the provider error',async()=>{
  execute.mockRejectedValueOnce(new Error('QUOTA_EXCEEDED'));
  await expect(createConsultationGuidanceSelector({} as any)(input,access())).rejects.toHaveProperty('httpStatus',429);
});
