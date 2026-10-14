import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useQrCreation } from "../../qr/useQrCreation";
import { useChannelProductPicker } from "../useChannelProductPicker";
import { useChannelProductActions } from "../useChannelProductActions";
import type { StoreQrCode } from "../../../../api/storeQr";
const api = vi.hoisted(() => ({
  create: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
  bulk: vi.fn(),
  reorder: vi.fn(),
  available: vi.fn(),
  add: vi.fn(),
}));
vi.mock("../../../../api/storeQr", () => ({ createStoreQrCode: api.create }));
vi.mock("../../../../api/channelProducts", () => ({
  activateChannelProduct: api.activate,
  deactivateChannelProduct: api.deactivate,
  bulkChannelProductAction: api.bulk,
  reorderChannelProducts: api.reorder,
  fetchAvailableProducts: api.available,
  addProductToChannel: api.add,
}));
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const saved = { id: "saved", title: "Saved draft" } as StoreQrCode;
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
it("QR save captures its payload, prevents duplicates and preserves edits made during the request", async () => {
  const pending = deferred<{ success: boolean; data: StoreQrCode }>();
  api.create.mockReturnValue(pending.promise);
  const created = vi.fn();
  const { result } = renderHook(() => useQrCreation("store-A", created));
  act(() => result.current.selectVideo({ id: "video-A", title: "Video A" }));
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
  });
  act(() => {
    void result.current.save();
    result.current.changeDraft("title", "New draft");
  });
  expect(api.create).toHaveBeenCalledOnce();
  expect(api.create.mock.calls[0][0]).toMatchObject({
    title: "Video A",
    landingTargetId: "video-A",
  });
  await act(async () => {
    pending.resolve({ success: true, data: saved });
    await task;
  });
  expect(created).toHaveBeenCalledWith(saved);
  expect(result.current.draft.title).toBe("New draft");
  expect(result.current.creating).toBe(true);
});
it("QR cancellation and a new target survive an old save completion", async () => {
  const pending = deferred<{ success: boolean; data: StoreQrCode }>();
  api.create.mockReturnValue(pending.promise);
  const { result } = renderHook(() => useQrCreation("store-A", vi.fn()));
  act(() => result.current.selectVideo({ id: "A", title: "A" }));
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
  });
  act(() => {
    result.current.cancel();
    result.current.selectVideo({ id: "B", title: "B" });
  });
  await act(async () => {
    pending.resolve({ success: true, data: saved });
    await task;
  });
  expect(result.current.videoTarget?.id).toBe("B");
  expect(result.current.error).toBeNull();
});
it("QR failure retains the draft and allows a successful retry", async () => {
  api.create
    .mockRejectedValueOnce(new Error("synthetic"))
    .mockResolvedValueOnce({ success: true, data: saved });
  const { result } = renderHook(() => useQrCreation("store-A", vi.fn()));
  act(() => result.current.selectVideo({ id: "A", title: "A" }));
  await act(async () => {
    await result.current.save();
  });
  expect(result.current.error).toBeTruthy();
  expect(result.current.draft.title).toBe("A");
  await act(async () => {
    await result.current.save();
  });
  expect(result.current.creating).toBe(false);
  expect(result.current.error).toBeNull();
});
it("QR results from a previous store do not enter the new store list", async () => {
  const pending = deferred<{ success: boolean; data: StoreQrCode }>();
  api.create.mockReturnValue(pending.promise);
  const created = vi.fn();
  const { result, rerender } = renderHook(
    ({ org }) => useQrCreation(org, created),
    { initialProps: { org: "A" } },
  );
  act(() => result.current.selectVideo({ id: "A", title: "A" }));
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
  });
  rerender({ org: "B" });
  await act(async () => {
    pending.resolve({ success: true, data: saved });
    await task;
  });
  expect(created).not.toHaveBeenCalled();
  expect(result.current.creating).toBe(false);
});
function channelHook() {
  const refreshProducts = vi.fn().mockResolvedValue(undefined),
    refreshOverview = vi.fn().mockResolvedValue(undefined),
    showToast = vi.fn();
  const hook = renderHook(
    ({ id }) =>
      useChannelProductActions({
        organizationId: "store",
        channelId: id,
        activeProducts: [],
        refreshProducts,
        refreshOverview,
        showToast,
      }),
    { initialProps: { id: "A" } },
  );
  return { ...hook, refreshProducts, refreshOverview, showToast };
}
it("a channel confirmation is cancelled on channel change and cannot act on the new channel", async () => {
  const { result, rerender } = channelHook();
  act(() => {
    void result.current.handleSingleAction("delete", "product-A");
  });
  expect(result.current.confirmModal?.channelId).toBe("A");
  rerender({ id: "B" });
  await act(async () => {
    await result.current.handleConfirmAction();
  });
  expect(api.bulk).not.toHaveBeenCalled();
  expect(result.current.confirmModal).toBeNull();
});
it("a late channel mutation cannot refresh or clear selections in another channel", async () => {
  const pending = deferred<void>();
  api.activate.mockReturnValue(pending.promise);
  const { result, rerender, refreshProducts, showToast } = channelHook();
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleSingleAction("activate", "product-A");
  });
  rerender({ id: "B" });
  act(() => result.current.setSelectedIds(new Set(["product-B"])));
  await act(async () => {
    pending.resolve();
    await task;
  });
  expect(api.activate).toHaveBeenCalledWith("A", "product-A");
  expect(refreshProducts).not.toHaveBeenCalled();
  expect(showToast).not.toHaveBeenCalled();
  expect(result.current.selectedIds.has("product-B")).toBe(true);
});
it("channel duplicate submission is blocked and partial-success feedback is preserved", async () => {
  const pending = deferred<{ requested: number; processed: number }>();
  api.bulk.mockReturnValue(pending.promise);
  const { result, showToast, refreshProducts } = channelHook();
  act(() => result.current.setSelectedIds(new Set(["one", "two"])));
  act(() => result.current.handleBulkAction("deactivate"));
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleConfirmAction();
    void result.current.handleConfirmAction();
  });
  expect(api.bulk).toHaveBeenCalledOnce();
  await act(async () => {
    pending.resolve({ requested: 2, processed: 1 });
    await task;
  });
  expect(showToast).toHaveBeenCalledWith(
    "error",
    expect.stringContaining("일부 실패"),
  );
  expect(refreshProducts).toHaveBeenCalledWith("A");
  expect(result.current.confirmModal).toBeNull();
});
it("channel failure releases the lock so the operation can be retried", async () => {
  api.activate
    .mockRejectedValueOnce(new Error("synthetic"))
    .mockResolvedValueOnce(undefined);
  const { result, refreshProducts } = channelHook();
  await act(async () => {
    await result.current.handleSingleAction("activate", "one");
  });
  expect(result.current.actionLoading).toBe(false);
  await act(async () => {
    await result.current.handleSingleAction("activate", "one");
  });
  await waitFor(() => expect(refreshProducts).toHaveBeenCalledWith("A"));
});

