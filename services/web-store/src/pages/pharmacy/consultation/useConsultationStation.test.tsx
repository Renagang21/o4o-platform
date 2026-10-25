import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  openConsultationStation: vi.fn(),
  stationHeartbeat: vi.fn(),
  stationAction: vi.fn(),
  createConsultationPairing: vi.fn(),
}));
vi.mock("../../../api/consultationWorkspace", () => api);
import { useConsultationStation } from "./useConsultationStation";
const room = {
  id: "room",
  epoch: "generation",
  version: 1,
  active: true,
  connected: false,
  shared: {},
  reply: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  api.openConsultationStation.mockResolvedValue(room);
});
afterEach(cleanup);
it("opens explicitly, rejects duplicate execution and discards a result from a previous store", async () => {
  let finish!: (value: unknown) => void;
  api.openConsultationStation.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = renderHook(
    ({ scope }) =>
      useConsultationStation(scope, "counter-staff", "ko", "counter-1"),
    { initialProps: { scope: "first" } },
  );
  expect(api.openConsultationStation).not.toHaveBeenCalled();
  let pending!: Promise<unknown>;
  act(() => {
    pending = view.result.current.open();
    void view.result.current.open();
  });
  expect(api.openConsultationStation).toHaveBeenCalledTimes(1);
  view.rerender({ scope: "second" });
  await act(async () => {
    finish(room);
    await pending;
  });
  expect(view.result.current.room).toBeNull();
  await act(async () => {
    await view.result.current.open();
  });
  expect(view.result.current.room).toEqual(room);
});
it("keeps a failed end visible and only confirms an accepted server action", async () => {
  const view = renderHook(() =>
    useConsultationStation("store", "counter-staff", "ko", "counter-1"),
  );
  await act(async () => {
    await view.result.current.open();
  });
  api.stationAction.mockRejectedValueOnce(new Error("connection failed"));
  let accepted;
  await act(async () => {
    accepted = await view.result.current.action({ action: "end" });
  });
  expect(accepted).toBe(false);
  expect(view.result.current.room?.active).toBe(true);
  await waitFor(() =>
    expect(view.result.current.error).toBe("connection failed"),
  );
  api.stationAction.mockResolvedValueOnce({
    ...room,
    active: false,
    epoch: "ended",
    version: 2,
  });
  await act(async () => {
    accepted = await view.result.current.action({ action: "end" });
  });
  expect(accepted).toBe(true);
  expect(view.result.current.room?.active).toBe(false);
});
it("retains the same connected room during an accepted language correction", async () => {
  const view = renderHook(
    ({ language }) =>
      useConsultationStation("store", "counter-staff", language, "counter-1"),
    { initialProps: { language: "ko" } },
  );
  await act(async () => {
    await view.result.current.open();
  });
  api.stationAction.mockResolvedValueOnce({
    ...room,
    language: "ja",
    version: 2,
  });
  await act(async () => {
    await view.result.current.action({ action: "language", language: "ja" });
  });
  view.rerender({ language: "ja" });
  expect(view.result.current.room?.epoch).toBe("generation");
  expect(view.result.current.room?.active).toBe(true);
  expect(api.openConsultationStation).toHaveBeenCalledTimes(1);
});
it("keeps the room on a transient heartbeat failure but releases an expired epoch for reopening", async () => {
  vi.useFakeTimers();
  try {
    api.stationHeartbeat.mockRejectedValueOnce(new Error("temporary network failure"))
      .mockRejectedValueOnce(Object.assign(new Error("consultation changed"), { code: "CONSULTATION_CHANGED" }));
    api.createConsultationPairing.mockResolvedValueOnce({ code: "fixture-code" });
    const view = renderHook(() => useConsultationStation("store", "counter-staff", "ko", "counter-1"));
    await act(async () => { await view.result.current.open(); await view.result.current.pair(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(view.result.current.room?.epoch).toBe("generation");
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(view.result.current.room).toBeNull();
    expect(view.result.current.pairing).toBeNull();
    api.openConsultationStation.mockResolvedValueOnce({ ...room, epoch: "new-epoch", version: 2 });
    await act(async () => { await view.result.current.open(); });
    expect(view.result.current.room?.epoch).toBe("new-epoch");
  } finally { cleanup(); vi.useRealTimers(); }
});

it("keeps a failed end visible after a successful heartbeat until the next explicit action", async () => {
  vi.useFakeTimers();
  try {
    api.stationHeartbeat.mockResolvedValue({ ...room, version: 2 });
    const view = renderHook(() => useConsultationStation("store", "counter-staff", "ko", "counter-1"));
    await act(async () => { await view.result.current.open(); });
    api.stationAction.mockRejectedValueOnce(new Error("end was not accepted"));
    await act(async () => { await view.result.current.action({ action: "end" }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(view.result.current.room?.active).toBe(true);
    expect(view.result.current.error).toBe("end was not accepted");
    api.stationAction.mockResolvedValueOnce({ ...room, version: 3, active: false });
    await act(async () => { await view.result.current.action({ action: "end" }); });
    expect(view.result.current.error).toBe("");
    expect(view.result.current.room?.active).toBe(false);
  } finally { cleanup(); vi.useRealTimers(); }
});

it.each(["heartbeat", "action"])("discards the current room and pairing on an access denial from %s", async (operation) => {
  vi.useFakeTimers();
  try {
    const denied = Object.assign(new Error("store access revoked"), { status: 403, code: "STORE_ACCESS_REQUIRED" });
    api.createConsultationPairing.mockResolvedValueOnce({ code: "fixture-code" });
    const view = renderHook(() => useConsultationStation("store", "counter-staff", "ko", "counter-1"));
    await act(async () => { await view.result.current.open(); await view.result.current.pair(); });
    if (operation === "heartbeat") {
      api.stationHeartbeat.mockRejectedValueOnce(denied);
      await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    } else {
      api.stationAction.mockRejectedValueOnce(denied);
      await act(async () => { await view.result.current.action({ action: "share" }); });
    }
    expect(view.result.current.room).toBeNull();
    expect(view.result.current.pairing).toBeNull();
    expect(view.result.current.error).toBe("store access revoked");
  } finally { cleanup(); vi.useRealTimers(); }
});

it("does not restore an older successful heartbeat after an action reports access revocation", async () => {
  vi.useFakeTimers();
  try {
    let finish!: (value: unknown) => void;
    api.stationHeartbeat.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = renderHook(() => useConsultationStation("store", "counter-staff", "ko", "counter-1"));
    await act(async () => { await view.result.current.open(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    api.stationAction.mockRejectedValueOnce(Object.assign(new Error("store access revoked"), { status: 403 }));
    await act(async () => { await view.result.current.action({ action: "share" }); });
    await act(async () => { finish({ ...room, version: 100 }); });
    expect(view.result.current.room).toBeNull();
    expect(view.result.current.error).toBe("store access revoked");
  } finally { cleanup(); vi.useRealTimers(); }
});
