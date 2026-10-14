import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useOrderWorktable } from "../useOrderWorktable";
import { saveWorktablePreselection } from "../../../../utils/worktablePreselection";
import type { WorktableProduct } from "../../worktable/worktableProducts";
const api = vi.hoisted(() => ({
  load: vi.fn(),
  list: vi.fn(),
  add: vi.fn(),
  store: vi.fn(),
  service: vi.fn(),
  success: vi.fn(),
}));
vi.mock("../../worktable/worktableProducts", () => ({
  loadWorktableProducts: api.load,
}));
vi.mock("../../../../api/storeCart", () => ({
  storeCartApi: { list: api.list, addItem: api.add },
}));
vi.mock("../../../../lib/storeOrganizationHeader", () => ({
  getActiveStoreOrganizationId: api.store,
}));
vi.mock("../../../../lib/serviceContext", () => ({
  getActiveServiceKey: api.service,
}));
vi.mock("@o4o/error-handling", () => ({ toast: { success: api.success } }));
const row = (id: string, orderability = "ORDERABLE") =>
  ({
    id,
    productName: "Same fixture name",
    supplierId: "supplier",
    supplierName: "Fixture supplier",
    category: null,
    basePrice: 10,
    orderability,
  }) as WorktableProduct;
const rows = [row("one"), row("two"), row("no", "NOT_ORDERABLE")];
const added = vi.fn();
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (e: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  api.store.mockReturnValue("A");
  api.service.mockReturnValue("kpa-society");
  api.load.mockResolvedValue(rows);
  api.list.mockResolvedValue({ success: true, data: { items: [] } });
  api.add.mockResolvedValue({ success: true });
});
afterEach(cleanup);
async function hook() {
  const h = renderHook(() => useOrderWorktable("A", "kpa-society", added));
  await waitFor(() => expect(h.result.current.loading).toBe(false));
  return h;
}
function select(result: any, ids = ["one"]) {
  act(() => {
    for (const id of ids) result.current.updateQuantity(id, 2);
  });
  act(() => result.current.setShowConfirmModal(true));
}
it("failed authority load shows an error without products and retries successfully", async () => {
  api.load.mockRejectedValueOnce(new Error("synthetic"));
  const { result } = await hook();
  expect(result.current.error).toBeTruthy();
  expect(result.current.products).toEqual([]);
  await act(() => result.current.loadData());
  expect(result.current.error).toBeNull();
  expect(result.current.products).toHaveLength(3);
});
it("a late load cannot overwrite a new store, including A → B → A", async () => {
  const pending = deferred<WorktableProduct[]>();
  api.load
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce([row("B")])
    .mockResolvedValueOnce([row("fresh-A")]);
  const { result, rerender } = renderHook(
    ({ store }) => useOrderWorktable(store, "kpa-society", added),
    { initialProps: { store: "A" } },
  );
  api.store.mockReturnValue("B");
  rerender({ store: "B" });
  api.store.mockReturnValue("A");
  rerender({ store: "A" });
  await waitFor(() => expect(result.current.products[0]?.id).toBe("fresh-A"));
  await act(async () => {
    pending.resolve(rows);
    await pending.promise;
  });
  expect(result.current.products[0]?.id).toBe("fresh-A");
});
it("no selected store sends no requests", async () => {
  api.store.mockReturnValue(null);
  const { result } = renderHook(() =>
    useOrderWorktable(null, "kpa-society", added),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(api.load).not.toHaveBeenCalled();
  expect(result.current.error).toBeTruthy();
});
it("scope changes clear quantities and confirmation before any cart write", async () => {
  const { result, rerender } = renderHook(
    ({ store }) => useOrderWorktable(store, "kpa-society", added),
    { initialProps: { store: "A" } },
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  select(result);
  api.store.mockReturnValue("B");
  rerender({ store: "B" });
  await act(() => result.current.addSelectionToCart());
  expect(result.current.quantities).toEqual({});
  expect(result.current.confirmation).toBeNull();
  expect(api.list).not.toHaveBeenCalled();
});
it("confirmation fixes the original quantity and later input survives successful add", async () => {
  const pending = deferred<{ success: boolean }>();
  api.add.mockReturnValueOnce(pending.promise);
  const { result } = await hook();
  select(result);
  act(() => result.current.updateQuantity("one", 3));
  let task!: Promise<void>;
  act(() => {
    task = result.current.addSelectionToCart();
  });
  await waitFor(() => expect(api.add).toHaveBeenCalledOnce());
  expect(api.add.mock.calls[0][1].quantity).toBe(2);
  await act(async () => {
    pending.resolve({ success: true });
    await task;
  });
  expect(result.current.quantities.one).toBe(3);
  expect(added).not.toHaveBeenCalled();
});
it("duplicate clicks cannot run two cart checks or add requests", async () => {
  const pending = deferred<{ success: boolean; data: { items: never[] } }>();
  api.list.mockReturnValueOnce(pending.promise);
  const { result } = await hook();
  select(result);
  let task!: Promise<void>;
  act(() => {
    task = result.current.addSelectionToCart();
    void result.current.addSelectionToCart();
  });
  expect(api.list).toHaveBeenCalledOnce();
  await act(async () => {
    pending.resolve({ success: true, data: { items: [] } });
    await task;
  });
  expect(api.add).toHaveBeenCalledOnce();
  expect(added).toHaveBeenCalledOnce();
});
it("equal product names do not mix success and failure, and retry adds only the failed offer", async () => {
  api.add
    .mockResolvedValueOnce({ success: true })
    .mockRejectedValueOnce(new Error("synthetic"))
    .mockResolvedValueOnce({ success: true });
  const { result } = await hook();
  select(result, ["one", "two"]);
  await act(() => result.current.addSelectionToCart());
  expect(result.current.quantities.one).toBeUndefined();
  expect(result.current.quantities.two).toBe(2);
  expect(result.current.confirmation?.targets.map((t) => t.product.id)).toEqual(
    ["two"],
  );
  expect(result.current.orderError).toContain("1건");
  await act(() => result.current.addSelectionToCart());
  expect(api.add.mock.calls.map((c) => c[1].supplierProductOfferId)).toEqual([
    "one",
    "two",
    "two",
  ]);
  expect(result.current.quantities).toEqual({});
});
it("success=false for an add retains its selection instead of claiming success", async () => {
  api.add.mockResolvedValueOnce({ success: false });
  const { result } = await hook();
  select(result);
  await act(() => result.current.addSelectionToCart());
  expect(result.current.quantities.one).toBe(2);
  expect(api.success).not.toHaveBeenCalled();
  expect(result.current.orderError).toBeTruthy();
});
it("event offer cart separation is preserved", async () => {
  api.list.mockResolvedValueOnce({
    success: true,
    data: { items: [{ sourceType: "event_offer" }] },
  });
  const { result } = await hook();
  select(result);
  await act(() => result.current.addSelectionToCart());
  expect(api.add).not.toHaveBeenCalled();
  expect(result.current.orderError).toContain("이벤트");
  expect(result.current.quantities.one).toBe(2);
});
it("an unconfirmed cart response fails closed and permits retry", async () => {
  api.list.mockResolvedValueOnce({ success: false });
  const { result } = await hook();
  select(result);
  await act(() => result.current.addSelectionToCart());
  expect(api.add).not.toHaveBeenCalled();
  expect(result.current.orderError).toBeTruthy();
  await act(() => result.current.addSelectionToCart());
  expect(api.add).toHaveBeenCalledOnce();
});
it("store selection changing during the cart check stops all adds even before a hook rerender", async () => {
  const pending = deferred<{ success: boolean; data: { items: never[] } }>();
  api.list.mockReturnValueOnce(pending.promise);
  const { result } = await hook();
  select(result);
  let task!: Promise<void>;
  act(() => {
    task = result.current.addSelectionToCart();
  });
  api.store.mockReturnValue("B");
  await act(async () => {
    pending.resolve({ success: true, data: { items: [] } });
    await task;
  });
  expect(api.add).not.toHaveBeenCalled();
  expect(api.success).not.toHaveBeenCalled();
});
it("service context changing during a sequential write prevents remaining requests", async () => {
  const pending = deferred<{ success: boolean }>();
  api.add.mockReturnValueOnce(pending.promise);
  const { result } = await hook();
  select(result, ["one", "two"]);
  let task!: Promise<void>;
  act(() => {
    task = result.current.addSelectionToCart();
  });
  await waitFor(() => expect(api.add).toHaveBeenCalledOnce());
  api.service.mockReturnValue("other-service");
  await act(async () => {
    pending.resolve({ success: true });
    await task;
  });
  expect(api.add).toHaveBeenCalledOnce();
  expect(added).not.toHaveBeenCalled();
  expect(api.success).not.toHaveBeenCalled();
});
it("a new store can write while an old store request is pending without being unlocked by its completion", async () => {
  const first = deferred<{ success: boolean }>(),
    second = deferred<{ success: boolean }>();
  api.add
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result, rerender } = renderHook(
    ({ store }) => useOrderWorktable(store, "kpa-society", added),
    { initialProps: { store: "A" } },
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  select(result);
  let a!: Promise<void>, b!: Promise<void>;
  act(() => {
    a = result.current.addSelectionToCart();
  });
  await waitFor(() => expect(api.add).toHaveBeenCalledOnce());
  api.store.mockReturnValue("B");
  rerender({ store: "B" });
  await waitFor(() => expect(result.current.loading).toBe(false));
  select(result);
  act(() => {
    b = result.current.addSelectionToCart();
  });
  await waitFor(() => expect(api.add).toHaveBeenCalledTimes(2));
  await act(async () => {
    first.resolve({ success: true });
    await a;
  });
  expect(result.current.adding).toBe(true);
  expect(result.current.quantities.one).toBe(2);
  await act(async () => {
    second.resolve({ success: true });
    await b;
  });
  expect(result.current.adding).toBe(false);
});
it("a closed confirmation and a newly opened selection survive an old completion", async () => {
  const pending = deferred<{ success: boolean }>();
  api.add.mockReturnValueOnce(pending.promise);
  const { result } = await hook();
  select(result);
  let task!: Promise<void>;
  act(() => {
    task = result.current.addSelectionToCart();
  });
  await waitFor(() => expect(api.add).toHaveBeenCalledOnce());
  act(() => {
    result.current.setShowConfirmModal(false);
    result.current.updateQuantity("two", 4);
  });
  act(() => result.current.setShowConfirmModal(true));
  const next = result.current.confirmation;
  await act(async () => {
    pending.resolve({ success: true });
    await task;
  });
  expect(result.current.confirmation?.targets.map((t) => t.product.id)).toEqual(
    ["two"],
  );
  expect(next?.targets).toHaveLength(2);
  expect(result.current.quantities.two).toBe(4);
  expect(added).not.toHaveBeenCalled();
});
it("same-value edits are preserved by revision instead of equality alone", async () => {
  const pending = deferred<{ success: boolean }>();
  api.add.mockReturnValueOnce(pending.promise);
  const { result } = await hook();
  select(result);
  let task!: Promise<void>;
  act(() => {
    task = result.current.addSelectionToCart();
  });
  await waitFor(() => expect(api.add).toHaveBeenCalledOnce());
  act(() => {
    result.current.updateQuantity("one", 3);
    result.current.updateQuantity("one", 2);
  });
  await act(async () => {
    pending.resolve({ success: true });
    await task;
  });
  expect(result.current.quantities.one).toBe(2);
});
it("invalid quantities and unavailable offers cannot enter a confirmation", async () => {
  const { result } = await hook();
  act(() => {
    result.current.updateQuantity("one", 1.5);
    result.current.updateQuantity("two", Infinity);
    result.current.updateQuantity("no", 2);
  });
  act(() => result.current.setShowConfirmModal(true));
  expect(result.current.confirmation).toBeNull();
  expect(result.current.quantities.one).toBe(0);
  expect(result.current.quantities.two).toBe(0);
});
it("scoped catalog prefill applies only confirmed orderable offers and is consumed once", async () => {
  saveWorktablePreselection("A", "kpa-society", { one: 2, no: 4, absent: 1 });
  saveWorktablePreselection("B", "kpa-society", { two: 9 });
  const { result } = await hook();
  expect(result.current.quantities).toEqual({ one: 2 });
  await act(() => result.current.loadData());
  expect(result.current.quantities).toEqual({ one: 2 });
});
it("failed load does not consume a scoped handoff needed for retry", async () => {
  saveWorktablePreselection("A", "kpa-society", { one: 2 });
  api.load.mockRejectedValueOnce(new Error("synthetic"));
  const { result } = await hook();
  expect(result.current.error).toBeTruthy();
  await act(() => result.current.loadData());
  expect(result.current.quantities.one).toBe(2);
});
it("unmount prevents a pending check from sending adds", async () => {
  const pending = deferred<{ success: boolean; data: { items: never[] } }>();
  api.list.mockReturnValueOnce(pending.promise);
  const { result, unmount } = await hook();
  select(result);
  let task!: Promise<void>;
  act(() => {
    task = result.current.addSelectionToCart();
  });
  unmount();
  await act(async () => {
    pending.resolve({ success: true, data: { items: [] } });
    await task;
  });
  expect(api.add).not.toHaveBeenCalled();
});
