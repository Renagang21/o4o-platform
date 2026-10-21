import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../client", () => ({ coreApiClient: state }));
import { notificationsApi } from "../notifications";
beforeEach(() => {
  vi.resetAllMocks();
  state.get.mockResolvedValue({
    data: { count: 4, notifications: [], total: 0 },
  });
});
it.each(["kpa-society", "megapharm"])(
  "preserves the legacy history alongside %s inquiries",
  async (serviceKey) => {
    expect(
      await notificationsApi.getUnreadCount({
        serviceKey,
        organizationId: "organization",
      }),
    ).toBe(4);
    await notificationsApi.list({
      serviceKey,
      organizationId: "organization",
      page: 2,
      limit: 5,
    });
    const scope =
      serviceKey === "megapharm"
        ? { serviceKeys: "megapharm,kpa-society" }
        : { serviceKey };
    expect(state.get.mock.calls[0][1]).toEqual({
      ...scope,
      organizationId: "organization",
    });
    expect(state.get.mock.calls[1][1]).toEqual({
      ...scope,
      organizationId: "organization",
      page: 2,
      limit: 5,
    });
  },
);
it("keeps an unfiltered personal query unfiltered", async () => {
  await notificationsApi.list();
  expect(state.get.mock.calls[0][1].serviceKey).toBeUndefined();
  expect(state.get.mock.calls[0][1].serviceKeys).toBeUndefined();
});
it("keeps an unauthenticated union query empty", async () => {
  state.get.mockRejectedValue({ status: 401 });
  expect(
    await notificationsApi.getUnreadCount({ serviceKey: "megapharm" }),
  ).toBe(0);
  expect(
    (await notificationsApi.list({ serviceKey: "megapharm" })).notifications,
  ).toEqual([]);
});
