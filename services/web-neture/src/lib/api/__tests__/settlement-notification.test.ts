import { beforeEach, describe, expect, it, vi } from "vitest";
import { settlementNotificationApi } from "../settlement-notification";
const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../client.js", () => ({ api: transport }));
const job = {
  settlementId: "a",
  state: "failed",
  attempts: 1,
  deliveredCount: 0,
  lastErrorCode: "NO_CURRENT_OWNER",
  deliveredAt: null,
  updatedAt: null,
};
beforeEach(() => vi.resetAllMocks());
describe("settlement notification transport", () => {
  it("uses a distinct no-payment retry endpoint and preserves failure status", async () => {
    transport.post.mockResolvedValue({ data: { success: true, data: job } });
    expect(await settlementNotificationApi.retry("a")).toEqual(job);
    expect(transport.post).toHaveBeenCalledWith(
      "/neture/admin/settlements/a/notification/retry",
      {},
    );
  });
  it.each([
    {},
    { success: false, data: job },
    { success: true, data: { ...job, settlementId: "other" } },
    { success: true, data: { ...job, state: "paid" } },
  ])("refuses malformed or wrong-target status %j", async (data) => {
    transport.get.mockResolvedValue({ data });
    await expect(settlementNotificationApi.get("a")).rejects.toThrow();
  });
  it("propagates read failures instead of returning an empty queue", async () => {
    transport.get.mockRejectedValue(Error("fixture read"));
    await expect(settlementNotificationApi.list("failed", 1)).rejects.toThrow(
      "fixture read",
    );
  });
  it("preserves queue pagination and state filter", async () => {
    const data = {
      items: [{ ...job, state: "pending" }],
      page: 2,
      limit: 10,
      total: 12,
    };
    transport.get.mockResolvedValue({ data: { success: true, data } });
    expect(await settlementNotificationApi.list("pending", 2)).toEqual(data);
    expect(transport.get).toHaveBeenCalledWith(
      "/neture/admin/settlements/notification-jobs?state=pending&page=2&limit=10",
    );
  });
});
