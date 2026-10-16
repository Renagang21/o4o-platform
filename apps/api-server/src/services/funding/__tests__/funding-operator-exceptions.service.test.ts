import {
  FundingOperatorExceptionsService,
  fundingExceptionFilter,
  FUNDING_EXCEPTION_SQL,
} from "../funding-operator-exceptions.service.js";
import { FundingRewardRecordService } from "../funding-reward-record.service.js";
it.each(["unknown", [], {}, false])(
  "rejects unsupported exception filter %p",
  (value) => {
    expect(() => fundingExceptionFilter(value)).toThrow();
  },
);
it("allows only fixed exception SQL fragments", () => {
  expect(fundingExceptionFilter("all")).toBeNull();
  for (const key of Object.keys(FUNDING_EXCEPTION_SQL))
    expect(fundingExceptionFilter(key)).toBe(key);
});
it("bounds pagination and retains only the extra-row hasMore signal", async () => {
  const ds: any = {
    query: jest
      .fn()
      .mockResolvedValue(Array.from({ length: 31 }, (_, id) => ({ id }))),
  };
  const service = new FundingOperatorExceptionsService(ds);
  expect(
    await service.list({ type: "amount_mismatch", page: "2" }),
  ).toMatchObject({ page: 2, hasMore: true });
  expect(ds.query.mock.calls[0][1]).toEqual([30]);
  expect(ds.query.mock.calls[0][0]).not.toContain("paymentReference");
  expect(ds.query.mock.calls[0][0]).not.toContain("paymentNote");
  await expect(service.list({ page: -1 })).rejects.toMatchObject({
    code: "INVALID_EXCEPTION_PAGE",
  });
});
it("verifies the participant belongs to the requested trial before reading history", async () => {
  const ds: any = { query: jest.fn().mockResolvedValue([]) };
  await expect(
    new FundingOperatorExceptionsService(ds).history("trial", "other"),
  ).rejects.toMatchObject({ code: "PARTICIPANT_NOT_FOUND" });
  expect(ds.query).toHaveBeenCalledTimes(1);
  expect(ds.query).toHaveBeenCalledWith(
    expect.stringContaining('"marketTrialId" = $2'),
    ["other", "trial"],
  );
});
it("propagates reward audit failure from the same transaction", async () => {
  const insert = jest.fn().mockRejectedValue(new Error("audit failure"));
  const manager = {
    query: jest
      .fn()
      .mockResolvedValueOnce([{ rewardStatus: "pending" }])
      .mockResolvedValueOnce([{ id: "p", rewardStatus: "fulfilled" }]),
    getRepository: () => ({ insert }),
  };
  const ds: any = { transaction: jest.fn((fn) => fn(manager)) };
  await expect(
    new FundingRewardRecordService(ds).update(
      "trial",
      "p",
      "actor",
      "fulfilled",
    ),
  ).rejects.toThrow("audit failure");
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      meta: expect.objectContaining({
        beforeStatus: "pending",
        afterStatus: "fulfilled",
      }),
    }),
  );
});
