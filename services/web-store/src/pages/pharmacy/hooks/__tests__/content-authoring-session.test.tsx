import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useContentAuthoringSession } from "../useContentAuthoringSession";
const api = vi.hoisted(() => ({
  store: vi.fn(),
  service: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../../../../lib/storeOrganizationHeader", () => ({
  getActiveStoreOrganizationId: api.store,
}));
vi.mock("../../../../lib/serviceContext", () => ({
  getActiveServiceKey: api.service,
}));
const initial = { title: "", html: "" };
const saved = { id: "document", title: "Saved", html: "<p>Saved</p>" };
const onSaved = vi.fn(),
  onRemoved = vi.fn();
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function options(store = "A", target = "document", open = true, load = true) {
  return {
    organizationId: store,
    serviceKey: "kpa-society",
    target,
    enabled: open,
    initialDraft: initial,
    load: load ? () => api.load(target) : undefined,
    toDraft: (row: typeof saved) => ({ title: row.title, html: row.html }),
    persist: (draft: typeof initial, record: typeof saved | null) =>
      api.save(draft, record),
    remove: api.remove,
    onSaved,
    onRemoved,
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  api.store.mockReturnValue("A");
  api.service.mockReturnValue("kpa-society");
  api.load.mockResolvedValue(saved);
  api.save.mockResolvedValue(saved);
  api.remove.mockResolvedValue(undefined);
});
afterEach(cleanup);
async function session() {
  const hook = renderHook(() => useContentAuthoringSession(options()));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}