it("library QR keeps the page-reference and consultation contract, and a new target starts with clean CTA fields", async () => {
  api.create.mockResolvedValue({ success: true, data: saved });
  const { result } = renderHook(() => useQrCreation("store-A", vi.fn()));
  const library = {
    id: "content-A",
    title: "Content A",
    source: "content-hub" as const,
    assetType: "content",
    category: null,
    fileUrl: null,
    url: null,
    htmlContent: null,
  };
  act(() => {
    result.current.selectLibrary(library);
  });
  act(() => {
    result.current.changeDraft("ctaEnabled", true);
    result.current.changeDraft("ctaLabel", "Ask");
  });
  await act(async () => {
    await result.current.save();
  });
  expect(api.create).toHaveBeenCalledWith(
    expect.objectContaining({
      landingType: "page",
      landingTargetId: "content-A",
      consultationCtaEnabled: true,
      consultationCtaLabel: "Ask",
    }),
  );
  expect(api.create.mock.calls[0][0].libraryItemId).toBeUndefined();
  act(() => result.current.selectVideo({ id: "video-B", title: "B" }));
  expect(result.current.draft.ctaEnabled).toBe(false);
  expect(result.current.draft.ctaLabel).toBe("");
});
it("late QR failure is not attached to a newly selected target", async () => {
  const pending = deferred<{ success: boolean; data: StoreQrCode }>();
  api.create.mockReturnValue(pending.promise);
  const { result } = renderHook(() => useQrCreation("store-A", vi.fn()));
  act(() => result.current.selectVideo({ id: "A", title: "A" }));
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
  });
  act(() => result.current.selectVideo({ id: "B", title: "B" }));
  await act(async () => {
    pending.reject(new Error("synthetic"));
    await task;
  });
  expect(result.current.error).toBeNull();
  expect(result.current.videoTarget?.id).toBe("B");
});
it("bulk completion preserves products selected after the submitted batch", async () => {
  const pending = deferred<{ requested: number; processed: number }>();
  api.bulk.mockReturnValue(pending.promise);
  const { result } = channelHook();
  act(() => result.current.setSelectedIds(new Set(["submitted"])));
  act(() => result.current.handleBulkAction("activate"));
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleConfirmAction();
  });
  act(() =>
    result.current.setSelectedIds(new Set(["submitted", "new-selection"])),
  );
  await act(async () => {
    pending.resolve({ requested: 1, processed: 1 });
    await task;
  });
  expect([...result.current.selectedIds]).toEqual(["new-selection"]);
});

