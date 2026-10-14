import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTabletDevices } from "../useTabletDevices";
import {
  TabletDeviceList,
  TabletPairingModal,
} from "../../tablet/TabletDevicePanels";
import type { TabletDevice } from "../../../../api/tabletDisplays";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  pair: vi.fn(),
  move: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("../../../../api/tabletDisplays", () => ({
  fetchTabletDevices: api.list,
  createPairingCode: api.pair,
  updateTabletDevice: api.move,
  disconnectTabletDevice: api.disconnect,
}));
const locations = [
  { id: "one", name: "One", location: "A-01", is_active: true },
  { id: "two", name: "Two", location: "A-02", is_active: true },
];
const device = {
  id: "device",
  organizationId: "A",
  name: "Fixture tablet",
  currentLocationId: "one",
  isActive: true,
  pairingPending: false,
  lastSeenAt: null,
} as TabletDevice;
const notify = vi.fn();
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue([device]);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("failed device discovery shows a retry instead of claiming no devices", async () => {
  api.list
    .mockRejectedValueOnce(new Error("synthetic"))
    .mockResolvedValueOnce([]);
  function Panel() {
    const operations = useTabletDevices("A", locations, notify);
    return <TabletDeviceList tablets={locations} operations={operations} />;
  }
  render(<Panel />);
  await screen.findByRole("alert");
  expect(screen.queryByText(/연결된 실제 태블릿이 없습니다/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await screen.findByText(/연결된 실제 태블릿이 없습니다/);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("old store device discovery cannot enter another store, including A → B → A", async () => {
  const pending = deferred<TabletDevice[]>();
  api.list
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ ...device, id: "fresh" }]);
  const { result, rerender } = renderHook(
    ({ store }) => useTabletDevices(store, locations, notify),
    { initialProps: { store: "A" } },
  );
  rerender({ store: "B" });
  rerender({ store: "A" });
  await waitFor(() =>
    expect(result.current.connectedDevices[0]?.id).toBe("fresh"),
  );
  await act(async () => {
    pending.resolve([device]);
    await pending.promise;
  });
  expect(result.current.connectedDevices[0]?.id).toBe("fresh");
});

it("pairing blocks duplicate requests and ignores results from a previous store", async () => {
  const pending = deferred<{ code: string; expiresAt: string }>();
  api.pair
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ code: "synthetic-code", expiresAt: "2099-01-01" });
  const { result, rerender } = renderHook(
    ({ store }) => useTabletDevices(store, locations, notify),
    { initialProps: { store: "A" } },
  );
  let task!: Promise<void>;
  act(() => {
    task = result.current.handleCreatePairingCode(locations[0]);
    void result.current.handleCreatePairingCode(locations[1]);
  });
  expect(api.pair).toHaveBeenCalledOnce();
  rerender({ store: "B" });
  await act(() => result.current.handleCreatePairingCode(locations[1]));
  expect(result.current.pairing?.locationId).toBe("two");
  await act(async () => {
    pending.resolve({ code: "old-synthetic", expiresAt: "2099-01-01" });
    await task;
  });
  expect(result.current.pairing?.locationId).toBe("two");
  expect(notify).not.toHaveBeenCalled();
});

it("a move blocks a simultaneous disconnect of the same device and releases its lock after failure", async () => {
  const pending = deferred<void>();
  api.move.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({});
  const { result } = renderHook(() => useTabletDevices("A", locations, notify));
  await waitFor(() => expect(result.current.loading).toBe(false));
  let task!: Promise<void | undefined>;
  act(() => {
    task = result.current.handleMoveDevice(device, "two")!;
    void result.current.handleMoveDevice(device, "two");
    void result.current.handleDisconnectDevice(device);
  });
  expect(api.move).toHaveBeenCalledOnce();
  expect(api.disconnect).not.toHaveBeenCalled();
  await act(async () => {
    pending.reject(new Error("synthetic"));
    await task;
  });
  expect(result.current.busyIds.size).toBe(0);
  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({ type: "error" }),
  );
  await act(() => result.current.handleMoveDevice(device, "two"));
  expect(api.move).toHaveBeenCalledTimes(2);
});

it("an old move cannot refresh another store or show a success toast after A → B → A", async () => {
  const pending = deferred<void>();
  api.move.mockReturnValueOnce(pending.promise);
  const { result, rerender } = renderHook(
    ({ store }) => useTabletDevices(store, locations, notify),
    { initialProps: { store: "A" } },
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  let task!: Promise<void | undefined>;
  act(() => {
    task = result.current.handleMoveDevice(device, "two")!;
  });
  rerender({ store: "B" });
  rerender({ store: "A" });
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(3));
  await act(async () => {
    pending.resolve();
    await task;
  });
  expect(api.list).toHaveBeenCalledTimes(3);
  expect(notify).not.toHaveBeenCalled();
  expect(result.current.busyIds.size).toBe(0);
});

it("independent devices can move concurrently and one completion does not unlock the other", async () => {
  const first = deferred<void>(),
    second = deferred<void>();
  api.move
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result } = renderHook(() => useTabletDevices("A", locations, notify));
  let a!: Promise<void | undefined>, b!: Promise<void | undefined>;
  act(() => {
    a = result.current.handleMoveDevice(device, "two")!;
    b = result.current.handleMoveDevice({ ...device, id: "other" }, "two")!;
  });
  expect(result.current.busyIds.size).toBe(2);
  await act(async () => {
    first.resolve();
    await a;
  });
  expect([...result.current.busyIds]).toEqual(["other"]);
  await act(async () => {
    second.resolve();
    await b;
  });
  expect(result.current.busyIds.size).toBe(0);
});

it("a successful disconnect with failed refresh reports unconfirmed discovery rather than an empty list", async () => {
  api.disconnect.mockResolvedValue(undefined);
  const { result } = renderHook(() => useTabletDevices("A", locations, notify));
  await waitFor(() => expect(result.current.connectedDevices.length).toBe(1));
  api.list.mockRejectedValueOnce(new Error("synthetic"));
  await act(() => result.current.handleDisconnectDevice(device));
  expect(result.current.loadError).toBeTruthy();
  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({ type: "success" }),
  );
});

it("the pairing dialog has an accessible name and Escape closes it", () => {
  const close = vi.fn();
  render(
    <TabletPairingModal
      pairing={{
        locationId: "one",
        locationLabel: "A-01",
        code: "synthetic",
        expiresAt: "2099-01-01",
      }}
      onClose={close}
    />,
  );
  expect(
    screen.getByRole("dialog", { name: /태블릿 연결 — A-01/ }),
  ).toBeTruthy();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
});
