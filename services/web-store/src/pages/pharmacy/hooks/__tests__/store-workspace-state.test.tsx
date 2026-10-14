import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLatestStoreRequest } from "../useLatestStoreRequest";
import { useSignageSchedules } from "../useSignageSchedules";
import { useSignagePlaylists } from "../useSignagePlaylists";
import { useQrOperations } from "../useQrOperations";
import { useChannelWorkspace } from "../useChannelWorkspace";
import { useTabletScreenApplication } from "../useTabletScreenApplication";
import type { Tablet } from "../../../../api/tabletDisplays";
import type { TabletOperationToast } from "../../tablet/TabletOperationPanels";
import { useState } from "react";

const m = vi.hoisted(() => ({
  schedules: vi.fn(),
  options: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  playlists: vi.fn(),
  playlistItems: vi.fn(),
  add: vi.fn(),
  addMedia: vi.fn(),
  addLibrary: vi.fn(),
  updatePlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
  deleteItem: vi.fn(),
  reorder: vi.fn(),
  placements: vi.fn(),
  scans: vi.fn(),
  distribution: vi.fn(),
  analytics: vi.fn(),
  overview: vi.fn(),
  refreshOverview: vi.fn(),
  products: vi.fn(),
  available: vi.fn(),
  apply: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("../../../../api/signageSchedule", () => ({
  fetchSchedules: m.schedules,
  fetchSignagePlaylists: m.options,
  createSchedule: m.createSchedule,
  updateSchedule: m.updateSchedule,
  deleteSchedule: m.deleteSchedule,
}));
vi.mock("../../../../api/storePlaylist", () => ({
  fetchStorePlaylists: m.playlists,
  fetchPlaylistItems: m.playlistItems,
  addPlaylistItem: m.add,
  addPlaylistItemFromSignage: m.addMedia,
  addPlaylistItemFromLibrary: m.addLibrary,
  updateStorePlaylist: m.updatePlaylist,
  deleteStorePlaylist: m.deletePlaylist,
  deletePlaylistItem: m.deleteItem,
  reorderPlaylistItems: m.reorder,
}));
vi.mock("../../../../api/storeQr", () => ({
  listQrPlacements: m.placements,
  getQrPlacementAnalytics: m.scans,
  getStorePlacementAnalytics: m.distribution,
  getQrAnalytics: m.analytics,
}));
vi.mock("../../../../api/storeHub", () => ({ fetchChannelOverview: m.refreshOverview }));
vi.mock("../storeWorkspaceLoaders", () => ({
  loadChannelWorkspace: m.overview,
}));
vi.mock("../../../../api/channelProducts", () => ({
  fetchChannelProducts: m.products,
  fetchAvailableProducts: m.available,
}));
vi.mock("../../../../api/tabletDisplays", () => ({
  applyCurrentScreenSet: m.apply,
  clearCurrentScreenSet: m.clear,
}));
const notify = vi.fn();
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  m.schedules.mockResolvedValue({ items: [] });
  m.options.mockResolvedValue([]);
  m.playlists.mockResolvedValue([]);
  m.playlistItems.mockResolvedValue([]);
  m.overview.mockResolvedValue({
    overview: { channels: [], organizationCode: "fixture" },
    assets: [],
    slug: { canChange: true },
  });
  m.products.mockResolvedValue([]);
  m.available.mockResolvedValue([]);
  m.placements.mockResolvedValue({ data: { items: [] } });
  m.scans.mockResolvedValue({ data: { byPlacement: [] } });
});

it("subject changes, superseding requests and unmount invalidate older responses", () => {
  const { result, rerender, unmount } = renderHook(
    ({ id }) => useLatestStoreRequest(id),
    { initialProps: { id: "A" } },
  );
  const first = result.current.begin();
  expect(first()).toBe(true);
  rerender({ id: "B" });
  rerender({ id: "A" });
  expect(first()).toBe(false);
  const second = result.current.begin(),
    third = result.current.begin();
  expect(second()).toBe(false);
  expect(third()).toBe(true);
  unmount();
  expect(third()).toBe(false);
});
it("schedule loading rejects an old store response after selection changes", async () => {
  const old = deferred<{ items: never[] }>();
  m.schedules
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ items: [{ id: "B" }] });
  const { result, rerender } = renderHook(({ id }) => useSignageSchedules(id), {
    initialProps: { id: "A" },
  });
  rerender({ id: "B" });
  await waitFor(() => expect(result.current.schedules[0]?.id).toBe("B"));
  await act(async () => {
    old.resolve({ items: [] });
    await old.promise;
  });
  expect(result.current.schedules[0]?.id).toBe("B");
});
it("schedule save blocks duplicate clicks, preserves failed inputs and permits retry", async () => {
  const pending = deferred<void>();
  m.createSchedule
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({});
  const { result } = renderHook(() => useSignageSchedules("store-A"));
  await waitFor(() => expect(result.current.scheduleLoading).toBe(false));
  act(() => {
    result.current.setSchName("Morning");
    result.current.setSchPlaylistId("published");
    result.current.setShowScheduleForm(true);
  });
  let save!: Promise<void>;
  act(() => {
    save = result.current.handleSaveSchedule();
    void result.current.handleSaveSchedule();
  });
  expect(m.createSchedule).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.reject(new Error("offline"));
    await save;
  });
  expect(result.current.schName).toBe("Morning");
  expect(result.current.schSaveError).toBeTruthy();
  expect(result.current.showScheduleForm).toBe(true);
  await act(() => result.current.handleSaveSchedule());
  expect(m.createSchedule.mock.calls[1]).toEqual([
    "store-A",
    expect.objectContaining({
      storePlaylistId: "published",
      startTime: "09:00",
      daysOfWeek: [1, 2, 3, 4, 5],
    }),
  ]);
  expect(result.current.showScheduleForm).toBe(false);
  expect(result.current.schSaveError).toBeNull();
});
it("playlist partial failure retains only failed choices, so retry does not add successes twice", async () => {
  m.add
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({});
  const { result } = renderHook(() => useSignagePlaylists("store-A"));
  await waitFor(() => expect(result.current.playlistLoading).toBe(false));
  act(() => result.current.setSelectedPlaylistId("playlist-A"));
  await waitFor(() => expect(m.playlistItems).toHaveBeenCalled());
  act(() => {
    result.current.setShowAddVideoModal(true);
    result.current.setAddModalSelected(new Set(["good", "failed"]));
  });
  await act(() => result.current.handleBulkAdd());
  expect([...result.current.addModalSelected]).toEqual(["failed"]);
  expect(result.current.showAddVideoModal).toBe(true);
  expect(result.current.playlistActionError).toContain("1개");
  await act(() => result.current.handleBulkAdd());
  expect(m.add.mock.calls.map((call) => call[1])).toEqual([
    "good",
    "failed",
    "failed",
  ]);
  expect(result.current.showAddVideoModal).toBe(false);
  expect(result.current.playlistActionError).toBeNull();
});
it("playlist selection rejects late old items without clearing the new selection", async () => {
  const old = deferred<unknown[]>();
  m.playlistItems
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce([{ id: "new-item" }]);
  const { result } = renderHook(() => useSignagePlaylists("store-A"));
  act(() => result.current.setSelectedPlaylistId("A"));
  await waitFor(() => expect(m.playlistItems).toHaveBeenCalledWith("A"));
  act(() => result.current.setSelectedPlaylistId("B"));
  await waitFor(() =>
    expect(result.current.playlistItems[0]?.id).toBe("new-item"),
  );
  await act(async () => {
    old.resolve([{ id: "old-item" }]);
    await old.promise;
  });
  expect(result.current.playlistItems[0]?.id).toBe("new-item");
});
it("playlist publish failure reports the action error and releases its duplicate lock", async () => {
  const pending = deferred<void>();
  m.updatePlaylist
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({});
  const { result } = renderHook(() => useSignagePlaylists("store-A"));
  let task!: Promise<void>;
  const playlist = { id: "A", publishStatus: "draft" } as never;
  act(() => {
    task = result.current.handleTogglePublish(playlist);
    void result.current.handleTogglePublish(playlist);
  });
  expect(m.updatePlaylist).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.reject(new Error("offline"));
    await task;
  });
  expect(result.current.playlistActionError).toBeTruthy();
  expect(result.current.playlistError).toBeNull();
  await act(() => result.current.handleTogglePublish(playlist));
  expect(m.updatePlaylist).toHaveBeenCalledTimes(2);
});
it("QR switching subjects cannot display the previous QR placement response", async () => {
  const old = deferred<unknown>();
  m.placements
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ data: { items: [{ id: "B-placement" }] } });
  const { result } = renderHook(() => useQrOperations(async () => {}));
  let first!: Promise<void>;
  act(() => {
    first = result.current.handleShowPlacements("A");
  });
  await act(() => result.current.handleShowPlacements("B"));
  await act(async () => {
    old.resolve({ data: { items: [{ id: "A-placement" }] } });
    await first;
  });
  expect(result.current.placementId).toBe("B");
  expect(result.current.placementItems[0]?.id).toBe("B-placement");
});
it("QR closing a pending placement panel invalidates its response", async () => {
  const old = deferred<unknown>();
  m.placements.mockReturnValueOnce(old.promise);
  const { result } = renderHook(() => useQrOperations(async () => {}));
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleShowPlacements("A");
  });
  await act(() => result.current.handleShowPlacements("A"));
  await act(async () => {
    old.resolve({ data: { items: [{ id: "late" }] } });
    await task;
  });
  expect(result.current.placementId).toBeNull();
  expect(result.current.placementItems).toEqual([]);
  expect(result.current.placementLoading).toBe(false);
});
it("QR mutation fails visibly, ignores duplicate execution, then permits retry", async () => {
  const pending = deferred<void>(),
    mutation = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({});
  const reload = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useQrOperations(reload));
  await act(() => result.current.handleShowPlacements("A"));
  let task!: Promise<void>;
  act(() => {
    task = result.current.runPlacementAction("A", mutation);
    void result.current.runPlacementAction("A", mutation);
  });
  expect(mutation).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.reject(new Error("offline"));
    await task;
  });
  expect(result.current.placementError).toBe("offline");
  expect(result.current.placementBusy).toBe(false);
  await act(() => result.current.runPlacementAction("A", mutation));
  expect(result.current.placementError).toBeNull();
  expect(reload).toHaveBeenCalledTimes(1);
});
it("QR distribution period changes discard late data and late errors", async () => {
  const old = deferred<unknown>();
  m.distribution
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ data: { totalScans: 7 } });
  const { result } = renderHook(() => useQrOperations(async () => {}));
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleToggleDistribution();
  });
  await act(() => result.current.handleChangeDistDays(7));
  await act(async () => {
    old.reject(new Error("late offline"));
    await task;
  });
  expect(result.current.distDays).toBe(7);
  expect(result.current.distData).toEqual({ totalScans: 7 });
  expect(result.current.distError).toBeNull();
});
it("QR per-item analytics keeps the newest selected result", async () => {
  const old = deferred<unknown>();
  m.analytics
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ success: true, data: { totalScans: 9 } });
  const { result } = renderHook(() => useQrOperations(async () => {}));
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleShowAnalytics("A");
  });
  await act(() => result.current.handleShowAnalytics("B"));
  await act(async () => {
    old.resolve({ success: true, data: { totalScans: 1 } });
    await task;
  });
  expect(result.current.analyticsId).toBe("B");
  expect(result.current.analyticsData?.totalScans).toBe(9);
});
it("channel products keep confirmed data on failure and retry clears the error", async () => {
  m.products
    .mockResolvedValueOnce([{ id: "saved" }])
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce([]);
  const { result } = renderHook(() => useChannelWorkspace(true, notify));
  await act(() => result.current.loadChannelProducts("A"));
  await act(() => result.current.loadChannelProducts("A"));
  expect(result.current.channelProducts[0]?.id).toBe("saved");
  expect(result.current.productError).toBeTruthy();
  await act(() => result.current.loadChannelProducts("A"));
  expect(result.current.channelProducts).toEqual([]);
  expect(result.current.productError).toBeNull();
});
it("channel overview refresh and product switching ignore older responses", async () => {
  const old = deferred<unknown>();
  m.overview.mockReturnValueOnce(old.promise);
  const { result } = renderHook(() => useChannelWorkspace(true, notify));
  await act(() => result.current.fetchData());
  await act(async () => {
    old.resolve({
      overview: { channels: [], organizationCode: "old" },
      assets: [],
      slug: null,
    });
    await old.promise;
  });
  expect(result.current.orgCode).toBe("fixture");
  const oldProducts = deferred<unknown[]>();
  m.products
    .mockReturnValueOnce(oldProducts.promise)
    .mockResolvedValueOnce([{ id: "B" }]);
  let task!: Promise<void>;
  act(() => {
    task = result.current.loadChannelProducts("A");
  });
  await act(() => result.current.loadChannelProducts("B"));
  await act(async () => {
    oldProducts.resolve([{ id: "A" }]);
    await task;
  });
  expect(result.current.channelProducts[0]?.id).toBe("B");
});
function useTabletFixture(previous: string | null = "old") {
  const [tablets, setTablets] = useState<Tablet[]>([
    { id: "tablet-A", name: "Counter", currentScreenSetId: previous } as Tablet,
  ]);
  const [toast, setToast] = useState<TabletOperationToast | null>(null);
  return {
    ...useTabletScreenApplication(
      tablets,
      setTablets,
      { next: { name: "Next" } },
      setToast,
    ),
    tablets,
    toast,
  };
}
it.each(["old", null])(
  "tablet apply and undo reuse the previous %s screen contract",
  async (previous) => {
    const { result } = renderHook(() => useTabletFixture(previous));
    await act(() => result.current.handleApplyToTablet("next", "tablet-A"));
    expect(result.current.tablets[0].currentScreenSetId).toBe("next");
    expect(m.apply).toHaveBeenCalledWith("tablet-A", "next");
    await act(async () => {
      await result.current.toast?.action?.onClick();
    });
    expect(result.current.tablets[0].currentScreenSetId).toBe(previous);
    if (previous) expect(m.apply).toHaveBeenLastCalledWith("tablet-A", "old");
    else expect(m.clear).toHaveBeenCalledWith("tablet-A");
  },
);
it("tablet failed apply preserves the current screen and duplicate calls do not write twice", async () => {
  const pending = deferred<void>();
  m.apply.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({});
  const { result } = renderHook(() => useTabletFixture());
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleApplyToTablet("next", "tablet-A");
  });
  await act(async () => {
    await expect(
      result.current.handleApplyToTablet("next", "tablet-A"),
    ).rejects.toThrow("처리 중");
  });
  expect(m.apply).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.reject(
      Object.assign(new Error("inactive"), { code: "SCREEN_SET_NOT_ACTIVE" }),
    );
    await expect(task).rejects.toThrow("inactive");
  });
  expect(result.current.tablets[0].currentScreenSetId).toBe("old");
  expect(result.current.toast?.message).toContain("지금 적용할 수 없는");
  await act(() => result.current.handleApplyToTablet("next", "tablet-A"));
  expect(m.apply).toHaveBeenCalledTimes(2);
});