it("a pending QR save in store A does not block store B or clear its busy state", async () => {
  const a = deferred<{ success: boolean; data: StoreQrCode }>(),
    b = deferred<{ success: boolean; data: StoreQrCode }>();
  api.create.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const created = vi.fn();
  const { result, rerender } = renderHook(
    ({ org }) => useQrCreation(org, created),
    { initialProps: { org: "A" } },
  );
  act(() => result.current.selectVideo({ id: "A", title: "A" }));
  let first!: Promise<void>, second!: Promise<void>;
  act(() => {
    first = result.current.save();
  });
  rerender({ org: "B" });
  expect(result.current.saving).toBe(false);
  act(() => result.current.selectVideo({ id: "B", title: "B" }));
  act(() => {
    second = result.current.save();
  });
  expect(api.create).toHaveBeenCalledTimes(2);
  await act(async () => {
    a.resolve({ success: true, data: saved });
    await first;
  });
  expect(result.current.saving).toBe(true);
  expect(created).not.toHaveBeenCalled();
  await act(async () => {
    b.resolve({ success: true, data: saved });
    await second;
  });
  expect(result.current.saving).toBe(false);
  expect(created).toHaveBeenCalledOnce();
});
it("channel B can mutate while A is pending and A completion does not unlock B", async () => {
  const a = deferred<void>(),
    b = deferred<void>();
  api.activate.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result, rerender } = channelHook();
  let first!: Promise<void>, second!: Promise<void>;
  act(() => {
    first = result.current.handleSingleAction("activate", "A");
  });
  rerender({ id: "B" });
  act(() => {
    second = result.current.handleSingleAction("activate", "B");
  });
  expect(api.activate).toHaveBeenCalledTimes(2);
  await act(async () => {
    a.resolve();
    await first;
  });
  expect(result.current.actionLoading).toBe(true);
  await act(async () => {
    b.resolve();
    await second;
  });
  expect(result.current.actionLoading).toBe(false);
});
function pickerHook() {
  const added = vi.fn(),
    error = vi.fn();
  api.available.mockResolvedValue([]);
  const hook = renderHook(
    ({ open, id }) => useChannelProductPicker(open, "store", id, added, error),
    { initialProps: { open: true, id: "A" } },
  );
  return { ...hook, added, error };
}
it("closing the picker during a successful add still refreshes the original channel", async () => {
  const pending = deferred<void>();
  api.add.mockReturnValue(pending.promise);
  const { result, rerender, added } = pickerHook();
  await waitFor(() => expect(result.current.loadingList).toBe(false));
  let task!: Promise<void>;
  act(() => {
    task = result.current.add("product");
  });
  rerender({ open: false, id: "A" });
  await act(async () => {
    pending.resolve();
    await task;
  });
  expect(added).toHaveBeenCalledOnce();
});
it("picker availability failure clears prior choices and supports retry", async () => {
  const { result, rerender } = pickerHook();
  api.available.mockResolvedValueOnce([{ id: "old-choice" }]);
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.available).toHaveLength(1));
  rerender({ open: false, id: "A" });
  api.available.mockRejectedValueOnce(new Error("synthetic"));
  rerender({ open: true, id: "A" });
  await waitFor(() => expect(result.current.loadError).toBeTruthy());
  expect(result.current.available).toEqual([]);
  api.available.mockResolvedValueOnce([{ id: "new-choice" }]);
  act(() => result.current.retry());
  await waitFor(() =>
    expect(result.current.available[0]?.id).toBe("new-choice"),
  );
  expect(result.current.loadError).toBeNull();
});
it("a successful picker add from another channel cannot refresh the selected channel", async () => {
  const pending = deferred<void>();
  api.add.mockReturnValue(pending.promise);
  const { result, rerender, added } = pickerHook();
  let task!: Promise<void>;
  act(() => {
    task = result.current.add("product-A");
  });
  rerender({ open: true, id: "B" });
  await act(async () => {
    pending.resolve();
    await task;
  });
  expect(added).not.toHaveBeenCalled();
});
it("picker channel B remains usable while an add to channel A is pending", async () => {
  const a = deferred<void>(),
    b = deferred<void>();
  api.add.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result, rerender, added } = pickerHook();
  let first!: Promise<void>, second!: Promise<void>;
  act(() => {
    first = result.current.add("product-A");
  });
  rerender({ open: true, id: "B" });
  act(() => {
    second = result.current.add("product-B");
  });
  expect(api.add).toHaveBeenCalledTimes(2);
  await act(async () => {
    a.resolve();
    await first;
  });
  expect(result.current.addingId).toBe("product-B");
  await act(async () => {
    b.resolve();
    await second;
  });
  expect(added).toHaveBeenCalledOnce();
});
