import { beforeEach, expect, it, vi } from "vitest";
import { loadWorktableProducts } from "../worktableProducts";
const api = vi.hoisted(() => ({ catalog: vi.fn(), orderable: vi.fn() }));
vi.mock("../../../../api/pharmacyProducts", () => ({
  getCatalog: api.catalog,
  getOrderable: api.orderable,
}));
const catalog = (id: string, added = true) => ({
  id,
  name: "Fixture product",
  supplierId: "supplier",
  supplierName: "Fixture supplier",
  isAdded: added,
  priceGeneral: 10,
});
const orderable = (id: string, sourceType = "b2b") => ({
  offerId: id,
  sourceType,
});
const catPage = (
  data: unknown[],
  total = data.length,
  offset = 0,
  limit = 100,
) => ({ success: true, data, pagination: { total, offset, limit } });
const orderPage = (
  data: unknown[],
  total = data.length,
  page = 1,
  limit = 100,
) => ({
  success: true,
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  },
});
beforeEach(() => {
  vi.resetAllMocks();
  api.catalog.mockResolvedValue(catPage([]));
  api.orderable.mockResolvedValue(orderPage([]));
});
it("reads catalog offset pages and uses authority for an interest product beyond the first 100", async () => {
  const initial = Array.from({ length: 100 }, (_, i) =>
    catalog(`first-${i}`, false),
  );
  api.catalog
    .mockResolvedValueOnce(catPage(initial, 101))
    .mockResolvedValueOnce(catPage([catalog("late")], 101, 100));
  api.orderable.mockResolvedValue(orderPage([orderable("late")]));
  const result = await loadWorktableProducts(() => true);
  expect(api.catalog.mock.calls.map(([p]) => p.offset)).toEqual([0, 100]);
  expect(result).toMatchObject([{ id: "late", orderability: "ORDERABLE" }]);
});
it("reads authority beyond 20 pages instead of falsely declaring a later offer unavailable", async () => {
  api.catalog.mockResolvedValue(catPage([catalog("offer-2001")]));
  api.orderable.mockImplementation(({ page, limit }) => {
    const start = (page - 1) * limit,
      total = 2002;
    const rows = Array.from(
      { length: Math.min(limit, total - start) },
      (_, i) => orderable(`offer-${start + i}`),
    );
    return Promise.resolve(orderPage(rows, total, page, limit));
  });
  const result = await loadWorktableProducts(() => true);
  expect(api.orderable).toHaveBeenCalledTimes(21);
  expect(result[0].orderability).toBe("ORDERABLE");
});
it("success=false or absent pagination is an error rather than an empty authority", async () => {
  api.orderable.mockResolvedValueOnce({ ...orderPage([]), success: false });
  await expect(loadWorktableProducts(() => true)).rejects.toThrow("전체 상품");
  api.orderable.mockResolvedValueOnce({ success: true, data: [] });
  await expect(loadWorktableProducts(() => true)).rejects.toThrow("전체 상품");
});
it("an empty middle catalog page cannot produce a silently truncated worktable", async () => {
  api.catalog
    .mockResolvedValueOnce(
      catPage(
        Array.from({ length: 100 }, (_, i) => catalog(String(i))),
        201,
      ),
    )
    .mockResolvedValueOnce(catPage([], 201, 100));
  await expect(loadWorktableProducts(() => true)).rejects.toThrow("전체 상품");
});
it("an incomplete authority response cannot downgrade an approved offer", async () => {
  api.catalog.mockResolvedValue(catPage([catalog("missing")]));
  api.orderable.mockResolvedValue(orderPage([], 101));
  await expect(loadWorktableProducts(() => true)).rejects.toThrow("전체 상품");
});
it("malformed page metadata is rejected, while numeric count strings from PostgreSQL are accepted", async () => {
  api.catalog.mockResolvedValueOnce({
    ...catPage([]),
    pagination: { total: "", limit: 100, offset: 0 },
  });
  await expect(loadWorktableProducts(() => true)).rejects.toThrow("전체 상품");
  api.catalog.mockResolvedValueOnce({
    ...catPage([catalog("one")]),
    pagination: { total: "1", limit: 100, offset: 0 },
  });
  await expect(loadWorktableProducts(() => true)).resolves.toMatchObject([
    { id: "one" },
  ]);
});
it("cancelling during a paged response stops subsequent implicit-store requests", async () => {
  let current = true;
  api.catalog.mockImplementationOnce(async () => {
    current = false;
    return catPage(
      Array.from({ length: 100 }, (_, i) => catalog(String(i))),
      200,
    );
  });
  await expect(loadWorktableProducts(() => current)).rejects.toThrow("문맥");
  expect(api.catalog).toHaveBeenCalledOnce();
});
it("the bounded read fails explicitly when all pages cannot be confirmed", async () => {
  api.orderable.mockImplementation(({ page, limit }) =>
    Promise.resolve(
      orderPage(
        Array.from({ length: limit }, (_, i) => orderable(`${page}-${i}`)),
        20100,
        page,
        limit,
      ),
    ),
  );
  await expect(loadWorktableProducts(() => true)).rejects.toThrow("전체 상품");
  expect(api.orderable).toHaveBeenCalledTimes(200);
});
it("only added offers enter the worktable and event/recruitment axes stay separate", async () => {
  api.catalog.mockResolvedValue(
    catPage([
      catalog("event"),
      catalog("recruit"),
      catalog("regular"),
      catalog("outside", false),
    ]),
  );
  api.orderable.mockResolvedValue(
    orderPage([
      orderable("event", "event_offer"),
      orderable("recruit", "seller_recruitment"),
      orderable("regular", "operator"),
    ]),
  );
  const result = await loadWorktableProducts(() => true);
  expect(result.map((r) => r.orderability)).toEqual([
    "EVENT_OFFER_AXIS",
    "RECRUITMENT_AXIS",
    "ORDERABLE",
  ]);
});