it("a playlist bulk response cannot clear a different selected playlist draft", async () => {
  const old = deferred<void>();
  m.add.mockReturnValueOnce(old.promise);
  const { result } = renderHook(() => useSignagePlaylists("store-A"));
  act(() => result.current.setSelectedPlaylistId("A"));
  await waitFor(() => expect(m.playlistItems).toHaveBeenCalledWith("A"));
  act(() => {
    result.current.setShowAddVideoModal(true);
    result.current.setAddModalSelected(new Set(["old-choice"]));
  });
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleBulkAdd();
  });
  act(() => {
    result.current.setSelectedPlaylistId("B");
    result.current.setAddModalSelected(new Set(["new-choice"]));
  });
  await waitFor(() => expect(m.playlistItems).toHaveBeenCalledWith("B"));
  await act(async () => {
    old.resolve();
    await task;
  });
  expect([...result.current.addModalSelected]).toEqual(["new-choice"]);
  expect(result.current.showAddVideoModal).toBe(true);
});
it("QR pending distribution cannot repopulate data after switching stores", async () => {
  const old = deferred<unknown>();
  m.distribution.mockReturnValueOnce(old.promise);
  const { result, rerender } = renderHook(
    ({ id }) => useQrOperations(async () => {}, id),
    { initialProps: { id: "store-A" } },
  );
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleToggleDistribution();
  });
  rerender({ id: "store-B" });
  await act(async () => {
    old.resolve({ data: { totalScans: 100 } });
    await task;
  });
  expect(result.current.distOpen).toBe(false);
  expect(result.current.distData).toBeNull();
  expect(result.current.distLoading).toBe(false);
});
it("channel store changes start a new overview and reject the previous store", async () => {
  const old = deferred<unknown>();
  m.overview.mockReturnValueOnce(old.promise);
  const { result, rerender } = renderHook(
    ({ id }) => useChannelWorkspace(true, notify, id),
    { initialProps: { id: "store-A" } },
  );
  rerender({ id: "store-B" });
  await waitFor(() => expect(result.current.orgCode).toBe("fixture"));
  await act(async () => {
    old.resolve({
      overview: { channels: [], organizationCode: "store-A" },
      assets: [],
      slug: null,
    });
    await old.promise;
  });
  expect(result.current.orgCode).toBe("fixture");
  expect(m.overview).toHaveBeenCalledTimes(2);
});
it("tablet undo failure leaves the applied screen intact and permits retry", async () => {
  const { result } = renderHook(() => useTabletFixture());
  await act(() => result.current.handleApplyToTablet("next", "tablet-A"));
  const undo = result.current.toast?.action?.onClick;
  m.apply.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({});
  await act(async () => {
    await undo?.();
  });
  expect(result.current.tablets[0].currentScreenSetId).toBe("next");
  expect(result.current.toast?.type).toBe("error");
  await act(async () => {
    await undo?.();
  });
  expect(result.current.tablets[0].currentScreenSetId).toBe("old");
});


it("channel overview refresh supersedes an older load and settles its loading state", async () => {
  const initial = deferred<{ overview: { channels: never[]; organizationCode: string }; assets: null; slug: null }>();
  m.overview.mockReturnValue(initial.promise);
  m.refreshOverview.mockResolvedValue([{ id: 'fresh-channel' }]);
  const { result } = renderHook(() => useChannelWorkspace(false, notify, 'store-A'));
  expect(result.current.loading).toBe(true);
  await act(async () => { await result.current.refreshOverview(); });
  expect(result.current.loading).toBe(false);
  expect(result.current.channels[0].id).toBe('fresh-channel');
  await act(async () => { initial.resolve({ overview: { channels: [], organizationCode: 'old' }, assets: null, slug: null }); });
  expect(result.current.channels[0].id).toBe('fresh-channel');
});