it("failed load never enables an empty overwrite and can be retried", async () => {
  api.load.mockRejectedValueOnce(new Error("synthetic"));
  const { result } = await session();
  expect(result.current.error).toBeTruthy();
  await act(() => result.current.save());
  expect(api.save).not.toHaveBeenCalled();
  await act(() => result.current.reload());
  expect(result.current.draft.title).toBe("Saved");
  expect(result.current.error).toBeNull();
});
it("late route loads are isolated including document A → B → A", async () => {
  const pending = deferred<typeof saved>();
  api.load
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ ...saved, id: "B", title: "B" })
    .mockResolvedValueOnce({ ...saved, id: "A", title: "Fresh A" });
  const { result, rerender } = renderHook(
    ({ id }) => useContentAuthoringSession(options("A", id)),
    { initialProps: { id: "A" } },
  );
  rerender({ id: "B" });
  rerender({ id: "A" });
  await waitFor(() => expect(result.current.draft.title).toBe("Fresh A"));
  await act(async () => {
    pending.resolve({ ...saved, title: "Old A" });
    await pending.promise;
  });
  expect(result.current.draft.title).toBe("Fresh A");
});
it("save captures one immutable draft, blocks duplicates and retains subsequent edits", async () => {
  const pending = deferred<typeof saved>();
  api.save.mockReturnValueOnce(pending.promise);
  const { result } = await session();
  act(() => result.current.changeDraft({ title: "Submitted" }));
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
    void result.current.save();
    result.current.changeDraft({ title: "Next edit" });
  });
  expect(api.save).toHaveBeenCalledOnce();
  expect(api.save.mock.calls[0][0].title).toBe("Submitted");
  await act(async () => {
    pending.resolve(saved);
    await task;
  });
  expect(result.current.draft.title).toBe("Next edit");
  expect(onSaved).toHaveBeenCalledWith(saved, false, true);
  expect(result.current.notice?.message).toContain("아직 저장되지");
});
it("unchanged save permits normal completion", async () => {
  const { result } = await session();
  await act(() => result.current.save());
  expect(onSaved).toHaveBeenCalledWith(saved, true, true);
});
it("save failure preserves inputs and releases the retry lock", async () => {
  api.save.mockRejectedValueOnce(new Error("synthetic"));
  const { result } = await session();
  act(() => result.current.changeDraft({ html: "<p>Retained</p>" }));
  await act(() => result.current.save());
  expect(result.current.draft.html).toContain("Retained");
  expect(result.current.notice?.ok).toBe(false);
  await act(() => result.current.save());
  expect(api.save).toHaveBeenCalledTimes(2);
});
it("cancel and a fresh editing session survive an old completion", async () => {
  const pending = deferred<typeof saved>();
  api.save.mockReturnValueOnce(pending.promise);
  const { result } = await session();
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
    result.current.resetDraft();
    result.current.changeDraft({ title: "Fresh session" });
  });
  await act(async () => {
    pending.resolve(saved);
    await task;
  });
  expect(result.current.draft.title).toBe("Fresh session");
  expect(onSaved).toHaveBeenCalledWith(saved, false, true);
});
it("closed and reopened creation keeps the old lock but preserves the fresh draft", async () => {
  const pending = deferred<typeof saved>();
  api.save.mockReturnValueOnce(pending.promise);
  const { result, rerender } = renderHook(
    ({ open }) =>
      useContentAuthoringSession(options("A", "create", open, false)),
    { initialProps: { open: true } },
  );
  act(() => result.current.changeDraft({ title: "First" }));
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
  });
  rerender({ open: false });
  rerender({ open: true });
  act(() => result.current.changeDraft({ title: "Second" }));
  await act(() => result.current.save());
  expect(api.save).toHaveBeenCalledOnce();
  await act(async () => {
    pending.resolve(saved);
    await task;
  });
  expect(result.current.draft.title).toBe("Second");
  expect(result.current.record).toBeNull();
  expect(onSaved).toHaveBeenCalledWith(saved, false, false);
  expect(result.current.saving).toBe(false);
});
it("a successful create with subsequent edits retains its new identity for the next save", async () => {
  const pending = deferred<typeof saved>();
  api.save.mockReturnValueOnce(pending.promise);
  const { result } = renderHook(() =>
    useContentAuthoringSession(options("A", "create", true, false)),
  );
  act(() => result.current.changeDraft({ title: "First" }));
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
    result.current.changeDraft({ title: "Next" });
  });
  await act(async () => {
    pending.resolve(saved);
    await task;
  });
  await act(() => result.current.save());
  expect(api.save.mock.calls[1][1]?.id).toBe("document");
  expect(api.save.mock.calls[1][0].title).toBe("Next");
});
it("new targets can save independently without the old target unlocking them", async () => {
  const first = deferred<typeof saved>(),
    second = deferred<typeof saved>();
  api.save
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result, rerender } = renderHook(
    ({ id }) => useContentAuthoringSession(options("A", id)),
    { initialProps: { id: "one" } },
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  let a!: Promise<void>, b!: Promise<void>;
  act(() => {
    a = result.current.save();
  });
  rerender({ id: "two" });
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => {
    b = result.current.save();
  });
  expect(api.save).toHaveBeenCalledTimes(2);
  await act(async () => {
    first.resolve(saved);
    await a;
  });
  expect(result.current.saving).toBe(true);
  expect(onSaved).not.toHaveBeenCalled();
  await act(async () => {
    second.resolve(saved);
    await b;
  });
  expect(result.current.saving).toBe(false);
});
it("stale editor callbacks cannot write into a new document or reopened creation", async () => {
  const { result, rerender } = renderHook(
    ({ id, open }) => useContentAuthoringSession(options("A", id, open, false)),
    { initialProps: { id: "one", open: true } },
  );
  const oldChange = result.current.changeDraft,
    oldNotice = result.current.notify;
  rerender({ id: "two", open: true });
  act(() => {
    oldChange({ title: "Wrong" });
    oldNotice("Wrong notice", false);
  });
  expect(result.current.draft.title).toBe("");
  expect(result.current.notice).toBeNull();
  const prior = result.current.changeDraft;
  rerender({ id: "two", open: false });
  rerender({ id: "two", open: true });
  act(() => prior({ title: "Old view" }));
  expect(result.current.draft.title).toBe("");
});
it("store or service getter changes stop completion even before React rerender", async () => {
  const pending = deferred<typeof saved>();
  api.save.mockReturnValueOnce(pending.promise);
  const { result } = await session();
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
  });
  api.store.mockReturnValue("B");
  await act(async () => {
    pending.resolve(saved);
    await task;
  });
  expect(onSaved).not.toHaveBeenCalled();
  expect(result.current.notice).toBeNull();
});
it("missing selected store performs no loads or writes", async () => {
  api.store.mockReturnValue(null);
  const { result } = renderHook(() => useContentAuthoringSession(options("")));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.save());
  expect(api.load).not.toHaveBeenCalled();
  expect(api.save).not.toHaveBeenCalled();
});
it("save and delete of the same document share one lock", async () => {
  const pending = deferred<typeof saved>();
  api.save.mockReturnValueOnce(pending.promise);
  const { result } = await session();
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
    void result.current.remove();
  });
  expect(api.remove).not.toHaveBeenCalled();
  await act(async () => {
    pending.resolve(saved);
    await task;
  });
  await act(() => result.current.remove());
  expect(api.remove).toHaveBeenCalledWith(saved);
  expect(onRemoved).toHaveBeenCalledOnce();
});
it("delete duplicates are blocked and failures remain retryable", async () => {
  const pending = deferred<void>();
  api.remove.mockReturnValueOnce(pending.promise);
  const { result } = await session();
  let task!: Promise<void>;
  act(() => {
    task = result.current.remove();
    void result.current.remove();
  });
  expect(api.remove).toHaveBeenCalledOnce();
  await act(async () => {
    pending.reject(new Error("synthetic"));
    await task;
  });
  expect(result.current.deleting).toBe(false);
  expect(result.current.notice?.ok).toBe(false);
  await act(() => result.current.remove());
  expect(onRemoved).toHaveBeenCalledOnce();
});
it("delete completion cannot navigate after a store change", async () => {
  const pending = deferred<void>();
  api.remove.mockReturnValueOnce(pending.promise);
  const { result, rerender } = renderHook(
    ({ store }) => useContentAuthoringSession(options(store)),
    { initialProps: { store: "A" } },
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  let task!: Promise<void>;
  act(() => {
    task = result.current.remove();
  });
  api.store.mockReturnValue("B");
  rerender({ store: "B" });
  await act(async () => {
    pending.resolve();
    await task;
  });
  expect(onRemoved).not.toHaveBeenCalled();
  expect(result.current.notice).toBeNull();
});
it("a superseded reload cannot replace a newer confirmed draft", async () => {
  const { result } = await session();
  const pending = deferred<typeof saved>();
  api.load
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({ ...saved, title: "Newest" });
  let old!: Promise<void>;
  act(() => {
    old = result.current.reload();
  });
  await act(() => result.current.reload());
  await act(async () => {
    pending.resolve({ ...saved, title: "Old" });
    await old;
  });
  expect(result.current.draft.title).toBe("Newest");
});
it("unmount invalidates a pending save result and callbacks", async () => {
  const pending = deferred<typeof saved>();
  api.save.mockReturnValueOnce(pending.promise);
  const { result, unmount } = await session();
  let task!: Promise<void>;
  act(() => {
    task = result.current.save();
  });
  unmount();
  await act(async () => {
    pending.resolve(saved);
    await task;
  });
  expect(onSaved).not.toHaveBeenCalled();
});
it("only a replaced editor seed changes initial HTML while typing preserves it", async () => {
  const { result } = await session();
  act(() => result.current.changeDraft({ html: "<p>Typing</p>" }));
  expect(result.current.seed.html).toBe(saved.html);
  act(() => result.current.changeDraft({ html: "<p>Imported</p>" }, true));
  expect(result.current.seed.html).toBe("<p>Imported</p>");
});
